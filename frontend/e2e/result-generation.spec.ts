import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, test, type Download, type Page } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'

interface DownloadCall {
  projectId: string
  displayedGenerationId: string
  operationId: string
}

interface HarnessSnapshot {
  downloadCalls: DownloadCall[]
  assemblyCalls: number
  creditCalls: string[]
  operationCalls: string[]
  otherServiceCalls: string[]
}

interface HarnessApi {
  publishGeneration2(): void
  failFirstDownload(): void
  snapshot(): HarnessSnapshot
}

interface MediaAsset {
  fileName: string
  bytes: number
  sha256: string
}

interface FixtureManifest {
  assets: {
    resultGeneration1: MediaAsset
    resultGeneration2: MediaAsset
  }
}

interface VideoState {
  src: string | null
  currentTime: number
  paused: boolean
  muted: boolean
  volume: number
  readyState: number
}

async function harnessSnapshot(page: Page): Promise<HarnessSnapshot> {
  return page.evaluate(() => {
    const harness = (globalThis as unknown as {
      __controlledResultHarness?: HarnessApi
    }).__controlledResultHarness
    if (!harness) throw new Error('Controlled result harness is not ready.')
    return harness.snapshot()
  })
}

async function invokeHarness(page: Page, action: keyof Pick<HarnessApi, 'publishGeneration2' | 'failFirstDownload'>): Promise<void> {
  await page.evaluate((method) => {
    const harness = (globalThis as unknown as {
      __controlledResultHarness?: HarnessApi
    }).__controlledResultHarness
    if (!harness) throw new Error('Controlled result harness is not ready.')
    harness[method]()
  }, action)
}

async function readVideo(page: Page): Promise<VideoState> {
  return page.locator('video[aria-label="Finished dubbed video"]').evaluate((element: unknown) => {
    const video = element as {
      getAttribute(name: string): string | null
      currentTime: number
      paused: boolean
      muted: boolean
      volume: number
      readyState: number
    }
    return {
      src: video.getAttribute('src'),
      currentTime: video.currentTime,
      paused: video.paused,
      muted: video.muted,
      volume: video.volume,
      readyState: video.readyState,
    }
  })
}

