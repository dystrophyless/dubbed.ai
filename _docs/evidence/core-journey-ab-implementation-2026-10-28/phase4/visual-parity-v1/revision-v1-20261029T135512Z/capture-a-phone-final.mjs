import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const outDir = path.join(root, `a-phone-final-${new Date().toISOString().replaceAll(':', '').replaceAll('.', '-')}`);
const origin = 'http://127.0.0.1:5180';
const longRussian = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const evidence = {
  startedAt: new Date().toISOString(), browserTempPath: os.tmpdir(), viewport: { width: 390, height: 844 },
  nativeInput: 'Chrome fake media input recorded through the real browser getUserMedia/MediaRecorder path; not a physical microphone.',
  longRussianFixture: longRussian, captures: [], stages: [],
};
await fs.mkdir(outDir, { recursive: true });
const save = async () => fs.writeFile(path.join(outDir, 'evidence.json'), JSON.stringify(evidence, null, 2), 'utf8');
const browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
try {
  evidence.browser = `Chrome ${browser.version()}`;
  const context = await browser.newContext({ viewport: evidence.viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', permissions: ['microphone'] });
  await context.grantPermissions(['microphone'], { origin });
  const page = await context.newPage();
  await page.goto(`${origin}/projects/sintel-prepared/record?layout=A&locale=en`, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction(() => {
    const video = document.querySelector('.media-viewport video');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  }, null, { timeout: 20_000 });
  await page.evaluate(() => document.fonts?.ready);

  const capture = async (name, kind) => {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const state = await page.evaluate(({ name, kind }) => {
      const bounds = (selector) => {
        const element = document.querySelector(selector);
        if (!element || getComputedStyle(element).display === 'none') return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom,
          font: style.font, lineHeight: style.lineHeight, margin: style.margin, padding: style.padding, gap: style.gap, radius: style.borderRadius };
      };
      const heading = document.querySelector('.record-header__title h1');
      const dots = [...document.querySelectorAll('.position-dots li')].map((dot) => {
        const rect = dot.getBoundingClientRect(); const style = getComputedStyle(dot);
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, color: style.backgroundColor };
      });
      return {
        name, kind, url: location.href, viewport: { width: innerWidth, height: innerHeight }, scroll: { y: scrollY, height: document.documentElement.scrollHeight },
        heading: heading ? { text: heading.textContent?.trim(), ...bounds('.record-header__title h1') } : null, dots,
        header: bounds('.record-header'), exit: bounds('.record-header .exit-link'), media: bounds('.media-viewport'), caption: bounds('.dialogue-copy'),
        waveform: bounds('.waveform-row'), waveformMeta: bounds('.waveform-meta'), panel: bounds('.record-panel'),
        context: bounds('.record-panel__context'), controls: bounds('.record-controls--a'),
        takeWaveformPresent: Boolean(document.querySelector('.waveform-take')),
        takeWaveformActive: document.querySelector('.waveform-row')?.classList.contains('is-take-active') ?? false,
        takeWaveformPathLength: document.querySelector('.waveform-take')?.getAttribute('d')?.length ?? 0,
        candidateStatus: document.querySelector('.record-take-status')?.textContent?.trim() ?? null,
      };
    }, { name, kind });
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: false, animations: 'disabled' });
    evidence.captures.push(state);
    await save();
  };

  await capture('A-app-empty-phone-390x844', 'A empty Record state');
  await page.locator('.record-action').click();
  await page.waitForFunction(() => Boolean(document.querySelector('.waveform-take'))
    && document.querySelector('.record-action')?.getAttribute('aria-busy') === 'false'
    && document.querySelector('.record-take-status')?.textContent?.trim() === 'New take', null, { timeout: 25_000 });
  evidence.stages.push({ at: new Date().toISOString(), stage: 'A native browser candidate saved at phone viewport', status: 'ready', url: page.url() });
  await page.locator('.record-source-take').click();
  await page.locator('.waveform-row.is-take-active').waitFor({ state: 'attached', timeout: 5_000 });
  const pause = page.locator('.record-audition-pause');
  if (await pause.isVisible()) await pause.click();
  await page.evaluate((text) => {
    const dialogue = document.querySelector('.dialogue-copy p');
    if (!dialogue) throw new Error('Dialogue node missing for the long-Russian stress capture.');
    dialogue.textContent = text;
  }, longRussian);
  await page.waitForTimeout(250);
  await capture('A-app-candidate-long-ru-phone-390x844', 'A candidate with actual captured take active and injected long Russian stress copy');
  evidence.finishedAt = new Date().toISOString();
  await save();
  process.stdout.write(JSON.stringify({ outDir, browser: evidence.browser, captureCount: evidence.captures.length, stages: evidence.stages }, null, 2));
  await context.close();
} catch (error) {
  evidence.failure = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  await save();
  throw error;
} finally {
  await browser.close();
}
