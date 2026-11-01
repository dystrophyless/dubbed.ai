# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-viewport.spec.ts >> Russian auth controls fit and keep the expected phone and desktop targets
- Location: e2e\auth-viewport.spec.ts:52:1

# Error details

```
Error: 768px sign-in desktop button: Продолжить с Google

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 32
Received:    40
```

# Test source

```ts
  13  |     minHeight: string
  14  |     scrollWidth: number
  15  |     clientWidth: number
  16  |     textFits: boolean
  17  |   }>
  18  | }
  19  | 
  20  | async function inspectAuthControls(page: Parameters<typeof installBrowserDiagnostics>[0]) {
  21  |   return page.locator('.auth-screen').evaluate((root) => {
  22  |     const controls = [...root.querySelectorAll<HTMLElement>('button, a, input')]
  23  |       .filter((element) => {
  24  |         const rect = element.getBoundingClientRect()
  25  |         return rect.width > 0 && rect.height > 0
  26  |       })
  27  |       .map((element) => {
  28  |         const rect = element.getBoundingClientRect()
  29  |         const range = document.createRange()
  30  |         range.selectNodeContents(element)
  31  |         const text = range.getBoundingClientRect()
  32  |         const label = element.getAttribute('aria-label')
  33  |           ?? element.textContent?.trim().replace(/\s+/g, ' ')
  34  |           ?? element.getAttribute('type')
  35  |           ?? ''
  36  |         return {
  37  |           tag: element.tagName.toLowerCase(),
  38  |           label,
  39  |           width: Math.round(rect.width * 100) / 100,
  40  |           height: Math.round(rect.height * 100) / 100,
  41  |           minHeight: getComputedStyle(element).minHeight,
  42  |           scrollWidth: element.scrollWidth,
  43  |           clientWidth: element.clientWidth,
  44  |           textFits: text.width === 0 || (text.left >= rect.left - 1 && text.right <= rect.right + 1),
  45  |         }
  46  |       })
  47  | 
  48  |     return { documentWidth: document.documentElement.scrollWidth, controls }
  49  |   })
  50  | }
  51  | 
  52  | test('Russian auth controls fit and keep the expected phone and desktop targets', async ({ browser, baseURL }, testInfo) => {
  53  |   test.setTimeout(90_000)
  54  |   const reports: AuthViewportReport[] = []
  55  |   for (const width of [390, 767, 768]) {
  56  |     const context = await browser.newContext({ viewport: { width, height: 844 } })
  57  |     const page = await context.newPage()
  58  |     const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  59  |     await page.addInitScript(() => localStorage.setItem('dubbed.locale', 'ru'))
  60  |     await page.goto('/sign-in')
  61  |     await expect(page.getByRole('heading', { name: 'Войти' })).toBeVisible()
  62  |     const signIn = await inspectAuthControls(page)
  63  |     reports.push({ width, stage: 'sign-in', ...signIn })
  64  |     await testInfo.attach(`sign-in-ru-${width}.png`, {
  65  |       body: await page.screenshot({ fullPage: true }),
  66  |       contentType: 'image/png',
  67  |     })
  68  | 
  69  |     await page.goto('/reset-password')
  70  |     await expect(page.getByRole('heading', { name: 'Сбросить пароль' })).toBeVisible()
  71  |     await expect(page.locator('.auth-screen input[type="email"]')).toBeVisible()
  72  |     await page.locator('.auth-screen input[type="email"]').fill(`auth-viewport-${width}@example.test`)
  73  |     await page.locator('.auth-form__actions button[type="submit"]').click()
  74  |     await expect(page.getByRole('textbox', { name: '6-значный код сброса' })).toBeVisible()
  75  |     await expect(page.getByRole('button', { name: 'Отправить код ещё раз' })).toBeVisible()
  76  |     const reset = await inspectAuthControls(page)
  77  |     reports.push({ width, stage: 'password-reset-code', ...reset })
  78  |     await testInfo.attach(`password-reset-code-ru-${width}.png`, {
  79  |       body: await page.screenshot({ fullPage: true }),
  80  |       contentType: 'image/png',
  81  |     })
  82  | 
  83  |     diagnostics.assertClean()
  84  |     await context.close()
  85  |   }
  86  | 
  87  |   await testInfo.attach('auth-viewport-metrics.json', {
  88  |     body: Buffer.from(JSON.stringify(reports, null, 2)),
  89  |     contentType: 'application/json',
  90  |   })
  91  |   console.log(`AUTH_VIEWPORT_METRICS ${JSON.stringify(reports)}`)
  92  | 
  93  |   for (const report of reports) {
  94  |     expect(report.documentWidth, `${report.width}px ${report.stage} horizontal overflow`)
  95  |       .toBeLessThanOrEqual(report.width)
  96  | 
  97  |     const labels = report.controls.filter((control) => control.tag === 'button' || control.tag === 'a')
  98  |     for (const control of labels) {
  99  |       expect(control.textFits, `${report.width}px ${report.stage} clipped label: ${control.label}`)
  100 |         .toBe(true)
  101 |     }
  102 | 
  103 |     if (report.width < 768) {
  104 |       for (const control of report.controls) {
  105 |         expect(control.height, `${report.width}px ${report.stage} target: ${control.label}`)
  106 |           .toBeGreaterThanOrEqual(48)
  107 |       }
  108 |     } else {
  109 |       for (const control of report.controls.filter((item) => item.tag === 'button')) {
  110 |         expect(control.height, `${report.width}px ${report.stage} desktop button: ${control.label}`)
  111 |           .toBeGreaterThanOrEqual(24)
  112 |         expect(control.height, `${report.width}px ${report.stage} desktop button: ${control.label}`)
> 113 |           .toBeLessThanOrEqual(32)
      |            ^ Error: 768px sign-in desktop button: Продолжить с Google
  114 |       }
  115 |     }
  116 |   }
  117 | 
  118 | })
  119 | 
```