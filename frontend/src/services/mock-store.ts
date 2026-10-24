import type {
  AccountId,
  AccountSnapshot,
  AssemblyAuthorization,
  CreditSnapshot,
  MockGoogleScenario,
  OperationId,
  OperationSnapshot,
  PreparationAttemptClass,
  ProjectId,
  QuoteId,
  RecordingAccess,
  RecordingCandidate,
  ResultGeneration,
  Revision,
  ServiceClock,
  ServiceError,
  ServiceResult,
  Session,
  SessionId,
  SignInIntent,
  SourceFacts,
} from './contracts'
import { asRevision, ids } from './contracts'
import {
  requestResult,
  runTransaction,
  type WorkspaceStoreName,
} from './indexeddb'

export type StoredRecord = Record<string, unknown>

export interface ActiveContext {
  account: AccountSnapshot
  session: Session
}

export interface StoredCredential {
  accountId: AccountId
  /** The verified email method that owns this credential; older records fall back to account.email. */
  email?: string
  passwordHash: string
  passwordSalt: string
}

export interface StoredAccount extends AccountSnapshot {
  methods: Array<{
    kind: 'email-password' | 'google'
    address: string
    verified: boolean
    linkedAt: number
  }>
}

export interface StoredAccountHistory {
  emailHash: string
  welcomeGrantUsed: boolean
  lastDeletionAt: number
}

export interface StoredVerification {
  id: OperationId
  email: string
  emailHash?: string
  purpose: 'registration' | 'password-reset' | 'link-email' | 'link-candidate-email'
  codeHash: string
  expiresAt: number
  resendAvailableAt: number
  resendCount: number
  /** Send timestamps are persisted so the hourly cap is service-authoritative across reloads. */
  sendTimes?: number[]
  /** Monotonically increases when a replacement code is issued for this request identity. */
  codeGeneration?: number
  revision: Revision
  state: 'pending' | 'verified' | 'completed' | 'expired'
  passwordHash?: string
  accountId?: AccountId
  /** Browser-client fence for anonymous registration and reset recovery; never a provider credential. */
  clientId?: string
  registrationMode?: 'create-account' | 'add-password' | 'restore-deleted'
  linkIntentId?: OperationId
  returnIntent?: SignInIntent
}

export interface StoredResetGrant {
  id: OperationId
  accountId: AccountId
  email: string
  requestId: OperationId
  clientId?: string
  expiresAt: number
  revision: Revision
  used: boolean
}

export interface StoredLinkIntent {
  id: OperationId
  accountId: AccountId
  currentMethod: 'email-password' | 'google'
  candidateMethod: 'email-password' | 'google'
  candidateEmail?: string
  candidatePasswordHash?: string
  candidatePasswordSalt?: string
  candidateVerificationRequestId?: OperationId
  candidateSendTimes: number[]
  expectedAccountRevision: Revision
  currentProofId?: OperationId
  candidateProofId?: OperationId
  proofs: StoredLinkProof[]
  providerProofs: StoredLinkProviderProof[]
  expiresAt: number
  state: 'pending' | 'completed' | 'cancelled' | 'conflict'
  revision: Revision
}

export interface StoredLinkProof {
  id: OperationId
  accountId: AccountId
  intentId: OperationId
  purpose: 'account-link-current' | 'account-link-candidate'
  method: 'email-password' | 'google'
  address: string
  issuedAt: number
  expiresAt: number
  consumedAt?: number
}

export interface StoredLinkProviderProof {
  id: OperationId
  accountId: AccountId
  intentId: OperationId
  purpose: 'account-link-current-provider' | 'account-link-candidate-provider'
  method: 'google'
  address: string
  issuedAt: number
  expiresAt: number
}

export interface StoredSource {
  id: string
  accountId: AccountId
  projectId: ProjectId
  facts: SourceFacts
  /** Computed before the IndexedDB write transaction; absent only in older mock namespaces. */
  contentHash?: string
  blob: Blob
  revision: Revision
}

