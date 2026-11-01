import type { AudioProbe, BrowserMediaPort, NativeCapture, VideoProbe } from '../contracts';

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

function waveformFromBuffer(buffer: AudioBuffer, barCount = 64): readonly number[] {
  const peaks: number[] = [];
  const samplesPerBar = Math.max(1, Math.floor(buffer.length / barCount));
  for (let bar = 0; bar < barCount; bar += 1) {
    const start = bar * samplesPerBar;
    const end = Math.min(buffer.length, start + samplesPerBar);
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let sample = start; sample < end; sample += 1) peak = Math.max(peak, Math.abs(data[sample] ?? 0));
    }
    peaks.push(Number(peak.toFixed(3)));
  }
  return peaks;
}

function waveformRangeFromBuffer(buffer: AudioBuffer, startMs: number, endMs: number, barCount = 64): readonly number[] {
  const start = Math.max(0, Math.floor(startMs / 1000 * buffer.sampleRate));
  const end = Math.min(buffer.length, Math.ceil(endMs / 1000 * buffer.sampleRate));
  if (end <= start) return Array.from({ length: barCount }, () => 0);

  return Array.from({ length: barCount }, (_, bar) => {
    const firstSample = start + Math.floor((end - start) * bar / barCount);
    const lastSample = Math.min(end, Math.max(firstSample + 1, start + Math.floor((end - start) * (bar + 1) / barCount)));
    let peak = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let sample = firstSample; sample < lastSample; sample += 1) peak = Math.max(peak, Math.abs(data[sample] ?? 0));
    }
    return Number(peak.toFixed(3));
  });
}

