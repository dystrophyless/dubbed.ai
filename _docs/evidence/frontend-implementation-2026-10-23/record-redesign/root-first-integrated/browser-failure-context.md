# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: media-visual.spec.ts >> captures the actual local mock Record journey, native fake-mic UI, and controlled Result presentation states
- Location: e2e\media-visual.spec.ts:222:1

# Error details

```
TimeoutError: locator.inputValue: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('slider', { name: 'Original video volume' })

```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - link "Skip to content" [ref=f1e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f1e5]:
    - generic [ref=f1e6]:
      - link "Dubbed — Home" [ref=f1e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e8]: Dubbed
      - generic [ref=f1e9]:
        - generic [ref=f1e10]:
          - generic [ref=f1e11]: Credits
          - strong [ref=f1e12]: "111"
        - generic [ref=f1e13]:
          - generic [ref=f1e14]: Language
          - combobox "Language" [ref=f1e15] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=f1e16] [cursor=pointer]
        - button "Open navigation" [ref=f1e17] [cursor=pointer]
  - main [ref=f1e19]:
    - region [ref=f1e21]:
      - generic [ref=f1e22]:
        - generic [ref=f1e23]:
          - heading "Record your voice" [level=1] [ref=f1e24]
          - paragraph [ref=f1e25]: Keep the original scene in view. Each line records for its timed window and stops automatically.
        - button "Projects" [ref=f1e26] [cursor=pointer]
      - paragraph [ref=f1e29]: Microphone access is requested only when you choose Record line.
      - generic "Original video" [ref=f1e31]
      - generic [ref=f1e32]:
        - generic [ref=f1e33]:
          - generic [ref=f1e34]: Line 1 of 3
          - paragraph [ref=f1e35]: A blue light is on.
          - paragraph [ref=f1e36]: "Capture window: 0.75–3.18 s"
        - generic [ref=f1e37]: "Accepted takes: 0 / 3"
      - region "Recording playback timeline" [ref=f1e38]:
        - slider "Seek playback" [ref=f1e169] [cursor=pointer]: "0"
      - generic [ref=f1e170]:
        - generic [ref=f1e171]:
          - group "Audio source" [ref=f1e172]:
            - button "Original video" [pressed] [ref=f1e173] [cursor=pointer]
            - button "My recording" [disabled] [ref=f1e174]
          - button "Play" [ref=f1e175] [cursor=pointer]
          - 'status "Playback position: 0:00 / 0:02" [ref=f1e178]': 0:00 / 0:02
        - paragraph [ref=f1e179]: No saved recording is available for this line yet.
        - generic [ref=f1e180]:
          - button "Record line" [ref=f1e181] [cursor=pointer]
          - button "Previous line" [disabled] [ref=f1e185]
          - button "Next line" [ref=f1e188] [cursor=pointer]
      - generic [ref=f1e191]:
        - generic [ref=f1e192]: Playback volume
        - slider "Playback volume" [ref=f1e193]: "0.8"
      - generic [ref=f1e194]: Recording status
      - 'generic "Input level: 0" [ref=f1e196]'
      - paragraph [ref=f1e197]: This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.
      - region [ref=f1e198]:
        - heading "Process again" [level=2] [ref=f1e199]
        - paragraph [ref=f1e200]: The current preparation remains active until a complete, usable replacement with dialogue is activated.
        - button "Check current reprocessing option" [ref=f1e201] [cursor=pointer]
