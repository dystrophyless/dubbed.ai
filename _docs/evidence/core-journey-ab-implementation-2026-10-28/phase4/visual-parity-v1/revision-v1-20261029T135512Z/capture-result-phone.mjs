import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(scriptDir, `result-phone-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`);
const origin = 'http://127.0.0.1:5180';
const phone = { width: 390, height: 844 };
const evidence = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  nativeInput: 'Chrome fake media input through real getUserMedia/MediaRecorder; not a physical microphone.',
  source: 'One fresh three-window native-browser capture journey, reused for A and B Result phone screenshots.',
  resultProvenance: 'Illustrative mock generation only; product rendered=false and assembledFromAcceptedTakes=false.',
  captures: [],
};
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
});

async function captureResult(page, layout) {
  await page.setViewportSize(phone);
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(180);
  const state = await page.evaluate(() => {
    const bounds = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        gap: style.gap, padding: style.padding, display: style.display,
      };
    };
    return {
      url: location.href,
      viewport: { width: innerWidth, height: innerHeight },
      scroll: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, y: scrollY },
      player: bounds('.result-player__screen'),
      transport: bounds('.result-player__transport'),
      details: bounds('.result-workspace__details'),
      status: document.querySelector('.result-workspace__status')?.innerText.trim() ?? null,
      actions: bounds('.result-workspace__actions'),
      buttons: [...document.querySelectorAll('.result-workspace__actions .button')].map((button) => {
        const rect = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        return { label: button.innerText.trim(), x: rect.x, y: rect.y, width: rect.width, height: rect.height, padding: style.padding };
      }),
      video: (() => {
        const video = document.querySelector('[data-testid="result-video"]');
        return video instanceof HTMLVideoElement ? {
          readyState: video.readyState, width: video.videoWidth, height: video.videoHeight,
          duration: Number.isFinite(video.duration) ? video.duration : null,
          paused: video.paused, source: video.dataset.source ?? null,
        } : null;
      })(),
    };
  });
  const image = `${layout}-result-phone-390x844.png`;
  await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
  evidence.captures.push({ image, ...state });
  await fs.writeFile(path.join(outDir, 'progress.json'), JSON.stringify(evidence, null, 2), 'utf8');
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  await page.goto(`${origin}/projects/sintel-prepared/record?layout=B&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('.media-viewport video');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });

  for (let turn = 1; turn <= 3; turn += 1) {
    await page.locator('.record-action').click();
    await page.waitForFunction(() => {
      const status = document.querySelector('.record-take-status');
      return Boolean(document.querySelector('.waveform-take')) && status?.textContent?.trim() === 'New take';
    }, null, { timeout: 25_000 });
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
  await captureResult(page, 'B');

  const resultUrl = new URL(page.url());
  resultUrl.searchParams.set('layout', 'A');
  await page.goto(resultUrl.toString(), { waitUntil: 'networkidle', timeout: 30_000 });
  await page.getByText('Illustrative sample ready', { exact: true }).waitFor({ timeout: 20_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('[data-testid="result-video"]');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  await captureResult(page, 'A');
  evidence.finishedAt = new Date().toISOString();
  evidence.browser = `Chrome ${browser.version()}`;
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify({ outDir, browser: evidence.browser, browserTempPath: evidence.browserTempPath, captures: evidence.captures }, null, 2));
} catch (error) {
  const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  await fs.writeFile(path.join(outDir, 'raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
  evidence.failure = raw;
  evidence.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
  throw error;
} finally {
  await browser.close();
}
