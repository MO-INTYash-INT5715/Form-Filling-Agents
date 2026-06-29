import { Browser, BrowserContext, Page } from 'playwright';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  formUrl: string;
  fields: Array<{ fieldId: string; value: string; type: string; label?: string }>;
}

// Extend NodeJS global to store sessions across HMR reloads
declare global {
  var browserSessions: Map<string, BrowserSession> | undefined;
}

const sessions = global.browserSessions || new Map<string, BrowserSession>();
if (process.env.NODE_ENV !== 'production') {
  global.browserSessions = sessions;
}

function cssEscape(id: string): string {
  return id.replace(/([^\w-])/g, '\\$1');
}

export async function startSession(
  sessionId: string,
  formUrl: string,
  initialFields: Array<{ fieldId: string; value: string; type: string; label?: string }>
): Promise<BrowserSession> {
  // If session already exists, close it first
  if (sessions.has(sessionId)) {
    await stopSession(sessionId);
  }

  const { chromium } = await import('playwright');
  const launchOptions = {
    headless: false as const,
    args: [
      '--start-maximized',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-blink-features=AutomationControlled',
    ],
  };

  const browser = await chromium
    .launch(launchOptions)
    .catch(() => chromium.launch({ ...launchOptions, channel: 'chrome' }));

  const context = await browser.newContext({
    viewport: null,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  try {
    await page.goto(formUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
  } catch (err) {
    console.warn('[Session Manager] Page load warning:', err);
  }

  await page.waitForTimeout(2_000);

  const session: BrowserSession = {
    browser,
    context,
    page,
    formUrl,
    fields: [...initialFields],
  };

  sessions.set(sessionId, session);

  // Apply initial values
  for (const field of initialFields) {
    await applyFieldToPage(page, field).catch(err => {
      console.error(`[Session Manager] Error applying field ${field.fieldId}:`, err);
    });
  }

  return session;
}

export function getSession(sessionId: string): BrowserSession | undefined {
  return sessions.get(sessionId);
}

export async function stopSession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;

  try {
    await session.browser.close();
  } catch (err) {
    console.error('[Session Manager] Error closing browser:', err);
  }

  sessions.delete(sessionId);
  return true;
}

export async function updateSessionField(
  sessionId: string,
  fieldId: string,
  value: string
): Promise<boolean> {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const field = session.fields.find(f => f.fieldId === fieldId);
  if (!field) return false;

  field.value = value;
  await applyFieldToPage(session.page, field);
  return true;
}

async function applyFieldToPage(
  page: Page,
  field: { fieldId: string; value: string; type: string }
): Promise<void> {
  let selector: string;
  if (field.fieldId) {
    const byId = await page.$(`#${cssEscape(field.fieldId)}`);
    selector = byId ? `#${cssEscape(field.fieldId)}` : `[name="${field.fieldId}"]`;
  } else {
    selector = `[name="${field.fieldId}"]`;
  }

  if (field.type === 'select') {
    await page
      .selectOption(selector, { label: field.value })
      .catch(() => page.selectOption(selector, field.value))
      .catch(async () => {
        await page.evaluate(
          ({ sel, val }: { sel: string; val: string }) => {
            const el = document.querySelector(sel) as HTMLSelectElement | null;
            if (!el) return;
            const opt = Array.from(el.options).find(
              o => o.text.toLowerCase().includes(val.toLowerCase()) || o.value === val
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
    const check = ['true', '1', 'yes', 'on', 'agree'].includes(field.value.toLowerCase());
    await (check ? page.check(selector).catch(() => {}) : page.uncheck(selector).catch(() => {}));
  } else if (field.type === 'radio') {
    await page
      .check(`input[type="radio"][name="${field.fieldId}"][value="${field.value}"]`)
      .catch(() => page.check(`input[type="radio"][value="${field.value}"]`))
      .catch(() => page.check(`input[type="radio"][name="${field.fieldId}"]`))
      .catch(async () => {
        const val = field.value.toLowerCase();
        await page.evaluate(
          ({ fieldId, val }: { fieldId: string; val: string }) => {
            const radios = Array.from(
              document.querySelectorAll(`input[type="radio"]`)
            ) as HTMLInputElement[];
            const candidate =
              radios.find(r => {
                const nameMatch = r.name === fieldId || r.id === fieldId;
                const valMatch = r.value.toLowerCase() === val || val.includes(r.value.toLowerCase());
                const parentText = r.parentElement?.textContent?.toLowerCase() || '';
                const labelText =
                  document.querySelector(`label[for="${r.id}"]`)?.textContent?.toLowerCase() || '';
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
}
