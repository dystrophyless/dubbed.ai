import type { ProjectItem } from "./views/ProjectsView";

/* Demo data: one project per lifecycle state of design-system/ia.md. Never real people, emails or IDs. */
const DEMO_FRAME = { src: "/media/scene.mp4", at: 1.2 };

export const LIFECYCLE_PROJECTS: ProjectItem[] = ([
  { id: "p-draft", name: "Harbour at dawn", state: "draft", seconds: 95, changedMinutes: 4 },
  { id: "p-queued", name: "Bus stop", state: "queued", seconds: 48, changedMinutes: 9 },
  { id: "p-preparing", name: "Rooftop argument", state: "preparing", seconds: 118, stage: { n: 2, of: 3 }, changedMinutes: 14 },
  { id: "p-recording", name: "Kitchen scene", state: "recording", seconds: 64, turns: { done: 3, total: 12 }, changedMinutes: 25 },
  { id: "p-assembling", name: "Night market", state: "assembling", seconds: 72, turns: { done: 6, total: 6 }, changedMinutes: 40 },
  { id: "p-done", name: "Train station", state: "done", seconds: 42, turns: { done: 7, total: 7 }, changedMinutes: 60 * 3 },
  { id: "p-done-new", name: "Lighthouse call", state: "done", seconds: 58, turns: { done: 5, total: 5 }, newVersion: true, changedMinutes: 60 * 26 },
  { id: "p-nodialogue", name: "Silent film test", state: "no-dialogue", seconds: 30, changedMinutes: 60 * 24 * 4 },
  { id: "p-failed", name: "A very long file name from a phone camera 2026-11-02 final cut v7 export", state: "failed", seconds: 81, changedMinutes: 60 * 24 * 6 },
] satisfies Omit<ProjectItem, "frame">[]).map((p) => ({ ...p, frame: DEMO_FRAME }));

/** Prototype stand-in for the real routes: each row opens the approved prototype of the page it will open. */
export function prototypeHref(p: ProjectItem): string {
  switch (p.state) {
    case "draft": return "/prototypes/new-dub/page?state=ready";
    case "queued": return "/prototypes/processing/page?state=queued";
    case "preparing": return "/prototypes/processing/page?state=running";
    case "recording": return `/prototypes/studio/turn?turn=${(p.turns?.done ?? 0) + 1}&turns=${p.turns?.total ?? 12}`;
    case "assembling": return "/prototypes/result/page?state=assembling";
    case "done": return p.newVersion ? "/prototypes/result/page?state=new-version-assembling" : "/prototypes/result/page?state=ready";
    case "no-dialogue": return "/prototypes/processing/page?state=no-dialogue";
    case "failed": return "/prototypes/processing/page?state=failed";
  }
}

/** Demo cancel charge: step 1 of 3 done costs 24 of the reserve; queued is free. */
export function demoCancelInfo(p: ProjectItem) {
  return p.state === "preparing"
    ? { stepsDone: p.stage ? p.stage.n - 1 : 0, charge: 24, reserved: p.seconds }
    : { stepsDone: 0, charge: 0, reserved: p.seconds };
}
