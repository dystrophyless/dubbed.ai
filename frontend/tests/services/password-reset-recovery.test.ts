import { describe, expect, it } from 'vitest'
import type { Session } from '../../src/services/contracts'
import { asRevision, ids } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { type StoredAccount, writeRecord } from '../../src/services/mock-store'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

const EMAIL = 'reset-fixture@example.test'
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
type PasswordResetResolutionResult = Awaited<
  ReturnType<ReturnType<typeof createServiceTestHarness>['services']['passwordReset']['resolve']>
>

function expectResolutionState(
  result: PasswordResetResolutionResult,
  expected: 'expired' | 'completed' | 'not-found',
) {
  const resolution = expectOk(result)
  if (!('state' in resolution)) throw new Error('Expected a terminal password reset resolution.')
  expect(resolution.state).toBe(expected)
}

async function registerPasswordAccount(
  harness: ReturnType<typeof createServiceTestHarness>,
  email: string,
  prefix: string,
) {
  const requestId = operationId(`${prefix}-register-100001`)
  const pending = expectOk(await harness.services.registration.start({
    email,
    password: 'existing-password-8',
    operationId: requestId,
  }))
  return expectOk(await harness.services.registration.verify({
    requestId: pending.id,
    code: harness.verificationCode(pending.id),
    operationId: operationId(`${prefix}-verify-100002`),
  }))
}

async function seedGoogleOnlyAccount(
  harness: ReturnType<typeof createServiceTestHarness>,
  email: string,
) {
  const account: StoredAccount = {
    id: ids.account(`google-only-${harness.namespace}`),
    email,
    locale: 'en',
    revision: asRevision(0),
    deleted: false,
    createdAt: harness.now(),
    methods: [{ kind: 'google', address: email, verified: true, linkedAt: harness.now() }],
  }
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  await runTransaction(database, ['accounts'], 'readwrite', async (transaction) => {
    await writeRecord(transaction, 'accounts', account)
  })
  database.close()
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not read mock sessions.'))
  })
}

async function sessionsFor(harness: ReturnType<typeof createServiceTestHarness>): Promise<Session[]> {
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  try {
    return await runTransaction(database, ['sessions'], 'readonly', (transaction) =>
      requestResult(transaction.objectStore('sessions').getAll() as IDBRequest<Session[]>))
  } finally {
    database.close()
  }
}

