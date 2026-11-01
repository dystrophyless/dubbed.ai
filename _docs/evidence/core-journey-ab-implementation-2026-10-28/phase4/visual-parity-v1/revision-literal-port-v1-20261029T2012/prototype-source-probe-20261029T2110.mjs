import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'source-probe-' + new Date().toISOString().replaceAll(':', '').replaceAll('.', '-'));
const report = { at: new Date().toISOString(), browserTempPath: os.tmpdir(), pages: [], errors: [] };
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
try {
  report.browser = `Chrome ${browser.version()}`;
  for (const [layout, port] of [['A', 5178], ['B', 5179]]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ layout, message: error.message }));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(150);
      const metrics = await page.evaluate(({ layout, viewport }) => {
        const box = selector => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { text: node.textContent?.trim() ?? '', hidden: node.hidden, ariaHidden: node.getAttribute('aria-hidden'),
            x: rect.x, y: rect.y, width: rect.width, height: rect.height, display: style.display,
            visibility: style.visibility, opacity: style.opacity, color: style.color, font: style.font,
            position: style.position, margin: style.margin, padding: style.padding };
        };
        return { layout, viewport, url: location.href, scrollY, headingText: document.querySelector('#heading')?.textContent,
          header: box('.project-header, .studio-header'), titleWrap: box('.project-heading, .studio-title'), heading: box('#heading'),
          dots: box('#dots'), projectName: box('#result-project'), stage: box('#scene'), player: box('#result-player'),
          main: box('#main'), lab: box('.lab') };
      }, { layout, viewport: [viewport.width, viewport.height] });
      const image = `${layout}-record-${viewport.name}.png`;
      await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
      report.pages.push({ image, ...metrics });
    }
    await context.close();
  }
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(JSON.stringify({ outDir, browser: report.browser, browserTempPath: report.browserTempPath,
    pages: report.pages.map(({ image, layout, viewport, url, scrollY, header, titleWrap, heading, dots }) => ({ image, layout, viewport, url, scrollY, header, titleWrap, heading, dots })), errors: report.errors }, null, 2));
} finally {
  await browser.close();
}
