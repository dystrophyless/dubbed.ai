# Design QA: 001-recording-flow-mock

**Verdict: PASS WITH NOTES.** No blocking drift from the approved ui-spec (D1-D4) or the design system. Four notes, none of which block owner review.

Run 2026-11-05 against the dev server (5174) and the production build (e2e on 4175). Screenshots: `specs/001-recording-flow-mock/design/impl/` (80 files, desktop 1440x900 and mobile 390x844, EN and RU).

## Static checks

| Check | Result | Evidence |
|---|---|---|
| `npm run build` | PASS | tsc + vite OK; only the usual 1 MB chunk-size warning |
| `npm run lint` (oxlint) | PASS | no output |
| `npm run lint:css` | PASS | no output |
| Raw colours / rgba in `src/features` | PASS | grep `#hex`, `rgba?(` found nothing |
| Inline `style=` | NOTE | `ProjectsView.tsx:158` has `style={{ margin: 0 }}`. Harmless, but move it to `projects.module.css`. |
| Hard-coded user-visible strings | PASS | the only literals are "WebM" / "MP4" (`ResultView.tsx:174`), which D1 says are not translated |
| New components outside the kit | PASS | only `PageSkeleton`, `LoadError`, `GuardNavigate` (plumbing, built from kit parts) |
| Edits to affect ports | PASS | `git diff --stat -- frontend/src/components/ui/affect` is empty |
| One primary Button per view | PASS | New dub (Start), Processing (none, Cancel is secondary), Studio (Next; Record is the red record style), Result (Download), Projects (none) |
| Colour contrast (axe `color-contrast`, wcag2a/aa/21aa) | PASS | clean on new-empty, new-ready, processing, studio, result-assembling, result-ready and projects, EN and RU, 1440 and 390 (28 runs) |

## E2E (`npm run test:e2e`, flow-us1..us5, desktop + mobile)

First full run: 49 passed, 4 skipped, 7 failed. I ran it while two screenshot scripts shared the CPU, and the failures were timing-sensitive (queue/step timing, a console error).

Re-run of those 5 tests alone: 8 passed, 1 skipped, 1 failed. The failure was `flow-us1.spec.ts:133` (EN, desktop). It asserted `errors` was empty and got one `Failed to load resource: net::ERR_CONNECTION_REFUSED`. A solo re-run passed (33.6 s).

Result: all flow specs pass in isolation, with one unreproduced flake (see note 4). The specs are heavy and need an idle machine: about 9 minutes under load, and parallel runs of them hit timing assertions.

## Checklist against the approved design

| Item | Result | Evidence | Fix |
|---|---|---|---|
| D1 Download + quiet format | PASS | `impl/result-ready.desktop.en.png`, `.mobile.en.png`, `.desktop.ru.png`: "Download" / "Скачать" button, muted "WebM" to its left; on mobile the button is full width with the format centred beneath. `aria-describedby="result-format"` at `ResultView.tsx:180`, and e2e asserts the accessible description "WebM". | none |
| D1 subtitle without format | PASS | "3 turns · 720p" / "3 реплики · 720p" | none |
| D2 recording elsewhere | PASS | approved `screens/studio-recording-elsewhere-*`; e2e us4 (two tabs, lock released) passes | none |
| D3 rows for every lifecycle state | PASS | `impl/projects-all-states.desktop.en.png`, `.mobile.ru.png`: all 8 real states with the right tag tone, "Assembling a new version" second tag, scene icon for No dialogue and Failed. No overflow at 390; tags and details wrap to a second line. | none |
| D3 cancel dialog on Delete of Preparing | PASS | `impl/projects-delete-preparing-dialog.mobile.en.png`: "1 of 3 steps is done — 4 credits will be charged", "Keep preparing" and a destructive "Cancel preparing" | none |
| D4 redirect toast | PASS | e2e us4 (EN and RU toast, once) | none |
| ReadyWatcher toast with action | PASS | `impl/readywatcher-toast.desktop.en.png`, `.mobile.ru.png`: success toast "Scene is ready / Your turns are ready to record." with a secondary sm "Open the studio" button. It appears on My projects while the user is away, bottom-right on desktop and full width at the bottom on mobile. | none |
| TurnDots animation between turns | PASS | `impl/studio-turn-transition.desktop.en.png`: captured 250 ms after Next. The dot for turn 1 has shrunk and the active pill is already on turn 2, so the header stays mounted and animates (`StudioPage.tsx:20`). | none |
| Processing (queued, running, notify on/denied) | PASS | `impl/processing-early.*`, `processing-mid.*`, `processing-notify-on.*`. Layout matches the approved prototype and the RU copy fits at 390. | none |
| Studio (arrival, no take, recording, saved, last) | PASS | `impl/studio-*.{desktop,mobile}.{en,ru}.png`: the stage, line, waveform and actions are in the prototype's positions. Key actions are above the fold at 390x844. | none |
| New dub (uploading, ready) | PASS | `impl/new-uploading.*`, `new-ready.*`: one primary "Start dubbing · 14 credits" | none |
| My projects (single row, empty, slots) | PASS | `impl/projects-real-row.*`, `projects_demo_reset.*` | none |
| PageSkeleton / loading composition | NOTE (see 1) | `PageSkeleton.tsx:7`, `LoadError.tsx:9` | see note 1 |
| Mobile: no horizontal scroll | PASS | e2e `noHorizontalScroll` on every page | none |
| Language: EN and RU, no truncation of the key actions | PASS | all RU shots | none |

