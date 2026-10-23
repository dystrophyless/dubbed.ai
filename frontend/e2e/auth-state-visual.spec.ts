import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Browser, type Page } from '@playwright/test'

declare global {
  interface Window {
    __authStateVisual?: {
      scenario: string
      calls: string[]
      release: (name: string) => void
    }
  }
}

const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '_docs/evidence/frontend-implementation-2026-10-23/auth-state-ui')
mkdirSync(evidenceDir, { recursive: true })

type Locale = 'en-US' | 'ru-RU'
type Size = { width: number; height: number }

async function openScene(
  browser: Browser,
  screen: 'signin' | 'register' | 'reset' | 'link',
  scenario: string,
  options: { locale?: Locale; viewport?: Size } = {},
) {
  const context = await browser.newContext({
    locale: options.locale ?? 'en-US',
    viewport: options.viewport ?? { width: 1440, height: 1000 },
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await page.goto(`/e2e/harness/auth-state-visual.html?screen=${screen}&scenario=${scenario}`)
  await expect(page.locator('main.app-main')).toBeVisible()
  await expect(page.locator('main.app-main h1')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', options.locale === 'ru-RU' ? 'ru' : 'en')
  await page.evaluate(() => document.fonts.ready)
  return { context, page }
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: resolve(evidenceDir, name), fullPage: true })
}

async function waitForCall(page: Page, name: string) {
  await expect.poll(() => page.evaluate((expected) => window.__authStateVisual?.calls.includes(expected) ?? false, name)).toBe(true)
}

async function release(page: Page, name: string) {
  await page.evaluate((action) => window.__authStateVisual?.release(action), name)
}

async function submitFirstForm(page: Page) {
  await page.locator('main.app-main form').first().locator('button[type="submit"]').click()
}

async function startRegistration(page: Page) {
  await page.locator('input[autocomplete="email"]').fill('new-user@example.invalid')
  await page.locator('input[autocomplete="new-password"]').first().fill('sample-password-123')
  await submitFirstForm(page)
}

async function startReset(page: Page) {
  await page.locator('input[autocomplete="email"]').fill('reset-user@example.invalid')
  await submitFirstForm(page)
}

async function pasteCode(page: Page, code: string, expectRetained = true) {
  const input = page.locator('input[autocomplete="one-time-code"]')
  await input.focus()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((value) => navigator.clipboard.writeText(value), code)
  await page.keyboard.press('Control+V')
  if (expectRetained) await expect(input).toHaveValue(code)
}

async function expectRussianScreenText(page: Page) {
  await expect(page.locator('main.app-main h1')).toContainText(/[А-Яа-яЁё]/)
}

async function keyboardFocus(page: Page, selector: string) {
  const target = page.locator(selector)
  for (let index = 0; index < 40; index += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return target
    await page.keyboard.press('Tab')
  }
  throw new Error(`Keyboard tab order did not reach ${selector}.`)
}

async function layoutFacts(page: Page) {
  return page.evaluate(() => {
    const main = document.querySelector<HTMLElement>('main.app-main')
    const primary = main?.querySelector<HTMLElement>('button[type="submit"]')
      ?? [...(main?.querySelectorAll<HTMLButtonElement>('button') ?? [])].find((button) => !button.disabled)
    const rect = primary?.getBoundingClientRect()
    return {
      lang: document.documentElement.lang,
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
      primaryButton: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
    }
  })
}

test.describe('actual auth screens: sign in', () => {
  test('filled invalid credentials stay visible, with a safe error above the primary action', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'signin-invalid')
    try {
      const email = page.locator('input[autocomplete="email"]')
      const password = page.locator('input[autocomplete="current-password"]')
      await email.fill('viewer@example.invalid')
      await password.fill('wrong-fixture-password')
      await submitFirstForm(page)
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(email).toHaveValue('viewer@example.invalid')
      await expect(password).toHaveValue('wrong-fixture-password')
      const alertBox = await page.getByRole('alert').first().boundingBox()
      const submitBox = await page.locator('.auth-form button[type="submit"]').boundingBox()
      expect(alertBox && submitBox && alertBox.y < submitBox.y).toBe(true)
      await capture(page, 'signin-invalid-en-desktop.png')
      expect((await layoutFacts(page)).mabryLoaded).toBe(true)
    } finally {
      await context.close()
    }
  })

  test('password visibility and keyboard focus work in Russian at phone width', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'signin-password-visible', {
      locale: 'ru-RU',
      viewport: { width: 390, height: 844 },
    })
    try {
      const email = await keyboardFocus(page, 'input[autocomplete="email"]')
      expect(await email.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
      await page.locator('input[autocomplete="email"]').fill('mobile-user@example.invalid')
      const password = page.locator('input[autocomplete="current-password"]')
      await password.fill('visible-fixture-password')
      await page.locator('.auth-password-toggle').click()
      await expect(password).toHaveAttribute('type', 'text')
      const facts = await layoutFacts(page)
      await expectRussianScreenText(page)
      expect(facts.lang).toBe('ru')
      expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
      expect(facts.primaryButton?.height ?? 0).toBeGreaterThanOrEqual(48)
      expect(facts.mabryLoaded).toBe(true)
      await capture(page, 'signin-password-visible-ru-phone.png')
    } finally {
      await context.close()
    }
  })

  test('provider-return conflict is rendered as a safe notice', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'signin-provider-conflict')
    try {
      await page.locator('.auth-form > button').first().click()
      await expect(page.getByRole('alert').first()).toBeVisible()
      await capture(page, 'signin-provider-conflict-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('service failure and unavailable session confirmation are visible without losing entered data', async ({ browser }) => {
    const serviceScene = await openScene(browser, 'signin', 'signin-service-error')
    try {
      const email = serviceScene.page.locator('input[autocomplete="email"]')
      const password = serviceScene.page.locator('input[autocomplete="current-password"]')
      await email.fill('viewer@example.invalid')
      await password.fill('sample-password-123')
      await submitFirstForm(serviceScene.page)
      await expect(serviceScene.page.getByRole('alert').first()).toBeVisible()
      await expect(email).toHaveValue('viewer@example.invalid')
      await expect(password).toHaveValue('sample-password-123')
      await capture(serviceScene.page, 'signin-service-error-en-desktop.png')
    } finally {
      await serviceScene.context.close()
    }

    const sessionScene = await openScene(browser, 'signin', 'signin-session-unavailable')
    try {
      await sessionScene.page.locator('input[autocomplete="email"]').fill('viewer@example.invalid')
      await sessionScene.page.locator('input[autocomplete="current-password"]').fill('sample-password-123')
      await submitFirstForm(sessionScene.page)
      await expect(sessionScene.page.getByRole('status').first()).toBeVisible()
      await expect(sessionScene.page.locator('input[autocomplete="email"]')).toHaveValue('viewer@example.invalid')
      await capture(sessionScene.page, 'signin-session-unavailable-en-desktop.png')
    } finally {
      await sessionScene.context.close()
    }
  })

  test('submitting state is visible and disables duplicate form submission', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'signin-loading')
    try {
      await page.locator('input[autocomplete="email"]').fill('viewer@example.invalid')
      await page.locator('input[autocomplete="current-password"]').fill('sample-password-123')
      await submitFirstForm(page)
      await waitForCall(page, 'identity.signIn')
      const submit = page.locator('.auth-form button[type="submit"]')
      await expect(submit).toHaveAttribute('aria-busy', 'true')
      await expect(submit).toBeDisabled()
      await capture(page, 'signin-submitting-en-desktop.png')
    } finally {
      await release(page, 'identity.signIn')
      await context.close()
    }
  })

  test('the 767/768 breakpoint and 390 phone layout do not overflow', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'default', {
      viewport: { width: 390, height: 844 },
    })
    try {
      for (const width of [390, 767, 768]) {
        await page.setViewportSize({ width, height: 900 })
        const facts = await layoutFacts(page)
        expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
        if (width === 390) expect(facts.primaryButton?.height ?? 0).toBeGreaterThanOrEqual(48)
        await capture(page, `signin-responsive-${width}-en.png`)
      }
    } finally {
      await context.close()
    }
  })

  test('header locale changes update the real document language in both directions', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'signin', 'default')
    try {
      const locale = page.locator('.locale-control select')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await locale.selectOption('ru')
      await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
      await expectRussianScreenText(page)
      await locale.selectOption('en')
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      await expect(page.locator('main.app-main h1')).toContainText(/sign in/i)
      await capture(page, 'signin-locale-en-ru-en-document-language.png')
    } finally {
      await context.close()
    }
  })
})

