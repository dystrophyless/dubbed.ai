# Feature Specification: Recording flow on mock services

**Feature Branch**: `restart-claude` (bootstrap worktree; no separate feature branch — owner rule in `CLAUDE.md`)

**Created**: 2026-11-04

**Status**: Draft (clarified 2026-11-04)

**Input**: User description: "Recording flow on mock services (first feature, Phase 5). The core loop of Dubbed working end
to end in the real app routes (not /prototypes), with the backend replaced by typed mock services: New dub → Processing →
Recording studio (focused shell) → Result. Credits, project slots and project states are simulated by the mock services
and persist in the browser for the demo. UI follows the Gate-4-approved high-fi prototypes and the design-system briefs.
Authentication and the real backend are out of scope."

**Design sources (approved, binding)**: `/prototypes/new-dub/page` + `design-system/new-dub-brief.md` ·
`/prototypes/processing/page` + `processing-brief.md` · `/prototypes/studio/turn` + `studio-brief.md` (decisions 1–25) ·
`/prototypes/result/page` + `result-brief.md` · My projects template (Gate 3) · `design-system/ia.md` (routes, lifecycle).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dub a scene from start to finish (Priority: P1)

A signed-in user opens New dub, chooses a short video from their device, picks the part to dub, sees the exact price on
the Start button and starts. The page shows the scene being prepared step by step; when it is ready the studio opens on
turn 1. For each turn the user watches the fragment, reads the line, can listen to the original, records their voice
(the scene plays muted), listens to their take in the scene, records again if needed, and moves on with Next. After the
last turn they press "Build the result", watch the whole scene with their voice (also full screen) and download it.

**Why this priority**: This is the product. Every other story only refines it; without it there is nothing to show.

**Independent Test**: In a fresh browser profile, go from `/new` to a downloaded result file (WebM in the demo) using only the UI
(microphone allowed), on desktop and on a phone-size screen, in English and in Russian.

**Acceptance Scenarios**:

1. **Given** a demo user with 120 credits and a free slot, **When** they choose a valid video of 4:12 and keep the
   default section, **Then** the section is 0:00–2:00 and Start reads "Start dubbing · 120 credits", the price appearing
   nowhere else on the page.
2. **Given** a chosen section of 72.3 s, **When** the user looks at Start, **Then** it reads "Start dubbing · 73 credits"
   (1 credit per started second).
3. **Given** the user presses Start, **Then** 73 credits are shown as reserved, the balance in the top bar drops by 73,
   and the Processing page shows "Waiting for our turn" and then steps 1–3 with a rough time estimate.
4. **Given** preparation finishes while the Processing tab is visible, **Then** "Ready — opening the studio" appears and
   the studio opens on turn 1 about 1.5 s later; **Given** the tab was in the background, **Then** the page waits with
   "Open the studio".
5. **Given** the studio on a turn without a take, **When** the user presses Record, **Then** the scene plays without
   sound, the take is drawn red over the original on the audio track, "N s left" counts down in the track corner, all
   other buttons stay in place disabled, and recording stops by itself at the end of the turn's window (or on Stop).
6. **Given** a saved take, **Then** "My take" plays the fragment with the user's voice, Record becomes "Record again" in
   place, and Next appears; on the last turn Next reads "Build the result".
7. **Given** "Build the result", **Then** the Result page shows the scene being assembled and then the player; Download
   saves the result file at once (WebM in the demo, see FR-022); the full-screen control, double-click and F open full screen, Esc leaves.

---

### User Story 2 - Money, slots and limits are always honest (Priority: P1)

Before spending anything the user knows what they can upload, what it costs and whether they can afford it; nothing is
charged by surprise.

**Why this priority**: Credits are real money later; the rules (reserve at start, settle on delivery, failures free,
exact cost before confirming a cancel) must hold from the first build.

**Independent Test**: With the mock services set to specific balances, slot counts and failure outcomes, each rule below
is observable in the UI and in the balance.

**Acceptance Scenarios**:

1. **Given** both free slots are used, **When** the user opens New dub, **Then** they are told before choosing a file,
   with "Open My projects" and a secondary "Buy credits" (the first purchase raises the limit to 10).
2. **Given** a file of the wrong type or over 250 MB, **Then** it is refused before any upload; **Given** a file that is
   longer than 10 minutes, unreadable or has no sound, **Then** it is refused after the upload check; no slot is taken.
