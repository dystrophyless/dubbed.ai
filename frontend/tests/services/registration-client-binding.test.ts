import { describe, expect, it } from 'vitest'
import { mockScenarioVerificationCode } from '../../src/services/mock-identity'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

describe('registration request client binding', () => {
  it('keeps recovery and every mutation on the initiating client, including operation replays', async () => {
    const owner = createServiceTestHarness()
    const requestId = operationId('registration-owner-101')
    const startInput = { email: 'bound-registration@example.test', password: 'correct-horse', operationId: requestId }
    const started = expectOk(await owner.services.registration.start(startInput))
    const reloadedOwner = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: owner.clientId,
      startTime: owner.now(),
    })
    expect(expectOk(await reloadedOwner.services.registration.resolve({ requestId }))).toMatchObject({
      id: requestId,
      email: startInput.email,
      scenarioCode: started.scenarioCode,
    })

    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: 'registration-client-foreign',
      startTime: owner.now(),
    })
    expect(await otherClient.services.registration.start(startInput)).toMatchObject({
      status: 'error', error: { code: 'not-found' },
    })
    expect(expectOk(await otherClient.services.registration.resolve({ requestId }))).toEqual({ state: 'not-found' })
    expect(await otherClient.services.registration.resend({
      requestId,
      operationId: operationId('registration-foreign-resend'),
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(await otherClient.services.registration.correctEmail({
      requestId,
      email: 'attacker@example.test',
      password: startInput.password,
      operationId: operationId('registration-foreign-correct-email'),
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(await otherClient.services.registration.verify({
      requestId,
      code: owner.verificationCode(requestId),
      operationId: operationId('registration-foreign-verify'),
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(expectOk(await owner.services.registration.resolve({ requestId }))).toMatchObject({
      id: requestId, email: startInput.email, scenarioCode: started.scenarioCode,
    })
    expect(expectOk(await otherClient.services.identity.current())).toBeNull()

    owner.advance(60_000)
    reloadedOwner.advance(60_000)
    const resendId = operationId('registration-owner-resend')
    const resent = expectOk(await reloadedOwner.services.registration.resend({ requestId, operationId: resendId }))
    expect(resent).toMatchObject({ id: requestId, resendCount: 1 })
    expect(resent.scenarioCode?.value).not.toBe(started.scenarioCode?.value)
    expect(await otherClient.services.registration.resend({ requestId, operationId: resendId })).toMatchObject({
      status: 'error', error: { code: 'not-found' },
    })

    owner.advance(60_000)
    reloadedOwner.advance(60_000)
    const correctionId = operationId('registration-owner-correct-email')
    const corrected = expectOk(await reloadedOwner.services.registration.correctEmail({
      requestId,
      email: 'corrected-registration@example.test',
      password: startInput.password,
      operationId: correctionId,
    }))
    expect(corrected).toMatchObject({ email: 'corrected-registration@example.test' })
    expect(corrected.scenarioCode?.value).not.toBe(resent.scenarioCode?.value)
    expect(await otherClient.services.registration.correctEmail({
      requestId,
      email: 'corrected-registration@example.test',
      password: startInput.password,
      operationId: correctionId,
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })

    const verifyId = operationId('registration-owner-verify')
    const verified = await reloadedOwner.services.registration.verify({
      requestId,
      code: mockScenarioVerificationCode(requestId, 2),
      operationId: verifyId,
    })
    expect(verified).toMatchObject({ status: 'ok', data: { account: { email: corrected.email }, welcomeGrantApplied: true } })
    expect(await otherClient.services.registration.verify({
      requestId,
      code: mockScenarioVerificationCode(requestId, 2),
      operationId: verifyId,
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })

    const sameClientReplay = await owner.services.registration.verify({
      requestId,
      code: mockScenarioVerificationCode(requestId, 2),
      operationId: verifyId,
    })
    expect(sameClientReplay).toMatchObject({ status: 'ok', replayed: true, data: { welcomeGrantApplied: true } })
    expect(expectOk(await reloadedOwner.services.credits.history()).filter((entry) => entry.kind === 'welcome-grant')).toHaveLength(1)
    expect(expectOk(await otherClient.services.identity.current())).toBeNull()
  })

  it('requires another client to start a fresh request and expires the prior code', async () => {
    const owner = createServiceTestHarness()
    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: 'registration-client-new-device',
      startTime: owner.now(),
    })
    const email = 'fresh-device-registration@example.test'
    const password = 'correct-horse'
    const firstId = operationId('registration-first-device-012345')
    const first = expectOk(await owner.services.registration.start({ email, password, operationId: firstId }))

    owner.advance(60_000)
    otherClient.advance(60_000)
    const secondId = operationId('registration-second-device-543210')
    const second = expectOk(await otherClient.services.registration.start({ email, password, operationId: secondId }))
    expect(second.id).not.toBe(first.id)
    expect(second.scenarioCode?.value).not.toBe(first.scenarioCode?.value)
    expect(expectOk(await owner.services.registration.resolve({ requestId: firstId }))).toEqual({ state: 'expired' })
    expect(expectOk(await otherClient.services.registration.resolve({ requestId: firstId }))).toEqual({ state: 'not-found' })
    expect(expectOk(await owner.services.registration.resolve({ requestId: secondId }))).toEqual({ state: 'not-found' })
    expect(expectOk(await otherClient.services.registration.resolve({ requestId: secondId }))).toMatchObject({ id: secondId, email })
    expect(await owner.services.registration.verify({
      requestId: firstId,
      code: first.scenarioCode?.value ?? '',
      operationId: operationId('registration-first-device-stale-code'),
    })).toMatchObject({ status: 'error', error: { code: 'invalid-code' } })
    expect(await owner.services.registration.verify({
      requestId: secondId,
      code: otherClient.verificationCode(secondId),
      operationId: operationId('registration-first-device-cannot-verify'),
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })

    expect(await otherClient.services.registration.verify({
      requestId: secondId,
      code: otherClient.verificationCode(secondId),
      operationId: operationId('registration-second-device-verify'),
    })).toMatchObject({ status: 'ok', data: { account: { email }, welcomeGrantApplied: true } })
    expect(expectOk(await owner.services.identity.current())).toBeNull()
    expect(expectOk(await otherClient.services.credits.history()).filter((entry) => entry.kind === 'welcome-grant')).toHaveLength(1)
  })

  it('does not let a fresh request reset the per-hour send budget', async () => {
    const owner = createServiceTestHarness()
    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: 'registration-client-budget-check',
      startTime: owner.now(),
    })
    const requestId = operationId('registration-budget-owner')
    expectOk(await owner.services.registration.start({
      email: 'registration-budget@example.test',
      password: 'correct-horse',
      operationId: requestId,
    }))

    for (let send = 1; send < 5; send += 1) {
      owner.advance(60_000)
      expectOk(await owner.services.registration.resend({
        requestId,
        operationId: operationId(`registration-budget-resend-${send}`),
      }))
    }
    const cappedStart = await otherClient.services.registration.start({
      email: 'registration-budget@example.test',
      password: 'correct-horse',
      operationId: operationId('registration-budget-new-request-capped'),
    })
    expect(cappedStart).toMatchObject({ status: 'error', error: { code: 'rate-limited' } })
    expect(expectOk(await owner.services.registration.resolve({ requestId }))).toMatchObject({
      sendCount: 5, remainingSends: 0,
    })

    owner.advance(3_600_001)
    otherClient.advance(owner.now() - otherClient.now() + 3_600_001)
    const afterWindow = expectOk(await otherClient.services.registration.start({
      email: 'registration-budget@example.test',
      password: 'correct-horse',
      operationId: operationId('registration-budget-new-request-after-window'),
    }))
    expect(afterWindow.sendCount).toBe(1)
  })
})
