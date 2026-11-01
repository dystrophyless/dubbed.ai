// 4ac41e784a9075fb2c6577e7388037f2d9961f0a
var _process$env$DUBBED_C;
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test, expect } from '@playwright/test';
const evidenceDirectory = path.resolve(process.cwd(), '..', '_docs', 'evidence', 'core-journey-ab-implementation-2026-10-28', ...((_process$env$DUBBED_C = process.env.DUBBED_CORE_EVIDENCE_RUN) !== null && _process$env$DUBBED_C !== void 0 ? _process$env$DUBBED_C : 'phase3').split(/[\\/]+/));
async function setRecordLocale(page, locale) {
  const url = new URL(page.url());
  url.searchParams.set('locale', locale);
  await page.goto(`${url.pathname}${url.search}`);
}
async function instrumentNativeMedia(page) {
  await page.addInitScript(() => {
    const target = window;
    target.__nativeRecordEvidence = {
      getUserMediaCalls: 0,
      recorderStarts: 0
    };
    try {
      const savedEvidence = sessionStorage.getItem('__dubbed_native_record_evidence_v1');
      if (savedEvidence) target.__nativeRecordEvidence = JSON.parse(savedEvidence);
    } catch {/* Evidence storage is best-effort; browser behavior remains authoritative. */}
    const persistNativeEvidence = () => {
      try {
        sessionStorage.setItem('__dubbed_native_record_evidence_v1', JSON.stringify(target.__nativeRecordEvidence));
      } catch {/* Keep capture behavior independent of evidence storage. */}
    };
    target.__lockEvidence = {
      requests: [],
      callbacks: []
    };
    const lockManager = navigator.locks;
    const originalRequest = lockManager.request.bind(lockManager);
    Object.defineProperty(lockManager, 'request', {
      configurable: true,
      value: (name, options, callback) => {
        target.__lockEvidence.requests.push(name);
        return originalRequest(name, options, lock => {
          target.__lockEvidence.callbacks.push(lock ? 'acquired' : 'null');
          return callback(lock);
        });
      }
    });
    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices) {
      const getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
      mediaDevices.getUserMedia = (...args) => {
        target.__nativeRecordEvidence.getUserMediaCalls += 1;
        persistNativeEvidence();
        if (target.__denyMicrophone) return Promise.reject(new DOMException('Microphone permission denied in the test harness.', 'NotAllowedError'));
        return getUserMedia(...args);
      };
    }
    if (window.MediaRecorder) {
      const start = MediaRecorder.prototype.start;
      MediaRecorder.prototype.start = function (...args) {
        target.__nativeRecordEvidence.recorderStarts += 1;
        persistNativeEvidence();
        return start.apply(this, args);
      };
    }
  });
}
async function evidenceCounters(page) {
  return page.evaluate(() => window.__nativeRecordEvidence);
}
async function installStoreFailure(page, mode) {
  await page.evaluate(faultMode => {
    const root = document.getElementById('root');
    if (!root) throw new Error('The React root is unavailable.');
    const rootKey = Object.keys(root).find(key => key.startsWith('__reactContainer$'));
    if (!rootKey) throw new Error('The React root fiber is unavailable.');
    const pending = [root[rootKey]];
    let store = null;
    while (pending.length > 0) {
      var _props$services;
      const fiber = pending.pop();
      if (!fiber) continue;
      const props = fiber.memoizedProps;
      if (props !== null && props !== void 0 && (_props$services = props.services) !== null && _props$services !== void 0 && _props$services.projects) store = props.services.projects;
      if (fiber.child) pending.push(fiber.child);
      if (fiber.sibling) pending.push(fiber.sibling);
    }
    if (!store) throw new Error('The active typed ProjectPort was not found in the services provider.');
    const originalSave = store.saveCandidate.bind(store);
    const originalLookup = store.lookupOperation.bind(store);
    const trace = {
      saveCalls: 0,
      lookupCalls: 0,
      operationIds: [],
      blobSizes: [],
      retrySameBlob: null
    };
    window.__storeFailureTrace = trace;
    let firstKnownFailure = true;
    let failedBlob = null;
    store.saveCandidate = async request => {
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
      return faultMode === 'lost-acknowledgement' ? {
        kind: 'unknown',
        operationId: request.operationId,
        reason: 'Test harness withheld the successful acknowledgement.'
      } : committed;
    };
    store.lookupOperation = async (...args) => {
      trace.lookupCalls += 1;
      if (faultMode === 'lost-acknowledgement' && trace.lookupCalls === 1) {
        return {
          kind: 'pending',
          operationId: String(args[1])
        };
      }
      return originalLookup(...args);
    };
  }, mode);
}
async function installAcceptanceFailure(page) {
  await page.evaluate(async () => {
    const originalTransaction = IDBDatabase.prototype.transaction;
    const trace = {
      calls: 0,
      stores: [],
      restore: () => undefined
    };
    window.__acceptFailureTrace = trace;
    IDBDatabase.prototype.transaction = function (storeNames, mode, options) {
      const stores = typeof storeNames === 'string' ? [storeNames] : [...storeNames];
      if (trace.calls === 0 && mode === 'readwrite' && stores.includes('operations')) {
        trace.calls += 1;
        trace.stores = stores;
        throw new DOMException('Synthetic known acceptance write failure.', 'QuotaExceededError');
      }
      return originalTransaction.call(this, storeNames, mode, options);
    };
    trace.restore = () => {
      IDBDatabase.prototype.transaction = originalTransaction;
    };
  });
}
async function installNextOperationWriteFailure(page) {
  await page.evaluate(() => {
    const original = IDBDatabase.prototype.transaction;
    const trace = {
      calls: 0,
      stores: []
    };
    const target = window;
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
    target.__restoreOperationWriteFailure = () => {
      IDBDatabase.prototype.transaction = original;
    };
  });
}
async function traceNextNativeBlobDigest(page) {
  await page.evaluate(() => {
    const trace = {
      captures: 0,
      byteSize: 0,
      mimeType: '',
      sha256: null
    };
    window.__nativeBlobDigestTrace = trace;
    const prototype = MediaRecorder.prototype;
    const start = prototype.start;
    prototype.start = function (...args) {
      const chunks = [];
      this.addEventListener('dataavailable', event => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      this.addEventListener('stop', () => {
        const blob = new Blob(chunks, {
          type: this.mimeType
        });
        trace.captures += 1;
        trace.byteSize = blob.size;
        trace.mimeType = blob.type;
        void blob.arrayBuffer().then(bytes => crypto.subtle.digest('SHA-256', bytes)).then(digest => {
          trace.sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
        });
      }, {
        once: true
      });
      return start.apply(this, args);
    };
  });
}
async function storeFailureTrace(page) {
  return page.evaluate(() => window.__storeFailureTrace);
}
async function readIndexedDb(page) {
  return page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = (storeName, key) => new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const request = key === undefined ? transaction.objectStore(storeName).getAll() : transaction.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const project = await read('projects', 'sintel-prepared');
    const media = await read('media');
    const operations = await read('operations');
    const snapshots = await read('snapshots');
    database.close();
    return {
      project: project ? {
        revision: project.revision,
        draftCandidateByTurn: project.draftCandidateByTurn,
        acceptedByTurn: project.acceptedByTurn,
        initialResultSnapshotId: project.initialResultSnapshotId,
        latestResultSnapshotId: project.latestResultSnapshotId,
        tombstonedAt: project.tombstonedAt
      } : null,
      media: media.map(candidate => {
        var _size, _candidate$blob;
        return {
          id: candidate.id,
          purpose: candidate.purpose,
          turnId: candidate.turnId,
          byteSize: candidate.byteSize,
          sha256: candidate.sha256,
          mimeType: candidate.mimeType,
          endReason: candidate.endReason,
          probe: candidate.probe,
          blobSize: (_size = (_candidate$blob = candidate.blob) === null || _candidate$blob === void 0 ? void 0 : _candidate$blob.size) !== null && _size !== void 0 ? _size : null
        };
      }),
      operations: operations.map(operation => ({
        id: operation.id,
        kind: operation.kind,
        state: operation.state,
        turnId: operation.turnId,
        projectRevision: operation.projectRevision,
        snapshotId: operation.snapshotId,
        navigationIntent: operation.navigationIntent,
        navigationCompleted: operation.navigationCompleted,
        sha256: operation.sha256
      })),
      snapshots: snapshots.map(snapshot => ({
        id: snapshot.id,
        projectRevision: snapshot.projectRevision,
        contentSha256: snapshot.contentSha256,
        authorization: snapshot.authorization,
        takes: snapshot.takes
      }))
    };
  });
}
test('reconciles a lost save acknowledgement with the original operation before accepting the candidate', async ({
  page,
  browser
}) => {
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  await installStoreFailure(page, 'lost-acknowledgement');
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
  await expect(page.locator('.record-panel .notice')).toContainText('The save outcome is unknown. Check this same operation before trying another recording.', {
    timeout: 15000
  });
  await expect(page.getByRole('button', {
    name: 'Check saved status',
    exact: true
  })).toBeEnabled();
  const unknownTrace = await storeFailureTrace(page);
  expect(unknownTrace.saveCalls).toBe(1);
  expect(unknownTrace.lookupCalls).toBe(1);
  expect(unknownTrace.operationIds).toHaveLength(1);
  await page.getByRole('button', {
    name: 'Check saved status',
    exact: true
  }).click();
  const stored = await waitForSavedCandidate(page, 'A');
  const resolvedTrace = await storeFailureTrace(page);
  expect(resolvedTrace.saveCalls).toBe(1);
  expect(resolvedTrace.lookupCalls).toBe(2);
  expect(resolvedTrace.operationIds).toEqual([unknownTrace.operationIds[0]]);
  const database = await readIndexedDb(page);
  const journalEntry = database.operations.find(operation => operation.id === unknownTrace.operationIds[0]);
  expect(journalEntry === null || journalEntry === void 0 ? void 0 : journalEntry.state).toBe('committed');
  expect(journalEntry === null || journalEntry === void 0 ? void 0 : journalEntry.sha256).toBe(stored === null || stored === void 0 ? void 0 : stored.sha256);
  await writeFile(path.join(evidenceDirectory, 'lost-save-ack-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    scenario: 'The mock store committed the Blob but withheld its acknowledgement; first status lookup reported pending; explicit check read the committed receipt.',
    physicalMicrophone: false,
    nativeApiEvidence: await evidenceCounters(page),
    trace: resolvedTrace,
    journalEntry,
    savedCandidate: stored
  }, null, 2), 'utf8');
});
test('keeps an accepted take intact after a known save failure and retries the exact captured Blob', async ({
  page,
  browser
}) => {
  var _beforeFailure$projec, _afterFailure$project, _afterRetry$project, _afterRetry$project2;
  test.setTimeout(45000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await recordCurrentWindow(page, 'A');
  await page.getByRole('button', {
    name: 'Next',
    exact: true
  }).click();
  await expect(page).toHaveURL(/turn=sintel-turn-2/);
  await page.getByRole('button', {
    name: 'Previous',
    exact: true
  }).click();
  await expect(page).toHaveURL(/turn=sintel-turn-1/);
  const beforeFailure = await readIndexedDb(page);
  const acceptedBefore = ((_beforeFailure$projec = beforeFailure.project) === null || _beforeFailure$projec === void 0 ? void 0 : _beforeFailure$projec.acceptedByTurn)['sintel-turn-1'];
  expect(acceptedBefore).toBeTruthy();
  await installNextOperationWriteFailure(page);
  await traceNextNativeBlobDigest(page);
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(2);
  await expect(page.locator('.record-panel .notice')).toContainText('The candidate could not be saved. The current recording and previously accepted take remain available here.', {
    timeout: 15000
  });
  await expect(page.getByRole('button', {
    name: 'Retry save',
    exact: true
  })).toBeEnabled();
  const recoveryToast = page.locator('.recovery-toast');
  await expect(recoveryToast).toBeVisible();
  expect(await recoveryToast.getByRole('button').count()).toBe(0);
  const toastStyle = await recoveryToast.evaluate(element => {
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
      titleFont: getComputedStyle(element.querySelector('.recovery-toast__title')).font,
      bodyFont: getComputedStyle(element.querySelector('.recovery-toast__body')).font
    };
  });
  expect(toastStyle.background).toBe('rgb(32, 32, 32)');
  expect(toastStyle.borderRadius).toBe('10px');
  expect(toastStyle.bottom).toBe('16px');
  expect(toastStyle.width).toBeLessThanOrEqual(520);
  expect(toastStyle.padding).toBe('14px 16px');
  expect(toastStyle.iconColor).toBe('rgb(255, 156, 159)');
  await page.screenshot({
    path: path.join(evidenceDirectory, 'known-save-failure-recovery-toast.png')
  });
  const failedTrace = await page.evaluate(() => window.__operationWriteFailure);
  expect(failedTrace.calls).toBe(1);
  expect(failedTrace.stores).toContain('operations');
  await page.evaluate(() => window.__restoreOperationWriteFailure());
  const focusBeforeExpiry = await page.evaluate(() => {
    var _document$activeEleme, _document$activeEleme2;
    return {
      recoveryFocused: (_document$activeEleme = (_document$activeEleme2 = document.activeElement) === null || _document$activeEleme2 === void 0 ? void 0 : _document$activeEleme2.matches('[data-recovery-action="retry-save"]')) !== null && _document$activeEleme !== void 0 ? _document$activeEleme : false,
      scrollY: window.scrollY
    };
  });
  expect(focusBeforeExpiry.recoveryFocused).toBe(true);
  await expect(recoveryToast).toHaveCount(0, {
    timeout: 10000
  });
  expect(await page.locator('[data-recovery-action="retry-save"]').evaluate(element => element === document.activeElement)).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(focusBeforeExpiry.scrollY);
  const afterFailure = await readIndexedDb(page);
  expect(((_afterFailure$project = afterFailure.project) === null || _afterFailure$project === void 0 ? void 0 : _afterFailure$project.acceptedByTurn)['sintel-turn-1']).toBe(acceptedBefore);
  expect(afterFailure.media.filter(stored => stored.purpose === 'recording' && stored.id !== acceptedBefore)).toHaveLength(0);
  await page.getByRole('button', {
    name: 'Retry save',
    exact: true
  }).click();
  const saved = await waitForSavedCandidate(page, 'A');
  await expect.poll(async () => page.evaluate(() => window.__nativeBlobDigestTrace.sha256), {
    timeout: 5000
  }).toBe(saved === null || saved === void 0 ? void 0 : saved.sha256);
  const recoveredTrace = await page.evaluate(() => window.__nativeBlobDigestTrace);
  expect(recoveredTrace.captures).toBe(1);
  expect(recoveredTrace.byteSize).toBe(saved === null || saved === void 0 ? void 0 : saved.blobSize);
  expect(recoveredTrace.mimeType).toBe(saved === null || saved === void 0 ? void 0 : saved.mimeType);
  const afterRetry = await readIndexedDb(page);
  expect(((_afterRetry$project = afterRetry.project) === null || _afterRetry$project === void 0 ? void 0 : _afterRetry$project.acceptedByTurn)['sintel-turn-1']).toBe(acceptedBefore);
  expect(((_afterRetry$project2 = afterRetry.project) === null || _afterRetry$project2 === void 0 ? void 0 : _afterRetry$project2.draftCandidateByTurn)['sintel-turn-1']).toBe(saved === null || saved === void 0 ? void 0 : saved.id);
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
    retriedCandidate: saved
  }, null, 2), 'utf8');
});
test('failed guarded Exit keeps the original intent, focuses Retry, and restores Exit after retry and boundary return', async ({
  page,
  browser
}) => {
  var _failed$project, _ref, _failed$project2, _accepted$project, _failed$project3, _accepted$project2;
  test.setTimeout(45000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  const candidate = await (async () => {
    await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
      timeout: 15000
    }).toBe(true);
    await recordCurrentWindow(page, 'A');
    return waitForSavedCandidate(page, 'A');
  })();
  await installAcceptanceFailure(page);
  await page.getByRole('button', {
    name: 'Exit',
    exact: true
  }).click();
  const guard = page.getByRole('dialog');
  await expect(guard).toBeVisible();
  await guard.getByRole('button', {
    name: 'Save and leave',
    exact: true
  }).click();
  await expect(guard.getByRole('button', {
    name: 'Retry accept and leave',
    exact: true
  })).toBeVisible();
  const retry = guard.locator('[data-recovery-action="retry-guard"]');
  await expect(retry).toBeFocused();
  const failed = await readIndexedDb(page);
  expect((_failed$project = failed.project) === null || _failed$project === void 0 ? void 0 : _failed$project.draftCandidateByTurn).toMatchObject({
    'sintel-turn-1': candidate === null || candidate === void 0 ? void 0 : candidate.id
  });
  expect(Object.values((_ref = (_failed$project2 = failed.project) === null || _failed$project2 === void 0 ? void 0 : _failed$project2.acceptedByTurn) !== null && _ref !== void 0 ? _ref : {})).toHaveLength(0);
  const acceptanceFailure = await page.evaluate(() => window.__acceptFailureTrace);
  expect(acceptanceFailure.calls).toBe(1);
  expect(acceptanceFailure.stores).toContain('operations');
  await page.evaluate(() => window.__acceptFailureTrace.restore());
  await page.screenshot({
    path: path.join(evidenceDirectory, 'guarded-exit-known-acceptance-failure.png')
  });
  const beforeToastExpiry = await page.evaluate(() => {
    var _document$activeEleme3, _document$activeEleme4;
    return {
      focusedRetry: (_document$activeEleme3 = (_document$activeEleme4 = document.activeElement) === null || _document$activeEleme4 === void 0 ? void 0 : _document$activeEleme4.matches('[data-recovery-action="retry-guard"]')) !== null && _document$activeEleme3 !== void 0 ? _document$activeEleme3 : false,
      scrollY: window.scrollY
    };
  });
  expect(beforeToastExpiry.focusedRetry).toBe(true);
  await expect(page.locator('.recovery-toast')).toHaveCount(0, {
    timeout: 10000
  });
  await expect(retry).toBeFocused();
  const retryFocusedAfterToastExpiry = await retry.evaluate(element => element === document.activeElement);
  expect(retryFocusedAfterToastExpiry).toBe(true);
  expect(await page.evaluate(() => window.scrollY)).toBe(beforeToastExpiry.scrollY);
  await retry.click();
  await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'guarded-exit-success-boundary.png'),
    fullPage: true
  });
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=exit/);
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  const accepted = await readIndexedDb(page);
  expect((_accepted$project = accepted.project) === null || _accepted$project === void 0 ? void 0 : _accepted$project.acceptedByTurn).toMatchObject({
    'sintel-turn-1': candidate === null || candidate === void 0 ? void 0 : candidate.id
  });
  const successfulAcceptOperations = accepted.operations.filter(operation => operation.kind === 'accept-candidate' && operation.state === 'committed');
  expect(successfulAcceptOperations).toHaveLength(1);
  await writeFile(path.join(evidenceDirectory, 'guarded-exit-retry-focus-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    nativeInput: 'Chrome browser fake audio input; not a physical microphone',
    candidateId: candidate === null || candidate === void 0 ? void 0 : candidate.id,
    acceptedBeforeRetry: (_failed$project3 = failed.project) === null || _failed$project3 === void 0 ? void 0 : _failed$project3.acceptedByTurn,
    acceptedAfterRetry: (_accepted$project2 = accepted.project) === null || _accepted$project2 === void 0 ? void 0 : _accepted$project2.acceptedByTurn,
    failureTrace: acceptanceFailure,
    successfulAcceptOperations,
    focusBeforeToastExpiry: beforeToastExpiry,
    retryFocusedAfterToastExpiry,
    boundaryReturnFocusedExit: await page.locator('[data-logical-focus="exit"]').evaluate(element => element === document.activeElement)
  }, null, 2), 'utf8');
});
async function waitForSavedCandidate(page, layout) {
  var _URL$searchParams$get, _database$project;
  const notice = layout === 'A' ? page.locator('.record-panel .notice') : page.locator('.record-status--b .notice');
  await expect(notice).toContainText('Take saved as a recoverable candidate. It has not been accepted.', {
    timeout: 15000
  });
  await expect(page.locator('.waveform-take')).toHaveCount(1);
  const database = await readIndexedDb(page);
  const currentTurnId = (_URL$searchParams$get = new URL(page.url()).searchParams.get('turn')) !== null && _URL$searchParams$get !== void 0 ? _URL$searchParams$get : 'sintel-turn-1';
  const draftByTurn = (_database$project = database.project) === null || _database$project === void 0 ? void 0 : _database$project.draftCandidateByTurn;
  const current = database.media.find(candidate => candidate.id === (draftByTurn === null || draftByTurn === void 0 ? void 0 : draftByTurn[currentTurnId]));
  expect(current === null || current === void 0 ? void 0 : current.blobSize).toBeGreaterThan(0);
  expect(current === null || current === void 0 ? void 0 : current.blobSize).toBe(current === null || current === void 0 ? void 0 : current.byteSize);
  expect(current === null || current === void 0 ? void 0 : current.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect((current === null || current === void 0 ? void 0 : current.probe).byteSize).toBe(current === null || current === void 0 ? void 0 : current.blobSize);
  return current;
}
async function recordCurrentWindow(page, layout) {
  const recordButton = page.getByRole('button', {
    name: 'Record',
    exact: true
  });
  await expect(recordButton).toBeEnabled();
  await recordButton.click();
  await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBeGreaterThan(0);
  const startedAt = await page.locator('video').evaluate(video => video.currentTime);
  await page.waitForTimeout(400);
  const movedTo = await page.locator('video').evaluate(video => video.currentTime);
  expect(movedTo).toBeGreaterThan(startedAt);
  await expect(page.getByRole('button', {
    name: /Countdown|Stop recording|Pause recording/i
  })).toHaveCount(0);
  await waitForSavedCandidate(page, layout);
}
test.beforeAll(async () => mkdir(evidenceDirectory, {
  recursive: true
}));
test('Exit returns through the guarded Projects boundary and restores focus to the logical Exit control', async ({
  page
}) => {
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
  await page.getByRole('button', {
    name: 'Exit',
    exact: true
  }).click();
  await expect(page).toHaveURL(/\/projects\?/);
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=exit/);
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
  await page.screenshot({
    path: path.join(evidenceDirectory, 'exit-boundary-return-focus.png')
  });
});
test('delayed source playback keeps the recorder idle until the prepared window actually starts', async ({
  page,
  browser
}) => {
  var _beforeRealPlayback$v, _trace$requestedAt, _trace$nativePlayAt, _trace$requestedAt2, _trace$nativePlayAt2, _trace$playingAt, _trace$recorderStartV, _trace$playingVideoTi, _trace$playingVideoTi2, _trace$recorderStopVi, _trace$recorderStopVi2, _trace$recorderStartV2;
  test.setTimeout(45000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
    timeout: 15000
  }).toBe(true);
  const preparedWindow = await page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const project = await new Promise((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const selected = project.windows.find(window => window.id === 'sintel-turn-1');
    if (!selected) throw new Error('Prepared turn 1 is missing its source window.');
    return selected;
  });
  await page.locator('video').evaluate(element => {
    const video = element;
    const trace = {
      requestedAt: null,
      nativePlayAt: null,
      playingAt: null,
      playingVideoTime: null,
      recorderStartAt: null,
      recorderStartVideoTime: null,
      recorderStopAt: null,
      recorderStopVideoTime: null
    };
    window.__delayedCaptureTrace = trace;
    const nativePlay = video.play.bind(video);
    Object.defineProperty(video, 'play', {
      configurable: true,
      value: () => {
        trace.requestedAt = performance.now();
        return new Promise((resolve, reject) => {
          window.setTimeout(() => {
            trace.nativePlayAt = performance.now();
            nativePlay().then(resolve, reject);
          }, 1200);
        });
      }
    });
    video.addEventListener('playing', () => {
      trace.playingAt = performance.now();
      trace.playingVideoTime = video.currentTime;
    }, {
      once: true
    });
    const start = MediaRecorder.prototype.start;
    MediaRecorder.prototype.start = function (...args) {
      trace.recorderStartAt = performance.now();
      trace.recorderStartVideoTime = video.currentTime;
      return start.apply(this, args);
    };
    const stop = MediaRecorder.prototype.stop;
    MediaRecorder.prototype.stop = function (...args) {
      trace.recorderStopAt = performance.now();
      trace.recorderStopVideoTime = video.currentTime;
      return stop.apply(this, args);
    };
  });
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await expect(page.getByRole('button', {
    name: 'Preparing recording…',
    exact: true
  })).toBeVisible();
  await page.waitForTimeout(350);
  const beforeRealPlayback = await page.evaluate(() => {
    var _document$querySelect, _document$querySelect2;
    const trace = window.__delayedCaptureTrace;
    return {
      ...trace,
      videoTime: (_document$querySelect = (_document$querySelect2 = document.querySelector('video')) === null || _document$querySelect2 === void 0 ? void 0 : _document$querySelect2.currentTime) !== null && _document$querySelect !== void 0 ? _document$querySelect : null
    };
  });
  expect(beforeRealPlayback.requestedAt).not.toBeNull();
  expect(beforeRealPlayback.recorderStartAt).toBeNull();
  expect(beforeRealPlayback.videoTime).not.toBeNull();
  expect(Math.abs(((_beforeRealPlayback$v = beforeRealPlayback.videoTime) !== null && _beforeRealPlayback$v !== void 0 ? _beforeRealPlayback$v : 0) - preparedWindow.startMs / 1000)).toBeLessThanOrEqual(0.05);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'delayed-source-preparing.png')
  });
  const candidate = await waitForSavedCandidate(page, 'A');
  const trace = await page.evaluate(() => window.__delayedCaptureTrace);
  const expectedDuration = (preparedWindow.endMs - preparedWindow.startMs) / 1000;
  expect(trace.nativePlayAt).toBeGreaterThan((_trace$requestedAt = trace.requestedAt) !== null && _trace$requestedAt !== void 0 ? _trace$requestedAt : 0);
  expect(((_trace$nativePlayAt = trace.nativePlayAt) !== null && _trace$nativePlayAt !== void 0 ? _trace$nativePlayAt : 0) - ((_trace$requestedAt2 = trace.requestedAt) !== null && _trace$requestedAt2 !== void 0 ? _trace$requestedAt2 : 0)).toBeGreaterThanOrEqual(1150);
  expect(trace.playingAt).toBeGreaterThanOrEqual((_trace$nativePlayAt2 = trace.nativePlayAt) !== null && _trace$nativePlayAt2 !== void 0 ? _trace$nativePlayAt2 : 0);
  expect(trace.recorderStartAt).toBeGreaterThanOrEqual((_trace$playingAt = trace.playingAt) !== null && _trace$playingAt !== void 0 ? _trace$playingAt : 0);
  expect(Math.abs(((_trace$recorderStartV = trace.recorderStartVideoTime) !== null && _trace$recorderStartV !== void 0 ? _trace$recorderStartV : 0) - ((_trace$playingVideoTi = trace.playingVideoTime) !== null && _trace$playingVideoTi !== void 0 ? _trace$playingVideoTi : 0))).toBeLessThanOrEqual(0.05);
  expect((_trace$playingVideoTi2 = trace.playingVideoTime) !== null && _trace$playingVideoTi2 !== void 0 ? _trace$playingVideoTi2 : 0).toBeGreaterThanOrEqual(preparedWindow.startMs / 1000 - 0.05);
  expect((_trace$recorderStopVi = trace.recorderStopVideoTime) !== null && _trace$recorderStopVi !== void 0 ? _trace$recorderStopVi : 0).toBeGreaterThanOrEqual(preparedWindow.endMs / 1000 - 0.15);
  expect(Math.abs(((_trace$recorderStopVi2 = trace.recorderStopVideoTime) !== null && _trace$recorderStopVi2 !== void 0 ? _trace$recorderStopVi2 : 0) - ((_trace$recorderStartV2 = trace.recorderStartVideoTime) !== null && _trace$recorderStartV2 !== void 0 ? _trace$recorderStartV2 : 0) - expectedDuration)).toBeLessThanOrEqual(0.2);
  expect(candidate === null || candidate === void 0 ? void 0 : candidate.blobSize).toBeGreaterThan(0);
  expect(candidate === null || candidate === void 0 ? void 0 : candidate.sha256).toMatch(/^[a-f0-9]{64}$/);
  expect((candidate === null || candidate === void 0 ? void 0 : candidate.probe).decodedFrames).toBeGreaterThan(0);
  expect(await evidenceCounters(page)).toEqual({
    getUserMediaCalls: 1,
    recorderStarts: 1
  });
  await page.screenshot({
    path: path.join(evidenceDirectory, 'delayed-source-candidate.png')
  });
  await writeFile(path.join(evidenceDirectory, 'delayed-source-native-capture.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    input: 'Chrome browser fake audio input; not a physical microphone',
    sourcePlayDelayMs: 1200,
    preparedWindow,
    expectedDuration,
    beforeRealPlayback,
    nativeTrace: trace,
    persistedCandidate: candidate,
    apiCounters: await evidenceCounters(page)
  }, null, 2), 'utf8');
});
for (const layout of ['A', 'B']) {
  test(`Layout ${layout} records real browser fake input, recovers the candidate, and completes the accepted snapshot`, async ({
    page,
    browser
  }) => {
    var _ref3, _media$project, _finalDatabase$projec, _shortResult$title, _shortResult$exit;
    test.setTimeout(60000);
    await page.setViewportSize({
      width: 1440,
      height: 900
    });
    await instrumentNativeMedia(page);
    await page.goto(`/projects/sintel-prepared/record?layout=${layout}&locale=en`);
    if (layout === 'A') await expect(page.getByRole('heading', {
      name: 'Sintel · The Search'
    })).toBeVisible();else {
      await expect(page.locator('.record-header h1')).toBeVisible();
      await expect(page.locator('.position-dots')).toBeVisible();
      await expect(page.locator('.record-header__line-count')).toHaveText('Line 1 / 3');
    }
    await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
      timeout: 15000
    }).toBe(true);
    await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('button', {
      name: 'Exit',
      exact: true
    })).toBeInViewport();
    if (layout === 'A') {
      await expect(page.getByRole('heading', {
        name: 'Sintel · The Search'
      })).toBeInViewport();
      await expect(page.getByLabel('Current line')).toBeInViewport();
    } else {
      await expect(page.locator('.record-header__line-count')).toBeInViewport();
      await expect(page.getByLabel('Current line')).toBeInViewport();
    }
    const dialogue = page.locator('.dialogue-copy p');
    const englishDialogue = await dialogue.textContent();
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    const russianDialogue = await dialogue.textContent();
    expect(russianDialogue).not.toBe(englishDialogue);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-russian.png`)
    });
    await setRecordLocale(page, 'en');
    await expect(dialogue).toHaveText(englishDialogue !== null && englishDialogue !== void 0 ? englishDialogue : '');
    await expect(page.locator('.record-header .locale-control')).toHaveCount(0);
    await expect(page.locator('.record-header .lucide-log-out')).toHaveCount(1);
    await expect(page.locator('.record-controls button').filter({
      hasText: 'Previous'
    }).locator('.lucide-chevron-left')).toHaveCount(1);
    const initialButton = page.getByRole('button', {
      name: 'Record',
      exact: true
    });
    await expect(initialButton).toBeEnabled();
    expect(await evidenceCounters(page)).toEqual({
      getUserMediaCalls: 0,
      recorderStarts: 0
    });
    const headerEvidence = await page.evaluate(() => {
      const inspect = selector => {
        var _element$textContent$, _element$textContent;
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          text: (_element$textContent$ = (_element$textContent = element.textContent) === null || _element$textContent === void 0 ? void 0 : _element$textContent.trim()) !== null && _element$textContent$ !== void 0 ? _element$textContent$ : '',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          color: style.color,
          opacity: style.opacity,
          visibility: style.visibility,
          display: style.display
        };
      };
      return {
        exit: inspect('.exit-link'),
        title: inspect('.record-header h1'),
        locale: inspect('.locale-control'),
        dots: inspect('.position-dots'),
        mabryLoaded: document.fonts.check('400 26px "Mabry Pro"'),
        dialogueFont: getComputedStyle(document.querySelector('.dialogue-copy p')).fontFamily,
        scrollY: window.scrollY
      };
    });
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-ready.png`)
    });
    const viewport = await page.locator('.media-viewport').boundingBox();
    const wave = await page.locator('.waveform-stack').boundingBox();
    const controls = await page.locator('.record-controls').boundingBox();
    expect(viewport).not.toBeNull();
    expect(wave).not.toBeNull();
    expect(controls).not.toBeNull();
    if (viewport) {
      var _exit$x;
      const center = viewport.x + viewport.width / 2;
      const visibleCenter = await page.evaluate(() => document.documentElement.clientWidth / 2);
      expect(Math.abs(center - visibleCenter)).toBeLessThanOrEqual(1);
      const exit = await page.getByRole('button', {
        name: 'Exit',
        exact: true
      }).boundingBox();
      expect(Math.abs(((_exit$x = exit === null || exit === void 0 ? void 0 : exit.x) !== null && _exit$x !== void 0 ? _exit$x : -999) - viewport.x)).toBeLessThanOrEqual(1);
    }
    if (viewport && layout === 'A') {
      const panel = await page.locator('.record-panel').boundingBox();
      expect(panel === null || panel === void 0 ? void 0 : panel.width).toBe(272);
      expect(panel.x - (viewport.x + viewport.width)).toBeGreaterThanOrEqual(23);
      expect(viewport.x).toBeGreaterThanOrEqual(32);
    }
    if (wave && controls && layout === 'B') expect(controls.y - (wave.y + wave.height)).toBeGreaterThanOrEqual(23);
    const expectPanelAligned = async () => {
      if (layout !== 'A') return;
      const bounds = await page.evaluate(() => ({
        mediaY: document.querySelector('.media-viewport').getBoundingClientRect().y,
        panelY: document.querySelector('.record-panel').getBoundingClientRect().y
      }));
      expect(Math.abs(bounds.panelY - bounds.mediaY)).toBeLessThanOrEqual(1);
    };
    await expectPanelAligned();
    await page.getByRole('button', {
      name: 'Original',
      exact: true
    }).click();
    await expect.poll(() => page.locator('video').evaluate(video => video.currentTime)).toBeGreaterThan(0.1);
    await page.getByRole('button', {
      name: 'Pause',
      exact: true
    }).click();
    await page.getByRole('button', {
      name: 'Resume',
      exact: true
    }).click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(0);
    await page.getByRole('button', {
      name: 'Record',
      exact: true
    }).click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(1);
    await expectPanelAligned();
    const recordingNotice = layout === 'A' ? page.locator('.record-panel .notice') : page.locator('.record-status--b .notice');
    await expect(recordingNotice).toContainText('Recording the full prepared window. It will stop automatically.');
    await expect(page.getByRole('button', {
      name: /Countdown|Stop recording|Pause recording/i
    })).toHaveCount(0);
    await waitForSavedCandidate(page, layout);
    await expectPanelAligned();
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-candidate.png`)
    });
    const audio = page.locator('audio');
    await page.getByRole('button', {
      name: 'Your take',
      exact: true
    }).click();
    await expect.poll(() => audio.evaluate(element => element.currentTime)).toBeGreaterThan(0.05);
    expect(await audio.getAttribute('src')).toContain('blob:');
    if (layout === 'A') {
      var _ref2, _beforeReload$project;
      await page.getByRole('button', {
        name: 'Exit',
        exact: true
      }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDirectory, 'layout-a-1440x900-candidate-guard.png')
      });
      await page.getByRole('dialog').getByRole('button', {
        name: 'Stay here',
        exact: true
      }).last().click();
      await expect(page.getByRole('dialog')).toBeHidden();
      const beforeReload = await readIndexedDb(page);
      expect(Object.values((_ref2 = (_beforeReload$project = beforeReload.project) === null || _beforeReload$project === void 0 ? void 0 : _beforeReload$project.acceptedByTurn) !== null && _ref2 !== void 0 ? _ref2 : {})).toHaveLength(0);
      const countersBeforeReload = await evidenceCounters(page);
      await page.reload();
      await expect(page.getByRole('button', {
        name: 'Your take',
        exact: true
      })).toBeEnabled();
      expect(await evidenceCounters(page)).toEqual(countersBeforeReload);
      await page.screenshot({
        path: path.join(evidenceDirectory, 'layout-a-1440x900-reloaded-candidate.png')
      });
    }
    await page.setViewportSize({
      width: 390,
      height: 667
    });
    if (layout === 'A') await expect(page.getByRole('heading', {
      name: 'Sintel · The Search'
    })).toBeVisible();else {
      await expect(page.locator('.record-header__line-count')).toBeVisible();
      await expect(page.getByRole('heading', {
        name: 'Sintel · The Search'
      })).toBeVisible();
      await expect(page.getByLabel('Current line')).toBeVisible();
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(horizontalOverflow).toBe(false);
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    const targetSize = await page.locator('.record-action').boundingBox();
    expect(targetSize === null || targetSize === void 0 ? void 0 : targetSize.height).toBeGreaterThanOrEqual(48);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-russian.png`)
    });
    await setRecordLocale(page, 'en');
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x667-ready.png`)
    });
    await page.setViewportSize({
      width: 1440,
      height: 900
    });
    await page.getByRole('button', {
      name: 'Next',
      exact: true
    }).click();
    await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-2`));
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-2-russian.png`)
    });
    await setRecordLocale(page, 'en');
    await recordCurrentWindow(page, layout);
    await page.getByRole('button', {
      name: 'Next',
      exact: true
    }).click();
    await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-3`));
    await setRecordLocale(page, 'ru');
    await expect(dialogue).toContainText(/[\u0400-\u04FF]/);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-turn-3-russian.png`)
    });
    await setRecordLocale(page, 'en');
    await recordCurrentWindow(page, layout);
    const media = await readIndexedDb(page);
    expect(media.media.filter(candidate => candidate.purpose === 'recording')).toHaveLength(3);
    expect(Object.values((_ref3 = (_media$project = media.project) === null || _media$project === void 0 ? void 0 : _media$project.acceptedByTurn) !== null && _ref3 !== void 0 ? _ref3 : {})).toHaveLength(2);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-final-candidate.png`)
    });
    if (layout === 'A') {
      await page.route('**/media/example-dub.mp4', route => route.fulfill({
        status: 503,
        body: 'fixture unavailable for the first attempts'
      }));
      await page.setViewportSize({
        width: 390,
        height: 667
      });
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await page.getByRole('button', {
        name: 'Next',
        exact: true
      }).evaluate(button => button.click());
      await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
      await expect(page.getByRole('heading', {
        name: 'Your result'
      })).toBeInViewport();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await expect.poll(() => page.evaluate(() => {
        var _document$activeEleme5;
        return (_document$activeEleme5 = document.activeElement) === null || _document$activeEleme5 === void 0 ? void 0 : _document$activeEleme5.tagName;
      })).toBe('H1');
      await page.setViewportSize({
        width: 1440,
        height: 900
      });
    } else {
      await page.getByRole('button', {
        name: 'Exit',
        exact: true
      }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', {
        name: 'Save and leave',
        exact: true
      }).click();
      await expect(page).toHaveURL(/\/projects\?returnProject=sintel-prepared&returnLayout=B&returnFocus=exit/);
      await page.getByTestId('return-to-saved-record').click();
      await expect(page).toHaveURL(/\/projects\/sintel-prepared\/record\?layout=B&turn=sintel-turn-3/);
      await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
    }
    let finalDatabase = await readIndexedDb(page);
    expect((_finalDatabase$projec = finalDatabase.project) === null || _finalDatabase$projec === void 0 ? void 0 : _finalDatabase$projec.initialResultSnapshotId).toBeTruthy();
    expect(finalDatabase.snapshots).toHaveLength(1);
    const snapshot = finalDatabase.snapshots[0];
    expect(snapshot.authorization).toBe('initial-completion');
    expect(snapshot.takes).toHaveLength(3);
    expect(snapshot.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    if (layout === 'B') {
      var _finalDatabase$projec2, _finalDatabase$projec3;
      const snapshotId = String((_finalDatabase$projec2 = (_finalDatabase$projec3 = finalDatabase.project) === null || _finalDatabase$projec3 === void 0 ? void 0 : _finalDatabase$projec3.latestResultSnapshotId) !== null && _finalDatabase$projec2 !== void 0 ? _finalDatabase$projec2 : '');
      expect(snapshotId).toBeTruthy();
      await page.goto(`/projects/sintel-prepared/result?layout=B&snapshot=${encodeURIComponent(snapshotId)}`);
    }
    await expect(page.getByRole('heading', {
      name: 'Your result'
    })).toBeVisible();
    await expect(page.locator('.result-player__source-tabs button').filter({
      hasText: 'My dub'
    })).toBeVisible();
    await expect(page.locator('.result-header h1')).toBeFocused();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.locator('.result-header .lucide-log-out').count()).toBe(1);
    expect(await page.locator('.result-workspace__actions button').filter({
      hasText: 'Return to recording'
    }).locator('.lucide-undo-2').count()).toBe(1);
    if (layout === 'A') {
      await expect(page.getByRole('button', {
        name: 'Retry assembly',
        exact: true
      })).toBeVisible();
      await expect(page.getByText('The result sample could not be loaded. Your accepted takes and previous result remain unchanged.')).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDirectory, 'layout-a-result-fixture-unavailable.png')
      });
      await page.unroute('**/media/example-dub.mp4');
      await page.getByRole('button', {
        name: 'Retry assembly',
        exact: true
      }).click();
    }
    await expect(page.getByText('Illustrative sample ready')).toBeVisible({
      timeout: 15000
    });
    const resultVideo = page.getByTestId('result-video');
    await expect(resultVideo).toHaveAttribute('data-source', 'dub');
    await expect(resultVideo).toHaveAttribute('src', /^blob:/);
    await expect.poll(() => resultVideo.evaluate(video => video.videoWidth > 0)).toBe(true);
    await expect.poll(() => resultVideo.evaluate(video => video.paused)).toBe(true);
    const presentedGenerationId = await resultVideo.getAttribute('data-generation-id');
    expect(presentedGenerationId).toMatch(/^generation:/);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-ready.png`)
    });
    const normalResult = await page.evaluate(() => {
      const bounds = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom
        };
      };
      return {
        title: bounds('.result-header h1'),
        exit: bounds('.result-header .exit-link'),
        screen: bounds('.result-player__screen'),
        seek: bounds('.result-player__seek'),
        controls: bounds('.result-player__transport-row')
      };
    });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1440x900-result-metrics.json`), JSON.stringify(normalResult, null, 2), 'utf8');
    expect(Math.abs(normalResult.title.y - (layout === 'A' ? 20 : 27))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.exit.y - (layout === 'A' ? 20 : 28))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.screen.y - (layout === 'A' ? 108 : 104))).toBeLessThanOrEqual(1);
    expect(Math.abs(normalResult.screen.width - 920)).toBeLessThanOrEqual(2);
    expect(normalResult.seek.bottom).toBeLessThanOrEqual(normalResult.controls.y + 1);
    if (layout === 'A') {
      await setRecordLocale(page, 'ru');
      await expect(page.getByRole('heading', {
        name: 'Ваш результат'
      })).toBeVisible();
      await page.screenshot({
        path: path.join(evidenceDirectory, 'layout-a-1440x900-result-ru.png')
      });
      await setRecordLocale(page, 'en');
      await expect(page.getByRole('heading', {
        name: 'Your result'
      })).toBeVisible();
    }
    await page.setViewportSize(layout === 'A' ? {
      width: 390,
      height: 667
    } : {
      width: 390,
      height: 844
    });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect.poll(() => page.locator('.result-header .exit-link').evaluate(element => getComputedStyle(element).transform)).toBe('none');
    const phoneResult = await page.evaluate(() => {
      const bounds = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom
        };
      };
      return {
        screen: bounds('.result-player__screen'),
        exit: bounds('.result-header .exit-link'),
        title: bounds('.result-header h1'),
        seek: bounds('.result-player__seek'),
        controls: bounds('.result-player__transport-row'),
        volume: bounds('.result-player__volume input'),
        source: bounds('.result-player__source-tabs button'),
        actions: Array.from(document.querySelectorAll('.result-workspace__actions .button'), element => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom
          };
        })
      };
    });
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-ready.png`),
      fullPage: true
    });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-phone-result-metrics.json`), JSON.stringify(phoneResult, null, 2), 'utf8');
    expect(Math.abs(phoneResult.screen.x - 16)).toBeLessThanOrEqual(1);
    expect(Math.abs(phoneResult.screen.width - 358)).toBeLessThanOrEqual(1);
    expect(phoneResult.screen.y).toBe(layout === 'A' ? 164 : 168);
    expect(phoneResult.exit.y).toBe(40);
    expect(phoneResult.title.y).toBe(layout === 'A' ? 97 : 96);
    expect(phoneResult.seek.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.controls.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.volume.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.source.height).toBeGreaterThanOrEqual(48);
    expect(phoneResult.actions).toHaveLength(2);
    expect(phoneResult.actions.every(action => action.height >= 48)).toBe(true);
    expect(phoneResult.actions[1].y).toBeGreaterThan(phoneResult.actions[0].y);
    await page.setViewportSize({
      width: 1280,
      height: 600
    });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
    const shortResult = await page.evaluate(() => {
      const bounds = selector => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          bottom: rect.bottom
        };
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
        actions: bounds('.result-workspace__actions')
      };
    });
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-ready.png`)
    });
    await writeFile(path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-1280x600-result-metrics.json`), JSON.stringify(shortResult, null, 2), 'utf8');
    expect(shortResult.documentHeight).toBeLessThanOrEqual(600);
    expect((_shortResult$title = shortResult.title) === null || _shortResult$title === void 0 ? void 0 : _shortResult$title.y).toBe(16);
    expect((_shortResult$exit = shortResult.exit) === null || _shortResult$exit === void 0 ? void 0 : _shortResult$exit.y).toBe(16);
    expect(shortResult.title.bottom).toBeLessThanOrEqual(600);
    const shortTarget = layout === 'A' ? {
      y: 88,
      width: 548
    } : {
      y: 80,
      width: 562
    };
    expect(Math.abs(shortResult.screen.y - shortTarget.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(shortResult.screen.width - shortTarget.width)).toBeLessThanOrEqual(4);
    expect(shortResult.seek.bottom).toBeLessThanOrEqual(shortResult.controls.y + 1);
    expect(shortResult.actions.height).toBeGreaterThanOrEqual(88);
    expect(shortResult.actions.bottom).toBeLessThanOrEqual(600);
    await page.setViewportSize({
      width: 1440,
      height: 900
    });
    const originalSource = page.locator('.result-player__source-tabs button').filter({
      hasText: 'Original'
    });
    const dubSource = page.locator('.result-player__source-tabs button').filter({
      hasText: 'My dub'
    });
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
    await page.getByRole('button', {
      name: 'Play',
      exact: true
    }).click();
    await expect.poll(() => resultVideo.evaluate(video => video.currentTime)).toBeGreaterThan(0.2);
    const switchTime = await resultVideo.evaluate(video => video.currentTime);
    await dubSource.click();
    await expect(dubSource).toHaveAttribute('aria-pressed', 'true');
    await expect(originalSource).toHaveAttribute('aria-pressed', 'false');
    await expect(resultVideo).toHaveAttribute('data-generation-id', presentedGenerationId !== null && presentedGenerationId !== void 0 ? presentedGenerationId : '');
    await expect.poll(() => resultVideo.evaluate(video => !video.paused)).toBe(true);
    await expect.poll(async () => Math.abs((await resultVideo.evaluate(video => video.currentTime)) - switchTime)).toBeLessThan(1.5);
    const resultSeek = page.locator('.result-player__seek');
    await resultSeek.focus();
    await page.keyboard.down('ArrowRight');
    await expect.poll(() => resultVideo.evaluate(video => video.paused)).toBe(true);
    await page.keyboard.up('ArrowRight');
    await expect.poll(() => resultVideo.evaluate(video => !video.paused)).toBe(true);
    const afterKeyboardRelease = await resultVideo.evaluate(video => video.currentTime);
    await expect.poll(() => resultVideo.evaluate(video => video.currentTime)).toBeGreaterThan(afterKeyboardRelease);
    await resultVideo.evaluate(video => video.pause());
    await resultSeek.dispatchEvent('pointerdown');
    await expect.poll(() => resultVideo.evaluate(video => video.paused)).toBe(true);
    await resultSeek.dispatchEvent('pointercancel');
    await expect.poll(() => resultVideo.evaluate(video => video.paused)).toBe(true);
    await page.getByRole('button', {
      name: 'Play',
      exact: true
    }).click();
    await expect.poll(() => resultVideo.evaluate(video => !video.paused)).toBe(true);
    await resultSeek.dispatchEvent('pointerdown');
    await resultSeek.evaluate(input => input.blur());
    await expect.poll(() => resultVideo.evaluate(video => video.paused)).toBe(true);
    const currentGenerationBeforeDownload = await resultVideo.getAttribute('data-generation-id');
    await originalSource.click();
    await expect(resultVideo).toHaveAttribute('data-source', 'original');
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', {
      name: 'Download My dub',
      exact: true
    }).click()]);
    const downloadPath = path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-download-example-dub.mp4`);
    await download.saveAs(downloadPath);
    expect(download.suggestedFilename()).toBe('example-dub.mp4');
    const downloadedBytes = await readFile(downloadPath);
    const expectedFixtureBytes = await readFile(path.resolve(process.cwd(), 'public', 'media', 'example-dub.mp4'));
    const downloadedSha256 = createHash('sha256').update(downloadedBytes).digest('hex');
    expect(downloadedBytes.equals(expectedFixtureBytes)).toBe(true);
    const resultDatabase = await page.evaluate(async () => {
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('dubbed-core-local-v1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const read = name => new Promise((resolve, reject) => {
        const request = database.transaction(name, 'readonly').objectStore(name).getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const jobs = await read('resultJobs');
      const resultMedia = await read('resultMedia');
      database.close();
      return {
        jobs: jobs.map(({
          id,
          snapshotId,
          status,
          productRendered,
          assembledFromAcceptedTakes
        }) => ({
          id,
          snapshotId,
          status,
          productRendered,
          assembledFromAcceptedTakes
        })),
        media: resultMedia.map(({
          id,
          filename,
          byteSize,
          sha256,
          blob
        }) => ({
          id,
          filename,
          byteSize,
          sha256,
          blobSize: blob.size
        }))
      };
    });
    expect(resultDatabase.jobs).toContainEqual(expect.objectContaining({
      id: currentGenerationBeforeDownload,
      status: 'ready',
      productRendered: false,
      assembledFromAcceptedTakes: false
    }));
    expect(resultDatabase.media).toContainEqual(expect.objectContaining({
      id: currentGenerationBeforeDownload,
      filename: 'example-dub.mp4',
      byteSize: expectedFixtureBytes.byteLength,
      blobSize: expectedFixtureBytes.byteLength,
      sha256: downloadedSha256
    }));
    await page.setViewportSize({
      width: 390,
      height: 844
    });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.getByRole('button', {
      name: 'Download My dub',
      exact: true
    }).boundingBox().then(box => {
      var _box$height;
      return (_box$height = box === null || box === void 0 ? void 0 : box.height) !== null && _box$height !== void 0 ? _box$height : 0;
    })).toBeGreaterThanOrEqual(48);
    const mobileTargets = await page.evaluate(() => Array.from(document.querySelectorAll('.result-player__seek, .result-player__volume input'), element => {
      const bounds = element.getBoundingClientRect();
      return {
        label: element.getAttribute('aria-label'),
        height: bounds.height,
        width: bounds.width
      };
    }));
    expect(mobileTargets).toHaveLength(2);
    expect(mobileTargets.every(target => target.height >= 48)).toBe(true);
    await expect(page.locator('.result-player__seek')).toBeEnabled();
    await expect(page.locator('.result-player__volume input')).toBeEnabled();
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-390x844-result-ready.png`),
      fullPage: true
    });
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
      captures: finalDatabase.media.filter(candidate => candidate.purpose === 'recording'),
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
        media: resultDatabase.media
      },
      assertions: ['No getUserMedia or MediaRecorder before explicit Record', 'video moved during each native recording', 'captured Blob persisted and hashed', 'accepted snapshot includes exact three recorded candidates', 'native controls remained locked during capture', 'Result generation consumed the authorized immutable snapshot', 'player served exact fixture bytes and remained paused on entry', 'source switch preserved playhead and play intent', 'download from Original preview pinned the presented My dub generation', 'downloaded bytes match the persisted fixture hash', 'mobile Result has no horizontal overflow and a 48px download target']
    }, null, 2), 'utf8');
    const resultRoute = page.url();
    await page.getByRole('button', {
      name: 'Return to recording',
      exact: true
    }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/sintel-prepared/record\\?layout=${layout}&turn=sintel-turn-1`));
    const returnedRecordVideo = page.locator('.media-viewport video');
    await expect.poll(() => returnedRecordVideo.evaluate(video => video.paused)).toBe(true);
    await page.screenshot({
      path: path.join(evidenceDirectory, `layout-${layout.toLowerCase()}-result-return-first-turn.png`)
    });
    await page.goto(resultRoute);
    await expect(page.getByRole('heading', {
      name: 'Your result'
    })).toBeVisible();
    await expect.poll(() => page.getByTestId('result-video').evaluate(video => video.paused)).toBe(true);
    await expect(page.getByTestId('result-video')).toHaveAttribute('data-source', 'dub');
    if (layout === 'A') {
      const leavingVideo = await page.getByTestId('result-video').evaluateHandle(video => video);
      await page.getByRole('button', {
        name: 'Play',
        exact: true
      }).click();
      await expect.poll(() => page.getByTestId('result-video').evaluate(video => !video.paused)).toBe(true);
      await page.getByRole('button', {
        name: 'Exit',
        exact: true
      }).click();
      await expect(page).toHaveURL(/\/projects\?.*returnFocus=exit/);
      expect(await leavingVideo.evaluate(video => video.paused)).toBe(true);
      await page.getByTestId('return-to-saved-record').click();
      await expect(page).toHaveURL(/returnFocus=exit/);
      await expect(page.locator('[data-logical-focus="exit"]')).toBeFocused();
    }
    if (layout === 'B') {
      await page.evaluate(async () => {
        const root = document.getElementById('root');
        if (!root) throw new Error('The React root is unavailable.');
        const rootKey = Object.keys(root).find(key => key.startsWith('__reactContainer$'));
        if (!rootKey) throw new Error('The React root fiber is unavailable.');
        const pending = [root[rootKey]];
        let store = null;
        while (pending.length > 0) {
          var _props$services2;
          const fiber = pending.pop();
          if (!fiber) continue;
          const props = fiber.memoizedProps;
          if (props !== null && props !== void 0 && (_props$services2 = props.services) !== null && _props$services2 !== void 0 && _props$services2.results) store = props.services.results;
          if (fiber.child) pending.push(fiber.child);
          if (fiber.sibling) pending.push(fiber.sibling);
        }
        if (!store) throw new Error('The active typed ResultPort was not found in the services provider.');
        const originalRead = store.readGenerationMedia.bind(store);
        const target = window;
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
      page.on('download', () => {
        downloadEvents += 1;
      });
      await page.getByRole('button', {
        name: 'Download My dub',
        exact: true
      }).click();
      await expect(page.locator('[data-testid="deleted-project-boundary"]')).toBeVisible();
      expect(await page.evaluate(() => window.__deletedBeforeGenerationDelivery)).toBe(true);
      expect(downloadEvents).toBe(0);
      await expect(page.getByTestId('result-player')).toHaveCount(0);
      await page.screenshot({
        path: path.join(evidenceDirectory, 'B-download-tombstoned-before-delivery.png'),
        fullPage: true
      });
    }
  });
}
test('completed revision stays in Record after Next and needs explicit To result authorization', async ({
  page,
  browser
}) => {
  var _initial$project$init, _initial$project;
  test.setTimeout(75000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect.poll(() => page.locator('video').evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0), {
    timeout: 15000
  }).toBe(true);
  await expect(page.locator('.waveform-row')).toHaveAttribute('data-source-waveform', 'decoded');
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  for (const turn of [1, 2, 3]) {
    await recordCurrentWindow(page, 'A');
    await page.getByRole('button', {
      name: 'Next',
      exact: true
    }).click();
    if (turn < 3) await expect(page).toHaveURL(new RegExp(`turn=sintel-turn-${turn + 1}`));
  }
  await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  await expect(page.getByText('Illustrative sample ready')).toBeVisible({
    timeout: 15000
  });
  const initial = await readIndexedDb(page);
  const initialSnapshotId = String((_initial$project$init = (_initial$project = initial.project) === null || _initial$project === void 0 ? void 0 : _initial$project.initialResultSnapshotId) !== null && _initial$project$init !== void 0 ? _initial$project$init : '');
  expect(initialSnapshotId).toBeTruthy();
  await page.screenshot({
    path: path.join(evidenceDirectory, 'phase4-initial-result-before-revision.png'),
    fullPage: true
  });
  await page.getByRole('button', {
    name: 'Return to recording',
    exact: true
  }).click();
  await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  const returnLocks = await page.evaluate(() => window.__lockEvidence);
  expect(returnLocks.requests).toHaveLength(2);
  expect(returnLocks.callbacks).toEqual(['acquired', 'acquired']);
  await recordCurrentWindow(page, 'A');
  await page.getByRole('button', {
    name: 'Next',
    exact: true
  }).click();
  await expect(page).toHaveURL(/\/record\?layout=A&turn=sintel-turn-1/);
  await expect(page.getByRole('button', {
    name: 'To result',
    exact: true
  })).toBeVisible();
  await expect(page).not.toHaveURL(/\/result/);
  const afterReplacementNext = page.url();
  await page.goto('/projects/sintel-prepared/record?layout=A&turn=sintel-turn-3&locale=en');
  await expect(page.getByRole('button', {
    name: 'To result',
    exact: true
  })).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDirectory, 'phase4-completed-revision-last-turn.png'),
    fullPage: true
  });
  await page.getByRole('button', {
    name: 'To result',
    exact: true
  }).click();
  await expect(page).toHaveURL(/\/result\?layout=A&snapshot=/);
  const presentedVideo = page.getByTestId('result-video');
  await expect.poll(() => presentedVideo.evaluate(video => video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0 && video.currentSrc.startsWith('blob:')), {
    timeout: 15000
  }).toBe(true);
  await expect(page.getByText('Illustrative sample ready')).toBeVisible();
  const revised = await readIndexedDb(page);
  expect(revised.snapshots).toHaveLength(2);
  const originalSnapshot = revised.snapshots.find(snapshot => snapshot.id === initialSnapshotId);
  expect(originalSnapshot === null || originalSnapshot === void 0 ? void 0 : originalSnapshot.authorization).toBe('initial-completion');
  const explicitSnapshot = revised.snapshots.find(snapshot => snapshot.authorization === 'explicit-completed-revision');
  expect(explicitSnapshot).toBeDefined();
  if (!explicitSnapshot) throw new Error('The explicit completed revision snapshot was not persisted.');
  expect(explicitSnapshot.authorization).toBe('explicit-completed-revision');
  expect(explicitSnapshot.id).not.toBe(initialSnapshotId);
  expect(explicitSnapshot.takes).toHaveLength(3);
  const presentedMedia = await presentedVideo.evaluate(video => ({
    source: video.dataset.source,
    generationId: video.dataset.generationId,
    currentSrc: video.currentSrc,
    readyState: video.readyState,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : null,
    durationMetadata: video.duration === Infinity ? 'unknown-until-end' : Number.isNaN(video.duration) ? 'unavailable' : 'finite',
    width: video.videoWidth,
    height: video.videoHeight,
    paused: video.paused
  }));
  expect(presentedMedia.source).toBe('dub');
  await page.screenshot({
    path: path.join(evidenceDirectory, 'phase4-explicit-revision-result.png'),
    fullPage: true
  });
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
    explicitToResultClicked: true
  }, null, 2));
});
test('a second open tab cannot capture or accept while the first tab holds the local project grant', async ({
  page
}) => {
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  const secondPage = await page.context().newPage();
  await secondPage.goto('/projects/sintel-prepared/record?layout=B');
  await expect(secondPage.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeDisabled();
  await expect(secondPage.getByRole('alert')).toContainText('Another open tab currently holds this project’s local recording access.');
  await secondPage.close();
});
test('denied microphone permission is contextual and does not start MediaRecorder', async ({
  page,
  browser
}) => {
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await page.addInitScript(() => {
    window.__denyMicrophone = true;
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A');
  await expect(page.getByRole('heading', {
    name: 'Sintel · The Search'
  })).toBeVisible();
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await expect(page.getByRole('button', {
    name: 'Settings',
    exact: true
  })).toBeVisible();
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  expect(await evidenceCounters(page)).toEqual({
    getUserMediaCalls: 1,
    recorderStarts: 0
  });
  const database = await readIndexedDb(page);
  expect(database.media.filter(candidate => candidate.purpose === 'recording')).toHaveLength(0);
  const toast = page.locator('.recovery-toast');
  await expect(toast).toBeVisible();
  expect(await toast.getAttribute('aria-hidden')).toBe('true');
  expect(await toast.getByRole('button').count()).toBe(0);
  await page.waitForTimeout(1000);
  await expect(toast).toBeVisible();
  await page.waitForTimeout(6500);
  const toastBounds = await toast.boundingBox();
  expect(toastBounds).not.toBeNull();
  await page.mouse.move(toastBounds.x + toastBounds.width / 2, toastBounds.y + toastBounds.height / 2);
  await page.waitForTimeout(950);
  await expect(toast).toBeVisible();
  await page.mouse.move(20, 20);
  await expect(toast).toHaveCount(0, {
    timeout: 1500
  });
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  await page.emulateMedia({
    reducedMotion: 'reduce'
  });
  await page.reload();
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await expect(page.locator('.recovery-toast')).toBeVisible();
  const reducedMotionTransitionSeconds = await page.locator('.recovery-toast').evaluate(element => {
    var _getComputedStyle$tra;
    return Number.parseFloat((_getComputedStyle$tra = getComputedStyle(element).transitionDuration.split(',')[0]) !== null && _getComputedStyle$tra !== void 0 ? _getComputedStyle$tra : '1');
  });
  expect(reducedMotionTransitionSeconds).toBeLessThan(0.001);
  await page.mouse.wheel(0, 100);
  await expect(page.locator('.recovery-toast')).toHaveCount(0, {
    timeout: 1000
  });
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  await page.getByRole('button', {
    name: 'Settings',
    exact: true
  }).click();
  await expect(page).toHaveURL(/\/settings\/microphone\?/);
  await page.getByTestId('return-to-saved-record').click();
  await expect(page).toHaveURL(/returnFocus=settings/);
  await expect(page.locator('[data-logical-focus="settings"]')).toBeFocused();
  await writeFile(path.join(evidenceDirectory, 'permission-denied-browser-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    permission: 'test harness rejected getUserMedia with NotAllowedError; browser permission UI was not exercised',
    nativeApiEvidence: await evidenceCounters(page),
    savedRecordingCount: database.media.filter(candidate => candidate.purpose === 'recording').length,
    settingsBoundaryAvailable: await page.getByRole('button', {
      name: 'Settings',
      exact: true
    }).isVisible(),
    settingsBoundaryReturnFocus: await page.locator('[data-logical-focus="settings"]').evaluate(element => element === document.activeElement),
    recoveryToast: 'message only and aria-hidden; 8 second read interval; deliberate hover pause; reduced motion; manual wheel dismissal; durable error retained'
  }, null, 2), 'utf8');
});
test('browser lifecycle interruption saves only a usable native partial and cancels pending input safely', async ({
  page,
  browser
}) => {
  var _afterUnusable$candid, _afterUnusable$candid2, _afterDenied$candidat, _afterDenied$candidat2, _afterPendingCancel$c, _afterPendingCancel$c2, _afterUnusable$candid3, _afterDenied$candidat3, _afterPendingCancel$c3;
  test.setTimeout(45000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await expect(page.getByRole('button', {
    name: 'Record',
    exact: true
  })).toBeEnabled();
  await traceNextNativeBlobDigest(page);
  const readPreparedDuration = async () => page.evaluate(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('dubbed-core-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const project = await new Promise((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('sintel-prepared');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    const window = project.windows.find(item => item.id === 'sintel-turn-1');
    if (!window) throw new Error('Prepared turn 1 has no source window.');
    return window.endMs - window.startMs;
  });
  const preparedDurationMs = await readPreparedDuration();
  const currentCandidate = async () => {
    var _database$project2;
    const database = await readIndexedDb(page);
    const draftByTurn = (_database$project2 = database.project) === null || _database$project2 === void 0 ? void 0 : _database$project2.draftCandidateByTurn;
    const candidateId = draftByTurn === null || draftByTurn === void 0 ? void 0 : draftByTurn['sintel-turn-1'];
    return {
      database,
      candidate: database.media.find(candidate => candidate.id === candidateId)
    };
  };
  const panelBounds = async () => page.evaluate(() => ({
    media: document.querySelector('.media-viewport').getBoundingClientRect().toJSON(),
    panel: document.querySelector('.record-panel').getBoundingClientRect().toJSON()
  }));
  const expectPanelAligned = async () => {
    const bounds = await panelBounds();
    expect(Math.abs(bounds.panel.y - bounds.media.y)).toBeLessThanOrEqual(1);
    return bounds;
  };
  const setModeledVisibility = async hidden => page.evaluate(isHidden => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: isHidden
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: isHidden ? 'hidden' : 'visible'
    });
    document.dispatchEvent(new Event('visibilitychange'));
    if (isHidden) window.dispatchEvent(new Event('pagehide'));else window.dispatchEvent(new Event('pageshow'));
  }, hidden);
  const saveLifecyclePartial = async (expectedRecorderStarts, screenshotName) => {
    var _probe$durationSecond, _ref4, _database$project3;
    await page.locator('.record-action').click();
    await expect.poll(async () => (await evidenceCounters(page)).recorderStarts).toBe(expectedRecorderStarts);
    const capturingBounds = await expectPanelAligned();
    await page.screenshot({
      path: path.join(evidenceDirectory, `${screenshotName}-capturing.png`)
    });
    await page.waitForTimeout(900);
    await setModeledVisibility(true);
    await expect(page.locator('.record-panel .notice')).toContainText('interrupted recording with usable audio was saved as a candidate', {
      timeout: 15000
    });
    await expect(page.getByRole('button', {
      name: 'Your take',
      exact: true
    })).toBeEnabled();
    await expect.poll(() => page.locator('video').evaluate(video => video.paused)).toBe(true);
    const savedBounds = await expectPanelAligned();
    await page.screenshot({
      path: path.join(evidenceDirectory, `${screenshotName}-partial-saved.png`)
    });
    await expect.poll(() => page.evaluate(() => {
      var _nativeBlobDigestTra;
      return (_nativeBlobDigestTra = window.__nativeBlobDigestTrace) === null || _nativeBlobDigestTra === void 0 ? void 0 : _nativeBlobDigestTra.sha256;
    })).toMatch(/^[a-f0-9]{64}$/);
    const digest = await page.evaluate(() => window.__nativeBlobDigestTrace);
    expect(digest).toBeDefined();
    if (!digest) throw new Error('The native MediaRecorder byte digest was not observed.');
    const {
      database,
      candidate
    } = await currentCandidate();
    const probe = candidate === null || candidate === void 0 ? void 0 : candidate.probe;
    expect(candidate === null || candidate === void 0 ? void 0 : candidate.endReason).toBe('interrupted');
    expect(candidate === null || candidate === void 0 ? void 0 : candidate.blobSize).toBeGreaterThan(0);
    expect(candidate === null || candidate === void 0 ? void 0 : candidate.blobSize).toBe(candidate === null || candidate === void 0 ? void 0 : candidate.byteSize);
    expect(candidate === null || candidate === void 0 ? void 0 : candidate.sha256).toBe(digest.sha256);
    expect(candidate === null || candidate === void 0 ? void 0 : candidate.byteSize).toBe(digest.byteSize);
    expect(probe === null || probe === void 0 ? void 0 : probe.decodedFrames).toBeGreaterThan(0);
    expect(probe === null || probe === void 0 ? void 0 : probe.durationSeconds).toBeGreaterThan(0);
    expect((_probe$durationSecond = probe === null || probe === void 0 ? void 0 : probe.durationSeconds) !== null && _probe$durationSecond !== void 0 ? _probe$durationSecond : Infinity).toBeLessThan(preparedDurationMs / 1000);
    expect(Object.values((_ref4 = (_database$project3 = database.project) === null || _database$project3 === void 0 ? void 0 : _database$project3.acceptedByTurn) !== null && _ref4 !== void 0 ? _ref4 : {})).toHaveLength(0);
    await writeFile(path.join(evidenceDirectory, `${screenshotName}-evidence.json`), JSON.stringify({
      date: new Date().toISOString(),
      browser: `Chrome ${browser.version()}`,
      input: 'Chrome browser fake audio input; not a physical microphone',
      lifecycle: 'modeled document.hidden/visibilitychange and pagehide events',
      preparedDurationMs,
      nativeBlob: digest,
      persistedCandidate: candidate,
      sourceVideoPausedAfterInterruption: await page.locator('video').evaluate(video => video.paused),
      panelDuringCapture: capturingBounds,
      panelAfterSave: savedBounds
    }, null, 2), 'utf8');
    await setModeledVisibility(false);
    await page.waitForTimeout(250);
    await expect.poll(() => page.locator('video').evaluate(video => video.paused)).toBe(true);
    return candidate;
  };
  const normalBounds = await expectPanelAligned();
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR12-A-record-normal-1440x900.png')
  });
  const firstPartial = await saveLifecyclePartial(1, 'IR11-partial-1440x900');
  await page.setViewportSize({
    width: 1280,
    height: 600
  });
  const shortSavedBounds = await expectPanelAligned();
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR12-A-record-saved-1280x600.png')
  });
  const secondPartial = await saveLifecyclePartial(2, 'IR11-partial-1280x600');
  await page.evaluate(() => {
    const root = document.getElementById('root');
    if (!root) throw new Error('The React root is unavailable for the unusable-partial check.');
    const rootKey = Object.keys(root).find(key => key.startsWith('__reactContainer$'));
    if (!rootKey) throw new Error('The active React root fiber is unavailable.');
    const pending = [root[rootKey]];
    const seen = new Set();
    let services = null;
    while (pending.length > 0) {
      var _props$services3;
      const fiber = pending.pop();
      if (!fiber || seen.has(fiber)) continue;
      seen.add(fiber);
      if (fiber.alternate) pending.push(fiber.alternate);
      const props = fiber.memoizedProps;
      if (props !== null && props !== void 0 && (_props$services3 = props.services) !== null && _props$services3 !== void 0 && _props$services3.media) services = props.services;
      if (fiber.child) pending.push(fiber.child);
      if (fiber.sibling) pending.push(fiber.sibling);
    }
    if (!services) throw new Error('The active typed BrowserMediaPort was not found.');
    const original = services.media.captureFixedWindow.bind(services.media);
    let returnUnusableOnce = true;
    services.media.captureFixedWindow = async (...args) => {
      const input = args[0];
      if ((input === null || input === void 0 ? void 0 : input.purpose) === 'recording' && returnUnusableOnce) {
        returnUnusableOnce = false;
        const now = Date.now();
        return {
          purpose: 'recording',
          blob: new Blob([new Uint8Array([1, 2, 3])], {
            type: 'audio/webm'
          }),
          mimeType: 'audio/webm',
          startedAt: now - 50,
          stoppedAt: now,
          elapsedMs: 50,
          endReason: 'interrupted',
          probe: {
            mimeType: 'audio/webm',
            byteSize: 3,
            durationSeconds: null,
            decodedFrames: null,
            channelCount: null,
            sampleRate: null,
            decodeStatus: 'unavailable',
            waveformPeaks: []
          }
        };
      }
      return original(...args);
    };
  });
  await page.locator('.record-action').click();
  await expect(page.locator('.record-panel .notice')).toContainText('Recording could not finish. Any earlier candidate and accepted take remain unchanged.');
  const afterUnusable = await currentCandidate();
  expect((_afterUnusable$candid = afterUnusable.candidate) === null || _afterUnusable$candid === void 0 ? void 0 : _afterUnusable$candid.id).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id);
  expect((_afterUnusable$candid2 = afterUnusable.candidate) === null || _afterUnusable$candid2 === void 0 ? void 0 : _afterUnusable$candid2.sha256).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.sha256);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR11-unusable-partial-preserves-candidate.png')
  });
  await page.evaluate(() => {
    window.__denyMicrophone = true;
  });
  await page.locator('.record-action').click();
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  const afterDenied = await currentCandidate();
  expect((_afterDenied$candidat = afterDenied.candidate) === null || _afterDenied$candidat === void 0 ? void 0 : _afterDenied$candidat.id).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id);
  expect((_afterDenied$candidat2 = afterDenied.candidate) === null || _afterDenied$candidat2 === void 0 ? void 0 : _afterDenied$candidat2.sha256).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.sha256);
  await page.evaluate(() => {
    const target = window;
    target.__denyMicrophone = false;
    const mediaDevices = navigator.mediaDevices;
    const original = mediaDevices.getUserMedia.bind(mediaDevices);
    const pending = {
      stream: null,
      release: null
    };
    target.__pendingGetUserMedia = pending;
    mediaDevices.getUserMedia = async (...args) => {
      const stream = await original(...args);
      pending.stream = stream;
      await new Promise(resolve => {
        pending.release = resolve;
      });
      return stream;
    };
  });
  await page.locator('.record-action').click();
  await expect.poll(() => page.evaluate(() => {
    var _pendingGetUserMedia;
    return Boolean((_pendingGetUserMedia = window.__pendingGetUserMedia) === null || _pendingGetUserMedia === void 0 ? void 0 : _pendingGetUserMedia.stream);
  })).toBe(true);
  await setModeledVisibility(true);
  await page.evaluate(() => {
    const pending = window.__pendingGetUserMedia;
    if (!(pending !== null && pending !== void 0 && pending.release)) throw new Error('The delayed microphone result is unavailable.');
    pending.release();
  });
  await expect(page.locator('.record-panel .notice')).toContainText('Recording could not finish.', {
    timeout: 10000
  });
  const pendingTracks = await page.evaluate(() => {
    var _pendingGetUserMedia2, _pendingGetUserMedia3;
    return (_pendingGetUserMedia2 = (_pendingGetUserMedia3 = window.__pendingGetUserMedia) === null || _pendingGetUserMedia3 === void 0 || (_pendingGetUserMedia3 = _pendingGetUserMedia3.stream) === null || _pendingGetUserMedia3 === void 0 ? void 0 : _pendingGetUserMedia3.getTracks().map(track => track.readyState)) !== null && _pendingGetUserMedia2 !== void 0 ? _pendingGetUserMedia2 : [];
  });
  expect(pendingTracks.length).toBeGreaterThan(0);
  expect(pendingTracks.every(state => state === 'ended')).toBe(true);
  expect(await evidenceCounters(page)).toEqual({
    getUserMediaCalls: 4,
    recorderStarts: 2
  });
  const afterPendingCancel = await currentCandidate();
  expect((_afterPendingCancel$c = afterPendingCancel.candidate) === null || _afterPendingCancel$c === void 0 ? void 0 : _afterPendingCancel$c.id).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id);
  expect((_afterPendingCancel$c2 = afterPendingCancel.candidate) === null || _afterPendingCancel$c2 === void 0 ? void 0 : _afterPendingCancel$c2.sha256).toBe(secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.sha256);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR11-preparing-hidden-cancel-preserves-candidate.png')
  });
  await writeFile(path.join(evidenceDirectory, 'IR11-IR12-lifecycle-and-panel-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    firstPartialCandidateId: firstPartial === null || firstPartial === void 0 ? void 0 : firstPartial.id,
    latestPartialCandidateId: secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id,
    unusablePartialPreservedLatestCandidate: ((_afterUnusable$candid3 = afterUnusable.candidate) === null || _afterUnusable$candid3 === void 0 ? void 0 : _afterUnusable$candid3.id) === (secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id),
    deniedPermissionPreservedLatestCandidate: ((_afterDenied$candidat3 = afterDenied.candidate) === null || _afterDenied$candidat3 === void 0 ? void 0 : _afterDenied$candidat3.id) === (secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id),
    preparingHiddenStoppedTracks: pendingTracks,
    preparingHiddenPreservedLatestCandidate: ((_afterPendingCancel$c3 = afterPendingCancel.candidate) === null || _afterPendingCancel$c3 === void 0 ? void 0 : _afterPendingCancel$c3.id) === (secondPartial === null || secondPartial === void 0 ? void 0 : secondPartial.id),
    normal1440x900: normalBounds,
    saved1280x600: shortSavedBounds,
    apiCounters: await evidenceCounters(page),
    physicalMicrophoneOrDeviceBackgroundTested: false
  }, null, 2), 'utf8');
});
test('Record seek cancellation and blur keep both audition sources paused', async ({
  page
}) => {
  test.setTimeout(30000);
  await page.setViewportSize({
    width: 1440,
    height: 900
  });
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  await waitForSavedCandidate(page, 'A');
  const seek = page.locator('.record-seek');
  const video = page.locator('video');
  const audio = page.locator('audio');
  for (const source of ['Original', 'Your take']) {
    await page.getByRole('button', {
      name: source,
      exact: true
    }).click();
    await page.getByRole('button', {
      name: 'Pause',
      exact: true
    }).click();
    const bounds = await seek.boundingBox();
    expect(bounds).not.toBeNull();
    await page.mouse.move(bounds.x + bounds.width * 0.4, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await seek.dispatchEvent('pointercancel', {
      pointerId: 1,
      pointerType: 'mouse'
    });
    await page.getByRole('button', {
      name: 'Exit',
      exact: true
    }).focus();
    await page.mouse.up();
    await expect.poll(() => video.evaluate(element => element.paused)).toBe(true);
    if (source === 'Your take') await expect.poll(() => audio.evaluate(element => element.paused)).toBe(true);
  }
  await page.getByRole('button', {
    name: 'Original',
    exact: true
  }).click();
  await page.getByRole('button', {
    name: 'Pause',
    exact: true
  }).click();
  await seek.focus();
  await page.keyboard.down('ArrowRight');
  await page.getByRole('button', {
    name: 'Exit',
    exact: true
  }).focus();
  await page.keyboard.up('ArrowRight');
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR06-record-seek-cancel-blur-paused.png')
  });
});
test('phone recovery toast expiry preserves the document floor and scroll position', async ({
  page,
  browser
}) => {
  test.setTimeout(20000);
  await page.setViewportSize({
    width: 390,
    height: 667
  });
  await page.addInitScript(() => {
    window.__denyMicrophone = true;
  });
  await instrumentNativeMedia(page);
  await page.goto('/projects/sintel-prepared/record?layout=A&locale=en');
  await page.getByRole('button', {
    name: 'Record',
    exact: true
  }).click();
  const toast = page.locator('.recovery-toast');
  await expect(toast).toBeVisible();
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }));
  expect(before.scrollY).toBeGreaterThan(0);
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-before-expiry.png')
  });
  await page.waitForTimeout(8300);
  await expect(toast).toHaveCount(0);
  const after = await page.evaluate(() => ({
    scrollY: window.scrollY,
    maxScroll: document.documentElement.scrollHeight - window.innerHeight,
    scrollHeight: document.documentElement.scrollHeight
  }));
  await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    before,
    after
  }, null, 2), 'utf8');
  expect(after.scrollY).toBe(before.scrollY);
  expect(after.maxScroll).toBe(before.maxScroll);
  expect(after.scrollHeight).toBe(before.scrollHeight);
  await expect(page.locator('.record-panel .notice')).toContainText('Microphone access was denied or interrupted. Recording did not begin');
  await page.screenshot({
    path: path.join(evidenceDirectory, 'IR08-phone-denied-toast-after-expiry.png')
  });
  await writeFile(path.join(evidenceDirectory, 'IR08-phone-toast-expiry-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    before,
    after,
    durableGuidanceRetained: await page.locator('.record-panel .notice').isVisible()
  }, null, 2), 'utf8');
});
test('approved long Russian line is used as an isolated stress fixture in A and B', async ({
  page,
  browser
}) => {
  test.setTimeout(30000);
  const longSentence = 'Я ищу того, кто мне очень дорог. Мы прошли такой долгий путь, и теперь я не могу повернуть назад.';
  const measurements = [];
  for (const layout of ['A', 'B']) {
    await page.setViewportSize({
      width: 1280,
      height: 600
    });
    await page.goto('/');
    await expect(page.locator('.home-page')).toBeVisible();
    await page.evaluate(({
      selectedLayout,
      fixtureText
    }) => {
      const root = document.getElementById('root');
      if (!root) throw new Error('The React root is unavailable for the isolated stress fixture.');
      const rootKey = Object.keys(root).find(key => key.startsWith('__reactContainer$'));
      if (!rootKey) throw new Error('The active React root fiber is unavailable.');
      const pending = [root[rootKey]];
      const seen = new Set();
      let services = null;
      while (pending.length > 0) {
        var _props$services4;
        const fiber = pending.pop();
        if (!fiber || seen.has(fiber)) continue;
        seen.add(fiber);
        if (fiber.alternate) pending.push(fiber.alternate);
        const props = fiber.memoizedProps;
        if (props !== null && props !== void 0 && (_props$services4 = props.services) !== null && _props$services4 !== void 0 && _props$services4.projects) services = props.services;
        if (fiber.child) pending.push(fiber.child);
        if (fiber.sibling) pending.push(fiber.sibling);
      }
      if (!services) throw new Error('The active typed project reader was not found.');
      const originalLoad = services.projects.loadPreparedProject.bind(services.projects);
      services.projects.loadPreparedProject = async (...args) => {
        const project = await originalLoad(...args);
        return project ? {
          ...project,
          windows: project.windows.map(window => window.id === 'sintel-turn-3' ? {
            ...window,
            text: {
              ...window.text,
              ru: fixtureText
            }
          } : window)
        } : null;
      };
      history.pushState({}, '', `/projects/sintel-prepared/record?layout=${selectedLayout}&locale=ru&turn=sintel-turn-3`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, {
      selectedLayout: layout,
      fixtureText: longSentence
    });
    await expect(page.getByRole('button', {
      name: 'Записать',
      exact: true
    })).toBeEnabled();
    await expect(page.locator('.dialogue-copy p')).toHaveText(longSentence);
    await page.evaluate(() => document.fonts.ready);
    for (const viewport of [{
      width: 1280,
      height: 600
    }, {
      width: 1366,
      height: 650
    }, {
      width: 390,
      height: 667
    }]) {
      var _result$dialogue$bott, _result$dialogue, _result$wave$y, _result$wave, _result$panel$y, _result$panel, _result$media$y, _result$media;
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const result = await page.evaluate(() => {
        var _document$querySelect3;
        const bounds = selector => {
          const element = document.querySelector(selector);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            bottom: rect.bottom
          };
        };
        return {
          viewport: {
            width: innerWidth,
            height: innerHeight
          },
          text: (_document$querySelect3 = document.querySelector('.dialogue-copy p')) === null || _document$querySelect3 === void 0 ? void 0 : _document$querySelect3.textContent,
          media: bounds('.media-viewport'),
          panel: bounds('.record-panel'),
          dialogue: bounds('.dialogue-copy'),
          wave: bounds('.waveform-row'),
          documentHeight: document.documentElement.scrollHeight,
          horizontalOverflow: document.documentElement.scrollWidth > innerWidth
        };
      });
      expect(result.text).toBe(longSentence);
      expect(result.horizontalOverflow).toBe(false);
      expect((_result$dialogue$bott = (_result$dialogue = result.dialogue) === null || _result$dialogue === void 0 ? void 0 : _result$dialogue.bottom) !== null && _result$dialogue$bott !== void 0 ? _result$dialogue$bott : Infinity).toBeLessThanOrEqual((_result$wave$y = (_result$wave = result.wave) === null || _result$wave === void 0 ? void 0 : _result$wave.y) !== null && _result$wave$y !== void 0 ? _result$wave$y : -Infinity);
      if (layout === 'A' && viewport.width >= 1248) expect(Math.abs(((_result$panel$y = (_result$panel = result.panel) === null || _result$panel === void 0 ? void 0 : _result$panel.y) !== null && _result$panel$y !== void 0 ? _result$panel$y : -999) - ((_result$media$y = (_result$media = result.media) === null || _result$media === void 0 ? void 0 : _result$media.y) !== null && _result$media$y !== void 0 ? _result$media$y : -1000))).toBeLessThanOrEqual(1);
      measurements.push({
        layout,
        ...result
      });
      const name = `ru-long-${layout}-${viewport.width}x${viewport.height}.png`;
      await page.screenshot({
        path: path.join(evidenceDirectory, name),
        fullPage: viewport.width < 500
      });
    }
  }
  await writeFile(path.join(evidenceDirectory, 'ru-long-stress-fixture-evidence.json'), JSON.stringify({
    date: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    sentence: longSentence,
    source: 'isolated in-memory read-port override for sintel-turn-3; production seed text unchanged',
    measurements
  }, null, 2), 'utf8');
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJta2RpciIsInJlYWRGaWxlIiwid3JpdGVGaWxlIiwiY3JlYXRlSGFzaCIsInBhdGgiLCJ0ZXN0IiwiZXhwZWN0IiwiZXZpZGVuY2VEaXJlY3RvcnkiLCJyZXNvbHZlIiwicHJvY2VzcyIsImN3ZCIsIl9wcm9jZXNzJGVudiREVUJCRURfQyIsImVudiIsIkRVQkJFRF9DT1JFX0VWSURFTkNFX1JVTiIsInNwbGl0Iiwic2V0UmVjb3JkTG9jYWxlIiwicGFnZSIsImxvY2FsZSIsInVybCIsIlVSTCIsInNlYXJjaFBhcmFtcyIsInNldCIsImdvdG8iLCJwYXRobmFtZSIsInNlYXJjaCIsImluc3RydW1lbnROYXRpdmVNZWRpYSIsImFkZEluaXRTY3JpcHQiLCJ0YXJnZXQiLCJ3aW5kb3ciLCJfX25hdGl2ZVJlY29yZEV2aWRlbmNlIiwiZ2V0VXNlck1lZGlhQ2FsbHMiLCJyZWNvcmRlclN0YXJ0cyIsInNhdmVkRXZpZGVuY2UiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJKU09OIiwicGFyc2UiLCJwZXJzaXN0TmF0aXZlRXZpZGVuY2UiLCJzZXRJdGVtIiwic3RyaW5naWZ5IiwiX19sb2NrRXZpZGVuY2UiLCJyZXF1ZXN0cyIsImNhbGxiYWNrcyIsImxvY2tNYW5hZ2VyIiwibmF2aWdhdG9yIiwibG9ja3MiLCJvcmlnaW5hbFJlcXVlc3QiLCJyZXF1ZXN0IiwiYmluZCIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiY29uZmlndXJhYmxlIiwidmFsdWUiLCJuYW1lIiwib3B0aW9ucyIsImNhbGxiYWNrIiwicHVzaCIsImxvY2siLCJtZWRpYURldmljZXMiLCJnZXRVc2VyTWVkaWEiLCJhcmdzIiwiX19kZW55TWljcm9waG9uZSIsIlByb21pc2UiLCJyZWplY3QiLCJET01FeGNlcHRpb24iLCJNZWRpYVJlY29yZGVyIiwic3RhcnQiLCJwcm90b3R5cGUiLCJhcHBseSIsImV2aWRlbmNlQ291bnRlcnMiLCJldmFsdWF0ZSIsImluc3RhbGxTdG9yZUZhaWx1cmUiLCJtb2RlIiwiZmF1bHRNb2RlIiwicm9vdCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJFcnJvciIsInJvb3RLZXkiLCJrZXlzIiwiZmluZCIsImtleSIsInN0YXJ0c1dpdGgiLCJwZW5kaW5nIiwic3RvcmUiLCJsZW5ndGgiLCJfcHJvcHMkc2VydmljZXMiLCJmaWJlciIsInBvcCIsInByb3BzIiwibWVtb2l6ZWRQcm9wcyIsInNlcnZpY2VzIiwicHJvamVjdHMiLCJjaGlsZCIsInNpYmxpbmciLCJvcmlnaW5hbFNhdmUiLCJzYXZlQ2FuZGlkYXRlIiwib3JpZ2luYWxMb29rdXAiLCJsb29rdXBPcGVyYXRpb24iLCJ0cmFjZSIsInNhdmVDYWxscyIsImxvb2t1cENhbGxzIiwib3BlcmF0aW9uSWRzIiwiYmxvYlNpemVzIiwicmV0cnlTYW1lQmxvYiIsIl9fc3RvcmVGYWlsdXJlVHJhY2UiLCJmaXJzdEtub3duRmFpbHVyZSIsImZhaWxlZEJsb2IiLCJvcGVyYXRpb25JZCIsImNhcHR1cmUiLCJibG9iIiwic2l6ZSIsImNvbW1pdHRlZCIsImtpbmQiLCJyZWFzb24iLCJTdHJpbmciLCJpbnN0YWxsQWNjZXB0YW5jZUZhaWx1cmUiLCJvcmlnaW5hbFRyYW5zYWN0aW9uIiwiSURCRGF0YWJhc2UiLCJ0cmFuc2FjdGlvbiIsImNhbGxzIiwic3RvcmVzIiwicmVzdG9yZSIsInVuZGVmaW5lZCIsIl9fYWNjZXB0RmFpbHVyZVRyYWNlIiwic3RvcmVOYW1lcyIsImluY2x1ZGVzIiwiY2FsbCIsImluc3RhbGxOZXh0T3BlcmF0aW9uV3JpdGVGYWlsdXJlIiwib3JpZ2luYWwiLCJfX29wZXJhdGlvbldyaXRlRmFpbHVyZSIsIl9fcmVzdG9yZU9wZXJhdGlvbldyaXRlRmFpbHVyZSIsInRyYWNlTmV4dE5hdGl2ZUJsb2JEaWdlc3QiLCJjYXB0dXJlcyIsImJ5dGVTaXplIiwibWltZVR5cGUiLCJzaGEyNTYiLCJfX25hdGl2ZUJsb2JEaWdlc3RUcmFjZSIsImNodW5rcyIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsImRhdGEiLCJCbG9iIiwidHlwZSIsImFycmF5QnVmZmVyIiwidGhlbiIsImJ5dGVzIiwiY3J5cHRvIiwic3VidGxlIiwiZGlnZXN0IiwiQXJyYXkiLCJmcm9tIiwiVWludDhBcnJheSIsImJ5dGUiLCJ0b1N0cmluZyIsInBhZFN0YXJ0Iiwiam9pbiIsIm9uY2UiLCJzdG9yZUZhaWx1cmVUcmFjZSIsInJlYWRJbmRleGVkRGIiLCJkYXRhYmFzZSIsImluZGV4ZWREQiIsIm9wZW4iLCJvbnN1Y2Nlc3MiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkIiwic3RvcmVOYW1lIiwib2JqZWN0U3RvcmUiLCJnZXRBbGwiLCJnZXQiLCJwcm9qZWN0IiwibWVkaWEiLCJvcGVyYXRpb25zIiwic25hcHNob3RzIiwiY2xvc2UiLCJyZXZpc2lvbiIsImRyYWZ0Q2FuZGlkYXRlQnlUdXJuIiwiYWNjZXB0ZWRCeVR1cm4iLCJpbml0aWFsUmVzdWx0U25hcHNob3RJZCIsImxhdGVzdFJlc3VsdFNuYXBzaG90SWQiLCJ0b21ic3RvbmVkQXQiLCJtYXAiLCJjYW5kaWRhdGUiLCJfc2l6ZSIsIl9jYW5kaWRhdGUkYmxvYiIsImlkIiwicHVycG9zZSIsInR1cm5JZCIsImVuZFJlYXNvbiIsInByb2JlIiwiYmxvYlNpemUiLCJvcGVyYXRpb24iLCJzdGF0ZSIsInByb2plY3RSZXZpc2lvbiIsInNuYXBzaG90SWQiLCJuYXZpZ2F0aW9uSW50ZW50IiwibmF2aWdhdGlvbkNvbXBsZXRlZCIsInNuYXBzaG90IiwiY29udGVudFNoYTI1NiIsImF1dGhvcml6YXRpb24iLCJ0YWtlcyIsImJyb3dzZXIiLCJzZXRWaWV3cG9ydFNpemUiLCJ3aWR0aCIsImhlaWdodCIsImdldEJ5Um9sZSIsImV4YWN0IiwidG9CZUVuYWJsZWQiLCJjbGljayIsInBvbGwiLCJ0b0JlIiwibG9jYXRvciIsInRvQ29udGFpblRleHQiLCJ0aW1lb3V0IiwidW5rbm93blRyYWNlIiwidG9IYXZlTGVuZ3RoIiwic3RvcmVkIiwid2FpdEZvclNhdmVkQ2FuZGlkYXRlIiwicmVzb2x2ZWRUcmFjZSIsInRvRXF1YWwiLCJqb3VybmFsRW50cnkiLCJkYXRlIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwidmVyc2lvbiIsInNjZW5hcmlvIiwicGh5c2ljYWxNaWNyb3Bob25lIiwibmF0aXZlQXBpRXZpZGVuY2UiLCJzYXZlZENhbmRpZGF0ZSIsIl9iZWZvcmVGYWlsdXJlJHByb2plYyIsIl9hZnRlckZhaWx1cmUkcHJvamVjdCIsIl9hZnRlclJldHJ5JHByb2plY3QiLCJfYWZ0ZXJSZXRyeSRwcm9qZWN0MiIsInNldFRpbWVvdXQiLCJyZWNvcmRDdXJyZW50V2luZG93IiwidG9IYXZlVVJMIiwiYmVmb3JlRmFpbHVyZSIsImFjY2VwdGVkQmVmb3JlIiwidG9CZVRydXRoeSIsInJlY292ZXJ5VG9hc3QiLCJ0b0JlVmlzaWJsZSIsImNvdW50IiwidG9hc3RTdHlsZSIsImVsZW1lbnQiLCJzdHlsZSIsImdldENvbXB1dGVkU3R5bGUiLCJib3VuZHMiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJpY29uIiwicXVlcnlTZWxlY3RvciIsImJhY2tncm91bmQiLCJiYWNrZ3JvdW5kQ29sb3IiLCJib3JkZXJSYWRpdXMiLCJib3R0b20iLCJwYWRkaW5nIiwiYm94U2hhZG93IiwiaWNvbkNvbG9yIiwiY29sb3IiLCJ0aXRsZUZvbnQiLCJmb250IiwiYm9keUZvbnQiLCJ0b0JlTGVzc1RoYW5PckVxdWFsIiwic2NyZWVuc2hvdCIsImZhaWxlZFRyYWNlIiwidG9Db250YWluIiwiZm9jdXNCZWZvcmVFeHBpcnkiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWUiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWUyIiwicmVjb3ZlcnlGb2N1c2VkIiwiYWN0aXZlRWxlbWVudCIsIm1hdGNoZXMiLCJzY3JvbGxZIiwidG9IYXZlQ291bnQiLCJhZnRlckZhaWx1cmUiLCJmaWx0ZXIiLCJzYXZlZCIsInJlY292ZXJlZFRyYWNlIiwiYWZ0ZXJSZXRyeSIsImFjY2VwdGVkQ2FuZGlkYXRlQmVmb3JlRmFpbHVyZSIsImZhaWxlZEF0dGVtcHQiLCJjYXB0dXJlZEJsb2JCZWZvcmVQZXJzaXN0ZW5jZSIsInJldHJ5IiwiZmluYWxQcm9qZWN0IiwicmV0cmllZENhbmRpZGF0ZSIsIl9mYWlsZWQkcHJvamVjdCIsIl9yZWYiLCJfZmFpbGVkJHByb2plY3QyIiwiX2FjY2VwdGVkJHByb2plY3QiLCJfZmFpbGVkJHByb2plY3QzIiwiX2FjY2VwdGVkJHByb2plY3QyIiwidmlkZW8iLCJyZWFkeVN0YXRlIiwiSFRNTE1lZGlhRWxlbWVudCIsIkhBVkVfQ1VSUkVOVF9EQVRBIiwidmlkZW9XaWR0aCIsImd1YXJkIiwidG9CZUZvY3VzZWQiLCJmYWlsZWQiLCJ0b01hdGNoT2JqZWN0IiwidmFsdWVzIiwiYWNjZXB0YW5jZUZhaWx1cmUiLCJiZWZvcmVUb2FzdEV4cGlyeSIsIl9kb2N1bWVudCRhY3RpdmVFbGVtZTMiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWU0IiwiZm9jdXNlZFJldHJ5IiwicmV0cnlGb2N1c2VkQWZ0ZXJUb2FzdEV4cGlyeSIsImZ1bGxQYWdlIiwiZ2V0QnlUZXN0SWQiLCJhY2NlcHRlZCIsInN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zIiwibmF0aXZlSW5wdXQiLCJjYW5kaWRhdGVJZCIsImFjY2VwdGVkQmVmb3JlUmV0cnkiLCJhY2NlcHRlZEFmdGVyUmV0cnkiLCJmYWlsdXJlVHJhY2UiLCJmb2N1c0JlZm9yZVRvYXN0RXhwaXJ5IiwiYm91bmRhcnlSZXR1cm5Gb2N1c2VkRXhpdCIsImxheW91dCIsIl9VUkwkc2VhcmNoUGFyYW1zJGdldCIsIl9kYXRhYmFzZSRwcm9qZWN0Iiwibm90aWNlIiwiY3VycmVudFR1cm5JZCIsImRyYWZ0QnlUdXJuIiwiY3VycmVudCIsInRvQmVHcmVhdGVyVGhhbiIsInRvTWF0Y2giLCJyZWNvcmRCdXR0b24iLCJzdGFydGVkQXQiLCJjdXJyZW50VGltZSIsIndhaXRGb3JUaW1lb3V0IiwibW92ZWRUbyIsImJlZm9yZUFsbCIsInJlY3Vyc2l2ZSIsIl9iZWZvcmVSZWFsUGxheWJhY2skdiIsIl90cmFjZSRyZXF1ZXN0ZWRBdCIsIl90cmFjZSRuYXRpdmVQbGF5QXQiLCJfdHJhY2UkcmVxdWVzdGVkQXQyIiwiX3RyYWNlJG5hdGl2ZVBsYXlBdDIiLCJfdHJhY2UkcGxheWluZ0F0IiwiX3RyYWNlJHJlY29yZGVyU3RhcnRWIiwiX3RyYWNlJHBsYXlpbmdWaWRlb1RpIiwiX3RyYWNlJHBsYXlpbmdWaWRlb1RpMiIsIl90cmFjZSRyZWNvcmRlclN0b3BWaSIsIl90cmFjZSRyZWNvcmRlclN0b3BWaTIiLCJfdHJhY2UkcmVjb3JkZXJTdGFydFYyIiwicHJlcGFyZWRXaW5kb3ciLCJzZWxlY3RlZCIsIndpbmRvd3MiLCJyZXF1ZXN0ZWRBdCIsIm5hdGl2ZVBsYXlBdCIsInBsYXlpbmdBdCIsInBsYXlpbmdWaWRlb1RpbWUiLCJyZWNvcmRlclN0YXJ0QXQiLCJyZWNvcmRlclN0YXJ0VmlkZW9UaW1lIiwicmVjb3JkZXJTdG9wQXQiLCJyZWNvcmRlclN0b3BWaWRlb1RpbWUiLCJfX2RlbGF5ZWRDYXB0dXJlVHJhY2UiLCJuYXRpdmVQbGF5IiwicGxheSIsInBlcmZvcm1hbmNlIiwibm93Iiwic3RvcCIsImJlZm9yZVJlYWxQbGF5YmFjayIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdCIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdDIiLCJ2aWRlb1RpbWUiLCJub3QiLCJ0b0JlTnVsbCIsIk1hdGgiLCJhYnMiLCJzdGFydE1zIiwiZXhwZWN0ZWREdXJhdGlvbiIsImVuZE1zIiwidG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCIsImRlY29kZWRGcmFtZXMiLCJpbnB1dCIsInNvdXJjZVBsYXlEZWxheU1zIiwibmF0aXZlVHJhY2UiLCJwZXJzaXN0ZWRDYW5kaWRhdGUiLCJhcGlDb3VudGVycyIsIl9yZWYzIiwiX21lZGlhJHByb2plY3QiLCJfZmluYWxEYXRhYmFzZSRwcm9qZWMiLCJfc2hvcnRSZXN1bHQkdGl0bGUiLCJfc2hvcnRSZXN1bHQkZXhpdCIsInRvSGF2ZVRleHQiLCJ0b0hhdmVBdHRyaWJ1dGUiLCJmb250cyIsInJlYWR5IiwidG9CZUluVmlld3BvcnQiLCJnZXRCeUxhYmVsIiwiZGlhbG9ndWUiLCJlbmdsaXNoRGlhbG9ndWUiLCJ0ZXh0Q29udGVudCIsInJ1c3NpYW5EaWFsb2d1ZSIsInRvTG93ZXJDYXNlIiwiaGFzVGV4dCIsImluaXRpYWxCdXR0b24iLCJoZWFkZXJFdmlkZW5jZSIsImluc3BlY3QiLCJzZWxlY3RvciIsIl9lbGVtZW50JHRleHRDb250ZW50JCIsIl9lbGVtZW50JHRleHRDb250ZW50IiwicmVjdCIsInRleHQiLCJ0cmltIiwieCIsInkiLCJvcGFjaXR5IiwidmlzaWJpbGl0eSIsImRpc3BsYXkiLCJleGl0IiwidGl0bGUiLCJkb3RzIiwibWFicnlMb2FkZWQiLCJjaGVjayIsImRpYWxvZ3VlRm9udCIsImZvbnRGYW1pbHkiLCJ2aWV3cG9ydCIsImJvdW5kaW5nQm94Iiwid2F2ZSIsImNvbnRyb2xzIiwiX2V4aXQkeCIsImNlbnRlciIsInZpc2libGVDZW50ZXIiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRXaWR0aCIsInBhbmVsIiwiZXhwZWN0UGFuZWxBbGlnbmVkIiwibWVkaWFZIiwicGFuZWxZIiwicmVjb3JkaW5nTm90aWNlIiwiYXVkaW8iLCJnZXRBdHRyaWJ1dGUiLCJfcmVmMiIsIl9iZWZvcmVSZWxvYWQkcHJvamVjdCIsImxhc3QiLCJ0b0JlSGlkZGVuIiwiYmVmb3JlUmVsb2FkIiwiY291bnRlcnNCZWZvcmVSZWxvYWQiLCJyZWxvYWQiLCJob3Jpem9udGFsT3ZlcmZsb3ciLCJzY3JvbGxXaWR0aCIsImlubmVyV2lkdGgiLCJ0YXJnZXRTaXplIiwiUmVnRXhwIiwicm91dGUiLCJmdWxmaWxsIiwic3RhdHVzIiwiYm9keSIsInNjcm9sbFRvIiwic2Nyb2xsSGVpZ2h0IiwiYnV0dG9uIiwiX2RvY3VtZW50JGFjdGl2ZUVsZW1lNSIsInRhZ05hbWUiLCJmaW5hbERhdGFiYXNlIiwiX2ZpbmFsRGF0YWJhc2UkcHJvamVjMiIsIl9maW5hbERhdGFiYXNlJHByb2plYzMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJnZXRCeVRleHQiLCJ1bnJvdXRlIiwicmVzdWx0VmlkZW8iLCJwYXVzZWQiLCJwcmVzZW50ZWRHZW5lcmF0aW9uSWQiLCJub3JtYWxSZXN1bHQiLCJzY3JlZW4iLCJzZWVrIiwidHJhbnNmb3JtIiwicGhvbmVSZXN1bHQiLCJ2b2x1bWUiLCJzb3VyY2UiLCJhY3Rpb25zIiwicXVlcnlTZWxlY3RvckFsbCIsImV2ZXJ5IiwiYWN0aW9uIiwiaW5uZXJIZWlnaHQiLCJzaG9ydFJlc3VsdCIsImRvY3VtZW50SGVpZ2h0IiwicGxheWVyIiwicmFpbCIsImRldGFpbHMiLCJzaG9ydFRhcmdldCIsIm9yaWdpbmFsU291cmNlIiwiZHViU291cmNlIiwiZm9jdXMiLCJrZXlib2FyZCIsInByZXNzIiwic3dpdGNoVGltZSIsInRvQmVMZXNzVGhhbiIsInJlc3VsdFNlZWsiLCJkb3duIiwidXAiLCJhZnRlcktleWJvYXJkUmVsZWFzZSIsInBhdXNlIiwiZGlzcGF0Y2hFdmVudCIsImJsdXIiLCJjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkIiwiZG93bmxvYWQiLCJhbGwiLCJ3YWl0Rm9yRXZlbnQiLCJkb3dubG9hZFBhdGgiLCJzYXZlQXMiLCJzdWdnZXN0ZWRGaWxlbmFtZSIsImRvd25sb2FkZWRCeXRlcyIsImV4cGVjdGVkRml4dHVyZUJ5dGVzIiwiZG93bmxvYWRlZFNoYTI1NiIsInVwZGF0ZSIsImVxdWFscyIsInJlc3VsdERhdGFiYXNlIiwiam9icyIsInJlc3VsdE1lZGlhIiwicHJvZHVjdFJlbmRlcmVkIiwiYXNzZW1ibGVkRnJvbUFjY2VwdGVkVGFrZXMiLCJmaWxlbmFtZSIsInRvQ29udGFpbkVxdWFsIiwib2JqZWN0Q29udGFpbmluZyIsImJ5dGVMZW5ndGgiLCJib3giLCJfYm94JGhlaWdodCIsIm1vYmlsZVRhcmdldHMiLCJsYWJlbCIsIm5hdGl2ZUV2aWRlbmNlIiwiaW5pdGlhbEhlYWRlciIsImdlbmVyYXRpb25JZCIsImN1cnJlbnRDb21wYXJpc29uQXREb3dubG9hZCIsImRvd25sb2FkRmlsZW5hbWUiLCJkb3dubG9hZFNoYTI1NiIsImV4YWN0Rml4dHVyZUJ5dGVzTWF0Y2giLCJmaXh0dXJlUHJvdmVuYW5jZSIsImFzc2VydGlvbnMiLCJyZXN1bHRSb3V0ZSIsInJldHVybmVkUmVjb3JkVmlkZW8iLCJsZWF2aW5nVmlkZW8iLCJldmFsdWF0ZUhhbmRsZSIsIl9wcm9wcyRzZXJ2aWNlczIiLCJyZXN1bHRzIiwib3JpZ2luYWxSZWFkIiwicmVhZEdlbmVyYXRpb25NZWRpYSIsInNjb3BlIiwicGF5bG9hZCIsImxvYWRQcmVwYXJlZFByb2plY3QiLCJ0b21ic3RvbmVQcm9qZWN0IiwicmFuZG9tVVVJRCIsIl9fZGVsZXRlZEJlZm9yZUdlbmVyYXRpb25EZWxpdmVyeSIsImRvd25sb2FkRXZlbnRzIiwib24iLCJfaW5pdGlhbCRwcm9qZWN0JGluaXQiLCJfaW5pdGlhbCRwcm9qZWN0IiwidHVybiIsImluaXRpYWwiLCJpbml0aWFsU25hcHNob3RJZCIsInJldHVybkxvY2tzIiwiYWZ0ZXJSZXBsYWNlbWVudE5leHQiLCJwcmVzZW50ZWRWaWRlbyIsImN1cnJlbnRTcmMiLCJyZXZpc2VkIiwib3JpZ2luYWxTbmFwc2hvdCIsImV4cGxpY2l0U25hcHNob3QiLCJ0b0JlRGVmaW5lZCIsInByZXNlbnRlZE1lZGlhIiwiZGF0YXNldCIsImR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJkdXJhdGlvbk1ldGFkYXRhIiwiSW5maW5pdHkiLCJpc05hTiIsInZpZGVvSGVpZ2h0IiwicmV2aXNlZFNuYXBzaG90IiwiY2FwdHVyZUdyYW50TGlmZWN5Y2xlIiwiYXV0b21hdGljUmVzdWx0TmF2aWdhdGlvbkFmdGVyUmVwbGFjZW1lbnQiLCJleHBsaWNpdFRvUmVzdWx0Q2xpY2tlZCIsInNlY29uZFBhZ2UiLCJjb250ZXh0IiwibmV3UGFnZSIsInRvQmVEaXNhYmxlZCIsInRvYXN0IiwidG9hc3RCb3VuZHMiLCJtb3VzZSIsIm1vdmUiLCJlbXVsYXRlTWVkaWEiLCJyZWR1Y2VkTW90aW9uIiwicmVkdWNlZE1vdGlvblRyYW5zaXRpb25TZWNvbmRzIiwiX2dldENvbXB1dGVkU3R5bGUkdHJhIiwicGFyc2VGbG9hdCIsInRyYW5zaXRpb25EdXJhdGlvbiIsIndoZWVsIiwicGVybWlzc2lvbiIsInNhdmVkUmVjb3JkaW5nQ291bnQiLCJzZXR0aW5nc0JvdW5kYXJ5QXZhaWxhYmxlIiwiaXNWaXNpYmxlIiwic2V0dGluZ3NCb3VuZGFyeVJldHVybkZvY3VzIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkMiIsIl9hZnRlckRlbmllZCRjYW5kaWRhdCIsIl9hZnRlckRlbmllZCRjYW5kaWRhdDIiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMyIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkMyIsIl9hZnRlckRlbmllZCRjYW5kaWRhdDMiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMzIiwicmVhZFByZXBhcmVkRHVyYXRpb24iLCJpdGVtIiwicHJlcGFyZWREdXJhdGlvbk1zIiwiY3VycmVudENhbmRpZGF0ZSIsIl9kYXRhYmFzZSRwcm9qZWN0MiIsInBhbmVsQm91bmRzIiwidG9KU09OIiwic2V0TW9kZWxlZFZpc2liaWxpdHkiLCJoaWRkZW4iLCJpc0hpZGRlbiIsIkV2ZW50Iiwic2F2ZUxpZmVjeWNsZVBhcnRpYWwiLCJleHBlY3RlZFJlY29yZGVyU3RhcnRzIiwic2NyZWVuc2hvdE5hbWUiLCJfcHJvYmUkZHVyYXRpb25TZWNvbmQiLCJfcmVmNCIsIl9kYXRhYmFzZSRwcm9qZWN0MyIsImNhcHR1cmluZ0JvdW5kcyIsInNhdmVkQm91bmRzIiwiX25hdGl2ZUJsb2JEaWdlc3RUcmEiLCJkdXJhdGlvblNlY29uZHMiLCJsaWZlY3ljbGUiLCJuYXRpdmVCbG9iIiwic291cmNlVmlkZW9QYXVzZWRBZnRlckludGVycnVwdGlvbiIsInBhbmVsRHVyaW5nQ2FwdHVyZSIsInBhbmVsQWZ0ZXJTYXZlIiwibm9ybWFsQm91bmRzIiwiZmlyc3RQYXJ0aWFsIiwic2hvcnRTYXZlZEJvdW5kcyIsInNlY29uZFBhcnRpYWwiLCJzZWVuIiwiU2V0IiwiX3Byb3BzJHNlcnZpY2VzMyIsImhhcyIsImFkZCIsImFsdGVybmF0ZSIsImNhcHR1cmVGaXhlZFdpbmRvdyIsInJldHVyblVudXNhYmxlT25jZSIsInN0b3BwZWRBdCIsImVsYXBzZWRNcyIsImNoYW5uZWxDb3VudCIsInNhbXBsZVJhdGUiLCJkZWNvZGVTdGF0dXMiLCJ3YXZlZm9ybVBlYWtzIiwiYWZ0ZXJVbnVzYWJsZSIsImFmdGVyRGVuaWVkIiwic3RyZWFtIiwicmVsZWFzZSIsIl9fcGVuZGluZ0dldFVzZXJNZWRpYSIsIl9wZW5kaW5nR2V0VXNlck1lZGlhIiwiQm9vbGVhbiIsInBlbmRpbmdUcmFja3MiLCJfcGVuZGluZ0dldFVzZXJNZWRpYTIiLCJfcGVuZGluZ0dldFVzZXJNZWRpYTMiLCJnZXRUcmFja3MiLCJ0cmFjayIsImFmdGVyUGVuZGluZ0NhbmNlbCIsImZpcnN0UGFydGlhbENhbmRpZGF0ZUlkIiwibGF0ZXN0UGFydGlhbENhbmRpZGF0ZUlkIiwidW51c2FibGVQYXJ0aWFsUHJlc2VydmVkTGF0ZXN0Q2FuZGlkYXRlIiwiZGVuaWVkUGVybWlzc2lvblByZXNlcnZlZExhdGVzdENhbmRpZGF0ZSIsInByZXBhcmluZ0hpZGRlblN0b3BwZWRUcmFja3MiLCJwcmVwYXJpbmdIaWRkZW5QcmVzZXJ2ZWRMYXRlc3RDYW5kaWRhdGUiLCJub3JtYWwxNDQweDkwMCIsInNhdmVkMTI4MHg2MDAiLCJwaHlzaWNhbE1pY3JvcGhvbmVPckRldmljZUJhY2tncm91bmRUZXN0ZWQiLCJwb2ludGVySWQiLCJwb2ludGVyVHlwZSIsImJlZm9yZSIsIm1heFNjcm9sbCIsImFmdGVyIiwiZHVyYWJsZUd1aWRhbmNlUmV0YWluZWQiLCJsb25nU2VudGVuY2UiLCJtZWFzdXJlbWVudHMiLCJzZWxlY3RlZExheW91dCIsImZpeHR1cmVUZXh0IiwiX3Byb3BzJHNlcnZpY2VzNCIsIm9yaWdpbmFsTG9hZCIsInJ1IiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsIlBvcFN0YXRlRXZlbnQiLCJfcmVzdWx0JGRpYWxvZ3VlJGJvdHQiLCJfcmVzdWx0JGRpYWxvZ3VlIiwiX3Jlc3VsdCR3YXZlJHkiLCJfcmVzdWx0JHdhdmUiLCJfcmVzdWx0JHBhbmVsJHkiLCJfcmVzdWx0JHBhbmVsIiwiX3Jlc3VsdCRtZWRpYSR5IiwiX3Jlc3VsdCRtZWRpYSIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdDMiLCJzZW50ZW5jZSJdLCJzb3VyY2VzIjpbInJlY29yZC1qb3VybmV5LnNwZWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbWtkaXIsIHJlYWRGaWxlLCB3cml0ZUZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgdGVzdCwgZXhwZWN0LCB0eXBlIFBhZ2UgfSBmcm9tICdAcGxheXdyaWdodC90ZXN0JztcblxuY29uc3QgZXZpZGVuY2VEaXJlY3RvcnkgPSBwYXRoLnJlc29sdmUoXG4gIHByb2Nlc3MuY3dkKCksICcuLicsICdfZG9jcycsICdldmlkZW5jZScsICdjb3JlLWpvdXJuZXktYWItaW1wbGVtZW50YXRpb24tMjAyNi0xMC0yOCcsXG4gIC4uLihwcm9jZXNzLmVudi5EVUJCRURfQ09SRV9FVklERU5DRV9SVU4gPz8gJ3BoYXNlMycpLnNwbGl0KC9bXFxcXC9dKy8pLFxuKTtcblxuYXN5bmMgZnVuY3Rpb24gc2V0UmVjb3JkTG9jYWxlKHBhZ2U6IFBhZ2UsIGxvY2FsZTogJ2VuJyB8ICdydScpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChwYWdlLnVybCgpKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2xvY2FsZScsIGxvY2FsZSk7XG4gIGF3YWl0IHBhZ2UuZ290byhgJHt1cmwucGF0aG5hbWV9JHt1cmwuc2VhcmNofWApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZTogUGFnZSkge1xuICBhd2FpdCBwYWdlLmFkZEluaXRTY3JpcHQoKCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHdpbmRvdyBhcyBXaW5kb3cgJiB7XG4gICAgICBfX25hdGl2ZVJlY29yZEV2aWRlbmNlPzogeyBnZXRVc2VyTWVkaWFDYWxsczogbnVtYmVyOyByZWNvcmRlclN0YXJ0czogbnVtYmVyIH07XG4gICAgICBfX2xvY2tFdmlkZW5jZT86IHsgcmVxdWVzdHM6IHN0cmluZ1tdOyBjYWxsYmFja3M6IEFycmF5PCdhY3F1aXJlZCcgfCAnbnVsbCc+IH07XG4gICAgICBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbjtcbiAgICB9O1xuICAgIHRhcmdldC5fX25hdGl2ZVJlY29yZEV2aWRlbmNlID0geyBnZXRVc2VyTWVkaWFDYWxsczogMCwgcmVjb3JkZXJTdGFydHM6IDAgfTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2F2ZWRFdmlkZW5jZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ19fZHViYmVkX25hdGl2ZV9yZWNvcmRfZXZpZGVuY2VfdjEnKTtcbiAgICAgIGlmIChzYXZlZEV2aWRlbmNlKSB0YXJnZXQuX19uYXRpdmVSZWNvcmRFdmlkZW5jZSA9IEpTT04ucGFyc2Uoc2F2ZWRFdmlkZW5jZSkgYXMgTm9uTnVsbGFibGU8dHlwZW9mIHRhcmdldC5fX25hdGl2ZVJlY29yZEV2aWRlbmNlPjtcbiAgICB9IGNhdGNoIHsgLyogRXZpZGVuY2Ugc3RvcmFnZSBpcyBiZXN0LWVmZm9ydDsgYnJvd3NlciBiZWhhdmlvciByZW1haW5zIGF1dGhvcml0YXRpdmUuICovIH1cbiAgICBjb25zdCBwZXJzaXN0TmF0aXZlRXZpZGVuY2UgPSAoKSA9PiB7XG4gICAgICB0cnkgeyBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdfX2R1YmJlZF9uYXRpdmVfcmVjb3JkX2V2aWRlbmNlX3YxJywgSlNPTi5zdHJpbmdpZnkodGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UpKTsgfVxuICAgICAgY2F0Y2ggeyAvKiBLZWVwIGNhcHR1cmUgYmVoYXZpb3IgaW5kZXBlbmRlbnQgb2YgZXZpZGVuY2Ugc3RvcmFnZS4gKi8gfVxuICAgIH07XG4gICAgdGFyZ2V0Ll9fbG9ja0V2aWRlbmNlID0geyByZXF1ZXN0czogW10sIGNhbGxiYWNrczogW10gfTtcbiAgICBjb25zdCBsb2NrTWFuYWdlciA9IG5hdmlnYXRvci5sb2NrcztcbiAgICBjb25zdCBvcmlnaW5hbFJlcXVlc3QgPSBsb2NrTWFuYWdlci5yZXF1ZXN0LmJpbmQobG9ja01hbmFnZXIpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShsb2NrTWFuYWdlciwgJ3JlcXVlc3QnLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogKG5hbWU6IHN0cmluZywgb3B0aW9uczogTG9ja09wdGlvbnMsIGNhbGxiYWNrOiAobG9jazogTG9jayB8IG51bGwpID0+IFByb21pc2U8dW5rbm93bj4gfCB1bmtub3duKSA9PiB7XG4gICAgICAgIHRhcmdldC5fX2xvY2tFdmlkZW5jZSEucmVxdWVzdHMucHVzaChuYW1lKTtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsUmVxdWVzdChuYW1lLCBvcHRpb25zLCAobG9jaykgPT4ge1xuICAgICAgICAgIHRhcmdldC5fX2xvY2tFdmlkZW5jZSEuY2FsbGJhY2tzLnB1c2gobG9jayA/ICdhY3F1aXJlZCcgOiAnbnVsbCcpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhsb2NrKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbnN0IG1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXM7XG4gICAgaWYgKG1lZGlhRGV2aWNlcykge1xuICAgICAgY29uc3QgZ2V0VXNlck1lZGlhID0gbWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG1lZGlhRGV2aWNlcyk7XG4gICAgICBtZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFEZXZpY2VzWydnZXRVc2VyTWVkaWEnXT4pID0+IHtcbiAgICAgICAgdGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UhLmdldFVzZXJNZWRpYUNhbGxzICs9IDE7XG4gICAgICAgIHBlcnNpc3ROYXRpdmVFdmlkZW5jZSgpO1xuICAgICAgICBpZiAodGFyZ2V0Ll9fZGVueU1pY3JvcGhvbmUpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRE9NRXhjZXB0aW9uKCdNaWNyb3Bob25lIHBlcm1pc3Npb24gZGVuaWVkIGluIHRoZSB0ZXN0IGhhcm5lc3MuJywgJ05vdEFsbG93ZWRFcnJvcicpKTtcbiAgICAgICAgcmV0dXJuIGdldFVzZXJNZWRpYSguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICh3aW5kb3cuTWVkaWFSZWNvcmRlcikge1xuICAgICAgY29uc3Qgc3RhcnQgPSBNZWRpYVJlY29yZGVyLnByb3RvdHlwZS5zdGFydDtcbiAgICAgIE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFSZWNvcmRlclsnc3RhcnQnXT4pIHtcbiAgICAgICAgdGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UhLnJlY29yZGVyU3RhcnRzICs9IDE7XG4gICAgICAgIHBlcnNpc3ROYXRpdmVFdmlkZW5jZSgpO1xuICAgICAgICByZXR1cm4gc3RhcnQuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV2aWRlbmNlQ291bnRlcnMocGFnZTogUGFnZSkge1xuICByZXR1cm4gcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX25hdGl2ZVJlY29yZEV2aWRlbmNlOiB7IGdldFVzZXJNZWRpYUNhbGxzOiBudW1iZXI7IHJlY29yZGVyU3RhcnRzOiBudW1iZXIgfSB9KS5fX25hdGl2ZVJlY29yZEV2aWRlbmNlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFN0b3JlRmFpbHVyZShwYWdlOiBQYWdlLCBtb2RlOiAnbG9zdC1hY2tub3dsZWRnZW1lbnQnIHwgJ2tub3duLWZhaWx1cmUnKSB7XG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKGZhdWx0TW9kZSkgPT4ge1xuICAgIHR5cGUgUHJvamVjdFN0b3JlID0ge1xuICAgICAgc2F2ZUNhbmRpZGF0ZShyZXF1ZXN0OiB7IG9wZXJhdGlvbklkOiBzdHJpbmc7IGNhcHR1cmU6IHsgYmxvYjogQmxvYiB9IH0pOiBQcm9taXNlPHVua25vd24+O1xuICAgICAgbG9va3VwT3BlcmF0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8dW5rbm93bj47XG4gICAgfTtcbiAgICB0eXBlIEZpYmVyID0geyBjaGlsZD86IHVua25vd247IHNpYmxpbmc/OiB1bmtub3duOyBtZW1vaXplZFByb3BzPzogdW5rbm93biB9O1xuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIChIVE1MRWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8IG51bGw7XG4gICAgaWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBSZWFjdCByb290IGlzIHVuYXZhaWxhYmxlLicpO1xuICAgIGNvbnN0IHJvb3RLZXkgPSBPYmplY3Qua2V5cyhyb290KS5maW5kKChrZXkpID0+IGtleS5zdGFydHNXaXRoKCdfX3JlYWN0Q29udGFpbmVyJCcpKTtcbiAgICBpZiAoIXJvb3RLZXkpIHRocm93IG5ldyBFcnJvcignVGhlIFJlYWN0IHJvb3QgZmliZXIgaXMgdW5hdmFpbGFibGUuJyk7XG4gICAgY29uc3QgcGVuZGluZzogdW5rbm93bltdID0gW3Jvb3Rbcm9vdEtleV1dO1xuICAgIGxldCBzdG9yZTogUHJvamVjdFN0b3JlIHwgbnVsbCA9IG51bGw7XG4gICAgd2hpbGUgKHBlbmRpbmcubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmliZXIgPSBwZW5kaW5nLnBvcCgpIGFzIEZpYmVyIHwgbnVsbDtcbiAgICAgIGlmICghZmliZXIpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcHJvcHMgPSBmaWJlci5tZW1vaXplZFByb3BzIGFzIHsgc2VydmljZXM/OiB7IHByb2plY3RzPzogUHJvamVjdFN0b3JlIH0gfSB8IG51bGw7XG4gICAgICBpZiAocHJvcHM/LnNlcnZpY2VzPy5wcm9qZWN0cykgc3RvcmUgPSBwcm9wcy5zZXJ2aWNlcy5wcm9qZWN0cztcbiAgICAgIGlmIChmaWJlci5jaGlsZCkgcGVuZGluZy5wdXNoKGZpYmVyLmNoaWxkKTtcbiAgICAgIGlmIChmaWJlci5zaWJsaW5nKSBwZW5kaW5nLnB1c2goZmliZXIuc2libGluZyk7XG4gICAgfVxuICAgIGlmICghc3RvcmUpIHRocm93IG5ldyBFcnJvcignVGhlIGFjdGl2ZSB0eXBlZCBQcm9qZWN0UG9ydCB3YXMgbm90IGZvdW5kIGluIHRoZSBzZXJ2aWNlcyBwcm92aWRlci4nKTtcbiAgICBjb25zdCBvcmlnaW5hbFNhdmUgPSBzdG9yZS5zYXZlQ2FuZGlkYXRlLmJpbmQoc3RvcmUpO1xuICAgIGNvbnN0IG9yaWdpbmFsTG9va3VwID0gc3RvcmUubG9va3VwT3BlcmF0aW9uLmJpbmQoc3RvcmUpO1xuICAgIGNvbnN0IHRyYWNlID0geyBzYXZlQ2FsbHM6IDAsIGxvb2t1cENhbGxzOiAwLCBvcGVyYXRpb25JZHM6IFtdIGFzIHN0cmluZ1tdLCBibG9iU2l6ZXM6IFtdIGFzIG51bWJlcltdLCByZXRyeVNhbWVCbG9iOiBudWxsIGFzIGJvb2xlYW4gfCBudWxsIH07XG4gICAgKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fc3RvcmVGYWlsdXJlVHJhY2U/OiB0eXBlb2YgdHJhY2UgfSkuX19zdG9yZUZhaWx1cmVUcmFjZSA9IHRyYWNlO1xuICAgIGxldCBmaXJzdEtub3duRmFpbHVyZSA9IHRydWU7XG4gICAgbGV0IGZhaWxlZEJsb2I6IEJsb2IgfCBudWxsID0gbnVsbDtcbiAgICBzdG9yZS5zYXZlQ2FuZGlkYXRlID0gYXN5bmMgKHJlcXVlc3QpID0+IHtcbiAgICAgIHRyYWNlLnNhdmVDYWxscyArPSAxO1xuICAgICAgdHJhY2Uub3BlcmF0aW9uSWRzLnB1c2gocmVxdWVzdC5vcGVyYXRpb25JZCk7XG4gICAgICB0cmFjZS5ibG9iU2l6ZXMucHVzaChyZXF1ZXN0LmNhcHR1cmUuYmxvYi5zaXplKTtcbiAgICAgIGlmIChmYXVsdE1vZGUgPT09ICdrbm93bi1mYWlsdXJlJyAmJiBmaXJzdEtub3duRmFpbHVyZSkge1xuICAgICAgICBmaXJzdEtub3duRmFpbHVyZSA9IGZhbHNlO1xuICAgICAgICBmYWlsZWRCbG9iID0gcmVxdWVzdC5jYXB0dXJlLmJsb2I7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1N5bnRoZXRpYyBrbm93biBxdW90YSBmYWlsdXJlIGJlZm9yZSBhIHdyaXRlIHdhcyBzZW50LicsICdRdW90YUV4Y2VlZGVkRXJyb3InKTtcbiAgICAgIH1cbiAgICAgIGlmIChmYXVsdE1vZGUgPT09ICdrbm93bi1mYWlsdXJlJyAmJiBmYWlsZWRCbG9iKSB0cmFjZS5yZXRyeVNhbWVCbG9iID0gZmFpbGVkQmxvYiA9PT0gcmVxdWVzdC5jYXB0dXJlLmJsb2I7XG4gICAgICBjb25zdCBjb21taXR0ZWQgPSBhd2FpdCBvcmlnaW5hbFNhdmUocmVxdWVzdCk7XG4gICAgICByZXR1cm4gZmF1bHRNb2RlID09PSAnbG9zdC1hY2tub3dsZWRnZW1lbnQnXG4gICAgICAgID8geyBraW5kOiAndW5rbm93bicsIG9wZXJhdGlvbklkOiByZXF1ZXN0Lm9wZXJhdGlvbklkLCByZWFzb246ICdUZXN0IGhhcm5lc3Mgd2l0aGhlbGQgdGhlIHN1Y2Nlc3NmdWwgYWNrbm93bGVkZ2VtZW50LicgfVxuICAgICAgICA6IGNvbW1pdHRlZDtcbiAgICB9O1xuICAgIHN0b3JlLmxvb2t1cE9wZXJhdGlvbiA9IGFzeW5jICguLi5hcmdzKSA9PiB7XG4gICAgICB0cmFjZS5sb29rdXBDYWxscyArPSAxO1xuICAgICAgaWYgKGZhdWx0TW9kZSA9PT0gJ2xvc3QtYWNrbm93bGVkZ2VtZW50JyAmJiB0cmFjZS5sb29rdXBDYWxscyA9PT0gMSkge1xuICAgICAgICByZXR1cm4geyBraW5kOiAncGVuZGluZycsIG9wZXJhdGlvbklkOiBTdHJpbmcoYXJnc1sxXSkgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnaW5hbExvb2t1cCguLi5hcmdzKTtcbiAgICB9O1xuICB9LCBtb2RlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEFjY2VwdGFuY2VGYWlsdXJlKHBhZ2U6IFBhZ2UpIHtcbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgb3JpZ2luYWxUcmFuc2FjdGlvbiA9IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbjtcbiAgICBjb25zdCB0cmFjZSA9IHsgY2FsbHM6IDAsIHN0b3JlczogW10gYXMgc3RyaW5nW10sIHJlc3RvcmU6ICgpID0+IHVuZGVmaW5lZCB9O1xuICAgICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX2FjY2VwdEZhaWx1cmVUcmFjZT86IHR5cGVvZiB0cmFjZSB9KS5fX2FjY2VwdEZhaWx1cmVUcmFjZSA9IHRyYWNlO1xuICAgIElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uIChzdG9yZU5hbWVzLCBtb2RlLCBvcHRpb25zKSB7XG4gICAgICBjb25zdCBzdG9yZXMgPSB0eXBlb2Ygc3RvcmVOYW1lcyA9PT0gJ3N0cmluZycgPyBbc3RvcmVOYW1lc10gOiBbLi4uc3RvcmVOYW1lc107XG4gICAgICBpZiAodHJhY2UuY2FsbHMgPT09IDAgJiYgbW9kZSA9PT0gJ3JlYWR3cml0ZScgJiYgc3RvcmVzLmluY2x1ZGVzKCdvcGVyYXRpb25zJykpIHtcbiAgICAgICAgdHJhY2UuY2FsbHMgKz0gMTtcbiAgICAgICAgdHJhY2Uuc3RvcmVzID0gc3RvcmVzO1xuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdTeW50aGV0aWMga25vd24gYWNjZXB0YW5jZSB3cml0ZSBmYWlsdXJlLicsICdRdW90YUV4Y2VlZGVkRXJyb3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnaW5hbFRyYW5zYWN0aW9uLmNhbGwodGhpcywgc3RvcmVOYW1lcywgbW9kZSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB0cmFjZS5yZXN0b3JlID0gKCkgPT4geyBJREJEYXRhYmFzZS5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBvcmlnaW5hbFRyYW5zYWN0aW9uOyB9O1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbE5leHRPcGVyYXRpb25Xcml0ZUZhaWx1cmUocGFnZTogUGFnZSkge1xuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbjtcbiAgICBjb25zdCB0cmFjZSA9IHsgY2FsbHM6IDAsIHN0b3JlczogW10gYXMgc3RyaW5nW10gfTtcbiAgICBjb25zdCB0YXJnZXQgPSB3aW5kb3cgYXMgV2luZG93ICYge1xuICAgICAgX19vcGVyYXRpb25Xcml0ZUZhaWx1cmU/OiB0eXBlb2YgdHJhY2U7XG4gICAgICBfX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmU/OiAoKSA9PiB2b2lkO1xuICAgIH07XG4gICAgdGFyZ2V0Ll9fb3BlcmF0aW9uV3JpdGVGYWlsdXJlID0gdHJhY2U7XG4gICAgSURCRGF0YWJhc2UucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKHN0b3JlTmFtZXMsIG1vZGUsIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHN0b3JlcyA9IHR5cGVvZiBzdG9yZU5hbWVzID09PSAnc3RyaW5nJyA/IFtzdG9yZU5hbWVzXSA6IFsuLi5zdG9yZU5hbWVzXTtcbiAgICAgIGlmICh0cmFjZS5jYWxscyA9PT0gMCAmJiBtb2RlID09PSAncmVhZHdyaXRlJyAmJiBzdG9yZXMuaW5jbHVkZXMoJ29wZXJhdGlvbnMnKSkge1xuICAgICAgICB0cmFjZS5jYWxscyArPSAxO1xuICAgICAgICB0cmFjZS5zdG9yZXMgPSBzdG9yZXM7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1N5bnRoZXRpYyBrbm93biBjYW5kaWRhdGUgd3JpdGUgZmFpbHVyZS4nLCAnUXVvdGFFeGNlZWRlZEVycm9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ2luYWwuY2FsbCh0aGlzLCBzdG9yZU5hbWVzLCBtb2RlLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHRhcmdldC5fX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmUgPSAoKSA9PiB7IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IG9yaWdpbmFsOyB9O1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdHJhY2VOZXh0TmF0aXZlQmxvYkRpZ2VzdChwYWdlOiBQYWdlKSB7XG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgIGNvbnN0IHRyYWNlID0geyBjYXB0dXJlczogMCwgYnl0ZVNpemU6IDAsIG1pbWVUeXBlOiAnJywgc2hhMjU2OiBudWxsIGFzIHN0cmluZyB8IG51bGwgfTtcbiAgICAod2luZG93IGFzIFdpbmRvdyAmIHsgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U/OiB0eXBlb2YgdHJhY2UgfSkuX19uYXRpdmVCbG9iRGlnZXN0VHJhY2UgPSB0cmFjZTtcbiAgICBjb25zdCBwcm90b3R5cGUgPSBNZWRpYVJlY29yZGVyLnByb3RvdHlwZTtcbiAgICBjb25zdCBzdGFydCA9IHByb3RvdHlwZS5zdGFydDtcbiAgICBwcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoLi4uYXJnczogUGFyYW1ldGVyczxNZWRpYVJlY29yZGVyWydzdGFydCddPikge1xuICAgICAgY29uc3QgY2h1bmtzOiBCbG9iUGFydFtdID0gW107XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2RhdGFhdmFpbGFibGUnLCAoZXZlbnQpID0+IHsgaWYgKGV2ZW50LmRhdGEuc2l6ZSA+IDApIGNodW5rcy5wdXNoKGV2ZW50LmRhdGEpOyB9KTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignc3RvcCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKGNodW5rcywgeyB0eXBlOiB0aGlzLm1pbWVUeXBlIH0pO1xuICAgICAgICB0cmFjZS5jYXB0dXJlcyArPSAxO1xuICAgICAgICB0cmFjZS5ieXRlU2l6ZSA9IGJsb2Iuc2l6ZTtcbiAgICAgICAgdHJhY2UubWltZVR5cGUgPSBibG9iLnR5cGU7XG4gICAgICAgIHZvaWQgYmxvYi5hcnJheUJ1ZmZlcigpLnRoZW4oKGJ5dGVzKSA9PiBjcnlwdG8uc3VidGxlLmRpZ2VzdCgnU0hBLTI1NicsIGJ5dGVzKSkudGhlbigoZGlnZXN0KSA9PiB7XG4gICAgICAgICAgdHJhY2Uuc2hhMjU2ID0gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShkaWdlc3QpLCAoYnl0ZSkgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSkuam9pbignJyk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuIHN0YXJ0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdG9yZUZhaWx1cmVUcmFjZShwYWdlOiBQYWdlKSB7XG4gIHJldHVybiBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19zdG9yZUZhaWx1cmVUcmFjZTogeyBzYXZlQ2FsbHM6IG51bWJlcjsgbG9va3VwQ2FsbHM6IG51bWJlcjsgb3BlcmF0aW9uSWRzOiBzdHJpbmdbXTsgYmxvYlNpemVzOiBudW1iZXJbXTsgcmV0cnlTYW1lQmxvYjogYm9vbGVhbiB8IG51bGwgfTtcbiAgfSkuX19zdG9yZUZhaWx1cmVUcmFjZSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRJbmRleGVkRGIocGFnZTogUGFnZSkge1xuICByZXR1cm4gcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCBuZXcgUHJvbWlzZTxJREJEYXRhYmFzZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKCdkdWJiZWQtY29yZS1sb2NhbC12MScpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICB9KTtcbiAgICBjb25zdCByZWFkID0gPFQ+KHN0b3JlTmFtZTogc3RyaW5nLCBrZXk/OiBJREJWYWxpZEtleSkgPT4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBkYXRhYmFzZS50cmFuc2FjdGlvbihzdG9yZU5hbWUsICdyZWFkb25seScpO1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGtleSA9PT0gdW5kZWZpbmVkID8gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKS5nZXRBbGwoKSA6IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHN0b3JlTmFtZSkuZ2V0KGtleSk7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQgYXMgVCk7XG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgfSk7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IHJlYWQ8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCdwcm9qZWN0cycsICdzaW50ZWwtcHJlcGFyZWQnKTtcbiAgICBjb25zdCBtZWRpYSA9IGF3YWl0IHJlYWQ8QXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+PignbWVkaWEnKTtcbiAgICBjb25zdCBvcGVyYXRpb25zID0gYXdhaXQgcmVhZDxBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4+KCdvcGVyYXRpb25zJyk7XG4gICAgY29uc3Qgc25hcHNob3RzID0gYXdhaXQgcmVhZDxBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4+KCdzbmFwc2hvdHMnKTtcbiAgICBkYXRhYmFzZS5jbG9zZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0OiBwcm9qZWN0ID8ge1xuICAgICAgICByZXZpc2lvbjogcHJvamVjdC5yZXZpc2lvbixcbiAgICAgICAgZHJhZnRDYW5kaWRhdGVCeVR1cm46IHByb2plY3QuZHJhZnRDYW5kaWRhdGVCeVR1cm4sXG4gICAgICAgIGFjY2VwdGVkQnlUdXJuOiBwcm9qZWN0LmFjY2VwdGVkQnlUdXJuLFxuICAgICAgICBpbml0aWFsUmVzdWx0U25hcHNob3RJZDogcHJvamVjdC5pbml0aWFsUmVzdWx0U25hcHNob3RJZCxcbiAgICAgICAgbGF0ZXN0UmVzdWx0U25hcHNob3RJZDogcHJvamVjdC5sYXRlc3RSZXN1bHRTbmFwc2hvdElkLFxuICAgICAgICB0b21ic3RvbmVkQXQ6IHByb2plY3QudG9tYnN0b25lZEF0LFxuICAgICAgfSA6IG51bGwsXG4gICAgICBtZWRpYTogbWVkaWEubWFwKChjYW5kaWRhdGUpID0+ICh7XG4gICAgICAgIGlkOiBjYW5kaWRhdGUuaWQsXG4gICAgICAgIHB1cnBvc2U6IGNhbmRpZGF0ZS5wdXJwb3NlLFxuICAgICAgICB0dXJuSWQ6IGNhbmRpZGF0ZS50dXJuSWQsXG4gICAgICAgIGJ5dGVTaXplOiBjYW5kaWRhdGUuYnl0ZVNpemUsXG4gICAgICAgIHNoYTI1NjogY2FuZGlkYXRlLnNoYTI1NixcbiAgICAgICAgbWltZVR5cGU6IGNhbmRpZGF0ZS5taW1lVHlwZSxcbiAgICAgICAgZW5kUmVhc29uOiBjYW5kaWRhdGUuZW5kUmVhc29uLFxuICAgICAgICBwcm9iZTogY2FuZGlkYXRlLnByb2JlLFxuICAgICAgICBibG9iU2l6ZTogKGNhbmRpZGF0ZS5ibG9iIGFzIEJsb2IgfCB1bmRlZmluZWQpPy5zaXplID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgICBvcGVyYXRpb25zOiBvcGVyYXRpb25zLm1hcCgob3BlcmF0aW9uKSA9PiAoe1xuICAgICAgICBpZDogb3BlcmF0aW9uLmlkLFxuICAgICAgICBraW5kOiBvcGVyYXRpb24ua2luZCxcbiAgICAgICAgc3RhdGU6IG9wZXJhdGlvbi5zdGF0ZSxcbiAgICAgICAgdHVybklkOiBvcGVyYXRpb24udHVybklkLFxuICAgICAgICBwcm9qZWN0UmV2aXNpb246IG9wZXJhdGlvbi5wcm9qZWN0UmV2aXNpb24sXG4gICAgICAgIHNuYXBzaG90SWQ6IG9wZXJhdGlvbi5zbmFwc2hvdElkLFxuICAgICAgICBuYXZpZ2F0aW9uSW50ZW50OiBvcGVyYXRpb24ubmF2aWdhdGlvbkludGVudCxcbiAgICAgICAgbmF2aWdhdGlvbkNvbXBsZXRlZDogb3BlcmF0aW9uLm5hdmlnYXRpb25Db21wbGV0ZWQsXG4gICAgICAgIHNoYTI1Njogb3BlcmF0aW9uLnNoYTI1NixcbiAgICAgIH0pKSxcbiAgICAgIHNuYXBzaG90czogc25hcHNob3RzLm1hcCgoc25hcHNob3QpID0+ICh7XG4gICAgICAgIGlkOiBzbmFwc2hvdC5pZCxcbiAgICAgICAgcHJvamVjdFJldmlzaW9uOiBzbmFwc2hvdC5wcm9qZWN0UmV2aXNpb24sXG4gICAgICAgIGNvbnRlbnRTaGEyNTY6IHNuYXBzaG90LmNvbnRlbnRTaGEyNTYsXG4gICAgICAgIGF1dGhvcml6YXRpb246IHNuYXBzaG90LmF1dGhvcml6YXRpb24sXG4gICAgICAgIHRha2VzOiBzbmFwc2hvdC50YWtlcyxcbiAgICAgIH0pKSxcbiAgICB9O1xuICB9KTtcbn1cblxudGVzdCgncmVjb25jaWxlcyBhIGxvc3Qgc2F2ZSBhY2tub3dsZWRnZW1lbnQgd2l0aCB0aGUgb3JpZ2luYWwgb3BlcmF0aW9uIGJlZm9yZSBhY2NlcHRpbmcgdGhlIGNhbmRpZGF0ZScsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgYXdhaXQgaW5zdHJ1bWVudE5hdGl2ZU1lZGlhKHBhZ2UpO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gIGF3YWl0IGluc3RhbGxTdG9yZUZhaWx1cmUocGFnZSwgJ2xvc3QtYWNrbm93bGVkZ2VtZW50Jyk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgxKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ1RoZSBzYXZlIG91dGNvbWUgaXMgdW5rbm93bi4gQ2hlY2sgdGhpcyBzYW1lIG9wZXJhdGlvbiBiZWZvcmUgdHJ5aW5nIGFub3RoZXIgcmVjb3JkaW5nLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0NoZWNrIHNhdmVkIHN0YXR1cycsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBjb25zdCB1bmtub3duVHJhY2UgPSBhd2FpdCBzdG9yZUZhaWx1cmVUcmFjZShwYWdlKTtcbiAgZXhwZWN0KHVua25vd25UcmFjZS5zYXZlQ2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdCh1bmtub3duVHJhY2UubG9va3VwQ2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdCh1bmtub3duVHJhY2Uub3BlcmF0aW9uSWRzKS50b0hhdmVMZW5ndGgoMSk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0NoZWNrIHNhdmVkIHN0YXR1cycsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGNvbnN0IHN0b3JlZCA9IGF3YWl0IHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICBjb25zdCByZXNvbHZlZFRyYWNlID0gYXdhaXQgc3RvcmVGYWlsdXJlVHJhY2UocGFnZSk7XG4gIGV4cGVjdChyZXNvbHZlZFRyYWNlLnNhdmVDYWxscykudG9CZSgxKTtcbiAgZXhwZWN0KHJlc29sdmVkVHJhY2UubG9va3VwQ2FsbHMpLnRvQmUoMik7XG4gIGV4cGVjdChyZXNvbHZlZFRyYWNlLm9wZXJhdGlvbklkcykudG9FcXVhbChbdW5rbm93blRyYWNlLm9wZXJhdGlvbklkc1swXV0pO1xuICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGNvbnN0IGpvdXJuYWxFbnRyeSA9IGRhdGFiYXNlLm9wZXJhdGlvbnMuZmluZCgob3BlcmF0aW9uKSA9PiBvcGVyYXRpb24uaWQgPT09IHVua25vd25UcmFjZS5vcGVyYXRpb25JZHNbMF0pO1xuICBleHBlY3Qoam91cm5hbEVudHJ5Py5zdGF0ZSkudG9CZSgnY29tbWl0dGVkJyk7XG4gIGV4cGVjdChqb3VybmFsRW50cnk/LnNoYTI1NikudG9CZShzdG9yZWQ/LnNoYTI1Nik7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdsb3N0LXNhdmUtYWNrLWJyb3dzZXItZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIHNjZW5hcmlvOiAnVGhlIG1vY2sgc3RvcmUgY29tbWl0dGVkIHRoZSBCbG9iIGJ1dCB3aXRoaGVsZCBpdHMgYWNrbm93bGVkZ2VtZW50OyBmaXJzdCBzdGF0dXMgbG9va3VwIHJlcG9ydGVkIHBlbmRpbmc7IGV4cGxpY2l0IGNoZWNrIHJlYWQgdGhlIGNvbW1pdHRlZCByZWNlaXB0LicsXG4gICAgcGh5c2ljYWxNaWNyb3Bob25lOiBmYWxzZSxcbiAgICBuYXRpdmVBcGlFdmlkZW5jZTogYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSxcbiAgICB0cmFjZTogcmVzb2x2ZWRUcmFjZSxcbiAgICBqb3VybmFsRW50cnksXG4gICAgc2F2ZWRDYW5kaWRhdGU6IHN0b3JlZCxcbiAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG59KTtcblxudGVzdCgna2VlcHMgYW4gYWNjZXB0ZWQgdGFrZSBpbnRhY3QgYWZ0ZXIgYSBrbm93biBzYXZlIGZhaWx1cmUgYW5kIHJldHJpZXMgdGhlIGV4YWN0IGNhcHR1cmVkIEJsb2InLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDQ1XzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEnKTtcbiAgYXdhaXQgcmVjb3JkQ3VycmVudFdpbmRvdyhwYWdlLCAnQScpO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3R1cm49c2ludGVsLXR1cm4tMi8pO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUHJldmlvdXMnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC90dXJuPXNpbnRlbC10dXJuLTEvKTtcbiAgY29uc3QgYmVmb3JlRmFpbHVyZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGNvbnN0IGFjY2VwdGVkQmVmb3JlID0gKGJlZm9yZUZhaWx1cmUucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ3NpbnRlbC10dXJuLTEnXTtcbiAgZXhwZWN0KGFjY2VwdGVkQmVmb3JlKS50b0JlVHJ1dGh5KCk7XG5cbiAgYXdhaXQgaW5zdGFsbE5leHRPcGVyYXRpb25Xcml0ZUZhaWx1cmUocGFnZSk7XG4gIGF3YWl0IHRyYWNlTmV4dE5hdGl2ZUJsb2JEaWdlc3QocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiAoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkucmVjb3JkZXJTdGFydHMpLnRvQmUoMik7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdUaGUgY2FuZGlkYXRlIGNvdWxkIG5vdCBiZSBzYXZlZC4gVGhlIGN1cnJlbnQgcmVjb3JkaW5nIGFuZCBwcmV2aW91c2x5IGFjY2VwdGVkIHRha2UgcmVtYWluIGF2YWlsYWJsZSBoZXJlLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IHNhdmUnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgY29uc3QgcmVjb3ZlcnlUb2FzdCA9IHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0Jyk7XG4gIGF3YWl0IGV4cGVjdChyZWNvdmVyeVRvYXN0KS50b0JlVmlzaWJsZSgpO1xuICBleHBlY3QoYXdhaXQgcmVjb3ZlcnlUb2FzdC5nZXRCeVJvbGUoJ2J1dHRvbicpLmNvdW50KCkpLnRvQmUoMCk7XG4gIGNvbnN0IHRvYXN0U3R5bGUgPSBhd2FpdCByZWNvdmVyeVRvYXN0LmV2YWx1YXRlKChlbGVtZW50KSA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICAgIGNvbnN0IGJvdW5kcyA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgaWNvbiA9IGVsZW1lbnQucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJhY2tncm91bmQ6IHN0eWxlLmJhY2tncm91bmRDb2xvcixcbiAgICAgIGJvcmRlclJhZGl1czogc3R5bGUuYm9yZGVyUmFkaXVzLFxuICAgICAgYm90dG9tOiBzdHlsZS5ib3R0b20sXG4gICAgICB3aWR0aDogYm91bmRzLndpZHRoLFxuICAgICAgcGFkZGluZzogc3R5bGUucGFkZGluZyxcbiAgICAgIGJveFNoYWRvdzogc3R5bGUuYm94U2hhZG93LFxuICAgICAgaWNvbkNvbG9yOiBpY29uID8gZ2V0Q29tcHV0ZWRTdHlsZShpY29uKS5jb2xvciA6IG51bGwsXG4gICAgICB0aXRsZUZvbnQ6IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3ZlcnktdG9hc3RfX3RpdGxlJykhKS5mb250LFxuICAgICAgYm9keUZvbnQ6IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3ZlcnktdG9hc3RfX2JvZHknKSEpLmZvbnQsXG4gICAgfTtcbiAgfSk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLmJhY2tncm91bmQpLnRvQmUoJ3JnYigzMiwgMzIsIDMyKScpO1xuICBleHBlY3QodG9hc3RTdHlsZS5ib3JkZXJSYWRpdXMpLnRvQmUoJzEwcHgnKTtcbiAgZXhwZWN0KHRvYXN0U3R5bGUuYm90dG9tKS50b0JlKCcxNnB4Jyk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLndpZHRoKS50b0JlTGVzc1RoYW5PckVxdWFsKDUyMCk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLnBhZGRpbmcpLnRvQmUoJzE0cHggMTZweCcpO1xuICBleHBlY3QodG9hc3RTdHlsZS5pY29uQ29sb3IpLnRvQmUoJ3JnYigyNTUsIDE1NiwgMTU5KScpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdrbm93bi1zYXZlLWZhaWx1cmUtcmVjb3ZlcnktdG9hc3QucG5nJykgfSk7XG4gIGNvbnN0IGZhaWxlZFRyYWNlID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX29wZXJhdGlvbldyaXRlRmFpbHVyZTogeyBjYWxsczogbnVtYmVyOyBzdG9yZXM6IHN0cmluZ1tdIH0gfSkuX19vcGVyYXRpb25Xcml0ZUZhaWx1cmUpO1xuICBleHBlY3QoZmFpbGVkVHJhY2UuY2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdChmYWlsZWRUcmFjZS5zdG9yZXMpLnRvQ29udGFpbignb3BlcmF0aW9ucycpO1xuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fcmVzdG9yZU9wZXJhdGlvbldyaXRlRmFpbHVyZTogKCkgPT4gdm9pZCB9KS5fX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmUoKSk7XG4gIGNvbnN0IGZvY3VzQmVmb3JlRXhwaXJ5ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgIHJlY292ZXJ5Rm9jdXNlZDogZG9jdW1lbnQuYWN0aXZlRWxlbWVudD8ubWF0Y2hlcygnW2RhdGEtcmVjb3ZlcnktYWN0aW9uPVwicmV0cnktc2F2ZVwiXScpID8/IGZhbHNlLFxuICAgIHNjcm9sbFk6IHdpbmRvdy5zY3JvbGxZLFxuICB9KSk7XG4gIGV4cGVjdChmb2N1c0JlZm9yZUV4cGlyeS5yZWNvdmVyeUZvY3VzZWQpLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IGV4cGVjdChyZWNvdmVyeVRvYXN0KS50b0hhdmVDb3VudCgwLCB7IHRpbWVvdXQ6IDEwXzAwMCB9KTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UubG9jYXRvcignW2RhdGEtcmVjb3ZlcnktYWN0aW9uPVwicmV0cnktc2F2ZVwiXScpLmV2YWx1YXRlKChlbGVtZW50KSA9PiBlbGVtZW50ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50KSkudG9CZSh0cnVlKTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKGZvY3VzQmVmb3JlRXhwaXJ5LnNjcm9sbFkpO1xuICBjb25zdCBhZnRlckZhaWx1cmUgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoKGFmdGVyRmFpbHVyZS5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnc2ludGVsLXR1cm4tMSddKS50b0JlKGFjY2VwdGVkQmVmb3JlKTtcbiAgZXhwZWN0KGFmdGVyRmFpbHVyZS5tZWRpYS5maWx0ZXIoKHN0b3JlZCkgPT4gc3RvcmVkLnB1cnBvc2UgPT09ICdyZWNvcmRpbmcnICYmIHN0b3JlZC5pZCAhPT0gYWNjZXB0ZWRCZWZvcmUpKS50b0hhdmVMZW5ndGgoMCk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IHNhdmUnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBjb25zdCBzYXZlZCA9IGF3YWl0IHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U6IHsgY2FwdHVyZXM6IG51bWJlcjsgYnl0ZVNpemU6IG51bWJlcjsgbWltZVR5cGU6IHN0cmluZzsgc2hhMjU2OiBzdHJpbmcgfCBudWxsIH07XG4gIH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlLnNoYTI1NiksIHsgdGltZW91dDogNV8wMDAgfSkudG9CZShzYXZlZD8uc2hhMjU2KTtcbiAgY29uc3QgcmVjb3ZlcmVkVHJhY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U6IHsgY2FwdHVyZXM6IG51bWJlcjsgYnl0ZVNpemU6IG51bWJlcjsgbWltZVR5cGU6IHN0cmluZzsgc2hhMjU2OiBzdHJpbmcgfCBudWxsIH07XG4gIH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlKTtcbiAgZXhwZWN0KHJlY292ZXJlZFRyYWNlLmNhcHR1cmVzKS50b0JlKDEpO1xuICBleHBlY3QocmVjb3ZlcmVkVHJhY2UuYnl0ZVNpemUpLnRvQmUoc2F2ZWQ/LmJsb2JTaXplKTtcbiAgZXhwZWN0KHJlY292ZXJlZFRyYWNlLm1pbWVUeXBlKS50b0JlKHNhdmVkPy5taW1lVHlwZSk7XG4gIGNvbnN0IGFmdGVyUmV0cnkgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoKGFmdGVyUmV0cnkucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ3NpbnRlbC10dXJuLTEnXSkudG9CZShhY2NlcHRlZEJlZm9yZSk7XG4gIGV4cGVjdCgoYWZ0ZXJSZXRyeS5wcm9qZWN0Py5kcmFmdENhbmRpZGF0ZUJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnc2ludGVsLXR1cm4tMSddKS50b0JlKHNhdmVkPy5pZCk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdrbm93bi1zYXZlLWZhaWx1cmUtYnJvd3Nlci1ldmlkZW5jZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgc2NlbmFyaW86ICdGaXJzdCBhY2NlcHRlZCB0YWtlIHByZXNlcnZlZCBhZnRlciBhIGtub3duIHByZS13cml0ZSBxdW90YSBmYWlsdXJlLiBSZXRyeSBzYXZlZCB0aGUgZXhhY3QgY2FwdHVyZWQgQmxvYiB3aXRob3V0IHJlLXJlY29yZGluZy4nLFxuICAgIHBoeXNpY2FsTWljcm9waG9uZTogZmFsc2UsXG4gICAgbmF0aXZlQXBpRXZpZGVuY2U6IGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSksXG4gICAgYWNjZXB0ZWRDYW5kaWRhdGVCZWZvcmVGYWlsdXJlOiBhY2NlcHRlZEJlZm9yZSxcbiAgICBmYWlsZWRBdHRlbXB0OiBmYWlsZWRUcmFjZSxcbiAgICByZWNvdmVyeVRvYXN0OiB0b2FzdFN0eWxlLFxuICAgIGNhcHR1cmVkQmxvYkJlZm9yZVBlcnNpc3RlbmNlOiByZWNvdmVyZWRUcmFjZSxcbiAgICByZXRyeTogcmVjb3ZlcmVkVHJhY2UsXG4gICAgZmluYWxQcm9qZWN0OiBhZnRlclJldHJ5LnByb2plY3QsXG4gICAgcmV0cmllZENhbmRpZGF0ZTogc2F2ZWQsXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbnRlc3QoJ2ZhaWxlZCBndWFyZGVkIEV4aXQga2VlcHMgdGhlIG9yaWdpbmFsIGludGVudCwgZm9jdXNlcyBSZXRyeSwgYW5kIHJlc3RvcmVzIEV4aXQgYWZ0ZXIgcmV0cnkgYW5kIGJvdW5kYXJ5IHJldHVybicsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICB0ZXN0LnNldFRpbWVvdXQoNDVfMDAwKTtcbiAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG4gIGF3YWl0IGluc3RydW1lbnROYXRpdmVNZWRpYShwYWdlKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QSZsb2NhbGU9ZW4nKTtcbiAgY29uc3QgY2FuZGlkYXRlID0gYXdhaXQgKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PlxuICAgICAgdmlkZW8ucmVhZHlTdGF0ZSA+PSBIVE1MTWVkaWFFbGVtZW50LkhBVkVfQ1VSUkVOVF9EQVRBICYmIHZpZGVvLnZpZGVvV2lkdGggPiAwKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCByZWNvcmRDdXJyZW50V2luZG93KHBhZ2UsICdBJyk7XG4gICAgcmV0dXJuIHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICB9KSgpO1xuICBhd2FpdCBpbnN0YWxsQWNjZXB0YW5jZUZhaWx1cmUocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgY29uc3QgZ3VhcmQgPSBwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJyk7XG4gIGF3YWl0IGV4cGVjdChndWFyZCkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgZ3VhcmQuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTYXZlIGFuZCBsZWF2ZScsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChndWFyZC5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IGFjY2VwdCBhbmQgbGVhdmUnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgY29uc3QgcmV0cnkgPSBndWFyZC5sb2NhdG9yKCdbZGF0YS1yZWNvdmVyeS1hY3Rpb249XCJyZXRyeS1ndWFyZFwiXScpO1xuICBhd2FpdCBleHBlY3QocmV0cnkpLnRvQmVGb2N1c2VkKCk7XG4gIGNvbnN0IGZhaWxlZCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGV4cGVjdChmYWlsZWQucHJvamVjdD8uZHJhZnRDYW5kaWRhdGVCeVR1cm4pLnRvTWF0Y2hPYmplY3QoeyAnc2ludGVsLXR1cm4tMSc6IGNhbmRpZGF0ZT8uaWQgfSk7XG4gIGV4cGVjdChPYmplY3QudmFsdWVzKGZhaWxlZC5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID8/IHt9KSkudG9IYXZlTGVuZ3RoKDApO1xuICBjb25zdCBhY2NlcHRhbmNlRmFpbHVyZSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHdpbmRvdyBhcyB1bmtub3duIGFzIFdpbmRvdyAmIHsgX19hY2NlcHRGYWlsdXJlVHJhY2U6IHsgY2FsbHM6IG51bWJlcjsgc3RvcmVzOiBzdHJpbmdbXTsgcmVzdG9yZTogKCkgPT4gdm9pZCB9IH0pLl9fYWNjZXB0RmFpbHVyZVRyYWNlKTtcbiAgZXhwZWN0KGFjY2VwdGFuY2VGYWlsdXJlLmNhbGxzKS50b0JlKDEpO1xuICBleHBlY3QoYWNjZXB0YW5jZUZhaWx1cmUuc3RvcmVzKS50b0NvbnRhaW4oJ29wZXJhdGlvbnMnKTtcbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX2FjY2VwdEZhaWx1cmVUcmFjZTogeyByZXN0b3JlOiAoKSA9PiB2b2lkIH0gfSkuX19hY2NlcHRGYWlsdXJlVHJhY2UucmVzdG9yZSgpKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnZ3VhcmRlZC1leGl0LWtub3duLWFjY2VwdGFuY2UtZmFpbHVyZS5wbmcnKSB9KTtcblxuICBjb25zdCBiZWZvcmVUb2FzdEV4cGlyeSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHtcbiAgICBmb2N1c2VkUmV0cnk6IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ/Lm1hdGNoZXMoJ1tkYXRhLXJlY292ZXJ5LWFjdGlvbj1cInJldHJ5LWd1YXJkXCJdJykgPz8gZmFsc2UsXG4gICAgc2Nyb2xsWTogd2luZG93LnNjcm9sbFksXG4gIH0pKTtcbiAgZXhwZWN0KGJlZm9yZVRvYXN0RXhwaXJ5LmZvY3VzZWRSZXRyeSkudG9CZSh0cnVlKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0JykpLnRvSGF2ZUNvdW50KDAsIHsgdGltZW91dDogMTBfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocmV0cnkpLnRvQmVGb2N1c2VkKCk7XG4gIGNvbnN0IHJldHJ5Rm9jdXNlZEFmdGVyVG9hc3RFeHBpcnkgPSBhd2FpdCByZXRyeS5ldmFsdWF0ZSgoZWxlbWVudCkgPT4gZWxlbWVudCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCk7XG4gIGV4cGVjdChyZXRyeUZvY3VzZWRBZnRlclRvYXN0RXhwaXJ5KS50b0JlKHRydWUpO1xuICBleHBlY3QoYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB3aW5kb3cuc2Nyb2xsWSkpLnRvQmUoYmVmb3JlVG9hc3RFeHBpcnkuc2Nyb2xsWSk7XG4gIGF3YWl0IHJldHJ5LmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3Byb2plY3RzXFw/LipyZXR1cm5Gb2N1cz1leGl0Lyk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2d1YXJkZWQtZXhpdC1zdWNjZXNzLWJvdW5kYXJ5LnBuZycpLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPWV4aXQvKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgY29uc3QgYWNjZXB0ZWQgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoYWNjZXB0ZWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4pLnRvTWF0Y2hPYmplY3QoeyAnc2ludGVsLXR1cm4tMSc6IGNhbmRpZGF0ZT8uaWQgfSk7XG4gIGNvbnN0IHN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zID0gYWNjZXB0ZWQub3BlcmF0aW9ucy5maWx0ZXIoKG9wZXJhdGlvbikgPT4gb3BlcmF0aW9uLmtpbmQgPT09ICdhY2NlcHQtY2FuZGlkYXRlJyAmJiBvcGVyYXRpb24uc3RhdGUgPT09ICdjb21taXR0ZWQnKTtcbiAgZXhwZWN0KHN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zKS50b0hhdmVMZW5ndGgoMSk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdndWFyZGVkLWV4aXQtcmV0cnktZm9jdXMtZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIG5hdGl2ZUlucHV0OiAnQ2hyb21lIGJyb3dzZXIgZmFrZSBhdWRpbyBpbnB1dDsgbm90IGEgcGh5c2ljYWwgbWljcm9waG9uZScsXG4gICAgY2FuZGlkYXRlSWQ6IGNhbmRpZGF0ZT8uaWQsXG4gICAgYWNjZXB0ZWRCZWZvcmVSZXRyeTogZmFpbGVkLnByb2plY3Q/LmFjY2VwdGVkQnlUdXJuLFxuICAgIGFjY2VwdGVkQWZ0ZXJSZXRyeTogYWNjZXB0ZWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4sXG4gICAgZmFpbHVyZVRyYWNlOiBhY2NlcHRhbmNlRmFpbHVyZSxcbiAgICBzdWNjZXNzZnVsQWNjZXB0T3BlcmF0aW9ucyxcbiAgICBmb2N1c0JlZm9yZVRvYXN0RXhwaXJ5OiBiZWZvcmVUb2FzdEV4cGlyeSxcbiAgICByZXRyeUZvY3VzZWRBZnRlclRvYXN0RXhwaXJ5LFxuICAgIGJvdW5kYXJ5UmV0dXJuRm9jdXNlZEV4aXQ6IGF3YWl0IHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKS5ldmFsdWF0ZSgoZWxlbWVudCkgPT4gZWxlbWVudCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCksXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlOiBQYWdlLCBsYXlvdXQ6ICdBJyB8ICdCJykge1xuICBjb25zdCBub3RpY2UgPSBsYXlvdXQgPT09ICdBJyA/IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykgOiBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtc3RhdHVzLS1iIC5ub3RpY2UnKTtcbiAgYXdhaXQgZXhwZWN0KG5vdGljZSkudG9Db250YWluVGV4dCgnVGFrZSBzYXZlZCBhcyBhIHJlY292ZXJhYmxlIGNhbmRpZGF0ZS4gSXQgaGFzIG5vdCBiZWVuIGFjY2VwdGVkLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcud2F2ZWZvcm0tdGFrZScpKS50b0hhdmVDb3VudCgxKTtcbiAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBjb25zdCBjdXJyZW50VHVybklkID0gbmV3IFVSTChwYWdlLnVybCgpKS5zZWFyY2hQYXJhbXMuZ2V0KCd0dXJuJykgPz8gJ3NpbnRlbC10dXJuLTEnO1xuICBjb25zdCBkcmFmdEJ5VHVybiA9IGRhdGFiYXNlLnByb2plY3Q/LmRyYWZ0Q2FuZGlkYXRlQnlUdXJuIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGN1cnJlbnQgPSBkYXRhYmFzZS5tZWRpYS5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gZHJhZnRCeVR1cm4/LltjdXJyZW50VHVybklkXSk7XG4gIGV4cGVjdChjdXJyZW50Py5ibG9iU2l6ZSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICBleHBlY3QoY3VycmVudD8uYmxvYlNpemUpLnRvQmUoY3VycmVudD8uYnl0ZVNpemUpO1xuICBleHBlY3QoY3VycmVudD8uc2hhMjU2KS50b01hdGNoKC9eW2EtZjAtOV17NjR9JC8pO1xuICBleHBlY3QoKGN1cnJlbnQ/LnByb2JlIGFzIHsgYnl0ZVNpemU/OiBudW1iZXIgfSkuYnl0ZVNpemUpLnRvQmUoY3VycmVudD8uYmxvYlNpemUpO1xuICByZXR1cm4gY3VycmVudDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVjb3JkQ3VycmVudFdpbmRvdyhwYWdlOiBQYWdlLCBsYXlvdXQ6ICdBJyB8ICdCJykge1xuICBjb25zdCByZWNvcmRCdXR0b24gPSBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSk7XG4gIGF3YWl0IGV4cGVjdChyZWNvcmRCdXR0b24pLnRvQmVFbmFibGVkKCk7XG4gIGF3YWl0IHJlY29yZEJ1dHRvbi5jbGljaygpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiAoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkucmVjb3JkZXJTdGFydHMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgY29uc3Qgc3RhcnRlZEF0ID0gYXdhaXQgcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpO1xuICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDQwMCk7XG4gIGNvbnN0IG1vdmVkVG8gPSBhd2FpdCBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSk7XG4gIGV4cGVjdChtb3ZlZFRvKS50b0JlR3JlYXRlclRoYW4oc3RhcnRlZEF0KTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6IC9Db3VudGRvd258U3RvcCByZWNvcmRpbmd8UGF1c2UgcmVjb3JkaW5nL2kgfSkpLnRvSGF2ZUNvdW50KDApO1xuICBhd2FpdCB3YWl0Rm9yU2F2ZWRDYW5kaWRhdGUocGFnZSwgbGF5b3V0KTtcbn1cblxudGVzdC5iZWZvcmVBbGwoYXN5bmMgKCkgPT4gbWtkaXIoZXZpZGVuY2VEaXJlY3RvcnksIHsgcmVjdXJzaXZlOiB0cnVlIH0pKTtcblxudGVzdCgnRXhpdCByZXR1cm5zIHRocm91Z2ggdGhlIGd1YXJkZWQgUHJvamVjdHMgYm91bmRhcnkgYW5kIHJlc3RvcmVzIGZvY3VzIHRvIHRoZSBsb2dpY2FsIEV4aXQgY29udHJvbCcsIGFzeW5jICh7IHBhZ2UgfSkgPT4ge1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJmxvY2FsZT1lbicpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlciAubHVjaWRlLWxvZy1vdXQnKSkudG9IYXZlQ291bnQoMSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvcHJvamVjdHNcXD8vKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPWV4aXQvKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnZXhpdC1ib3VuZGFyeS1yZXR1cm4tZm9jdXMucG5nJykgfSk7XG59KTtcblxudGVzdCgnZGVsYXllZCBzb3VyY2UgcGxheWJhY2sga2VlcHMgdGhlIHJlY29yZGVyIGlkbGUgdW50aWwgdGhlIHByZXBhcmVkIHdpbmRvdyBhY3R1YWxseSBzdGFydHMnLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDQ1XzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEmbG9jYWxlPWVuJyk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcigndmlkZW8nKS5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+XG4gICAgdmlkZW8ucmVhZHlTdGF0ZSA+PSBIVE1MTWVkaWFFbGVtZW50LkhBVkVfQ1VSUkVOVF9EQVRBICYmIHZpZGVvLnZpZGVvV2lkdGggPiAwKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgY29uc3QgcHJlcGFyZWRXaW5kb3cgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IG5ldyBQcm9taXNlPElEQkRhdGFiYXNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oJ2R1YmJlZC1jb3JlLWxvY2FsLXYxJyk7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgIH0pO1xuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBuZXcgUHJvbWlzZTx7IHdpbmRvd3M6IEFycmF5PHsgaWQ6IHN0cmluZzsgc3RhcnRNczogbnVtYmVyOyBlbmRNczogbnVtYmVyIH0+IH0+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBkYXRhYmFzZS50cmFuc2FjdGlvbigncHJvamVjdHMnLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZSgncHJvamVjdHMnKS5nZXQoJ3NpbnRlbC1wcmVwYXJlZCcpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICB9KTtcbiAgICBkYXRhYmFzZS5jbG9zZSgpO1xuICAgIGNvbnN0IHNlbGVjdGVkID0gcHJvamVjdC53aW5kb3dzLmZpbmQoKHdpbmRvdykgPT4gd2luZG93LmlkID09PSAnc2ludGVsLXR1cm4tMScpO1xuICAgIGlmICghc2VsZWN0ZWQpIHRocm93IG5ldyBFcnJvcignUHJlcGFyZWQgdHVybiAxIGlzIG1pc3NpbmcgaXRzIHNvdXJjZSB3aW5kb3cuJyk7XG4gICAgcmV0dXJuIHNlbGVjdGVkO1xuICB9KTtcbiAgYXdhaXQgcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKChlbGVtZW50KSA9PiB7XG4gICAgY29uc3QgdmlkZW8gPSBlbGVtZW50IGFzIEhUTUxWaWRlb0VsZW1lbnQ7XG4gICAgY29uc3QgdHJhY2UgPSB7XG4gICAgICByZXF1ZXN0ZWRBdDogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgbmF0aXZlUGxheUF0OiBudWxsIGFzIG51bWJlciB8IG51bGwsXG4gICAgICBwbGF5aW5nQXQ6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHBsYXlpbmdWaWRlb1RpbWU6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHJlY29yZGVyU3RhcnRBdDogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgcmVjb3JkZXJTdGFydFZpZGVvVGltZTogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgcmVjb3JkZXJTdG9wQXQ6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHJlY29yZGVyU3RvcFZpZGVvVGltZTogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgIH07XG4gICAgKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZT86IHR5cGVvZiB0cmFjZSB9KS5fX2RlbGF5ZWRDYXB0dXJlVHJhY2UgPSB0cmFjZTtcbiAgICBjb25zdCBuYXRpdmVQbGF5ID0gdmlkZW8ucGxheS5iaW5kKHZpZGVvKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodmlkZW8sICdwbGF5Jywge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgdHJhY2UucmVxdWVzdGVkQXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0cmFjZS5uYXRpdmVQbGF5QXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgIG5hdGl2ZVBsYXkoKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSwgMV8yMDApO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdmlkZW8uYWRkRXZlbnRMaXN0ZW5lcigncGxheWluZycsICgpID0+IHtcbiAgICAgIHRyYWNlLnBsYXlpbmdBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdHJhY2UucGxheWluZ1ZpZGVvVGltZSA9IHZpZGVvLmN1cnJlbnRUaW1lO1xuICAgIH0sIHsgb25jZTogdHJ1ZSB9KTtcbiAgICBjb25zdCBzdGFydCA9IE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0O1xuICAgIE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFSZWNvcmRlclsnc3RhcnQnXT4pIHtcbiAgICAgIHRyYWNlLnJlY29yZGVyU3RhcnRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdHJhY2UucmVjb3JkZXJTdGFydFZpZGVvVGltZSA9IHZpZGVvLmN1cnJlbnRUaW1lO1xuICAgICAgcmV0dXJuIHN0YXJ0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgY29uc3Qgc3RvcCA9IE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0b3A7XG4gICAgTWVkaWFSZWNvcmRlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICguLi5hcmdzOiBQYXJhbWV0ZXJzPE1lZGlhUmVjb3JkZXJbJ3N0b3AnXT4pIHtcbiAgICAgIHRyYWNlLnJlY29yZGVyU3RvcEF0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICB0cmFjZS5yZWNvcmRlclN0b3BWaWRlb1RpbWUgPSB2aWRlby5jdXJyZW50VGltZTtcbiAgICAgIHJldHVybiBzdG9wLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH0pO1xuXG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1ByZXBhcmluZyByZWNvcmRpbmfigKYnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCgzNTApO1xuICBjb25zdCBiZWZvcmVSZWFsUGxheWJhY2sgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCB0cmFjZSA9ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZTogeyByZWNvcmRlclN0YXJ0QXQ6IG51bWJlciB8IG51bGw7IHJlcXVlc3RlZEF0OiBudW1iZXIgfCBudWxsIH0gfSkuX19kZWxheWVkQ2FwdHVyZVRyYWNlO1xuICAgIHJldHVybiB7IC4uLnRyYWNlLCB2aWRlb1RpbWU6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3ZpZGVvJyk/LmN1cnJlbnRUaW1lID8/IG51bGwgfTtcbiAgfSk7XG4gIGV4cGVjdChiZWZvcmVSZWFsUGxheWJhY2sucmVxdWVzdGVkQXQpLm5vdC50b0JlTnVsbCgpO1xuICBleHBlY3QoYmVmb3JlUmVhbFBsYXliYWNrLnJlY29yZGVyU3RhcnRBdCkudG9CZU51bGwoKTtcbiAgZXhwZWN0KGJlZm9yZVJlYWxQbGF5YmFjay52aWRlb1RpbWUpLm5vdC50b0JlTnVsbCgpO1xuICBleHBlY3QoTWF0aC5hYnMoKGJlZm9yZVJlYWxQbGF5YmFjay52aWRlb1RpbWUgPz8gMCkgLSBwcmVwYXJlZFdpbmRvdy5zdGFydE1zIC8gMTAwMCkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMC4wNSk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2RlbGF5ZWQtc291cmNlLXByZXBhcmluZy5wbmcnKSB9KTtcblxuICBjb25zdCBjYW5kaWRhdGUgPSBhd2FpdCB3YWl0Rm9yU2F2ZWRDYW5kaWRhdGUocGFnZSwgJ0EnKTtcbiAgY29uc3QgdHJhY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZTogUmVjb3JkPHN0cmluZywgbnVtYmVyIHwgbnVsbD4gfSkuX19kZWxheWVkQ2FwdHVyZVRyYWNlKTtcbiAgY29uc3QgZXhwZWN0ZWREdXJhdGlvbiA9IChwcmVwYXJlZFdpbmRvdy5lbmRNcyAtIHByZXBhcmVkV2luZG93LnN0YXJ0TXMpIC8gMTAwMDtcbiAgZXhwZWN0KHRyYWNlLm5hdGl2ZVBsYXlBdCkudG9CZUdyZWF0ZXJUaGFuKHRyYWNlLnJlcXVlc3RlZEF0ID8/IDApO1xuICBleHBlY3QoKHRyYWNlLm5hdGl2ZVBsYXlBdCA/PyAwKSAtICh0cmFjZS5yZXF1ZXN0ZWRBdCA/PyAwKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgxXzE1MCk7XG4gIGV4cGVjdCh0cmFjZS5wbGF5aW5nQXQpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwodHJhY2UubmF0aXZlUGxheUF0ID8/IDApO1xuICBleHBlY3QodHJhY2UucmVjb3JkZXJTdGFydEF0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKHRyYWNlLnBsYXlpbmdBdCA/PyAwKTtcbiAgZXhwZWN0KE1hdGguYWJzKCh0cmFjZS5yZWNvcmRlclN0YXJ0VmlkZW9UaW1lID8/IDApIC0gKHRyYWNlLnBsYXlpbmdWaWRlb1RpbWUgPz8gMCkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDAuMDUpO1xuICBleHBlY3QoKHRyYWNlLnBsYXlpbmdWaWRlb1RpbWUgPz8gMCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwocHJlcGFyZWRXaW5kb3cuc3RhcnRNcyAvIDEwMDAgLSAwLjA1KTtcbiAgZXhwZWN0KCh0cmFjZS5yZWNvcmRlclN0b3BWaWRlb1RpbWUgPz8gMCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwocHJlcGFyZWRXaW5kb3cuZW5kTXMgLyAxMDAwIC0gMC4xNSk7XG4gIGV4cGVjdChNYXRoLmFicygoKHRyYWNlLnJlY29yZGVyU3RvcFZpZGVvVGltZSA/PyAwKSAtICh0cmFjZS5yZWNvcmRlclN0YXJ0VmlkZW9UaW1lID8/IDApKSAtIGV4cGVjdGVkRHVyYXRpb24pKS50b0JlTGVzc1RoYW5PckVxdWFsKDAuMik7XG4gIGV4cGVjdChjYW5kaWRhdGU/LmJsb2JTaXplKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIGV4cGVjdChjYW5kaWRhdGU/LnNoYTI1NikudG9NYXRjaCgvXlthLWYwLTldezY0fSQvKTtcbiAgZXhwZWN0KChjYW5kaWRhdGU/LnByb2JlIGFzIHsgZGVjb2RlZEZyYW1lcz86IG51bWJlciB9KS5kZWNvZGVkRnJhbWVzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIGV4cGVjdChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS50b0VxdWFsKHsgZ2V0VXNlck1lZGlhQ2FsbHM6IDEsIHJlY29yZGVyU3RhcnRzOiAxIH0pO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdkZWxheWVkLXNvdXJjZS1jYW5kaWRhdGUucG5nJykgfSk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdkZWxheWVkLXNvdXJjZS1uYXRpdmUtY2FwdHVyZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgaW5wdXQ6ICdDaHJvbWUgYnJvd3NlciBmYWtlIGF1ZGlvIGlucHV0OyBub3QgYSBwaHlzaWNhbCBtaWNyb3Bob25lJyxcbiAgICBzb3VyY2VQbGF5RGVsYXlNczogMV8yMDAsXG4gICAgcHJlcGFyZWRXaW5kb3csXG4gICAgZXhwZWN0ZWREdXJhdGlvbixcbiAgICBiZWZvcmVSZWFsUGxheWJhY2ssXG4gICAgbmF0aXZlVHJhY2U6IHRyYWNlLFxuICAgIHBlcnNpc3RlZENhbmRpZGF0ZTogY2FuZGlkYXRlLFxuICAgIGFwaUNvdW50ZXJzOiBhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpLFxuICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbn0pO1xuXG5mb3IgKGNvbnN0IGxheW91dCBvZiBbJ0EnLCAnQiddIGFzIGNvbnN0KSB7XG4gIHRlc3QoYExheW91dCAke2xheW91dH0gcmVjb3JkcyByZWFsIGJyb3dzZXIgZmFrZSBpbnB1dCwgcmVjb3ZlcnMgdGhlIGNhbmRpZGF0ZSwgYW5kIGNvbXBsZXRlcyB0aGUgYWNjZXB0ZWQgc25hcHNob3RgLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgICB0ZXN0LnNldFRpbWVvdXQoNjBfMDAwKTtcbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gICAgYXdhaXQgcGFnZS5nb3RvKGAvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9JHtsYXlvdXR9JmxvY2FsZT1lbmApO1xuICAgIGlmIChsYXlvdXQgPT09ICdBJykgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnU2ludGVsIMK3IFRoZSBTZWFyY2gnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIGVsc2Uge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1oZWFkZXIgaDEnKSkudG9CZVZpc2libGUoKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5wb3NpdGlvbi1kb3RzJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlcl9fbGluZS1jb3VudCcpKS50b0hhdmVUZXh0KCdMaW5lIDEgLyAzJyk7XG4gICAgfVxuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcigndmlkZW8nKS5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+XG4gICAgICB2aWRlby5yZWFkeVN0YXRlID49IEhUTUxNZWRpYUVsZW1lbnQuSEFWRV9DVVJSRU5UX0RBVEEgJiYgdmlkZW8udmlkZW9XaWR0aCA+IDApLCB7IHRpbWVvdXQ6IDE1XzAwMCB9KS50b0JlKHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy53YXZlZm9ybS1yb3cnKSkudG9IYXZlQXR0cmlidXRlKCdkYXRhLXNvdXJjZS13YXZlZm9ybScsICdkZWNvZGVkJyk7XG4gICAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5mb250cy5yZWFkeSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkpLnRvQmVJblZpZXdwb3J0KCk7XG4gICAgaWYgKGxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdTaW50ZWwgwrcgVGhlIFNlYXJjaCcgfSkpLnRvQmVJblZpZXdwb3J0KCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeUxhYmVsKCdDdXJyZW50IGxpbmUnKSkudG9CZUluVmlld3BvcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1oZWFkZXJfX2xpbmUtY291bnQnKSkudG9CZUluVmlld3BvcnQoKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5TGFiZWwoJ0N1cnJlbnQgbGluZScpKS50b0JlSW5WaWV3cG9ydCgpO1xuICAgIH1cbiAgICBjb25zdCBkaWFsb2d1ZSA9IHBhZ2UubG9jYXRvcignLmRpYWxvZ3VlLWNvcHkgcCcpO1xuICAgIGNvbnN0IGVuZ2xpc2hEaWFsb2d1ZSA9IGF3YWl0IGRpYWxvZ3VlLnRleHRDb250ZW50KCk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBjb25zdCBydXNzaWFuRGlhbG9ndWUgPSBhd2FpdCBkaWFsb2d1ZS50ZXh0Q29udGVudCgpO1xuICAgIGV4cGVjdChydXNzaWFuRGlhbG9ndWUpLm5vdC50b0JlKGVuZ2xpc2hEaWFsb2d1ZSk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9IYXZlVGV4dChlbmdsaXNoRGlhbG9ndWUgPz8gJycpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtaGVhZGVyIC5sb2NhbGUtY29udHJvbCcpKS50b0hhdmVDb3VudCgwKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlciAubHVjaWRlLWxvZy1vdXQnKSkudG9IYXZlQ291bnQoMSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1jb250cm9scyBidXR0b24nKS5maWx0ZXIoeyBoYXNUZXh0OiAnUHJldmlvdXMnIH0pLmxvY2F0b3IoJy5sdWNpZGUtY2hldnJvbi1sZWZ0JykpLnRvSGF2ZUNvdW50KDEpO1xuICAgIGNvbnN0IGluaXRpYWxCdXR0b24gPSBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSk7XG4gICAgYXdhaXQgZXhwZWN0KGluaXRpYWxCdXR0b24pLnRvQmVFbmFibGVkKCk7XG4gICAgZXhwZWN0KGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSkpLnRvRXF1YWwoeyBnZXRVc2VyTWVkaWFDYWxsczogMCwgcmVjb3JkZXJTdGFydHM6IDAgfSk7XG4gICAgY29uc3QgaGVhZGVyRXZpZGVuY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICAgIGNvbnN0IGluc3BlY3QgPSAoc2VsZWN0b3I6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG4gICAgICAgIGNvbnN0IHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGV4dDogZWxlbWVudC50ZXh0Q29udGVudD8udHJpbSgpID8/ICcnLFxuICAgICAgICAgIHg6IHJlY3QueCwgeTogcmVjdC55LCB3aWR0aDogcmVjdC53aWR0aCwgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICAgICAgICBjb2xvcjogc3R5bGUuY29sb3IsIG9wYWNpdHk6IHN0eWxlLm9wYWNpdHksIHZpc2liaWxpdHk6IHN0eWxlLnZpc2liaWxpdHksIGRpc3BsYXk6IHN0eWxlLmRpc3BsYXksXG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXhpdDogaW5zcGVjdCgnLmV4aXQtbGluaycpLCB0aXRsZTogaW5zcGVjdCgnLnJlY29yZC1oZWFkZXIgaDEnKSxcbiAgICAgICAgbG9jYWxlOiBpbnNwZWN0KCcubG9jYWxlLWNvbnRyb2wnKSwgZG90czogaW5zcGVjdCgnLnBvc2l0aW9uLWRvdHMnKSxcbiAgICAgICAgbWFicnlMb2FkZWQ6IGRvY3VtZW50LmZvbnRzLmNoZWNrKCc0MDAgMjZweCBcIk1hYnJ5IFByb1wiJyksXG4gICAgICAgIGRpYWxvZ3VlRm9udDogZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZGlhbG9ndWUtY29weSBwJykhKS5mb250RmFtaWx5LFxuICAgICAgICBzY3JvbGxZOiB3aW5kb3cuc2Nyb2xsWSxcbiAgICAgIH07XG4gICAgfSk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJlYWR5LnBuZ2ApIH0pO1xuXG4gICAgY29uc3Qgdmlld3BvcnQgPSBhd2FpdCBwYWdlLmxvY2F0b3IoJy5tZWRpYS12aWV3cG9ydCcpLmJvdW5kaW5nQm94KCk7XG4gICAgY29uc3Qgd2F2ZSA9IGF3YWl0IHBhZ2UubG9jYXRvcignLndhdmVmb3JtLXN0YWNrJykuYm91bmRpbmdCb3goKTtcbiAgICBjb25zdCBjb250cm9scyA9IGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1jb250cm9scycpLmJvdW5kaW5nQm94KCk7XG4gICAgZXhwZWN0KHZpZXdwb3J0KS5ub3QudG9CZU51bGwoKTtcbiAgICBleHBlY3Qod2F2ZSkubm90LnRvQmVOdWxsKCk7XG4gICAgZXhwZWN0KGNvbnRyb2xzKS5ub3QudG9CZU51bGwoKTtcbiAgICBpZiAodmlld3BvcnQpIHtcbiAgICAgIGNvbnN0IGNlbnRlciA9IHZpZXdwb3J0LnggKyB2aWV3cG9ydC53aWR0aCAvIDI7XG4gICAgICBjb25zdCB2aXNpYmxlQ2VudGVyID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyKTtcbiAgICAgIGV4cGVjdChNYXRoLmFicyhjZW50ZXIgLSB2aXNpYmxlQ2VudGVyKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICAgIGNvbnN0IGV4aXQgPSBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRXhpdCcsIGV4YWN0OiB0cnVlIH0pLmJvdW5kaW5nQm94KCk7XG4gICAgICBleHBlY3QoTWF0aC5hYnMoKGV4aXQ/LnggPz8gLTk5OSkgLSB2aWV3cG9ydC54KSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICB9XG4gICAgaWYgKHZpZXdwb3J0ICYmIGxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBjb25zdCBwYW5lbCA9IGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCcpLmJvdW5kaW5nQm94KCk7XG4gICAgICBleHBlY3QocGFuZWw/LndpZHRoKS50b0JlKDI3Mik7XG4gICAgICBleHBlY3QocGFuZWwhLnggLSAodmlld3BvcnQueCArIHZpZXdwb3J0LndpZHRoKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgyMyk7XG4gICAgICBleHBlY3Qodmlld3BvcnQueCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgzMik7XG4gICAgfVxuICAgIGlmICh3YXZlICYmIGNvbnRyb2xzICYmIGxheW91dCA9PT0gJ0InKSBleHBlY3QoY29udHJvbHMueSAtICh3YXZlLnkgKyB3YXZlLmhlaWdodCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMjMpO1xuICAgIGNvbnN0IGV4cGVjdFBhbmVsQWxpZ25lZCA9IGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChsYXlvdXQgIT09ICdBJykgcmV0dXJuO1xuICAgICAgY29uc3QgYm91bmRzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgICAgICBtZWRpYVk6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZWRpYS12aWV3cG9ydCcpIS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55LFxuICAgICAgICBwYW5lbFk6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yZWNvcmQtcGFuZWwnKSEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueSxcbiAgICAgIH0pKTtcbiAgICAgIGV4cGVjdChNYXRoLmFicyhib3VuZHMucGFuZWxZIC0gYm91bmRzLm1lZGlhWSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgfTtcbiAgICBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcblxuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdPcmlnaW5hbCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpKS50b0JlR3JlYXRlclRoYW4oMC4xKTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUGF1c2UnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXN1bWUnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgwKTtcblxuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgxKTtcbiAgICBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcbiAgICBjb25zdCByZWNvcmRpbmdOb3RpY2UgPSBsYXlvdXQgPT09ICdBJyA/IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykgOiBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtc3RhdHVzLS1iIC5ub3RpY2UnKTtcbiAgICBhd2FpdCBleHBlY3QocmVjb3JkaW5nTm90aWNlKS50b0NvbnRhaW5UZXh0KCdSZWNvcmRpbmcgdGhlIGZ1bGwgcHJlcGFyZWQgd2luZG93LiBJdCB3aWxsIHN0b3AgYXV0b21hdGljYWxseS4nKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogL0NvdW50ZG93bnxTdG9wIHJlY29yZGluZ3xQYXVzZSByZWNvcmRpbmcvaSB9KSkudG9IYXZlQ291bnQoMCk7XG4gICAgYXdhaXQgd2FpdEZvclNhdmVkQ2FuZGlkYXRlKHBhZ2UsIGxheW91dCk7XG4gICAgYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLWNhbmRpZGF0ZS5wbmdgKSB9KTtcblxuICAgIGNvbnN0IGF1ZGlvID0gcGFnZS5sb2NhdG9yKCdhdWRpbycpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdZb3VyIHRha2UnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IGF1ZGlvLmV2YWx1YXRlKChlbGVtZW50OiBIVE1MQXVkaW9FbGVtZW50KSA9PiBlbGVtZW50LmN1cnJlbnRUaW1lKSkudG9CZUdyZWF0ZXJUaGFuKDAuMDUpO1xuICAgIGV4cGVjdChhd2FpdCBhdWRpby5nZXRBdHRyaWJ1dGUoJ3NyYycpKS50b0NvbnRhaW4oJ2Jsb2I6Jyk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdsYXlvdXQtYS0xNDQweDkwMC1jYW5kaWRhdGUtZ3VhcmQucG5nJykgfSk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTdGF5IGhlcmUnLCBleGFjdDogdHJ1ZSB9KS5sYXN0KCkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykpLnRvQmVIaWRkZW4oKTtcbiAgICAgIGNvbnN0IGJlZm9yZVJlbG9hZCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhiZWZvcmVSZWxvYWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiA/PyB7fSkpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICAgIGNvbnN0IGNvdW50ZXJzQmVmb3JlUmVsb2FkID0gYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKTtcbiAgICAgIGF3YWl0IHBhZ2UucmVsb2FkKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1lvdXIgdGFrZScsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICAgICAgZXhwZWN0KGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSkpLnRvRXF1YWwoY291bnRlcnNCZWZvcmVSZWxvYWQpO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnbGF5b3V0LWEtMTQ0MHg5MDAtcmVsb2FkZWQtY2FuZGlkYXRlLnBuZycpIH0pO1xuICAgIH1cblxuICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcgfSk7XG4gICAgaWYgKGxheW91dCA9PT0gJ0EnKSBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdTaW50ZWwgwrcgVGhlIFNlYXJjaCcgfSkpLnRvQmVWaXNpYmxlKCk7XG4gICAgZWxzZSB7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlcl9fbGluZS1jb3VudCcpKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnU2ludGVsIMK3IFRoZSBTZWFyY2gnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlMYWJlbCgnQ3VycmVudCBsaW5lJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgfVxuICAgIGNvbnN0IGhvcml6b250YWxPdmVyZmxvdyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoID4gd2luZG93LmlubmVyV2lkdGgpO1xuICAgIGV4cGVjdChob3Jpem9udGFsT3ZlcmZsb3cpLnRvQmUoZmFsc2UpO1xuICAgIGF3YWl0IHNldFJlY29yZExvY2FsZShwYWdlLCAncnUnKTtcbiAgICBhd2FpdCBleHBlY3QoZGlhbG9ndWUpLnRvQ29udGFpblRleHQoL1tcXHUwNDAwLVxcdTA0RkZdLyk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoID4gd2luZG93LmlubmVyV2lkdGgpKS50b0JlKGZhbHNlKTtcbiAgICBjb25zdCB0YXJnZXRTaXplID0gYXdhaXQgcGFnZS5sb2NhdG9yKCcucmVjb3JkLWFjdGlvbicpLmJvdW5kaW5nQm94KCk7XG4gICAgZXhwZWN0KHRhcmdldFNpemU/LmhlaWdodCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg0OCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTM5MHg2NjctcnVzc2lhbi5wbmdgKSB9KTtcbiAgICBhd2FpdCBzZXRSZWNvcmRMb2NhbGUocGFnZSwgJ2VuJyk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTM5MHg2NjctcmVhZHkucG5nYCkgfSk7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG5cbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGB0dXJuPXNpbnRlbC10dXJuLTJgKSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tdHVybi0yLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IHJlY29yZEN1cnJlbnRXaW5kb3cocGFnZSwgbGF5b3V0KTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGB0dXJuPXNpbnRlbC10dXJuLTNgKSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tdHVybi0zLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IHJlY29yZEN1cnJlbnRXaW5kb3cocGFnZSwgbGF5b3V0KTtcblxuICAgIGNvbnN0IG1lZGlhID0gYXdhaXQgcmVhZEluZGV4ZWREYihwYWdlKTtcbiAgICBleHBlY3QobWVkaWEubWVkaWEuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5wdXJwb3NlID09PSAncmVjb3JkaW5nJykpLnRvSGF2ZUxlbmd0aCgzKTtcbiAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhtZWRpYS5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID8/IHt9KSkudG9IYXZlTGVuZ3RoKDIpO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xNDQweDkwMC1maW5hbC1jYW5kaWRhdGUucG5nYCkgfSk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHBhZ2Uucm91dGUoJyoqL21lZGlhL2V4YW1wbGUtZHViLm1wNCcsIChyb3V0ZSkgPT4gcm91dGUuZnVsZmlsbCh7IHN0YXR1czogNTAzLCBib2R5OiAnZml4dHVyZSB1bmF2YWlsYWJsZSBmb3IgdGhlIGZpcnN0IGF0dGVtcHRzJyB9KSk7XG4gICAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAzOTAsIGhlaWdodDogNjY3IH0pO1xuICAgICAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCkpO1xuICAgICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmV2YWx1YXRlKChidXR0b246IEhUTUxCdXR0b25FbGVtZW50KSA9PiBidXR0b24uY2xpY2soKSk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9yZXN1bHRcXD9sYXlvdXQ9QSZzbmFwc2hvdD0vKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ1lvdXIgcmVzdWx0JyB9KSkudG9CZUluVmlld3BvcnQoKTtcbiAgICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKDApO1xuICAgICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5hY3RpdmVFbGVtZW50Py50YWdOYW1lKSkudG9CZSgnSDEnKTtcbiAgICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRXhpdCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2RpYWxvZycpKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1NhdmUgYW5kIGxlYXZlJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3Byb2plY3RzXFw/cmV0dXJuUHJvamVjdD1zaW50ZWwtcHJlcGFyZWQmcmV0dXJuTGF5b3V0PUImcmV0dXJuRm9jdXM9ZXhpdC8pO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9wcm9qZWN0c1xcL3NpbnRlbC1wcmVwYXJlZFxcL3JlY29yZFxcP2xheW91dD1CJnR1cm49c2ludGVsLXR1cm4tMy8pO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgICB9XG5cbiAgICBsZXQgZmluYWxEYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgZXhwZWN0KGZpbmFsRGF0YWJhc2UucHJvamVjdD8uaW5pdGlhbFJlc3VsdFNuYXBzaG90SWQpLnRvQmVUcnV0aHkoKTtcbiAgICBleHBlY3QoZmluYWxEYXRhYmFzZS5zbmFwc2hvdHMpLnRvSGF2ZUxlbmd0aCgxKTtcbiAgICBjb25zdCBzbmFwc2hvdCA9IGZpbmFsRGF0YWJhc2Uuc25hcHNob3RzWzBdIGFzIHsgdGFrZXM6IHVua25vd25bXTsgYXV0aG9yaXphdGlvbjogc3RyaW5nOyBjb250ZW50U2hhMjU2OiBzdHJpbmcgfTtcbiAgICBleHBlY3Qoc25hcHNob3QuYXV0aG9yaXphdGlvbikudG9CZSgnaW5pdGlhbC1jb21wbGV0aW9uJyk7XG4gICAgZXhwZWN0KHNuYXBzaG90LnRha2VzKS50b0hhdmVMZW5ndGgoMyk7XG4gICAgZXhwZWN0KHNuYXBzaG90LmNvbnRlbnRTaGEyNTYpLnRvTWF0Y2goL15bYS1mMC05XXs2NH0kLyk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQicpIHtcbiAgICAgIGNvbnN0IHNuYXBzaG90SWQgPSBTdHJpbmcoZmluYWxEYXRhYmFzZS5wcm9qZWN0Py5sYXRlc3RSZXN1bHRTbmFwc2hvdElkID8/ICcnKTtcbiAgICAgIGV4cGVjdChzbmFwc2hvdElkKS50b0JlVHJ1dGh5KCk7XG4gICAgICBhd2FpdCBwYWdlLmdvdG8oYC9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVzdWx0P2xheW91dD1CJnNuYXBzaG90PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNuYXBzaG90SWQpfWApO1xuICAgIH1cbiAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdZb3VyIHJlc3VsdCcgfSkpLnRvQmVWaXNpYmxlKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzIGJ1dHRvbicpLmZpbHRlcih7IGhhc1RleHQ6ICdNeSBkdWInIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZXN1bHQtaGVhZGVyIGgxJykpLnRvQmVGb2N1c2VkKCk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKDApO1xuICAgIGV4cGVjdChhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZXN1bHQtaGVhZGVyIC5sdWNpZGUtbG9nLW91dCcpLmNvdW50KCkpLnRvQmUoMSk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UubG9jYXRvcignLnJlc3VsdC13b3Jrc3BhY2VfX2FjdGlvbnMgYnV0dG9uJykuZmlsdGVyKHsgaGFzVGV4dDogJ1JldHVybiB0byByZWNvcmRpbmcnIH0pLmxvY2F0b3IoJy5sdWNpZGUtdW5kby0yJykuY291bnQoKSkudG9CZSgxKTtcblxuICAgIGlmIChsYXlvdXQgPT09ICdBJykge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXRyeSBhc3NlbWJseScsIGV4YWN0OiB0cnVlIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdUaGUgcmVzdWx0IHNhbXBsZSBjb3VsZCBub3QgYmUgbG9hZGVkLiBZb3VyIGFjY2VwdGVkIHRha2VzIGFuZCBwcmV2aW91cyByZXN1bHQgcmVtYWluIHVuY2hhbmdlZC4nKSkudG9CZVZpc2libGUoKTtcbiAgICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2xheW91dC1hLXJlc3VsdC1maXh0dXJlLXVuYXZhaWxhYmxlLnBuZycpIH0pO1xuICAgICAgYXdhaXQgcGFnZS51bnJvdXRlKCcqKi9tZWRpYS9leGFtcGxlLWR1Yi5tcDQnKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXRyeSBhc3NlbWJseScsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdJbGx1c3RyYXRpdmUgc2FtcGxlIHJlYWR5JykpLnRvQmVWaXNpYmxlKHsgdGltZW91dDogMTVfMDAwIH0pO1xuICAgIGNvbnN0IHJlc3VsdFZpZGVvID0gcGFnZS5nZXRCeVRlc3RJZCgncmVzdWx0LXZpZGVvJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ2R1YicpO1xuICAgIGF3YWl0IGV4cGVjdChyZXN1bHRWaWRlbykudG9IYXZlQXR0cmlidXRlKCdzcmMnLCAvXmJsb2I6Lyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby52aWRlb1dpZHRoID4gMCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGNvbnN0IHByZXNlbnRlZEdlbmVyYXRpb25JZCA9IGF3YWl0IHJlc3VsdFZpZGVvLmdldEF0dHJpYnV0ZSgnZGF0YS1nZW5lcmF0aW9uLWlkJyk7XG4gICAgZXhwZWN0KHByZXNlbnRlZEdlbmVyYXRpb25JZCkudG9NYXRjaCgvXmdlbmVyYXRpb246Lyk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJlc3VsdC1yZWFkeS5wbmdgKSB9KTtcbiAgICBjb25zdCBub3JtYWxSZXN1bHQgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICAgIGNvbnN0IGJvdW5kcyA9IChzZWxlY3Rvcjogc3RyaW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCFlbGVtZW50KSByZXR1cm4gbnVsbDtcbiAgICAgICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJldHVybiB7IHg6IHJlY3QueCwgeTogcmVjdC55LCB3aWR0aDogcmVjdC53aWR0aCwgaGVpZ2h0OiByZWN0LmhlaWdodCwgYm90dG9tOiByZWN0LmJvdHRvbSB9O1xuICAgICAgfTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIGV4aXQ6IGJvdW5kcygnLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLFxuICAgICAgICBzY3JlZW46IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NjcmVlbicpLFxuICAgICAgICBzZWVrOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zZWVrJyksXG4gICAgICAgIGNvbnRyb2xzOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX190cmFuc3BvcnQtcm93JyksXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tMTQ0MHg5MDAtcmVzdWx0LW1ldHJpY3MuanNvbmApLCBKU09OLnN0cmluZ2lmeShub3JtYWxSZXN1bHQsIG51bGwsIDIpLCAndXRmOCcpO1xuICAgIGV4cGVjdChNYXRoLmFicyhub3JtYWxSZXN1bHQudGl0bGUhLnkgLSAobGF5b3V0ID09PSAnQScgPyAyMCA6IDI3KSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKG5vcm1hbFJlc3VsdC5leGl0IS55IC0gKGxheW91dCA9PT0gJ0EnID8gMjAgOiAyOCkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChNYXRoLmFicyhub3JtYWxSZXN1bHQuc2NyZWVuIS55IC0gKGxheW91dCA9PT0gJ0EnID8gMTA4IDogMTA0KSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKG5vcm1hbFJlc3VsdC5zY3JlZW4hLndpZHRoIC0gOTIwKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgyKTtcbiAgICBleHBlY3Qobm9ybWFsUmVzdWx0LnNlZWshLmJvdHRvbSkudG9CZUxlc3NUaGFuT3JFcXVhbChub3JtYWxSZXN1bHQuY29udHJvbHMhLnkgKyAxKTtcbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHNldFJlY29yZExvY2FsZShwYWdlLCAncnUnKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ9CS0LDRiCDRgNC10LfRg9C70YzRgtCw0YInIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnbGF5b3V0LWEtMTQ0MHg5MDAtcmVzdWx0LXJ1LnBuZycpIH0pO1xuICAgICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnWW91ciByZXN1bHQnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIH1cbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZShsYXlvdXQgPT09ICdBJyA/IHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcgfSA6IHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA4NDQgfSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGggPD0gd2luZG93LmlubmVyV2lkdGgpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcignLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLmV2YWx1YXRlKChlbGVtZW50KSA9PiBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnRyYW5zZm9ybSkpLnRvQmUoJ25vbmUnKTtcbiAgICBjb25zdCBwaG9uZVJlc3VsdCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgY29uc3QgYm91bmRzID0gKHNlbGVjdG9yOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NyZWVuOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zY3JlZW4nKSxcbiAgICAgICAgZXhpdDogYm91bmRzKCcucmVzdWx0LWhlYWRlciAuZXhpdC1saW5rJyksXG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIHNlZWs6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKSxcbiAgICAgICAgY29udHJvbHM6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3RyYW5zcG9ydC1yb3cnKSxcbiAgICAgICAgdm9sdW1lOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX192b2x1bWUgaW5wdXQnKSxcbiAgICAgICAgc291cmNlOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zb3VyY2UtdGFicyBidXR0b24nKSxcbiAgICAgICAgYWN0aW9uczogQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucmVzdWx0LXdvcmtzcGFjZV9fYWN0aW9ucyAuYnV0dG9uJyksIChlbGVtZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9KTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tcGhvbmUtcmVzdWx0LXJlYWR5LnBuZ2ApLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LXBob25lLXJlc3VsdC1tZXRyaWNzLmpzb25gKSwgSlNPTi5zdHJpbmdpZnkocGhvbmVSZXN1bHQsIG51bGwsIDIpLCAndXRmOCcpO1xuICAgIGV4cGVjdChNYXRoLmFicyhwaG9uZVJlc3VsdC5zY3JlZW4hLnggLSAxNikpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKHBob25lUmVzdWx0LnNjcmVlbiEud2lkdGggLSAzNTgpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5zY3JlZW4hLnkpLnRvQmUobGF5b3V0ID09PSAnQScgPyAxNjQgOiAxNjgpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5leGl0IS55KS50b0JlKDQwKTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQudGl0bGUhLnkpLnRvQmUobGF5b3V0ID09PSAnQScgPyA5NyA6IDk2KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuc2VlayEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuY29udHJvbHMhLmhlaWdodCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg0OCk7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LnZvbHVtZSEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuc291cmNlIS5oZWlnaHQpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoNDgpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5hY3Rpb25zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LmFjdGlvbnMuZXZlcnkoKGFjdGlvbikgPT4gYWN0aW9uLmhlaWdodCA+PSA0OCkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LmFjdGlvbnNbMV0hLnkpLnRvQmVHcmVhdGVyVGhhbihwaG9uZVJlc3VsdC5hY3Rpb25zWzBdIS55KTtcbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDYwMCB9KTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgPD0gd2luZG93LmlubmVySGVpZ2h0KSkudG9CZSh0cnVlKTtcbiAgICBjb25zdCBzaG9ydFJlc3VsdCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgY29uc3QgYm91bmRzID0gKHNlbGVjdG9yOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZG9jdW1lbnRIZWlnaHQ6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQsXG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIGV4aXQ6IGJvdW5kcygnLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLFxuICAgICAgICBwbGF5ZXI6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXInKSxcbiAgICAgICAgc2NyZWVuOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zY3JlZW4nKSxcbiAgICAgICAgcmFpbDogYm91bmRzKCcucmVzdWx0LXBsYXllcl9fdHJhbnNwb3J0JyksXG4gICAgICAgIHNlZWs6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKSxcbiAgICAgICAgY29udHJvbHM6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3RyYW5zcG9ydC1yb3cnKSxcbiAgICAgICAgZGV0YWlsczogYm91bmRzKCcucmVzdWx0LXdvcmtzcGFjZV9fZGV0YWlscycpLFxuICAgICAgICBhY3Rpb25zOiBib3VuZHMoJy5yZXN1bHQtd29ya3NwYWNlX19hY3Rpb25zJyksXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xMjgweDYwMC1yZXN1bHQtcmVhZHkucG5nYCkgfSk7XG4gICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xMjgweDYwMC1yZXN1bHQtbWV0cmljcy5qc29uYCksIEpTT04uc3RyaW5naWZ5KHNob3J0UmVzdWx0LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuZG9jdW1lbnRIZWlnaHQpLnRvQmVMZXNzVGhhbk9yRXF1YWwoNjAwKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQudGl0bGU/LnkpLnRvQmUoMTYpO1xuICAgIGV4cGVjdChzaG9ydFJlc3VsdC5leGl0Py55KS50b0JlKDE2KTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQudGl0bGUhLmJvdHRvbSkudG9CZUxlc3NUaGFuT3JFcXVhbCg2MDApO1xuICAgIGNvbnN0IHNob3J0VGFyZ2V0ID0gbGF5b3V0ID09PSAnQScgPyB7IHk6IDg4LCB3aWR0aDogNTQ4IH0gOiB7IHk6IDgwLCB3aWR0aDogNTYyIH07XG4gICAgZXhwZWN0KE1hdGguYWJzKHNob3J0UmVzdWx0LnNjcmVlbiEueSAtIHNob3J0VGFyZ2V0LnkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChNYXRoLmFicyhzaG9ydFJlc3VsdC5zY3JlZW4hLndpZHRoIC0gc2hvcnRUYXJnZXQud2lkdGgpKS50b0JlTGVzc1RoYW5PckVxdWFsKDQpO1xuICAgIGV4cGVjdChzaG9ydFJlc3VsdC5zZWVrIS5ib3R0b20pLnRvQmVMZXNzVGhhbk9yRXF1YWwoc2hvcnRSZXN1bHQuY29udHJvbHMhLnkgKyAxKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuYWN0aW9ucyEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDg4KTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuYWN0aW9ucyEuYm90dG9tKS50b0JlTGVzc1RoYW5PckVxdWFsKDYwMCk7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG5cbiAgICBjb25zdCBvcmlnaW5hbFNvdXJjZSA9IHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzIGJ1dHRvbicpLmZpbHRlcih7IGhhc1RleHQ6ICdPcmlnaW5hbCcgfSk7XG4gICAgY29uc3QgZHViU291cmNlID0gcGFnZS5sb2NhdG9yKCcucmVzdWx0LXBsYXllcl9fc291cmNlLXRhYnMgYnV0dG9uJykuZmlsdGVyKHsgaGFzVGV4dDogJ015IGR1YicgfSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzJykpLnRvSGF2ZUF0dHJpYnV0ZSgncm9sZScsICdncm91cCcpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAnZmFsc2UnKTtcbiAgICBhd2FpdCBvcmlnaW5hbFNvdXJjZS5mb2N1cygpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ1NwYWNlJyk7XG4gICAgYXdhaXQgZXhwZWN0KG9yaWdpbmFsU291cmNlKS50b0hhdmVBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICd0cnVlJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ29yaWdpbmFsJyk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQXJyb3dSaWdodCcpO1xuICAgIGF3YWl0IGV4cGVjdChkdWJTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ3RydWUnKTtcbiAgICBhd2FpdCBleHBlY3QoZHViU291cmNlKS50b0JlRm9jdXNlZCgpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93TGVmdCcpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAndHJ1ZScpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9CZUZvY3VzZWQoKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbmQnKTtcbiAgICBhd2FpdCBleHBlY3QoZHViU291cmNlKS50b0hhdmVBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICd0cnVlJyk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnSG9tZScpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAndHJ1ZScpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQbGF5JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLmN1cnJlbnRUaW1lKSkudG9CZUdyZWF0ZXJUaGFuKDAuMik7XG4gICAgY29uc3Qgc3dpdGNoVGltZSA9IGF3YWl0IHJlc3VsdFZpZGVvLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpO1xuICAgIGF3YWl0IGR1YlNvdXJjZS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdChkdWJTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ3RydWUnKTtcbiAgICBhd2FpdCBleHBlY3Qob3JpZ2luYWxTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ2ZhbHNlJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtZ2VuZXJhdGlvbi1pZCcsIHByZXNlbnRlZEdlbmVyYXRpb25JZCA/PyAnJyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiAhdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiBNYXRoLmFicyhhd2FpdCByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLmN1cnJlbnRUaW1lKSAtIHN3aXRjaFRpbWUpKVxuICAgICAgLnRvQmVMZXNzVGhhbigxLjUpO1xuXG4gICAgY29uc3QgcmVzdWx0U2VlayA9IHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKTtcbiAgICBhd2FpdCByZXN1bHRTZWVrLmZvY3VzKCk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5kb3duKCdBcnJvd1JpZ2h0Jyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQudXAoJ0Fycm93UmlnaHQnKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+ICF2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGNvbnN0IGFmdGVyS2V5Ym9hcmRSZWxlYXNlID0gYXdhaXQgcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSkpLnRvQmVHcmVhdGVyVGhhbihhZnRlcktleWJvYXJkUmVsZWFzZSk7XG5cbiAgICBhd2FpdCByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlKCkpO1xuICAgIGF3YWl0IHJlc3VsdFNlZWsuZGlzcGF0Y2hFdmVudCgncG9pbnRlcmRvd24nKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgcmVzdWx0U2Vlay5kaXNwYXRjaEV2ZW50KCdwb2ludGVyY2FuY2VsJyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQbGF5JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+ICF2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHJlc3VsdFNlZWsuZGlzcGF0Y2hFdmVudCgncG9pbnRlcmRvd24nKTtcbiAgICBhd2FpdCByZXN1bHRTZWVrLmV2YWx1YXRlKChpbnB1dDogSFRNTElucHV0RWxlbWVudCkgPT4gaW5wdXQuYmx1cigpKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG5cbiAgICBjb25zdCBjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkID0gYXdhaXQgcmVzdWx0VmlkZW8uZ2V0QXR0cmlidXRlKCdkYXRhLWdlbmVyYXRpb24taWQnKTtcbiAgICBhd2FpdCBvcmlnaW5hbFNvdXJjZS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdChyZXN1bHRWaWRlbykudG9IYXZlQXR0cmlidXRlKCdkYXRhLXNvdXJjZScsICdvcmlnaW5hbCcpO1xuICAgIGNvbnN0IFtkb3dubG9hZF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBwYWdlLndhaXRGb3JFdmVudCgnZG93bmxvYWQnKSxcbiAgICAgIHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdEb3dubG9hZCBNeSBkdWInLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpLFxuICAgIF0pO1xuICAgIGNvbnN0IGRvd25sb2FkUGF0aCA9IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS1kb3dubG9hZC1leGFtcGxlLWR1Yi5tcDRgKTtcbiAgICBhd2FpdCBkb3dubG9hZC5zYXZlQXMoZG93bmxvYWRQYXRoKTtcbiAgICBleHBlY3QoZG93bmxvYWQuc3VnZ2VzdGVkRmlsZW5hbWUoKSkudG9CZSgnZXhhbXBsZS1kdWIubXA0Jyk7XG4gICAgY29uc3QgZG93bmxvYWRlZEJ5dGVzID0gYXdhaXQgcmVhZEZpbGUoZG93bmxvYWRQYXRoKTtcbiAgICBjb25zdCBleHBlY3RlZEZpeHR1cmVCeXRlcyA9IGF3YWl0IHJlYWRGaWxlKHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAncHVibGljJywgJ21lZGlhJywgJ2V4YW1wbGUtZHViLm1wNCcpKTtcbiAgICBjb25zdCBkb3dubG9hZGVkU2hhMjU2ID0gY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKGRvd25sb2FkZWRCeXRlcykuZGlnZXN0KCdoZXgnKTtcbiAgICBleHBlY3QoZG93bmxvYWRlZEJ5dGVzLmVxdWFscyhleHBlY3RlZEZpeHR1cmVCeXRlcykpLnRvQmUodHJ1ZSk7XG5cbiAgICBjb25zdCByZXN1bHREYXRhYmFzZSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCBuZXcgUHJvbWlzZTxJREJEYXRhYmFzZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oJ2R1YmJlZC1jb3JlLWxvY2FsLXYxJyk7XG4gICAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4gcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCk7XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVhZCA9IDxUPihuYW1lOiBzdHJpbmcpID0+IG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IGRhdGFiYXNlLnRyYW5zYWN0aW9uKG5hbWUsICdyZWFkb25seScpLm9iamVjdFN0b3JlKG5hbWUpLmdldEFsbCgpO1xuICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQgYXMgVCk7XG4gICAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3Qgam9icyA9IGF3YWl0IHJlYWQ8QXJyYXk8eyBpZDogc3RyaW5nOyBzbmFwc2hvdElkOiBzdHJpbmc7IHN0YXR1czogc3RyaW5nOyBwcm9kdWN0UmVuZGVyZWQ6IGJvb2xlYW47IGFzc2VtYmxlZEZyb21BY2NlcHRlZFRha2VzOiBib29sZWFuIH0+PigncmVzdWx0Sm9icycpO1xuICAgICAgY29uc3QgcmVzdWx0TWVkaWEgPSBhd2FpdCByZWFkPEFycmF5PHsgaWQ6IHN0cmluZzsgZmlsZW5hbWU6IHN0cmluZzsgYnl0ZVNpemU6IG51bWJlcjsgc2hhMjU2OiBzdHJpbmc7IGJsb2I6IEJsb2IgfT4+KCdyZXN1bHRNZWRpYScpO1xuICAgICAgZGF0YWJhc2UuY2xvc2UoKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGpvYnM6IGpvYnMubWFwKCh7IGlkLCBzbmFwc2hvdElkLCBzdGF0dXMsIHByb2R1Y3RSZW5kZXJlZCwgYXNzZW1ibGVkRnJvbUFjY2VwdGVkVGFrZXMgfSkgPT4gKHsgaWQsIHNuYXBzaG90SWQsIHN0YXR1cywgcHJvZHVjdFJlbmRlcmVkLCBhc3NlbWJsZWRGcm9tQWNjZXB0ZWRUYWtlcyB9KSksXG4gICAgICAgIG1lZGlhOiByZXN1bHRNZWRpYS5tYXAoKHsgaWQsIGZpbGVuYW1lLCBieXRlU2l6ZSwgc2hhMjU2LCBibG9iIH0pID0+ICh7IGlkLCBmaWxlbmFtZSwgYnl0ZVNpemUsIHNoYTI1NiwgYmxvYlNpemU6IGJsb2Iuc2l6ZSB9KSksXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGV4cGVjdChyZXN1bHREYXRhYmFzZS5qb2JzKS50b0NvbnRhaW5FcXVhbChleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XG4gICAgICBpZDogY3VycmVudEdlbmVyYXRpb25CZWZvcmVEb3dubG9hZCxcbiAgICAgIHN0YXR1czogJ3JlYWR5JyxcbiAgICAgIHByb2R1Y3RSZW5kZXJlZDogZmFsc2UsXG4gICAgICBhc3NlbWJsZWRGcm9tQWNjZXB0ZWRUYWtlczogZmFsc2UsXG4gICAgfSkpO1xuICAgIGV4cGVjdChyZXN1bHREYXRhYmFzZS5tZWRpYSkudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgaWQ6IGN1cnJlbnRHZW5lcmF0aW9uQmVmb3JlRG93bmxvYWQsXG4gICAgICBmaWxlbmFtZTogJ2V4YW1wbGUtZHViLm1wNCcsXG4gICAgICBieXRlU2l6ZTogZXhwZWN0ZWRGaXh0dXJlQnl0ZXMuYnl0ZUxlbmd0aCxcbiAgICAgIGJsb2JTaXplOiBleHBlY3RlZEZpeHR1cmVCeXRlcy5ieXRlTGVuZ3RoLFxuICAgICAgc2hhMjU2OiBkb3dubG9hZGVkU2hhMjU2LFxuICAgIH0pKTtcblxuICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA4NDQgfSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGggPD0gd2luZG93LmlubmVyV2lkdGgpKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRG93bmxvYWQgTXkgZHViJywgZXhhY3Q6IHRydWUgfSkuYm91bmRpbmdCb3goKS50aGVuKChib3gpID0+IGJveD8uaGVpZ2h0ID8/IDApKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcbiAgICBjb25zdCBtb2JpbGVUYXJnZXRzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBBcnJheS5mcm9tKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5yZXN1bHQtcGxheWVyX19zZWVrLCAucmVzdWx0LXBsYXllcl9fdm9sdW1lIGlucHV0JyksIChlbGVtZW50KSA9PiB7XG4gICAgICBjb25zdCBib3VuZHMgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgcmV0dXJuIHsgbGFiZWw6IGVsZW1lbnQuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJyksIGhlaWdodDogYm91bmRzLmhlaWdodCwgd2lkdGg6IGJvdW5kcy53aWR0aCB9O1xuICAgIH0pKTtcbiAgICBleHBlY3QobW9iaWxlVGFyZ2V0cykudG9IYXZlTGVuZ3RoKDIpO1xuICAgIGV4cGVjdChtb2JpbGVUYXJnZXRzLmV2ZXJ5KCh0YXJnZXQpID0+IHRhcmdldC5oZWlnaHQgPj0gNDgpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZXN1bHQtcGxheWVyX19zZWVrJykpLnRvQmVFbmFibGVkKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3ZvbHVtZSBpbnB1dCcpKS50b0JlRW5hYmxlZCgpO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0zOTB4ODQ0LXJlc3VsdC1yZWFkeS5wbmdgKSwgZnVsbFBhZ2U6IHRydWUgfSk7XG5cbiAgICBmaW5hbERhdGFiYXNlID0gYXdhaXQgcmVhZEluZGV4ZWREYihwYWdlKTtcbiAgICBjb25zdCBuYXRpdmVFdmlkZW5jZSA9IGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSk7XG4gICAgZXhwZWN0KG5hdGl2ZUV2aWRlbmNlLmdldFVzZXJNZWRpYUNhbGxzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgZXhwZWN0KG5hdGl2ZUV2aWRlbmNlLnJlY29yZGVyU3RhcnRzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS1icm93c2VyLWV2aWRlbmNlLmpzb25gKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgbGF5b3V0LFxuICAgICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgICBpbnB1dDogJ0Nocm9tZSBicm93c2VyIGZha2UgYXVkaW8gaW5wdXQ7IG5vdCBhIHBoeXNpY2FsIG1pY3JvcGhvbmUnLFxuICAgICAgbmF0aXZlQXBpRXZpZGVuY2U6IG5hdGl2ZUV2aWRlbmNlLFxuICAgICAgaW5pdGlhbEhlYWRlcjogaGVhZGVyRXZpZGVuY2UsXG4gICAgICBwcm9qZWN0OiBmaW5hbERhdGFiYXNlLnByb2plY3QsXG4gICAgICBjYXB0dXJlczogZmluYWxEYXRhYmFzZS5tZWRpYS5maWx0ZXIoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLnB1cnBvc2UgPT09ICdyZWNvcmRpbmcnKSxcbiAgICAgIG9wZXJhdGlvbnM6IGZpbmFsRGF0YWJhc2Uub3BlcmF0aW9ucyxcbiAgICAgIHNuYXBzaG90czogZmluYWxEYXRhYmFzZS5zbmFwc2hvdHMsXG4gICAgICByZXN1bHQ6IHtcbiAgICAgICAgZ2VuZXJhdGlvbklkOiBjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkLFxuICAgICAgICBjdXJyZW50Q29tcGFyaXNvbkF0RG93bmxvYWQ6ICdvcmlnaW5hbCcsXG4gICAgICAgIGRvd25sb2FkRmlsZW5hbWU6IGRvd25sb2FkLnN1Z2dlc3RlZEZpbGVuYW1lKCksXG4gICAgICAgIGRvd25sb2FkU2hhMjU2OiBkb3dubG9hZGVkU2hhMjU2LFxuICAgICAgICBleGFjdEZpeHR1cmVCeXRlc01hdGNoOiBkb3dubG9hZGVkQnl0ZXMuZXF1YWxzKGV4cGVjdGVkRml4dHVyZUJ5dGVzKSxcbiAgICAgICAgZml4dHVyZVByb3ZlbmFuY2U6ICdGaXhlZCBpbGx1c3RyYXRpdmUgc2FtcGxlOyBwcm9kdWN0UmVuZGVyZWQ9ZmFsc2U7IGFzc2VtYmxlZEZyb21BY2NlcHRlZFRha2VzPWZhbHNlJyxcbiAgICAgICAgam9iczogcmVzdWx0RGF0YWJhc2Uuam9icyxcbiAgICAgICAgbWVkaWE6IHJlc3VsdERhdGFiYXNlLm1lZGlhLFxuICAgICAgfSxcbiAgICAgIGFzc2VydGlvbnM6IFsnTm8gZ2V0VXNlck1lZGlhIG9yIE1lZGlhUmVjb3JkZXIgYmVmb3JlIGV4cGxpY2l0IFJlY29yZCcsICd2aWRlbyBtb3ZlZCBkdXJpbmcgZWFjaCBuYXRpdmUgcmVjb3JkaW5nJywgJ2NhcHR1cmVkIEJsb2IgcGVyc2lzdGVkIGFuZCBoYXNoZWQnLCAnYWNjZXB0ZWQgc25hcHNob3QgaW5jbHVkZXMgZXhhY3QgdGhyZWUgcmVjb3JkZWQgY2FuZGlkYXRlcycsICduYXRpdmUgY29udHJvbHMgcmVtYWluZWQgbG9ja2VkIGR1cmluZyBjYXB0dXJlJywgJ1Jlc3VsdCBnZW5lcmF0aW9uIGNvbnN1bWVkIHRoZSBhdXRob3JpemVkIGltbXV0YWJsZSBzbmFwc2hvdCcsICdwbGF5ZXIgc2VydmVkIGV4YWN0IGZpeHR1cmUgYnl0ZXMgYW5kIHJlbWFpbmVkIHBhdXNlZCBvbiBlbnRyeScsICdzb3VyY2Ugc3dpdGNoIHByZXNlcnZlZCBwbGF5aGVhZCBhbmQgcGxheSBpbnRlbnQnLCAnZG93bmxvYWQgZnJvbSBPcmlnaW5hbCBwcmV2aWV3IHBpbm5lZCB0aGUgcHJlc2VudGVkIE15IGR1YiBnZW5lcmF0aW9uJywgJ2Rvd25sb2FkZWQgYnl0ZXMgbWF0Y2ggdGhlIHBlcnNpc3RlZCBmaXh0dXJlIGhhc2gnLCAnbW9iaWxlIFJlc3VsdCBoYXMgbm8gaG9yaXpvbnRhbCBvdmVyZmxvdyBhbmQgYSA0OHB4IGRvd25sb2FkIHRhcmdldCddLFxuICAgIH0sIG51bGwsIDIpLCAndXRmOCcpO1xuXG4gICAgY29uc3QgcmVzdWx0Um91dGUgPSBwYWdlLnVybCgpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXR1cm4gdG8gcmVjb3JkaW5nJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKG5ldyBSZWdFeHAoYC9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkXFxcXD9sYXlvdXQ9JHtsYXlvdXR9JnR1cm49c2ludGVsLXR1cm4tMWApKTtcbiAgICBjb25zdCByZXR1cm5lZFJlY29yZFZpZGVvID0gcGFnZS5sb2NhdG9yKCcubWVkaWEtdmlld3BvcnQgdmlkZW8nKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXR1cm5lZFJlY29yZFZpZGVvLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tcmVzdWx0LXJldHVybi1maXJzdC10dXJuLnBuZ2ApIH0pO1xuICAgIGF3YWl0IHBhZ2UuZ290byhyZXN1bHRSb3V0ZSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnWW91ciByZXN1bHQnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZ2V0QnlUZXN0SWQoJ3Jlc3VsdC12aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVRlc3RJZCgncmVzdWx0LXZpZGVvJykpLnRvSGF2ZUF0dHJpYnV0ZSgnZGF0YS1zb3VyY2UnLCAnZHViJyk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGNvbnN0IGxlYXZpbmdWaWRlbyA9IGF3YWl0IHBhZ2UuZ2V0QnlUZXN0SWQoJ3Jlc3VsdC12aWRlbycpLmV2YWx1YXRlSGFuZGxlKCh2aWRlbykgPT4gdmlkZW8pO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1BsYXknLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5nZXRCeVRlc3RJZCgncmVzdWx0LXZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiAhdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3Byb2plY3RzXFw/LipyZXR1cm5Gb2N1cz1leGl0Lyk7XG4gICAgICBleHBlY3QoYXdhaXQgbGVhdmluZ1ZpZGVvLmV2YWx1YXRlKCh2aWRlbykgPT4gKHZpZGVvIGFzIEhUTUxWaWRlb0VsZW1lbnQpLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5VGVzdElkKCdyZXR1cm4tdG8tc2F2ZWQtcmVjb3JkJykuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPWV4aXQvKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJ1tkYXRhLWxvZ2ljYWwtZm9jdXM9XCJleGl0XCJdJykpLnRvQmVGb2N1c2VkKCk7XG4gICAgfVxuXG4gICAgaWYgKGxheW91dCA9PT0gJ0InKSB7XG4gICAgICBhd2FpdCBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHtcbiAgICAgICAgdHlwZSBSZXN1bHRTdG9yZSA9IHtcbiAgICAgICAgICByZWFkR2VuZXJhdGlvbk1lZGlhKHNjb3BlOiB1bmtub3duLCBpZDogdW5rbm93bik6IFByb21pc2U8dW5rbm93bj47XG4gICAgICAgICAgbG9hZFByZXBhcmVkUHJvamVjdChzY29wZTogdW5rbm93bik6IFByb21pc2U8eyByZXZpc2lvbjogbnVtYmVyIH0gfCBudWxsPjtcbiAgICAgICAgICB0b21ic3RvbmVQcm9qZWN0KHNjb3BlOiB1bmtub3duLCByZXZpc2lvbjogbnVtYmVyLCBvcGVyYXRpb246IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPjtcbiAgICAgICAgfTtcbiAgICAgICAgdHlwZSBGaWJlciA9IHsgY2hpbGQ/OiB1bmtub3duOyBzaWJsaW5nPzogdW5rbm93bjsgbWVtb2l6ZWRQcm9wcz86IHVua25vd24gfTtcbiAgICAgICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykgYXMgKEhUTUxFbGVtZW50ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHwgbnVsbDtcbiAgICAgICAgaWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBSZWFjdCByb290IGlzIHVuYXZhaWxhYmxlLicpO1xuICAgICAgICBjb25zdCByb290S2V5ID0gT2JqZWN0LmtleXMocm9vdCkuZmluZCgoa2V5KSA9PiBrZXkuc3RhcnRzV2l0aCgnX19yZWFjdENvbnRhaW5lciQnKSk7XG4gICAgICAgIGlmICghcm9vdEtleSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgUmVhY3Qgcm9vdCBmaWJlciBpcyB1bmF2YWlsYWJsZS4nKTtcbiAgICAgICAgY29uc3QgcGVuZGluZzogdW5rbm93bltdID0gW3Jvb3Rbcm9vdEtleV1dO1xuICAgICAgICBsZXQgc3RvcmU6IFJlc3VsdFN0b3JlIHwgbnVsbCA9IG51bGw7XG4gICAgICAgIHdoaWxlIChwZW5kaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICBjb25zdCBmaWJlciA9IHBlbmRpbmcucG9wKCkgYXMgRmliZXIgfCBudWxsO1xuICAgICAgICAgIGlmICghZmliZXIpIGNvbnRpbnVlO1xuICAgICAgICAgIGNvbnN0IHByb3BzID0gZmliZXIubWVtb2l6ZWRQcm9wcyBhcyB7IHNlcnZpY2VzPzogeyByZXN1bHRzPzogUmVzdWx0U3RvcmUgfSB9IHwgbnVsbDtcbiAgICAgICAgICBpZiAocHJvcHM/LnNlcnZpY2VzPy5yZXN1bHRzKSBzdG9yZSA9IHByb3BzLnNlcnZpY2VzLnJlc3VsdHM7XG4gICAgICAgICAgaWYgKGZpYmVyLmNoaWxkKSBwZW5kaW5nLnB1c2goZmliZXIuY2hpbGQpO1xuICAgICAgICAgIGlmIChmaWJlci5zaWJsaW5nKSBwZW5kaW5nLnB1c2goZmliZXIuc2libGluZyk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzdG9yZSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgYWN0aXZlIHR5cGVkIFJlc3VsdFBvcnQgd2FzIG5vdCBmb3VuZCBpbiB0aGUgc2VydmljZXMgcHJvdmlkZXIuJyk7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsUmVhZCA9IHN0b3JlLnJlYWRHZW5lcmF0aW9uTWVkaWEuYmluZChzdG9yZSk7XG4gICAgICAgIGNvbnN0IHRhcmdldCA9IHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fZGVsZXRlZEJlZm9yZUdlbmVyYXRpb25EZWxpdmVyeT86IGJvb2xlYW4gfTtcbiAgICAgICAgc3RvcmUucmVhZEdlbmVyYXRpb25NZWRpYSA9IGFzeW5jIChzY29wZSwgaWQpID0+IHtcbiAgICAgICAgICBjb25zdCBwYXlsb2FkID0gYXdhaXQgb3JpZ2luYWxSZWFkKHNjb3BlLCBpZCk7XG4gICAgICAgICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IHN0b3JlLmxvYWRQcmVwYXJlZFByb2plY3Qoc2NvcGUpO1xuICAgICAgICAgIGlmICghcHJvamVjdCkgdGhyb3cgbmV3IEVycm9yKCdUaGUgcHJlcGFyZWQgcHJvamVjdCBkaXNhcHBlYXJlZCBiZWZvcmUgdGhlIHRvbWJzdG9uZSBzZWFtLicpO1xuICAgICAgICAgIGF3YWl0IHN0b3JlLnRvbWJzdG9uZVByb2plY3Qoc2NvcGUsIHByb2plY3QucmV2aXNpb24sIGByZXZpZXctZGVsZXRlOiR7Y3J5cHRvLnJhbmRvbVVVSUQoKX1gKTtcbiAgICAgICAgICB0YXJnZXQuX19kZWxldGVkQmVmb3JlR2VuZXJhdGlvbkRlbGl2ZXJ5ID0gdHJ1ZTtcbiAgICAgICAgICByZXR1cm4gcGF5bG9hZDtcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgbGV0IGRvd25sb2FkRXZlbnRzID0gMDtcbiAgICAgIHBhZ2Uub24oJ2Rvd25sb2FkJywgKCkgPT4geyBkb3dubG9hZEV2ZW50cyArPSAxOyB9KTtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdEb3dubG9hZCBNeSBkdWInLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtdGVzdGlkPVwiZGVsZXRlZC1wcm9qZWN0LWJvdW5kYXJ5XCJdJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgICBleHBlY3QoYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIFdpbmRvdyAmIHsgX19kZWxldGVkQmVmb3JlR2VuZXJhdGlvbkRlbGl2ZXJ5PzogYm9vbGVhbiB9KS5fX2RlbGV0ZWRCZWZvcmVHZW5lcmF0aW9uRGVsaXZlcnkpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGRvd25sb2FkRXZlbnRzKS50b0JlKDApO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXN0SWQoJ3Jlc3VsdC1wbGF5ZXInKSkudG9IYXZlQ291bnQoMCk7XG4gICAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdCLWRvd25sb2FkLXRvbWJzdG9uZWQtYmVmb3JlLWRlbGl2ZXJ5LnBuZycpLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgICB9XG4gIH0pO1xufVxuXG50ZXN0KCdjb21wbGV0ZWQgcmV2aXNpb24gc3RheXMgaW4gUmVjb3JkIGFmdGVyIE5leHQgYW5kIG5lZWRzIGV4cGxpY2l0IFRvIHJlc3VsdCBhdXRob3JpemF0aW9uJywgYXN5bmMgKHsgcGFnZSwgYnJvd3NlciB9KSA9PiB7XG4gIHRlc3Quc2V0VGltZW91dCg3NV8wMDApO1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgYXdhaXQgaW5zdHJ1bWVudE5hdGl2ZU1lZGlhKHBhZ2UpO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJmxvY2FsZT1lbicpO1xuICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PlxuICAgIHZpZGVvLnJlYWR5U3RhdGUgPj0gSFRNTE1lZGlhRWxlbWVudC5IQVZFX0NVUlJFTlRfREFUQSAmJiB2aWRlby52aWRlb1dpZHRoID4gMCksIHsgdGltZW91dDogMTVfMDAwIH0pLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy53YXZlZm9ybS1yb3cnKSkudG9IYXZlQXR0cmlidXRlKCdkYXRhLXNvdXJjZS13YXZlZm9ybScsICdkZWNvZGVkJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG5cbiAgZm9yIChjb25zdCB0dXJuIG9mIFsxLCAyLCAzXSkge1xuICAgIGF3YWl0IHJlY29yZEN1cnJlbnRXaW5kb3cocGFnZSwgJ0EnKTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgaWYgKHR1cm4gPCAzKSBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKG5ldyBSZWdFeHAoYHR1cm49c2ludGVsLXR1cm4tJHt0dXJuICsgMX1gKSk7XG4gIH1cblxuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9yZXN1bHRcXD9sYXlvdXQ9QSZzbmFwc2hvdD0vKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdJbGx1c3RyYXRpdmUgc2FtcGxlIHJlYWR5JykpLnRvQmVWaXNpYmxlKHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBjb25zdCBpbml0aWFsID0gYXdhaXQgcmVhZEluZGV4ZWREYihwYWdlKTtcbiAgY29uc3QgaW5pdGlhbFNuYXBzaG90SWQgPSBTdHJpbmcoaW5pdGlhbC5wcm9qZWN0Py5pbml0aWFsUmVzdWx0U25hcHNob3RJZCA/PyAnJyk7XG4gIGV4cGVjdChpbml0aWFsU25hcHNob3RJZCkudG9CZVRydXRoeSgpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdwaGFzZTQtaW5pdGlhbC1yZXN1bHQtYmVmb3JlLXJldmlzaW9uLnBuZycpLCBmdWxsUGFnZTogdHJ1ZSB9KTtcblxuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmV0dXJuIHRvIHJlY29yZGluZycsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3JlY29yZFxcP2xheW91dD1BJnR1cm49c2ludGVsLXR1cm4tMS8pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBjb25zdCByZXR1cm5Mb2NrcyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHdpbmRvdyBhcyB1bmtub3duIGFzIFdpbmRvdyAmIHtcbiAgICBfX2xvY2tFdmlkZW5jZTogeyByZXF1ZXN0czogc3RyaW5nW107IGNhbGxiYWNrczogQXJyYXk8J2FjcXVpcmVkJyB8ICdudWxsJz4gfTtcbiAgfSkuX19sb2NrRXZpZGVuY2UpO1xuICBleHBlY3QocmV0dXJuTG9ja3MucmVxdWVzdHMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgZXhwZWN0KHJldHVybkxvY2tzLmNhbGxiYWNrcykudG9FcXVhbChbJ2FjcXVpcmVkJywgJ2FjcXVpcmVkJ10pO1xuICBhd2FpdCByZWNvcmRDdXJyZW50V2luZG93KHBhZ2UsICdBJyk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdOZXh0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvcmVjb3JkXFw/bGF5b3V0PUEmdHVybj1zaW50ZWwtdHVybi0xLyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnVG8gcmVzdWx0JywgZXhhY3Q6IHRydWUgfSkpLnRvQmVWaXNpYmxlKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS5ub3QudG9IYXZlVVJMKC9cXC9yZXN1bHQvKTtcbiAgY29uc3QgYWZ0ZXJSZXBsYWNlbWVudE5leHQgPSBwYWdlLnVybCgpO1xuXG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEmdHVybj1zaW50ZWwtdHVybi0zJmxvY2FsZT1lbicpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1RvIHJlc3VsdCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlVmlzaWJsZSgpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdwaGFzZTQtY29tcGxldGVkLXJldmlzaW9uLWxhc3QtdHVybi5wbmcnKSwgZnVsbFBhZ2U6IHRydWUgfSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdUbyByZXN1bHQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9yZXN1bHRcXD9sYXlvdXQ9QSZzbmFwc2hvdD0vKTtcbiAgY29uc3QgcHJlc2VudGVkVmlkZW8gPSBwYWdlLmdldEJ5VGVzdElkKCdyZXN1bHQtdmlkZW8nKTtcbiAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcHJlc2VudGVkVmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PlxuICAgIHZpZGVvLnJlYWR5U3RhdGUgPj0gSFRNTE1lZGlhRWxlbWVudC5IQVZFX0NVUlJFTlRfREFUQSAmJiB2aWRlby52aWRlb1dpZHRoID4gMFxuICAgICAgJiYgdmlkZW8uY3VycmVudFNyYy5zdGFydHNXaXRoKCdibG9iOicpKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdJbGx1c3RyYXRpdmUgc2FtcGxlIHJlYWR5JykpLnRvQmVWaXNpYmxlKCk7XG5cbiAgY29uc3QgcmV2aXNlZCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGV4cGVjdChyZXZpc2VkLnNuYXBzaG90cykudG9IYXZlTGVuZ3RoKDIpO1xuICBjb25zdCBvcmlnaW5hbFNuYXBzaG90ID0gcmV2aXNlZC5zbmFwc2hvdHMuZmluZCgoc25hcHNob3QpID0+IHNuYXBzaG90LmlkID09PSBpbml0aWFsU25hcHNob3RJZCk7XG4gIGV4cGVjdCgob3JpZ2luYWxTbmFwc2hvdCBhcyB7IGF1dGhvcml6YXRpb24/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZCk/LmF1dGhvcml6YXRpb24pLnRvQmUoJ2luaXRpYWwtY29tcGxldGlvbicpO1xuICBjb25zdCBleHBsaWNpdFNuYXBzaG90ID0gcmV2aXNlZC5zbmFwc2hvdHMuZmluZCgoc25hcHNob3QpID0+IHNuYXBzaG90LmF1dGhvcml6YXRpb24gPT09ICdleHBsaWNpdC1jb21wbGV0ZWQtcmV2aXNpb24nKSBhc1xuICAgIHsgaWQ6IHN0cmluZzsgYXV0aG9yaXphdGlvbjogc3RyaW5nOyB0YWtlczogdW5rbm93bltdIH0gfCB1bmRlZmluZWQ7XG4gIGV4cGVjdChleHBsaWNpdFNuYXBzaG90KS50b0JlRGVmaW5lZCgpO1xuICBpZiAoIWV4cGxpY2l0U25hcHNob3QpIHRocm93IG5ldyBFcnJvcignVGhlIGV4cGxpY2l0IGNvbXBsZXRlZCByZXZpc2lvbiBzbmFwc2hvdCB3YXMgbm90IHBlcnNpc3RlZC4nKTtcbiAgZXhwZWN0KGV4cGxpY2l0U25hcHNob3QuYXV0aG9yaXphdGlvbikudG9CZSgnZXhwbGljaXQtY29tcGxldGVkLXJldmlzaW9uJyk7XG4gIGV4cGVjdChleHBsaWNpdFNuYXBzaG90LmlkKS5ub3QudG9CZShpbml0aWFsU25hcHNob3RJZCk7XG4gIGV4cGVjdChleHBsaWNpdFNuYXBzaG90LnRha2VzKS50b0hhdmVMZW5ndGgoMyk7XG4gIGNvbnN0IHByZXNlbnRlZE1lZGlhID0gYXdhaXQgcHJlc2VudGVkVmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiAoe1xuICAgIHNvdXJjZTogdmlkZW8uZGF0YXNldC5zb3VyY2UsXG4gICAgZ2VuZXJhdGlvbklkOiB2aWRlby5kYXRhc2V0LmdlbmVyYXRpb25JZCxcbiAgICBjdXJyZW50U3JjOiB2aWRlby5jdXJyZW50U3JjLFxuICAgIHJlYWR5U3RhdGU6IHZpZGVvLnJlYWR5U3RhdGUsXG4gICAgY3VycmVudFRpbWU6IHZpZGVvLmN1cnJlbnRUaW1lLFxuICAgIGR1cmF0aW9uOiBOdW1iZXIuaXNGaW5pdGUodmlkZW8uZHVyYXRpb24pID8gdmlkZW8uZHVyYXRpb24gOiBudWxsLFxuICAgIGR1cmF0aW9uTWV0YWRhdGE6IHZpZGVvLmR1cmF0aW9uID09PSBJbmZpbml0eSA/ICd1bmtub3duLXVudGlsLWVuZCcgOiBOdW1iZXIuaXNOYU4odmlkZW8uZHVyYXRpb24pID8gJ3VuYXZhaWxhYmxlJyA6ICdmaW5pdGUnLFxuICAgIHdpZHRoOiB2aWRlby52aWRlb1dpZHRoLFxuICAgIGhlaWdodDogdmlkZW8udmlkZW9IZWlnaHQsXG4gICAgcGF1c2VkOiB2aWRlby5wYXVzZWQsXG4gIH0pKTtcbiAgZXhwZWN0KHByZXNlbnRlZE1lZGlhLnNvdXJjZSkudG9CZSgnZHViJyk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ3BoYXNlNC1leHBsaWNpdC1yZXZpc2lvbi1yZXN1bHQucG5nJyksIGZ1bGxQYWdlOiB0cnVlIH0pO1xuICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAncGhhc2U0LWV4cGxpY2l0LXJldmlzaW9uLWJyb3dzZXItZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIG5hdGl2ZUlucHV0OiAnQ2hyb21lIGZha2UgbWVkaWEgaW5wdXQ7IG5vdCBhIHBoeXNpY2FsIG1pY3JvcGhvbmUnLFxuICAgIGluaXRpYWxTbmFwc2hvdElkLFxuICAgIHJldmlzZWRTbmFwc2hvdDogZXhwbGljaXRTbmFwc2hvdCxcbiAgICBwcmVzZW50ZWRNZWRpYSxcbiAgICBjYXB0dXJlR3JhbnRMaWZlY3ljbGU6IHJldHVybkxvY2tzLFxuICAgIGFmdGVyUmVwbGFjZW1lbnROZXh0LFxuICAgIGF1dG9tYXRpY1Jlc3VsdE5hdmlnYXRpb25BZnRlclJlcGxhY2VtZW50OiBmYWxzZSxcbiAgICBleHBsaWNpdFRvUmVzdWx0Q2xpY2tlZDogdHJ1ZSxcbiAgfSwgbnVsbCwgMikpO1xufSk7XG5cbnRlc3QoJ2Egc2Vjb25kIG9wZW4gdGFiIGNhbm5vdCBjYXB0dXJlIG9yIGFjY2VwdCB3aGlsZSB0aGUgZmlyc3QgdGFiIGhvbGRzIHRoZSBsb2NhbCBwcm9qZWN0IGdyYW50JywgYXN5bmMgKHsgcGFnZSB9KSA9PiB7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEnKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgY29uc3Qgc2Vjb25kUGFnZSA9IGF3YWl0IHBhZ2UuY29udGV4dCgpLm5ld1BhZ2UoKTtcbiAgYXdhaXQgc2Vjb25kUGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QicpO1xuICBhd2FpdCBleHBlY3Qoc2Vjb25kUGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRGlzYWJsZWQoKTtcbiAgYXdhaXQgZXhwZWN0KHNlY29uZFBhZ2UuZ2V0QnlSb2xlKCdhbGVydCcpKS50b0NvbnRhaW5UZXh0KCdBbm90aGVyIG9wZW4gdGFiIGN1cnJlbnRseSBob2xkcyB0aGlzIHByb2plY3TigJlzIGxvY2FsIHJlY29yZGluZyBhY2Nlc3MuJyk7XG4gIGF3YWl0IHNlY29uZFBhZ2UuY2xvc2UoKTtcbn0pO1xuXG50ZXN0KCdkZW5pZWQgbWljcm9waG9uZSBwZXJtaXNzaW9uIGlzIGNvbnRleHR1YWwgYW5kIGRvZXMgbm90IHN0YXJ0IE1lZGlhUmVjb3JkZXInLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG4gIGF3YWl0IHBhZ2UuYWRkSW5pdFNjcmlwdCgoKSA9PiB7XG4gICAgKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fZGVueU1pY3JvcGhvbmU/OiBib29sZWFuIH0pLl9fZGVueU1pY3JvcGhvbmUgPSB0cnVlO1xuICB9KTtcbiAgYXdhaXQgaW5zdHJ1bWVudE5hdGl2ZU1lZGlhKHBhZ2UpO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ1NpbnRlbCDCtyBUaGUgU2VhcmNoJyB9KSkudG9CZVZpc2libGUoKTtcblxuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTZXR0aW5ncycsIGV4YWN0OiB0cnVlIH0pKS50b0JlVmlzaWJsZSgpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnTWljcm9waG9uZSBhY2Nlc3Mgd2FzIGRlbmllZCBvciBpbnRlcnJ1cHRlZC4gUmVjb3JkaW5nIGRpZCBub3QgYmVnaW4nKTtcbiAgZXhwZWN0KGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSkpLnRvRXF1YWwoeyBnZXRVc2VyTWVkaWFDYWxsczogMSwgcmVjb3JkZXJTdGFydHM6IDAgfSk7XG4gIGNvbnN0IGRhdGFiYXNlID0gYXdhaXQgcmVhZEluZGV4ZWREYihwYWdlKTtcbiAgZXhwZWN0KGRhdGFiYXNlLm1lZGlhLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUucHVycG9zZSA9PT0gJ3JlY29yZGluZycpKS50b0hhdmVMZW5ndGgoMCk7XG4gIGNvbnN0IHRvYXN0ID0gcGFnZS5sb2NhdG9yKCcucmVjb3ZlcnktdG9hc3QnKTtcbiAgYXdhaXQgZXhwZWN0KHRvYXN0KS50b0JlVmlzaWJsZSgpO1xuICBleHBlY3QoYXdhaXQgdG9hc3QuZ2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicpKS50b0JlKCd0cnVlJyk7XG4gIGV4cGVjdChhd2FpdCB0b2FzdC5nZXRCeVJvbGUoJ2J1dHRvbicpLmNvdW50KCkpLnRvQmUoMCk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvclRpbWVvdXQoMTAwMCk7XG4gIGF3YWl0IGV4cGVjdCh0b2FzdCkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCg2NTAwKTtcbiAgY29uc3QgdG9hc3RCb3VuZHMgPSBhd2FpdCB0b2FzdC5ib3VuZGluZ0JveCgpO1xuICBleHBlY3QodG9hc3RCb3VuZHMpLm5vdC50b0JlTnVsbCgpO1xuICBhd2FpdCBwYWdlLm1vdXNlLm1vdmUodG9hc3RCb3VuZHMhLnggKyB0b2FzdEJvdW5kcyEud2lkdGggLyAyLCB0b2FzdEJvdW5kcyEueSArIHRvYXN0Qm91bmRzIS5oZWlnaHQgLyAyKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCg5NTApO1xuICBhd2FpdCBleHBlY3QodG9hc3QpLnRvQmVWaXNpYmxlKCk7XG4gIGF3YWl0IHBhZ2UubW91c2UubW92ZSgyMCwgMjApO1xuICBhd2FpdCBleHBlY3QodG9hc3QpLnRvSGF2ZUNvdW50KDAsIHsgdGltZW91dDogMTUwMCB9KTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ01pY3JvcGhvbmUgYWNjZXNzIHdhcyBkZW5pZWQgb3IgaW50ZXJydXB0ZWQuIFJlY29yZGluZyBkaWQgbm90IGJlZ2luJyk7XG5cbiAgYXdhaXQgcGFnZS5lbXVsYXRlTWVkaWEoeyByZWR1Y2VkTW90aW9uOiAncmVkdWNlJyB9KTtcbiAgYXdhaXQgcGFnZS5yZWxvYWQoKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvdmVyeS10b2FzdCcpKS50b0JlVmlzaWJsZSgpO1xuICBjb25zdCByZWR1Y2VkTW90aW9uVHJhbnNpdGlvblNlY29uZHMgPSBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvdmVyeS10b2FzdCcpLmV2YWx1YXRlKChlbGVtZW50KSA9PlxuICAgIE51bWJlci5wYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCkudHJhbnNpdGlvbkR1cmF0aW9uLnNwbGl0KCcsJylbMF0gPz8gJzEnKSk7XG4gIGV4cGVjdChyZWR1Y2VkTW90aW9uVHJhbnNpdGlvblNlY29uZHMpLnRvQmVMZXNzVGhhbigwLjAwMSk7XG4gIGF3YWl0IHBhZ2UubW91c2Uud2hlZWwoMCwgMTAwKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0JykpLnRvSGF2ZUNvdW50KDAsIHsgdGltZW91dDogMV8wMDAgfSk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdNaWNyb3Bob25lIGFjY2VzcyB3YXMgZGVuaWVkIG9yIGludGVycnVwdGVkLiBSZWNvcmRpbmcgZGlkIG5vdCBiZWdpbicpO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnU2V0dGluZ3MnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9zZXR0aW5nc1xcL21pY3JvcGhvbmVcXD8vKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPXNldHRpbmdzLyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJ1tkYXRhLWxvZ2ljYWwtZm9jdXM9XCJzZXR0aW5nc1wiXScpKS50b0JlRm9jdXNlZCgpO1xuICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAncGVybWlzc2lvbi1kZW5pZWQtYnJvd3Nlci1ldmlkZW5jZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgcGVybWlzc2lvbjogJ3Rlc3QgaGFybmVzcyByZWplY3RlZCBnZXRVc2VyTWVkaWEgd2l0aCBOb3RBbGxvd2VkRXJyb3I7IGJyb3dzZXIgcGVybWlzc2lvbiBVSSB3YXMgbm90IGV4ZXJjaXNlZCcsXG4gICAgbmF0aXZlQXBpRXZpZGVuY2U6IGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSksXG4gICAgc2F2ZWRSZWNvcmRpbmdDb3VudDogZGF0YWJhc2UubWVkaWEuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5wdXJwb3NlID09PSAncmVjb3JkaW5nJykubGVuZ3RoLFxuICAgIHNldHRpbmdzQm91bmRhcnlBdmFpbGFibGU6IGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTZXR0aW5ncycsIGV4YWN0OiB0cnVlIH0pLmlzVmlzaWJsZSgpLFxuICAgIHNldHRpbmdzQm91bmRhcnlSZXR1cm5Gb2N1czogYXdhaXQgcGFnZS5sb2NhdG9yKCdbZGF0YS1sb2dpY2FsLWZvY3VzPVwic2V0dGluZ3NcIl0nKS5ldmFsdWF0ZSgoZWxlbWVudCkgPT4gZWxlbWVudCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCksXG4gICAgcmVjb3ZlcnlUb2FzdDogJ21lc3NhZ2Ugb25seSBhbmQgYXJpYS1oaWRkZW47IDggc2Vjb25kIHJlYWQgaW50ZXJ2YWw7IGRlbGliZXJhdGUgaG92ZXIgcGF1c2U7IHJlZHVjZWQgbW90aW9uOyBtYW51YWwgd2hlZWwgZGlzbWlzc2FsOyBkdXJhYmxlIGVycm9yIHJldGFpbmVkJyxcbiAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG59KTtcblxudGVzdCgnYnJvd3NlciBsaWZlY3ljbGUgaW50ZXJydXB0aW9uIHNhdmVzIG9ubHkgYSB1c2FibGUgbmF0aXZlIHBhcnRpYWwgYW5kIGNhbmNlbHMgcGVuZGluZyBpbnB1dCBzYWZlbHknLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDQ1XzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEmbG9jYWxlPWVuJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gIGF3YWl0IHRyYWNlTmV4dE5hdGl2ZUJsb2JEaWdlc3QocGFnZSk7XG5cbiAgY29uc3QgcmVhZFByZXBhcmVkRHVyYXRpb24gPSBhc3luYyAoKSA9PiBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IG5ldyBQcm9taXNlPElEQkRhdGFiYXNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oJ2R1YmJlZC1jb3JlLWxvY2FsLXYxJyk7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgIH0pO1xuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBuZXcgUHJvbWlzZTx7IHdpbmRvd3M6IEFycmF5PHsgaWQ6IHN0cmluZzsgc3RhcnRNczogbnVtYmVyOyBlbmRNczogbnVtYmVyIH0+IH0+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBkYXRhYmFzZS50cmFuc2FjdGlvbigncHJvamVjdHMnLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZSgncHJvamVjdHMnKS5nZXQoJ3NpbnRlbC1wcmVwYXJlZCcpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0IGFzIHsgd2luZG93czogQXJyYXk8eyBpZDogc3RyaW5nOyBzdGFydE1zOiBudW1iZXI7IGVuZE1zOiBudW1iZXIgfT4gfSk7XG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgfSk7XG4gICAgZGF0YWJhc2UuY2xvc2UoKTtcbiAgICBjb25zdCB3aW5kb3cgPSBwcm9qZWN0LndpbmRvd3MuZmluZCgoaXRlbSkgPT4gaXRlbS5pZCA9PT0gJ3NpbnRlbC10dXJuLTEnKTtcbiAgICBpZiAoIXdpbmRvdykgdGhyb3cgbmV3IEVycm9yKCdQcmVwYXJlZCB0dXJuIDEgaGFzIG5vIHNvdXJjZSB3aW5kb3cuJyk7XG4gICAgcmV0dXJuIHdpbmRvdy5lbmRNcyAtIHdpbmRvdy5zdGFydE1zO1xuICB9KTtcbiAgY29uc3QgcHJlcGFyZWREdXJhdGlvbk1zID0gYXdhaXQgcmVhZFByZXBhcmVkRHVyYXRpb24oKTtcbiAgY29uc3QgY3VycmVudENhbmRpZGF0ZSA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgY29uc3QgZHJhZnRCeVR1cm4gPSBkYXRhYmFzZS5wcm9qZWN0Py5kcmFmdENhbmRpZGF0ZUJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgdW5kZWZpbmVkO1xuICAgIGNvbnN0IGNhbmRpZGF0ZUlkID0gZHJhZnRCeVR1cm4/Llsnc2ludGVsLXR1cm4tMSddO1xuICAgIHJldHVybiB7IGRhdGFiYXNlLCBjYW5kaWRhdGU6IGRhdGFiYXNlLm1lZGlhLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBjYW5kaWRhdGVJZCkgfTtcbiAgfTtcbiAgY29uc3QgcGFuZWxCb3VuZHMgPSBhc3luYyAoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+ICh7XG4gICAgbWVkaWE6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZWRpYS12aWV3cG9ydCcpIS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b0pTT04oKSxcbiAgICBwYW5lbDogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnJlY29yZC1wYW5lbCcpIS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b0pTT04oKSxcbiAgfSkpO1xuICBjb25zdCBleHBlY3RQYW5lbEFsaWduZWQgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgYm91bmRzID0gYXdhaXQgcGFuZWxCb3VuZHMoKTtcbiAgICBleHBlY3QoTWF0aC5hYnMoYm91bmRzLnBhbmVsLnkgLSBib3VuZHMubWVkaWEueSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgcmV0dXJuIGJvdW5kcztcbiAgfTtcbiAgY29uc3Qgc2V0TW9kZWxlZFZpc2liaWxpdHkgPSBhc3luYyAoaGlkZGVuOiBib29sZWFuKSA9PiBwYWdlLmV2YWx1YXRlKChpc0hpZGRlbikgPT4ge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkb2N1bWVudCwgJ2hpZGRlbicsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogaXNIaWRkZW4gfSk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRvY3VtZW50LCAndmlzaWJpbGl0eVN0YXRlJywgeyBjb25maWd1cmFibGU6IHRydWUsIHZhbHVlOiBpc0hpZGRlbiA/ICdoaWRkZW4nIDogJ3Zpc2libGUnIH0pO1xuICAgIGRvY3VtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCd2aXNpYmlsaXR5Y2hhbmdlJykpO1xuICAgIGlmIChpc0hpZGRlbikgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KCdwYWdlaGlkZScpKTtcbiAgICBlbHNlIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgncGFnZXNob3cnKSk7XG4gIH0sIGhpZGRlbik7XG4gIGNvbnN0IHNhdmVMaWZlY3ljbGVQYXJ0aWFsID0gYXN5bmMgKGV4cGVjdGVkUmVjb3JkZXJTdGFydHM6IG51bWJlciwgc2NyZWVuc2hvdE5hbWU6IHN0cmluZykgPT4ge1xuICAgIGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1hY3Rpb24nKS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZShleHBlY3RlZFJlY29yZGVyU3RhcnRzKTtcbiAgICBjb25zdCBjYXB0dXJpbmdCb3VuZHMgPSBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGAke3NjcmVlbnNob3ROYW1lfS1jYXB0dXJpbmcucG5nYCkgfSk7XG4gICAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCg5MDApO1xuICAgIGF3YWl0IHNldE1vZGVsZWRWaXNpYmlsaXR5KHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdpbnRlcnJ1cHRlZCByZWNvcmRpbmcgd2l0aCB1c2FibGUgYXVkaW8gd2FzIHNhdmVkIGFzIGEgY2FuZGlkYXRlJywgeyB0aW1lb3V0OiAxNV8wMDAgfSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdZb3VyIHRha2UnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGNvbnN0IHNhdmVkQm91bmRzID0gYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgJHtzY3JlZW5zaG90TmFtZX0tcGFydGlhbC1zYXZlZC5wbmdgKSB9KTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX25hdGl2ZUJsb2JEaWdlc3RUcmFjZT86IHsgc2hhMjU2OiBzdHJpbmcgfCBudWxsIH0gfSkuX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U/LnNoYTI1NikpXG4gICAgICAudG9NYXRjaCgvXlthLWYwLTldezY0fSQvKTtcbiAgICBjb25zdCBkaWdlc3QgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgV2luZG93ICYge1xuICAgICAgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U/OiB7IGNhcHR1cmVzOiBudW1iZXI7IGJ5dGVTaXplOiBudW1iZXI7IG1pbWVUeXBlOiBzdHJpbmc7IHNoYTI1Njogc3RyaW5nIHwgbnVsbCB9O1xuICAgIH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlKTtcbiAgICBleHBlY3QoZGlnZXN0KS50b0JlRGVmaW5lZCgpO1xuICAgIGlmICghZGlnZXN0KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBuYXRpdmUgTWVkaWFSZWNvcmRlciBieXRlIGRpZ2VzdCB3YXMgbm90IG9ic2VydmVkLicpO1xuICAgIGNvbnN0IHsgZGF0YWJhc2UsIGNhbmRpZGF0ZSB9ID0gYXdhaXQgY3VycmVudENhbmRpZGF0ZSgpO1xuICAgIGNvbnN0IHByb2JlID0gY2FuZGlkYXRlPy5wcm9iZSBhcyB7IGRlY29kZWRGcmFtZXM/OiBudW1iZXIgfCBudWxsOyBkdXJhdGlvblNlY29uZHM/OiBudW1iZXIgfCBudWxsOyBkZWNvZGVTdGF0dXM/OiBzdHJpbmcgfSB8IHVuZGVmaW5lZDtcbiAgICBleHBlY3QoY2FuZGlkYXRlPy5lbmRSZWFzb24pLnRvQmUoJ2ludGVycnVwdGVkJyk7XG4gICAgZXhwZWN0KGNhbmRpZGF0ZT8uYmxvYlNpemUpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBleHBlY3QoY2FuZGlkYXRlPy5ibG9iU2l6ZSkudG9CZShjYW5kaWRhdGU/LmJ5dGVTaXplKTtcbiAgICBleHBlY3QoY2FuZGlkYXRlPy5zaGEyNTYpLnRvQmUoZGlnZXN0LnNoYTI1Nik7XG4gICAgZXhwZWN0KGNhbmRpZGF0ZT8uYnl0ZVNpemUpLnRvQmUoZGlnZXN0LmJ5dGVTaXplKTtcbiAgICBleHBlY3QocHJvYmU/LmRlY29kZWRGcmFtZXMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBleHBlY3QocHJvYmU/LmR1cmF0aW9uU2Vjb25kcykudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGV4cGVjdChwcm9iZT8uZHVyYXRpb25TZWNvbmRzID8/IEluZmluaXR5KS50b0JlTGVzc1RoYW4ocHJlcGFyZWREdXJhdGlvbk1zIC8gMTAwMCk7XG4gICAgZXhwZWN0KE9iamVjdC52YWx1ZXMoZGF0YWJhc2UucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiA/PyB7fSkpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgJHtzY3JlZW5zaG90TmFtZX0tZXZpZGVuY2UuanNvbmApLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICAgIGlucHV0OiAnQ2hyb21lIGJyb3dzZXIgZmFrZSBhdWRpbyBpbnB1dDsgbm90IGEgcGh5c2ljYWwgbWljcm9waG9uZScsXG4gICAgICBsaWZlY3ljbGU6ICdtb2RlbGVkIGRvY3VtZW50LmhpZGRlbi92aXNpYmlsaXR5Y2hhbmdlIGFuZCBwYWdlaGlkZSBldmVudHMnLFxuICAgICAgcHJlcGFyZWREdXJhdGlvbk1zLFxuICAgICAgbmF0aXZlQmxvYjogZGlnZXN0LFxuICAgICAgcGVyc2lzdGVkQ2FuZGlkYXRlOiBjYW5kaWRhdGUsXG4gICAgICBzb3VyY2VWaWRlb1BhdXNlZEFmdGVySW50ZXJydXB0aW9uOiBhd2FpdCBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpLFxuICAgICAgcGFuZWxEdXJpbmdDYXB0dXJlOiBjYXB0dXJpbmdCb3VuZHMsXG4gICAgICBwYW5lbEFmdGVyU2F2ZTogc2F2ZWRCb3VuZHMsXG4gICAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG4gICAgYXdhaXQgc2V0TW9kZWxlZFZpc2liaWxpdHkoZmFsc2UpO1xuICAgIGF3YWl0IHBhZ2Uud2FpdEZvclRpbWVvdXQoMjUwKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIHJldHVybiBjYW5kaWRhdGU7XG4gIH07XG5cbiAgY29uc3Qgbm9ybWFsQm91bmRzID0gYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMTItQS1yZWNvcmQtbm9ybWFsLTE0NDB4OTAwLnBuZycpIH0pO1xuICBjb25zdCBmaXJzdFBhcnRpYWwgPSBhd2FpdCBzYXZlTGlmZWN5Y2xlUGFydGlhbCgxLCAnSVIxMS1wYXJ0aWFsLTE0NDB4OTAwJyk7XG5cbiAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTI4MCwgaGVpZ2h0OiA2MDAgfSk7XG4gIGNvbnN0IHNob3J0U2F2ZWRCb3VuZHMgPSBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIxMi1BLXJlY29yZC1zYXZlZC0xMjgweDYwMC5wbmcnKSB9KTtcbiAgY29uc3Qgc2Vjb25kUGFydGlhbCA9IGF3YWl0IHNhdmVMaWZlY3ljbGVQYXJ0aWFsKDIsICdJUjExLXBhcnRpYWwtMTI4MHg2MDAnKTtcblxuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICB0eXBlIFNlcnZpY2VNZWRpYSA9IHsgY2FwdHVyZUZpeGVkV2luZG93OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBQcm9taXNlPHVua25vd24+IH07XG4gICAgdHlwZSBTZXJ2aWNlcyA9IHsgbWVkaWE6IFNlcnZpY2VNZWRpYSB9O1xuICAgIHR5cGUgRmliZXIgPSB7IGFsdGVybmF0ZT86IHVua25vd247IGNoaWxkPzogdW5rbm93bjsgc2libGluZz86IHVua25vd247IG1lbW9pemVkUHJvcHM/OiB1bmtub3duIH07XG4gICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykgYXMgKEhUTUxFbGVtZW50ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHwgbnVsbDtcbiAgICBpZiAoIXJvb3QpIHRocm93IG5ldyBFcnJvcignVGhlIFJlYWN0IHJvb3QgaXMgdW5hdmFpbGFibGUgZm9yIHRoZSB1bnVzYWJsZS1wYXJ0aWFsIGNoZWNrLicpO1xuICAgIGNvbnN0IHJvb3RLZXkgPSBPYmplY3Qua2V5cyhyb290KS5maW5kKChrZXkpID0+IGtleS5zdGFydHNXaXRoKCdfX3JlYWN0Q29udGFpbmVyJCcpKTtcbiAgICBpZiAoIXJvb3RLZXkpIHRocm93IG5ldyBFcnJvcignVGhlIGFjdGl2ZSBSZWFjdCByb290IGZpYmVyIGlzIHVuYXZhaWxhYmxlLicpO1xuICAgIGNvbnN0IHBlbmRpbmc6IHVua25vd25bXSA9IFtyb290W3Jvb3RLZXldXTtcbiAgICBjb25zdCBzZWVuID0gbmV3IFNldDx1bmtub3duPigpO1xuICAgIGxldCBzZXJ2aWNlczogU2VydmljZXMgfCBudWxsID0gbnVsbDtcbiAgICB3aGlsZSAocGVuZGluZy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBmaWJlciA9IHBlbmRpbmcucG9wKCkgYXMgRmliZXIgfCBudWxsO1xuICAgICAgaWYgKCFmaWJlciB8fCBzZWVuLmhhcyhmaWJlcikpIGNvbnRpbnVlO1xuICAgICAgc2Vlbi5hZGQoZmliZXIpO1xuICAgICAgaWYgKGZpYmVyLmFsdGVybmF0ZSkgcGVuZGluZy5wdXNoKGZpYmVyLmFsdGVybmF0ZSk7XG4gICAgICBjb25zdCBwcm9wcyA9IGZpYmVyLm1lbW9pemVkUHJvcHMgYXMgeyBzZXJ2aWNlcz86IFNlcnZpY2VzIH0gfCBudWxsO1xuICAgICAgaWYgKHByb3BzPy5zZXJ2aWNlcz8ubWVkaWEpIHNlcnZpY2VzID0gcHJvcHMuc2VydmljZXM7XG4gICAgICBpZiAoZmliZXIuY2hpbGQpIHBlbmRpbmcucHVzaChmaWJlci5jaGlsZCk7XG4gICAgICBpZiAoZmliZXIuc2libGluZykgcGVuZGluZy5wdXNoKGZpYmVyLnNpYmxpbmcpO1xuICAgIH1cbiAgICBpZiAoIXNlcnZpY2VzKSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBhY3RpdmUgdHlwZWQgQnJvd3Nlck1lZGlhUG9ydCB3YXMgbm90IGZvdW5kLicpO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gc2VydmljZXMubWVkaWEuY2FwdHVyZUZpeGVkV2luZG93LmJpbmQoc2VydmljZXMubWVkaWEpO1xuICAgIGxldCByZXR1cm5VbnVzYWJsZU9uY2UgPSB0cnVlO1xuICAgIHNlcnZpY2VzLm1lZGlhLmNhcHR1cmVGaXhlZFdpbmRvdyA9IGFzeW5jICguLi5hcmdzKSA9PiB7XG4gICAgICBjb25zdCBpbnB1dCA9IGFyZ3NbMF0gYXMgeyBwdXJwb3NlPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG4gICAgICBpZiAoaW5wdXQ/LnB1cnBvc2UgPT09ICdyZWNvcmRpbmcnICYmIHJldHVyblVudXNhYmxlT25jZSkge1xuICAgICAgICByZXR1cm5VbnVzYWJsZU9uY2UgPSBmYWxzZTtcbiAgICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwdXJwb3NlOiAncmVjb3JkaW5nJyxcbiAgICAgICAgICBibG9iOiBuZXcgQmxvYihbbmV3IFVpbnQ4QXJyYXkoWzEsIDIsIDNdKV0sIHsgdHlwZTogJ2F1ZGlvL3dlYm0nIH0pLFxuICAgICAgICAgIG1pbWVUeXBlOiAnYXVkaW8vd2VibScsXG4gICAgICAgICAgc3RhcnRlZEF0OiBub3cgLSA1MCxcbiAgICAgICAgICBzdG9wcGVkQXQ6IG5vdyxcbiAgICAgICAgICBlbGFwc2VkTXM6IDUwLFxuICAgICAgICAgIGVuZFJlYXNvbjogJ2ludGVycnVwdGVkJyxcbiAgICAgICAgICBwcm9iZTogeyBtaW1lVHlwZTogJ2F1ZGlvL3dlYm0nLCBieXRlU2l6ZTogMywgZHVyYXRpb25TZWNvbmRzOiBudWxsLCBkZWNvZGVkRnJhbWVzOiBudWxsLFxuICAgICAgICAgICAgY2hhbm5lbENvdW50OiBudWxsLCBzYW1wbGVSYXRlOiBudWxsLCBkZWNvZGVTdGF0dXM6ICd1bmF2YWlsYWJsZScsIHdhdmVmb3JtUGVha3M6IFtdIH0sXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgfTtcbiAgfSk7XG4gIGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1hY3Rpb24nKS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnUmVjb3JkaW5nIGNvdWxkIG5vdCBmaW5pc2guIEFueSBlYXJsaWVyIGNhbmRpZGF0ZSBhbmQgYWNjZXB0ZWQgdGFrZSByZW1haW4gdW5jaGFuZ2VkLicpO1xuICBjb25zdCBhZnRlclVudXNhYmxlID0gYXdhaXQgY3VycmVudENhbmRpZGF0ZSgpO1xuICBleHBlY3QoYWZ0ZXJVbnVzYWJsZS5jYW5kaWRhdGU/LmlkKS50b0JlKHNlY29uZFBhcnRpYWw/LmlkKTtcbiAgZXhwZWN0KGFmdGVyVW51c2FibGUuY2FuZGlkYXRlPy5zaGEyNTYpLnRvQmUoc2Vjb25kUGFydGlhbD8uc2hhMjU2KTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIxMS11bnVzYWJsZS1wYXJ0aWFsLXByZXNlcnZlcy1jYW5kaWRhdGUucG5nJykgfSk7XG5cbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7ICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbiB9KS5fX2RlbnlNaWNyb3Bob25lID0gdHJ1ZTsgfSk7XG4gIGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1hY3Rpb24nKS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnTWljcm9waG9uZSBhY2Nlc3Mgd2FzIGRlbmllZCBvciBpbnRlcnJ1cHRlZC4gUmVjb3JkaW5nIGRpZCBub3QgYmVnaW4nKTtcbiAgY29uc3QgYWZ0ZXJEZW5pZWQgPSBhd2FpdCBjdXJyZW50Q2FuZGlkYXRlKCk7XG4gIGV4cGVjdChhZnRlckRlbmllZC5jYW5kaWRhdGU/LmlkKS50b0JlKHNlY29uZFBhcnRpYWw/LmlkKTtcbiAgZXhwZWN0KGFmdGVyRGVuaWVkLmNhbmRpZGF0ZT8uc2hhMjU2KS50b0JlKHNlY29uZFBhcnRpYWw/LnNoYTI1Nik7XG5cbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgdHlwZSBQZW5kaW5nQ2FwdHVyZSA9IHsgc3RyZWFtOiBNZWRpYVN0cmVhbSB8IG51bGw7IHJlbGVhc2U6ICgoKSA9PiB2b2lkKSB8IG51bGwgfTtcbiAgICBjb25zdCB0YXJnZXQgPSB3aW5kb3cgYXMgV2luZG93ICYgeyBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbjsgX19wZW5kaW5nR2V0VXNlck1lZGlhPzogUGVuZGluZ0NhcHR1cmUgfTtcbiAgICB0YXJnZXQuX19kZW55TWljcm9waG9uZSA9IGZhbHNlO1xuICAgIGNvbnN0IG1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXM7XG4gICAgY29uc3Qgb3JpZ2luYWwgPSBtZWRpYURldmljZXMuZ2V0VXNlck1lZGlhLmJpbmQobWVkaWFEZXZpY2VzKTtcbiAgICBjb25zdCBwZW5kaW5nOiBQZW5kaW5nQ2FwdHVyZSA9IHsgc3RyZWFtOiBudWxsLCByZWxlYXNlOiBudWxsIH07XG4gICAgdGFyZ2V0Ll9fcGVuZGluZ0dldFVzZXJNZWRpYSA9IHBlbmRpbmc7XG4gICAgbWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYSA9IGFzeW5jICguLi5hcmdzOiBQYXJhbWV0ZXJzPE1lZGlhRGV2aWNlc1snZ2V0VXNlck1lZGlhJ10+KSA9PiB7XG4gICAgICBjb25zdCBzdHJlYW0gPSBhd2FpdCBvcmlnaW5hbCguLi5hcmdzKTtcbiAgICAgIHBlbmRpbmcuc3RyZWFtID0gc3RyZWFtO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHsgcGVuZGluZy5yZWxlYXNlID0gcmVzb2x2ZTsgfSk7XG4gICAgICByZXR1cm4gc3RyZWFtO1xuICAgIH07XG4gIH0pO1xuICBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtYWN0aW9uJykuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBCb29sZWFuKCh3aW5kb3cgYXMgV2luZG93ICYgeyBfX3BlbmRpbmdHZXRVc2VyTWVkaWE/OiB7IHN0cmVhbTogTWVkaWFTdHJlYW0gfCBudWxsIH0gfSkuX19wZW5kaW5nR2V0VXNlck1lZGlhPy5zdHJlYW0pKSkudG9CZSh0cnVlKTtcbiAgYXdhaXQgc2V0TW9kZWxlZFZpc2liaWxpdHkodHJ1ZSk7XG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgIGNvbnN0IHBlbmRpbmcgPSAod2luZG93IGFzIFdpbmRvdyAmIHsgX19wZW5kaW5nR2V0VXNlck1lZGlhPzogeyByZWxlYXNlOiAoKCkgPT4gdm9pZCkgfCBudWxsIH0gfSkuX19wZW5kaW5nR2V0VXNlck1lZGlhO1xuICAgIGlmICghcGVuZGluZz8ucmVsZWFzZSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgZGVsYXllZCBtaWNyb3Bob25lIHJlc3VsdCBpcyB1bmF2YWlsYWJsZS4nKTtcbiAgICBwZW5kaW5nLnJlbGVhc2UoKTtcbiAgfSk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdSZWNvcmRpbmcgY291bGQgbm90IGZpbmlzaC4nLCB7IHRpbWVvdXQ6IDEwXzAwMCB9KTtcbiAgY29uc3QgcGVuZGluZ1RyYWNrcyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fcGVuZGluZ0dldFVzZXJNZWRpYT86IHsgc3RyZWFtOiBNZWRpYVN0cmVhbSB8IG51bGwgfSB9KVxuICAgIC5fX3BlbmRpbmdHZXRVc2VyTWVkaWE/LnN0cmVhbT8uZ2V0VHJhY2tzKCkubWFwKCh0cmFjaykgPT4gdHJhY2sucmVhZHlTdGF0ZSkgPz8gW10pO1xuICBleHBlY3QocGVuZGluZ1RyYWNrcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgZXhwZWN0KHBlbmRpbmdUcmFja3MuZXZlcnkoKHN0YXRlKSA9PiBzdGF0ZSA9PT0gJ2VuZGVkJykpLnRvQmUodHJ1ZSk7XG4gIGV4cGVjdChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS50b0VxdWFsKHsgZ2V0VXNlck1lZGlhQ2FsbHM6IDQsIHJlY29yZGVyU3RhcnRzOiAyIH0pO1xuICBjb25zdCBhZnRlclBlbmRpbmdDYW5jZWwgPSBhd2FpdCBjdXJyZW50Q2FuZGlkYXRlKCk7XG4gIGV4cGVjdChhZnRlclBlbmRpbmdDYW5jZWwuY2FuZGlkYXRlPy5pZCkudG9CZShzZWNvbmRQYXJ0aWFsPy5pZCk7XG4gIGV4cGVjdChhZnRlclBlbmRpbmdDYW5jZWwuY2FuZGlkYXRlPy5zaGEyNTYpLnRvQmUoc2Vjb25kUGFydGlhbD8uc2hhMjU2KTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIxMS1wcmVwYXJpbmctaGlkZGVuLWNhbmNlbC1wcmVzZXJ2ZXMtY2FuZGlkYXRlLnBuZycpIH0pO1xuICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIxMS1JUjEyLWxpZmVjeWNsZS1hbmQtcGFuZWwtZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIGZpcnN0UGFydGlhbENhbmRpZGF0ZUlkOiBmaXJzdFBhcnRpYWw/LmlkLFxuICAgIGxhdGVzdFBhcnRpYWxDYW5kaWRhdGVJZDogc2Vjb25kUGFydGlhbD8uaWQsXG4gICAgdW51c2FibGVQYXJ0aWFsUHJlc2VydmVkTGF0ZXN0Q2FuZGlkYXRlOiBhZnRlclVudXNhYmxlLmNhbmRpZGF0ZT8uaWQgPT09IHNlY29uZFBhcnRpYWw/LmlkLFxuICAgIGRlbmllZFBlcm1pc3Npb25QcmVzZXJ2ZWRMYXRlc3RDYW5kaWRhdGU6IGFmdGVyRGVuaWVkLmNhbmRpZGF0ZT8uaWQgPT09IHNlY29uZFBhcnRpYWw/LmlkLFxuICAgIHByZXBhcmluZ0hpZGRlblN0b3BwZWRUcmFja3M6IHBlbmRpbmdUcmFja3MsXG4gICAgcHJlcGFyaW5nSGlkZGVuUHJlc2VydmVkTGF0ZXN0Q2FuZGlkYXRlOiBhZnRlclBlbmRpbmdDYW5jZWwuY2FuZGlkYXRlPy5pZCA9PT0gc2Vjb25kUGFydGlhbD8uaWQsXG4gICAgbm9ybWFsMTQ0MHg5MDA6IG5vcm1hbEJvdW5kcyxcbiAgICBzYXZlZDEyODB4NjAwOiBzaG9ydFNhdmVkQm91bmRzLFxuICAgIGFwaUNvdW50ZXJzOiBhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpLFxuICAgIHBoeXNpY2FsTWljcm9waG9uZU9yRGV2aWNlQmFja2dyb3VuZFRlc3RlZDogZmFsc2UsXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbnRlc3QoJ1JlY29yZCBzZWVrIGNhbmNlbGxhdGlvbiBhbmQgYmx1ciBrZWVwIGJvdGggYXVkaXRpb24gc291cmNlcyBwYXVzZWQnLCBhc3luYyAoeyBwYWdlIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDMwXzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJmxvY2FsZT1lbicpO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgd2FpdEZvclNhdmVkQ2FuZGlkYXRlKHBhZ2UsICdBJyk7XG4gIGNvbnN0IHNlZWsgPSBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtc2VlaycpO1xuICBjb25zdCB2aWRlbyA9IHBhZ2UubG9jYXRvcigndmlkZW8nKTtcbiAgY29uc3QgYXVkaW8gPSBwYWdlLmxvY2F0b3IoJ2F1ZGlvJyk7XG5cbiAgZm9yIChjb25zdCBzb3VyY2Ugb2YgWydPcmlnaW5hbCcsICdZb3VyIHRha2UnXSkge1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6IHNvdXJjZSwgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUGF1c2UnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGNvbnN0IGJvdW5kcyA9IGF3YWl0IHNlZWsuYm91bmRpbmdCb3goKTtcbiAgICBleHBlY3QoYm91bmRzKS5ub3QudG9CZU51bGwoKTtcbiAgICBhd2FpdCBwYWdlLm1vdXNlLm1vdmUoYm91bmRzIS54ICsgYm91bmRzIS53aWR0aCAqIDAuNCwgYm91bmRzIS55ICsgYm91bmRzIS5oZWlnaHQgLyAyKTtcbiAgICBhd2FpdCBwYWdlLm1vdXNlLmRvd24oKTtcbiAgICBhd2FpdCBzZWVrLmRpc3BhdGNoRXZlbnQoJ3BvaW50ZXJjYW5jZWwnLCB7IHBvaW50ZXJJZDogMSwgcG9pbnRlclR5cGU6ICdtb3VzZScgfSk7XG4gICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0V4aXQnLCBleGFjdDogdHJ1ZSB9KS5mb2N1cygpO1xuICAgIGF3YWl0IHBhZ2UubW91c2UudXAoKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiB2aWRlby5ldmFsdWF0ZSgoZWxlbWVudDogSFRNTFZpZGVvRWxlbWVudCkgPT4gZWxlbWVudC5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGlmIChzb3VyY2UgPT09ICdZb3VyIHRha2UnKSBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBhdWRpby5ldmFsdWF0ZSgoZWxlbWVudDogSFRNTEF1ZGlvRWxlbWVudCkgPT4gZWxlbWVudC5wYXVzZWQpKS50b0JlKHRydWUpO1xuICB9XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ09yaWdpbmFsJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1BhdXNlJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgc2Vlay5mb2N1cygpO1xuICBhd2FpdCBwYWdlLmtleWJvYXJkLmRvd24oJ0Fycm93UmlnaHQnKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0V4aXQnLCBleGFjdDogdHJ1ZSB9KS5mb2N1cygpO1xuICBhd2FpdCBwYWdlLmtleWJvYXJkLnVwKCdBcnJvd1JpZ2h0Jyk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHZpZGVvLmV2YWx1YXRlKChlbGVtZW50OiBIVE1MVmlkZW9FbGVtZW50KSA9PiBlbGVtZW50LnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMDYtcmVjb3JkLXNlZWstY2FuY2VsLWJsdXItcGF1c2VkLnBuZycpIH0pO1xufSk7XG5cbnRlc3QoJ3Bob25lIHJlY292ZXJ5IHRvYXN0IGV4cGlyeSBwcmVzZXJ2ZXMgdGhlIGRvY3VtZW50IGZsb29yIGFuZCBzY3JvbGwgcG9zaXRpb24nLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDIwXzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcgfSk7XG4gIGF3YWl0IHBhZ2UuYWRkSW5pdFNjcmlwdCgoKSA9PiB7ICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbiB9KS5fX2RlbnlNaWNyb3Bob25lID0gdHJ1ZTsgfSk7XG4gIGF3YWl0IGluc3RydW1lbnROYXRpdmVNZWRpYShwYWdlKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QSZsb2NhbGU9ZW4nKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGNvbnN0IHRvYXN0ID0gcGFnZS5sb2NhdG9yKCcucmVjb3ZlcnktdG9hc3QnKTtcbiAgYXdhaXQgZXhwZWN0KHRvYXN0KS50b0JlVmlzaWJsZSgpO1xuICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDQwMCk7XG4gIGNvbnN0IGJlZm9yZSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHtcbiAgICBzY3JvbGxZOiB3aW5kb3cuc2Nyb2xsWSxcbiAgICBtYXhTY3JvbGw6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgLSB3aW5kb3cuaW5uZXJIZWlnaHQsXG4gICAgc2Nyb2xsSGVpZ2h0OiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0LFxuICB9KSk7XG4gIGV4cGVjdChiZWZvcmUuc2Nyb2xsWSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdJUjA4LXBob25lLWRlbmllZC10b2FzdC1iZWZvcmUtZXhwaXJ5LnBuZycpIH0pO1xuICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDhfMzAwKTtcbiAgYXdhaXQgZXhwZWN0KHRvYXN0KS50b0hhdmVDb3VudCgwKTtcbiAgY29uc3QgYWZ0ZXIgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh7XG4gICAgc2Nyb2xsWTogd2luZG93LnNjcm9sbFksXG4gICAgbWF4U2Nyb2xsOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IC0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgIHNjcm9sbEhlaWdodDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCxcbiAgfSkpO1xuICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIwOC1waG9uZS10b2FzdC1leHBpcnktZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIGJlZm9yZSxcbiAgICBhZnRlcixcbiAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG4gIGV4cGVjdChhZnRlci5zY3JvbGxZKS50b0JlKGJlZm9yZS5zY3JvbGxZKTtcbiAgZXhwZWN0KGFmdGVyLm1heFNjcm9sbCkudG9CZShiZWZvcmUubWF4U2Nyb2xsKTtcbiAgZXhwZWN0KGFmdGVyLnNjcm9sbEhlaWdodCkudG9CZShiZWZvcmUuc2Nyb2xsSGVpZ2h0KTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ01pY3JvcGhvbmUgYWNjZXNzIHdhcyBkZW5pZWQgb3IgaW50ZXJydXB0ZWQuIFJlY29yZGluZyBkaWQgbm90IGJlZ2luJyk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMDgtcGhvbmUtZGVuaWVkLXRvYXN0LWFmdGVyLWV4cGlyeS5wbmcnKSB9KTtcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMDgtcGhvbmUtdG9hc3QtZXhwaXJ5LWV2aWRlbmNlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICBiZWZvcmUsXG4gICAgYWZ0ZXIsXG4gICAgZHVyYWJsZUd1aWRhbmNlUmV0YWluZWQ6IGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykuaXNWaXNpYmxlKCksXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbnRlc3QoJ2FwcHJvdmVkIGxvbmcgUnVzc2lhbiBsaW5lIGlzIHVzZWQgYXMgYW4gaXNvbGF0ZWQgc3RyZXNzIGZpeHR1cmUgaW4gQSBhbmQgQicsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICB0ZXN0LnNldFRpbWVvdXQoMzBfMDAwKTtcbiAgY29uc3QgbG9uZ1NlbnRlbmNlID0gJ9CvINC40YnRgyDRgtC+0LPQviwg0LrRgtC+INC80L3QtSDQvtGH0LXQvdGMINC00L7RgNC+0LMuINCc0Ysg0L/RgNC+0YjQu9C4INGC0LDQutC+0Lkg0LTQvtC70LPQuNC5INC/0YPRgtGMLCDQuCDRgtC10L/QtdGA0Ywg0Y8g0L3QtSDQvNC+0LPRgyDQv9C+0LLQtdGA0L3Rg9GC0Ywg0L3QsNC30LDQtC4nO1xuICBjb25zdCBtZWFzdXJlbWVudHM6IEFycmF5PFJlY29yZDxzdHJpbmcsIHVua25vd24+PiA9IFtdO1xuICBmb3IgKGNvbnN0IGxheW91dCBvZiBbJ0EnLCAnQiddIGFzIGNvbnN0KSB7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTI4MCwgaGVpZ2h0OiA2MDAgfSk7XG4gICAgYXdhaXQgcGFnZS5nb3RvKCcvJyk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLmhvbWUtcGFnZScpKS50b0JlVmlzaWJsZSgpO1xuICAgIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKHsgc2VsZWN0ZWRMYXlvdXQsIGZpeHR1cmVUZXh0IH0pID0+IHtcbiAgICAgIHR5cGUgUHJlcGFyZWRXaW5kb3cgPSB7IGlkOiBzdHJpbmc7IHRleHQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfTtcbiAgICAgIHR5cGUgUHJvamVjdHMgPSB7IGxvYWRQcmVwYXJlZFByb2plY3Q6ICguLi5hcmdzOiB1bmtub3duW10pID0+IFByb21pc2U8eyB3aW5kb3dzOiBQcmVwYXJlZFdpbmRvd1tdIH0gfCBudWxsPiB9O1xuICAgICAgdHlwZSBTZXJ2aWNlcyA9IHsgcHJvamVjdHM6IFByb2plY3RzIH07XG4gICAgICB0eXBlIEZpYmVyID0geyBhbHRlcm5hdGU/OiB1bmtub3duOyBjaGlsZD86IHVua25vd247IHNpYmxpbmc/OiB1bmtub3duOyBtZW1vaXplZFByb3BzPzogdW5rbm93biB9O1xuICAgICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdyb290JykgYXMgKEhUTUxFbGVtZW50ICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj4pIHwgbnVsbDtcbiAgICAgIGlmICghcm9vdCkgdGhyb3cgbmV3IEVycm9yKCdUaGUgUmVhY3Qgcm9vdCBpcyB1bmF2YWlsYWJsZSBmb3IgdGhlIGlzb2xhdGVkIHN0cmVzcyBmaXh0dXJlLicpO1xuICAgICAgY29uc3Qgcm9vdEtleSA9IE9iamVjdC5rZXlzKHJvb3QpLmZpbmQoKGtleSkgPT4ga2V5LnN0YXJ0c1dpdGgoJ19fcmVhY3RDb250YWluZXIkJykpO1xuICAgICAgaWYgKCFyb290S2V5KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBhY3RpdmUgUmVhY3Qgcm9vdCBmaWJlciBpcyB1bmF2YWlsYWJsZS4nKTtcbiAgICAgIGNvbnN0IHBlbmRpbmc6IHVua25vd25bXSA9IFtyb290W3Jvb3RLZXldXTtcbiAgICAgIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHVua25vd24+KCk7XG4gICAgICBsZXQgc2VydmljZXM6IFNlcnZpY2VzIHwgbnVsbCA9IG51bGw7XG4gICAgICB3aGlsZSAocGVuZGluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IGZpYmVyID0gcGVuZGluZy5wb3AoKSBhcyBGaWJlciB8IG51bGw7XG4gICAgICAgIGlmICghZmliZXIgfHwgc2Vlbi5oYXMoZmliZXIpKSBjb250aW51ZTtcbiAgICAgICAgc2Vlbi5hZGQoZmliZXIpO1xuICAgICAgICBpZiAoZmliZXIuYWx0ZXJuYXRlKSBwZW5kaW5nLnB1c2goZmliZXIuYWx0ZXJuYXRlKTtcbiAgICAgICAgY29uc3QgcHJvcHMgPSBmaWJlci5tZW1vaXplZFByb3BzIGFzIHsgc2VydmljZXM/OiBTZXJ2aWNlcyB9IHwgbnVsbDtcbiAgICAgICAgaWYgKHByb3BzPy5zZXJ2aWNlcz8ucHJvamVjdHMpIHNlcnZpY2VzID0gcHJvcHMuc2VydmljZXM7XG4gICAgICAgIGlmIChmaWJlci5jaGlsZCkgcGVuZGluZy5wdXNoKGZpYmVyLmNoaWxkKTtcbiAgICAgICAgaWYgKGZpYmVyLnNpYmxpbmcpIHBlbmRpbmcucHVzaChmaWJlci5zaWJsaW5nKTtcbiAgICAgIH1cbiAgICAgIGlmICghc2VydmljZXMpIHRocm93IG5ldyBFcnJvcignVGhlIGFjdGl2ZSB0eXBlZCBwcm9qZWN0IHJlYWRlciB3YXMgbm90IGZvdW5kLicpO1xuICAgICAgY29uc3Qgb3JpZ2luYWxMb2FkID0gc2VydmljZXMucHJvamVjdHMubG9hZFByZXBhcmVkUHJvamVjdC5iaW5kKHNlcnZpY2VzLnByb2plY3RzKTtcbiAgICAgIHNlcnZpY2VzLnByb2plY3RzLmxvYWRQcmVwYXJlZFByb2plY3QgPSBhc3luYyAoLi4uYXJncykgPT4ge1xuICAgICAgICBjb25zdCBwcm9qZWN0ID0gYXdhaXQgb3JpZ2luYWxMb2FkKC4uLmFyZ3MpO1xuICAgICAgICByZXR1cm4gcHJvamVjdCA/IHtcbiAgICAgICAgICAuLi5wcm9qZWN0LFxuICAgICAgICAgIHdpbmRvd3M6IHByb2plY3Qud2luZG93cy5tYXAoKHdpbmRvdykgPT4gd2luZG93LmlkID09PSAnc2ludGVsLXR1cm4tMydcbiAgICAgICAgICAgID8geyAuLi53aW5kb3csIHRleHQ6IHsgLi4ud2luZG93LnRleHQsIHJ1OiBmaXh0dXJlVGV4dCB9IH1cbiAgICAgICAgICAgIDogd2luZG93KSxcbiAgICAgICAgfSA6IG51bGw7XG4gICAgICB9O1xuICAgICAgaGlzdG9yeS5wdXNoU3RhdGUoe30sICcnLCBgL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PSR7c2VsZWN0ZWRMYXlvdXR9JmxvY2FsZT1ydSZ0dXJuPXNpbnRlbC10dXJuLTNgKTtcbiAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBQb3BTdGF0ZUV2ZW50KCdwb3BzdGF0ZScpKTtcbiAgICB9LCB7IHNlbGVjdGVkTGF5b3V0OiBsYXlvdXQsIGZpeHR1cmVUZXh0OiBsb25nU2VudGVuY2UgfSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICfQl9Cw0L/QuNGB0LDRgtGMJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLmRpYWxvZ3VlLWNvcHkgcCcpKS50b0hhdmVUZXh0KGxvbmdTZW50ZW5jZSk7XG4gICAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5mb250cy5yZWFkeSk7XG5cbiAgICBmb3IgKGNvbnN0IHZpZXdwb3J0IG9mIFt7IHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDYwMCB9LCB7IHdpZHRoOiAxMzY2LCBoZWlnaHQ6IDY1MCB9LCB7IHdpZHRoOiAzOTAsIGhlaWdodDogNjY3IH1dKSB7XG4gICAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh2aWV3cG9ydCk7XG4gICAgICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDE1MCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICAgICAgY29uc3QgYm91bmRzID0gKHNlbGVjdG9yOiBzdHJpbmcpID0+IHtcbiAgICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgICAgaWYgKCFlbGVtZW50KSByZXR1cm4gbnVsbDtcbiAgICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgICByZXR1cm4geyB4OiByZWN0LngsIHk6IHJlY3QueSwgd2lkdGg6IHJlY3Qud2lkdGgsIGhlaWdodDogcmVjdC5oZWlnaHQsIGJvdHRvbTogcmVjdC5ib3R0b20gfTtcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB2aWV3cG9ydDogeyB3aWR0aDogaW5uZXJXaWR0aCwgaGVpZ2h0OiBpbm5lckhlaWdodCB9LFxuICAgICAgICAgIHRleHQ6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kaWFsb2d1ZS1jb3B5IHAnKT8udGV4dENvbnRlbnQsXG4gICAgICAgICAgbWVkaWE6IGJvdW5kcygnLm1lZGlhLXZpZXdwb3J0JyksXG4gICAgICAgICAgcGFuZWw6IGJvdW5kcygnLnJlY29yZC1wYW5lbCcpLFxuICAgICAgICAgIGRpYWxvZ3VlOiBib3VuZHMoJy5kaWFsb2d1ZS1jb3B5JyksXG4gICAgICAgICAgd2F2ZTogYm91bmRzKCcud2F2ZWZvcm0tcm93JyksXG4gICAgICAgICAgZG9jdW1lbnRIZWlnaHQ6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQsXG4gICAgICAgICAgaG9yaXpvbnRhbE92ZXJmbG93OiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGggPiBpbm5lcldpZHRoLFxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgICBleHBlY3QocmVzdWx0LnRleHQpLnRvQmUobG9uZ1NlbnRlbmNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuaG9yaXpvbnRhbE92ZXJmbG93KS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZGlhbG9ndWU/LmJvdHRvbSA/PyBJbmZpbml0eSkudG9CZUxlc3NUaGFuT3JFcXVhbChyZXN1bHQud2F2ZT8ueSA/PyAtSW5maW5pdHkpO1xuICAgICAgaWYgKGxheW91dCA9PT0gJ0EnICYmIHZpZXdwb3J0LndpZHRoID49IDEyNDgpIGV4cGVjdChNYXRoLmFicygocmVzdWx0LnBhbmVsPy55ID8/IC05OTkpIC0gKHJlc3VsdC5tZWRpYT8ueSA/PyAtMTAwMCkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgICAgbWVhc3VyZW1lbnRzLnB1c2goeyBsYXlvdXQsIC4uLnJlc3VsdCB9KTtcbiAgICAgIGNvbnN0IG5hbWUgPSBgcnUtbG9uZy0ke2xheW91dH0tJHt2aWV3cG9ydC53aWR0aH14JHt2aWV3cG9ydC5oZWlnaHR9LnBuZ2A7XG4gICAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIG5hbWUpLCBmdWxsUGFnZTogdmlld3BvcnQud2lkdGggPCA1MDAgfSk7XG4gICAgfVxuICB9XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdydS1sb25nLXN0cmVzcy1maXh0dXJlLWV2aWRlbmNlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICBzZW50ZW5jZTogbG9uZ1NlbnRlbmNlLFxuICAgIHNvdXJjZTogJ2lzb2xhdGVkIGluLW1lbW9yeSByZWFkLXBvcnQgb3ZlcnJpZGUgZm9yIHNpbnRlbC10dXJuLTM7IHByb2R1Y3Rpb24gc2VlZCB0ZXh0IHVuY2hhbmdlZCcsXG4gICAgbWVhc3VyZW1lbnRzLFxuICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbn0pO1xuIl0sIm1hcHBpbmdzIjoiO0FBQUEsU0FBU0EsS0FBSyxFQUFFQyxRQUFRLEVBQUVDLFNBQVMsUUFBUSxrQkFBa0I7QUFDN0QsU0FBU0MsVUFBVSxRQUFRLGFBQWE7QUFDeEMsT0FBT0MsSUFBSSxNQUFNLFdBQVc7QUFDNUIsU0FBU0MsSUFBSSxFQUFFQyxNQUFNLFFBQW1CLGtCQUFrQjtBQUUxRCxNQUFNQyxpQkFBaUIsR0FBR0gsSUFBSSxDQUFDSSxPQUFPLENBQ3BDQyxPQUFPLENBQUNDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsMkNBQTJDLEVBQ3JGLEdBQUcsRUFBQUMscUJBQUEsR0FBQ0YsT0FBTyxDQUFDRyxHQUFHLENBQUNDLHdCQUF3QixjQUFBRixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLFFBQVEsRUFBRUcsS0FBSyxDQUFDLFFBQVEsQ0FDdEUsQ0FBQztBQUVELGVBQWVDLGVBQWVBLENBQUNDLElBQVUsRUFBRUMsTUFBbUIsRUFBRTtFQUM5RCxNQUFNQyxHQUFHLEdBQUcsSUFBSUMsR0FBRyxDQUFDSCxJQUFJLENBQUNFLEdBQUcsQ0FBQyxDQUFDLENBQUM7RUFDL0JBLEdBQUcsQ0FBQ0UsWUFBWSxDQUFDQyxHQUFHLENBQUMsUUFBUSxFQUFFSixNQUFNLENBQUM7RUFDdEMsTUFBTUQsSUFBSSxDQUFDTSxJQUFJLENBQUMsR0FBR0osR0FBRyxDQUFDSyxRQUFRLEdBQUdMLEdBQUcsQ0FBQ00sTUFBTSxFQUFFLENBQUM7QUFDakQ7QUFFQSxlQUFlQyxxQkFBcUJBLENBQUNULElBQVUsRUFBRTtFQUMvQyxNQUFNQSxJQUFJLENBQUNVLGFBQWEsQ0FBQyxNQUFNO0lBQzdCLE1BQU1DLE1BQU0sR0FBR0MsTUFJZDtJQUNERCxNQUFNLENBQUNFLHNCQUFzQixHQUFHO01BQUVDLGlCQUFpQixFQUFFLENBQUM7TUFBRUMsY0FBYyxFQUFFO0lBQUUsQ0FBQztJQUMzRSxJQUFJO01BQ0YsTUFBTUMsYUFBYSxHQUFHQyxjQUFjLENBQUNDLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQztNQUNsRixJQUFJRixhQUFhLEVBQUVMLE1BQU0sQ0FBQ0Usc0JBQXNCLEdBQUdNLElBQUksQ0FBQ0MsS0FBSyxDQUFDSixhQUFhLENBQXNEO0lBQ25JLENBQUMsQ0FBQyxNQUFNLENBQUU7SUFDVixNQUFNSyxxQkFBcUIsR0FBR0EsQ0FBQSxLQUFNO01BQ2xDLElBQUk7UUFBRUosY0FBYyxDQUFDSyxPQUFPLENBQUMsb0NBQW9DLEVBQUVILElBQUksQ0FBQ0ksU0FBUyxDQUFDWixNQUFNLENBQUNFLHNCQUFzQixDQUFDLENBQUM7TUFBRSxDQUFDLENBQ3BILE1BQU0sQ0FBRTtJQUNWLENBQUM7SUFDREYsTUFBTSxDQUFDYSxjQUFjLEdBQUc7TUFBRUMsUUFBUSxFQUFFLEVBQUU7TUFBRUMsU0FBUyxFQUFFO0lBQUcsQ0FBQztJQUN2RCxNQUFNQyxXQUFXLEdBQUdDLFNBQVMsQ0FBQ0MsS0FBSztJQUNuQyxNQUFNQyxlQUFlLEdBQUdILFdBQVcsQ0FBQ0ksT0FBTyxDQUFDQyxJQUFJLENBQUNMLFdBQVcsQ0FBQztJQUM3RE0sTUFBTSxDQUFDQyxjQUFjLENBQUNQLFdBQVcsRUFBRSxTQUFTLEVBQUU7TUFDNUNRLFlBQVksRUFBRSxJQUFJO01BQ2xCQyxLQUFLLEVBQUVBLENBQUNDLElBQVksRUFBRUMsT0FBb0IsRUFBRUMsUUFBMkQsS0FBSztRQUMxRzVCLE1BQU0sQ0FBQ2EsY0FBYyxDQUFFQyxRQUFRLENBQUNlLElBQUksQ0FBQ0gsSUFBSSxDQUFDO1FBQzFDLE9BQU9QLGVBQWUsQ0FBQ08sSUFBSSxFQUFFQyxPQUFPLEVBQUdHLElBQUksSUFBSztVQUM5QzlCLE1BQU0sQ0FBQ2EsY0FBYyxDQUFFRSxTQUFTLENBQUNjLElBQUksQ0FBQ0MsSUFBSSxHQUFHLFVBQVUsR0FBRyxNQUFNLENBQUM7VUFDakUsT0FBT0YsUUFBUSxDQUFDRSxJQUFJLENBQUM7UUFDdkIsQ0FBQyxDQUFDO01BQ0o7SUFDRixDQUFDLENBQUM7SUFDRixNQUFNQyxZQUFZLEdBQUdkLFNBQVMsQ0FBQ2MsWUFBWTtJQUMzQyxJQUFJQSxZQUFZLEVBQUU7TUFDaEIsTUFBTUMsWUFBWSxHQUFHRCxZQUFZLENBQUNDLFlBQVksQ0FBQ1gsSUFBSSxDQUFDVSxZQUFZLENBQUM7TUFDakVBLFlBQVksQ0FBQ0MsWUFBWSxHQUFHLENBQUMsR0FBR0MsSUFBOEMsS0FBSztRQUNqRmpDLE1BQU0sQ0FBQ0Usc0JBQXNCLENBQUVDLGlCQUFpQixJQUFJLENBQUM7UUFDckRPLHFCQUFxQixDQUFDLENBQUM7UUFDdkIsSUFBSVYsTUFBTSxDQUFDa0MsZ0JBQWdCLEVBQUUsT0FBT0MsT0FBTyxDQUFDQyxNQUFNLENBQUMsSUFBSUMsWUFBWSxDQUFDLG1EQUFtRCxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDNUksT0FBT0wsWUFBWSxDQUFDLEdBQUdDLElBQUksQ0FBQztNQUM5QixDQUFDO0lBQ0g7SUFDQSxJQUFJaEMsTUFBTSxDQUFDcUMsYUFBYSxFQUFFO01BQ3hCLE1BQU1DLEtBQUssR0FBR0QsYUFBYSxDQUFDRSxTQUFTLENBQUNELEtBQUs7TUFDM0NELGFBQWEsQ0FBQ0UsU0FBUyxDQUFDRCxLQUFLLEdBQUcsVUFBVSxHQUFHTixJQUF3QyxFQUFFO1FBQ3JGakMsTUFBTSxDQUFDRSxzQkFBc0IsQ0FBRUUsY0FBYyxJQUFJLENBQUM7UUFDbERNLHFCQUFxQixDQUFDLENBQUM7UUFDdkIsT0FBTzZCLEtBQUssQ0FBQ0UsS0FBSyxDQUFDLElBQUksRUFBRVIsSUFBSSxDQUFDO01BQ2hDLENBQUM7SUFDSDtFQUNGLENBQUMsQ0FBQztBQUNKO0FBRUEsZUFBZVMsZ0JBQWdCQSxDQUFDckQsSUFBVSxFQUFFO0VBQzFDLE9BQU9BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUEyR0Msc0JBQXNCLENBQUM7QUFDdEs7QUFFQSxlQUFlMEMsbUJBQW1CQSxDQUFDdkQsSUFBVSxFQUFFd0QsSUFBOEMsRUFBRTtFQUM3RixNQUFNeEQsSUFBSSxDQUFDc0QsUUFBUSxDQUFFRyxTQUFTLElBQUs7SUFNakMsTUFBTUMsSUFBSSxHQUFHQyxRQUFRLENBQUNDLGNBQWMsQ0FBQyxNQUFNLENBQW1EO0lBQzlGLElBQUksQ0FBQ0YsSUFBSSxFQUFFLE1BQU0sSUFBSUcsS0FBSyxDQUFDLGdDQUFnQyxDQUFDO0lBQzVELE1BQU1DLE9BQU8sR0FBRzdCLE1BQU0sQ0FBQzhCLElBQUksQ0FBQ0wsSUFBSSxDQUFDLENBQUNNLElBQUksQ0FBRUMsR0FBRyxJQUFLQSxHQUFHLENBQUNDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0lBQ3BGLElBQUksQ0FBQ0osT0FBTyxFQUFFLE1BQU0sSUFBSUQsS0FBSyxDQUFDLHNDQUFzQyxDQUFDO0lBQ3JFLE1BQU1NLE9BQWtCLEdBQUcsQ0FBQ1QsSUFBSSxDQUFDSSxPQUFPLENBQUMsQ0FBQztJQUMxQyxJQUFJTSxLQUEwQixHQUFHLElBQUk7SUFDckMsT0FBT0QsT0FBTyxDQUFDRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BQUEsSUFBQUMsZUFBQTtNQUN6QixNQUFNQyxLQUFLLEdBQUdKLE9BQU8sQ0FBQ0ssR0FBRyxDQUFDLENBQWlCO01BQzNDLElBQUksQ0FBQ0QsS0FBSyxFQUFFO01BQ1osTUFBTUUsS0FBSyxHQUFHRixLQUFLLENBQUNHLGFBQWtFO01BQ3RGLElBQUlELEtBQUssYUFBTEEsS0FBSyxnQkFBQUgsZUFBQSxHQUFMRyxLQUFLLENBQUVFLFFBQVEsY0FBQUwsZUFBQSxlQUFmQSxlQUFBLENBQWlCTSxRQUFRLEVBQUVSLEtBQUssR0FBR0ssS0FBSyxDQUFDRSxRQUFRLENBQUNDLFFBQVE7TUFDOUQsSUFBSUwsS0FBSyxDQUFDTSxLQUFLLEVBQUVWLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ00sS0FBSyxDQUFDO01BQzFDLElBQUlOLEtBQUssQ0FBQ08sT0FBTyxFQUFFWCxPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNPLE9BQU8sQ0FBQztJQUNoRDtJQUNBLElBQUksQ0FBQ1YsS0FBSyxFQUFFLE1BQU0sSUFBSVAsS0FBSyxDQUFDLHNFQUFzRSxDQUFDO0lBQ25HLE1BQU1rQixZQUFZLEdBQUdYLEtBQUssQ0FBQ1ksYUFBYSxDQUFDaEQsSUFBSSxDQUFDb0MsS0FBSyxDQUFDO0lBQ3BELE1BQU1hLGNBQWMsR0FBR2IsS0FBSyxDQUFDYyxlQUFlLENBQUNsRCxJQUFJLENBQUNvQyxLQUFLLENBQUM7SUFDeEQsTUFBTWUsS0FBSyxHQUFHO01BQUVDLFNBQVMsRUFBRSxDQUFDO01BQUVDLFdBQVcsRUFBRSxDQUFDO01BQUVDLFlBQVksRUFBRSxFQUFjO01BQUVDLFNBQVMsRUFBRSxFQUFjO01BQUVDLGFBQWEsRUFBRTtJQUF1QixDQUFDO0lBQzdJNUUsTUFBTSxDQUFxRDZFLG1CQUFtQixHQUFHTixLQUFLO0lBQ3ZGLElBQUlPLGlCQUFpQixHQUFHLElBQUk7SUFDNUIsSUFBSUMsVUFBdUIsR0FBRyxJQUFJO0lBQ2xDdkIsS0FBSyxDQUFDWSxhQUFhLEdBQUcsTUFBT2pELE9BQU8sSUFBSztNQUN2Q29ELEtBQUssQ0FBQ0MsU0FBUyxJQUFJLENBQUM7TUFDcEJELEtBQUssQ0FBQ0csWUFBWSxDQUFDOUMsSUFBSSxDQUFDVCxPQUFPLENBQUM2RCxXQUFXLENBQUM7TUFDNUNULEtBQUssQ0FBQ0ksU0FBUyxDQUFDL0MsSUFBSSxDQUFDVCxPQUFPLENBQUM4RCxPQUFPLENBQUNDLElBQUksQ0FBQ0MsSUFBSSxDQUFDO01BQy9DLElBQUl0QyxTQUFTLEtBQUssZUFBZSxJQUFJaUMsaUJBQWlCLEVBQUU7UUFDdERBLGlCQUFpQixHQUFHLEtBQUs7UUFDekJDLFVBQVUsR0FBRzVELE9BQU8sQ0FBQzhELE9BQU8sQ0FBQ0MsSUFBSTtRQUNqQyxNQUFNLElBQUk5QyxZQUFZLENBQUMsd0RBQXdELEVBQUUsb0JBQW9CLENBQUM7TUFDeEc7TUFDQSxJQUFJUyxTQUFTLEtBQUssZUFBZSxJQUFJa0MsVUFBVSxFQUFFUixLQUFLLENBQUNLLGFBQWEsR0FBR0csVUFBVSxLQUFLNUQsT0FBTyxDQUFDOEQsT0FBTyxDQUFDQyxJQUFJO01BQzFHLE1BQU1FLFNBQVMsR0FBRyxNQUFNakIsWUFBWSxDQUFDaEQsT0FBTyxDQUFDO01BQzdDLE9BQU8wQixTQUFTLEtBQUssc0JBQXNCLEdBQ3ZDO1FBQUV3QyxJQUFJLEVBQUUsU0FBUztRQUFFTCxXQUFXLEVBQUU3RCxPQUFPLENBQUM2RCxXQUFXO1FBQUVNLE1BQU0sRUFBRTtNQUF3RCxDQUFDLEdBQ3RIRixTQUFTO0lBQ2YsQ0FBQztJQUNENUIsS0FBSyxDQUFDYyxlQUFlLEdBQUcsT0FBTyxHQUFHdEMsSUFBSSxLQUFLO01BQ3pDdUMsS0FBSyxDQUFDRSxXQUFXLElBQUksQ0FBQztNQUN0QixJQUFJNUIsU0FBUyxLQUFLLHNCQUFzQixJQUFJMEIsS0FBSyxDQUFDRSxXQUFXLEtBQUssQ0FBQyxFQUFFO1FBQ25FLE9BQU87VUFBRVksSUFBSSxFQUFFLFNBQVM7VUFBRUwsV0FBVyxFQUFFTyxNQUFNLENBQUN2RCxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQUUsQ0FBQztNQUMxRDtNQUNBLE9BQU9xQyxjQUFjLENBQUMsR0FBR3JDLElBQUksQ0FBQztJQUNoQyxDQUFDO0VBQ0gsQ0FBQyxFQUFFWSxJQUFJLENBQUM7QUFDVjtBQUVBLGVBQWU0Qyx3QkFBd0JBLENBQUNwRyxJQUFVLEVBQUU7RUFDbEQsTUFBTUEsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7SUFDOUIsTUFBTStDLG1CQUFtQixHQUFHQyxXQUFXLENBQUNuRCxTQUFTLENBQUNvRCxXQUFXO0lBQzdELE1BQU1wQixLQUFLLEdBQUc7TUFBRXFCLEtBQUssRUFBRSxDQUFDO01BQUVDLE1BQU0sRUFBRSxFQUFjO01BQUVDLE9BQU8sRUFBRUEsQ0FBQSxLQUFNQztJQUFVLENBQUM7SUFDM0UvRixNQUFNLENBQXNEZ0csb0JBQW9CLEdBQUd6QixLQUFLO0lBQ3pGbUIsV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVyxHQUFHLFVBQVVNLFVBQVUsRUFBRXJELElBQUksRUFBRWxCLE9BQU8sRUFBRTtNQUN2RSxNQUFNbUUsTUFBTSxHQUFHLE9BQU9JLFVBQVUsS0FBSyxRQUFRLEdBQUcsQ0FBQ0EsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHQSxVQUFVLENBQUM7TUFDOUUsSUFBSTFCLEtBQUssQ0FBQ3FCLEtBQUssS0FBSyxDQUFDLElBQUloRCxJQUFJLEtBQUssV0FBVyxJQUFJaUQsTUFBTSxDQUFDSyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDOUUzQixLQUFLLENBQUNxQixLQUFLLElBQUksQ0FBQztRQUNoQnJCLEtBQUssQ0FBQ3NCLE1BQU0sR0FBR0EsTUFBTTtRQUNyQixNQUFNLElBQUl6RCxZQUFZLENBQUMsMkNBQTJDLEVBQUUsb0JBQW9CLENBQUM7TUFDM0Y7TUFDQSxPQUFPcUQsbUJBQW1CLENBQUNVLElBQUksQ0FBQyxJQUFJLEVBQUVGLFVBQVUsRUFBRXJELElBQUksRUFBRWxCLE9BQU8sQ0FBQztJQUNsRSxDQUFDO0lBQ0Q2QyxLQUFLLENBQUN1QixPQUFPLEdBQUcsTUFBTTtNQUFFSixXQUFXLENBQUNuRCxTQUFTLENBQUNvRCxXQUFXLEdBQUdGLG1CQUFtQjtJQUFFLENBQUM7RUFDcEYsQ0FBQyxDQUFDO0FBQ0o7QUFFQSxlQUFlVyxnQ0FBZ0NBLENBQUNoSCxJQUFVLEVBQUU7RUFDMUQsTUFBTUEsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU07SUFDeEIsTUFBTTJELFFBQVEsR0FBR1gsV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVztJQUNsRCxNQUFNcEIsS0FBSyxHQUFHO01BQUVxQixLQUFLLEVBQUUsQ0FBQztNQUFFQyxNQUFNLEVBQUU7SUFBZSxDQUFDO0lBQ2xELE1BQU05RixNQUFNLEdBQUdDLE1BR2Q7SUFDREQsTUFBTSxDQUFDdUcsdUJBQXVCLEdBQUcvQixLQUFLO0lBQ3RDbUIsV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVyxHQUFHLFVBQVVNLFVBQVUsRUFBRXJELElBQUksRUFBRWxCLE9BQU8sRUFBRTtNQUN2RSxNQUFNbUUsTUFBTSxHQUFHLE9BQU9JLFVBQVUsS0FBSyxRQUFRLEdBQUcsQ0FBQ0EsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHQSxVQUFVLENBQUM7TUFDOUUsSUFBSTFCLEtBQUssQ0FBQ3FCLEtBQUssS0FBSyxDQUFDLElBQUloRCxJQUFJLEtBQUssV0FBVyxJQUFJaUQsTUFBTSxDQUFDSyxRQUFRLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDOUUzQixLQUFLLENBQUNxQixLQUFLLElBQUksQ0FBQztRQUNoQnJCLEtBQUssQ0FBQ3NCLE1BQU0sR0FBR0EsTUFBTTtRQUNyQixNQUFNLElBQUl6RCxZQUFZLENBQUMsMENBQTBDLEVBQUUsb0JBQW9CLENBQUM7TUFDMUY7TUFDQSxPQUFPaUUsUUFBUSxDQUFDRixJQUFJLENBQUMsSUFBSSxFQUFFRixVQUFVLEVBQUVyRCxJQUFJLEVBQUVsQixPQUFPLENBQUM7SUFDdkQsQ0FBQztJQUNEM0IsTUFBTSxDQUFDd0csOEJBQThCLEdBQUcsTUFBTTtNQUFFYixXQUFXLENBQUNuRCxTQUFTLENBQUNvRCxXQUFXLEdBQUdVLFFBQVE7SUFBRSxDQUFDO0VBQ2pHLENBQUMsQ0FBQztBQUNKO0FBRUEsZUFBZUcseUJBQXlCQSxDQUFDcEgsSUFBVSxFQUFFO0VBQ25ELE1BQU1BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBQ3hCLE1BQU02QixLQUFLLEdBQUc7TUFBRWtDLFFBQVEsRUFBRSxDQUFDO01BQUVDLFFBQVEsRUFBRSxDQUFDO01BQUVDLFFBQVEsRUFBRSxFQUFFO01BQUVDLE1BQU0sRUFBRTtJQUFzQixDQUFDO0lBQ3RGNUcsTUFBTSxDQUF5RDZHLHVCQUF1QixHQUFHdEMsS0FBSztJQUMvRixNQUFNaEMsU0FBUyxHQUFHRixhQUFhLENBQUNFLFNBQVM7SUFDekMsTUFBTUQsS0FBSyxHQUFHQyxTQUFTLENBQUNELEtBQUs7SUFDN0JDLFNBQVMsQ0FBQ0QsS0FBSyxHQUFHLFVBQVUsR0FBR04sSUFBd0MsRUFBRTtNQUN2RSxNQUFNOEUsTUFBa0IsR0FBRyxFQUFFO01BQzdCLElBQUksQ0FBQ0MsZ0JBQWdCLENBQUMsZUFBZSxFQUFHQyxLQUFLLElBQUs7UUFBRSxJQUFJQSxLQUFLLENBQUNDLElBQUksQ0FBQzlCLElBQUksR0FBRyxDQUFDLEVBQUUyQixNQUFNLENBQUNsRixJQUFJLENBQUNvRixLQUFLLENBQUNDLElBQUksQ0FBQztNQUFFLENBQUMsQ0FBQztNQUN4RyxJQUFJLENBQUNGLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxNQUFNO1FBQ2xDLE1BQU03QixJQUFJLEdBQUcsSUFBSWdDLElBQUksQ0FBQ0osTUFBTSxFQUFFO1VBQUVLLElBQUksRUFBRSxJQUFJLENBQUNSO1FBQVMsQ0FBQyxDQUFDO1FBQ3REcEMsS0FBSyxDQUFDa0MsUUFBUSxJQUFJLENBQUM7UUFDbkJsQyxLQUFLLENBQUNtQyxRQUFRLEdBQUd4QixJQUFJLENBQUNDLElBQUk7UUFDMUJaLEtBQUssQ0FBQ29DLFFBQVEsR0FBR3pCLElBQUksQ0FBQ2lDLElBQUk7UUFDMUIsS0FBS2pDLElBQUksQ0FBQ2tDLFdBQVcsQ0FBQyxDQUFDLENBQUNDLElBQUksQ0FBRUMsS0FBSyxJQUFLQyxNQUFNLENBQUNDLE1BQU0sQ0FBQ0MsTUFBTSxDQUFDLFNBQVMsRUFBRUgsS0FBSyxDQUFDLENBQUMsQ0FBQ0QsSUFBSSxDQUFFSSxNQUFNLElBQUs7VUFDL0ZsRCxLQUFLLENBQUNxQyxNQUFNLEdBQUdjLEtBQUssQ0FBQ0MsSUFBSSxDQUFDLElBQUlDLFVBQVUsQ0FBQ0gsTUFBTSxDQUFDLEVBQUdJLElBQUksSUFBS0EsSUFBSSxDQUFDQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUNDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQ0MsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUMxRyxDQUFDLENBQUM7TUFDSixDQUFDLEVBQUU7UUFBRUMsSUFBSSxFQUFFO01BQUssQ0FBQyxDQUFDO01BQ2xCLE9BQU8zRixLQUFLLENBQUNFLEtBQUssQ0FBQyxJQUFJLEVBQUVSLElBQUksQ0FBQztJQUNoQyxDQUFDO0VBQ0gsQ0FBQyxDQUFDO0FBQ0o7QUFFQSxlQUFla0csaUJBQWlCQSxDQUFDOUksSUFBVSxFQUFFO0VBQzNDLE9BQU9BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUUvQjZFLG1CQUFtQixDQUFDO0FBQ3pCO0FBRUEsZUFBZXNELGFBQWFBLENBQUMvSSxJQUFVLEVBQUU7RUFDdkMsT0FBT0EsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7SUFDL0IsTUFBTTBGLFFBQVEsR0FBRyxNQUFNLElBQUlsRyxPQUFPLENBQWMsQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztNQUNuRSxNQUFNaEIsT0FBTyxHQUFHa0gsU0FBUyxDQUFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7TUFDdERuSCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQU0sQ0FBQztNQUNqRHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGLE1BQU1DLElBQUksR0FBR0EsQ0FBSUMsU0FBaUIsRUFBRXZGLEdBQWlCLEtBQUssSUFBSW5CLE9BQU8sQ0FBSSxDQUFDdEQsT0FBTyxFQUFFdUQsTUFBTSxLQUFLO01BQzVGLE1BQU13RCxXQUFXLEdBQUd5QyxRQUFRLENBQUN6QyxXQUFXLENBQUNpRCxTQUFTLEVBQUUsVUFBVSxDQUFDO01BQy9ELE1BQU16SCxPQUFPLEdBQUdrQyxHQUFHLEtBQUswQyxTQUFTLEdBQUdKLFdBQVcsQ0FBQ2tELFdBQVcsQ0FBQ0QsU0FBUyxDQUFDLENBQUNFLE1BQU0sQ0FBQyxDQUFDLEdBQUduRCxXQUFXLENBQUNrRCxXQUFXLENBQUNELFNBQVMsQ0FBQyxDQUFDRyxHQUFHLENBQUMxRixHQUFHLENBQUM7TUFDN0hsQyxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQVcsQ0FBQztNQUN0RHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGLE1BQU1NLE9BQU8sR0FBRyxNQUFNTCxJQUFJLENBQTBCLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQztJQUNsRixNQUFNTSxLQUFLLEdBQUcsTUFBTU4sSUFBSSxDQUFpQyxPQUFPLENBQUM7SUFDakUsTUFBTU8sVUFBVSxHQUFHLE1BQU1QLElBQUksQ0FBaUMsWUFBWSxDQUFDO0lBQzNFLE1BQU1RLFNBQVMsR0FBRyxNQUFNUixJQUFJLENBQWlDLFdBQVcsQ0FBQztJQUN6RVAsUUFBUSxDQUFDZ0IsS0FBSyxDQUFDLENBQUM7SUFDaEIsT0FBTztNQUNMSixPQUFPLEVBQUVBLE9BQU8sR0FBRztRQUNqQkssUUFBUSxFQUFFTCxPQUFPLENBQUNLLFFBQVE7UUFDMUJDLG9CQUFvQixFQUFFTixPQUFPLENBQUNNLG9CQUFvQjtRQUNsREMsY0FBYyxFQUFFUCxPQUFPLENBQUNPLGNBQWM7UUFDdENDLHVCQUF1QixFQUFFUixPQUFPLENBQUNRLHVCQUF1QjtRQUN4REMsc0JBQXNCLEVBQUVULE9BQU8sQ0FBQ1Msc0JBQXNCO1FBQ3REQyxZQUFZLEVBQUVWLE9BQU8sQ0FBQ1U7TUFDeEIsQ0FBQyxHQUFHLElBQUk7TUFDUlQsS0FBSyxFQUFFQSxLQUFLLENBQUNVLEdBQUcsQ0FBRUMsU0FBUztRQUFBLElBQUFDLEtBQUEsRUFBQUMsZUFBQTtRQUFBLE9BQU07VUFDL0JDLEVBQUUsRUFBRUgsU0FBUyxDQUFDRyxFQUFFO1VBQ2hCQyxPQUFPLEVBQUVKLFNBQVMsQ0FBQ0ksT0FBTztVQUMxQkMsTUFBTSxFQUFFTCxTQUFTLENBQUNLLE1BQU07VUFDeEJ2RCxRQUFRLEVBQUVrRCxTQUFTLENBQUNsRCxRQUFRO1VBQzVCRSxNQUFNLEVBQUVnRCxTQUFTLENBQUNoRCxNQUFNO1VBQ3hCRCxRQUFRLEVBQUVpRCxTQUFTLENBQUNqRCxRQUFRO1VBQzVCdUQsU0FBUyxFQUFFTixTQUFTLENBQUNNLFNBQVM7VUFDOUJDLEtBQUssRUFBRVAsU0FBUyxDQUFDTyxLQUFLO1VBQ3RCQyxRQUFRLEdBQUFQLEtBQUEsSUFBQUMsZUFBQSxHQUFHRixTQUFTLENBQUMxRSxJQUFJLGNBQUE0RSxlQUFBLHVCQUFmQSxlQUFBLENBQXNDM0UsSUFBSSxjQUFBMEUsS0FBQSxjQUFBQSxLQUFBLEdBQUk7UUFDMUQsQ0FBQztNQUFBLENBQUMsQ0FBQztNQUNIWCxVQUFVLEVBQUVBLFVBQVUsQ0FBQ1MsR0FBRyxDQUFFVSxTQUFTLEtBQU07UUFDekNOLEVBQUUsRUFBRU0sU0FBUyxDQUFDTixFQUFFO1FBQ2hCMUUsSUFBSSxFQUFFZ0YsU0FBUyxDQUFDaEYsSUFBSTtRQUNwQmlGLEtBQUssRUFBRUQsU0FBUyxDQUFDQyxLQUFLO1FBQ3RCTCxNQUFNLEVBQUVJLFNBQVMsQ0FBQ0osTUFBTTtRQUN4Qk0sZUFBZSxFQUFFRixTQUFTLENBQUNFLGVBQWU7UUFDMUNDLFVBQVUsRUFBRUgsU0FBUyxDQUFDRyxVQUFVO1FBQ2hDQyxnQkFBZ0IsRUFBRUosU0FBUyxDQUFDSSxnQkFBZ0I7UUFDNUNDLG1CQUFtQixFQUFFTCxTQUFTLENBQUNLLG1CQUFtQjtRQUNsRDlELE1BQU0sRUFBRXlELFNBQVMsQ0FBQ3pEO01BQ3BCLENBQUMsQ0FBQyxDQUFDO01BQ0h1QyxTQUFTLEVBQUVBLFNBQVMsQ0FBQ1EsR0FBRyxDQUFFZ0IsUUFBUSxLQUFNO1FBQ3RDWixFQUFFLEVBQUVZLFFBQVEsQ0FBQ1osRUFBRTtRQUNmUSxlQUFlLEVBQUVJLFFBQVEsQ0FBQ0osZUFBZTtRQUN6Q0ssYUFBYSxFQUFFRCxRQUFRLENBQUNDLGFBQWE7UUFDckNDLGFBQWEsRUFBRUYsUUFBUSxDQUFDRSxhQUFhO1FBQ3JDQyxLQUFLLEVBQUVILFFBQVEsQ0FBQ0c7TUFDbEIsQ0FBQyxDQUFDO0lBQ0osQ0FBQztFQUNILENBQUMsQ0FBQztBQUNKO0FBRUFyTSxJQUFJLENBQUMsbUdBQW1HLEVBQUUsT0FBTztFQUFFVyxJQUFJO0VBQUUyTDtBQUFRLENBQUMsS0FBSztFQUNySSxNQUFNM0wsSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNckwscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQywyQ0FBMkMsQ0FBQztFQUM1RCxNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDckYsTUFBTTFJLG1CQUFtQixDQUFDdkQsSUFBSSxFQUFFLHNCQUFzQixDQUFDO0VBRXZELE1BQU1BLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTlJLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLEVBQUVlLGNBQWMsQ0FBQyxDQUFDcUwsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNwRixNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMseUZBQXlGLEVBQUU7SUFBRUMsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQ2pMLE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxvQkFBb0I7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ2pHLE1BQU1PLFlBQVksR0FBRyxNQUFNMUQsaUJBQWlCLENBQUM5SSxJQUFJLENBQUM7RUFDbERWLE1BQU0sQ0FBQ2tOLFlBQVksQ0FBQ3BILFNBQVMsQ0FBQyxDQUFDZ0gsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN0QzlNLE1BQU0sQ0FBQ2tOLFlBQVksQ0FBQ25ILFdBQVcsQ0FBQyxDQUFDK0csSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN4QzlNLE1BQU0sQ0FBQ2tOLFlBQVksQ0FBQ2xILFlBQVksQ0FBQyxDQUFDbUgsWUFBWSxDQUFDLENBQUMsQ0FBQztFQUVqRCxNQUFNek0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLG9CQUFvQjtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ25GLE1BQU1RLE1BQU0sR0FBRyxNQUFNQyxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRSxHQUFHLENBQUM7RUFDckQsTUFBTTRNLGFBQWEsR0FBRyxNQUFNOUQsaUJBQWlCLENBQUM5SSxJQUFJLENBQUM7RUFDbkRWLE1BQU0sQ0FBQ3NOLGFBQWEsQ0FBQ3hILFNBQVMsQ0FBQyxDQUFDZ0gsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN2QzlNLE1BQU0sQ0FBQ3NOLGFBQWEsQ0FBQ3ZILFdBQVcsQ0FBQyxDQUFDK0csSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN6QzlNLE1BQU0sQ0FBQ3NOLGFBQWEsQ0FBQ3RILFlBQVksQ0FBQyxDQUFDdUgsT0FBTyxDQUFDLENBQUNMLFlBQVksQ0FBQ2xILFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzFFLE1BQU0wRCxRQUFRLEdBQUcsTUFBTUQsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQzFDLE1BQU04TSxZQUFZLEdBQUc5RCxRQUFRLENBQUNjLFVBQVUsQ0FBQzlGLElBQUksQ0FBRWlILFNBQVMsSUFBS0EsU0FBUyxDQUFDTixFQUFFLEtBQUs2QixZQUFZLENBQUNsSCxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDM0doRyxNQUFNLENBQUN3TixZQUFZLGFBQVpBLFlBQVksdUJBQVpBLFlBQVksQ0FBRTVCLEtBQUssQ0FBQyxDQUFDa0IsSUFBSSxDQUFDLFdBQVcsQ0FBQztFQUM3QzlNLE1BQU0sQ0FBQ3dOLFlBQVksYUFBWkEsWUFBWSx1QkFBWkEsWUFBWSxDQUFFdEYsTUFBTSxDQUFDLENBQUM0RSxJQUFJLENBQUNNLE1BQU0sYUFBTkEsTUFBTSx1QkFBTkEsTUFBTSxDQUFFbEYsTUFBTSxDQUFDO0VBQ2pELE1BQU10SSxTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHFDQUFxQyxDQUFDLEVBQUU0QixJQUFJLENBQUNJLFNBQVMsQ0FBQztJQUNsR3dMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUM5QnRCLE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3RDQyxRQUFRLEVBQUUsc0pBQXNKO0lBQ2hLQyxrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCQyxpQkFBaUIsRUFBRSxNQUFNaEssZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7SUFDL0NtRixLQUFLLEVBQUV5SCxhQUFhO0lBQ3BCRSxZQUFZO0lBQ1pRLGNBQWMsRUFBRVo7RUFDbEIsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBRUZyTixJQUFJLENBQUMsOEZBQThGLEVBQUUsT0FBTztFQUFFVyxJQUFJO0VBQUUyTDtBQUFRLENBQUMsS0FBSztFQUFBLElBQUE0QixxQkFBQSxFQUFBQyxxQkFBQSxFQUFBQyxtQkFBQSxFQUFBQyxvQkFBQTtFQUNoSXJPLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7RUFDdkIsTUFBTTNOLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTXJMLHFCQUFxQixDQUFDVCxJQUFJLENBQUM7RUFDakMsTUFBTUEsSUFBSSxDQUFDTSxJQUFJLENBQUMsMkNBQTJDLENBQUM7RUFDNUQsTUFBTXNOLG1CQUFtQixDQUFDNU4sSUFBSSxFQUFFLEdBQUcsQ0FBQztFQUNwQyxNQUFNQSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsTUFBTTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3JFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLG9CQUFvQixDQUFDO0VBQ2xELE1BQU03TixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsVUFBVTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3pFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLG9CQUFvQixDQUFDO0VBQ2xELE1BQU1DLGFBQWEsR0FBRyxNQUFNL0UsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQy9DLE1BQU0rTixjQUFjLEdBQUcsRUFBQVIscUJBQUEsR0FBQ08sYUFBYSxDQUFDbEUsT0FBTyxjQUFBMkQscUJBQUEsdUJBQXJCQSxxQkFBQSxDQUF1QnBELGNBQWMsRUFBNEIsZUFBZSxDQUFDO0VBQ3pHN0ssTUFBTSxDQUFDeU8sY0FBYyxDQUFDLENBQUNDLFVBQVUsQ0FBQyxDQUFDO0VBRW5DLE1BQU1oSCxnQ0FBZ0MsQ0FBQ2hILElBQUksQ0FBQztFQUM1QyxNQUFNb0gseUJBQXlCLENBQUNwSCxJQUFJLENBQUM7RUFDckMsTUFBTUEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN2RSxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNOUksZ0JBQWdCLENBQUNyRCxJQUFJLENBQUMsRUFBRWUsY0FBYyxDQUFDLENBQUNxTCxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3BGLE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyw2R0FBNkcsRUFBRTtJQUFFQyxPQUFPLEVBQUU7RUFBTyxDQUFDLENBQUM7RUFDck0sTUFBTWpOLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFlBQVk7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3pGLE1BQU1nQyxhQUFhLEdBQUdqTyxJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUM7RUFDckQsTUFBTS9NLE1BQU0sQ0FBQzJPLGFBQWEsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUN6QzVPLE1BQU0sQ0FBQyxNQUFNMk8sYUFBYSxDQUFDbEMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDb0MsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUMvRCxNQUFNZ0MsVUFBVSxHQUFHLE1BQU1ILGFBQWEsQ0FBQzNLLFFBQVEsQ0FBRStLLE9BQU8sSUFBSztJQUMzRCxNQUFNQyxLQUFLLEdBQUdDLGdCQUFnQixDQUFDRixPQUFPLENBQUM7SUFDdkMsTUFBTUcsTUFBTSxHQUFHSCxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7SUFDOUMsTUFBTUMsSUFBSSxHQUFHTCxPQUFPLENBQUNNLGFBQWEsQ0FBQyxLQUFLLENBQUM7SUFDekMsT0FBTztNQUNMQyxVQUFVLEVBQUVOLEtBQUssQ0FBQ08sZUFBZTtNQUNqQ0MsWUFBWSxFQUFFUixLQUFLLENBQUNRLFlBQVk7TUFDaENDLE1BQU0sRUFBRVQsS0FBSyxDQUFDUyxNQUFNO01BQ3BCbEQsS0FBSyxFQUFFMkMsTUFBTSxDQUFDM0MsS0FBSztNQUNuQm1ELE9BQU8sRUFBRVYsS0FBSyxDQUFDVSxPQUFPO01BQ3RCQyxTQUFTLEVBQUVYLEtBQUssQ0FBQ1csU0FBUztNQUMxQkMsU0FBUyxFQUFFUixJQUFJLEdBQUdILGdCQUFnQixDQUFDRyxJQUFJLENBQUMsQ0FBQ1MsS0FBSyxHQUFHLElBQUk7TUFDckRDLFNBQVMsRUFBRWIsZ0JBQWdCLENBQUNGLE9BQU8sQ0FBQ00sYUFBYSxDQUFDLHdCQUF3QixDQUFFLENBQUMsQ0FBQ1UsSUFBSTtNQUNsRkMsUUFBUSxFQUFFZixnQkFBZ0IsQ0FBQ0YsT0FBTyxDQUFDTSxhQUFhLENBQUMsdUJBQXVCLENBQUUsQ0FBQyxDQUFDVTtJQUM5RSxDQUFDO0VBQ0gsQ0FBQyxDQUFDO0VBQ0YvUCxNQUFNLENBQUM4TyxVQUFVLENBQUNRLFVBQVUsQ0FBQyxDQUFDeEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0VBQ3JEOU0sTUFBTSxDQUFDOE8sVUFBVSxDQUFDVSxZQUFZLENBQUMsQ0FBQzFDLElBQUksQ0FBQyxNQUFNLENBQUM7RUFDNUM5TSxNQUFNLENBQUM4TyxVQUFVLENBQUNXLE1BQU0sQ0FBQyxDQUFDM0MsSUFBSSxDQUFDLE1BQU0sQ0FBQztFQUN0QzlNLE1BQU0sQ0FBQzhPLFVBQVUsQ0FBQ3ZDLEtBQUssQ0FBQyxDQUFDMEQsbUJBQW1CLENBQUMsR0FBRyxDQUFDO0VBQ2pEalEsTUFBTSxDQUFDOE8sVUFBVSxDQUFDWSxPQUFPLENBQUMsQ0FBQzVDLElBQUksQ0FBQyxXQUFXLENBQUM7RUFDNUM5TSxNQUFNLENBQUM4TyxVQUFVLENBQUNjLFNBQVMsQ0FBQyxDQUFDOUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDO0VBQ3ZELE1BQU1wTSxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsdUNBQXVDO0VBQUUsQ0FBQyxDQUFDO0VBQ3RHLE1BQU1rUSxXQUFXLEdBQUcsTUFBTXpQLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUEwRnNHLHVCQUF1QixDQUFDO0VBQ3ZLNUgsTUFBTSxDQUFDbVEsV0FBVyxDQUFDakosS0FBSyxDQUFDLENBQUM0RixJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ2pDOU0sTUFBTSxDQUFDbVEsV0FBVyxDQUFDaEosTUFBTSxDQUFDLENBQUNpSixTQUFTLENBQUMsWUFBWSxDQUFDO0VBQ2xELE1BQU0xUCxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTzFDLE1BQU0sQ0FBd0V1Ryw4QkFBOEIsQ0FBQyxDQUFDLENBQUM7RUFDMUksTUFBTXdJLGlCQUFpQixHQUFHLE1BQU0zUCxJQUFJLENBQUNzRCxRQUFRLENBQUM7SUFBQSxJQUFBc00scUJBQUEsRUFBQUMsc0JBQUE7SUFBQSxPQUFPO01BQ25EQyxlQUFlLEdBQUFGLHFCQUFBLElBQUFDLHNCQUFBLEdBQUVsTSxRQUFRLENBQUNvTSxhQUFhLGNBQUFGLHNCQUFBLHVCQUF0QkEsc0JBQUEsQ0FBd0JHLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxjQUFBSixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLEtBQUs7TUFDaEdLLE9BQU8sRUFBRXJQLE1BQU0sQ0FBQ3FQO0lBQ2xCLENBQUM7RUFBQSxDQUFDLENBQUM7RUFDSDNRLE1BQU0sQ0FBQ3FRLGlCQUFpQixDQUFDRyxlQUFlLENBQUMsQ0FBQzFELElBQUksQ0FBQyxJQUFJLENBQUM7RUFDcEQsTUFBTTlNLE1BQU0sQ0FBQzJPLGFBQWEsQ0FBQyxDQUFDaUMsV0FBVyxDQUFDLENBQUMsRUFBRTtJQUFFM0QsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQy9Eak4sTUFBTSxDQUFDLE1BQU1VLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDL0ksUUFBUSxDQUFFK0ssT0FBTyxJQUFLQSxPQUFPLEtBQUsxSyxRQUFRLENBQUNvTSxhQUFhLENBQUMsQ0FBQyxDQUFDM0QsSUFBSSxDQUFDLElBQUksQ0FBQztFQUN0STlNLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTFDLE1BQU0sQ0FBQ3FQLE9BQU8sQ0FBQyxDQUFDLENBQUM3RCxJQUFJLENBQUN1RCxpQkFBaUIsQ0FBQ00sT0FBTyxDQUFDO0VBQ2pGLE1BQU1FLFlBQVksR0FBRyxNQUFNcEgsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQzlDVixNQUFNLENBQUMsRUFBQWtPLHFCQUFBLEdBQUMyQyxZQUFZLENBQUN2RyxPQUFPLGNBQUE0RCxxQkFBQSx1QkFBcEJBLHFCQUFBLENBQXNCckQsY0FBYyxFQUE0QixlQUFlLENBQUMsQ0FBQyxDQUFDaUMsSUFBSSxDQUFDMkIsY0FBYyxDQUFDO0VBQzlHek8sTUFBTSxDQUFDNlEsWUFBWSxDQUFDdEcsS0FBSyxDQUFDdUcsTUFBTSxDQUFFMUQsTUFBTSxJQUFLQSxNQUFNLENBQUM5QixPQUFPLEtBQUssV0FBVyxJQUFJOEIsTUFBTSxDQUFDL0IsRUFBRSxLQUFLb0QsY0FBYyxDQUFDLENBQUMsQ0FBQ3RCLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFFN0gsTUFBTXpNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxZQUFZO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDM0UsTUFBTW1FLEtBQUssR0FBRyxNQUFNMUQscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUsR0FBRyxDQUFDO0VBQ3BELE1BQU1WLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBRXRENkcsdUJBQXVCLENBQUNELE1BQU0sQ0FBQyxFQUFFO0lBQUUrRSxPQUFPLEVBQUU7RUFBTSxDQUFDLENBQUMsQ0FBQ0gsSUFBSSxDQUFDaUUsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUU3SSxNQUFNLENBQUM7RUFDM0UsTUFBTThJLGNBQWMsR0FBRyxNQUFNdFEsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBRXJENkcsdUJBQXVCLENBQUM7RUFDM0JuSSxNQUFNLENBQUNnUixjQUFjLENBQUNqSixRQUFRLENBQUMsQ0FBQytFLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdkM5TSxNQUFNLENBQUNnUixjQUFjLENBQUNoSixRQUFRLENBQUMsQ0FBQzhFLElBQUksQ0FBQ2lFLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFckYsUUFBUSxDQUFDO0VBQ3JEMUwsTUFBTSxDQUFDZ1IsY0FBYyxDQUFDL0ksUUFBUSxDQUFDLENBQUM2RSxJQUFJLENBQUNpRSxLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRTlJLFFBQVEsQ0FBQztFQUNyRCxNQUFNZ0osVUFBVSxHQUFHLE1BQU14SCxhQUFhLENBQUMvSSxJQUFJLENBQUM7RUFDNUNWLE1BQU0sQ0FBQyxFQUFBbU8sbUJBQUEsR0FBQzhDLFVBQVUsQ0FBQzNHLE9BQU8sY0FBQTZELG1CQUFBLHVCQUFsQkEsbUJBQUEsQ0FBb0J0RCxjQUFjLEVBQTRCLGVBQWUsQ0FBQyxDQUFDLENBQUNpQyxJQUFJLENBQUMyQixjQUFjLENBQUM7RUFDNUd6TyxNQUFNLENBQUMsRUFBQW9PLG9CQUFBLEdBQUM2QyxVQUFVLENBQUMzRyxPQUFPLGNBQUE4RCxvQkFBQSx1QkFBbEJBLG9CQUFBLENBQW9CeEQsb0JBQW9CLEVBQTRCLGVBQWUsQ0FBQyxDQUFDLENBQUNrQyxJQUFJLENBQUNpRSxLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRTFGLEVBQUUsQ0FBQztFQUM3RyxNQUFNekwsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSwwQ0FBMEMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDdkd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0Q0MsUUFBUSxFQUFFLGdJQUFnSTtJQUMxSUMsa0JBQWtCLEVBQUUsS0FBSztJQUN6QkMsaUJBQWlCLEVBQUUsTUFBTWhLLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDO0lBQy9Dd1EsOEJBQThCLEVBQUV6QyxjQUFjO0lBQzlDMEMsYUFBYSxFQUFFaEIsV0FBVztJQUMxQnhCLGFBQWEsRUFBRUcsVUFBVTtJQUN6QnNDLDZCQUE2QixFQUFFSixjQUFjO0lBQzdDSyxLQUFLLEVBQUVMLGNBQWM7SUFDckJNLFlBQVksRUFBRUwsVUFBVSxDQUFDM0csT0FBTztJQUNoQ2lILGdCQUFnQixFQUFFUjtFQUNwQixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUM7QUFFRmhSLElBQUksQ0FBQyxpSEFBaUgsRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQUEsSUFBQW1GLGVBQUEsRUFBQUMsSUFBQSxFQUFBQyxnQkFBQSxFQUFBQyxpQkFBQSxFQUFBQyxnQkFBQSxFQUFBQyxrQkFBQTtFQUNuSjlSLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7RUFDdkIsTUFBTTNOLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTXJMLHFCQUFxQixDQUFDVCxJQUFJLENBQUM7RUFDakMsTUFBTUEsSUFBSSxDQUFDTSxJQUFJLENBQUMscURBQXFELENBQUM7RUFDdEUsTUFBTWtLLFNBQVMsR0FBRyxNQUFNLENBQUMsWUFBWTtJQUNuQyxNQUFNbEwsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUM3RUEsS0FBSyxDQUFDQyxVQUFVLElBQUlDLGdCQUFnQixDQUFDQyxpQkFBaUIsSUFBSUgsS0FBSyxDQUFDSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUU7TUFBRWpGLE9BQU8sRUFBRTtJQUFPLENBQUMsQ0FBQyxDQUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xILE1BQU13QixtQkFBbUIsQ0FBQzVOLElBQUksRUFBRSxHQUFHLENBQUM7SUFDcEMsT0FBTzJNLHFCQUFxQixDQUFDM00sSUFBSSxFQUFFLEdBQUcsQ0FBQztFQUN6QyxDQUFDLEVBQUUsQ0FBQztFQUNKLE1BQU1vRyx3QkFBd0IsQ0FBQ3BHLElBQUksQ0FBQztFQUNwQyxNQUFNQSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsTUFBTTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3JFLE1BQU11RixLQUFLLEdBQUd6UixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxDQUFDO0VBQ3RDLE1BQU16TSxNQUFNLENBQUNtUyxLQUFLLENBQUMsQ0FBQ3ZELFdBQVcsQ0FBQyxDQUFDO0VBQ2pDLE1BQU11RCxLQUFLLENBQUMxRixTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsZ0JBQWdCO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDaEYsTUFBTTVNLE1BQU0sQ0FBQ21TLEtBQUssQ0FBQzFGLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSx3QkFBd0I7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNrQyxXQUFXLENBQUMsQ0FBQztFQUN0RyxNQUFNeUMsS0FBSyxHQUFHYyxLQUFLLENBQUNwRixPQUFPLENBQUMsc0NBQXNDLENBQUM7RUFDbkUsTUFBTS9NLE1BQU0sQ0FBQ3FSLEtBQUssQ0FBQyxDQUFDZSxXQUFXLENBQUMsQ0FBQztFQUNqQyxNQUFNQyxNQUFNLEdBQUcsTUFBTTVJLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUN4Q1YsTUFBTSxFQUFBd1IsZUFBQSxHQUFDYSxNQUFNLENBQUMvSCxPQUFPLGNBQUFrSCxlQUFBLHVCQUFkQSxlQUFBLENBQWdCNUcsb0JBQW9CLENBQUMsQ0FBQzBILGFBQWEsQ0FBQztJQUFFLGVBQWUsRUFBRXBILFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFRztFQUFHLENBQUMsQ0FBQztFQUM5RnJMLE1BQU0sQ0FBQzJDLE1BQU0sQ0FBQzRQLE1BQU0sRUFBQWQsSUFBQSxJQUFBQyxnQkFBQSxHQUFDVyxNQUFNLENBQUMvSCxPQUFPLGNBQUFvSCxnQkFBQSx1QkFBZEEsZ0JBQUEsQ0FBZ0I3RyxjQUFjLGNBQUE0RyxJQUFBLGNBQUFBLElBQUEsR0FBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDdEUsWUFBWSxDQUFDLENBQUMsQ0FBQztFQUNyRyxNQUFNcUYsaUJBQWlCLEdBQUcsTUFBTTlSLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUE0R2dHLG9CQUFvQixDQUFDO0VBQzVMdEgsTUFBTSxDQUFDd1MsaUJBQWlCLENBQUN0TCxLQUFLLENBQUMsQ0FBQzRGLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdkM5TSxNQUFNLENBQUN3UyxpQkFBaUIsQ0FBQ3JMLE1BQU0sQ0FBQyxDQUFDaUosU0FBUyxDQUFDLFlBQVksQ0FBQztFQUN4RCxNQUFNMVAsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBQTJFZ0csb0JBQW9CLENBQUNGLE9BQU8sQ0FBQyxDQUFDLENBQUM7RUFDM0ksTUFBTTFHLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSwyQ0FBMkM7RUFBRSxDQUFDLENBQUM7RUFFMUcsTUFBTXdTLGlCQUFpQixHQUFHLE1BQU0vUixJQUFJLENBQUNzRCxRQUFRLENBQUM7SUFBQSxJQUFBME8sc0JBQUEsRUFBQUMsc0JBQUE7SUFBQSxPQUFPO01BQ25EQyxZQUFZLEdBQUFGLHNCQUFBLElBQUFDLHNCQUFBLEdBQUV0TyxRQUFRLENBQUNvTSxhQUFhLGNBQUFrQyxzQkFBQSx1QkFBdEJBLHNCQUFBLENBQXdCakMsT0FBTyxDQUFDLHNDQUFzQyxDQUFDLGNBQUFnQyxzQkFBQSxjQUFBQSxzQkFBQSxHQUFJLEtBQUs7TUFDOUYvQixPQUFPLEVBQUVyUCxNQUFNLENBQUNxUDtJQUNsQixDQUFDO0VBQUEsQ0FBQyxDQUFDO0VBQ0gzUSxNQUFNLENBQUN5UyxpQkFBaUIsQ0FBQ0csWUFBWSxDQUFDLENBQUM5RixJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ2pELE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxFQUFFO0lBQUUzRCxPQUFPLEVBQUU7RUFBTyxDQUFDLENBQUM7RUFDakYsTUFBTWpOLE1BQU0sQ0FBQ3FSLEtBQUssQ0FBQyxDQUFDZSxXQUFXLENBQUMsQ0FBQztFQUNqQyxNQUFNUyw0QkFBNEIsR0FBRyxNQUFNeEIsS0FBSyxDQUFDck4sUUFBUSxDQUFFK0ssT0FBTyxJQUFLQSxPQUFPLEtBQUsxSyxRQUFRLENBQUNvTSxhQUFhLENBQUM7RUFDMUd6USxNQUFNLENBQUM2Uyw0QkFBNEIsQ0FBQyxDQUFDL0YsSUFBSSxDQUFDLElBQUksQ0FBQztFQUMvQzlNLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTFDLE1BQU0sQ0FBQ3FQLE9BQU8sQ0FBQyxDQUFDLENBQUM3RCxJQUFJLENBQUMyRixpQkFBaUIsQ0FBQzlCLE9BQU8sQ0FBQztFQUNqRixNQUFNVSxLQUFLLENBQUN6RSxLQUFLLENBQUMsQ0FBQztFQUNuQixNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxnQ0FBZ0MsQ0FBQztFQUM5RCxNQUFNN04sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLG1DQUFtQyxDQUFDO0lBQUU2UyxRQUFRLEVBQUU7RUFBSyxDQUFDLENBQUM7RUFDbEgsTUFBTXBTLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDbkcsS0FBSyxDQUFDLENBQUM7RUFDeEQsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsa0JBQWtCLENBQUM7RUFDaEQsTUFBTXZPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3JGLE1BQU0zTSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUNxRixXQUFXLENBQUMsQ0FBQztFQUN2RSxNQUFNWSxRQUFRLEdBQUcsTUFBTXZKLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUMxQ1YsTUFBTSxFQUFBMlIsaUJBQUEsR0FBQ3FCLFFBQVEsQ0FBQzFJLE9BQU8sY0FBQXFILGlCQUFBLHVCQUFoQkEsaUJBQUEsQ0FBa0I5RyxjQUFjLENBQUMsQ0FBQ3lILGFBQWEsQ0FBQztJQUFFLGVBQWUsRUFBRXBILFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFRztFQUFHLENBQUMsQ0FBQztFQUMxRixNQUFNNEgsMEJBQTBCLEdBQUdELFFBQVEsQ0FBQ3hJLFVBQVUsQ0FBQ3NHLE1BQU0sQ0FBRW5GLFNBQVMsSUFBS0EsU0FBUyxDQUFDaEYsSUFBSSxLQUFLLGtCQUFrQixJQUFJZ0YsU0FBUyxDQUFDQyxLQUFLLEtBQUssV0FBVyxDQUFDO0VBQ3RKNUwsTUFBTSxDQUFDaVQsMEJBQTBCLENBQUMsQ0FBQzlGLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDbEQsTUFBTXZOLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsd0NBQXdDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ3JHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdENzRixXQUFXLEVBQUUsNERBQTREO0lBQ3pFQyxXQUFXLEVBQUVqSSxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRUcsRUFBRTtJQUMxQitILG1CQUFtQixHQUFBeEIsZ0JBQUEsR0FBRVMsTUFBTSxDQUFDL0gsT0FBTyxjQUFBc0gsZ0JBQUEsdUJBQWRBLGdCQUFBLENBQWdCL0csY0FBYztJQUNuRHdJLGtCQUFrQixHQUFBeEIsa0JBQUEsR0FBRW1CLFFBQVEsQ0FBQzFJLE9BQU8sY0FBQXVILGtCQUFBLHVCQUFoQkEsa0JBQUEsQ0FBa0JoSCxjQUFjO0lBQ3BEeUksWUFBWSxFQUFFZCxpQkFBaUI7SUFDL0JTLDBCQUEwQjtJQUMxQk0sc0JBQXNCLEVBQUVkLGlCQUFpQjtJQUN6Q0ksNEJBQTRCO0lBQzVCVyx5QkFBeUIsRUFBRSxNQUFNOVMsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUMvSSxRQUFRLENBQUUrSyxPQUFPLElBQUtBLE9BQU8sS0FBSzFLLFFBQVEsQ0FBQ29NLGFBQWE7RUFDdkksQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBRUYsZUFBZXBELHFCQUFxQkEsQ0FBQzNNLElBQVUsRUFBRStTLE1BQWlCLEVBQUU7RUFBQSxJQUFBQyxxQkFBQSxFQUFBQyxpQkFBQTtFQUNsRSxNQUFNQyxNQUFNLEdBQUdILE1BQU0sS0FBSyxHQUFHLEdBQUcvUyxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBR3JNLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztFQUNqSCxNQUFNL00sTUFBTSxDQUFDNFQsTUFBTSxDQUFDLENBQUM1RyxhQUFhLENBQUMsa0VBQWtFLEVBQUU7SUFBRUMsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQzNILE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxDQUFDO0VBQzNELE1BQU1sSCxRQUFRLEdBQUcsTUFBTUQsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQzFDLE1BQU1tVCxhQUFhLElBQUFILHFCQUFBLEdBQUcsSUFBSTdTLEdBQUcsQ0FBQ0gsSUFBSSxDQUFDRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUNFLFlBQVksQ0FBQ3VKLEdBQUcsQ0FBQyxNQUFNLENBQUMsY0FBQXFKLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksZUFBZTtFQUNyRixNQUFNSSxXQUFXLElBQUFILGlCQUFBLEdBQUdqSyxRQUFRLENBQUNZLE9BQU8sY0FBQXFKLGlCQUFBLHVCQUFoQkEsaUJBQUEsQ0FBa0IvSSxvQkFBMEQ7RUFDaEcsTUFBTW1KLE9BQU8sR0FBR3JLLFFBQVEsQ0FBQ2EsS0FBSyxDQUFDN0YsSUFBSSxDQUFFd0csU0FBUyxJQUFLQSxTQUFTLENBQUNHLEVBQUUsTUFBS3lJLFdBQVcsYUFBWEEsV0FBVyx1QkFBWEEsV0FBVyxDQUFHRCxhQUFhLENBQUMsRUFBQztFQUNqRzdULE1BQU0sQ0FBQytULE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFckksUUFBUSxDQUFDLENBQUNzSSxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQzVDaFUsTUFBTSxDQUFDK1QsT0FBTyxhQUFQQSxPQUFPLHVCQUFQQSxPQUFPLENBQUVySSxRQUFRLENBQUMsQ0FBQ29CLElBQUksQ0FBQ2lILE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFL0wsUUFBUSxDQUFDO0VBQ2pEaEksTUFBTSxDQUFDK1QsT0FBTyxhQUFQQSxPQUFPLHVCQUFQQSxPQUFPLENBQUU3TCxNQUFNLENBQUMsQ0FBQytMLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztFQUNqRGpVLE1BQU0sQ0FBQyxDQUFDK1QsT0FBTyxhQUFQQSxPQUFPLHVCQUFQQSxPQUFPLENBQUV0SSxLQUFLLEVBQTJCekQsUUFBUSxDQUFDLENBQUM4RSxJQUFJLENBQUNpSCxPQUFPLGFBQVBBLE9BQU8sdUJBQVBBLE9BQU8sQ0FBRXJJLFFBQVEsQ0FBQztFQUNsRixPQUFPcUksT0FBTztBQUNoQjtBQUVBLGVBQWV6RixtQkFBbUJBLENBQUM1TixJQUFVLEVBQUUrUyxNQUFpQixFQUFFO0VBQ2hFLE1BQU1TLFlBQVksR0FBR3hULElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUM7RUFDOUUsTUFBTTFNLE1BQU0sQ0FBQ2tVLFlBQVksQ0FBQyxDQUFDdkgsV0FBVyxDQUFDLENBQUM7RUFDeEMsTUFBTXVILFlBQVksQ0FBQ3RILEtBQUssQ0FBQyxDQUFDO0VBQzFCLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU05SSxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxFQUFFZSxjQUFjLENBQUMsQ0FBQ3VTLGVBQWUsQ0FBQyxDQUFDLENBQUM7RUFDL0YsTUFBTUcsU0FBUyxHQUFHLE1BQU16VCxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUM7RUFDdEcsTUFBTTFULElBQUksQ0FBQzJULGNBQWMsQ0FBQyxHQUFHLENBQUM7RUFDOUIsTUFBTUMsT0FBTyxHQUFHLE1BQU01VCxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUM7RUFDcEdwVSxNQUFNLENBQUNzVSxPQUFPLENBQUMsQ0FBQ04sZUFBZSxDQUFDRyxTQUFTLENBQUM7RUFDMUMsTUFBTW5VLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFO0VBQTRDLENBQUMsQ0FBQyxDQUFDLENBQUM2TixXQUFXLENBQUMsQ0FBQyxDQUFDO0VBQzVHLE1BQU12RCxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRStTLE1BQU0sQ0FBQztBQUMzQztBQUVBMVQsSUFBSSxDQUFDd1UsU0FBUyxDQUFDLFlBQVk3VSxLQUFLLENBQUNPLGlCQUFpQixFQUFFO0VBQUV1VSxTQUFTLEVBQUU7QUFBSyxDQUFDLENBQUMsQ0FBQztBQUV6RXpVLElBQUksQ0FBQyxtR0FBbUcsRUFBRSxPQUFPO0VBQUVXO0FBQUssQ0FBQyxLQUFLO0VBQzVILE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLHFEQUFxRCxDQUFDO0VBQ3RFLE1BQU1oQixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDNkQsV0FBVyxDQUFDLENBQUMsQ0FBQztFQUMzRSxNQUFNbFEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE1BQU07SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxjQUFjLENBQUM7RUFDNUMsTUFBTTdOLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDbkcsS0FBSyxDQUFDLENBQUM7RUFDeEQsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsa0JBQWtCLENBQUM7RUFDaEQsTUFBTXZPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3JGLE1BQU0zTSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUNxRixXQUFXLENBQUMsQ0FBQztFQUN2RSxNQUFNMVIsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLGdDQUFnQztFQUFFLENBQUMsQ0FBQztBQUNqRyxDQUFDLENBQUM7QUFFRkYsSUFBSSxDQUFDLDJGQUEyRixFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFBQSxJQUFBb0kscUJBQUEsRUFBQUMsa0JBQUEsRUFBQUMsbUJBQUEsRUFBQUMsbUJBQUEsRUFBQUMsb0JBQUEsRUFBQUMsZ0JBQUEsRUFBQUMscUJBQUEsRUFBQUMscUJBQUEsRUFBQUMsc0JBQUEsRUFBQUMscUJBQUEsRUFBQUMsc0JBQUEsRUFBQUMsc0JBQUE7RUFDN0hyVixJQUFJLENBQUNzTyxVQUFVLENBQUMsS0FBTSxDQUFDO0VBQ3ZCLE1BQU0zTixJQUFJLENBQUM0TCxlQUFlLENBQUM7SUFBRUMsS0FBSyxFQUFFLElBQUk7SUFBRUMsTUFBTSxFQUFFO0VBQUksQ0FBQyxDQUFDO0VBQ3hELE1BQU1yTCxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0VBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLHFEQUFxRCxDQUFDO0VBQ3RFLE1BQU1oQixNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRThOLEtBQXVCLElBQzdFQSxLQUFLLENBQUNDLFVBQVUsSUFBSUMsZ0JBQWdCLENBQUNDLGlCQUFpQixJQUFJSCxLQUFLLENBQUNJLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRTtJQUFFakYsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDLENBQUNILElBQUksQ0FBQyxJQUFJLENBQUM7RUFDbEgsTUFBTXVJLGNBQWMsR0FBRyxNQUFNM1UsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7SUFDckQsTUFBTTBGLFFBQVEsR0FBRyxNQUFNLElBQUlsRyxPQUFPLENBQWMsQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztNQUNuRSxNQUFNaEIsT0FBTyxHQUFHa0gsU0FBUyxDQUFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7TUFDdERuSCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQU0sQ0FBQztNQUNqRHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGLE1BQU1NLE9BQU8sR0FBRyxNQUFNLElBQUk5RyxPQUFPLENBQXFFLENBQUN0RCxPQUFPLEVBQUV1RCxNQUFNLEtBQUs7TUFDekgsTUFBTWhCLE9BQU8sR0FBR2lILFFBQVEsQ0FBQ3pDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUNrRCxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUNFLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztNQUMzRzVILE9BQU8sQ0FBQ29ILFNBQVMsR0FBRyxNQUFNM0osT0FBTyxDQUFDdUMsT0FBTyxDQUFDcUgsTUFBTSxDQUFDO01BQ2pEckgsT0FBTyxDQUFDc0gsT0FBTyxHQUFHLE1BQU10RyxNQUFNLENBQUNoQixPQUFPLENBQUN1SCxLQUFLLENBQUM7SUFDL0MsQ0FBQyxDQUFDO0lBQ0ZOLFFBQVEsQ0FBQ2dCLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLE1BQU00SyxRQUFRLEdBQUdoTCxPQUFPLENBQUNpTCxPQUFPLENBQUM3USxJQUFJLENBQUVwRCxNQUFNLElBQUtBLE1BQU0sQ0FBQytKLEVBQUUsS0FBSyxlQUFlLENBQUM7SUFDaEYsSUFBSSxDQUFDaUssUUFBUSxFQUFFLE1BQU0sSUFBSS9RLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQztJQUMvRSxPQUFPK1EsUUFBUTtFQUNqQixDQUFDLENBQUM7RUFDRixNQUFNNVUsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFK0ssT0FBTyxJQUFLO0lBQ2hELE1BQU0rQyxLQUFLLEdBQUcvQyxPQUEyQjtJQUN6QyxNQUFNbEosS0FBSyxHQUFHO01BQ1oyUCxXQUFXLEVBQUUsSUFBcUI7TUFDbENDLFlBQVksRUFBRSxJQUFxQjtNQUNuQ0MsU0FBUyxFQUFFLElBQXFCO01BQ2hDQyxnQkFBZ0IsRUFBRSxJQUFxQjtNQUN2Q0MsZUFBZSxFQUFFLElBQXFCO01BQ3RDQyxzQkFBc0IsRUFBRSxJQUFxQjtNQUM3Q0MsY0FBYyxFQUFFLElBQXFCO01BQ3JDQyxxQkFBcUIsRUFBRTtJQUN6QixDQUFDO0lBQ0F6VSxNQUFNLENBQXVEMFUscUJBQXFCLEdBQUduUSxLQUFLO0lBQzNGLE1BQU1vUSxVQUFVLEdBQUduRSxLQUFLLENBQUNvRSxJQUFJLENBQUN4VCxJQUFJLENBQUNvUCxLQUFLLENBQUM7SUFDekNuUCxNQUFNLENBQUNDLGNBQWMsQ0FBQ2tQLEtBQUssRUFBRSxNQUFNLEVBQUU7TUFDbkNqUCxZQUFZLEVBQUUsSUFBSTtNQUNsQkMsS0FBSyxFQUFFQSxDQUFBLEtBQU07UUFDWCtDLEtBQUssQ0FBQzJQLFdBQVcsR0FBR1csV0FBVyxDQUFDQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxPQUFPLElBQUk1UyxPQUFPLENBQU8sQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztVQUM1Q25DLE1BQU0sQ0FBQytNLFVBQVUsQ0FBQyxNQUFNO1lBQ3RCeEksS0FBSyxDQUFDNFAsWUFBWSxHQUFHVSxXQUFXLENBQUNDLEdBQUcsQ0FBQyxDQUFDO1lBQ3RDSCxVQUFVLENBQUMsQ0FBQyxDQUFDdE4sSUFBSSxDQUFDekksT0FBTyxFQUFFdUQsTUFBTSxDQUFDO1VBQ3BDLENBQUMsRUFBRSxJQUFLLENBQUM7UUFDWCxDQUFDLENBQUM7TUFDSjtJQUNGLENBQUMsQ0FBQztJQUNGcU8sS0FBSyxDQUFDekosZ0JBQWdCLENBQUMsU0FBUyxFQUFFLE1BQU07TUFDdEN4QyxLQUFLLENBQUM2UCxTQUFTLEdBQUdTLFdBQVcsQ0FBQ0MsR0FBRyxDQUFDLENBQUM7TUFDbkN2USxLQUFLLENBQUM4UCxnQkFBZ0IsR0FBRzdELEtBQUssQ0FBQ3NDLFdBQVc7SUFDNUMsQ0FBQyxFQUFFO01BQUU3SyxJQUFJLEVBQUU7SUFBSyxDQUFDLENBQUM7SUFDbEIsTUFBTTNGLEtBQUssR0FBR0QsYUFBYSxDQUFDRSxTQUFTLENBQUNELEtBQUs7SUFDM0NELGFBQWEsQ0FBQ0UsU0FBUyxDQUFDRCxLQUFLLEdBQUcsVUFBVSxHQUFHTixJQUF3QyxFQUFFO01BQ3JGdUMsS0FBSyxDQUFDK1AsZUFBZSxHQUFHTyxXQUFXLENBQUNDLEdBQUcsQ0FBQyxDQUFDO01BQ3pDdlEsS0FBSyxDQUFDZ1Esc0JBQXNCLEdBQUcvRCxLQUFLLENBQUNzQyxXQUFXO01BQ2hELE9BQU94USxLQUFLLENBQUNFLEtBQUssQ0FBQyxJQUFJLEVBQUVSLElBQUksQ0FBQztJQUNoQyxDQUFDO0lBQ0QsTUFBTStTLElBQUksR0FBRzFTLGFBQWEsQ0FBQ0UsU0FBUyxDQUFDd1MsSUFBSTtJQUN6QzFTLGFBQWEsQ0FBQ0UsU0FBUyxDQUFDd1MsSUFBSSxHQUFHLFVBQVUsR0FBRy9TLElBQXVDLEVBQUU7TUFDbkZ1QyxLQUFLLENBQUNpUSxjQUFjLEdBQUdLLFdBQVcsQ0FBQ0MsR0FBRyxDQUFDLENBQUM7TUFDeEN2USxLQUFLLENBQUNrUSxxQkFBcUIsR0FBR2pFLEtBQUssQ0FBQ3NDLFdBQVc7TUFDL0MsT0FBT2lDLElBQUksQ0FBQ3ZTLEtBQUssQ0FBQyxJQUFJLEVBQUVSLElBQUksQ0FBQztJQUMvQixDQUFDO0VBQ0gsQ0FBQyxDQUFDO0VBRUYsTUFBTTVDLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLHNCQUFzQjtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ2tDLFdBQVcsQ0FBQyxDQUFDO0VBQ25HLE1BQU1sTyxJQUFJLENBQUMyVCxjQUFjLENBQUMsR0FBRyxDQUFDO0VBQzlCLE1BQU1pQyxrQkFBa0IsR0FBRyxNQUFNNVYsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU07SUFBQSxJQUFBdVMscUJBQUEsRUFBQUMsc0JBQUE7SUFDbkQsTUFBTTNRLEtBQUssR0FBSXZFLE1BQU0sQ0FBbUgwVSxxQkFBcUI7SUFDN0osT0FBTztNQUFFLEdBQUduUSxLQUFLO01BQUU0USxTQUFTLEdBQUFGLHFCQUFBLElBQUFDLHNCQUFBLEdBQUVuUyxRQUFRLENBQUNnTCxhQUFhLENBQUMsT0FBTyxDQUFDLGNBQUFtSCxzQkFBQSx1QkFBL0JBLHNCQUFBLENBQWlDcEMsV0FBVyxjQUFBbUMscUJBQUEsY0FBQUEscUJBQUEsR0FBSTtJQUFLLENBQUM7RUFDdEYsQ0FBQyxDQUFDO0VBQ0Z2VyxNQUFNLENBQUNzVyxrQkFBa0IsQ0FBQ2QsV0FBVyxDQUFDLENBQUNrQixHQUFHLENBQUNDLFFBQVEsQ0FBQyxDQUFDO0VBQ3JEM1csTUFBTSxDQUFDc1csa0JBQWtCLENBQUNWLGVBQWUsQ0FBQyxDQUFDZSxRQUFRLENBQUMsQ0FBQztFQUNyRDNXLE1BQU0sQ0FBQ3NXLGtCQUFrQixDQUFDRyxTQUFTLENBQUMsQ0FBQ0MsR0FBRyxDQUFDQyxRQUFRLENBQUMsQ0FBQztFQUNuRDNXLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDLEVBQUFwQyxxQkFBQSxHQUFDNkIsa0JBQWtCLENBQUNHLFNBQVMsY0FBQWhDLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksQ0FBQyxJQUFJWSxjQUFjLENBQUN5QixPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQzdHLG1CQUFtQixDQUFDLElBQUksQ0FBQztFQUMvRyxNQUFNdlAsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDhCQUE4QjtFQUFFLENBQUMsQ0FBQztFQUU3RixNQUFNaUwsU0FBUyxHQUFHLE1BQU1tQyxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRSxHQUFHLENBQUM7RUFDeEQsTUFBTW1GLEtBQUssR0FBRyxNQUFNbkYsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBQWtGMFUscUJBQXFCLENBQUM7RUFDdkosTUFBTWUsZ0JBQWdCLEdBQUcsQ0FBQzFCLGNBQWMsQ0FBQzJCLEtBQUssR0FBRzNCLGNBQWMsQ0FBQ3lCLE9BQU8sSUFBSSxJQUFJO0VBQy9FOVcsTUFBTSxDQUFDNkYsS0FBSyxDQUFDNFAsWUFBWSxDQUFDLENBQUN6QixlQUFlLEVBQUFVLGtCQUFBLEdBQUM3TyxLQUFLLENBQUMyUCxXQUFXLGNBQUFkLGtCQUFBLGNBQUFBLGtCQUFBLEdBQUksQ0FBQyxDQUFDO0VBQ2xFMVUsTUFBTSxDQUFDLEVBQUEyVSxtQkFBQSxHQUFDOU8sS0FBSyxDQUFDNFAsWUFBWSxjQUFBZCxtQkFBQSxjQUFBQSxtQkFBQSxHQUFJLENBQUMsTUFBQUMsbUJBQUEsR0FBSy9PLEtBQUssQ0FBQzJQLFdBQVcsY0FBQVosbUJBQUEsY0FBQUEsbUJBQUEsR0FBSSxDQUFDLENBQUMsQ0FBQyxDQUFDcUMsc0JBQXNCLENBQUMsSUFBSyxDQUFDO0VBQzFGalgsTUFBTSxDQUFDNkYsS0FBSyxDQUFDNlAsU0FBUyxDQUFDLENBQUN1QixzQkFBc0IsRUFBQXBDLG9CQUFBLEdBQUNoUCxLQUFLLENBQUM0UCxZQUFZLGNBQUFaLG9CQUFBLGNBQUFBLG9CQUFBLEdBQUksQ0FBQyxDQUFDO0VBQ3ZFN1UsTUFBTSxDQUFDNkYsS0FBSyxDQUFDK1AsZUFBZSxDQUFDLENBQUNxQixzQkFBc0IsRUFBQW5DLGdCQUFBLEdBQUNqUCxLQUFLLENBQUM2UCxTQUFTLGNBQUFaLGdCQUFBLGNBQUFBLGdCQUFBLEdBQUksQ0FBQyxDQUFDO0VBQzFFOVUsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMsRUFBQTlCLHFCQUFBLEdBQUNsUCxLQUFLLENBQUNnUSxzQkFBc0IsY0FBQWQscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxDQUFDLE1BQUFDLHFCQUFBLEdBQUtuUCxLQUFLLENBQUM4UCxnQkFBZ0IsY0FBQVgscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMvRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7RUFDL0dqUSxNQUFNLEVBQUFpVixzQkFBQSxHQUFFcFAsS0FBSyxDQUFDOFAsZ0JBQWdCLGNBQUFWLHNCQUFBLGNBQUFBLHNCQUFBLEdBQUksQ0FBRSxDQUFDLENBQUNnQyxzQkFBc0IsQ0FBQzVCLGNBQWMsQ0FBQ3lCLE9BQU8sR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO0VBQ2xHOVcsTUFBTSxFQUFBa1YscUJBQUEsR0FBRXJQLEtBQUssQ0FBQ2tRLHFCQUFxQixjQUFBYixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLENBQUUsQ0FBQyxDQUFDK0Isc0JBQXNCLENBQUM1QixjQUFjLENBQUMyQixLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNyR2hYLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFFLEVBQUExQixzQkFBQSxHQUFDdFAsS0FBSyxDQUFDa1EscUJBQXFCLGNBQUFaLHNCQUFBLGNBQUFBLHNCQUFBLEdBQUksQ0FBQyxNQUFBQyxzQkFBQSxHQUFLdlAsS0FBSyxDQUFDZ1Esc0JBQXNCLGNBQUFULHNCQUFBLGNBQUFBLHNCQUFBLEdBQUksQ0FBQyxDQUFDLEdBQUkyQixnQkFBZ0IsQ0FBQyxDQUFDLENBQUM5RyxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7RUFDeElqUSxNQUFNLENBQUNrTCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRVEsUUFBUSxDQUFDLENBQUNzSSxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQzlDaFUsTUFBTSxDQUFDa0wsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVoRCxNQUFNLENBQUMsQ0FBQytMLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztFQUNuRGpVLE1BQU0sQ0FBQyxDQUFDa0wsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVPLEtBQUssRUFBZ0N5TCxhQUFhLENBQUMsQ0FBQ2xELGVBQWUsQ0FBQyxDQUFDLENBQUM7RUFDekZoVSxNQUFNLENBQUMsTUFBTStELGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQzZNLE9BQU8sQ0FBQztJQUFFL0wsaUJBQWlCLEVBQUUsQ0FBQztJQUFFQyxjQUFjLEVBQUU7RUFBRSxDQUFDLENBQUM7RUFDekYsTUFBTWYsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDhCQUE4QjtFQUFFLENBQUMsQ0FBQztFQUM3RixNQUFNTCxTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLG9DQUFvQyxDQUFDLEVBQUU0QixJQUFJLENBQUNJLFNBQVMsQ0FBQztJQUNqR3dMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUM5QnRCLE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3RDdUosS0FBSyxFQUFFLDREQUE0RDtJQUNuRUMsaUJBQWlCLEVBQUUsSUFBSztJQUN4Qi9CLGNBQWM7SUFDZDBCLGdCQUFnQjtJQUNoQlQsa0JBQWtCO0lBQ2xCZSxXQUFXLEVBQUV4UixLQUFLO0lBQ2xCeVIsa0JBQWtCLEVBQUVwTSxTQUFTO0lBQzdCcU0sV0FBVyxFQUFFLE1BQU14VCxnQkFBZ0IsQ0FBQ3JELElBQUk7RUFDMUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBRUYsS0FBSyxNQUFNK1MsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFXO0VBQ3hDMVQsSUFBSSxDQUFDLFVBQVUwVCxNQUFNLCtGQUErRixFQUFFLE9BQU87SUFBRS9TLElBQUk7SUFBRTJMO0VBQVEsQ0FBQyxLQUFLO0lBQUEsSUFBQW1MLEtBQUEsRUFBQUMsY0FBQSxFQUFBQyxxQkFBQSxFQUFBQyxrQkFBQSxFQUFBQyxpQkFBQTtJQUNqSjdYLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7SUFDdkIsTUFBTTNOLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztNQUFFQyxLQUFLLEVBQUUsSUFBSTtNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUM7SUFDeEQsTUFBTXJMLHFCQUFxQixDQUFDVCxJQUFJLENBQUM7SUFDakMsTUFBTUEsSUFBSSxDQUFDTSxJQUFJLENBQUMsMkNBQTJDeVMsTUFBTSxZQUFZLENBQUM7SUFDOUUsSUFBSUEsTUFBTSxLQUFLLEdBQUcsRUFBRSxNQUFNelQsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO01BQUUxSixJQUFJLEVBQUU7SUFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FDdEc7TUFDSCxNQUFNNU8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDNkIsV0FBVyxDQUFDLENBQUM7TUFDN0QsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQzZCLFdBQVcsQ0FBQyxDQUFDO01BQzFELE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM4SyxVQUFVLENBQUMsWUFBWSxDQUFDO0lBQ25GO0lBQ0EsTUFBTTdYLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFDN0VBLEtBQUssQ0FBQ0MsVUFBVSxJQUFJQyxnQkFBZ0IsQ0FBQ0MsaUJBQWlCLElBQUlILEtBQUssQ0FBQ0ksVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFO01BQUVqRixPQUFPLEVBQUU7SUFBTyxDQUFDLENBQUMsQ0FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsSCxNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQytLLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxTQUFTLENBQUM7SUFDOUYsTUFBTXBYLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUMwVCxLQUFLLENBQUNDLEtBQUssQ0FBQztJQUMvQyxNQUFNaFksTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsTUFBTTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ3VMLGNBQWMsQ0FBQyxDQUFDO0lBQ3RGLElBQUl4RSxNQUFNLEtBQUssR0FBRyxFQUFFO01BQ2xCLE1BQU16VCxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFBRTFKLElBQUksRUFBRTtNQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDa1YsY0FBYyxDQUFDLENBQUM7TUFDekYsTUFBTWpZLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDd1gsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUNELGNBQWMsQ0FBQyxDQUFDO0lBQ2hFLENBQUMsTUFBTTtNQUNMLE1BQU1qWSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUNrTCxjQUFjLENBQUMsQ0FBQztNQUN6RSxNQUFNalksTUFBTSxDQUFDVSxJQUFJLENBQUN3WCxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQ0QsY0FBYyxDQUFDLENBQUM7SUFDaEU7SUFDQSxNQUFNRSxRQUFRLEdBQUd6WCxJQUFJLENBQUNxTSxPQUFPLENBQUMsa0JBQWtCLENBQUM7SUFDakQsTUFBTXFMLGVBQWUsR0FBRyxNQUFNRCxRQUFRLENBQUNFLFdBQVcsQ0FBQyxDQUFDO0lBQ3BELE1BQU01WCxlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDakMsTUFBTVYsTUFBTSxDQUFDbVksUUFBUSxDQUFDLENBQUNuTCxhQUFhLENBQUMsaUJBQWlCLENBQUM7SUFDdkQsTUFBTXNMLGVBQWUsR0FBRyxNQUFNSCxRQUFRLENBQUNFLFdBQVcsQ0FBQyxDQUFDO0lBQ3BEclksTUFBTSxDQUFDc1ksZUFBZSxDQUFDLENBQUM1QixHQUFHLENBQUM1SixJQUFJLENBQUNzTCxlQUFlLENBQUM7SUFDakQsTUFBTTFYLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsdUJBQXVCO0lBQUUsQ0FBQyxDQUFDO0lBQ3BILE1BQU05WCxlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDakMsTUFBTVYsTUFBTSxDQUFDbVksUUFBUSxDQUFDLENBQUNOLFVBQVUsQ0FBQ08sZUFBZSxhQUFmQSxlQUFlLGNBQWZBLGVBQWUsR0FBSSxFQUFFLENBQUM7SUFDeEQsTUFBTXBZLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQzZELFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTTVRLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQzZELFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDM0UsTUFBTTVRLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUMrRCxNQUFNLENBQUM7TUFBRTBILE9BQU8sRUFBRTtJQUFXLENBQUMsQ0FBQyxDQUFDekwsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQzZELFdBQVcsQ0FBQyxDQUFDLENBQUM7SUFDcEksTUFBTTZILGFBQWEsR0FBRy9YLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxRQUFRO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUM7SUFDL0UsTUFBTTFNLE1BQU0sQ0FBQ3lZLGFBQWEsQ0FBQyxDQUFDOUwsV0FBVyxDQUFDLENBQUM7SUFDekMzTSxNQUFNLENBQUMsTUFBTStELGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQzZNLE9BQU8sQ0FBQztNQUFFL0wsaUJBQWlCLEVBQUUsQ0FBQztNQUFFQyxjQUFjLEVBQUU7SUFBRSxDQUFDLENBQUM7SUFDekYsTUFBTWlYLGNBQWMsR0FBRyxNQUFNaFksSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU07TUFDL0MsTUFBTTJVLE9BQU8sR0FBSUMsUUFBZ0IsSUFBSztRQUFBLElBQUFDLHFCQUFBLEVBQUFDLG9CQUFBO1FBQ3BDLE1BQU0vSixPQUFPLEdBQUcxSyxRQUFRLENBQUNnTCxhQUFhLENBQUN1SixRQUFRLENBQUM7UUFDaEQsSUFBSSxDQUFDN0osT0FBTyxFQUFFLE9BQU8sSUFBSTtRQUN6QixNQUFNZ0ssSUFBSSxHQUFHaEssT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVDLE1BQU1ILEtBQUssR0FBR0MsZ0JBQWdCLENBQUNGLE9BQU8sQ0FBQztRQUN2QyxPQUFPO1VBQ0xpSyxJQUFJLEdBQUFILHFCQUFBLElBQUFDLG9CQUFBLEdBQUUvSixPQUFPLENBQUNzSixXQUFXLGNBQUFTLG9CQUFBLHVCQUFuQkEsb0JBQUEsQ0FBcUJHLElBQUksQ0FBQyxDQUFDLGNBQUFKLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksRUFBRTtVQUN2Q0ssQ0FBQyxFQUFFSCxJQUFJLENBQUNHLENBQUM7VUFBRUMsQ0FBQyxFQUFFSixJQUFJLENBQUNJLENBQUM7VUFBRTVNLEtBQUssRUFBRXdNLElBQUksQ0FBQ3hNLEtBQUs7VUFBRUMsTUFBTSxFQUFFdU0sSUFBSSxDQUFDdk0sTUFBTTtVQUM1RHFELEtBQUssRUFBRWIsS0FBSyxDQUFDYSxLQUFLO1VBQUV1SixPQUFPLEVBQUVwSyxLQUFLLENBQUNvSyxPQUFPO1VBQUVDLFVBQVUsRUFBRXJLLEtBQUssQ0FBQ3FLLFVBQVU7VUFBRUMsT0FBTyxFQUFFdEssS0FBSyxDQUFDc0s7UUFDM0YsQ0FBQztNQUNILENBQUM7TUFDRCxPQUFPO1FBQ0xDLElBQUksRUFBRVosT0FBTyxDQUFDLFlBQVksQ0FBQztRQUFFYSxLQUFLLEVBQUViLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQztRQUNoRWhZLE1BQU0sRUFBRWdZLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztRQUFFYyxJQUFJLEVBQUVkLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNuRWUsV0FBVyxFQUFFclYsUUFBUSxDQUFDMFQsS0FBSyxDQUFDNEIsS0FBSyxDQUFDLHNCQUFzQixDQUFDO1FBQ3pEQyxZQUFZLEVBQUUzSyxnQkFBZ0IsQ0FBQzVLLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBRSxDQUFDLENBQUN3SyxVQUFVO1FBQ3RGbEosT0FBTyxFQUFFclAsTUFBTSxDQUFDcVA7TUFDbEIsQ0FBQztJQUNILENBQUMsQ0FBQztJQUNGLE1BQU1qUSxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHFCQUFxQjtJQUFFLENBQUMsQ0FBQztJQUVsSCxNQUFNdUIsUUFBUSxHQUFHLE1BQU1wWixJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQ2dOLFdBQVcsQ0FBQyxDQUFDO0lBQ3BFLE1BQU1DLElBQUksR0FBRyxNQUFNdFosSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUNnTixXQUFXLENBQUMsQ0FBQztJQUNoRSxNQUFNRSxRQUFRLEdBQUcsTUFBTXZaLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDZ04sV0FBVyxDQUFDLENBQUM7SUFDckUvWixNQUFNLENBQUM4WixRQUFRLENBQUMsQ0FBQ3BELEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7SUFDL0IzVyxNQUFNLENBQUNnYSxJQUFJLENBQUMsQ0FBQ3RELEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7SUFDM0IzVyxNQUFNLENBQUNpYSxRQUFRLENBQUMsQ0FBQ3ZELEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7SUFDL0IsSUFBSW1ELFFBQVEsRUFBRTtNQUFBLElBQUFJLE9BQUE7TUFDWixNQUFNQyxNQUFNLEdBQUdMLFFBQVEsQ0FBQ1osQ0FBQyxHQUFHWSxRQUFRLENBQUN2TixLQUFLLEdBQUcsQ0FBQztNQUM5QyxNQUFNNk4sYUFBYSxHQUFHLE1BQU0xWixJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTUssUUFBUSxDQUFDZ1csZUFBZSxDQUFDQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO01BQ3pGdGEsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUNzRCxNQUFNLEdBQUdDLGFBQWEsQ0FBQyxDQUFDLENBQUNuSyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7TUFDL0QsTUFBTXNKLElBQUksR0FBRyxNQUFNN1ksSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLE1BQU07UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDcU4sV0FBVyxDQUFDLENBQUM7TUFDeEYvWixNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQyxFQUFBcUQsT0FBQSxHQUFDWCxJQUFJLGFBQUpBLElBQUksdUJBQUpBLElBQUksQ0FBRUwsQ0FBQyxjQUFBZ0IsT0FBQSxjQUFBQSxPQUFBLEdBQUksQ0FBQyxHQUFHLElBQUlKLFFBQVEsQ0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQ2pKLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUN6RTtJQUNBLElBQUk2SixRQUFRLElBQUlyRyxNQUFNLEtBQUssR0FBRyxFQUFFO01BQzlCLE1BQU04RyxLQUFLLEdBQUcsTUFBTTdaLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQ2dOLFdBQVcsQ0FBQyxDQUFDO01BQy9EL1osTUFBTSxDQUFDdWEsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUVoTyxLQUFLLENBQUMsQ0FBQ08sSUFBSSxDQUFDLEdBQUcsQ0FBQztNQUM5QjlNLE1BQU0sQ0FBQ3VhLEtBQUssQ0FBRXJCLENBQUMsSUFBSVksUUFBUSxDQUFDWixDQUFDLEdBQUdZLFFBQVEsQ0FBQ3ZOLEtBQUssQ0FBQyxDQUFDLENBQUMwSyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7TUFDM0VqWCxNQUFNLENBQUM4WixRQUFRLENBQUNaLENBQUMsQ0FBQyxDQUFDakMsc0JBQXNCLENBQUMsRUFBRSxDQUFDO0lBQy9DO0lBQ0EsSUFBSStDLElBQUksSUFBSUMsUUFBUSxJQUFJeEcsTUFBTSxLQUFLLEdBQUcsRUFBRXpULE1BQU0sQ0FBQ2lhLFFBQVEsQ0FBQ2QsQ0FBQyxJQUFJYSxJQUFJLENBQUNiLENBQUMsR0FBR2EsSUFBSSxDQUFDeE4sTUFBTSxDQUFDLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUM5RyxNQUFNdUQsa0JBQWtCLEdBQUcsTUFBQUEsQ0FBQSxLQUFZO01BQ3JDLElBQUkvRyxNQUFNLEtBQUssR0FBRyxFQUFFO01BQ3BCLE1BQU12RSxNQUFNLEdBQUcsTUFBTXhPLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxPQUFPO1FBQ3hDeVcsTUFBTSxFQUFFcFcsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUVGLHFCQUFxQixDQUFDLENBQUMsQ0FBQ2dLLENBQUM7UUFDNUV1QixNQUFNLEVBQUVyVyxRQUFRLENBQUNnTCxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUVGLHFCQUFxQixDQUFDLENBQUMsQ0FBQ2dLO01BQzNFLENBQUMsQ0FBQyxDQUFDO01BQ0huWixNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQzNILE1BQU0sQ0FBQ3dMLE1BQU0sR0FBR3hMLE1BQU0sQ0FBQ3VMLE1BQU0sQ0FBQyxDQUFDLENBQUN4SyxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUNELE1BQU11SyxrQkFBa0IsQ0FBQyxDQUFDO0lBRTFCLE1BQU05WixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsVUFBVTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3pFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQyxDQUFDLENBQUNKLGVBQWUsQ0FBQyxHQUFHLENBQUM7SUFDNUgsTUFBTXRULElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxPQUFPO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDdEUsTUFBTWxNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxRQUFRO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDdkUsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTlJLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLEVBQUVlLGNBQWMsQ0FBQyxDQUFDcUwsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVwRixNQUFNcE0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLFFBQVE7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNOUksZ0JBQWdCLENBQUNyRCxJQUFJLENBQUMsRUFBRWUsY0FBYyxDQUFDLENBQUNxTCxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLE1BQU0wTixrQkFBa0IsQ0FBQyxDQUFDO0lBQzFCLE1BQU1HLGVBQWUsR0FBR2xILE1BQU0sS0FBSyxHQUFHLEdBQUcvUyxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsR0FBR3JNLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQztJQUMxSCxNQUFNL00sTUFBTSxDQUFDMmEsZUFBZSxDQUFDLENBQUMzTixhQUFhLENBQUMsaUVBQWlFLENBQUM7SUFDOUcsTUFBTWhOLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQTRDLENBQUMsQ0FBQyxDQUFDLENBQUM2TixXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzVHLE1BQU12RCxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRStTLE1BQU0sQ0FBQztJQUN6QyxNQUFNK0csa0JBQWtCLENBQUMsQ0FBQztJQUMxQixNQUFNOVosSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyx5QkFBeUI7SUFBRSxDQUFDLENBQUM7SUFFdEgsTUFBTXFDLEtBQUssR0FBR2xhLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUM7SUFDbkMsTUFBTXJNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxXQUFXO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDMUUsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNK04sS0FBSyxDQUFDNVcsUUFBUSxDQUFFK0ssT0FBeUIsSUFBS0EsT0FBTyxDQUFDcUYsV0FBVyxDQUFDLENBQUMsQ0FBQ0osZUFBZSxDQUFDLElBQUksQ0FBQztJQUNqSGhVLE1BQU0sQ0FBQyxNQUFNNGEsS0FBSyxDQUFDQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQ3pLLFNBQVMsQ0FBQyxPQUFPLENBQUM7SUFFMUQsSUFBSXFELE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFBQSxJQUFBcUgsS0FBQSxFQUFBQyxxQkFBQTtNQUNsQixNQUFNcmEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLE1BQU07UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztNQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQ21DLFdBQVcsQ0FBQyxDQUFDO01BQ3BELE1BQU1sTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7UUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsdUNBQXVDO01BQUUsQ0FBQyxDQUFDO01BQ3RHLE1BQU1TLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQ0EsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLFdBQVc7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDc08sSUFBSSxDQUFDLENBQUMsQ0FBQ3BPLEtBQUssQ0FBQyxDQUFDO01BQ3JHLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDd08sVUFBVSxDQUFDLENBQUM7TUFDbkQsTUFBTUMsWUFBWSxHQUFHLE1BQU16UixhQUFhLENBQUMvSSxJQUFJLENBQUM7TUFDOUNWLE1BQU0sQ0FBQzJDLE1BQU0sQ0FBQzRQLE1BQU0sRUFBQXVJLEtBQUEsSUFBQUMscUJBQUEsR0FBQ0csWUFBWSxDQUFDNVEsT0FBTyxjQUFBeVEscUJBQUEsdUJBQXBCQSxxQkFBQSxDQUFzQmxRLGNBQWMsY0FBQWlRLEtBQUEsY0FBQUEsS0FBQSxHQUE4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMzTixZQUFZLENBQUMsQ0FBQyxDQUFDO01BQzNHLE1BQU1nTyxvQkFBb0IsR0FBRyxNQUFNcFgsZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7TUFDekQsTUFBTUEsSUFBSSxDQUFDMGEsTUFBTSxDQUFDLENBQUM7TUFDbkIsTUFBTXBiLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLFdBQVc7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO01BQ3hGM00sTUFBTSxDQUFDLE1BQU0rRCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxDQUFDLENBQUM2TSxPQUFPLENBQUM0TixvQkFBb0IsQ0FBQztNQUNsRSxNQUFNemEsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDBDQUEwQztNQUFFLENBQUMsQ0FBQztJQUMzRztJQUVBLE1BQU1TLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztNQUFFQyxLQUFLLEVBQUUsR0FBRztNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUM7SUFDdkQsSUFBSWlILE1BQU0sS0FBSyxHQUFHLEVBQUUsTUFBTXpULE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM2TCxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQ3RHO01BQ0gsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQzZCLFdBQVcsQ0FBQyxDQUFDO01BQ3RFLE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFBRTFKLElBQUksRUFBRTtNQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUM7TUFDdEYsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDd1gsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUN0SixXQUFXLENBQUMsQ0FBQztJQUM3RDtJQUNBLE1BQU15TSxrQkFBa0IsR0FBRyxNQUFNM2EsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQ2lCLFdBQVcsR0FBR2hhLE1BQU0sQ0FBQ2lhLFVBQVUsQ0FBQztJQUM5R3ZiLE1BQU0sQ0FBQ3FiLGtCQUFrQixDQUFDLENBQUN2TyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3RDLE1BQU1yTSxlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDakMsTUFBTVYsTUFBTSxDQUFDbVksUUFBUSxDQUFDLENBQUNuTCxhQUFhLENBQUMsaUJBQWlCLENBQUM7SUFDdkRoTixNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQ2lCLFdBQVcsR0FBR2hhLE1BQU0sQ0FBQ2lhLFVBQVUsQ0FBQyxDQUFDLENBQUN6TyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ3ZHLE1BQU0wTyxVQUFVLEdBQUcsTUFBTTlhLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDZ04sV0FBVyxDQUFDLENBQUM7SUFDckUvWixNQUFNLENBQUN3YixVQUFVLGFBQVZBLFVBQVUsdUJBQVZBLFVBQVUsQ0FBRWhQLE1BQU0sQ0FBQyxDQUFDeUssc0JBQXNCLENBQUMsRUFBRSxDQUFDO0lBQ3JELE1BQU12VyxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHNCQUFzQjtJQUFFLENBQUMsQ0FBQztJQUNuSCxNQUFNOVgsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU1BLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsb0JBQW9CO0lBQUUsQ0FBQyxDQUFDO0lBQ2pILE1BQU03WCxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBRXhELE1BQU05TCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsTUFBTTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLElBQUlrTixNQUFNLENBQUMsb0JBQW9CLENBQUMsQ0FBQztJQUM5RCxNQUFNaGIsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU1WLE1BQU0sQ0FBQ21ZLFFBQVEsQ0FBQyxDQUFDbkwsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0lBQ3ZELE1BQU10TSxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHFCQUFxQjtJQUFFLENBQUMsQ0FBQztJQUNsSCxNQUFNOVgsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU00TixtQkFBbUIsQ0FBQzVOLElBQUksRUFBRStTLE1BQU0sQ0FBQztJQUN2QyxNQUFNL1MsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLE1BQU07TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxJQUFJa04sTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDOUQsTUFBTWhiLGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNqQyxNQUFNVixNQUFNLENBQUNtWSxRQUFRLENBQUMsQ0FBQ25MLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztJQUN2RCxNQUFNdE0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyxxQkFBcUI7SUFBRSxDQUFDLENBQUM7SUFDbEgsTUFBTTlYLGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNqQyxNQUFNNE4sbUJBQW1CLENBQUM1TixJQUFJLEVBQUUrUyxNQUFNLENBQUM7SUFFdkMsTUFBTWxKLEtBQUssR0FBRyxNQUFNZCxhQUFhLENBQUMvSSxJQUFJLENBQUM7SUFDdkNWLE1BQU0sQ0FBQ3VLLEtBQUssQ0FBQ0EsS0FBSyxDQUFDdUcsTUFBTSxDQUFFNUYsU0FBUyxJQUFLQSxTQUFTLENBQUNJLE9BQU8sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDNkIsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUM1Rm5OLE1BQU0sQ0FBQzJDLE1BQU0sQ0FBQzRQLE1BQU0sRUFBQWlGLEtBQUEsSUFBQUMsY0FBQSxHQUFDbE4sS0FBSyxDQUFDRCxPQUFPLGNBQUFtTixjQUFBLHVCQUFiQSxjQUFBLENBQWU1TSxjQUFjLGNBQUEyTSxLQUFBLGNBQUFBLEtBQUEsR0FBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDckssWUFBWSxDQUFDLENBQUMsQ0FBQztJQUNwRyxNQUFNek0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQywrQkFBK0I7SUFBRSxDQUFDLENBQUM7SUFFNUgsSUFBSTlFLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFDbEIsTUFBTS9TLElBQUksQ0FBQ2diLEtBQUssQ0FBQywwQkFBMEIsRUFBR0EsS0FBSyxJQUFLQSxLQUFLLENBQUNDLE9BQU8sQ0FBQztRQUFFQyxNQUFNLEVBQUUsR0FBRztRQUFFQyxJQUFJLEVBQUU7TUFBNkMsQ0FBQyxDQUFDLENBQUM7TUFDM0ksTUFBTW5iLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztRQUFFQyxLQUFLLEVBQUUsR0FBRztRQUFFQyxNQUFNLEVBQUU7TUFBSSxDQUFDLENBQUM7TUFDdkQsTUFBTTlMLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNMUMsTUFBTSxDQUFDd2EsUUFBUSxDQUFDLENBQUMsRUFBRXpYLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCLFlBQVksQ0FBQyxDQUFDO01BQ3BGL2IsTUFBTSxDQUFDLE1BQU1VLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNMUMsTUFBTSxDQUFDcVAsT0FBTyxDQUFDLENBQUMsQ0FBQ3FELGVBQWUsQ0FBQyxDQUFDLENBQUM7TUFDcEUsTUFBTXRULElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQzFJLFFBQVEsQ0FBRWdZLE1BQXlCLElBQUtBLE1BQU0sQ0FBQ3BQLEtBQUssQ0FBQyxDQUFDLENBQUM7TUFDckgsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsOEJBQThCLENBQUM7TUFDNUQsTUFBTXZPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUFFMUosSUFBSSxFQUFFO01BQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQ2tWLGNBQWMsQ0FBQyxDQUFDO01BQ2pGLE1BQU1qWSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNMUMsTUFBTSxDQUFDcVAsT0FBTyxDQUFDLENBQUMsQ0FBQzdELElBQUksQ0FBQyxDQUFDLENBQUM7TUFDcEUsTUFBTTlNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDO1FBQUEsSUFBQWlZLHNCQUFBO1FBQUEsUUFBQUEsc0JBQUEsR0FBTTVYLFFBQVEsQ0FBQ29NLGFBQWEsY0FBQXdMLHNCQUFBLHVCQUF0QkEsc0JBQUEsQ0FBd0JDLE9BQU87TUFBQSxFQUFDLENBQUMsQ0FBQ3BQLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDeEYsTUFBTXBNLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztRQUFFQyxLQUFLLEVBQUUsSUFBSTtRQUFFQyxNQUFNLEVBQUU7TUFBSSxDQUFDLENBQUM7SUFDMUQsQ0FBQyxNQUFNO01BQ0wsTUFBTTlMLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7TUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUNtQyxXQUFXLENBQUMsQ0FBQztNQUNwRCxNQUFNbE8sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLGdCQUFnQjtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO01BQy9FLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLDJFQUEyRSxDQUFDO01BQ3pHLE1BQU03TixJQUFJLENBQUNxUyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQ25HLEtBQUssQ0FBQyxDQUFDO01BQ3hELE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLGtFQUFrRSxDQUFDO01BQ2hHLE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUNxRixXQUFXLENBQUMsQ0FBQztJQUN6RTtJQUVBLElBQUkrSixhQUFhLEdBQUcsTUFBTTFTLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztJQUM3Q1YsTUFBTSxFQUFBMFgscUJBQUEsR0FBQ3lFLGFBQWEsQ0FBQzdSLE9BQU8sY0FBQW9OLHFCQUFBLHVCQUFyQkEscUJBQUEsQ0FBdUI1TSx1QkFBdUIsQ0FBQyxDQUFDNEQsVUFBVSxDQUFDLENBQUM7SUFDbkUxTyxNQUFNLENBQUNtYyxhQUFhLENBQUMxUixTQUFTLENBQUMsQ0FBQzBDLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDL0MsTUFBTWxCLFFBQVEsR0FBR2tRLGFBQWEsQ0FBQzFSLFNBQVMsQ0FBQyxDQUFDLENBQXVFO0lBQ2pIekssTUFBTSxDQUFDaU0sUUFBUSxDQUFDRSxhQUFhLENBQUMsQ0FBQ1csSUFBSSxDQUFDLG9CQUFvQixDQUFDO0lBQ3pEOU0sTUFBTSxDQUFDaU0sUUFBUSxDQUFDRyxLQUFLLENBQUMsQ0FBQ2UsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUN0Q25OLE1BQU0sQ0FBQ2lNLFFBQVEsQ0FBQ0MsYUFBYSxDQUFDLENBQUMrSCxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFFeEQsSUFBSVIsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUFBLElBQUEySSxzQkFBQSxFQUFBQyxzQkFBQTtNQUNsQixNQUFNdlEsVUFBVSxHQUFHakYsTUFBTSxFQUFBdVYsc0JBQUEsSUFBQUMsc0JBQUEsR0FBQ0YsYUFBYSxDQUFDN1IsT0FBTyxjQUFBK1Isc0JBQUEsdUJBQXJCQSxzQkFBQSxDQUF1QnRSLHNCQUFzQixjQUFBcVIsc0JBQUEsY0FBQUEsc0JBQUEsR0FBSSxFQUFFLENBQUM7TUFDOUVwYyxNQUFNLENBQUM4TCxVQUFVLENBQUMsQ0FBQzRDLFVBQVUsQ0FBQyxDQUFDO01BQy9CLE1BQU1oTyxJQUFJLENBQUNNLElBQUksQ0FBQyxzREFBc0RzYixrQkFBa0IsQ0FBQ3hRLFVBQVUsQ0FBQyxFQUFFLENBQUM7SUFDekc7SUFDQSxNQUFNOUwsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO01BQUUxSixJQUFJLEVBQUU7SUFBYyxDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUM7SUFDOUUsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUMrRCxNQUFNLENBQUM7TUFBRTBILE9BQU8sRUFBRTtJQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM1SixXQUFXLENBQUMsQ0FBQztJQUM1RyxNQUFNNU8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7SUFDN0RwUyxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU0xQyxNQUFNLENBQUNxUCxPQUFPLENBQUMsQ0FBQyxDQUFDN0QsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN6RDlNLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQzhCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQy9CLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDNUU5TSxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG1DQUFtQyxDQUFDLENBQUMrRCxNQUFNLENBQUM7TUFBRTBILE9BQU8sRUFBRTtJQUFzQixDQUFDLENBQUMsQ0FBQ3pMLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDOEIsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVwSixJQUFJMkcsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNsQixNQUFNelQsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQUUxSixJQUFJLEVBQUUsZ0JBQWdCO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDa0MsV0FBVyxDQUFDLENBQUM7TUFDN0YsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDNmIsU0FBUyxDQUFDLGtHQUFrRyxDQUFDLENBQUMsQ0FBQzNOLFdBQVcsQ0FBQyxDQUFDO01BQzlJLE1BQU1sTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7UUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUseUNBQXlDO01BQUUsQ0FBQyxDQUFDO01BQ3hHLE1BQU1TLElBQUksQ0FBQzhiLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQztNQUM5QyxNQUFNOWIsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLGdCQUFnQjtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ2pGO0lBRUEsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDNmIsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQzNOLFdBQVcsQ0FBQztNQUFFM0IsT0FBTyxFQUFFO0lBQU8sQ0FBQyxDQUFDO0lBQzFGLE1BQU13UCxXQUFXLEdBQUcvYixJQUFJLENBQUNxUyxXQUFXLENBQUMsY0FBYyxDQUFDO0lBQ3BELE1BQU0vUyxNQUFNLENBQUN5YyxXQUFXLENBQUMsQ0FBQzNFLGVBQWUsQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDO0lBQy9ELE1BQU05WCxNQUFNLENBQUN5YyxXQUFXLENBQUMsQ0FBQzNFLGVBQWUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDO0lBQzFELE1BQU05WCxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ0ksVUFBVSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUNwRixJQUFJLENBQUMsSUFBSSxDQUFDO0lBQzNHLE1BQU05TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25HLE1BQU02UCxxQkFBcUIsR0FBRyxNQUFNRixXQUFXLENBQUM1QixZQUFZLENBQUMsb0JBQW9CLENBQUM7SUFDbEY3YSxNQUFNLENBQUMyYyxxQkFBcUIsQ0FBQyxDQUFDMUksT0FBTyxDQUFDLGNBQWMsQ0FBQztJQUNyRCxNQUFNdlQsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyw0QkFBNEI7SUFBRSxDQUFDLENBQUM7SUFDekgsTUFBTXFFLFlBQVksR0FBRyxNQUFNbGMsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU07TUFDN0MsTUFBTWtMLE1BQU0sR0FBSTBKLFFBQWdCLElBQUs7UUFDbkMsTUFBTTdKLE9BQU8sR0FBRzFLLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQ3VKLFFBQVEsQ0FBQztRQUNoRCxJQUFJLENBQUM3SixPQUFPLEVBQUUsT0FBTyxJQUFJO1FBQ3pCLE1BQU1nSyxJQUFJLEdBQUdoSyxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7UUFDNUMsT0FBTztVQUFFK0osQ0FBQyxFQUFFSCxJQUFJLENBQUNHLENBQUM7VUFBRUMsQ0FBQyxFQUFFSixJQUFJLENBQUNJLENBQUM7VUFBRTVNLEtBQUssRUFBRXdNLElBQUksQ0FBQ3hNLEtBQUs7VUFBRUMsTUFBTSxFQUFFdU0sSUFBSSxDQUFDdk0sTUFBTTtVQUFFaUQsTUFBTSxFQUFFc0osSUFBSSxDQUFDdEo7UUFBTyxDQUFDO01BQzlGLENBQUM7TUFDRCxPQUFPO1FBQ0wrSixLQUFLLEVBQUV0SyxNQUFNLENBQUMsbUJBQW1CLENBQUM7UUFDbENxSyxJQUFJLEVBQUVySyxNQUFNLENBQUMsMkJBQTJCLENBQUM7UUFDekMyTixNQUFNLEVBQUUzTixNQUFNLENBQUMsd0JBQXdCLENBQUM7UUFDeEM0TixJQUFJLEVBQUU1TixNQUFNLENBQUMsc0JBQXNCLENBQUM7UUFDcEMrSyxRQUFRLEVBQUUvSyxNQUFNLENBQUMsK0JBQStCO01BQ2xELENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRixNQUFNdFAsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsK0JBQStCLENBQUMsRUFBRTFXLElBQUksQ0FBQ0ksU0FBUyxDQUFDMmEsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7SUFDM0o1YyxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQytGLFlBQVksQ0FBQ3BELEtBQUssQ0FBRUwsQ0FBQyxJQUFJMUYsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDeEQsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzNGalEsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMrRixZQUFZLENBQUNyRCxJQUFJLENBQUVKLENBQUMsSUFBSTFGLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQ3hELG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUMxRmpRLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDK0YsWUFBWSxDQUFDQyxNQUFNLENBQUUxRCxDQUFDLElBQUkxRixNQUFNLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUN4RCxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDOUZqUSxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQytGLFlBQVksQ0FBQ0MsTUFBTSxDQUFFdFEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMwRCxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDekVqUSxNQUFNLENBQUM0YyxZQUFZLENBQUNFLElBQUksQ0FBRXJOLE1BQU0sQ0FBQyxDQUFDUSxtQkFBbUIsQ0FBQzJNLFlBQVksQ0FBQzNDLFFBQVEsQ0FBRWQsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuRixJQUFJMUYsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNsQixNQUFNaFQsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO01BQ2pDLE1BQU1WLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUFFMUosSUFBSSxFQUFFO01BQWdCLENBQUMsQ0FBQyxDQUFDLENBQUM2TCxXQUFXLENBQUMsQ0FBQztNQUNoRixNQUFNbE8sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLGlDQUFpQztNQUFFLENBQUMsQ0FBQztNQUNoRyxNQUFNUSxlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7TUFDakMsTUFBTVYsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO1FBQUUxSixJQUFJLEVBQUU7TUFBYyxDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUM7SUFDaEY7SUFDQSxNQUFNbE8sSUFBSSxDQUFDNEwsZUFBZSxDQUFDbUgsTUFBTSxLQUFLLEdBQUcsR0FBRztNQUFFbEgsS0FBSyxFQUFFLEdBQUc7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxHQUFHO01BQUVELEtBQUssRUFBRSxHQUFHO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsQ0FBQztJQUN0RyxNQUFNeE0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTUssUUFBUSxDQUFDZ1csZUFBZSxDQUFDaUIsV0FBVyxJQUFJaGEsTUFBTSxDQUFDaWEsVUFBVSxDQUFDLENBQUMsQ0FBQ3pPLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEgsTUFBTTlNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLDJCQUEyQixDQUFDLENBQUMvSSxRQUFRLENBQUUrSyxPQUFPLElBQUtFLGdCQUFnQixDQUFDRixPQUFPLENBQUMsQ0FBQ2dPLFNBQVMsQ0FBQyxDQUFDLENBQUNqUSxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQzFJLE1BQU1rUSxXQUFXLEdBQUcsTUFBTXRjLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO01BQzVDLE1BQU1rTCxNQUFNLEdBQUkwSixRQUFnQixJQUFLO1FBQ25DLE1BQU03SixPQUFPLEdBQUcxSyxRQUFRLENBQUNnTCxhQUFhLENBQUN1SixRQUFRLENBQUM7UUFDaEQsSUFBSSxDQUFDN0osT0FBTyxFQUFFLE9BQU8sSUFBSTtRQUN6QixNQUFNZ0ssSUFBSSxHQUFHaEssT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVDLE9BQU87VUFBRStKLENBQUMsRUFBRUgsSUFBSSxDQUFDRyxDQUFDO1VBQUVDLENBQUMsRUFBRUosSUFBSSxDQUFDSSxDQUFDO1VBQUU1TSxLQUFLLEVBQUV3TSxJQUFJLENBQUN4TSxLQUFLO1VBQUVDLE1BQU0sRUFBRXVNLElBQUksQ0FBQ3ZNLE1BQU07VUFBRWlELE1BQU0sRUFBRXNKLElBQUksQ0FBQ3RKO1FBQU8sQ0FBQztNQUM5RixDQUFDO01BQ0QsT0FBTztRQUNMb04sTUFBTSxFQUFFM04sTUFBTSxDQUFDLHdCQUF3QixDQUFDO1FBQ3hDcUssSUFBSSxFQUFFckssTUFBTSxDQUFDLDJCQUEyQixDQUFDO1FBQ3pDc0ssS0FBSyxFQUFFdEssTUFBTSxDQUFDLG1CQUFtQixDQUFDO1FBQ2xDNE4sSUFBSSxFQUFFNU4sTUFBTSxDQUFDLHNCQUFzQixDQUFDO1FBQ3BDK0ssUUFBUSxFQUFFL0ssTUFBTSxDQUFDLCtCQUErQixDQUFDO1FBQ2pEK04sTUFBTSxFQUFFL04sTUFBTSxDQUFDLDhCQUE4QixDQUFDO1FBQzlDZ08sTUFBTSxFQUFFaE8sTUFBTSxDQUFDLG9DQUFvQyxDQUFDO1FBQ3BEaU8sT0FBTyxFQUFFblUsS0FBSyxDQUFDQyxJQUFJLENBQUM1RSxRQUFRLENBQUMrWSxnQkFBZ0IsQ0FBQyxvQ0FBb0MsQ0FBQyxFQUFHck8sT0FBTyxJQUFLO1VBQ2hHLE1BQU1nSyxJQUFJLEdBQUdoSyxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7VUFDNUMsT0FBTztZQUFFK0osQ0FBQyxFQUFFSCxJQUFJLENBQUNHLENBQUM7WUFBRUMsQ0FBQyxFQUFFSixJQUFJLENBQUNJLENBQUM7WUFBRTVNLEtBQUssRUFBRXdNLElBQUksQ0FBQ3hNLEtBQUs7WUFBRUMsTUFBTSxFQUFFdU0sSUFBSSxDQUFDdk0sTUFBTTtZQUFFaUQsTUFBTSxFQUFFc0osSUFBSSxDQUFDdEo7VUFBTyxDQUFDO1FBQzlGLENBQUM7TUFDSCxDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBQ0YsTUFBTS9PLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMseUJBQXlCLENBQUM7TUFBRXpGLFFBQVEsRUFBRTtJQUFLLENBQUMsQ0FBQztJQUN0SSxNQUFNbFQsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsNEJBQTRCLENBQUMsRUFBRTFXLElBQUksQ0FBQ0ksU0FBUyxDQUFDK2EsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7SUFDdkpoZCxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQ21HLFdBQVcsQ0FBQ0gsTUFBTSxDQUFFM0QsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUNqSixtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDbkVqUSxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQ21HLFdBQVcsQ0FBQ0gsTUFBTSxDQUFFdFEsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMwRCxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDeEVqUSxNQUFNLENBQUNnZCxXQUFXLENBQUNILE1BQU0sQ0FBRTFELENBQUMsQ0FBQyxDQUFDck0sSUFBSSxDQUFDMkcsTUFBTSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQzlEelQsTUFBTSxDQUFDZ2QsV0FBVyxDQUFDekQsSUFBSSxDQUFFSixDQUFDLENBQUMsQ0FBQ3JNLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDcEM5TSxNQUFNLENBQUNnZCxXQUFXLENBQUN4RCxLQUFLLENBQUVMLENBQUMsQ0FBQyxDQUFDck0sSUFBSSxDQUFDMkcsTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQzNEelQsTUFBTSxDQUFDZ2QsV0FBVyxDQUFDRixJQUFJLENBQUV0USxNQUFNLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUMzRGpYLE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQy9DLFFBQVEsQ0FBRXpOLE1BQU0sQ0FBQyxDQUFDeUssc0JBQXNCLENBQUMsRUFBRSxDQUFDO0lBQy9EalgsTUFBTSxDQUFDZ2QsV0FBVyxDQUFDQyxNQUFNLENBQUV6USxNQUFNLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUM3RGpYLE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQ0UsTUFBTSxDQUFFMVEsTUFBTSxDQUFDLENBQUN5SyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDN0RqWCxNQUFNLENBQUNnZCxXQUFXLENBQUNHLE9BQU8sQ0FBQyxDQUFDaFEsWUFBWSxDQUFDLENBQUMsQ0FBQztJQUMzQ25OLE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQ0csT0FBTyxDQUFDRSxLQUFLLENBQUVDLE1BQU0sSUFBS0EsTUFBTSxDQUFDOVEsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUNNLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDN0U5TSxNQUFNLENBQUNnZCxXQUFXLENBQUNHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBRWhFLENBQUMsQ0FBQyxDQUFDbkYsZUFBZSxDQUFDZ0osV0FBVyxDQUFDRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUVoRSxDQUFDLENBQUM7SUFDNUUsTUFBTXpZLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztNQUFFQyxLQUFLLEVBQUUsSUFBSTtNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUM7SUFDeEQsTUFBTXhNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCLFlBQVksSUFBSXphLE1BQU0sQ0FBQ2ljLFdBQVcsQ0FBQyxDQUFDLENBQUN6USxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BILE1BQU0wUSxXQUFXLEdBQUcsTUFBTTljLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO01BQzVDLE1BQU1rTCxNQUFNLEdBQUkwSixRQUFnQixJQUFLO1FBQ25DLE1BQU03SixPQUFPLEdBQUcxSyxRQUFRLENBQUNnTCxhQUFhLENBQUN1SixRQUFRLENBQUM7UUFDaEQsSUFBSSxDQUFDN0osT0FBTyxFQUFFLE9BQU8sSUFBSTtRQUN6QixNQUFNZ0ssSUFBSSxHQUFHaEssT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVDLE9BQU87VUFBRStKLENBQUMsRUFBRUgsSUFBSSxDQUFDRyxDQUFDO1VBQUVDLENBQUMsRUFBRUosSUFBSSxDQUFDSSxDQUFDO1VBQUU1TSxLQUFLLEVBQUV3TSxJQUFJLENBQUN4TSxLQUFLO1VBQUVDLE1BQU0sRUFBRXVNLElBQUksQ0FBQ3ZNLE1BQU07VUFBRWlELE1BQU0sRUFBRXNKLElBQUksQ0FBQ3RKO1FBQU8sQ0FBQztNQUM5RixDQUFDO01BQ0QsT0FBTztRQUNMZ08sY0FBYyxFQUFFcFosUUFBUSxDQUFDZ1csZUFBZSxDQUFDMEIsWUFBWTtRQUNyRHZDLEtBQUssRUFBRXRLLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztRQUNsQ3FLLElBQUksRUFBRXJLLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQztRQUN6Q3dPLE1BQU0sRUFBRXhPLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUNoQzJOLE1BQU0sRUFBRTNOLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQztRQUN4Q3lPLElBQUksRUFBRXpPLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQztRQUN6QzROLElBQUksRUFBRTVOLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQztRQUNwQytLLFFBQVEsRUFBRS9LLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQztRQUNqRDBPLE9BQU8sRUFBRTFPLE1BQU0sQ0FBQyw0QkFBNEIsQ0FBQztRQUM3Q2lPLE9BQU8sRUFBRWpPLE1BQU0sQ0FBQyw0QkFBNEI7TUFDOUMsQ0FBQztJQUNILENBQUMsQ0FBQztJQUNGLE1BQU14TyxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLDRCQUE0QjtJQUFFLENBQUMsQ0FBQztJQUN6SCxNQUFNM1ksU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsK0JBQStCLENBQUMsRUFBRTFXLElBQUksQ0FBQ0ksU0FBUyxDQUFDdWIsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7SUFDMUp4ZCxNQUFNLENBQUN3ZCxXQUFXLENBQUNDLGNBQWMsQ0FBQyxDQUFDeE4sbUJBQW1CLENBQUMsR0FBRyxDQUFDO0lBQzNEalEsTUFBTSxFQUFBMlgsa0JBQUEsR0FBQzZGLFdBQVcsQ0FBQ2hFLEtBQUssY0FBQTdCLGtCQUFBLHVCQUFqQkEsa0JBQUEsQ0FBbUJ3QixDQUFDLENBQUMsQ0FBQ3JNLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDckM5TSxNQUFNLEVBQUE0WCxpQkFBQSxHQUFDNEYsV0FBVyxDQUFDakUsSUFBSSxjQUFBM0IsaUJBQUEsdUJBQWhCQSxpQkFBQSxDQUFrQnVCLENBQUMsQ0FBQyxDQUFDck0sSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNwQzlNLE1BQU0sQ0FBQ3dkLFdBQVcsQ0FBQ2hFLEtBQUssQ0FBRS9KLE1BQU0sQ0FBQyxDQUFDUSxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7SUFDMUQsTUFBTTROLFdBQVcsR0FBR3BLLE1BQU0sS0FBSyxHQUFHLEdBQUc7TUFBRTBGLENBQUMsRUFBRSxFQUFFO01BQUU1TSxLQUFLLEVBQUU7SUFBSSxDQUFDLEdBQUc7TUFBRTRNLENBQUMsRUFBRSxFQUFFO01BQUU1TSxLQUFLLEVBQUU7SUFBSSxDQUFDO0lBQ2xGdk0sTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMyRyxXQUFXLENBQUNYLE1BQU0sQ0FBRTFELENBQUMsR0FBRzBFLFdBQVcsQ0FBQzFFLENBQUMsQ0FBQyxDQUFDLENBQUNsSixtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDOUVqUSxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQzJHLFdBQVcsQ0FBQ1gsTUFBTSxDQUFFdFEsS0FBSyxHQUFHc1IsV0FBVyxDQUFDdFIsS0FBSyxDQUFDLENBQUMsQ0FBQzBELG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUN0RmpRLE1BQU0sQ0FBQ3dkLFdBQVcsQ0FBQ1YsSUFBSSxDQUFFck4sTUFBTSxDQUFDLENBQUNRLG1CQUFtQixDQUFDdU4sV0FBVyxDQUFDdkQsUUFBUSxDQUFFZCxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pGblosTUFBTSxDQUFDd2QsV0FBVyxDQUFDTCxPQUFPLENBQUUzUSxNQUFNLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUM5RGpYLE1BQU0sQ0FBQ3dkLFdBQVcsQ0FBQ0wsT0FBTyxDQUFFMU4sTUFBTSxDQUFDLENBQUNRLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUM1RCxNQUFNdlAsSUFBSSxDQUFDNEwsZUFBZSxDQUFDO01BQUVDLEtBQUssRUFBRSxJQUFJO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsQ0FBQztJQUV4RCxNQUFNc1IsY0FBYyxHQUFHcGQsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUMrRCxNQUFNLENBQUM7TUFBRTBILE9BQU8sRUFBRTtJQUFXLENBQUMsQ0FBQztJQUN6RyxNQUFNdUYsU0FBUyxHQUFHcmQsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG9DQUFvQyxDQUFDLENBQUMrRCxNQUFNLENBQUM7TUFBRTBILE9BQU8sRUFBRTtJQUFTLENBQUMsQ0FBQztJQUNsRyxNQUFNeFksTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDK0ssZUFBZSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUM7SUFDMUYsTUFBTTlYLE1BQU0sQ0FBQzhkLGNBQWMsQ0FBQyxDQUFDaEcsZUFBZSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUM7SUFDckUsTUFBTWdHLGNBQWMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDNUIsTUFBTXRkLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ0MsS0FBSyxDQUFDLE9BQU8sQ0FBQztJQUNsQyxNQUFNbGUsTUFBTSxDQUFDOGQsY0FBYyxDQUFDLENBQUNoRyxlQUFlLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUNwRSxNQUFNOVgsTUFBTSxDQUFDeWMsV0FBVyxDQUFDLENBQUMzRSxlQUFlLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQztJQUNwRSxNQUFNcFgsSUFBSSxDQUFDdWQsUUFBUSxDQUFDQyxLQUFLLENBQUMsWUFBWSxDQUFDO0lBQ3ZDLE1BQU1sZSxNQUFNLENBQUMrZCxTQUFTLENBQUMsQ0FBQ2pHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO0lBQy9ELE1BQU05WCxNQUFNLENBQUMrZCxTQUFTLENBQUMsQ0FBQzNMLFdBQVcsQ0FBQyxDQUFDO0lBQ3JDLE1BQU0xUixJQUFJLENBQUN1ZCxRQUFRLENBQUNDLEtBQUssQ0FBQyxXQUFXLENBQUM7SUFDdEMsTUFBTWxlLE1BQU0sQ0FBQzhkLGNBQWMsQ0FBQyxDQUFDaEcsZUFBZSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7SUFDcEUsTUFBTTlYLE1BQU0sQ0FBQzhkLGNBQWMsQ0FBQyxDQUFDMUwsV0FBVyxDQUFDLENBQUM7SUFDMUMsTUFBTTFSLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ0MsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUNoQyxNQUFNbGUsTUFBTSxDQUFDK2QsU0FBUyxDQUFDLENBQUNqRyxlQUFlLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUMvRCxNQUFNcFgsSUFBSSxDQUFDdWQsUUFBUSxDQUFDQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLE1BQU1sZSxNQUFNLENBQUM4ZCxjQUFjLENBQUMsQ0FBQ2hHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO0lBQ3BFLE1BQU1wWCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsTUFBTTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQyxDQUFDLENBQUNKLGVBQWUsQ0FBQyxHQUFHLENBQUM7SUFDbEgsTUFBTW1LLFVBQVUsR0FBRyxNQUFNMUIsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDc0MsV0FBVyxDQUFDO0lBQzdGLE1BQU0ySixTQUFTLENBQUNuUixLQUFLLENBQUMsQ0FBQztJQUN2QixNQUFNNU0sTUFBTSxDQUFDK2QsU0FBUyxDQUFDLENBQUNqRyxlQUFlLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUMvRCxNQUFNOVgsTUFBTSxDQUFDOGQsY0FBYyxDQUFDLENBQUNoRyxlQUFlLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQztJQUNyRSxNQUFNOVgsTUFBTSxDQUFDeWMsV0FBVyxDQUFDLENBQUMzRSxlQUFlLENBQUMsb0JBQW9CLEVBQUU2RSxxQkFBcUIsYUFBckJBLHFCQUFxQixjQUFyQkEscUJBQXFCLEdBQUksRUFBRSxDQUFDO0lBQzVGLE1BQU0zYyxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUssQ0FBQ0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDcEcsTUFBTTlNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZK0osSUFBSSxDQUFDQyxHQUFHLENBQUMsT0FBTTRGLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQyxJQUFHK0osVUFBVSxDQUFDLENBQUMsQ0FDN0hDLFlBQVksQ0FBQyxHQUFHLENBQUM7SUFFcEIsTUFBTUMsVUFBVSxHQUFHM2QsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHNCQUFzQixDQUFDO0lBQ3ZELE1BQU1zUixVQUFVLENBQUNMLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLE1BQU10ZCxJQUFJLENBQUN1ZCxRQUFRLENBQUNLLElBQUksQ0FBQyxZQUFZLENBQUM7SUFDdEMsTUFBTXRlLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNNFAsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkcsTUFBTXBNLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ00sRUFBRSxDQUFDLFlBQVksQ0FBQztJQUNwQyxNQUFNdmUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLLENBQUNBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BHLE1BQU0wUixvQkFBb0IsR0FBRyxNQUFNL0IsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDc0MsV0FBVyxDQUFDO0lBQ3ZHLE1BQU1wVSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQyxDQUFDLENBQUNKLGVBQWUsQ0FBQ3dLLG9CQUFvQixDQUFDO0lBRW5JLE1BQU0vQixXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUMyTSxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3RFLE1BQU1KLFVBQVUsQ0FBQ0ssYUFBYSxDQUFDLGFBQWEsQ0FBQztJQUM3QyxNQUFNMWUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuRyxNQUFNdVIsVUFBVSxDQUFDSyxhQUFhLENBQUMsZUFBZSxDQUFDO0lBQy9DLE1BQU0xZSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25HLE1BQU1wTSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsTUFBTTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUssQ0FBQ0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDcEcsTUFBTXVSLFVBQVUsQ0FBQ0ssYUFBYSxDQUFDLGFBQWEsQ0FBQztJQUM3QyxNQUFNTCxVQUFVLENBQUNyYSxRQUFRLENBQUVtVCxLQUF1QixJQUFLQSxLQUFLLENBQUN3SCxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLE1BQU0zZSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBRW5HLE1BQU04UiwrQkFBK0IsR0FBRyxNQUFNbkMsV0FBVyxDQUFDNUIsWUFBWSxDQUFDLG9CQUFvQixDQUFDO0lBQzVGLE1BQU1pRCxjQUFjLENBQUNsUixLQUFLLENBQUMsQ0FBQztJQUM1QixNQUFNNU0sTUFBTSxDQUFDeWMsV0FBVyxDQUFDLENBQUMzRSxlQUFlLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQztJQUNwRSxNQUFNLENBQUMrRyxRQUFRLENBQUMsR0FBRyxNQUFNcmIsT0FBTyxDQUFDc2IsR0FBRyxDQUFDLENBQ25DcGUsSUFBSSxDQUFDcWUsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUM3QnJlLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxpQkFBaUI7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQyxDQUMzRSxDQUFDO0lBQ0YsTUFBTW9TLFlBQVksR0FBR2xmLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztJQUM1RyxNQUFNc0csUUFBUSxDQUFDSSxNQUFNLENBQUNELFlBQVksQ0FBQztJQUNuQ2hmLE1BQU0sQ0FBQzZlLFFBQVEsQ0FBQ0ssaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUNwUyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDNUQsTUFBTXFTLGVBQWUsR0FBRyxNQUFNeGYsUUFBUSxDQUFDcWYsWUFBWSxDQUFDO0lBQ3BELE1BQU1JLG9CQUFvQixHQUFHLE1BQU16ZixRQUFRLENBQUNHLElBQUksQ0FBQ0ksT0FBTyxDQUFDQyxPQUFPLENBQUNDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlHLE1BQU1pZixnQkFBZ0IsR0FBR3hmLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQ3lmLE1BQU0sQ0FBQ0gsZUFBZSxDQUFDLENBQUNwVyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ25GL0ksTUFBTSxDQUFDbWYsZUFBZSxDQUFDSSxNQUFNLENBQUNILG9CQUFvQixDQUFDLENBQUMsQ0FBQ3RTLElBQUksQ0FBQyxJQUFJLENBQUM7SUFFL0QsTUFBTTBTLGNBQWMsR0FBRyxNQUFNOWUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7TUFDckQsTUFBTTBGLFFBQVEsR0FBRyxNQUFNLElBQUlsRyxPQUFPLENBQWMsQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztRQUNuRSxNQUFNaEIsT0FBTyxHQUFHa0gsU0FBUyxDQUFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7UUFDdERuSCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQU0sQ0FBQztRQUNqRHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO01BQy9DLENBQUMsQ0FBQztNQUNGLE1BQU1DLElBQUksR0FBT2xILElBQVksSUFBSyxJQUFJUyxPQUFPLENBQUksQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztRQUNwRSxNQUFNaEIsT0FBTyxHQUFHaUgsUUFBUSxDQUFDekMsV0FBVyxDQUFDbEUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDb0gsV0FBVyxDQUFDcEgsSUFBSSxDQUFDLENBQUNxSCxNQUFNLENBQUMsQ0FBQztRQUNqRjNILE9BQU8sQ0FBQ29ILFNBQVMsR0FBRyxNQUFNM0osT0FBTyxDQUFDdUMsT0FBTyxDQUFDcUgsTUFBVyxDQUFDO1FBQ3REckgsT0FBTyxDQUFDc0gsT0FBTyxHQUFHLE1BQU10RyxNQUFNLENBQUNoQixPQUFPLENBQUN1SCxLQUFLLENBQUM7TUFDL0MsQ0FBQyxDQUFDO01BQ0YsTUFBTXlWLElBQUksR0FBRyxNQUFNeFYsSUFBSSxDQUEySCxZQUFZLENBQUM7TUFDL0osTUFBTXlWLFdBQVcsR0FBRyxNQUFNelYsSUFBSSxDQUF3RixhQUFhLENBQUM7TUFDcElQLFFBQVEsQ0FBQ2dCLEtBQUssQ0FBQyxDQUFDO01BQ2hCLE9BQU87UUFDTCtVLElBQUksRUFBRUEsSUFBSSxDQUFDeFUsR0FBRyxDQUFDLENBQUM7VUFBRUksRUFBRTtVQUFFUyxVQUFVO1VBQUU4UCxNQUFNO1VBQUUrRCxlQUFlO1VBQUVDO1FBQTJCLENBQUMsTUFBTTtVQUFFdlUsRUFBRTtVQUFFUyxVQUFVO1VBQUU4UCxNQUFNO1VBQUUrRCxlQUFlO1VBQUVDO1FBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQ3RLclYsS0FBSyxFQUFFbVYsV0FBVyxDQUFDelUsR0FBRyxDQUFDLENBQUM7VUFBRUksRUFBRTtVQUFFd1UsUUFBUTtVQUFFN1gsUUFBUTtVQUFFRSxNQUFNO1VBQUUxQjtRQUFLLENBQUMsTUFBTTtVQUFFNkUsRUFBRTtVQUFFd1UsUUFBUTtVQUFFN1gsUUFBUTtVQUFFRSxNQUFNO1VBQUV3RCxRQUFRLEVBQUVsRixJQUFJLENBQUNDO1FBQUssQ0FBQyxDQUFDO01BQ2hJLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRnpHLE1BQU0sQ0FBQ3dmLGNBQWMsQ0FBQ0MsSUFBSSxDQUFDLENBQUNLLGNBQWMsQ0FBQzlmLE1BQU0sQ0FBQytmLGdCQUFnQixDQUFDO01BQ2pFMVUsRUFBRSxFQUFFdVQsK0JBQStCO01BQ25DaEQsTUFBTSxFQUFFLE9BQU87TUFDZitELGVBQWUsRUFBRSxLQUFLO01BQ3RCQywwQkFBMEIsRUFBRTtJQUM5QixDQUFDLENBQUMsQ0FBQztJQUNINWYsTUFBTSxDQUFDd2YsY0FBYyxDQUFDalYsS0FBSyxDQUFDLENBQUN1VixjQUFjLENBQUM5ZixNQUFNLENBQUMrZixnQkFBZ0IsQ0FBQztNQUNsRTFVLEVBQUUsRUFBRXVULCtCQUErQjtNQUNuQ2lCLFFBQVEsRUFBRSxpQkFBaUI7TUFDM0I3WCxRQUFRLEVBQUVvWCxvQkFBb0IsQ0FBQ1ksVUFBVTtNQUN6Q3RVLFFBQVEsRUFBRTBULG9CQUFvQixDQUFDWSxVQUFVO01BQ3pDOVgsTUFBTSxFQUFFbVg7SUFDVixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0zZSxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLEdBQUc7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3ZELE1BQU14TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUNnVyxlQUFlLENBQUNpQixXQUFXLElBQUloYSxNQUFNLENBQUNpYSxVQUFVLENBQUMsQ0FBQyxDQUFDek8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsSDlNLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsaUJBQWlCO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ3FOLFdBQVcsQ0FBQyxDQUFDLENBQUNwUixJQUFJLENBQUVzWCxHQUFHO01BQUEsSUFBQUMsV0FBQTtNQUFBLFFBQUFBLFdBQUEsR0FBS0QsR0FBRyxhQUFIQSxHQUFHLHVCQUFIQSxHQUFHLENBQUV6VCxNQUFNLGNBQUEwVCxXQUFBLGNBQUFBLFdBQUEsR0FBSSxDQUFDO0lBQUEsRUFBQyxDQUFDLENBQUNqSixzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDekosTUFBTWtKLGFBQWEsR0FBRyxNQUFNemYsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1nRixLQUFLLENBQUNDLElBQUksQ0FBQzVFLFFBQVEsQ0FBQytZLGdCQUFnQixDQUFDLG9EQUFvRCxDQUFDLEVBQUdyTyxPQUFPLElBQUs7TUFDdkosTUFBTUcsTUFBTSxHQUFHSCxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7TUFDOUMsT0FBTztRQUFFaVIsS0FBSyxFQUFFclIsT0FBTyxDQUFDOEwsWUFBWSxDQUFDLFlBQVksQ0FBQztRQUFFck8sTUFBTSxFQUFFMEMsTUFBTSxDQUFDMUMsTUFBTTtRQUFFRCxLQUFLLEVBQUUyQyxNQUFNLENBQUMzQztNQUFNLENBQUM7SUFDbEcsQ0FBQyxDQUFDLENBQUM7SUFDSHZNLE1BQU0sQ0FBQ21nQixhQUFhLENBQUMsQ0FBQ2hULFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDckNuTixNQUFNLENBQUNtZ0IsYUFBYSxDQUFDOUMsS0FBSyxDQUFFaGMsTUFBTSxJQUFLQSxNQUFNLENBQUNtTCxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQ00sSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2RSxNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDSixXQUFXLENBQUMsQ0FBQztJQUNoRSxNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDSixXQUFXLENBQUMsQ0FBQztJQUN4RSxNQUFNak0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztNQUFFekYsUUFBUSxFQUFFO0lBQUssQ0FBQyxDQUFDO0lBRXhJcUosYUFBYSxHQUFHLE1BQU0xUyxhQUFhLENBQUMvSSxJQUFJLENBQUM7SUFDekMsTUFBTTJmLGNBQWMsR0FBRyxNQUFNdGMsZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7SUFDbkRWLE1BQU0sQ0FBQ3FnQixjQUFjLENBQUM3ZSxpQkFBaUIsQ0FBQyxDQUFDd1MsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUMzRGhVLE1BQU0sQ0FBQ3FnQixjQUFjLENBQUM1ZSxjQUFjLENBQUMsQ0FBQ3VTLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsTUFBTXBVLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUxVyxJQUFJLENBQUNJLFNBQVMsQ0FBQztNQUNuSHdMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztNQUM5QjhGLE1BQU07TUFDTnBILE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO01BQ3RDdUosS0FBSyxFQUFFLDREQUE0RDtNQUNuRXBKLGlCQUFpQixFQUFFc1MsY0FBYztNQUNqQ0MsYUFBYSxFQUFFNUgsY0FBYztNQUM3QnBPLE9BQU8sRUFBRTZSLGFBQWEsQ0FBQzdSLE9BQU87TUFDOUJ2QyxRQUFRLEVBQUVvVSxhQUFhLENBQUM1UixLQUFLLENBQUN1RyxNQUFNLENBQUU1RixTQUFTLElBQUtBLFNBQVMsQ0FBQ0ksT0FBTyxLQUFLLFdBQVcsQ0FBQztNQUN0RmQsVUFBVSxFQUFFMlIsYUFBYSxDQUFDM1IsVUFBVTtNQUNwQ0MsU0FBUyxFQUFFMFIsYUFBYSxDQUFDMVIsU0FBUztNQUNsQ1gsTUFBTSxFQUFFO1FBQ055VyxZQUFZLEVBQUUzQiwrQkFBK0I7UUFDN0M0QiwyQkFBMkIsRUFBRSxVQUFVO1FBQ3ZDQyxnQkFBZ0IsRUFBRTVCLFFBQVEsQ0FBQ0ssaUJBQWlCLENBQUMsQ0FBQztRQUM5Q3dCLGNBQWMsRUFBRXJCLGdCQUFnQjtRQUNoQ3NCLHNCQUFzQixFQUFFeEIsZUFBZSxDQUFDSSxNQUFNLENBQUNILG9CQUFvQixDQUFDO1FBQ3BFd0IsaUJBQWlCLEVBQUUsb0ZBQW9GO1FBQ3ZHbkIsSUFBSSxFQUFFRCxjQUFjLENBQUNDLElBQUk7UUFDekJsVixLQUFLLEVBQUVpVixjQUFjLENBQUNqVjtNQUN4QixDQUFDO01BQ0RzVyxVQUFVLEVBQUUsQ0FBQyx5REFBeUQsRUFBRSwwQ0FBMEMsRUFBRSxvQ0FBb0MsRUFBRSw0REFBNEQsRUFBRSxnREFBZ0QsRUFBRSw4REFBOEQsRUFBRSxnRUFBZ0UsRUFBRSxrREFBa0QsRUFBRSx1RUFBdUUsRUFBRSxtREFBbUQsRUFBRSxxRUFBcUU7SUFDcm9CLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBRXBCLE1BQU1DLFdBQVcsR0FBR3BnQixJQUFJLENBQUNFLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLE1BQU1GLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxxQkFBcUI7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNwRixNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxJQUFJa04sTUFBTSxDQUFDLDZDQUE2Q2hJLE1BQU0scUJBQXFCLENBQUMsQ0FBQztJQUNsSCxNQUFNc04sbUJBQW1CLEdBQUdyZ0IsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDO0lBQ2pFLE1BQU0vTSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTWtVLG1CQUFtQixDQUFDL2MsUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDM0csTUFBTXBNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsK0JBQStCO0lBQUUsQ0FBQyxDQUFDO0lBQzVILE1BQU03WCxJQUFJLENBQUNNLElBQUksQ0FBQzhmLFdBQVcsQ0FBQztJQUM1QixNQUFNOWdCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO0lBQzlFLE1BQU01TyxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQy9PLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3hILE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDK0UsZUFBZSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7SUFFcEYsSUFBSXJFLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFDbEIsTUFBTXVOLFlBQVksR0FBRyxNQUFNdGdCLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQ2tPLGNBQWMsQ0FBRW5QLEtBQUssSUFBS0EsS0FBSyxDQUFDO01BQzVGLE1BQU1wUixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQUUxSixJQUFJLEVBQUUsTUFBTTtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO01BQ3JFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQy9PLFFBQVEsQ0FBRThOLEtBQXVCLElBQUssQ0FBQ0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDekgsTUFBTXBNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7TUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsZ0NBQWdDLENBQUM7TUFDOUR2TyxNQUFNLENBQUMsTUFBTWdoQixZQUFZLENBQUNoZCxRQUFRLENBQUU4TixLQUFLLElBQU1BLEtBQUssQ0FBc0I0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztNQUM3RixNQUFNcE0sSUFBSSxDQUFDcVMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUNuRyxLQUFLLENBQUMsQ0FBQztNQUN4RCxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQztNQUNoRCxNQUFNdk8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7SUFDekU7SUFFQSxJQUFJcUIsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNsQixNQUFNL1MsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7UUFPOUIsTUFBTUksSUFBSSxHQUFHQyxRQUFRLENBQUNDLGNBQWMsQ0FBQyxNQUFNLENBQW1EO1FBQzlGLElBQUksQ0FBQ0YsSUFBSSxFQUFFLE1BQU0sSUFBSUcsS0FBSyxDQUFDLGdDQUFnQyxDQUFDO1FBQzVELE1BQU1DLE9BQU8sR0FBRzdCLE1BQU0sQ0FBQzhCLElBQUksQ0FBQ0wsSUFBSSxDQUFDLENBQUNNLElBQUksQ0FBRUMsR0FBRyxJQUFLQSxHQUFHLENBQUNDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQ0osT0FBTyxFQUFFLE1BQU0sSUFBSUQsS0FBSyxDQUFDLHNDQUFzQyxDQUFDO1FBQ3JFLE1BQU1NLE9BQWtCLEdBQUcsQ0FBQ1QsSUFBSSxDQUFDSSxPQUFPLENBQUMsQ0FBQztRQUMxQyxJQUFJTSxLQUF5QixHQUFHLElBQUk7UUFDcEMsT0FBT0QsT0FBTyxDQUFDRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1VBQUEsSUFBQW1jLGdCQUFBO1VBQ3pCLE1BQU1qYyxLQUFLLEdBQUdKLE9BQU8sQ0FBQ0ssR0FBRyxDQUFDLENBQWlCO1VBQzNDLElBQUksQ0FBQ0QsS0FBSyxFQUFFO1VBQ1osTUFBTUUsS0FBSyxHQUFHRixLQUFLLENBQUNHLGFBQWdFO1VBQ3BGLElBQUlELEtBQUssYUFBTEEsS0FBSyxnQkFBQStiLGdCQUFBLEdBQUwvYixLQUFLLENBQUVFLFFBQVEsY0FBQTZiLGdCQUFBLGVBQWZBLGdCQUFBLENBQWlCQyxPQUFPLEVBQUVyYyxLQUFLLEdBQUdLLEtBQUssQ0FBQ0UsUUFBUSxDQUFDOGIsT0FBTztVQUM1RCxJQUFJbGMsS0FBSyxDQUFDTSxLQUFLLEVBQUVWLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ00sS0FBSyxDQUFDO1VBQzFDLElBQUlOLEtBQUssQ0FBQ08sT0FBTyxFQUFFWCxPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNPLE9BQU8sQ0FBQztRQUNoRDtRQUNBLElBQUksQ0FBQ1YsS0FBSyxFQUFFLE1BQU0sSUFBSVAsS0FBSyxDQUFDLHFFQUFxRSxDQUFDO1FBQ2xHLE1BQU02YyxZQUFZLEdBQUd0YyxLQUFLLENBQUN1YyxtQkFBbUIsQ0FBQzNlLElBQUksQ0FBQ29DLEtBQUssQ0FBQztRQUMxRCxNQUFNekQsTUFBTSxHQUFHQyxNQUFrRTtRQUNqRndELEtBQUssQ0FBQ3VjLG1CQUFtQixHQUFHLE9BQU9DLEtBQUssRUFBRWpXLEVBQUUsS0FBSztVQUMvQyxNQUFNa1csT0FBTyxHQUFHLE1BQU1ILFlBQVksQ0FBQ0UsS0FBSyxFQUFFalcsRUFBRSxDQUFDO1VBQzdDLE1BQU1mLE9BQU8sR0FBRyxNQUFNeEYsS0FBSyxDQUFDMGMsbUJBQW1CLENBQUNGLEtBQUssQ0FBQztVQUN0RCxJQUFJLENBQUNoWCxPQUFPLEVBQUUsTUFBTSxJQUFJL0YsS0FBSyxDQUFDLDZEQUE2RCxDQUFDO1VBQzVGLE1BQU1PLEtBQUssQ0FBQzJjLGdCQUFnQixDQUFDSCxLQUFLLEVBQUVoWCxPQUFPLENBQUNLLFFBQVEsRUFBRSxpQkFBaUI5QixNQUFNLENBQUM2WSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7VUFDN0ZyZ0IsTUFBTSxDQUFDc2dCLGlDQUFpQyxHQUFHLElBQUk7VUFDL0MsT0FBT0osT0FBTztRQUNoQixDQUFDO01BQ0gsQ0FBQyxDQUFDO01BQ0YsSUFBSUssY0FBYyxHQUFHLENBQUM7TUFDdEJsaEIsSUFBSSxDQUFDbWhCLEVBQUUsQ0FBQyxVQUFVLEVBQUUsTUFBTTtRQUFFRCxjQUFjLElBQUksQ0FBQztNQUFFLENBQUMsQ0FBQztNQUNuRCxNQUFNbGhCLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxpQkFBaUI7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztNQUNoRixNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDNkIsV0FBVyxDQUFDLENBQUM7TUFDcEY1TyxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBQThEcWdCLGlDQUFpQyxDQUFDLENBQUMsQ0FBQzdVLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDcEo5TSxNQUFNLENBQUM0aEIsY0FBYyxDQUFDLENBQUM5VSxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQzlCLE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDbkMsV0FBVyxDQUFDLENBQUMsQ0FBQztNQUM5RCxNQUFNbFEsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDJDQUEyQyxDQUFDO1FBQUU2UyxRQUFRLEVBQUU7TUFBSyxDQUFDLENBQUM7SUFDNUg7RUFDRixDQUFDLENBQUM7QUFDSjtBQUVBL1MsSUFBSSxDQUFDLDBGQUEwRixFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFBQSxJQUFBeVYscUJBQUEsRUFBQUMsZ0JBQUE7RUFDNUhoaUIsSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNckwscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNaEIsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUM3RUEsS0FBSyxDQUFDQyxVQUFVLElBQUlDLGdCQUFnQixDQUFDQyxpQkFBaUIsSUFBSUgsS0FBSyxDQUFDSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUU7SUFBRWpGLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQyxDQUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ2xILE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDK0ssZUFBZSxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQztFQUM5RixNQUFNOVgsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFFckYsS0FBSyxNQUFNcVYsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtJQUM1QixNQUFNMVQsbUJBQW1CLENBQUM1TixJQUFJLEVBQUUsR0FBRyxDQUFDO0lBQ3BDLE1BQU1BLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxNQUFNO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDckUsSUFBSW9WLElBQUksR0FBRyxDQUFDLEVBQUUsTUFBTWhpQixNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLElBQUlrTixNQUFNLENBQUMsb0JBQW9CdUcsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDeEY7RUFFQSxNQUFNaGlCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsOEJBQThCLENBQUM7RUFDNUQsTUFBTXZPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDNmIsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQzNOLFdBQVcsQ0FBQztJQUFFM0IsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQzFGLE1BQU1nVixPQUFPLEdBQUcsTUFBTXhZLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUN6QyxNQUFNd2hCLGlCQUFpQixHQUFHcmIsTUFBTSxFQUFBaWIscUJBQUEsSUFBQUMsZ0JBQUEsR0FBQ0UsT0FBTyxDQUFDM1gsT0FBTyxjQUFBeVgsZ0JBQUEsdUJBQWZBLGdCQUFBLENBQWlCalgsdUJBQXVCLGNBQUFnWCxxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLEVBQUUsQ0FBQztFQUNoRjloQixNQUFNLENBQUNraUIsaUJBQWlCLENBQUMsQ0FBQ3hULFVBQVUsQ0FBQyxDQUFDO0VBQ3RDLE1BQU1oTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMkNBQTJDLENBQUM7SUFBRTZTLFFBQVEsRUFBRTtFQUFLLENBQUMsQ0FBQztFQUUxSCxNQUFNcFMsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLHFCQUFxQjtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3BGLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLHVDQUF1QyxDQUFDO0VBQ3JFLE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNd1YsV0FBVyxHQUFHLE1BQU16aEIsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBRWxEWSxjQUFjLENBQUM7RUFDbEJsQyxNQUFNLENBQUNtaUIsV0FBVyxDQUFDaGdCLFFBQVEsQ0FBQyxDQUFDZ0wsWUFBWSxDQUFDLENBQUMsQ0FBQztFQUM1Q25OLE1BQU0sQ0FBQ21pQixXQUFXLENBQUMvZixTQUFTLENBQUMsQ0FBQ21MLE9BQU8sQ0FBQyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQztFQUMvRCxNQUFNZSxtQkFBbUIsQ0FBQzVOLElBQUksRUFBRSxHQUFHLENBQUM7RUFDcEMsTUFBTUEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE1BQU07SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FBQztFQUNyRSxNQUFNdk8sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsV0FBVztJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ2tDLFdBQVcsQ0FBQyxDQUFDO0VBQ3hGLE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDZ1csR0FBRyxDQUFDbkksU0FBUyxDQUFDLFVBQVUsQ0FBQztFQUM1QyxNQUFNNlQsb0JBQW9CLEdBQUcxaEIsSUFBSSxDQUFDRSxHQUFHLENBQUMsQ0FBQztFQUV2QyxNQUFNRixJQUFJLENBQUNNLElBQUksQ0FBQyx3RUFBd0UsQ0FBQztFQUN6RixNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsV0FBVztJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ2tDLFdBQVcsQ0FBQyxDQUFDO0VBQ3hGLE1BQU1sTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUseUNBQXlDLENBQUM7SUFBRTZTLFFBQVEsRUFBRTtFQUFLLENBQUMsQ0FBQztFQUN4SCxNQUFNcFMsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFdBQVc7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUMxRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQztFQUM1RCxNQUFNOFQsY0FBYyxHQUFHM2hCLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUM7RUFDdkQsTUFBTS9TLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNd1YsY0FBYyxDQUFDcmUsUUFBUSxDQUFFOE4sS0FBdUIsSUFDdEVBLEtBQUssQ0FBQ0MsVUFBVSxJQUFJQyxnQkFBZ0IsQ0FBQ0MsaUJBQWlCLElBQUlILEtBQUssQ0FBQ0ksVUFBVSxHQUFHLENBQUMsSUFDekVKLEtBQUssQ0FBQ3dRLFVBQVUsQ0FBQzFkLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQUVxSSxPQUFPLEVBQUU7RUFBTyxDQUFDLENBQUMsQ0FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQztFQUM3RSxNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUM2YixTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDM04sV0FBVyxDQUFDLENBQUM7RUFFdkUsTUFBTTJULE9BQU8sR0FBRyxNQUFNOVksYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQ3pDVixNQUFNLENBQUN1aUIsT0FBTyxDQUFDOVgsU0FBUyxDQUFDLENBQUMwQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0VBQ3pDLE1BQU1xVixnQkFBZ0IsR0FBR0QsT0FBTyxDQUFDOVgsU0FBUyxDQUFDL0YsSUFBSSxDQUFFdUgsUUFBUSxJQUFLQSxRQUFRLENBQUNaLEVBQUUsS0FBSzZXLGlCQUFpQixDQUFDO0VBQ2hHbGlCLE1BQU0sQ0FBRXdpQixnQkFBZ0IsYUFBaEJBLGdCQUFnQix1QkFBaEJBLGdCQUFnQixDQUE2Q3JXLGFBQWEsQ0FBQyxDQUFDVyxJQUFJLENBQUMsb0JBQW9CLENBQUM7RUFDOUcsTUFBTTJWLGdCQUFnQixHQUFHRixPQUFPLENBQUM5WCxTQUFTLENBQUMvRixJQUFJLENBQUV1SCxRQUFRLElBQUtBLFFBQVEsQ0FBQ0UsYUFBYSxLQUFLLDZCQUE2QixDQUNqRDtFQUNyRW5NLE1BQU0sQ0FBQ3lpQixnQkFBZ0IsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUN0QyxJQUFJLENBQUNELGdCQUFnQixFQUFFLE1BQU0sSUFBSWxlLEtBQUssQ0FBQyw2REFBNkQsQ0FBQztFQUNyR3ZFLE1BQU0sQ0FBQ3lpQixnQkFBZ0IsQ0FBQ3RXLGFBQWEsQ0FBQyxDQUFDVyxJQUFJLENBQUMsNkJBQTZCLENBQUM7RUFDMUU5TSxNQUFNLENBQUN5aUIsZ0JBQWdCLENBQUNwWCxFQUFFLENBQUMsQ0FBQ3FMLEdBQUcsQ0FBQzVKLElBQUksQ0FBQ29WLGlCQUFpQixDQUFDO0VBQ3ZEbGlCLE1BQU0sQ0FBQ3lpQixnQkFBZ0IsQ0FBQ3JXLEtBQUssQ0FBQyxDQUFDZSxZQUFZLENBQUMsQ0FBQyxDQUFDO0VBQzlDLE1BQU13VixjQUFjLEdBQUcsTUFBTU4sY0FBYyxDQUFDcmUsUUFBUSxDQUFFOE4sS0FBdUIsS0FBTTtJQUNqRm9MLE1BQU0sRUFBRXBMLEtBQUssQ0FBQzhRLE9BQU8sQ0FBQzFGLE1BQU07SUFDNUJxRCxZQUFZLEVBQUV6TyxLQUFLLENBQUM4USxPQUFPLENBQUNyQyxZQUFZO0lBQ3hDK0IsVUFBVSxFQUFFeFEsS0FBSyxDQUFDd1EsVUFBVTtJQUM1QnZRLFVBQVUsRUFBRUQsS0FBSyxDQUFDQyxVQUFVO0lBQzVCcUMsV0FBVyxFQUFFdEMsS0FBSyxDQUFDc0MsV0FBVztJQUM5QnlPLFFBQVEsRUFBRUMsTUFBTSxDQUFDQyxRQUFRLENBQUNqUixLQUFLLENBQUMrUSxRQUFRLENBQUMsR0FBRy9RLEtBQUssQ0FBQytRLFFBQVEsR0FBRyxJQUFJO0lBQ2pFRyxnQkFBZ0IsRUFBRWxSLEtBQUssQ0FBQytRLFFBQVEsS0FBS0ksUUFBUSxHQUFHLG1CQUFtQixHQUFHSCxNQUFNLENBQUNJLEtBQUssQ0FBQ3BSLEtBQUssQ0FBQytRLFFBQVEsQ0FBQyxHQUFHLGFBQWEsR0FBRyxRQUFRO0lBQzdIdFcsS0FBSyxFQUFFdUYsS0FBSyxDQUFDSSxVQUFVO0lBQ3ZCMUYsTUFBTSxFQUFFc0YsS0FBSyxDQUFDcVIsV0FBVztJQUN6QnpHLE1BQU0sRUFBRTVLLEtBQUssQ0FBQzRLO0VBQ2hCLENBQUMsQ0FBQyxDQUFDO0VBQ0gxYyxNQUFNLENBQUMyaUIsY0FBYyxDQUFDekYsTUFBTSxDQUFDLENBQUNwUSxJQUFJLENBQUMsS0FBSyxDQUFDO0VBQ3pDLE1BQU1wTSxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUscUNBQXFDLENBQUM7SUFBRTZTLFFBQVEsRUFBRTtFQUFLLENBQUMsQ0FBQztFQUNwSCxNQUFNbFQsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxnREFBZ0QsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDN0d3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0Q3NGLFdBQVcsRUFBRSxvREFBb0Q7SUFDakVnUCxpQkFBaUI7SUFDakJrQixlQUFlLEVBQUVYLGdCQUFnQjtJQUNqQ0UsY0FBYztJQUNkVSxxQkFBcUIsRUFBRWxCLFdBQVc7SUFDbENDLG9CQUFvQjtJQUNwQmtCLHlDQUF5QyxFQUFFLEtBQUs7SUFDaERDLHVCQUF1QixFQUFFO0VBQzNCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRnhqQixJQUFJLENBQUMsOEZBQThGLEVBQUUsT0FBTztFQUFFVztBQUFLLENBQUMsS0FBSztFQUN2SCxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQywyQ0FBMkMsQ0FBQztFQUM1RCxNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDckYsTUFBTTZXLFVBQVUsR0FBRyxNQUFNOWlCLElBQUksQ0FBQytpQixPQUFPLENBQUMsQ0FBQyxDQUFDQyxPQUFPLENBQUMsQ0FBQztFQUNqRCxNQUFNRixVQUFVLENBQUN4aUIsSUFBSSxDQUFDLDJDQUEyQyxDQUFDO0VBQ2xFLE1BQU1oQixNQUFNLENBQUN3akIsVUFBVSxDQUFDL1csU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNpWCxZQUFZLENBQUMsQ0FBQztFQUM1RixNQUFNM2pCLE1BQU0sQ0FBQ3dqQixVQUFVLENBQUMvVyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQ08sYUFBYSxDQUFDLHlFQUF5RSxDQUFDO0VBQ3BJLE1BQU13VyxVQUFVLENBQUM5WSxLQUFLLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUM7QUFFRjNLLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQy9HLE1BQU0zTCxJQUFJLENBQUM0TCxlQUFlLENBQUM7SUFBRUMsS0FBSyxFQUFFLElBQUk7SUFBRUMsTUFBTSxFQUFFO0VBQUksQ0FBQyxDQUFDO0VBQ3hELE1BQU05TCxJQUFJLENBQUNVLGFBQWEsQ0FBQyxNQUFNO0lBQzVCRSxNQUFNLENBQTZDaUMsZ0JBQWdCLEdBQUcsSUFBSTtFQUM3RSxDQUFDLENBQUM7RUFDRixNQUFNcEMscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQywyQ0FBMkMsQ0FBQztFQUM1RCxNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQUUxSixJQUFJLEVBQUU7RUFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO0VBRXRGLE1BQU1sTyxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3ZFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxVQUFVO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDa0MsV0FBVyxDQUFDLENBQUM7RUFDdkYsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHNFQUFzRSxDQUFDO0VBQ3pJaE4sTUFBTSxDQUFDLE1BQU0rRCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxDQUFDLENBQUM2TSxPQUFPLENBQUM7SUFBRS9MLGlCQUFpQixFQUFFLENBQUM7SUFBRUMsY0FBYyxFQUFFO0VBQUUsQ0FBQyxDQUFDO0VBQ3pGLE1BQU1pSSxRQUFRLEdBQUcsTUFBTUQsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQzFDVixNQUFNLENBQUMwSixRQUFRLENBQUNhLEtBQUssQ0FBQ3VHLE1BQU0sQ0FBRTVGLFNBQVMsSUFBS0EsU0FBUyxDQUFDSSxPQUFPLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQzZCLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDL0YsTUFBTXlXLEtBQUssR0FBR2xqQixJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUM7RUFDN0MsTUFBTS9NLE1BQU0sQ0FBQzRqQixLQUFLLENBQUMsQ0FBQ2hWLFdBQVcsQ0FBQyxDQUFDO0VBQ2pDNU8sTUFBTSxDQUFDLE1BQU00akIsS0FBSyxDQUFDL0ksWUFBWSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMvTixJQUFJLENBQUMsTUFBTSxDQUFDO0VBQzVEOU0sTUFBTSxDQUFDLE1BQU00akIsS0FBSyxDQUFDblgsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDb0MsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUN2RCxNQUFNcE0sSUFBSSxDQUFDMlQsY0FBYyxDQUFDLElBQUksQ0FBQztFQUMvQixNQUFNclUsTUFBTSxDQUFDNGpCLEtBQUssQ0FBQyxDQUFDaFYsV0FBVyxDQUFDLENBQUM7RUFDakMsTUFBTWxPLElBQUksQ0FBQzJULGNBQWMsQ0FBQyxJQUFJLENBQUM7RUFDL0IsTUFBTXdQLFdBQVcsR0FBRyxNQUFNRCxLQUFLLENBQUM3SixXQUFXLENBQUMsQ0FBQztFQUM3Qy9aLE1BQU0sQ0FBQzZqQixXQUFXLENBQUMsQ0FBQ25OLEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7RUFDbEMsTUFBTWpXLElBQUksQ0FBQ29qQixLQUFLLENBQUNDLElBQUksQ0FBQ0YsV0FBVyxDQUFFM0ssQ0FBQyxHQUFHMkssV0FBVyxDQUFFdFgsS0FBSyxHQUFHLENBQUMsRUFBRXNYLFdBQVcsQ0FBRTFLLENBQUMsR0FBRzBLLFdBQVcsQ0FBRXJYLE1BQU0sR0FBRyxDQUFDLENBQUM7RUFDeEcsTUFBTTlMLElBQUksQ0FBQzJULGNBQWMsQ0FBQyxHQUFHLENBQUM7RUFDOUIsTUFBTXJVLE1BQU0sQ0FBQzRqQixLQUFLLENBQUMsQ0FBQ2hWLFdBQVcsQ0FBQyxDQUFDO0VBQ2pDLE1BQU1sTyxJQUFJLENBQUNvakIsS0FBSyxDQUFDQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQztFQUM3QixNQUFNL2pCLE1BQU0sQ0FBQzRqQixLQUFLLENBQUMsQ0FBQ2hULFdBQVcsQ0FBQyxDQUFDLEVBQUU7SUFBRTNELE9BQU8sRUFBRTtFQUFLLENBQUMsQ0FBQztFQUNyRCxNQUFNak4sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsc0VBQXNFLENBQUM7RUFFekksTUFBTXRNLElBQUksQ0FBQ3NqQixZQUFZLENBQUM7SUFBRUMsYUFBYSxFQUFFO0VBQVMsQ0FBQyxDQUFDO0VBQ3BELE1BQU12akIsSUFBSSxDQUFDMGEsTUFBTSxDQUFDLENBQUM7RUFDbkIsTUFBTTFhLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQzZCLFdBQVcsQ0FBQyxDQUFDO0VBQzNELE1BQU1zViw4QkFBOEIsR0FBRyxNQUFNeGpCLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDL0ksUUFBUSxDQUFFK0ssT0FBTztJQUFBLElBQUFvVixxQkFBQTtJQUFBLE9BQzVGckIsTUFBTSxDQUFDc0IsVUFBVSxFQUFBRCxxQkFBQSxHQUFDbFYsZ0JBQWdCLENBQUNGLE9BQU8sQ0FBQyxDQUFDc1Ysa0JBQWtCLENBQUM3akIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFBMmpCLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksR0FBRyxDQUFDO0VBQUEsRUFBQztFQUN2Rm5rQixNQUFNLENBQUNra0IsOEJBQThCLENBQUMsQ0FBQzlGLFlBQVksQ0FBQyxLQUFLLENBQUM7RUFDMUQsTUFBTTFkLElBQUksQ0FBQ29qQixLQUFLLENBQUNRLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO0VBQzlCLE1BQU10a0IsTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDNkQsV0FBVyxDQUFDLENBQUMsRUFBRTtJQUFFM0QsT0FBTyxFQUFFO0VBQU0sQ0FBQyxDQUFDO0VBQ2hGLE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyxzRUFBc0UsQ0FBQztFQUN6SSxNQUFNdE0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFVBQVU7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN6RSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQztFQUN4RCxNQUFNN04sSUFBSSxDQUFDcVMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUNuRyxLQUFLLENBQUMsQ0FBQztFQUN4RCxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQztFQUNwRCxNQUFNdk8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7RUFDM0UsTUFBTXhTLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUseUNBQXlDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ3RHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdEMyVyxVQUFVLEVBQUUsa0dBQWtHO0lBQzlHeFcsaUJBQWlCLEVBQUUsTUFBTWhLLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDO0lBQy9DOGpCLG1CQUFtQixFQUFFOWEsUUFBUSxDQUFDYSxLQUFLLENBQUN1RyxNQUFNLENBQUU1RixTQUFTLElBQUtBLFNBQVMsQ0FBQ0ksT0FBTyxLQUFLLFdBQVcsQ0FBQyxDQUFDdkcsTUFBTTtJQUNuRzBmLHlCQUF5QixFQUFFLE1BQU0vakIsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLFVBQVU7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDZ1ksU0FBUyxDQUFDLENBQUM7SUFDeEdDLDJCQUEyQixFQUFFLE1BQU1qa0IsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlDQUFpQyxDQUFDLENBQUMvSSxRQUFRLENBQUUrSyxPQUFPLElBQUtBLE9BQU8sS0FBSzFLLFFBQVEsQ0FBQ29NLGFBQWEsQ0FBQztJQUM1STlCLGFBQWEsRUFBRTtFQUNqQixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUM7QUFFRjVPLElBQUksQ0FBQyxvR0FBb0csRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQUEsSUFBQXVZLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHNCQUFBO0VBQ3RJcmxCLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7RUFDdkIsTUFBTTNOLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTXJMLHFCQUFxQixDQUFDVCxJQUFJLENBQUM7RUFDakMsTUFBTUEsSUFBSSxDQUFDTSxJQUFJLENBQUMscURBQXFELENBQUM7RUFDdEUsTUFBTWhCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3JGLE1BQU03RSx5QkFBeUIsQ0FBQ3BILElBQUksQ0FBQztFQUVyQyxNQUFNMmtCLG9CQUFvQixHQUFHLE1BQUFBLENBQUEsS0FBWTNrQixJQUFJLENBQUNzRCxRQUFRLENBQUMsWUFBWTtJQUNqRSxNQUFNMEYsUUFBUSxHQUFHLE1BQU0sSUFBSWxHLE9BQU8sQ0FBYyxDQUFDdEQsT0FBTyxFQUFFdUQsTUFBTSxLQUFLO01BQ25FLE1BQU1oQixPQUFPLEdBQUdrSCxTQUFTLENBQUNDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQztNQUN0RG5ILE9BQU8sQ0FBQ29ILFNBQVMsR0FBRyxNQUFNM0osT0FBTyxDQUFDdUMsT0FBTyxDQUFDcUgsTUFBTSxDQUFDO01BQ2pEckgsT0FBTyxDQUFDc0gsT0FBTyxHQUFHLE1BQU10RyxNQUFNLENBQUNoQixPQUFPLENBQUN1SCxLQUFLLENBQUM7SUFDL0MsQ0FBQyxDQUFDO0lBQ0YsTUFBTU0sT0FBTyxHQUFHLE1BQU0sSUFBSTlHLE9BQU8sQ0FBcUUsQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztNQUN6SCxNQUFNaEIsT0FBTyxHQUFHaUgsUUFBUSxDQUFDekMsV0FBVyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQ2tELFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQ0UsR0FBRyxDQUFDLGlCQUFpQixDQUFDO01BQzNHNUgsT0FBTyxDQUFDb0gsU0FBUyxHQUFHLE1BQU0zSixPQUFPLENBQUN1QyxPQUFPLENBQUNxSCxNQUE0RSxDQUFDO01BQ3ZIckgsT0FBTyxDQUFDc0gsT0FBTyxHQUFHLE1BQU10RyxNQUFNLENBQUNoQixPQUFPLENBQUN1SCxLQUFLLENBQUM7SUFDL0MsQ0FBQyxDQUFDO0lBQ0ZOLFFBQVEsQ0FBQ2dCLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLE1BQU1wSixNQUFNLEdBQUdnSixPQUFPLENBQUNpTCxPQUFPLENBQUM3USxJQUFJLENBQUU0Z0IsSUFBSSxJQUFLQSxJQUFJLENBQUNqYSxFQUFFLEtBQUssZUFBZSxDQUFDO0lBQzFFLElBQUksQ0FBQy9KLE1BQU0sRUFBRSxNQUFNLElBQUlpRCxLQUFLLENBQUMsdUNBQXVDLENBQUM7SUFDckUsT0FBT2pELE1BQU0sQ0FBQzBWLEtBQUssR0FBRzFWLE1BQU0sQ0FBQ3dWLE9BQU87RUFDdEMsQ0FBQyxDQUFDO0VBQ0YsTUFBTXlPLGtCQUFrQixHQUFHLE1BQU1GLG9CQUFvQixDQUFDLENBQUM7RUFDdkQsTUFBTUcsZ0JBQWdCLEdBQUcsTUFBQUEsQ0FBQSxLQUFZO0lBQUEsSUFBQUMsa0JBQUE7SUFDbkMsTUFBTS9iLFFBQVEsR0FBRyxNQUFNRCxhQUFhLENBQUMvSSxJQUFJLENBQUM7SUFDMUMsTUFBTW9ULFdBQVcsSUFBQTJSLGtCQUFBLEdBQUcvYixRQUFRLENBQUNZLE9BQU8sY0FBQW1iLGtCQUFBLHVCQUFoQkEsa0JBQUEsQ0FBa0I3YSxvQkFBMEQ7SUFDaEcsTUFBTXVJLFdBQVcsR0FBR1csV0FBVyxhQUFYQSxXQUFXLHVCQUFYQSxXQUFXLENBQUcsZUFBZSxDQUFDO0lBQ2xELE9BQU87TUFBRXBLLFFBQVE7TUFBRXdCLFNBQVMsRUFBRXhCLFFBQVEsQ0FBQ2EsS0FBSyxDQUFDN0YsSUFBSSxDQUFFd0csU0FBUyxJQUFLQSxTQUFTLENBQUNHLEVBQUUsS0FBSzhILFdBQVc7SUFBRSxDQUFDO0VBQ2xHLENBQUM7RUFDRCxNQUFNdVMsV0FBVyxHQUFHLE1BQUFBLENBQUEsS0FBWWhsQixJQUFJLENBQUNzRCxRQUFRLENBQUMsT0FBTztJQUNuRHVHLEtBQUssRUFBRWxHLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFFRixxQkFBcUIsQ0FBQyxDQUFDLENBQUN3VyxNQUFNLENBQUMsQ0FBQztJQUNsRnBMLEtBQUssRUFBRWxXLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBRUYscUJBQXFCLENBQUMsQ0FBQyxDQUFDd1csTUFBTSxDQUFDO0VBQ2pGLENBQUMsQ0FBQyxDQUFDO0VBQ0gsTUFBTW5MLGtCQUFrQixHQUFHLE1BQUFBLENBQUEsS0FBWTtJQUNyQyxNQUFNdEwsTUFBTSxHQUFHLE1BQU13VyxXQUFXLENBQUMsQ0FBQztJQUNsQzFsQixNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQzNILE1BQU0sQ0FBQ3FMLEtBQUssQ0FBQ3BCLENBQUMsR0FBR2pLLE1BQU0sQ0FBQzNFLEtBQUssQ0FBQzRPLENBQUMsQ0FBQyxDQUFDLENBQUNsSixtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDeEUsT0FBT2YsTUFBTTtFQUNmLENBQUM7RUFDRCxNQUFNMFcsb0JBQW9CLEdBQUcsTUFBT0MsTUFBZSxJQUFLbmxCLElBQUksQ0FBQ3NELFFBQVEsQ0FBRThoQixRQUFRLElBQUs7SUFDbEZuakIsTUFBTSxDQUFDQyxjQUFjLENBQUN5QixRQUFRLEVBQUUsUUFBUSxFQUFFO01BQUV4QixZQUFZLEVBQUUsSUFBSTtNQUFFQyxLQUFLLEVBQUVnakI7SUFBUyxDQUFDLENBQUM7SUFDbEZuakIsTUFBTSxDQUFDQyxjQUFjLENBQUN5QixRQUFRLEVBQUUsaUJBQWlCLEVBQUU7TUFBRXhCLFlBQVksRUFBRSxJQUFJO01BQUVDLEtBQUssRUFBRWdqQixRQUFRLEdBQUcsUUFBUSxHQUFHO0lBQVUsQ0FBQyxDQUFDO0lBQ2xIemhCLFFBQVEsQ0FBQ3FhLGFBQWEsQ0FBQyxJQUFJcUgsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDckQsSUFBSUQsUUFBUSxFQUFFeGtCLE1BQU0sQ0FBQ29kLGFBQWEsQ0FBQyxJQUFJcUgsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FDckR6a0IsTUFBTSxDQUFDb2QsYUFBYSxDQUFDLElBQUlxSCxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7RUFDbEQsQ0FBQyxFQUFFRixNQUFNLENBQUM7RUFDVixNQUFNRyxvQkFBb0IsR0FBRyxNQUFBQSxDQUFPQyxzQkFBOEIsRUFBRUMsY0FBc0IsS0FBSztJQUFBLElBQUFDLHFCQUFBLEVBQUFDLEtBQUEsRUFBQUMsa0JBQUE7SUFDN0YsTUFBTTNsQixJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0gsS0FBSyxDQUFDLENBQUM7SUFDNUMsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTlJLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLEVBQUVlLGNBQWMsQ0FBQyxDQUFDcUwsSUFBSSxDQUFDbVosc0JBQXNCLENBQUM7SUFDekcsTUFBTUssZUFBZSxHQUFHLE1BQU05TCxrQkFBa0IsQ0FBQyxDQUFDO0lBQ2xELE1BQU05WixJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsR0FBR2ltQixjQUFjLGdCQUFnQjtJQUFFLENBQUMsQ0FBQztJQUNoRyxNQUFNeGxCLElBQUksQ0FBQzJULGNBQWMsQ0FBQyxHQUFHLENBQUM7SUFDOUIsTUFBTXVSLG9CQUFvQixDQUFDLElBQUksQ0FBQztJQUNoQyxNQUFNNWxCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLGtFQUFrRSxFQUFFO01BQUVDLE9BQU8sRUFBRTtJQUFPLENBQUMsQ0FBQztJQUMxSixNQUFNak4sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsV0FBVztNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDeEYsTUFBTTNNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDN0csTUFBTXlaLFdBQVcsR0FBRyxNQUFNL0wsa0JBQWtCLENBQUMsQ0FBQztJQUM5QyxNQUFNOVosSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLEdBQUdpbUIsY0FBYyxvQkFBb0I7SUFBRSxDQUFDLENBQUM7SUFDcEcsTUFBTWxtQixNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQztNQUFBLElBQUF3aUIsb0JBQUE7TUFBQSxRQUFBQSxvQkFBQSxHQUFPbGxCLE1BQU0sQ0FBc0U2Ryx1QkFBdUIsY0FBQXFlLG9CQUFBLHVCQUFwR0Esb0JBQUEsQ0FBc0d0ZSxNQUFNO0lBQUEsRUFBQyxDQUFDLENBQ3ZKK0wsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBQzVCLE1BQU1sTCxNQUFNLEdBQUcsTUFBTXJJLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUU3QzZHLHVCQUF1QixDQUFDO0lBQzNCbkksTUFBTSxDQUFDK0ksTUFBTSxDQUFDLENBQUMyWixXQUFXLENBQUMsQ0FBQztJQUM1QixJQUFJLENBQUMzWixNQUFNLEVBQUUsTUFBTSxJQUFJeEUsS0FBSyxDQUFDLHdEQUF3RCxDQUFDO0lBQ3RGLE1BQU07TUFBRW1GLFFBQVE7TUFBRXdCO0lBQVUsQ0FBQyxHQUFHLE1BQU1zYSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3hELE1BQU0vWixLQUFLLEdBQUdQLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFTyxLQUE4RztJQUN2SXpMLE1BQU0sQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFTSxTQUFTLENBQUMsQ0FBQ3NCLElBQUksQ0FBQyxhQUFhLENBQUM7SUFDaEQ5TSxNQUFNLENBQUNrTCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRVEsUUFBUSxDQUFDLENBQUNzSSxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQzlDaFUsTUFBTSxDQUFDa0wsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVRLFFBQVEsQ0FBQyxDQUFDb0IsSUFBSSxDQUFDNUIsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVsRCxRQUFRLENBQUM7SUFDckRoSSxNQUFNLENBQUNrTCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRWhELE1BQU0sQ0FBQyxDQUFDNEUsSUFBSSxDQUFDL0QsTUFBTSxDQUFDYixNQUFNLENBQUM7SUFDN0NsSSxNQUFNLENBQUNrTCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRWxELFFBQVEsQ0FBQyxDQUFDOEUsSUFBSSxDQUFDL0QsTUFBTSxDQUFDZixRQUFRLENBQUM7SUFDakRoSSxNQUFNLENBQUN5TCxLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRXlMLGFBQWEsQ0FBQyxDQUFDbEQsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUMvQ2hVLE1BQU0sQ0FBQ3lMLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFZ2IsZUFBZSxDQUFDLENBQUN6UyxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQ2pEaFUsTUFBTSxFQUFBbW1CLHFCQUFBLEdBQUMxYSxLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRWdiLGVBQWUsY0FBQU4scUJBQUEsY0FBQUEscUJBQUEsR0FBSWxELFFBQVEsQ0FBQyxDQUFDN0UsWUFBWSxDQUFDbUgsa0JBQWtCLEdBQUcsSUFBSSxDQUFDO0lBQ2xGdmxCLE1BQU0sQ0FBQzJDLE1BQU0sQ0FBQzRQLE1BQU0sRUFBQTZULEtBQUEsSUFBQUMsa0JBQUEsR0FBQzNjLFFBQVEsQ0FBQ1ksT0FBTyxjQUFBK2Isa0JBQUEsdUJBQWhCQSxrQkFBQSxDQUFrQnhiLGNBQWMsY0FBQXViLEtBQUEsY0FBQUEsS0FBQSxHQUE4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUNqWixZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQ3ZHLE1BQU12TixTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLEdBQUdpbUIsY0FBYyxnQkFBZ0IsQ0FBQyxFQUFFcmtCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO01BQzlGd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO01BQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7TUFDdEN1SixLQUFLLEVBQUUsNERBQTREO01BQ25FdVAsU0FBUyxFQUFFLDhEQUE4RDtNQUN6RW5CLGtCQUFrQjtNQUNsQm9CLFVBQVUsRUFBRTVkLE1BQU07TUFDbEJ1TyxrQkFBa0IsRUFBRXBNLFNBQVM7TUFDN0IwYixrQ0FBa0MsRUFBRSxNQUFNbG1CLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQztNQUNuSG1LLGtCQUFrQixFQUFFUCxlQUFlO01BQ25DUSxjQUFjLEVBQUVQO0lBQ2xCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQ3BCLE1BQU1YLG9CQUFvQixDQUFDLEtBQUssQ0FBQztJQUNqQyxNQUFNbGxCLElBQUksQ0FBQzJULGNBQWMsQ0FBQyxHQUFHLENBQUM7SUFDOUIsTUFBTXJVLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDN0csT0FBTzVCLFNBQVM7RUFDbEIsQ0FBQztFQUVELE1BQU02YixZQUFZLEdBQUcsTUFBTXZNLGtCQUFrQixDQUFDLENBQUM7RUFDL0MsTUFBTTlaLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxtQ0FBbUM7RUFBRSxDQUFDLENBQUM7RUFDbEcsTUFBTSttQixZQUFZLEdBQUcsTUFBTWhCLG9CQUFvQixDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQztFQUUzRSxNQUFNdGxCLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTXlhLGdCQUFnQixHQUFHLE1BQU16TSxrQkFBa0IsQ0FBQyxDQUFDO0VBQ25ELE1BQU05WixJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsa0NBQWtDO0VBQUUsQ0FBQyxDQUFDO0VBQ2pHLE1BQU1pbkIsYUFBYSxHQUFHLE1BQU1sQixvQkFBb0IsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCLENBQUM7RUFFNUUsTUFBTXRsQixJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtJQUl4QixNQUFNSSxJQUFJLEdBQUdDLFFBQVEsQ0FBQ0MsY0FBYyxDQUFDLE1BQU0sQ0FBbUQ7SUFDOUYsSUFBSSxDQUFDRixJQUFJLEVBQUUsTUFBTSxJQUFJRyxLQUFLLENBQUMsK0RBQStELENBQUM7SUFDM0YsTUFBTUMsT0FBTyxHQUFHN0IsTUFBTSxDQUFDOEIsSUFBSSxDQUFDTCxJQUFJLENBQUMsQ0FBQ00sSUFBSSxDQUFFQyxHQUFHLElBQUtBLEdBQUcsQ0FBQ0MsVUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDcEYsSUFBSSxDQUFDSixPQUFPLEVBQUUsTUFBTSxJQUFJRCxLQUFLLENBQUMsNkNBQTZDLENBQUM7SUFDNUUsTUFBTU0sT0FBa0IsR0FBRyxDQUFDVCxJQUFJLENBQUNJLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLE1BQU0yaUIsSUFBSSxHQUFHLElBQUlDLEdBQUcsQ0FBVSxDQUFDO0lBQy9CLElBQUkvaEIsUUFBeUIsR0FBRyxJQUFJO0lBQ3BDLE9BQU9SLE9BQU8sQ0FBQ0UsTUFBTSxHQUFHLENBQUMsRUFBRTtNQUFBLElBQUFzaUIsZ0JBQUE7TUFDekIsTUFBTXBpQixLQUFLLEdBQUdKLE9BQU8sQ0FBQ0ssR0FBRyxDQUFDLENBQWlCO01BQzNDLElBQUksQ0FBQ0QsS0FBSyxJQUFJa2lCLElBQUksQ0FBQ0csR0FBRyxDQUFDcmlCLEtBQUssQ0FBQyxFQUFFO01BQy9Ca2lCLElBQUksQ0FBQ0ksR0FBRyxDQUFDdGlCLEtBQUssQ0FBQztNQUNmLElBQUlBLEtBQUssQ0FBQ3VpQixTQUFTLEVBQUUzaUIsT0FBTyxDQUFDM0IsSUFBSSxDQUFDK0IsS0FBSyxDQUFDdWlCLFNBQVMsQ0FBQztNQUNsRCxNQUFNcmlCLEtBQUssR0FBR0YsS0FBSyxDQUFDRyxhQUErQztNQUNuRSxJQUFJRCxLQUFLLGFBQUxBLEtBQUssZ0JBQUFraUIsZ0JBQUEsR0FBTGxpQixLQUFLLENBQUVFLFFBQVEsY0FBQWdpQixnQkFBQSxlQUFmQSxnQkFBQSxDQUFpQjljLEtBQUssRUFBRWxGLFFBQVEsR0FBR0YsS0FBSyxDQUFDRSxRQUFRO01BQ3JELElBQUlKLEtBQUssQ0FBQ00sS0FBSyxFQUFFVixPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNNLEtBQUssQ0FBQztNQUMxQyxJQUFJTixLQUFLLENBQUNPLE9BQU8sRUFBRVgsT0FBTyxDQUFDM0IsSUFBSSxDQUFDK0IsS0FBSyxDQUFDTyxPQUFPLENBQUM7SUFDaEQ7SUFDQSxJQUFJLENBQUNILFFBQVEsRUFBRSxNQUFNLElBQUlkLEtBQUssQ0FBQyxrREFBa0QsQ0FBQztJQUNsRixNQUFNb0QsUUFBUSxHQUFHdEMsUUFBUSxDQUFDa0YsS0FBSyxDQUFDa2Qsa0JBQWtCLENBQUMva0IsSUFBSSxDQUFDMkMsUUFBUSxDQUFDa0YsS0FBSyxDQUFDO0lBQ3ZFLElBQUltZCxrQkFBa0IsR0FBRyxJQUFJO0lBQzdCcmlCLFFBQVEsQ0FBQ2tGLEtBQUssQ0FBQ2tkLGtCQUFrQixHQUFHLE9BQU8sR0FBR25rQixJQUFJLEtBQUs7TUFDckQsTUFBTTZULEtBQUssR0FBRzdULElBQUksQ0FBQyxDQUFDLENBQXFDO01BQ3pELElBQUksQ0FBQTZULEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFN0wsT0FBTyxNQUFLLFdBQVcsSUFBSW9jLGtCQUFrQixFQUFFO1FBQ3hEQSxrQkFBa0IsR0FBRyxLQUFLO1FBQzFCLE1BQU10UixHQUFHLEdBQUcxSSxJQUFJLENBQUMwSSxHQUFHLENBQUMsQ0FBQztRQUN0QixPQUFPO1VBQ0w5SyxPQUFPLEVBQUUsV0FBVztVQUNwQjlFLElBQUksRUFBRSxJQUFJZ0MsSUFBSSxDQUFDLENBQUMsSUFBSVUsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFBRVQsSUFBSSxFQUFFO1VBQWEsQ0FBQyxDQUFDO1VBQ25FUixRQUFRLEVBQUUsWUFBWTtVQUN0QmtNLFNBQVMsRUFBRWlDLEdBQUcsR0FBRyxFQUFFO1VBQ25CdVIsU0FBUyxFQUFFdlIsR0FBRztVQUNkd1IsU0FBUyxFQUFFLEVBQUU7VUFDYnBjLFNBQVMsRUFBRSxhQUFhO1VBQ3hCQyxLQUFLLEVBQUU7WUFBRXhELFFBQVEsRUFBRSxZQUFZO1lBQUVELFFBQVEsRUFBRSxDQUFDO1lBQUV5ZSxlQUFlLEVBQUUsSUFBSTtZQUFFdlAsYUFBYSxFQUFFLElBQUk7WUFDdEYyUSxZQUFZLEVBQUUsSUFBSTtZQUFFQyxVQUFVLEVBQUUsSUFBSTtZQUFFQyxZQUFZLEVBQUUsYUFBYTtZQUFFQyxhQUFhLEVBQUU7VUFBRztRQUN6RixDQUFDO01BQ0g7TUFDQSxPQUFPcmdCLFFBQVEsQ0FBQyxHQUFHckUsSUFBSSxDQUFDO0lBQzFCLENBQUM7RUFDSCxDQUFDLENBQUM7RUFDRixNQUFNNUMsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUNILEtBQUssQ0FBQyxDQUFDO0VBQzVDLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyx1RkFBdUYsQ0FBQztFQUMxSixNQUFNaWIsYUFBYSxHQUFHLE1BQU16QyxnQkFBZ0IsQ0FBQyxDQUFDO0VBQzlDeGxCLE1BQU0sRUFBQTRrQixxQkFBQSxHQUFDcUQsYUFBYSxDQUFDL2MsU0FBUyxjQUFBMFoscUJBQUEsdUJBQXZCQSxxQkFBQSxDQUF5QnZaLEVBQUUsQ0FBQyxDQUFDeUIsSUFBSSxDQUFDb2EsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFLENBQUM7RUFDM0RyTCxNQUFNLEVBQUE2a0Isc0JBQUEsR0FBQ29ELGFBQWEsQ0FBQy9jLFNBQVMsY0FBQTJaLHNCQUFBLHVCQUF2QkEsc0JBQUEsQ0FBeUIzYyxNQUFNLENBQUMsQ0FBQzRFLElBQUksQ0FBQ29hLGFBQWEsYUFBYkEsYUFBYSx1QkFBYkEsYUFBYSxDQUFFaGYsTUFBTSxDQUFDO0VBQ25FLE1BQU14SCxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsK0NBQStDO0VBQUUsQ0FBQyxDQUFDO0VBRTlHLE1BQU1TLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBQUcxQyxNQUFNLENBQTZDaUMsZ0JBQWdCLEdBQUcsSUFBSTtFQUFFLENBQUMsQ0FBQztFQUMzRyxNQUFNN0MsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUNILEtBQUssQ0FBQyxDQUFDO0VBQzVDLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyxzRUFBc0UsQ0FBQztFQUN6SSxNQUFNa2IsV0FBVyxHQUFHLE1BQU0xQyxnQkFBZ0IsQ0FBQyxDQUFDO0VBQzVDeGxCLE1BQU0sRUFBQThrQixxQkFBQSxHQUFDb0QsV0FBVyxDQUFDaGQsU0FBUyxjQUFBNFoscUJBQUEsdUJBQXJCQSxxQkFBQSxDQUF1QnpaLEVBQUUsQ0FBQyxDQUFDeUIsSUFBSSxDQUFDb2EsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFLENBQUM7RUFDekRyTCxNQUFNLEVBQUEra0Isc0JBQUEsR0FBQ21ELFdBQVcsQ0FBQ2hkLFNBQVMsY0FBQTZaLHNCQUFBLHVCQUFyQkEsc0JBQUEsQ0FBdUI3YyxNQUFNLENBQUMsQ0FBQzRFLElBQUksQ0FBQ29hLGFBQWEsYUFBYkEsYUFBYSx1QkFBYkEsYUFBYSxDQUFFaGYsTUFBTSxDQUFDO0VBRWpFLE1BQU14SCxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtJQUV4QixNQUFNM0MsTUFBTSxHQUFHQyxNQUF5RjtJQUN4R0QsTUFBTSxDQUFDa0MsZ0JBQWdCLEdBQUcsS0FBSztJQUMvQixNQUFNSCxZQUFZLEdBQUdkLFNBQVMsQ0FBQ2MsWUFBWTtJQUMzQyxNQUFNdUUsUUFBUSxHQUFHdkUsWUFBWSxDQUFDQyxZQUFZLENBQUNYLElBQUksQ0FBQ1UsWUFBWSxDQUFDO0lBQzdELE1BQU15QixPQUF1QixHQUFHO01BQUVzakIsTUFBTSxFQUFFLElBQUk7TUFBRUMsT0FBTyxFQUFFO0lBQUssQ0FBQztJQUMvRC9tQixNQUFNLENBQUNnbkIscUJBQXFCLEdBQUd4akIsT0FBTztJQUN0Q3pCLFlBQVksQ0FBQ0MsWUFBWSxHQUFHLE9BQU8sR0FBR0MsSUFBOEMsS0FBSztNQUN2RixNQUFNNmtCLE1BQU0sR0FBRyxNQUFNeGdCLFFBQVEsQ0FBQyxHQUFHckUsSUFBSSxDQUFDO01BQ3RDdUIsT0FBTyxDQUFDc2pCLE1BQU0sR0FBR0EsTUFBTTtNQUN2QixNQUFNLElBQUkza0IsT0FBTyxDQUFRdEQsT0FBTyxJQUFLO1FBQUUyRSxPQUFPLENBQUN1akIsT0FBTyxHQUFHbG9CLE9BQU87TUFBRSxDQUFDLENBQUM7TUFDcEUsT0FBT2lvQixNQUFNO0lBQ2YsQ0FBQztFQUNILENBQUMsQ0FBQztFQUNGLE1BQU16bkIsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUNILEtBQUssQ0FBQyxDQUFDO0VBQzVDLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQztJQUFBLElBQUFza0Isb0JBQUE7SUFBQSxPQUFNQyxPQUFPLEVBQUFELG9CQUFBLEdBQUVobkIsTUFBTSxDQUF5RSttQixxQkFBcUIsY0FBQUMsb0JBQUEsdUJBQXJHQSxvQkFBQSxDQUF1R0gsTUFBTSxDQUFDO0VBQUEsRUFBQyxDQUFDLENBQUNyYixJQUFJLENBQUMsSUFBSSxDQUFDO0VBQy9LLE1BQU04WSxvQkFBb0IsQ0FBQyxJQUFJLENBQUM7RUFDaEMsTUFBTWxsQixJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtJQUN4QixNQUFNYSxPQUFPLEdBQUl2RCxNQUFNLENBQTJFK21CLHFCQUFxQjtJQUN2SCxJQUFJLEVBQUN4akIsT0FBTyxhQUFQQSxPQUFPLGVBQVBBLE9BQU8sQ0FBRXVqQixPQUFPLEdBQUUsTUFBTSxJQUFJN2pCLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQztJQUN2Rk0sT0FBTyxDQUFDdWpCLE9BQU8sQ0FBQyxDQUFDO0VBQ25CLENBQUMsQ0FBQztFQUNGLE1BQU1wb0IsTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsNkJBQTZCLEVBQUU7SUFBRUMsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQ3JILE1BQU11YixhQUFhLEdBQUcsTUFBTTluQixJQUFJLENBQUNzRCxRQUFRLENBQUM7SUFBQSxJQUFBeWtCLHFCQUFBLEVBQUFDLHFCQUFBO0lBQUEsUUFBQUQscUJBQUEsSUFBQUMscUJBQUEsR0FBT3BuQixNQUFNLENBQ3BEK21CLHFCQUFxQixjQUFBSyxxQkFBQSxnQkFBQUEscUJBQUEsR0FEd0JBLHFCQUFBLENBQ3RCUCxNQUFNLGNBQUFPLHFCQUFBLHVCQURnQkEscUJBQUEsQ0FDZEMsU0FBUyxDQUFDLENBQUMsQ0FBQzFkLEdBQUcsQ0FBRTJkLEtBQUssSUFBS0EsS0FBSyxDQUFDN1csVUFBVSxDQUFDLGNBQUEwVyxxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLEVBQUU7RUFBQSxFQUFDO0VBQ3JGem9CLE1BQU0sQ0FBQ3dvQixhQUFhLENBQUN6akIsTUFBTSxDQUFDLENBQUNpUCxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQy9DaFUsTUFBTSxDQUFDd29CLGFBQWEsQ0FBQ25MLEtBQUssQ0FBRXpSLEtBQUssSUFBS0EsS0FBSyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUNrQixJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ3BFOU0sTUFBTSxDQUFDLE1BQU0rRCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxDQUFDLENBQUM2TSxPQUFPLENBQUM7SUFBRS9MLGlCQUFpQixFQUFFLENBQUM7SUFBRUMsY0FBYyxFQUFFO0VBQUUsQ0FBQyxDQUFDO0VBQ3pGLE1BQU1vbkIsa0JBQWtCLEdBQUcsTUFBTXJELGdCQUFnQixDQUFDLENBQUM7RUFDbkR4bEIsTUFBTSxFQUFBZ2xCLHFCQUFBLEdBQUM2RCxrQkFBa0IsQ0FBQzNkLFNBQVMsY0FBQThaLHFCQUFBLHVCQUE1QkEscUJBQUEsQ0FBOEIzWixFQUFFLENBQUMsQ0FBQ3lCLElBQUksQ0FBQ29hLGFBQWEsYUFBYkEsYUFBYSx1QkFBYkEsYUFBYSxDQUFFN2IsRUFBRSxDQUFDO0VBQ2hFckwsTUFBTSxFQUFBaWxCLHNCQUFBLEdBQUM0RCxrQkFBa0IsQ0FBQzNkLFNBQVMsY0FBQStaLHNCQUFBLHVCQUE1QkEsc0JBQUEsQ0FBOEIvYyxNQUFNLENBQUMsQ0FBQzRFLElBQUksQ0FBQ29hLGFBQWEsYUFBYkEsYUFBYSx1QkFBYkEsYUFBYSxDQUFFaGYsTUFBTSxDQUFDO0VBQ3hFLE1BQU14SCxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsc0RBQXNEO0VBQUUsQ0FBQyxDQUFDO0VBQ3JILE1BQU1MLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsNkNBQTZDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQzFHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdENrYix1QkFBdUIsRUFBRTlCLFlBQVksYUFBWkEsWUFBWSx1QkFBWkEsWUFBWSxDQUFFM2IsRUFBRTtJQUN6QzBkLHdCQUF3QixFQUFFN0IsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFO0lBQzNDMmQsdUNBQXVDLEVBQUUsRUFBQTlELHNCQUFBLEdBQUErQyxhQUFhLENBQUMvYyxTQUFTLGNBQUFnYSxzQkFBQSx1QkFBdkJBLHNCQUFBLENBQXlCN1osRUFBRSxPQUFLNmIsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFO0lBQzFGNGQsd0NBQXdDLEVBQUUsRUFBQTlELHNCQUFBLEdBQUErQyxXQUFXLENBQUNoZCxTQUFTLGNBQUFpYSxzQkFBQSx1QkFBckJBLHNCQUFBLENBQXVCOVosRUFBRSxPQUFLNmIsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFO0lBQ3pGNmQsNEJBQTRCLEVBQUVWLGFBQWE7SUFDM0NXLHVDQUF1QyxFQUFFLEVBQUEvRCxzQkFBQSxHQUFBeUQsa0JBQWtCLENBQUMzZCxTQUFTLGNBQUFrYSxzQkFBQSx1QkFBNUJBLHNCQUFBLENBQThCL1osRUFBRSxPQUFLNmIsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU3YixFQUFFO0lBQy9GK2QsY0FBYyxFQUFFckMsWUFBWTtJQUM1QnNDLGFBQWEsRUFBRXBDLGdCQUFnQjtJQUMvQjFQLFdBQVcsRUFBRSxNQUFNeFQsZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7SUFDekM0b0IsMENBQTBDLEVBQUU7RUFDOUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBRUZ2cEIsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLE9BQU87RUFBRVc7QUFBSyxDQUFDLEtBQUs7RUFDOUZYLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7RUFDdkIsTUFBTTNOLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTTlMLElBQUksQ0FBQ00sSUFBSSxDQUFDLHFEQUFxRCxDQUFDO0VBQ3RFLE1BQU1OLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTVMscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUsR0FBRyxDQUFDO0VBQ3RDLE1BQU1vYyxJQUFJLEdBQUdwYyxJQUFJLENBQUNxTSxPQUFPLENBQUMsY0FBYyxDQUFDO0VBQ3pDLE1BQU0rRSxLQUFLLEdBQUdwUixJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDO0VBQ25DLE1BQU02TixLQUFLLEdBQUdsYSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDO0VBRW5DLEtBQUssTUFBTW1RLE1BQU0sSUFBSSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFBRTtJQUM5QyxNQUFNeGMsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFbWEsTUFBTTtNQUFFeFEsS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLE1BQU1sTSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsT0FBTztNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLE1BQU1zQyxNQUFNLEdBQUcsTUFBTTROLElBQUksQ0FBQy9DLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZDL1osTUFBTSxDQUFDa1AsTUFBTSxDQUFDLENBQUN3SCxHQUFHLENBQUNDLFFBQVEsQ0FBQyxDQUFDO0lBQzdCLE1BQU1qVyxJQUFJLENBQUNvakIsS0FBSyxDQUFDQyxJQUFJLENBQUM3VSxNQUFNLENBQUVnSyxDQUFDLEdBQUdoSyxNQUFNLENBQUUzQyxLQUFLLEdBQUcsR0FBRyxFQUFFMkMsTUFBTSxDQUFFaUssQ0FBQyxHQUFHakssTUFBTSxDQUFFMUMsTUFBTSxHQUFHLENBQUMsQ0FBQztJQUN0RixNQUFNOUwsSUFBSSxDQUFDb2pCLEtBQUssQ0FBQ3hGLElBQUksQ0FBQyxDQUFDO0lBQ3ZCLE1BQU14QixJQUFJLENBQUM0QixhQUFhLENBQUMsZUFBZSxFQUFFO01BQUU2SyxTQUFTLEVBQUUsQ0FBQztNQUFFQyxXQUFXLEVBQUU7SUFBUSxDQUFDLENBQUM7SUFDakYsTUFBTTlvQixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsTUFBTTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNzUixLQUFLLENBQUMsQ0FBQztJQUNyRSxNQUFNdGQsSUFBSSxDQUFDb2pCLEtBQUssQ0FBQ3ZGLEVBQUUsQ0FBQyxDQUFDO0lBQ3JCLE1BQU12ZSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTWlGLEtBQUssQ0FBQzlOLFFBQVEsQ0FBRStLLE9BQXlCLElBQUtBLE9BQU8sQ0FBQzJOLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2pHLElBQUlvUSxNQUFNLEtBQUssV0FBVyxFQUFFLE1BQU1sZCxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTStOLEtBQUssQ0FBQzVXLFFBQVEsQ0FBRStLLE9BQXlCLElBQUtBLE9BQU8sQ0FBQzJOLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQy9IO0VBRUEsTUFBTXBNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxVQUFVO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDekUsTUFBTWxNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxPQUFPO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdEUsTUFBTWtRLElBQUksQ0FBQ2tCLEtBQUssQ0FBQyxDQUFDO0VBQ2xCLE1BQU10ZCxJQUFJLENBQUN1ZCxRQUFRLENBQUNLLElBQUksQ0FBQyxZQUFZLENBQUM7RUFDdEMsTUFBTTVkLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxNQUFNO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ3NSLEtBQUssQ0FBQyxDQUFDO0VBQ3JFLE1BQU10ZCxJQUFJLENBQUN1ZCxRQUFRLENBQUNNLEVBQUUsQ0FBQyxZQUFZLENBQUM7RUFDcEMsTUFBTXZlLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNaUYsS0FBSyxDQUFDOU4sUUFBUSxDQUFFK0ssT0FBeUIsSUFBS0EsT0FBTyxDQUFDMk4sTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDakcsTUFBTXBNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSx5Q0FBeUM7RUFBRSxDQUFDLENBQUM7QUFDMUcsQ0FBQyxDQUFDO0FBRUZGLElBQUksQ0FBQyw4RUFBOEUsRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQ2hIdE0sSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxHQUFHO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN2RCxNQUFNOUwsSUFBSSxDQUFDVSxhQUFhLENBQUMsTUFBTTtJQUFHRSxNQUFNLENBQTZDaUMsZ0JBQWdCLEdBQUcsSUFBSTtFQUFFLENBQUMsQ0FBQztFQUNoSCxNQUFNcEMscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNTixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3ZFLE1BQU1nWCxLQUFLLEdBQUdsakIsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0VBQzdDLE1BQU0vTSxNQUFNLENBQUM0akIsS0FBSyxDQUFDLENBQUNoVixXQUFXLENBQUMsQ0FBQztFQUNqQyxNQUFNbE8sSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztFQUM5QixNQUFNb1YsTUFBTSxHQUFHLE1BQU0vb0IsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE9BQU87SUFDeEMyTSxPQUFPLEVBQUVyUCxNQUFNLENBQUNxUCxPQUFPO0lBQ3ZCK1ksU0FBUyxFQUFFcmxCLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCLFlBQVksR0FBR3phLE1BQU0sQ0FBQ2ljLFdBQVc7SUFDckV4QixZQUFZLEVBQUUxWCxRQUFRLENBQUNnVyxlQUFlLENBQUMwQjtFQUN6QyxDQUFDLENBQUMsQ0FBQztFQUNIL2IsTUFBTSxDQUFDeXBCLE1BQU0sQ0FBQzlZLE9BQU8sQ0FBQyxDQUFDcUQsZUFBZSxDQUFDLENBQUMsQ0FBQztFQUN6QyxNQUFNdFQsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDJDQUEyQztFQUFFLENBQUMsQ0FBQztFQUMxRyxNQUFNUyxJQUFJLENBQUMyVCxjQUFjLENBQUMsSUFBSyxDQUFDO0VBQ2hDLE1BQU1yVSxNQUFNLENBQUM0akIsS0FBSyxDQUFDLENBQUNoVCxXQUFXLENBQUMsQ0FBQyxDQUFDO0VBQ2xDLE1BQU0rWSxLQUFLLEdBQUcsTUFBTWpwQixJQUFJLENBQUNzRCxRQUFRLENBQUMsT0FBTztJQUN2QzJNLE9BQU8sRUFBRXJQLE1BQU0sQ0FBQ3FQLE9BQU87SUFDdkIrWSxTQUFTLEVBQUVybEIsUUFBUSxDQUFDZ1csZUFBZSxDQUFDMEIsWUFBWSxHQUFHemEsTUFBTSxDQUFDaWMsV0FBVztJQUNyRXhCLFlBQVksRUFBRTFYLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCO0VBQ3pDLENBQUMsQ0FBQyxDQUFDO0VBQ0gsTUFBTW5jLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsdUNBQXVDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ3BHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdEM2YixNQUFNO0lBQ05FO0VBQ0YsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7RUFDcEIzcEIsTUFBTSxDQUFDMnBCLEtBQUssQ0FBQ2haLE9BQU8sQ0FBQyxDQUFDN0QsSUFBSSxDQUFDMmMsTUFBTSxDQUFDOVksT0FBTyxDQUFDO0VBQzFDM1EsTUFBTSxDQUFDMnBCLEtBQUssQ0FBQ0QsU0FBUyxDQUFDLENBQUM1YyxJQUFJLENBQUMyYyxNQUFNLENBQUNDLFNBQVMsQ0FBQztFQUM5QzFwQixNQUFNLENBQUMycEIsS0FBSyxDQUFDNU4sWUFBWSxDQUFDLENBQUNqUCxJQUFJLENBQUMyYyxNQUFNLENBQUMxTixZQUFZLENBQUM7RUFDcEQsTUFBTS9iLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHNFQUFzRSxDQUFDO0VBQ3pJLE1BQU10TSxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMENBQTBDO0VBQUUsQ0FBQyxDQUFDO0VBQ3pHLE1BQU1MLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsdUNBQXVDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ3BHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdEM2YixNQUFNO0lBQ05FLEtBQUs7SUFDTEMsdUJBQXVCLEVBQUUsTUFBTWxwQixJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQzJYLFNBQVMsQ0FBQztFQUNqRixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUM7QUFFRjNrQixJQUFJLENBQUMsNkVBQTZFLEVBQUUsT0FBTztFQUFFVyxJQUFJO0VBQUUyTDtBQUFRLENBQUMsS0FBSztFQUMvR3RNLElBQUksQ0FBQ3NPLFVBQVUsQ0FBQyxLQUFNLENBQUM7RUFDdkIsTUFBTXdiLFlBQVksR0FBRyxtR0FBbUc7RUFDeEgsTUFBTUMsWUFBNEMsR0FBRyxFQUFFO0VBQ3ZELEtBQUssTUFBTXJXLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBVztJQUN4QyxNQUFNL1MsSUFBSSxDQUFDNEwsZUFBZSxDQUFDO01BQUVDLEtBQUssRUFBRSxJQUFJO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsQ0FBQztJQUN4RCxNQUFNOUwsSUFBSSxDQUFDTSxJQUFJLENBQUMsR0FBRyxDQUFDO0lBQ3BCLE1BQU1oQixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDNkIsV0FBVyxDQUFDLENBQUM7SUFDdEQsTUFBTWxPLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxDQUFDO01BQUUrbEIsY0FBYztNQUFFQztJQUFZLENBQUMsS0FBSztNQUt2RCxNQUFNNWxCLElBQUksR0FBR0MsUUFBUSxDQUFDQyxjQUFjLENBQUMsTUFBTSxDQUFtRDtNQUM5RixJQUFJLENBQUNGLElBQUksRUFBRSxNQUFNLElBQUlHLEtBQUssQ0FBQyxnRUFBZ0UsQ0FBQztNQUM1RixNQUFNQyxPQUFPLEdBQUc3QixNQUFNLENBQUM4QixJQUFJLENBQUNMLElBQUksQ0FBQyxDQUFDTSxJQUFJLENBQUVDLEdBQUcsSUFBS0EsR0FBRyxDQUFDQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztNQUNwRixJQUFJLENBQUNKLE9BQU8sRUFBRSxNQUFNLElBQUlELEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQztNQUM1RSxNQUFNTSxPQUFrQixHQUFHLENBQUNULElBQUksQ0FBQ0ksT0FBTyxDQUFDLENBQUM7TUFDMUMsTUFBTTJpQixJQUFJLEdBQUcsSUFBSUMsR0FBRyxDQUFVLENBQUM7TUFDL0IsSUFBSS9oQixRQUF5QixHQUFHLElBQUk7TUFDcEMsT0FBT1IsT0FBTyxDQUFDRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQUEsSUFBQWtsQixnQkFBQTtRQUN6QixNQUFNaGxCLEtBQUssR0FBR0osT0FBTyxDQUFDSyxHQUFHLENBQUMsQ0FBaUI7UUFDM0MsSUFBSSxDQUFDRCxLQUFLLElBQUlraUIsSUFBSSxDQUFDRyxHQUFHLENBQUNyaUIsS0FBSyxDQUFDLEVBQUU7UUFDL0JraUIsSUFBSSxDQUFDSSxHQUFHLENBQUN0aUIsS0FBSyxDQUFDO1FBQ2YsSUFBSUEsS0FBSyxDQUFDdWlCLFNBQVMsRUFBRTNpQixPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUN1aUIsU0FBUyxDQUFDO1FBQ2xELE1BQU1yaUIsS0FBSyxHQUFHRixLQUFLLENBQUNHLGFBQStDO1FBQ25FLElBQUlELEtBQUssYUFBTEEsS0FBSyxnQkFBQThrQixnQkFBQSxHQUFMOWtCLEtBQUssQ0FBRUUsUUFBUSxjQUFBNGtCLGdCQUFBLGVBQWZBLGdCQUFBLENBQWlCM2tCLFFBQVEsRUFBRUQsUUFBUSxHQUFHRixLQUFLLENBQUNFLFFBQVE7UUFDeEQsSUFBSUosS0FBSyxDQUFDTSxLQUFLLEVBQUVWLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ00sS0FBSyxDQUFDO1FBQzFDLElBQUlOLEtBQUssQ0FBQ08sT0FBTyxFQUFFWCxPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNPLE9BQU8sQ0FBQztNQUNoRDtNQUNBLElBQUksQ0FBQ0gsUUFBUSxFQUFFLE1BQU0sSUFBSWQsS0FBSyxDQUFDLGdEQUFnRCxDQUFDO01BQ2hGLE1BQU0ybEIsWUFBWSxHQUFHN2tCLFFBQVEsQ0FBQ0MsUUFBUSxDQUFDa2MsbUJBQW1CLENBQUM5ZSxJQUFJLENBQUMyQyxRQUFRLENBQUNDLFFBQVEsQ0FBQztNQUNsRkQsUUFBUSxDQUFDQyxRQUFRLENBQUNrYyxtQkFBbUIsR0FBRyxPQUFPLEdBQUdsZSxJQUFJLEtBQUs7UUFDekQsTUFBTWdILE9BQU8sR0FBRyxNQUFNNGYsWUFBWSxDQUFDLEdBQUc1bUIsSUFBSSxDQUFDO1FBQzNDLE9BQU9nSCxPQUFPLEdBQUc7VUFDZixHQUFHQSxPQUFPO1VBQ1ZpTCxPQUFPLEVBQUVqTCxPQUFPLENBQUNpTCxPQUFPLENBQUN0SyxHQUFHLENBQUUzSixNQUFNLElBQUtBLE1BQU0sQ0FBQytKLEVBQUUsS0FBSyxlQUFlLEdBQ2xFO1lBQUUsR0FBRy9KLE1BQU07WUFBRTBYLElBQUksRUFBRTtjQUFFLEdBQUcxWCxNQUFNLENBQUMwWCxJQUFJO2NBQUVtUixFQUFFLEVBQUVIO1lBQVk7VUFBRSxDQUFDLEdBQ3hEMW9CLE1BQU07UUFDWixDQUFDLEdBQUcsSUFBSTtNQUNWLENBQUM7TUFDRDhvQixPQUFPLENBQUNDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsMkNBQTJDTixjQUFjLCtCQUErQixDQUFDO01BQ25Iem9CLE1BQU0sQ0FBQ29kLGFBQWEsQ0FBQyxJQUFJNEwsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3JELENBQUMsRUFBRTtNQUFFUCxjQUFjLEVBQUV0VyxNQUFNO01BQUV1VyxXQUFXLEVBQUVIO0lBQWEsQ0FBQyxDQUFDO0lBQ3pELE1BQU03cEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsVUFBVTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDdkYsTUFBTTNNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQzhLLFVBQVUsQ0FBQ2dTLFlBQVksQ0FBQztJQUN2RSxNQUFNbnBCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUMwVCxLQUFLLENBQUNDLEtBQUssQ0FBQztJQUUvQyxLQUFLLE1BQU04QixRQUFRLElBQUksQ0FBQztNQUFFdk4sS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxFQUFFO01BQUVELEtBQUssRUFBRSxJQUFJO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsRUFBRTtNQUFFRCxLQUFLLEVBQUUsR0FBRztNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUMsRUFBRTtNQUFBLElBQUErZCxxQkFBQSxFQUFBQyxnQkFBQSxFQUFBQyxjQUFBLEVBQUFDLFlBQUEsRUFBQUMsZUFBQSxFQUFBQyxhQUFBLEVBQUFDLGVBQUEsRUFBQUMsYUFBQTtNQUNoSCxNQUFNcHFCLElBQUksQ0FBQzRMLGVBQWUsQ0FBQ3dOLFFBQVEsQ0FBQztNQUNwQyxNQUFNcFosSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztNQUM5QixNQUFNdkssTUFBTSxHQUFHLE1BQU1wSixJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtRQUFBLElBQUErbUIsc0JBQUE7UUFDdkMsTUFBTTdiLE1BQU0sR0FBSTBKLFFBQWdCLElBQUs7VUFDbkMsTUFBTTdKLE9BQU8sR0FBRzFLLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQ3VKLFFBQVEsQ0FBQztVQUNoRCxJQUFJLENBQUM3SixPQUFPLEVBQUUsT0FBTyxJQUFJO1VBQ3pCLE1BQU1nSyxJQUFJLEdBQUdoSyxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7VUFDNUMsT0FBTztZQUFFK0osQ0FBQyxFQUFFSCxJQUFJLENBQUNHLENBQUM7WUFBRUMsQ0FBQyxFQUFFSixJQUFJLENBQUNJLENBQUM7WUFBRTVNLEtBQUssRUFBRXdNLElBQUksQ0FBQ3hNLEtBQUs7WUFBRUMsTUFBTSxFQUFFdU0sSUFBSSxDQUFDdk0sTUFBTTtZQUFFaUQsTUFBTSxFQUFFc0osSUFBSSxDQUFDdEo7VUFBTyxDQUFDO1FBQzlGLENBQUM7UUFDRCxPQUFPO1VBQ0xxSyxRQUFRLEVBQUU7WUFBRXZOLEtBQUssRUFBRWdQLFVBQVU7WUFBRS9PLE1BQU0sRUFBRStRO1VBQVksQ0FBQztVQUNwRHZFLElBQUksR0FBQStSLHNCQUFBLEdBQUUxbUIsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLGtCQUFrQixDQUFDLGNBQUEwYixzQkFBQSx1QkFBMUNBLHNCQUFBLENBQTRDMVMsV0FBVztVQUM3RDlOLEtBQUssRUFBRTJFLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQztVQUNoQ3FMLEtBQUssRUFBRXJMLE1BQU0sQ0FBQyxlQUFlLENBQUM7VUFDOUJpSixRQUFRLEVBQUVqSixNQUFNLENBQUMsZ0JBQWdCLENBQUM7VUFDbEM4SyxJQUFJLEVBQUU5SyxNQUFNLENBQUMsZUFBZSxDQUFDO1VBQzdCdU8sY0FBYyxFQUFFcFosUUFBUSxDQUFDZ1csZUFBZSxDQUFDMEIsWUFBWTtVQUNyRFYsa0JBQWtCLEVBQUVoWCxRQUFRLENBQUNnVyxlQUFlLENBQUNpQixXQUFXLEdBQUdDO1FBQzdELENBQUM7TUFDSCxDQUFDLENBQUM7TUFDRnZiLE1BQU0sQ0FBQzhKLE1BQU0sQ0FBQ2tQLElBQUksQ0FBQyxDQUFDbE0sSUFBSSxDQUFDK2MsWUFBWSxDQUFDO01BQ3RDN3BCLE1BQU0sQ0FBQzhKLE1BQU0sQ0FBQ3VSLGtCQUFrQixDQUFDLENBQUN2TyxJQUFJLENBQUMsS0FBSyxDQUFDO01BQzdDOU0sTUFBTSxFQUFBdXFCLHFCQUFBLElBQUFDLGdCQUFBLEdBQUMxZ0IsTUFBTSxDQUFDcU8sUUFBUSxjQUFBcVMsZ0JBQUEsdUJBQWZBLGdCQUFBLENBQWlCL2EsTUFBTSxjQUFBOGEscUJBQUEsY0FBQUEscUJBQUEsR0FBSXRILFFBQVEsQ0FBQyxDQUFDaFQsbUJBQW1CLEVBQUF3YSxjQUFBLElBQUFDLFlBQUEsR0FBQzVnQixNQUFNLENBQUNrUSxJQUFJLGNBQUEwUSxZQUFBLHVCQUFYQSxZQUFBLENBQWF2UixDQUFDLGNBQUFzUixjQUFBLGNBQUFBLGNBQUEsR0FBSSxDQUFDeEgsUUFBUSxDQUFDO01BQzVGLElBQUl4UCxNQUFNLEtBQUssR0FBRyxJQUFJcUcsUUFBUSxDQUFDdk4sS0FBSyxJQUFJLElBQUksRUFBRXZNLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDLEVBQUE4VCxlQUFBLElBQUFDLGFBQUEsR0FBQzlnQixNQUFNLENBQUN5USxLQUFLLGNBQUFxUSxhQUFBLHVCQUFaQSxhQUFBLENBQWN6UixDQUFDLGNBQUF3UixlQUFBLGNBQUFBLGVBQUEsR0FBSSxDQUFDLEdBQUcsTUFBQUUsZUFBQSxJQUFBQyxhQUFBLEdBQUtoaEIsTUFBTSxDQUFDUyxLQUFLLGNBQUF1Z0IsYUFBQSx1QkFBWkEsYUFBQSxDQUFjM1IsQ0FBQyxjQUFBMFIsZUFBQSxjQUFBQSxlQUFBLEdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM1YSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7TUFDN0k2WixZQUFZLENBQUM1bUIsSUFBSSxDQUFDO1FBQUV1USxNQUFNO1FBQUUsR0FBRzNKO01BQU8sQ0FBQyxDQUFDO01BQ3hDLE1BQU0vRyxJQUFJLEdBQUcsV0FBVzBRLE1BQU0sSUFBSXFHLFFBQVEsQ0FBQ3ZOLEtBQUssSUFBSXVOLFFBQVEsQ0FBQ3ROLE1BQU0sTUFBTTtNQUN6RSxNQUFNOUwsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFOEMsSUFBSSxDQUFDO1FBQUUrUCxRQUFRLEVBQUVnSCxRQUFRLENBQUN2TixLQUFLLEdBQUc7TUFBSSxDQUFDLENBQUM7SUFDckc7RUFDRjtFQUNBLE1BQU0zTSxTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHNDQUFzQyxDQUFDLEVBQUU0QixJQUFJLENBQUNJLFNBQVMsQ0FBQztJQUNuR3dMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUM5QnRCLE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3RDb2QsUUFBUSxFQUFFbkIsWUFBWTtJQUN0QjNNLE1BQU0sRUFBRSx5RkFBeUY7SUFDakc0TTtFQUNGLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQyIsImlnbm9yZUxpc3QiOltdfQ==