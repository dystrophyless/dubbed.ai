# UI spec: More project slots with every purchase

**Feature**: `003-slots-per-purchase` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-16)
**Designer**: ui-designer · **Prototype**: `/prototypes/003-slots-per-purchase/new-dub` · `/projects` · `/credits`

No new route, no new archetype, no new component. Changes sit inside three approved screens (feature 001-002) and are built from
`EmptyState`, `Alert`, `Text` and existing buttons. Views changed: `features/recording-flow-mock/views/NewDubView.tsx`,
`features/recording-flow-mock/views/ProjectsView.tsx`, `features/credits/views/CreditsView.tsx`; new type `features/credits/slots.ts`
(`SlotsOffer = "first" | "more" | "max"`); mocks `features/slots-per-purchase/mocks.ts`; prototype `prototypes/003-slots-per-purchase.tsx`.

## 1. Screens

| # | Screen | Route | Shell | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | New dub - "No free project slot" notice | `/new` | ordinary | New dub (one card), approved | `/prototypes/new-dub/page?state=no-slot` | US2 |
| S2 | My projects - "All project slots are used" alert | `/projects` | ordinary | Browse / list, approved | `/prototypes/001-recording-flow-mock/projects?state=slots-full` | US2 |
| S3 | Credits - slots notice, slots line, success notice | `/credits` (`?from=slots&back=new\|projects`) | ordinary (balance pill hidden) | Credits, approved | `/styleguide/templates/credits` | US1-US3 |

## 2. Screen details

Variants by `slotsOffer` (the rule, services layer): `first` = limit 2 (free) · `more` = 10-45 · `max` = 50.

### S1 - New dub, "No free project slot" (EmptyState in the card, one primary)

| Variant | Description | Actions |
|---|---|---|
| first (unchanged) | 2 of 2 text from 002 | primary "Open My projects", secondary "Buy credits" |
| more | EN: All {limit} project slots are used. Any credit pack adds 5 more - or delete a project you no longer need. / RU: Мест для проектов: {limit}, и все заняты. Любой пакет кредитов добавит ещё 5 - или удалите ненужный проект. | primary "Open My projects", secondary "Buy credits" |
| max | EN: All {limit} project slots are used - the maximum. Delete a project to free a slot. / RU: Мест для проектов: {limit}, и все заняты - это максимум. Удалите проект, чтобы освободить место. | primary "Open My projects" only |

Title unchanged ("No free project slot" / "Нет свободного места для проекта"). Keys `newDub.noSlot.moreText`, `.maxText` (`paidText` kept for the 002 interim, remove when the page passes `slotsOffer`).
Test hooks: `new-dub-no-slot` with `data-offer="first|more|max"`; buttons by role + name.

### S2 - My projects, "All project slots are used" (warning Alert above the list)

| Variant | Text EN / RU | Action |
|---|---|---|
| first (unchanged) | Delete a project, or buy credits once to get 10 slots. | secondary sm "Buy credits" |
| more | Any credit pack adds 5 more project slots - or delete a project you no longer need. / Любой пакет кредитов добавит ещё 5 мест для проектов - или удалите ненужный проект. | secondary sm "Buy credits" |
| max | You have the maximum of {limit} project slots. Delete a project to free a slot. / У вас максимум - {limit} мест для проектов. Удалите проект, чтобы освободить место. | none |

Keys `features.recordingFlowMock.projects.moreText`, `.maxText`. Test hook: `projects-slots-full` (`data-offer`). Header line "N of M project slots used" already shows the limit.

### S3 - Credits

**Layout** (unchanged order): notice Alert -> Balance -> Buy credits card (OptionCards, **slots line**, footer with ONE primary) -> History.

1. **Slots notice** (`?from=slots`, only while the limit < 50; at 50 `from=slots` is ignored):
   - free (unchanged): "Buy your first pack to get 10 project slots" / "Free accounts have 2 project slots. Any pack raises the limit to 10."
   - more: title (plural on the new limit) "Buy a pack to get {count} project slot(s)" / «Купите пакет - будет {count} место/места/мест для проектов»; text "You have {count} project slot(s). Any pack adds 5 more." / «У вас {count} место/места/мест для проектов. Любой пакет добавит ещё 5.». "Best value" stays preselected.
