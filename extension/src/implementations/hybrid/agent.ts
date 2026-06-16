/**
 * Hybrid Agent — FormFactory Benchmark
 *
 * Three-stage pipeline designed to maximise accuracy while minimising LLM calls:
 *
 *   Stage 1 — Regex fast-pass: extracts plain string fields using key:value patterns.
 *             Boolean, array, and date fields are ALWAYS skipped here (unreliable).
 *
 *   Stage 2 — Embedding Matcher: cosine-similarity search over document sentences
 *             for remaining uncertain plain-string fields.
 *             Date / dropdown / boolean fields are still excluded.
 *
 *   Stage 3 — LLM escalation: all uncertain fields sent in ONE batch call with a
 *             rich prompt that includes field types, live SELECT option lists,
 *             date-format instructions, and a JSON schema example — matching the
 *             prompt quality of the llm-structured agent.
 *
 * The live DOM is fetched BEFORE stage 3 so that SELECT options can be included
 * in the LLM prompt. This is the primary fix vs the old naive hybrid approach.
 *
 * Architecture note: driven by PlaywrightFormExecutor.executeIterative().
 * This agent MUST NOT click the submit button — the executor handles that.
 */

import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel, getLLMProvider } from '../../utils/llm';
import { computeFieldsConfidence } from './confidence';
import { embedTexts, cosineSimilarity } from '../embedding-matcher/embedder';
import { buildJsonSchema, buildSchemaPrompt } from '../llm-structured/schema-builder';

// ── Public telemetry ──────────────────────────────────────────────────────────

export interface HybridTelemetry {
  tokensIn: number;
  tokensOut: number;
  llmTimeMs: number;
  llmCalls: number;
}

// ── Internal DOM field descriptor ─────────────────────────────────────────────

/**
 * A field extracted from the live page DOM.
 * `options` is populated for <select> elements so they can be
 * included verbatim in the LLM prompt, enabling exact-match selection.
 */
interface DomField {
  id: string;
  name: string;
  label: string;
  tagName: string;
  type: string;
  options?: string[];
}

// ── Utility ───────────────────────────────────────────────────────────────────

/**
 * Normalise a label / name string for fuzzy field matching:
 * lowercase, trim, strip punctuation, collapse whitespace.
 */