3. **Given** 40 credits and a 72-credit section, **Then** Start is disabled with "32 more credits needed" under it and
   "Buy credits" beside it.
4. **Given** preparation is queued, **When** the user cancels, **Then** the dialog says it is free and all reserved
   credits return; **Given** step 1 is done, **Then** the dialog names the amount the service reports for the finished
   steps, the amount updates live if a step finishes while the dialog is open, and after confirming the user lands in
   My projects with a toast and the project disappears.
5. **Given** a service failure during preparation, **Then** the page says nothing was charged, the reserved credits are
   back on the balance at once, and "Try again" reserves them again and resumes from the failed step.
6. **Given** the scene has no dialogue, **Then** the user sees "No dialogue found", the credits are charged, and "Try
   another video" opens New dub reusing this project's slot.
7. **Given** a new version of the result is assembled after a re-record, **Then** no credits are charged.

---

### User Story 3 - Fix one line without losing the result (Priority: P2)

On the Result page the user hears a line they don't like, re-records just that turn and gets a new version, while the
version they have keeps playing.

**Why this priority**: Re-recording is how users get a result they are happy with; it must not cost a new preparation.

**Independent Test**: From a ready result, re-record turn 3, build the new version, switch to it and download it.

**Acceptance Scenarios**:

1. **Given** a ready result, **When** the user presses "Re-record a turn", **Then** a chooser lists the turns with the
   one under the playhead selected; choosing turn 3 opens the studio in re-record mode on turn 3.
2. **Given** re-record mode, **Then** every turn already has a take, ‹ and › move between turns, and after a new take
   "Build the new version" appears (on every turn from then on); several turns may be re-recorded before building.
3. **Given** the user exits re-record mode with new takes not built, **Then** they are asked "Build a new version before
   you leave?" with Stay / Leave without building / Build the new version; leaving without building keeps the takes and
   the result unchanged.
4. **Given** a new version is assembling, **Then** the current version keeps playing uninterrupted, "Re-record a turn"
   is disabled with the reason visible next to it, and Download reads "Download version 1" once version 2 is ready but not
   yet switched to.
5. **Given** version 2 is ready, **When** the user presses "Watch version 2", **Then** it plays from 0:00 and the old
   version is no longer available.

---

### User Story 4 - Leave and come back at any point (Priority: P2)

The user can close the tab or move around the app at any step and come back to exactly where they were.

**Why this priority**: Preparation takes minutes and recording a scene takes longer; losing progress would break trust.

**Independent Test**: Reload or reopen each route mid-flow and check the state; open `/projects/:id` and check the redirect.

**Acceptance Scenarios**:

1. **Given** a project in any state, **When** the user opens `/projects/:id`, **Then** they are redirected: preparing →
   Processing, recording → the first turn without a saved take, done → Result; an unknown id → My projects with a toast.
2. **Given** the user reloads the studio on turn 5, **Then** they are on turn 5 with all saved takes intact.
3. **Given** the user leaves Processing (or a result that is assembling) and opted in to notifications, **Then** a toast
   with "Open the studio" / "Watch the result" appears wherever they are in the app, and a browser notification is shown
   if the tab is in the background and permission was granted; the browser asks for permission only when the user
   presses "Notify me when it's ready".
4. **Given** the user exits the studio while a take is recording or saving, **Then** they are asked Save and leave /
   Leave without saving / Stay; "Stay" keeps what was recorded as the take.

---

### User Story 5 - My projects shows where every dub is (Priority: P3)

My projects lists the user's projects with their state and opens each in the right place.

**Why this priority**: It is the hub the other stories return to (after cancel, after "Open My projects"), but the core
loop works without it via direct routes.

**Independent Test**: Create projects in several states via the mock services and check each row's label and target.

**Acceptance Scenarios**:

1. **Given** projects in states Not started, Waiting to start, Preparing, Recording, Ready, No dialogue found, Something
   went wrong, **Then** each row shows the state as in `ia.md` → Project lifecycle (e.g. "3 of 12 turns") and opens the
   matching page; a cancelled project is not listed.
2. **Given** a done project whose new version is assembling, **Then** its row says "Ready" with "Assembling a new
   version" next to it.
3. **Given** the user deletes a project, **Then** it disappears and its slot is free again.

### Edge Cases

- The microphone is blocked or missing when the user presses Record: Record is disabled, a notice at the bottom says how
  to allow it and links to the microphone check in Settings; nothing on the page moves when it appears.
