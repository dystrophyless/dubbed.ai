import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AppContext, type AppContextValue } from '../../src/app/context'
import { creditsMayHaveChangedEvent } from '../../src/app/credits-events'
import { LocaleProvider } from '../../src/app/locale'
import { routes } from '../../src/app/routes'
import { AppHeader } from '../../src/components/layout/AppHeader'
import { asRevision, ids, type CreditSnapshot, type ServiceResult, type Services } from '../../src/services/contracts'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function snapshot(available: number): ServiceResult<CreditSnapshot> {
  return {
    status: 'ok',
    replayed: false,
    data: {
      accountId: ids.account('account-header-test'),
      revision: asRevision(1),
      available,
      reserved: 0,
      purchasedRemainder: 0,
      welcomeGrantEligible: false,
      welcomeGrantApplied: true,
      projectCapacity: {
        used: 0,
        total: 2,
        firstPurchaseUpgrade: false,
        revision: asRevision(1),
      },
    },
  }
}

function context(services: Services, locationKey: string): AppContextValue {
  const account = {
    id: ids.account('account-header-test'),
    email: 'member@example.test',
    locale: 'en' as const,
    revision: asRevision(1),
    deleted: false,
    createdAt: 0,
  }
  return {
    route: routes.credits(),
    locationKey,
    services,
    identity: {
      status: 'signed-in',
      account,
      session: {
        id: ids.session('header-session'),
        accountId: account.id,
        expiresAt: 1_000_000,
        revision: asRevision(1),
      },
    },
    navigate: vi.fn(async () => true),
    refreshIdentity: vi.fn(async () => ({ status: 'signed-out' as const })),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  }
}

function mountHeader(services: Services, locationKey: string) {
  const value = context(services, locationKey)
  return render(
    <MemoryRouter initialEntries={['/credits']}>
      <AppContext.Provider value={value}>
        <LocaleProvider services={services} onAccountUpdated={vi.fn()}>
          <AppHeader />
        </LocaleProvider>
      </AppContext.Provider>
    </MemoryRouter>,
  )
}

describe('AppHeader credit balance', () => {
  it('hides stale balances during route and committed-mutation refreshes', async () => {
    const afterRoute = deferred<ServiceResult<CreditSnapshot>>()
    const afterMutation = deferred<ServiceResult<CreditSnapshot>>()
    const snapshotRead = vi.fn()
      .mockResolvedValueOnce(snapshot(120))
      .mockReturnValueOnce(afterRoute.promise)
      .mockReturnValueOnce(afterMutation.promise)
    const services = { credits: { snapshot: snapshotRead } } as unknown as Services
    const mounted = mountHeader(services, 'credits-location')

    expect(await screen.findByText('120')).toBeInTheDocument()

    mounted.rerender(
      <MemoryRouter initialEntries={['/record']}>
        <AppContext.Provider value={context(services, 'record-location')}>
          <LocaleProvider services={services} onAccountUpdated={vi.fn()}>
            <AppHeader />
          </LocaleProvider>
        </AppContext.Provider>
      </MemoryRouter>,
    )
    expect(screen.getByText('Loading')).toBeInTheDocument()
    await act(async () => afterRoute.resolve(snapshot(111)))
    expect(await screen.findByText('111')).toBeInTheDocument()

    act(() => window.dispatchEvent(new Event(creditsMayHaveChangedEvent)))
    expect(screen.getByText('Loading')).toBeInTheDocument()
    await act(async () => afterMutation.resolve(snapshot(111)))
    expect(await screen.findByText('111')).toBeInTheDocument()
    expect(snapshotRead).toHaveBeenCalledTimes(3)
  })
})

describe('AppHeader signed-in navigation', () => {
  it('keeps the phone destinations and language selector inside the accessible menu', async () => {
    const services = {
      credits: { snapshot: vi.fn().mockResolvedValue(snapshot(120)) },
    } as unknown as Services
    mountHeader(services, 'header-navigation-location')

    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Open navigation' })
    await user.click(trigger)

    const dialog = await screen.findByRole('dialog', { name: 'Navigation' })
    const navigation = within(dialog)
    for (const destination of ['New dub', 'Projects', 'Credits', 'Account']) {
      expect(navigation.getByRole('link', { name: destination })).toBeInTheDocument()
    }
    expect(navigation.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
    expect(navigation.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(await screen.findByRole('button', { name: 'Open navigation' })).toHaveFocus()
  })
})
