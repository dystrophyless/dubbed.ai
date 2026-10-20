# SPEC-002: Dubbed frontend, visual system, service boundary, and mock mode

Status: draft
Revision: 0.5
Created: 2026-10-20 (Asia/Qyzylorda)
Owner: project owner (the requesting user)
Sources: [SPEC-001](SPEC-001_dubbed_mvp.md) revision 0.5; [BR-001](../business-requirements/BR-001_custom_video_dubbing.md) revision 0.2; [brainstorm](../../brainstorm.md); frontend request, owner stack decision and subsequent draft-task decomposition request
Approval: pending; white/gray/blue direction is owner-selected; exact tokens/layout below are design proposals for this specification, not a previously approved brand system
Scope authorization: specification only, explicitly confirmed through request-user-input; no frontend, mock implementation, or executable tests are created by this deliverable

## 1. Objective and precedence

Specify the complete frontend so it can later be built and exercised without a real backend. Define visual tokens, screen composition, responsive behavior, interaction states, a centralized services layer with interchangeable adapters, and meaningful automated/manual tests.

The user explicitly requires restrained design without gradients, every backend call centralized in one services layer, a mock implementation supporting the whole app, and tests. 'Add tests' means define the implementation test requirements here under the clarified specification-only scope; no test execution is implied.

SPEC-001 owns shared product/timing/billing contracts. This document specializes frontend behavior and proposes concrete technical/design details; it does not resolve SPEC-001 D01–D13 by accident. Missing production policies are carried as unresolved capabilities. Mock-only policy examples must be labeled, isolated from real configuration, and never promoted to business decisions.

Current state: documentation/workflow files only; no application package, frontend runtime, services code, UI components, test runner, or build/test commands exist. File/module names below are proposed implementation locations, not existing artifacts. The owner selected React for the UI and Zustand for shared frontend application state on 2026-10-20; see SPEC-001 §6.1. No component library, build tool, router or test runner is selected. The instruction remains documentation only: do not write code yet.

## 2. Visual direction

### 2.1 Flat recording studio

Use a neutral white/gray functional studio surface, white working panels, dark text, restrained blue primary actions and a dark media stage. Red denotes recording/destructive/error states with clear labels. The owner selected this direction; it supersedes the warm off-white/mustard proposal. Exact tokens and layout remain design proposals.

Required restraint:

- No gradients, background blobs, mesh/noise decoration, glass/blur effects, neon glow, ornamental 3D, or animated decorative waveforms.
- No oversized pill containers around every control, stacked dashboard cards with no purpose, invented statistics, fake testimonials/logos, or generic 'AI magic' marketing illustrations.
- Use flat fills and one-pixel separators. No default card shadows. Distinguish hierarchy through spacing, typography, alignment and borders.
- Use one primary action per stage. Do not make every state a bright colored card.
- Actual audio waveforms may communicate measured audio/timing; never animate a fake live input level as though it were a real microphone signal.
- No dark-mode toggle/theme system in initial scope. A dark video stage does not imply a dark application theme.

The landing example should show actual product interaction with a permitted demo scene. It must not imply automated speech replacement is already proven when it is a fixture.

### 2.2 Color tokens

Declare these once in `src/styles/tokens.css` or the chosen platform's equivalent. Components reference semantic variables; no scattered copies of hex values. Fixture/video content is exempt from UI-token rules.

| Token | Value | Usage |
|---|---|---|
| `--color-canvas` | `#F7F8FA` | App/page background. |
| `--color-surface` | `#FFFFFF` | Working panels, fields, dialogs. |
| `--color-surface-muted` | `#F1F3F5` | Subtle sections and disabled fill. |
| `--color-text` | `#202124` | Main text and headings; use white on blue primary actions. |
| `--color-text-muted` | `#5F6368` | Supporting text, timestamps, inactive metadata. |
| `--color-border` | `#DADCE0` | Decorative dividers and panel boundaries. |
| `--color-control-border` | `#74777D` | Field/slider/control boundaries where shape is necessary. |
| `--color-accent` | `#1D4ED8` | Primary action and limited selection accents. |
| `--color-accent-hover` | `#1E40AF` | Primary-action hover/pressed feedback. |
| `--color-accent-subtle` | `#EFF6FF` | Selected turn row or active stage surface. |
| `--color-accent-border` | `#1D4ED8` | Selected-row marker and timeline handles. |
| `--color-recording` | `#B93832` | Record button/active recording, always with text/icon context. |
| `--color-danger` | `#B93832` | Delete/failure emphasis, never a generic primary action. |
| `--color-danger-subtle` | `#FBECE9` | Compact error panel background. |
| `--color-success` | `#236244` | Saved/completed indicator text/icon. |
| `--color-focus` | `#225CC5` | Keyboard focus ring; not a second brand accent. |
| `--color-media` | `#171817` | Letterboxing/media-stage background. |
| `--color-on-dark` | `#FFFFFF` | Media controls/captions; use an opaque dark caption backing. |
| `--color-overlay` | `rgb(32 33 36 / 48%)` | Modal scrim only; no backdrop blur. |

Use white text on blue primary buttons and dark text on subtle blue selected surfaces. On the dark media stage use explicit white controls. Decorative borders cannot be the sole outline of an input or timeline handle.

The former warm/yellow contrast calculations are superseded. Recalculate every affected token pair and rendered hover/focus/disabled/error state for this blue/gray proposal; no earlier contrast or visual acceptance transfers to these tokens. §8 requires computed and rendered contrast/focus checks.

### 2.3 Type, spacing, geometry

Use a system sans stack with Cyrillic coverage: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. No remote font download is required for mock mode. If a later brand font is selected, self-host it and test English/Russian; that is not an excuse to introduce another type family now.

| Role | Desktop / narrow viewport | Weight / line height |
|---|---|---|
| Landing heading | 48px / 34px | 650 or nearest supported weight / 1.1 |
| Page heading | 30px / 26px | 650 / 1.2 |
| Section heading | 20px / 20px | 600 / 1.3 |
| Recording dialogue | 28px / 24px | 500 / 1.4; allow longer Russian text to wrap |
| Body and input | 16px | 400 / 1.5 |
| Button | 15px | 600 / 1.2 |
| Supporting text | 14px | 400 / 1.4 |
| Compact timestamp | 13px | 500 / 1.4; tabular numerals |

