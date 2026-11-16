import type { ProjectState } from "../contracts";

/* Project slots (data-model.md → Account). Every stored project holds a slot; cancelled projects are removed. */

export const FREE_SLOT_LIMIT = 2;
export const FIRST_PAID_SLOT_LIMIT = 10;
export const SLOT_STEP = 5;
export const MAX_SLOT_LIMIT = 50;
export type SlotsOffer = "first" | "more" | "max";

export function slotLimitAfterPurchase(limit: number): number {
  return limit === FREE_SLOT_LIMIT ? FIRST_PAID_SLOT_LIMIT : Math.min(MAX_SLOT_LIMIT, limit + SLOT_STEP);
}

export function slotLimitForPurchases(completed: number): number {
  return completed === 0 ? FREE_SLOT_LIMIT : Math.min(MAX_SLOT_LIMIT, FIRST_PAID_SLOT_LIMIT + SLOT_STEP * (completed - 1));
}

export function isSlotLimit(n: number): boolean {
  return n === FREE_SLOT_LIMIT || (n >= FIRST_PAID_SLOT_LIMIT && n <= MAX_SLOT_LIMIT && n % SLOT_STEP === 0);
}

export function slotsOffer(limit: number): SlotsOffer {
  return limit === FREE_SLOT_LIMIT ? "first" : limit === MAX_SLOT_LIMIT ? "max" : "more";
}

export function slotsUsed(states: readonly ProjectState[]): number {
  return states.length;
}

export function canCreate(states: readonly ProjectState[], slotLimit: number): boolean {
  return slotsUsed(states) < slotLimit;
}

/** A project whose video can be swapped for another one in the same slot: an unstarted draft, or one where no dialogue was found. */
export function canReplaceVideo(state: ProjectState): boolean {
  return state === "draft" || state === "no_dialogue";
}
