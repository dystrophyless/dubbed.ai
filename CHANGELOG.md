# Changelog

All notable changes to Dubbed. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses [Semantic Versioning](https://semver.org/) — 0.x while in development: a feature raises the minor version,
fixes raise the patch.

## [0.2.0] — 2026-11-16

Feature 002 — the credits flow on mock services (`specs/002-credits-flow-mock/`).

### Added

- Credits page (`/credits`): balance with "about N min of dubbing", credits in reserve, one-time packs (300 · $3,
  1,000 · $9 "Best value", 3,000 · $24) and a paged history with one row per project run (reserved → charged,
  returned or partly charged), purchases and demo adjustments. History times follow the browser's 12/24-hour cycle.
- Simulated payment page (`/checkout/:id`) outside the app shell: "Demo payment — no real money", Pay, Back to Dubbed;
  declined, cancelled, completed and not-found states. Leaving or abandoning a payment never charges.
- Buy credits from New dub (shortfall, smallest covering pack preselected, "Back to New dub" keeps the video and
  section) and from a full slots notice; the first purchase raises project slots from 2 to 10.
- Inline errors when a purchase can't start or a payment fails; the pack stays chosen and the button retries.
- At 10 of 10 paid slots, New dub and My projects say "Delete a project to free a slot" instead of offering a
  purchase (more slots per purchase is planned as feature 003).
- Balance, history and the top-bar pill stay in step across tabs; EN and RU with Russian plural forms.
- Demo presets: `payment:success|declined`, `paydelay`, `startdelay`, `fail:start|pay|none`, `slots:10`.

### Fixed

- After a purchase the success notice no longer flashes the balance from before the purchase.
- Browser Back from a new payment page lands on a clean Credits page, not on the previous payment's outcome.
- Heading order on Credits and a landmark for the payment page header (design QA).

## [0.1.10] — 2026-11-15

Fixes from the tenth Codex review of PR #83 — the first under the review rules in `AGENTS.md`.

### Fixed

- "Try another video" on a no-dialogue project opens a fresh upload for that project, even when another draft
  exists; the new video can no longer replace a different project's video.
- The studio, Result and New dub show "Couldn't load this page" with Retry when their data can't be read, instead of
  loading forever.

### Changed

- `AGENTS.md` review rules rewritten as three short rules, following the Codex docs.

## [0.1.9] — 2026-11-15

Fixes from the ninth Codex review of PR #83 (two tabs on New dub).

### Fixed

- When another tab replaces a draft's video, this tab's section follows the new video instead of keeping a range from
  the old one, so Start works; ordinary refreshes still keep the range you chose.
- Each draft in My projects opens its own draft (`/new?project=<id>`), so an older draft created from another tab is
  no longer hidden behind the newest one; the address survives a reload.

## [0.1.8] — 2026-11-15

Fix from the eighth Codex review of PR #83.

### Fixed

- Resuming a project (opening it, its row in My projects, any redirect) leads to the first turn without a take, found
  by turn number rather than by the number of takes, so an earlier unrecorded turn is never skipped.
- On a first recording a direct link can't jump ahead past unrecorded turns: it opens the first turn without a take
  (the rule "move on only after recording the current turn"), so Build is reached only with every turn recorded.
  Re-record mode still moves freely.

## [0.1.7] — 2026-11-14

Fix from the seventh Codex review of PR #83.

### Fixed

- A malformed turn address (`/turns/foo`, `/turns/0`, `/turns/2abc`) opens the nearest real turn instead of a broken
  page, and keeps re-record mode when the address had it.
- Demo settings accept only sensible numbers: balance and turns are whole and finite, speed stays between 0.1 and 100.
- After "Try again" on a failed assembly the Result follows the version's own state, so it can no longer keep showing
  "failed" while the new attempt is already assembling; render failures are now logged for diagnosis.

## [0.1.6] — 2026-11-14

The sixth Codex finding plus a sweep of the whole feature for the same kinds of bugs: an action still waiting while
other buttons work, an error shown as success, and races between tabs.

### Fixed

- Cancel preparation never misleads about money: while the cost is being calculated the dialog says so and Confirm
  waits; if the project changes while the dialog is open (preparation finished, removed, another project opened from
  history) the dialog closes with a notice instead of acting on the old state; a cancel never turns into a delete
  without refund, and "credits returned" is shown only when they were.
- My projects shows the exact reserve and refund for sections with fractional seconds (72.3 s → 73 credits).
- The balance is read from one consistent snapshot.
- "Leave without saving" while a take is saving keeps the previous take; a cancelled upload, even at the last moment,
  creates no draft and takes no slot.
- "Save and leave" leaves only when the take really saved, and works if the take finished while the dialog was open.
- Starting, building and uploading no longer pull you back to a page you already left; a build locks the studio
  controls while it runs; storage failures show an error instead of freezing the page; the recording lock is always
  released.
- Pause right after Play no longer restarts the result or a studio clip without sound.
- Demo `turns:N` on a very short section keeps every turn inside the section (turns get shorter).

### Tests

- The blocked-microphone flow records with a 4 s window: a 1 s window could end before its checks on a busy machine
  (the flake seen in earlier full runs).

## [0.1.5] — 2026-11-14

Fixes from the fifth Codex review of PR #83.

### Fixed

- Moving to another turn while a recording is still starting cancels it: the take is no longer recorded into the turn
  just left, and Record works on the new turn.
- A video shorter than 1 second is rejected at the check ("It's shorter than 1 second") instead of becoming a draft
  that can never start.

## [0.1.4] — 2026-11-13

Fix from the fourth Codex review of PR #83, and one found by the test run.

### Fixed

- Leaving the studio while a recording is still starting (microphone or lock check pending) cancels it: the closed
  studio no longer turns the microphone on or replaces a saved take, and a double click on Record starts only once.
- Pause pressed right after "Play section" on New dub stops the video; before, it could keep playing silently while
  the button already showed it stopped.

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

[0.1.10]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.10
[0.1.9]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.9
[0.1.8]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.8
[0.1.7]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.7
[0.1.6]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.6
[0.1.5]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.5
[0.1.4]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.4
[0.1.3]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.3
[0.1.2]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.2
[0.1.1]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.1
[0.1.0]: https://github.com/dystrophyless/dubbed.ai/releases/tag/v0.1.0
