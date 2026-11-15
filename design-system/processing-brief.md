# Processing — design brief (input for Phase 4)

Status: **high-fi at `/prototypes/processing/page` — concept B (`stage`) with concept C's progress loader (owner pick,
2026-11-03); Gate 4 approved by the owner 2026-11-03.** The low-fi concepts stay at `/prototypes/concepts/processing/<id>` for reference.
Sources: `PRODUCT_BRIEF.md` §2.4 and §3 (credits), `ia.md` (route `/projects/:id/processing`, flow 3, project lifecycle,
"Preparing · step 2 of 3"), `patterns.md` §4 (multi-stage server work), §5 (No dialogue found), §7 (cancelling paid work),
`content.md` (say "preparing", never "AI / rendering / transcription"). Quality bar: the approved studio and the new-dub
high-fi — one primary action, nothing jumps, every control works.

The owner's complaint about the placeholder (2026-11-03): "processing is not interactive, never moves on to the studio — it
looks like a fixed 'not found' state, not waiting / progress".

## The user's goal

After Start: see that the scene is being prepared, roughly how far along and how long, what it costs, be able to cancel
(knowing exactly what is charged), leave and come back, and land in the studio on turn 1 the moment it is ready — on a
laptop and on a phone.

## What the page must answer, in the user's order

1. **Is something happening?** Visible motion tied to real progress: the step that runs now, with its name.
2. **How far, how long?** "Step 2 of 3" and a rough estimate ("About 2 min left") — never a precise countdown.
3. **What does it cost?** The reserve, once ("72 credits in reserve — charged when it's ready"); the top bar shows the
   balance after the reserve.
4. **Can I stop?** Cancel → a dialog that names the charge **before** confirming: waiting → free; preparing → only the
   finished steps are charged; the rest goes back; the project is removed (Cancelled disappears from the list, slot freed).
5. **Can I leave?** One line: preparing goes on; the project waits in My projects.
6. **Ready.** A short "Ready — opening the studio" moment, then `/projects/:id/turns/1` opens by itself.
7. **Endings that are not ready:** "No dialogue found" (charged — a delivered result; "Try another video") and
   "Something went wrong" (service failure — free; "Try again").

## Constraints

- Ordinary shell (`AppShell`, nav "My projects · New dub") — `ia.md` puts processing in the ordinary shell, not the
  focused one. EN + RU; 1440 × 900 and 390 × 844; the key action of every state above the fold; no horizontal scroll;
  kit + tokens only; motion off under `prefers-reduced-motion` (the words and numbers still change).
- Glossary: preparing / подготовка, turn / реплика, credits in reserve / в резерве. Step names are plain words
  ("Separating the voices", "Finding the lines", "Getting the turns ready").

## Concepts (low-fi) — `/prototypes/concepts/processing/<id>?state=…`

| | id | One sentence |
|---|---|---|
| A | `checklist` | One card with the three named steps ticking off one by one; the price of cancelling is always written under them. |
| B | `stage` | The stage where the studio will open is already on screen; one thin bar under it fills up, and one status line names the step. |
| C | `tips` | A compact status strip on top; the rest of the page uses the wait to teach how recording works. |

States: no `state` = **live** (a demo clock, 10× faster than the estimate: waiting → step 1 → 2 → 3 → ready →
`/prototypes/studio/turn?turn=1`, about 16 s); `queued` · `running` (mid step 2, step 1 done) · `cancel-confirm`
(running: 24 of 72 credits) · `cancel-queued` (free) · `no-dialogue` · `failed` · `ready` (frozen; "Open the studio").
`&end=no-dialogue|failed` makes a live run end there. Each page ends with a note card: idea, trade-offs (laptop · phone ·
how it moves · cost and cancel · leave and come back · new parts) and a state picker. Demo assumptions (not decisions):
the cancel charge is equal thirds of the price, rounded up (72 → 24 per finished step); the estimate is 20 s waiting +
45 / 60 / 35 s for the steps.

## Open questions for the owner (money, timing, behaviour — not guessed)

1. **Charge per step.** Is a finished step worth an equal third of the price (rounded up: 72 → 24 / 48), or are steps
   weighted (e.g. by how long they take)? `content.md`'s example "2 of 3 stages are done — 9 credits" fits equal thirds of
   13. Also: "step" (`ia.md`) or "stage" (`content.md`) in the UI — one word everywhere?
2. **A step finishes while the cancel dialog is open.** Does the amount in the dialog update in place (the prototype does
   this — the job keeps running), or is the price fixed when the dialog opens?
3. **After cancelling** — go to My projects (prototype) or back to New dub with the same video, so the user can pick
   another section? (New dub would need the uploaded video kept.)
4. **Time estimate.** Show one at all? If yes, rough ("About 2 min left") as in all concepts, or none while waiting in
   the queue? Is a smooth bar from time (B) acceptable, or only real step boundaries (A, C)?
