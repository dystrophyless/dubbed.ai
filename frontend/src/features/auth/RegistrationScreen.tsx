import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { routes } from '../../app/routes'
import { AppLink } from '../../app/AppLink'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type { OperationId, PendingVerification, ServiceError, ServiceResult } from '../../services/contracts'
import {
  clearPendingAuthReference,
  formatRemaining,
  isValidEmail,
  newOperationId,
  normalizeEmail,
  readPendingAuthReference,
  registrationStorageKey,
  serviceProblemCode,
  storePendingAuthReference,
  type PendingAuthReference,
} from './auth-utils'
import { AuthLayout } from './AuthLayout'
import OtpInput from './OtpInput'
import type { ServiceProblemCode } from '../../i18n/service-errors'

type EmailAction = 'start' | 'verify' | 'resend' | 'correct-email'
type OperationMarker =
  | { kind: 'email'; action: EmailAction; operationId: OperationId; requestId: OperationId }
  | { kind: 'google'; operationId: OperationId }
type RetryAttempt =
  | { kind: 'email'; action: EmailAction; operationId: OperationId }
  | { kind: 'google'; operationId: OperationId }
type Phase = 'form' | 'correcting' | 'checking' | 'code' | 'expired' | 'collision' | 'unknown' | 'success'
type BusyAction = EmailAction | 'google' | 'status' | 'continue'

const operationStorageKey = 'dubbed.auth.registration.operation.v1'

type VerificationResult = Extract<
  Awaited<ReturnType<FeatureScreenProps['services']['registration']['verify']>>,
  { status: 'ok' }
>['data']
type GoogleResult = Extract<
  Awaited<ReturnType<FeatureScreenProps['services']['identity']['google']>>,
  { status: 'ok' }
>['data']

type Completion =
  | { kind: 'email'; outcome: VerificationResult['outcome']; welcomeGrantApplied: boolean; operationId: OperationId }
  | { kind: 'google'; welcomeGrantApplied: boolean; operationId: OperationId }

