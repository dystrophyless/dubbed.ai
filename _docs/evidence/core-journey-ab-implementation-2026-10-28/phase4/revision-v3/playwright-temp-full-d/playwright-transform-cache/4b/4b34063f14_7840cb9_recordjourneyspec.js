// 9bca320d64d6b653f9f3df6c85964f2c7b24551d
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
    const downloadPath = await download.path();
    expect(download.suggestedFilename()).toBe('example-dub.mp4');
    expect(downloadPath).not.toBeNull();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJuYW1lcyI6WyJta2RpciIsInJlYWRGaWxlIiwid3JpdGVGaWxlIiwiY3JlYXRlSGFzaCIsInBhdGgiLCJ0ZXN0IiwiZXhwZWN0IiwiZXZpZGVuY2VEaXJlY3RvcnkiLCJyZXNvbHZlIiwicHJvY2VzcyIsImN3ZCIsIl9wcm9jZXNzJGVudiREVUJCRURfQyIsImVudiIsIkRVQkJFRF9DT1JFX0VWSURFTkNFX1JVTiIsInNwbGl0Iiwic2V0UmVjb3JkTG9jYWxlIiwicGFnZSIsImxvY2FsZSIsInVybCIsIlVSTCIsInNlYXJjaFBhcmFtcyIsInNldCIsImdvdG8iLCJwYXRobmFtZSIsInNlYXJjaCIsImluc3RydW1lbnROYXRpdmVNZWRpYSIsImFkZEluaXRTY3JpcHQiLCJ0YXJnZXQiLCJ3aW5kb3ciLCJfX25hdGl2ZVJlY29yZEV2aWRlbmNlIiwiZ2V0VXNlck1lZGlhQ2FsbHMiLCJyZWNvcmRlclN0YXJ0cyIsInNhdmVkRXZpZGVuY2UiLCJzZXNzaW9uU3RvcmFnZSIsImdldEl0ZW0iLCJKU09OIiwicGFyc2UiLCJwZXJzaXN0TmF0aXZlRXZpZGVuY2UiLCJzZXRJdGVtIiwic3RyaW5naWZ5IiwiX19sb2NrRXZpZGVuY2UiLCJyZXF1ZXN0cyIsImNhbGxiYWNrcyIsImxvY2tNYW5hZ2VyIiwibmF2aWdhdG9yIiwibG9ja3MiLCJvcmlnaW5hbFJlcXVlc3QiLCJyZXF1ZXN0IiwiYmluZCIsIk9iamVjdCIsImRlZmluZVByb3BlcnR5IiwiY29uZmlndXJhYmxlIiwidmFsdWUiLCJuYW1lIiwib3B0aW9ucyIsImNhbGxiYWNrIiwicHVzaCIsImxvY2siLCJtZWRpYURldmljZXMiLCJnZXRVc2VyTWVkaWEiLCJhcmdzIiwiX19kZW55TWljcm9waG9uZSIsIlByb21pc2UiLCJyZWplY3QiLCJET01FeGNlcHRpb24iLCJNZWRpYVJlY29yZGVyIiwic3RhcnQiLCJwcm90b3R5cGUiLCJhcHBseSIsImV2aWRlbmNlQ291bnRlcnMiLCJldmFsdWF0ZSIsImluc3RhbGxTdG9yZUZhaWx1cmUiLCJtb2RlIiwiZmF1bHRNb2RlIiwicm9vdCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJFcnJvciIsInJvb3RLZXkiLCJrZXlzIiwiZmluZCIsImtleSIsInN0YXJ0c1dpdGgiLCJwZW5kaW5nIiwic3RvcmUiLCJsZW5ndGgiLCJfcHJvcHMkc2VydmljZXMiLCJmaWJlciIsInBvcCIsInByb3BzIiwibWVtb2l6ZWRQcm9wcyIsInNlcnZpY2VzIiwicHJvamVjdHMiLCJjaGlsZCIsInNpYmxpbmciLCJvcmlnaW5hbFNhdmUiLCJzYXZlQ2FuZGlkYXRlIiwib3JpZ2luYWxMb29rdXAiLCJsb29rdXBPcGVyYXRpb24iLCJ0cmFjZSIsInNhdmVDYWxscyIsImxvb2t1cENhbGxzIiwib3BlcmF0aW9uSWRzIiwiYmxvYlNpemVzIiwicmV0cnlTYW1lQmxvYiIsIl9fc3RvcmVGYWlsdXJlVHJhY2UiLCJmaXJzdEtub3duRmFpbHVyZSIsImZhaWxlZEJsb2IiLCJvcGVyYXRpb25JZCIsImNhcHR1cmUiLCJibG9iIiwic2l6ZSIsImNvbW1pdHRlZCIsImtpbmQiLCJyZWFzb24iLCJTdHJpbmciLCJpbnN0YWxsQWNjZXB0YW5jZUZhaWx1cmUiLCJvcmlnaW5hbFRyYW5zYWN0aW9uIiwiSURCRGF0YWJhc2UiLCJ0cmFuc2FjdGlvbiIsImNhbGxzIiwic3RvcmVzIiwicmVzdG9yZSIsInVuZGVmaW5lZCIsIl9fYWNjZXB0RmFpbHVyZVRyYWNlIiwic3RvcmVOYW1lcyIsImluY2x1ZGVzIiwiY2FsbCIsImluc3RhbGxOZXh0T3BlcmF0aW9uV3JpdGVGYWlsdXJlIiwib3JpZ2luYWwiLCJfX29wZXJhdGlvbldyaXRlRmFpbHVyZSIsIl9fcmVzdG9yZU9wZXJhdGlvbldyaXRlRmFpbHVyZSIsInRyYWNlTmV4dE5hdGl2ZUJsb2JEaWdlc3QiLCJjYXB0dXJlcyIsImJ5dGVTaXplIiwibWltZVR5cGUiLCJzaGEyNTYiLCJfX25hdGl2ZUJsb2JEaWdlc3RUcmFjZSIsImNodW5rcyIsImFkZEV2ZW50TGlzdGVuZXIiLCJldmVudCIsImRhdGEiLCJCbG9iIiwidHlwZSIsImFycmF5QnVmZmVyIiwidGhlbiIsImJ5dGVzIiwiY3J5cHRvIiwic3VidGxlIiwiZGlnZXN0IiwiQXJyYXkiLCJmcm9tIiwiVWludDhBcnJheSIsImJ5dGUiLCJ0b1N0cmluZyIsInBhZFN0YXJ0Iiwiam9pbiIsIm9uY2UiLCJzdG9yZUZhaWx1cmVUcmFjZSIsInJlYWRJbmRleGVkRGIiLCJkYXRhYmFzZSIsImluZGV4ZWREQiIsIm9wZW4iLCJvbnN1Y2Nlc3MiLCJyZXN1bHQiLCJvbmVycm9yIiwiZXJyb3IiLCJyZWFkIiwic3RvcmVOYW1lIiwib2JqZWN0U3RvcmUiLCJnZXRBbGwiLCJnZXQiLCJwcm9qZWN0IiwibWVkaWEiLCJvcGVyYXRpb25zIiwic25hcHNob3RzIiwiY2xvc2UiLCJyZXZpc2lvbiIsImRyYWZ0Q2FuZGlkYXRlQnlUdXJuIiwiYWNjZXB0ZWRCeVR1cm4iLCJpbml0aWFsUmVzdWx0U25hcHNob3RJZCIsImxhdGVzdFJlc3VsdFNuYXBzaG90SWQiLCJ0b21ic3RvbmVkQXQiLCJtYXAiLCJjYW5kaWRhdGUiLCJfc2l6ZSIsIl9jYW5kaWRhdGUkYmxvYiIsImlkIiwicHVycG9zZSIsInR1cm5JZCIsImVuZFJlYXNvbiIsInByb2JlIiwiYmxvYlNpemUiLCJvcGVyYXRpb24iLCJzdGF0ZSIsInByb2plY3RSZXZpc2lvbiIsInNuYXBzaG90SWQiLCJuYXZpZ2F0aW9uSW50ZW50IiwibmF2aWdhdGlvbkNvbXBsZXRlZCIsInNuYXBzaG90IiwiY29udGVudFNoYTI1NiIsImF1dGhvcml6YXRpb24iLCJ0YWtlcyIsImJyb3dzZXIiLCJzZXRWaWV3cG9ydFNpemUiLCJ3aWR0aCIsImhlaWdodCIsImdldEJ5Um9sZSIsImV4YWN0IiwidG9CZUVuYWJsZWQiLCJjbGljayIsInBvbGwiLCJ0b0JlIiwibG9jYXRvciIsInRvQ29udGFpblRleHQiLCJ0aW1lb3V0IiwidW5rbm93blRyYWNlIiwidG9IYXZlTGVuZ3RoIiwic3RvcmVkIiwid2FpdEZvclNhdmVkQ2FuZGlkYXRlIiwicmVzb2x2ZWRUcmFjZSIsInRvRXF1YWwiLCJqb3VybmFsRW50cnkiLCJkYXRlIiwiRGF0ZSIsInRvSVNPU3RyaW5nIiwidmVyc2lvbiIsInNjZW5hcmlvIiwicGh5c2ljYWxNaWNyb3Bob25lIiwibmF0aXZlQXBpRXZpZGVuY2UiLCJzYXZlZENhbmRpZGF0ZSIsIl9iZWZvcmVGYWlsdXJlJHByb2plYyIsIl9hZnRlckZhaWx1cmUkcHJvamVjdCIsIl9hZnRlclJldHJ5JHByb2plY3QiLCJfYWZ0ZXJSZXRyeSRwcm9qZWN0MiIsInNldFRpbWVvdXQiLCJyZWNvcmRDdXJyZW50V2luZG93IiwidG9IYXZlVVJMIiwiYmVmb3JlRmFpbHVyZSIsImFjY2VwdGVkQmVmb3JlIiwidG9CZVRydXRoeSIsInJlY292ZXJ5VG9hc3QiLCJ0b0JlVmlzaWJsZSIsImNvdW50IiwidG9hc3RTdHlsZSIsImVsZW1lbnQiLCJzdHlsZSIsImdldENvbXB1dGVkU3R5bGUiLCJib3VuZHMiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJpY29uIiwicXVlcnlTZWxlY3RvciIsImJhY2tncm91bmQiLCJiYWNrZ3JvdW5kQ29sb3IiLCJib3JkZXJSYWRpdXMiLCJib3R0b20iLCJwYWRkaW5nIiwiYm94U2hhZG93IiwiaWNvbkNvbG9yIiwiY29sb3IiLCJ0aXRsZUZvbnQiLCJmb250IiwiYm9keUZvbnQiLCJ0b0JlTGVzc1RoYW5PckVxdWFsIiwic2NyZWVuc2hvdCIsImZhaWxlZFRyYWNlIiwidG9Db250YWluIiwiZm9jdXNCZWZvcmVFeHBpcnkiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWUiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWUyIiwicmVjb3ZlcnlGb2N1c2VkIiwiYWN0aXZlRWxlbWVudCIsIm1hdGNoZXMiLCJzY3JvbGxZIiwidG9IYXZlQ291bnQiLCJhZnRlckZhaWx1cmUiLCJmaWx0ZXIiLCJzYXZlZCIsInJlY292ZXJlZFRyYWNlIiwiYWZ0ZXJSZXRyeSIsImFjY2VwdGVkQ2FuZGlkYXRlQmVmb3JlRmFpbHVyZSIsImZhaWxlZEF0dGVtcHQiLCJjYXB0dXJlZEJsb2JCZWZvcmVQZXJzaXN0ZW5jZSIsInJldHJ5IiwiZmluYWxQcm9qZWN0IiwicmV0cmllZENhbmRpZGF0ZSIsIl9mYWlsZWQkcHJvamVjdCIsIl9yZWYiLCJfZmFpbGVkJHByb2plY3QyIiwiX2FjY2VwdGVkJHByb2plY3QiLCJfZmFpbGVkJHByb2plY3QzIiwiX2FjY2VwdGVkJHByb2plY3QyIiwidmlkZW8iLCJyZWFkeVN0YXRlIiwiSFRNTE1lZGlhRWxlbWVudCIsIkhBVkVfQ1VSUkVOVF9EQVRBIiwidmlkZW9XaWR0aCIsImd1YXJkIiwidG9CZUZvY3VzZWQiLCJmYWlsZWQiLCJ0b01hdGNoT2JqZWN0IiwidmFsdWVzIiwiYWNjZXB0YW5jZUZhaWx1cmUiLCJiZWZvcmVUb2FzdEV4cGlyeSIsIl9kb2N1bWVudCRhY3RpdmVFbGVtZTMiLCJfZG9jdW1lbnQkYWN0aXZlRWxlbWU0IiwiZm9jdXNlZFJldHJ5IiwicmV0cnlGb2N1c2VkQWZ0ZXJUb2FzdEV4cGlyeSIsImZ1bGxQYWdlIiwiZ2V0QnlUZXN0SWQiLCJhY2NlcHRlZCIsInN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zIiwibmF0aXZlSW5wdXQiLCJjYW5kaWRhdGVJZCIsImFjY2VwdGVkQmVmb3JlUmV0cnkiLCJhY2NlcHRlZEFmdGVyUmV0cnkiLCJmYWlsdXJlVHJhY2UiLCJmb2N1c0JlZm9yZVRvYXN0RXhwaXJ5IiwiYm91bmRhcnlSZXR1cm5Gb2N1c2VkRXhpdCIsImxheW91dCIsIl9VUkwkc2VhcmNoUGFyYW1zJGdldCIsIl9kYXRhYmFzZSRwcm9qZWN0Iiwibm90aWNlIiwiY3VycmVudFR1cm5JZCIsImRyYWZ0QnlUdXJuIiwiY3VycmVudCIsInRvQmVHcmVhdGVyVGhhbiIsInRvTWF0Y2giLCJyZWNvcmRCdXR0b24iLCJzdGFydGVkQXQiLCJjdXJyZW50VGltZSIsIndhaXRGb3JUaW1lb3V0IiwibW92ZWRUbyIsImJlZm9yZUFsbCIsInJlY3Vyc2l2ZSIsIl9iZWZvcmVSZWFsUGxheWJhY2skdiIsIl90cmFjZSRyZXF1ZXN0ZWRBdCIsIl90cmFjZSRuYXRpdmVQbGF5QXQiLCJfdHJhY2UkcmVxdWVzdGVkQXQyIiwiX3RyYWNlJG5hdGl2ZVBsYXlBdDIiLCJfdHJhY2UkcGxheWluZ0F0IiwiX3RyYWNlJHJlY29yZGVyU3RhcnRWIiwiX3RyYWNlJHBsYXlpbmdWaWRlb1RpIiwiX3RyYWNlJHBsYXlpbmdWaWRlb1RpMiIsIl90cmFjZSRyZWNvcmRlclN0b3BWaSIsIl90cmFjZSRyZWNvcmRlclN0b3BWaTIiLCJfdHJhY2UkcmVjb3JkZXJTdGFydFYyIiwicHJlcGFyZWRXaW5kb3ciLCJzZWxlY3RlZCIsIndpbmRvd3MiLCJyZXF1ZXN0ZWRBdCIsIm5hdGl2ZVBsYXlBdCIsInBsYXlpbmdBdCIsInBsYXlpbmdWaWRlb1RpbWUiLCJyZWNvcmRlclN0YXJ0QXQiLCJyZWNvcmRlclN0YXJ0VmlkZW9UaW1lIiwicmVjb3JkZXJTdG9wQXQiLCJyZWNvcmRlclN0b3BWaWRlb1RpbWUiLCJfX2RlbGF5ZWRDYXB0dXJlVHJhY2UiLCJuYXRpdmVQbGF5IiwicGxheSIsInBlcmZvcm1hbmNlIiwibm93Iiwic3RvcCIsImJlZm9yZVJlYWxQbGF5YmFjayIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdCIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdDIiLCJ2aWRlb1RpbWUiLCJub3QiLCJ0b0JlTnVsbCIsIk1hdGgiLCJhYnMiLCJzdGFydE1zIiwiZXhwZWN0ZWREdXJhdGlvbiIsImVuZE1zIiwidG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCIsImRlY29kZWRGcmFtZXMiLCJpbnB1dCIsInNvdXJjZVBsYXlEZWxheU1zIiwibmF0aXZlVHJhY2UiLCJwZXJzaXN0ZWRDYW5kaWRhdGUiLCJhcGlDb3VudGVycyIsIl9yZWYzIiwiX21lZGlhJHByb2plY3QiLCJfZmluYWxEYXRhYmFzZSRwcm9qZWMiLCJfc2hvcnRSZXN1bHQkdGl0bGUiLCJfc2hvcnRSZXN1bHQkZXhpdCIsInRvSGF2ZVRleHQiLCJ0b0hhdmVBdHRyaWJ1dGUiLCJmb250cyIsInJlYWR5IiwidG9CZUluVmlld3BvcnQiLCJnZXRCeUxhYmVsIiwiZGlhbG9ndWUiLCJlbmdsaXNoRGlhbG9ndWUiLCJ0ZXh0Q29udGVudCIsInJ1c3NpYW5EaWFsb2d1ZSIsInRvTG93ZXJDYXNlIiwiaGFzVGV4dCIsImluaXRpYWxCdXR0b24iLCJoZWFkZXJFdmlkZW5jZSIsImluc3BlY3QiLCJzZWxlY3RvciIsIl9lbGVtZW50JHRleHRDb250ZW50JCIsIl9lbGVtZW50JHRleHRDb250ZW50IiwicmVjdCIsInRleHQiLCJ0cmltIiwieCIsInkiLCJvcGFjaXR5IiwidmlzaWJpbGl0eSIsImRpc3BsYXkiLCJleGl0IiwidGl0bGUiLCJkb3RzIiwibWFicnlMb2FkZWQiLCJjaGVjayIsImRpYWxvZ3VlRm9udCIsImZvbnRGYW1pbHkiLCJ2aWV3cG9ydCIsImJvdW5kaW5nQm94Iiwid2F2ZSIsImNvbnRyb2xzIiwiX2V4aXQkeCIsImNlbnRlciIsInZpc2libGVDZW50ZXIiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGllbnRXaWR0aCIsInBhbmVsIiwiZXhwZWN0UGFuZWxBbGlnbmVkIiwibWVkaWFZIiwicGFuZWxZIiwicmVjb3JkaW5nTm90aWNlIiwiYXVkaW8iLCJnZXRBdHRyaWJ1dGUiLCJfcmVmMiIsIl9iZWZvcmVSZWxvYWQkcHJvamVjdCIsImxhc3QiLCJ0b0JlSGlkZGVuIiwiYmVmb3JlUmVsb2FkIiwiY291bnRlcnNCZWZvcmVSZWxvYWQiLCJyZWxvYWQiLCJob3Jpem9udGFsT3ZlcmZsb3ciLCJzY3JvbGxXaWR0aCIsImlubmVyV2lkdGgiLCJ0YXJnZXRTaXplIiwiUmVnRXhwIiwicm91dGUiLCJmdWxmaWxsIiwic3RhdHVzIiwiYm9keSIsInNjcm9sbFRvIiwic2Nyb2xsSGVpZ2h0IiwiYnV0dG9uIiwiX2RvY3VtZW50JGFjdGl2ZUVsZW1lNSIsInRhZ05hbWUiLCJmaW5hbERhdGFiYXNlIiwiX2ZpbmFsRGF0YWJhc2UkcHJvamVjMiIsIl9maW5hbERhdGFiYXNlJHByb2plYzMiLCJlbmNvZGVVUklDb21wb25lbnQiLCJnZXRCeVRleHQiLCJ1bnJvdXRlIiwicmVzdWx0VmlkZW8iLCJwYXVzZWQiLCJwcmVzZW50ZWRHZW5lcmF0aW9uSWQiLCJub3JtYWxSZXN1bHQiLCJzY3JlZW4iLCJzZWVrIiwidHJhbnNmb3JtIiwicGhvbmVSZXN1bHQiLCJ2b2x1bWUiLCJzb3VyY2UiLCJhY3Rpb25zIiwicXVlcnlTZWxlY3RvckFsbCIsImV2ZXJ5IiwiYWN0aW9uIiwiaW5uZXJIZWlnaHQiLCJzaG9ydFJlc3VsdCIsImRvY3VtZW50SGVpZ2h0IiwicGxheWVyIiwicmFpbCIsImRldGFpbHMiLCJzaG9ydFRhcmdldCIsIm9yaWdpbmFsU291cmNlIiwiZHViU291cmNlIiwiZm9jdXMiLCJrZXlib2FyZCIsInByZXNzIiwic3dpdGNoVGltZSIsInRvQmVMZXNzVGhhbiIsInJlc3VsdFNlZWsiLCJkb3duIiwidXAiLCJhZnRlcktleWJvYXJkUmVsZWFzZSIsInBhdXNlIiwiZGlzcGF0Y2hFdmVudCIsImJsdXIiLCJjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkIiwiZG93bmxvYWQiLCJhbGwiLCJ3YWl0Rm9yRXZlbnQiLCJkb3dubG9hZFBhdGgiLCJzdWdnZXN0ZWRGaWxlbmFtZSIsImRvd25sb2FkZWRCeXRlcyIsImV4cGVjdGVkRml4dHVyZUJ5dGVzIiwiZG93bmxvYWRlZFNoYTI1NiIsInVwZGF0ZSIsImVxdWFscyIsInJlc3VsdERhdGFiYXNlIiwiam9icyIsInJlc3VsdE1lZGlhIiwicHJvZHVjdFJlbmRlcmVkIiwiYXNzZW1ibGVkRnJvbUFjY2VwdGVkVGFrZXMiLCJmaWxlbmFtZSIsInRvQ29udGFpbkVxdWFsIiwib2JqZWN0Q29udGFpbmluZyIsImJ5dGVMZW5ndGgiLCJib3giLCJfYm94JGhlaWdodCIsIm1vYmlsZVRhcmdldHMiLCJsYWJlbCIsIm5hdGl2ZUV2aWRlbmNlIiwiaW5pdGlhbEhlYWRlciIsImdlbmVyYXRpb25JZCIsImN1cnJlbnRDb21wYXJpc29uQXREb3dubG9hZCIsImRvd25sb2FkRmlsZW5hbWUiLCJkb3dubG9hZFNoYTI1NiIsImV4YWN0Rml4dHVyZUJ5dGVzTWF0Y2giLCJmaXh0dXJlUHJvdmVuYW5jZSIsImFzc2VydGlvbnMiLCJyZXN1bHRSb3V0ZSIsInJldHVybmVkUmVjb3JkVmlkZW8iLCJsZWF2aW5nVmlkZW8iLCJldmFsdWF0ZUhhbmRsZSIsIl9wcm9wcyRzZXJ2aWNlczIiLCJyZXN1bHRzIiwib3JpZ2luYWxSZWFkIiwicmVhZEdlbmVyYXRpb25NZWRpYSIsInNjb3BlIiwicGF5bG9hZCIsImxvYWRQcmVwYXJlZFByb2plY3QiLCJ0b21ic3RvbmVQcm9qZWN0IiwicmFuZG9tVVVJRCIsIl9fZGVsZXRlZEJlZm9yZUdlbmVyYXRpb25EZWxpdmVyeSIsImRvd25sb2FkRXZlbnRzIiwib24iLCJfaW5pdGlhbCRwcm9qZWN0JGluaXQiLCJfaW5pdGlhbCRwcm9qZWN0IiwidHVybiIsImluaXRpYWwiLCJpbml0aWFsU25hcHNob3RJZCIsInJldHVybkxvY2tzIiwiYWZ0ZXJSZXBsYWNlbWVudE5leHQiLCJwcmVzZW50ZWRWaWRlbyIsImN1cnJlbnRTcmMiLCJyZXZpc2VkIiwib3JpZ2luYWxTbmFwc2hvdCIsImV4cGxpY2l0U25hcHNob3QiLCJ0b0JlRGVmaW5lZCIsInByZXNlbnRlZE1lZGlhIiwiZGF0YXNldCIsImR1cmF0aW9uIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJkdXJhdGlvbk1ldGFkYXRhIiwiSW5maW5pdHkiLCJpc05hTiIsInZpZGVvSGVpZ2h0IiwicmV2aXNlZFNuYXBzaG90IiwiY2FwdHVyZUdyYW50TGlmZWN5Y2xlIiwiYXV0b21hdGljUmVzdWx0TmF2aWdhdGlvbkFmdGVyUmVwbGFjZW1lbnQiLCJleHBsaWNpdFRvUmVzdWx0Q2xpY2tlZCIsInNlY29uZFBhZ2UiLCJjb250ZXh0IiwibmV3UGFnZSIsInRvQmVEaXNhYmxlZCIsInRvYXN0IiwidG9hc3RCb3VuZHMiLCJtb3VzZSIsIm1vdmUiLCJlbXVsYXRlTWVkaWEiLCJyZWR1Y2VkTW90aW9uIiwicmVkdWNlZE1vdGlvblRyYW5zaXRpb25TZWNvbmRzIiwiX2dldENvbXB1dGVkU3R5bGUkdHJhIiwicGFyc2VGbG9hdCIsInRyYW5zaXRpb25EdXJhdGlvbiIsIndoZWVsIiwicGVybWlzc2lvbiIsInNhdmVkUmVjb3JkaW5nQ291bnQiLCJzZXR0aW5nc0JvdW5kYXJ5QXZhaWxhYmxlIiwiaXNWaXNpYmxlIiwic2V0dGluZ3NCb3VuZGFyeVJldHVybkZvY3VzIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkMiIsIl9hZnRlckRlbmllZCRjYW5kaWRhdCIsIl9hZnRlckRlbmllZCRjYW5kaWRhdDIiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMyIiwiX2FmdGVyVW51c2FibGUkY2FuZGlkMyIsIl9hZnRlckRlbmllZCRjYW5kaWRhdDMiLCJfYWZ0ZXJQZW5kaW5nQ2FuY2VsJGMzIiwicmVhZFByZXBhcmVkRHVyYXRpb24iLCJpdGVtIiwicHJlcGFyZWREdXJhdGlvbk1zIiwiY3VycmVudENhbmRpZGF0ZSIsIl9kYXRhYmFzZSRwcm9qZWN0MiIsInBhbmVsQm91bmRzIiwidG9KU09OIiwic2V0TW9kZWxlZFZpc2liaWxpdHkiLCJoaWRkZW4iLCJpc0hpZGRlbiIsIkV2ZW50Iiwic2F2ZUxpZmVjeWNsZVBhcnRpYWwiLCJleHBlY3RlZFJlY29yZGVyU3RhcnRzIiwic2NyZWVuc2hvdE5hbWUiLCJfcHJvYmUkZHVyYXRpb25TZWNvbmQiLCJfcmVmNCIsIl9kYXRhYmFzZSRwcm9qZWN0MyIsImNhcHR1cmluZ0JvdW5kcyIsInNhdmVkQm91bmRzIiwiX25hdGl2ZUJsb2JEaWdlc3RUcmEiLCJkdXJhdGlvblNlY29uZHMiLCJsaWZlY3ljbGUiLCJuYXRpdmVCbG9iIiwic291cmNlVmlkZW9QYXVzZWRBZnRlckludGVycnVwdGlvbiIsInBhbmVsRHVyaW5nQ2FwdHVyZSIsInBhbmVsQWZ0ZXJTYXZlIiwibm9ybWFsQm91bmRzIiwiZmlyc3RQYXJ0aWFsIiwic2hvcnRTYXZlZEJvdW5kcyIsInNlY29uZFBhcnRpYWwiLCJzZWVuIiwiU2V0IiwiX3Byb3BzJHNlcnZpY2VzMyIsImhhcyIsImFkZCIsImFsdGVybmF0ZSIsImNhcHR1cmVGaXhlZFdpbmRvdyIsInJldHVyblVudXNhYmxlT25jZSIsInN0b3BwZWRBdCIsImVsYXBzZWRNcyIsImNoYW5uZWxDb3VudCIsInNhbXBsZVJhdGUiLCJkZWNvZGVTdGF0dXMiLCJ3YXZlZm9ybVBlYWtzIiwiYWZ0ZXJVbnVzYWJsZSIsImFmdGVyRGVuaWVkIiwic3RyZWFtIiwicmVsZWFzZSIsIl9fcGVuZGluZ0dldFVzZXJNZWRpYSIsIl9wZW5kaW5nR2V0VXNlck1lZGlhIiwiQm9vbGVhbiIsInBlbmRpbmdUcmFja3MiLCJfcGVuZGluZ0dldFVzZXJNZWRpYTIiLCJfcGVuZGluZ0dldFVzZXJNZWRpYTMiLCJnZXRUcmFja3MiLCJ0cmFjayIsImFmdGVyUGVuZGluZ0NhbmNlbCIsImZpcnN0UGFydGlhbENhbmRpZGF0ZUlkIiwibGF0ZXN0UGFydGlhbENhbmRpZGF0ZUlkIiwidW51c2FibGVQYXJ0aWFsUHJlc2VydmVkTGF0ZXN0Q2FuZGlkYXRlIiwiZGVuaWVkUGVybWlzc2lvblByZXNlcnZlZExhdGVzdENhbmRpZGF0ZSIsInByZXBhcmluZ0hpZGRlblN0b3BwZWRUcmFja3MiLCJwcmVwYXJpbmdIaWRkZW5QcmVzZXJ2ZWRMYXRlc3RDYW5kaWRhdGUiLCJub3JtYWwxNDQweDkwMCIsInNhdmVkMTI4MHg2MDAiLCJwaHlzaWNhbE1pY3JvcGhvbmVPckRldmljZUJhY2tncm91bmRUZXN0ZWQiLCJwb2ludGVySWQiLCJwb2ludGVyVHlwZSIsImJlZm9yZSIsIm1heFNjcm9sbCIsImFmdGVyIiwiZHVyYWJsZUd1aWRhbmNlUmV0YWluZWQiLCJsb25nU2VudGVuY2UiLCJtZWFzdXJlbWVudHMiLCJzZWxlY3RlZExheW91dCIsImZpeHR1cmVUZXh0IiwiX3Byb3BzJHNlcnZpY2VzNCIsIm9yaWdpbmFsTG9hZCIsInJ1IiwiaGlzdG9yeSIsInB1c2hTdGF0ZSIsIlBvcFN0YXRlRXZlbnQiLCJfcmVzdWx0JGRpYWxvZ3VlJGJvdHQiLCJfcmVzdWx0JGRpYWxvZ3VlIiwiX3Jlc3VsdCR3YXZlJHkiLCJfcmVzdWx0JHdhdmUiLCJfcmVzdWx0JHBhbmVsJHkiLCJfcmVzdWx0JHBhbmVsIiwiX3Jlc3VsdCRtZWRpYSR5IiwiX3Jlc3VsdCRtZWRpYSIsIl9kb2N1bWVudCRxdWVyeVNlbGVjdDMiLCJzZW50ZW5jZSJdLCJzb3VyY2VzIjpbInJlY29yZC1qb3VybmV5LnNwZWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgbWtkaXIsIHJlYWRGaWxlLCB3cml0ZUZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdub2RlOmNyeXB0byc7XG5pbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgdGVzdCwgZXhwZWN0LCB0eXBlIFBhZ2UgfSBmcm9tICdAcGxheXdyaWdodC90ZXN0JztcblxuY29uc3QgZXZpZGVuY2VEaXJlY3RvcnkgPSBwYXRoLnJlc29sdmUoXG4gIHByb2Nlc3MuY3dkKCksICcuLicsICdfZG9jcycsICdldmlkZW5jZScsICdjb3JlLWpvdXJuZXktYWItaW1wbGVtZW50YXRpb24tMjAyNi0xMC0yOCcsXG4gIC4uLihwcm9jZXNzLmVudi5EVUJCRURfQ09SRV9FVklERU5DRV9SVU4gPz8gJ3BoYXNlMycpLnNwbGl0KC9bXFxcXC9dKy8pLFxuKTtcblxuYXN5bmMgZnVuY3Rpb24gc2V0UmVjb3JkTG9jYWxlKHBhZ2U6IFBhZ2UsIGxvY2FsZTogJ2VuJyB8ICdydScpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTChwYWdlLnVybCgpKTtcbiAgdXJsLnNlYXJjaFBhcmFtcy5zZXQoJ2xvY2FsZScsIGxvY2FsZSk7XG4gIGF3YWl0IHBhZ2UuZ290byhgJHt1cmwucGF0aG5hbWV9JHt1cmwuc2VhcmNofWApO1xufVxuXG5hc3luYyBmdW5jdGlvbiBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZTogUGFnZSkge1xuICBhd2FpdCBwYWdlLmFkZEluaXRTY3JpcHQoKCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHdpbmRvdyBhcyBXaW5kb3cgJiB7XG4gICAgICBfX25hdGl2ZVJlY29yZEV2aWRlbmNlPzogeyBnZXRVc2VyTWVkaWFDYWxsczogbnVtYmVyOyByZWNvcmRlclN0YXJ0czogbnVtYmVyIH07XG4gICAgICBfX2xvY2tFdmlkZW5jZT86IHsgcmVxdWVzdHM6IHN0cmluZ1tdOyBjYWxsYmFja3M6IEFycmF5PCdhY3F1aXJlZCcgfCAnbnVsbCc+IH07XG4gICAgICBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbjtcbiAgICB9O1xuICAgIHRhcmdldC5fX25hdGl2ZVJlY29yZEV2aWRlbmNlID0geyBnZXRVc2VyTWVkaWFDYWxsczogMCwgcmVjb3JkZXJTdGFydHM6IDAgfTtcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2F2ZWRFdmlkZW5jZSA9IHNlc3Npb25TdG9yYWdlLmdldEl0ZW0oJ19fZHViYmVkX25hdGl2ZV9yZWNvcmRfZXZpZGVuY2VfdjEnKTtcbiAgICAgIGlmIChzYXZlZEV2aWRlbmNlKSB0YXJnZXQuX19uYXRpdmVSZWNvcmRFdmlkZW5jZSA9IEpTT04ucGFyc2Uoc2F2ZWRFdmlkZW5jZSkgYXMgTm9uTnVsbGFibGU8dHlwZW9mIHRhcmdldC5fX25hdGl2ZVJlY29yZEV2aWRlbmNlPjtcbiAgICB9IGNhdGNoIHsgLyogRXZpZGVuY2Ugc3RvcmFnZSBpcyBiZXN0LWVmZm9ydDsgYnJvd3NlciBiZWhhdmlvciByZW1haW5zIGF1dGhvcml0YXRpdmUuICovIH1cbiAgICBjb25zdCBwZXJzaXN0TmF0aXZlRXZpZGVuY2UgPSAoKSA9PiB7XG4gICAgICB0cnkgeyBzZXNzaW9uU3RvcmFnZS5zZXRJdGVtKCdfX2R1YmJlZF9uYXRpdmVfcmVjb3JkX2V2aWRlbmNlX3YxJywgSlNPTi5zdHJpbmdpZnkodGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UpKTsgfVxuICAgICAgY2F0Y2ggeyAvKiBLZWVwIGNhcHR1cmUgYmVoYXZpb3IgaW5kZXBlbmRlbnQgb2YgZXZpZGVuY2Ugc3RvcmFnZS4gKi8gfVxuICAgIH07XG4gICAgdGFyZ2V0Ll9fbG9ja0V2aWRlbmNlID0geyByZXF1ZXN0czogW10sIGNhbGxiYWNrczogW10gfTtcbiAgICBjb25zdCBsb2NrTWFuYWdlciA9IG5hdmlnYXRvci5sb2NrcztcbiAgICBjb25zdCBvcmlnaW5hbFJlcXVlc3QgPSBsb2NrTWFuYWdlci5yZXF1ZXN0LmJpbmQobG9ja01hbmFnZXIpO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShsb2NrTWFuYWdlciwgJ3JlcXVlc3QnLCB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICB2YWx1ZTogKG5hbWU6IHN0cmluZywgb3B0aW9uczogTG9ja09wdGlvbnMsIGNhbGxiYWNrOiAobG9jazogTG9jayB8IG51bGwpID0+IFByb21pc2U8dW5rbm93bj4gfCB1bmtub3duKSA9PiB7XG4gICAgICAgIHRhcmdldC5fX2xvY2tFdmlkZW5jZSEucmVxdWVzdHMucHVzaChuYW1lKTtcbiAgICAgICAgcmV0dXJuIG9yaWdpbmFsUmVxdWVzdChuYW1lLCBvcHRpb25zLCAobG9jaykgPT4ge1xuICAgICAgICAgIHRhcmdldC5fX2xvY2tFdmlkZW5jZSEuY2FsbGJhY2tzLnB1c2gobG9jayA/ICdhY3F1aXJlZCcgOiAnbnVsbCcpO1xuICAgICAgICAgIHJldHVybiBjYWxsYmFjayhsb2NrKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuICAgIGNvbnN0IG1lZGlhRGV2aWNlcyA9IG5hdmlnYXRvci5tZWRpYURldmljZXM7XG4gICAgaWYgKG1lZGlhRGV2aWNlcykge1xuICAgICAgY29uc3QgZ2V0VXNlck1lZGlhID0gbWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG1lZGlhRGV2aWNlcyk7XG4gICAgICBtZWRpYURldmljZXMuZ2V0VXNlck1lZGlhID0gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFEZXZpY2VzWydnZXRVc2VyTWVkaWEnXT4pID0+IHtcbiAgICAgICAgdGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UhLmdldFVzZXJNZWRpYUNhbGxzICs9IDE7XG4gICAgICAgIHBlcnNpc3ROYXRpdmVFdmlkZW5jZSgpO1xuICAgICAgICBpZiAodGFyZ2V0Ll9fZGVueU1pY3JvcGhvbmUpIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRE9NRXhjZXB0aW9uKCdNaWNyb3Bob25lIHBlcm1pc3Npb24gZGVuaWVkIGluIHRoZSB0ZXN0IGhhcm5lc3MuJywgJ05vdEFsbG93ZWRFcnJvcicpKTtcbiAgICAgICAgcmV0dXJuIGdldFVzZXJNZWRpYSguLi5hcmdzKTtcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICh3aW5kb3cuTWVkaWFSZWNvcmRlcikge1xuICAgICAgY29uc3Qgc3RhcnQgPSBNZWRpYVJlY29yZGVyLnByb3RvdHlwZS5zdGFydDtcbiAgICAgIE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFSZWNvcmRlclsnc3RhcnQnXT4pIHtcbiAgICAgICAgdGFyZ2V0Ll9fbmF0aXZlUmVjb3JkRXZpZGVuY2UhLnJlY29yZGVyU3RhcnRzICs9IDE7XG4gICAgICAgIHBlcnNpc3ROYXRpdmVFdmlkZW5jZSgpO1xuICAgICAgICByZXR1cm4gc3RhcnQuYXBwbHkodGhpcywgYXJncyk7XG4gICAgICB9O1xuICAgIH1cbiAgfSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGV2aWRlbmNlQ291bnRlcnMocGFnZTogUGFnZSkge1xuICByZXR1cm4gcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX25hdGl2ZVJlY29yZEV2aWRlbmNlOiB7IGdldFVzZXJNZWRpYUNhbGxzOiBudW1iZXI7IHJlY29yZGVyU3RhcnRzOiBudW1iZXIgfSB9KS5fX25hdGl2ZVJlY29yZEV2aWRlbmNlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbFN0b3JlRmFpbHVyZShwYWdlOiBQYWdlLCBtb2RlOiAnbG9zdC1hY2tub3dsZWRnZW1lbnQnIHwgJ2tub3duLWZhaWx1cmUnKSB7XG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKGZhdWx0TW9kZSkgPT4ge1xuICAgIHR5cGUgUHJvamVjdFN0b3JlID0ge1xuICAgICAgc2F2ZUNhbmRpZGF0ZShyZXF1ZXN0OiB7IG9wZXJhdGlvbklkOiBzdHJpbmc7IGNhcHR1cmU6IHsgYmxvYjogQmxvYiB9IH0pOiBQcm9taXNlPHVua25vd24+O1xuICAgICAgbG9va3VwT3BlcmF0aW9uKC4uLmFyZ3M6IHVua25vd25bXSk6IFByb21pc2U8dW5rbm93bj47XG4gICAgfTtcbiAgICB0eXBlIEZpYmVyID0geyBjaGlsZD86IHVua25vd247IHNpYmxpbmc/OiB1bmtub3duOyBtZW1vaXplZFByb3BzPzogdW5rbm93biB9O1xuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIChIVE1MRWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8IG51bGw7XG4gICAgaWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBSZWFjdCByb290IGlzIHVuYXZhaWxhYmxlLicpO1xuICAgIGNvbnN0IHJvb3RLZXkgPSBPYmplY3Qua2V5cyhyb290KS5maW5kKChrZXkpID0+IGtleS5zdGFydHNXaXRoKCdfX3JlYWN0Q29udGFpbmVyJCcpKTtcbiAgICBpZiAoIXJvb3RLZXkpIHRocm93IG5ldyBFcnJvcignVGhlIFJlYWN0IHJvb3QgZmliZXIgaXMgdW5hdmFpbGFibGUuJyk7XG4gICAgY29uc3QgcGVuZGluZzogdW5rbm93bltdID0gW3Jvb3Rbcm9vdEtleV1dO1xuICAgIGxldCBzdG9yZTogUHJvamVjdFN0b3JlIHwgbnVsbCA9IG51bGw7XG4gICAgd2hpbGUgKHBlbmRpbmcubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmliZXIgPSBwZW5kaW5nLnBvcCgpIGFzIEZpYmVyIHwgbnVsbDtcbiAgICAgIGlmICghZmliZXIpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgcHJvcHMgPSBmaWJlci5tZW1vaXplZFByb3BzIGFzIHsgc2VydmljZXM/OiB7IHByb2plY3RzPzogUHJvamVjdFN0b3JlIH0gfSB8IG51bGw7XG4gICAgICBpZiAocHJvcHM/LnNlcnZpY2VzPy5wcm9qZWN0cykgc3RvcmUgPSBwcm9wcy5zZXJ2aWNlcy5wcm9qZWN0cztcbiAgICAgIGlmIChmaWJlci5jaGlsZCkgcGVuZGluZy5wdXNoKGZpYmVyLmNoaWxkKTtcbiAgICAgIGlmIChmaWJlci5zaWJsaW5nKSBwZW5kaW5nLnB1c2goZmliZXIuc2libGluZyk7XG4gICAgfVxuICAgIGlmICghc3RvcmUpIHRocm93IG5ldyBFcnJvcignVGhlIGFjdGl2ZSB0eXBlZCBQcm9qZWN0UG9ydCB3YXMgbm90IGZvdW5kIGluIHRoZSBzZXJ2aWNlcyBwcm92aWRlci4nKTtcbiAgICBjb25zdCBvcmlnaW5hbFNhdmUgPSBzdG9yZS5zYXZlQ2FuZGlkYXRlLmJpbmQoc3RvcmUpO1xuICAgIGNvbnN0IG9yaWdpbmFsTG9va3VwID0gc3RvcmUubG9va3VwT3BlcmF0aW9uLmJpbmQoc3RvcmUpO1xuICAgIGNvbnN0IHRyYWNlID0geyBzYXZlQ2FsbHM6IDAsIGxvb2t1cENhbGxzOiAwLCBvcGVyYXRpb25JZHM6IFtdIGFzIHN0cmluZ1tdLCBibG9iU2l6ZXM6IFtdIGFzIG51bWJlcltdLCByZXRyeVNhbWVCbG9iOiBudWxsIGFzIGJvb2xlYW4gfCBudWxsIH07XG4gICAgKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fc3RvcmVGYWlsdXJlVHJhY2U/OiB0eXBlb2YgdHJhY2UgfSkuX19zdG9yZUZhaWx1cmVUcmFjZSA9IHRyYWNlO1xuICAgIGxldCBmaXJzdEtub3duRmFpbHVyZSA9IHRydWU7XG4gICAgbGV0IGZhaWxlZEJsb2I6IEJsb2IgfCBudWxsID0gbnVsbDtcbiAgICBzdG9yZS5zYXZlQ2FuZGlkYXRlID0gYXN5bmMgKHJlcXVlc3QpID0+IHtcbiAgICAgIHRyYWNlLnNhdmVDYWxscyArPSAxO1xuICAgICAgdHJhY2Uub3BlcmF0aW9uSWRzLnB1c2gocmVxdWVzdC5vcGVyYXRpb25JZCk7XG4gICAgICB0cmFjZS5ibG9iU2l6ZXMucHVzaChyZXF1ZXN0LmNhcHR1cmUuYmxvYi5zaXplKTtcbiAgICAgIGlmIChmYXVsdE1vZGUgPT09ICdrbm93bi1mYWlsdXJlJyAmJiBmaXJzdEtub3duRmFpbHVyZSkge1xuICAgICAgICBmaXJzdEtub3duRmFpbHVyZSA9IGZhbHNlO1xuICAgICAgICBmYWlsZWRCbG9iID0gcmVxdWVzdC5jYXB0dXJlLmJsb2I7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1N5bnRoZXRpYyBrbm93biBxdW90YSBmYWlsdXJlIGJlZm9yZSBhIHdyaXRlIHdhcyBzZW50LicsICdRdW90YUV4Y2VlZGVkRXJyb3InKTtcbiAgICAgIH1cbiAgICAgIGlmIChmYXVsdE1vZGUgPT09ICdrbm93bi1mYWlsdXJlJyAmJiBmYWlsZWRCbG9iKSB0cmFjZS5yZXRyeVNhbWVCbG9iID0gZmFpbGVkQmxvYiA9PT0gcmVxdWVzdC5jYXB0dXJlLmJsb2I7XG4gICAgICBjb25zdCBjb21taXR0ZWQgPSBhd2FpdCBvcmlnaW5hbFNhdmUocmVxdWVzdCk7XG4gICAgICByZXR1cm4gZmF1bHRNb2RlID09PSAnbG9zdC1hY2tub3dsZWRnZW1lbnQnXG4gICAgICAgID8geyBraW5kOiAndW5rbm93bicsIG9wZXJhdGlvbklkOiByZXF1ZXN0Lm9wZXJhdGlvbklkLCByZWFzb246ICdUZXN0IGhhcm5lc3Mgd2l0aGhlbGQgdGhlIHN1Y2Nlc3NmdWwgYWNrbm93bGVkZ2VtZW50LicgfVxuICAgICAgICA6IGNvbW1pdHRlZDtcbiAgICB9O1xuICAgIHN0b3JlLmxvb2t1cE9wZXJhdGlvbiA9IGFzeW5jICguLi5hcmdzKSA9PiB7XG4gICAgICB0cmFjZS5sb29rdXBDYWxscyArPSAxO1xuICAgICAgaWYgKGZhdWx0TW9kZSA9PT0gJ2xvc3QtYWNrbm93bGVkZ2VtZW50JyAmJiB0cmFjZS5sb29rdXBDYWxscyA9PT0gMSkge1xuICAgICAgICByZXR1cm4geyBraW5kOiAncGVuZGluZycsIG9wZXJhdGlvbklkOiBTdHJpbmcoYXJnc1sxXSkgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnaW5hbExvb2t1cCguLi5hcmdzKTtcbiAgICB9O1xuICB9LCBtb2RlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbEFjY2VwdGFuY2VGYWlsdXJlKHBhZ2U6IFBhZ2UpIHtcbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qgb3JpZ2luYWxUcmFuc2FjdGlvbiA9IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbjtcbiAgICBjb25zdCB0cmFjZSA9IHsgY2FsbHM6IDAsIHN0b3JlczogW10gYXMgc3RyaW5nW10sIHJlc3RvcmU6ICgpID0+IHVuZGVmaW5lZCB9O1xuICAgICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX2FjY2VwdEZhaWx1cmVUcmFjZT86IHR5cGVvZiB0cmFjZSB9KS5fX2FjY2VwdEZhaWx1cmVUcmFjZSA9IHRyYWNlO1xuICAgIElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IGZ1bmN0aW9uIChzdG9yZU5hbWVzLCBtb2RlLCBvcHRpb25zKSB7XG4gICAgICBjb25zdCBzdG9yZXMgPSB0eXBlb2Ygc3RvcmVOYW1lcyA9PT0gJ3N0cmluZycgPyBbc3RvcmVOYW1lc10gOiBbLi4uc3RvcmVOYW1lc107XG4gICAgICBpZiAodHJhY2UuY2FsbHMgPT09IDAgJiYgbW9kZSA9PT0gJ3JlYWR3cml0ZScgJiYgc3RvcmVzLmluY2x1ZGVzKCdvcGVyYXRpb25zJykpIHtcbiAgICAgICAgdHJhY2UuY2FsbHMgKz0gMTtcbiAgICAgICAgdHJhY2Uuc3RvcmVzID0gc3RvcmVzO1xuICAgICAgICB0aHJvdyBuZXcgRE9NRXhjZXB0aW9uKCdTeW50aGV0aWMga25vd24gYWNjZXB0YW5jZSB3cml0ZSBmYWlsdXJlLicsICdRdW90YUV4Y2VlZGVkRXJyb3InKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvcmlnaW5hbFRyYW5zYWN0aW9uLmNhbGwodGhpcywgc3RvcmVOYW1lcywgbW9kZSwgb3B0aW9ucyk7XG4gICAgfTtcbiAgICB0cmFjZS5yZXN0b3JlID0gKCkgPT4geyBJREJEYXRhYmFzZS5wcm90b3R5cGUudHJhbnNhY3Rpb24gPSBvcmlnaW5hbFRyYW5zYWN0aW9uOyB9O1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gaW5zdGFsbE5leHRPcGVyYXRpb25Xcml0ZUZhaWx1cmUocGFnZTogUGFnZSkge1xuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCBvcmlnaW5hbCA9IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbjtcbiAgICBjb25zdCB0cmFjZSA9IHsgY2FsbHM6IDAsIHN0b3JlczogW10gYXMgc3RyaW5nW10gfTtcbiAgICBjb25zdCB0YXJnZXQgPSB3aW5kb3cgYXMgV2luZG93ICYge1xuICAgICAgX19vcGVyYXRpb25Xcml0ZUZhaWx1cmU/OiB0eXBlb2YgdHJhY2U7XG4gICAgICBfX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmU/OiAoKSA9PiB2b2lkO1xuICAgIH07XG4gICAgdGFyZ2V0Ll9fb3BlcmF0aW9uV3JpdGVGYWlsdXJlID0gdHJhY2U7XG4gICAgSURCRGF0YWJhc2UucHJvdG90eXBlLnRyYW5zYWN0aW9uID0gZnVuY3Rpb24gKHN0b3JlTmFtZXMsIG1vZGUsIG9wdGlvbnMpIHtcbiAgICAgIGNvbnN0IHN0b3JlcyA9IHR5cGVvZiBzdG9yZU5hbWVzID09PSAnc3RyaW5nJyA/IFtzdG9yZU5hbWVzXSA6IFsuLi5zdG9yZU5hbWVzXTtcbiAgICAgIGlmICh0cmFjZS5jYWxscyA9PT0gMCAmJiBtb2RlID09PSAncmVhZHdyaXRlJyAmJiBzdG9yZXMuaW5jbHVkZXMoJ29wZXJhdGlvbnMnKSkge1xuICAgICAgICB0cmFjZS5jYWxscyArPSAxO1xuICAgICAgICB0cmFjZS5zdG9yZXMgPSBzdG9yZXM7XG4gICAgICAgIHRocm93IG5ldyBET01FeGNlcHRpb24oJ1N5bnRoZXRpYyBrbm93biBjYW5kaWRhdGUgd3JpdGUgZmFpbHVyZS4nLCAnUXVvdGFFeGNlZWRlZEVycm9yJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gb3JpZ2luYWwuY2FsbCh0aGlzLCBzdG9yZU5hbWVzLCBtb2RlLCBvcHRpb25zKTtcbiAgICB9O1xuICAgIHRhcmdldC5fX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmUgPSAoKSA9PiB7IElEQkRhdGFiYXNlLnByb3RvdHlwZS50cmFuc2FjdGlvbiA9IG9yaWdpbmFsOyB9O1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdHJhY2VOZXh0TmF0aXZlQmxvYkRpZ2VzdChwYWdlOiBQYWdlKSB7XG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgIGNvbnN0IHRyYWNlID0geyBjYXB0dXJlczogMCwgYnl0ZVNpemU6IDAsIG1pbWVUeXBlOiAnJywgc2hhMjU2OiBudWxsIGFzIHN0cmluZyB8IG51bGwgfTtcbiAgICAod2luZG93IGFzIFdpbmRvdyAmIHsgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U/OiB0eXBlb2YgdHJhY2UgfSkuX19uYXRpdmVCbG9iRGlnZXN0VHJhY2UgPSB0cmFjZTtcbiAgICBjb25zdCBwcm90b3R5cGUgPSBNZWRpYVJlY29yZGVyLnByb3RvdHlwZTtcbiAgICBjb25zdCBzdGFydCA9IHByb3RvdHlwZS5zdGFydDtcbiAgICBwcm90b3R5cGUuc3RhcnQgPSBmdW5jdGlvbiAoLi4uYXJnczogUGFyYW1ldGVyczxNZWRpYVJlY29yZGVyWydzdGFydCddPikge1xuICAgICAgY29uc3QgY2h1bmtzOiBCbG9iUGFydFtdID0gW107XG4gICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoJ2RhdGFhdmFpbGFibGUnLCAoZXZlbnQpID0+IHsgaWYgKGV2ZW50LmRhdGEuc2l6ZSA+IDApIGNodW5rcy5wdXNoKGV2ZW50LmRhdGEpOyB9KTtcbiAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcignc3RvcCcsICgpID0+IHtcbiAgICAgICAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKGNodW5rcywgeyB0eXBlOiB0aGlzLm1pbWVUeXBlIH0pO1xuICAgICAgICB0cmFjZS5jYXB0dXJlcyArPSAxO1xuICAgICAgICB0cmFjZS5ieXRlU2l6ZSA9IGJsb2Iuc2l6ZTtcbiAgICAgICAgdHJhY2UubWltZVR5cGUgPSBibG9iLnR5cGU7XG4gICAgICAgIHZvaWQgYmxvYi5hcnJheUJ1ZmZlcigpLnRoZW4oKGJ5dGVzKSA9PiBjcnlwdG8uc3VidGxlLmRpZ2VzdCgnU0hBLTI1NicsIGJ5dGVzKSkudGhlbigoZGlnZXN0KSA9PiB7XG4gICAgICAgICAgdHJhY2Uuc2hhMjU2ID0gQXJyYXkuZnJvbShuZXcgVWludDhBcnJheShkaWdlc3QpLCAoYnl0ZSkgPT4gYnl0ZS50b1N0cmluZygxNikucGFkU3RhcnQoMiwgJzAnKSkuam9pbignJyk7XG4gICAgICAgIH0pO1xuICAgICAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuIHN0YXJ0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzdG9yZUZhaWx1cmVUcmFjZShwYWdlOiBQYWdlKSB7XG4gIHJldHVybiBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19zdG9yZUZhaWx1cmVUcmFjZTogeyBzYXZlQ2FsbHM6IG51bWJlcjsgbG9va3VwQ2FsbHM6IG51bWJlcjsgb3BlcmF0aW9uSWRzOiBzdHJpbmdbXTsgYmxvYlNpemVzOiBudW1iZXJbXTsgcmV0cnlTYW1lQmxvYjogYm9vbGVhbiB8IG51bGwgfTtcbiAgfSkuX19zdG9yZUZhaWx1cmVUcmFjZSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHJlYWRJbmRleGVkRGIocGFnZTogUGFnZSkge1xuICByZXR1cm4gcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCBuZXcgUHJvbWlzZTxJREJEYXRhYmFzZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKCdkdWJiZWQtY29yZS1sb2NhbC12MScpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICB9KTtcbiAgICBjb25zdCByZWFkID0gPFQ+KHN0b3JlTmFtZTogc3RyaW5nLCBrZXk/OiBJREJWYWxpZEtleSkgPT4gbmV3IFByb21pc2U8VD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgdHJhbnNhY3Rpb24gPSBkYXRhYmFzZS50cmFuc2FjdGlvbihzdG9yZU5hbWUsICdyZWFkb25seScpO1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGtleSA9PT0gdW5kZWZpbmVkID8gdHJhbnNhY3Rpb24ub2JqZWN0U3RvcmUoc3RvcmVOYW1lKS5nZXRBbGwoKSA6IHRyYW5zYWN0aW9uLm9iamVjdFN0b3JlKHN0b3JlTmFtZSkuZ2V0KGtleSk7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQgYXMgVCk7XG4gICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgfSk7XG4gICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IHJlYWQ8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+KCdwcm9qZWN0cycsICdzaW50ZWwtcHJlcGFyZWQnKTtcbiAgICBjb25zdCBtZWRpYSA9IGF3YWl0IHJlYWQ8QXJyYXk8UmVjb3JkPHN0cmluZywgdW5rbm93bj4+PignbWVkaWEnKTtcbiAgICBjb25zdCBvcGVyYXRpb25zID0gYXdhaXQgcmVhZDxBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4+KCdvcGVyYXRpb25zJyk7XG4gICAgY29uc3Qgc25hcHNob3RzID0gYXdhaXQgcmVhZDxBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4+KCdzbmFwc2hvdHMnKTtcbiAgICBkYXRhYmFzZS5jbG9zZSgpO1xuICAgIHJldHVybiB7XG4gICAgICBwcm9qZWN0OiBwcm9qZWN0ID8ge1xuICAgICAgICByZXZpc2lvbjogcHJvamVjdC5yZXZpc2lvbixcbiAgICAgICAgZHJhZnRDYW5kaWRhdGVCeVR1cm46IHByb2plY3QuZHJhZnRDYW5kaWRhdGVCeVR1cm4sXG4gICAgICAgIGFjY2VwdGVkQnlUdXJuOiBwcm9qZWN0LmFjY2VwdGVkQnlUdXJuLFxuICAgICAgICBpbml0aWFsUmVzdWx0U25hcHNob3RJZDogcHJvamVjdC5pbml0aWFsUmVzdWx0U25hcHNob3RJZCxcbiAgICAgICAgbGF0ZXN0UmVzdWx0U25hcHNob3RJZDogcHJvamVjdC5sYXRlc3RSZXN1bHRTbmFwc2hvdElkLFxuICAgICAgICB0b21ic3RvbmVkQXQ6IHByb2plY3QudG9tYnN0b25lZEF0LFxuICAgICAgfSA6IG51bGwsXG4gICAgICBtZWRpYTogbWVkaWEubWFwKChjYW5kaWRhdGUpID0+ICh7XG4gICAgICAgIGlkOiBjYW5kaWRhdGUuaWQsXG4gICAgICAgIHB1cnBvc2U6IGNhbmRpZGF0ZS5wdXJwb3NlLFxuICAgICAgICB0dXJuSWQ6IGNhbmRpZGF0ZS50dXJuSWQsXG4gICAgICAgIGJ5dGVTaXplOiBjYW5kaWRhdGUuYnl0ZVNpemUsXG4gICAgICAgIHNoYTI1NjogY2FuZGlkYXRlLnNoYTI1NixcbiAgICAgICAgbWltZVR5cGU6IGNhbmRpZGF0ZS5taW1lVHlwZSxcbiAgICAgICAgZW5kUmVhc29uOiBjYW5kaWRhdGUuZW5kUmVhc29uLFxuICAgICAgICBwcm9iZTogY2FuZGlkYXRlLnByb2JlLFxuICAgICAgICBibG9iU2l6ZTogKGNhbmRpZGF0ZS5ibG9iIGFzIEJsb2IgfCB1bmRlZmluZWQpPy5zaXplID8/IG51bGwsXG4gICAgICB9KSksXG4gICAgICBvcGVyYXRpb25zOiBvcGVyYXRpb25zLm1hcCgob3BlcmF0aW9uKSA9PiAoe1xuICAgICAgICBpZDogb3BlcmF0aW9uLmlkLFxuICAgICAgICBraW5kOiBvcGVyYXRpb24ua2luZCxcbiAgICAgICAgc3RhdGU6IG9wZXJhdGlvbi5zdGF0ZSxcbiAgICAgICAgdHVybklkOiBvcGVyYXRpb24udHVybklkLFxuICAgICAgICBwcm9qZWN0UmV2aXNpb246IG9wZXJhdGlvbi5wcm9qZWN0UmV2aXNpb24sXG4gICAgICAgIHNuYXBzaG90SWQ6IG9wZXJhdGlvbi5zbmFwc2hvdElkLFxuICAgICAgICBuYXZpZ2F0aW9uSW50ZW50OiBvcGVyYXRpb24ubmF2aWdhdGlvbkludGVudCxcbiAgICAgICAgbmF2aWdhdGlvbkNvbXBsZXRlZDogb3BlcmF0aW9uLm5hdmlnYXRpb25Db21wbGV0ZWQsXG4gICAgICAgIHNoYTI1Njogb3BlcmF0aW9uLnNoYTI1NixcbiAgICAgIH0pKSxcbiAgICAgIHNuYXBzaG90czogc25hcHNob3RzLm1hcCgoc25hcHNob3QpID0+ICh7XG4gICAgICAgIGlkOiBzbmFwc2hvdC5pZCxcbiAgICAgICAgcHJvamVjdFJldmlzaW9uOiBzbmFwc2hvdC5wcm9qZWN0UmV2aXNpb24sXG4gICAgICAgIGNvbnRlbnRTaGEyNTY6IHNuYXBzaG90LmNvbnRlbnRTaGEyNTYsXG4gICAgICAgIGF1dGhvcml6YXRpb246IHNuYXBzaG90LmF1dGhvcml6YXRpb24sXG4gICAgICAgIHRha2VzOiBzbmFwc2hvdC50YWtlcyxcbiAgICAgIH0pKSxcbiAgICB9O1xuICB9KTtcbn1cblxudGVzdCgncmVjb25jaWxlcyBhIGxvc3Qgc2F2ZSBhY2tub3dsZWRnZW1lbnQgd2l0aCB0aGUgb3JpZ2luYWwgb3BlcmF0aW9uIGJlZm9yZSBhY2NlcHRpbmcgdGhlIGNhbmRpZGF0ZScsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgYXdhaXQgaW5zdHJ1bWVudE5hdGl2ZU1lZGlhKHBhZ2UpO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gIGF3YWl0IGluc3RhbGxTdG9yZUZhaWx1cmUocGFnZSwgJ2xvc3QtYWNrbm93bGVkZ2VtZW50Jyk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgxKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ1RoZSBzYXZlIG91dGNvbWUgaXMgdW5rbm93bi4gQ2hlY2sgdGhpcyBzYW1lIG9wZXJhdGlvbiBiZWZvcmUgdHJ5aW5nIGFub3RoZXIgcmVjb3JkaW5nLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0NoZWNrIHNhdmVkIHN0YXR1cycsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBjb25zdCB1bmtub3duVHJhY2UgPSBhd2FpdCBzdG9yZUZhaWx1cmVUcmFjZShwYWdlKTtcbiAgZXhwZWN0KHVua25vd25UcmFjZS5zYXZlQ2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdCh1bmtub3duVHJhY2UubG9va3VwQ2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdCh1bmtub3duVHJhY2Uub3BlcmF0aW9uSWRzKS50b0hhdmVMZW5ndGgoMSk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0NoZWNrIHNhdmVkIHN0YXR1cycsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGNvbnN0IHN0b3JlZCA9IGF3YWl0IHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICBjb25zdCByZXNvbHZlZFRyYWNlID0gYXdhaXQgc3RvcmVGYWlsdXJlVHJhY2UocGFnZSk7XG4gIGV4cGVjdChyZXNvbHZlZFRyYWNlLnNhdmVDYWxscykudG9CZSgxKTtcbiAgZXhwZWN0KHJlc29sdmVkVHJhY2UubG9va3VwQ2FsbHMpLnRvQmUoMik7XG4gIGV4cGVjdChyZXNvbHZlZFRyYWNlLm9wZXJhdGlvbklkcykudG9FcXVhbChbdW5rbm93blRyYWNlLm9wZXJhdGlvbklkc1swXV0pO1xuICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGNvbnN0IGpvdXJuYWxFbnRyeSA9IGRhdGFiYXNlLm9wZXJhdGlvbnMuZmluZCgob3BlcmF0aW9uKSA9PiBvcGVyYXRpb24uaWQgPT09IHVua25vd25UcmFjZS5vcGVyYXRpb25JZHNbMF0pO1xuICBleHBlY3Qoam91cm5hbEVudHJ5Py5zdGF0ZSkudG9CZSgnY29tbWl0dGVkJyk7XG4gIGV4cGVjdChqb3VybmFsRW50cnk/LnNoYTI1NikudG9CZShzdG9yZWQ/LnNoYTI1Nik7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdsb3N0LXNhdmUtYWNrLWJyb3dzZXItZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIHNjZW5hcmlvOiAnVGhlIG1vY2sgc3RvcmUgY29tbWl0dGVkIHRoZSBCbG9iIGJ1dCB3aXRoaGVsZCBpdHMgYWNrbm93bGVkZ2VtZW50OyBmaXJzdCBzdGF0dXMgbG9va3VwIHJlcG9ydGVkIHBlbmRpbmc7IGV4cGxpY2l0IGNoZWNrIHJlYWQgdGhlIGNvbW1pdHRlZCByZWNlaXB0LicsXG4gICAgcGh5c2ljYWxNaWNyb3Bob25lOiBmYWxzZSxcbiAgICBuYXRpdmVBcGlFdmlkZW5jZTogYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSxcbiAgICB0cmFjZTogcmVzb2x2ZWRUcmFjZSxcbiAgICBqb3VybmFsRW50cnksXG4gICAgc2F2ZWRDYW5kaWRhdGU6IHN0b3JlZCxcbiAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG59KTtcblxudGVzdCgna2VlcHMgYW4gYWNjZXB0ZWQgdGFrZSBpbnRhY3QgYWZ0ZXIgYSBrbm93biBzYXZlIGZhaWx1cmUgYW5kIHJldHJpZXMgdGhlIGV4YWN0IGNhcHR1cmVkIEJsb2InLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDQ1XzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEnKTtcbiAgYXdhaXQgcmVjb3JkQ3VycmVudFdpbmRvdyhwYWdlLCAnQScpO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3R1cm49c2ludGVsLXR1cm4tMi8pO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUHJldmlvdXMnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC90dXJuPXNpbnRlbC10dXJuLTEvKTtcbiAgY29uc3QgYmVmb3JlRmFpbHVyZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGNvbnN0IGFjY2VwdGVkQmVmb3JlID0gKGJlZm9yZUZhaWx1cmUucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ3NpbnRlbC10dXJuLTEnXTtcbiAgZXhwZWN0KGFjY2VwdGVkQmVmb3JlKS50b0JlVHJ1dGh5KCk7XG5cbiAgYXdhaXQgaW5zdGFsbE5leHRPcGVyYXRpb25Xcml0ZUZhaWx1cmUocGFnZSk7XG4gIGF3YWl0IHRyYWNlTmV4dE5hdGl2ZUJsb2JEaWdlc3QocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiAoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkucmVjb3JkZXJTdGFydHMpLnRvQmUoMik7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdUaGUgY2FuZGlkYXRlIGNvdWxkIG5vdCBiZSBzYXZlZC4gVGhlIGN1cnJlbnQgcmVjb3JkaW5nIGFuZCBwcmV2aW91c2x5IGFjY2VwdGVkIHRha2UgcmVtYWluIGF2YWlsYWJsZSBoZXJlLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IHNhdmUnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgY29uc3QgcmVjb3ZlcnlUb2FzdCA9IHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0Jyk7XG4gIGF3YWl0IGV4cGVjdChyZWNvdmVyeVRvYXN0KS50b0JlVmlzaWJsZSgpO1xuICBleHBlY3QoYXdhaXQgcmVjb3ZlcnlUb2FzdC5nZXRCeVJvbGUoJ2J1dHRvbicpLmNvdW50KCkpLnRvQmUoMCk7XG4gIGNvbnN0IHRvYXN0U3R5bGUgPSBhd2FpdCByZWNvdmVyeVRvYXN0LmV2YWx1YXRlKChlbGVtZW50KSA9PiB7XG4gICAgY29uc3Qgc3R5bGUgPSBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpO1xuICAgIGNvbnN0IGJvdW5kcyA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgaWNvbiA9IGVsZW1lbnQucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIGJhY2tncm91bmQ6IHN0eWxlLmJhY2tncm91bmRDb2xvcixcbiAgICAgIGJvcmRlclJhZGl1czogc3R5bGUuYm9yZGVyUmFkaXVzLFxuICAgICAgYm90dG9tOiBzdHlsZS5ib3R0b20sXG4gICAgICB3aWR0aDogYm91bmRzLndpZHRoLFxuICAgICAgcGFkZGluZzogc3R5bGUucGFkZGluZyxcbiAgICAgIGJveFNoYWRvdzogc3R5bGUuYm94U2hhZG93LFxuICAgICAgaWNvbkNvbG9yOiBpY29uID8gZ2V0Q29tcHV0ZWRTdHlsZShpY29uKS5jb2xvciA6IG51bGwsXG4gICAgICB0aXRsZUZvbnQ6IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3ZlcnktdG9hc3RfX3RpdGxlJykhKS5mb250LFxuICAgICAgYm9keUZvbnQ6IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudC5xdWVyeVNlbGVjdG9yKCcucmVjb3ZlcnktdG9hc3RfX2JvZHknKSEpLmZvbnQsXG4gICAgfTtcbiAgfSk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLmJhY2tncm91bmQpLnRvQmUoJ3JnYigzMiwgMzIsIDMyKScpO1xuICBleHBlY3QodG9hc3RTdHlsZS5ib3JkZXJSYWRpdXMpLnRvQmUoJzEwcHgnKTtcbiAgZXhwZWN0KHRvYXN0U3R5bGUuYm90dG9tKS50b0JlKCcxNnB4Jyk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLndpZHRoKS50b0JlTGVzc1RoYW5PckVxdWFsKDUyMCk7XG4gIGV4cGVjdCh0b2FzdFN0eWxlLnBhZGRpbmcpLnRvQmUoJzE0cHggMTZweCcpO1xuICBleHBlY3QodG9hc3RTdHlsZS5pY29uQ29sb3IpLnRvQmUoJ3JnYigyNTUsIDE1NiwgMTU5KScpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdrbm93bi1zYXZlLWZhaWx1cmUtcmVjb3ZlcnktdG9hc3QucG5nJykgfSk7XG4gIGNvbnN0IGZhaWxlZFRyYWNlID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX29wZXJhdGlvbldyaXRlRmFpbHVyZTogeyBjYWxsczogbnVtYmVyOyBzdG9yZXM6IHN0cmluZ1tdIH0gfSkuX19vcGVyYXRpb25Xcml0ZUZhaWx1cmUpO1xuICBleHBlY3QoZmFpbGVkVHJhY2UuY2FsbHMpLnRvQmUoMSk7XG4gIGV4cGVjdChmYWlsZWRUcmFjZS5zdG9yZXMpLnRvQ29udGFpbignb3BlcmF0aW9ucycpO1xuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fcmVzdG9yZU9wZXJhdGlvbldyaXRlRmFpbHVyZTogKCkgPT4gdm9pZCB9KS5fX3Jlc3RvcmVPcGVyYXRpb25Xcml0ZUZhaWx1cmUoKSk7XG4gIGNvbnN0IGZvY3VzQmVmb3JlRXhwaXJ5ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgIHJlY292ZXJ5Rm9jdXNlZDogZG9jdW1lbnQuYWN0aXZlRWxlbWVudD8ubWF0Y2hlcygnW2RhdGEtcmVjb3ZlcnktYWN0aW9uPVwicmV0cnktc2F2ZVwiXScpID8/IGZhbHNlLFxuICAgIHNjcm9sbFk6IHdpbmRvdy5zY3JvbGxZLFxuICB9KSk7XG4gIGV4cGVjdChmb2N1c0JlZm9yZUV4cGlyeS5yZWNvdmVyeUZvY3VzZWQpLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IGV4cGVjdChyZWNvdmVyeVRvYXN0KS50b0hhdmVDb3VudCgwLCB7IHRpbWVvdXQ6IDEwXzAwMCB9KTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UubG9jYXRvcignW2RhdGEtcmVjb3ZlcnktYWN0aW9uPVwicmV0cnktc2F2ZVwiXScpLmV2YWx1YXRlKChlbGVtZW50KSA9PiBlbGVtZW50ID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50KSkudG9CZSh0cnVlKTtcbiAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKGZvY3VzQmVmb3JlRXhwaXJ5LnNjcm9sbFkpO1xuICBjb25zdCBhZnRlckZhaWx1cmUgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoKGFmdGVyRmFpbHVyZS5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnc2ludGVsLXR1cm4tMSddKS50b0JlKGFjY2VwdGVkQmVmb3JlKTtcbiAgZXhwZWN0KGFmdGVyRmFpbHVyZS5tZWRpYS5maWx0ZXIoKHN0b3JlZCkgPT4gc3RvcmVkLnB1cnBvc2UgPT09ICdyZWNvcmRpbmcnICYmIHN0b3JlZC5pZCAhPT0gYWNjZXB0ZWRCZWZvcmUpKS50b0hhdmVMZW5ndGgoMCk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IHNhdmUnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBjb25zdCBzYXZlZCA9IGF3YWl0IHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U6IHsgY2FwdHVyZXM6IG51bWJlcjsgYnl0ZVNpemU6IG51bWJlcjsgbWltZVR5cGU6IHN0cmluZzsgc2hhMjU2OiBzdHJpbmcgfCBudWxsIH07XG4gIH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlLnNoYTI1NiksIHsgdGltZW91dDogNV8wMDAgfSkudG9CZShzYXZlZD8uc2hhMjU2KTtcbiAgY29uc3QgcmVjb3ZlcmVkVHJhY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U6IHsgY2FwdHVyZXM6IG51bWJlcjsgYnl0ZVNpemU6IG51bWJlcjsgbWltZVR5cGU6IHN0cmluZzsgc2hhMjU2OiBzdHJpbmcgfCBudWxsIH07XG4gIH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlKTtcbiAgZXhwZWN0KHJlY292ZXJlZFRyYWNlLmNhcHR1cmVzKS50b0JlKDEpO1xuICBleHBlY3QocmVjb3ZlcmVkVHJhY2UuYnl0ZVNpemUpLnRvQmUoc2F2ZWQ/LmJsb2JTaXplKTtcbiAgZXhwZWN0KHJlY292ZXJlZFRyYWNlLm1pbWVUeXBlKS50b0JlKHNhdmVkPy5taW1lVHlwZSk7XG4gIGNvbnN0IGFmdGVyUmV0cnkgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoKGFmdGVyUmV0cnkucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPilbJ3NpbnRlbC10dXJuLTEnXSkudG9CZShhY2NlcHRlZEJlZm9yZSk7XG4gIGV4cGVjdCgoYWZ0ZXJSZXRyeS5wcm9qZWN0Py5kcmFmdENhbmRpZGF0ZUJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KVsnc2ludGVsLXR1cm4tMSddKS50b0JlKHNhdmVkPy5pZCk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdrbm93bi1zYXZlLWZhaWx1cmUtYnJvd3Nlci1ldmlkZW5jZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgc2NlbmFyaW86ICdGaXJzdCBhY2NlcHRlZCB0YWtlIHByZXNlcnZlZCBhZnRlciBhIGtub3duIHByZS13cml0ZSBxdW90YSBmYWlsdXJlLiBSZXRyeSBzYXZlZCB0aGUgZXhhY3QgY2FwdHVyZWQgQmxvYiB3aXRob3V0IHJlLXJlY29yZGluZy4nLFxuICAgIHBoeXNpY2FsTWljcm9waG9uZTogZmFsc2UsXG4gICAgbmF0aXZlQXBpRXZpZGVuY2U6IGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSksXG4gICAgYWNjZXB0ZWRDYW5kaWRhdGVCZWZvcmVGYWlsdXJlOiBhY2NlcHRlZEJlZm9yZSxcbiAgICBmYWlsZWRBdHRlbXB0OiBmYWlsZWRUcmFjZSxcbiAgICByZWNvdmVyeVRvYXN0OiB0b2FzdFN0eWxlLFxuICAgIGNhcHR1cmVkQmxvYkJlZm9yZVBlcnNpc3RlbmNlOiByZWNvdmVyZWRUcmFjZSxcbiAgICByZXRyeTogcmVjb3ZlcmVkVHJhY2UsXG4gICAgZmluYWxQcm9qZWN0OiBhZnRlclJldHJ5LnByb2plY3QsXG4gICAgcmV0cmllZENhbmRpZGF0ZTogc2F2ZWQsXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbnRlc3QoJ2ZhaWxlZCBndWFyZGVkIEV4aXQga2VlcHMgdGhlIG9yaWdpbmFsIGludGVudCwgZm9jdXNlcyBSZXRyeSwgYW5kIHJlc3RvcmVzIEV4aXQgYWZ0ZXIgcmV0cnkgYW5kIGJvdW5kYXJ5IHJldHVybicsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICB0ZXN0LnNldFRpbWVvdXQoNDVfMDAwKTtcbiAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG4gIGF3YWl0IGluc3RydW1lbnROYXRpdmVNZWRpYShwYWdlKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QSZsb2NhbGU9ZW4nKTtcbiAgY29uc3QgY2FuZGlkYXRlID0gYXdhaXQgKGFzeW5jICgpID0+IHtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PlxuICAgICAgdmlkZW8ucmVhZHlTdGF0ZSA+PSBIVE1MTWVkaWFFbGVtZW50LkhBVkVfQ1VSUkVOVF9EQVRBICYmIHZpZGVvLnZpZGVvV2lkdGggPiAwKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCByZWNvcmRDdXJyZW50V2luZG93KHBhZ2UsICdBJyk7XG4gICAgcmV0dXJuIHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICB9KSgpO1xuICBhd2FpdCBpbnN0YWxsQWNjZXB0YW5jZUZhaWx1cmUocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgY29uc3QgZ3VhcmQgPSBwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJyk7XG4gIGF3YWl0IGV4cGVjdChndWFyZCkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgZ3VhcmQuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTYXZlIGFuZCBsZWF2ZScsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChndWFyZC5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHJ5IGFjY2VwdCBhbmQgbGVhdmUnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgY29uc3QgcmV0cnkgPSBndWFyZC5sb2NhdG9yKCdbZGF0YS1yZWNvdmVyeS1hY3Rpb249XCJyZXRyeS1ndWFyZFwiXScpO1xuICBhd2FpdCBleHBlY3QocmV0cnkpLnRvQmVGb2N1c2VkKCk7XG4gIGNvbnN0IGZhaWxlZCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGV4cGVjdChmYWlsZWQucHJvamVjdD8uZHJhZnRDYW5kaWRhdGVCeVR1cm4pLnRvTWF0Y2hPYmplY3QoeyAnc2ludGVsLXR1cm4tMSc6IGNhbmRpZGF0ZT8uaWQgfSk7XG4gIGV4cGVjdChPYmplY3QudmFsdWVzKGZhaWxlZC5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID8/IHt9KSkudG9IYXZlTGVuZ3RoKDApO1xuICBjb25zdCBhY2NlcHRhbmNlRmFpbHVyZSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHdpbmRvdyBhcyB1bmtub3duIGFzIFdpbmRvdyAmIHsgX19hY2NlcHRGYWlsdXJlVHJhY2U6IHsgY2FsbHM6IG51bWJlcjsgc3RvcmVzOiBzdHJpbmdbXTsgcmVzdG9yZTogKCkgPT4gdm9pZCB9IH0pLl9fYWNjZXB0RmFpbHVyZVRyYWNlKTtcbiAgZXhwZWN0KGFjY2VwdGFuY2VGYWlsdXJlLmNhbGxzKS50b0JlKDEpO1xuICBleHBlY3QoYWNjZXB0YW5jZUZhaWx1cmUuc3RvcmVzKS50b0NvbnRhaW4oJ29wZXJhdGlvbnMnKTtcbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIHVua25vd24gYXMgV2luZG93ICYgeyBfX2FjY2VwdEZhaWx1cmVUcmFjZTogeyByZXN0b3JlOiAoKSA9PiB2b2lkIH0gfSkuX19hY2NlcHRGYWlsdXJlVHJhY2UucmVzdG9yZSgpKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnZ3VhcmRlZC1leGl0LWtub3duLWFjY2VwdGFuY2UtZmFpbHVyZS5wbmcnKSB9KTtcblxuICBjb25zdCBiZWZvcmVUb2FzdEV4cGlyeSA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHtcbiAgICBmb2N1c2VkUmV0cnk6IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQ/Lm1hdGNoZXMoJ1tkYXRhLXJlY292ZXJ5LWFjdGlvbj1cInJldHJ5LWd1YXJkXCJdJykgPz8gZmFsc2UsXG4gICAgc2Nyb2xsWTogd2luZG93LnNjcm9sbFksXG4gIH0pKTtcbiAgZXhwZWN0KGJlZm9yZVRvYXN0RXhwaXJ5LmZvY3VzZWRSZXRyeSkudG9CZSh0cnVlKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0JykpLnRvSGF2ZUNvdW50KDAsIHsgdGltZW91dDogMTBfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocmV0cnkpLnRvQmVGb2N1c2VkKCk7XG4gIGNvbnN0IHJldHJ5Rm9jdXNlZEFmdGVyVG9hc3RFeHBpcnkgPSBhd2FpdCByZXRyeS5ldmFsdWF0ZSgoZWxlbWVudCkgPT4gZWxlbWVudCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCk7XG4gIGV4cGVjdChyZXRyeUZvY3VzZWRBZnRlclRvYXN0RXhwaXJ5KS50b0JlKHRydWUpO1xuICBleHBlY3QoYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB3aW5kb3cuc2Nyb2xsWSkpLnRvQmUoYmVmb3JlVG9hc3RFeHBpcnkuc2Nyb2xsWSk7XG4gIGF3YWl0IHJldHJ5LmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3Byb2plY3RzXFw/LipyZXR1cm5Gb2N1cz1leGl0Lyk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2d1YXJkZWQtZXhpdC1zdWNjZXNzLWJvdW5kYXJ5LnBuZycpLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPWV4aXQvKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgY29uc3QgYWNjZXB0ZWQgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QoYWNjZXB0ZWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4pLnRvTWF0Y2hPYmplY3QoeyAnc2ludGVsLXR1cm4tMSc6IGNhbmRpZGF0ZT8uaWQgfSk7XG4gIGNvbnN0IHN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zID0gYWNjZXB0ZWQub3BlcmF0aW9ucy5maWx0ZXIoKG9wZXJhdGlvbikgPT4gb3BlcmF0aW9uLmtpbmQgPT09ICdhY2NlcHQtY2FuZGlkYXRlJyAmJiBvcGVyYXRpb24uc3RhdGUgPT09ICdjb21taXR0ZWQnKTtcbiAgZXhwZWN0KHN1Y2Nlc3NmdWxBY2NlcHRPcGVyYXRpb25zKS50b0hhdmVMZW5ndGgoMSk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdndWFyZGVkLWV4aXQtcmV0cnktZm9jdXMtZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIG5hdGl2ZUlucHV0OiAnQ2hyb21lIGJyb3dzZXIgZmFrZSBhdWRpbyBpbnB1dDsgbm90IGEgcGh5c2ljYWwgbWljcm9waG9uZScsXG4gICAgY2FuZGlkYXRlSWQ6IGNhbmRpZGF0ZT8uaWQsXG4gICAgYWNjZXB0ZWRCZWZvcmVSZXRyeTogZmFpbGVkLnByb2plY3Q/LmFjY2VwdGVkQnlUdXJuLFxuICAgIGFjY2VwdGVkQWZ0ZXJSZXRyeTogYWNjZXB0ZWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4sXG4gICAgZmFpbHVyZVRyYWNlOiBhY2NlcHRhbmNlRmFpbHVyZSxcbiAgICBzdWNjZXNzZnVsQWNjZXB0T3BlcmF0aW9ucyxcbiAgICBmb2N1c0JlZm9yZVRvYXN0RXhwaXJ5OiBiZWZvcmVUb2FzdEV4cGlyeSxcbiAgICByZXRyeUZvY3VzZWRBZnRlclRvYXN0RXhwaXJ5LFxuICAgIGJvdW5kYXJ5UmV0dXJuRm9jdXNlZEV4aXQ6IGF3YWl0IHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKS5ldmFsdWF0ZSgoZWxlbWVudCkgPT4gZWxlbWVudCA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCksXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbmFzeW5jIGZ1bmN0aW9uIHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlOiBQYWdlLCBsYXlvdXQ6ICdBJyB8ICdCJykge1xuICBjb25zdCBub3RpY2UgPSBsYXlvdXQgPT09ICdBJyA/IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykgOiBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtc3RhdHVzLS1iIC5ub3RpY2UnKTtcbiAgYXdhaXQgZXhwZWN0KG5vdGljZSkudG9Db250YWluVGV4dCgnVGFrZSBzYXZlZCBhcyBhIHJlY292ZXJhYmxlIGNhbmRpZGF0ZS4gSXQgaGFzIG5vdCBiZWVuIGFjY2VwdGVkLicsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcud2F2ZWZvcm0tdGFrZScpKS50b0hhdmVDb3VudCgxKTtcbiAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBjb25zdCBjdXJyZW50VHVybklkID0gbmV3IFVSTChwYWdlLnVybCgpKS5zZWFyY2hQYXJhbXMuZ2V0KCd0dXJuJykgPz8gJ3NpbnRlbC10dXJuLTEnO1xuICBjb25zdCBkcmFmdEJ5VHVybiA9IGRhdGFiYXNlLnByb2plY3Q/LmRyYWZ0Q2FuZGlkYXRlQnlUdXJuIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWQ7XG4gIGNvbnN0IGN1cnJlbnQgPSBkYXRhYmFzZS5tZWRpYS5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gZHJhZnRCeVR1cm4/LltjdXJyZW50VHVybklkXSk7XG4gIGV4cGVjdChjdXJyZW50Py5ibG9iU2l6ZSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICBleHBlY3QoY3VycmVudD8uYmxvYlNpemUpLnRvQmUoY3VycmVudD8uYnl0ZVNpemUpO1xuICBleHBlY3QoY3VycmVudD8uc2hhMjU2KS50b01hdGNoKC9eW2EtZjAtOV17NjR9JC8pO1xuICBleHBlY3QoKGN1cnJlbnQ/LnByb2JlIGFzIHsgYnl0ZVNpemU/OiBudW1iZXIgfSkuYnl0ZVNpemUpLnRvQmUoY3VycmVudD8uYmxvYlNpemUpO1xuICByZXR1cm4gY3VycmVudDtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVjb3JkQ3VycmVudFdpbmRvdyhwYWdlOiBQYWdlLCBsYXlvdXQ6ICdBJyB8ICdCJykge1xuICBjb25zdCByZWNvcmRCdXR0b24gPSBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSk7XG4gIGF3YWl0IGV4cGVjdChyZWNvcmRCdXR0b24pLnRvQmVFbmFibGVkKCk7XG4gIGF3YWl0IHJlY29yZEJ1dHRvbi5jbGljaygpO1xuICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiAoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkucmVjb3JkZXJTdGFydHMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgY29uc3Qgc3RhcnRlZEF0ID0gYXdhaXQgcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpO1xuICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDQwMCk7XG4gIGNvbnN0IG1vdmVkVG8gPSBhd2FpdCBwYWdlLmxvY2F0b3IoJ3ZpZGVvJykuZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSk7XG4gIGV4cGVjdChtb3ZlZFRvKS50b0JlR3JlYXRlclRoYW4oc3RhcnRlZEF0KTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6IC9Db3VudGRvd258U3RvcCByZWNvcmRpbmd8UGF1c2UgcmVjb3JkaW5nL2kgfSkpLnRvSGF2ZUNvdW50KDApO1xuICBhd2FpdCB3YWl0Rm9yU2F2ZWRDYW5kaWRhdGUocGFnZSwgbGF5b3V0KTtcbn1cblxudGVzdC5iZWZvcmVBbGwoYXN5bmMgKCkgPT4gbWtkaXIoZXZpZGVuY2VEaXJlY3RvcnksIHsgcmVjdXJzaXZlOiB0cnVlIH0pKTtcblxudGVzdCgnRXhpdCByZXR1cm5zIHRocm91Z2ggdGhlIGd1YXJkZWQgUHJvamVjdHMgYm91bmRhcnkgYW5kIHJlc3RvcmVzIGZvY3VzIHRvIHRoZSBsb2dpY2FsIEV4aXQgY29udHJvbCcsIGFzeW5jICh7IHBhZ2UgfSkgPT4ge1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJmxvY2FsZT1lbicpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlciAubHVjaWRlLWxvZy1vdXQnKSkudG9IYXZlQ291bnQoMSk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvcHJvamVjdHNcXD8vKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL3JldHVybkZvY3VzPWV4aXQvKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnZXhpdC1ib3VuZGFyeS1yZXR1cm4tZm9jdXMucG5nJykgfSk7XG59KTtcblxudGVzdCgnZGVsYXllZCBzb3VyY2UgcGxheWJhY2sga2VlcHMgdGhlIHJlY29yZGVyIGlkbGUgdW50aWwgdGhlIHByZXBhcmVkIHdpbmRvdyBhY3R1YWxseSBzdGFydHMnLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDQ1XzAwMCk7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEmbG9jYWxlPWVuJyk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcigndmlkZW8nKS5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+XG4gICAgdmlkZW8ucmVhZHlTdGF0ZSA+PSBIVE1MTWVkaWFFbGVtZW50LkhBVkVfQ1VSUkVOVF9EQVRBICYmIHZpZGVvLnZpZGVvV2lkdGggPiAwKSwgeyB0aW1lb3V0OiAxNV8wMDAgfSkudG9CZSh0cnVlKTtcbiAgY29uc3QgcHJlcGFyZWRXaW5kb3cgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IG5ldyBQcm9taXNlPElEQkRhdGFiYXNlPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXF1ZXN0ID0gaW5kZXhlZERCLm9wZW4oJ2R1YmJlZC1jb3JlLWxvY2FsLXYxJyk7XG4gICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgIH0pO1xuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBuZXcgUHJvbWlzZTx7IHdpbmRvd3M6IEFycmF5PHsgaWQ6IHN0cmluZzsgc3RhcnRNczogbnVtYmVyOyBlbmRNczogbnVtYmVyIH0+IH0+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVlc3QgPSBkYXRhYmFzZS50cmFuc2FjdGlvbigncHJvamVjdHMnLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZSgncHJvamVjdHMnKS5nZXQoJ3NpbnRlbC1wcmVwYXJlZCcpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICB9KTtcbiAgICBkYXRhYmFzZS5jbG9zZSgpO1xuICAgIGNvbnN0IHNlbGVjdGVkID0gcHJvamVjdC53aW5kb3dzLmZpbmQoKHdpbmRvdykgPT4gd2luZG93LmlkID09PSAnc2ludGVsLXR1cm4tMScpO1xuICAgIGlmICghc2VsZWN0ZWQpIHRocm93IG5ldyBFcnJvcignUHJlcGFyZWQgdHVybiAxIGlzIG1pc3NpbmcgaXRzIHNvdXJjZSB3aW5kb3cuJyk7XG4gICAgcmV0dXJuIHNlbGVjdGVkO1xuICB9KTtcbiAgYXdhaXQgcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKChlbGVtZW50KSA9PiB7XG4gICAgY29uc3QgdmlkZW8gPSBlbGVtZW50IGFzIEhUTUxWaWRlb0VsZW1lbnQ7XG4gICAgY29uc3QgdHJhY2UgPSB7XG4gICAgICByZXF1ZXN0ZWRBdDogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgbmF0aXZlUGxheUF0OiBudWxsIGFzIG51bWJlciB8IG51bGwsXG4gICAgICBwbGF5aW5nQXQ6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHBsYXlpbmdWaWRlb1RpbWU6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHJlY29yZGVyU3RhcnRBdDogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgcmVjb3JkZXJTdGFydFZpZGVvVGltZTogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgICAgcmVjb3JkZXJTdG9wQXQ6IG51bGwgYXMgbnVtYmVyIHwgbnVsbCxcbiAgICAgIHJlY29yZGVyU3RvcFZpZGVvVGltZTogbnVsbCBhcyBudW1iZXIgfCBudWxsLFxuICAgIH07XG4gICAgKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZT86IHR5cGVvZiB0cmFjZSB9KS5fX2RlbGF5ZWRDYXB0dXJlVHJhY2UgPSB0cmFjZTtcbiAgICBjb25zdCBuYXRpdmVQbGF5ID0gdmlkZW8ucGxheS5iaW5kKHZpZGVvKTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodmlkZW8sICdwbGF5Jywge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgdmFsdWU6ICgpID0+IHtcbiAgICAgICAgdHJhY2UucmVxdWVzdGVkQXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICB0cmFjZS5uYXRpdmVQbGF5QXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICAgICAgICAgIG5hdGl2ZVBsYXkoKS50aGVuKHJlc29sdmUsIHJlamVjdCk7XG4gICAgICAgICAgfSwgMV8yMDApO1xuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSk7XG4gICAgdmlkZW8uYWRkRXZlbnRMaXN0ZW5lcigncGxheWluZycsICgpID0+IHtcbiAgICAgIHRyYWNlLnBsYXlpbmdBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdHJhY2UucGxheWluZ1ZpZGVvVGltZSA9IHZpZGVvLmN1cnJlbnRUaW1lO1xuICAgIH0sIHsgb25jZTogdHJ1ZSB9KTtcbiAgICBjb25zdCBzdGFydCA9IE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0O1xuICAgIE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0YXJ0ID0gZnVuY3Rpb24gKC4uLmFyZ3M6IFBhcmFtZXRlcnM8TWVkaWFSZWNvcmRlclsnc3RhcnQnXT4pIHtcbiAgICAgIHRyYWNlLnJlY29yZGVyU3RhcnRBdCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgdHJhY2UucmVjb3JkZXJTdGFydFZpZGVvVGltZSA9IHZpZGVvLmN1cnJlbnRUaW1lO1xuICAgICAgcmV0dXJuIHN0YXJ0LmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gICAgY29uc3Qgc3RvcCA9IE1lZGlhUmVjb3JkZXIucHJvdG90eXBlLnN0b3A7XG4gICAgTWVkaWFSZWNvcmRlci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uICguLi5hcmdzOiBQYXJhbWV0ZXJzPE1lZGlhUmVjb3JkZXJbJ3N0b3AnXT4pIHtcbiAgICAgIHRyYWNlLnJlY29yZGVyU3RvcEF0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICB0cmFjZS5yZWNvcmRlclN0b3BWaWRlb1RpbWUgPSB2aWRlby5jdXJyZW50VGltZTtcbiAgICAgIHJldHVybiBzdG9wLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH07XG4gIH0pO1xuXG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1ByZXBhcmluZyByZWNvcmRpbmfigKYnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCgzNTApO1xuICBjb25zdCBiZWZvcmVSZWFsUGxheWJhY2sgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCB0cmFjZSA9ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZTogeyByZWNvcmRlclN0YXJ0QXQ6IG51bWJlciB8IG51bGw7IHJlcXVlc3RlZEF0OiBudW1iZXIgfCBudWxsIH0gfSkuX19kZWxheWVkQ2FwdHVyZVRyYWNlO1xuICAgIHJldHVybiB7IC4uLnRyYWNlLCB2aWRlb1RpbWU6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ3ZpZGVvJyk/LmN1cnJlbnRUaW1lID8/IG51bGwgfTtcbiAgfSk7XG4gIGV4cGVjdChiZWZvcmVSZWFsUGxheWJhY2sucmVxdWVzdGVkQXQpLm5vdC50b0JlTnVsbCgpO1xuICBleHBlY3QoYmVmb3JlUmVhbFBsYXliYWNrLnJlY29yZGVyU3RhcnRBdCkudG9CZU51bGwoKTtcbiAgZXhwZWN0KGJlZm9yZVJlYWxQbGF5YmFjay52aWRlb1RpbWUpLm5vdC50b0JlTnVsbCgpO1xuICBleHBlY3QoTWF0aC5hYnMoKGJlZm9yZVJlYWxQbGF5YmFjay52aWRlb1RpbWUgPz8gMCkgLSBwcmVwYXJlZFdpbmRvdy5zdGFydE1zIC8gMTAwMCkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMC4wNSk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2RlbGF5ZWQtc291cmNlLXByZXBhcmluZy5wbmcnKSB9KTtcblxuICBjb25zdCBjYW5kaWRhdGUgPSBhd2FpdCB3YWl0Rm9yU2F2ZWRDYW5kaWRhdGUocGFnZSwgJ0EnKTtcbiAgY29uc3QgdHJhY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7IF9fZGVsYXllZENhcHR1cmVUcmFjZTogUmVjb3JkPHN0cmluZywgbnVtYmVyIHwgbnVsbD4gfSkuX19kZWxheWVkQ2FwdHVyZVRyYWNlKTtcbiAgY29uc3QgZXhwZWN0ZWREdXJhdGlvbiA9IChwcmVwYXJlZFdpbmRvdy5lbmRNcyAtIHByZXBhcmVkV2luZG93LnN0YXJ0TXMpIC8gMTAwMDtcbiAgZXhwZWN0KHRyYWNlLm5hdGl2ZVBsYXlBdCkudG9CZUdyZWF0ZXJUaGFuKHRyYWNlLnJlcXVlc3RlZEF0ID8/IDApO1xuICBleHBlY3QoKHRyYWNlLm5hdGl2ZVBsYXlBdCA/PyAwKSAtICh0cmFjZS5yZXF1ZXN0ZWRBdCA/PyAwKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgxXzE1MCk7XG4gIGV4cGVjdCh0cmFjZS5wbGF5aW5nQXQpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwodHJhY2UubmF0aXZlUGxheUF0ID8/IDApO1xuICBleHBlY3QodHJhY2UucmVjb3JkZXJTdGFydEF0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKHRyYWNlLnBsYXlpbmdBdCA/PyAwKTtcbiAgZXhwZWN0KE1hdGguYWJzKCh0cmFjZS5yZWNvcmRlclN0YXJ0VmlkZW9UaW1lID8/IDApIC0gKHRyYWNlLnBsYXlpbmdWaWRlb1RpbWUgPz8gMCkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDAuMDUpO1xuICBleHBlY3QoKHRyYWNlLnBsYXlpbmdWaWRlb1RpbWUgPz8gMCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwocHJlcGFyZWRXaW5kb3cuc3RhcnRNcyAvIDEwMDAgLSAwLjA1KTtcbiAgZXhwZWN0KCh0cmFjZS5yZWNvcmRlclN0b3BWaWRlb1RpbWUgPz8gMCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwocHJlcGFyZWRXaW5kb3cuZW5kTXMgLyAxMDAwIC0gMC4xNSk7XG4gIGV4cGVjdChNYXRoLmFicygoKHRyYWNlLnJlY29yZGVyU3RvcFZpZGVvVGltZSA/PyAwKSAtICh0cmFjZS5yZWNvcmRlclN0YXJ0VmlkZW9UaW1lID8/IDApKSAtIGV4cGVjdGVkRHVyYXRpb24pKS50b0JlTGVzc1RoYW5PckVxdWFsKDAuMik7XG4gIGV4cGVjdChjYW5kaWRhdGU/LmJsb2JTaXplKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIGV4cGVjdChjYW5kaWRhdGU/LnNoYTI1NikudG9NYXRjaCgvXlthLWYwLTldezY0fSQvKTtcbiAgZXhwZWN0KChjYW5kaWRhdGU/LnByb2JlIGFzIHsgZGVjb2RlZEZyYW1lcz86IG51bWJlciB9KS5kZWNvZGVkRnJhbWVzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIGV4cGVjdChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS50b0VxdWFsKHsgZ2V0VXNlck1lZGlhQ2FsbHM6IDEsIHJlY29yZGVyU3RhcnRzOiAxIH0pO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdkZWxheWVkLXNvdXJjZS1jYW5kaWRhdGUucG5nJykgfSk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdkZWxheWVkLXNvdXJjZS1uYXRpdmUtY2FwdHVyZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgaW5wdXQ6ICdDaHJvbWUgYnJvd3NlciBmYWtlIGF1ZGlvIGlucHV0OyBub3QgYSBwaHlzaWNhbCBtaWNyb3Bob25lJyxcbiAgICBzb3VyY2VQbGF5RGVsYXlNczogMV8yMDAsXG4gICAgcHJlcGFyZWRXaW5kb3csXG4gICAgZXhwZWN0ZWREdXJhdGlvbixcbiAgICBiZWZvcmVSZWFsUGxheWJhY2ssXG4gICAgbmF0aXZlVHJhY2U6IHRyYWNlLFxuICAgIHBlcnNpc3RlZENhbmRpZGF0ZTogY2FuZGlkYXRlLFxuICAgIGFwaUNvdW50ZXJzOiBhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpLFxuICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbn0pO1xuXG5mb3IgKGNvbnN0IGxheW91dCBvZiBbJ0EnLCAnQiddIGFzIGNvbnN0KSB7XG4gIHRlc3QoYExheW91dCAke2xheW91dH0gcmVjb3JkcyByZWFsIGJyb3dzZXIgZmFrZSBpbnB1dCwgcmVjb3ZlcnMgdGhlIGNhbmRpZGF0ZSwgYW5kIGNvbXBsZXRlcyB0aGUgYWNjZXB0ZWQgc25hcHNob3RgLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgICB0ZXN0LnNldFRpbWVvdXQoNjBfMDAwKTtcbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gICAgYXdhaXQgcGFnZS5nb3RvKGAvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9JHtsYXlvdXR9JmxvY2FsZT1lbmApO1xuICAgIGlmIChsYXlvdXQgPT09ICdBJykgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnU2ludGVsIMK3IFRoZSBTZWFyY2gnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIGVsc2Uge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1oZWFkZXIgaDEnKSkudG9CZVZpc2libGUoKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5wb3NpdGlvbi1kb3RzJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlcl9fbGluZS1jb3VudCcpKS50b0hhdmVUZXh0KCdMaW5lIDEgLyAzJyk7XG4gICAgfVxuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcigndmlkZW8nKS5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+XG4gICAgICB2aWRlby5yZWFkeVN0YXRlID49IEhUTUxNZWRpYUVsZW1lbnQuSEFWRV9DVVJSRU5UX0RBVEEgJiYgdmlkZW8udmlkZW9XaWR0aCA+IDApLCB7IHRpbWVvdXQ6IDE1XzAwMCB9KS50b0JlKHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy53YXZlZm9ybS1yb3cnKSkudG9IYXZlQXR0cmlidXRlKCdkYXRhLXNvdXJjZS13YXZlZm9ybScsICdkZWNvZGVkJyk7XG4gICAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5mb250cy5yZWFkeSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkpLnRvQmVJblZpZXdwb3J0KCk7XG4gICAgaWYgKGxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdTaW50ZWwgwrcgVGhlIFNlYXJjaCcgfSkpLnRvQmVJblZpZXdwb3J0KCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeUxhYmVsKCdDdXJyZW50IGxpbmUnKSkudG9CZUluVmlld3BvcnQoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1oZWFkZXJfX2xpbmUtY291bnQnKSkudG9CZUluVmlld3BvcnQoKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5TGFiZWwoJ0N1cnJlbnQgbGluZScpKS50b0JlSW5WaWV3cG9ydCgpO1xuICAgIH1cbiAgICBjb25zdCBkaWFsb2d1ZSA9IHBhZ2UubG9jYXRvcignLmRpYWxvZ3VlLWNvcHkgcCcpO1xuICAgIGNvbnN0IGVuZ2xpc2hEaWFsb2d1ZSA9IGF3YWl0IGRpYWxvZ3VlLnRleHRDb250ZW50KCk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBjb25zdCBydXNzaWFuRGlhbG9ndWUgPSBhd2FpdCBkaWFsb2d1ZS50ZXh0Q29udGVudCgpO1xuICAgIGV4cGVjdChydXNzaWFuRGlhbG9ndWUpLm5vdC50b0JlKGVuZ2xpc2hEaWFsb2d1ZSk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9IYXZlVGV4dChlbmdsaXNoRGlhbG9ndWUgPz8gJycpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtaGVhZGVyIC5sb2NhbGUtY29udHJvbCcpKS50b0hhdmVDb3VudCgwKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlciAubHVjaWRlLWxvZy1vdXQnKSkudG9IYXZlQ291bnQoMSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1jb250cm9scyBidXR0b24nKS5maWx0ZXIoeyBoYXNUZXh0OiAnUHJldmlvdXMnIH0pLmxvY2F0b3IoJy5sdWNpZGUtY2hldnJvbi1sZWZ0JykpLnRvSGF2ZUNvdW50KDEpO1xuICAgIGNvbnN0IGluaXRpYWxCdXR0b24gPSBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSk7XG4gICAgYXdhaXQgZXhwZWN0KGluaXRpYWxCdXR0b24pLnRvQmVFbmFibGVkKCk7XG4gICAgZXhwZWN0KGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSkpLnRvRXF1YWwoeyBnZXRVc2VyTWVkaWFDYWxsczogMCwgcmVjb3JkZXJTdGFydHM6IDAgfSk7XG4gICAgY29uc3QgaGVhZGVyRXZpZGVuY2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICAgIGNvbnN0IGluc3BlY3QgPSAoc2VsZWN0b3I6IHN0cmluZykgPT4ge1xuICAgICAgICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gICAgICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG4gICAgICAgIGNvbnN0IHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgICBjb25zdCBzdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdGV4dDogZWxlbWVudC50ZXh0Q29udGVudD8udHJpbSgpID8/ICcnLFxuICAgICAgICAgIHg6IHJlY3QueCwgeTogcmVjdC55LCB3aWR0aDogcmVjdC53aWR0aCwgaGVpZ2h0OiByZWN0LmhlaWdodCxcbiAgICAgICAgICBjb2xvcjogc3R5bGUuY29sb3IsIG9wYWNpdHk6IHN0eWxlLm9wYWNpdHksIHZpc2liaWxpdHk6IHN0eWxlLnZpc2liaWxpdHksIGRpc3BsYXk6IHN0eWxlLmRpc3BsYXksXG4gICAgICAgIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZXhpdDogaW5zcGVjdCgnLmV4aXQtbGluaycpLCB0aXRsZTogaW5zcGVjdCgnLnJlY29yZC1oZWFkZXIgaDEnKSxcbiAgICAgICAgbG9jYWxlOiBpbnNwZWN0KCcubG9jYWxlLWNvbnRyb2wnKSwgZG90czogaW5zcGVjdCgnLnBvc2l0aW9uLWRvdHMnKSxcbiAgICAgICAgbWFicnlMb2FkZWQ6IGRvY3VtZW50LmZvbnRzLmNoZWNrKCc0MDAgMjZweCBcIk1hYnJ5IFByb1wiJyksXG4gICAgICAgIGRpYWxvZ3VlRm9udDogZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZGlhbG9ndWUtY29weSBwJykhKS5mb250RmFtaWx5LFxuICAgICAgICBzY3JvbGxZOiB3aW5kb3cuc2Nyb2xsWSxcbiAgICAgIH07XG4gICAgfSk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJlYWR5LnBuZ2ApIH0pO1xuXG4gICAgY29uc3Qgdmlld3BvcnQgPSBhd2FpdCBwYWdlLmxvY2F0b3IoJy5tZWRpYS12aWV3cG9ydCcpLmJvdW5kaW5nQm94KCk7XG4gICAgY29uc3Qgd2F2ZSA9IGF3YWl0IHBhZ2UubG9jYXRvcignLndhdmVmb3JtLXN0YWNrJykuYm91bmRpbmdCb3goKTtcbiAgICBjb25zdCBjb250cm9scyA9IGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1jb250cm9scycpLmJvdW5kaW5nQm94KCk7XG4gICAgZXhwZWN0KHZpZXdwb3J0KS5ub3QudG9CZU51bGwoKTtcbiAgICBleHBlY3Qod2F2ZSkubm90LnRvQmVOdWxsKCk7XG4gICAgZXhwZWN0KGNvbnRyb2xzKS5ub3QudG9CZU51bGwoKTtcbiAgICBpZiAodmlld3BvcnQpIHtcbiAgICAgIGNvbnN0IGNlbnRlciA9IHZpZXdwb3J0LnggKyB2aWV3cG9ydC53aWR0aCAvIDI7XG4gICAgICBjb25zdCB2aXNpYmxlQ2VudGVyID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xpZW50V2lkdGggLyAyKTtcbiAgICAgIGV4cGVjdChNYXRoLmFicyhjZW50ZXIgLSB2aXNpYmxlQ2VudGVyKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICAgIGNvbnN0IGV4aXQgPSBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRXhpdCcsIGV4YWN0OiB0cnVlIH0pLmJvdW5kaW5nQm94KCk7XG4gICAgICBleHBlY3QoTWF0aC5hYnMoKGV4aXQ/LnggPz8gLTk5OSkgLSB2aWV3cG9ydC54KSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICB9XG4gICAgaWYgKHZpZXdwb3J0ICYmIGxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBjb25zdCBwYW5lbCA9IGF3YWl0IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCcpLmJvdW5kaW5nQm94KCk7XG4gICAgICBleHBlY3QocGFuZWw/LndpZHRoKS50b0JlKDI3Mik7XG4gICAgICBleHBlY3QocGFuZWwhLnggLSAodmlld3BvcnQueCArIHZpZXdwb3J0LndpZHRoKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgyMyk7XG4gICAgICBleHBlY3Qodmlld3BvcnQueCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgzMik7XG4gICAgfVxuICAgIGlmICh3YXZlICYmIGNvbnRyb2xzICYmIGxheW91dCA9PT0gJ0InKSBleHBlY3QoY29udHJvbHMueSAtICh3YXZlLnkgKyB3YXZlLmhlaWdodCkpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMjMpO1xuICAgIGNvbnN0IGV4cGVjdFBhbmVsQWxpZ25lZCA9IGFzeW5jICgpID0+IHtcbiAgICAgIGlmIChsYXlvdXQgIT09ICdBJykgcmV0dXJuO1xuICAgICAgY29uc3QgYm91bmRzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgICAgICBtZWRpYVk6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5tZWRpYS12aWV3cG9ydCcpIS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS55LFxuICAgICAgICBwYW5lbFk6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yZWNvcmQtcGFuZWwnKSEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkueSxcbiAgICAgIH0pKTtcbiAgICAgIGV4cGVjdChNYXRoLmFicyhib3VuZHMucGFuZWxZIC0gYm91bmRzLm1lZGlhWSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgfTtcbiAgICBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcblxuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdPcmlnaW5hbCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpKS50b0JlR3JlYXRlclRoYW4oMC4xKTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUGF1c2UnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXN1bWUnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgwKTtcblxuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKGFzeW5jICgpID0+IChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS5yZWNvcmRlclN0YXJ0cykudG9CZSgxKTtcbiAgICBhd2FpdCBleHBlY3RQYW5lbEFsaWduZWQoKTtcbiAgICBjb25zdCByZWNvcmRpbmdOb3RpY2UgPSBsYXlvdXQgPT09ICdBJyA/IHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykgOiBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtc3RhdHVzLS1iIC5ub3RpY2UnKTtcbiAgICBhd2FpdCBleHBlY3QocmVjb3JkaW5nTm90aWNlKS50b0NvbnRhaW5UZXh0KCdSZWNvcmRpbmcgdGhlIGZ1bGwgcHJlcGFyZWQgd2luZG93LiBJdCB3aWxsIHN0b3AgYXV0b21hdGljYWxseS4nKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogL0NvdW50ZG93bnxTdG9wIHJlY29yZGluZ3xQYXVzZSByZWNvcmRpbmcvaSB9KSkudG9IYXZlQ291bnQoMCk7XG4gICAgYXdhaXQgd2FpdEZvclNhdmVkQ2FuZGlkYXRlKHBhZ2UsIGxheW91dCk7XG4gICAgYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLWNhbmRpZGF0ZS5wbmdgKSB9KTtcblxuICAgIGNvbnN0IGF1ZGlvID0gcGFnZS5sb2NhdG9yKCdhdWRpbycpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdZb3VyIHRha2UnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IGF1ZGlvLmV2YWx1YXRlKChlbGVtZW50OiBIVE1MQXVkaW9FbGVtZW50KSA9PiBlbGVtZW50LmN1cnJlbnRUaW1lKSkudG9CZUdyZWF0ZXJUaGFuKDAuMDUpO1xuICAgIGV4cGVjdChhd2FpdCBhdWRpby5nZXRBdHRyaWJ1dGUoJ3NyYycpKS50b0NvbnRhaW4oJ2Jsb2I6Jyk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdsYXlvdXQtYS0xNDQweDkwMC1jYW5kaWRhdGUtZ3VhcmQucG5nJykgfSk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdTdGF5IGhlcmUnLCBleGFjdDogdHJ1ZSB9KS5sYXN0KCkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnZGlhbG9nJykpLnRvQmVIaWRkZW4oKTtcbiAgICAgIGNvbnN0IGJlZm9yZVJlbG9hZCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhiZWZvcmVSZWxvYWQucHJvamVjdD8uYWNjZXB0ZWRCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiA/PyB7fSkpLnRvSGF2ZUxlbmd0aCgwKTtcbiAgICAgIGNvbnN0IGNvdW50ZXJzQmVmb3JlUmVsb2FkID0gYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKTtcbiAgICAgIGF3YWl0IHBhZ2UucmVsb2FkKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1lvdXIgdGFrZScsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICAgICAgZXhwZWN0KGF3YWl0IGV2aWRlbmNlQ291bnRlcnMocGFnZSkpLnRvRXF1YWwoY291bnRlcnNCZWZvcmVSZWxvYWQpO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnbGF5b3V0LWEtMTQ0MHg5MDAtcmVsb2FkZWQtY2FuZGlkYXRlLnBuZycpIH0pO1xuICAgIH1cblxuICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcgfSk7XG4gICAgaWYgKGxheW91dCA9PT0gJ0EnKSBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdTaW50ZWwgwrcgVGhlIFNlYXJjaCcgfSkpLnRvQmVWaXNpYmxlKCk7XG4gICAgZWxzZSB7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLWhlYWRlcl9fbGluZS1jb3VudCcpKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnU2ludGVsIMK3IFRoZSBTZWFyY2gnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlMYWJlbCgnQ3VycmVudCBsaW5lJykpLnRvQmVWaXNpYmxlKCk7XG4gICAgfVxuICAgIGNvbnN0IGhvcml6b250YWxPdmVyZmxvdyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoID4gd2luZG93LmlubmVyV2lkdGgpO1xuICAgIGV4cGVjdChob3Jpem9udGFsT3ZlcmZsb3cpLnRvQmUoZmFsc2UpO1xuICAgIGF3YWl0IHNldFJlY29yZExvY2FsZShwYWdlLCAncnUnKTtcbiAgICBhd2FpdCBleHBlY3QoZGlhbG9ndWUpLnRvQ29udGFpblRleHQoL1tcXHUwNDAwLVxcdTA0RkZdLyk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoID4gd2luZG93LmlubmVyV2lkdGgpKS50b0JlKGZhbHNlKTtcbiAgICBjb25zdCB0YXJnZXRTaXplID0gYXdhaXQgcGFnZS5sb2NhdG9yKCcucmVjb3JkLWFjdGlvbicpLmJvdW5kaW5nQm94KCk7XG4gICAgZXhwZWN0KHRhcmdldFNpemU/LmhlaWdodCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg0OCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTM5MHg2NjctcnVzc2lhbi5wbmdgKSB9KTtcbiAgICBhd2FpdCBzZXRSZWNvcmRMb2NhbGUocGFnZSwgJ2VuJyk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTM5MHg2NjctcmVhZHkucG5nYCkgfSk7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG5cbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGB0dXJuPXNpbnRlbC10dXJuLTJgKSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tdHVybi0yLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IHJlY29yZEN1cnJlbnRXaW5kb3cocGFnZSwgbGF5b3V0KTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGB0dXJuPXNpbnRlbC10dXJuLTNgKSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdydScpO1xuICAgIGF3YWl0IGV4cGVjdChkaWFsb2d1ZSkudG9Db250YWluVGV4dCgvW1xcdTA0MDAtXFx1MDRGRl0vKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tdHVybi0zLXJ1c3NpYW4ucG5nYCkgfSk7XG4gICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgIGF3YWl0IHJlY29yZEN1cnJlbnRXaW5kb3cocGFnZSwgbGF5b3V0KTtcblxuICAgIGNvbnN0IG1lZGlhID0gYXdhaXQgcmVhZEluZGV4ZWREYihwYWdlKTtcbiAgICBleHBlY3QobWVkaWEubWVkaWEuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5wdXJwb3NlID09PSAncmVjb3JkaW5nJykpLnRvSGF2ZUxlbmd0aCgzKTtcbiAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhtZWRpYS5wcm9qZWN0Py5hY2NlcHRlZEJ5VHVybiBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID8/IHt9KSkudG9IYXZlTGVuZ3RoKDIpO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xNDQweDkwMC1maW5hbC1jYW5kaWRhdGUucG5nYCkgfSk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHBhZ2Uucm91dGUoJyoqL21lZGlhL2V4YW1wbGUtZHViLm1wNCcsIChyb3V0ZSkgPT4gcm91dGUuZnVsZmlsbCh7IHN0YXR1czogNTAzLCBib2R5OiAnZml4dHVyZSB1bmF2YWlsYWJsZSBmb3IgdGhlIGZpcnN0IGF0dGVtcHRzJyB9KSk7XG4gICAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAzOTAsIGhlaWdodDogNjY3IH0pO1xuICAgICAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB3aW5kb3cuc2Nyb2xsVG8oMCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCkpO1xuICAgICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmV2YWx1YXRlKChidXR0b246IEhUTUxCdXR0b25FbGVtZW50KSA9PiBidXR0b24uY2xpY2soKSk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9yZXN1bHRcXD9sYXlvdXQ9QSZzbmFwc2hvdD0vKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ1lvdXIgcmVzdWx0JyB9KSkudG9CZUluVmlld3BvcnQoKTtcbiAgICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKDApO1xuICAgICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5hY3RpdmVFbGVtZW50Py50YWdOYW1lKSkudG9CZSgnSDEnKTtcbiAgICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRXhpdCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2RpYWxvZycpKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1NhdmUgYW5kIGxlYXZlJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3Byb2plY3RzXFw/cmV0dXJuUHJvamVjdD1zaW50ZWwtcHJlcGFyZWQmcmV0dXJuTGF5b3V0PUImcmV0dXJuRm9jdXM9ZXhpdC8pO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9wcm9qZWN0c1xcL3NpbnRlbC1wcmVwYXJlZFxcL3JlY29yZFxcP2xheW91dD1CJnR1cm49c2ludGVsLXR1cm4tMy8pO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cImV4aXRcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgICB9XG5cbiAgICBsZXQgZmluYWxEYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgZXhwZWN0KGZpbmFsRGF0YWJhc2UucHJvamVjdD8uaW5pdGlhbFJlc3VsdFNuYXBzaG90SWQpLnRvQmVUcnV0aHkoKTtcbiAgICBleHBlY3QoZmluYWxEYXRhYmFzZS5zbmFwc2hvdHMpLnRvSGF2ZUxlbmd0aCgxKTtcbiAgICBjb25zdCBzbmFwc2hvdCA9IGZpbmFsRGF0YWJhc2Uuc25hcHNob3RzWzBdIGFzIHsgdGFrZXM6IHVua25vd25bXTsgYXV0aG9yaXphdGlvbjogc3RyaW5nOyBjb250ZW50U2hhMjU2OiBzdHJpbmcgfTtcbiAgICBleHBlY3Qoc25hcHNob3QuYXV0aG9yaXphdGlvbikudG9CZSgnaW5pdGlhbC1jb21wbGV0aW9uJyk7XG4gICAgZXhwZWN0KHNuYXBzaG90LnRha2VzKS50b0hhdmVMZW5ndGgoMyk7XG4gICAgZXhwZWN0KHNuYXBzaG90LmNvbnRlbnRTaGEyNTYpLnRvTWF0Y2goL15bYS1mMC05XXs2NH0kLyk7XG5cbiAgICBpZiAobGF5b3V0ID09PSAnQicpIHtcbiAgICAgIGNvbnN0IHNuYXBzaG90SWQgPSBTdHJpbmcoZmluYWxEYXRhYmFzZS5wcm9qZWN0Py5sYXRlc3RSZXN1bHRTbmFwc2hvdElkID8/ICcnKTtcbiAgICAgIGV4cGVjdChzbmFwc2hvdElkKS50b0JlVHJ1dGh5KCk7XG4gICAgICBhd2FpdCBwYWdlLmdvdG8oYC9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVzdWx0P2xheW91dD1CJnNuYXBzaG90PSR7ZW5jb2RlVVJJQ29tcG9uZW50KHNuYXBzaG90SWQpfWApO1xuICAgIH1cbiAgICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdZb3VyIHJlc3VsdCcgfSkpLnRvQmVWaXNpYmxlKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzIGJ1dHRvbicpLmZpbHRlcih7IGhhc1RleHQ6ICdNeSBkdWInIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZXN1bHQtaGVhZGVyIGgxJykpLnRvQmVGb2N1c2VkKCk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gd2luZG93LnNjcm9sbFkpKS50b0JlKDApO1xuICAgIGV4cGVjdChhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZXN1bHQtaGVhZGVyIC5sdWNpZGUtbG9nLW91dCcpLmNvdW50KCkpLnRvQmUoMSk7XG4gICAgZXhwZWN0KGF3YWl0IHBhZ2UubG9jYXRvcignLnJlc3VsdC13b3Jrc3BhY2VfX2FjdGlvbnMgYnV0dG9uJykuZmlsdGVyKHsgaGFzVGV4dDogJ1JldHVybiB0byByZWNvcmRpbmcnIH0pLmxvY2F0b3IoJy5sdWNpZGUtdW5kby0yJykuY291bnQoKSkudG9CZSgxKTtcblxuICAgIGlmIChsYXlvdXQgPT09ICdBJykge1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXRyeSBhc3NlbWJseScsIGV4YWN0OiB0cnVlIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdUaGUgcmVzdWx0IHNhbXBsZSBjb3VsZCBub3QgYmUgbG9hZGVkLiBZb3VyIGFjY2VwdGVkIHRha2VzIGFuZCBwcmV2aW91cyByZXN1bHQgcmVtYWluIHVuY2hhbmdlZC4nKSkudG9CZVZpc2libGUoKTtcbiAgICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ2xheW91dC1hLXJlc3VsdC1maXh0dXJlLXVuYXZhaWxhYmxlLnBuZycpIH0pO1xuICAgICAgYXdhaXQgcGFnZS51bnJvdXRlKCcqKi9tZWRpYS9leGFtcGxlLWR1Yi5tcDQnKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZXRyeSBhc3NlbWJseScsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgfVxuXG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXh0KCdJbGx1c3RyYXRpdmUgc2FtcGxlIHJlYWR5JykpLnRvQmVWaXNpYmxlKHsgdGltZW91dDogMTVfMDAwIH0pO1xuICAgIGNvbnN0IHJlc3VsdFZpZGVvID0gcGFnZS5nZXRCeVRlc3RJZCgncmVzdWx0LXZpZGVvJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ2R1YicpO1xuICAgIGF3YWl0IGV4cGVjdChyZXN1bHRWaWRlbykudG9IYXZlQXR0cmlidXRlKCdzcmMnLCAvXmJsb2I6Lyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby52aWRlb1dpZHRoID4gMCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGNvbnN0IHByZXNlbnRlZEdlbmVyYXRpb25JZCA9IGF3YWl0IHJlc3VsdFZpZGVvLmdldEF0dHJpYnV0ZSgnZGF0YS1nZW5lcmF0aW9uLWlkJyk7XG4gICAgZXhwZWN0KHByZXNlbnRlZEdlbmVyYXRpb25JZCkudG9NYXRjaCgvXmdlbmVyYXRpb246Lyk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LTE0NDB4OTAwLXJlc3VsdC1yZWFkeS5wbmdgKSB9KTtcbiAgICBjb25zdCBub3JtYWxSZXN1bHQgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICAgIGNvbnN0IGJvdW5kcyA9IChzZWxlY3Rvcjogc3RyaW5nKSA9PiB7XG4gICAgICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHNlbGVjdG9yKTtcbiAgICAgICAgaWYgKCFlbGVtZW50KSByZXR1cm4gbnVsbDtcbiAgICAgICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgIHJldHVybiB7IHg6IHJlY3QueCwgeTogcmVjdC55LCB3aWR0aDogcmVjdC53aWR0aCwgaGVpZ2h0OiByZWN0LmhlaWdodCwgYm90dG9tOiByZWN0LmJvdHRvbSB9O1xuICAgICAgfTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIGV4aXQ6IGJvdW5kcygnLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLFxuICAgICAgICBzY3JlZW46IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NjcmVlbicpLFxuICAgICAgICBzZWVrOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zZWVrJyksXG4gICAgICAgIGNvbnRyb2xzOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX190cmFuc3BvcnQtcm93JyksXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tMTQ0MHg5MDAtcmVzdWx0LW1ldHJpY3MuanNvbmApLCBKU09OLnN0cmluZ2lmeShub3JtYWxSZXN1bHQsIG51bGwsIDIpLCAndXRmOCcpO1xuICAgIGV4cGVjdChNYXRoLmFicyhub3JtYWxSZXN1bHQudGl0bGUhLnkgLSAobGF5b3V0ID09PSAnQScgPyAyMCA6IDI3KSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKG5vcm1hbFJlc3VsdC5leGl0IS55IC0gKGxheW91dCA9PT0gJ0EnID8gMjAgOiAyOCkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChNYXRoLmFicyhub3JtYWxSZXN1bHQuc2NyZWVuIS55IC0gKGxheW91dCA9PT0gJ0EnID8gMTA4IDogMTA0KSkpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKG5vcm1hbFJlc3VsdC5zY3JlZW4hLndpZHRoIC0gOTIwKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgyKTtcbiAgICBleHBlY3Qobm9ybWFsUmVzdWx0LnNlZWshLmJvdHRvbSkudG9CZUxlc3NUaGFuT3JFcXVhbChub3JtYWxSZXN1bHQuY29udHJvbHMhLnkgKyAxKTtcbiAgICBpZiAobGF5b3V0ID09PSAnQScpIHtcbiAgICAgIGF3YWl0IHNldFJlY29yZExvY2FsZShwYWdlLCAncnUnKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ9CS0LDRiCDRgNC10LfRg9C70YzRgtCw0YInIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnbGF5b3V0LWEtMTQ0MHg5MDAtcmVzdWx0LXJ1LnBuZycpIH0pO1xuICAgICAgYXdhaXQgc2V0UmVjb3JkTG9jYWxlKHBhZ2UsICdlbicpO1xuICAgICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdoZWFkaW5nJywgeyBuYW1lOiAnWW91ciByZXN1bHQnIH0pKS50b0JlVmlzaWJsZSgpO1xuICAgIH1cbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZShsYXlvdXQgPT09ICdBJyA/IHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA2NjcgfSA6IHsgd2lkdGg6IDM5MCwgaGVpZ2h0OiA4NDQgfSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsV2lkdGggPD0gd2luZG93LmlubmVyV2lkdGgpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UubG9jYXRvcignLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLmV2YWx1YXRlKChlbGVtZW50KSA9PiBnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnRyYW5zZm9ybSkpLnRvQmUoJ25vbmUnKTtcbiAgICBjb25zdCBwaG9uZVJlc3VsdCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgY29uc3QgYm91bmRzID0gKHNlbGVjdG9yOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2NyZWVuOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zY3JlZW4nKSxcbiAgICAgICAgZXhpdDogYm91bmRzKCcucmVzdWx0LWhlYWRlciAuZXhpdC1saW5rJyksXG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIHNlZWs6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKSxcbiAgICAgICAgY29udHJvbHM6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3RyYW5zcG9ydC1yb3cnKSxcbiAgICAgICAgdm9sdW1lOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX192b2x1bWUgaW5wdXQnKSxcbiAgICAgICAgc291cmNlOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zb3VyY2UtdGFicyBidXR0b24nKSxcbiAgICAgICAgYWN0aW9uczogQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucmVzdWx0LXdvcmtzcGFjZV9fYWN0aW9ucyAuYnV0dG9uJyksIChlbGVtZW50KSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9KTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tcGhvbmUtcmVzdWx0LXJlYWR5LnBuZ2ApLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LXBob25lLXJlc3VsdC1tZXRyaWNzLmpzb25gKSwgSlNPTi5zdHJpbmdpZnkocGhvbmVSZXN1bHQsIG51bGwsIDIpLCAndXRmOCcpO1xuICAgIGV4cGVjdChNYXRoLmFicyhwaG9uZVJlc3VsdC5zY3JlZW4hLnggLSAxNikpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMSk7XG4gICAgZXhwZWN0KE1hdGguYWJzKHBob25lUmVzdWx0LnNjcmVlbiEud2lkdGggLSAzNTgpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5zY3JlZW4hLnkpLnRvQmUobGF5b3V0ID09PSAnQScgPyAxNjQgOiAxNjgpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5leGl0IS55KS50b0JlKDQwKTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQudGl0bGUhLnkpLnRvQmUobGF5b3V0ID09PSAnQScgPyA5NyA6IDk2KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuc2VlayEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuY29udHJvbHMhLmhlaWdodCkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg0OCk7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LnZvbHVtZSEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDQ4KTtcbiAgICBleHBlY3QocGhvbmVSZXN1bHQuc291cmNlIS5oZWlnaHQpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoNDgpO1xuICAgIGV4cGVjdChwaG9uZVJlc3VsdC5hY3Rpb25zKS50b0hhdmVMZW5ndGgoMik7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LmFjdGlvbnMuZXZlcnkoKGFjdGlvbikgPT4gYWN0aW9uLmhlaWdodCA+PSA0OCkpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KHBob25lUmVzdWx0LmFjdGlvbnNbMV0hLnkpLnRvQmVHcmVhdGVyVGhhbihwaG9uZVJlc3VsdC5hY3Rpb25zWzBdIS55KTtcbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDYwMCB9KTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmV2YWx1YXRlKCgpID0+IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQgPD0gd2luZG93LmlubmVySGVpZ2h0KSkudG9CZSh0cnVlKTtcbiAgICBjb25zdCBzaG9ydFJlc3VsdCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgICAgY29uc3QgYm91bmRzID0gKHNlbGVjdG9yOiBzdHJpbmcpID0+IHtcbiAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICBpZiAoIWVsZW1lbnQpIHJldHVybiBudWxsO1xuICAgICAgICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgZG9jdW1lbnRIZWlnaHQ6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQsXG4gICAgICAgIHRpdGxlOiBib3VuZHMoJy5yZXN1bHQtaGVhZGVyIGgxJyksXG4gICAgICAgIGV4aXQ6IGJvdW5kcygnLnJlc3VsdC1oZWFkZXIgLmV4aXQtbGluaycpLFxuICAgICAgICBwbGF5ZXI6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXInKSxcbiAgICAgICAgc2NyZWVuOiBib3VuZHMoJy5yZXN1bHQtcGxheWVyX19zY3JlZW4nKSxcbiAgICAgICAgcmFpbDogYm91bmRzKCcucmVzdWx0LXBsYXllcl9fdHJhbnNwb3J0JyksXG4gICAgICAgIHNlZWs6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKSxcbiAgICAgICAgY29udHJvbHM6IGJvdW5kcygnLnJlc3VsdC1wbGF5ZXJfX3RyYW5zcG9ydC1yb3cnKSxcbiAgICAgICAgZGV0YWlsczogYm91bmRzKCcucmVzdWx0LXdvcmtzcGFjZV9fZGV0YWlscycpLFxuICAgICAgICBhY3Rpb25zOiBib3VuZHMoJy5yZXN1bHQtd29ya3NwYWNlX19hY3Rpb25zJyksXG4gICAgICB9O1xuICAgIH0pO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xMjgweDYwMC1yZXN1bHQtcmVhZHkucG5nYCkgfSk7XG4gICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYGxheW91dC0ke2xheW91dC50b0xvd2VyQ2FzZSgpfS0xMjgweDYwMC1yZXN1bHQtbWV0cmljcy5qc29uYCksIEpTT04uc3RyaW5naWZ5KHNob3J0UmVzdWx0LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuZG9jdW1lbnRIZWlnaHQpLnRvQmVMZXNzVGhhbk9yRXF1YWwoNjAwKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQudGl0bGU/LnkpLnRvQmUoMTYpO1xuICAgIGV4cGVjdChzaG9ydFJlc3VsdC5leGl0Py55KS50b0JlKDE2KTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQudGl0bGUhLmJvdHRvbSkudG9CZUxlc3NUaGFuT3JFcXVhbCg2MDApO1xuICAgIGNvbnN0IHNob3J0VGFyZ2V0ID0gbGF5b3V0ID09PSAnQScgPyB7IHk6IDg4LCB3aWR0aDogNTQ4IH0gOiB7IHk6IDgwLCB3aWR0aDogNTYyIH07XG4gICAgZXhwZWN0KE1hdGguYWJzKHNob3J0UmVzdWx0LnNjcmVlbiEueSAtIHNob3J0VGFyZ2V0LnkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIGV4cGVjdChNYXRoLmFicyhzaG9ydFJlc3VsdC5zY3JlZW4hLndpZHRoIC0gc2hvcnRUYXJnZXQud2lkdGgpKS50b0JlTGVzc1RoYW5PckVxdWFsKDQpO1xuICAgIGV4cGVjdChzaG9ydFJlc3VsdC5zZWVrIS5ib3R0b20pLnRvQmVMZXNzVGhhbk9yRXF1YWwoc2hvcnRSZXN1bHQuY29udHJvbHMhLnkgKyAxKTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuYWN0aW9ucyEuaGVpZ2h0KS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDg4KTtcbiAgICBleHBlY3Qoc2hvcnRSZXN1bHQuYWN0aW9ucyEuYm90dG9tKS50b0JlTGVzc1RoYW5PckVxdWFsKDYwMCk7XG4gICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG5cbiAgICBjb25zdCBvcmlnaW5hbFNvdXJjZSA9IHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzIGJ1dHRvbicpLmZpbHRlcih7IGhhc1RleHQ6ICdPcmlnaW5hbCcgfSk7XG4gICAgY29uc3QgZHViU291cmNlID0gcGFnZS5sb2NhdG9yKCcucmVzdWx0LXBsYXllcl9fc291cmNlLXRhYnMgYnV0dG9uJykuZmlsdGVyKHsgaGFzVGV4dDogJ015IGR1YicgfSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NvdXJjZS10YWJzJykpLnRvSGF2ZUF0dHJpYnV0ZSgncm9sZScsICdncm91cCcpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAnZmFsc2UnKTtcbiAgICBhd2FpdCBvcmlnaW5hbFNvdXJjZS5mb2N1cygpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ1NwYWNlJyk7XG4gICAgYXdhaXQgZXhwZWN0KG9yaWdpbmFsU291cmNlKS50b0hhdmVBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICd0cnVlJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ29yaWdpbmFsJyk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnQXJyb3dSaWdodCcpO1xuICAgIGF3YWl0IGV4cGVjdChkdWJTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ3RydWUnKTtcbiAgICBhd2FpdCBleHBlY3QoZHViU291cmNlKS50b0JlRm9jdXNlZCgpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQucHJlc3MoJ0Fycm93TGVmdCcpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAndHJ1ZScpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9CZUZvY3VzZWQoKTtcbiAgICBhd2FpdCBwYWdlLmtleWJvYXJkLnByZXNzKCdFbmQnKTtcbiAgICBhd2FpdCBleHBlY3QoZHViU291cmNlKS50b0hhdmVBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsICd0cnVlJyk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5wcmVzcygnSG9tZScpO1xuICAgIGF3YWl0IGV4cGVjdChvcmlnaW5hbFNvdXJjZSkudG9IYXZlQXR0cmlidXRlKCdhcmlhLXByZXNzZWQnLCAndHJ1ZScpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQbGF5JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLmN1cnJlbnRUaW1lKSkudG9CZUdyZWF0ZXJUaGFuKDAuMik7XG4gICAgY29uc3Qgc3dpdGNoVGltZSA9IGF3YWl0IHJlc3VsdFZpZGVvLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8uY3VycmVudFRpbWUpO1xuICAgIGF3YWl0IGR1YlNvdXJjZS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdChkdWJTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ3RydWUnKTtcbiAgICBhd2FpdCBleHBlY3Qob3JpZ2luYWxTb3VyY2UpLnRvSGF2ZUF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgJ2ZhbHNlJyk7XG4gICAgYXdhaXQgZXhwZWN0KHJlc3VsdFZpZGVvKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtZ2VuZXJhdGlvbi1pZCcsIHByZXNlbnRlZEdlbmVyYXRpb25JZCA/PyAnJyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiAhdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiBNYXRoLmFicyhhd2FpdCByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLmN1cnJlbnRUaW1lKSAtIHN3aXRjaFRpbWUpKVxuICAgICAgLnRvQmVMZXNzVGhhbigxLjUpO1xuXG4gICAgY29uc3QgcmVzdWx0U2VlayA9IHBhZ2UubG9jYXRvcignLnJlc3VsdC1wbGF5ZXJfX3NlZWsnKTtcbiAgICBhd2FpdCByZXN1bHRTZWVrLmZvY3VzKCk7XG4gICAgYXdhaXQgcGFnZS5rZXlib2FyZC5kb3duKCdBcnJvd1JpZ2h0Jyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHBhZ2Uua2V5Ym9hcmQudXAoJ0Fycm93UmlnaHQnKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+ICF2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGNvbnN0IGFmdGVyS2V5Ym9hcmRSZWxlYXNlID0gYXdhaXQgcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5jdXJyZW50VGltZSkpLnRvQmVHcmVhdGVyVGhhbihhZnRlcktleWJvYXJkUmVsZWFzZSk7XG5cbiAgICBhd2FpdCByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlKCkpO1xuICAgIGF3YWl0IHJlc3VsdFNlZWsuZGlzcGF0Y2hFdmVudCgncG9pbnRlcmRvd24nKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgcmVzdWx0U2Vlay5kaXNwYXRjaEV2ZW50KCdwb2ludGVyY2FuY2VsJyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmVzdWx0VmlkZW8uZXZhbHVhdGUoKHZpZGVvOiBIVE1MVmlkZW9FbGVtZW50KSA9PiB2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQbGF5JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+ICF2aWRlby5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgIGF3YWl0IHJlc3VsdFNlZWsuZGlzcGF0Y2hFdmVudCgncG9pbnRlcmRvd24nKTtcbiAgICBhd2FpdCByZXN1bHRTZWVrLmV2YWx1YXRlKChpbnB1dDogSFRNTElucHV0RWxlbWVudCkgPT4gaW5wdXQuYmx1cigpKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiByZXN1bHRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG5cbiAgICBjb25zdCBjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkID0gYXdhaXQgcmVzdWx0VmlkZW8uZ2V0QXR0cmlidXRlKCdkYXRhLWdlbmVyYXRpb24taWQnKTtcbiAgICBhd2FpdCBvcmlnaW5hbFNvdXJjZS5jbGljaygpO1xuICAgIGF3YWl0IGV4cGVjdChyZXN1bHRWaWRlbykudG9IYXZlQXR0cmlidXRlKCdkYXRhLXNvdXJjZScsICdvcmlnaW5hbCcpO1xuICAgIGNvbnN0IFtkb3dubG9hZF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICBwYWdlLndhaXRGb3JFdmVudCgnZG93bmxvYWQnKSxcbiAgICAgIHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdEb3dubG9hZCBNeSBkdWInLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpLFxuICAgIF0pO1xuICAgIGNvbnN0IGRvd25sb2FkUGF0aCA9IGF3YWl0IGRvd25sb2FkLnBhdGgoKTtcbiAgICBleHBlY3QoZG93bmxvYWQuc3VnZ2VzdGVkRmlsZW5hbWUoKSkudG9CZSgnZXhhbXBsZS1kdWIubXA0Jyk7XG4gICAgZXhwZWN0KGRvd25sb2FkUGF0aCkubm90LnRvQmVOdWxsKCk7XG4gICAgY29uc3QgZG93bmxvYWRlZEJ5dGVzID0gYXdhaXQgcmVhZEZpbGUoZG93bmxvYWRQYXRoISk7XG4gICAgY29uc3QgZXhwZWN0ZWRGaXh0dXJlQnl0ZXMgPSBhd2FpdCByZWFkRmlsZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ3B1YmxpYycsICdtZWRpYScsICdleGFtcGxlLWR1Yi5tcDQnKSk7XG4gICAgY29uc3QgZG93bmxvYWRlZFNoYTI1NiA9IGNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShkb3dubG9hZGVkQnl0ZXMpLmRpZ2VzdCgnaGV4Jyk7XG4gICAgZXhwZWN0KGRvd25sb2FkZWRCeXRlcy5lcXVhbHMoZXhwZWN0ZWRGaXh0dXJlQnl0ZXMpKS50b0JlKHRydWUpO1xuXG4gICAgY29uc3QgcmVzdWx0RGF0YWJhc2UgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGRhdGFiYXNlID0gYXdhaXQgbmV3IFByb21pc2U8SURCRGF0YWJhc2U+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKCdkdWJiZWQtY29yZS1sb2NhbC12MScpO1xuICAgICAgICByZXF1ZXN0Lm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxdWVzdC5yZXN1bHQpO1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlYWQgPSA8VD4obmFtZTogc3RyaW5nKSA9PiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgIGNvbnN0IHJlcXVlc3QgPSBkYXRhYmFzZS50cmFuc2FjdGlvbihuYW1lLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZShuYW1lKS5nZXRBbGwoKTtcbiAgICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0IGFzIFQpO1xuICAgICAgICByZXF1ZXN0Lm9uZXJyb3IgPSAoKSA9PiByZWplY3QocmVxdWVzdC5lcnJvcik7XG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGpvYnMgPSBhd2FpdCByZWFkPEFycmF5PHsgaWQ6IHN0cmluZzsgc25hcHNob3RJZDogc3RyaW5nOyBzdGF0dXM6IHN0cmluZzsgcHJvZHVjdFJlbmRlcmVkOiBib29sZWFuOyBhc3NlbWJsZWRGcm9tQWNjZXB0ZWRUYWtlczogYm9vbGVhbiB9Pj4oJ3Jlc3VsdEpvYnMnKTtcbiAgICAgIGNvbnN0IHJlc3VsdE1lZGlhID0gYXdhaXQgcmVhZDxBcnJheTx7IGlkOiBzdHJpbmc7IGZpbGVuYW1lOiBzdHJpbmc7IGJ5dGVTaXplOiBudW1iZXI7IHNoYTI1Njogc3RyaW5nOyBibG9iOiBCbG9iIH0+PigncmVzdWx0TWVkaWEnKTtcbiAgICAgIGRhdGFiYXNlLmNsb3NlKCk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBqb2JzOiBqb2JzLm1hcCgoeyBpZCwgc25hcHNob3RJZCwgc3RhdHVzLCBwcm9kdWN0UmVuZGVyZWQsIGFzc2VtYmxlZEZyb21BY2NlcHRlZFRha2VzIH0pID0+ICh7IGlkLCBzbmFwc2hvdElkLCBzdGF0dXMsIHByb2R1Y3RSZW5kZXJlZCwgYXNzZW1ibGVkRnJvbUFjY2VwdGVkVGFrZXMgfSkpLFxuICAgICAgICBtZWRpYTogcmVzdWx0TWVkaWEubWFwKCh7IGlkLCBmaWxlbmFtZSwgYnl0ZVNpemUsIHNoYTI1NiwgYmxvYiB9KSA9PiAoeyBpZCwgZmlsZW5hbWUsIGJ5dGVTaXplLCBzaGEyNTYsIGJsb2JTaXplOiBibG9iLnNpemUgfSkpLFxuICAgICAgfTtcbiAgICB9KTtcbiAgICBleHBlY3QocmVzdWx0RGF0YWJhc2Uuam9icykudG9Db250YWluRXF1YWwoZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xuICAgICAgaWQ6IGN1cnJlbnRHZW5lcmF0aW9uQmVmb3JlRG93bmxvYWQsXG4gICAgICBzdGF0dXM6ICdyZWFkeScsXG4gICAgICBwcm9kdWN0UmVuZGVyZWQ6IGZhbHNlLFxuICAgICAgYXNzZW1ibGVkRnJvbUFjY2VwdGVkVGFrZXM6IGZhbHNlLFxuICAgIH0pKTtcbiAgICBleHBlY3QocmVzdWx0RGF0YWJhc2UubWVkaWEpLnRvQ29udGFpbkVxdWFsKGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcbiAgICAgIGlkOiBjdXJyZW50R2VuZXJhdGlvbkJlZm9yZURvd25sb2FkLFxuICAgICAgZmlsZW5hbWU6ICdleGFtcGxlLWR1Yi5tcDQnLFxuICAgICAgYnl0ZVNpemU6IGV4cGVjdGVkRml4dHVyZUJ5dGVzLmJ5dGVMZW5ndGgsXG4gICAgICBibG9iU2l6ZTogZXhwZWN0ZWRGaXh0dXJlQnl0ZXMuYnl0ZUxlbmd0aCxcbiAgICAgIHNoYTI1NjogZG93bmxvYWRlZFNoYTI1NixcbiAgICB9KSk7XG5cbiAgICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAzOTAsIGhlaWdodDogODQ0IH0pO1xuICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoIDw9IHdpbmRvdy5pbm5lcldpZHRoKSkudG9CZSh0cnVlKTtcbiAgICBleHBlY3QoYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ0Rvd25sb2FkIE15IGR1YicsIGV4YWN0OiB0cnVlIH0pLmJvdW5kaW5nQm94KCkudGhlbigoYm94KSA9PiBib3g/LmhlaWdodCA/PyAwKSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg0OCk7XG4gICAgY29uc3QgbW9iaWxlVGFyZ2V0cyA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gQXJyYXkuZnJvbShkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcucmVzdWx0LXBsYXllcl9fc2VlaywgLnJlc3VsdC1wbGF5ZXJfX3ZvbHVtZSBpbnB1dCcpLCAoZWxlbWVudCkgPT4ge1xuICAgICAgY29uc3QgYm91bmRzID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgIHJldHVybiB7IGxhYmVsOiBlbGVtZW50LmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpLCBoZWlnaHQ6IGJvdW5kcy5oZWlnaHQsIHdpZHRoOiBib3VuZHMud2lkdGggfTtcbiAgICB9KSk7XG4gICAgZXhwZWN0KG1vYmlsZVRhcmdldHMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgICBleHBlY3QobW9iaWxlVGFyZ2V0cy5ldmVyeSgodGFyZ2V0KSA9PiB0YXJnZXQuaGVpZ2h0ID49IDQ4KSkudG9CZSh0cnVlKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVzdWx0LXBsYXllcl9fc2VlaycpKS50b0JlRW5hYmxlZCgpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZXN1bHQtcGxheWVyX192b2x1bWUgaW5wdXQnKSkudG9CZUVuYWJsZWQoKTtcbiAgICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tMzkweDg0NC1yZXN1bHQtcmVhZHkucG5nYCksIGZ1bGxQYWdlOiB0cnVlIH0pO1xuXG4gICAgZmluYWxEYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gICAgY29uc3QgbmF0aXZlRXZpZGVuY2UgPSBhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpO1xuICAgIGV4cGVjdChuYXRpdmVFdmlkZW5jZS5nZXRVc2VyTWVkaWFDYWxscykudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGV4cGVjdChuYXRpdmVFdmlkZW5jZS5yZWNvcmRlclN0YXJ0cykudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksIGBsYXlvdXQtJHtsYXlvdXQudG9Mb3dlckNhc2UoKX0tYnJvd3Nlci1ldmlkZW5jZS5qc29uYCksIEpTT04uc3RyaW5naWZ5KHtcbiAgICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgIGxheW91dCxcbiAgICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgICAgaW5wdXQ6ICdDaHJvbWUgYnJvd3NlciBmYWtlIGF1ZGlvIGlucHV0OyBub3QgYSBwaHlzaWNhbCBtaWNyb3Bob25lJyxcbiAgICAgIG5hdGl2ZUFwaUV2aWRlbmNlOiBuYXRpdmVFdmlkZW5jZSxcbiAgICAgIGluaXRpYWxIZWFkZXI6IGhlYWRlckV2aWRlbmNlLFxuICAgICAgcHJvamVjdDogZmluYWxEYXRhYmFzZS5wcm9qZWN0LFxuICAgICAgY2FwdHVyZXM6IGZpbmFsRGF0YWJhc2UubWVkaWEuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5wdXJwb3NlID09PSAncmVjb3JkaW5nJyksXG4gICAgICBvcGVyYXRpb25zOiBmaW5hbERhdGFiYXNlLm9wZXJhdGlvbnMsXG4gICAgICBzbmFwc2hvdHM6IGZpbmFsRGF0YWJhc2Uuc25hcHNob3RzLFxuICAgICAgcmVzdWx0OiB7XG4gICAgICAgIGdlbmVyYXRpb25JZDogY3VycmVudEdlbmVyYXRpb25CZWZvcmVEb3dubG9hZCxcbiAgICAgICAgY3VycmVudENvbXBhcmlzb25BdERvd25sb2FkOiAnb3JpZ2luYWwnLFxuICAgICAgICBkb3dubG9hZEZpbGVuYW1lOiBkb3dubG9hZC5zdWdnZXN0ZWRGaWxlbmFtZSgpLFxuICAgICAgICBkb3dubG9hZFNoYTI1NjogZG93bmxvYWRlZFNoYTI1NixcbiAgICAgICAgZXhhY3RGaXh0dXJlQnl0ZXNNYXRjaDogZG93bmxvYWRlZEJ5dGVzLmVxdWFscyhleHBlY3RlZEZpeHR1cmVCeXRlcyksXG4gICAgICAgIGZpeHR1cmVQcm92ZW5hbmNlOiAnRml4ZWQgaWxsdXN0cmF0aXZlIHNhbXBsZTsgcHJvZHVjdFJlbmRlcmVkPWZhbHNlOyBhc3NlbWJsZWRGcm9tQWNjZXB0ZWRUYWtlcz1mYWxzZScsXG4gICAgICAgIGpvYnM6IHJlc3VsdERhdGFiYXNlLmpvYnMsXG4gICAgICAgIG1lZGlhOiByZXN1bHREYXRhYmFzZS5tZWRpYSxcbiAgICAgIH0sXG4gICAgICBhc3NlcnRpb25zOiBbJ05vIGdldFVzZXJNZWRpYSBvciBNZWRpYVJlY29yZGVyIGJlZm9yZSBleHBsaWNpdCBSZWNvcmQnLCAndmlkZW8gbW92ZWQgZHVyaW5nIGVhY2ggbmF0aXZlIHJlY29yZGluZycsICdjYXB0dXJlZCBCbG9iIHBlcnNpc3RlZCBhbmQgaGFzaGVkJywgJ2FjY2VwdGVkIHNuYXBzaG90IGluY2x1ZGVzIGV4YWN0IHRocmVlIHJlY29yZGVkIGNhbmRpZGF0ZXMnLCAnbmF0aXZlIGNvbnRyb2xzIHJlbWFpbmVkIGxvY2tlZCBkdXJpbmcgY2FwdHVyZScsICdSZXN1bHQgZ2VuZXJhdGlvbiBjb25zdW1lZCB0aGUgYXV0aG9yaXplZCBpbW11dGFibGUgc25hcHNob3QnLCAncGxheWVyIHNlcnZlZCBleGFjdCBmaXh0dXJlIGJ5dGVzIGFuZCByZW1haW5lZCBwYXVzZWQgb24gZW50cnknLCAnc291cmNlIHN3aXRjaCBwcmVzZXJ2ZWQgcGxheWhlYWQgYW5kIHBsYXkgaW50ZW50JywgJ2Rvd25sb2FkIGZyb20gT3JpZ2luYWwgcHJldmlldyBwaW5uZWQgdGhlIHByZXNlbnRlZCBNeSBkdWIgZ2VuZXJhdGlvbicsICdkb3dubG9hZGVkIGJ5dGVzIG1hdGNoIHRoZSBwZXJzaXN0ZWQgZml4dHVyZSBoYXNoJywgJ21vYmlsZSBSZXN1bHQgaGFzIG5vIGhvcml6b250YWwgb3ZlcmZsb3cgYW5kIGEgNDhweCBkb3dubG9hZCB0YXJnZXQnXSxcbiAgICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcblxuICAgIGNvbnN0IHJlc3VsdFJvdXRlID0gcGFnZS51cmwoKTtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmV0dXJuIHRvIHJlY29yZGluZycsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGAvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZFxcXFw/bGF5b3V0PSR7bGF5b3V0fSZ0dXJuPXNpbnRlbC10dXJuLTFgKSk7XG4gICAgY29uc3QgcmV0dXJuZWRSZWNvcmRWaWRlbyA9IHBhZ2UubG9jYXRvcignLm1lZGlhLXZpZXdwb3J0IHZpZGVvJyk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcmV0dXJuZWRSZWNvcmRWaWRlby5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgbGF5b3V0LSR7bGF5b3V0LnRvTG93ZXJDYXNlKCl9LXJlc3VsdC1yZXR1cm4tZmlyc3QtdHVybi5wbmdgKSB9KTtcbiAgICBhd2FpdCBwYWdlLmdvdG8ocmVzdWx0Um91dGUpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnaGVhZGluZycsIHsgbmFtZTogJ1lvdXIgcmVzdWx0JyB9KSkudG9CZVZpc2libGUoKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiBwYWdlLmdldEJ5VGVzdElkKCdyZXN1bHQtdmlkZW8nKS5ldmFsdWF0ZSgodmlkZW86IEhUTUxWaWRlb0VsZW1lbnQpID0+IHZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlUZXN0SWQoJ3Jlc3VsdC12aWRlbycpKS50b0hhdmVBdHRyaWJ1dGUoJ2RhdGEtc291cmNlJywgJ2R1YicpO1xuXG4gICAgaWYgKGxheW91dCA9PT0gJ0EnKSB7XG4gICAgICBjb25zdCBsZWF2aW5nVmlkZW8gPSBhd2FpdCBwYWdlLmdldEJ5VGVzdElkKCdyZXN1bHQtdmlkZW8nKS5ldmFsdWF0ZUhhbmRsZSgodmlkZW8pID0+IHZpZGVvKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQbGF5JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZ2V0QnlUZXN0SWQoJ3Jlc3VsdC12aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gIXZpZGVvLnBhdXNlZCkpLnRvQmUodHJ1ZSk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRXhpdCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9wcm9qZWN0c1xcPy4qcmV0dXJuRm9jdXM9ZXhpdC8pO1xuICAgICAgZXhwZWN0KGF3YWl0IGxlYXZpbmdWaWRlby5ldmFsdWF0ZSgodmlkZW8pID0+ICh2aWRlbyBhcyBIVE1MVmlkZW9FbGVtZW50KS5wYXVzZWQpKS50b0JlKHRydWUpO1xuICAgICAgYXdhaXQgcGFnZS5nZXRCeVRlc3RJZCgncmV0dXJuLXRvLXNhdmVkLXJlY29yZCcpLmNsaWNrKCk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9yZXR1cm5Gb2N1cz1leGl0Lyk7XG4gICAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCdbZGF0YS1sb2dpY2FsLWZvY3VzPVwiZXhpdFwiXScpKS50b0JlRm9jdXNlZCgpO1xuICAgIH1cblxuICAgIGlmIChsYXlvdXQgPT09ICdCJykge1xuICAgICAgYXdhaXQgcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgICAgIHR5cGUgUmVzdWx0U3RvcmUgPSB7XG4gICAgICAgICAgcmVhZEdlbmVyYXRpb25NZWRpYShzY29wZTogdW5rbm93biwgaWQ6IHVua25vd24pOiBQcm9taXNlPHVua25vd24+O1xuICAgICAgICAgIGxvYWRQcmVwYXJlZFByb2plY3Qoc2NvcGU6IHVua25vd24pOiBQcm9taXNlPHsgcmV2aXNpb246IG51bWJlciB9IHwgbnVsbD47XG4gICAgICAgICAgdG9tYnN0b25lUHJvamVjdChzY29wZTogdW5rbm93biwgcmV2aXNpb246IG51bWJlciwgb3BlcmF0aW9uOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlcj47XG4gICAgICAgIH07XG4gICAgICAgIHR5cGUgRmliZXIgPSB7IGNoaWxkPzogdW5rbm93bjsgc2libGluZz86IHVua25vd247IG1lbW9pemVkUHJvcHM/OiB1bmtub3duIH07XG4gICAgICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIChIVE1MRWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8IG51bGw7XG4gICAgICAgIGlmICghcm9vdCkgdGhyb3cgbmV3IEVycm9yKCdUaGUgUmVhY3Qgcm9vdCBpcyB1bmF2YWlsYWJsZS4nKTtcbiAgICAgICAgY29uc3Qgcm9vdEtleSA9IE9iamVjdC5rZXlzKHJvb3QpLmZpbmQoKGtleSkgPT4ga2V5LnN0YXJ0c1dpdGgoJ19fcmVhY3RDb250YWluZXIkJykpO1xuICAgICAgICBpZiAoIXJvb3RLZXkpIHRocm93IG5ldyBFcnJvcignVGhlIFJlYWN0IHJvb3QgZmliZXIgaXMgdW5hdmFpbGFibGUuJyk7XG4gICAgICAgIGNvbnN0IHBlbmRpbmc6IHVua25vd25bXSA9IFtyb290W3Jvb3RLZXldXTtcbiAgICAgICAgbGV0IHN0b3JlOiBSZXN1bHRTdG9yZSB8IG51bGwgPSBudWxsO1xuICAgICAgICB3aGlsZSAocGVuZGluZy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgY29uc3QgZmliZXIgPSBwZW5kaW5nLnBvcCgpIGFzIEZpYmVyIHwgbnVsbDtcbiAgICAgICAgICBpZiAoIWZpYmVyKSBjb250aW51ZTtcbiAgICAgICAgICBjb25zdCBwcm9wcyA9IGZpYmVyLm1lbW9pemVkUHJvcHMgYXMgeyBzZXJ2aWNlcz86IHsgcmVzdWx0cz86IFJlc3VsdFN0b3JlIH0gfSB8IG51bGw7XG4gICAgICAgICAgaWYgKHByb3BzPy5zZXJ2aWNlcz8ucmVzdWx0cykgc3RvcmUgPSBwcm9wcy5zZXJ2aWNlcy5yZXN1bHRzO1xuICAgICAgICAgIGlmIChmaWJlci5jaGlsZCkgcGVuZGluZy5wdXNoKGZpYmVyLmNoaWxkKTtcbiAgICAgICAgICBpZiAoZmliZXIuc2libGluZykgcGVuZGluZy5wdXNoKGZpYmVyLnNpYmxpbmcpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghc3RvcmUpIHRocm93IG5ldyBFcnJvcignVGhlIGFjdGl2ZSB0eXBlZCBSZXN1bHRQb3J0IHdhcyBub3QgZm91bmQgaW4gdGhlIHNlcnZpY2VzIHByb3ZpZGVyLicpO1xuICAgICAgICBjb25zdCBvcmlnaW5hbFJlYWQgPSBzdG9yZS5yZWFkR2VuZXJhdGlvbk1lZGlhLmJpbmQoc3RvcmUpO1xuICAgICAgICBjb25zdCB0YXJnZXQgPSB3aW5kb3cgYXMgV2luZG93ICYgeyBfX2RlbGV0ZWRCZWZvcmVHZW5lcmF0aW9uRGVsaXZlcnk/OiBib29sZWFuIH07XG4gICAgICAgIHN0b3JlLnJlYWRHZW5lcmF0aW9uTWVkaWEgPSBhc3luYyAoc2NvcGUsIGlkKSA9PiB7XG4gICAgICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IG9yaWdpbmFsUmVhZChzY29wZSwgaWQpO1xuICAgICAgICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBzdG9yZS5sb2FkUHJlcGFyZWRQcm9qZWN0KHNjb3BlKTtcbiAgICAgICAgICBpZiAoIXByb2plY3QpIHRocm93IG5ldyBFcnJvcignVGhlIHByZXBhcmVkIHByb2plY3QgZGlzYXBwZWFyZWQgYmVmb3JlIHRoZSB0b21ic3RvbmUgc2VhbS4nKTtcbiAgICAgICAgICBhd2FpdCBzdG9yZS50b21ic3RvbmVQcm9qZWN0KHNjb3BlLCBwcm9qZWN0LnJldmlzaW9uLCBgcmV2aWV3LWRlbGV0ZToke2NyeXB0by5yYW5kb21VVUlEKCl9YCk7XG4gICAgICAgICAgdGFyZ2V0Ll9fZGVsZXRlZEJlZm9yZUdlbmVyYXRpb25EZWxpdmVyeSA9IHRydWU7XG4gICAgICAgICAgcmV0dXJuIHBheWxvYWQ7XG4gICAgICAgIH07XG4gICAgICB9KTtcbiAgICAgIGxldCBkb3dubG9hZEV2ZW50cyA9IDA7XG4gICAgICBwYWdlLm9uKCdkb3dubG9hZCcsICgpID0+IHsgZG93bmxvYWRFdmVudHMgKz0gMTsgfSk7XG4gICAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnRG93bmxvYWQgTXkgZHViJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJ1tkYXRhLXRlc3RpZD1cImRlbGV0ZWQtcHJvamVjdC1ib3VuZGFyeVwiXScpKS50b0JlVmlzaWJsZSgpO1xuICAgICAgZXhwZWN0KGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fZGVsZXRlZEJlZm9yZUdlbmVyYXRpb25EZWxpdmVyeT86IGJvb2xlYW4gfSkuX19kZWxldGVkQmVmb3JlR2VuZXJhdGlvbkRlbGl2ZXJ5KSkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChkb3dubG9hZEV2ZW50cykudG9CZSgwKTtcbiAgICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5VGVzdElkKCdyZXN1bHQtcGxheWVyJykpLnRvSGF2ZUNvdW50KDApO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnQi1kb3dubG9hZC10b21ic3RvbmVkLWJlZm9yZS1kZWxpdmVyeS5wbmcnKSwgZnVsbFBhZ2U6IHRydWUgfSk7XG4gICAgfVxuICB9KTtcbn1cblxudGVzdCgnY29tcGxldGVkIHJldmlzaW9uIHN0YXlzIGluIFJlY29yZCBhZnRlciBOZXh0IGFuZCBuZWVkcyBleHBsaWNpdCBUbyByZXN1bHQgYXV0aG9yaXphdGlvbicsIGFzeW5jICh7IHBhZ2UsIGJyb3dzZXIgfSkgPT4ge1xuICB0ZXN0LnNldFRpbWVvdXQoNzVfMDAwKTtcbiAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUoeyB3aWR0aDogMTQ0MCwgaGVpZ2h0OiA5MDAgfSk7XG4gIGF3YWl0IGluc3RydW1lbnROYXRpdmVNZWRpYShwYWdlKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QSZsb2NhbGU9ZW4nKTtcbiAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT5cbiAgICB2aWRlby5yZWFkeVN0YXRlID49IEhUTUxNZWRpYUVsZW1lbnQuSEFWRV9DVVJSRU5UX0RBVEEgJiYgdmlkZW8udmlkZW9XaWR0aCA+IDApLCB7IHRpbWVvdXQ6IDE1XzAwMCB9KS50b0JlKHRydWUpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcud2F2ZWZvcm0tcm93JykpLnRvSGF2ZUF0dHJpYnV0ZSgnZGF0YS1zb3VyY2Utd2F2ZWZvcm0nLCAnZGVjb2RlZCcpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuXG4gIGZvciAoY29uc3QgdHVybiBvZiBbMSwgMiwgM10pIHtcbiAgICBhd2FpdCByZWNvcmRDdXJyZW50V2luZG93KHBhZ2UsICdBJyk7XG4gICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ05leHQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICAgIGlmICh0dXJuIDwgMykgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTChuZXcgUmVnRXhwKGB0dXJuPXNpbnRlbC10dXJuLSR7dHVybiArIDF9YCkpO1xuICB9XG5cbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvcmVzdWx0XFw/bGF5b3V0PUEmc25hcHNob3Q9Lyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5VGV4dCgnSWxsdXN0cmF0aXZlIHNhbXBsZSByZWFkeScpKS50b0JlVmlzaWJsZSh7IHRpbWVvdXQ6IDE1XzAwMCB9KTtcbiAgY29uc3QgaW5pdGlhbCA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGNvbnN0IGluaXRpYWxTbmFwc2hvdElkID0gU3RyaW5nKGluaXRpYWwucHJvamVjdD8uaW5pdGlhbFJlc3VsdFNuYXBzaG90SWQgPz8gJycpO1xuICBleHBlY3QoaW5pdGlhbFNuYXBzaG90SWQpLnRvQmVUcnV0aHkoKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAncGhhc2U0LWluaXRpYWwtcmVzdWx0LWJlZm9yZS1yZXZpc2lvbi5wbmcnKSwgZnVsbFBhZ2U6IHRydWUgfSk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JldHVybiB0byByZWNvcmRpbmcnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9cXC9yZWNvcmRcXD9sYXlvdXQ9QSZ0dXJuPXNpbnRlbC10dXJuLTEvKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZUVuYWJsZWQoKTtcbiAgY29uc3QgcmV0dXJuTG9ja3MgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgdW5rbm93biBhcyBXaW5kb3cgJiB7XG4gICAgX19sb2NrRXZpZGVuY2U6IHsgcmVxdWVzdHM6IHN0cmluZ1tdOyBjYWxsYmFja3M6IEFycmF5PCdhY3F1aXJlZCcgfCAnbnVsbCc+IH07XG4gIH0pLl9fbG9ja0V2aWRlbmNlKTtcbiAgZXhwZWN0KHJldHVybkxvY2tzLnJlcXVlc3RzKS50b0hhdmVMZW5ndGgoMik7XG4gIGV4cGVjdChyZXR1cm5Mb2Nrcy5jYWxsYmFja3MpLnRvRXF1YWwoWydhY3F1aXJlZCcsICdhY3F1aXJlZCddKTtcbiAgYXdhaXQgcmVjb3JkQ3VycmVudFdpbmRvdyhwYWdlLCAnQScpO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnTmV4dCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlKS50b0hhdmVVUkwoL1xcL3JlY29yZFxcP2xheW91dD1BJnR1cm49c2ludGVsLXR1cm4tMS8pO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1RvIHJlc3VsdCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlVmlzaWJsZSgpO1xuICBhd2FpdCBleHBlY3QocGFnZSkubm90LnRvSGF2ZVVSTCgvXFwvcmVzdWx0Lyk7XG4gIGNvbnN0IGFmdGVyUmVwbGFjZW1lbnROZXh0ID0gcGFnZS51cmwoKTtcblxuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJnR1cm49c2ludGVsLXR1cm4tMyZsb2NhbGU9ZW4nKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdUbyByZXN1bHQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAncGhhc2U0LWNvbXBsZXRlZC1yZXZpc2lvbi1sYXN0LXR1cm4ucG5nJyksIGZ1bGxQYWdlOiB0cnVlIH0pO1xuICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnVG8gcmVzdWx0JywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvcmVzdWx0XFw/bGF5b3V0PUEmc25hcHNob3Q9Lyk7XG4gIGNvbnN0IHByZXNlbnRlZFZpZGVvID0gcGFnZS5nZXRCeVRlc3RJZCgncmVzdWx0LXZpZGVvJyk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHByZXNlbnRlZFZpZGVvLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT5cbiAgICB2aWRlby5yZWFkeVN0YXRlID49IEhUTUxNZWRpYUVsZW1lbnQuSEFWRV9DVVJSRU5UX0RBVEEgJiYgdmlkZW8udmlkZW9XaWR0aCA+IDBcbiAgICAgICYmIHZpZGVvLmN1cnJlbnRTcmMuc3RhcnRzV2l0aCgnYmxvYjonKSksIHsgdGltZW91dDogMTVfMDAwIH0pLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5VGV4dCgnSWxsdXN0cmF0aXZlIHNhbXBsZSByZWFkeScpKS50b0JlVmlzaWJsZSgpO1xuXG4gIGNvbnN0IHJldmlzZWQgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICBleHBlY3QocmV2aXNlZC5zbmFwc2hvdHMpLnRvSGF2ZUxlbmd0aCgyKTtcbiAgY29uc3Qgb3JpZ2luYWxTbmFwc2hvdCA9IHJldmlzZWQuc25hcHNob3RzLmZpbmQoKHNuYXBzaG90KSA9PiBzbmFwc2hvdC5pZCA9PT0gaW5pdGlhbFNuYXBzaG90SWQpO1xuICBleHBlY3QoKG9yaWdpbmFsU25hcHNob3QgYXMgeyBhdXRob3JpemF0aW9uPzogc3RyaW5nIH0gfCB1bmRlZmluZWQpPy5hdXRob3JpemF0aW9uKS50b0JlKCdpbml0aWFsLWNvbXBsZXRpb24nKTtcbiAgY29uc3QgZXhwbGljaXRTbmFwc2hvdCA9IHJldmlzZWQuc25hcHNob3RzLmZpbmQoKHNuYXBzaG90KSA9PiBzbmFwc2hvdC5hdXRob3JpemF0aW9uID09PSAnZXhwbGljaXQtY29tcGxldGVkLXJldmlzaW9uJykgYXNcbiAgICB7IGlkOiBzdHJpbmc7IGF1dGhvcml6YXRpb246IHN0cmluZzsgdGFrZXM6IHVua25vd25bXSB9IHwgdW5kZWZpbmVkO1xuICBleHBlY3QoZXhwbGljaXRTbmFwc2hvdCkudG9CZURlZmluZWQoKTtcbiAgaWYgKCFleHBsaWNpdFNuYXBzaG90KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBleHBsaWNpdCBjb21wbGV0ZWQgcmV2aXNpb24gc25hcHNob3Qgd2FzIG5vdCBwZXJzaXN0ZWQuJyk7XG4gIGV4cGVjdChleHBsaWNpdFNuYXBzaG90LmF1dGhvcml6YXRpb24pLnRvQmUoJ2V4cGxpY2l0LWNvbXBsZXRlZC1yZXZpc2lvbicpO1xuICBleHBlY3QoZXhwbGljaXRTbmFwc2hvdC5pZCkubm90LnRvQmUoaW5pdGlhbFNuYXBzaG90SWQpO1xuICBleHBlY3QoZXhwbGljaXRTbmFwc2hvdC50YWtlcykudG9IYXZlTGVuZ3RoKDMpO1xuICBjb25zdCBwcmVzZW50ZWRNZWRpYSA9IGF3YWl0IHByZXNlbnRlZFZpZGVvLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gKHtcbiAgICBzb3VyY2U6IHZpZGVvLmRhdGFzZXQuc291cmNlLFxuICAgIGdlbmVyYXRpb25JZDogdmlkZW8uZGF0YXNldC5nZW5lcmF0aW9uSWQsXG4gICAgY3VycmVudFNyYzogdmlkZW8uY3VycmVudFNyYyxcbiAgICByZWFkeVN0YXRlOiB2aWRlby5yZWFkeVN0YXRlLFxuICAgIGN1cnJlbnRUaW1lOiB2aWRlby5jdXJyZW50VGltZSxcbiAgICBkdXJhdGlvbjogTnVtYmVyLmlzRmluaXRlKHZpZGVvLmR1cmF0aW9uKSA/IHZpZGVvLmR1cmF0aW9uIDogbnVsbCxcbiAgICBkdXJhdGlvbk1ldGFkYXRhOiB2aWRlby5kdXJhdGlvbiA9PT0gSW5maW5pdHkgPyAndW5rbm93bi11bnRpbC1lbmQnIDogTnVtYmVyLmlzTmFOKHZpZGVvLmR1cmF0aW9uKSA/ICd1bmF2YWlsYWJsZScgOiAnZmluaXRlJyxcbiAgICB3aWR0aDogdmlkZW8udmlkZW9XaWR0aCxcbiAgICBoZWlnaHQ6IHZpZGVvLnZpZGVvSGVpZ2h0LFxuICAgIHBhdXNlZDogdmlkZW8ucGF1c2VkLFxuICB9KSk7XG4gIGV4cGVjdChwcmVzZW50ZWRNZWRpYS5zb3VyY2UpLnRvQmUoJ2R1YicpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdwaGFzZTQtZXhwbGljaXQtcmV2aXNpb24tcmVzdWx0LnBuZycpLCBmdWxsUGFnZTogdHJ1ZSB9KTtcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ3BoYXNlNC1leHBsaWNpdC1yZXZpc2lvbi1icm93c2VyLWV2aWRlbmNlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICBuYXRpdmVJbnB1dDogJ0Nocm9tZSBmYWtlIG1lZGlhIGlucHV0OyBub3QgYSBwaHlzaWNhbCBtaWNyb3Bob25lJyxcbiAgICBpbml0aWFsU25hcHNob3RJZCxcbiAgICByZXZpc2VkU25hcHNob3Q6IGV4cGxpY2l0U25hcHNob3QsXG4gICAgcHJlc2VudGVkTWVkaWEsXG4gICAgY2FwdHVyZUdyYW50TGlmZWN5Y2xlOiByZXR1cm5Mb2NrcyxcbiAgICBhZnRlclJlcGxhY2VtZW50TmV4dCxcbiAgICBhdXRvbWF0aWNSZXN1bHROYXZpZ2F0aW9uQWZ0ZXJSZXBsYWNlbWVudDogZmFsc2UsXG4gICAgZXhwbGljaXRUb1Jlc3VsdENsaWNrZWQ6IHRydWUsXG4gIH0sIG51bGwsIDIpKTtcbn0pO1xuXG50ZXN0KCdhIHNlY29uZCBvcGVuIHRhYiBjYW5ub3QgY2FwdHVyZSBvciBhY2NlcHQgd2hpbGUgdGhlIGZpcnN0IHRhYiBob2xkcyB0aGUgbG9jYWwgcHJvamVjdCBncmFudCcsIGFzeW5jICh7IHBhZ2UgfSkgPT4ge1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJyk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnUmVjb3JkJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gIGNvbnN0IHNlY29uZFBhZ2UgPSBhd2FpdCBwYWdlLmNvbnRleHQoKS5uZXdQYWdlKCk7XG4gIGF3YWl0IHNlY29uZFBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUInKTtcbiAgYXdhaXQgZXhwZWN0KHNlY29uZFBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KSkudG9CZURpc2FibGVkKCk7XG4gIGF3YWl0IGV4cGVjdChzZWNvbmRQYWdlLmdldEJ5Um9sZSgnYWxlcnQnKSkudG9Db250YWluVGV4dCgnQW5vdGhlciBvcGVuIHRhYiBjdXJyZW50bHkgaG9sZHMgdGhpcyBwcm9qZWN04oCZcyBsb2NhbCByZWNvcmRpbmcgYWNjZXNzLicpO1xuICBhd2FpdCBzZWNvbmRQYWdlLmNsb3NlKCk7XG59KTtcblxudGVzdCgnZGVuaWVkIG1pY3JvcGhvbmUgcGVybWlzc2lvbiBpcyBjb250ZXh0dWFsIGFuZCBkb2VzIG5vdCBzdGFydCBNZWRpYVJlY29yZGVyJywgYXN5bmMgKHsgcGFnZSwgYnJvd3NlciB9KSA9PiB7XG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDE0NDAsIGhlaWdodDogOTAwIH0pO1xuICBhd2FpdCBwYWdlLmFkZEluaXRTY3JpcHQoKCkgPT4ge1xuICAgICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX2RlbnlNaWNyb3Bob25lPzogYm9vbGVhbiB9KS5fX2RlbnlNaWNyb3Bob25lID0gdHJ1ZTtcbiAgfSk7XG4gIGF3YWl0IGluc3RydW1lbnROYXRpdmVNZWRpYShwYWdlKTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QScpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2hlYWRpbmcnLCB7IG5hbWU6ICdTaW50ZWwgwrcgVGhlIFNlYXJjaCcgfSkpLnRvQmVWaXNpYmxlKCk7XG5cbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnU2V0dGluZ3MnLCBleGFjdDogdHJ1ZSB9KSkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ01pY3JvcGhvbmUgYWNjZXNzIHdhcyBkZW5pZWQgb3IgaW50ZXJydXB0ZWQuIFJlY29yZGluZyBkaWQgbm90IGJlZ2luJyk7XG4gIGV4cGVjdChhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpKS50b0VxdWFsKHsgZ2V0VXNlck1lZGlhQ2FsbHM6IDEsIHJlY29yZGVyU3RhcnRzOiAwIH0pO1xuICBjb25zdCBkYXRhYmFzZSA9IGF3YWl0IHJlYWRJbmRleGVkRGIocGFnZSk7XG4gIGV4cGVjdChkYXRhYmFzZS5tZWRpYS5maWx0ZXIoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLnB1cnBvc2UgPT09ICdyZWNvcmRpbmcnKSkudG9IYXZlTGVuZ3RoKDApO1xuICBjb25zdCB0b2FzdCA9IHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0Jyk7XG4gIGF3YWl0IGV4cGVjdCh0b2FzdCkudG9CZVZpc2libGUoKTtcbiAgZXhwZWN0KGF3YWl0IHRvYXN0LmdldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nKSkudG9CZSgndHJ1ZScpO1xuICBleHBlY3QoYXdhaXQgdG9hc3QuZ2V0QnlSb2xlKCdidXR0b24nKS5jb3VudCgpKS50b0JlKDApO1xuICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDEwMDApO1xuICBhd2FpdCBleHBlY3QodG9hc3QpLnRvQmVWaXNpYmxlKCk7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvclRpbWVvdXQoNjUwMCk7XG4gIGNvbnN0IHRvYXN0Qm91bmRzID0gYXdhaXQgdG9hc3QuYm91bmRpbmdCb3goKTtcbiAgZXhwZWN0KHRvYXN0Qm91bmRzKS5ub3QudG9CZU51bGwoKTtcbiAgYXdhaXQgcGFnZS5tb3VzZS5tb3ZlKHRvYXN0Qm91bmRzIS54ICsgdG9hc3RCb3VuZHMhLndpZHRoIC8gMiwgdG9hc3RCb3VuZHMhLnkgKyB0b2FzdEJvdW5kcyEuaGVpZ2h0IC8gMik7XG4gIGF3YWl0IHBhZ2Uud2FpdEZvclRpbWVvdXQoOTUwKTtcbiAgYXdhaXQgZXhwZWN0KHRvYXN0KS50b0JlVmlzaWJsZSgpO1xuICBhd2FpdCBwYWdlLm1vdXNlLm1vdmUoMjAsIDIwKTtcbiAgYXdhaXQgZXhwZWN0KHRvYXN0KS50b0hhdmVDb3VudCgwLCB7IHRpbWVvdXQ6IDE1MDAgfSk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdNaWNyb3Bob25lIGFjY2VzcyB3YXMgZGVuaWVkIG9yIGludGVycnVwdGVkLiBSZWNvcmRpbmcgZGlkIG5vdCBiZWdpbicpO1xuXG4gIGF3YWl0IHBhZ2UuZW11bGF0ZU1lZGlhKHsgcmVkdWNlZE1vdGlvbjogJ3JlZHVjZScgfSk7XG4gIGF3YWl0IHBhZ2UucmVsb2FkKCk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3ZlcnktdG9hc3QnKSkudG9CZVZpc2libGUoKTtcbiAgY29uc3QgcmVkdWNlZE1vdGlvblRyYW5zaXRpb25TZWNvbmRzID0gYXdhaXQgcGFnZS5sb2NhdG9yKCcucmVjb3ZlcnktdG9hc3QnKS5ldmFsdWF0ZSgoZWxlbWVudCkgPT5cbiAgICBOdW1iZXIucGFyc2VGbG9hdChnZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQpLnRyYW5zaXRpb25EdXJhdGlvbi5zcGxpdCgnLCcpWzBdID8/ICcxJykpO1xuICBleHBlY3QocmVkdWNlZE1vdGlvblRyYW5zaXRpb25TZWNvbmRzKS50b0JlTGVzc1RoYW4oMC4wMDEpO1xuICBhd2FpdCBwYWdlLm1vdXNlLndoZWVsKDAsIDEwMCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvdmVyeS10b2FzdCcpKS50b0hhdmVDb3VudCgwLCB7IHRpbWVvdXQ6IDFfMDAwIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnTWljcm9waG9uZSBhY2Nlc3Mgd2FzIGRlbmllZCBvciBpbnRlcnJ1cHRlZC4gUmVjb3JkaW5nIGRpZCBub3QgYmVnaW4nKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1NldHRpbmdzJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UpLnRvSGF2ZVVSTCgvXFwvc2V0dGluZ3NcXC9taWNyb3Bob25lXFw/Lyk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlUZXN0SWQoJ3JldHVybi10by1zYXZlZC1yZWNvcmQnKS5jbGljaygpO1xuICBhd2FpdCBleHBlY3QocGFnZSkudG9IYXZlVVJMKC9yZXR1cm5Gb2N1cz1zZXR0aW5ncy8pO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCdbZGF0YS1sb2dpY2FsLWZvY3VzPVwic2V0dGluZ3NcIl0nKSkudG9CZUZvY3VzZWQoKTtcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ3Blcm1pc3Npb24tZGVuaWVkLWJyb3dzZXItZXZpZGVuY2UuanNvbicpLCBKU09OLnN0cmluZ2lmeSh7XG4gICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgIGJyb3dzZXI6IGBDaHJvbWUgJHticm93c2VyLnZlcnNpb24oKX1gLFxuICAgIHBlcm1pc3Npb246ICd0ZXN0IGhhcm5lc3MgcmVqZWN0ZWQgZ2V0VXNlck1lZGlhIHdpdGggTm90QWxsb3dlZEVycm9yOyBicm93c2VyIHBlcm1pc3Npb24gVUkgd2FzIG5vdCBleGVyY2lzZWQnLFxuICAgIG5hdGl2ZUFwaUV2aWRlbmNlOiBhd2FpdCBldmlkZW5jZUNvdW50ZXJzKHBhZ2UpLFxuICAgIHNhdmVkUmVjb3JkaW5nQ291bnQ6IGRhdGFiYXNlLm1lZGlhLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUucHVycG9zZSA9PT0gJ3JlY29yZGluZycpLmxlbmd0aCxcbiAgICBzZXR0aW5nc0JvdW5kYXJ5QXZhaWxhYmxlOiBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnU2V0dGluZ3MnLCBleGFjdDogdHJ1ZSB9KS5pc1Zpc2libGUoKSxcbiAgICBzZXR0aW5nc0JvdW5kYXJ5UmV0dXJuRm9jdXM6IGF3YWl0IHBhZ2UubG9jYXRvcignW2RhdGEtbG9naWNhbC1mb2N1cz1cInNldHRpbmdzXCJdJykuZXZhbHVhdGUoKGVsZW1lbnQpID0+IGVsZW1lbnQgPT09IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpLFxuICAgIHJlY292ZXJ5VG9hc3Q6ICdtZXNzYWdlIG9ubHkgYW5kIGFyaWEtaGlkZGVuOyA4IHNlY29uZCByZWFkIGludGVydmFsOyBkZWxpYmVyYXRlIGhvdmVyIHBhdXNlOyByZWR1Y2VkIG1vdGlvbjsgbWFudWFsIHdoZWVsIGRpc21pc3NhbDsgZHVyYWJsZSBlcnJvciByZXRhaW5lZCcsXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xufSk7XG5cbnRlc3QoJ2Jyb3dzZXIgbGlmZWN5Y2xlIGludGVycnVwdGlvbiBzYXZlcyBvbmx5IGEgdXNhYmxlIG5hdGl2ZSBwYXJ0aWFsIGFuZCBjYW5jZWxzIHBlbmRpbmcgaW5wdXQgc2FmZWx5JywgYXN5bmMgKHsgcGFnZSwgYnJvd3NlciB9KSA9PiB7XG4gIHRlc3Quc2V0VGltZW91dCg0NV8wMDApO1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgYXdhaXQgaW5zdHJ1bWVudE5hdGl2ZU1lZGlhKHBhZ2UpO1xuICBhd2FpdCBwYWdlLmdvdG8oJy9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD1BJmxvY2FsZT1lbicpO1xuICBhd2FpdCBleHBlY3QocGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICBhd2FpdCB0cmFjZU5leHROYXRpdmVCbG9iRGlnZXN0KHBhZ2UpO1xuXG4gIGNvbnN0IHJlYWRQcmVwYXJlZER1cmF0aW9uID0gYXN5bmMgKCkgPT4gcGFnZS5ldmFsdWF0ZShhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCBuZXcgUHJvbWlzZTxJREJEYXRhYmFzZT4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgY29uc3QgcmVxdWVzdCA9IGluZGV4ZWREQi5vcGVuKCdkdWJiZWQtY29yZS1sb2NhbC12MScpO1xuICAgICAgcmVxdWVzdC5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcXVlc3QucmVzdWx0KTtcbiAgICAgIHJlcXVlc3Qub25lcnJvciA9ICgpID0+IHJlamVjdChyZXF1ZXN0LmVycm9yKTtcbiAgICB9KTtcbiAgICBjb25zdCBwcm9qZWN0ID0gYXdhaXQgbmV3IFByb21pc2U8eyB3aW5kb3dzOiBBcnJheTx7IGlkOiBzdHJpbmc7IHN0YXJ0TXM6IG51bWJlcjsgZW5kTXM6IG51bWJlciB9PiB9PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXF1ZXN0ID0gZGF0YWJhc2UudHJhbnNhY3Rpb24oJ3Byb2plY3RzJywgJ3JlYWRvbmx5Jykub2JqZWN0U3RvcmUoJ3Byb2plY3RzJykuZ2V0KCdzaW50ZWwtcHJlcGFyZWQnKTtcbiAgICAgIHJlcXVlc3Qub25zdWNjZXNzID0gKCkgPT4gcmVzb2x2ZShyZXF1ZXN0LnJlc3VsdCBhcyB7IHdpbmRvd3M6IEFycmF5PHsgaWQ6IHN0cmluZzsgc3RhcnRNczogbnVtYmVyOyBlbmRNczogbnVtYmVyIH0+IH0pO1xuICAgICAgcmVxdWVzdC5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcXVlc3QuZXJyb3IpO1xuICAgIH0pO1xuICAgIGRhdGFiYXNlLmNsb3NlKCk7XG4gICAgY29uc3Qgd2luZG93ID0gcHJvamVjdC53aW5kb3dzLmZpbmQoKGl0ZW0pID0+IGl0ZW0uaWQgPT09ICdzaW50ZWwtdHVybi0xJyk7XG4gICAgaWYgKCF3aW5kb3cpIHRocm93IG5ldyBFcnJvcignUHJlcGFyZWQgdHVybiAxIGhhcyBubyBzb3VyY2Ugd2luZG93LicpO1xuICAgIHJldHVybiB3aW5kb3cuZW5kTXMgLSB3aW5kb3cuc3RhcnRNcztcbiAgfSk7XG4gIGNvbnN0IHByZXBhcmVkRHVyYXRpb25NcyA9IGF3YWl0IHJlYWRQcmVwYXJlZER1cmF0aW9uKCk7XG4gIGNvbnN0IGN1cnJlbnRDYW5kaWRhdGUgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgZGF0YWJhc2UgPSBhd2FpdCByZWFkSW5kZXhlZERiKHBhZ2UpO1xuICAgIGNvbnN0IGRyYWZ0QnlUdXJuID0gZGF0YWJhc2UucHJvamVjdD8uZHJhZnRDYW5kaWRhdGVCeVR1cm4gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IHVuZGVmaW5lZDtcbiAgICBjb25zdCBjYW5kaWRhdGVJZCA9IGRyYWZ0QnlUdXJuPy5bJ3NpbnRlbC10dXJuLTEnXTtcbiAgICByZXR1cm4geyBkYXRhYmFzZSwgY2FuZGlkYXRlOiBkYXRhYmFzZS5tZWRpYS5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gY2FuZGlkYXRlSWQpIH07XG4gIH07XG4gIGNvbnN0IHBhbmVsQm91bmRzID0gYXN5bmMgKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgIG1lZGlhOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcubWVkaWEtdmlld3BvcnQnKSEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9KU09OKCksXG4gICAgcGFuZWw6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5yZWNvcmQtcGFuZWwnKSEuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9KU09OKCksXG4gIH0pKTtcbiAgY29uc3QgZXhwZWN0UGFuZWxBbGlnbmVkID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGJvdW5kcyA9IGF3YWl0IHBhbmVsQm91bmRzKCk7XG4gICAgZXhwZWN0KE1hdGguYWJzKGJvdW5kcy5wYW5lbC55IC0gYm91bmRzLm1lZGlhLnkpKS50b0JlTGVzc1RoYW5PckVxdWFsKDEpO1xuICAgIHJldHVybiBib3VuZHM7XG4gIH07XG4gIGNvbnN0IHNldE1vZGVsZWRWaXNpYmlsaXR5ID0gYXN5bmMgKGhpZGRlbjogYm9vbGVhbikgPT4gcGFnZS5ldmFsdWF0ZSgoaXNIaWRkZW4pID0+IHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZG9jdW1lbnQsICdoaWRkZW4nLCB7IGNvbmZpZ3VyYWJsZTogdHJ1ZSwgdmFsdWU6IGlzSGlkZGVuIH0pO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkb2N1bWVudCwgJ3Zpc2liaWxpdHlTdGF0ZScsIHsgY29uZmlndXJhYmxlOiB0cnVlLCB2YWx1ZTogaXNIaWRkZW4gPyAnaGlkZGVuJyA6ICd2aXNpYmxlJyB9KTtcbiAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgndmlzaWJpbGl0eWNoYW5nZScpKTtcbiAgICBpZiAoaXNIaWRkZW4pIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBFdmVudCgncGFnZWhpZGUnKSk7XG4gICAgZWxzZSB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoJ3BhZ2VzaG93JykpO1xuICB9LCBoaWRkZW4pO1xuICBjb25zdCBzYXZlTGlmZWN5Y2xlUGFydGlhbCA9IGFzeW5jIChleHBlY3RlZFJlY29yZGVyU3RhcnRzOiBudW1iZXIsIHNjcmVlbnNob3ROYW1lOiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtYWN0aW9uJykuY2xpY2soKTtcbiAgICBhd2FpdCBleHBlY3QucG9sbChhc3luYyAoKSA9PiAoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkucmVjb3JkZXJTdGFydHMpLnRvQmUoZXhwZWN0ZWRSZWNvcmRlclN0YXJ0cyk7XG4gICAgY29uc3QgY2FwdHVyaW5nQm91bmRzID0gYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBgJHtzY3JlZW5zaG90TmFtZX0tY2FwdHVyaW5nLnBuZ2ApIH0pO1xuICAgIGF3YWl0IHBhZ2Uud2FpdEZvclRpbWVvdXQoOTAwKTtcbiAgICBhd2FpdCBzZXRNb2RlbGVkVmlzaWJpbGl0eSh0cnVlKTtcbiAgICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnaW50ZXJydXB0ZWQgcmVjb3JkaW5nIHdpdGggdXNhYmxlIGF1ZGlvIHdhcyBzYXZlZCBhcyBhIGNhbmRpZGF0ZScsIHsgdGltZW91dDogMTVfMDAwIH0pO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAnWW91ciB0YWtlJywgZXhhY3Q6IHRydWUgfSkpLnRvQmVFbmFibGVkKCk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBjb25zdCBzYXZlZEJvdW5kcyA9IGF3YWl0IGV4cGVjdFBhbmVsQWxpZ25lZCgpO1xuICAgIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYCR7c2NyZWVuc2hvdE5hbWV9LXBhcnRpYWwtc2F2ZWQucG5nYCkgfSk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIFdpbmRvdyAmIHsgX19uYXRpdmVCbG9iRGlnZXN0VHJhY2U/OiB7IHNoYTI1Njogc3RyaW5nIHwgbnVsbCB9IH0pLl9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlPy5zaGEyNTYpKVxuICAgICAgLnRvTWF0Y2goL15bYS1mMC05XXs2NH0kLyk7XG4gICAgY29uc3QgZGlnZXN0ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAod2luZG93IGFzIFdpbmRvdyAmIHtcbiAgICAgIF9fbmF0aXZlQmxvYkRpZ2VzdFRyYWNlPzogeyBjYXB0dXJlczogbnVtYmVyOyBieXRlU2l6ZTogbnVtYmVyOyBtaW1lVHlwZTogc3RyaW5nOyBzaGEyNTY6IHN0cmluZyB8IG51bGwgfTtcbiAgICB9KS5fX25hdGl2ZUJsb2JEaWdlc3RUcmFjZSk7XG4gICAgZXhwZWN0KGRpZ2VzdCkudG9CZURlZmluZWQoKTtcbiAgICBpZiAoIWRpZ2VzdCkgdGhyb3cgbmV3IEVycm9yKCdUaGUgbmF0aXZlIE1lZGlhUmVjb3JkZXIgYnl0ZSBkaWdlc3Qgd2FzIG5vdCBvYnNlcnZlZC4nKTtcbiAgICBjb25zdCB7IGRhdGFiYXNlLCBjYW5kaWRhdGUgfSA9IGF3YWl0IGN1cnJlbnRDYW5kaWRhdGUoKTtcbiAgICBjb25zdCBwcm9iZSA9IGNhbmRpZGF0ZT8ucHJvYmUgYXMgeyBkZWNvZGVkRnJhbWVzPzogbnVtYmVyIHwgbnVsbDsgZHVyYXRpb25TZWNvbmRzPzogbnVtYmVyIHwgbnVsbDsgZGVjb2RlU3RhdHVzPzogc3RyaW5nIH0gfCB1bmRlZmluZWQ7XG4gICAgZXhwZWN0KGNhbmRpZGF0ZT8uZW5kUmVhc29uKS50b0JlKCdpbnRlcnJ1cHRlZCcpO1xuICAgIGV4cGVjdChjYW5kaWRhdGU/LmJsb2JTaXplKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgZXhwZWN0KGNhbmRpZGF0ZT8uYmxvYlNpemUpLnRvQmUoY2FuZGlkYXRlPy5ieXRlU2l6ZSk7XG4gICAgZXhwZWN0KGNhbmRpZGF0ZT8uc2hhMjU2KS50b0JlKGRpZ2VzdC5zaGEyNTYpO1xuICAgIGV4cGVjdChjYW5kaWRhdGU/LmJ5dGVTaXplKS50b0JlKGRpZ2VzdC5ieXRlU2l6ZSk7XG4gICAgZXhwZWN0KHByb2JlPy5kZWNvZGVkRnJhbWVzKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgZXhwZWN0KHByb2JlPy5kdXJhdGlvblNlY29uZHMpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICBleHBlY3QocHJvYmU/LmR1cmF0aW9uU2Vjb25kcyA/PyBJbmZpbml0eSkudG9CZUxlc3NUaGFuKHByZXBhcmVkRHVyYXRpb25NcyAvIDEwMDApO1xuICAgIGV4cGVjdChPYmplY3QudmFsdWVzKGRhdGFiYXNlLnByb2plY3Q/LmFjY2VwdGVkQnlUdXJuIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPz8ge30pKS50b0hhdmVMZW5ndGgoMCk7XG4gICAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgYCR7c2NyZWVuc2hvdE5hbWV9LWV2aWRlbmNlLmpzb25gKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgZGF0ZTogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgICBpbnB1dDogJ0Nocm9tZSBicm93c2VyIGZha2UgYXVkaW8gaW5wdXQ7IG5vdCBhIHBoeXNpY2FsIG1pY3JvcGhvbmUnLFxuICAgICAgbGlmZWN5Y2xlOiAnbW9kZWxlZCBkb2N1bWVudC5oaWRkZW4vdmlzaWJpbGl0eWNoYW5nZSBhbmQgcGFnZWhpZGUgZXZlbnRzJyxcbiAgICAgIHByZXBhcmVkRHVyYXRpb25NcyxcbiAgICAgIG5hdGl2ZUJsb2I6IGRpZ2VzdCxcbiAgICAgIHBlcnNpc3RlZENhbmRpZGF0ZTogY2FuZGlkYXRlLFxuICAgICAgc291cmNlVmlkZW9QYXVzZWRBZnRlckludGVycnVwdGlvbjogYXdhaXQgcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8ucGF1c2VkKSxcbiAgICAgIHBhbmVsRHVyaW5nQ2FwdHVyZTogY2FwdHVyaW5nQm91bmRzLFxuICAgICAgcGFuZWxBZnRlclNhdmU6IHNhdmVkQm91bmRzLFxuICAgIH0sIG51bGwsIDIpLCAndXRmOCcpO1xuICAgIGF3YWl0IHNldE1vZGVsZWRWaXNpYmlsaXR5KGZhbHNlKTtcbiAgICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KDI1MCk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gcGFnZS5sb2NhdG9yKCd2aWRlbycpLmV2YWx1YXRlKCh2aWRlbzogSFRNTFZpZGVvRWxlbWVudCkgPT4gdmlkZW8ucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICByZXR1cm4gY2FuZGlkYXRlO1xuICB9O1xuXG4gIGNvbnN0IG5vcm1hbEJvdW5kcyA9IGF3YWl0IGV4cGVjdFBhbmVsQWxpZ25lZCgpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdJUjEyLUEtcmVjb3JkLW5vcm1hbC0xNDQweDkwMC5wbmcnKSB9KTtcbiAgY29uc3QgZmlyc3RQYXJ0aWFsID0gYXdhaXQgc2F2ZUxpZmVjeWNsZVBhcnRpYWwoMSwgJ0lSMTEtcGFydGlhbC0xNDQweDkwMCcpO1xuXG4gIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDEyODAsIGhlaWdodDogNjAwIH0pO1xuICBjb25zdCBzaG9ydFNhdmVkQm91bmRzID0gYXdhaXQgZXhwZWN0UGFuZWxBbGlnbmVkKCk7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMTItQS1yZWNvcmQtc2F2ZWQtMTI4MHg2MDAucG5nJykgfSk7XG4gIGNvbnN0IHNlY29uZFBhcnRpYWwgPSBhd2FpdCBzYXZlTGlmZWN5Y2xlUGFydGlhbCgyLCAnSVIxMS1wYXJ0aWFsLTEyODB4NjAwJyk7XG5cbiAgYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgdHlwZSBTZXJ2aWNlTWVkaWEgPSB7IGNhcHR1cmVGaXhlZFdpbmRvdzogKC4uLmFyZ3M6IHVua25vd25bXSkgPT4gUHJvbWlzZTx1bmtub3duPiB9O1xuICAgIHR5cGUgU2VydmljZXMgPSB7IG1lZGlhOiBTZXJ2aWNlTWVkaWEgfTtcbiAgICB0eXBlIEZpYmVyID0geyBhbHRlcm5hdGU/OiB1bmtub3duOyBjaGlsZD86IHVua25vd247IHNpYmxpbmc/OiB1bmtub3duOyBtZW1vaXplZFByb3BzPzogdW5rbm93biB9O1xuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIChIVE1MRWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8IG51bGw7XG4gICAgaWYgKCFyb290KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBSZWFjdCByb290IGlzIHVuYXZhaWxhYmxlIGZvciB0aGUgdW51c2FibGUtcGFydGlhbCBjaGVjay4nKTtcbiAgICBjb25zdCByb290S2V5ID0gT2JqZWN0LmtleXMocm9vdCkuZmluZCgoa2V5KSA9PiBrZXkuc3RhcnRzV2l0aCgnX19yZWFjdENvbnRhaW5lciQnKSk7XG4gICAgaWYgKCFyb290S2V5KSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBhY3RpdmUgUmVhY3Qgcm9vdCBmaWJlciBpcyB1bmF2YWlsYWJsZS4nKTtcbiAgICBjb25zdCBwZW5kaW5nOiB1bmtub3duW10gPSBbcm9vdFtyb290S2V5XV07XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8dW5rbm93bj4oKTtcbiAgICBsZXQgc2VydmljZXM6IFNlcnZpY2VzIHwgbnVsbCA9IG51bGw7XG4gICAgd2hpbGUgKHBlbmRpbmcubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgZmliZXIgPSBwZW5kaW5nLnBvcCgpIGFzIEZpYmVyIHwgbnVsbDtcbiAgICAgIGlmICghZmliZXIgfHwgc2Vlbi5oYXMoZmliZXIpKSBjb250aW51ZTtcbiAgICAgIHNlZW4uYWRkKGZpYmVyKTtcbiAgICAgIGlmIChmaWJlci5hbHRlcm5hdGUpIHBlbmRpbmcucHVzaChmaWJlci5hbHRlcm5hdGUpO1xuICAgICAgY29uc3QgcHJvcHMgPSBmaWJlci5tZW1vaXplZFByb3BzIGFzIHsgc2VydmljZXM/OiBTZXJ2aWNlcyB9IHwgbnVsbDtcbiAgICAgIGlmIChwcm9wcz8uc2VydmljZXM/Lm1lZGlhKSBzZXJ2aWNlcyA9IHByb3BzLnNlcnZpY2VzO1xuICAgICAgaWYgKGZpYmVyLmNoaWxkKSBwZW5kaW5nLnB1c2goZmliZXIuY2hpbGQpO1xuICAgICAgaWYgKGZpYmVyLnNpYmxpbmcpIHBlbmRpbmcucHVzaChmaWJlci5zaWJsaW5nKTtcbiAgICB9XG4gICAgaWYgKCFzZXJ2aWNlcykgdGhyb3cgbmV3IEVycm9yKCdUaGUgYWN0aXZlIHR5cGVkIEJyb3dzZXJNZWRpYVBvcnQgd2FzIG5vdCBmb3VuZC4nKTtcbiAgICBjb25zdCBvcmlnaW5hbCA9IHNlcnZpY2VzLm1lZGlhLmNhcHR1cmVGaXhlZFdpbmRvdy5iaW5kKHNlcnZpY2VzLm1lZGlhKTtcbiAgICBsZXQgcmV0dXJuVW51c2FibGVPbmNlID0gdHJ1ZTtcbiAgICBzZXJ2aWNlcy5tZWRpYS5jYXB0dXJlRml4ZWRXaW5kb3cgPSBhc3luYyAoLi4uYXJncykgPT4ge1xuICAgICAgY29uc3QgaW5wdXQgPSBhcmdzWzBdIGFzIHsgcHVycG9zZT86IHN0cmluZyB9IHwgdW5kZWZpbmVkO1xuICAgICAgaWYgKGlucHV0Py5wdXJwb3NlID09PSAncmVjb3JkaW5nJyAmJiByZXR1cm5VbnVzYWJsZU9uY2UpIHtcbiAgICAgICAgcmV0dXJuVW51c2FibGVPbmNlID0gZmFsc2U7XG4gICAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcHVycG9zZTogJ3JlY29yZGluZycsXG4gICAgICAgICAgYmxvYjogbmV3IEJsb2IoW25ldyBVaW50OEFycmF5KFsxLCAyLCAzXSldLCB7IHR5cGU6ICdhdWRpby93ZWJtJyB9KSxcbiAgICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dlYm0nLFxuICAgICAgICAgIHN0YXJ0ZWRBdDogbm93IC0gNTAsXG4gICAgICAgICAgc3RvcHBlZEF0OiBub3csXG4gICAgICAgICAgZWxhcHNlZE1zOiA1MCxcbiAgICAgICAgICBlbmRSZWFzb246ICdpbnRlcnJ1cHRlZCcsXG4gICAgICAgICAgcHJvYmU6IHsgbWltZVR5cGU6ICdhdWRpby93ZWJtJywgYnl0ZVNpemU6IDMsIGR1cmF0aW9uU2Vjb25kczogbnVsbCwgZGVjb2RlZEZyYW1lczogbnVsbCxcbiAgICAgICAgICAgIGNoYW5uZWxDb3VudDogbnVsbCwgc2FtcGxlUmF0ZTogbnVsbCwgZGVjb2RlU3RhdHVzOiAndW5hdmFpbGFibGUnLCB3YXZlZm9ybVBlYWtzOiBbXSB9LFxuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9yaWdpbmFsKC4uLmFyZ3MpO1xuICAgIH07XG4gIH0pO1xuICBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtYWN0aW9uJykuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ1JlY29yZGluZyBjb3VsZCBub3QgZmluaXNoLiBBbnkgZWFybGllciBjYW5kaWRhdGUgYW5kIGFjY2VwdGVkIHRha2UgcmVtYWluIHVuY2hhbmdlZC4nKTtcbiAgY29uc3QgYWZ0ZXJVbnVzYWJsZSA9IGF3YWl0IGN1cnJlbnRDYW5kaWRhdGUoKTtcbiAgZXhwZWN0KGFmdGVyVW51c2FibGUuY2FuZGlkYXRlPy5pZCkudG9CZShzZWNvbmRQYXJ0aWFsPy5pZCk7XG4gIGV4cGVjdChhZnRlclVudXNhYmxlLmNhbmRpZGF0ZT8uc2hhMjU2KS50b0JlKHNlY29uZFBhcnRpYWw/LnNoYTI1Nik7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMTEtdW51c2FibGUtcGFydGlhbC1wcmVzZXJ2ZXMtY2FuZGlkYXRlLnBuZycpIH0pO1xuXG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4geyAod2luZG93IGFzIFdpbmRvdyAmIHsgX19kZW55TWljcm9waG9uZT86IGJvb2xlYW4gfSkuX19kZW55TWljcm9waG9uZSA9IHRydWU7IH0pO1xuICBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtYWN0aW9uJykuY2xpY2soKTtcbiAgYXdhaXQgZXhwZWN0KHBhZ2UubG9jYXRvcignLnJlY29yZC1wYW5lbCAubm90aWNlJykpLnRvQ29udGFpblRleHQoJ01pY3JvcGhvbmUgYWNjZXNzIHdhcyBkZW5pZWQgb3IgaW50ZXJydXB0ZWQuIFJlY29yZGluZyBkaWQgbm90IGJlZ2luJyk7XG4gIGNvbnN0IGFmdGVyRGVuaWVkID0gYXdhaXQgY3VycmVudENhbmRpZGF0ZSgpO1xuICBleHBlY3QoYWZ0ZXJEZW5pZWQuY2FuZGlkYXRlPy5pZCkudG9CZShzZWNvbmRQYXJ0aWFsPy5pZCk7XG4gIGV4cGVjdChhZnRlckRlbmllZC5jYW5kaWRhdGU/LnNoYTI1NikudG9CZShzZWNvbmRQYXJ0aWFsPy5zaGEyNTYpO1xuXG4gIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4ge1xuICAgIHR5cGUgUGVuZGluZ0NhcHR1cmUgPSB7IHN0cmVhbTogTWVkaWFTdHJlYW0gfCBudWxsOyByZWxlYXNlOiAoKCkgPT4gdm9pZCkgfCBudWxsIH07XG4gICAgY29uc3QgdGFyZ2V0ID0gd2luZG93IGFzIFdpbmRvdyAmIHsgX19kZW55TWljcm9waG9uZT86IGJvb2xlYW47IF9fcGVuZGluZ0dldFVzZXJNZWRpYT86IFBlbmRpbmdDYXB0dXJlIH07XG4gICAgdGFyZ2V0Ll9fZGVueU1pY3JvcGhvbmUgPSBmYWxzZTtcbiAgICBjb25zdCBtZWRpYURldmljZXMgPSBuYXZpZ2F0b3IubWVkaWFEZXZpY2VzO1xuICAgIGNvbnN0IG9yaWdpbmFsID0gbWVkaWFEZXZpY2VzLmdldFVzZXJNZWRpYS5iaW5kKG1lZGlhRGV2aWNlcyk7XG4gICAgY29uc3QgcGVuZGluZzogUGVuZGluZ0NhcHR1cmUgPSB7IHN0cmVhbTogbnVsbCwgcmVsZWFzZTogbnVsbCB9O1xuICAgIHRhcmdldC5fX3BlbmRpbmdHZXRVc2VyTWVkaWEgPSBwZW5kaW5nO1xuICAgIG1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEgPSBhc3luYyAoLi4uYXJnczogUGFyYW1ldGVyczxNZWRpYURldmljZXNbJ2dldFVzZXJNZWRpYSddPikgPT4ge1xuICAgICAgY29uc3Qgc3RyZWFtID0gYXdhaXQgb3JpZ2luYWwoLi4uYXJncyk7XG4gICAgICBwZW5kaW5nLnN0cmVhbSA9IHN0cmVhbTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlKSA9PiB7IHBlbmRpbmcucmVsZWFzZSA9IHJlc29sdmU7IH0pO1xuICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICB9O1xuICB9KTtcbiAgYXdhaXQgcGFnZS5sb2NhdG9yKCcucmVjb3JkLWFjdGlvbicpLmNsaWNrKCk7XG4gIGF3YWl0IGV4cGVjdC5wb2xsKCgpID0+IHBhZ2UuZXZhbHVhdGUoKCkgPT4gQm9vbGVhbigod2luZG93IGFzIFdpbmRvdyAmIHsgX19wZW5kaW5nR2V0VXNlck1lZGlhPzogeyBzdHJlYW06IE1lZGlhU3RyZWFtIHwgbnVsbCB9IH0pLl9fcGVuZGluZ0dldFVzZXJNZWRpYT8uc3RyZWFtKSkpLnRvQmUodHJ1ZSk7XG4gIGF3YWl0IHNldE1vZGVsZWRWaXNpYmlsaXR5KHRydWUpO1xuICBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+IHtcbiAgICBjb25zdCBwZW5kaW5nID0gKHdpbmRvdyBhcyBXaW5kb3cgJiB7IF9fcGVuZGluZ0dldFVzZXJNZWRpYT86IHsgcmVsZWFzZTogKCgpID0+IHZvaWQpIHwgbnVsbCB9IH0pLl9fcGVuZGluZ0dldFVzZXJNZWRpYTtcbiAgICBpZiAoIXBlbmRpbmc/LnJlbGVhc2UpIHRocm93IG5ldyBFcnJvcignVGhlIGRlbGF5ZWQgbWljcm9waG9uZSByZXN1bHQgaXMgdW5hdmFpbGFibGUuJyk7XG4gICAgcGVuZGluZy5yZWxlYXNlKCk7XG4gIH0pO1xuICBhd2FpdCBleHBlY3QocGFnZS5sb2NhdG9yKCcucmVjb3JkLXBhbmVsIC5ub3RpY2UnKSkudG9Db250YWluVGV4dCgnUmVjb3JkaW5nIGNvdWxkIG5vdCBmaW5pc2guJywgeyB0aW1lb3V0OiAxMF8wMDAgfSk7XG4gIGNvbnN0IHBlbmRpbmdUcmFja3MgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh3aW5kb3cgYXMgV2luZG93ICYgeyBfX3BlbmRpbmdHZXRVc2VyTWVkaWE/OiB7IHN0cmVhbTogTWVkaWFTdHJlYW0gfCBudWxsIH0gfSlcbiAgICAuX19wZW5kaW5nR2V0VXNlck1lZGlhPy5zdHJlYW0/LmdldFRyYWNrcygpLm1hcCgodHJhY2spID0+IHRyYWNrLnJlYWR5U3RhdGUpID8/IFtdKTtcbiAgZXhwZWN0KHBlbmRpbmdUcmFja3MubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gIGV4cGVjdChwZW5kaW5nVHJhY2tzLmV2ZXJ5KChzdGF0ZSkgPT4gc3RhdGUgPT09ICdlbmRlZCcpKS50b0JlKHRydWUpO1xuICBleHBlY3QoYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSkudG9FcXVhbCh7IGdldFVzZXJNZWRpYUNhbGxzOiA0LCByZWNvcmRlclN0YXJ0czogMiB9KTtcbiAgY29uc3QgYWZ0ZXJQZW5kaW5nQ2FuY2VsID0gYXdhaXQgY3VycmVudENhbmRpZGF0ZSgpO1xuICBleHBlY3QoYWZ0ZXJQZW5kaW5nQ2FuY2VsLmNhbmRpZGF0ZT8uaWQpLnRvQmUoc2Vjb25kUGFydGlhbD8uaWQpO1xuICBleHBlY3QoYWZ0ZXJQZW5kaW5nQ2FuY2VsLmNhbmRpZGF0ZT8uc2hhMjU2KS50b0JlKHNlY29uZFBhcnRpYWw/LnNoYTI1Nik7XG4gIGF3YWl0IHBhZ2Uuc2NyZWVuc2hvdCh7IHBhdGg6IHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMTEtcHJlcGFyaW5nLWhpZGRlbi1jYW5jZWwtcHJlc2VydmVzLWNhbmRpZGF0ZS5wbmcnKSB9KTtcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMTEtSVIxMi1saWZlY3ljbGUtYW5kLXBhbmVsLWV2aWRlbmNlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICBmaXJzdFBhcnRpYWxDYW5kaWRhdGVJZDogZmlyc3RQYXJ0aWFsPy5pZCxcbiAgICBsYXRlc3RQYXJ0aWFsQ2FuZGlkYXRlSWQ6IHNlY29uZFBhcnRpYWw/LmlkLFxuICAgIHVudXNhYmxlUGFydGlhbFByZXNlcnZlZExhdGVzdENhbmRpZGF0ZTogYWZ0ZXJVbnVzYWJsZS5jYW5kaWRhdGU/LmlkID09PSBzZWNvbmRQYXJ0aWFsPy5pZCxcbiAgICBkZW5pZWRQZXJtaXNzaW9uUHJlc2VydmVkTGF0ZXN0Q2FuZGlkYXRlOiBhZnRlckRlbmllZC5jYW5kaWRhdGU/LmlkID09PSBzZWNvbmRQYXJ0aWFsPy5pZCxcbiAgICBwcmVwYXJpbmdIaWRkZW5TdG9wcGVkVHJhY2tzOiBwZW5kaW5nVHJhY2tzLFxuICAgIHByZXBhcmluZ0hpZGRlblByZXNlcnZlZExhdGVzdENhbmRpZGF0ZTogYWZ0ZXJQZW5kaW5nQ2FuY2VsLmNhbmRpZGF0ZT8uaWQgPT09IHNlY29uZFBhcnRpYWw/LmlkLFxuICAgIG5vcm1hbDE0NDB4OTAwOiBub3JtYWxCb3VuZHMsXG4gICAgc2F2ZWQxMjgweDYwMDogc2hvcnRTYXZlZEJvdW5kcyxcbiAgICBhcGlDb3VudGVyczogYXdhaXQgZXZpZGVuY2VDb3VudGVycyhwYWdlKSxcbiAgICBwaHlzaWNhbE1pY3JvcGhvbmVPckRldmljZUJhY2tncm91bmRUZXN0ZWQ6IGZhbHNlLFxuICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbn0pO1xuXG50ZXN0KCdSZWNvcmQgc2VlayBjYW5jZWxsYXRpb24gYW5kIGJsdXIga2VlcCBib3RoIGF1ZGl0aW9uIHNvdXJjZXMgcGF1c2VkJywgYXN5bmMgKHsgcGFnZSB9KSA9PiB7XG4gIHRlc3Quc2V0VGltZW91dCgzMF8wMDApO1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAxNDQwLCBoZWlnaHQ6IDkwMCB9KTtcbiAgYXdhaXQgcGFnZS5nb3RvKCcvcHJvamVjdHMvc2ludGVsLXByZXBhcmVkL3JlY29yZD9sYXlvdXQ9QSZsb2NhbGU9ZW4nKTtcbiAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1JlY29yZCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IHdhaXRGb3JTYXZlZENhbmRpZGF0ZShwYWdlLCAnQScpO1xuICBjb25zdCBzZWVrID0gcGFnZS5sb2NhdG9yKCcucmVjb3JkLXNlZWsnKTtcbiAgY29uc3QgdmlkZW8gPSBwYWdlLmxvY2F0b3IoJ3ZpZGVvJyk7XG4gIGNvbnN0IGF1ZGlvID0gcGFnZS5sb2NhdG9yKCdhdWRpbycpO1xuXG4gIGZvciAoY29uc3Qgc291cmNlIG9mIFsnT3JpZ2luYWwnLCAnWW91ciB0YWtlJ10pIHtcbiAgICBhd2FpdCBwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiBzb3VyY2UsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gICAgYXdhaXQgcGFnZS5nZXRCeVJvbGUoJ2J1dHRvbicsIHsgbmFtZTogJ1BhdXNlJywgZXhhY3Q6IHRydWUgfSkuY2xpY2soKTtcbiAgICBjb25zdCBib3VuZHMgPSBhd2FpdCBzZWVrLmJvdW5kaW5nQm94KCk7XG4gICAgZXhwZWN0KGJvdW5kcykubm90LnRvQmVOdWxsKCk7XG4gICAgYXdhaXQgcGFnZS5tb3VzZS5tb3ZlKGJvdW5kcyEueCArIGJvdW5kcyEud2lkdGggKiAwLjQsIGJvdW5kcyEueSArIGJvdW5kcyEuaGVpZ2h0IC8gMik7XG4gICAgYXdhaXQgcGFnZS5tb3VzZS5kb3duKCk7XG4gICAgYXdhaXQgc2Vlay5kaXNwYXRjaEV2ZW50KCdwb2ludGVyY2FuY2VsJywgeyBwb2ludGVySWQ6IDEsIHBvaW50ZXJUeXBlOiAnbW91c2UnIH0pO1xuICAgIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuZm9jdXMoKTtcbiAgICBhd2FpdCBwYWdlLm1vdXNlLnVwKCk7XG4gICAgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gdmlkZW8uZXZhbHVhdGUoKGVsZW1lbnQ6IEhUTUxWaWRlb0VsZW1lbnQpID0+IGVsZW1lbnQucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgICBpZiAoc291cmNlID09PSAnWW91ciB0YWtlJykgYXdhaXQgZXhwZWN0LnBvbGwoKCkgPT4gYXVkaW8uZXZhbHVhdGUoKGVsZW1lbnQ6IEhUTUxBdWRpb0VsZW1lbnQpID0+IGVsZW1lbnQucGF1c2VkKSkudG9CZSh0cnVlKTtcbiAgfVxuXG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdPcmlnaW5hbCcsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdQYXVzZScsIGV4YWN0OiB0cnVlIH0pLmNsaWNrKCk7XG4gIGF3YWl0IHNlZWsuZm9jdXMoKTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC5kb3duKCdBcnJvd1JpZ2h0Jyk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdFeGl0JywgZXhhY3Q6IHRydWUgfSkuZm9jdXMoKTtcbiAgYXdhaXQgcGFnZS5rZXlib2FyZC51cCgnQXJyb3dSaWdodCcpO1xuICBhd2FpdCBleHBlY3QucG9sbCgoKSA9PiB2aWRlby5ldmFsdWF0ZSgoZWxlbWVudDogSFRNTFZpZGVvRWxlbWVudCkgPT4gZWxlbWVudC5wYXVzZWQpKS50b0JlKHRydWUpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdJUjA2LXJlY29yZC1zZWVrLWNhbmNlbC1ibHVyLXBhdXNlZC5wbmcnKSB9KTtcbn0pO1xuXG50ZXN0KCdwaG9uZSByZWNvdmVyeSB0b2FzdCBleHBpcnkgcHJlc2VydmVzIHRoZSBkb2N1bWVudCBmbG9vciBhbmQgc2Nyb2xsIHBvc2l0aW9uJywgYXN5bmMgKHsgcGFnZSwgYnJvd3NlciB9KSA9PiB7XG4gIHRlc3Quc2V0VGltZW91dCgyMF8wMDApO1xuICBhd2FpdCBwYWdlLnNldFZpZXdwb3J0U2l6ZSh7IHdpZHRoOiAzOTAsIGhlaWdodDogNjY3IH0pO1xuICBhd2FpdCBwYWdlLmFkZEluaXRTY3JpcHQoKCkgPT4geyAod2luZG93IGFzIFdpbmRvdyAmIHsgX19kZW55TWljcm9waG9uZT86IGJvb2xlYW4gfSkuX19kZW55TWljcm9waG9uZSA9IHRydWU7IH0pO1xuICBhd2FpdCBpbnN0cnVtZW50TmF0aXZlTWVkaWEocGFnZSk7XG4gIGF3YWl0IHBhZ2UuZ290bygnL3Byb2plY3RzL3NpbnRlbC1wcmVwYXJlZC9yZWNvcmQ/bGF5b3V0PUEmbG9jYWxlPWVuJyk7XG4gIGF3YWl0IHBhZ2UuZ2V0QnlSb2xlKCdidXR0b24nLCB7IG5hbWU6ICdSZWNvcmQnLCBleGFjdDogdHJ1ZSB9KS5jbGljaygpO1xuICBjb25zdCB0b2FzdCA9IHBhZ2UubG9jYXRvcignLnJlY292ZXJ5LXRvYXN0Jyk7XG4gIGF3YWl0IGV4cGVjdCh0b2FzdCkudG9CZVZpc2libGUoKTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCg0MDApO1xuICBjb25zdCBiZWZvcmUgPSBhd2FpdCBwYWdlLmV2YWx1YXRlKCgpID0+ICh7XG4gICAgc2Nyb2xsWTogd2luZG93LnNjcm9sbFksXG4gICAgbWF4U2Nyb2xsOiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0IC0gd2luZG93LmlubmVySGVpZ2h0LFxuICAgIHNjcm9sbEhlaWdodDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCxcbiAgfSkpO1xuICBleHBlY3QoYmVmb3JlLnNjcm9sbFkpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAnSVIwOC1waG9uZS1kZW5pZWQtdG9hc3QtYmVmb3JlLWV4cGlyeS5wbmcnKSB9KTtcbiAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCg4XzMwMCk7XG4gIGF3YWl0IGV4cGVjdCh0b2FzdCkudG9IYXZlQ291bnQoMCk7XG4gIGNvbnN0IGFmdGVyID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiAoe1xuICAgIHNjcm9sbFk6IHdpbmRvdy5zY3JvbGxZLFxuICAgIG1heFNjcm9sbDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCAtIHdpbmRvdy5pbm5lckhlaWdodCxcbiAgICBzY3JvbGxIZWlnaHQ6IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxIZWlnaHQsXG4gIH0pKTtcbiAgYXdhaXQgd3JpdGVGaWxlKHBhdGguam9pbihldmlkZW5jZURpcmVjdG9yeSwgJ0lSMDgtcGhvbmUtdG9hc3QtZXhwaXJ5LWV2aWRlbmNlLmpzb24nKSwgSlNPTi5zdHJpbmdpZnkoe1xuICAgIGRhdGU6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICBicm93c2VyOiBgQ2hyb21lICR7YnJvd3Nlci52ZXJzaW9uKCl9YCxcbiAgICBiZWZvcmUsXG4gICAgYWZ0ZXIsXG4gIH0sIG51bGwsIDIpLCAndXRmOCcpO1xuICBleHBlY3QoYWZ0ZXIuc2Nyb2xsWSkudG9CZShiZWZvcmUuc2Nyb2xsWSk7XG4gIGV4cGVjdChhZnRlci5tYXhTY3JvbGwpLnRvQmUoYmVmb3JlLm1heFNjcm9sbCk7XG4gIGV4cGVjdChhZnRlci5zY3JvbGxIZWlnaHQpLnRvQmUoYmVmb3JlLnNjcm9sbEhlaWdodCk7XG4gIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpKS50b0NvbnRhaW5UZXh0KCdNaWNyb3Bob25lIGFjY2VzcyB3YXMgZGVuaWVkIG9yIGludGVycnVwdGVkLiBSZWNvcmRpbmcgZGlkIG5vdCBiZWdpbicpO1xuICBhd2FpdCBwYWdlLnNjcmVlbnNob3QoeyBwYXRoOiBwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdJUjA4LXBob25lLWRlbmllZC10b2FzdC1hZnRlci1leHBpcnkucG5nJykgfSk7XG4gIGF3YWl0IHdyaXRlRmlsZShwYXRoLmpvaW4oZXZpZGVuY2VEaXJlY3RvcnksICdJUjA4LXBob25lLXRvYXN0LWV4cGlyeS1ldmlkZW5jZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgYmVmb3JlLFxuICAgIGFmdGVyLFxuICAgIGR1cmFibGVHdWlkYW5jZVJldGFpbmVkOiBhd2FpdCBwYWdlLmxvY2F0b3IoJy5yZWNvcmQtcGFuZWwgLm5vdGljZScpLmlzVmlzaWJsZSgpLFxuICB9LCBudWxsLCAyKSwgJ3V0ZjgnKTtcbn0pO1xuXG50ZXN0KCdhcHByb3ZlZCBsb25nIFJ1c3NpYW4gbGluZSBpcyB1c2VkIGFzIGFuIGlzb2xhdGVkIHN0cmVzcyBmaXh0dXJlIGluIEEgYW5kIEInLCBhc3luYyAoeyBwYWdlLCBicm93c2VyIH0pID0+IHtcbiAgdGVzdC5zZXRUaW1lb3V0KDMwXzAwMCk7XG4gIGNvbnN0IGxvbmdTZW50ZW5jZSA9ICfQryDQuNGJ0YMg0YLQvtCz0L4sINC60YLQviDQvNC90LUg0L7Rh9C10L3RjCDQtNC+0YDQvtCzLiDQnNGLINC/0YDQvtGI0LvQuCDRgtCw0LrQvtC5INC00L7Qu9Cz0LjQuSDQv9GD0YLRjCwg0Lgg0YLQtdC/0LXRgNGMINGPINC90LUg0LzQvtCz0YMg0L/QvtCy0LXRgNC90YPRgtGMINC90LDQt9Cw0LQuJztcbiAgY29uc3QgbWVhc3VyZW1lbnRzOiBBcnJheTxSZWNvcmQ8c3RyaW5nLCB1bmtub3duPj4gPSBbXTtcbiAgZm9yIChjb25zdCBsYXlvdXQgb2YgWydBJywgJ0InXSBhcyBjb25zdCkge1xuICAgIGF3YWl0IHBhZ2Uuc2V0Vmlld3BvcnRTaXplKHsgd2lkdGg6IDEyODAsIGhlaWdodDogNjAwIH0pO1xuICAgIGF3YWl0IHBhZ2UuZ290bygnLycpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5ob21lLXBhZ2UnKSkudG9CZVZpc2libGUoKTtcbiAgICBhd2FpdCBwYWdlLmV2YWx1YXRlKCh7IHNlbGVjdGVkTGF5b3V0LCBmaXh0dXJlVGV4dCB9KSA9PiB7XG4gICAgICB0eXBlIFByZXBhcmVkV2luZG93ID0geyBpZDogc3RyaW5nOyB0ZXh0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IH07XG4gICAgICB0eXBlIFByb2plY3RzID0geyBsb2FkUHJlcGFyZWRQcm9qZWN0OiAoLi4uYXJnczogdW5rbm93bltdKSA9PiBQcm9taXNlPHsgd2luZG93czogUHJlcGFyZWRXaW5kb3dbXSB9IHwgbnVsbD4gfTtcbiAgICAgIHR5cGUgU2VydmljZXMgPSB7IHByb2plY3RzOiBQcm9qZWN0cyB9O1xuICAgICAgdHlwZSBGaWJlciA9IHsgYWx0ZXJuYXRlPzogdW5rbm93bjsgY2hpbGQ/OiB1bmtub3duOyBzaWJsaW5nPzogdW5rbm93bjsgbWVtb2l6ZWRQcm9wcz86IHVua25vd24gfTtcbiAgICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpIGFzIChIVE1MRWxlbWVudCAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+KSB8IG51bGw7XG4gICAgICBpZiAoIXJvb3QpIHRocm93IG5ldyBFcnJvcignVGhlIFJlYWN0IHJvb3QgaXMgdW5hdmFpbGFibGUgZm9yIHRoZSBpc29sYXRlZCBzdHJlc3MgZml4dHVyZS4nKTtcbiAgICAgIGNvbnN0IHJvb3RLZXkgPSBPYmplY3Qua2V5cyhyb290KS5maW5kKChrZXkpID0+IGtleS5zdGFydHNXaXRoKCdfX3JlYWN0Q29udGFpbmVyJCcpKTtcbiAgICAgIGlmICghcm9vdEtleSkgdGhyb3cgbmV3IEVycm9yKCdUaGUgYWN0aXZlIFJlYWN0IHJvb3QgZmliZXIgaXMgdW5hdmFpbGFibGUuJyk7XG4gICAgICBjb25zdCBwZW5kaW5nOiB1bmtub3duW10gPSBbcm9vdFtyb290S2V5XV07XG4gICAgICBjb25zdCBzZWVuID0gbmV3IFNldDx1bmtub3duPigpO1xuICAgICAgbGV0IHNlcnZpY2VzOiBTZXJ2aWNlcyB8IG51bGwgPSBudWxsO1xuICAgICAgd2hpbGUgKHBlbmRpbmcubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBmaWJlciA9IHBlbmRpbmcucG9wKCkgYXMgRmliZXIgfCBudWxsO1xuICAgICAgICBpZiAoIWZpYmVyIHx8IHNlZW4uaGFzKGZpYmVyKSkgY29udGludWU7XG4gICAgICAgIHNlZW4uYWRkKGZpYmVyKTtcbiAgICAgICAgaWYgKGZpYmVyLmFsdGVybmF0ZSkgcGVuZGluZy5wdXNoKGZpYmVyLmFsdGVybmF0ZSk7XG4gICAgICAgIGNvbnN0IHByb3BzID0gZmliZXIubWVtb2l6ZWRQcm9wcyBhcyB7IHNlcnZpY2VzPzogU2VydmljZXMgfSB8IG51bGw7XG4gICAgICAgIGlmIChwcm9wcz8uc2VydmljZXM/LnByb2plY3RzKSBzZXJ2aWNlcyA9IHByb3BzLnNlcnZpY2VzO1xuICAgICAgICBpZiAoZmliZXIuY2hpbGQpIHBlbmRpbmcucHVzaChmaWJlci5jaGlsZCk7XG4gICAgICAgIGlmIChmaWJlci5zaWJsaW5nKSBwZW5kaW5nLnB1c2goZmliZXIuc2libGluZyk7XG4gICAgICB9XG4gICAgICBpZiAoIXNlcnZpY2VzKSB0aHJvdyBuZXcgRXJyb3IoJ1RoZSBhY3RpdmUgdHlwZWQgcHJvamVjdCByZWFkZXIgd2FzIG5vdCBmb3VuZC4nKTtcbiAgICAgIGNvbnN0IG9yaWdpbmFsTG9hZCA9IHNlcnZpY2VzLnByb2plY3RzLmxvYWRQcmVwYXJlZFByb2plY3QuYmluZChzZXJ2aWNlcy5wcm9qZWN0cyk7XG4gICAgICBzZXJ2aWNlcy5wcm9qZWN0cy5sb2FkUHJlcGFyZWRQcm9qZWN0ID0gYXN5bmMgKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgY29uc3QgcHJvamVjdCA9IGF3YWl0IG9yaWdpbmFsTG9hZCguLi5hcmdzKTtcbiAgICAgICAgcmV0dXJuIHByb2plY3QgPyB7XG4gICAgICAgICAgLi4ucHJvamVjdCxcbiAgICAgICAgICB3aW5kb3dzOiBwcm9qZWN0LndpbmRvd3MubWFwKCh3aW5kb3cpID0+IHdpbmRvdy5pZCA9PT0gJ3NpbnRlbC10dXJuLTMnXG4gICAgICAgICAgICA/IHsgLi4ud2luZG93LCB0ZXh0OiB7IC4uLndpbmRvdy50ZXh0LCBydTogZml4dHVyZVRleHQgfSB9XG4gICAgICAgICAgICA6IHdpbmRvdyksXG4gICAgICAgIH0gOiBudWxsO1xuICAgICAgfTtcbiAgICAgIGhpc3RvcnkucHVzaFN0YXRlKHt9LCAnJywgYC9wcm9qZWN0cy9zaW50ZWwtcHJlcGFyZWQvcmVjb3JkP2xheW91dD0ke3NlbGVjdGVkTGF5b3V0fSZsb2NhbGU9cnUmdHVybj1zaW50ZWwtdHVybi0zYCk7XG4gICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgUG9wU3RhdGVFdmVudCgncG9wc3RhdGUnKSk7XG4gICAgfSwgeyBzZWxlY3RlZExheW91dDogbGF5b3V0LCBmaXh0dXJlVGV4dDogbG9uZ1NlbnRlbmNlIH0pO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmdldEJ5Um9sZSgnYnV0dG9uJywgeyBuYW1lOiAn0JfQsNC/0LjRgdCw0YLRjCcsIGV4YWN0OiB0cnVlIH0pKS50b0JlRW5hYmxlZCgpO1xuICAgIGF3YWl0IGV4cGVjdChwYWdlLmxvY2F0b3IoJy5kaWFsb2d1ZS1jb3B5IHAnKSkudG9IYXZlVGV4dChsb25nU2VudGVuY2UpO1xuICAgIGF3YWl0IHBhZ2UuZXZhbHVhdGUoKCkgPT4gZG9jdW1lbnQuZm9udHMucmVhZHkpO1xuXG4gICAgZm9yIChjb25zdCB2aWV3cG9ydCBvZiBbeyB3aWR0aDogMTI4MCwgaGVpZ2h0OiA2MDAgfSwgeyB3aWR0aDogMTM2NiwgaGVpZ2h0OiA2NTAgfSwgeyB3aWR0aDogMzkwLCBoZWlnaHQ6IDY2NyB9XSkge1xuICAgICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUodmlld3BvcnQpO1xuICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yVGltZW91dCgxNTApO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IGJvdW5kcyA9IChzZWxlY3Rvcjogc3RyaW5nKSA9PiB7XG4gICAgICAgICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Ioc2VsZWN0b3IpO1xuICAgICAgICAgIGlmICghZWxlbWVudCkgcmV0dXJuIG51bGw7XG4gICAgICAgICAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgICAgICAgcmV0dXJuIHsgeDogcmVjdC54LCB5OiByZWN0LnksIHdpZHRoOiByZWN0LndpZHRoLCBoZWlnaHQ6IHJlY3QuaGVpZ2h0LCBib3R0b206IHJlY3QuYm90dG9tIH07XG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmlld3BvcnQ6IHsgd2lkdGg6IGlubmVyV2lkdGgsIGhlaWdodDogaW5uZXJIZWlnaHQgfSxcbiAgICAgICAgICB0ZXh0OiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuZGlhbG9ndWUtY29weSBwJyk/LnRleHRDb250ZW50LFxuICAgICAgICAgIG1lZGlhOiBib3VuZHMoJy5tZWRpYS12aWV3cG9ydCcpLFxuICAgICAgICAgIHBhbmVsOiBib3VuZHMoJy5yZWNvcmQtcGFuZWwnKSxcbiAgICAgICAgICBkaWFsb2d1ZTogYm91bmRzKCcuZGlhbG9ndWUtY29weScpLFxuICAgICAgICAgIHdhdmU6IGJvdW5kcygnLndhdmVmb3JtLXJvdycpLFxuICAgICAgICAgIGRvY3VtZW50SGVpZ2h0OiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsSGVpZ2h0LFxuICAgICAgICAgIGhvcml6b250YWxPdmVyZmxvdzogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFdpZHRoID4gaW5uZXJXaWR0aCxcbiAgICAgICAgfTtcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KHJlc3VsdC50ZXh0KS50b0JlKGxvbmdTZW50ZW5jZSk7XG4gICAgICBleHBlY3QocmVzdWx0Lmhvcml6b250YWxPdmVyZmxvdykudG9CZShmYWxzZSk7XG4gICAgICBleHBlY3QocmVzdWx0LmRpYWxvZ3VlPy5ib3R0b20gPz8gSW5maW5pdHkpLnRvQmVMZXNzVGhhbk9yRXF1YWwocmVzdWx0LndhdmU/LnkgPz8gLUluZmluaXR5KTtcbiAgICAgIGlmIChsYXlvdXQgPT09ICdBJyAmJiB2aWV3cG9ydC53aWR0aCA+PSAxMjQ4KSBleHBlY3QoTWF0aC5hYnMoKHJlc3VsdC5wYW5lbD8ueSA/PyAtOTk5KSAtIChyZXN1bHQubWVkaWE/LnkgPz8gLTEwMDApKSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICAgIG1lYXN1cmVtZW50cy5wdXNoKHsgbGF5b3V0LCAuLi5yZXN1bHQgfSk7XG4gICAgICBjb25zdCBuYW1lID0gYHJ1LWxvbmctJHtsYXlvdXR9LSR7dmlld3BvcnQud2lkdGh9eCR7dmlld3BvcnQuaGVpZ2h0fS5wbmdgO1xuICAgICAgYXdhaXQgcGFnZS5zY3JlZW5zaG90KHsgcGF0aDogcGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCBuYW1lKSwgZnVsbFBhZ2U6IHZpZXdwb3J0LndpZHRoIDwgNTAwIH0pO1xuICAgIH1cbiAgfVxuICBhd2FpdCB3cml0ZUZpbGUocGF0aC5qb2luKGV2aWRlbmNlRGlyZWN0b3J5LCAncnUtbG9uZy1zdHJlc3MtZml4dHVyZS1ldmlkZW5jZS5qc29uJyksIEpTT04uc3RyaW5naWZ5KHtcbiAgICBkYXRlOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgYnJvd3NlcjogYENocm9tZSAke2Jyb3dzZXIudmVyc2lvbigpfWAsXG4gICAgc2VudGVuY2U6IGxvbmdTZW50ZW5jZSxcbiAgICBzb3VyY2U6ICdpc29sYXRlZCBpbi1tZW1vcnkgcmVhZC1wb3J0IG92ZXJyaWRlIGZvciBzaW50ZWwtdHVybi0zOyBwcm9kdWN0aW9uIHNlZWQgdGV4dCB1bmNoYW5nZWQnLFxuICAgIG1lYXN1cmVtZW50cyxcbiAgfSwgbnVsbCwgMiksICd1dGY4Jyk7XG59KTtcbiJdLCJtYXBwaW5ncyI6IjtBQUFBLFNBQVNBLEtBQUssRUFBRUMsUUFBUSxFQUFFQyxTQUFTLFFBQVEsa0JBQWtCO0FBQzdELFNBQVNDLFVBQVUsUUFBUSxhQUFhO0FBQ3hDLE9BQU9DLElBQUksTUFBTSxXQUFXO0FBQzVCLFNBQVNDLElBQUksRUFBRUMsTUFBTSxRQUFtQixrQkFBa0I7QUFFMUQsTUFBTUMsaUJBQWlCLEdBQUdILElBQUksQ0FBQ0ksT0FBTyxDQUNwQ0MsT0FBTyxDQUFDQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLDJDQUEyQyxFQUNyRixHQUFHLEVBQUFDLHFCQUFBLEdBQUNGLE9BQU8sQ0FBQ0csR0FBRyxDQUFDQyx3QkFBd0IsY0FBQUYscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxRQUFRLEVBQUVHLEtBQUssQ0FBQyxRQUFRLENBQ3RFLENBQUM7QUFFRCxlQUFlQyxlQUFlQSxDQUFDQyxJQUFVLEVBQUVDLE1BQW1CLEVBQUU7RUFDOUQsTUFBTUMsR0FBRyxHQUFHLElBQUlDLEdBQUcsQ0FBQ0gsSUFBSSxDQUFDRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0VBQy9CQSxHQUFHLENBQUNFLFlBQVksQ0FBQ0MsR0FBRyxDQUFDLFFBQVEsRUFBRUosTUFBTSxDQUFDO0VBQ3RDLE1BQU1ELElBQUksQ0FBQ00sSUFBSSxDQUFDLEdBQUdKLEdBQUcsQ0FBQ0ssUUFBUSxHQUFHTCxHQUFHLENBQUNNLE1BQU0sRUFBRSxDQUFDO0FBQ2pEO0FBRUEsZUFBZUMscUJBQXFCQSxDQUFDVCxJQUFVLEVBQUU7RUFDL0MsTUFBTUEsSUFBSSxDQUFDVSxhQUFhLENBQUMsTUFBTTtJQUM3QixNQUFNQyxNQUFNLEdBQUdDLE1BSWQ7SUFDREQsTUFBTSxDQUFDRSxzQkFBc0IsR0FBRztNQUFFQyxpQkFBaUIsRUFBRSxDQUFDO01BQUVDLGNBQWMsRUFBRTtJQUFFLENBQUM7SUFDM0UsSUFBSTtNQUNGLE1BQU1DLGFBQWEsR0FBR0MsY0FBYyxDQUFDQyxPQUFPLENBQUMsb0NBQW9DLENBQUM7TUFDbEYsSUFBSUYsYUFBYSxFQUFFTCxNQUFNLENBQUNFLHNCQUFzQixHQUFHTSxJQUFJLENBQUNDLEtBQUssQ0FBQ0osYUFBYSxDQUFzRDtJQUNuSSxDQUFDLENBQUMsTUFBTSxDQUFFO0lBQ1YsTUFBTUsscUJBQXFCLEdBQUdBLENBQUEsS0FBTTtNQUNsQyxJQUFJO1FBQUVKLGNBQWMsQ0FBQ0ssT0FBTyxDQUFDLG9DQUFvQyxFQUFFSCxJQUFJLENBQUNJLFNBQVMsQ0FBQ1osTUFBTSxDQUFDRSxzQkFBc0IsQ0FBQyxDQUFDO01BQUUsQ0FBQyxDQUNwSCxNQUFNLENBQUU7SUFDVixDQUFDO0lBQ0RGLE1BQU0sQ0FBQ2EsY0FBYyxHQUFHO01BQUVDLFFBQVEsRUFBRSxFQUFFO01BQUVDLFNBQVMsRUFBRTtJQUFHLENBQUM7SUFDdkQsTUFBTUMsV0FBVyxHQUFHQyxTQUFTLENBQUNDLEtBQUs7SUFDbkMsTUFBTUMsZUFBZSxHQUFHSCxXQUFXLENBQUNJLE9BQU8sQ0FBQ0MsSUFBSSxDQUFDTCxXQUFXLENBQUM7SUFDN0RNLE1BQU0sQ0FBQ0MsY0FBYyxDQUFDUCxXQUFXLEVBQUUsU0FBUyxFQUFFO01BQzVDUSxZQUFZLEVBQUUsSUFBSTtNQUNsQkMsS0FBSyxFQUFFQSxDQUFDQyxJQUFZLEVBQUVDLE9BQW9CLEVBQUVDLFFBQTJELEtBQUs7UUFDMUc1QixNQUFNLENBQUNhLGNBQWMsQ0FBRUMsUUFBUSxDQUFDZSxJQUFJLENBQUNILElBQUksQ0FBQztRQUMxQyxPQUFPUCxlQUFlLENBQUNPLElBQUksRUFBRUMsT0FBTyxFQUFHRyxJQUFJLElBQUs7VUFDOUM5QixNQUFNLENBQUNhLGNBQWMsQ0FBRUUsU0FBUyxDQUFDYyxJQUFJLENBQUNDLElBQUksR0FBRyxVQUFVLEdBQUcsTUFBTSxDQUFDO1VBQ2pFLE9BQU9GLFFBQVEsQ0FBQ0UsSUFBSSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztNQUNKO0lBQ0YsQ0FBQyxDQUFDO0lBQ0YsTUFBTUMsWUFBWSxHQUFHZCxTQUFTLENBQUNjLFlBQVk7SUFDM0MsSUFBSUEsWUFBWSxFQUFFO01BQ2hCLE1BQU1DLFlBQVksR0FBR0QsWUFBWSxDQUFDQyxZQUFZLENBQUNYLElBQUksQ0FBQ1UsWUFBWSxDQUFDO01BQ2pFQSxZQUFZLENBQUNDLFlBQVksR0FBRyxDQUFDLEdBQUdDLElBQThDLEtBQUs7UUFDakZqQyxNQUFNLENBQUNFLHNCQUFzQixDQUFFQyxpQkFBaUIsSUFBSSxDQUFDO1FBQ3JETyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZCLElBQUlWLE1BQU0sQ0FBQ2tDLGdCQUFnQixFQUFFLE9BQU9DLE9BQU8sQ0FBQ0MsTUFBTSxDQUFDLElBQUlDLFlBQVksQ0FBQyxtREFBbUQsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVJLE9BQU9MLFlBQVksQ0FBQyxHQUFHQyxJQUFJLENBQUM7TUFDOUIsQ0FBQztJQUNIO0lBQ0EsSUFBSWhDLE1BQU0sQ0FBQ3FDLGFBQWEsRUFBRTtNQUN4QixNQUFNQyxLQUFLLEdBQUdELGFBQWEsQ0FBQ0UsU0FBUyxDQUFDRCxLQUFLO01BQzNDRCxhQUFhLENBQUNFLFNBQVMsQ0FBQ0QsS0FBSyxHQUFHLFVBQVUsR0FBR04sSUFBd0MsRUFBRTtRQUNyRmpDLE1BQU0sQ0FBQ0Usc0JBQXNCLENBQUVFLGNBQWMsSUFBSSxDQUFDO1FBQ2xETSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3ZCLE9BQU82QixLQUFLLENBQUNFLEtBQUssQ0FBQyxJQUFJLEVBQUVSLElBQUksQ0FBQztNQUNoQyxDQUFDO0lBQ0g7RUFDRixDQUFDLENBQUM7QUFDSjtBQUVBLGVBQWVTLGdCQUFnQkEsQ0FBQ3JELElBQVUsRUFBRTtFQUMxQyxPQUFPQSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTzFDLE1BQU0sQ0FBMkdDLHNCQUFzQixDQUFDO0FBQ3RLO0FBRUEsZUFBZTBDLG1CQUFtQkEsQ0FBQ3ZELElBQVUsRUFBRXdELElBQThDLEVBQUU7RUFDN0YsTUFBTXhELElBQUksQ0FBQ3NELFFBQVEsQ0FBRUcsU0FBUyxJQUFLO0lBTWpDLE1BQU1DLElBQUksR0FBR0MsUUFBUSxDQUFDQyxjQUFjLENBQUMsTUFBTSxDQUFtRDtJQUM5RixJQUFJLENBQUNGLElBQUksRUFBRSxNQUFNLElBQUlHLEtBQUssQ0FBQyxnQ0FBZ0MsQ0FBQztJQUM1RCxNQUFNQyxPQUFPLEdBQUc3QixNQUFNLENBQUM4QixJQUFJLENBQUNMLElBQUksQ0FBQyxDQUFDTSxJQUFJLENBQUVDLEdBQUcsSUFBS0EsR0FBRyxDQUFDQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNwRixJQUFJLENBQUNKLE9BQU8sRUFBRSxNQUFNLElBQUlELEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQztJQUNyRSxNQUFNTSxPQUFrQixHQUFHLENBQUNULElBQUksQ0FBQ0ksT0FBTyxDQUFDLENBQUM7SUFDMUMsSUFBSU0sS0FBMEIsR0FBRyxJQUFJO0lBQ3JDLE9BQU9ELE9BQU8sQ0FBQ0UsTUFBTSxHQUFHLENBQUMsRUFBRTtNQUFBLElBQUFDLGVBQUE7TUFDekIsTUFBTUMsS0FBSyxHQUFHSixPQUFPLENBQUNLLEdBQUcsQ0FBQyxDQUFpQjtNQUMzQyxJQUFJLENBQUNELEtBQUssRUFBRTtNQUNaLE1BQU1FLEtBQUssR0FBR0YsS0FBSyxDQUFDRyxhQUFrRTtNQUN0RixJQUFJRCxLQUFLLGFBQUxBLEtBQUssZ0JBQUFILGVBQUEsR0FBTEcsS0FBSyxDQUFFRSxRQUFRLGNBQUFMLGVBQUEsZUFBZkEsZUFBQSxDQUFpQk0sUUFBUSxFQUFFUixLQUFLLEdBQUdLLEtBQUssQ0FBQ0UsUUFBUSxDQUFDQyxRQUFRO01BQzlELElBQUlMLEtBQUssQ0FBQ00sS0FBSyxFQUFFVixPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNNLEtBQUssQ0FBQztNQUMxQyxJQUFJTixLQUFLLENBQUNPLE9BQU8sRUFBRVgsT0FBTyxDQUFDM0IsSUFBSSxDQUFDK0IsS0FBSyxDQUFDTyxPQUFPLENBQUM7SUFDaEQ7SUFDQSxJQUFJLENBQUNWLEtBQUssRUFBRSxNQUFNLElBQUlQLEtBQUssQ0FBQyxzRUFBc0UsQ0FBQztJQUNuRyxNQUFNa0IsWUFBWSxHQUFHWCxLQUFLLENBQUNZLGFBQWEsQ0FBQ2hELElBQUksQ0FBQ29DLEtBQUssQ0FBQztJQUNwRCxNQUFNYSxjQUFjLEdBQUdiLEtBQUssQ0FBQ2MsZUFBZSxDQUFDbEQsSUFBSSxDQUFDb0MsS0FBSyxDQUFDO0lBQ3hELE1BQU1lLEtBQUssR0FBRztNQUFFQyxTQUFTLEVBQUUsQ0FBQztNQUFFQyxXQUFXLEVBQUUsQ0FBQztNQUFFQyxZQUFZLEVBQUUsRUFBYztNQUFFQyxTQUFTLEVBQUUsRUFBYztNQUFFQyxhQUFhLEVBQUU7SUFBdUIsQ0FBQztJQUM3STVFLE1BQU0sQ0FBcUQ2RSxtQkFBbUIsR0FBR04sS0FBSztJQUN2RixJQUFJTyxpQkFBaUIsR0FBRyxJQUFJO0lBQzVCLElBQUlDLFVBQXVCLEdBQUcsSUFBSTtJQUNsQ3ZCLEtBQUssQ0FBQ1ksYUFBYSxHQUFHLE1BQU9qRCxPQUFPLElBQUs7TUFDdkNvRCxLQUFLLENBQUNDLFNBQVMsSUFBSSxDQUFDO01BQ3BCRCxLQUFLLENBQUNHLFlBQVksQ0FBQzlDLElBQUksQ0FBQ1QsT0FBTyxDQUFDNkQsV0FBVyxDQUFDO01BQzVDVCxLQUFLLENBQUNJLFNBQVMsQ0FBQy9DLElBQUksQ0FBQ1QsT0FBTyxDQUFDOEQsT0FBTyxDQUFDQyxJQUFJLENBQUNDLElBQUksQ0FBQztNQUMvQyxJQUFJdEMsU0FBUyxLQUFLLGVBQWUsSUFBSWlDLGlCQUFpQixFQUFFO1FBQ3REQSxpQkFBaUIsR0FBRyxLQUFLO1FBQ3pCQyxVQUFVLEdBQUc1RCxPQUFPLENBQUM4RCxPQUFPLENBQUNDLElBQUk7UUFDakMsTUFBTSxJQUFJOUMsWUFBWSxDQUFDLHdEQUF3RCxFQUFFLG9CQUFvQixDQUFDO01BQ3hHO01BQ0EsSUFBSVMsU0FBUyxLQUFLLGVBQWUsSUFBSWtDLFVBQVUsRUFBRVIsS0FBSyxDQUFDSyxhQUFhLEdBQUdHLFVBQVUsS0FBSzVELE9BQU8sQ0FBQzhELE9BQU8sQ0FBQ0MsSUFBSTtNQUMxRyxNQUFNRSxTQUFTLEdBQUcsTUFBTWpCLFlBQVksQ0FBQ2hELE9BQU8sQ0FBQztNQUM3QyxPQUFPMEIsU0FBUyxLQUFLLHNCQUFzQixHQUN2QztRQUFFd0MsSUFBSSxFQUFFLFNBQVM7UUFBRUwsV0FBVyxFQUFFN0QsT0FBTyxDQUFDNkQsV0FBVztRQUFFTSxNQUFNLEVBQUU7TUFBd0QsQ0FBQyxHQUN0SEYsU0FBUztJQUNmLENBQUM7SUFDRDVCLEtBQUssQ0FBQ2MsZUFBZSxHQUFHLE9BQU8sR0FBR3RDLElBQUksS0FBSztNQUN6Q3VDLEtBQUssQ0FBQ0UsV0FBVyxJQUFJLENBQUM7TUFDdEIsSUFBSTVCLFNBQVMsS0FBSyxzQkFBc0IsSUFBSTBCLEtBQUssQ0FBQ0UsV0FBVyxLQUFLLENBQUMsRUFBRTtRQUNuRSxPQUFPO1VBQUVZLElBQUksRUFBRSxTQUFTO1VBQUVMLFdBQVcsRUFBRU8sTUFBTSxDQUFDdkQsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUFFLENBQUM7TUFDMUQ7TUFDQSxPQUFPcUMsY0FBYyxDQUFDLEdBQUdyQyxJQUFJLENBQUM7SUFDaEMsQ0FBQztFQUNILENBQUMsRUFBRVksSUFBSSxDQUFDO0FBQ1Y7QUFFQSxlQUFlNEMsd0JBQXdCQSxDQUFDcEcsSUFBVSxFQUFFO0VBQ2xELE1BQU1BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxZQUFZO0lBQzlCLE1BQU0rQyxtQkFBbUIsR0FBR0MsV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVztJQUM3RCxNQUFNcEIsS0FBSyxHQUFHO01BQUVxQixLQUFLLEVBQUUsQ0FBQztNQUFFQyxNQUFNLEVBQUUsRUFBYztNQUFFQyxPQUFPLEVBQUVBLENBQUEsS0FBTUM7SUFBVSxDQUFDO0lBQzNFL0YsTUFBTSxDQUFzRGdHLG9CQUFvQixHQUFHekIsS0FBSztJQUN6Rm1CLFdBQVcsQ0FBQ25ELFNBQVMsQ0FBQ29ELFdBQVcsR0FBRyxVQUFVTSxVQUFVLEVBQUVyRCxJQUFJLEVBQUVsQixPQUFPLEVBQUU7TUFDdkUsTUFBTW1FLE1BQU0sR0FBRyxPQUFPSSxVQUFVLEtBQUssUUFBUSxHQUFHLENBQUNBLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBR0EsVUFBVSxDQUFDO01BQzlFLElBQUkxQixLQUFLLENBQUNxQixLQUFLLEtBQUssQ0FBQyxJQUFJaEQsSUFBSSxLQUFLLFdBQVcsSUFBSWlELE1BQU0sQ0FBQ0ssUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQzlFM0IsS0FBSyxDQUFDcUIsS0FBSyxJQUFJLENBQUM7UUFDaEJyQixLQUFLLENBQUNzQixNQUFNLEdBQUdBLE1BQU07UUFDckIsTUFBTSxJQUFJekQsWUFBWSxDQUFDLDJDQUEyQyxFQUFFLG9CQUFvQixDQUFDO01BQzNGO01BQ0EsT0FBT3FELG1CQUFtQixDQUFDVSxJQUFJLENBQUMsSUFBSSxFQUFFRixVQUFVLEVBQUVyRCxJQUFJLEVBQUVsQixPQUFPLENBQUM7SUFDbEUsQ0FBQztJQUNENkMsS0FBSyxDQUFDdUIsT0FBTyxHQUFHLE1BQU07TUFBRUosV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVyxHQUFHRixtQkFBbUI7SUFBRSxDQUFDO0VBQ3BGLENBQUMsQ0FBQztBQUNKO0FBRUEsZUFBZVcsZ0NBQWdDQSxDQUFDaEgsSUFBVSxFQUFFO0VBQzFELE1BQU1BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBQ3hCLE1BQU0yRCxRQUFRLEdBQUdYLFdBQVcsQ0FBQ25ELFNBQVMsQ0FBQ29ELFdBQVc7SUFDbEQsTUFBTXBCLEtBQUssR0FBRztNQUFFcUIsS0FBSyxFQUFFLENBQUM7TUFBRUMsTUFBTSxFQUFFO0lBQWUsQ0FBQztJQUNsRCxNQUFNOUYsTUFBTSxHQUFHQyxNQUdkO0lBQ0RELE1BQU0sQ0FBQ3VHLHVCQUF1QixHQUFHL0IsS0FBSztJQUN0Q21CLFdBQVcsQ0FBQ25ELFNBQVMsQ0FBQ29ELFdBQVcsR0FBRyxVQUFVTSxVQUFVLEVBQUVyRCxJQUFJLEVBQUVsQixPQUFPLEVBQUU7TUFDdkUsTUFBTW1FLE1BQU0sR0FBRyxPQUFPSSxVQUFVLEtBQUssUUFBUSxHQUFHLENBQUNBLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBR0EsVUFBVSxDQUFDO01BQzlFLElBQUkxQixLQUFLLENBQUNxQixLQUFLLEtBQUssQ0FBQyxJQUFJaEQsSUFBSSxLQUFLLFdBQVcsSUFBSWlELE1BQU0sQ0FBQ0ssUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQzlFM0IsS0FBSyxDQUFDcUIsS0FBSyxJQUFJLENBQUM7UUFDaEJyQixLQUFLLENBQUNzQixNQUFNLEdBQUdBLE1BQU07UUFDckIsTUFBTSxJQUFJekQsWUFBWSxDQUFDLDBDQUEwQyxFQUFFLG9CQUFvQixDQUFDO01BQzFGO01BQ0EsT0FBT2lFLFFBQVEsQ0FBQ0YsSUFBSSxDQUFDLElBQUksRUFBRUYsVUFBVSxFQUFFckQsSUFBSSxFQUFFbEIsT0FBTyxDQUFDO0lBQ3ZELENBQUM7SUFDRDNCLE1BQU0sQ0FBQ3dHLDhCQUE4QixHQUFHLE1BQU07TUFBRWIsV0FBVyxDQUFDbkQsU0FBUyxDQUFDb0QsV0FBVyxHQUFHVSxRQUFRO0lBQUUsQ0FBQztFQUNqRyxDQUFDLENBQUM7QUFDSjtBQUVBLGVBQWVHLHlCQUF5QkEsQ0FBQ3BILElBQVUsRUFBRTtFQUNuRCxNQUFNQSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtJQUN4QixNQUFNNkIsS0FBSyxHQUFHO01BQUVrQyxRQUFRLEVBQUUsQ0FBQztNQUFFQyxRQUFRLEVBQUUsQ0FBQztNQUFFQyxRQUFRLEVBQUUsRUFBRTtNQUFFQyxNQUFNLEVBQUU7SUFBc0IsQ0FBQztJQUN0RjVHLE1BQU0sQ0FBeUQ2Ryx1QkFBdUIsR0FBR3RDLEtBQUs7SUFDL0YsTUFBTWhDLFNBQVMsR0FBR0YsYUFBYSxDQUFDRSxTQUFTO0lBQ3pDLE1BQU1ELEtBQUssR0FBR0MsU0FBUyxDQUFDRCxLQUFLO0lBQzdCQyxTQUFTLENBQUNELEtBQUssR0FBRyxVQUFVLEdBQUdOLElBQXdDLEVBQUU7TUFDdkUsTUFBTThFLE1BQWtCLEdBQUcsRUFBRTtNQUM3QixJQUFJLENBQUNDLGdCQUFnQixDQUFDLGVBQWUsRUFBR0MsS0FBSyxJQUFLO1FBQUUsSUFBSUEsS0FBSyxDQUFDQyxJQUFJLENBQUM5QixJQUFJLEdBQUcsQ0FBQyxFQUFFMkIsTUFBTSxDQUFDbEYsSUFBSSxDQUFDb0YsS0FBSyxDQUFDQyxJQUFJLENBQUM7TUFBRSxDQUFDLENBQUM7TUFDeEcsSUFBSSxDQUFDRixnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsTUFBTTtRQUNsQyxNQUFNN0IsSUFBSSxHQUFHLElBQUlnQyxJQUFJLENBQUNKLE1BQU0sRUFBRTtVQUFFSyxJQUFJLEVBQUUsSUFBSSxDQUFDUjtRQUFTLENBQUMsQ0FBQztRQUN0RHBDLEtBQUssQ0FBQ2tDLFFBQVEsSUFBSSxDQUFDO1FBQ25CbEMsS0FBSyxDQUFDbUMsUUFBUSxHQUFHeEIsSUFBSSxDQUFDQyxJQUFJO1FBQzFCWixLQUFLLENBQUNvQyxRQUFRLEdBQUd6QixJQUFJLENBQUNpQyxJQUFJO1FBQzFCLEtBQUtqQyxJQUFJLENBQUNrQyxXQUFXLENBQUMsQ0FBQyxDQUFDQyxJQUFJLENBQUVDLEtBQUssSUFBS0MsTUFBTSxDQUFDQyxNQUFNLENBQUNDLE1BQU0sQ0FBQyxTQUFTLEVBQUVILEtBQUssQ0FBQyxDQUFDLENBQUNELElBQUksQ0FBRUksTUFBTSxJQUFLO1VBQy9GbEQsS0FBSyxDQUFDcUMsTUFBTSxHQUFHYyxLQUFLLENBQUNDLElBQUksQ0FBQyxJQUFJQyxVQUFVLENBQUNILE1BQU0sQ0FBQyxFQUFHSSxJQUFJLElBQUtBLElBQUksQ0FBQ0MsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUNDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDMUcsQ0FBQyxDQUFDO01BQ0osQ0FBQyxFQUFFO1FBQUVDLElBQUksRUFBRTtNQUFLLENBQUMsQ0FBQztNQUNsQixPQUFPM0YsS0FBSyxDQUFDRSxLQUFLLENBQUMsSUFBSSxFQUFFUixJQUFJLENBQUM7SUFDaEMsQ0FBQztFQUNILENBQUMsQ0FBQztBQUNKO0FBRUEsZUFBZWtHLGlCQUFpQkEsQ0FBQzlJLElBQVUsRUFBRTtFQUMzQyxPQUFPQSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTzFDLE1BQU0sQ0FFL0I2RSxtQkFBbUIsQ0FBQztBQUN6QjtBQUVBLGVBQWVzRCxhQUFhQSxDQUFDL0ksSUFBVSxFQUFFO0VBQ3ZDLE9BQU9BLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxZQUFZO0lBQy9CLE1BQU0wRixRQUFRLEdBQUcsTUFBTSxJQUFJbEcsT0FBTyxDQUFjLENBQUN0RCxPQUFPLEVBQUV1RCxNQUFNLEtBQUs7TUFDbkUsTUFBTWhCLE9BQU8sR0FBR2tILFNBQVMsQ0FBQ0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDO01BQ3REbkgsT0FBTyxDQUFDb0gsU0FBUyxHQUFHLE1BQU0zSixPQUFPLENBQUN1QyxPQUFPLENBQUNxSCxNQUFNLENBQUM7TUFDakRySCxPQUFPLENBQUNzSCxPQUFPLEdBQUcsTUFBTXRHLE1BQU0sQ0FBQ2hCLE9BQU8sQ0FBQ3VILEtBQUssQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRixNQUFNQyxJQUFJLEdBQUdBLENBQUlDLFNBQWlCLEVBQUV2RixHQUFpQixLQUFLLElBQUluQixPQUFPLENBQUksQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztNQUM1RixNQUFNd0QsV0FBVyxHQUFHeUMsUUFBUSxDQUFDekMsV0FBVyxDQUFDaUQsU0FBUyxFQUFFLFVBQVUsQ0FBQztNQUMvRCxNQUFNekgsT0FBTyxHQUFHa0MsR0FBRyxLQUFLMEMsU0FBUyxHQUFHSixXQUFXLENBQUNrRCxXQUFXLENBQUNELFNBQVMsQ0FBQyxDQUFDRSxNQUFNLENBQUMsQ0FBQyxHQUFHbkQsV0FBVyxDQUFDa0QsV0FBVyxDQUFDRCxTQUFTLENBQUMsQ0FBQ0csR0FBRyxDQUFDMUYsR0FBRyxDQUFDO01BQzdIbEMsT0FBTyxDQUFDb0gsU0FBUyxHQUFHLE1BQU0zSixPQUFPLENBQUN1QyxPQUFPLENBQUNxSCxNQUFXLENBQUM7TUFDdERySCxPQUFPLENBQUNzSCxPQUFPLEdBQUcsTUFBTXRHLE1BQU0sQ0FBQ2hCLE9BQU8sQ0FBQ3VILEtBQUssQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRixNQUFNTSxPQUFPLEdBQUcsTUFBTUwsSUFBSSxDQUEwQixVQUFVLEVBQUUsaUJBQWlCLENBQUM7SUFDbEYsTUFBTU0sS0FBSyxHQUFHLE1BQU1OLElBQUksQ0FBaUMsT0FBTyxDQUFDO0lBQ2pFLE1BQU1PLFVBQVUsR0FBRyxNQUFNUCxJQUFJLENBQWlDLFlBQVksQ0FBQztJQUMzRSxNQUFNUSxTQUFTLEdBQUcsTUFBTVIsSUFBSSxDQUFpQyxXQUFXLENBQUM7SUFDekVQLFFBQVEsQ0FBQ2dCLEtBQUssQ0FBQyxDQUFDO0lBQ2hCLE9BQU87TUFDTEosT0FBTyxFQUFFQSxPQUFPLEdBQUc7UUFDakJLLFFBQVEsRUFBRUwsT0FBTyxDQUFDSyxRQUFRO1FBQzFCQyxvQkFBb0IsRUFBRU4sT0FBTyxDQUFDTSxvQkFBb0I7UUFDbERDLGNBQWMsRUFBRVAsT0FBTyxDQUFDTyxjQUFjO1FBQ3RDQyx1QkFBdUIsRUFBRVIsT0FBTyxDQUFDUSx1QkFBdUI7UUFDeERDLHNCQUFzQixFQUFFVCxPQUFPLENBQUNTLHNCQUFzQjtRQUN0REMsWUFBWSxFQUFFVixPQUFPLENBQUNVO01BQ3hCLENBQUMsR0FBRyxJQUFJO01BQ1JULEtBQUssRUFBRUEsS0FBSyxDQUFDVSxHQUFHLENBQUVDLFNBQVM7UUFBQSxJQUFBQyxLQUFBLEVBQUFDLGVBQUE7UUFBQSxPQUFNO1VBQy9CQyxFQUFFLEVBQUVILFNBQVMsQ0FBQ0csRUFBRTtVQUNoQkMsT0FBTyxFQUFFSixTQUFTLENBQUNJLE9BQU87VUFDMUJDLE1BQU0sRUFBRUwsU0FBUyxDQUFDSyxNQUFNO1VBQ3hCdkQsUUFBUSxFQUFFa0QsU0FBUyxDQUFDbEQsUUFBUTtVQUM1QkUsTUFBTSxFQUFFZ0QsU0FBUyxDQUFDaEQsTUFBTTtVQUN4QkQsUUFBUSxFQUFFaUQsU0FBUyxDQUFDakQsUUFBUTtVQUM1QnVELFNBQVMsRUFBRU4sU0FBUyxDQUFDTSxTQUFTO1VBQzlCQyxLQUFLLEVBQUVQLFNBQVMsQ0FBQ08sS0FBSztVQUN0QkMsUUFBUSxHQUFBUCxLQUFBLElBQUFDLGVBQUEsR0FBR0YsU0FBUyxDQUFDMUUsSUFBSSxjQUFBNEUsZUFBQSx1QkFBZkEsZUFBQSxDQUFzQzNFLElBQUksY0FBQTBFLEtBQUEsY0FBQUEsS0FBQSxHQUFJO1FBQzFELENBQUM7TUFBQSxDQUFDLENBQUM7TUFDSFgsVUFBVSxFQUFFQSxVQUFVLENBQUNTLEdBQUcsQ0FBRVUsU0FBUyxLQUFNO1FBQ3pDTixFQUFFLEVBQUVNLFNBQVMsQ0FBQ04sRUFBRTtRQUNoQjFFLElBQUksRUFBRWdGLFNBQVMsQ0FBQ2hGLElBQUk7UUFDcEJpRixLQUFLLEVBQUVELFNBQVMsQ0FBQ0MsS0FBSztRQUN0QkwsTUFBTSxFQUFFSSxTQUFTLENBQUNKLE1BQU07UUFDeEJNLGVBQWUsRUFBRUYsU0FBUyxDQUFDRSxlQUFlO1FBQzFDQyxVQUFVLEVBQUVILFNBQVMsQ0FBQ0csVUFBVTtRQUNoQ0MsZ0JBQWdCLEVBQUVKLFNBQVMsQ0FBQ0ksZ0JBQWdCO1FBQzVDQyxtQkFBbUIsRUFBRUwsU0FBUyxDQUFDSyxtQkFBbUI7UUFDbEQ5RCxNQUFNLEVBQUV5RCxTQUFTLENBQUN6RDtNQUNwQixDQUFDLENBQUMsQ0FBQztNQUNIdUMsU0FBUyxFQUFFQSxTQUFTLENBQUNRLEdBQUcsQ0FBRWdCLFFBQVEsS0FBTTtRQUN0Q1osRUFBRSxFQUFFWSxRQUFRLENBQUNaLEVBQUU7UUFDZlEsZUFBZSxFQUFFSSxRQUFRLENBQUNKLGVBQWU7UUFDekNLLGFBQWEsRUFBRUQsUUFBUSxDQUFDQyxhQUFhO1FBQ3JDQyxhQUFhLEVBQUVGLFFBQVEsQ0FBQ0UsYUFBYTtRQUNyQ0MsS0FBSyxFQUFFSCxRQUFRLENBQUNHO01BQ2xCLENBQUMsQ0FBQztJQUNKLENBQUM7RUFDSCxDQUFDLENBQUM7QUFDSjtBQUVBck0sSUFBSSxDQUFDLG1HQUFtRyxFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFDckksTUFBTTNMLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTXJMLHFCQUFxQixDQUFDVCxJQUFJLENBQUM7RUFDakMsTUFBTUEsSUFBSSxDQUFDTSxJQUFJLENBQUMsMkNBQTJDLENBQUM7RUFDNUQsTUFBTWhCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3JGLE1BQU0xSSxtQkFBbUIsQ0FBQ3ZELElBQUksRUFBRSxzQkFBc0IsQ0FBQztFQUV2RCxNQUFNQSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3ZFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU05SSxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxFQUFFZSxjQUFjLENBQUMsQ0FBQ3FMLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDcEYsTUFBTTlNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHlGQUF5RixFQUFFO0lBQUVDLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQztFQUNqTCxNQUFNak4sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsb0JBQW9CO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNqRyxNQUFNTyxZQUFZLEdBQUcsTUFBTTFELGlCQUFpQixDQUFDOUksSUFBSSxDQUFDO0VBQ2xEVixNQUFNLENBQUNrTixZQUFZLENBQUNwSCxTQUFTLENBQUMsQ0FBQ2dILElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdEM5TSxNQUFNLENBQUNrTixZQUFZLENBQUNuSCxXQUFXLENBQUMsQ0FBQytHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDeEM5TSxNQUFNLENBQUNrTixZQUFZLENBQUNsSCxZQUFZLENBQUMsQ0FBQ21ILFlBQVksQ0FBQyxDQUFDLENBQUM7RUFFakQsTUFBTXpNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxvQkFBb0I7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUNuRixNQUFNUSxNQUFNLEdBQUcsTUFBTUMscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUsR0FBRyxDQUFDO0VBQ3JELE1BQU00TSxhQUFhLEdBQUcsTUFBTTlELGlCQUFpQixDQUFDOUksSUFBSSxDQUFDO0VBQ25EVixNQUFNLENBQUNzTixhQUFhLENBQUN4SCxTQUFTLENBQUMsQ0FBQ2dILElBQUksQ0FBQyxDQUFDLENBQUM7RUFDdkM5TSxNQUFNLENBQUNzTixhQUFhLENBQUN2SCxXQUFXLENBQUMsQ0FBQytHLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDekM5TSxNQUFNLENBQUNzTixhQUFhLENBQUN0SCxZQUFZLENBQUMsQ0FBQ3VILE9BQU8sQ0FBQyxDQUFDTCxZQUFZLENBQUNsSCxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztFQUMxRSxNQUFNMEQsUUFBUSxHQUFHLE1BQU1ELGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUMxQyxNQUFNOE0sWUFBWSxHQUFHOUQsUUFBUSxDQUFDYyxVQUFVLENBQUM5RixJQUFJLENBQUVpSCxTQUFTLElBQUtBLFNBQVMsQ0FBQ04sRUFBRSxLQUFLNkIsWUFBWSxDQUFDbEgsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO0VBQzNHaEcsTUFBTSxDQUFDd04sWUFBWSxhQUFaQSxZQUFZLHVCQUFaQSxZQUFZLENBQUU1QixLQUFLLENBQUMsQ0FBQ2tCLElBQUksQ0FBQyxXQUFXLENBQUM7RUFDN0M5TSxNQUFNLENBQUN3TixZQUFZLGFBQVpBLFlBQVksdUJBQVpBLFlBQVksQ0FBRXRGLE1BQU0sQ0FBQyxDQUFDNEUsSUFBSSxDQUFDTSxNQUFNLGFBQU5BLE1BQU0sdUJBQU5BLE1BQU0sQ0FBRWxGLE1BQU0sQ0FBQztFQUNqRCxNQUFNdEksU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxxQ0FBcUMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDbEd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0Q0MsUUFBUSxFQUFFLHNKQUFzSjtJQUNoS0Msa0JBQWtCLEVBQUUsS0FBSztJQUN6QkMsaUJBQWlCLEVBQUUsTUFBTWhLLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDO0lBQy9DbUYsS0FBSyxFQUFFeUgsYUFBYTtJQUNwQkUsWUFBWTtJQUNaUSxjQUFjLEVBQUVaO0VBQ2xCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGck4sSUFBSSxDQUFDLDhGQUE4RixFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFBQSxJQUFBNEIscUJBQUEsRUFBQUMscUJBQUEsRUFBQUMsbUJBQUEsRUFBQUMsb0JBQUE7RUFDaElyTyxJQUFJLENBQUNzTyxVQUFVLENBQUMsS0FBTSxDQUFDO0VBQ3ZCLE1BQU0zTixJQUFJLENBQUM0TCxlQUFlLENBQUM7SUFBRUMsS0FBSyxFQUFFLElBQUk7SUFBRUMsTUFBTSxFQUFFO0VBQUksQ0FBQyxDQUFDO0VBQ3hELE1BQU1yTCxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0VBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLDJDQUEyQyxDQUFDO0VBQzVELE1BQU1zTixtQkFBbUIsQ0FBQzVOLElBQUksRUFBRSxHQUFHLENBQUM7RUFDcEMsTUFBTUEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE1BQU07SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQztFQUNsRCxNQUFNN04sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFVBQVU7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN6RSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQztFQUNsRCxNQUFNQyxhQUFhLEdBQUcsTUFBTS9FLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUMvQyxNQUFNK04sY0FBYyxHQUFHLEVBQUFSLHFCQUFBLEdBQUNPLGFBQWEsQ0FBQ2xFLE9BQU8sY0FBQTJELHFCQUFBLHVCQUFyQkEscUJBQUEsQ0FBdUJwRCxjQUFjLEVBQTRCLGVBQWUsQ0FBQztFQUN6RzdLLE1BQU0sQ0FBQ3lPLGNBQWMsQ0FBQyxDQUFDQyxVQUFVLENBQUMsQ0FBQztFQUVuQyxNQUFNaEgsZ0NBQWdDLENBQUNoSCxJQUFJLENBQUM7RUFDNUMsTUFBTW9ILHlCQUF5QixDQUFDcEgsSUFBSSxDQUFDO0VBQ3JDLE1BQU1BLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTlJLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLEVBQUVlLGNBQWMsQ0FBQyxDQUFDcUwsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNwRixNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsNkdBQTZHLEVBQUU7SUFBRUMsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQ3JNLE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxZQUFZO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUN6RixNQUFNZ0MsYUFBYSxHQUFHak8sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDO0VBQ3JELE1BQU0vTSxNQUFNLENBQUMyTyxhQUFhLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDekM1TyxNQUFNLENBQUMsTUFBTTJPLGFBQWEsQ0FBQ2xDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQ29DLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQy9CLElBQUksQ0FBQyxDQUFDLENBQUM7RUFDL0QsTUFBTWdDLFVBQVUsR0FBRyxNQUFNSCxhQUFhLENBQUMzSyxRQUFRLENBQUUrSyxPQUFPLElBQUs7SUFDM0QsTUFBTUMsS0FBSyxHQUFHQyxnQkFBZ0IsQ0FBQ0YsT0FBTyxDQUFDO0lBQ3ZDLE1BQU1HLE1BQU0sR0FBR0gsT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO0lBQzlDLE1BQU1DLElBQUksR0FBR0wsT0FBTyxDQUFDTSxhQUFhLENBQUMsS0FBSyxDQUFDO0lBQ3pDLE9BQU87TUFDTEMsVUFBVSxFQUFFTixLQUFLLENBQUNPLGVBQWU7TUFDakNDLFlBQVksRUFBRVIsS0FBSyxDQUFDUSxZQUFZO01BQ2hDQyxNQUFNLEVBQUVULEtBQUssQ0FBQ1MsTUFBTTtNQUNwQmxELEtBQUssRUFBRTJDLE1BQU0sQ0FBQzNDLEtBQUs7TUFDbkJtRCxPQUFPLEVBQUVWLEtBQUssQ0FBQ1UsT0FBTztNQUN0QkMsU0FBUyxFQUFFWCxLQUFLLENBQUNXLFNBQVM7TUFDMUJDLFNBQVMsRUFBRVIsSUFBSSxHQUFHSCxnQkFBZ0IsQ0FBQ0csSUFBSSxDQUFDLENBQUNTLEtBQUssR0FBRyxJQUFJO01BQ3JEQyxTQUFTLEVBQUViLGdCQUFnQixDQUFDRixPQUFPLENBQUNNLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBRSxDQUFDLENBQUNVLElBQUk7TUFDbEZDLFFBQVEsRUFBRWYsZ0JBQWdCLENBQUNGLE9BQU8sQ0FBQ00sYUFBYSxDQUFDLHVCQUF1QixDQUFFLENBQUMsQ0FBQ1U7SUFDOUUsQ0FBQztFQUNILENBQUMsQ0FBQztFQUNGL1AsTUFBTSxDQUFDOE8sVUFBVSxDQUFDUSxVQUFVLENBQUMsQ0FBQ3hDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztFQUNyRDlNLE1BQU0sQ0FBQzhPLFVBQVUsQ0FBQ1UsWUFBWSxDQUFDLENBQUMxQyxJQUFJLENBQUMsTUFBTSxDQUFDO0VBQzVDOU0sTUFBTSxDQUFDOE8sVUFBVSxDQUFDVyxNQUFNLENBQUMsQ0FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUM7RUFDdEM5TSxNQUFNLENBQUM4TyxVQUFVLENBQUN2QyxLQUFLLENBQUMsQ0FBQzBELG1CQUFtQixDQUFDLEdBQUcsQ0FBQztFQUNqRGpRLE1BQU0sQ0FBQzhPLFVBQVUsQ0FBQ1ksT0FBTyxDQUFDLENBQUM1QyxJQUFJLENBQUMsV0FBVyxDQUFDO0VBQzVDOU0sTUFBTSxDQUFDOE8sVUFBVSxDQUFDYyxTQUFTLENBQUMsQ0FBQzlDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztFQUN2RCxNQUFNcE0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHVDQUF1QztFQUFFLENBQUMsQ0FBQztFQUN0RyxNQUFNa1EsV0FBVyxHQUFHLE1BQU16UCxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTzFDLE1BQU0sQ0FBMEZzRyx1QkFBdUIsQ0FBQztFQUN2SzVILE1BQU0sQ0FBQ21RLFdBQVcsQ0FBQ2pKLEtBQUssQ0FBQyxDQUFDNEYsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNqQzlNLE1BQU0sQ0FBQ21RLFdBQVcsQ0FBQ2hKLE1BQU0sQ0FBQyxDQUFDaUosU0FBUyxDQUFDLFlBQVksQ0FBQztFQUNsRCxNQUFNMVAsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBQXdFdUcsOEJBQThCLENBQUMsQ0FBQyxDQUFDO0VBQzFJLE1BQU13SSxpQkFBaUIsR0FBRyxNQUFNM1AsSUFBSSxDQUFDc0QsUUFBUSxDQUFDO0lBQUEsSUFBQXNNLHFCQUFBLEVBQUFDLHNCQUFBO0lBQUEsT0FBTztNQUNuREMsZUFBZSxHQUFBRixxQkFBQSxJQUFBQyxzQkFBQSxHQUFFbE0sUUFBUSxDQUFDb00sYUFBYSxjQUFBRixzQkFBQSx1QkFBdEJBLHNCQUFBLENBQXdCRyxPQUFPLENBQUMscUNBQXFDLENBQUMsY0FBQUoscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxLQUFLO01BQ2hHSyxPQUFPLEVBQUVyUCxNQUFNLENBQUNxUDtJQUNsQixDQUFDO0VBQUEsQ0FBQyxDQUFDO0VBQ0gzUSxNQUFNLENBQUNxUSxpQkFBaUIsQ0FBQ0csZUFBZSxDQUFDLENBQUMxRCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ3BELE1BQU05TSxNQUFNLENBQUMyTyxhQUFhLENBQUMsQ0FBQ2lDLFdBQVcsQ0FBQyxDQUFDLEVBQUU7SUFBRTNELE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQztFQUMvRGpOLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUNxTSxPQUFPLENBQUMscUNBQXFDLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRStLLE9BQU8sSUFBS0EsT0FBTyxLQUFLMUssUUFBUSxDQUFDb00sYUFBYSxDQUFDLENBQUMsQ0FBQzNELElBQUksQ0FBQyxJQUFJLENBQUM7RUFDdEk5TSxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU0xQyxNQUFNLENBQUNxUCxPQUFPLENBQUMsQ0FBQyxDQUFDN0QsSUFBSSxDQUFDdUQsaUJBQWlCLENBQUNNLE9BQU8sQ0FBQztFQUNqRixNQUFNRSxZQUFZLEdBQUcsTUFBTXBILGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUM5Q1YsTUFBTSxDQUFDLEVBQUFrTyxxQkFBQSxHQUFDMkMsWUFBWSxDQUFDdkcsT0FBTyxjQUFBNEQscUJBQUEsdUJBQXBCQSxxQkFBQSxDQUFzQnJELGNBQWMsRUFBNEIsZUFBZSxDQUFDLENBQUMsQ0FBQ2lDLElBQUksQ0FBQzJCLGNBQWMsQ0FBQztFQUM5R3pPLE1BQU0sQ0FBQzZRLFlBQVksQ0FBQ3RHLEtBQUssQ0FBQ3VHLE1BQU0sQ0FBRTFELE1BQU0sSUFBS0EsTUFBTSxDQUFDOUIsT0FBTyxLQUFLLFdBQVcsSUFBSThCLE1BQU0sQ0FBQy9CLEVBQUUsS0FBS29ELGNBQWMsQ0FBQyxDQUFDLENBQUN0QixZQUFZLENBQUMsQ0FBQyxDQUFDO0VBRTdILE1BQU16TSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsWUFBWTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQzNFLE1BQU1tRSxLQUFLLEdBQUcsTUFBTTFELHFCQUFxQixDQUFDM00sSUFBSSxFQUFFLEdBQUcsQ0FBQztFQUNwRCxNQUFNVixNQUFNLENBQUM2TSxJQUFJLENBQUMsWUFBWW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUV0RDZHLHVCQUF1QixDQUFDRCxNQUFNLENBQUMsRUFBRTtJQUFFK0UsT0FBTyxFQUFFO0VBQU0sQ0FBQyxDQUFDLENBQUNILElBQUksQ0FBQ2lFLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFN0ksTUFBTSxDQUFDO0VBQzNFLE1BQU04SSxjQUFjLEdBQUcsTUFBTXRRLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUVyRDZHLHVCQUF1QixDQUFDO0VBQzNCbkksTUFBTSxDQUFDZ1IsY0FBYyxDQUFDakosUUFBUSxDQUFDLENBQUMrRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3ZDOU0sTUFBTSxDQUFDZ1IsY0FBYyxDQUFDaEosUUFBUSxDQUFDLENBQUM4RSxJQUFJLENBQUNpRSxLQUFLLGFBQUxBLEtBQUssdUJBQUxBLEtBQUssQ0FBRXJGLFFBQVEsQ0FBQztFQUNyRDFMLE1BQU0sQ0FBQ2dSLGNBQWMsQ0FBQy9JLFFBQVEsQ0FBQyxDQUFDNkUsSUFBSSxDQUFDaUUsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUU5SSxRQUFRLENBQUM7RUFDckQsTUFBTWdKLFVBQVUsR0FBRyxNQUFNeEgsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0VBQzVDVixNQUFNLENBQUMsRUFBQW1PLG1CQUFBLEdBQUM4QyxVQUFVLENBQUMzRyxPQUFPLGNBQUE2RCxtQkFBQSx1QkFBbEJBLG1CQUFBLENBQW9CdEQsY0FBYyxFQUE0QixlQUFlLENBQUMsQ0FBQyxDQUFDaUMsSUFBSSxDQUFDMkIsY0FBYyxDQUFDO0VBQzVHek8sTUFBTSxDQUFDLEVBQUFvTyxvQkFBQSxHQUFDNkMsVUFBVSxDQUFDM0csT0FBTyxjQUFBOEQsb0JBQUEsdUJBQWxCQSxvQkFBQSxDQUFvQnhELG9CQUFvQixFQUE0QixlQUFlLENBQUMsQ0FBQyxDQUFDa0MsSUFBSSxDQUFDaUUsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUUxRixFQUFFLENBQUM7RUFDN0csTUFBTXpMLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMENBQTBDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ3ZHd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdENDLFFBQVEsRUFBRSxnSUFBZ0k7SUFDMUlDLGtCQUFrQixFQUFFLEtBQUs7SUFDekJDLGlCQUFpQixFQUFFLE1BQU1oSyxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQztJQUMvQ3dRLDhCQUE4QixFQUFFekMsY0FBYztJQUM5QzBDLGFBQWEsRUFBRWhCLFdBQVc7SUFDMUJ4QixhQUFhLEVBQUVHLFVBQVU7SUFDekJzQyw2QkFBNkIsRUFBRUosY0FBYztJQUM3Q0ssS0FBSyxFQUFFTCxjQUFjO0lBQ3JCTSxZQUFZLEVBQUVMLFVBQVUsQ0FBQzNHLE9BQU87SUFDaENpSCxnQkFBZ0IsRUFBRVI7RUFDcEIsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDO0FBRUZoUixJQUFJLENBQUMsaUhBQWlILEVBQUUsT0FBTztFQUFFVyxJQUFJO0VBQUUyTDtBQUFRLENBQUMsS0FBSztFQUFBLElBQUFtRixlQUFBLEVBQUFDLElBQUEsRUFBQUMsZ0JBQUEsRUFBQUMsaUJBQUEsRUFBQUMsZ0JBQUEsRUFBQUMsa0JBQUE7RUFDbko5UixJQUFJLENBQUNzTyxVQUFVLENBQUMsS0FBTSxDQUFDO0VBQ3ZCLE1BQU0zTixJQUFJLENBQUM0TCxlQUFlLENBQUM7SUFBRUMsS0FBSyxFQUFFLElBQUk7SUFBRUMsTUFBTSxFQUFFO0VBQUksQ0FBQyxDQUFDO0VBQ3hELE1BQU1yTCxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0VBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLHFEQUFxRCxDQUFDO0VBQ3RFLE1BQU1rSyxTQUFTLEdBQUcsTUFBTSxDQUFDLFlBQVk7SUFDbkMsTUFBTWxMLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFDN0VBLEtBQUssQ0FBQ0MsVUFBVSxJQUFJQyxnQkFBZ0IsQ0FBQ0MsaUJBQWlCLElBQUlILEtBQUssQ0FBQ0ksVUFBVSxHQUFHLENBQUMsQ0FBQyxFQUFFO01BQUVqRixPQUFPLEVBQUU7SUFBTyxDQUFDLENBQUMsQ0FBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsSCxNQUFNd0IsbUJBQW1CLENBQUM1TixJQUFJLEVBQUUsR0FBRyxDQUFDO0lBQ3BDLE9BQU8yTSxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRSxHQUFHLENBQUM7RUFDekMsQ0FBQyxFQUFFLENBQUM7RUFDSixNQUFNb0csd0JBQXdCLENBQUNwRyxJQUFJLENBQUM7RUFDcEMsTUFBTUEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE1BQU07SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUNyRSxNQUFNdUYsS0FBSyxHQUFHelIsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsQ0FBQztFQUN0QyxNQUFNek0sTUFBTSxDQUFDbVMsS0FBSyxDQUFDLENBQUN2RCxXQUFXLENBQUMsQ0FBQztFQUNqQyxNQUFNdUQsS0FBSyxDQUFDMUYsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLGdCQUFnQjtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ2hGLE1BQU01TSxNQUFNLENBQUNtUyxLQUFLLENBQUMxRixTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsd0JBQXdCO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDa0MsV0FBVyxDQUFDLENBQUM7RUFDdEcsTUFBTXlDLEtBQUssR0FBR2MsS0FBSyxDQUFDcEYsT0FBTyxDQUFDLHNDQUFzQyxDQUFDO0VBQ25FLE1BQU0vTSxNQUFNLENBQUNxUixLQUFLLENBQUMsQ0FBQ2UsV0FBVyxDQUFDLENBQUM7RUFDakMsTUFBTUMsTUFBTSxHQUFHLE1BQU01SSxhQUFhLENBQUMvSSxJQUFJLENBQUM7RUFDeENWLE1BQU0sRUFBQXdSLGVBQUEsR0FBQ2EsTUFBTSxDQUFDL0gsT0FBTyxjQUFBa0gsZUFBQSx1QkFBZEEsZUFBQSxDQUFnQjVHLG9CQUFvQixDQUFDLENBQUMwSCxhQUFhLENBQUM7SUFBRSxlQUFlLEVBQUVwSCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRUc7RUFBRyxDQUFDLENBQUM7RUFDOUZyTCxNQUFNLENBQUMyQyxNQUFNLENBQUM0UCxNQUFNLEVBQUFkLElBQUEsSUFBQUMsZ0JBQUEsR0FBQ1csTUFBTSxDQUFDL0gsT0FBTyxjQUFBb0gsZ0JBQUEsdUJBQWRBLGdCQUFBLENBQWdCN0csY0FBYyxjQUFBNEcsSUFBQSxjQUFBQSxJQUFBLEdBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQ3RFLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDckcsTUFBTXFGLGlCQUFpQixHQUFHLE1BQU05UixJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTzFDLE1BQU0sQ0FBNEdnRyxvQkFBb0IsQ0FBQztFQUM1THRILE1BQU0sQ0FBQ3dTLGlCQUFpQixDQUFDdEwsS0FBSyxDQUFDLENBQUM0RixJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3ZDOU0sTUFBTSxDQUFDd1MsaUJBQWlCLENBQUNyTCxNQUFNLENBQUMsQ0FBQ2lKLFNBQVMsQ0FBQyxZQUFZLENBQUM7RUFDeEQsTUFBTTFQLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUEyRWdHLG9CQUFvQixDQUFDRixPQUFPLENBQUMsQ0FBQyxDQUFDO0VBQzNJLE1BQU0xRyxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMkNBQTJDO0VBQUUsQ0FBQyxDQUFDO0VBRTFHLE1BQU13UyxpQkFBaUIsR0FBRyxNQUFNL1IsSUFBSSxDQUFDc0QsUUFBUSxDQUFDO0lBQUEsSUFBQTBPLHNCQUFBLEVBQUFDLHNCQUFBO0lBQUEsT0FBTztNQUNuREMsWUFBWSxHQUFBRixzQkFBQSxJQUFBQyxzQkFBQSxHQUFFdE8sUUFBUSxDQUFDb00sYUFBYSxjQUFBa0Msc0JBQUEsdUJBQXRCQSxzQkFBQSxDQUF3QmpDLE9BQU8sQ0FBQyxzQ0FBc0MsQ0FBQyxjQUFBZ0Msc0JBQUEsY0FBQUEsc0JBQUEsR0FBSSxLQUFLO01BQzlGL0IsT0FBTyxFQUFFclAsTUFBTSxDQUFDcVA7SUFDbEIsQ0FBQztFQUFBLENBQUMsQ0FBQztFQUNIM1EsTUFBTSxDQUFDeVMsaUJBQWlCLENBQUNHLFlBQVksQ0FBQyxDQUFDOUYsSUFBSSxDQUFDLElBQUksQ0FBQztFQUNqRCxNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDNkQsV0FBVyxDQUFDLENBQUMsRUFBRTtJQUFFM0QsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQ2pGLE1BQU1qTixNQUFNLENBQUNxUixLQUFLLENBQUMsQ0FBQ2UsV0FBVyxDQUFDLENBQUM7RUFDakMsTUFBTVMsNEJBQTRCLEdBQUcsTUFBTXhCLEtBQUssQ0FBQ3JOLFFBQVEsQ0FBRStLLE9BQU8sSUFBS0EsT0FBTyxLQUFLMUssUUFBUSxDQUFDb00sYUFBYSxDQUFDO0VBQzFHelEsTUFBTSxDQUFDNlMsNEJBQTRCLENBQUMsQ0FBQy9GLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDL0M5TSxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU0xQyxNQUFNLENBQUNxUCxPQUFPLENBQUMsQ0FBQyxDQUFDN0QsSUFBSSxDQUFDMkYsaUJBQWlCLENBQUM5QixPQUFPLENBQUM7RUFDakYsTUFBTVUsS0FBSyxDQUFDekUsS0FBSyxDQUFDLENBQUM7RUFDbkIsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsZ0NBQWdDLENBQUM7RUFDOUQsTUFBTTdOLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxtQ0FBbUMsQ0FBQztJQUFFNlMsUUFBUSxFQUFFO0VBQUssQ0FBQyxDQUFDO0VBQ2xILE1BQU1wUyxJQUFJLENBQUNxUyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQ25HLEtBQUssQ0FBQyxDQUFDO0VBQ3hELE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLGtCQUFrQixDQUFDO0VBQ2hELE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7RUFDdkUsTUFBTVksUUFBUSxHQUFHLE1BQU12SixhQUFhLENBQUMvSSxJQUFJLENBQUM7RUFDMUNWLE1BQU0sRUFBQTJSLGlCQUFBLEdBQUNxQixRQUFRLENBQUMxSSxPQUFPLGNBQUFxSCxpQkFBQSx1QkFBaEJBLGlCQUFBLENBQWtCOUcsY0FBYyxDQUFDLENBQUN5SCxhQUFhLENBQUM7SUFBRSxlQUFlLEVBQUVwSCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRUc7RUFBRyxDQUFDLENBQUM7RUFDMUYsTUFBTTRILDBCQUEwQixHQUFHRCxRQUFRLENBQUN4SSxVQUFVLENBQUNzRyxNQUFNLENBQUVuRixTQUFTLElBQUtBLFNBQVMsQ0FBQ2hGLElBQUksS0FBSyxrQkFBa0IsSUFBSWdGLFNBQVMsQ0FBQ0MsS0FBSyxLQUFLLFdBQVcsQ0FBQztFQUN0SjVMLE1BQU0sQ0FBQ2lULDBCQUEwQixDQUFDLENBQUM5RixZQUFZLENBQUMsQ0FBQyxDQUFDO0VBQ2xELE1BQU12TixTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHdDQUF3QyxDQUFDLEVBQUU0QixJQUFJLENBQUNJLFNBQVMsQ0FBQztJQUNyR3dMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUM5QnRCLE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3RDc0YsV0FBVyxFQUFFLDREQUE0RDtJQUN6RUMsV0FBVyxFQUFFakksU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVHLEVBQUU7SUFDMUIrSCxtQkFBbUIsR0FBQXhCLGdCQUFBLEdBQUVTLE1BQU0sQ0FBQy9ILE9BQU8sY0FBQXNILGdCQUFBLHVCQUFkQSxnQkFBQSxDQUFnQi9HLGNBQWM7SUFDbkR3SSxrQkFBa0IsR0FBQXhCLGtCQUFBLEdBQUVtQixRQUFRLENBQUMxSSxPQUFPLGNBQUF1SCxrQkFBQSx1QkFBaEJBLGtCQUFBLENBQWtCaEgsY0FBYztJQUNwRHlJLFlBQVksRUFBRWQsaUJBQWlCO0lBQy9CUywwQkFBMEI7SUFDMUJNLHNCQUFzQixFQUFFZCxpQkFBaUI7SUFDekNJLDRCQUE0QjtJQUM1QlcseUJBQXlCLEVBQUUsTUFBTTlTLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDL0ksUUFBUSxDQUFFK0ssT0FBTyxJQUFLQSxPQUFPLEtBQUsxSyxRQUFRLENBQUNvTSxhQUFhO0VBQ3ZJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGLGVBQWVwRCxxQkFBcUJBLENBQUMzTSxJQUFVLEVBQUUrUyxNQUFpQixFQUFFO0VBQUEsSUFBQUMscUJBQUEsRUFBQUMsaUJBQUE7RUFDbEUsTUFBTUMsTUFBTSxHQUFHSCxNQUFNLEtBQUssR0FBRyxHQUFHL1MsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUdyTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsMkJBQTJCLENBQUM7RUFDakgsTUFBTS9NLE1BQU0sQ0FBQzRULE1BQU0sQ0FBQyxDQUFDNUcsYUFBYSxDQUFDLGtFQUFrRSxFQUFFO0lBQUVDLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQztFQUMzSCxNQUFNak4sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDNkQsV0FBVyxDQUFDLENBQUMsQ0FBQztFQUMzRCxNQUFNbEgsUUFBUSxHQUFHLE1BQU1ELGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUMxQyxNQUFNbVQsYUFBYSxJQUFBSCxxQkFBQSxHQUFHLElBQUk3UyxHQUFHLENBQUNILElBQUksQ0FBQ0UsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDRSxZQUFZLENBQUN1SixHQUFHLENBQUMsTUFBTSxDQUFDLGNBQUFxSixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLGVBQWU7RUFDckYsTUFBTUksV0FBVyxJQUFBSCxpQkFBQSxHQUFHakssUUFBUSxDQUFDWSxPQUFPLGNBQUFxSixpQkFBQSx1QkFBaEJBLGlCQUFBLENBQWtCL0ksb0JBQTBEO0VBQ2hHLE1BQU1tSixPQUFPLEdBQUdySyxRQUFRLENBQUNhLEtBQUssQ0FBQzdGLElBQUksQ0FBRXdHLFNBQVMsSUFBS0EsU0FBUyxDQUFDRyxFQUFFLE1BQUt5SSxXQUFXLGFBQVhBLFdBQVcsdUJBQVhBLFdBQVcsQ0FBR0QsYUFBYSxDQUFDLEVBQUM7RUFDakc3VCxNQUFNLENBQUMrVCxPQUFPLGFBQVBBLE9BQU8sdUJBQVBBLE9BQU8sQ0FBRXJJLFFBQVEsQ0FBQyxDQUFDc0ksZUFBZSxDQUFDLENBQUMsQ0FBQztFQUM1Q2hVLE1BQU0sQ0FBQytULE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFckksUUFBUSxDQUFDLENBQUNvQixJQUFJLENBQUNpSCxPQUFPLGFBQVBBLE9BQU8sdUJBQVBBLE9BQU8sQ0FBRS9MLFFBQVEsQ0FBQztFQUNqRGhJLE1BQU0sQ0FBQytULE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFN0wsTUFBTSxDQUFDLENBQUMrTCxPQUFPLENBQUMsZ0JBQWdCLENBQUM7RUFDakRqVSxNQUFNLENBQUMsQ0FBQytULE9BQU8sYUFBUEEsT0FBTyx1QkFBUEEsT0FBTyxDQUFFdEksS0FBSyxFQUEyQnpELFFBQVEsQ0FBQyxDQUFDOEUsSUFBSSxDQUFDaUgsT0FBTyxhQUFQQSxPQUFPLHVCQUFQQSxPQUFPLENBQUVySSxRQUFRLENBQUM7RUFDbEYsT0FBT3FJLE9BQU87QUFDaEI7QUFFQSxlQUFlekYsbUJBQW1CQSxDQUFDNU4sSUFBVSxFQUFFK1MsTUFBaUIsRUFBRTtFQUNoRSxNQUFNUyxZQUFZLEdBQUd4VCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDO0VBQzlFLE1BQU0xTSxNQUFNLENBQUNrVSxZQUFZLENBQUMsQ0FBQ3ZILFdBQVcsQ0FBQyxDQUFDO0VBQ3hDLE1BQU11SCxZQUFZLENBQUN0SCxLQUFLLENBQUMsQ0FBQztFQUMxQixNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNOUksZ0JBQWdCLENBQUNyRCxJQUFJLENBQUMsRUFBRWUsY0FBYyxDQUFDLENBQUN1UyxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQy9GLE1BQU1HLFNBQVMsR0FBRyxNQUFNelQsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDc0MsV0FBVyxDQUFDO0VBQ3RHLE1BQU0xVCxJQUFJLENBQUMyVCxjQUFjLENBQUMsR0FBRyxDQUFDO0VBQzlCLE1BQU1DLE9BQU8sR0FBRyxNQUFNNVQsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDc0MsV0FBVyxDQUFDO0VBQ3BHcFUsTUFBTSxDQUFDc1UsT0FBTyxDQUFDLENBQUNOLGVBQWUsQ0FBQ0csU0FBUyxDQUFDO0VBQzFDLE1BQU1uVSxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRTtFQUE0QyxDQUFDLENBQUMsQ0FBQyxDQUFDNk4sV0FBVyxDQUFDLENBQUMsQ0FBQztFQUM1RyxNQUFNdkQscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUrUyxNQUFNLENBQUM7QUFDM0M7QUFFQTFULElBQUksQ0FBQ3dVLFNBQVMsQ0FBQyxZQUFZN1UsS0FBSyxDQUFDTyxpQkFBaUIsRUFBRTtFQUFFdVUsU0FBUyxFQUFFO0FBQUssQ0FBQyxDQUFDLENBQUM7QUFFekV6VSxJQUFJLENBQUMsbUdBQW1HLEVBQUUsT0FBTztFQUFFVztBQUFLLENBQUMsS0FBSztFQUM1SCxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDckYsTUFBTTNNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQzZELFdBQVcsQ0FBQyxDQUFDLENBQUM7RUFDM0UsTUFBTWxRLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxNQUFNO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsY0FBYyxDQUFDO0VBQzVDLE1BQU03TixJQUFJLENBQUNxUyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQ25HLEtBQUssQ0FBQyxDQUFDO0VBQ3hELE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLGtCQUFrQixDQUFDO0VBQ2hELE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7RUFDdkUsTUFBTTFSLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxnQ0FBZ0M7RUFBRSxDQUFDLENBQUM7QUFDakcsQ0FBQyxDQUFDO0FBRUZGLElBQUksQ0FBQywyRkFBMkYsRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQUEsSUFBQW9JLHFCQUFBLEVBQUFDLGtCQUFBLEVBQUFDLG1CQUFBLEVBQUFDLG1CQUFBLEVBQUFDLG9CQUFBLEVBQUFDLGdCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHFCQUFBLEVBQUFDLHNCQUFBLEVBQUFDLHNCQUFBO0VBQzdIclYsSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNckwscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNaEIsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUM3RUEsS0FBSyxDQUFDQyxVQUFVLElBQUlDLGdCQUFnQixDQUFDQyxpQkFBaUIsSUFBSUgsS0FBSyxDQUFDSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUU7SUFBRWpGLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQyxDQUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ2xILE1BQU11SSxjQUFjLEdBQUcsTUFBTTNVLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxZQUFZO0lBQ3JELE1BQU0wRixRQUFRLEdBQUcsTUFBTSxJQUFJbEcsT0FBTyxDQUFjLENBQUN0RCxPQUFPLEVBQUV1RCxNQUFNLEtBQUs7TUFDbkUsTUFBTWhCLE9BQU8sR0FBR2tILFNBQVMsQ0FBQ0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDO01BQ3REbkgsT0FBTyxDQUFDb0gsU0FBUyxHQUFHLE1BQU0zSixPQUFPLENBQUN1QyxPQUFPLENBQUNxSCxNQUFNLENBQUM7TUFDakRySCxPQUFPLENBQUNzSCxPQUFPLEdBQUcsTUFBTXRHLE1BQU0sQ0FBQ2hCLE9BQU8sQ0FBQ3VILEtBQUssQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRixNQUFNTSxPQUFPLEdBQUcsTUFBTSxJQUFJOUcsT0FBTyxDQUFxRSxDQUFDdEQsT0FBTyxFQUFFdUQsTUFBTSxLQUFLO01BQ3pILE1BQU1oQixPQUFPLEdBQUdpSCxRQUFRLENBQUN6QyxXQUFXLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDa0QsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDRSxHQUFHLENBQUMsaUJBQWlCLENBQUM7TUFDM0c1SCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQU0sQ0FBQztNQUNqRHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGTixRQUFRLENBQUNnQixLQUFLLENBQUMsQ0FBQztJQUNoQixNQUFNNEssUUFBUSxHQUFHaEwsT0FBTyxDQUFDaUwsT0FBTyxDQUFDN1EsSUFBSSxDQUFFcEQsTUFBTSxJQUFLQSxNQUFNLENBQUMrSixFQUFFLEtBQUssZUFBZSxDQUFDO0lBQ2hGLElBQUksQ0FBQ2lLLFFBQVEsRUFBRSxNQUFNLElBQUkvUSxLQUFLLENBQUMsK0NBQStDLENBQUM7SUFDL0UsT0FBTytRLFFBQVE7RUFDakIsQ0FBQyxDQUFDO0VBQ0YsTUFBTTVVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRStLLE9BQU8sSUFBSztJQUNoRCxNQUFNK0MsS0FBSyxHQUFHL0MsT0FBMkI7SUFDekMsTUFBTWxKLEtBQUssR0FBRztNQUNaMlAsV0FBVyxFQUFFLElBQXFCO01BQ2xDQyxZQUFZLEVBQUUsSUFBcUI7TUFDbkNDLFNBQVMsRUFBRSxJQUFxQjtNQUNoQ0MsZ0JBQWdCLEVBQUUsSUFBcUI7TUFDdkNDLGVBQWUsRUFBRSxJQUFxQjtNQUN0Q0Msc0JBQXNCLEVBQUUsSUFBcUI7TUFDN0NDLGNBQWMsRUFBRSxJQUFxQjtNQUNyQ0MscUJBQXFCLEVBQUU7SUFDekIsQ0FBQztJQUNBelUsTUFBTSxDQUF1RDBVLHFCQUFxQixHQUFHblEsS0FBSztJQUMzRixNQUFNb1EsVUFBVSxHQUFHbkUsS0FBSyxDQUFDb0UsSUFBSSxDQUFDeFQsSUFBSSxDQUFDb1AsS0FBSyxDQUFDO0lBQ3pDblAsTUFBTSxDQUFDQyxjQUFjLENBQUNrUCxLQUFLLEVBQUUsTUFBTSxFQUFFO01BQ25DalAsWUFBWSxFQUFFLElBQUk7TUFDbEJDLEtBQUssRUFBRUEsQ0FBQSxLQUFNO1FBQ1grQyxLQUFLLENBQUMyUCxXQUFXLEdBQUdXLFdBQVcsQ0FBQ0MsR0FBRyxDQUFDLENBQUM7UUFDckMsT0FBTyxJQUFJNVMsT0FBTyxDQUFPLENBQUN0RCxPQUFPLEVBQUV1RCxNQUFNLEtBQUs7VUFDNUNuQyxNQUFNLENBQUMrTSxVQUFVLENBQUMsTUFBTTtZQUN0QnhJLEtBQUssQ0FBQzRQLFlBQVksR0FBR1UsV0FBVyxDQUFDQyxHQUFHLENBQUMsQ0FBQztZQUN0Q0gsVUFBVSxDQUFDLENBQUMsQ0FBQ3ROLElBQUksQ0FBQ3pJLE9BQU8sRUFBRXVELE1BQU0sQ0FBQztVQUNwQyxDQUFDLEVBQUUsSUFBSyxDQUFDO1FBQ1gsQ0FBQyxDQUFDO01BQ0o7SUFDRixDQUFDLENBQUM7SUFDRnFPLEtBQUssQ0FBQ3pKLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxNQUFNO01BQ3RDeEMsS0FBSyxDQUFDNlAsU0FBUyxHQUFHUyxXQUFXLENBQUNDLEdBQUcsQ0FBQyxDQUFDO01BQ25DdlEsS0FBSyxDQUFDOFAsZ0JBQWdCLEdBQUc3RCxLQUFLLENBQUNzQyxXQUFXO0lBQzVDLENBQUMsRUFBRTtNQUFFN0ssSUFBSSxFQUFFO0lBQUssQ0FBQyxDQUFDO0lBQ2xCLE1BQU0zRixLQUFLLEdBQUdELGFBQWEsQ0FBQ0UsU0FBUyxDQUFDRCxLQUFLO0lBQzNDRCxhQUFhLENBQUNFLFNBQVMsQ0FBQ0QsS0FBSyxHQUFHLFVBQVUsR0FBR04sSUFBd0MsRUFBRTtNQUNyRnVDLEtBQUssQ0FBQytQLGVBQWUsR0FBR08sV0FBVyxDQUFDQyxHQUFHLENBQUMsQ0FBQztNQUN6Q3ZRLEtBQUssQ0FBQ2dRLHNCQUFzQixHQUFHL0QsS0FBSyxDQUFDc0MsV0FBVztNQUNoRCxPQUFPeFEsS0FBSyxDQUFDRSxLQUFLLENBQUMsSUFBSSxFQUFFUixJQUFJLENBQUM7SUFDaEMsQ0FBQztJQUNELE1BQU0rUyxJQUFJLEdBQUcxUyxhQUFhLENBQUNFLFNBQVMsQ0FBQ3dTLElBQUk7SUFDekMxUyxhQUFhLENBQUNFLFNBQVMsQ0FBQ3dTLElBQUksR0FBRyxVQUFVLEdBQUcvUyxJQUF1QyxFQUFFO01BQ25GdUMsS0FBSyxDQUFDaVEsY0FBYyxHQUFHSyxXQUFXLENBQUNDLEdBQUcsQ0FBQyxDQUFDO01BQ3hDdlEsS0FBSyxDQUFDa1EscUJBQXFCLEdBQUdqRSxLQUFLLENBQUNzQyxXQUFXO01BQy9DLE9BQU9pQyxJQUFJLENBQUN2UyxLQUFLLENBQUMsSUFBSSxFQUFFUixJQUFJLENBQUM7SUFDL0IsQ0FBQztFQUNILENBQUMsQ0FBQztFQUVGLE1BQU01QyxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3ZFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxzQkFBc0I7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNrQyxXQUFXLENBQUMsQ0FBQztFQUNuRyxNQUFNbE8sSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztFQUM5QixNQUFNaUMsa0JBQWtCLEdBQUcsTUFBTTVWLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBQUEsSUFBQXVTLHFCQUFBLEVBQUFDLHNCQUFBO0lBQ25ELE1BQU0zUSxLQUFLLEdBQUl2RSxNQUFNLENBQW1IMFUscUJBQXFCO0lBQzdKLE9BQU87TUFBRSxHQUFHblEsS0FBSztNQUFFNFEsU0FBUyxHQUFBRixxQkFBQSxJQUFBQyxzQkFBQSxHQUFFblMsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLE9BQU8sQ0FBQyxjQUFBbUgsc0JBQUEsdUJBQS9CQSxzQkFBQSxDQUFpQ3BDLFdBQVcsY0FBQW1DLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUk7SUFBSyxDQUFDO0VBQ3RGLENBQUMsQ0FBQztFQUNGdlcsTUFBTSxDQUFDc1csa0JBQWtCLENBQUNkLFdBQVcsQ0FBQyxDQUFDa0IsR0FBRyxDQUFDQyxRQUFRLENBQUMsQ0FBQztFQUNyRDNXLE1BQU0sQ0FBQ3NXLGtCQUFrQixDQUFDVixlQUFlLENBQUMsQ0FBQ2UsUUFBUSxDQUFDLENBQUM7RUFDckQzVyxNQUFNLENBQUNzVyxrQkFBa0IsQ0FBQ0csU0FBUyxDQUFDLENBQUNDLEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7RUFDbkQzVyxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQyxFQUFBcEMscUJBQUEsR0FBQzZCLGtCQUFrQixDQUFDRyxTQUFTLGNBQUFoQyxxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLENBQUMsSUFBSVksY0FBYyxDQUFDeUIsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM3RyxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7RUFDL0csTUFBTXZQLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSw4QkFBOEI7RUFBRSxDQUFDLENBQUM7RUFFN0YsTUFBTWlMLFNBQVMsR0FBRyxNQUFNbUMscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUsR0FBRyxDQUFDO0VBQ3hELE1BQU1tRixLQUFLLEdBQUcsTUFBTW5GLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFPMUMsTUFBTSxDQUFrRjBVLHFCQUFxQixDQUFDO0VBQ3ZKLE1BQU1lLGdCQUFnQixHQUFHLENBQUMxQixjQUFjLENBQUMyQixLQUFLLEdBQUczQixjQUFjLENBQUN5QixPQUFPLElBQUksSUFBSTtFQUMvRTlXLE1BQU0sQ0FBQzZGLEtBQUssQ0FBQzRQLFlBQVksQ0FBQyxDQUFDekIsZUFBZSxFQUFBVSxrQkFBQSxHQUFDN08sS0FBSyxDQUFDMlAsV0FBVyxjQUFBZCxrQkFBQSxjQUFBQSxrQkFBQSxHQUFJLENBQUMsQ0FBQztFQUNsRTFVLE1BQU0sQ0FBQyxFQUFBMlUsbUJBQUEsR0FBQzlPLEtBQUssQ0FBQzRQLFlBQVksY0FBQWQsbUJBQUEsY0FBQUEsbUJBQUEsR0FBSSxDQUFDLE1BQUFDLG1CQUFBLEdBQUsvTyxLQUFLLENBQUMyUCxXQUFXLGNBQUFaLG1CQUFBLGNBQUFBLG1CQUFBLEdBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQ3FDLHNCQUFzQixDQUFDLElBQUssQ0FBQztFQUMxRmpYLE1BQU0sQ0FBQzZGLEtBQUssQ0FBQzZQLFNBQVMsQ0FBQyxDQUFDdUIsc0JBQXNCLEVBQUFwQyxvQkFBQSxHQUFDaFAsS0FBSyxDQUFDNFAsWUFBWSxjQUFBWixvQkFBQSxjQUFBQSxvQkFBQSxHQUFJLENBQUMsQ0FBQztFQUN2RTdVLE1BQU0sQ0FBQzZGLEtBQUssQ0FBQytQLGVBQWUsQ0FBQyxDQUFDcUIsc0JBQXNCLEVBQUFuQyxnQkFBQSxHQUFDalAsS0FBSyxDQUFDNlAsU0FBUyxjQUFBWixnQkFBQSxjQUFBQSxnQkFBQSxHQUFJLENBQUMsQ0FBQztFQUMxRTlVLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDLEVBQUE5QixxQkFBQSxHQUFDbFAsS0FBSyxDQUFDZ1Esc0JBQXNCLGNBQUFkLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksQ0FBQyxNQUFBQyxxQkFBQSxHQUFLblAsS0FBSyxDQUFDOFAsZ0JBQWdCLGNBQUFYLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDL0UsbUJBQW1CLENBQUMsSUFBSSxDQUFDO0VBQy9HalEsTUFBTSxFQUFBaVYsc0JBQUEsR0FBRXBQLEtBQUssQ0FBQzhQLGdCQUFnQixjQUFBVixzQkFBQSxjQUFBQSxzQkFBQSxHQUFJLENBQUUsQ0FBQyxDQUFDZ0Msc0JBQXNCLENBQUM1QixjQUFjLENBQUN5QixPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztFQUNsRzlXLE1BQU0sRUFBQWtWLHFCQUFBLEdBQUVyUCxLQUFLLENBQUNrUSxxQkFBcUIsY0FBQWIscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxDQUFFLENBQUMsQ0FBQytCLHNCQUFzQixDQUFDNUIsY0FBYyxDQUFDMkIsS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7RUFDckdoWCxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBRSxFQUFBMUIsc0JBQUEsR0FBQ3RQLEtBQUssQ0FBQ2tRLHFCQUFxQixjQUFBWixzQkFBQSxjQUFBQSxzQkFBQSxHQUFJLENBQUMsTUFBQUMsc0JBQUEsR0FBS3ZQLEtBQUssQ0FBQ2dRLHNCQUFzQixjQUFBVCxzQkFBQSxjQUFBQSxzQkFBQSxHQUFJLENBQUMsQ0FBQyxHQUFJMkIsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDOUcsbUJBQW1CLENBQUMsR0FBRyxDQUFDO0VBQ3hJalEsTUFBTSxDQUFDa0wsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVRLFFBQVEsQ0FBQyxDQUFDc0ksZUFBZSxDQUFDLENBQUMsQ0FBQztFQUM5Q2hVLE1BQU0sQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFaEQsTUFBTSxDQUFDLENBQUMrTCxPQUFPLENBQUMsZ0JBQWdCLENBQUM7RUFDbkRqVSxNQUFNLENBQUMsQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFTyxLQUFLLEVBQWdDeUwsYUFBYSxDQUFDLENBQUNsRCxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQ3pGaFUsTUFBTSxDQUFDLE1BQU0rRCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxDQUFDLENBQUM2TSxPQUFPLENBQUM7SUFBRS9MLGlCQUFpQixFQUFFLENBQUM7SUFBRUMsY0FBYyxFQUFFO0VBQUUsQ0FBQyxDQUFDO0VBQ3pGLE1BQU1mLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSw4QkFBOEI7RUFBRSxDQUFDLENBQUM7RUFDN0YsTUFBTUwsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxvQ0FBb0MsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDakd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0Q3VKLEtBQUssRUFBRSw0REFBNEQ7SUFDbkVDLGlCQUFpQixFQUFFLElBQUs7SUFDeEIvQixjQUFjO0lBQ2QwQixnQkFBZ0I7SUFDaEJULGtCQUFrQjtJQUNsQmUsV0FBVyxFQUFFeFIsS0FBSztJQUNsQnlSLGtCQUFrQixFQUFFcE0sU0FBUztJQUM3QnFNLFdBQVcsRUFBRSxNQUFNeFQsZ0JBQWdCLENBQUNyRCxJQUFJO0VBQzFDLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGLEtBQUssTUFBTStTLE1BQU0sSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBVztFQUN4QzFULElBQUksQ0FBQyxVQUFVMFQsTUFBTSwrRkFBK0YsRUFBRSxPQUFPO0lBQUUvUyxJQUFJO0lBQUUyTDtFQUFRLENBQUMsS0FBSztJQUFBLElBQUFtTCxLQUFBLEVBQUFDLGNBQUEsRUFBQUMscUJBQUEsRUFBQUMsa0JBQUEsRUFBQUMsaUJBQUE7SUFDako3WCxJQUFJLENBQUNzTyxVQUFVLENBQUMsS0FBTSxDQUFDO0lBQ3ZCLE1BQU0zTixJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3hELE1BQU1yTCxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0lBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLDJDQUEyQ3lTLE1BQU0sWUFBWSxDQUFDO0lBQzlFLElBQUlBLE1BQU0sS0FBSyxHQUFHLEVBQUUsTUFBTXpULE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM2TCxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQ3RHO01BQ0gsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQzZCLFdBQVcsQ0FBQyxDQUFDO01BQzdELE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM2QixXQUFXLENBQUMsQ0FBQztNQUMxRCxNQUFNNU8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDOEssVUFBVSxDQUFDLFlBQVksQ0FBQztJQUNuRjtJQUNBLE1BQU03WCxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRThOLEtBQXVCLElBQzdFQSxLQUFLLENBQUNDLFVBQVUsSUFBSUMsZ0JBQWdCLENBQUNDLGlCQUFpQixJQUFJSCxLQUFLLENBQUNJLFVBQVUsR0FBRyxDQUFDLENBQUMsRUFBRTtNQUFFakYsT0FBTyxFQUFFO0lBQU8sQ0FBQyxDQUFDLENBQUNILElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbEgsTUFBTTlNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMrSyxlQUFlLENBQUMsc0JBQXNCLEVBQUUsU0FBUyxDQUFDO0lBQzlGLE1BQU1wWCxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTUssUUFBUSxDQUFDMFQsS0FBSyxDQUFDQyxLQUFLLENBQUM7SUFDL0MsTUFBTWhZLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLE1BQU07TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDLENBQUN1TCxjQUFjLENBQUMsQ0FBQztJQUN0RixJQUFJeEUsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNsQixNQUFNelQsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO1FBQUUxSixJQUFJLEVBQUU7TUFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQ2tWLGNBQWMsQ0FBQyxDQUFDO01BQ3pGLE1BQU1qWSxNQUFNLENBQUNVLElBQUksQ0FBQ3dYLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDRCxjQUFjLENBQUMsQ0FBQztJQUNoRSxDQUFDLE1BQU07TUFDTCxNQUFNalksTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDa0wsY0FBYyxDQUFDLENBQUM7TUFDekUsTUFBTWpZLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDd1gsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUNELGNBQWMsQ0FBQyxDQUFDO0lBQ2hFO0lBQ0EsTUFBTUUsUUFBUSxHQUFHelgsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGtCQUFrQixDQUFDO0lBQ2pELE1BQU1xTCxlQUFlLEdBQUcsTUFBTUQsUUFBUSxDQUFDRSxXQUFXLENBQUMsQ0FBQztJQUNwRCxNQUFNNVgsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU1WLE1BQU0sQ0FBQ21ZLFFBQVEsQ0FBQyxDQUFDbkwsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0lBQ3ZELE1BQU1zTCxlQUFlLEdBQUcsTUFBTUgsUUFBUSxDQUFDRSxXQUFXLENBQUMsQ0FBQztJQUNwRHJZLE1BQU0sQ0FBQ3NZLGVBQWUsQ0FBQyxDQUFDNUIsR0FBRyxDQUFDNUosSUFBSSxDQUFDc0wsZUFBZSxDQUFDO0lBQ2pELE1BQU0xWCxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHVCQUF1QjtJQUFFLENBQUMsQ0FBQztJQUNwSCxNQUFNOVgsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU1WLE1BQU0sQ0FBQ21ZLFFBQVEsQ0FBQyxDQUFDTixVQUFVLENBQUNPLGVBQWUsYUFBZkEsZUFBZSxjQUFmQSxlQUFlLEdBQUksRUFBRSxDQUFDO0lBQ3hELE1BQU1wWSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzNFLE1BQU01USxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzNFLE1BQU01USxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDK0QsTUFBTSxDQUFDO01BQUUwSCxPQUFPLEVBQUU7SUFBVyxDQUFDLENBQUMsQ0FBQ3pMLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQ3BJLE1BQU02SCxhQUFhLEdBQUcvWCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsUUFBUTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDO0lBQy9FLE1BQU0xTSxNQUFNLENBQUN5WSxhQUFhLENBQUMsQ0FBQzlMLFdBQVcsQ0FBQyxDQUFDO0lBQ3pDM00sTUFBTSxDQUFDLE1BQU0rRCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxDQUFDLENBQUM2TSxPQUFPLENBQUM7TUFBRS9MLGlCQUFpQixFQUFFLENBQUM7TUFBRUMsY0FBYyxFQUFFO0lBQUUsQ0FBQyxDQUFDO0lBQ3pGLE1BQU1pWCxjQUFjLEdBQUcsTUFBTWhZLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO01BQy9DLE1BQU0yVSxPQUFPLEdBQUlDLFFBQWdCLElBQUs7UUFBQSxJQUFBQyxxQkFBQSxFQUFBQyxvQkFBQTtRQUNwQyxNQUFNL0osT0FBTyxHQUFHMUssUUFBUSxDQUFDZ0wsYUFBYSxDQUFDdUosUUFBUSxDQUFDO1FBQ2hELElBQUksQ0FBQzdKLE9BQU8sRUFBRSxPQUFPLElBQUk7UUFDekIsTUFBTWdLLElBQUksR0FBR2hLLE9BQU8sQ0FBQ0kscUJBQXFCLENBQUMsQ0FBQztRQUM1QyxNQUFNSCxLQUFLLEdBQUdDLGdCQUFnQixDQUFDRixPQUFPLENBQUM7UUFDdkMsT0FBTztVQUNMaUssSUFBSSxHQUFBSCxxQkFBQSxJQUFBQyxvQkFBQSxHQUFFL0osT0FBTyxDQUFDc0osV0FBVyxjQUFBUyxvQkFBQSx1QkFBbkJBLG9CQUFBLENBQXFCRyxJQUFJLENBQUMsQ0FBQyxjQUFBSixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLEVBQUU7VUFDdkNLLENBQUMsRUFBRUgsSUFBSSxDQUFDRyxDQUFDO1VBQUVDLENBQUMsRUFBRUosSUFBSSxDQUFDSSxDQUFDO1VBQUU1TSxLQUFLLEVBQUV3TSxJQUFJLENBQUN4TSxLQUFLO1VBQUVDLE1BQU0sRUFBRXVNLElBQUksQ0FBQ3ZNLE1BQU07VUFDNURxRCxLQUFLLEVBQUViLEtBQUssQ0FBQ2EsS0FBSztVQUFFdUosT0FBTyxFQUFFcEssS0FBSyxDQUFDb0ssT0FBTztVQUFFQyxVQUFVLEVBQUVySyxLQUFLLENBQUNxSyxVQUFVO1VBQUVDLE9BQU8sRUFBRXRLLEtBQUssQ0FBQ3NLO1FBQzNGLENBQUM7TUFDSCxDQUFDO01BQ0QsT0FBTztRQUNMQyxJQUFJLEVBQUVaLE9BQU8sQ0FBQyxZQUFZLENBQUM7UUFBRWEsS0FBSyxFQUFFYixPQUFPLENBQUMsbUJBQW1CLENBQUM7UUFDaEVoWSxNQUFNLEVBQUVnWSxPQUFPLENBQUMsaUJBQWlCLENBQUM7UUFBRWMsSUFBSSxFQUFFZCxPQUFPLENBQUMsZ0JBQWdCLENBQUM7UUFDbkVlLFdBQVcsRUFBRXJWLFFBQVEsQ0FBQzBULEtBQUssQ0FBQzRCLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQztRQUN6REMsWUFBWSxFQUFFM0ssZ0JBQWdCLENBQUM1SyxRQUFRLENBQUNnTCxhQUFhLENBQUMsa0JBQWtCLENBQUUsQ0FBQyxDQUFDd0ssVUFBVTtRQUN0RmxKLE9BQU8sRUFBRXJQLE1BQU0sQ0FBQ3FQO01BQ2xCLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRixNQUFNalEsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyxxQkFBcUI7SUFBRSxDQUFDLENBQUM7SUFFbEgsTUFBTXVCLFFBQVEsR0FBRyxNQUFNcFosSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUNnTixXQUFXLENBQUMsQ0FBQztJQUNwRSxNQUFNQyxJQUFJLEdBQUcsTUFBTXRaLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDZ04sV0FBVyxDQUFDLENBQUM7SUFDaEUsTUFBTUUsUUFBUSxHQUFHLE1BQU12WixJQUFJLENBQUNxTSxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQ2dOLFdBQVcsQ0FBQyxDQUFDO0lBQ3JFL1osTUFBTSxDQUFDOFosUUFBUSxDQUFDLENBQUNwRCxHQUFHLENBQUNDLFFBQVEsQ0FBQyxDQUFDO0lBQy9CM1csTUFBTSxDQUFDZ2EsSUFBSSxDQUFDLENBQUN0RCxHQUFHLENBQUNDLFFBQVEsQ0FBQyxDQUFDO0lBQzNCM1csTUFBTSxDQUFDaWEsUUFBUSxDQUFDLENBQUN2RCxHQUFHLENBQUNDLFFBQVEsQ0FBQyxDQUFDO0lBQy9CLElBQUltRCxRQUFRLEVBQUU7TUFBQSxJQUFBSSxPQUFBO01BQ1osTUFBTUMsTUFBTSxHQUFHTCxRQUFRLENBQUNaLENBQUMsR0FBR1ksUUFBUSxDQUFDdk4sS0FBSyxHQUFHLENBQUM7TUFDOUMsTUFBTTZOLGFBQWEsR0FBRyxNQUFNMVosSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQ0MsV0FBVyxHQUFHLENBQUMsQ0FBQztNQUN6RnRhLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDc0QsTUFBTSxHQUFHQyxhQUFhLENBQUMsQ0FBQyxDQUFDbkssbUJBQW1CLENBQUMsQ0FBQyxDQUFDO01BQy9ELE1BQU1zSixJQUFJLEdBQUcsTUFBTTdZLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ3FOLFdBQVcsQ0FBQyxDQUFDO01BQ3hGL1osTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMsRUFBQXFELE9BQUEsR0FBQ1gsSUFBSSxhQUFKQSxJQUFJLHVCQUFKQSxJQUFJLENBQUVMLENBQUMsY0FBQWdCLE9BQUEsY0FBQUEsT0FBQSxHQUFJLENBQUMsR0FBRyxJQUFJSixRQUFRLENBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUNqSixtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDekU7SUFDQSxJQUFJNkosUUFBUSxJQUFJckcsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUM5QixNQUFNOEcsS0FBSyxHQUFHLE1BQU03WixJQUFJLENBQUNxTSxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUNnTixXQUFXLENBQUMsQ0FBQztNQUMvRC9aLE1BQU0sQ0FBQ3VhLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFaE8sS0FBSyxDQUFDLENBQUNPLElBQUksQ0FBQyxHQUFHLENBQUM7TUFDOUI5TSxNQUFNLENBQUN1YSxLQUFLLENBQUVyQixDQUFDLElBQUlZLFFBQVEsQ0FBQ1osQ0FBQyxHQUFHWSxRQUFRLENBQUN2TixLQUFLLENBQUMsQ0FBQyxDQUFDMEssc0JBQXNCLENBQUMsRUFBRSxDQUFDO01BQzNFalgsTUFBTSxDQUFDOFosUUFBUSxDQUFDWixDQUFDLENBQUMsQ0FBQ2pDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUMvQztJQUNBLElBQUkrQyxJQUFJLElBQUlDLFFBQVEsSUFBSXhHLE1BQU0sS0FBSyxHQUFHLEVBQUV6VCxNQUFNLENBQUNpYSxRQUFRLENBQUNkLENBQUMsSUFBSWEsSUFBSSxDQUFDYixDQUFDLEdBQUdhLElBQUksQ0FBQ3hOLE1BQU0sQ0FBQyxDQUFDLENBQUN5SyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDOUcsTUFBTXVELGtCQUFrQixHQUFHLE1BQUFBLENBQUEsS0FBWTtNQUNyQyxJQUFJL0csTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNwQixNQUFNdkUsTUFBTSxHQUFHLE1BQU14TyxJQUFJLENBQUNzRCxRQUFRLENBQUMsT0FBTztRQUN4Q3lXLE1BQU0sRUFBRXBXLFFBQVEsQ0FBQ2dMLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFFRixxQkFBcUIsQ0FBQyxDQUFDLENBQUNnSyxDQUFDO1FBQzVFdUIsTUFBTSxFQUFFclcsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFFRixxQkFBcUIsQ0FBQyxDQUFDLENBQUNnSztNQUMzRSxDQUFDLENBQUMsQ0FBQztNQUNIblosTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMzSCxNQUFNLENBQUN3TCxNQUFNLEdBQUd4TCxNQUFNLENBQUN1TCxNQUFNLENBQUMsQ0FBQyxDQUFDeEssbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFDRCxNQUFNdUssa0JBQWtCLENBQUMsQ0FBQztJQUUxQixNQUFNOVosSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLFVBQVU7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUN6RSxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUMsQ0FBQyxDQUFDSixlQUFlLENBQUMsR0FBRyxDQUFDO0lBQzVILE1BQU10VCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsT0FBTztNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLE1BQU1sTSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsUUFBUTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU05SSxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQyxFQUFFZSxjQUFjLENBQUMsQ0FBQ3FMLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFcEYsTUFBTXBNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxRQUFRO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDdkUsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTlJLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLEVBQUVlLGNBQWMsQ0FBQyxDQUFDcUwsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRixNQUFNME4sa0JBQWtCLENBQUMsQ0FBQztJQUMxQixNQUFNRyxlQUFlLEdBQUdsSCxNQUFNLEtBQUssR0FBRyxHQUFHL1MsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLEdBQUdyTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsMkJBQTJCLENBQUM7SUFDMUgsTUFBTS9NLE1BQU0sQ0FBQzJhLGVBQWUsQ0FBQyxDQUFDM04sYUFBYSxDQUFDLGlFQUFpRSxDQUFDO0lBQzlHLE1BQU1oTixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRTtJQUE0QyxDQUFDLENBQUMsQ0FBQyxDQUFDNk4sV0FBVyxDQUFDLENBQUMsQ0FBQztJQUM1RyxNQUFNdkQscUJBQXFCLENBQUMzTSxJQUFJLEVBQUUrUyxNQUFNLENBQUM7SUFDekMsTUFBTStHLGtCQUFrQixDQUFDLENBQUM7SUFDMUIsTUFBTTlaLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMseUJBQXlCO0lBQUUsQ0FBQyxDQUFDO0lBRXRILE1BQU1xQyxLQUFLLEdBQUdsYSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDO0lBQ25DLE1BQU1yTSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsV0FBVztNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQzFFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTStOLEtBQUssQ0FBQzVXLFFBQVEsQ0FBRStLLE9BQXlCLElBQUtBLE9BQU8sQ0FBQ3FGLFdBQVcsQ0FBQyxDQUFDLENBQUNKLGVBQWUsQ0FBQyxJQUFJLENBQUM7SUFDakhoVSxNQUFNLENBQUMsTUFBTTRhLEtBQUssQ0FBQ0MsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUN6SyxTQUFTLENBQUMsT0FBTyxDQUFDO0lBRTFELElBQUlxRCxNQUFNLEtBQUssR0FBRyxFQUFFO01BQUEsSUFBQXFILEtBQUEsRUFBQUMscUJBQUE7TUFDbEIsTUFBTXJhLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7TUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUNtQyxXQUFXLENBQUMsQ0FBQztNQUNwRCxNQUFNbE8sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHVDQUF1QztNQUFFLENBQUMsQ0FBQztNQUN0RyxNQUFNUyxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUNBLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxXQUFXO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ3NPLElBQUksQ0FBQyxDQUFDLENBQUNwTyxLQUFLLENBQUMsQ0FBQztNQUNyRyxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQ3dPLFVBQVUsQ0FBQyxDQUFDO01BQ25ELE1BQU1DLFlBQVksR0FBRyxNQUFNelIsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO01BQzlDVixNQUFNLENBQUMyQyxNQUFNLENBQUM0UCxNQUFNLEVBQUF1SSxLQUFBLElBQUFDLHFCQUFBLEdBQUNHLFlBQVksQ0FBQzVRLE9BQU8sY0FBQXlRLHFCQUFBLHVCQUFwQkEscUJBQUEsQ0FBc0JsUSxjQUFjLGNBQUFpUSxLQUFBLGNBQUFBLEtBQUEsR0FBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDM04sWUFBWSxDQUFDLENBQUMsQ0FBQztNQUMzRyxNQUFNZ08sb0JBQW9CLEdBQUcsTUFBTXBYLGdCQUFnQixDQUFDckQsSUFBSSxDQUFDO01BQ3pELE1BQU1BLElBQUksQ0FBQzBhLE1BQU0sQ0FBQyxDQUFDO01BQ25CLE1BQU1wYixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxXQUFXO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztNQUN4RjNNLE1BQU0sQ0FBQyxNQUFNK0QsZ0JBQWdCLENBQUNyRCxJQUFJLENBQUMsQ0FBQyxDQUFDNk0sT0FBTyxDQUFDNE4sb0JBQW9CLENBQUM7TUFDbEUsTUFBTXphLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztRQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSwwQ0FBMEM7TUFBRSxDQUFDLENBQUM7SUFDM0c7SUFFQSxNQUFNUyxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLEdBQUc7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3ZELElBQUlpSCxNQUFNLEtBQUssR0FBRyxFQUFFLE1BQU16VCxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7TUFBRTFKLElBQUksRUFBRTtJQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUN0RztNQUNILE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM2QixXQUFXLENBQUMsQ0FBQztNQUN0RSxNQUFNNU8sTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsU0FBUyxFQUFFO1FBQUUxSixJQUFJLEVBQUU7TUFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO01BQ3RGLE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQ3dYLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDdEosV0FBVyxDQUFDLENBQUM7SUFDN0Q7SUFDQSxNQUFNeU0sa0JBQWtCLEdBQUcsTUFBTTNhLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUNnVyxlQUFlLENBQUNpQixXQUFXLEdBQUdoYSxNQUFNLENBQUNpYSxVQUFVLENBQUM7SUFDOUd2YixNQUFNLENBQUNxYixrQkFBa0IsQ0FBQyxDQUFDdk8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUN0QyxNQUFNck0sZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO0lBQ2pDLE1BQU1WLE1BQU0sQ0FBQ21ZLFFBQVEsQ0FBQyxDQUFDbkwsYUFBYSxDQUFDLGlCQUFpQixDQUFDO0lBQ3ZEaE4sTUFBTSxDQUFDLE1BQU1VLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUNnVyxlQUFlLENBQUNpQixXQUFXLEdBQUdoYSxNQUFNLENBQUNpYSxVQUFVLENBQUMsQ0FBQyxDQUFDek8sSUFBSSxDQUFDLEtBQUssQ0FBQztJQUN2RyxNQUFNME8sVUFBVSxHQUFHLE1BQU05YSxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ2dOLFdBQVcsQ0FBQyxDQUFDO0lBQ3JFL1osTUFBTSxDQUFDd2IsVUFBVSxhQUFWQSxVQUFVLHVCQUFWQSxVQUFVLENBQUVoUCxNQUFNLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUNyRCxNQUFNdlcsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyxzQkFBc0I7SUFBRSxDQUFDLENBQUM7SUFDbkgsTUFBTTlYLGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNqQyxNQUFNQSxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLG9CQUFvQjtJQUFFLENBQUMsQ0FBQztJQUNqSCxNQUFNN1gsSUFBSSxDQUFDNEwsZUFBZSxDQUFDO01BQUVDLEtBQUssRUFBRSxJQUFJO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsQ0FBQztJQUV4RCxNQUFNOUwsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLE1BQU07TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxJQUFJa04sTUFBTSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDOUQsTUFBTWhiLGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNqQyxNQUFNVixNQUFNLENBQUNtWSxRQUFRLENBQUMsQ0FBQ25MLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztJQUN2RCxNQUFNdE0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyxxQkFBcUI7SUFBRSxDQUFDLENBQUM7SUFDbEgsTUFBTTlYLGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztJQUNqQyxNQUFNNE4sbUJBQW1CLENBQUM1TixJQUFJLEVBQUUrUyxNQUFNLENBQUM7SUFDdkMsTUFBTS9TLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxNQUFNO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsSUFBSWtOLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQzlELE1BQU1oYixlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDakMsTUFBTVYsTUFBTSxDQUFDbVksUUFBUSxDQUFDLENBQUNuTCxhQUFhLENBQUMsaUJBQWlCLENBQUM7SUFDdkQsTUFBTXRNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMscUJBQXFCO0lBQUUsQ0FBQyxDQUFDO0lBQ2xILE1BQU05WCxlQUFlLENBQUNDLElBQUksRUFBRSxJQUFJLENBQUM7SUFDakMsTUFBTTROLG1CQUFtQixDQUFDNU4sSUFBSSxFQUFFK1MsTUFBTSxDQUFDO0lBRXZDLE1BQU1sSixLQUFLLEdBQUcsTUFBTWQsYUFBYSxDQUFDL0ksSUFBSSxDQUFDO0lBQ3ZDVixNQUFNLENBQUN1SyxLQUFLLENBQUNBLEtBQUssQ0FBQ3VHLE1BQU0sQ0FBRTVGLFNBQVMsSUFBS0EsU0FBUyxDQUFDSSxPQUFPLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQzZCLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDNUZuTixNQUFNLENBQUMyQyxNQUFNLENBQUM0UCxNQUFNLEVBQUFpRixLQUFBLElBQUFDLGNBQUEsR0FBQ2xOLEtBQUssQ0FBQ0QsT0FBTyxjQUFBbU4sY0FBQSx1QkFBYkEsY0FBQSxDQUFlNU0sY0FBYyxjQUFBMk0sS0FBQSxjQUFBQSxLQUFBLEdBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQ3JLLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDcEcsTUFBTXpNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsK0JBQStCO0lBQUUsQ0FBQyxDQUFDO0lBRTVILElBQUk5RSxNQUFNLEtBQUssR0FBRyxFQUFFO01BQ2xCLE1BQU0vUyxJQUFJLENBQUNnYixLQUFLLENBQUMsMEJBQTBCLEVBQUdBLEtBQUssSUFBS0EsS0FBSyxDQUFDQyxPQUFPLENBQUM7UUFBRUMsTUFBTSxFQUFFLEdBQUc7UUFBRUMsSUFBSSxFQUFFO01BQTZDLENBQUMsQ0FBQyxDQUFDO01BQzNJLE1BQU1uYixJQUFJLENBQUM0TCxlQUFlLENBQUM7UUFBRUMsS0FBSyxFQUFFLEdBQUc7UUFBRUMsTUFBTSxFQUFFO01BQUksQ0FBQyxDQUFDO01BQ3ZELE1BQU05TCxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTFDLE1BQU0sQ0FBQ3dhLFFBQVEsQ0FBQyxDQUFDLEVBQUV6WCxRQUFRLENBQUNnVyxlQUFlLENBQUMwQixZQUFZLENBQUMsQ0FBQztNQUNwRi9iLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTFDLE1BQU0sQ0FBQ3FQLE9BQU8sQ0FBQyxDQUFDLENBQUNxRCxlQUFlLENBQUMsQ0FBQyxDQUFDO01BQ3BFLE1BQU10VCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQUUxSixJQUFJLEVBQUUsTUFBTTtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUMxSSxRQUFRLENBQUVnWSxNQUF5QixJQUFLQSxNQUFNLENBQUNwUCxLQUFLLENBQUMsQ0FBQyxDQUFDO01BQ3JILE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLDhCQUE4QixDQUFDO01BQzVELE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFBRTFKLElBQUksRUFBRTtNQUFjLENBQUMsQ0FBQyxDQUFDLENBQUNrVixjQUFjLENBQUMsQ0FBQztNQUNqRixNQUFNalksTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTFDLE1BQU0sQ0FBQ3FQLE9BQU8sQ0FBQyxDQUFDLENBQUM3RCxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQ3BFLE1BQU05TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQztRQUFBLElBQUFpWSxzQkFBQTtRQUFBLFFBQUFBLHNCQUFBLEdBQU01WCxRQUFRLENBQUNvTSxhQUFhLGNBQUF3TCxzQkFBQSx1QkFBdEJBLHNCQUFBLENBQXdCQyxPQUFPO01BQUEsRUFBQyxDQUFDLENBQUNwUCxJQUFJLENBQUMsSUFBSSxDQUFDO01BQ3hGLE1BQU1wTSxJQUFJLENBQUM0TCxlQUFlLENBQUM7UUFBRUMsS0FBSyxFQUFFLElBQUk7UUFBRUMsTUFBTSxFQUFFO01BQUksQ0FBQyxDQUFDO0lBQzFELENBQUMsTUFBTTtNQUNMLE1BQU05TCxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQUUxSixJQUFJLEVBQUUsTUFBTTtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO01BQ3JFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDbUMsV0FBVyxDQUFDLENBQUM7TUFDcEQsTUFBTWxPLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxnQkFBZ0I7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztNQUMvRSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQywyRUFBMkUsQ0FBQztNQUN6RyxNQUFNN04sSUFBSSxDQUFDcVMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUNuRyxLQUFLLENBQUMsQ0FBQztNQUN4RCxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxrRUFBa0UsQ0FBQztNQUNoRyxNQUFNdk8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7SUFDekU7SUFFQSxJQUFJK0osYUFBYSxHQUFHLE1BQU0xUyxhQUFhLENBQUMvSSxJQUFJLENBQUM7SUFDN0NWLE1BQU0sRUFBQTBYLHFCQUFBLEdBQUN5RSxhQUFhLENBQUM3UixPQUFPLGNBQUFvTixxQkFBQSx1QkFBckJBLHFCQUFBLENBQXVCNU0sdUJBQXVCLENBQUMsQ0FBQzRELFVBQVUsQ0FBQyxDQUFDO0lBQ25FMU8sTUFBTSxDQUFDbWMsYUFBYSxDQUFDMVIsU0FBUyxDQUFDLENBQUMwQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0lBQy9DLE1BQU1sQixRQUFRLEdBQUdrUSxhQUFhLENBQUMxUixTQUFTLENBQUMsQ0FBQyxDQUF1RTtJQUNqSHpLLE1BQU0sQ0FBQ2lNLFFBQVEsQ0FBQ0UsYUFBYSxDQUFDLENBQUNXLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztJQUN6RDlNLE1BQU0sQ0FBQ2lNLFFBQVEsQ0FBQ0csS0FBSyxDQUFDLENBQUNlLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDdENuTixNQUFNLENBQUNpTSxRQUFRLENBQUNDLGFBQWEsQ0FBQyxDQUFDK0gsT0FBTyxDQUFDLGdCQUFnQixDQUFDO0lBRXhELElBQUlSLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFBQSxJQUFBMkksc0JBQUEsRUFBQUMsc0JBQUE7TUFDbEIsTUFBTXZRLFVBQVUsR0FBR2pGLE1BQU0sRUFBQXVWLHNCQUFBLElBQUFDLHNCQUFBLEdBQUNGLGFBQWEsQ0FBQzdSLE9BQU8sY0FBQStSLHNCQUFBLHVCQUFyQkEsc0JBQUEsQ0FBdUJ0UixzQkFBc0IsY0FBQXFSLHNCQUFBLGNBQUFBLHNCQUFBLEdBQUksRUFBRSxDQUFDO01BQzlFcGMsTUFBTSxDQUFDOEwsVUFBVSxDQUFDLENBQUM0QyxVQUFVLENBQUMsQ0FBQztNQUMvQixNQUFNaE8sSUFBSSxDQUFDTSxJQUFJLENBQUMsc0RBQXNEc2Isa0JBQWtCLENBQUN4USxVQUFVLENBQUMsRUFBRSxDQUFDO0lBQ3pHO0lBQ0EsTUFBTTlMLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO0lBQzlFLE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDK0QsTUFBTSxDQUFDO01BQUUwSCxPQUFPLEVBQUU7SUFBUyxDQUFDLENBQUMsQ0FBQyxDQUFDNUosV0FBVyxDQUFDLENBQUM7SUFDNUcsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQ3FGLFdBQVcsQ0FBQyxDQUFDO0lBQzdEcFMsTUFBTSxDQUFDLE1BQU1VLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNMUMsTUFBTSxDQUFDcVAsT0FBTyxDQUFDLENBQUMsQ0FBQzdELElBQUksQ0FBQyxDQUFDLENBQUM7SUFDekQ5TSxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM4QixLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMvQixJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVFOU0sTUFBTSxDQUFDLE1BQU1VLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDK0QsTUFBTSxDQUFDO01BQUUwSCxPQUFPLEVBQUU7SUFBc0IsQ0FBQyxDQUFDLENBQUN6TCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQzhCLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQy9CLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFcEosSUFBSTJHLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFDbEIsTUFBTXpULE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtRQUFFMUosSUFBSSxFQUFFLGdCQUFnQjtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ2tDLFdBQVcsQ0FBQyxDQUFDO01BQzdGLE1BQU01TyxNQUFNLENBQUNVLElBQUksQ0FBQzZiLFNBQVMsQ0FBQyxrR0FBa0csQ0FBQyxDQUFDLENBQUMzTixXQUFXLENBQUMsQ0FBQztNQUM5SSxNQUFNbE8sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHlDQUF5QztNQUFFLENBQUMsQ0FBQztNQUN4RyxNQUFNUyxJQUFJLENBQUM4YixPQUFPLENBQUMsMEJBQTBCLENBQUM7TUFDOUMsTUFBTTliLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxnQkFBZ0I7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNqRjtJQUVBLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQzZiLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMzTixXQUFXLENBQUM7TUFBRTNCLE9BQU8sRUFBRTtJQUFPLENBQUMsQ0FBQztJQUMxRixNQUFNd1AsV0FBVyxHQUFHL2IsSUFBSSxDQUFDcVMsV0FBVyxDQUFDLGNBQWMsQ0FBQztJQUNwRCxNQUFNL1MsTUFBTSxDQUFDeWMsV0FBVyxDQUFDLENBQUMzRSxlQUFlLENBQUMsYUFBYSxFQUFFLEtBQUssQ0FBQztJQUMvRCxNQUFNOVgsTUFBTSxDQUFDeWMsV0FBVyxDQUFDLENBQUMzRSxlQUFlLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQztJQUMxRCxNQUFNOVgsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNJLFVBQVUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDcEYsSUFBSSxDQUFDLElBQUksQ0FBQztJQUMzRyxNQUFNOU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuRyxNQUFNNlAscUJBQXFCLEdBQUcsTUFBTUYsV0FBVyxDQUFDNUIsWUFBWSxDQUFDLG9CQUFvQixDQUFDO0lBQ2xGN2EsTUFBTSxDQUFDMmMscUJBQXFCLENBQUMsQ0FBQzFJLE9BQU8sQ0FBQyxjQUFjLENBQUM7SUFDckQsTUFBTXZULElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsNEJBQTRCO0lBQUUsQ0FBQyxDQUFDO0lBQ3pILE1BQU1xRSxZQUFZLEdBQUcsTUFBTWxjLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO01BQzdDLE1BQU1rTCxNQUFNLEdBQUkwSixRQUFnQixJQUFLO1FBQ25DLE1BQU03SixPQUFPLEdBQUcxSyxRQUFRLENBQUNnTCxhQUFhLENBQUN1SixRQUFRLENBQUM7UUFDaEQsSUFBSSxDQUFDN0osT0FBTyxFQUFFLE9BQU8sSUFBSTtRQUN6QixNQUFNZ0ssSUFBSSxHQUFHaEssT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO1FBQzVDLE9BQU87VUFBRStKLENBQUMsRUFBRUgsSUFBSSxDQUFDRyxDQUFDO1VBQUVDLENBQUMsRUFBRUosSUFBSSxDQUFDSSxDQUFDO1VBQUU1TSxLQUFLLEVBQUV3TSxJQUFJLENBQUN4TSxLQUFLO1VBQUVDLE1BQU0sRUFBRXVNLElBQUksQ0FBQ3ZNLE1BQU07VUFBRWlELE1BQU0sRUFBRXNKLElBQUksQ0FBQ3RKO1FBQU8sQ0FBQztNQUM5RixDQUFDO01BQ0QsT0FBTztRQUNMK0osS0FBSyxFQUFFdEssTUFBTSxDQUFDLG1CQUFtQixDQUFDO1FBQ2xDcUssSUFBSSxFQUFFckssTUFBTSxDQUFDLDJCQUEyQixDQUFDO1FBQ3pDMk4sTUFBTSxFQUFFM04sTUFBTSxDQUFDLHdCQUF3QixDQUFDO1FBQ3hDNE4sSUFBSSxFQUFFNU4sTUFBTSxDQUFDLHNCQUFzQixDQUFDO1FBQ3BDK0ssUUFBUSxFQUFFL0ssTUFBTSxDQUFDLCtCQUErQjtNQUNsRCxDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBQ0YsTUFBTXRQLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLCtCQUErQixDQUFDLEVBQUUxVyxJQUFJLENBQUNJLFNBQVMsQ0FBQzJhLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQzNKNWMsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMrRixZQUFZLENBQUNwRCxLQUFLLENBQUVMLENBQUMsSUFBSTFGLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQ3hELG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUMzRmpRLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDK0YsWUFBWSxDQUFDckQsSUFBSSxDQUFFSixDQUFDLElBQUkxRixNQUFNLEtBQUssR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUN4RCxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDMUZqUSxNQUFNLENBQUM0VyxJQUFJLENBQUNDLEdBQUcsQ0FBQytGLFlBQVksQ0FBQ0MsTUFBTSxDQUFFMUQsQ0FBQyxJQUFJMUYsTUFBTSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDeEQsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzlGalEsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMrRixZQUFZLENBQUNDLE1BQU0sQ0FBRXRRLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDMEQsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ3pFalEsTUFBTSxDQUFDNGMsWUFBWSxDQUFDRSxJQUFJLENBQUVyTixNQUFNLENBQUMsQ0FBQ1EsbUJBQW1CLENBQUMyTSxZQUFZLENBQUMzQyxRQUFRLENBQUVkLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDbkYsSUFBSTFGLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFDbEIsTUFBTWhULGVBQWUsQ0FBQ0MsSUFBSSxFQUFFLElBQUksQ0FBQztNQUNqQyxNQUFNVixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7UUFBRTFKLElBQUksRUFBRTtNQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUM7TUFDaEYsTUFBTWxPLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztRQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxpQ0FBaUM7TUFBRSxDQUFDLENBQUM7TUFDaEcsTUFBTVEsZUFBZSxDQUFDQyxJQUFJLEVBQUUsSUFBSSxDQUFDO01BQ2pDLE1BQU1WLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtRQUFFMUosSUFBSSxFQUFFO01BQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO0lBQ2hGO0lBQ0EsTUFBTWxPLElBQUksQ0FBQzRMLGVBQWUsQ0FBQ21ILE1BQU0sS0FBSyxHQUFHLEdBQUc7TUFBRWxILEtBQUssRUFBRSxHQUFHO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsR0FBRztNQUFFRCxLQUFLLEVBQUUsR0FBRztNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUM7SUFDdEcsTUFBTXhNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQ2lCLFdBQVcsSUFBSWhhLE1BQU0sQ0FBQ2lhLFVBQVUsQ0FBQyxDQUFDLENBQUN6TyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xILE1BQU05TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQywyQkFBMkIsQ0FBQyxDQUFDL0ksUUFBUSxDQUFFK0ssT0FBTyxJQUFLRSxnQkFBZ0IsQ0FBQ0YsT0FBTyxDQUFDLENBQUNnTyxTQUFTLENBQUMsQ0FBQyxDQUFDalEsSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUMxSSxNQUFNa1EsV0FBVyxHQUFHLE1BQU10YyxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtNQUM1QyxNQUFNa0wsTUFBTSxHQUFJMEosUUFBZ0IsSUFBSztRQUNuQyxNQUFNN0osT0FBTyxHQUFHMUssUUFBUSxDQUFDZ0wsYUFBYSxDQUFDdUosUUFBUSxDQUFDO1FBQ2hELElBQUksQ0FBQzdKLE9BQU8sRUFBRSxPQUFPLElBQUk7UUFDekIsTUFBTWdLLElBQUksR0FBR2hLLE9BQU8sQ0FBQ0kscUJBQXFCLENBQUMsQ0FBQztRQUM1QyxPQUFPO1VBQUUrSixDQUFDLEVBQUVILElBQUksQ0FBQ0csQ0FBQztVQUFFQyxDQUFDLEVBQUVKLElBQUksQ0FBQ0ksQ0FBQztVQUFFNU0sS0FBSyxFQUFFd00sSUFBSSxDQUFDeE0sS0FBSztVQUFFQyxNQUFNLEVBQUV1TSxJQUFJLENBQUN2TSxNQUFNO1VBQUVpRCxNQUFNLEVBQUVzSixJQUFJLENBQUN0SjtRQUFPLENBQUM7TUFDOUYsQ0FBQztNQUNELE9BQU87UUFDTG9OLE1BQU0sRUFBRTNOLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQztRQUN4Q3FLLElBQUksRUFBRXJLLE1BQU0sQ0FBQywyQkFBMkIsQ0FBQztRQUN6Q3NLLEtBQUssRUFBRXRLLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQztRQUNsQzROLElBQUksRUFBRTVOLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQztRQUNwQytLLFFBQVEsRUFBRS9LLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQztRQUNqRCtOLE1BQU0sRUFBRS9OLE1BQU0sQ0FBQyw4QkFBOEIsQ0FBQztRQUM5Q2dPLE1BQU0sRUFBRWhPLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQztRQUNwRGlPLE9BQU8sRUFBRW5VLEtBQUssQ0FBQ0MsSUFBSSxDQUFDNUUsUUFBUSxDQUFDK1ksZ0JBQWdCLENBQUMsb0NBQW9DLENBQUMsRUFBR3JPLE9BQU8sSUFBSztVQUNoRyxNQUFNZ0ssSUFBSSxHQUFHaEssT0FBTyxDQUFDSSxxQkFBcUIsQ0FBQyxDQUFDO1VBQzVDLE9BQU87WUFBRStKLENBQUMsRUFBRUgsSUFBSSxDQUFDRyxDQUFDO1lBQUVDLENBQUMsRUFBRUosSUFBSSxDQUFDSSxDQUFDO1lBQUU1TSxLQUFLLEVBQUV3TSxJQUFJLENBQUN4TSxLQUFLO1lBQUVDLE1BQU0sRUFBRXVNLElBQUksQ0FBQ3ZNLE1BQU07WUFBRWlELE1BQU0sRUFBRXNKLElBQUksQ0FBQ3RKO1VBQU8sQ0FBQztRQUM5RixDQUFDO01BQ0gsQ0FBQztJQUNILENBQUMsQ0FBQztJQUNGLE1BQU0vTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHlCQUF5QixDQUFDO01BQUV6RixRQUFRLEVBQUU7SUFBSyxDQUFDLENBQUM7SUFDdEksTUFBTWxULFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLEVBQUUxVyxJQUFJLENBQUNJLFNBQVMsQ0FBQythLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQ3ZKaGQsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUNtRyxXQUFXLENBQUNILE1BQU0sQ0FBRTNELENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDakosbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ25FalEsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUNtRyxXQUFXLENBQUNILE1BQU0sQ0FBRXRRLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDMEQsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQ3hFalEsTUFBTSxDQUFDZ2QsV0FBVyxDQUFDSCxNQUFNLENBQUUxRCxDQUFDLENBQUMsQ0FBQ3JNLElBQUksQ0FBQzJHLE1BQU0sS0FBSyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUM5RHpULE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQ3pELElBQUksQ0FBRUosQ0FBQyxDQUFDLENBQUNyTSxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ3BDOU0sTUFBTSxDQUFDZ2QsV0FBVyxDQUFDeEQsS0FBSyxDQUFFTCxDQUFDLENBQUMsQ0FBQ3JNLElBQUksQ0FBQzJHLE1BQU0sS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztJQUMzRHpULE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQ0YsSUFBSSxDQUFFdFEsTUFBTSxDQUFDLENBQUN5SyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDM0RqWCxNQUFNLENBQUNnZCxXQUFXLENBQUMvQyxRQUFRLENBQUV6TixNQUFNLENBQUMsQ0FBQ3lLLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUMvRGpYLE1BQU0sQ0FBQ2dkLFdBQVcsQ0FBQ0MsTUFBTSxDQUFFelEsTUFBTSxDQUFDLENBQUN5SyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDN0RqWCxNQUFNLENBQUNnZCxXQUFXLENBQUNFLE1BQU0sQ0FBRTFRLE1BQU0sQ0FBQyxDQUFDeUssc0JBQXNCLENBQUMsRUFBRSxDQUFDO0lBQzdEalgsTUFBTSxDQUFDZ2QsV0FBVyxDQUFDRyxPQUFPLENBQUMsQ0FBQ2hRLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDM0NuTixNQUFNLENBQUNnZCxXQUFXLENBQUNHLE9BQU8sQ0FBQ0UsS0FBSyxDQUFFQyxNQUFNLElBQUtBLE1BQU0sQ0FBQzlRLE1BQU0sSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDTSxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQzdFOU0sTUFBTSxDQUFDZ2QsV0FBVyxDQUFDRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUVoRSxDQUFDLENBQUMsQ0FBQ25GLGVBQWUsQ0FBQ2dKLFdBQVcsQ0FBQ0csT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFFaEUsQ0FBQyxDQUFDO0lBQzVFLE1BQU16WSxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3hELE1BQU14TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUNnVyxlQUFlLENBQUMwQixZQUFZLElBQUl6YSxNQUFNLENBQUNpYyxXQUFXLENBQUMsQ0FBQyxDQUFDelEsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNwSCxNQUFNMFEsV0FBVyxHQUFHLE1BQU05YyxJQUFJLENBQUNzRCxRQUFRLENBQUMsTUFBTTtNQUM1QyxNQUFNa0wsTUFBTSxHQUFJMEosUUFBZ0IsSUFBSztRQUNuQyxNQUFNN0osT0FBTyxHQUFHMUssUUFBUSxDQUFDZ0wsYUFBYSxDQUFDdUosUUFBUSxDQUFDO1FBQ2hELElBQUksQ0FBQzdKLE9BQU8sRUFBRSxPQUFPLElBQUk7UUFDekIsTUFBTWdLLElBQUksR0FBR2hLLE9BQU8sQ0FBQ0kscUJBQXFCLENBQUMsQ0FBQztRQUM1QyxPQUFPO1VBQUUrSixDQUFDLEVBQUVILElBQUksQ0FBQ0csQ0FBQztVQUFFQyxDQUFDLEVBQUVKLElBQUksQ0FBQ0ksQ0FBQztVQUFFNU0sS0FBSyxFQUFFd00sSUFBSSxDQUFDeE0sS0FBSztVQUFFQyxNQUFNLEVBQUV1TSxJQUFJLENBQUN2TSxNQUFNO1VBQUVpRCxNQUFNLEVBQUVzSixJQUFJLENBQUN0SjtRQUFPLENBQUM7TUFDOUYsQ0FBQztNQUNELE9BQU87UUFDTGdPLGNBQWMsRUFBRXBaLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCLFlBQVk7UUFDckR2QyxLQUFLLEVBQUV0SyxNQUFNLENBQUMsbUJBQW1CLENBQUM7UUFDbENxSyxJQUFJLEVBQUVySyxNQUFNLENBQUMsMkJBQTJCLENBQUM7UUFDekN3TyxNQUFNLEVBQUV4TyxNQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDaEMyTixNQUFNLEVBQUUzTixNQUFNLENBQUMsd0JBQXdCLENBQUM7UUFDeEN5TyxJQUFJLEVBQUV6TyxNQUFNLENBQUMsMkJBQTJCLENBQUM7UUFDekM0TixJQUFJLEVBQUU1TixNQUFNLENBQUMsc0JBQXNCLENBQUM7UUFDcEMrSyxRQUFRLEVBQUUvSyxNQUFNLENBQUMsK0JBQStCLENBQUM7UUFDakQwTyxPQUFPLEVBQUUxTyxNQUFNLENBQUMsNEJBQTRCLENBQUM7UUFDN0NpTyxPQUFPLEVBQUVqTyxNQUFNLENBQUMsNEJBQTRCO01BQzlDLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRixNQUFNeE8sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQyw0QkFBNEI7SUFBRSxDQUFDLENBQUM7SUFDekgsTUFBTTNZLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLCtCQUErQixDQUFDLEVBQUUxVyxJQUFJLENBQUNJLFNBQVMsQ0FBQ3ViLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBQzFKeGQsTUFBTSxDQUFDd2QsV0FBVyxDQUFDQyxjQUFjLENBQUMsQ0FBQ3hOLG1CQUFtQixDQUFDLEdBQUcsQ0FBQztJQUMzRGpRLE1BQU0sRUFBQTJYLGtCQUFBLEdBQUM2RixXQUFXLENBQUNoRSxLQUFLLGNBQUE3QixrQkFBQSx1QkFBakJBLGtCQUFBLENBQW1Cd0IsQ0FBQyxDQUFDLENBQUNyTSxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ3JDOU0sTUFBTSxFQUFBNFgsaUJBQUEsR0FBQzRGLFdBQVcsQ0FBQ2pFLElBQUksY0FBQTNCLGlCQUFBLHVCQUFoQkEsaUJBQUEsQ0FBa0J1QixDQUFDLENBQUMsQ0FBQ3JNLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDcEM5TSxNQUFNLENBQUN3ZCxXQUFXLENBQUNoRSxLQUFLLENBQUUvSixNQUFNLENBQUMsQ0FBQ1EsbUJBQW1CLENBQUMsR0FBRyxDQUFDO0lBQzFELE1BQU00TixXQUFXLEdBQUdwSyxNQUFNLEtBQUssR0FBRyxHQUFHO01BQUUwRixDQUFDLEVBQUUsRUFBRTtNQUFFNU0sS0FBSyxFQUFFO0lBQUksQ0FBQyxHQUFHO01BQUU0TSxDQUFDLEVBQUUsRUFBRTtNQUFFNU0sS0FBSyxFQUFFO0lBQUksQ0FBQztJQUNsRnZNLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDMkcsV0FBVyxDQUFDWCxNQUFNLENBQUUxRCxDQUFDLEdBQUcwRSxXQUFXLENBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDbEosbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0lBQzlFalEsTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMyRyxXQUFXLENBQUNYLE1BQU0sQ0FBRXRRLEtBQUssR0FBR3NSLFdBQVcsQ0FBQ3RSLEtBQUssQ0FBQyxDQUFDLENBQUMwRCxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7SUFDdEZqUSxNQUFNLENBQUN3ZCxXQUFXLENBQUNWLElBQUksQ0FBRXJOLE1BQU0sQ0FBQyxDQUFDUSxtQkFBbUIsQ0FBQ3VOLFdBQVcsQ0FBQ3ZELFFBQVEsQ0FBRWQsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqRm5aLE1BQU0sQ0FBQ3dkLFdBQVcsQ0FBQ0wsT0FBTyxDQUFFM1EsTUFBTSxDQUFDLENBQUN5SyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDOURqWCxNQUFNLENBQUN3ZCxXQUFXLENBQUNMLE9BQU8sQ0FBRTFOLE1BQU0sQ0FBQyxDQUFDUSxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7SUFDNUQsTUFBTXZQLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztNQUFFQyxLQUFLLEVBQUUsSUFBSTtNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLENBQUM7SUFFeEQsTUFBTXNSLGNBQWMsR0FBR3BkLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDK0QsTUFBTSxDQUFDO01BQUUwSCxPQUFPLEVBQUU7SUFBVyxDQUFDLENBQUM7SUFDekcsTUFBTXVGLFNBQVMsR0FBR3JkLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDK0QsTUFBTSxDQUFDO01BQUUwSCxPQUFPLEVBQUU7SUFBUyxDQUFDLENBQUM7SUFDbEcsTUFBTXhZLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQytLLGVBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDO0lBQzFGLE1BQU05WCxNQUFNLENBQUM4ZCxjQUFjLENBQUMsQ0FBQ2hHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDO0lBQ3JFLE1BQU1nRyxjQUFjLENBQUNFLEtBQUssQ0FBQyxDQUFDO0lBQzVCLE1BQU10ZCxJQUFJLENBQUN1ZCxRQUFRLENBQUNDLEtBQUssQ0FBQyxPQUFPLENBQUM7SUFDbEMsTUFBTWxlLE1BQU0sQ0FBQzhkLGNBQWMsQ0FBQyxDQUFDaEcsZUFBZSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7SUFDcEUsTUFBTTlYLE1BQU0sQ0FBQ3ljLFdBQVcsQ0FBQyxDQUFDM0UsZUFBZSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUM7SUFDcEUsTUFBTXBYLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ0MsS0FBSyxDQUFDLFlBQVksQ0FBQztJQUN2QyxNQUFNbGUsTUFBTSxDQUFDK2QsU0FBUyxDQUFDLENBQUNqRyxlQUFlLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUMvRCxNQUFNOVgsTUFBTSxDQUFDK2QsU0FBUyxDQUFDLENBQUMzTCxXQUFXLENBQUMsQ0FBQztJQUNyQyxNQUFNMVIsSUFBSSxDQUFDdWQsUUFBUSxDQUFDQyxLQUFLLENBQUMsV0FBVyxDQUFDO0lBQ3RDLE1BQU1sZSxNQUFNLENBQUM4ZCxjQUFjLENBQUMsQ0FBQ2hHLGVBQWUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO0lBQ3BFLE1BQU05WCxNQUFNLENBQUM4ZCxjQUFjLENBQUMsQ0FBQzFMLFdBQVcsQ0FBQyxDQUFDO0lBQzFDLE1BQU0xUixJQUFJLENBQUN1ZCxRQUFRLENBQUNDLEtBQUssQ0FBQyxLQUFLLENBQUM7SUFDaEMsTUFBTWxlLE1BQU0sQ0FBQytkLFNBQVMsQ0FBQyxDQUFDakcsZUFBZSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7SUFDL0QsTUFBTXBYLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ0MsS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNqQyxNQUFNbGUsTUFBTSxDQUFDOGQsY0FBYyxDQUFDLENBQUNoRyxlQUFlLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztJQUNwRSxNQUFNcFgsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLE1BQU07TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUMsQ0FBQyxDQUFDSixlQUFlLENBQUMsR0FBRyxDQUFDO0lBQ2xILE1BQU1tSyxVQUFVLEdBQUcsTUFBTTFCLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQztJQUM3RixNQUFNMkosU0FBUyxDQUFDblIsS0FBSyxDQUFDLENBQUM7SUFDdkIsTUFBTTVNLE1BQU0sQ0FBQytkLFNBQVMsQ0FBQyxDQUFDakcsZUFBZSxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7SUFDL0QsTUFBTTlYLE1BQU0sQ0FBQzhkLGNBQWMsQ0FBQyxDQUFDaEcsZUFBZSxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUM7SUFDckUsTUFBTTlYLE1BQU0sQ0FBQ3ljLFdBQVcsQ0FBQyxDQUFDM0UsZUFBZSxDQUFDLG9CQUFvQixFQUFFNkUscUJBQXFCLGFBQXJCQSxxQkFBcUIsY0FBckJBLHFCQUFxQixHQUFJLEVBQUUsQ0FBQztJQUM1RixNQUFNM2MsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLLENBQUNBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BHLE1BQU05TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsWUFBWStKLElBQUksQ0FBQ0MsR0FBRyxDQUFDLE9BQU00RixXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUMsSUFBRytKLFVBQVUsQ0FBQyxDQUFDLENBQzdIQyxZQUFZLENBQUMsR0FBRyxDQUFDO0lBRXBCLE1BQU1DLFVBQVUsR0FBRzNkLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQztJQUN2RCxNQUFNc1IsVUFBVSxDQUFDTCxLQUFLLENBQUMsQ0FBQztJQUN4QixNQUFNdGQsSUFBSSxDQUFDdWQsUUFBUSxDQUFDSyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQ3RDLE1BQU10ZSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTTRQLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ25HLE1BQU1wTSxJQUFJLENBQUN1ZCxRQUFRLENBQUNNLEVBQUUsQ0FBQyxZQUFZLENBQUM7SUFDcEMsTUFBTXZlLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNNFAsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBSyxDQUFDQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNwRyxNQUFNMFIsb0JBQW9CLEdBQUcsTUFBTS9CLFdBQVcsQ0FBQ3pZLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQ3NDLFdBQVcsQ0FBQztJQUN2RyxNQUFNcFUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUNzQyxXQUFXLENBQUMsQ0FBQyxDQUFDSixlQUFlLENBQUN3SyxvQkFBb0IsQ0FBQztJQUVuSSxNQUFNL0IsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDMk0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN0RSxNQUFNSixVQUFVLENBQUNLLGFBQWEsQ0FBQyxhQUFhLENBQUM7SUFDN0MsTUFBTTFlLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNNFAsV0FBVyxDQUFDelksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDbkcsTUFBTXVSLFVBQVUsQ0FBQ0ssYUFBYSxDQUFDLGVBQWUsQ0FBQztJQUMvQyxNQUFNMWUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUNuRyxNQUFNcE0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtNQUFFMUosSUFBSSxFQUFFLE1BQU07TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLLENBQUNBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3BHLE1BQU11UixVQUFVLENBQUNLLGFBQWEsQ0FBQyxhQUFhLENBQUM7SUFDN0MsTUFBTUwsVUFBVSxDQUFDcmEsUUFBUSxDQUFFbVQsS0FBdUIsSUFBS0EsS0FBSyxDQUFDd0gsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNwRSxNQUFNM2UsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU00UCxXQUFXLENBQUN6WSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUVuRyxNQUFNOFIsK0JBQStCLEdBQUcsTUFBTW5DLFdBQVcsQ0FBQzVCLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQztJQUM1RixNQUFNaUQsY0FBYyxDQUFDbFIsS0FBSyxDQUFDLENBQUM7SUFDNUIsTUFBTTVNLE1BQU0sQ0FBQ3ljLFdBQVcsQ0FBQyxDQUFDM0UsZUFBZSxDQUFDLGFBQWEsRUFBRSxVQUFVLENBQUM7SUFDcEUsTUFBTSxDQUFDK0csUUFBUSxDQUFDLEdBQUcsTUFBTXJiLE9BQU8sQ0FBQ3NiLEdBQUcsQ0FBQyxDQUNuQ3BlLElBQUksQ0FBQ3FlLFlBQVksQ0FBQyxVQUFVLENBQUMsRUFDN0JyZSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsaUJBQWlCO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUMsQ0FDM0UsQ0FBQztJQUNGLE1BQU1vUyxZQUFZLEdBQUcsTUFBTUgsUUFBUSxDQUFDL2UsSUFBSSxDQUFDLENBQUM7SUFDMUNFLE1BQU0sQ0FBQzZlLFFBQVEsQ0FBQ0ksaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUNuUyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDNUQ5TSxNQUFNLENBQUNnZixZQUFZLENBQUMsQ0FBQ3RJLEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7SUFDbkMsTUFBTXVJLGVBQWUsR0FBRyxNQUFNdmYsUUFBUSxDQUFDcWYsWUFBYSxDQUFDO0lBQ3JELE1BQU1HLG9CQUFvQixHQUFHLE1BQU14ZixRQUFRLENBQUNHLElBQUksQ0FBQ0ksT0FBTyxDQUFDQyxPQUFPLENBQUNDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQzlHLE1BQU1nZixnQkFBZ0IsR0FBR3ZmLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQ3dmLE1BQU0sQ0FBQ0gsZUFBZSxDQUFDLENBQUNuVyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ25GL0ksTUFBTSxDQUFDa2YsZUFBZSxDQUFDSSxNQUFNLENBQUNILG9CQUFvQixDQUFDLENBQUMsQ0FBQ3JTLElBQUksQ0FBQyxJQUFJLENBQUM7SUFFL0QsTUFBTXlTLGNBQWMsR0FBRyxNQUFNN2UsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7TUFDckQsTUFBTTBGLFFBQVEsR0FBRyxNQUFNLElBQUlsRyxPQUFPLENBQWMsQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztRQUNuRSxNQUFNaEIsT0FBTyxHQUFHa0gsU0FBUyxDQUFDQyxJQUFJLENBQUMsc0JBQXNCLENBQUM7UUFDdERuSCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQU0sQ0FBQztRQUNqRHJILE9BQU8sQ0FBQ3NILE9BQU8sR0FBRyxNQUFNdEcsTUFBTSxDQUFDaEIsT0FBTyxDQUFDdUgsS0FBSyxDQUFDO01BQy9DLENBQUMsQ0FBQztNQUNGLE1BQU1DLElBQUksR0FBT2xILElBQVksSUFBSyxJQUFJUyxPQUFPLENBQUksQ0FBQ3RELE9BQU8sRUFBRXVELE1BQU0sS0FBSztRQUNwRSxNQUFNaEIsT0FBTyxHQUFHaUgsUUFBUSxDQUFDekMsV0FBVyxDQUFDbEUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDb0gsV0FBVyxDQUFDcEgsSUFBSSxDQUFDLENBQUNxSCxNQUFNLENBQUMsQ0FBQztRQUNqRjNILE9BQU8sQ0FBQ29ILFNBQVMsR0FBRyxNQUFNM0osT0FBTyxDQUFDdUMsT0FBTyxDQUFDcUgsTUFBVyxDQUFDO1FBQ3REckgsT0FBTyxDQUFDc0gsT0FBTyxHQUFHLE1BQU10RyxNQUFNLENBQUNoQixPQUFPLENBQUN1SCxLQUFLLENBQUM7TUFDL0MsQ0FBQyxDQUFDO01BQ0YsTUFBTXdWLElBQUksR0FBRyxNQUFNdlYsSUFBSSxDQUEySCxZQUFZLENBQUM7TUFDL0osTUFBTXdWLFdBQVcsR0FBRyxNQUFNeFYsSUFBSSxDQUF3RixhQUFhLENBQUM7TUFDcElQLFFBQVEsQ0FBQ2dCLEtBQUssQ0FBQyxDQUFDO01BQ2hCLE9BQU87UUFDTDhVLElBQUksRUFBRUEsSUFBSSxDQUFDdlUsR0FBRyxDQUFDLENBQUM7VUFBRUksRUFBRTtVQUFFUyxVQUFVO1VBQUU4UCxNQUFNO1VBQUU4RCxlQUFlO1VBQUVDO1FBQTJCLENBQUMsTUFBTTtVQUFFdFUsRUFBRTtVQUFFUyxVQUFVO1VBQUU4UCxNQUFNO1VBQUU4RCxlQUFlO1VBQUVDO1FBQTJCLENBQUMsQ0FBQyxDQUFDO1FBQ3RLcFYsS0FBSyxFQUFFa1YsV0FBVyxDQUFDeFUsR0FBRyxDQUFDLENBQUM7VUFBRUksRUFBRTtVQUFFdVUsUUFBUTtVQUFFNVgsUUFBUTtVQUFFRSxNQUFNO1VBQUUxQjtRQUFLLENBQUMsTUFBTTtVQUFFNkUsRUFBRTtVQUFFdVUsUUFBUTtVQUFFNVgsUUFBUTtVQUFFRSxNQUFNO1VBQUV3RCxRQUFRLEVBQUVsRixJQUFJLENBQUNDO1FBQUssQ0FBQyxDQUFDO01BQ2hJLENBQUM7SUFDSCxDQUFDLENBQUM7SUFDRnpHLE1BQU0sQ0FBQ3VmLGNBQWMsQ0FBQ0MsSUFBSSxDQUFDLENBQUNLLGNBQWMsQ0FBQzdmLE1BQU0sQ0FBQzhmLGdCQUFnQixDQUFDO01BQ2pFelUsRUFBRSxFQUFFdVQsK0JBQStCO01BQ25DaEQsTUFBTSxFQUFFLE9BQU87TUFDZjhELGVBQWUsRUFBRSxLQUFLO01BQ3RCQywwQkFBMEIsRUFBRTtJQUM5QixDQUFDLENBQUMsQ0FBQztJQUNIM2YsTUFBTSxDQUFDdWYsY0FBYyxDQUFDaFYsS0FBSyxDQUFDLENBQUNzVixjQUFjLENBQUM3ZixNQUFNLENBQUM4ZixnQkFBZ0IsQ0FBQztNQUNsRXpVLEVBQUUsRUFBRXVULCtCQUErQjtNQUNuQ2dCLFFBQVEsRUFBRSxpQkFBaUI7TUFDM0I1WCxRQUFRLEVBQUVtWCxvQkFBb0IsQ0FBQ1ksVUFBVTtNQUN6Q3JVLFFBQVEsRUFBRXlULG9CQUFvQixDQUFDWSxVQUFVO01BQ3pDN1gsTUFBTSxFQUFFa1g7SUFDVixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0xZSxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLEdBQUc7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3ZELE1BQU14TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNSyxRQUFRLENBQUNnVyxlQUFlLENBQUNpQixXQUFXLElBQUloYSxNQUFNLENBQUNpYSxVQUFVLENBQUMsQ0FBQyxDQUFDek8sSUFBSSxDQUFDLElBQUksQ0FBQztJQUNsSDlNLE1BQU0sQ0FBQyxNQUFNVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsaUJBQWlCO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ3FOLFdBQVcsQ0FBQyxDQUFDLENBQUNwUixJQUFJLENBQUVxWCxHQUFHO01BQUEsSUFBQUMsV0FBQTtNQUFBLFFBQUFBLFdBQUEsR0FBS0QsR0FBRyxhQUFIQSxHQUFHLHVCQUFIQSxHQUFHLENBQUV4VCxNQUFNLGNBQUF5VCxXQUFBLGNBQUFBLFdBQUEsR0FBSSxDQUFDO0lBQUEsRUFBQyxDQUFDLENBQUNoSixzQkFBc0IsQ0FBQyxFQUFFLENBQUM7SUFDekosTUFBTWlKLGFBQWEsR0FBRyxNQUFNeGYsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1nRixLQUFLLENBQUNDLElBQUksQ0FBQzVFLFFBQVEsQ0FBQytZLGdCQUFnQixDQUFDLG9EQUFvRCxDQUFDLEVBQUdyTyxPQUFPLElBQUs7TUFDdkosTUFBTUcsTUFBTSxHQUFHSCxPQUFPLENBQUNJLHFCQUFxQixDQUFDLENBQUM7TUFDOUMsT0FBTztRQUFFZ1IsS0FBSyxFQUFFcFIsT0FBTyxDQUFDOEwsWUFBWSxDQUFDLFlBQVksQ0FBQztRQUFFck8sTUFBTSxFQUFFMEMsTUFBTSxDQUFDMUMsTUFBTTtRQUFFRCxLQUFLLEVBQUUyQyxNQUFNLENBQUMzQztNQUFNLENBQUM7SUFDbEcsQ0FBQyxDQUFDLENBQUM7SUFDSHZNLE1BQU0sQ0FBQ2tnQixhQUFhLENBQUMsQ0FBQy9TLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDckNuTixNQUFNLENBQUNrZ0IsYUFBYSxDQUFDN0MsS0FBSyxDQUFFaGMsTUFBTSxJQUFLQSxNQUFNLENBQUNtTCxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQ00sSUFBSSxDQUFDLElBQUksQ0FBQztJQUN2RSxNQUFNOU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDSixXQUFXLENBQUMsQ0FBQztJQUNoRSxNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsOEJBQThCLENBQUMsQ0FBQyxDQUFDSixXQUFXLENBQUMsQ0FBQztJQUN4RSxNQUFNak0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO01BQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLFVBQVV3VCxNQUFNLENBQUM4RSxXQUFXLENBQUMsQ0FBQywyQkFBMkIsQ0FBQztNQUFFekYsUUFBUSxFQUFFO0lBQUssQ0FBQyxDQUFDO0lBRXhJcUosYUFBYSxHQUFHLE1BQU0xUyxhQUFhLENBQUMvSSxJQUFJLENBQUM7SUFDekMsTUFBTTBmLGNBQWMsR0FBRyxNQUFNcmMsZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7SUFDbkRWLE1BQU0sQ0FBQ29nQixjQUFjLENBQUM1ZSxpQkFBaUIsQ0FBQyxDQUFDd1MsZUFBZSxDQUFDLENBQUMsQ0FBQztJQUMzRGhVLE1BQU0sQ0FBQ29nQixjQUFjLENBQUMzZSxjQUFjLENBQUMsQ0FBQ3VTLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsTUFBTXBVLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsVUFBVXdULE1BQU0sQ0FBQzhFLFdBQVcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLEVBQUUxVyxJQUFJLENBQUNJLFNBQVMsQ0FBQztNQUNuSHdMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztNQUM5QjhGLE1BQU07TUFDTnBILE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO01BQ3RDdUosS0FBSyxFQUFFLDREQUE0RDtNQUNuRXBKLGlCQUFpQixFQUFFcVMsY0FBYztNQUNqQ0MsYUFBYSxFQUFFM0gsY0FBYztNQUM3QnBPLE9BQU8sRUFBRTZSLGFBQWEsQ0FBQzdSLE9BQU87TUFDOUJ2QyxRQUFRLEVBQUVvVSxhQUFhLENBQUM1UixLQUFLLENBQUN1RyxNQUFNLENBQUU1RixTQUFTLElBQUtBLFNBQVMsQ0FBQ0ksT0FBTyxLQUFLLFdBQVcsQ0FBQztNQUN0RmQsVUFBVSxFQUFFMlIsYUFBYSxDQUFDM1IsVUFBVTtNQUNwQ0MsU0FBUyxFQUFFMFIsYUFBYSxDQUFDMVIsU0FBUztNQUNsQ1gsTUFBTSxFQUFFO1FBQ053VyxZQUFZLEVBQUUxQiwrQkFBK0I7UUFDN0MyQiwyQkFBMkIsRUFBRSxVQUFVO1FBQ3ZDQyxnQkFBZ0IsRUFBRTNCLFFBQVEsQ0FBQ0ksaUJBQWlCLENBQUMsQ0FBQztRQUM5Q3dCLGNBQWMsRUFBRXJCLGdCQUFnQjtRQUNoQ3NCLHNCQUFzQixFQUFFeEIsZUFBZSxDQUFDSSxNQUFNLENBQUNILG9CQUFvQixDQUFDO1FBQ3BFd0IsaUJBQWlCLEVBQUUsb0ZBQW9GO1FBQ3ZHbkIsSUFBSSxFQUFFRCxjQUFjLENBQUNDLElBQUk7UUFDekJqVixLQUFLLEVBQUVnVixjQUFjLENBQUNoVjtNQUN4QixDQUFDO01BQ0RxVyxVQUFVLEVBQUUsQ0FBQyx5REFBeUQsRUFBRSwwQ0FBMEMsRUFBRSxvQ0FBb0MsRUFBRSw0REFBNEQsRUFBRSxnREFBZ0QsRUFBRSw4REFBOEQsRUFBRSxnRUFBZ0UsRUFBRSxrREFBa0QsRUFBRSx1RUFBdUUsRUFBRSxtREFBbUQsRUFBRSxxRUFBcUU7SUFDcm9CLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0lBRXBCLE1BQU1DLFdBQVcsR0FBR25nQixJQUFJLENBQUNFLEdBQUcsQ0FBQyxDQUFDO0lBQzlCLE1BQU1GLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxxQkFBcUI7TUFBRTJKLEtBQUssRUFBRTtJQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztJQUNwRixNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxJQUFJa04sTUFBTSxDQUFDLDZDQUE2Q2hJLE1BQU0scUJBQXFCLENBQUMsQ0FBQztJQUNsSCxNQUFNcU4sbUJBQW1CLEdBQUdwZ0IsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDO0lBQ2pFLE1BQU0vTSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTWlVLG1CQUFtQixDQUFDOWMsUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDM0csTUFBTXBNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxVQUFVd1QsTUFBTSxDQUFDOEUsV0FBVyxDQUFDLENBQUMsK0JBQStCO0lBQUUsQ0FBQyxDQUFDO0lBQzVILE1BQU03WCxJQUFJLENBQUNNLElBQUksQ0FBQzZmLFdBQVcsQ0FBQztJQUM1QixNQUFNN2dCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFNBQVMsRUFBRTtNQUFFMUosSUFBSSxFQUFFO0lBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQzZMLFdBQVcsQ0FBQyxDQUFDO0lBQzlFLE1BQU01TyxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQy9PLFFBQVEsQ0FBRThOLEtBQXVCLElBQUtBLEtBQUssQ0FBQzRLLE1BQU0sQ0FBQyxDQUFDLENBQUM1UCxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3hILE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDK0UsZUFBZSxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUM7SUFFcEYsSUFBSXJFLE1BQU0sS0FBSyxHQUFHLEVBQUU7TUFDbEIsTUFBTXNOLFlBQVksR0FBRyxNQUFNcmdCLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQ2lPLGNBQWMsQ0FBRWxQLEtBQUssSUFBS0EsS0FBSyxDQUFDO01BQzVGLE1BQU1wUixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO1FBQUUxSixJQUFJLEVBQUUsTUFBTTtRQUFFMkosS0FBSyxFQUFFO01BQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO01BQ3JFLE1BQU01TSxNQUFNLENBQUM2TSxJQUFJLENBQUMsTUFBTW5NLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQy9PLFFBQVEsQ0FBRThOLEtBQXVCLElBQUssQ0FBQ0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDekgsTUFBTXBNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxNQUFNO1FBQUUySixLQUFLLEVBQUU7TUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7TUFDckUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsZ0NBQWdDLENBQUM7TUFDOUR2TyxNQUFNLENBQUMsTUFBTStnQixZQUFZLENBQUMvYyxRQUFRLENBQUU4TixLQUFLLElBQU1BLEtBQUssQ0FBc0I0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztNQUM3RixNQUFNcE0sSUFBSSxDQUFDcVMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLENBQUNuRyxLQUFLLENBQUMsQ0FBQztNQUN4RCxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUMsQ0FBQzZOLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQztNQUNoRCxNQUFNdk8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDcUYsV0FBVyxDQUFDLENBQUM7SUFDekU7SUFFQSxJQUFJcUIsTUFBTSxLQUFLLEdBQUcsRUFBRTtNQUNsQixNQUFNL1MsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLFlBQVk7UUFPOUIsTUFBTUksSUFBSSxHQUFHQyxRQUFRLENBQUNDLGNBQWMsQ0FBQyxNQUFNLENBQW1EO1FBQzlGLElBQUksQ0FBQ0YsSUFBSSxFQUFFLE1BQU0sSUFBSUcsS0FBSyxDQUFDLGdDQUFnQyxDQUFDO1FBQzVELE1BQU1DLE9BQU8sR0FBRzdCLE1BQU0sQ0FBQzhCLElBQUksQ0FBQ0wsSUFBSSxDQUFDLENBQUNNLElBQUksQ0FBRUMsR0FBRyxJQUFLQSxHQUFHLENBQUNDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQ3BGLElBQUksQ0FBQ0osT0FBTyxFQUFFLE1BQU0sSUFBSUQsS0FBSyxDQUFDLHNDQUFzQyxDQUFDO1FBQ3JFLE1BQU1NLE9BQWtCLEdBQUcsQ0FBQ1QsSUFBSSxDQUFDSSxPQUFPLENBQUMsQ0FBQztRQUMxQyxJQUFJTSxLQUF5QixHQUFHLElBQUk7UUFDcEMsT0FBT0QsT0FBTyxDQUFDRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO1VBQUEsSUFBQWtjLGdCQUFBO1VBQ3pCLE1BQU1oYyxLQUFLLEdBQUdKLE9BQU8sQ0FBQ0ssR0FBRyxDQUFDLENBQWlCO1VBQzNDLElBQUksQ0FBQ0QsS0FBSyxFQUFFO1VBQ1osTUFBTUUsS0FBSyxHQUFHRixLQUFLLENBQUNHLGFBQWdFO1VBQ3BGLElBQUlELEtBQUssYUFBTEEsS0FBSyxnQkFBQThiLGdCQUFBLEdBQUw5YixLQUFLLENBQUVFLFFBQVEsY0FBQTRiLGdCQUFBLGVBQWZBLGdCQUFBLENBQWlCQyxPQUFPLEVBQUVwYyxLQUFLLEdBQUdLLEtBQUssQ0FBQ0UsUUFBUSxDQUFDNmIsT0FBTztVQUM1RCxJQUFJamMsS0FBSyxDQUFDTSxLQUFLLEVBQUVWLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ00sS0FBSyxDQUFDO1VBQzFDLElBQUlOLEtBQUssQ0FBQ08sT0FBTyxFQUFFWCxPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNPLE9BQU8sQ0FBQztRQUNoRDtRQUNBLElBQUksQ0FBQ1YsS0FBSyxFQUFFLE1BQU0sSUFBSVAsS0FBSyxDQUFDLHFFQUFxRSxDQUFDO1FBQ2xHLE1BQU00YyxZQUFZLEdBQUdyYyxLQUFLLENBQUNzYyxtQkFBbUIsQ0FBQzFlLElBQUksQ0FBQ29DLEtBQUssQ0FBQztRQUMxRCxNQUFNekQsTUFBTSxHQUFHQyxNQUFrRTtRQUNqRndELEtBQUssQ0FBQ3NjLG1CQUFtQixHQUFHLE9BQU9DLEtBQUssRUFBRWhXLEVBQUUsS0FBSztVQUMvQyxNQUFNaVcsT0FBTyxHQUFHLE1BQU1ILFlBQVksQ0FBQ0UsS0FBSyxFQUFFaFcsRUFBRSxDQUFDO1VBQzdDLE1BQU1mLE9BQU8sR0FBRyxNQUFNeEYsS0FBSyxDQUFDeWMsbUJBQW1CLENBQUNGLEtBQUssQ0FBQztVQUN0RCxJQUFJLENBQUMvVyxPQUFPLEVBQUUsTUFBTSxJQUFJL0YsS0FBSyxDQUFDLDZEQUE2RCxDQUFDO1VBQzVGLE1BQU1PLEtBQUssQ0FBQzBjLGdCQUFnQixDQUFDSCxLQUFLLEVBQUUvVyxPQUFPLENBQUNLLFFBQVEsRUFBRSxpQkFBaUI5QixNQUFNLENBQUM0WSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7VUFDN0ZwZ0IsTUFBTSxDQUFDcWdCLGlDQUFpQyxHQUFHLElBQUk7VUFDL0MsT0FBT0osT0FBTztRQUNoQixDQUFDO01BQ0gsQ0FBQyxDQUFDO01BQ0YsSUFBSUssY0FBYyxHQUFHLENBQUM7TUFDdEJqaEIsSUFBSSxDQUFDa2hCLEVBQUUsQ0FBQyxVQUFVLEVBQUUsTUFBTTtRQUFFRCxjQUFjLElBQUksQ0FBQztNQUFFLENBQUMsQ0FBQztNQUNuRCxNQUFNamhCLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7UUFBRTFKLElBQUksRUFBRSxpQkFBaUI7UUFBRTJKLEtBQUssRUFBRTtNQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztNQUNoRixNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsMENBQTBDLENBQUMsQ0FBQyxDQUFDNkIsV0FBVyxDQUFDLENBQUM7TUFDcEY1TyxNQUFNLENBQUMsTUFBTVUsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBQThEb2dCLGlDQUFpQyxDQUFDLENBQUMsQ0FBQzVVLElBQUksQ0FBQyxJQUFJLENBQUM7TUFDcEo5TSxNQUFNLENBQUMyaEIsY0FBYyxDQUFDLENBQUM3VSxJQUFJLENBQUMsQ0FBQyxDQUFDO01BQzlCLE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FTLFdBQVcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDbkMsV0FBVyxDQUFDLENBQUMsQ0FBQztNQUM5RCxNQUFNbFEsSUFBSSxDQUFDd1AsVUFBVSxDQUFDO1FBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLDJDQUEyQyxDQUFDO1FBQUU2UyxRQUFRLEVBQUU7TUFBSyxDQUFDLENBQUM7SUFDNUg7RUFDRixDQUFDLENBQUM7QUFDSjtBQUVBL1MsSUFBSSxDQUFDLDBGQUEwRixFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFBQSxJQUFBd1YscUJBQUEsRUFBQUMsZ0JBQUE7RUFDNUgvaEIsSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNckwscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNaEIsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUM3RUEsS0FBSyxDQUFDQyxVQUFVLElBQUlDLGdCQUFnQixDQUFDQyxpQkFBaUIsSUFBSUgsS0FBSyxDQUFDSSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEVBQUU7SUFBRWpGLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQyxDQUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQ2xILE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDK0ssZUFBZSxDQUFDLHNCQUFzQixFQUFFLFNBQVMsQ0FBQztFQUM5RixNQUFNOVgsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFFckYsS0FBSyxNQUFNb1YsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtJQUM1QixNQUFNelQsbUJBQW1CLENBQUM1TixJQUFJLEVBQUUsR0FBRyxDQUFDO0lBQ3BDLE1BQU1BLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxNQUFNO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDckUsSUFBSW1WLElBQUksR0FBRyxDQUFDLEVBQUUsTUFBTS9oQixNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLElBQUlrTixNQUFNLENBQUMsb0JBQW9Cc0csSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7RUFDeEY7RUFFQSxNQUFNL2hCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUM2TixTQUFTLENBQUMsOEJBQThCLENBQUM7RUFDNUQsTUFBTXZPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDNmIsU0FBUyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQzNOLFdBQVcsQ0FBQztJQUFFM0IsT0FBTyxFQUFFO0VBQU8sQ0FBQyxDQUFDO0VBQzFGLE1BQU0rVSxPQUFPLEdBQUcsTUFBTXZZLGFBQWEsQ0FBQy9JLElBQUksQ0FBQztFQUN6QyxNQUFNdWhCLGlCQUFpQixHQUFHcGIsTUFBTSxFQUFBZ2IscUJBQUEsSUFBQUMsZ0JBQUEsR0FBQ0UsT0FBTyxDQUFDMVgsT0FBTyxjQUFBd1gsZ0JBQUEsdUJBQWZBLGdCQUFBLENBQWlCaFgsdUJBQXVCLGNBQUErVyxxQkFBQSxjQUFBQSxxQkFBQSxHQUFJLEVBQUUsQ0FBQztFQUNoRjdoQixNQUFNLENBQUNpaUIsaUJBQWlCLENBQUMsQ0FBQ3ZULFVBQVUsQ0FBQyxDQUFDO0VBQ3RDLE1BQU1oTyxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMkNBQTJDLENBQUM7SUFBRTZTLFFBQVEsRUFBRTtFQUFLLENBQUMsQ0FBQztFQUUxSCxNQUFNcFMsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLHFCQUFxQjtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3BGLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLHVDQUF1QyxDQUFDO0VBQ3JFLE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNdVYsV0FBVyxHQUFHLE1BQU14aEIsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBRWxEWSxjQUFjLENBQUM7RUFDbEJsQyxNQUFNLENBQUNraUIsV0FBVyxDQUFDL2YsUUFBUSxDQUFDLENBQUNnTCxZQUFZLENBQUMsQ0FBQyxDQUFDO0VBQzVDbk4sTUFBTSxDQUFDa2lCLFdBQVcsQ0FBQzlmLFNBQVMsQ0FBQyxDQUFDbUwsT0FBTyxDQUFDLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0VBQy9ELE1BQU1lLG1CQUFtQixDQUFDNU4sSUFBSSxFQUFFLEdBQUcsQ0FBQztFQUNwQyxNQUFNQSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsTUFBTTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3JFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLHVDQUF1QyxDQUFDO0VBQ3JFLE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxXQUFXO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDa0MsV0FBVyxDQUFDLENBQUM7RUFDeEYsTUFBTTVPLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDLENBQUNnVyxHQUFHLENBQUNuSSxTQUFTLENBQUMsVUFBVSxDQUFDO0VBQzVDLE1BQU00VCxvQkFBb0IsR0FBR3poQixJQUFJLENBQUNFLEdBQUcsQ0FBQyxDQUFDO0VBRXZDLE1BQU1GLElBQUksQ0FBQ00sSUFBSSxDQUFDLHdFQUF3RSxDQUFDO0VBQ3pGLE1BQU1oQixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxXQUFXO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDa0MsV0FBVyxDQUFDLENBQUM7RUFDeEYsTUFBTWxPLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSx5Q0FBeUMsQ0FBQztJQUFFNlMsUUFBUSxFQUFFO0VBQUssQ0FBQyxDQUFDO0VBQ3hILE1BQU1wUyxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsV0FBVztJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQzFFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLDhCQUE4QixDQUFDO0VBQzVELE1BQU02VCxjQUFjLEdBQUcxaEIsSUFBSSxDQUFDcVMsV0FBVyxDQUFDLGNBQWMsQ0FBQztFQUN2RCxNQUFNL1MsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU11VixjQUFjLENBQUNwZSxRQUFRLENBQUU4TixLQUF1QixJQUN0RUEsS0FBSyxDQUFDQyxVQUFVLElBQUlDLGdCQUFnQixDQUFDQyxpQkFBaUIsSUFBSUgsS0FBSyxDQUFDSSxVQUFVLEdBQUcsQ0FBQyxJQUN6RUosS0FBSyxDQUFDdVEsVUFBVSxDQUFDemQsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFBRXFJLE9BQU8sRUFBRTtFQUFPLENBQUMsQ0FBQyxDQUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDO0VBQzdFLE1BQU05TSxNQUFNLENBQUNVLElBQUksQ0FBQzZiLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUMzTixXQUFXLENBQUMsQ0FBQztFQUV2RSxNQUFNMFQsT0FBTyxHQUFHLE1BQU03WSxhQUFhLENBQUMvSSxJQUFJLENBQUM7RUFDekNWLE1BQU0sQ0FBQ3NpQixPQUFPLENBQUM3WCxTQUFTLENBQUMsQ0FBQzBDLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDekMsTUFBTW9WLGdCQUFnQixHQUFHRCxPQUFPLENBQUM3WCxTQUFTLENBQUMvRixJQUFJLENBQUV1SCxRQUFRLElBQUtBLFFBQVEsQ0FBQ1osRUFBRSxLQUFLNFcsaUJBQWlCLENBQUM7RUFDaEdqaUIsTUFBTSxDQUFFdWlCLGdCQUFnQixhQUFoQkEsZ0JBQWdCLHVCQUFoQkEsZ0JBQWdCLENBQTZDcFcsYUFBYSxDQUFDLENBQUNXLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztFQUM5RyxNQUFNMFYsZ0JBQWdCLEdBQUdGLE9BQU8sQ0FBQzdYLFNBQVMsQ0FBQy9GLElBQUksQ0FBRXVILFFBQVEsSUFBS0EsUUFBUSxDQUFDRSxhQUFhLEtBQUssNkJBQTZCLENBQ2pEO0VBQ3JFbk0sTUFBTSxDQUFDd2lCLGdCQUFnQixDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0VBQ3RDLElBQUksQ0FBQ0QsZ0JBQWdCLEVBQUUsTUFBTSxJQUFJamUsS0FBSyxDQUFDLDZEQUE2RCxDQUFDO0VBQ3JHdkUsTUFBTSxDQUFDd2lCLGdCQUFnQixDQUFDclcsYUFBYSxDQUFDLENBQUNXLElBQUksQ0FBQyw2QkFBNkIsQ0FBQztFQUMxRTlNLE1BQU0sQ0FBQ3dpQixnQkFBZ0IsQ0FBQ25YLEVBQUUsQ0FBQyxDQUFDcUwsR0FBRyxDQUFDNUosSUFBSSxDQUFDbVYsaUJBQWlCLENBQUM7RUFDdkRqaUIsTUFBTSxDQUFDd2lCLGdCQUFnQixDQUFDcFcsS0FBSyxDQUFDLENBQUNlLFlBQVksQ0FBQyxDQUFDLENBQUM7RUFDOUMsTUFBTXVWLGNBQWMsR0FBRyxNQUFNTixjQUFjLENBQUNwZSxRQUFRLENBQUU4TixLQUF1QixLQUFNO0lBQ2pGb0wsTUFBTSxFQUFFcEwsS0FBSyxDQUFDNlEsT0FBTyxDQUFDekYsTUFBTTtJQUM1Qm9ELFlBQVksRUFBRXhPLEtBQUssQ0FBQzZRLE9BQU8sQ0FBQ3JDLFlBQVk7SUFDeEMrQixVQUFVLEVBQUV2USxLQUFLLENBQUN1USxVQUFVO0lBQzVCdFEsVUFBVSxFQUFFRCxLQUFLLENBQUNDLFVBQVU7SUFDNUJxQyxXQUFXLEVBQUV0QyxLQUFLLENBQUNzQyxXQUFXO0lBQzlCd08sUUFBUSxFQUFFQyxNQUFNLENBQUNDLFFBQVEsQ0FBQ2hSLEtBQUssQ0FBQzhRLFFBQVEsQ0FBQyxHQUFHOVEsS0FBSyxDQUFDOFEsUUFBUSxHQUFHLElBQUk7SUFDakVHLGdCQUFnQixFQUFFalIsS0FBSyxDQUFDOFEsUUFBUSxLQUFLSSxRQUFRLEdBQUcsbUJBQW1CLEdBQUdILE1BQU0sQ0FBQ0ksS0FBSyxDQUFDblIsS0FBSyxDQUFDOFEsUUFBUSxDQUFDLEdBQUcsYUFBYSxHQUFHLFFBQVE7SUFDN0hyVyxLQUFLLEVBQUV1RixLQUFLLENBQUNJLFVBQVU7SUFDdkIxRixNQUFNLEVBQUVzRixLQUFLLENBQUNvUixXQUFXO0lBQ3pCeEcsTUFBTSxFQUFFNUssS0FBSyxDQUFDNEs7RUFDaEIsQ0FBQyxDQUFDLENBQUM7RUFDSDFjLE1BQU0sQ0FBQzBpQixjQUFjLENBQUN4RixNQUFNLENBQUMsQ0FBQ3BRLElBQUksQ0FBQyxLQUFLLENBQUM7RUFDekMsTUFBTXBNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxxQ0FBcUMsQ0FBQztJQUFFNlMsUUFBUSxFQUFFO0VBQUssQ0FBQyxDQUFDO0VBQ3BILE1BQU1sVCxTQUFTLENBQUNFLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLGdEQUFnRCxDQUFDLEVBQUU0QixJQUFJLENBQUNJLFNBQVMsQ0FBQztJQUM3R3dMLElBQUksRUFBRSxJQUFJQyxJQUFJLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUM5QnRCLE9BQU8sRUFBRSxVQUFVQSxPQUFPLENBQUN1QixPQUFPLENBQUMsQ0FBQyxFQUFFO0lBQ3RDc0YsV0FBVyxFQUFFLG9EQUFvRDtJQUNqRStPLGlCQUFpQjtJQUNqQmtCLGVBQWUsRUFBRVgsZ0JBQWdCO0lBQ2pDRSxjQUFjO0lBQ2RVLHFCQUFxQixFQUFFbEIsV0FBVztJQUNsQ0Msb0JBQW9CO0lBQ3BCa0IseUNBQXlDLEVBQUUsS0FBSztJQUNoREMsdUJBQXVCLEVBQUU7RUFDM0IsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGdmpCLElBQUksQ0FBQyw4RkFBOEYsRUFBRSxPQUFPO0VBQUVXO0FBQUssQ0FBQyxLQUFLO0VBQ3ZILE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLDJDQUEyQyxDQUFDO0VBQzVELE1BQU1oQixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztFQUNyRixNQUFNNFcsVUFBVSxHQUFHLE1BQU03aUIsSUFBSSxDQUFDOGlCLE9BQU8sQ0FBQyxDQUFDLENBQUNDLE9BQU8sQ0FBQyxDQUFDO0VBQ2pELE1BQU1GLFVBQVUsQ0FBQ3ZpQixJQUFJLENBQUMsMkNBQTJDLENBQUM7RUFDbEUsTUFBTWhCLE1BQU0sQ0FBQ3VqQixVQUFVLENBQUM5VyxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ2dYLFlBQVksQ0FBQyxDQUFDO0VBQzVGLE1BQU0xakIsTUFBTSxDQUFDdWpCLFVBQVUsQ0FBQzlXLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDTyxhQUFhLENBQUMseUVBQXlFLENBQUM7RUFDcEksTUFBTXVXLFVBQVUsQ0FBQzdZLEtBQUssQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQztBQUVGM0ssSUFBSSxDQUFDLDZFQUE2RSxFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFDL0csTUFBTTNMLElBQUksQ0FBQzRMLGVBQWUsQ0FBQztJQUFFQyxLQUFLLEVBQUUsSUFBSTtJQUFFQyxNQUFNLEVBQUU7RUFBSSxDQUFDLENBQUM7RUFDeEQsTUFBTTlMLElBQUksQ0FBQ1UsYUFBYSxDQUFDLE1BQU07SUFDNUJFLE1BQU0sQ0FBNkNpQyxnQkFBZ0IsR0FBRyxJQUFJO0VBQzdFLENBQUMsQ0FBQztFQUNGLE1BQU1wQyxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0VBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLDJDQUEyQyxDQUFDO0VBQzVELE1BQU1oQixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxTQUFTLEVBQUU7SUFBRTFKLElBQUksRUFBRTtFQUFzQixDQUFDLENBQUMsQ0FBQyxDQUFDNkwsV0FBVyxDQUFDLENBQUM7RUFFdEYsTUFBTWxPLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFVBQVU7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDLENBQUNrQyxXQUFXLENBQUMsQ0FBQztFQUN2RixNQUFNNU8sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsc0VBQXNFLENBQUM7RUFDekloTixNQUFNLENBQUMsTUFBTStELGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQzZNLE9BQU8sQ0FBQztJQUFFL0wsaUJBQWlCLEVBQUUsQ0FBQztJQUFFQyxjQUFjLEVBQUU7RUFBRSxDQUFDLENBQUM7RUFDekYsTUFBTWlJLFFBQVEsR0FBRyxNQUFNRCxhQUFhLENBQUMvSSxJQUFJLENBQUM7RUFDMUNWLE1BQU0sQ0FBQzBKLFFBQVEsQ0FBQ2EsS0FBSyxDQUFDdUcsTUFBTSxDQUFFNUYsU0FBUyxJQUFLQSxTQUFTLENBQUNJLE9BQU8sS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDNkIsWUFBWSxDQUFDLENBQUMsQ0FBQztFQUMvRixNQUFNd1csS0FBSyxHQUFHampCLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztFQUM3QyxNQUFNL00sTUFBTSxDQUFDMmpCLEtBQUssQ0FBQyxDQUFDL1UsV0FBVyxDQUFDLENBQUM7RUFDakM1TyxNQUFNLENBQUMsTUFBTTJqQixLQUFLLENBQUM5SSxZQUFZLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQy9OLElBQUksQ0FBQyxNQUFNLENBQUM7RUFDNUQ5TSxNQUFNLENBQUMsTUFBTTJqQixLQUFLLENBQUNsWCxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUNvQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMvQixJQUFJLENBQUMsQ0FBQyxDQUFDO0VBQ3ZELE1BQU1wTSxJQUFJLENBQUMyVCxjQUFjLENBQUMsSUFBSSxDQUFDO0VBQy9CLE1BQU1yVSxNQUFNLENBQUMyakIsS0FBSyxDQUFDLENBQUMvVSxXQUFXLENBQUMsQ0FBQztFQUNqQyxNQUFNbE8sSUFBSSxDQUFDMlQsY0FBYyxDQUFDLElBQUksQ0FBQztFQUMvQixNQUFNdVAsV0FBVyxHQUFHLE1BQU1ELEtBQUssQ0FBQzVKLFdBQVcsQ0FBQyxDQUFDO0VBQzdDL1osTUFBTSxDQUFDNGpCLFdBQVcsQ0FBQyxDQUFDbE4sR0FBRyxDQUFDQyxRQUFRLENBQUMsQ0FBQztFQUNsQyxNQUFNalcsSUFBSSxDQUFDbWpCLEtBQUssQ0FBQ0MsSUFBSSxDQUFDRixXQUFXLENBQUUxSyxDQUFDLEdBQUcwSyxXQUFXLENBQUVyWCxLQUFLLEdBQUcsQ0FBQyxFQUFFcVgsV0FBVyxDQUFFekssQ0FBQyxHQUFHeUssV0FBVyxDQUFFcFgsTUFBTSxHQUFHLENBQUMsQ0FBQztFQUN4RyxNQUFNOUwsSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztFQUM5QixNQUFNclUsTUFBTSxDQUFDMmpCLEtBQUssQ0FBQyxDQUFDL1UsV0FBVyxDQUFDLENBQUM7RUFDakMsTUFBTWxPLElBQUksQ0FBQ21qQixLQUFLLENBQUNDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO0VBQzdCLE1BQU05akIsTUFBTSxDQUFDMmpCLEtBQUssQ0FBQyxDQUFDL1MsV0FBVyxDQUFDLENBQUMsRUFBRTtJQUFFM0QsT0FBTyxFQUFFO0VBQUssQ0FBQyxDQUFDO0VBQ3JELE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyxzRUFBc0UsQ0FBQztFQUV6SSxNQUFNdE0sSUFBSSxDQUFDcWpCLFlBQVksQ0FBQztJQUFFQyxhQUFhLEVBQUU7RUFBUyxDQUFDLENBQUM7RUFDcEQsTUFBTXRqQixJQUFJLENBQUMwYSxNQUFNLENBQUMsQ0FBQztFQUNuQixNQUFNMWEsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN2RSxNQUFNNU0sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDNkIsV0FBVyxDQUFDLENBQUM7RUFDM0QsTUFBTXFWLDhCQUE4QixHQUFHLE1BQU12akIsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUMvSSxRQUFRLENBQUUrSyxPQUFPO0lBQUEsSUFBQW1WLHFCQUFBO0lBQUEsT0FDNUZyQixNQUFNLENBQUNzQixVQUFVLEVBQUFELHFCQUFBLEdBQUNqVixnQkFBZ0IsQ0FBQ0YsT0FBTyxDQUFDLENBQUNxVixrQkFBa0IsQ0FBQzVqQixLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQUEwakIscUJBQUEsY0FBQUEscUJBQUEsR0FBSSxHQUFHLENBQUM7RUFBQSxFQUFDO0VBQ3ZGbGtCLE1BQU0sQ0FBQ2lrQiw4QkFBOEIsQ0FBQyxDQUFDN0YsWUFBWSxDQUFDLEtBQUssQ0FBQztFQUMxRCxNQUFNMWQsSUFBSSxDQUFDbWpCLEtBQUssQ0FBQ1EsS0FBSyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7RUFDOUIsTUFBTXJrQixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM2RCxXQUFXLENBQUMsQ0FBQyxFQUFFO0lBQUUzRCxPQUFPLEVBQUU7RUFBTSxDQUFDLENBQUM7RUFDaEYsTUFBTWpOLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHNFQUFzRSxDQUFDO0VBQ3pJLE1BQU10TSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsVUFBVTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUNFLEtBQUssQ0FBQyxDQUFDO0VBQ3pFLE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLDBCQUEwQixDQUFDO0VBQ3hELE1BQU03TixJQUFJLENBQUNxUyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQ25HLEtBQUssQ0FBQyxDQUFDO0VBQ3hELE1BQU01TSxNQUFNLENBQUNVLElBQUksQ0FBQyxDQUFDNk4sU0FBUyxDQUFDLHNCQUFzQixDQUFDO0VBQ3BELE1BQU12TyxNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDLENBQUNxRixXQUFXLENBQUMsQ0FBQztFQUMzRSxNQUFNeFMsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSx5Q0FBeUMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDdEd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0QzBXLFVBQVUsRUFBRSxrR0FBa0c7SUFDOUd2VyxpQkFBaUIsRUFBRSxNQUFNaEssZ0JBQWdCLENBQUNyRCxJQUFJLENBQUM7SUFDL0M2akIsbUJBQW1CLEVBQUU3YSxRQUFRLENBQUNhLEtBQUssQ0FBQ3VHLE1BQU0sQ0FBRTVGLFNBQVMsSUFBS0EsU0FBUyxDQUFDSSxPQUFPLEtBQUssV0FBVyxDQUFDLENBQUN2RyxNQUFNO0lBQ25HeWYseUJBQXlCLEVBQUUsTUFBTTlqQixJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUUsVUFBVTtNQUFFMkosS0FBSyxFQUFFO0lBQUssQ0FBQyxDQUFDLENBQUMrWCxTQUFTLENBQUMsQ0FBQztJQUN4R0MsMkJBQTJCLEVBQUUsTUFBTWhrQixJQUFJLENBQUNxTSxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQy9JLFFBQVEsQ0FBRStLLE9BQU8sSUFBS0EsT0FBTyxLQUFLMUssUUFBUSxDQUFDb00sYUFBYSxDQUFDO0lBQzVJOUIsYUFBYSxFQUFFO0VBQ2pCLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGNU8sSUFBSSxDQUFDLG9HQUFvRyxFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFBQSxJQUFBc1kscUJBQUEsRUFBQUMsc0JBQUEsRUFBQUMscUJBQUEsRUFBQUMsc0JBQUEsRUFBQUMscUJBQUEsRUFBQUMsc0JBQUEsRUFBQUMsc0JBQUEsRUFBQUMsc0JBQUEsRUFBQUMsc0JBQUE7RUFDdElwbEIsSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNckwscUJBQXFCLENBQUNULElBQUksQ0FBQztFQUNqQyxNQUFNQSxJQUFJLENBQUNNLElBQUksQ0FBQyxxREFBcUQsQ0FBQztFQUN0RSxNQUFNaEIsTUFBTSxDQUFDVSxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO0lBQUUxSixJQUFJLEVBQUUsUUFBUTtJQUFFMkosS0FBSyxFQUFFO0VBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7RUFDckYsTUFBTTdFLHlCQUF5QixDQUFDcEgsSUFBSSxDQUFDO0VBRXJDLE1BQU0wa0Isb0JBQW9CLEdBQUcsTUFBQUEsQ0FBQSxLQUFZMWtCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxZQUFZO0lBQ2pFLE1BQU0wRixRQUFRLEdBQUcsTUFBTSxJQUFJbEcsT0FBTyxDQUFjLENBQUN0RCxPQUFPLEVBQUV1RCxNQUFNLEtBQUs7TUFDbkUsTUFBTWhCLE9BQU8sR0FBR2tILFNBQVMsQ0FBQ0MsSUFBSSxDQUFDLHNCQUFzQixDQUFDO01BQ3REbkgsT0FBTyxDQUFDb0gsU0FBUyxHQUFHLE1BQU0zSixPQUFPLENBQUN1QyxPQUFPLENBQUNxSCxNQUFNLENBQUM7TUFDakRySCxPQUFPLENBQUNzSCxPQUFPLEdBQUcsTUFBTXRHLE1BQU0sQ0FBQ2hCLE9BQU8sQ0FBQ3VILEtBQUssQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRixNQUFNTSxPQUFPLEdBQUcsTUFBTSxJQUFJOUcsT0FBTyxDQUFxRSxDQUFDdEQsT0FBTyxFQUFFdUQsTUFBTSxLQUFLO01BQ3pILE1BQU1oQixPQUFPLEdBQUdpSCxRQUFRLENBQUN6QyxXQUFXLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxDQUFDa0QsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDRSxHQUFHLENBQUMsaUJBQWlCLENBQUM7TUFDM0c1SCxPQUFPLENBQUNvSCxTQUFTLEdBQUcsTUFBTTNKLE9BQU8sQ0FBQ3VDLE9BQU8sQ0FBQ3FILE1BQTRFLENBQUM7TUFDdkhySCxPQUFPLENBQUNzSCxPQUFPLEdBQUcsTUFBTXRHLE1BQU0sQ0FBQ2hCLE9BQU8sQ0FBQ3VILEtBQUssQ0FBQztJQUMvQyxDQUFDLENBQUM7SUFDRk4sUUFBUSxDQUFDZ0IsS0FBSyxDQUFDLENBQUM7SUFDaEIsTUFBTXBKLE1BQU0sR0FBR2dKLE9BQU8sQ0FBQ2lMLE9BQU8sQ0FBQzdRLElBQUksQ0FBRTJnQixJQUFJLElBQUtBLElBQUksQ0FBQ2hhLEVBQUUsS0FBSyxlQUFlLENBQUM7SUFDMUUsSUFBSSxDQUFDL0osTUFBTSxFQUFFLE1BQU0sSUFBSWlELEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQztJQUNyRSxPQUFPakQsTUFBTSxDQUFDMFYsS0FBSyxHQUFHMVYsTUFBTSxDQUFDd1YsT0FBTztFQUN0QyxDQUFDLENBQUM7RUFDRixNQUFNd08sa0JBQWtCLEdBQUcsTUFBTUYsb0JBQW9CLENBQUMsQ0FBQztFQUN2RCxNQUFNRyxnQkFBZ0IsR0FBRyxNQUFBQSxDQUFBLEtBQVk7SUFBQSxJQUFBQyxrQkFBQTtJQUNuQyxNQUFNOWIsUUFBUSxHQUFHLE1BQU1ELGFBQWEsQ0FBQy9JLElBQUksQ0FBQztJQUMxQyxNQUFNb1QsV0FBVyxJQUFBMFIsa0JBQUEsR0FBRzliLFFBQVEsQ0FBQ1ksT0FBTyxjQUFBa2Isa0JBQUEsdUJBQWhCQSxrQkFBQSxDQUFrQjVhLG9CQUEwRDtJQUNoRyxNQUFNdUksV0FBVyxHQUFHVyxXQUFXLGFBQVhBLFdBQVcsdUJBQVhBLFdBQVcsQ0FBRyxlQUFlLENBQUM7SUFDbEQsT0FBTztNQUFFcEssUUFBUTtNQUFFd0IsU0FBUyxFQUFFeEIsUUFBUSxDQUFDYSxLQUFLLENBQUM3RixJQUFJLENBQUV3RyxTQUFTLElBQUtBLFNBQVMsQ0FBQ0csRUFBRSxLQUFLOEgsV0FBVztJQUFFLENBQUM7RUFDbEcsQ0FBQztFQUNELE1BQU1zUyxXQUFXLEdBQUcsTUFBQUEsQ0FBQSxLQUFZL2tCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxPQUFPO0lBQ25EdUcsS0FBSyxFQUFFbEcsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLGlCQUFpQixDQUFDLENBQUVGLHFCQUFxQixDQUFDLENBQUMsQ0FBQ3VXLE1BQU0sQ0FBQyxDQUFDO0lBQ2xGbkwsS0FBSyxFQUFFbFcsUUFBUSxDQUFDZ0wsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFFRixxQkFBcUIsQ0FBQyxDQUFDLENBQUN1VyxNQUFNLENBQUM7RUFDakYsQ0FBQyxDQUFDLENBQUM7RUFDSCxNQUFNbEwsa0JBQWtCLEdBQUcsTUFBQUEsQ0FBQSxLQUFZO0lBQ3JDLE1BQU10TCxNQUFNLEdBQUcsTUFBTXVXLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDemxCLE1BQU0sQ0FBQzRXLElBQUksQ0FBQ0MsR0FBRyxDQUFDM0gsTUFBTSxDQUFDcUwsS0FBSyxDQUFDcEIsQ0FBQyxHQUFHakssTUFBTSxDQUFDM0UsS0FBSyxDQUFDNE8sQ0FBQyxDQUFDLENBQUMsQ0FBQ2xKLG1CQUFtQixDQUFDLENBQUMsQ0FBQztJQUN4RSxPQUFPZixNQUFNO0VBQ2YsQ0FBQztFQUNELE1BQU15VyxvQkFBb0IsR0FBRyxNQUFPQyxNQUFlLElBQUtsbEIsSUFBSSxDQUFDc0QsUUFBUSxDQUFFNmhCLFFBQVEsSUFBSztJQUNsRmxqQixNQUFNLENBQUNDLGNBQWMsQ0FBQ3lCLFFBQVEsRUFBRSxRQUFRLEVBQUU7TUFBRXhCLFlBQVksRUFBRSxJQUFJO01BQUVDLEtBQUssRUFBRStpQjtJQUFTLENBQUMsQ0FBQztJQUNsRmxqQixNQUFNLENBQUNDLGNBQWMsQ0FBQ3lCLFFBQVEsRUFBRSxpQkFBaUIsRUFBRTtNQUFFeEIsWUFBWSxFQUFFLElBQUk7TUFBRUMsS0FBSyxFQUFFK2lCLFFBQVEsR0FBRyxRQUFRLEdBQUc7SUFBVSxDQUFDLENBQUM7SUFDbEh4aEIsUUFBUSxDQUFDcWEsYUFBYSxDQUFDLElBQUlvSCxLQUFLLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNyRCxJQUFJRCxRQUFRLEVBQUV2a0IsTUFBTSxDQUFDb2QsYUFBYSxDQUFDLElBQUlvSCxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxLQUNyRHhrQixNQUFNLENBQUNvZCxhQUFhLENBQUMsSUFBSW9ILEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQztFQUNsRCxDQUFDLEVBQUVGLE1BQU0sQ0FBQztFQUNWLE1BQU1HLG9CQUFvQixHQUFHLE1BQUFBLENBQU9DLHNCQUE4QixFQUFFQyxjQUFzQixLQUFLO0lBQUEsSUFBQUMscUJBQUEsRUFBQUMsS0FBQSxFQUFBQyxrQkFBQTtJQUM3RixNQUFNMWxCLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDSCxLQUFLLENBQUMsQ0FBQztJQUM1QyxNQUFNNU0sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNOUksZ0JBQWdCLENBQUNyRCxJQUFJLENBQUMsRUFBRWUsY0FBYyxDQUFDLENBQUNxTCxJQUFJLENBQUNrWixzQkFBc0IsQ0FBQztJQUN6RyxNQUFNSyxlQUFlLEdBQUcsTUFBTTdMLGtCQUFrQixDQUFDLENBQUM7SUFDbEQsTUFBTTlaLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztNQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxHQUFHZ21CLGNBQWMsZ0JBQWdCO0lBQUUsQ0FBQyxDQUFDO0lBQ2hHLE1BQU12bEIsSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztJQUM5QixNQUFNc1Isb0JBQW9CLENBQUMsSUFBSSxDQUFDO0lBQ2hDLE1BQU0zbEIsTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsa0VBQWtFLEVBQUU7TUFBRUMsT0FBTyxFQUFFO0lBQU8sQ0FBQyxDQUFDO0lBQzFKLE1BQU1qTixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxXQUFXO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUN4RixNQUFNM00sTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUM3RyxNQUFNd1osV0FBVyxHQUFHLE1BQU05TCxrQkFBa0IsQ0FBQyxDQUFDO0lBQzlDLE1BQU05WixJQUFJLENBQUN3UCxVQUFVLENBQUM7TUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsR0FBR2dtQixjQUFjLG9CQUFvQjtJQUFFLENBQUMsQ0FBQztJQUNwRyxNQUFNam1CLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDO01BQUEsSUFBQXVpQixvQkFBQTtNQUFBLFFBQUFBLG9CQUFBLEdBQU9qbEIsTUFBTSxDQUFzRTZHLHVCQUF1QixjQUFBb2Usb0JBQUEsdUJBQXBHQSxvQkFBQSxDQUFzR3JlLE1BQU07SUFBQSxFQUFDLENBQUMsQ0FDdkorTCxPQUFPLENBQUMsZ0JBQWdCLENBQUM7SUFDNUIsTUFBTWxMLE1BQU0sR0FBRyxNQUFNckksSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU8xQyxNQUFNLENBRTdDNkcsdUJBQXVCLENBQUM7SUFDM0JuSSxNQUFNLENBQUMrSSxNQUFNLENBQUMsQ0FBQzBaLFdBQVcsQ0FBQyxDQUFDO0lBQzVCLElBQUksQ0FBQzFaLE1BQU0sRUFBRSxNQUFNLElBQUl4RSxLQUFLLENBQUMsd0RBQXdELENBQUM7SUFDdEYsTUFBTTtNQUFFbUYsUUFBUTtNQUFFd0I7SUFBVSxDQUFDLEdBQUcsTUFBTXFhLGdCQUFnQixDQUFDLENBQUM7SUFDeEQsTUFBTTlaLEtBQUssR0FBR1AsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVPLEtBQThHO0lBQ3ZJekwsTUFBTSxDQUFDa0wsU0FBUyxhQUFUQSxTQUFTLHVCQUFUQSxTQUFTLENBQUVNLFNBQVMsQ0FBQyxDQUFDc0IsSUFBSSxDQUFDLGFBQWEsQ0FBQztJQUNoRDlNLE1BQU0sQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFUSxRQUFRLENBQUMsQ0FBQ3NJLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDOUNoVSxNQUFNLENBQUNrTCxTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRVEsUUFBUSxDQUFDLENBQUNvQixJQUFJLENBQUM1QixTQUFTLGFBQVRBLFNBQVMsdUJBQVRBLFNBQVMsQ0FBRWxELFFBQVEsQ0FBQztJQUNyRGhJLE1BQU0sQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFaEQsTUFBTSxDQUFDLENBQUM0RSxJQUFJLENBQUMvRCxNQUFNLENBQUNiLE1BQU0sQ0FBQztJQUM3Q2xJLE1BQU0sQ0FBQ2tMLFNBQVMsYUFBVEEsU0FBUyx1QkFBVEEsU0FBUyxDQUFFbEQsUUFBUSxDQUFDLENBQUM4RSxJQUFJLENBQUMvRCxNQUFNLENBQUNmLFFBQVEsQ0FBQztJQUNqRGhJLE1BQU0sQ0FBQ3lMLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFeUwsYUFBYSxDQUFDLENBQUNsRCxlQUFlLENBQUMsQ0FBQyxDQUFDO0lBQy9DaFUsTUFBTSxDQUFDeUwsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUUrYSxlQUFlLENBQUMsQ0FBQ3hTLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDakRoVSxNQUFNLEVBQUFrbUIscUJBQUEsR0FBQ3phLEtBQUssYUFBTEEsS0FBSyx1QkFBTEEsS0FBSyxDQUFFK2EsZUFBZSxjQUFBTixxQkFBQSxjQUFBQSxxQkFBQSxHQUFJbEQsUUFBUSxDQUFDLENBQUM1RSxZQUFZLENBQUNrSCxrQkFBa0IsR0FBRyxJQUFJLENBQUM7SUFDbEZ0bEIsTUFBTSxDQUFDMkMsTUFBTSxDQUFDNFAsTUFBTSxFQUFBNFQsS0FBQSxJQUFBQyxrQkFBQSxHQUFDMWMsUUFBUSxDQUFDWSxPQUFPLGNBQUE4YixrQkFBQSx1QkFBaEJBLGtCQUFBLENBQWtCdmIsY0FBYyxjQUFBc2IsS0FBQSxjQUFBQSxLQUFBLEdBQThCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQ2haLFlBQVksQ0FBQyxDQUFDLENBQUM7SUFDdkcsTUFBTXZOLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsR0FBR2dtQixjQUFjLGdCQUFnQixDQUFDLEVBQUVwa0IsSUFBSSxDQUFDSSxTQUFTLENBQUM7TUFDOUZ3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7TUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtNQUN0Q3VKLEtBQUssRUFBRSw0REFBNEQ7TUFDbkVzUCxTQUFTLEVBQUUsOERBQThEO01BQ3pFbkIsa0JBQWtCO01BQ2xCb0IsVUFBVSxFQUFFM2QsTUFBTTtNQUNsQnVPLGtCQUFrQixFQUFFcE0sU0FBUztNQUM3QnliLGtDQUFrQyxFQUFFLE1BQU1qbUIsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDL0ksUUFBUSxDQUFFOE4sS0FBdUIsSUFBS0EsS0FBSyxDQUFDNEssTUFBTSxDQUFDO01BQ25Ia0ssa0JBQWtCLEVBQUVQLGVBQWU7TUFDbkNRLGNBQWMsRUFBRVA7SUFDbEIsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7SUFDcEIsTUFBTVgsb0JBQW9CLENBQUMsS0FBSyxDQUFDO0lBQ2pDLE1BQU1qbEIsSUFBSSxDQUFDMlQsY0FBYyxDQUFDLEdBQUcsQ0FBQztJQUM5QixNQUFNclUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1uTSxJQUFJLENBQUNxTSxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMvSSxRQUFRLENBQUU4TixLQUF1QixJQUFLQSxLQUFLLENBQUM0SyxNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztJQUM3RyxPQUFPNUIsU0FBUztFQUNsQixDQUFDO0VBRUQsTUFBTTRiLFlBQVksR0FBRyxNQUFNdE0sa0JBQWtCLENBQUMsQ0FBQztFQUMvQyxNQUFNOVosSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLG1DQUFtQztFQUFFLENBQUMsQ0FBQztFQUNsRyxNQUFNOG1CLFlBQVksR0FBRyxNQUFNaEIsb0JBQW9CLENBQUMsQ0FBQyxFQUFFLHVCQUF1QixDQUFDO0VBRTNFLE1BQU1ybEIsSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNd2EsZ0JBQWdCLEdBQUcsTUFBTXhNLGtCQUFrQixDQUFDLENBQUM7RUFDbkQsTUFBTTlaLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxrQ0FBa0M7RUFBRSxDQUFDLENBQUM7RUFDakcsTUFBTWduQixhQUFhLEdBQUcsTUFBTWxCLG9CQUFvQixDQUFDLENBQUMsRUFBRSx1QkFBdUIsQ0FBQztFQUU1RSxNQUFNcmxCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBSXhCLE1BQU1JLElBQUksR0FBR0MsUUFBUSxDQUFDQyxjQUFjLENBQUMsTUFBTSxDQUFtRDtJQUM5RixJQUFJLENBQUNGLElBQUksRUFBRSxNQUFNLElBQUlHLEtBQUssQ0FBQywrREFBK0QsQ0FBQztJQUMzRixNQUFNQyxPQUFPLEdBQUc3QixNQUFNLENBQUM4QixJQUFJLENBQUNMLElBQUksQ0FBQyxDQUFDTSxJQUFJLENBQUVDLEdBQUcsSUFBS0EsR0FBRyxDQUFDQyxVQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztJQUNwRixJQUFJLENBQUNKLE9BQU8sRUFBRSxNQUFNLElBQUlELEtBQUssQ0FBQyw2Q0FBNkMsQ0FBQztJQUM1RSxNQUFNTSxPQUFrQixHQUFHLENBQUNULElBQUksQ0FBQ0ksT0FBTyxDQUFDLENBQUM7SUFDMUMsTUFBTTBpQixJQUFJLEdBQUcsSUFBSUMsR0FBRyxDQUFVLENBQUM7SUFDL0IsSUFBSTloQixRQUF5QixHQUFHLElBQUk7SUFDcEMsT0FBT1IsT0FBTyxDQUFDRSxNQUFNLEdBQUcsQ0FBQyxFQUFFO01BQUEsSUFBQXFpQixnQkFBQTtNQUN6QixNQUFNbmlCLEtBQUssR0FBR0osT0FBTyxDQUFDSyxHQUFHLENBQUMsQ0FBaUI7TUFDM0MsSUFBSSxDQUFDRCxLQUFLLElBQUlpaUIsSUFBSSxDQUFDRyxHQUFHLENBQUNwaUIsS0FBSyxDQUFDLEVBQUU7TUFDL0JpaUIsSUFBSSxDQUFDSSxHQUFHLENBQUNyaUIsS0FBSyxDQUFDO01BQ2YsSUFBSUEsS0FBSyxDQUFDc2lCLFNBQVMsRUFBRTFpQixPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNzaUIsU0FBUyxDQUFDO01BQ2xELE1BQU1waUIsS0FBSyxHQUFHRixLQUFLLENBQUNHLGFBQStDO01BQ25FLElBQUlELEtBQUssYUFBTEEsS0FBSyxnQkFBQWlpQixnQkFBQSxHQUFMamlCLEtBQUssQ0FBRUUsUUFBUSxjQUFBK2hCLGdCQUFBLGVBQWZBLGdCQUFBLENBQWlCN2MsS0FBSyxFQUFFbEYsUUFBUSxHQUFHRixLQUFLLENBQUNFLFFBQVE7TUFDckQsSUFBSUosS0FBSyxDQUFDTSxLQUFLLEVBQUVWLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ00sS0FBSyxDQUFDO01BQzFDLElBQUlOLEtBQUssQ0FBQ08sT0FBTyxFQUFFWCxPQUFPLENBQUMzQixJQUFJLENBQUMrQixLQUFLLENBQUNPLE9BQU8sQ0FBQztJQUNoRDtJQUNBLElBQUksQ0FBQ0gsUUFBUSxFQUFFLE1BQU0sSUFBSWQsS0FBSyxDQUFDLGtEQUFrRCxDQUFDO0lBQ2xGLE1BQU1vRCxRQUFRLEdBQUd0QyxRQUFRLENBQUNrRixLQUFLLENBQUNpZCxrQkFBa0IsQ0FBQzlrQixJQUFJLENBQUMyQyxRQUFRLENBQUNrRixLQUFLLENBQUM7SUFDdkUsSUFBSWtkLGtCQUFrQixHQUFHLElBQUk7SUFDN0JwaUIsUUFBUSxDQUFDa0YsS0FBSyxDQUFDaWQsa0JBQWtCLEdBQUcsT0FBTyxHQUFHbGtCLElBQUksS0FBSztNQUNyRCxNQUFNNlQsS0FBSyxHQUFHN1QsSUFBSSxDQUFDLENBQUMsQ0FBcUM7TUFDekQsSUFBSSxDQUFBNlQsS0FBSyxhQUFMQSxLQUFLLHVCQUFMQSxLQUFLLENBQUU3TCxPQUFPLE1BQUssV0FBVyxJQUFJbWMsa0JBQWtCLEVBQUU7UUFDeERBLGtCQUFrQixHQUFHLEtBQUs7UUFDMUIsTUFBTXJSLEdBQUcsR0FBRzFJLElBQUksQ0FBQzBJLEdBQUcsQ0FBQyxDQUFDO1FBQ3RCLE9BQU87VUFDTDlLLE9BQU8sRUFBRSxXQUFXO1VBQ3BCOUUsSUFBSSxFQUFFLElBQUlnQyxJQUFJLENBQUMsQ0FBQyxJQUFJVSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUFFVCxJQUFJLEVBQUU7VUFBYSxDQUFDLENBQUM7VUFDbkVSLFFBQVEsRUFBRSxZQUFZO1VBQ3RCa00sU0FBUyxFQUFFaUMsR0FBRyxHQUFHLEVBQUU7VUFDbkJzUixTQUFTLEVBQUV0UixHQUFHO1VBQ2R1UixTQUFTLEVBQUUsRUFBRTtVQUNibmMsU0FBUyxFQUFFLGFBQWE7VUFDeEJDLEtBQUssRUFBRTtZQUFFeEQsUUFBUSxFQUFFLFlBQVk7WUFBRUQsUUFBUSxFQUFFLENBQUM7WUFBRXdlLGVBQWUsRUFBRSxJQUFJO1lBQUV0UCxhQUFhLEVBQUUsSUFBSTtZQUN0RjBRLFlBQVksRUFBRSxJQUFJO1lBQUVDLFVBQVUsRUFBRSxJQUFJO1lBQUVDLFlBQVksRUFBRSxhQUFhO1lBQUVDLGFBQWEsRUFBRTtVQUFHO1FBQ3pGLENBQUM7TUFDSDtNQUNBLE9BQU9wZ0IsUUFBUSxDQUFDLEdBQUdyRSxJQUFJLENBQUM7SUFDMUIsQ0FBQztFQUNILENBQUMsQ0FBQztFQUNGLE1BQU01QyxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0gsS0FBSyxDQUFDLENBQUM7RUFDNUMsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHVGQUF1RixDQUFDO0VBQzFKLE1BQU1nYixhQUFhLEdBQUcsTUFBTXpDLGdCQUFnQixDQUFDLENBQUM7RUFDOUN2bEIsTUFBTSxFQUFBMmtCLHFCQUFBLEdBQUNxRCxhQUFhLENBQUM5YyxTQUFTLGNBQUF5WixxQkFBQSx1QkFBdkJBLHFCQUFBLENBQXlCdFosRUFBRSxDQUFDLENBQUN5QixJQUFJLENBQUNtYSxhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUUsQ0FBQztFQUMzRHJMLE1BQU0sRUFBQTRrQixzQkFBQSxHQUFDb0QsYUFBYSxDQUFDOWMsU0FBUyxjQUFBMFosc0JBQUEsdUJBQXZCQSxzQkFBQSxDQUF5QjFjLE1BQU0sQ0FBQyxDQUFDNEUsSUFBSSxDQUFDbWEsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUUvZSxNQUFNLENBQUM7RUFDbkUsTUFBTXhILElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSwrQ0FBK0M7RUFBRSxDQUFDLENBQUM7RUFFOUcsTUFBTVMsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU07SUFBRzFDLE1BQU0sQ0FBNkNpQyxnQkFBZ0IsR0FBRyxJQUFJO0VBQUUsQ0FBQyxDQUFDO0VBQzNHLE1BQU03QyxJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0gsS0FBSyxDQUFDLENBQUM7RUFDNUMsTUFBTTVNLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQ0MsYUFBYSxDQUFDLHNFQUFzRSxDQUFDO0VBQ3pJLE1BQU1pYixXQUFXLEdBQUcsTUFBTTFDLGdCQUFnQixDQUFDLENBQUM7RUFDNUN2bEIsTUFBTSxFQUFBNmtCLHFCQUFBLEdBQUNvRCxXQUFXLENBQUMvYyxTQUFTLGNBQUEyWixxQkFBQSx1QkFBckJBLHFCQUFBLENBQXVCeFosRUFBRSxDQUFDLENBQUN5QixJQUFJLENBQUNtYSxhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUUsQ0FBQztFQUN6RHJMLE1BQU0sRUFBQThrQixzQkFBQSxHQUFDbUQsV0FBVyxDQUFDL2MsU0FBUyxjQUFBNFosc0JBQUEsdUJBQXJCQSxzQkFBQSxDQUF1QjVjLE1BQU0sQ0FBQyxDQUFDNEUsSUFBSSxDQUFDbWEsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUUvZSxNQUFNLENBQUM7RUFFakUsTUFBTXhILElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBRXhCLE1BQU0zQyxNQUFNLEdBQUdDLE1BQXlGO0lBQ3hHRCxNQUFNLENBQUNrQyxnQkFBZ0IsR0FBRyxLQUFLO0lBQy9CLE1BQU1ILFlBQVksR0FBR2QsU0FBUyxDQUFDYyxZQUFZO0lBQzNDLE1BQU11RSxRQUFRLEdBQUd2RSxZQUFZLENBQUNDLFlBQVksQ0FBQ1gsSUFBSSxDQUFDVSxZQUFZLENBQUM7SUFDN0QsTUFBTXlCLE9BQXVCLEdBQUc7TUFBRXFqQixNQUFNLEVBQUUsSUFBSTtNQUFFQyxPQUFPLEVBQUU7SUFBSyxDQUFDO0lBQy9EOW1CLE1BQU0sQ0FBQyttQixxQkFBcUIsR0FBR3ZqQixPQUFPO0lBQ3RDekIsWUFBWSxDQUFDQyxZQUFZLEdBQUcsT0FBTyxHQUFHQyxJQUE4QyxLQUFLO01BQ3ZGLE1BQU00a0IsTUFBTSxHQUFHLE1BQU12Z0IsUUFBUSxDQUFDLEdBQUdyRSxJQUFJLENBQUM7TUFDdEN1QixPQUFPLENBQUNxakIsTUFBTSxHQUFHQSxNQUFNO01BQ3ZCLE1BQU0sSUFBSTFrQixPQUFPLENBQVF0RCxPQUFPLElBQUs7UUFBRTJFLE9BQU8sQ0FBQ3NqQixPQUFPLEdBQUdqb0IsT0FBTztNQUFFLENBQUMsQ0FBQztNQUNwRSxPQUFPZ29CLE1BQU07SUFDZixDQUFDO0VBQ0gsQ0FBQyxDQUFDO0VBQ0YsTUFBTXhuQixJQUFJLENBQUNxTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQ0gsS0FBSyxDQUFDLENBQUM7RUFDNUMsTUFBTTVNLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNbk0sSUFBSSxDQUFDc0QsUUFBUSxDQUFDO0lBQUEsSUFBQXFrQixvQkFBQTtJQUFBLE9BQU1DLE9BQU8sRUFBQUQsb0JBQUEsR0FBRS9tQixNQUFNLENBQXlFOG1CLHFCQUFxQixjQUFBQyxvQkFBQSx1QkFBckdBLG9CQUFBLENBQXVHSCxNQUFNLENBQUM7RUFBQSxFQUFDLENBQUMsQ0FBQ3BiLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDL0ssTUFBTTZZLG9CQUFvQixDQUFDLElBQUksQ0FBQztFQUNoQyxNQUFNamxCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO0lBQ3hCLE1BQU1hLE9BQU8sR0FBSXZELE1BQU0sQ0FBMkU4bUIscUJBQXFCO0lBQ3ZILElBQUksRUFBQ3ZqQixPQUFPLGFBQVBBLE9BQU8sZUFBUEEsT0FBTyxDQUFFc2pCLE9BQU8sR0FBRSxNQUFNLElBQUk1akIsS0FBSyxDQUFDLCtDQUErQyxDQUFDO0lBQ3ZGTSxPQUFPLENBQUNzakIsT0FBTyxDQUFDLENBQUM7RUFDbkIsQ0FBQyxDQUFDO0VBQ0YsTUFBTW5vQixNQUFNLENBQUNVLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUNDLGFBQWEsQ0FBQyw2QkFBNkIsRUFBRTtJQUFFQyxPQUFPLEVBQUU7RUFBTyxDQUFDLENBQUM7RUFDckgsTUFBTXNiLGFBQWEsR0FBRyxNQUFNN25CLElBQUksQ0FBQ3NELFFBQVEsQ0FBQztJQUFBLElBQUF3a0IscUJBQUEsRUFBQUMscUJBQUE7SUFBQSxRQUFBRCxxQkFBQSxJQUFBQyxxQkFBQSxHQUFPbm5CLE1BQU0sQ0FDcEQ4bUIscUJBQXFCLGNBQUFLLHFCQUFBLGdCQUFBQSxxQkFBQSxHQUR3QkEscUJBQUEsQ0FDdEJQLE1BQU0sY0FBQU8scUJBQUEsdUJBRGdCQSxxQkFBQSxDQUNkQyxTQUFTLENBQUMsQ0FBQyxDQUFDemQsR0FBRyxDQUFFMGQsS0FBSyxJQUFLQSxLQUFLLENBQUM1VyxVQUFVLENBQUMsY0FBQXlXLHFCQUFBLGNBQUFBLHFCQUFBLEdBQUksRUFBRTtFQUFBLEVBQUM7RUFDckZ4b0IsTUFBTSxDQUFDdW9CLGFBQWEsQ0FBQ3hqQixNQUFNLENBQUMsQ0FBQ2lQLGVBQWUsQ0FBQyxDQUFDLENBQUM7RUFDL0NoVSxNQUFNLENBQUN1b0IsYUFBYSxDQUFDbEwsS0FBSyxDQUFFelIsS0FBSyxJQUFLQSxLQUFLLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQ2tCLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDcEU5TSxNQUFNLENBQUMsTUFBTStELGdCQUFnQixDQUFDckQsSUFBSSxDQUFDLENBQUMsQ0FBQzZNLE9BQU8sQ0FBQztJQUFFL0wsaUJBQWlCLEVBQUUsQ0FBQztJQUFFQyxjQUFjLEVBQUU7RUFBRSxDQUFDLENBQUM7RUFDekYsTUFBTW1uQixrQkFBa0IsR0FBRyxNQUFNckQsZ0JBQWdCLENBQUMsQ0FBQztFQUNuRHZsQixNQUFNLEVBQUEra0IscUJBQUEsR0FBQzZELGtCQUFrQixDQUFDMWQsU0FBUyxjQUFBNloscUJBQUEsdUJBQTVCQSxxQkFBQSxDQUE4QjFaLEVBQUUsQ0FBQyxDQUFDeUIsSUFBSSxDQUFDbWEsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUU1YixFQUFFLENBQUM7RUFDaEVyTCxNQUFNLEVBQUFnbEIsc0JBQUEsR0FBQzRELGtCQUFrQixDQUFDMWQsU0FBUyxjQUFBOFosc0JBQUEsdUJBQTVCQSxzQkFBQSxDQUE4QjljLE1BQU0sQ0FBQyxDQUFDNEUsSUFBSSxDQUFDbWEsYUFBYSxhQUFiQSxhQUFhLHVCQUFiQSxhQUFhLENBQUUvZSxNQUFNLENBQUM7RUFDeEUsTUFBTXhILElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSxzREFBc0Q7RUFBRSxDQUFDLENBQUM7RUFDckgsTUFBTUwsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSw2Q0FBNkMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDMUd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0Q2liLHVCQUF1QixFQUFFOUIsWUFBWSxhQUFaQSxZQUFZLHVCQUFaQSxZQUFZLENBQUUxYixFQUFFO0lBQ3pDeWQsd0JBQXdCLEVBQUU3QixhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUU7SUFDM0MwZCx1Q0FBdUMsRUFBRSxFQUFBOUQsc0JBQUEsR0FBQStDLGFBQWEsQ0FBQzljLFNBQVMsY0FBQStaLHNCQUFBLHVCQUF2QkEsc0JBQUEsQ0FBeUI1WixFQUFFLE9BQUs0YixhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUU7SUFDMUYyZCx3Q0FBd0MsRUFBRSxFQUFBOUQsc0JBQUEsR0FBQStDLFdBQVcsQ0FBQy9jLFNBQVMsY0FBQWdhLHNCQUFBLHVCQUFyQkEsc0JBQUEsQ0FBdUI3WixFQUFFLE9BQUs0YixhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUU7SUFDekY0ZCw0QkFBNEIsRUFBRVYsYUFBYTtJQUMzQ1csdUNBQXVDLEVBQUUsRUFBQS9ELHNCQUFBLEdBQUF5RCxrQkFBa0IsQ0FBQzFkLFNBQVMsY0FBQWlhLHNCQUFBLHVCQUE1QkEsc0JBQUEsQ0FBOEI5WixFQUFFLE9BQUs0YixhQUFhLGFBQWJBLGFBQWEsdUJBQWJBLGFBQWEsQ0FBRTViLEVBQUU7SUFDL0Y4ZCxjQUFjLEVBQUVyQyxZQUFZO0lBQzVCc0MsYUFBYSxFQUFFcEMsZ0JBQWdCO0lBQy9CelAsV0FBVyxFQUFFLE1BQU14VCxnQkFBZ0IsQ0FBQ3JELElBQUksQ0FBQztJQUN6QzJvQiwwQ0FBMEMsRUFBRTtFQUM5QyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztBQUN0QixDQUFDLENBQUM7QUFFRnRwQixJQUFJLENBQUMscUVBQXFFLEVBQUUsT0FBTztFQUFFVztBQUFLLENBQUMsS0FBSztFQUM5RlgsSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNM04sSUFBSSxDQUFDNEwsZUFBZSxDQUFDO0lBQUVDLEtBQUssRUFBRSxJQUFJO0lBQUVDLE1BQU0sRUFBRTtFQUFJLENBQUMsQ0FBQztFQUN4RCxNQUFNOUwsSUFBSSxDQUFDTSxJQUFJLENBQUMscURBQXFELENBQUM7RUFDdEUsTUFBTU4sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFFBQVE7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN2RSxNQUFNUyxxQkFBcUIsQ0FBQzNNLElBQUksRUFBRSxHQUFHLENBQUM7RUFDdEMsTUFBTW9jLElBQUksR0FBR3BjLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxjQUFjLENBQUM7RUFDekMsTUFBTStFLEtBQUssR0FBR3BSLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUM7RUFDbkMsTUFBTTZOLEtBQUssR0FBR2xhLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyxPQUFPLENBQUM7RUFFbkMsS0FBSyxNQUFNbVEsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxFQUFFO0lBQzlDLE1BQU14YyxJQUFJLENBQUMrTCxTQUFTLENBQUMsUUFBUSxFQUFFO01BQUUxSixJQUFJLEVBQUVtYSxNQUFNO01BQUV4USxLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDckUsTUFBTWxNLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxPQUFPO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7SUFDdEUsTUFBTXNDLE1BQU0sR0FBRyxNQUFNNE4sSUFBSSxDQUFDL0MsV0FBVyxDQUFDLENBQUM7SUFDdkMvWixNQUFNLENBQUNrUCxNQUFNLENBQUMsQ0FBQ3dILEdBQUcsQ0FBQ0MsUUFBUSxDQUFDLENBQUM7SUFDN0IsTUFBTWpXLElBQUksQ0FBQ21qQixLQUFLLENBQUNDLElBQUksQ0FBQzVVLE1BQU0sQ0FBRWdLLENBQUMsR0FBR2hLLE1BQU0sQ0FBRTNDLEtBQUssR0FBRyxHQUFHLEVBQUUyQyxNQUFNLENBQUVpSyxDQUFDLEdBQUdqSyxNQUFNLENBQUUxQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO0lBQ3RGLE1BQU05TCxJQUFJLENBQUNtakIsS0FBSyxDQUFDdkYsSUFBSSxDQUFDLENBQUM7SUFDdkIsTUFBTXhCLElBQUksQ0FBQzRCLGFBQWEsQ0FBQyxlQUFlLEVBQUU7TUFBRTRLLFNBQVMsRUFBRSxDQUFDO01BQUVDLFdBQVcsRUFBRTtJQUFRLENBQUMsQ0FBQztJQUNqRixNQUFNN29CLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxNQUFNO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQ3NSLEtBQUssQ0FBQyxDQUFDO0lBQ3JFLE1BQU10ZCxJQUFJLENBQUNtakIsS0FBSyxDQUFDdEYsRUFBRSxDQUFDLENBQUM7SUFDckIsTUFBTXZlLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNaUYsS0FBSyxDQUFDOU4sUUFBUSxDQUFFK0ssT0FBeUIsSUFBS0EsT0FBTyxDQUFDMk4sTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDakcsSUFBSW9RLE1BQU0sS0FBSyxXQUFXLEVBQUUsTUFBTWxkLE1BQU0sQ0FBQzZNLElBQUksQ0FBQyxNQUFNK04sS0FBSyxDQUFDNVcsUUFBUSxDQUFFK0ssT0FBeUIsSUFBS0EsT0FBTyxDQUFDMk4sTUFBTSxDQUFDLENBQUMsQ0FBQzVQLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDL0g7RUFFQSxNQUFNcE0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLFVBQVU7SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN6RSxNQUFNbE0sSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE9BQU87SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDRSxLQUFLLENBQUMsQ0FBQztFQUN0RSxNQUFNa1EsSUFBSSxDQUFDa0IsS0FBSyxDQUFDLENBQUM7RUFDbEIsTUFBTXRkLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ0ssSUFBSSxDQUFDLFlBQVksQ0FBQztFQUN0QyxNQUFNNWQsSUFBSSxDQUFDK0wsU0FBUyxDQUFDLFFBQVEsRUFBRTtJQUFFMUosSUFBSSxFQUFFLE1BQU07SUFBRTJKLEtBQUssRUFBRTtFQUFLLENBQUMsQ0FBQyxDQUFDc1IsS0FBSyxDQUFDLENBQUM7RUFDckUsTUFBTXRkLElBQUksQ0FBQ3VkLFFBQVEsQ0FBQ00sRUFBRSxDQUFDLFlBQVksQ0FBQztFQUNwQyxNQUFNdmUsTUFBTSxDQUFDNk0sSUFBSSxDQUFDLE1BQU1pRixLQUFLLENBQUM5TixRQUFRLENBQUUrSyxPQUF5QixJQUFLQSxPQUFPLENBQUMyTixNQUFNLENBQUMsQ0FBQyxDQUFDNVAsSUFBSSxDQUFDLElBQUksQ0FBQztFQUNqRyxNQUFNcE0sSUFBSSxDQUFDd1AsVUFBVSxDQUFDO0lBQUVwUSxJQUFJLEVBQUVBLElBQUksQ0FBQ3dKLElBQUksQ0FBQ3JKLGlCQUFpQixFQUFFLHlDQUF5QztFQUFFLENBQUMsQ0FBQztBQUMxRyxDQUFDLENBQUM7QUFFRkYsSUFBSSxDQUFDLDhFQUE4RSxFQUFFLE9BQU87RUFBRVcsSUFBSTtFQUFFMkw7QUFBUSxDQUFDLEtBQUs7RUFDaEh0TSxJQUFJLENBQUNzTyxVQUFVLENBQUMsS0FBTSxDQUFDO0VBQ3ZCLE1BQU0zTixJQUFJLENBQUM0TCxlQUFlLENBQUM7SUFBRUMsS0FBSyxFQUFFLEdBQUc7SUFBRUMsTUFBTSxFQUFFO0VBQUksQ0FBQyxDQUFDO0VBQ3ZELE1BQU05TCxJQUFJLENBQUNVLGFBQWEsQ0FBQyxNQUFNO0lBQUdFLE1BQU0sQ0FBNkNpQyxnQkFBZ0IsR0FBRyxJQUFJO0VBQUUsQ0FBQyxDQUFDO0VBQ2hILE1BQU1wQyxxQkFBcUIsQ0FBQ1QsSUFBSSxDQUFDO0VBQ2pDLE1BQU1BLElBQUksQ0FBQ00sSUFBSSxDQUFDLHFEQUFxRCxDQUFDO0VBQ3RFLE1BQU1OLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7SUFBRTFKLElBQUksRUFBRSxRQUFRO0lBQUUySixLQUFLLEVBQUU7RUFBSyxDQUFDLENBQUMsQ0FBQ0UsS0FBSyxDQUFDLENBQUM7RUFDdkUsTUFBTStXLEtBQUssR0FBR2pqQixJQUFJLENBQUNxTSxPQUFPLENBQUMsaUJBQWlCLENBQUM7RUFDN0MsTUFBTS9NLE1BQU0sQ0FBQzJqQixLQUFLLENBQUMsQ0FBQy9VLFdBQVcsQ0FBQyxDQUFDO0VBQ2pDLE1BQU1sTyxJQUFJLENBQUMyVCxjQUFjLENBQUMsR0FBRyxDQUFDO0VBQzlCLE1BQU1tVixNQUFNLEdBQUcsTUFBTTlvQixJQUFJLENBQUNzRCxRQUFRLENBQUMsT0FBTztJQUN4QzJNLE9BQU8sRUFBRXJQLE1BQU0sQ0FBQ3FQLE9BQU87SUFDdkI4WSxTQUFTLEVBQUVwbEIsUUFBUSxDQUFDZ1csZUFBZSxDQUFDMEIsWUFBWSxHQUFHemEsTUFBTSxDQUFDaWMsV0FBVztJQUNyRXhCLFlBQVksRUFBRTFYLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQzBCO0VBQ3pDLENBQUMsQ0FBQyxDQUFDO0VBQ0gvYixNQUFNLENBQUN3cEIsTUFBTSxDQUFDN1ksT0FBTyxDQUFDLENBQUNxRCxlQUFlLENBQUMsQ0FBQyxDQUFDO0VBQ3pDLE1BQU10VCxJQUFJLENBQUN3UCxVQUFVLENBQUM7SUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsMkNBQTJDO0VBQUUsQ0FBQyxDQUFDO0VBQzFHLE1BQU1TLElBQUksQ0FBQzJULGNBQWMsQ0FBQyxJQUFLLENBQUM7RUFDaEMsTUFBTXJVLE1BQU0sQ0FBQzJqQixLQUFLLENBQUMsQ0FBQy9TLFdBQVcsQ0FBQyxDQUFDLENBQUM7RUFDbEMsTUFBTThZLEtBQUssR0FBRyxNQUFNaHBCLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxPQUFPO0lBQ3ZDMk0sT0FBTyxFQUFFclAsTUFBTSxDQUFDcVAsT0FBTztJQUN2QjhZLFNBQVMsRUFBRXBsQixRQUFRLENBQUNnVyxlQUFlLENBQUMwQixZQUFZLEdBQUd6YSxNQUFNLENBQUNpYyxXQUFXO0lBQ3JFeEIsWUFBWSxFQUFFMVgsUUFBUSxDQUFDZ1csZUFBZSxDQUFDMEI7RUFDekMsQ0FBQyxDQUFDLENBQUM7RUFDSCxNQUFNbmMsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSx1Q0FBdUMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDcEd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0QzRiLE1BQU07SUFDTkU7RUFDRixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztFQUNwQjFwQixNQUFNLENBQUMwcEIsS0FBSyxDQUFDL1ksT0FBTyxDQUFDLENBQUM3RCxJQUFJLENBQUMwYyxNQUFNLENBQUM3WSxPQUFPLENBQUM7RUFDMUMzUSxNQUFNLENBQUMwcEIsS0FBSyxDQUFDRCxTQUFTLENBQUMsQ0FBQzNjLElBQUksQ0FBQzBjLE1BQU0sQ0FBQ0MsU0FBUyxDQUFDO0VBQzlDenBCLE1BQU0sQ0FBQzBwQixLQUFLLENBQUMzTixZQUFZLENBQUMsQ0FBQ2pQLElBQUksQ0FBQzBjLE1BQU0sQ0FBQ3pOLFlBQVksQ0FBQztFQUNwRCxNQUFNL2IsTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDQyxhQUFhLENBQUMsc0VBQXNFLENBQUM7RUFDekksTUFBTXRNLElBQUksQ0FBQ3dQLFVBQVUsQ0FBQztJQUFFcFEsSUFBSSxFQUFFQSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSwwQ0FBMEM7RUFBRSxDQUFDLENBQUM7RUFDekcsTUFBTUwsU0FBUyxDQUFDRSxJQUFJLENBQUN3SixJQUFJLENBQUNySixpQkFBaUIsRUFBRSx1Q0FBdUMsQ0FBQyxFQUFFNEIsSUFBSSxDQUFDSSxTQUFTLENBQUM7SUFDcEd3TCxJQUFJLEVBQUUsSUFBSUMsSUFBSSxDQUFDLENBQUMsQ0FBQ0MsV0FBVyxDQUFDLENBQUM7SUFDOUJ0QixPQUFPLEVBQUUsVUFBVUEsT0FBTyxDQUFDdUIsT0FBTyxDQUFDLENBQUMsRUFBRTtJQUN0QzRiLE1BQU07SUFDTkUsS0FBSztJQUNMQyx1QkFBdUIsRUFBRSxNQUFNanBCLElBQUksQ0FBQ3FNLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDMFgsU0FBUyxDQUFDO0VBQ2pGLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO0FBQ3RCLENBQUMsQ0FBQztBQUVGMWtCLElBQUksQ0FBQyw2RUFBNkUsRUFBRSxPQUFPO0VBQUVXLElBQUk7RUFBRTJMO0FBQVEsQ0FBQyxLQUFLO0VBQy9HdE0sSUFBSSxDQUFDc08sVUFBVSxDQUFDLEtBQU0sQ0FBQztFQUN2QixNQUFNdWIsWUFBWSxHQUFHLG1HQUFtRztFQUN4SCxNQUFNQyxZQUE0QyxHQUFHLEVBQUU7RUFDdkQsS0FBSyxNQUFNcFcsTUFBTSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFXO0lBQ3hDLE1BQU0vUyxJQUFJLENBQUM0TCxlQUFlLENBQUM7TUFBRUMsS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxDQUFDO0lBQ3hELE1BQU05TCxJQUFJLENBQUNNLElBQUksQ0FBQyxHQUFHLENBQUM7SUFDcEIsTUFBTWhCLE1BQU0sQ0FBQ1UsSUFBSSxDQUFDcU0sT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM2QixXQUFXLENBQUMsQ0FBQztJQUN0RCxNQUFNbE8sSUFBSSxDQUFDc0QsUUFBUSxDQUFDLENBQUM7TUFBRThsQixjQUFjO01BQUVDO0lBQVksQ0FBQyxLQUFLO01BS3ZELE1BQU0zbEIsSUFBSSxHQUFHQyxRQUFRLENBQUNDLGNBQWMsQ0FBQyxNQUFNLENBQW1EO01BQzlGLElBQUksQ0FBQ0YsSUFBSSxFQUFFLE1BQU0sSUFBSUcsS0FBSyxDQUFDLGdFQUFnRSxDQUFDO01BQzVGLE1BQU1DLE9BQU8sR0FBRzdCLE1BQU0sQ0FBQzhCLElBQUksQ0FBQ0wsSUFBSSxDQUFDLENBQUNNLElBQUksQ0FBRUMsR0FBRyxJQUFLQSxHQUFHLENBQUNDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO01BQ3BGLElBQUksQ0FBQ0osT0FBTyxFQUFFLE1BQU0sSUFBSUQsS0FBSyxDQUFDLDZDQUE2QyxDQUFDO01BQzVFLE1BQU1NLE9BQWtCLEdBQUcsQ0FBQ1QsSUFBSSxDQUFDSSxPQUFPLENBQUMsQ0FBQztNQUMxQyxNQUFNMGlCLElBQUksR0FBRyxJQUFJQyxHQUFHLENBQVUsQ0FBQztNQUMvQixJQUFJOWhCLFFBQXlCLEdBQUcsSUFBSTtNQUNwQyxPQUFPUixPQUFPLENBQUNFLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFBQSxJQUFBaWxCLGdCQUFBO1FBQ3pCLE1BQU0va0IsS0FBSyxHQUFHSixPQUFPLENBQUNLLEdBQUcsQ0FBQyxDQUFpQjtRQUMzQyxJQUFJLENBQUNELEtBQUssSUFBSWlpQixJQUFJLENBQUNHLEdBQUcsQ0FBQ3BpQixLQUFLLENBQUMsRUFBRTtRQUMvQmlpQixJQUFJLENBQUNJLEdBQUcsQ0FBQ3JpQixLQUFLLENBQUM7UUFDZixJQUFJQSxLQUFLLENBQUNzaUIsU0FBUyxFQUFFMWlCLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ3NpQixTQUFTLENBQUM7UUFDbEQsTUFBTXBpQixLQUFLLEdBQUdGLEtBQUssQ0FBQ0csYUFBK0M7UUFDbkUsSUFBSUQsS0FBSyxhQUFMQSxLQUFLLGdCQUFBNmtCLGdCQUFBLEdBQUw3a0IsS0FBSyxDQUFFRSxRQUFRLGNBQUEya0IsZ0JBQUEsZUFBZkEsZ0JBQUEsQ0FBaUIxa0IsUUFBUSxFQUFFRCxRQUFRLEdBQUdGLEtBQUssQ0FBQ0UsUUFBUTtRQUN4RCxJQUFJSixLQUFLLENBQUNNLEtBQUssRUFBRVYsT0FBTyxDQUFDM0IsSUFBSSxDQUFDK0IsS0FBSyxDQUFDTSxLQUFLLENBQUM7UUFDMUMsSUFBSU4sS0FBSyxDQUFDTyxPQUFPLEVBQUVYLE9BQU8sQ0FBQzNCLElBQUksQ0FBQytCLEtBQUssQ0FBQ08sT0FBTyxDQUFDO01BQ2hEO01BQ0EsSUFBSSxDQUFDSCxRQUFRLEVBQUUsTUFBTSxJQUFJZCxLQUFLLENBQUMsZ0RBQWdELENBQUM7TUFDaEYsTUFBTTBsQixZQUFZLEdBQUc1a0IsUUFBUSxDQUFDQyxRQUFRLENBQUNpYyxtQkFBbUIsQ0FBQzdlLElBQUksQ0FBQzJDLFFBQVEsQ0FBQ0MsUUFBUSxDQUFDO01BQ2xGRCxRQUFRLENBQUNDLFFBQVEsQ0FBQ2ljLG1CQUFtQixHQUFHLE9BQU8sR0FBR2plLElBQUksS0FBSztRQUN6RCxNQUFNZ0gsT0FBTyxHQUFHLE1BQU0yZixZQUFZLENBQUMsR0FBRzNtQixJQUFJLENBQUM7UUFDM0MsT0FBT2dILE9BQU8sR0FBRztVQUNmLEdBQUdBLE9BQU87VUFDVmlMLE9BQU8sRUFBRWpMLE9BQU8sQ0FBQ2lMLE9BQU8sQ0FBQ3RLLEdBQUcsQ0FBRTNKLE1BQU0sSUFBS0EsTUFBTSxDQUFDK0osRUFBRSxLQUFLLGVBQWUsR0FDbEU7WUFBRSxHQUFHL0osTUFBTTtZQUFFMFgsSUFBSSxFQUFFO2NBQUUsR0FBRzFYLE1BQU0sQ0FBQzBYLElBQUk7Y0FBRWtSLEVBQUUsRUFBRUg7WUFBWTtVQUFFLENBQUMsR0FDeER6b0IsTUFBTTtRQUNaLENBQUMsR0FBRyxJQUFJO01BQ1YsQ0FBQztNQUNENm9CLE9BQU8sQ0FBQ0MsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSwyQ0FBMkNOLGNBQWMsK0JBQStCLENBQUM7TUFDbkh4b0IsTUFBTSxDQUFDb2QsYUFBYSxDQUFDLElBQUkyTCxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDckQsQ0FBQyxFQUFFO01BQUVQLGNBQWMsRUFBRXJXLE1BQU07TUFBRXNXLFdBQVcsRUFBRUg7SUFBYSxDQUFDLENBQUM7SUFDekQsTUFBTTVwQixNQUFNLENBQUNVLElBQUksQ0FBQytMLFNBQVMsQ0FBQyxRQUFRLEVBQUU7TUFBRTFKLElBQUksRUFBRSxVQUFVO01BQUUySixLQUFLLEVBQUU7SUFBSyxDQUFDLENBQUMsQ0FBQyxDQUFDQyxXQUFXLENBQUMsQ0FBQztJQUN2RixNQUFNM00sTUFBTSxDQUFDVSxJQUFJLENBQUNxTSxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDOEssVUFBVSxDQUFDK1IsWUFBWSxDQUFDO0lBQ3ZFLE1BQU1scEIsSUFBSSxDQUFDc0QsUUFBUSxDQUFDLE1BQU1LLFFBQVEsQ0FBQzBULEtBQUssQ0FBQ0MsS0FBSyxDQUFDO0lBRS9DLEtBQUssTUFBTThCLFFBQVEsSUFBSSxDQUFDO01BQUV2TixLQUFLLEVBQUUsSUFBSTtNQUFFQyxNQUFNLEVBQUU7SUFBSSxDQUFDLEVBQUU7TUFBRUQsS0FBSyxFQUFFLElBQUk7TUFBRUMsTUFBTSxFQUFFO0lBQUksQ0FBQyxFQUFFO01BQUVELEtBQUssRUFBRSxHQUFHO01BQUVDLE1BQU0sRUFBRTtJQUFJLENBQUMsQ0FBQyxFQUFFO01BQUEsSUFBQThkLHFCQUFBLEVBQUFDLGdCQUFBLEVBQUFDLGNBQUEsRUFBQUMsWUFBQSxFQUFBQyxlQUFBLEVBQUFDLGFBQUEsRUFBQUMsZUFBQSxFQUFBQyxhQUFBO01BQ2hILE1BQU1ucUIsSUFBSSxDQUFDNEwsZUFBZSxDQUFDd04sUUFBUSxDQUFDO01BQ3BDLE1BQU1wWixJQUFJLENBQUMyVCxjQUFjLENBQUMsR0FBRyxDQUFDO01BQzlCLE1BQU12SyxNQUFNLEdBQUcsTUFBTXBKLElBQUksQ0FBQ3NELFFBQVEsQ0FBQyxNQUFNO1FBQUEsSUFBQThtQixzQkFBQTtRQUN2QyxNQUFNNWIsTUFBTSxHQUFJMEosUUFBZ0IsSUFBSztVQUNuQyxNQUFNN0osT0FBTyxHQUFHMUssUUFBUSxDQUFDZ0wsYUFBYSxDQUFDdUosUUFBUSxDQUFDO1VBQ2hELElBQUksQ0FBQzdKLE9BQU8sRUFBRSxPQUFPLElBQUk7VUFDekIsTUFBTWdLLElBQUksR0FBR2hLLE9BQU8sQ0FBQ0kscUJBQXFCLENBQUMsQ0FBQztVQUM1QyxPQUFPO1lBQUUrSixDQUFDLEVBQUVILElBQUksQ0FBQ0csQ0FBQztZQUFFQyxDQUFDLEVBQUVKLElBQUksQ0FBQ0ksQ0FBQztZQUFFNU0sS0FBSyxFQUFFd00sSUFBSSxDQUFDeE0sS0FBSztZQUFFQyxNQUFNLEVBQUV1TSxJQUFJLENBQUN2TSxNQUFNO1lBQUVpRCxNQUFNLEVBQUVzSixJQUFJLENBQUN0SjtVQUFPLENBQUM7UUFDOUYsQ0FBQztRQUNELE9BQU87VUFDTHFLLFFBQVEsRUFBRTtZQUFFdk4sS0FBSyxFQUFFZ1AsVUFBVTtZQUFFL08sTUFBTSxFQUFFK1E7VUFBWSxDQUFDO1VBQ3BEdkUsSUFBSSxHQUFBOFIsc0JBQUEsR0FBRXptQixRQUFRLENBQUNnTCxhQUFhLENBQUMsa0JBQWtCLENBQUMsY0FBQXliLHNCQUFBLHVCQUExQ0Esc0JBQUEsQ0FBNEN6UyxXQUFXO1VBQzdEOU4sS0FBSyxFQUFFMkUsTUFBTSxDQUFDLGlCQUFpQixDQUFDO1VBQ2hDcUwsS0FBSyxFQUFFckwsTUFBTSxDQUFDLGVBQWUsQ0FBQztVQUM5QmlKLFFBQVEsRUFBRWpKLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztVQUNsQzhLLElBQUksRUFBRTlLLE1BQU0sQ0FBQyxlQUFlLENBQUM7VUFDN0J1TyxjQUFjLEVBQUVwWixRQUFRLENBQUNnVyxlQUFlLENBQUMwQixZQUFZO1VBQ3JEVixrQkFBa0IsRUFBRWhYLFFBQVEsQ0FBQ2dXLGVBQWUsQ0FBQ2lCLFdBQVcsR0FBR0M7UUFDN0QsQ0FBQztNQUNILENBQUMsQ0FBQztNQUNGdmIsTUFBTSxDQUFDOEosTUFBTSxDQUFDa1AsSUFBSSxDQUFDLENBQUNsTSxJQUFJLENBQUM4YyxZQUFZLENBQUM7TUFDdEM1cEIsTUFBTSxDQUFDOEosTUFBTSxDQUFDdVIsa0JBQWtCLENBQUMsQ0FBQ3ZPLElBQUksQ0FBQyxLQUFLLENBQUM7TUFDN0M5TSxNQUFNLEVBQUFzcUIscUJBQUEsSUFBQUMsZ0JBQUEsR0FBQ3pnQixNQUFNLENBQUNxTyxRQUFRLGNBQUFvUyxnQkFBQSx1QkFBZkEsZ0JBQUEsQ0FBaUI5YSxNQUFNLGNBQUE2YSxxQkFBQSxjQUFBQSxxQkFBQSxHQUFJdEgsUUFBUSxDQUFDLENBQUMvUyxtQkFBbUIsRUFBQXVhLGNBQUEsSUFBQUMsWUFBQSxHQUFDM2dCLE1BQU0sQ0FBQ2tRLElBQUksY0FBQXlRLFlBQUEsdUJBQVhBLFlBQUEsQ0FBYXRSLENBQUMsY0FBQXFSLGNBQUEsY0FBQUEsY0FBQSxHQUFJLENBQUN4SCxRQUFRLENBQUM7TUFDNUYsSUFBSXZQLE1BQU0sS0FBSyxHQUFHLElBQUlxRyxRQUFRLENBQUN2TixLQUFLLElBQUksSUFBSSxFQUFFdk0sTUFBTSxDQUFDNFcsSUFBSSxDQUFDQyxHQUFHLENBQUMsRUFBQTZULGVBQUEsSUFBQUMsYUFBQSxHQUFDN2dCLE1BQU0sQ0FBQ3lRLEtBQUssY0FBQW9RLGFBQUEsdUJBQVpBLGFBQUEsQ0FBY3hSLENBQUMsY0FBQXVSLGVBQUEsY0FBQUEsZUFBQSxHQUFJLENBQUMsR0FBRyxNQUFBRSxlQUFBLElBQUFDLGFBQUEsR0FBSy9nQixNQUFNLENBQUNTLEtBQUssY0FBQXNnQixhQUFBLHVCQUFaQSxhQUFBLENBQWMxUixDQUFDLGNBQUF5UixlQUFBLGNBQUFBLGVBQUEsR0FBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzNhLG1CQUFtQixDQUFDLENBQUMsQ0FBQztNQUM3STRaLFlBQVksQ0FBQzNtQixJQUFJLENBQUM7UUFBRXVRLE1BQU07UUFBRSxHQUFHM0o7TUFBTyxDQUFDLENBQUM7TUFDeEMsTUFBTS9HLElBQUksR0FBRyxXQUFXMFEsTUFBTSxJQUFJcUcsUUFBUSxDQUFDdk4sS0FBSyxJQUFJdU4sUUFBUSxDQUFDdE4sTUFBTSxNQUFNO01BQ3pFLE1BQU05TCxJQUFJLENBQUN3UCxVQUFVLENBQUM7UUFBRXBRLElBQUksRUFBRUEsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUU4QyxJQUFJLENBQUM7UUFBRStQLFFBQVEsRUFBRWdILFFBQVEsQ0FBQ3ZOLEtBQUssR0FBRztNQUFJLENBQUMsQ0FBQztJQUNyRztFQUNGO0VBQ0EsTUFBTTNNLFNBQVMsQ0FBQ0UsSUFBSSxDQUFDd0osSUFBSSxDQUFDckosaUJBQWlCLEVBQUUsc0NBQXNDLENBQUMsRUFBRTRCLElBQUksQ0FBQ0ksU0FBUyxDQUFDO0lBQ25Hd0wsSUFBSSxFQUFFLElBQUlDLElBQUksQ0FBQyxDQUFDLENBQUNDLFdBQVcsQ0FBQyxDQUFDO0lBQzlCdEIsT0FBTyxFQUFFLFVBQVVBLE9BQU8sQ0FBQ3VCLE9BQU8sQ0FBQyxDQUFDLEVBQUU7SUFDdENtZCxRQUFRLEVBQUVuQixZQUFZO0lBQ3RCMU0sTUFBTSxFQUFFLHlGQUF5RjtJQUNqRzJNO0VBQ0YsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7QUFDdEIsQ0FBQyxDQUFDIiwiaWdub3JlTGlzdCI6W119