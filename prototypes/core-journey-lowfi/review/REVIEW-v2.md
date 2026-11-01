# Independent bounded recheck — core-journey-lowfi-v2

Date: 2026-10-27, Asia/Qyzylorda. Reviewer: GPT-6.1 Sol, High, independent of the author. **UX-01 resolved. No remaining material low-fi findings. v2 is ready to present for owner checkpoint 1 on structure and interaction.** This is a reviewer recommendation, not owner approval, high-fi approval or production acceptance. Review is finished and target edits remain paused.

## Target and scope

Received an explicit new paused-author handoff for `core-journey-lowfi-v2`. Read updated `BRIEF.md`, `evidence/version.json` and the author's correction/evidence description. Preview: http://127.0.0.1:5178. Base revision `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`, isolated untracked prototype above the preserved dirty worktree.

All six version-manifest fingerprints matched before and after the independent recheck. Changed target fingerprints: `index.html` SHA-256 `27b1fe6428e2d367cd8bb7f2efdc6d5b4ce70ed1dd31f8f80ac877678bca6698`; `src.js` SHA-256 `2e34deb7e82192af510022be4b6ce3cb70cf8a89fc3cc8dcdc4b30925eced2ec`.

The bounded scope was UX-01 and nearby capture, candidate guard, failure/retry and sequential-navigation regressions. v1 findings and the wider original review remain in `REVIEW.md`; no full journey re-review or new high-fi calibration was performed.

## Independent browser evidence

Installed Chrome 156.0.8078.48, Windows, headless, DPR 1, 100% browser zoom. Own Playwright wheel input and coordinate clicks exposed only the complete target control with 8px bottom clearance; no locator auto-centering for Record or Next. Did not rerun the author's scroll-check script.

The reviewer repeated line 1 capture → scroll to Next → Next → line 2 capture on:

- 390×667, normal dialogue;
- 390×667, long Russian stress dialogue;
- 390×667, long dialogue with reduced motion;
- 390×844, normal dialogue;
- 1440×900, normal dialogue, as the unaffected desktop control.

The full scene, spoken dialogue and capture badge were inside each actual viewport during capture. Normal short phone after Next now uses scrollY 228, scene y=16..216, badge y=32..65. The long short-phone dialogue remains readable at y=261..389 without an overlay. At 390×844, where the relevant content already fits, the browser retains useful position (scene y=133..334); desktop retains scrollY 0. Capture still begins immediately, locks navigation/transport, completes automatically, stays on its line and waits for user action. New-turn navigation does not autoplay.

A separate deliberate pre-capture scroll reproduced the formerly unsafe starting context directly: at 390×667, long dialogue and reduced motion, wheel 400px until the scene is above the viewport, then coordinate-click the visible Record. Before capture playback, v2 restored scene y=16..216, badge y=32..65 and dialogue y=261..389. The scene was immediately playing; no animation/countdown delayed the action. This independently exercises the pre-capture correction rather than only the new-turn branch.

Nearby checks: candidate Previous → Stay retained the same candidate; simulated failed save stayed on line 2 with the exact candidate available for advancing unmuted audition; Retry save advanced normally to line 3; Previous returned to the accepted line with useful scene/dialogue context. No page errors in the five-case bounded recheck. No target files changed.

Raw evidence and repeatable scripts: `v2-independent-checks.json` / `.py`, `v2-direct-capture-check.json` and `v2-direct-capture.py`. Reviewer inspected viewport screenshots including:

- `v2-review-390x667-normal-second-capture.png`;
- `v2-review-direct-capture-restores-context.png`;
- the geometry recorded for normal/long/reduced-motion new-line/capture states in `v2-independent-checks.json`.

## Dispositions and checkpoint

- **UX-01 / P2: resolved on v2**, supported by independent actual scroll→Next→Record and direct pre-capture rechecks. No scrolling ban, forced tiny text or sticky overlay is needed.
- **UX-02 / P3: explicitly deferred and non-blocking.** Helper copy during capture still belongs to the later polish pass. It does not prevent understanding of the prominent recording state.
- **No new material finding** arose within this correction and its adjacent interactions.

Present the named v2 preview and desktop/phone/short-phone task evidence for owner checkpoint 1. The consequential owner choices remain the prominent dialogue role (26/34 desktop; 24/32 phone) and active direct-action pause followed by restart on the next activation. The focused rehearsal structure remains a sound proposal. Obtain the owner's explicit structure/interaction decision before high-fi.

## Limits and permissions

This correction recheck is local browser evidence. Capture, saving and assembly remain simulated; synthetic WAVs, fixed illustrative output and waveform remain fixtures. It proves no real microphone/mobile-hardware behavior, backend durability, concurrent capture, unknown-outcome recovery, production generations, billing or full accessibility/localization. The wider v1 result/guard checks were not repeated wholesale on v2; the author's broader regression reports are separate evidence. Exact high-fi components, motion/icon calibration and font portability remain later work.

Only reviewer-owned `review/` evidence was written. Author files, canonical specifications/tokens, production code and GitHub were untouched. No commit, push, publication or acceptance action was performed.
