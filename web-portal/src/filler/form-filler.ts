/**
 * Portal Form Filler
 *
 * Given a ScrapedForm and a UserProfile, maps profile data onto form fields,
 * then uses Playwright to actually fill and (optionally) submit the form.
 *
 * Agent strategies mirror the extension implementations.
 * Current strategy: rule-based keyword matching (same logic as extension's
 * rule-based agent, adapted for server-side execution).
 */

import type { ScrapedForm, ScrapedField, UserProfile, FillResult } from '../types/index';

// ── Field → Value mapping ─────────────────────────────────────────────────────

const KEYWORD_MAP: Record<string, (keyof UserProfile['personal'] | string)[]> = {
  email:     ['email'],
  firstname: ['firstName'],
  first_name:['firstName'],
  lastname:  ['lastName'],
  last_name: ['lastName'],
  phone:     ['phone'],
  street:    ['address'],
  city:      ['city'],
  state:     ['state'],
  zip:       ['zip'],
  postal:    ['zip'],
  country:   ['country'],
};

function matchFieldToProfile(
  field: ScrapedField,
  profile: UserProfile
): string | undefined {
  const text = [field.label, field.name, field.placeholder, field.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  for (const [keyword, profilePaths] of Object.entries(KEYWORD_MAP)) {
    if (!text.includes(keyword)) continue;
    for (const path of profilePaths) {
      const personal = profile.personal as Record<string, unknown>;
      const address = personal?.address as Record<string, string> | undefined;
      if (path in personal && personal[path]) return String(personal[path]);
      if (address && path in address && address[path]) return String(address[path]);
    }
  }

  // Professional fields
  const prof = profile.professional;
  if (prof) {
    if (text.includes('title') || text.includes('position')) return prof.currentTitle;
    if (text.includes('company') || text.includes('employer')) return prof.company;
    if (text.includes('linkedin')) return prof.linkedinUrl;
  }

  // Extra fields (catch-all from parsed documents)
  if (profile.extra) {
    for (const [key, val] of Object.entries(profile.extra)) {
      if (text.includes(key.toLowerCase())) {
        return Array.isArray(val) ? val[0] : val;
      }
    }
  }

  return undefined;
}

// ── Playwright executor ───────────────────────────────────────────────────────

export async function fillForm(
  url: string,
  form: ScrapedForm,
  profile: UserProfile,
  options: { submit?: boolean; headless?: boolean } = {}
): Promise<FillResult> {
  const { chromium } = await import('playwright');

  const headless = options.headless !== false;
  const browser = await chromium.launch({ headless }).catch(() =>
    chromium.launch({ channel: 'chrome', headless })
  );
  const page = await browser.newPage();

  const fills: Record<string, string> = {};
  const skipped: Record<string, string> = {};
  let fieldsAttempted = 0;
  let fieldsFilled = 0;
  let fieldsFailed = 0;

  // CSS.escape is browser-only; use inline helper for Node.js
  function cssEscape(id: string): string {
    return id.replace(/([^\w-])/g, '\\$1');
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    for (const field of form.fields) {
      const value = matchFieldToProfile(field, profile);
      if (!value) {
        skipped[field.id] = 'no matching profile value';
        continue;
      }

      fieldsAttempted++;
      const selector = field.id
        ? `#${cssEscape(field.id)}`
        : `[name="${field.name}"]`;

      try {
        const el = await page.$(selector);
        if (!el) {
          fieldsFailed++;
          skipped[field.id] = 'element not found in DOM';
          continue;
        }

        if (field.type === 'select') {
          await page.selectOption(selector, { label: value });
        } else if (field.type === 'checkbox') {
          if (['true', '1', 'yes'].includes(value.toLowerCase())) {
            await page.check(selector);
          }
        } else {
          await page.fill(selector, value);
        }

        fills[field.id] = value;
        fieldsFilled++;
      } catch (err) {
        fieldsFailed++;
        skipped[field.id] = err instanceof Error ? err.message : 'fill error';
      }
    }

    // Optional screenshot for confirmation
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const screenshotBase64 = screenshotBuffer.toString('base64');

    if (options.submit) {
      const submitBtn = await page.$('[type="submit"]');
      if (submitBtn) await submitBtn.click();
    }

    return {
      fieldsAttempted,
      fieldsFilled,
      fieldsFailed,
      fills,
      skipped,
      screenshotBase64,
    };
  } finally {
    await browser.close();
  }
}
