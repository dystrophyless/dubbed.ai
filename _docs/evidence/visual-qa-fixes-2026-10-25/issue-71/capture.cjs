const { chromium } = require(require('path').join(__dirname, '..', '..', '..', '..', 'frontend', 'node_modules', 'playwright'))
const fs = require('fs')
const path = require('path')

const repo = path.resolve(__dirname, '..', '..', '..', '..')
const output = path.join(__dirname, 'evidence')
const base = 'http://127.0.0.1:4571'
const metrics = []
const events = []
const pageErrors = []
fs.mkdirSync(output, { recursive: true })

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function capture(page, name, scenario) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(100)
  const screenshot = path.join(output, `${name}.png`)
  await page.screenshot({ path: screenshot, fullPage: true })
  const measured = await page.evaluate(() => {
    const box = (element) => {
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        fontWeight: style.fontWeight,
      }
    }
    const primary = document.querySelector('.auth-form__actions > button[data-slot="button"]')
    const dismiss = document.querySelector('.ui-notice--success button.ui-button--icon')
    const otpCell = document.querySelector('.otp-control__cell')
    const otpInput = document.querySelector('.otp-control__input')
    const active = document.activeElement
    const historyUserState = window.history.state && typeof window.history.state === 'object'
      ? window.history.state.usr
      : null
    const bodyText = document.body.innerText
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      page: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      active: { tag: active?.tagName ?? null, id: active?.id ?? null, label: active?.getAttribute('aria-label') ?? null },
      loadedFonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => ({ family: font.family, weight: font.weight })),
      primary: primary ? box(primary) : null,
      completionDismiss: dismiss ? box(dismiss) : null,
      passwordFields: [...document.querySelectorAll('#password-reset-new-password, #password-reset-repeat-password')].map((field) => ({
        id: field.id,
        type: field.type,
        valueLength: field.value.length,
        focused: field === active,
        box: box(field),
      })),
      visibilityControls: [...document.querySelectorAll('#password-reset-new-password, #password-reset-repeat-password')].map((field) => {
        const button = field.parentElement?.parentElement?.querySelector('button[aria-pressed]')
        return button ? { field: field.id, pressed: button.getAttribute('aria-pressed'), size: button.getAttribute('data-size'), box: box(button) } : null
      }).filter(Boolean),
      otp: otpCell ? { cell: box(otpCell), digits: { fontSize: getComputedStyle(otpCell).fontSize, lineHeight: getComputedStyle(otpCell).lineHeight }, input: otpInput ? box(otpInput) : null, selection: otpInput ? [otpInput.selectionStart, otpInput.selectionEnd] : null } : null,
      codeInstructionCount: [...document.querySelectorAll('.auth-panel__heading p, .auth-form p')].filter((node) => /six-digit reset code|шестизначный код сброса/i.test(node.textContent || '')).length,
      completionNoticeTextPresent: bodyText.includes('Password changed. You’re signed in on this device. Other sessions were signed out.') || bodyText.includes('Пароль изменён. На этом устройстве выполнен вход. Остальные сеансы завершены.'),
      historyUserState: historyUserState && typeof historyUserState === 'object' ? historyUserState : historyUserState,
      destinationNoticeInHistory: Boolean(historyUserState && typeof historyUserState === 'object' && Object.prototype.hasOwnProperty.call(historyUserState, 'destinationNotice')),
    }
  })
  assert(!measured.horizontalOverflow, `${name}: horizontal page overflow`)
  metrics.push({ name, scenario, url: page.url(), screenshot: path.relative(__dirname, screenshot), measured })
  return measured
}

async function seedIdentity(page, email, locale) {
  return page.evaluate(async ({ email, locale }) => {
    const { createServices } = await import('/src/services/index.ts')
    const services = createServices()
    const start = await services.registration.start({
      email,
      password: 'synthetic-password-71',
      operationId: crypto.randomUUID(),
    })
    if (start.status !== 'ok') throw new Error(`synthetic setup start failed: ${start.status}`)
    const verified = await services.registration.verify({
      requestId: start.data.id,
      code: start.data.scenarioCode.value,
      operationId: crypto.randomUUID(),
    })
    if (verified.status !== 'ok') throw new Error(`synthetic setup verify failed: ${verified.status}`)
    if (locale === 'ru') {
      const localized = await services.account.setLocale({
        locale: 'ru',
        expectedRevision: verified.data.account.revision,
        operationId: crypto.randomUUID(),
      })
      if (localized.status !== 'ok') throw new Error(`synthetic setup locale failed: ${localized.status}`)
    }
    const signedOut = await services.identity.signOut({ operationId: crypto.randomUUID() })
    if (signedOut.status !== 'ok') throw new Error(`synthetic setup sign out failed: ${signedOut.status}`)
    return { setup: 'synthetic verified identity created through the centralized mock facade and then signed out', locale }
  }, { email, locale })
}