test.describe('actual auth screens: registration', () => {
  test('OTP paste enters a real pending screen; known invalid code stays selected and resend stays unavailable', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'register', 'register-invalid-code')
    try {
      await startRegistration(page)
      const otp = page.locator('input[autocomplete="one-time-code"]')
      await expect(otp).toBeVisible()
      await expect(page.locator('.auth-form__actions button').first()).toBeDisabled()
      await capture(page, 'registration-code-pending-en-desktop.png')
      await pasteCode(page, '246810')
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(otp).toHaveValue('246810')
      const selection = await otp.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd])
      expect(selection).toEqual([0, 6])
      await capture(page, 'registration-invalid-code-retained-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('unknown verification remains a distinct pending state in Russian on phone', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'register', 'register-unknown-code', {
      locale: 'ru-RU',
      viewport: { width: 390, height: 844 },
    })
    try {
      await startRegistration(page)
      await pasteCode(page, '246810')
      await expect(page.getByRole('status').first()).toBeVisible()
      await expect(page.getByRole('button').filter({ hasText: /check|проверить/i }).first()).toBeVisible()
      const facts = await layoutFacts(page)
      await expectRussianScreenText(page)
      expect(facts.lang).toBe('ru')
      expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
      expect(facts.primaryButton?.height ?? 0).toBeGreaterThanOrEqual(48)
      await capture(page, 'registration-unknown-verification-ru-phone.png')
    } finally {
      await context.close()
    }
  })

  test('known account collision renders its recovery choice', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'register', 'register-collision')
    try {
      await startRegistration(page)
      await expect(page.locator('input[autocomplete="one-time-code"]')).toHaveCount(0)
      await expect(page.locator('main.app-main h2')).toBeVisible()
      await expect(page.getByRole('link').filter({ hasText: /sign in/i }).first()).toBeVisible()
      await capture(page, 'registration-collision-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('registration submission exposes a busy state', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'register', 'register-loading')
    try {
      await page.locator('input[autocomplete="email"]').fill('new-user@example.invalid')
      await page.locator('input[autocomplete="new-password"]').first().fill('sample-password-123')
      await submitFirstForm(page)
      await waitForCall(page, 'registration.start')
      await expect(page.locator('.auth-form[aria-busy="true"]')).toBeVisible()
      await capture(page, 'registration-submitting-en-desktop.png')
    } finally {
      await release(page, 'registration.start')
      await context.close()
    }
  })
})