2. **Success notice** (sentence appended to "Your balance is now N."; shown only when the purchase raised the limit - view prop `slotLimit: number | null`):
   - 2 -> 10 and 10..45 -> +5: "Your account now has {count} project slot(s)." / «Теперь в вашем аккаунте {count} место/места/мест для проектов.»
   - reaching 50: "... {count} project slots - the maximum." / «... {count} мест для проектов - это максимум.»
   - already 50: nothing about slots (credits only).
   - Back button label: `back=new` "Back to New dub" / «Вернуться к новой озвучке»; `back=projects` "Back to My projects" / «Вернуться к проектам». As in 002 the Buy button turns secondary while the notice carries the Back primary.
3. **Slots line** (US3) - one muted small line directly under the pack cards (`credits-slots`):
   - free: "Free account: 2 project slots. Your first purchase gives 10." / «Бесплатный аккаунт: 2 места для проектов. Первая покупка даст 10.»
   - 10-45: "{count} project slots · the next purchase adds 5, up to 50" / «{count} мест для проектов · следующая покупка добавит ещё 5, максимум 50»
   - 50: not shown. Also hidden while a notice already says the same (slots notice, success that raised the limit) - no duplicated information.

Plurals: EN _one/_other, RU _one/_few/_many/_other for every string with a slot count next to the noun (1, 21 -> место; 2-4, 22 -> места; 5, 15, 50 -> мест). Strings that name the limit in a "N, и все заняты" / "максимум - N" frame take no plural.
Keys: `features.credits.slots.first|more`, `notice.slotsNow`, `notice.slotsMax`, `notice.slotsMoreTitle`, `notice.slotsMoreText`, `notice.backProjects` (old `notice.firstPurchase` removed).

**States** (`?state=` under `/prototypes/003-slots-per-purchase/`):

| Screen | States |
|---|---|
| `new-dub` | `no-slot-more` (10 of 10) · `no-slot-free` (2 of 2) · `no-slot-more-45` · `no-slot-max` (50) |
| `projects` | `slots-full-more` (10) · `slots-full-free` (2) · `slots-full-max` (50) · `after-purchase` (10 of 15, no alert) |
| `credits` | `slots-more` · `slots-free` · `slots-more-projects` · `line-free` · `line-more` (20) · `line-max` (50, no line) · `success-first` (->10) · `success-more` (->15, back new) · `success-more-projects` (back My projects) · `success-plain` (no back) · `success-max` (45->50) · `success-at-max` (credits only) |

Loading / error states of the three screens are unchanged (002 / 001). In the prototype Buy skips the payment page and goes to the matching success state; Back returns to New dub or `after-purchase`.

**Responsive**: no layout change. 390: slots line wraps to two lines in RU; notices keep the Back button on its own line; no horizontal scroll; Open My projects stays above the fold.

## 3. Components

Existing only: `EmptyState`, `Alert`, `Button`, `Text`, `Card`. New components: none.

## 4. Data contract for views

```ts
type SlotsOffer = "first" | "more" | "max";
// NewDubView (phase "no-slot")     + slotsOffer?: SlotsOffer; slotLimit?: number      (paidFull deprecated: = "max")
// ProjectsView (state "slots-full") + slotsOffer?: SlotsOffer; slotsTotal (already there) (paidFull deprecated)
// CreditsView
type CreditsNotice =
  | { kind: "success"; credits: number; balance: number; slotLimit: number | null }   // was firstPurchase + slotLimit; null = limit unchanged
  | { kind: "slots"; limit: number; next: number }                                  // was { slotLimit }; limit 2 -> free wording
  | /* declined | buy-error | shortfall unchanged */;
// + backTo?: "new" | "projects"  (label of the Back button, default "new")
// + slots?: { limit: number; offer: SlotsOffer }  (slots line; omit to hide)
```
`CreditsPage.tsx` got two one-line compatibility edits so the build stays green (success passes `slotLimit` only on the first purchase; slots notice `{ limit: 2, next: PAID_SLOT_LIMIT }`); behaviour is the 002 one until the ui-builder wires `slotsOffer`, `backTo`, `slots`.

## 5. Open questions

1. In the "more" notices "Open My projects" stays the primary and "Buy credits" secondary (as in 002 free). Alternative: Buy credits primary below the cap, since it is the new path.
2. RU keeps "мест" (as in 002), not the "слотов" used in the brief.
3. Credits slots line is hidden when a notice already states the limit, so the page never repeats it.

## 6. Revision log

| Round | Date | Feedback (owner) | Changes made |
|---|---|---|---|
| 1 | 2026-11-16 | Approved as shown ("утверждаю") | - |

## 7. Approval

- Approved by the product owner on: 2026-11-16 ("утверждаю" in chat after localhost review, round 1); open questions 1–3 accepted as designed
- Screenshots: `design/screens/` (80 files) - 3 screens x states x desktop 1440 / mobile 390 x EN / RU
