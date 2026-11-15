# UI spec: Recording flow on mock services

**Feature**: `001-recording-flow-mock` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-04)
**Designer**: ui-designer · **Prototype**: `/prototypes/001-recording-flow-mock` (deltas only; everything else is the Gate-4 prototypes)

> Approach. All four archetypes of this feature (New dub, Processing, Studio, Result) were designed by design-architect and
> **approved at Gate 4 (2026-11-03/04)**; My projects is the Gate-3 template. This ui-spec therefore **maps every screen x state
> to its approved prototype/template** and specifies only the four deltas the real feature needs. Exact copy for approved
> screens lives in the prototypes' i18n keys (`newDub.*`, `processing.*`, `studio.*`, `result.*`, `tpl.projects.*`) and is not
> repeated here; the views are extracted from those prototypes unchanged. Anything not listed under "Deltas" = "as approved".

## Deltas (owner: please look at these)

| # | Delta | Where | Why |
|---|---|---|---|
| D1 | **Result download: plain button, the file format beside it as quiet text** (owner, round 1: "Скачать с тихой подписью"). Button = "Download" / «Скачать», or "Download version 1" / «Скачать версию 1» once version 2 is ready; next to it a muted "WebM" (Safari/backend: "MP4"). Accessible name includes the format via `aria-describedby`. **The one deviation from the approved Result** (the approved footer had a plain "Download MP4"). | `/prototypes/001-recording-flow-mock/result?state=ready` and `?state=new-version-ready` (`&format=mp4`) | FR-022: the page must name the format it really offers |
| D2 | **Studio notice "You're recording in another tab"** (the single recording lock is held by another tab). Same bottom notice as mic-blocked (amber Alert pinned at the bottom, nothing moves), Record / Record again disabled in place, reason linked with `aria-describedby`, "Try again" re-checks the lock. | `/prototypes/001-recording-flow-mock/studio?state=recording-elsewhere` | Edge: two tabs must not record at once |
| D3 | **My projects rows for every lifecycle state** (Delete on Queued / Preparing = the Processing cancel dialog with the live charge; Not started continues the draft; both owner-confirmed round 1), "Assembling a new version" next to "Ready", the empty state, the row targets | `/prototypes/001-recording-flow-mock/projects?state=default` (+ `empty`, `loading`, `error`, `slots-full`) | US5, ia.md lifecycle |
| D4 | **Redirect toast**: unknown/deleted project opens My projects with a toast "We couldn't find that project" | `/prototypes/001-recording-flow-mock/projects?state=not-found` | US4 scenario 1 |

Smaller consequences of the deltas, no new design: the browser/in-app "ready" notification body names no format ("Watch it and download the result.", key `features.recordingFlowMock.result.notifyBody`); the Result subtitle drops "MP4" and reads "6 turns · 720p" (keys `...result.meta*`) so the format is stated once, beside the button; row state label for Assembling reads "Assembling your video" (template said "Assembling").

## 1. Screens

| # | Screen | Route | Shell | Archetype | Reference (approved) | User stories |
|---|---|---|---|---|---|---|
| S1 | New dub | `/new` | ordinary (AppShell, balance in top bar) | New dub | `/prototypes/new-dub/page` | US1, US2 |
| S2 | Processing | `/projects/:id/processing` | ordinary | Processing | `/prototypes/processing/page`, `/prototypes/processing/ready-elsewhere` | US1, US2, US4 |
| S3 | Recording studio | `/projects/:id/turns/:n` | focused (StudioShell) | Studio | `/prototypes/studio/turn` (incl. `?mode=rerecord`) | US1, US3, US4 |
| S4 | Result | `/projects/:id/result` | ordinary | Result | `/prototypes/result/page`, `/prototypes/result/ready-elsewhere` | US1, US3 |
| S5 | My projects | `/projects` | ordinary | Projects (list) | `/styleguide/templates/projects` + delta D3/D4 | US4, US5 |
| S6 | Project redirect | `/projects/:id` | none (no UI; redirect) | — | ia.md redirect table; unknown id -> S5 + toast (D4) | US4 |

Credits (`/credits`) and Settings (`/settings`) are linked, not designed here (other features; Gate-3 templates).

## 2. Screen details

### S1 — New dub: as approved
Prototype `/prototypes/new-dub/page`, brief `new-dub-brief.md`, strings `newDub.*`. No delta.

