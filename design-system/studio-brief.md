# Recording studio — design brief (input for Phase 4)

Owner decisions override everything below them. **Gate 4 (studio) approved by the owner on 2026-11-03** — the high-fi
reference is `/prototypes/studio/turn`.

## Owner decisions — 2026-11-02

1. **No turn timeline** anywhere in the studio (no strip of turn segments). It was removed from the kit.
2. **Entry:** after processing the user lands directly on the **first turn**.
3. **Centre column, top to bottom** (`SceneColumn`):
   - the **video** with the fragment of this turn, centred on the screen;
   - just below it, the **text of the turn** (`TurnLine`);
   - below that, the **audio track**: an outlined rectangle containing the waveform, **exactly as wide as the video**
     (`AudioTrack`).
4. **While recording, the take's waveform is drawn in another colour over the original's waveform** (red while
   recording, blue once saved; the original stays grey underneath).
5. **No level meter while recording.** The level meter exists only in the microphone check (onboarding, Settings).
6. Placement of the controls (Play, Record, Next, Previous, listen to my take, others) is left to the designer.
7. **One studio design — no A/B test.** The earlier requirement of two designs for an A/B test is withdrawn.
8. **One fragment = one turn.** The video shows only this turn's fragment; Previous / Next move between fragments.
   "When the line is spoken and how long it lasts" (`PRODUCT_BRIEF.md` §2.5) is answered by the fragment itself and the
   audio track — **no separate timing indicator** (no position-in-scene marker, no extra duration UI).
9. **"My take" plays the fragment's video with the user's voice** in place of the original voice (the take is heard in
   the scene, not as bare audio).
10. **The record control keeps its time hints**: "Up to 4.4 s" when idle, "1.5 s left" plus the filling red ring while
    recording — recording stops by itself, so the user must see it coming. (These belong to the record control and are
    not the separate timing indicator excluded in 8.)

Still in force from `PRODUCT_BRIEF.md` / `CLAUDE.md`: focused shell (Exit only); no countdown; recording stops by itself at
the end of the window; no autoplay / auto-advance; Next requires a take, Previous always works; unsaved-take dialog
(Save and leave / Leave without saving / Stay); no speaker names or numbers; original voice volume (listening only);
red = recording; key actions visible without scrolling at 1440 × 900 and 390 × 844.

## Owner decisions — 2026-11-03 (concept A chosen; prototype `/prototypes/concepts/studio/a-back-row`)

These override decisions 1 and 6 above and the "no autoplay" line.

11. **Concept A, Previous in the action row** (`a-back-row`): a fixed icon slot `‹` at the left of the action row; the slot
    stays (empty) on turn 1 so the row never shifts.
12. **One section with one side padding:** a header row directly above the video, inside the video's width — Exit as a
    close icon `✕` (left), the project title with the progress centred over the video, volume as an icon with a popover
    slider (right). Nothing sticks out past the video's edges.
13. **Progress = dots** (replaces decision 1): one dot per turn — done (take saved) accent, ahead grey, current a wider
    accent pill that grows out of its dot; next to it "**3** of 12" / «**3** из 12». Display only (not buttons); the number
    carries the meaning for screen readers. Smaller dots for scenes with more than 16 turns.
14. **Buttons appear step by step; a button that stays keeps its position:**
    - arrival on a turn without a take — the fragment **plays once by itself**; `[‹] [▶ Original] [● Record]` + "Up to 4.4 s";
    - recording — only `[■ Stop]` + "1.5 s left"; the rest hidden (slots kept);
    - take saved — Record becomes "Record again" in the same place (red outline, not solid red); "My take" and the primary
      "Next →" appear. Phone: `[‹] [Original] [Record again]` / `[My take] [Next]` (Next bottom-right).
    - "Record a take to continue" is not shown: Next simply does not exist until there is a take.
    - Last turn: Next reads "Build the result" / «Собрать результат».
15. **Moving between turns is animated:** the pill slides to the new dot, the number rolls, and the scene (video, line,
    track) slides in from the side we moved to. Off under `prefers-reduced-motion`.
16. **While recording, the scene plays muted** — the user hears only themself (no original voice leaking from speakers
    into the take; no headphones mode).
17. **The stage is always 2.35:1** (owner 2026-11-03, after trying a 16:9 frame: "the wide picture looked better").
    A narrower clip (16:9, 9:16) fills the stage's full height, centred, with black bars at the sides (owner's final
    choice after trying a blurred copy and a light tray). The header row, track and actions always match the stage's width.
18. **Overlays on the picture stay:** "Sound off" / «Без звука» while recording, "Your voice" / «Ваш голос» while My take
    plays, and the quiet ▷ on the idle frame (pointer only).
19. **DUBBED PATCH 5 accepted:** Record and Stop are solid red, Record again is a red outline.
20. **Leaving with an unsaved take:** ✕ while recording stops the recording and asks. "Save and leave" saves and leaves;
    "Leave without saving" discards and leaves (the only path that loses the take, chosen explicitly); "Stay" keeps what
    was recorded as the turn's take (listen / record again). The studio never throws a recording away without an explicit choice.
21. **Notices appear at the bottom** (microphone blocked): a notification pinned to the bottom, outside the layout, so
    nothing jumps when it appears. If it would cover the action row, the picture gets shorter by exactly that much and
    its top stays put (on phones, where the picture is width-bound, the column moves up only by the overlap).
    The studio stays centred vertically.
22. **No empty slot for Previous** (owner 2026-11-03): `‹` exists only from turn 2; on turn 1 the row starts with
    Original. Within a turn every button keeps its place. **Phone:** Original and Record share the first row —
    `[‹] [Original] [Record]` / `[My take] [Next]` (halves; before a take the time hint sits under Record); on phones the studio column starts at the top (centred on wider screens).
23. **No "Up to N s" hint before recording** (owner 2026-11-03; overrides the idle part of decision 10). The time hint
    appears only while recording ("1.5 s left") and while saving.
24. **No reserved empty slots anywhere in the action row; one centred group on wide screens** (owner 2026-11-03).
    `[‹] [Original] [Record]` centred under the track; while recording "1.5 s left" sits to the right of Stop (out of the
    flow, nothing shifts); with a take the group becomes `[‹] [Original] [My take] [Record again] [Next]`, still centred. Phone: the second row (`[My take] [Next]`) appears with the take; while
    recording the time hint sits under Stop.
25. **While recording the row keeps its shape** (owner 2026-11-03): Previous, Original, My take and Next stay where
    they are, **disabled**; only Record turns into Stop. The time hint ("1.5 s left", "Saving take…") sits in the top-right
    corner of the audio track, next to the take being drawn — not in the button row.
