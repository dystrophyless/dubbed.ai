# Dubbed — information architecture

Status: **approved by the owner (Gate 2) — 2026-11-02**. Sources: `PRODUCT_BRIEF.md`, owner answers in chat, `studio-brief.md`.
Items marked *(owner, 2026-11-02)* were not in the brief and were decided by the owner. Archetypes: `templates.md`.

## Roles

| Role | Who | Goal |
|---|---|---|
| Guest | not signed in | understand Dubbed, see the 120-credit welcome offer, start dubbing (→ sign up) |
| User | a signed-in, verified account | upload a clip, get it prepared, record every turn, download the dubbed video; manage projects, credits, account |

One kind of account. No teams, no public profiles, no sharing (download only).

## Sitemap

### Public
| Route | Page | Shell | Archetype |
|---|---|---|---|
| `/` | Landing (EN/RU, 120 welcome credits, "Start dubbing") | public bar | Landing |
| `/sign-up` | Email + password, or Google | none | Auth |
| `/sign-up/verify` | 6-digit email code (`OtpInput`) | none | Auth |
| `/sign-up/microphone` | One-time microphone check — part of onboarding, before registration completes | none | Auth (mic step) |
| `/sign-in` | Email + password, or Google | none | Auth |
| `/reset-password` | Request → code → new password | none | Auth |

### Signed in — ordinary shell
| Route | Page | Archetype |
|---|---|---|
| `/projects` | **My projects** — home after sign-in: list with progress, continue, rename, delete | Projects (list) |
| `/new` | **New dub** — choose a video → preview → pick the section (≤ 120 s) → exact cost → "Start dubbing · N credits" | New dub (NEW-ARCHETYPE, Phase 4) |
| `/projects/:id/processing` | **Processing** — progress by stage, cancel (queued: free; running: completed stages charged, shown before confirming); "No dialogue found" end state | Processing (NEW-ARCHETYPE, Phase 4) |
| `/projects/:id/result` | **Result** — full playback, download MP4, back to any turn to re-record, switch to a newer version | Result (NEW-ARCHETYPE, Phase 4) |
| `/credits` | **Credits** — balance, reservations, one-time packs, history | Credits |
| `/settings` | **Settings** — account (email, language), microphone, password, delete account | Settings |

### Signed in — focused shell (no global navigation, only Exit) — **only the recording itself** *(owner, 2026-11-02)*
| Route | Page | Archetype |
|---|---|---|
| `/projects/:id/turns/:n` | **Recording studio** — one turn (fragment) per screen; `n` is 1-based so reload / back keep the place | Studio (`studio-brief.md`, Phase 4) |

`/projects/:id` redirects by project state: processing → `/processing`, recording → the first turn without a saved take,
done → `/result`. Unknown or deleted project → `/projects` with a toast.

## Navigation

- **Ordinary shell** (built: `AppShell`): brand (→ `/projects`) · tray navigation **My projects · New dub** *(owner, 2026-11-02)* ·
  spacer · credit balance (link → `/credits`) · EN/RU · account menu (Settings, Credits, Sign out).
  Below 1024px: brand · balance · menu button → sheet with the navigation, EN/RU and account.
- **Focused shell** (built: `FocusedShell`) — the studio only: Exit · page title · right slot ("Turn 3 of 12" and the
  original-voice volume). Exit with an unsaved take asks: Save and leave / Leave without saving / Stay.
- **Public bar** (landing only) *(owner, 2026-11-02)*: brand · EN/RU · Sign in · "Start dubbing" (primary → `/sign-up`).
- **Auth pages:** no bar — brand above the form, EN/RU switch in the corner.
- No sidebar: the app has ≤ 4 sections.

## Core flows