export interface StoredPreparation {
  id: string
  accountId: AccountId
  projectId: ProjectId
  operationId: OperationId
  sourceRevision: Revision
  selectionRevision: Revision
  attemptClass: PreparationAttemptClass
  priorUsablePreparationId?: string
  /** Active preparation identity authorized before the replacement reservation. */
  authorizedActivePreparationId?: string
  authorizedActivePreparationRevision: Revision
  /** Drafts shown in the replacement warning and removed only in the activation transaction. */
  authorizedDraftIdsToDelete: string[]
  state: 'queued' | 'running' | 'complete' | 'failed' | 'cancelled'
  stageIndex: number
  /** Persisted synthetic deadline for the next background preparation phase. */
  nextStageAt?: number
  /** One-bit history needed to preserve the first-attempt failure scenario after project deletion. */
  deletedAttemptIsFirst?: boolean
  /** Scrubbed job tombstone; it may settle accounting but can never restore project access. */
  projectDeleted?: true
  revision: Revision
  createdAt: number
  turns: Array<{ id: string; text: string; startMs: number; endMs: number; windowStartMs?: number; windowEndMs?: number }>
  reservationId: OperationId
  usable: boolean
  includedRetryAvailable: boolean
  reprocessingLocked: boolean
  takeRevision?: Revision
}

/**
 * Explicit mock-only capture padding for the bundled dialogue fixture.
 * OPEN-09-08 keeps production margin and timing tolerance decisions unresolved.
 */
export const SYNTHETIC_CAPTURE_MARGIN_MS = 250

export interface StoredTurn {
  id: string
  accountId: AccountId
  projectId: ProjectId
  preparationId: string
  text: string
  startMs: number
  endMs: number
  windowStartMs?: number
  windowEndMs?: number
  revision: Revision
  acceptedTakeId?: string
}

export interface StoredDraft {
  id: string
  accountId: AccountId
  projectId: ProjectId
  turnId: string
  candidateId: string
  candidate: RecordingCandidate
  blob: Blob
  contentHash: string
  usable: boolean
  revision: Revision
  persistedAt: number
}

export interface StoredTake {
  id: string
  accountId: AccountId
  projectId: ProjectId
  turnId: string
  candidateId: string
  candidate: RecordingCandidate
  processingRevision: Revision
  timingRevision: Revision
  blob: Blob
  contentHash: string
  acceptedAt: number
  revision: Revision
}

export interface StoredGrant extends RecordingAccess {
  id: OperationId
  clientId: string
  recordingActorId: string
  createdAt: number
}

export interface StoredResult {
  id: string
  accountId: AccountId
  projectId: ProjectId
  operationId: OperationId
  retryLineageId: OperationId
  attemptKind?: 'initial' | 'automatic-retry' | 'manual-retry'
  automaticRetryOperationId?: OperationId
  automaticRetryExpectedProjectRevision?: Revision
  generationId?: string
  generation?: ResultGeneration
  state: 'complete' | 'failed'
  error?: ServiceError
  authorizationId?: OperationId
  assemblySnapshotKey?: string
  revision: Revision
}

export interface StoredQuote {
  id: QuoteId
  accountId: AccountId
  projectId: ProjectId
  quote: unknown
}

export interface StoredCreditState {
  accountId: AccountId
  revision: Revision
  available: number
  reserved: number
  purchasedRemainder: number
  welcomeGrantEligible: boolean
  welcomeGrantApplied: boolean
  capacityUsed: number
  capacityTotal: number
  firstPurchaseUpgrade: boolean
}

export interface StoredReservation {
  id: OperationId
  accountId: AccountId
  projectId: ProjectId
  operationId: OperationId
  quoteId: QuoteId
  attemptClass: PreparationAttemptClass
  allocation: number
  state: 'reserved' | 'settled' | 'released'
  settledCharge?: number
  revision: Revision
}

export interface StoredPurchase {
  id: OperationId
  accountId: AccountId
  initiationId: OperationId
  packId: string
  state: 'pending' | 'verified' | 'failed' | 'cancelled'
  verificationId?: OperationId
  returnContextId?: OperationId
  credits?: number
  credited?: boolean
  revision: Revision
}

