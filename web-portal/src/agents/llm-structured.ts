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
    this.model = process.env.LLM_MODEL || model;
  }

  async fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult> {
    const provider = process.env.LLM_PROVIDER || 'openai';
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
    
    // For bedrock, we might use AWS SDK which resolves local credentials automatically.
    // For other providers, we require an API key.
    const hasCreds = provider === 'bedrock' || !!apiKey;
    if (!hasCreds) {
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
      if (provider === 'bedrock') {
        const { BedrockRuntimeClient, ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
        const config: any = {
          region: process.env.AWS_REGION || 'ap-south-1',
        };
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
          config.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          };
          if (process.env.AWS_SESSION_TOKEN) {
            config.credentials.sessionToken = process.env.AWS_SESSION_TOKEN;
          }
        }
        const client = new BedrockRuntimeClient(config);
        const command = new ConverseCommand({
          modelId: this.model,
          messages: [
            { role: 'user', content: [{ text: userPrompt }] }
          ],
          system: [
            { text: systemPrompt }
          ],
          inferenceConfig: {
            temperature: 0,
            maxTokens: 1024,
          }
        });
        const response = await client.send(command);
        rawContent = response.output?.message?.content?.[0]?.text ?? '{}';
        promptTokens = response.usage?.inputTokens ?? 0;
        completionTokens = response.usage?.outputTokens ?? 0;
      } else {
        const { OpenAI } = await import('openai');
        let finalApiKey = apiKey;
        let finalBaseUrl = process.env.OPENAI_BASE_URL;

        if (provider === 'cerebras') {
          finalApiKey = process.env.CEREBRAS_API_KEY || apiKey;
          finalBaseUrl = 'https://api.cerebras.ai/v1';
        }

        const client = new OpenAI({
          apiKey: finalApiKey,
          ...(finalBaseUrl ? { baseURL: finalBaseUrl } : {}),
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
      }
    } catch (err) {
      console.error("[LLM Structured Agent] Error during fill:", err);
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
