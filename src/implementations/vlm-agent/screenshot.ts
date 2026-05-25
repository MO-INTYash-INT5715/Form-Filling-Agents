import { Page } from 'playwright';

/**
 * Captures the current visible page viewport as a base64-encoded JPEG string.
 */
export async function captureViewportBase64(page: Page): Promise<string> {
  const screenshot = await page.screenshot({ type: 'jpeg', quality: 80 });
  return screenshot.toString('base64');
}
