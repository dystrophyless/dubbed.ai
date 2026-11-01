import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test, expect, type Page } from '@playwright/test';

const evidenceDirectory = path.resolve(
  process.cwd(), '..', '_docs', 'evidence', 'core-journey-ab-implementation-2026-10-28',
  ...(process.env.DUBBED_CORE_EVIDENCE_RUN ?? 'phase3').split(/[\\/]+/),
);

async function setRecordLocale(page: Page, locale: 'en' | 'ru') {
  const url = new URL(page.url());
  url.searchParams.set('locale', locale);
  await page.goto(`${url.pathname}${url.search}`);
}

async function instrumentNativeMedia(page: Page) {
  await page.addInitScript(() => {
    const target = window as Window & {
      __nativeRecordEvidence?: { getUserMediaCalls: number; recorderStarts: number };
      __lockEvidence?: { requests: string[]; callbacks: Array<'acquired' | 'null'> };
      __denyMicrophone?: boolean;
    };
    target.__nativeRecordEvidence = { getUserMediaCalls: 0, recorderStarts: 0 };
    try {
      const savedEvidence = sessionStorage.getItem('__dubbed_native_record_evidence_v1');
      if (savedEvidence) target.__nativeRecordEvidence = JSON.parse(savedEvidence) as NonNullable<typeof target.__nativeRecordEvidence>;
    } catch { /* Evidence storage is best-effort; browser behavior remains authoritative. */ }
    const persistNativeEvidence = () => {
      try { sessionStorage.setItem('__dubbed_native_record_evidence_v1', JSON.stringify(target.__nativeRecordEvidence)); }
      catch { /* Keep capture behavior independent of evidence storage. */ }
    };
    target.__lockEvidence = { requests: [], callbacks: [] };
    const lockManager = navigator.locks;
    const originalRequest = lockManager.request.bind(lockManager);
    Object.defineProperty(lockManager, 'request', {
      configurable: true,
      value: (name: string, options: LockOptions, callback: (lock: Lock | null) => Promise<unknown> | unknown) => {
        target.__lockEvidence!.requests.push(name);
        return originalRequest(name, options, (lock) => {
          target.__lockEvidence!.callbacks.push(lock ? 'acquired' : 'null');
          return callback(lock);
        });
      },
    });
    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices) {
      const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
      mediaDevices.getUserMedia = (...args: Parameters<MediaDevices['getUserMedia']>) => {
        target.__nativeRecordEvidence!.getUserMediaCalls += 1;
        persistNativeEvidence();
        if (target.__denyMicrophone) return Promise.reject(new DOMException('Microphone permission denied in the test harness.', 'NotAllowedError'));
        return getUserMedia(...args);
      };
    }
    if (window.MediaRecorder) {
      const start = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
        target.__nativeRecordEvidence!.recorderStarts += 1;
        persistNativeEvidence();
        return start.apply(this, args);
      };
    }
  });
}

type ResultPlayFault = 'late-abort' | 'not-supported';

type ResultPlayFaultEntry = {
  fault: ResultPlayFault;
  source: string | null;
  requestedAt: number;
  rejectedAt: number | null;
  connectedAtRejection: boolean | null;
  sourceAtRejection: string | null;
};

async function installResultPlayFaults(page: Page) {
  await page.evaluate(() => {
    const target = window as Window & {
      __resultPlayFault?: ResultPlayFault;
      __resultPlayTrace?: ResultPlayFaultEntry[];
      __resultPlayWrapperInstalled?: boolean;
    };
    target.__resultPlayTrace ??= [];
    if (target.__resultPlayWrapperInstalled) return;
    const nativePlay = HTMLMediaElement.prototype.play;
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: function (this: HTMLMediaElement): Promise<void> {
        const mode = this instanceof HTMLVideoElement ? target.__resultPlayFault : undefined;
        if (!mode) return nativePlay.call(this);
        target.__resultPlayFault = undefined;
        const entry: ResultPlayFaultEntry = {
          fault: mode,
          source: this instanceof HTMLVideoElement ? this.dataset.source ?? null : null,
          requestedAt: performance.now(),
          rejectedAt: null,
          connectedAtRejection: null,
          sourceAtRejection: null,
        };
        target.__resultPlayTrace!.push(entry);
        if (mode === 'not-supported') {
          entry.rejectedAt = performance.now();
          entry.connectedAtRejection = this.isConnected;
          entry.sourceAtRejection = this instanceof HTMLVideoElement ? this.dataset.source ?? null : null;
          return Promise.reject(new DOMException('Injected current-source playback failure.', 'NotSupportedError'));
        }
        const nativeRequest = nativePlay.call(this);
        return nativeRequest.then(() => new Promise<void>((_resolve, reject) => {
          window.setTimeout(() => {
            entry.rejectedAt = performance.now();
            entry.connectedAtRejection = this.isConnected;
            entry.sourceAtRejection = this instanceof HTMLVideoElement ? this.dataset.source ?? null : null;
            reject(new DOMException('Injected delayed cancellation from the previous playback request.', 'AbortError'));
          }, 450);
        }));
      },
    });
    target.__resultPlayWrapperInstalled = true;
  });
}

async function armResultPlayFault(page: Page, fault: ResultPlayFault) {
  await page.evaluate((nextFault) => {
    const target = window as Window & { __resultPlayFault?: ResultPlayFault };
    target.__resultPlayFault = nextFault;
  }, fault);
}

async function evidenceCounters(page: Page) {
  return page.evaluate(() => (window as unknown as Window & { __nativeRecordEvidence: { getUserMediaCalls: number; recorderStarts: number } }).__nativeRecordEvidence);
}

async function installStoreFailure(page: Page, mode: 'lost-acknowledgement' | 'known-failure') {
  await page.evaluate((faultMode) => {
    type ProjectStore = {
      saveCandidate(request: { operationId: string; capture: { blob: Blob } }): Promise<unknown>;
      lookupOperation(...args: unknown[]): Promise<unknown>;
    };
    type Fiber = { child?: unknown; sibling?: unknown; memoizedProps?: unknown };
    const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
    if (!root) throw new Error('The React root is unavailable.');
    const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
    if (!rootKey) throw new Error('The React root fiber is unavailable.');
    const pending: unknown[] = [root[rootKey]];
    let store: ProjectStore | null = null;
    while (pending.length > 0) {
      const fiber = pending.pop() as Fiber | null;
      if (!fiber) continue;
      const props = fiber.memoizedProps as { services?: { projects?: ProjectStore } } | null;
      if (props?.services?.projects) store = props.services.projects;
      if (fiber.child) pending.push(fiber.child);
      if (fiber.sibling) pending.push(fiber.sibling);
    }
    if (!store) throw new Error('The active typed ProjectPort was not found in the services provider.');
    const originalSave = store.saveCandidate.bind(store);
    const originalLookup = store.lookupOperation.bind(store);
    const trace = { saveCalls: 0, lookupCalls: 0, operationIds: [] as string[], blobSizes: [] as number[], retrySameBlob: null as boolean | null };
    (window as Window & { __storeFailureTrace?: typeof trace }).__storeFailureTrace = trace;
    let firstKnownFailure = true;
    let failedBlob: Blob | null = null;
    store.saveCandidate = async (request) => {
      trace.saveCalls += 1;
      trace.operationIds.push(request.operationId);
      trace.blobSizes.push(request.capture.blob.size);
      if (faultMode === 'known-failure' && firstKnownFailure) {
        firstKnownFailure = false;
        failedBlob = request.capture.blob;
        throw new DOMException('Synthetic known quota failure before a write was sent.', 'QuotaExceededError');
      }
      if (faultMode === 'known-failure' && failedBlob) trace.retrySameBlob = failedBlob === request.capture.blob;
      const committed = await originalSave(request);
      return faultMode === 'lost-acknowledgement'
        ? { kind: 'unknown', operationId: request.operationId, reason: 'Test harness withheld the successful acknowledgement.' }
        : committed;
    };
    store.lookupOperation = async (...args) => {
      trace.lookupCalls += 1;
      if (faultMode === 'lost-acknowledgement' && trace.lookupCalls === 1) {
        return { kind: 'pending', operationId: String(args[1]) };
      }
      return originalLookup(...args);
    };
  }, mode);
}

async function installAcceptanceFailure(page: Page) {
  await page.evaluate(async () => {
    const originalTransaction = IDBDatabase.prototype.transaction;
    const trace = { calls: 0, stores: [] as string[], restore: () => undefined };
    (window as Window & { __acceptFailureTrace?: typeof trace }).__acceptFailureTrace = trace;
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      const stores = typeof storeNames === 'string' ? [storeNames] : [...storeNames];
      if (trace.calls === 0 && mode === 'readwrite' && stores.includes('operations')) {
        trace.calls += 1;
        trace.stores = stores;
        throw new DOMException('Synthetic known acceptance write failure.', 'QuotaExceededError');
      }
      return originalTransaction.call(this, storeNames, mode, options);
    };
    trace.restore = () => { IDBDatabase.prototype.transaction = originalTransaction; };
  });
}

async function installNextOperationWriteFailure(page: Page) {
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    const trace = { calls: 0, stores: [] as string[] };
    const target = window as Window & {
      __operationWriteFailure?: typeof trace;
      __restoreOperationWriteFailure?: () => void;
    };
    target.__operationWriteFailure = trace;
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      const stores = typeof storeNames === 'string' ? [storeNames] : [...storeNames];
      if (trace.calls === 0 && mode === 'readwrite' && stores.includes('operations')) {
        trace.calls += 1;
        trace.stores = stores;
        throw new DOMException('Synthetic known candidate write failure.', 'QuotaExceededError');
      }
      return original.call(this, storeNames, mode, options);
    };
    target.__restoreOperationWriteFailure = () => { IDBDatabase.prototype.transaction = original; };
  });
}

async function traceNextNativeBlobDigest(page: Page) {
  await page.evaluate(() => {
    const trace = { captures: 0, byteSize: 0, mimeType: '', sha256: null as string | null };
    (window as Window & { __nativeBlobDigestTrace?: typeof trace }).__nativeBlobDigestTrace = trace;
    const prototype = MediaRecorder.prototype;
    const start = prototype.start;
    prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
      const chunks: BlobPart[] = [];
      this.addEventListener('dataavailable', (event) => { if (event.data.size > 0) chunks.push(event.data); });
      this.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: this.mimeType });
        trace.captures += 1;
        trace.byteSize = blob.size;
        trace.mimeType = blob.type;
        void blob.arrayBuffer().then((bytes) => crypto.subtle.digest('SHA-256', bytes)).then((digest) => {
          trace.sha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
        });
      }, { once: true });
      return start.apply(this, args);
    };
  });
}

