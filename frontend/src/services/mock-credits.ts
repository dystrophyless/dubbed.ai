import type {
  CreditPack,
  CreditHistoryCursor,
  CreditsService,
  LedgerEntry,
  OperationId,
  ProcessingQuote,
  PurchaseSnapshot,
  SimulatedCheckoutSnapshot,
} from './contracts'
import { asRevision, ids } from './contracts'
import {
  creditSnapshot,
  errorResult,
  newOperationId,
  nowMs,
  readRecord,
  recordsByIndex,
  requireContext,
  requireProject,
  revisionConflict,
  serviceError,
  transact,
  writeRecord,
  type StoredPurchase,
  type StoredQuote,
  type StoredReservation,
  type StoredReturnContext,
  type StoreContext,
} from './mock-store'
import { fingerprint, mutate } from './mutations'
import { requestResult } from './indexeddb'
import {
  creditStateForAccount,
  newLedgerEntry,
  nextCreditRevision,
  releaseReservation,
  reserveFromQuote,
  settleFromOperation,
} from './mock-ledger'
import type { OwnedProject } from './contracts'

const MOCK_PACKS: readonly CreditPack[] = [
  { id: 'mock-pack-20', credits: 20, currency: 'MOCK', amountMinor: 0, note: 'synthetic-mock-scenario' },
]
const MOCK_RETURN_CONTEXT_TTL_MS = 30 * 60 * 1000
const MOCK_CREDIT_HISTORY_PAGE_SIZE = 20

function creditHistoryCursor(entry: LedgerEntry): CreditHistoryCursor {
  return `mock-credit-history-v1:${entry.revision}:${entry.occurredAt}:${encodeURIComponent(entry.id)}` as CreditHistoryCursor
}

function compareLedgerNewestFirst(left: LedgerEntry, right: LedgerEntry): number {
  return right.revision - left.revision ||
    right.occurredAt - left.occurredAt ||
    right.id.localeCompare(left.id, 'en')
}

