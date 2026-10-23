import { expect, test } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const widths = [1440, 390, 767, 768]
const locales = ['en', 'ru'] as const
const evidenceDirectory = path.resolve(process.cwd(), '../_docs/evidence/frontend-implementation-2026-10-23/shared-controls')

test('browser and account locales stay defaults until an explicit choice is stored', async ({ browser }) => {
  const cases = [
    { browserLocale: 'ru-RU', accountLocale: undefined, storedLocale: undefined, expected: 'ru' },
    { browserLocale: 'en-US', accountLocale: 'ru', storedLocale: undefined, expected: 'ru' },
    { browserLocale: 'ru-RU', accountLocale: 'ru', storedLocale: 'en', expected: 'en' },
  ]

  for (const scenario of cases) {
    const context = await browser.newContext({ locale: scenario.browserLocale })
    if (scenario.storedLocale) {
      await context.addInitScript((locale) => {
        window.localStorage.setItem('dubbed.locale', locale)
      }, scenario.storedLocale)
    }
    const page = await context.newPage()
    const accountQuery = scenario.accountLocale ? `?account=${scenario.accountLocale}` : ''
    await page.goto(`/e2e/harness/shared-controls.html${accountQuery}`)

    await expect(page.getByTestId('language-select')).toHaveValue(scenario.expected)
    await expect(page.getByRole('main')).toHaveAttribute('lang', scenario.expected)
    expect(await page.evaluate(() => window.localStorage.getItem('dubbed.locale'))).toBe(scenario.storedLocale ?? null)
    await context.close()
  }
})

