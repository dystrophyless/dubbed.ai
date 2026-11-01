import { expect, test } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const evidenceDirectory = resolve(
  process.cwd(), '..', '_docs', 'evidence', 'core-journey-ab-implementation-2026-10-28',
  ...(process.env.DUBBED_CORE_EVIDENCE_RUN ?? 'phase3').split(/[\\/]+/),
);

declare global {
  interface Window {
    __nativeTrace: { getUserMedia: number; recorderStarts: number; recorderStops: number; trackStops: number };
  }
}

test('seeded routes render both explicit layouts and guarded neighboring states without requesting media', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeTrace = { getUserMedia: 0, recorderStarts: 0, recorderStops: 0, trackStops: 0 };
    if (navigator.mediaDevices?.getUserMedia) {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        value: async (constraints: MediaStreamConstraints) => {
          window.__nativeTrace.getUserMedia += 1;
          const stream = await original(constraints);
          for (const track of stream.getTracks()) {
            const stop = track.stop.bind(track);
            Object.defineProperty(track, 'stop', { configurable: true, value: () => { window.__nativeTrace.trackStops += 1; stop(); } });
          }
          return stream;
        },
      });
    }
    const recorder = window.MediaRecorder.prototype;
    const start = recorder.start;
    const stop = recorder.stop;
    recorder.start = function (...args) {
      window.__nativeTrace.recorderStarts += 1;
      return start.apply(this, args);
    };
    recorder.stop = function (...args) {
      window.__nativeTrace.recorderStops += 1;
      return stop.apply(this, args);
    };
  });

  for (const layout of ['A', 'B'] as const) {
    await page.goto(`/projects/sintel-prepared/record?layout=${layout}&locale=en`);
    await expect(page.locator(`[data-layout="${layout}"]`)).toBeVisible();
    await expect(page.getByText('What brings you to the land of the gatekeepers?')).toBeVisible();
    await page.waitForFunction(() => {
      const video = document.querySelector('video');
      return !!video && video.readyState >= 2 && video.videoWidth === 960 && video.videoHeight === 408;
    });
    await page.locator('video').evaluate(async (element) => {
      const video = element as HTMLVideoElement;
      video.muted = true;
      await video.play();
      await new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve()));
      video.pause();
    });
    const evidenceDir = evidenceDirectory;
    await mkdir(evidenceDir, { recursive: true });
    await page.screenshot({ path: join(evidenceDir, `layout-${layout.toLowerCase()}-seeded-route.png`), fullPage: true });
    const trace = await page.evaluate(() => window.__nativeTrace);
    expect(trace).toEqual({ getUserMedia: 0, recorderStarts: 0, recorderStops: 0, trackStops: 0 });
  }

  await page.goto('/projects/sintel-prepared/result?layout=B&locale=ru');
  await expect(page.getByText('Сначала запишите все диалоговые окна, чтобы открыть разрешённый результат.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Вернуться к записи', exact: true })).toBeVisible();

  await page.goto('/projects/another-account/record?layout=A&locale=ru');
  await expect(page.getByText('Этот проект недоступен для локального тестового профиля.')).toBeVisible();
  expect(await page.evaluate(() => window.__nativeTrace)).toMatchObject({ getUserMedia: 0, recorderStarts: 0 });
});

test('fixture dialog uses native dialog semantics and remains local', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Fixture sources' }).click();
  const dialog = page.getByRole('dialog', { name: 'Local fixture sources' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Sintel · Blender Foundation · CC BY 3.0')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.getByLabel('Language').selectOption('ru');
  await expect(page.getByRole('heading', { name: 'Локальная основа Dubbed' })).toBeVisible();
});

test('seeded source and illustrative generation media decode with the recorded bytes and geometry', async ({ page }) => {
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  const fixtures = await page.evaluate(async () => {
    const files = [
      '/media/scene.mp4',
      '/media/example-dub.mp4',
      '/media/result-generation-002.webm',
    ];
    return Promise.all(files.map(async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not read ${url}: ${response.status}`);
      const bytes = await response.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
      const video = document.createElement('video');
      video.preload = 'metadata';
      const metadata = new Promise<void>((resolve, reject) => {
        video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        video.addEventListener('error', () => reject(new Error(`Could not decode ${url}.`)), { once: true });
      });
      video.src = url;
      await metadata;
      let durationSeconds = video.duration;
      let durationMeasuredBy = 'metadata';
      if (!Number.isFinite(durationSeconds)) {
        video.muted = true;
        video.playbackRate = 8;
        const endedDuration = new Promise<number>((resolve, reject) => {
          const timeout = window.setTimeout(() => reject(new Error(`Timed out playing ${url} to its end.`)), 10_000);
          video.addEventListener('ended', () => {
            window.clearTimeout(timeout);
            resolve(video.currentTime);
          }, { once: true });
          video.addEventListener('error', () => {
            window.clearTimeout(timeout);
            reject(new Error(`Could not play ${url} to its end.`));
          }, { once: true });
        });
        await video.play();
        durationSeconds = await endedDuration;
        durationMeasuredBy = 'full-playback-end';
      }
      return { url, bytes: bytes.byteLength, sha256, durationSeconds, durationMeasuredBy, width: video.videoWidth, height: video.videoHeight };
    }));
  });
  expect(fixtures).toMatchObject([
    { url: '/media/scene.mp4', bytes: 886403, sha256: 'c99eada0a03cb9f4a2ab41641a81ce6b74f628bc15ded4b3319a43c3fc9d766c', width: 960, height: 408 },
    { url: '/media/example-dub.mp4', bytes: 749601, sha256: 'fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9', width: 960, height: 408 },
    { url: '/media/result-generation-002.webm', bytes: 2514724, sha256: 'f3802515a6738409226b8c9c705d31671e7768f81043ada452302240bb146d93', width: 960, height: 408 },
  ]);
  expect(fixtures[0].durationSeconds).toBeCloseTo(13.416667, 3);
  expect(fixtures[1].durationSeconds).toBeCloseTo(13.416667, 3);
  expect(fixtures[2].durationSeconds).toBeGreaterThan(13.3);
  expect(fixtures[2].durationSeconds).toBeLessThan(13.5);

    const evidenceDir = evidenceDirectory;
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(join(evidenceDir, 'media-fixtures-proof.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    browser: page.context().browser()?.version() ?? 'unknown',
    sourceAttribution: 'Sintel · Blender Foundation · CC BY 3.0',
    fixtures,
    generatedFixtureProvenance: 'The WebM uses the approved source video and three supplied synthetic WAV takes; not a user recording or product render.',
    productRendered: false,
    assembledFromAcceptedTakes: false,
  }, null, 2), 'utf8');
});
