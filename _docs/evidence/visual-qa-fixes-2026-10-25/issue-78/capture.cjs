const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright')
const fs = require('node:fs/promises')
const path = require('node:path')
const assert = require('node:assert/strict')

const root = __dirname
const evidence = path.join(root, 'evidence')
const base = 'http://127.0.0.1:4578'
const browserArgs = ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
const captures = []
const pageErrors = []
const checks = []

async function saveEvidence(browser) {
  const receipt = {
    capturedAt: new Date().toISOString(),
    baseline: '9d286621177200fdb5f61ef963d0b6818ae76774',
    worktreeBoundary: 'Current dirty worktree; task 78 shared-shell changes only. Frozen proactive review artifacts were read-only.',
    browser: `Playwright Chromium ${browser.version()}`,
    runtime: 'Mock Vite app at 127.0.0.1:4578; audio muted; fake media flags only; no physical microphone/speaker or production service.',
    fixture: 'One browser-local mock account created through the visible registration and verification UI for signed-in shell captures; no email was sent.',
    references: {
      buttonClean: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
      buttonInitial: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png',
      buttonLoading: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/03-loading.png',
      adoption: '_docs/frontend-flows/affect-ui-clean-light-adoption.md',
      tokens: '_docs/frontend-flows/design-tokens.md',
    },
    captures,
    checks,
    pageErrors,
    limitations: ['No native 200% browser zoom, assistive technology, live account preference, or real support-email delivery was exercised.'],
  }
  await fs.writeFile(path.join(root, 'metrics.json'), `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
  await fs.writeFile(path.join(root, 'screenshot-manifest.json'), `${JSON.stringify(captures.map(({ name, path: imagePath, url, capturedAt }) => ({ name, path: imagePath, url, capturedAt })), null, 2)}\n`, 'utf8')
}

async function metrics(page) {
  return page.evaluate(() => {
    const box = (element) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        padding: style.padding,
        display: style.display,
      }
    }
    const one = (selector) => document.querySelector(selector)
    const visible = (selector) => {
      const element = one(selector)
      return !!element && getComputedStyle(element).display !== 'none' && element.getBoundingClientRect().height > 0
    }
    const header = one('.app-header__inner')
    const disclosure = one('.locale-control__disclosure')
    return {
      locale: document.documentElement.lang,
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, bodyWidth: document.body.scrollWidth },
      fonts: {
        regularLoaded: document.fonts.check('400 16px "Mabry Pro"'),
        mediumLoaded: document.fonts.check('500 16px "Mabry Pro"'),
        faces: [...document.fonts].filter((face) => face.family.includes('Mabry')).map((face) => ({ family: face.family, weight: face.weight, status: face.status })),
      },
      header: {
        box: box(one('.app-header')),
        inner: box(header),
        innerClientWidth: header?.clientWidth ?? null,
        innerScrollWidth: header?.scrollWidth ?? null,
        brand: box(one('.brand-link')),
        actions: box(one('.app-header__actions')),
        desktopNav: box(one('.desktop-nav')),
        desktopNavVisible: visible('.desktop-nav'),
        navLinks: [...document.querySelectorAll('.desktop-nav .nav-link')].map(box),
        signIn: box(one('.sign-in-link')),
        creditBalance: box(one('.credit-balance')),
        mobileTrigger: box(one('.mobile-menu-trigger')),
        mobileTriggerVisible: visible('.mobile-menu-trigger'),
      },
      localeControl: {
        select: box(one('.locale-control select')),
        disclosure: box(disclosure),
        disclosureStrokeWidth: disclosure?.getAttribute('stroke-width') ?? null,
        disclosureHidden: disclosure?.getAttribute('aria-hidden') ?? null,
      },
      landing: {
        heading: box(one('.landing-content h1')),
        description: box(one('.landing-description')),
        offer: box(one('.landing-offer')),
        start: box(one('.landing-start')),
        support: box(one('.landing-support a')),
      },
      sheet: {
        content: box(one('.sheet-content')),
        close: box(one('.sheet-close')),
        closeGlyph: box(one('.sheet-close svg')),
        navLinks: [...document.querySelectorAll('.mobile-nav__link')].map(box),
        localeSelect: box(one('.mobile-nav__locale select')),
        localeDisclosure: box(one('.mobile-nav__locale .locale-control__disclosure')),
      },
    }
  })
}

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(120)
  const data = await metrics(page)
  const imagePath = path.join(evidence, `${name}.png`)
  await page.screenshot({ path: imagePath, fullPage: true })
  const item = { name, path: `evidence/${name}.png`, url: page.url(), capturedAt: new Date().toISOString(), ...data }
  captures.push(item)
  console.log(`captured ${name}`)
  return item
}

async function landingPage(browser, locale, width, height, name) {
  const context = await browser.newContext({ locale: locale === 'ru' ? 'ru-RU' : 'en-US', viewport: { width, height }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`))
  await page.goto(`${base}/`)
  await page.getByRole('button', { name: locale === 'ru' ? 'Начать озвучку' : 'Start dubbing', exact: true }).waitFor()
  const item = await capture(page, name)
  const expectedActionHeight = width <= 767 ? 48 : 44
  assert.equal(item.landing.start.height, expectedActionHeight, `${name}: landing action role height`)
  assert.equal(item.locale, locale, `${name}: document locale`)
  assert.equal(item.document.width, width, `${name}: document reflow`)
  assert.equal(item.document.bodyWidth, width, `${name}: body reflow`)
  assert.equal(item.fonts.regularLoaded, true, `${name}: Mabry Regular loaded`)
  assert.equal(item.fonts.mediumLoaded, true, `${name}: Mabry Medium loaded`)
  assert.equal(item.localeControl.disclosure.width, 16, `${name}: visible locale disclosure width`)
  assert.equal(item.localeControl.disclosure.height, 16, `${name}: visible locale disclosure height`)
  assert.equal(item.localeControl.disclosureStrokeWidth, '1.1', `${name}: Lucide outline treatment`)
  if (width <= 767) {
    assert.ok(item.header.brand.height >= 48, `${name}: phone home target height`)
    assert.ok(item.header.signIn.height >= 48, `${name}: phone sign-in target height`)
    assert.ok(item.localeControl.select.height >= 48, `${name}: phone locale target height`)
    assert.equal(item.localeControl.select.fontSize, '16px', `${name}: phone locale text size`)
    assert.ok(item.landing.support.height >= 48, `${name}: phone support target height`)
  } else {
    assert.equal(item.localeControl.select.height, 36, `${name}: desktop locale navigation height`)
  }
  if (height === 700) assert.ok(item.landing.start.bottom <= height, `${name}: landing primary action is visible in the short viewport`)
  checks.push({ name, status: 'passed', viewport: item.viewport, start: item.landing.start, support: item.landing.support, localeTarget: item.localeControl.select })
  await context.close()
}

