import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import {
  completeVisibleRegistration,
  startRegistrationFromLanding,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

const layoutEvidenceDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '_docs/evidence/frontend-implementation-2026-10-23/account-shell-layout')
type LayoutLocale = 'en' | 'ru'
type LayoutMeasurement = {
  screen: string
  locale: LayoutLocale
  viewportWidth: number
  mainCount: number
  appContentLeft: number
  appContentWidth: number
  appGutterLeft: number
  appGutterRight: number
  screenLeft: number
  screenWidth: number
  titleLeft: number
  screenPaddingTop: number
  screenPaddingBottom: number
  documentWidth: number
  mabryLoaded: boolean
  screenshot: string | null
}
const layoutMeasurements: LayoutMeasurement[] = []

async function withDiagnostics(
  page: Page,
  baseURL: string | undefined,
  run: () => Promise<void>,
): Promise<void> {
  const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  try {
    await run()
  } finally {
    diagnostics.assertClean()
  }
}

async function registerThroughUi(page: Page, label: string) {
  const credentials = newE2ECredentials(label)
  const code = await startRegistrationFromLanding(page, credentials)
  await completeVisibleRegistration(page, code)
  return credentials
}

async function signOutThroughUi(page: Page): Promise<void> {
  await page.getByRole('banner').getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
}

async function signInThroughUi(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

async function assertScreenUsesAppContentGutter(
  page: Page,
  screenSelector: '.account-screen' | '.account-linking-screen',
  locale: LayoutLocale,
  heading: string,
  maxWidth: number,
): Promise<void> {
  const widths = [390, 767, 768, 1440]

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 })
    const main = page.getByRole('main')
    await expect(main).toHaveCount(1)
    await expect(main.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await page.evaluate(() => document.fonts.ready)

    const geometry = await page.locator(screenSelector).evaluate((screen) => {
      const appMain = document.getElementById('main-content')
      const title = screen.querySelector('h1')
      if (!appMain || !title) throw new Error('The active app shell and screen title must be mounted.')
      const appRect = appMain.getBoundingClientRect()
      const appStyle = window.getComputedStyle(appMain)
      const contentLeft = appRect.left + Number.parseFloat(appStyle.paddingLeft)
      const contentRight = appRect.right - Number.parseFloat(appStyle.paddingRight)
      const screenRect = screen.getBoundingClientRect()

      return {
        mainCount: document.querySelectorAll('main').length,
        contentLeft,
        contentWidth: contentRight - contentLeft,
        appGutterLeft: Number.parseFloat(appStyle.paddingLeft),
        appGutterRight: Number.parseFloat(appStyle.paddingRight),
        screenLeft: screenRect.left,
        screenWidth: screenRect.width,
        titleLeft: title.getBoundingClientRect().left,
        screenPaddingTop: Number.parseFloat(window.getComputedStyle(screen).paddingTop),
        screenPaddingBottom: Number.parseFloat(window.getComputedStyle(screen).paddingBottom),
        documentWidth: document.documentElement.scrollWidth,
        mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
      }
    })
    const expectedWidth = Math.min(geometry.contentWidth, maxWidth)
    const expectedLeft = geometry.contentLeft + (geometry.contentWidth - expectedWidth) / 2
    const phone = width < 768
    const expectedGutter = phone ? 16 : 32
    const expectedVerticalPadding = screenSelector === '.account-screen'
      ? (phone ? { top: 32, bottom: 56 } : { top: 48, bottom: 80 })
      : (phone ? { top: 24, bottom: 52 } : { top: 40, bottom: 72 })

    expect(geometry.mainCount).toBe(1)
    expect(geometry.screenWidth).toBeCloseTo(expectedWidth, 0)
    expect(geometry.screenLeft).toBeCloseTo(expectedLeft, 0)
    expect(geometry.titleLeft).toBeCloseTo(expectedLeft, 0)
    expect(geometry.appGutterLeft).toBe(expectedGutter)
    expect(geometry.appGutterRight).toBe(expectedGutter)
    expect(geometry.screenPaddingTop).toBe(expectedVerticalPadding.top)
    expect(geometry.screenPaddingBottom).toBe(expectedVerticalPadding.bottom)
    expect(geometry.documentWidth).toBeLessThanOrEqual(width)

    const screenshot = width === 390 || width === 1440
      ? `${screenSelector.slice(1)}-${locale}-${width}.png`
      : null
    if (screenshot) {
      mkdirSync(layoutEvidenceDirectory, { recursive: true })
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({
        path: resolve(layoutEvidenceDirectory, screenshot),
        fullPage: true,
        animations: 'disabled',
      })
    }
    layoutMeasurements.push({
      screen: screenSelector.slice(1),
      locale,
      viewportWidth: width,
      mainCount: geometry.mainCount,
      appContentLeft: geometry.contentLeft,
      appContentWidth: geometry.contentWidth,
      appGutterLeft: geometry.appGutterLeft,
      appGutterRight: geometry.appGutterRight,
      screenLeft: geometry.screenLeft,
      screenWidth: geometry.screenWidth,
      titleLeft: geometry.titleLeft,
      screenPaddingTop: geometry.screenPaddingTop,
      screenPaddingBottom: geometry.screenPaddingBottom,
      documentWidth: geometry.documentWidth,
      mabryLoaded: geometry.mabryLoaded,
      screenshot,
    })
  }

  await page.setViewportSize({ width: 1440, height: 900 })
}

