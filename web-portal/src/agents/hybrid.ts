/**
 * Smart Field Matcher v3
 * 
 * Combines type-aware filtering + semantic embeddings + keyword fallback
 * for maximum accuracy without external API dependencies.
 */

import type { ScrapedField, UserProfile } from '../types/index';
import { embedTexts, cosineSimilarity } from './embedder';

interface FieldMatch {
  field: ScrapedField;
  value: string;
  confidence: number;
  method: 'type-rule' | 'embedding' | 'keyword' | 'fuzzy';
}

// Type-specific value extractors
const TYPE_EXTRACTORS: Record<string, (profile: UserProfile) => Array<{ value: string; label: string }>> = {
  email: (profile) => [
    { value: profile.personal.email || '', label: 'personal.email' },
  ].filter(v => v.value),

  tel: (profile) => [
    { value: profile.personal.phone || '', label: 'personal.phone' },
  ].filter(v => v.value),

  text: (profile) => {
    const candidates: Array<{ value: string; label: string }> = [];
    if (profile.personal.firstName) candidates.push({ value: profile.personal.firstName, label: 'firstName' });
    if (profile.personal.lastName) candidates.push({ value: profile.personal.lastName, label: 'lastName' });
    if (profile.personal.address?.line1) candidates.push({ value: profile.personal.address.line1, label: 'address' });
    if (profile.personal.address?.city) candidates.push({ value: profile.personal.address.city, label: 'city' });
    if (profile.personal.address?.state) candidates.push({ value: profile.personal.address.state, label: 'state' });
    if (profile.personal.address?.postalCode) candidates.push({ value: profile.personal.address.postalCode, label: 'zip' });
    if (profile.personal.address?.country) candidates.push({ value: profile.personal.address.country, label: 'country' });
    if (profile.professional?.currentTitle) candidates.push({ value: profile.professional.currentTitle, label: 'title' });
    if (profile.professional?.company) candidates.push({ value: profile.professional.company, label: 'company' });
    return candidates;
  },

  textarea: (profile) => {
    const candidates: Array<{ value: string; label: string }> = [];
    if (profile.custom?.comments) candidates.push({ value: String(profile.custom.comments), label: 'comments' });
    if (profile.custom?.message) candidates.push({ value: String(profile.custom.message), label: 'message' });
    return candidates;
  },

  time: (profile) => {
    // Time fields need HH:MM format - try to extract or default to noon
    return [{ value: '12:00', label: 'default_time' }];
  },

  date: (profile) => [
    { value: profile.personal.dateOfBirth || '', label: 'dateOfBirth' },
  ].filter(v => v.value),

  radio: (profile) => {
    // Radio buttons often represent size, preferences, etc.
    const candidates: Array<{ value: string; label: string }> = [];
    if (profile.custom?.size) candidates.push({ value: String(profile.custom.size), label: 'size' });
    if (profile.custom?.preference) candidates.push({ value: String(profile.custom.preference), label: 'preference' });
    return candidates;
  },

  checkbox: (profile) => {
    // Checkboxes represent boolean choices or multi-select
    const candidates: Array<{ value: string; label: string }> = [];
    if (profile.custom?.toppings) {
      const toppings = Array.isArray(profile.custom.toppings) 
        ? profile.custom.toppings 
        : [String(profile.custom.toppings)];
      toppings.forEach(t => candidates.push({ value: t, label: 'toppings' }));
    }
    return candidates;
  },
};

/**
 * Extract field query text (label + name + placeholder)
 */
function getFieldQuery(field: ScrapedField): string {
  return [field.label, field.name, field.placeholder]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .trim();
}

/**
 * Type-aware rule matching (fast path with high confidence)
 */
