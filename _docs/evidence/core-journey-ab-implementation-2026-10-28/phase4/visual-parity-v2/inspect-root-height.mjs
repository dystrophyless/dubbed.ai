import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const outDir = path.join(root, `root-height-diagnostic-${stamp}`);
const report = {
  at: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  purpose: 'Compare normalized prototype and React outer-node bounds at the exact Record viewports; content geometry is captured separately in parity-metrics.json.',
  rows: [],
};
await fs.mkdir(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  report.browser = `Chrome ${browser.version()}`;
  for (const layout of ['A', 'B']) {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'short', width: 1280, height: 600 }]) {
      for (const target of ['prototype', 'app']) {
        const port = layout === 'A' ? 5178 : 5179;
        const url = target === 'prototype'
          ? `http://127.0.0.1:${port}/`
          : `http://127.0.0.1:5180/projects/sintel-prepared/record?layout=${layout}&locale=en`;
        const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        if (target === 'prototype') await page.addStyleTag({ content: '.lab,.fixture-credit{display:none!important}' });
        await page.waitForFunction(() => {
          const v = document.querySelector('.scene video');
          return document.fonts?.status === 'loaded' && v instanceof HTMLVideoElement
            && v.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && v.videoWidth > 0;
        }, null, { timeout: 25000 });
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await page.waitForTimeout(500);
        const metrics = await page.evaluate(() => {
          const box = selector => {
            const el = document.querySelector(selector);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return { selector, tag: el.tagName, id: el.id, className: el.className,
              display: s.display, visibility: s.visibility, position: s.position,
              x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom,
              margin: s.margin, padding: s.padding, minHeight: s.minHeight, overflow: s.overflow };
          };
          return {
            url: location.href, viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY],
            document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
            fontReady: document.fonts?.status === 'loaded',
            body: box('body'), root: box('#root'), product: box('#product'), main: box('#main'),
            fixtureCredit: box('.fixture-credit'), lab: box('.lab'), performance: box('.performance'),
          };
        });
        report.rows.push({ layout, target, viewport: viewport.name, ...metrics });
        await context.close();
      }
    }
  }
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(report, null, 2), 'utf8');
  process.stdout.write(JSON.stringify({ outDir, browser: report.browser, browserTempPath: report.browserTempPath, rows: report.rows }, null, 2));
} finally {
  await browser.close();
}
