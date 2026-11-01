# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: workspace-state-visual.spec.ts >> actual New dub screen >> invalid interval is explicit and both boundaries remain user-controlled on phone
- Location: e2e\workspace-state-visual.spec.ts:457:3

# Error details

```
Error: expect(received).toBeCloseTo(expected, precision)

Expected: 14
Received: -48

Expected precision:    2
Expected difference: < 0.005
Received difference:   62
```

# Test source

```ts
  369 |   test('list loading failure offers retry without claiming rows loaded', async ({ browser }) => {
  370 |     const { context, page } = await openScene(browser, 'projects', 'projects-list-pending')
  371 |     try {
  372 |       await waitForCall(page, 'projects.list')
  373 |       await expect(page.getByRole('status').first()).toBeVisible()
  374 |       await capture(page, 'projects-list-loading-en-desktop.png')
  375 |       await release(page, 'projects.list')
  376 |       await expect(page.getByRole('alert').first()).toBeVisible()
  377 |       await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
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
> 469 |       expect((endRangeBox?.y ?? 0) - ((startRangeBox?.y ?? 0) + (startRangeBox?.height ?? 0))).toBeCloseTo(14, 2)
      |                                                                                                ^ Error: expect(received).toBeCloseTo(expected, precision)
  470 | 
  471 |       const originalStart = await startRange.inputValue()
  472 |       const originalEnd = await endRange.inputValue()
  473 |       await startRange.tap({ position: { x: (startRangeBox?.width ?? 0) / 2, y: (startRangeBox?.height ?? 0) / 2 } })
  474 |       const touchedStart = Number(await startRange.inputValue())
  475 |       expect(touchedStart).not.toBe(Number(originalStart))
  476 |       await expect(endRange).toHaveValue(originalEnd)
  477 |       await endRange.tap({ position: { x: (endRangeBox?.width ?? 0) * 0.75, y: (endRangeBox?.height ?? 0) / 2 } })
  478 |       const touchedEnd = Number(await endRange.inputValue())
  479 |       expect(touchedEnd).not.toBe(Number(originalEnd))
  480 |       expect(Number(await startRange.inputValue())).toBe(touchedStart)
  481 |       expect(touchedEnd - touchedStart).toBeGreaterThanOrEqual(1_000)
  482 |       expect(touchedEnd - touchedStart).toBeLessThanOrEqual(120_000)
  483 |       await startRange.focus()
  484 |       await startRange.press('ArrowRight')
  485 |       expect(Number(await startRange.inputValue())).toBe(touchedStart + 1)
  486 |       await expect(endRange).toHaveValue(String(touchedEnd))
  487 | 
  488 |       const fields = page.locator('.new-dub-selection__fields input')
  489 |       const start = fields.nth(0)
  490 |       await start.fill('9.000')
  491 |       await fields.nth(1).focus()
  492 |       await expect(page.getByRole('alert').first()).toBeVisible()
  493 |       await expect(start).toHaveValue('9.000')
  494 |       await expectPhoneSurface(page, 'ru', '.new-dub-selection__fields input')
  495 |       await capture(page, 'newdub-invalid-interval-ru-phone.png')
  496 |     } finally {
  497 |       await context.close()
  498 |     }
  499 |   })
  500 | 
  501 |   test('insufficient balance shows the current synthetic quote without authorizing processing', async ({ browser }) => {
  502 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-insufficient')
  503 |     try {
  504 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  505 |       await expect(page.getByText('The current available balance is below this quote. No processing has been authorized.')).toBeVisible()
  506 |       await expect(page.getByRole('button', { name: 'Open credits' })).toBeVisible()
  507 |       await expect(page.getByRole('button', { name: /Start processing/ })).toHaveCount(0)
  508 |       await capture(page, 'newdub-capacity-insufficient-balance-en-desktop.png')
  509 |     } finally {
  510 |       await context.close()
  511 |     }
  512 |   })
  513 | 
  514 |   test('source interval and loaded media remain present when quote service fails', async ({ browser }) => {
  515 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-quote-error')
  516 |     try {
  517 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  518 |       await expect(page.getByRole('alert').first()).toBeVisible()
  519 |       await expect(page.locator('.new-dub-preview__video')).toBeVisible()
  520 |       await expect(page.locator('.new-dub-selection__fields input').nth(1)).toHaveValue('8.000')
  521 |       await capture(page, 'newdub-quote-service-failure-en-desktop.png')
  522 |     } finally {
  523 |       await context.close()
  524 |     }
  525 |   })
  526 | 
  527 |   test('expired quote is labelled stale and offers a fresh quote', async ({ browser }) => {
  528 |     const { context, page } = await openLoadedNewDub(browser, 'newdub-stale-quote')
  529 |     try {
  530 |       await page.getByRole('button', { name: 'Get exact quote' }).click()
  531 |       await expect(page.getByText('This quote is expired or no longer matches the saved source and section. Request a fresh quote.')).toBeVisible()
  532 |       await expect(page.getByRole('button', { name: 'Refresh exact quote' })).toBeVisible()
  533 |       await capture(page, 'newdub-stale-quote-en-desktop.png')
  534 |     } finally {
  535 |       await context.close()
  536 |     }
  537 |   })
  538 | 
  539 |   test('compatible preview retry keeps source identity and reaches the checked-in media fixture', async ({ browser }) => {
  540 |     const { context, page } = await openScene(browser, 'newdub', 'newdub-preview-retry')
  541 |     try {
  542 |       await expect(page.getByRole('heading', { name: 'Source video' })).toBeVisible()
  543 |       await page.waitForFunction(() => Boolean(document.querySelector<HTMLVideoElement>('.new-dub-preview__video')?.error))
  544 |       await page.getByRole('button', { name: 'Check compatible-preview availability' }).click()
  545 |       await waitForCall(page, 'previews.inspect')
  546 |       await page.getByRole('button', { name: 'Prepare compatible preview' }).click()
  547 |       await waitForCall(page, 'previews.request')
  548 |       await expect(page.getByRole('button', { name: 'Retry preview' })).toBeVisible()
  549 |       await capture(page, 'newdub-compatible-preview-retryable-error-en-desktop.png')
  550 |       await page.getByRole('button', { name: 'Retry preview' }).click()
  551 |       await waitForCall(page, 'previews.retry')
  552 |       await expect(page.getByText(/Synthetic compatible-preview simulation/)).toBeVisible()
  553 |       await page.waitForFunction(() => {
  554 |         const video = document.querySelector<HTMLVideoElement>('.new-dub-preview__video')
  555 |         return Boolean(video && video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0)
  556 |       })
  557 |       await capture(page, 'newdub-compatible-preview-ready-en-desktop.png')
  558 |     } finally {
  559 |       await context.close()
  560 |     }
  561 |   })
  562 | 
  563 |   test('upload validation, pending and failed transfer states retain the current source safely', async ({ browser }) => {
  564 |     const capacity = await openScene(browser, 'newdub', 'newdub-upload-capacity')
  565 |     try {
  566 |       await expect(capacity.page.getByText(/6 of 6 project slots used/)).toBeVisible()
  567 |       const chooseVideoButtons = capacity.page.getByRole('button', { name: 'Choose video' })
  568 |       await expect(chooseVideoButtons).toHaveCount(2)
  569 |       await expect(chooseVideoButtons.nth(0)).toBeDisabled()
```