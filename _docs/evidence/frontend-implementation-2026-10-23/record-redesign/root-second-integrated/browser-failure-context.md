# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: media-visual.spec.ts >> captures the actual local mock Record journey, native fake-mic UI, and controlled Result presentation states
- Location: e2e\media-visual.spec.ts:222:1

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('navigation', { name: 'Line' }).getByRole('button', { name: 'Next line' })

```

# Page snapshot

```yaml
- generic [ref=f3e3]:
  - link "Skip to content" [ref=f3e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f3e5]:
    - generic [ref=f3e6]:
      - link "Dubbed — Home" [ref=f3e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f3e8]: Dubbed
      - navigation "Main navigation" [ref=f3e9]:
        - link "New dub" [ref=f3e10] [cursor=pointer]:
          - /url: /new
        - link "Projects" [ref=f3e11] [cursor=pointer]:
          - /url: /projects
        - link "Credits" [ref=f3e12] [cursor=pointer]:
          - /url: /credits
        - link "Account" [ref=f3e13] [cursor=pointer]:
          - /url: /account
      - generic [ref=f3e14]:
        - generic [ref=f3e15]:
          - generic [ref=f3e16]: Credits
          - strong [ref=f3e17]: "111"
        - generic [ref=f3e18]:
          - generic [ref=f3e19]: Language
          - combobox "Language" [ref=f3e20] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=f3e21] [cursor=pointer]
        - button "Open navigation" [ref=f3e22] [cursor=pointer]
  - main [ref=f3e24]:
    - region [ref=f3e26]:
      - generic [ref=f3e27]:
        - generic [ref=f3e28]:
          - heading "Record your voice" [level=1] [ref=f3e29]
          - generic [ref=f3e30]:
            - text: source-dialogueRecord
            - status [ref=f3e31]: Draft saved. It has not been accepted as a take.
        - button "Projects" [ref=f3e33] [cursor=pointer]
      - generic "Original video" [ref=f3e37]
      - generic [ref=f3e38]:
        - generic [ref=f3e39]:
          - generic [ref=f3e40]: Line 1 of 3
          - paragraph [ref=f3e41]: A blue light is on.
          - paragraph [ref=f3e42]: "Capture window: 0.75–3.18 s"
        - generic [ref=f3e43]: "Accepted takes: 0 / 3"
      - region "Recording playback timeline" [ref=f3e44]:
        - slider "Seek playback" [ref=f3e175] [cursor=pointer]: "0"
      - generic [ref=f3e176]:
        - generic [ref=f3e177]:
          - group "Audio source" [ref=f3e178]:
            - button "Original" [pressed] [ref=f3e179] [cursor=pointer]
            - button "My recording" [ref=f3e180] [cursor=pointer]
          - button "Play" [ref=f3e181] [cursor=pointer]
          - 'status "Playback position: 0:00 / 0:02" [ref=f3e185]': 0:00 / 0:02
        - generic [ref=f3e186]:
          - button "Record again" [ref=f3e187] [cursor=pointer]
          - button "Previous line" [disabled] [ref=f3e191]
          - button "Next line" [ref=f3e194] [cursor=pointer]
          - button "Microphone" [ref=f3e197] [cursor=pointer]
      - generic [ref=f3e201]:
        - generic [ref=f3e202]: Original video volume
        - slider "Original video volume" [ref=f3e203]: "0.8"
      - generic [ref=f3e204]: Recording status
      - 'generic "Input level: 0" [ref=f3e206]'
      - region "Current draft recording" [ref=f3e207]:
        - generic [ref=f3e208]:
          - heading "Current draft recording" [level=2] [ref=f3e209]
          - generic [ref=f3e210]: Draft saved. It has not been accepted as a take.
        - status [ref=f3e211]: Recorded audio frames were decoded. Next line saves this take and continues.
      - paragraph [ref=f3e212]: This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.
      - region "Process again" [ref=f3e213]:
        - button "Process again" [ref=f3e214] [cursor=pointer]
