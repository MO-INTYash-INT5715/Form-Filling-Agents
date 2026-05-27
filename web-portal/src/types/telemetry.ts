/**
 * Telemetry types — every agent run and document parse is recorded here
 * for comparative analysis across strategies.
 */

export type AgentStrategy = 'rule-based' | 'llm-structured' | 'embedding-matcher';

// ── LLM usage block (populated only when a model was called) ─────────────────
export interface LLMUsage {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** USD cost estimate based on model pricing at time of run */
  costUsd: number;
  /** Latency of the LLM call itself in ms */
  latencyMs: number;
}

// ── Per-field result ──────────────────────────────────────────────────────────
export interface FieldTelemetry {
  fieldId: string;
  label?: string;
  type: string;
  valueFilled?: string;
  matchedProfileKey?: string;
  confidence: number;   // 0–1
  success: boolean;
  error?: string;
}

// ── One agent run record ──────────────────────────────────────────────────────
export interface AgentRunRecord {
  runId: string;
  timestamp: string;          // ISO 8601
  strategy: AgentStrategy;
  formUrl: string;
  formTitle?: string;

  // Timing (ms)
  scrapeTimeMs: number;
  fillTimeMs: number;
  totalTimeMs: number;

  // Accuracy
  fieldsAttempted: number;
  fieldsFilled: number;
  fieldsFailed: number;
  fieldsSkipped: number;
  fillAccuracyPct: number;    // fieldsFilled / max(fieldsAttempted,1) * 100

  // Per-field breakdown
  fields: FieldTelemetry[];

  // LLM usage (only for llm-structured; null otherwise)
  llm: LLMUsage | null;

  /** true when llm-structured fell back to rule-based (no API key) */
  llmFallbackUsed?: boolean;

  errors: string[];
  screenshotBase64?: string;
}

// ── One document-parse record ─────────────────────────────────────────────────
export interface ParseRecord {
  parseId: string;
  timestamp: string;
  parseStrategy: 'regex' | 'llm';
  mimeType: string;
  fileSizeBytes: number;
  parseTimeMs: number;
  fieldsExtracted: number;
  llm: LLMUsage | null;
  errors: string[];
}

// ── In-memory store ───────────────────────────────────────────────────────────
export interface TelemetryStore {
  runs: AgentRunRecord[];
  parses: ParseRecord[];
}
