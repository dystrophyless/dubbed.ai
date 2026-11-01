# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> approved long Russian line is used as an isolated stress fixture in A and B
- Location: e2e\record-journey.spec.ts:1773:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('complementary', { name: 'Performance controls' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('complementary', { name: 'Performance controls' }) with timeout 5000ms
  - waiting for getByRole('complementary', { name: 'Performance controls' })

```

```yaml
- main:
  - button "Выход" [disabled]
  - heading "Sintel · The search" [level=1]
  - region "Запись":
    - text: Запись · осталось 0:00
    - paragraph: Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.
    - img "Оригинал · Ваш дубль"
    - paragraph: Исходная звуковая волна. Записывается ваш дубль.
    - text: Позиция в диалоговом окне
    - slider "Позиция в диалоговом окне" [disabled]: "904"
    - text: 0:04 / 0:04 Громкость оригинала
    - slider "Громкость оригинала": "0.7"
    - complementary "Управление записью":
      - text: Реплика 3 / 3
      - button "Оригинал" [disabled]
      - button "Идёт запись" [disabled]
      - button "Ваш дубль" [disabled]
      - status: Записываем всё подготовленное окно. Запись остановится автоматически.
      - button "Назад" [disabled]
      - button "Далее" [disabled]
```

# Test source

```ts
  416 | 
  417 |   await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  418 |   const saved = await waitForSavedCandidate(page, 'A');
  419 |   await expect.poll(async () => page.evaluate(() => (window as unknown as Window & {
  420 |     __nativeBlobDigestTrace: { captures: number; byteSize: number; mimeType: string; sha256: string | null };
  421 |   }).__nativeBlobDigestTrace.sha256), { timeout: 5_000 }).toBe(saved?.sha256);
  422 |   const recoveredTrace = await page.evaluate(() => (window as unknown as Window & {
  423 |     __nativeBlobDigestTrace: { captures: number; byteSize: number; mimeType: string; sha256: string | null };
  424 |   }).__nativeBlobDigestTrace);
  425 |   expect(recoveredTrace.captures).toBe(1);
  426 |   expect(recoveredTrace.byteSize).toBe(saved?.blobSize);
  427 |   expect(recoveredTrace.mimeType).toBe(saved?.mimeType);
  428 |   const afterRetry = await readIndexedDb(page);
  429 |   expect((afterRetry.project?.acceptedByTurn as Record<string, string>)['sintel-turn-1']).toBe(acceptedBefore);
  430 |   expect((afterRetry.project?.draftCandidateByTurn as Record<string, string>)['sintel-turn-1']).toBe(saved?.id);
  431 |   await writeFile(path.join(evidenceDirectory, 'known-save-failure-browser-evidence.json'), JSON.stringify({
  432 |     date: new Date().toISOString(),
  433 |     browser: `Chrome ${browser.version()}`,
  434 |     scenario: 'First accepted take preserved after a known pre-write quota failure. Retry saved the exact captured Blob without re-recording.',
  435 |     physicalMicrophone: false,
  436 |     nativeApiEvidence: await evidenceCounters(page),
  437 |     acceptedCandidateBeforeFailure: acceptedBefore,
  438 |     failedAttempt: failedTrace,
  439 |     recoveryToast: toastStyle,
  440 |     capturedBlobBeforePersistence: recoveredTrace,
  441 |     retry: recoveredTrace,
  442 |     finalProject: afterRetry.project,
  443 |     retriedCandidate: saved,
  444 |   }, null, 2), 'utf8');
  445 | });
  446 | 
  447 | test('failed guarded Exit keeps the original intent, focuses Retry, and restores Exit after retry and boundary return', async ({ page, browser }) => {
  448 |   test.setTimeout(45_000);
  449 |   await page.setViewportSize({ width: 1440, height: 900 });
  450 |   await instrumentNativeMedia(page);
  451 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  452 |   const candidate = await (async () => {
  453 |     await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  454 |       video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  455 |     await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
  456 |     await recordCurrentWindow(page, 'A');
  457 |     return waitForSavedCandidate(page, 'A');
  458 |   })();
  459 |   await installAcceptanceFailure(page);
  460 |   await page.getByRole('button', { name: 'Exit', exact: true }).click();
  461 |   const guard = page.getByRole('dialog');
  462 |   await expect(guard).toBeVisible();
  463 |   await guard.getByRole('button', { name: 'Save and leave', exact: true }).click();
  464 |   await expect(guard.getByRole('button', { name: 'Retry accept and leave', exact: true })).toBeVisible();
  465 |   const retry = guard.locator('[data-recovery-action="retry-guard"]');
  466 |   await expect(retry).toBeFocused();
  467 |   const failed = await readIndexedDb(page);
  468 |   expect(failed.project?.draftCandidateByTurn).toMatchObject({ 'sintel-turn-1': candidate?.id });
  469 |   expect(Object.values(failed.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
  470 |   const acceptanceFailure = await page.evaluate(() => (window as unknown as Window & { __acceptFailureTrace: { calls: number; stores: string[]; restore: () => void } }).__acceptFailureTrace);
  471 |   expect(acceptanceFailure.calls).toBe(1);
  472 |   expect(acceptanceFailure.stores).toContain('operations');
  473 |   await page.evaluate(() => (window as unknown as Window & { __acceptFailureTrace: { restore: () => void } }).__acceptFailureTrace.restore());
  474 |   await page.screenshot({ path: path.join(evidenceDirectory, 'guarded-exit-known-acceptance-failure.png') });
  475 | 
  476 |   const beforeToastExpiry = await page.evaluate(() => ({
  477 |     focusedRetry: document.activeElement?.matches('[data-recovery-action="retry-guard"]') ?? false,
  478 |     scrollY: window.scrollY,
  479 |   }));
  480 |   expect(beforeToastExpiry.focusedRetry).toBe(true);
  481 |   await expect(page.locator('.recovery-toast')).toHaveCount(0, { timeout: 10_000 });
  482 |   await expect(retry).toBeFocused();
  483 |   const retryFocusedAfterToastExpiry = await retry.evaluate((element) => element === document.activeElement);
  484 |   expect(retryFocusedAfterToastExpiry).toBe(true);
  485 |   expect(await page.evaluate(() => window.scrollY)).toBe(beforeToastExpiry.scrollY);
  486 |   await retry.click();
  487 |   await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
  488 |   await page.screenshot({ path: path.join(evidenceDirectory, 'guarded-exit-success-boundary.png'), fullPage: true });
  489 |   await page.getByTestId('return-to-saved-record').click();
  490 |   await expect(page).toHaveURL(/returnFocus=exit/);
  491 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  492 |   await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  493 |   const accepted = await readIndexedDb(page);
  494 |   expect(accepted.project?.acceptedByTurn).toMatchObject({ 'sintel-turn-1': candidate?.id });
  495 |   const successfulAcceptOperations = accepted.operations.filter((operation) => operation.kind === 'accept-candidate' && operation.state === 'committed');
  496 |   expect(successfulAcceptOperations).toHaveLength(1);
  497 |   await writeFile(path.join(evidenceDirectory, 'guarded-exit-retry-focus-evidence.json'), JSON.stringify({
  498 |     date: new Date().toISOString(),
  499 |     browser: `Chrome ${browser.version()}`,
  500 |     nativeInput: 'Chrome browser fake audio input; not a physical microphone',
  501 |     candidateId: candidate?.id,
  502 |     acceptedBeforeRetry: failed.project?.acceptedByTurn,
  503 |     acceptedAfterRetry: accepted.project?.acceptedByTurn,
  504 |     failureTrace: acceptanceFailure,
  505 |     successfulAcceptOperations,
  506 |     focusBeforeToastExpiry: beforeToastExpiry,
  507 |     retryFocusedAfterToastExpiry,
  508 |     boundaryReturnFocusedExit: await page.locator('[data-logical-focus="exit"]').evaluate((element) => element === document.activeElement),
  509 |   }, null, 2), 'utf8');
  510 | });
  511 | 
  512 | async function waitForSavedCandidate(page: Page, layout: 'A' | 'B') {
  513 |   const controls = layout === 'A'
  514 |     ? page.getByRole('complementary', { name: 'Performance controls' })
  515 |     : page.getByRole('region', { name: 'Performance controls' });
> 516 |   await expect(controls).toBeVisible();
      |                          ^ Error: expect(locator).toBeVisible() failed
  517 |   await expect(controls.locator('#take')).toBeEnabled({ timeout: 15_000 });
  518 |   await expect(controls.locator('#next')).toBeEnabled();
  519 |   await expect(page.locator('.waveform-take')).toHaveCount(1);
  520 |   const database = await readIndexedDb(page);
  521 |   const currentTurnId = new URL(page.url()).searchParams.get('turn') ?? 'sintel-turn-1';
  522 |   const draftByTurn = database.project?.draftCandidateByTurn as Record<string, string> | undefined;
  523 |   const current = database.media.find((candidate) => candidate.id === draftByTurn?.[currentTurnId]);
  524 |   expect(current?.blobSize).toBeGreaterThan(0);
  525 |   expect(current?.blobSize).toBe(current?.byteSize);
  526 |   expect(current?.sha256).toMatch(/^[a-f0-9]{64}$/);
  527 |   expect((current?.probe as { byteSize?: number }).byteSize).toBe(current?.blobSize);
  528 |   return current;
  529 | }
  530 | 
  531 | async function recordCurrentWindow(page: Page, layout: 'A' | 'B') {
  532 |   const recordButton = page.getByRole('button', { name: 'Record', exact: true });
  533 |   await expect(recordButton).toBeEnabled();
  534 |   await recordButton.click();
  535 |   await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBeGreaterThan(0);
  536 |   const startedAt = await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime);
  537 |   await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 5_000 })
  538 |     .toBeGreaterThan(startedAt);
  539 |   await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  540 |   await waitForSavedCandidate(page, layout);
  541 | }
  542 | 
  543 | test.beforeAll(async () => mkdir(evidenceDirectory, { recursive: true }));
  544 | 
  545 | test('Exit returns through the guarded Projects boundary and restores focus to the logical Exit control', async ({ page }) => {
  546 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  547 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  548 |   await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  549 |   await page.getByRole('button', { name: 'Exit', exact: true }).click();
  550 |   await expect(page).toHaveURL(/\/projects\?/);
  551 |   await page.getByTestId('return-to-saved-record').click();
  552 |   await expect(page).toHaveURL(/returnFocus=exit/);
  553 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  554 |   await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  555 |   await page.screenshot({ path: path.join(evidenceDirectory, 'exit-boundary-return-focus.png') });
  556 | });
  557 | 
  558 | test('delayed source playback keeps the recorder idle until the prepared window actually starts', async ({ page, browser }) => {
  559 |   test.setTimeout(45_000);
  560 |   await page.setViewportSize({ width: 1440, height: 900 });
  561 |   await instrumentNativeMedia(page);
  562 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  563 |   await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  564 |     video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  565 |   const preparedWindow = await page.evaluate(async () => {
  566 |     const database = await new Promise<IDBDatabase>((resolve, reject) => {
  567 |       const request = indexedDB.open('dubbed-core-local-v1');
  568 |       request.onsuccess = () => resolve(request.result);
  569 |       request.onerror = () => reject(request.error);
  570 |     });
  571 |     const project = await new Promise<{ windows: Array<{ id: string; startMs: number; endMs: number }> }>((resolve, reject) => {
  572 |       const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
  573 |       request.onsuccess = () => resolve(request.result);
  574 |       request.onerror = () => reject(request.error);
  575 |     });
  576 |     database.close();
  577 |     const selected = project.windows.find((window) => window.id === 'sintel-turn-1');
  578 |     if (!selected) throw new Error('Prepared turn 1 is missing its source window.');
  579 |     return selected;
  580 |   });
  581 |   await page.locator('video').evaluate((element) => {
  582 |     const video = element as HTMLVideoElement;
  583 |     const trace = {
  584 |       requestedAt: null as number | null,
  585 |       nativePlayAt: null as number | null,
  586 |       playingAt: null as number | null,
  587 |       playingVideoTime: null as number | null,
  588 |       recorderStartAt: null as number | null,
  589 |       recorderStartVideoTime: null as number | null,
  590 |       recorderStopAt: null as number | null,
  591 |       recorderStopVideoTime: null as number | null,
  592 |     };
  593 |     (window as Window & { __delayedCaptureTrace?: typeof trace }).__delayedCaptureTrace = trace;
  594 |     const nativePlay = video.play.bind(video);
  595 |     Object.defineProperty(video, 'play', {
  596 |       configurable: true,
  597 |       value: () => {
  598 |         trace.requestedAt = performance.now();
  599 |         return new Promise<void>((resolve, reject) => {
  600 |           window.setTimeout(() => {
  601 |             trace.nativePlayAt = performance.now();
  602 |             nativePlay().then(resolve, reject);
  603 |           }, 1_200);
  604 |         });
  605 |       },
  606 |     });
  607 |     video.addEventListener('playing', () => {
  608 |       trace.playingAt = performance.now();
  609 |       trace.playingVideoTime = video.currentTime;
  610 |     }, { once: true });
  611 |     const start = MediaRecorder.prototype.start;
  612 |     MediaRecorder.prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
  613 |       trace.recorderStartAt = performance.now();
  614 |       trace.recorderStartVideoTime = video.currentTime;
  615 |       return start.apply(this, args);
  616 |     };
```