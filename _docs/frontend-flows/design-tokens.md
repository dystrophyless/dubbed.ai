# Frontend design tokens — Affect UI Clean / Light

Date: 2026-10-23 (Asia/Qyzylorda)  
Status: owner-selected Clean / Light adoption; Mabry Pro retained  
Mode: specification only; no implementation, installed component, rendered pass or product acceptance

## 1. Authority and source

The latest owner request replaces the former blue-primary palette, 8px controls and blanket 150ms/no-shadow contract with the exact **Clean / Light** direction from the local Affect UI Free checkout. Read the [source catalog](affect-ui-clean-light-reference.md), [adoption mapping and exceptions](affect-ui-clean-light-adoption.md), and [shared contract](00-shared-contract.md) together. Source identifiers, paths, hashes and inspected Light PNGs belong to the catalog; they are evidence of the reference, not of a Dubbed implementation.

The superseded 2026-10-22 draft, old contrast calculations and migration check are not current token sources. Their blue/neutral/red scales and computed pairs do not validate the new alpha composites. Flow specifications consume the semantic roles below, not an arbitrary source shade or a default shadcn theme.

Only Light is in scope, including when the OS prefers dark mode; expose no theme toggle and import no source `.dark` behavior. Keep Mabry Pro Regular and Medium and compact global navigation. The current product goal and checkpoint-approved low-fi determine recording hierarchy and responsive composition; preserve readable dialogue, usable phone/short-screen operation and all service/functional invariants. No style sample creates a product feature.

Keep three roles distinct: **source visual recipes** define component shape, edge, shadow, local spacing and bounded feedback; **product/accessibility adaptations** retain Mabry, readable text, contrast, focus, service semantics and usable targets; **prototype candidate geometry** covers page hierarchy, columns and placement that still need design validation. This is the canonical token file; do not create a local second scale or silently promote a layout proposal into a token.

### Iconography — owner decision, 2026-10-23

Use **Lucide Icons with the Affect UI outline treatment** for all application UI icons across every active flow, including shell navigation, media controls, menus, dialogs, form affordances and status marks. This owner decision supersedes the earlier HugeIcons selection. Retain Affect UI Clean/Light layout, colors, component states and motion; do not mix other icon families, filled variants, emoji or hand-drawn approximations into UI iconography.

Match the reference's outlined SVG treatment: 24x24 coordinate grid, no fill, currentColor stroke, stroke width 1.1, rounded line caps and joins. Retain normal viewBox-relative scaling rather than forcing a constant screen-pixel stroke at every icon size. Use the existing component icon slots (14px for desktop small buttons; 16px for medium/large buttons and the mapped segmented control), semantic foreground colors and phone 48px interaction targets; icon dimensions do not define the touch target. Reuse one consistent glyph for the same action. Record actual Lucide asset names and the selected version during implementation rather than inventing exports. Where Affect UI contains an equivalent Lucide glyph, compare its geometry with the reference: Settings and FileText match the inspected 0.468.0 source, while newer Lucide revisions may change contours. This comparison does not mandate that old package version. If no suitable asset is available, retain the explicit text action and report the gap instead of silently substituting another family. Provider-owned logos, such as Google's sign-in brand mark, are brand assets rather than UI icon substitutes.

Decorative icons are hidden from assistive technology; icon-only controls have localized accessible names, visible focus and the existing disabled/busy behavior. Icons supplement required text/status semantics. Shared components are owned by #78; all screen tasks consume this contract. #63 verifies consistent family usage, thin-stroke legibility and rendered sizing/accessibility. This decision does not install a package or establish runtime evidence.

## 2. Source primitives and explicit adaptations

Alpha values mean black over the named opaque light backing; they are not interchangeable opaque hex values. Composite against the actual backing before checking contrast.

