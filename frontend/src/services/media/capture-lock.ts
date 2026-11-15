/*
 * One recording tab at a time (from _carryover/.../WebLockCaptureGrants.ts, research R1).
 * A Web Lock per project, held until release() and freed automatically when the tab closes.
 */

const lockName = (projectId: string) => `dubbed:record:${projectId}`;

export type HeldLock = { release(): Promise<void> };

/** Takes the lock without waiting; null when another tab holds it. Without Web Locks every tab may record. */
export async function tryAcquire(projectId: string): Promise<HeldLock | null> {
  if (!navigator.locks?.request) return { release: async () => undefined };
  return new Promise<HeldLock | null>((resolve) => {
    let releaseHold!: () => void;
    const hold = new Promise<void>((r) => (releaseHold = r));
    const task = navigator.locks.request(lockName(projectId), { mode: "exclusive", ifAvailable: true }, async (lock) => {
      if (!lock) {
        resolve(null);
        return;
      }
      resolve({
        release: async () => {
          releaseHold();
          await task.catch(() => undefined);
        },
      });
      await hold;
    });
    void task.catch(() => resolve(null));
  });
}

/** Resolves once the lock is free (the other tab released it or closed), or when `signal` aborts. */
export async function whenFree(projectId: string, signal: AbortSignal): Promise<void> {
  if (!navigator.locks?.request) return;
  try {
    await navigator.locks.request(lockName(projectId), { mode: "exclusive", signal }, async () => undefined);
  } catch {
    /* aborted */
  }
}
