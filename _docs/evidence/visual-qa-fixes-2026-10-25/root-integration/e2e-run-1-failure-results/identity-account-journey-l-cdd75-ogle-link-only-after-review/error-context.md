# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity-account-journey.spec.ts >> local mock identity and account journeys >> persists the account locale, changes its password, and commits a dual-proof Google link only after review
- Location: e2e\identity-account-journey.spec.ts:223:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 48
Received: 16
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to content" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - generic [ref=e6]:
      - link "Dubbed — Home" [ref=e7] [cursor=pointer]:
        - /url: /
        - generic [ref=e8]: Dubbed
      - navigation "Main navigation" [ref=e9]:
        - link "New dub" [ref=e10] [cursor=pointer]:
          - /url: /new
        - link "Projects" [ref=e11] [cursor=pointer]:
          - /url: /projects
        - link "Credits" [ref=e12] [cursor=pointer]:
          - /url: /credits
        - link "Account" [ref=e13] [cursor=pointer]:
          - /url: /account
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e16]: Credits
          - strong [ref=e17]: "120"
        - generic [ref=e19]:
          - generic [ref=e20]: Language
          - combobox "Language" [ref=e21] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=e22] [cursor=pointer]
  - main [ref=e23]:
    - generic [ref=e25]:
      - generic [ref=e26]:
        - generic [ref=e27]:
          - heading "Account" [level=1] [ref=e28]
          - paragraph [ref=e29]: Manage your language, sign-in methods, and account access.
        - paragraph [ref=e30]: dubbed-account-link-6e76b41e-828c-4549-b13f-a76a10150711@example.test
      - status [ref=e31]: This preview uses simulated account data. Changes stay in this browser.
      - region [ref=e32]:
        - generic [ref=e33]:
          - heading "Language" [level=2] [ref=e34]
          - paragraph [ref=e40]: Choose the language used across Dubbed.
        - generic [ref=e41]:
          - generic [ref=e42]: Language
          - combobox "Language" [ref=e43]:
            - option "English" [selected]
            - option "Русский"
      - region [ref=e44]:
        - generic [ref=e45]:
          - heading "Sign-in methods" [level=2] [ref=e46]
          - paragraph [ref=e47]: These methods are reported by your account. Email addresses are not used to infer a link.
        - generic [ref=e48]:
          - generic [ref=e49]:
            - generic [ref=e56]:
              - heading "Google" [level=3] [ref=e57]
              - paragraph [ref=e58]: Not linked
            - button "Link method" [ref=e59] [cursor=pointer]
          - generic [ref=e63]:
            - generic [ref=e65]: "@"
            - generic [ref=e66]:
              - heading "Email and password" [level=3] [ref=e67]
              - paragraph [ref=e68]: dubbed-account-link-6e76b41e-828c-4549-b13f-a76a10150711@example.test
              - paragraph [ref=e69]: Verified
            - generic [ref=e70]: Linked
          - generic [ref=e71]:
            - heading "Change password" [level=3] [ref=e72]
            - generic [ref=e73]:
              - generic [ref=e74]:
                - generic [ref=e75]: Current password
                - textbox "Current password" [ref=e76]
              - generic [ref=e77]:
                - generic [ref=e78]: New password
                - textbox "New password" [ref=e79]
                - paragraph [ref=e80]: Use at least 8 characters. No character classes are required.
            - generic [ref=e81]:
              - button "Save password" [ref=e82] [cursor=pointer]
              - button "Forgot password?" [ref=e83] [cursor=pointer]
      - region [ref=e86]:
        - generic [ref=e87]:
          - heading "Session" [level=2] [ref=e88]
          - paragraph [ref=e89]: Sign out from this device.
        - button "Sign out" [ref=e91] [cursor=pointer]
      - region [ref=e95]:
        - generic [ref=e96]:
          - heading "Delete account" [level=2] [ref=e97]
          - paragraph [ref=e98]: This action removes your access to account data and projects.
        - button "Delete account" [ref=e100] [cursor=pointer]