function hexDigest(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function peakFromTimeData(data: Uint8Array): number {
  let peak = 0;
  for (const sample of data) peak = Math.max(peak, Math.abs(sample - 128) / 128);
  return Number(peak.toFixed(3));
}

function preferredMimeType(): string | undefined {
  return MIME_CANDIDATES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

async function inspectAudio(blob: Blob, mimeType: string): Promise<AudioProbe> {
  if (blob.size === 0) {
    return {
      mimeType,
      byteSize: 0,
      durationSeconds: null,
      decodedFrames: null,
      channelCount: null,
      sampleRate: null,
      decodeStatus: 'zero-data',
      waveformPeaks: [],
    };
  }

  let durationSeconds: number | null;
  let decodedFrames: number | null = null;
  let channelCount: number | null = null;
  let sampleRate: number | null = null;
  let waveformPeaks: readonly number[] = [];
  let decodeStatus: AudioProbe['decodeStatus'] = 'unavailable';
  const objectUrl = URL.createObjectURL(blob);
  const audio = new Audio();
  audio.preload = 'metadata';

  try {
    durationSeconds = await new Promise<number | null>((resolve) => {
      const timeout = window.setTimeout(() => finish(null), 2500);
      const finish = (value: number | null) => {
        window.clearTimeout(timeout);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
        resolve(value);
      };
      const onLoaded = () => finish(Number.isFinite(audio.duration) ? audio.duration : null);
      const onError = () => finish(null);
      audio.addEventListener('loadedmetadata', onLoaded, { once: true });
      audio.addEventListener('error', onError, { once: true });
      audio.src = objectUrl;
      audio.load();
    });

    if (window.AudioContext) {
      const context = new AudioContext();
      try {
        const decoded = await context.decodeAudioData(await blob.arrayBuffer());
        decodedFrames = decoded.length;
        channelCount = decoded.numberOfChannels;
        sampleRate = decoded.sampleRate;
        durationSeconds = decoded.duration;
        waveformPeaks = waveformFromBuffer(decoded);
        decodeStatus = 'decoded';
      } catch {
        decodeStatus = 'unavailable';
      } finally {
        await context.close().catch(() => undefined);
      }
    }
  } finally {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    URL.revokeObjectURL(objectUrl);
  }

  return { mimeType, byteSize: blob.size, durationSeconds, decodedFrames, channelCount, sampleRate, decodeStatus, waveformPeaks };
}

async function captureFixedWindow(input: {
  durationMs: number;
  purpose: NativeCapture['purpose'];
  signal?: AbortSignal;
  interruptSignal?: AbortSignal;
  onWindowStart?: (startCapture: () => void) => void | Promise<void>;
  getWindowProgressMs?: () => number | null;
  onCaptureStarted?: () => void;
  onProgress?: (progress: { elapsedMs: number; waveformPeaks: readonly number[] }) => void;
}): Promise<NativeCapture> {
  if (!Number.isFinite(input.durationMs) || input.durationMs <= 0) {
    throw new RangeError('The requested capture window must be a positive finite duration.');
  }
  if (input.signal?.aborted || input.interruptSignal?.aborted) throw new DOMException('Capture cancelled before it started.', 'AbortError');
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    throw new Error('This browser does not support microphone capture. No media was saved.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  if (input.signal?.aborted || input.interruptSignal?.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    throw new DOMException('Capture cancelled while microphone access was pending.', 'AbortError');
  }
  const mimeType = preferredMimeType();
  let recorder: MediaRecorder;
  try {
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop());
    throw error;
  }

  let startedAt = 0;
  let recordingStarted = false;
  let endReason: NativeCapture['endReason'] = 'fixed-window';
  let stopTimer = 0;
  let progressFrame = 0;
  let windowFrame = 0;
  let audioContext: AudioContext | undefined;
  let resolveCapture: ((value: NativeCapture) => void) | undefined;
  let rejectCapture: ((reason: unknown) => void) | undefined;
  const chunks: BlobPart[] = [];

  const capture = new Promise<NativeCapture>((resolve, reject) => {
    resolveCapture = resolve;
    rejectCapture = reject;
  });

  const stop = (reason: NativeCapture['endReason']) => {
    if (!recordingStarted || recorder.state === 'inactive') return;
    endReason = reason;
    try {
      recorder.stop();
    } catch (error) {
      rejectCapture?.(error);
    }
  };

  const failOrStop = (error: unknown) => {
    const failure = error instanceof Error ? error : new Error('Native media recording was interrupted.');
    if (recordingStarted) stop('interrupted');
    rejectCapture?.(failure);
  };
  const abort = () => failOrStop(new DOMException('Capture was cancelled.', 'AbortError'));
  const interrupt = () => {
    if (recordingStarted) stop('interrupted');
    else {
      stream.getTracks().forEach((track) => track.stop());
      rejectCapture?.(new DOMException('Capture was interrupted before the prepared window began.', 'AbortError'));
    }
  };
  const trackEnded = () => {
    if (recordingStarted) stop('interrupted');
    else failOrStop(new Error('The microphone stream ended before the recording window began.'));
  };

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.addEventListener('error', () => rejectCapture?.(new Error('Native media recording failed.')));
  recorder.addEventListener('stop', () => {
    window.clearTimeout(stopTimer);
    cancelAnimationFrame(progressFrame);
    cancelAnimationFrame(windowFrame);
    void audioContext?.close().catch(() => undefined);
    input.signal?.removeEventListener('abort', abort);
    input.interruptSignal?.removeEventListener('abort', interrupt);
    stream.getAudioTracks().forEach((track) => track.removeEventListener('ended', trackEnded));
    const stoppedAt = Date.now();
    const finalMimeType = recorder.mimeType || mimeType || 'application/octet-stream';
    const blob = new Blob(chunks, { type: finalMimeType });
    void inspectAudio(blob, finalMimeType).then((probe) => {
      resolveCapture?.({ purpose: input.purpose, blob, mimeType: finalMimeType, startedAt, stoppedAt, elapsedMs: Math.max(0, stoppedAt - startedAt), endReason, probe });
    }).catch((error: unknown) => rejectCapture?.(error));
  }, { once: true });

  stream.getAudioTracks().forEach((track) => track.addEventListener('ended', trackEnded, { once: true }));
  input.signal?.addEventListener('abort', abort, { once: true });
  input.interruptSignal?.addEventListener('abort', interrupt, { once: true });
  const startCapture = () => {
    if (recordingStarted) return;
    if (input.signal?.aborted) {
      failOrStop(new DOMException('Capture was cancelled before the recording window began.', 'AbortError'));
      return;
    }
    try {
      recorder.start();
      recordingStarted = true;
      startedAt = Date.now();
      input.onCaptureStarted?.();
      if (!input.getWindowProgressMs) {
        stopTimer = window.setTimeout(() => stop('fixed-window'), input.durationMs);
      }
      if (input.onProgress && window.AudioContext) {
        try {
          audioContext = new AudioContext();
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 1024;
          audioContext.createMediaStreamSource(stream).connect(analyser);
          const sampleData = new Uint8Array(analyser.fftSize);
          const waveformPeaks = Array.from({ length: 64 }, () => 0);
          const updateProgress = () => {
            if (!recordingStarted || recorder.state === 'inactive') return;
            const sourceElapsedMs = input.getWindowProgressMs?.();
            const elapsedMs = sourceElapsedMs !== null && sourceElapsedMs !== undefined && Number.isFinite(sourceElapsedMs)
              ? Math.max(0, Math.min(input.durationMs, sourceElapsedMs))
              : Math.max(0, Date.now() - startedAt);
            analyser.getByteTimeDomainData(sampleData);
            const bar = Math.min(waveformPeaks.length - 1, Math.floor(elapsedMs / input.durationMs * waveformPeaks.length));
            waveformPeaks[bar] = Math.max(waveformPeaks[bar] ?? 0, peakFromTimeData(sampleData));
            input.onProgress?.({ elapsedMs, waveformPeaks: [...waveformPeaks] });
            progressFrame = requestAnimationFrame(updateProgress);
          };
          void audioContext.resume().then(updateProgress).catch(() => undefined);
        } catch {
          void audioContext?.close().catch(() => undefined);
        }
      }
      if (input.getWindowProgressMs) {
        const updateWindowProgress = () => {
          if (!recordingStarted || recorder.state === 'inactive') return;
          try {
            const elapsedMs = input.getWindowProgressMs?.();
            if (elapsedMs !== null && elapsedMs !== undefined && Number.isFinite(elapsedMs) && elapsedMs >= input.durationMs) {
              stop('fixed-window');
              return;
            }
          } catch (error) {
            failOrStop(error);
            return;
          }
          windowFrame = requestAnimationFrame(updateWindowProgress);
        };
        windowFrame = requestAnimationFrame(updateWindowProgress);
      }
    } catch (error) {
      failOrStop(error);
    }
  };
  try {
    if (input.onWindowStart) {
      await input.onWindowStart(startCapture);
      if (!recordingStarted) throw new Error('The prepared source did not start the capture window.');
    } else {
      startCapture();
    }
  } catch (error) {
    if (recordingStarted) stop('interrupted');
    else rejectCapture?.(error);
    input.signal?.removeEventListener('abort', abort);
    input.interruptSignal?.removeEventListener('abort', interrupt);
    stream.getAudioTracks().forEach((track) => track.removeEventListener('ended', trackEnded));
  }

  try {
    return await capture;
  } finally {
    window.clearTimeout(stopTimer);
    cancelAnimationFrame(windowFrame);
    input.signal?.removeEventListener('abort', abort);
    stream.getAudioTracks().forEach((track) => track.removeEventListener('ended', trackEnded));
    stream.getTracks().forEach((track) => track.stop());
    cancelAnimationFrame(progressFrame);
    await audioContext?.close().catch(() => undefined);
  }
}

export function createNativeBrowserMedia(): BrowserMediaPort {
  const sourceAudioCache = new Map<string, Promise<AudioBuffer>>();
  const decodeSource = (url: string, expectedSha256: string): Promise<AudioBuffer> => {
    const key = `${url}\n${expectedSha256.toLowerCase()}`;
    const existing = sourceAudioCache.get(key);
    if (existing) return existing;

    const pending = (async () => {
      if (!window.AudioContext || !window.crypto?.subtle) throw new Error('This browser cannot decode the prepared source audio.');
      const response = await fetch(url);
      if (!response.ok) throw new Error(`The prepared source could not be read (${response.status}).`);
      const bytes = await response.arrayBuffer();
      const actualSha256 = hexDigest(await window.crypto.subtle.digest('SHA-256', bytes));
      if (actualSha256 !== expectedSha256.toLowerCase()) throw new Error('The prepared source changed after its manifest was created.');

      const context = new AudioContext();
      try {
        return await context.decodeAudioData(bytes);
      } finally {
        await context.close().catch(() => undefined);
      }
    })();
    sourceAudioCache.set(key, pending);
    void pending.catch(() => {
      if (sourceAudioCache.get(key) === pending) sourceAudioCache.delete(key);
    });
    return pending;
  };

  const decodeSourceWaveforms: BrowserMediaPort['decodeSourceWaveforms'] = async (input) => {
    if (input.signal?.aborted) throw new DOMException('Source waveform decode was cancelled.', 'AbortError');
    if (!/^[\da-f]{64}$/i.test(input.expectedSha256)) throw new TypeError('The prepared source SHA-256 is invalid.');
    const buffer = await decodeSource(input.url, input.expectedSha256);
    if (input.signal?.aborted) throw new DOMException('Source waveform decode was cancelled.', 'AbortError');
    return input.windows.map(({ startMs, endMs }) => {
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) {
        throw new RangeError('Each prepared source window must have positive finite bounds.');
      }
      return waveformRangeFromBuffer(buffer, startMs, endMs);
    });
  };

  const probeVideo = async (blob: Blob): Promise<VideoProbe> => {
    const url = URL.createObjectURL(blob);
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    let timeout = 0;
    try {
      return await new Promise<VideoProbe>((resolve, reject) => {
        const fail = () => reject(new Error('The browser could not decode a usable frame from the video.'));
        const loaded = () => {
          if (video.videoWidth <= 0 || video.videoHeight <= 0) { fail(); return; }
          resolve({
            mimeType: blob.type || 'application/octet-stream',
            byteSize: blob.size,
            durationSeconds: Number.isFinite(video.duration) ? video.duration : null,
            width: video.videoWidth,
            height: video.videoHeight,
            decodedFrame: true,
          });
        };
        timeout = window.setTimeout(fail, 10000);
        video.addEventListener('loadeddata', loaded, { once: true });
        video.addEventListener('error', fail, { once: true });
        video.src = url;
        video.load();
      });
    } finally {
      window.clearTimeout(timeout);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
    }
  };
  return {
    decodeSourceWaveforms,
    captureFixedWindow,
    createObjectUrl: (blob) => URL.createObjectURL(blob),
    revokeObjectUrl: (url) => URL.revokeObjectURL(url),
    probeVideo,
  };
}
