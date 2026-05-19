/**
 * FormFactory Benchmark Configuration
 * Settings for running benchmarks against the FormFactory dataset
 */

export interface BenchmarkConfig {
  // Test execution
  batchSize: number;
  timeoutPerTest: number;
  maxRetries: number;

  // Evaluation
  clickTolerance: number; // pixels
  clickWeight: number;
  valueWeight: number;

  // Output
  generateReport: boolean;
  reportFormat: 'json' | 'html' | 'markdown';
  outputPath: string;

  // Ruler-enhanced strategy
  useRulerEnhancement: boolean;
  rulerScale: number;

  // Models to test
  models: string[];

  // Dataset filtering
  domains?: string[];
  fieldTypes?: string[];
  minFieldCount?: number;
  maxFieldCount?: number;
}

export const DEFAULT_CONFIG: BenchmarkConfig = {
  // Test execution
  batchSize: 10,
  timeoutPerTest: 30000, // 30 seconds
  maxRetries: 3,

  // Evaluation metrics
  clickTolerance: 10, // pixels
  clickWeight: 0.4,
  valueWeight: 0.6,

  // Output
  generateReport: true,
  reportFormat: 'json',
  outputPath: './benchmark-results',

  // Ruler enhancement
  useRulerEnhancement: false,
  rulerScale: 1.0,

  // Models to test
  models: [
    'Adaptive Form Agent',
    // Can extend with: 'GPT-4o', 'Gemini', 'Claude', 'Qwen-VL-Max'
  ],

  // Dataset filtering
  domains: undefined, // Test all domains
  fieldTypes: undefined, // Test all field types
  minFieldCount: 1,
  maxFieldCount: 22,
};

/**
 * Create custom benchmark configuration
 */
export function createBenchmarkConfig(overrides: Partial<BenchmarkConfig>): BenchmarkConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
  };
}

/**
 * Predefined benchmark scenarios
 */
export const BENCHMARK_SCENARIOS = {
  QUICK: createBenchmarkConfig({
    batchSize: 5,
    timeoutPerTest: 10000,
    models: ['Adaptive Form Agent'],
    // Test only 1 sample per form
  }),

  FULL: createBenchmarkConfig({
    batchSize: 10,
    timeoutPerTest: 30000,
    models: ['Adaptive Form Agent'],
    // Test multiple samples per form
  }),

  ACADEMIC_ONLY: createBenchmarkConfig({
    batchSize: 10,
    domains: ['Academic & Research'],
  }),

  COMPLEX_FORMS: createBenchmarkConfig({
    batchSize: 5,
    minFieldCount: 15,
    timeoutPerTest: 60000,
  }),

  WITH_RULER: createBenchmarkConfig({
    useRulerEnhancement: true,
    rulerScale: 1.0,
  }),

  COMPARATIVE: createBenchmarkConfig({
    models: [
      'Adaptive Form Agent',
      // Add more models for comparison
    ],
  }),
};
