import type { ServiceError, ServiceResult } from '../services/contracts'
import { t, type MessageKey } from './messages'
import type { Locale } from '../app/routes'

type ConflictResult = Extract<ServiceResult<unknown>, { status: 'conflict' }>
type UnknownResult = Extract<ServiceResult<unknown>, { status: 'unknown' }>
export type ServiceProblemCode =
  | ServiceError['code']
  | ConflictResult['code']
  | 'unknown-operation'
  | 'unexpected'

const serviceErrorKeys = {
  'already-exists': 'errorAlreadyExists',
  'account-deleted': 'errorAccountDeleted',
  'adapter-unavailable': 'errorAdapterUnavailable',
  'capacity-reached': 'errorCapacityReached',
  conflict: 'errorConflict',
  expired: 'errorExpired',
  forbidden: 'errorForbidden',
  'incompatible-candidate': 'errorCandidate',
  'invalid-code': 'errorInvalidCode',
  'insufficient-credits': 'errorInsufficientCredits',
  'lease-held': 'errorLeaseHeld',
  'media-invalid': 'errorMediaInvalid',
  'not-found': 'errorNotFound',
  'operation-not-found': 'errorOperationNotFound',
  quota: 'errorQuota',
  'rate-limited': 'errorRateLimited',
  'storage-unavailable': 'errorStorageUnavailable',
  'stale-source': 'errorStaleSource',
  unauthenticated: 'errorUnauthenticated',
  unsupported: 'errorUnsupported',
  validation: 'errorValidation',
} satisfies Record<ServiceError['code'], MessageKey>

const conflictKeys = {
  'revision-conflict': 'errorRevisionConflict',
  'stale-source': 'errorStaleSource',
  'lease-held': 'errorLeaseHeld',
  'already-accepted': 'errorAlreadyAccepted',
  'intent-conflict': 'errorIntentConflict',
} satisfies Record<ConflictResult['code'], MessageKey>

const supportedFieldNames = new Set([
  'email',
  'password',
  'currentPassword',
  'newPassword',
  'code',
  'file',
  'title',
  'selection',
])

export function serviceProblemCode(
  problem: ServiceError | ConflictResult | UnknownResult | null | undefined,
): ServiceProblemCode {
  if (!problem) return 'unexpected'
  if ('retry' in problem) return problem.code
  if ('operationId' in problem) return 'unknown-operation'
  return problem.code
}

export function serviceProblemKey(code: ServiceProblemCode): MessageKey {
  if (code === 'unknown-operation') return 'errorUnknownOutcome'
  if (code === 'unexpected') return 'errorGeneric'
  if (code in conflictKeys) return conflictKeys[code as ConflictResult['code']]
  return serviceErrorKeys[code as ServiceError['code']]
}

export function serviceProblemMessage(code: ServiceProblemCode, locale: Locale): string {
  return t(locale, serviceProblemKey(code))
}

/** Service field text can be adapter prose, so only validated field names cross into UI copy. */
export function localizedFieldErrors(
  error: Pick<ServiceError, 'fieldErrors'>,
  locale: Locale,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.keys(error.fieldErrors ?? {})
      .filter((field) => supportedFieldNames.has(field))
      .map((field) => [field, t(locale, 'fieldInvalid')]),
  )
}

export type ServiceFailureResult = Exclude<ServiceResult<unknown>, { status: 'ok' }>

export interface LocalizedServiceFailure {
  code: ServiceProblemCode
  message: string
  fieldErrors: Readonly<Record<string, string>>
}

export function localizeServiceFailure(
  result: ServiceFailureResult,
  locale: Locale,
): LocalizedServiceFailure {
  const problem = result.status === 'error' ? result.error : result
  return {
    code: serviceProblemCode(problem),
    message: serviceProblemMessage(serviceProblemCode(problem), locale),
    fieldErrors: result.status === 'error' ? localizedFieldErrors(result.error, locale) : {},
  }
}