test('shared controls render and preserve state visuals across supported locales and breakpoints', async ({ browser }) => {
  await mkdir(evidenceDirectory, { recursive: true })
  const measurements: Array<Record<string, unknown>> = []
  const pageErrors: string[] = []

  for (const locale of locales) {
    for (const width of widths) {
      const context = await browser.newContext({
        locale: locale === 'ru' ? 'ru-RU' : 'en-US',
        viewport: { width, height: 900 },
      })
      await context.addInitScript((savedLocale) => {
        window.localStorage.setItem('dubbed.locale', savedLocale)
      }, locale)
      const page = await context.newPage()
      page.on('pageerror', (error) => pageErrors.push(`${locale}-${width}: ${error.message}`))
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/e2e/harness/shared-controls.html')
      await page.evaluate(async () => {
        await document.fonts.ready
      })
      await expect(page.getByTestId('language-select')).toHaveValue(locale)

      const metrics = await page.evaluate(() => {
        const rect = (selector: string) => {
          const element = document.querySelector<HTMLElement>(selector)
          if (!element) return null
          const bounds = element.getBoundingClientRect()
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
        }
        const invalidEmail = document.querySelector<HTMLInputElement>('#shared-controls-email-invalid')
        const invalidOtp = document.querySelector<HTMLInputElement>('#shared-controls-otp-invalid')
        const verifiedOtp = document.querySelector<HTMLInputElement>('#shared-controls-otp-verified')
        const textElements = document.querySelectorAll<HTMLElement>(
          '.shared-controls-page h1, .shared-controls-page h2, .shared-controls-page button, .field__label, .field__hint, .field__error, .otp-field__label, .ui-notice',
        )
        const clippedText = Array.from(textElements)
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => `${element.className || element.tagName}:${element.textContent?.trim() ?? ''}`)
        const primary = document.querySelector<HTMLElement>('[data-testid="primary-button"]')

        return {
          language: document.querySelector<HTMLSelectElement>('[data-testid="language-select"]')?.value,
          mainLanguage: document.querySelector('main')?.getAttribute('lang'),
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
          fontFamily: getComputedStyle(document.body).fontFamily,
          fontLoaded: document.fonts.check('400 16px "Mabry Pro"'),
          mediumFontLoaded: document.fonts.check('500 16px "Mabry Pro"'),
          buttonSizes: {
            small: rect('[data-testid="small-button"]'),
            medium: rect('[data-testid="medium-button"]'),
            large: rect('[data-testid="large-button"]'),
          },
          primary: primary ? {
            ...rect('[data-testid="primary-button"]'),
            background: getComputedStyle(primary).backgroundColor,
          } : null,
          languageTarget: rect('[data-testid="language-select"]'),
          emailTarget: rect('#shared-controls-email'),
          otpTarget: rect('.otp-control'),
          otpCell: rect('.otp-control__cell'),
          invalidEmail: {
            value: invalidEmail?.value,
            ariaInvalid: invalidEmail?.getAttribute('aria-invalid'),
            describedBy: invalidEmail?.getAttribute('aria-describedby'),
          },
          invalidOtp: {
            ariaInvalid: invalidOtp?.getAttribute('aria-invalid'),
            describedBy: invalidOtp?.getAttribute('aria-describedby'),
          },
          verifiedOtpDisabled: verifiedOtp?.disabled,
          disabledButton: document.querySelector<HTMLButtonElement>('[data-testid="disabled-button"]')?.disabled,
          busyButton: (() => {
            const element = document.querySelector<HTMLButtonElement>('[data-testid="busy-button"]')
            return element ? {
              ariaBusy: element.getAttribute('aria-busy'),
              ariaDisabled: element.getAttribute('aria-disabled'),
              disabled: element.disabled,
              opacity: getComputedStyle(element).opacity,
            } : null
          })(),
          noticeRoles: Array.from(document.querySelectorAll('.shared-controls__section [role="status"], .shared-controls__section [role="alert"]'))
            .map((element) => ({ role: element.getAttribute('role'), className: element.className })),
          clippedText,
        }
      })

      expect(metrics.language).toBe(locale)
      expect(metrics.mainLanguage).toBe(locale)
      expect(metrics.documentWidth).toBeLessThanOrEqual(width)
      expect(metrics.bodyWidth).toBeLessThanOrEqual(width)
      expect(metrics.fontFamily).toContain('Mabry Pro')
      expect(metrics.fontLoaded).toBe(true)
      expect(metrics.mediumFontLoaded).toBe(true)
      expect(metrics.buttonSizes.small?.height).toBeGreaterThanOrEqual(width <= 767 ? 48 : 24)
      expect(metrics.buttonSizes.medium?.height).toBeGreaterThanOrEqual(width <= 767 ? 48 : 28)
      expect(metrics.buttonSizes.large?.height).toBeGreaterThanOrEqual(width <= 767 ? 48 : 32)
      expect(metrics.languageTarget?.height).toBeGreaterThanOrEqual(width <= 767 ? 48 : 32)
      expect(metrics.emailTarget?.height).toBe(width <= 767 ? 48 : 40)
      expect(metrics.otpTarget?.height).toBeGreaterThanOrEqual(48)
      expect(metrics.invalidEmail.ariaInvalid).toBe('true')
      expect(metrics.invalidEmail.describedBy).toContain('shared-controls-email-invalid-error')
      expect(metrics.invalidOtp.ariaInvalid).toBe('true')
      expect(metrics.invalidOtp.describedBy).toBe('shared-controls-otp-error')
      expect(metrics.verifiedOtpDisabled).toBe(true)
      expect(metrics.disabledButton).toBe(true)
      expect(metrics.busyButton).toMatchObject({ ariaBusy: 'true', ariaDisabled: 'true', disabled: false, opacity: '1' })
      expect(metrics.noticeRoles.some((notice) => notice.role === 'status')).toBe(true)
      expect(metrics.noticeRoles.some((notice) => notice.role === 'alert' && notice.className.includes('ui-notice--error'))).toBe(true)
      expect(metrics.clippedText).toEqual([])

      const name = `${locale}-${width}`
      await page.screenshot({ path: path.join(evidenceDirectory, `controls-${name}-overview.png`), fullPage: true })

      const primary = page.getByTestId('primary-button')
      const defaultBackground = await primary.evaluate((element) => getComputedStyle(element).backgroundColor)
      await primary.hover()
      await expect.poll(() => primary.evaluate((element) => getComputedStyle(element).backgroundColor))
        .not.toBe(defaultBackground)
      await primary.screenshot({ path: path.join(evidenceDirectory, `controls-${name}-hover.png`) })

      await page.mouse.down()
      await expect.poll(() => primary.evaluate((element) => getComputedStyle(element).transform))
        .not.toBe('none')
      await primary.screenshot({ path: path.join(evidenceDirectory, `controls-${name}-pressed.png`) })
      await page.mouse.up()

      // Start from the native language select so the keyboard check is stable
      // after the preceding pointer-state assertions.
      const languageSelect = page.getByTestId('language-select')
      await languageSelect.focus()
      await expect(languageSelect).toBeFocused()
      await page.keyboard.press('Tab')
      await expect(primary).toBeFocused()
      const focusMetrics = await primary.evaluate((element) => ({
        outlineWidth: getComputedStyle(element).outlineWidth,
        outlineOffset: getComputedStyle(element).outlineOffset,
      }))
      expect(focusMetrics.outlineWidth).toBe('2px')
      expect(focusMetrics.outlineOffset).toBe('2px')
      await primary.screenshot({ path: path.join(evidenceDirectory, `controls-${name}-focus.png`) })

      for (let tab = 0; tab < 5; tab += 1) await page.keyboard.press('Tab')
      const emailInput = page.locator('#shared-controls-email')
      await expect(emailInput).toBeFocused()
      const inputFocus = await emailInput.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          boxShadow: style.boxShadow,
          borderColor: style.borderColor,
        }
      })
      expect(inputFocus.outlineWidth).toBe('2px')
      expect(inputFocus.outlineStyle).toBe('solid')
      expect(inputFocus.outlineColor).not.toBe('rgba(0, 0, 0, 0)')
      await page.screenshot({ path: path.join(evidenceDirectory, `controls-${name}-input-focus.png`), fullPage: true })

      const nextLocale = locale === 'en' ? 'ru' : 'en'
      await page.getByTestId('language-select').selectOption(nextLocale)
      await expect(page.getByRole('main')).toHaveAttribute('lang', nextLocale)
      expect(await page.evaluate(() => window.localStorage.getItem('dubbed.locale'))).toBe(nextLocale)

      measurements.push({
        ...metrics,
        inputFocus,
        stateScreenshots: [
          `controls-${name}-overview.png`,
          `controls-${name}-hover.png`,
          `controls-${name}-pressed.png`,
          `controls-${name}-focus.png`,
          `controls-${name}-input-focus.png`,
        ],
      })
      await context.close()
    }
  }

  await writeFile(path.join(evidenceDirectory, 'metrics.json'), `${JSON.stringify({
    date: new Date().toISOString(),
    sourceBoundary: 'shared local worktree; root-owned final build and replay are separate',
    browser: 'local Chromium, muted by Playwright config; synthetic UI only, no media capture or external services',
    references: {
      buttonClean: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
      otpClean: '_docs/evidence/affect-ui-clean-light/source/components/otp-input/Clean/otp-input-clean.md.txt',
      noticeClean: '_docs/evidence/affect-ui-clean-light/source/components/notification-stack/Clean/notification-stack-clean.md.txt',
    },
    locales,
    widths,
    measurements,
    pageErrors,
  }, null, 2)}\n`, 'utf8')
  expect(pageErrors).toEqual([])
})