async function setDesktopLocale(page, locale) {
  await page.locator('.app-header__desktop-locale select:visible').selectOption(locale)
  await page.waitForFunction((expected) => document.documentElement.lang === expected, locale)
}

async function openMobileMenu(page) {
  await page.locator('.mobile-menu-trigger:visible').click()
  await page.locator('.sheet-content').waitFor({ state: 'visible' })
}

async function inspectPhoneMenu(page, locale, name) {
  const item = await capture(page, name)
  assert.equal(item.locale, locale, `${name}: document locale`)
  assert.equal(item.header.mobileTrigger.width, 48, `${name}: menu trigger width`)
  assert.equal(item.header.mobileTrigger.height, 48, `${name}: menu trigger height`)
  assert.equal(item.sheet.close.width, 48, `${name}: sheet close width`)
  assert.equal(item.sheet.close.height, 48, `${name}: sheet close height`)
  assert.equal(item.sheet.closeGlyph.width, 16, `${name}: close glyph remains compact`)
  assert.equal(item.sheet.closeGlyph.height, 16, `${name}: close glyph remains compact`)
  assert.ok(item.sheet.navLinks.length >= 4, `${name}: navigation destinations visible`)
  assert.ok(item.sheet.navLinks.every((link) => link.height >= 48), `${name}: all phone navigation rows are 48px high`)
  assert.equal(item.sheet.localeSelect.height, 48, `${name}: locale menu target height`)
  assert.equal(item.sheet.localeSelect.fontSize, '16px', `${name}: locale menu text size`)
  assert.equal(item.sheet.localeDisclosure.width, 16, `${name}: locale menu disclosure visible`)
  assert.equal(item.document.width, item.viewport.width, `${name}: no horizontal overflow`)
  checks.push({ name, status: 'passed', viewport: item.viewport, trigger: item.header.mobileTrigger, close: item.sheet.close, closeGlyph: item.sheet.closeGlyph, navLinks: item.sheet.navLinks, locale: item.sheet.localeSelect })
}

async function registerMockAccount(page) {
  await page.getByRole('button', { name: 'Start dubbing', exact: true }).click()
  await page.getByLabel('Email', { exact: true }).fill(`visual-qa-78-${Date.now()}@example.test`)
  await page.getByLabel('Password', { exact: true }).fill('Review-78-password!')
  await page.getByRole('button', { name: 'Create account', exact: true }).click()
  const notice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
  await notice.waitFor()
  const code = (await notice.innerText()).match(/\b\d{6}\b/)?.[0]
  assert.ok(code, 'visible mock verification code is available')
  await page.getByLabel('6-digit verification code').fill(code)
  await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
}

