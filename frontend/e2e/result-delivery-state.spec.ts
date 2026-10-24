import { expect, test, type Locator, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

interface RetryInput {
  projectId: string
  priorOperationId: string
  retryLineageId: string
  expectedProjectRevision: number
  operationId: string
}

interface HarnessSnapshot {
  loadCalls: number
  loadPlaybackCalls: Array<{ projectId: string; displayedGenerationId: string }>
  refreshPlaybackCalls: Array<{ projectId: string; displayedGenerationId: string }>
  ensureAssemblyCalls: number
  retryCalls: RetryInput[]
  downloadCalls: string[]
  creditCalls: string[]
}

interface HarnessApi {
  snapshot(): HarnessSnapshot
  releaseFirstRetry(): boolean
}

const evidenceDirectory = fileURLToPath(
  new URL('../../_docs/evidence/frontend-implementation-2026-10-23/result-state-ui/', import.meta.url),
)
const generationId = 'result-state-generation-001'

async function harnessSnapshot(page: Page): Promise<HarnessSnapshot> {
  const snapshot = await page.evaluate(() => {
    const api = (window as unknown as { __resultDeliveryState?: HarnessApi }).__resultDeliveryState
    if (!api) throw new Error('Result delivery state fixture is not ready.')
    return api.snapshot()
  })
  return snapshot as HarnessSnapshot
}

async function openScenario(page: Page, scenario: string, locale: 'en' | 'ru'): Promise<void> {
  await page.goto(`/e2e/harness/result-delivery-state.html?scenario=${scenario}&locale=${locale}`)
  await expect(page.locator('.result-screen')).toBeVisible()
  const fontState = await page.evaluate(async () => {
    const heading = document.querySelector('.result-screen__header h1')
    if (!heading) throw new Error('The actual ResultScreen heading is missing.')
    await document.fonts.load('500 16px "Mabry Pro"')
    await document.fonts.ready
    return {
      family: getComputedStyle(heading).fontFamily,
      loaded: document.fonts.check('500 16px "Mabry Pro"'),
    }
  })
  expect(fontState.family).toContain('Mabry Pro')
  expect(fontState.loaded).toBe(true)
}

async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  const widths = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }))
  expect(widths.document).toBeLessThanOrEqual(widths.viewport)
  expect(widths.body).toBeLessThanOrEqual(widths.viewport)
}

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function focusWithKeyboard(page: Page, target: Locator): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const focused = await target.evaluate((element) => document.activeElement === element)
    if (focused) break
    await page.keyboard.press('Tab')
  }
  await expect(target).toBeFocused()
  const focusStyle = await target.evaluate((element) => {
    const style = getComputedStyle(element)
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineOffset: style.outlineOffset }
  })
  expect(focusStyle).toEqual({ outlineStyle: 'solid', outlineWidth: '2px', outlineOffset: '2px' })
}

async function capture(page: Page, name: string): Promise<void> {
  await settlePaint(page)
  await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: true })
}

async function recordTrustedProgressGeometry(page: Page): Promise<void> {
  const progress = page.getByRole('progressbar', { name: 'Assembly progress' })
  const measurement = await progress.evaluate((element) => {
    const bar = element as HTMLProgressElement
    const rect = bar.getBoundingClientRect()
    const style = getComputedStyle(bar)
    return {
      element: bar.tagName,
      value: bar.value,
      max: bar.max,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      computed: {
        accentColor: style.accentColor,
        appearance: style.appearance,
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxSizing: style.boxSizing,
        height: style.height,
        fillColor: style.color,
      },
    }
  })
  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
  }))
  expect(measurement.element).toBe('PROGRESS')
  expect(measurement.value).toBe(42)
  expect(measurement.max).toBe(100)
  expect(measurement.rect.height).toBe(4)
  expect(measurement.computed).toMatchObject({
    accentColor: 'rgb(0, 96, 226)',
    appearance: 'none',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: '2px',
    height: '4px',
    fillColor: 'rgb(0, 96, 226)',
  })
  await writeFile(
    path.join(evidenceDirectory, 'result-assembly-progress-known-en-desktop.geometry.json'),
    `${JSON.stringify({ viewport, ...measurement }, null, 2)}\n`,
    'utf8',
  )
}

async function videoState(video: Locator): Promise<{
  src: string | null
  currentTime: number
  paused: boolean
  readyState: number
}> {
  return video.evaluate((element) => {
    const player = element as HTMLVideoElement
    return {
      src: player.getAttribute('src'),
      currentTime: player.currentTime,
      paused: player.paused,
      readyState: player.readyState,
    }
  })
}

