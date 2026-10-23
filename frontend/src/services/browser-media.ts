import type {
  AudioLevelSample,
  AudioWaveformRequest,
  BrowserMediaService,
  DecodedAudioWaveform,
  FixedWindowCapture,
  MediaInput,
  MicrophoneTestCapture,
  MicrophoneTestOutcome,
  ServiceClock,
  ServiceError,
  ServiceResult,
} from './contracts'
import { ids } from './contracts'

type LocalRecorderCapture = {
  blob: Blob
  startedAt: number
  finishedAt: number
  durationMs: number
  interrupted: boolean
  stoppedByUser: boolean
  audioTrackPresent: boolean
  hasRecordedBytes: boolean
  audioFrames: 'present' | 'absent' | 'unknown'
  decodedDurationMs: number | null
}

type LocalRecorderState =
  | { state: 'captured'; capture: LocalRecorderCapture }
  | { state: 'cancelled' }

interface LocalRecorderHandle {
  result: Promise<ServiceResult<LocalRecorderState>>
  stop(): void
  cancel(): void
}

type DecodedFrameEvidence = Pick<LocalRecorderCapture, 'audioFrames' | 'decodedDurationMs'>

const maximumDecodeBytes = 32 * 1024 * 1024
const maximumWaveformBytes = 250 * 1024 * 1024
const maximumWaveformDurationMs = 10 * 60 * 1000
const waveformDecodeSampleRate = 8_000
const waveformPeakCount = 128

async function inspectRecordedFrames(blob: Blob): Promise<DecodedFrameEvidence> {
  if (blob.size === 0) return { audioFrames: 'absent', decodedDurationMs: null }
  const Decoder = globalThis.OfflineAudioContext
  if (typeof Decoder === 'undefined' || blob.size > maximumDecodeBytes) {
    return { audioFrames: 'unknown', decodedDurationMs: null }
  }
  try {
    const decoded = await new Decoder(1, 1, 48_000).decodeAudioData(await blob.arrayBuffer())
    if (decoded.length <= 0) return { audioFrames: 'absent', decodedDurationMs: 0 }
    return {
      audioFrames: 'present',
      decodedDurationMs: (decoded.length / decoded.sampleRate) * 1000,
    }
  } catch {
    return { audioFrames: 'unknown', decodedDurationMs: null }
  }
}

const failure = (
  code: ServiceError['code'],
  message: string,
  retry: ServiceError['retry'] = 'reconcile-first',
): ServiceResult<never> => ({
  status: 'error',
  error: { code, message, retry },
})

async function localWaveformBlob(source: Blob | string): Promise<ServiceResult<Blob>> {
  if (typeof source !== 'string') {
    return source.size <= maximumWaveformBytes
      ? { status: 'ok', data: source, replayed: false }
      : failure('unsupported', 'This local audio file is too large for waveform preview.', 'none')
  }
  if (!source.startsWith('blob:')) {
    return failure('forbidden', 'Waveform preview accepts local browser media only.', 'none')
  }
  if (typeof globalThis.fetch !== 'function') {
    return failure('unsupported', 'Local waveform preview is unavailable in this browser.', 'none')
  }

  try {
    const response = await globalThis.fetch(source)
    if (!response.ok) return failure('media-invalid', 'The local recording is no longer available for waveform preview.', 'none')
    const declaredLength = Number(response.headers.get('content-length'))
    if (Number.isFinite(declaredLength) && declaredLength > maximumWaveformBytes) {
      return failure('unsupported', 'This local audio file is too large for waveform preview.', 'none')
    }
    const blob = await response.blob()
    return blob.size <= maximumWaveformBytes
      ? { status: 'ok', data: blob, replayed: false }
      : failure('unsupported', 'This local audio file is too large for waveform preview.', 'none')
  } catch {
    return failure('media-invalid', 'The local recording is no longer available for waveform preview.', 'none')
  }
}

