import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const workspace = 'D:/Program/python/Dubbed';
const appOrigin = 'http://127.0.0.1:5180';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900 },
  { name: 'short-1280x600', width: 1280, height: 600 },
  { name: 'phone-390x844', width: 390, height: 844 },
];
const outDir = path.join(root, 'connected-result-captures-' + new Date().toISOString().replaceAll(':', '').replaceAll('.', '-'));
const report = {
  startedAt: new Date().toISOString(),
  browserTempPath: os.tmpdir(),
  app: 'The app journey records three real MediaRecorder Blobs from Chrome fake media input, accepts them through the local service, then explicitly opens the authorized mock Result. This is not a physical microphone or a backend render.',
  prototype: 'The approved prototypes use their existing completed illustrative fixture state; prototype captures are visual references only.',
  captures: [],
  journey: [],
  errors: [],
};

await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'evidence.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(report, null, 2), 'utf8');

async function capture(page, layout, target, viewport, chromeOffset = 0) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  const metrics = await page.evaluate(({ layout, target, viewport, chromeOffset }) => {
    const box = (selector) => {
      const node = document.querySelector(selector);
      if (!node || getComputedStyle(node).display === 'none') return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
        font: style.font, color: style.color, background: style.backgroundColor, border: style.border, radius: style.borderRadius };
    };
    const playerVideo = document.querySelector('.result-player video, #result');
    const tabs = Array.from(document.querySelectorAll('.result-player__source-tabs button, .result-sources button'), button => ({
      text: button.textContent?.trim(), pressed: button.getAttribute('aria-pressed'), disabled: button.disabled,
    }));
    const main = document.querySelector('.result-workspace');
    return {
      layout, target, viewport, prototypeChromeOffset: chromeOffset,
      scroll: { x: scrollX, y: scrollY, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      header: box('.result-header, .studio-header'), title: box('.result-header__title, .studio-title'),
      player: box('.result-player'), screen: box('.result-player__screen, .result-picture'),
      video: playerVideo ? { box: (() => { const r = playerVideo.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
        paused: playerVideo.paused, currentTime: playerVideo.currentTime, width: playerVideo.videoWidth, height: playerVideo.videoHeight, source: playerVideo.currentSrc } : null,
      sourceTabs: tabs, transport: box('.result-player__transport, .result-transport'),
      bottom: box('.result-bottom'), disclosure: main?.textContent?.trim() ?? null,
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  }, { layout, target, viewport: [viewport.width, viewport.height], chromeOffset });
  const image = `${layout}-${target}-${viewport.name}.png`;
  await page.screenshot({ path: path.join(outDir, image), fullPage: false, animations: 'disabled' });
  report.captures.push({ image, ...metrics });
  await save();
}

async function seedPrototype(browser, layout) {
  const port = layout === 'A' ? 5178 : 5179;
  const key = layout === 'A' ? 'dubbed-lowfi-v1' : 'dubbed-studio-lowfi-v1';
  const statePath = path.join(workspace, 'prototypes', 'core-journey-studio', 'evidence', 'result-player-v6', 'completed-fixture-state.json');
  const state = JSON.parse(await fs.readFile(statePath, 'utf8'));
  state.view = 'result';
  state.locale = 'en';
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addInitScript(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(state))});`);
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ layout, target: 'prototype', message: error.message }));
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => {
    const player = document.querySelector('#result-player');
    const play = document.querySelector('#result-play');
    return player && !player.hidden && play instanceof HTMLButtonElement && !play.disabled;
  }, null, { timeout: 15000 });
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(150);
    const chromeOffset = viewport.width < 768 ? await page.locator('.lab').evaluate(node => node.getBoundingClientRect().height) : 0;
    await capture(page, layout, 'prototype-result', viewport, chromeOffset);
  }
  await context.close();
}

async function createAuthorizedAppResult(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.grantPermissions(['microphone'], { origin: appOrigin });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push({ layout: 'A', target: 'app', message: error.message }));
  await page.goto(`${appOrigin}/projects/sintel-prepared/record?layout=A&locale=en`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('#scene');
    const record = document.querySelector('#record');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.videoWidth > 0 && record instanceof HTMLButtonElement && !record.disabled;
  }, null, { timeout: 20000 });

  for (let index = 0; index < 3; index += 1) {
    await page.locator('#record').click();
    await page.waitForFunction(() => document.querySelector('#saved')?.textContent?.trim() === 'New take'
      && document.querySelector('#take') instanceof HTMLButtonElement && !document.querySelector('#take').disabled,
    null, { timeout: 30000 });
    await page.locator('#next').click();
    if (index < 2) {
      await page.waitForFunction(next => document.querySelector('#position')?.textContent?.includes(`Line ${next} /`), index + 2, { timeout: 20000 });
    } else {
      await page.waitForFunction(() => {
        if (location.pathname.endsWith('/result')) return true;
        const action = document.querySelector('#to-result') ?? document.querySelector('#next');
        return action instanceof HTMLButtonElement && !action.disabled
          && (action.textContent?.includes('To result') || action.textContent?.includes('К результату'));
      }, null, { timeout: 20000 });
    }
    const ui = await page.evaluate(() => ({ path: location.pathname, position: document.querySelector('#position')?.textContent?.trim() ?? null,
      primary: document.querySelector('#next')?.textContent?.trim() ?? null, headerResult: document.querySelector('#to-result')?.textContent?.trim() ?? null }));
    report.journey.push({ at: new Date().toISOString(), action: 'capture and accept', turn: index + 1, result: 'candidate accepted through the app controls', ui });
    await save();
  }

  if (!new URL(page.url()).pathname.endsWith('/result')) {
    const headerResult = page.locator('#to-result');
    const action = await headerResult.count() && await headerResult.isVisible() ? headerResult : page.locator('#next');
    await action.click();
  }
  await page.waitForURL(url => url.pathname.endsWith('/result'), { timeout: 30000 });
  await page.waitForSelector('.result-player', { state: 'visible', timeout: 30000 });
  report.journey.push({ at: new Date().toISOString(), action: 'explicit To result', url: page.url(), result: 'authorized mock Result opened after all three accepted takes' });
  await save();
  return { context, page };
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  report.browser = `Chrome ${browser.version()}`;
  for (const layout of ['A', 'B']) await seedPrototype(browser, layout);

  const { context, page } = await createAuthorizedAppResult(browser);
  for (const layout of ['A', 'B']) {
    if (layout === 'B') {
      await page.goto(`${appOrigin}/projects/sintel-prepared/result?layout=B&locale=en`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('.result-player', { state: 'visible', timeout: 30000 });
    }
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(150);
      await capture(page, layout, 'app-result', viewport);
    }
  }
  await context.close();
  report.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(JSON.stringify({ outDir, browser: report.browser, browserTempPath: report.browserTempPath,
    captureCount: report.captures.length, acceptedTakes: report.journey.filter(item => item.action === 'capture and accept').length,
    appResultUrl: report.journey.find(item => item.action === 'explicit To result')?.url ?? null, errors: report.errors }, null, 2));
} catch (error) {
  const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  report.failure = raw;
  await fs.writeFile(path.join(outDir, `raw-error-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}.json`), JSON.stringify(raw, null, 2), 'utf8');
  await save();
  throw error;
} finally {
  await browser?.close();
}
