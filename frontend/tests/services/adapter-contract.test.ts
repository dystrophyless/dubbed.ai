import { asRevision, ids } from '../../src/services/contracts'
import type {
  AccountSnapshot,
  OperationId,
  OperationSnapshot,
  ServiceResult,
  Session,
} from '../../src/services/contracts'
import { createServiceTestHarness, expectOk, operationId } from './test-support'
import {
  defineAccountPasswordContract,
  type AccountPasswordContractFixture,
  type AccountPasswordContractServices,
} from './adapter-contract'

const currentPassword = 'contract-current-password'
const nextPassword = 'contract-next-password'
const conflictingPassword = 'contract-conflicting-password'

async function createMockFixture(): Promise<AccountPasswordContractFixture> {
  const harness = createServiceTestHarness()
  const requestId = operationId('adapter-contract-registration')
  expectOk(await harness.services.registration.start({
    email: 'adapter-contract@example.test',
    password: currentPassword,
    operationId: requestId,
  }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId('adapter-contract-registration-proof'),
  }))

  return {
    services: harness.services,
    currentPassword,
    nextPassword,
    conflictingPassword,
    operationId: operationId('adapter-contract-password-change'),
    queueUnknownAfterCommit: harness.queueUnknown,
  }
}

/** A deliberately narrow injected adapter: it implements only the three public ports under contract. */
function createNarrowFakeFixture(): AccountPasswordContractFixture {
  const accountId = ids.account('narrow-contract-account')
  const session: Session = {
    id: ids.session('narrow-contract-session'),
    accountId,
    expiresAt: 1_800_604_800_000,
    revision: asRevision(1),
  }
  let account: AccountSnapshot = {
    id: accountId,
    email: 'adapter-contract@example.test',
    locale: 'en',
    revision: asRevision(1),
    deleted: false,
    createdAt: 1_800_000_000_000,
  }
  let storedPassword = currentPassword
  const operations = new Map<OperationId, {
    fingerprint: string
    receipt: OperationSnapshot<{ account: AccountSnapshot; revokedOtherSessions: true }>
  }>()
  const unknownAfterCommit = new Set<OperationId>()

  const services: AccountPasswordContractServices = {
    identity: {
      current: async () => ({ status: 'ok', data: { account, session }, replayed: false }),
    },
    account: {
      changePassword: async (input) => {
        const fingerprint = JSON.stringify({
          currentPassword: input.currentPassword,
          newPassword: input.newPassword,
          expectedRevision: input.expectedRevision,
        })
        const previous = operations.get(input.operationId)
        if (previous) {
          if (previous.fingerprint !== fingerprint) {
            return { status: 'conflict', code: 'intent-conflict', message: 'Operation ID was used for another request.' }
          }
          return { status: 'ok', data: previous.receipt.result!, replayed: true }
        }
        if (input.expectedRevision !== account.revision) {
          return { status: 'conflict', code: 'revision-conflict', currentRevision: account.revision, message: 'Account revision changed.' }
        }
        if (input.currentPassword !== storedPassword) {
          return { status: 'error', error: { code: 'unauthenticated', message: 'Current password is incorrect.', retry: 'none' } }
        }
        if (input.newPassword.length < 8) {
          return { status: 'error', error: { code: 'validation', message: 'Password must be at least 8 characters.', retry: 'none' } }
        }

        account = { ...account, revision: asRevision(Number(account.revision) + 1) }
        storedPassword = input.newPassword
        const result = { account, revokedOtherSessions: true as const }
        const receipt: OperationSnapshot<typeof result> = {
          id: input.operationId,
          accountId,
          state: 'committed',
          kind: 'account.change-password',
          result,
          revision: asRevision(0),
          updatedAt: 1_800_000_000_001,
        }
        operations.set(input.operationId, { fingerprint, receipt })
        if (unknownAfterCommit.delete(input.operationId)) {
          return { status: 'unknown', operationId: input.operationId, message: 'The response was lost after the mutation committed.' }
        }
        return { status: 'ok', data: result, replayed: false }
      },
    },
    operations: {
      resolve: async <T = unknown>(id: OperationId): Promise<ServiceResult<OperationSnapshot<T> | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }>> => {
        const stored = operations.get(id)
        if (!stored) {
          return { status: 'ok', data: { state: 'not-started', operationId: id, safeToRetrySameId: true }, replayed: false }
        }
        return { status: 'ok', data: stored.receipt as OperationSnapshot<T>, replayed: false }
      },
    },
  }

  return {
    services,
    currentPassword,
    nextPassword,
    conflictingPassword,
    operationId: ids.operation('adapter-contract-password-change'),
    queueUnknownAfterCommit: async (id) => { unknownAfterCommit.add(id) },
  }
}

defineAccountPasswordContract('mock adapter', createMockFixture)
defineAccountPasswordContract('narrow injected adapter', createNarrowFakeFixture)
