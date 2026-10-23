import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppContext, type AppContextValue } from '../../src/app/context'
import { routeForSignInIntent, routes } from '../../src/app/routes'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { PasswordResetScreen } from '../../src/features/auth/PasswordResetScreen'
import { passwordResetStorageKey } from '../../src/features/auth/auth-utils'
import { ids, type Revision, type Services } from '../../src/services/contracts'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function projectIntent() {
  return {
    kind: 'resume-project-screen' as const,
    projectId: ids.project('project-reset-return'),
    screen: 'record' as const,
  }
}

function pendingRequest() {
  return {
    id: ids.operation('reset-request-one'),
    email: 'owner@example.test',
    purpose: 'password-reset' as const,
    scenarioCode: { value: '123456', note: 'synthetic-mock-scenario' as const },
    expiresAt: Date.now() + 10 * 60_000,
    resendAvailableAt: Date.now(),
    resendCount: 0,
    revision: 1 as Revision,
  }
}

function makeHarness(options: {
  intent?: ReturnType<typeof projectIntent> | { kind: 'new-dub' }
  route?: ReturnType<typeof routes.passwordReset>
  locale?: 'en' | 'ru'
} = {}) {
  const intent = options.intent ?? projectIntent()
  const route = options.route ?? routes.passwordReset(intent)
  const pending = pendingRequest()
  const reset = {
    start: vi.fn().mockResolvedValue(ok(pending)),
    verify: vi.fn().mockResolvedValue(ok({
      resetGrantId: ids.operation('reset-grant-one'),
      expiresAt: Date.now() + 5 * 60_000,
    })),
    complete: vi.fn().mockResolvedValue(ok({ destination: intent })),
    resend: vi.fn().mockResolvedValue(ok(pending)),
    resolve: vi.fn().mockResolvedValue(ok(pending)),
  }
  const services = { passwordReset: reset } as unknown as Services
  const navigate = vi.fn().mockResolvedValue(true)
  const refreshIdentity = vi.fn().mockResolvedValue({ status: 'signed-in' })
  const registerRouteExitGuard = vi.fn(() => () => undefined)
  const props = {
    route,
    locale: options.locale ?? 'en',
    identity: { status: 'signed-out' },
    signInIntent: intent,
    services,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as FeatureScreenProps
  const context = {
    route,
    locationKey: 'password-reset-test',
    services,
    identity: props.identity,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as AppContextValue

  const view = render(
    <MemoryRouter initialEntries={['/reset-password']}>
      <AppContext.Provider value={context}>
        <PasswordResetScreen {...props} />
      </AppContext.Provider>
    </MemoryRouter>,
  )
  return { ...view, intent, pending, reset, navigate, refreshIdentity }
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('PasswordResetScreen', () => {
  it('uses the same Russian email field label as sign-in and registration', () => {
    makeHarness({ locale: 'ru' })
    expect(screen.getByRole('textbox', { name: 'Электронная почта' })).toBeInTheDocument()
  })

  it('sends a neutral response and binds the request to the exact project-return intent', async () => {
    const harness = makeHarness()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: ' Owner@Example.Test ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }))

    expect(await screen.findByRole('textbox', { name: '6-digit reset code' })).toBeInTheDocument()
    expect(screen.getByText('If an account with this email exists, we sent a code.')).toBeInTheDocument()
    expect(screen.getByText('Local mock code: 123456. No email was sent.')).toBeInTheDocument()
    expect(harness.reset.start).toHaveBeenCalledWith(expect.objectContaining({
      email: 'owner@example.test',
      returnIntent: harness.intent,
      operationId: expect.any(String),
    }))

    const stored = JSON.parse(window.sessionStorage.getItem(passwordResetStorageKey)!)
    expect(stored).toMatchObject({
      version: 1,
      requestId: harness.pending.id,
      email: 'owner@example.test',
      intent: harness.intent,
    })
    expect(stored).not.toHaveProperty('code')
    expect(stored).not.toHaveProperty('password')
  })

  it('retains an incorrect code in the single accessible field until the user changes it', async () => {
    const harness = makeHarness({ intent: { kind: 'new-dub' } })
    harness.reset.verify.mockResolvedValue({
      status: 'error',
      error: { code: 'invalid-code', message: 'synthetic invalid code', retry: 'none' },
    } as never)
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'owner@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }))
    const code = await screen.findByRole('textbox', { name: '6-digit reset code' })
    fireEvent.change(code, { target: { value: '654321' } })

    expect(await screen.findByRole('alert')).toHaveTextContent('That code could not be verified.')
    expect(code).toHaveValue('654321')
    expect(code).toHaveAttribute('aria-invalid', 'true')
    expect(document.querySelectorAll('.otp-control__cell')).toHaveLength(6)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    expect(harness.reset.verify).toHaveBeenCalledOnce()
  })

  it('requires matching eight-character passwords and resumes the authoritative project screen', async () => {
    const harness = makeHarness()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'owner@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }))
    fireEvent.change(await screen.findByRole('textbox', { name: '6-digit reset code' }), {
      target: { value: '123456' },
    })
    const newPassword = await screen.findByLabelText('New password')
    const repeatedPassword = screen.getByLabelText('Repeat new password')
    fireEvent.change(newPassword, { target: { value: 'password' } })
    fireEvent.change(repeatedPassword, { target: { value: 'different' } })
    fireEvent.submit(newPassword.closest('form')!)
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument()
    expect(harness.reset.complete).not.toHaveBeenCalled()

    fireEvent.change(repeatedPassword, { target: { value: 'password' } })
    fireEvent.submit(newPassword.closest('form')!)
    await waitFor(() => expect(harness.reset.complete).toHaveBeenCalledOnce())
    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(
      routeForSignInIntent(harness.intent),
      { replace: true },
    ))
    expect(harness.refreshIdentity).toHaveBeenCalledOnce()
    expect(harness.reset.complete).toHaveBeenCalledWith(expect.objectContaining({
      newPassword: 'password',
    }))
    expect(window.sessionStorage.getItem(passwordResetStorageKey)).toBeNull()
  })

  it('keeps both password values through an unknown completion and navigates only after reconciliation', async () => {
    const harness = makeHarness({ intent: { kind: 'new-dub' } })
    const completionId = ids.operation('password-reset-ui-unknown-101010')
    const resetGrantId = ids.operation('password-reset-ui-grant-101010')
    harness.reset.complete.mockResolvedValueOnce({ status: 'unknown', operationId: completionId } as never)
    harness.reset.resolve.mockResolvedValueOnce(ok({
      state: 'verified',
      resetGrantId,
      expiresAt: Date.now() + 5 * 60_000,
    }))

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'owner@example.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reset email' }))
    fireEvent.change(await screen.findByRole('textbox', { name: '6-digit reset code' }), {
      target: { value: '123456' },
    })
    const newPassword = await screen.findByLabelText('New password')
    const repeatPassword = screen.getByLabelText('Repeat new password')
    fireEvent.change(newPassword, { target: { value: 'retained-password-8' } })
    fireEvent.change(repeatPassword, { target: { value: 'retained-password-8' } })
    fireEvent.submit(newPassword.closest('form')!)

    expect(await screen.findByRole('button', { name: 'Check reset status' })).toBeInTheDocument()
    expect(harness.reset.complete).toHaveBeenCalledOnce()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(harness.refreshIdentity).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Check reset status' }))
    const restoredNewPassword = await screen.findByLabelText('New password')
    const restoredRepeatPassword = screen.getByLabelText('Repeat new password')
    expect(restoredNewPassword).toHaveValue('retained-password-8')
    expect(restoredRepeatPassword).toHaveValue('retained-password-8')
    expect(harness.reset.resolve).toHaveBeenCalledWith({ requestId: harness.pending.id })
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(JSON.parse(window.sessionStorage.getItem(passwordResetStorageKey)!).pendingOperationId).toBe(completionId)

    fireEvent.submit(restoredNewPassword.closest('form')!)
    await waitFor(() => expect(harness.reset.complete).toHaveBeenCalledTimes(2))
    expect(harness.reset.complete.mock.calls[1][0]).toMatchObject({
      resetGrantId,
      newPassword: 'retained-password-8',
      operationId: completionId,
    })
    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(
      routeForSignInIntent(harness.intent),
      { replace: true },
    ))
    expect(harness.refreshIdentity).toHaveBeenCalledOnce()
  })

  it('reconciles a restored request before any replay and follows the service-bound destination', async () => {
    const intent = projectIntent()
    const harness = makeHarness({
      intent: { kind: 'new-dub' },
      route: routes.passwordReset({ kind: 'new-dub' }),
    })
    window.sessionStorage.setItem(passwordResetStorageKey, JSON.stringify({
      version: 1,
      requestId: harness.pending.id,
      email: harness.pending.email,
      intent,
    }))
    harness.reset.resolve.mockResolvedValue(ok({ state: 'completed', destination: intent }))

    cleanup()
    render(
      <MemoryRouter initialEntries={['/reset-password']}>
        <AppContext.Provider value={{
          route: routes.passwordReset({ kind: 'new-dub' }),
          locationKey: 'password-reset-restored-test',
          services: { passwordReset: harness.reset } as unknown as Services,
          identity: { status: 'signed-out' },
          navigate: harness.navigate,
          refreshIdentity: harness.refreshIdentity,
          registerRouteExitGuard: vi.fn(() => () => undefined),
        } as unknown as AppContextValue}>
          <PasswordResetScreen {...({
            route: routes.passwordReset({ kind: 'new-dub' }),
            locale: 'en',
            identity: { status: 'signed-out' },
            signInIntent: { kind: 'new-dub' },
            services: { passwordReset: harness.reset } as unknown as Services,
            navigate: harness.navigate,
            refreshIdentity: harness.refreshIdentity,
            registerRouteExitGuard: vi.fn(() => () => undefined),
          } as unknown as FeatureScreenProps)} />
        </AppContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(
      routeForSignInIntent(intent),
      { replace: true },
    ))
    expect(harness.reset.resolve).toHaveBeenCalledWith({ requestId: harness.pending.id })
    expect(harness.reset.start).not.toHaveBeenCalled()
    expect(harness.reset.verify).not.toHaveBeenCalled()
    expect(harness.reset.resend).not.toHaveBeenCalled()
    expect(harness.reset.complete).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(passwordResetStorageKey)).toBeNull()
  })
})
