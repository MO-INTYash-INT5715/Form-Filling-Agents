/**
 * Portal Form Filler — v2 (improved accuracy)
 *
 * Fixes over v1:
 * 1. waitForSelector replaces page.$() — no more silent null failures
 * 2. Regex-based keyword matchers replace narrow string-dict approach
 * 3. Full-name detection (custname → "Jane Doe")
 * 4. Radio group deduplication — fills once per group using [name][value] selector
 * 5. Checkbox value-based matching — checks boxes whose value/label appears in profile collections
 * 6. Custom + extra field coverage
 */

import type { ScrapedForm, ScrapedField, UserProfile, FillResult } from '../types/index';

// ── Helpers ───────────────────────────────────────────────────────────────────

function cssEscape(id: string): string {
  return id.replace(/([^\w-])/g, '\\$1');
}

function fullName(profile: UserProfile): string | undefined {
  const { firstName, lastName } = profile.personal;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  return firstName ?? lastName;
}

// ── Field → Value mapping ─────────────────────────────────────────────────────

/**
 * Given a ScrapedField and a UserProfile, return the string value to fill,
 * or undefined if no match found.
 */
function matchFieldToProfile(
  field: ScrapedField,
  profile: UserProfile
): string | undefined {
  const text = [field.label, field.name, field.placeholder, field.id]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const p = profile.personal;
  const addr = p.address as Record<string, string> | undefined;

  // Full-name patterns (must check before first/last name patterns)
  if (
    /\b(full\s*name|customer\s*name|your\s*name)\b/.test(text) ||
    (text.includes('name') &&
      !text.includes('first') &&
      !text.includes('last') &&
      !text.includes('user') &&
      !text.includes('user'))
  ) {
    const fn = fullName(profile);
    if (fn) return fn;
  }

  // Ordered regex matchers → profile getters
  const matchers: Array<[RegExp, () => string | undefined]> = [
    [/\b(email|e-?mail)\b/,                  () => p.email],
    [/\b(first\s*name|given\s*name|fname)\b/, () => p.firstName],
    [/\b(last\s*name|surname|family|lname)\b/,() => p.lastName],
    [/\b(phone|tel(?:ephone)?|mobile|cell)\b/,() => p.phone],
    [/\b(dob|birth|birthday)\b/,             () => p.dateOfBirth],
    [/\b(street|address)\b/,                 () => addr?.line1 ?? addr?.street],
    [/\b(city|town)\b/,                      () => addr?.city],
    [/\b(state|province|region)\b/,          () => addr?.state],
    [/\b(zip|postal|postcode)\b/,            () => addr?.zip ?? addr?.postalCode],
    [/\b(country|nation)\b/,                 () => addr?.country],
  ];

  for (const [re, getter] of matchers) {
    if (re.test(text)) {
      const val = getter();
      if (val) return String(val);
    }
  }

  // Professional fields
  const prof = profile.professional;
  if (prof) {
    if (/\b(title|position|role|job)\b/.test(text) && prof.currentTitle) return prof.currentTitle;
    if (/\b(company|employer|org(?:anization)?)\b/.test(text) && prof.company) return prof.company;
    if (/\blinkedin\b/.test(text) && prof.linkedinUrl) return prof.linkedinUrl;
  }

  // Custom fields (test data like size, toppings)
  const custom = (profile as any).custom as Record<string, unknown> | undefined;
  if (custom) {
    for (const [key, val] of Object.entries(custom)) {
      if (text.includes(key.toLowerCase())) {
        return Array.isArray(val) ? String(val[0]) : String(val);
      }
    }
  }

  // Extra fields (from parsed documents)
  if (profile.extra) {
    for (const [key, val] of Object.entries(profile.extra)) {
      if (text.includes(key.toLowerCase())) {
        return Array.isArray(val) ? val[0] : String(val);
      }
    }
  }

  return undefined;
}

// ── Checkbox-specific matching ────────────────────────────────────────────────

/**
 * Determine whether a checkbox should be checked, based on whether the
 * checkbox's value or label appears in any profile collection field
 * (arrays or comma-separated strings in custom / extra).
 */