Use rem-based equivalents, support text resizing, and never clip a required line to keep the hero small. Body copy is sentence case; avoid uppercase paragraphs. Use a monospace stack only for diagnostic IDs if exposed in a support detail, not the entire interface.

- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px. Use shared tokens.
- Radius: 4px tags/selection details; 6px controls; 10px panels; 12px dialogs. Only actual circular icon/record indicators are circles.
- Buttons/inputs: minimum 44px interactive height; 48px primary recording action. Icon-only buttons have a 44×44px hit area even with a 20px icon.
- Focus: 2px solid focus outline with 2px offset; visible on every keyboard-operable action, including video-adjacent controls. Account for high-contrast/forced-color behavior.
- Desktop content max-width 1280px, centered; outer padding 32px. Standard focused forms max-width 680px; long prose max-width 68 characters.
- Do not animate size/position of recording controls on hover. Use 100–150ms color/opacity transitions only where useful. No pulsing record glow, bouncing, celebratory confetti, or shimmer loading. Respect reduced motion.
- Use simple consistent 20px line icons with visible labels for important actions. No icon package is required/selected. Inline SVGs or a future installed set must share stroke/size conventions; never use emoji as functional icons.

## 3. Responsive shell and accessibility

Breakpoints are proposed layout rules, not user-agent/browser support guarantees:

- At 1024px and above, use a 64px top bar, 32px page padding, and a Prepare workspace split into flexible media/correction area plus a 360px turn list with 24px gap.
- From 640px to 1023px, use 24px page padding and stack panels where two readable columns do not fit. Avoid a collapsed desktop sidebar; this app does not need a permanent sidebar.
- Below 640px, use a 56px top bar and 16px page padding. Place video above turn list in Prepare; recording replaces the stage as described in §4.6. Keep important actions reachable without covering content.
- Provide English/Russian interface copy and a language switch across public/account/workspace/viewer/error states; typed service errors map to localized text. Signed-in top navigation exposes New dub, My projects, Credits and account. On narrow screens use a clearly labeled navigation menu; do not introduce unfamiliar icon-only routes.
- An action footer may be sticky in Record/Prepare but must reserve layout space, account for safe areas and the on-screen keyboard, and never cover focused fields, captions or the last list row.
- Project lists become single-column rows/cards on phones. Credit history becomes a labeled list rather than a horizontally scrolling table.
- Video uses its intrinsic aspect ratio with `contain` in a bounded stage; do not crop tall uploads into 16:9. Posters/empty-stage containers reserve space to prevent layout jumps.
- No document-wide horizontal overflow at 360px width. A timeline may pan inside its own labeled region with a non-drag alternative, without dragging the whole page.

Use semantic landmarks/headings, a skip link, real buttons/labels, focus-returning dialogs and announced async outcomes. Error messages identify the action and recovery; don't rely on color alone. Expose recording start/finish/failure as concise live announcements, not announcements every timer frame. Support keyboard use without global shortcuts intercepting typing or causing microphone capture on mere focus.

Although the selected visual interaction is dragging timeline edges, offer labeled start/end time inputs and keyboard adjustment as equivalent access paths. Do not turn that into a general split/merge editor. Long English/Russian captions must wrap; timestamps remain readable.

Text contrast target: at least 4.5:1 for ordinary text, 3:1 for qualifying large text; important control boundaries/indicators require adequate non-text contrast. Follow [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) and [visible focus guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html). Automated checks alone do not prove accessibility.

## 4. Screen and interaction specification

Proposed URLs below make deep-link/state handling concrete. They are frontend routes, not backend endpoints. Direct navigation/reload must work under the selected static hosting configuration; missing identity/media gets an honest recovery screen.

### 4.1 Landing `/` and sign-in `/sign-in`

Landing: compact wordmark/header, one descriptive heading ('Dub a scene in your own voice'), short explanation, one Start dubbing action, and a playable permitted example alongside/below it. Follow with three plain steps (Upload, Record, Watch/share), trial/credit explanation and a restrained footer. No gradient hero, meaningless AI badges, invented customer counts, five competing CTAs, or auto-playing sound.

Sign-in: focused Google and email/password entry, registration verification, resend/recovery messages, password-reset email and explicit ownership-verified method linking. Registration cannot complete before email verification. Account settings include confirmed deletion with project/link consequences; disable access/links and remove projects/recordings through services. Mock simulates these states with test identities and labeled demo entry; never collect real passwords or send email/provider requests. Successful entry goes to New dub unless resuming a protected destination.

### 4.2 New dub `/app/new`

Page heading plus a wide file selection panel. Offer a native picker as well as drag/drop. State original upload limits (10 minutes/250 MB, MP4/MOV/WebM), the two-minute selected-section limit, mixed EN/RU preparation, project allowance and credit balance using configuration, not duplicated hardcoded copy. File selection, inspecting, selected, invalid, insufficient-credit, capacity-full and service-failure states are distinct.

After inspection, display name, original duration and preview. Provide an in-app section selector for longer sources, enforcing <=120 seconds before preparation. Show selected start/end/duration and exact service quote `ceil(selected seconds)` at one credit/second. Section selection is distinct from individual turn correction; preserve selection through checkout and bind it to the quote/project timeline. Primary action: Prepare video, with price and resulting balance nearby. Include the retry allowance explanation. No paid work starts from selecting a file or buying a pack. If short on credits, Buy credits preserves the selected source and returns to a fresh/valid quote; a changed quote requires confirmation. A full project allowance links to My projects rather than deleting anything automatically.

Mock custom upload is real local file selection/inspection/preview, but not real transcription. Before simulated preparation, state 'Demo processing uses a prepared sample; your video is not transcribed.' Offer a deterministic sample route for the full demonstration. Do not overlay fixture dialogue on an unrelated uploaded file or claim a realistic final dub was rendered from it (§7).

### 4.3 Processing `/app/projects/:projectId/processing`

Keep source title, concise current phase, progress and the relevant credit reservation/charge state. Show real stage information from services: queued, preparing dialogue, preparing background, validating preview, ready, or recoverable failure. Display numeric percentages only when supplied/measurable; otherwise show a static stage list and textual activity, without fake precision.

Offer Cancel with a service-authoritative cost and confirmation: queued free, running charges completed stages only. Included-retry cancellation after start consumes its allowance; queued cancellation does not. Allow project deletion with successful-processing-charge warning; deletion is not cancellation. Preserve previous usable preparation on failure. Allow navigating to My projects while work is pending; page disappearance is not cancellation. On ready, offer Open preview and route to Prepare; whether to auto-open that stage is a design detail to settle, not simulated permission to autoplay sound. On failure, show a useful explanation and the actual credit outcome; do not promise a refund before services confirms it. Retry uses the existing operation identity for an ambiguous transport outcome and a new attempt only for an explicitly authorized new preparation.

