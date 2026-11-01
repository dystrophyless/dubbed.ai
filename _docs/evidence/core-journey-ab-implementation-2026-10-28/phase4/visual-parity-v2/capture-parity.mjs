import { chromium } from 'file:///D:/Program/python/Dubbed/frontend/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const evidenceRoot = path.dirname(new URL(import.meta.url).pathname.replace(/^\//, '').replaceAll('/', path.sep));
const mode = process.argv[2] ?? 'final';
if (!['baseline', 'final'].includes(mode)) throw new Error(`Unknown capture mode: ${mode}`);
const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
const outDir = path.join(evidenceRoot, `${mode}-${stamp}`);
const longRussian = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
const viewports = [
  { name: 'desktop-1440x900', width: 1440, height: 900, longRu: false },
  { name: 'short-1280x600', width: 1280, height: 600, longRu: true },
  { name: 'phone-390x844', width: 390, height: 844, longRu: true },
];
const targets = [
  { layout: 'A', kind: 'prototype', url: 'http://127.0.0.1:5178/' },
  { layout: 'B', kind: 'prototype', url: 'http://127.0.0.1:5179/' },
  { layout: 'A', kind: 'app', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en' },
  { layout: 'B', kind: 'app', url: 'http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en' },
];
const evidence = {
  mode,
  startedAt: new Date().toISOString(),
  workspaceBaseHead: '9096925a4476e84ec9a6e5ef9bff50ae45ac0f67',
  browserTempPath: os.tmpdir(),
  nativeInput: 'For app candidate states only: Chrome fake media input recorded through real getUserMedia and MediaRecorder; not a physical microphone.',
  prototypeCandidate: 'Prototype candidate state is synthetic and illustrative, reached through its existing prototype controls.',
  longRussianFixture: longRussian,
  longRussianMethod: 'Injected into the visible #dialogue node after font/video readiness for stress screenshots only; no product data or prototype source was changed.',
  prototypeNormalization: 'Prototype .lab strip and .fixture-credit footer hidden in the isolated screenshot page; viewport remains the exact listed CSS pixel size; scroll reset to (0,0).',
  screenshotAnimations: 'Reduced-motion media preference is enabled; screenshots do not force-fast-forward CSS animations.',
  paintSettleDelayMs: 500,
  captures: [],
  stages: [],
};

await fs.mkdir(outDir, { recursive: true });
const save = async (name = 'progress.json') => fs.writeFile(path.join(outDir, name), JSON.stringify(evidence, null, 2), 'utf8');

async function waitReady(page) {
  await page.waitForFunction(() => document.fonts?.status === 'loaded' && (() => {
    const video = document.querySelector('.scene video');
    return video instanceof HTMLVideoElement && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0;
  })(), null, { timeout: 25_000 });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function waitLayoutSettled(page) {
  await page.evaluate(() => new Promise((resolve, reject) => {
    let previous = '';
    let stableFrames = 0;
    const started = performance.now();
    const selectors = ['#main', '.project-header, .studio-header', '.scene', '.script', '.timeline', '.wave', '.performance', '.performance-actions, .studio-controls'];
    const sample = () => {
      const signature = JSON.stringify({ viewport: [innerWidth, innerHeight], scroll: [scrollX, scrollY], nodes: selectors.map((selector) => {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return [node.className, rect.x, rect.y, rect.width, rect.height, getComputedStyle(node).margin, getComputedStyle(node).padding];
      }) });
      if (signature === previous) stableFrames += 1;
      else stableFrames = 0;
      if (stableFrames >= 3) { resolve(); return; }
      if (performance.now() - started > 2000) { reject(new Error('Layout did not settle within 2 seconds.')); return; }
      previous = signature;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}

async function setLongText(page, enabled, baselineText) {
  await page.evaluate(({ text, baselineText, enabled }) => {
    const dialogue = document.querySelector('#dialogue');
    if (!dialogue) throw new Error('Visible dialogue node #dialogue is missing.');
    dialogue.textContent = enabled ? text : baselineText;
  }, { text: longRussian, baselineText, enabled });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function describe(page, target, state, viewport, longRu) {
  return page.evaluate(({ target, state, viewport, longRu, longRussian }) => {
    const read = (selector) => {
      const element = document.querySelector(selector);
      if (!element || element.hidden || getComputedStyle(element).display === 'none') return null;
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return {
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        right: rect.right, bottom: rect.bottom,
        display: css.display, font: css.font, color: css.color,
        background: css.backgroundColor, border: css.border,
        radius: css.borderRadius, padding: css.padding, gap: css.gap,
        margin: css.margin,
      };
    };
    const video = document.querySelector('.scene video');
    const buttons = [...document.querySelectorAll('.performance-actions button, .studio-controls button')].map((button) => {
      const rect = button.getBoundingClientRect();
      const css = getComputedStyle(button);
      return { id: button.id, text: button.innerText.trim(), disabled: button.disabled,
        x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        font: css.font, color: css.color, background: css.backgroundColor, border: css.border,
        radius: css.borderRadius, padding: css.padding, gap: css.gap };
    });
    return {
      target, state, viewport,
      url: location.href, scrollY, scrollX,
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      rootClasses: document.querySelector('#product')?.className ?? null,
      mainClasses: document.querySelector('#main')?.className ?? null,
      titleText: document.querySelector('#heading')?.textContent?.trim() ?? null,
      lineText: document.querySelector('#dialogue')?.textContent?.trim() ?? null,
      fontReady: document.fonts?.check('500 20px "Mabry Pro"') ?? false,
      title: read('.project-header, .studio-header'),
      heading: read('.project-heading, .studio-title'),
      dots: read('#dots'), exit: read('#exit'),
      media: read('.scene'), video: video instanceof HTMLVideoElement ? {
        readyState: video.readyState, width: video.videoWidth, height: video.videoHeight,
        currentTime: video.currentTime, paused: video.paused,
      } : null,
      dialogue: read('.script'), dialogueText: document.querySelector('#dialogue')?.getBoundingClientRect().toJSON() ?? null,
      waveform: read('.wave'), seek: read('#scrub'), waveformMeta: read('.timeline-meta'),
      controls: read('.performance'), controlRow: read('.performance-actions, .studio-controls'),
      status: read('#saved'), helper: read('#take-help'), buttons,
      candidate: document.querySelector('#take') instanceof HTMLButtonElement ? !document.querySelector('#take').disabled : null,
      takeEnvelope: Boolean(document.querySelector('.take-envelope, .waveform-take')),
      takeSelected: document.querySelector('.waveform-row')?.classList.contains('is-take-active') ?? null,
      longRuRequested: longRu,
      longRuInjected: document.querySelector('#dialogue')?.textContent?.trim() === longRussian,
    };
  }, { target, state, viewport, longRu, longRussian });
}

async function capture(page, target, state, viewport, isLongRu, baselineText) {
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await waitReady(page);
  await setLongText(page, isLongRu, baselineText);
  await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await waitLayoutSettled(page);
  await page.waitForTimeout(500);
  const data = await describe(page, `${target.kind}-${target.layout}`, state, viewport, isLongRu);
  const image = `${target.layout}-${target.kind}-${state}-${viewport.name}${isLongRu ? '-long-ru' : ''}.png`;
  await page.screenshot({ path: path.join(outDir, image), fullPage: false });
  evidence.captures.push({ image, ...data });
  await save();
}

async function navigateAndPrepare(page, target) {
  await page.goto(target.url, { waitUntil: 'networkidle', timeout: 30_000 });
  if (target.kind === 'prototype') {
    await page.addStyleTag({ content: '.lab,.fixture-credit{display:none!important}' });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await waitReady(page);
}

async function recordCandidate(page, target) {
  await page.setViewportSize({ width: 1440, height: 900 });
  if (target.kind === 'prototype') {
    await page.locator('#record').click();
    await page.waitForFunction(() => {
      const take = document.querySelector('#take');
      return take instanceof HTMLButtonElement && !take.disabled;
    }, null, { timeout: 15_000 });
    await page.locator('#take').click();
    await page.waitForFunction(() => {
      const pause = document.querySelector('#pause');
      return pause instanceof HTMLButtonElement && !pause.hidden && getComputedStyle(pause).display !== 'none';
    }, null, { timeout: 5_000 });
    await page.waitForTimeout(180);
    if ((await page.locator('#pause').textContent())?.trim() === 'Pause') await page.locator('#pause').click();
    evidence.stages.push({ target: `${target.kind}-${target.layout}`, result: 'prototype synthetic candidate selected; not product media' });
    return;
  }
  await page.locator('#record').click();
  await page.waitForFunction(() => {
    const take = document.querySelector('#take');
    const candidate = document.querySelector('.waveform-take');
    const busy = document.querySelector('#record')?.getAttribute('aria-busy');
    const status = document.querySelector('#saved')?.textContent?.trim();
    return take instanceof HTMLButtonElement && !take.disabled && Boolean(candidate) && busy === 'false' && status === 'New take';
  }, null, { timeout: 35_000 });
  const captureDetails = await page.evaluate(() => {
    const waveform = document.querySelector('.waveform-take')?.getAttribute('d') ?? '';
    return { status: document.querySelector('#saved')?.textContent?.trim(), takePathCharacters: waveform.length,
      video: (() => { const video = document.querySelector('.scene video'); return video instanceof HTMLVideoElement ? { currentTime: video.currentTime, paused: video.paused } : null; })(),
      captureApi: typeof MediaRecorder !== 'undefined' };
  });
  await page.locator('#take').click();
  await page.waitForFunction(() => document.querySelector('.waveform-row')?.classList.contains('is-take-active'), null, { timeout: 5_000 });
  const pause = page.locator('#pause');
  if (await pause.isVisible() && (await pause.textContent())?.trim() === 'Pause') await pause.click();
  evidence.stages.push({ target: `${target.kind}-${target.layout}`, result: 'native browser Blob candidate captured, persisted and explicitly selected', details: captureDetails });
}

let browser;
try {
  browser = await chromium.launch({ headless: true, executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  evidence.browser = `Chrome ${browser.version()}`;
  const selectedTargets = mode === 'baseline' ? targets.filter((target) => target.kind === 'prototype' || target.kind === 'app') : targets;
  for (const target of selectedTargets) {
    const permissions = target.kind === 'app' ? ['microphone'] : [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce', permissions });
    if (target.kind === 'app') await context.grantPermissions(['microphone'], { origin: 'http://127.0.0.1:5180' });
    const page = await context.newPage();
    try {
      await navigateAndPrepare(page, target);
      const baselineText = (await page.locator('#dialogue').textContent())?.trim();
      if (!baselineText) throw new Error('The prepared dialogue baseline is empty.');
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await waitLayoutSettled(page);
        await capture(page, target, 'initial', viewport, viewport.longRu, baselineText);
      }
      if (mode === 'final') {
        await recordCandidate(page, target);
        for (const viewport of viewports) {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await waitLayoutSettled(page);
          await capture(page, target, 'candidate-your-take', viewport, viewport.longRu, baselineText);
        }
      }
      evidence.stages.push({ target: `${target.kind}-${target.layout}`, result: 'screens captured', url: target.url });
      await save();
    } catch (error) {
      const raw = { at: new Date().toISOString(), target, url: page.url(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
      evidence.stages.push({ ...raw, result: 'failed' });
      await fs.writeFile(path.join(outDir, `${target.layout}-${target.kind}-raw-error.json`), JSON.stringify(raw, null, 2), 'utf8');
      await save('evidence.partial.json');
      throw error;
    } finally { await context.close(); }
  }
  evidence.finishedAt = new Date().toISOString();
  await save('evidence.json');
  process.stdout.write(JSON.stringify({ outDir, mode, browser: evidence.browser, browserTempPath: evidence.browserTempPath,
    captures: evidence.captures.length, stages: evidence.stages }, null, 2));
} catch (error) {
  const raw = { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : null };
  evidence.failure = raw;
  await fs.writeFile(path.join(outDir, 'raw-error.json'), JSON.stringify(raw, null, 2), 'utf8');
  await save('evidence.partial.json');
  throw error;
} finally { await browser?.close(); }
