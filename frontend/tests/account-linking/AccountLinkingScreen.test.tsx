import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '../../src/app/routes'
import { LocaleProvider } from '../../src/app/locale'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import type { AccountSettingsSnapshot, LinkIntentSnapshot, OperationId, Revision, Services, Session } from '../../src/services/contracts'
import { AccountLinkingScreen } from '../../src/features/account-linking/AccountLinkingScreen'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function makeAccount(currentMethod: 'google' | 'email-password' = 'google') {
  return {
    id: 'account-one', email: 'owner@gmail.test', locale: 'en', revision: 5 as Revision,
    deleted: false, createdAt: 1, methods: [
      { kind: currentMethod, address: 'owner@gmail.test', verified: true, linkedAt: 1 },
    ], deletionEligible: true, purchasedRemainder: 0, note: 'synthetic-mock-scenario',
  } as AccountSettingsSnapshot
}

function makeIntent(account: AccountSettingsSnapshot): LinkIntentSnapshot {
  const currentMethod = account.methods[0]?.kind ?? 'google'
  const candidateMethod = currentMethod === 'google' ? 'email-password' : 'google'
  return {
    id: 'link-intent-one' as OperationId,
    accountId: account.id,
    currentMethod,
    candidate: candidateMethod === 'email-password'
      ? { method: 'email-password', address: 'new@example.test' }
      : { method: 'google' },
    expectedAccountRevision: account.revision,
    ...(candidateMethod === 'email-password' ? {
      candidateVerificationRequestId: 'verification-one' as OperationId,
      candidateScenarioCode: { value: '482913', note: 'synthetic-mock-scenario' as const },
    } : {}),
    expiresAt: Date.now() + 60_000,
    state: 'pending',
    note: 'synthetic-mock-scenario',
  }
}

function makeHarness(currentMethod: 'google' | 'email-password' = 'google') {
  const account = makeAccount(currentMethod)
  const session = { id: 'session-one', accountId: account.id, expiresAt: Date.now() + 60_000, revision: 2 } as unknown as Session
  const intent = makeIntent(account)
  const start = vi.fn().mockResolvedValue(ok(intent))
  const currentIdentity = vi.fn(async () => ok({ account, session }) as Awaited<ReturnType<Services['identity']['current']>>)
  const proveCurrent = vi.fn(async () => ok({ proofId: 'current-proof' as OperationId, method: currentMethod, expiresAt: Date.now() + 60_000, note: 'synthetic-mock-scenario' as const }) as Awaited<ReturnType<Services['accountLinking']['proveCurrent']>>)
  const services = {
    account: { load: vi.fn().mockResolvedValue(ok(account)) },
    accountLinking: {
      start,
      proveCurrent,
      proveCandidate: vi.fn().mockResolvedValue(ok({ proofId: 'candidate-proof' as OperationId, candidate: { method: 'email-password' as const, address: 'new@example.test' }, expiresAt: Date.now() + 60_000, note: 'synthetic-mock-scenario' as const })),
      commit: vi.fn().mockResolvedValue(ok({ state: 'completed' as const, account, methods: [...account.methods, { kind: 'email-password' as const, address: 'new@example.test', verified: true, linkedAt: 2 }] })),
      resolve: vi.fn(),
      cancel: vi.fn(),
      resendCandidate: vi.fn(),
    },
    identity: {
      current: currentIdentity,
      google: vi.fn().mockResolvedValue(ok({ state: 'completed' as const, providerProofId: 'provider-proof' as OperationId, linkStep: 'current' as const, note: 'synthetic-mock-scenario' as const })),
    },
    operations: { resolve: vi.fn() },
  } as unknown as Services
  const props = {
    route: routes.accountLinking(), locale: 'en', identity: { status: 'signed-in', account, session },
    signInIntent: { kind: 'new-dub' }, services, navigate: vi.fn().mockResolvedValue(true),
    refreshIdentity: vi.fn().mockResolvedValue({ status: 'signed-in', account, session }),
    registerRouteExitGuard: vi.fn(),
  } as unknown as FeatureScreenProps
  render(
    <LocaleProvider account={account} services={services} onAccountUpdated={vi.fn()}>
      <AccountLinkingScreen {...props} />
    </LocaleProvider>,
  )
  return { account, session, intent, services, start, currentIdentity, proveCurrent }
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => vi.restoreAllMocks())

