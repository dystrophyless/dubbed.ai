---

description: "Tasks for 001-recording-flow-mock"
---

# Tasks: Recording flow on mock services

**Input**: `specs/001-recording-flow-mock/` — spec.md, plan.md, research.md, data-model.md, contracts/services.md,
quickstart.md, **ui-spec.md (Approved 2026-11-04)**, approved screenshots in `design/screens/`.

**Tests**: requested by the spec (SC-003/004/006) and the plan — Vitest for the services rules, Playwright + axe per user
story (desktop 1440×900 + phone 390×844, EN + one RU run, no-horizontal-scroll check against `page.viewportSize().width`,
`expectNoA11yViolations(page)` on each screen; see `design-system/quality.md`). Run Playwright with `--workers=1`.

**Who does what**: tasks marked **(ui-builder)** go to the `ui-builder` agent; all others stay in the main session.
Every UI task follows `ui-spec.md` (screen ids S1–S6, deltas D1–D4) and the approved View/prototype it names; the look
does not change — views are extracted from the prototypes unchanged except for the approved deltas.

**Paths**: all under `frontend/`. Views live in `src/features/recording-flow-mock/views/` (where the designer put
`ProjectsView`); routed pages live in `src/features/<screen>/` per plan.md; services in `src/services/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1…US5 from spec.md

---

## Phase 1: Setup

- [X] T001 Add dev dependencies `vitest` and `fake-indexeddb`; add script `"test:unit": "vitest run"` in `frontend/package.json`; create `frontend/vitest.config.ts` (environment `node`, include `src/**/*.test.ts`, setupFiles importing `fake-indexeddb/auto`)
- [X] T002 [P] Add Chromium launch flags `--use-fake-device-for-media-stream` and `--use-fake-ui-for-media-stream` and permission `microphone` to the Playwright config in `frontend/playwright.config.ts` (research R10); keep existing projects/ports
- [X] T003 [P] Create the empty folders with an `index.ts` each: `frontend/src/services/{rules,media,mock}/`, `frontend/src/features/{new-dub,processing,studio,result,projects}/`

---

## Phase 2: Foundational (blocks every user story)

**Services layer**

- [X] T004 Write `frontend/src/services/contracts.ts` exactly as `contracts/services.md` (AccountPort, UploadPort, ProjectPort, StudioPort, ResultPort, Services, `Outcome<T,E>`, branded `ProjectId`) plus the DTOs from `data-model.md`: Account (`balance` int ≥ 0, `reserved` int ≥ 0, `slotLimit` 2 | 10, `slotsUsed`), Project (states `draft | queued | preparing | recording | assembling | done | no_dialogue | failed | assembly_failed`, `step` 1 | 2 | 3, `section {startMs,endMs}`, `price`, `charged`, `failedAtStep`, `notify`, `currentVersion`, `pendingVersion`, `createdAt`, `changedAt`), ProjectSummary, Turn, Take (`inVersion: number | null`), ResultVersion (`state: assembling | ready | failed`, file `{ format: "webm" | "mp4" }`), CaptureLease, MixPlayer, DemoSettings
- [X] T005 [P] Pure rules in `frontend/src/services/rules/pricing.ts`: `price = ceil(sectionLengthMs / 1000)`; section validation "1 000 ≤ length ≤ 120 000"; default section "whole video if ≤ 120 s else 0–120 000"; project name from file name ("strip extension, `-`/`_`/`.` → space, collapse spaces, first letter upper")
- [X] T006 [P] Pure rules in `frontend/src/services/rules/money.ts`: reserve (`balance -= price; reserved += price`), settle on ready/no-dialogue (`reserved -= price; charged = price`), refund on failure (`reserved -= price; balance += price`), cancel while queued = full refund, cancel while preparing = `cancelCharge(stepsDone)` placeholder table 25 % / 70 % of price rounded up, rest refunded; new versions and assembly free
- [X] T007 [P] Pure rules in `frontend/src/services/rules/slots.ts` (`slotsUsed` = projects in any state except cancelled; `canCreate` = slotsUsed < slotLimit) and `frontend/src/services/rules/lifecycle.ts`: state derivation from server timestamps (research R3: queue 2 s, steps 4/5/4 s, assembly ≈ real render time capped at 30 s), allowed transitions per the data-model state machine, `redirectTarget(project, takes)` (preparing/queued/failed/no_dialogue → processing, recording → first turn without take, assembling/done → result, draft → `/new`)
- [X] T008 [P] Turn splitter in `frontend/src/services/rules/turns.ts`: N = clamp(round(section / 4.5 s), 1, 40), windows 2 500–4 500 ms spread across the section, texts cycling through bundled EN/RU demo lines (sound captions in brackets), section < 2 s → no dialogue (research R4)
- [X] T009 [P] Vitest for T005–T008 in `frontend/src/services/rules/*.test.ts`: price for 72.3 s = 73; 4:12 video → section 0–120 000, price 120; reserve/settle/refund/cancel arithmetic keeps `balance + reserved` as expected (SC-003); slots 2 of 2 → `canCreate` false; state derivation at each timestamp; redirect table; turns for a 13 s section = 3
- [X] T010 Re-import capture and lock from `_carryover/frontend-services/services/browser-media/NativeBrowserMedia.ts` and `browser-capture/WebLockCaptureGrants.ts` into `frontend/src/services/media/` (capture of a fixed window with live peaks, waveform decoding, video probe; one recording tab at a time via Web Locks), adapted to `contracts.ts`; do NOT import `mock/IndexedDbProjectStore.ts` (research R1)
- [X] T011 IndexedDB store `frontend/src/services/mock/db.ts`: database `dubbed-mock`, stores `account`, `projects`, `turns`, `takes`, `videos`, `results`; typed get/put/delete helpers; a BroadcastChannel change feed `dubbed-mock-changes` emitting `{ projectId?, kind }` (research R2)
- [X] T012 Demo settings and clock `frontend/src/services/mock/demo.ts`: defaults (balance 120, slotLimit 2), `reset()`, `set()`, read `?demo=reset|balance:N|slots:full|outcome:no-dialogue|failed@1..3|assembly-failed|turns:N` once at start, store it, strip it from the URL (quickstart.md)
- [X] T013 Mock adapter `frontend/src/services/mock/index.ts` implementing AccountPort and ProjectPort (list excludes cancelled, sorted by `changedAt` desc; get derives state from now; setSection; start; cancelQuote (live); cancel; retry from `failedAtStep`; setNotify; rename; remove frees the slot; videoUrl) using T005–T012
- [X] T014 Vitest for the mock adapter in `frontend/src/services/mock/mock.test.ts` (fake-indexeddb + fake timers): start → queued → preparing 1→2→3 → recording; failed@2 refunds then retry resumes at step 2; cancel during step 2 charges the quoted amount; no-dialogue settles; remove frees a slot; state survives a fresh adapter instance (reload, SC-004)
- [X] T015 `frontend/src/services/index.ts`: `createServices("mock")`, `ServicesProvider`, `useServices()`, the TanStack Query key helpers (`['account']`, `['projects']`, `['project', id]`, `['turns', id]`, `['take', id, n]`, `['result', id]`), polling `refetchInterval` 500 ms only while queued/preparing/assembling, and the change-feed subscription that invalidates queries (research R7)
- [X] T016 Wire `ServicesProvider` + one `QueryClient` in `frontend/src/app/providers.tsx`; Zustand store for toasts + notify opt-in in `frontend/src/app/client-store.ts` only if the kit toast store does not already cover it

**Routing and shared UI**

- [X] T017 (ui-builder) Add the real routes in `frontend/src/app/router.tsx`: `/` → `/projects`; `/projects`, `/new`, `/projects/:id/processing`, `/projects/:id/result` in AppShell (balance from `['account']` in the top bar); `/projects/:id/turns/:n` in StudioShell; `/projects/:id` redirect (S6); prototypes and styleguide routes unchanged
- [X] T018 (ui-builder) Top-bar balance in `frontend/src/app/shells/` reads `useServices().account` via TanStack Query instead of the demo constant; same look as approved
- [X] T019 [P] (ui-builder) e2e helpers in `frontend/e2e/support/flow.ts`: `resetDemo(page, preset?)` via `?demo=`, `uploadScene(page)` with `public/media/scene.mp4` via `setInputFiles`, `blockMicrophone(page)` (grantPermissions([]) + getUserMedia override), `noHorizontalScroll(page)`

**Checkpoint**: `npm run build && npm run lint && npm run lint:css && npm run test:unit` green.

---

## Phase 3: User Story 1 — Dub a scene from start to finish (P1) 🎯 MVP

**Goal**: `/new` → Processing → Studio → Result → downloaded WebM, on the real routes.
**Independent test**: fresh profile, `/new?demo=reset` → upload `scene.mp4` → Start → record every turn → Build the result → download `Scene.webm` (non-zero size), desktop + phone, EN + RU.

- [X] T020 [US1] UploadPort in `frontend/src/services/mock/upload.ts`: `precheck` (MP4/MOV/WebM, ≤ 250 MB → `type`/`size`), `upload` with progress + AbortSignal, server check (≤ 10 min, readable, has audio via the media probe → `length`/`no-audio`/`broken`), creates a Draft holding a slot (`no-slot` when full), `replace` reuses the same draft and slot
- [X] T021 [US1] Preparation in the mock (`frontend/src/services/mock/preparation.ts`): on reaching "ready" generate turns (T008) with original peaks decoded from the user's video audio per window; StudioPort `turns`, `take`, `takeUrl`
- [X] T022 [US1] StudioPort recording in `frontend/src/services/mock/studio.ts`: `acquireCapture` via WebLock (`busy-elsewhere`), `record` via the re-imported capture with `durationMs` = turn window, resolves only after the IndexedDB write of the take Blob + peaks (`mic-blocked`, `mic-missing`, `interrupted`); `buildResult` (recording → assembling; `missing-takes`)
- [X] T023 [US1] Result mixer in `frontend/src/services/mock/mixer.ts` (research R6): `player()` = muted section video + takes scheduled with Web Audio at turn starts (original at lowered gain between turns); render = hidden video + AudioContext into `captureStream()` + `MediaStreamAudioDestinationNode` → MediaRecorder at real time (WebM; MP4 where only MP4 is supported); "assembling" lasts until the Blob is stored; one automatic retry before `failed`; ResultPort `get`, `player`, `file` (`fileName` = `<Project name>.<webm|mp4>`, `format`), `retry`
- [X] T024 [P] [US1] (ui-builder) Extract `NewDubView` from `src/prototypes/new-dub/new-dub.tsx` into `src/features/recording-flow-mock/views/NewDubView.tsx` (+ css module moved/shared, look unchanged; S1 states `empty`, `uploading`, `checking`, `ready`, `limit`, `short`, `error`, `starting`); the prototype renders the extracted view so `/prototypes/new-dub/page` stays identical
- [X] T025 [P] [US1] (ui-builder) Extract `ProcessingView` from `src/prototypes/processing/processing.tsx` into `src/features/recording-flow-mock/views/ProcessingView.tsx` (S2 states), prototype keeps rendering it
- [X] T026 [P] [US1] (ui-builder) Extract `StudioView` from `src/prototypes/studio/studio.tsx` into `src/features/recording-flow-mock/views/StudioView.tsx` with props per ui-spec §4 incl. `recordBlock: null | "microphone" | "other-tab"` and `onRetryRecordBlock` (D2); prototype keeps rendering it
- [X] T027 [P] [US1] (ui-builder) Extract `ResultView` from `src/prototypes/result/result.tsx` into `src/features/recording-flow-mock/views/ResultView.tsx` with `downloadFormat: "webm" | "mp4"` (D1: plain "Download"/"Download version 1" + muted format with `aria-describedby`, subtitle keys `features.recordingFlowMock.result.meta*`); prototype keeps rendering it
- [X] T028 [US1] (ui-builder) New dub page `src/features/new-dub/NewDubPage.tsx`: precheck → upload with progress and "Cancel upload" → server check → video, name, section (`setSection`), Start "Start dubbing · N credits" → `projects.start` → navigate to Processing; continue an existing draft when opened from a "Not started" row
- [X] T029 [US1] (ui-builder) Processing page `src/features/processing/ProcessingPage.tsx`: `['project', id]` polled; waiting → steps 1–3 with estimate; ready while visible → "Ready — opening the studio" then studio turn 1 after ~1.5 s; hidden tab → "Open the studio"
- [X] T030 [US1] (ui-builder) Studio page `src/features/studio/StudioPage.tsx` in StudioShell: turn `n` (1-based), autoplay fragment on arrival when no take, Record (scene muted, red take, "N s left", other buttons disabled in place, auto-stop / Stop), My take, Record again, Next only with a saved take, last turn "Build the result" → `buildResult` → Result; shortcuts Space, R, ←/→; Exit leaves at once when nothing unsaved
- [X] T031 [US1] (ui-builder) Result page `src/features/result/ResultPage.tsx`: assembling (polled) → player as large as the screen, full screen by button / double-click / F, Esc leaves; Download saves `result.file()` at once with the file name from the service
- [X] T032 [US1] (ui-builder) e2e `frontend/e2e/flow-us1.spec.ts`: the independent test above at 1440 and 390, EN + one RU run; asserts "Start dubbing · 13 credits", balance 120 → 107, step progress, studio turn 1, recording disables other buttons, Next after the take, Result download event (`Scene.webm`, size > 0), axe on each screen, no horizontal scroll

**Checkpoint**: US1 works end to end on the real routes — the MVP.

---

## Phase 4: User Story 2 — Money, slots and limits are always honest (P1)

**Independent test**: with `?demo=` presets, each rule is visible in the UI and in the balance.

- [X] T033 [US2] (ui-builder) New dub honest states in `src/features/new-dub/NewDubPage.tsx`: no free slot told before choosing a file ("Open My projects" + secondary "Buy credits" → `/credits`); refusals before upload (type/size) and after check (length/no-audio/broken) take no slot; too few credits → Start disabled + "N more credits needed" + "Buy credits"; returning from `/credits` restores video and section; Replace video reuses the draft
- [X] T034 [US2] (ui-builder) Processing money states in `src/features/processing/ProcessingPage.tsx`: Cancel dialog — free while queued, otherwise the charge from `cancelQuote` updating live while open; confirm → `/projects` + toast, project gone; failed → "nothing was charged", reserve back at once, "Try again" re-reserves and resumes at the failed step; no dialogue → charged, "Try another video" (→ `/new`, same slot) and Delete project
- [X] T035 [US2] (ui-builder) e2e `frontend/e2e/flow-us2.spec.ts`: `slots:full` → no-slot state; a `.txt` file refused before upload; `balance:40` with a long section → disabled Start + shortfall; cancel while queued (free) and during step 2 (quoted charge, balance check); `outcome:failed@2` → refund, Try again resumes at step 2; `outcome:no-dialogue` → charged + Try another video; axe on each state

---

## Phase 5: User Story 3 — Fix one line without losing the result (P2)

**Independent test**: from a ready result, re-record turn 3, build, switch, download.

- [X] T036 [US3] StudioPort `buildNewVersion` and ResultPort `switchTo` in `frontend/src/services/mock/studio.ts` / `mixer.ts`: new takes get `inVersion = null` until built; at most current + one pending version; switching makes pending current and deletes the old one; re-record blocked while any version assembles; failed new version keeps the current one; free
- [X] T037 [US3] (ui-builder) Result re-record in `src/features/result/ResultPage.tsx`: "Re-record a turn" chooser with the turn under the playhead selected → studio `?mode=rerecord` on that turn; new version assembling keeps the current playing, Re-record disabled with the visible reason; "Download version 1" while version 2 is ready; "Watch version 2" plays from 0:00
- [X] T038 [US3] (ui-builder) Studio re-record mode in `src/features/studio/StudioPage.tsx`: every turn has a take, ‹ › move freely, "Build the new version" from the first new take on every turn, exit dialog Stay / Leave without building / Build the new version
- [X] T039 [US3] (ui-builder) e2e `frontend/e2e/flow-us3.spec.ts`: seeded done project (`?demo=turns:6` + flow helper) → re-record turn 3 → build → current keeps playing, Re-record disabled with reason → "Watch version 2" → download; leave without building keeps the result; axe

---

## Phase 6: User Story 4 — Leave and come back at any point (P2)

**Independent test**: reload each route mid-flow; open `/projects/:id`.

- [X] T040 [US4] (ui-builder) Redirect page `src/features/projects/ProjectRedirect.tsx` (S6): shell skeleton while looking up, then `redirectTarget()`; unknown/deleted id → `/projects` with the D4 toast "We couldn't find that project"; each feature page guards its own route (Processing of a ready project → studio turn 1; studio of a preparing project → Processing; result of a recording project → first turn without a take)
- [X] T041 [US4] (ui-builder) `ReadyWatcher` in `src/features/processing/ReadyWatcher.tsx`, mounted in AppShell and StudioShell: projects with notify on → in-app toast "Open the studio" / "Watch the result" when not on that project's page, and a `Notification` when the tab is hidden and permission granted; permission asked only on "Notify me when it's ready" (research R8)
- [X] T042 [US4] (ui-builder) Studio exit while recording/saving in `src/features/studio/StudioPage.tsx`: Save and leave / Leave without saving / Stay ("Stay" keeps what was recorded); D2 `recordBlock="other-tab"` from `acquireCapture` → `busy-elsewhere`, cleared on lock release and on "Try again"; microphone blocked wins over the lock
- [X] T043 [US4] (ui-builder) e2e `frontend/e2e/flow-us4.spec.ts`: reload on Processing, studio turn 2 with takes, Result → same place and takes intact; `/projects/:id` redirects for each state + unknown id toast; second page in the same context holding the lock → D2 notice and disabled Record, cleared after the first stops; axe

---

## Phase 7: User Story 5 — My projects shows where every dub is (P3)

**Independent test**: projects in several states via the mock → each row's tag and target.

- [X] T044 [US5] (ui-builder) My projects page `src/features/projects/ProjectsPage.tsx` using the approved `src/features/recording-flow-mock/views/ProjectsView.tsx` (S5, D3): data from `['projects']` + `['account']`; `hrefOf` per the ui-spec S5 row table; Rename / Delete; Delete on Queued/Preparing opens the cancel dialog with the live `cancelQuote` (`cancelInfo`); loading / empty / error / slots-full states; sort menu
- [X] T045 [US5] (ui-builder) e2e `frontend/e2e/flow-us5.spec.ts`: rows for draft, queued, preparing, recording, done, done + new version, no dialogue, failed (seeded via the mock) show their tags (`project-state`, `project-new-version`) and open the right page; delete frees a slot (header count); empty state → New dub; axe; RU run

---

## Phase 8: Polish and cross-cutting

- [X] T046 [P] Move strings used by the real pages to feature namespaces in `frontend/src/i18n/locales/en.ts` and `ru.ts` (RU plurals `_one/_few/_many/_other`), keeping the prototype keys working
- [X] T047 [P] Update `design-system/ia.md` only if a route detail changed in implementation (otherwise no edit) and `frontend/README` / `quickstart.md` demo parameters if they changed
- [X] T048 Full verification: `cd frontend && npm run build && npm run lint && npm run lint:css && npm run test:unit && npx playwright test --workers=1` — report real output
- [X] T049 Run the quickstart manual check (quickstart.md steps 1–7) in Chrome on port 5174 and note anything that differs
- [X] T050 Screenshots of the real routes at 1440 × 900 and 390 × 844 (`npm run snap`) into `specs/001-recording-flow-mock/design/impl/` for design QA

---

## Dependencies

- Phase 1 → Phase 2 → stories. T004 before every services task; T011–T013 before T014–T015; T015–T016 before any page.
- US1 (Phase 3) is the base for the rest: US2 builds on New dub/Processing pages (T028–T029), US3 on Result/Studio (T030–T031) and needs a done project, US4 on all pages, US5 on the services list + the routes.
- US2 and US5 can run in parallel after US1; US3 and US4 can run in parallel after US1.
- Phase 8 after the stories you ship.

## Parallel examples

- Phase 2: T005, T006, T007, T008 together (separate rule files); then T009.
- US1: T024, T025, T026, T027 (four view extractions, separate files) in parallel with T020–T023 (services).
- After US1: Phase 4 (US2) and Phase 7 (US5) side by side.

## Implementation strategy

1. MVP: Phases 1–3 → stop and check US1 end to end (that is the demo).
2. Then US2 (money honesty, P1), then US3 + US4, then US5.
3. After implement: the `after_implement` hook runs `/speckit-design-qa` against `ui-spec.md` and `design/screens/`.