test.describe('actual auth screens: password reset', () => {
  test('neutral request response, pending OTP, and resend-unavailable state render together', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'reset', 'reset-invalid-code')
    try {
      await startReset(page)
      const otp = page.locator('input[autocomplete="one-time-code"]')
      await expect(otp).toBeVisible()
      await expect(page.getByRole('status').first()).toBeVisible()
      await expect(page.locator('.auth-form__actions button').first()).toBeDisabled()
      await capture(page, 'reset-request-neutral-code-pending-en-desktop.png')
      await pasteCode(page, '246810')
      await expect(page.getByRole('alert').first()).toBeVisible()
      await expect(otp).toHaveValue('246810')
      const selection = await otp.evaluate((element: HTMLInputElement) => [element.selectionStart, element.selectionEnd])
      expect(selection).toEqual([0, 6])
      await capture(page, 'reset-invalid-code-retained-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('unknown verification has an explicit status-recovery state in Russian on phone', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'reset', 'reset-unknown-code', {
      locale: 'ru-RU',
      viewport: { width: 390, height: 844 },
    })
    try {
      await startReset(page)
      await pasteCode(page, '246810', false)
      await waitForCall(page, 'passwordReset.verify')
      await expect(page.getByRole('status').first()).toBeVisible()
      await expect(page.getByRole('button').filter({ hasText: /check|проверить/i }).first()).toBeVisible()
      const facts = await layoutFacts(page)
      await expectRussianScreenText(page)
      expect(facts.lang).toBe('ru')
      expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
      await capture(page, 'reset-unknown-verification-ru-phone.png')
    } finally {
      await context.close()
    }
  })

  test('field and service errors stay on the request screen', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'reset', 'reset-service-error')
    try {
      await submitFirstForm(page)
      await expect(page.locator('input[aria-invalid="true"]')).toHaveCount(1)
      await page.locator('input[autocomplete="email"]').fill('reset-user@example.invalid')
      await submitFirstForm(page)
      const alert = page.getByRole('alert').first()
      await expect(alert).toBeVisible()
      const alertBox = await alert.boundingBox()
      const submitBox = await page.locator('.auth-form button[type="submit"]').boundingBox()
      expect(alertBox && submitBox && alertBox.y < submitBox.y).toBe(true)
      await capture(page, 'reset-service-error-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('new-password submission exposes its loading state', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'reset', 'reset-complete-loading')
    try {
      await startReset(page)
      await pasteCode(page, '246810', false)
      await waitForCall(page, 'passwordReset.verify')
      const password = page.locator('#password-reset-new-password')
      const repeated = page.locator('#password-reset-repeat-password')
      await expect(password).toBeVisible()
      await password.fill('new-sample-password-123')
      await repeated.fill('new-sample-password-123')
      await submitFirstForm(page)
      await waitForCall(page, 'passwordReset.complete')
      const submit = page.locator('.auth-form button[type="submit"]')
      await expect(submit).toHaveAttribute('aria-busy', 'true')
      await capture(page, 'reset-password-submit-loading-en-desktop.png')
    } finally {
      await release(page, 'passwordReset.complete')
      await context.close()
    }
  })
})

