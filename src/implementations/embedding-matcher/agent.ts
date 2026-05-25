import type { FormInstance, AgentAction, BenchmarkAgent } from '../../benchmark/types';
import { embedTexts, cosineSimilarity } from './embedder';
import { extractFields } from '../rule-based/patterns';

/**
 * Embedding-based semantic matcher agent (IMPL-2)
 * Maps field labels to candidate strings from the input document using embeddings.
 */
export class EmbeddingMatcherAgent implements BenchmarkAgent {
  name = 'embedding-matcher';

  async planActions(instance: FormInstance): Promise<AgentAction[]> {
    const actions: AgentAction[] = [];
    const keys = Object.keys(instance.goldAnswers || {});
    if (keys.length === 0) return actions;

    const extracted = extractFields(instance.formId, instance.inputDocument, keys);

    // Short candidate pool: rule-based extracts + sentence-level candidates
    const sentences = instance.inputDocument
      .split(/[\n\.]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 50);

    const candidatesSet = new Set<string>();
    const candidatesByKey: Record<string, string[]> = {};

    for (const k of keys) {
      const v = extracted[k];
      const arr: string[] = [];
      if (v !== undefined) {
        if (Array.isArray(v)) arr.push(...v.map(String));
        else arr.push(String(v));
      }
      // add a few sentence candidates
      arr.push(...sentences.slice(0, 5));
      candidatesByKey[k] = arr;
      arr.forEach(x => candidatesSet.add(x));
    }

    const uniqueCandidates = Array.from(candidatesSet);

    // If we have no candidates, fall back to using sentences as global candidates
    if (uniqueCandidates.length === 0) {
      uniqueCandidates.push(...sentences.slice(0, 20));
    }

    // Compute embeddings for labels and candidates
    const labelEmbeds = await embedTexts(keys.map(k => k));
    const candidateEmbeds = await embedTexts(uniqueCandidates);

    const threshold = 0.70;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const labelVec = labelEmbeds[i];
      let bestScore = -Infinity;
      let bestIdx = -1;
      for (let j = 0; j < candidateEmbeds.length; j++) {
        const score = cosineSimilarity(labelVec, candidateEmbeds[j]);
        if (score > bestScore) {
          bestScore = score;
          bestIdx = j;
        }
      }

      if (bestIdx >= 0 && bestScore >= threshold) {
        const chosen = uniqueCandidates[bestIdx];
        // Simple boolean normalization
        const lc = chosen.toLowerCase();
        if (lc === 'true' || lc === 'yes' || lc === 'y') {
          actions.push({ type: 'check', fieldId: key, confidence: bestScore });
        } else {
          actions.push({ type: 'type', fieldId: key, text: chosen, confidence: bestScore });
        }
      } else {
        // fallback to rule-based extracted value
        const fb = extracted[key];
        if (fb !== undefined) {
          if (Array.isArray(fb)) {
            for (const v of fb) actions.push({ type: 'select', fieldId: key, text: String(v) });
          } else if (typeof fb === 'boolean' || String(fb).toLowerCase() === 'true' || String(fb).toLowerCase() === 'yes') {
            actions.push({ type: 'check', fieldId: key });
          } else {
            actions.push({ type: 'type', fieldId: key, text: String(fb) });
          }
        }
      }
    }

    return actions;
  }
}

export default EmbeddingMatcherAgent;
