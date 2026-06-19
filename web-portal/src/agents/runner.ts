/**
 * Agent Runner
 *
 * Orchestrates all three strategies with full telemetry capture.
 * - runAgent()        — run one specific strategy, returns AgentRunRecord
 * - runAllStrategies() — run all 3 in parallel, return comparison array
 */

import type { ScrapedForm } from '../types/index';
import type { AgentStrategyName, FlatProfile, FieldFill } from './types';
import type { AgentRunRecord, FieldTelemetry } from '../types/telemetry';
import type { VerificationRecord } from '../types/telemetry';
import { RuleBasedAgent }       from './rule-based';
import { LLMStructuredAgent }   from './llm-structured';
import { EmbeddingMatcherAgent } from './embedding-matcher';
import { flattenProfile }       from './types';
import { scrapeForm }           from '../scraper/form-scraper';
import * as tracker             from '../telemetry/tracker';

// ── CSS escape helper (CSS.escape is browser-only; not available in Node.js) ──

function cssEscape(id: string): string {
  // Escape characters that are not valid in CSS identifiers
  return id.replace(/([^\w-])/g, '\\$1');
}

// ── Playwright executor ───────────────────────────────────────────────────────

/**
 * Apply fills to a live form in a headless browser and capture a screenshot.
 * Does NOT submit the form — that is reserved for the approve step.
 */
async function applyFillsAndScreenshot(
  url: string,
  fills: FieldFill[]
): Promise<{ screenshotBase64: string; errors: string[] }> {
  const errors: string[] = [];
  let screenshotBase64 = '';

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true }).catch(() =>
      chromium.launch({ channel: 'chrome', headless: true })
    );
    const page = await browser.newPage();

    try {
      // Use domcontentloaded — networkidle never resolves on many live sites
      // (sites with long-polling, streaming, websockets, analytics pings, etc.)
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
      // Brief extra wait for SPAs to render their forms after the initial DOM load
      await page.waitForTimeout(1_500);

      for (const fill of fills) {
        if (fill.value === undefined) continue;

        try {
          // Try ID selector first, fall back to name selector
          const elById = fill.fieldId ? await page.$(`#${cssEscape(fill.fieldId)}`) : null;
          const selector = elById
            ? `#${cssEscape(fill.fieldId)}`
            : `[name="${fill.fieldId}"]`;

          // Skip if neither selector finds anything
          const el = elById ?? await page.$(selector);
          if (!el) continue;

          if (fill.type === 'select') {
            await page.selectOption(selector, { label: fill.value }).catch(async () => {
              await page.selectOption(selector, fill.value!);
            });
          } else if (fill.type === 'checkbox') {
            if (['true', '1', 'yes'].includes(fill.value.toLowerCase())) {
              await page.check(selector);
            }
          } else if (fill.type === 'radio') {
            await page.check(`input[name="${fill.fieldId}"][value="${fill.value}"]`).catch(
              () => page.check(selector)
            );
          } else {
            await page.fill(selector, fill.value);
          }
        } catch (err) {
          errors.push(`Field ${fill.fieldId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      const buf = await page.screenshot({ fullPage: false });
      screenshotBase64 = buf.toString('base64');
    } finally {
      await browser.close();
    }
  } catch (err) {
    errors.push(`Playwright error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { screenshotBase64, errors };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface RunAgentOptions {
  /** Profile object (will be flattened); defaults to test-profile.json if omitted */
  profile?: Record<string, unknown>;
}

export interface RunAgentResult {
  /** The standard agent run record with full telemetry */
  record: AgentRunRecord;
  /** The verification record with missing-field flags, for the review flow */
  verification: VerificationRecord;
}

export async function runAgent(
  strategy: AgentStrategyName,
  url: string,
  options: RunAgentOptions = {}
): Promise<RunAgentResult> {
  // Choose agent
  const agent =
    strategy === 'llm-structured'   ? new LLMStructuredAgent() :
    strategy === 'embedding-matcher' ? new EmbeddingMatcherAgent() :
                                       new RuleBasedAgent();

  // Load + flatten profile
  let rawProfile: Record<string, unknown>;
  if (options.profile) {
    rawProfile = options.profile;
  } else {
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const profilePath = join(process.cwd(), 'data', 'test-profile.json');
    rawProfile = JSON.parse(readFileSync(profilePath, 'utf-8'));
  }
  const profile: FlatProfile = flattenProfile(rawProfile);

  // Start telemetry timer
  const handle = tracker.startRun(strategy, url);

  // Scrape the form
  let form: ScrapedForm;
  try {
    form = await scrapeForm(url);
  } catch (err) {
    const record = tracker.finishRun(tracker.markScrapeComplete(handle), {
      fields: [],
      errors: [`Scrape failed: ${err instanceof Error ? err.message : String(err)}`],
    });
    const verification = tracker.createVerification(record);
    return { record, verification };
  }
  const handleAfterScrape = tracker.markScrapeComplete(handle);

  // Run the fill agent
  const fillResult = await agent.fill(form, profile);

  // Build a required-field lookup from the scraped form (pass through to telemetry)
  const requiredById = new Map(
    form.fields.filter(f => f.required).map(f => [f.id, true])
  );

  // Map fills → FieldTelemetry, carrying through `required` from scraped form
  const fields: FieldTelemetry[] = fillResult.fills.map(f => ({
    fieldId: f.fieldId,
    label: f.label,
    type: f.type,
    valueFilled: f.value,
    matchedProfileKey: f.matchedProfileKey,
    confidence: f.confidence,
    success: f.value !== undefined,
    required: requiredById.get(f.fieldId),
  }));

  const record = tracker.finishRun(handleAfterScrape, {
    formTitle: form.title,
    fields,
    llm: fillResult.llmUsage,
    llmFallbackUsed: fillResult.llmFallbackUsed,
    errors: [],
    screenshotBase64: form.screenshotBase64, // Use screenshot already captured during scraping
  });

  // Create verification record with missing-data detection
  const verification = tracker.createVerification(record);

  return { record, verification };
}

export async function runAllStrategies(
  url: string,
  options: RunAgentOptions = {}
): Promise<RunAgentResult[]> {
  const strategies: AgentStrategyName[] = [
    'rule-based',
    'llm-structured',
    'embedding-matcher',
  ];
  // Run all 3 in parallel for accurate wall-clock comparison
  return Promise.all(strategies.map(s => runAgent(s, url, options)));
}
