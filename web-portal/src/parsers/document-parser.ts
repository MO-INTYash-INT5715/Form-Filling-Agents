/**
 * Document Parser
 *
 * Accepts uploaded files (PDF, DOCX, TXT, JSON) and extracts a UserProfile.
 *
 * Strategy:
 *  1. Extract raw text from the file (pdf-parse, mammoth, or plain read).
 *  2. Pass the raw text + system prompt to an LLM → constrained JSON output.
 *  3. Validate and return the parsed UserProfile.
 *
 * TODO: implement real parsers; stubs return empty profile.
 */

import type { UserProfile, ParseDocumentResponse } from '../types/index';

// ── Text extractors ──────────────────────────────────────────────────────────

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // TODO: const pdfParse = await import('pdf-parse');
  //       const data = await pdfParse.default(buffer);
  //       return data.text;
  console.warn('[parser] PDF extraction not yet implemented');
  return '';
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  // TODO: const mammoth = await import('mammoth');
  //       const result = await mammoth.extractRawText({ buffer });
  //       return result.value;
  console.warn('[parser] DOCX extraction not yet implemented');
  return '';
}

function extractTextFromTxt(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

// ── LLM-based profile extraction ─────────────────────────────────────────────

async function extractProfileFromText(rawText: string): Promise<Partial<UserProfile>> {
  // TODO: call OpenAI / Anthropic with a structured output prompt:
  //   "Given the following document text, extract all personal, professional,
  //    and education information into this JSON schema: ..."
  // For now, return an empty profile as a stub.
  console.warn('[parser] LLM profile extraction stub — returning empty profile');
  return { extra: { rawText: rawText.slice(0, 500) } };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Parses a user-uploaded document buffer into a UserProfile.
 */
export async function parseDocument(
  documentId: string,
  mimeType: string,
  buffer: Buffer
): Promise<ParseDocumentResponse> {
  let rawText = '';

  if (mimeType === 'application/pdf') {
    rawText = await extractTextFromPdf(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    rawText = await extractTextFromDocx(buffer);
  } else if (mimeType === 'text/plain') {
    rawText = extractTextFromTxt(buffer);
  } else if (mimeType === 'application/json') {
    try {
      const parsed: Partial<UserProfile> = JSON.parse(buffer.toString('utf-8'));
      return { documentId, parsedProfile: parsed };
    } catch {
      rawText = buffer.toString('utf-8');
    }
  } else {
    // Fallback: try plain text
    rawText = buffer.toString('utf-8');
  }

  const parsedProfile = await extractProfileFromText(rawText);
  return { documentId, parsedProfile, rawText: rawText.slice(0, 1000) };
}
