import { expect, test } from '@playwright/test'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'

interface AuthViewportReport {
  width: number
  stage: 'sign-in' | 'password-reset-code'
  documentWidth: number
  controls: Array<{
    tag: string
    label: string
    width: number
    height: number
    minHeight: string
    scrollWidth: number
    clientWidth: number
    textFits: boolean
  }>
}

async function inspectAuthControls(page: Parameters<typeof installBrowserDiagnostics>[0]) {
  return page.locator('.auth-screen').evaluate((root) => {
    const controls = [...root.querySelectorAll<HTMLElement>('button, a, input')]
      .filter((element) => {
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(element)
        const text = range.getBoundingClientRect()
        const label = element.getAttribute('aria-label')
          ?? element.textContent?.trim().replace(/\s+/g, ' ')
          ?? element.getAttribute('type')
          ?? ''
        return {
          tag: element.tagName.toLowerCase(),
          label,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          minHeight: getComputedStyle(element).minHeight,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          textFits: text.width === 0 || (text.left >= rect.left - 1 && text.right <= rect.right + 1),
        }
      })

    return { documentWidth: document.documentElement.scrollWidth, controls }
  })
}

test('Russian auth controls fit and keep the expected phone and desktop targets', async ({ browser, baseURL }, testInfo) => {
  test.setTimeout(90_000)
  const reports: AuthViewportReport[] = []
  for (const width of [390, 767, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 844 } })
    const page = await context.newPage()
    const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
    await page.addInitScript(() => localStorage.setItem('dubbed.locale', 'ru'))
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible()
    const signIn = await inspectAuthControls(page)
    reports.push({ width, stage: 'sign-in', ...signIn })
    await testInfo.attach(`sign-in-ru-${width}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

    await page.goto('/reset-password')
    await expect(page.getByRole('heading', { name: 'Сбросить пароль' })).toBeVisible()
    await expect(page.locator('.auth-screen input[type="email"]')).toBeVisible()
    await page.locator('.auth-screen input[type="email"]').fill(`auth-viewport-${width}@example.test`)
    await page.locator('.auth-form__actions button[type="submit"]').click()
    await expect(page.getByRole('textbox', { name: '6-значный код сброса' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Отправить код ещё раз' })).toBeVisible()
    const reset = await inspectAuthControls(page)
    reports.push({ width, stage: 'password-reset-code', ...reset })
    await testInfo.attach(`password-reset-code-ru-${width}.png`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    })

    diagnostics.assertClean()
    await context.close()
  }

  await testInfo.attach('auth-viewport-metrics.json', {
    body: Buffer.from(JSON.stringify(reports, null, 2)),
    contentType: 'application/json',
  })
  console.log(`AUTH_VIEWPORT_METRICS ${JSON.stringify(reports)}`)

  for (const report of reports) {
    expect(report.documentWidth, `${report.width}px ${report.stage} horizontal overflow`)
      .toBeLessThanOrEqual(report.width)

    const labels = report.controls.filter((control) => control.tag === 'button' || control.tag === 'a')
    for (const control of labels) {
      expect(control.textFits, `${report.width}px ${report.stage} clipped label: ${control.label}`)
        .toBe(true)
    }

    if (report.width < 768) {
      for (const control of report.controls) {
        expect(control.height, `${report.width}px ${report.stage} target: ${control.label}`)
          .toBeGreaterThanOrEqual(48)
      }
    } else {
      for (const control of report.controls.filter((item) => item.tag === 'button')) {
        expect(control.height, `${report.width}px ${report.stage} desktop button: ${control.label}`)
          .toBeGreaterThanOrEqual(24)
        expect(control.height, `${report.width}px ${report.stage} desktop button: ${control.label}`)
          .toBeLessThanOrEqual(32)
      }
    }
  }

})
