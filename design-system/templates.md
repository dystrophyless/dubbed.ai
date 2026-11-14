# Page templates (archetypes)

Every Dubbed page is one of these archetypes. Each gets a **reference implementation** — open it, switch states with
`?state=…`, copy its structure. Source: `frontend/src/pages/styleguide/templates/<id>.tsx` · route
`/styleguide/templates/<id>`. Status: auth, projects, settings, credits, landing and status are **approved by the owner (Gate 3, 2026-11-03)**;
the new archetypes come in **Phase 4** by design-architect (Gate 4 each). Until a template exists, its section below is the brief.

## Choosing an archetype

```
Signed out and authenticating (incl. the microphone step)?   → Auth
The public marketing page?                                     → Landing
A whole-page state (not found, service error, offline)?       → Status
"My projects" — a list of the user's items with progress?      → Projects (list)
Account preferences, microphone, password, deletion?           → Settings
Balance, packs and history?                                    → Credits
Starting a new project from a video?                           → New dub          (Phase 4 high-fi: /prototypes/new-dub/page)
Waiting for preparation?                                       → Processing       (Phase 4 high-fi: /prototypes/processing/page)
Recording one turn?                                            → Studio           (Phase 4 high-fi: /prototypes/studio/turn)
Watching / downloading the dubbed video?                       → Result           (Phase 4 high-fi: /prototypes/result/page)
None fits                                                      → STOP: NEW-ARCHETYPE (process.md)
```

A page has exactly one archetype; it may add patterns (a Dialog, a Toast).

## Shells (built in Phase 1)

```
Ordinary (AppShell) — every signed-in page except the studio (incl. processing and the result)
┌ 56px white bar, hairline bottom ────────────────────────────────────────────────────────┐
│ [●] Dubbed   [My projects | New dub]                         ⓒ 120   EN|RU   (AM)    │
└──────────────────────────────────────────────────────────────────────────────────────────┘
  Container (content 1120 | narrow 720 | form 400)
  PageHeader: h1 · description · actions (right)
  sections (gap 24–32) …
< 1024: [●] Dubbed · ⓒ 120 · ☰ → sheet (navigation, EN|RU, account)

Focused (FocusedShell) — whole-screen tasks
┌ 56px, canvas ───────────────────────────────────────────────────────────────────────────┐
│ ← Exit                         <page title>                              <right slot>   │
└──────────────────────────────────────────────────────────────────────────────────────────┘

Studio (StudioShell) — the studio only: no bar; the header row sits above the video, inside its width
  ✕                         Kitchen scene                         🔊
                      ● ● ━━ ● ● ● ●   3 of 12
```

---

### Auth — `/styleguide/templates/auth` (Phase 3)
States: `sign-in` `sign-up` `submitting` `error` `verify` `verify-error` `microphone` `microphone-blocked` `reset`
```
                 [●] Dubbed                         EN|RU (corner)
              Create your account                  ← h1-size, one-line muted subtitle
        ┌ card (form 400) ─────────────┐
        │ (Alert on error)             │
        │ Continue with Google         │  secondary, full width
        │ ── or ──                     │
        │ Email · Password             │
        │ [Create account] lg primary  │  full width
        └──────────────────────────────┘
          Already have an account? Sign in
```
One panel per step (otp-input reference): icon tile · "Step n of 3" · 18px title · one line · the form · the
alternative action in the footer behind a hairline. Verify = `OtpInput` (6 digits, separator after 3, resend timer).
Microphone step = device `Select` + thin `LevelMeter` + "We hear you" → Continue (disabled until heard); blocked
permission → instructions + "Try again".

### Landing — `/styleguide/templates/landing` (Phase 3)
Public bar (brand · EN/RU · Sign in · "Start dubbing" primary) · hero: "120 credits free" accent tag, display title, one
line, primary + "No card needed"; the visual is the product itself — the studio's scene column (video · line · audio track
with a take over the original) · how it works in 3 cards (accent tiles; the recording step red) · FAQ as a disclosure list
in one card · closing call to action on an accent wash · quiet footer. EN/RU.
(Owner, 2026-11-03: this version is preferred over a variant with a 44px hero, a facts strip and a solid-indigo CTA.)

### Projects (list) — `/styleguide/templates/projects` (Phase 3)
States: `default` `loading` `empty` `error` `slots-full`
Narrow container (720). Title + "4 of 10 project slots used" under it; sort menu on the right (default **recently
changed first**, or Name A–Z). One `List` in one card: an 80px 16:9 frame, name, tag + progress (or length) + when; the
whole row opens the project (hover: the whole row washes, the name turns accent); `⋯` = Rename, Delete (confirm). Empty =
EmptyState → New dub (the only page-level primary). Slots full = warning Alert with "Buy credits".

