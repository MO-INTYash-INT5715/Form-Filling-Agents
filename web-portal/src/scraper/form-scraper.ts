/**
 * Form Scraper
 *
 * Given a URL, launches a headless Playwright browser, navigates to the page,
 * and extracts all visible form fields into a ScrapedForm structure.
 *
 * This server-side scraper mirrors the extension's content-script detection
 * logic but runs in a Node.js Playwright context instead of a browser extension.
 */

import type { ScrapedForm, ScrapedField } from '../types/index';

// ── Core scraper ─────────────────────────────────────────────────────────────

/**
 * Scrape all form fields from the given URL.
 * Returns a ScrapedForm with field metadata.
 */
export async function scrapeForm(url: string): Promise<ScrapedForm> {
  // Dynamic import so Playwright is only loaded when needed
  const { chromium } = await import('playwright');

  // Try Playwright's downloaded binary first; fall back to system Chrome if missing
  const browser = await chromium.launch({ headless: true }).catch(() =>
    chromium.launch({ channel: 'chrome', headless: true })
  );
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    const fields = await page.evaluate((): ScrapedField[] => {
      const results: ScrapedField[] = [];
      const inputs = Array.from(
        document.querySelectorAll('input, select, textarea')
      ) as (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[];

      inputs.forEach((el, idx) => {
        if (el instanceof HTMLInputElement && ['hidden', 'submit', 'button', 'reset', 'image'].includes(el.type)) {
          return;
        }

        // Try to find a label for this element
        let label = '';
        if (el.id) {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          if (labelEl) label = labelEl.textContent?.trim() ?? '';
        }
        if (!label) {
          const closest = el.closest('label');
          if (closest) label = closest.textContent?.trim() ?? '';
        }
        if (!label) {
          // Look for immediately preceding label or div with label text
          const prev = el.previousElementSibling;
          if (prev && (prev.tagName === 'LABEL' || prev.tagName === 'SPAN')) {
            label = prev.textContent?.trim() ?? '';
          }
        }

        const field: ScrapedField = {
          id: el.id || el.name || `field_${idx}`,
          name: el.name || undefined,
          label: label || undefined,
          placeholder: (el as HTMLInputElement).placeholder || undefined,
          type: el instanceof HTMLSelectElement ? 'select' : (el as HTMLInputElement).type || 'text',
          required: el.required,
          value: (el as HTMLInputElement).value || undefined, // Capture value for radio/checkbox
        };

        // Extract options for selects
        if (el instanceof HTMLSelectElement) {
          field.options = Array.from(el.options)
            .filter(o => o.value !== '')
            .map(o => o.text.trim());
        }

        results.push(field);
      });

      return results;
    });

    const title = await page.title();

    return {
      url,
      title: title || undefined,
      fields,
      scrapedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}
