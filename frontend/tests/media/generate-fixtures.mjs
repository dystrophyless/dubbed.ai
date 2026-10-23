import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(testDirectory, '../..');
const mediaDirectory = path.join(frontendDirectory, 'public', 'media');
const sourceMediaDirectory = path.join(frontendDirectory, 'src', 'media');
const speechScript = path.join(testDirectory, 'generate-speech.ps1');
const outputNames = [
  'source-dialogue-master.wav',
  'recording-take-a.wav',
  'recording-take-b.wav',
  'result-generation-001-master.wav',
  'result-generation-002-master.wav',
  'source-dialogue.mp4',
  'result-generation-001.mp4',
  'result-generation-002.mp4',
  'valid-silence.wav',
  'valid-silence.mp4',
  'usable-partial.mp4',
  'no-audio-track.mp4',
  'short-source.mp4',
  'fixture-manifest.json',
];
const mp4MimeType = 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"';
const refresh = process.argv.includes('--refresh');

function parseWave(wave) {
  if (wave.toString('ascii', 0, 4) !== 'RIFF' || wave.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('SpeechSynthesizer returned a file that is not a RIFF/WAVE asset.');
  }

  let format;
  let data;
  for (let offset = 12; offset + 8 <= wave.length;) {
    const name = wave.toString('ascii', offset, offset + 4);
    const size = wave.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > wave.length) throw new Error(`Truncated WAVE chunk: ${name}`);
    if (name === 'fmt ') {
      format = {
        codec: wave.readUInt16LE(start),
        channels: wave.readUInt16LE(start + 2),
        sampleRate: wave.readUInt32LE(start + 4),
        blockAlign: wave.readUInt16LE(start + 12),
        bitsPerSample: wave.readUInt16LE(start + 14),
      };
    } else if (name === 'data') {
      data = wave.subarray(start, end);
    }
    offset = end + (size % 2);
  }

  if (!format || !data || format.codec !== 1 || format.bitsPerSample !== 16) {
    throw new Error('The local speech voice must produce inspectable 16-bit PCM WAVE audio.');
  }
  return { ...format, data };
}

