import { ids, type Revision, type Services } from '../../services/contracts'
import type { AppNavigate } from '../../app/screen-contract'
import { routes } from '../../app/routes'

export type SignOutThroughGuardResult =
  | { state: 'completed' }
  | { state: 'guarded' }
  | { state: 'failed'; code: string }

function newOperationId() {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `account-sign-out-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return ids.operation(value)
}

async function confirmedSignedOut(services: Pick<Services, 'identity'>): Promise<boolean> {
  try {
    const current = await services.identity.current()
    return current.status === 'ok' && current.data === null
  } catch {
    return false
  }
}

/** The shell runs route-exit guards before beforeCommit, so sign-out only follows a durable choice. */
export async function signOutThroughGuard(input: {
  services: Pick<Services, 'identity'>
  navigate: AppNavigate
  refreshIdentity: () => Promise<unknown>
  expectedRevision?: Revision
}): Promise<SignOutThroughGuardResult> {
  let beforeCommitRan = false
  let failureCode = 'unexpected'

  let navigated = false
  try {
    navigated = await input.navigate(routes.landing('signed-out'), {
      replace: true,
      beforeCommit: async () => {
        beforeCommitRan = true
        try {
          const result = await input.services.identity.signOut({
            operationId: newOperationId(),
            ...(input.expectedRevision ? { expectedRevision: input.expectedRevision } : {}),
          })
          if (result.status === 'ok') return true
          if (await confirmedSignedOut(input.services)) return true
          failureCode = result.status === 'error'
            ? result.error.code
            : result.status === 'conflict'
              ? result.code
              : 'unknown-operation'
          return false
        } catch {
          if (await confirmedSignedOut(input.services)) return true
          failureCode = 'unknown-operation'
          return false
        }
      },
    })
  } catch {
    if (!beforeCommitRan) return { state: 'guarded' }
    return { state: 'failed', code: failureCode }
  }

  if (!beforeCommitRan) return { state: 'guarded' }
  if (!navigated) return { state: 'failed', code: failureCode }

  try {
    await input.refreshIdentity()
  } catch {
    // The route has already changed and sign-out was confirmed by its receipt or current session.
  }
  return { state: 'completed' }
}
