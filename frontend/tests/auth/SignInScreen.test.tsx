import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppContext, type AppContextValue } from '../../src/app/context'
import { routeForSignInIntent, routes } from '../../src/app/routes'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { SignInScreen } from '../../src/features/auth/SignInScreen'
import { signInStorageKey } from '../../src/features/auth/auth-utils'
import type { GoogleIdentityResult, Services, SignInIntent } from '../../src/services/contracts'
import { ids } from '../../src/services/contracts'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function intent(): SignInIntent {
  return {
    kind: 'resume-project-screen',
    projectId: ids.project('project-google-return'),
    screen: 'record',
  }
}

function googleResult(
  state: GoogleIdentityResult['state'],
  destination = intent(),
  welcomeGrantApplied = false,
): GoogleIdentityResult {
  return {
    purpose: 'sign-in',
    state,
    destination,
    welcomeGrantApplied,
    note: 'synthetic-mock-scenario',
    ...(state === 'completed'
      ? { account: {} as GoogleIdentityResult['account'], session: {} as GoogleIdentityResult['session'] }
      : {}),
  } as GoogleIdentityResult
}

function makeHarness(
  result = googleResult('completed'),
  locale: 'en' | 'ru' = 'en',
  restoredGoogleOperationId?: string,
  resolveResult?: unknown,
) {
  const destination = intent()
  const route = routes.signIn(destination)
  if (restoredGoogleOperationId) {
    window.sessionStorage.setItem(signInStorageKey, JSON.stringify({
      version: 1,
      requestId: restoredGoogleOperationId,
      pendingOperationId: restoredGoogleOperationId,
      email: '',
      operationKind: 'google-sign-in',
      intent: destination,
    }))
  }
  const google = vi.fn().mockResolvedValue(ok(result))
  const signIn = vi.fn()
  const grantEligibleWelcome = vi.fn()
  const resolve = vi.fn().mockResolvedValue(resolveResult)
  const services = {
    identity: { google, signIn },
    operations: { resolve },
    credits: { grantEligibleWelcome },
  } as unknown as Services
  const navigate = vi.fn().mockResolvedValue(true)
  const refreshIdentity = vi.fn().mockResolvedValue({ status: 'signed-in' })
  const registerRouteExitGuard = vi.fn(() => () => undefined)
  const props = {
    route,
    locale,
    identity: { status: 'signed-out' },
    signInIntent: destination,
    services,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as FeatureScreenProps
  const context = {
    route,
    locationKey: 'sign-in-test',
    services,
    identity: props.identity,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  } as unknown as AppContextValue

  const view = render(
    <MemoryRouter initialEntries={['/sign-in']}>
      <AppContext.Provider value={context}>
        <SignInScreen {...props} />
      </AppContext.Provider>
    </MemoryRouter>,
  )
  return { result, destination, google, signIn, resolve, grantEligibleWelcome, services, navigate, refreshIdentity, props, context, view }
}

beforeEach(() => {
  window.sessionStorage.clear()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('SignInScreen Google mock', () => {
  it('keeps the adopted sign-in order and Russian email label', () => {
    const harness = makeHarness(googleResult('account-not-found'), 'ru')
    const orderedElements = [
      screen.getByRole('heading', { name: 'Войти' }),
      screen.getByRole('button', { name: 'Продолжить с Google' }),
      screen.getByText('или'),
      screen.getByRole('textbox', { name: 'Электронная почта' }),
      screen.getByLabelText('Пароль'),
      screen.getByRole('button', { name: 'Видимость пароля' }),
      screen.getByRole('button', { name: 'Войти' }),
      screen.getByRole('link', { name: 'Забыли пароль?' }),
      screen.getByRole('link', { name: 'Создать аккаунт' }),
    ]
    for (let index = 0; index < orderedElements.length - 1; index += 1) {
      expect(orderedElements[index].compareDocumentPosition(orderedElements[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(harness.google).not.toHaveBeenCalled()
  })

  it('refreshes the authoritative session before resuming the exact project screen', async () => {
    const harness = makeHarness(googleResult('completed', intent(), true))
    const button = screen.getByRole('button', { name: 'Continue with Google' })
    expect(button).toHaveAttribute('aria-describedby', 'google-mock-description')
    expect(screen.getByText('Local mock only. This does not contact Google.')).toBeInTheDocument()
    fireEvent.click(button)

    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(
      routeForSignInIntent(harness.destination),
      { replace: true },
    ))
    expect(harness.google).toHaveBeenCalledWith(expect.objectContaining({
      purpose: 'sign-in',
      destination: harness.destination,
      operationId: expect.any(String),
    }))
    expect(harness.refreshIdentity).toHaveBeenCalledOnce()
    expect(harness.grantEligibleWelcome).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(signInStorageKey)).toBeNull()
  })

  it('keeps the password visibility control name stable and exposes its current state', () => {
    makeHarness()
    const password = screen.getByLabelText('Password')
    fireEvent.change(password, { target: { value: 'preserve-me' } })
    const toggle = screen.getByRole('button', { name: 'Password visibility' })

    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Password visibility' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Password')).toHaveValue('preserve-me')
  })

  it('renders an in-flight sign-in status in the latest locale without clearing fields', async () => {
    const harness = makeHarness()
    let resolveSignIn: (value: unknown) => void = () => undefined
    const pendingSignIn = new Promise<unknown>((resolve) => {
      resolveSignIn = resolve
    })
    harness.signIn.mockReturnValue(pendingSignIn)

    fireEvent.change(screen.getByRole('textbox', { name: 'Email' }), {
      target: { value: 'slow@example.test' },
    })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'keep-this-password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(harness.signIn).toHaveBeenCalledOnce())

    const submitButton = screen.getByRole('button', { name: /signing in/i })
    const form = submitButton.closest('form')
    if (!form) throw new Error('Sign-in submit button must remain inside its form')
    submitButton.focus()
    expect(submitButton).toHaveAttribute('aria-busy', 'true')
    expect(submitButton).toHaveAttribute('aria-disabled', 'true')
    expect(submitButton).not.toBeDisabled()
    expect(submitButton).toHaveFocus()

    fireEvent.click(submitButton)
    fireEvent.keyDown(submitButton, { key: 'Enter' })
    fireEvent.keyDown(submitButton, { key: ' ' })
    fireEvent.submit(form)
    expect(harness.signIn).toHaveBeenCalledOnce()

    harness.view.rerender(
      <MemoryRouter initialEntries={['/sign-in']}>
        <AppContext.Provider value={harness.context}>
          <SignInScreen {...harness.props} locale="ru" />
        </AppContext.Provider>
      </MemoryRouter>,
    )
    resolveSignIn({ status: 'unknown', operationId: 'pending-sign-in-operation' })

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Вход ещё подтверждается. Проверьте его состояние перед повторной попыткой.',
    )
    expect(screen.getByRole('textbox', { name: 'Электронная почта' })).toHaveValue('slow@example.test')
    expect(screen.getByLabelText('Пароль')).toHaveValue('keep-this-password')
  })

  it.each([
    ['canceled', 'Google sign-in was canceled. No account changes were made.'],
    ['denied', 'Google sign-in was denied. No account changes were made.'],
    ['link-required', 'This Google profile needs a manual link. Sign in with an existing method, then start linking from Account.'],
    ['account-not-found', 'No account is linked to this Google profile. Create an account to continue.'],
  ] as const)('does not establish a session for the %s outcome', async (state, message) => {
    const harness = makeHarness(googleResult(state))
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    expect(await screen.findByRole('status')).toHaveTextContent(message)
    expect(harness.refreshIdentity).not.toHaveBeenCalled()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(signInStorageKey)).toBeNull()
  })

  it('reconciles an unknown Google response without replaying it, then follows committed session state', async () => {
    const harness = makeHarness()
    harness.google.mockImplementation(async (input: { operationId: string }) => ({
      status: 'unknown' as const,
      operationId: input.operationId,
    }) as never)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))

    const checkStatus = await screen.findByRole('button', { name: 'Check sign-in status' })
    const marker = JSON.parse(window.sessionStorage.getItem(signInStorageKey)!)
    expect(marker).toMatchObject({ operationKind: 'google-sign-in', intent: harness.destination })
    harness.resolve.mockResolvedValue(ok({
      state: 'committed',
      kind: 'identity.google.sign-in',
      result: googleResult('completed', harness.destination),
    }))
    fireEvent.click(checkStatus)

    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(
      routeForSignInIntent(harness.destination),
      { replace: true },
    ))
    expect(harness.resolve).toHaveBeenCalledWith(marker.pendingOperationId)
    expect(harness.google).toHaveBeenCalledOnce()
    expect(harness.refreshIdentity).toHaveBeenCalledOnce()
    expect(window.sessionStorage.getItem(signInStorageKey)).toBeNull()
  })

  it('keeps a reconciled canceled Google result unauthenticated', async () => {
    const harness = makeHarness()
    harness.google.mockImplementation(async (input: { operationId: string }) => ({
      status: 'unknown' as const,
      operationId: input.operationId,
    }) as never)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
    const checkStatus = await screen.findByRole('button', { name: 'Check sign-in status' })
    harness.resolve.mockResolvedValue(ok({
      state: 'committed',
      kind: 'identity.google.sign-in',
      result: googleResult('canceled'),
    }))
    fireEvent.click(checkStatus)

    expect(await screen.findByText('Google sign-in was canceled. No account changes were made.')).toBeInTheDocument()
    expect(harness.refreshIdentity).not.toHaveBeenCalled()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(signInStorageKey)).toBeNull()
  })

  it('reconciles a restored Google marker without replaying the provider action', async () => {
    const operationId = 'google-restored-operation'
    const harness = makeHarness(googleResult('completed'), 'en', operationId, ok({
      state: 'committed',
      kind: 'identity.google.sign-in',
      result: googleResult('canceled'),
    }))

    expect(await screen.findByText('Google sign-in was canceled. No account changes were made.')).toBeInTheDocument()
    expect(harness.resolve).toHaveBeenCalledWith(operationId)
    expect(harness.google).not.toHaveBeenCalled()
    expect(harness.refreshIdentity).not.toHaveBeenCalled()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(window.sessionStorage.getItem(signInStorageKey)).toBeNull()
  })
})