async function decodeAudioWaveform(input: AudioWaveformRequest): Promise<ServiceResult<DecodedAudioWaveform>> {
  const hasStart = input.startMs !== undefined
  const hasEnd = input.endMs !== undefined
  if (hasStart !== hasEnd
    || (hasStart && (!Number.isFinite(input.startMs) || !Number.isFinite(input.endMs)
      || input.startMs! < 0 || input.endMs! <= input.startMs!))) {
    return failure('validation', 'A valid bounded waveform interval is required.', 'none')
  }

  const localBlob = await localWaveformBlob(input.source)
  if (localBlob.status !== 'ok') return localBlob
  if (localBlob.data.size === 0) return failure('media-invalid', 'No local audio data is available for waveform preview.', 'none')
  const Decoder = globalThis.OfflineAudioContext
  if (typeof Decoder === 'undefined') {
    return failure('unsupported', 'Local waveform decoding is unavailable in this browser.', 'none')
  }

  try {
    const decoded = await new Decoder(1, 1, waveformDecodeSampleRate)
      .decodeAudioData(await localBlob.data.arrayBuffer())
    if (decoded.length <= 0 || !Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0) {
      return failure('media-invalid', 'The local audio has no decodable samples for waveform preview.', 'none')
    }
    const fullDurationMs = (decoded.length / decoded.sampleRate) * 1000
    if (!Number.isFinite(fullDurationMs) || fullDurationMs <= 0) {
      return failure('media-invalid', 'The local audio duration could not be decoded for waveform preview.', 'none')
    }
    if (fullDurationMs > maximumWaveformDurationMs) {
      return failure('unsupported', 'This local audio is too long for waveform preview.', 'none')
    }

    const startMs = input.startMs ?? 0
    const endMs = input.endMs ?? fullDurationMs
    if (endMs > fullDurationMs) {
      return failure('media-invalid', 'The requested waveform interval is outside the decoded local audio.', 'none')
    }
    const firstFrame = Math.max(0, Math.floor((startMs * decoded.sampleRate) / 1000))
    const lastFrame = Math.min(decoded.length, Math.ceil((endMs * decoded.sampleRate) / 1000))
    const selectedFrames = lastFrame - firstFrame
    if (selectedFrames <= 0) {
      return failure('media-invalid', 'The requested waveform interval contains no decoded audio frames.', 'none')
    }

    const channels = Array.from({ length: decoded.numberOfChannels }, (_, channel) => decoded.getChannelData(channel))
    if (channels.length === 0) {
      return failure('media-invalid', 'The local audio has no decoded channels for waveform preview.', 'none')
    }
    const rawPeaks = Array.from({ length: waveformPeakCount }, (_, bucket) => {
      const bucketStart = firstFrame + Math.floor((bucket * selectedFrames) / waveformPeakCount)
      const bucketEnd = Math.max(bucketStart + 1, firstFrame + Math.floor(((bucket + 1) * selectedFrames) / waveformPeakCount))
      let peak = 0
      for (const channel of channels) {
        const boundedEnd = Math.min(lastFrame, bucketEnd)
        for (let frame = bucketStart; frame < boundedEnd; frame += 1) {
          peak = Math.max(peak, Math.abs(channel[frame] ?? 0))
        }
      }
      return peak
    })
    const peakMaximum = Math.max(0, ...rawPeaks)
    const peaks = peakMaximum > 0 ? rawPeaks.map((peak) => peak / peakMaximum) : rawPeaks
    return {
      status: 'ok',
      data: {
        durationMs: (selectedFrames / decoded.sampleRate) * 1000,
        peaks,
      },
      replayed: false,
    }
  } catch {
    return failure('media-invalid', 'The local audio could not be decoded for waveform preview.', 'none')
  }
}

function mediaDevices(): MediaDevices | undefined {
  return globalThis.navigator?.mediaDevices
}

const mediaPreferenceStorageKey = 'dubbed.browser-media-preference.v1'

interface BrowserMediaPreference {
  /** The most recently connected input, or null when the browser exposed no stable id. */
  selectedInputId: string | null
  /** The input that was live when the user explicitly completed the microphone check. */
  checkedInputId: string | null
}

