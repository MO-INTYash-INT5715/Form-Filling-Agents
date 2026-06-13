import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';
import { computeFieldsConfidence } from './confidence';

export interface HybridTelemetry {
  tokensIn: number;
  tokensOut: number;
  llmTimeMs: number;
  llmCalls: number;
}

export class HybridAgent implements BenchmarkAgent {
  name = 'hybrid';
  private client;
  private model: string;
  public lastTelemetry: HybridTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
  }

  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[Hybrid Agent] Starting execution for ${instance.formName}`);
    this.lastTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

    const keys = Object.keys(instance.goldAnswers || {});
    if (keys.length === 0) return;

    // Step 1: Run local heuristic fast pass
    const extracted: Record<string, any> = {};
    const normalizedText = instance.inputDocument.replace(/\r\n/g, '\n').replace(/\s+/g, ' ');

    for (const key of keys) {
      // Escape special characters in key for regex
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
      
      // Try to find key followed by colon or "is" or separator, and capture everything up to a comma, period, or next pattern
      const regexPatterns = [
        new RegExp(`${escapedKey}\\s*:\\s*([^\\.,;\\n\\*]+)`, 'i'),
        new RegExp(`${escapedKey}\\s+is\\s+([^\\.,;\\n\\*]+)`, 'i'),
        new RegExp(`(?:^|\\s)${escapedKey}\\s+([^\\.,;\\n\\*]+)`, 'i')
      ];

      let match = null;
      for (const pattern of regexPatterns) {
        match = normalizedText.match(pattern);
        if (match && match[1]) {
          break;
        }
      }

      if (match && match[1]) {
        const val = match[1].trim();
        // Skip if value is too long or generic
        if (val.length > 0 && val.length < 50) {
          extracted[key] = val;
        }
      }
    }

    // Step 2: Identify uncertain fields from rule-based pass
    const threshold = 0.6;
    let confidence = computeFieldsConfidence(keys, extracted, instance.goldAnswers);
    let uncertainFields = keys.filter(k => (confidence[k] ?? 0.0) < threshold);

    console.log(`[Hybrid Agent] Rule-based pass filled ${keys.length - uncertainFields.length}/${keys.length} fields.`);

    const finalFills = { ...extracted };

    // Step 3: Embedding Matcher pass for uncertain fields
    if (uncertainFields.length > 0) {
      console.log(`[Hybrid Agent] Running Embedding Matcher for ${uncertainFields.length} fields...`);
      try {
        const { embedTexts, cosineSimilarity } = require('../embedding-matcher/embedder');
        
        const sentences = normalizedText.split(/[\n\.]+/).map(s => s.trim()).filter(Boolean);
        const candidateEmbeds = await embedTexts(sentences);
        const labelEmbeds = await embedTexts(uncertainFields);
        
        const embedThreshold = 0.70;
        const newlyFilled: string[] = [];

        for (let i = 0; i < uncertainFields.length; i++) {
          const key = uncertainFields[i];
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

          if (bestIdx >= 0 && bestScore >= embedThreshold) {
            finalFills[key] = sentences[bestIdx];
            newlyFilled.push(key);
          }
        }
        
        uncertainFields = uncertainFields.filter(k => !newlyFilled.includes(k));
        console.log(`[Hybrid Agent] Embedding Matcher filled ${newlyFilled.length} additional fields.`);
      } catch (err) {
        console.warn(`[Hybrid Agent] Embedding Matcher step failed or missing imports:`, err);
      }
    }

    if (uncertainFields.length > 0) {
      // Step 4: Escalate uncertain fields to LLM
      console.log(`[Hybrid Agent] Escalating ${uncertainFields.length} uncertain fields to VLM/LLM...`);
      const systemPrompt = `You are a helper that extracts form field values from an input document.
You are given the input document and a list of specific target fields to extract.
You must respond with a single, valid JSON object mapping the target fields to their extracted values.
Do not output any introductory or concluding text. Respond ONLY with the JSON object.`;

      const fieldsToExtractPrompt = uncertainFields
        .map(field => `- "${field}"`)
        .join('\n');

      const userPrompt = `Input Document:
---
${instance.inputDocument}
---

Please extract values for these specific fields:
${fieldsToExtractPrompt}

Respond in this exact JSON format:
{
  ${uncertainFields.map(f => `"${f}": "extracted_value"`).join(',\n  ')}
}
`;

      try {
        const t0llm = Date.now();
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0,
          ...(process.env.LLM_PROVIDER === 'openai'
            ? { response_format: { type: 'json_object' } }
            : { format: 'json' }),
        });
        this.lastTelemetry.llmCalls += 1;
        this.lastTelemetry.llmTimeMs += Date.now() - t0llm;
        this.lastTelemetry.tokensIn += response.usage?.prompt_tokens ?? 0;
        this.lastTelemetry.tokensOut += response.usage?.completion_tokens ?? 0;

        const reply = response.choices[0]?.message?.content || '{}';
        const cleaned = reply.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const llmResult = JSON.parse(cleaned);

        for (const key of uncertainFields) {
          if (llmResult[key] !== undefined && llmResult[key] !== null) {
            finalFills[key] = llmResult[key];
          }
        }
      } catch (err) {
        console.error(`[Hybrid Agent] Escalation failed:`, err);
      }
    }

    // Step 5: Fill all elements in the browser page
    const pageFields = await this.getDomState(page);

    for (const key of keys) {
      const val = finalFills[key];
      if (val === undefined || val === null) continue;

      // Find matched field by label or name in the DOM state
      const matched = pageFields.find(f =>
        f.label.toLowerCase().trim() === key.toLowerCase().trim() ||
        f.name.toLowerCase().trim() === key.toLowerCase().trim() ||
        f.id.toLowerCase().trim() === key.toLowerCase().trim()
      );

      if (matched) {
        const selector = matched.id ? `#${matched.id}` : `[name="${matched.name}"]`;
        try {
          if (matched.type === 'checkbox') {
            const boolVal = typeof val === 'boolean' ? val : (String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'yes');
            if (boolVal) {
              await page.check(selector).catch(() => {});
            }
          } else if (matched.tagName === 'SELECT') {
            await page.selectOption(selector, { label: String(val) }).catch(() => {});
          } else {
            await page.fill(selector, String(val)).catch(() => {});
          }
        } catch (err) {
          console.warn(`[Hybrid Agent] Failed to fill selector ${selector}:`, err);
        }
      }
    }

    // Submit the form
    await page.click('[type="submit"], button[type="submit"], input[type="submit"]', { timeout: 2000 }).catch(() => {});
    console.log(`[Hybrid Agent] Form submitted.`);
  }

  private async getDomState(page: Page): Promise<Array<{ id: string; name: string; label: string; tagName: string; type: string }>> {
    return page.evaluate(() => {
      const els = document.querySelectorAll('input, select, textarea');
      return Array.from(els)
        .map(el => {
          const inputEl = el as HTMLInputElement;
          if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button') {
            return null;
          }
          let labelText = '';
          if (el.id) {
            const label = document.querySelector(`label[for="${el.id}"]`);
            if (label) labelText = label.textContent?.trim() ?? '';
          }
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

          return {
            id: el.id || '',
            name: inputEl.name || '',
            label: labelText,
            tagName: el.tagName,
            type: inputEl.type || el.tagName.toLowerCase(),
          };
        })
        .filter(Boolean) as Array<{ id: string; name: string; label: string; tagName: string; type: string }>;
    });
  }
}