1. **Sign up (email):** `/` → `/sign-up` → `/sign-up/verify` → `/sign-up/microphone` → account active, 120 welcome credits
   → `/new`. **Google:** `/sign-up` → Google → `/sign-up/microphone` → `/new`. The microphone step is **mandatory** *(owner,
   2026-11-02)*: it cannot be skipped; if the browser blocks the microphone, the step explains how to allow it and offers
   "Try again". Afterwards microphone settings live only in Settings.
2. **New dub:** `/new` → choose a video (MP4/MOV/WebM, ≤ 10 min, ≤ 250 MB) → upload validated (a project slot is taken) →
   preview + section (default: whole video if ≤ 120 s, else the first 120 s) → "Start dubbing · N credits"
   (credits reserved, no second confirmation) → `/projects/:id/processing`.
3. **Processing → studio:** stages complete → the studio opens on turn 1 (owner decision). Zero turns → "No dialogue found"
   + "Try another video" (still charged).
4. **Recording:** for each turn — watch the fragment, read the line, listen to the original, Record (no countdown, stops at
   the end of the window), listen to the take in the scene, Record again or Next (Next needs a take; Previous always works).
   After the last turn the result is assembled automatically → `/projects/:id/result`.
5. **Result:** play, download MP4 (the version on screen), open any turn to re-record → a new version is assembled; it never
   interrupts playback — the user switches to it explicitly.
6. **Credits:** not enough credits on New dub → "Buy credits" → `/credits` → pack → back to `/new` with the chosen video and section kept *(owner, 2026-11-02)*.

## Project lifecycle

| State | Shown as | What the user can do | Slot |
|---|---|---|---|
| **Draft** | "Not started" | finish New dub (section, start), delete | taken |
| **Queued** | "Waiting to start" | cancel — free | taken |
| **Preparing** | "Preparing · step 2 of 3" | cancel — completed stages charged (shown before confirming) | taken |
| **Recording** | "3 of 12 turns" | continue in the studio, rename, delete | taken |
| **Assembling** | "Assembling your video" | wait; open the studio | taken |
| **Done** | "Ready" | watch / download, re-record any turn, rename, delete | taken |
| **No dialogue** | "No dialogue found" | delete, try another video (charged — a delivered result) | taken |
| **Failed** | "Something went wrong" | retry recovery (free — service failure), delete | taken |
| **Cancelled** | — (disappears from the list) *(owner, 2026-11-02)* | — | freed |

- **Slots:** 2 on a free account, 10 after the first purchase. A slot is taken after upload validation and freed on
  deletion (no refund of completed processing). Projects never expire.
- No repeat preparation of a delivered project; technical-failure recovery stays.

## Credits

1 credit per started second of the section (12.4 s → 13). Reserved at start, settled on delivery; service failures are free;
internal retries never double-charge. 120 welcome credits once per verified account; credits never expire; one-time USD
packs (prices pending — `PRODUCT_BRIEF.md` §5).

## Glossary (EN / RU) — use these words everywhere

| Concept | EN | RU | Notes |
|---|---|---|---|
| a clip the user dubs | project | проект | |
| the part of the video that is dubbed | section | отрезок | ≤ 120 s |
| automatic preparation | preparing / processing | подготовка | not "rendering", not "AI" |
| one line to record (one fragment) | turn | реплика | never "speaker", never numbered speakers |
| the turn's fragment of video | fragment | отрывок | one fragment = one turn |
| the user's recording of a turn | take | дубль | one current take per turn |
| a take not yet saved / accepted | unsaved take | несохранённый дубль | recoverable draft of the account |
| the saved take that counts | saved take | сохранённый дубль | "accepted" in the code |
| the original voices | original | оригинал | |
| the dubbed video | result | результат | versions: "new version" / «новая версия» |
| account money | credits | кредиты | "1 credit", "13 credits" / «1 кредит», «13 кредитов» |
| credits held for a running job | reserved | в резерве | |
| a place for one project | project slot | место для проекта | "2 of 2 project slots used" |
| a purchasable bundle | credit pack | пакет кредитов | |
