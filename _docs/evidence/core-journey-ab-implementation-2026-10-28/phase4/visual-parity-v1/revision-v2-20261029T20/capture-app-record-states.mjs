import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const outDir = path.join(root, `app-record-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`);
const origin = 'http://127.0.0.1:5180';
const longRussian = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'short-1280x600', width: 1280, height: 600 },
  { name: 'phone-390x844', width: 390, height: 844 },
];
const evidence = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  nativeInput: 'Chrome fake media input recorded through real getUserMedia and MediaRecorder; not a physical microphone.',
  candidateSource: 'Actual captured browser Blob. Candidate was selected for visual comparison after capture.',
  longRussianFixture: longRussian,
  stressTextMethod: 'Injected into the rendered dialogue node for screenshot stress only; no product seed or persisted data changed.',
  captures: [],
  stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'progress.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(evidence, null, 2), 'utf8');

async function visualState(page, layout, kind, stressText) {
  return page.evaluate(({ layout, kind, stressText }) => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!element || element.hidden || getComputedStyle(element).display === 'none') return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        font: style.font, color: style.color, background: style.backgroundColor, border: style.border,
        radius: style.borderRadius, padding: style.padding, gap: style.gap, display: style.display };
    };
    const video = document.querySelector('.media-viewport video');
    const takePath = document.querySelector('.waveform-take');
    const pageNode = document.querySelector('.record-page');
    const stage = document.querySelector('.media-viewport');
    const stageRect = stage?.getBoundingClientRect();
    return {
      layout, kind, url: location.href, viewport: { width: innerWidth, height: innerHeight },
      scroll: { x: scrollX, y: scrollY, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      projectTitle: document.querySelector('.record-header__title h1')?.textContent?.trim() ?? null,
      lineCount: document.querySelector('.record-header__line-count, .record-panel__context')?.textContent?.trim() ?? null,
      header: bounds('.record-header'), title: bounds('.record-header__title'), dots: bounds('.position-dots'),
      exit: bounds('.record-header .exit-link'), media: bounds('.media-viewport'),
      video: video instanceof HTMLVideoElement ? { width: video.videoWidth, height: video.videoHeight, paused: video.paused } : null,
      dialogue: bounds('.dialogue-copy'), dialogueText: document.querySelector('.dialogue-copy p')?.textContent?.trim() ?? null,
      waveform: bounds('.waveform-row'), waveformMeta: bounds('.waveform-meta'),
      takeWaveformPresent: Boolean(takePath), takeWaveformActive: document.querySelector('.waveform-row')?.classList.contains('is-take-active') ?? false,
      takeWaveformPathLength: takePath?.getAttribute('d')?.length ?? 0,
      panel: bounds('.record-panel'), actions: bounds('.record-performance, .record-studio-actions'),
      status: bounds('.record-panel__context, .record-status--b'),
      buttons: [...document.querySelectorAll('.record-performance button, .record-studio-actions button')].map((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { text: button.innerText.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          padding: style.padding, gap: style.gap, borderRadius: style.borderRadius,
          icons: [...button.querySelectorAll('svg')].map((icon) => getComputedStyle(icon).display) };
      }),
      mediaWidthVariable: pageNode?.style.getPropertyValue('--record-media-width') ?? null,
      stageTop: stageRect?.top ?? null,
      fixtureSource: video?.getAttribute('src') ?? video?.currentSrc ?? null,
      takeSelected: document.querySelector('.record-source-take')?.getAttribute('aria-pressed') ?? null,
      candidateStatus: document.querySelector('.record-take-status')?.textContent?.trim() ?? null,
      stressText,
    };
  }, { layout, kind, stressText });
}

async function capture(page, layout, name, kind, stressText) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(120);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const state = await visualState(page, layout, kind, stressText);
  const image = `${name}.png`;
  await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
  evidence.captures.push({ image, ...state });
  await save();
}

let browser;
try {
  await fs.mkdir(outDir, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  evidence.browser = `Chrome ${browser.version()}`;
  for (const layout of ['A', 'B']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
      reducedMotion: 'reduce', permissions: ['microphone'] });
    await context.grantPermissions(['microphone'], { origin });
    const page = await context.newPage();
    try {
      await page.goto(`${origin}/projects/sintel-prepared/record?layout=${layout}&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForFunction(() => {
        const video = document.querySelector('.media-viewport video');
        return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
      }, null, { timeout: 20_000 });
      await page.evaluate(() => document.fonts?.ready);
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(150);
        await capture(page, layout, `${layout}-app-empty-${viewport.name}`, `${layout} empty Record state`, false);
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.locator('.record-action').click();
      await page.waitForFunction(() => Boolean(document.querySelector('.waveform-take'))
        && document.querySelector('.record-action')?.getAttribute('aria-busy') === 'false'
        && document.querySelector('.record-take-status')?.textContent?.trim() === 'New take', null, { timeout: 25_000 });
      evidence.stages.push({ at: new Date().toISOString(), layout, status: 'actual native browser candidate saved', url: page.url() });
      await save();
      await page.locator('.record-source-take').click();
      await page.locator('.waveform-row.is-take-active').waitFor({ state: 'attached', timeout: 5_000 });
      const pause = page.locator('.record-audition-pause');
      if (await pause.isVisible()) await pause.click();
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(180);
        const isStress = viewport.width <= 1280;
        if (isStress) {
          await page.evaluate((text) => {
            const dialogue = document.querySelector('.dialogue-copy p');
            if (!dialogue) throw new Error('Dialogue node missing for long Russian screenshot stress.');
            dialogue.textContent = text;
          }, longRussian);
        }
        await capture(page, layout, `${layout}-app-candidate-${isStress ? 'long-ru-' : ''}${viewport.name}`,
          `${layout} actual captured candidate${isStress ? ' with injected long Russian stress copy' : ''}`, isStress);
      }
      await context.close();
    } catch (error) {
      const raw = { at: new Date().toISOString(), layout, url: page.url(), message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null };
      await fs.writeFile(path.join(outDir, `${layout}-raw-error.json`), JSON.stringify(raw, null, 2), 'utf8');
      evidence.failure = raw;
      await save('evidence.json');
      throw error;
    }
  }
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json');
  process.stdout.write(JSON.stringify({ outDir, browser: evidence.browser, browserTempPath: evidence.browserTempPath,
    captures: evidence.captures.length, stages: evidence.stages }, null, 2));
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
