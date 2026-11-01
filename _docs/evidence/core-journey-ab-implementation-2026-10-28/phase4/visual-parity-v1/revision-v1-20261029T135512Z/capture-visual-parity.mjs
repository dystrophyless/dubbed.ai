import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const outDir = path.join(root, `app-parity-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`);
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
  nativeInput: 'Chrome fake media input recorded through the real browser getUserMedia/MediaRecorder path; not a physical microphone.',
  resultProvenance: 'Illustrative mock generation only. Product rendered=false and assembledFromAcceptedTakes=false; the fixed sample is not a user dub.',
  longRussianFixture: longRussian,
  stressTextMethod: 'Injected into the rendered dialogue node for screenshot stress only; no product seed or persisted data changed.',
  captures: [],
  stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'progress.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(evidence, null, 2), 'utf8');

async function visualState(page, kind) {
  return page.evaluate(({ kind }) => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!element || element.hidden || getComputedStyle(element).display === 'none') return null;
      const r = element.getBoundingClientRect();
      const c = getComputedStyle(element);
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
        font: c.font, color: c.color, backgroundColor: c.backgroundColor, borderRadius: c.borderRadius,
        padding: c.padding, gap: c.gap, display: c.display };
    };
    const take = document.querySelector('.waveform-take');
    const video = document.querySelector('[data-testid="result-video"], .media-viewport video');
    const status = document.querySelector('.record-panel__context, .record-status--b');
    return {
      kind, url: location.href, viewport: { width: innerWidth, height: innerHeight },
      scroll: { y: scrollY, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      font: getComputedStyle(document.body).fontFamily,
      projectTitle: document.querySelector('.record-header__title h1')?.textContent?.trim() ?? null,
      header: bounds('.record-header'), media: bounds('.media-viewport'), dialogue: bounds('.dialogue-copy'),
      dialogueText: document.querySelector('.dialogue-copy p')?.textContent?.trim() ?? null,
      waveform: bounds('.waveform-row'), waveformMeta: bounds('.waveform-meta'),
      takeWaveformPresent: Boolean(take), takeWaveformPathLength: take?.getAttribute('d')?.length ?? 0,
      takeWaveformActive: document.querySelector('.waveform-row')?.classList.contains('is-take-active') ?? false,
      panel: bounds('.record-panel'), controls: bounds('.record-controls--a, .record-controls--b'),
      actions: bounds('.record-performance, .record-studio-actions'), statusRow: bounds('.record-panel__context, .record-status--b'),
      statusText: status?.textContent?.trim() ?? null,
      recordLabel: document.querySelector('.record-action')?.textContent?.trim() ?? null,
      nextLabel: document.querySelector('.record-next-action')?.textContent?.trim() ?? null,
      hint: document.querySelector('.record-candidate-hint, .record-next-hint')?.textContent?.trim() ?? null,
      notice: document.querySelector('.record-panel .notice, .record-status--b .notice')?.textContent?.trim() ?? null,
      resultPlayer: bounds('.result-player__screen'), resultTransport: bounds('.result-player__transport'),
      resultStatus: [...document.querySelectorAll('.result-workspace__status')].map((e) => e.innerText.trim()).join('\n') || null,
      resultVideo: video instanceof HTMLVideoElement ? {
        currentSrc: video.currentSrc, readyState: video.readyState, videoWidth: video.videoWidth, videoHeight: video.videoHeight,
        duration: Number.isFinite(video.duration) ? video.duration : null, paused: video.paused,
        source: video.dataset.source ?? null, generationId: video.dataset.generationId ?? null,
      } : null,
    };
  }, { kind });
}

async function capture(page, name, kind) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(180);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const state = await visualState(page, kind);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false, animations: 'disabled' });
  evidence.captures.push({ image: `${name}.png`, ...state });
  await save();
  return state;
}

async function waitPreparedVideo(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.media-viewport video');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  await page.evaluate(() => document.fonts?.ready);
}

