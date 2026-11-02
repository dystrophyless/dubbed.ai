# Dubbed — product brief

The product input for `$speckit-specify`. It states **what the product must do and the rules it follows** — not how any
screen looks. Screen layouts are designed from scratch through the design-system work in `BOOTSTRAP.md`.
Later explicit owner answers override this brief.

## 1. Idea

A browser app for **dubbing short video scenes with your own voice**. The user uploads a clip (movie, show, game…),
the service automatically turns its dialogue into timed recording turns, the user records every line through the
microphone, and gets the full video back with their voices replacing the original dialogue while music and effects stay.

- **Audience:** casual users having fun with favourite scenes — not professional dubbing, acting assessment or voice generation.
- **Differentiator:** no manual transcription, timing or clipping — preparation is automatic.
- **What should feel great:** following the scene, knowing exactly what to say and when, recording without friction,
  hearing yourself in the scene, and getting a video you want to keep.

## 2. Main journey

1. **Landing** explains the product (EN/RU) and the 120-credit welcome offer → start dubbing.
2. **Sign up / sign in**: email + password with email verification, or Google. A one-time **microphone check** happens
   during onboarding, before registration completes; afterwards microphone settings live only in Settings.
3. **New dub**: choose a video, preview it, pick the section to dub, see the exact credit cost, start processing with one
   deliberate action that names the cost (no second confirmation).
4. **Processing**: progress; queued cancel is free, running cancel charges only completed stages (shown before confirming).
   Zero detected turns → "No dialogue found" and an easy way to try another video (still charged — it is a delivered result).
5. **Recording studio**: a focused page without the app's global navigation (only a way to exit). For each turn the user
   needs to: see the moving scene, read the line, understand when it is spoken and how long it lasts, hear the original
   turn, record, hear their take in the scene, and move between turns.
6. **Result**: assembled automatically after the last turn; full playback, download (MP4), go back to any turn to re-record.
7. **My projects**: list of projects with progress, continue, rename, delete with confirmation.
8. **Credits**: balance, reservations, one-time packs, history. **Account**: settings, microphone, password, deletion.

## 3. Rules in force

**Upload and preparation**
- Originals MP4 / MOV / WebM up to **10 minutes and 250 MB**; the selected section is **≤ 120 seconds** (default: the whole
  video if ≤ 120 s, else the first 120 s). The section becomes the project timeline.
- Mixed **English + Russian** speech. Output keeps the original timing and visuals.
- Automatic preparation produces timed turns with transcribed text or sound captions (`[laughs]`, `[screams]`); connected
  speech is grouped and split at clear pauses; a 30-second speech can stay one turn; turns have small lead-in / ending margins.
- **No speaker identity**: no names or numbered speakers anywhere in the UI.
- **No manual correction** of transcript, timing or speakers, no adding missed lines, no separate review/prepare stage.
  A poor turn is performed as-is, or the user starts a new project.
- **No repeat preparation** of a delivered project (no free or paid reruns). Technical-failure recovery stays.

**Recording**
- Turn by turn. Recording starts immediately when the user starts it — **no countdown** — and stops automatically at the
  end of the turn's window (a fixed maximum; stopping earlier gives a valid shorter take). Never extend the video or
  time-stretch the performance.
- The original audio can be heard for reference, with its own volume (affects listening only, never the recording or output).
- After a take the user can listen to it, record again or move on — **no autoplay, no auto-advance**.
- **Moving to the next turn requires a take for the current one** (owner decision); going back is always possible.
- One current take per turn; the previous accepted take is kept until a replacement is safely saved.
- Leaving with an unaccepted take offers: **Save and leave / Leave without saving / Stay**. Unaccepted takes are recoverable
  account-owned drafts (across devices, no expiry) — never claim recovery before the audio is durably saved.
- Overlapping characters stay independent turns; while reviewing, unrecorded turns play the original voices.
- Headphones are recommended, not required. The studio contains no microphone setup — on input failure it points to Settings.

**Result and distribution**
- Every turn needs a saved take before the final result exists. Up to **720p MP4**, orientation kept, no upscaling, no
  added subtitles, original dialogue fully replaced, background kept.
- A new version never interrupts playback of the current one; the user switches to it explicitly. Download targets the
  version on screen.
- **Download only** — no public links, no sharing, no gallery.

**Accounts, projects, credits**
- **120 welcome credits** once per verified account; credits never expire; one-time USD packs, no subscriptions.
- Price: **1 credit per second**, rounded up (12.4 s → 13). No surcharge for language mix, overlaps or retries.
- Credits are reserved at start and settled on delivery; service failures are free; internal retries never double-charge.
- **2 saved projects** on a free account, **10** after the first purchase. A slot is taken after upload validation and
  freed on deletion (no refund for completed processing). Projects never expire while the account exists.
- Account deletion removes access, projects and recordings.

**Interface**
- **English and Russian** UI with a language switch; desktop and phone browsers (Chrome, Edge, Firefox, Safari, Android
  Chrome, iPhone Safari — real recording support to be verified per browser).
- **Light only**, no dark mode or theme toggle.
- Visual source: **affect-ui, Clean variant, Light**, font **Inter** (owner decisions). Recording / destructive actions are red.
- The owner wants **two distinct recording-studio designs** to compare later in an A/B test.

## 4. Out of scope (first version)

Translation, generated or cloned voices, performance scoring, public sharing / gallery / social features,
multi-take history, continuous multi-turn recording, video editing, manual split / merge, subscriptions,
guaranteed clean separation of any audio.

## 5. Open questions (carry into `$speckit-clarify` when the related feature is specified)

1. Exact credit packs and USD prices — pending cost measurements.
2. Export of a project with zero turns.
3. Content rights / abuse / reporting policy before any public release.
4. Backend AI pipeline (transcription, separation, rendering) — technical research; product rules must not depend on a
   particular model or vendor.

## 6. Stack (owner-confirmed)

Frontend SPA: React 19 + TypeScript + Vite, React Router, TanStack Query (server data), Zustand (client state only),
CSS Modules + design tokens (no Tailwind, no shadcn), Lucide icons, a typed services layer with an interchangeable mock.
Quality: Playwright + axe, Stylelint tokens-only, oxlint. Backend later: FastAPI + PostgreSQL + SQLAlchemy.