### 4.4 Prepare `/app/projects/:projectId/prepare`

Header: project title, saved/pending status and compact Prepare/Record/Result progression. The turn list remains separate from the correction form; rows show speaker label, excerpt/sound caption, source range, and selected/recorded status without decorative mini-cards.

Main area: full source playback and subtitles; highlight all currently active rows, including simultaneous voices. Selecting a row seeks to its range and opens its editor. Keep playback-highlight state separate from the user's selected editor row, so playback doesn't steal focus or overwrite an edit. Auto-scroll following pauses when the user scrolls/edits; offer Follow playback to resume.

Provide explicitly labeled Original and Processed background audio modes with synchronized playback position. Background audition is not a new credit action. Show a short quality note and let the user proceed if acceptable. Unknown/full failure of background processing is not a fake successful sample in real mode.

Editor: speaker selector, transcript/caption field, timeline with two handles, start/end inputs, Save/Cancel and Add missed line. Validate range and source bounds; corrections are visibly pending until saved. For overlap show speaker/lane context and active subtitles separately; don't merge simultaneous lines merely for display. Pending edits cannot silently disappear when switching turn/route.

Process again follows the service-authoritative permanent lock after the first successfully saved take, not capture start. Failed first attempts do not lock; deleting takes never unlocks. Explain one included retry per project; later paid runs use normal quote without renewing it. Warn before starting that successful reprocessing replaces all lines/manual edits/additions; require confirmation. Failure retains the old usable preparation. Start dubbing respects readiness/pending edits; no general split/merge controls.

D13 is resolved to reset-on-success after advance confirmation. Carry expected preparation/edit revision with consent. A concurrent edit cannot be silently discarded; service returns conflict/reconfirmation as needed. Mock and real facade share this contract; unset policy remains an error test, not the default product behavior.

### 4.5 Record before/after a take `/app/projects/:projectId/record?turn=:turnId`

Keep project navigation compact. Show turn position, speaker, dialogue or sound caption, window duration, original clip audition, current saved take status and Record. Other turns can be accessed through a labeled list; normal progression uses Next.

Prior audition is optional. Original video is visible for audition before recording, with sound started by user action. No score, waveform decoration, pitch meter, countdown or time-stretch affordance. Permission/readiness errors explain why capture cannot start without marking anything recorded.

After a completed take, remain on the same turn. Show Play my take, Retry, Next and explicit saving/failure state. Play my take displays video with one background, saved takes for recorded characters and original voices for unrecorded characters. Replacing overlapping A must preserve original B until B is recorded; user may audition imperfect isolation and continue. Show no claim of proven clean separation. Final export requires all turns recorded and retains no intentional original dialogue. Successful save may update a small Saved status; do not auto-play, auto-next or trigger confetti. Retry does not delete the old saved take up front. One current take is shown, not a history carousel.

Play my take resolves only the durable current saved take. With saved take A and replacement B saving or failed, it continues to play A and shows 'Previously saved take; replacement saving' or 'Previously saved take; replacement failed' alongside the action. With no saved take, disable the action and explain that saving has not completed or failed. Use a separately labeled attempt-review action for recoverable uncommitted audio; do not mislabel it as saved B. After B commits, the next explicit playback uses B; an already playing A is not switched automatically. Starting Record/Retry stops take playback before playing the original reference. This is an identity/status clarification, not a multi-take feature.

Text/speaker-label edits preserve takes; timing edits mark the old take incompatible and require replacement before export. Require a valid saved take for every turn; Next navigation alone never marks a turn recorded. Show actionable missing/re-record reasons. Shorter saved performances are valid. Zero-turn export remains an explicit unresolved service capability, not an invented frontend rule.

### 4.6 Active recording presentation

When ready and the user presses Record, start without a user-visible countdown; replace/hide the video and remove its controls from keyboard/assistive interaction for the active take. Keep the text visible in a quiet white recording stage of comparable reserved size, with speaker, 'Recording', a red dot, elapsed/total duration and a simple progress bar.

Original audio continues as reference with independent adjustable volume while the microphone captures. Show early Stop: the fixed window is a maximum, not a minimum. A user may save one or two seconds in a four-second window; the remainder has no voice for that character. Auto-stop at window end including margins within measured tolerance. Progress reflects actual capture/media state, not an unrelated CSS animation.

Do not use red blinking, simulated sound-reactive bars, a camera preview or a countdown. Hide unrelated editing actions while capture is active. If navigation would interrupt capture, require an explicit discard/cancel decision; an interrupted candidate must not automatically replace the saved take; retain recoverable media for separate audition and explicit shorter-take acceptance/retry. This protection is a proposed interaction, not an extra project approval gate.

On an ordinary early/automatic stop, show Saving while media persists, retaining the old take until compatible commit. For an interruption, retain recoverable audio for separate attempt review and acceptance/retry; never label missing/corrupt media saved. Exact recovery controls/storage require design and testing. Failure preserves prior take. Device interruption releases resources and reports actual recoverability. Play my take remains the durable saved target until replacement commits.

### 4.7 Result `/app/projects/:projectId/result`

Prioritize the full video and a concise result state: rendering, finished/current, changes not yet rendered, rendering failed, or unavailable. Download and Share refer to a finished asset, not raw source or a placeholder blob renamed as a rendered export. Provide Re-record a line and a turn chooser. Export is blocked until all turns have compatible saved takes. Output is the full selected section as MP4 up to 720p, orientation preserved/no upscaling, without added subtitles.

Keep credit-purchase UI out of the main result action area unless an actual applicable service policy requires it. A new finished version updates the same share link according to service generation semantics; a pending/failed replacement is not announced as shared successfully. Mock rendering must say 'Demo render' and specify whether output is a prepared sample or a real locally mixed preview.

### 4.8 My projects `/app/projects`

Use a readable list/grid with thumbnail, title, saved stage, turn progress, latest activity, Continue/View result and an overflow menu. Never invent percentage completion for unknown turn counts. Display slots used/available and the first-purchase upgrade explanation when relevant. Empty state has New dub, not fake projects presented as user work.