type Copy = {
  title: string
  description: string
  email: string
  password: string
  passwordHint: string
  invalidEmail: string
  missingPassword: string
  shortPassword: string
  showPassword: string
  hidePassword: string
  create: string
  creating: string
  correct: string
  correcting: string
  google: string
  googleSeparator: string
  googlePreview: string
  googleCanceled: string
  googleDenied: string
  googleConflict: string
  googleLinkRequired: string
  googleNotFound: string
  existingAccount: string
  signIn: string
  checkEmail: string
  codeDescription: (email: string) => string
  codeLabel: string
  codeInvalid: string
  codeExpired: string
  changeEmail: string
  resend: string
  requestNewCode: string
  resendIn: (time: string) => string
  codeExpiresIn: (time: string) => string
  resendCount: (count: number) => string
  remainingSends: (count: number) => string
  localCode: (value: string) => string
  unknown: string
  checking: string
  checkStatus: string
  retryVerify: string
  notStarted: string
  operationPending: string
  collisionTitle: string
  collisionDescription: string
  resetPassword: string
  sessionUnconfirmed: string
  continueToNewDub: string
  accountReady: string
  passwordAdded: string
  welcomeCredits: string
}

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'Create your account',
    description: 'Create an account to start making a dub.',
    email: 'Email',
    password: 'Password',
    passwordHint: 'At least 8 characters.',
    invalidEmail: 'Enter a valid email address.',
    missingPassword: 'Enter a password.',
    shortPassword: 'Use at least 8 characters.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    create: 'Create account',
    creating: 'Creating account…',
    correct: 'Update email and send code',
    correcting: 'Updating email…',
    google: 'Continue with Google',
    googleSeparator: 'or',
    googlePreview: 'Local preview only. No Google provider is contacted.',
    googleCanceled: 'The Google preview was canceled. No account was created; you can continue with email and password.',
    googleDenied: 'The Google preview was denied. No account was created; try again or continue with email and password.',
    googleConflict: 'This simulated Google identity is already associated elsewhere. No account was changed.',
    googleLinkRequired: 'This simulated Google identity needs the separate account-linking flow. No account was changed.',
    googleNotFound: 'No account is associated with this simulated Google identity. Create an account with email and password first.',
    existingAccount: 'Already have an account?',
    signIn: 'Sign in',
    checkEmail: 'Check your email',
    codeDescription: (email) => `Enter the six-digit verification code for ${email}.`,
    codeLabel: '6-digit verification code',
    codeInvalid: 'This code cannot be used. Keep it here and replace it with the current code.',
    codeExpired: 'This code has expired. Request a new eligible code or change the email address.',
    changeEmail: 'Change email',
    resend: 'Resend code',
    requestNewCode: 'Request a new code',
    resendIn: (time) => `Resend available in ${time}`,
    codeExpiresIn: (time) => `Code expires in ${time}`,
    resendCount: (count) => `Resend requests for this address: ${count}`,
    remainingSends: (count) => `Local mock sends remaining this hour: ${count}.`,
    localCode: (value) => `Simulated code · local mock: ${value}. No email was sent.`,
    unknown: 'We could not confirm the last step. Check its status before trying again.',
    checking: 'Checking registration status…',
    checkStatus: 'Check status',
    retryVerify: 'Retry verification',
    notStarted: 'No change was recorded. You can continue when ready.',
    operationPending: 'This step is still being confirmed. Check its status before trying again.',
    collisionTitle: 'Account already exists',
    collisionDescription: 'This email already has a password sign-in. Sign in or reset that password to continue.',
    resetPassword: 'Reset password',
    sessionUnconfirmed: 'Your account step is confirmed. The signed-in session is still being checked.',
    continueToNewDub: 'Continue to New dub',
    accountReady: 'Your account is ready.',
    passwordAdded: 'Password sign-in was added to your existing account.',
    welcomeCredits: 'Welcome credits were applied to your account.',
  },
  ru: {
    title: 'Создайте аккаунт',
    description: 'Создайте аккаунт, чтобы начать озвучивание.',
    email: 'Электронная почта',
    password: 'Пароль',
    passwordHint: 'Не менее 8 символов.',
    invalidEmail: 'Введите корректный email.',
    missingPassword: 'Введите пароль.',
    shortPassword: 'Используйте не менее 8 символов.',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    create: 'Создать аккаунт',
    creating: 'Создаём аккаунт…',
    correct: 'Изменить email и отправить код',
    correcting: 'Обновляем email…',
    google: 'Продолжить с Google',
    googleSeparator: 'или',
    googlePreview: 'Только локальный предпросмотр. Запроса к Google нет.',
    googleCanceled: 'Предпросмотр Google отменён. Аккаунт не создан; можно продолжить по email и паролю.',
    googleDenied: 'Предпросмотр Google отклонён. Аккаунт не создан; попробуйте ещё раз или продолжите по email и паролю.',
    googleConflict: 'Этот тестовый профиль Google уже связан с другим аккаунтом. Данные не изменены.',
    googleLinkRequired: 'Для этого тестового профиля Google нужен отдельный сценарий привязки. Данные не изменены.',
    googleNotFound: 'Для этого тестового профиля Google аккаунт не найден. Сначала создайте аккаунт по email и паролю.',
    existingAccount: 'Уже есть аккаунт?',
    signIn: 'Войти',
    checkEmail: 'Проверьте почту',
    codeDescription: (email) => `Введите шестизначный код подтверждения для ${email}.`,
    codeLabel: '6-значный код подтверждения',
    codeInvalid: 'Этот код нельзя использовать. Он сохранён в поле; замените его актуальным кодом.',
    codeExpired: 'Срок действия кода истёк. Запросите новый доступный код или измените email.',
    changeEmail: 'Изменить email',
    resend: 'Отправить код ещё раз',
    requestNewCode: 'Запросить новый код',
    resendIn: (time) => `Повторить через ${time}`,
    codeExpiresIn: (time) => `Код истекает через ${time}`,
    resendCount: (count) => `Запросов повторной отправки для этого адреса: ${count}`,
    remainingSends: (count) => `В локальном сценарии осталось отправок за этот час: ${count}.`,
    localCode: (value) => `Тестовый код · локальный мок: ${value}. Письмо не отправлялось.`,
    unknown: 'Не удалось подтвердить последний шаг. Проверьте его состояние перед повторной попыткой.',
    checking: 'Проверяем состояние регистрации…',
    checkStatus: 'Проверить состояние',
    retryVerify: 'Повторить проверку',
    notStarted: 'Изменение не зарегистрировано. Можно продолжить, когда будете готовы.',
    operationPending: 'Этот шаг ещё подтверждается. Проверьте его состояние перед повторной попыткой.',
    collisionTitle: 'Аккаунт уже существует',
    collisionDescription: 'Для этого email уже настроен вход по паролю. Войдите или сбросьте пароль.',
    resetPassword: 'Сбросить пароль',
    sessionUnconfirmed: 'Шаг аккаунта подтверждён. Проверяем вход в аккаунт.',
    continueToNewDub: 'Перейти к новой озвучке',
    accountReady: 'Аккаунт готов.',
    passwordAdded: 'В существующий аккаунт добавлен вход по паролю.',
    welcomeCredits: 'Приветственные кредиты начислены на аккаунт.',
  },
}

function readOperationMarker(): OperationMarker | null {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(operationStorageKey) ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const value = parsed as Record<string, unknown>
    const validId = (candidate: unknown): candidate is OperationId =>
      typeof candidate === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(candidate)
    if (value.kind === 'google' && validId(value.operationId)) {
      return { kind: 'google', operationId: value.operationId as OperationId }
    }
    const actions: EmailAction[] = ['start', 'verify', 'resend', 'correct-email']
    if (value.kind === 'email' && actions.includes(value.action as EmailAction) && validId(value.operationId) && validId(value.requestId)) {
      return {
        kind: 'email',
        action: value.action as EmailAction,
        operationId: value.operationId as OperationId,
        requestId: value.requestId as OperationId,
      }
    }
    return null
  } catch {
    return null
  }
}

