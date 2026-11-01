# Literal prototype-to-React mapping

The frozen prototype HTML and styles are the appearance source. The React port preserves their visible hierarchy, order, IDs/classes, and CSS property recipes; the differences below are limited to React composition, application behavior, semantics, localization, and approved local style scoping.

## Variant A — Record

Prototype source:

- prototypes/core-journey-lowfi/index.html, main header and #record-view.
- Header: .project-header, #exit, .project-heading, #heading, #dots, #header-actions.
- Main content: .rehearsal with .scene / #scene, .script / #dialogue, .timeline / .wave, #scrub, .timeline-meta, #time, #volume.
- Performance panel: aside.performance, .line-context, #position, #saved, #compact-script-slot, .performance-actions, #replay, #record, #take, #mic-recovery, #take-help, .navigation, #previous, and #next.

React source:

- frontend/src/features/record/FoundationRecordPage.tsx: RecordHeader A branch maps the header; recordScene, recordScript, and recordTimeline map the rehearsal media, caption, and timeline; the A branch maps the same aside and line-context slots; Controls supplies .performance-actions and .navigation.
- frontend/src/styles/prototype-record.css: scoped copy of style.css, highfi.css, panel-responsive.css, video-center.css, and focused-exit.css.
- frontend/src/styles/prototype-record-shared.css: shared waveform, range, volume, and focus treatment.

## Variant B — Record

Prototype source:

- prototypes/core-journey-studio/index.html, main header and #record-view.
- Header: .studio-header, #exit, .studio-title, #heading, #result-project, #dots, and #position.
- Main content uses the same .rehearsal, .scene, .script, #dialogue, and .timeline structure as A.
- Performance panel: section.performance, .studio-controls, #previous, #replay, #record, #take, #next, .take-status, #saved, #take-help, #mic-recovery, .studio-utilities, and #to-result.

React source:

- frontend/src/features/record/FoundationRecordPage.tsx: RecordHeader B branch, shared rehearsal elements, and the B section.performance with Controls preserve that order and those class/ID hooks.
- frontend/src/styles/prototype-record-b.css: scoped copy of studio.css and studio-highfi.css.
- frontend/src/styles/prototype-record-shared.css: common media and control recipes.
- The #saved status span remains mounted when empty, preserving the prototype's layout slot.

## Shared presentation and Result

- prototypes/core-journey-lowfi/comparison-components.css and prototypes/core-journey-studio/comparison-components.css supply shared comparison treatments in frontend/src/styles/prototype-components.css and prototype-record-shared.css.
- The prototypes' presentation.css recipe is represented in prototype-components.css; prototype-media-waveform.css styles the application waveform while retaining the prototype box and control geometry.
- A Result composition comes from low-fi #result-view, .result-stage, .result-player, .result-picture, .result-sources, .result-transport, .result-bottom, and .result-actions markup plus panel-result.css, focused-exit.css, and result-player.css.
- B Result composition comes from studio #result-view and corresponding Result player markup plus studio.css and result-player.css.
- frontend/src/features/result/FoundationResultPage.tsx provides those two header/page compositions around the same player. frontend/src/styles/prototype-result.css ports source geometry and color recipes for both variants.

## Bounded adaptations for production behavior

- HTML was split into small React components (RecordHeader, Controls, Waveform, recordScene, recordScript, and recordTimeline) so content and controls bind to useRecordController; those component boundaries do not create a new layout.
- Prototype global styles are scoped under the A/B production roots. The duplicate B scope was removed from the shared A stylesheet after confirming it was identical to the dedicated B stylesheet; the B declarations remain in prototype-record-b.css.
- One A compact-desktop cascade adapter restores the approved short-viewport line-to-controls gap after scoping. Fresh 1280×600 measurements match the prototype.
- The React wrapper for B Result uses display: flow-root to prevent its copied top margin from collapsing through the host wrapper. It preserves approved header/player coordinates and removes the 12 px scroll discrepancy.
- A/B Result project subtitle colors use the corresponding source values: A #626262, B the approved secondary token.
- Existing controller behavior supplies real microphone permission, source playback, accepted Blob persistence, navigation guards, and Result authorization. Prototype timer simulation and scripted take substitutes were not copied.
- The source waveform is decoded from the prepared video; the take overlay uses captured Blob samples. Production adds accessible names/descriptions and required focus behavior. Icon rendering uses the approved outlined Lucide treatment at 1.1 stroke.
- The displayed Result video remains the fixed illustrative sample and is labeled as such. It is not assembled from the accepted captures.