| Primitive | Exact value | Use/limit |
|---|---|---|
| White | `#FFFFFF` | Retained Dubbed page ground; source white controls |
| Black | `#000000` | Media backing; alpha-composite base |
| On-solid foreground | `#FCFCFC` | Source dark-button foreground, not a global page-ground selection |
| Ink | `rgba(0,0,0,.88)` | Main text; source dark primary fill |
| Primary hover | `rgba(0,0,0,.80)` | Dark primary hover |
| Readable secondary ink | `rgba(0,0,0,.61)` | Required supporting text |
| Source muted / faint | `rgba(0,0,0,.45)` / `rgba(0,0,0,.27)` | Nonessential decoration only; not required small text |
| Icon / essential boundary | `rgba(0,0,0,.447)` | Meaningful icon/control-boundary adaptation on approved light backings |
| Surface wash | `rgba(0,0,0,.03)` | Secondary ground over white: `#F7F7F7` after rounded 8-bit compositing |
| Hairline | `rgba(0,0,0,.06)` | Decorative separation only |
| Source accent | `rgba(0,96,226,.765)` | Source non-text accent where measured contrast permits |
| Accessible accent | `#0060E2` | Required text links and visible light focus; explicit opaque adaptation |
| Source focus | `rgba(0,96,226,.35)` | Preserved as provenance; insufficient as the sole required focus indicator |
| Source danger | `#E5484D` | Non-text danger mark only where measured contrast permits |
| Danger wash | `rgba(229,72,77,.08)` / hover `.12` | Source soft-destructive background |
| Accessible danger ink | `#C1262C` | Required error/destructive label and essential invalid boundary adaptation |

No complete 50–950 scale is required. Preserve exact source values for mapped roles; adaptations are enumerated rather than silently darkening unrelated parts.

## 3. Semantic color and component states

| Semantic role | Required mapping |
|---|---|
| `page` | White |
| `surface` | Surface wash over page; no arbitrary gray-card system |
| `media` | Opaque black |
| `text.primary` / `text.secondary` | Ink / readable secondary ink |
| `divider.decorative` | Hairline; never the sole essential control boundary |
| `border.control` | Icon/essential boundary alpha; preserve source hairline as additional decoration where present |
| `action.primary.default` / `hover` | Ink / primary hover |
| `action.primary.pressed` | Default fill plus source `scale(.97)` press response; source does not define a third invented shade |
| `action.primary.foreground` | On-solid foreground |
| `action.secondary` | White, ink text, exact source subtle shadow below; no blue fill |
| `action.destructive.default` / `hover` | Danger wash .08 / .12 with accessible danger ink |
| `action.destructive.pressed` | Default soft-destructive treatment plus source press response |
| `action.destructive.foreground` | Accessible danger ink for every soft-destructive state |
| `link` | Accessible accent with semantic/link context and visible focus |
| `error` | Accessible danger ink plus adjacent message/invalid semantics |
| `error.surface` | Source danger wash only where an existing error region requires backing |
| `selected.background` / `foreground` | Source neutral wash / ink; selected/current semantics remain explicit |
| `disabled.background` / `disabled.foreground` | Ordinary mapped fill / readable secondary ink before source component opacity .4; opacity only for a genuinely disabled control, with adjacent readable reason when needed |
| `focus.light` | 2px opaque accessible-accent ring outside a 2px gap matching the opaque surrounding ground |
| `focus.media` | Retain `#60A5FA` 2px ring on opaque black media-control backing as an explicit media accessibility exception |

A focusable pending/busy control uses its normal readable treatment, `aria-busy`/status and duplicate-action guard, not disabled opacity. Preserve each flow's existing submission/validation rules. Hover, invalid and selected styling never erase focus. Color, alpha and motion never carry required meaning alone.

The source secondary-button shadow is `0 0 0 .5px rgba(0,0,0,.06), 0 1px 1px -1px rgba(0,0,0,.1), 0 1px 2px 0 rgba(0,0,0,.05)`. It is decorative, not an essential control boundary. Apply the [catalogued](affect-ui-clean-light-reference.md) source focus/hover/pressed recipes to their mapped variants; do not invent another general-purpose shadow family.

Source profile/filter panels use 10px radius. Mapped menus/popovers use the exact source elevation `0 0 0 .5px rgba(0,0,0,.08), 0 12px 28px -10px rgba(0,0,0,.16), 0 1px 2px rgba(0,0,0,.05)` only where an actual menu/popover exists. This authorizes source component framing, not wrappers around every block.

## 4. Typography, geometry and layout

