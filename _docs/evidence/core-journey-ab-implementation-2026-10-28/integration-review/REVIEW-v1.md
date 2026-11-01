# Independent integrated frontend review — v1

**Integrated review complete — core-journey-ab-integration-review-v1. Verdict: NOT READY.** Two HIGH findings and material MEDIUM corrections remain. This is a fresh independent review, not implementation acceptance. The author stayed paused during review; reviewer edits are confined to this `integration-review/` evidence directory.

## Baseline and authority

Reviewed on 2026-10-28, Windows / installed Chrome 156, local preview `http://127.0.0.1:5180`, base HEAD `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`, dirty/uncommitted frontend. Root confirmed the explicit **Ready for integrated frontend review / EDITS PAUSED** handoff and checked the author phase4 report/hash manifest/HTTP200 before dispatch. All36 author source/config/test/fixture hashes match at both review start and end (`source-hashes-start.json`, `source-hashes-end.json`). No author source changed during the review. The scoped diff-whitespace check exited0; new evidence remains untracked rather than a committed delivery.

Primary authority: current paired contract package and independent `review/REVIEW-v2.md`, shared/09/10 contracts, token §9, current A/B briefs and their LogOut amendment. Frozen A manifest is `969061d34e48ffb2be3884fda3bc1bda3fb6a609dcf66526c7829949a70510fe`; B is `04991d3a4c991829ef6d58f46ccb57cc876fff14cfcf7e801ae41fd09b150c98`, freshly hash-checked. Read AGENTS, HANDOFF, orchestration/design-first/SDD entry policy and Ponytail full/spec-task-review. No Superpowers, implementation, GitHub mutations, commits, pushes, deployment or subagents.

Semble located current Record, media, Result and store seams; direct source reads established actual behavior. Semble snippets were not treated as runtime evidence. Serena's manual loaded; its symbol tools cannot parse this project's current language configuration (`Active languages: []`). Default execution and Node REPL failed with the Windows sandbox helper setup error; authorized elevated read/review commands worked. No automatic-approval rejection occurred.

## Findings

### IR-01 — HIGH / confirmed / capture behavior: recorder and timer run before source playback is ready

`frontend/src/services/browser-media/NativeBrowserMedia.ts:201` starts MediaRecorder; `:225` calls `onWindowStart` but only attaches a rejection handler to its promise; `:234` starts the fixed timer immediately. `frontend/src/features/record/useRecordController.ts:413` also declares `capturing` before metadata, seek and input acquisition have completed.

Fresh A browser probe delayed the **real video's** `play()` by 1200ms without replacing getUserMedia, MediaRecorder or captured media. Recorder start was t742.3ms; source play was t1965.7ms. At t~200ms the UI said Recording while the source was paused at0. The resulting saved first-window candidate stopped with source time **3.955466s**, rather than the supplied **5.1s** window end. It could then be accepted through the normal journey. A successful play that buffers at startup has the same unsafe seam. This is more than an unknown capture-latency tolerance: over a second of the reference window is omitted while full-window success is reported.

Evidence: `journey-browser.json`, checks `capture-before-source-start` and `capture-finished-1`; reproducible runner `review.cjs`. Scope: truthful preparing/readiness state, and a coordinated native recorder/reference start/stop boundary that waits for actual readiness, preserves the complete supplied window and handles readiness failure/interruption. Add a focused delayed-source browser regression using actual capture bytes; retain explicit Record-only input acquisition and disabled in-app interruption.

### IR-02 — HIGH / confirmed / deletion and late delivery: deleted-project payload still downloads

`frontend/src/features/result/FoundationResultPage.tsx:287-295` awaits `readGenerationMedia`, then creates and activates the download without checking whether its project/scope/request is still valid. Its workspace subscription at `:85` ignores a null workspace, retaining the old presentation. `IndexedDbProjectStore.readGenerationMedia` checks tombstone before hashing/return, but supplies no delivery fence across subsequent asynchronous work.

