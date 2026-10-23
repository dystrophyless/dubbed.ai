import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import { captureAndAcceptVisibleTurn, continueThroughRecordingEntryGate, completeVisibleRegistration, setMillisecondSelectionAndQuote, startRegistrationFromLanding, uploadKnownSourceThroughUi } from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

async function withDiagnostics(
  page: Parameters<typeof installBrowserDiagnostics>[0],
  baseUrl: string | undefined,
  run: () => Promise<void>,
) {
  const diagnostics = await installBrowserDiagnostics(page, baseUrl ?? 'http://127.0.0.1:4173')
  try {
    await run()
  } finally {
    diagnostics.assertClean()
  }
}

test.describe('local mock product journey', () => {
  test('registers, saves a millisecond selection, records all lines, and downloads the displayed result generation', async ({ page, baseURL }) => {
    test.setTimeout(180_000)
    page.setDefaultTimeout(30_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = newE2ECredentials('full-journey')
      const code = await startRegistrationFromLanding(page, credentials)
      await completeVisibleRegistration(page, code)

      // Account session and the current New dub route must survive a same-browser reload.
      await page.reload()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
      await uploadKnownSourceThroughUi(page)

      // The selected interval is explicitly set to millisecond precision before obtaining the quote.
      await setMillisecondSelectionAndQuote(page)
      await expect(page).toHaveURL(/\/new(?:$|[?#])/, { timeout: 2_000 })
      await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
      await continueThroughRecordingEntryGate(page)
      await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()

      for (let accepted = 1; accepted <= 3; accepted += 1) {
        await captureAndAcceptVisibleTurn(page)
        if (accepted < 3) {
          await expect(page.getByText(`Accepted takes: ${accepted} / 3`, { exact: true })).toBeVisible()
          await expect(page.getByText(`Line ${accepted + 1} of 3`, { exact: true })).toBeVisible()
        }
      }

      // Accepting the final missing take durably starts the initial assembly and opens Result.
      await expect(page).toHaveURL(/\/projects\/[^/]+\/result$/, { timeout: 30_000 })
      await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible()
      await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Synthetic fixture result; not rendered from accepted takes or a custom upload.', { exact: true })).toBeVisible()

      const video = page.getByLabel('Finished dubbed video')
      await expect(video).toBeVisible()
      const displayedUrl = await video.evaluate((element) => (element as HTMLVideoElement).currentSrc)
      const displayedAssetPath = new URL(displayedUrl).pathname
      expect(displayedAssetPath).toMatch(/^\/media\/[a-z0-9-]+\.mp4$/i)

      const downloadStarted = page.waitForEvent('download')
      await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
      const download = await downloadStarted
      expect(download.suggestedFilename()).toMatch(/\.mp4$/i)
      await expect(page.getByText('Download requested.', { exact: true })).toBeVisible()

      const downloadPath = await download.path()
      expect(downloadPath).toBeTruthy()
      const [downloadedBytes, displayedFixtureBytes] = await Promise.all([
        readFile(downloadPath!),
        readFile(join(process.cwd(), 'public', displayedAssetPath.slice(1))),
      ])
      expect(createHash('sha256').update(downloadedBytes).digest('hex'))
        .toBe(createHash('sha256').update(displayedFixtureBytes).digest('hex'))

      const firstDisplayedSource = displayedUrl
      await page.reload()
      await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible()
      await expect(page.getByLabel('Finished dubbed video')).toBeVisible()
      await expect.poll(async () => page.getByLabel('Finished dubbed video').evaluate((element) => (element as HTMLVideoElement).currentSrc))
        .toBe(firstDisplayedSource)
    })
  })

  test('restores an in-progress registration after reload without issuing another code', async ({ page, baseURL }) => {
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = newE2ECredentials('registration-reload')
      const initialCode = await startRegistrationFromLanding(page, credentials)
      await page.reload()

      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 15_000 })
      const deliveryNotice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
      await expect(deliveryNotice).toBeVisible()
      const restoredCode = (await deliveryNotice.innerText()).match(/\b\d{6}\b/)?.[0]
      expect(restoredCode).toBe(initialCode)
      await completeVisibleRegistration(page, restoredCode!)
    })
  })

  test('completes the explicitly synthetic Google registration path from the registration screen', async ({ page, baseURL }) => {
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Start dubbing' }).click()
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
      await expect(page.getByText('Local preview only. No Google provider is contacted.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 15_000 })
    })
  })
})