async function downloadedBytes(download: Download): Promise<{
  fileName: string
  bytes: number
  sha256: string
}> {
  const path = await download.path()
  expect(path, 'the Chromium download should be available as a local test artifact').not.toBeNull()
  const bytes = await readFile(path!)
  return {
    fileName: download.suggestedFilename(),
    bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

test('keeps playback and download bytes bound to the displayed generation', async ({ page, baseURL }, testInfo) => {
  test.setTimeout(45_000)
  page.setDefaultTimeout(15_000)
  const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  const manifest = JSON.parse(
    await readFile(new URL('../public/media/fixture-manifest.json', import.meta.url), 'utf8'),
  ) as FixtureManifest

  let proof: Record<string, unknown> = {}
  try {
    await page.goto('/e2e/harness/result.html')
    const video = page.locator('video[aria-label="Finished dubbed video"]')
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute('src', '/media/result-generation-001.mp4')

    await video.evaluate(async (element: unknown) => {
      const player = element as { muted: boolean; volume: number; play(): Promise<void> }
      player.muted = true
      player.volume = 0
      await player.play()
    })
    await expect.poll(async () => (await readVideo(page)).currentTime, { timeout: 10_000 }).toBeGreaterThan(0.2)
    const beforePublish = await readVideo(page)

    await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
    await expect.poll(async () => (await harnessSnapshot(page)).downloadCalls.length).toBe(1)
    const firstDownloadCall = (await harnessSnapshot(page)).downloadCalls[0]
    expect(firstDownloadCall.displayedGenerationId).toBe('controlled-generation-001')

    await invokeHarness(page, 'publishGeneration2')
    const watchNew = page.getByRole('button', { name: 'Watch new', exact: true })
    await expect(watchNew).toBeVisible()
    await expect(watchNew).toBeDisabled()
    const whileDownloadPending = await readVideo(page)
    expect(whileDownloadPending.src).toBe('/media/result-generation-001.mp4')
    expect(whileDownloadPending.paused).toBe(false)
    await expect.poll(async () => (await readVideo(page)).currentTime, { timeout: 5_000 })
      .toBeGreaterThan(beforePublish.currentTime + 0.2)

    await invokeHarness(page, 'failFirstDownload')
    const retryOldGeneration = page.getByRole('button', { name: 'Retry download version 1', exact: true })
    await expect(retryOldGeneration).toBeVisible()
    await expect(watchNew).toBeEnabled()
    const beforeWatchNew = await readVideo(page)
    expect(beforeWatchNew.src).toBe('/media/result-generation-001.mp4')
    expect(beforeWatchNew.paused).toBe(false)

    await watchNew.click()
    await expect(video).toHaveAttribute('src', '/media/result-generation-002.mp4')
    await expect.poll(async () => (await readVideo(page)).readyState, { timeout: 10_000 }).toBeGreaterThan(0)
    const afterWatchNew = await readVideo(page)
    expect(afterWatchNew.paused).toBe(true)
    expect(afterWatchNew.currentTime).toBeCloseTo(0, 2)

    const retryDownloadEvent = page.waitForEvent('download')
    await retryOldGeneration.click()
    const retriedGeneration1 = await downloadedBytes(await retryDownloadEvent)

    const freshDownloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
    const freshGeneration2 = await downloadedBytes(await freshDownloadEvent)

    const snapshot = await harnessSnapshot(page)
    expect(snapshot.downloadCalls.map((call) => call.displayedGenerationId)).toEqual([
      'controlled-generation-001',
      'controlled-generation-001',
      'controlled-generation-002',
    ])
    expect(snapshot.downloadCalls.map((call) => call.projectId)).toEqual([
      'controlled-result-project',
      'controlled-result-project',
      'controlled-result-project',
    ])
    expect(new Set(snapshot.downloadCalls.map((call) => call.operationId)).size).toBe(3)
    expect(retriedGeneration1).toEqual({
      fileName: manifest.assets.resultGeneration1.fileName,
      bytes: manifest.assets.resultGeneration1.bytes,
      sha256: manifest.assets.resultGeneration1.sha256,
    })
    expect(freshGeneration2).toEqual({
      fileName: manifest.assets.resultGeneration2.fileName,
      bytes: manifest.assets.resultGeneration2.bytes,
      sha256: manifest.assets.resultGeneration2.sha256,
    })
    expect(snapshot.assemblyCalls).toBe(0)
    expect(snapshot.creditCalls).toEqual([])
    expect(snapshot.operationCalls).toEqual([])
    expect(snapshot.otherServiceCalls).toEqual([])

    proof = {
      capturedAtUtc: new Date().toISOString(),
      scope: 'Controlled local-mock ResultScreen browser proof. This does not exercise backend generation, native-device capture, Safari/iOS, or operating-system save confirmation.',
      browser: { engine: 'Chromium', version: page.context().browser()?.version() ?? null },
      mediaOutput: { mutedLaunchArgumentConfigured: true, elementMuted: beforePublish.muted, elementVolume: beforePublish.volume },
      localFixtureOnly: true,
      generationIds: ['controlled-generation-001', 'controlled-generation-002'],
      playback: {
        sourceDuringPendingDownload: whileDownloadPending.src,
        currentTimeBeforePublishSeconds: beforePublish.currentTime,
        currentTimeDuringPendingDownloadSeconds: whileDownloadPending.currentTime,
        pausedDuringPendingDownload: whileDownloadPending.paused,
        sourceBeforeExplicitWatchNew: beforeWatchNew.src,
        sourceAfterWatchNew: afterWatchNew.src,
        pausedAfterWatchNew: afterWatchNew.paused,
        currentTimeAfterWatchNewSeconds: afterWatchNew.currentTime,
      },
      downloads: {
        calls: snapshot.downloadCalls,
        retryOldGeneration: retriedGeneration1,
        freshCurrentGeneration: freshGeneration2,
      },
      sideEffects: {
        assemblyCalls: snapshot.assemblyCalls,
        creditCalls: snapshot.creditCalls,
        operationCalls: snapshot.operationCalls,
        unexpectedServiceCalls: snapshot.otherServiceCalls,
      },
    }
  } finally {
    diagnostics.assertClean()
  }

  const proofPath = testInfo.outputPath('result-generation-controlled-proof.json')
  await writeFile(proofPath, JSON.stringify(proof, null, 2), 'utf8')
  await testInfo.attach('result-generation-controlled-proof.json', {
    path: proofPath,
    contentType: 'application/json',
  })
})
