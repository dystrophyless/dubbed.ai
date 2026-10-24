# Historical failures during recording tab verification

Captured 2026-10-25. These are pre-fix/pre-test-adaptation observations, retained for review. The subsequent focused service and native checks passed.

## Save and leave with an already persisted candidate

Command from `D:\Program\python\Dubbed\frontend`:

```powershell
npm.cmd run test:e2e -- full-journey.spec.ts -g "registers, saves a millisecond selection"
```

The visible Save and leave action kept the dialog open and returned:

```text
status: error
code: storage-unavailable
message: Unable to add key to index 'candidateId': at least one key does not satisfy the uniqueness requirements.
```

The captured UI state was `The leave choice could not be saved. You can retry or stay on this screen.` The request carried an existing draft ID and candidate, `expectedGrantRevision: 0`, and `expectedProjectRevision: 8`; the project had `takeRevision: 1` and was on turn B. IndexedDB still showed the current tab's grant held at revision 0 and the earlier tab's grant released at revision 2.

Code tracing found that `resolveLeave` loaded the existing draft when `input.draftId` was present, then tested `input.blob` before `persistedDraftId`. It tried to insert the same candidate under a new draft ID, violating the unique `candidateId` index. The fix preserves the existing draft before taking the new-draft insertion branch. A unit regression and the native UI Save and leave/reload recovery flow now pass.

The raw Playwright context file under `frontend/test-results` was removed by later successful test runs. The exact observed error and state above were copied from the captured terminal diagnostic output; no transient file is claimed as attached.

## Viewport test after active-recording reload

Command before the test-only adaptation:

```powershell
npm.cmd run test:e2e -- recording-viewport.spec.ts -g "recording transport stays"
```

The existing viewport test changed the locale in `localStorage` and reloaded the active recording page. The new JavaScript realm was correctly blocked by the prior live grant, and the test's final capture control was disabled:

```text
expect(locator).toBeEnabled() failed
Locator: locator('.recording-transport__actions button').first()
Expected: enabled
Received: disabled
```

The visual test now changes EN/RU through the visible language selector without reloading the recording realm. Its revised native run passed. Reload blocking and reacquisition after real lease expiry are covered separately in the full journey test.
