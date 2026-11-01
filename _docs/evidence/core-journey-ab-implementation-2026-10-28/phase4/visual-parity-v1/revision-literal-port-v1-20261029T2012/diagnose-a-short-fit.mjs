import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'a-short-fit-' + new Date().toISOString().replaceAll(':', '') + '.json');
const text = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const data = { at: new Date().toISOString(), browser: browser.version(), temp: os.tmpdir(), runs: [] };
try {
  for (const [kind, url] of [
    ['prototype', 'http://127.0.0.1:5178/'],
    ['app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 600 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector('#scene')?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    await page.evaluate(() => document.fonts?.ready);
    const inspect = async label => data.runs.push(await page.evaluate(({ kind, label }) => {
      const one = selector => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const r = node.getBoundingClientRect();
        const s = getComputedStyle(node);
        return { x: r.x, y: r.y, width: r.width, height: r.height, font: s.font, padding: s.padding, margin: s.margin, lineHeight: s.lineHeight, minHeight: s.minHeight };
      };
      const main = document.querySelector('#main');
      return {
        kind, label, viewport: { width: innerWidth, height: innerHeight },
        mainClass: main?.className, customProperties: main ? {
          mediaWidth: main.style.getPropertyValue('--media-width'),
          workspaceWidth: main.style.getPropertyValue('--workspace-width'),
          panelWidth: main.style.getPropertyValue('--panel-width'),
        } : null,
        main: one('#main'), header: one('.project-header'), rehearsal: one('.rehearsal'), scene: one('.scene'),
        script: one('.script'), dialogue: one('#dialogue'), timeline: one('.timeline'), wave: one('.wave'),
        scrub: one('#scrub'), meta: one('.timeline-meta'), panel: one('.performance'),
      };
    }, { kind, label }));
    await inspect('initial');
    await page.evaluate(text => { document.querySelector('#dialogue').textContent = text; }, text);
    await inspect('long text before resize');
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(150);
    await inspect('long text after resize fit');
    await page.close();
  }
  await fs.writeFile(output, JSON.stringify(data, null, 2), 'utf8');
  process.stdout.write(output);
} finally {
  await browser.close();
}
