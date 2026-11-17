import type { DemoIdentity } from "./views/GoogleStandInView";

/* Demo data for the 004 prototype and the views' states. Never a real person's email. */

/** the ready demo account (shown on sign-in in demo mode only; research R10) */
export const DEMO_ACCOUNT = { email: "demo@dubbed.test", password: "dubbed-demo" };

/** values "typed before the error" in the error states */
export const TYPED = { email: "mia.carter@example.com", password: "correct horse battery" };

export const DEMO_CODE = "482913";

export const GOOGLE_IDENTITIES: DemoIdentity[] = [
  { id: "alex", name: "Alex Rivera", email: "alex.rivera@example.com" },
  { id: "sam", name: "Sam Lee", email: "sam.lee@example.com" },
];

export const MIC_DEVICES = [
  { value: "default", label: "Default — MacBook Air Microphone" },
  { value: "usb", label: "USB Audio (Blue Yeti)" },
  { value: "headset", label: "AirPods Pro" },
];

/** what the shell's account menu shows (R12): the session's email, and the Google name when the account has one */
export const SHELL_USERS = {
  email: { name: "mia.carter@example.com", email: "mia.carter@example.com" },
  google: { name: "Alex Rivera", email: "alex.rivera@example.com" },
} as const;
