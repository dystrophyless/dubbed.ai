# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Account screen >> locale failure keeps both sign-in methods visible and restores the selected value
- Location: e2e\workspace-state-visual.spec.ts:142:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert').filter({ hasText: 'The language change could not be saved. The language saved in your account has been restored.' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('alert').filter({ hasText: 'The language change could not be saved. The language saved in your account has been restored.' }) with timeout 5000ms
  - waiting for getByRole('alert').filter({ hasText: 'The language change could not be saved. The language saved in your account has been restored.' })

```

```yaml
- link "Skip to content":
  - /url: "#main-content"
- banner:
  - link "Dubbed — Home":
    - /url: /
    - text: Dubbed
  - navigation "Main navigation":
    - link "New dub":
      - /url: /new
    - link "Projects":
      - /url: /projects
    - link "Credits":
      - /url: /credits
    - link "Account":
      - /url: /account
  - text: Credits
  - strong: "120"
  - text: Language
  - combobox "Language":
    - option "EN" [selected]
    - option "RU"
  - status: The language change could not be saved. The language saved in your account has been restored.
  - button "Sign out"
- main:
  - heading "Account" [level=1]
  - paragraph: Manage your language, sign-in methods, and account access.
  - paragraph: workspace-visual@example.invalid
  - status: This preview uses simulated account data. Changes stay in this browser.
  - region "Language":
    - heading "Language" [level=2]
    - paragraph: Choose the language used across Dubbed.
    - text: Language
    - combobox "Language":
      - option "English" [selected]
      - option "Русский"
    - alert:
      - text: The account language was not saved. English is still selected. Retry to save the account preference.
      - button "Retry saving language"
  - region "Sign-in methods":
    - heading "Sign-in methods" [level=2]
    - paragraph: These methods are reported by your account. Email addresses are not used to infer a link.
    - heading "Google" [level=3]
    - paragraph: workspace-visual@example.invalid
    - paragraph: Verified
    - text: Linked
    - heading "Email and password" [level=3]
    - paragraph: workspace-visual@example.invalid
    - paragraph: Verified
    - text: Linked
    - heading "Change password" [level=3]
    - text: Current password
    - textbox "Current password"
    - text: New password
    - textbox "New password"
    - paragraph: Use at least 8 characters. No character classes are required.
    - button "Save password"
    - button "Forgot password?"
  - region "Session":
    - heading "Session" [level=2]
    - paragraph: Sign out from this device.
    - button "Sign out"
  - region "Delete account":
    - heading "Delete account" [level=2]
    - paragraph: This action removes your access to account data and projects.
    - button "Delete account"
