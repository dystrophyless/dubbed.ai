# Recording studio — design brief (input for Phase 4)

Owner decisions override everything below them. The studio high-fi is built only in Phase 4, after Gates 1–3.

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

## Open questions for the owner

- Control placement — see the proposal in chat (2026-11-02); not built until the owner agrees.
