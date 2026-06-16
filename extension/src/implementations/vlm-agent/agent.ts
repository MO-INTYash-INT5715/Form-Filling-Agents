import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel, getLLMProvider } from '../../utils/llm';
import { captureViewportBase64 } from './screenshot';
import { injectRuler, removeRuler } from './ruler';

export interface VLMAgentConfig {
  useRuler?: boolean;
}

export class VLMAgent implements BenchmarkAgent {
  name = 'vlm-agent';
  private client: any;
  private model: string;
  private provider: string;
  private useRuler: boolean;

  constructor(config: VLMAgentConfig = {}) {
    this.client = getLLMClient();
    this.model = getLLMModel();
    this.provider = getLLMProvider();
    this.useRuler = config.useRuler !== false;
  }

  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[VLM Agent] Starting execution for ${instance.formName}`);
    let turn = 0;
    let isComplete = false;

    while (turn < 3 && !isComplete) {
      turn++;
      console.log(`[VLM Agent] Turn ${turn}...`);

      if (this.useRuler) {
        await injectRuler(page);
        await page.waitForTimeout(100);
      }

      const base64Image = await captureViewportBase64(page);

      if (this.useRuler) {
        await removeRuler(page);
      }

      const domState = await this.getDomState(page);

      const systemPrompt = `You are a visual web automation assistant.
Your task is to fill the form in the screenshot based on the provided input document.
You are given the list of interactable input elements in the DOM.
You must output a JSON object containing two properties:
1. "fills": an array of field fill operations:
   [
     { "selector": "#name_id", "type": "type"|"select"|"check", "value": "Extracted Text" }
   ]
2. "action": "submit" | "wait" (choose "submit" if you have filled all relevant fields in the form, otherwise "wait").
Respond ONLY with the JSON object. No markdown, no formatting, no extra text.`;

      const userPrompt = `Input Document:
---
${instance.inputDocument}
---

DOM Input Fields:
${domState}
`;

      try {
        let reply: string;

        if (this.provider === 'gemini') {
          const model = this.client.getGenerativeModel({ model: this.model });
          
          const imagePart = {
            inlineData: {
              data: base64Image,
              mimeType: 'image/jpeg'
            }
          };

          const result = await model.generateContent({
            contents: [{
              role: 'user',
              parts: [
                { text: systemPrompt + '\n\n' + userPrompt },
                imagePart
              ]
            }],
            generationConfig: {
              temperature: 0,
              responseMimeType: 'application/json'
            }
          });

          reply = result.response.text() || '{}';
        } else if (this.provider === 'bedrock') {
          const { ConverseCommand } = await import('@aws-sdk/client-bedrock-runtime');
          const command = new ConverseCommand({
            modelId: this.model,
            messages: [
              {
                role: 'user',
                content: [
                  { text: userPrompt },
                  {
                    image: {
                      format: 'jpeg',
                      source: {
                        bytes: Buffer.from(base64Image, 'base64')
                      }
                    }
                  }
                ]
              }
            ],
            system: [
              { text: systemPrompt }
            ],
            inferenceConfig: {
              temperature: 0,
              maxTokens: 2048,
            }
          });
          const response = await this.client.send(command);
          reply = response.output?.message?.content?.[0]?.text || '{}';
        } else {
          const response = await this.client.chat.completions.create({
            model: this.model,
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: [
                  { type: 'text', text: userPrompt },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:image/jpeg;base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            temperature: 0,
            response_format: { type: 'json_object' }
          });

          reply = response.choices[0]?.message?.content || '{}';
        }

        const cleaned = reply.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        const actionResult = JSON.parse(cleaned);

        console.log(`[VLM Agent] Predicted fills:`, actionResult.fills);
        console.log(`[VLM Agent] Predicted action:`, actionResult.action);

        if (actionResult.fills && Array.isArray(actionResult.fills)) {
          for (const fill of actionResult.fills) {
            try {
              if (fill.type === 'type' && fill.selector && fill.value !== undefined) {
                await page.fill(fill.selector, String(fill.value)).catch(() => {});
              } else if (fill.type === 'select' && fill.selector && fill.value !== undefined) {
                await page.selectOption(fill.selector, { label: String(fill.value) }).catch(() => {});
              } else if (fill.type === 'check' && fill.selector) {
                await page.check(fill.selector).catch(() => {});
              }
            } catch (err) {
              console.warn(`[VLM Agent] Failed to fill field ${fill.selector}:`, err);
            }
          }
        }

        if (actionResult.action === 'submit') {
          isComplete = true;
          console.log(`[VLM Agent] Agent predicted submit. Form filling finished.`);
          break;
        }
      } catch (err) {
        console.error(`[VLM Agent] Failed in turn ${turn}:`, err);
        break;
      }
    }

    console.log(`[VLM Agent] Finished execution.`);
  }

  private async getDomState(page: Page): Promise<string> {
    return page.evaluate(() => {
      const els = document.querySelectorAll('input, select, textarea');
      return Array.from(els)
        .map(el => {
          const inputEl = el as HTMLInputElement;
          if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button') {
            return null;
          }
          const id = el.id ? `#${el.id}` : '';
          const name = inputEl.name ? `[name="${inputEl.name}"]` : '';
          const selector = id || name || el.tagName.toLowerCase();
          
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
          
          let options = '';
          if (el.tagName === 'SELECT') {
            options = ' | Options: ' + Array.from((el as HTMLSelectElement).options).map(o => o.text.trim()).join(', ');
          }

          return `Element: ${el.tagName} | Selector: ${selector} | Label: ${labelText}${options}`;
        })
        .filter(Boolean)
        .join('\n');
    });
  }
}
