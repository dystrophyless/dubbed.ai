# Patterns

How to solve recurring UX problems with the kit. Each pattern names the components; the templates show them in place.

## 1. Forms

- **Layout:** one column (`Container width="form"` or a `Card`); related short fields side by side with `Grid min={200}`.
- **Labels** always visible above the field (`TextField`, `PasswordField`, `TextArea`, `Select`). Mark the minority:
  if most fields are required, mark optional ones (`optional`).
- **Validation:** format errors on blur, everything on submit. The error replaces the hint under the field, keeps the value,
  focus moves to the first invalid field. More than one error on submit → `Alert tone="danger"` at the top listing them.
  Never disable submit to signal errors; disable only while a request runs (prefer `loading`).
- **Submitting:** the submit `Button` gets `loading`; the form stays. Success → navigate or `toast()` ("Saved").
- **Autocomplete** on personal fields (`email`, `current-password`, `new-password`, `one-time-code`).
- Real `<input>` text is 16px on touch (iOS does not zoom) — the kit does it.

## 2. Feedback — which component?

| Situation | Use |
|---|---|
| An action succeeded (saved, renamed, take saved) | `toast()` — past tense, ≤ 5 words |
| An action failed and can be retried now | `toast({ tone: "danger" })` with the reason, or an inline error near the control |
| A form has errors | field `error` + `Alert` summary if > 1 |
| Something the user should know on this page (low balance, headphones recommended) | `Alert` at the top of the content |
| A list is empty / failed to load | `EmptyState` inside the list's container |
| The user must decide before continuing (leave with an unsaved take, delete) | `Dialog` |
| Several dismissible announcements | `NotificationStack` |

## 3. Destructive and irreversible actions

- Destructive `Button` / red `Menu` item, placed last (after a separator in menus).
- **Irreversible** (delete project, delete account): `Dialog role="alertdialog"` — title = the question with the object
  ("Delete “Kitchen scene”?"), body = the consequence (takes removed, credits not refunded), buttons [Cancel] [Delete project].
- **Reversible** (rename): act at once + toast; offer Undo only when it is real.
- **Leaving the studio with an unsaved take:** Dialog with three actions — Stay (ghost) · Leave without saving (secondary)
  · Save and leave (primary). Never claim the take is recoverable before its audio is durably saved.

## 4. Loading

| Wait | Use |
|---|---|
| Page / list first load | `Skeleton`s in the exact shape of the content (same card, same count up to 3) |
| Button action | `Button loading` (label stays readable) |
| Re-fetch with data on screen | keep the data; no skeletons |
| Multi-stage server work (preparing a project) | `StepProgress` — the waiting pill with the real step name + one segment per step + "Step 2 of 3 · About a minute left" (rounded to minutes; no time while queued) |
| < 300 ms | nothing |

Never a full-page spinner. Never block the top bar. Independent blocks load and fail independently.

## 5. Empty states

| Kind | Content |
|---|---|
| First run (no projects) | icon tile, title = what will be here, one sentence of value, primary action ("New dub") |
| No history (credits) | neutral EmptyState, no action |
| Error | `EmptyState tone="danger"`, "Couldn't load …", "Try again" |
| No dialogue found (a delivered result) | neutral EmptyState, explain it was charged, "Try another video" |

## 6. Media and recording

- **Video** always at its own aspect ratio (`VideoStage`, `SceneColumn`), no letterbox, nothing over the picture. Loading
  = shimmer surface; error = calm message + "Try again".
- **Recording** is red and immediate: no countdown; the record control shows the window ("Up to 4.4 s") and, while
  recording, the time left and a filling ring; it stops by itself at the end of the window.
- **Arrival on a turn without a take** (owner, 2026-11-03 — overrides "no autoplay"): the fragment plays once by itself
  with the original voice. **After a take:** no autoplay, no auto-advance. The user chooses: listen (the fragment with
  their voice), record again, or Next.
- **While recording the scene plays muted** (owner, 2026-11-03): only the user's voice is heard; the stage shows a quiet
  "Sound off" tag. Only Stop is visible; every other button is hidden in its kept slot.
- **Buttons appear step by step and keep their place** (studio-brief 14): `[‹] [Original] [Record]` + "Up to 4.4 s" →
  `[Stop]` + "1.5 s left" → `[‹] [Original] [My take] … [Record again] [Next →]`. **Next does not exist until there is a
  saved take** (no disabled Next, no "Record a take to continue"); on the last turn it reads "Build the result".
  Previous always works (a fixed icon slot at the left of the row, empty on turn 1).
- **Moving between turns** (studio-brief 15): the current dot's pill slides, the number rolls, the scene slides in from
  the side we moved to; all off under `prefers-reduced-motion`.
- **Studio keyboard** (shown in the tooltips): Space = play / pause the original · R = record / stop · ← / → = previous /
  next turn (only when allowed). Ignored in fields, sliders and while a dialog or popover is open; Space on a focused
  button keeps its native meaning.
