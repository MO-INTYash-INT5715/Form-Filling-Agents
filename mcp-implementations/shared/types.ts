/**
 * Shared types for the MCP-based form-filling implementations.
 * The ONLY module any of the three implementations may import from.
 */

export interface UserProfile {
  personal?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
  };
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  professional?: {
    currentTitle?: string;
    company?: string;
    yearsExperience?: number;
    linkedIn?: string;
    portfolio?: string;
  };
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    graduationYear?: number;
  }>;
  custom?: Record<string, string | number | boolean>;
}

export interface LiveForm {
  id: string;                 // stable slug
  url: string;
  category: string;           // e.g. "job-application", "newsletter"
  expectedFields: string[];   // Profile keys we expect this form to consume
  notes?: string;
}

export interface FieldFill {
  fieldId: string;
  label?: string;
  type: string;
  value?: string | undefined;
  matchedProfileKey?: string;
  confidence: number;
}

export interface FillResult {
  implementation: string;     // "playwright-mcp" | "browser-mcp" | "skyvern-mcp"
  formId: string;
  url: string;
  success: boolean;
  fieldsAttempted: number;
  fieldsFilled: number;
  fieldsExpected: number;
  accuracy: number;           // fieldsFilled / fieldsExpected
  durationMs: number;
  toolCalls: number;
  tokensIn: number;
  tokensOut: number;
  screenshotPath?: string;
  finalUrl?: string;
  error?: string;
  fields?: FieldFill[];
  failureCategory?:
    | "bot-detection"
    | "captcha"
    | "agentic-loop"
    | "hallucination"
    | "popup"
    | "network"
    | "other";
  startedAt: string;          // ISO
  finishedAt: string;         // ISO
}

export interface ComparisonReport {
  generatedAt: string;
  implementations: string[];
  forms: string[];
  perImplementation: Record<string, {
    runs: number;
    successRate: number;
    avgAccuracy: number;
    avgDurationMs: number;
    avgToolCalls: number;
    totalTokens: number;
  estimatedCostUSD?: number;
  failureBreakdown: Record<string, number>;
  }>;
}

export interface MCPFormFiller {
  name: string;
  init(): Promise<void>;
  fill(url: string, profile: UserProfile): Promise<FillResult>;
  close(): Promise<void>;
}
