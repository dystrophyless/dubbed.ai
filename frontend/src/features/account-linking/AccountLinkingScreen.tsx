import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Link2 } from 'lucide-react'
import { routes, type Locale } from '../../app/routes'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import OtpInput from '../auth/OtpInput'
import {
  ids,
  type AccountSettingsSnapshot,
  type LinkIntentSnapshot,
  type LinkMethodKind,
  type OperationId,
  type ServiceError,
} from '../../services/contracts'
import {
  clearPendingAccountLink,
  readPendingAccountLink,
  storePendingAccountLink,
  type LinkPendingAction,
} from './recovery'
import './AccountLinkingScreen.css'

type LinkCopy = {
  title: string
  description: string
  loading: string
  loadFailed: string
  signedOut: string
  back: string
  preview: string
  currentMethod: string
  candidateMethod: string
  emailPassword: string
  google: string
  bothLinked: string
  linkEmail: string
  linkGoogle: string
  candidateEmail: string
  candidatePassword: string
  passwordHint: string
  startLink: string
  starting: string
  currentProof: string
  currentPassword: string
  currentPasswordInvalid: string
  proveCurrent: string
  proving: string
  currentGoogle: string
  candidateProof: string
  verified: string
  verificationText: (address: string) => string
  mockCode: (code: string) => string
  verificationCode: string
  verifyCandidate: string
  resend: string
  candidateGoogle: string
  review: string
  reviewDescription: string
  commit: string
  committing: string
  cancel: string
  completed: string
  cancelled: string
  conflict: string
  expired: string
  unknown: string
  checkStatus: string
  notStarted: string
  statusChecking: string
  storageUnavailable: string
  startUnavailable: string
  noMethod: string
  backToAccount: string
  accountUpdateFailed: string
  emailRequired: string
  passwordTooShort: string
  codeRequired: string
}

const copy: Record<Locale, LinkCopy> = {
  en: {
    title: 'Link a sign-in method',
    description: 'Confirm both the current method and the method you want to add. The link is created only after both proofs are accepted.',
    loading: 'Loading account methods…',
    loadFailed: 'Account methods could not be loaded. Return to Account and retry.',
    signedOut: 'Sign in to manage account methods.',
    back: 'Account',
    preview: 'This preview uses simulated account data. No real email or Google account is contacted.',
    currentMethod: 'Current sign-in method',
    candidateMethod: 'Method to add',
    emailPassword: 'Email and password',
    google: 'Google',
    bothLinked: 'Both available sign-in methods are already linked.',
    linkEmail: 'Add an email and password',
    linkGoogle: 'Add Google',
    candidateEmail: 'New email address',
    candidatePassword: 'Password for this method',
    passwordHint: 'Use at least 8 characters.',
    startLink: 'Continue',
    starting: 'Starting…',
    currentProof: 'Confirm your current method',
    currentPassword: 'Current account password',
    currentPasswordInvalid: 'The current password is incorrect. Check it and try again.',
    proveCurrent: 'Confirm current method',
    proving: 'Checking…',
    currentGoogle: 'Continue with Google to confirm the current method',
    candidateProof: 'Confirm the method to add',
    verified: 'Verified',
    verificationText: (address) => `Enter the verification code sent to ${address}.`,
    mockCode: (code) => `Simulated preview code: ${code}. This code is supplied by the local mock; no email was sent.`,
    verificationCode: 'Verification code',
    verifyCandidate: 'Confirm email method',
    resend: 'Send another code',
    candidateGoogle: 'Continue with Google to add this method',
    review: 'Review the link',
    reviewDescription: 'Both proofs are confirmed. Review the two methods before adding them to this account.',
    commit: 'Link methods',
    committing: 'Linking…',
    cancel: 'Cancel request',
    completed: 'Both sign-in methods are linked to this account.',
    cancelled: 'The link request was cancelled. No method was added.',
    conflict: 'The account methods changed while this request was open. Reload Account before starting again.',
    expired: 'This link request expired. Start a new request from Account.',
    unknown: 'The action result is not confirmed. Check status before retrying.',
    checkStatus: 'Check status',
    notStarted: 'The last action was not started. Re-enter any required proof and retry.',
    statusChecking: 'Checking the saved link request…',
    storageUnavailable: 'This browser could not save the recovery reference, so no account-link action was started. Enable session storage and retry.',
    startUnavailable: 'No unlinked sign-in method is available.',
    noMethod: 'This account has no verified sign-in method to confirm.',
    backToAccount: 'Return to Account',
    accountUpdateFailed: 'The link is complete, but account settings could not be refreshed.',
    emailRequired: 'Enter a valid email address.',
    passwordTooShort: 'Use at least 8 characters.',
    codeRequired: 'Enter the verification code.',
  },
  ru: {
    title: 'Подключить способ входа',
    description: 'Подтвердите текущий способ и способ, который хотите добавить. Связь появится только после обоих подтверждений.',
    loading: 'Загружаем способы входа…',
    loadFailed: 'Не удалось загрузить способы входа. Вернитесь в аккаунт и повторите попытку.',
    signedOut: 'Войдите, чтобы управлять способами входа.',
    back: 'Аккаунт',
    preview: 'В этой версии используются тестовые данные. Настоящие почта и аккаунт Google не затрагиваются.',
    currentMethod: 'Текущий способ входа',
    candidateMethod: 'Добавляемый способ',
    emailPassword: 'Электронная почта и пароль',
    google: 'Google',
    bothLinked: 'Оба доступных способа входа уже подключены.',
    linkEmail: 'Добавить почту и пароль',
    linkGoogle: 'Добавить Google',
    candidateEmail: 'Новый адрес электронной почты',
    candidatePassword: 'Пароль для этого способа',
    passwordHint: 'Не менее 8 символов.',
    startLink: 'Продолжить',
    starting: 'Запускаем…',
    currentProof: 'Подтвердите текущий способ',
    currentPassword: 'Текущий пароль аккаунта',
    currentPasswordInvalid: 'Текущий пароль неверен. Проверьте его и попробуйте ещё раз.',
    proveCurrent: 'Подтвердить текущий способ',
    proving: 'Проверяем…',
    currentGoogle: 'Продолжите через Google, чтобы подтвердить текущий способ',
    candidateProof: 'Подтвердите добавляемый способ',
    verified: 'Подтверждён',
    verificationText: (address) => `Введите код подтверждения, отправленный на ${address}.`,
    mockCode: (code) => `Тестовый код: ${code}. Его предоставляет локальная модель; письмо не отправлялось.`,
    verificationCode: 'Код подтверждения',
    verifyCandidate: 'Подтвердить почту',
    resend: 'Отправить код ещё раз',
    candidateGoogle: 'Продолжите через Google, чтобы добавить этот способ',
    review: 'Проверьте связь',
    reviewDescription: 'Оба способа подтверждены. Проверьте их перед подключением к аккаунту.',
    commit: 'Подключить способы',
    committing: 'Подключаем…',
    cancel: 'Отменить запрос',
    completed: 'Оба способа входа подключены к аккаунту.',
    cancelled: 'Запрос отменён. Способ входа не добавлен.',
    conflict: 'Способы входа изменились, пока был открыт запрос. Обновите аккаунт и начните заново.',
    expired: 'Срок действия запроса истёк. Создайте новый запрос из аккаунта.',
    unknown: 'Результат действия не подтверждён. Проверьте состояние перед повтором.',
    checkStatus: 'Проверить состояние',
    notStarted: 'Последнее действие не запускалось. Введите подтверждение ещё раз и повторите.',
    statusChecking: 'Проверяем сохранённый запрос на связь…',
    storageUnavailable: 'Браузер не сохранил данные для восстановления, поэтому действие не запущено. Включите хранилище сеанса и повторите попытку.',
    startUnavailable: 'Нет неподключённых способов входа.',
    noMethod: 'В аккаунте нет подтверждённого способа входа для проверки.',
    backToAccount: 'Вернуться в аккаунт',
    accountUpdateFailed: 'Связь завершена, но настройки аккаунта не удалось обновить.',
    emailRequired: 'Введите корректный адрес электронной почты.',
    passwordTooShort: 'Введите не менее 8 символов.',
    codeRequired: 'Введите код подтверждения.',
  },
}

