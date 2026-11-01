# Root final connected acceptance — local A/B frontend

Date: 2026-10-29, Asia/Qyzylorda. Acceptance source: delegated Orchestrator acceptance within the owner's authorized local frontend increment. **Accepted for the bounded prepared-project → Record → Result frontend implementation, both layouts.** This does not assert whole-product, backend, deployment or live-experiment readiness.

## Boundary and review

Base HEAD: `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`, branch `main`, origin `https://github.com/dystrophyless/dubbed.ai.git`. New frontend source remains uncommitted in the pre-existing dirty tree. No unrelated changes were reset, staged or deleted. No GitHub mutations, commit, push or deployment were authorized or performed.

The approved frozen A panel and B studio compositions were integrated with shared typed services, persistent local candidates/accepted takes, actual browser capture and a shared Result player. Author revision v4 was explicitly ready with edits paused. Independent [review v4](../integration-review/revision-v4/REVIEW-v4.md) passed, with no material IR01–13 finding open. Its 25/25 focused A/B player checks and separate project-loss check are independent evidence, not Root's own executions.

## Root executions after review

Windows, Chrome 156.0.8078.49, normal C: browser temp. All commands ran from `frontend/` against the paused v4 product boundary; documentation-only checkpoint updates followed.

| Command | Result | Raw evidence |
|---|---|---|
| `npm.cmd run typecheck` | PASS | `typecheck.log` |
| `npm.cmd run lint` | PASS | `lint.log` |
| `npm.cmd test` | PASS, 4 files / 17 tests | `test.log` |
| `npm.cmd run build` | PASS | `build.log` |
| `npm.cmd run test:browser -- --grep 'Layout [AB] records real browser fake input' --output='C:/Users/roman/AppData/Local/Temp/Dubbed-root-final-20261029'` | PASS, 2/2, A 35.1s / B 28.6s | `browser.log` |

Browser evidence used `DUBBED_CORE_EVIDENCE_RUN=root-final-2026-10-29`. Both connected journeys exercised three actual native fake-input captures, candidate persistence/recovery, accepted snapshot authorization, the Result player, Original-selected My dub download with exact fixture bytes/hash, and phone/short viewport checks. The shared journey additionally exercises guarded data recovery and playback error paths. Per-layout raw evidence and screenshots are in this directory. Root visually inspected both desktop Record views, Russian phone views and the phone Result. All 37 expected v4 source hashes are checked in `verification.json`.

The historical full-suite 21/21, 19/21 and 20/21 results remain recorded in the [v3 handoff](../phase4/revision-v3/INTEGRATED-FRONTEND-REVIEW-v3.md). Subsequent passing checks do not erase failures or reconstruct overwritten historical traces. The confirmed stale playback rejection defect was fixed in v4 and independently verified for both layouts. No new full-suite execution is claimed here.

## Preview and manual check

- A: http://127.0.0.1:5180/projects/sintel-prepared/record?layout=A&locale=en
- B: http://127.0.0.1:5180/projects/sintel-prepared/record?layout=B&locale=en

Play Original, pause/resume, seek and release. Record each line; seeking is locked during capture. Listen to Your take, optionally rerecord, then accept with Next. Finish the three lines, compare Original/My dub inside Result and download My dub. Returning to Record preserves accepted takes. Exit uses the honest guarded Projects boundary.

## Limits

Capture tests used real browser APIs with Chrome fake audio input, not physical microphones. Lifecycle interruption was modeled; actual phone backgrounding/screen lock, cross-device ownership and cross-browser/hardware behavior remain unverified. Result is fixed illustrative media (`productRendered=false`, `assembledFromAcceptedTakes=false`), not a render of captured speech. Full auth/onboarding/upload/processing/projects/settings/billing screens and real services remain outside this increment. Current A/B choice is an explicit local layout override, without allocation or analytics. Independent review measured a brief resize-only header overflow before layout settles; it remains a LOW nonblocking observation. No layout winner is selected.
