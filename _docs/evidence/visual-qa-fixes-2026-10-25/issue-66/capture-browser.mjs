import { chromium } from '../../../../frontend/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const evidenceDir = dirname(fileURLToPath(import.meta.url))
const origin = 'http://127.0.0.1:4566'
const cases = [
  ...['en-US', 'ru-RU'].flatMap((locale) => [
    { name: `pending-${locale.slice(0, 2)}-desktop-1440`, scenario: 'link-candidate-pending', locale, viewport: { width: 1440, height: 960 }, fullPage: true },
    { name: `pending-${locale.slice(0, 2)}-phone-390`, scenario: 'link-candidate-pending', locale, viewport: { width: 390, height: 844 }, fullPage: true },
  ]),
  { name: 'pending-en-short-desktop-1280x640', scenario: 'link-candidate-pending', locale: 'en-US', viewport: { width: 1280, height: 640 }, fullPage: false, alsoFullPage: true },
  { name: 'pending-en-breakpoint-767', scenario: 'link-candidate-pending', locale: 'en-US', viewport: { width: 767, height: 900 }, fullPage: true },
  { name: 'pending-en-breakpoint-768', scenario: 'link-candidate-pending', locale: 'en-US', viewport: { width: 768, height: 900 }, fullPage: true },
  { name: 'review-en-desktop-1440', scenario: 'link-review-loading', locale: 'en-US', viewport: { width: 1440, height: 960 }, fullPage: true },
  { name: 'review-ru-desktop-1440', scenario: 'link-review-loading', locale: 'ru-RU', viewport: { width: 1440, height: 960 }, fullPage: true },
  { name: 'review-ru-phone-390', scenario: 'link-review-loading', locale: 'ru-RU', viewport: { width: 390, height: 844 }, fullPage: true },
  { name: 'conflict-en-desktop-1440', scenario: 'link-commit-conflict', locale: 'en-US', viewport: { width: 1440, height: 960 }, action: 'conflict', fullPage: true },
  { name: 'conflict-ru-phone-390', scenario: 'link-commit-conflict', locale: 'ru-RU', viewport: { width: 390, height: 844 }, action: 'conflict', fullPage: true },
  { name: 'unknown-en-short-desktop-1280x640', scenario: 'link-commit-unknown', locale: 'en-US', viewport: { width: 1280, height: 640 }, action: 'unknown', fullPage: false },
  { name: 'success-en-desktop-1440', scenario: 'link-review-loading', locale: 'en-US', viewport: { width: 1440, height: 960 }, action: 'success', fullPage: true },
]

