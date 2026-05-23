import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';

export class MCPAgent implements BenchmarkAgent {
  name = 'mcp-agent';
  private client;
  private model: string;

  constructor() {
    this.client = getLLMClient();
    this.model = getLLMModel();
  }

  async runIterative(instance: FormInstance, page: Page): Promise<void> {
    console.log(`[MCP Agent] Starting iterative execution for ${instance.formName}`);
    
    let messages: any[] = [{
      role: 'system',
      content: `You are a browser automation agent.
Your task is to fill the form based on this document:
---
${instance.inputDocument}
---
You will receive the current DOM state (interactable fields).
You must output a JSON array of actions:
[{ "action": "type", "selector": "#name", "value": "John" }, { "action": "finish" }]
Only use CSS selectors provided in the DOM state.`
    }];

    for (let i = 0; i < 10; i++) { // Max 10 turns
      const domState = await this.getDomState(page);
      messages.push({ role: 'user', content: `Current DOM state:\n${domState}` });

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: 0
      });

      const reply = response.choices[0]?.message?.content || '[]';
      messages.push({ role: 'assistant', content: reply });

      try {
        const cleaned = reply.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        const actions = JSON.parse(cleaned);

        let finished = false;
        for (const act of actions) {
          console.log(`[MCP Agent] Executing:`, act);
          if (act.action === 'finish') {
            finished = true;
            break;
          }
          if (act.action === 'type' && act.selector && act.value) {
            await page.fill(act.selector, act.value).catch(() => {});
          } else if (act.action === 'click' && act.selector) {
            await page.click(act.selector).catch(() => {});
          } else if (act.action === 'select' && act.selector && act.value) {
            await page.selectOption(act.selector, { label: act.value }).catch(() => {});
          }
        }
        if (finished) break;
      } catch (err) {
        console.error(`[MCP Agent] Failed to parse/execute actions: ${(err as Error).message}`);
      }
    }
    
    console.log(`[MCP Agent] Finished iteration.`);
  }

  private async getDomState(page: Page): Promise<string> {
    return page.evaluate(() => {
      const els = document.querySelectorAll('input, select, textarea, button');
      return Array.from(els).map(el => {
        const id = el.id ? `#${el.id}` : '';
        const name = (el as any).name ? `[name="${(el as any).name}"]` : '';
        const selector = id || name || el.tagName.toLowerCase();
        let label = '';
        if (el.id) {
          const lbl = document.querySelector(`label[for="${el.id}"]`);
          if (lbl) label = lbl.textContent?.trim() || '';
        }
        return `Element: ${el.tagName} | Selector: ${selector} | Label: ${label}`;
      }).join('\n');
    });
  }
}
