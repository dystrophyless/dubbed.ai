# New dub — design brief (input for Phase 4)

Status: **concept A picked (2026-11-03); high-fi at `/prototypes/new-dub/page`; Gate 4 approved by the owner 2026-11-03.** The low-fi concepts
stay at `/prototypes/concepts/new-dub/<id>` for the record. Sources: `PRODUCT_BRIEF.md`
§2.3 and §3, `ia.md` (route `/new`, flow 2, flow 6, project lifecycle, slots), `patterns.md` §7 (money). Quality and
interaction bar: the approved studio (`/prototypes/studio/turn`, `studio-brief.md`) — controls appear step by step,
nothing jumps, one primary action that names what it does.

## The user's goal

Pick a video from the device, see it, choose the part to dub (within the limits), understand exactly what it costs and
whether there are enough credits, and start — on a laptop and on a phone.

## What the page must answer, in the user's order

1. **What can I upload?** MP4 / MOV / WebM, up to 10 minutes and 250 MB — before choosing, not after a failure.
2. **Is this the right video?** The chosen video is visible and playable (own aspect ratio, no letterbox frame).
3. **Which part will be dubbed?** A section of at most 120 s; default = the whole video if it is ≤ 120 s, else the first
   120 s. The user can play the section before paying.
4. **What does it cost, and can I afford it?** 1 credit per started second (12.4 s → 13). The exact number is on the one
   action that starts ("Start dubbing · 72 credits"); no second confirmation. Not enough credits → how many are missing
   and a way to buy them that returns to `/new` with the video and section kept (`ia.md` flow 6).
5. **Start.** Credits are reserved, the project goes to Processing (`/projects/:id/processing`).

## Constraints

- Ordinary shell (`AppShell`, nav "My projects · New dub"); EN + RU; 1440 × 900 and 390 × 844; the key action of every
  state is above the fold; no horizontal scroll; kit + tokens only; the OS file dialog is the only native picker.
- No duplicated information: if the page shows the balance itself, the shell's balance pill is hidden (`hideCredits`).
- Errors say what happened and how to fix it ("It's longer than 10 minutes. Choose a shorter video.").
- States to judge every concept on: `empty` · `uploading` · `ready` (video + section) · `limit` (the section hits 120 s;
  typed times can be too long) · `error` (invalid file) · `short` (not enough credits).

## Concepts (low-fi) — `/prototypes/concepts/new-dub/<id>?state=…`

| | id | One sentence |
|---|---|---|
| A | `one-card` | One card that grows top to bottom: choose → see → trim → pay, like a short form. |
| B | `receipt` | A workspace for the video beside a receipt that always shows the price; Start lives on the receipt. |
| C | `two-steps` | Two calm screens: first choose a video, then choose the section and start. |
| D | `price-on-selection` | Trim like a phone editor: the price rides on the selected window, one action bar at the bottom. |

Each concept page ends with a note card: the idea, trade-offs (laptop · phone · cost and credits · steps · new parts) and a
state picker.

## Findings for high-fi (whichever concept is picked)

- `UploadDropzone` always says "Drop a video here" — wrong on phones (no drag and drop); it needs a touch title.
- `CostButton` prints "You have N credits", which duplicates the top-bar balance pill; the note should say what is new
  ("48 credits left after start") or the shell pill should be hidden.
- `RangeSelector` silently stops at 120 s; the user needs to see why the edge stopped (a hint at the limit).
- A section must be playable on its own ("Play section") — the kit's `Transport` plays the whole clip only.

## Open questions for the owner (money, limits, behaviour — not guessed)

1. **Slots.** A slot is taken after upload validation. If both free slots are used, does `/new` block before upload
   (and offer "Buy credits" / delete a project), or let the user upload and fail? Leaving `/new` after the upload
   leaves a **Draft** ("Not started") holding a slot — confirm that this is wanted.
2. **Minimum section length.** Is there one (e.g. 5 s), or can a 1-second section be started (1 credit)?
3. **Section while uploading.** May the user watch and trim the video from the local file while it is still
   uploading (B and D do this), or only after the upload is checked (A and C)? Start is possible only after the check.
4. **Not enough credits.** Disabled Start + "Buy credits" beside it (`patterns.md` §7, used in A and C), or "Buy credits"
   becomes the primary and Start disappears until it is affordable (B, D)? D also offers "Shorten to 40 s" (fit the
   section to the balance) — is that wanted?
5. **Project name.** Taken from the file name (renamable later in My projects), or asked on this page?
6. **Videos ≤ 120 s.** Show the section selector anyway (whole video selected), or hide it and just show the cost?
7. **Cancel upload.** "Cancel upload" returns to the empty state and frees nothing (no slot is taken before the
   check) — confirm.
8. **Where Start goes.** Straight to Processing (`ia.md`), with credits reserved — the button label is the only
   confirmation. Confirm there is no summary step (C stays two steps for that reason).

## Owner answers — 2026-11-03

1. **Slots:** checked up front — if both free slots are used, `/new` says so before the upload. An uploaded video that
   was left without starting is a Draft and **does take a slot**.
2. **Minimum section:** **1 s** (1 credit) — no larger minimum.
3. **Section only after the check:** the section selector and the preview open once the upload is done and the server
   check passed (type, ≤ 10 min, ≤ 250 MB, readable, has an audio track). Type and size are checked in the browser
   before the upload starts.
4. **Not enough credits:** disabled Start + "Buy credits" beside it (`patterns.md` §7). No "Shorten to fit" action.
5. **Project name:** from the file name (renamable later).
6. **Videos ≤ 120 s:** the section selector is still shown (whole video selected).
7. **Cancel upload:** returns to the empty state; no slot is taken.
8. **Start:** straight to Processing with credits reserved; no summary step.
- **No duplicated cost:** the price appears once — on Start ("Start dubbing · 72 credits").
- **Concept A (`one-card`) picked**, with the video stretched to the container: the stage is as wide as possible (the
  card's full width; the page column widens to the largest width that keeps Start above the fold) and **always 2.35:1**,
  exactly like the studio (studio-brief 17). A clip of another shape (16:9, 9:16, 4:3) fills the stage's full height,
  centred, with **black bars** at the sides (no blur, no light tray). The demo clip `/media/scene.mp4` is 2.35:1 and fills
  it. Preview param `&ratio=portrait|16x9`.

### Owner answers on the high-fi — 2026-11-03

- **No slot:** "Buy credits" (the first purchase raises the limit to 10 slots) is offered as a secondary action next to
  "Open My projects".
- **Project name from the file name** with clean-up ("kitchen-scene.mp4" → "Kitchen scene") — accepted.
- **No Draft warning** on `/new`: the page does not say that a checked, unstarted video holds a slot.
- **Replace video** after the check: the new video goes into the **same Draft and the same slot** — replacing never
  needs a free slot and never hits the limit.