test.describe('actual auth screens: account linking', () => {
  test('pending candidate proof keeps the final action out of reach until both proofs exist', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'link', 'link-candidate-pending')
    try {
      await expect(page.locator('#account-link-current-title')).toBeVisible()
      await expect(page.locator('#account-link-candidate-title')).toBeVisible()
      await expect(page.locator('input[autocomplete="one-time-code"]')).toBeVisible()
      await expect(page.locator('#account-link-review-title')).toHaveCount(0)
      await capture(page, 'link-candidate-pending-final-action-unavailable-en-desktop.png')
    } finally {
      await context.close()
    }
  })

  test('current proof rejection is shown without losing the proof field', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'link', 'link-invalid-proof', {
      locale: 'ru-RU',
      viewport: { width: 390, height: 844 },
    })
    try {
      const password = page.locator('input[autocomplete="current-password"]')
      await password.fill('wrong-current-proof')
      await page.locator('section[aria-labelledby="account-link-current-title"] form button[type="submit"]').click()
      await expect(password).toHaveAttribute('aria-invalid', 'true')
      const proofError = page.getByText('Текущий пароль неверен. Проверьте его и попробуйте ещё раз.')
      await expect(proofError).toBeVisible()
      const passwordBox = await password.boundingBox()
      const errorBox = await proofError.boundingBox()
      const submitBox = await page.locator('section[aria-labelledby="account-link-current-title"] form button[type="submit"]').boundingBox()
      expect(passwordBox && errorBox && submitBox
        && errorBox.y >= passwordBox.y + passwordBox.height
        && errorBox.y + errorBox.height <= submitBox.y).toBe(true)
      await expect(page.getByText('Сессия завершилась. Войдите, чтобы продолжить.')).toHaveCount(0)
      await expect(password).toHaveValue('wrong-current-proof')
      const facts = await layoutFacts(page)
      await expectRussianScreenText(page)
      expect(facts.lang).toBe('ru')
      expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }))
      await capture(page, 'link-invalid-current-proof-ru-phone.png')
    } finally {
      await context.close()
    }
  })

  test('final commit shows a stable loading state', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'link', 'link-review-loading')
    try {
      await expect(page.locator('#account-link-review-title')).toBeVisible()
      const commit = page.locator('section[aria-labelledby="account-link-review-title"] button').first()
      await commit.click()
      await waitForCall(page, 'accountLinking.commit')
      await expect(commit).toHaveAttribute('aria-busy', 'true')
      await capture(page, 'link-final-action-loading-en-desktop.png')
    } finally {
      await release(page, 'accountLinking.commit')
      await context.close()
    }
  })

  test('commit conflict and unknown outcome remain visible for recovery', async ({ browser }) => {
    const conflict = await openScene(browser, 'link', 'link-commit-conflict')
    try {
      await conflict.page.locator('section[aria-labelledby="account-link-review-title"] button').first().click()
      await expect(conflict.page.getByRole('status').first()).toBeVisible()
      await capture(conflict.page, 'link-commit-conflict-en-desktop.png')
    } finally {
      await conflict.context.close()
    }

    const unknown = await openScene(browser, 'link', 'link-commit-unknown', {
      locale: 'ru-RU',
      viewport: { width: 390, height: 844 },
    })
    try {
      await unknown.page.locator('section[aria-labelledby="account-link-review-title"] button').first().click()
      await expect(unknown.page.getByRole('status').first()).toBeVisible()
      await expectRussianScreenText(unknown.page)
      await expect(unknown.page.locator('html')).toHaveAttribute('lang', 'ru')
      await capture(unknown.page, 'link-commit-unknown-ru-phone.png')
    } finally {
      await unknown.context.close()
    }
  })

  test('cancel returns to candidate setup so the user can correct the candidate and restart', async ({ browser }) => {
    const { context, page } = await openScene(browser, 'link', 'link-cancel')
    try {
      const cancel = page.getByRole('button').filter({ hasText: /cancel|отмена/i }).first()
      await cancel.click()
      await expect(page.getByRole('status').first()).toBeVisible()
      await expect(page.locator('#account-link-start-title')).toBeVisible()
      await expect(page.locator('input[autocomplete="email"]')).toBeVisible()
      await capture(page, 'link-cancel-candidate-correction-en-desktop.png')
    } finally {
      await context.close()
    }
  })
})
