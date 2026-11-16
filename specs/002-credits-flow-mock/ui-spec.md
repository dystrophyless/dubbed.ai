# UI spec: Credits flow on mock services

**Feature**: `002-credits-flow-mock` · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)
**Status**: Approved (2026-11-15)
**Designer**: ui-designer · **Prototype**: `/prototypes/002-credits-flow-mock/credits` · `/prototypes/002-credits-flow-mock/checkout`

Both screens use existing archetypes — no NEW-ARCHETYPE. Credits is the owner-approved Gate-3 template implemented
as-is; only the pieces the spec newly requires are added (rows, messages). Views: `frontend/src/features/credits/views/CreditsView.tsx`,
`frontend/src/features/checkout/views/CheckoutView.tsx`; mocks `features/credits/mocks.ts`; prototype `prototypes/002-credits-flow-mock.tsx`.

## 1. Screens

| # | Screen | Route | Shell | Archetype | Reference template | User stories |
|---|---|---|---|---|---|---|
| S1 | Credits | `/credits` (`?from=new&project=<id>&need=<n>` · `?from=slots` · `?purchase=<id>`) | ordinary (AppShell, balance pill hidden) | Credits | `/styleguide/templates/credits` | US1–US4 |
| S2 | Simulated payment page | `/checkout/:purchaseId` | none (brand + language only, as Auth) | Auth (centred panel, otp-input reference) | `/styleguide/templates/auth` | US2 |

The payment page stands in for a payment provider's hosted checkout: it is outside the product navigation, names no real
provider and has no card or personal-data fields. The real provider replaces it without changing S1.

## 2. Screen details

### S1 — Credits

**Goal**: see the balance and where credits went, buy a pack, and come back to the scene that needed credits.

**Layout** (narrow 720 column, as the template):
```
PageHeader: "Credits" · "1 credit = 1 second of dubbing. Credits never expire."
[Notice]  Alert (one at a time): success | declined | buy-error | shortfall | slots        ← NEW
Card Balance:      IconTile 40 accent · "Balance" · NumberTicker + unit · "About N min of dubbing" (or the zero line)
                   · "N credits in reserve for <project links>"  (when reserved > 0; each link → Processing)
Card Buy credits:  CardHeader (+ "One-time packs, no subscription.") · OptionCards ×3 · CardFooter [demo-price note | ONE primary "Buy 1,000 credits · $9"]
                   purchasing: cards locked, button loading, info Alert "Opening secure checkout…"
Card History:      CardHeader "History" · List (ListGroup by day, IconTile per kind, signed amount) · Pagination (only when > 1 page)
```

**What is new relative to the approved template** (everything else is the template):
1. History rows: kinds welcome / purchase / **project run** (one row that changes in place) / **demo adjustment** (mock only).
2. The notice Alert above the balance (success, declined, shortfall, slots).
3. Zero-balance line; reserve line names and links the projects holding it.
4. When the success notice carries "Back to New dub", the Buy button drops to secondary so the page keeps exactly one primary.

**Run row** (title = project name; subtitle = status · time; trailing = signed amount = −(reserved + charged); returned / failed show a muted 0):
| Run state | Icon tile | Subtitle status | Amount |
|---|---|---|---|
| reserved | duration · warning (row links to Processing) | "73 in reserve" | −73 |
| charged | scene · neutral | "73 charged" | −73 |
| partly charged | scene · neutral | "20 charged, 53 returned" | −20 |
| returned (cancelled while waiting) | retry · success | "58 returned" | 0 |
| failed, returned | retry · success | "Returned — service failure, nothing charged" | 0 |

Other rows: welcome (magic · accent, "Welcome credits" / "Once per verified account", +120); purchase (purchase · success,
"Pack · 1,000 credits" / "$9 · Demo payment · 06:20 PM", +1,000 green); adjustment (wallet · neutral, "Demo adjustment" / "Demo only", ±n, mock-only).