| State (`?state=`) | Approved behaviour | Real trigger |
|---|---|---|
| `empty` | choose a video (dropzone), limits stated | no draft |
| `no-slot` | told before choosing a file; "Open My projects" + secondary "Buy credits" | both slots used (US2.1) |
| `uploading` | progress + "Cancel upload" | file chosen, type/size OK |
| `checking` | "checking" state | upload done |
| `ready` | video in 2.35:1 stage, name from file, section selector, "Start dubbing · N credits" (price only here) | check passed; draft + slot held |
| `limit` | 120 s limit explanation under the selector | section reached 120 s |
| `short` | video <= 120 s: whole video selected, selector still shown | |
| `error` (`&reason=type|size|length|no-audio|broken`) | refusal with reason, no slot | wrong type / > 250 MB before upload; > 10 min, unreadable, no sound after check |
| `starting` | Start pressed, pending | reserve call in flight |
| not enough credits | Start disabled, "N more credits needed" under it, "Buy credits" beside it (`/credits`; returning restores video and section) | balance < price |

### S2 — Processing: as approved
Prototype `/prototypes/processing/page`, brief `processing-brief.md`, strings `processing.*`. No delta.

| State | Approved behaviour | Real trigger |
|---|---|---|
| `queued` | "Waiting for our turn", cancel is free | project queued |
| `running` | steps 1-3 with names, "Step 2 of 3 · About a minute left", turns found from step 2, reserve line, leave line, "Notify me when it's ready" | preparing |
| `cancel-confirm` | dialog names the amount for finished steps; updates live | Cancel during step >= 1 |
| `cancel-queued` | dialog: free, all credits return | Cancel while queued; after confirm -> My projects + toast |
| `ready` | "Ready — opening the studio" then studio turn 1 (~1.5 s) or "Open the studio" if the tab is in the background (`&tab=background`) | preparation done |
| `no-dialogue` | "No dialogue found", charged; "Try another video" (same slot, -> `/new`), Delete project | zero turns |
| `failed` | nothing charged, reserve back at once, "Try again" resumes from the failed step | service failure |
| ready elsewhere | in-app toast "Open the studio" (+ browser notification if opted in and tab in background) wherever the user is | `/prototypes/processing/ready-elsewhere` |

### S3 — Recording studio: as approved, plus D2
Prototype `/prototypes/studio/turn`, brief `studio-brief.md` (1-25), strings `studio.*`. All approved states keep their
`?state=`: `no-take`, `arrival`, `recording`, `saving`, `saved`, `playing-take`, `last`, `exit-unsaved`, `mic-blocked`,
`loading`; `?mode=rerecord`, `?turn=`, `?turns=`, `?ratio=`. Real triggers: take saved/absent, window ending, microphone state.

**D2 — new state `recording-elsewhere`** (also added as a preview state to `/prototypes/studio/turn`, so the approved prototype
and the delta route share one implementation):

```
studio (unchanged)  ·  Record / Record again: disabled in place (same slot, nothing moves)
BottomNotice (same component as mic-blocked): Alert tone=warning
  title "You're recording in another tab"
  text  "Finish or stop that recording, then come back here and press Try again."
  action Button secondary sm [retry icon] "Try again"
```

| Element | Key | EN | RU |
|---|---|---|---|
| Notice title | `features.recordingFlowMock.studio.lockTitle` | You're recording in another tab | Вы записываете в другой вкладке |
| Notice text | `features.recordingFlowMock.studio.lockText` | Finish or stop that recording, then come back here and press Try again. | Завершите или остановите ту запись, затем вернитесь сюда и нажмите «Попробовать снова». |
| Action | `studio.mic.retry` (existing) | Try again | Попробовать снова |

| State | What the user sees | Trigger |
|---|---|---|
| `recording-elsewhere` | notice above; Record disabled, `aria-describedby="studio-lock-reason"`; Original / My take / Previous / Next keep working; no "N s left" hint | lock held by another tab (checked on arrival, on focus and on "Try again") |
| lock freed | notice disappears, Record enabled, nothing moves | "Try again" and the lock is free; also when the other tab releases it |

