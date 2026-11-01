import type { CaptureGrantAcquire, CaptureGrantId, CaptureGrantPort, ProjectPort } from '../contracts';
import { captureGrantId } from '../contracts';

function tabOwnerId(): string {
  return globalThis.crypto.randomUUID();
}

export function createWebLockCaptureGrants(projects: ProjectPort): CaptureGrantPort {
  const ownerTabId = tabOwnerId();

  return {
    async acquire(scope): Promise<CaptureGrantAcquire> {
      if (!navigator.locks?.request) {
        return { kind: 'unavailable', reason: 'This browser cannot coordinate an exclusive local recording tab.' };
      }

      let resolveAcquire!: (result: CaptureGrantAcquire) => void;
      let settled = false;
      const acquired = new Promise<CaptureGrantAcquire>((resolve) => { resolveAcquire = resolve; });
      const finishAcquire = (result: CaptureGrantAcquire) => {
        if (settled) return;
        settled = true;
        resolveAcquire(result);
      };

      const lockTask = navigator.locks.request(
        `dubbed:record-project:${encodeURIComponent(scope.projectId)}`,
        { mode: 'exclusive', ifAvailable: true },
        async (lock) => {
          if (!lock) {
            finishAcquire({ kind: 'held' });
            return;
          }

          let grant;
          try {
            grant = await projects.acquireCaptureGrant(scope, captureGrantId(globalThis.crypto.randomUUID()) as CaptureGrantId, ownerTabId);
          } catch (error) {
            finishAcquire({ kind: 'unavailable', reason: error instanceof Error ? error.message : 'Local recording access is unavailable.' });
            return;
          }

          let releaseHold!: () => void;
          const hold = new Promise<void>((resolve) => { releaseHold = resolve; });
          let released = false;
          let releaseTask: Promise<void> | undefined;
          finishAcquire({
            kind: 'acquired',
            grant,
            release: async () => {
              if (released) return releaseTask;
              released = true;
              releaseTask = (async () => {
                try {
                  await projects.releaseCaptureGrant(scope, grant);
                } finally {
                  releaseHold();
                }
                await lockTask;
              })();
              return releaseTask;
            },
          });
          await hold;
        },
      );

      void lockTask.catch((error: unknown) => {
        finishAcquire({ kind: 'unavailable', reason: error instanceof Error ? error.message : 'Local recording access is unavailable.' });
      });
      return acquired;
    },
  };
}