async function storeFailureTrace(page: Page) {
  return page.evaluate(() => (window as unknown as Window & {
    __storeFailureTrace: { saveCalls: number; lookupCalls: number; operationIds: string[]; blobSizes: number[]; retrySameBlob: boolean | null };
  }).__storeFailureTrace);
}

async function readIndexedDb(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = <T>(storeName: string, key?: IDBValidKey) => new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const request = key === undefined ? transaction.objectStore(storeName).getAll() : transaction.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
    const project = await read<Record<string, unknown>>('projects', 'sintel-prepared');
    const media = await read<Array<Record<string, unknown>>>('media');
    const operations = await read<Array<Record<string, unknown>>>('operations');
    const snapshots = await read<Array<Record<string, unknown>>>('snapshots');
    database.close();
    return {
      project: project ? {
        revision: project.revision,
        draftCandidateByTurn: project.draftCandidateByTurn,
        acceptedByTurn: project.acceptedByTurn,
        initialResultSnapshotId: project.initialResultSnapshotId,
        latestResultSnapshotId: project.latestResultSnapshotId,
        tombstonedAt: project.tombstonedAt,
      } : null,
      media: media.map((candidate) => ({
        id: candidate.id,
        purpose: candidate.purpose,
        turnId: candidate.turnId,
        byteSize: candidate.byteSize,
        sha256: candidate.sha256,
        mimeType: candidate.mimeType,
        endReason: candidate.endReason,
        probe: candidate.probe,
        blobSize: (candidate.blob as Blob | undefined)?.size ?? null,
      })),
      operations: operations.map((operation) => ({
        id: operation.id,
        kind: operation.kind,
        state: operation.state,
        turnId: operation.turnId,
        projectRevision: operation.projectRevision,
        snapshotId: operation.snapshotId,
        navigationIntent: operation.navigationIntent,
        navigationCompleted: operation.navigationCompleted,
        sha256: operation.sha256,
      })),
      snapshots: snapshots.map((snapshot) => ({
        id: snapshot.id,
        projectRevision: snapshot.projectRevision,
        contentSha256: snapshot.contentSha256,
        authorization: snapshot.authorization,
        takes: snapshot.takes,
      })),
    };
  });
}

test('reconciles a lost save acknowledgement with the original operation before accepting the candidate', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  await installStoreFailure(page, 'lost-acknowledgement');

  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
  await expect(page.locator('.record-panel .notice')).toContainText('The save outcome is unknown. Check this same operation before trying another recording.', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Check saved status', exact: true })).toBeEnabled();
  const unknownTrace = await storeFailureTrace(page);
  expect(unknownTrace.saveCalls).toBe(1);
  expect(unknownTrace.lookupCalls).toBe(1);
  expect(unknownTrace.operationIds).toHaveLength(1);

  await page.getByRole('button', { name: 'Check saved status', exact: true }).click();
  const stored = await waitForSavedCandidate(page, 'A');
  const resolvedTrace = await storeFailureTrace(page);
  expect(resolvedTrace.saveCalls).toBe(1);
  expect(resolvedTrace.lookupCalls).toBe(2);
  expect(resolvedTrace.operationIds).toEqual([unknownTrace.operationIds[0]]);
  const database = await readIndexedDb(page);
  const journalEntry = database.operations.find((operation) => operation.id === unknownTrace.operationIds[0]);
  expect(journalEntry?.state).toBe('committed');
  expect(journalEntry?.sha256).toBe(stored?.sha256);
  await writeFile(path.join(evidenceDirectory, 'lost-save-ack-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    scenario: 'The mock store committed the Blob but withheld its acknowledgement; first status lookup reported pending; explicit check read the committed receipt.',
    physicalMicrophone: false,
    nativeApiEvidence: await evidenceCounters(page),
    trace: resolvedTrace,
    journalEntry,
    savedCandidate: stored,
  }, null, 2), 'utf8');
});

test('keeps an accepted take intact after a known save failure and retries the exact captured Blob', async ({ page, browser }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await recordCurrentWindow(page, 'A');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/turn=sintel-turn-2/);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(page).toHaveURL(/turn=sintel-turn-1/);
  const beforeFailure = await readIndexedDb(page);
  const acceptedBefore = (beforeFailure.project?.acceptedByTurn as Record<string, string>)['sintel-turn-1'];
  expect(acceptedBefore).toBeTruthy();

  await installNextOperationWriteFailure(page);
  await traceNextNativeBlobDigest(page);
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(2);
  await expect(page.locator('.record-panel .notice')).toContainText('The candidate could not be saved. The current recording and previously accepted take remain available here.', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeEnabled();
  const recoveryToast = page.locator('.recovery-toast');
  await expect(recoveryToast).toBeVisible();
  expect(await recoveryToast.getByRole('button').count()).toBe(0);
  const toastStyle = await recoveryToast.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const icon = element.querySelector('svg');
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
      bottom: style.bottom,
      width: bounds.width,
      padding: style.padding,
      boxShadow: style.boxShadow,
      iconColor: icon ? getComputedStyle(icon).color : null,
      titleFont: getComputedStyle(element.querySelector('.recovery-toast__title')!).font,
      bodyFont: getComputedStyle(element.querySelector('.recovery-toast__body')!).font,
    };
  });
  expect(toastStyle.background).toBe('rgb(32, 32, 32)');
  expect(toastStyle.borderRadius).toBe('10px');
  expect(toastStyle.bottom).toBe('16px');
  expect(toastStyle.width).toBeLessThanOrEqual(520);
  expect(toastStyle.padding).toBe('14px 16px');
  expect(toastStyle.iconColor).toBe('rgb(255, 156, 159)');
  await page.screenshot({ path: path.join(evidenceDirectory, 'known-save-failure-recovery-toast.png') });
  const failedTrace = await page.evaluate(() => (window as unknown as Window & { __operationWriteFailure: { calls: number; stores: string[] } }).__operationWriteFailure);
  expect(failedTrace.calls).toBe(1);
  expect(failedTrace.stores).toContain('operations');
  await page.evaluate(() => (window as unknown as Window & { __restoreOperationWriteFailure: () => void }).__restoreOperationWriteFailure());
  const focusBeforeExpiry = await page.evaluate(() => ({
    recoveryFocused: document.activeElement?.matches('[data-recovery-action="retry-save"]') ?? false,
    scrollY: window.scrollY,
  }));
  expect(focusBeforeExpiry.recoveryFocused).toBe(true);
  await expect(recoveryToast).toHaveCount(0, { timeout: 10_000 });
  expect(await page.locator('[data-recovery-action="retry-save"]').evaluate((element) => element === document.activeElement)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(focusBeforeExpiry.scrollY);
  const afterFailure = await readIndexedDb(page);
  expect((afterFailure.project?.acceptedByTurn as Record<string, string>)['sintel-turn-1']).toBe(acceptedBefore);
  expect(afterFailure.media.filter((stored) => stored.purpose === 'recording' && stored.id !== acceptedBefore)).toHaveLength(0);

  await page.getByRole('button', { name: 'Retry save', exact: true }).click();
  const saved = await waitForSavedCandidate(page, 'A');
  await expect.poll(async () => page.evaluate(() => (window as unknown as Window & {
    __nativeBlobDigestTrace: { captures: number; byteSize: number; mimeType: string; sha256: string | null };
  }).__nativeBlobDigestTrace.sha256), { timeout: 5_000 }).toBe(saved?.sha256);
  const recoveredTrace = await page.evaluate(() => (window as unknown as Window & {
    __nativeBlobDigestTrace: { captures: number; byteSize: number; mimeType: string; sha256: string | null };
  }).__nativeBlobDigestTrace);
  expect(recoveredTrace.captures).toBe(1);
  expect(recoveredTrace.byteSize).toBe(saved?.blobSize);
  expect(recoveredTrace.mimeType).toBe(saved?.mimeType);
  const afterRetry = await readIndexedDb(page);
  expect((afterRetry.project?.acceptedByTurn as Record<string, string>)['sintel-turn-1']).toBe(acceptedBefore);
  expect((afterRetry.project?.draftCandidateByTurn as Record<string, string>)['sintel-turn-1']).toBe(saved?.id);
  await writeFile(path.join(evidenceDirectory, 'known-save-failure-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    scenario: 'First accepted take preserved after a known pre-write quota failure. Retry saved the exact captured Blob without re-recording.',
    physicalMicrophone: false,
    nativeApiEvidence: await evidenceCounters(page),
    acceptedCandidateBeforeFailure: acceptedBefore,
    failedAttempt: failedTrace,
    recoveryToast: toastStyle,
    capturedBlobBeforePersistence: recoveredTrace,
    retry: recoveredTrace,
    finalProject: afterRetry.project,
    retriedCandidate: saved,
  }, null, 2), 'utf8');
});

test('failed guarded Exit keeps the original intent, focuses Retry, and restores Exit after retry and boundary return', async ({ page, browser }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  const candidate = await (async () => {
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
    await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
    await recordCurrentWindow(page, 'A');
    return waitForSavedCandidate(page, 'A');
  })();
  await installAcceptanceFailure(page);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  const guard = page.getByRole('dialog');
  await expect(guard).toBeVisible();
  await guard.getByRole('button', { name: 'Save and leave', exact: true }).click();
  await expect(guard.getByRole('button', { name: 'Retry accept and leave', exact: true })).toBeVisible();
  const retry = guard.locator('[data-recovery-action="retry-guard"]');
  await expect(retry).toBeFocused();
  const failed = await readIndexedDb(page);
  expect(failed.project?.draftCandidateByTurn).toMatchObject({ 'sintel-turn-1': candidate?.id });
  expect(Object.values(failed.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
  const acceptanceFailure = await page.evaluate(() => (window as unknown as Window & { __acceptFailureTrace: { calls: number; stores: string[]; restore: () => void } }).__acceptFailureTrace);
  expect(acceptanceFailure.calls).toBe(1);
  expect(acceptanceFailure.stores).toContain('operations');
  await page.evaluate(() => (window as unknown as Window & { __acceptFailureTrace: { restore: () => void } }).__acceptFailureTrace.restore());
  await page.screenshot({ path: path.join(evidenceDirectory, 'guarded-exit-known-acceptance-failure.png') });

  const beforeToastExpiry = await page.evaluate(() => ({
    focusedRetry: document.activeElement?.matches('[data-recovery-action="retry-guard"]') ?? false,
    scrollY: window.scrollY,
  }));
  expect(beforeToastExpiry.focusedRetry).toBe(true);
  await expect(page.locator('.recovery-toast')).toHaveCount(0, { timeout: 10_000 });
  await expect(retry).toBeFocused();
  const retryFocusedAfterToastExpiry = await retry.evaluate((element) => element === document.activeElement);
  expect(retryFocusedAfterToastExpiry).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeToastExpiry.scrollY);
  await retry.click();
  await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
  await page.screenshot({ path: path.join(evidenceDirectory, 'guarded-exit-success-boundary.png'), fullPage: true });
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=exit/);
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  const accepted = await readIndexedDb(page);
  expect(accepted.project?.acceptedByTurn).toMatchObject({ 'sintel-turn-1': candidate?.id });
  const successfulAcceptOperations = accepted.operations.filter((operation) => operation.kind === 'accept-candidate' && operation.state === 'committed');
  expect(successfulAcceptOperations).toHaveLength(1);
  await writeFile(path.join(evidenceDirectory, 'guarded-exit-retry-focus-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    nativeInput: 'Chrome browser fake audio input; not a physical microphone',
    candidateId: candidate?.id,
    acceptedBeforeRetry: failed.project?.acceptedByTurn,
    acceptedAfterRetry: accepted.project?.acceptedByTurn,
    failureTrace: acceptanceFailure,
    successfulAcceptOperations,
    focusBeforeToastExpiry: beforeToastExpiry,
    retryFocusedAfterToastExpiry,
    boundaryReturnFocusedExit: await page.locator('[data-logical-focus="exit"]').evaluate((element) => element === document.activeElement),
  }, null, 2), 'utf8');
});

