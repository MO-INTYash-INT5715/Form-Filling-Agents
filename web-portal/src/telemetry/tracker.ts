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
  VerificationRecord,
  VerificationStatus,
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

// ── File storage helper ───────────────────────────────────────────────────────

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const STORAGE_FILE = join(process.cwd(), '..', 'benchmark-results', 'telemetry-runs.json');

function loadStore(): TelemetryStore {
  try {
    if (existsSync(STORAGE_FILE)) {
      const data = readFileSync(STORAGE_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load telemetry store:', e);
  }
  return { runs: [], parses: [], verifications: [] };
}

function saveStore(s: TelemetryStore) {
  try {
    writeFileSync(STORAGE_FILE, JSON.stringify(s, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save telemetry store:', e);
  }
}

// ── Singleton store (loaded from file on start) ───────────────────────────────────

const store: TelemetryStore = loadStore();

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
  saveStore(store);
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
  saveStore(store);
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
  return JSON.stringify({ runs: getRuns(), parses: getParses(), verifications: getVerifications() }, null, 2);
}

export function clearStore(): void {
  store.runs.length = 0;
  store.parses.length = 0;
  store.verifications.length = 0;
  saveStore(store);
}

// ── Verification lifecycle ────────────────────────────────────────────────────

/**
 * Create a pending VerificationRecord from an AgentRunRecord.
 * Computes `missingFields` = required fields where valueFilled is undefined.
 */
export function createVerification(run: AgentRunRecord): VerificationRecord {
  const missingFields = run.fields.filter(
    f => f.required === true && f.valueFilled === undefined
  );

  // Stamp isMissing on each field
  const missingIds = new Set(missingFields.map(f => f.fieldId));
  const fields: FieldTelemetry[] = run.fields.map(f => ({
    ...f,
    isMissing: missingIds.has(f.fieldId),
  }));

  const record: VerificationRecord = {
    runId: run.runId,
    strategy: run.strategy,
    formUrl: run.formUrl,
    formTitle: run.formTitle,
    fields,
    missingFields: fields.filter(f => f.isMissing),
    screenshotBase64: run.screenshotBase64,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };

  store.verifications.push(record);
  saveStore(store);
  return record;
}

export function getVerifications(): VerificationRecord[] {
  return [...store.verifications].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getVerificationById(runId: string): VerificationRecord | undefined {
  return store.verifications.find(v => v.runId === runId);
}

export function resolveVerification(
  runId: string,
  status: VerificationStatus
): VerificationRecord | undefined {
  const record = store.verifications.find(v => v.runId === runId);
  if (record) {
    record.status = status;
    record.resolvedAt = new Date().toISOString();
    saveStore(store);
  }
  return record;
}


