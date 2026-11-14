/* Spacing props map to --space-* tokens (design-system/audit.md §9). */
export type Space = 0 | 2 | 4 | 6 | 8 | 10 | 12 | 14 | 16 | 20 | 24 | 32 | 48 | 64;
const NAME: Record<Space, string> = {
  0: "0", 2: "var(--space-0_5)", 4: "var(--space-1)", 6: "var(--space-1_5)", 8: "var(--space-2)", 10: "var(--space-2_5)",
  12: "var(--space-3)", 14: "var(--space-3_5)", 16: "var(--space-4)", 20: "var(--space-5)", 24: "var(--space-6)",
  32: "var(--space-8)", 48: "var(--space-12)", 64: "var(--space-16)",
};
export const space = (s: Space) => NAME[s];
