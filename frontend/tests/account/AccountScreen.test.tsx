import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../src/app/locale'
import { routes } from '../../src/app/routes'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import type { AccountSnapshot, AccountSettingsSnapshot, Revision, Services, Session } from '../../src/services/contracts'
import { AccountScreen } from '../../src/features/account/AccountScreen'

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function makeAccount(methods: AccountSettingsSnapshot['methods'] = [
  { kind: 'email-password', address: 'owner@example.test', verified: true, linkedAt: 1 },
  { kind: 'google', address: 'owner@gmail.test', verified: true, linkedAt: 2 },
]) {
  return {
    id: 'account-one', email: 'owner@example.test', locale: 'en', revision: 5 as Revision,
    deleted: false, createdAt: 1, methods, deletionEligible: true, purchasedRemainder: 13,
    note: 'synthetic-mock-scenario',
  } as AccountSettingsSnapshot
}

function makeHarness(options: {
  methods?: AccountSettingsSnapshot['methods']
  passwordResult?: unknown
  passwordResolutions?: unknown[]
  deleteResult?: unknown
  deleteResolution?: unknown
  navigate?: ReturnType<typeof vi.fn>
} = {}) {
  const account = makeAccount(options.methods)
  const session = { id: 'session-one', accountId: account.id, expiresAt: Date.now() + 60_000, revision: 2 } as unknown as Session
  const identity = {
    signOut: vi.fn().mockResolvedValue(ok({ signedOut: true as const })),
    current: vi.fn().mockResolvedValue(ok({ account, session })),
  }
  const onAccountUpdated = vi.fn<(account: AccountSnapshot) => void>()
  const services = {
    account: {
      load: vi.fn().mockResolvedValue(ok(account)),
      setLocale: vi.fn().mockResolvedValue(ok({ ...account, locale: 'ru' })),
      changePassword: vi.fn().mockResolvedValue(options.passwordResult ?? ok({ account, revokedOtherSessions: true as const })),
      delete: vi.fn().mockResolvedValue(options.deleteResult ?? ok({ deleted: true as const, purchasedRemainder: account.purchasedRemainder })),
      resolveDelete: vi.fn().mockResolvedValue(options.deleteResolution ?? ok({ state: 'unknown' as const })),
    },
    identity,
    operations: {
      resolve: vi.fn().mockImplementation(async (operationId: string) => {
        const resolution = options.passwordResolutions?.shift() as {
          status: string
          data?: Record<string, unknown>
          replayed?: boolean
        } | undefined
        if (!resolution || resolution.status !== 'ok' || !resolution.data) return resolution
        return { ...resolution, data: { ...resolution.data, id: operationId } }
      }),
    },
  } as unknown as Services
  const navigate = options.navigate ?? vi.fn().mockResolvedValue(true)
  const refreshIdentity = vi.fn().mockResolvedValue({ status: 'signed-in', account, session })
  const props = {
    route: routes.account(), locale: 'en', identity: { status: 'signed-in', account, session },
    signInIntent: { kind: 'new-dub' }, services, navigate, refreshIdentity,
    onAccountUpdated,
    registerRouteExitGuard: vi.fn(),
  } as unknown as FeatureScreenProps
  const view = render(
    <LocaleProvider account={account} services={services} onAccountUpdated={onAccountUpdated}>
      <AccountScreen {...props} />
    </LocaleProvider>,
  )
  return { ...view, account, services, identity, navigate, refreshIdentity, onAccountUpdated }
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => vi.restoreAllMocks())