Delete opens a compact dialog naming the project and stating that its shared link will stop working. Delete/Cancel are explicit; red is reserved for the destructive confirmation. During deletion suppress duplicate submissions, keep status honest, and render service failure without prematurely removing access indicators. Reload must reflect the actual persisted deletion/tombstone.

### 4.9 Credits `/app/credits`

Show available/reserved balances with labels, included trial usage and project allowance separately. Offer a small selection of one-time packs, amount/price and non-expiry copy from policy. Show 120 one-time welcome credits, 1 credit/second rounded up once, 2 free slots/10 after first successful purchase, and non-expiry for both free and purchased balances. USD pack amounts/prices await measurements; label any demo offers provisional. No subscription tabs, monthly toggle, crossed-out fabricated discounts or 'most popular' claims without evidence.

History distinguishes granted, purchased, reserved, spent and returned operations without double-counting reservations as spending. Buy is explicit. Pending purchase is not a credited balance; successful service-confirmed purchase updates once and permanently upgrades slots under policy. Mock checkout is labeled Simulate purchase and never requests card details. Repeated/ambiguous responses reconcile rather than grant again.

### 4.10 Public share `/s/:token`

Minimal viewer: project/result title if permitted, finished video and a restrained Try dubbing link. No account chrome, owner edits, source/takes/credit history, gallery or public project enumeration. Unavailable/deleted/unknown link shows a plain unavailable message, not private deletion/account details. Owner sharing controls disable/re-enable the same link. During render/failure retain the previous finished target; switch only after a new eligible finish. Update the viewer only from the resolved public share contract.

## 5. Shared components and state behavior

| Component | Required states / contract |
|---|---|
| Primary/secondary/destructive button | Rest, hover, visible focus, pending, disabled with reason nearby; pending preserves width/label context; no repeated action. |
| Field/select | Persistent label, help, invalid message association, disabled/read-only distinction; 16px input text on phones. |
| Turn row | Default, selected editor, currently playing, recording target, saved, unsaved/error; use icons/text/borders in addition to color. |
| Media player | Not ready, paused, playing, seeking, failed, blocked playback; actual aspect ratio and source identity. |
| Timeline | Actual positions, bounded independent handles, keyboard/time inputs, invalid/stale/pending edits and overlap context. |
| Status/banner | Specific operation state and recovery; persistent important errors inline, not only short-lived toast. |
| Dialog | Accessible name/description, focus containment/return, Escape for safe cancellation, explicit destructive action. |
| Loading/empty/error region | Stable reserved space where useful, static placeholders, honest no-data state, recoverable errors; no infinite spinner hiding failure. |
| Mode notice | Compact persistent Demo mode indicator and clearly labeled simulated activities; not embedded as implementation jargon in normal real-mode user flows. |

App state distinguishes server/service-owned data, user draft edits and ephemeral playback/capture state. Do not keep a second independent authoritative project/balance store in each screen. UI mutation success is based on the service response/current operation state; optimistic display is allowed only with safe rollback and explicit pending state, never for a payment grant, irreversible deletion or take replacement.

Use React for rendering and Zustand for shared frontend application state. Zustand actions and feature hooks consume the same public services facade as other UI orchestration; they cannot create HTTP/SDK/persistence bypasses. Backend-owned data remains service-authoritative even if a Zustand store caches it for display. Local component state or device adapters can retain ephemeral state/media handles as appropriate; this decision does not require storing every render detail or browser media object in a global persisted store.

## 6. Central services layer

### 6.1 Import and transport boundary

All backend interactions live under one `src/services/` boundary: authentication/session, policy, projects, source upload, preparation, turns, recording permits/commit, media asset resolution, credits/checkout, exports, sharing and deletion. This includes HTTP, SDK calls, signed-upload transfers, server-event/WebSocket connections, background polling and download-URL acquisition.

Screens/components and feature hooks consume a stable typed facade such as `AppServices`; they must not call `fetch`, XMLHttpRequest, transport/SDK clients, backend URLs or browser data persistence directly. UI query hooks may orchestrate facade calls but cannot create a transport bypass. Implementations are imported only at the composition root and services internals, not throughout features.

Proposed module responsibilities:

```text
src/services/
  contracts/       shared request/result/error/domain types
  index            public facade types and startup-selected instance
  createServices  composition/factory; one mode decision
  http/           future real API/SDK/media-transfer implementation
  mock/           same facade, deterministic fixtures/jobs/local persistence
src/device/       microphone/playback/files/clipboard browser adapters
src/styles/       tokens and shared styles
src/features/     screens and feature-level UI orchestration
```

This is not a requirement for one file/class per method or a separate backend microservice. Keep the contract small enough to implement; split adapter files by responsibility as needed. The eventual real adapter can remain unimplemented until backend integration; selecting it without configuration must fail clearly instead of silently falling back to demo data.

Media element `src` requests are an explicit exception to 'all network I/O in a JS transport': native video/audio/images may load only service-resolved assets or bundled same-origin resources. Acquisition/auth/expiry of backend media URLs and uploads remains in services. No raw user/provider URL construction in components; no arbitrary remote fonts, analytics or media calls in default mock mode.

Browser permission/capture/playback/clipboard/local picker actions are device operations, not backend calls. Keep them behind injectable device adapters for testability; actual persistence of project/media is the service adapter's responsibility. A device adapter may not secretly make API calls. Blob URL allocation/revocation and media handle lifetimes belong to the media/device helper, not a dozen route components.

### 6.2 Facade operations and authority

Names below are proposed signatures/responsibilities, not actual HTTP endpoints. Grouped methods share the same typed contracts between mock and future real implementations.

| Group | Operations / results required |
|---|---|
| `session` | Read session, Google/password entry, registration/verification, password reset, explicit verified linking, sign-out and confirmed account disable/delete; mock simulates all without real credentials/email. |
| `policy` | Read limits, supported media, credit offers and capabilities with revision and demo/production provenance. |
| `projects` | List/get/create/delete/resume; stable ID, owner, revision, lifecycle, capacity and progress. |
| `sources` | Inspect/upload/select/resolve source; original duration and <=120-second selection/offset, validated media/readiness/policy and slot lifecycle. |
| `preparation` | Quote/start/retry/read/cancel and activate; source/policy/operation revisions, one-retry-per-project state, reset warning/consent/edit revision, completed stages and cancellation quote/disposition; permanent first-save lock. |
| `turns` | List/update/add missed turn; expected revision, timing/text/speaker, saved revision and take-compatibility disposition. |
| `recordings` | Begin authorized turn capture/permit, save candidate/commit/read take; lock/window revision, durable media and safe current-take association; recover interrupted operations. |
| `media` | Resolve playable source/background/take/preview/download assets and their kind, generation, expiry and provenance. |
| `credits` | Read available/reserved/history/offers, begin checkout, reconcile purchase; verified operation/entitlement result, no optimistic client grant. |
| `exports` | Request/read export for frozen inputs; pending/failed/finished/current/stale state and actual output identity. |
| `sharing` | Create/read/enable/disable owner link and resolve public token; stable token, availability and latest eligible finished generation; retain prior target during render/failure. |

