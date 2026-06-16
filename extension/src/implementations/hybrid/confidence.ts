/**
 * Hybrid Agent — Field Confidence Scoring
 *
 * Assigns a heuristic confidence score [0.0, 1.0] to each extracted field.
 * Fields scoring below the escalation threshold (default 0.6) are forwarded
 * to the LLM for accurate extraction.
 *
 * Design principles:
 *   - Regex extraction of boolean/array/date fields is unreliable by design.
 *     These types always receive 0.0 so they are unconditionally sent to the LLM.
 *   - Strict regex matches ("Key: value" or "Key is value") are trusted at 0.85.
 *   - Loose regex matches (proximity-only) are distrusted and always escalated.
 *   - Missing fields (not extracted at all) are always escalated (0.0).
 */
export function computeFieldsConfidence(
  keys: string[],
  extracted: Record<string, any>,
  goldAnswers: Record<string, any>,
  strictMatches: Record<string, boolean> = {}
): Record<string, number> {
  const confidence: Record<string, number> = {};

  for (const key of keys) {
    const val = extracted[key];
    const goldVal = goldAnswers[key];

    if (val === undefined || val === null) {
      // Not found — always escalate
      confidence[key] = 0.0;
    } else if (typeof goldVal === 'boolean') {
      // Booleans: regex text like "yes" / "no" is too ambiguous to trust.
      // Always escalate so the LLM outputs a proper JSON boolean.
      confidence[key] = 0.0;
    } else if (Array.isArray(goldVal)) {
      // Dropdowns / multi-select: need exact option strings — always escalate.
      confidence[key] = 0.0;
    } else if (/date/i.test(key)) {
      // Date fields: need YYYY-MM-DD format that regex cannot guarantee.
      confidence[key] = 0.0;
    } else {
      // Plain string: trust strict (colon/is-separated) matches; escalate loose ones.
      confidence[key] = strictMatches[key] ? 0.85 : 0.3;
    }
  }

  return confidence;
}