test('shared button variants match adopted state colors, shadows, press response, and keyboard focus', async ({ browser }) => {
  const destructiveWidths = [1440, 390]
  const destructiveEvidenceDirectory = path.join(evidenceDirectory, 'destructive-button')
  await mkdir(destructiveEvidenceDirectory, { recursive: true })
  const captures: Array<Record<string, unknown>> = []

  for (const locale of locales) {
    for (const width of destructiveWidths) {
      const context = await browser.newContext({
        locale: locale === 'ru' ? 'ru-RU' : 'en-US',
        viewport: { width, height: 900 },
      })
      await context.addInitScript((savedLocale) => {
        window.localStorage.setItem('dubbed.locale', savedLocale)
      }, locale)
      const page = await context.newPage()
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/e2e/harness/shared-controls.html')
      await page.evaluate(async () => {
        await document.fonts.ready
      })
      await expect(page.getByTestId('language-select')).toHaveValue(locale)

      const button = page.getByTestId('large-button')
      const buttonStyles = () => button.evaluate((element) => {
        const style = getComputedStyle(element)
        const bounds = element.getBoundingClientRect()
        const [red, green, blue, alpha = 1] = style.backgroundColor.match(/[\d.]+/g)?.map(Number) ?? []
        if (red === undefined || green === undefined || blue === undefined) {
          throw new Error(`Unexpected destructive button background: ${style.backgroundColor}`)
        }
        let backdrop: Element | null = element.parentElement
        let surfaceColor = 'rgb(255, 255, 255)'
        while (backdrop) {
          const background = getComputedStyle(backdrop).backgroundColor
          const channels = background.match(/[\d.]+/g)?.map(Number) ?? []
          if (channels.length < 4 || channels[3] === 1) {
            surfaceColor = background
            break
          }
          backdrop = backdrop.parentElement
        }
        const [surfaceRed, surfaceGreen, surfaceBlue] = surfaceColor.match(/[\d.]+/g)?.map(Number) ?? [255, 255, 255]
        const composite = [
          red * alpha + surfaceRed * (1 - alpha),
          green * alpha + surfaceGreen * (1 - alpha),
          blue * alpha + surfaceBlue * (1 - alpha),
        ].map(Math.round)
        const compositeColor = `rgb(${composite.join(', ')})`
        const parseChannels = (color: string) => color.match(/[\d.]+/g)?.map(Number) ?? []
        const luminance = (color: string) => {
          const channels = parseChannels(color).slice(0, 3).map((channel) => {
            const value = channel / 255
            return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
          })
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        }
        const foregroundLuminance = luminance(style.color)
        const backgroundLuminance = luminance(compositeColor)
        const contrastRatio = (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
          / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)

        return {
          background: style.backgroundColor,
          color: style.color,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          width: bounds.width,
          height: bounds.height,
          transform: style.transform,
          transformScale: style.transform === 'none' ? 1 : new DOMMatrixReadOnly(style.transform).a,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          outlineOffset: style.outlineOffset,
          surfaceColor,
          compositeColor,
          contrastRatio: Math.round(contrastRatio * 100) / 100,
        }
      })

      const name = `${locale}-${width}`
      const defaultState = await buttonStyles()
      const mediumFontLoaded = await page.evaluate(() => document.fonts.check('500 16px "Mabry Pro"'))
      expect(defaultState.background).toBe('rgba(229, 72, 77, 0.08)')
      expect(defaultState.color).toBe('rgb(193, 38, 44)')
      expect(defaultState.transformScale).toBe(1)
      expect(defaultState.fontFamily).toContain('Mabry Pro')
      expect(mediumFontLoaded).toBe(true)
      expect(defaultState.surfaceColor).toBe('rgb(255, 255, 255)')
      expect(defaultState.contrastRatio).toBeGreaterThanOrEqual(4.5)
      await button.screenshot({ path: path.join(destructiveEvidenceDirectory, `destructive-${name}-default.png`) })

      await button.hover()
      await expect.poll(async () => (await buttonStyles()).background).toBe('rgba(229, 72, 77, 0.12)')
      const hoverState = await buttonStyles()
      expect(hoverState.color).toBe(defaultState.color)
      expect(hoverState.contrastRatio).toBeGreaterThanOrEqual(4.5)
      await button.screenshot({ path: path.join(destructiveEvidenceDirectory, `destructive-${name}-hover.png`) })

      await page.mouse.move(0, 0)

      const languageSelect = page.getByTestId('language-select')
      await languageSelect.focus()
      for (let tab = 0; tab < 4; tab += 1) await page.keyboard.press('Tab')
      await expect(button).toBeFocused()
      const focusState = await buttonStyles()
      expect(await button.evaluate((element) => element.matches(':hover'))).toBe(false)
      expect(focusState.outlineWidth).toBe('2px')
      expect(focusState.outlineStyle).toBe('solid')
      expect(focusState.outlineOffset).toBe('2px')
      expect(focusState.outlineColor).toBe('rgb(0, 96, 226)')
      expect(focusState.background).toBe(defaultState.background)
      expect(focusState.color).toBe(defaultState.color)
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `destructive-${name}-focus.png`), fullPage: true })

      await page.keyboard.down('Space')
      await expect.poll(async () => (await buttonStyles()).transformScale).toBeCloseTo(0.97, 2)
      const pressedState = await buttonStyles()
      expect(pressedState.background).toBe(defaultState.background)
      expect(pressedState.color).toBe(defaultState.color)
      expect(pressedState.outlineWidth).toBe(focusState.outlineWidth)
      expect(pressedState.outlineOffset).toBe(focusState.outlineOffset)
      await button.screenshot({ path: path.join(destructiveEvidenceDirectory, `destructive-${name}-pressed.png`) })
      await page.keyboard.up('Space')
      await expect.poll(async () => (await buttonStyles()).transformScale).toBe(1)

      const secondary = page.getByTestId('small-button')
      const secondaryStyles = () => secondary.evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          background: style.backgroundColor,
          borderColor: style.borderColor,
          borderWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          opacity: style.opacity,
        }
      })
      const secondaryDefault = await secondaryStyles()
      expect(secondaryDefault.background).toBe('rgb(255, 255, 255)')
      expect(secondaryDefault.borderColor).toBe('rgba(0, 0, 0, 0)')
      expect(secondaryDefault.borderWidth).toBe('1px')
      expect(secondaryDefault.boxShadow).toBe(
        'rgba(0, 0, 0, 0.06) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.1) 0px 1px 1px -1px, rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
      )
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `buttons-${name}-secondary-default.png`), fullPage: true })

      await secondary.hover()
      await expect.poll(() => secondary.evaluate((element) => getComputedStyle(element).boxShadow)).toBe(
        'rgba(0, 0, 0, 0.1) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 1px -1px, rgba(0, 0, 0, 0.07) 0px 1px 3px 0px',
      )
      const secondaryHover = await secondaryStyles()
      expect(secondaryHover.background).toBe(secondaryDefault.background)
      expect(secondaryHover.boxShadow).toBe(
        'rgba(0, 0, 0, 0.1) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 1px -1px, rgba(0, 0, 0, 0.07) 0px 1px 3px 0px',
      )
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `buttons-${name}-secondary-hover.png`), fullPage: true })

      await page.mouse.move(0, 0)
      const ghost = page.getByTestId('medium-button')
      const ghostDefault = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor)
      expect(ghostDefault).toBe('rgba(0, 0, 0, 0)')
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `buttons-${name}-ghost-default.png`), fullPage: true })
      await ghost.hover()
      await expect.poll(() => ghost.evaluate((element) => getComputedStyle(element).backgroundColor))
        .toBe('rgba(0, 0, 0, 0.03)')
      const ghostHover = await ghost.evaluate((element) => getComputedStyle(element).backgroundColor)
      expect(ghostHover).toBe('rgba(0, 0, 0, 0.03)')
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `buttons-${name}-ghost-hover.png`), fullPage: true })

      await page.mouse.move(0, 0)
      const disabled = page.getByTestId('disabled-button')
      const disabledStyles = await disabled.evaluate((element) => {
        const style = getComputedStyle(element)
        return { opacity: style.opacity, cursor: style.cursor }
      })
      expect(disabledStyles.opacity).toBe('0.4')
      expect(disabledStyles.cursor).toBe('not-allowed')
      await page.screenshot({ path: path.join(destructiveEvidenceDirectory, `buttons-${name}-disabled.png`), fullPage: true })

      captures.push({
        locale,
        viewportWidth: width,
        label: await button.innerText(),
        mediumFontLoaded,
        states: { default: defaultState, hover: hoverState, pressed: pressedState, focus: focusState },
        screenshots: ['default', 'hover', 'pressed', 'focus'].map((state) => `destructive-${name}-${state}.png`),
        variants: {
          secondary: {
            default: secondaryDefault,
            hover: secondaryHover,
            screenshots: ['default', 'hover'].map((state) => `buttons-${name}-secondary-${state}.png`),
          },
          ghost: {
            default: ghostDefault,
            hover: ghostHover,
            screenshots: ['default', 'hover'].map((state) => `buttons-${name}-ghost-${state}.png`),
          },
          disabled: {
            ...disabledStyles,
            screenshot: `buttons-${name}-disabled.png`,
          },
        },
      })
      await context.close()
    }
  }

  await writeFile(path.join(destructiveEvidenceDirectory, 'metrics.json'), `${JSON.stringify({
    date: new Date().toISOString(),
    sourceBoundary: 'shared local worktree; screenshots cover the actual shared Button component in the test-only Vite harness',
    browser: 'local Chromium, reduced motion, no media capture or external services',
    reference: {
      buttonClean: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
      lightInitial: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png',
      adoptedTokens: '_docs/frontend-flows/design-tokens.md',
      secondaryShadowDefault: '0 0 0 0.5px rgba(0,0,0,0.06), 0 1px 1px -1px rgba(0,0,0,0.1), 0 1px 2px 0 rgba(0,0,0,0.05)',
      secondaryShadowHover: '0 0 0 0.5px rgba(0,0,0,0.1), 0 1px 1px -1px rgba(0,0,0,0.12), 0 1px 3px 0 rgba(0,0,0,0.07); white fill remains unchanged',
      ghostHoverBackground: 'rgba(0,0,0,0.03)',
      disabledOpacity: '0.4',
      defaultBackground: 'rgba(229, 72, 77, 0.08)',
      hoverBackground: 'rgba(229, 72, 77, 0.12)',
      foreground: '#C1262C',
      pressed: 'hover fill plus source scale(0.97); no additional shade',
      focus: '2px solid #0060E2 outline with 2px offset',
    },
    captures,
  }, null, 2)}\n`, 'utf8')
})

