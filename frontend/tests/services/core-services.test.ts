import { describe, expect, it } from 'vitest'
import { createServices, ServiceAdapterUnavailableError } from '../../src/services'
import { IDBFactory } from 'fake-indexeddb'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function register(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId(`register-${email}`)
  const started = await harness.services.registration.start({ email, password: 'correct-horse', operationId: requestId })
  expect(started.status).toBe('ok')
  return { requestId, started: expectOk(started) }
}

describe('service factory and persistent identity/upload services', () => {
  it('defaults to the mock adapter and refuses explicit real mode without fallback', () => {
    const services = createServices({ indexedDB: new IDBFactory(), namespace: `factory-${crypto.randomUUID()}` })
    expect(services.identity).toBeDefined()
    expect(services.workspace).toBeDefined()
    expect(() => createServices({ adapter: 'real', indexedDB: new IDBFactory() })).toThrow(ServiceAdapterUnavailableError)
    try {
      createServices({ adapter: 'real', indexedDB: new IDBFactory() })
    } catch (error) {
      expect(error).toMatchObject({ code: 'adapter-unavailable' })
    }
  })

  it('reconciles an unknown anonymous registration and grants only after proof', async () => {
    const harness = createServiceTestHarness()
    const requestId = operationId('register-unknown-1')
    await harness.queueUnknown(requestId)

    const started = await harness.services.registration.start({ email: 'new@example.test', password: 'correct-horse', operationId: requestId })
    expect(started.status).toBe('unknown')
    expect(expectOk(await harness.services.identity.current())).toBeNull()
    const pending = expectOk(await harness.services.registration.resolve({ requestId }))
    expect(pending).toMatchObject({ id: requestId, email: 'new@example.test', purpose: 'registration' })

    const verifyId = operationId('verify-unknown-1')
    await harness.queueUnknown(verifyId)
    const verified = await harness.services.registration.verify({
      requestId,
      code: harness.verificationCode(requestId),
      operationId: verifyId,
    })
    expect(verified.status).toBe('unknown')
    expect(expectOk(await harness.services.registration.resolve({ requestId }))).toEqual({ state: 'completed' })
    const current = expectOk(await harness.services.identity.current())
    expect(current?.account.email).toBe('new@example.test')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 120, welcomeGrantApplied: true })

    const replay = expectOk(await harness.services.registration.verify({
      requestId,
      code: harness.verificationCode(requestId),
      operationId: verifyId,
    }))
    expect(replay.welcomeGrantApplied).toBe(true)
    const ledger = expectOk(await harness.services.credits.history())
    expect(ledger.filter((entry) => entry.kind === 'welcome-grant')).toHaveLength(1)
  })

  it('persists uploaded source bytes across service recreation and fingerprints same-sized payloads', async () => {
    const harness = createServiceTestHarness()
    const { requestId } = await register(harness, 'upload@example.test')
    const verify = await harness.services.registration.verify({
      requestId,
      code: harness.verificationCode(requestId),
      operationId: operationId('verify-upload'),
    })
    expect(verify.status).toBe('ok')

    const uploadOperation = operationId('upload-bytes')
    const fileA = fileWithBytes('dialogue.mp4', [1, 2, 3, 4])
    await harness.queueUnknown(uploadOperation)
    const first = await harness.services.uploads.commitInitial({ file: fileA, facts: sourceFacts(), operationId: uploadOperation })
    expect(first.status).toBe('unknown')
    const replay = expectOk(await harness.services.uploads.commitInitial({ file: fileA, facts: sourceFacts(), operationId: uploadOperation }))
    const uploaded = replay
    expect(await uploaded.source.byteLength).toBe(fileA.size)

    const reloaded = createServices({
      adapter: 'mock',
      indexedDB: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      clock: { now: harness.now },
    })
    const persisted = expectOk(await reloaded.uploads.getSource(uploaded.project.id))
    expect([...new Uint8Array(await persisted.blob.arrayBuffer())]).toEqual([1, 2, 3, 4])

    const sameSizeDifferentBytes = await reloaded.uploads.commitInitial({
      file: fileWithBytes('dialogue.mp4', [9, 8, 7, 6]),
      facts: sourceFacts(),
      operationId: uploadOperation,
    })
    expect(sameSizeDifferentBytes.status).toBe('conflict')
  })

  it('enforces the minimum password length for registration, account changes, and reset', async () => {
    const harness = createServiceTestHarness()
    const shortRegistration = await harness.services.registration.start({
      email: 'password-boundary@example.test',
      password: '1234567',
      operationId: operationId('register-short-password'),
    })
    expect(shortRegistration).toMatchObject({ status: 'error', error: { code: 'validation' } })

    const correctionRequestId = operationId('register-email-correction')
    expectOk(await harness.services.registration.start({
      email: 'correction-source@example.test',
      password: '12345678',
      operationId: correctionRequestId,
    }))
    expect(await harness.services.registration.correctEmail({
      requestId: correctionRequestId,
      email: 'correction-target@example.test',
      password: '1234567',
      operationId: operationId('correct-email-short-password'),
    })).toMatchObject({ status: 'error', error: { code: 'validation' } })

    const requestId = operationId('register-valid-password')
    expectOk(await harness.services.registration.start({
      email: 'password-boundary@example.test',
      password: '12345678',
      operationId: requestId,
    }))
    expectOk(await harness.services.registration.verify({
      requestId,
      code: harness.verificationCode(requestId),
      operationId: operationId('verify-valid-password'),
    }))

    const current = expectOk(await harness.services.identity.current())
    expect(current).not.toBeNull()
    const shortChange = await harness.services.account.changePassword({
      currentPassword: '12345678',
      newPassword: '1234567',
      expectedRevision: current!.account.revision,
      operationId: operationId('change-short-password'),
    })
    expect(shortChange).toMatchObject({ status: 'error', error: { code: 'validation' } })
    expectOk(await harness.services.account.changePassword({
      currentPassword: '12345678',
      newPassword: 'abcdefgh',
      expectedRevision: current!.account.revision,
      operationId: operationId('change-eight-character-password'),
    }))

    const resetRequestId = operationId('reset-password-boundary')
    const resetRequest = expectOk(await harness.services.passwordReset.start({
      email: 'password-boundary@example.test',
      operationId: resetRequestId,
    }))
    const resetGrant = expectOk(await harness.services.passwordReset.verify({
      requestId: resetRequest.id,
      code: harness.verificationCode(resetRequest.id),
      operationId: operationId('verify-reset-password-boundary'),
    }))
    const shortReset = await harness.services.passwordReset.complete({
      resetGrantId: resetGrant.resetGrantId,
      newPassword: '1234567',
      operationId: operationId('complete-short-reset-password'),
    })
    expect(shortReset).toMatchObject({ status: 'error', error: { code: 'validation' } })
    expectOk(await harness.services.passwordReset.complete({
      resetGrantId: resetGrant.resetGrantId,
      newPassword: '12345678',
      operationId: operationId('complete-eight-character-reset-password'),
    }))
  })
})
