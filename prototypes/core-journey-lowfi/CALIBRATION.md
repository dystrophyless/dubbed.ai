# High-fi v3 component calibration

Date:2026-10-27, Asia/Qyzylorda. Current target: core-journey-highfi-v3. Initial calibration preceded v1 whole-page styling; this revision recalibrates only notification feedback under the owner's direct contrasting-background, animation and timeout instruction. Earlier pink inline and white persistent popup proposals were rejected. No canonical tokens or production integration are changed.

## References and unchanged component foundation

Four selected Clean CSS families / five matching Light PNGs remain the applicable source set under ../../_docs/evidence/affect-ui-clean-light/source/components/. All nine pinned hashes are checked in evidence/calibration-v3-reference-check.json.

| Clean source and matching Light PNG | Product mapping / retained values |
|---|---|
| button/Clean/button-clean.md.txt; Light/01-initial.png and03-loading.png | Button: dark primary black.88/hover.8, white secondary exact small/hover shadows,6px radius, red.08/.12 Record wash with accessible C1262C ink;140ms color/shadow,160ms .97 press/reverse,900ms pending spinner. Task40px / Medium14/20 / pad14 / gap8 / icon16; secondary32, nav36; phone48 / Medium16/24. |
| profile-menu/Clean/profile-menu-clean.md.txt; Light/01-initial.png | Dialog/Popover surface derivative: white/radius10, exact floating shadow, native semantics; guard max400/pad24 desktop16 phone/titleMedium16/24. No profile/avatar feature imported. |
| notification-stack/Clean/notification-stack-clean.md.txt; Light/01-initial.png | Notification/status derivative. NOT supplies radius10, restrained surface family and readable title/body hierarchy. Owner explicitly supersedes the white card and persistent-popup anatomy; current inverse treatment and lifetime are mapped below. No feed, stack, artwork, badge, popup button or dismissal control imported. |
| thinking-loader/Clean/thinking-loader-clean.md.txt; Light/01-initial.png | Plain pending status, using actual Lucide LoaderCircle and BTN900ms spinner only while the mock request/assembly is pending. Static under reduced motion; no fake percentage, shimmer or animation-gated work. |

Mabry Pro Regular/Medium is actually installed locally and confirmed through CDP, including current popup title/body. No licensed font was copied or redistributed. Inter Variable is calibration-only under its retained license; it never replaces the product family. Earlier equal14px/500 width comparison remains recorded: Save changes93.83px Inter /86.71px Mabry. Lucide static1.61.0 ISC geometry retains viewBox, no fill/currentColor, rounded caps/joins and stroke1.1. Phone targets, fields, focus rings and the media derivative retain the calibrated foundation.

## Material v3 notification adaptation

The owner requested a different background because white merged with the application, plus improved appearance, actual entry/exit animation and timed disappearance. The instruction directly supersedes the previous persistent-popup rule. This adopts no Dark source/theme: the application stays Light; only the functional popup uses an opaque inverse surface derived from the Light primary's dark contrast.

| Property | Current shared recipe / reason |
|---|---|
| Surface | Opaque #202020, radius10, selected PRO floating shadow:0 0 0 .5px black.08;0 12px 28px -10px black.16;0 1px 2px black.05. Visible against white without a large red wash. |
| Content | TitleMedium14/20 #FCFCFC; bodyRegular14/20 #D4D4D4; outlined20px CircleAlert #FF9C9F. One cause, one short preservation statement. No colored square, art or extra severity badge. |
| Spacing | Padding14px vertical/16 horizontal, gap12, body margin-top3. Max520px, phone viewport minus32px, bottom16px or safe-area inset. Wider than NOT380px to retain readable Mabry/localized copy. Physical notched-device behavior remains untested. |
| Motion | Entry180ms opacity ease +8px vertical translation using source cubic-bezier(.22,1,.36,1). Exit140ms reverse. No blur/scale/stack or layout animation. Source NOT uses transform460ms/opacity300ms, and leaving transform320ms/opacity240ms with40px horizontal displacement/.98scale; the owner-authorized single popup uses a shorter bounded task response instead. |
| Lifetime |8 foreground read seconds start after entry. Deliberate mouse movement over the popup pauses reading; merely appearing under a stationary click pointer does not freeze it. Document-hidden pause is implemented; actual hidden-tab transition was NOT RUN because installed headless Chrome kept document.hidden false. Reduced motion removes movement/fade immediately but preserves the same8-second read time. |
| Task priority | Listening/transport or manual workspace scrolling exits the transient popup so it does not follow the user onto waveform/actions. Commands start immediately. Extremely short listening space may hide only the popup immediately. Neither operation clears the issue or recovery action. |

The actual shared presentation.css recipe is used by calibration.html and the app. The app's toast.js owns visibility/read time independently from business failure data; ordinary renders cannot reopen/reset it. Timing never accepts/deletes a take, moves a line or starts processing.

Durable guidance remains ordinary associated workspace text. Microphone failure retains Open Settings plus its cause/recovery sentence. Save failure retains primary Retry save and explicitly names the retained destination: Previous, Result, Settings or the original next/boundary intent. Busy retry retains the issue and exact candidate until success. No button is inside the popup. A guarded explicit discard or rerecord retains its existing semantics.

The visual popup is aria-hidden to avoid duplicate reading; an always-present polite atomic status announces a new failure's durable guidance once. Ordinary renders do not announce again. Action descriptions point to the persistent helper, never timed/hidden popup text. No focus enters the popup, and expiry leaves focus unchanged. Actual speech output remains untested.

## Layout and rendered checks

The approved16:9 contained media and matching full-width waveform are not shrunk for a popup. Measured final clearance exposes the complete desktop performance loop above it, with the whole heading; short desktop may scroll application chrome away. Phone presents the normal recovery-control group above the popup, with ordinary scrolling. Explicit listening exposes scene/dialogue/full timeline and exits the popup. The minimum document floor prevents timed removal from clamping scroll position; explicit new contexts release it.

Current evidence:
- calibration-v3-check-results.json: rendered shared foundation, normal/hover/pressed/reverse/keyboard-focus/disabled/busy/field/dialog derivatives, loaded Mabry/Inter, phone targets and reduced motion.
- highfi-v3-visual-results.json: actual inverse recipe and Mabry Medium/Regular faces, polite-atomic semantics and stationary-pointer timeout.
- highfi-v3-toast-results.json: real elapsed entry/hold/exit/hidden frames for both failures on desktop/phone/short RU/reduced motion; deliberate hover pause, unchanged scene width, stable focus/scroll, no wave/action overlap during presentation, retained exact takes and Previous target.
- highfi-v3-destination-results.json: EN/RU retained Settings destination, explicit listening/wheel exit, new-failure retrigger and successful acceptance before boundary navigation.

Full-opacity contrast: title15.88:1, body10.99:1, semantic icon8.15:1 against charcoal; popup16.29:1 against the white application. Reduced-motion captures retain the same content and read time. Current primary images use hf3-<viewport>-<locale>-<failure>-enter/during/exit/after names. Study/debug captures are preliminary, not review acceptance evidence.

No pixel-identical white-NOT claim is made for this owner-requested inverse derivative. No full screen-reader/mobile/safe-area/font-portability audit or production shadcn adapter is established. Independent high-fi review and owner checkpoint2 remain separate.