describe('AccountLinkingScreen', () => {
  it('requires current and candidate proof before explicit commit', async () => {
    const harness = makeHarness()
    await screen.findByRole('heading', { name: 'Link a sign-in method' })

    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'new@example.test' } })
    fireEvent.change(screen.getByLabelText('Password for this method'), { target: { value: 'candidate-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(harness.services.accountLinking.start).toHaveBeenCalledOnce())
    expect(screen.getByText(/Simulated preview code: 482913/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Link methods' })).not.toBeInTheDocument()
    expect(window.sessionStorage.getItem('dubbed.pending-account-link')).not.toContain('candidate-pass')

    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google to confirm the current method' }))
    await waitFor(() => expect(harness.services.accountLinking.proveCurrent).toHaveBeenCalledOnce())
    expect(harness.services.accountLinking.commit).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: '482913' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm email method' }))

    await waitFor(() => expect(harness.services.accountLinking.proveCandidate).toHaveBeenCalledWith(expect.objectContaining({
      intentId: harness.intent.id, code: '482913', operationId: expect.any(String),
    })))
    expect(harness.services.accountLinking.commit).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Link methods' }))
    await waitFor(() => expect(harness.services.accountLinking.commit).toHaveBeenCalledOnce())
    expect(harness.services.accountLinking.commit).toHaveBeenCalledWith(expect.objectContaining({
      intentId: harness.intent.id,
      currentProofId: 'current-proof',
      candidateProofId: 'candidate-proof',
      expectedAccountRevision: harness.account.revision,
    }))
    expect(await screen.findByText(/Both sign-in methods are linked/)).toBeInTheDocument()
  })

  it('does not render a simulated code when the service omits the fixture descriptor', async () => {
    const harness = makeHarness()
    harness.start.mockResolvedValueOnce(ok({ ...harness.intent, candidateScenarioCode: undefined }))
    await screen.findByRole('heading', { name: 'Link a sign-in method' })
    fireEvent.change(screen.getByLabelText('New email address'), { target: { value: 'new@example.test' } })
    fireEvent.change(screen.getByLabelText('Password for this method'), { target: { value: 'candidate-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    await waitFor(() => expect(harness.services.accountLinking.start).toHaveBeenCalledOnce())

    expect(screen.queryByText(/Simulated preview code/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Verification code')).toBeInTheDocument()
  })

  it('shows a live-account current-password rejection beside the field and allows correction', async () => {
    const harness = makeHarness('email-password')
    harness.proveCurrent
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'unauthenticated', message: 'Current password proof is incorrect.', retry: 'none' },
      })
    await screen.findByRole('heading', { name: 'Link a sign-in method' })

    fireEvent.click(screen.getByRole('button', { name: 'Add Google' }))
    await waitFor(() => expect(harness.services.accountLinking.start).toHaveBeenCalledOnce())
    const password = await screen.findByLabelText('Current account password')
    await expect(screen.getByRole('button', { name: 'Confirm current method' })).toBeEnabled()
    fireEvent.change(password, { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm current method' }))

    expect(await screen.findByText('The current password is incorrect. Check it and try again.')).toBeInTheDocument()
    expect(password).toHaveValue('wrong-password')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(harness.currentIdentity).toHaveBeenCalledOnce()
    expect(screen.queryByText('Your session ended. Sign in to continue.')).not.toBeInTheDocument()
    expect(harness.services.accountLinking.commit).not.toHaveBeenCalled()

    fireEvent.change(password, { target: { value: 'corrected-password' } })
    expect(screen.queryByText('The current password is incorrect. Check it and try again.')).not.toBeInTheDocument()
    expect(password).not.toHaveAttribute('aria-invalid', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm current method' }))
    await waitFor(() => expect(harness.proveCurrent).toHaveBeenCalledTimes(2))
    expect(harness.proveCurrent).toHaveBeenNthCalledWith(1, expect.objectContaining({ password: 'wrong-password' }))
    expect(harness.proveCurrent).toHaveBeenNthCalledWith(2, expect.objectContaining({ password: 'corrected-password' }))
  })

  it.each([
    ['signed out', ok(null)],
    ['expired session', { status: 'error' as const, error: { code: 'expired' as const, message: 'Your session has expired.', retry: 'none' as const } }],
  ])('keeps the session-ended notice for a %s current identity', async (_state, currentIdentity) => {
    const harness = makeHarness('email-password')
    harness.currentIdentity.mockResolvedValueOnce(currentIdentity)
    harness.proveCurrent.mockResolvedValueOnce({
      status: 'error',
      error: { code: 'unauthenticated', message: 'Current password proof is incorrect.', retry: 'none' },
    })
    await screen.findByRole('heading', { name: 'Link a sign-in method' })
    fireEvent.click(screen.getByRole('button', { name: 'Add Google' }))
    await waitFor(() => expect(harness.services.accountLinking.start).toHaveBeenCalledOnce())
    const password = await screen.findByLabelText('Current account password')
    await expect(screen.getByRole('button', { name: 'Confirm current method' })).toBeEnabled()
    fireEvent.change(password, { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm current method' }))

    expect(await screen.findByText('Your session ended. Sign in to continue.')).toBeInTheDocument()
    expect(harness.currentIdentity).toHaveBeenCalledOnce()
    expect(password).toHaveValue('wrong-password')
    expect(password).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByText('The current password is incorrect. Check it and try again.')).not.toBeInTheDocument()
  })

  it('keeps the session-ended notice if authoritative identity has a different session', async () => {
    const harness = makeHarness('email-password')
    const replacementSession = { ...harness.session, id: 'replacement-session' as Session['id'] }
    harness.currentIdentity.mockResolvedValueOnce(ok({ account: harness.account, session: replacementSession }))
    harness.proveCurrent.mockResolvedValueOnce({
      status: 'error',
      error: { code: 'unauthenticated', message: 'Current password proof is incorrect.', retry: 'none' },
    })
    await screen.findByRole('heading', { name: 'Link a sign-in method' })
    fireEvent.click(screen.getByRole('button', { name: 'Add Google' }))
    await waitFor(() => expect(harness.services.accountLinking.start).toHaveBeenCalledOnce())
    const password = await screen.findByLabelText('Current account password')
    await expect(screen.getByRole('button', { name: 'Confirm current method' })).toBeEnabled()
    fireEvent.change(password, { target: { value: 'wrong-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirm current method' }))

    expect(await screen.findByText('Your session ended. Sign in to continue.')).toBeInTheDocument()
    expect(harness.currentIdentity).toHaveBeenCalledOnce()
    expect(password).toHaveValue('wrong-password')
    expect(screen.queryByText('The current password is incorrect. Check it and try again.')).not.toBeInTheDocument()
  })
})
