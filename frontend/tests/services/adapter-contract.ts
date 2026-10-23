import { describe, expect, it } from 'vitest'
import type {
  AccountSnapshot,
  OperationId,
  Services,
} from '../../src/services/contracts'
import { expectOk } from './test-support'

export type AccountPasswordContractServices = {
  identity: Pick<Services['identity'], 'current'>
  account: Pick<Services['account'], 'changePassword'>
  operations: Pick<Services['operations'], 'resolve'>
}

export interface AccountPasswordContractFixture {
  services: AccountPasswordContractServices
  currentPassword: string
  nextPassword: string
  conflictingPassword: string
  operationId: OperationId
  queueUnknownAfterCommit(operationId: OperationId): Promise<void>
}

type PasswordChangeResult = {
  account: AccountSnapshot
  revokedOtherSessions: true
}

/**
 * Reusable adapter assertions for password mutation recovery. Adapter-specific setup and
 * fault injection stay in the fixture factory; these checks depend only on the public ports.
 */
export function defineAccountPasswordContract(
  name: string,
  createFixture: () => Promise<AccountPasswordContractFixture> | AccountPasswordContractFixture,
): void {
  describe(name, () => {
    it('reconciles a committed unknown result, replays one operation, and rejects ID reuse', async () => {
      const fixture = await createFixture()
      const { services } = fixture
      const before = expectOk(await services.identity.current())
      if (!before) throw new Error('The contract fixture must begin with an authenticated account.')

      const request = {
        currentPassword: fixture.currentPassword,
        newPassword: fixture.nextPassword,
        expectedRevision: before.account.revision,
        operationId: fixture.operationId,
      }
      const accountId = before.account.id
      const sessionId = before.session.id
      await fixture.queueUnknownAfterCommit(fixture.operationId)

      const unknown = await services.account.changePassword(request)
      expect(unknown).toMatchObject({ status: 'unknown', operationId: fixture.operationId })
      if (unknown.status !== 'unknown') throw new Error('An unconfirmed mutation must remain explicitly unknown.')

      const afterUnknown = expectOk(await services.identity.current())
      if (!afterUnknown) throw new Error('A password change must preserve the current authenticated session.')
      expect(afterUnknown.account.id).toBe(accountId)
      expect(Number(afterUnknown.account.revision)).toBe(Number(before.account.revision) + 1)
      expect(afterUnknown.session.id).toBe(sessionId)

      const resolved = expectOk(await services.operations.resolve<PasswordChangeResult>(fixture.operationId))
      if (!('id' in resolved) || resolved.state !== 'committed' || !resolved.result) {
        throw new Error('A committed unknown password change must resolve to its typed operation receipt.')
      }
      expect(resolved).toMatchObject({
        id: fixture.operationId,
        accountId,
        kind: 'account.change-password',
        state: 'committed',
        result: { account: { id: accountId }, revokedOtherSessions: true },
      })
      expect(Number(resolved.result.account.revision)).toBe(Number(before.account.revision) + 1)

      const replay = await services.account.changePassword(request)
      expect(replay).toMatchObject({ status: 'ok', replayed: true, data: resolved.result })
      if (replay.status !== 'ok') throw new Error('An identical operation retry must return its saved result.')

      const afterReplay = expectOk(await services.identity.current())
      if (!afterReplay) throw new Error('Replaying a password change must preserve the current session.')
      expect(afterReplay.account.id).toBe(accountId)
      expect(afterReplay.account.revision).toBe(afterUnknown.account.revision)
      expect(afterReplay.session.id).toBe(sessionId)

      const conflict = await services.account.changePassword({
        ...request,
        newPassword: fixture.conflictingPassword,
      })
      expect(conflict).toMatchObject({ status: 'conflict', code: 'intent-conflict' })

      const afterConflict = expectOk(await services.identity.current())
      if (!afterConflict) throw new Error('Rejecting operation ID reuse must preserve the current session.')
      expect(afterConflict.account.id).toBe(accountId)
      expect(afterConflict.account.revision).toBe(afterUnknown.account.revision)
      expect(afterConflict.session.id).toBe(sessionId)
    })
  })
}