describe('password reset recovery boundaries', () => {
  it('keeps the request and code-entry receipt neutral across the six synthetic identity classes', async () => {
    const existing = createServiceTestHarness()
    await registerPasswordAccount(existing, EMAIL, 'reset-existing')

    const googleOnly = createServiceTestHarness()
    await seedGoogleOnlyAccount(googleOnly, EMAIL)

    const unverified = createServiceTestHarness()
    const unverifiedRequestId = operationId('reset-unverified-registration-200001')
    expectOk(await unverified.services.registration.start({
      email: EMAIL,
      password: 'unverified-password-8',
      operationId: unverifiedRequestId,
    }))

    const disabledAccount = createServiceTestHarness()
    await registerPasswordAccount(disabledAccount, EMAIL, 'reset-disabled')
    const disabled = createServiceTestHarness({
      factory: disabledAccount.factory,
      namespace: disabledAccount.namespace,
      clientId: 'password-reset-disabled-fixture',
      scenario: 'password-reset-disabled-account',
    })

    const deleted = createServiceTestHarness()
    const deletedRegistration = await registerPasswordAccount(deleted, EMAIL, 'reset-deleted')
    expectOk(await deleted.services.account.delete({
      confirmation: 'DELETE',
      locale: 'en',
      expectedRevision: deletedRegistration.account.revision,
      operationId: operationId('reset-delete-account-300001'),
    }))

    const nonexistent = createServiceTestHarness()
    const personas = [
      { kind: 'existing password', harness: existing, eligible: true },
      { kind: 'Google only', harness: googleOnly, eligible: false },
      { kind: 'unverified registration', harness: unverified, eligible: false },
      { kind: 'disabled reset fixture', harness: disabled, eligible: false },
      { kind: 'deleted account', harness: deleted, eligible: false },
      { kind: 'nonexistent account', harness: nonexistent, eligible: false },
    ] as const

    const receipts = []
    for (const persona of personas) {
      const pending = expectOk(await persona.harness.services.passwordReset.start({
        email: EMAIL,
        operationId: operationId(`neutral-${persona.kind.replaceAll(' ', '-')}-400001`),
      }))
      const code = pending.scenarioCode?.value
      expect(pending).toMatchObject({ email: EMAIL, purpose: 'password-reset' })
      expect(pending.scenarioCode?.note).toBe('synthetic-mock-scenario')
      expect(code).toMatch(/^\d{6}$/)
      receipts.push({
        email: pending.email,
        purpose: pending.purpose,
        expiresIn: pending.expiresAt - persona.harness.now(),
        resendIn: pending.resendAvailableAt - persona.harness.now(),
        resendCount: pending.resendCount,
        sendCount: pending.sendCount,
        remainingSends: pending.remainingSends,
        revision: pending.revision,
        codeDigits: code?.length,
        codeNote: pending.scenarioCode?.note,
      })

      const verification = await persona.harness.services.passwordReset.verify({
        requestId: pending.id,
        code: code ?? '',
        operationId: operationId(`neutral-verify-${persona.kind.replaceAll(' ', '-')}-400002`),
      })
      expect(verification.status).toBe(persona.eligible ? 'ok' : 'error')
      if (!persona.eligible) expect(verification).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })
    }

    expect(new Set(receipts.map((receipt) => JSON.stringify(receipt))).size).toBe(1)
  })

  it('binds proof to reset purpose, request, identity, and issuing client', async () => {
    const owner = createServiceTestHarness()
    const ownerAccount = await registerPasswordAccount(owner, 'reset-owner@example.test', 'reset-binding-owner')
    await registerPasswordAccount(owner, 'reset-other@example.test', 'reset-binding-other')

    const ownerRequest = expectOk(await owner.services.passwordReset.start({
      email: 'reset-owner@example.test',
      operationId: operationId('reset-binding-owner-start-111111'),
    }))
    const otherRequest = expectOk(await owner.services.passwordReset.start({
      email: 'reset-other@example.test',
      operationId: operationId('reset-binding-other-start-222222'),
    }))
    expect(ownerRequest.scenarioCode?.value).not.toBe(otherRequest.scenarioCode?.value)

    const registrationRequestId = operationId('reset-binding-registration-333333')
    const registrationRequest = expectOk(await owner.services.registration.start({
      email: 'reset-unverified-purpose@example.test',
      password: 'pending-password-8',
      operationId: registrationRequestId,
    }))
    expect(await owner.services.passwordReset.verify({
      requestId: registrationRequest.id,
      code: owner.verificationCode(registrationRequest.id),
      operationId: operationId('reset-binding-wrong-purpose-444444'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })
    expect(await owner.services.registration.verify({
      requestId: ownerRequest.id,
      code: ownerRequest.scenarioCode?.value ?? '',
      operationId: operationId('reset-binding-registration-rejects-reset-555555'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })
    expect(await owner.services.passwordReset.verify({
      requestId: otherRequest.id,
      code: ownerRequest.scenarioCode?.value ?? '',
      operationId: operationId('reset-binding-wrong-identity-666666'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })

    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: 'reset-proof-other-client',
    })
    expectResolutionState(await otherClient.services.passwordReset.resolve({ requestId: ownerRequest.id }), 'not-found')
    expect(await otherClient.services.passwordReset.verify({
      requestId: ownerRequest.id,
      code: ownerRequest.scenarioCode?.value ?? '',
      operationId: operationId('reset-binding-other-client-verify-777777'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })

    const ownerGrant = expectOk(await owner.services.passwordReset.verify({
      requestId: ownerRequest.id,
      code: ownerRequest.scenarioCode?.value ?? '',
      operationId: operationId('reset-binding-valid-verify-888888'),
    }))
    expect(await otherClient.services.passwordReset.complete({
      resetGrantId: ownerGrant.resetGrantId,
      newPassword: 'owner-new-password-8',
      operationId: operationId('reset-binding-other-client-complete-999999'),
    })).toMatchObject({ status: 'error', error: { code: 'expired' } })

    const completed = expectOk(await owner.services.passwordReset.complete({
      resetGrantId: ownerGrant.resetGrantId,
      newPassword: 'owner-new-password-8',
      operationId: operationId('reset-binding-owner-complete-101010'),
    }))
    expect(completed.account.id).toBe(ownerAccount.account.id)
  })

  it('rejects replaced and expired proof, including a grant that expires after verification', async () => {
    const harness = createServiceTestHarness()
    await registerPasswordAccount(harness, EMAIL, 'reset-expiry')

    const replacedRequest = expectOk(await harness.services.passwordReset.start({
      email: EMAIL,
      operationId: operationId('reset-replaced-start-110001'),
    }))
    const oldCode = replacedRequest.scenarioCode?.value ?? ''
    harness.advance(60_000)
    const replacement = expectOk(await harness.services.passwordReset.resend({
      requestId: replacedRequest.id,
      operationId: operationId('reset-replaced-resend-110002'),
    }))
    const currentCode = replacement.scenarioCode?.value ?? ''
    expect(currentCode).not.toBe(oldCode)
    expect(await harness.services.passwordReset.verify({
      requestId: replacedRequest.id,
      code: oldCode,
      operationId: operationId('reset-replaced-old-code-110003'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })

    const beforeExpiredCompletion = expectOk(await harness.services.identity.current())
    const grant = expectOk(await harness.services.passwordReset.verify({
      requestId: replacedRequest.id,
      code: currentCode,
      operationId: operationId('reset-replaced-current-code-110004'),
    }))
    harness.advance(grant.expiresAt - harness.now())
    expect(await harness.services.passwordReset.complete({
      resetGrantId: grant.resetGrantId,
      newPassword: 'expired-reset-password-8',
      operationId: operationId('reset-expired-grant-complete-110005'),
    })).toMatchObject({ status: 'error', error: { code: 'expired' } })
    expectResolutionState(await harness.services.passwordReset.resolve({ requestId: replacedRequest.id }), 'expired')
    expect(expectOk(await harness.services.identity.current())?.session.id).toBe(beforeExpiredCompletion?.session.id)

    const expiredRequest = expectOk(await harness.services.passwordReset.start({
      email: EMAIL,
      operationId: operationId('reset-pending-expired-start-120001'),
    }))
    harness.advance(expiredRequest.expiresAt - harness.now())
    expect(await harness.services.passwordReset.verify({
      requestId: expiredRequest.id,
      code: expiredRequest.scenarioCode?.value ?? '',
      operationId: operationId('reset-pending-expired-verify-120002'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })
    expectResolutionState(await harness.services.passwordReset.resolve({ requestId: expiredRequest.id }), 'expired')
  })

  it('reconciles an uncertain completion once, starts a 30-day session, and revokes the other client', async () => {
    const owner = createServiceTestHarness()
    const registered = await registerPasswordAccount(owner, EMAIL, 'reset-completion')
    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: 'reset-completion-other-client',
    })
    expectOk(await otherClient.services.identity.signIn({
      email: EMAIL,
      password: 'existing-password-8',
      operationId: operationId('reset-completion-other-signin-130001'),
    }))
    const otherSession = expectOk(await otherClient.services.identity.current())
    expect(otherSession?.account.id).toBe(registered.account.id)

    const pending = expectOk(await owner.services.passwordReset.start({
      email: EMAIL,
      operationId: operationId('reset-completion-start-130002'),
    }))
    const grant = expectOk(await owner.services.passwordReset.verify({
      requestId: pending.id,
      code: pending.scenarioCode?.value ?? '',
      operationId: operationId('reset-completion-verify-130003'),
    }))
    const completionId = operationId('reset-completion-unknown-130004')
    await owner.queueUnknown(completionId)
    expect(await owner.services.passwordReset.complete({
      resetGrantId: grant.resetGrantId,
      newPassword: 'new-reset-password-8',
      operationId: completionId,
    })).toMatchObject({ status: 'unknown', operationId: completionId })

    expectResolutionState(await owner.services.passwordReset.resolve({ requestId: pending.id }), 'completed')
    const current = expectOk(await owner.services.identity.current())
    expect(current?.session.expiresAt).toBe(owner.now() + THIRTY_DAYS_MS)
    expect(current?.session.id).not.toBe(otherSession?.session.id)
    expect(expectOk(await otherClient.services.identity.current())).toBeNull()

    expect(await owner.services.passwordReset.complete({
      resetGrantId: grant.resetGrantId,
      newPassword: 'new-reset-password-8',
      operationId: completionId,
    })).toMatchObject({ status: 'ok', replayed: true })
    expect(expectOk(await owner.services.identity.current())?.session.id).toBe(current?.session.id)
    expect(await owner.services.passwordReset.complete({
      resetGrantId: grant.resetGrantId,
      newPassword: 'another-reset-password-8',
      operationId: operationId('reset-completion-reuse-grant-130005'),
    })).toMatchObject({ status: 'error', error: { code: 'expired' } })
    expect(await sessionsFor(owner)).toEqual([current?.session])
  })
})
