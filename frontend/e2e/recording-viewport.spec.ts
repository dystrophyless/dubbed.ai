import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import {
  continueThroughRecordingEntryGate,
  completeVisibleRegistration,
  setMillisecondSelectionAndQuote,
  startRegistrationFromLanding,
  uploadKnownSourceThroughUi,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

const evidenceDirectory = resolve(
  process.cwd(),
  '../_docs/evidence/frontend-implementation-2026-10-23/record-redesign',
)
const playbackIconEvidenceDirectory = resolve(
  process.cwd(),
  '../_docs/evidence/frontend-implementation-2026-10-23/mic-icon-final-proof',
)

async function capturePlaybackGlyph(page: Page, testInfo: TestInfo, name: 'Play' | 'Pause') {
  const button = page.getByRole('button', { name, exact: true })
  const observation = await button.evaluate((element) => {
    const svg = element.querySelector('svg')
    if (!svg) throw new Error('Recording transport button is missing its Lucide SVG')
    const bounds = svg.getBoundingClientRect()
    const svgStyle = window.getComputedStyle(svg)
    const buttonStyle = window.getComputedStyle(element)
    return {
      accessibleName: element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
      enabled: !(element as HTMLButtonElement).disabled,
      focused: document.activeElement === element,
      buttonColor: buttonStyle.color,
      icon: {
        viewBox: svg.getAttribute('viewBox'),
        fillAttribute: svg.getAttribute('fill'),
        strokeAttribute: svg.getAttribute('stroke'),
        strokeWidthAttribute: svg.getAttribute('stroke-width'),
        lineCapAttribute: svg.getAttribute('stroke-linecap'),
        lineJoinAttribute: svg.getAttribute('stroke-linejoin'),
        ariaHidden: svg.getAttribute('aria-hidden'),
        focusable: svg.getAttribute('focusable'),
        computedFill: svgStyle.fill,
        computedStroke: svgStyle.stroke,
        computedStrokeWidth: svgStyle.strokeWidth,
        computedLineCap: svgStyle.strokeLinecap,
        computedLineJoin: svgStyle.strokeLinejoin,
        width: Math.round(bounds.width * 100) / 100,
        height: Math.round(bounds.height * 100) / 100,
      },
    }
  })

  expect(observation.accessibleName).toBe(name)
  expect(observation.enabled).toBe(true)
  expect(observation.focused).toBe(true)
  expect(observation.icon.viewBox).toBe('0 0 24 24')
  expect(observation.icon.fillAttribute).toBe('none')
  expect(observation.icon.strokeAttribute).toBe('currentColor')
  expect(observation.icon.strokeWidthAttribute).toBe('1.1')
  expect(observation.icon.lineCapAttribute).toBe('round')
  expect(observation.icon.lineJoinAttribute).toBe('round')
  expect(observation.icon.ariaHidden).toBe('true')
  expect(observation.icon.focusable).toBe('false')
  expect(observation.icon.computedFill).toBe('none')
  expect(observation.icon.computedStroke).toBe(observation.buttonColor)
  expect(Number.parseFloat(observation.icon.computedStrokeWidth)).toBeCloseTo(1.1)
  expect(observation.icon.computedLineCap).toBe('round')
  expect(observation.icon.computedLineJoin).toBe('round')
  expect(observation.icon.width).toBeGreaterThan(0)
  expect(observation.icon.height).toBeGreaterThan(0)

  const screenshotName = `record-transport-${name.toLowerCase()}-en-1440.png`
  const body = await page.screenshot({ fullPage: false })
  await mkdir(playbackIconEvidenceDirectory, { recursive: true })
  await writeFile(resolve(playbackIconEvidenceDirectory, screenshotName), body)
  await testInfo.attach(screenshotName, { body, contentType: 'image/png' })
  return observation
}

async function saveScreenshot(page: Page, testInfo: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: false })
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(resolve(evidenceDirectory, name), body)
  await testInfo.attach(name, { body, contentType: 'image/png' })
}

async function sha256RelativeFile(path: string) {
  return createHash('sha256').update(await readFile(resolve(process.cwd(), path))).digest('hex').toUpperCase()
}