Apply SPEC-001 revision 0.5 confirmed lock, edit-compatibility, export-completeness, sharing and account policies through services; expose allowed/reasonCode/policyRevision instead of duplicating authority in UI. Remaining open policies (e.g. zero-turn export, cancellation stage pricing and balance treatment on account deletion) require explicit unavailable/reason states where dependent, not guessed defaults.

### 6.3 Request/result shape

Every mutation has a caller-generated stable operation ID, target identity, expected revision where needed, and explicit user intent. Quotes additionally bind source/duration/policy/cost. Retrying after transport uncertainty reuses the operation identity; a newly authorized preparation is a different operation. The adapter enforces deduplication and conflicts.

Use one consistent typed success/failure convention with domain errors: unauthenticated, forbidden/not found, invalid media/range, insufficient credits, capacity exceeded, stale revision, policy unset, recording locked, permission/capture error where translated, operation pending, retryable transport error and permanent failure. Include actionable but safe field details and authoritative state/version when appropriate. Do not leak provider stacks/tokens or swallow an error into an empty successful list.

UI labels are mapped from typed codes; do not parse provider English messages to infer payment, retry eligibility or deletion. A failed request and a pending operation are different results. Failure can include an existing operation ID so the UI can reconcile instead of starting work again.

Subscriptions/polling have cleanup/cancellation at route/session teardown. Canceling a UI subscription only stops observation; it is not proof of backend job cancellation. Abortable reads never trigger an unintended mutation. A stale read from the previous account/project cannot populate a newer screen.

## 7. Backend-free mock implementation contract

### 7.1 What 'whole app runs' means

The future implementation must launch by default with mock services and no backend process, credentials, AI downloads, payment provider or remote API. Every route in §4 must have a reachable working state and defined failure/empty state. Real browser file inspection, playback and permitted microphone capture work locally; AI preparation, server authorization, payments and server rendering are simulated.

This is a complete navigable frontend demonstration, not proof that arbitrary uploaded content can be transcribed, separated or rendered offline by the chosen AI. State this limitation in developer documentation and inline at affected demo actions. Do not simply replace all media operations with success toasts.

For repeatable end-to-end dubbing, ship a small permitted/synthetic local video with matching original audio, separate background and annotated original-speaker preview stems, annotated turns/speakers including overlap/nonverbal sound, and a finished fixture result. It must actually play. Include English and Russian fixture content. No movie/game assets scraped or assumed licensed, and no downloaded remote media is required to use mock mode.

Custom upload can validate and preview the user's real file locally. Since mock AI cannot infer arbitrary content, the processing action must offer switching to the prepared sample with a clear identity change; do not attach sample subtitles/speaker timings to the unrelated upload. It is acceptable to expose custom-source preparation as unavailable in demo mode with an actionable Use sample option. This explicit limitation, not fake processing, satisfies the backend-free frontend scope.

### 7.2 Capture, preview and export honesty

In the interactive mock journey, record actual microphone data when permission is granted. Save blobs through mock services, restore them after reload, and provide an actual local take/video/background preview at the intended positions using the device/media adapter. Test-mode audio fixtures can replace capture, but a simulated take must be visibly identified and never described as the user's real voice.

A mocked export job can deliver the bundled finished sample so download/share/result screens are exercisable. Label it 'Prepared demo output; not rendered from your takes'. If local rendering is implemented later, label output accurately and test it; no particular client encoder or arbitrary-file rendering dependency is selected here. A preview mixing actual takes is not evidence that a downloadable video contains those takes.

Mock share tokens work within the same demo origin/browser storage. Reload/direct public-route viewing in that browser must work without a demo session. Opening on another device/private browser has no shared local database; show a clear demo availability limit, not a claim of actual globally hosted sharing. An owner simulator can enforce permission errors for UI tests but is not a security boundary against the browser owner.

### 7.3 Mock state and persistence

Use one mock adapter with the same facade. Persist project records and media blobs using a single browser-backed repository (IndexedDB or equivalent suitable for blobs) owned by `services/mock`; do not write project state to localStorage from components. Session/mode settings may use adapter-owned appropriate storage. Never persist temporary blob URLs as durable media references; persist stable asset IDs/blobs and recreate/revoke URLs as needed.

Persist operation IDs, job stage, revisions, current-take association, demo ledger/entitlements, exports, link targets and deletion tombstones. On reload, reconcile pending mock jobs once rather than restarting/granting/charging again. Use a deterministic clock/seed for tests; no `Math.random` failures or uncontrolled sleeps. Quota/storage unavailability is a typed recoverable error and must not masquerade as saved success.

Expose a developer-only reset/seed control or programmatic fixture loader, not production product navigation. Reset clears owned demo stores/assets and grants exactly the selected fixture state. It must not remove unrelated origin/application data. Stop live capture/subscriptions before resetting. Each test gets an isolated seed/storage namespace.

### 7.4 Scenarios and policy fixtures

Provide named deterministic scenarios through adapter configuration, not `if mock` branches in features:

- New eligible account with trial, empty projects.
- Partially recorded resumable project and a finished shareable project.
- Insufficient credits and full project allowance.
- Queued/slow/failed/partial preparation, included retry, stale quote and expired session.
- Overlapping EN/RU turns, long speech, nonverbal sound, missed line and corrected boundary.
- Permission-denied/interrupted capture, failed candidate save, stale edit/commit.
- Pending/failed/successful/replayed simulated purchase and repeated balance/history requests.
- Out-of-order/failed export and latest-finished share target; deletion during pending work.
- Missing/deleted public token, storage quota failure and unavailable media.

Keep policy configuration centralized: 1 credit/second rounded up, 120 welcome credits and 2/10 slots are confirmed. Only unselected cash offers/stage weights are provisional demo data. No real payment is required for mock checkout. Seed states must respect confirmed capacity/balance.