```

# Test source

```ts
  449 |       'recording.release-access',
  450 |       'recording.renew-access',
  451 |       'recording.capture-fixed-window',
  452 |       'recording.persist-draft',
  453 |       'recording.accept-candidate',
  454 |       'result.assemble',
  455 |       'result.retry',
  456 |     ])
  457 |     measurements.recordLocalePreservation = {
  458 |       sourceBefore: recordLocaleSourceBefore,
  459 |       sourceAfter: recordLocaleSourceAfter,
  460 |       indexedDbWrites: recordLocaleWritesAfter - recordLocaleWritesBefore,
  461 |       indexedDbWriteEvents: localeWriteEvents,
  462 |       localeOperationKinds,
  463 |       forbiddenRecordingOrGenerationOperations: localeOperationKinds.filter((kind) => accessOperationKinds.has(kind)),
  464 |       recordingGrantStoreWrites: localeWriteEvents.filter((event) => event.storeName === 'recordingGrants'),
  465 |       mediaRequestFailures: recordLocaleFailures,
  466 |       interpretation: 'The locale preference operation is permitted; the browser journal is checked for recording access/capture/save/accept and result assembly/retry mutations.',
  467 |     }
  468 |     expect(recordLocaleSourceBefore.currentSrc).not.toBe('')
  469 |     expect(recordLocaleSourceAfter.currentSrc).toBe(recordLocaleSourceBefore.currentSrc)
  470 |     expect(recordLocaleSourceAfter.readyState).toBeGreaterThan(0)
  471 |     expect(localeOperationKinds).toEqual(['account.set-locale'])
  472 |     expect((measurements.recordLocalePreservation as { forbiddenRecordingOrGenerationOperations: string[] }).forbiddenRecordingOrGenerationOperations).toEqual([])
  473 |     expect((measurements.recordLocalePreservation as { recordingGrantStoreWrites: unknown[] }).recordingGrantStoreWrites).toEqual([])
  474 |     expect(recordLocaleFailures).toEqual([])
  475 |     await measureSurface(page, 'record.initial.ru.390')
  476 |     await capture(page, 'record-initial-ru-390.png')
  477 |     await page.setViewportSize({ width: 1440, height: 960 })
  478 |     await setLocale(page, 'en')
  479 | 
  480 |     evidenceStage = 'Record-line-fake-microphone-capture'
  481 |     await page.getByRole('button', { name: 'Record line', exact: true }).click()
  482 |     const candidateNotice = page.getByText('Recorded audio frames were decoded. Next line saves this take and continues.', { exact: true })
  483 |     await expect(candidateNotice).toBeVisible({ timeout: 30_000 })
  484 |     evidenceStage = 'Record-candidate-preview-ready'
  485 |     await measureSurface(page, 'record.candidate.en.1440')
  486 |     await capture(page, 'record-candidate-en-1440.png')
  487 |     await page.waitForTimeout(350)
  488 |     const writesBeforeGuard = await readMutationCount(page)
  489 | 
  490 |     const homeLink = page.getByRole('link', { name: /Dubbed.*Home/i })
  491 |     evidenceStage = 'Record-candidate-open-leave-dialog'
  492 |     await homeLink.click()
  493 |     const leaveDialog = page.getByRole('dialog')
  494 |     await expect(leaveDialog).toBeVisible()
  495 |     const stayButton = page.getByRole('button', { name: 'Stay here', exact: true })
  496 |     await expect(stayButton).toBeFocused()
  497 |     await page.keyboard.press('Shift+Tab')
  498 |     measurements.recordLeaveDialogPreviousTabTarget = await page.evaluate(() => {
  499 |       const active = document.activeElement as HTMLElement | null
  500 |       return {
  501 |         text: active?.textContent?.trim() ?? null,
  502 |         insideDialog: Boolean(active?.closest('[role="dialog"]')),
  503 |         focusVisible: active?.matches(':focus-visible') ?? false,
  504 |       }
  505 |     })
  506 |     expect((measurements.recordLeaveDialogPreviousTabTarget as { insideDialog: boolean }).insideDialog).toBe(true)
  507 |     await page.keyboard.press('Tab')
  508 |     await expect(stayButton).toBeFocused()
  509 |     measurements.recordLeaveDialogFocus = await stayButton.evaluate((element) => {
  510 |       const style = getComputedStyle(element)
  511 |       const rect = element.getBoundingClientRect()
  512 |       return {
  513 |         focusTarget: element.textContent?.trim(),
  514 |         focusVisible: element.matches(':focus-visible'),
  515 |         outlineStyle: style.outlineStyle,
  516 |         outlineWidth: style.outlineWidth,
  517 |         outlineColor: style.outlineColor,
  518 |         outlineOffset: style.outlineOffset,
  519 |         boxShadow: style.boxShadow,
  520 |         target: { width: rect.width, height: rect.height },
  521 |       }
  522 |     })
  523 |     await measureSurface(page, 'record.leaveDialog.en.1440')
  524 |     await capture(page, 'record-leave-dialog-en-1440.png')
  525 |     evidenceStage = 'Record-candidate-leave-dialog-Escape'
  526 |     await page.keyboard.press('Escape')
  527 |     await expect(leaveDialog).toBeHidden()
  528 |     await expect(homeLink).toBeFocused()
  529 |     await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()
  530 |     await expect(candidateNotice).toBeVisible()
  531 |     const writesAfterEscape = await readMutationCount(page)
  532 |     expect(writesAfterEscape).toBe(writesBeforeGuard)
  533 | 
  534 |     evidenceStage = 'Record-candidate-reopen-leave-dialog'
  535 |     await homeLink.click()
  536 |     await expect(leaveDialog).toBeVisible()
  537 |     await expect(stayButton).toBeFocused()
  538 |     evidenceStage = 'Record-candidate-leave-dialog-Stay'
  539 |     await stayButton.click()
  540 |     await expect(leaveDialog).toBeHidden()
  541 |     await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  542 |     await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()
  543 |     await expect(candidateNotice).toBeVisible()
  544 |     const writesAfterStay = await readMutationCount(page)
  545 |     expect(writesAfterStay).toBe(writesBeforeGuard)
  546 |     measurements.recordLeaveGuardMutationCount = { before: writesBeforeGuard, afterEscape: writesAfterEscape, afterStay: writesAfterStay }
  547 | 
  548 |     evidenceStage = 'Record-accept-first-candidate-via-Next-line'
