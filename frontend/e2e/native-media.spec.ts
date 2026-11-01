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

test('uses native browser fake input only after explicit action and recovers persisted Blob by operation ID', async ({ page }) => {
  await page.addInitScript(() => {
    window.__nativeTrace = { getUserMedia: 0, recorderStarts: 0, recorderStops: 0, trackStops: 0 };
    const devices = navigator.mediaDevices;
    const originalGetUserMedia = devices.getUserMedia.bind(devices);
    Object.defineProperty(devices, 'getUserMedia', {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        window.__nativeTrace.getUserMedia += 1;
        const stream = await originalGetUserMedia(constraints);
        for (const track of stream.getTracks()) {
          const stop = track.stop.bind(track);
          Object.defineProperty(track, 'stop', { configurable: true, value: () => { window.__nativeTrace.trackStops += 1; stop(); } });
        }
        return stream;
      },
    });
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

  await page.goto('/__dev/native-media?fakeInput=1');
  await expect(page.getByRole('heading', { name: 'Native browser media verification' })).toBeVisible();
  await expect(page.getByText('Browser-supplied fake input · verification only; not a physical microphone')).toBeVisible();
  await expect(page.evaluate(() => window.__nativeTrace)).resolves.toEqual({ getUserMedia: 0, recorderStarts: 0, recorderStops: 0, trackStops: 0 });

  await page.getByRole('button', { name: 'Capture one sample' }).click();
  const details = page.getByTestId('capture-details');
  await expect(details).toBeVisible({ timeout: 20_000 });
  const evidence = await details.evaluate((element) => {
    const node = element as HTMLElement;
    return {
      status: node.dataset.status,
      purpose: node.dataset.purpose,
      operationId: node.dataset.operationId,
      sha256: node.dataset.sha256,
      byteSize: Number(node.dataset.byteSize),
      mimeType: node.dataset.mimeType,
      duration: Number(node.dataset.duration),
      frames: Number(node.dataset.decodedFrames),
      elapsedMs: Number(node.dataset.elapsedMs),
    };
  });
  expect(evidence.status).toBe('saved');
  expect(evidence.purpose).toBe('verification-only');
  expect(evidence.byteSize).toBeGreaterThan(0);
  expect(evidence.mimeType).toMatch(/^audio\//);
  expect(evidence.duration).toBeGreaterThan(0);
  expect(evidence.frames).toBeGreaterThan(0);
  expect(evidence.elapsedMs).toBeGreaterThanOrEqual(1_000);
  expect(evidence.elapsedMs).toBeLessThan(5_000);
  expect(evidence.sha256).toMatch(/^[a-f0-9]{64}$/);
  await expect(page.getByRole('button', { name: /^Stop$/ })).toHaveCount(0);
  await expect(page.locator('audio')).toBeVisible();

  const trace = await page.evaluate(() => window.__nativeTrace);
  expect(trace.getUserMedia).toBe(1);
  expect(trace.recorderStarts).toBe(1);
  expect(trace.recorderStops).toBe(1);
  expect(trace.trackStops).toBeGreaterThanOrEqual(1);

  const evidenceDir = evidenceDirectory;
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({ path: join(evidenceDir, 'native-media-proof.png'), fullPage: true });

  await page.goto(`/__dev/native-media?fakeInput=1&operationId=${encodeURIComponent(evidence.operationId ?? '')}`);
  const recovered = page.getByTestId('capture-details');
  await expect(recovered).toBeVisible();
  await expect(recovered).toHaveAttribute('data-sha256', evidence.sha256 ?? '');
  await expect(recovered).toHaveAttribute('data-byte-size', String(evidence.byteSize));
  await expect(page.evaluate(() => window.__nativeTrace)).resolves.toEqual({ getUserMedia: 0, recorderStarts: 0, recorderStops: 0, trackStops: 0 });
  await expect(page.locator('audio')).toHaveAttribute('src', /^blob:/);
  await writeFile(join(evidenceDir, 'native-media-proof.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    browser: page.context().browser()?.version() ?? 'unknown',
    mode: 'Chromium browser-supplied fake audio input',
    physicalMicrophone: false,
    verificationOnly: true,
    captured: evidence,
    captureTrace: trace,
    recoveredOperationId: await recovered.getAttribute('data-operation-id'),
    recoveredSha256: await recovered.getAttribute('data-sha256'),
    recoveryTrace: await page.evaluate(() => window.__nativeTrace),
  }, null, 2), 'utf8');
});

test('persists a usable interrupted partial from actual browser fake input', async ({ page }) => {
  await page.addInitScript(() => {
    const devices = navigator.mediaDevices;
    const originalGetUserMedia = devices.getUserMedia.bind(devices);
    let microphoneTrack: MediaStreamTrack | null = null;
    Object.defineProperty(devices, 'getUserMedia', {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        const stream = await originalGetUserMedia(constraints);
        microphoneTrack = stream.getAudioTracks()[0] ?? null;
        return stream;
      },
    });
    const prototype = window.MediaRecorder.prototype;
    const start = prototype.start;
    prototype.start = function (...args) {
      const result = start.apply(this, args);
      window.setTimeout(() => microphoneTrack?.dispatchEvent(new Event('ended')), 700);
      return result;
    };
  });
  await page.goto('/__dev/native-media?fakeInput=1');
  await page.getByRole('button', { name: 'Capture one sample' }).click();
  const details = page.getByTestId('capture-details');
  await expect(details).toBeVisible({ timeout: 15_000 });
  const capture = await details.evaluate((element) => {
    const node = element as HTMLElement;
    return {
      endReason: node.dataset.endReason,
      byteSize: Number(node.dataset.byteSize),
      mimeType: node.dataset.mimeType,
      durationSeconds: Number(node.dataset.duration),
      decodedFrames: Number(node.dataset.decodedFrames),
      elapsedMs: Number(node.dataset.elapsedMs),
      sha256: node.dataset.sha256,
    };
  });
  expect(capture.endReason).toBe('interrupted');
  expect(capture.byteSize).toBeGreaterThan(0);
  expect(capture.durationSeconds).toBeGreaterThan(0);
  expect(capture.decodedFrames).toBeGreaterThan(0);
  expect(capture.elapsedMs).toBeGreaterThan(300);
  expect(capture.elapsedMs).toBeLessThan(1_600);
  expect(capture.sha256).toMatch(/^[a-f0-9]{64}$/);
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(join(evidenceDirectory, 'interrupted-partial-browser-evidence.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    browser: page.context().browser()?.version() ?? 'unknown',
    mode: 'Chromium browser-supplied fake audio input; test harness dispatches an ended event at about 700ms',
    physicalMicrophone: false,
    verificationOnly: true,
    capture,
  }, null, 2), 'utf8');
});
