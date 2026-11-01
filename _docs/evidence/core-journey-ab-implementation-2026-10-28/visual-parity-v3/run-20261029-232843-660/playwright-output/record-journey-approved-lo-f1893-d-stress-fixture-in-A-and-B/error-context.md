# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: record-journey.spec.ts >> approved long Russian line is used as an isolated stress fixture in A and B
- Location: e2e\record-journey.spec.ts:1771:1

# Error details

```
Error: expect(locator).toBeEnabled() failed

Locator: locator('.performance-actions').locator('#next')
Expected: enabled
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeEnabled" locator('.performance-actions').locator('#next') with timeout 5000ms
  - waiting for locator('.performance-actions').locator('#next')

```

```yaml
- main:
  - button "Выход"
  - heading "Sintel · The search" [level=1]
  - region "Запись":
    - paragraph: Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.
    - img "Оригинал · Ваш дубль"
    - paragraph: "Исходная звуковая волна с наложением вашего дубля. Прослушивание: оригинал."
    - text: Позиция в диалоговом окне
    - slider "Позиция в диалоговом окне": "1000"
    - text: 0:04 / 0:04 Громкость оригинала
    - slider "Громкость оригинала": "0.7"
    - complementary "Управление записью":
      - text: Реплика 3 / 3 Новый дубль
      - button "Оригинал"
      - button "Перезаписать"
      - button "Ваш дубль"
      - paragraph: «Далее» сохраняет этот дубль.
      - button "Назад"
      - button "Далее"
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
  513 |   const controls = page.locator(layout === 'A' ? '.performance-actions' : '.studio-controls');
  514 |   await expect(controls).toBeVisible();
  515 |   await expect(controls.locator('#take')).toBeEnabled({ timeout: 15_000 });
> 516 |   await expect(controls.locator('#next')).toBeEnabled();
      |                                           ^ Error: expect(locator).toBeEnabled() failed
  517 |   await expect(page.locator('.waveform-take')).toHaveCount(1);
  518 |   const database = await readIndexedDb(page);
  519 |   const currentTurnId = new URL(page.url()).searchParams.get('turn') ?? 'sintel-turn-1';
  520 |   const draftByTurn = database.project?.draftCandidateByTurn as Record<string, string> | undefined;
  521 |   const current = database.media.find((candidate) => candidate.id === draftByTurn?.[currentTurnId]);
  522 |   expect(current?.blobSize).toBeGreaterThan(0);
  523 |   expect(current?.blobSize).toBe(current?.byteSize);
  524 |   expect(current?.sha256).toMatch(/^[a-f0-9]{64}$/);
  525 |   expect((current?.probe as { byteSize?: number }).byteSize).toBe(current?.blobSize);
  526 |   return current;
  527 | }
  528 | 
  529 | async function recordCurrentWindow(page: Page, layout: 'A' | 'B') {
  530 |   const recordButton = page.getByRole('button', { name: 'Record', exact: true });
  531 |   await expect(recordButton).toBeEnabled();
  532 |   await recordButton.click();
  533 |   await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBeGreaterThan(0);
  534 |   const startedAt = await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime);
  535 |   await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 5_000 })
  536 |     .toBeGreaterThan(startedAt);
  537 |   await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  538 |   await waitForSavedCandidate(page, layout);
  539 | }
  540 | 
  541 | test.beforeAll(async () => mkdir(evidenceDirectory, { recursive: true }));
  542 | 
  543 | test('Exit returns through the guarded Projects boundary and restores focus to the logical Exit control', async ({ page }) => {
  544 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  545 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  546 |   await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  547 |   await page.getByRole('button', { name: 'Exit', exact: true }).click();
  548 |   await expect(page).toHaveURL(/\/projects\?/);
  549 |   await page.getByTestId('return-to-saved-record').click();
  550 |   await expect(page).toHaveURL(/returnFocus=exit/);
  551 |   await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  552 |   await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  553 |   await page.screenshot({ path: path.join(evidenceDirectory, 'exit-boundary-return-focus.png') });
  554 | });
  555 | 
  556 | test('delayed source playback keeps the recorder idle until the prepared window actually starts', async ({ page, browser }) => {
  557 |   test.setTimeout(45_000);
  558 |   await page.setViewportSize({ width: 1440, height: 900 });
  559 |   await instrumentNativeMedia(page);
  560 |   await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  561 |   await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
  562 |     video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  563 |   const preparedWindow = await page.evaluate(async () => {
  564 |     const database = await new Promise<IDBDatabase>((resolve, reject) => {
  565 |       const request = indexedDB.open('dubbed-core-local-v1');
  566 |       request.onsuccess = () => resolve(request.result);
  567 |       request.onerror = () => reject(request.error);
  568 |     });
  569 |     const project = await new Promise<{ windows: Array<{ id: string; startMs: number; endMs: number }> }>((resolve, reject) => {
  570 |       const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
  571 |       request.onsuccess = () => resolve(request.result);
  572 |       request.onerror = () => reject(request.error);
  573 |     });
  574 |     database.close();
  575 |     const selected = project.windows.find((window) => window.id === 'sintel-turn-1');
  576 |     if (!selected) throw new Error('Prepared turn 1 is missing its source window.');
  577 |     return selected;
  578 |   });
  579 |   await page.locator('video').evaluate((element) => {
  580 |     const video = element as HTMLVideoElement;
  581 |     const trace = {
  582 |       requestedAt: null as number | null,
  583 |       nativePlayAt: null as number | null,
  584 |       playingAt: null as number | null,
  585 |       playingVideoTime: null as number | null,
  586 |       recorderStartAt: null as number | null,
  587 |       recorderStartVideoTime: null as number | null,
  588 |       recorderStopAt: null as number | null,
  589 |       recorderStopVideoTime: null as number | null,
  590 |     };
  591 |     (window as Window & { __delayedCaptureTrace?: typeof trace }).__delayedCaptureTrace = trace;
  592 |     const nativePlay = video.play.bind(video);
  593 |     Object.defineProperty(video, 'play', {
  594 |       configurable: true,
  595 |       value: () => {
  596 |         trace.requestedAt = performance.now();
  597 |         return new Promise<void>((resolve, reject) => {
  598 |           window.setTimeout(() => {
  599 |             trace.nativePlayAt = performance.now();
  600 |             nativePlay().then(resolve, reject);
  601 |           }, 1_200);
  602 |         });
  603 |       },
  604 |     });
  605 |     video.addEventListener('playing', () => {
  606 |       trace.playingAt = performance.now();
  607 |       trace.playingVideoTime = video.currentTime;
  608 |     }, { once: true });
  609 |     const start = MediaRecorder.prototype.start;
  610 |     MediaRecorder.prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
  611 |       trace.recorderStartAt = performance.now();
  612 |       trace.recorderStartVideoTime = video.currentTime;
  613 |       return start.apply(this, args);
  614 |     };
  615 |     const stop = MediaRecorder.prototype.stop;
  616 |     MediaRecorder.prototype.stop = function (...args: Parameters<MediaRecorder['stop']>) {
```