function writeWave(data, sampleRate, channels = 1) {
  const blockAlign = channels * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * blockAlign, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

function durationMs(audio) {
  return (audio.data.length / audio.blockAlign) * 1000 / audio.sampleRate;
}

function mixSource(turns, sampleRate, totalDurationMs) {
  const channels = 2;
  const frameCount = Math.round(sampleRate * totalDurationMs / 1000);
  const mixed = new Float64Array(frameCount * channels);
  for (const { audio, startMs, left, right } of turns) {
    if (audio.sampleRate !== sampleRate || audio.bitsPerSample !== 16) {
      throw new Error('All local speech voices must use the same 16-bit PCM sample rate.');
    }
    const startFrame = Math.round(sampleRate * startMs / 1000);
    const frames = audio.data.length / audio.blockAlign;
    for (let frame = 0; frame < frames && startFrame + frame < frameCount; frame += 1) {
      const value = audio.data.readInt16LE(frame * audio.blockAlign) / 32768;
      const target = (startFrame + frame) * channels;
      mixed[target] += value * 0.52 * left;
      mixed[target + 1] += value * 0.52 * right;
    }
  }

  const output = Buffer.alloc(frameCount * channels * 2);
  for (let frame = 0; frame < frameCount; frame += 1) {
    const background = Math.sin(2 * Math.PI * 110 * frame / sampleRate) * 0.025;
    for (let channel = 0; channel < channels; channel += 1) {
      const value = Math.max(-1, Math.min(1, mixed[frame * channels + channel] + background));
      output.writeInt16LE(Math.round(value * 32767), (frame * channels + channel) * 2);
    }
  }
  return writeWave(output, sampleRate, channels);
}

function monoWave(audio) {
  return writeWave(audio.data, audio.sampleRate, audio.channels);
}

function addSilentTail(wave, tailDurationMs) {
  const audio = parseWave(wave);
  const tailFrames = Math.round(audio.sampleRate * tailDurationMs / 1000);
  const tail = Buffer.alloc(tailFrames * audio.blockAlign);
  return writeWave(Buffer.concat([audio.data, tail]), audio.sampleRate, audio.channels);
}

function clipWave(audio, endMs) {
  const frameCount = Math.min(audio.data.length / audio.blockAlign, Math.round(audio.sampleRate * endMs / 1000));
  return writeWave(audio.data.subarray(0, frameCount * audio.blockAlign), audio.sampleRate, audio.channels);
}

async function recordMp4(browser, options) {
  const page = await browser.newPage({ viewport: { width: options.width, height: options.height } });
  await page.setContent('<!doctype html><button id="record">Generate permitted local media fixture</button><canvas id="scene"></canvas>');
  await page.evaluate((config) => {
    const button = document.querySelector('#record');
    const canvas = document.querySelector('#scene');
    canvas.width = config.width;
    canvas.height = config.height;
    const context = canvas.getContext('2d');
    window.fixtureCapture = null;

    button.addEventListener('click', async () => {
      const audioContext = config.audioBase64 ? new AudioContext() : null;
      const resumePromise = audioContext?.resume();
      const videoStream = canvas.captureStream(30);
      const tracks = [...videoStream.getTracks()];
      let source;
      let audioContextTimeAtStart = null;
      let audioContextTimeAtStop = null;
      let audioContextWarmupMs = 0;
      if (audioContext) {
        await resumePromise;
        const bytes = Uint8Array.from(atob(config.audioBase64), (character) => character.charCodeAt(0));
        const buffer = await audioContext.decodeAudioData(bytes.buffer);
        const destination = audioContext.createMediaStreamDestination();
        const silentOutput = audioContext.createGain();
        silentOutput.gain.value = 0;
        silentOutput.connect(audioContext.destination);
        const warmupOscillator = audioContext.createOscillator();
        const warmupGain = audioContext.createGain();
        warmupGain.gain.value = 0;
        warmupOscillator.connect(warmupGain).connect(audioContext.destination);
        const warmupStartedAt = performance.now();
        const warmupContextStart = audioContext.currentTime;
        let previousContextTime = warmupContextStart;
        let stableAdvances = 0;
        warmupOscillator.start();
        while (performance.now() - warmupStartedAt < 3000) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const currentTime = audioContext.currentTime;
          if (currentTime - previousContextTime >= 0.02) stableAdvances += 1;
          else stableAdvances = 0;
          previousContextTime = currentTime;
          if (currentTime - warmupContextStart >= 0.25 && stableAdvances >= 2) break;
        }
        warmupOscillator.stop();
        audioContextWarmupMs = performance.now() - warmupStartedAt;
        if (audioContext.currentTime - warmupContextStart < 0.2 || stableAdvances < 2) {
          throw new Error('The local Web Audio clock did not advance steadily during its silent warm-up.');
        }
        source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(destination);
        source.connect(silentOutput);
        tracks.push(...destination.stream.getAudioTracks());
      }

      if (!MediaRecorder.isTypeSupported(config.mimeType)) throw new Error(`MP4 recording is unavailable: ${config.mimeType}`);
      const stream = new MediaStream(tracks);
      const recorder = new MediaRecorder(stream, { mimeType: config.mimeType, videoBitsPerSecond: 300000, audioBitsPerSecond: 64000 });
      const chunks = [];
      let recorderStoppedAt = null;
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      const stopped = new Promise((resolve, reject) => {
        recorder.addEventListener('stop', () => {
          recorderStoppedAt = performance.now();
          if (audioContext) audioContextTimeAtStop = audioContext.currentTime;
          resolve();
        }, { once: true });
        recorder.addEventListener('error', (event) => reject(event.error), { once: true });
      });
      recorder.start();
      if (source) {
        source.start(audioContext.currentTime);
        audioContextTimeAtStart = audioContext.currentTime;
      }
      const startedAt = performance.now();

      function draw(now) {
        const elapsedMs = now - startedAt;
        context.fillStyle = config.color;
        context.fillRect(0, 0, config.width, config.height);
        context.fillStyle = config.accent;
        const width = Math.max(10, Math.round(config.width / 12));
        const movingX = Math.floor((elapsedMs / 17) % (config.width + width)) - width;
        context.fillRect(movingX, 0, width, config.height);
        context.fillStyle = '#ffffff';
        context.font = `bold ${Math.max(18, Math.round(config.width / 18))}px sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(config.label, config.width / 2, config.height / 2);

        if (elapsedMs >= config.durationMs) {
          recorder.stop();
          return;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
      await stopped;
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
      }
      window.fixtureCapture = {
        base64: btoa(binary),
        mimeType: recorder.mimeType,
        inputAudioTrackCount: stream.getAudioTracks().length,
        capturedDurationMs: recorderStoppedAt - startedAt,
        audioContextWarmupMs,
        audioContextTimeAdvanceMs: audioContextTimeAtStart === null || audioContextTimeAtStop === null
          ? null
          : (audioContextTimeAtStop - audioContextTimeAtStart) * 1000,
      };
      stream.getTracks().forEach((track) => track.stop());
      await audioContext?.close();
    }, { once: true });
  }, {
    ...options,
    audioBase64: options.audio ? options.audio.toString('base64') : null,
    mimeType: mp4MimeType,
  });
  await page.locator('#record').click();
  await page.waitForFunction(() => window.fixtureCapture !== null, null, { timeout: options.durationMs + 15000 });
  const captured = await page.evaluate(() => window.fixtureCapture);
  await page.close();
  return { ...captured, bytes: Buffer.from(captured.base64, 'base64') };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function waveMetadata(name, bytes) {
  const audio = parseWave(bytes);
  const frames = audio.data.length / audio.blockAlign;
  return {
    fileName: name,
    url: `/media/${name}`,
    contentType: 'audio/wav',
    container: 'RIFF/WAVE',
    codec: 'PCM signed 16-bit little-endian',
    bytes: bytes.length,
    sha256: sha256(bytes),
    durationMs: frames * 1000 / audio.sampleRate,
    sampleRateHz: audio.sampleRate,
    channels: audio.channels,
    bitsPerSample: audio.bitsPerSample,
    frames,
  };
}

function mp4Metadata(capture) {
  return {
    fileName: capture.file,
    url: `/media/${capture.file}`,
    contentType: capture.mimeType,
    container: 'ISO Base Media MP4',
    bytes: capture.bytes,
    sha256: capture.sha256,
    canvasWidth: Number(capture.dimensions.split('x')[0]),
    canvasHeight: Number(capture.dimensions.split('x')[1]),
    requestedCaptureWindowMs: capture.requestedDurationMs,
    observedRecorderWindowMs: capture.capturedDurationMs,
    audioContextWarmupMs: capture.audioContextWarmupMs,
    audioContextTimeAdvanceMs: capture.audioContextTimeAdvanceMs,
    recorderInputAudioTrackCount: capture.inputAudioTrackCount,
    generatedTitleCard: capture.titleCard,
  };
}

async function main() {
  const unexpectedFiles = await Promise.all(outputNames.map(async (name) => {
    try {
      await readFile(path.join(mediaDirectory, name));
      return name;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }));
  const existing = unexpectedFiles.filter(Boolean);
  if (existing.length && !refresh) throw new Error(`Refusing to overwrite existing media: ${existing.join(', ')}`);
  if (!refresh) {
    try {
      await readFile(path.join(sourceMediaDirectory, 'fixtures.ts'));
      throw new Error('Refusing to overwrite existing frontend/src/media/fixtures.ts without --refresh.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const scratchParent = os.tmpdir();
  const scratch = await mkdtemp(path.join(scratchParent, 'dubbed-media-fixtures-'));
  const expectedScratchPrefix = path.join(scratchParent, 'dubbed-media-fixtures-');
  if (path.dirname(scratch) !== scratchParent || !path.basename(scratch).startsWith(path.basename(expectedScratchPrefix))) {
    throw new Error('Generated scratch path escaped the operating-system temp directory.');
  }

  try {
    const provenance = JSON.parse(execFileSync('powershell.exe', [
      '-NoProfile', '-File', speechScript, '-OutputDirectory', scratch,
    ], { encoding: 'utf8' }).trim());
    const speech = {};
    for (const name of ['turn-a', 'turn-b', 'turn-c', 'take-a', 'take-b']) {
      speech[name] = parseWave(await readFile(path.join(scratch, `${name}.wav`)));
    }
    const sourceContentDurationMs = Math.ceil(Math.max(
      8500,
      5000 + durationMs(speech['turn-c']) + 750,
    ));
    const aacTailDurationMs = 150;
    const totalDurationMs = sourceContentDurationMs + aacTailDurationMs;
    const sourceWave = addSilentTail(mixSource([
      { audio: speech['turn-a'], startMs: 1000, left: 0.88, right: 0.12 },
      { audio: speech['turn-b'], startMs: 1500, left: 0.12, right: 0.88 },
      { audio: speech['turn-c'], startMs: 5000, left: 0.88, right: 0.12 },
    ], speech['turn-a'].sampleRate, sourceContentDurationMs), aacTailDurationMs);
    const sourceAudio = parseWave(sourceWave);
    const silenceFrames = Math.round(sourceAudio.sampleRate * 2000 / 1000);
    const silenceWave = writeWave(Buffer.alloc(silenceFrames * sourceAudio.channels * 2), sourceAudio.sampleRate, sourceAudio.channels);
    const partialWave = clipWave(sourceAudio, 2800);
    const shortWave = clipWave(sourceAudio, 650);
    const generationOneWave = addSilentTail(mixSource([
      { audio: speech['take-a'], startMs: 1000, left: 0.88, right: 0.12 },
    ], sourceAudio.sampleRate, sourceContentDurationMs), aacTailDurationMs);
    const generationTwoWave = addSilentTail(mixSource([
      { audio: speech['take-b'], startMs: 1000, left: 0.88, right: 0.12 },
    ], sourceAudio.sampleRate, sourceContentDurationMs), aacTailDurationMs);

    await mkdir(mediaDirectory, { recursive: true });
    const audioAssets = [
      ['source-dialogue-master.wav', sourceWave],
      ['recording-take-a.wav', monoWave(speech['take-a'])],
      ['recording-take-b.wav', monoWave(speech['take-b'])],
      ['result-generation-001-master.wav', generationOneWave],
      ['result-generation-002-master.wav', generationTwoWave],
      ['valid-silence.wav', silenceWave],
    ];
    for (const [name, bytes] of audioAssets) await writeFile(path.join(mediaDirectory, name), bytes, { flag: refresh ? 'w' : 'wx' });

    const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
    const captures = [];
    try {
      const definitions = [
        { name: 'source-dialogue.mp4', audio: sourceWave, durationMs: totalDurationMs, width: 640, height: 360, color: '#124b77', accent: '#38bdf8', label: 'SYNTHETIC SOURCE' },
        { name: 'result-generation-001.mp4', audio: generationOneWave, durationMs: totalDurationMs, width: 640, height: 360, color: '#143b55', accent: '#4ade80', label: 'GENERATION 001' },
        { name: 'result-generation-002.mp4', audio: generationTwoWave, durationMs: totalDurationMs, width: 640, height: 360, color: '#6b3519', accent: '#facc15', label: 'GENERATION 002' },
        { name: 'valid-silence.mp4', audio: silenceWave, durationMs: 2000, width: 320, height: 180, color: '#24324a', accent: '#94a3b8', label: 'RECORDED SILENCE' },
        { name: 'usable-partial.mp4', audio: partialWave, durationMs: 2800, width: 320, height: 180, color: '#235a49', accent: '#86efac', label: 'SHORT PARTIAL TAKE' },
        { name: 'no-audio-track.mp4', audio: null, durationMs: 1200, width: 320, height: 180, color: '#4b244a', accent: '#f0abfc', label: 'VIDEO ONLY' },
        { name: 'short-source.mp4', audio: shortWave, durationMs: 650, width: 320, height: 180, color: '#3f3a20', accent: '#fde047', label: 'SHORT SOURCE' },
      ];

      for (const definition of definitions) {
        const captured = await recordMp4(browser, definition);
        if (!captured.bytes.subarray(4, 8).equals(Buffer.from('ftyp'))) {
          throw new Error(`${definition.name} did not produce an ISO Base Media MP4 file.`);
        }
        if (definition.audio && captured.inputAudioTrackCount !== 1) {
          throw new Error(`${definition.name} did not retain its generated audio track.`);
        }
        if (!definition.audio && captured.inputAudioTrackCount !== 0) {
          throw new Error(`${definition.name} unexpectedly has an audio track.`);
        }
        await writeFile(path.join(mediaDirectory, definition.name), captured.bytes, { flag: refresh ? 'w' : 'wx' });
        captures.push({
          file: definition.name,
          mimeType: captured.mimeType,
          inputAudioTrackCount: captured.inputAudioTrackCount,
          requestedDurationMs: definition.durationMs,
          capturedDurationMs: Math.round(captured.capturedDurationMs),
          audioContextWarmupMs: Math.round(captured.audioContextWarmupMs),
          audioContextTimeAdvanceMs: captured.audioContextTimeAdvanceMs === null ? null : Math.round(captured.audioContextTimeAdvanceMs),
          bytes: captured.bytes.length,
          sha256: sha256(captured.bytes),
          dimensions: `${definition.width}x${definition.height}`,
          titleCard: definition.label,
        });
      }

      const sourceRate = sourceAudio.sampleRate;
      const sourceFrames = sourceAudio.data.length / sourceAudio.blockAlign;
      const dialogueSections = [
        { id: 'turn-a', quote: provenance.text.turnA, voice: provenance.voices.zira.name, startMs: 1000, audio: speech['turn-a'] },
        { id: 'turn-b', quote: provenance.text.turnB, voice: provenance.voices.david.name, startMs: 1500, audio: speech['turn-b'] },
        { id: 'turn-c', quote: provenance.text.turnC, voice: provenance.voices.zira.name, startMs: 5000, audio: speech['turn-c'] },
      ].map(({ audio, ...section }) => {
        const startFrame = Math.round(sourceRate * section.startMs / 1000);
        const frameCount = audio.data.length / audio.blockAlign;
        const endFrameExclusive = startFrame + frameCount;
        return {
          ...section,
          startFrame,
          endFrameExclusive,
          startMs: startFrame * 1000 / sourceRate,
          endMs: endFrameExclusive * 1000 / sourceRate,
        };
      });
      const overlapStartFrame = Math.max(dialogueSections[0].startFrame, dialogueSections[1].startFrame);
      const overlapEndFrame = Math.min(dialogueSections[0].endFrameExclusive, dialogueSections[1].endFrameExclusive);
      const mp4ByFile = Object.fromEntries(captures.map((capture) => [capture.file, mp4Metadata(capture)]));
      const wavByFile = Object.fromEntries(audioAssets.map(([name, bytes]) => [name, waveMetadata(name, bytes)]));
      const mediaManifest = {
        schemaVersion: 1,
        provenance: {
          speechGenerator: provenance.generator,
          voices: provenance.voices,
          videoGenerator: 'Local browser Canvas + MediaRecorder via Playwright Chromium; no network or external media source.',
          scope: 'Synthetic fixture media only. These files are not recordings from an actual user, not arbitrary-upload processing, and not product-rendered outputs.',
          voicePackNote: 'The speech text was generated locally from installed Windows voices. No real speaker was recorded; no ownership claim is made over Windows or voice-pack software.',
        },
        fixtureUrls: {
          source: '/media/source-dialogue.mp4',
          sourceAudio: '/media/source-dialogue-master.wav',
          recordingTakeA: '/media/recording-take-a.wav',
          recordingTakeB: '/media/recording-take-b.wav',
          resultGeneration1Audio: '/media/result-generation-001-master.wav',
          resultGeneration2Audio: '/media/result-generation-002-master.wav',
          resultGeneration1: '/media/result-generation-001.mp4',
          resultGeneration2: '/media/result-generation-002.mp4',
          validSilencePcm: '/media/valid-silence.wav',
          validSilence: '/media/valid-silence.mp4',
          usablePartial: '/media/usable-partial.mp4',
          noAudioTrack: '/media/no-audio-track.mp4',
          shortSource: '/media/short-source.mp4',
          noData: null,
        },
        assets: {
          source: {
            ...mp4ByFile['source-dialogue.mp4'],
            scenario: 'synthetic-source-with-dialogue-and-background',
            referenceAudio: '/media/source-dialogue-master.wav',
          },
          sourceAudio: { ...wavByFile['source-dialogue-master.wav'], scenario: 'synthetic-source-audio-master' },
          recordingTakeA: {
            ...wavByFile['recording-take-a.wav'],
            scenario: 'synthetic-recorded-take-fixture',
            generationId: 'take-a',
            voice: provenance.voices.zira.name,
            expectedQuote: provenance.text.takes,
          },
          recordingTakeB: {
            ...wavByFile['recording-take-b.wav'],
            scenario: 'synthetic-recorded-take-fixture',
            generationId: 'take-b',
            voice: provenance.voices.david.name,
            expectedQuote: provenance.text.takes,
          },
          resultGeneration1Audio: {
            ...wavByFile['result-generation-001-master.wav'],
            scenario: 'synthetic-generation-audio-master',
            generationId: 'generation-001',
            voice: provenance.voices.zira.name,
            expectedQuote: provenance.text.takes,
            sourceWindowMs: totalDurationMs,
            selectedSectionId: 'turn-a',
            selectedSectionPlacementStartMs: 1000,
            productRendered: false,
          },
          resultGeneration2Audio: {
            ...wavByFile['result-generation-002-master.wav'],
            scenario: 'synthetic-generation-audio-master',
            generationId: 'generation-002',
            voice: provenance.voices.david.name,
            expectedQuote: provenance.text.takes,
            sourceWindowMs: totalDurationMs,
            selectedSectionId: 'turn-a',
            selectedSectionPlacementStartMs: 1000,
            productRendered: false,
          },
          resultGeneration1: {
            ...mp4ByFile['result-generation-001.mp4'],
            scenario: 'synthetic-result-generation',
            generationId: 'generation-001',
            voice: provenance.voices.zira.name,
            expectedQuote: provenance.text.takes,
            sourceAsset: '/media/source-dialogue.mp4',
            sourceWindowMs: totalDurationMs,
            selectedSectionId: 'turn-a',
            selectedSectionPlacementStartMs: 1000,
            sharesSynthetic110HzBackground: true,
            productRendered: false,
            referenceAudio: '/media/result-generation-001-master.wav',
          },
          resultGeneration2: {
            ...mp4ByFile['result-generation-002.mp4'],
            scenario: 'synthetic-result-generation',
            generationId: 'generation-002',
            voice: provenance.voices.david.name,
            expectedQuote: provenance.text.takes,
            sourceAsset: '/media/source-dialogue.mp4',
            sourceWindowMs: totalDurationMs,
            selectedSectionId: 'turn-a',
            selectedSectionPlacementStartMs: 1000,
            sharesSynthetic110HzBackground: true,
            productRendered: false,
            referenceAudio: '/media/result-generation-002-master.wav',
          },
          validSilencePcm: {
            ...wavByFile['valid-silence.wav'],
            scenario: 'valid-silence-zeroed-pcm-source',
            sourcePcmIsZeroed: true,
          },
          validSilence: { ...mp4ByFile['valid-silence.mp4'], scenario: 'valid-silence-with-audio-track', sourcePcmIsZeroed: true },
          usablePartial: {
            ...mp4ByFile['usable-partial.mp4'],
            scenario: 'simulated-usable-partial',
            simulated: true,
            sourceClip: '/media/source-dialogue-master.wav',
            clippedAtMs: 2800,
            representsRealInterruptionRecovery: false,
          },
          noAudioTrack: { ...mp4ByFile['no-audio-track.mp4'], scenario: 'video-without-audio-track' },
          shortSource: {
            ...mp4ByFile['short-source.mp4'],
            scenario: 'audio-present-short-source-window',
            sourceClip: '/media/source-dialogue-master.wav',
            clippedAtMs: 650,
            containsDialogue: false,
            rejectionThresholdAssumed: false,
          },
          noData: {
            scenario: 'absent-data',
            status: 'absent',
            asset: null,
            note: 'No file and no URL by design; this distinguishes absent data from valid silence and short media.',
          },
        },
        dialogueTimeline: {
          sampleRateHz: sourceRate,
          sourceFrameCount: sourceFrames,
          sourceDurationMs: sourceFrames * 1000 / sourceRate,
          sourceContentDurationMs,
          aacTailDurationMs,
          note: 'Offsets are exact generated sample placements in the PCM masters, not word-level recognition or product timing. Each source and generation master has a short silent tail for AAC encoder padding; MP4 sample alignment and decode duration are measured separately by the browser probe.',
          sections: dialogueSections,
          overlap: overlapEndFrame > overlapStartFrame
            ? {
              startFrame: overlapStartFrame,
              endFrameExclusive: overlapEndFrame,
              startMs: overlapStartFrame * 1000 / sourceRate,
              endMs: overlapEndFrame * 1000 / sourceRate,
            }
            : null,
        },
      };
      const mediaApi = [
        '// Generated by tests/media/generate-fixtures.mjs. Do not edit hashes by hand.',
        `export const MEDIA_FIXTURES = ${JSON.stringify(mediaManifest.fixtureUrls, null, 2)} as const;`,
        `export const MEDIA_FIXTURE_MANIFEST = ${JSON.stringify(mediaManifest, null, 2)} as const;`,
        'export type MediaFixtureKey = keyof typeof MEDIA_FIXTURES;',
        'export type MediaFixtureUrl = Exclude<(typeof MEDIA_FIXTURES)[MediaFixtureKey], null>;',
        '',
      ].join('\n');
      await mkdir(sourceMediaDirectory, { recursive: true });
      await writeFile(path.join(mediaDirectory, 'fixture-manifest.json'), `${JSON.stringify(mediaManifest, null, 2)}\n`, { flag: refresh ? 'w' : 'wx' });
      await writeFile(path.join(sourceMediaDirectory, 'fixtures.ts'), mediaApi, { flag: refresh ? 'w' : 'wx' });
    } finally {
      await browser.close();
    }

    console.log(JSON.stringify({ provenance, captures }, null, 2));
  } finally {
    const safeScratch = path.dirname(scratch) === scratchParent
      && path.basename(scratch).startsWith('dubbed-media-fixtures-');
    if (safeScratch) await rm(scratch, { recursive: true, force: true });
  }
}

await main();
