import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBrowserMediaService } from '../../src/services/browser-media'
import { ids } from '../../src/services/contracts'

class FakeTrack extends EventTarget {
  readyState: MediaStreamTrackState = 'live'
  muted = false

  getSettings() {
    return { deviceId: 'mic-1' }
  }

  stop() {
    if (this.readyState === 'ended') return
    this.readyState = 'ended'
    this.dispatchEvent(new Event('ended'))
  }
}

class FakeMediaRecorder extends EventTarget {
  static instances: FakeMediaRecorder[] = []
  static payload = Uint8Array.of(1, 2, 3)
  static isTypeSupported(type: string) {
    return type === 'audio/webm;codecs=opus'
  }

  state: RecordingState = 'inactive'
  readonly mimeType = 'audio/webm;codecs=opus'
  emitBytes = true

  readonly stream: MediaStream

  constructor(stream: MediaStream) {
    super()
    this.stream = stream
    FakeMediaRecorder.instances.push(this)
  }

  start() {
    this.state = 'recording'
  }

  stop() {
    if (this.state !== 'recording') throw new Error('recorder is inactive')
    this.state = 'inactive'
    if (this.emitBytes) {
      const data = new Blob([FakeMediaRecorder.payload], { type: this.mimeType })
      const event = new Event('dataavailable')
      Object.defineProperty(event, 'data', { value: data })
      this.dispatchEvent(event)
    }
    this.dispatchEvent(new Event('stop'))
  }
}

class EmptyMediaRecorder extends FakeMediaRecorder {
  constructor(stream: MediaStream) {
    super(stream)
    this.emitBytes = false
  }
}

class SilentOfflineAudioContext {
  static decodedFrames = 48_000

  constructor(_channels: number, _frames: number, _sampleRate: number) {}

  async decodeAudioData() {
    return {
      length: SilentOfflineAudioContext.decodedFrames,
      sampleRate: 48_000,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(SilentOfflineAudioContext.decodedFrames),
    } as unknown as AudioBuffer
  }
}

class WaveformOfflineAudioContext {
  static channels: Float32Array[] = [new Float32Array(8_000)]
  static sampleRate = 8_000

  constructor(_channels: number, _frames: number, _sampleRate: number) {}

  async decodeAudioData() {
    return {
      length: WaveformOfflineAudioContext.channels[0]?.length ?? 0,
      sampleRate: WaveformOfflineAudioContext.sampleRate,
      numberOfChannels: WaveformOfflineAudioContext.channels.length,
      getChannelData: (channel: number) => WaveformOfflineAudioContext.channels[channel],
    } as unknown as AudioBuffer
  }
}

function fakeStream(track = new FakeTrack()) {
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
  return { stream, track }
}

function createService() {
  return createBrowserMediaService({ now: () => Date.now() })
}

