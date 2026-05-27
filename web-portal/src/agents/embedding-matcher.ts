/**
 * Embedding-Matcher Portal Agent
 *
 * Computes cosine similarity between field label embeddings and profile key
 * embeddings to find the best match. Uses a local deterministic hash-based
 * embedder (no API keys needed) so it always runs offline.
 *
 * Confidence = cosine similarity score (0–1).
 */

import type { ScrapedForm } from '../types/index';
import type { PortalAgent, FieldFill, FieldFillResult, FlatProfile } from './types';

// ── Local deterministic embedder ──────────────────────────────────────────────
// Produces a fixed-dimension vector from a string using character n-gram hashing.
// Deterministic — same input always gives same output.
// Not semantically accurate but enables cosine similarity comparisons without
// a model download or API call, making it suitable for fast local benchmarking.

const EMBED_DIM = 64;

function localEmbed(text: string): Float32Array {
  const vec = new Float32Array(EMBED_DIM);
  const s = text.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    // Scatter character into the vector using a simple hash
    for (let d = 0; d < EMBED_DIM; d++) {
      vec[d] += Math.sin((code * (d + 1) * 31 + i * 7) / 100);
    }
  }
  // Normalise
  const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1;
  for (let d = 0; d < EMBED_DIM; d++) vec[d] /= norm;
  return vec;
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  // Vectors are already normalised — dot product IS cosine similarity
  return Math.max(0, Math.min(1, dot));
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export class EmbeddingMatcherAgent implements PortalAgent {
  readonly name = 'embedding-matcher' as const;
  private readonly CONFIDENCE_THRESHOLD = 0.55;

  async fill(form: ScrapedForm, profile: FlatProfile): Promise<FieldFillResult> {
    // Pre-compute profile key embeddings (key + value text)
    const profileEntries = Object.entries(profile).filter(([k]) => !k.includes('['));
    const profileEmbeds = profileEntries.map(([key, val]) => ({
      key,
      value: val,
      embed: localEmbed(`${key.replace(/[._]/g, ' ')} ${val}`),
    }));

    const fills: FieldFill[] = form.fields.map(field => {
      const fieldText = [field.label, field.name, field.placeholder, field.id]
        .filter(Boolean)
        .join(' ');
      const fieldEmbed = localEmbed(fieldText);

      let bestSim = 0;
      let bestKey = '';
      let bestValue = '';

      for (const { key, value, embed } of profileEmbeds) {
        const sim = cosineSimilarity(fieldEmbed, embed);
        if (sim > bestSim) {
          bestSim = sim;
          bestKey = key;
          bestValue = value;
        }
      }

      const matched = bestSim >= this.CONFIDENCE_THRESHOLD;
      return {
        fieldId: field.id,
        label: field.label,
        type: field.type,
        value: matched ? bestValue : undefined,
        matchedProfileKey: matched ? bestKey : undefined,
        confidence: bestSim,
      };
    });

    return { fills };
  }
}
