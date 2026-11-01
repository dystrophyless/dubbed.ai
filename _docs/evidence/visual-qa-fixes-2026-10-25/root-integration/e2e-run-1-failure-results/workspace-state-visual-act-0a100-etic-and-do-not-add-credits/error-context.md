# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Credits screen >> pending checkout and unknown start stay synthetic and do not add credits
- Location: e2e\workspace-state-visual.spec.ts:269:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Pending purchase')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText('Pending purchase') with timeout 5000ms
  - waiting for getByText('Pending purchase')

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
  - region "Credits":
    - heading "Credits" [level=1]
    - region "Credits":
      - paragraph:
        - text: Available
        - strong: "120"
      - paragraph:
        - text: In processing
        - strong: "0"
      - text: Project capacity
      - strong: 2 of 6 projects used
      - button "Open projects"
    - region "Credit packs":
      - heading "Credit packs" [level=2]
      - list:
        - listitem:
          - strong: 20 credits
          - paragraph: "Configured mock amount: 0 MOCK units. This is test currency, not a real price."
          - paragraph: Local mock scenario only. No payment is collected and no payment provider is connected.
          - button "Start mock checkout" [disabled]
      - paragraph: Confirming payment
      - paragraph: Credits and project capacity change only after a verified result.
      - button "Keep pending"
      - button "Simulate verified payment"
      - button "Simulate cancellation"
      - button "Simulate failure"
      - button "Check payment status"
    - region "Credit history":
      - heading "Credit history" [level=2]
      - list:
        - listitem:
          - strong: Welcome credits
          - time: Oct 25, 2026, 7:10 PM
          - term: Change
          - definition: "+120"
          - term: Available after
          - definition: "120"
          - term: Reserved after
          - definition: "0"
        - listitem:
          - strong: Purchase initiated
          - time: Oct 25, 2026, 7:11 PM
          - term: Change
          - definition: —
          - term: Available after
          - definition: —
          - term: Reserved after
          - definition: "0"
