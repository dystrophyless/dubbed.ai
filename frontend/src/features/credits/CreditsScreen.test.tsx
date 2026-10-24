import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../app/locale'
import type { FeatureScreenProps } from '../../app/screen-contract'
import type {
  AccountId,
  CreditPack,
  CreditSnapshot,
  CreditHistoryCursor,
  LedgerEntry,
  OperationId,
  PurchaseSnapshot,
  Services,
} from '../../services/contracts'
import { CreditsScreen } from './CreditsScreen'

const accountId = 'account-credits-test' as AccountId
const purchaseId = 'purchase-credits-test' as OperationId

function ok<T>(data: T) {
  return { status: 'ok', replayed: false, data } as const
}

const startingBalance: CreditSnapshot = {
  accountId,
  revision: 1 as CreditSnapshot['revision'],
  available: 100,
  reserved: 0,
  purchasedRemainder: 0,
  welcomeGrantEligible: false,
  welcomeGrantApplied: true,
  projectCapacity: {
    used: 0,
    total: 6,
    firstPurchaseUpgrade: false,
    revision: 1 as CreditSnapshot['projectCapacity']['revision'],
  },
}

const updatedBalance: CreditSnapshot = {
  ...startingBalance,
  revision: 2 as CreditSnapshot['revision'],
  available: 120,
}

const pack: CreditPack = {
  id: 'mock-pack-20',
  credits: 20,
  currency: 'MOCK',
  amountMinor: 0,
  note: 'synthetic-mock-scenario',
}

const pendingPurchase = {
  id: purchaseId,
  accountId,
  initiationId: 'initiation-credits-test' as OperationId,
  packId: pack.id,
  state: 'pending',
  revision: 1,
  note: 'synthetic-mock-scenario',
} as unknown as PurchaseSnapshot

const verifiedPurchase = {
  ...pendingPurchase,
  state: 'verified',
  revision: 2,
  verificationId: 'verification-credits-test' as OperationId,
} as PurchaseSnapshot

function makeProps(services: Partial<Services>) {
  return {
    route: { kind: 'credits' },
    locale: 'en',
    identity: {
      status: 'signed-in',
      account: { id: accountId },
      session: { id: 'session-credits-test' },
    },
    signInIntent: { kind: 'new' },
    services: services as Services,
    navigate: vi.fn().mockResolvedValue(undefined),
    refreshIdentity: vi.fn(),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  } as unknown as FeatureScreenProps
}

function renderScreen(props: FeatureScreenProps) {
  return render(
    <LocaleProvider services={props.services} onAccountUpdated={vi.fn()}>
      <CreditsScreen {...props} />
    </LocaleProvider>,
  )
}

function makeServices() {
  let currentBalance = startingBalance
  const simulateCheckout = vi.fn()
  const applyVerifiedPurchase = vi.fn().mockImplementation(async () => {
    currentBalance = updatedBalance
    return ok(updatedBalance)
  })
  const services = {
    credits: {
      snapshot: vi.fn().mockImplementation(async () => ok(currentBalance)),
      history: vi.fn().mockResolvedValue(ok([])),
      historyPage: vi.fn().mockResolvedValue(ok({ entries: [], nextCursor: null })),
      packs: vi.fn().mockResolvedValue(ok([pack])),
      startPurchase: vi.fn().mockResolvedValue(ok({ purchaseId, state: 'pending' })),
      resolvePurchase: vi.fn().mockResolvedValue(ok({ purchase: pendingPurchase, snapshot: startingBalance })),
      simulateCheckout,
      applyVerifiedPurchase,
    },
    operations: {
      resolve: vi.fn(),
    },
    projects: {},
    uploads: {},
  } as unknown as Services

  return { services, simulateCheckout, applyVerifiedPurchase }
}

