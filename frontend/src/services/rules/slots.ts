import type { ProjectState } from "../contracts";

/* Project slots (data-model.md → Account). Every stored project holds a slot; cancelled projects are removed. */

export const FREE_SLOT_LIMIT = 2;
export const PAID_SLOT_LIMIT = 10;

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
