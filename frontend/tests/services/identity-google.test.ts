import { describe, expect, it } from 'vitest'
import type { GoogleIdentityResult, MockGoogleScenario } from '../../src/services/contracts'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

const syntheticGoogleEmail = 'google-preview@example.invalid'

function expectAuthenticated(result: GoogleIdentityResult) {
  if (result.state !== 'completed' || !result.account || !result.session) {
    throw new Error(`Expected completed Google authentication, got ${JSON.stringify(result)}.`)
  }
  return {
    account: result.account,
    session: result.session,
    destination: result.destination,
    welcomeGrantApplied: result.welcomeGrantApplied,
  }
}

async function registerPasswordAccount(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId('google-same-email-registration-start')
  const pending = expectOk(await harness.services.registration.start({
    email,
    password: 'local-password-8',
    operationId: requestId,
  }))
  return expectOk(await harness.services.registration.verify({
    requestId: pending.id,
    code: harness.verificationCode(pending.id),
    operationId: operationId('google-same-email-registration-verify'),
  }))
}

describe('ordinary synthetic Google identity outcomes', () => {
  it('creates an eligible Google registration once, then signs in to the same account without another grant', async () => {
    const harness = createServiceTestHarness()
    const input = {
      purpose: 'registration' as const,
      intentId: operationId('google-first-registration-intent'),
      operationId: operationId('google-first-registration'),
    }
    const firstResult = expectOk(await harness.services.identity.google(input))
    const first = expectAuthenticated(firstResult)

    expect(firstResult).toMatchObject({
      purpose: 'registration',
      note: 'synthetic-mock-scenario',
      verifiedAddress: syntheticGoogleEmail,
      welcomeGrantApplied: true,
    })
    expect(first.account.email).toBe(syntheticGoogleEmail)
    expect(first.destination).toEqual({ kind: 'new-dub' })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: 120,
      welcomeGrantApplied: true,
    })

    expectOk(await harness.services.identity.signOut({ operationId: operationId('google-first-signout') }))
    const signedInResult = expectOk(await harness.services.identity.google({
      purpose: 'sign-in',
      intentId: operationId('google-first-signin-intent'),
      destination: { kind: 'new-dub' },
      operationId: operationId('google-first-signin'),
    }))
    const signedIn = expectAuthenticated(signedInResult)
    expect(signedIn.account.id).toBe(first.account.id)
    expect(signedIn.welcomeGrantApplied).toBe(false)
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: 120,
      welcomeGrantApplied: true,
    })
  })

  it('auto-links only an exact verified canonical email and preserves that account and grant history', async () => {
    const harness = createServiceTestHarness()
    const original = await registerPasswordAccount(harness, syntheticGoogleEmail)
    expect(original.welcomeGrantApplied).toBe(true)
    expectOk(await harness.services.identity.signOut({ operationId: operationId('google-link-signout') }))

    const linkedResult = expectOk(await harness.services.identity.google({
      purpose: 'sign-in',
      intentId: operationId('google-same-email-intent'),
      operationId: operationId('google-same-email-signin'),
    }))
    const linked = expectAuthenticated(linkedResult)
    expect(linked.account.id).toBe(original.account.id)
    expect(linked.account.email).toBe(syntheticGoogleEmail)
    expect(linked.welcomeGrantApplied).toBe(false)
    expect(expectOk(await harness.services.account.load())).toMatchObject({
      email: syntheticGoogleEmail,
      methods: expect.arrayContaining([
        expect.objectContaining({ kind: 'email-password', address: syntheticGoogleEmail, verified: true }),
        expect.objectContaining({ kind: 'google', address: syntheticGoogleEmail, verified: true }),
      ]),
    })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 120, welcomeGrantApplied: true })

    expectOk(await harness.services.identity.signOut({ operationId: operationId('google-linked-signout') }))
    const duplicateRegistration = expectOk(await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId('google-existing-registration-intent'),
      operationId: operationId('google-existing-registration'),
    }))
    expect(duplicateRegistration.state).toBe('completed')
    expect(duplicateRegistration.account?.id).toBe(original.account.id)
    expect(duplicateRegistration.welcomeGrantApplied).toBe(false)
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 120, welcomeGrantApplied: true })
  })

  it('does not grant again when a deleted synthetic Google account is registered again', async () => {
    const harness = createServiceTestHarness()
    const firstResult = expectOk(await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId('google-delete-first-intent'),
      operationId: operationId('google-delete-first'),
    }))
    const first = expectAuthenticated(firstResult)
    expect(first.welcomeGrantApplied).toBe(true)

    const settings = expectOk(await harness.services.account.load())
    expectOk(await harness.services.account.delete({
      confirmation: 'delete',
      locale: 'en',
      expectedRevision: settings.revision,
      operationId: operationId('google-delete-account'),
    }))
    expect(expectOk(await harness.services.identity.current())).toBeNull()

    const restoredResult = expectOk(await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId('google-delete-recreate-intent'),
      operationId: operationId('google-delete-recreate'),
    }))
    const restored = expectAuthenticated(restoredResult)
    expect(restored.account.id).not.toBe(first.account.id)
    expect(restored.account.email).toBe(syntheticGoogleEmail)
    expect(restored.welcomeGrantApplied).toBe(false)
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: 0,
      welcomeGrantApplied: false,
    })
  })

  it.each([
    ['cancelled', 'canceled'],
    ['denied', 'denied'],
    ['conflict', 'conflict'],
    ['link-required', 'link-required'],
  ] as const)('returns the configured %s outcome without an account, session, or grant', async (scenario, state) => {
    const harness = createServiceTestHarness({ googleScenario: scenario as MockGoogleScenario })
    const result = expectOk(await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId(`google-${scenario}-intent`),
      operationId: operationId(`google-${scenario}`),
    }))

    expect(result).toMatchObject({ purpose: 'registration', state, welcomeGrantApplied: false, note: 'synthetic-mock-scenario' })
    expect(result.account).toBeUndefined()
    expect(result.session).toBeUndefined()
    expect(expectOk(await harness.services.identity.current())).toBeNull()
  })

  it('does not create an account when Google is used from sign-in with no matching local account', async () => {
    const harness = createServiceTestHarness()
    const result = expectOk(await harness.services.identity.google({
      purpose: 'sign-in',
      intentId: operationId('google-empty-signin-intent'),
      operationId: operationId('google-empty-signin'),
    }))

    expect(result).toMatchObject({ state: 'account-not-found', welcomeGrantApplied: false, note: 'synthetic-mock-scenario' })
    expect(expectOk(await harness.services.identity.current())).toBeNull()
  })

  it('reconciles a committed registration response loss in the same local client', async () => {
    const harness = createServiceTestHarness()
    const operation = operationId('google-unknown-after-commit')
    await harness.queueUnknown(operation)
    const result = await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId('google-unknown-intent'),
      operationId: operation,
    })
    expect(result).toMatchObject({ status: 'unknown', operationId: operation })

    const current = expectOk(await harness.services.identity.current())
    expect(current?.account.email).toBe(syntheticGoogleEmail)
    const replay = await harness.services.identity.google({
      purpose: 'registration',
      intentId: operationId('google-unknown-intent'),
      operationId: operation,
    })
    expect(replay).toMatchObject({ status: 'ok', replayed: true, data: { state: 'completed', welcomeGrantApplied: true } })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 120 })
  })
})
