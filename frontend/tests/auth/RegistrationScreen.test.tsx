import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppContext, type AppContextValue } from '../../src/app/context'
import { routes } from '../../src/app/routes'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { RegistrationScreen } from '../../src/features/auth/RegistrationScreen'
import { registrationStorageKey } from '../../src/features/auth/auth-utils'
import type { PendingVerification, ServiceError, Services, SignInIntent } from '../../src/services/contracts'
import { ids } from '../../src/services/contracts'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function intent(): SignInIntent {
  return { kind: 'new-dub' }
}

function pendingVerification(remainingSends = 4, resendDelayMs = -1000): PendingVerification {
  return {
    id: ids.operation('registration-request-1'),
    email: 'user@example.com',
    purpose: 'registration',
    scenarioCode: { value: '123456', note: 'synthetic-mock-scenario' },
    expiresAt: Date.now() + 10 * 60_000,
    resendAvailableAt: Date.now() + resendDelayMs,
    resendCount: 0,
    sendCount: 1,
    remainingSends,
    revision: 1 as PendingVerification['revision'],
  }
}

function makeHarness(options: {
  pending?: PendingVerification
  startResult?: unknown
  verifyResult?: unknown
  locale?: 'en' | 'ru'
  restorePending?: boolean
  holdResolve?: boolean
} = {}) {
  const pending = options.pending ?? pendingVerification()
  if (options.restorePending) {
    window.sessionStorage.setItem(registrationStorageKey, JSON.stringify({
      version: 1,
      requestId: pending.id,
      email: pending.email,
    }))
  }
  const start = vi.fn().mockResolvedValue(options.startResult ?? ok(pending))
  const verify = vi.fn().mockResolvedValue(options.verifyResult ?? ok({
    account: {},
    session: {},
    credits: {},
    outcome: 'new-account',
    welcomeGrantApplied: true,
  }))
  const resend = vi.fn()
  const correctEmail = vi.fn()
  const resolve = vi.fn().mockReturnValue(options.holdResolve ? new Promise(() => undefined) : undefined)
  const google = vi.fn()
  const resolveOperation = vi.fn()
  const services = {
    registration: { start, verify, resend, correctEmail, resolve },
    identity: { google },
    operations: { resolve: resolveOperation },
  } as unknown as Services
  const route = routes.registration()
  const destination = intent()
  const navigate = vi.fn().mockResolvedValue(true)
  const refreshIdentity = vi.fn().mockResolvedValue({ status: 'signed-in' })
  const registerRouteExitGuard = vi.fn(() => () => undefined)
  const props = {
    route,
    locale: options.locale ?? 'en',
    identity: { status: 'signed-out' },
    signInIntent: destination,
    services,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as FeatureScreenProps
  const context = {
    route,
    locationKey: 'registration-test',
    services,
    identity: props.identity,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as AppContextValue

  const view = render(
    <MemoryRouter initialEntries={['/register']}>
      <AppContext.Provider value={context}>
        <RegistrationScreen {...props} />
      </AppContext.Provider>
    </MemoryRouter>,
  )
  return {
    pending,
    start,
    verify,
    resend,
    google,
    navigate,
    refreshIdentity,
    rerenderLocale(locale: 'en' | 'ru') {
      view.rerender(
        <MemoryRouter initialEntries={['/register']}>
          <AppContext.Provider value={context}>
            <RegistrationScreen {...props} locale={locale} />
          </AppContext.Provider>
        </MemoryRouter>,
      )
    },
  }
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RegistrationScreen', () => {
  it('keeps the Flow 03 provider-first order and the shared Russian email label', async () => {
    makeHarness()
    const orderedElements = [
      screen.getByRole('button', { name: 'Continue with Google' }),
      screen.getByText('or'),
      screen.getByRole('textbox', { name: 'Email' }),
      screen.getByLabelText('Password'),
      screen.getByRole('button', { name: 'Create account' }),
      screen.getByRole('link', { name: 'Sign in' }),
    ]
    for (let index = 0; index < orderedElements.length - 1; index += 1) {
      expect(orderedElements[index].compareDocumentPosition(orderedElements[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }

    cleanup()
    const russian = makeHarness({ locale: 'ru', pending: pendingVerification(4, 60_000) })
    expect(screen.getByRole('textbox', { name: 'Электронная почта' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox', { name: 'Электронная почта' }), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Пароль'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Создать аккаунт' }))
    await screen.findByRole('textbox', { name: '6-значный код подтверждения' })
    expect(screen.getByRole('button', { name: 'Повторить через 1:00' })).toBeInTheDocument()
    expect(russian.start).toHaveBeenCalledOnce()
  })

  it('creates the account only after the six-digit code is verified and follows the new-dub route', async () => {
    const harness = makeHarness()
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: ' User@Example.com ' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const code = await screen.findByRole('textbox', { name: '6-digit verification code' })
    expect(harness.start).toHaveBeenCalledWith(expect.objectContaining({
      email: 'user@example.com',
      password: 'correct-horse-battery',
      operationId: expect.any(String),
    }))
    expect(screen.getByText('Simulated code · local mock: 123456. No email was sent.')).toBeInTheDocument()
    expect(harness.verify).not.toHaveBeenCalled()
    expect(harness.refreshIdentity).not.toHaveBeenCalled()

    const storedReference = window.sessionStorage.getItem(registrationStorageKey)
    expect(storedReference).toContain('user@example.com')
    expect(storedReference).not.toContain('correct-horse-battery')
    expect(storedReference).not.toContain('123456')

    fireEvent.change(code, { target: { value: '123456' } })
    await waitFor(() => expect(harness.verify).toHaveBeenCalledOnce())
    expect(harness.verify).toHaveBeenCalledWith(expect.objectContaining({
      requestId: harness.pending.id,
      code: '123456',
      operationId: expect.any(String),
    }))
    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(routes.newDub(), { replace: true }))
    expect(harness.refreshIdentity).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem(registrationStorageKey)).toBeNull()
  })

  it('keeps an invalid code available for correction without establishing a session', async () => {
    const harness = makeHarness({
      verifyResult: {
        status: 'error',
        error: { code: 'invalid-code', message: 'Invalid verification code.', retry: 'none' } as ServiceError,
      },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))
    const code = await screen.findByRole('textbox', { name: '6-digit verification code' })
    fireEvent.change(code, { target: { value: '654321' } })

    expect(await screen.findByText('This code cannot be used. Keep it here and replace it with the current code.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '6-digit verification code' })).toHaveValue('654321')
    expect(harness.refreshIdentity).not.toHaveBeenCalled()
    expect(harness.navigate).not.toHaveBeenCalled()
  })

  it('respects the service-authoritative local mock send cap', async () => {
    makeHarness({ pending: pendingVerification(0) })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await screen.findByRole('textbox', { name: '6-digit verification code' }, { timeout: 5000 })
    expect(screen.getByText('Local mock sends remaining this hour: 0.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resend code' })).toBeDisabled()
  })

  it('starts expiry and resend countdowns from the returned verification snapshot', async () => {
    const harness = makeHarness()
    harness.start.mockImplementation(async () => {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1200))
      return ok(pendingVerification(4, 60_000))
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    await screen.findByRole('textbox', { name: '6-digit verification code' }, { timeout: 5000 })
    const expiryText = screen.getByText(/^Code expires in /).textContent ?? ''
    const expiry = expiryText.match(/(\d+):(\d{2})$/)
    expect(expiry).not.toBeNull()
    expect(Number(expiry![1]) * 60 + Number(expiry![2])).toBeLessThanOrEqual(600)
    expect(Number(expiry![1]) * 60 + Number(expiry![2])).toBeGreaterThan(590)

    const resendText = screen.getByRole('button', { name: /Resend available in/ }).textContent ?? ''
    const resend = resendText.match(/(\d+):(\d{2})$/)
    expect(resend).not.toBeNull()
    expect(Number(resend![1]) * 60 + Number(resend![2])).toBeLessThanOrEqual(60)
    expect(Number(resend![1]) * 60 + Number(resend![2])).toBeGreaterThan(50)
  })

  it('localizes the restored checking state when the app locale changes', () => {
    const harness = makeHarness({ restorePending: true, holdResolve: true })
    expect(screen.getByText('Checking registration status…')).toBeInTheDocument()

    harness.rerenderLocale('ru')

    expect(screen.getByText('Проверяем состояние регистрации…')).toBeInTheDocument()
    expect(screen.queryByText('Checking registration status…')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('offers sign-in and password reset when the address already has a password account', async () => {
    makeHarness({
      startResult: {
        status: 'error',
        error: { code: 'already-exists', message: 'Account already exists.', retry: 'none' } as ServiceError,
      },
    })
    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'correct-horse-battery' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Account already exists' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByRole('link', { name: 'Reset password' })).toHaveAttribute('href', '/reset-password')
  })
})