**Copy** (keys `features.credits.*`; plurals through i18next, numbers through `Intl.NumberFormat`, prices as USD "$9" in both languages):
| Element | Key | EN | RU |
|---|---|---|---|
| Title / subtitle | `title` / `subtitle` | Credits / 1 credit = 1 second of dubbing. Credits never expire. | Кредиты / 1 кредит = 1 секунда озвучки. Кредиты не сгорают. |
| Balance label / unit | `balance` / `unit` | Balance / credit(s) | Баланс / кредит · кредита · кредитов |
| Worth | `worth` / `worthLess` | About {n} min of dubbing / Less than a minute of dubbing | Около {n} мин озвучки / Меньше минуты озвучки |
| Zero balance | `zero` | Buy a pack to dub your next scene | Купите пакет, чтобы озвучить следующую сцену |
| Reserve | `reservedFor` | 73 credits in reserve for <Rooftop argument> | 73 кредита в резерве для <Rooftop argument> |
| Packs header / meta | `packs` / `packsText` | Buy credits / One-time packs, no subscription. | Купить кредиты / Разовые пакеты, без подписки. |
| Pack subtitle | `packMinutes` | credits · about 16 min | кредитов · около 16 мин |
| Best badge | `best` | Best value | Выгодно |
| Demo note | `packsNote` | Demo prices — the real ones are not set yet. | Демо-цены — настоящие ещё не назначены. |
| Primary | `buyPack` | Buy 1,000 credits · $9 | Купить 1 000 кредитов · $9 |
| Purchasing | `checkoutTitle` / `checkoutText` | Opening secure checkout… / Payment continues on a separate checkout page. You will come back here when it is done. | Открываем безопасную оплату… / Оплата продолжится на отдельной странице. Когда она закончится, вы вернётесь сюда. |
| History / empty | `history` / `emptyTitle` / `emptyText` | History / No history yet / Credits you get and spend will show up here. | История / Истории пока нет / Здесь появятся начисленные и потраченные кредиты. |
| Days | `today` / `yesterday` | Today / Yesterday (then "13 November") | Сегодня / Вчера (затем «13 ноября») |
| Welcome | `welcome` / `welcomeHint` | Welcome credits / Once per verified account | Приветственные кредиты / Один раз для подтверждённого аккаунта |
| Purchase row | `purchaseRow` / `purchaseHint` | Pack · 1,000 credits / $9 · Demo payment | Пакет · 1 000 кредитов / $9 · Демо-оплата |
| Adjustment | `adjustment` / `adjustmentHint` | Demo adjustment / Demo only | Демо-корректировка / Только для демо |
| Run | `run.reserved` | {n} in reserve | В резерве {n} |
| | `run.charged` | {n} charged | Списано {n} |
| | `run.partly` | {c} charged, {r} returned | Списано {c}, возвращено {r} |
| | `run.returned` | {n} returned | Возвращено {n} |
| | `run.failed` | Returned — service failure, nothing charged | Возвращено — сбой сервиса, ничего не списано |
| Success | `notice.successTitle` / `successText` | 1,000 credits added / Your balance is now 1,983. | Начислено 1 000 кредитов / Теперь на балансе 1 983. |
| First purchase | `notice.firstPurchase` | Your account now has 10 project slots. | Теперь в вашем аккаунте 10 мест для проектов. |
| Back (primary in the notice) | `notice.back` | Back to New dub | Вернуться к новой озвучке |
| Declined | `notice.declinedTitle` / `declinedText` | The payment didn’t go through / Nothing was charged. Your pack is still chosen — you can try again. | Платёж не прошёл / Ничего не списано. Пакет по-прежнему выбран — можно попробовать ещё раз. |
| Buy error | `notice.buyError` | Couldn’t start the payment. Nothing was charged — try again. | Не удалось начать оплату. Ничего не списано — попробуйте ещё раз. |
| Shortfall | `notice.shortfallTitle` / `shortfallText` | You need 32 more credits for Rooftop argument / We chose the smallest pack that covers it. | Не хватает 32 кредитов для «Rooftop argument» / Мы выбрали самый маленький пакет, которого хватит. |
| Slots | `notice.slotsTitle` / `slotsText` | Buy your first pack to get 10 project slots / Free accounts have 2 project slots. Any pack raises the limit to 10. | Купите первый пакет — будет 10 мест для проектов / В бесплатном аккаунте 2 места для проектов. Любой пакет поднимает лимит до 10. |
| Load error | `errorTitle` / `errorText` + "Try again" | Couldn’t load your credits / Check your connection and try again. | Не удалось загрузить кредиты / Проверьте соединение и попробуйте ещё раз. |

