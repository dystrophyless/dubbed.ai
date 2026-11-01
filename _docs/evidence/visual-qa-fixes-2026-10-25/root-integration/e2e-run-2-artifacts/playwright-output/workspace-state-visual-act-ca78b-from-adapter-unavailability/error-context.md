# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual Projects screen >> project-list recovery distinguishes read failures from adapter unavailability
- Location: e2e\workspace-state-visual.spec.ts:381:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Check projects', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('button', { name: 'Check projects', exact: true }) with timeout 5000ms
  - waiting for getByRole('button', { name: 'Check projects', exact: true })

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
      - paragraph: The local workspace could not be opened or read. Check browser storage, then try loading it again.
    - button "Retry"
```

# Test source

```ts
  289 |       await capture(pending.page, 'credits-pending-checkout-posted-and-pending-history-en-desktop.png')
  290 |     } finally {
  291 |       await pending.context.close()
  292 |     }
  293 | 
  294 |     const unknown = await openScene(browser, 'credits', 'credits-checkout-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  295 |     try {
  296 |       await unknown.page.getByRole('button', { name: 'Начать пробную покупку' }).click()
  297 |       await expect(unknown.page.getByRole('button', { name: 'Проверить статус оплаты' })).toBeVisible()
  298 |       await expect(unknown.page.locator('.credits-balance__numbers strong').first()).toHaveText('120')
  299 |       await expectPhoneSurface(unknown.page, 'ru', '.credits-pack button')
  300 |       await capture(unknown.page, 'credits-unknown-checkout-ru-phone.png')
  301 |     } finally {
  302 |       await unknown.context.close()
  303 |     }
  304 |   })
  305 | 
  306 |   test('Show more exposes loading and failure retry while preserving loaded history', async ({ browser }) => {
  307 |     const loading = await openScene(browser, 'credits', 'credits-history-loading')
  308 |     try {
  309 |       await expect(loading.page.getByText('Welcome credits')).toBeVisible()
  310 |       await loading.page.getByRole('button', { name: 'Show more' }).click()
  311 |       await waitForCall(loading.page, 'credits.historyPage.older')
  312 |       await expect(loading.page.getByRole('button', { name: 'Loading older activity…' })).toBeDisabled()
  313 |       await expect(loading.page.getByText('Welcome credits')).toBeVisible()
  314 |       await capture(loading.page, 'credits-history-show-more-loading-en-desktop.png')
  315 |     } finally {
  316 |       await release(loading.page, 'credits.historyPage.older')
  317 |       await loading.context.close()
  318 |     }
  319 | 
  320 |     const failure = await openScene(browser, 'credits', 'credits-history-failure', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  321 |     try {
  322 |       await failure.page.getByRole('button', { name: 'Показать ещё' }).click()
  323 |       await expect(failure.page.getByRole('alert').first()).toBeVisible()
  324 |       await expect(failure.page.getByText('Приветственные кредиты')).toBeVisible()
  325 |       await expect(failure.page.getByRole('button', { name: 'Повторить загрузку' })).toBeEnabled()
  326 |       await expectPhoneSurface(failure.page, 'ru', '.credits-history__more button')
  327 |       await capture(failure.page, 'credits-history-older-failure-ru-phone.png')
  328 |     } finally {
  329 |       await failure.context.close()
  330 |     }
  331 |   })
  332 | })
  333 | 
  334 | test.describe('actual Projects screen', () => {
  335 |   test('empty and full-capacity lifecycle rows render at the 767/768 breakpoint', async ({ browser }) => {
  336 |     const empty = await openScene(browser, 'projects', 'projects-empty', { viewport: { width: 767, height: 900 } })
  337 |     try {
  338 |       await expect(empty.page.getByText('No projects yet')).toBeVisible()
  339 |       await capture(empty.page, 'projects-empty-en-767.png')
  340 |     } finally {
  341 |       await empty.context.close()
  342 |     }
  343 | 
  344 |     const full = await openScene(browser, 'projects', 'projects-capacity', { locale: 'ru-RU', viewport: { width: 767, height: 1000 } })
  345 |     try {
  346 |       await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
  347 |       await expect(full.page.getByText('Готово')).toBeVisible()
  348 |       await expect(full.page.getByText('Ошибка обработки')).toBeVisible()
  349 |       await capture(full.page, 'projects-capacity-lifecycle-ru-767.png')
  350 |       const row = full.page.locator('.project-row').first()
  351 |       const rowMenuTrigger = row.getByRole('button', { name: 'Действия проекта: Source video' })
  352 |       await expectPhoneSurface(full.page, 'ru', '.project-row-menu__trigger')
  353 |       const triggerBox = await rowMenuTrigger.boundingBox()
  354 |       expect(triggerBox?.width ?? 0).toBeGreaterThanOrEqual(48)
  355 |       expect(triggerBox?.height ?? 0).toBeGreaterThanOrEqual(48)
  356 |       await rowMenuTrigger.tap()
  357 |       const menu = full.page.getByRole('menu')
  358 |       await expect(menu).toBeVisible()
  359 |       await expect(menu.getByRole('menuitem')).toHaveCount(1)
  360 |       await expect(menu.getByRole('menuitem', { name: 'Удалить проект' })).toBeVisible()
  361 |       await capture(full.page, 'projects-row-menu-ru-767.png')
  362 |       await full.page.keyboard.press('Escape')
  363 |       await expect(rowMenuTrigger).toBeFocused()
  364 |       await rowMenuTrigger.press('ArrowDown')
  365 |       const deleteItem = menu.getByRole('menuitem', { name: 'Удалить проект' })
  366 |       await expect(deleteItem).toBeFocused()
  367 |       await deleteItem.press('Enter')
  368 |       const deleteDialog = full.page.getByRole('dialog')
  369 |       await expect(deleteDialog).toBeVisible()
  370 |       await deleteDialog.getByRole('button', { name: 'Отмена' }).click()
  371 |       await expect(rowMenuTrigger).toBeFocused()
  372 |       await expect(row.getByRole('button', { name: 'Продолжить' })).toBeVisible()
  373 |       await full.page.setViewportSize({ width: 768, height: 1000 })
  374 |       await expect(full.page.getByText('Занято мест: 6 из 6')).toBeVisible()
  375 |       await capture(full.page, 'projects-capacity-lifecycle-ru-768.png')
  376 |     } finally {
  377 |       await full.context.close()
  378 |     }
  379 |   })
  380 | 
  381 |   test('project-list recovery distinguishes read failures from adapter unavailability', async ({ browser }) => {
  382 |     const { context, page } = await openScene(browser, 'projects', 'projects-list-pending')
  383 |     try {
  384 |       await waitForCall(page, 'projects.list')
  385 |       await expect(page.getByRole('status').first()).toBeVisible()
  386 |       await capture(page, 'projects-list-loading-en-desktop.png')
  387 |       await release(page, 'projects.list')
  388 |       await expect(page.getByRole('alert').first()).toBeVisible()
> 389 |       await expect(page.getByRole('button', { name: 'Check projects', exact: true })).toBeVisible()
      |                                                                                       ^ Error: expect(locator).toBeVisible() failed
  390 |       await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0)
  391 |       await expect(page.locator('.project-row')).toHaveCount(0)
  392 |       await capture(page, 'projects-list-failure-en-desktop.png')
  393 |       await page.getByRole('button', { name: 'Check projects', exact: true }).click()
  394 |       await expect.poll(() => page.evaluate(() =>
  395 |         window.__workspaceStateVisual?.calls.filter((name) => name === 'projects.list').length ?? 0,
  396 |       )).toBe(2)
  397 |       await expect(page.locator('.project-row').first()).toContainText('Source video')
  398 |       await expect(page.getByRole('alert')).toHaveCount(0)
  399 |     } finally {
  400 |       await release(page, 'projects.list')
  401 |       await context.close()
  402 |     }
  403 |     const unavailable = await openScene(browser, 'projects', 'projects-list-adapter-unavailable')
  404 |     try {
  405 |       await expect(unavailable.page.getByRole('alert').first()).toBeVisible()
  406 |       await expect(unavailable.page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0)
  407 |       await expect(unavailable.page.getByRole('button', { name: 'Check projects', exact: true })).toHaveCount(0)
  408 |       await expect(unavailable.page.locator('.project-row')).toHaveCount(0)
  409 |     } finally {
  410 |       await unavailable.context.close()
  411 |     }
  412 |   })
  413 | 
  414 |   test('rename validation and save error retain the edited value; delete uncertainty is recoverable', async ({ browser }) => {
  415 |     const rename = await openScene(browser, 'projects', 'projects-rename-error')
  416 |     try {
  417 |       const row = rename.page.locator('.project-row').first()
  418 |       await row.getByRole('button', { name: /Rename project: Source video/ }).click()
  419 |       const input = row.getByRole('textbox', { name: 'Rename project' })
  420 |       await input.fill('')
  421 |       await input.press('Enter')
  422 |       await expect(input).toHaveAttribute('aria-invalid', 'true')
  423 |       await expect(row.getByText('Enter a project title.')).toBeVisible()
  424 |       await capture(rename.page, 'projects-rename-validation-en-desktop.png')
  425 |       await input.fill('Renamed draft')
  426 |       await input.press('Enter')
  427 |       await expect(row.getByRole('alert').first()).toBeVisible()
  428 |       await expect(input).toHaveValue('Renamed draft')
  429 |       await capture(rename.page, 'projects-rename-save-error-en-desktop.png')
  430 |     } finally {
  431 |       await rename.context.close()
  432 |     }
  433 | 
  434 |     const deletion = await openScene(browser, 'projects', 'projects-delete-unknown', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  435 |     try {
  436 |       const row = deletion.page.locator('.project-row').first()
  437 |       await row.getByRole('button', { name: /Действия проекта/ }).click()
  438 |       await deletion.page.getByRole('menuitem', { name: 'Удалить проект' }).click()
  439 |       await expect(deletion.page.getByRole('dialog')).toBeVisible()
  440 |       await deletion.page.getByRole('dialog').getByRole('button', { name: 'Удалить проект' }).click()
  441 |       await expect(deletion.page.getByText(/Результат удаления не подтверждён/)).toBeVisible()
  442 |       await expectPhoneSurface(deletion.page, 'ru', '[role="dialog"] button[data-variant="destructive"]')
  443 |       await capture(deletion.page, 'projects-delete-unknown-ru-phone.png')
  444 |     } finally {
  445 |       await deletion.context.close()
  446 |     }
  447 | 
  448 |     const failedDelete = await openScene(browser, 'projects', 'projects-delete-error')
  449 |     try {
  450 |       const row = failedDelete.page.locator('.project-row').first()
  451 |       await row.getByRole('button', { name: 'Actions for Source video' }).click()
  452 |       await failedDelete.page.getByRole('menuitem', { name: 'Delete project' }).click()
  453 |       await failedDelete.page.getByRole('dialog').getByRole('button', { name: 'Delete project', exact: true }).click()
  454 |       await expect(failedDelete.page.getByRole('dialog').getByRole('alert').first()).toBeVisible()
  455 |       await capture(failedDelete.page, 'projects-delete-known-failure-en-desktop.png', false)
  456 |     } finally {
  457 |       await failedDelete.context.close()
  458 |     }
  459 |   })
  460 | 
  461 |   test('continue opens the selected project through the existing lifecycle route', async ({ browser }) => {
  462 |     const { context, page } = await openScene(browser, 'projects', 'projects-resume')
  463 |     try {
  464 |       const row = page.locator('.project-row').filter({ hasText: 'Processing draft' })
  465 |       await row.getByRole('button', { name: 'Continue' }).click()
  466 |       await waitForCall(page, 'projects.open')
  467 |       await waitForCall(page, 'projects.recordOpened')
  468 |       await expect.poll(() => page.evaluate(() => window.location.pathname)).toContain('/processing')
  469 |     } finally {
  470 |       await context.close()
  471 |     }
  472 |   })
  473 | })
  474 | 
  475 | test.describe('actual New dub screen', () => {
  476 |   async function openLoadedNewDub(browser: Browser, scenario: string, options: { locale?: Locale; viewport?: Size } = {}) {
  477 |     const scene = await openScene(browser, 'newdub', scenario, options)
  478 |     await expect(scene.page.getByRole('heading', { name: 'Source video' })).toBeVisible()
  479 |     await scene.page.waitForFunction(() => {
  480 |       const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
  481 |       return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
  482 |     })
  483 |     return scene
  484 |   }
  485 | 
  486 |   test('invalid interval is explicit and both boundaries remain user-controlled on phone', async ({ browser }) => {
  487 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-invalid-interval', { locale: 'ru-RU', viewport: { width: 390, height: 844 } })
  488 |     try {
  489 |       await expectPhoneSurface(page, 'ru', '.new-dub-text-button')
```