Priority when both apply: microphone blocked wins over the lock (the user can't record anyway); show only one notice.
Keyboard: `R` does nothing while disabled; "Try again" is reachable by Tab; the notice is `role="status"`-polite via the kit Alert.

### S4 — Result: as approved, plus D1
Prototype `/prototypes/result/page`, brief `result-brief.md`, strings `result.*`. All approved states keep their `?state=`:
`live`, `assembling`, `ready`, `chooser`, `new-version-assembling`, `new-version-ready`, `new-version-failed`, `failed`
(`&turns=`, `&ratio=`, `&notify=`, `&rerecorded=`).

**D1 — download with a quiet format note**: the button keeps its approved plain label; the real file format sits beside it as muted
secondary text (`Text size=sm tone=muted`, no new style). Desktop: footer right = `WebM` then the button. Phone (< 1024): the button
is full width with the format centred under it (`column-reverse`).

| Element | Key | EN | RU |
|---|---|---|---|
| Download (only / newest version on screen) | `features.recordingFlowMock.result.download` | Download | Скачать |
| Download while version 2 is ready but not yet switched to | `...result.downloadVersion` (`{{n}}`) | Download version 1 | Скачать версию 1 |
| Format note | literal file format from the service, not translated | WebM (Safari / backend: MP4) | WebM (MP4) |
| Format note, accessible description | `...result.formatNote` (reserved for the real page's `aria-label` if needed) | File format: WebM | Формат файла: WebM |
| Subtitle without the format | `...result.meta`, `...result.metaVersion` | 6 turns · 720p | 6 реплик · 720p |
| Ready notification body | `...result.notifyBody` | Watch it and download the result. | Посмотрите и скачайте результат. |

The button gets `aria-describedby` pointing at the format text, so a screen reader says "Download, WebM". The file is named
`<Project name>.<webm|mp4>`; the format comes from the services layer (`result.file.format`) as a view prop. Everything else
on the page, including "Re-record a turn" disabled with its visible reason while a version assembles, is as approved.

Result states in the demo flow (all approved): assembling (progress, "leave" line, notify control) -> ready (player, fullscreen
button / double-click / F, Esc) -> re-record chooser -> new version assembling (current keeps playing; reason beside the disabled
Re-record) -> "Watch version 2" (plays from 0:00; old version gone) / failed (retry once automatically, then free "Try again";
a failed new version leaves the current one).

### S5 — My projects: Gate-3 template + D3 + D4

**Goal**: see where every dub is and open it in the right place.

**Layout** (as the template): `PageHeader` (title, "N of M project slots used", sort menu when > 1 project) -> optional warning
`Alert` (slots full) -> one `Card padding=none` with a `List`; row = 16:9 frame · name · `Tag`(s) + detail + "x ago" · "⋯" menu
(Rename, Delete project). No page-level "New dub" button (it is in the top bar). Rename / Delete dialogs as in the template.

**Row per lifecycle state** (the ia.md lifecycle; whole row is a link; "⋯" is a separate control):

| State | Tag (tone) | Detail after the tag | Row opens | Menu |
|---|---|---|---|---|
| Draft | Not started (neutral) | duration | `/new`, **continuing the draft with the already uploaded video** (owner: yes) | Rename, Delete |
| Queued | Waiting to start (neutral) | — | `/projects/:id/processing` (cancel is free) | Rename, Delete* (cancel dialog) |
| Preparing | Preparing (accent, dot) | step 2 of 3 | `/projects/:id/processing` | Rename, Delete* (cancel dialog) |
| Recording | Recording (accent) | 3 of 12 turns | studio, first turn without a saved take | Rename, Delete |
| Assembling | Assembling your video (accent, dot) | — | `/projects/:id/result` (assembling state) | Rename, Delete |
| Done | Ready (success) | duration | `/projects/:id/result` | Rename, Delete |
| Done + new version | Ready (success) + Assembling a new version (accent, dot) | — | `/projects/:id/result` (current version plays) | Rename, Delete |
| No dialogue | No dialogue found (neutral) | — | `/projects/:id/processing` (end state: "Try another video", Delete project) | Rename, Delete |
| Failed | Something went wrong (danger) | — | `/projects/:id/processing` (free "Try again") | Rename, Delete |
| Cancelled | not listed | | | |

\* **Delete on a Queued or Preparing row first shows the same cancel dialog as Processing, with the live charge** (owner: yes, round 1).
Dialog = `processing.dialog.*` strings: title "Cancel preparing "{{name}}"?"; "Preparing hasn't started yet, so nothing is charged." /
"1 of 3 steps is done — 24 credits will be charged." + "The other 94 credits go back to your balance. The project is removed.";
buttons "Keep preparing" / destructive "Cancel preparing". The charge comes from the service (`cancelInfo(project)`) and updates live while
the dialog is open. Confirming removes the project and frees the slot. Other states use the plain delete dialog.

Frame: first frame of the section for most states; `scene` icon for No dialogue / Failed (as the template). A very long name
is truncated with an ellipsis (checked at 390 px); the tags never wrap into the name.

**Copy** (`features.recordingFlowMock.projects.*`; template strings carried over, deltas in bold):

| Element | Key | EN | RU |
|---|---|---|---|
| Title | `title` | My projects | Мои проекты |
| Slots | `slots` | {{used}} of {{total}} project slots used | Занято мест для проектов: {{used}} из {{total}} |
| States | `state.draft / queued / preparing / recording / assembling / done / no-dialogue / failed` | Not started / Waiting to start / Preparing / Recording / **Assembling your video** / Ready / No dialogue found / Something went wrong | Не начат / Ждёт запуска / Подготовка / Запись / **Собираем ваше видео** / Готово / Диалог не найден / Что-то пошло не так |
| New version | `newVersion` | **Assembling a new version** | **Собираем новую версию** |
| Progress | `stepOf`, `turnsDone` | step {{n}} of {{total}} · {{done}} of {{total}} turns | этап {{n}} из {{total}} · {{done}} из {{total}} реплик |
| Empty title / text / action | `emptyTitle`, `emptyText`, `newDub` | No projects yet / Upload a short scene and dub it with your own voice. / New dub | Проектов пока нет / Загрузите короткую сцену и озвучьте её своим голосом. / Новая озвучка |
| Slots full alert | `fullTitle`, `fullText`, `buy` | All project slots are used / Delete a project, or buy credits once to get 10 slots. / Buy credits | Все места для проектов заняты / Удалите проект или купите кредиты один раз — мест станет 10. / Купить кредиты |
| Error | `errorTitle`, `errorText`, `retry` | Couldn't load your projects / Check your connection and try again. / Try again | Не удалось загрузить проекты / Проверьте подключение и попробуйте ещё раз. / Попробовать снова |
| Row menu | `actions`, `rename`, `delete` | Actions for {{name}} / Rename / Delete project | Действия: {{name}} / Переименовать / Удалить проект |
| Rename dialog | `renameTitle`, `name`, `cancel`, `save`, toast `renamed` | Rename project / Project name / Cancel / Save / Project renamed | Переименовать проект / Название проекта / Отмена / Сохранить / Проект переименован |
| Delete dialog | `deleteTitle`, `deleteText`, `delete`, toast `deleted` | Delete "{{name}}"? / The project and all its takes are removed. Credits spent on preparation are not refunded. / Delete project / Project deleted | Удалить «{{name}}»? / Проект и все дубли будут удалены. Кредиты за подготовку не возвращаются. / Удалить проект / Проект удалён |
| **Redirect toast (D4)** | `notFoundTitle`, `notFoundText` | **We couldn't find that project** / **It may have been deleted. Here are your projects.** | **Не удалось найти этот проект** / **Возможно, он удалён. Вот ваши проекты.** |
| Relative time | `minutesAgo / hoursAgo / daysAgo` | 4 min ago / 3 h ago / 1 day ago | 4 мин назад / 3 ч назад / 1 день назад |

**States** (`/prototypes/001-recording-flow-mock/projects?state=`):

| State | What the user sees | Trigger |
|---|---|---|
| `default` | all nine lifecycle rows (prototype only; a real user has 1-10) | list loaded |
| `loading` | three skeleton rows, `aria-busy` | query pending |
| `empty` | EmptyState (scene icon, info): No projects yet + primary "New dub" -> `/new` | no projects |
| `error` | EmptyState tone=error + secondary "Try again" | query error |
| `slots-full` | warning Alert above the list (2 of 2 used), "Buy credits" -> `/credits` | free account, 2 projects |
| `delete-preparing` / `delete-queued` | the list with the cancel dialog open for the Preparing (1 of 3 steps done, 24 credits charged) / Queued (free) row | Delete project on that row |
| `not-found` | the default list + toast (info) "We couldn't find that project" | `/projects/:id` with an unknown/deleted id; toast stays until dismissed (kit default for info toasts is the kit's, see patterns.md) |

**Interactions**: click row -> its page (table above); "⋯" -> Rename (dialog, Save disabled when empty) / Delete project
(alertdialog, destructive button) -> toast, row disappears, slot freed (header count updates). Sort menu: Recently changed
(default) / Name A–Z. Keyboard: the row is one focus stop (link), "⋯" the next; dialogs trap focus and return it to "⋯".

**Responsive**: 1440: narrow container, 80 px frame. 390: 64 px frame, sort button under the title, tags and detail wrap to
a second line, long names truncate; no horizontal scroll. Key action (the list / "New dub" in the empty state) is visible
without scrolling at 390 x 844 and 1440 x 900.

**Test hooks**: `data-testid`: `projects-list`, `project-card` (row), `project-state` (the state tag), `project-new-version`
(extra tag), `projects-empty-new`; row menu by role `button` name "Actions for {{name}}"; dialogs by role `dialog` / `alertdialog`.

### S6 — `/projects/:id` redirect (no UI)
Per ia.md: preparing -> `/processing`; recording -> `/turns/:firstWithoutTake`; done -> `/result`; unknown/deleted -> `/projects` with the D4 toast.
While the project is being looked up show the page-level skeleton of the target shell (no flash of a blank page).

## 3. Components

- Existing (all screens): kit (`Button`, `Card`, `Dialog`, `Alert`, `EmptyState`, `List/ListItem`, `Menu`, `Tag`, `TextField`, `PageHeader`,
  `toast`), layout (`Container`, `Stack`), media (`Player`, `VideoStage`, `AudioTrack`, `Recording`, `Studio`, `Upload`, `Section`), shells (`AppShell`, StudioShell).
- **New components: none.** D2 reuses the studio's `BottomNotice` + `Alert`; D1 is a label; D3 reuses the template row; D4 is the kit toast.
- Prototype plumbing (not product UI): `StateSwitcher`, `InAppShell` (from the styleguide templates).
- Files: `frontend/src/features/recording-flow-mock/views/ProjectsView.tsx` (+ `projects.module.css`), `.../mocks.ts`,
  `frontend/src/prototypes/001-recording-flow-mock.tsx`, registry entry `001-recording-flow-mock`; additive edits to the
  approved prototypes: `studio/studio.tsx` (state `recording-elsewhere`, `BottomNotice testId`), `result/result.tsx` (`format` prop / `&format=`; default unchanged = MP4).
- Views to extract by ui-builder from the approved prototypes: `NewDubView`, `ProcessingView`, `StudioView`, `ResultView` (look unchanged; props below).

## 4. Data contract for views

```ts
type ProjectsViewProps = {              // implemented: features/recording-flow-mock/views/ProjectsView.tsx
  state: "default" | "loading" | "empty" | "error" | "slots-full";
  projects: ProjectItem[];             // { id, name, state: draft|queued|preparing|recording|assembling|done|no-dialogue|failed,
                                       //   seconds, turns?, stage?, newVersion?, changedMinutes }
  slotsTotal: number;                  // 2 or 10
  hrefOf: (p: ProjectItem) => string;  // the page maps state -> route (S5 table)
  onRename(id: string, name: string): void; onDelete(id: string): void;
  cancelInfo(p: ProjectItem): { stepsDone: number; charge: number; reserved: number };  // live; Delete on queued/preparing = cancel dialog
  onNewDub(): void; onBuyCredits(): void; onRetry(): void;
};
type ResultViewProps = {               // the approved Result + the real format (D1, shown as a quiet note beside Download)
  /* ...approved props (phase, progress, shown version, newer version, turns, chooser state, callbacks)... */
  downloadFormat: "webm" | "mp4";      // from the services layer; the label is features.recordingFlowMock.result.download*
};
type StudioViewProps = {               // the approved Studio + the lock (D2)
  /* ...approved props... */
  recordBlock: null | "microphone" | "other-tab";   // one notice at a time; microphone wins
  onRetryRecordBlock(): void;
};
```

New dub / Processing props: as in the approved prototypes (`NewDubPrototype`, `ProcessingPrototype` demo state hooks become the data hooks).

## 5. Open questions

1. Closed (round 3): D2 notice. **Owner: keep both (auto-clear + Try again).** The notice clears itself when the other tab releases the lock (closing that tab releases it too) and keeps "Try again"; it is not dismissible.
2. Resolved in round 1: D1 plain button + quiet format (Q1); Delete on Queued/Preparing = the cancel dialog with the live charge (Q3, yes); "Not started" continues the draft at `/new` (Q4, yes).
3. For the owner to note: the approved Result subtitle said "720p MP4"; in the WebM demo it reads "6 turns · 720p" so the format appears once.

## 6. Revision log

| Round | Date | Feedback (owner) | Changes made |
|---|---|---|---|
| 1 | 2026-11-04 | — (first review) | — |
| 2 | 2026-11-04 | Q1: download with a quiet format note; Q3: Delete on Queued/Preparing shows the cancel dialog; Q4: Not started continues the draft | D1 reworked (button "Download" + muted "WebM"; before: "Download WebM" / "Download version 1 · WebM"); Result subtitle without "MP4"; new states `delete-preparing`, `delete-queued`; S5 rows/open questions updated |
| 3 | 2026-11-04 | Q2: "давай как лучше" = keep both for the "recording in another tab" notice (a first reading "само" only was reverted) | D2 unchanged (auto-clear + Try again); Q2 closed; no visual change vs round 2 |

## 7. Approval

- Approved by the product owner on: 2026-11-04 ("утверждаю" in chat after localhost review, round 3)
- Approved screenshots: `design/screens/` (screen x state x desktop/mobile x EN/RU)
