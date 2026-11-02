# Page templates (archetypes)

Every Dubbed page is one of these archetypes. Each gets a **reference implementation** — open it, switch states with
`?state=…`, copy its structure. Source: `frontend/src/pages/styleguide/templates/<id>.tsx` · route
`/styleguide/templates/<id>`. Status: the simple archetypes are built and approved in **Phase 3** (Gate 3); the new
archetypes in **Phase 4** by design-architect (Gate 4 each). Until a template exists, its section below is the brief.

## Choosing an archetype

```
Signed out and authenticating (incl. the microphone step)?   → Auth
The public marketing page?                                     → Landing
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
Verify = `OtpInput` (6 digits, separator after 3, resend timer). Microphone step = permission request → `LevelMeter`
+ device `Select` + "Say something" hint → Continue; blocked permission → instructions + "Try again".

### Landing — `/styleguide/templates/landing` (Phase 3, after the simple pages)
Public bar · hero (display title, one line of value, "Start dubbing" primary, "120 credits free" tag) · how it works in
3 steps (upload · record · download) · a short demo clip at its own ratio · FAQ · footer. EN/RU.

### Projects (list) — `/styleguide/templates/projects` (Phase 3)
States: `default` `loading` `empty` `error` `slots-full`
PageHeader "My projects" + slot meter ("2 of 2 project slots used") · one card per project in a `Grid` (poster at its
own ratio, name, state tag from the lifecycle, progress "3 of 12 turns", primary action by state: Continue / Watch) ·
"⋯" menu: Rename, Delete (confirm). Empty = first-run EmptyState → New dub. Slots full = Alert with "Buy credits" /
"Delete a project".

### Settings — `/styleguide/templates/settings` (Phase 3)
States: `default` `loading` `saving` `error`
Sections in one column (narrow 720): Account (email read-only, interface language) · Microphone (device Select,
LevelMeter, test) · Password (change) · Danger zone (delete account → confirm dialog naming the consequence).

### Credits — `/styleguide/templates/credits` (Phase 3)
States: `default` `loading` `empty-history` `error` `purchasing`
Balance card (`NumberTicker`, "N in reserve") · packs as cards in a row (price, credits, one "Buy" each; prices pending) ·
history list (date · what · ± credits) with Pagination.

### New dub · Processing · Studio · Result (Phase 4, design-architect)
Briefs come from the user's goal (`BOOTSTRAP.md` Phase 4). The studio starts from the owner's fixed layout in
`studio-brief.md` (video → turn line → audio track as wide as the video; no timeline; level meter never in the studio).
