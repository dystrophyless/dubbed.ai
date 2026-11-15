# Result — design brief (input for Phase 4)

Status: **high-fi built; Gate 4 approved by the owner 2026-11-04** (design-architect, 2026-11-04). The owner picked **C (`chooser`)** with much
more space for the video and full screen; the low-fi concepts stay as they were for reference.
Concepts: `/prototypes/concepts/result/<id>?state=…`. Sources: `PRODUCT_BRIEF.md` §2.6 and "Result and distribution",
`ia.md` (route `/projects/:id/result`, flow 5, lifecycle "Assembling" / "Done"), `patterns.md` §4, §6, §8 (the result
page is in the **ordinary shell**), `content.md` (result / new version; never "export" or "render"). Quality bar: the
approved studio, new dub and processing — the 2.35:1 stage at full column width with black bars for narrower clips,
nothing jumps between states, no reserved empty slots, one primary action, controls that appear step by step.

## The user's goal

After "Build the result" on the last turn: wait a moment while the video is assembled, watch the whole dubbed scene with
their own voice, download it — and if one turn sounds wrong, go back to exactly that turn, record it again and get a new
version without losing the one they already have. On a laptop and on a phone.

## What the page must answer, in the user's order

1. **Is it coming?** The same kind of waiting as processing (the stage with the scene's first frame, dimmed; the waiting
   pill names what happens; a rough estimate, never a countdown). Assembling is short — one step, not three.
