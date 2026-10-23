import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { routeForSignInIntent, routes } from '../../app/routes'
import { AppLink } from '../../app/AppLink'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type { OperationId, PendingVerification, ServiceResult, SignInIntent } from '../../services/contracts'
import {
  clearPendingAuthReference,
  formatRemaining,
  isValidEmail,
  newOperationId,
  normalizeEmail,
  passwordResetStorageKey,
  readPendingAuthReference,
  serviceProblemCode,
  storePendingAuthReference,
  type PendingAuthReference,
} from './auth-utils'
import { AuthLayout } from './AuthLayout'
import OtpInput from './OtpInput'
import type { ServiceProblemCode } from '../../i18n/service-errors'

type Phase = 'request' | 'checking' | 'code' | 'password' | 'expired' | 'unknown' | 'completed'
type Action = 'start' | 'verify' | 'resend' | 'complete'
type BusyAction = 'restore' | Action | 'status' | 'continue'
type StatusKey = 'checking' | 'neutral' | 'codeUnconfirmed' | 'codeVerified' | 'unknown' | 'notStarted' | 'expired' | 'changed' | 'sessionUnconfirmed'
type RetryAttempt = { kind: Action; operationId: OperationId; password?: string }

type Copy = {
  title: string
  description: string
  email: string
  invalidEmail: string
  send: string
  sending: string
  neutral: string
  codeTitle: string
  codeDescription: string
  codeLabel: string
  codeInvalid: string
  codeUnconfirmed: string
  codeVerified: string
  resend: string
  requestAnother: string
  resendIn: (time: string) => string
  resendAvailable: string
  passwordTitle: string
  passwordDescription: string
  newPassword: string
  repeatPassword: string
  passwordHint: string
  passwordRequired: string
  passwordShort: string
  passwordMismatch: string
  savePassword: string
  savingPassword: string
  checking: string
  unknown: string
  checkStatus: string
  notStarted: string
  expired: string
  changed: string
  sessionUnconfirmed: string
  continue: string
  backToSignIn: string
  localCode: (value: string) => string
}

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'Reset your password',
    description: 'Enter the email address associated with your account.',
    email: 'Email',
    invalidEmail: 'Enter a valid email address.',
    send: 'Send reset email',
    sending: 'Sending…',
    neutral: 'If an account with this email exists, we sent a code.',
    codeTitle: 'Check your email',
    codeDescription: 'Enter the six-digit reset code for {email}.',
    codeLabel: '6-digit reset code',
    codeInvalid: 'That code could not be verified. Keep it here, or request a new one when available.',
    codeUnconfirmed: 'No reset code has been confirmed. Check the request status before entering another code.',
    codeVerified: 'Code verified. Choose a new password.',
    resend: 'Resend code',
    requestAnother: 'Request another email',
    resendIn: (time) => `Resend available in ${time}`,
    resendAvailable: 'A new code can be requested now.',
    passwordTitle: 'Choose a new password',
    passwordDescription: 'Use at least 8 characters. Your password is not saved in this browser.',
    newPassword: 'New password',
    repeatPassword: 'Repeat new password',
    passwordHint: 'At least 8 characters.',
    passwordRequired: 'Enter a new password.',
    passwordShort: 'Use at least 8 characters.',
    passwordMismatch: 'The passwords do not match.',
    savePassword: 'Save new password',
    savingPassword: 'Saving password…',
    checking: 'Checking reset status…',
    unknown: 'We could not confirm the last step. Check its status before trying again.',
    checkStatus: 'Check reset status',
    notStarted: 'No reset request was found. You can request one again.',
    expired: 'This reset code or request has expired. Request another email or return to sign in.',
    changed: 'Your password has been changed.',
    sessionUnconfirmed: 'Your password change is confirmed. We are still confirming the current session and destination.',
    continue: 'Continue',
    backToSignIn: 'Back to sign in',
    localCode: (value) => `Local mock code: ${value}. No email was sent.`,
  },
  ru: {
    title: 'Сбросить пароль',
    description: 'Введите email, связанный с аккаунтом.',
    email: 'Электронная почта',
    invalidEmail: 'Введите корректный email.',
    send: 'Отправить письмо для сброса',
    sending: 'Отправляем…',
    neutral: 'Если аккаунт с таким email существует, мы отправили код.',
    codeTitle: 'Проверьте почту',
    codeDescription: 'Введите шестизначный код сброса для {email}.',
    codeLabel: '6-значный код сброса',
    codeInvalid: 'Не удалось подтвердить этот код. Он сохранён в поле; при необходимости запросите новый.',
    codeUnconfirmed: 'Код сброса не подтверждён. Проверьте состояние запроса перед повторным вводом кода.',
    codeVerified: 'Код подтверждён. Задайте новый пароль.',
    resend: 'Отправить код ещё раз',
    requestAnother: 'Запросить другое письмо',
    resendIn: (time) => `Повторный запрос доступен через ${time}`,
    resendAvailable: 'Сейчас можно запросить новый код.',
    passwordTitle: 'Задайте новый пароль',
    passwordDescription: 'Используйте не менее 8 символов. Пароль не сохраняется в браузере.',
    newPassword: 'Новый пароль',
    repeatPassword: 'Повторите новый пароль',
    passwordHint: 'Не менее 8 символов.',
    passwordRequired: 'Введите новый пароль.',
    passwordShort: 'Используйте не менее 8 символов.',
    passwordMismatch: 'Пароли не совпадают.',
    savePassword: 'Сохранить новый пароль',
    savingPassword: 'Сохраняем пароль…',
    checking: 'Проверяем состояние сброса…',
    unknown: 'Не удалось подтвердить последний шаг. Проверьте его состояние перед повторной попыткой.',
    checkStatus: 'Проверить состояние сброса',
    notStarted: 'Запрос на сброс не найден. Вы можете запросить его ещё раз.',
    expired: 'Срок действия кода или запроса истёк. Запросите другое письмо или вернитесь ко входу.',
    changed: 'Пароль изменён.',
    sessionUnconfirmed: 'Изменение пароля подтверждено. Проверяем текущую сессию и адрес перехода.',
    continue: 'Продолжить',
    backToSignIn: 'Вернуться ко входу',
    localCode: (value) => `Локальный код-мок: ${value}. Письмо не отправлялось.`,
  },
}