async function inspectRecordingViewport(page: Page) {
  return page.locator('.recording-screen').evaluate((root) => {
    const rectOf = (selector: string) => {
      const element = root.querySelector<HTMLElement>(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        x: Math.round(rect.x * 100) / 100,
        y: Math.round(rect.y * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
      }
    }
    const controls = [...root.querySelectorAll<HTMLElement>(
      '.recording-transport__mode-option, .recording-transport__play, .recording-transport__actions button, .recording-transport__seek',
    )].map((element) => {
      const rect = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      const label = element.getAttribute('aria-label')
        ?? element.textContent?.trim().replace(/\s+/g, ' ')
        ?? ''
      return {
        label,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        left: Math.round(rect.left * 100) / 100,
        right: Math.round(rect.right * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        textFits: text.width === 0 || (text.left >= rect.left - 1 && text.right <= rect.right + 1),
      }
    })
    const note = root.querySelector<HTMLElement>('.recording-transport__recording-note')
    const noteRect = note?.getBoundingClientRect()
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollY: Math.round(window.scrollY * 100) / 100,
      documentWidth: document.documentElement.scrollWidth,
      modeLabels: [...root.querySelectorAll<HTMLElement>('.recording-transport__mode-option')]
        .map((element) => element.textContent?.trim() ?? ''),
      stage: rectOf('.recording-screen__stage'),
      dialogue: rectOf('.recording-screen__line-header'),
      timeline: rectOf('.recording-transport__timeline'),
      panel: rectOf('.recording-transport__controls'),
      panelNoteHeight: noteRect ? Math.round(noteRect.height * 100) / 100 : 0,
      controls,
    }
  })
}

async function readMediaState(page: Page) {
  return page.locator('.recording-screen__stage').evaluate((stage) => {
    const video = stage.querySelector<HTMLVideoElement>('video')
    const audio = stage.querySelector<HTMLAudioElement>('audio')
    return {
      videoTime: video?.currentTime ?? 0,
      videoPaused: video?.paused ?? true,
      videoMuted: video?.muted ?? true,
      videoVolume: video?.volume ?? 0,
      audioTime: audio?.currentTime ?? 0,
      audioPaused: audio?.paused ?? true,
      audioVolume: audio?.volume ?? 0,
      audioReadyState: audio?.readyState ?? 0,
      audioDuration: audio?.duration ?? 0,
      audioSource: audio?.getAttribute('src') ?? '',
      audioHidden: audio?.hidden ?? true,
    }
  })
}

async function inspectTransportPanel(page: Page) {
  return page.locator('.recording-transport__controls').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return {
      top: Math.round(rect.top * 100) / 100,
      bottom: Math.round(rect.bottom * 100) / 100,
      height: Math.round(rect.height * 100) / 100,
      position: getComputedStyle(element).position,
      viewportHeight: window.innerHeight,
      scrollY: Math.round(window.scrollY * 100) / 100,
    }
  })
}

