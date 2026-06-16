/**
 * Shared cost model for Ablation Study
 * Provides USD per 1M tokens rates and simple estimate helper.
 */

export const COST_PER_1M: Record<string, { in: number; out: number }> = {
  // OpenAI
  'openai:gpt-4o':           { in: 2.5,  out: 10.0 },
  'openai:gpt-4o-mini':      { in: 0.15, out: 0.60 },

  // Gemini (example rates)
  'gemini:gemini-1.5-flash': { in: 0.075, out: 0.30 },
  'gemini:gemini-1.5-pro':   { in: 0.15,  out: 0.60 },

  // Bedrock / Anthropic (placeholder estimates - update when keys available)
  'bedrock:claude-3.5-sonnet': { in: 3.0, out: 15.0 },
  'bedrock:claude-3-haiku':    { in: 0.25, out: 1.25 },
  'bedrock:qwen.qwen3-235b':   { in: 2.0, out: 6.0 },
  'bedrock:openai.gpt-oss':    { in: 0.60, out: 0.60 },

  // Cerebras (approximate current pricing for llama3.1 variants)
  'cerebras:llama3.1-8b':  { in: 0.10, out: 0.10 },
  'cerebras:llama3.1-70b': { in: 0.60, out: 0.60 },
  'cerebras:*':            { in: 0.60, out: 0.60 },

  // Local inference (Ollama) = $0 accounting for API cost
  'ollama:*': { in: 0, out: 0 },
};

function getRates(provider: string, model: string) {
  const exact = `${provider}:${model}`;
  if (COST_PER_1M[exact]) return COST_PER_1M[exact];
  const providerWildcard = `${provider}:*`;
  if (COST_PER_1M[providerWildcard]) return COST_PER_1M[providerWildcard];
  // Try provider:model-prefix (handles model strings like "gemma3:12b" or "openai/gpt-4o-mini")
  const modelKey = `${provider}:${model.split(/[/:]/)[0]}`;
  if (COST_PER_1M[modelKey]) return COST_PER_1M[modelKey];
  // Last resort: zero-cost
  return { in: 0, out: 0 };
}

/**
 * Estimate USD cost given provider, model and token counts.
 */
export function estimateCost(provider: string, model: string, tokensIn: number, tokensOut: number): number {
  const rates = getRates(provider, model);
  return (tokensIn / 1_000_000) * rates.in + (tokensOut / 1_000_000) * rates.out;
}
