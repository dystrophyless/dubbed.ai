import type {
  CancellationQuote,
  CreditSnapshot,
  LedgerEntry,
  OperationId,
  PreparationAttemptClass,
  ProcessingQuote,
  ProjectId,
  QuoteId,
  ReservationId,
} from './contracts'
import { asRevision } from './contracts'
import {
  creditSnapshot,
  newOperationId,
  nowMs,
  readRecord,
  requireProject,
  revisionConflict,
  serviceError,
  writeRecord,
  type StoredCreditState,
  type StoredOperation,
  type StoredQuote,
  type StoredReservation,
  type StoreContext,
} from './mock-store'
import type { OwnedProject } from './contracts'

export interface ReserveOutput {
  reservationId: OperationId
  snapshot: CreditSnapshot
}

export function nextCreditRevision(state: StoredCreditState): StoredCreditState {
  return { ...state, revision: asRevision(Number(state.revision) + 1) }
}

export function newLedgerEntry(
  accountId: StoredCreditState['accountId'],
  revision: StoredCreditState['revision'],
  kind: LedgerEntry['kind'],
  now: number,
  state: StoredCreditState,
  data: Partial<Pick<LedgerEntry, 'delta' | 'availableAfter' | 'reservedAfter' | 'projectId' | 'relatedOperationId'>> = {},
): LedgerEntry {
  return {
    id: newOperationId(),
    accountId,
    revision,
    kind,
    occurredAt: now,
    delta: data.delta ?? null,
    availableAfter: Object.hasOwn(data, 'availableAfter') ? data.availableAfter ?? null : state.available,
    reservedAfter: data.reservedAfter ?? state.reserved,
    projectId: data.projectId,
    relatedOperationId: data.relatedOperationId,
    note: 'synthetic-mock-scenario',
  }
}

export async function reserveFromQuote(
  transaction: IDBTransaction,
  context: StoreContext,
  accountId: StoredCreditState['accountId'],
  projectId: ProjectId,
  quoteId: QuoteId,
  operationId: OperationId,
  expectedProjectRevision?: OwnedProject['revision'],
  expectedSourceRevision?: OwnedProject['sourceRevision'],
  expectedActivePreparationId?: OwnedProject['preparationId'],
  expectedActivePreparationRevision?: OwnedProject['preparationRevision'],
  expectedAttemptClass?: PreparationAttemptClass,
): Promise<ReserveOutput> {
  const project = await requireProject<OwnedProject>(transaction, accountId, projectId)
  if (expectedProjectRevision !== undefined && project.revision !== expectedProjectRevision) {
    throw revisionConflict('Project changed after this quote. Review the selection and quote again.', project.revision)
  }
  if (expectedSourceRevision !== undefined && project.sourceRevision !== expectedSourceRevision) {
    throw revisionConflict('Source media changed after this quote. Review the selection and quote again.', project.sourceRevision)
  }
  if ((expectedActivePreparationId !== undefined && project.preparationId !== expectedActivePreparationId)
    || (expectedActivePreparationRevision !== undefined && project.preparationRevision !== expectedActivePreparationRevision)) {
    throw revisionConflict('The active preparation changed after this quote. Review the replacement warning and quote again.', project.revision)
  }
  const storedQuote = await readRecord<StoredQuote>(transaction, 'quotes', quoteId)
  if (!storedQuote || storedQuote.accountId !== accountId || storedQuote.projectId !== projectId) {
    throw serviceError('not-found', 'Processing quote was not found.')
  }
  const quote = storedQuote.quote as unknown as ProcessingQuote
  if (quote.id !== quoteId || quote.expiresAt <= nowMs(context.clock)) throw serviceError('expired', 'This processing quote has expired.')
  if (quote.projectRevision !== project.revision
    || quote.activePreparationId !== project.preparationId
    || quote.activePreparationRevision !== project.preparationRevision
    || quote.activePreparationId !== expectedActivePreparationId
    || quote.activePreparationRevision !== expectedActivePreparationRevision) {
    throw revisionConflict('The active preparation changed after this quote. Review the replacement warning and quote again.', project.revision)
  }
  if (quote.sourceId !== project.sourceId || quote.sourceRevision !== project.sourceRevision || quote.selectionRevision !== project.selection.revision) {
    throw revisionConflict('The source or selected section changed after this quote.', project.revision)
  }
  const state = await readRecord<StoredCreditState>(transaction, 'creditStates', accountId)
  if (!state) throw serviceError('not-found', 'Credit balance is unavailable.')
  if (state.revision !== quote.creditRevision) throw revisionConflict('Credit balance changed after this quote. Review the quote again.', state.revision)
  if (expectedAttemptClass !== undefined && quote.attemptClass !== expectedAttemptClass) {
    throw revisionConflict('Preparation eligibility changed after this quote. Request a fresh quote.', project.revision)
  }
  if (!['initial', 'included-retry', 'paid-reprocessing'].includes(quote.attemptClass)) {
    throw serviceError('validation', 'The stored quote has no recognized preparation attempt class.')
  }
  const expectedCredits = quote.attemptClass === 'included-retry'
    ? 0
    : Math.ceil((project.selection.endMs - project.selection.startMs) / 1000)
  if (quote.credits !== expectedCredits) {
    throw serviceError('validation', 'The stored quote does not match the selected duration.')
  }
  if (state.available < quote.credits) throw serviceError('insufficient-credits', 'There are not enough available credits.')

  const updatedState = nextCreditRevision({
    ...state,
    available: state.available - quote.credits,
    reserved: state.reserved + quote.credits,
  })
  const reservationId = newOperationId()
  const reservation: StoredReservation = {
    id: reservationId,
    accountId,
    projectId,
    operationId,
    quoteId,
    attemptClass: quote.attemptClass,
    allocation: quote.credits,
    state: 'reserved',
    revision: asRevision(0),
  }
  await writeRecord(transaction, 'creditStates', updatedState)
  await writeRecord(transaction, 'reservations', reservation)
  await writeRecord(transaction, 'ledger', newLedgerEntry(accountId, updatedState.revision, 'processing-reservation', nowMs(context.clock), updatedState, {
    projectId,
    relatedOperationId: operationId,
  }))
  return { reservationId, snapshot: creditSnapshot(updatedState) }
}