- The user records a take shorter than the window (Stop early): it is saved as the take.
- A turn's window ends while recording: recording stops and the take is saved automatically.
- A very long file name: the project title is truncated with an ellipsis; header actions are never pushed out.
- Scenes with many turns (up to ~40): the progress dots get smaller and still fit a phone.
- Clips that are not 2.35:1 (16:9, 9:16, 4:3): shown centred at full height of the 2.35:1 stage with black bars.
- A video ≤ 120 s: the section selector is still shown with the whole video selected.
- Replace video after the check: the new video goes into the same draft and slot.
- The user goes back (browser Back) from the studio to Processing of a ready project: they are redirected to the studio.
- Assembling the result fails: the service retries once by itself; then "Something went wrong" with a free "Try again";
  a failed new version leaves the current version untouched.
- Reload during upload: the upload is lost and no slot is taken; the page returns to "choose a video".
- Two tabs on the same project: the later action wins; the other tab shows the current state on its next refresh.

## Requirements *(mandatory)*

### Functional Requirements

**Routes and shells**

- **FR-001**: The flow MUST run on the real routes from `ia.md`: `/new`, `/projects/:id/processing`,
  `/projects/:id/turns/:n` (focused studio shell, no global navigation), `/projects/:id/result`, `/projects`, and the
  `/projects/:id` redirect; the other pages use the ordinary shell with the credit balance in the top bar.
- **FR-002**: Every screen MUST match its Gate-4-approved prototype (layout, states, copy, behaviour) and the decisions in
  the four briefs; any visual change goes back through owner review.

**New dub**

- **FR-003**: Users MUST be able to choose one video (MP4, MOV or WebM, ≤ 250 MB checked before upload; ≤ 10 min,
  readable and with sound checked after upload) and see upload progress with "Cancel upload".
- **FR-004**: Only after the check passes MUST the page show the video (2.35:1 stage, full card width), the project name
  taken from the file name, and the section selector (≤ 120 s, ≥ 1 s; default whole video if ≤ 120 s else 0:00–2:00) with
  "Play section" and a visible explanation when the 120 s limit is reached.
- **FR-005**: The price MUST appear once, on Start: "Start dubbing · N credits", N = started seconds of the section.
- **FR-006**: A checked video MUST become a draft that holds a slot; Replace video reuses it; cancelling the upload or a
  failed check takes no slot. The page says nothing about drafts.
- **FR-007**: With no free slot the page MUST say so before a file is chosen; with too few credits Start MUST be disabled
  with the shortfall and "Buy credits" beside it; returning from Credits restores the chosen video and section.

**Processing**

- **FR-008**: Pressing Start MUST reserve the price and open Processing, which shows the section's first frame dimmed in
  the 2.35:1 stage, the step progress (waiting, step 1–3 with names, "Step 2 of 3 · About a minute left", turns found so
  far from step 2), the reserve, Cancel, the leave line and "Notify me when it's ready".
- **FR-009**: Cancel MUST show the charge reported by the service before confirming (free while waiting; the amount
  updates live); confirming returns the rest and removes the project.
- **FR-010**: A service failure MUST refund the reserve at once and offer a free "Try again" that resumes from the failed
  step; "No dialogue found" MUST settle the charge and offer "Try another video" (same slot) and Delete project.
- **FR-011**: When ready, the visible page MUST open the studio on turn 1 after a short "Ready" moment; a background tab
  MUST wait with "Open the studio"; opted-in users get the in-app toast and the browser notification.

**Studio**

- **FR-012**: Each turn MUST show the turn's video fragment, its line (sound captions quieter), the audio track as wide as
  the stage, progress dots with "n of N", Exit, and original-voice volume, per `studio-brief.md`.
- **FR-013**: On arrival at a turn without a take the fragment MUST play once with the original voice.
- **FR-014**: Recording MUST capture the microphone with the scene muted, show the take red over the original and the
  time left in the track corner, keep all other buttons in place disabled, and stop at the end of the window or on Stop;
  the saved take is drawn indigo and survives reloads.
- **FR-015**: Next MUST exist only when the turn has a saved take; Previous exists from turn 2; on the last turn Next is
  "Build the result"; the keyboard shortcuts Space, R, ← / → work with their tooltips.
- **FR-016**: Exit MUST leave at once when nothing is unsaved and otherwise ask Save and leave / Leave without saving /
  Stay; in re-record mode with unbuilt new takes it asks Stay / Leave without building / Build the new version.

**Result**

