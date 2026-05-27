import type { ScrapedForm } from '../types/index';

// ── Core agent types ──────────────────────────────────────────────────────────

export type AgentStrategyName = 'rule-based' | 'llm-structured' | 'embedding-matcher';

/** One field's fill result */
export interface FieldFill {
  fieldId: string;
  label?: string;
  type: string;
  value: string | undefined;   // undefined = no match found
  matchedProfileKey: string | undefined;
  confidence: number;          // 0–1
}

/** What a portal agent must implement */
export interface PortalAgent {
  readonly name: AgentStrategyName;
  fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult>;
}

export interface FieldFillResult {
  fills: FieldFill[];
  /** Populated only for llm-structured */
  llmUsage?: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
    latencyMs: number;
  };
  llmFallbackUsed?: boolean;
}

// ── Flat profile ──────────────────────────────────────────────────────────────

/** All leaf values from the test-profile, keyed by dot-path e.g. "personal.email" */
export type FlatProfile = Record<string, string>;

/**
 * Recursively flattens a nested object into a FlatProfile.
 * Arrays are joined with ", ".
 * Keys are lowercased dot-paths.
 */
export function flattenProfile(
  obj: unknown,
  prefix = ''
): FlatProfile {
  const out: FlatProfile = {};
  if (obj === null || obj === undefined) return out;

  if (Array.isArray(obj)) {
    // Flatten array items individually, then also create a joined version
    const joined = obj
      .map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ');
    if (prefix) out[prefix] = joined;
    obj.forEach((item, i) => {
      Object.assign(out, flattenProfile(item, `${prefix}[${i}]`));
    });
    return out;
  }

  if (typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (key.startsWith('_')) continue; // skip comment keys
      const fullKey = prefix ? `${prefix}.${key.toLowerCase()}` : key.toLowerCase();
      Object.assign(out, flattenProfile(val, fullKey));
    }
    return out;
  }

  // Leaf value
  if (prefix) {
    out[prefix] = String(obj);
  }
  return out;
}
