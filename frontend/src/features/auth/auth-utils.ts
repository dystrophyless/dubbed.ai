import { ids, type OperationId, type ServiceResult, type SignInIntent } from '../../services/contracts'
import { localizeServiceFailure, type ServiceProblemCode } from '../../i18n/service-errors'
import type { Locale } from '../../app/routes'

export const registrationStorageKey = 'dubbed.auth.registration.v1'
export const passwordResetStorageKey = 'dubbed.auth.password-reset.v1'
export const signInStorageKey = 'dubbed.auth.sign-in.v1'

export interface PendingAuthReference {
  version: 1
  requestId: OperationId
  pendingOperationId?: OperationId
  email: string
  operationKind?: 'password-sign-in' | 'google-sign-in'
  intent?: SignInIntent
}

export function newOperationId(): OperationId {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `auth-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return ids.operation(value)
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function storePendingAuthReference(key: string, reference: PendingAuthReference): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(reference))
  } catch {
    // The active flow remains usable if this tab's session storage is unavailable.
  }
}

export function readPendingAuthReference(key: string): PendingAuthReference | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const candidate = parsed as Record<string, unknown>
    const operationKind = candidate.operationKind === 'password-sign-in' || candidate.operationKind === 'google-sign-in'
      ? candidate.operationKind
      : undefined
    const email = typeof candidate.email === 'string' ? normalizeEmail(candidate.email) : ''
    if (
      candidate.version !== 1 ||
      typeof candidate.requestId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(candidate.requestId) ||
      (!isValidEmail(email) && !(operationKind === 'google-sign-in' && email === ''))
    ) return null

    const pendingOperationId =
      typeof candidate.pendingOperationId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(candidate.pendingOperationId)
        ? ids.operation(candidate.pendingOperationId)
        : undefined

    let intent: SignInIntent | undefined
    if (candidate.intent && typeof candidate.intent === 'object') {
      const value = candidate.intent as Record<string, unknown>
      if (value.kind === 'new-dub') intent = { kind: 'new-dub' }
      else if (
        value.kind === 'resume-project-screen' &&
        typeof value.projectId === 'string' &&
        /^[A-Za-z0-9_-]{1,128}$/.test(value.projectId) &&
        (value.screen === 'processing' || value.screen === 'record' || value.screen === 'result')
      ) {
        intent = {
          kind: 'resume-project-screen',
          projectId: ids.project(value.projectId),
          screen: value.screen,
        }
      }
    }
    return {
      version: 1,
      requestId: ids.operation(candidate.requestId),
      ...(pendingOperationId ? { pendingOperationId } : {}),
      email,
      ...(operationKind ? { operationKind } : {}),
      ...(intent ? { intent } : {}),
    }
  } catch {
    return null
  }
}

export function clearPendingAuthReference(key: string): void {
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    // A stale opaque marker is harmless; every restored marker is reconciled with the service.
  }
}

export function serviceProblem(result: Exclude<ServiceResult<unknown>, { status: 'ok' }>, locale: Locale) {
  return localizeServiceFailure(result, locale)
}

export function serviceProblemCode(result: Exclude<ServiceResult<unknown>, { status: 'ok' }>): ServiceProblemCode {
  return localizeServiceFailure(result, 'en').code
}

export function formatRemaining(milliseconds: number, locale: Locale): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return locale === 'ru'
    ? `${minutes}:${String(remainder).padStart(2, '0')}`
    : `${minutes}:${String(remainder).padStart(2, '0')}`
}
