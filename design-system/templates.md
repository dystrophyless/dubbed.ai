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
Starting a new project from a video?                           → New dub          (Phase 4)
Waiting for preparation?                                       → Processing       (Phase 4)
Recording one turn?                                            → Studio           (Phase 4, studio-brief.md)
Watching / downloading the dubbed video?                       → Result           (Phase 4)
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

Focused (FocusedShell) — the studio only
┌ 56px, canvas ───────────────────────────────────────────────────────────────────────────┐
│ ← Exit                         <page title>                              <right slot>   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
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

### New dub · Processing · Studio · Result (Phase 4, design-architect)
Briefs come from the user's goal (`BOOTSTRAP.md` Phase 4). The studio starts from the owner's fixed layout in
`studio-brief.md` (video → turn line → audio track as wide as the video; no timeline; level meter never in the studio).
