# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity-account-journey.spec.ts >> local mock identity and account journeys >> persists the account locale, changes its password, and commits a dual-proof Google link only after review
- Location: e2e\identity-account-journey.spec.ts:223:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('alert')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('alert') with timeout 5000ms
  - waiting for getByRole('alert')

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
  - button "Sign out"
- main:
  - heading "Account" [level=1]
  - paragraph: Manage your language, sign-in methods, and account access.
  - paragraph: dubbed-account-link-46eebea4-5729-4b2e-b821-aaa346a5679e@example.test
  - status: This preview uses simulated account data. Changes stay in this browser.
  - region "Language":
    - heading "Language" [level=2]
    - paragraph: Choose the language used across Dubbed.
    - text: Language
    - combobox "Language":
      - option "English" [selected]
      - option "Русский"
  - region "Sign-in methods":
    - heading "Sign-in methods" [level=2]
    - paragraph: These methods are reported by your account. Email addresses are not used to infer a link.
    - heading "Google" [level=3]
    - paragraph: Not linked
    - button "Link method"
    - heading "Email and password" [level=3]
    - paragraph: dubbed-account-link-46eebea4-5729-4b2e-b821-aaa346a5679e@example.test
    - paragraph: Verified
    - text: Linked
    - heading "Change password" [level=3]
    - text: Current password
    - textbox "Current password" [invalid]: Local-e2e-46eebea4-5729-4b2e-b821-aaa346a5679e!-incorrect
    - paragraph: Current password is incorrect. Check it and try again.
    - text: New password
    - textbox "New password": Local-e2e-46eebea4-5729-4b2e-b821-aaa346a5679e!-account
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
  222 | 
  223 |   test('persists the account locale, changes its password, and commits a dual-proof Google link only after review', async ({ page, baseURL }) => {
  224 |     test.setTimeout(90_000)
  225 |     page.setDefaultTimeout(20_000)
  226 |     await withDiagnostics(page, baseURL, async () => {
  227 |       const credentials = await registerThroughUi(page, 'account-link')
  228 |       const newPassword = `${credentials.password}-account`
  229 |       layoutMeasurements.length = 0
  230 | 
  231 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects', exact: true }).click()
  232 |       await expect(page.getByRole('heading', { name: 'No projects yet', exact: true })).toBeVisible()
  233 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  234 |       const credits = page.getByRole('region', { name: 'Credits' })
  235 |       const available = credits.getByText('Available', { exact: true }).locator('..').locator('strong')
  236 |       await expect(available).toBeVisible()
  237 |       const initialAvailable = Number(await available.innerText())
  238 |       expect(initialAvailable).toBeGreaterThan(0)
  239 |       await expect(page.getByText('Welcome credits', { exact: true })).toHaveCount(1)
  240 | 
  241 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  242 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  243 |       await assertScreenUsesAppContentGutter(page, '.account-screen', 'en', 'Account', 1200)
  244 | 
  245 |       const main = page.getByRole('main')
  246 |       await main.getByRole('combobox', { name: 'Language' }).selectOption('ru')
  247 |       await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
  248 |       await assertScreenUsesAppContentGutter(page, '.account-screen', 'ru', 'Аккаунт', 1200)
  249 |       await page.getByRole('main').getByRole('combobox', { name: 'Язык' }).selectOption('en')
  250 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  251 | 
  252 |       const incorrectCurrentPassword = `${credentials.password}-incorrect`
  253 |       await page.getByLabel('Current password', { exact: true }).fill(incorrectCurrentPassword)
  254 |       await page.getByLabel('New password', { exact: true }).fill(newPassword)
  255 |       await page.getByRole('button', { name: 'Save password', exact: true }).click()
> 256 |       await expect(page.getByRole('alert')).toBeVisible()
      |                                             ^ Error: expect(locator).toBeVisible() failed
  257 |       await expect(page.getByLabel('Current password', { exact: true })).toHaveValue(incorrectCurrentPassword)
  258 |       await expect(page.getByLabel('New password', { exact: true })).toHaveValue(newPassword)
  259 | 
  260 |       await page.getByLabel('Current password', { exact: true }).fill(credentials.password)
  261 |       await page.getByRole('button', { name: 'Save password', exact: true }).click()
  262 |       await expect(page.getByText('Password changed. This device stays signed in; other sessions were revoked.', { exact: true })).toBeVisible()
  263 | 
  264 |       await page.getByRole('button', { name: 'Link method', exact: true }).click()
  265 |       await expect(page.getByRole('heading', { name: 'Link a sign-in method' })).toBeVisible()
  266 |       await assertScreenUsesAppContentGutter(page, '.account-linking-screen', 'en', 'Link a sign-in method', 840)
  267 |       await expect(page.getByText('This preview uses simulated account data. No real email or Google account is contacted.', { exact: true })).toBeVisible()
  268 | 
  269 |       await page.locator('.account-linking-screen__back').click()
  270 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  271 |       await page.getByRole('main').getByRole('combobox', { name: 'Language' }).selectOption('ru')
  272 |       await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
  273 |       await page.locator('.account-screen__method button').click()
  274 |       await expect(page.getByRole('heading', { name: 'Подключить способ входа', exact: true })).toBeVisible()
  275 |       await assertScreenUsesAppContentGutter(page, '.account-linking-screen', 'ru', 'Подключить способ входа', 840)
  276 |       writeLayoutEvidence()
  277 |       await page.locator('.account-linking-screen__back').click()
  278 |       await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
  279 |       await page.getByRole('main').getByRole('combobox', { name: 'Язык' }).selectOption('en')
  280 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  281 |       await page.getByRole('button', { name: 'Link method', exact: true }).click()
  282 |       await expect(page.getByRole('heading', { name: 'Link a sign-in method' })).toBeVisible()
  283 |       await page.getByRole('button', { name: 'Add Google', exact: true }).click()
  284 | 
  285 |       await page.getByLabel('Current account password').fill(newPassword)
  286 |       await page.getByRole('button', { name: 'Confirm current method', exact: true }).click()
  287 |       await expect(page.getByText('Verified', { exact: true })).toBeVisible()
  288 |       await page.getByRole('button', { name: 'Add Google', exact: true }).click()
  289 | 
  290 |       await expect(page.getByRole('heading', { name: 'Review the link' })).toBeVisible()
  291 |       const googleAddress = await page.locator('.account-linking-screen__review-methods .account-linking-screen__method')
  292 |         .filter({ hasText: 'Google' })
  293 |         .locator('small')
  294 |         .innerText()
  295 |       expect(googleAddress).toMatch(/^google\+.+@example\.invalid$/)
  296 |       await page.getByRole('button', { name: 'Link methods', exact: true }).click()
  297 |       await expect(page.getByText('Both sign-in methods are linked to this account.', { exact: true })).toBeVisible()
  298 | 
  299 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  300 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  301 |       const emailMethod = page.locator('.account-screen__method').filter({ hasText: 'Email and password' })
  302 |       const googleMethod = page.locator('.account-screen__method').filter({ hasText: 'Google' })
  303 |       await expect(emailMethod.locator('.account-screen__method-address')).toHaveText(credentials.email)
  304 |       await expect(googleMethod.locator('.account-screen__method-address')).toHaveText(googleAddress)
  305 |       await expect(emailMethod.getByText('Linked', { exact: true })).toBeVisible()
  306 |       await expect(googleMethod.getByText('Linked', { exact: true })).toBeVisible()
  307 | 
  308 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  309 |       await expect(page.getByRole('region', { name: 'Credits' }).getByText('Available', { exact: true }).locator('..').locator('strong'))
  310 |         .toHaveText(String(initialAvailable))
  311 |       await expect(page.getByText('Welcome credits', { exact: true })).toHaveCount(1)
  312 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Projects', exact: true }).click()
  313 |       await expect(page.getByRole('heading', { name: 'No projects yet', exact: true })).toBeVisible()
  314 | 
  315 |       await signOutThroughUi(page)
  316 |       await signInThroughUi(page, credentials.email, newPassword)
  317 |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  318 |     })
  319 |   })
  320 | 
  321 |   test('deletes the account, removes protected access, and does not regrant welcome credits on same-email registration', async ({ page, baseURL }) => {
  322 |     test.setTimeout(90_000)
  323 |     page.setDefaultTimeout(20_000)
  324 |     await withDiagnostics(page, baseURL, async () => {
  325 |       const credentials = await registerThroughUi(page, 'delete-reregister')
  326 | 
  327 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  328 |       const credits = page.getByRole('region', { name: 'Credits' })
  329 |       const available = credits.getByText('Available', { exact: true }).locator('..').locator('strong')
  330 |       await expect(available).toBeVisible()
  331 |       const initialAvailable = Number(await available.innerText())
  332 |       expect(initialAvailable).toBeGreaterThan(0)
  333 | 
  334 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  335 |       await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  336 |       const dialog = page.getByRole('dialog')
  337 |       await expect(dialog.getByRole('heading', { name: 'Delete this account?' })).toBeVisible()
  338 |       await dialog.getByLabel('Type DELETE to confirm').fill('DELETE')
  339 |       await dialog.getByRole('button', { name: 'Delete account', exact: true }).click()
  340 |       await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  341 |       await expect.poll(() => new URL(page.url()).searchParams.get('notice')).toBe('account-deleted')
  342 |       await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
  343 | 
  344 |       await page.goto('/account')
  345 |       await expect(page).toHaveURL(/\/sign-in(?:$|[?#])/, { timeout: 15_000 })
  346 | 
  347 |       const registrationCode = await startRegistrationFromLanding(page, credentials)
  348 |       await completeVisibleRegistration(page, registrationCode)
  349 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  350 |       const reRegisteredCredits = page.getByRole('region', { name: 'Credits' })
  351 |       const reRegisteredAvailable = reRegisteredCredits.getByText('Available', { exact: true }).locator('..').locator('strong')
  352 |       await expect(reRegisteredAvailable).toBeVisible()
  353 |       await expect(reRegisteredAvailable).toHaveText('0')
  354 |     })
  355 |   })
  356 | })
```