- **Audio track** (`AudioTrack`): original grey; the take drawn over it (red while recording, blue when saved).
- **Level meter** only in the microphone check (sign-up step, Settings) — never in the studio.
- **Microphone failure in the studio:** an amber Alert above the action row — what happened, how to allow it in the
  browser, [Try again] and a link to the microphone check in Settings; Record stays visible but disabled and is described
  by the Alert. No device setup in the studio.
- **Original volume** is a listening control only — never affects the recording or the output.

- **Re-record mode** (owner, 2026-11-04 — opened from the result's "Re-record a turn"): every turn already has a take;
  ‹ / › move between turns; once a turn has a new take the primary is **"Build the new version"** instead of Next →
  the result with the new version assembling (free). Exit → the result, unchanged.

### Watching the result (Phase 4, `result-brief.md`)

- **The picture is as large as the page allows** (2.35:1 stage, up to the full content width, Download above the fold)
  and opens **full screen**: the button in the player controls, double-click on the picture, F; Esc leaves. The stage and
  its controls go full screen together (`PlayerScreen`); iOS Safari uses the video's own full-screen player.
- **Versions live in one place** — the status line under the title: assembling (keep watching this one) → ready ("Watch
  version 2" beside the title) → after switching, the new version plays **from 0:00** and the old one is gone. A failed
  new version leaves the current one untouched (Try again, free).
- **Nothing is offered that cannot be done yet:** while a version assembles, "Re-record a turn" is disabled with the
  reason written next to it (not only a tooltip).
- **Download is instant** and takes the version on screen; the file is named after the project.

## 7. Money and cost

- Every paid action names the exact cost on its button: "Start dubbing · 13 credits" (`CostButton`); no second confirmation.
- The price appears once, on that button; the balance is not repeated next to it (the top bar shows it).
- Not enough credits → the button is disabled, the shortfall is written under it ("32 more credits needed"), and
  "Buy credits" sits beside it; buying returns to the same page with the work kept (`ia.md` flow 6).
- Cancelling paid work shows what will be charged **before** confirming.

## 8. Navigation

- Ordinary shell owns the top bar; the current section is highlighted by route (tray pill).
- Back links above a page title: `BackLink` ("← My projects").
- Only the studio (the recording itself) uses the focused shell: only Exit (which may ask about an unsaved take).
  The result page is in the ordinary shell.
- URLs carry the place: the studio turn is in the path (`/turns/:n`), list filters in the query.
- A page that shows a shell value itself hides the shell's copy (the Credits page hides the balance pill —
  `AppShell hideCredits`): no duplicated information on one screen.

## 9. Responsive

- Design 390 and 1440 for every screen; check 1024.
- Below 1024: one column; asides go after the main content; toolbars wrap; navigation moves into the sheet.
- Key actions stay above the fold at 390 × 844 (in the studio: Record, Next/Previous).
- Touch: 36px buttons, 44px rows (Clean touch rules + DUBBED PATCH 1).

## 10. Alignment of neighbouring blocks

- Sections side by side share their header shape (all with a description, or none).
- Buttons in one row share one size; controls in one toolbar share one height.
- Cards in one row with an action each keep the actions on one line: the action sits at the bottom of the card
  (`margin-top: auto`); optional tags go into the title row, never above the button.

## 10a. Lists — hover, order, loading (owner review 2026-11-03)

- Row hover = a soft wash across the WHOLE row edge to edge (incl. its `⋯`), the title turns accent; nothing moves.
- Lists of the user's items are ordered by **most recently changed first** by default; offer a sort menu when > 1 item.
- Skeleton text lines use `SkeletonText` (a bar inside a line-high box) — never bare 12–14px bars that touch each other.
- History-like lists group by day (`ListGroup`: Today · Yesterday · date) and show the kind with an `IconTile`.
  Rows inside one day have **no hairlines** (`List dividers={false}`) — the day labels already separate the groups.
- Popovers that host a card component (the account `ProfileMenu`) get an explicit width: a fixed box has none of its own
  and the card collapses (regression covered by e2e).
- Numbers in copy follow the UI language (`Intl.NumberFormat`): "1.8 s" / «1,8 с».

## 10b. Review states must look different

Every `?state=` of a template must be visibly different from `default` (a busy dialog, locked options, a note). Templates
are remounted on every state change, so local demo state is seeded from the state they open in.

## 11. Every control does something

In templates, prototypes and pages every button, tab and menu item has a real effect. A control that does nothing is a
bug; if the feature can't do it yet, don't show it.

## 12. Popovers

Menus, selects and tooltips render in a portal (`usePopover`): fixed position, flip above when there is no room, clamped
8px inside the viewport, focus moves in after positioning, Escape returns focus to the trigger.