const startOperationKind = 'account-linking.start'

function newOperationId(prefix: string) {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return ids.operation(value)
}

function kindName(kind: LinkMethodKind, text: LinkCopy) {
  return kind === 'google' ? text.google : text.emailPassword
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null
}

function intentFrom(value: unknown, accountId: string): LinkIntentSnapshot | null {
  const candidate = record(value)
  if (!candidate || candidate.accountId !== accountId || typeof candidate.id !== 'string') return null
  if (!['pending', 'ready-to-review', 'completed', 'cancelled', 'conflict', 'expired'].includes(String(candidate.state))) return null
  return candidate as unknown as LinkIntentSnapshot
}

function errorCodeFrom(result: { status: string; error?: ServiceError }): ServiceError['code'] | null {
  return result.status === 'error' ? result.error?.code ?? null : null
}

export function AccountLinkingScreen(props: FeatureScreenProps) {
  const locale: Locale = props.locale
  const text = copy[locale]
  const accountIdentity = props.identity.status === 'signed-in' ? props.identity.account : null
  const accountId = accountIdentity?.id ?? null
  const [snapshot, setSnapshot] = useState<AccountSettingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [currentMethod, setCurrentMethod] = useState<LinkMethodKind | null>(null)
  const [candidateEmail, setCandidateEmail] = useState('')
  const [candidatePassword, setCandidatePassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [candidateCode, setCandidateCode] = useState('')
  const [intent, setIntent] = useState<LinkIntentSnapshot | null>(null)
  const [currentProofId, setCurrentProofId] = useState<OperationId | null>(null)
  const [candidateProofId, setCandidateProofId] = useState<OperationId | null>(null)
  const [operationId, setOperationId] = useState<OperationId | null>(null)
  const [pendingAction, setPendingAction] = useState<LinkPendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [currentPasswordInvalid, setCurrentPasswordInvalid] = useState(false)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<'idle' | 'unknown' | 'not-started' | 'completed' | 'cancelled' | 'conflict' | 'expired'>('idle')
  const [errorCode, setErrorCode] = useState<ServiceError['code'] | null>(null)
  const [formError, setFormError] = useState<'email' | 'password' | 'code' | null>(null)
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [accountRefreshFailed, setAccountRefreshFailed] = useState(false)
  const recoveryStarted = useRef(false)
  const currentProofAttempt = useRef<OperationId | null>(null)

  useEffect(() => () => {
    currentProofAttempt.current = null
  }, [])

  const reloadAccount = useCallback(async () => {
    if (!accountId) {
      setSnapshot(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setLoadFailed(false)
    try {
      const result = await props.services.account.load()
      if (result.status === 'ok' && result.data.id === accountId) {
        setSnapshot(result.data)
        const verified = result.data.methods.filter((method) => method.verified).map((method) => method.kind)
        if (verified.length === 1) setCurrentMethod(verified[0])
      } else {
        setSnapshot(null)
        setLoadFailed(true)
      }
    } catch {
      setSnapshot(null)
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [accountId, props.services])

  const saveBaseline = useCallback((activeIntent: LinkIntentSnapshot | null) => {
    if (!accountId) return false
    if (activeIntent) {
      return storePendingAccountLink({ version: 1, accountId, intentId: activeIntent.id })
    }
    return clearPendingAccountLink()
  }, [accountId])

  const showCompleted = useCallback(async (nextIntent?: LinkIntentSnapshot) => {
    setStatus('completed')
    if (nextIntent) setIntent(nextIntent)
    setOperationId(null)
    setPendingAction(null)
    setCurrentPassword('')
    setCandidatePassword('')
    setCandidateCode('')
    clearPendingAccountLink(undefined, nextIntent?.id)
    const result = await props.services.account.load().catch(() => null)
    if (!result) {
      setAccountRefreshFailed(true)
      return
    }
    const candidateMethod = nextIntent?.candidate.method
    const hasCommittedCandidate = !candidateMethod || (result.status === 'ok' && result.data.methods.some((method) => method.kind === candidateMethod && method.verified))
    if (
      result.status === 'ok' &&
      result.data.id === accountId &&
      !result.data.deleted &&
      (!nextIntent || result.data.revision > nextIntent.expectedAccountRevision) &&
      hasCommittedCandidate
    ) {
      setSnapshot(result.data)
      setAccountRefreshFailed(false)
      try {
        if (props.onAccountUpdated) props.onAccountUpdated(result.data)
        else await props.refreshIdentity()
      } catch {
        setAccountRefreshFailed(true)
      }
    } else {
      setAccountRefreshFailed(true)
      const identityNeedsRevalidation = result.status === 'ok'
        ? result.data.id !== accountId || result.data.deleted
        : result.status === 'error' && ['unauthenticated', 'expired', 'not-found'].includes(result.error.code)
      if (identityNeedsRevalidation) {
        try {
          await props.refreshIdentity()
        } catch {
          // Keep the committed acknowledgement visible while identity revalidation is unavailable.
        }
      }
    }
  }, [accountId, props.onAccountUpdated, props.refreshIdentity, props.services])

  const persistIntent = useCallback((next: LinkIntentSnapshot) => {
    setIntent(next)
    setCurrentProofId(next.currentProofId ?? null)
    setCandidateProofId(next.candidateProofId ?? null)
    setOperationId(null)
    setPendingAction(null)
    setErrorCode(null)
    setStatus(next.state === 'expired' ? 'expired' : next.state === 'conflict' ? 'conflict' : 'idle')
    if (!saveBaseline(next)) setStorageUnavailable(true)
  }, [saveBaseline])

  const applyResolvedOperation = useCallback(async (
    action: LinkPendingAction,
    id: OperationId,
    data: Record<string, unknown>,
    activeIntent: LinkIntentSnapshot | null,
  ) => {
    const baseIntent = activeIntent ?? intent
    const kind = data.kind
    if (data.accountId !== accountId) {
      setStatus('unknown')
      return
    }
    const result = record(data.result)
    if (data.state === 'pending') {
      setStatus('unknown')
      return
    }
    if (data.state === 'rejected') {
      setErrorCode(record(data.error)?.code as ServiceError['code'] | undefined ?? null)
      setStatus('idle')
      setOperationId(null)
      setPendingAction(null)
      saveBaseline(baseIntent)
      return
    }
    if (data.state !== 'committed') {
      setStatus('unknown')
      return
    }

    if (action === 'start' && kind === startOperationKind) {
      const recovered = intentFrom(result, accountId ?? '')
      if (!recovered) {
        setStatus('unknown')
        return
      }
      persistIntent(recovered)
      setCandidatePassword('')
      setCandidateEmail(recovered.candidate.address ?? '')
      return
    }
    if (action === 'current' && kind === 'account-linking.prove-current' && typeof result?.proofId === 'string') {
      const proofId = ids.operation(result.proofId)
      setCurrentProofId(proofId)
      setIntent((current) => current ? { ...current, currentProofId: proofId } : baseIntent ? { ...baseIntent, currentProofId: proofId } : current)
      setCurrentPassword('')
      setOperationId(null)
      setPendingAction(null)
      setStatus('idle')
      saveBaseline(baseIntent)
      return
    }
    if (action === 'candidate' && kind === 'account-linking.prove-candidate' && typeof result?.proofId === 'string') {
      const proofId = ids.operation(result.proofId)
      setCandidateProofId(proofId)
      setIntent((current) => current ? { ...current, candidateProofId: proofId } : baseIntent ? { ...baseIntent, candidateProofId: proofId } : current)
      setCandidateCode('')
      setOperationId(null)
      setPendingAction(null)
      setStatus('idle')
      saveBaseline(baseIntent)
      return
    }
    if (action === 'current-google' && kind === 'identity.google-link.current' && typeof result?.providerProofId === 'string' && baseIntent) {
      await proveWithProvider('current', ids.operation(result.providerProofId))
      return
    }
    if (action === 'candidate-google' && kind === 'identity.google-link.candidate' && typeof result?.providerProofId === 'string' && baseIntent) {
      await proveWithProvider('candidate', ids.operation(result.providerProofId))
      return
    }
    if (action === 'resend' && kind === 'account-linking.resend-candidate' && baseIntent) {
      const recovered = intentFrom(result, accountId ?? '')
      if (recovered) persistIntent(recovered)
      else setStatus('unknown')
      return
    }
    if (action === 'commit' && kind === 'account-linking.commit') {
      const committedIntent = intentFrom(result?.intent, accountId ?? '')
      if (result?.state === 'completed') {
        await showCompleted(committedIntent ?? baseIntent ?? undefined)
      } else if (result?.state === 'conflict') {
        setStatus('conflict')
        setOperationId(null)
        setPendingAction(null)
        saveBaseline(committedIntent ?? baseIntent)
        await reloadAccount()
      } else {
        setStatus('unknown')
      }
      return
    }
    if (action === 'cancel' && kind === 'account-linking.cancel' && result?.state === 'cancelled') {
      clearPendingAccountLink(id, baseIntent?.id)
      setStatus('cancelled')
      setOperationId(null)
      setPendingAction(null)
      setIntent(null)
      return
    }
    setStatus('unknown')
  }, [accountId, intent, persistIntent, props.services, reloadAccount, saveBaseline, showCompleted])

  const resolvePending = useCallback(async () => {
    if (!accountId) return
    setChecking(true)
    setErrorCode(null)
    setStatus('unknown')
    const marker = readPendingAccountLink()
    if (!marker || marker.accountId !== accountId) {
      setStatus('idle')
      setChecking(false)
      return
    }
    const pendingId = marker.operationId ? ids.operation(marker.operationId) : null
    const action = marker.action ?? null
    if (pendingId && action) {
      let activeIntent = intent
      const markerIntentId = marker.intentId ? ids.operation(marker.intentId) : null
      if (markerIntentId) {
        try {
          const linkStatus = await props.services.accountLinking.resolve({ intentId: markerIntentId })
          if (linkStatus.status === 'ok') {
            if (linkStatus.data.state === 'completed') {
              await showCompleted(linkStatus.data.intent)
              setChecking(false)
              return
            }
            if (linkStatus.data.state !== 'not-found') {
              activeIntent = linkStatus.data.intent
              setIntent(activeIntent)
              setCurrentProofId(activeIntent.currentProofId ?? null)
              setCandidateProofId(activeIntent.candidateProofId ?? null)
            }
          }
        } catch {
          // The operation resolver below can still establish a confirmed outcome.
        }
      }
      try {
        const operationResult = await props.services.operations.resolve(pendingId)
        if (operationResult.status === 'ok') {
          if ('safeToRetrySameId' in operationResult.data) {
            setOperationId(pendingId)
            setPendingAction(action)
            setStatus('not-started')
          } else {
            await applyResolvedOperation(action, pendingId, operationResult.data as unknown as Record<string, unknown>, activeIntent)
          }
        }
      } catch {
        setStatus('unknown')
      }
      setChecking(false)
      return
    }
    const intentId = marker.intentId ? ids.operation(marker.intentId) : null
    if (!intentId) {
      setStatus('unknown')
      setChecking(false)
      return
    }
    try {
      const result = await props.services.accountLinking.resolve({ intentId })
      if (result.status === 'ok') {
        if (result.data.state === 'not-found') {
          clearPendingAccountLink(undefined, intentId)
          setIntent(null)
          setStatus('idle')
        } else if (result.data.state === 'completed') {
          persistIntent(result.data.intent)
          await showCompleted(result.data.intent)
        } else if (result.data.state === 'conflict') {
          persistIntent(result.data.intent)
          setStatus('conflict')
        } else if (result.data.state === 'expired') {
          persistIntent(result.data.intent)
          setStatus('expired')
        } else if (result.data.state === 'cancelled') {
          clearPendingAccountLink(undefined, intentId)
          setIntent(null)
          setStatus('cancelled')
        } else {
          persistIntent(result.data.intent)
        }
      }
    } catch {
      setStatus('unknown')
    }
    setChecking(false)
  }, [accountId, applyResolvedOperation, intent, persistIntent, props.services, showCompleted])

  useEffect(() => {
    void reloadAccount()
  }, [reloadAccount])

  useEffect(() => {
    if (!accountId || loading || recoveryStarted.current) return
    recoveryStarted.current = true
    const marker = readPendingAccountLink()
    if (!marker || marker.accountId !== accountId) return
    if (marker.operationId) {
      setOperationId(ids.operation(marker.operationId))
      setPendingAction(marker.action ?? null)
      setStatus('unknown')
    }
    void resolvePending()
  }, [accountId, loading, resolvePending])

  const verifiedMethods = snapshot?.methods.filter((method) => method.verified) ?? []
  const possibleCurrentMethods = verifiedMethods.map((method) => method.kind)
  const selectedCurrentMethod = currentMethod ?? (possibleCurrentMethods.length === 1 ? possibleCurrentMethods[0] : null)
  const candidateMethod = selectedCurrentMethod === 'google' ? 'email-password' : selectedCurrentMethod === 'email-password' ? 'google' : null
  const candidateAddress = intent?.candidateProofId
    ? intent.candidate.address
    : intent?.candidate.address

  const beginAction = useCallback((action: LinkPendingAction, activeIntent: LinkIntentSnapshot | null) => {
    if (!accountId) return null
    const id = pendingAction === action && operationId ? operationId : newOperationId(`account-link-${action}`)
    const marker = {
      version: 1 as const,
      accountId,
      operationId: id,
      ...(activeIntent ? { intentId: activeIntent.id } : {}),
      action,
    }
    if (!storePendingAccountLink(marker)) {
      setStorageUnavailable(true)
      return null
    }
    setStorageUnavailable(false)
    currentProofAttempt.current = action === 'current' ? id : null
    setOperationId(id)
    setPendingAction(action)
    setBusy(true)
    setErrorCode(null)
    setStatus('idle')
    return id
  }, [accountId, operationId, pendingAction])

  const finishMutationError = useCallback((actionId: OperationId, activeIntent: LinkIntentSnapshot | null, result: { status: string; error?: ServiceError }) => {
    const code = errorCodeFrom(result)
    if (result.status === 'unknown' || (code && (result.error?.retry === 'reconcile-first'))) {
      setStatus('unknown')
      return
    }
    if (result.status === 'error' && result.error?.retry === 'same-operation') {
      setOperationId(actionId)
      setErrorCode(code)
      setStatus('not-started')
      return
    }
    clearPendingAccountLink(actionId, activeIntent?.id)
    if (activeIntent) saveBaseline(activeIntent)
    setOperationId(null)
    setPendingAction(null)
    setErrorCode(code)
    setStatus(result.status === 'conflict' ? 'conflict' : 'idle')
  }, [saveBaseline])

  const proveWithProvider = useCallback(async (step: 'current' | 'candidate', providerProofId: OperationId) => {
    if (!intent) return
    const action: LinkPendingAction = step
    const id = beginAction(action, intent)
    if (!id) return
    try {
      const result = step === 'current'
        ? await props.services.accountLinking.proveCurrent({ intentId: intent.id, providerProofId, operationId: id })
        : await props.services.accountLinking.proveCandidate({ intentId: intent.id, providerProofId, operationId: id })
      if (result.status === 'ok') {
        if (step === 'current') {
          setCurrentProofId(result.data.proofId)
          setIntent((current) => current ? { ...current, currentProofId: result.data.proofId } : current)
        } else if ('candidate' in result.data) {
          const candidate = result.data.candidate
          setCandidateProofId(result.data.proofId)
          setIntent((current) => current ? { ...current, candidateProofId: result.data.proofId, candidate } : current)
        }
        setCurrentPassword('')
        setCandidateCode('')
        setOperationId(null)
        setPendingAction(null)
        setStatus('idle')
        saveBaseline(intent)
      } else finishMutationError(id, intent, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [beginAction, finishMutationError, intent, props.services, saveBaseline])

  const onStartLink = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    const selectedMethod = currentMethod ?? snapshot?.methods.find((method) => method.verified)?.kind ?? null
    if (!snapshot || !accountId || !selectedMethod || !candidateMethod || busy) return
    if (candidateMethod === 'email-password') {
      if (!candidateEmail.trim() || !/^\S+@\S+\.\S+$/.test(candidateEmail.trim())) {
        setFormError('email')
        return
      }
      if (candidatePassword.length < 8) {
        setFormError('password')
        return
      }
    }
    setFormError(null)
    const id = beginAction('start', null)
    if (!id) return
    try {
      const candidate = candidateMethod === 'google'
        ? { method: 'google' as const }
        : { method: 'email-password' as const, email: candidateEmail.trim(), password: candidatePassword }
      const result = await props.services.accountLinking.start({
        currentMethod: selectedMethod,
        candidate,
        expectedAccountRevision: snapshot.revision,
        operationId: id,
      })
      if (result.status === 'ok') {
        persistIntent(result.data)
        setCandidatePassword('')
        setCandidateEmail(result.data.candidate.address ?? candidateEmail.trim())
      } else finishMutationError(id, null, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [accountId, beginAction, busy, candidateEmail, candidateMethod, candidatePassword, currentMethod, finishMutationError, persistIntent, props.services, snapshot])

  const onCurrentProof = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!intent || busy) return
    if (intent.currentMethod === 'google') {
      const id = beginAction('current-google', intent)
      if (!id) return
      try {
        const provider = await props.services.identity.google({
          purpose: 'link', intentId: intent.id, linkStep: 'current', operationId: id,
        })
        if (provider.status === 'ok' && provider.data.state === 'completed' && provider.data.providerProofId && provider.data.linkStep === 'current') {
          await proveWithProvider('current', provider.data.providerProofId)
        } else if (provider.status === 'ok' && provider.data.state === 'canceled') {
          setStatus('idle')
          setOperationId(null)
          setPendingAction(null)
          saveBaseline(intent)
        } else finishMutationError(id, intent, provider)
      } catch {
        setStatus('unknown')
      } finally {
        setBusy(false)
      }
      return
    }
    if (!currentPassword) return
    const id = beginAction('current', intent)
    if (!id) return
    setCurrentPasswordInvalid(false)
    try {
      const expectedSessionId = props.identity.status === 'signed-in' ? props.identity.session.id : null
      const result = await props.services.accountLinking.proveCurrent({ intentId: intent.id, password: currentPassword, operationId: id })
      if (currentProofAttempt.current !== id) return
      if (result.status === 'ok') {
        setCurrentProofId(result.data.proofId)
        setIntent((current) => current ? { ...current, currentProofId: result.data.proofId } : current)
        setCurrentPassword('')
        setOperationId(null)
        setPendingAction(null)
        setStatus('idle')
        saveBaseline(intent)
      } else if (result.status === 'error' && result.error.code === 'unauthenticated') {
        const current = await props.services.identity.current()
        if (currentProofAttempt.current !== id) return
        const sameLiveAccount = current.status === 'ok'
          && current.data?.account.id === intent.accountId
          && current.data.account.deleted === false
          && current.data.session.accountId === intent.accountId
          && expectedSessionId !== null
          && current.data.session.id === expectedSessionId
          && current.data.session.expiresAt > Date.now()

        if (sameLiveAccount) {
          setOperationId(null)
          setPendingAction(null)
          setErrorCode(null)
          setStatus('idle')
          setCurrentPasswordInvalid(true)
          saveBaseline(intent)
        } else if (current.status === 'error' && !['unauthenticated', 'expired'].includes(current.error.code)) {
          finishMutationError(id, intent, current)
        } else {
          finishMutationError(id, intent, result)
        }
      } else finishMutationError(id, intent, result)
    } catch {
      if (currentProofAttempt.current === id) setStatus('unknown')
    } finally {
      if (currentProofAttempt.current === id) {
        currentProofAttempt.current = null
        setBusy(false)
      }
    }
  }, [beginAction, busy, currentPassword, finishMutationError, intent, props.identity, props.services, proveWithProvider, saveBaseline])

  const onCandidateProof = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!intent || busy) return
    if (intent.candidate.method === 'google') {
      const id = beginAction('candidate-google', intent)
      if (!id) return
      try {
        const provider = await props.services.identity.google({
          purpose: 'link', intentId: intent.id, linkStep: 'candidate', operationId: id,
        })
        if (provider.status === 'ok' && provider.data.state === 'completed' && provider.data.providerProofId && provider.data.linkStep === 'candidate') {
          await proveWithProvider('candidate', provider.data.providerProofId)
        } else if (provider.status === 'ok' && provider.data.state === 'canceled') {
          setStatus('idle')
          setOperationId(null)
          setPendingAction(null)
          saveBaseline(intent)
        } else finishMutationError(id, intent, provider)
      } catch {
        setStatus('unknown')
      } finally {
        setBusy(false)
      }
      return
    }
    if (!candidateCode) {
      setFormError('code')
      return
    }
    const id = beginAction('candidate', intent)
    if (!id) return
    try {
      const result = await props.services.accountLinking.proveCandidate({ intentId: intent.id, code: candidateCode, operationId: id })
      if (result.status === 'ok') {
        setCandidateProofId(result.data.proofId)
        setIntent((current) => current ? { ...current, candidateProofId: result.data.proofId, candidate: result.data.candidate } : current)
        setCandidateCode('')
        setOperationId(null)
        setPendingAction(null)
        setStatus('idle')
        setFormError(null)
        saveBaseline(intent)
      } else finishMutationError(id, intent, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [beginAction, busy, candidateCode, finishMutationError, intent, props.services, proveWithProvider, saveBaseline])

  const onResend = useCallback(async () => {
    if (!intent || busy) return
    const id = beginAction('resend', intent)
    if (!id) return
    try {
      const result = await props.services.accountLinking.resendCandidate({ intentId: intent.id, operationId: id })
      if (result.status === 'ok') persistIntent(result.data)
      else finishMutationError(id, intent, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [beginAction, busy, finishMutationError, intent, persistIntent, props.services])

  const onCommit = useCallback(async () => {
    if (!intent || !currentProofId || !candidateProofId || busy) return
    const id = beginAction('commit', intent)
    if (!id) return
    try {
      const result = await props.services.accountLinking.commit({
        intentId: intent.id,
        currentProofId,
        candidateProofId,
        expectedAccountRevision: intent.expectedAccountRevision,
        operationId: id,
      })
      if (result.status === 'ok') {
        if (result.data.state === 'completed') {
          await showCompleted({ ...intent, state: 'completed', currentProofId, candidateProofId })
        } else {
          setIntent(result.data.intent)
          setStatus('conflict')
          setOperationId(null)
          setPendingAction(null)
          saveBaseline(result.data.intent)
          await reloadAccount()
        }
      } else finishMutationError(id, intent, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [beginAction, busy, candidateProofId, currentProofId, finishMutationError, intent, props.services, reloadAccount, saveBaseline, showCompleted])

  const onCancel = useCallback(async () => {
    if (!intent || busy) return
    const id = beginAction('cancel', intent)
    if (!id) return
    try {
      const result = await props.services.accountLinking.cancel({ intentId: intent.id, operationId: id })
      if (result.status === 'ok') {
        clearPendingAccountLink(id, intent.id)
        setIntent(null)
        setCurrentProofId(null)
        setCandidateProofId(null)
        setOperationId(null)
        setPendingAction(null)
        setStatus('cancelled')
      } else finishMutationError(id, intent, result)
    } catch {
      setStatus('unknown')
    } finally {
      setBusy(false)
    }
  }, [beginAction, busy, finishMutationError, intent, props.services])

  const goBack = useCallback(async () => {
    setCurrentPassword('')
    setCandidatePassword('')
    setCandidateCode('')
    await props.navigate(routes.account())
  }, [props.navigate])

  const methodView = (method: LinkMethodKind, address?: string, verified = true) => (
    <div className="account-linking-screen__method">
      <span className="account-linking-screen__method-icon" aria-hidden="true">
        {method === 'google' ? <Link2 /> : <span>@</span>}
      </span>
      <span><strong>{kindName(method, text)}</strong>{address && <small>{address}</small>}</span>
      {verified && <Check aria-hidden="true" className="account-linking-screen__check" />}
    </div>
  )

  const currentMethodAddress = snapshot?.methods.find((method) => method.kind === intent?.currentMethod)?.address
  const readyToCommit = Boolean(intent && currentProofId && candidateProofId && status !== 'unknown' && (!busy || pendingAction === 'commit'))
  const candidateCodeDescriptor = intent?.candidateScenarioCode

  if (!accountIdentity) return <div className="account-linking-screen"><Notice>{text.signedOut}</Notice></div>
  if (loading) return <div className="account-linking-screen"><p role="status">{text.loading}</p></div>
  if (loadFailed || !snapshot) return <div className="account-linking-screen"><Notice tone="error" role="alert">{text.loadFailed}</Notice></div>

  return (
    <div className="account-linking-screen">
      <button className="account-linking-screen__back" type="button" onClick={() => void goBack()}>
        <ArrowLeft aria-hidden="true" />{text.back}
      </button>
      <header className="account-linking-screen__heading">
        <p className="account-linking-screen__eyebrow"><Link2 aria-hidden="true" />{locale === 'ru' ? 'Аккаунт и безопасность' : 'Account and security'}</p>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
      </header>
      <Notice className="account-linking-screen__preview">{text.preview}</Notice>

      {storageUnavailable && <Notice tone="error" role="alert">{text.storageUnavailable}</Notice>}
      {status === 'unknown' && (
        <Notice tone="warning" role="alert">
          <span>{text.unknown}</span>
          <Button variant="secondary" size="small" busy={checking} onClick={() => void resolvePending()}>{checking ? text.statusChecking : text.checkStatus}</Button>
        </Notice>
      )}
      {status === 'not-started' && (
        <Notice>
          <span>{text.notStarted}</span>
          <Button variant="secondary" size="small" busy={checking} onClick={() => void resolvePending()}>{text.checkStatus}</Button>
        </Notice>
      )}
      {status === 'completed' && (
        <Notice tone="success">
          <span>{text.completed}</span>
          <Button variant="secondary" size="small" onClick={() => void goBack()}>{text.backToAccount}</Button>
        </Notice>
      )}
      {status === 'cancelled' && <Notice>{text.cancelled}</Notice>}
      {status === 'conflict' && <Notice tone="warning">{text.conflict}</Notice>}
      {status === 'expired' && <Notice tone="warning">{text.expired}</Notice>}
      {errorCode && <ServiceNotice code={errorCode} />}
      {accountRefreshFailed && <Notice tone="warning">{text.accountUpdateFailed}</Notice>}

      {!intent && possibleCurrentMethods.length === 0 && <Notice tone="warning">{text.noMethod}</Notice>}
      {!intent && possibleCurrentMethods.length === 2 && <Notice>{text.bothLinked}</Notice>}

      {!intent && possibleCurrentMethods.length === 1 && (
        <section className="account-linking-screen__card" aria-labelledby="account-link-start-title">
          <div className="account-linking-screen__step-heading">
            <span className="account-linking-screen__step-number">1</span>
            <div>
              <h2 id="account-link-start-title">{candidateMethod === 'email-password' ? text.linkEmail : text.linkGoogle}</h2>
              <p>{text.currentMethod}: {kindName(currentMethod ?? possibleCurrentMethods[0], text)}</p>
            </div>
          </div>
          {candidateMethod === 'email-password' ? (
            <form className="account-linking-screen__form" onSubmit={(event) => void onStartLink(event)}>
              <p className="account-linking-screen__field-title">{text.candidateMethod}: {text.emailPassword}</p>
              <TextField
                label={text.candidateEmail}
                type="email"
                autoComplete="email"
                value={candidateEmail}
                onChange={(event) => { setCandidateEmail(event.currentTarget.value); setFormError(null) }}
                error={formError === 'email' ? text.emailRequired : undefined}
                required
                disabled={busy || status === 'unknown'}
              />
              <TextField
                label={text.candidatePassword}
                type="password"
                autoComplete="new-password"
                hint={text.passwordHint}
                minLength={8}
                value={candidatePassword}
                onChange={(event) => { setCandidatePassword(event.currentTarget.value); setFormError(null) }}
                error={formError === 'password' ? text.passwordTooShort : undefined}
                required
                disabled={busy || status === 'unknown'}
              />
              <Button type="submit" busy={busy && pendingAction === 'start'} disabled={(busy && pendingAction !== 'start') || status === 'unknown'}>{busy && pendingAction === 'start' ? text.starting : text.startLink}</Button>
            </form>
          ) : (
            <div className="account-linking-screen__form">
              <p className="account-linking-screen__field-title">{text.candidateMethod}: {text.google}</p>
              <Button busy={busy && pendingAction === 'start'} onClick={() => void onStartLink()} disabled={(busy && pendingAction !== 'start') || status === 'unknown'}>{busy && pendingAction === 'start' ? text.starting : text.linkGoogle}</Button>
            </div>
          )}
        </section>
      )}

      {intent && status !== 'completed' && status !== 'cancelled' && (
        <div className="account-linking-screen__steps">
          <section className="account-linking-screen__card" aria-labelledby="account-link-current-title">
            <div className="account-linking-screen__step-heading">
              <span className="account-linking-screen__step-number">1</span>
              <div><h2 id="account-link-current-title">{text.currentProof}</h2><p>{kindName(intent.currentMethod, text)}</p></div>
            </div>
            {intent.currentProofId || currentProofId ? (
              <Notice tone="success"><span>{text.verified}</span>{methodView(intent.currentMethod, currentMethodAddress)}</Notice>
            ) : intent.currentMethod === 'email-password' ? (
              <form className="account-linking-screen__form" onSubmit={(event) => void onCurrentProof(event)}>
                <TextField
                  label={text.currentPassword}
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  error={currentPasswordInvalid ? text.currentPasswordInvalid : undefined}
                  onChange={(event) => {
                    setCurrentPassword(event.currentTarget.value)
                    setCurrentPasswordInvalid(false)
                  }}
                  required
                  disabled={busy || status === 'unknown'}
                />
                <Button type="submit" busy={busy && pendingAction === 'current'} disabled={(busy && pendingAction !== 'current') || status === 'unknown'}>{busy && pendingAction === 'current' ? text.proving : text.proveCurrent}</Button>
              </form>
            ) : (
              <div className="account-linking-screen__form">
                <p>{text.currentGoogle}</p>
                <Button busy={busy && (pendingAction === 'current-google' || pendingAction === 'current')} onClick={() => void onCurrentProof()} disabled={(busy && pendingAction !== 'current-google' && pendingAction !== 'current') || status === 'unknown'}>
                  {busy && (pendingAction === 'current-google' || pendingAction === 'current') ? text.proving : text.currentGoogle}
                </Button>
              </div>
            )}
          </section>

          <section className="account-linking-screen__card" aria-labelledby="account-link-candidate-title">
            <div className="account-linking-screen__step-heading">
              <span className="account-linking-screen__step-number">2</span>
              <div><h2 id="account-link-candidate-title">{text.candidateProof}</h2><p>{kindName(intent.candidate.method, text)}</p></div>
            </div>
            {intent.candidateProofId || candidateProofId ? (
              <Notice tone="success"><span>{text.verified}</span>{methodView(intent.candidate.method, intent.candidate.address)}</Notice>
            ) : intent.candidate.method === 'email-password' ? (
              <form className="account-linking-screen__form" onSubmit={(event) => void onCandidateProof(event)}>
                <p>{text.verificationText(intent.candidate.address ?? '')}</p>
                {candidateCodeDescriptor?.note === 'synthetic-mock-scenario' && (
                  <Notice tone="neutral">{text.mockCode(candidateCodeDescriptor.value)}</Notice>
                )}
                <OtpInput
                  id="account-link-code"
                  label={text.verificationCode}
                  value={candidateCode}
                  onChange={(value) => { setCandidateCode(value); setFormError(null) }}
                  disabled={busy || status === 'unknown'}
                  invalid={formError === 'code'}
                />
                {formError === 'code' && <p className="account-linking-screen__field-error" role="alert">{text.codeRequired}</p>}
                <div className="account-linking-screen__actions">
                  <Button type="submit" busy={busy && pendingAction === 'candidate'} disabled={(busy && pendingAction !== 'candidate') || status === 'unknown'}>{busy && pendingAction === 'candidate' ? text.proving : text.verifyCandidate}</Button>
                  <Button type="button" variant="ghost" busy={busy && pendingAction === 'resend'} disabled={(busy && pendingAction !== 'resend') || status === 'unknown'} onClick={() => void onResend()}>{text.resend}</Button>
                </div>
              </form>
            ) : (
              <div className="account-linking-screen__form">
                <p>{text.candidateGoogle}</p>
                <Button busy={busy && (pendingAction === 'candidate-google' || pendingAction === 'candidate')} onClick={() => void onCandidateProof()} disabled={(busy && pendingAction !== 'candidate-google' && pendingAction !== 'candidate') || status === 'unknown'}>{busy && (pendingAction === 'candidate-google' || pendingAction === 'candidate') ? text.proving : text.linkGoogle}</Button>
              </div>
            )}
          </section>

          {readyToCommit && (
            <section className="account-linking-screen__card account-linking-screen__review" aria-labelledby="account-link-review-title">
              <div className="account-linking-screen__step-heading">
                <span className="account-linking-screen__step-number"><Check aria-hidden="true" /></span>
                <div><h2 id="account-link-review-title">{text.review}</h2><p>{text.reviewDescription}</p></div>
              </div>
              <div className="account-linking-screen__review-methods">
                {methodView(intent.currentMethod, currentMethodAddress)}
                {methodView(intent.candidate.method, candidateAddress)}
              </div>
              <div className="account-linking-screen__actions">
                <Button busy={busy && pendingAction === 'commit'} onClick={() => void onCommit()} disabled={busy && pendingAction !== 'commit'}>{busy && pendingAction === 'commit' ? text.committing : text.commit}</Button>
                <Button variant="ghost" busy={busy && pendingAction === 'cancel'} onClick={() => void onCancel()} disabled={busy && pendingAction !== 'cancel'}>{text.cancel}</Button>
              </div>
            </section>
          )}
          {!readyToCommit && (
            <div className="account-linking-screen__footer-actions">
              <Button variant="ghost" busy={busy && pendingAction === 'cancel'} onClick={() => void onCancel()} disabled={(busy && pendingAction !== 'cancel') || status === 'unknown'}>{text.cancel}</Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AccountLinkingScreen
