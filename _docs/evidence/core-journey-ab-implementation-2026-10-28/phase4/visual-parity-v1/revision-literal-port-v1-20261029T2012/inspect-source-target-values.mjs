import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'source-target-values-' + new Date().toISOString().replaceAll(':', '') + '.json');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
const data = { at: new Date().toISOString(), browser: browser.version(), temp: os.tmpdir(), pages: [] };
try {
  for (const [kind, url] of [
    ['A prototype', 'http://127.0.0.1:5178/'],
    ['A app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'],
    ['B prototype', 'http://127.0.0.1:5179/'],
    ['B app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en'],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.evaluate(() => document.fonts?.ready);
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 600 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100);
      data.pages.push(await page.evaluate(({ kind, viewport }) => {
      const style = (selector, pseudo) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        const s = getComputedStyle(node, pseudo);
        return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          display: s.display, width: s.width, height: s.height, font: s.font,
          color: s.color, background: s.backgroundColor, fill: s.fill, stroke: s.stroke,
          fillOpacity: s.fillOpacity, strokeWidth: s.strokeWidth, accentColor: s.accentColor,
          appearance: s.appearance, borderRadius: s.borderRadius, outline: s.outline };
      };
      return {
        kind, viewport, activeElement: document.activeElement?.id,
        wave: style('.wave'), sourceWave: style('.waveform-source'), takeWave: style('.waveform-take'),
        scrub: style('#scrub'), scrubThumb: style('#scrub', '::-webkit-slider-thumb'),
        volumeLabel: style('.timeline-meta label'), volume: style('#volume'), volumeThumb: style('#volume', '::-webkit-slider-thumb'),
        timeline: style('.timeline'), meta: style('.timeline-meta'), time: style('#time'), actions: style('.performance-actions .hf-button'), helper: style('#take-help'),
      };
    }, { kind, viewport }));
    }
    await page.close();
  }
  await fs.writeFile(output, JSON.stringify(data, null, 2), 'utf8');
  process.stdout.write(output);
} finally {
  await browser.close();
}
