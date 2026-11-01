const { chromium } = require(require('node:path').resolve(__dirname, '../../../../frontend/node_modules/playwright'))
const fs = require('node:fs')
const path = require('node:path')

const base = 'http://127.0.0.1:4562'
const screenshots = path.join(__dirname, 'screenshots')
const metrics = {
  date: new Date().toISOString(),
  fixture: 'Existing controlled workspace-state-visual facade; held/error/unknown outcomes are synthetic UI results, not persistent account operations.',
  origin: base,
  states: [],
  pageErrors: [],
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  metrics.browserVersion = browser.version()
  try {
    const scenarios = [
      { name: 'locale-pending-en-to-ru-desktop', scenario: 'account-locale-pending', locale: 'en', next: 'ru', width: 1440, height: 700 },
      { name: 'locale-failure-en-restored-desktop', scenario: 'account-locale-failure', locale: 'en', next: 'ru', width: 1440, height: 900 },
      { name: 'locale-failure-ru-restored-phone390', scenario: 'account-locale-failure', locale: 'ru', next: 'en', width: 390, height: 844 },
      { name: 'delete-error-en-phone390', scenario: 'account-delete-error', locale: 'en', width: 390, height: 844, token: 'DELETE' },
      { name: 'delete-error-ru-phone390', scenario: 'account-delete-error', locale: 'ru', width: 390, height: 844, token: 'УДАЛИТЬ' },
      { name: 'delete-unknown-en-desktop', scenario: 'account-delete-unknown', locale: 'en', width: 1440, height: 900, token: 'DELETE' },
    ]
    for (const fixture of scenarios) {
      const context = await browser.newContext({ viewport: { width: fixture.width, height: fixture.height }, locale: fixture.locale === 'ru' ? 'ru-RU' : 'en-US' })
      const page = await context.newPage()
      page.setDefaultTimeout(15_000)
      page.on('pageerror', (error) => metrics.pageErrors.push(`${fixture.name}: ${error.message}`))
      await page.goto(`${base}/e2e/harness/workspace-state-visual.html?screen=account&scenario=${fixture.scenario}&locale=${fixture.locale}`)
      await page.locator('.account-screen__methods').waitFor()
      let localeRollbackCopyCheck = null

      if (fixture.next) {
        await page.locator('#account-locale').selectOption(fixture.next)
        await page.waitForFunction(() => window.__workspaceStateVisual?.calls.includes('account.setLocale'))
        if (fixture.scenario === 'account-locale-pending') {
          await page.waitForFunction(() => document.querySelector('#account-locale')?.getAttribute('aria-busy') === 'true')
        } else {
          await page.getByRole('alert').waitFor()
          await page.waitForTimeout(150)
          const failureBody = await page.locator('body').innerText()
          const expectedCurrentLocaleCopy = fixture.locale === 'en'
            ? 'English is still selected.'
            : 'Сейчас выбран язык «Русский».'
          const sharedEnglishRestoredCopy = fixture.locale === 'en'
            ? 'The language saved in your account has been restored.'
            : null
          localeRollbackCopyCheck = {
            expectedCurrentLocaleCopy,
            currentLocaleCopyPresent: failureBody.includes(expectedCurrentLocaleCopy),
            sharedRestoredCopy: sharedEnglishRestoredCopy,
            sharedRestoredCopyPresent: sharedEnglishRestoredCopy ? failureBody.includes(sharedEnglishRestoredCopy) : null,
            staleChangedHereCopyAbsent: !/language changed here|язык изменился здесь/i.test(failureBody),
          }
          if (!localeRollbackCopyCheck.currentLocaleCopyPresent || (sharedEnglishRestoredCopy && !localeRollbackCopyCheck.sharedRestoredCopyPresent)) {
            throw new Error(`${fixture.name}: expected truthful rollback copy was not rendered. Page text: ${failureBody}`)
          }
          if (!localeRollbackCopyCheck.staleChangedHereCopyAbsent) {
            throw new Error(`${fixture.name}: stale locale rollback announcement remains in the page body.`)
          }
        }
      } else {
        await page.locator('#account-delete-trigger').click()
        const dialog = page.getByRole('dialog')
        await dialog.waitFor()
        const tokenLabel = fixture.locale === 'ru' ? 'Введите УДАЛИТЬ для подтверждения' : 'Type DELETE to confirm'
        const confirmLabel = fixture.locale === 'ru' ? 'Удалить аккаунт' : 'Delete account'
        await page.getByLabel(tokenLabel, { exact: true }).fill(fixture.token)
        await dialog.getByRole('button', { name: confirmLabel, exact: true }).click()
        await dialog.getByRole('alert').waitFor()
      }

      await page.evaluate(() => document.fonts.ready)
      await page.waitForTimeout(100)
      const state = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        const locale = document.querySelector('#account-locale')
        return {
          language: document.documentElement.lang,
          viewport: { width: innerWidth, height: innerHeight },
          document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
          visibleText: document.body.innerText,
          localeControl: locale ? { value: locale.value, busy: locale.getAttribute('aria-busy'), disabled: locale.disabled } : null,
          fontLoaded: document.fonts.check('16px "Mabry Pro"'),
          controls: [...document.querySelectorAll('main button, main select, [role="dialog"] button, [role="dialog"] input')].map((element) => {
            const box = element.getBoundingClientRect()
            const style = getComputedStyle(element)
            return { text: (element.innerText || '').slice(0, 80), height: Math.round(box.height), fontSize: style.fontSize, disabled: 'disabled' in element ? element.disabled : false }
          }),
          disclosureTypography: [...document.querySelectorAll('.account-screen__dialog-description,.account-screen__delete-impact')].map((element) => ({ fontSize: getComputedStyle(element).fontSize, lineHeight: getComputedStyle(element).lineHeight })),
          dialog: dialog ? { text: dialog.innerText, describedBy: dialog.getAttribute('aria-describedby') } : null,
          callTrace: window.__workspaceStateVisual?.calls ?? [],
        }
      })
      if (localeRollbackCopyCheck) state.localeRollbackCopyCheck = localeRollbackCopyCheck
      const imageName = `fixture-${fixture.name}`
      const file = path.join(screenshots, `${imageName}.png`)
      await page.screenshot({ path: file, animations: 'disabled' })
      metrics.states.push({ name: fixture.name, screenshot: path.relative(__dirname, file), ...state })
      console.log(`captured ${imageName}`)
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  metrics.fatal = String(error.stack || error)
  console.error(error)
  process.exitCode = 1
}).finally(() => {
  fs.writeFileSync(path.join(__dirname, 'fixture-browser-metrics.json'), JSON.stringify(metrics, null, 2))
})
