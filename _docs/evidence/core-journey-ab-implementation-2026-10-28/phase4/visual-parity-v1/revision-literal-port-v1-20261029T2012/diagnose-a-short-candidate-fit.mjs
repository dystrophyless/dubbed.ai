import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(root, 'a-short-candidate-fit-' + new Date().toISOString().replaceAll(':', '') + '.json');
const longText = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});
const data = { at: new Date().toISOString(), browser: browser.version(), temp: os.tmpdir(), runs: [] };
try {
  for (const [kind, url] of [
    ['prototype', 'http://127.0.0.1:5178/'],
    ['app', 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en'],
  ]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', permissions: kind === 'app' ? ['microphone'] : [] });
    if (kind === 'app') await context.grantPermissions(['microphone'], { origin: 'http://127.0.0.1:5180' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForFunction(() => document.querySelector('#scene')?.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    await page.evaluate(() => document.fonts?.ready);
    await page.locator('#record').click();
    if (kind === 'prototype') {
      await page.waitForFunction(() => document.querySelector('#next')?.disabled === false, null, { timeout: 12_000 });
    } else {
      await page.waitForFunction(() => document.querySelector('#saved')?.textContent?.trim() === 'New take', null, { timeout: 30_000 });
    }
    await page.locator('#take').click();
    await page.waitForFunction(() => document.querySelector('#pause')?.hidden === false && getComputedStyle(document.querySelector('#pause')).display !== 'none');
    if ((await page.locator('#pause').textContent())?.trim().startsWith('Pause')) await page.locator('#pause').click();
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(180);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
    await page.evaluate(() => {
      window.__fitTrace = [];
      const snapshot = phase => {
        const node = selector => document.querySelector(selector);
        const rehearsal = node('.rehearsal');
        const rect = element => element ? { x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y } : null;
        const main = node('#main');
        return { phase, innerWidth, innerHeight, scrollY, mediaWidth: main?.style.getPropertyValue('--media-width'),
          rehearsal: rect(rehearsal), scriptHeight: node('.script')?.offsetHeight, timelineHeight: node('.timeline')?.offsetHeight,
          timelineGap: getComputedStyle(node('.timeline')).marginTop };
      };
      window.addEventListener('resize', () => {
        window.__fitTrace.push(snapshot('resize-capture'));
        queueMicrotask(() => window.__fitTrace.push(snapshot('resize-microtask')));
        requestAnimationFrame(() => window.__fitTrace.push(snapshot('resize-frame')));
        setTimeout(() => window.__fitTrace.push(snapshot('resize-timeout')), 50);
      }, true);
    });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(160);
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.waitForTimeout(160);
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
        kind, label, viewport: { width: innerWidth, height: innerHeight }, scrollY, activeElement: document.activeElement?.id,
        mainClass: main?.className, customProperties: main ? {
          mediaWidth: main.style.getPropertyValue('--media-width'),
          workspaceWidth: main.style.getPropertyValue('--workspace-width'),
          panelWidth: main.style.getPropertyValue('--panel-width'),
        } : null,
        main: one('#main'), rehearsal: one('.rehearsal'), scene: one('.scene'), script: one('.script'),
        dialogue: one('#dialogue'), timeline: one('.timeline'), wave: one('.wave'), scrub: one('#scrub'),
        meta: one('.timeline-meta'), panel: one('.performance'), controls: one('.performance-actions'),
      };
    }, { kind, label }));
    await inspect('candidate source with original text');
    await page.evaluate(text => { document.querySelector('#dialogue').textContent = text; }, longText);
    await inspect('candidate long text before resize');
    await page.evaluate(() => window.dispatchEvent(new Event('resize')));
    await page.waitForTimeout(150);
    await inspect('candidate long text after resize fit');
    data.runs[data.runs.length - 1].resizeTrace = await page.evaluate(() => window.__fitTrace ?? []);
    await page.close();
    await context.close();
  }
  await fs.writeFile(output, JSON.stringify(data, null, 2), 'utf8');
  process.stdout.write(output);
} finally {
  await browser.close();
}
