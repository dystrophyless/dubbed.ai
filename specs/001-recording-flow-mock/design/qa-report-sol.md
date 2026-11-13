# Design QA — 001-recording-flow-mock (Sol, trial run 2026-11-12)

Independent run by the `design-qa` role on Sol (medium). The agent returned the report in its reply; the main session
saved it here. Evidence (92 implementation and 12 prototype screenshots, `observations.json`, `verify.json`,
`boundary-styles.json`) is in `design/qa-gpt-sol/`.

**Verdict: FAIL.** The layouts match the approved composition; the failures are the player clock after a new version,
UI-boundary contrast, the studio waveform and the project thumbnails. Build, oxlint and stylelint pass; twelve axe
audits (colour contrast on) pass.

Coverage: 23 states × 1440×900 / 390×844 × EN / RU — Projects (empty, eight lifecycle rows, delete, queued and
preparing cancel dialogs), New dub (empty, chosen video, too few credits, no slot), Processing (queued, preparing,
cancel dialog, failed, no dialogue), Studio (ready, recording, saved, re-record), Result (assembling, ready, chooser,
new version assembling / ready).

## Findings, most visible first

| # | Finding | Evidence | Fix |
|---|---|---|---|
| 1 | P1 — Result shows `0:00 / 0:00` after a new version is ready (approved: `0:00 / 0:13`); the scrubber is unusable. Confirmed by the main session. | `qa-gpt-sol/result-new-ready-delayed-mobile-ru.png` vs `screens/result-new-version-ready-mobile-ru.png`; `qa-gpt-sol/verify.json:156–163` (readyState 4, non-finite duration) | `frontend/src/features/result/ResultPage.tsx:52–66` — initialise the duration when the ready video element mounts, not only on URL change (see the loading guard at 84–85); `services/media/mixer.ts:137–156`; show the known section length until the real duration is finite |
| 2 | P1 — UI boundaries below 3:1: white buttons and cards use a 0.5 px black-12 % outline ≈ 1.32:1 on white; surface vs canvas ≈ 1.10:1; the 10 % line token ≈ 1.25:1. Inherited from the kit. | `qa-gpt-sol/verify.json:207–220, 230–252`; `qa-gpt-sol/result-ready-mobile-en.png`, `new-ready-mobile-en.png`, `projects-rows-mobile-en.png` | `frontend/src/styles/tokens.css:187, 204–205` — a documented token patch to ≥ 3:1 (owner decision 2026-11-12); do not edit affect ports |
| 3 | P2 — The studio's original waveform is an almost flat line with the quiet demo clip (peaks ≈ 0.002–0.020). | `qa-gpt-sol/studio-ready-mobile-en.png` vs `qa-gpt-sol/reference-studio-ready-mobile-en.png`; `verify.json:12–76` | Display-only normalisation (owner decision 2026-11-12) around `services/media/browser-media.ts:30–43` / `features/studio/StudioPage.tsx:342`; the audio is unchanged |
| 4 | P2 — Every project thumbnail is the demo clip: the source is hard-coded. Confirmed by the main session. | `views/ProjectsView.tsx:221` (`/media/scene.mp4#t=1.2`); ui-spec.md:155 requires the first frame of the project's section | Pass the project's own video and section start through the row data, manage the blob URL, keep the icon fallback for failed / no-dialogue rows |

## Checklist

| Item | Result |
|---|---|
| Build / oxlint / stylelint | PASS (bundle > 500 kB warning) |
| Raw values, hard-coded copy, affect ports untouched | PASS |
| Archetypes, hierarchy, spacing, kit composition | PASS on the captured states |
| EN / RU copy, D1 download label + format, D3 rows and cancel dialogs | PASS |
| No horizontal overflow at 1440 / 390; key actions above the fold; one primary | PASS |
| Axe with colour contrast (12 audits) | PASS, sampled |
| UI-boundary contrast ≥ 3:1 | FAIL (finding 2) |
| Result player after a new version | FAIL (finding 1) |
| Project-specific thumbnails | FAIL (finding 4) |

## Not checked

D2 (recording in another tab), D4 (unknown project toast), loading and error states, 1024 px, MP4 / Safari,
notifications, keyboard paths; the full e2e suite (its two known failures were triaged as test timing).
