/**
 * FormFactory Benchmark — Canonical Types
 *
 * Faithful to: "FormFactory: An Interactive Benchmarking Suite for
 * Multimodal Form-Filling Agents" (arXiv:2506.01520)
 *
 * Real dataset layout (cloned repo at c:\Code\formfactory\):
 *   data1/<formId>/<instanceIndex>.json  → gold field-value answers
 *   data2/<formId>/<instanceIndex>.txt   → input documents (resumes, descriptions)
 *   labeled-images/<folder>/             → screenshots + bbox annotations
 */

// ---------------------------------------------------------------------------
// Field types used across FormFactory forms (paper §3.2, Table 1)
// ---------------------------------------------------------------------------
export type FieldType =
  | 'String'        // plain text input
  | 'Dropdown'      // <select> list
  | 'Checkbox'      // single checkbox
  | 'RadioButton'   // radio group (single choice)
  | 'MultiCheckbox' // multi-select checkbox group
  | 'Description'   // free-form textarea (evaluated with BLEU)
  | 'Date'          // date picker
  | 'FileUpload'    // file input (skipped in automated eval)
  | 'NumericInput'; // numeric text input

// ---------------------------------------------------------------------------
// Dataset types
// ---------------------------------------------------------------------------

/** A single bounding-box annotation from labeled-images/ */
export interface BBoxAnnotation {
  fieldId: string;
  label: string;
  x: number;        // left-top x in pixels
  y: number;        // left-top y in pixels
  width: number;
  height: number;
  /** Derived centroid — used for click-accuracy comparison */
  cx: number;
  cy: number;
}

/** One (form, instance) pair loaded from data1/ + data2/ */
export interface FormInstance {
  /** e.g. "A1", "B3" — folder letter + form index inside that folder */
  formId: string;
  /** Human-readable name matching the HTML form title */
  formName: string;
  /** One of the 8 domains (Academic & Research, Finance & Banking, …) */
  domain: string;
  /** 0-based index into the 50 instances of this form */
  instanceIndex: number;
  /** Raw text from data2/ — the agent's input document (resume, description, etc.) */
  inputDocument: string;
  /** Ground-truth answers from data1/ — field name → expected value(s) */
  goldAnswers: Record<string, string | string[]>;
  /** Whether the form spans multiple pages */
  multiPage: boolean;
  /** URL path on the Flask server, e.g. "/forms/A1" */
  formPath: string;
}

// ---------------------------------------------------------------------------
// Agent action types (paper §3.3 — action space)
// ---------------------------------------------------------------------------

export type ActionType =
  | 'click'       // Click(x, y)
  | 'type'        // Type(text) after focusing a field
  | 'select'      // Select option in a dropdown
  | 'check'       // Toggle a checkbox or radio button
  | 'clear'       // Clear an existing field value
  | 'submit';     // Submit the form / click Next on multi-page

/** A single atomic action emitted by an agent */
export interface AgentAction {
  type: ActionType;
  /** Pixel coordinates — required for 'click', 'check', 'select', 'submit' */
  x?: number;
  y?: number;
  /** Text content — required for 'type' */
  text?: string;
  /** Field identifier — informational, used in result matching */
  fieldId?: string;
  /** Confidence score in [0, 1] — optional, used by hybrid agents */
  confidence?: number;
}

/** Full sequence of actions an agent produces for one form instance */
export interface ActionTrace {
  formInstance: FormInstance;
  agentName: string;
  actions: AgentAction[];
  generationTimeMs: number;
}

// ---------------------------------------------------------------------------
// Per-field evaluation result
// ---------------------------------------------------------------------------

export interface FieldResult {
  fieldId: string;
  fieldType: FieldType;
  /** The value the agent typed / selected */
  predictedValue: string;
  /** Ground-truth value(s) from data1/ */
  goldValue: string | string[];
  /**
   * Click accuracy: did the agent's click land within the bounding box of
   * the correct element? (uses labeled-images/ bbox annotations)
   * null if no bbox annotation is available for this field.
   */
  clickAccurate: boolean | null;
  /**
   * Value accuracy:
   * - exact match (case-insensitive, trimmed) for all types except Description
   * - BLEU-4 score ≥ threshold for Description fields
   */
  valueAccurate: boolean;
  /** BLEU-4 score (0–100) — only set for Description fields */
  bleuScore?: number;
  /** Raw predicted click coordinates */
  predictedClick?: { x: number; y: number };
  /** Ground-truth element centroid from bbox annotation */
  groundTruthClick?: { x: number; y: number };
}

// ---------------------------------------------------------------------------
// Aggregate metrics — paper §5.1.2
// ---------------------------------------------------------------------------

/** Per-field-type aggregated metrics (Atomic evaluation) */
export interface AtomicMetrics {
  /** Fraction of correctly clicked elements, per field type (0–100) */
  clickAccuracy: Record<string, number>;
  /** Fraction of correctly valued fields, per field type (0–100) */
  valueAccuracy: Record<string, number>;
  /** Micro-averaged across all fields */
  overallClickAccuracy: number;
  overallValueAccuracy: number;
}

/** End-to-end form completion metrics (Episodic evaluation) */
export interface EpisodicMetrics {
  /** % of field-value pairs correctly filled AND submitted (0–100) */
  formCompletionRate: number;
  fieldsAttempted: number;
  fieldsCorrect: number;
  totalFields: number;
  averageClickAccuracy: number;
  averageValueAccuracy: number;
}

// ---------------------------------------------------------------------------
// Full benchmark result for one form instance
// ---------------------------------------------------------------------------

export interface FormResult {
  formInstance: FormInstance;
  agentName: string;
  fieldResults: FieldResult[];
  atomicMetrics: AtomicMetrics;
  episodicMetrics: EpisodicMetrics;
  executionTimeMs: number;
  errors: string[];
  /** Whether the Flask server confirmed a successful form submission */
  submissionSucceeded: boolean;
}

// ---------------------------------------------------------------------------
// Full benchmark report across all instances
// ---------------------------------------------------------------------------

export interface BenchmarkAgent {
  name: string;
  // Batch planning approach (e.g. Rule-Based, DOM-LLM)
  planActions?: (instance: FormInstance) => Promise<AgentAction[]>;
  // Iterative approach (e.g. MCP agents driving the browser directly)
  runIterative?: (instance: FormInstance, page: any) => Promise<void>;
}

export interface BenchmarkReport {
  agentName: string;
  timestamp: string;
  config: {
    formFactoryServerUrl: string;
    formIds: string[] | 'all';
    instancesPerForm: number;
  };
  totalForms: number;
  totalInstances: number;
  totalFields: number;
  /** Overall atomic metrics across all instances */
  globalAtomic: AtomicMetrics;
  /** Overall episodic metrics across all instances */
  globalEpisodic: EpisodicMetrics;
  /** Per-domain breakdown */
  byDomain: Record<string, {
    domain: string;
    instanceCount: number;
    atomic: AtomicMetrics;
    episodic: EpisodicMetrics;
  }>;
  /** Per-form results */
  formResults: FormResult[];
  /** Total wall-clock time in ms */
  totalExecutionTimeMs: number;
  errors: string[];
}