async function waitForSavedCandidate(page: Page, layout: 'A' | 'B') {
  const controls = page.locator(layout === 'A' ? '.performance-actions' : '.studio-controls');
  await expect(controls).toBeVisible();
  await expect(controls.locator('#take')).toBeEnabled({ timeout: 15_000 });
  await expect(page.locator('#next')).toBeEnabled();
  await expect(page.locator('.waveform-take')).toHaveCount(1);
  const database = await readIndexedDb(page);
  const currentTurnId = new URL(page.url()).searchParams.get('turn') ?? 'sintel-turn-1';
  const draftByTurn = database.project?.draftCandidateByTurn as Record<string, string> | undefined;
  const current = database.media.find((candidate) => candidate.id === draftByTurn?.[currentTurnId]);
  expect(current?.blobSize).toBeGreaterThan(0);
  expect(current?.blobSize).toBe(current?.byteSize);
  expect(current?.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect((current?.probe as { byteSize?: number }).byteSize).toBe(current?.blobSize);
  return current;
}

async function recordCurrentWindow(page: Page, layout: 'A' | 'B') {
  const recordButton = page.getByRole('button', { name: 'Record', exact: true });
  await expect(recordButton).toBeEnabled();
  await recordButton.click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBeGreaterThan(0);
  const startedAt = await page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime);
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 5_000 })
    .toBeGreaterThan(startedAt);
  await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
  await waitForSavedCandidate(page, layout);
}

test.beforeAll(async () => mkdir(evidenceDirectory, { recursive: true }));

test('Exit returns through the guarded Projects boundary and restores focus to the logical Exit control', async ({ page }) => {
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\?/);
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=exit/);
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  await page.screenshot({ path: path.join(evidenceDirectory, 'exit-boundary-return-focus.png') });
});

test('delayed source playback keeps the recorder idle until the prepared window actually starts', async ({ page, browser }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  const preparedWindow = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const project = await new Promise<{ windows: Array<{ id: string; startMs: number; endMs: number }> }>((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const selected = project.windows.find((window) => window.id === 'sintel-turn-1');
    if (!selected) throw new Error('Prepared turn 1 is missing its source window.');
    return selected;
  });
  await page.locator('video').evaluate((element) => {
    const video = element as HTMLVideoElement;
    const trace = {
      requestedAt: null as number | null,
      nativePlayAt: null as number | null,
      playingAt: null as number | null,
      playingVideoTime: null as number | null,
      recorderStartAt: null as number | null,
      recorderStartVideoTime: null as number | null,
      recorderStopAt: null as number | null,
      recorderStopVideoTime: null as number | null,
    };
    (window as Window & { __delayedCaptureTrace?: typeof trace }).__delayedCaptureTrace = trace;
    const nativePlay = video.play.bind(video);
    Object.defineProperty(video, 'play', {
      configurable: true,
      value: () => {
        trace.requestedAt = performance.now();
        return new Promise<void>((resolve, reject) => {
          window.setTimeout(() => {
            trace.nativePlayAt = performance.now();
            nativePlay().then(resolve, reject);
          }, 1_200);
        });
      },
    });
    video.addEventListener('playing', () => {
      trace.playingAt = performance.now();
      trace.playingVideoTime = video.currentTime;
    }, { once: true });
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (...args: Parameters<MediaRecorder['start']>) {
      trace.recorderStartAt = performance.now();
      trace.recorderStartVideoTime = video.currentTime;
      return start.apply(this, args);
    };
    const stop = MediaRecorder.prototype.stop;
    MediaRecorder.prototype.stop = function (...args: Parameters<MediaRecorder['stop']>) {
      trace.recorderStopAt = performance.now();
      trace.recorderStopVideoTime = video.currentTime;
      return stop.apply(this, args);
    };
  });

  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preparing recording…', exact: true })).toBeVisible();
  await page.waitForTimeout(350);
  const beforeRealPlayback = await page.evaluate(() => {
    const trace = (window as unknown as Window & { __delayedCaptureTrace: { recorderStartAt: number | null; requestedAt: number | null } }).__delayedCaptureTrace;
    return { ...trace, videoTime: document.querySelector('video')?.currentTime ?? null };
  });
  expect(beforeRealPlayback.requestedAt).not.toBeNull();
  expect(beforeRealPlayback.recorderStartAt).toBeNull();
  expect(beforeRealPlayback.videoTime).not.toBeNull();
  expect(Math.abs((beforeRealPlayback.videoTime ?? 0) - preparedWindow.startMs / 1000)).toBeLessThanOrEqual(0.05);
  await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-preparing.png') });

  const candidate = await waitForSavedCandidate(page, 'A');
  const trace = await page.evaluate(() => (window as unknown as Window & { __delayedCaptureTrace: Record<string, number | null> }).__delayedCaptureTrace);
  const expectedDuration = (preparedWindow.endMs - preparedWindow.startMs) / 1000;
  expect(trace.nativePlayAt).toBeGreaterThan(trace.requestedAt ?? 0);
  expect((trace.nativePlayAt ?? 0) - (trace.requestedAt ?? 0)).toBeGreaterThanOrEqual(1_150);
  expect(trace.playingAt).toBeGreaterThanOrEqual(trace.nativePlayAt ?? 0);
  expect(trace.recorderStartAt).toBeGreaterThanOrEqual(trace.playingAt ?? 0);
  expect(Math.abs((trace.recorderStartVideoTime ?? 0) - (trace.playingVideoTime ?? 0))).toBeLessThanOrEqual(0.05);
  expect((trace.playingVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.startMs / 1000 - 0.05);
  expect((trace.recorderStopVideoTime ?? 0)).toBeGreaterThanOrEqual(preparedWindow.endMs / 1000 - 0.15);
  expect(Math.abs(((trace.recorderStopVideoTime ?? 0) - (trace.recorderStartVideoTime ?? 0)) - expectedDuration)).toBeLessThanOrEqual(0.2);
  expect(candidate?.blobSize).toBeGreaterThan(0);
  expect(candidate?.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect((candidate?.probe as { decodedFrames?: number }).decodedFrames).toBeGreaterThan(0);
  expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 1, recorderStarts: 1 });
  await page.screenshot({ path: path.join(evidenceDirectory, 'delayed-source-candidate.png') });
  await writeFile(path.join(evidenceDirectory, 'delayed-source-native-capture.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    input: 'Chrome browser fake audio input; not a physical microphone',
    sourcePlayDelayMs: 1_200,
    preparedWindow,
    expectedDuration,
    beforeRealPlayback,
    nativeTrace: trace,
    persistedCandidate: candidate,
    apiCounters: await evidenceCounters(page),
  }, null, 2), 'utf8');
});