> 549 |     await page.getByRole('navigation', { name: 'Line' }).getByRole('button', { name: 'Next line' }).click()
      |                                                                                                     ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  550 |     await expect(page.getByText('Accepted takes: 1 / 3', { exact: true })).toBeVisible()
  551 |     evidenceStage = 'Record-line-2-capture-and-accept'
  552 |     await captureAndAcceptVisibleTurn(page)
  553 |     evidenceStage = 'Record-line-3-capture-and-accept'
  554 |     await captureAndAcceptVisibleTurn(page)
  555 |     await expect(page).toHaveURL(/\/projects\/[^/]+\/result$/)
  556 |     evidenceStage = 'actual-local-mock-Result-screen'
  557 |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible()
  558 |     await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible({ timeout: 30_000 })
  559 |     await expect(page.getByText('Synthetic fixture result; not rendered from accepted takes or a custom upload.', { exact: true })).toBeVisible()
  560 |     await measureSurface(page, 'result.actualMock.normal.en.1440')
  561 |     await capture(page, 'result-normal-local-mock-en-1440.png')
  562 | 
  563 |     await page.setViewportSize({ width: 390, height: 844 })
  564 |     await setLocale(page, 'ru')
  565 |     evidenceStage = 'actual-local-mock-Result-screen-Russian-mobile'
  566 |     await measureSurface(page, 'result.actualMock.normal.ru.390')
  567 |     await capture(page, 'result-normal-local-mock-ru-390.png')
  568 | 
  569 |     // Controlled ResultScreen facade is a separate visual fixture, not a backend/render journey.
  570 |     await page.setViewportSize({ width: 1440, height: 960 })
  571 |     evidenceStage = 'controlled-Result-fixture-screen'
  572 |     await page.goto('/e2e/harness/result.html')
  573 |     await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible()
  574 |     await expect(page.getByText('Displayed generation: 1', { exact: true })).toBeVisible()
  575 |     await measureSurface(page, 'result.controlled.normal.en.1440')
  576 |     await capture(page, 'result-controlled-generation1-normal-en-1440.png')
  577 | 
  578 |     const controlledVideo = page.getByLabel('Finished dubbed video')
  579 |     await controlledVideo.evaluate(async (element) => {
  580 |       const video = element as HTMLVideoElement
  581 |       video.muted = true
  582 |       video.volume = 0
  583 |       await video.play()
  584 |     })
  585 |     await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(0.2)
  586 |     await page.evaluate(() => window.__controlledResultHarness?.failFirstDownload())
  587 |     await page.getByRole('button', { name: 'Download MP4', exact: true }).click()
  588 |     await expect(page.getByText(/download request for version 1 failed/i)).toBeVisible()
  589 |     await measureSurface(page, 'result.controlled.downloadError.en.1440')
  590 |     await capture(page, 'result-controlled-download-error-en-1440.png')
  591 | 
  592 |     const oldSource = await controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentSrc)
  593 |     const oldTime = await controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)
  594 |     await page.evaluate(() => window.__controlledResultHarness?.publishGeneration2())
  595 |     await expect(page.getByText('New version ready', { exact: true }).first()).toBeVisible()
  596 |     await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentSrc)).toBe(oldSource)
  597 |     await expect.poll(() => controlledVideo.evaluate((element) => (element as HTMLVideoElement).currentTime)).toBeGreaterThan(oldTime)
  598 |     await expect(page.getByRole('button', { name: /Retry download version 1/i })).toBeVisible()
  599 |     await measureSurface(page, 'result.controlled.oldPlayingNewReady.en.1440')
  600 |     await capture(page, 'result-controlled-old-playing-new-ready-en-1440.png')
  601 | 
  602 |     await page.getByRole('button', { name: /Watch new/i }).click()
  603 |     await expect(page.getByText('Displayed generation: 2', { exact: true })).toBeVisible()
  604 |     await expect.poll(() => controlledVideo.evaluate((element) => ({
  605 |       paused: (element as HTMLVideoElement).paused,
  606 |       currentTime: (element as HTMLVideoElement).currentTime,
  607 |       src: (element as HTMLVideoElement).currentSrc,
  608 |     }))).toMatchObject({ paused: true, currentTime: 0 })
  609 |     await measureSurface(page, 'result.controlled.watchNewPaused.en.1440')
  610 |     await capture(page, 'result-controlled-watch-new-paused-en-1440.png')
  611 |     measurements.controlledResultJournal = await page.evaluate(() => window.__controlledResultHarness?.snapshot() ?? null)
  612 |     expect(overflowFindings, 'media surfaces must not overflow their measured viewport').toEqual([])
  613 |   } finally {
  614 |     await Promise.allSettled(failureSnapshots)
  615 |     writeFileSync(resolve(evidenceDirectory, 'media-screen-metrics.json'), JSON.stringify({
  616 |       capturedAtUtc: new Date().toISOString(),
  617 |       baseURL: baseURL ?? 'http://127.0.0.1:4176',
  618 |       browser: 'Playwright Chromium, local Vite mock adapter, --mute-audio and fake media flags from the base config',
  619 |       fixtureScope: 'local deterministic UI; fake Chromium microphone input and explicit controlled Result facade only',
  620 |       measurements,
  621 |       screenshots,
  622 |       overflowFindings,
  623 |       requestFailureSnapshotNote: 'Failure snapshots capture current route and media element sources when Chromium reports a failed request; stage is the last explicitly marked action in this test.',
  624 |       diagnostics: {
  625 |         pageErrors: diagnostics.pageErrors,
  626 |         consoleErrors: diagnostics.consoleErrors,
  627 |         externalRequests: diagnostics.externalRequests,
  628 |         backendRequests: diagnostics.backendRequests,
  629 |         failedRequests,
  630 |       },
  631 |     }, null, 2) + '\n')
  632 |   }
  633 |   diagnostics.assertClean()
  634 | })
  635 | 
```