describe('browser-only microphone service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakeMediaRecorder.instances = []
    FakeMediaRecorder.payload = Uint8Array.of(1, 2, 3)
    SilentOfflineAudioContext.decodedFrames = 48_000
    WaveformOfflineAudioContext.channels = [new Float32Array(8_000)]
    WaveformOfflineAudioContext.sampleRate = 8_000
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
    window.localStorage.removeItem('dubbed.browser-media-preference.v1')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'mediaDevices')
    Reflect.deleteProperty(navigator, 'permissions')
    window.localStorage.removeItem('dubbed.browser-media-preference.v1')
  })

  it('lists only browser-exposed audio inputs without inventing an identifier', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: vi.fn().mockResolvedValue([
          { kind: 'audioinput', deviceId: 'mic-1', label: 'USB Microphone' },
          { kind: 'videoinput', deviceId: 'camera-1', label: 'Camera' },
          { kind: 'audioinput', deviceId: '', label: '' },
        ]),
      },
    })

    const result = await createService().listInputs()

    expect(result).toMatchObject({
      status: 'ok',
      data: [
        { id: 'mic-1', label: 'USB Microphone', selected: true },
        { id: '', label: 'Microphone', selected: false },
      ],
    })
  })

  it('requires an explicit check, then rechecks granted permission and the remembered input without opening a stream', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'mic-2', label: 'USB Microphone' },
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in Microphone' },
    ])
    const getUserMedia = vi.fn()
    const query = vi.fn().mockResolvedValue({ state: 'granted' })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices, getUserMedia },
    })
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query },
    })

    const firstService = createService()
    expect(await firstService.isRecordingEntryReady()).toBe(false)
    expect(query).not.toHaveBeenCalled()
    expect(getUserMedia).not.toHaveBeenCalled()

    firstService.completeMicrophoneCheck('mic-2')
    expect(await firstService.isRecordingEntryReady()).toBe(true)
    expect(getUserMedia).not.toHaveBeenCalled()

    const returningService = createService()
    expect(await returningService.isRecordingEntryReady()).toBe(true)
    query.mockResolvedValueOnce({ state: 'denied' })
    expect(await createService().isRecordingEntryReady()).toBe(false)
    query.mockResolvedValueOnce({ state: 'granted' })
    enumerateDevices.mockResolvedValueOnce([
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in Microphone' },
    ])
    expect(await createService().isRecordingEntryReady()).toBe(false)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('shares a one-entry live-ready handoff across concurrent checks when permission querying is unavailable', async () => {
    const getUserMedia = vi.fn()
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices: vi.fn().mockResolvedValue([]), getUserMedia },
    })
    const service = createService()
    service.completeMicrophoneCheck('mic-1')

    const concurrentResults = await Promise.all([
      service.isRecordingEntryReady(),
      service.isRecordingEntryReady(),
    ])

    expect(concurrentResults).toEqual([true, true])
    expect(await service.isRecordingEntryReady()).toBe(false)
    expect(getUserMedia).not.toHaveBeenCalled()
  })

  it('keeps live continuation usable when browser storage is blocked without persisting readiness', async () => {
    const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => { throw new Error('storage disabled') },
    })
    try {
      const getUserMedia = vi.fn()
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { enumerateDevices: vi.fn().mockResolvedValue([]), getUserMedia },
      })
      const service = createService()
      service.completeMicrophoneCheck('mic-1')

      expect(await service.isRecordingEntryReady()).toBe(true)
      expect(await service.isRecordingEntryReady()).toBe(false)
      expect(getUserMedia).not.toHaveBeenCalled()
    } finally {
      if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
    expect(window.localStorage.getItem('dubbed.browser-media-preference.v1')).toBeNull()
  })

  it('hands the explicitly checked input to the next explicit microphone request', async () => {
    const track = new FakeTrack()
    track.getSettings = () => ({ deviceId: 'mic-2' })
    const { stream } = fakeStream(track)
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'audioinput', deviceId: 'mic-1', label: 'Built-in Microphone' },
      { kind: 'audioinput', deviceId: 'mic-2', label: 'USB Microphone' },
    ])
    const getUserMedia = vi.fn().mockResolvedValue(stream)
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { enumerateDevices, getUserMedia },
    })
    const service = createService()
    service.completeMicrophoneCheck('mic-2')

    const listed = await service.listInputs()
    const connected = await service.requestMicrophone()

    expect(listed).toMatchObject({
      status: 'ok',
      data: [
        { id: 'mic-1', selected: false },
        { id: 'mic-2', selected: true },
      ],
    })
    expect(getUserMedia).toHaveBeenCalledWith({ audio: { deviceId: { exact: 'mic-2' } } })
    expect(connected).toMatchObject({ status: 'ok', data: { inputId: 'mic-2' } })
  })

  it('maps a browser permission denial to a truthful forbidden result', async () => {
    const denied = Object.assign(new Error('blocked'), { name: 'NotAllowedError' })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(denied) },
    })

    const result = await createService().requestMicrophone('mic-1')

    expect(result).toMatchObject({ status: 'error', error: { code: 'forbidden', retry: 'none' } })
  })

  it('captures an explicit local test Stop without stopping the live input stream', async () => {
    const { stream, track } = fakeStream()
    const test = createService().startMicrophoneTest({
      stream,
      durationLimitMs: 8_000,
      onProgress: vi.fn(),
    })

    expect(FakeMediaRecorder.instances[0].state).toBe('recording')
    test.stop()
    const result = await test.result

    expect(result).toMatchObject({
      status: 'ok',
      data: {
        state: 'captured',
        audioTrackPresent: true,
        hasRecordedBytes: true,
        audioFrames: 'unknown',
        decodedDurationMs: null,
        stoppedByUser: true,
      },
    })
    expect(track.readyState).toBe('live')
  })

  it('discards test bytes on cancel and reports an empty recording separately from track presence', async () => {
    const { stream } = fakeStream()
    const service = createService()
    const cancelled = service.startMicrophoneTest({ stream, durationLimitMs: 8_000, onProgress: vi.fn() })
    cancelled.cancel()
    expect(await cancelled.result).toMatchObject({ status: 'ok', data: { state: 'cancelled' } })

    vi.stubGlobal('MediaRecorder', EmptyMediaRecorder)
    const empty = service.startMicrophoneTest({ stream, durationLimitMs: 8_000, onProgress: vi.fn() })
    empty.stop()

    expect(await empty.result).toMatchObject({
      status: 'ok',
      data: {
        state: 'captured',
        audioTrackPresent: true,
        hasRecordedBytes: false,
        audioFrames: 'absent',
        decodedDurationMs: null,
      },
    })
  })

  it('accepts decoded silent frames as present without a speech or amplitude threshold', async () => {
    vi.stubGlobal('OfflineAudioContext', SilentOfflineAudioContext)
    const { stream } = fakeStream()
    const test = createService().startMicrophoneTest({ stream, durationLimitMs: 8_000, onProgress: vi.fn() })
    test.stop()

    expect(await test.result).toMatchObject({
      status: 'ok',
      data: {
        state: 'captured',
        audioTrackPresent: true,
        hasRecordedBytes: true,
        audioFrames: 'present',
        decodedDurationMs: 1_000,
      },
    })
  })

  it('keeps nonempty undecodable bytes unconfirmed instead of marking audio frames present', async () => {
    vi.stubGlobal('OfflineAudioContext', class {
      decodeAudioData(): Promise<never> {
        return Promise.reject(new Error('unsupported or header-only recording'))
      }
    })
    const { stream } = fakeStream()
    const test = createService().startMicrophoneTest({ stream, durationLimitMs: 8_000, onProgress: vi.fn() })
    test.stop()

    expect(await test.result).toMatchObject({
      status: 'ok',
      data: {
        state: 'captured',
        hasRecordedBytes: true,
        audioFrames: 'unknown',
        decodedDurationMs: null,
      },
    })
  })

  it('returns normalized local peaks cropped to the requested source interval', async () => {
    const samples = new Float32Array(8_000)
    samples[4_000] = -1
    samples[4_001] = 0.5
    WaveformOfflineAudioContext.channels = [samples]
    vi.stubGlobal('OfflineAudioContext', WaveformOfflineAudioContext)

    const result = await createService().decodeAudioWaveform({
      source: new Blob(['local audio'], { type: 'audio/webm' }),
      startMs: 250,
      endMs: 750,
    })

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.data.durationMs).toBe(500)
    expect(result.data.peaks).toHaveLength(128)
    expect(Math.max(...result.data.peaks)).toBe(1)
    expect(result.data.peaks.flatMap((peak, index) => peak > 0 ? [index] : [])).toEqual([64])
  })

  it('decodes an accepted local playback blob URL and refuses remote URLs before fetch', async () => {
    vi.stubGlobal('OfflineAudioContext', WaveformOfflineAudioContext)
    const localFetch = vi.fn(async () => ({
      ok: true,
      headers: { get: () => '11' },
      blob: async () => new Blob(['local audio'], { type: 'audio/webm' }),
    }))
    vi.stubGlobal('fetch', localFetch)
    const service = createService()

    const local = await service.decodeAudioWaveform({ source: 'blob:https://app.example/accepted-take' })
    const remote = await service.decodeAudioWaveform({ source: 'https://app.example/audio.webm' })

    expect(local.status).toBe('ok')
    expect(localFetch).toHaveBeenCalledOnce()
    expect(remote).toMatchObject({ status: 'error', error: { code: 'forbidden', retry: 'none' } })
    expect(localFetch).toHaveBeenCalledOnce()
  })

  it('supports upload-sized sources while rejecting waveforms above upload and duration bounds', async () => {
    vi.stubGlobal('OfflineAudioContext', WaveformOfflineAudioContext)
    const service = createService()
    const largeSupported = {
      size: 32 * 1024 * 1024 + 1,
      arrayBuffer: vi.fn(async () => new ArrayBuffer(1)),
    } as unknown as Blob
    const oversized = {
      size: 250 * 1024 * 1024 + 1,
      arrayBuffer: vi.fn(async () => new ArrayBuffer(1)),
    } as unknown as Blob
    const tooLongSamples = new Float32Array(8_000 * 600 + 1)
    WaveformOfflineAudioContext.channels = [tooLongSamples]

    WaveformOfflineAudioContext.channels = [new Float32Array(8_000)]
    const largeButSupported = await service.decodeAudioWaveform({ source: largeSupported })
    WaveformOfflineAudioContext.channels = [tooLongSamples]
    const tooLarge = await service.decodeAudioWaveform({ source: oversized })
    const tooLong = await service.decodeAudioWaveform({ source: new Blob(['audio']) })

    expect(largeButSupported.status).toBe('ok')
    expect(largeSupported.arrayBuffer).toHaveBeenCalledOnce()
    expect(tooLarge).toMatchObject({ status: 'error', error: { code: 'unsupported' } })
    expect(oversized.arrayBuffer).not.toHaveBeenCalled()
    expect(tooLong).toMatchObject({ status: 'error', error: { code: 'unsupported' } })
  })

  it('finalizes a partial test when the input track ends without treating it as a user stop', async () => {
    const { stream, track } = fakeStream()
    const test = createService().startMicrophoneTest({ stream, durationLimitMs: 8_000, onProgress: vi.fn() })
    track.stop()

    expect(await test.result).toMatchObject({
      status: 'ok',
      data: {
        state: 'captured',
        stoppedByUser: false,
        hasRecordedBytes: true,
        audioFrames: 'unknown',
        decodedDurationMs: null,
      },
    })
  })

  it('ends a fixed capture at its configured window and reports separate track and byte facts', async () => {
    const { stream } = fakeStream()
    const capture = createService().captureFixedWindow({
      stream,
      candidateId: ids.candidate('candidate-1'),
      windowMs: 500,
      onProgress: vi.fn(),
    })

    await vi.advanceTimersByTimeAsync(500)
    const result = await capture

    expect(result).toMatchObject({
      status: 'ok',
      data: {
        candidateId: 'candidate-1',
        audioTrackPresent: true,
        hasRecordedBytes: true,
        audioFrames: 'unknown',
        decodedDurationMs: null,
        interrupted: false,
      },
    })
  })
})
