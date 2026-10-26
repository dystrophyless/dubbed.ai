# Affect UI Clean / Light adoption

Date: 2026-10-23 (Asia/Qyzylorda)  
Status: owner-selected visual direction; specification migration only  
Scope: all 12 active frontend flow specifications and their authorized implementation tasks

## Authority and boundaries

The owner asked Dubbed to strongly adopt the style, components and animations in `D:\Program\frontend\affect-ui\affectui-free`, selected **Clean / Light only** (also under OS dark preference; no theme toggle or imported `.dark` mode), and explicitly retained **Mabry Pro**. The [exact source catalog](affect-ui-clean-light-reference.md) owns the inspected code/Light PNG identities and hashes. [design-tokens.md](design-tokens.md) owns current normative palette, component states, density, radii, shadows, accessibility exceptions and motion. This document maps those recipes into existing Dubbed jobs.

This replaces the blue-primary design contract rather than adding an optional theme. The owner-approved tokens and this mapping are the current presentation contract. Older superseded proposals do not override them. Source appearance wins over generic design-skill defaults or default shadcn styling. shadcn remains the semantic behavior foundation for controls, dialogs and keyboard/focus behavior, adapted to the source look.

Keep approved routes/flow ownership, compact global navigation, black media stage, readable dialogue, same-page upload/selection/quote and the current responsive baseline. The product goal and approved low-fi determine content order and grouping. Record uses the focused Replay / Record / Your take loop; its contextual performance panel is an owner-directed prototype target, not fixed page geometry or a mandatory pinned panel. No source demo content or business rule adds a Dubbed feature. This assignment writes documentation only: no app code, dependency installation, commit, push, deployment or paid call.

