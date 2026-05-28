/**
 * Enhanced field matcher using semantic embeddings + improved rule-based fallback
 * Ported and optimized from extension/src/implementations/embedding-matcher/
 */

import type { ScrapedField, UserProfile } from '../types/index';
import { embedTexts, cosineSimilarity } from './embedder';

interface FieldMatch {
  field: ScrapedField;
  value: string;
  confidence: number;
  method: 'embedding' | 'keyword' | 'fuzzy';
}

// Expanded keyword mappings with aliases
const FIELD_PATTERNS: Record<string, string[]> = {
  // Personal
  firstName: ['first', 'fname', 'forename', 'given', 'customer name'],
  lastName: ['last', 'lname', 'surname', 'family'],
  email: ['email', 'e-mail', 'mail', 'contact'],
  phone: ['phone', 'tel', 'telephone', 'mobile', 'cell'],
  dateOfBirth: ['birth', 'dob', 'birthday', 'born'],
  gender: ['gender', 'sex'],

  // Address
  'address.line1': ['address', 'street', 'line1', 'addr'],
  'address.line2': ['line2', 'apt', 'suite', 'unit'],
  'address.city': ['city', 'town'],
  'address.state': ['state', 'province', 'region'],
  'address.postalCode': ['zip', 'postal', 'postcode'],
  'address.country': ['country', 'nation'],

  // Professional
  'professional.currentTitle': ['title', 'position', 'role', 'job'],
  'professional.company': ['company', 'employer', 'organization'],
  'professional.yearsExperience': ['experience', 'years'],
  'professional.linkedIn': ['linkedin', 'profile'],

  // Generic
  comments: ['comments', 'notes', 'remarks', 'instructions', 'message'],
  size: ['size'],
  quantity: ['quantity', 'qty', 'amount'],
};

/**
 * Extract value from nested profile path (e.g., "address.city" → profile.address.city)
 */
function getProfileValue(profile: UserProfile, path: string): string | undefined {
  const parts = path.split('.');
  let obj: any = profile;

  for (const part of parts) {
    if (obj && typeof obj === 'object' && part in obj) {
      obj = obj[part];
    } else {
      return undefined;
    }
  }

  if (obj === null || obj === undefined) return undefined;
  if (typeof obj === 'object') return undefined; // Don't stringify objects
  return String(obj);
}

/**
 * Build candidate pool from profile with labels
 */
function buildCandidates(profile: UserProfile): Array<{ text: string; source: string }> {
  const candidates: Array<{ text: string; source: string }> = [];

  // Personal fields
  if (profile.personal) {
    Object.entries(profile.personal).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        candidates.push({ text: value, source: `personal.${key}` });
      }
    });
  }

  // Address (nested)
  if (profile.personal?.address) {
    Object.entries(profile.personal.address).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        candidates.push({ text: value, source: `address.${key}` });
      }
    });
  }

  // Professional
  if (profile.professional) {
    Object.entries(profile.professional).forEach(([key, value]) => {
      if (value && typeof value !== 'object') {
        candidates.push({ text: String(value), source: `professional.${key}` });
      }
    });
  }

  // Education (first entry only, for simplicity)
  if (profile.education?.[0]) {
    Object.entries(profile.education[0]).forEach(([key, value]) => {
      if (value && typeof value !== 'object') {
        candidates.push({ text: String(value), source: `education.${key}` });
      }
    });
  }

  // Custom fields
  if (profile.custom) {
    Object.entries(profile.custom).forEach(([key, value]) => {
      if (value && typeof value !== 'object') {
        candidates.push({ text: String(value), source: `custom.${key}` });
      }
    });
  }

  return candidates;
}

/**
 * Keyword-based matching (fast path)
 */
function keywordMatch(field: ScrapedField, profile: UserProfile): string | undefined {
  const fieldText = [field.label, field.name, field.placeholder, field.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .trim();

  if (!fieldText) return undefined;

  // Try all pattern matches
  for (const [profilePath, keywords] of Object.entries(FIELD_PATTERNS)) {
    for (const keyword of keywords) {
      if (fieldText.includes(keyword)) {
        const value = getProfileValue(profile, profilePath);
        if (value) return value;
      }
    }
  }

  return undefined;
}

/**
 * Embedding-based semantic matching (high accuracy)
 */
export async function matchFieldsWithEmbeddings(
  fields: ScrapedField[],
  profile: UserProfile
): Promise<FieldMatch[]> {
  const matches: FieldMatch[] = [];
  const candidates = buildCandidates(profile);

  if (candidates.length === 0) {
    console.warn('[enhanced-matcher] No candidates found in profile');
    return matches;
  }

  // Build field queries (label + name + placeholder for context)
  const fieldQueries = fields.map((f) =>
    [f.label, f.name, f.placeholder].filter(Boolean).join(' ').toLowerCase().trim()
  );

  // Filter out empty queries
  const validFieldIndices = fieldQueries
    .map((q, i) => (q ? i : -1))
    .filter((i) => i >= 0);

  if (validFieldIndices.length === 0) {
    console.warn('[enhanced-matcher] No valid field labels to match');
    return matches;
  }

  const validQueries = validFieldIndices.map((i) => fieldQueries[i]);
  const candidateTexts = candidates.map((c) => c.text);

  try {
    // Compute embeddings
    const [fieldEmbeds, candidateEmbeds] = await Promise.all([
      embedTexts(validQueries),
      embedTexts(candidateTexts),
    ]);

    const SIMILARITY_THRESHOLD = 0.65; // Tuned for local embeddings

    // Match each field to best candidate
    for (let i = 0; i < validFieldIndices.length; i++) {
      const fieldIdx = validFieldIndices[i];
      const field = fields[fieldIdx];
      const fieldVec = fieldEmbeds[i];

      let bestScore = -Infinity;
      let bestCandidateIdx = -1;

      for (let j = 0; j < candidateEmbeds.length; j++) {
        const score = cosineSimilarity(fieldVec, candidateEmbeds[j]);
        if (score > bestScore) {
          bestScore = score;
          bestCandidateIdx = j;
        }
      }

      if (bestCandidateIdx >= 0 && bestScore >= SIMILARITY_THRESHOLD) {
        matches.push({
          field,
          value: candidates[bestCandidateIdx].text,
          confidence: bestScore,
          method: 'embedding',
        });
      } else {
        // Fallback to keyword matching
        const keywordValue = keywordMatch(field, profile);
        if (keywordValue) {
          matches.push({
            field,
            value: keywordValue,
            confidence: 0.5,
            method: 'keyword',
          });
        }
      }
    }
  } catch (err) {
    console.error('[enhanced-matcher] Embedding failed, falling back to keywords:', err);
    // Full keyword fallback
    for (const field of fields) {
      const value = keywordMatch(field, profile);
      if (value) {
        matches.push({
          field,
          value,
          confidence: 0.5,
          method: 'keyword',
        });
      }
    }
  }

  return matches;
}
