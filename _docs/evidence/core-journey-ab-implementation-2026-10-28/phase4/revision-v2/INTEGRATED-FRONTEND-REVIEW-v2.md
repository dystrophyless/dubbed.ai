# Integrated frontend review — revision v2

**Status:** Ready for fresh independent review. **Author edits paused.** This is the local A/B frontend slice; it does not complete the whole product.

## Scope and revision boundary

The React/TypeScript frontend, shared Record and Result controllers, typed service boundary, local IndexedDB/Blob storage, browser-media port, and browser test harness live in the new `frontend/` tree. Both layouts use the same services and persisted account/project state. Layout choice is an explicit local test override, with no assignment analytics.

The Result markup and CSS now follow the approved A7/B1 composition: centered page title, reference-width stage with the inset workspace, full-width seek rail above transport controls, and the matching short-height action stack. The mock-result heading and disclosure stay explicit that the fixed sample was not created from accepted takes.

Repository base is `9096925a4476e84ec9a6e5ef9bff50ae45ac0f67`; the worktree was already very dirty. `frontend/` and this final evidence directory are untracked additions. No unrelated dirty files were cleaned, reverted, or staged. No commit, push, PR, deployment, or live A/B assignment was performed.

## Verification

Run from `frontend/` on Windows PowerShell, 2026-10-28:

- `npm.cmd run typecheck` — PASS.
- `npm.cmd run lint` — PASS, zero warnings.
- `npm.cmd test` — PASS, 4 files / 17 tests.
- `npm.cmd run build` — PASS, Vite production bundle generated.
- `$env:DUBBED_CORE_EVIDENCE_RUN='phase4/revision-v2/final-v4'; npm.cmd run test:browser -- --output=../_docs/evidence/core-journey-ab-implementation-2026-10-28/phase4/revision-v2/final-v4/playwright-output` — PASS, all 17 browser scenarios (2.9 minutes; configured local Chromium).

The connected A and B journeys record browser-native fake input, recover and accept persisted recordings, authorize the Result snapshot, compare sources, and download the displayed mock generation. Tests also cover delayed source start, partial capture, lost save acknowledgement, known save failure, guarded Exit/focus restoration, explicit revision authorization, local-tab exclusion, and denied microphone permission.

## Geometry and visual evidence

Final connected measurements: normal Result stage is 920px wide at y=108 (A) / y=104 (B). At 1280×600, A is y=88 / 547.5px and B is y=80 / 561.8px; document height remains 600px. At phone widths the stage is 358px with 48px or larger seek, transport, volume, source, and action targets. The connected suite captures the localized A Result screen in Russian plus English A/B screens and phone/short-height views.

Current screenshots, metrics, browser reports, and traces are under [`final-v4/`](final-v4/). The 39-entry frontend source SHA-256 manifest is [`source-manifest.json`](final-v4/source-manifest.json). Other sibling `revision-v2` folders contain intermediate debug runs; use `final-v4` as the current full-suite evidence.

## Limits

Playwright exercised the real browser `getUserMedia` and `MediaRecorder` APIs with browser fake audio input. No physical microphone or device matrix was tested. Result playback and download use an explicitly disclosed fixed fixture; no real render or mixing worker was built. Production authentication, billing, onboarding, settings, upload, cross-device leases, and production routing remain outside this frontend slice; neighboring routes are guarded boundaries.