**States** (`?state=` on `/prototypes/002-credits-flow-mock/credits`):
| State | What the user sees | Trigger in the real page |
|---|---|---|
| default | every row kind, 3 pages, 73 in reserve | data loaded |
| loading | skeleton in the content shape, `aria-busy` | queries pending |
| empty-history | History panel EmptyState "No history yet" | no rows (demo only) |
| error | EmptyState danger + "Try again"; top bar keeps the last balance | query error |
| purchasing | cards locked, Buy loading, info Alert; then the checkout page | Buy pressed, purchase created |
| success | success Alert (credits, new balance), top row = the new purchase | `?purchase=<id>` completed |
| success-first | as success + "Your account now has 10 project slots." | first purchase completed |
| success-return | as success + primary "Back to New dub" (Buy becomes secondary) | success with `from=new` / `from=slots` context |
| declined | warning Alert; balance and history unchanged; the pack still chosen | `?purchase=<id>` declined |
| buy-error | danger Alert (title only, kit `role="alert"`, `data-kind="buy-error"`) in the notice slot; the chosen pack kept; Buy is the retry | startPurchase failed (`storage` / `pack`) or threw, or the sweep failed |
| shortfall | info Alert "You need N more credits for <project>"; smallest covering pack preselected | `?from=new&project&need` |
| slots | info Alert about 10 project slots | `?from=slots` |
| zero-balance | "Buy a pack to dub your next scene" under 0; no error styling | balance 0 |
A cancelled purchase (back from the checkout without paying) shows the default page with no message (spec FR-008).

**Interactions**:
- Choose a pack (radio cards, arrows) → the Buy label updates. Buy → purchasing (locked, repeated press ignored) → checkout page.
- "Back to New dub" (success with context) → New dub with the video and section kept. "Buy" stays available as a secondary action.
- A run in reserve links to its Processing page (history row and the project links in the Balance panel).
- Pagination (desktop numbers; compact "‹ 1 of 3 ›" on phones) is shown only when there is more than one page; newest first.
- Focus: the notice is `role=status` (announced); Buy keeps focus when it turns busy.

**Responsive**: 1440 — narrow 720 column, three pack cards in a row, footer = note + button on one line. 390 — packs stack as rows (credits left,
price right), footer stacks with the full-width Buy, the notice's "Back to New dub" sits on its own line under the text, pagination is compact.
Balance and Buy are visible without scrolling at 390 × 844 in every state except the two-line RU notices (Buy then starts at ~y 640).
**Test hooks**: `credits-balance`, `credits-reserved`, `credits-packs`, `credits-buy`, `credits-notice` (`data-kind`), `credits-history`, `history-row`,
`credits-history-empty`, `credits-error`; roles: group "Buy credits" (fieldset + legend, radio children), button "Buy 1,000 credits · $9", button "Back to New dub".

### S2 — Simulated payment page

**Goal**: confirm a demo payment, or leave without paying.

**Layout** (Auth archetype: brand top-left, EN/RU top-right, one centred panel, 400 px):
```
Card (padding none)
  body:  IconTile 40 (purchase, accent) · h1 "Confirm your payment" · "Credit pack for your Dubbed account"
         Alert warning  "Demo payment — no real money" / "Nothing will be charged, and no card or personal details are needed."
         summary (hairline above and below, no inner card):  "Credit pack" · "1,000 credits · about 16 min of dubbing"      $9
         Button primary lg full width "Pay $9"
  footer (hairline):   Button ghost "Back to Dubbed"
```
The panel never shows a real provider's name or mark, a card form, a name or an email.