export interface StoredReturnContext {
  id: OperationId
  accountId: AccountId
  projectId: ProjectId
  sourceId: import('./contracts').SourceId
  selection: { startMs: number; endMs: number; revision: Revision }
  quoteId?: QuoteId
  expiresAt: number
  revision: Revision
}

export interface StoredActivityEvent {
  id: OperationId
  accountId: AccountId
  projectId: ProjectId
  kind: 'opened' | 'user-change' | 'processing-completed' | 'result-completed'
  occurredAt: number
  revision: Revision
}

export interface StoredOperation {
  id: OperationId
  accountId?: AccountId
  /** Allows an anonymous same-browser delete resolver without revealing account identity. */
  clientId?: string
  kind: string
  requestHash: string
  result: unknown
  updatedAt: number
  revision: Revision
  job?: OperationSnapshot
}

export interface StoredAuthorization extends AssemblyAuthorization {
  accountId: AccountId
  state: 'available' | 'consumed'
  consumedBy?: OperationId
}

export interface StoreContext {
  database: Promise<IDBDatabase>
  factory: IDBFactory
  dbName: string
  clientId: string
  recordingActorId: string
  clock: ServiceClock
  scenario: string
  googleScenario: MockGoogleScenario
}

export class ServiceFault extends Error {
  readonly result: Exclude<ServiceResult<never>, { status: 'ok' | 'unknown' }>

  constructor(result: Exclude<ServiceResult<never>, { status: 'ok' | 'unknown' }>) {
    super(result.status === 'error' ? result.error.message : result.message)
    this.result = result
    this.name = 'ServiceFault'
  }
}

export const serviceError = (
  code: ServiceError['code'],
  message: string,
  retry: ServiceError['retry'] = 'none',
): ServiceFault => new ServiceFault({ status: 'error', error: { code, message, retry } })

export const revisionConflict = (message: string, currentRevision?: Revision) =>
  new ServiceFault({ status: 'conflict', code: 'revision-conflict', currentRevision, message })

export const intentConflict = (message: string) =>
  new ServiceFault({ status: 'conflict', code: 'intent-conflict', message })

export const nowMs = (clock: ServiceClock): number => Math.max(0, Math.floor(clock.now()))

export const newOperationId = (): OperationId => ids.operation(crypto.randomUUID())

export const newAccountId = (): AccountId => ids.account(crypto.randomUUID())

export const newSessionId = (): SessionId => ids.session(crypto.randomUUID())

export const nextRevision = (current: Revision | number): Revision => asRevision(Number(current) + 1)

export const readStore = (transaction: IDBTransaction, name: WorkspaceStoreName): IDBObjectStore =>
  transaction.objectStore(name)

export const readRecord = async <T>(
  transaction: IDBTransaction,
  name: WorkspaceStoreName,
  key: IDBValidKey,
): Promise<T | undefined> => (await requestResult(readStore(transaction, name).get(key))) as T | undefined

export const writeRecord = <T extends object>(
  transaction: IDBTransaction,
  name: WorkspaceStoreName,
  value: T,
): Promise<IDBValidKey> => requestResult(readStore(transaction, name).put(value))

export const removeRecord = (
  transaction: IDBTransaction,
  name: WorkspaceStoreName,
  key: IDBValidKey,
): Promise<void> => requestResult(readStore(transaction, name).delete(key))

export const allRecords = async <T>(
  transaction: IDBTransaction,
  name: WorkspaceStoreName,
): Promise<T[]> => (await requestResult(readStore(transaction, name).getAll())) as T[]

export const recordsByIndex = async <T>(
  transaction: IDBTransaction,
  name: WorkspaceStoreName,
  indexName: string,
  key: IDBValidKey | IDBKeyRange,
): Promise<T[]> =>
  (await requestResult(readStore(transaction, name).index(indexName).getAll(key))) as T[]

export const activeSessionMetaKey = (context: StoreContext): string => `activeSessionId:${context.clientId}`

