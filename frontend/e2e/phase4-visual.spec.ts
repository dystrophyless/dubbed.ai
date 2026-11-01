import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const evidenceDirectory = path.resolve(
  process.cwd(), '..', '_docs', 'evidence', 'core-journey-ab-implementation-2026-10-28',
  ...(process.env.DUBBED_CORE_EVIDENCE_RUN ?? 'phase3').split(/[\\/]+/),
);

const cases = [
  { layout: 'A', width: 1440, height: 900, locale: 'en', screenshot: 'A-1440x900-en.png' },
  { layout: 'B', width: 1440, height: 900, locale: 'en', screenshot: 'B-1440x900-en.png' },
  { layout: 'A', width: 1920, height: 910, locale: 'en', screenshot: 'A-1920x910-en.png' },
  { layout: 'B', width: 1280, height: 600, locale: 'ru', turn: 'sintel-turn-3', screenshot: 'B-1280x600-ru-long.png' },
  { layout: 'A', width: 1280, height: 600, locale: 'en', screenshot: 'A-1280x600-en.png' },
  { layout: 'A', width: 1366, height: 650, locale: 'ru', turn: 'sintel-turn-3', screenshot: 'A-1366x650-ru-long.png' },
  { layout: 'B', width: 1366, height: 650, locale: 'ru', turn: 'sintel-turn-3', screenshot: 'B-1366x650-ru-long.png' },
  { layout: 'A', width: 1248, height: 900, locale: 'en', screenshot: 'A-1248x900-en.png' },
  { layout: 'A', width: 1247, height: 900, locale: 'en', screenshot: 'A-1247x900-en.png' },
  { layout: 'A', width: 1024, height: 650, locale: 'en', screenshot: 'A-1024x650-en.png' },
  { layout: 'A', width: 1023, height: 650, locale: 'en', screenshot: 'A-1023x650-en.png' },
  { layout: 'B', width: 1024, height: 650, locale: 'ru', screenshot: 'B-1024x650-ru.png' },
  { layout: 'A', width: 390, height: 667, locale: 'ru', screenshot: 'A-390x667-ru.png' },
  { layout: 'B', width: 390, height: 667, locale: 'ru', turn: 'sintel-turn-3', screenshot: 'B-390x667-ru-long.png' },
  { layout: 'B', width: 390, height: 844, locale: 'en', screenshot: 'B-390x844-en.png' },
  { layout: 'A', width: 640, height: 900, locale: 'en', screenshot: 'A-640x900-reflow.png' },
] as const;

async function metrics(page: Page) {
  return page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { x: value.x, y: value.y, top: value.top, width: value.width, height: value.height, right: value.right, bottom: value.bottom };
    };
    const pathData = document.querySelector('.waveform-source')?.getAttribute('d') ?? '';
    const points = Array.from(pathData.matchAll(/\s([\d.]+)\s([\d.]+)/g), (match) => Number(match[2]));
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      scrollY: window.scrollY,
      media: rect('.media-viewport'),
      dialogue: rect('.dialogue-copy p'),
      waveform: rect('.waveform-row'),
      panel: rect('.record-panel'),
      controls: rect('.record-studio-actions'),
      status: rect('.record-status--b'),
      workspace: rect('.record-workspace'),
      recordPage: rect('.record-page'),
      mediaWidthToken: getComputedStyle(document.querySelector('.record-page')!).getPropertyValue('--record-media-width').trim(),
      controlButtons: Array.from(document.querySelectorAll('.record-studio-actions .button'), (element) => {
        const bounds = element.getBoundingClientRect();
        return { text: element.textContent?.trim(), x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, bottom: bounds.bottom };
      }),
      exit: rect('.record-header .exit-link'),
      lineCount: rect('.record-header__line-count'),
      title: rect('.record-header h1'),
      dots: rect('.position-dots'),
      localeControlCount: document.querySelectorAll('.record-header .locale-control').length,
      sourceWaveformStatus: document.querySelector('.waveform-row')?.getAttribute('data-source-waveform') ?? null,
      sourceEnvelopeSpan: points.length ? Math.max(...points) - Math.min(...points) : 0,
      dialogueFont: getComputedStyle(document.querySelector('.dialogue-copy p')!).fontFamily,
      mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
    };
  });
}

test.beforeAll(async () => mkdir(evidenceDirectory, { recursive: true }));