export function createMockCredits(context: StoreContext): CreditsService {
  return {
    snapshot: async () => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'creditStates'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const state = await creditStateForAccount(transaction, account.id)
          return { status: 'ok', data: creditSnapshot(state), replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    history: async () => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'ledger'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const entries = await recordsByIndex<LedgerEntry>(transaction, 'ledger', 'accountId', account.id)
          entries.sort((left, right) => left.revision - right.revision || left.occurredAt - right.occurredAt || left.id.localeCompare(right.id, 'en'))
          return { status: 'ok', data: entries, replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    historyPage: async ({ cursor } = {}) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'ledger'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const entries = await recordsByIndex<LedgerEntry>(transaction, 'ledger', 'accountId', account.id)
          entries.sort(compareLedgerNewestFirst)

          let offset = 0
          if (cursor !== undefined) {
            const boundaryIndex = entries.findIndex((entry) => creditHistoryCursor(entry) === cursor)
            if (boundaryIndex === -1) {
              throw serviceError('validation', 'The credit history cursor is invalid for this account.')
            }
            offset = boundaryIndex + 1
          }

          const page = entries.slice(offset, offset + MOCK_CREDIT_HISTORY_PAGE_SIZE)
          const hasOlderRows = offset + page.length < entries.length
          const lastEntry = page.at(-1)
          return {
            status: 'ok',
            data: {
              entries: page,
              nextCursor: hasOlderRows && lastEntry ? creditHistoryCursor(lastEntry) : null,
            },
            replayed: false,
          } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    packs: async () => ({ status: 'ok', data: MOCK_PACKS.map((pack) => ({ ...pack })), replayed: false }),
    grantEligibleWelcome: async (input) => {
      const requestHash = await fingerprint({ action: 'grant-eligible-welcome' })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.welcome-grant',
        payloadFingerprint: requestHash,
        stores: ['creditStates', 'ledger'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const state = await creditStateForAccount(transaction, ids.account(accountId))
          if (state.welcomeGrantApplied) return { data: creditSnapshot(state), accountId: state.accountId }
          if (!state.welcomeGrantEligible) throw serviceError('forbidden', 'This account is not eligible for a welcome grant.')
          const updated = nextCreditRevision({ ...state, available: state.available + 120, welcomeGrantEligible: false, welcomeGrantApplied: true })
          await writeRecord(transaction, 'creditStates', updated)
          await writeRecord(transaction, 'ledger', newLedgerEntry(updated.accountId, updated.revision, 'welcome-grant', nowMs(context.clock), updated, { delta: 120 }))
          return { data: creditSnapshot(updated), accountId: state.accountId }
        },
      })
    },
    reserve: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, quoteId: input.quoteId, expectedCreditRevision: input.expectedCreditRevision, expectedProjectRevision: input.expectedProjectRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.reserve',
        payloadFingerprint: requestHash,
        stores: ['projects', 'quotes', 'creditStates', 'reservations', 'ledger'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const state = await creditStateForAccount(transaction, ids.account(accountId))
          if (state.revision !== input.expectedCreditRevision) throw revisionConflict('Credit balance changed. Review the quote again.', state.revision)
          const reservation = await reserveFromQuote(transaction, context, ids.account(accountId), input.projectId, input.quoteId, input.operationId, input.expectedProjectRevision)
          return { data: reservation, accountId: ids.account(accountId) }
        },
      })
    },
    settle: async (input) => {
      const requestHash = await fingerprint({ reservationId: input.reservationId, authoritativeOperationId: input.authoritativeOperationId, outcome: input.outcome, cancellationQuoteId: input.cancellationQuoteId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.settle',
        payloadFingerprint: requestHash,
        stores: ['operations', 'reservations', 'quotes', 'creditStates', 'ledger'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const reservation = await readRecord<StoredReservation>(transaction, 'reservations', input.reservationId)
          if (!reservation || reservation.accountId !== accountId) throw serviceError('not-found', 'Credit reservation was not found.')
          const data = await settleFromOperation(transaction, context, input.reservationId, input.authoritativeOperationId, input.outcome, input.cancellationQuoteId)
          return { data, accountId: reservation.accountId }
        },
      })
    },
    release: async (input) => {
      const requestHash = await fingerprint({ reservationId: input.reservationId, reason: input.reason })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.release',
        payloadFingerprint: requestHash,
        stores: ['operations', 'reservations', 'creditStates', 'ledger'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const reservation = await readRecord<StoredReservation>(transaction, 'reservations', input.reservationId)
          if (!reservation || reservation.accountId !== accountId) throw serviceError('not-found', 'Credit reservation was not found.')
          const operation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', reservation.operationId)
          const result = operation?.job?.result as { state?: string; queued?: boolean } | undefined
          const authorized = input.reason === 'system-failure'
            ? operation?.job?.state === 'rejected' && result?.state === 'failed'
            : operation?.job?.state === 'committed' && result?.state === 'cancelled' && result.queued === true
          if (!authorized) throw serviceError('forbidden', 'The operation has no matching release authorization.')
          const snapshot = await releaseReservation(transaction, context, reservation)
          return { data: snapshot, accountId: reservation.accountId }
        },
      })
    },
    applyVerifiedPurchase: async (input) => {
      const requestHash = await fingerprint({ purchaseId: input.purchaseId, verificationId: input.verificationId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.apply-verified-purchase',
        payloadFingerprint: requestHash,
        stores: ['purchases', 'creditStates', 'ledger'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const purchase = await readRecord<StoredPurchase>(transaction, 'purchases', input.purchaseId)
          if (!purchase || purchase.accountId !== accountId) throw serviceError('not-found', 'Purchase was not found.')
          if (purchase.state !== 'verified' || purchase.verificationId !== input.verificationId || purchase.credited) {
            if (purchase.credited && purchase.verificationId === input.verificationId) {
              const state = await creditStateForAccount(transaction, ids.account(accountId))
              return { data: creditSnapshot(state), accountId: state.accountId }
            }
            throw serviceError('forbidden', 'A verified mock purchase receipt is required before credits can be posted.')
          }
          const pack = MOCK_PACKS.find((candidate) => candidate.id === purchase.packId)
          if (!pack) throw serviceError('not-found', 'Purchase pack is no longer available.')
          const state = await creditStateForAccount(transaction, ids.account(accountId))
          const updated = nextCreditRevision({
            ...state,
            available: state.available + pack.credits,
            purchasedRemainder: state.purchasedRemainder + pack.credits,
            capacityTotal: state.firstPurchaseUpgrade ? state.capacityTotal : 10,
            firstPurchaseUpgrade: true,
          })
          purchase.credited = true
          purchase.credits = pack.credits
          purchase.revision = asRevision(Number(purchase.revision) + 1)
          await writeRecord(transaction, 'creditStates', updated)
          await writeRecord(transaction, 'purchases', purchase)
          await writeRecord(transaction, 'ledger', newLedgerEntry(updated.accountId, updated.revision, 'verified-purchase', nowMs(context.clock), updated, { delta: pack.credits, relatedOperationId: purchase.id }))
          return { data: creditSnapshot(updated), accountId: updated.accountId }
        },
      })
    },
    simulateCheckout: async (input) => {
      const requestHash = await fingerprint({ purchaseId: input.purchaseId, outcome: input.outcome })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.simulate-checkout',
        payloadFingerprint: requestHash,
        stores: ['purchases'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const purchase = await readRecord<StoredPurchase>(transaction, 'purchases', input.purchaseId)
          if (!purchase || purchase.accountId !== accountId) throw serviceError('not-found', 'Purchase was not found.')
          if (purchase.state === 'pending' && input.outcome !== 'pending') {
            purchase.state = input.outcome
            if (input.outcome === 'verified') purchase.verificationId = newOperationId()
            purchase.revision = asRevision(Number(purchase.revision) + 1)
            await writeRecord(transaction, 'purchases', purchase)
          } else if (purchase.state !== input.outcome) {
            throw serviceError('conflict', 'The checkout outcome has already been finalized.')
          }
          return { data: simulatedCheckoutSnapshot(purchase), accountId: purchase.accountId }
        },
      })
    },
    startPurchase: async (input) => {
      const requestHash = await fingerprint({ packId: input.packId, initiationId: input.initiationId, returnContextId: input.returnContextId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.start-purchase',
        payloadFingerprint: requestHash,
        stores: ['purchases', 'creditStates', 'ledger', 'returnContexts'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const pack = MOCK_PACKS.find((candidate) => candidate.id === input.packId)
          if (!pack) throw serviceError('not-found', 'Purchase pack was not found.')
          const returnContext = input.returnContextId
            ? await readRecord<StoredReturnContext>(transaction, 'returnContexts', input.returnContextId)
            : undefined
          if (input.returnContextId && (!returnContext || returnContext.accountId !== accountId || returnContext.expiresAt <= nowMs(context.clock))) {
            throw serviceError('expired', 'The project return context has expired.')
          }
          const purchase: StoredPurchase = {
            id: newOperationId(),
            accountId: ids.account(accountId),
            initiationId: input.initiationId,
            packId: input.packId,
            state: 'pending',
            ...(input.returnContextId ? { returnContextId: input.returnContextId } : {}),
            revision: asRevision(0),
          }
          const state = await creditStateForAccount(transaction, ids.account(accountId))
          const updated = nextCreditRevision(state)
          await writeRecord(transaction, 'creditStates', updated)
          await writeRecord(transaction, 'purchases', purchase)
          await writeRecord(transaction, 'ledger', newLedgerEntry(updated.accountId, updated.revision, 'pending-purchase', nowMs(context.clock), updated, {
            delta: null,
            availableAfter: null,
            relatedOperationId: purchase.id,
          }))
          return {
            data: {
              purchaseId: purchase.id,
              state: 'pending' as const,
              ...(input.returnContextId ? { returnContextId: input.returnContextId } : {}),
            },
            accountId: ids.account(accountId),
          }
        },
      })
    },
    resolvePurchase: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'purchases', 'creditStates'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const purchase = await requestPurchaseByInitiation(transaction, input.initiationId)
          if (!purchase || purchase.accountId !== account.id) throw serviceError('not-found', 'Purchase was not found.')
          const state = await creditStateForAccount(transaction, account.id)
          return {
            status: 'ok',
            replayed: false,
            data: {
              purchase: purchaseSnapshot(purchase),
              snapshot: creditSnapshot(state),
            },
          } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    createReturnContext: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, sourceId: input.sourceId, selection: input.selection, quoteId: input.quoteId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'credits.create-return-context',
        payloadFingerprint: requestHash,
        stores: ['projects', 'returnContexts', 'quotes'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.sourceId !== input.sourceId || project.selection.revision !== input.selection.revision || project.selection.startMs !== input.selection.startMs || project.selection.endMs !== input.selection.endMs) {
            throw revisionConflict('Project source or section changed. Return to the project and review it.', project.revision)
          }
          if (input.quoteId) {
            const quote = await readRecord<StoredQuote>(transaction, 'quotes', input.quoteId)
            const data = quote?.quote as unknown as ProcessingQuote | undefined
            if (!quote || quote.accountId !== accountId || data?.projectId !== project.id || data.sourceRevision !== project.sourceRevision) throw serviceError('not-found', 'The quote for this return context was not found.')
          }
          const returnContextId = input.operationId
          const contextRecord: StoredReturnContext = {
            id: returnContextId,
            accountId: ids.account(accountId),
            projectId: project.id,
            sourceId: input.sourceId,
            selection: project.selection,
            quoteId: input.quoteId,
            expiresAt: nowMs(context.clock) + MOCK_RETURN_CONTEXT_TTL_MS,
            revision: asRevision(0),
          }
          await writeRecord(transaction, 'returnContexts', contextRecord)
          return { data: { returnContextId, expiresAt: contextRecord.expiresAt }, accountId: ids.account(accountId) }
        },
      })
    },
    resolveReturnContext: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'returnContexts', 'projects', 'quotes'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const stored = await readRecord<StoredReturnContext>(transaction, 'returnContexts', input.returnContextId)
          if (!stored || stored.accountId !== account.id || stored.expiresAt <= nowMs(context.clock)) return { status: 'ok', data: { valid: false }, replayed: false } as const
          const project = await readRecord<OwnedProject>(transaction, 'projects', stored.projectId)
          if (!project || project.accountId !== account.id || project.sourceId !== stored.sourceId || project.selection.revision !== stored.selection.revision) return { status: 'ok', data: { valid: false }, replayed: false } as const
          let lastQuote: ProcessingQuote | undefined
          if (stored.quoteId) {
            const quote = await readRecord<StoredQuote>(transaction, 'quotes', stored.quoteId)
            lastQuote = quote?.quote as unknown as ProcessingQuote | undefined
          }
          return { status: 'ok', replayed: false, data: { valid: true, projectId: stored.projectId, sourceId: stored.sourceId, selection: stored.selection, lastQuote } } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  }
}