export async function activeContext(transaction: IDBTransaction, context: StoreContext): Promise<ActiveContext | null> {
  const clock = context.clock
  const active = await readRecord<{ key: string; value: SessionId }>(transaction, 'meta', activeSessionMetaKey(context))
  if (!active) return null
  const session = await readRecord<Session>(transaction, 'sessions', active.value)
  if (!session) return null
  const account = await readRecord<AccountSnapshot>(transaction, 'accounts', session.accountId)
  if (!account || account.deleted) return null
  if (session.expiresAt <= nowMs(clock)) return null
  return { account, session }
}

export async function requireContext(transaction: IDBTransaction, context: StoreContext): Promise<ActiveContext> {
  const clock = context.clock
  const active = await readRecord<{ key: string; value: SessionId }>(transaction, 'meta', activeSessionMetaKey(context))
  if (!active) throw serviceError('unauthenticated', 'Sign in to continue.')
  const session = await readRecord<Session>(transaction, 'sessions', active.value)
  if (!session) throw serviceError('unauthenticated', 'Sign in to continue.')
  if (session.expiresAt <= nowMs(clock)) throw serviceError('expired', 'Your session has expired.')
  const account = await readRecord<AccountSnapshot>(transaction, 'accounts', session.accountId)
  if (!account || account.deleted) throw serviceError('account-deleted', 'This account is no longer available.')
  return { account, session }
}

export async function requireAccount(transaction: IDBTransaction, accountId: AccountId): Promise<AccountSnapshot> {
  const account = await readRecord<AccountSnapshot>(transaction, 'accounts', accountId)
  if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
  return account
}

export async function requireProject<T extends { id: ProjectId; accountId: AccountId }>(
  transaction: IDBTransaction,
  accountId: AccountId,
  projectId: ProjectId,
): Promise<T> {
  const project = await readRecord<T>(transaction, 'projects', projectId)
  if (!project || project.accountId !== accountId) throw serviceError('not-found', 'Project was not found.')
  return project
}

export async function sha256(value: string | Blob): Promise<string> {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : await value.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('')
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`
}

export function validateSignInIntent(intent?: SignInIntent): SignInIntent {
  if (!intent || intent.kind === 'new-dub') return { kind: 'new-dub' }
  return intent
}

export function creditSnapshot(state: StoredCreditState): CreditSnapshot {
  return {
    accountId: state.accountId,
    revision: state.revision,
    available: state.available,
    reserved: state.reserved,
    purchasedRemainder: state.purchasedRemainder,
    welcomeGrantEligible: state.welcomeGrantEligible,
    welcomeGrantApplied: state.welcomeGrantApplied,
    projectCapacity: {
      used: state.capacityUsed,
      total: state.capacityTotal,
      firstPurchaseUpgrade: state.firstPurchaseUpgrade,
      revision: state.revision,
    },
  }
}

export const assertSafeInteger = (value: number, label: string, min = 0): void => {
  if (!Number.isSafeInteger(value) || value < min) throw serviceError('validation', `${label} must be a whole number.`)
}

export async function transact<T>(
  context: StoreContext,
  stores: readonly WorkspaceStoreName[],
  mode: IDBTransactionMode,
  work: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  return runTransaction(await context.database, stores, mode, work)
}

export function errorResult<T>(error: unknown): ServiceResult<T> {
  if (error instanceof ServiceFault) return error.result as ServiceResult<T>
  if (error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'UnknownError')) {
    return { status: 'error', error: { code: 'quota', message: 'The browser could not save this change. Your last saved version is still available.', retry: 'reconcile-first' } }
  }
  return {
    status: 'error',
    error: {
      code: 'storage-unavailable',
      message: error instanceof Error ? error.message : 'The mock workspace could not be saved.',
      retry: 'reconcile-first',
    },
  }
}

export async function invoke<T>(work: () => Promise<ServiceResult<T>>): Promise<ServiceResult<T>> {
  try {
    return await work()
  } catch (error) {
    return errorResult<T>(error)
  }
}

export async function transactRead<T>(
  context: StoreContext,
  stores: readonly WorkspaceStoreName[],
  work: (transaction: IDBTransaction) => Promise<T>,
): Promise<ServiceResult<T>> {
  return invoke(async () => ({
    status: 'ok',
    data: await transact(context, stores, 'readonly', work),
    replayed: false,
  }))
}
