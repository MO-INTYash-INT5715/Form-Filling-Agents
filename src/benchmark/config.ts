/**
 * FormFactory Benchmark — Configuration
 *
 * Central config type and defaults for running the benchmark against the
 * real FormFactory Flask server (github.com/formfactory-ai/formfactory).
 */

import * as path from 'path';

export interface BenchmarkConfig {
  // ---------------------------------------------------------------------------
  // FormFactory server connection
  // ---------------------------------------------------------------------------
  /** Base URL of the running Flask server. Default: http://localhost:5000 */
  formFactoryServerUrl: string;

  // ---------------------------------------------------------------------------
  // Dataset paths (cloned repo)
  // ---------------------------------------------------------------------------
  /**
   * Absolute path to the cloned formfactory-ai/formfactory repo.
   * Expected sub-directories: data1/, data2/, labeled-images/
   * Default: c:\Code\formfactory
   */
  formFactoryDataPath: string;

  // ---------------------------------------------------------------------------
  // Scope
  // ---------------------------------------------------------------------------
  /**
   * Which form IDs to benchmark. Use undefined / empty to run all forms.
   * Form IDs match the folder structure in the repo (e.g. "A1", "B3", "C2").
   */
  formIds?: string[];

  /** Number of instances per form. Paper uses 50. Use 1 for a quick sanity check. */
  maxInstancesPerForm: number;

  // ---------------------------------------------------------------------------
  // Agent
  // ---------------------------------------------------------------------------
  /** Name of the agent implementation being evaluated */
  agentName: string;

  // ---------------------------------------------------------------------------
  // Browser automation
  // ---------------------------------------------------------------------------
  /** Run Playwright in headless mode. Set false to watch the browser. Default: true */
  headless: boolean;

  /** Per-form-instance timeout in milliseconds. Default: 60000 (60s) */
  timeoutMs: number;

  /** Pixel tolerance for click accuracy matching against bbox centroids */
  clickTolerancePx: number;

  /** Optional path to a Chromium/Chrome executable to use instead of Playwright's downloaded browser */
  browserExecutablePath?: string;

  // ---------------------------------------------------------------------------
  // Output
  // ---------------------------------------------------------------------------
  /**
   * Directory where per-form JSON results and the final report are saved.
   * Default: ./benchmark-results/<agentName>/
   */
  outputDir: string;

  /** Whether to generate an HTML report in addition to JSON. Default: true */
  generateHtmlReport: boolean;

  // ---------------------------------------------------------------------------
  // Evaluation
  // ---------------------------------------------------------------------------
  /** Minimum BLEU-4 score (0–100) to count a Description field as correct */
  bleuThreshold: number;

  /**
   * If true, skip FileUpload fields entirely (they cannot be automated
   * without real files). Default: true
   */
  skipFileUploadFields: boolean;
}

// ---------------------------------------------------------------------------
// Default paths — adjust if your formfactory repo is elsewhere
// ---------------------------------------------------------------------------
const DEFAULT_FORMFACTORY_PATH = path.resolve('c:\\Code\\formfactory');

export const DEFAULT_CONFIG: BenchmarkConfig = {
  formFactoryServerUrl: 'http://localhost:5000',
  formFactoryDataPath: DEFAULT_FORMFACTORY_PATH,
  formIds: undefined,          // all forms
  maxInstancesPerForm: 1,      // quick default; use 50 for full paper scale
  agentName: 'rule-based',
  headless: true,
  timeoutMs: 60_000,
  clickTolerancePx: 10,        // paper-faithful 10px tolerance
  outputDir: path.resolve('./benchmark-results'),
  generateHtmlReport: true,
  bleuThreshold: 30,           // ≥30 BLEU counts as correct for Description
  skipFileUploadFields: true,
};

/**
 * Create a config by merging overrides on top of the defaults.
 */
export function createConfig(overrides: Partial<BenchmarkConfig>): BenchmarkConfig {
  const merged = { ...DEFAULT_CONFIG, ...overrides };

  // Auto-set outputDir to include agentName if not explicitly overridden
  if (!overrides.outputDir) {
    merged.outputDir = path.join(
      path.resolve('./benchmark-results'),
      merged.agentName
    );
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Preset scenarios
// ---------------------------------------------------------------------------
export const SCENARIOS = {
  /** 1 instance × all forms — fast sanity check */
  QUICK: createConfig({ maxInstancesPerForm: 1 }),

  /** 50 instances × all forms — full paper scale */
  FULL: createConfig({ maxInstancesPerForm: 50 }),

  /** Watch the browser filling the form (debug) */
  DEBUG: createConfig({ maxInstancesPerForm: 1, headless: false, timeoutMs: 120_000 }),
};
