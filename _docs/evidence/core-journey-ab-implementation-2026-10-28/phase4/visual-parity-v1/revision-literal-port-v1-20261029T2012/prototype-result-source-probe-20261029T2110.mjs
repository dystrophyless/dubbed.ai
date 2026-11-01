import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = 'D:/Program/python/Dubbed';
const viewports = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'short', width: 1280, height: 600 }, { name: 'phone', width: 390, height: 844 }];
const outDir = path.join(root, 'prototype-result-probe-' + new Date().toISOString().replaceAll(':', '').replaceAll('.', '-'));
const report = { at: new Date().toISOString(), browserTempPath: os.tmpdir(), captures: [], errors: [] };
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  report.browser = `Chrome ${browser.version()}`;
  for (const [layout, port] of [['A', 5178], ['B', 5179]]) {
    const key = layout === 'A' ? 'dubbed-lowfi-v1' : 'dubbed-studio-lowfi-v1';
    const statePath = path.join(workspace, 'prototypes', 'core-journey-studio', 'evidence', 'result-player-v6', 'completed-fixture-state.json');
    const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
    state.view = 'result';
    state.locale = 'en';
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await context.addInitScript(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(state))});`);
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ layout, message: error.message }));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForFunction(() => {
      const player = document.querySelector('#result-player');
      return player && !player.hidden && document.querySelector('#result-play') instanceof HTMLButtonElement;
    }, null, { timeout: 15000 });
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => document.fonts?.ready);
      await page.waitForTimeout(150);
      const metrics = await page.evaluate(({ layout, viewport }) => {
        const box = selector => {
          const node = document.querySelector(selector);
          if (!node) return null;
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { text: node.textContent?.trim() ?? '', hidden: node.hidden, display: style.display, visibility: style.visibility,
            opacity: style.opacity, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            margin: style.margin, padding: style.padding, font: style.font, color: style.color };
        };
        return { layout, viewport, url: location.href, scrollY,
          main: box('#main'), header: box('.project-header, .studio-header'), titleWrap: box('.project-heading, .studio-title'),
          heading: box('#heading'), projectName: box('#result-project'), dots: box('#dots'), position: box('#position'),
          resultView: box('#result-view'), stage: box('.result-stage'), player: box('#result-player'), bottom: box('.result-bottom'), lab: box('.lab') };
      }, { layout, viewport: [viewport.width, viewport.height] });
      const image = `${layout}-result-${viewport.name}.png`;
      await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
      report.captures.push({ image, ...metrics });
    }
    await context.close();
  }
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(JSON.stringify({ outDir, browser: report.browser, browserTempPath: report.browserTempPath, captures: report.captures, errors: report.errors }, null, 2));
} finally {
  await browser.close();
}
