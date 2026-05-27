/**
 * Telemetry Tracker — singleton in-memory store.
 *
 * Usage:
 *   const handle = tracker.startRun('rule-based', url);
 *   // ... do work ...
 *   const record = tracker.finishRun(handle, { fields, errors, screenshot });
 */

import type {
  AgentRunRecord,
  AgentStrategy,
  FieldTelemetry,
  LLMUsage,
  ParseRecord,
  TelemetryStore,
} from '../types/telemetry';

// ── ID helpers ────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

// ── Timer handles ─────────────────────────────────────────────────────────────

export interface RunHandle {
  runId: string;
  strategy: AgentStrategy;
  formUrl: string;
  startedAt: number;
  scrapeEndAt?: number;
}

export interface ParseHandle {
  parseId: string;
  startedAt: number;
  mimeType: string;
  fileSizeBytes: number;
}

// ── Singleton store (module-level, survives across requests in one process) ───

const store: TelemetryStore = { runs: [], parses: [] };

// ── Run lifecycle ─────────────────────────────────────────────────────────────

export function startRun(strategy: AgentStrategy, formUrl: string): RunHandle {
  return {
    runId: generateId('run'),
    strategy,
    formUrl,
    startedAt: Date.now(),
  };
}

export function markScrapeComplete(handle: RunHandle): RunHandle {
  return { ...handle, scrapeEndAt: Date.now() };
}

export interface FinishRunInput {
  formTitle?: string;
  fields: FieldTelemetry[];
  llm?: LLMUsage;
  llmFallbackUsed?: boolean;
  errors?: string[];
  screenshotBase64?: string;
}

export function finishRun(handle: RunHandle, input: FinishRunInput): AgentRunRecord {
  const now = Date.now();
  const scrapeTimeMs = handle.scrapeEndAt
    ? handle.scrapeEndAt - handle.startedAt
    : 0;
  const fillTimeMs = handle.scrapeEndAt
    ? now - handle.scrapeEndAt
    : now - handle.startedAt;
  const totalTimeMs = now - handle.startedAt;

  const fieldsFilled = input.fields.filter(f => f.success).length;
  const fieldsFailed = input.fields.filter(f => !f.success && f.valueFilled !== undefined).length;
  const fieldsSkipped = input.fields.filter(f => f.valueFilled === undefined).length;
  const fieldsAttempted = fieldsFilled + fieldsFailed;
  const fillAccuracyPct =
    fieldsAttempted > 0 ? Math.round((fieldsFilled / fieldsAttempted) * 1000) / 10 : 0;

  const record: AgentRunRecord = {
    runId: handle.runId,
    timestamp: new Date().toISOString(),
    strategy: handle.strategy,
    formUrl: handle.formUrl,
    formTitle: input.formTitle,
    scrapeTimeMs,
    fillTimeMs,
    totalTimeMs,
    fieldsAttempted,
    fieldsFilled,
    fieldsFailed,
    fieldsSkipped,
    fillAccuracyPct,
    fields: input.fields,
    llm: input.llm ?? null,
    llmFallbackUsed: input.llmFallbackUsed,
    errors: input.errors ?? [],
    screenshotBase64: input.screenshotBase64,
  };

  store.runs.push(record);
  return record;
}

// ── Parse lifecycle ───────────────────────────────────────────────────────────

export function startParse(mimeType: string, fileSizeBytes: number): ParseHandle {
  return {
    parseId: generateId('parse'),
    startedAt: Date.now(),
    mimeType,
    fileSizeBytes,
  };
}

export interface FinishParseInput {
  parseStrategy: 'regex' | 'llm';
  fieldsExtracted: number;
  llm?: LLMUsage;
  errors?: string[];
}

export function finishParse(handle: ParseHandle, input: FinishParseInput): ParseRecord {
  const record: ParseRecord = {
    parseId: handle.parseId,
    timestamp: new Date().toISOString(),
    parseStrategy: input.parseStrategy,
    mimeType: handle.mimeType,
    fileSizeBytes: handle.fileSizeBytes,
    parseTimeMs: Date.now() - handle.startedAt,
    fieldsExtracted: input.fieldsExtracted,
    llm: input.llm ?? null,
    errors: input.errors ?? [],
  };
  store.parses.push(record);
  return record;
}

// ── Query ─────────────────────────────────────────────────────────────────────

export function getRuns(): AgentRunRecord[] {
  return [...store.runs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getRunById(runId: string): AgentRunRecord | undefined {
  return store.runs.find(r => r.runId === runId);
}

export function getParses(): ParseRecord[] {
  return [...store.parses].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function exportJson(): string {
  return JSON.stringify({ runs: getRuns(), parses: getParses() }, null, 2);
}

export function clearStore(): void {
  store.runs.length = 0;
  store.parses.length = 0;
}