describe('CreditsScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.setItem('dubbed.locale', 'en')
  })

  it('keeps a pending mock checkout out of the balance until the service verifies it', async () => {
    const user = userEvent.setup()
    const { services, simulateCheckout, applyVerifiedPurchase } = makeServices()
    simulateCheckout.mockResolvedValue(ok({
      outcome: 'pending',
      purchase: pendingPurchase,
      note: 'synthetic-mock-scenario',
    }))

    renderScreen(makeProps(services))
    expect(await screen.findByText('100')).toBeInTheDocument()
    expect(screen.getByText(/Configured mock amount: 0 MOCK units/)).toBeInTheDocument()
    expect(screen.getByText(/No payment is collected/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start mock checkout' }))
    expect(await screen.findByText('Confirming payment')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep pending' }))

    expect(await screen.findByText(/still pending/)).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(applyVerifiedPurchase).not.toHaveBeenCalled()
  })

  it('resolves an unknown simulated result before retrying the same operation id', async () => {
    const user = userEvent.setup()
    const { services, simulateCheckout, applyVerifiedPurchase } = makeServices()
    simulateCheckout
      .mockResolvedValueOnce({ status: 'unknown', error: { code: 'unknown-operation' } })
      .mockResolvedValueOnce(ok({
        outcome: 'verified',
        purchase: verifiedPurchase,
        verificationId: verifiedPurchase.verificationId,
        note: 'synthetic-mock-scenario',
      }))
    vi.mocked(services.operations.resolve).mockResolvedValue(ok({
      state: 'not-started',
      operationId: 'simulation-operation' as OperationId,
      safeToRetrySameId: true,
    }) as never)

    renderScreen(makeProps(services))
    await user.click(await screen.findByRole('button', { name: 'Start mock checkout' }))
    await screen.findByText('Confirming payment')
    await user.click(screen.getByRole('button', { name: 'Simulate verified payment' }))
    await user.click(await screen.findByRole('button', { name: 'Check payment status' }))

    expect(simulateCheckout).toHaveBeenCalledTimes(2)
    expect(simulateCheckout.mock.calls[0][0].operationId).toBe(simulateCheckout.mock.calls[1][0].operationId)
    expect(applyVerifiedPurchase).toHaveBeenCalledTimes(1)
    expect(applyVerifiedPurchase).toHaveBeenCalledWith(expect.objectContaining({
      purchaseId,
      verificationId: verifiedPurchase.verificationId,
    }))
  })

  it('ignores an older-page response when a first-page refresh replaces the history', async () => {
    const user = userEvent.setup()
    const { services } = makeServices()
    const firstCursor = 'history-cursor-first' as CreditHistoryCursor
    type TestHistoryPage = { entries: LedgerEntry[]; nextCursor: CreditHistoryCursor | null }
    let olderPageResolve!: (value: ReturnType<typeof ok<TestHistoryPage>>) => void
    const olderPage = new Promise<ReturnType<typeof ok<TestHistoryPage>>>((resolve) => {
      olderPageResolve = resolve
    })
    const first = {
      id: 'ledger-first' as OperationId,
      accountId,
      revision: 3 as LedgerEntry['revision'],
      kind: 'welcome-grant',
      occurredAt: 3,
      delta: 100,
      availableAfter: 100,
      reservedAfter: 0,
      note: 'synthetic-mock-scenario',
    } satisfies LedgerEntry
    const stale = {
      ...first,
      id: 'ledger-stale' as OperationId,
      revision: 2 as LedgerEntry['revision'],
      kind: 'pending-purchase',
      delta: null,
      availableAfter: null,
    } satisfies LedgerEntry
    const refreshed = {
      ...first,
      id: 'ledger-refreshed' as OperationId,
      revision: 4 as LedgerEntry['revision'],
      kind: 'verified-purchase',
      occurredAt: 4,
      delta: 20,
      availableAfter: 120,
    } satisfies LedgerEntry
    vi.mocked(services.credits.historyPage)
      .mockResolvedValueOnce(ok({ entries: [first], nextCursor: firstCursor }))
      .mockReturnValueOnce(olderPage)
      .mockResolvedValueOnce(ok({ entries: [refreshed], nextCursor: null }))

    const props = makeProps(services)
    const view = renderScreen(props)
    await screen.findByText('Welcome credits')
    await user.click(screen.getByRole('button', { name: 'Show more' }))
    expect(screen.getByRole('button', { name: 'Loading older activity…' })).toBeDisabled()

    view.rerender(
      <LocaleProvider services={services} onAccountUpdated={vi.fn()}>
        <CreditsScreen {...makeProps(services)} />
      </LocaleProvider>,
    )
    await screen.findByText('Verified purchase')
    olderPageResolve(ok({ entries: [stale], nextCursor: null }))

    expect(screen.queryByText('Pending purchase')).not.toBeInTheDocument()
    expect(screen.getByText('Verified purchase')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument()
  })

  it('keeps the balance and history visible when packs fail and retries only the pack region', async () => {
    const user = userEvent.setup()
    const { services } = makeServices()
    let resolveRetry!: (result: Awaited<ReturnType<typeof services.credits.packs>>) => void
    const pendingRetry = new Promise<Awaited<ReturnType<typeof services.credits.packs>>>((resolve) => {
      resolveRetry = resolve
    })
    vi.mocked(services.credits.packs)
      .mockResolvedValueOnce({ status: 'error', error: { code: 'adapter-unavailable' } } as never)
      .mockReturnValueOnce(pendingRetry)
      .mockResolvedValueOnce(ok([pack]))

    renderScreen(makeProps(services))

    const packs = await screen.findByRole('region', { name: 'Credit packs' })
    expect(within(packs).getByRole('alert')).toHaveTextContent('Credit packs could not be loaded')
    expect(within(packs).getByRole('button', { name: 'Retry packs' })).toBeEnabled()
    expect(document.querySelector('.workspace-error')).toBeNull()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('No credit activity yet.')).toBeInTheDocument()

    const retry = within(packs).getByRole('button', { name: 'Retry packs' })
    await user.click(retry)
    const loading = within(packs).getByRole('button', { name: 'Loading credit packs…' })
    expect(loading).toBe(retry)
    expect(loading).toHaveAttribute('aria-disabled', 'true')
    expect(loading).toHaveFocus()
    expect(within(packs).getByRole('alert')).toBeInTheDocument()

    resolveRetry({
      status: 'error',
      error: { code: 'adapter-unavailable', message: 'Synthetic retry failure.', retry: 'none' },
    })
    const retryAgain = await within(packs).findByRole('button', { name: 'Retry packs' })
    await waitFor(() => expect(retryAgain).toHaveFocus())
    expect(retryAgain).toBeEnabled()
    await user.click(retryAgain)

    expect(await within(packs).findByText('20 credits')).toBeInTheDocument()
    expect(within(packs).queryByRole('alert')).not.toBeInTheDocument()
    expect(services.credits.packs).toHaveBeenCalledTimes(3)
    expect(services.credits.snapshot).toHaveBeenCalledTimes(1)
    expect(services.credits.historyPage).toHaveBeenCalledTimes(1)
  })
})