The focused probe wrapped the real store read, obtained the real generation payload, **successfully tombstoned the project using its own typed store method**, then returned that already-read payload. The UI still activated a download and retained its Result player. This is a deterministic local deletion/read race, not a request for backend retention policy or physical erasure.

Evidence: `seams-browser.json`, `tombstone-before-download-delivery` has `deleted:true`, `downloadOccurred:true`, `visibleResult:true`; actual bytes saved as `download-after-tombstone.mp4`; runner `seams.cjs`. Scope: fence late delivery against active actor/project/session/request state and tombstone invalidation; clear unavailable workspace/presentation and suppress cached late download activation. Preserve activation-pinned generation semantics while the request remains authorized. Verify deletion/account/route changes during a delayed delivery without allowing a stale continuation to create a download or navigation.

### IR-03 — MEDIUM / confirmed / header fidelity: B desktop removes approved title/dots; A phone retains title in Exit row

`frontend/src/styles/app.css:36` deliberately applies `display:none` to B desktop title and all position dots. At1440×900 the actual h1 and dot bounds are zero and neither appears. This contradicts the current B brief and token §9, which require centered title, three supplied-turn dots and the upper-right line count. The author's phase4 report explicitly describes the hidden state; it is a verified regression, not a wording ambiguity. A phone also leaves its title in the first-row Exit area (`:190`) instead of following that first row as the paired title contract requires; B phone uses the second row.

Evidence: `initial-browser.json`; visually inspected `B-1440x900.png`, `A-390x667-ru.png`, `B-390x844-ru.png`. Scope: restore the paired focused header hierarchy and responsive rhythm without moving A's viewport-centered media/panel axes. Update the browser assertions which currently accept hidden B title/dots; keep dots status-only/current-turn driven.

### IR-04 — MEDIUM / confirmed / responsive UX: desktop media sizing discards available-height fit

Record B uses a width-only874px media cap (`frontend/src/styles/app.css:43,49`); the Result uses a width-only920px cap and no short-height budget. At **1280×600**, B's16:9 stage ends at587.625px, so long-RU dialogue, waveform and all recording actions are below the first viewport. The screenshot contains practically only the video. This loses the approved short-desktop task composition rather than making an incidental footer scroll. The same missing height budget affects Result:player bottom681.5px and Download/Return bottom741.5px in a600px viewport, leaving transport and actions offscreen.

Evidence: `B-1280x600-ru.png`, `initial-browser.json`; `B-result-1280x600.png`, `seams-browser.json` (`short-result-fit`). Scope: reinstate source-contain available-height sizing for both Record and Result with readable external dialogue and the existing action hierarchy. Do not shrink/crop text, force phone fit, or recenter A's combined video/panel group. Check1280×600 normal and long RU,1366×650, plus normal widths after restoring the header.

### IR-05 — MEDIUM / confirmed / completion behavior: completed last-line primary Next is a no-op

`frontend/src/features/record/FoundationRecordPage.tsx:227` always renders primary Next; `:237` adds a separate To result whenever all takes are accepted. `useRecordController.ts:595` merely posts `resultRequiresExplicitAction` when candidate-free Next is activated on the accepted last line. The accepted refinement expressly puts **To result in that primary slot**, removes the duplicate shortcut there and starts assembly only on its explicit activation.

Fresh actual three-take journey → Result → Return → Next → Next displayed both Next and To result. Clicking the primary Next stayed on turn3 and told the user to choose the other action. Evidence: `journey-browser.json`, `completed-last-line-controls` and `completed-last-line-primary-click`; `completed-last-line.png`. Scope: candidate-free accepted last-line primary becomes the explicit To result action; earlier accepted Next remains navigation; accepting a replacement still stays in Record until that later explicit action.

### IR-06 — MEDIUM / confirmed / transport: paused Result seek release does not play

