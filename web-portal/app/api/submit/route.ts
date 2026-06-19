import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '../../../lib/auth';

// ── CSS escape helper (Node.js polyfill) ─────────────────────────────────────

function cssEscape(id: string): string {
  return id.replace(/([^\w-])/g, '\\$1');
}

// ── POST /api/submit ──────────────────────────────────────────────────────────
//
// Receives the final merged fields directly from the client (no server-side
// in-memory lookup). Launches a headed Chromium window, navigates to the form,
// applies all values, and leaves the browser open so the user can review and
// submit manually. Works on any publicly accessible live website.

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    formUrl?: string;
    fields?: Array<{ fieldId: string; value: string; type: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { formUrl, fields = [] } = body;

  if (!formUrl) {
    return NextResponse.json({ error: 'formUrl is required' }, { status: 400 });
  }

  // Launch a headed (visible) Chromium session so the user can see and interact
  // with the filled form. We do NOT close the browser — user submits manually.
  try {
    const { chromium } = await import('playwright');

    // Prefer Playwright's downloaded binary; fall back to system Chrome/Chromium.
    const launchOptions = {
      headless: false as const,
      args: [
        '--start-maximized',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-infobars',
        // Reduces automation detection on many live sites
        '--disable-blink-features=AutomationControlled',
      ],
    };

    const browser = await chromium
      .launch(launchOptions)
      .catch(() => chromium.launch({ ...launchOptions, channel: 'chrome' }));

    // Realistic viewport + user-agent so live sites behave normally
    const context = await browser.newContext({
      viewport: null, // null = full window size (works with --start-maximized)
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // Navigate — use domcontentloaded because networkidle never resolves on live
    // sites that have long-polling, streaming, analytics pings, websockets, etc.
    try {
      await page.goto(formUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
    } catch {
      // Some live sites redirect or have captchas — still attempt to fill fields
    }

    // Extra wait for JS-heavy SPAs to finish rendering their form fields
    await page.waitForTimeout(2_000);

    // Apply all field values
    const fillErrors: string[] = [];
    for (const field of fields) {
      try {
        // Resolve selector: try #id first (most reliable), fall back to [name=...]
        let selector: string;
        if (field.fieldId) {
          const byId = await page.$(`#${cssEscape(field.fieldId)}`);
          selector = byId
            ? `#${cssEscape(field.fieldId)}`
            : `[name="${field.fieldId}"]`;
        } else {
          selector = `[name="${field.fieldId}"]`;
        }

        if (field.type === 'select') {
          // Try by visible label text first, then by option value, then JS fallback
          await page
            .selectOption(selector, { label: field.value })
            .catch(() => page.selectOption(selector, field.value))
            .catch(async () => {
              await page.evaluate(
                ({ sel, val }: { sel: string; val: string }) => {
                  const el = document.querySelector(sel) as HTMLSelectElement | null;
                  if (!el) return;
                  const opt = Array.from(el.options).find(
                    o =>
                      o.text.toLowerCase().includes(val.toLowerCase()) ||
                      o.value === val
                  );
                  if (opt) {
                    el.value = opt.value;
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                },
                { sel: selector, val: field.value }
              );
            });
        } else if (field.type === 'checkbox') {
          const check = ['true', '1', 'yes', 'on', 'agree'].includes(
            field.value.toLowerCase()
          );
          await (check
            ? page.check(selector).catch(() => {})
            : page.uncheck(selector).catch(() => {}));
        } else if (field.type === 'radio') {
          // Check if we can find radio buttons by matching their value or labels
          await page
            .check(
              `input[type="radio"][name="${field.fieldId}"][value="${field.value}"]`
            )
            .catch(() =>
              page.check(`input[type="radio"][value="${field.value}"]`)
            )
            .catch(() =>
              page.check(`input[type="radio"][name="${field.fieldId}"]`)
            )
            .catch(async () => {
              // Try clicking parent elements or labels containing the radio text
              const val = field.value.toLowerCase();
              await page.evaluate(
                ({ fieldId, val }: { fieldId: string; val: string }) => {
                  const radios = Array.from(
                    document.querySelectorAll(`input[type="radio"]`)
                  ) as HTMLInputElement[];
                  
                  // Filter by name match or closest label match
                  const candidate = radios.find(r => {
                    const nameMatch = r.name === fieldId || r.id === fieldId;
                    const valMatch = r.value.toLowerCase() === val || val.includes(r.value.toLowerCase());
                    
                    // Check if parent text contains the value
                    const parentText = r.parentElement?.textContent?.toLowerCase() || '';
                    const labelText = document.querySelector(`label[for="${r.id}"]`)?.textContent?.toLowerCase() || '';
                    
                    return nameMatch && (valMatch || parentText.includes(val) || labelText.includes(val));
                  }) || radios.find(r => r.value.toLowerCase() === val);
                  
                  if (candidate) {
                    candidate.checked = true;
                    candidate.dispatchEvent(new Event('change', { bubbles: true }));
                    candidate.click();
                  }
                },
                { fieldId: field.fieldId, val }
              );
            });
        } else {
          // text / email / tel / number / date / textarea etc.
          await page.fill(selector, field.value).catch(async () => {
            // JS fallback for custom React/Vue/Angular inputs that ignore .fill()
            await page.evaluate(
              ({ sel, val }: { sel: string; val: string }) => {
                const el = document.querySelector(sel) as HTMLInputElement | null;
                if (el) {
                  el.value = val;
                  el.dispatchEvent(new Event('input', { bubbles: true }));
                  el.dispatchEvent(new Event('change', { bubbles: true }));
                }
              },
              { sel: selector, val: field.value }
            );
          });
        }
      } catch (err) {
        fillErrors.push(
          `${field.fieldId}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Browser stays open — user reviews the filled form and submits manually.
    // The browser process is intentionally orphaned from this request handler.

    return NextResponse.json({
      success: true,
      message:
        'Browser session launched with filled data. Please review and submit manually.',
      fieldsApplied: fields.length - fillErrors.length,
      fillErrors,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