```

# Test source

```ts
  21  |   appGutterLeft: number
  22  |   appGutterRight: number
  23  |   screenLeft: number
  24  |   screenWidth: number
  25  |   titleLeft: number
  26  |   screenPaddingTop: number
  27  |   screenPaddingBottom: number
  28  |   documentWidth: number
  29  |   mabryLoaded: boolean
  30  |   screenshot: string | null
  31  | }
  32  | const layoutMeasurements: LayoutMeasurement[] = []
  33  | 
  34  | async function withDiagnostics(
  35  |   page: Page,
  36  |   baseURL: string | undefined,
  37  |   run: () => Promise<void>,
  38  | ): Promise<void> {
  39  |   const diagnostics = await installBrowserDiagnostics(page, baseURL ?? 'http://127.0.0.1:4173')
  40  |   try {
  41  |     await run()
  42  |   } finally {
  43  |     diagnostics.assertClean()
  44  |   }
  45  | }
  46  | 
  47  | async function registerThroughUi(page: Page, label: string) {
  48  |   const credentials = newE2ECredentials(label)
  49  |   const code = await startRegistrationFromLanding(page, credentials)
  50  |   await completeVisibleRegistration(page, code)
  51  |   return credentials
  52  | }
  53  | 
  54  | async function signOutThroughUi(page: Page): Promise<void> {
  55  |   await page.getByRole('banner').getByRole('button', { name: 'Sign out', exact: true }).click()
  56  |   await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  57  | }
  58  | 
  59  | async function signInThroughUi(page: Page, email: string, password: string): Promise<void> {
  60  |   await page.goto('/sign-in')
  61  |   await page.getByLabel('Email').fill(email)
  62  |   await page.getByLabel('Password', { exact: true }).fill(password)
  63  |   await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  64  | }
  65  | 
  66  | async function assertScreenUsesAppContentGutter(
  67  |   page: Page,
  68  |   screenSelector: '.account-screen' | '.account-linking-screen',
  69  |   locale: LayoutLocale,
  70  |   heading: string,
  71  |   maxWidth: number,
  72  | ): Promise<void> {
  73  |   const widths = [390, 767, 768, 1440]
  74  | 
  75  |   for (const width of widths) {
  76  |     await page.setViewportSize({ width, height: 900 })
  77  |     const main = page.getByRole('main')
  78  |     await expect(main).toHaveCount(1)
  79  |     await expect(main.getByRole('heading', { name: heading, exact: true })).toBeVisible()
  80  |     await page.evaluate(() => document.fonts.ready)
  81  | 
  82  |     const geometry = await page.locator(screenSelector).evaluate((screen) => {
  83  |       const appMain = document.getElementById('main-content')
  84  |       const title = screen.querySelector('h1')
  85  |       if (!appMain || !title) throw new Error('The active app shell and screen title must be mounted.')
  86  |       const appRect = appMain.getBoundingClientRect()
  87  |       const appStyle = window.getComputedStyle(appMain)
  88  |       const contentLeft = appRect.left + Number.parseFloat(appStyle.paddingLeft)
  89  |       const contentRight = appRect.right - Number.parseFloat(appStyle.paddingRight)
  90  |       const screenRect = screen.getBoundingClientRect()
  91  | 
  92  |       return {
  93  |         mainCount: document.querySelectorAll('main').length,
  94  |         contentLeft,
  95  |         contentWidth: contentRight - contentLeft,
  96  |         appGutterLeft: Number.parseFloat(appStyle.paddingLeft),
  97  |         appGutterRight: Number.parseFloat(appStyle.paddingRight),
  98  |         screenLeft: screenRect.left,
  99  |         screenWidth: screenRect.width,
  100 |         titleLeft: title.getBoundingClientRect().left,
  101 |         screenPaddingTop: Number.parseFloat(window.getComputedStyle(screen).paddingTop),
  102 |         screenPaddingBottom: Number.parseFloat(window.getComputedStyle(screen).paddingBottom),
  103 |         documentWidth: document.documentElement.scrollWidth,
  104 |         mabryLoaded: document.fonts.check('16px "Mabry Pro"'),
  105 |       }
  106 |     })
  107 |     const expectedWidth = Math.min(geometry.contentWidth, maxWidth)
  108 |     const expectedLeft = geometry.contentLeft + (geometry.contentWidth - expectedWidth) / 2
  109 |     const phone = width < 768
  110 |     const expectedGutter = phone ? 16 : 32
  111 |     const expectedVerticalPadding = screenSelector === '.account-screen'
  112 |       ? (phone ? { top: 32, bottom: 56 } : { top: 48, bottom: 80 })
  113 |       : (phone ? { top: 24, bottom: 52 } : { top: 40, bottom: 72 })
  114 | 
  115 |     expect(geometry.mainCount).toBe(1)
  116 |     expect(geometry.screenWidth).toBeCloseTo(expectedWidth, 0)
  117 |     expect(geometry.screenLeft).toBeCloseTo(expectedLeft, 0)
  118 |     expect(geometry.titleLeft).toBeCloseTo(expectedLeft, 0)
  119 |     expect(geometry.appGutterLeft).toBe(expectedGutter)
  120 |     expect(geometry.appGutterRight).toBe(expectedGutter)
> 121 |     expect(geometry.screenPaddingTop).toBe(expectedVerticalPadding.top)
      |                                       ^ Error: expect(received).toBe(expected) // Object.is equality
  122 |     expect(geometry.screenPaddingBottom).toBe(expectedVerticalPadding.bottom)
  123 |     expect(geometry.documentWidth).toBeLessThanOrEqual(width)
  124 | 
  125 |     const screenshot = width === 390 || width === 1440
  126 |       ? `${screenSelector.slice(1)}-${locale}-${width}.png`
  127 |       : null
  128 |     if (screenshot) {
  129 |       mkdirSync(layoutEvidenceDirectory, { recursive: true })
  130 |       await page.evaluate(() => document.fonts.ready)
  131 |       await page.screenshot({
  132 |         path: resolve(layoutEvidenceDirectory, screenshot),
  133 |         fullPage: true,
  134 |         animations: 'disabled',
  135 |       })
  136 |     }
  137 |     layoutMeasurements.push({
  138 |       screen: screenSelector.slice(1),
  139 |       locale,
  140 |       viewportWidth: width,
  141 |       mainCount: geometry.mainCount,
  142 |       appContentLeft: geometry.contentLeft,
  143 |       appContentWidth: geometry.contentWidth,
  144 |       appGutterLeft: geometry.appGutterLeft,
  145 |       appGutterRight: geometry.appGutterRight,
  146 |       screenLeft: geometry.screenLeft,
  147 |       screenWidth: geometry.screenWidth,
  148 |       titleLeft: geometry.titleLeft,
  149 |       screenPaddingTop: geometry.screenPaddingTop,
  150 |       screenPaddingBottom: geometry.screenPaddingBottom,
  151 |       documentWidth: geometry.documentWidth,
  152 |       mabryLoaded: geometry.mabryLoaded,
  153 |       screenshot,
  154 |     })
  155 |   }
  156 | 
  157 |   await page.setViewportSize({ width: 1440, height: 900 })
  158 | }
  159 | 
  160 | function writeLayoutEvidence(): void {
  161 |   mkdirSync(layoutEvidenceDirectory, { recursive: true })
  162 |   writeFileSync(resolve(layoutEvidenceDirectory, 'account-app-layout.json'), `${JSON.stringify({
  163 |     capturedAt: new Date().toISOString(),
  164 |     command: 'npm.cmd run test:e2e -- e2e/identity-account-journey.spec.ts',
  165 |     factBoundary: 'Actual App route geometry with deterministic local mock identity data; no live identity provider or account service.',
  166 |     expected: {
  167 |       appGutter: { desktop: 32, phone: 16 },
  168 |       accountMaximumWidth: 1200,
  169 |       accountLinkingMaximumWidth: 840,
  170 |       mainLandmarks: 1,
  171 |       viewportWidths: [390, 767, 768, 1440],
  172 |     },
  173 |     measurements: layoutMeasurements,
  174 |   }, null, 2)}\n`)
  175 | }
  176 | 
  177 | test.describe('local mock identity and account journeys', () => {
  178 |   test('keeps credential errors neutral, completes reset from visible mock OTP, and reauthenticates with the new password', async ({ page, baseURL }) => {
  179 |     test.setTimeout(90_000)
  180 |     page.setDefaultTimeout(20_000)
  181 |     await withDiagnostics(page, baseURL, async () => {
  182 |       const credentials = await registerThroughUi(page, 'password-reset')
  183 |       const incorrectPassword = `${credentials.password}-incorrect`
  184 |       const newPassword = `${credentials.password}-reset`
  185 | 
  186 |       await signOutThroughUi(page)
  187 |       await signInThroughUi(page, credentials.email, incorrectPassword)
  188 |       await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
  189 |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  190 |       await expect(page.getByLabel('Password', { exact: true })).toHaveValue(incorrectPassword)
  191 | 
  192 |       await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
  193 |       await expect(page).toHaveURL(/\/reset-password(?:$|[?#])$/)
  194 |       await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible()
  195 |       await page.getByLabel('Email').fill(credentials.email)
  196 |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  197 |       await page.getByRole('button', { name: 'Send reset email', exact: true }).click()
  198 | 
  199 |       const localCodeNotice = page.getByText(/Local mock code:.*No email was sent\./i)
  200 |       await expect(localCodeNotice).toBeVisible()
  201 |       const resetCode = (await localCodeNotice.innerText()).match(/\b\d{6}\b/)?.[0]
  202 |       expect(resetCode, 'the local mock reset notice should show its synthetic six-digit code').toBeTruthy()
  203 | 
  204 |       await page.getByLabel('6-digit reset code').fill(resetCode!)
  205 |       await expect(page.getByLabel('New password', { exact: true })).toBeVisible({ timeout: 15_000 })
  206 |       await page.getByLabel('New password', { exact: true }).fill(newPassword)
  207 |       await page.getByLabel('Repeat new password').fill(newPassword)
  208 |       await page.getByRole('button', { name: 'Save new password', exact: true }).click()
  209 |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  210 | 
  211 |       // Reset keeps the verified session. Sign out and prove the new credential at the normal sign-in form.
  212 |       await signOutThroughUi(page)
  213 |       await signInThroughUi(page, credentials.email, credentials.password)
  214 |       await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
  215 |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  216 |       await expect(page.getByLabel('Password', { exact: true })).toHaveValue(credentials.password)
  217 |       await page.getByLabel('Password', { exact: true }).fill(newPassword)
  218 |       await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  219 |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  220 |     })
  221 |   })
```