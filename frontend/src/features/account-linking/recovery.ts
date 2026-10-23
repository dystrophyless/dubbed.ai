import { ids, type OperationId } from '../../services/contracts'

const pendingLinkKey = 'dubbed.pending-account-link'

export type LinkPendingAction =
  | 'start'
  | 'current'
  | 'candidate'
  | 'current-google'
  | 'candidate-google'
  | 'commit'
  | 'cancel'
  | 'resend'

export interface PendingAccountLink {
  version: 1
  accountId: string
  operationId?: string
  intentId?: string
  action?: LinkPendingAction
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export function readPendingAccountLink(): PendingAccountLink | null {
  const target = storage()
  if (!target) return null
  try {
    const raw = target.getItem(pendingLinkKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    const validAction = record.action === undefined || [
      'start', 'current', 'candidate', 'current-google', 'candidate-google', 'commit', 'cancel', 'resend',
    ].includes(String(record.action))
    if (
      record.version !== 1 ||
      typeof record.accountId !== 'string' || !record.accountId ||
      (record.operationId !== undefined && typeof record.operationId !== 'string') ||
      (record.intentId !== undefined && typeof record.intentId !== 'string') ||
      !validAction
    ) return null
    return {
      version: 1,
      accountId: record.accountId,
      ...(typeof record.operationId === 'string' ? { operationId: record.operationId } : {}),
      ...(typeof record.intentId === 'string' ? { intentId: record.intentId } : {}),
      ...(typeof record.action === 'string' ? { action: record.action as LinkPendingAction } : {}),
    }
  } catch {
    return null
  }
}

export function storePendingAccountLink(marker: PendingAccountLink): boolean {
  const target = storage()
  if (!target) return false
  try {
    target.setItem(pendingLinkKey, JSON.stringify(marker))
    return true
  } catch {
    return false
  }
}

export function clearPendingAccountLink(expectedOperationId?: string, expectedIntentId?: string): boolean {
  const target = storage()
  if (!target) return false
  try {
    const current = readPendingAccountLink()
    if (!current) return true
    if (expectedOperationId && current.operationId !== expectedOperationId) return false
    if (expectedIntentId && current.intentId !== expectedIntentId) return false
    target.removeItem(pendingLinkKey)
    return true
  } catch {
    return false
  }
}

export function pendingLinkOperationId(marker: PendingAccountLink): OperationId | null {
  return marker.operationId ? ids.operation(marker.operationId) : null
}

export function pendingLinkIntentId(marker: PendingAccountLink): OperationId | null {
  return marker.intentId ? ids.operation(marker.intentId) : null
}
