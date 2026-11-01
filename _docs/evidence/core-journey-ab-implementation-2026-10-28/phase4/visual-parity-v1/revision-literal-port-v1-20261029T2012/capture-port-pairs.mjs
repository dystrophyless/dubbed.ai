import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, 'captures-' + new Date().toISOString().replaceAll(':', '').replaceAll('.', '-'));
const appOrigin = 'http://127.0.0.1:5180';
const longRussian = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'short-1280x600', width: 1280, height: 600 },
  { name: 'phone-390x844', width: 390, height: 844 },
];
const evidence = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  input: 'Prototype candidate is simulated with synthetic waveform. App candidate is captured by Chrome fake media input using real getUserMedia and MediaRecorder; not a physical microphone.',
  longRussianFixture: longRussian,
  stressTextMethod: 'After a candidate was prepared, this exact sentence was injected into the rendered dialogue paragraph for the 1280x600 and 390x844 screenshots only.',
  captures: [],
  stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'progress.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(evidence, null, 2), 'utf8');

function selectors(layout) {
  return {
    header: layout === 'A' ? '.project-header' : '.studio-header',
    controls: layout === 'A' ? '.performance-actions' : '.studio-controls',
    title: '#heading',
    line: '#position',
    panel: '.performance',
  };
}

async function state(page, layout, kind, stressText) {
  return page.evaluate(({ layout, kind, stressText }) => {
    const select = selectors => document.querySelector(selectors);
    const bounds = selector => {
      const node = select(selector);
      if (!node || node.hidden || getComputedStyle(node).display === 'none') return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        display: style.display, font: style.font, color: style.color, background: style.backgroundColor,
        border: style.border, radius: style.borderRadius, padding: style.padding, gap: style.gap,
      };
    };
    const headerSelector = layout === 'A' ? '.project-header' : '.studio-header';
    const controlsSelector = layout === 'A' ? '.performance-actions' : '.studio-controls';
    const stage = select('.scene');
    const video = select('#scene');
    const waveform = select('.wave');
    const svgTake = select('.waveform-take');
    const svgSource = select('.waveform-source');
    const svgCursor = select('.waveform-cursor');
    const main = select('#main');
    const waveformPaint = element => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return { fill: style.fill, fillOpacity: style.fillOpacity, stroke: style.stroke, strokeWidth: style.strokeWidth };
    };
    const rect = selector => bounds(selector);
    return {
      layout, kind, url: location.href, viewport: { width: innerWidth, height: innerHeight },
      scroll: { x: scrollX, y: scrollY, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      prototypeChromeOffset: kind === 'prototype' && innerWidth < 768 ? (select('.lab')?.getBoundingClientRect().height ?? 0) : 0,
      mainFit: main ? { mediaWidth: main.style.getPropertyValue('--media-width'), workspaceWidth: main.style.getPropertyValue('--workspace-width'), studioWidth: main.style.getPropertyValue('--studio-width') } : null,
      header: bounds(headerSelector), title: bounds('#heading'), dots: bounds('#dots'), exit: bounds('#exit'),
      media: bounds('.scene'), dialogue: bounds('.script'), dialogueText: select('#dialogue')?.textContent?.trim() ?? null,
      waveform: bounds('.wave'), timeline: bounds('.timeline'), timelineMeta: bounds('.timeline-meta'),
      waveformPaint: { source: waveformPaint(svgSource), take: waveformPaint(svgTake), cursor: waveformPaint(svgCursor) },
      seek: rect('#scrub'), volume: rect('#volume'),
      panel: bounds('.performance'), controls: bounds(controlsSelector), saved: select('#saved')?.textContent?.trim() ?? null,
      nextDisabled: select('#next')?.disabled ?? null, takeDisabled: select('#take')?.disabled ?? null,
      takeWaveformPresent: Boolean(svgTake), takeWaveformPathLength: svgTake?.getAttribute('d')?.length ?? 0,
      takeWaveformActive: waveform?.classList.contains('is-take-active') ?? false,
      sourceVideo: video instanceof HTMLVideoElement ? { width: video.videoWidth, height: video.videoHeight, paused: video.paused } : null,
      fontFace: getComputedStyle(select('#dialogue')).fontFamily,
      viewportOverflow: document.documentElement.scrollWidth > innerWidth,
      stressText,
    };
  }, { layout, kind, stressText });
}