function writeLayoutEvidence(): void {
  mkdirSync(layoutEvidenceDirectory, { recursive: true })
  writeFileSync(resolve(layoutEvidenceDirectory, 'account-app-layout.json'), `${JSON.stringify({
    capturedAt: new Date().toISOString(),
    command: 'npm.cmd run test:e2e -- e2e/identity-account-journey.spec.ts',
    factBoundary: 'Actual App route geometry with deterministic local mock identity data; no live identity provider or account service.',
    expected: {
      appGutter: { desktop: 32, phone: 16 },
      accountMaximumWidth: 1200,
      accountLinkingMaximumWidth: 840,
      mainLandmarks: 1,
      viewportWidths: [390, 767, 768, 1440],
    },
    measurements: layoutMeasurements,
  }, null, 2)}\n`)
}

test.describe('local mock identity and account journeys', () => {
  test('keeps credential errors neutral, completes reset from visible mock OTP, and reauthenticates with the new password', async ({ page, baseURL }) => {
    test.setTimeout(90_000)
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = await registerThroughUi(page, 'password-reset')
      const incorrectPassword = `${credentials.password}-incorrect`
      const newPassword = `${credentials.password}-reset`

      await signOutThroughUi(page)
      await signInThroughUi(page, credentials.email, incorrectPassword)
      await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
      await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue(incorrectPassword)

      await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
      await expect(page).toHaveURL(/\/reset-password(?:$|[?#])$/)
      await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible()
      await page.getByLabel('Email').fill(credentials.email)
      await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
      await page.getByRole('button', { name: 'Send reset email', exact: true }).click()

      const localCodeNotice = page.getByText(/Local mock code:.*No email was sent\./i)
      await expect(localCodeNotice).toBeVisible()
      const resetCode = (await localCodeNotice.innerText()).match(/\b\d{6}\b/)?.[0]
      expect(resetCode, 'the local mock reset notice should show its synthetic six-digit code').toBeTruthy()

      await page.getByLabel('6-digit reset code').fill(resetCode!)
      await expect(page.getByLabel('New password', { exact: true })).toBeVisible({ timeout: 15_000 })
      await page.getByLabel('New password', { exact: true }).fill(newPassword)
      await page.getByLabel('Repeat new password').fill(newPassword)
      await page.getByRole('button', { name: 'Save new password', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })

      // Reset keeps the verified session. Sign out and prove the new credential at the normal sign-in form.
      await signOutThroughUi(page)
      await signInThroughUi(page, credentials.email, credentials.password)
      await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
      await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
      await expect(page.getByLabel('Password', { exact: true })).toHaveValue(credentials.password)
      await page.getByLabel('Password', { exact: true }).fill(newPassword)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
    })
  })

  test('persists the account locale, changes its password, and commits a dual-proof Google link only after review', async ({ page, baseURL }) => {
    test.setTimeout(90_000)
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = await registerThroughUi(page, 'account-link')
      const newPassword = `${credentials.password}-account`
      layoutMeasurements.length = 0

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'No projects yet', exact: true })).toBeVisible()
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
      const credits = page.getByRole('region', { name: 'Credits' })
      const available = credits.getByText('Available', { exact: true }).locator('..').locator('strong')
      await expect(available).toBeVisible()
      const initialAvailable = Number(await available.innerText())
      expect(initialAvailable).toBeGreaterThan(0)
      await expect(page.getByText('Welcome credits', { exact: true })).toHaveCount(1)

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      await assertScreenUsesAppContentGutter(page, '.account-screen', 'en', 'Account', 1200)

      const main = page.getByRole('main')
      await main.getByRole('combobox', { name: 'Language' }).selectOption('ru')
      await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
      await assertScreenUsesAppContentGutter(page, '.account-screen', 'ru', 'Аккаунт', 1200)
      await page.getByRole('main').getByRole('combobox', { name: 'Язык' }).selectOption('en')
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()

      const incorrectCurrentPassword = `${credentials.password}-incorrect`
      await page.getByLabel('Current password', { exact: true }).fill(incorrectCurrentPassword)
      await page.getByLabel('New password', { exact: true }).fill(newPassword)
      await page.getByRole('button', { name: 'Save password', exact: true }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.getByLabel('Current password', { exact: true })).toHaveValue(incorrectCurrentPassword)
      await expect(page.getByLabel('New password', { exact: true })).toHaveValue(newPassword)

      await page.getByLabel('Current password', { exact: true }).fill(credentials.password)
      await page.getByRole('button', { name: 'Save password', exact: true }).click()
      await expect(page.getByText('Password changed. This device stays signed in; other sessions were revoked.', { exact: true })).toBeVisible()

      await page.getByRole('button', { name: 'Link method', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Link a sign-in method' })).toBeVisible()
      await assertScreenUsesAppContentGutter(page, '.account-linking-screen', 'en', 'Link a sign-in method', 840)
      await expect(page.getByText('This preview uses simulated account data. No real email or Google account is contacted.', { exact: true })).toBeVisible()

      await page.locator('.account-linking-screen__back').click()
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      await page.getByRole('main').getByRole('combobox', { name: 'Language' }).selectOption('ru')
      await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
      await page.locator('.account-screen__method button').click()
      await expect(page.getByRole('heading', { name: 'Подключить способ входа', exact: true })).toBeVisible()
      await assertScreenUsesAppContentGutter(page, '.account-linking-screen', 'ru', 'Подключить способ входа', 840)
      writeLayoutEvidence()
      await page.locator('.account-linking-screen__back').click()
      await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
      await page.getByRole('main').getByRole('combobox', { name: 'Язык' }).selectOption('en')
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Link method', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Link a sign-in method' })).toBeVisible()
      await page.getByRole('button', { name: 'Add Google', exact: true }).click()

      await page.getByLabel('Current account password').fill(newPassword)
      await page.getByRole('button', { name: 'Confirm current method', exact: true }).click()
      await expect(page.getByText('Verified', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Add Google', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Review the link' })).toBeVisible()
      const googleAddress = await page.locator('.account-linking-screen__review-methods .account-linking-screen__method')
        .filter({ hasText: 'Google' })
        .locator('small')
        .innerText()
      expect(googleAddress).toMatch(/^google\+.+@example\.invalid$/)
      await page.getByRole('button', { name: 'Link methods', exact: true }).click()
      await expect(page.getByText('Both sign-in methods are linked to this account.', { exact: true })).toBeVisible()

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      const emailMethod = page.locator('.account-screen__method').filter({ hasText: 'Email and password' })
      const googleMethod = page.locator('.account-screen__method').filter({ hasText: 'Google' })
      await expect(emailMethod.locator('.account-screen__method-address')).toHaveText(credentials.email)
      await expect(googleMethod.locator('.account-screen__method-address')).toHaveText(googleAddress)
      await expect(emailMethod.getByText('Linked', { exact: true })).toBeVisible()
      await expect(googleMethod.getByText('Linked', { exact: true })).toBeVisible()

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
      await expect(page.getByRole('region', { name: 'Credits' }).getByText('Available', { exact: true }).locator('..').locator('strong'))
        .toHaveText(String(initialAvailable))
      await expect(page.getByText('Welcome credits', { exact: true })).toHaveCount(1)
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'No projects yet', exact: true })).toBeVisible()

      await signOutThroughUi(page)
      await signInThroughUi(page, credentials.email, newPassword)
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
    })
  })

  test('deletes the account, removes protected access, and does not regrant welcome credits on same-email registration', async ({ page, baseURL }) => {
    test.setTimeout(90_000)
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = await registerThroughUi(page, 'delete-reregister')

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
      const credits = page.getByRole('region', { name: 'Credits' })
      const available = credits.getByText('Available', { exact: true }).locator('..').locator('strong')
      await expect(available).toBeVisible()
      const initialAvailable = Number(await available.innerText())
      expect(initialAvailable).toBeGreaterThan(0)

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
      await page.getByRole('button', { name: 'Delete account', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog.getByRole('heading', { name: 'Delete this account?' })).toBeVisible()
      await dialog.getByLabel('Type DELETE to confirm').fill('DELETE')
      await dialog.getByRole('button', { name: 'Delete account', exact: true }).click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/')
      await expect.poll(() => new URL(page.url()).searchParams.get('notice')).toBe('account-deleted')
      await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()

      await page.goto('/account')
      await expect(page).toHaveURL(/\/sign-in(?:$|[?#])/, { timeout: 15_000 })

      const registrationCode = await startRegistrationFromLanding(page, credentials)
      await completeVisibleRegistration(page, registrationCode)
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
      const reRegisteredCredits = page.getByRole('region', { name: 'Credits' })
      const reRegisteredAvailable = reRegisteredCredits.getByText('Available', { exact: true }).locator('..').locator('strong')
      await expect(reRegisteredAvailable).toBeVisible()
      await expect(reRegisteredAvailable).toHaveText('0')
    })
  })
})
