import { expect, test, type Page } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import {
  completeVisibleRegistration,
  startRegistrationFromLanding,
} from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

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

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()

      const main = page.getByRole('main')
      await main.getByRole('combobox', { name: 'Language' }).selectOption('ru')
      await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
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
      await expect(page.getByText('This preview uses simulated account data. No real email or Google account is contacted.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Add Google', exact: true }).click()

      await page.getByLabel('Current account password').fill(newPassword)
      await page.getByRole('button', { name: 'Confirm current method', exact: true }).click()
      await expect(page.getByText('Verified', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Add Google', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Review the link' })).toBeVisible()
      await page.getByRole('button', { name: 'Link methods', exact: true }).click()
      await expect(page.getByText('Both sign-in methods are linked to this account.', { exact: true })).toBeVisible()

      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
      await expect(page.getByText('Linked', { exact: true })).toHaveCount(2)

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
