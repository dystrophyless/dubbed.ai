import { ids, type OperationId, type Services } from '../../services/contracts'

const pendingDeleteKey = 'dubbed.pending-account-delete'

export interface PendingAccountDelete {
  version: 1
  accountId: string
  operationId: string
}

export type PendingAccountDeleteResolution =
  | { state: 'none' }
  | { state: 'completed'; receipt: { deleted: true; purchasedRemainder: number } }
  | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }
  | { state: 'unknown' }
  | { state: 'unresolved'; reason: 'storage-unavailable' | 'service-unavailable' | 'conflict' }

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function readPendingAccountDelete(): PendingAccountDelete | null {
  const target = storage()
  if (!target) return null
  try {
    const raw = target.getItem(pendingDeleteKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (
      record.version !== 1 ||
      typeof record.accountId !== 'string' ||
      !record.accountId ||
      typeof record.operationId !== 'string' ||
      !record.operationId
    ) {
      return null
    }
    return {
      version: 1,
      accountId: record.accountId,
      operationId: record.operationId,
    }
  } catch {
    return null
  }
}

/** Stores only the account and operation identity needed to reconcile a deletion after reload. */
export function storePendingAccountDelete(marker: PendingAccountDelete): boolean {
  const target = storage()
  if (!target) return false
  try {
    target.setItem(pendingDeleteKey, JSON.stringify(marker))
    return true
  } catch {
    return false
  }
}

export function clearPendingAccountDelete(operationId: string): boolean {
  const target = storage()
  if (!target) return false
  try {
    const current = readPendingAccountDelete()
    if (!current || current.operationId !== operationId) return current === null
    target.removeItem(pendingDeleteKey)
    return true
  } catch {
    return false
  }
}

/**
 * Resolves the durable account-delete receipt before the shell redirects an anonymous user.
 * Unknown and failed checks keep the marker so a later visit can retry status reconciliation.
 */
export async function resolvePendingAccountDelete(
  services: Pick<Services, 'account'>,
  marker: PendingAccountDelete | null = readPendingAccountDelete(),
): Promise<PendingAccountDeleteResolution> {
  if (!marker) return { state: 'none' }

  try {
    const result = await services.account.resolveDelete({
      operationId: ids.operation(marker.operationId),
    })
    if (result.status !== 'ok') {
      if (result.status === 'conflict') return { state: 'unresolved', reason: 'conflict' }
      return { state: 'unresolved', reason: 'service-unavailable' }
    }

    if (result.data.state === 'completed') {
      clearPendingAccountDelete(marker.operationId)
      return { state: 'completed', receipt: result.data.receipt }
    }
    if (result.data.state === 'not-started') {
      return {
        state: 'not-started',
        operationId: result.data.operationId,
        safeToRetrySameId: true,
      }
    }
    return { state: 'unknown' }
  } catch {
    return { state: 'unresolved', reason: 'service-unavailable' }
  }
}
