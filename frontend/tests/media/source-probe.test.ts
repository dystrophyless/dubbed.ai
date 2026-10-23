import { readFileSync } from 'node:fs'
import { webcrypto } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { probeLocalSource } from '../../src/media/source-probe'

const patchedDescriptors: Array<{ target: object; name: string; previous: PropertyDescriptor | undefined }> = []

function patchDescriptor(target: object, name: string, value: PropertyDescriptor) {
  if (!patchedDescriptors.some((entry) => entry.target === target && entry.name === name)) {
    patchedDescriptors.push({ target, name, previous: Object.getOwnPropertyDescriptor(target, name) })
  }
  Object.defineProperty(target, name, value)
}

function fixtureFile(path: string, name: string, type: string): File {
  const bytes = new Uint8Array(readFileSync(new URL(path, import.meta.url)))
  return new File([bytes], name, { type })
}

function mockBrowserMetadata(options: { resetDurationWhenUnloaded?: boolean } = {}) {
  vi.stubGlobal('crypto', webcrypto as unknown as Crypto)
  patchDescriptor(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:source-probe-test') })
  patchDescriptor(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  let duration = 8.6254
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
    if (options.resetDurationWhenUnloaded && !this.hasAttribute('src')) duration = Number.NaN
    setTimeout(() => this.dispatchEvent(new Event('loadedmetadata')), 0)
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  patchDescriptor(HTMLMediaElement.prototype, 'duration', { configurable: true, get: () => duration })
  patchDescriptor(HTMLVideoElement.prototype, 'videoWidth', { configurable: true, get: () => 640 })
  patchDescriptor(HTMLVideoElement.prototype, 'videoHeight', { configurable: true, get: () => 360 })
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  for (const { target, name, previous } of patchedDescriptors.splice(0)) {
    if (previous) Object.defineProperty(target, name, previous)
    else Reflect.deleteProperty(target, name)
  }
})

describe('local media source probe', () => {
  it('identifies the exact permitted source fixture and reads browser metadata separately', async () => {
    mockBrowserMetadata()
    const result = await probeLocalSource(fixtureFile('../../public/media/source-dialogue.mp4', 'renamed.mp4', 'video/mp4'))

    expect(result).toMatchObject({
      container: 'iso-bmff',
      audioTrack: 'present',
      hasAudio: true,
      fixtureKey: 'source',
      fixtureSha256: '36e996acf6eb710ed282cd154536314752be08aea9946a6955f7da8a719d4d9b',
      browserMetadata: 'loaded',
      width: 640,
      height: 360,
    })
    expect(result.durationMs).toBeCloseTo(8_625.4, 1)
  })

  it('snapshots video metadata before cleanup resets the media element', async () => {
    mockBrowserMetadata({ resetDurationWhenUnloaded: true })
    const result = await probeLocalSource(fixtureFile('../../public/media/source-dialogue.mp4', 'source.mp4', 'video/mp4'))

    expect(result.browserMetadata).toBe('loaded')
    expect(result.durationMs).toBeCloseTo(8_625.4, 1)
    expect(result.width).toBe(640)
    expect(result.height).toBe(360)
  })

  it('distinguishes a valid all-zero WAVE track from a missing track', async () => {
    const result = await probeLocalSource(fixtureFile('../../public/media/valid-silence.wav', 'silent.wav', 'audio/wav'))

    expect(result).toMatchObject({
      container: 'wave',
      audioTrack: 'present',
      hasAudio: true,
      audioSampleFrames: 44_100,
      sampleContent: 'all-zero',
      browserMetadata: 'not-video',
      durationMs: 2_000,
    })
  })

  it('reports an absent MP4 audio handler only when the container headers establish it', async () => {
    mockBrowserMetadata()
    const result = await probeLocalSource(fixtureFile('../../public/media/no-audio-track.mp4', 'clip.mp4', 'video/mp4'))

    expect(result).toMatchObject({
      container: 'iso-bmff',
      audioTrack: 'absent',
      hasAudio: false,
      fixtureKey: 'noAudioTrack',
      browserMetadata: 'loaded',
    })
  })

  it('keeps unsupported or truncated video bytes unknown even when metadata cannot load', async () => {
    mockBrowserMetadata()
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(function (this: HTMLMediaElement) {
      setTimeout(() => this.dispatchEvent(new Event('error')), 0)
    })
    const truncated = new File([Uint8Array.of(0, 0, 0, 16, 102, 116, 121, 112)], 'broken.mp4', { type: 'video/mp4' })

    const result = await probeLocalSource(truncated)

    expect(result).toMatchObject({
      container: 'unknown',
      audioTrack: 'unknown',
      hasAudio: null,
      browserMetadata: 'failed',
      fixtureKey: null,
    })
  })
})
