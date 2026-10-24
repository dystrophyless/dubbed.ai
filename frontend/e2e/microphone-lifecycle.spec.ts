import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import {
  continueThroughRecordingEntryGate,
  completeVisibleRegistration,
  setMillisecondSelectionAndQuote,
  startRegistrationFromLanding,
  uploadKnownSourceThroughUi,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

const microphoneProofDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../_docs/evidence/frontend-implementation-2026-10-23/mic-icon-final-proof',
)

interface MicrophoneLifecycleState {
  trackStops: number
  recorderStarts: number
  recorderStops: number
  objectUrlsCreated: string[]
  objectUrlsRevoked: string[]
  idbWrites: number
}

declare global {
  interface Window {
    __microphoneLifecycle?: MicrophoneLifecycleState
    __microphoneNativeRecorder?: typeof MediaRecorder
  }
}

async function instrumentMicrophoneLifecycle(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const lifecycle: MicrophoneLifecycleState = {
      trackStops: 0,
      recorderStarts: 0,
      recorderStops: 0,
      objectUrlsCreated: [],
      objectUrlsRevoked: [],
      idbWrites: 0,
    }
    window.__microphoneLifecycle = lifecycle

    const mute = (node: Node) => {
      if (node instanceof HTMLMediaElement) {
        node.muted = true
        node.volume = 0
      }
    }
    document.querySelectorAll('audio, video').forEach(mute)
    new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        mute(node)
        if (node instanceof HTMLElement) node.querySelectorAll('audio, video').forEach(mute)
      }
    }).observe(document, { childList: true, subtree: true })

    const mediaDevices = navigator.mediaDevices
    const nativeGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices)
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        const stream = await nativeGetUserMedia(constraints)
        for (const track of stream.getTracks()) {
          const nativeStop = track.stop.bind(track)
          Object.defineProperty(track, 'stop', {
            configurable: true,
            value: () => {
              lifecycle.trackStops += 1
              nativeStop()
            },
          })
        }
        return stream
      },
    })

    if (typeof MediaRecorder !== 'undefined') {
      const nativeStart = MediaRecorder.prototype.start
      const nativeStop = MediaRecorder.prototype.stop
      Object.defineProperty(MediaRecorder.prototype, 'start', {
        configurable: true,
        value: function (this: MediaRecorder, timeslice?: number) {
          lifecycle.recorderStarts += 1
          return nativeStart.call(this, timeslice)
        },
      })
      Object.defineProperty(MediaRecorder.prototype, 'stop', {
        configurable: true,
        value: function (this: MediaRecorder) {
          lifecycle.recorderStops += 1
          return nativeStop.call(this)
        },
      })
    }

    const nativeCreateObjectURL = URL.createObjectURL.bind(URL)
    const nativeRevokeObjectURL = URL.revokeObjectURL.bind(URL)
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: (object: Blob | MediaSource) => {
        const url = nativeCreateObjectURL(object)
        lifecycle.objectUrlsCreated.push(url)
        return url
      },
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: (url: string) => {
        lifecycle.objectUrlsRevoked.push(url)
        nativeRevokeObjectURL(url)
      },
    })

    const storePrototype = IDBObjectStore.prototype as unknown as Record<string, unknown>
    for (const method of ['put', 'add', 'delete', 'clear'] as const) {
      const original = storePrototype[method] as (...args: unknown[]) => unknown
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          if (this.transaction.mode === 'readwrite') lifecycle.idbWrites += 1
          return original.apply(this, args)
        },
      })
    }
  })
}

