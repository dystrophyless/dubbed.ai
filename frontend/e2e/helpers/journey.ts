import { expect, type Page } from '@playwright/test'
import { join } from 'node:path'
import type { E2ECredentials } from './identity.js'

/** Complete registration through the visible local mock delivery scenario; never reads service internals. */
export async function startRegistrationFromLanding(page: Page, credentials: E2ECredentials): Promise<string> {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
  await page.getByRole('button', { name: 'Start dubbing' }).click()
  await expect(page).toHaveURL(/\/register(?:$|[?#])/, { timeout: 10_000 })
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Password').fill(credentials.password)
  await page.getByRole('button', { name: 'Create account' }).click()

  const deliveryNotice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
  await expect(deliveryNotice).toBeVisible()
  const noticeText = await deliveryNotice.innerText()
  expect(noticeText).toMatch(/mock/i)
  const code = noticeText.match(/\b\d{6}\b/)?.[0]
  expect(code, 'visible local mock delivery notice should contain a six-digit code').toBeTruthy()
  return code!
}

export async function completeVisibleRegistration(page: Page, code: string): Promise<void> {
  await page.getByLabel('6-digit verification code').fill(code)
  await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 15_000 })
}

export async function uploadKnownSourceThroughUi(page: Page): Promise<void> {
  const input = page.getByLabel('Choose video')
  await expect(input).toBeAttached()
  await input.setInputFiles(fullSourcePath())
  await page.getByRole('button', { name: 'Validate and save draft' }).click()
  await expect(page.getByText('Saved source', { exact: true })).toBeVisible({ timeout: 25_000 })
  await expect(page.getByLabel('Start (seconds)')).toBeEnabled({ timeout: 20_000 })
}

export async function setMillisecondSelectionAndQuote(page: Page): Promise<void> {
  const start = page.getByLabel('Start (seconds)')
  const end = page.getByLabel('End (seconds)')
  const originalEnd = Number(await end.inputValue())
  expect(originalEnd).toBeGreaterThan(8.5)

  const startSeconds = 0.123
  const endSeconds = Math.round((originalEnd - 0.002) * 1000) / 1000
  const durationSeconds = Math.round((endSeconds - startSeconds) * 1000) / 1000
  expect(Math.ceil(durationSeconds)).toBe(9)

  await start.fill(startSeconds.toFixed(3))
  await start.press('Tab')
  await expect(page.getByText('Section saved. Request a fresh quote before processing.', { exact: true })).toBeVisible()
  await expect(start).toHaveValue(startSeconds.toFixed(3))

  // Each field autosaves on blur; wait for the first save before editing the other field.
  await end.fill(endSeconds.toFixed(3))
  await end.press('Tab')
  await expect(page.getByText('Section saved. Request a fresh quote before processing.', { exact: true })).toBeVisible()
  await expect(start).toHaveValue(startSeconds.toFixed(3))
  await expect(end).toHaveValue(endSeconds.toFixed(3))
  await expect(page.getByText(`Selected duration: ${durationSeconds.toFixed(3)} seconds`, { exact: true })).toBeVisible()

  const quoteButton = page.getByRole('button', { name: 'Get exact quote' })
  await expect(quoteButton).toBeEnabled()
  await quoteButton.click()
  await expect(page.getByRole('button', { name: 'Process for 9 credits', exact: true })).toBeVisible()
}

/** Follow the recording-entry gate through its visible Mic recovery when current device readiness needs it. */
export async function continueThroughRecordingEntryGate(page: Page): Promise<void> {
  const microphoneHeading = page.getByRole('heading', { name: /^(Check your microphone|Проверка микрофона)$/ })
  const recordingHeading = page.getByRole('heading', { name: /^(Record your voice|Запишите свою реплику)$/ })
  await expect.poll(async () => {
    if (await recordingHeading.isVisible()) return 'record'
    if (await microphoneHeading.isVisible()) return 'microphone'
    return 'pending'
  }, { timeout: 30_000 }).not.toBe('pending')

  if (await microphoneHeading.isVisible()) {
    const connected = page.getByText(
      /^(Connected\. The browser is providing a live microphone track\.|Подключено\. Браузер передаёт активную дорожку микрофона\.)$/,
    )
    if (!(await connected.isVisible())) {
      const connectButton = page.getByRole('button', {
        name: /^(Allow microphone access|Connect selected microphone|Разрешить доступ к микрофону|Подключить выбранный микрофон)$/,
      })
      await expect(connectButton).toBeEnabled()
      await connectButton.click()
    }
    await expect(connected).toBeVisible({ timeout: 15_000 })
    const continueButton = page.getByRole('button', { name: /^(Continue|Продолжить)$/ })
    await expect(continueButton).toBeEnabled()
    await continueButton.click()
  }

  await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/, { timeout: 30_000 })
  await expect(recordingHeading).toBeVisible()
}

export async function captureAndAcceptVisibleTurn(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Record line', exact: true }).click()
  await expect(page.getByText('Recorded audio frames were decoded. Next line saves this take and continues.', { exact: true }))
    .toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Next line', exact: true }).click()
}

export const fullSourcePath = () => join(process.cwd(), 'public', 'media', 'source-dialogue.mp4')
