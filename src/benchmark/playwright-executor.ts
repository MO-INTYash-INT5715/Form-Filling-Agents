/**
 * FormFactory Benchmark — Playwright Form Executor
 *
 * Drives a real browser against the live FormFactory Flask server.
 * Replaces PyAutoGUI from the paper with Playwright for programmatic
 * reliability and headless support.
 *
 * Installation:
 *   npm install playwright
 *   npx playwright install chromium
 *
 * Usage pattern (per form instance):
 *   const executor = new PlaywrightFormExecutor(config);
 *   await executor.init();
 *   const result = await executor.execute(formInstance, actionTrace, agentName);
 *   await executor.close();
 */

import type { BenchmarkConfig } from './config';
import type { AgentAction, FormInstance, FormResult, FieldType, FieldResult } from './types';
import {
  calculateValueAccuracy,
  calculateClickAccuracy,
  aggregateAtomicMetrics,
  aggregateEpisodicMetrics,
} from './evaluation';

// Playwright is an optional peer dependency — we import dynamically to avoid
// breaking the TypeScript compilation when it is not yet installed.
let playwright: typeof import('playwright') | null = null;
async function getPlaywright() {
  if (!playwright) {
    try {
      playwright = await import('playwright');
    } catch {
      throw new Error(
        'Playwright is not installed. Run: npm install playwright && npx playwright install chromium'
      );
    }
  }
  return playwright;
}

// ---------------------------------------------------------------------------
// HTML form field introspection helpers
// ---------------------------------------------------------------------------

/**
 * Extracts form fields from the current page DOM via Playwright's evaluate().
 * Returns an array of field descriptors including their bounding boxes.
 */
interface PageField {
  id: string;
  name: string;
  label: string;
  type: string;         // HTML input type
  tagName: string;      // INPUT / SELECT / TEXTAREA
  required: boolean;
  boundingBox: { x: number; y: number; width: number; height: number } | null;
  options?: string[];   // for SELECT elements
}

async function extractPageFields(page: import('playwright').Page): Promise<PageField[]> {
  return page.evaluate(() => {
    const fields: PageField[] = [];
    const elements = document.querySelectorAll('input, select, textarea');

    elements.forEach((el) => {
      const input = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const inputEl = el as HTMLInputElement;

      // Skip hidden and submit inputs
      if (inputEl.type === 'hidden' || inputEl.type === 'submit' || inputEl.type === 'button') {
        return;
      }

      // Find associated label
      let labelText = '';
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) labelText = label.textContent?.trim() ?? '';
      }
      if (!labelText) {
        let parent = input.parentElement;
        while (parent) {
          if (parent.tagName === 'LABEL') {
            labelText = parent.textContent?.trim() ?? '';
            break;
          }
          parent = parent.parentElement;
        }
      }

      // Options for selects
      let options: string[] | undefined;
      if (el.tagName === 'SELECT') {
        options = Array.from((el as HTMLSelectElement).options).map(o => o.text.trim());
      }

      const rect = el.getBoundingClientRect();

      fields.push({
        id: input.id,
        name: (input as HTMLInputElement).name,
        label: labelText,
        type: inputEl.type || el.tagName.toLowerCase(),
        tagName: el.tagName,
        required: (input as HTMLInputElement).required ?? false,
        boundingBox: rect.width > 0
          ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          : null,
        options,
      });
    });

    return fields;
  });
}

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

export class PlaywrightFormExecutor {
  private config: BenchmarkConfig;
  private browser: import('playwright').Browser | null = null;
  private context: import('playwright').BrowserContext | null = null;

  constructor(config: BenchmarkConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const pw = await getPlaywright();
    this.browser = await pw.chromium.launch({
      headless: this.config.headless,
    });
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
    this.context = null;
    this.browser = null;
  }

  /**
   * Execute an AgentAction trace against a form and score the results.
   *
   * Strategy:
   * 1. Navigate to the form URL
   * 2. Introspect page fields → understand what's on screen
   * 3. Execute each action in the trace
   * 4. Compare submitted values to goldAnswers
   * 5. Return FormResult
   */
  async execute(
    formInstance: FormInstance,
    actionTrace: AgentAction[],
    agentName: string
  ): Promise<FormResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    if (!this.context) {
      throw new Error('Executor not initialized — call init() first');
    }

    const page = await this.context.newPage();

