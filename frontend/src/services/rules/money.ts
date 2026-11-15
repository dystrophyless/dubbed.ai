/*
 * Credits rules (data-model.md → Reserve / settle). Pure functions over a small ledger so the arithmetic is testable:
 * the invariant is that credits never appear or vanish — balance + reserved + charged stays equal to what was paid in.
 */

export type Ledger = { balance: number; reserved: number };
export type ProjectMoney = { reserved: number; charged: number };

export class NotEnoughCredits extends Error {}

/** Start / Try again: balance -= price; reserved += price. */
export function reserve(account: Ledger, project: ProjectMoney, price: number): [Ledger, ProjectMoney] {
  if (account.balance < price) throw new NotEnoughCredits();
  return [
    { balance: account.balance - price, reserved: account.reserved + price },
    { reserved: project.reserved + price, charged: project.charged },
  ];
}

/** Ready (turns found) or no dialogue: reserved -= price; charged = price. */
export function settle(account: Ledger, project: ProjectMoney): [Ledger, ProjectMoney] {
  return [
    { balance: account.balance, reserved: account.reserved - project.reserved },
    { reserved: 0, charged: project.charged + project.reserved },
  ];
}

/** Service failure: reserved -= price; balance += price. */
export function refund(account: Ledger, project: ProjectMoney): [Ledger, ProjectMoney] {
  return [
    { balance: account.balance + project.reserved, reserved: account.reserved - project.reserved },
    { reserved: 0, charged: project.charged },
  ];
}

/**
 * Cancel charge for finished preparation steps. Placeholder table (the real split is an open owner question):
 * 0 steps → free, 1 step → 25 %, 2 steps → 70 %, rounded up.
 */
export const CANCEL_SHARE = [0, 0.25, 0.7, 1] as const;

export function cancelCharge(price: number, stepsDone: number): number {
  const share = CANCEL_SHARE[Math.max(0, Math.min(3, stepsDone))] ?? 0;
  return Math.ceil(price * share);
}

/** Cancel: charge for finished steps, the rest of the reserve goes back. */
export function cancel(account: Ledger, project: ProjectMoney, charge: number): [Ledger, ProjectMoney] {
  const kept = Math.min(charge, project.reserved);
  return [
    { balance: account.balance + (project.reserved - kept), reserved: account.reserved - project.reserved },
    { reserved: 0, charged: project.charged + kept },
  ];
}
