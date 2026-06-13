/**
 * VLM (Vision Language Model) Portal Agent
 *
 * Uses a viewport screenshot alongside the form schema and user profile
 * to extract visually-aware field values.
 */

import type { ScrapedForm } from '../types/index';
import type { PortalAgent, FieldFill, FieldFillResult, FlatProfile } from './types';
import { RuleBasedAgent } from './rule-based';

const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o':             { input: 0.005,  output: 0.015  },
  'gpt-4o-mini':        { input: 0.00015,output: 0.0006 },
  'gpt-3.5-turbo':      { input: 0.0005, output: 0.0015 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const price = PRICING[model] ?? { input: 0.005, output: 0.015 };
  return (promptTokens / 1000) * price.input + (completionTokens / 1000) * price.output;
}

export class VLMAgent implements PortalAgent {
  readonly name = 'vlm-agent' as const;
  private model: string;
  private fallback = new RuleBasedAgent();

  constructor(model = 'gpt-4o') {
    this.model = process.env.LLM_MODEL && process.env.LLM_MODEL.includes('vision') ? process.env.LLM_MODEL : 'gpt-4o';
  }

  async fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !form.screenshotBase64) {
      const fallbackResult = await this.fallback.fill(form, profile);
      return { ...fallbackResult, llmFallbackUsed: true };
    }

    const systemPrompt = `You are a visually-aware form-filling assistant. Given a screenshot of a form, its schema, and a user profile, return a JSON object mapping each field_id to the best matching value from the profile. Return ONLY the JSON object.`;
    
    const schema = form.fields.map(f => `{ id: "${f.id}", label: "${f.label ?? ''}", type: "${f.type}" }`).join('\n');
    const profileSummary = Object.entries(profile).filter(([k]) => !k.includes('[')).slice(0, 80).map(([k, v]) => `${k}: ${v}`).join('\n');
    const userPrompt = `FORM FIELDS:\n${schema}\n\nUSER PROFILE:\n${profileSummary}\n\nReturn JSON object { field_id: value_string, ... }`;

    const llmStart = Date.now();
    let rawContent = '';
    let promptTokens = 0;
    let completionTokens = 0;

    try {
      const { OpenAI } = await import('openai');
      const provider = process.env.LLM_PROVIDER || 'openai';
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
          { role: 'user', content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${form.screenshotBase64}` } }
          ]},
        ],
        temperature: 0,
        max_tokens: 1024,
      });

      rawContent = response.choices[0]?.message?.content ?? '{}';
      promptTokens = response.usage?.prompt_tokens ?? 0;
      completionTokens = response.usage?.completion_tokens ?? 0;
    } catch (err) {
      const fallbackResult = await this.fallback.fill(form, profile);
      return {
        ...fallbackResult,
        llmFallbackUsed: true,
        llmUsage: { model: this.model, promptTokens: 0, completionTokens: 0, totalTokens: 0, costUsd: 0, latencyMs: Date.now() - llmStart },
      };
    }

    const latencyMs = Date.now() - llmStart;
    const costUsd = estimateCost(this.model, promptTokens, completionTokens);

    let mapping: Record<string, string> = {};
    try { mapping = JSON.parse(rawContent); } catch {
      const fallbackResult = await this.fallback.fill(form, profile);
      return { ...fallbackResult, llmFallbackUsed: true, llmUsage: { model: this.model, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, costUsd, latencyMs } };
    }

    const fills: FieldFill[] = form.fields.map(field => {
      const value = mapping[field.id];
      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        value: value ?? undefined,
        matchedProfileKey: value ? 'vlm-inferred' : undefined,
        confidence: value ? 0.9 : 0,
      };
    });

    return { fills, llmUsage: { model: this.model, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, costUsd, latencyMs } };
  }
}