**Copy** (keys `features.checkout.*`):
| Element | Key | EN | RU |
|---|---|---|---|
| Demo label | `demoTitle` / `demoText` | Demo payment — no real money / Nothing will be charged, and no card or personal details are needed. | Демо-оплата — настоящие деньги не списываются / Ничего не будет списано, данные карты и личные данные не нужны. |
| Title / subtitle | `title` / `subtitle` | Confirm your payment / Credit pack for your Dubbed account | Подтвердите оплату / Пакет кредитов для вашего аккаунта Dubbed |
| Pack | `pack` / `packText` | Credit pack / 1,000 credits · about 16 min of dubbing | Пакет кредитов / 1 000 кредитов · около 16 мин озвучки |
| Primary | `pay` | Pay $9 | Оплатить $9 |
| Paying | `paying` / `payingNote` | Paying… / Confirming the payment — keep this page open. | Оплата… / Подтверждаем платёж — не закрывайте страницу. |
| Back | `back` | Back to Dubbed | Назад в Dubbed |
| Returning | `returningTitle` / `returningText` | Taking you back to Dubbed… / One moment. | Возвращаем вас в Dubbed… / Одну секунду. |
| Completed | `completedTitle` / `completedText` | This payment is already complete / The credits are in your balance. Nothing more will be charged. | Этот платёж уже выполнен / Кредиты уже на вашем балансе. Больше ничего не спишется. |
| Cancelled | `cancelledTitle` / `cancelledText` | This payment was cancelled / Nothing was charged. To buy credits, start again from Credits. | Этот платёж отменён / Ничего не списано. Чтобы купить кредиты, начните заново на странице «Кредиты». |
| Not found | `notFoundTitle` / `notFoundText` | We can’t find this payment / The link may be old. Nothing was charged. | Не удалось найти этот платёж / Возможно, ссылка устарела. Ничего не списано. |
| Pay error | `payError` | The payment didn’t go through. Nothing was charged — try again. | Платёж не прошёл. Ничего не списано — попробуйте ещё раз. |
| Load error | `errorTitle` / `errorText` / `retry` | Couldn’t load this payment / Check your connection and try again. / Try again | Не удалось загрузить платёж / Проверьте соединение и попробуйте ещё раз. / Попробовать снова |

**States** (`?state=` on `/prototypes/002-credits-flow-mock/checkout`):
| State | What the user sees | Trigger |
|---|---|---|
| default | the panel above; Pay runs paying → returning → Credits (success; `&outcome=declined` → declined message) | purchase `awaiting` |
| loading | skeleton panel, visually hidden h1, `aria-busy` | query pending |
| paying | Pay loading ("Paying…"), Back disabled, status line | Pay pressed (repeat press ignored) |
| returning | spinner tile · "Taking you back to Dubbed…" — shown for success AND declined, so the page never reveals the outcome before Credits does | outcome received, redirect pending |
| completed | success tile · "This payment is already complete" · primary "Back to Dubbed" | purchase already `completed` |
| cancelled | info tile · "This payment was cancelled" · primary "Back to Dubbed" | purchase already `cancelled` / `declined` |
| not-found | search tile · "We can’t find this payment" · primary "Back to Dubbed" | unknown id |
| pay-error | the default panel plus a danger Alert (title only, kit `role="alert"`, `checkout-pay-error`) directly above Pay; the pack kept; Pay is the retry | pay returned `storage` or threw (`not-found` shows the not-found state instead) |
| error | danger tile · "Couldn’t load this payment" · primary "Try again" · ghost "Back to Dubbed" | query error |

**Interactions**: Pay → `pay(id)`; on any outcome the page replaces its history entry with `/credits?purchase=<id>` (the browser back button never
lands on a finished payment page). "Back to Dubbed" → `cancelPurchase(id)` then Credits in its default state. Finished / unknown purchases never charge.
**Responsive**: the same panel at 390 (inner padding stays 24–32); Pay is full width at both sizes; the whole panel fits 390 × 844 without scrolling.
**Test hooks**: `checkout-page` (`data-state`), `checkout-pack`, `checkout-pay`; roles: button "Pay $9", button "Back to Dubbed", heading level 1.

**Formatting — times** (owner, 2026-11-15): one helper, `timeFormatter()` in `features/credits/format.ts`. Words and digits follow the UI language
(month names, "Today", "Yesterday"); the 12 / 24-hour cycle follows the user's own browser locale (`Intl.DateTimeFormat(undefined, {hour}).resolvedOptions().hourCycle`,
i.e. `navigator.language`): en-US -> "06:20 PM", en-GB / ru-RU -> "18:20". So an EN UI on a ru browser shows 24-hour and a RU UI on an en-US browser shows 12-hour.
Limitation: browsers do not expose the OS 12/24-hour toggle, only the locale's default; a user whose OS clock differs from the browser locale sees the locale's cycle.

## 3. Components

- Existing, unchanged: `PageHeader`, `Card`, `CardHeader`, `CardFooter`, `IconTile`, `NumberTicker`, `OptionCards`, `List`, `ListGroup`, `ListItem`,
  `Pagination`, `Alert`, `EmptyState`, `Button`, `TextLink`, `SkeletonText`, `Spinner`, `Brand`, `LanguageSwitch`, `Container`, `Stack`, `Show`.
- **New components**: none. New CSS modules only for page layout (tokens only): `credits.module.css` (copied from the approved template), `checkout.module.css`
  (the Auth panel recipe + the divided pack summary).