| Role | Contract |
|---|---|
| Typeface | Mabry Pro Regular / Medium only; no Bold or synthetic Bold |
| Body / dialogue | Regular 16px / 24px |
| Supporting caption | Regular 14px / 20px |
| Field label | Medium 14px / 20px |
| Desktop/phone heading | Medium 32px / 40px; phone Medium 24px / 32px |
| Desktop action roles | Task: 40px high, Mabry Pro Medium14px/20px, 14px horizontal padding, 8px gap, 16px icon; prominent/landing: 44px, Medium16px/24px, 16px horizontal padding; secondary: 32px, Medium14px/20px; shared navigation: 36px, Medium14px/20px. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; incidental compact controls require documented rationale. |
| Phone button text | Mabry Pro Medium 16px / 24px; desktop label sizes follow their role above and do not reduce phone typography |
| Control targets | Desktop icon-only targets are at least 40x40px. Phone targets are at least 48px, including 48x48px icon-only targets and text actions 48px high with 16px/24px labels; preserve mapped component states and geometry |
| Button radius | Mapped button radius 6px; other components use their own mapped geometry, not a blanket 6px rule |
| Required panel/menu radius | Source 10px; only where that component already serves a flow requirement |
| Page gutters | Retained 32px desktop / 16px phone |
| Related / field / within-block / major-section gaps | Retained 8 / 16 / 24 / 32px; source component internal spacing takes precedence inside explicitly mapped components |
| Existing panel padding | Shared default remains 24px desktop / 16px phone unless the mapped source component defines its own interior |
| Account settings density exception | Flow 15 QA62-06 only: `.account-screen` body padding 16px 0 64px desktop / 32px 0 56px phone; desktop sections 8px vertical / 24px gap and the single derivative content card 10px vertical / 16px horizontal / 10px gap; phone sections 22px vertical / 16px gap and cards 16px padding. Shared App main sizing/gutters and 24px desktop / 16px phone panel defaults elsewhere remain unchanged. Owner authorized correction of poor small sizing; the Orchestrator selected these values under delegation, without separate human pixel approval. |
| Responsive boundary | Phone below 768 CSS px; regular top navigation at/above 768px |
| Working / auth-form maxima | Retained 1200px / 400px where applicable |

Mabry Pro is the explicit font exception to source typography. Current Dubbed action sizes are the baseline role map, not immutable Affect identity; original source dimensions are not automatic replacement targets. Keep the defaults until approved calibration/prototype feedback is reflected here and affected flow quotations are synchronized before integration. Preserve mapped component state, shape, color, brand and suitable internal spacing/shadows; do not shrink recording dialogue or billing facts to match an original compact source control. Global navigation stays compact without a permanent navigation sidebar. A contextual Record performance panel is permitted as the owner-directed prototype direction; it does not approve final geometry. Do not add generic dashboard tiles, new form fields or copied source business content.

### Exact component mapping and derived primitives

The catalog contains no generic Input, password field, Dialog, file picker, waveform or player component. The following are explicit Dubbed adaptations, not claims of source counterparts:

| Existing component | Deterministic presentation |
|---|---|
| Plain email/password/time/title field | White fill, 1px essential `border.control`, radius6, desktop32px minimum box, horizontal10px padding; Mabry Regular16px/24px input value and Medium14px/20px external label. Phone minimum48px target/box and input text at least16px where needed for readable input/iOS zoom. Multiline grows to its content; do not clip the value to a source button height. |
| OTP | Source preferred cells40x44px, radius8, gap8, Medium15px/24px displayed digits and a real16px logical input. Preserve six cells; shrink only where the source permits and readability/target separation passes. The single accessible field has an overall target region at least48px high; six visual cells are not six separate48px-wide targets. Keep40x44px cells where they fit; responsive source shrinking/gap adaptation may fit a320px viewport without overflow or overlapping neighbors. |
| Existing product-required segmented selector | This recipe applies only to a product-required finite choice, not to Record’s direct Replay / Record / Your take actions. Medium segmented controls are 40px high / Medium14px/20px on desktop and 48px / Medium16px/24px on phone. Preserve mapped 10px horizontal padding, icon16/gap8, outerradius8, option/indicatorradius6, trayblack.04/padding2 and white selected pill. Phone options have at least48px targets; required source/disabled reasons use readable text. |
| Existing menu | PRO white radius10/padding4, maximum260px (constrain to available width), mapped floating shadow; desktop menu actions use secondary32px / Mabry Pro Medium14px/20px, padding0 8/gap10/radius6. Phone rows at least48px targets and readable labels; no copied profile-completion block. |
| Existing filter/checkbox when required | FIL desktop checkbox14px/radius4, inset .5px black.22 + 0 1px 1px black.04 source shadow; required boundary is independently strengthened with `border.control`. No new filter is introduced. Phone target at least48px; visible check stays centered, control name readable. |
| Existing modal/confirmation | White, radius10, source floating shadow, maximum400px constrained by page gutters, padding24px desktop/16px phone; content16px/24px, title Medium16px/24px; source BTN actions wrap/stack for long RU copy. Critical text is visible without waiting for transition; preserve every flow's focus/consent/exit semantics. |
| Existing inline status/progress | No extra outer card or editable checklist. PGR bar4px high/radius2, trackblack.06 and opaque accessible-accent fill, readable14px/20px status; percent/stage only from services. Unknown percentage has no invented numeric fill. THK plain pending mark may use catalogued timing while the real job is pending. |
| Upload / section selection | Retain approved same-page anatomy; derived white input/drop target uses1px essential boundary/radius6/padding24px desktop16px phone, source BTN actions. Timeline remains functional media/selection: visible essential boundary, opaque-accent selection/handles, readable16px time inputs and millisecond precision; source imports no editor behavior. |
| Media / waveform / capture | Retain opaque black stage, aspect-fit/orientation and existing waveform semantics; use white-secondary source buttons or opaque white control backing so dark-primary ink is not placed invisibly on black. Meaningful media icons are white; recording mark may use source danger only with measured contrast and explicit recording text. Media focus uses the retained opaque exception. On light waveform backing use `border.control` waveform/essential marks and opaque accent selection; playback/capture timing is unchanged. |