export async function settleReservation(
  transaction: IDBTransaction,
  context: StoreContext,
  reservation: StoredReservation,
  outcome: 'successful-completion' | 'confirmed-cancellation',
  cancellationQuoteId?: QuoteId,
): Promise<CreditSnapshot> {
  const state = await readRecord<StoredCreditState>(transaction, 'creditStates', reservation.accountId)
  if (!state) throw serviceError('not-found', 'Credit balance is unavailable.')
  if (reservation.state === 'settled' || reservation.state === 'released') return creditSnapshot(state)
  if (reservation.state !== 'reserved') throw serviceError('conflict', 'Credit reservation is not active.')

  let charge = reservation.allocation
  let releaseAmount = 0
  if (outcome === 'confirmed-cancellation') {
    if (!cancellationQuoteId) throw serviceError('validation', 'A confirmed cancellation requires its stored quote.')
    const storedQuote = await readRecord<StoredQuote>(transaction, 'quotes', cancellationQuoteId)
    if (!storedQuote || storedQuote.accountId !== reservation.accountId || storedQuote.projectId !== reservation.projectId) {
      throw serviceError('not-found', 'Cancellation quote was not found.')
    }
    const quote = storedQuote.quote as unknown as CancellationQuote
    if (quote.kind !== 'cancellation' || quote.reservationId !== reservation.id || quote.targetOperationId !== reservation.operationId) {
      throw serviceError('forbidden', 'Cancellation quote does not match this operation.')
    }
    if (quote.expiresAt <= nowMs(context.clock)) throw serviceError('expired', 'Cancellation quote has expired. Request a fresh quote.')
    charge = quote.exactCharge
    releaseAmount = quote.releaseAmount
    if (charge + releaseAmount !== reservation.allocation) throw serviceError('validation', 'Cancellation allocation does not match the authorized reservation.')
  }
  if (!Number.isSafeInteger(charge) || charge < 0 || charge > reservation.allocation) {
    throw serviceError('validation', 'Authorized charge is outside the reserved amount.')
  }
  if (!Number.isSafeInteger(releaseAmount) || releaseAmount < 0) throw serviceError('validation', 'Release amount is invalid.')

  const updatedState = nextCreditRevision({
    ...state,
    available: state.available + releaseAmount,
    reserved: Math.max(0, state.reserved - reservation.allocation),
    purchasedRemainder: Math.max(0, state.purchasedRemainder - charge),
  })
  const updatedReservation: StoredReservation = {
    ...reservation,
    state: 'settled',
    settledCharge: charge,
    revision: asRevision(Number(reservation.revision) + 1),
  }
  await writeRecord(transaction, 'creditStates', updatedState)
  await writeRecord(transaction, 'reservations', updatedReservation)
  await writeRecord(transaction, 'ledger', newLedgerEntry(reservation.accountId, updatedState.revision, 'processing-settlement', nowMs(context.clock), updatedState, {
    delta: charge === 0 ? 0 : -charge,
    projectId: reservation.projectId,
    relatedOperationId: reservation.operationId,
  }))
  return creditSnapshot(updatedState)
}

