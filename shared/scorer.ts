/**
 * Shared scorer used by all tracks in the Ablation study.
 * Provides a consistent atomic and episodic scoring interface.
 */

export interface FieldFill {
  fieldId: string;
  label?: string;
  type: string;
  value?: string | undefined;
  matchedProfileKey?: string;
  confidence: number;
}

// Simple BLEU-4 approximation for Description fields
function ngrams(tokens: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

function clippedPrecision(reference: string[], candidate: string[], n: number): number {
  const refN = ngrams(reference, n);
  const candN = ngrams(candidate, n);
  if (candN.length === 0) return 0;
  const refCounts: Record<string, number> = {};
  for (const r of refN) refCounts[r] = (refCounts[r] || 0) + 1;
  let match = 0;
  const used: Record<string, number> = {};
  for (const c of candN) {
    if ((refCounts[c] || 0) - (used[c] || 0) > 0) {
      match++;
      used[c] = (used[c] || 0) + 1;
    }
  }
  return match / candN.length;
}

function simpleBleu(reference: string, candidate: string): number {
  const refTokens = reference.trim().split(/\s+/).filter(Boolean);
  const candTokens = candidate.trim().split(/\s+/).filter(Boolean);
  if (candTokens.length === 0 || refTokens.length === 0) return 0;
  const precisions: number[] = [];
  for (let n = 1; n <= 4; n++) precisions.push(clippedPrecision(refTokens, candTokens, n));
  // geometric mean (avoid zeros)
  const geoMean = precisions.some(p => p === 0) ? 0 : Math.exp(precisions.map(p => Math.log(p)).reduce((a, b) => a + b, 0) / precisions.length);
  // brevity penalty
  const bp = candTokens.length > refTokens.length ? 1 : Math.exp(1 - refTokens.length / candTokens.length);
  return Math.round(bp * geoMean * 10000) / 100; // 0-100 scale
}

/**
 * Score fills against gold answers. Returns same shape as existing benchmark `scoreFills`.
 */
export function scoreFillsAgainstGold(
  fills: FieldFill[],
  goldById: Record<string, string>,
  formFields?: Array<{ id: string; label?: string; type?: string }>
): {
  fillRate: number;
  valueAccuracy: number;
  matched: number;
  attempted: number;
  total: number;
  perFieldType?: Record<string, number>;
} {
  const total = fills.length;
  const attempted = fills.filter(f => f.value !== undefined).length;
  const fillRate = total > 0 ? (attempted / total) * 100 : 0;

  let correct = 0;
  let scoreable = 0;

  // per-field-type counters
  const typeTotals: Record<string, number> = {};
  const typeCorrect: Record<string, number> = {};

  for (const fill of fills) {
    const ftype = (fill.type || 'String');
    typeTotals[ftype] = (typeTotals[ftype] || 0) + 1;

    if (fill.value === undefined) continue;
    const gold = goldById[fill.fieldId] ?? goldById[fill.label ?? ''];
    if (!gold) continue;
    scoreable++;

    const pred = String(fill.value).toLowerCase().trim();
    const ref = String(gold).toLowerCase().trim();

    let isCorrect = false;
    if (ftype === 'Description') {
      const bleu = simpleBleu(String(gold), String(fill.value));
      // threshold: conservative
      isCorrect = bleu >= 20; 
      if (isCorrect) {
        typeCorrect[ftype] = (typeCorrect[ftype] || 0) + 1;
      }
    } else {
      if (pred === ref || pred.includes(ref) || ref.includes(pred)) {
        isCorrect = true;
        typeCorrect[ftype] = (typeCorrect[ftype] || 0) + 1;
      }
    }

    if (isCorrect) correct++;
  }

  const valueAccuracy = scoreable > 0 ? (correct / scoreable) * 100 : 0;

  const perFieldType: Record<string, number> = {};
  for (const t of Object.keys(typeTotals)) {
    perFieldType[t] = typeTotals[t] > 0 ? ((typeCorrect[t] || 0) / typeTotals[t]) * 100 : 0;
  }

  return { fillRate, valueAccuracy, matched: correct, attempted, total, perFieldType };
}