2. **Watch it.** The scene plays with sound (the user's voice, the original background). Full playback with a scrubber.
3. **Keep it.** One primary action: "Download MP4" — the version on screen, up to 720p, orientation kept.
4. **Fix one turn.** Find the turn that sounds wrong (by its text, by its moment in the scene, or by what plays now) and
   open the studio on exactly that turn, with its current take still there.
5. **New version.** Coming back from the studio, a new version is assembled while the current one keeps playing. It
   never interrupts playback; the user switches to it explicitly. Download always targets the version on screen.
6. **It failed.** Assembling failed (a service problem): the takes are safe, trying again is free. A failed *new* version
   leaves the current one untouched.

## Constraints

- AppShell (My projects · New dub; balance in the bar). EN + RU; 1440 × 900 and 390 × 844; Download above the fold in
  every state that has it; no horizontal scroll; kit + tokens only; motion off under `prefers-reduced-motion`.
- Download only — no links, sharing or gallery. No speaker names. Turns are named "Turn 3" and by their text.

## Concepts (low-fi) — `/prototypes/concepts/result/<id>?state=…`

| | id | One sentence |
|---|---|---|
| A | `script` | The scene and its script side by side: every turn's text is listed next to the player, the line playing now is highlighted, and each line has its own Re-record. |
| B | `strip` | The scene's own strip of turns is the scrubber: tap a block (or let it play) and the turn's text with "Re-record turn 3" sits right under the picture. |
| C | `chooser` | A clean watch-and-download card; fixing is a separate, deliberate step — "Re-record a turn" opens a chooser with the turn playing now already selected. |

Versions differ too: A — a notice in the card footer next to Download ("Version 2 is ready · Switch"); B — both versions
stay side by side as tabs until the user leaves; C — the status and the switch live in the page header.

States: no `state` = **live** (assembling → ready in ~5 s) · `assembling` · `ready` · `downloading` · `failed` ·
`new-version-assembling` (version 1 plays; version 2 is being assembled) · `live-new-version` (the same, running to
ready) · `new-version-ready` · `new-version-failed`. `&turn=1..6` = the re-recorded turn (default 3). Re-record opens the
studio prototype on that turn with its take (`/prototypes/studio/turn?turn=n&turns=6&state=saved`). The studio's last-turn
"Build the result" is **not rewired** until the owner picks.

## Open questions for the owner (not guessed)

1. **Coming back from the studio.** After re-recording one turn, how does the user get back to the result? The studio
   today only has Next / "Build the result" on the last turn. Options: on a re-record visit Next becomes "Build the new
   version" on that turn; or the studio walks on to the next turns as usual and the result is rebuilt when they leave.
   May they re-record several turns before one new version is assembled?
2. **Cost.** Is re-recording and assembling a new version always free (the brief says no surcharge for retries)? Are
   credits settled when the studio opens (processing shows "72 credits charged") or when the first result is delivered?
3. **How many versions are kept.** Only the current one (the old one is replaced once the user switches — A, C), or the
   current and the new one side by side until they leave (B)? Can an older version still be downloaded later?
4. **Switching.** Does the new version continue from the same moment (prototype) or start from the beginning?
5. **Re-record while assembling.** May the user open a turn while the first version (or a new version) is still being
   assembled? If a new version is assembling and they re-record another turn, does it restart?
6. **Download.** Is it instant (a ready MP4 file), or does the server prepare it first (`downloading` state)? File name
   ("Kitchen scene.mp4", with the version number?). Does a phone save to Files / Photos — any wording needed?
7. **Failure.** Is a failed assembly retried automatically first? Is "Try again" the only way out, or also "Open the
   studio"? Does a failed *new* version need a notification when the user has left?
8. **Leaving while assembling.** Same as processing (toast / browser notification when ready), or nothing because it is
   short?
9. **My projects.** Does the project row say "Ready" while a new version is assembling, or "Assembling a new version"?

## Owner answers — 2026-11-04

Pick: **C (`chooser`)** — a clean watch-and-download card; fixing is a separate step ("Re-record a turn" opens a
chooser with the turn under the playhead selected) — **but with much more space for the video**: the stage takes as
much of the screen as it can (up to the full content width, 1120, and as tall as the viewport allows with Download
above the fold at 1440 × 900 and 390 × 844), and the video **opens full screen** (a button in the player controls,
double-click on the picture, F; Esc leaves; the browser Fullscreen API on the stage element, iOS Safari falls back to
the video's own `webkitEnterFullscreen()`). Same 2.35:1 stage rule as the studio / new dub / processing.

1. **Coming back from the studio:** the studio opened from the result is in **re-record mode** — instead of Next, the
   primary button on a re-recorded turn is **"Build the new version" / «Собрать новую версию»**. The user may re-record
   several turns (moving with ‹ / ›) before pressing it; then → the result with the new version assembling. The studio's
   last-turn "Build the result" opens the result page (assembling).
2. **Cost:** re-recording and assembling a new version are **always free**.
3. **Versions:** only the current one and, until the user switches, the new one; after switching the old one is gone
   (no older downloads).
4. **Switching** to the new version plays it **from the start (0:00)**.
5. **Re-recording while a version is assembling is not allowed:** "Re-record a turn" is disabled while the first result
   or a new version is assembling, with the reason written next to it ("You can re-record once this version is ready" /
   «Перезаписать можно, когда эта версия будет готова»), not only in a tooltip. In the studio's re-record mode nothing
   changes (assembly only starts after "Build the new version").
6. **Download:** the MP4 is prepared when assembling finishes, so Download is **instant** (no "preparing the file"
   state); the file is named after the project — "Kitchen scene.mp4" / «Сцена на кухне.mp4», no version number; the
   browser handles saving on phones (no extra wording).
7. **Failure:** the server retries once by itself; if that fails → the failed state with "Try again" (free).
8. **Leaving while assembling:** the same notifications as processing — an in-app toast with **"Watch the result"** and
   a browser notification if the user opted in ("Notify me when it's ready").
9. **My projects:** the row says "Ready" with "Assembling a new version" next to it while a new version is assembled
   (no My projects change now).

## Assumptions pending the owner

None of these is decided; the prototype needs a value.

- **Exit from the studio's re-record mode** goes back to the result unchanged; takes recorded in that visit but not
  built are kept on the turns (the next "Build the new version" includes them). Not shown in the UI.
- **In re-record mode "Build the new version" stays visible on every turn** once any turn has a new take (so the user
  never has to go back to the re-recorded turn to build); ‹ / › are an icon pair at the left of the row; there is no
  Next.
- **Phones: the result card runs edge to edge** (no side margins, no radius) to give the picture the full screen width.
- **The demo estimate** (60 s, shown 12× faster, "About a minute left" / "Almost done") — the server's numbers later.
- **Download label** says the version ("Download version 1") only while a newer version is ready to switch to —
  otherwise "Download MP4".
- **The re-recorded turns' list** in the status line ("turns 3 and 5 re-recorded") comes from the server.

## High-fi — `/prototypes/result/page`

See `templates.md` → Result. States: no `state` = live (assembling → ready) · `assembling` · `ready` · `chooser` ·
`new-version-assembling` · `new-version-ready` · `new-version-failed` · `failed`; `&rerecorded=3,5` without a state =
back from the studio (version 2 assembles live); `&turns=N`, `&ratio=portrait|16x9`, `&notify=granted|denied`, `&name=`.
Preview of the toast: `/prototypes/result/ready-elsewhere`. Studio re-record mode:
`/prototypes/studio/turn?mode=rerecord&turn=3&turns=6` (`&state=saved` = the turn already re-recorded).
Kit additions: `PlayerScreen`, `PlayerControls`, `useFullscreen`, `usePlayerKeys` (`components.md` → Media); icons
`fullscreen` / `exitFullscreen`.

### Owner answers on the high-fi — 2026-11-04

- **Leaving re-record mode with new takes not built yet asks first:** "Build a new version before you leave?" —
  [Stay] [Leave without building] [Build the new version]. Leaving without building keeps the takes; the result stays as it is.
- **"Build the new version" shows on every turn** once any turn has a new take.
- **Phone card keeps the side margins** of New dub and Processing (consistency; full screen is there for a bigger picture).