The owner's latest icon decision selects **Lucide Icons with Affect UI's thin outlined treatment**, superseding HugeIcons, as specified in [Iconography](design-tokens.md#iconography--owner-decision-2026-10-23). Use stroke width 1.1, no fill, currentColor and rounded caps/joins while retaining mapped component geometry, colors and motion. Compare equivalent glyphs against the actual reference because Lucide revisions can change contours; do not infer that every Affect UI icon belongs to Lucide. Historical source hashes/screenshots remain unchanged provenance. Provider logos remain brand assets.

## Source-to-product mapping

Each implementation records its exact source component/variant/state from the catalog, not merely an image of the reference landing page.

| Source family / recipe | Dubbed use | Required limit |
|---|---|---|
| Clean buttons: dark primary, white secondary, soft destructive | All flow actions; Record capture and deletion retain explicit semantics | Use 6px shape, exact state/shadow/press recipes and documented accessible labels; do not carry the old blue-primary system |
| Loading button / functional spinner | Pending auth/save/processing/result/payment reconciliation only where the flow owns a pending control | Busy remains distinct from disabled; no invented successful result, elapsed-time percent or stage |
| Derived labeled fields using selected Clean tokens and stronger focus | Auth, linking, project name, account password and source-section time fields | Preserve labels, validation placement, password policy, millisecond selection and entered-value retention |
| OTP/code input | Registration and password-reset six-cell logical field | Keep six digits, automatic changed-complete-value verification, invalid value retained/selected, `clearOnError=false`, service 60s resend eligibility and 10-minute validity; no source sample tries/cooldown/security behavior |
| Tabs / segmented selection and functional indicator | A product-required finite choice or tab relationship | Use only where the current flow requires selection; the recipe does not impose a Record source toggle. Replay / Your take keep one synchronized source, candidate preference, replay reset and capture locks; no editor, turn picker or new tab follows |
| Menu / dropdown / popover / profile-menu treatment | Existing phone/account/row menus and approved source choices | Only existing items; 10px source framing/elevation; keep focus containment/return and accessible semantics |
| Derived dialog / confirmation surface using PRO/BTN tokens | Existing delete, candidate-save/leave, cancellation and insufficient-credit guards | Preserve exact choices, warning/quote identity, consent and persistence order; animation never commits or delays the operation |
| Progress/status recipe | Existing upload/Processing/Result and truthful save/draft states | Numeric progress and stage names come from authoritative service facts. Unknown remains unknown; preserve existing unresolved-progress gate |
| Derived compact list/history rows using PRO/FIL interiors and source surface | My projects, Credits history and Account method rows | Adapt source frame/interior where the component exists; do not add filter features, KPI cards, source pricing or profile data |
| Keyed content/width morph and press/selection response | Existing local component state changes | Use exact 140/160/~200/480/520ms source recipes in their catalogued roles, immediate reduced motion, no page-entry or background decoration |

A component without an exact source analogue uses the deterministic derived mapping in design-tokens.md, with its adaptation recorded before implementation; generic fields, dialogs, file input, player and waveform have no direct source counterpart. Source code is evidence for presentation, never authority over authentication, payments, billing, project/take identity, recording or result semantics.

## Flow-specific adoption

| Active flow | Mapped presentation | Product contract that remains authoritative |
|---|---|---|
| 01 Landing | Source buttons/links, surfaces and readable hierarchy | Explain the product, truthful intended result/value, user effort and next step; preserve the approved offer/support link. Permitted truthful proof and explanatory content are prototype decisions, not a content quota or automatic source import |
| 02 Sign in | Fields, password action, source buttons and functional pending | Neutral credential response, Google/email paths, 30-day session, guarded same-project return |
| 03 Registration | Fields/buttons and six-cell code treatment | Verification before account completion, no code auto-clear, exact grant/collision/link behavior |
| 04 Password reset | Fields, code treatment, buttons/pending | Existence-neutral request, purpose-bound proof, password installation/session behavior |
| 05 Account linking | Proof-form controls, status, dialog/menu recipes | Dual proof, canonical account, add-only methods, conflict/no-merge and safe return |
| 06 New dub | File/field/action controls, selection indicator, approved dialogs | Same-page video/selection/quote, millisecond interval, explicit quote authorization and durable upload |
| 07 Processing | Honest progress/status, functional spinner and cancellation dialog | Service percentage/stage, quote refresh/consent, preservation and authoritative destination |
| 09 Record | BTN performance/navigation actions, menu/dialog and black media exception | Replay / Record / Your take are grouped apart from navigation; preserve the fixed window with moving reference video and original audio during capture. Disable Replay / Your take audition, seeking and source-switch controls while capture is active; reference volume remains adjustable. Preserve candidate/accepted safety and recovery. Contextual panel and phone/short-screen geometry await prototype validation |
| 10 Result | Source actions/status/guards, black media exception | Displayed-generation download, uninterrupted previous playback, explicit Watch new and revision assembly |
| 11 My projects | Compact rows, source row menu/input/delete dialog | Most-recent activity, authoritative Continue, inline rename autosave and exact empty state |
| 12 Credits | Source pack actions/status/history/menu/dialog presentation | Configured one-time packs, real balance/reservations/history, same-tab hosted checkout and verified fulfillment |
| 15 Account | Fields, method rows, source locale/menu and destructive guards | Password/session policy, add-only linking, typed localized deletion and ordinary sign-out behavior |

Withdrawn 08 Prepare, 13 Sharing and 14 Public viewer are not revived.

## Explicit source exceptions

1. **Typeface and role sizing:** use Mabry Pro Regular/Medium, never the source font as a new brand choice. Preserve 16/24 body/dialogue, 14/20 captions, 32/40 desktop and 24/32 phone headings; no Bold/synthetic Bold. The current Dubbed desktop baseline roles are task40px with Medium14px/20px, 14px horizontal padding, 8px gap and16px icon; prominent/landing44px with Medium16px/24px and16px horizontal padding; secondary32px with Medium14px/20px; navigation36px with Medium14px/20px; medium segmented40px/14px/20px desktop and48px/16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; an incidental compact control needs a documented rationale. Desktop icon-only targets are at least40x40px; all phone targets are at least48px, including 48x48px icon-only and48px-high text actions. The source catalog retains original24/28/32px heights and12/16,13/20 labels as provenance only, not Dubbed targets. These defaults remain until approved calibration/prototype feedback leads to an update in the canonical token file and synchronization of affected flow quotations before integration; they are not immutable Affect identity. Source compact sizes do not automatically become product targets. Other components retain their mapped geometry, including OTP40x44/radius8/gap8 and segmented outerradius8/optionradius6.
2. **Accessibility:** source .45/.27 text alpha, .35 focus and translucent accent cannot silently serve required normal text/focus. Use readable black .61, black .447 essential boundaries, opaque `#0060E2` links/focus, `#C1262C` error/destructive labels and retained media focus on opaque black, exactly as the token contract specifies. Measure actual composites including .08/.12 danger wash. Source hairline shadows are decorative.
3. **Touch and layout:** retain the minimum 48px phone interaction target and functional readability. A smaller visible icon/control may sit within a fully usable focusable/clickable hit region, with no collision, clipping or overlapping targets; padding or a bounding box alone does not prove usability. Exercise pointer and touch. Preserve source 6px controls, 10px existing component framing, state/shadow/internal-spacing character; do not shrink dialogue/billing copy to match a compact source button.
4. **Motion:** permit catalogued functional press/selection/content/pending recipes; retain immediate reduced motion and no action/service gating. Exclude gradient shimmer, marketing text reveal, shine/blur decoration, page-entry/parallax/background attention loops. The functional spinner is allowed only for a real pending state.
5. **Service truth:** no sample API fetch, validation regex/domain list, OTP tries/resend countdown authority, fake loading number, source menu item or hard-coded demo data replaces centralized services or flow requirements.
6. **Component semantics:** preserve shadcn control behavior/keyboard/focus management while matching source presentation. No installation/API compatibility is asserted by these specifications.

## Required verification record

Normalize source/result component crops to CSS-pixel size and record DPR, viewport and zoom. Compare component-level shape, spacing, state and shadow; do not copy the demo outer canvas/frame or require source Inter text widths after the explicit Mabry substitution. For each affected component record: Dubbed flow/state; catalog source path/component/variant/state and hash; Light PNG reference; adopted color/shape/shadow/spacing/motion recipe; explicit adaptation and reason; source versus resulting screenshots; measured composite contrast, readable type and target geometry; keyboard/focus/assistive states; EN/RU/reflow; reduced-motion and reverse/exit behavior; real loading/progress semantics; command/environment/date/revision and evidence path.

Review both the recognizable source treatment and retained product behavior. Verify rendering at 390px, below/at 768px and wide desktop, including long Russian copy, zoom, short height/keyboard occlusion, phone safe area, dynamic media backing and actual Mabry loading. A copied primitive, screenshot of the source, Markdown check or green build alone does not establish Dubbed visual fidelity or product acceptance.

The current approved adoption contract, tokens, reference catalog and affected flow specifications remain the maintained sources of truth. Historical issue-body and review copies are not kept as parallel records. New documentation/static checks prove only bounded consistency; application rendering, focus/target/contrast in actual states and end-to-end behavior remain not run in this docs-only phase.

