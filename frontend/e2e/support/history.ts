type SeedMoney = { id: string; name: string; reserved: number; charged: number; createdAt: number; changedAt: number };

/** History for fixture projects, plus an offset preserving the existing account balance. */
export function seedHistory(projects: SeedMoney[]) {
  const runs = projects.filter((p) => p.reserved > 0 || p.charged > 0).map((p) => ({
    id: `run-${p.id}`, kind: "run" as const, at: p.createdAt, updatedAt: p.changedAt,
    projectId: p.id, projectName: p.name, reserved: p.reserved, charged: p.charged, returned: 0,
    state: p.reserved > 0 ? "reserved" : "charged", amount: -(p.reserved + p.charged),
  }));
  const amount = -runs.reduce((sum, row) => sum + row.amount, 0);
  return [...runs, ...(amount ? [{ id: `fixture-adjustment-${projects[0]!.id}`, kind: "adjustment" as const, at: projects[0]!.createdAt, amount }] : [])];
}
