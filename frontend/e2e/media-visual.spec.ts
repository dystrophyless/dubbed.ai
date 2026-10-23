import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import { setLocale } from './helpers/locale.js'
import {
  captureAndAcceptVisibleTurn,
  continueThroughRecordingEntryGate,
  completeVisibleRegistration,
  setMillisecondSelectionAndQuote,
  startRegistrationFromLanding,
  uploadKnownSourceThroughUi,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

const evidenceDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../_docs/evidence/frontend-implementation-2026-10-23/media-ui',
)
mkdirSync(evidenceDirectory, { recursive: true })

const measurements: Record<string, unknown> = {}
const screenshots: string[] = []
const overflowFindings: Array<Record<string, unknown>> = []
const failedRequests: Array<Record<string, unknown>> = []

declare global {
  interface Window {
    __mediaEvidenceWriteCount?: number
    __mediaEvidenceWriteEvents?: Array<{ storeName: string; method: string; recordKind?: string }>
    __mediaEvidenceNativeGetUserMedia?: (constraints?: MediaStreamConstraints) => Promise<MediaStream>
    __controlledResultHarness?: {
      publishGeneration2(): void
      failFirstDownload(): void
      snapshot(): {
        downloadCalls: Array<{ displayedGenerationId: string; operationId: string }>
        assemblyCalls: number
        creditCalls: string[]
        operationCalls: string[]
        otherServiceCalls: string[]
      }
    }
  }
}

async function measureSurface(page: Page, key: string): Promise<void> {
  const value = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>(
      '.microphone-check, .recording-screen, .result-screen',
    )
    if (!surface) throw new Error('Expected one active media feature surface.')
    const describe = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      const textRange = document.createRange()
      textRange.selectNodeContents(element)
      const textRect = textRange.getBoundingClientRect()
      return {
        label: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? element.tagName.toLowerCase(),
        tag: element.tagName.toLowerCase(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        client: { width: element.clientWidth, height: element.clientHeight },
        scroll: { width: element.scrollWidth, height: element.scrollHeight },
        textFits: textRect.width === 0 || (textRect.left >= rect.left - 1 && textRect.right <= rect.right + 1),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
      }
    }
    const heading = surface.querySelector<HTMLElement>('h1')
    const panel = surface.querySelector<HTMLElement>(
      '.microphone-check__panel, .recording-screen__panel, .result-screen__panel',
    )
    const controls = Array.from(surface.querySelectorAll<HTMLElement>('button, a, input, select, video, audio'))
    const surfaceRect = surface.getBoundingClientRect()
    const surfaceStyle = getComputedStyle(surface)
    const innerLeft = surfaceRect.left + Number.parseFloat(surfaceStyle.borderLeftWidth)
    const innerRight = surfaceRect.right - Number.parseFloat(surfaceStyle.borderRightWidth)
    const overflowingDescendants = Array.from(surface.querySelectorAll<HTMLElement>('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        const parent = element.parentElement
        const parentRect = parent?.getBoundingClientRect()
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: typeof element.className === 'string' ? element.className : '',
          text: element.textContent?.trim().slice(0, 100) ?? '',
          rect: { left: rect.left, right: rect.right, width: rect.width },
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          style: {
            width: style.width,
            boxSizing: style.boxSizing,
            marginInlineStart: style.marginInlineStart,
            marginInlineEnd: style.marginInlineEnd,
            paddingInlineStart: style.paddingInlineStart,
            paddingInlineEnd: style.paddingInlineEnd,
            borderInlineStartWidth: style.borderInlineStartWidth,
            borderInlineEndWidth: style.borderInlineEndWidth,
            overflowX: style.overflowX,
          },
          parent: parent && parentRect ? {
            tag: parent.tagName.toLowerCase(),
            className: typeof parent.className === 'string' ? parent.className : '',
            rect: { left: parentRect.left, right: parentRect.right, width: parentRect.width },
            clientWidth: parent.clientWidth,
            scrollWidth: parent.scrollWidth,
            style: {
              width: getComputedStyle(parent).width,
              boxSizing: getComputedStyle(parent).boxSizing,
              overflowX: getComputedStyle(parent).overflowX,
            },
          } : null,
        }
      })
      .filter((entry) => entry.rect.left < innerLeft - 0.5 || entry.rect.right > innerRight + 0.5 || entry.scrollWidth > entry.clientWidth + 1)
      .slice(0, 12)
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth,
        devicePixelRatio,
      },
      surface: describe(surface),
      surfaceBox: {
        boundingRect: { left: surfaceRect.left, right: surfaceRect.right, width: surfaceRect.width },
        clientWidth: surface.clientWidth,
        scrollWidth: surface.scrollWidth,
        innerLeft,
        innerRight,
        style: {
          boxSizing: surfaceStyle.boxSizing,
          paddingInlineStart: surfaceStyle.paddingInlineStart,
          paddingInlineEnd: surfaceStyle.paddingInlineEnd,
          borderInlineStartWidth: surfaceStyle.borderInlineStartWidth,
          borderInlineEndWidth: surfaceStyle.borderInlineEndWidth,
          overflowX: surfaceStyle.overflowX,
        },
      },
      appMain: (() => {
        const main = document.querySelector<HTMLElement>('.app-main')
        if (!main) return null
        const rect = main.getBoundingClientRect()
        const style = getComputedStyle(main)
        return {
          rect: { left: rect.left, right: rect.right, width: rect.width },
          clientWidth: main.clientWidth,
          scrollWidth: main.scrollWidth,
          paddingInlineStart: style.paddingInlineStart,
          paddingInlineEnd: style.paddingInlineEnd,
          boxSizing: style.boxSizing,
        }
      })(),
      overflowingDescendants,
      heading: heading ? describe(heading) : null,
      panel: panel ? describe(panel) : null,
      controls: controls.map(describe),
      rootScrollWidth: surface.scrollWidth,
      rootClientWidth: surface.clientWidth,
      fontLoaded: {
        mabryRegular: document.fonts.check('400 16px "Mabry Pro"'),
        mabryMediumDesktop: document.fonts.check('500 32px "Mabry Pro"'),
        mabryMediumPhone: document.fonts.check('500 24px "Mabry Pro"'),
      },
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  })
  measurements[key] = value
  if (value.viewport.documentScrollWidth > value.viewport.width + 1 || value.rootScrollWidth > value.rootClientWidth + 1) {
    overflowFindings.push({ key, ...value })
  }
}