Use the confirmed SPEC-001 revision 0.5 policies in the default mock profile: 120 welcome credits, ceil(section seconds), 2/10 slots, one included retry/project, first-successful-save permanent lock, timing invalidation, full-turn export and confirmed-reset reprocessing. Keep only unselected cash packs/stage weights and unresolved technical limits provisional and labeled. Fixtures must exercise reset confirmation/decline/failure/stale consent, cancellation and permanent lock. A policy-unset error fixture tests defensive handling without reopening agreed product behavior.

### 7.5 Adapter substitution

Select mock versus real services once at startup using configuration/dependency injection. No route or component imports adapter internals, checks the mode to invent behavior, or falls back from failed real API calls to mock success. A read-only service capability may drive a Demo banner/unsupported-demo action, but state transitions still come from facade results.

The typed facade defines the domain types, error semantics, mutation identity/revision behavior, media provenance and capabilities that any adapter must satisfy. Present frontend delivery requires the conforming mock, single-point substitution and explicit failure for unimplemented/unconfigured real mode; it does not require an executable real adapter. Keep tests parameterized at the facade boundary. A future real adapter must pass the applicable shared contract suite and real integration checks at the later backend-integration gate, without changing screen behavior. Mock success does not prove real authorization, payments, AI or distributed consistency.

## 8. Test specification

Tests are a required future implementation deliverable. React and Zustand are selected; choose their build/test toolchain separately before implementation. This document does not invent installed commands or freeze unverified framework APIs. Require scripts covering static/type checks, unit/service contracts, UI integration, browser journeys and production build once they exist.

### 8.1 Architecture tests

- Inspect application source import/call boundaries (AST/lint/module rules, not a token grep alone) to reject backend transport/SDK creation, network calls, persistence access or adapter-internal imports outside allowed modules. Cover aliases/dynamic imports/query hooks and the explicit native-media/device exceptions.
- Assert exactly one startup adapter selection; real errors never trigger silent mock fallback.
- Run the complete mock browser journey with outbound networking denied except the local app's bundled assets and valid service-resolved local media. Fail on unintended remote API/font/payment/analytics calls; allow necessary same-origin module/style loads.
- Verify one source of UI tokens and absence of gradient/blur/glow/shimmer rules in app styles and visual states; fixture video pixels are not UI CSS.

### 8.2 Facade/mock contract tests

| ID | Test | Required outcome |
|---|---|---|
| T01 | Quote/attempt replay, parallel spending, failed attempt and include-retry consumption under selected demo profile | No duplicate grant/charge/reservation; policy-profile result is explicit and reconciles history/balance. |
| T02 | Fake checkout pending/failure/success/duplicate/out-of-order delivery | Only simulated verified success credits once and upgrades slots once; buying does not start processing. |
| T03 | Invalid/bounded timing, overlap, add missed line, stale revision | Valid corrections persist; invalid/stale input cannot overwrite a newer preparation/take. |
| T04 | Record lock with simultaneous preparation/start and reload; successful reprocessing after saved corrections/manual addition; accept/decline disposition, concurrent edit and unset policy | Apply confirmed permanent first-successful-save lock and advance-confirmed reset-on-success. Decline/failure/stale consent preserves edits; unset-policy error fixtures do not substitute a default. |
| T05 | Failed/interrupted/stale candidate then successful replacement, with and without an existing saved take; playback while saving/failed/committed | Prior take preserved until durable compatible commit; playback stays on the labeled saved take or is disabled when absent; after commit the next playback uses the sole new current take without interrupting playback or auto-starting. |
| T06 | Reload persisted records/blobs, pending jobs, quota failure and reset | Real saved state restores; no persisted object-URL dependency, repeated grants or fake save success. |
| T07 | Old/new exports complete in reverse order; delete during a job | Old/stale completion cannot replace newer share generation or revive deleted project/link. |
| T08 | Public/non-owner reads and missing assets | Return only allowed fixture result metadata/assets or typed unavailable error; no raw source/take/billing exposure through facade. |
| T09 | Mock arbitrary upload versus sample preparation | Custom source preview stays honest; fixture preparation switches identity explicitly; rendered sample is not claimed to contain user takes. |
| T10 | Facade error/abort/subscription contract | Pending, transport failure and permanent failure differ; observers stop on disposal and stale account responses cannot win. |

Assertions test externally visible outcomes/invariants, not that a mock method calls its own helper. Share the contract suite with a future real adapter where applicable; real provider/media integration requires additional evidence.

### 8.3 Component and screen integration tests

- File-picker validation, selected file details, quoted balance, capacity-full and purchase return; no preparation on file selection.
- Full-video subtitle/list synchronization, simultaneous active lines, selected-editor focus retained, follow-playback pause, keyboard/time-input correction and visible validation.
- Source/background audition, media not ready/failure, long Russian text and meaningful empty states.
- Press Record with injected ready capture: no countdown, video inaccessible/hidden, target text visible, original reference plays, actual progress/auto-stop uses the window; playback restoration occurs only afterward.
- Save failure keeps prior take; success remains on the turn; Play my take/Retry/Next are explicit and do not auto-fire.
- During replacement saving/failure, Play my take targets the labeled previous saved asset or is disabled when absent. Commit changes the next playback target, never an active playback or an automatic replay. A new recording stops saved-take playback before original reference starts.
- Successful AI retry after corrected text/speaker/timing and an added turn exposes its named D13 disposition/confirmation; decline, unset policy and concurrent edits preserve the active preparation. UI cannot substitute its own merge/reset rule.
- Pending edits/active capture navigation, permission denial, expired identity, stale revision and quota errors all show actionable state without lying about persistence.
- Result update/download/share correspond to finished provenance; mock output label and missing/deleted link state are visible.
- Credits history is readable and accounts for available/reserved amounts correctly; pack checkout is labeled simulated in mock mode, no card collection.
- Delete confirmation warns about link invalidation, focus returns appropriately, canceled/failed deletion preserves the project.

Use a deterministic injected device/clock in fast tests. Separate those proofs from actual browser capture/media testing. Do not replace every service call in a UI test with a hardcoded happy response if the integration being tested is the mock-adapter journey.

### 8.4 Browser end-to-end tests