## Notes (most visible first)

1. **PageSkeleton does not match the layout of the pages it stands in for.** `PageSkeleton.tsx:7` and `LoadError.tsx:9` use `<Container width="narrow">` (about 720 px, the Projects width). New dub and Processing render in the default container (about 1066 px wide at 1440, `NewDubView.tsx:60`, `ProcessingView.tsx:70`), and Result in about 1120 px (`ResultView.tsx:109`). The loading shape therefore jumps wider when the real page arrives. The 320 px fixed-height stage (`PageSkeleton.tsx:12`) is also much shorter than the real stages (about 450 px for the Processing stage, about 476 px for the Result stage at 1440). Fix: give `PageSkeleton` a `width` prop (default container for New dub, Processing, Result; `narrow` for the Projects redirect) and use `aspect-ratio: 16 / 9` or the same `--video-h` as the views instead of `height={320}`. **Not verified visually.** Every attempt to catch the skeleton on screen missed it, because the mock services answer in a few milliseconds, and there is no approved design to compare it with. It has `role=status`, `aria-busy` and a label, and axe passed on the pages around it. Owner should either accept it as a rarely seen transient or approve the fix above.
2. **Frame thumbnails pop in late on My projects.** At 800 ms after load, the desktop frames of the seeded rows are still grey boxes (`impl/projects-all-states.desktop.en.png`, `projects-real-row.desktop.en.png`) while the same page on mobile already shows the images. Check the thumbnail loader in `ProjectsView.tsx` / `features/projects`: show the kit `Skeleton` in the 80 px frame while the first frame is generated, so a grey box is never mistaken for a missing image.
3. **Studio: the "Record again · R" tooltip stays open after a take is saved.** In `impl/studio-saved.desktop.en.png` and `.mobile.en.png` it sits on top of the waveform's bottom edge and the button row because focus remains on the Record button. Close it when the take is saved, or open the tooltip on `:focus-visible` only. Same behaviour in the approved prototype, so this is not a regression; treat as polish.
4. **Unreproduced e2e flake.** `flow-us1.spec.ts:133` once reported `net::ERR_CONNECTION_REFUSED` in the console. I could not reproduce it, and no code in `src` requests a remote host (the only candidate is the preview-server restart between Playwright runs). If it recurs, log the failing URL in the test's `errors` collector (`e2e/flow-us1.spec.ts` near line 127).

## Differences from the approved screenshots

- `design/screens/` holds only the Gate-4 delta screens (Projects, Result D1, Studio mic-blocked and recording-elsewhere). The Gate-4 New dub, Processing and Studio prototypes have no stored PNGs, so those screens were compared by eye against the prototype routes. The one visible difference is that the real pages use the real project name ("Scene", from the file name), the real balance (106 after reserving), and the real thumbnail frame.
- Result footer, Projects rows, delete dialog and toast match the approved screenshots at both widths and in both languages.
- Not driven: studio `exit-unsaved` dialog, `mic-blocked` and `recording-elsewhere` on the real route (covered by e2e us1 and us4), Result `chooser` and `new-version-*` on the real route (covered by e2e us3, whose long scenario passed on the solo re-run).

## Top fixes

1. `frontend/src/features/recording-flow-mock/PageSkeleton.tsx:7,12` — match the target page's container width and stage proportions (note 1).
2. `frontend/src/features/recording-flow-mock/LoadError.tsx:9` — same container-width mismatch as 1.
3. Thumbnail frame in the My projects row (`ProjectsView.tsx` / `features/projects`) — a skeleton in the 80 px frame until the image is ready (note 2).
4. `frontend/src/features/recording-flow-mock/views/ProjectsView.tsx:158` — remove the inline `style={{ margin: 0 }}` and use a CSS module class.
5. Studio tooltip left open after Save (`components/media/Studio.tsx` RecordButton tooltip) — close it on save (note 3).