async function capture(page: Page, name: string, fullPage = true): Promise<void> {
  const path = resolve(evidenceDirectory, name)
  await page.screenshot({ path, fullPage, animations: 'disabled' })
  screenshots.push(name)
}

async function readMutationCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__mediaEvidenceWriteCount ?? 0)
}

async function readMutationEvents(page: Page): Promise<Array<{ storeName: string; method: string; recordKind?: string }>> {
  return page.evaluate(() => [...(window.__mediaEvidenceWriteEvents ?? [])])
}

async function readRecordSource(page: Page): Promise<{
  srcAttribute: string | null
  currentSrc: string
  readyState: number
  networkState: number
  paused: boolean
}> {
  const sourceVideo = page.locator('.recording-screen__stage video')
  await expect(sourceVideo).toHaveCount(1)
  return sourceVideo.evaluate((element) => {
    const video = element as HTMLVideoElement
    return {
      srcAttribute: video.getAttribute('src'),
      currentSrc: video.currentSrc,
      readyState: video.readyState,
      networkState: video.networkState,
      paused: video.paused,
    }
  })
}

test('captures the actual local mock Record journey, native fake-mic UI, and controlled Result presentation states', async ({ page, baseURL }) => {
  test.setTimeout(300_000)
  page.setDefaultTimeout(30_000)
  await page.addInitScript(() => {
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

    window.__mediaEvidenceWriteCount = 0
    window.__mediaEvidenceWriteEvents = []
    const storePrototype = IDBObjectStore.prototype as unknown as Record<string, unknown>
    for (const method of ['put', 'add', 'delete', 'clear'] as const) {
      const original = storePrototype[method] as (...args: unknown[]) => unknown
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          if (this.transaction.mode === 'readwrite') {
            window.__mediaEvidenceWriteCount = (window.__mediaEvidenceWriteCount ?? 0) + 1
            const value = args[0]
            const recordKind = value && typeof value === 'object' && 'kind' in value && typeof value.kind === 'string'
              ? value.kind
              : undefined
            window.__mediaEvidenceWriteEvents?.push({
              storeName: this.name,
              method,
              ...(recordKind ? { recordKind } : {}),
            })
          }
          return original.apply(this, args)
        },
      })
    }
  })

  const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4176')
  let evidenceStage = 'before-registration'
  const failureSnapshots: Promise<void>[] = []
  page.on('requestfailed', (request) => {
    let frameUrl: string | null = null
    try { frameUrl = request.frame().url() } catch { /* the requesting frame may already be detached */ }
    const failure: Record<string, unknown> = {
      at: new Date().toISOString(),
      stage: evidenceStage,
      url: request.url(),
      failure: request.failure()?.errorText ?? null,
      resourceType: request.resourceType(),
      frameUrl,
    }
    failedRequests.push(failure)
    failureSnapshots.push(page.evaluate(() => ({
      href: location.href,
      media: Array.from(document.querySelectorAll<HTMLMediaElement>('audio, video')).map((element) => ({
        tag: element.localName,
        label: element.getAttribute('aria-label') ?? '',
        srcAttribute: element.getAttribute('src'),
        srcProperty: element.src,
        currentSrc: element.currentSrc,
        paused: element.paused,
        readyState: element.readyState,
        networkState: element.networkState,
        parentClass: typeof element.parentElement?.className === 'string' ? element.parentElement.className : '',
      })),
    })).then((snapshot) => { failure.pageSnapshot = snapshot }).catch((error: unknown) => {
      failure.snapshotError = error instanceof Error ? error.message : String(error)
    }))
  })
  try {
    const credentials = newE2ECredentials('media-visual')
    evidenceStage = 'registration-and-navigation-to-New-Dub'
    const code = await startRegistrationFromLanding(page, credentials)
    await completeVisibleRegistration(page, code)

    // The app's real MicrophoneScreen uses Chromium's fake input device. The browser output is muted.
    await page.setViewportSize({ width: 1440, height: 960 })
    await page.goto('/microphone?origin=new')
    await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
    await expect(page.locator('audio')).toHaveCount(0)
    await measureSurface(page, 'microphone.initial.en.1440')
    await capture(page, 'microphone-initial-en-1440.png')

    await page.evaluate(() => {
      const devices = navigator.mediaDevices
      window.__mediaEvidenceNativeGetUserMedia = devices.getUserMedia.bind(devices)
      Object.defineProperty(devices, 'getUserMedia', {
        configurable: true,
        writable: true,
        value: () => Promise.reject(new DOMException('Synthetic permission denial for UI evidence.', 'NotAllowedError')),
      })
    })
    await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Microphone access was denied.')
    await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
    await capture(page, 'microphone-denied-en-1440.png')

    await page.evaluate(() => {
      const native = window.__mediaEvidenceNativeGetUserMedia
      if (!native) throw new Error('The native fake-device microphone function was not retained for the synthetic denial retry.')
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        configurable: true,
        writable: true,
        value: native,
      })
      delete window.__mediaEvidenceNativeGetUserMedia
    })
    await page.getByRole('button', { name: 'Connect selected microphone', exact: true }).click()
    await expect(page.getByText(/The browser is providing a live microphone track\./)).toBeVisible()
    await expect(page.getByRole('meter', { name: 'Microphone input level' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeEnabled()

    const microphoneTestWritesBefore = await readMutationCount(page)
    await page.getByRole('button', { name: 'Record test', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
    await page.waitForTimeout(250)
    await page.getByRole('button', { name: 'Stop', exact: true }).click()
    const localAudio = page.getByLabel('Local test recording')
    await expect(localAudio).toBeVisible()
    await expect(page.getByRole('status').filter({ hasText: 'Recorded locally.' })).toBeVisible()
    const localAudioInfo = await localAudio.evaluate((element) => {
      const audio = element as HTMLAudioElement
      return { sourceScheme: new URL(audio.currentSrc).protocol, muted: audio.muted, volume: audio.volume }
    })
    expect(localAudioInfo).toEqual({ sourceScheme: 'blob:', muted: true, volume: 0 })
    const microphoneTestWritesAfter = await readMutationCount(page)
    expect(microphoneTestWritesAfter).toBe(microphoneTestWritesBefore)
    measurements.microphoneLocalTest = {
      ...localAudioInfo,
      indexedDbWrites: microphoneTestWritesAfter - microphoneTestWritesBefore,
      connection: 'explicit Chromium fake-device permission grant; no physical input claim',
      test: 'MediaRecorder fixture stopped by the test; page-local Blob playback element shown; Listen was not activated',
    }
    await measureSurface(page, 'microphone.localTest.en.1440')
    await capture(page, 'microphone-local-test-en-1440.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await setLocale(page, 'ru')
    await expect(page.getByRole('heading', { name: 'Проверка микрофона' })).toBeVisible()
    await measureSurface(page, 'microphone.ready.ru.390')
    await capture(page, 'microphone-ready-ru-390.png')
    for (const width of [767, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await measureSurface(page, `microphone.ready.ru.${width}`)
      await capture(page, `microphone-ready-ru-${width}.png`)
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    measurements.microphoneReducedMotion = await page.evaluate(() => ({
      matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
      screenAnimationDuration: getComputedStyle(document.querySelector('.microphone-check')!).animationDuration,
      screenTransitionDuration: getComputedStyle(document.querySelector('.microphone-check')!).transitionDuration,
    }))
    expect((measurements.microphoneReducedMotion as { matches: boolean }).matches).toBe(true)
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    await page.setViewportSize({ width: 1440, height: 960 })
    await setLocale(page, 'en')
    await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
    evidenceStage = 'New-Dub-local-source-preview'
    await uploadKnownSourceThroughUi(page)
    await setMillisecondSelectionAndQuote(page)
    evidenceStage = 'New-Dub-process-navigation-to-Record'
    await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
    await continueThroughRecordingEntryGate(page)
    await expect(page.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
    await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()

    await measureSurface(page, 'record.initial.en.1440')
    await capture(page, 'record-initial-en-1440.png')
    for (const width of [767, 768]) {
      await page.setViewportSize({ width, height: 900 })
      await measureSurface(page, `record.initial.en.${width}`)
      await capture(page, `record-initial-en-${width}.png`)
      if (width === 767) {
        const volume = page.getByRole('slider', { name: 'Original video volume' })
        const initialValue = Number(await volume.inputValue())
        const writesBeforeKeyboard = await readMutationCount(page)
        await volume.focus()
        await volume.press('ArrowRight')
        const keyboardValue = Number(await volume.inputValue())
        expect(keyboardValue).toBeCloseTo(initialValue + 0.01, 3)
        await volume.press('ArrowLeft')
        expect(Number(await volume.inputValue())).toBeCloseTo(initialValue, 3)
        const writesAfterKeyboard = await readMutationCount(page)
        expect(writesAfterKeyboard).toBe(writesBeforeKeyboard)
        measurements.recordVolumeKeyboard = {
          initialValue,
          keyboardValue,
          restoredValue: Number(await volume.inputValue()),
          indexedDbWrites: writesAfterKeyboard - writesBeforeKeyboard,
        }
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await expect.poll(() => page.locator('.recording-screen__stage video').evaluate((element) => (
      (element as HTMLVideoElement).readyState
    ))).toBeGreaterThan(0)
    const recordLocaleSourceBefore = await readRecordSource(page)
    const recordLocaleWritesBefore = await readMutationCount(page)
    const recordLocaleWriteEventsBefore = await readMutationEvents(page)
    const recordLocaleFailureStart = failedRequests.length
    evidenceStage = 'Record-locale-EN-to-RU-at-390'
    await setLocale(page, 'ru')
    await expect(page.getByRole('heading', { name: 'Запишите свою реплику', exact: true })).toBeVisible()
    await page.waitForTimeout(350)
    const recordLocaleSourceAfter = await readRecordSource(page)
    const recordLocaleWritesAfter = await readMutationCount(page)
    const recordLocaleWriteEventsAfter = await readMutationEvents(page)
    const localeWriteEvents = recordLocaleWriteEventsAfter.slice(recordLocaleWriteEventsBefore.length)
    const recordLocaleFailures = failedRequests.slice(recordLocaleFailureStart)
      .filter((failure) => failure.resourceType === 'media')
    const localeOperationKinds = localeWriteEvents
      .filter((event) => event.storeName === 'operations')
      .map((event) => event.recordKind ?? 'unclassified')
    const accessOperationKinds = new Set([
      'recording.acquire-access',
      'recording.release-access',
      'recording.renew-access',
      'recording.capture-fixed-window',
      'recording.persist-draft',
      'recording.accept-candidate',
      'result.assemble',
      'result.retry',
    ])
    measurements.recordLocalePreservation = {
      sourceBefore: recordLocaleSourceBefore,
      sourceAfter: recordLocaleSourceAfter,
      indexedDbWrites: recordLocaleWritesAfter - recordLocaleWritesBefore,
      indexedDbWriteEvents: localeWriteEvents,
      localeOperationKinds,
      forbiddenRecordingOrGenerationOperations: localeOperationKinds.filter((kind) => accessOperationKinds.has(kind)),
      recordingGrantStoreWrites: localeWriteEvents.filter((event) => event.storeName === 'recordingGrants'),
      mediaRequestFailures: recordLocaleFailures,
      interpretation: 'The locale preference operation is permitted; the browser journal is checked for recording access/capture/save/accept and result assembly/retry mutations.',
    }
    expect(recordLocaleSourceBefore.currentSrc).not.toBe('')
    expect(recordLocaleSourceAfter.currentSrc).toBe(recordLocaleSourceBefore.currentSrc)
    expect(recordLocaleSourceAfter.readyState).toBeGreaterThan(0)
    expect(localeOperationKinds).toEqual(['account.set-locale'])
    expect((measurements.recordLocalePreservation as { forbiddenRecordingOrGenerationOperations: string[] }).forbiddenRecordingOrGenerationOperations).toEqual([])
    expect((measurements.recordLocalePreservation as { recordingGrantStoreWrites: unknown[] }).recordingGrantStoreWrites).toEqual([])
    expect(recordLocaleFailures).toEqual([])
    await measureSurface(page, 'record.initial.ru.390')
    await capture(page, 'record-initial-ru-390.png')
    await page.setViewportSize({ width: 1440, height: 960 })
    await setLocale(page, 'en')

    evidenceStage = 'Record-line-fake-microphone-capture'
    await page.getByRole('button', { name: 'Record line', exact: true }).click()
    const candidateNotice = page.getByText('Recorded audio frames were decoded. Next line saves this take and continues.', { exact: true })
    await expect(candidateNotice).toBeVisible({ timeout: 30_000 })
    evidenceStage = 'Record-candidate-preview-ready'
    await measureSurface(page, 'record.candidate.en.1440')
    await capture(page, 'record-candidate-en-1440.png')
    await page.waitForTimeout(350)
    const writesBeforeGuard = await readMutationCount(page)

    const homeLink = page.getByRole('link', { name: /Dubbed.*Home/i })
    evidenceStage = 'Record-candidate-open-leave-dialog'
    await homeLink.click()
    const leaveDialog = page.getByRole('dialog')
    await expect(leaveDialog).toBeVisible()
    const stayButton = page.getByRole('button', { name: 'Stay here', exact: true })
    await expect(stayButton).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    measurements.recordLeaveDialogPreviousTabTarget = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement | null
      return {
        text: active?.textContent?.trim() ?? null,
        insideDialog: Boolean(active?.closest('[role="dialog"]')),
        focusVisible: active?.matches(':focus-visible') ?? false,
      }
    })
    expect((measurements.recordLeaveDialogPreviousTabTarget as { insideDialog: boolean }).insideDialog).toBe(true)
    await page.keyboard.press('Tab')
    await expect(stayButton).toBeFocused()
    measurements.recordLeaveDialogFocus = await stayButton.evaluate((element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return {
        focusTarget: element.textContent?.trim(),
        focusVisible: element.matches(':focus-visible'),
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        outlineColor: style.outlineColor,
        outlineOffset: style.outlineOffset,
        boxShadow: style.boxShadow,
        target: { width: rect.width, height: rect.height },
      }
    })
    await measureSurface(page, 'record.leaveDialog.en.1440')
    await capture(page, 'record-leave-dialog-en-1440.png')
    evidenceStage = 'Record-candidate-leave-dialog-Escape'
    await page.keyboard.press('Escape')
    await expect(leaveDialog).toBeHidden()
    await expect(homeLink).toBeFocused()
    await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()
    await expect(candidateNotice).toBeVisible()
    const writesAfterEscape = await readMutationCount(page)
    expect(writesAfterEscape).toBe(writesBeforeGuard)

    evidenceStage = 'Record-candidate-reopen-leave-dialog'
    await homeLink.click()
    await expect(leaveDialog).toBeVisible()
    await expect(stayButton).toBeFocused()
    evidenceStage = 'Record-candidate-leave-dialog-Stay'
    await stayButton.click()
    await expect(leaveDialog).toBeHidden()
    await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
    await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()
    await expect(candidateNotice).toBeVisible()
    const writesAfterStay = await readMutationCount(page)
    expect(writesAfterStay).toBe(writesBeforeGuard)
    measurements.recordLeaveGuardMutationCount = { before: writesBeforeGuard, afterEscape: writesAfterEscape, afterStay: writesAfterStay }

    evidenceStage = 'Record-accept-first-candidate-via-Next-line'
    await page.getByRole('button', { name: 'Next line', exact: true }).click()
    await expect(page.getByText('Accepted takes: 1 / 3', { exact: true })).toBeVisible()
    evidenceStage = 'Record-line-2-capture-and-accept'
    await captureAndAcceptVisibleTurn(page)
    evidenceStage = 'Record-line-3-capture-and-accept'
    await captureAndAcceptVisibleTurn(page)
    await expect(page).toHaveURL(/\/projects\/[^/]+\/result$/)
    evidenceStage = 'actual-local-mock-Result-screen'
    await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible()
    await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Synthetic fixture result; not rendered from accepted takes or a custom upload.', { exact: true })).toBeVisible()
    await measureSurface(page, 'result.actualMock.normal.en.1440')
    await capture(page, 'result-normal-local-mock-en-1440.png')

    await page.setViewportSize({ width: 390, height: 844 })
    await setLocale(page, 'ru')
    evidenceStage = 'actual-local-mock-Result-screen-Russian-mobile'
    await measureSurface(page, 'result.actualMock.normal.ru.390')
    await capture(page, 'result-normal-local-mock-ru-390.png')

    // Controlled ResultScreen facade is a separate visual fixture, not a backend/render journey.
    await page.setViewportSize({ width: 1440, height: 960 })
    evidenceStage = 'controlled-Result-fixture-screen'
    await page.goto('/e2e/harness/result.html')
    await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible()
    await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible()
    await measureSurface(page, 'result.controlled.normal.en.1440')
    await capture(page, 'result-controlled-generation1-normal-en-1440.png')

    const controlledVideo = page.getByLabel('Finished dubbed video')
    await controlledVideo.evaluate(async (element) => {
      const video = element as HTMLVideoElement
      video.muted = true
      video.volume = 0
      await video.play()
    })
    await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.2)
    await page.evaluate(() => window.__controlledResultHarness?.failFirstDownload())
    await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
    await expect(page.getByText(/download request for version 1 failed/i)).toBeVisible()
    await measureSurface(page, 'result.controlled.downloadError.en.1440')
    await capture(page, 'result-controlled-download-error-en-1440.png')

    const oldSource = await controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentSrc)
    const oldTime = await controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)
    await page.evaluate(() => window.__controlledResultHarness?.publishGeneration2())
    await expect(page.getByText('New version ready', { exact: true }).first()).toBeVisible()
    await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentSrc)).toBe(oldSource)
    await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(oldTime)
    await expect(page.getByRole('button', { name: /Retry download version 1/i })).toBeVisible()
    await measureSurface(page, 'result.controlled.oldPlayingNewReady.en.1440')
    await capture(page, 'result-controlled-old-playing-new-ready-en-1440.png')

    await page.getByRole('button', { name: /Watch new/i }).click()
    await expect(page.getByText('Displayed generation: 2', { exact: true })).toBeVisible()
    await expect.poll(() => controlledVideo.evaluate((element) => ({
      paused: (element as HTMLVideoElement).paused,
      currentTime: (element as HTMLVideoElement).currentTime,
      src: (element as HTMLVideoElement).currentSrc,
    }))).toMatchObject({ paused: true, currentTime: 0 })
    await measureSurface(page, 'result.controlled.watchNewPaused.en.1440')
    await capture(page, 'result-controlled-watch-new-paused-en-1440.png')
    measurements.controlledResultJournal = await page.evaluate(() => window.__controlledResultHarness?.snapshot() ?? null)
    expect(overflowFindings, 'media surfaces must not overflow their measured viewport').toEqual([])
  } finally {
    await Promise.allSettled(failureSnapshots)
    writeFileSync(resolve(evidenceDirectory, 'media-screen-metrics.json'), JSON.stringify({
      capturedAtUtc: new Date().toISOString(),
      baseURL: baseURL ?? 'http://127.0.0.1:4176',
      browser: 'Playwright Chromium, local Vite mock adapter, --mute-audio and fake media flags from the base config',
      fixtureScope: 'local deterministic UI; fake Chromium microphone input and explicit controlled Result facade only',
      measurements,
      screenshots,
      overflowFindings,
      requestFailureSnapshotNote: 'Failure snapshots capture current route and media element sources when Chromium reports a failed request; stage is the last explicitly marked action in this test.',
      diagnostics: {
        pageErrors: diagnostics.pageErrors,
        consoleErrors: diagnostics.consoleErrors,
        externalRequests: diagnostics.externalRequests,
        backendRequests: diagnostics.backendRequests,
        failedRequests,
      },
    }, null, 2) + '\n')
  }
  diagnostics.assertClean()
})