async function main() {
  await fs.mkdir(evidence, { recursive: true })
  const browser = await chromium.launch({ headless: true, args: browserArgs })
  try {
    for (const locale of ['en', 'ru']) {
      await landingPage(browser, locale, 1440, 900, `landing-${locale}-desktop`)
      await landingPage(browser, locale, 1440, 700, `landing-${locale}-short`)
      await landingPage(browser, locale, 390, 844, `landing-${locale}-phone`)
      await landingPage(browser, locale, 768, 900, `landing-${locale}-768`)
      await landingPage(browser, locale, 767, 900, `landing-${locale}-767`)
    }

    const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
    const page = await context.newPage()
    page.on('pageerror', (error) => pageErrors.push(`signed-in: ${error.message}`))
    await page.goto(`${base}/`)
    await registerMockAccount(page)
    await capture(page, 'shell-en-desktop')
    await setDesktopLocale(page, 'ru')
    await capture(page, 'shell-ru-desktop')

    for (const locale of ['en', 'ru']) {
      await setDesktopLocale(page, locale)
      await page.setViewportSize({ width: 768, height: 900 })
      const item = await capture(page, `shell-${locale}-768`)
      assert.equal(item.locale, locale, `shell-${locale}-768: document locale`)
      assert.equal(item.header.desktopNavVisible, true, `shell-${locale}-768: desktop navigation remains at 768px`)
      assert.ok(item.header.navLinks.length === 4, `shell-${locale}-768: all navigation destinations render`)
      assert.ok(item.header.navLinks.every((link) => link.height === 36 && link.fontSize === '14px'), `shell-${locale}-768: navigation role dimensions`)
      assert.equal(item.header.innerScrollWidth, item.header.innerClientWidth, `shell-${locale}-768: header contents fit without horizontal scroll`)
      assert.equal(item.document.width, 768, `shell-${locale}-768: no document overflow`)
      checks.push({ name: `shell-${locale}-768-header`, status: 'passed', header: item.header })
    }

    for (const locale of ['en', 'ru']) {
      await page.setViewportSize({ width: 768, height: 900 })
      await setDesktopLocale(page, locale)
      await page.setViewportSize({ width: 767, height: 900 })
      const closed = await capture(page, `shell-${locale}-767`)
      assert.equal(closed.header.desktopNavVisible, false, `shell-${locale}-767: desktop navigation hidden below breakpoint`)
      assert.equal(closed.header.mobileTrigger.width, 48, `shell-${locale}-767: phone trigger width`)
      assert.equal(closed.header.mobileTrigger.height, 48, `shell-${locale}-767: phone trigger height`)
      await openMobileMenu(page)
      await inspectPhoneMenu(page, locale, `shell-${locale}-767-menu`)
      await page.keyboard.press('Escape')
      const focusRestored = await page.evaluate(() => document.activeElement?.classList.contains('mobile-menu-trigger') ?? false)
      assert.equal(focusRestored, true, `shell-${locale}-767: Escape restores menu trigger focus`)
      checks.push({ name: `shell-${locale}-767-escape-focus`, status: 'passed', focusRestored })
    }

    await page.setViewportSize({ width: 390, height: 844 })
    await openMobileMenu(page)
    await page.locator('.mobile-nav__locale select').selectOption('en')
    await page.waitForFunction(() => document.documentElement.lang === 'en')
    await page.keyboard.press('Escape')
    const phoneClosed = await capture(page, 'shell-en-390')
    assert.equal(phoneClosed.document.width, 390, 'shell-en-390: no document overflow')
    await openMobileMenu(page)
    await inspectPhoneMenu(page, 'en', 'shell-en-390-menu')
    await page.keyboard.press('Escape')
    const focusRestored = await page.evaluate(() => document.activeElement?.classList.contains('mobile-menu-trigger') ?? false)
    assert.equal(focusRestored, true, 'shell-en-390: Escape restores menu trigger focus')
    await capture(page, 'shell-en-390-after-escape')
    checks.push({ name: 'shell-en-390-escape-focus', status: 'passed', focusRestored })

    await openMobileMenu(page)
    await page.locator('.mobile-nav__locale select').selectOption('ru')
    await page.waitForFunction(() => document.documentElement.lang === 'ru')
    await inspectPhoneMenu(page, 'ru', 'shell-ru-390-menu')
    await page.keyboard.press('Escape')
    await context.close()
  } finally {
    await saveEvidence(browser)
    await browser.close()
  }
}

main().catch(async (error) => {
  await fs.writeFile(path.join(root, 'capture-error.txt'), `${error.stack || error}\n`, 'utf8')
  console.error(error)
  process.exitCode = 1
})