function codeFor<T>(result: Exclude<ServiceResult<T>, { status: 'ok' }>): ServiceProblemCode {
  return serviceProblemCode(result)
}

function returnIntentFor(route: FeatureScreenProps['route'], fallback: SignInIntent): SignInIntent {
  return route.kind === 'password-reset' ? route.intent : fallback
}

function referenceFor(requestId: OperationId, email: string, pendingOperationId: OperationId | undefined, intent: SignInIntent): PendingAuthReference {
  return {
    version: 1,
    requestId,
    ...(pendingOperationId ? { pendingOperationId } : {}),
    email: normalizeEmail(email),
    ...(intent.kind === 'resume-project-screen' ? { intent } : {}),
  }
}

export function PasswordResetScreen(props: FeatureScreenProps) {
  const [initialReference] = useState(() => readPendingAuthReference(passwordResetStorageKey))
  const [intent] = useState(() => initialReference?.intent ?? returnIntentFor(props.route, props.signInIntent))
  const text = copy[props.locale]
  const [phase, setPhase] = useState<Phase>(initialReference ? 'checking' : 'request')
  const [email, setEmail] = useState(initialReference?.email ?? '')
  const [emailError, setEmailError] = useState(false)
  const [pending, setPending] = useState<PendingVerification | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [mockCode, setMockCode] = useState<string | null>(null)
  const [resetGrant, setResetGrant] = useState<{ id: OperationId; expiresAt: number } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [repeatError, setRepeatError] = useState<string | null>(null)
  const [serviceError, setServiceError] = useState<ServiceProblemCode | null>(null)
  const [statusKey, setStatusKey] = useState<StatusKey | null>(initialReference ? 'checking' : null)
  const statusMessage = statusKey ? text[statusKey] : ''
  const [unknownAction, setUnknownAction] = useState<Action | null>(null)
  const [completedDestination, setCompletedDestination] = useState<SignInIntent | null>(null)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const codeRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const recoveryAttempted = useRef(false)
  const referenceRef = useRef<PendingAuthReference | null>(initialReference)
  const retryAttemptRef = useRef<RetryAttempt | null>(null)
  const lastVerifiedCodeRef = useRef<string | null>(null)
  const retryCompletionPasswordRef = useRef<string | null>(null)

  const remember = (requestId: OperationId, emailValue: string, pendingOperationId?: OperationId) => {
    const reference = referenceFor(requestId, emailValue, pendingOperationId, intent)
    referenceRef.current = reference
    storePendingAuthReference(passwordResetStorageKey, reference)
    return reference
  }

  const forget = () => {
    referenceRef.current = null
    clearPendingAuthReference(passwordResetStorageKey)
  }

  const showPending = (verification: PendingVerification, emailValue: string, message: StatusKey = 'neutral') => {
    setPending(verification)
    setResetGrant(null)
    setPhase('code')
    setCode('')
    setCodeError(false)
    setMockCode(verification.scenarioCode?.value ?? null)
    setStatusKey(message)
    setServiceError(null)
    setUnknownAction(null)
    setCompletedDestination(null)
    lastVerifiedCodeRef.current = null
    retryAttemptRef.current = null
    retryCompletionPasswordRef.current = null
    remember(verification.id, emailValue)
  }

  const showVerified = (id: OperationId, expiresAt: number, emailValue: string) => {
    setResetGrant({ id, expiresAt })
    setPhase('password')
    setCode('')
    setCodeError(false)
    setMockCode(null)
    setStatusKey('codeVerified')
    setServiceError(null)
    setUnknownAction(null)
    retryAttemptRef.current = null
    retryCompletionPasswordRef.current = null
    const reference = referenceRef.current
    remember(reference?.requestId ?? initialReference?.requestId ?? id, emailValue)
  }

  const continueToDestination = async (destination: SignInIntent) => {
    setCompletedDestination(destination)
    try {
      const current = await props.refreshIdentity()
      if (current.status !== 'signed-in') {
        setPhase('completed')
        setStatusKey('sessionUnconfirmed')
        return false
      }
      const navigated = await props.navigate(routeForSignInIntent(destination), { replace: true })
      if (!navigated) {
        setPhase('completed')
        setStatusKey('sessionUnconfirmed')
        return false
      }
      forget()
      setPhase('completed')
      setStatusKey('changed')
      return true
    } catch {
      setPhase('completed')
      setStatusKey('sessionUnconfirmed')
      return false
    }
  }

  const resolveRequest = async (reference: PendingAuthReference, action: Action | null) => {
    const result = await props.services.passwordReset.resolve({ requestId: reference.requestId })
    if (result.status !== 'ok') {
      setPhase('unknown')
      setServiceError(codeFor(result))
      setStatusKey('unknown')
      return
    }

    setServiceError(null)
    const state = result.data
    if ('id' in state) {
      const message = action === 'verify' ? 'codeUnconfirmed' : 'neutral'
      showPending(state, reference.email, message)
      if (action === 'verify') setCode(referenceRef.current?.requestId === reference.requestId ? code : '')
      return
    }
    if (state.state === 'verified') {
      const completionRetry = action === 'complete' && retryAttemptRef.current?.kind === 'complete'
        ? retryAttemptRef.current
        : null
      const completionPassword = completionRetry ? retryCompletionPasswordRef.current : null
      showVerified(state.resetGrantId, state.expiresAt, reference.email)
      if (completionRetry && completionPassword !== null) {
        retryAttemptRef.current = completionRetry
        retryCompletionPasswordRef.current = completionPassword
        remember(reference.requestId, reference.email, completionRetry.operationId)
      }
      return
    }
    if (state.state === 'completed') {
      await continueToDestination(state.destination)
      return
    }
    if (state.state === 'expired') {
      setPhase('expired')
      setResetGrant(null)
      setMockCode(null)
      setStatusKey('expired')
      setUnknownAction(null)
      remember(reference.requestId, reference.email)
      return
    }

    if (action === 'start' && reference.pendingOperationId) {
      retryAttemptRef.current = { kind: 'start', operationId: reference.pendingOperationId }
      remember(reference.requestId, reference.email, reference.pendingOperationId)
    } else {
      retryAttemptRef.current = null
      forget()
    }
    setPending(null)
    setResetGrant(null)
    setMockCode(null)
    setPhase('request')
    setStatusKey(action === 'start' ? 'notStarted' : 'neutral')
    setUnknownAction(null)
  }

  useEffect(() => {
    if (!initialReference || recoveryAttempted.current) return
    recoveryAttempted.current = true
    busyRef.current = true
    setBusyAction('restore')
    setBusy(true)
    void resolveRequest(initialReference, null).catch(() => {
      setPhase('unknown')
      setStatusKey('unknown')
      setServiceError('storage-unavailable')
    }).finally(() => {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    })
  }, [initialReference, props.services.passwordReset, text])

  useEffect(() => {
    if (phase !== 'code' || !pending) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= pending.expiresAt && !busyRef.current) {
        setPhase('expired')
        setStatusKey('expired')
        setCodeError(false)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [pending, phase, text.expired])

  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current) return
    const normalized = normalizeEmail(email)
    if (!isValidEmail(normalized)) {
      setEmailError(true)
      document.getElementById('password-reset-email')?.focus()
      return
    }

    busyRef.current = true
    setBusyAction('start')
    setBusy(true)
    setEmail(normalized)
    setEmailError(false)
    setServiceError(null)
    setStatusKey(null)
    const retry = retryAttemptRef.current?.kind === 'start' ? retryAttemptRef.current : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    const reference = remember(operationId, normalized, operationId)
    try {
      const result = await props.services.passwordReset.start({
        email: normalized,
        ...(intent.kind === 'resume-project-screen' ? { returnIntent: intent } : {}),
        operationId,
      })
      if (result.status === 'ok') {
        showPending(result.data, normalized)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        remember(reference.requestId, normalized, operationId)
        setUnknownAction('start')
        setPhase('unknown')
        setStatusKey('unknown')
      } else {
        if (result.status === 'error' && result.error.retry === 'same-operation') {
          retryAttemptRef.current = { kind: 'start', operationId }
          remember(reference.requestId, normalized, operationId)
        } else {
          forget()
        }
        setServiceError(codeFor(result))
        setPhase('request')
      }
    } catch {
      remember(reference.requestId, normalized, operationId)
      setUnknownAction('start')
      setPhase('unknown')
      setStatusKey('unknown')
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const verifyCode = async (value: string) => {
    const requestId = pending?.id ?? referenceRef.current?.requestId
    if (value.length !== 6 || !requestId || busyRef.current || phase !== 'code') return
    busyRef.current = true
    setBusyAction('verify')
    setBusy(true)
    setServiceError(null)
    setCodeError(false)
    setStatusKey(null)
    lastVerifiedCodeRef.current = value
    const retry = retryAttemptRef.current?.kind === 'verify' ? retryAttemptRef.current : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    remember(requestId, email, operationId)
    try {
      const result = await props.services.passwordReset.verify({ requestId, code: value, operationId })
      if (result.status === 'ok') {
        showVerified(result.data.resetGrantId, result.data.expiresAt, email)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setUnknownAction('verify')
        setPhase('unknown')
        setStatusKey('unknown')
      } else if (result.status === 'error' && result.error.code === 'invalid-code') {
        setPhase('code')
        setCodeError(true)
        setStatusKey(null)
        window.requestAnimationFrame(() => codeRef.current?.select())
      } else if (result.status === 'error' && result.error.code === 'expired') {
        retryAttemptRef.current = null
        setPhase('expired')
        setStatusKey('expired')
      } else {
        if (result.status === 'error' && result.error.retry === 'same-operation') {
          retryAttemptRef.current = { kind: 'verify', operationId }
        }
        setServiceError(codeFor(result))
        setPhase('code')
      }
    } catch {
      setUnknownAction('verify')
      setPhase('unknown')
      setStatusKey('unknown')
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const resendCode = async () => {
    const reference = referenceRef.current
    const requestId = pending?.id ?? reference?.requestId
    if (!requestId || busyRef.current) return
    busyRef.current = true
    setBusyAction('resend')
    setBusy(true)
    setServiceError(null)
    const retry = retryAttemptRef.current?.kind === 'resend' ? retryAttemptRef.current : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    remember(requestId, email || reference?.email || '', operationId)
    try {
      const result = await props.services.passwordReset.resend({ requestId, operationId })
      if (result.status === 'ok') {
        showPending(result.data, email || reference?.email || '')
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setUnknownAction('resend')
        setPhase('unknown')
        setStatusKey('unknown')
      } else {
        if (result.status === 'error' && result.error.retry === 'same-operation') {
          retryAttemptRef.current = { kind: 'resend', operationId }
        }
        setServiceError(codeFor(result))
        if (result.status === 'error' && result.error.code === 'expired') setPhase('expired')
      }
    } catch {
      setUnknownAction('resend')
      setPhase('unknown')
      setStatusKey('unknown')
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const saveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current || !resetGrant) return
    setPasswordError(null)
    setRepeatError(null)
    if (!newPassword) {
      setPasswordError(text.passwordRequired)
      document.getElementById('password-reset-new-password')?.focus()
      return
    }
    if (newPassword.length < 8) {
      setPasswordError(text.passwordShort)
      document.getElementById('password-reset-new-password')?.focus()
      return
    }
    if (newPassword !== repeatPassword) {
      setRepeatError(text.passwordMismatch)
      document.getElementById('password-reset-repeat-password')?.focus()
      return
    }
    if (resetGrant.expiresAt <= Date.now()) {
      setPhase('expired')
      setStatusKey('expired')
      return
    }

    busyRef.current = true
    setBusyAction('complete')
    setBusy(true)
    setServiceError(null)
    setStatusKey(null)
    const requestId = referenceRef.current?.requestId ?? initialReference?.requestId
    if (!requestId) {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
      setPhase('expired')
      setStatusKey('expired')
      return
    }
    const retry = retryAttemptRef.current?.kind === 'complete'
      && retryCompletionPasswordRef.current === newPassword
      ? retryAttemptRef.current
      : null
    const operationId = retry?.operationId ?? newOperationId()
    retryAttemptRef.current = null
    retryCompletionPasswordRef.current = null
    remember(requestId, email, operationId)
    try {
      const result = await props.services.passwordReset.complete({
        resetGrantId: resetGrant.id,
        newPassword,
        operationId,
      })
      if (result.status === 'ok') {
        await continueToDestination(result.data.destination)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        const retryOperationId = result.status === 'unknown' ? result.operationId : operationId
        retryAttemptRef.current = { kind: 'complete', operationId: retryOperationId, password: newPassword }
        retryCompletionPasswordRef.current = newPassword
        remember(requestId, email, retryOperationId)
        setUnknownAction('complete')
        setPhase('unknown')
        setStatusKey('unknown')
      } else {
        if (result.status === 'error' && result.error.retry === 'same-operation') {
          retryAttemptRef.current = { kind: 'complete', operationId, password: newPassword }
          retryCompletionPasswordRef.current = newPassword
        }
        setServiceError(codeFor(result))
        if (result.status === 'error' && result.error.code === 'expired') {
          setPhase('expired')
          setStatusKey('expired')
        } else {
          setPhase('password')
        }
      }
    } catch {
      retryAttemptRef.current = { kind: 'complete', operationId, password: newPassword }
      retryCompletionPasswordRef.current = newPassword
      setUnknownAction('complete')
      setPhase('unknown')
      setStatusKey('unknown')
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const checkStatus = async () => {
    const reference = referenceRef.current ?? readPendingAuthReference(passwordResetStorageKey)
    if (!reference || busyRef.current) return
    busyRef.current = true
    setBusyAction('status')
    setBusy(true)
    setPhase('checking')
    setServiceError(null)
    setStatusKey('checking')
    try {
      await resolveRequest(reference, unknownAction)
    } catch {
      setPhase('unknown')
      setStatusKey('unknown')
      setServiceError('storage-unavailable')
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const continueAfterCompletion = async () => {
    if (!completedDestination || busyRef.current) return
    busyRef.current = true
    setBusyAction('continue')
    setBusy(true)
    setServiceError(null)
    try {
      await continueToDestination(completedDestination)
    } finally {
      busyRef.current = false
      setBusy(false)
      setBusyAction(null)
    }
  }

  const onCodeChange = (value: string) => {
    setCode(value)
    setCodeError(false)
    setServiceError(null)
    if (value.length < 6) {
      lastVerifiedCodeRef.current = null
      if (retryAttemptRef.current?.kind === 'verify') retryAttemptRef.current = null
    }
    if (value.length === 6 && value !== lastVerifiedCodeRef.current) void verifyCode(value)
  }

  const resendRemaining = pending ? Math.max(0, pending.resendAvailableAt - now) : 0
  const resendReady = resendRemaining === 0
  const backLink = <p className="auth-muted"><AppLink className="auth-link" route={routes.signIn(intent)}>{text.backToSignIn}</AppLink></p>

  return (
    <AuthLayout title={phase === 'code' ? text.codeTitle : phase === 'password' ? text.passwordTitle : text.title} description={phase === 'code' ? text.codeDescription.replace('{email}', email) : phase === 'password' ? text.passwordDescription : text.description}>
      {phase === 'checking' && (
        <div className="auth-form">
          <Notice role="status">{text.checking}</Notice>
          {serviceError && <ServiceNotice code={serviceError} />}
        </div>
      )}

      {phase === 'request' && (
        <form className="auth-form" onSubmit={(event) => void requestReset(event)} noValidate>
          {statusMessage && <Notice role="status">{statusMessage}</Notice>}
          <TextField
            id="password-reset-email"
            label={text.email}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.currentTarget.value)
              setEmailError(false)
              setServiceError(null)
              if (retryAttemptRef.current?.kind === 'start') retryAttemptRef.current = null
            }}
            error={emailError ? text.invalidEmail : undefined}
            required
          />
          {serviceError && <ServiceNotice code={serviceError} />}
          <div className="auth-form__actions">
            <Button type="submit" busy={busy && busyAction === 'start'} disabled={busy && busyAction !== 'start'}>{busy ? text.sending : text.send}</Button>
            {backLink}
          </div>
        </form>
      )}

      {phase === 'code' && (
        <div className="auth-form">
          <Notice role="status">{text.neutral}</Notice>
          <p className="auth-muted">{text.codeDescription.replace('{email}', email)}</p>
          {mockCode && <Notice role="status">{text.localCode(mockCode)}</Notice>}
          <OtpInput
            label={text.codeLabel}
            value={code}
            onChange={onCodeChange}
            disabled={busy}
            invalid={codeError}
            errorMessageId={codeError ? 'password-reset-code-error' : undefined}
            inputRef={codeRef}
          />
          {codeError && <p id="password-reset-code-error" className="field__error" role="alert">{text.codeInvalid}</p>}
          {serviceError && <ServiceNotice code={serviceError} />}
          {statusMessage && statusKey !== 'neutral' && <Notice role="status">{statusMessage}</Notice>}
          <p className="auth-muted" role="status">{resendReady ? text.resendAvailable : text.resendIn(formatRemaining(resendRemaining, props.locale))}</p>
          <div className="auth-form__actions">
            <Button type="button" variant="secondary" busy={busy && busyAction === 'resend'} disabled={(busy && busyAction !== 'resend') || !resendReady} onClick={() => void resendCode()}>{text.resend}</Button>
            {unknownAction && <Button type="button" busy={busy && busyAction === 'status'} disabled={busy && busyAction !== 'status'} onClick={() => void checkStatus()}>{text.checkStatus}</Button>}
            {backLink}
          </div>
        </div>
      )}

      {phase === 'password' && (
        <form className="auth-form" onSubmit={(event) => void saveNewPassword(event)} noValidate>
          {statusMessage && <Notice role="status">{statusMessage}</Notice>}
          <div className="auth-stack">
            <TextField
              id="password-reset-new-password"
              label={text.newPassword}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.currentTarget.value)
                setPasswordError(null)
                if (retryAttemptRef.current?.kind === 'complete') {
                  retryAttemptRef.current = null
                  retryCompletionPasswordRef.current = null
                }
              }}
              hint={text.passwordHint}
              error={passwordError ?? undefined}
              required
            />
            <TextField
              id="password-reset-repeat-password"
              label={text.repeatPassword}
              type="password"
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(event) => { setRepeatPassword(event.currentTarget.value); setRepeatError(null) }}
              error={repeatError ?? undefined}
              required
            />
          </div>
          {serviceError && <ServiceNotice code={serviceError} />}
          <div className="auth-form__actions">
            <Button type="submit" busy={busy && busyAction === 'complete'} disabled={busy && busyAction !== 'complete'}>{busy ? text.savingPassword : text.savePassword}</Button>
            {unknownAction && <Button type="button" variant="secondary" busy={busy && busyAction === 'status'} disabled={busy && busyAction !== 'status'} onClick={() => void checkStatus()}>{text.checkStatus}</Button>}
            {backLink}
          </div>
        </form>
      )}

      {phase === 'expired' && (
        <div className="auth-form">
          <Notice tone="warning" role="status">{statusMessage || text.expired}</Notice>
          {serviceError && <ServiceNotice code={serviceError} />}
          <div className="auth-form__actions">
            <Button type="button" busy={busy && busyAction === 'resend'} disabled={(busy && busyAction !== 'resend') || !resendReady} onClick={() => void resendCode()}>
              {pending && !resendReady ? text.resendIn(formatRemaining(resendRemaining, props.locale)) : text.requestAnother}
            </Button>
            {backLink}
          </div>
        </div>
      )}

      {phase === 'unknown' && (
        <div className="auth-form">
          <Notice tone="warning" role="status">{statusMessage || text.unknown}</Notice>
          {serviceError && <ServiceNotice code={serviceError} />}
          <div className="auth-form__actions">
            <Button type="button" busy={busy && busyAction === 'status'} disabled={busy && busyAction !== 'status'} onClick={() => void checkStatus()}>{busy ? text.checking : text.checkStatus}</Button>
            {backLink}
          </div>
        </div>
      )}

      {phase === 'completed' && (
        <div className="auth-form">
          <Notice tone="success" role="status">{statusMessage || text.changed}</Notice>
          {completedDestination && <Button type="button" busy={busy && busyAction === 'continue'} disabled={busy && busyAction !== 'continue'} onClick={() => void continueAfterCompletion()}>{text.continue}</Button>}
          {serviceError && <ServiceNotice code={serviceError} />}
        </div>
      )}
    </AuthLayout>
  )
}

export default PasswordResetScreen