async function createContext(browser, { locale, width, height, name }) {
  const context = await browser.newContext({ locale: locale === 'ru' ? 'ru-RU' : 'en-US', viewport: { width, height } })
  if (locale === 'ru') {
    await context.addInitScript(() => localStorage.setItem('dubbed.locale', 'ru'))
  }
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push({ name, error: error.message }))
  await page.goto(`${base}/reset-password`)
  await page.locator('#password-reset-email').waitFor()
  return { context, page }
}

async function nativeJourney(browser, { locale, width, height, name, finish = true }) {
  const { context, page } = await createContext(browser, { locale, width, height, name })
  await capture(page, `${name}-request`, 'native mock request form')
  const email = `qa71-${name}-20261025@example.test`
  events.push({ name, setup: await seedIdentity(page, email, locale), email, delivery: 'local mock code only; no email sent' })
  await page.locator('#password-reset-email').fill(email)
  await page.locator('button[type="submit"]').click()
  await page.locator('.otp-control__input').waitFor()
  await capture(page, `${name}-code`, 'native mock code entry')
  const instructionCount = await page.evaluate(() => [...document.querySelectorAll('.auth-panel__heading p, .auth-form p')]
    .filter((node) => /six-digit reset code|шестизначный код сброса/i.test(node.textContent || '')).length)
  assert(instructionCount === 1, `${name}: code instruction rendered ${instructionCount} times`)
  const codeMessage = await page.locator('.ui-notice').allTextContents()
  const localCodeText = codeMessage.find((text) => /Local mock code:|Локальный код-мок:/.test(text))
  const localCode = localCodeText?.match(/(?:Local mock code:|Локальный код-мок:)\s*(\d{6})/)?.[1]
  assert(Boolean(localCode), `${name}: local mock code was not visible`)
  const wrongCode = localCode === '999999' ? '888888' : '999999'
  await page.locator('.otp-control__input').fill(wrongCode)
  await page.locator('#password-reset-code-error').waitFor()
  const invalid = await capture(page, `${name}-invalid-code`, 'native mock invalid code; corrected value is retained and selected')
  assert(invalid.otp?.selection?.[0] === 0 && invalid.otp?.selection?.[1] === 6, `${name}: invalid code was not selected for correction`)
  assert(invalid.otp.digits.fontSize === '15px' && invalid.otp.digits.lineHeight === '24px', `${name}: OTP typography does not consume the shared #82 correction`)
  await page.locator('.otp-control__input').fill(localCode)
  await page.locator('#password-reset-new-password').waitFor()
  const labels = locale === 'ru'
    ? { new: 'Видимость нового пароля', repeat: 'Видимость повторного пароля', show: 'Показать пароль' }
    : { new: 'New password visibility', repeat: 'Repeat password visibility', show: 'Show password' }
  await page.locator('#password-reset-new-password').fill('sample-pass-71')
  await page.locator('#password-reset-repeat-password').fill('sample-pass-71')
  const firstToggle = page.getByRole('button', { name: labels.new })
  const secondToggle = page.getByRole('button', { name: labels.repeat })
  await firstToggle.click()
  assert(await page.locator('#password-reset-new-password').getAttribute('type') === 'text', `${name}: first visibility control did not reveal its field`)
  assert(await page.locator('#password-reset-repeat-password').getAttribute('type') === 'password', `${name}: first visibility control affected the repeat field`)
  assert(await page.locator('#password-reset-new-password').inputValue() === 'sample-pass-71', `${name}: first toggle changed the new password value`)
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === labels.new, `${name}: first toggle lost keyboard focus`)
  await secondToggle.click()
  assert(await page.locator('#password-reset-new-password').getAttribute('type') === 'text', `${name}: second visibility control affected the first field`)
  assert(await page.locator('#password-reset-repeat-password').getAttribute('type') === 'text', `${name}: second visibility control did not reveal its field`)
  assert(await page.locator('#password-reset-repeat-password').inputValue() === 'sample-pass-71', `${name}: second toggle changed the repeat password value`)
  assert(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')) === labels.repeat, `${name}: second toggle lost keyboard focus`)
  await capture(page, `${name}-password-visible`, 'both independent password values are visible')
  await firstToggle.click()
  await secondToggle.click()
  await capture(page, `${name}-password`, 'native mock password form with independent hidden controls')
  if (!finish) {
    await context.close()
    return
  }
  await page.locator('#password-reset-new-password').fill('abcdefgh')
  await page.locator('#password-reset-repeat-password').fill('abcdefgi')
  await page.locator('button[type="submit"]').click()
  await page.getByText(locale === 'ru' ? 'Пароли не совпадают.' : 'The passwords do not match.', { exact: true }).waitFor()
  await capture(page, `${name}-mismatch`, 'native mock mismatch feedback')
  await page.locator('#password-reset-repeat-password').fill('abcdefgh')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/new')
  const completion = locale === 'ru'
    ? 'Пароль изменён. На этом устройстве выполнен вход. Остальные сеансы завершены.'
    : 'Password changed. You’re signed in on this device. Other sessions were signed out.'
  await page.getByText(completion, { exact: true }).waitFor()
  await page.waitForFunction(() => {
    const state = window.history.state && typeof window.history.state === 'object' ? window.history.state.usr : null
    return !state || typeof state !== 'object' || !Object.prototype.hasOwnProperty.call(state, 'destinationNotice')
  })
  const completed = await capture(page, `${name}-success-destination`, 'native mock reset completion on the existing New dub destination')
  assert(completed.completionNoticeTextPresent, `${name}: destination lacks truthful completion/session feedback`)
  assert(!completed.destinationNoticeInHistory, `${name}: one-use completion marker remains in history state`)
  events.push({ name, destination: page.url(), notice: 'localized completion status shown after reset success and signed-in refresh; transient marker stripped' })
  await context.close()
}

