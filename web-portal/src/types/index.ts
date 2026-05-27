/**
 * Shared TypeScript types for the Web Portal
 */

// ── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

// ── User Profile (mirrors extension's UserProfile, kept in sync manually) ───

export interface UserProfile {
  personal: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    address?: AddressBlock;
  };
  professional?: {
    currentTitle?: string;
    company?: string;
    yearsExperience?: number;
    skills?: string[];
    linkedinUrl?: string;
  };
  education?: EducationEntry[];
  documents?: UserDocument[];
  /** Arbitrary extra fields parsed from uploaded docs */
  extra?: Record<string, string | string[]>;
}

export interface AddressBlock {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface EducationEntry {
  institution: string;
  degree?: string;
  field?: string;
  graduationYear?: number;
}

// ── Documents ────────────────────────────────────────────────────────────────

export type DocumentType = 'resume' | 'cover_letter' | 'transcript' | 'id' | 'other';

export interface UserDocument {
  id: string;
  userId: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  uploadedAt: string;
  /** Parsed structured data extracted from the document */
  parsedData?: Partial<UserProfile>;
}

// ── Form Scraping ─────────────────────────────────────────────────────────────

export interface ScrapedField {
  id: string;
  name?: string;
  label?: string;
  placeholder?: string;
  type: string;            // text | email | select | checkbox | radio | file | textarea
  required?: boolean;
  options?: string[];      // for select / radio
}

export interface ScrapedForm {
  url: string;
  title?: string;
  fields: ScrapedField[];
  scrapedAt: string;
}

// ── Fill Job ─────────────────────────────────────────────────────────────────

export type FillStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface FillJob {
  id: string;
  userId: string;
  url: string;
  profileId: string;
  status: FillStatus;
  createdAt: string;
  completedAt?: string;
  result?: FillResult;
  error?: string;
}

export interface FillResult {
  fieldsAttempted: number;
  fieldsFilled: number;
  fieldsFailed: number;
  /** field id → value that was filled */
  fills: Record<string, string>;
  /** field id → reason it was skipped */
  skipped: Record<string, string>;
  screenshotBase64?: string;
}

// ── API Request / Response shapes ────────────────────────────────────────────

export interface SubmitFillRequest {
  url: string;
  profileId?: string;
  /** Inline profile override (used when no stored profile exists) */
  profile?: Partial<UserProfile>;
}

export interface SubmitFillResponse {
  jobId: string;
  status: FillStatus;
}

export interface ParseDocumentResponse {
  documentId: string;
  parsedProfile: Partial<UserProfile>;
  rawText?: string;
}