5. **"No dialogue found" → "Try another video".** A new project needs a free slot; this project still holds one. Does
   "Try another video" reuse this project's slot (like Replace video on a Draft), or must the user delete it first? Is
   "Choose another section of the same video" wanted?
6. **Failure.** Are the reserved credits released right away on a service failure, or kept until "Try again" / delete?
   Does "Try again" resume from the failed step (prototype) or start over — still free either way?
7. **Leaving and coming back.** Is the line "preparing goes on, the project waits in My projects" enough, or should we
   notify on ready (email, browser notification, the tab title showing progress)? If the user is elsewhere in the app
   when it becomes ready — a toast with "Open the studio", or nothing until they open the project?
8. **Ready moment.** Open the studio automatically after ~1.5 s (as `ia.md` flow 3 says), or wait for "Open the studio"
   when the user has been away from the tab (a background tab would jump to the studio unseen)?
9. **B only:** may the stage show the section's first frame (a poster from the server), and may the page show "N turns
   found so far" during step 2 (the server must report it)? With zero turns this counter would stay at 0 until
   "No dialogue found".

## Owner answers — 2026-11-03

Pick: **B (`stage`)**, but with **C's progress** instead of B's thin bar — the kit's waiting pill with the step name
rolling from step to step and three bar segments filling one after another, under the 2.35:1 frame, next to
"Step 2 of 3 · About a minute left".

1. **Charge per step:** steps cost **different** amounts; the exact split stays open until the service exists. The UI
   never implies equal parts: the cancel dialog shows the amount the server returns ("N credits will be charged"). Demo
   numbers are placeholders (72 → 18 after step 1, 51 after step 2).
2. **A step finishes while the cancel dialog is open:** the amount in the dialog **updates live**.
3. **After cancelling:** My projects + a toast.
4. **Time estimate:** rough, rounded to minutes ("About 2 min left", "About a minute left", "Almost done"), never a
   seconds countdown; while waiting in the queue: "Waiting for our turn" with **no time**.
5. **"Try another video"** after No dialogue found: the new video **reuses this project's slot** (like Replace video on
   a Draft) — no free slot needed. (Prototype: opens New dub; the real page opens it on this project's Draft.)
6. **Service failure:** the reserved credits are **returned at once** (the failed state says so; the top-bar balance goes
   back up); "Try again" reserves them again (said in the failed text). "Try again" **resumes from the failed step** —
   finished steps are kept (owner, on the design-architect's recommendation); the copy stays neutral ("Try again"), the
   progress simply shows the finished steps as done.
7. **Ready notifications:** an opt-in "Notify me when it's ready" on the processing page — the browser is asked for
   permission **only when it is pressed** (never auto-prompted); it shows the answer (on: "We'll notify you when it's
   ready." + Turn off; blocked: how to allow it in the site settings). When it becomes ready while the user is elsewhere
   in the app: a toast "“Kitchen scene” is ready" with **Open the studio**; when the tab is in the background: a browser
   notification (if opted in and granted). Preview of the toast: `/prototypes/processing/ready-elsewhere`.
8. **Auto-open:** a **visible** tab shows "Ready — opening the studio" and opens turn 1 after ~1.5 s; a tab in the
   **background** does not navigate — the page shows the ready state with a primary "Open the studio" and waits. The
   frozen `?state=ready` preview is this background case; `&tab=background` makes a live run end that way.
9. **First frame and "turns found":** yes — the stage shows the section's first frame (2.35:1), and "N turns found so
   far" from step 2; both are supplied by the server.

## Assumptions pending the owner

The prototype needs a value for these; none is decided.

- **The demo charge amounts** (18 / 51 of 72) — placeholders for the server's numbers (answer 1), not a rule.
- **The demo time plan** (waiting 20 s, steps 45 / 60 / 35 s; the page shows it 10× faster) and the smooth fill of the
  running segment from elapsed time (an estimate between real step boundaries). If the server reports only step
  boundaries, the segment fills at once when its step ends.
- **"Step" (`ia.md`) vs "stage" (`content.md`):** the UI says "step" / «шаг» everywhere.
- **"Turns found" during step 3 and ready:** the count stops at the step-2 total ("12 turns found", "12 turns ready to
  record").
- **The in-app toast stays until dismissed** (a finished job is worth not missing); the kit's default for toasts with
  an action is 8 s.
- **Coming back to the processing page** after leaving it shows the job's current state (the prototype restarts its
  demo clock).

## High-fi — `/prototypes/processing/page`

See `templates.md` → Processing. Kit addition: `StepProgress` (`components.md` → Kit), icons `notify` / `notifyOff`.
New dub's Start now opens this page with `?name=&credits=&from=&to=`.