async function controlledFault(browser, { scenario, locale, width, height, name }) {
  const context = await browser.newContext({ locale, viewport: { width, height } })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push({ name, error: error.message }))
  await page.goto(`${base}/e2e/harness/auth-state-visual.html?screen=reset&scenario=${scenario}`)
  await page.locator('#password-reset-email').fill('controlled@example.invalid')
  await page.locator('button[type="submit"]').click()
  if (scenario !== 'reset-service-error') {
    await page.locator('.otp-control__input').fill('246810')
    if (scenario === 'reset-complete-loading') {
      await page.locator('#password-reset-new-password').fill('abcdefgh')
      await page.locator('#password-reset-repeat-password').fill('abcdefgh')
      await page.locator('button[type="submit"]').click()
    }
  }
  await page.waitForTimeout(300)
  await capture(page, name, `controlled harness fault: ${scenario}`)
  events.push({ name, controlledHarness: scenario, calls: await page.evaluate(() => window.__authStateVisual.calls) })
  await context.close()
}

;(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
  try {
    await nativeJourney(browser, { locale: 'en', width: 1440, height: 900, name: 'en-desktop' })
    await nativeJourney(browser, { locale: 'en', width: 1440, height: 700, name: 'en-short' })
    await nativeJourney(browser, { locale: 'ru', width: 1440, height: 900, name: 'ru-desktop' })
    await nativeJourney(browser, { locale: 'ru', width: 390, height: 844, name: 'ru-phone390' })

    const { context, page } = await createContext(browser, { locale: 'en', width: 1024, height: 844, name: 'breakpoint' })
    await seedIdentity(page, 'qa71-breakpoint-20261025@example.test', 'en')
    await page.locator('#password-reset-email').fill('qa71-breakpoint-20261025@example.test')
    await page.locator('button[type="submit"]').click()
    await page.locator('.otp-control__input').waitFor()
    for (const width of [767, 768]) {
      await page.setViewportSize({ width, height: 844 })
      const measured = await capture(page, `code-en-${width}`, 'native mock code screen at responsive breakpoint')
      assert(!measured.horizontalOverflow, `code-en-${width}: horizontal overflow`)
    }
    await context.close()

    await controlledFault(browser, { scenario: 'reset-service-error', locale: 'en-US', width: 1440, height: 700, name: 'controlled-request-error-en-short' })
    await controlledFault(browser, { scenario: 'reset-unknown-code', locale: 'ru-RU', width: 390, height: 844, name: 'controlled-unknown-code-ru-phone390' })
    await controlledFault(browser, { scenario: 'reset-complete-loading', locale: 'en-US', width: 1440, height: 700, name: 'controlled-completion-loading-en-short' })
  } finally {
    await browser.close()
  }
  fs.writeFileSync(path.join(__dirname, 'metrics.json'), JSON.stringify(metrics, null, 2))
  fs.writeFileSync(path.join(__dirname, 'capture-log.json'), JSON.stringify({ events, pageErrors }, null, 2))
  console.log(JSON.stringify({ screenshots: metrics.length, scenarios: events.length, pageErrors: pageErrors.length }))
})().catch((error) => {
  fs.writeFileSync(path.join(__dirname, 'capture-error.txt'), error.stack || String(error))
  console.error(error)
  process.exitCode = 1
})
