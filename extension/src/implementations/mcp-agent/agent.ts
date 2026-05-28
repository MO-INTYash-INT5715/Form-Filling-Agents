import type { Page } from 'playwright';
import type { FormInstance, BenchmarkAgent } from '../../benchmark/types';
import { getLLMClient, getLLMModel } from '../../utils/llm';

export interface MCPTelemetry {
  tokensIn: number;
  tokensOut: number;
  llmTimeMs: number;
  llmCalls: number;
}

// ── JSON repair helpers ────────────────────────────────────────────────────────

/** Strip control characters that break JSON.parse */
function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
}

/** Strip JS-style line comments from a JSON-like string */
function stripLineComments(s: string): string {
  return s.replace(/\/\/[^\n]*/g, '');
}

/** Best-effort JSON parse with multi-stage repair */
function robustParse(raw: string): any {
  const stages = [
    raw,
    raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim(),
    stripLineComments(raw).trim(),
    stripControlChars(raw).trim(),
    stripControlChars(stripLineComments(raw)).trim(),
  ];

  for (const s of stages) {
    try { return JSON.parse(s); } catch { /* try next */ }
    // try extracting a JSON array from inside a larger blob
    const m = s.match(/\[[\s\S]*\]/);
    if (m) try { return JSON.parse(m[0]); } catch { /* try next */ }
  }
  throw new Error(`Cannot parse LLM output: ${raw.slice(0, 300)}`);
}

// ── Date normalisation ─────────────────────────────────────────────────────────

/** Try to convert any date-like string to YYYY-MM-DD */
function normalizeDate(value: string): string {
  if (!value) return value;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  // YYYY/MM/DD → YYYY-MM-DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(value)) return value.replace(/\//g, '-');
  // MM/DD/YYYY or MM-DD-YYYY
  const mdy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
  // DD/MM/YYYY — ambiguous, but try
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // Natural language via Date constructor
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return value; // give up, pass as-is
}

// ── Fuzzy dropdown matcher ─────────────────────────────────────────────────────

/** Pick the best matching option label for a desired value */
async function selectFuzzy(page: Page, selector: string, desired: string): Promise<void> {
  const options: string[] = await page.evaluate((sel) => {
    const el = document.querySelector(sel) as HTMLSelectElement | null;
    if (!el) return [];
    return Array.from(el.options).map(o => o.label);
  }, selector);

  if (!options.length) return;

  // 1. Exact
  if (options.includes(desired)) {
    await page.selectOption(selector, { label: desired }).catch(() => {});
    return;
  }

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const desiredNorm = norm(desired);

  // 2. Case-insensitive / punctuation-stripped exact
  const exact = options.find(o => norm(o) === desiredNorm);
  if (exact) { await page.selectOption(selector, { label: exact }).catch(() => {}); return; }

  // 3. Starts-with
  const startsWith = options.find(o => norm(o).startsWith(desiredNorm) || desiredNorm.startsWith(norm(o)));
  if (startsWith) { await page.selectOption(selector, { label: startsWith }).catch(() => {}); return; }

  // 4. Contains
  const contains = options.find(o => norm(o).includes(desiredNorm) || desiredNorm.includes(norm(o)));
  if (contains) { await page.selectOption(selector, { label: contains }).catch(() => {}); return; }

  // 5. Try value= as fallback
  await page.selectOption(selector, { value: desired }).catch(() => {});
}

// ── Agent ──────────────────────────────────────────────────────────────────────

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
You must output a JSON array of actions — no prose, no markdown, no comments, ONLY valid JSON:
[{ "action": "type", "selector": "#field_id", "value": "John" }, { "action": "finish" }]
Supported actions: type (fill text), click (click element), select (pick dropdown option by EXACT label from the options list), check (toggle checkbox), finish (stop iteration).
IMPORTANT: For date fields, ALWAYS use YYYY-MM-DD format (e.g. "1990-05-23").
IMPORTANT: For select/dropdown, use the EXACT option label string from the Options list provided.
Only use CSS selectors provided in the DOM state.`
    }];

    for (let i = 0; i < 10; i++) {
      const domState = await this.getDomState(page);
      messages.push({ role: 'user', content: `Current DOM state:\n${domState}\n\nOutput ONLY a valid JSON array of actions. No comments, no markdown.` });

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

        let parsed: any = robustParse(reply);
        // Unwrap {actions: [...]} envelope
        if (!Array.isArray(parsed) && Array.isArray(parsed?.actions)) parsed = parsed.actions;
        if (!Array.isArray(parsed)) throw new Error(`Expected array, got: ${typeof parsed}`);

        let finished = false;
        for (const act of parsed) {
          console.log(`[MCP Agent] Executing:`, act);
          if (act.action === 'finish') { finished = true; break; }

          const sel: string = act.selector;
          const val: string = String(act.value ?? '');

          // Detect the actual element type to fix model action mistakes
          const elInfo: { type: string; tag: string } = await page.evaluate((s) => {
            const el = document.querySelector(s) as HTMLInputElement | null;
            return el ? { type: el.type ?? '', tag: el.tagName.toLowerCase() } : { type: '', tag: '' };
          }, sel).catch(() => ({ type: '', tag: '' }));

          // Model sometimes emits "click" for date/text fields — coerce to type
          const effectiveAction = (act.action === 'click' && (elInfo.type === 'date' || elInfo.type === 'text' || elInfo.tag === 'textarea'))
            ? 'type' : act.action;

          if (effectiveAction === 'type' && sel) {
            const finalVal = elInfo.type === 'date' ? normalizeDate(val) : val;
            await page.fill(sel, finalVal).catch(() => {});

          } else if (effectiveAction === 'select' || (act.action === 'select' && sel)) {
            await selectFuzzy(page, sel, val);

          } else if (effectiveAction === 'click' && sel) {
            await page.click(sel).catch(() => {});

          } else if (act.action === 'check' && sel) {
            await page.check(sel).catch(() => {});
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
        let options = '';
        if (el.tagName === 'SELECT') {
          const sel = el as HTMLSelectElement;
          const opts = sel.options ? Array.from(sel.options)
            .filter((o: HTMLOptionElement) => o.value !== '')
            .map((o: HTMLOptionElement) => o.label)
            .join(', ') : '';
          options = ` | Options: [${opts}]`;
        }
        const type = inp.type || el.tagName.toLowerCase();
        return `${el.tagName}[${type}] | Selector: ${selector} | Label: "${label}"${options}`;
      }).filter(Boolean).join('\n');
    });
  }

  async fillForm(instance: FormInstance, page: Page): Promise<void> {
    return this.runIterative(instance, page);
  }
}