| ID | Journey / environment | Expected evidence |
|---|---|---|
| E01 | Fresh mock session -> demo sign-in -> sample upload/quote -> prepare -> subtitle/background review -> correction/add missed line -> record -> retry -> next -> fixture result/download/share | All screens work with no real backend/external API, valid playable local assets, correct simulation labels and ledger/slot state. |
| E02 | Close/reload with current takes and pending save/job; then resume; review a saving/failed/successful replacement | Durable blobs/progress restore; pending outcome reconciles; failed take never replaces old take, playback identity/label remain correct and no saved-take playback is enabled when absent. |
| E03 | Insufficient credits -> simulate purchase -> return -> explicitly prepare; full-slot deletion | No hidden start, duplicate grant or forced deletion; exact configured balance/allowance. |
| E04 | Re-record/update export with out-of-order responses -> same public link -> delete -> late completion | Latest eligible finished output or prior playable result as profile dictates; no resurrection after deletion. |
| E05 | Network-isolated mock execution and direct public/private route reload | No backend calls; local asset/player paths work; same-browser mock share limitation is explicit. |
| E06 | Desktop and phone layouts, keyboard-only flow, long EN/RU captions, 200% zoom, reduced motion, high-contrast check | No page overflow/hidden actions; usable focus/labels/timeline equivalents and readable dialogue. |
| E07 | Browser capture with deterministic audio-device input where supported; separately actual phone/desktop microphone and reference playback | Real permissions/readiness/start/stop/save/playback are exercised; manual acoustic/sync measurements remain distinct from fake-device passes. |

Assert actual download bytes/type/provenance and playback availability, not only success messages. Use local synthetic permitted audio/video; test mode must not require a live payment, AI service, private movie asset or external network.

### 8.5 Follow-up contract regression scenarios

- Test 12.4-second/120-second quotes as 13/120, one 120-credit grant, 2/10 slots, non-expiry and no retry replenishment after further paid runs.
- Test validated 10-minute/250 MB originals, <=120-second section selection and selected-offset mapping; boundary codecs/bytes remain evidence targets, not assumed supported.
- Test delivered/no-turn success charging versus required-background/system failure, queued/running cancellation and completed-stage quote confirmation. Stage weights remain labeled test data until measured policy is adopted.
- Test first failed capture/save versus first successful take commit; permanent lock survives deletion of all takes. Confirmed reset replaces manual additions only on successful revision-safe activation.
- Test early Stop, recoverable interruption audition, failed save and accepted shorter take; no premature old-take replacement. Test text/label preservation versus timing invalidation and all-turn export guards.
- Test overlapping A saved/B original, then both saved; imperfect-isolation review is user-controlled. Final result has all saved takes and no intentional original voice or added subtitles.
- Test Google/password verification/reset/linking/deletion simulations, no duplicate grant/account, EN/RU switch, same-token sharing off/on, prior finished output on failed render and no inactivity expiry. Real providers/deletion/security require later integrated proof.
- Actual desktop Chrome/Edge/Firefox/Safari, Android Chrome and iPhone Safari capture/playback need recorded device/version evidence. Automated emulation does not establish physical browser support.

### 8.6 Visual and accessibility checks

Capture stable baselines for Landing, New dub quote/error, Prepare with overlap/corrections, active Recording, completed Result, Credits, My projects and delete dialog. Target representative 360×800 and 390×844 phones, 768×1024 tablet and 1440×900 desktop; these are visual test viewports, not a production support matrix.

Freeze fixture data/time, wait for fonts/assets/appropriate media frame, and disable nonessential transition variation before screenshots. A baseline is accepted by human inspection first; do not bless the initial render automatically. Check flat palette, spacing/type hierarchy, recorded-video hiding, absence of decorative effects and no layout shift of primary controls.

Automated accessibility checks plus manual focus/keyboard/zoom/media-caption checks are required. Verify actual computed foreground/background states and interactive boundaries, not token definitions alone. Avoid snapshotting an entire DOM as the only proof of a usable workflow.

## 9. Frontend acceptance and traceability

All criteria below are future checks, not passing tests at specification time.

| ID | Acceptance | Source / verification |
|---|---|---|
| FE-AC-01 | Flat visual tokens, typography and components are used consistently with no gradients/blur/glow/decorative fake activity; rendered supported states pass contrast/focus checks. | Current design request; §8.1/§8.6/E06. |
| FE-AC-02 | All §4 routes and empty/pending/error states are navigable on phone/desktop without obscured controls or page overflow, including direct reload. | SPEC-001 AC-01/AC-13; E01/E02/E05/E06. |
| FE-AC-03 | Prepare supports full subtitle/list playback, overlapping active lines, text/speaker/time correction and missed-line addition with stable focus. Successful reprocessing applies the service-provided D13 disposition/confirmation; unset or stale policy cannot silently discard/merge manual work. | SPEC-001 AC-03–AC-07; T03/T04, component tests/E01. |
| FE-AC-04 | Record starts without countdown, hides video during capture, retains target text/reference audio, fixed auto-stop and explicit review/retry/next. Safe durable replacement survives failure/reload; Play my take targets the labeled durable saved take during replacement or is disabled if absent, and changes only for the next explicit playback after commit. | SPEC-001 AC-08–AC-10; T05/T06/E02/E07. |
| FE-AC-05 | Finished result/download/share/deletion show correct media provenance/generation and no partial/stale/private result; incomplete-policy cases are explicit. | SPEC-001 AC-11/AC-12/AC-15–AC-17; T07–T09/E04. |
| FE-AC-06 | Credits/slots display service-authoritative quotes, reservation states and one-time purchases; no duplicate grant or unrequested processing. Demo numbers are isolated and labeled. | SPEC-001 AC-14/AC-18–AC-22; T01/T02/E03. |
| FE-AC-07 | Every backend interaction is through the public services boundary; no transport/persistence or adapter-mode behavior leaks into features. | Current user architecture request; architecture tests/T10. |
| FE-AC-08 | The complete mock app runs without a backend, external APIs or credentials; fixtures actually play, captures persist, all routes are usable and simulated/custom-upload/export/share limitations are honest. | Current user mock request; T06/T09/E01/E02/E05. |
| FE-AC-09 | Current frontend delivery provides one typed facade, a conforming executable mock and single-point adapter selection; unimplemented/unconfigured real mode fails explicitly without fallback. An executable real adapter is not required for this gate. Its applicable shared contract tests and actual integration checks are required only at the later backend-integration gate. | Services request; present mock contract/architecture tests; deferred real integration evidence. |
| FE-AC-10 | Automated tests cover substantive happy/failure/recovery paths and visual/accessibility checks include actual browser evidence; no mock pass is misreported as real AI/payment/security/export proof. | Current test request; §8 suites/evidence boundaries. |

