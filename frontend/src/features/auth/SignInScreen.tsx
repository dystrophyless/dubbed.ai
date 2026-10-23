import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { FeatureScreenProps, IdentityState } from '../../app/screen-contract'
import { routeForSignInIntent, routes } from '../../app/routes'
import { AppLink } from '../../app/AppLink'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type { GoogleIdentityResult, OperationSnapshot, ServiceResult, SignInIntent } from '../../services/contracts'
import { isValidEmail, newOperationId, normalizeEmail, readPendingAuthReference, serviceProblemCode, signInStorageKey, storePendingAuthReference, clearPendingAuthReference, type PendingAuthReference } from './auth-utils'
import { AuthLayout } from './AuthLayout'
import type { ServiceProblemCode } from '../../i18n/service-errors'

type Copy = {
  title: string
  description: string
  email: string
  password: string
  passwordVisibility: string
  showPassword: string
  hidePassword: string
  forgotPassword: string
  submit: string
  submitting: string
  noAccount: string
  register: string
  continueGoogle: string
  separator: string
  googleMockDescription: string
  googleCanceled: string
  googleDenied: string
  googleLinkRequired: string
  googleAccountNotFound: string
  invalidCredentials: string
  invalidEmail: string
  requiredPassword: string
  checkingStatus: string
  operationPending: string
  checkStatus: string
  notStarted: string
  sessionUnconfirmed: string
  generic: string
}

type SignInStatusKey = 'checkingStatus' | 'sessionUnconfirmed' | 'generic' | 'notStarted' | 'operationPending'
type ProviderNoticeKey = 'googleCanceled' | 'googleDenied' | 'googleLinkRequired' | 'googleAccountNotFound'

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'Sign in',
    description: 'Use your email and password to continue.',
    email: 'Email',
    password: 'Password',
    passwordVisibility: 'Password visibility',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    forgotPassword: 'Forgot password?',
    submit: 'Sign in',
    submitting: 'Signing in…',
    noAccount: 'New to Dubbed?',
    register: 'Create an account',
    continueGoogle: 'Continue with Google',
    separator: 'or',
    googleMockDescription: 'Local mock only. This does not contact Google.',
    googleCanceled: 'Google sign-in was canceled. No account changes were made.',
    googleDenied: 'Google sign-in was denied. No account changes were made.',
    googleLinkRequired: 'This Google profile needs a manual link. Sign in with an existing method, then start linking from Account.',
    googleAccountNotFound: 'No account is linked to this Google profile. Create an account to continue.',
    invalidCredentials: 'Incorrect email or password',
    invalidEmail: 'Enter a valid email address.',
    requiredPassword: 'Enter your password.',
    checkingStatus: 'Checking sign-in status…',
    operationPending: 'Sign-in is still being confirmed. Check its status before trying again.',
    checkStatus: 'Check sign-in status',
    notStarted: 'No sign-in was recorded. Enter your password to try again.',
    sessionUnconfirmed: 'The service response arrived, but the current session could not be confirmed yet.',
    generic: 'Sign-in could not be confirmed. Check the status before trying again.',
  },
  ru: {
    title: 'Войти',
    description: 'Продолжите с помощью email и пароля.',
    email: 'Электронная почта',
    password: 'Пароль',
    passwordVisibility: 'Видимость пароля',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    forgotPassword: 'Забыли пароль?',
    submit: 'Войти',
    submitting: 'Входим…',
    noAccount: 'Впервые в Dubbed?',
    register: 'Создать аккаунт',
    continueGoogle: 'Продолжить с Google',
    separator: 'или',
    googleMockDescription: 'Только локальная имитация. Подключения к Google нет.',
    googleCanceled: 'Вход через Google отменён. Аккаунт не изменён.',
    googleDenied: 'Google отклонил вход. Аккаунт не изменён.',
    googleLinkRequired: 'Для этого профиля Google нужно вручную связать методы. Войдите текущим способом и начните привязку в аккаунте.',
    googleAccountNotFound: 'К этому профилю Google не привязан аккаунт. Создайте аккаунт, чтобы продолжить.',
    invalidCredentials: 'Неверный email или пароль',
    invalidEmail: 'Введите корректный email.',
    requiredPassword: 'Введите пароль.',
    checkingStatus: 'Проверяем состояние входа…',
    operationPending: 'Вход ещё подтверждается. Проверьте его состояние перед повторной попыткой.',
    checkStatus: 'Проверить состояние входа',
    notStarted: 'Вход не был выполнен. Введите пароль и попробуйте ещё раз.',
    sessionUnconfirmed: 'Ответ получен, но текущую сессию пока не удалось подтвердить.',
    generic: 'Не удалось подтвердить вход. Проверьте состояние перед повторной попыткой.',
  },
}

