import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(testDirectory, '../..');
const repositoryDirectory = path.resolve(frontendDirectory, '..');
const mediaDirectory = path.join(frontendDirectory, 'public', 'media');
const evidenceDirectory = path.join(repositoryDirectory, '_docs', 'evidence', 'frontend-implementation-2026-10-23', 'media');
const manifest = JSON.parse(await readFile(path.join(mediaDirectory, 'fixture-manifest.json'), 'utf8'));
const engines = { Chromium: chromium, Firefox: firefox, WebKit: webkit };

const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://127.0.0.1').pathname.match(/^\/media\/([A-Za-z0-9._-]+)$/)?.[1];
  const asset = Object.values(manifest.assets).find((entry) => entry.fileName === name);
  if (!asset) {
    response.writeHead(404).end();
    return;
  }

  const bytes = await readFile(path.join(mediaDirectory, asset.fileName));
  response.setHeader('Content-Type', asset.contentType);
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Accept-Ranges', 'bytes');
  response.setHeader('Cache-Control', 'no-store');
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range) {
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
    if (start >= bytes.length || end < start) {
      response.writeHead(416, { 'Content-Range': `bytes */${bytes.length}` }).end();
      return;
    }
    response.writeHead(206, {
      'Content-Length': end - start + 1,
      'Content-Range': `bytes ${start}-${end}/${bytes.length}`,
    });
    response.end(bytes.subarray(start, end + 1));
    return;
  }

  response.writeHead(200, { 'Content-Length': bytes.length });
  response.end(bytes);
});

function git(command) {
  return execFileSync('git', command, { cwd: repositoryDirectory, encoding: 'utf8' }).trim();
}

server.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});
const baseUrl = `http://127.0.0.1:${server.address().port}`;

const report = {
  schemaVersion: 1,
  capturedAtUtc: new Date().toISOString(),
  revision: git(['rev-parse', 'HEAD']),
  worktreeStatusForOwnedPaths: git(['status', '--short', '--', 'frontend/public/media', 'frontend/src/media', 'frontend/tests/media', '_docs/evidence/frontend-implementation-2026-10-23/media']),
  environment: {
    osPlatform: process.platform,
    osRelease: os.release(),
    osVersion: os.version(),
    architecture: os.arch(),
    nodeVersion: process.version,
    playwrightPackageVersion: '1.64.1 (resolved frontend dev dependency; package lock not changed)',
    browserMode: 'Playwright headless, cached local builds',
    inputDevice: 'No physical media input device used; static fixture files served over loopback HTTP.',
  },
  fixtureProvenance: manifest.provenance,
  procedure: [
    'Serve each manifest fixture from a temporary in-process loopback HTTP server with byte-range support.',
    'For MP4 assets create an HTMLVideoElement; for WAV assets create an HTMLAudioElement.',
    'Mute the media element and set volume to zero before playback; Chromium is additionally launched with --mute-audio. Firefox and WebKit use the standard muted-media output path.',
    'Measure loadedmetadata latency, duration and dimensions, then start playback from an explicit page click and wait for the ended event at playbackRate 2.',
    'Where HTMLMediaElement.captureStream exists, record decoded audio-track count. Independently run OfflineAudioContext.decodeAudioData on local fixture bytes and report sample facts when the engine can decode the container; this does not route audio to speakers.',
    'Do not infer audible-vs-silence RMS from the intentionally muted media capture path. Offline sample RMS is descriptive only and is not a rejection threshold.',
    'Record per-engine result, SHA-256, and limitations in this evidence artifact. Missing data remains an explicit null with no playback attempt.',
  ],
  engines: [],
  evidenceLimits: [
    'The exact engine build is recorded per run; these Playwright builds are not a support claim for every Chrome, Firefox, Safari, OS, or device version.',
    'Playwright WebKit on this Windows host is not macOS Safari or iOS Safari.',
    'Playback does not establish microphone permission, recording behavior, source-analysis or dialogue-detection thresholds, fixed-window capture, real interruption recovery, product rendering, download correctness, or backend storage/lease behavior.',
    'OPEN-F06-T02/T03/T05 and OPEN-09-08 remain unproved wherever they require product or physical-device behavior; fixture playback only covers local media decoding.',
  ],
};