    try {
      const formUrl = `${this.config.formFactoryServerUrl}${formInstance.formPath}`;
      await page.goto(formUrl, { timeout: this.config.timeoutMs, waitUntil: 'domcontentloaded' });

      // Introspect fields present on the page
      const pageFields = await extractPageFields(page);

      // Build a map of what the agent filled: fieldName → (value, clickCoord)
      const agentFills = new Map<string, { value: string; x?: number; y?: number }>();

      // Execute actions
      for (const action of actionTrace) {
        try {
          await this.executeAction(page, action, pageFields);

          // Record fills from actions
          if (action.fieldId) {
            // Find the matching page field by label, name, or id
            const targetId = String(action.fieldId).toLowerCase().trim();
            const matched = pageFields.find(f =>
              String(f.label || '').toLowerCase().trim() === targetId ||
              String(f.name || '').toLowerCase().trim() === targetId ||
              String(f.id || '').toLowerCase().trim() === targetId
            );
            const resolvedId = matched ? (matched.id || matched.name) : action.fieldId;

            if (action.type === 'type' && action.text !== undefined) {
              agentFills.set(resolvedId, {
                value: action.text,
                x: action.x,
                y: action.y,
              });
            } else if (action.type === 'select' && action.text !== undefined) {
              agentFills.set(resolvedId, {
                value: action.text,
                x: action.x,
                y: action.y,
              });
            } else if (action.type === 'check') {
              agentFills.set(resolvedId, {
                value: 'true',
                x: action.x,
                y: action.y,
              });
            }
          }
        } catch (err) {
          errors.push(`Action failed [${action.type}]: ${(err as Error).message}`);
        }
      }

      // Try to submit — click the submit button
      let submissionSucceeded = false;
      try {
        await page.click('[type="submit"], button[type="submit"], input[type="submit"]', {
          timeout: 5000,
        });
        // Wait for Flask response
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent('body') ?? '';
        submissionSucceeded = bodyText.toLowerCase().includes('success') ||
          bodyText.toLowerCase().includes('submitted') ||
          bodyText.toLowerCase().includes('thank');
      } catch {
        errors.push('Form submission step failed or timed out');
      }

      // Score the results: match agent fills against goldAnswers
      const fieldResults = this.scoreResults(
        pageFields,
        formInstance.goldAnswers,
        agentFills,
        actionTrace
      );

      const atomicMetrics = aggregateAtomicMetrics(fieldResults);
      const episodicMetrics = aggregateEpisodicMetrics(fieldResults);

      return {
        formInstance,
        agentName,
        fieldResults,
        atomicMetrics,
        episodicMetrics,
        executionTimeMs: Date.now() - startTime,
        errors,
        submissionSucceeded,
      };
    } finally {
      await page.close();
    }
  }

  async executeIterative(
    formInstance: FormInstance,
    agent: import('./types').BenchmarkAgent,
    agentName: string
  ): Promise<FormResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    if (!this.context || !agent.runIterative) {
      throw new Error('Executor not initialized or agent lacks runIterative');
    }

    const page = await this.context.newPage();

    try {
      const formUrl = `${this.config.formFactoryServerUrl}${formInstance.formPath}`;
      await page.goto(formUrl, { timeout: this.config.timeoutMs, waitUntil: 'domcontentloaded' });

      const pageFields = await extractPageFields(page);
      
      try {
         await agent.runIterative(formInstance, page);
      } catch (err) {
         errors.push(`Iterative agent failed: ${(err as Error).message}`);
      }

      // Extract the values that the agent actually filled into the DOM
      const agentFills = new Map<string, { value: string }>();
      for (const field of pageFields) {
        try {
          let val = '';
          const selector = field.id ? `#${field.id}` : `[name="${field.name}"]`;
          if (field.type === 'checkbox' || field.type === 'radio') {
            const isChecked = await page.isChecked(selector);
            val = isChecked ? 'true' : 'false';
          } else {
            val = await page.inputValue(selector);
          }
          agentFills.set(field.id || field.name, { value: val });
        } catch (e) {
          // Ignore errors for unreadable fields
        }
      }

      let submissionSucceeded = false;
      try {
        await page.click('[type="submit"], button[type="submit"], input[type="submit"]', { timeout: 5000 });
        await page.waitForTimeout(1000);
        const bodyText = await page.textContent('body') ?? '';
        submissionSucceeded = bodyText.toLowerCase().includes('success') || bodyText.toLowerCase().includes('submitted');
      } catch {
        errors.push('Form submission step failed or timed out');
      }

      const fieldResults = this.scoreResults(pageFields, formInstance.goldAnswers, agentFills, []);
      const atomicMetrics = aggregateAtomicMetrics(fieldResults);
      const episodicMetrics = aggregateEpisodicMetrics(fieldResults);

      return {
        formInstance,
        agentName,
        fieldResults,
        atomicMetrics,
        episodicMetrics,
        executionTimeMs: Date.now() - startTime,
        errors,
        submissionSucceeded,
      };
    } finally {
      await page.close();
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async executeAction(
    page: import('playwright').Page,
    action: AgentAction,
    pageFields: PageField[]
  ): Promise<void> {
    const getSelector = (fieldId: string | undefined): string => {
      if (!fieldId) return '';
      const targetId = String(fieldId).toLowerCase().trim();
      const matched = pageFields.find(f =>
        String(f.label || '').toLowerCase().trim() === targetId ||
        String(f.name || '').toLowerCase().trim() === targetId ||
        String(f.id || '').toLowerCase().trim() === targetId
      );
      if (matched) {
        return matched.id ? `#${matched.id}` : `[name="${matched.name}"]`;
      }
      return `[name="${fieldId}"], #${fieldId}`;
    };

    switch (action.type) {
      case 'click':
        if (action.x != null && action.y != null) {
          await page.mouse.click(action.x, action.y);
        } else if (action.fieldId) {
          const sel = getSelector(action.fieldId);
          await page.click(sel).catch(() => {});
        }
        break;

      case 'type':
        if (action.x != null && action.y != null) {
          await page.mouse.click(action.x, action.y);
          await page.waitForTimeout(50);
          if (action.text) {
            await page.keyboard.type(action.text, { delay: 20 });
          }
        } else if (action.fieldId && action.text !== undefined) {
          const sel = getSelector(action.fieldId);
          await page.fill(sel, action.text).catch(() => {});
        }
        break;

      case 'select':
        if (action.fieldId && action.text) {
          const sel = getSelector(action.fieldId);
          await page.selectOption(sel, { label: action.text }).catch(async () => {
            if (action.x != null && action.y != null) {
              await page.mouse.click(action.x, action.y);
            }
          });
        }
        break;

      case 'check':
        if (action.x != null && action.y != null) {
          await page.mouse.click(action.x, action.y);
        } else if (action.fieldId) {
          const sel = getSelector(action.fieldId);
          await page.check(sel).catch(() => {});
        }
        break;

      case 'clear':
        if (action.fieldId) {
          const sel = getSelector(action.fieldId);
          await page.fill(sel, '').catch(() => {});
        }
        break;

      case 'submit':
        await page.click('[type="submit"], button[type="submit"], input[type="submit"]').catch(() => {});
        break;
    }
  }

  private scoreResults(
    pageFields: PageField[],
    goldAnswers: Record<string, string | string[]>,
    agentFills: Map<string, { value: string; x?: number; y?: number }>,
    actionTrace: AgentAction[]
  ): FieldResult[] {
    const fieldResults: FieldResult[] = [];

    // Build lookup: gold label → gold value
    for (const [goldLabel, goldValue] of Object.entries(goldAnswers)) {
      // Try to find the matching page field by label or name
      const targetGoldLabel = String(goldLabel || '').toLowerCase().trim();
      const matchedField = pageFields.find(f =>
        String(f.label || '').toLowerCase().trim() === targetGoldLabel ||
        String(f.name || '').toLowerCase().trim() === targetGoldLabel
      );

      const fieldType = this.inferFieldType(matchedField);

      // Skip file upload fields if configured
      if (fieldType === 'FileUpload' && this.config.skipFileUploadFields) {
        continue;
      }

      // Find what the agent filled for this field
      const agentFill = matchedField
        ? agentFills.get(matchedField.id || matchedField.name)
        : undefined;

      const predictedValue = agentFill?.value ?? '';

      // Value accuracy
      const { correct: valueAccurate, bleuScore } = calculateValueAccuracy(
        fieldType,
        predictedValue,
        goldValue,
        this.config.bleuThreshold
      );

      // Click accuracy — we check whether any action's click coord falls
      // within the matched field's bounding box
      let clickAccurate: boolean | null = null;
      if (matchedField?.boundingBox) {
        const bb = matchedField.boundingBox;
        const annotation = {
          fieldId: matchedField.id || matchedField.name,
          label: matchedField.label,
          x: bb.x,
          y: bb.y,
          width: bb.width,
          height: bb.height,
          cx: bb.x + bb.width / 2,
          cy: bb.y + bb.height / 2,
        };

        // Check if any click action in the trace targets this field
        const relevantClick = actionTrace.find(a =>
          (a.type === 'click' || a.type === 'type' || a.type === 'check') &&
          a.x != null && a.y != null &&
          (a.fieldId === matchedField.id || a.fieldId === matchedField.name)
        );

        clickAccurate = calculateClickAccuracy(
          relevantClick?.x,
          relevantClick?.y,
          annotation,
          this.config.clickTolerancePx
        );
      }

      fieldResults.push({
        fieldId: matchedField?.id || matchedField?.name || goldLabel,
        fieldType,
        predictedValue,
        goldValue,
        clickAccurate,
        valueAccurate,
        bleuScore,
        predictedClick: agentFill?.x != null
          ? { x: agentFill.x!, y: agentFill.y! }
          : undefined,
      });
    }

    return fieldResults;
  }

  private inferFieldType(field: PageField | undefined): FieldType {
    if (!field) return 'String';
    switch (field.tagName) {
      case 'SELECT':   return 'Dropdown';
      case 'TEXTAREA': return 'Description';
    }
    switch (field.type) {
      case 'checkbox': return 'Checkbox';
      case 'radio':    return 'RadioButton';
      case 'date':     return 'Date';
      case 'file':     return 'FileUpload';
      case 'number':   return 'NumericInput';
      default:         return 'String';
    }
  }
}
