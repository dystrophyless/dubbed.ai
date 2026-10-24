# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: identity-account-journey.spec.ts >> local mock identity and account journeys >> persists the account locale, changes its password, and commits a dual-proof Google link only after review
- Location: e2e\identity-account-journey.spec.ts:87:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Both sign-in methods are linked to this account.', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Both sign-in methods are linked to this account.', { exact: true }) with timeout 5000ms
  - waiting for getByText('Both sign-in methods are linked to this account.', { exact: true })

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
  - main:
    - button "Account"
    - paragraph: Account and security
    - heading "Link a sign-in method" [level=1]
    - paragraph: Confirm both the current method and the method you want to add. The link is created only after both proofs are accepted.
    - status: This preview uses simulated account data. No real email or Google account is contacted.
    - status: Both available sign-in methods are already linked.
```

# Test source

```ts
  27  | }
  28  | 
  29  | async function signOutThroughUi(page: Page): Promise<void> {
  30  |   await page.getByRole('banner').getByRole('button', { name: 'Sign out', exact: true }).click()
  31  |   await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible()
  32  | }
  33  | 
  34  | async function signInThroughUi(page: Page, email: string, password: string): Promise<void> {
  35  |   await page.goto('/sign-in')
  36  |   await page.getByLabel('Email').fill(email)
  37  |   await page.getByLabel('Password', { exact: true }).fill(password)
  38  |   await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  39  | }
  40  | 
  41  | test.describe('local mock identity and account journeys', () => {
  42  |   test('keeps credential errors neutral, completes reset from visible mock OTP, and reauthenticates with the new password', async ({ page, baseURL }) => {
  43  |     test.setTimeout(90_000)
  44  |     page.setDefaultTimeout(20_000)
  45  |     await withDiagnostics(page, baseURL, async () => {
  46  |       const credentials = await registerThroughUi(page, 'password-reset')
  47  |       const incorrectPassword = `${credentials.password}-incorrect`
  48  |       const newPassword = `${credentials.password}-reset`
  49  | 
  50  |       await signOutThroughUi(page)
  51  |       await signInThroughUi(page, credentials.email, incorrectPassword)
  52  |       await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
  53  |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  54  |       await expect(page.getByLabel('Password', { exact: true })).toHaveValue(incorrectPassword)
  55  | 
  56  |       await page.getByRole('link', { name: 'Forgot password?', exact: true }).click()
  57  |       await expect(page).toHaveURL(/\/reset-password(?:$|[?#])$/)
  58  |       await expect(page.getByRole('heading', { name: 'Reset your password', exact: true })).toBeVisible()
  59  |       await page.getByLabel('Email').fill(credentials.email)
  60  |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  61  |       await page.getByRole('button', { name: 'Send reset email', exact: true }).click()
  62  | 
  63  |       const localCodeNotice = page.getByText(/Local mock code:.*No email was sent\./i)
  64  |       await expect(localCodeNotice).toBeVisible()
  65  |       const resetCode = (await localCodeNotice.innerText()).match(/\b\d{6}\b/)?.[0]
  66  |       expect(resetCode, 'the local mock reset notice should show its synthetic six-digit code').toBeTruthy()
  67  | 
  68  |       await page.getByLabel('6-digit reset code').fill(resetCode!)
  69  |       await expect(page.getByLabel('New password', { exact: true })).toBeVisible({ timeout: 15_000 })
  70  |       await page.getByLabel('New password', { exact: true }).fill(newPassword)
  71  |       await page.getByLabel('Repeat new password').fill(newPassword)
  72  |       await page.getByRole('button', { name: 'Save new password', exact: true }).click()
  73  |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  74  | 
  75  |       // Reset keeps the verified session. Sign out and prove the new credential at the normal sign-in form.
  76  |       await signOutThroughUi(page)
  77  |       await signInThroughUi(page, credentials.email, credentials.password)
  78  |       await expect(page.getByRole('alert').filter({ hasText: 'Incorrect email or password' })).toBeVisible()
  79  |       await expect(page.getByLabel('Email')).toHaveValue(credentials.email)
  80  |       await expect(page.getByLabel('Password', { exact: true })).toHaveValue(credentials.password)
  81  |       await page.getByLabel('Password', { exact: true }).fill(newPassword)
  82  |       await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  83  |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  84  |     })
  85  |   })
  86  | 
  87  |   test('persists the account locale, changes its password, and commits a dual-proof Google link only after review', async ({ page, baseURL }) => {
  88  |     test.setTimeout(90_000)
  89  |     page.setDefaultTimeout(20_000)
  90  |     await withDiagnostics(page, baseURL, async () => {
  91  |       const credentials = await registerThroughUi(page, 'account-link')
  92  |       const newPassword = `${credentials.password}-account`
  93  | 
  94  |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  95  |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  96  | 
  97  |       const main = page.getByRole('main')
  98  |       await main.getByRole('combobox', { name: 'Language' }).selectOption('ru')
  99  |       await expect(page.getByRole('heading', { name: 'Аккаунт', exact: true })).toBeVisible()
  100 |       await page.getByRole('main').getByRole('combobox', { name: 'Язык' }).selectOption('en')
  101 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  102 | 
  103 |       const incorrectCurrentPassword = `${credentials.password}-incorrect`
  104 |       await page.getByLabel('Current password', { exact: true }).fill(incorrectCurrentPassword)
  105 |       await page.getByLabel('New password', { exact: true }).fill(newPassword)
  106 |       await page.getByRole('button', { name: 'Save password', exact: true }).click()
  107 |       await expect(page.getByRole('alert')).toBeVisible()
  108 |       await expect(page.getByLabel('Current password', { exact: true })).toHaveValue(incorrectCurrentPassword)
  109 |       await expect(page.getByLabel('New password', { exact: true })).toHaveValue(newPassword)
  110 | 
  111 |       await page.getByLabel('Current password', { exact: true }).fill(credentials.password)
  112 |       await page.getByRole('button', { name: 'Save password', exact: true }).click()
  113 |       await expect(page.getByText('Password changed. This device stays signed in; other sessions were revoked.', { exact: true })).toBeVisible()
  114 | 
  115 |       await page.getByRole('button', { name: 'Link method', exact: true }).click()
  116 |       await expect(page.getByRole('heading', { name: 'Link a sign-in method' })).toBeVisible()
  117 |       await expect(page.getByText('This preview uses simulated account data. No real email or Google account is contacted.', { exact: true })).toBeVisible()
  118 |       await page.getByRole('button', { name: 'Add Google', exact: true }).click()
  119 | 
  120 |       await page.getByLabel('Current account password').fill(newPassword)
  121 |       await page.getByRole('button', { name: 'Confirm current method', exact: true }).click()
  122 |       await expect(page.getByText('Verified', { exact: true })).toBeVisible()
  123 |       await page.getByRole('button', { name: 'Add Google', exact: true }).click()
  124 | 
  125 |       await expect(page.getByRole('heading', { name: 'Review the link' })).toBeVisible()
  126 |       await page.getByRole('button', { name: 'Link methods', exact: true }).click()
> 127 |       await expect(page.getByText('Both sign-in methods are linked to this account.', { exact: true })).toBeVisible()
      |                                                                                                         ^ Error: expect(locator).toBeVisible() failed
  128 | 
  129 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  130 |       await expect(page.getByRole('heading', { name: 'Account', exact: true })).toBeVisible()
  131 |       await expect(page.getByText('Linked', { exact: true })).toHaveCount(2)
  132 | 
  133 |       await signOutThroughUi(page)
  134 |       await signInThroughUi(page, credentials.email, newPassword)
  135 |       await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 20_000 })
  136 |     })
  137 |   })
  138 | 
  139 |   test('deletes the account, removes protected access, and does not regrant welcome credits on same-email registration', async ({ page, baseURL }) => {
  140 |     test.setTimeout(90_000)
  141 |     page.setDefaultTimeout(20_000)
  142 |     await withDiagnostics(page, baseURL, async () => {
  143 |       const credentials = await registerThroughUi(page, 'delete-reregister')
  144 | 
  145 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  146 |       const credits = page.getByRole('region', { name: 'Credits' })
  147 |       const available = credits.getByText('Available', { exact: true }).locator('..').locator('strong')
  148 |       await expect(available).toBeVisible()
  149 |       const initialAvailable = Number(await available.innerText())
  150 |       expect(initialAvailable).toBeGreaterThan(0)
  151 | 
  152 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Account', exact: true }).click()
  153 |       await page.getByRole('button', { name: 'Delete account', exact: true }).click()
  154 |       const dialog = page.getByRole('dialog')
  155 |       await expect(dialog.getByRole('heading', { name: 'Delete this account?' })).toBeVisible()
  156 |       await dialog.getByLabel('Type DELETE to confirm').fill('DELETE')
  157 |       await dialog.getByRole('button', { name: 'Delete account', exact: true }).click()
  158 |       await expect.poll(() => new URL(page.url()).pathname).toBe('/')
  159 |       await expect.poll(() => new URL(page.url()).searchParams.get('notice')).toBe('account-deleted')
  160 |       await expect(page.getByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
  161 | 
  162 |       await page.goto('/account')
  163 |       await expect(page).toHaveURL(/\/sign-in(?:$|[?#])/, { timeout: 15_000 })
  164 | 
  165 |       const registrationCode = await startRegistrationFromLanding(page, credentials)
  166 |       await completeVisibleRegistration(page, registrationCode)
  167 |       await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Credits', exact: true }).click()
  168 |       const reRegisteredCredits = page.getByRole('region', { name: 'Credits' })
  169 |       const reRegisteredAvailable = reRegisteredCredits.getByText('Available', { exact: true }).locator('..').locator('strong')
  170 |       await expect(reRegisteredAvailable).toBeVisible()
  171 |       await expect(reRegisteredAvailable).toHaveText('0')
  172 |     })
  173 |   })
  174 | })
  175 | 
```