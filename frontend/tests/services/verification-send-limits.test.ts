import { describe, expect, it } from 'vitest'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

describe('synthetic verification send limits', () => {
  it('counts the initial registration email, replaces codes, and enforces five sends per mock rolling hour', async () => {
    const harness = createServiceTestHarness()
    const request = expectOk(await harness.services.registration.start({
      email: 'send-limit@example.test',
      password: 'long-enough-password',
      operationId: operationId('send-limit-registration-start'),
    }))

    expect(request).toMatchObject({
      sendCount: 1,
      remainingSends: 4,
      resendCount: 0,
      expiresAt: harness.now() + 10 * 60 * 1000,
    })
    const initialCode = request.scenarioCode?.value

    let latest = request
    for (let send = 1; send < 5; send += 1) {
      harness.advance(60_000)
      latest = expectOk(await harness.services.registration.resend({
        requestId: request.id,
        operationId: operationId(`send-limit-registration-resend-${send}`),
      }))
      expect(latest.sendCount).toBe(send + 1)
      expect(latest.remainingSends).toBe(4 - send)
      expect(latest.resendCount).toBe(send)
      expect(latest.scenarioCode?.value).not.toBe(initialCode)
      expect(latest.expiresAt).toBe(harness.now() + 10 * 60 * 1000)
    }

    harness.advance(60_000)
    const capped = await harness.services.registration.resend({
      requestId: request.id,
      operationId: operationId('send-limit-registration-resend-six'),
    })
    expect(capped.status).toBe('error')
    const registrationState = expectOk(await harness.services.registration.resolve({ requestId: request.id }))
    expect('remainingSends' in registrationState && registrationState.remainingSends).toBe(0)

    const staleCode = await harness.services.registration.verify({
      requestId: request.id,
      code: initialCode!,
      operationId: operationId('send-limit-registration-stale-code'),
    })
    expect(staleCode.status).toBe('error')

    // Mock-only boundary choice: a send exactly 60 minutes old has left the rolling window.
    harness.advance(3_300_000)
    const afterWindow = expectOk(await harness.services.registration.resend({
      requestId: request.id,
      operationId: operationId('send-limit-registration-after-window'),
    }))
    expect(afterWindow).toMatchObject({ sendCount: 5, remainingSends: 0, resendCount: 5 })
  })

  it('applies the same authoritative send cap and replacement-code rule to password reset', async () => {
    const harness = createServiceTestHarness()
    const request = expectOk(await harness.services.passwordReset.start({
      email: 'reset-limit@example.test',
      operationId: operationId('send-limit-reset-start'),
    }))
    expect(request).toMatchObject({ sendCount: 1, remainingSends: 4 })
    const initialCode = request.scenarioCode?.value

    let latest = request
    for (let send = 1; send < 5; send += 1) {
      harness.advance(60_000)
      latest = expectOk(await harness.services.passwordReset.resend({
        requestId: request.id,
        operationId: operationId(`send-limit-reset-resend-${send}`),
      }))
    }
    expect(latest).toMatchObject({ sendCount: 5, remainingSends: 0, resendCount: 4 })
    expect(latest.scenarioCode?.value).not.toBe(initialCode)

    harness.advance(60_000)
    const capped = await harness.services.passwordReset.resend({
      requestId: request.id,
      operationId: operationId('send-limit-reset-resend-six'),
    })
    expect(capped.status).toBe('error')
    const resetState = expectOk(await harness.services.passwordReset.resolve({ requestId: request.id }))
    expect('remainingSends' in resetState && resetState.remainingSends).toBe(0)
  })
})
