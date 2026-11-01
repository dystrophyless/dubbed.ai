# Independent low-fi UX review — core-journey-lowfi-v1

Date: 2026-10-27, Asia/Qyzylorda. Reviewer: separate GPT-6.1 Sol, High. Status: **findings — one material P2 needs a bounded revision before owner checkpoint 1**. Review of v1 is finished; no author files were edited. This is a structure/interaction review, not production acceptance or high-fi calibration.

## Target and method

Reviewed the explicit paused author handoff for `core-journey-lowfi-v1`, `BRIEF.md`, the preview at http://127.0.0.1:5178 and `evidence/version.json`. All six target SHA-256 checks matched after the independent journey. Base revision is `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`; the isolated prototype is untracked local work above the preserved dirty tree.

Real installed Chrome 156.0.8078.48, Windows, headless, DPR 1, browser zoom 100%. Independent Playwright mouse/keyboard operation, media inspection and reviewer screenshots: 1440×900 desktop, 390×844 phone, 1280×600 short desktop, and 390×667 short phone, including the supplied long Russian dialogue stress case. The reviewer visually inspected the captured initial/capture/guard/failure/result states. Author scripts informed setup only; the reviewer did not run them as independent verification.

Read the design-first stage handoff, relevant orchestration policy, Ponytail, both frontend design skills/app-screen critique guidance, shared contract and Flow 09/10, and Affect workflow/reference. Inspected the Button Clean Light PNG and applicable Clean CSS. The chosen Affect reference takes priority over generic skill rules. No high-fi component calibration or source-exact visual fidelity gate was applied to this low-fi.

## Material finding

### UX-01 — P2: the next short-phone recording starts with its timing cue offscreen

**Steps:** use 390×667 with normal English dialogue. Record line 1 and wait for automatic completion. Scroll down only enough to place the entire Next button inside the viewport (8px bottom clearance). Choose Next. Without another scroll, choose the now-visible Record for line 2.

**Observed:** the transition retains `scrollY=287`. The new scene occupies y=-43..157; its recording badge occupies y=-27..6. The line and Record control are visible, inviting immediate performance, but the scene is cropped by the viewport and the remaining-time cue is effectively hidden for the three-second take. This also happens more strongly if a user scrolls farther; the ordinary phone loop offers no new-line reorientation. It is not horizontal overflow or source object-fit cropping.

**Impact:** the prepared-video → read → perform loop loses part of its primary context at precisely the immediate-capture transition. The user must anticipate an upward scroll before recording or spend part of a short take correcting the view. Allowing ordinary short-phone scrolling is reasonable; retaining a navigation scroll position into a new performance is the problem. This is a material interaction issue rather than a request to squeeze everything into one viewport.

**Evidence:** `review-shortphone-minscroll-candidate.png`, `review-shortphone-minscroll-newline.png`, `review-shortphone-minscroll-line2-capture.png`; geometry and steps in `minimal-scroll-checks.json` / `minimal-scroll.py`. The earlier `phone-task.py` uses Playwright locator auto-centering and can hide more video; those captures are exploratory, not the primary finding proof.

**Required outcome:** on a new-turn transition, and before immediate capture if needed, restore a useful view of the complete scene, dialogue and recording timing cue without hiding dialogue under an overlay. The lead owns the design solution. Recheck the actual scroll→Next→Record path at 390×667 and the long-dialogue case; do not merely capture the top of a full-page screenshot. A new explicit author handoff is required for re-review.

## Non-blocking observation

**UX-02 — P3, copy polish:** during capture the contextual help still says “Record this line to hear your take” and “Record a take to continue” while another line says “Keep going.” The prominent recording treatment makes the state understandable, so this need not add a low-fi approval blocker. At the appropriate revision/high-fi pass, keep the helper text aligned with the action currently in progress. Evidence: `review-desktop-capturing.png` and `review-shortphone-minscroll-line2-capture.png`.

## What works and was exercised independently

- Desktop hierarchy serves the actual job: the moving scene dominates, dialogue is clearly readable, rehearsal/capture/audition is distinct from sequential navigation. Short desktop contains the complete source with letterboxing; no blanket objection to black bars. Phone retains meaningful dialogue rather than shrinking it into metadata.
- Empty initial Next and Your take are disabled with explanations. Replay reaches the fixed-window end and restarts on a new activation. Activating the active Replay pauses; another activation restarts. Record supersedes both original playback and candidate audition; capture locks transport/navigation, ends automatically and waits for an explicit next action.
- Your take plays candidate audio with muted source video. Rerecord creates a new candidate only after completion. A failed replacement save preserves both the exact candidate identity and prior accepted identity, stays on the line, retains actionable feedback and allows candidate playback. Retry accepts that same candidate; an accepted revisit navigates without changing the accepted ID. Blocked recapture protects the existing candidate; browser-local reload retains it.
- Previous candidate guard: Stay, discard, and Save and go exercised. Workspace guard: Stay, discard, and Save and leave exercised. Settings is explicitly a neighboring-screen boundary; input failure protects existing media and points only to Settings. No check/setup UI appeared inside Record.
- Third acceptance leads to simulated assembly and the distinct illustrative output. Playback advances, MP4 download starts, Return opens first accepted line without capture and stops output playback. Completed-project replacement stays in Record; explicit To result starts the revised simulated result.
- Test toggles and simulation disclosure remain in the separate prototype strip. No microphone permission was requested. No page errors observed in the principal independent journey. Target hashes remained unchanged.

Raw evidence: `independent-checks.json`, `guard-revision-checks.json`, `minimal-scroll-checks.json`, `phone-task-observations.json`. Scripts with matching names are reproducible review harnesses. `review-phone-failed-save-full.png` shows durable failure explanation and retry; `review-previous-guard.png`, `review-desktop-result.png` and `review-phone-result.png` document adjacent states.

## Owner checkpoint after disposition

Recommend preserving this focused rehearsal structure. After UX-01 has a revision and independent recheck, show the owner desktop/phone plus the actual short-phone task, then ask only the two consequential proposals already identified: the prominent 26/34 desktop and 24/32 phone dialogue role, and active direct Replay/Your take pausing followed by restart on the next activation. The reviewer sees no reason to add a turn list, permanent technical counters or a microphone check.

## Limits and permissions

Capture, saves and assembly are simulated; synthetic WAVs and fixed illustrative result bytes are not the user's recording. The reviewer observed unmuted advancing audio media and non-silent synthetic sample data, not physical speaker listening or production-quality mixing. Waveform is illustrative. Browser-local reload is not durable account storage. No real microphone/mobile hardware, backend, multi-tab exclusivity, concurrency, unknown outcomes, immutable-generation races, billing, full localization, authentication or full Settings proof. High-fi exact controls/icons/motion/font portability and full accessibility audit remain later work.

Only files under `prototypes/core-journey-lowfi/review/` were written. No canonical documents, production implementation, author files, GitHub, commit, push or external publication were changed.