function writeOperationMarker(marker: OperationMarker | null) {
  try {
    if (marker) window.sessionStorage.setItem(operationStorageKey, JSON.stringify(marker))
    else window.sessionStorage.removeItem(operationStorageKey)
  } catch {
    // The service reference remains authoritative when storage is unavailable.
  }
}

function isPendingVerification(value: unknown): value is PendingVerification {
  if (!value || typeof value !== 'object') return false
  const pending = value as Partial<PendingVerification>
  return pending.purpose === 'registration'
    && typeof pending.id === 'string'
    && typeof pending.email === 'string'
    && typeof pending.expiresAt === 'number'
    && typeof pending.resendAvailableAt === 'number'
}

function errorCode(error: ServiceError | undefined): ServiceProblemCode {
  return error ? serviceProblemCode({ status: 'error', error }) : 'unexpected'
}

export function RegistrationScreen(props: FeatureScreenProps) {
  const text = copy[props.locale]
  const [initialReference] = useState(() => readPendingAuthReference(registrationStorageKey))
  const [initialOperation] = useState(readOperationMarker)
  const [phase, setPhase] = useState<Phase>(initialReference || initialOperation ? 'checking' : 'form')
  const [email, setEmail] = useState(initialReference?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [pending, setPending] = useState<PendingVerification | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [serviceError, setServiceError] = useState<ServiceProblemCode | null>(null)
  const [statusMessage, setStatusMessage] = useState(initialReference || initialOperation ? text.checking : '')
  const [providerMessage, setProviderMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null)
  const [unknownAction, setUnknownAction] = useState<OperationMarker | null>(initialOperation)
  const [retryAvailable, setRetryAvailable] = useState(false)
  const [completion, setCompletion] = useState<Completion | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const busyRef = useRef(false)
  const recoveryAttempted = useRef(false)
  const pendingRef = useRef<PendingVerification | null>(null)
  const markerRef = useRef<OperationMarker | null>(initialOperation)
  const retryAttemptRef = useRef<RetryAttempt | null>(null)
  const lastSubmittedCodeRef = useRef<string | null>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const intent = initialReference?.intent ?? props.signInIntent

  const remember = useCallback((requestId: OperationId, emailValue: string, pendingOperationId?: OperationId) => {
    const reference: PendingAuthReference = {
      version: 1,
      requestId,
      ...(pendingOperationId ? { pendingOperationId } : {}),
      email: normalizeEmail(emailValue),
      ...(intent.kind === 'resume-project-screen' ? { intent } : {}),
    }
    storePendingAuthReference(registrationStorageKey, reference)
    return reference
  }, [intent])

  const forgetReference = useCallback(() => {
    clearPendingAuthReference(registrationStorageKey)
  }, [])

  const setOperation = useCallback((marker: OperationMarker | null) => {
    markerRef.current = marker
    writeOperationMarker(marker)
    setUnknownAction(marker)
  }, [])

  const setCurrentPending = useCallback((next: PendingVerification | null) => {
    pendingRef.current = next
    setPending(next)
  }, [])

  const showPending = useCallback((verification: PendingVerification, message = '') => {
    if (verification.purpose !== 'registration') {
      setServiceError('unexpected')
      setStatusMessage(text.unknown)
      setPhase('unknown')
      return
    }
    setNow(Date.now())
    setCurrentPending(verification)
    setEmail(normalizeEmail(verification.email))
    setCode('')
    setCodeError(false)
    lastSubmittedCodeRef.current = null
    setPhase('code')
    setStatusMessage(message)
    setServiceError(null)
    setProviderMessage('')
    setCompletion(null)
    retryAttemptRef.current = null
    setRetryAvailable(false)
    setOperation(null)
    remember(verification.id, verification.email)
  }, [remember, setCurrentPending, setOperation, text.unknown])

  const clearTransientErrors = () => {
    setServiceError(null)
    setStatusMessage('')
    setProviderMessage('')
  }

  const showCollision = useCallback(() => {
    setCurrentPending(null)
    setCode('')
    setCodeError(false)
    setPassword('')
    setPhase('collision')
    setCompletion(null)
    setOperation(null)
    forgetReference()
    retryAttemptRef.current = null
    setRetryAvailable(false)
    clearTransientErrors()
  }, [forgetReference, setCurrentPending, setOperation])

  const continueToNewDub = useCallback(async (operationId: OperationId, kind: 'email' | 'google') => {
    setBusyAction('continue')
    setBusy(true)
    busyRef.current = true
    setServiceError(null)
    try {
      const current = await props.refreshIdentity()
      if (current.status !== 'signed-in') {
        setOperation(kind === 'google'
          ? { kind: 'google', operationId }
          : { kind: 'email', action: 'verify', operationId, requestId: pendingRef.current?.id ?? operationId })
        setPhase('unknown')
        setStatusMessage(text.sessionUnconfirmed)
        if (kind === 'email') remember(pendingRef.current?.id ?? operationId, email, operationId)
        return false
      }
      const navigated = await props.navigate(routes.newDub(), { replace: true })
      if (!navigated) {
        setPhase('success')
        setStatusMessage(text.sessionUnconfirmed)
        setOperation(null)
        return false
      }
      setOperation(null)
      forgetReference()
      setCurrentPending(null)
      setCode('')
      return true
    } catch {
      setPhase('success')
      setStatusMessage(text.sessionUnconfirmed)
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }, [email, forgetReference, props.navigate, props.refreshIdentity, remember, setCurrentPending, setOperation, text.sessionUnconfirmed])

  const applyEmailCompletion = useCallback(async (result: VerificationResult, operationId: OperationId) => {
    setCompletion({ kind: 'email', outcome: result.outcome, welcomeGrantApplied: result.welcomeGrantApplied, operationId })
    setStatusMessage(result.outcome === 'password-method-added'
      ? text.passwordAdded
      : result.welcomeGrantApplied ? text.welcomeCredits : text.accountReady)
    await continueToNewDub(operationId, 'email')
  }, [continueToNewDub, text.accountReady, text.passwordAdded, text.welcomeCredits])

  const applyGoogleCompletion = useCallback(async (result: GoogleResult, operationId: OperationId) => {
    if (result.state !== 'completed' || result.purpose !== 'registration') return false
    setCompletion({ kind: 'google', welcomeGrantApplied: result.welcomeGrantApplied, operationId })
    setStatusMessage(result.welcomeGrantApplied ? text.welcomeCredits : text.accountReady)
    await continueToNewDub(operationId, 'google')
    return true
  }, [continueToNewDub, text.accountReady, text.welcomeCredits])

  const handleOperationFailure = useCallback((marker: OperationMarker, error: ServiceError | undefined) => {
    setOperation(null)
    retryAttemptRef.current = null
    setRetryAvailable(false)
    if (error?.code === 'already-exists') {
      showCollision()
      return
    }
    if (marker.kind === 'email' && marker.action === 'verify' && error?.code === 'invalid-code') {
      setPhase('code')
      setCodeError(true)
      setServiceError(null)
      remember(marker.requestId, email)
      window.requestAnimationFrame(() => codeRef.current?.select())
      return
    }
    if (marker.kind === 'email' && marker.action === 'verify' && error?.code === 'expired') {
      setPhase('expired')
      setCodeError(false)
      setStatusMessage(text.codeExpired)
      remember(marker.requestId, email)
      return
    }
    if (marker.kind === 'email' && marker.action === 'start') {
      setPhase('form')
      forgetReference()
    } else if (marker.kind === 'email' && marker.action === 'correct-email') {
      setPhase('correcting')
      remember(marker.requestId, email)
    } else {
      setPhase('code')
      remember(marker.kind === 'email' ? marker.requestId : pendingRef.current?.id ?? marker.operationId, email)
    }
    setServiceError(errorCode(error))
    setStatusMessage('')
  }, [email, forgetReference, remember, setOperation, showCollision, text.codeExpired])

  const handleEmailResult = useCallback((marker: OperationMarker, value: unknown) => {
    if (marker.kind !== 'email') return false
    if (marker.action === 'verify') {
      if (!value || typeof value !== 'object' || !('account' in value) || !('session' in value)
        || !('outcome' in value) || !('welcomeGrantApplied' in value)) return false
      void applyEmailCompletion(value as VerificationResult, marker.operationId)
      return true
    }
    if (!isPendingVerification(value)) return false
    showPending(value)
    return true
  }, [applyEmailCompletion, showPending])

  const handleGoogleResult = useCallback(async (value: unknown, operationId: OperationId) => {
    if (!value || typeof value !== 'object' || !('state' in value)) return false
    const result = value as GoogleResult
    if (result.state === 'completed') {
      if (result.purpose !== 'registration') return false
      await applyGoogleCompletion(result, operationId)
      return true
    }
    setOperation(null)
    switch (result.state) {
      case 'canceled': setProviderMessage(text.googleCanceled); break
      case 'denied': setProviderMessage(text.googleDenied); break
      case 'conflict': setProviderMessage(text.googleConflict); break
      case 'link-required': setProviderMessage(text.googleLinkRequired); break
      case 'account-not-found': setProviderMessage(text.googleNotFound); break
      default: setProviderMessage(text.unknown); break
    }
    setPhase('form')
    setStatusMessage('')
    setServiceError(null)
    return true
  }, [applyGoogleCompletion, setOperation, text.googleCanceled, text.googleConflict, text.googleDenied, text.googleLinkRequired, text.googleNotFound, text.unknown])

  const restorePending = useCallback(async (requestId: OperationId, emailValue: string, message = text.notStarted) => {
    try {
      const result = await props.services.registration.resolve({ requestId })
      if (result.status !== 'ok') {
        setPhase('unknown')
        setServiceError(serviceProblemCode(result))
        setStatusMessage(text.unknown)
        return
      }
      if ('id' in result.data) {
        if (result.data.purpose === 'registration') {
          showPending(result.data, message)
          return
        }
        setPhase('unknown')
        setStatusMessage(text.unknown)
        return
      }
      if (result.data.state === 'completed') {
        setStatusMessage(text.sessionUnconfirmed)
        const identity = await props.refreshIdentity()
        if (identity.status === 'signed-in') {
          const navigated = await props.navigate(routes.newDub(), { replace: true })
          if (navigated) {
            setOperation(null)
            forgetReference()
            return
          }
        }
        setPhase('success')
        return
      }
      if (result.data.state === 'expired') {
        setCurrentPending(null)
        setEmail(emailValue)
        setPhase('form')
        setStatusMessage(text.codeExpired)
        forgetReference()
        setOperation(null)
        return
      }
      setCurrentPending(null)
      setEmail(emailValue)
      setPhase('form')
      setStatusMessage(message)
      forgetReference()
      setOperation(null)
    } catch {
      setPhase('unknown')
      setStatusMessage(text.unknown)
    }
  }, [forgetReference, props.navigate, props.refreshIdentity, props.services.registration, setCurrentPending, setOperation, showPending, text.codeExpired, text.notStarted, text.sessionUnconfirmed, text.unknown])

  const checkOperation = useCallback(async (marker: OperationMarker, restoring = false) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusyAction('status')
    setBusy(true)
    setPhase('unknown')
    setStatusMessage(text.checking)
    setServiceError(null)
    try {
      const result = await props.services.operations.resolve<unknown>(marker.operationId)
      if (result.status !== 'ok') {
        setServiceError(serviceProblemCode(result))
        setStatusMessage(text.unknown)
        setOperation(marker)
        return
      }
      const operation = result.data
      if ('safeToRetrySameId' in operation) {
        setOperation(null)
        setStatusMessage(text.notStarted)
        if (marker.kind === 'google') {
          retryAttemptRef.current = { kind: 'google', operationId: marker.operationId }
          setRetryAvailable(true)
          setPhase('form')
          setProviderMessage(text.notStarted)
          return
        }
        retryAttemptRef.current = { kind: 'email', action: marker.action, operationId: marker.operationId }
        if (marker.action === 'start') {
          setPhase('form')
          if (restoring) forgetReference()
          return
        }
        if (marker.action === 'correct-email') {
          const pendingResult = await props.services.registration.resolve({ requestId: marker.requestId })
          if (pendingResult.status === 'ok' && 'id' in pendingResult.data && pendingResult.data.purpose === 'registration') {
            setCurrentPending(pendingResult.data)
            setPhase('correcting')
            if (restoring) setPassword('')
            return
          }
          setCurrentPending(null)
          setPhase('form')
          if (restoring) forgetReference()
          return
        }
        if (marker.action === 'verify' && !code && restoring) {
          await restorePending(marker.requestId, email)
          return
        }
        if (marker.action === 'verify' && code.length === 6 && !restoring) {
          setRetryAvailable(true)
          setPhase('code')
          return
        }
        setPhase('code')
        setOperation(null)
        if (restoring) await restorePending(marker.requestId, email)
        return
      }
      if (operation.state === 'pending') {
        setOperation(marker)
        setStatusMessage(text.operationPending)
        return
      }
      if (operation.state === 'rejected') {
        handleOperationFailure(marker, operation.error)
        return
      }
      const payload = operation.result
      if (marker.kind === 'google') {
        const handled = await handleGoogleResult(payload, marker.operationId)
        if (!handled) {
          setOperation(marker)
          setStatusMessage(text.unknown)
        }
        return
      }
      const handled = handleEmailResult(marker, payload)
      if (!handled) {
        setOperation(marker)
        setStatusMessage(text.unknown)
      }
    } catch {
      setOperation(marker)
      setStatusMessage(text.unknown)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }, [code, email, forgetReference, handleEmailResult, handleGoogleResult, handleOperationFailure, props.services.operations, props.services.registration, restorePending, setCurrentPending, setOperation, text.checking, text.notStarted, text.operationPending, text.unknown])

  useEffect(() => {
    if (recoveryAttempted.current || (!initialReference && !initialOperation)) return
    recoveryAttempted.current = true
    if (initialOperation) {
      void checkOperation(initialOperation, true)
      return
    }
    if (initialReference) {
      void restorePending(initialReference.requestId, initialReference.email, text.checking)
        .catch(() => {
          setPhase('unknown')
          setStatusMessage(text.unknown)
        })
    }
  }, [checkOperation, initialOperation, initialReference, restorePending, text.checking, text.unknown])

  useEffect(() => {
    if (phase !== 'code' && phase !== 'expired') return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  const isExpired = phase === 'expired' || Boolean(pending && now >= pending.expiresAt)
  const resendRemaining = pending ? Math.max(0, pending.resendAvailableAt - now) : 0
  const expiryRemaining = pending ? Math.max(0, pending.expiresAt - now) : 0

  const executeEmailAction = async (
    marker: Extract<OperationMarker, { kind: 'email' }>,
    operation: () => Promise<ServiceResult<unknown>>,
    referenceEmail = email,
  ) => {
    setOperation(marker)
    setRetryAvailable(false)
    remember(marker.requestId, referenceEmail, marker.operationId)
    setBusyAction(marker.action)
    setBusy(true)
    busyRef.current = true
    setServiceError(null)
    setStatusMessage('')
    try {
      const result = await operation()
      if (result.status === 'ok') {
        if (marker.action === 'verify') {
          const value = result.data as VerificationResult
          await applyEmailCompletion(value, marker.operationId)
        } else if (isPendingVerification(result.data)) {
          showPending(result.data)
        } else {
          setOperation(marker)
          setPhase('unknown')
          setStatusMessage(text.unknown)
        }
        return
      }
      if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setPhase('unknown')
        setStatusMessage(text.operationPending)
        return
      }
      setOperation(null)
      if (result.status === 'error' && result.error.code === 'already-exists') {
        showCollision()
        return
      }
      if (result.status === 'error' && result.error.retry === 'same-operation' && marker.action !== 'verify') {
        retryAttemptRef.current = { kind: 'email', action: marker.action, operationId: marker.operationId }
      } else {
        retryAttemptRef.current = null
      }
      if (marker.action === 'verify' && result.status === 'error' && result.error.code === 'invalid-code') {
        setPhase('code')
        setCodeError(true)
        setServiceError(null)
        remember(marker.requestId, email)
        window.requestAnimationFrame(() => codeRef.current?.select())
      } else if (marker.action === 'verify' && result.status === 'error' && result.error.code === 'expired') {
        setPhase('expired')
        setStatusMessage(text.codeExpired)
        setServiceError(null)
        remember(marker.requestId, email)
      } else {
        setPhase(marker.action === 'start' ? 'form' : marker.action === 'correct-email' ? 'correcting' : 'code')
        setServiceError(serviceProblemCode(result))
      }
    } catch {
      setOperation(marker)
      setPhase('unknown')
      setStatusMessage(text.unknown)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const submitRegistration = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current || unknownAction) return
    const normalized = normalizeEmail(email)
    const invalid = !isValidEmail(normalized)
    const missing = password.length === 0
    const tooShort = password.length > 0 && password.length < 8
    setEmailError(invalid)
    setPasswordError(missing || tooShort)
    setServiceError(null)
    setStatusMessage('')
    setProviderMessage('')
    if (invalid || missing || tooShort) return
    setEmail(normalized)
    clearPendingAuthReference(registrationStorageKey)
    setCurrentPending(null)
    const currentRetry = retryAttemptRef.current
    const retry = currentRetry?.kind === 'email' && currentRetry.action === 'start'
      ? currentRetry
      : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    const marker: Extract<OperationMarker, { kind: 'email' }> = {
      kind: 'email',
      action: 'start',
      operationId,
      requestId: operationId,
    }
    setPhase('checking')
    void executeEmailAction(marker, () => props.services.registration.start({ email: normalized, password, operationId }), normalized)
  }

  const submitCorrection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const active = pendingRef.current
    if (busyRef.current || unknownAction || !active) return
    const normalized = normalizeEmail(email)
    const invalid = !isValidEmail(normalized)
    const missing = password.length === 0
    const tooShort = password.length > 0 && password.length < 8
    setEmailError(invalid)
    setPasswordError(missing || tooShort)
    setServiceError(null)
    setStatusMessage('')
    if (invalid || missing || tooShort) return
    setEmail(normalized)
    const currentRetry = retryAttemptRef.current
    const retry = currentRetry?.kind === 'email' && currentRetry.action === 'correct-email'
      ? currentRetry
      : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    const marker: Extract<OperationMarker, { kind: 'email' }> = {
      kind: 'email',
      action: 'correct-email',
      operationId,
      requestId: active.id,
    }
    setPhase('checking')
    void executeEmailAction(marker, () => props.services.registration.correctEmail({
      requestId: active.id,
      email: normalized,
      password,
      operationId,
    }), normalized)
  }

  const verifyCode = useCallback(async (value: string, retryOperationId?: OperationId) => {
    const active = pendingRef.current
    if (value.length !== 6 || !active || busyRef.current || isExpired) return
    const currentRetry = retryAttemptRef.current
    const retry = currentRetry?.kind === 'email' && currentRetry.action === 'verify'
      ? currentRetry
      : null
    const operationId = retryOperationId ?? retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    setRetryAvailable(false)
    const marker: Extract<OperationMarker, { kind: 'email' }> = {
      kind: 'email',
      action: 'verify',
      operationId,
      requestId: active.id,
    }
    lastSubmittedCodeRef.current = value
    setCodeError(false)
    await executeEmailAction(marker, () => props.services.registration.verify({ requestId: active.id, code: value, operationId }))
  }, [executeEmailAction, isExpired, props.services.registration])

  useEffect(() => {
    if (phase !== 'code' || !pending || code.length !== 6 || busy || unknownAction || isExpired) return
    if (lastSubmittedCodeRef.current === code) return
    void verifyCode(code)
  }, [busy, code, isExpired, pending, phase, unknownAction, verifyCode])

  const resendCode = () => {
    const active = pendingRef.current
    if (!active || busyRef.current || resendRemaining > 0) return
    const currentRetry = retryAttemptRef.current
    const retry = currentRetry?.kind === 'email' && currentRetry.action === 'resend'
      ? currentRetry
      : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    setRetryAvailable(false)
    const marker: Extract<OperationMarker, { kind: 'email' }> = {
      kind: 'email',
      action: 'resend',
      operationId,
      requestId: active.id,
    }
    void executeEmailAction(marker, () => props.services.registration.resend({ requestId: active.id, operationId }))
  }

  const changeEmail = () => {
    const active = pendingRef.current
    if (!active || busyRef.current) return
    setEmail(active.email)
    setPassword('')
    setEmailError(false)
    setPasswordError(false)
    setCodeError(false)
    retryAttemptRef.current = null
    setRetryAvailable(false)
    clearTransientErrors()
    setPhase('correcting')
  }

  const startGoogle = async () => {
    if (busyRef.current || unknownAction) return
    const retry = retryAttemptRef.current?.kind === 'google' ? retryAttemptRef.current : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    setRetryAvailable(false)
    const marker: OperationMarker = { kind: 'google', operationId }
    setOperation(marker)
    clearPendingAuthReference(registrationStorageKey)
    setCurrentPending(null)
    setServiceError(null)
    setProviderMessage('')
    setStatusMessage('')
    setPhase('checking')
    setBusyAction('google')
    setBusy(true)
    busyRef.current = true
    try {
      const result = await props.services.identity.google({ purpose: 'registration', intentId: operationId, operationId })
      if (result.status === 'ok') {
        const handled = await handleGoogleResult(result.data, operationId)
        if (!handled) {
          setOperation(marker)
          setPhase('unknown')
          setStatusMessage(text.unknown)
        }
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setPhase('unknown')
        setStatusMessage(text.operationPending)
      } else {
        setOperation(null)
        setPhase('form')
        setServiceError(serviceProblemCode(result))
      }
    } catch {
      setPhase('unknown')
      setStatusMessage(text.unknown)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const continueToDestination = async () => {
    if (busyRef.current) return
    setBusyAction('continue')
    setBusy(true)
    busyRef.current = true
    try {
      const identity = await props.refreshIdentity()
      if (identity.status !== 'signed-in') {
        setStatusMessage(text.sessionUnconfirmed)
        return
      }
      if (await props.navigate(routes.newDub(), { replace: true })) {
        setOperation(null)
        forgetReference()
        setCurrentPending(null)
        setCode('')
        setCompletion(null)
      }
    } catch {
      setStatusMessage(text.sessionUnconfirmed)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const submitFromStatus = () => {
    const marker = markerRef.current
    if (marker) void checkOperation(marker)
  }

  const changeEmailFromExpired = () => changeEmail()

  const localizedStatusMessage = statusMessage === copy.en.checking || statusMessage === copy.ru.checking
    ? text.checking
    : statusMessage
  const statusNotice = localizedStatusMessage
    ? <Notice tone={phase === 'success' ? 'success' : 'warning'} role="status">{localizedStatusMessage}</Notice>
    : null
  const showCodeForm = (phase === 'code' || phase === 'expired')
    || (phase === 'unknown' && Boolean(pending && unknownAction?.kind === 'email' && (unknownAction.action === 'verify' || unknownAction.action === 'resend')))
  const showRegistrationForm = (phase === 'form' || phase === 'correcting')
    || (phase === 'unknown' && !showCodeForm)

  return (
    <AuthLayout title={text.title} description={text.description}>
      {phase === 'checking' && (
        <div className="auth-form" aria-busy={busy}>
          <Notice role="status">{text.checking}</Notice>
          {localizedStatusMessage && localizedStatusMessage !== text.checking && <Notice tone="warning" role="status">{localizedStatusMessage}</Notice>}
        </div>
      )}

      {showRegistrationForm && (
        <form className="auth-form" onSubmit={(event) => phase === 'correcting' ? submitCorrection(event) : submitRegistration(event)} noValidate>
          {statusNotice}
          {providerMessage && <Notice tone="warning" role="status">{providerMessage}</Notice>}
          {serviceError && <ServiceNotice code={serviceError} />}
          {phase === 'form' && (
            <>
              <div className="auth-form__actions">
                <Button type="button" variant="secondary" busy={busy && busyAction === 'google'} disabled={(busy && busyAction !== 'google') || Boolean(unknownAction)} onClick={() => void startGoogle()}>
                  {text.google}
                </Button>
              </div>
              <p className="auth-muted">{text.googlePreview}</p>
              <p className="auth-muted">{text.googleSeparator}</p>
            </>
          )}
          <TextField
            id="registration-email"
            label={text.email}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value)
              setEmailError(false)
              retryAttemptRef.current = null
              setRetryAvailable(false)
            }}
            error={emailError ? text.invalidEmail : undefined}
            required
          />
          <div className="auth-stack">
            <TextField
              id="registration-password"
              label={text.password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(event) => {
                setPassword(event.currentTarget.value)
                setPasswordError(false)
                retryAttemptRef.current = null
                setRetryAvailable(false)
              }}
              hint={text.passwordHint}
              error={passwordError ? (password.length === 0 ? text.missingPassword : text.shortPassword) : undefined}
              required
            />
            <div className="auth-form__links">
              <Button
                className="auth-password-toggle"
                type="button"
                variant="ghost"
                size="small"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? text.hidePassword : text.showPassword}
              </Button>
            </div>
          </div>
          <div className="auth-form__actions">
            <Button type="submit" busy={busy && (busyAction === 'start' || busyAction === 'correct-email')} disabled={(busy && busyAction !== 'start' && busyAction !== 'correct-email') || Boolean(unknownAction)}>
              {busy ? (phase === 'correcting' ? text.correcting : text.creating) : phase === 'correcting' ? text.correct : text.create}
            </Button>
            {unknownAction && (
              <Button type="button" variant="secondary" busy={busy && busyAction === 'status'} disabled={busy && busyAction !== 'status'} onClick={submitFromStatus}>
                {text.checkStatus}
              </Button>
            )}
          </div>
          {phase === 'form' && (
            <p className="auth-muted">{text.existingAccount} <AppLink className="auth-link" route={routes.signIn(intent)}>{text.signIn}</AppLink></p>
          )}
        </form>
      )}

      {showCodeForm && pending && (
        <div className="auth-form">
          <header className="auth-stack">
            <h2>{text.checkEmail}</h2>
            <p>{text.codeDescription(pending.email)}</p>
          </header>
          {pending.scenarioCode?.note === 'synthetic-mock-scenario' && (
            <Notice>{text.localCode(pending.scenarioCode.value)}</Notice>
          )}
          {statusNotice}
          {serviceError && <ServiceNotice code={serviceError} />}
          <OtpInput
            id="registration-code"
            label={text.codeLabel}
            value={code}
            onChange={(value) => {
              setCode(value)
              setCodeError(false)
              setServiceError(null)
              retryAttemptRef.current = null
              setRetryAvailable(false)
              if (value.length !== 6) lastSubmittedCodeRef.current = null
            }}
            disabled={busy || Boolean(unknownAction) || isExpired}
            invalid={codeError}
            errorMessageId={codeError ? 'registration-code-error' : undefined}
            inputRef={codeRef}
          />
          {codeError && <p id="registration-code-error" className="field__error" role="alert">{text.codeInvalid}</p>}
          {isExpired
            ? <Notice tone="warning" role="status">{text.codeExpired}</Notice>
            : <p className="auth-muted">{text.codeExpiresIn(formatRemaining(expiryRemaining, props.locale))}</p>}
          {pending.resendCount > 0 && <p className="auth-muted">{text.resendCount(pending.resendCount)}</p>}
          <p className="auth-muted">{text.remainingSends(pending.remainingSends)}</p>
          <div className="auth-form__actions">
            <Button type="button" busy={busy && busyAction === 'resend'} disabled={(busy && busyAction !== 'resend') || Boolean(unknownAction) || resendRemaining > 0 || pending.remainingSends <= 0} onClick={resendCode}>
              {resendRemaining > 0
                ? text.resendIn(formatRemaining(resendRemaining, props.locale))
                : isExpired ? text.requestNewCode : text.resend}
            </Button>
            <Button type="button" variant="secondary" disabled={busy || Boolean(unknownAction)} onClick={changeEmailFromExpired}>
              {text.changeEmail}
            </Button>
            {unknownAction && (
              <Button type="button" variant="secondary" busy={busy && busyAction === 'status'} disabled={busy && busyAction !== 'status'} onClick={submitFromStatus}>
                {text.checkStatus}
              </Button>
            )}
            {retryAvailable && (
              <Button type="button" variant="secondary" busy={busy && busyAction === 'verify'} disabled={(busy && busyAction !== 'verify') || code.length !== 6} onClick={() => void verifyCode(code)}>
                {text.retryVerify}
              </Button>
            )}
          </div>
        </div>
      )}

      {phase === 'collision' && (
        <div className="auth-form">
          <h2>{text.collisionTitle}</h2>
          <p>{text.collisionDescription}</p>
          <div className="auth-form__actions">
            <AppLink className="auth-link" route={routes.signIn(intent)}>{text.signIn}</AppLink>
            <AppLink className="auth-link" route={routes.passwordReset(intent)}>{text.resetPassword}</AppLink>
          </div>
        </div>
      )}

      {phase === 'success' && (
        <div className="auth-form">
          {completion && (
            <Notice tone="success" role="status">
              {completion.kind === 'email' && completion.outcome === 'password-method-added'
                ? text.passwordAdded
                : completion.welcomeGrantApplied ? text.welcomeCredits : text.accountReady}
            </Notice>
          )}
          {localizedStatusMessage && localizedStatusMessage !== (completion?.welcomeGrantApplied ? text.welcomeCredits : text.accountReady) && (
            <Notice tone="warning" role="status">{localizedStatusMessage}</Notice>
          )}
          <Button type="button" busy={busy && busyAction === 'continue'} disabled={busy && busyAction !== 'continue'} onClick={() => void continueToDestination()}>{text.continueToNewDub}</Button>
        </div>
      )}
    </AuthLayout>
  )
}

export default RegistrationScreen