test('busy Button stays focusable, blocks duplicate activation, and retains the draft after a deferred failure', async ({ browser }) => {
  const busyEvidenceDirectory = path.join(evidenceDirectory, 'busy-otp-check')
  await mkdir(busyEvidenceDirectory, { recursive: true })
  const captures: Array<Record<string, unknown>> = []
  const pageErrors: string[] = []

  for (const locale of locales) {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        locale: locale === 'ru' ? 'ru-RU' : 'en-US',
        viewport: { width, height: 900 },
      })
      await context.addInitScript((savedLocale) => {
        window.localStorage.setItem('dubbed.locale', savedLocale)
      }, locale)
      const page = await context.newPage()
      page.on('pageerror', (error) => pageErrors.push(`${locale}-${width}: ${error.message}`))
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/e2e/harness/shared-controls.html?busy-proof=1')
      await page.evaluate(async () => {
        await document.fonts.ready
      })
      await expect(page.getByTestId('language-select')).toHaveValue(locale)

      const otpCheck = await page.locator('.otp-control__check').evaluate((element) => {
        const svg = element as SVGSVGElement
        const bounds = svg.getBoundingClientRect()
        const style = getComputedStyle(svg)
        return {
          viewBox: svg.getAttribute('viewBox'),
          stroke: svg.getAttribute('stroke'),
          strokeWidth: svg.getAttribute('stroke-width'),
          fill: svg.getAttribute('fill'),
          lineCap: svg.getAttribute('stroke-linecap'),
          lineJoin: svg.getAttribute('stroke-linejoin'),
          ariaHidden: svg.getAttribute('aria-hidden'),
          decorativeContainerHidden: svg.parentElement?.getAttribute('aria-hidden'),
          width: bounds.width,
          height: bounds.height,
          color: style.color,
          pathCount: svg.querySelectorAll('path').length,
        }
      })
      expect(otpCheck).toMatchObject({
        viewBox: '0 0 24 24',
        stroke: 'currentColor',
        strokeWidth: '1.1',
        fill: 'none',
        lineCap: 'round',
        lineJoin: 'round',
        ariaHidden: 'true',
        decorativeContainerHidden: 'true',
        width: 20,
        height: 20,
        pathCount: 1,
      })

      const button = page.getByTestId('busy-proof-button')
      const draft = page.getByTestId('busy-proof-draft')
      await draft.fill(locale === 'ru' ? 'сохранить этот черновик' : 'retain this draft')
      await button.focus()
      await button.click()
      await expect(button).toHaveAttribute('aria-busy', 'true')
      await expect(button).toHaveAttribute('aria-disabled', 'true')
      expect(await button.evaluate((element) => (element as HTMLButtonElement).disabled)).toBe(false)
      await expect(button).toBeFocused()

      const busyMetrics = await button.evaluate((element) => {
        const style = getComputedStyle(element)
        const bounds = element.getBoundingClientRect()
        return {
          opacity: style.opacity,
          pointerEvents: style.pointerEvents,
          outlineWidth: style.outlineWidth,
          outlineStyle: style.outlineStyle,
          outlineColor: style.outlineColor,
          width: bounds.width,
          height: bounds.height,
          focusVisible: element.matches(':focus-visible'),
        }
      })
      expect(busyMetrics.opacity).toBe('1')
      expect(busyMetrics.height).toBeGreaterThanOrEqual(width <= 767 ? 48 : 28)

      const buttonBounds = await button.boundingBox()
      if (!buttonBounds) throw new Error('Busy test button must have rendered bounds')
      await page.mouse.click(buttonBounds.x + buttonBounds.width / 2, buttonBounds.y + buttonBounds.height / 2)
      await button.press('Enter')
      await button.press('Space')
      await draft.focus()
      await draft.press('Enter')
      const submitResult = await page.locator('form').evaluate((form) => {
        const event = new Event('submit', { bubbles: true, cancelable: true })
        const accepted = form.dispatchEvent(event)
        return { accepted, defaultPrevented: event.defaultPrevented }
      })
      expect(submitResult).toEqual({ accepted: false, defaultPrevented: true })
      await expect(page.getByTestId('busy-proof-attempts')).toHaveText('1')
      await expect(draft).toHaveValue(locale === 'ru' ? 'сохранить этот черновик' : 'retain this draft')

      const name = `${locale}-${width}`
      await draft.press('Tab')
      await expect(button).toBeFocused()
      const focusedBusyButton = await button.evaluate((element) => {
        const style = getComputedStyle(element)
        return { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, outlineColor: style.outlineColor }
      })
      expect(focusedBusyButton).toEqual({ outlineWidth: '2px', outlineStyle: 'solid', outlineColor: 'rgb(0, 96, 226)' })
      await page.screenshot({ path: path.join(busyEvidenceDirectory, `busy-${name}.png`), fullPage: true })
      await page.getByTestId('release-busy-proof').click()
      await expect(page.getByTestId('busy-proof-status')).toContainText(
        locale === 'ru' ? 'черновик остался' : 'draft remains',
      )
      await expect(button).not.toHaveAttribute('aria-busy', 'true')
      await expect(draft).toHaveValue(locale === 'ru' ? 'сохранить этот черновик' : 'retain this draft')
      await expect(page.getByTestId('busy-proof-attempts')).toHaveText('1')

      captures.push({
        locale,
        viewportWidth: width,
        busyButton: busyMetrics,
        keyboardFocus: focusedBusyButton,
        blockedSubmit: submitResult,
        mutationCount: 1,
        retainedDraft: await draft.inputValue(),
        resolvedStatus: await page.getByTestId('busy-proof-status').innerText(),
        otpCheck,
        screenshot: `busy-${name}.png`,
      })
      await context.close()
    }
  }

  expect(pageErrors).toEqual([])
  await writeFile(path.join(busyEvidenceDirectory, 'metrics.json'), `${JSON.stringify({
    date: new Date().toISOString(),
    sourceBoundary: 'actual shared Button, actual auth OtpInput Check, test-only deferred synthetic action harness; no auth or media service is called',
    browser: 'local Playwright Chromium, reduced motion, English and Russian at 1440px and 390px viewport widths',
    buttonProof: 'one deferred action is held; focus, aria-busy, aria-disabled, native-enabled state, and opacity are observed; pointer/Enter/Space/implicit Enter/direct submit do not create a second mutation; the synthetic request rejects and leaves its draft unchanged',
    otpIconMapping: 'verified OtpInput Check uses the adopted Lucide outline treatment. The Clean/Light PNG is only a visual reference, so exact SVG path identity is not inferred from the raster source.',
    reference: {
      buttonClean: '_docs/evidence/affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt',
      otpClean: '_docs/evidence/affect-ui-clean-light/source/components/otp-input/Clean/otp-input-clean.md.txt',
      otpVerifiedLight: '_docs/evidence/affect-ui-clean-light/source/components/otp-input/Clean/Light/04-verified.png',
    },
    captures,
    pageErrors,
  }, null, 2)}\n`, 'utf8')
})
