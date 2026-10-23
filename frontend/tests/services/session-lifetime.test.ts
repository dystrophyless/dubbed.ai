import { describe, expect, it } from 'vitest'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

const DAY_MS = 24 * 60 * 60 * 1000
const SESSION_LIFETIME_MS = 30 * DAY_MS

async function registerAndSignIn(harness: ReturnType<typeof createServiceTestHarness>) {
  const requestId = operationId('register-session-lifetime')
  expectOk(await harness.services.registration.start({
    email: 'session-lifetime@example.test',
    password: 'correct-horse',
    operationId: requestId,
  }))
  return expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId('verify-session-lifetime'),
  }))
}

describe('mock session lifetime', () => {
  it('expires at the fixed 30-day sign-in point without sliding on activity', async () => {
    const signedInAt = 1_800_000_000_000
    const harness = createServiceTestHarness({ startTime: signedInAt })
    const verified = await registerAndSignIn(harness)
    const expiresAt = signedInAt + SESSION_LIFETIME_MS

    expect(verified.session.expiresAt).toBe(expiresAt)

    harness.advance(7 * DAY_MS)
    expect(expectOk(await harness.services.identity.current())?.session.expiresAt).toBe(expiresAt)

    harness.advance(22 * DAY_MS)
    expect(expectOk(await harness.services.identity.current())?.session.expiresAt).toBe(expiresAt)

    harness.advance(DAY_MS - 1)
    expect(harness.now()).toBe(expiresAt - 1)
    expect(expectOk(await harness.services.identity.current())?.session.expiresAt).toBe(expiresAt)

    harness.advance(1)
    expect(harness.now()).toBe(expiresAt)
    expect(await harness.services.identity.current()).toMatchObject({
      status: 'error',
      error: { code: 'expired', retry: 'none' },
    })
  })

  it('ends the session immediately on explicit sign-out', async () => {
    const harness = createServiceTestHarness()
    await registerAndSignIn(harness)

    expectOk(await harness.services.identity.signOut({ operationId: operationId('sign-out-session-lifetime') }))
    expect(expectOk(await harness.services.identity.current())).toBeNull()
  })
})
