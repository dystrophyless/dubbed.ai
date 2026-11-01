# Independent bounded recheck — core-journey-lowfi-v4

Date: 2026-10-27, Asia/Qyzylorda. Reviewer: GPT-6.1 Sol, High, independent of the author. **Complete: no material findings in the requested v4 revision. Ready to present v4 for owner checkpoint 1.** This is a review recommendation, not owner approval, high-fi approval or production acceptance. Review is finished; the stable target remains paused.

## Target and method

Received the explicit paused-author v4 handoff and read the current `BRIEF.md` / `evidence/version.json`. Preview: http://127.0.0.1:5178. Base revision `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`; isolated untracked prototype over the preserved dirty worktree. All seven manifest fingerprints matched before and after independent browser operation. Current `src.js` SHA-256: `1dbd1f5c8ea35652ff16405fe597cdb67ca26fd829c2625e52bbfceed65110a7`; `style.css`: `9cb33e0da6ab333e265a52697c818bd6a86aea643d3cf0add20938e9156907c3`.

Installed Chrome 156.0.8078.48, Windows, headless, DPR 1, browser zoom 100%. Own browser scripts, viewport bounds and screenshots; did not rerun the author's layout/transport/phone scripts as independent evidence. Scope was the three owner-requested v4 changes, Record return sizing, candidate/failure behavior and one carried-forward short-phone context scenario. No high-fi calibration was added.

## Requested changes

**Desktop height fit: passed.** At scrollY=0, with both actual prototype and app headers included, the complete scene, dialogue, waveform/playhead, time and Reference volume control fit inside 1920×910, 1440×900, 1366×650 and 1280×600. Each was checked with normal and long Russian stress dialogue after fonts/layout settled. All source players use `object-fit: contain`; stage ratio is within 0.01 of 16:9; waveform/playhead horizontal edge and width differences are under 1 CSS px. Dialogue retains its readable column instead of inheriting the narrow short-screen stage width.

| Viewport | Normal stage | Long-dialogue stage | Lowest measured control edge |
| --- | --- | --- | --- |
| 1920×910 | 785.77×441.98 | 785.77×441.98 | y=891.98 |
| 1440×900 | 768×432 | 768×432 | y=882 |
| 1366×650 | 440.88×247.98 | 432×243 | y=632 |
| 1280×600 | 352×198 | 343.11×192.98 | y=582 |

The smallest desktop stage is intentionally about phone width to keep the whole performance loop visible. It remains a usable contained source preview; show the short-desktop capture at the owner checkpoint so this tradeoff is visible. No additional blocker was identified.

**Process again visibility: passed.** A failed first acceptance stays on line 1 with the exact candidate retained and the entire utility group still available. Candidate audition and Pause/Resume remain usable. Successful Retry save advances to line 2 and hides the entire `.utility` group (`display:none`, zero bounding-box height), including its explanation/divider. The saved-panel screenshot shows no empty utility gap. Returning from Result retains this hidden state.

**Result grouping: passed.** In assembly and ready desktop states, project label/heading align to the same x=260 left edge and 920px content container as stage and ready/actions. Ready states were also measured at 390×844 and 1280×600, preserving the shared container edges. The reviewer visually inspected desktop assembly/ready and phone ready captures. No decorative box was added. Return opens accepted line 1 and restores the Record composition: 768×432 stage and full performance-loop fit at 1440×900, identical to the pre-result measurement.

## Nearby regression and evidence

The acceptance sequence was operated to reach the affected Result view, including the failed-first-save/retry path. Capture remains automatic with playhead disabled and no Pause/Resume; capture completion waits for the next action. One 390×667 long-dialogue reduced-motion minimum-wheel Next→Record path independently rechecked context safety: new scene y=16..217 and complete dialogue/timer remain visible. Phone continues ordinary scrolling. No page errors arose in either bounded run. All seven target hashes remained unchanged.

Raw measurements / repeatable harnesses: `v4-independent-checks.json` / `.py`; `v4-phone-context-checks.json` / `.py`. Principal reviewer viewport captures:

- `v4-review-1920x910-normal.png`, `v4-review-1440x900-normal.png`, `v4-review-1366x650-long.png`, `v4-review-1280x600-long.png`;
- `v4-review-first-save-failure.png`, `v4-review-saved-panel.png`;
- `v4-review-result-assembly-desktop.png`, `v4-review-result-ready-desktop.png`, `v4-review-result-ready-390x844.png`;
- `v4-review-return-record.png`, `v4-review-390x667-long-reduce-second-capture.png`.

The Result ready screenshots capture native initial media loading UI; this bounded check establishes alignment, not a new playback/download acceptance claim. Prior reviewer findings UX-01/UX-02 remain resolved within the checked states. No new required polish finding was identified.

## Next step, limits and permissions

Present the named v4 proposal and actual desktop/short-desktop/phone task views for the explicit owner structure checkpoint. The three requested changes have independent evidence and need not be reopened as unanswered requirements.

Capture, saving and assembly remain simulated; synthetic audition audio and fixed result bytes remain fixtures. This proves no real microphone/mobile hardware/backend, durable storage, concurrency, unknown outcomes, billing, production generations, full accessibility or localization. The entire prior transport/guard/download matrix was not repeated: earlier independent reviews and the author's current regression reports are separate evidence. No source-exact high-fi fidelity, motion/icon calibration or font portability acceptance is claimed.

Only reviewer-owned `review/` artifacts changed. Author target, canonical specifications/tokens, production code, GitHub and Git history were untouched. No acceptance, commit, push or publication action was taken.