- **FR-017**: "Build the result" MUST show the assembling state, then a player as large as the screen allows with full
  screen (button, double-click, F; Esc leaves), and an instant download of the version on screen named after the project (MP4 with the backend; WebM in the demo, FR-022).
- **FR-018**: Re-recording MUST go through the turn chooser into studio re-record mode; building a new version is free,
  never interrupts playback, is switched to explicitly ("Watch version 2", plays from the start), replaces the old version
  after the switch, and blocks "Re-record a turn" (with a visible reason) while any version is assembling.
- **FR-019**: A failed assembly MUST be retried once automatically, then offer a free "Try again"; a failed new version
  keeps the current one.

**Mock services and demo**

- **FR-020**: All server behaviour (uploads and checks, credits, slots, preparation steps and timing, turn data, takes,
  assembly, versions, failures) MUST come from a typed services layer with a mock implementation that can later be
  swapped for the real backend without changing the screens.
- **FR-021**: The mock state (balance, projects, takes, versions) MUST persist in the browser across reloads, start from a
  demo user with 120 credits and 2 free slots, and be resettable; the demo outcome of a preparation (ready, no dialogue,
  failure) and of an assembly MUST be selectable for testing.
- **FR-022**: In the demo, the result the user watches and downloads MUST be the user's own section with the scene's
  sound muted under each turn and the user's saved takes placed at their turns, mixed in the browser (owner, 2026-11-04:
  option B). Until the backend exists the downloaded file is WebM ("<Project name>.webm"), not MP4; the page names the
  format it actually offers.
- **FR-023**: Every string MUST exist in English and Russian; every screen MUST meet WCAG 2.2 AA (axe clean, contrast
  included) on desktop and phone sizes.

### Key Entities

- **Demo user**: credit balance, reserved credits, slot limit (2, or 10 after a purchase), language.
- **Project**: name (from the file), source video and section, state (draft, queued, preparing + step, recording,
  assembling, done, no dialogue, failed), slot held, price reserved / charged, created / changed times.
- **Turn**: number, line text (with sound captions), fragment start and window length, original audio peaks.
- **Take**: the user's recording for one turn (audio, peaks, saved time); one current take per turn; new takes made in
  re-record mode are marked until a new version is built.
- **Result version**: number, the takes it was built from, state (assembling, ready, failed), downloadable file.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time user can go from choosing a video to downloading the result of a 6-turn scene without help;
  with the demo timings the whole flow takes under 5 minutes of their time.
- **SC-002**: On every screen the key action is visible without scrolling at 1440 × 900 and 390 × 844, in English and
  Russian, with no horizontal scroll.
- **SC-003**: The balance shown is always consistent with the rules: after every start, cancel, failure, no-dialogue and
  new version in the demo, balance + reserved credits equals the expected value (100 % of scripted cases).
- **SC-004**: A reload on any page of the flow returns the user to the same project, page and turn with no saved take
  lost (100 % of scripted cases).
- **SC-005**: Recording starts within half a second of pressing Record and the saved take plays back in the scene with
  no audible offset a user would notice.
- **SC-006**: Every screen and state passes the automated accessibility check and the end-to-end tests on desktop and
  phone sizes.

## Assumptions

- A demo user is always signed in; sign-up, sign-in, the onboarding microphone check and Settings are separate features.
  The studio's "microphone blocked" notice links to the existing Settings route.
- Buying credits is a separate feature: "Buy credits" opens `/credits`; for the demo a reset / top-up control for the mock
  state is available outside the product UI (e.g. on the styleguide or via a query parameter), not shown to users.
- The mock "preparation" splits the chosen section into demo turns using the bundled demo lines; the user's own uploaded
  video is played back as the scene.
- Step costs for cancel are placeholders from the mock service (the real split is an open owner question).
- Recorded takes are kept in the browser; cross-device recovery comes with the backend.
- `_carryover/frontend-services/` is non-visual input: reused where it fits the approved behaviour, never as authority.

## Clarifications

### Session 2026-11-04

- Q: What does the demo result contain without a backend? → A: The user's section with their takes mixed over the muted
  scene in the browser, downloaded as WebM (option B); MP4 comes with the backend.
- Q: Mock services or the real backend first? → A: Mock services first (owner); the backend is a later feature.
- Owner decision (2026-11-13): Try again on a failed pending version builds from the current takes, updates its take timestamps and re-recorded-turn list to match those inputs, and marks newly included takes with that version's `inVersion`; no historical audio is stored.
