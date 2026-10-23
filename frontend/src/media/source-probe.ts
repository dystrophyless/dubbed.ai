import { MEDIA_FIXTURE_MANIFEST, type MediaFixtureKey } from './fixtures'

export type EvidenceState = 'present' | 'absent' | 'unknown'
export type SourceContainer = 'iso-bmff' | 'wave' | 'unknown'
export type BrowserMetadataState = 'loaded' | 'failed' | 'timed-out' | 'unsupported' | 'not-video'
export type SampleContentState = 'nonzero' | 'all-zero' | 'unknown' | 'no-track'

export interface LocalSourceProbe {
  fileName: string
  mimeType: string
  byteLength: number
  container: SourceContainer
  audioTrack: EvidenceState
  /** Null means track presence could not be established from supported evidence. */
  hasAudio: boolean | null
  audioSampleFrames: number | null
  /** All-zero PCM is still an audio track and is not treated as missing audio. */
  sampleContent: SampleContentState
  browserMetadata: BrowserMetadataState
  durationMs: number | null
  width: number | null
  height: number | null
  fixtureKey: Exclude<MediaFixtureKey, 'noData'> | null
  fixtureScenario: string | null
  fixtureSha256: string | null
}

interface HeaderEvidence {
  container: SourceContainer
  audioTrack: EvidenceState
  audioSampleFrames: number | null
  sampleContent: SampleContentState
  durationMs: number | null
}

interface Box {
  type: string
  start: number
  payloadStart: number
  end: number
}

interface FixtureIdentity {
  key: Exclude<MediaFixtureKey, 'noData'>
  sha256: string
  scenario: string | null
}

const maxFixtureHashBytes = 16 * 1024 * 1024
const maxContainerHeaderBytes = 16 * 1024 * 1024
const maxAudioSampleScanBytes = 16 * 1024 * 1024
const metadataTimeoutMs = 5_000

function readAscii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(start, start + length))
}

async function readBytes(file: File, start: number, length: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, start + length).arrayBuffer())
}

function parseBoxes(bytes: Uint8Array, start: number, end: number): Box[] | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const found: Box[] = []
  let offset = start
  let count = 0
  while (offset < end) {
    if (offset + 8 > end || ++count > 100_000) return null
    const size32 = view.getUint32(offset)
    const type = readAscii(bytes, offset + 4, 4)
    let headerSize = 8
    let boxSize = size32
    if (size32 === 1) {
      if (offset + 16 > end) return null
      const high = view.getUint32(offset + 8)
      const low = view.getUint32(offset + 12)
      boxSize = high * 0x1_0000_0000 + low
      headerSize = 16
      if (!Number.isSafeInteger(boxSize)) return null
    } else if (size32 === 0) {
      boxSize = end - offset
    }
    if (boxSize < headerSize || offset + boxSize > end) return null
    const boxEnd = offset + boxSize
    found.push({ type, start: offset, payloadStart: offset + headerSize, end: boxEnd })
    offset = boxEnd
  }
  return offset === end ? found : null
}