const browser = await chromium.launch({
  headless: true,
  args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const measurements = []
const failures = []

try {
  await mkdir(evidenceDir, { recursive: true })
  for (const scene of cases) {
    const context = await browser.newContext({
      locale: scene.locale,
      viewport: scene.viewport,
      colorScheme: 'light',
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(`${origin}/e2e/harness/auth-state-visual.html?screen=link&scenario=${scene.scenario}`)
    await page.locator('main.app-main h1').waitFor()
    await page.evaluate(() => document.fonts.ready)

    if (scene.action === 'conflict' || scene.action === 'unknown' || scene.action === 'success') {
      await page.locator('#account-link-review-title').waitFor()
      await page.locator('.account-linking-screen__review button').first().click()
      await page.waitForFunction(() => window.__authStateVisual?.calls.includes('accountLinking.commit'))
      if (scene.action === 'conflict') {
        await page.locator('.account-linking-screen__conflict-notice').waitFor()
      } else if (scene.action === 'unknown') {
        await page.getByRole('button', { name: scene.locale === 'ru-RU' ? 'Проверить состояние' : 'Check status' }).waitFor()
      } else {
        await page.evaluate(() => window.__authStateVisual?.release('accountLinking.commit'))
        await page.getByText(scene.locale === 'ru-RU' ? 'Оба способа входа подключены к аккаунту.' : 'Both sign-in methods are linked to this account.').waitFor()
      }
    }

    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const facts = await page.evaluate(() => {
      const visible = (element) => Boolean(element && element.getClientRects().length)
      const rect = (element) => {
        const box = element?.getBoundingClientRect()
        return box ? { x: box.x, y: box.y, right: box.right, width: box.width, height: box.height } : null
      }
      const main = document.querySelector('main.app-main')
      const screen = document.querySelector('.account-linking-screen')
      const googleButton = document.querySelector('.account-linking-screen__provider-button')
      const form = googleButton?.closest('.account-linking-screen__form')
      const identities = [...document.querySelectorAll('.account-linking-screen__protected strong, .account-linking-screen__method small')]
        .filter(visible)
        .map((element) => ({
          text: element.textContent?.trim() ?? '',
          ...rect(element),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clipped: element.scrollWidth > element.clientWidth + 1,
        }))
      const buttons = [...(main?.querySelectorAll('button') ?? [])]
        .filter(visible)
        .map((button) => ({
          text: button.innerText.trim().replace(/\s+/g, ' '),
          size: button.dataset.size ?? null,
          ...rect(button),
          rightWithinForm: form && button === googleButton ? button.getBoundingClientRect().right <= form.getBoundingClientRect().right + 1 : undefined,
        }))
      const overflowElements = [document.documentElement, document.body, main, screen]
        .filter(Boolean)
        .map((element) => ({
          name: element === document.documentElement ? 'html' : element === document.body ? 'body' : element === main ? 'main' : 'screen',
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }))
      const direction = document.documentElement.lang
      return {
        lang: direction,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
        providerAction: googleButton ? {
          button: rect(googleButton),
          form: rect(form),
          rightWithinForm: googleButton.getBoundingClientRect().right <= form.getBoundingClientRect().right + 1,
          text: googleButton.innerText.trim(),
        } : null,
        identities,
        buttons,
        overflowElements,
        pageTitle: main?.querySelector('h1')?.textContent?.trim() ?? null,
      }
    })

    const screenshot = join(evidenceDir, `${scene.name}.png`)
    await page.screenshot({ path: screenshot, fullPage: scene.fullPage })
    let fullPageScreenshot = null
    if (scene.alsoFullPage) {
      fullPageScreenshot = join(evidenceDir, `${scene.name}-full.png`)
      await page.screenshot({ path: fullPageScreenshot, fullPage: true })
    }

    const caseFailures = []
    if (facts.lang !== (scene.locale === 'ru-RU' ? 'ru' : 'en')) caseFailures.push(`expected html lang for ${scene.locale}, got ${facts.lang}`)
    if (facts.documentWidth > scene.viewport.width) caseFailures.push(`document width ${facts.documentWidth} exceeds viewport ${scene.viewport.width}`)
    if (!facts.mabryLoaded) caseFailures.push('Mabry Pro did not report loaded')
    if (facts.identities.some((identity) => identity.clipped)) caseFailures.push('a visible full identity string is clipped')
    if (facts.providerAction && !facts.providerAction.rightWithinForm) caseFailures.push('Google current-method action exceeds its form width')
    if (pageErrors.length) caseFailures.push(`browser errors: ${pageErrors.join(' | ')}`)
    failures.push(...caseFailures.map((failure) => `${scene.name}: ${failure}`))
    measurements.push({
      scene: scene.name,
      scenario: scene.scenario,
      action: scene.action ?? null,
      screenshot,
      fullPageScreenshot,
      pageErrors,
      facts,
      failures: caseFailures,
    })
    console.log(`${caseFailures.length ? 'FAIL' : 'PASS'} ${scene.name}: ${facts.viewport.width}px, document ${facts.documentWidth}px, Mabry ${facts.mabryLoaded}, ${facts.buttons.length} visible buttons`)
    await context.close()
  }
} finally {
  await browser.close()
}

await writeFile(join(evidenceDir, 'browser-layout-measurements.json'), `${JSON.stringify({ origin, generatedAt: new Date().toISOString(), cases: measurements, failures }, null, 2)}\n`, 'utf8')
await writeFile(join(evidenceDir, 'browser-capture.log'), [
  'Browser: Playwright Chromium, fresh context for each case; light theme; reduced motion; audio muted; fake media flags set.',
  'App: existing synthetic auth-state visual harness, screen=link; no real provider, email, audio, or account service contacted.',
  'Controlled fault boundary: conflict and unknown are deterministic frontend fixtures; they do not prove real service concurrency or lost-response behavior.',
  'Success boundary: the fixture returns a completed acknowledgement but leaves the account methods snapshot unchanged, so the screen shows a refresh warning; the focused real-mock integration test covers successful reconciliation.',
  `Captured ${measurements.length} cases.`,
  ...measurements.map((item) => `${item.failures.length ? 'FAIL' : 'PASS'} ${item.scene} ${item.screenshot}`),
  ...(failures.length ? [`Failures: ${failures.join(' | ')}`] : ['Failures: none.']),
].join('\n') + '\n', 'utf8')

if (failures.length) process.exitCode = 1
