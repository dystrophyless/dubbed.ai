# Independent integrated frontend review — revision v4

**Integrated review complete — core-journey-ab-integration-review-v4. Verdict: PASS for the bounded independent integration-review gate. IR-13 is RESOLVED. No material finding remains open from IR-01–IR-13.** Root's final connected verification/acceptance remains separate; this is not deployment, live A/B or whole-product acceptance.

## Reviewed boundary

Reviewed2026-10-29 on Windows / installed Chrome156 against5180 after Root confirmed the explicit author v4 ready-for-review handoff and paused edits. Base HEAD9096925a4476e84ec9a6e5ef9bff50ae45ac0f67; frontend remains uncommitted in the pre-existing dirty tree.

All37 files from the v3 manifest match the expected v4 boundary at start and end (`source-hashes-start.json`, `source-hashes-end.json`). Exactly two differ from v3:

- `frontend/src/features/result/FoundationResultPage.tsx`:6bc4014e74a241adee3172b85b169432436adfd0f891d5c4a560c51b8f42249f.
- `frontend/e2e/record-journey.spec.ts`:96743b45d928a85aadc8d0fbc5104ca715734e70986cdd0771379466c8f3a527.

No source changed while reviewed. The other35 entries, including Record, native-media/lifecycle, store, fixtures and CSS, remain exact. Prior resolved findings and v3 visual/lifecycle evidence are retained under that unchanged-source boundary, not relabeled as fresh full-suite executions.

## IR-13 resolution and independent checks

Source review confirms each playback request binds the actual video element, actor/project scope key, source key, URL, media-load epoch and playback-interaction epoch. Direct Play, Replay and loaded-metadata resume use the fenced request path. Pause, seek, source/load/scope replacement and unmount invalidate obsolete work. AbortError does not falsely mark healthy media unavailable. A genuine current non-abort failure remains visible and has real selected-source Reload sample recovery.

Executed own `probe.cjs` with a new isolated browser context and normal **C:\Users\roman\AppData\Local\Temp**; no D: browser-temp override. It produced **25/25 explicit checks**: native partial-capture setup plus12 focused player checks per layout, **A and B independently**:

- Old Original request's delayed AbortError after switching to healthy playing My dub is ignored.
- Original→My dub→Original ignores an old disconnected Original request's late non-abort failure despite source-key recurrence.
- Late same-element failure after user Pause leaves that source paused/usable.
- Seek cancellation invalidates pending play and remains paused.
- Selected-source reload advances load/interaction identity; an old pending rejection cannot poison the reloaded media.
- Current NotSupportedError is visible; Reload sample actually loads/plays and restores a healthy source.
- Paused comparison preserves3s position; advancing comparison preserves time and playing intent.
- Finite end offers Replay; Replay starts near0 and actually plays.
- Route unmount/remount rejects an obsolete component's late continuation.
- Original-selected Download My dub delivers the correct pinned fixture in both layouts, SHA256fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9.

These are controlled browser playback-ordering probes, not claims that a physical device naturally emits that timing. Setup uses three actual getUserMedia/MediaRecorder partial captures accepted through the normal UI; no fake Recorder or backend render is substituted.

Additional own `scope.cjs` exercised B with a pending non-abort play promise, then a successful typed project tombstone between generation-byte read and download delivery. After the obsolete rejection arrived: deleted boundary present, player removed,0downloads, no resurrected error/player. This preserves IR-02 while checking IR-13 project-availability invalidation. Actual account-switch UI remains excluded; the actor/scope-key fence was reviewed in code, not presented as a completed production-auth test.

## Evidence

Unique successful directories preserve outputs and traces:

- `run-1793259674817/browser.json`: all25 checks, results, C: temp paths and playback-fault trace; `trace.zip` contains the full A/B run. `A/B-current-failure.png` and `A/B-recovered.png` show current failure and recovery; the recovered screenshot was visually inspected. `A/B-valid-dub.mp4` contain downloaded bytes.
- `scope-1793259801307/browser.json`: project-loss/pending-play check; `trace.zip` and `project-loss-after-play.png` preserve the result.
- `probe.cjs`, `scope.cjs`: reproducible independent probes. Both exited0; the A/B probe recorded no page errors.

No earlier failed output or author trace was overwritten. Author type/lint/build/17unit and focused A journey checks remain separate supplied evidence.

## Prior observations, limits and handoff

The earlier c2 Result-unavailable observation remains historical evidence whose exact cause cannot be reconstructed from its overwritten trace. IR-13's confirmed stale-continuation seam is fixed and the deterministic ordering regressions now pass independently for both layouts; this does not retroactively prove it caused that historical failure. V3's bounded resize window remains LOW/nonblocking; unchanged CSS is not represented as newly hardened. Historical fixed400ms clock observation and measured v3 native clock results remain documented without a physical timing claim.

No full browser suite was rerun for this two-file correction. Physical microphones, OS background/screen lock, cross-device ownership, complete account switching, exhaustive generation/worker races, screen-reader speech and backend rendering remain unproved/excluded. Output is explicitly illustrative and not rendered from accepted speech. Reviewer writes are confined to this new evidence directory; no product/prototype/canonical edits, commits, pushes, GitHub mutations or deployment occurred.

**Handoff:** IR-13 requires no further correction based on these checks. Preserve the paused source boundary for Root's final connected proof and acceptance.
