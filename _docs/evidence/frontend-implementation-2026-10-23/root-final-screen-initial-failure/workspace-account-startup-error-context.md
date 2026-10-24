# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Account screen >> delete cancel closes without calling the service; unknown outcome keeps confirmation
- Location: e2e\workspace-state-visual.spec.ts:157:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('main.app-main')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('main.app-main') with timeout 5000ms
  - waiting for locator('main.app-main')

```

# Test source

```ts
  1   | import { mkdirSync, writeFileSync } from 'node:fs'
  2   | import { dirname, resolve } from 'node:path'
  3   | import { fileURLToPath } from 'node:url'
  4   | import { expect, test, type Browser, type Page } from '@playwright/test'
  5   | 
  6   | declare global {
  7   |   interface Window {
  8   |     __workspaceStateVisual?: {
  9   |       screen: 'account' | 'credits' | 'projects' | 'newdub'
  10  |       scenario: string
  11  |       calls: string[]
  12  |       release: (name: string) => void
  13  |     }
  14  |   }
  15  | }
  16  | 
  17  | const evidenceDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..', '_docs/evidence/frontend-implementation-2026-10-23/workspace-state-ui')
  18  | mkdirSync(evidenceDir, { recursive: true })
  19  | 
  20  | type Locale = 'en-US' | 'ru-RU'
  21  | type Size = { width: number; height: number }
  22  | const reviewedFacts: Array<Record<string, unknown>> = []
  23  | 
  24  | async function openScene(
  25  |   browser: Browser,
  26  |   screen: 'account' | 'credits' | 'projects' | 'newdub',
  27  |   scenario: string,
  28  |   options: { locale?: Locale; viewport?: Size } = {},
  29  | ) {
  30  |   const locale = options.locale ?? 'en-US'
  31  |   const context = await browser.newContext({
  32  |     locale,
  33  |     viewport: options.viewport ?? { width: 1440, height: 1000 },
  34  |     colorScheme: 'light',
  35  |     hasTouch: (options.viewport?.width ?? 1440) < 768,
  36  |   })
  37  |   const page = await context.newPage()
  38  |   await page.goto(`/e2e/harness/workspace-state-visual.html?screen=${screen}&scenario=${scenario}&locale=${locale === 'ru-RU' ? 'ru' : 'en'}`)
> 39  |   await expect(page.locator('main.app-main')).toBeVisible()
      |                                               ^ Error: expect(locator).toBeVisible() failed
  40  |   await expect(page.locator('main.app-main h1')).toBeVisible()
  41  |   await expect(page.locator('html')).toHaveAttribute('lang', locale === 'ru-RU' ? 'ru' : 'en')
  42  |   await page.evaluate(() => document.fonts.ready)
  43  |   return { context, page }
  44  | }
  45  | 
  46  | async function capture(page: Page, name: string, fullPage = true) {
  47  |   await page.evaluate(() => document.fonts.ready)
  48  |   const facts = await page.evaluate(() => {
  49  |     const main = document.querySelector<HTMLElement>('main.app-main')
  50  |     const controls = [...(main?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? [])]
  51  |       .filter((element) => element.getClientRects().length > 0)
  52  |       .map((element) => {
  53  |         const rect = element.getBoundingClientRect()
  54  |         return {
  55  |           tag: element.tagName.toLowerCase(),
  56  |           text: element.textContent?.trim() ?? '',
  57  |           ariaLabel: element.getAttribute('aria-label'),
  58  |           id: element.id || null,
  59  |           className: typeof element.className === 'string' ? element.className : '',
  60  |           width: rect.width,
  61  |           height: rect.height,
  62  |         }
  63  |       })
  64  |     return {
  65  |       lang: document.documentElement.lang,
  66  |       viewportWidth: window.innerWidth,
  67  |       documentWidth: document.documentElement.scrollWidth,
  68  |       mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  69  |       controls,
  70  |     }
  71  |   })
  72  |   await page.screenshot({ path: resolve(evidenceDir, name), fullPage })
  73  |   reviewedFacts.push({ screenshot: name, ...facts })
  74  |   return facts
  75  | }
  76  | 
  77  | async function waitForCall(page: Page, name: string) {
  78  |   await expect.poll(() => page.evaluate((expected) => window.__workspaceStateVisual?.calls.includes(expected) ?? false, name)).toBe(true)
  79  | }
  80  | 
  81  | async function release(page: Page, name: string) {
  82  |   await page.evaluate((action) => window.__workspaceStateVisual?.release(action), name)
  83  | }
  84  | 
  85  | async function expectPhoneSurface(page: Page, locale: 'en' | 'ru', controlSelector: string) {
  86  |   const facts = await page.evaluate(() => ({
  87  |     lang: document.documentElement.lang,
  88  |     width: window.innerWidth,
  89  |     documentWidth: document.documentElement.scrollWidth,
  90  |     mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  91  |   }))
  92  |   const target = page.locator(controlSelector).first()
  93  |   await expect(target).toBeVisible()
  94  |   const targetBox = await target.boundingBox()
  95  |   expect(facts.lang).toBe(locale)
  96  |   expect(facts.documentWidth).toBeLessThanOrEqual(facts.width)
  97  |   expect(facts.mabryLoaded).toBe(true)
  98  |   expect(targetBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  99  | }
  100 | 
  101 | async function accountDeleteDialog(page: Page) {
  102 |   await page.getByRole('button', { name: /Delete account|Удалить аккаунт/i }).first().click()
  103 |   await expect(page.getByRole('dialog')).toBeVisible()
  104 | }
  105 | 
  106 | test.describe('actual Account screen', () => {
  107 |   test('locale save pending is visible in the real Account route', async ({ browser }) => {
  108 |     const { context, page } = await openScene(browser, 'account', 'account-locale-pending')
  109 |     try {
  110 |       await page.locator('#account-locale').selectOption('ru')
  111 |       await waitForCall(page, 'account.setLocale')
  112 |       await expect(page.getByRole('status').first()).toBeVisible()
  113 |       const facts = await capture(page, 'account-locale-save-pending-en-desktop.png')
  114 |       expect(facts.mabryLoaded).toBe(true)
  115 |     } finally {
  116 |       await release(page, 'account.setLocale')
  117 |       await context.close()
  118 |     }
  119 |   })
  120 | 
  121 |   test('locale failure keeps both sign-in methods visible and restores the selected value', async ({ browser }) => {
  122 |     const { context, page } = await openScene(browser, 'account', 'account-locale-failure')
  123 |     try {
  124 |       await page.locator('#account-locale').selectOption('ru')
  125 |       await expect(page.getByRole('alert').first()).toBeVisible()
  126 |       await expect(page.getByText('Email and password')).toBeVisible()
  127 |       await expect(page.getByText('Google')).toBeVisible()
  128 |       expect(await page.locator('#account-locale').inputValue()).toBe('en')
  129 |       const facts = await capture(page, 'account-locale-save-failure-en-desktop.png')
  130 |       expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
  131 |     } finally {
  132 |       await context.close()
  133 |     }
  134 |   })
  135 | 
  136 |   test('invalid password is placed with the fields and retains the attempted values', async ({ browser }) => {
  137 |     const { context, page } = await openScene(browser, 'account', 'account-password-invalid')
  138 |     try {
  139 |       const current = page.locator('input[autocomplete="current-password"]')
```