export async function releaseReservation(
  transaction: IDBTransaction,
  context: StoreContext,
  reservation: StoredReservation,
): Promise<CreditSnapshot> {
  const state = await readRecord<StoredCreditState>(transaction, 'creditStates', reservation.accountId)
  if (!state) throw serviceError('not-found', 'Credit balance is unavailable.')
  if (reservation.state !== 'reserved') return creditSnapshot(state)
  const updatedState = nextCreditRevision({
    ...state,
    available: state.available + reservation.allocation,
    reserved: Math.max(0, state.reserved - reservation.allocation),
  })
  await writeRecord(transaction, 'creditStates', updatedState)
  await writeRecord(transaction, 'reservations', {
    ...reservation,
    state: 'released',
    settledCharge: 0,
    revision: asRevision(Number(reservation.revision) + 1),
  } satisfies StoredReservation)
  await writeRecord(transaction, 'ledger', newLedgerEntry(reservation.accountId, updatedState.revision, 'reservation-release', nowMs(context.clock), updatedState, {
    delta: 0,
    projectId: reservation.projectId,
    relatedOperationId: reservation.operationId,
  }))
  return creditSnapshot(updatedState)
}

export async function settleFromOperation(
  transaction: IDBTransaction,
  context: StoreContext,
  reservationId: OperationId,
  authoritativeOperationId: OperationId,
  outcome: 'successful-completion' | 'confirmed-cancellation',
  cancellationQuoteId?: QuoteId,
): Promise<CreditSnapshot> {
  const reservation = await readRecord<StoredReservation>(transaction, 'reservations', reservationId)
  if (!reservation || reservation.operationId !== authoritativeOperationId) throw serviceError('forbidden', 'This operation is not authorized for the reservation.')
  const operation = await readRecord<StoredOperation>(transaction, 'operations', authoritativeOperationId)
  if (!operation?.job) throw serviceError('operation-not-found', 'Processing outcome was not found.')
  const result = operation.job.result as { state?: string } | undefined
  if (outcome === 'successful-completion' && (operation.job.state !== 'committed' || result?.state !== 'complete')) {
    throw serviceError('conflict', 'The processing operation has not completed successfully.')
  }
  if (outcome === 'confirmed-cancellation' && (operation.job.state !== 'committed' || result?.state !== 'cancelled')) {
    throw serviceError('conflict', 'The processing operation has not been cancelled.')
  }
  return settleReservation(transaction, context, reservation, outcome, cancellationQuoteId)
}

export async function creditStateForAccount(
  transaction: IDBTransaction,
  accountId: StoredCreditState['accountId'],
): Promise<StoredCreditState> {
  const state = await readRecord<StoredCreditState>(transaction, 'creditStates', accountId)
  if (!state) throw serviceError('not-found', 'Credit balance is unavailable.')
  return state
}

export function asReservationId(value: OperationId): ReservationId {
  return value as ReservationId
}