## 4. Data contract for views

```ts
type CreditsViewProps = {
  state: "default" | "loading" | "empty-history" | "error" | "purchasing";
  balance: number;
  reserved: { credits: number; projects: { id: string; name: string; href: string }[] };
  packs: { id: string; credits: number; priceCents: number; best?: boolean }[];
  packId: string; onPackChange: (id: string) => void; onBuy: () => void;
  notice: null
    | { kind: "success"; credits: number; balance: number; firstPurchase: boolean; slotLimit: number }
    | { kind: "declined" } | { kind: "buy-error" } | { kind: "shortfall"; need: number; projectName: string } | { kind: "slots"; slotLimit: number };
  onBack?: () => void;                       // only with a return context; shows "Back to New dub" in the success notice
  history: HistoryItem[]; page: number; pages: number; onPage: (p: number) => void;   // HistoryItem: welcome | purchase | adjustment | run
  onRetry: () => void; now: number;
};
type CheckoutViewProps = {
  state: "default" | "loading" | "paying" | "returning" | "completed" | "cancelled" | "not-found" | "error";
  pack?: { credits: number; priceCents: number };
  payError?: boolean;                        // the last Pay failed: danger Alert above Pay
  onPay: () => void; onBack: () => void; onRetry: () => void; brandHref: string;
};
```
`HistoryItem` run rows carry `reserved / charged / returned / runState` and `projectHref` (only for a run in reserve). `HistoryRow` of the services
contract maps 1:1 (`updatedAt`, `pack` are not displayed).

## 5. Open questions

1. (Answered, round 1) History times follow the browser locale's hour cycle, see Formatting — times.
2. Returned and failed runs show a muted "0" as the amount (the credits never left the balance). Alternative: no amount. Chosen "0" so every row has a number column.
3. Success with "Back to New dub": the Buy button turns secondary so the page keeps one primary. Alternative: keep Buy primary and make the notice button secondary.
4. The shortfall and slots notices are Alerts above the balance, not a line inside it — they carry context the template has no place for.
5. The Credits page (not the New dub page) shows the "Back to New dub" action; leaving without buying is the browser back / the New dub nav (state is kept by feature 001).

## 6. Revision log

| Round | Date | Feedback (owner) | Changes made |
|---|---|---|---|
| 1 | 2026-11-15 | — (first review) | — |
| 2 | 2026-11-15 | Short purchase title, price into the subtitle; times follow the user's own 12 / 24-hour preference | Row title "Pack · 1,000 credits" / «Пакет · 1 000 кредитов», subtitle "$9 · Demo payment · time"; `timeFormatter()` (hour cycle from browser locale, words from UI language); limitation documented. |
| 3 | 2026-11-15 | Code review: failed Buy / Pay were silent; owner chose inline error (A) | New notice kind `buy-error` (Credits, notice slot) and `payError` prop (Checkout, above Pay), both a danger Alert (kit `role="alert"`, no wrapper role; danger tone so it is distinct from the amber demo label); copy and states added; a failed Buy or Pay keeps the pack and the same button is the retry; Back still navigates when cancelPurchase fails. |
| 4 | 2026-11-15 | paid 10/10 offered a purchase that adds no slots | interim: delete-a-project line, no Buy credits; more slots = feature 003. New dub no-slot notice and My projects slots-full alert take `paidFull` (account.slotLimit = 10): text "Delete a project to free a slot" / «Удалите проект, чтобы освободить место», Buy credits hidden, Open My projects kept; `/credits?from=slots` on a paid account shows no slots notice (returnTo stays null). Prototype states `no-slot-paid` (New dub), `slots-full-paid` (My projects). |

## 7. Approval

- Approved by the product owner on: 2026-11-15 ("утверждаю" in chat after localhost review, round 2)
- Approved screenshots: `specs/002-credits-flow-mock/design/screens/` — 80 files: credits × 12 states (re-snapped round 2) and checkout × 8 states, desktop 1440 × 900 and mobile 390 × 844, EN and RU
- Round 3–4 additions approved by the product owner on 2026-11-15 ("утверждаю" after localhost review of the prototypes): credits `buy-error` and checkout `pay-error` (danger tone), New dub `no-slot-paid`, My projects `slots-full-paid` — screenshots `credits-buy-error.*`, `checkout-pay-error.*`, `newdub-paid-full.*`, `projects-paid-full.*` (desktop + mobile, EN + RU) in the same folder.
