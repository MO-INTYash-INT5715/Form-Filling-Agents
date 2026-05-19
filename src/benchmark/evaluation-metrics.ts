/**
 * FormFactory Evaluation Metrics
 * Atomic-level and Episodic-level evaluation
 */

export interface AtomicMetric {
  fieldType: string;
  clickAccuracy: number;  // Correct UI element selection
  valueAccuracy: number;  // Content correctness (exact match or BLEU)
}

export interface EpisodicMetric {
  formCompletionRate: number;  // End-to-end form completion
  fieldsFilled: number;
  totalFields: number;
  averageClickAccuracy: number;
  averageValueAccuracy: number;
}

export interface BenchmarkResult {
  modelName: string;
  atomic: AtomicMetric[];
  episodic: EpisodicMetric;
  timestamp: number;
  rulerEnhanced?: boolean;
}

export interface DetailedEvaluation {
  result: BenchmarkResult;
  fieldLevelAccuracy: Record<string, number>;
  actionMatchRate: number;
  overallScore: number;
  breakdown: {
    stringFields: AtomicMetric;
    dropdownFields: AtomicMetric;
    checkboxFields: AtomicMetric;
    radioFields: AtomicMetric;
    descriptionFields: AtomicMetric;
    dateFields: AtomicMetric;
    fileUploadFields: AtomicMetric;
  };
}

export class EvaluationMetrics {
  /**
   * Calculate atomic-level metrics for a single field type
   * @param fieldType Type of field being evaluated
   * @param predictedClicks Array of predicted click coordinates
   * @param groundTruthClicks Array of ground truth click coordinates
   * @param predictedValue The value the model filled
   * @param groundTruthValue The expected value
   * @returns Atomic metrics for this field
   */
  static calculateAtomicMetric(
    fieldType: string,
    predictedClicks: Array<{ x: number; y: number }>,
    groundTruthClicks: Array<{ x: number; y: number }>,
    predictedValue: string,
    groundTruthValue: string | string[]
  ): AtomicMetric {
    // Click accuracy: how many clicks hit the right area (within tolerance)
    const clickAccuracy = this.calculateClickAccuracy(
      predictedClicks,
      groundTruthClicks
    );

    // Value accuracy: exact match for most types, BLEU for descriptions
    const valueAccuracy = this.calculateValueAccuracy(
      fieldType,
      predictedValue,
      groundTruthValue
    );

    return {
      fieldType,
      clickAccuracy,
      valueAccuracy,
    };
  }

  /**
   * Calculate click accuracy with pixel tolerance
   * Tolerance: 10 pixels is reasonable for GUI interaction
   */
  private static calculateClickAccuracy(
    predicted: Array<{ x: number; y: number }>,
    groundTruth: Array<{ x: number; y: number }>,
    tolerance: number = 10
  ): number {
    if (groundTruth.length === 0) return 0;
    if (predicted.length === 0) return 0;

    let correctClicks = 0;
    for (const truthClick of groundTruth) {
      const isCorrect = predicted.some(
        predClick =>
          Math.abs(predClick.x - truthClick.x) <= tolerance &&
          Math.abs(predClick.y - truthClick.y) <= tolerance
      );
      if (isCorrect) correctClicks++;
    }

    return (correctClicks / groundTruth.length) * 100;
  }

  /**
   * Calculate value accuracy
   * - Exact match for most fields
   * - BLEU score for description fields
   */
  private static calculateValueAccuracy(
    fieldType: string,
    predicted: string,
    groundTruth: string | string[]
  ): number {
    const truthValues = Array.isArray(groundTruth) ? groundTruth : [groundTruth];

    if (fieldType === 'Description') {
      // Use BLEU score for description fields
      return this.calculateBLEUScore(predicted, truthValues[0]);
    }

    // Exact match for other field types
    const normalized = (s: string) => s.toLowerCase().trim();
    const isMatch = truthValues.some(v => normalized(v) === normalized(predicted));

    return isMatch ? 100 : 0;
  }

  /**
   * Calculate BLEU score (simplified 1-gram BLEU)
   * BLEU measures overlap between predicted and reference text
   */
  private static calculateBLEUScore(predicted: string, reference: string): number {
    const predTokens = predicted.toLowerCase().split(/\s+/);
    const refTokens = reference.toLowerCase().split(/\s+/);

    if (refTokens.length === 0) return 0;

    // Count matching tokens
    const matches = predTokens.filter(t => refTokens.includes(t)).length;
    const precision = matches / Math.max(predTokens.length, 1);
    const recall = matches / refTokens.length;

    // F1-like combination
    const f1 = (2 * precision * recall) / (precision + recall || 1);
    return f1 * 100;
  }

  /**
   * Calculate episodic metrics for end-to-end form completion
   */
  static calculateEpisodicMetric(
    atomicMetrics: AtomicMetric[],
    fieldsFilled: number,
    totalFields: number
  ): EpisodicMetric {
    const avgClickAccuracy =
      atomicMetrics.reduce((sum, m) => sum + m.clickAccuracy, 0) /
      Math.max(atomicMetrics.length, 1);

    const avgValueAccuracy =
      atomicMetrics.reduce((sum, m) => sum + m.valueAccuracy, 0) /
      Math.max(atomicMetrics.length, 1);

    return {
      formCompletionRate: (fieldsFilled / totalFields) * 100,
      fieldsFilled,
      totalFields,
      averageClickAccuracy: avgClickAccuracy,
      averageValueAccuracy: avgValueAccuracy,
    };
  }

  /**
   * Calculate overall benchmark score
   * Weighted combination of click and value accuracy
   */
  static calculateOverallScore(
    atomicMetrics: AtomicMetric[],
    episodicMetric: EpisodicMetric,
    clickWeight: number = 0.4,
    valueWeight: number = 0.6
  ): number {
    const avgClickAccuracy = episodicMetric.averageClickAccuracy;
    const avgValueAccuracy = episodicMetric.averageValueAccuracy;

    // Normalize to 0-1 range
    const normalizedClick = avgClickAccuracy / 100;
    const normalizedValue = avgValueAccuracy / 100;

    return (normalizedClick * clickWeight + normalizedValue * valueWeight) * 100;
  }

  /**
   * Compare performance between models
   */
  static compareModels(results: BenchmarkResult[]): {
    bestModel: BenchmarkResult;
    ranking: BenchmarkResult[];
  } {
    const ranked = [...results].sort((a, b) => {
      const scoreA =
        a.episodic.averageClickAccuracy * 0.4 +
        a.episodic.averageValueAccuracy * 0.6;
      const scoreB =
        b.episodic.averageClickAccuracy * 0.4 +
        b.episodic.averageValueAccuracy * 0.6;
      return scoreB - scoreA;
    });

    return {
      bestModel: ranked[0],
      ranking: ranked,
    };
  }
}