const emptyBrowserMediaPreference: BrowserMediaPreference = {
  selectedInputId: null,
  checkedInputId: null,
}

function parseBrowserMediaPreference(value: string | null): BrowserMediaPreference | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<BrowserMediaPreference> | null
    if (!parsed || typeof parsed !== 'object') return null
    if (parsed.selectedInputId !== null && typeof parsed.selectedInputId !== 'string') return null
    if (parsed.checkedInputId !== null && typeof parsed.checkedInputId !== 'string') return null
    return {
      selectedInputId: parsed.selectedInputId ?? null,
      checkedInputId: parsed.checkedInputId ?? null,
    }
  } catch {
    return null
  }
}

function errorName(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'name' in error) {
    return String((error as { name?: unknown }).name ?? '')
  }
  return ''
}

function mediaAccessFailure(error: unknown, action: 'enumerate' | 'request'): ServiceResult<never> {
  const name = errorName(error)
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return failure('forbidden', 'The browser or operating system did not allow microphone access.', 'none')
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return failure('not-found', 'The selected microphone is no longer available.')
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return failure('media-invalid', 'The microphone could not be opened. It may be in use by another application.')
  }
  return failure(
    action === 'enumerate' ? 'unsupported' : 'media-invalid',
    action === 'enumerate'
      ? 'The browser could not list available microphone inputs.'
      : 'The browser could not start microphone capture.',
  )
}

function createLevelWatcher(
  stream: MediaStream,
  onLevel: (sample: AudioLevelSample) => void,
): { ready: Promise<ServiceResult<void>>; stop(): void } {
  let stopped = false
  let context: AudioContext | undefined
  let source: MediaStreamAudioSourceNode | undefined
  let analyser: AnalyserNode | undefined
  let frameId: number | undefined
  let intervalId: ReturnType<typeof setInterval> | undefined
  const tracks = stream.getAudioTracks()

  const stop = () => {
    if (stopped) return
    stopped = true
    if (frameId !== undefined && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(frameId)
    }
    if (intervalId !== undefined) clearInterval(intervalId)
    for (const track of tracks) track.removeEventListener('ended', stop)
    source?.disconnect()
    analyser?.disconnect()
    if (context && context.state !== 'closed') {
      void context.close().catch(() => undefined)
    }
  }

  const ready = (async (): Promise<ServiceResult<void>> => {
    if (!tracks.some((track) => track.readyState === 'live')) {
      return failure('media-invalid', 'The microphone input has ended.')
    }
    if (typeof globalThis.AudioContext === 'undefined') {
      return failure('unsupported', 'Live input-level monitoring is unavailable in this browser.')
    }

    try {
      context = new AudioContext()
      if (context.state === 'suspended') await context.resume()
      if (stopped) {
        await context.close().catch(() => undefined)
        return { status: 'ok', data: undefined, replayed: false }
      }
      source = context.createMediaStreamSource(stream)
      analyser = context.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const samples = new Uint8Array(analyser.fftSize)
      const publish = () => {
        if (stopped || !analyser) return
        analyser.getByteTimeDomainData(samples)
        let sumSquares = 0
        let peak = 0
        for (const sample of samples) {
          const amplitude = Math.abs((sample - 128) / 128)
          sumSquares += amplitude * amplitude
          peak = Math.max(peak, amplitude)
        }
        try {
          onLevel({ rms: Math.min(1, Math.sqrt(sumSquares / samples.length)), peak: Math.min(1, peak) })
        } catch {
          // A consumer callback cannot keep the browser audio graph alive.
        }
      }

      if (typeof globalThis.requestAnimationFrame === 'function') {
        const tick = () => {
          publish()
          if (!stopped) frameId = globalThis.requestAnimationFrame(tick)
        }
        frameId = globalThis.requestAnimationFrame(tick)
      } else {
        intervalId = setInterval(publish, 50)
      }
      return { status: 'ok', data: undefined, replayed: false }
    } catch {
      stop()
      return failure('unsupported', 'Live input-level monitoring is unavailable in this browser.')
    }
  })()

  for (const track of tracks) track.addEventListener('ended', stop, { once: true })
  return { ready, stop }
}