describe('AccountScreen', () => {
  it('shows only the sign-in methods returned by the account and offers linking for an absent method', async () => {
    makeHarness({ methods: [{ kind: 'google', address: 'owner@gmail.test', verified: true, linkedAt: 2 }] })

    expect(await screen.findByRole('heading', { name: 'Account' })).toBeInTheDocument()
    expect(screen.getByText('owner@gmail.test')).toBeInTheDocument()
    expect(screen.getByText('Not linked')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Link method' }))
    expect(screen.getByRole('button', { name: 'Link method' })).toBeInTheDocument()
  })

  it('blocks a short password locally and submits the two password fields without class rules', async () => {
    const harness = makeHarness()
    await screen.findByRole('heading', { name: 'Account' })
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: 'old-secret' } })
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'short' } })
    fireEvent.submit(screen.getByLabelText('New password').closest('form')!)

    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(harness.services.account.changePassword).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'eight chars' } })
    fireEvent.submit(screen.getByLabelText('New password').closest('form')!)
    await waitFor(() => expect(harness.services.account.changePassword).toHaveBeenCalledOnce())
    expect(harness.services.account.changePassword).toHaveBeenCalledWith(expect.objectContaining({
      currentPassword: 'old-secret', newPassword: 'eight chars', expectedRevision: harness.account.revision,
    }))
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument()
  })

  it('keeps entered values while an unknown password operation is pending and applies its committed snapshot in place', async () => {
    const operationId = 'account-password-operation'
    const updatedAccount = { ...makeAccount(), revision: 6 as Revision }
    const harness = makeHarness({
      passwordResult: { status: 'unknown', operationId, message: 'pending' },
      passwordResolutions: [
        ok({
          id: operationId, accountId: 'account-one', state: 'pending', kind: 'account.change-password',
          revision: 6 as Revision, updatedAt: 2,
        }),
        ok({
          id: operationId, accountId: 'account-one', state: 'committed', kind: 'account.change-password',
          result: { account: updatedAccount, revokedOtherSessions: true as const },
          revision: 6 as Revision, updatedAt: 3,
        }),
      ],
    })
    await screen.findByRole('heading', { name: 'Account' })
    const currentPassword = screen.getByLabelText('Current password')
    const newPassword = screen.getByLabelText('New password')
    fireEvent.change(currentPassword, { target: { value: 'old-secret' } })
    fireEvent.change(newPassword, { target: { value: 'new-secret-123' } })
    fireEvent.submit(newPassword.closest('form')!)

    expect(await screen.findByText(/The result is not confirmed/)).toBeInTheDocument()
    expect(currentPassword).toHaveValue('old-secret')
    expect(newPassword).toHaveValue('new-secret-123')

    fireEvent.click(screen.getByRole('button', { name: 'Check password-change status' }))
    await waitFor(() => expect(harness.services.operations.resolve).toHaveBeenCalledTimes(1))
    expect(currentPassword).toHaveValue('old-secret')
    expect(newPassword).toHaveValue('new-secret-123')

    fireEvent.click(screen.getByRole('button', { name: 'Check password-change status' }))
    expect(await screen.findByText('Password changed. This device stays signed in; other sessions were revoked.')).toBeInTheDocument()
    expect(harness.services.operations.resolve).toHaveBeenCalledTimes(2)
    const submittedOperationId = vi.mocked(harness.services.account.changePassword).mock.calls[0]?.[0].operationId
    expect(submittedOperationId).toBeTruthy()
    expect(vi.mocked(harness.services.operations.resolve).mock.calls).toEqual([
      [submittedOperationId],
      [submittedOperationId],
    ])
    expect(harness.onAccountUpdated).toHaveBeenCalledWith(updatedAccount)
    expect(harness.refreshIdentity).not.toHaveBeenCalled()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(currentPassword).toHaveValue('')
    expect(newPassword).toHaveValue('')
    expect(window.sessionStorage.getItem('dubbed.pending-account-password')).toBeNull()
  })

  it('does not sign out if the recording route guard declines to leave', async () => {
    const navigate = vi.fn().mockResolvedValue(false)
    const harness = makeHarness({ navigate })
    await screen.findByRole('heading', { name: 'Account' })
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    await waitFor(() => expect(navigate).toHaveBeenCalledOnce())
    expect(harness.identity.signOut).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Account' })).toBeInTheDocument()
  })

  it('keeps deletion status-first after an unknown result and leaves only after a completed receipt', async () => {
    const deletionId = 'account-delete-operation'
    const harness = makeHarness({
      deleteResult: { status: 'unknown', operationId: deletionId, message: 'pending' },
      deleteResolution: ok({ state: 'completed' as const, receipt: { deleted: true as const, purchasedRemainder: 13 } }),
    })
    await screen.findByRole('heading', { name: 'Account' })
    fireEvent.click(screen.getByRole('button', { name: 'Delete account' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete this account?' })
    expect(within(dialog).getByText(/Purchased credit remainder: 13/)).toBeInTheDocument()
    fireEvent.change(within(dialog).getByLabelText('Type DELETE to confirm'), { target: { value: ' delete ' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }))

    expect(await within(dialog).findByText(/Deletion is not confirmed/)).toBeInTheDocument()
    expect(harness.navigate).not.toHaveBeenCalled()
    expect(harness.services.account.delete).toHaveBeenCalledWith(expect.objectContaining({ confirmation: 'delete' }))
    const marker = JSON.parse(window.sessionStorage.getItem('dubbed.pending-account-delete')!)
    expect(marker).toEqual({ version: 1, accountId: harness.account.id, operationId: expect.any(String) })

    fireEvent.click(within(dialog).getByRole('button', { name: 'Check deletion status' }))
    await waitFor(() => expect(harness.services.account.resolveDelete).toHaveBeenCalledOnce())
    await waitFor(() => expect(harness.navigate).toHaveBeenCalledWith(routes.landing('account-deleted'), { replace: true }))
    expect(window.sessionStorage.getItem('dubbed.pending-account-delete')).toBeNull()
  })

  it('returns focus to the delete opener after Escape and after a failed delete is dismissed', async () => {
    const user = userEvent.setup()
    const harness = makeHarness()
    await screen.findByRole('heading', { name: 'Account' })
    const opener = screen.getByRole('button', { name: 'Delete account' })

    await user.click(opener)
    const firstDialog = await screen.findByRole('dialog', { name: 'Delete this account?' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(opener).toHaveFocus())
    expect(firstDialog).not.toBeInTheDocument()
    expect(harness.services.account.delete).not.toHaveBeenCalled()

    await user.click(opener)
    const dialog = await screen.findByRole('dialog', { name: 'Delete this account?' })
    await user.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE')
    vi.mocked(harness.services.account.delete).mockResolvedValueOnce({
      status: 'error',
      error: { code: 'adapter-unavailable', message: 'synthetic adapter rejection', retry: 'none' },
    })
    await user.click(within(dialog).getByRole('button', { name: 'Delete account' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Type DELETE to confirm')).toHaveValue('DELETE')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(opener).toHaveFocus())
    expect(harness.navigate).not.toHaveBeenCalled()
  })
})
