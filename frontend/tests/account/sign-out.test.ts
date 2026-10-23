import { describe, expect, it, vi } from 'vitest'
import { routes } from '../../src/app/routes'
import type { AppNavigate } from '../../src/app/screen-contract'
import type { AccountSnapshot, Session, Services } from '../../src/services/contracts'
import { signOutThroughGuard } from '../../src/features/account/sign-out'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function makeIdentity() {
  const account = {
    id: 'account-one', email: 'owner@example.test', locale: 'en', revision: 5,
    deleted: false, createdAt: 1,
  } as unknown as AccountSnapshot
  const session = {
    id: 'session-one', accountId: account.id, expiresAt: Date.now() + 60_000, revision: 2,
  } as unknown as Session
  const identity = {
    signOut: vi.fn().mockResolvedValue(ok({ signedOut: true as const })),
    current: vi.fn().mockResolvedValue(ok({ account, session })),
  }
  return { identity, account }
}

describe('signOutThroughGuard', () => {
  it('does not sign out when the route guard keeps the user on the current page', async () => {
    const { identity, account } = makeIdentity()
    const navigate = vi.fn().mockResolvedValue(false) as unknown as AppNavigate
    const refreshIdentity = vi.fn()

    const result = await signOutThroughGuard({
      services: { identity } as unknown as Pick<Services, 'identity'>,
      navigate,
      refreshIdentity,
      expectedRevision: account.revision,
    })

    expect(result).toEqual({ state: 'guarded' })
    expect(navigate).toHaveBeenCalledWith(routes.landing('signed-out'), expect.objectContaining({ replace: true, beforeCommit: expect.any(Function) }))
    expect(identity.signOut).not.toHaveBeenCalled()
    expect(refreshIdentity).not.toHaveBeenCalled()
  })

  it('runs sign-out only after navigation approval and refreshes the identity', async () => {
    const { identity, account } = makeIdentity()
    const navigate = vi.fn(async (_route, options) => options?.beforeCommit ? options.beforeCommit() : true) as unknown as AppNavigate
    const refreshIdentity = vi.fn().mockResolvedValue({ status: 'signed-out' })

    const result = await signOutThroughGuard({
      services: { identity } as unknown as Pick<Services, 'identity'>,
      navigate,
      refreshIdentity,
      expectedRevision: account.revision,
    })

    expect(result).toEqual({ state: 'completed' })
    expect(identity.signOut).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: account.revision, operationId: expect.any(String) }))
    expect(refreshIdentity).toHaveBeenCalledOnce()
  })
})
