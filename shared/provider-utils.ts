/**
 * Provider utilities — model validation & helpers.
 * Enforces that Bedrock models used for ablation are in the 10–30B parameter range
 * by default. This is intentionally conservative to avoid accidentally running
 * very large / expensive models during sweeps.
 */

export function validateModelChoice(
  provider: string | undefined,
  model: string | undefined,
  minB: number = 10,
  maxB: number = 30
): { ok: boolean; message?: string } {
  const p = (provider || process.env.LLM_PROVIDER || 'ollama').toLowerCase();
  const m = model || process.env.LLM_MODEL || '';
  // Only enforce for Bedrock (user requested). Other providers are allowed by default.
  if (p === 'bedrock') {
    if (!m || m.trim().length === 0) {
      return { ok: false, message: 'LLM_MODEL is not set. For Bedrock, set LLM_MODEL to a model identifier containing its parameter count e.g. "my-model-13b".' };
    }

    // Whitelist specific large models verified by the user
    const whitelist = ['qwen.qwen3-235b'];
    if (whitelist.some(w => m.toLowerCase().includes(w))) {
      return { ok: true };
    }

    // Look for a pattern like "13b" or "12B" in the model string.
    const match = m.match(/(\d+)\s*[bB]\b/);
    if (!match) {
      return { ok: false, message: `Bedrock model string \"${m}\" does not include a parameter count (e.g. \"13b\"). Please set LLM_MODEL to a model in the ${minB}-${maxB}B range.` };
    }
    const n = parseInt(match[1], 10);
    if (isNaN(n)) return { ok: false, message: `Could not parse numeric parameter count from model string \"${m}\".` };
    if (n < minB || n > maxB) {
      return { ok: false, message: `Model \"${m}\" appears to be ${n}B which is outside the allowed ${minB}-${maxB}B range.` };
    }
  }
  return { ok: true };
}