Mapped source internals use 2/4/6px and 8/10/12/14/16px values as catalogued; the outer page-grouping scale does not flatten component interiors. Smaller visible icon/control artwork may sit inside the full phone interaction target required above, provided the focusable/clickable region is usable, readable and free of collisions, clipping or overlap. Neither invisible padding nor a measured bounding box substitutes for actual pointer/touch testing. These derivative dimensions are a presentation decision only and preserve all previously approved field, modal, timeline, capture, billing and service rules.

## 5. Functional motion

Use the catalogued source recipes only in roles required by the product. A segmented selection recipe does not require a Record source selector; direct performance actions retain the flow’s playback and capture locks:

- Color/background/shadow response: 140ms.
- Press transform: 160ms, `cubic-bezier(.22,1,.36,1)`, scale .97; reverse when the press ends.
- Existing SEG selection: 200ms indicator edges/width, directional leading/trailing220/160ms; 120ms press scale .97 and 90ms option colors, with `cubic-bezier(.25,.9,.3,1)` movement. Product locks apply before pointer/keyboard/touch changes.
- Existing keyed content/width morph: source 480/520ms, `cubic-bezier(.25,1,.5,1)`, only for a real component change. It must not hide current content or block actions while finishing.
- Functional button pending spinner: 900ms linear cycle only while the real operation is pending. It reports no percentage, work stage, delivery, payment, capture or save success.
- Existing menu hover: PRO140ms out/60ms in or FIL140ms out/90ms in, according to the actually mapped source menu. Existing filter expansion/selection may use its catalogued320ms group,260ms chevron/chip,220ms panel,240ms check +40ms delay and160ms fill recipes; no new filter follows.
- Existing OTP feedback:220ms cell color/260ms ring; source acknowledgement340ms cells/460ms frame with220ms offset/380ms check with560ms offset is optional local feedback only, never delayed successful navigation. Preserve invalid code.
- Existing THK status morph:460ms in/width,320ms out,240ms icon opacity/420ms transform; check360ms +120ms and800ms pending rays only while the service owns that state. Omit blur/shimmer and timer-owned phases.
- Existing progress: source1100ms fill smoothing may animate only toward an already service-reported value; it cannot predict percent or obstruct cancellation/navigation. Source check marks use560ms pop/420ms tick +160ms only after authoritative completion. No entry cascade or shine.
- Existing dismissible notice: source460ms pending movement/320ms outgoing transform/240ms opacity, only where an existing flow requires a notice; essential errors/recovery are never hidden in a stack.

No blanket 150ms cap remains. Do not import page-entry marketing sequences, parallax, background attention loops, gradient shimmer, text reveal, shine or blur decoration. Reduced motion makes interface state/content changes immediate and stops nonessential looping motion while retaining a static pending label. Capture, save acknowledgement, billing reconciliation, navigation and service transitions never wait for animation. Functional video/audio/playhead timing is unchanged.

## 6. Accessibility evidence and limits

The analyst's new source evidence records rounded 8-bit alpha composites. Source black .61 computes about 5.77–6.01:1 on sampled light backings; source .45 text about 3.32–3.36:1 and is excluded from required normal-size copy. Essential-boundary .447 computes about 3.30–3.32:1 on sampled light backings. Opaque accent computes 5.11–5.57:1 and adapted danger ink is checked on actual soft-destructive default/hover backings on sampled light backings. See the [reference evidence](affect-ui-clean-light-reference.md) for exact backing/pair/method rows.

