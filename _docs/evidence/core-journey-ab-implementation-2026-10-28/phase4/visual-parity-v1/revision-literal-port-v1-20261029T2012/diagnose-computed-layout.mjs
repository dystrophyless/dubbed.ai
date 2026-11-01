import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.join(path.dirname(fileURLToPath(import.meta.url)), 'computed-layout-' + new Date().toISOString().replaceAll(':', '') + '.json');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const data = { at: new Date().toISOString(), browser: browser.version(), temp: os.tmpdir(), pages: [] };
try {
  for (const [kind, layout, url] of [
    ['A prototype', 'A', 'http://127.0.0.1:5178/'],
    ['A app', 'A', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'],
    ['B prototype', 'B', 'http://127.0.0.1:5179/'],
    ['B app', 'B', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => document.fonts?.ready);
    data.pages.push(await page.evaluate(({ kind, layout }) => {
      const inspect = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          selector, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom },
          margin: style.margin, padding: style.padding, width: style.width, maxWidth: style.maxWidth,
          display: style.display, gridTemplateColumns: style.gridTemplateColumns, gap: style.gap,
          minHeight: style.minHeight, font: style.font, background: style.backgroundColor,
        };
      };
      return {
        kind, layout, url: location.href, scrollHeight: document.documentElement.scrollHeight,
        active: document.activeElement ? { tag: document.activeElement.tagName, id: document.activeElement.id, className: document.activeElement.className } : null,
        body: inspect('body'), wrapper: inspect('.record-page, #product'), main: inspect('#main'),
        header: inspect('.project-header, .studio-header'), exit: inspect('#exit'), title: inspect('#heading'),
        recordView: inspect('#record-view'), scene: inspect('.scene'), script: inspect('.script'), timeline: inspect('.timeline'),
        panel: inspect('.performance'), controls: inspect(layout === 'A' ? '.performance-actions' : '.studio-controls'),
        panelMessage: inspect('#take-help'),
      };
    }, { kind, layout }));
    await page.close();
  }
  await fs.writeFile(output, JSON.stringify(data, null, 2), 'utf8');
  process.stdout.write(output);
} finally {
  await browser.close();
}
