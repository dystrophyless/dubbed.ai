import type {
  AccountId,
  OperationId,
  OperationSnapshot,
  ServiceResult,
} from './contracts'
import {
  activeContext,
  intentConflict,
  readRecord,
  requireContext,
  transact,
  writeRecord,
  type StoredOperation,
  type StoreContext,
} from './mock-store'
import { nowMs, ServiceFault, serviceError } from './mock-store'
import type { WorkspaceStoreName } from './indexeddb'

export interface MutationOutcome<T> {
  data: T
  accountId?: AccountId
  job?: OperationSnapshot
}

export interface MutationConfig<T> {
  operationId: OperationId
  kind: string
  payloadFingerprint: string
  stores: readonly WorkspaceStoreName[]
  authenticated?: boolean
  allowAnonymous?: boolean
  onReplay?: (transaction: IDBTransaction, previous: StoredOperation) => Promise<void>
  work: (transaction: IDBTransaction, accountId?: AccountId) => Promise<MutationOutcome<T>>
}

export async function mutate<T>(
  context: StoreContext,
  config: MutationConfig<T>,
): Promise<ServiceResult<T>> {
  const stores = [...new Set<WorkspaceStoreName>([
    'meta', 'sessions', 'accounts', 'operations', 'faults', ...config.stores,
  ])]
  try {
    let unknownAfterCommit = false
    const value = await transact(context, stores, 'readwrite', async (transaction) => {
      const active = config.authenticated === false
        ? null
        : await activeContext(transaction, context)
      if (config.authenticated !== false && !active && !config.allowAnonymous) {
        await requireContext(transaction, context)
      }

      const previous = await readRecord<StoredOperation>(transaction, 'operations', config.operationId)
      if (previous) {
        if (previous.requestHash !== config.payloadFingerprint || previous.kind !== config.kind) {
          throw intentConflict('This operation ID was already used for a different request.')
        }
        if (config.authenticated !== false && active && previous.accountId !== active.account.id) {
          throw serviceError('not-found', 'Operation was not found.')
        }
        if (config.onReplay) await config.onReplay(transaction, previous)
        return { data: previous.result as T, replayed: true }
      }

      const outcome = await config.work(transaction, active?.account.id)
      const timestamp = nowMs(context.clock)
      const fault = await readRecord<{ id: OperationId; kind: 'unknown-after-commit' }>(
        transaction,
        'faults',
        config.operationId,
      )
      if (fault?.kind === 'unknown-after-commit') {
        unknownAfterCommit = true
        await transaction.objectStore('faults').delete(config.operationId)
      }
      const record: StoredOperation = {
        id: config.operationId,
        accountId: outcome.accountId ?? active?.account.id,
        clientId: context.clientId,
        kind: config.kind,
        requestHash: config.payloadFingerprint,
        result: outcome.data,
        updatedAt: timestamp,
        revision: 0 as StoredOperation['revision'],
        job: outcome.job,
      }
      await writeRecord(transaction, 'operations', record)
      return { data: outcome.data, replayed: false }
    })

    if (unknownAfterCommit) {
      return { status: 'unknown', operationId: config.operationId, message: 'The mock service saved the operation but did not confirm its response. Reconcile this operation before starting another.' }
    }
    return { status: 'ok', data: value.data, replayed: value.replayed }
  } catch (error) {
    if (error instanceof ServiceFault) return error.result as ServiceResult<T>
    return {
      status: 'error',
      error: {
        code: error instanceof DOMException && error.name === 'QuotaExceededError' ? 'quota' : 'storage-unavailable',
        message: error instanceof Error ? error.message : 'The mock operation could not be saved.',
        retry: 'reconcile-first',
      },
    }
  }
}

export async function fingerprint(value: unknown): Promise<string> {
  const serialized = JSON.stringify(value, (_key, part: unknown) => {
    if (part instanceof Blob) return { type: part.type, size: part.size }
    if (part instanceof File) return { name: part.name, type: part.type, size: part.size, lastModified: part.lastModified }
    return part
  })
  const bytes = new TextEncoder().encode(serialized)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, '0')).join('')
}

export async function resolveStoredOperation<T = unknown>(
  context: StoreContext,
  operationId: OperationId,
): Promise<ServiceResult<OperationSnapshot<T> | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }>> {
  try {
    return await transact(context, ['meta', 'sessions', 'accounts', 'operations'], 'readonly', async (transaction) => {
      const active = await requireContext(transaction, context)
      const stored = await readRecord<StoredOperation>(transaction, 'operations', operationId)
      if (!stored || stored.accountId !== active.account.id) {
        return { status: 'ok', replayed: false, data: { state: 'not-started', operationId, safeToRetrySameId: true } as const }
      }
      if (stored.job) return { status: 'ok', replayed: false, data: structuredClone(stored.job) as OperationSnapshot<T> }
      return {
        status: 'ok',
        replayed: false,
        data: {
          id: stored.id,
          accountId: active.account.id,
          kind: stored.kind,
          state: 'committed',
          result: structuredClone(stored.result) as T,
          revision: stored.revision,
          updatedAt: stored.updatedAt,
        },
      }
    })
  } catch (error) {
    if (error instanceof ServiceFault) return error.result as ServiceResult<OperationSnapshot<T> | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }>
    return {
      status: 'error',
      error: { code: 'storage-unavailable', message: error instanceof Error ? error.message : 'Operation status is unavailable.', retry: 'reconcile-first' },
    }
  }
}

export async function updateStoredJob(
  context: StoreContext,
  operationId: OperationId,
  job: OperationSnapshot,
): Promise<void> {
  await transact(context, ['operations'], 'readwrite', async (transaction) => {
    const previous = await readRecord<StoredOperation>(transaction, 'operations', operationId)
    if (!previous) throw serviceError('operation-not-found', 'Operation was not found.')
    previous.job = job
    previous.updatedAt = nowMs(context.clock)
    previous.revision = (Number(previous.revision) + 1) as StoredOperation['revision']
    await writeRecord(transaction, 'operations', previous)
  })
}

export async function queueUnknownOutcome(context: StoreContext, operationId: OperationId): Promise<void> {
  await transact(context, ['faults'], 'readwrite', async (transaction) => {
    await writeRecord(transaction, 'faults', { id: operationId, kind: 'unknown-after-commit' })
  })
}
