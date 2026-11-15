import type { ComponentType } from "react";
import { ABackRowConcept, ABackSidesConcept, ABackTopConcept } from "./concepts/studio-a";
import { NextStepConcept, SidePanelsConcept, ThumbDockConcept, UnderTrackConcept } from "./concepts/studio-concepts";
import { OneCardConcept, PriceOnSelectionConcept, ReceiptConcept, TwoStepsConcept } from "./concepts/new-dub";
import { ND_STATES } from "./concepts/new-dub-shared";
import { ChecklistConcept, StageConcept, TipsConcept } from "./concepts/processing";
import { PR_STATES } from "./concepts/processing-shared";
import { ChooserConcept, ScriptConcept, StripConcept } from "./concepts/result";
import { RS_STATES } from "./concepts/result-shared";
import { STUDIO_STATES, StudioPrototype } from "./studio/studio";
import { NEW_DUB_STATES, NewDubPrototype } from "./new-dub/new-dub";
import { PROCESSING_STATES, ProcessingPrototype } from "./processing/processing";
import { ReadyElsewherePrototype } from "./processing/ready-elsewhere";
import { RESULT_STATES, ResultPrototype } from "./result/result";
import { ResultReadyElsewherePrototype } from "./result/ready-elsewhere";
import { PROJECTS_STATES, ProjectsDeltaPrototype, ResultFormatPrototype } from "./001-recording-flow-mock";

/*
 * Feature prototypes, added by the ui-designer during /speckit-design.
 * Route: /prototypes/<id>/<screen>?state=<state>
 *
 * Example entry:
 *   import { SignInPrototype } from "./001-auth";
 *   { id: "001-auth", title: "Auth", screens: { "sign-in": { title: "Sign in", states: ["default", "error"], Component: SignInPrototype } } }
 */

export type PrototypeScreen = { title: string; states: readonly string[]; Component: ComponentType };
export type PrototypeEntry = { id: string; title: string; screens: Record<string, PrototypeScreen> };

const CONCEPT_STATES = ["no-take", "recording", "saved"] as const;