The frontend scope extends SPEC-001's proposed logical architecture with a concrete centralized service/mock contract. It does not change BR product behavior, approve prices or close its pending decisions.

## 10. Open decisions, delivery, and task index

### 10.1 Decisions

| Item | Draft disposition / blocker |
|---|---|
| Palette/type/layout approval | Concrete proposals in §§2–4. Owner selected neutral white/gray/blue with red recording/error controls and no gradients. Exact revised hex/layout proposals still require rendered review. |
| Frontend framework/state/build/router/test runner | React and Zustand selected by the owner, 2026-10-20, consistent with SPEC-001 §6.1. Versions, component library, build tool, router and test runner remain unselected; verify current docs when implementing. |
| SPEC-001 D01–D13 | Still apply; mock profile numbers/policies cannot close production decisions or establish real feasibility. Revision 0.5 resolves D04–D06/D13 product policy and narrows other decisions; mock examples cannot change confirmed answers. |
| Mock versus real media expectations | Default mock uses prepared assets with honest labels; real capture/local preview is distinct from fixture download and same-browser share simulation. Backend-free arbitrary AI/export/global sharing are not promised. |
| UI language | EN/RU media and Cyrillic layout tested; English/Russian UI and a language switch are confirmed; all user-facing flow and error copy needs both languages. |
| Real backend URLs/provider choices | Not allocated. Implement typed facade first; future transport integration stays within services. |

### 10.2 Delivery and verification status

The frontend planning deliverables are this specification and the relevant unpublished project task drafts. They create no frontend source, services adapter, fixture assets, executable test files, build commands, paid resources or deployment. All executable tests in §8 remain not run. The token-pair arithmetic was checked while drafting; it is not rendered UI/accessibility acceptance. Revision 0.5 synchronizes the owner follow-up brainstorm. Earlier independent task/package reviews remain historical and do not cover this changed baseline. No new independent review or product tests are claimed.

Future implementation completion requires a documented one-command local mock start, reproducible fixture reset, architecture/contract/UI/browser tests and production build appropriate to the selected stack, plus visual review at the stated widths. Document actual commands after the tools exist. No test gate may be replaced by a 'tests added' claim without execution evidence.

GPT-6.1 Sol High independently reviewed SPEC-001/002 revision 0.1; the [joint review and correction record](SPEC-001_002_review.md) preserves the findings and scoped revision 0.2 changes. The same reviewer confirmed all three document findings closed in a targeted revision 0.2 recheck. D13 was open at that historical review and was resolved by the later brainstorm; owner approval and whole-project readiness are not inferred. Use [spec-task-review](../../.agents/skills/spec-task-review/SKILL.md) for affected changes before task decomposition, and package-review connected drafts before execution. No additional implementation-reviewer ceremony is introduced.

Revision 0.3 records the owner's React/Zustand frontend selection and aligns state/service boundaries with SPEC-001's FastAPI/PostgreSQL/SQLAlchemy backend direction. The earlier independent recheck does not cover this later stack update. No code, package installation or executable tests were added.

### 10.3 Task index

The subsequent user-authorized project decomposition created individual [task drafts and a proposed order](../task-drafts/SPEC-001/README.md), not application code or GitHub issues. The relevant frontend/mock and later real-adapter/integration entries are below. Each file owns its full scope/AC/dependencies; no task body or live backlog is duplicated here. All are drafts, not automatically ready.

| Task title | Intended outcome | Individual draft / issue |
|---|---|---|
| Run a tested React and Zustand frontend in an isolated mock configuration | Runnable tested frontend bootstrap | [Draft](../task-drafts/SPEC-001/frontend_runtime.md) |
| Freeze the frontend facade and enforce its transport boundary | One enforceable typed service boundary | [Draft](../task-drafts/SPEC-001/frontend_service_contract.md) |
| Provide playable, annotated and permitted dubbing fixtures | Playable permitted annotated demo assets | [Draft](../task-drafts/SPEC-001/demo_media_fixtures.md) |
| Render the flat visual system and responsive public/account shell | Flat responsive visual foundations and navigation | [Draft](../task-drafts/SPEC-001/visual_system_shell.md) |
| Persist and restore the demo workspace through the shared facade | Durable local project and take state | [Draft](../task-drafts/SPEC-001/mock_workspace_persistence.md) |
| Simulate credit quotes, reservations and one-time purchases consistently | Consistent simulated credits and purchases | [Draft](../task-drafts/SPEC-001/mock_credit_accounting.md) |
| Exercise sample preparation and explicit correction disposition without AI | Honest sample preparation and retry activation | [Draft](../task-drafts/SPEC-001/mock_preparation_lifecycle.md) |
| Simulate finished generations and local share deletion honestly | Generation-safe local demo result lifecycle | [Draft](../task-drafts/SPEC-001/mock_result_lifecycle.md) |
| Take a demo user from file selection and quote to a usable preview | Upload/quote-to-preview user journey | [Draft](../task-drafts/SPEC-001/upload_preparation_ui.md) |
| Correct prepared turns and add a missed line without losing saved work | Recoverable text/speaker/timing and missed-line edits | [Draft](../task-drafts/SPEC-001/turn_correction_ui.md) |
| Capture a bounded local microphone take synchronized to reference audio | Measured fixed-window microphone capture | [Draft](../task-drafts/SPEC-001/browser_capture_adapter.md) |
| Record and safely review one durable take per turn | One durable safely reviewed take per turn | [Draft](../task-drafts/SPEC-001/recording_review_ui.md) |
| Resume projects and manage honest finished results and public demo links | Resume, result, download and public demo UI | [Draft](../task-drafts/SPEC-001/results_projects_sharing_ui.md) |
| Buy demo credit packs and return to the original preparation quote | Explicit one-time demo purchase/return journey | [Draft](../task-drafts/SPEC-001/credits_purchase_ui.md) |
| Prove the full backend-free frontend milestone | Integrated backend-free frontend proof | [Draft](../task-drafts/SPEC-001/frontend_mock_integration_gate.md) |
| Run the existing frontend through the real backend services adapter | Real-backend integration through existing facade | [Draft](../task-drafts/SPEC-001/frontend_real_adapter.md) |
| Prove the complete real-service dubbing journey and failure recovery | Full real-service media/billing/lifecycle proof | [Draft](../task-drafts/SPEC-001/real_product_integration_gate.md) |