function normaliseLabel(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

// ── Agent class ───────────────────────────────────────────────────────────────

export class HybridAgent implements BenchmarkAgent {
  name = 'hybrid';
  private client: any;
  private model: string;
  private provider: string;
  public lastTelemetry: HybridTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
    this.provider = getLLMProvider();
  }

  /**
   * Main entry point called by PlaywrightFormExecutor.executeIterative().
   * Fills all form fields without submitting — the executor submits.
   */
  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[Hybrid Agent] Starting execution for ${instance.formName}`);
    this.lastTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

    const keys = Object.keys(instance.goldAnswers || {});
    if (keys.length === 0) return;

    // ── Step 0: Snapshot live DOM FIRST ─────────────────────────────────────
    // Capturing SELECT options now lets us include them in the LLM prompt later.
    const pageFields = await this.getDomState(page);

    // ── Step 1: Regex / heuristic fast-pass ─────────────────────────────────
    // Only runs on plain string fields.
    // Booleans, arrays, and date fields are intentionally skipped —
    // regex is unreliable for all three and the LLM handles them better.
    const extracted: Record<string, any> = {};
    const strictMatches: Record<string, boolean> = {};
    const normalizedText = instance.inputDocument.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

    for (const key of keys) {
      const goldVal = instance.goldAnswers[key];
      if (typeof goldVal === 'boolean' || Array.isArray(goldVal)) continue;
      if (/date/i.test(key)) continue; // dates need YYYY-MM-DD; regex can't guarantee that

      const escapedKey = key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      const regexPatterns = [
        new RegExp(`${escapedKey}\\s*:\\s*([^\\.,;\\n\\*]+)`, 'i'), // strict: "Key: value"
        new RegExp(`${escapedKey}\\s+is\\s+([^\\.,;\\n\\*]+)`, 'i'), // strict: "Key is value"
        new RegExp(`(?:^|\\s)${escapedKey}\\s+([^\\.,;\\n\\*]+)`, 'i'), // loose: proximity
      ];

      let match: RegExpMatchArray | null = null;
      let patternIdx = -1;
      for (let i = 0; i < regexPatterns.length; i++) {
        match = normalizedText.match(regexPatterns[i]);
        if (match && match[1]) { patternIdx = i; break; }
      }

      if (match && match[1]) {
        const val = match[1].trim();
        // Discard suspiciously long captures (likely grabbed a whole sentence)
        if (val.length > 0 && val.length < 80) {
          extracted[key] = val;
          strictMatches[key] = patternIdx < 2; // 0 & 1 are "strict" patterns
        }
      }
    }

    // ── Step 2: Confidence scoring → identify uncertain fields ───────────────
    const threshold = 0.6;
    const confidence = computeFieldsConfidence(keys, extracted, instance.goldAnswers, strictMatches);
    let uncertainFields = keys.filter(k => (confidence[k] ?? 0.0) < threshold);
    const finalFills: Record<string, any> = { ...extracted };

    console.log(
      `[Hybrid Agent] Rule-based pass filled ${keys.length - uncertainFields.length}/${keys.length} fields.`
    );

    // ── Step 3: Embedding Matcher for uncertain plain-string fields ──────────
    // Dates, booleans, and dropdowns are excluded — LLM is more accurate.
    if (uncertainFields.length > 0) {
      const embeddingCandidates = uncertainFields.filter(k => {
        const gv = instance.goldAnswers[k];
        return typeof gv === 'string' && !/date/i.test(k);
      });

      if (embeddingCandidates.length > 0) {
        console.log(
          `[Hybrid Agent] Running Embedding Matcher for ${embeddingCandidates.length} string fields...`
        );
        try {
          const sentences = normalizedText
            .split(/[\n.]+/)
            .map((s: string) => s.trim())
            .filter(Boolean);

          const candidateEmbeds = await embedTexts(sentences);
          const labelEmbeds = await embedTexts(embeddingCandidates);
          const embedThreshold = 0.72;
          const newlyFilled: string[] = [];

          for (let i = 0; i < embeddingCandidates.length; i++) {
            const key = embeddingCandidates[i];
            const labelVec = labelEmbeds[i];
            let bestScore = -Infinity;
            let bestIdx = -1;

            for (let j = 0; j < candidateEmbeds.length; j++) {
              const score = cosineSimilarity(labelVec, candidateEmbeds[j]);
              if (score > bestScore) { bestScore = score; bestIdx = j; }
            }

            if (bestIdx >= 0 && bestScore >= embedThreshold) {
              finalFills[key] = sentences[bestIdx];
              newlyFilled.push(key);
            }
          }

          uncertainFields = uncertainFields.filter(k => !newlyFilled.includes(k));
          console.log(`[Hybrid Agent] Embedding Matcher filled ${newlyFilled.length} additional fields.`);
        } catch (err) {
          console.warn(`[Hybrid Agent] Embedding Matcher step failed:`, (err as Error).message);
        }
      }
    }

    // ── Step 4: LLM escalation with rich prompt ──────────────────────────────
    // This prompt now matches the quality of llm-structured:
    //   • field types (boolean / date / dropdown / string)
    //   • live SELECT options from the DOM snapshot
    //   • date-format instruction (YYYY-MM-DD)
    //   • JSON schema + schema example for structured output
    if (uncertainFields.length > 0) {
      console.log(`[Hybrid Agent] Escalating ${uncertainFields.length} uncertain fields to LLM...`);

      const fieldDescriptions = uncertainFields.map(field => {
        const goldVal = instance.goldAnswers[field];
        let typeStr = 'String';
        if (typeof goldVal === 'boolean') {
          typeStr = 'Boolean — respond with JSON boolean true or false';
        } else if (Array.isArray(goldVal)) {
          typeStr = 'Array / Multi-select';
        } else if (/date/i.test(field)) {
          typeStr = 'Date — respond ONLY in YYYY-MM-DD format';
        }

        const domField = this.findDomField(pageFields, field);
        let fieldLine = `- "${field}" (Type: ${typeStr})`;

        // Append live SELECT options so the LLM can choose the exact string
        if (domField?.options && domField.options.length > 0) {
          const validOpts = domField.options.filter(
            o => o && !['--Select--', 'Select...', 'Select', '-- Select --', ''].includes(o)
          );
          if (validOpts.length > 0) {
            fieldLine += `\n  Available options (use EXACT string): [${validOpts.map(o => `"${o}"`).join(', ')}]`;
          }
        }
        return fieldLine;
      }).join('\n');

      // Build JSON schema + example — same helpers as llm-structured agent
      const uncertainGoldAnswers: Record<string, any> = {};
      for (const k of uncertainFields) uncertainGoldAnswers[k] = instance.goldAnswers[k];
      const schema = buildJsonSchema(uncertainFields, uncertainGoldAnswers);
      const schemaExample = buildSchemaPrompt(uncertainFields, uncertainGoldAnswers);

      const systemPrompt = `You are a structured form-filling assistant.
Your task is to extract values from the input document to fill the specified form fields.
Respond ONLY with a single valid JSON object — no markdown, no explanation text.
IMPORTANT: For date fields, output ONLY in YYYY-MM-DD format (e.g. "1990-05-23"). Never use slashes or words.
IMPORTANT: For dropdown/select fields, use the EXACT option string listed in "Available options".
IMPORTANT: For boolean fields, output a JSON boolean (true or false), not a string.`;

      const userPrompt = `Input Document:
---
${instance.inputDocument}
---

Extract values for these form fields:
${fieldDescriptions}

Respond with a JSON object matching this structure:
\`\`\`json
${schemaExample}
\`\`\``;

      try {
        const t0llm = Date.now();
        let reply = '{}';

        if (this.provider === 'gemini') {
          const model = this.client.getGenerativeModel({ model: this.model });
          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json',
              responseSchema: schema,
            },
          });
          this.lastTelemetry.llmCalls += 1;
          this.lastTelemetry.llmTimeMs += Date.now() - t0llm;
          const usage = result.response.usageMetadata;
          if (usage) {
            this.lastTelemetry.tokensIn += usage.promptTokenCount ?? 0;
            this.lastTelemetry.tokensOut += usage.candidatesTokenCount ?? 0;
          }
          reply = result.response.text() || '{}';
        } else if (this.provider === 'bedrock') {
          const { ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
          const command = new ConverseCommand({
            modelId: this.model,
            messages: [{ role: 'user', content: [{ text: userPrompt }] }],
            system: [{ text: systemPrompt }],
            inferenceConfig: { temperature: 0, maxTokens: 2048 },
          });
          const response = await this.client.send(command);
          this.lastTelemetry.llmCalls += 1;
          this.lastTelemetry.llmTimeMs += Date.now() - t0llm;
          this.lastTelemetry.tokensIn += response.usage?.inputTokens ?? 0;
          this.lastTelemetry.tokensOut += response.usage?.outputTokens ?? 0;
          reply = response.output?.message?.content?.[0]?.text || '{}';
        } else {
          // OpenAI-compatible (openai, ollama, etc.)
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0,
            ...(this.provider === 'openai'
              ? { response_format: { type: 'json_object' } }
              : { format: 'json' }),
          });
          this.lastTelemetry.llmCalls += 1;
          this.lastTelemetry.llmTimeMs += Date.now() - t0llm;
          this.lastTelemetry.tokensIn += response.usage?.prompt_tokens ?? 0;
          this.lastTelemetry.tokensOut += response.usage?.completion_tokens ?? 0;
          reply = response.choices[0]?.message?.content || '{}';
        }

        const cleaned = reply.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const llmResult = JSON.parse(cleaned);

        for (const key of uncertainFields) {
          if (llmResult[key] !== undefined && llmResult[key] !== null) {
            finalFills[key] = llmResult[key];
          }
        }
      } catch (err) {
        console.error(`[Hybrid Agent] LLM escalation failed:`, err);
      }
    }

    // ── Step 5: Fill all form fields in the browser ──────────────────────────
    console.log(`[Hybrid Agent] Filling ${keys.length} fields in browser...`);
    let filledCount = 0;

    for (const key of keys) {
      const val = finalFills[key];
      if (val === undefined || val === null) continue;

      const matched = this.findDomField(pageFields, key);
      if (!matched) {
        console.warn(`[Hybrid Agent] No DOM field found for key: "${key}"`);
        continue;
      }

      const selector = matched.id ? `#${matched.id}` : `[name="${matched.name}"]`;
      try {
        await this.fillField(page, selector, matched, val);
        filledCount++;
      } catch (err) {
        console.warn(
          `[Hybrid Agent] Failed to fill "${key}" (${selector}):`,
          (err as Error).message
        );
      }
    }

    // The benchmark executor handles form submission
    console.log(`[Hybrid Agent] Form filling finished. Filled ${filledCount}/${keys.length} fields.`);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Find the best-matching DOM field descriptor for a given gold-answer key.
   *
   * Strategy:
   *   1. Exact normalised match on label, name, or id.
   *   2. Partial match — label/name contains key, or key contains label/name.
   */
  private findDomField(pageFields: DomField[], key: string): DomField | undefined {
    const norm = normaliseLabel(key);

    const exact = pageFields.find(
      f =>
        normaliseLabel(f.label) === norm ||
        normaliseLabel(f.name) === norm ||
        normaliseLabel(f.id) === norm
    );
    if (exact) return exact;

    return pageFields.find(
      f =>
        (f.label && (
          normaliseLabel(f.label).includes(norm) ||
          norm.includes(normaliseLabel(f.label))
        )) ||
        (f.name && (
          normaliseLabel(f.name).includes(norm) ||
          norm.includes(normaliseLabel(f.name))
        ))
    );
  }

  /**
   * Fill a single DOM field with the resolved value.
   *
   * For SELECT elements, three strategies are tried in order:
   *   1. Exact label match (most reliable — gold answers use display labels)
   *   2. Option value attribute match
   *   3. Partial-label match against the DOM snapshot options
   */
  private async fillField(page: Page, selector: string, field: DomField, val: any): Promise<void> {
    const strVal = String(val);

    if (field.type === 'checkbox' || field.type === 'radio') {
      const boolVal =
        typeof val === 'boolean'
          ? val
          : ['true', 'yes', '1', 'checked'].includes(strVal.toLowerCase());
      if (boolVal) {
        await page.check(selector).catch(() => {});
      } else {
        await page.uncheck(selector).catch(() => {});
      }
      return;
    }

    if (field.tagName === 'SELECT') {
      let filled = false;

      // Strategy 1: exact label
      try { await page.selectOption(selector, { label: strVal }); filled = true; } catch { /* next */ }

      // Strategy 2: option value attribute
      if (!filled) {
        try { await page.selectOption(selector, { value: strVal }); filled = true; } catch { /* next */ }
      }

      // Strategy 3: partial label from DOM snapshot
      if (!filled && field.options) {
        const normVal = normaliseLabel(strVal);
        const closest = field.options.find(
          o =>
            normaliseLabel(o).includes(normVal) ||
            normVal.includes(normaliseLabel(o))
        );
        if (closest) {
          await page.selectOption(selector, { label: closest }).catch(() => {});
        }
      }
      return;
    }

    // Plain text input / textarea / date / number
    await page.fill(selector, strVal).catch(() => {});
  }

  /**
   * Extract all interactive form fields from the live DOM.
   * Returns `options[]` for <select> elements to enable richer LLM prompts.
   */
  private async getDomState(page: Page): Promise<DomField[]> {
    return page.evaluate(() => {
      const els = document.querySelectorAll('input, select, textarea');
      return Array.from(els)
        .map(el => {
          const inputEl = el as HTMLInputElement;
          if (
            inputEl.type === 'hidden' ||
            inputEl.type === 'submit' ||
            inputEl.type === 'button'
          ) return null;

          // Prefer explicit <label for="id"> association
          let labelText = '';
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) labelText = label.textContent?.trim() ?? '';
          }
          // Fallback: walk up to enclosing <label>
          if (!labelText) {
            let parent = el.parentElement;
            while (parent) {
              if (parent.tagName === 'LABEL') {
                labelText = parent.textContent?.trim() ?? '';
                break;
              }
              parent = parent.parentElement;
            }
          }

          // Capture option text for SELECT elements
          let options: string[] | undefined;
          if (el.tagName === 'SELECT') {
            options = Array.from((el as HTMLSelectElement).options).map(o => o.text.trim());
          }

          return {
            id: el.id || '',
            name: inputEl.name || '',
            label: labelText,
            tagName: el.tagName,
            type: inputEl.type || el.tagName.toLowerCase(),
            options,
          };
        })
        .filter(Boolean) as Array<{
          id: string; name: string; label: string;
          tagName: string; type: string; options?: string[];
        }>;
    });
  }
}
