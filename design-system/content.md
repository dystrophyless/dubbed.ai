# Content and microcopy

Dubbed speaks **English and Russian**. Every string is an i18n key (`frontend/src/i18n/locales/en.ts` is the source,
`ru.ts` must have the same keys). A ui-spec lists the exact strings in both languages.

## Voice

Casual users having fun with favourite scenes — friendly, short, encouraging. Plain words; no "AI", "model", "rendering",
"pipeline"; no jargon. No exclamation marks except a real celebration ("Your dub is ready!"). Russian uses «вы»
(lower case), natural phrasing — never a word-for-word translation.

## Mechanics

| Rule | Do | Don't |
|---|---|---|
| Case | Sentence case: "Start dubbing" / «Начать озвучку» | Title Case, ALL CAPS (except tiny overline tags) |
| Buttons | verb (+ object): "Record", "Save and leave", "Delete project" | "OK", "Submit", "Yes" |
| Links | say where they go: "Buy credits" | "here", "more" |
| Labels | noun, no colon: "Email" | "Enter your email:" |
| Placeholders | an example: "Kitchen scene" | repeat the label; instructions |
| Hints | one line, why or format: "At least 8 characters" | rules that belong in validation |
| Numbers | digits; thousands with a thin space in RU ("1 200"), comma in EN ("1,200") — use `Intl.NumberFormat` | words |
| Seconds | "4.4 s" / «4,4 с»; clocks "0:07", "1:04" | "4.4 seconds" in tight UI |
| Credits | "13 credits" / «13 кредитов» — always with i18next plurals (RU: _one / _few / _many) | "13 credit(s)" |
| Dates | `Intl.DateTimeFormat` for the language: "2 Nov", «2 нояб.»; relative up to 7 days ("2h ago" / «2 ч назад») | fixed formats |
| Separators | " · " between meta items | commas, pipes |
| Ellipsis | "…" (one character): "Saving take…" | "..." |
| Quotes | “…” in EN, «…» in RU | "…" straight quotes in UI |

## Patterns

**Errors** — what happened + how to fix, no blame:
- Field: "Enter a full email address, like name@example.com." Never "Invalid input".
- Upload: "It's longer than 10 minutes. Choose a shorter video." / "This file type isn't supported. Use MP4, MOV or WebM."
- Load error: "Couldn't load your projects" · "Check your connection and try again." · [Try again].
- Auth: "Wrong email or password" (never say which one).
- Microphone: "We can't hear your microphone. Check it in Settings."

**Money** — always name the exact cost and what happens: "Start dubbing · 13 credits"; cancel while preparing:
"2 of 3 stages are done — 9 credits will be charged."

**Confirmations** (Dialog): the title is the question with the object; the body names the consequence; buttons name
the actions: «Удалить «Сцена на кухне»?» · [Отмена] [Удалить проект].

**Toasts** — past tense, ≤ 5 words: "Take saved", "Project renamed", "Link copied" / «Дубль сохранён».

**Studio** — "Turn 3 of 12" / «Реплика 3 из 12» · "Record" / «Записать» · "Stop" / «Стоп» · "Record again" /
«Записать заново» · "Original" / «Оригинал» · "My take" / «Мой дубль» · "Previous" / «Назад» · "Next" / «Дальше» ·
"Record a take to continue" / «Запишите дубль, чтобы продолжить» · "Up to 4.4 s" / «До 4,4 с» · "1.5 s left" / «Осталось 1,5 с».
Sound captions stay in brackets and are shown quieter: "[laughs]" / «[смеётся]».

**No technical codes as the message** (owner, 2026-11-03): never "404", "500", "Error 0x…" as a title or tag — say what
happened in plain words. A support code may appear only as a copyable detail on the error page.
**No abstract metaphors as illustrations** (e.g. a "silent" waveform for not found): use a plain, recognisable icon.

**Never** show speaker names or numbers ("Speaker 1", «Голос 2»).

## Glossary

The terms (EN / RU) are defined in `ia.md` → Glossary: project · section · preparing · turn · fragment · take · unsaved
take · saved take · original · result / new version · credits · in reserve · project slot · credit pack.

| Use | Not |
|---|---|
| turn / реплика | line item, segment, speaker, cue |
| take / дубль | recording file, attempt, sample |
| preparing / подготовка | rendering, AI processing, transcription |
| credits / кредиты | coins, tokens, points |
| result / результат | export, output, render |
| project slot / место для проекта | quota, limit |