```

# Test source

```ts
  176 |       const [errorBox, submitBox] = await Promise.all([alert.boundingBox(), page.getByRole('button', { name: 'Save password' }).boundingBox()])
  177 |       if (errorBox && submitBox) expect(errorBox.y < submitBox.y).toBe(true)
  178 |       await capture(page, 'account-invalid-password-en-desktop.png')
  179 |     } finally {
  180 |       await context.close()
  181 |     }
  182 |   })
  183 | 
  184 |   test('delete cancel closes without calling the service; unknown outcome keeps confirmation', async ({ browser }) => {
  185 |     const cancelScene = await openScene(browser, 'account', 'account-delete-cancel')
  186 |     try {
  187 |       const opener = cancelScene.page.getByRole('button', { name: 'Delete account' }).first()
  188 |       await opener.click()
  189 |       await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
  190 |       await capture(cancelScene.page, 'account-delete-soft-red-confirmation-en-desktop.png', false)
  191 |       await cancelScene.page.getByRole('button', { name: 'Cancel' }).click()
  192 |       await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
  193 |       await expect(opener).toBeFocused()
  194 |       expect(await cancelScene.page.evaluate(() => window.__workspaceStateVisual?.calls.includes('account.delete'))).toBe(false)
  195 |       await opener.click()
  196 |       await expect(cancelScene.page.getByRole('dialog')).toBeVisible()
  197 |       await cancelScene.page.keyboard.press('Escape')
  198 |       await expect(cancelScene.page.getByRole('dialog')).toHaveCount(0)
  199 |       await expect(opener).toBeFocused()
  200 |     } finally {
  201 |       await cancelScene.context.close()
  202 |     }
  203 | 
  204 |     const unknownScene = await openScene(browser, 'account', 'account-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  205 |     try {
  206 |       await accountDeleteDialog(unknownScene.page)
  207 |       const confirmation = unknownScene.page.getByRole('dialog').getByRole('textbox')
  208 |       await confirmation.fill('УДАЛИТЬ')
  209 |       await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Удалить аккаунт', exact: true }).last().click()
  210 |       await expect(unknownScene.page.getByRole('dialog').getByRole('button', { name: /проверить удаление/i })).toBeVisible()
  211 |       await expectPhoneSurface(unknownScene.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
  212 |       await capture(unknownScene.page, 'account-delete-unknown-ru-phone.png', false)
  213 |       const recovery = unknownScene.page.getByRole('button', { name: /проверить удаление/i })
  214 |       await unknownScene.page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click()
  215 |       await expect(unknownScene.page.getByRole('dialog')).toHaveCount(0)
  216 |       await expect(recovery).toBeFocused()
  217 |     } finally {
  218 |       await unknownScene.context.close()
  219 |     }
  220 | 
  221 |     const failed = await openScene(browser, 'account', 'account-delete-error')
  222 |     try {
  223 |       const opener = failed.page.locator('.account-screen__delete-action').getByRole('button', { name: 'Delete account' })
  224 |       await accountDeleteDialog(failed.page)
  225 |       await failed.page.getByRole('dialog').getByRole('textbox').fill('DELETE')
  226 |       await failed.page.getByRole('dialog').getByRole('button', { name: 'Delete account', exact: true }).last().click()
  227 |       await expect(failed.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
  228 |       await capture(failed.page, 'account-delete-known-failure-en-desktop.png', false)
  229 |       await failed.page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()
  230 |       await expect(failed.page.getByRole('dialog')).toHaveCount(0)
  231 |       await expect(opener).toBeFocused()
  232 |     } finally {
  233 |       await failed.context.close()
  234 |     }
  235 |   })
  236 | })
  237 | 
  238 | test.describe('actual Credits screen', () => {
  239 |   test('partial balance failure and unavailable packs keep independent regions honest', async ({ browser }) => {
  240 |     const balance = await openScene(browser, 'credits', 'credits-balance-unavailable')
  241 |     try {
  242 |       await expect(balance.page.getByRole('alert').first()).toBeVisible()
  243 |       await expect(balance.page.getByText('Credit packs')).toBeVisible()
  244 |       await capture(balance.page, 'credits-balance-unavailable-en-desktop.png')
  245 |     } finally {
  246 |       await balance.context.close()
  247 |     }
  248 | 
  249 |     const packs = await openScene(browser, 'credits', 'credits-packs-unavailable', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  250 |     try {
  251 |       await expect(packs.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
  252 |       const packRegion = packs.page.getByRole('region', { name: 'Пакеты кредитов' })
  253 |       await expect(packRegion.getByRole('alert')).toContainText('Не удалось загрузить пакеты кредитов')
  254 |       await expect(packs.page.locator('.credits-pack-list li')).toHaveCount(0)
  255 |       await expect(packs.page.locator('.workspace-error')).toHaveCount(0)
  256 |       await expect(packs.page.getByText('Приветственные кредиты')).toBeVisible()
  257 |       await expect(packRegion.getByRole('button', { name: 'Повторить загрузку пакетов' })).toBeVisible()
  258 |       await expectPhoneSurface(packs.page, 'ru', '.credits-text-button')
  259 |       await capture(packs.page, 'credits-packs-unavailable-ru-phone.png')
  260 |       await packRegion.getByRole('button', { name: 'Повторить загрузку пакетов' }).click()
  261 |       await expect(packs.page.locator('.credits-pack-list li')).toHaveCount(1)
  262 |       await expect(packs.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
  263 |       await expect(packs.page.getByText('Приветственные кредиты')).toBeVisible()
  264 |     } finally {
  265 |       await packs.context.close()
  266 |     }
  267 |   })
  268 | 
  269 |   test('pending checkout and unknown start stay synthetic and do not add credits', async ({ browser }) => {
  270 |     const pending = await openScene(browser, 'credits', 'credits-checkout-pending')
  271 |     try {
  272 |       await pending.page.getByRole('button', { name: 'Start mock checkout' }).click()
  273 |       await expect(pending.page.getByText('Confirming payment')).toBeVisible()
  274 |       await expect(pending.page.getByText(/payment is collected/)).toBeVisible()
  275 |       await expect(pending.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
> 276 |       await expect(pending.page.getByText('Pending purchase')).toBeVisible()
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  277 |       await capture(pending.page, 'credits-pending-checkout-posted-and-pending-history-en-desktop.png')
  278 |     } finally {
  279 |       await pending.context.close()
  280 |     }
  281 | 
  282 |     const unknown = await openScene(browser, 'credits', 'credits-checkout-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  283 |     try {
  284 |       await unknown.page.getByRole('button', { name: 'Начать пробную покупку' }).click()
  285 |       await expect(unknown.page.getByRole('button', { name: 'Проверить статус оплаты' })).toBeVisible()
  286 |       await expect(unknown.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
  287 |       await expectPhoneSurface(unknown.page, 'ru', '.credits-pack button')
  288 |       await capture(unknown.page, 'credits-unknown-checkout-ru-phone.png')
  289 |     } finally {
  290 |       await unknown.context.close()
  291 |     }
  292 |   })
  293 | 
  294 |   test('Show more exposes loading and failure retry while preserving loaded history', async ({ browser }) => {
  295 |     const loading = await openScene(browser, 'credits', 'credits-history-loading')
  296 |     try {
  297 |       await expect(loading.page.getByText('Welcome credits')).toBeVisible()
  298 |       await loading.page.getByRole('button', { name: 'Show more' }).click()
  299 |       await waitForCall(loading.page, 'credits.historyPage.older')
  300 |       await expect(loading.page.getByRole('button', { name: 'Loading older activity…' })).toBeDisabled()
  301 |       await expect(loading.page.getByText('Welcome credits')).toBeVisible()
  302 |       await capture(loading.page, 'credits-history-show-more-loading-en-desktop.png')
  303 |     } finally {
  304 |       await release(loading.page, 'credits.historyPage.older')
  305 |       await loading.context.close()
  306 |     }
  307 | 
  308 |     const failure = await openScene(browser, 'credits', 'credits-history-failure', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  309 |     try {
  310 |       await failure.page.getByRole('button', { name: 'Показать ещё' }).click()
  311 |       await expect(failure.page.getByRole('alert').first()).toBeVisible()
  312 |       await expect(failure.page.getByText('Приветственные кредиты')).toBeVisible()
  313 |       await expect(failure.page.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled()
  314 |       await expectPhoneSurface(failure.page, 'ru', '.credits-history__more button')
  315 |       await capture(failure.page, 'credits-history-older-failure-ru-phone.png')
  316 |     } finally {
  317 |       await failure.context.close()
  318 |     }
  319 |   })
  320 | })
  321 | 
  322 | test.describe('actual Projects screen', () => {
  323 |   test('empty and full-capacity lifecycle rows render at the 767/768 breakpoint', async ({ browser }) => {
  324 |     const empty = await openScene(browser, 'projects', 'projects-empty', { viewport: { width: 767, height: 900 } })
  325 |     try {
  326 |       await expect(empty.page.getByText('No projects yet')).toBeVisible()
  327 |       await capture(empty.page, 'projects-empty-en-767.png')
  328 |     } finally {
  329 |       await empty.context.close()
  330 |     }
  331 | 
  332 |     const full = await openScene(browser, 'projects', 'projects-capacity', { locale: 'ru-RU', viewport: { width: 767, height: 1000 } })
  333 |     try {
  334 |       await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
  335 |       await expect(full.page.getByText('Готово')).toBeVisible()
  336 |       await expect(full.page.getByText('Ошибка обработки')).toBeVisible()
  337 |       await capture(full.page, 'projects-capacity-lifecycle-ru-767.png')
  338 |       const row = full.page.locator('.project-row').first()
  339 |       const rowMenuTrigger = row.getByRole('button', { name: 'Действия проекта: Source video' })
  340 |       await expectPhoneSurface(full.page, 'ru', '.project-row-menu__trigger')
  341 |       const triggerBox = await rowMenuTrigger.boundingBox()
  342 |       expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(48)
  343 |       expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  344 |       await rowMenuTrigger.tap()
  345 |       const menu = full.page.getByRole('menu')
  346 |       await expect(menu).toBeVisible()
  347 |       await expect(menu.getByRole('menuitem')).toHaveCount(1)
  348 |       await expect(menu.getByRole('menuitem', { name: 'Удалить проект' })).toBeVisible()
  349 |       await capture(full.page, 'projects-row-menu-ru-767.png')
  350 |       await full.page.keyboard.press('Escape')
  351 |       await expect(rowMenuTrigger).toBeFocused()
  352 |       await rowMenuTrigger.press('ArrowDown')
  353 |       const deleteItem = menu.getByRole('menuitem', { name: 'Удалить проект' })
  354 |       await expect(deleteItem).toBeFocused()
  355 |       await deleteItem.press('Enter')
  356 |       const deleteDialog = full.page.getByRole('dialog')
  357 |       await expect(deleteDialog).toBeVisible()
  358 |       await deleteDialog.getByRole('button', { name: 'Отмена' }).click()
  359 |       await expect(rowMenuTrigger).toBeFocused()
  360 |       await expect(row.getByRole('button', { name: 'Продолжить' })).toBeVisible()
  361 |       await full.page.setViewportSize({ width: 768, height: 1000 })
  362 |       await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
  363 |       await capture(full.page, 'projects-capacity-lifecycle-ru-768.png')
  364 |     } finally {
  365 |       await full.context.close()
  366 |     }
  367 |   })
  368 | 
  369 |   test('list loading failure offers retry without claiming rows loaded', async ({ browser }) => {
  370 |     const { context, page } = await openScene(browser, 'projects', 'projects-list-pending')
  371 |     try {
  372 |       await waitForCall(page, 'projects.list')
  373 |       await expect(page.getByRole('status').first()).toBeVisible()
  374 |       await capture(page, 'projects-list-loading-en-desktop.png')
  375 |       await release(page, 'projects.list')
  376 |       await expect(page.getByRole('alert').first()).toBeVisible()
```