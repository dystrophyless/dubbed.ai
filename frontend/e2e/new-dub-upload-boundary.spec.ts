import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { completeVisibleRegistration, setMillisecondSelectionAndQuote, startRegistrationFromLanding } from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

test('rejects a playable subsecond source in the browser before creating a draft', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  const code = await startRegistrationFromLanding(page, newE2ECredentials('source-duration-boundary'))
  await completeVisibleRegistration(page, code)
  const shortSourcePath = join(process.cwd(), 'public', 'media', 'short-source.mp4')
  const sourcePath = join(process.cwd(), 'public', 'media', 'source-dialogue.mp4')
  const input = page.getByLabel('Choose video')
  await expect(input).toBeAttached()
  await input.setInputFiles(shortSourcePath)
  await expect(page.getByRole('alert')).toHaveText('This video is shorter than 1 second. Choose a video at least 1 second long.')
  await expect(page.getByText('0 of 2 project slots used', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validate and save draft' })).not.toBeVisible()
  const screenshotPath = testInfo.outputPath('new-dub-short-source-error-en.png')
  await page.screenshot({ path: screenshotPath, fullPage: true })
  await testInfo.attach('new-dub-short-source-error-en', {
    path: screenshotPath,
    contentType: 'image/png',
  })

  await input.setInputFiles(sourcePath)
  await expect(page.getByRole('button', { name: 'Validate and save draft', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Validate and save draft', exact: true }).click()
  await expect(page.getByText('Validated draft saved in this mock workspace.', { exact: true })).toBeVisible()
  await expect(page.getByText('1 of 2 project slots used', { exact: true })).toBeVisible()
  await setMillisecondSelectionAndQuote(page)

  const start = page.getByLabel('Start (seconds)')
  const end = page.getByLabel('End (seconds)')
  const originalStart = await start.inputValue()
  const originalEnd = await end.inputValue()
  const originalPreviewUrl = await page.locator('.new-dub-preview__video').getAttribute('src')
  await expect(page.getByRole('button', { name: 'Process for 9 credits', exact: true })).toBeEnabled()
  const replaceInput = page.getByLabel('Replace video')
  await expect(replaceInput).toBeAttached()
  await replaceInput.setInputFiles(shortSourcePath)

  await expect(page.getByRole('alert')).toHaveText('This video is shorter than 1 second. Choose a video at least 1 second long.')
  await expect(page.getByRole('heading', { name: 'source-dialogue', exact: true })).toBeVisible()
  await expect(page.getByText('source-dialogue.mp4', { exact: true })).toBeVisible()
  await expect(start).toHaveValue(originalStart)
  await expect(end).toHaveValue(originalEnd)
  await expect(page.getByRole('button', { name: 'Process for 9 credits', exact: true })).toBeEnabled()
  await expect(page.locator('.new-dub-preview__video')).toHaveAttribute('src', originalPreviewUrl!)
  await expect(page.getByText('1 of 2 project slots used', { exact: true })).toBeVisible()
  const replacementScreenshotPath = testInfo.outputPath('new-dub-short-replacement-preserved-en.png')
  await page.screenshot({ path: replacementScreenshotPath, fullPage: true })
  await testInfo.attach('new-dub-short-replacement-preserved-en', {
    path: replacementScreenshotPath,
    contentType: 'image/png',
  })

  await replaceInput.setInputFiles({
    name: 'replacement-source.mp4',
    mimeType: 'video/mp4',
    buffer: await readFile(sourcePath),
  })
  await expect(page.locator('.new-dub-candidate').getByRole('button', { name: 'Replace video', exact: true })).toBeEnabled()
  await page.locator('.new-dub-candidate').getByRole('button', { name: 'Replace video', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'replacement-source', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Get exact quote', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Process for 9 credits', exact: true })).not.toBeVisible()
  await expect(start).toHaveValue('0.000')
  await expect(end).toHaveValue('8.625')
  await expect(page.getByText('1 of 2 project slots used', { exact: true })).toBeVisible()
})