async function assertPlaybackFailureAndSameGenerationRefresh(
  page: Page,
  scenario: 'playback-network-error' | 'playback-expired-descriptor',
  locale: 'en' | 'ru',
  urlPath: string,
  screenshotFailure: string,
  screenshotRecovered: string,
): Promise<void> {
  await page.route(`**${urlPath}/**`, async (route) => {
    if (scenario === 'playback-expired-descriptor') {
      await route.fulfill({ status: 403, contentType: 'text/plain', body: 'Synthetic expired playback descriptor.' })
      return
    }
    await route.abort('failed')
  })
  await openScenario(page, scenario, locale)

  const video = page.getByLabel(locale === 'ru' ? 'Готовое озвученное видео' : 'Finished dubbed video')
  await expect(video).toBeVisible()
  await expect(video).toHaveAttribute('src', `${urlPath}/result-state-generation-001.mp4`)
  const alert = page.getByRole('alert')
  await expect(alert).toBeVisible()
  await expect(alert).toContainText(
    locale === 'ru'
      ? 'Не удалось воспроизвести результат. Отображаемая версия сохранена.'
      : 'This result could not be played. The displayed generation is preserved.',
  )
  await expect(page.locator('.result-screen__download-error')).toHaveCount(0)
  await expect(page.getByRole('button', { name: locale === 'ru' ? 'Повторить воспроизведение' : 'Retry playback', exact: true })).toBeVisible()
  await expect(page.getByText(locale === 'ru' ? 'Отображаемая версия: 7' : 'Displayed generation: 7', { exact: true })).toBeVisible()
  await assertNoHorizontalOverflow(page)

  if (locale === 'ru') {
    const retryButton = page.getByRole('button', { name: 'Повторить воспроизведение', exact: true })
    const box = await retryButton.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(48)
  }

  await capture(page, screenshotFailure)
  const beforeRefresh = await harnessSnapshot(page)
  expect(beforeRefresh.loadPlaybackCalls).toEqual([{ projectId: 'result-state-project', displayedGenerationId: generationId }])
  expect(beforeRefresh.refreshPlaybackCalls).toEqual([])
  expect(beforeRefresh.downloadCalls).toEqual([])
  expect(beforeRefresh.ensureAssemblyCalls).toBe(0)
  expect(beforeRefresh.retryCalls).toEqual([])
  expect(beforeRefresh.creditCalls).toEqual([])

  const retryButton = page.getByRole('button', { name: locale === 'ru' ? 'Повторить воспроизведение' : 'Retry playback', exact: true })
  await focusWithKeyboard(page, retryButton)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await harnessSnapshot(page)).refreshPlaybackCalls.length).toBe(1)
  await expect(video).toHaveAttribute('src', '/media/result-generation-001.mp4')
  await expect(alert).toHaveCount(0)
  await expect.poll(async () => (await videoState(video)).readyState).toBeGreaterThan(0)

  const afterRefresh = await harnessSnapshot(page)
  expect(afterRefresh.refreshPlaybackCalls).toEqual([{ projectId: 'result-state-project', displayedGenerationId: generationId }])
  expect(afterRefresh.loadPlaybackCalls[0].displayedGenerationId).toBe(generationId)
  expect(await page.getByText(locale === 'ru' ? 'Отображаемая версия: 7' : 'Displayed generation: 7', { exact: true })).toBeVisible()
  const recoveredVideo = await videoState(video)
  expect(recoveredVideo.paused).toBe(true)
  expect(recoveredVideo.currentTime).toBeLessThanOrEqual(0.05)
  expect(afterRefresh.downloadCalls).toEqual([])
  expect(afterRefresh.ensureAssemblyCalls).toBe(0)
  expect(afterRefresh.retryCalls).toEqual([])
  expect(afterRefresh.creditCalls).toEqual([])
  await assertNoHorizontalOverflow(page)
  await capture(page, screenshotRecovered)
}

test.beforeEach(async () => {
  await mkdir(evidenceDirectory, { recursive: true })
})

test('renders only trusted assembly progress on desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openScenario(page, 'assembly-progress-known', 'en')

  await expect(page.getByRole('heading', { name: 'Assembling video…' })).toBeVisible()
  const progress = page.getByRole('progressbar', { name: 'Assembly progress' })
  await expect(progress).toHaveAttribute('value', '42')
  await expect(page.locator('.result-screen__progress span')).toHaveText('42%')
  await recordTrustedProgressGeometry(page)
  await assertNoHorizontalOverflow(page)
  await capture(page, 'result-assembly-progress-known-en-desktop.png')
})

test('does not invent a percentage when assembly progress is untrusted', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openScenario(page, 'assembly-progress-untrusted', 'ru')

  await expect(page.getByRole('heading', { name: 'Собираем видео…' })).toBeVisible()
  await expect(page.getByRole('progressbar')).toHaveCount(0)
  await expect(page.locator('.result-screen__progress')).toHaveCount(0)
  await expect(page.getByText('67%', { exact: true })).toHaveCount(0)
  await assertNoHorizontalOverflow(page)
  await capture(page, 'result-assembly-progress-untrusted-ru-phone.png')
})