async function capture(page, layout, name, kind, stressText) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(180);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const measured = await state(page, layout, kind, stressText);
  const image = name + '.png';
  await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
  evidence.captures.push({ image, ...measured });
  await save();
}

async function injectStress(page) {
  await page.evaluate(text => {
    const dialogue = document.querySelector('#dialogue');
    if (!dialogue) throw new Error('The prototype-compatible dialogue node is absent.');
    dialogue.textContent = text;
  }, longRussian);
}

let browser;
try {
  await fs.mkdir(outDir, { recursive: true });
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  evidence.browser = 'Chrome ' + browser.version();
  for (const layout of ['A', 'B']) {
    for (const target of [
      { kind: 'prototype', url: layout === 'A' ? 'http://127.0.0.1:5178/' : 'http://127.0.0.1:5179/' },
      { kind: 'app', url: appOrigin + '/projects/sintel-prepared/record?layout=' + layout + '&locale=en' },
    ]) {
      const contextOptions = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' };
      const context = await browser.newContext(target.kind === 'app' ? { ...contextOptions, permissions: ['microphone'] } : contextOptions);
      if (target.kind === 'app') await context.grantPermissions(['microphone'], { origin: appOrigin });
      const page = await context.newPage();
      try {
        await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30_000 });
        await page.waitForFunction(() => {
          const video = document.querySelector('#scene');
          return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
        }, null, { timeout: 20_000 });
        await page.evaluate(() => document.fonts?.ready);
        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.waitForTimeout(160);
          await capture(page, layout, layout + '-' + target.kind + '-empty-' + viewport.name, layout + ' empty Record', false);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('#record').click();
        if (target.kind === 'prototype') {
          await page.waitForFunction(() => {
            const next = document.querySelector('#next');
            return next instanceof HTMLButtonElement && !next.disabled;
          }, null, { timeout: 12_000 });
        } else {
          await page.waitForFunction(() => document.querySelector('#saved')?.textContent?.trim() === 'New take'
            && document.querySelector('#take') instanceof HTMLButtonElement && !document.querySelector('#take').disabled,
          null, { timeout: 30_000 });
        }
        evidence.stages.push({ at: new Date().toISOString(), layout, source: target.kind,
          result: target.kind === 'app' ? 'actual MediaRecorder candidate saved from fake media input' : 'prototype simulated candidate state',
          saved: await page.locator('#saved').textContent().catch(() => null) });
        await save();
        await page.locator('#take').click();
        await page.waitForFunction(() => {
          const pause = document.querySelector('#pause');
          return pause instanceof HTMLButtonElement && !pause.hidden && getComputedStyle(pause).display !== 'none';
        }, null, { timeout: 8_000 });
        if ((await page.locator('#pause').textContent())?.trim().startsWith('Pause')
          || (await page.locator('#pause').textContent())?.trim().startsWith('Пауза')) {
          await page.locator('#pause').click();
        }
        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.waitForTimeout(180);
          const stress = viewport.width <= 1280;
          if (stress) await injectStress(page);
          await capture(page, layout, layout + '-' + target.kind + '-candidate-' + (stress ? 'long-ru-' : '') + viewport.name,
            layout + ' ' + (target.kind === 'app' ? 'actual captured candidate' : 'prototype simulated candidate'), stress);
        }
        evidence.stages.push({ at: new Date().toISOString(), layout, source: target.kind, result: 'all candidate-state viewport screenshots captured' });
        await save();
      } catch (error) {
        const raw = { at: new Date().toISOString(), layout, source: target.kind, url: page.url(),
          message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
        await fs.writeFile(path.join(outDir, layout + '-' + target.kind + '-raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
        evidence.failure = raw;
        await save('evidence.json');
        throw error;
      } finally {
        await context.close();
      }
    }
  }
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json');
  process.stdout.write(JSON.stringify({ outDir, browser: evidence.browser, browserTempPath: evidence.browserTempPath,
    captureCount: evidence.captures.length, stageCount: evidence.stages.length }, null, 2));
} catch (error) {
  if (!evidence.failure) {
    const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null };
    evidence.failure = raw;
    await fs.writeFile(path.join(outDir, 'raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
    await save('evidence.json');
  }
  throw error;
} finally {
  await browser?.close();
}