```

# Test source

```ts
  308 |     await expect(page.getByRole('heading', { name: 'Check your microphone' })).toBeVisible()
  309 |     await expect(page.getByRole('button', { name: 'Record test', exact: true })).toBeDisabled()
  310 |     await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  311 |     await expect(page.locator('audio')).toHaveCount(0)
  312 |     await measureSurface(page, 'microphone.initial.en.1440')
  313 |     await capture(page, 'microphone-initial-en-1440.png')
  314 | 
  315 |     await page.evaluate(() => {
  316 |       const devices = navigator.mediaDevices
  317 |       window.__mediaEvidenceNativeGetUserMedia = devices.getUserMedia.bind(devices)
  318 |       Object.defineProperty(devices, 'getUserMedia', {
  319 |         configurable: true,
  320 |         writable: true,
  321 |         value: () => Promise.reject(new DOMException('Synthetic permission denial for UI evidence.', 'NotAllowedError')),
  322 |       })
  323 |     })
  324 |     await page.getByRole('button', { name: 'Allow microphone access', exact: true }).click()
  325 |     await expect(page.getByRole('alert')).toContainText('Microphone access was denied.')
  326 |     await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeDisabled()
  327 |     await capture(page, 'microphone-denied-en-1440.png')
  328 | 
  329 |     await page.evaluate(() => {
  330 |       const native = window.__mediaEvidenceNativeGetUserMedia
  331 |       if (!native) throw new Error('The native fake-device microphone function was not retained for the synthetic denial retry.')
  332 |       Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
  333 |         configurable: true,
  334 |         writable: true,
  335 |         value: native,
  336 |       })
  337 |       delete window.__mediaEvidenceNativeGetUserMedia
  338 |     })
  339 |     await page.getByRole('button', { name: 'Connect selected microphone', exact: true }).click()
  340 |     await expect(page.getByText(/The browser is providing a live microphone track\./)).toBeVisible()
  341 |     await expect(page.getByRole('meter', { name: 'Microphone input level' })).toBeVisible()
  342 |     await expect(page.getByRole('button', { name: 'Continue to New Dub', exact: true })).toBeEnabled()
  343 | 
  344 |     const microphoneTestWritesBefore = await readMutationCount(page)
  345 |     await page.getByRole('button', { name: 'Record test', exact: true }).click()
  346 |     await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible()
  347 |     await page.waitForTimeout(250)
  348 |     await page.getByRole('button', { name: 'Stop', exact: true }).click()
  349 |     const localAudio = page.getByLabel('Local test recording')
  350 |     await expect(localAudio).toBeVisible()
  351 |     await expect(page.getByRole('status').filter({ hasText: 'Recorded locally.' })).toBeVisible()
  352 |     const localAudioInfo = await localAudio.evaluate((element) => {
  353 |       const audio = element as HTMLAudioElement
  354 |       return { sourceScheme: new URL(audio.currentSrc).protocol, muted: audio.muted, volume: audio.volume }
  355 |     })
  356 |     expect(localAudioInfo).toEqual({ sourceScheme: 'blob:', muted: true, volume: 0 })
  357 |     const microphoneTestWritesAfter = await readMutationCount(page)
  358 |     expect(microphoneTestWritesAfter).toBe(microphoneTestWritesBefore)
  359 |     measurements.microphoneLocalTest = {
  360 |       ...localAudioInfo,
  361 |       indexedDbWrites: microphoneTestWritesAfter - microphoneTestWritesBefore,
  362 |       connection: 'explicit Chromium fake-device permission grant; no physical input claim',
  363 |       test: 'MediaRecorder fixture stopped by the test; page-local Blob playback element shown; Listen was not activated',
  364 |     }
  365 |     await measureSurface(page, 'microphone.localTest.en.1440')
  366 |     await capture(page, 'microphone-local-test-en-1440.png')
  367 | 
  368 |     await page.setViewportSize({ width: 390, height: 844 })
  369 |     await setLocale(page, 'ru')
  370 |     await expect(page.getByRole('heading', { name: 'Проверка микрофона' })).toBeVisible()
  371 |     await measureSurface(page, 'microphone.ready.ru.390')
  372 |     await capture(page, 'microphone-ready-ru-390.png')
  373 |     for (const width of [767, 768]) {
  374 |       await page.setViewportSize({ width, height: 900 })
  375 |       await measureSurface(page, `microphone.ready.ru.${width}`)
  376 |       await capture(page, `microphone-ready-ru-${width}.png`)
  377 |     }
  378 |     await page.emulateMedia({ reducedMotion: 'reduce' })
  379 |     measurements.microphoneReducedMotion = await page.evaluate(() => ({
  380 |       matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
  381 |       screenAnimationDuration: getComputedStyle(document.querySelector('.microphone-check')!).animationDuration,
  382 |       screenTransitionDuration: getComputedStyle(document.querySelector('.microphone-check')!).transitionDuration,
  383 |     }))
  384 |     expect((measurements.microphoneReducedMotion as { matches: boolean }).matches).toBe(true)
  385 |     await page.emulateMedia({ reducedMotion: 'no-preference' })
  386 | 
  387 |     await page.setViewportSize({ width: 1440, height: 960 })
  388 |     await setLocale(page, 'en')
  389 |     await page.getByRole('button', { name: 'Continue to New Dub', exact: true }).click()
  390 |     await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
  391 |     evidenceStage = 'New-Dub-local-source-preview'
  392 |     await uploadKnownSourceThroughUi(page)
  393 |     await setMillisecondSelectionAndQuote(page)
  394 |     evidenceStage = 'New-Dub-process-navigation-to-Record'
  395 |     await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
  396 |     await expect(page).toHaveURL(/\/projects\/[^/]+\/record$/)
  397 |     await expect(page.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
  398 |     await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()
  399 | 
  400 |     await measureSurface(page, 'record.initial.en.1440')
  401 |     await capture(page, 'record-initial-en-1440.png')
  402 |     for (const width of [767, 768]) {
  403 |       await page.setViewportSize({ width, height: 900 })
  404 |       await measureSurface(page, `record.initial.en.${width}`)
  405 |       await capture(page, `record-initial-en-${width}.png`)
  406 |       if (width === 767) {
  407 |         const volume = page.getByRole('slider', { name: 'Original video volume' })
> 408 |         const initialValue = Number(await volume.inputValue())
      |                                                  ^ TimeoutError: locator.inputValue: Timeout 30000ms exceeded.
  409 |         const writesBeforeKeyboard = await readMutationCount(page)
  410 |         await volume.focus()
  411 |         await volume.press('ArrowRight')
  412 |         const keyboardValue = Number(await volume.inputValue())
  413 |         expect(keyboardValue).toBeCloseTo(initialValue + 0.01, 3)
  414 |         await volume.press('ArrowLeft')
  415 |         expect(Number(await volume.inputValue())).toBeCloseTo(initialValue, 3)
  416 |         const writesAfterKeyboard = await readMutationCount(page)
  417 |         expect(writesAfterKeyboard).toBe(writesBeforeKeyboard)
  418 |         measurements.recordVolumeKeyboard = {
  419 |           initialValue,
  420 |           keyboardValue,
  421 |           restoredValue: Number(await volume.inputValue()),
  422 |           indexedDbWrites: writesAfterKeyboard - writesBeforeKeyboard,
  423 |         }
  424 |       }
  425 |     }
  426 |     await page.setViewportSize({ width: 390, height: 844 })
  427 |     await expect.poll(() => page.locator('.recording-screen__stage video').evaluate((element) => (
  428 |       (element as HTMLVideoElement).readyState
  429 |     ))).toBeGreaterThan(0)
  430 |     const recordLocaleSourceBefore = await readRecordSource(page)
  431 |     const recordLocaleWritesBefore = await readMutationCount(page)
  432 |     const recordLocaleWriteEventsBefore = await readMutationEvents(page)
  433 |     const recordLocaleFailureStart = failedRequests.length
  434 |     evidenceStage = 'Record-locale-EN-to-RU-at-390'
  435 |     await setLocale(page, 'ru')
  436 |     await expect(page.getByRole('heading', { name: 'Запишите свою реплику', exact: true })).toBeVisible()
  437 |     await page.waitForTimeout(350)
  438 |     const recordLocaleSourceAfter = await readRecordSource(page)
  439 |     const recordLocaleWritesAfter = await readMutationCount(page)
  440 |     const recordLocaleWriteEventsAfter = await readMutationEvents(page)
  441 |     const localeWriteEvents = recordLocaleWriteEventsAfter.slice(recordLocaleWriteEventsBefore.length)
  442 |     const recordLocaleFailures = failedRequests.slice(recordLocaleFailureStart)
  443 |       .filter((failure) => failure.resourceType === 'media')
  444 |     const localeOperationKinds = localeWriteEvents
  445 |       .filter((event) => event.storeName === 'operations')
  446 |       .map((event) => event.recordKind ?? 'unclassified')
  447 |     const accessOperationKinds = new Set([
  448 |       'recording.acquire-access',
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
```