test('switches the Result main gutter at the 767/768px app breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 844 })
  await openScenario(page, 'assembly-progress-known', 'en')

  const appMain = page.locator('.app-main')
  const measurements = []
  for (const [width, expectedPadding] of [[767, 16], [768, 32]] as const) {
    await page.setViewportSize({ width, height: 844 })
    await expect(appMain).toHaveCSS('padding-left', `${expectedPadding}px`)
    const resultWidth = await page.locator('.result-screen').evaluate((element) => element.getBoundingClientRect().width)
    expect(resultWidth).toBeGreaterThan(0)
    await assertNoHorizontalOverflow(page)
    measurements.push({ width, appMainPaddingLeft: expectedPadding, resultWidth })
  }

  await writeFile(
    path.join(evidenceDirectory, 'result-app-main-767-768-boundary.geometry.json'),
    `${JSON.stringify({ viewportHeight: 844, measurements }, null, 2)}\n`,
    'utf8',
  )
})

test('keeps assembly retry identity when the outcome is unknown', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openScenario(page, 'assembly-retry-unknown', 'ru')

  await expect(page.getByText('Не удалось завершить последнюю попытку сборки.', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Повторить сборку', exact: true }).click()
  const submitting = page.getByRole('button', { name: 'Повторяем сборку…', exact: true })
  await expect(submitting).toBeVisible()
  await expect(submitting).toBeDisabled()
  const submittingBox = await submitting.boundingBox()
  const submittingType = await submitting.evaluate((element) => {
    const style = getComputedStyle(element)
    return { fontSize: style.fontSize, lineHeight: style.lineHeight }
  })
  expect(submittingBox?.height).toBeGreaterThanOrEqual(48)
  expect(submittingType).toEqual({ fontSize: '16px', lineHeight: '24px' })
  await writeFile(
    path.join(evidenceDirectory, 'result-assembly-retry-submitting-ru-phone.geometry.json'),
    `${JSON.stringify({ viewport: { width: 390, height: 844 }, button: submittingBox, ...submittingType }, null, 2)}\n`,
    'utf8',
  )
  await assertNoHorizontalOverflow(page)
  await capture(page, 'result-assembly-retry-submitting-ru-phone.png')

  const released = await page.evaluate(() => {
    const api = (window as unknown as { __resultDeliveryState?: HarnessApi }).__resultDeliveryState
    return api?.releaseFirstRetry() ?? false
  })
  expect(released).toBe(true)

  await expect(page.getByRole('alert')).toContainText('Результат повтора не подтверждён.')
  const checkRetry = page.getByRole('button', { name: 'Проверить статус повтора', exact: true })
  await expect(checkRetry).toBeVisible()
  const buttonBox = await checkRetry.boundingBox()
  expect(buttonBox?.height).toBeGreaterThanOrEqual(48)
  await assertNoHorizontalOverflow(page)
  await capture(page, 'result-assembly-retry-unknown-ru-phone.png')

  const firstSnapshot = await harnessSnapshot(page)
  expect(firstSnapshot.retryCalls).toHaveLength(1)
  expect(firstSnapshot.retryCalls[0]).toMatchObject({
    projectId: 'result-state-project',
    priorOperationId: 'result-state-prior-failed-operation',
    retryLineageId: 'result-state-retry-lineage',
    expectedProjectRevision: 9,
  })
  expect(firstSnapshot.retryCalls[0].operationId.length).toBeGreaterThan(0)

  await focusWithKeyboard(page, checkRetry)
  await page.keyboard.press('Enter')
  await expect.poll(async () => (await harnessSnapshot(page)).retryCalls.length).toBe(2)
  await expect(checkRetry).toBeVisible()
  const reconciledSnapshot = await harnessSnapshot(page)
  expect(reconciledSnapshot.retryCalls[1]).toEqual(reconciledSnapshot.retryCalls[0])
  expect(reconciledSnapshot.ensureAssemblyCalls).toBe(0)
  expect(reconciledSnapshot.downloadCalls).toEqual([])
  expect(reconciledSnapshot.creditCalls).toEqual([])
})

test('shows an actual media network error and refreshes the same generation without autoplay', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await assertPlaybackFailureAndSameGenerationRefresh(
    page,
    'playback-network-error',
    'en',
    '/__fixture__/delivery-network-error',
    'result-playback-network-error-en-desktop.png',
    'result-playback-network-recovered-en-desktop.png',
  )
})

test('shows an expired-descriptor media error and refreshes the same generation without autoplay', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await assertPlaybackFailureAndSameGenerationRefresh(
    page,
    'playback-expired-descriptor',
    'ru',
    '/__fixture__/expired-playback-descriptor',
    'result-playback-expired-descriptor-ru-phone.png',
    'result-playback-expired-recovered-ru-phone.png',
  )
})
