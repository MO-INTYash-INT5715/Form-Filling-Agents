import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';
import * as tracker from '../../../src/telemetry/tracker';
import type { VerificationRecord } from '../../../src/types/telemetry';

// ── CSS escape helper (Node.js polyfill) ─────────────────────────────────────

function cssEscape(id: string): string {
  return id.replace(/([^\w-])/g, '\\$1');
}

// ── Playwright executor: apply all fills + submit ─────────────────────────────

async function applyAndSubmit(
  url: string,
  fields: { fieldId: string; value: string; type: string }[]
): Promise<{ success: boolean; errors: string[]; screenshotBase64?: string }> {
  const errors: string[] = [];

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true }).catch(() =>
      chromium.launch({ channel: 'chrome', headless: true })
    );
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

      // Apply all field values
      for (const field of fields) {
        const selector = field.fieldId
          ? `#${cssEscape(field.fieldId)}`
          : `[name="${field.fieldId}"]`;

        try {
          const el = await page.$(selector);
          if (!el) {
            errors.push(`Field ${field.fieldId}: element not found`);
            continue;
          }

          if (field.type === 'select') {
            await page.selectOption(selector, { label: field.value }).catch(async () => {
              await page.selectOption(selector, field.value);
            });
          } else if (field.type === 'checkbox') {
            if (['true', '1', 'yes'].includes(field.value.toLowerCase())) {
              await page.check(selector);
            } else {
              await page.uncheck(selector);
            }
          } else if (field.type === 'radio') {
            await page.check(`input[name="${field.fieldId}"][value="${field.value}"]`).catch(
              () => page.check(selector)
            );
          } else {
            await page.fill(selector, field.value);
          }
        } catch (err) {
          errors.push(`Field ${field.fieldId}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Click submit button
      try {
        // Prefer explicit submit inputs/buttons, fall back to any <button> in the form
        const submitBtn = page.locator(
          'button[type="submit"], input[type="submit"], form button:not([type="button"]):not([type="reset"])'
        ).first();
        await submitBtn.click({ timeout: 5_000 });
        // Wait a moment for any post-submit navigation or feedback
        await page.waitForTimeout(2_000);
      } catch {
        // Try generic form submit as fallback
        try {
          await page.evaluate(() => {
            const form = document.querySelector('form');
            if (form) (form as HTMLFormElement).requestSubmit?.() ?? (form as HTMLFormElement).submit();
          });
          await page.waitForTimeout(2_000);
        } catch (err) {
          errors.push(`Submit: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Capture post-submit screenshot
      const buf = await page.screenshot({ fullPage: false });
      const screenshotBase64 = buf.toString('base64');

      return { success: errors.length === 0, errors, screenshotBase64 };
    } finally {
      await browser.close();
    }
  } catch (err) {
    errors.push(`Browser error: ${err instanceof Error ? err.message : String(err)}`);
    return { success: false, errors };
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    runId?: string;
    overrides?: Record<string, string>;
    missingSupplied?: Record<string, string>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { runId, overrides = {}, missingSupplied = {} } = body;

  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 });
  }

  // Load the verification record
  const verification = tracker.getVerificationById(runId);
  if (!verification) {
    return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
  }
  if (verification.status !== 'pending') {
    return NextResponse.json(
      { error: `Verification already ${verification.status}` },
      { status: 409 }
    );
  }

  // Merge: original fills → overrides → missing supplied values
  const allFields: { fieldId: string; value: string; type: string }[] = [];

  for (const f of verification.fields) {
    // Priority: missingSupplied > overrides > original valueFilled
    if (missingSupplied[f.fieldId]) {
      allFields.push({ fieldId: f.fieldId, value: missingSupplied[f.fieldId], type: f.type });
    } else if (overrides[f.fieldId]) {
      allFields.push({ fieldId: f.fieldId, value: overrides[f.fieldId], type: f.type });
    } else if (f.valueFilled) {
      allFields.push({ fieldId: f.fieldId, value: f.valueFilled, type: f.type });
    }
    // Fields with no value (optional skipped) are not included
  }

  // Apply all fills + submit via Playwright
  const result = await applyAndSubmit(verification.formUrl, allFields);

  // Mark verification as resolved
  tracker.resolveVerification(
    runId,
    result.success ? 'approved' : 'cancelled'
  );

  return NextResponse.json({
    success: result.success,
    runId,
    fieldsSubmitted: allFields.length,
    errors: result.errors,
    screenshotBase64: result.screenshotBase64,
  });
}
