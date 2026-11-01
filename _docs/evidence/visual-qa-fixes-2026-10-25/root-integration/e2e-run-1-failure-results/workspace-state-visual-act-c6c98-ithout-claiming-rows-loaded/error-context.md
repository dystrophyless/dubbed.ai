# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Projects screen >> list loading failure offers retry without claiming rows loaded
- Location: e2e\workspace-state-visual.spec.ts:369:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Retry' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Retry' }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Retry' })

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
  - region "My projects":
    - heading "My projects" [level=1]
    - button "New dub"
    - alert:
      - paragraph: This service is not available in this build.
```

# Test source

```ts
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
> 377 |       await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
      |                                                                 ^ Error: expect(locator).toBeVisible() failed
  378 |       await capture(page, 'projects-list-failure-en-desktop.png')
  379 |     } finally {
  380 |       await release(page, 'projects.list')
  381 |       await context.close()
  382 |     }
  383 |   })
  384 | 
  385 |   test('rename validation and save error retain the edited value; delete uncertainty is recoverable', async ({ browser }) => {
  386 |     const rename = await openScene(browser, 'projects', 'projects-rename-error')
  387 |     try {
  388 |       const row = rename.page.locator('.project-row').first()
  389 |       await row.getByRole('button', { name: /Rename project: Source video/ }).click()
  390 |       const input = row.getByRole('textbox', { name: 'Rename project' })
  391 |       await input.fill('')
  392 |       await input.press('Enter')
  393 |       await expect(input).toHaveAttribute('aria-invalid', 'true')
  394 |       await expect(row.getByText('Enter a project title.')).toBeVisible()
  395 |       await capture(rename.page, 'projects-rename-validation-en-desktop.png')
  396 |       await input.fill('Renamed draft')
  397 |       await input.press('Enter')
  398 |       await expect(row.getByRole('alert').first()).toBeVisible()
  399 |       await expect(input).toHaveValue('Renamed draft')
  400 |       await capture(rename.page, 'projects-rename-save-error-en-desktop.png')
  401 |     } finally {
  402 |       await rename.context.close()
  403 |     }
  404 | 
  405 |     const deletion = await openScene(browser, 'projects', 'projects-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  406 |     try {
  407 |       const row = deletion.page.locator('.project-row').first()
  408 |       await row.getByRole('button', { name: /Действия проекта/ }).click()
  409 |       await deletion.page.getByRole('menuitem', { name: 'Удалить проект' }).click()
  410 |       await expect(deletion.page.getByRole('dialog')).toBeVisible()
  411 |       await deletion.page.getByRole('dialog').getByRole('button', { name: 'Удалить проект' }).click()
  412 |       await expect(deletion.page.getByText(/Результат удаления не подтверждён/)).toBeVisible()
  413 |       await expectPhoneSurface(deletion.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
  414 |       await capture(deletion.page, 'projects-delete-unknown-ru-phone.png')
  415 |     } finally {
  416 |       await deletion.context.close()
  417 |     }
  418 | 
  419 |     const failedDelete = await openScene(browser, 'projects', 'projects-delete-error')
  420 |     try {
  421 |       const row = failedDelete.page.locator('.project-row').first()
  422 |       await row.getByRole('button', { name: 'Actions for Source video' }).click()
  423 |       await failedDelete.page.getByRole('menuitem', { name: 'Delete project' }).click()
  424 |       await failedDelete.page.getByRole('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
  425 |       await expect(failedDelete.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
  426 |       await capture(failedDelete.page, 'projects-delete-known-failure-en-desktop.png', false)
  427 |     } finally {
  428 |       await failedDelete.context.close()
  429 |     }
  430 |   })
  431 | 
  432 |   test('continue opens the selected project through the existing lifecycle route', async ({ browser }) => {
  433 |     const { context, page } = await openScene(browser, 'projects', 'projects-resume')
  434 |     try {
  435 |       const row = page.locator('.project-row').filter({ hasText: 'Processing draft' })
  436 |       await row.getByRole('button', { name: 'Continue' }).click()
  437 |       await waitForCall(page, 'projects.open')
  438 |       await waitForCall(page, 'projects.recordOpened')
  439 |       await expect.poll(() => page.evaluate(() => window.location.pathname)).toContain('/processing')
  440 |     } finally {
  441 |       await context.close()
  442 |     }
  443 |   })
  444 | })
  445 | 
  446 | test.describe('actual New dub screen', () => {
  447 |   async function openLoadedNewDub(browser: Browser, scenario: string, options: { locale?: Locale; viewport?: Size } = {}) {
  448 |     const scene = await openScene(browser, 'newdub', scenario, options)
  449 |     await expect(scene.page.getByRole('heading', { name: 'Source video' })).toBeVisible()
  450 |     await scene.page.waitForFunction(() => {
  451 |       const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
  452 |       return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
  453 |     })
  454 |     return scene
  455 |   }
  456 | 
  457 |   test('invalid interval is explicit and both boundaries remain user-controlled on phone', async ({ browser }) => {
  458 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-invalid-interval', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  459 |     try {
  460 |       await expectPhoneSurface(page, 'ru', '.new-dub-text-button')
  461 |       const ranges = page.locator('.new-dub-range input[type="range"]')
  462 |       const startRange = ranges.nth(0)
  463 |       const endRange = ranges.nth(1)
  464 |       await expect(ranges).toHaveCount(2)
  465 |       const startRangeBox = await startRange.boundingBox()
  466 |       const endRangeBox = await endRange.boundingBox()
  467 |       expect(startRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  468 |       expect(endRangeBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  469 |       expect((endRangeBox?.y ?? 0) - ((startRangeBox?.y ?? 0) + (startRangeBox?.height ?? 0))).toBeCloseTo(14, 2)
  470 | 
  471 |       const originalStart = await startRange.inputValue()
  472 |       const originalEnd = await endRange.inputValue()
  473 |       await startRange.tap({ position: { x: (startRangeBox?.width ?? 0) / 2, y: (startRangeBox?.height ?? 0) / 2 } })
  474 |       const touchedStart = Number(await startRange.inputValue())
  475 |       expect(touchedStart).not.toBe(Number(originalStart))
  476 |       await expect(endRange).toHaveValue(originalEnd)
  477 |       await endRange.tap({ position: { x: (endRangeBox?.width ?? 0) * 0.75, y: (endRangeBox?.height ?? 0) / 2 } })
```