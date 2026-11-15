import type { Section } from "../contracts";

/* Product rules for sections and prices (data-model.md → Project). */

export const MIN_SECTION_MS = 1_000;
export const MAX_SECTION_MS = 120_000;
export const MAX_VIDEO_MS = 10 * 60_000;
export const MAX_FILE_BYTES = 250 * 1024 * 1024;
export const ACCEPTED_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const ACCEPTED_EXTENSIONS = [".mp4", ".mov", ".webm"] as const;

export const sectionLength = (s: Section) => s.endMs - s.startMs;

/** 1 credit per started second: ceil(sectionLength / 1 000). */
export function priceOf(s: Section): number {
  return Math.ceil(sectionLength(s) / 1_000);
}

/** "1 000 ≤ length ≤ 120 000", inside the video. */
export function isValidSection(s: Section, videoMs: number): boolean {
  const len = sectionLength(s);
  return s.startMs >= 0 && s.endMs <= videoMs && len >= MIN_SECTION_MS && len <= MAX_SECTION_MS;
}

/** "whole video if ≤ 120 s else 0–120 000". */
export function defaultSection(videoMs: number): Section {
  return { startMs: 0, endMs: Math.min(videoMs, MAX_SECTION_MS) };
}

/** "strip extension, -/_/. → space, collapse spaces, first letter upper". */
export function nameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  const spaced = base.replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  if (!spaced) return "Untitled scene";
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function isAcceptedFile(file: { name: string; type: string }): boolean {
  const lower = file.name.toLowerCase();
  return (ACCEPTED_TYPES as readonly string[]).includes(file.type) || ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