for (const layout of ['A', 'B'] as const) {
  test(`Layout ${layout} records real browser fake input, recovers the candidate, and completes the accepted snapshot`, async ({ page, browser }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await instrumentNativeMedia(page);
    await page.goto(`/projects/sintel-prepared/record?layout=${layout}&locale=en`);
    if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
    else {
      await expect(page.locator('.record-header h1')).toBeVisible();
      await expect(page.locator('#dots')).toBeVisible();
      await expect(page.locator('.record-header__line-count')).toHaveText('Line 1 / 3');
    }
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
    await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('button', { name: 'Exit', exact: true })).toBeInViewport();
    if (layout === 'A') {
      await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeInViewport();
      await expect(page.getByLabel('Current line')).toBeInViewport();
    } else {
      await expect(page.locator('.record-header__line-count')).toBeInViewport();
      await expect(page.getByLabel('Current line')).toBeInViewport();
    }
    const dialogue = page.locator('#dialogue');
    const englishDialogue = await dialogue.textContent();
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    const russianDialogue = await dialogue.textContent();
    expect(russianDialogue).not.toBe(englishDialogue);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-russian.png`) });
    await setRecordLocale(page, 'en');
    await expect(dialogue).toHaveText(englishDialogue ?? '');
    await expect(page.locator('.record-header .locale-control')).toHaveCount(0);
    await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
    await expect(page.locator('#previous .lucide-chevron-left')).toHaveCount(1);
    const initialButton = page.getByRole('button', { name: 'Record', exact: true });
    await expect(initialButton).toBeEnabled();
    expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 0, recorderStarts: 0 });
    const headerEvidence = await page.evaluate(() => {
      const inspect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          text: element.textContent?.trim() ?? '',
          x: rect.x, y: rect.y, width: rect.width, height: rect.height,
          color: style.color, opacity: style.opacity, visibility: style.visibility, display: style.display,
        };
      };
      return {
        exit: inspect('.exit-link'), title: inspect('.record-header h1'),
        locale: inspect('.locale-control'), dots: inspect('#dots'),
        mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
        dialogueFont: getComputedStyle(document.querySelector('#dialogue')!).fontFamily,
        scrollY: window.scrollY,
      };
    });
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-ready.png`) });

    const viewport = await page.locator('.media-viewport').boundingBox();
    const wave = await page.locator('.waveform-row').boundingBox();
    const controls = await page.locator('.performance').boundingBox();
    expect(viewport).not.toBeNull();
    expect(wave).not.toBeNull();
    expect(controls).not.toBeNull();
    if (viewport) {
      const center = viewport.x + viewport.width / 2;
      const visibleCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
      expect(Math.abs(center - visibleCenter)).toBeLessThanOrEqual(1);
      const exit = await page.getByRole('button', { name: 'Exit', exact: true }).boundingBox();
      expect(Math.abs((exit?.x ?? -999) - viewport.x)).toBeLessThanOrEqual(1);
    }
    if (viewport && layout === 'A') {
      const panel = await page.locator('.performance').boundingBox();
      expect(panel?.width).toBe(272);
      expect(panel!.x - (viewport.x + viewport.width)).toBeGreaterThanOrEqual(23);
      expect(viewport.x).toBeGreaterThanOrEqual(32);
    }
    if (wave && controls && layout === 'B') expect(controls.y - (wave.y + wave.height)).toBeGreaterThanOrEqual(23);
    const expectPanelAligned = async () => {
      if (layout !== 'A') return;
      const bounds = await page.evaluate(() => ({
        mediaY: document.querySelector('.media-viewport')!.getBoundingClientRect().y,
        panelY: document.querySelector('.performance')!.getBoundingClientRect().y,
      }));
      expect(Math.abs(bounds.panelY - bounds.mediaY)).toBeLessThanOrEqual(1);
    };
    await expectPanelAligned();

    await page.getByRole('button', { name: 'Original', exact: true }).click();
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.1);
    await expect.poll(() => page.locator('#scene').evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(0);

    await page.getByRole('button', { name: 'Record', exact: true }).click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
    await expectPanelAligned();
    const recordingNotice = page.getByText('Recording the full prepared window. It will stop automatically.');
    await expect(recordingNotice).toContainText('Recording the full prepared window. It will stop automatically.');
    await expect(page.getByRole('button', { name: /Countdown|Stop recording|Pause recording/i })).toHaveCount(0);
    await waitForSavedCandidate(page, layout);
    await expectPanelAligned();
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-candidate.png`) });

    const audio = page.locator('audio');
    await page.getByRole('button', { name: 'Your take', exact: true }).click();
    await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThan(0.05);
    expect(await audio.getAttribute('src')).toContain('blob:');

    if (layout === 'A') {
      await page.getByRole('button', { name: 'Exit', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-candidate-guard.png') });
      await page.getByRole('dialog').getByRole('button', { name: 'Stay here', exact: true }).last().click();
      await expect(page.getByRole('dialog')).toBeHidden();
      const beforeReload = await readIndexedDb(page);
      expect(Object.values(beforeReload.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
      const countersBeforeReload = await evidenceCounters(page);
      await page.reload();
      await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeEnabled();
      expect(await evidenceCounters(page)).toEqual(countersBeforeReload);
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-reloaded-candidate.png') });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    if (layout === 'A') await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
    else {
      await expect(page.locator('.record-header__line-count')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();
      await expect(page.getByLabel('Current line')).toBeVisible();
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(horizontalOverflow).toBe(false);
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const targetSize = await page.locator('#record').boundingBox();
    expect(targetSize?.height).toBeGreaterThanOrEqual(48);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-russian.png`) });
    await setRecordLocale(page, 'en');
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-ready.png`) });
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-2`));
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-2-russian.png`) });
    await setRecordLocale(page, 'en');
    await recordCurrentWindow(page, layout);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-3`));
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-3-russian.png`) });
    await setRecordLocale(page, 'en');
    await recordCurrentWindow(page, layout);

    const media = await readIndexedDb(page);
    expect(media.media.filter((candidate) => candidate.purpose === 'recording')).toHaveLength(3);
    expect(Object.values(media.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(2);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-final-candidate.png`) });

    if (layout === 'A') {
      await page.route('**/media/example-dub.mp4', (route) => route.fulfill({ status: 503, body: 'fixture unavailable for the first attempts' }));
      await page.setViewportSize({ width: 390, height: 667 });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Next', exact: true }).evaluate((button: HTMLButtonElement) => button.click());
      await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
      await expect(page.getByRole('heading', { name: 'Your result' })).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('H1');
      await page.setViewportSize({ width: 1440, height: 900 });
    } else {
      await page.getByRole('button', { name: 'Exit', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Save and leave', exact: true }).click();
      await expect(page).toHaveURL(/\/projects\?returnProject=sintel-prepared&returnLayout=B&returnFocus=exit/);
      await page.getByTestId('return-to-saved-record').click();
      await expect(page).toHaveURL(/\/projects\/sintel-prepared\/record\?layout=B&turn=sintel-turn-3/);
      await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
    }

    let finalDatabase = await readIndexedDb(page);
    expect(finalDatabase.project?.initialResultSnapshotId).toBeTruthy();
    expect(finalDatabase.snapshots).toHaveLength(1);
    const snapshot = finalDatabase.snapshots[0] as { takes: unknown[]; authorization: string; contentSha256: string };
    expect(snapshot.authorization).toBe('initial-completion');
    expect(snapshot.takes).toHaveLength(3);
    expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);

    if (layout === 'B') {
      const snapshotId = String(finalDatabase.project?.latestResultSnapshotId ?? '');
      expect(snapshotId).toBeTruthy();
      await page.goto(`/projects/sintel-prepared/result?layout=B&snapshot=${encodeURIComponent(snapshotId)}`);
    }
    await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
    await expect(page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' })).toBeVisible();
    await expect(page.locator('.result-header h1')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.locator('.result-header .lucide-log-out').count()).toBe(1);
    expect(await page.locator('.result-workspace__actions button').filter({ hasText: 'Return to recording' }).locator('.lucide-undo-2').count()).toBe(1);

    if (layout === 'A') {
      await expect(page.getByRole('button', { name: 'Retry assembly', exact: true })).toBeVisible();
      await expect(page.getByText('The result sample could not be loaded. Your accepted takes and previous result remain unchanged.')).toBeVisible();
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-fixture-unavailable.png') });
      await page.unroute('**/media/example-dub.mp4');
      await page.getByRole('button', { name: 'Retry assembly', exact: true }).click();
    }

    await expect(page.getByText('Sample ready')).toBeVisible({ timeout: 15_000 });
    const resultVideo = page.getByTestId('result-video');
    await expect(resultVideo).toHaveAttribute('data-source', 'dub');
    await expect(resultVideo).toHaveAttribute('src', /^blob:/);
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.videoWidth > 0)).toBe(true);
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await expect(page.locator('#result-volume')).toHaveValue('0.7');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
    const presentedGenerationId = await resultVideo.getAttribute('data-generation-id');
    expect(presentedGenerationId).toMatch(/^generation:/);
    await resultVideo.evaluate((video: HTMLVideoElement) => video.dispatchEvent(new Event('error')));
    await expect(page.locator('.result-player__error')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reload sample', exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-current-source-error.png`) });
    await page.getByRole('button', { name: 'Reload sample', exact: true }).click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
    await expect(page.locator('.result-player__error')).toHaveCount(0);
    await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
    const sourceErrorRecovery = await resultVideo.evaluate((video: HTMLVideoElement) => ({
      event: 'synthetic-current-media-error', src: video.getAttribute('src'), generationId: video.dataset.generationId,
      retryPlaying: !video.paused, videoWidth: video.videoWidth,
    }));
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-current-source-error.json`), JSON.stringify(sourceErrorRecovery, null, 2), 'utf8');
    await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`) });
    const normalResult = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
      };
      return {
        title: bounds('.result-header h1'),
        exit: bounds('.result-header .exit-link'),
        screen: bounds('.result-player__screen'),
        seek: bounds('.result-player__seek'),
        controls: bounds('.result-player__transport-row'),
      };
    });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
    expect(Math.abs(normalResult.title!.y - (layout === 'A' ? 20 : 27))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.exit!.y - (layout === 'A' ? 20 : 28))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.screen!.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.screen!.width - 920)).toBeLessThanOrEqual(2);
    expect(normalResult.seek!.bottom).toBeLessThanOrEqual(normalResult.controls!.y + 1);
    if (layout === 'A') {
      await setRecordLocale(page, 'ru');
      await expect(page.getByRole('heading', { name: 'Ваш результат' })).toBeVisible();
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png') });
      await setRecordLocale(page, 'en');
      await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => page.locator('.result-header .exit-link').evaluate((element) => getComputedStyle(element).transform)).toBe('none');
    const phoneResult = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
      };
      return {
        screen: bounds('.result-player__screen'),
        exit: bounds('.result-header .exit-link'),
        title: bounds('.result-header h1'),
        seek: bounds('.result-player__seek'),
        controls: bounds('.result-player__transport-row'),
        volume: bounds('.result-player__volume input'),
        source: bounds('.result-player__source-tabs button'),
        sourceBorder: getComputedStyle(document.querySelector('.result-player__source-tabs')!).borderTopWidth,
        sourceBackdrop: getComputedStyle(document.querySelector('.result-player__source-tabs')!).backdropFilter,
        actionMarginTop: getComputedStyle(document.querySelector('.result-workspace__actions')!).marginTop,
        actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), (element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
        }),
      };
    });
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`), fullPage: true });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
    expect(Math.abs(phoneResult.screen!.x - 16)).toBeLessThanOrEqual(1);
    expect(Math.abs(phoneResult.screen!.width - 358)).toBeLessThanOrEqual(1);
    expect(phoneResult.screen!.y).toBe(layout === 'A' ? 136 : 140);
    expect(phoneResult.exit!.y).toBe(12);
    expect(phoneResult.title!.y).toBe(68);
    expect(phoneResult.seek!.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.controls!.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.volume!.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.source!.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.sourceBorder).toBe('0px');
    expect(phoneResult.sourceBackdrop).toBe('none');
    if (layout === 'B') expect(phoneResult.actionMarginTop).toBe('20px');
    expect(phoneResult.actions).toHaveLength(2);
    expect(phoneResult.actions.every((action) => action.height >= 48)).toBe(true);
    expect(phoneResult.actions[1]!.y).toBeGreaterThan(phoneResult.actions[0]!.y);
    await page.setViewportSize({ width: 1280, height: 600 });
    const shortPreflight = await page.evaluate(() => {
      const inspect = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
          scrollHeight: element.scrollHeight, display: style.display, flex: style.flex,
          minWidth: style.minWidth, minHeight: style.minHeight, padding: style.padding,
          margin: style.margin, gap: style.gap, overflow: style.overflow,
        };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight, scrollY },
        documentHeight: document.documentElement.scrollHeight,
        bodyHeight: document.body.scrollHeight,
        boxes: Object.fromEntries(['html', 'body', '#root', '#product'].map((selector) => {
          const element = document.querySelector(selector);
          if (!element) return [selector, null];
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return [selector, {
            x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom,
            scrollHeight: element.scrollHeight, padding: style.padding, margin: style.margin,
            minHeight: style.minHeight, position: style.position, overflow: style.overflow,
          }];
        })),
        overflowNodes: Array.from(document.querySelectorAll('body *')).map((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            tag: element.tagName.toLowerCase(), id: element.id, className: typeof element.className === 'string' ? element.className : '',
            y: rect.y, bottom: rect.bottom, height: rect.height, position: style.position,
            marginBottom: style.marginBottom, paddingBottom: style.paddingBottom, display: style.display,
          };
        }).filter((element) => element.display !== 'none' && element.bottom > innerHeight + 1)
          .sort((a, b) => b.bottom - a.bottom).slice(0, 12),
        elements: Object.fromEntries([
          '.result-workspace', '.result-header', '.result-player', '.result-player__screen',
          '.result-workspace__details', '.result-workspace__status', '.result-workspace__actions',
        ].map((selector) => [selector, inspect(selector)])),
      };
    });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.json`), JSON.stringify(shortPreflight, null, 2), 'utf8');
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-vp01-probe.png`) });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    const shortResult = await page.evaluate(() => {
      const bounds = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
      };
      return {
        documentHeight: document.documentElement.scrollHeight,
        title: bounds('.result-header h1'),
        exit: bounds('.result-header .exit-link'),
        player: bounds('.result-player'),
        screen: bounds('.result-player__screen'),
        rail: bounds('.result-player__transport'),
        seek: bounds('.result-player__seek'),
        controls: bounds('.result-player__transport-row'),
        details: bounds('.result-workspace__details'),
        actions: bounds('.result-workspace__actions'),
        statusFontSize: getComputedStyle(document.querySelector('.result-workspace__details p')!).fontSize,
        statusLineHeight: getComputedStyle(document.querySelector('.result-workspace__details p')!).lineHeight,
        workspacePaddingBottom: getComputedStyle(document.querySelector('.result-workspace')!).paddingBottom,
        actionsFlex: getComputedStyle(document.querySelector('.result-workspace__actions')!).flex,
      };
    });
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`) });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
    expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
    expect(shortResult.title?.y).toBe(16);
    expect(shortResult.exit?.y).toBe(16);
    expect(shortResult.title!.bottom).toBeLessThanOrEqual(600);
    const shortTarget = layout === 'A' ? { y: 88, width: 548 } : { y: 80, width: 562 };
    expect(Math.abs(shortResult.screen!.y - shortTarget.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(shortResult.screen!.width - shortTarget.width)).toBeLessThanOrEqual(4);
    expect(shortResult.seek!.bottom).toBeLessThanOrEqual(shortResult.controls!.y + 1);
    expect(shortResult.actions!.height).toBeGreaterThanOrEqual(88);
    expect(shortResult.actions!.bottom).toBeLessThanOrEqual(600);
    expect(shortResult.actionsFlex).toBe('0 1 auto');
    if (layout === 'A') {
      expect(shortResult.statusFontSize).toBe('14px');
      expect(shortResult.statusLineHeight).toBe('20px');
      expect(shortResult.workspacePaddingBottom).toBe('8px');
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    await resultVideo.evaluate((video: HTMLVideoElement) => {
      video.pause();
      video.currentTime = Math.max(0, video.duration - 0.2);
    });
    await page.locator('#result-play').click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.ended), { timeout: 5_000 }).toBe(true);
    const replayButton = page.getByRole('button', { name: 'Replay', exact: true });
    await expect(replayButton).toHaveCount(1);
    await expect(replayButton).toHaveAttribute('id', 'result-play');
    await replayButton.click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.05);
    await page.locator('#result-play').click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);

    const originalSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'Original' });
    const dubSource = page.locator('.result-player__source-tabs button').filter({ hasText: 'My dub' });
    await expect(page.locator('.result-player__source-tabs')).toHaveAttribute('role', 'group');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
    await originalSource.focus();
    await page.keyboard.press('Space');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
    await expect(resultVideo).toHaveAttribute('data-source', 'original');
    await page.keyboard.press('ArrowRight');
    await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
    await expect(dubSource).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
    await expect(originalSource).toBeFocused();
    await page.keyboard.press('End');
    await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('Home');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(0.2);
    const switchTime = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
    await dubSource.click();
    await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
    await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId ?? '');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.volume)).toBe(0.7);
    await expect.poll(async () => Math.abs(await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime) - switchTime))
      .toBeLessThan(1.5);

    const resultSeek = page.locator('.result-player__seek');
    await resultSeek.focus();
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await page.keyboard.up('ArrowRight');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
    const afterKeyboardRelease = await resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime);
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);

    await resultVideo.evaluate((video: HTMLVideoElement) => video.pause());
    await resultSeek.dispatchEvent('pointerdown');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await resultSeek.dispatchEvent('pointercancel');
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
    await resultSeek.dispatchEvent('pointerdown');
    await resultSeek.evaluate((input: HTMLInputElement) => input.blur());
    await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);

    const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
    await originalSource.click();
    await expect(resultVideo).toHaveAttribute('data-source', 'original');

    if (layout === 'A') {
      await installResultPlayFaults(page);
      const firstOriginalElement = await resultVideo.evaluateHandle((video) => video);
      await armResultPlayFault(page, 'late-abort');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.waitForTimeout(80);
      await dubSource.click();
      await expect(resultVideo).toHaveAttribute('data-source', 'dub');
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await expect.poll(() => page.evaluate(() => {
        const trace = (window as Window & { __resultPlayTrace?: ResultPlayFaultEntry[] }).__resultPlayTrace ?? [];
        return trace.some((entry) => entry.fault === 'late-abort' && entry.rejectedAt !== null);
      })).toBe(true);
      expect(await firstOriginalElement.evaluate((video) => video.isConnected)).toBe(false);
      await expect(page.locator('.result-player__error')).toHaveCount(0);
      await expect(page.locator('.result-player__transport-row button[aria-label="Pause"]')).toBeEnabled();

      await originalSource.click();
      await expect(resultVideo).toHaveAttribute('data-source', 'original');
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);

      const rapidSwitchOriginalElement = await resultVideo.evaluateHandle((video) => video);
      await armResultPlayFault(page, 'late-abort');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.waitForTimeout(60);
      await dubSource.click();
      await expect(resultVideo).toHaveAttribute('data-source', 'dub');
      await originalSource.click();
      await expect(resultVideo).toHaveAttribute('data-source', 'original');
      await expect.poll(() => page.evaluate(() => {
        const trace = (window as Window & { __resultPlayTrace?: ResultPlayFaultEntry[] }).__resultPlayTrace ?? [];
        return trace.filter((entry) => entry.fault === 'late-abort' && entry.rejectedAt !== null).length;
      })).toBe(2);
      expect(await rapidSwitchOriginalElement.evaluate((video) => video.isConnected)).toBe(false);
      await expect(page.locator('.result-player__error')).toHaveCount(0);
      await expect(page.locator('.result-player__transport-row button[aria-label="Play"], .result-player__transport-row button[aria-label="Pause"]')).toBeEnabled();

      const currentSource = resultVideo;
      const isPaused = await currentSource.evaluate((video: HTMLVideoElement) => video.paused);
      if (!isPaused) await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect.poll(() => currentSource.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
      await armResultPlayFault(page, 'late-abort');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => currentSource.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect.poll(() => currentSource.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
      await expect.poll(() => page.evaluate(() => {
        const trace = (window as Window & { __resultPlayTrace?: ResultPlayFaultEntry[] }).__resultPlayTrace ?? [];
        return trace.filter((entry) => entry.fault === 'late-abort' && entry.rejectedAt !== null).length;
      })).toBe(3);
      await expect(page.locator('.result-player__error')).toHaveCount(0);
      await expect(page.locator('.result-player__transport-row button[aria-label="Play"]')).toBeEnabled();

      await armResultPlayFault(page, 'not-supported');
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(page.locator('.result-player__error')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reload sample', exact: true })).toBeVisible();
      await expect(page.locator('.result-player__transport-row button[aria-label="Play"]')).toBeDisabled();
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-current-play-failure.png') });
      await page.getByRole('button', { name: 'Reload sample', exact: true }).click();
      await expect(page.locator('.result-player__error')).toHaveCount(0);
      await expect.poll(() => resultVideo.evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.screenshot({ path: path.join(evidenceDirectory, 'layout-a-result-playback-recovered.png') });
      const raceTrace = await page.evaluate(() => (window as Window & { __resultPlayTrace?: ResultPlayFaultEntry[] }).__resultPlayTrace ?? []);
      expect(raceTrace).toHaveLength(4);
      expect(raceTrace.slice(0, 3).every((entry) => entry.fault === 'late-abort' && entry.rejectedAt !== null)).toBe(true);
      expect(raceTrace.slice(0, 2).every((entry) => entry.connectedAtRejection === false)).toBe(true);
      expect(raceTrace[2]?.connectedAtRejection).toBe(true);
      expect(raceTrace[3]?.fault).toBe('not-supported');
      expect(raceTrace[3]?.source).toBe('original');
      await writeFile(path.join(evidenceDirectory, 'layout-a-result-playback-race-evidence.json'), JSON.stringify({
        date: new Date().toISOString(),
        browser: 'Chrome ' + browser.version(),
        sourceUrl: await resultVideo.getAttribute('src'),
        requestTrace: raceTrace,
        checks: ['delayed stale rejection after Original-to-My-dub switch', 'A-to-B-to-A rapid switch with a stale Original request', 'same-source pause cancels a late AbortError without disabling playback', 'current NotSupportedError remains visible and Reload sample recovers'],
      }, null, 2), 'utf8');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download My dub', exact: true }).click(),
    ]);
    const downloadPath = path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-download-example-dub.mp4`);
    const downloadFailure = await download.failure();
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-download-event.json`), JSON.stringify({
      filename: download.suggestedFilename(),
      url: download.url(),
      failure: downloadFailure,
    }, null, 2), 'utf8');
    expect(downloadFailure).toBeNull();
    await download.saveAs(downloadPath);
    expect(download.suggestedFilename()).toBe('example-dub.mp4');
    const downloadedBytes = await readFile(downloadPath);
    const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
    const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
    expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);

    const resultDatabase = await page.evaluate(async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('dubbed-core-local-v1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const read = <T>(name: string) => new Promise<T>((resolve, reject) => {
        const request = database.transaction(name, 'readonly').objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      });
      const jobs = await read<Array<{ id: string; snapshotId: string; status: string; productRendered: boolean; assembledFromAcceptedTakes: boolean }>>('resultJobs');
      const resultMedia = await read<Array<{ id: string; filename: string; byteSize: number; sha256: string; blob: Blob }>>('resultMedia');
      database.close();
      return {
        jobs: jobs.map(({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes }) => ({ id, snapshotId, status, productRendered, assembledFromAcceptedTakes })),
        media: resultMedia.map(({ id, filename, byteSize, sha256, blob }) => ({ id, filename, byteSize, sha256, blobSize: blob.size })),
      };
    });
    expect(resultDatabase.jobs).toContainEqual(expect.objectContaining({
      id: currentGenerationBeforeDownload,
      status: 'ready',
      productRendered: false,
      assembledFromAcceptedTakes: false,
    }));
    expect(resultDatabase.media).toContainEqual(expect.objectContaining({
      id: currentGenerationBeforeDownload,
      filename: 'example-dub.mp4',
      byteSize: expectedFixtureBytes.byteLength,
      blobSize: expectedFixtureBytes.byteLength,
      sha256: downloadedSha256,
    }));

    await page.setViewportSize({ width: 390, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.getByRole('button', { name: 'Download My dub', exact: true }).boundingBox().then((box) => box?.height ?? 0)).toBeGreaterThanOrEqual(48);
    const mobileTargets = await page.evaluate(() => Array.from(document.querySelectorAll('.result-player__seek, .result-player__volume input'), (element) => {
      const bounds = element.getBoundingClientRect();
      return { label: element.getAttribute('aria-label'), height: bounds.height, width: bounds.width };
    }));
    expect(mobileTargets).toHaveLength(2);
    expect(mobileTargets.every((target) => target.height >= 48)).toBe(true);
    await expect(page.locator('.result-player__seek')).toBeEnabled();
    await expect(page.locator('.result-player__volume input')).toBeEnabled();
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-result-ready.png`), fullPage: true });

    finalDatabase = await readIndexedDb(page);
    const nativeEvidence = await evidenceCounters(page);
    expect(nativeEvidence.getUserMediaCalls).toBeGreaterThan(0);
    expect(nativeEvidence.recorderStarts).toBeGreaterThan(0);
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-browser-evidence.json`), JSON.stringify({
      date: new Date().toISOString(),
      layout,
      browser: `Chrome ${browser.version()}`,
      input: 'Chrome browser fake audio input; not a physical microphone',
      nativeApiEvidence: nativeEvidence,
      initialHeader: headerEvidence,
      project: finalDatabase.project,
      captures: finalDatabase.media.filter((candidate) => candidate.purpose === 'recording'),
      operations: finalDatabase.operations,
      snapshots: finalDatabase.snapshots,
      result: {
        generationId: currentGenerationBeforeDownload,
        currentComparisonAtDownload: 'original',
        downloadFilename: download.suggestedFilename(),
        downloadSha256: downloadedSha256,
        exactFixtureBytesMatch: downloadedBytes.equals(expectedFixtureBytes),
        fixtureProvenance: 'Fixed illustrative sample; productRendered=false; assembledFromAcceptedTakes=false',
        jobs: resultDatabase.jobs,
        media: resultDatabase.media,
      },
      assertions: ['No getUserMedia or MediaRecorder before explicit Record', 'video moved during each native recording', 'captured Blob persisted and hashed', 'accepted snapshot includes exact three recorded candidates', 'native controls remained locked during capture', 'Result generation consumed the authorized immutable snapshot', 'player served exact fixture bytes and remained paused on entry', 'source switch preserved playhead and play intent', 'download from Original preview pinned the presented My dub generation', 'downloaded bytes match the persisted fixture hash', 'mobile Result has no horizontal overflow and a 48px download target'],
    }, null, 2), 'utf8');

    const resultRoute = page.url();
    await page.getByRole('button', { name: 'Return to recording', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/sintel-prepared/record\\?layout=${layout}&turn=sintel-turn-1`));
    const returnedRecordVideo = page.locator('.media-viewport video');
    await expect.poll(() => returnedRecordVideo.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await page.screenshot({ path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-result-return-first-turn.png`) });
    await page.goto(resultRoute);
    await expect(page.getByRole('heading', { name: 'Your result' })).toBeVisible();
    await expect.poll(() => page.getByTestId('result-video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    await expect(page.getByTestId('result-video')).toHaveAttribute('data-source', 'dub');

    if (layout === 'A') {
      const leavingVideo = await page.getByTestId('result-video').evaluateHandle((video) => video);
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect.poll(() => page.getByTestId('result-video').evaluate((video: HTMLVideoElement) => !video.paused)).toBe(true);
      await page.getByRole('button', { name: 'Exit', exact: true }).click();
      await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
      expect(await leavingVideo.evaluate((video) => (video as HTMLVideoElement).paused)).toBe(true);
      await page.getByTestId('return-to-saved-record').click();
      await expect(page).toHaveURL(/returnFocus=exit/);
      await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
    }

    if (layout === 'B') {
      await page.evaluate(async () => {
        type ResultStore = {
          readGenerationMedia(scope: unknown, id: unknown): Promise<unknown>;
          loadPreparedProject(scope: unknown): Promise<{ revision: number } | null>;
          tombstoneProject(scope: unknown, revision: number, operation: string): Promise<number>;
        };
        type Fiber = { child?: unknown; sibling?: unknown; memoizedProps?: unknown };
        const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
        if (!root) throw new Error('The React root is unavailable.');
        const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
        if (!rootKey) throw new Error('The React root fiber is unavailable.');
        const pending: unknown[] = [root[rootKey]];
        let store: ResultStore | null = null;
        while (pending.length > 0) {
          const fiber = pending.pop() as Fiber | null;
          if (!fiber) continue;
          const props = fiber.memoizedProps as { services?: { results?: ResultStore } } | null;
          if (props?.services?.results) store = props.services.results;
          if (fiber.child) pending.push(fiber.child);
          if (fiber.sibling) pending.push(fiber.sibling);
        }
        if (!store) throw new Error('The active typed ResultPort was not found in the services provider.');
        const originalRead = store.readGenerationMedia.bind(store);
        const target = window as Window & { __deletedBeforeGenerationDelivery?: boolean };
        store.readGenerationMedia = async (scope, id) => {
          const payload = await originalRead(scope, id);
          const project = await store.loadPreparedProject(scope);
          if (!project) throw new Error('The prepared project disappeared before the tombstone seam.');
          await store.tombstoneProject(scope, project.revision, `review-delete:${crypto.randomUUID()}`);
          target.__deletedBeforeGenerationDelivery = true;
          return payload;
        };
      });
      let downloadEvents = 0;
      page.on('download', () => { downloadEvents += 1; });
      await page.getByRole('button', { name: 'Download My dub', exact: true }).click();
      await expect(page.locator('[data-testid="deleted-project-boundary"]')).toBeVisible();
      expect(await page.evaluate(() => (window as Window & { __deletedBeforeGenerationDelivery?: boolean }).__deletedBeforeGenerationDelivery)).toBe(true);
      expect(downloadEvents).toBe(0);
      await expect(page.getByTestId('result-player')).toHaveCount(0);
      await page.screenshot({ path: path.join(evidenceDirectory, 'B-download-tombstoned-before-delivery.png'), fullPage: true });
    }
  });
}

