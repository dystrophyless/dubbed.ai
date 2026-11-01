import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/playwright/index.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
});
const measurements = [];

await mkdir(output, { recursive: true });

for (const layout of ['A', 'B']) {
  for (const viewport of [{ name: '1280x600', width: 1280, height: 600 }, { name: '390x844', width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const response = await page.goto(`http://127.0.0.1:5180/projects/sintel-prepared/record?layout=${layout}&locale=en`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const stageWidth = viewport.width < 768 ? 358 : layout === 'A' ? 547.546875 : 561.765625;
    const stageTop = viewport.width < 768 ? (layout === 'A' ? 136 : 140) : layout === 'A' ? 88 : 80;
    await page.evaluate(({ layout, stageWidth, stageTop }) => {
      const host = document.createElement('div');
      host.className = `page-shell result-page result-page--${layout.toLowerCase()}`;
      host.dataset.selectorParityFixture = 'true';
      Object.assign(host.style, {
        position: 'fixed', inset: '0', zIndex: '2147483647', pointerEvents: 'none', background: '#fff',
      });

      const player = document.createElement('div');
      player.className = 'result-player';
      Object.assign(player.style, {
        position: 'fixed', top: `${stageTop}px`, left: `calc((100vw - ${stageWidth}px) / 2)`,
        width: `${stageWidth}px`, borderRadius: '6px',
      });

      const screen = document.createElement('div');
      screen.className = 'result-player__screen result-picture';
      const selector = document.createElement('div');
      selector.className = 'result-player__source-tabs result-sources';
      selector.setAttribute('role', 'group');
      selector.setAttribute('aria-label', 'Result source');
      selector.innerHTML = '<button type="button" aria-pressed="false">Original</button><button type="button" aria-pressed="true">My dub</button>';
      screen.append(selector);
      player.append(screen);
      host.append(player);
      document.body.append(host);
    }, { layout, stageWidth, stageTop });
    await page.locator('.result-sources').evaluate(async () => {
      await document.fonts.load('500 14px "Mabry Pro"');
      await document.fonts.ready;
    });
    const metric = await page.evaluate(({ layout, viewport, responseStatus }) => {
      const box = (element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          minWidth: style.minWidth, padding: style.padding, font: style.font,
        };
      };
      const selector = document.querySelector('.result-sources');
      const buttons = [...selector.querySelectorAll('button')];
      return {
        layout,
        viewport,
        responseStatus,
        fontLoaded: document.fonts.check('500 14px "Mabry Pro"'),
        selector: box(selector),
        borderTopWidth: getComputedStyle(selector).borderTopWidth,
        backdropFilter: getComputedStyle(selector).backdropFilter,
        buttons: buttons.map((button) => ({ text: button.textContent, ...box(button) })),
      };
    }, { layout, viewport, responseStatus: response?.status() ?? null });
    const stem = `${layout}-${viewport.name}`;
    await page.locator('.result-sources').screenshot({ path: path.join(output, `${stem}-selector.png`), animations: 'disabled' });
    await page.screenshot({ path: path.join(output, `${stem}-context.png`), animations: 'disabled' });
    await writeFile(path.join(output, `${stem}.json`), JSON.stringify(metric, null, 2), 'utf8');
    measurements.push(metric);
    await context.close();
  }
}

await writeFile(path.join(output, 'measurements.json'), JSON.stringify({ capturedAt: new Date().toISOString(), measurements }, null, 2), 'utf8');
await browser.close();
console.log(JSON.stringify({ output, measurements }, null, 2));