function createRecorderCapture(
  stream: MediaStream,
  durationLimitMs: number,
  clock: ServiceClock,
  onProgress: (elapsedMs: number) => void,
  onLevel?: (sample: AudioLevelSample) => void,
): LocalRecorderHandle {
  const tracks = stream.getAudioTracks()
  const audioTrackPresent = tracks.some((track) => track.readyState === 'live')
  const Recorder = globalThis.MediaRecorder

  if (!audioTrackPresent) {
    return {
      result: Promise.resolve(failure('media-invalid', 'No live microphone audio track is available.')),
      stop: () => undefined,
      cancel: () => undefined,
    }
  }
  if (typeof Recorder === 'undefined') {
    return {
      result: Promise.resolve(failure('unsupported', 'This browser cannot record microphone audio locally.')),
      stop: () => undefined,
      cancel: () => undefined,
    }
  }

  let recorder: MediaRecorder
  try {
    const supportedMime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus']
      .find((mimeType) => Recorder.isTypeSupported(mimeType))
    recorder = new Recorder(stream, supportedMime ? { mimeType: supportedMime } : undefined)
  } catch {
    return {
      result: Promise.resolve(failure('unsupported', 'This browser could not start local microphone recording.')),
      stop: () => undefined,
      cancel: () => undefined,
    }
  }

  let resolveResult!: (value: ServiceResult<LocalRecorderState>) => void
  const result = new Promise<ServiceResult<LocalRecorderState>>((resolve) => {
    resolveResult = resolve
  })
  const chunks: BlobPart[] = []
  const startedAt = Math.floor(clock.now())
  let settled = false
  let endReason: 'limit' | 'user' | 'interrupted' | 'cancelled' | undefined
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let progressId: ReturnType<typeof setInterval> | undefined
  const levelWatcher = onLevel ? createLevelWatcher(stream, onLevel) : undefined

  const cleanup = () => {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
    if (progressId !== undefined) clearInterval(progressId)
    for (const track of tracks) track.removeEventListener('ended', onTrackEnded)
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibilityChange)
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', onPageHide)
    levelWatcher?.stop()
  }

  const settleError = (error: ServiceResult<never>) => {
    if (settled) return
    settled = true
    cleanup()
    resolveResult(error)
  }

  const finish = async () => {
    if (settled) return
    settled = true
    cleanup()
    const reason = endReason ?? 'interrupted'
    if (reason === 'cancelled') {
      resolveResult({ status: 'ok', data: { state: 'cancelled' }, replayed: false })
      return
    }
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
    const finishedAt = Math.floor(clock.now())
    const frameEvidence = await inspectRecordedFrames(blob)
    resolveResult({
      status: 'ok',
      data: {
        state: 'captured',
        capture: {
          blob,
          startedAt,
          finishedAt,
          durationMs: Math.max(0, finishedAt - startedAt),
          interrupted: reason === 'interrupted',
          stoppedByUser: reason === 'user',
          audioTrackPresent,
          hasRecordedBytes: blob.size > 0,
          ...frameEvidence,
        },
      },
      replayed: false,
    })
  }

  const onTrackEnded = () => stopRecorder('interrupted')
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') stopRecorder('interrupted')
  }
  const onPageHide = () => stopRecorder('interrupted')

  const stopRecorder = (reason: 'limit' | 'user' | 'interrupted' | 'cancelled') => {
    if (settled) return
    endReason = reason
    if (recorder.state === 'recording') {
      try {
        recorder.stop()
      } catch {
        finish()
      }
    } else if (recorder.state === 'inactive') {
      finish()
    }
  }

  recorder.addEventListener('dataavailable', (event) => {
    if (event.data.size > 0) chunks.push(event.data)
  })
  recorder.addEventListener('error', () => {
    settleError(failure('media-invalid', 'The browser stopped recording microphone audio unexpectedly.'))
    if (recorder.state === 'recording') {
      try {
        recorder.stop()
      } catch {
        // The result has already been settled and cleaned up.
      }
    }
  }, { once: true })
  recorder.addEventListener('stop', finish, { once: true })

  for (const track of tracks) track.addEventListener('ended', onTrackEnded, { once: true })
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibilityChange)
  if (typeof window !== 'undefined') window.addEventListener('pagehide', onPageHide, { once: true })

  try {
    recorder.start()
    progressId = setInterval(() => {
      const elapsed = Math.max(0, Math.floor(clock.now()) - startedAt)
      try {
        onProgress(Math.min(durationLimitMs, elapsed))
      } catch {
        // A progress callback cannot interrupt an active capture.
      }
    }, 50)
    timeoutId = setTimeout(() => stopRecorder('limit'), durationLimitMs)
  } catch {
    settleError(failure('unsupported', 'This browser could not start local microphone recording.'))
  }

  return {
    result,
    stop: () => stopRecorder('user'),
    cancel: () => stopRecorder('cancelled'),
  }
}