`FoundationResultPage.tsx:248,260` remembers whether the video was already playing and only resumes that prior state. The approved shared custom transport instead pauses while held and plays on release, except finite-end/cancellation cases. Fresh Result Original was paused; ArrowRight down/up moved to0.1s but remained paused. Record uses a different condition (`audition !== null`), so the supposedly shared semantics also diverge between screens.

Evidence: `journey-browser.json`, `paused-seek-release`; source `FoundationResultPage.tsx:246-262,446-448` and `useRecordController.ts:307-333`. Scope: implement the approved release-to-play behavior for paused audition/Result, retain selected source, stop at finite end, and keep pointer cancellation paused. Verify held pointer and repeated keyboard input separately; do not make blur/cancel start playback unintentionally.

### IR-07 — MEDIUM / confirmed / explicit icon contract: Exit uses ChevronLeft throughout

`FoundationRecordPage.tsx:279` and `FoundationResultPage.tsx:326,374` render Lucide ChevronLeft for Exit. The last explicit owner amendment requires actual **LogOut**, with Previous retaining chevron-left and Return retaining undo-2. Fresh Record and Result screenshots confirm the wrong geometry. Current Return also lacks its required undo-2 icon.

Evidence: `initial-browser.json` stores the actual Exit SVG class/path; `A-1440x900.png`, `B-1440x900.png`, `result-1440x900.png`. Scope: use actual installed Lucide LogOut/Undo2 geometry in the required roles, preserving1.1/no fill/currentColor/rounded joins and accessible names/phone targets. This literal owner correction should not reopen composition.

### IR-08 — MEDIUM / confirmed / calibrated popup: inverse message component is replaced by plain text styling

`frontend/src/styles/app.css:99` supplies#242424/radius8/bottom4/max480/padding12px and a different shadow; `RecoveryToast` returns one plain text node without the required icon/title/body structure. Token §9 and the frozen message calibration require#202020/radius10/bottom16/max520/padding14×16, the mapped PRO shadow,20px outlined error icon, Medium14/20 title and Regular14/20 body with their explicit colors. Timing alone does not establish component fidelity. On the phone screenshot the low placement also covers the lower edge of the action/guidance region.

Evidence: `seams-browser.json`, `popup-shape` shows computed#242424/radius8/bottom4 and text-only innerHTML; visually inspected `B-phone-permission-popup.png`. Positive: it expires and leaves ordinary durable guidance, so do not regress that separation. Scope: reproduce the approved message component and clearance with no embedded action; retain180ms/8s/140ms timing, retrigger, deliberate-hover and immediate reduced-motion behavior.

### IR-09 — MEDIUM / confirmed / Result accessibility: undersized phone ranges and incomplete tab semantics

`frontend/src/styles/app.css:233,236` leaves phone seek and volume inputs at24px high. Fresh390×844 browser bounds are **24px for both**, with no surrounding48px functional range target. `FoundationResultPage.tsx:393-400` declares tablist/tab roles but implements neither Arrow/Home/End navigation nor roving tab focus. Focusing Original and pressing ArrowRight leaves Original selected; both remain ordinary tab stops. The approved custom player requires these keyboard semantics and48px phone seek/volume controls.

Evidence: `seams-browser.json`, `phone-targets` and `result-tab-arrow-right`; `B-phone-result.png`. Scope: use the actual focusable/clickable range target at least48px and complete the selected-state keyboard control semantics without hiding controls or adding decorative UI. Verify actual touch near the expanded range edges and visible keyboard focus.

### IR-10 — MEDIUM / partial / required recovery proof: logical Exit/Settings return focus has no equivalent host path

Current Exit navigates to seeded home and Settings navigates to a standalone boundary; there is no boundary Return action preserving the original Record invoker. The source contains no logical return-focus identity and no `.focus()` call except the Result heading. Thus the exact accepted FOCUS-A6-01 scenario (failed explicit Exit/Settings save → Retry → boundary return → original logical invoker) cannot be operated in this host. This is a required-contract/verification gap, not a confirmed failure of a nonexistent closeable dialog.

