import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const outDir = path.join(root, `prototype-candidate-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`);
const sentence = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'short-1280x600', width: 1280, height: 600 },
  { name: 'phone-390x844', width: 390, height: 844 },
];
const evidence = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  purpose: 'Capture the frozen A/B prototype candidate state for a visual comparison against real app candidates.',
  provenance: 'Prototype-only simulated capture and synthetic waveform. This is not native media or product behavior evidence.',
  longRussianFixture: sentence,
  stressTextMethod: 'Injected into the rendered prototype dialogue node after its candidate simulation; no prototype source files or state logic were edited.',
  captures: [], stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'progress.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(evidence, null, 2), 'utf8');

async function state(page, layout, viewportName, stressText) {
  return page.evaluate(({ layout, viewportName, stressText }) => {
    const rect = (...selectors) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (!element || element.hidden || getComputedStyle(element).display === 'none') continue;
        const r = element.getBoundingClientRect();
        const c = getComputedStyle(element);
        return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
          font: c.font, color: c.color, backgroundColor: c.backgroundColor, borderRadius: c.borderRadius,
          padding: c.padding, gap: c.gap, display: c.display };
      }
      return null;
    };
    return {
      layout, viewport: { width: innerWidth, height: innerHeight }, viewportName,
      url: location.href, title: document.title, bodyFont: getComputedStyle(document.body).fontFamily,
      projectTitle: document.querySelector('#heading')?.textContent?.trim() ?? null,
      dialogue: rect('#dialogue'), dialogueText: document.querySelector('#dialogue')?.textContent?.trim() ?? null,
      media: rect('.scene'), waveform: rect('.wave'), waveformMeta: rect('.timeline-meta'),
      controls: rect('.performance', '.studio-controls'),
      saved: document.querySelector('#saved')?.textContent?.trim() ?? null,
      takeEnabled: document.querySelector('#take') instanceof HTMLButtonElement && !document.querySelector('#take').disabled,
      pauseText: document.querySelector('#pause')?.textContent?.trim() ?? null,
      stressTextApplied: stressText,
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    };
  }, { layout, viewportName, stressText });
}

const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
try {
  evidence.browser = `Chrome ${browser.version()}`;
  for (const [layout, url] of [['A', 'http://127.0.0.1:5178/'], ['B', 'http://127.0.0.1:5179/']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage();
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.evaluate(() => document.fonts?.ready);
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(120);
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        const visual = await state(page, layout, viewport.name, false);
        const image = `${layout}-prototype-empty-${viewport.name}.png`;
        await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
        evidence.captures.push({ image, ...visual });
        await save();
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(120);
      await page.locator('#record').click();
      await page.waitForFunction(() => {
        const next = document.querySelector('#next');
        return next instanceof HTMLButtonElement && !next.disabled;
      }, null, { timeout: 10_000 });
      await page.locator('#take').click();
      await page.waitForFunction(() => {
        const pause = document.querySelector('#pause');
        return pause && !pause.hidden && getComputedStyle(pause).display !== 'none';
      }, null, { timeout: 5_000 });
      await page.waitForTimeout(180);
      const pause = page.locator('#pause');
      if ((await pause.textContent())?.trim() === 'Pause') await pause.click();
      evidence.stages.push({ at: new Date().toISOString(), layout, status: 'candidate-simulated', saved: await page.locator('#saved').textContent() });
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(180);
        let stressText = false;
        if (viewport.width <= 1280) {
          await page.evaluate((text) => {
            const dialogue = document.querySelector('#dialogue');
            if (!dialogue) throw new Error('Prototype dialogue node is missing.');
            dialogue.textContent = text;
          }, sentence);
          stressText = true;
        }
        await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
        await page.evaluate(() => document.fonts?.ready);
        const visual = await state(page, layout, viewport.name, stressText);
        const image = `${layout}-prototype-candidate-${stressText ? 'long-ru-' : ''}${viewport.name}.png`;
        await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
        evidence.captures.push({ image, ...visual });
        await save();
      }
      evidence.stages.push({ at: new Date().toISOString(), layout, status: 'captured' });
    } catch (error) {
      const raw = { at: new Date().toISOString(), layout, url: page.url(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
      evidence.stages.push({ ...raw, status: 'failed' });
      await fs.writeFile(path.join(outDir, `${layout}-raw-error.json`), JSON.stringify(raw, null, 2), 'utf8');
    } finally { await context.close(); }
  }
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json');
  console.log(JSON.stringify({ outDir, browser: evidence.browser, captures: evidence.captures.map((capture) => capture.image), stages: evidence.stages.map(({ layout, status }) => ({ layout, status })) }, null, 2));
} finally { await browser.close(); }
