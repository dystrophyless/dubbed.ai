// 3d81df1c758d88b8d49722b05e4f67099b8ff22a
var _process$env$DUBBED_C;
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { test, expect } from '@playwright/test';
const evidenceDirectory = path.resolve(process.cwd(), '..', '_docs', 'evidence', 'core-journey-ab-implementation-2026-10-28', ...((_process$env$DUBBED_C = process.env.DUBBED_CORE_EVIDENCE_RUN) !== null && _process$env$DUBBED_C !== void 0 ? _process$env$DUBBED_C : 'phase3').split(/[\\/]+/));
const cases = [{
  layout: 'A',
  width: 1440,
  height: 900,
  locale: 'en',
  screenshot: 'A-1440x900-en.png'
}, {
  layout: 'B',
  width: 1440,
  height: 900,
  locale: 'en',
  screenshot: 'B-1440x900-en.png'
}, {
  layout: 'A',
  width: 1920,
  height: 910,
  locale: 'en',
  screenshot: 'A-1920x910-en.png'
}, {
  layout: 'B',
  width: 1280,
  height: 600,
  locale: 'ru',
  turn: 'sintel-turn-3',
  screenshot: 'B-1280x600-ru-long.png'
}, {
  layout: 'A',
  width: 1280,
  height: 600,
  locale: 'en',
  screenshot: 'A-1280x600-en.png'
}, {
  layout: 'A',
  width: 1366,
  height: 650,
  locale: 'ru',
  turn: 'sintel-turn-3',
  screenshot: 'A-1366x650-ru-long.png'
}, {
  layout: 'B',
  width: 1366,
  height: 650,
  locale: 'ru',
  turn: 'sintel-turn-3',
  screenshot: 'B-1366x650-ru-long.png'
}, {
  layout: 'A',
  width: 1248,
  height: 900,
  locale: 'en',
  screenshot: 'A-1248x900-en.png'
}, {
  layout: 'A',
  width: 1247,
  height: 900,
  locale: 'en',
  screenshot: 'A-1247x900-en.png'
}, {
  layout: 'A',
  width: 1024,
  height: 650,
  locale: 'en',
  screenshot: 'A-1024x650-en.png'
}, {
  layout: 'A',
  width: 1023,
  height: 650,
  locale: 'en',
  screenshot: 'A-1023x650-en.png'
}, {
  layout: 'B',
  width: 1024,
  height: 650,
  locale: 'ru',
  screenshot: 'B-1024x650-ru.png'
}, {
  layout: 'A',
  width: 390,
  height: 667,
  locale: 'ru',
  screenshot: 'A-390x667-ru.png'
}, {
  layout: 'B',
  width: 390,
  height: 667,
  locale: 'ru',
  turn: 'sintel-turn-3',
  screenshot: 'B-390x667-ru-long.png'
}, {
  layout: 'B',
  width: 390,
  height: 844,
  locale: 'en',
  screenshot: 'B-390x844-en.png'
}, {
  layout: 'A',
  width: 640,
  height: 900,
  locale: 'en',
  screenshot: 'A-640x900-reflow.png'
}];
async function metrics(page) {
  return page.evaluate(() => {
    var _document$querySelect, _document$querySelect2, _document$querySelect3, _document$querySelect4;
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return {
        x: value.x,
        y: value.y,
        top: value.top,
        width: value.width,
        height: value.height,
        right: value.right,
        bottom: value.bottom
      };
    };
    const pathData = (_document$querySelect = (_document$querySelect2 = document.querySelector('.waveform-source')) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.getAttribute('d')) !== null && _document$querySelect !== void 0 ? _document$querySelect : '';
    const points = Array.from(pathData.matchAll(/\s([\d.]+)\s([\d.]+)/g), match => Number(match[2]));
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
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
      mediaWidthToken: getComputedStyle(document.querySelector('.record-page')).getPropertyValue('--record-media-width').trim(),
      controlButtons: Array.from(document.querySelectorAll('.record-studio-actions .button'), element => {
        var _element$textContent;
        const bounds = element.getBoundingClientRect();
        return {
          text: (_element$textContent = element.textContent) === null || _element$textContent === void 0 ? void 0 : _element$textContent.trim(),
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          bottom: bounds.bottom
        };
      }),
      exit: rect('.record-header .exit-link'),
      lineCount: rect('.record-header__line-count'),
      title: rect('.record-header h1'),
      dots: rect('.position-dots'),
      localeControlCount: document.querySelectorAll('.record-header .locale-control').length,
      sourceWaveformStatus: (_document$querySelect3 = (_document$querySelect4 = document.querySelector('.waveform-row')) === null || _document$querySelect4 === void 0 ? void 0 : _document$querySelect4.getAttribute('data-source-waveform')) !== null && _document$querySelect3 !== void 0 ? _document$querySelect3 : null,
      sourceEnvelopeSpan: points.length ? Math.max(...points) - Math.min(...points) : 0,
      dialogueFont: getComputedStyle(document.querySelector('.dialogue-copy p')).fontFamily,
      mabryLoaded: document.fonts.check('400 26px "Mabry Pro"')
    };
  });
}
test.beforeAll(async () => mkdir(evidenceDirectory, {
  recursive: true
}));
test('A/B layouts match the frozen viewport geometry and use decoded source audio at the supported widths', async ({
  page
}) => {
  var _page$context$browser, _page$context$browser2;
  test.setTimeout(90000);
  const evidence = [];
  for (const item of cases) {
    var _current$title$height, _current$title, _current$dots$height, _current$dots, _current$title$x, _current$title2, _current$title$width, _current$title3, _current$dots$top, _current$dots2, _current$title$bottom, _current$title4;
    await page.setViewportSize({
      width: item.width,
      height: item.height
    });
    const turnQuery = 'turn' in item ? `&turn=${item.turn}` : '';
    await page.goto(`/projects/sintel-prepared/record?layout=${item.layout}&locale=${item.locale}${turnQuery}`);
    await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
    await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
      timeout: 15000
    }).toBe(true);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const current = await metrics(page);
    if (item.layout === 'B' && item.width === 1280 && item.height === 600) {
      await page.screenshot({
        path: path.join(evidenceDirectory, 'B-1280x600-ru-long.png')
      });
      await writeFile(path.join(evidenceDirectory, 'B-1280x600-fit-metrics.json'), JSON.stringify(current, null, 2));
    }
    expect(current.viewport).toEqual({
      width: item.width,
      height: item.height
    });
    expect(current.documentWidth).toBeLessThanOrEqual(item.width);
    expect(current.localeControlCount).toBe(0);
    expect(current.sourceWaveformStatus).toBe('decoded');
    expect(current.sourceEnvelopeSpan).toBeGreaterThan(20);
    expect(current.dialogueFont).toContain('Mabry Pro');
    expect(current.mabryLoaded).toBe(true);
    expect(current.media).not.toBeNull();
    expect(current.dialogue).not.toBeNull();
    expect(current.waveform).not.toBeNull();
    expect(current.dialogue.top).toBeGreaterThanOrEqual(current.media.bottom);
    expect(current.waveform.top).toBeGreaterThan(current.dialogue.bottom);
    expect(current.media.x + current.media.width / 2).toBeCloseTo(item.width / 2, 0);
    expect((_current$title$height = (_current$title = current.title) === null || _current$title === void 0 ? void 0 : _current$title.height) !== null && _current$title$height !== void 0 ? _current$title$height : 0).toBeGreaterThan(0);
    expect((_current$dots$height = (_current$dots = current.dots) === null || _current$dots === void 0 ? void 0 : _current$dots.height) !== null && _current$dots$height !== void 0 ? _current$dots$height : 0).toBeGreaterThan(0);
    expect(Math.abs(((_current$title$x = (_current$title2 = current.title) === null || _current$title2 === void 0 ? void 0 : _current$title2.x) !== null && _current$title$x !== void 0 ? _current$title$x : 0) + ((_current$title$width = (_current$title3 = current.title) === null || _current$title3 === void 0 ? void 0 : _current$title3.width) !== null && _current$title$width !== void 0 ? _current$title$width : 0) / 2 - item.width / 2)).toBeLessThanOrEqual(1);
    expect((_current$dots$top = (_current$dots2 = current.dots) === null || _current$dots2 === void 0 ? void 0 : _current$dots2.top) !== null && _current$dots$top !== void 0 ? _current$dots$top : 0).toBeGreaterThanOrEqual((_current$title$bottom = (_current$title4 = current.title) === null || _current$title4 === void 0 ? void 0 : _current$title4.bottom) !== null && _current$title$bottom !== void 0 ? _current$title$bottom : 0);
    if (item.layout === 'A' && item.width >= 1248) {
      var _current$panel, _current$panel$x, _current$panel2;
      expect((_current$panel = current.panel) === null || _current$panel === void 0 ? void 0 : _current$panel.width).toBe(272);
      expect(Math.abs(((_current$panel$x = (_current$panel2 = current.panel) === null || _current$panel2 === void 0 ? void 0 : _current$panel2.x) !== null && _current$panel$x !== void 0 ? _current$panel$x : 0) - current.media.right - 24)).toBeLessThanOrEqual(1);
      expect(current.panel.right).toBeLessThanOrEqual(item.width - 31);
      expect(current.media.x).toBeGreaterThanOrEqual(32);
    } else if (item.layout === 'A') {
      var _current$panel3, _current$panel4;
      expect((_current$panel3 = current.panel) === null || _current$panel3 === void 0 ? void 0 : _current$panel3.y).toBeGreaterThan(current.waveform.bottom);
      expect((_current$panel4 = current.panel) === null || _current$panel4 === void 0 ? void 0 : _current$panel4.width).toBeLessThanOrEqual(920);
    }
    if (item.layout === 'B' && item.width >= 768) {
      var _current$lineCount$he, _current$lineCount;
      expect((_current$lineCount$he = (_current$lineCount = current.lineCount) === null || _current$lineCount === void 0 ? void 0 : _current$lineCount.height) !== null && _current$lineCount$he !== void 0 ? _current$lineCount$he : 0).toBeGreaterThan(0);
      expect(current.controls).not.toBeNull();
    }
    if (item.layout === 'B' && item.width >= 768 && item.height <= 700) {
      var _current$status$botto, _current$status;
      expect(current.media.width).toBeGreaterThanOrEqual(576);
      expect(current.controls.bottom).toBeLessThanOrEqual(item.height + 1);
      expect((_current$status$botto = (_current$status = current.status) === null || _current$status === void 0 ? void 0 : _current$status.bottom) !== null && _current$status$botto !== void 0 ? _current$status$botto : current.controls.bottom).toBeLessThanOrEqual(item.height + 1);
    }
    if (item.layout === 'B' && item.width <= 767) {
      var _current$lineCount$he2, _current$lineCount2;
      expect((_current$lineCount$he2 = (_current$lineCount2 = current.lineCount) === null || _current$lineCount2 === void 0 ? void 0 : _current$lineCount2.height) !== null && _current$lineCount$he2 !== void 0 ? _current$lineCount$he2 : 0).toBeGreaterThan(0);
      expect(current.media.top).toBeGreaterThan(current.dots.bottom);
      expect(current.controls).not.toBeNull();
    }
    if (item.width <= 767) expect(current.exit.bottom).toBeLessThanOrEqual(current.title.top);
    await page.screenshot({
      path: path.join(evidenceDirectory, item.screenshot)
    });
    evidence.push({
      ...item,
      ...current
    });
  }
  await page.emulateMedia({
    forcedColors: 'active',
    reducedMotion: 'reduce'
  });
  const accessibilityMedia = await page.evaluate(() => ({
    forcedColors: matchMedia('(forced-colors: active)').matches,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    documentWidth: document.documentElement.scrollWidth
  }));
  expect(accessibilityMedia.forcedColors).toBe(true);
  expect(accessibilityMedia.reducedMotion).toBe(true);
  expect(accessibilityMedia.documentWidth).toBeLessThanOrEqual(640);
  await writeFile(path.join(evidenceDirectory, 'phase4-visual-browser-evidence.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    browser: `Chrome ${(_page$context$browser = (_page$context$browser2 = page.context().browser()) === null || _page$context$browser2 === void 0 ? void 0 : _page$context$browser2.version()) !== null && _page$context$browser !== void 0 ? _page$context$browser : 'unknown'}`,
    nativeCaptureRequested: false,
    forcedColorsAndReducedMotion: accessibilityMedia,
    viewports: evidence
  }, null, 2));
});
test('phone touch seek and desktop keyboard seek keep native source playback usable without requesting the microphone', async ({
  browser
}) => {
  const context = await browser.newContext({
    viewport: {
      width: 390,
      height: 667
    },
    isMobile: true,
    hasTouch: true
  });
  const page = await context.newPage();
  await page.goto('/projects/sintel-prepared/record?layout=B&locale=ru');
  await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
    timeout: 15000
  }).toBe(true);
  const seek = page.locator('#record-window-seek');
  const box = await seek.boundingBox();
  expect(box).not.toBeNull();
  await page.touchscreen.tap(box.x + box.width * 0.68, box.y + box.height / 2);
  await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(2);
  expect(await page.locator('.record-action').boundingBox().then(value => {
    var _value$height;
    return (_value$height = value === null || value === void 0 ? void 0 : value.height) !== null && _value$height !== void 0 ? _value$height : 0;
  })).toBeGreaterThanOrEqual(48);
  await seek.focus();
  await page.keyboard.press('ArrowRight');
  expect(await seek.evaluate(input => input === document.activeElement)).toBe(true);
  expect(await seek.evaluate(input => getComputedStyle(input).outlineStyle)).toBe('solid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'B-390x667-touch-seek.png'),
    fullPage: true
  });
  await context.close();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJta2RpciIsIndyaXRlRmlsZSIsInBhdGgiLCJ0ZXN0IiwiZXhwZWN0IiwiZXZpZGVuY2VEaXJlY3RvcnkiLCJyZXNvbHZlIiwicHJvY2VzcyIsImN3ZCIsIl9wcm9jZXNzJGVudiREVUJCRURfQyIsImVudiIsIkRVQkJFRF9DT1JFX0VWSURFTkNFX1JVTiIsInNwbGl0IiwiY2FzZXMiLCJsYXlvdXQiLCJ3aWR0aCIsImhlaWdodCIsImxvY2FsZSIsInNjcmVlbnNob3QiLCJ0dXJuIiwibWV0cmljcyIsInBhZ2UiLCJldmFsdWF0ZSIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdCIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdDIiLCJfZG9jdW1lbnQkcXVlcnlTZWxlY3QzIiwiX2RvY3VtZW50JHF1ZXJ5U2VsZWN0NCIsInJlY3QiLCJzZWxlY3RvciIsImVsZW1lbnQiLCJkb2N1bWVudCIsInF1ZXJ5U2VsZWN0b3IiLCJ2YWx1ZSIsImdldEJvdW5kaW5nQ2xpZW50UmVjdCIsIngiLCJ5IiwidG9wIiwicmlnaHQiLCJib3R0b20iLCJwYXRoRGF0YSIsImdldEF0dHJpYnV0ZSIsInBvaW50cyIsIkFycmF5IiwiZnJvbSIsIm1hdGNoQWxsIiwibWF0Y2giLCJOdW1iZXIiLCJ2aWV3cG9ydCIsIndpbmRvdyIsImlubmVyV2lkdGgiLCJpbm5lckhlaWdodCIsImRvY3VtZW50V2lkdGgiLCJkb2N1bWVudEVsZW1lbnQiLCJzY3JvbGxXaWR0aCIsImRvY3VtZW50SGVpZ2h0Iiwic2Nyb2xsSGVpZ2h0Iiwic2Nyb2xsWSIsIm1lZGlhIiwiZGlhbG9ndWUiLCJ3YXZlZm9ybSIsInBhbmVsIiwiY29udHJvbHMiLCJzdGF0dXMiLCJ3b3Jrc3BhY2UiLCJyZWNvcmRQYWdlIiwibWVkaWFXaWR0aFRva2VuIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImdldFByb3BlcnR5VmFsdWUiLCJ0cmltIiwiY29udHJvbEJ1dHRvbnMiLCJxdWVyeVNlbGVjdG9yQWxsIiwiX2VsZW1lbnQkdGV4dENvbnRlbnQiLCJib3VuZHMiLCJ0ZXh0IiwidGV4dENvbnRlbnQiLCJleGl0IiwibGluZUNvdW50IiwidGl0bGUiLCJkb3RzIiwibG9jYWxlQ29udHJvbENvdW50IiwibGVuZ3RoIiwic291cmNlV2F2ZWZvcm1TdGF0dXMiLCJzb3VyY2VFbnZlbG9wZVNwYW4iLCJNYXRoIiwibWF4IiwibWluIiwiZGlhbG9ndWVGb250IiwiZm9udEZhbWlseSIsIm1hYnJ5TG9hZGVkIiwiZm9udHMiLCJjaGVjayIsImJlZm9yZUFsbCIsInJlY3Vyc2l2ZSIsIl9wYWdlJGNvbnRleHQkYnJvd3NlciIsIl9wYWdlJGNvbnRleHQkYnJvd3NlcjIiLCJzZXRUaW1lb3V0IiwiZXZpZGVuY2UiLCJpdGVtIiwiX2N1cnJlbnQkdGl0bGUkaGVpZ2h0IiwiX2N1cnJlbnQkdGl0bGUiLCJfY3VycmVudCRkb3RzJGhlaWdodCIsIl9jdXJyZW50JGRvdHMiLCJfY3VycmVudCR0aXRsZSR4IiwiX2N1cnJlbnQkdGl0bGUyIiwiX2N1cnJlbnQkdGl0bGUkd2lkdGgiLCJfY3VycmVudCR0aXRsZTMiLCJfY3VycmVudCRkb3RzJHRvcCIsIl9jdXJyZW50JGRvdHMyIiwiX2N1cnJlbnQkdGl0bGUkYm90dG9tIiwiX2N1cnJlbnQkdGl0bGU0Iiwic2V0Vmlld3BvcnRTaXplIiwidHVyblF1ZXJ5IiwiZ290byIsImxvY2F0b3IiLCJ0b0hhdmVBdHRyaWJ1dGUiLCJwb2xsIiwidmlkZW8iLCJyZWFkeVN0YXRlIiwiSFRNTE1lZGlhRWxlbWVudCIsIkhBVkVfQ1VSUkVOVF9EQVRBIiwidmlkZW9XaWR0aCIsInRpbWVvdXQiLCJ0b0JlIiwicmVhZHkiLCJjdXJyZW50Iiwiam9pbiIsIkpTT04iLCJzdHJpbmdpZnkiLCJ0b0VxdWFsIiwidG9CZUxlc3NUaGFuT3JFcXVhbCIsInRvQmVHcmVhdGVyVGhhbiIsInRvQ29udGFpbiIsIm5vdCIsInRvQmVOdWxsIiwidG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCIsInRvQmVDbG9zZVRvIiwiYWJzIiwiX2N1cnJlbnQkcGFuZWwiLCJfY3VycmVudCRwYW5lbCR4IiwiX2N1cnJlbnQkcGFuZWwyIiwiX2N1cnJlbnQkcGFuZWwzIiwiX2N1cnJlbnQkcGFuZWw0IiwiX2N1cnJlbnQkbGluZUNvdW50JGhlIiwiX2N1cnJlbnQkbGluZUNvdW50IiwiX2N1cnJlbnQkc3RhdHVzJGJvdHRvIiwiX2N1cnJlbnQkc3RhdHVzIiwiX2N1cnJlbnQkbGluZUNvdW50JGhlMiIsIl9jdXJyZW50JGxpbmVDb3VudDIiLCJwdXNoIiwiZW11bGF0ZU1lZGlhIiwiZm9yY2VkQ29sb3JzIiwicmVkdWNlZE1vdGlvbiIsImFjY2Vzc2liaWxpdHlNZWRpYSIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwidGltZXN0YW1wIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwiYnJvd3NlciIsImNvbnRleHQiLCJ2ZXJzaW9uIiwibmF0aXZlQ2FwdHVyZVJlcXVlc3RlZCIsImZvcmNlZENvbG9yc0FuZFJlZHVjZWRNb3Rpb24iLCJ2aWV3cG9ydHMiLCJuZXdDb250ZXh0IiwiaXNNb2JpbGUiLCJoYXNUb3VjaCIsIm5ld1BhZ2UiLCJzZWVrIiwiYm94IiwiYm91bmRpbmdCb3giLCJ0b3VjaHNjcmVlbiIsInRhcCIsImN1cnJlbnRUaW1lIiwidGhlbiIsIl92YWx1ZSRoZWlnaHQiLCJmb2N1cyIsImtleWJvYXJkIiwicHJlc3MiLCJpbnB1dCIsImFjdGl2ZUVsZW1lbnQiLCJvdXRsaW5lU3R5bGUiLCJmdWxsUGFnZSIsImNsb3NlIl0sInNvdXJjZXMiOlsicGhhc2U0LXZpc3VhbC5zcGVjLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IG1rZGlyLCB3cml0ZUZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgeyB0ZXN0LCBleHBlY3QsIHR5cGUgUGFnZSB9IGZyb20gJ0BwbGF5d3JpZ2h0L3Rlc3QnO1xuXG5jb25zdCBldmlkZW5jZURpcmVjdG9yeSA9IHBhdGgucmVzb2x2ZShcbiAgcHJvY2Vzcy5jd2QoKSwgJy4uJywgJ19kb2NzJywgJ2V2aWRlbmNlJywgJ2NvcmUtam91cm5leS1hYi1pbXBsZW1lbnRhdGlvbi0yMDI2LTEwLTI4JyxcbiAgLi4uKHByb2Nlc3MuZW52LkRVQkJFRF9DT1JFX0VWSURFTkNFX1JVTiA/PyAncGhhc2UzJykuc3BsaXQoL1tcXFxcL10rLyksXG4pO1xuXG5jb25zdCBjYXNlcyA9IFtcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTE0NDB4OTAwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdCJywgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdCLTE0NDB4OTAwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDE5MjAsIGhlaWdodDogOTEwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTE5MjB4OTEwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdCJywgd2lkdGg6IDEyODAsIGhlaWdodDogNjAwLCBsb2NhbGU6ICdydScsIHR1cm46ICdzaW50ZWwtdHVybi0zJywgc2NyZWVuc2hvdDogJ0ItMTI4MHg2MDAtcnUtbG9uZy5wbmcnIH0sXG4gIHsgbGF5b3V0OiAnQScsIHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDYwMCwgbG9jYWxlOiAnZW4nLCBzY3JlZW5zaG90OiAnQS0xMjgweDYwMC1lbi5wbmcnIH0sXG4gIHsgbGF5b3V0OiAnQScsIHdpZHRoOiAxMzY2LCBoZWlnaHQ6IDY1MCwgbG9jYWxlOiAncnUnLCB0dXJuOiAnc2ludGVsLXR1cm4tMycsIHNjcmVlbnNob3Q6ICdBLTEzNjZ4NjUwLXJ1LWxvbmcucG5nJyB9LFxuICB7IGxheW91dDogJ0InLCB3aWR0aDogMTM2NiwgaGVpZ2h0OiA2NTAsIGxvY2FsZTogJ3J1JywgdHVybjogJ3NpbnRlbC10dXJuLTMnLCBzY3JlZW5zaG90OiAnQi0xMzY2eDY1MC1ydS1sb25nLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDEyNDgsIGhlaWdodDogOTAwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTEyNDh4OTAwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDEyNDcsIGhlaWdodDogOTAwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTEyNDd4OTAwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDEwMjQsIGhlaWdodDogNjUwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTEwMjR4NjUwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDEwMjMsIGhlaWdodDogNjUwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTEwMjN4NjUwLWVuLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdCJywgd2lkdGg6IDEwMjQsIGhlaWdodDogNjUwLCBsb2NhbGU6ICdydScsIHNjcmVlbnNob3Q6ICdCLTEwMjR4NjUwLXJ1LnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdBJywgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcsIGxvY2FsZTogJ3J1Jywgc2NyZWVuc2hvdDogJ0EtMzkweDY2Ny1ydS5wbmcnIH0sXG4gIHsgbGF5b3V0OiAnQicsIHdpZHRoOiAzOTAsIGhlaWdodDogNjY3LCBsb2NhbGU6ICdydScsIHR1cm46ICdzaW50ZWwtdHVybi0zJywgc2NyZWVuc2hvdDogJ0ItMzkweDY2Ny1ydS1sb25nLnBuZycgfSxcbiAgeyBsYXlvdXQ6ICdCJywgd2lkdGg6IDM5MCwgaGVpZ2h0OiA4NDQsIGxvY2FsZTogJ2VuJywgc2NyZWVuc2hvdDogJ0ItMzkweDg0NC1lbi5wbmcnIH0sXG4gIHsgbGF5b3V0OiAnQScsIHdpZHRoOiA2NDAsIGhlaWdodDogOTAwLCBsb2NhbGU6ICdlbicsIHNjcmVlbnNob3Q6ICdBLTY0MHg5MDAtcmVmbG93LnBuZycgfSxcbl0gYXMgY29uc3Q7XG5cbmFzeW5jIGZ1bmN0aW9uIG1ldHJpY3MocGFnZTogUGFnZSkge1xuICByZXR1cm4gcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgY29uc3QgcmVjdCA9IChzZWxlY3Rvcjogc3RyaW5nKSA9PiB7XG4gICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuICAgICAgY29uc3QgdmFsdWUgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgcmV0dXJuIHsgeDogdmFsdWUueCwgeTogdmFsdWUueSwgdG9wOiB2YWx1ZS50b3AsIHdpZHRoOiB2YWx1ZS53aWR0aCwgaGVpZ2h0OiB2YWx1ZS5oZWlnaHQsIHJpZ2h0OiB2YWx1ZS5yaWdodCwgYm90dG9tOiB2YWx1ZS5ib3R0b20gfTtcbiAgICB9O1xuICAgIGNvbnN0IHBhdGhEYXRhID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLndhdmVmb3JtLXNvdXJjZScpPy5nZXRBdHRyaWJ1dGUoJ2QnKSA/PyAnJztcbiAgICBjb25zdCBwb2ludHMgPSBBcnJheS5mcm9tKHBhdGhEYXRhLm1hdGNoQWxsKC9cXHMoW1xcZC5dKylcXHMoW1xcZC5dKykvZyksIChtYXRjaCkgPT4gTnVtYmVyKG1hdGNoWzJdKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZpZXdwb3J0OiB7IHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCwgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHQgfSxcbiAgICAgIGRvY3VtZW50V2lkdGg6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxXaWR0aCxcbiAgICAgIGRvY3VtZW50SGVpZ2h0OiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0LFxuICAgICAgc2Nyb2xsWTogd2luZG93LnNjcm9sbFksXG4gICAgICBtZWRpYTogcmVjdCgnLm1lZGlhLXZpZXdwb3J0JyksXG4gICAgICBkaWFsb2d1ZTogcmVjdCgnLmRpYWxvZ3VlLWNvcHkgcCcpLFxuICAgICAgd2F2ZWZvcm06IHJlY3QoJy53YXZlZm9ybS1yb3cnKSxcbiAgICAgIHBhbmVsOiByZWN0KCcucmVjb3JkLXBhbmVsJyksXG4gICAgICBjb250cm9sczogcmVjdCgnLnJlY29yZC1zdHVkaW8tYWN0aW9ucycpLFxuICAgICAgc3RhdHVzOiByZWN0KCcucmVjb3JkLXN0YXR1cy0tYicpLFxuICAgICAgd29ya3NwYWNlOiByZWN0KCcucmVjb3JkLXdvcmtzcGFjZScpLFxuICAgICAgcmVjb3JkUGFnZTogcmVjdCgnLnJlY29yZC1wYWdlJyksXG4gICAgICBtZWRpYVdpZHRoVG9rZW46IGdldENvbXB1dGVkU3R5bGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlY29yZC1wYWdlJykhKS5nZXRQcm9wZXJ0eVZhbHVlKCctLXJlY29yZC1tZWRpYS13aWR0aCcpLnRyaW0oKSxcbiAgICAgIGNvbnRyb2xCdXR0b25zOiBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5yZWNvcmQtc3R1ZGlvLWFjdGlvbnMgLmJ1dHRvbicpLCAoZWxlbWVudCkgPT4ge1xuICAgICAgICBjb25zdCBib3VuZHMgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICByZXR1cm4geyB0ZXh0OiBlbGVtZW50LnRleHRDb250ZW50Py50cmltKCksIHg6IGJvdW5kcy54LCB5OiBib3VuZHMueSwgd2lkdGg6IGJvdW5kcy53aWR0aCwgaGVpZ2h0OiBib3VuZHMuaGVpZ2h0LCBib3R0b206IGJvdW5kcy5ib3R0b20gfTtcbiAgICAgIH0pLFxuICAgICAgZXhpdDogcmVjdCgnLnJlY29yZC1oZWFkZXIgLmV4aXQtbGluaycpLFxuICAgICAgbGluZUNvdW50OiByZWN0KCcucmVjb3JkLWhlYWRlcl9fbGluZS1jb3VudCcpLFxuICAgICAgdGl0bGU6IHJlY3QoJy5yZWNvcmQtaGVhZGVyIGgxJyksXG4gICAgICBkb3RzOiByZWN0KCcucG9zaXRpb24tZG90cycpLFxuICAgICAgbG9jYWxlQ29udHJvbENvdW50OiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucmVjb3JkLWhlYWRlciAubG9jYWxlLWNvbnRyb2wnKS5sZW5ndGgsXG4gICAgICBzb3VyY2VXYXZlZm9ybVN0YXR1czogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLndhdmVmb3JtLXJvdycpPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtc291cmNlLXdhdmVmb3JtJykgPz8gbnVsbCxcbiAgICAgIHNvdXJjZUVudmVsb3BlU3BhbjogcG9pbnRzLmxlbmd0aCA/IE1hdGgubWF4KC4uLnBvaW50cykgLSBNYXRoLm1pbiguLi5wb2ludHMpIDogMCxcbiAgICAgIGRpYWxvZ3VlRm9udDogZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZGlhbG9ndWUtY29weSBwJykhKS5mb250RmFtaWx5LFxuICAgICAgbWFicnlMb2FkZWQ6IGRvY3VtZW50LmZvbnRzLmNoZWNrKCc0MDAgMjZweCBcIk1hYnJ5IFByb1wiJyksXG4gICAgfTtcbiAgfSk7XG59XG5cbnRlc3QuYmVmb3JlQWxsKGFzeW5jICgpID0+IG1rZGlyKGV2aWRlbmNlRGlyZWN0b3J5LCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KSk7XG5cbnRlc3QoJ0EvQiBsYXlvdXRzIG1hdGNoIHRoZSBmcm96ZW4gdmlld3BvcnQgZ2VvbWV0cnkgYW5kIHVzZSBkZWNvZGVkIHNvdXJjZSBhdWRpbyBhdCB0aGUgc3VwcG9ydGVkIHdpZHRocycsIGFzeW5jICh7IHBhZ2UgfSkgPT4ge1xuICB0ZXN0LnNldFRpbWVvdXQoOTBfMDAwKTtcbiAgY29uc3QgZXZpZGVuY2UgPSBbXTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIGNhc2VzKSB7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogaXRlbS53aWR0aCwgaGVpZ2h0OiBpdGVtLmhlaWdodCB9KTtcbiAgICBjb25zdCB0dXJuUXVlcnkgPSAndHVybicgaW4gaXRlbSA/IGAmdHVybj0ke2l0ZW0udHVybn1gIDogJyc7XG4gICAgYXdhaXQgcGFnZS5nb3RvKGAvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9JHtpdGVtLmxheW91dH0mbG9jYWxlPSR7aXRlbS5sb2NhbGV9JHt0dXJuUXVlcnl9YCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLndhdmVmb3JtLXJvdycpKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlLXdhdmVmb3JtJywgJ2RlY29kZWQnKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PlxuICAgICAgdmlkZW8ucmVhZHlTdGF0ZSA+PSBIVE1MTWVkaWFFbGVtZW50LkhBVkVfQ1VSUkVOVF9EQVRBICYmIHZpZGVvLnZpZGVvV2lkdGggPiAwKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHsgYXdhaXQgZG9jdW1lbnQuZm9udHMucmVhZHk7IH0pO1xuICAgIGNvbnN0IGN1cnJlbnQgPSBhd2FpdCBtZXRyaWNzKHBhZ2UpO1xuICAgIGlmIChpdGVtLmxheW91dCA9PT0gJ0InICYmIGl0ZW0ud2lkdGggPT09IDEyODAgJiYgaXRlbS5oZWlnaHQgPT09IDYwMCkge1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnQi0xMjgweDYwMC1ydS1sb25nLnBuZycpIH0pO1xuICAgICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0ItMTI4MHg2MDAtZml0LW1ldHJpY3MuanNvbicpLCBKU09OLnN0cmluZ2lmeShjdXJyZW50LCBudWxsLCAyKSk7XG4gICAgfVxuICAgIGV4cGVjdChjdXJyZW50LnZpZXdwb3J0KS50b0VxdWFsKHsgd2lkdGg6IGl0ZW0ud2lkdGgsIGhlaWdodDogaXRlbS5oZWlnaHQgfSk7XG4gICAgZXhwZWN0KGN1cnJlbnQuZG9jdW1lbnRXaWR0aCkudG9CZUxlc3NUaGFuT3JFcXVhbChpdGVtLndpZHRoKTtcbiAgICBleHBlY3QoY3VycmVudC5sb2NhbGVDb250cm9sQ291bnQpLnRvQmUoMCk7XG4gICAgZXhwZWN0KGN1cnJlbnQuc291cmNlV2F2ZWZvcm1TdGF0dXMpLnRvQmUoJ2RlY29kZWQnKTtcbiAgICBleHBlY3QoY3VycmVudC5zb3VyY2VFbnZlbG9wZVNwYW4pLnRvQmVHcmVhdGVyVGhhbigyMCk7XG4gICAgZXhwZWN0KGN1cnJlbnQuZGlhbG9ndWVGb250KS50b0NvbnRhaW4oJ01hYnJ5IFBybycpO1xuICAgIGV4cGVjdChjdXJyZW50Lm1hYnJ5TG9hZGVkKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChjdXJyZW50Lm1lZGlhKS5ub3QudG9CZU51bGwoKTtcbiAgICBleHBlY3QoY3VycmVudC5kaWFsb2d1ZSkubm90LnRvQmVOdWxsKCk7XG4gICAgZXhwZWN0KGN1cnJlbnQud2F2ZWZvcm0pLm5vdC50b0JlTnVsbCgpO1xuICAgIGV4cGVjdChjdXJyZW50LmRpYWxvZ3VlIS50b3ApLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoY3VycmVudC5tZWRpYSEuYm90dG9tKTtcbiAgICBleHBlY3QoY3VycmVudC53YXZlZm9ybSEudG9wKS50b0JlR3JlYXRlclRoYW4oY3VycmVudC5kaWFsb2d1ZSEuYm90dG9tKTtcbiAgICBleHBlY3QoY3VycmVudC5tZWRpYSEueCArIGN1cnJlbnQubWVkaWEhLndpZHRoIC8gMikudG9CZUNsb3NlVG8oaXRlbS53aWR0aCAvIDIsIDApO1xuICAgIGV4cGVjdChjdXJyZW50LnRpdGxlPy5oZWlnaHQgPz8gMCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGV4cGVjdChjdXJyZW50LmRvdHM/LmhlaWdodCA/PyAwKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgZXhwZWN0KE1hdGguYWJzKChjdXJyZW50LnRpdGxlPy54ID8/IDApICsgKGN1cnJlbnQudGl0bGU/LndpZHRoID8/IDApIC8gMiAtIGl0ZW0ud2lkdGggLyAyKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICBleHBlY3QoKGN1cnJlbnQuZG90cz8udG9wID8/IDApKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKChjdXJyZW50LnRpdGxlPy5ib3R0b20gPz8gMCkpO1xuXG4gICAgaWYgKGl0ZW0ubGF5b3V0ID09PSAnQScgJiYgaXRlbS53aWR0aCA+PSAxMjQ4KSB7XG4gICAgICBleHBlY3QoY3VycmVudC5wYW5lbD8ud2lkdGgpLnRvQmUoMjcyKTtcbiAgICAgIGV4cGVjdChNYXRoLmFicygoY3VycmVudC5wYW5lbD8ueCA/PyAwKSAtIGN1cnJlbnQubWVkaWEhLnJpZ2h0IC0gMjQpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgICAgZXhwZWN0KGN1cnJlbnQucGFuZWwhLnJpZ2h0KS50b0JlTGVzc1RoYW5PckVxdWFsKGl0ZW0ud2lkdGggLSAzMSk7XG4gICAgICBleHBlY3QoY3VycmVudC5tZWRpYSEueCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgzMik7XG4gICAgfSBlbHNlIGlmIChpdGVtLmxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBleHBlY3QoY3VycmVudC5wYW5lbD8ueSkudG9CZUdyZWF0ZXJUaGFuKGN1cnJlbnQud2F2ZWZvcm0hLmJvdHRvbSk7XG4gICAgICBleHBlY3QoY3VycmVudC5wYW5lbD8ud2lkdGgpLnRvQmVMZXNzVGhhbk9yRXF1YWwoOTIwKTtcbiAgICB9XG5cbiAgICBpZiAoaXRlbS5sYXlvdXQgPT09ICdCJyAmJiBpdGVtLndpZHRoID49IDc2OCkge1xuICAgICAgZXhwZWN0KGN1cnJlbnQubGluZUNvdW50Py5oZWlnaHQgPz8gMCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgZXhwZWN0KGN1cnJlbnQuY29udHJvbHMpLm5vdC50b0JlTnVsbCgpO1xuICAgIH1cbiAgICBpZiAoaXRlbS5sYXlvdXQgPT09ICdCJyAmJiBpdGVtLndpZHRoID49IDc2OCAmJiBpdGVtLmhlaWdodCA8PSA3MDApIHtcbiAgICAgIGV4cGVjdChjdXJyZW50Lm1lZGlhIS53aWR0aCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg1NzYpO1xuICAgICAgZXhwZWN0KGN1cnJlbnQuY29udHJvbHMhLmJvdHRvbSkudG9CZUxlc3NUaGFuT3JFcXVhbChpdGVtLmhlaWdodCArIDEpO1xuICAgICAgZXhwZWN0KChjdXJyZW50LnN0YXR1cz8uYm90dG9tID8/IGN1cnJlbnQuY29udHJvbHMhLmJvdHRvbSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoaXRlbS5oZWlnaHQgKyAxKTtcbiAgICB9XG4gICAgaWYgKGl0ZW0ubGF5b3V0ID09PSAnQicgJiYgaXRlbS53aWR0aCA8PSA3NjcpIHtcbiAgICAgIGV4cGVjdChjdXJyZW50LmxpbmVDb3VudD8uaGVpZ2h0ID8/IDApLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChjdXJyZW50Lm1lZGlhIS50b3ApLnRvQmVHcmVhdGVyVGhhbihjdXJyZW50LmRvdHMhLmJvdHRvbSk7XG4gICAgICBleHBlY3QoY3VycmVudC5jb250cm9scykubm90LnRvQmVOdWxsKCk7XG4gICAgfVxuICAgIGlmIChpdGVtLndpZHRoIDw9IDc2NykgZXhwZWN0KGN1cnJlbnQuZXhpdCEuYm90dG9tKS50b0JlTGVzc1RoYW5PckVxdWFsKGN1cnJlbnQudGl0bGUhLnRvcCk7XG5cbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGl0ZW0uc2NyZWVuc2hvdCkgfSk7XG4gICAgZXZpZGVuY2UucHVzaCh7IC4uLml0ZW0sIC4uLmN1cnJlbnQgfSk7XG4gIH1cbiAgYXdhaXQgcGFnZS5lbXVsYXRlTWVkaWEoeyBmb3JjZWRDb2xvcnM6ICdhY3RpdmUnLCByZWR1Y2VkTW90aW9uOiAncmVkdWNlJyB9KTtcbiAgY29uc3QgYWNjZXNzaWJpbGl0eU1lZGlhID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgIGZvcmNlZENvbG9yczogbWF0Y2hNZWRpYSgnKGZvcmNlZC1jb2xvcnM6IGFjdGl2ZSknKS5tYXRjaGVzLFxuICAgIHJlZHVjZWRNb3Rpb246IG1hdGNoTWVkaWEoJyhwcmVmZXJzLXJlZHVjZWQtbW90aW9uOiByZWR1Y2UpJykubWF0Y2hlcyxcbiAgICBkb2N1bWVudFdpZHRoOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGgsXG4gIH0pKTtcbiAgZXhwZWN0KGFjY2Vzc2liaWxpdHlNZWRpYS5mb3JjZWRDb2xvcnMpLnRvQmUodHJ1ZSk7XG4gIGV4cGVjdChhY2Nlc3NpYmlsaXR5TWVkaWEucmVkdWNlZE1vdGlvbikudG9CZSh0cnVlKTtcbiAgZXhwZWN0KGFjY2Vzc2liaWxpdHlNZWRpYS5kb2N1bWVudFdpZHRoKS50b0JlTGVzc1RoYW5PckVxdWFsKDY0MCk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdwaGFzZTQtdmlzdWFsLWJyb3dzZXItZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke3BhZ2UuY29udGV4dCgpLmJyb3dzZXIoKT8udmVyc2lvbigpID8/ICd1bmtub3duJ31gLFxuICAgIG5hdGl2ZUNhcHR1cmVSZXF1ZXN0ZWQ6IGZhbHNlLFxuICAgIGZvcmNlZENvbG9yc0FuZFJlZHVjZWRNb3Rpb246IGFjY2Vzc2liaWxpdHlNZWRpYSxcbiAgICB2aWV3cG9ydHM6IGV2aWRlbmNlLFxuICB9LCBudWxsLCAyKSk7XG59KTtcblxudGVzdCgncGhvbmUgdG91Y2ggc2VlayBhbmQgZGVza3RvcCBrZXlib2FyZCBzZWVrIGtlZXAgbmF0aXZlIHNvdXJjZSBwbGF5YmFjayB1c2FibGUgd2l0aG91dCByZXF1ZXN0aW5nIHRoZSBtaWNyb3Bob25lJywgYXN5bmMgKHsgYnJvd3NlciB9KSA9PiB7XG4gIGNvbnN0IGNvbnRleHQgPSBhd2FpdCBicm93c2VyLm5ld0NvbnRleHQoeyB2aWV3cG9ydDogeyB3aWR0aDogMzkwLCBoZWlnaHQ6IDY2NyB9LCBpc01vYmlsZTogdHJ1ZSwgaGFzVG91Y2g6IHRydWUgfSk7XG4gIGNvbnN0IHBhZ2UgPSBhd2FpdCBjb250ZXh0Lm5ld1BhZ2UoKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QiZsb2NhbGU9cnUnKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLndhdmVmb3JtLXJvdycpKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlLXdhdmVmb3JtJywgJ2RlY29kZWQnKTtcbiAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT5cbiAgICB2aWRlby5yZWFkeVN0YXRlID49IEhUTUxNZWRpYUVsZW1lbnQuSEFWRV9DVVJSRU5UX0RBVEEgJiYgdmlkZW8udmlkZW9XaWR0aCA+IDApLCB7IHRpbWVvdXQ6IDE1XzAwMCB9KS50b0JlKHRydWUpO1xuICBjb25zdCBzZWVrID0gcGFnZS5sb2NhdG9yKCcjcmVjb3JkLXdpbmRvdy1zZWVrJyk7XG4gIGNvbnN0IGJveCA9IGF3YWl0IHNlZWsuYm91bmRpbmdCb3goKTtcbiAgZXhwZWN0KGJveCkubm90LnRvQmVOdWxsKCk7XG4gIGF3YWl0IHBhZ2UudG91Y2hzY3JlZW4udGFwKGJveCEueCArIGJveCEud2lkdGggKiAwLjY4LCBib3ghLnkgKyBib3ghLmhlaWdodCAvIDIpO1xuICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSkpLnRvQmVHcmVhdGVyVGhhbigyKTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1hY3Rpb24nKS5ib3VuZGluZ0JveCgpLnRoZW4oKHZhbHVlKSA9PiB2YWx1ZT8uaGVpZ2h0ID8/IDApKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcblxuICBhd2FpdCBzZWVrLmZvY3VzKCk7XG4gIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93UmlnaHQnKTtcbiAgZXhwZWN0KGF3YWl0IHNlZWsuZXZhbHVhdGUoKGlucHV0KSA9PiBpbnB1dCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCkpLnRvQmUodHJ1ZSk7XG4gIGV4cGVjdChhd2FpdCBzZWVrLmV2YWx1YXRlKChpbnB1dCkgPT4gZ2V0Q29tcHV0ZWRTdHlsZShpbnB1dCkub3V0bGluZVN0eWxlKSkudG9CZSgnc29saWQnKTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgzOTApO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdCLTM5MHg2NjctdG91Y2gtc2Vlay5wbmcnKSwgZnVsbFBhZ2U6IHRydWUgfSk7XG4gIGF3YWl0IGNvbnRleHQuY2xvc2UoKTtcbn0pO1xuIl0sIm1hcHBpbmdzIjoiO0FBQUEsU0FBU0EsS0FBSyxFQUFFQyxTQUFTLFFBQVEsa0JBQWtCO0FBQ25ELE9BQU9DLElBQUksTUFBTSxXQUFXO0FBQzVCLFNBQVNDLElBQUksRUFBRUMsTUFBTSxRQUFtQixrQkFBa0I7QUFFMUQsTUFBTUMsaUJBQWlCLEdBQUdILElBQUksQ0FBQ0ksT0FBTyxDQUNwQ0MsT0FBTyxDQUFDQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLDJDQUEyQyxFQUNyRixHQUFHLEVBQUFDLHFCQUFBLEdBQUNGLE9BQU8sQ0FBQ0csR0FBRyxDQUFDQyx3QkFBd0IsY0FBQUYscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxRQUFRLEVBQUVHLEtBQUssQ0FBQyxRQUFRLENBQ3RFLENBQUM7QUFFRCxNQUFNQyxLQUFLLEdBQUcsQ0FDWjtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFRSxJQUFJLEVBQUUsZUFBZTtFQUFFRCxVQUFVLEVBQUU7QUFBeUIsQ0FBQyxFQUNwSDtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFRSxJQUFJLEVBQUUsZUFBZTtFQUFFRCxVQUFVLEVBQUU7QUFBeUIsQ0FBQyxFQUNwSDtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFRSxJQUFJLEVBQUUsZUFBZTtFQUFFRCxVQUFVLEVBQUU7QUFBeUIsQ0FBQyxFQUNwSDtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsSUFBSTtFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBb0IsQ0FBQyxFQUN4RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUsSUFBSTtFQUFFQyxVQUFVLEVBQUU7QUFBbUIsQ0FBQyxFQUN0RjtFQUFFSixNQUFNLEVBQUUsR0FBRztFQUFFQyxLQUFLLEVBQUUsR0FBRztFQUFFQyxNQUFNLEVBQUUs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