try {
  for (const [engineName, browserType] of Object.entries(engines)) {
    const launchOptions = engineName === 'Chromium'
      ? { headless: true, args: ['--mute-audio'] }
      : { headless: true };
    const browser = await browserType.launch(launchOptions);
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<!doctype html><button id="start">Start fixture playback</button>');
    const version = browser.version();
    const capabilities = await page.evaluate((mp4Type) => {
      const media = document.createElement('video');
      return {
        mp4: media.canPlayType(mp4Type),
        webm: media.canPlayType('video/webm; codecs="vp8, vorbis"'),
        wav: document.createElement('audio').canPlayType('audio/wav; codecs="1"'),
        mediaRecorder: typeof MediaRecorder !== 'undefined',
        mediaRecorderMp4: typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('video/mp4;codecs="avc1.42E01E,mp4a.40.2"'),
        captureStream: typeof media.captureStream === 'function',
      };
    }, manifest.assets.source.contentType);
    const fixtures = [];
    for (const [key, asset] of Object.entries(manifest.assets)) {
      await page.evaluate(() => {
        document.querySelector('#start').onclick = () => {
          window.fixturePromise = window.runFixture?.();
        };
      });
      await page.evaluate(({ url, kind, contentType, referenceUrl }) => {
        window.runFixture = async () => {
          if (kind === 'absent') return { state: 'absent' };
          const videoKind = kind === 'ISO Base Media MP4';
          const media = videoKind ? document.createElement('video') : document.createElement('audio');
          media.preload = 'auto';
          media.muted = true;
          media.volume = 0;
          media.playbackRate = 2;
          media.__loadStartedAt = performance.now();
          media.src = url;
          let stream = null;
          try {
            if (typeof media.captureStream === 'function') stream = media.captureStream();
          } catch {}
          const metadataPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve({ state: 'metadata-timeout' }), 15000);
            media.addEventListener('loadedmetadata', () => {
              clearTimeout(timeout);
              resolve({ state: 'loaded', latencyMs: performance.now() - media.__loadStartedAt });
            }, { once: true });
            media.addEventListener('error', () => {
              clearTimeout(timeout);
              resolve({ state: 'media-error', code: media.error?.code ?? null, message: media.error?.message ?? null });
            }, { once: true });
          });
          const playbackStartedAt = performance.now();
          const endedPromise = new Promise((resolve) => {
            const timeout = setTimeout(() => resolve({ state: 'playback-timeout' }), 45000);
            media.addEventListener('ended', () => {
              clearTimeout(timeout);
              resolve({ state: 'ended' });
            }, { once: true });
          });
          media.load();
          media.playbackRate = 2;
          const playPromise = media.play();
          let playError = null;
          playPromise.catch((error) => { playError = `${error.name}: ${error.message}`; });
          const metadata = await metadataPromise;
          if (metadata.state !== 'loaded') {
            stream?.getTracks().forEach((track) => track.stop());
            return { metadata, playable: false };
          }
          await playPromise.catch(() => {});
          if (playError) {
            stream?.getTracks().forEach((track) => track.stop());
            return { metadata, playable: false, reason: playError };
          }
          const tracks = stream?.getAudioTracks() ?? [];
          const decodedAudioTrackCount = stream ? tracks.length : null;
          const onFrame = () => {
            if (!media.ended) requestAnimationFrame(onFrame);
          };
          requestAnimationFrame(onFrame);
          const playback = await endedPromise;
          stream?.getTracks().forEach((track) => track.stop());
          const offlineAudioDecode = await (async () => {
            if (typeof OfflineAudioContext === 'undefined') {
              return { supported: false, reason: 'OfflineAudioContext unavailable.' };
            }
            try {
              const bytes = await fetch(url).then((response) => response.arrayBuffer());
              const decoder = new OfflineAudioContext(2, 1, 48000);
              const decoded = await decoder.decodeAudioData(bytes.slice(0));
              let sumSquares = 0;
              let peak = 0;
              let nonZeroSampleCount = 0;
              let sampleCount = 0;
              for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
                for (const sample of decoded.getChannelData(channel)) {
                  const magnitude = Math.abs(sample);
                  if (magnitude > peak) peak = magnitude;
                  if (sample !== 0) nonZeroSampleCount += 1;
                  sumSquares += sample * sample;
                  sampleCount += 1;
                }
              }
              let audioAlignment = null;
              if (referenceUrl) {
                const referenceBytes = await fetch(referenceUrl).then((response) => response.arrayBuffer());
                const referenceContext = new OfflineAudioContext(2, 1, 48000);
                const reference = await referenceContext.decodeAudioData(referenceBytes.slice(0));
                if (reference.sampleRate === decoded.sampleRate && reference.numberOfChannels === decoded.numberOfChannels) {
                  const maxLag = Math.min(9600, Math.floor(Math.min(reference.length, decoded.length) / 3));
                  const correlate = (lag, stride) => {
                    const start = Math.max(0, -lag);
                    const end = Math.min(reference.length, decoded.length - lag);
                    let product = 0;
                    let referencePower = 0;
                    let decodedPower = 0;
                    let samples = 0;
                    for (let frame = start; frame < end; frame += stride) {
                      const outputFrame = frame + lag;
                      for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
                        const expected = reference.getChannelData(channel)[frame];
                        const actual = decoded.getChannelData(channel)[outputFrame];
                        product += expected * actual;
                        referencePower += expected * expected;
                        decodedPower += actual * actual;
                        samples += 1;
                      }
                    }
                    return samples && referencePower && decodedPower
                      ? product / Math.sqrt(referencePower * decodedPower)
                      : 0;
                  };
                  let coarseLag = 0;
                  let bestCorrelation = -1;
                  for (let lag = -maxLag; lag <= maxLag; lag += 32) {
                    const score = correlate(lag, 32);
                    if (score > bestCorrelation) {
                      coarseLag = lag;
                      bestCorrelation = score;
                    }
                  }
                  let bestLag = coarseLag;
                  const refineStart = Math.max(-maxLag, coarseLag - 32);
                  const refineEnd = Math.min(maxLag, coarseLag + 32);
                  for (let lag = refineStart; lag <= refineEnd; lag += 1) {
                    const score = correlate(lag, 8);
                    if (score > bestCorrelation) {
                      bestLag = lag;
                      bestCorrelation = score;
                    }
                  }
                  audioAlignment = {
                    referenceDurationSeconds: reference.duration,
                    comparedFrames: Math.min(reference.length, decoded.length - Math.max(0, bestLag)),
                    zeroLagCorrelation: correlate(0, 8),
                    bestCorrelation,
                    bestLagFrames: bestLag,
                    bestLagMs: bestLag * 1000 / decoded.sampleRate,
                  };
                } else {
                  audioAlignment = { supported: false, reason: 'Reference and encoded audio decoders returned incompatible sample formats.' };
                }
              }
              return {
                supported: true,
                decodedChannels: decoded.numberOfChannels,
                sampleRateHz: decoded.sampleRate,
                frameCount: decoded.length,
                durationSeconds: decoded.duration,
                peak,
                rms: sampleCount ? Math.sqrt(sumSquares / sampleCount) : 0,
                nonZeroSampleCount,
                audioAlignment,
              };
            } catch (error) {
              return { supported: false, reason: `${error.name}: ${error.message}` };
            }
          })();
          return {
            metadata,
            durationSeconds: media.duration,
            finalCurrentTimeSeconds: media.currentTime,
            videoWidth: videoKind ? media.videoWidth : null,
            videoHeight: videoKind ? media.videoHeight : null,
            playbackElapsedMs: Math.round(performance.now() - playbackStartedAt),
            playbackRate: media.playbackRate,
            mediaMutedForSafety: media.muted && media.volume === 0,
            capability: {
              canPlayType: media.canPlayType(contentType),
              captureStreamSupported: typeof media.captureStream === 'function',
            },
            decodedAudioTrackCount,
            offlineAudioDecode,
            playback,
            playable: playback.state === 'ended',
          };
        };
        }, {
          url: asset.url ? `${baseUrl}${asset.url}` : null,
          kind: asset.container ?? 'absent',
          contentType: asset.contentType ?? '',
          referenceUrl: asset.referenceAudio ? `${baseUrl}${asset.referenceAudio}` : null,
        });
      await page.locator('#start').click();
      const observation = await page.evaluate(() => window.fixturePromise);
      fixtures.push({
        fixture: key,
        scenario: asset.scenario,
        fileName: asset.fileName ?? null,
        sha256: asset.sha256 ?? null,
        expectedMediaKind: asset.container ?? null,
        recorderInputAudioTrackCount: asset.recorderInputAudioTrackCount ?? null,
        observation,
      });
      await page.setContent('<!doctype html><button id="start">Start fixture playback</button>');
    }
    report.engines.push({
      name: engineName,
      version,
      userAgent: await page.evaluate(() => navigator.userAgent),
      staticCapabilityDeclarations: capabilities,
      fixtures,
    });
    await context.close();
    await browser.close();
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