async function recordNativeCandidate(page) {
  await page.locator('.record-action').click();
  await page.waitForFunction(() => {
    const action = document.querySelector('.record-action');
    const status = document.querySelector('.record-take-status');
    return Boolean(document.querySelector('.waveform-take')) && action?.getAttribute('aria-busy') === 'false'
      && status?.textContent?.trim() === 'New take';
  }, null, { timeout: 25_000 });
}

async function captureCandidate(page, layout, prefix) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.record-source-take').click();
  await page.locator('.waveform-row.is-take-active').waitFor({ state: 'attached', timeout: 5_000 });
  await capture(page, `${prefix}-${layout}-candidate-desktop-1440x900`, `${layout} candidate with actual captured take active`);
  const pause = page.locator('.record-audition-pause');
  if (await pause.isVisible()) await pause.click();
  for (const viewport of viewports.slice(1)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(220);
    await page.evaluate((text) => {
      const dialogue = document.querySelector('.dialogue-copy p');
      if (!dialogue) throw new Error('Dialogue node missing for the long-Russian stress capture.');
      dialogue.textContent = text;
    }, longRussian);
    await capture(page, `${prefix}-${layout}-candidate-long-ru-${viewport.name}`, `${layout} candidate with actual take and injected long Russian stress copy`);
  }
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  evidence.browser = `Chrome ${browser.version()}`;
  for (const layout of ['A', 'B']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', permissions: ['microphone'] });
    await context.grantPermissions(['microphone'], { origin });
    const page = await context.newPage();
    await page.goto(`${origin}/projects/sintel-prepared/record?layout=${layout}&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
    await waitPreparedVideo(page);
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await capture(page, `${layout}-app-empty-${viewport.name}`, `${layout} empty Record state`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await recordNativeCandidate(page);
    evidence.stages.push({ at: new Date().toISOString(), stage: `${layout} native candidate saved`, status: 'ready', url: page.url(), candidatePersistedInUI: true });
    await save();
    await captureCandidate(page, layout, 'app');
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', permissions: ['microphone'] });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  await page.goto(`${origin}/projects/sintel-prepared/record?layout=B&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
  await waitPreparedVideo(page);
  for (let turn = 1; turn <= 3; turn += 1) {
    await recordNativeCandidate(page);
    await page.locator('.record-next-action').click();
    if (turn < 3) {
      await page.waitForFunction((nextTurn) => document.querySelector('.record-header__line-count')?.textContent?.includes(`Line ${nextTurn} / 3`), turn + 1, { timeout: 15_000 });
    }
  }
  await page.waitForURL(/\/result\?layout=B&snapshot=/, { timeout: 20_000 });
  await page.getByText('Illustrative sample ready', { exact: true }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-testid="result-video"]');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  evidence.stages.push({ at: new Date().toISOString(), stage: 'B three-window native capture Result', status: 'ready', url: page.url(), sampleIsIllustrative: true });
  await save();
  for (const [layout, currentPage] of [['B', page]]) {
    for (const viewport of viewports) {
      await currentPage.setViewportSize({ width: viewport.width, height: viewport.height });
      await capture(currentPage, `${layout}-app-result-${viewport.name}`, `${layout} Result from a three-window native-browser capture journey`);
    }
  }
  const resultUrl = new URL(page.url());
  resultUrl.searchParams.set('layout', 'A');
  await page.goto(resultUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByText('Illustrative sample ready', { exact: true }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-testid="result-video"]');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  evidence.stages.push({ at: new Date().toISOString(), stage: 'A Result with same persisted snapshot', status: 'ready', url: page.url() });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await capture(page, `A-app-result-${viewport.name}`, 'A Result with the same authorized immutable snapshot');
  }
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json');
  console.log(JSON.stringify({ outDir, browser: evidence.browser, captureCount: evidence.captures.length, stages: evidence.stages.map(({ stage, status }) => ({ stage, status })) }, null, 2));
} catch (error) {
  const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  await fs.writeFile(path.join(outDir, 'raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
  evidence.finishedAt = new Date().toISOString();
  evidence.failure = raw;
  await save();
  throw error;
} finally { await browser?.close(); }
