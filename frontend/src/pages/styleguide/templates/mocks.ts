/*
 * Demo data for the reference templates. Never real people, emails or IDs.
 * Credit-pack prices are PLACEHOLDERS — real prices are pending (PRODUCT_BRIEF.md §5, open question 1).
 */
export const DEMO_USER = { name: "Alex Morgan", email: "alex@example.com" };

export type ProjectState = "draft" | "queued" | "preparing" | "recording" | "assembling" | "done" | "no-dialogue" | "failed";
export type DemoProject = {
  id: string;
  name: string;
  state: ProjectState;
  seconds: number;
  turns?: { done: number; total: number };
  stage?: { n: number; of: number };
  changed: number; // minutes ago
};

export const DEMO_PROJECTS: DemoProject[] = [
  { id: "p1", name: "Kitchen scene", state: "recording", seconds: 64, turns: { done: 3, total: 12 }, changed: 25 },
  { id: "p2", name: "Train station", state: "done", seconds: 42, turns: { done: 7, total: 7 }, changed: 60 * 26 },
  { id: "p3", name: "Rooftop argument", state: "preparing", seconds: 118, stage: { n: 2, of: 3 }, changed: 3 },
  { id: "p4", name: "Silent film test", state: "no-dialogue", seconds: 30, changed: 60 * 24 * 4 },
];

export const DEMO_PACKS = [
  { id: "s", credits: 300, price: "$3" },
  { id: "m", credits: 1000, price: "$9", best: true },
  { id: "l", credits: 3000, price: "$24" },
];

export type HistoryKind = "welcome" | "purchase" | "reserved" | "charged" | "refund";
export const DEMO_HISTORY: { id: string; kind: HistoryKind; project?: string; amount: number; daysAgo: number }[] = [
  { id: "h1", kind: "reserved", project: "Rooftop argument", amount: -118, daysAgo: 0 },
  { id: "h2", kind: "charged", project: "Kitchen scene", amount: -64, daysAgo: 1 },
  { id: "h3", kind: "charged", project: "Train station", amount: -42, daysAgo: 2 },
  { id: "h4", kind: "refund", project: "Train station", amount: 3, daysAgo: 2 },
  { id: "h5", kind: "purchase", amount: 1000, daysAgo: 3 },
  { id: "h6", kind: "charged", project: "Silent film test", amount: -30, daysAgo: 4 },
  { id: "h7", kind: "welcome", amount: 120, daysAgo: 5 },
];

export const DEMO_DEVICES = [
  { value: "default", label: "Default — MacBook Air Microphone" },
  { value: "usb", label: "USB Audio (Blue Yeti)" },
  { value: "headset", label: "AirPods Pro" },
] as const;
