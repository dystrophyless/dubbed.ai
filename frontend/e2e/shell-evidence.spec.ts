import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { setLocale } from './helpers/locale.js'

test('captures the mounted landing shell in desktop English and phone Russian', async ({ page }) => {
  test.skip(process.env.CAPTURE_SHELL_EVIDENCE !== '1', 'Run explicitly when refreshing visual evidence.')

  const evidenceDirectory = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../_docs/evidence/frontend-implementation-2026-10-23/shell-final-proof',
  )
  mkdirSync(evidenceDirectory, { recursive: true })
  const measurements: Record<string, unknown> = {}
  const readMetrics = () => page.evaluate(() => {
    const required = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`Missing measurement target: ${selector}`)
      const rect = element.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        lineHeight: style.lineHeight,
        color: style.color,
        backgroundColor: style.backgroundColor,
        paddingLeft: style.paddingLeft,
        borderRadius: style.borderRadius,
        transitionDuration: style.transitionDuration,
        animationDuration: style.animationDuration,
      }
    }
    const header = required('.app-header__inner')
    const main = required('.app-main')
    const heading = required('.landing-content h1')
    const primaryAction = required('.landing-start')
    const supportLink = required('a[href^="mailto:"]')
    const locale = required('.locale-control select')
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
      fontLoaded: document.fonts.check('500 32px "Mabry Pro"'),
      header,
      main,
      heading,
      primaryAction,
      supportLink,
      locale,
      rootScrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    }
  })
  const readAuthMetrics = () => page.evaluate(() => {
    const controlElements = Array.from(document.querySelectorAll<HTMLElement>(
      '.auth-screen button, .auth-screen a, .auth-screen input, .locale-control select',
    )).filter((element) => {
      const rect = element.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    const describe = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect()
      const range = document.createRange()
      range.selectNodeContents(element)
      const text = range.getBoundingClientRect()
      const style = getComputedStyle(element)
      return {
        tag: element.tagName.toLowerCase(),
        label: element.getAttribute('aria-label')
          ?? element.textContent?.trim()
          ?? element.getAttribute('id')
          ?? element.tagName.toLowerCase(),
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        client: { width: element.clientWidth, height: element.clientHeight },
        scroll: { width: element.scrollWidth, height: element.scrollHeight },
        overflow: { x: style.overflowX, y: style.overflowY },
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        whiteSpace: style.whiteSpace,
        textFits: text.width === 0 || (text.left >= rect.left - 1 && text.right <= rect.right + 1),
      }
    }
    const controls = controlElements.map(describe)
    const clippedControls = controls.filter((control) =>
      control.scroll.width > control.client.width + 1
      || control.scroll.height > control.client.height + 1,
    )
    return {
      viewport: {
        width: innerWidth,
        height: innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
      },
      controls,
      clippedControls,
    }
  })

  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
  await expect(page.getByRole('link', { name: /dystrophyless@gmail\.com/ })).toHaveAttribute(
    'href',
    'mailto:dystrophyless@gmail.com',
  )
  await page.evaluate(() => document.fonts.ready.then(() => true))
  const desktopMetrics = await readMetrics()
  measurements.desktop1440 = desktopMetrics
  expect(desktopMetrics.viewport.scrollWidth).toBeLessThanOrEqual(1440)
  expect((measurements.desktop1440 as { supportLink: { color: string } }).supportLink.color)
    .toBe('rgb(0, 96, 226)')
  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-landing-en-desktop.png'),
    fullPage: true,
  })

  await page.keyboard.press('Tab')
  await expect(page.locator('.skip-link')).toBeFocused()
  measurements.keyboardFocus = await page.locator('.skip-link').evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
      transform: style.transform,
    }
  })

  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-keyboard-focus-en-desktop.png'),
    fullPage: true,
  })

  await page.emulateMedia({ forcedColors: 'active' })
  const forcedColorsMatch = await page.evaluate(() => matchMedia('(forced-colors: active)').matches)
  expect(forcedColorsMatch).toBe(true)
  for (let step = 0; step < 4; step += 1) await page.keyboard.press('Tab')
  const forcedColorFocus = await page.getByRole('button', { name: 'Start dubbing' }).evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      borderColor: style.borderColor,
      color: style.color,
      backgroundColor: style.backgroundColor,
    }
  })
  await expect(page.getByRole('button', { name: 'Start dubbing' })).toBeFocused()
  expect(forcedColorFocus.outlineStyle).toBe('solid')
  expect(forcedColorFocus.outlineWidth).toBe('2px')
  measurements.forcedColors = { matches: forcedColorsMatch, keyboardFocus: forcedColorFocus }
  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-forced-colors-keyboard-en-desktop.png'),
    fullPage: true,
  })
  await page.emulateMedia({ forcedColors: 'none' })

  await page.getByRole('button', { name: 'Start dubbing' }).hover()
  await page.waitForTimeout(180)
  measurements.primaryHover = await page.getByRole('button', { name: 'Start dubbing' }).evaluate((element) => {
    const style = getComputedStyle(element)
    return { backgroundColor: style.backgroundColor, transform: style.transform }
  })
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.mouse.move(0, 0)

  for (const width of [768, 767]) {
    await page.setViewportSize({ width, height: 900 })
    const widthMetrics = await readMetrics()
    measurements[`width${width}`] = widthMetrics
    expect(widthMetrics.viewport.scrollWidth, `Landing page overflows at ${width}px`).toBeLessThanOrEqual(width)
    await page.screenshot({
      path: resolve(evidenceDirectory, `shell-landing-en-${width}.png`),
      fullPage: true,
    })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await setLocale(page, 'ru')
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
  await page.mouse.move(0, 0)
  await expect(page.getByRole('heading', { name: 'Озвучьте свою сцену' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready.then(() => true))
  const phoneMetrics = await readMetrics()
  measurements.phone390Russian = phoneMetrics
  expect(phoneMetrics.viewport.scrollWidth, 'Russian landing page overflows at 390px').toBeLessThanOrEqual(390)
  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-landing-ru-phone.png'),
    fullPage: true,
  })

  await page.setViewportSize({ width: 720, height: 900 })
  const effectiveZoomMetrics = await readMetrics()
  measurements.zoom200PercentEffectiveViewport = effectiveZoomMetrics
  expect(effectiveZoomMetrics.viewport.scrollWidth).toBeLessThanOrEqual(720)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reducedMotionMatches = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  expect(reducedMotionMatches).toBe(true)
  measurements.reducedMotion = await readMetrics()
  const reducedMotionMetrics = measurements.reducedMotion as {
    rootScrollBehavior: string
    primaryAction: { transitionDuration: string }
  }
  expect(reducedMotionMetrics.rootScrollBehavior).toBe('auto')
  expect(Number.parseFloat(reducedMotionMetrics.primaryAction.transitionDuration)).toBeLessThanOrEqual(0.00001)
  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-reduced-motion-ru-720.png'),
    fullPage: true,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })

  for (const width of [768, 767, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.goto('/sign-in')
    await setLocale(page, 'ru')
    await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible()
    const signIn = await readAuthMetrics()
    measurements[`signInRu${width}`] = signIn
    expect(signIn.viewport.scrollWidth).toBeLessThanOrEqual(width)
    expect(signIn.clippedControls).toEqual([])
    if (width < 768) expect(signIn.controls.every((control) => control.rect.height >= 48)).toBe(true)
    await page.screenshot({
      path: resolve(evidenceDirectory, `shell-sign-in-ru-${width}.png`),
      fullPage: true,
    })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/register')
  await setLocale(page, 'en')
  const auditEmail = `auth-layout-${Date.now()}@example.test`
  await page.getByRole('textbox', { name: 'Email' }).fill(auditEmail)
  await page.getByLabel('Password').fill('LayoutAuditPassword123!')
  await page.getByRole('button', { name: 'Create account' }).click()
  const registrationCode = page.getByRole('textbox', { name: '6-digit verification code' })
  await expect(registrationCode).toBeVisible()
  const visibleMockCode = (await page.getByRole('status').innerText()).match(/\b(\d{6})\b/)?.[1]
  if (!visibleMockCode) throw new Error('The registration screen did not expose its local mock code.')
  await registrationCode.fill(visibleMockCode)
  await expect(page).toHaveURL(/\/new$/)

  for (const width of [768, 767]) {
    await page.setViewportSize({ width, height: 900 })
    const desktopNavigation = page.getByRole('navigation', { name: 'Main navigation' })
    const mobileMenuTrigger = page.getByRole('button', { name: 'Open navigation' })
    const isDesktopWidth = width >= 768
    if (isDesktopWidth) {
      await expect(desktopNavigation).toBeVisible()
      await expect(mobileMenuTrigger).toBeHidden()
    } else {
      await expect(desktopNavigation).toBeHidden()
      await expect(mobileMenuTrigger).toBeVisible()
      const targetHeight = await mobileMenuTrigger.evaluate((button) => button.getBoundingClientRect().height)
      expect(targetHeight).toBeGreaterThanOrEqual(48)
    }
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth, `Signed-in shell overflows at ${width}px`).toBeLessThanOrEqual(width)
    measurements[`signedInHeader${width}`] = {
      viewportWidth: width,
      scrollWidth,
      desktopNavigationVisible: isDesktopWidth,
      mobileMenuVisible: !isDesktopWidth,
    }
    await page.screenshot({
      path: resolve(evidenceDirectory, `shell-authenticated-header-en-${width}.png`),
      fullPage: true,
    })
  }

  await page.setViewportSize({ width: 390, height: 844 })
  const mobileMenuTrigger = page.getByRole('button', { name: 'Open navigation' })
  await expect(mobileMenuTrigger).toBeVisible()
  const mobileMenuTriggerHeight = await mobileMenuTrigger.evaluate((button) => button.getBoundingClientRect().height)
  expect(mobileMenuTriggerHeight).toBeGreaterThanOrEqual(48)
  await mobileMenuTrigger.focus()
  await page.keyboard.press('Enter')
  const mobileMenu = page.getByRole('dialog')
  await expect(mobileMenu).toBeVisible()
  await expect(mobileMenu.locator('.sheet-close')).toBeFocused()
  await expect(mobileMenu.locator('.mobile-nav__locale select')).toBeVisible()
  const mobileMenuMetrics = await mobileMenu.evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect()
    const nav = dialog.querySelector<HTMLElement>('.mobile-nav')
    if (!nav) throw new Error('The signed-in mobile navigation is missing.')
    const links = [...nav.querySelectorAll<HTMLElement>('a, button, select')]
    return {
      viewport: { width: innerWidth, scrollWidth: document.documentElement.scrollWidth },
      dialog: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      nav: { clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth },
      targetHeights: links.map((link) => link.getBoundingClientRect().height),
      closeTargetHeight: dialog.querySelector('.sheet-close')?.getBoundingClientRect().height ?? 0,
    }
  })
  const menuIcon = await page.locator('.mobile-menu-trigger svg').evaluate((svg) => {
    const rect = svg.getBoundingClientRect()
    return {
      viewBox: svg.getAttribute('viewBox'),
      width: rect.width,
      height: rect.height,
      fill: svg.getAttribute('fill'),
      stroke: svg.getAttribute('stroke'),
      strokeWidth: svg.getAttribute('stroke-width'),
      strokeLinecap: svg.getAttribute('stroke-linecap'),
      strokeLinejoin: svg.getAttribute('stroke-linejoin'),
      ariaHidden: svg.getAttribute('aria-hidden'),
    }
  })
  const closeIcon = await mobileMenu.locator('.sheet-close svg').evaluate((svg) => {
    const rect = svg.getBoundingClientRect()
    return {
      viewBox: svg.getAttribute('viewBox'),
      width: rect.width,
      height: rect.height,
      fill: svg.getAttribute('fill'),
      stroke: svg.getAttribute('stroke'),
      strokeWidth: svg.getAttribute('stroke-width'),
      strokeLinecap: svg.getAttribute('stroke-linecap'),
      strokeLinejoin: svg.getAttribute('stroke-linejoin'),
      ariaHidden: svg.getAttribute('aria-hidden'),
    }
  })
  for (const icon of [menuIcon, closeIcon]) {
    expect(icon.viewBox).toBe('0 0 24 24')
    expect(icon.fill).toBe('none')
    expect(icon.stroke).toBe('currentColor')
    expect(icon.strokeWidth).toBe('1.1')
    expect(icon.strokeLinecap).toBe('round')
    expect(icon.strokeLinejoin).toBe('round')
    expect(icon.ariaHidden).toBe('true')
  }
  expect(mobileMenuMetrics.viewport.scrollWidth).toBeLessThanOrEqual(390)
  expect(mobileMenuMetrics.nav.scrollWidth).toBeLessThanOrEqual(mobileMenuMetrics.nav.clientWidth)
  expect(mobileMenuMetrics.targetHeights.every((height) => height >= 48)).toBe(true)
  expect(mobileMenuMetrics.closeTargetHeight).toBeGreaterThanOrEqual(48)
  measurements.mobileMenu390English = { ...mobileMenuMetrics, triggerHeight: mobileMenuTriggerHeight }
  measurements.mobileMenuIcons390English = { menu: menuIcon, close: closeIcon }
  await page.screenshot({
    path: resolve(evidenceDirectory, 'shell-mobile-menu-en-390.png'),
    fullPage: true,
  })
  await page.keyboard.press('Escape')
  await expect(mobileMenu).toBeHidden()
  await expect(mobileMenuTrigger).toBeFocused()
  measurements.mobileMenuKeyboardDismissal = await mobileMenuTrigger.evaluate((trigger) => {
    const active = document.activeElement as HTMLElement | null
    return {
      closedByEscape: true,
      triggerRegainedFocus: active === trigger,
      activeElement: {
        tag: active?.tagName.toLowerCase() ?? null,
        ariaLabel: active?.getAttribute('aria-label') ?? null,
      },
    }
  })

  await page.goto('/reset-password')
  await page.getByRole('textbox', { name: 'Email' }).fill(auditEmail)
  await page.getByRole('button', { name: 'Send reset email' }).click()
  const resetCode = page.getByRole('textbox', { name: '6-digit reset code' })
  await expect(resetCode).toBeVisible()
  await setLocale(page, 'ru')
  await expect(page.getByRole('heading', { name: 'Проверьте почту' })).toBeVisible()
  const resendCountdown = page.getByRole('status').filter({
    hasText: /Повторный запрос доступен через/,
  })
  await expect(resendCountdown).toBeVisible()
  await expect(page.getByRole('button', { name: 'Отправить код ещё раз' })).toBeDisabled()

  for (const width of [768, 767, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const reset = await readAuthMetrics()
    measurements[`passwordResetCodeRu${width}`] = reset
    expect(reset.viewport.scrollWidth).toBeLessThanOrEqual(width)
    expect(reset.clippedControls).toEqual([])
    expect(reset.controls.filter((control) => control.tag === 'a' && !control.textFits)).toEqual([])
    if (width < 768) {
      const undersizedControls = reset.controls.filter((control) => control.rect.height < 48)
      expect(undersizedControls, `Phone controls below 48px: ${JSON.stringify(undersizedControls)}`).toEqual([])
    }
    await page.screenshot({
      path: resolve(evidenceDirectory, `shell-password-reset-code-ru-${width}.png`),
      fullPage: true,
    })
  }

  writeFileSync(
    resolve(evidenceDirectory, 'shell-rendered-metrics.json'),
    `${JSON.stringify(measurements, null, 2)}\n`,
  )
})
