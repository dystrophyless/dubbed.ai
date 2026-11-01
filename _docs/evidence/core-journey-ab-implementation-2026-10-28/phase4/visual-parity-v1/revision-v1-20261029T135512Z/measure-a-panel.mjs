import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const outDir = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const browser = await chromium.launch({ headless: true });
const cases = [
  { name: 'prototype-A', url: 'http://127.0.0.1:5178/', panel: '.performance', context: '.line-context', controls: '.performance-actions', hint: '.hint', navigation: '.navigation' },
  { name: 'integrated-A', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en', panel: '.record-panel', context: '.record-panel__context', controls: '.record-controls--a', hint: '.record-next-hint, .record-candidate-hint', navigation: '.record-navigation', actions: '.record-performance' },
];
const result = { measuredAt: new Date().toISOString(), browserTempPath: os.tmpdir(), viewport: { width: 1280, height: 600 }, cases: [] };

for (const item of cases) {
  const page = await browser.newPage({ viewport: result.viewport });
  await page.goto(item.url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(200);
  const measurements = await page.evaluate((selectors) => {
    const measure = (selector) => {
      if (!selector) return null;
      const element = document.querySelector(selector);
      if (!element || getComputedStyle(element).display === 'none') return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        font: style.font, lineHeight: style.lineHeight, margin: style.margin, padding: style.padding,
        gap: style.gap, background: style.backgroundColor, radius: style.borderRadius,
      };
    };
    return {
      bodyClass: document.body.className,
      panel: measure(selectors.panel), context: measure(selectors.context), controls: measure(selectors.controls),
      actions: measure(selectors.actions ?? selectors.controls), hint: measure(selectors.hint), navigation: measure(selectors.navigation),
      buttons: [...document.querySelectorAll(`${selectors.actions ?? selectors.controls} button`)].map((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { text: button.innerText.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height, font: style.font, lineHeight: style.lineHeight, padding: style.padding, gap: style.gap };
      }),
    };
  }, item);
  result.cases.push({ name: item.name, url: item.url, ...measurements });
  await page.close();
}

await browser.close();
const outputPath = path.join(outDir, `a-panel-measure-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`);
await fs.writeFile(outputPath, JSON.stringify(result, null, 2), 'utf8');
process.stdout.write(JSON.stringify({ outputPath, ...result }, null, 2));