test('recording transport stays in normal desktop flow and clears the RU phone stage', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(180_000)
  page.setDefaultTimeout(30_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')

  const credentials = newE2ECredentials('recording-viewport')
  const code = await startRegistrationFromLanding(page, credentials)
  await completeVisibleRegistration(page, code)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  await uploadKnownSourceThroughUi(page)
  await setMillisecondSelectionAndQuote(page)
  await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Check your microphone', exact: true })).toBeVisible()
  await continueThroughRecordingEntryGate(page)
  await expect(page.locator('.recording-transport__timeline')).toBeVisible()
  await expect(page.locator('.recording-transport__controls')).toBeVisible()
  await expect(page.locator('.recording-transport__recording-note')).toBeVisible()

  await page.evaluate(() => window.scrollTo(0, 0))
  const desktop = await inspectRecordingViewport(page)
  await saveScreenshot(page, testInfo, 'recording-en-1440x900.png')

  await page.setViewportSize({ width: 1440, height: 700 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const shortDesktop = await inspectRecordingViewport(page)
  await saveScreenshot(page, testInfo, 'recording-en-1440x700.png')

  await page.evaluate(() => localStorage.setItem('dubbed.locale', 'ru'))
  await page.reload()
  await continueThroughRecordingEntryGate(page)
  await expect(page.locator('.recording-transport__controls')).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await expect(page.locator('.recording-transport__recording-note')).toBeVisible()
  const phone = await inspectRecordingViewport(page)
  await saveScreenshot(page, testInfo, 'recording-ru-390x844.png')

  await page.evaluate(() => localStorage.setItem('dubbed.locale', 'en'))
  await page.reload()
  await continueThroughRecordingEntryGate(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  const captureAction = page.locator('.recording-transport__actions button').first()
  await expect(captureAction).toBeEnabled()
  await captureAction.click()
  await expect(page.locator('.recording-screen__capture-status progress')).toBeVisible({ timeout: 5_000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const capturing = await inspectRecordingViewport(page)
  await saveScreenshot(page, testInfo, 'recording-en-capturing-1440x900.png')
  await expect(page.locator('.recording-screen__take')).toBeVisible({ timeout: 20_000 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const candidate = await inspectRecordingViewport(page)
  await saveScreenshot(page, testInfo, 'recording-en-candidate-1440x900.png')

  const timing = await page.locator('.recording-screen__timing').innerText()
  const sourceWindow = timing.match(/(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)\s*s/)
  expect(sourceWindow, 'visible fixed recording window').not.toBeNull()
  const sourceWindowStart = Number(sourceWindow?.[1])
  const sourceWindowEnd = Number(sourceWindow?.[2])
  const sourceMode = page.getByRole('button', { name: 'Original', exact: true })
  const recordingMode = page.getByRole('button', { name: 'My recording', exact: true })
  const playButton = page.getByRole('button', { name: 'Play', exact: true })
  const pauseButton = page.getByRole('button', { name: 'Pause', exact: true })
  const seek = page.locator('.recording-transport__seek')
  const audio = page.locator('.recording-screen__stage audio')

  await expect(recordingMode).toBeEnabled()
  await recordingMode.click()
  await expect(recordingMode).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => Math.abs((await readMediaState(page)).videoTime - sourceWindowStart)).toBeLessThan(0.06)
  await expect.poll(async () => audio.evaluate((element) => (element as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(1)
  const recordingSource = await audio.getAttribute('src')
  expect(recordingSource).toMatch(/^blob:/)
  expect(await audio.evaluate((element) => (element as HTMLAudioElement).hidden)).toBe(true)
  const recordingWaveform = await page.locator('.recording-transport__bar').evaluateAll((bars) =>
    bars.map((bar) => Number.parseFloat((bar as HTMLElement).style.height)),
  )
  expect(recordingWaveform.length).toBeGreaterThan(0)
  expect(await page.locator('.recording-transport__waveform-note').count()).toBe(0)

  await sourceMode.click()
  await expect(sourceMode).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => {
    const media = await readMediaState(page)
    return Math.abs(media.videoTime - sourceWindowStart) < 0.06 && media.videoPaused && media.audioPaused
  }).toBe(true)
  const pausedSourceSwitch = await readMediaState(page)

  await playButton.click()
  await expect.poll(async () => (await readMediaState(page)).videoTime > sourceWindowStart + 0.08).toBe(true)
  await pauseButton.click()
  await expect.poll(async () => {
    const media = await readMediaState(page)
    return media.videoPaused && media.audioPaused
  }).toBe(true)
  const sourceBeforeScrub = await readMediaState(page)
  await seek.focus()
  await seek.press('ArrowRight')
  await expect.poll(async () => (await readMediaState(page)).videoTime > sourceBeforeScrub.videoTime + 0.05).toBe(true)
  const sourceAfterScrub = await readMediaState(page)
  expect(sourceAfterScrub.videoTime).toBeLessThan(sourceWindowEnd)

  await recordingMode.click()
  await expect.poll(async () => {
    const media = await readMediaState(page)
    return Math.abs(media.videoTime - sourceWindowStart) < 0.06
      && Math.abs(media.audioTime) < 0.06
      && media.videoPaused
      && media.audioPaused
  }).toBe(true)
  const pausedRecordingSwitch = await readMediaState(page)

  await playButton.focus()
  await expect(playButton).toBeFocused()
  const playGlyph = await capturePlaybackGlyph(page, testInfo, 'Play')
  await page.keyboard.press('Space')
  await expect.poll(async () => {
    const media = await readMediaState(page)
    return !media.videoPaused
      && !media.audioPaused
      && Math.abs((media.videoTime - sourceWindowStart) - media.audioTime) < 0.15
  }).toBe(true)
  await expect(pauseButton).toBeFocused()
  const pauseGlyph = await capturePlaybackGlyph(page, testInfo, 'Pause')
  const alignedRecordingPlayback = await readMediaState(page)
  await writeFile(
    resolve(playbackIconEvidenceDirectory, 'record-transport-svg-observations.json'),
    `${JSON.stringify({
      date: '2026-10-24',
      boundary: 'Current RecordingScreen, mock app services, synthetic local recording; browser playback only.',
      viewport: { width: 1440, height: 900 },
      states: { play: playGlyph, pause: pauseGlyph },
    }, null, 2)}\n`,
  )
  await sourceMode.click()
  await expect.poll(async () => {
    const media = await readMediaState(page)
    return !media.videoPaused
      && media.audioPaused
      && media.videoTime >= sourceWindowStart
      && media.videoTime <= sourceWindowEnd
  }).toBe(true)
  const playingSourceSwitch = await readMediaState(page)
  await pauseButton.click()
  await expect.poll(async () => (await readMediaState(page)).videoPaused).toBe(true)

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.locator('.recording-transport__actions button').first().click()
  await expect(page.locator('.recording-screen__capture-status progress')).toBeVisible({ timeout: 5_000 })
  await saveScreenshot(page, testInfo, 'recording-phone-capture-start-frame-390x844.png')
  const captureControls = await page.evaluate(() => ({
    active: Boolean(document.querySelector('.recording-screen__capture-status progress')),
    disabled: [...document.querySelectorAll<HTMLElement>(
      '.recording-transport__mode-option, .recording-transport__play, .recording-transport__seek, .recording-transport__actions button',
    )].map((control) => (control as HTMLButtonElement | HTMLInputElement).disabled),
    sourceVolumeEnabled: !(document.querySelector<HTMLInputElement>('.recording-screen__volume input')?.disabled ?? true),
  }))
  expect(captureControls.active).toBe(true)
  expect(captureControls.disabled.length).toBeGreaterThan(0)
  expect(captureControls.disabled.every(Boolean)).toBe(true)
  expect(captureControls.sourceVolumeEnabled).toBe(true)
  const initialPhoneCapturePanel = await inspectTransportPanel(page)
  const volume = page.locator('.recording-screen__volume input')
  await expect(volume).toBeEnabled()
  await expect(page.locator('.recording-screen__capture-status progress')).toBeVisible()
  // Reach the only enabled transport control with real keyboard traversal while capture is active.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  let volumeReachedByTab = false
  for (let attempt = 0; attempt < 24; attempt += 1) {
    await page.keyboard.press('Tab')
    volumeReachedByTab = await volume.evaluate((element) => document.activeElement === element)
    if (volumeReachedByTab) break
  }
  expect(volumeReachedByTab, 'native Tab traversal reaches reference volume during capture').toBe(true)
  const volumeBefore = Number(await volume.evaluate((element) => (element as HTMLInputElement).value))
  const audioVolumeBefore = (await readMediaState(page)).audioVolume
  const focusClearanceReached = await page.evaluate(async () => {
    const targetIsClear = () => {
      const input = document.querySelector<HTMLInputElement>('.recording-screen__volume input')
      const panel = document.querySelector<HTMLElement>('.recording-transport__controls')
      return Boolean(input && panel && input.getBoundingClientRect().bottom <= panel.getBoundingClientRect().top)
    }
    for (let frame = 0; frame < 18; frame += 1) {
      if (targetIsClear()) return true
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    return targetIsClear()
  })
  const focusGeometry = await volume.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const panel = document.querySelector<HTMLElement>('.recording-transport__controls')
    const panelRect = panel?.getBoundingClientRect()
    const scrollingElement = document.scrollingElement
    const appMain = document.querySelector<HTMLElement>('.app-main')
    return {
      volume: {
        top: Math.round(rect.top * 100) / 100,
        bottom: Math.round(rect.bottom * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        scrollY: Math.round(window.scrollY * 100) / 100,
        documentScrollTop: Math.round((scrollingElement?.scrollTop ?? 0) * 100) / 100,
        appMainScrollTop: Math.round((appMain?.scrollTop ?? 0) * 100) / 100,
        documentScrollHeight: scrollingElement?.scrollHeight ?? 0,
        documentScrollClientHeight: scrollingElement?.clientHeight ?? 0,
        documentMaximumScrollTop: Math.max(0, (scrollingElement?.scrollHeight ?? 0) - (scrollingElement?.clientHeight ?? 0)),
        appMainScrollHeight: appMain?.scrollHeight ?? 0,
        documentPaddingBottom: getComputedStyle(document.documentElement).scrollPaddingBottom,
        documentScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        bodyPaddingBottom: getComputedStyle(document.body).scrollPaddingBottom,
        appMainPaddingBottom: appMain ? getComputedStyle(appMain).scrollPaddingBottom : '',
        inputScrollMarginBottom: getComputedStyle(element).scrollMarginBottom,
        focusedByNativeTab: document.activeElement === element,
      },
      panel: {
        top: Math.round((panelRect?.top ?? 0) * 100) / 100,
        bottom: Math.round((panelRect?.bottom ?? 0) * 100) / 100,
        height: Math.round((panelRect?.height ?? 0) * 100) / 100,
        position: panel ? getComputedStyle(panel).position : 'missing',
        viewportHeight: window.innerHeight,
        scrollY: Math.round(window.scrollY * 100) / 100,
      },
      captureActive: Boolean(document.querySelector('.recording-screen__capture-status progress')),
    }
  })
  const volumeInputMetrics = focusGeometry.volume
  const phonePanelMetrics = focusGeometry.panel
  const focusAttempt = {
    focusMethod: 'native Tab traversal from document body after blurring the disabled capture trigger',
    focusedByNativeTab: volumeReachedByTab,
    focusClearanceReached,
    captureActive: focusGeometry.captureActive,
    viewport: { width: 390, height: 844 },
    volumeInputMetrics,
    phonePanelMetrics,
    sourceHashes: {
      recordingScreen: await sha256RelativeFile('src/features/recording/RecordingScreen.tsx'),
      recordingStyles: await sha256RelativeFile('src/features/recording/RecordingScreen.css'),
      viewportSpec: await sha256RelativeFile('e2e/recording-viewport.spec.ts'),
    },
  }
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(resolve(evidenceDirectory, 'recording-phone-focus-native-tab-attempt.json'), JSON.stringify(focusAttempt, null, 2))
  console.log(`RECORDING_PHONE_FOCUS_GEOMETRY ${JSON.stringify(focusAttempt)}`)
  expect(volumeInputMetrics.height).toBeGreaterThanOrEqual(48)
  expect(volumeInputMetrics.top).toBeGreaterThanOrEqual(0)
  expect(volumeInputMetrics.focusedByNativeTab).toBe(true)
  expect(focusClearanceReached).toBe(true)
  expect(focusGeometry.captureActive).toBe(true)
  expect(volumeInputMetrics.documentPaddingBottom).toBe('240px')
  expect(initialPhoneCapturePanel.position).toBe('fixed')
  expect(initialPhoneCapturePanel.bottom).toBeGreaterThanOrEqual(initialPhoneCapturePanel.viewportHeight - 1)
  expect(initialPhoneCapturePanel.bottom).toBeLessThanOrEqual(initialPhoneCapturePanel.viewportHeight + 1)
  expect(phonePanelMetrics.position).toBe('fixed')
  expect(Math.abs(phonePanelMetrics.top - initialPhoneCapturePanel.top)).toBeLessThanOrEqual(1)
  expect(volumeInputMetrics.bottom).toBeLessThanOrEqual(phonePanelMetrics.top)
  await volume.press(volumeBefore >= 0.99 ? 'ArrowLeft' : 'ArrowRight')
  const volumeChangeSnapshot = await page.evaluate(() => {
    const volumeInput = document.querySelector<HTMLInputElement>('.recording-screen__volume input')
    const video = document.querySelector<HTMLVideoElement>('.recording-screen__stage video')
    const audio = document.querySelector<HTMLAudioElement>('.recording-screen__stage audio')
    return {
      captureActive: Boolean(document.querySelector('.recording-screen__capture-status progress')),
      focusedByNativeTab: document.activeElement === volumeInput,
      value: Number(volumeInput?.value ?? Number.NaN),
      videoVolume: video?.volume ?? Number.NaN,
      audioVolume: audio?.volume ?? Number.NaN,
    }
  })
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(resolve(evidenceDirectory, 'recording-phone-volume-adjustment-snapshot.json'), JSON.stringify({
    captureActive: volumeChangeSnapshot.captureActive,
    focusedByNativeTab: volumeChangeSnapshot.focusedByNativeTab,
    volumeBefore,
    volumeAfter: volumeChangeSnapshot.value,
    videoVolumeAfter: volumeChangeSnapshot.videoVolume,
    audioVolumeBefore,
    audioVolumeAfter: volumeChangeSnapshot.audioVolume,
    sourceHashes: focusAttempt.sourceHashes,
  }, null, 2))
  await saveScreenshot(page, testInfo, 'recording-phone-volume-adjustment-frame-390x844.png')
  expect(volumeChangeSnapshot.captureActive).toBe(true)
  expect(volumeChangeSnapshot.focusedByNativeTab).toBe(true)
  const volumeAfter = volumeChangeSnapshot.value
  const audioVolumeAfter = volumeChangeSnapshot.audioVolume
  expect(volumeAfter).not.toBe(volumeBefore)
  expect(volumeChangeSnapshot.videoVolume).toBeCloseTo(volumeAfter, 2)
  expect(audioVolumeAfter).toBeCloseTo(audioVolumeBefore, 3)
  const phoneCaptureVolume = await inspectRecordingViewport(page)

  await expect(page.locator('.recording-screen__take')).toBeVisible({ timeout: 20_000 })
  const finalContent = page.locator('.recording-screen__process-again')
  await finalContent.evaluate((element) => element.scrollIntoView({ block: 'end', behavior: 'auto' }))
  const finalContentClearanceReached = await page.evaluate(async () => {
    const contentIsClear = () => {
      const content = document.querySelector<HTMLElement>('.recording-screen__process-again')
      const panel = document.querySelector<HTMLElement>('.recording-transport__controls')
      return Boolean(content && panel && content.getBoundingClientRect().bottom <= panel.getBoundingClientRect().top)
    }
    for (let frame = 0; frame < 48; frame += 1) {
      if (contentIsClear()) return true
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
    return contentIsClear()
  })
  const finalContentGeometry = await page.locator('.recording-screen').evaluate((root) => {
    const content = root.querySelector<HTMLElement>('.recording-screen__process-again')
    const panel = root.querySelector<HTMLElement>('.recording-transport__controls')
    const contentRect = content?.getBoundingClientRect()
    const panelRect = panel?.getBoundingClientRect()
    return {
      content: {
        top: Math.round((contentRect?.top ?? 0) * 100) / 100,
        bottom: Math.round((contentRect?.bottom ?? 0) * 100) / 100,
      },
      panel: {
        top: Math.round((panelRect?.top ?? 0) * 100) / 100,
        bottom: Math.round((panelRect?.bottom ?? 0) * 100) / 100,
        height: Math.round((panelRect?.height ?? 0) * 100) / 100,
        position: panel ? getComputedStyle(panel).position : 'missing',
        viewportHeight: window.innerHeight,
      },
      scrollY: Math.round(window.scrollY * 100) / 100,
      documentScrollHeight: document.scrollingElement?.scrollHeight ?? 0,
      documentMaximumScrollTop: Math.max(0,
        (document.scrollingElement?.scrollHeight ?? 0) - (document.scrollingElement?.clientHeight ?? 0)),
      documentScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    }
  })
  const finalContentMetrics = finalContentGeometry.content
  const finalContentPanel = finalContentGeometry.panel
  await writeFile(resolve(evidenceDirectory, 'recording-phone-final-content-clearance-attempt.json'), JSON.stringify({
    method: 'scrollIntoView block:end auto; poll animation frames for global smooth scroll to settle',
    clearanceReached: finalContentClearanceReached,
    ...finalContentGeometry,
    sourceHashes: focusAttempt.sourceHashes,
  }, null, 2))
  expect(finalContentClearanceReached).toBe(true)
  expect(finalContentMetrics.bottom).toBeLessThanOrEqual(finalContentPanel.top)
  await saveScreenshot(page, testInfo, 'recording-phone-final-content-clearance-390x844.png')

  const transportJourney = {
    sourceWindow: { startSeconds: sourceWindowStart, endSeconds: sourceWindowEnd },
    recordingSource,
    recordingAudioHidden: true,
    recordingWaveformPeakCount: recordingWaveform.length,
    pausedSourceSwitch,
    sourceBeforeScrub,
    sourceAfterScrub,
    pausedRecordingSwitch,
    alignedRecordingPlayback,
    playingSourceSwitch,
    volumeDuringCapture: {
      captureControls,
      before: volumeBefore,
      after: volumeAfter,
      audioVolumeBefore,
      audioVolumeAfter,
      focusedByNativeTab: volumeReachedByTab,
      input: volumeInputMetrics,
      initialPanel: initialPhoneCapturePanel,
      focusedPanel: phonePanelMetrics,
      focusClearanceReached,
      postAdjustmentCaptureActive: volumeChangeSnapshot.captureActive,
    },
    finalContentClearance: {
      reached: finalContentClearanceReached,
      content: finalContentMetrics,
      panel: finalContentPanel,
      scrollY: finalContentGeometry.scrollY,
    },
    phoneCaptureVolume,
  }

  const metrics = { desktop, shortDesktop, phone, capturing, candidate, transportJourney }
  await mkdir(evidenceDirectory, { recursive: true })
  await writeFile(resolve(evidenceDirectory, 'recording-viewport-metrics.json'), JSON.stringify(metrics, null, 2))
  await writeFile(resolve(evidenceDirectory, 'recording-transport-interactions.json'), JSON.stringify(transportJourney, null, 2))
  await testInfo.attach('recording-viewport-metrics.json', {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: 'application/json',
  })
  await testInfo.attach('recording-transport-interactions.json', {
    body: Buffer.from(JSON.stringify(transportJourney, null, 2)),
    contentType: 'application/json',
  })
  console.log(`RECORDING_VIEWPORT_METRICS ${JSON.stringify(metrics)}`)
  diagnostics.assertClean()

  expect(desktop.documentWidth).toBeLessThanOrEqual(1440)
  expect(desktop.stage?.height).toBeLessThanOrEqual(450)
  expect(desktop.panel?.bottom).toBeLessThanOrEqual(900)
  expect(shortDesktop.documentWidth).toBeLessThanOrEqual(1440)
  expect(shortDesktop.stage?.height).toBeLessThanOrEqual(350)
  expect(shortDesktop.panel?.bottom).toBeLessThanOrEqual(700)
  expect(phone.documentWidth).toBeLessThanOrEqual(390)
  expect(phone.panel?.bottom).toBeLessThanOrEqual(844)
  expect(phone.modeLabels.length).toBe(2)
  expect(phone.modeLabels.every((label) => /[А-Яа-яЁё]/.test(label))).toBe(true)
  expect(phone.stage?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  expect(phone.dialogue?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  expect(phone.timeline?.bottom).toBeLessThanOrEqual(phone.panel?.top ?? 0)
  for (const control of phone.controls) {
    expect(control.height, `RU phone target: ${control.label}`).toBeGreaterThanOrEqual(48)
    expect(control.left, `RU phone left edge: ${control.label}`).toBeGreaterThanOrEqual(-1)
    expect(control.right, `RU phone right edge: ${control.label}`).toBeLessThanOrEqual(391)
    expect(control.textFits, `RU phone clipped label: ${control.label}`).toBe(true)
    expect(control.scrollWidth, `RU phone scroll width: ${control.label}`).toBeLessThanOrEqual(control.clientWidth + 1)
  }
})