function codeFor<T>(result: Exclude<ServiceResult<T>, { status: 'ok' }>): ServiceProblemCode {
  return serviceProblemCode(result)
}

function isGoogleSignInResult(value: unknown): value is GoogleIdentityResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<GoogleIdentityResult>
  return candidate.purpose === 'sign-in' && (
    candidate.state === 'completed' || candidate.state === 'canceled' || candidate.state === 'denied' ||
    candidate.state === 'conflict' || candidate.state === 'link-required' || candidate.state === 'account-not-found'
  )
}

export function SignInScreen(props: FeatureScreenProps) {
  const intent = props.route.kind === 'sign-in' ? props.route.intent : props.signInIntent
  const text = copy[props.locale]
  const { navigate, refreshIdentity } = props
  const identityStatus = props.identity.status
  const operationService = props.services.operations
  const [savedAttempt] = useState(() => readPendingAuthReference(signInStorageKey))
  const [email, setEmail] = useState(savedAttempt?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [busyAction, setBusyAction] = useState<'password' | 'google' | 'status' | null>(null)
  const [credentialsInvalid, setCredentialsInvalid] = useState(false)
  const [emailError, setEmailError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [serviceError, setServiceError] = useState<ServiceProblemCode | null>(null)
  const [unknownOperationId, setUnknownOperationId] = useState(savedAttempt?.pendingOperationId ?? null)
  const [statusKey, setStatusKey] = useState<SignInStatusKey | null>(savedAttempt ? 'checkingStatus' : null)
  const [providerNoteKey, setProviderNoteKey] = useState<ProviderNoticeKey | null>(null)
  const statusMessage = statusKey ? text[statusKey] : ''
  const busyRef = useRef(false)
  const recoveryAttempted = useRef(false)

  const finishSignIn = useCallback(async (destination: SignInIntent, operationId: ReturnType<typeof newOperationId>) => {
    const nextIdentity: IdentityState = await refreshIdentity()
    if (nextIdentity.status !== 'signed-in') {
      setUnknownOperationId(operationId)
      setStatusKey('sessionUnconfirmed')
      return false
    }
    const didNavigate = await navigate(routeForSignInIntent(destination), { replace: true })
    if (!didNavigate) {
      setUnknownOperationId(operationId)
      setStatusKey('sessionUnconfirmed')
      return false
    }
    clearPendingAuthReference(signInStorageKey)
    setUnknownOperationId(null)
    setStatusKey(null)
    return true
  }, [navigate, refreshIdentity])

  const handleGoogleResult = useCallback(async (result: GoogleIdentityResult, operationId: ReturnType<typeof newOperationId>) => {
    if (result.purpose !== 'sign-in') {
      setUnknownOperationId(operationId)
      setStatusKey('generic')
      return false
    }
    if (result.state === 'completed') {
      if (!result.account || !result.session) {
        setUnknownOperationId(operationId)
        setStatusKey('sessionUnconfirmed')
        return false
      }
      return finishSignIn(result.destination, operationId)
    }

    clearPendingAuthReference(signInStorageKey)
    setUnknownOperationId(null)
    setStatusKey(null)
    setServiceError(null)
    if (result.state === 'canceled') setProviderNoteKey('googleCanceled')
    else if (result.state === 'denied') setProviderNoteKey('googleDenied')
    else if (result.state === 'link-required') setProviderNoteKey('googleLinkRequired')
    else if (result.state === 'account-not-found') setProviderNoteKey('googleAccountNotFound')
    else setServiceError('conflict')
    return false
  }, [finishSignIn])

  const reconcile = useCallback(async (reference: PendingAuthReference) => {
    if (busyRef.current) return
    const operationId = reference.pendingOperationId
    if (!operationId) {
      clearPendingAuthReference(signInStorageKey)
      setUnknownOperationId(null)
      setStatusKey('notStarted')
      return
    }
    busyRef.current = true
    setBusyAction('status')
    setBusy(true)
    setStatusKey('checkingStatus')
    setServiceError(null)
    try {
      const result = await operationService.resolve<GoogleIdentityResult | { destination?: SignInIntent }>(operationId) as ServiceResult<OperationSnapshot<GoogleIdentityResult | { destination?: SignInIntent }> | { state: 'not-started'; operationId: ReturnType<typeof newOperationId>; safeToRetrySameId: true }>
      if (result.status !== 'ok') {
        setServiceError(codeFor(result))
        setStatusKey('generic')
        return
      }
      if ('safeToRetrySameId' in result.data) {
        clearPendingAuthReference(signInStorageKey)
        setUnknownOperationId(null)
        setPassword('')
        setStatusKey('notStarted')
        return
      }
      if (result.data.state === 'pending') {
        setStatusKey('operationPending')
        setUnknownOperationId(operationId)
        return
      }
      if (result.data.state === 'rejected') {
        clearPendingAuthReference(signInStorageKey)
        setUnknownOperationId(null)
        setPassword('')
        if (reference.operationKind === 'google-sign-in' || result.data.kind === 'identity.google.sign-in') setProviderNoteKey('googleDenied')
        else if (result.data.error?.code === 'unauthenticated') setCredentialsInvalid(true)
        else setServiceError(result.data.error?.code ?? 'unexpected')
        setStatusKey(null)
        return
      }
      if (reference.operationKind === 'google-sign-in' || result.data.kind === 'identity.google.sign-in') {
        if (!isGoogleSignInResult(result.data.result)) {
          setUnknownOperationId(operationId)
          setStatusKey('generic')
          return
        }
        await handleGoogleResult(result.data.result, operationId)
        return
      }
      const destination = result.data.result?.destination ?? reference.intent ?? intent
      await finishSignIn(destination, operationId)
    } catch {
      setStatusKey('generic')
      setUnknownOperationId(operationId)
    } finally {
      busyRef.current = false
      setBusyAction(null)
      setBusy(false)
    }
  }, [finishSignIn, handleGoogleResult, intent, operationService])

  useEffect(() => {
    if (savedAttempt && !recoveryAttempted.current) {
      recoveryAttempted.current = true
      void reconcile(savedAttempt)
      return
    }
    if (identityStatus === 'signed-in' && !unknownOperationId) {
      void navigate(routeForSignInIntent(intent), { replace: true })
    }
  }, [intent, identityStatus, navigate, reconcile, savedAttempt, unknownOperationId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busyRef.current || unknownOperationId) return
    const normalized = normalizeEmail(email)
    const invalidEmail = !isValidEmail(normalized)
    const missingPassword = password.length === 0
    setEmailError(invalidEmail)
    setPasswordError(missingPassword)
    setCredentialsInvalid(false)
    setServiceError(null)
    setProviderNoteKey(null)
    setStatusKey(null)
    if (invalidEmail || missingPassword) return

    const operationId = newOperationId()
    const reference = {
      version: 1 as const,
      requestId: operationId,
      pendingOperationId: operationId,
      email: normalized,
      operationKind: 'password-sign-in' as const,
      intent,
    }
    storePendingAuthReference(signInStorageKey, reference)
    setEmail(normalized)
    busyRef.current = true
    setBusyAction('password')
    setBusy(true)
    try {
      const result = await props.services.identity.signIn({
        email: normalized,
        password,
        intent,
        operationId,
      })
      if (result.status === 'ok') {
        await finishSignIn(result.data.destination, operationId)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setUnknownOperationId(operationId)
        setStatusKey('operationPending')
      } else {
        clearPendingAuthReference(signInStorageKey)
        if (result.status === 'error' && result.error.code === 'unauthenticated') {
          setCredentialsInvalid(true)
        } else {
          setServiceError(codeFor(result))
        }
      }
    } catch {
      setUnknownOperationId(operationId)
      setStatusKey('generic')
    } finally {
      busyRef.current = false
      setBusyAction(null)
      setBusy(false)
    }
  }

  const signInWithGoogle = async () => {
    if (busyRef.current || unknownOperationId) return
    setProviderNoteKey(null)
    setServiceError(null)
    const operationId = newOperationId()
    storePendingAuthReference(signInStorageKey, {
      version: 1,
      requestId: operationId,
      pendingOperationId: operationId,
      email: '',
      operationKind: 'google-sign-in',
      intent,
    })
    busyRef.current = true
    setBusyAction('google')
    setBusy(true)
    try {
      const result = await props.services.identity.google({
        purpose: 'sign-in',
        intentId: operationId,
        destination: intent,
        operationId,
      })
      if (result.status === 'ok') {
        await handleGoogleResult(result.data, operationId)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setUnknownOperationId(operationId)
        setStatusKey('operationPending')
      } else {
        clearPendingAuthReference(signInStorageKey)
        setServiceError(codeFor(result))
      }
    } catch {
      setUnknownOperationId(operationId)
      setStatusKey('generic')
    } finally {
      busyRef.current = false
      setBusyAction(null)
      setBusy(false)
    }
  }

  const checkStatus = () => {
    const reference = readPendingAuthReference(signInStorageKey)
    if (reference) void reconcile(reference)
    else if (unknownOperationId) {
      void reconcile({ version: 1, requestId: unknownOperationId, pendingOperationId: unknownOperationId, email: normalizeEmail(email), intent })
    }
  }

  return (
    <AuthLayout title={text.title} description={text.description}>
      <form className="auth-form" onSubmit={(event) => void submit(event)} noValidate>
        <Button
          type="button"
          variant="secondary"
          busy={busyAction === 'google'}
          disabled={Boolean(unknownOperationId) || (busy && busyAction !== 'google')}
          aria-describedby="google-mock-description"
          onClick={() => void signInWithGoogle()}
        >
          {text.continueGoogle}
        </Button>
        <p id="google-mock-description" className="auth-muted">{text.googleMockDescription}</p>
        <p className="auth-separator">{text.separator}</p>
        <TextField
          label={text.email}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => { setEmail(event.currentTarget.value); setEmailError(false); setCredentialsInvalid(false) }}
          error={emailError ? text.invalidEmail : undefined}
          required
        />
        <div className="auth-stack">
          <TextField
            label={text.password}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(event) => { setPassword(event.currentTarget.value); setPasswordError(false); setCredentialsInvalid(false) }}
            error={passwordError ? text.requiredPassword : undefined}
            required
          />
          <Button
            className="auth-password-toggle"
            type="button"
            variant="ghost"
            size="small"
            aria-label={text.passwordVisibility}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? text.hidePassword : text.showPassword}
          </Button>
        </div>
        {credentialsInvalid && <Notice tone="error" role="alert">{text.invalidCredentials}</Notice>}
        {serviceError && <ServiceNotice code={serviceError} />}
        {statusMessage && <Notice tone="warning" role="status">{statusMessage}</Notice>}
        {providerNoteKey && <Notice tone="warning" role="status">{text[providerNoteKey]}</Notice>}
        <div className="auth-form__actions">
          <Button
            type="submit"
            busy={busyAction === 'password'}
            disabled={Boolean(unknownOperationId) || (busy && busyAction !== 'password')}
          >
            {busy ? text.submitting : text.submit}
          </Button>
          {unknownOperationId && (
            <Button
              type="button"
              variant="secondary"
              busy={busyAction === 'status'}
              disabled={busy && busyAction !== 'status'}
              onClick={checkStatus}
            >
              {busy ? text.checkingStatus : text.checkStatus}
            </Button>
          )}
        </div>
        <AppLink className="auth-link" route={routes.passwordReset(intent)}>{text.forgotPassword}</AppLink>
        <p className="auth-muted">{text.noAccount} <AppLink className="auth-link" route={routes.registration()}>{text.register}</AppLink></p>
      </form>
    </AuthLayout>
  )
}

export default SignInScreen