### Settings — `/styleguide/templates/settings` (Phase 3)
States: `default` `loading` `saving` `error`
Two panels (narrow 720). **Account** — rows Email · Password ("Change" → dialog) · Delete account (red "Delete" →
confirm). **Microphone** — "Test microphone" in the panel header, device Select, thin level bar, status line.
The interface language is not here (it is in the top bar).

### Credits — `/styleguide/templates/credits` (Phase 3)
States: `default` `loading` `empty-history` `error` `purchasing`
Three panels (narrow 720): **Balance** (accent tile, big number, "about N min of dubbing · N in reserve"; the top-bar
pill is hidden here) · **Buy credits** (`OptionCards`: credits · minutes · price, "Best value"; footer: demo-price note +
ONE primary "Buy 1 000 credits · $9"; `purchasing` = cards locked, button loading, a note about the secure checkout) ·
**History** (grouped by day with `ListGroup`; each kind its own `IconTile`; top-ups in green; Pagination). Prices are
placeholders (brief §5).

### Status — `/styleguide/templates/status` (Phase 3)
States: `not-found` `error` `offline`
Ordinary shell, narrow column centred under the bar, **no card around the message**: a tinted 40px icon tile (search /
error / globe) · 28px title in plain words · one line · one primary (+ one secondary) · one panel that helps: **404** →
where to next (projects, new dub, credits) · **error** → "Nothing was charged" + error code with Copy (+ "write to support
with the code") · **offline** → reconnecting with a countdown + "saved takes are safe". No status codes ("404") and no
abstract pictures (owner, 2026-11-03).

### Studio (Phase 4 high-fi — concept A, Previous in the action row; **Gate 4 approved 2026-11-03**)
Prototype `/prototypes/studio/turn?state=&turn=&turns=&ratio=portrait` (`frontend/src/prototypes/studio/studio.tsx`);
owner decisions `studio-brief.md` 1–16. Purpose: record one turn — watch the fragment, read the line, record, check, move on.

```
StudioShell — one column, as wide as the picture (≥ 480 on wide screens), centred in the viewport
  ✕                 Kitchen scene                 🔊       header row = the only chrome
              ● ● ━━ ● ● ● ● ● ● ● ●  3 of 12
  ┌───────────────────────────────────────────────┐
  │                 video fragment                │    own shape; idle: first frame + ▷;
  │  [🔇 Sound off]          ▷                    │    recording: muted tag; My take: "Your voice" tag
  └───────────────────────────────────────────────┘
      Then why are we standing here with cold coffee?      TurnLine ([sounds] quieter)
  ┌───────────────────────────────────────────────┐
  │ ▌▌▌▌▌▌▌ original grey · take red / accent ▌▌▌ │    AudioTrack, as wide as the video
  └───────────────────────────────────────────────┘
  [‹] [▷ Original] [▷ My take]         [● Record again] [Next →]
phone (≤ 480): [‹] [Original] [Record]  /  [My take] [Next]
```

States: `no-take` · `arrival` (plays once) · `recording` (only Stop + "1.5 s left", muted scene) · `saving` · `saved` ·
`playing-take` · `last` ("Build the result") · `exit-unsaved` (dialog) · `mic-blocked` (Alert + disabled Record) ·
`loading` (skeletons in the scene's shape). **Re-record mode** (`?mode=rerecord`, opened from the result's chooser;
owner 2026-11-04): every turn already has a take; the row is `[‹] [›] [Original] [My take] ··· [Record again]`, and once
a turn has a new take `[Build the new version]` (primary) takes Next's place → the result with version 2 assembling;
Exit → the result unchanged. The normal last turn's "Build the result" opens the result (assembling). Responsive: the `--video-h` budget keeps the action row above the fold at
1440 × 900 and 390 × 844 for landscape and portrait clips; a portrait picture is narrower than the 480px column on wide
screens (open question for the owner).

### New dub (Phase 4 high-fi — concept A "one card"; **Gate 4 approved 2026-11-03**)
Prototype `/prototypes/new-dub/page?state=&reason=&ratio=&length=` (`frontend/src/prototypes/new-dub/new-dub.tsx`);
owner answers in `new-dub-brief.md`. Purpose: pick a video, check it is the right one, choose the section, start — the price
appears once, on Start. Start opens Processing: `/prototypes/processing/page?name=&credits=&from=&to=`.

```
AppShell (My projects · New dub, balance in the bar)
  column = as wide as a 2.35:1 stage can be with Start above the fold (≤ 1120, ≥ 640; full width on phones)
  New dub
  Choose a video and the part you want to dub — up to 2 minutes.
  ┌ before the check: ONE box (2.35:1, min 320px) — the parts swap, the box stays ─────────┐
  │            [⇧]  Drop a video here  (touch: Choose a video to dub)                     │
  │            MP4, MOV or WebM · up to 10 minutes and 250 MB                              │
  │            [Choose a video]                                                            │
  │  uploading: file · ▬▬▬▬▬ 64% · [Cancel upload]   checking: file · ▬ indeterminate · [Cancel upload]│
  │  error: ⓘ This video can't be used · reason (red) · format hint · [Choose another video]│
  │  no slot: ⚠ No free project slot · 2 of 2 used … · [Open My projects] [Buy credits]    │
  └────────────────────────────────────────────────────────────────────────────────────────┘
  ┌ after the check: one card ─────────────────────────────────────────────────────────────┐
  │ Kitchen scene (from the file name)                                   [↻ Replace video] │
  │ ████████████ video edge to edge, always 2.35:1; narrower clips: black bars ███████ ▷ │
  │ Section to dub                                                    0:30 – 1:42 · 72 s   │
  │ [░░░░[▓▓▓▓▓▮▓▓▓▓]░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]                                      │
  │ 0:00                     up to 120 s | ⓘ That's the limit — 120 s                4:12  │
  ├────────────────────────────────────────────────────────────────────────────────────────┤
  │ [▷ Play section]                     ([Buy credits]) [Start dubbing · 72 credits]      │
  │                                                        (32 more credits needed)        │
  └────────────────────────────────────────────────────────────────────────────────────────┘
phone: the same column; footer stacks full width — Play section · Start · (shortfall) · (Buy credits)
```

States: `empty` · `no-slot` (before any upload; way out: My projects) · `uploading` · `checking` · `ready` · `limit` ·
`error` (`&reason=type|size` refused in the browser, never uploaded; `length|no-audio|broken` after the server check) ·
`short` (Start disabled + shortfall + Buy credits) · `starting` (Start busy, everything else locked; then Processing).
Also `&ratio=portrait|16x9` (narrower clip, black bars) and `&length=short` (a video under 2 minutes: whole video selected).
Rules: preview and section only after the check; default section = the whole video if ≤ 120 s, else the first 120 s;
1 s minimum; the price only on Start (1 credit per started second); the balance stays only in the top bar; Cancel upload →
empty, no slot taken; a video left after the check is a Draft holding a slot. Responsive: `--video-h` = 100dvh − 446px
keeps the footer above the fold at 1440 × 900 (card ends at y ≈ 850); phones are width-bound.

### Processing (Phase 4 high-fi — concept B "the scene, waiting" + C's step progress; **Gate 4 approved 2026-11-03**)
Prototype `/prototypes/processing/page?state=&end=&ratio=&tab=&notify=` (`frontend/src/prototypes/processing/processing.tsx`);
owner answers and the open assumptions in `processing-brief.md`. Purpose: after Start — see that the scene is being
prepared, how far and roughly how long, what it costs, cancel knowing the charge, leave and be told, and land in the
studio on turn 1 when it is ready.

```
AppShell (My projects · New dub; the balance in the bar is after the reserve)
  column = New dub's column (as wide as a 2.35:1 stage can be with the footer above the fold; full width on phones)
  Kitchen scene                                               ← the project name (h1)
  Section 0:30 – 1:42 · 72 s
  ┌ one card — keeps its shape in every state ─────────────────────────────────────────────┐
  │ ███████ the section's first frame, edge to edge, always 2.35:1 — dimmed until ready ██ │  narrower clips: black bars
  │ (✳ Finding the lines)                              Step 2 of 3 · About a minute left │  StepProgress: waiting pill
  │ [▓▓▓▓▓▓▓▓▓▓▓▓] [▓▓▓▓░░░░░░░░] [░░░░░░░░░░░░]                                          │  + one segment per step
  │ 5 turns found so far                                     (line always reserved)        │
  ├────────────────────────────────────────────────────────────────────────────────────────┤
  │ 72 credits in reserve — charged when it's ready                  [✕ Cancel preparing] │
  └────────────────────────────────────────────────────────────────────────────────────────┘
      You can leave this page — preparing goes on, and the project waits in My projects.
                           [🔔 Notify me when it's ready]
ready:       (✓ Ready — opening the studio) · All 3 steps done · 12 turns ready to record · picture undimmed ·
             footer "72 credits charged" [Open the studio] (primary)
endings:     the status area becomes the message (IconTile + title + text), same stage above;
             no dialogue: [Delete project] [Try another video]    failed: [Delete project] [Try again]
phone: the same column; the meta line wraps under the pill (always reserved); the footer stacks full width
```

States: live (no `state`: waiting → step 1 → 2 → 3 → ready → studio turn 1; `&end=no-dialogue|failed` ends there) ·
`queued` ("Waiting for our turn", no time) · `running` (step 2) · `cancel-confirm` (dialog: "1 of 3 steps is done — 18
credits will be charged", the server's amount, updates live) · `cancel-queued` (free) · `no-dialogue` (charged; Try
another video reuses the slot) · `failed` (reserve returned at once, balance back up; Try again re-reserves and resumes) ·
`ready` (frozen = the tab was in the background: waits for "Open the studio"). Also `&tab=background` (a live run that
becomes ready in a background tab), `&notify=granted|denied`, `&ratio=portrait|16x9`, and
`/prototypes/processing/ready-elsewhere` (the "ready" toast with Open the studio on My projects).
Rules: one primary action at most (Open the studio / Try another video / Try again; while preparing there is none —
Cancel is secondary); the reserve is stated once; the time is rounded to minutes, never a countdown; the cancel price is
named before confirming; the browser is asked for notifications only on press; motion (pill roll, segment fill, undim)
off under `prefers-reduced-motion` — words and numbers still change. Responsive: `--video-h` = 100dvh − 446px as in New
dub (the footer ends at y ≈ 790 at 1440 × 900); phones are width-bound.

### Result (Phase 4 high-fi — concept C "watch, then fix", the video as large as possible + full screen; **Gate 4 approved 2026-11-04**)
Prototype `/prototypes/result/page?state=&rerecorded=&turns=&ratio=&notify=` (`frontend/src/prototypes/result/result.tsx`);
owner answers and the open assumptions in `result-brief.md`. Purpose: wait a moment while the video is assembled, watch
the whole scene with your own voice, download it — and if one turn sounds wrong, re-record exactly that turn and get a
new version without losing the current one.

```
AppShell (My projects · New dub, balance in the bar)
  column = as wide as a 2.35:1 stage can be with Download above the fold — up to the full content width (1120);
           --video-h = 100dvh − 344px; phones: the card runs edge to edge
  Kitchen scene                                                        [▷ Watch version 2]  ← only when it is ready
  ◌ Assembling version 2 with turn 3 re-recorded — keep watching this one.  ← the status line: the one place for versions
  ┌ one card — keeps its shape in every state ─────────────────────────────────────────────┐
  │ ████████████ the scene, edge to edge, always 2.35:1 — dimmed until the first version ███ │  narrower clips: black bars
  │ ████████████████████████████████ ( ▷ ) ███████████████████████████████████████████████ │  click = play/pause, dbl = full screen
  │ [▷] 0:04 / 0:13 [━━━━━━━━━━━●────────────────────────────────────────────────] [⛶]   │  PlayerControls (as tall as the
  ├────────────────────────────────────────────────────────────────────────────────────────┤  progress block it replaces)
  │ [🎤 Re-record a turn] (You can re-record once version 2 is ready)       [⇩ Download MP4] │
  └────────────────────────────────────────────────────────────────────────────────────────┘
assembling: picture dimmed; the middle is StepProgress (✳ Putting your voice into the scene · About a minute left);
            footer [Re-record a turn] disabled + reason · [🔔 Notify me when it's ready]; under the card "You can leave…"
failed:     the middle is the message (IconTile + "We couldn't put your video together" + "we tried twice… free");
            footer [Try again] (primary)
chooser:    Dialog "Which turn do you want to re-record?" — RadioGroup of the turns ("3. Then why… · 0:06 – 0:08"), the
            turn under the playhead selected, "Re-recording and the new version are free." · [Cancel] [🎤 Re-record turn 3]
            → studio ?mode=rerecord&turn=3
full screen: the stage and the controls row together (black, picture as large as it fits, white controls at the bottom)
phone: the same card full width; header action full width; footer stacks — Re-record (+ reason) · Download
```

States: live (no `state`: assembling → ready in ~5 s; `&rerecorded=3,5` = back from the studio, version 2 assembles
live) · `assembling` · `ready` · `chooser` · `new-version-assembling` (version 1 plays; Re-record disabled with the
reason) · `new-version-ready` ("Watch version 2" beside the title; Download says "Download version 1") ·
`new-version-failed` (version 1 untouched; Try again, free, beside the title) · `failed`. Preview of the "ready to watch"
toast elsewhere: `/prototypes/result/ready-elsewhere`.
Rules: one primary action (Download; Try again when failed; none while assembling); the version on screen is what
Download takes, the file is "<project name>.mp4"; switching plays the new version from 0:00 and the old one is gone;
re-recording is never offered while a version assembles (disabled + written reason); keys: Space / K play, F full screen
(Esc leaves); motion (undim, fill, pill) off under `prefers-reduced-motion`. Responsive: at 1440 × 900 the card is 1120
wide (stage 477 tall) and ends at y ≈ 782; shorter laptop screens narrow the column by height; phones are width-bound.

### Notes for Phase 4 briefs
Briefs come from the user's goal (`BOOTSTRAP.md` Phase 4). The studio starts from the owner's fixed layout in
`studio-brief.md` (video → turn line → audio track as wide as the video; no timeline; level meter never in the studio).