function isPositiveDuration(durationMs: number): boolean {
  return Number.isSafeInteger(durationMs) && durationMs > 0
}

export function createBrowserMediaService(clock: ServiceClock): BrowserMediaService {
  let inMemoryPreference = { ...emptyBrowserMediaPreference }
  let readinessHandoffAvailable = false
  let readinessRequest: Promise<boolean> | null = null

  const readPreference = (): BrowserMediaPreference => {
    try {
      const saved = parseBrowserMediaPreference(globalThis.localStorage?.getItem(mediaPreferenceStorageKey) ?? null)
      if (saved) {
        inMemoryPreference = saved
        return saved
      }
    } catch {
      // Browser storage may be disabled; this-session preferences remain useful without claiming persistence.
    }
    return inMemoryPreference
  }

  const writePreference = (preference: BrowserMediaPreference): void => {
    inMemoryPreference = preference
    try {
      globalThis.localStorage?.setItem(mediaPreferenceStorageKey, JSON.stringify(preference))
    } catch {
      // A live connection is still usable; later entries will recheck or ask for the check again.
    }
  }

  const checkStoredRecordingReadiness = async (): Promise<boolean> => {
    const preference = readPreference()
    if (preference.checkedInputId === null) return false
    try {
      const permissions = globalThis.navigator?.permissions
      const devices = mediaDevices()
      if (!permissions?.query || !devices?.enumerateDevices) return false
      const [permission, availableDevices] = await Promise.all([
        permissions.query({ name: 'microphone' } as PermissionDescriptor),
        devices.enumerateDevices(),
      ])
      if (permission.state !== 'granted') return false
      const inputs = availableDevices.filter((device) => device.kind === 'audioinput')
      if (inputs.length === 0) return false
      return preference.checkedInputId
        ? inputs.some((device) => device.deviceId === preference.checkedInputId)
        : true
    } catch {
      return false
    }
  }

  return {
    listInputs: async () => {
      const devices = mediaDevices()
      if (!devices?.enumerateDevices) {
        return failure('unsupported', 'Microphone input is unavailable in this browser.')
      }
      try {
        const preferredInputId = readPreference().selectedInputId
        const inputs = (await devices.enumerateDevices())
          .filter((device) => device.kind === 'audioinput')
          .map((device, index): MediaInput => ({
            id: ids.media(device.deviceId),
            label: device.label || 'Microphone',
            selected: preferredInputId
              ? device.deviceId === preferredInputId
              : index === 0,
          }))
        return { status: 'ok', data: inputs, replayed: false }
      } catch (error) {
        return mediaAccessFailure(error, 'enumerate')
      }
    },

    isRecordingEntryReady: () => {
      if (readinessRequest) return readinessRequest
      if (readinessHandoffAvailable) {
        readinessHandoffAvailable = false
        readinessRequest = Promise.resolve(true)
      } else {
        readinessRequest = checkStoredRecordingReadiness()
      }
      const currentRequest = readinessRequest
      void currentRequest.finally(() => {
        if (readinessRequest === currentRequest) readinessRequest = null
      })
      return currentRequest
    },

    completeMicrophoneCheck: (inputId) => {
      writePreference({
        selectedInputId: inputId || null,
        checkedInputId: inputId,
      })
      readinessHandoffAvailable = true
      readinessRequest = null
    },

    requestMicrophone: async (inputId) => {
      const devices = mediaDevices()
      if (!devices?.getUserMedia) {
        return failure('unsupported', 'Microphone capture is unavailable in this browser.')
      }
      const requestedInputId = inputId || readPreference().selectedInputId || undefined
      try {
        const stream = await devices.getUserMedia({
          audio: requestedInputId ? { deviceId: { exact: requestedInputId } } : true,
        })
        const track = stream.getAudioTracks().find((candidate) => candidate.readyState === 'live')
        if (!track) {
          for (const candidate of stream.getTracks()) candidate.stop()
          return failure('media-invalid', 'The browser did not provide a live microphone audio track.')
        }
        const actualInputId = track.getSettings().deviceId || requestedInputId || ''
        return { status: 'ok', data: { stream, inputId: actualInputId }, replayed: false }
      } catch (error) {
        return mediaAccessFailure(error, 'request')
      }
    },

    watchInputLevel: ({ stream, onLevel }) => createLevelWatcher(stream, onLevel),

    decodeAudioWaveform,

    captureFixedWindow: async ({ stream, candidateId, windowMs, onProgress, onLevel }) => {
      if (!isPositiveDuration(windowMs)) {
        return failure('validation', 'Capture duration must be a positive whole number of milliseconds.', 'none')
      }
      const capture = createRecorderCapture(stream, windowMs, clock, onProgress, onLevel)
      const outcome = await capture.result
      if (outcome.status !== 'ok') return outcome
      if (outcome.data.state === 'cancelled') {
        return failure('media-invalid', 'The fixed-window microphone capture was cancelled.')
      }
      const recorded = outcome.data.capture
      const data: FixedWindowCapture = {
        candidateId,
        blob: recorded.blob,
        startedAt: recorded.startedAt,
        finishedAt: recorded.finishedAt,
        interrupted: recorded.interrupted,
        audioTrackPresent: recorded.audioTrackPresent,
        hasRecordedBytes: recorded.hasRecordedBytes,
        audioFrames: recorded.audioFrames,
        decodedDurationMs: recorded.decodedDurationMs,
        durationMs: recorded.durationMs,
      }
      return { status: 'ok', data, replayed: false }
    },

    startMicrophoneTest: ({ stream, durationLimitMs, onProgress, onLevel }): MicrophoneTestCapture => {
      if (!isPositiveDuration(durationLimitMs)) {
        return {
          result: Promise.resolve(failure('validation', 'Test duration must be a positive whole number of milliseconds.', 'none')),
          stop: () => undefined,
          cancel: () => undefined,
        }
      }
      const capture = createRecorderCapture(stream, durationLimitMs, clock, onProgress, onLevel)
      const result: Promise<ServiceResult<MicrophoneTestOutcome>> = capture.result.then((outcome) => {
        if (outcome.status !== 'ok') return outcome
        if (outcome.data.state === 'cancelled') {
          return { status: 'ok', data: { state: 'cancelled' }, replayed: false }
        }
        const recorded = outcome.data.capture
        return {
          status: 'ok',
          data: {
            state: 'captured',
            blob: recorded.blob,
            audioTrackPresent: recorded.audioTrackPresent,
            hasRecordedBytes: recorded.hasRecordedBytes,
            audioFrames: recorded.audioFrames,
            decodedDurationMs: recorded.decodedDurationMs,
            durationMs: recorded.durationMs,
            stoppedByUser: recorded.stoppedByUser,
          },
          replayed: false,
        }
      })
      return { result, stop: capture.stop, cancel: capture.cancel }
    },
  }
}
