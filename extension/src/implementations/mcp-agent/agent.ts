import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';

export interface MCPTelemetry {
  tokensIn: number;
  tokensOut: number;
  llmTimeMs: number;
  llmCalls: number;
}

export class MCPAgent implements BenchmarkAgent {
  name = 'mcp-agent';
  private client;
  private model: string;
  public lastTelemetry: MCPTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
  }

  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[MCP Agent] Starting iterative execution for ${instance.formName}`);
    this.lastTelemetry = { tokensIn: 0, tokensOut: 0, llmTimeMs: 0, llmCalls: 0 };

    const messages: any[] = [{
      role: 'system',
      content: `You are a browser automation agent.
Your task is to fill the form based on this document:
---
${instance.inputDocument}
---
You will receive the current DOM state (interactable fields with their type and label).
You must output a JSON array of actions — no prose, no markdown, ONLY the JSON array:
[{ "action": "type", "selector": "#field_id", "value": "John" }, { "action": "finish" }]
Supported actions: type (fill text), click (click element), select (pick dropdown option by label), check (toggle checkbox), finish (stop iteration).
Only use CSS selectors provided in the DOM state.`
    }];

    for (let i = 0; i < 10; i++) {
      const domState = await this.getDomState(page);
      messages.push({ role: 'user', content: `Current DOM state:\n${domState}\n\nOutput ONLY a JSON array of actions.` });

      try {
        const options: any = {
          model: this.model,
          messages,
          temperature: 0,
          ...(process.env.LLM_PROVIDER === 'openai'
            ? { response_format: { type: 'json_object' } }
            : { format: 'json' }),
        };

        const t0 = Date.now();
        const response = await this.client.chat.completions.create(options);
        this.lastTelemetry.llmTimeMs += Date.now() - t0;
        this.lastTelemetry.llmCalls += 1;
        this.lastTelemetry.tokensIn += response.usage?.prompt_tokens ?? 0;
        this.lastTelemetry.tokensOut += response.usage?.completion_tokens ?? 0;

        const reply = response.choices[0]?.message?.content || '[]';
        messages.push({ role: 'assistant', content: reply });

        // Extract JSON array — handle both bare array and object-wrapped
        let parsed: any;
        const cleaned = reply.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
        try {
          parsed = JSON.parse(cleaned);
          // If Ollama wraps in {"actions": [...]} unwrap it
          if (!Array.isArray(parsed) && Array.isArray(parsed.actions)) {
            parsed = parsed.actions;
          }
        } catch {
          // Try to extract array from inside a JSON object
          const match = cleaned.match(/\[[\s\S]*\]/);
          if (match) parsed = JSON.parse(match[0]);
          else throw new Error(`Cannot parse LLM output as action array: ${cleaned.slice(0, 200)}`);
        }

        let finished = false;
        for (const act of parsed) {
          console.log(`[MCP Agent] Executing:`, act);
          if (act.action === 'finish') { finished = true; break; }
          if (act.action === 'type' && act.selector && act.value !== undefined) {
            await page.fill(act.selector, String(act.value)).catch(() => {});
          } else if (act.action === 'click' && act.selector) {
            await page.click(act.selector).catch(() => {});
          } else if (act.action === 'select' && act.selector && act.value) {
            await page.selectOption(act.selector, { label: String(act.value) }).catch(() => {});
          } else if (act.action === 'check' && act.selector) {
            await page.check(act.selector).catch(() => {});
          }
        }
        if (finished) break;
      } catch (err) {
        console.error(`[MCP Agent] Turn ${i + 1} failed: ${(err as Error).message}`);
        break;
      }
    }

    console.log(`[MCP Agent] Finished. LLM calls: ${this.lastTelemetry.llmCalls}, tokens in: ${this.lastTelemetry.tokensIn}`);
  }

  private async getDomState(page: Page): Promise<string> {
    return page.evaluate(() => {
      const els = document.querySelectorAll('input, select, textarea');
      return Array.from(els).map(el => {
        const inp = el as HTMLInputElement;
        if (inp.type === 'hidden' || inp.type === 'submit' || inp.type === 'button') return null;
        const id = el.id ? `#${el.id}` : '';
        const nameAttr = inp.name ? `[name="${inp.name}"]` : '';
        const selector = id || nameAttr || el.tagName.toLowerCase();
        let label = '';
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) label = lbl.textContent?.trim() || '';
        }
        // For select, include options
        let options = '';
        if (el.tagName === 'SELECT') {
          const opts = Array.from((el as HTMLSelectElement).options).map(o => o.label).join(', ');
          options = ` | Options: [${opts}]`;
        }
        const type = inp.type || el.tagName.toLowerCase();
        return `${el.tagName}[${type}] | Selector: ${selector} | Label: "${label}"${options}`;
      }).filter(Boolean).join('\n');
    });
  }
}