test('A/B layouts match the frozen viewport geometry and use decoded source audio at the supported widths', async ({ page }) => {
  test.setTimeout(90_000);
  const evidence = [];
  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: item.height });
    const turnQuery = 'turn' in item ? `&turn=${item.turn}` : '';
    await page.goto(`/projects/sintel-prepared/record?layout=${item.layout}&locale=${item.locale}${turnQuery}`);
    await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
    await page.evaluate(async () => { await document.fonts.ready; });
    const current = await metrics(page);
    if (item.layout === 'B' && item.width === 1280 && item.height === 600) {
      await page.screenshot({ path: path.join(evidenceDirectory, 'B-1280x600-ru-long.png') });
      await writeFile(path.join(evidenceDirectory, 'B-1280x600-fit-metrics.json'), JSON.stringify(current, null, 2));
    }
    expect(current.viewport).toEqual({ width: item.width, height: item.height });
    expect(current.documentWidth).toBeLessThanOrEqual(item.width);
    expect(current.localeControlCount).toBe(0);
    expect(current.sourceWaveformStatus).toBe('decoded');
    expect(current.sourceEnvelopeSpan).toBeGreaterThan(20);
    expect(current.dialogueFont).toContain('Mabry Pro');
    expect(current.mabryLoaded).toBe(true);
    expect(current.media).not.toBeNull();
    expect(current.dialogue).not.toBeNull();
    expect(current.waveform).not.toBeNull();
    expect(current.dialogue!.top).toBeGreaterThanOrEqual(current.media!.bottom);
    expect(current.waveform!.top).toBeGreaterThan(current.dialogue!.bottom);
    expect(current.media!.x + current.media!.width / 2).toBeCloseTo(item.width / 2, 0);
    expect(current.title?.height ?? 0).toBeGreaterThan(0);
    expect(current.dots?.height ?? 0).toBeGreaterThan(0);
    expect(Math.abs((current.title?.x ?? 0) + (current.title?.width ?? 0) / 2 - item.width / 2)).toBeLessThanOrEqual(1);
    expect((current.dots?.top ?? 0)).toBeGreaterThanOrEqual((current.title?.bottom ?? 0));

    if (item.layout === 'A' && item.width >= 1248) {
      expect(current.panel?.width).toBe(272);
      expect(Math.abs((current.panel?.x ?? 0) - current.media!.right - 24)).toBeLessThanOrEqual(1);
      expect(current.panel!.right).toBeLessThanOrEqual(item.width - 31);
      expect(current.media!.x).toBeGreaterThanOrEqual(32);
    } else if (item.layout === 'A') {
      expect(current.panel?.y).toBeGreaterThan(current.waveform!.bottom);
      expect(current.panel?.width).toBeLessThanOrEqual(920);
    }

    if (item.layout === 'B' && item.width >= 768) {
      expect(current.lineCount?.height ?? 0).toBeGreaterThan(0);
      expect(current.controls).not.toBeNull();
    }
    if (item.layout === 'B' && item.width >= 768 && item.height <= 700) {
      expect(current.media!.width).toBeGreaterThanOrEqual(576);
      expect(current.controls!.bottom).toBeLessThanOrEqual(item.height + 1);
      expect((current.status?.bottom ?? current.controls!.bottom)).toBeLessThanOrEqual(item.height + 1);
    }
    if (item.layout === 'B' && item.width <= 767) {
      expect(current.lineCount?.height ?? 0).toBeGreaterThan(0);
      expect(current.media!.top).toBeGreaterThan(current.dots!.bottom);
      expect(current.controls).not.toBeNull();
    }
    if (item.width <= 767) expect(current.exit!.bottom).toBeLessThanOrEqual(current.title!.top);

    await page.screenshot({ path: path.join(evidenceDirectory, item.screenshot) });
    evidence.push({ ...item, ...current });
  }
  await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
  const accessibilityMedia = await page.evaluate(() => ({
    forcedColors: matchMedia('(forced-colors: active)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(accessibilityMedia.forcedColors).toBe(true);
  expect(accessibilityMedia.reducedMotion).toBe(true);
  expect(accessibilityMedia.documentWidth).toBeLessThanOrEqual(640);
  await writeFile(path.join(evidenceDirectory, 'phase4-visual-browser-evidence.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    browser: `Chrome ${page.context().browser()?.version() ?? 'unknown'}`,
    nativeCaptureRequested: false,
    forcedColorsAndReducedMotion: accessibilityMedia,
    viewports: evidence,
  }, null, 2));
});

test('phone touch seek and desktop keyboard seek keep native source playback usable without requesting the microphone', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 667 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.goto('/projects/sintel-prepared/record?layout=B&locale=ru');
  await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  const seek = page.locator('#record-window-seek');
  const box = await seek.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box!.x + box!.width * 0.68, box!.y + box!.height / 2);
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(2);
  expect(await page.locator('.record-action').boundingBox().then((value) => value?.height ?? 0)).toBeGreaterThanOrEqual(48);

  await seek.focus();
  await page.keyboard.press('ArrowRight');
  expect(await seek.evaluate((input) => input === document.activeElement)).toBe(true);
  expect(await seek.evaluate((input) => getComputedStyle(input).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: path.join(evidenceDirectory, 'B-390x667-touch-seek.png'), fullPage: true });
  await context.close();
});
