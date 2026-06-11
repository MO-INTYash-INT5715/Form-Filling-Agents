/**
 * LLM-Structured Portal Agent
 *
 * Serialises the form schema and user profile into a compact prompt, calls
 * OpenAI with JSON-mode output, and maps the result onto field fills.
 *
 * Falls back to rule-based if OPENAI_API_KEY is not set.
 * All token usage and latency are captured for comparative analysis.
 */

import type { ScrapedForm } from '../types/index';
import type { PortalAgent, FieldFill, FieldFillResult, FlatProfile } from './types';
import { RuleBasedAgent } from './rule-based';

// GPT-4o pricing (per 1k tokens) — update if pricing changes
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':             { input: 0.005,  output: 0.015  },
  'gpt-4o-mini':        { input: 0.00015,output: 0.0006 },
  'gpt-3.5-turbo':      { input: 0.0005, output: 0.0015 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICING[model] ?? { input: 0.005, output: 0.015 };
  return (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output;
}

function buildSystemPrompt(): string {
  return `You are a form-filling assistant. Given a form schema and a user profile, return a JSON object mapping each field_id to the best matching value from the profile. Only include fields where you have a confident match. If a field is a checkbox/boolean, use "true" or "false". If a field is a select, use one of the provided options exactly. Return ONLY the JSON object, no explanation.`;
}

function buildUserPrompt(form: ScrapedForm, profile: FlatProfile): string {
  const schema = form.fields
    .map(f => {
      const parts = [`id: "${f.id}"`, `label: "${f.label ?? ''}"`, `type: ${f.type}`];
      if (f.options?.length) parts.push(`options: [${f.options.map(o => `"${o}"`).join(', ')}]`);
      return `{ ${parts.join(', ')} }`;
    })
    .join('\n');

  // Include only the most relevant profile keys to stay within token budget
  const profileSummary = Object.entries(profile)
    .filter(([k]) => !k.includes('['))  // skip array-index keys
    .slice(0, 80)                        // cap at 80 keys
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');

  return `FORM FIELDS:\n${schema}\n\nUSER PROFILE:\n${profileSummary}\n\nReturn JSON object { field_id: value_string, ... }`;
}

export class LLMStructuredAgent implements PortalAgent {
  readonly name = 'llm-structured' as const;
  private model: string;
  private fallback = new RuleBasedAgent();

  constructor(model = 'gpt-4o-mini') {
    this.model = model;
  }

  async fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Graceful degradation — run rule-based, flag the fallback
      const fallbackResult = await this.fallback.fill(form, profile);
      return { ...fallbackResult, llmFallbackUsed: true };
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(form, profile);
    const llmStart = Date.now();

    let rawContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      // Dynamic import so the module loads only when needed
      const { OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey,
        ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
      });

      const response = await client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 1024,
      });

      rawContent = response.choices[0]?.message?.content ?? '{}';
      promptTokens = response.usage?.prompt_tokens ?? 0;
      completionTokens = response.usage?.completion_tokens ?? 0;
    } catch (err) {
      // Network / quota error — fall back silently
      const fallbackResult = await this.fallback.fill(form, profile);
      return {
        ...fallbackResult,
        llmFallbackUsed: true,
        llmUsage: {
          model: this.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          costUsd: 0,
          latencyMs: Date.now() - llmStart,
        },
      };
    }

    const latencyMs = Date.now() - llmStart;
    const costUsd = estimateCost(this.model, promptTokens, completionTokens);

    // Parse LLM response
    let mapping: Record<string, string> = {};
    try {
      mapping = JSON.parse(rawContent) as Record<string, string>;
    } catch {
      // Malformed JSON — fall back
      const fallbackResult = await this.fallback.fill(form, profile);
      return {
        ...fallbackResult,
        llmFallbackUsed: true,
        llmUsage: { model: this.model, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, costUsd, latencyMs },
      };
    }

    // Map LLM output onto FieldFill[]
    const fills: FieldFill[] = form.fields.map(field => {
      const value = mapping[field.id];
      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        value: value ?? undefined,
        matchedProfileKey: value ? 'llm-inferred' : undefined,
        confidence: value ? 0.85 : 0,
      };
    });

    return {
      fills,
      llmUsage: {
        model: this.model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        costUsd,
        latencyMs,
      },
    };
  }
}