async function registerAndOpenMicrophone(page: Page, label: string): Promise<void> {
  const credentials = newE2ECredentials(label)
  const code = await startRegistrationFromLanding(page, credentials)
  await completeVisibleRegistration(page, code)
  await page.goto('/microphone?origin=new')
  await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  await expect(page.locator('audio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
  await expect(page.getByText(/The browser is providing a live microphone track\./)).toBeVisible()
}

async function readLifecycle(page: Page): Promise<MicrophoneLifecycleState> {
  return page.evaluate(() => {
    if (!window.__microphoneLifecycle) throw new Error('Microphone lifecycle instrumentation is missing.')
    return {
      ...window.__microphoneLifecycle,
      objectUrlsCreated: [...window.__microphoneLifecycle.objectUrlsCreated],
      objectUrlsRevoked: [...window.__microphoneLifecycle.objectUrlsRevoked],
    }
  })
}

test('leaving during an active optional test cancels local capture and the next visit is clean', async ({ page }) => {
  await instrumentMicrophoneLifecycle(page)
  await registerAndOpenMicrophone(page, 'microphone-active-exit')
  const writesBeforeTest = (await readLifecycle(page)).idbWrites

  await page.getByRole('button', { name: 'Record test', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await expect.poll(async () => (await readLifecycle(page)).recorderStarts).toBe(1)
  await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()

  const exited = await readLifecycle(page)
  expect(exited.recorderStops).toBeGreaterThan(0)
  expect(exited.trackStops).toBeGreaterThan(0)
  expect(exited.objectUrlsCreated).toEqual([])
  expect(exited.objectUrlsRevoked).toEqual([])
  expect(exited.idbWrites).toBe(writesBeforeTest)

  await page.goto('/microphone?origin=new')
  await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  await expect(page.locator('audio')).toHaveCount(0)
  await expect(page.getByText('Your browser has not been asked for microphone access yet.')).toBeVisible()
})

test('a failed test can be retried, listened to locally, and its Blob is revoked on exit', async ({ page }) => {
  await instrumentMicrophoneLifecycle(page)
  await registerAndOpenMicrophone(page, 'microphone-failed-retry')
  const writesBeforeTest = (await readLifecycle(page)).idbWrites

  await page.evaluate(() => {
    const native = window.MediaRecorder
    window.__microphoneNativeRecorder = native
    window.MediaRecorder = class {
      static isTypeSupported(type: string) {
        return native.isTypeSupported(type)
      }

      constructor() {
        throw new DOMException('Synthetic local recorder failure.', 'NotSupportedError')
      }
    } as unknown as typeof MediaRecorder
  })
  await page.getByRole('button', { name: 'Record test', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The browser could not finish the local microphone test.')
  await expect(page.locator('audio')).toHaveCount(0)
  expect((await readLifecycle(page)).objectUrlsCreated).toEqual([])

  await page.evaluate(() => {
    if (!window.__microphoneNativeRecorder) throw new Error('Native fake-device recorder was not retained for the explicit retry.')
    window.MediaRecorder = window.__microphoneNativeRecorder
    delete window.__microphoneNativeRecorder
  })
  await page.getByRole('button', { name: 'Record test', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await page.waitForTimeout(1_200)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()

  const localAudio = page.getByLabel('Local test recording')
  await expect(localAudio).toBeVisible()
  await expect.poll(async () => (await readLifecycle(page)).objectUrlsCreated.length).toBe(1)
  await localAudio.evaluate(async (element) => {
    const audio = element as HTMLAudioElement
    audio.muted = true
    audio.volume = 0
    await audio.play()
  })
  await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0)

  const beforeExit = await readLifecycle(page)
  expect(beforeExit.idbWrites).toBe(writesBeforeTest)
  expect(beforeExit.objectUrlsCreated).toHaveLength(1)
  expect(beforeExit.recorderStarts).toBe(1)
  expect(beforeExit.recorderStops).toBe(1)

  await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  await expect.poll(async () => (await readLifecycle(page)).trackStops).toBeGreaterThan(0)
  const afterExit = await readLifecycle(page)
  expect(afterExit.objectUrlsRevoked).toEqual(beforeExit.objectUrlsCreated)
  expect(afterExit.idbWrites).toBe(writesBeforeTest)

  await page.goto('/microphone?origin=new')
  await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  await expect(page.locator('audio')).toHaveCount(0)
  await expect(page.getByText('Your browser has not been asked for microphone access yet.')).toBeVisible()
})

test('keyboard can play the local mic test and the input meter exposes numeric semantics', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await mkdir(microphoneProofDirectory, { recursive: true })
  await instrumentMicrophoneLifecycle(page)
  await registerAndOpenMicrophone(page, 'microphone-keyboard-listen')
  const writesBeforeTest = (await readLifecycle(page)).idbWrites

  const meter = page.getByRole('meter', { name: 'Microphone input level' })
  await expect(meter).toHaveAttribute('aria-valuemin', '0')
  await expect(meter).toHaveAttribute('aria-valuemax', '100')
  await expect(meter).toHaveAttribute('aria-valuenow', /^\d+$/)
  await expect(page.getByText('This local meter reports signal level only. It does not judge speech or readiness.')).toBeVisible()
  const meterValue = Number(await meter.getAttribute('aria-valuenow'))
  expect(Number.isInteger(meterValue)).toBe(true)
  expect(meterValue).toBeGreaterThanOrEqual(0)
  expect(meterValue).toBeLessThanOrEqual(100)
  const meterSemantics = await meter.evaluate((element) => ({
    role: element.getAttribute('role'),
    name: element.getAttribute('aria-label'),
    min: Number(element.getAttribute('aria-valuemin')),
    max: Number(element.getAttribute('aria-valuemax')),
    value: Number(element.getAttribute('aria-valuenow')),
    visibleMeaning: 'This local meter reports signal level only. It does not judge speech or readiness.',
  }))

  await page.getByRole('button', { name: 'Record test', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  await page.waitForTimeout(1_200)
  await page.getByRole('button', { name: 'Stop', exact: true }).click()

  const localAudio = page.getByLabel('Local test recording')
  await expect(localAudio).toBeVisible()
  await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentSrc.startsWith('blob:'))).toBe(true)
  await localAudio.evaluate((element) => {
    const audio = element as HTMLAudioElement
    audio.muted = true
    audio.volume = 0
  })

  const recordTestButton = page.getByRole('button', { name: 'Record test', exact: true })
  await recordTestButton.focus()
  await page.keyboard.press('Tab')
  await expect(localAudio).toBeFocused()
  await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).paused)).toBe(true)
  await page.keyboard.press('Space')
  await expect.poll(() => localAudio.evaluate((element) => !(element as HTMLAudioElement).paused)).toBe(true)
  await expect.poll(() => localAudio.evaluate((element) => (element as HTMLAudioElement).currentTime)).toBeGreaterThan(0.1)

  const playback = await localAudio.evaluate((element) => {
    const audio = element as HTMLAudioElement
    return {
      paused: audio.paused,
      currentTimeSeconds: audio.currentTime,
      durationSeconds: audio.duration,
      muted: audio.muted,
      volume: audio.volume,
      sourceProtocol: new URL(audio.currentSrc).protocol,
      focused: document.activeElement === audio,
    }
  })
  expect(playback.paused).toBe(false)
  expect(playback.currentTimeSeconds).toBeGreaterThan(0.1)
  expect(playback.durationSeconds).toBeGreaterThan(0)
  expect(playback.muted).toBe(true)
  expect(playback.volume).toBe(0)
  expect(playback.sourceProtocol).toBe('blob:')
  expect(playback.focused).toBe(true)

  const screenshotName = 'microphone-listen-keyboard-en-1440.png'
  const screenshot = await page.screenshot({
    path: resolve(microphoneProofDirectory, screenshotName),
    fullPage: true,
  })
  const screenshotSha256 = createHash('sha256').update(screenshot).digest('hex')
  await writeFile(
    resolve(microphoneProofDirectory, 'microphone-listen-keyboard.sha256'),
    `${screenshotSha256}  ${screenshotName}\n`,
    'utf8',
  )

  expect((await readLifecycle(page)).idbWrites).toBe(writesBeforeTest)
  await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  const afterExit = await readLifecycle(page)
  expect(afterExit.objectUrlsCreated).toHaveLength(1)
  expect(afterExit.objectUrlsRevoked).toEqual(afterExit.objectUrlsCreated)
  expect(afterExit.recorderStops).toBeGreaterThan(0)
  expect(afterExit.trackStops).toBeGreaterThan(0)
  expect(afterExit.idbWrites).toBe(writesBeforeTest)

  await page.goto('/microphone?origin=new')
  await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  await expect(page.locator('audio')).toHaveCount(0)

  await writeFile(
    resolve(microphoneProofDirectory, 'microphone-listen-keyboard-proof.json'),
    `${JSON.stringify(
      {
        test: 'keyboard can play the local mic test and the input meter exposes numeric semantics',
        environment: {
          os: process.platform,
          node: process.version,
          browser: 'Chromium',
          browserVersion: browser.version(),
          viewport: { width: 1440, height: 900 },
          serviceAdapter: 'mock',
          media: 'Chromium fake device and fake permission UI; browser audio muted; element muted and volume 0',
          physicalMicrophoneUsed: false,
        },
        meter: meterSemantics,
        playback,
        lifecycle: {
          indexedDbWritesBeforeTest: writesBeforeTest,
          indexedDbWritesAfterExit: afterExit.idbWrites,
          objectUrlsCreated: afterExit.objectUrlsCreated,
          objectUrlsRevoked: afterExit.objectUrlsRevoked,
          recorderStops: afterExit.recorderStops,
          trackStops: afterExit.trackStops,
          returnedVisitHasAudioElement: false,
        },
        screenshot: { file: screenshotName, sha256: screenshotSha256 },
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
})

test('the visible Record microphone entry returns to the same project screen', async ({ page }) => {
  await instrumentMicrophoneLifecycle(page)
  const credentials = newE2ECredentials('microphone-project-entry')
  const code = await startRegistrationFromLanding(page, credentials)
  await completeVisibleRegistration(page, code)
  await uploadKnownSourceThroughUi(page)
  await setMillisecondSelectionAndQuote(page)
  await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your microphone', exact: true })).toBeVisible()
  await continueThroughRecordingEntryGate(page)
  const recordUrl = page.url()

  await page.getByRole('button', { name: 'Microphone', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
  await expect(page.getByText(/The browser is providing a live microphone track\./)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Continue', exact: true }).click()

  await expect(page).toHaveURL(recordUrl)
  await expect(page.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
})