test('completed revision stays in Record after Next and needs explicit To result authorization', async ({ page, browser }) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), { timeout: 15_000 }).toBe(true);
  await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();

  for (const turn of [1, 2, 3]) {
    await recordCurrentWindow(page, 'A');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    if (turn < 3) await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-${turn + 1}`));
  }

  await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  await expect(page.getByText('Sample ready')).toBeVisible({ timeout: 15_000 });
  const initial = await readIndexedDb(page);
  const initialSnapshotId = String(initial.project?.initialResultSnapshotId ?? '');
  expect(initialSnapshotId).toBeTruthy();
  await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-initial-result-before-revision.png'), fullPage: true });

  await page.getByRole('button', { name: 'Return to recording', exact: true }).click();
  await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  const returnLocks = await page.evaluate(() => (window as unknown as Window & {
    __lockEvidence: { requests: string[]; callbacks: Array<'acquired' | 'null'> };
  }).__lockEvidence);
  expect(returnLocks.requests).toHaveLength(2);
  expect(returnLocks.callbacks).toEqual(['acquired', 'acquired']);
  await recordCurrentWindow(page, 'A');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  await expect(page.getByRole('button', { name: 'To result', exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/\/result/);
  const afterReplacementNext = page.url();

  await page.goto('/projects/sintel-prepared/record?layout=A&turn=sintel-turn-3&locale=en');
  await expect(page.getByRole('button', { name: 'To result', exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-completed-revision-last-turn.png'), fullPage: true });
  await page.getByRole('button', { name: 'To result', exact: true }).click();
  await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  const presentedVideo = page.getByTestId('result-video');
  await expect.poll(() => presentedVideo.evaluate((video: HTMLVideoElement) =>
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0
      && video.currentSrc.startsWith('blob:')), { timeout: 15_000 }).toBe(true);
  await expect(page.getByText('Sample ready')).toBeVisible();

  const revised = await readIndexedDb(page);
  expect(revised.snapshots).toHaveLength(2);
  const originalSnapshot = revised.snapshots.find((snapshot) => snapshot.id === initialSnapshotId);
  expect((originalSnapshot as { authorization?: string } | undefined)?.authorization).toBe('initial-completion');
  const explicitSnapshot = revised.snapshots.find((snapshot) => snapshot.authorization === 'explicit-completed-revision') as
    { id: string; authorization: string; takes: unknown[] } | undefined;
  expect(explicitSnapshot).toBeDefined();
  if (!explicitSnapshot) throw new Error('The explicit completed revision snapshot was not persisted.');
  expect(explicitSnapshot.authorization).toBe('explicit-completed-revision');
  expect(explicitSnapshot.id).not.toBe(initialSnapshotId);
  expect(explicitSnapshot.takes).toHaveLength(3);
  const presentedMedia = await presentedVideo.evaluate((video: HTMLVideoElement) => ({
    source: video.dataset.source,
    generationId: video.dataset.generationId,
    currentSrc: video.currentSrc,
    readyState: video.readyState,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : null,
    durationMetadata: video.duration === Infinity ? 'unknown-until-end' : Number.isNaN(video.duration) ? 'unavailable' : 'finite',
    width: video.videoWidth,
    height: video.videoHeight,
    paused: video.paused,
  }));
  expect(presentedMedia.source).toBe('dub');
  await page.screenshot({ path: path.join(evidenceDirectory, 'phase4-explicit-revision-result.png'), fullPage: true });
  await writeFile(path.join(evidenceDirectory, 'phase4-explicit-revision-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    nativeInput: 'Chrome fake media input; not a physical microphone',
    initialSnapshotId,
    revisedSnapshot: explicitSnapshot,
    presentedMedia,
    captureGrantLifecycle: returnLocks,
    afterReplacementNext,
    automaticResultNavigationAfterReplacement: false,
    explicitToResultClicked: true,
  }, null, 2));
});

test('a second open tab cannot capture or accept while the first tab holds the local project grant', async ({ page }) => {
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  const secondPage = await page.context().newPage();
  await secondPage.goto('/projects/sintel-prepared/record?layout=B');
  await expect(secondPage.getByRole('button', { name: 'Record', exact: true })).toBeDisabled();
  await expect(secondPage.getByRole('alert')).toContainText('Another open tab currently holds this project’s local recording access.');
  await secondPage.close();
});

test('denied microphone permission is contextual and does not start MediaRecorder', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true;
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('heading', { name: 'Sintel · The search' })).toBeVisible();

  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 1, recorderStarts: 0 });
  const database = await readIndexedDb(page);
  expect(database.media.filter((candidate) => candidate.purpose === 'recording')).toHaveLength(0);
  const toast = page.locator('.recovery-toast');
  await expect(toast).toBeVisible();
  expect(await toast.getAttribute('aria-hidden')).toBe('true');
  expect(await toast.getByRole('button').count()).toBe(0);
  await page.waitForTimeout(1000);
  await expect(toast).toBeVisible();
  await page.waitForTimeout(6500);
  const toastBounds = await toast.boundingBox();
  expect(toastBounds).not.toBeNull();
  await page.mouse.move(toastBounds!.x + toastBounds!.width / 2, toastBounds!.y + toastBounds!.height / 2);
  await page.waitForTimeout(950);
  await expect(toast).toBeVisible();
  await page.mouse.move(20, 20);
  await expect(toast).toHaveCount(0, { timeout: 1500 });
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await expect(page.locator('.recovery-toast')).toBeVisible();
  const reducedMotionTransitionSeconds = await page.locator('.recovery-toast').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).transitionDuration.split(',')[0] ?? '1'));
  expect(reducedMotionTransitionSeconds).toBeLessThan(0.001);
  await page.mouse.wheel(0, 100);
  await expect(page.locator('.recovery-toast')).toHaveCount(0, { timeout: 1_000 });
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/microphone\?/);
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=settings/);
  await expect(page.locator('[data-logical-focus="settings"]')).toBeFocused();
  await writeFile(path.join(evidenceDirectory, 'permission-denied-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    permission: 'test harness rejected getUserMedia with NotAllowedError; browser permission UI was not exercised',
    nativeApiEvidence: await evidenceCounters(page),
    savedRecordingCount: database.media.filter((candidate) => candidate.purpose === 'recording').length,
    settingsBoundaryAvailable: await page.getByRole('button', { name: 'Settings', exact: true }).isVisible(),
    settingsBoundaryReturnFocus: await page.locator('[data-logical-focus="settings"]').evaluate((element) => element === document.activeElement),
    recoveryToast: 'message only and aria-hidden; 8 second read interval; deliberate hover pause; reduced motion; manual wheel dismissal; durable error retained',
  }, null, 2), 'utf8');
});

test('browser lifecycle interruption saves only a usable native partial and cancels pending input safely', async ({ page, browser }) => {
  test.setTimeout(45_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect(page.getByRole('button', { name: 'Record', exact: true })).toBeEnabled();
  await traceNextNativeBlobDigest(page);

  const readPreparedDuration = async () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const project = await new Promise<{ windows: Array<{ id: string; startMs: number; endMs: number }> }>((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
      request.onsuccess = () => resolve(request.result as { windows: Array<{ id: string; startMs: number; endMs: number }> });
      request.onerror = () => reject(request.error);
    });
    database.close();
    const window = project.windows.find((item) => item.id === 'sintel-turn-1');
    if (!window) throw new Error('Prepared turn 1 has no source window.');
    return window.endMs - window.startMs;
  });
  const preparedDurationMs = await readPreparedDuration();
  const currentCandidate = async () => {
    const database = await readIndexedDb(page);
    const draftByTurn = database.project?.draftCandidateByTurn as Record<string, string> | undefined;
    const candidateId = draftByTurn?.['sintel-turn-1'];
    return { database, candidate: database.media.find((candidate) => candidate.id === candidateId) };
  };
  const panelBounds = async () => page.evaluate(() => ({
    media: document.querySelector('.media-viewport')!.getBoundingClientRect().toJSON(),
    panel: document.querySelector('.record-panel')!.getBoundingClientRect().toJSON(),
  }));
  const expectPanelAligned = async () => {
    const bounds = await panelBounds();
    expect(Math.abs(bounds.panel.y - bounds.media.y)).toBeLessThanOrEqual(1);
    return bounds;
  };
  const setModeledVisibility = async (hidden: boolean) => page.evaluate((isHidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: isHidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: isHidden ? 'hidden' : 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    if (isHidden) window.dispatchEvent(new Event('pagehide'));
    else window.dispatchEvent(new Event('pageshow'));
  }, hidden);
  const saveLifecyclePartial = async (expectedRecorderStarts: number, screenshotName: string) => {
    await page.locator('.record-action').click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(expectedRecorderStarts);
    const capturingBounds = await expectPanelAligned();
    await page.screenshot({ path: path.join(evidenceDirectory, `${screenshotName}-capturing.png`) });
    await page.waitForTimeout(900);
    await setModeledVisibility(true);
    await expect(page.locator('.record-panel .notice')).toContainText('interrupted recording with usable audio was saved as a candidate', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Your take', exact: true })).toBeEnabled();
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    const savedBounds = await expectPanelAligned();
    await page.screenshot({ path: path.join(evidenceDirectory, `${screenshotName}-partial-saved.png`) });
    await expect.poll(() => page.evaluate(() => (window as Window & { __nativeBlobDigestTrace?: { sha256: string | null } }).__nativeBlobDigestTrace?.sha256))
      .toMatch(/^[a-f0-9]{64}$/);
    const digest = await page.evaluate(() => (window as Window & {
      __nativeBlobDigestTrace?: { captures: number; byteSize: number; mimeType: string; sha256: string | null };
    }).__nativeBlobDigestTrace);
    expect(digest).toBeDefined();
    if (!digest) throw new Error('The native MediaRecorder byte digest was not observed.');
    const { database, candidate } = await currentCandidate();
    const probe = candidate?.probe as { decodedFrames?: number | null; durationSeconds?: number | null; decodeStatus?: string } | undefined;
    expect(candidate?.endReason).toBe('interrupted');
    expect(candidate?.blobSize).toBeGreaterThan(0);
    expect(candidate?.blobSize).toBe(candidate?.byteSize);
    expect(candidate?.sha256).toBe(digest.sha256);
    expect(candidate?.byteSize).toBe(digest.byteSize);
    expect(probe?.decodedFrames).toBeGreaterThan(0);
    expect(probe?.durationSeconds).toBeGreaterThan(0);
    expect(probe?.durationSeconds ?? Infinity).toBeLessThan(preparedDurationMs / 1000);
    expect(Object.values(database.project?.acceptedByTurn as Record<string, string> ?? {})).toHaveLength(0);
    await writeFile(path.join(evidenceDirectory, `${screenshotName}-evidence.json`), JSON.stringify({
      date: new Date().toISOString(),
      browser: `Chrome ${browser.version()}`,
      input: 'Chrome browser fake audio input; not a physical microphone',
      lifecycle: 'modeled document.hidden/visibilitychange and pagehide events',
      preparedDurationMs,
      nativeBlob: digest,
      persistedCandidate: candidate,
      sourceVideoPausedAfterInterruption: await page.locator('video').evaluate((video: HTMLVideoElement) => video.paused),
      panelDuringCapture: capturingBounds,
      panelAfterSave: savedBounds,
    }, null, 2), 'utf8');
    await setModeledVisibility(false);
    await page.waitForTimeout(250);
    await expect.poll(() => page.locator('video').evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    return candidate;
  };

  const normalBounds = await expectPanelAligned();
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR12-A-record-normal-1440x900.png') });
  const firstPartial = await saveLifecyclePartial(1, 'IR11-partial-1440x900');

  await page.setViewportSize({ width: 1280, height: 600 });
  const shortSavedBounds = await expectPanelAligned();
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR12-A-record-saved-1280x600.png') });
  const secondPartial = await saveLifecyclePartial(2, 'IR11-partial-1280x600');

  await page.evaluate(() => {
    type ServiceMedia = { captureFixedWindow: (...args: unknown[]) => Promise<unknown> };
    type Services = { media: ServiceMedia };
    type Fiber = { alternate?: unknown; child?: unknown; sibling?: unknown; memoizedProps?: unknown };
    const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
    if (!root) throw new Error('The React root is unavailable for the unusable-partial check.');
    const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
    if (!rootKey) throw new Error('The active React root fiber is unavailable.');
    const pending: unknown[] = [root[rootKey]];
    const seen = new Set<unknown>();
    let services: Services | null = null;
    while (pending.length > 0) {
      const fiber = pending.pop() as Fiber | null;
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      if (fiber.alternate) pending.push(fiber.alternate);
      const props = fiber.memoizedProps as { services?: Services } | null;
      if (props?.services?.media) services = props.services;
      if (fiber.child) pending.push(fiber.child);
      if (fiber.sibling) pending.push(fiber.sibling);
    }
    if (!services) throw new Error('The active typed BrowserMediaPort was not found.');
    const original = services.media.captureFixedWindow.bind(services.media);
    let returnUnusableOnce = true;
    services.media.captureFixedWindow = async (...args) => {
      const input = args[0] as { purpose?: string } | undefined;
      if (input?.purpose === 'recording' && returnUnusableOnce) {
        returnUnusableOnce = false;
        const now = Date.now();
        return {
          purpose: 'recording',
          blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }),
          mimeType: 'audio/webm',
          startedAt: now - 50,
          stoppedAt: now,
          elapsedMs: 50,
          endReason: 'interrupted',
          probe: { mimeType: 'audio/webm', byteSize: 3, durationSeconds: null, decodedFrames: null,
            channelCount: null, sampleRate: null, decodeStatus: 'unavailable', waveformPeaks: [] },
        };
      }
      return original(...args);
    };
  });
  await page.locator('.record-action').click();
  await expect(page.locator('.record-panel .notice')).toContainText('Recording could not finish. Any earlier candidate and accepted take remain unchanged.');
  const afterUnusable = await currentCandidate();
  expect(afterUnusable.candidate?.id).toBe(secondPartial?.id);
  expect(afterUnusable.candidate?.sha256).toBe(secondPartial?.sha256);
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR11-unusable-partial-preserves-candidate.png') });

  await page.evaluate(() => { (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true; });
  await page.locator('.record-action').click();
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  const afterDenied = await currentCandidate();
  expect(afterDenied.candidate?.id).toBe(secondPartial?.id);
  expect(afterDenied.candidate?.sha256).toBe(secondPartial?.sha256);

  await page.evaluate(() => {
    type PendingCapture = { stream: MediaStream | null; release: (() => void) | null };
    const target = window as Window & { __denyMicrophone?: boolean; __pendingGetUserMedia?: PendingCapture };
    target.__denyMicrophone = false;
    const mediaDevices = navigator.mediaDevices;
    const original = mediaDevices.getUserMedia.bind(mediaDevices);
    const pending: PendingCapture = { stream: null, release: null };
    target.__pendingGetUserMedia = pending;
    mediaDevices.getUserMedia = async (...args: Parameters<MediaDevices['getUserMedia']>) => {
      const stream = await original(...args);
      pending.stream = stream;
      await new Promise<void>((resolve) => { pending.release = resolve; });
      return stream;
    };
  });
  await page.locator('.record-action').click();
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __pendingGetUserMedia?: { stream: MediaStream | null } }).__pendingGetUserMedia?.stream))).toBe(true);
  await setModeledVisibility(true);
  await page.evaluate(() => {
    const pending = (window as Window & { __pendingGetUserMedia?: { release: (() => void) | null } }).__pendingGetUserMedia;
    if (!pending?.release) throw new Error('The delayed microphone result is unavailable.');
    pending.release();
  });
  await expect(page.locator('.record-panel .notice')).toContainText('Recording could not finish.', { timeout: 10_000 });
  const pendingTracks = await page.evaluate(() => (window as Window & { __pendingGetUserMedia?: { stream: MediaStream | null } })
    .__pendingGetUserMedia?.stream?.getTracks().map((track) => track.readyState) ?? []);
  expect(pendingTracks.length).toBeGreaterThan(0);
  expect(pendingTracks.every((state) => state === 'ended')).toBe(true);
  expect(await evidenceCounters(page)).toEqual({ getUserMediaCalls: 4, recorderStarts: 2 });
  const afterPendingCancel = await currentCandidate();
  expect(afterPendingCancel.candidate?.id).toBe(secondPartial?.id);
  expect(afterPendingCancel.candidate?.sha256).toBe(secondPartial?.sha256);
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR11-preparing-hidden-cancel-preserves-candidate.png') });
  await writeFile(path.join(evidenceDirectory, 'IR11-IR12-lifecycle-and-panel-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    firstPartialCandidateId: firstPartial?.id,
    latestPartialCandidateId: secondPartial?.id,
    unusablePartialPreservedLatestCandidate: afterUnusable.candidate?.id === secondPartial?.id,
    deniedPermissionPreservedLatestCandidate: afterDenied.candidate?.id === secondPartial?.id,
    preparingHiddenStoppedTracks: pendingTracks,
    preparingHiddenPreservedLatestCandidate: afterPendingCancel.candidate?.id === secondPartial?.id,
    normal1440x900: normalBounds,
    saved1280x600: shortSavedBounds,
    apiCounters: await evidenceCounters(page),
    physicalMicrophoneOrDeviceBackgroundTested: false,
  }, null, 2), 'utf8');
});

test('Record seek cancellation and blur keep both audition sources paused', async ({ page }) => {
  test.setTimeout(30_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  await waitForSavedCandidate(page, 'A');
  const seek = page.locator('.record-seek');
  const video = page.locator('video');
  const audio = page.locator('audio');

  for (const source of ['Original', 'Your take']) {
    await page.getByRole('button', { name: source, exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const bounds = await seek.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds!.x + bounds!.width * 0.4, bounds!.y + bounds!.height / 2);
    await page.mouse.down();
    await seek.dispatchEvent('pointercancel', { pointerId: 1, pointerType: 'mouse' });
    await page.getByRole('button', { name: 'Exit', exact: true }).focus();
    await page.mouse.up();
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    if (source === 'Your take') await expect.poll(() => audio.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  }

  await page.getByRole('button', { name: 'Original', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await seek.focus();
  await page.keyboard.down('ArrowRight');
  await page.getByRole('button', { name: 'Exit', exact: true }).focus();
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR06-record-seek-cancel-blur-paused.png') });
});

test('phone recovery toast expiry preserves the document floor and scroll position', async ({ page, browser }) => {
  test.setTimeout(20_000);
    await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => { (window as Window & { __denyMicrophone?: boolean }).__denyMicrophone = true; });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await page.getByRole('button', { name: 'Record', exact: true }).click();
  const toast = page.locator('.recovery-toast');
  await expect(toast).toBeVisible();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(before.scrollY).toBeGreaterThan(0);
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-before-expiry.png') });
  await page.waitForTimeout(8_300);
  await expect(toast).toHaveCount(0);
  const after = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    before,
    after,
  }, null, 2), 'utf8');
  expect(after.scrollY).toBe(before.scrollY);
  expect(after.maxScroll).toBe(before.maxScroll);
  expect(after.scrollHeight).toBe(before.scrollHeight);
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  await page.screenshot({ path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-after-expiry.png') });
  await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    before,
    after,
    durableGuidanceRetained: await page.locator('.record-panel .notice').isVisible(),
  }, null, 2), 'utf8');
});

test('approved long Russian line is used as an isolated stress fixture in A and B', async ({ page, browser }) => {
  test.setTimeout(60_000);
  await instrumentNativeMedia(page);
  const longSentence = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
  const measurements: Array<Record<string, unknown>> = [];
  for (const layout of ['A', 'B'] as const) {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/');
    await expect(page.locator('.home-page')).toBeVisible();
    await page.evaluate(({ selectedLayout, fixtureText }) => {
      type PreparedWindow = { id: string; text: Record<string, string> };
      type Projects = { loadPreparedProject: (...args: unknown[]) => Promise<{ windows: PreparedWindow[] } | null> };
      type Services = { projects: Projects };
      type Fiber = { alternate?: unknown; child?: unknown; sibling?: unknown; memoizedProps?: unknown };
      const root = document.getElementById('root') as (HTMLElement & Record<string, unknown>) | null;
      if (!root) throw new Error('The React root is unavailable for the isolated stress fixture.');
      const rootKey = Object.keys(root).find((key) => key.startsWith('__reactContainer$'));
      if (!rootKey) throw new Error('The active React root fiber is unavailable.');
      const pending: unknown[] = [root[rootKey]];
      const seen = new Set<unknown>();
      let services: Services | null = null;
      while (pending.length > 0) {
        const fiber = pending.pop() as Fiber | null;
        if (!fiber || seen.has(fiber)) continue;
        seen.add(fiber);
        if (fiber.alternate) pending.push(fiber.alternate);
        const props = fiber.memoizedProps as { services?: Services } | null;
        if (props?.services?.projects) services = props.services;
        if (fiber.child) pending.push(fiber.child);
        if (fiber.sibling) pending.push(fiber.sibling);
      }
      if (!services) throw new Error('The active typed project reader was not found.');
      const originalLoad = services.projects.loadPreparedProject.bind(services.projects);
      services.projects.loadPreparedProject = async (...args) => {
        const project = await originalLoad(...args);
        return project ? {
          ...project,
          windows: project.windows.map((window) => window.id === 'sintel-turn-3'
            ? { ...window, text: { ...window.text, ru: fixtureText } }
            : window),
        } : null;
      };
      history.pushState({}, '', `/projects/sintel-prepared/record?layout=${selectedLayout}&locale=ru&turn=sintel-turn-3`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, { selectedLayout: layout, fixtureText: longSentence });
    await expect(page.locator('#record')).toBeEnabled();
    await expect(page.locator('#dialogue')).toHaveText(longSentence);
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('.media-viewport video').evaluate((video: HTMLVideoElement) =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0,
    )).toBe(true);
    if (!(await page.locator('#take').isEnabled())) {
      await page.locator('#record').click();
      await waitForSavedCandidate(page, layout);
    }

    for (const viewport of [{ width: 1280, height: 600 }, { width: 1366, height: 650 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const result = await page.evaluate(() => {
        const bounds = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
        };
        return {
          viewport: { width: innerWidth, height: innerHeight },
          text: document.querySelector('#dialogue')?.textContent,
          media: bounds('.media-viewport'),
          panel: bounds('.performance'),
          dialogue: bounds('.script'),
          wave: bounds('.waveform-row'),
          recordAndTake: ['#record', '#take'].map((selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const rect = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, paddingTop: style.paddingTop, paddingRight: style.paddingRight };
          }),
          documentHeight: document.documentElement.scrollHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(result.text).toBe(longSentence);
      expect(result.horizontalOverflow).toBe(false);
      if (layout === 'A' && viewport.width === 390) {
        expect(result.recordAndTake).toHaveLength(2);
        expect(result.recordAndTake.every((button) => button?.height === 72)).toBe(true);
        expect(result.recordAndTake.every((button) => button?.paddingTop === '12px' && button.paddingRight === '8px')).toBe(true);
      }
      expect(result.dialogue?.bottom ?? Infinity).toBeLessThanOrEqual(result.wave?.y ?? -Infinity);
      if (layout === 'A' && viewport.width >= 1248) expect(Math.abs((result.panel?.y ?? -999) - (result.media?.y ?? -1000))).toBeLessThanOrEqual(1);
      measurements.push({ layout, ...result });
      const name = `ru-long-${layout}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({ path: path.join(evidenceDirectory, name), fullPage: viewport.width < 500 });
    }
  }
  await writeFile(path.join(evidenceDirectory, 'ru-long-stress-fixture-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    sentence: longSentence,
    source: 'isolated in-memory read-port override for sintel-turn-3; production seed text unchanged',
    measurements,
  }, null, 2), 'utf8');
});
