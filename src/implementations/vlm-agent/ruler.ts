import { Page } from 'playwright';

/**
 * Injects a visual pixel-scale ruler along the top and left edges of the webpage.
 */
export async function injectRuler(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Prevent duplicate rulers
    if (document.getElementById('vlm-ruler-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'vlm-ruler-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'none';

    // Top horizontal ruler
    const topRuler = document.createElement('canvas');
    topRuler.width = window.innerWidth;
    topRuler.height = 20;
    topRuler.style.position = 'absolute';
    topRuler.style.top = '0';
    topRuler.style.left = '0';
    topRuler.style.width = '100%';
    topRuler.style.height = '20px';

    // Left vertical ruler
    const leftRuler = document.createElement('canvas');
    leftRuler.width = 20;
    leftRuler.height = window.innerHeight;
    leftRuler.style.position = 'absolute';
    leftRuler.style.top = '0';
    leftRuler.style.left = '0';
    leftRuler.style.width = '20px';
    leftRuler.style.height = '100%';

    const drawTicks = (ctx: CanvasRenderingContext2D, length: number, isHorizontal: boolean) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      if (isHorizontal) {
        ctx.fillRect(0, 0, length, 20);
      } else {
        ctx.fillRect(0, 0, 20, length);
      }

      ctx.strokeStyle = '#00ff00';
      ctx.fillStyle = '#00ff00';
      ctx.font = '9px monospace';
      ctx.lineWidth = 1;

      for (let i = 0; i < length; i += 10) {
        let tickLen = 4;
        if (i % 100 === 0) {
          tickLen = 10;
          ctx.beginPath();
          if (isHorizontal) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, tickLen);
            ctx.stroke();
            ctx.fillText(String(i), i + 2, 18);
          } else {
            ctx.moveTo(0, i);
            ctx.lineTo(tickLen, i);
            ctx.stroke();
            ctx.save();
            ctx.translate(18, i + 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(String(i), 0, 0);
            ctx.restore();
          }
        } else if (i % 50 === 0) {
          tickLen = 7;
          ctx.beginPath();
          if (isHorizontal) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, tickLen);
          } else {
            ctx.moveTo(0, i);
            ctx.lineTo(tickLen, i);
          }
          ctx.stroke();
        } else {
          ctx.beginPath();
          if (isHorizontal) {
            ctx.moveTo(i, 0);
            ctx.lineTo(i, tickLen);
          } else {
            ctx.moveTo(0, i);
            ctx.lineTo(tickLen, i);
          }
          ctx.stroke();
        }
      }
    };

    const topCtx = topRuler.getContext('2d');
    if (topCtx) drawTicks(topCtx, window.innerWidth, true);

    const leftCtx = leftRuler.getContext('2d');
    if (leftCtx) drawTicks(leftCtx, window.innerHeight, false);

    overlay.appendChild(topRuler);
    overlay.appendChild(leftRuler);
    document.body.appendChild(overlay);
  });
}

/**
 * Removes the visual pixel-scale ruler overlay.
 */
export async function removeRuler(page: Page): Promise<void> {
  await page.evaluate(() => {
    const overlay = document.getElementById('vlm-ruler-overlay');
    if (overlay) {
      overlay.remove();
    }
  });
}
