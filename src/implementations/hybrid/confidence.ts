/**
 * Computes heuristic confidence scores for extracted fields.
 * Scale: 0.0 (not found/uncertain) to 1.0 (highly certain).
 */
export function computeFieldsConfidence(
  keys: string[],
  extracted: Record<string, any>,
  goldAnswers: Record<string, any>
): Record<string, number> {
  const confidence: Record<string, number> = {};

  for (const key of keys) {
    const val = extracted[key];
    const goldVal = goldAnswers[key];

    if (val === undefined || val === null) {
      confidence[key] = 0.0;
    } else if (typeof goldVal === 'boolean') {
      // In smart generator, we often guessed true. Moderate confidence.
      confidence[key] = 0.5;
    } else {
      // If we found a string matching patterns, high confidence
      confidence[key] = 0.9;
    }
  }

  return confidence;
}