function typeAwareMatch(field: ScrapedField, profile: UserProfile): { value: string; confidence: number } | null {
  const extractor = TYPE_EXTRACTORS[field.type];
  if (!extractor) return null;

  const candidates = extractor(profile);
  if (candidates.length === 0) return null;

  const query = getFieldQuery(field);

  // Exact keyword match
  for (const candidate of candidates) {
    if (query.includes(candidate.label.toLowerCase())) {
      return { value: candidate.value, confidence: 0.95 };
    }
  }

  // For email/tel/date, return first candidate with high confidence (type match is strong signal)
  if (['email', 'tel', 'date', 'time'].includes(field.type) && candidates.length > 0) {
    return { value: candidates[0].value, confidence: 0.9 };
  }

  return null;
}

/**
 * Name-specific heuristics (customer name, full name, etc.)
 */
function matchName(query: string, profile: UserProfile): string | null {
  const firstName = profile.personal.firstName || '';
  const lastName = profile.personal.lastName || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (query.includes('customer') || query.includes('custname')) {
    return fullName || firstName;
  }
  if (query.includes('first') || query.includes('fname') || query.includes('given')) {
    return firstName;
  }
  if (query.includes('last') || query.includes('lname') || query.includes('surname')) {
    return lastName;
  }
  if (query.includes('name') && !query.includes('user')) {
    return fullName || firstName;
  }

  return null;
}

/**
 * Enhanced matcher with type-aware filtering
 */
export async function matchFieldsSmart(
  fields: ScrapedField[],
  profile: UserProfile
): Promise<FieldMatch[]> {
  const matches: FieldMatch[] = [];

  // Phase 1: Type-aware rule matching (high confidence)
  const remainingFields: ScrapedField[] = [];

  for (const field of fields) {
    const query = getFieldQuery(field);
    
    // Try name matching first (common case)
    const nameValue = matchName(query, profile);
    if (nameValue) {
      matches.push({
        field,
        value: nameValue,
        confidence: 0.92,
        method: 'type-rule',
      });
      continue;
    }

    // Try type-aware matching
    const typeMatch = typeAwareMatch(field, profile);
    if (typeMatch) {
      matches.push({
        field,
        value: typeMatch.value,
        confidence: typeMatch.confidence,
        method: 'type-rule',
      });
      continue;
    }

    // Fall through to embedding matching
    remainingFields.push(field);
  }

  // Phase 2: Embedding-based semantic matching for remaining fields
  if (remainingFields.length > 0) {
    const embeddingMatches = await matchWithEmbeddings(remainingFields, profile);
    matches.push(...embeddingMatches);
  }

  return matches;
}

/**
 * Fallback: Embedding-based matching (for non-standard fields)
 */
async function matchWithEmbeddings(
  fields: ScrapedField[],
  profile: UserProfile
): Promise<FieldMatch[]> {
  const matches: FieldMatch[] = [];

  // Build candidate pool
  const candidates: Array<{ text: string; source: string }> = [];

  // Personal
  if (profile.personal) {
    Object.entries(profile.personal).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        candidates.push({ text: value, source: `personal.${key}` });
      }
    });
  }

  // Address
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

  // Custom
  if (profile.custom) {
    Object.entries(profile.custom).forEach(([key, value]) => {
      if (value && typeof value !== 'object') {
        candidates.push({ text: String(value), source: `custom.${key}` });
      }
    });
  }

  if (candidates.length === 0) return matches;

  const fieldQueries = fields.map(getFieldQuery);
  const candidateTexts = candidates.map(c => c.text);

  try {
    const [fieldEmbeds, candidateEmbeds] = await Promise.all([
      embedTexts(fieldQueries),
      embedTexts(candidateTexts),
    ]);

    const THRESHOLD = 0.7;

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const fieldVec = fieldEmbeds[i];

      let bestScore = -Infinity;
      let bestIdx = -1;

      for (let j = 0; j < candidateEmbeds.length; j++) {
        const score = cosineSimilarity(fieldVec, candidateEmbeds[j]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }

      if (bestIdx >= 0 && bestScore >= THRESHOLD) {
        matches.push({
          field,
          value: candidates[bestIdx].text,
          confidence: bestScore,
          method: 'embedding',
        });
      }
    }
  } catch (err) {
    console.error('[smart-matcher] Embedding failed:', err);
  }

  return matches;
}
