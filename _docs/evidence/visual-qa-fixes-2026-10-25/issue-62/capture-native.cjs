const { chromium } = require(require('node:path').resolve(__dirname, '../../../../frontend/node_modules/playwright'))
const fs = require('node:fs')
const path = require('node:path')

const base = 'http://127.0.0.1:4562'
const screenshots = path.join(__dirname, 'screenshots')
const email = 'qa62-account-owner-with-long-mobile-display@example.invalid'
const password = 'Qa62-local-only!'
const metrics = {
  date: new Date().toISOString(),
  fixture: 'Disposable browser context, native local mock identity only; example.invalid email; no email or external service used.',
  origin: base,
  screenshots: [],
  checks: {},
  pageErrors: [],
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  metrics.browserVersion = browser.version()
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US' })
    const page = await context.newPage()
    page.setDefaultTimeout(15_000)
    page.on('pageerror', (error) => metrics.pageErrors.push(error.message))

    const capture = async (name, fullPage = false) => {
      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(100)
      const state = await page.evaluate(() => {
        const rect = (element) => {
          const box = element.getBoundingClientRect()
          const style = getComputedStyle(element)
          return {
            text: (element.innerText || element.getAttribute('aria-label') || '').slice(0, 100),
            tag: element.tagName,
            x: Math.round(box.x),
            y: Math.round(box.y),
            width: Math.round(box.width),
            height: Math.round(box.height),
            fontSize: style.fontSize,
            lineHeight: style.lineHeight,
            fontFamily: style.fontFamily,
            disabled: 'disabled' in element ? element.disabled : false,
          }
        }
        const current = document.querySelector('input[autocomplete="current-password"]')
        const next = document.querySelector('input[autocomplete="new-password"]')
        const identity = document.querySelector('#account-delete-identity')
        const section = document.querySelector('.account-screen__section')
        const sectionStyle = section ? getComputedStyle(section) : null
        return {
          url: location.pathname,
          language: document.documentElement.lang,
          viewport: { width: innerWidth, height: innerHeight },
          document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
          sectionLayout: sectionStyle ? {
            gridTemplateColumns: sectionStyle.gridTemplateColumns,
            gap: sectionStyle.gap,
            paddingTop: sectionStyle.paddingTop,
            paddingBottom: sectionStyle.paddingBottom,
          } : null,
          fontLoaded: document.fonts.check('16px "Mabry Pro"'),
          controls: [...document.querySelectorAll('main button, main select, main input, [role="dialog"] button, [role="dialog"] input')].map(rect),
          actions: [...document.querySelectorAll('.account-screen__password-actions > button, .account-screen__session-action > button, .account-screen__delete-action > button, .account-screen__dialog-actions > button')].map(rect),
          passwordInputTops: current && next
            ? { current: Math.round(current.getBoundingClientRect().top), next: Math.round(next.getBoundingClientRect().top), difference: Math.round(current.getBoundingClientRect().top - next.getBoundingClientRect().top) }
            : null,
          disclosures: [...document.querySelectorAll('.account-screen__dialog-description, .account-screen__delete-impact')].map((element) => {
            const style = getComputedStyle(element)
            return { text: element.innerText, fontSize: style.fontSize, lineHeight: style.lineHeight, fontFamily: style.fontFamily }
          }),
          deleteIdentity: identity ? {
            text: identity.innerText,
            width: Math.round(identity.getBoundingClientRect().width),
            scrollWidth: identity.scrollWidth,
            clientWidth: identity.clientWidth,
            overflowWrap: getComputedStyle(identity).overflowWrap,
          } : null,
        }
      })
      const file = path.join(screenshots, `${name}.png`)
      await page.screenshot({ path: file, fullPage, animations: 'disabled' })
      metrics.screenshots.push({ name, file: path.relative(__dirname, file), fullPage, ...state })
      console.log(`captured ${name}`)
      return state
    }

    const openAccount = async () => {
      await page.goto(`${base}/account`)
      await page.locator('.account-screen__methods').waitFor()
      await page.evaluate(() => scrollTo(0, 0))
    }

    await page.goto(`${base}/`)
    await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    const codeNotice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
    await codeNotice.waitFor()
    const code = (await codeNotice.innerText()).match(/\b\d{6}\b/)[0]
    await page.getByLabel('6-digit verification code').fill(code)
    await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
    metrics.checks.registration = 'Native mock registration used a synthetic example.invalid email and the code visibly supplied by the local mock UI.'
    await openAccount()
    const desktopState = await capture('account-en-desktop-1440x900')
    const desktopDeleteAction = desktopState.actions.find((action) => action.text === 'Delete account')
    metrics.checks.desktopSecurityAction = {
      deleteY: desktopDeleteAction?.y ?? null,
      withinInitialViewport: desktopDeleteAction ? desktopDeleteAction.y < desktopState.viewport.height : false,
    }
    if (!metrics.checks.desktopSecurityAction.withinInitialViewport) {
      throw new Error('Delete account is not discoverable within the initial 900px desktop viewport.')
    }
    await capture('account-en-full-1440x900', true)

    await page.setViewportSize({ width: 1440, height: 700 })
    await page.evaluate(() => scrollTo(0, 0))
    await capture('account-en-short-1440x700')

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.getByLabel('Current password', { exact: true }).fill('wrong-current-local-only')
    await page.getByLabel('New password', { exact: true }).fill('Qa62-next-local!')
    await page.getByRole('button', { name: 'Save password', exact: true }).click()
    await page.getByText('Current password is incorrect. Check it and try again.', { exact: true }).waitFor()
    metrics.checks.wrongPassword = {
      fieldError: 'Rendered under Current password after identity.current confirmed the same valid session.',
      currentValueRetained: (await page.getByLabel('Current password', { exact: true }).inputValue()).length > 0,
      newValueRetained: (await page.getByLabel('New password', { exact: true }).inputValue()).length > 0,
      falseSessionEndedCopy: await page.getByText('Your session ended. Sign in to continue.', { exact: true }).count(),
    }
    await capture('password-error-en-desktop-1440x900')

    await page.locator('#account-locale').selectOption('ru')
    await page.waitForFunction(() => document.documentElement.lang === 'ru' && !document.querySelector('#account-locale')?.getAttribute('aria-busy'))
    await page.getByText('Неверный текущий пароль. Проверьте его и попробуйте ещё раз.', { exact: true }).waitFor()
    await capture('password-error-ru-desktop-1440x900')
    await page.getByLabel('Текущий пароль', { exact: true }).fill('')
    await page.getByLabel('Новый пароль', { exact: true }).fill('')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => scrollTo(0, 0))
    await capture('account-ru-desktop-1440x900')

    await page.setViewportSize({ width: 768, height: 844 })
    await page.evaluate(() => scrollTo(0, 0))
    await capture('account-ru-breakpoint-768x844', true)
    const aligned768 = await page.evaluate(() => {
      const current = document.querySelector('input[autocomplete="current-password"]')
      const next = document.querySelector('input[autocomplete="new-password"]')
      return current && next ? Math.abs(current.getBoundingClientRect().top - next.getBoundingClientRect().top) : null
    })
    metrics.checks.passwordAlignmentAt768 = { inputTopDifference: aligned768 }

    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => scrollTo(0, 0))
    const phoneState = await capture('account-ru-phone390x844', true)
    const phoneGridColumns = phoneState.sectionLayout?.gridTemplateColumns.trim().split(/\s+/).length ?? 0
    metrics.checks.phoneResponsiveLayout = {
      width: phoneState.document.width,
      viewportWidth: phoneState.viewport.width,
      gridTemplateColumns: phoneState.sectionLayout?.gridTemplateColumns ?? null,
      gap: phoneState.sectionLayout?.gap ?? null,
      paddingTop: phoneState.sectionLayout?.paddingTop ?? null,
      noHorizontalOverflow: phoneState.document.width === phoneState.viewport.width,
    }
    if (phoneGridColumns !== 1 || phoneState.sectionLayout?.gap !== '16px' || phoneState.sectionLayout?.paddingTop !== '22px' || !metrics.checks.phoneResponsiveLayout.noHorizontalOverflow) {
      throw new Error('Account phone section layout must be one column, 16px gap, 22px vertical padding and have no horizontal overflow.')
    }
    await page.locator('#account-delete-trigger').click()
    await page.getByRole('dialog').waitFor()
    await capture('delete-dialog-ru-long-identity-phone390x844')
    const ruDialogEmail = await page.locator('#account-delete-identity').innerText()
    metrics.checks.ruDeleteIdentity = {
      text: ruDialogEmail,
      emailIncluded: ruDialogEmail.includes(email),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    }
    await page.keyboard.press('Escape')
    metrics.checks.escapeRestoresDeleteFocus = await page.locator('#account-delete-trigger').evaluate((element) => document.activeElement === element)

    await page.locator('#account-locale').selectOption('en')
    await page.waitForFunction(() => document.documentElement.lang === 'en' && !document.querySelector('#account-locale')?.getAttribute('aria-busy'))
    await page.locator('#account-delete-trigger').click()
    await page.getByRole('dialog').waitFor()
    await capture('delete-dialog-en-long-identity-phone390x844')
    const enDialogEmail = await page.locator('#account-delete-identity').innerText()
    metrics.checks.enDeleteIdentity = {
      text: enDialogEmail,
      emailIncluded: enDialogEmail.includes(email),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    }
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.evaluate(() => scrollTo(0, 0))
    await page.locator('#account-delete-trigger').click()
    await page.getByRole('dialog').waitFor()
    await capture('delete-dialog-en-desktop-1440x900')
    const deleteToken = page.getByLabel('Type DELETE to confirm', { exact: true })
    const deleteSubmit = page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true })
    metrics.checks.enTokenValidation = {}
    for (const value of ['УДАЛИТЬ', 'DEL ETE', 'DELETE!', ' delete ']) {
      await deleteToken.fill(value)
      metrics.checks.enTokenValidation[value] = await deleteSubmit.isEnabled()
    }
    await page.keyboard.press('Escape')
    metrics.checks.escapeRestoresDeleteFocus = await page.locator('#account-delete-trigger').evaluate((element) => document.activeElement === element)

    await openAccount()
    await page.locator('#account-delete-trigger').click()
    await page.getByLabel('Type DELETE to confirm', { exact: true }).fill(' delete ')
    await page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).click()
    await page.getByText('This account was deleted.', { exact: true }).waitFor()
    metrics.checks.disposableDeletion = {
      path: new URL(page.url()).pathname,
      result: 'The disposable local mock account reached the ordinary signed-out deleted-account landing. No real account/service was used.',
    }
    await capture('disposable-local-mock-deletion-result')
    await context.close()
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  metrics.fatal = String(error.stack || error)
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  fs.writeFileSync(path.join(__dirname, 'native-browser-metrics.json'), JSON.stringify(metrics, null, 2))
})
