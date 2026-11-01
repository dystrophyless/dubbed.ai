import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const base = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const outDir = path.join(base, `connected-${stamp}`);
const longRussian = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const origin = 'http://127.0.0.1:5180';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'short-1280x600', width: 1280, height: 600 },
  { name: 'phone-390x844', width: 390, height: 844 },
];
const evidence = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  nativeInput: 'Chrome fake media input through real browser MediaRecorder; not a physical microphone.',
  resultProvenance: 'Illustrative mock generation. Product rendered=false and assembledFromAcceptedTakes=false; no user dub or real render is claimed.',
  longRussianFixture: longRussian,
  stressTextMethod: 'Injected into the already-rendered dialogue node for screenshots only; no product seed or persisted data was changed.',
  referenceResultMethod: 'Frozen prototype simulation controls were used only to reach their authored Result composition; not product behavior evidence.',
  captures: [],
  stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async (name, value) => fs.writeFile(path.join(outDir, name), JSON.stringify(value, null, 2), 'utf8');
const logStage = async (stage, status, detail = {}) => {
  evidence.stages.push({ at: new Date().toISOString(), stage, status, ...detail });
  await save('progress.json', evidence);
};

function safeRect(element) {
  if (!element) return null;
  const r = element.getBoundingClientRect();
  const c = getComputedStyle(element);
  return {
    x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
    font: c.font, color: c.color, backgroundColor: c.backgroundColor, borderRadius: c.borderRadius,
    padding: c.padding, gap: c.gap, display: c.display, position: c.position,
  };
}

async function readVisualState(page, kind) {
  return page.evaluate(({ kind }) => {
    const rect = (...selectors) => {
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && getComputedStyle(element).display !== 'none' && !element.hidden) return safeRect(element);
      }
      return null;
    };
    const safeRect = (element) => {
      const r = element.getBoundingClientRect();
      const c = getComputedStyle(element);
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom,
        font: c.font, color: c.color, backgroundColor: c.backgroundColor, borderRadius: c.borderRadius,
        padding: c.padding, gap: c.gap, display: c.display, position: c.position };
    };
    const takeWave = document.querySelector('.waveform-take');
    const media = document.querySelector('.media-viewport video, #scene, .result-player__screen video, #result');
    const notice = document.querySelector('.record-panel .notice, .record-status--b .notice, #saved');
    const resultVideo = document.querySelector('[data-testid="result-video"], #result');
    return {
      kind,
      url: location.href,
      title: document.title,
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { y: scrollY, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      font: getComputedStyle(document.body).fontFamily,
      header: rect('.record-header', '.studio-header', '.record-header__title'),
      title: document.querySelector('.record-header__title h1, #heading')?.textContent?.trim() ?? null,
      media: rect('.media-viewport', '.scene', '.result-player__screen', '.result-picture'),
      dialogue: rect('.dialogue-copy', '.script'),
      dialogueText: document.querySelector('.dialogue-copy p, #dialogue')?.textContent?.trim() ?? null,
      waveform: rect('.waveform-row', '.wave'),
      takeWaveformPresent: Boolean(takeWave),
      takeWaveformPathLength: takeWave?.getAttribute('d')?.length ?? 0,
      waveformTakeActive: document.querySelector('.waveform-row')?.classList.contains('is-take-active') ?? false,
      panel: rect('.record-panel', '.performance'),
      actions: rect('.record-studio-actions', '.record-controls', '.performance-actions'),
      notice: notice?.textContent?.trim() ?? null,
      buttons: [...document.querySelectorAll('button')].filter((button) => {
        const style = getComputedStyle(button);
        return style.display !== 'none' && !button.hidden;
      }).map((button) => ({ text: button.innerText.trim(), disabled: button.disabled, className: button.className })),
      resultPlayer: rect('.result-player__screen', '.result-picture'),
      resultTransport: rect('.result-player__transport', '.result-transport'),
      resultNotice: document.body.innerText.includes('Illustrative sample ready') ? 'Illustrative sample ready' : null,
      resultProvenanceVisible: document.body.innerText.includes('not rendered from accepted takes')
        || document.body.innerText.includes('not rendered')
        || document.body.innerText.includes('illustrative'),
      resultVideo: resultVideo ? {
        currentSrc: resultVideo.currentSrc,
        readyState: resultVideo.readyState,
        videoWidth: resultVideo.videoWidth,
        videoHeight: resultVideo.videoHeight,
        duration: Number.isFinite(resultVideo.duration) ? resultVideo.duration : null,
        paused: resultVideo.paused,
        currentTime: resultVideo.currentTime,
        source: resultVideo.dataset.source ?? null,
        generationId: resultVideo.dataset.generationId ?? null,
      } : null,
      mediaState: media ? {
        currentSrc: media.currentSrc,
        readyState: media.readyState,
        videoWidth: media.videoWidth,
        videoHeight: media.videoHeight,
        currentTime: media.currentTime,
        paused: media.paused,
      } : null,
    };
  }, { kind });
}

async function capture(page, name, kind, screenshotOptions = {}) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(180);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const state = await readVisualState(page, kind);
  const imageName = `${name}.png`;
  await page.screenshot({ path: path.join(outDir, imageName), fullPage: false, animations: 'disabled', ...screenshotOptions });
  evidence.captures.push({ image: imageName, ...state });
  await save('progress.json', evidence);
  return state;
}

async function waitPreparedVideo(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.media-viewport video, #scene');
    return video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  await page.evaluate(() => document.fonts?.ready);
}