Root disposition during review: full Projects/Settings UI remains excluded, but the honest boundary must support a minimal Return using retained navigation/recovery identity and logical focus. Scope: add that bounded equivalent and demonstrate known save/acceptance failure retains exact candidate/old accepted media/destination, visibly focuses ordinary Retry during recovery, and returns to original Exit/Settings after successful retry. Popup expiry must leave focus/scroll unchanged. No full boundary UI or persisted DOM reference is requested.

## Executed independent evidence and positive observations

`node .../integration-review/review.cjs` and `node .../integration-review/seams.cjs` used isolated Chrome contexts against5180. They did not run or overwrite the author's suite/evidence. An initial reviewer URL-glob mistake timed out after the first acceptance; it was corrected to inspect the actual query parameter and the complete runner subsequently passed. This tooling mistake is not a product finding.

- A and B both completed three explicit real getUserMedia/MediaRecorder captures → durable draft → acceptance → frozen initial Result. B entry had0input calls; after one intentional denied attempt and three actual captures it had4getUserMedia calls/3recorder starts.
- B's three persisted blobs have matching stored/actual SHA256 and byteSize/blobSize:74476/47428/71578bytes, with244800/164160/236160 decoded frames. See `seams-browser.json` media/operations/snapshots. These are native Chrome fake-input bytes, not physical microphone evidence.
- A1440 actual video center720 equals viewport center; panel272px,24px media gap and32px right gutter. Both source image and dialogue remain external/full contain in inspected screenshots. Boundary1247/1248 and phone390×667/844 were operated/captured.
- Actual decoded source waveform, retained take overlay, no speaker identity/global nav/visible legend/Process again, readable Mabry layout and local typed Services/native media boundary are present. Fresh platform-font evidence is recorded in `seams-browser.json`; no portable-font rights claim follows.
- Result entry is paused at0, scroll0 with complete heading visible in the normal desktop cohort, so the narrow SCROLL-A7-01 correction is confirmed there. Actual Original comparison followed by Download My dub delivered `example-dub.mp4`, SHA256`fe7cb91ebdd2a2e208de6935942d585fced88b734726d19e565958ad3b1bacc9`, consistent with the displayed illustrative dub, rather than the source asset. The fixture disclosure is visible and does not claim rendering from captured speech.
- Permission denial had ordinary durable text after the transient popup expired. Source/turn navigation is blocked during actual capture; no manual capture Stop/Pause was introduced.
- Code inspection confirms the store validates snapshot/project/media identity, hashes real Blob bytes before draft ACK, reserves content-bound operations, creates immutable initial snapshot authorization with acceptance, keeps separate result operations/generation lineage and checks tombstones in transaction commit paths. These narrower source facts do not supersede the confirmed delivery seam IR-02 or establish every race by execution.

## Evidence limits and next gate

This focused review intentionally did not rerun the author's complete17unit/14browser matrix. Author PASS remains supplied evidence for other scenarios, not independent acceptance. Known/unknown acceptance reload, all account/session switches, reverse-generation completion, delayed Watch new plus pinned retry, all storage faults, silence/partial/zero native permutations, full screen-reader speech, physical microphones/mobile devices, actual browser zoom/safe areas and cross-device ownership were not independently exhaustively exercised. FOCUS-A6-01 requires the bounded host equivalent above. Future live A/B, backend render/mixing/private delivery/production leases remain excluded and are not new findings.

Fix the scoped material findings through the owning Luna executor; keep prototype/canonical reference inputs unchanged. Request a new explicit named ready-for-review handoff after self-checks and frozen hashes. Re-review the fixes and affected actual-browser seams, then Root performs final connected proof/acceptance. Current v1 is **NOT READY** for that acceptance or a later live user comparison.
