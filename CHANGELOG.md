# Changelog

All notable changes to Dubbed. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/) — 0.x while in development: a feature raises the minor version,
fixes raise the patch.

## [0.1.3] — 2026-11-13

Fixes from the third Codex review of PR #83 and a sweep for the same kinds of bugs.

### Fixed

- Replacing a draft's video no longer overwrites a project another tab has just started or removed, so its reserved
  credits are not lost.
- Other tabs drop their cached source video and thumbnails when a project changes, so the studio never pairs new turns
  with the old picture and sound.
- Money and state are decided inside one transaction everywhere: an old preparation poll can no longer refund a retry
  started in another tab, cancel charges the live step, removing a project another tab started refunds its reserve,
  and the slot limit is checked at write time.
- A take is not saved once assembly has started or the project was removed, and an older render can no longer publish
  over a newer build of the same version.

## [0.1.2] — 2026-11-13

Fixes from the second Codex review of PR #83.

### Fixed

- The price on Start always matches what is reserved: section handles are rounded before the bounds are applied, and
  Start stays on New dub if the chosen section could not be saved.
- Project edits (rename, notifications, section, builds, version switch and retry) read and write in one transaction,
  so a parallel status update can no longer be rolled back or refund credits twice.

### Changed

- "Try again" on a failed new version builds it from the current takes; a turn re-recorded after the failure is
  included and listed in the version's description (owner decision).

## [0.1.1] — 2026-11-13

Fixes from the Codex review of PR #83.

### Fixed

- A section of 1–2 seconds has no turns: it now ends as "no dialogue" (charged as the spec says) instead of opening a
  studio that never loads.
- An assembly left running is resumed from My projects too, so results and new versions no longer stay "assembling"
  after a reload there, and the ready notification arrives.
- Stop pressed while the microphone is still starting is honoured: the capture stops at once instead of recording the
  whole turn.

## [0.1.0] — 2026-11-13

First working version: the whole recording flow in the browser on mock services (feature
`specs/001-recording-flow-mock`).

### Added

- **My projects** — project list with lifecycle states, rename, delete (with the cancel quote for a running
  preparation), sort by recency or name, two project slots.
- **New dub** — video upload with type, length and size checks, section preview and its price in credits; low-balance
  and no-slot states.
- **Processing** — queue and three preparation steps, live cancel quote (charge for finished steps, refund for the rest),
  refund on failure, retry, "no dialogue" outcome, notification when ready while away.
- **Studio** — record each turn against the muted scene with a countdown and a progress ring, play the take, re-record;
  moving on needs a take; one recording tab at a time; waveforms normalised for display.
- **Result** — in-browser mix of the scene and your takes, player with fullscreen (button, double-click, F), download as
  WebM; re-record a turn and build version 2 while version 1 keeps playing.
- Reload keeps the user's place; unknown projects return to My projects with a notice.
- Typed `services` layer with an IndexedDB mock and `?demo=` controls (`reset`, `balance`, `slots`, `outcome`, `turns`,
  `turnms`, `speed`).
- English and Russian throughout.
- Tests: Vitest for money rules, turn planning and the mock adapter (39); Playwright business flows, route smoke with
  axe and mobile layout (85, about 8 minutes).

### Design system and setup (bootstrap phases 0–4)

- SpecKit workflow, agent roles and skills; React 19 + Vite scaffold.
- affect-ui Clean / Light kit with Inter, tokens only; `/styleguide` (Gate 1).
- Design-system documents and information architecture (Gate 2).
- Reference page templates (Gate 3).
- Approved high-fidelity designs for studio, new dub, processing and result (Gate 4).
- Owner decisions recorded as patches: WCAG AA text contrast, indigo accent, touch sizes, localised kit copy,
  red record buttons.

[0.1.3]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.3
[0.1.2]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.2
[0.1.1]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.1
[0.1.0]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.0