async function requestPurchaseByInitiation(transaction: IDBTransaction, initiationId: OperationId): Promise<StoredPurchase | undefined> {
  return await requestResult(transaction.objectStore('purchases').index('initiationId').get(initiationId)) as StoredPurchase | undefined
}

function purchaseSnapshot(purchase: StoredPurchase): PurchaseSnapshot {
  return {
    id: purchase.id,
    accountId: purchase.accountId,
    initiationId: purchase.initiationId,
    packId: purchase.packId,
    state: purchase.state,
    ...(purchase.verificationId ? { verificationId: purchase.verificationId } : {}),
    ...(purchase.returnContextId ? { returnContextId: purchase.returnContextId } : {}),
    revision: purchase.revision,
    note: 'synthetic-mock-scenario',
  }
}

function simulatedCheckoutSnapshot(purchase: StoredPurchase): SimulatedCheckoutSnapshot {
  const snapshot = {
    id: purchase.id,
    accountId: purchase.accountId,
    initiationId: purchase.initiationId,
    packId: purchase.packId,
    ...(purchase.returnContextId ? { returnContextId: purchase.returnContextId } : {}),
    revision: purchase.revision,
    note: 'synthetic-mock-scenario' as const,
  }
  if (purchase.state === 'verified') {
    if (!purchase.verificationId) throw serviceError('storage-unavailable', 'The verified mock checkout is missing its verification ID.')
    return {
      outcome: 'verified',
      purchase: { ...snapshot, state: 'verified', verificationId: purchase.verificationId },
      verificationId: purchase.verificationId,
      note: 'synthetic-mock-scenario',
    }
  }
  return {
    outcome: purchase.state,
    purchase: { ...snapshot, state: purchase.state },
    note: 'synthetic-mock-scenario',
  }
}
