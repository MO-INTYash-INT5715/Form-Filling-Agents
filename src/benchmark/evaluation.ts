/**
 * FormFactory Benchmark — Evaluation Metrics
 *
 * Faithful implementation of the paper's §5.1.2 evaluation protocol:
 *
 * Atomic evaluation (per field type):
 *   - Click accuracy:  did the agent click within the correct element's bbox?
 *   - Value accuracy:  exact match (case-insensitive) for most field types;
 *                      BLEU-4 score for Description fields.
 *
 * Episodic evaluation (per form instance):
 *   - Form completion rate: % of fields that were both correctly clicked
 *     AND correctly valued (strict), or just correctly valued (lenient).
 */

import type {
  FieldResult,
  AtomicMetrics,
  EpisodicMetrics,
  FieldType,
  BBoxAnnotation,
} from './types';

// ---------------------------------------------------------------------------
// BLEU score (unigram + bigram — faithful to paper's use of BLEU)
// ---------------------------------------------------------------------------

function tokenize(text: any): string[] {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function ngramCounts(tokens: string[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(' ');
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
}

function ngramPrecision(predicted: string[], reference: string[], n: number): number {
  if (predicted.length < n) return 0;
  const predNgrams = ngramCounts(predicted, n);
  const refNgrams = ngramCounts(reference, n);

  let clippedCount = 0;
  let totalCount = 0;

  for (const [gram, count] of predNgrams) {
    totalCount += count;
    clippedCount += Math.min(count, refNgrams.get(gram) ?? 0);
  }

  return totalCount === 0 ? 0 : clippedCount / totalCount;
}

/**
 * Simplified BLEU-4 score (0–100) with brevity penalty.
 * Used for Description fields per paper §5.1.2.
 */
export function calculateBLEU(predicted: any, reference: any): number {
  const predStr = predicted !== null && predicted !== undefined ? String(predicted) : '';
  const refStr = reference !== null && reference !== undefined ? String(reference) : '';
  if (!predStr || !refStr) return 0;

  const pred = tokenize(predStr);
  const ref = tokenize(refStr);

  if (pred.length === 0 || ref.length === 0) return 0;

  // Brevity penalty
  const bp = pred.length >= ref.length ? 1 : Math.exp(1 - ref.length / pred.length);

  // n-gram precisions (1–4)
  const precisions: number[] = [];
  for (let n = 1; n <= 4; n++) {
    precisions.push(ngramPrecision(pred, ref, n));
  }

  // Geometric mean of precisions (log-sum to avoid underflow)
  const logSum = precisions.reduce((sum, p) => sum + (p > 0 ? Math.log(p) : -Infinity), 0);
  const geomMean = Math.exp(logSum / 4);

  return bp * geomMean * 100;
}

// ---------------------------------------------------------------------------
// Value accuracy
// ---------------------------------------------------------------------------

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
function normalize(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculate value accuracy for a single field.
 *
 * - Description fields → BLEU-4 ≥ bleuThreshold counts as correct
 * - All other fields   → exact match (normalized)
 * - Multi-value gold   → correct if predicted matches ANY gold value
 */
export function calculateValueAccuracy(
  fieldType: FieldType,
  predicted: string,
  gold: string | string[],
  bleuThreshold: number = 30
): { correct: boolean; bleuScore?: number } {
  const goldValues = Array.isArray(gold) ? gold : [gold];

  if (fieldType === 'Description') {
    // Use BLEU against the best matching reference
    const bleuScore = Math.max(
      ...goldValues.map(g => calculateBLEU(predicted, g))
    );
    return { correct: bleuScore >= bleuThreshold, bleuScore };
  }

  // Exact match (normalized)
  const normPred = normalize(predicted);
  const correct = goldValues.some(g => normalize(g) === normPred);
  return { correct };
}

// ---------------------------------------------------------------------------
// Click accuracy
// ---------------------------------------------------------------------------

/**
 * Check whether a predicted click coordinate falls within a bbox annotation.
 *
 * Uses the simple pixel-tolerance model: the click is correct if it lands
 * inside the bounding box (with optional tolerance margin).
 *
 * Returns null if no annotation is available.
 */
export function calculateClickAccuracy(
  predictedX: number | undefined,
  predictedY: number | undefined,
  annotation: BBoxAnnotation | null,
  tolerancePx: number = 10
): boolean | null {
  if (annotation == null) return null;
  if (predictedX == null || predictedY == null) return false;

  return (
    predictedX >= annotation.x - tolerancePx &&
    predictedX <= annotation.x + annotation.width + tolerancePx &&
    predictedY >= annotation.y - tolerancePx &&
    predictedY <= annotation.y + annotation.height + tolerancePx
  );
}

// ---------------------------------------------------------------------------
// Aggregate: Atomic metrics
// ---------------------------------------------------------------------------

/**
 * Aggregate FieldResult[] into AtomicMetrics (per-field-type averages).
 */
export function aggregateAtomicMetrics(fieldResults: FieldResult[]): AtomicMetrics {
  const byType: Record<string, { clickCorrect: number[]; valueCorrect: number[] }> = {};

  for (const fr of fieldResults) {
    if (!byType[fr.fieldType]) {
      byType[fr.fieldType] = { clickCorrect: [], valueCorrect: [] };
    }
    // Only include click accuracy where we have an annotation
    if (fr.clickAccurate !== null) {
      byType[fr.fieldType].clickCorrect.push(fr.clickAccurate ? 1 : 0);
    }
    byType[fr.fieldType].valueCorrect.push(fr.valueAccurate ? 1 : 0);
  }

  const clickAccuracy: Record<string, number> = {};
  const valueAccuracy: Record<string, number> = {};

  for (const [ft, data] of Object.entries(byType)) {
    clickAccuracy[ft] = data.clickCorrect.length > 0
      ? (data.clickCorrect.reduce((a, b) => a + b, 0) / data.clickCorrect.length) * 100
      : 0;
    valueAccuracy[ft] = data.valueCorrect.length > 0
      ? (data.valueCorrect.reduce((a, b) => a + b, 0) / data.valueCorrect.length) * 100
      : 0;
  }

  // Micro-averaged across all fields
  const allClick = fieldResults.filter(f => f.clickAccurate !== null);
  const overallClickAccuracy = allClick.length > 0
    ? (allClick.filter(f => f.clickAccurate).length / allClick.length) * 100
    : 0;

  const overallValueAccuracy = fieldResults.length > 0
    ? (fieldResults.filter(f => f.valueAccurate).length / fieldResults.length) * 100
    : 0;

  return {
    clickAccuracy,
    valueAccuracy,
    overallClickAccuracy,
    overallValueAccuracy,
  };
}

// ---------------------------------------------------------------------------
// Aggregate: Episodic metrics
// ---------------------------------------------------------------------------

/**
 * Compute episodic (end-to-end form) metrics from FieldResult[].
 */
export function aggregateEpisodicMetrics(fieldResults: FieldResult[]): EpisodicMetrics {
  const total = fieldResults.length;
  if (total === 0) {
    return {
      formCompletionRate: 0,
      fieldsAttempted: 0,
      fieldsCorrect: 0,
      totalFields: 0,
      averageClickAccuracy: 0,
      averageValueAccuracy: 0,
    };
  }

  // A field counts as "correctly filled" if value is accurate (lenient — paper §5.2
  // notes value score does not require the click to have landed correctly)
  const fieldsCorrect = fieldResults.filter(f => f.valueAccurate).length;

  // Click accuracy (only where annotations are available)
  const annotated = fieldResults.filter(f => f.clickAccurate !== null);
  const avgClickAccuracy = annotated.length > 0
    ? (annotated.filter(f => f.clickAccurate).length / annotated.length) * 100
    : 0;

  const avgValueAccuracy = (fieldResults.filter(f => f.valueAccurate).length / total) * 100;

  return {
    formCompletionRate: (fieldsCorrect / total) * 100,
    fieldsAttempted: fieldResults.filter(f => f.predictedValue !== '').length,
    fieldsCorrect,
    totalFields: total,
    averageClickAccuracy: avgClickAccuracy,
    averageValueAccuracy: avgValueAccuracy,
  };
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

/**
 * Merge multiple AtomicMetrics objects (e.g. across many form instances).
 */
export function mergeAtomicMetrics(metricsList: AtomicMetrics[]): AtomicMetrics {
  if (metricsList.length === 0) {
    return {
      clickAccuracy: {},
      valueAccuracy: {},
      overallClickAccuracy: 0,
      overallValueAccuracy: 0,
    };
  }

  const allFieldTypes = new Set(
    metricsList.flatMap(m => [
      ...Object.keys(m.clickAccuracy),
      ...Object.keys(m.valueAccuracy),
    ])
  );

  const clickAccuracy: Record<string, number> = {};
  const valueAccuracy: Record<string, number> = {};

  for (const ft of allFieldTypes) {
    const clicks = metricsList.map(m => m.clickAccuracy[ft]).filter(v => v !== undefined);
    const values = metricsList.map(m => m.valueAccuracy[ft]).filter(v => v !== undefined);
    clickAccuracy[ft] = clicks.length > 0
      ? clicks.reduce((a, b) => a + b, 0) / clicks.length
      : 0;
    valueAccuracy[ft] = values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : 0;
  }

  const overallClickAccuracy =
    metricsList.reduce((a, m) => a + m.overallClickAccuracy, 0) / metricsList.length;
  const overallValueAccuracy =
    metricsList.reduce((a, m) => a + m.overallValueAccuracy, 0) / metricsList.length;

  return { clickAccuracy, valueAccuracy, overallClickAccuracy, overallValueAccuracy };
}

/**
 * Merge multiple EpisodicMetrics.
 */
export function mergeEpisodicMetrics(metricsList: EpisodicMetrics[]): EpisodicMetrics {
  if (metricsList.length === 0) {
    return {
      formCompletionRate: 0,
      fieldsAttempted: 0,
      fieldsCorrect: 0,
      totalFields: 0,
      averageClickAccuracy: 0,
      averageValueAccuracy: 0,
    };
  }

  return {
    formCompletionRate:
      metricsList.reduce((a, m) => a + m.formCompletionRate, 0) / metricsList.length,
    fieldsAttempted: metricsList.reduce((a, m) => a + m.fieldsAttempted, 0),
    fieldsCorrect: metricsList.reduce((a, m) => a + m.fieldsCorrect, 0),
    totalFields: metricsList.reduce((a, m) => a + m.totalFields, 0),
    averageClickAccuracy:
      metricsList.reduce((a, m) => a + m.averageClickAccuracy, 0) / metricsList.length,
    averageValueAccuracy:
      metricsList.reduce((a, m) => a + m.averageValueAccuracy, 0) / metricsList.length,
  };
}