async function recordCandidate(page) {
  await page.locator('.record-action').click();
  await page.locator('.waveform-take').waitFor({ state: 'attached', timeout: 20_000 });
  await page.getByText('Take saved as a recoverable candidate. It has not been accepted.', { exact: true }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const button = document.querySelector('.record-action');
    return button?.getAttribute('aria-busy') === 'false' && Boolean(document.querySelector('.waveform-take'));
  }, null, { timeout: 10_000 });
}

async function captureCandidateViews(page, prefix, layout) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('.record-source-take').click();
  await page.locator('.waveform-row.is-take-active').waitFor({ state: 'attached', timeout: 5_000 });
  await capture(page, `${prefix}-${layout}-candidate-take-active-desktop-1440x900`, `${layout} candidate with recorded take active`);
  const pause = page.locator('.record-audition-pause');
  if (await pause.isVisible()) await pause.click();
  for (const viewport of viewports.slice(1)) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(250);
    await page.evaluate((text) => {
      const target = document.querySelector('.dialogue-copy p');
      if (!target) throw new Error('Rendered dialogue is missing for the Russian stress screenshot.');
      target.textContent = text;
    }, longRussian);
    await capture(page, `${prefix}-${layout}-candidate-long-ru-${viewport.name}`, `${layout} saved candidate and paused real take; in-memory long Russian visual stress`);
  }
}

async function capturePrototypeResult(browser, layout, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.evaluate(() => document.fonts?.ready);
    for (let turn = 1; turn <= 3; turn += 1) {
      await page.locator('#record').click();
      await page.locator('#next').waitFor({ state: 'visible', timeout: 3_000 });
      await page.waitForFunction(() => {
        const button = document.querySelector('#next');
        return button instanceof HTMLButtonElement && !button.disabled;
      }, null, { timeout: 8_000 });
      await page.locator('#next').click();
    }
    await page.waitForFunction(() => {
      const result = document.querySelector('#result-view');
      const player = document.querySelector('#result-player');
      return result && !result.hidden && player && !player.hidden;
    }, null, { timeout: 15_000 });
    await page.waitForFunction(() => {
      const video = document.querySelector('#result');
      return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
    }, null, { timeout: 15_000 });
    await logStage(`${layout} frozen prototype Result simulation`, 'ready', { url: page.url(), note: 'Prototype-only simulated input/assembly; screenshots are visual reference only.' });
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await capture(page, `${layout}-prototype-result-${viewport.name}`, `${layout} frozen prototype Result reference`);
    }
  } catch (error) {
    const detail = { message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null, url: page.url() };
    evidence.stages.push({ at: new Date().toISOString(), stage: `${layout} frozen prototype Result simulation`, status: 'failed', ...detail });
    await save(`${layout}-prototype-result-error.json`, detail);
    await save('progress.json', evidence);
  } finally {
    await context.close();
  }
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  evidence.browser = `Chrome ${browser.version()}`;
  await save('progress.json', evidence);

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', acceptDownloads: true,
    permissions: ['microphone'],
  });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  await page.goto(`${origin}/projects/sintel-prepared/record?layout=B&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
  await waitPreparedVideo(page);
  await recordCandidate(page);
  await logStage('B real-browser candidate', 'ready', { url: page.url(), nativeMedia: true, accepted: false });
  await captureCandidateViews(page, 'app', 'B');
  await page.setViewportSize({ width: 1440, height: 900 });
  for (let turn = 1; turn <= 3; turn += 1) {
    if (turn > 1) await recordCandidate(page);
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
  await logStage('B real-browser three-window Result', 'ready', { url: page.url(), sampleIsIllustrative: true, snapshotCaptured: true });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await capture(page, `B-app-result-${viewport.name}`, 'B Result from a completed native-browser capture journey');
  }
  const resultUrl = new URL(page.url());
  resultUrl.searchParams.set('layout', 'A');
  await page.goto(resultUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByText('Illustrative sample ready', { exact: true }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-testid="result-video"]');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  await logStage('A Result layout with the same persisted snapshot', 'ready', { url: page.url(), note: 'Same authorized immutable snapshot; only the approved local layout override changed.' });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await capture(page, `A-app-result-${viewport.name}`, 'A Result with the same completed journey snapshot');
  }
  await context.close();

  const contextA = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', permissions: ['microphone'],
  });
  await contextA.grantPermissions(['microphone'], { origin });
  const pageA = await contextA.newPage();
  await pageA.goto(`${origin}/projects/sintel-prepared/record?layout=A&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
  await waitPreparedVideo(pageA);
  await recordCandidate(pageA);
  await logStage('A real-browser candidate', 'ready', { url: pageA.url(), nativeMedia: true, accepted: false });
  await captureCandidateViews(pageA, 'app', 'A');
  await contextA.close();

  await capturePrototypeResult(browser, 'A', 'http://127.0.0.1:5178/');
  await capturePrototypeResult(browser, 'B', 'http://127.0.0.1:5179/');
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json', evidence);
  console.log(JSON.stringify({ outDir, browser: evidence.browser, captureCount: evidence.captures.length, stages: evidence.stages.map(({ stage, status }) => ({ stage, status })) }, null, 2));
} catch (error) {
  const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null, currentUrl: null };
  try { raw.currentUrl = browser?.contexts().flatMap((context) => context.pages()).at(-1)?.url() ?? null; } catch {}
  await fs.writeFile(path.join(outDir, 'raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
  evidence.finishedAt = new Date().toISOString();
  evidence.failure = raw;
  await save('progress.json', evidence);
  throw error;
} finally {
  await browser?.close();
}
