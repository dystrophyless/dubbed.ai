import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const output = path.join(path.dirname(fileURLToPath(import.meta.url)), 'a-panel-measure-' + new Date().toISOString().replaceAll(':', '') + '.json');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const data = { at: new Date().toISOString(), browser: browser.version(), temp: os.tmpdir(), pages: [] };
try {
  for (const [kind, url] of [
    ['prototype', 'http://127.0.0.1:5178/'],
    ['app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    data.pages.push(await page.evaluate(kind => {
      const selectors = ['.performance', '.line-context', '#position', '#saved', '#compact-script-slot', '.performance-actions',
        '#replay', '#record', '#take', '#take-help', '.navigation', '#previous', '#next', '.capture-help'];
      const nodes = selectors.map(selector => {
        const node = document.querySelector(selector);
        if (!node) return { selector, missing: true };
        const rect = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return { selector, hidden: node.hidden, text: node.textContent?.trim() ?? '',
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom },
          display: style.display, minHeight: style.minHeight, padding: style.padding, margin: style.margin,
          gap: style.gap, grid: style.gridTemplateColumns, font: style.font, lineHeight: style.lineHeight };
      });
      return { kind, url: location.href, nodes,
        children: [...document.querySelector('.performance').children].map(node => ({ tag: node.tagName, id: node.id, className: node.className, text: node.textContent?.trim() ?? '' })) };
    }, kind));
    await page.close();
  }
  await fs.writeFile(output, JSON.stringify(data, null, 2), 'utf8');
  process.stdout.write(output);
} finally {
  await browser.close();
}