The selected danger ink `#C1262C` computes 5.281/5.022:1 on .08/.12 tints over white; 5.174/4.887:1 over `#FCFCFC`; and 4.871/4.624:1 over the sampled `#F5F5F5` backing. The earlier `#D12E34` proposal fails some tinted states and is rejected; it is not an active role. Check the actual `surface` wash and every rendered backing separately. Retained media focus `#60A5FA` on black uses the earlier opaque 8.26:1 calculation only for that unchanged pair. Do not evaluate focus against a changing video frame.

Required normal text targets at least 4.5:1; essential boundaries/meaningful icons/focus target at least 3:1 against their actual adjacent colors. Disabled controls are exempt from the cited contrast criteria; readable explanatory copy is not. Static pair arithmetic does not prove font loading, rendered contrast, focus visibility, target size, keyboard access, screen-reader state, zoom/reflow, forced-colors behavior or whole-product WCAG conformance.

## 7. Acceptance criteria

- [ ] **DT-AC01 — Authority:** all 12 active flows consume this Clean / Light contract and the source/adoption catalog; former blue-primary normative mappings are removed from active clauses.
- [ ] **DT-AC02 — Fidelity:** mapped controls use source dark-primary/white-secondary/soft-destructive states, 6px buttons, component-specific field/OTP/segmented geometry, 10px existing panels/menus, exact restrained shadows and documented functional motion.
- [ ] **DT-AC03 — Adaptations:** Mabry, phone button labels Medium16px/24px, readable text/links/error labels, essential boundaries, visible focus, phone targets and media backing follow the explicit exceptions; source faint alpha never silently replaces them.
- [ ] **DT-AC04 — States:** hover, pressed, selected, invalid, disabled, busy/loading and focus are specified with semantic/text feedback and preserve every flow's service guards.
- [ ] **DT-AC05 — Layout:** compact navigation, media dominance, existing gutters/widths/responsive rules and no-per-block-wrapper discipline survive.
- [ ] **DT-AC06 — Motion:** approved functional source recipes have immediate reduced-motion equivalents and never gate service outcomes or actions.
- [ ] **DT-AC07 — Evidence:** exact reference/component/variant/state and every exception are recorded with revision/environment; static source/contrast evidence is distinct from rendered Dubbed evidence.
- [ ] **DT-AC08 — Integration:** shadcn supplies semantic/keyboard/focus-control behavior adapted to the source appearance; raw shadcn presentation is not an alternative style system.

## 8. Verification plan

1. Verify the catalog's source paths, hashes, component variants and Light PNGs before implementation; compare every mapped role to the exact source, including reverse/exit and pressed states.
2. Calculate composited foreground/background pairs for text, soft-destructive default/hover, invalid, essential boundary, focus and selected states. Record exact values, method and pass/fail; never recycle old blue-palette results.
3. Normalize component crops to CSS pixels and record device-pixel ratio/viewport/zoom before comparing; compare component geometry/state/shadow, not the demo outer frame or source Inter text widths. Allow only the documented Mabry/accessibility adaptations. Capture representative Dubbed screenshots below/at 768px, at 390px and wide desktop with EN/RU, long content and real Mabry loading; measure each desktop role's label and target independently from retained phone button labels at Medium16px/24px. Compare mapped source shape, internal spacing, shadows and motion against approved product role sizes while checking hierarchy.
4. Exercise keyboard, screen reader, pointer and touch, visible focus, 200% zoom/reflow, target sizes, short viewport/keyboard occlusion and forced colors. Inspect disabled versus focusable busy behavior.
5. Measure mapped motion durations/easing, reverse/exit, reduced-motion immediacy and pending-spinner lifecycle. Prove no fabricated progress or animation-gated capture/save/payment/navigation.
6. Record command/check, environment/date, exact revision or dirty-worktree boundary, expected/actual result and evidence path. Missing runtime evidence stays not run.

This docs-only correction runs no application or browser acceptance check. On 2026-10-25 the owner authorized correcting undersized action roles; the Orchestrator selected the exact numeric values below under delegated authority, not as separately human-approved pixel measurements. Desktop task40px, prominent/landing44px, secondary32px, navigation36px and medium-segmented40px roles; medium segmented phone controls and phone targets remain48px. Original source24/28/32px values and12/16,13/20 labels remain provenance in the reference catalog, not current Dubbed targets.