export const PROTOTYPES: PrototypeEntry[] = [
  /* Feature 001 — recording flow on mock services: ONLY the deltas to the Gate-4 prototypes (see 001-recording-flow-mock.tsx) */
  {
    id: "001-recording-flow-mock",
    title: "001 · Recording flow on mock services (deltas)",
    screens: {
      projects: { title: "My projects · every lifecycle state, empty, redirect toast", states: PROJECTS_STATES, Component: ProjectsDeltaPrototype },
      result: { title: "Result · download names the real format (WebM)", states: RESULT_STATES, Component: ResultFormatPrototype },
      studio: { title: "Studio · recording in another tab (state=recording-elsewhere)", states: STUDIO_STATES, Component: StudioPrototype },
    },
  },
  /* Phase 4 — result, high-fi (concept C "watch, then fix", the video as large as possible + full screen). No state = live
     assembling → ready (the studio's last-turn "Build the result" opens this). Also &rerecorded=3,5 (no state: back from the
     studio's re-record mode, version 2 assembles live), &turns=N, &ratio=portrait|16x9, &notify=granted|denied, &name= */
  {
    id: "result",
    title: "Result (Phase 4, high-fi)",
    screens: {
      page: { title: "Result · watch, then fix", states: RESULT_STATES, Component: ResultPrototype },
      "ready-elsewhere": { title: "Ready while the user is elsewhere (toast on My projects)", states: ["default"], Component: ResultReadyElsewherePrototype },
    },
  },
  /* Phase 4 — new dub, high-fi (concept A "one card"). Also &reason=type|size|length|no-audio|broken, &ratio=portrait|16x9, &length=short */
  {
    id: "new-dub",
    title: "New dub (Phase 4, high-fi)",
    screens: {
      page: { title: "New dub · one card", states: NEW_DUB_STATES, Component: NewDubPrototype },
    },
  },
  /* Phase 4 — processing, high-fi (concept B "the scene, waiting" + C's step progress). No state = live run → studio turn 1.
     Also &end=no-dialogue|failed, &ratio=portrait|16x9, &tab=background, &notify=granted|denied, &name=&credits=&from=&to= (passed by New dub's Start) */
  {
    id: "processing",
    title: "Processing (Phase 4, high-fi)",
    screens: {
      page: { title: "Processing · the scene, waiting", states: PROCESSING_STATES, Component: ProcessingPrototype },
      "ready-elsewhere": { title: "Ready while the user is elsewhere (toast on My projects)", states: ["default"], Component: ReadyElsewherePrototype },
    },
  },
  /* Phase 4 — recording studio, high-fi (concept A, Previous in the action row). Also ?turn=1..N, ?turns=N, ?ratio=portrait,
     ?mode=rerecord (opened from the result: "Build the new version" instead of Next once a turn is re-recorded) */
  {
    id: "studio",
    title: "Recording studio (Phase 4, high-fi)",
    screens: {
      turn: { title: "Studio · one turn", states: STUDIO_STATES, Component: StudioPrototype },
    },
  },
  /* Phase 4 — studio concepts (low-fi, design-architect). Route: /prototypes/concepts/studio/<concept>?state=&ratio=portrait */
  {
    id: "concepts",
    title: "Concepts (Phase 4, low-fi): studio, new dub, processing, result",
    screens: {
      "studio/under-track": { title: "A · Under the track", states: CONCEPT_STATES, Component: UnderTrackConcept },
      "studio/side-panels": { title: "B · Side panels", states: CONCEPT_STATES, Component: SidePanelsConcept },
      "studio/thumb-dock": { title: "C · Thumb dock", states: CONCEPT_STATES, Component: ThumbDockConcept },
      "studio/next-step": { title: "D · Next step", states: CONCEPT_STATES, Component: NextStepConcept },
      /* A reworked — three placements of Previous; also ?turn=1..12 (default 3) */
      "studio/a-back-top": { title: "A · Previous in the header", states: CONCEPT_STATES, Component: ABackTopConcept },
      "studio/a-back-row": { title: "A · Previous in the action row", states: CONCEPT_STATES, Component: ABackRowConcept },
      "studio/a-back-sides": { title: "A · Arrows at the sides of the video", states: CONCEPT_STATES, Component: ABackSidesConcept },
      /* Phase 4 — new-dub concepts (low-fi). Route: /prototypes/concepts/new-dub/<concept>?state=&reason=length|size|type */
      "new-dub/one-card": { title: "New dub A · One card", states: ND_STATES, Component: OneCardConcept },
      "new-dub/receipt": { title: "New dub B · Video and receipt", states: ND_STATES, Component: ReceiptConcept },
      "new-dub/two-steps": { title: "New dub C · Two steps", states: ND_STATES, Component: TwoStepsConcept },
      "new-dub/price-on-selection": { title: "New dub D · Price on the selection", states: ND_STATES, Component: PriceOnSelectionConcept },
      /* Phase 4 — processing concepts (low-fi). Route: /prototypes/concepts/processing/<concept>?state=&end=no-dialogue|failed; no state = live run → studio turn 1 */
      "processing/checklist": { title: "Processing A · Checklist", states: PR_STATES, Component: ChecklistConcept },
      "processing/stage": { title: "Processing B · The scene, waiting", states: PR_STATES, Component: StageConcept },
      "processing/tips": { title: "Processing C · Get ready while you wait", states: PR_STATES, Component: TipsConcept },
      /* Phase 4 — result concepts (low-fi). Route: /prototypes/concepts/result/<concept>?state=&turn=1..6; no state = live assembling → ready */
      "result/script": { title: "Result A · The script", states: RS_STATES, Component: ScriptConcept },
      "result/strip": { title: "Result B · The strip", states: RS_STATES, Component: StripConcept },
      "result/chooser": { title: "Result C · Watch, then fix", states: RS_STATES, Component: ChooserConcept },
    },
  },
];