```

# Test source

```ts
  49  |   })
  50  |   const startupDiagnostics = () => startupFailures.length > 0
  51  |     ? startupFailures.join('\n')
  52  |     : 'No pageerror or failed/non-OK script request was observed.'
  53  |   const response = await page.goto(`/e2e/harness/workspace-state-visual.html?screen=${screen}&scenario=${scenario}&locale=${locale === 'ru-RU' ? 'ru' : 'en'}`)
  54  |   expect(response?.ok(), `Harness HTML response was ${response?.status() ?? 'missing'}; ${startupDiagnostics()}`).toBe(true)
  55  |   try {
  56  |     await expect.poll(() => page.evaluate(() => window.__workspaceStateVisual?.screen ?? null), { timeout: 15_000 }).toBe(screen)
  57  |     await expect(page.locator('main.app-main')).toBeVisible({ timeout: 15_000 })
  58  |     await expect(page.locator('main.app-main h1')).toBeVisible({ timeout: 15_000 })
  59  |   } catch (error) {
  60  |     throw new Error(`Workspace harness did not reach its visible App route. ${startupDiagnostics()}\n${String(error)}`)
  61  |   }
  62  |   await expect(page.locator('html')).toHaveAttribute('lang', locale === 'ru-RU' ? 'ru' : 'en')
  63  |   await page.evaluate(() => document.fonts.ready)
  64  |   return { context, page }
  65  | }
  66  | 
  67  | async function capture(page: Page, name: string, fullPage = true) {
  68  |   await page.evaluate(() => document.fonts.ready)
  69  |   const facts = await page.evaluate(() => {
  70  |     const main = document.querySelector<HTMLElement>('main.app-main')
  71  |     const controls = [...(main?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])') ?? [])]
  72  |       .filter((element) => element.getClientRects().length > 0)
  73  |       .map((element) => {
  74  |         const rect = element.getBoundingClientRect()
  75  |         return {
  76  |           tag: element.tagName.toLowerCase(),
  77  |           text: element.textContent?.trim() ?? '',
  78  |           ariaLabel: element.getAttribute('aria-label'),
  79  |           id: element.id || null,
  80  |           className: typeof element.className === 'string' ? element.className : '',
  81  |           width: rect.width,
  82  |           height: rect.height,
  83  |         }
  84  |       })
  85  |     return {
  86  |       lang: document.documentElement.lang,
  87  |       viewportWidth: window.innerWidth,
  88  |       documentWidth: document.documentElement.scrollWidth,
  89  |       mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  90  |       controls,
  91  |     }
  92  |   })
  93  |   await page.screenshot({ path: resolve(evidenceDir, name), fullPage, animations: 'disabled' })
  94  |   reviewedFacts.push({ screenshot: name, ...facts })
  95  |   return facts
  96  | }
  97  | 
  98  | async function waitForCall(page: Page, name: string) {
  99  |   await expect.poll(() => page.evaluate((expected) => window.__workspaceStateVisual?.calls.includes(expected) ?? false, name)).toBe(true)
  100 | }
  101 | 
  102 | async function release(page: Page, name: string) {
  103 |   await page.evaluate((action) => window.__workspaceStateVisual?.release(action), name)
  104 | }
  105 | 
  106 | async function expectPhoneSurface(page: Page, locale: 'en' | 'ru', controlSelector: string) {
  107 |   const facts = await page.evaluate(() => ({
  108 |     lang: document.documentElement.lang,
  109 |     width: window.innerWidth,
  110 |     documentWidth: document.documentElement.scrollWidth,
  111 |     mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  112 |   }))
  113 |   const target = page.locator(controlSelector).first()
  114 |   await expect(target).toBeVisible()
  115 |   const targetBox = await target.boundingBox()
  116 |   expect(facts.lang).toBe(locale)
  117 |   expect(facts.documentWidth).toBeLessThanOrEqual(facts.width)
  118 |   expect(facts.mabryLoaded).toBe(true)
  119 |   expect(targetBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  120 | }
  121 | 
  122 | async function accountDeleteDialog(page: Page) {
  123 |   await page.getByRole('button', { name: /Delete account|Удалить аккаунт/i }).first().click()
  124 |   await expect(page.getByRole('dialog')).toBeVisible()
  125 | }
  126 | 
  127 | test.describe('actual Account screen', () => {
  128 |   test('locale save pending is visible in the real Account route', async ({ browser }) => {
  129 |     const { context, page } = await openScene(browser, 'account', 'account-locale-pending')
  130 |     try {
  131 |       await page.locator('#account-locale').selectOption('ru')
  132 |       await waitForCall(page, 'account.setLocale')
  133 |       await expect(page.getByRole('status').first()).toBeVisible()
  134 |       const facts = await capture(page, 'account-locale-save-pending-en-desktop.png')
  135 |       expect(facts.mabryLoaded).toBe(true)
  136 |     } finally {
  137 |       await release(page, 'account.setLocale')
  138 |       await context.close()
  139 |     }
  140 |   })
  141 | 
  142 |   test('locale failure keeps both sign-in methods visible and restores the selected value', async ({ browser }) => {
  143 |     const { context, page } = await openScene(browser, 'account', 'account-locale-failure')
  144 |     try {
  145 |       await page.locator('#account-locale').selectOption('ru')
  146 |       const localeFailure = page.getByRole('alert').filter({
  147 |         hasText: 'The language change could not be saved. The language saved in your account has been restored.',
  148 |       })
> 149 |       await expect(localeFailure).toBeVisible()
      |                                   ^ Error: expect(locator).toBeVisible() failed
  150 |       await expect(localeFailure.getByRole('button', { name: 'Retry saving language', exact: true })).toBeVisible()
  151 |       await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  152 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  153 |       await expect(page.getByText('Email and password')).toBeVisible()
  154 |       await expect(page.getByText('Google')).toBeVisible()
  155 |       expect(await page.locator('#account-locale').inputValue()).toBe('en')
  156 |       const facts = await capture(page, 'account-locale-save-failure-en-desktop.png')
  157 |       expect(facts.documentWidth).toBeLessThanOrEqual(facts.viewportWidth)
  158 |     } finally {
  159 |       await context.close()
  160 |     }
  161 |   })
  162 | 
  163 |   test('invalid password is placed with the fields and retains the attempted values', async ({ browser }) => {
  164 |     const { context, page } = await openScene(browser, 'account', 'account-password-invalid')
  165 |     try {
  166 |       const current = page.locator('input[autocomplete="current-password"]')
  167 |       const next = page.locator('input[autocomplete="new-password"]')
  168 |       await current.fill('incorrect-current-password')
  169 |       await next.fill('replacement-password-123')
  170 |       await page.getByRole('button', { name: 'Save password' }).click()
  171 |       await waitForCall(page, 'account.changePassword')
  172 |       const currentPasswordError = page.getByText('Current password is incorrect. Check it and try again.', { exact: true })
  173 |       await expect(currentPasswordError).toBeVisible()
  174 |       await expect(current).toHaveAttribute('aria-invalid', 'true')
  175 |       await expect(current).toHaveValue('incorrect-current-password')
  176 |       await expect(next).toHaveValue('replacement-password-123')
  177 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  178 |       await expect(page.getByText('Sign in to view account settings.')).toHaveCount(0)
  179 |       const errorId = await currentPasswordError.getAttribute('id')
  180 |       const describedBy = (await current.getAttribute('aria-describedby'))?.split(/\s+/) ?? []
  181 |       expect(errorId).toBeTruthy()
  182 |       expect(describedBy).toContain(errorId)
  183 |       const [errorBox, submitBox] = await Promise.all([
  184 |         currentPasswordError.boundingBox(),
  185 |         page.getByRole('button', { name: 'Save password' }).boundingBox(),
  186 |       ])
  187 |       expect(errorBox).not.toBeNull()
  188 |       expect(submitBox).not.toBeNull()
  189 |       expect(errorBox!.y).toBeLessThan(submitBox!.y)
  190 |       await capture(page, 'account-invalid-password-en-desktop.png')
  191 |     } finally {
  192 |       await context.close()
  193 |     }
  194 |   })
  195 | 
  196 |   test('delete cancel closes without calling the service; unknown outcome keeps confirmation', async ({ browser }) => {
  197 |     const cancelScene = await openScene(browser, 'account', 'account-delete-cancel')
  198 |     try {
  199 |       const opener = cancelScene.page.getByRole('button', { name: 'Delete account' }).first()
  200 |       await opener.click()
  201 |       await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
  202 |       await capture(cancelScene.page, 'account-delete-soft-red-confirmation-en-desktop.png', false)
  203 |       await cancelScene.page.getByRole('button', { name: 'Cancel' }).click()
  204 |       await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
  205 |       await expect(opener).toBeFocused()
  206 |       expect(await cancelScene.page.evaluate(() => window.__workspaceStateVisual?.calls.includes('account.delete'))).toBe(false)
  207 |       await opener.click()
  208 |       await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
  209 |       await cancelScene.page.keyboard.press('Escape')
  210 |       await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
  211 |       await expect(opener).toBeFocused()
  212 |     } finally {
  213 |       await cancelScene.context.close()
  214 |     }
  215 | 
  216 |     const unknownScene = await openScene(browser, 'account', 'account-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  217 |     try {
  218 |       await accountDeleteDialog(unknownScene.page)
  219 |       const confirmation = unknownScene.page.getByRole('dialog').getByRole('textbox')
  220 |       await confirmation.fill('УДАЛИТЬ')
  221 |       await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Удалить аккаунт', exact: true }).last().click()
  222 |       await expect(unknownScene.page.getByRole('dialog').getByRole('button', { name: /проверить удаление/i })).toBeVisible()
  223 |       await expectPhoneSurface(unknownScene.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
  224 |       await capture(unknownScene.page, 'account-delete-unknown-ru-phone.png', false)
  225 |       const recovery = unknownScene.page.getByRole('button', { name: /проверить удаление/i })
  226 |       await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
  227 |       await expect(unknownScene.page.getByRole('dialog')).toHaveCount(0)
  228 |       await expect(recovery).toBeFocused()
  229 |     } finally {
  230 |       await unknownScene.context.close()
  231 |     }
  232 | 
  233 |     const failed = await openScene(browser, 'account', 'account-delete-error')
  234 |     try {
  235 |       const opener = failed.page.locator('.account-screen__delete-action').getByRole('button', { name: 'Delete account' })
  236 |       await accountDeleteDialog(failed.page)
  237 |       await failed.page.getByRole('dialog').getByRole('textbox').fill('DELETE')
  238 |       await failed.page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).last().click()
  239 |       await expect(failed.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
  240 |       await capture(failed.page, 'account-delete-known-failure-en-desktop.png', false)
  241 |       await failed.page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  242 |       await expect(failed.page.getByRole('dialog')).toHaveCount(0)
  243 |       await expect(opener).toBeFocused()
  244 |     } finally {
  245 |       await failed.context.close()
  246 |     }
  247 |   })
  248 | })
  249 | 
```