# Research: Recording flow on mock services

All Technical Context items are resolved; no NEEDS CLARIFICATION remain.

## R1. What to reuse from `_carryover/frontend-services/`

- **Decision**: Re-import `browser-media/NativeBrowserMedia.ts` (microphone capture of a fixed window with live peaks,
  waveform decoding, video probe) and `browser-capture/WebLockCaptureGrants.ts` (one recording tab at a time) with their
  tests, adapted to the new contract. **Do not** re-import `mock/IndexedDbProjectStore.ts` (2 000 lines built around
  snapshots, generation identities and operation journals for a product shape that no longer exists) or `LayoutVariant`.
- **Rationale**: capture and decoding are the hard, browser-specific parts and are tested; the store models an older
  flow (no New dub, no Processing, no versions/credits) and would cost more to bend than to write ~400 lines against the
  approved spec.
- **Alternatives**: full re-import (rejected: wrong domain model); write capture from scratch (rejected: re-solves
  solved edge cases — device changes, interruption, early stop).

## R2. Persistence in the browser

- **Decision**: one IndexedDB database `dubbed-mock` (stores: `account`, `projects`, `turns`, `takes`, `videos`,
  `results`) behind the mock adapter; reads wrapped by TanStack Query; a tiny change feed (BroadcastChannel) invalidates
  queries across tabs.
- **Rationale**: takes and the uploaded video are Blobs (too large for `localStorage`); IndexedDB survives reloads
  (SC-004); BroadcastChannel covers "two tabs on the same project".
- **Alternatives**: in-memory only (fails SC-004); `localStorage` + base64 (size limits, slow).

## R3. Simulated server time

- **Decision**: the mock keeps server-like timestamps (`queuedAt`, `stepStartedAt`, …) and derives the current state
  from `now` on every read, with a demo time scale (default: queue 2 s, steps 4/5/4 s, assembly ≈ 0.5 × section length,
  capped at 30 s). A demo-only control (query `?demo=` read once into the mock settings) picks outcomes: `ready`,
  `no-dialogue`, `failed@step2`, `assembly-failed`, and the balance / slot preset.
- **Rationale**: deriving from timestamps makes reload and background tabs correct without timers that die with the
  tab; outcomes are reproducible for e2e.
- **Alternatives**: setInterval state machine (breaks on reload); a service worker fake server (heavier, no benefit).

## R4. Turns for an arbitrary uploaded video

- **Decision**: the mock "preparation" splits the chosen section into N turns (N = clamp(round(section/4.5 s), 1, 40))
  with windows of 2.5–4.5 s spread across the section, texts cycling through the bundled demo lines (EN/RU), original
  peaks decoded from the user's own video audio for each window (R1 decoding). A section shorter than 2 s → "No dialogue
  found" in the demo (also selectable).
- **Rationale**: the user records against their own scene; the demo stays deterministic for tests (`scene.mp4` → 13 s
  section → 3 turns; e2e can choose 6 by preset).
- **Alternatives**: fixed fixture turns ignoring the upload (breaks the "your scene" promise of option B).

## R5. Recording

- **Decision**: `NativeBrowserMedia.captureFixedWindow` with `durationMs` = the turn window; the studio mutes the scene
  (owner decision 16) and draws live peaks; the take Blob (`MediaRecorder` type, usually `audio/webm;codecs=opus`) and its
  peaks are saved; a take is "saved" only after the IndexedDB write resolves (no false recovery claims).
- **Rationale**: matches the approved studio behaviour and the product rule "never claim recovery before the audio is
  durably saved".

## R6. The demo result (owner option B)

- **Decision**: two parts behind `ResultPort`:
  1. **Playback** in the Result page is a live mix: the user's section video muted + each take scheduled with Web Audio
     at its turn start (and, between turns, the original audio at a lowered gain — "background kept" is approximated). It
     starts instantly and seeks correctly.
  2. **The downloadable file** is rendered during "assembling": the same mix is played into a hidden `<video>` +
     `AudioContext` destination, captured with `canvas/video.captureStream()` + `MediaStreamAudioDestinationNode` into
     `MediaRecorder` (WebM; MP4 on Safari), at real-time speed. Assembly time ≈ section length, so the demo time scale for
     assembling uses the real render time; the "assembling" state lasts until the file Blob is stored.
- **Rationale**: browsers cannot transcode to MP4 or render faster than real time without a WASM encoder (ffmpeg.wasm
  ≈ 30 MB — rejected for a demo); real-time capture is reliable in Chromium/Firefox/Safari.
- **Alternatives**: ffmpeg.wasm (size, memory on this machine); audio-only result (not a video); download the original
  (option A, rejected by owner).
- **Implementation note (2026-11-04)**: playback uses the rendered file itself, not a live mix: what the user watches
  is exactly what they download, and the Result player needs no section-time mapping. The original sound is decoded
  from the upload and silenced inside each turn window (short fades); the picture comes from a hidden muted `<video>`
  via `captureStream()`. MediaRecorder files carry no duration, so the player loads them with `loadWithDuration`
  (`services/media/mixer.ts`).
- **Consequence for the UI**: the download button names the real format of the file ("Download WebM" / «Скачать WebM»
  in Chromium/Firefox) — flagged to the owner in the ui-spec as the only deviation from the approved Result screen.

## R7. Data in the UI

- **Decision**: TanStack Query for every service read (`['account']`, `['projects']`, `['project', id]`,
  `['turns', id]`, `['take', id, n]`, `['result', id]`); mutations invalidate; the derived-time states refresh with
  `refetchInterval` only while a project is queued/preparing/assembling (500 ms). Zustand only for toasts and the
  "notify me" opt-in.
- **Rationale**: constitution (TanStack Query = server data, Zustand = client state); polling the mock mirrors the
  future real API.

## R8. Ready notifications across the app

- **Decision**: a root-level `ReadyWatcher` (inside `AppShell` and `StudioShell`) watches projects with a pending
  "notify" flag via the same queries; on ready it shows the toast (with the action) when the user is not on that
  project's page, and a `Notification` when `document.visibilityState === "hidden"` and permission is granted.
  Re-imported from the processing/result prototypes' `ready-elsewhere` logic.

## R9. Routing and redirects

- **Decision**: `/` → `/projects`; `/projects/:id` resolves by state (ia.md); each feature page also guards its own
  route (e.g. Processing of a ready project → studio turn 1; studio of a project still preparing → Processing; result of
  a recording project → first turn without a take); unknown id → `/projects` + toast. The studio `n` is 1-based.

## R10. Testing the microphone and the upload in Playwright

- **Decision**: Chromium launch flags for a fake microphone (a sine tone) and auto-granted permission; uploads via
  `setInputFiles` with `public/media/scene.mp4`; a "blocked microphone" project uses
  `context.grantPermissions([])` + a page-level override of `getUserMedia` to reject. The result download is asserted
  through Playwright's `download` event (file name and non-zero size).