function shouldCheckCheckbox(field: ScrapedField, profile: UserProfile): boolean {
  const checkboxValue = field.value?.toLowerCase() ?? '';
  const checkboxLabel = field.label?.toLowerCase() ?? '';
  const searchTerms = [checkboxValue, checkboxLabel].filter(Boolean);
  if (searchTerms.length === 0) return false;

  const custom = (profile as any).custom as Record<string, unknown> | undefined;
  const allCollections: unknown[] = [
    ...(custom ? Object.values(custom) : []),
    ...(profile.extra ? Object.values(profile.extra) : []),
  ];

  for (const collection of allCollections) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        const s = String(item).toLowerCase();
        if (searchTerms.some(t => s.includes(t) || t.includes(s))) return true;
      }
    } else if (typeof collection === 'string') {
      const s = collection.toLowerCase();
      if (searchTerms.some(t => s.includes(t) || t.includes(s))) return true;
    }
  }

  return false;
}

// ── Radio group utilities ─────────────────────────────────────────────────────

function buildRadioGroups(fields: ScrapedField[]): Map<string, ScrapedField[]> {
  const groups = new Map<string, ScrapedField[]>();
  for (const f of fields) {
    if (f.type === 'radio' && f.name) {
      if (!groups.has(f.name)) groups.set(f.name, []);
      groups.get(f.name)!.push(f);
    }
  }
  return groups;
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

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    // Pre-process radio groups so each group is handled once
    const radioGroups = buildRadioGroups(form.fields);
    const handledRadioGroups = new Set<string>();

    for (const field of form.fields) {
      // ── Radio group ────────────────────────────────────────────────────────
      if (field.type === 'radio') {
        const groupName = field.name;
        if (!groupName || handledRadioGroups.has(groupName)) continue;
        handledRadioGroups.add(groupName);

        const groupFields = radioGroups.get(groupName) ?? [field];

        // Build synthetic field: merge all labels + use group name for matching
        const syntheticField: ScrapedField = {
          ...groupFields[0],
          label: groupFields.map(f => f.label).filter(Boolean).join(' / ') || undefined,
          name: groupName,
          id: groupName,
        };

        const desiredValue = matchFieldToProfile(syntheticField, profile);
        const fillKey = `${groupName}[radio]`;

        if (!desiredValue) {
          skipped[fillKey] = 'no matching profile value for radio group';
          continue;
        }

        fieldsAttempted++;
        try {
          // Find the radio whose .value matches the desired value (case-insensitive)
          const matchedField = groupFields.find(f => {
            const v = f.value?.toLowerCase() ?? '';
            const d = desiredValue.toLowerCase();
            return v === d || v.includes(d) || d.includes(v);
          }) ?? groupFields[0];

          const selector = matchedField.value
            ? `[name="${groupName}"][value="${matchedField.value}"]`
            : `[name="${groupName}"]`;

          await page.waitForSelector(selector, { timeout: 5000 });
          await page.check(selector);
          fills[fillKey] = matchedField.value ?? desiredValue;
          fieldsFilled++;
        } catch (err) {
          fieldsFailed++;
          skipped[fillKey] = err instanceof Error ? err.message : 'radio fill error';
        }
        continue;
      }

      // ── Checkbox ──────────────────────────────────────────────────────────
      if (field.type === 'checkbox') {
        const shouldCheck = shouldCheckCheckbox(field, profile);
        if (!shouldCheck) {
          skipped[field.id] = 'checkbox value not in profile';
          continue;
        }

        fieldsAttempted++;
        const selector = field.id && field.id !== field.name
          ? `#${cssEscape(field.id)}`
          : field.value
            ? `[name="${field.name}"][value="${field.value}"]`
            : `[name="${field.name}"]`;

        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          await page.check(selector);
          fills[field.id] = field.value ?? 'checked';
          fieldsFilled++;
        } catch (err) {
          fieldsFailed++;
          skipped[field.id] = err instanceof Error ? err.message : 'checkbox fill error';
        }
        continue;
      }

      // ── Text / email / tel / time / textarea / select ─────────────────────
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
        // Try id-based selector first; fall back to name-based
        const nameSelector = field.name ? `[name="${field.name}"]` : null;

        let resolvedSelector = selector;
        try {
          await page.waitForSelector(selector, { state: 'attached', timeout: 3000 });
        } catch {
          if (nameSelector && nameSelector !== selector) {
            await page.waitForSelector(nameSelector, { state: 'attached', timeout: 3000 });
            resolvedSelector = nameSelector;
          } else {
            throw new Error(`element not found: ${selector}`);
          }
        }

        if (field.type === 'select') {
          await page.selectOption(resolvedSelector, { label: value });
        } else {
          await page.fill(resolvedSelector, value);
        }

        fills[field.id] = value;
        fieldsFilled++;
      } catch (err) {
        fieldsFailed++;
        skipped[field.id] = err instanceof Error ? err.message : 'fill error';
      }
    }

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
