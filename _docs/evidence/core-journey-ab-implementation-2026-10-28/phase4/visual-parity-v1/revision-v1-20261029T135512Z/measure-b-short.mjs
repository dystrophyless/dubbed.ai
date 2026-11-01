import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const browser = await chromium.launch({ headless: true });
const cases = [
  { name: 'prototype-B', url: 'http://127.0.0.1:5179/', stage: '.scene', caption: '.script', waveform: '.wave', meta: '.timeline-meta', actions: '.studio-controls' },
  { name: 'integrated-B', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en', stage: '.media-viewport', caption: '.dialogue-copy', waveform: '.waveform-row', meta: '.waveform-meta', actions: '.record-studio-actions' },
];
const result = { measuredAt: new Date().toISOString(), browserTempPath: os.tmpdir(), viewport: { width: 1280, height: 600 }, cases: [] };

for (const item of cases) {
  const page = await browser.newPage({ viewport: result.viewport });
  await page.goto(item.url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(180);
  const measurement = await page.evaluate((selectors) => {
    const bounds = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        font: style.font, lineHeight: style.lineHeight, margin: style.margin, padding: style.padding, gap: style.gap, radius: style.borderRadius };
    };
    const root = document.querySelector(selectors.actions);
    return {
      bodyClass: document.body.className, stage: bounds(document.querySelector(selectors.stage)),
      caption: bounds(document.querySelector(selectors.caption)), waveform: bounds(document.querySelector(selectors.waveform)),
      meta: bounds(document.querySelector(selectors.meta)), actions: bounds(root),
      buttons: [...(root?.querySelectorAll('button') ?? [])].map((button) => ({
        text: button.innerText.trim(), ...bounds(button),
      })),
    };
  }, item);
  result.cases.push({ name: item.name, url: item.url, ...measurement });
  await page.close();
}

await browser.close();
const outputPath = path.join(outDir, `b-short-measure-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`);
await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
process.stdout.write(JSON.stringify({ outputPath, ...result }, null, 2));