async function inspectIsoBmff(file: File): Promise<HeaderEvidence> {
  let offset = 0
  let hasFileTypeBox = false
  let movieStart = -1
  let movieSize = 0
  let topLevelCount = 0

  while (offset + 8 <= file.size && ++topLevelCount <= 100_000) {
    const header = await readBytes(file, offset, Math.min(16, file.size - offset))
    if (header.length < 8) break
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength)
    const size32 = view.getUint32(0)
    const type = readAscii(header, 4, 4)
    let headerSize = 8
    let boxSize = size32
    if (size32 === 1) {
      if (header.length < 16) break
      boxSize = view.getUint32(8) * 0x1_0000_0000 + view.getUint32(12)
      headerSize = 16
      if (!Number.isSafeInteger(boxSize)) break
    } else if (size32 === 0) {
      boxSize = file.size - offset
    }
    if (boxSize < headerSize || offset + boxSize > file.size) break
    if (type === 'ftyp' && boxSize >= 16) hasFileTypeBox = true
    if (type === 'moov') {
      movieStart = offset
      movieSize = boxSize
    }
    offset += boxSize
    if (size32 === 0) break
  }

  if (!hasFileTypeBox) {
    return { container: 'unknown', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }
  if (movieStart < 0 || movieSize > maxContainerHeaderBytes) {
    return { container: 'iso-bmff', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }

  const movie = await readBytes(file, movieStart, movieSize)
  const movieBoxes = parseBoxes(movie, 0, movie.length)
  const movieBox = movieBoxes?.find((box) => box.type === 'moov')
  if (!movieBox) {
    return { container: 'iso-bmff', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }
  const tracks = parseBoxes(movie, movieBox.payloadStart, movieBox.end)
  if (!tracks) {
    return { container: 'iso-bmff', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }
  const trackBoxes = tracks.filter((box) => box.type === 'trak')
  if (trackBoxes.length === 0) {
    return { container: 'iso-bmff', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }

  let audioFound = false
  for (const trackBox of trackBoxes) {
    const trackChildren = parseBoxes(movie, trackBox.payloadStart, trackBox.end)
    const mediaBox = trackChildren?.find((box) => box.type === 'mdia')
    const mediaChildren = mediaBox && parseBoxes(movie, mediaBox.payloadStart, mediaBox.end)
    const handlerBox = mediaChildren?.find((box) => box.type === 'hdlr')
    if (!handlerBox || handlerBox.payloadStart + 12 > handlerBox.end) {
      return { container: 'iso-bmff', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
    }
    if (readAscii(movie, handlerBox.payloadStart + 8, 4) === 'soun') audioFound = true
  }

  return {
    container: 'iso-bmff',
    audioTrack: audioFound ? 'present' : 'absent',
    audioSampleFrames: null,
    sampleContent: audioFound ? 'unknown' : 'no-track',
    durationMs: null,
  }
}

async function inspectWave(file: File): Promise<HeaderEvidence> {
  const first = await readBytes(file, 0, 12)
  if (first.length < 12 || readAscii(first, 0, 4) !== 'RIFF' || readAscii(first, 8, 4) !== 'WAVE') {
    return { container: 'unknown', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }
  const riffSize = new DataView(first.buffer, first.byteOffset, first.byteLength).getUint32(4, true)
  const riffEnd = 8 + riffSize
  if (riffSize < 4 || riffEnd > file.size) {
    return { container: 'wave', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }

  let offset = 12
  let format: { encoding: number; channels: number; sampleRate: number; byteRate: number; blockAlign: number; bitsPerSample: number } | null = null
  const dataChunks: Array<{ start: number; size: number }> = []
  let chunks = 0
  while (offset + 8 <= riffEnd && ++chunks <= 100_000) {
    const chunkHeader = await readBytes(file, offset, 8)
    if (chunkHeader.length !== 8) break
    const view = new DataView(chunkHeader.buffer, chunkHeader.byteOffset, chunkHeader.byteLength)
    const type = readAscii(chunkHeader, 0, 4)
    const size = view.getUint32(4, true)
    const payloadStart = offset + 8
    const chunkEnd = payloadStart + size
    if (chunkEnd > riffEnd) {
      return { container: 'wave', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
    }
    if (type === 'fmt ') {
      if (size < 16) return { container: 'wave', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
      const bytes = await readBytes(file, payloadStart, Math.min(size, 40))
      const fmt = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      let encoding = fmt.getUint16(0, true)
      if (encoding === 0xfffe && bytes.length >= 26) encoding = fmt.getUint16(24, true)
      format = {
        encoding,
        channels: fmt.getUint16(2, true),
        sampleRate: fmt.getUint32(4, true),
        byteRate: fmt.getUint32(8, true),
        blockAlign: fmt.getUint16(12, true),
        bitsPerSample: fmt.getUint16(14, true),
      }
    } else if (type === 'data') {
      dataChunks.push({ start: payloadStart, size })
    }
    offset = chunkEnd + (size % 2)
  }
  if (chunks > 100_000 || offset > riffEnd || !format || format.channels <= 0 || format.blockAlign <= 0) {
    return { container: 'wave', audioTrack: 'unknown', audioSampleFrames: null, sampleContent: 'unknown', durationMs: null }
  }
  if (dataChunks.length === 0) {
    return { container: 'wave', audioTrack: 'absent', audioSampleFrames: 0, sampleContent: 'no-track', durationMs: 0 }
  }

  const dataBytes = dataChunks.reduce((sum, chunk) => sum + chunk.size, 0)
  const audioSampleFrames = dataBytes % format.blockAlign === 0 ? dataBytes / format.blockAlign : null
  let sampleContent: SampleContentState = 'unknown'
  const isPcm = format.encoding === 1 || format.encoding === 3
  if (isPcm && (format.bitsPerSample === 8 || format.bitsPerSample === 16 || format.bitsPerSample === 24 || format.bitsPerSample === 32) && dataBytes <= maxAudioSampleScanBytes) {
    let nonzero = false
    for (const chunk of dataChunks) {
      const bytes = await readBytes(file, chunk.start, chunk.size)
      if (format.bitsPerSample === 8 && format.encoding === 1) {
        nonzero ||= bytes.some((sample) => sample !== 128)
      } else {
        nonzero ||= bytes.some((sample) => sample !== 0)
      }
    }
    sampleContent = nonzero ? 'nonzero' : 'all-zero'
  }
  return {
    container: 'wave',
    audioTrack: 'present',
    audioSampleFrames,
    sampleContent,
    durationMs: format.byteRate > 0 ? (dataBytes / format.byteRate) * 1000 : null,
  }
}

async function inspectAudioSamples(file: File, current: HeaderEvidence): Promise<HeaderEvidence> {
  if (current.container !== 'iso-bmff' || current.audioTrack !== 'present' || file.size > maxAudioSampleScanBytes) return current
  if (typeof globalThis.OfflineAudioContext === 'undefined') return current
  try {
    const context = new OfflineAudioContext(1, 1, 48_000)
    const decoded = await context.decodeAudioData(await file.arrayBuffer())
    if (decoded.length <= 0) return current
    let nonzero = false
    for (let channel = 0; channel < decoded.numberOfChannels && !nonzero; channel += 1) {
      const samples = decoded.getChannelData(channel)
      for (let index = 0; index < samples.length; index += 1) {
        if (samples[index] !== 0) {
          nonzero = true
          break
        }
      }
    }
    return {
      ...current,
      audioSampleFrames: decoded.length,
      sampleContent: nonzero ? 'nonzero' : 'all-zero',
      durationMs: (decoded.length / decoded.sampleRate) * 1000,
    }
  } catch {
    return current
  }
}

function browserVideoMetadata(file: File): Promise<{
  state: BrowserMetadataState
  durationMs: number | null
  width: number | null
  height: number | null
}> {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return Promise.resolve({ state: 'unsupported', durationMs: null, width: null, height: null })
  }
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    let settled = false
    const timer = setTimeout(() => finish('timed-out'), metadataTimeoutMs)
    const finish = (state: BrowserMetadataState) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const metadata = {
        durationMs: state === 'loaded' && Number.isFinite(video.duration) ? video.duration * 1000 : null,
        width: state === 'loaded' && video.videoWidth > 0 ? video.videoWidth : null,
        height: state === 'loaded' && video.videoHeight > 0 ? video.videoHeight : null,
      }
      video.pause()
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      resolve({ state, ...metadata })
    }
    video.preload = 'metadata'
    video.muted = true
    video.volume = 0
    video.addEventListener('loadedmetadata', () => finish('loaded'), { once: true })
    video.addEventListener('error', () => finish('failed'), { once: true })
    video.src = url
    video.load()
  })
}

async function matchKnownFixture(file: File): Promise<FixtureIdentity | null> {
  if (file.size <= 0 || file.size > maxFixtureHashBytes || !globalThis.crypto?.subtle) return null
  try {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
    const sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    for (const [key, rawAsset] of Object.entries(MEDIA_FIXTURE_MANIFEST.assets)) {
      if (!rawAsset || typeof rawAsset !== 'object') continue
      const asset = rawAsset as { bytes?: unknown; sha256?: unknown; scenario?: unknown }
      if (asset.bytes !== file.size || asset.sha256 !== sha256) continue
      return {
        key: key as Exclude<MediaFixtureKey, 'noData'>,
        sha256,
        scenario: typeof asset.scenario === 'string' ? asset.scenario : null,
      }
    }
  } catch {
    return null
  }
  return null
}

/**
 * Inspects local bytes and browser metadata only. It never plays the source and never infers a
 * missing audio track from a playback/metadata error. Track facts stay unknown when the container
 * cannot be parsed. Full-file hashing and sample scans are bounded to 16 MiB.
 */
export async function probeLocalSource(file: File): Promise<LocalSourceProbe> {
  const first = await readBytes(file, 0, Math.min(file.size, 12))
  const isWave = first.length >= 12 && readAscii(first, 0, 4) === 'RIFF' && readAscii(first, 8, 4) === 'WAVE'
  const isIsoBmff = first.length >= 8 && readAscii(first, 4, 4) === 'ftyp'
  const header = isWave
    ? await inspectWave(file)
    : isIsoBmff
      ? await inspectIsoBmff(file)
      : { container: 'unknown' as const, audioTrack: 'unknown' as const, audioSampleFrames: null, sampleContent: 'unknown' as const, durationMs: null }
  const enriched = await inspectAudioSamples(file, header)
  const shouldReadVideoMetadata = isIsoBmff || file.type.startsWith('video/')
  const metadata = shouldReadVideoMetadata
    ? await browserVideoMetadata(file)
    : { state: 'not-video' as const, durationMs: null, width: null, height: null }
  const fixture = await matchKnownFixture(file)
  const audioTrack = enriched.audioTrack
  return {
    fileName: file.name,
    mimeType: file.type,
    byteLength: file.size,
    container: enriched.container,
    audioTrack,
    hasAudio: audioTrack === 'present' ? true : audioTrack === 'absent' ? false : null,
    audioSampleFrames: enriched.audioSampleFrames,
    sampleContent: enriched.sampleContent,
    browserMetadata: metadata.state,
    durationMs: metadata.durationMs ?? enriched.durationMs,
    width: metadata.width,
    height: metadata.height,
    fixtureKey: fixture?.key ?? null,
    fixtureScenario: fixture?.scenario ?? null,
    fixtureSha256: fixture?.sha256 ?? null,
  }
}