await mkdir(evidenceDirectory, { recursive: true });
const outputPath = path.join(evidenceDirectory, 'browser-media-matrix.json');
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
for (const [fixtureKey, asset] of Object.entries(manifest.assets)) {
  if (asset.status === 'absent') continue;
  asset.browserMeasured = Object.fromEntries(report.engines.map((engine) => {
    const row = engine.fixtures.find((fixture) => fixture.fixture === fixtureKey);
    const observation = row?.observation ?? {};
    return [engine.name, {
      browserVersion: engine.version,
      metadataState: observation.metadata?.state ?? observation.state ?? 'not-observed',
      metadataLatencyMs: observation.metadata?.latencyMs ?? null,
      durationSeconds: observation.durationSeconds ?? null,
      videoWidth: observation.videoWidth ?? null,
      videoHeight: observation.videoHeight ?? null,
      playbackState: observation.playback?.state ?? observation.state ?? 'not-observed',
      playable: observation.playable ?? observation.state === 'ended',
      playbackElapsedMs: observation.playbackElapsedMs ?? null,
      playbackRate: observation.playbackRate ?? null,
      mediaMutedForSafety: observation.mediaMutedForSafety ?? false,
      decodedAudioTrackCount: observation.decodedAudioTrackCount ?? null,
      offlineAudioDecode: observation.offlineAudioDecode ?? null,
      capability: observation.capability ?? null,
    }];
  }));
}
manifest.browserEvidence = {
  path: '_docs/evidence/frontend-implementation-2026-10-23/media/browser-media-matrix.json',
  capturedAtUtc: report.capturedAtUtc,
  revision: report.revision,
  engines: report.engines.map(({ name, version }) => ({ name, version })),
  limitations: 'Browser metadata/playback/captureStream observations only; see the evidence matrix for the exact environment and unsupported behavior.',
};
const mediaApi = [
  '// Generated by tests/media/generate-fixtures.mjs and tests/media/probe-browsers.mjs. Do not edit hashes by hand.',
  `export const MEDIA_FIXTURES = ${JSON.stringify(manifest.fixtureUrls, null, 2)} as const;`,
  `export const MEDIA_FIXTURE_MANIFEST = ${JSON.stringify(manifest, null, 2)} as const;`,
  'export type MediaFixtureKey = keyof typeof MEDIA_FIXTURES;',
  'export type MediaFixtureUrl = Exclude<(typeof MEDIA_FIXTURES)[MediaFixtureKey], null>;',
  '',
].join('\n');
await writeFile(path.join(mediaDirectory, 'fixture-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(frontendDirectory, 'src', 'media', 'fixtures.ts'), mediaApi);
console.log(JSON.stringify({ evidencePath: outputPath, engines: report.engines.map(({ name, version, fixtures }) => ({ name, version, fixtures: fixtures.length })), revision: report.revision }, null, 2));
