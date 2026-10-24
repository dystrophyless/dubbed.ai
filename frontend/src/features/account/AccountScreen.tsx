import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowRight, Globe2, Link2, LogOut, Trash2 } from 'lucide-react'
import { routes, type Locale } from '../../app/routes'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { useLocale } from '../../app/locale'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import {
  ids,
  type AccountSnapshot,
  type AccountSettingsSnapshot,
  type LoginMethodSnapshot,
  type OperationId,
  type ServiceError,
} from '../../services/contracts'
import {
  clearPendingAccountDelete,
  readPendingAccountDelete,
  resolvePendingAccountDelete,
  storePendingAccountDelete,
} from './delete-reconciliation'
import { signOutThroughGuard } from './sign-out'
import './AccountScreen.css'

type AccountCopy = {
  title: string
  description: string
  simulated: string
  loading: string
  loadFailed: string
  signedOut: string
  language: string
  languageHint: string
  english: string
  russian: string
  preferenceRetry: string
  methods: string
  methodsHint: string
  google: string
  emailPassword: string
  linked: string
  notLinked: string
  pendingVerification: string
  link: string
  managePassword: string
  currentPassword: string
  newPassword: string
  passwordHint: string
  forgotPassword: string
  savePassword: string
  savingPassword: string
  passwordSaved: string
  passwordPending: string
  checkPassword: string
  passwordNotStarted: string
  passwordFailed: string
  passwordTooShort: string
  signOut: string
  signingOut: string
  signOutFailed: string
  delete: string
  deleteDescription: string
  deleteUnavailable: string
  deleteTitle: string
  deleteBody: string
  deleteImpact: (amount: number) => string
  deleteTokenLabel: string
  deleteTokenHint: string
  deleteConfirm: string
  deleting: string
  cancel: string
  deleteUnknown: string
  checkDelete: string
  deleteNotStarted: string
  deleteFailed: string
  deleteComplete: string
  storageUnavailable: string
  statusChecking: string
  unknownAction: string
  verified: string
}

const copy: Record<Locale, AccountCopy> = {
  en: {
    title: 'Account',
    description: 'Manage your language, sign-in methods, and account access.',
    simulated: 'This preview uses simulated account data. Changes stay in this browser.',
    loading: 'Loading account settings…',
    loadFailed: 'Account settings could not be loaded. Retry by reopening this page.',
    signedOut: 'Sign in to view account settings.',
    language: 'Language',
    languageHint: 'Choose the language used across Dubbed.',
    english: 'English',
    russian: 'Русский',
    preferenceRetry: 'Retry saving language',
    methods: 'Sign-in methods',
    methodsHint: 'These methods are reported by your account. Email addresses are not used to infer a link.',
    google: 'Google',
    emailPassword: 'Email and password',
    linked: 'Linked',
    notLinked: 'Not linked',
    pendingVerification: 'Verification pending',
    link: 'Link method',
    managePassword: 'Change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    passwordHint: 'Use at least 8 characters. No character classes are required.',
    forgotPassword: 'Forgot password?',
    savePassword: 'Save password',
    savingPassword: 'Saving…',
    passwordSaved: 'Password changed. This device stays signed in; other sessions were revoked.',
    passwordPending: 'The result is not confirmed. Check its status before trying again.',
    checkPassword: 'Check password-change status',
    passwordNotStarted: 'No password change was started. You can submit the form again.',
    passwordFailed: 'Password could not be changed. Review the fields and try again.',
    passwordTooShort: 'Use at least 8 characters.',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutFailed: 'Sign-out could not be confirmed. You are still on this account page.',
    delete: 'Delete account',
    deleteDescription: 'This action removes your access to account data and projects.',
    deleteUnavailable: 'Account deletion is unavailable for this account right now.',
    deleteTitle: 'Delete this account?',
    deleteBody: 'This removes access to your projects, recordings, takes, and results from Dubbed and cannot be undone here. It does not retract files already downloaded outside Dubbed or promise backup erasure.',
    deleteImpact: (amount) => `Purchased credit remainder: ${amount}. Deletion does not submit a refund request or promise a refund.`,
    deleteTokenLabel: 'Type DELETE to confirm',
    deleteTokenHint: 'The word must match. Leading and trailing spaces are ignored.',
    deleteConfirm: 'Delete account',
    deleting: 'Deleting…',
    cancel: 'Cancel',
    deleteUnknown: 'Deletion is not confirmed. Check its status before trying again.',
    checkDelete: 'Check deletion status',
    deleteNotStarted: 'No deletion was started. Confirm again to retry with the same operation.',
    deleteFailed: 'The account could not be deleted. Your current account remains available.',
    deleteComplete: 'Account deletion completed.',
    storageUnavailable: 'This browser could not save recovery status, so the account was not deleted. Enable session storage and retry.',
    statusChecking: 'Checking the last account-deletion status…',
    unknownAction: 'The action result is still unknown. Check status again before continuing.',
    verified: 'Verified',
  },
  ru: {
    title: 'Аккаунт',
    description: 'Настройте язык, способы входа и доступ к аккаунту.',
    simulated: 'В этой версии используются тестовые данные аккаунта. Изменения остаются в этом браузере.',
    loading: 'Загружаем настройки аккаунта…',
    loadFailed: 'Не удалось загрузить настройки аккаунта. Откройте страницу ещё раз.',
    signedOut: 'Войдите, чтобы посмотреть настройки аккаунта.',
    language: 'Язык',
    languageHint: 'Выберите язык интерфейса Dubbed.',
    english: 'English',
    russian: 'Русский',
    preferenceRetry: 'Повторить сохранение языка',
    methods: 'Способы входа',
    methodsHint: 'Список получен из аккаунта. Наличие одинакового адреса само по себе не означает связь.',
    google: 'Google',
    emailPassword: 'Электронная почта и пароль',
    linked: 'Подключён',
    notLinked: 'Не подключён',
    pendingVerification: 'Ожидает подтверждения',
    link: 'Подключить способ',
    managePassword: 'Изменить пароль',
    currentPassword: 'Текущий пароль',
    newPassword: 'Новый пароль',
    passwordHint: 'Не менее 8 символов. Особые классы символов не требуются.',
    forgotPassword: 'Забыли пароль?',
    savePassword: 'Сохранить пароль',
    savingPassword: 'Сохраняем…',
    passwordSaved: 'Пароль изменён. На этом устройстве вход сохранён; остальные сеансы завершены.',
    passwordPending: 'Результат не подтверждён. Проверьте состояние, прежде чем повторять действие.',
    checkPassword: 'Проверить изменение пароля',
    passwordNotStarted: 'Изменение пароля не начиналось. Форму можно отправить ещё раз.',
    passwordFailed: 'Не удалось изменить пароль. Проверьте поля и повторите попытку.',
    passwordTooShort: 'Введите не менее 8 символов.',
    signOut: 'Выйти',
    signingOut: 'Выходим…',
    signOutFailed: 'Не удалось подтвердить выход. Вы остались на странице аккаунта.',
    delete: 'Удалить аккаунт',
    deleteDescription: 'Это действие закроет доступ к данным аккаунта и проектам.',
    deleteUnavailable: 'Сейчас удалить этот аккаунт нельзя.',
    deleteTitle: 'Удалить этот аккаунт?',
    deleteBody: 'Доступ к проектам, записям, дублям и результатам в Dubbed будет удалён без возможности отмены. Это не удалит ранее скачанные файлы вне Dubbed и не является обещанием удалить резервные копии.',
    deleteImpact: (amount) => `Остаток купленных кредитов: ${amount}. Запрос на возврат не отправляется, возврат средств не гарантируется.`,
    deleteTokenLabel: 'Введите УДАЛИТЬ для подтверждения',
    deleteTokenHint: 'Слово должно совпадать. Пробелы в начале и конце не учитываются.',
    deleteConfirm: 'Удалить аккаунт',
    deleting: 'Удаляем…',
    cancel: 'Отмена',
    deleteUnknown: 'Удаление не подтверждено. Проверьте состояние, прежде чем повторять действие.',
    checkDelete: 'Проверить удаление',
    deleteNotStarted: 'Удаление не начиналось. Подтвердите действие ещё раз, чтобы повторить с тем же идентификатором.',
    deleteFailed: 'Не удалось удалить аккаунт. Текущий аккаунт по-прежнему доступен.',
    deleteComplete: 'Удаление аккаунта завершено.',
    storageUnavailable: 'Браузер не сохранил статус для восстановления, поэтому аккаунт не удалён. Включите хранилище сеанса и повторите попытку.',
    statusChecking: 'Проверяем состояние последнего удаления аккаунта…',
    unknownAction: 'Состояние действия пока неизвестно. Проверьте его ещё раз.',
    verified: 'Подтверждён',
  },
}

const pendingPasswordKey = 'dubbed.pending-password-change'

function newOperationId(prefix: string) {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return ids.operation(value)
}

type PasswordMarker = { version: 1; accountId: string; operationId: string }
type PasswordChangeResult = { account: AccountSnapshot; revokedOtherSessions: true }

function readPasswordMarker(): PasswordMarker | null {
  try {
    const raw = window.sessionStorage.getItem(pendingPasswordKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const record = value as Record<string, unknown>
    if (record.version !== 1 || typeof record.accountId !== 'string' || typeof record.operationId !== 'string') return null
    return { version: 1, accountId: record.accountId, operationId: record.operationId }
  } catch {
    return null
  }
}

function writePasswordMarker(marker: PasswordMarker): void {
  try {
    window.sessionStorage.setItem(pendingPasswordKey, JSON.stringify(marker))
  } catch {
    // The operation can still be reconciled while this page remains open.
  }
}

function clearPasswordMarker(operationId: string): void {
  try {
    if (readPasswordMarker()?.operationId === operationId) window.sessionStorage.removeItem(pendingPasswordKey)
  } catch {
    // No secret or account state is kept in this marker.
  }
}

function methodName(method: LoginMethodSnapshot['kind'], text: AccountCopy) {
  return method === 'google' ? text.google : text.emailPassword
}

function successfulDeleteRoute(
  navigate: FeatureScreenProps['navigate'],
  refreshIdentity: FeatureScreenProps['refreshIdentity'],
) {
  void navigate(routes.landing('account-deleted'), { replace: true }).then(async (navigated) => {
    if (!navigated) return
    try {
      await refreshIdentity()
    } catch {
      // The landing route already reflects the authoritative deletion receipt.
    }
  })
}

export function AccountScreen(props: FeatureScreenProps) {
  const localeState = useLocale()
  const locale = localeState.locale
  const text = copy[locale]
  const identityAccount = props.identity.status === 'signed-in' ? props.identity.account : null
  const accountId = identityAccount?.id ?? null

  const [snapshot, setSnapshot] = useState<AccountSettingsSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [passwordCurrent, setPasswordCurrent] = useState('')
  const [passwordNext, setPasswordNext] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordOperationId, setPasswordOperationId] = useState<OperationId | null>(null)
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'unknown' | 'not-started' | 'saved' | 'error'>('idle')
  const [passwordError, setPasswordError] = useState<ServiceError['code'] | null>(null)
  const [passwordLengthError, setPasswordLengthError] = useState(false)
  const [passwordChecking, setPasswordChecking] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteToken, setDeleteToken] = useState('')
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'checking' | 'submitting' | 'unknown' | 'not-started' | 'unresolved' | 'error'>('idle')
  const [deleteOperationId, setDeleteOperationId] = useState<OperationId | null>(null)
  const [deleteCode, setDeleteCode] = useState<ServiceError['code'] | null>(null)
  const [deleteStorageFailed, setDeleteStorageFailed] = useState(false)
  const deleteResolutionRef = useRef<string | null>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const skipDeleteFocusReturnRef = useRef(false)

  const restoreDeleteFocus = useCallback(() => {
    const trigger = deleteTriggerRef.current
    const currentTrigger = document.getElementById('account-delete-trigger') as HTMLButtonElement | null
    const recovery = document.querySelector<HTMLButtonElement>('.account-screen__delete-recovery-action')
    const availableTrigger = trigger?.isConnected && !trigger.disabled ? trigger : currentTrigger
    const target = availableTrigger?.isConnected && !availableTrigger.disabled
      ? availableTrigger
      : recovery?.isConnected && !recovery.disabled
        ? recovery
        : null
    target?.focus()
  }, [])

  const reload = useCallback(async () => {
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

  useEffect(() => {
    void reload()
  }, [reload])

  const resolvePasswordOperation = useCallback(async (operationId: OperationId, expectedAccountId: string) => {
    setPasswordChecking(true)
    setPasswordError(null)
    try {
      const result = await props.services.operations.resolve<PasswordChangeResult>(operationId)
      if (result.status !== 'ok') {
        setPasswordStatus('unknown')
        return
      }
      if ('safeToRetrySameId' in result.data) {
        clearPasswordMarker(operationId)
        setPasswordStatus('not-started')
        setPasswordOperationId(operationId)
        return
      }
      if (result.data.accountId !== expectedAccountId || result.data.kind !== 'account.change-password') {
        setPasswordStatus('unknown')
        return
      }
      if (result.data.state === 'committed') {
        const account = result.data.result?.account
        if (!account || account.id !== expectedAccountId || account.deleted) {
          setPasswordStatus('unknown')
          return
        }
        clearPasswordMarker(operationId)
        setPasswordStatus('saved')
        setPasswordCurrent('')
        setPasswordNext('')
        setPasswordOperationId(null)
        setSnapshot((current) =>
          current?.id === expectedAccountId && account.revision >= current.revision
            ? { ...current, ...account }
            : current,
        )
        if (props.onAccountUpdated) props.onAccountUpdated(account)
        else await props.refreshIdentity()
      } else if (result.data.state === 'rejected') {
        clearPasswordMarker(operationId)
        setPasswordOperationId(null)
        setPasswordError(result.data.error?.code ?? null)
        setPasswordStatus('error')
      } else {
        setPasswordStatus('unknown')
      }
    } catch {
      setPasswordStatus('unknown')
    } finally {
      setPasswordChecking(false)
    }
  }, [props.onAccountUpdated, props.refreshIdentity, props.services])

  useEffect(() => {
    if (!accountId) return
    const marker = readPasswordMarker()
    if (!marker || marker.accountId !== accountId) return
    const operationId = ids.operation(marker.operationId)
    setPasswordOperationId(operationId)
    setPasswordStatus('unknown')
    void resolvePasswordOperation(operationId, accountId)
  }, [accountId, resolvePasswordOperation])

  const onPasswordSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!snapshot || !accountId || !identityAccount || passwordBusy) return
    if (passwordNext.length < 8) {
      setPasswordLengthError(true)
      setPasswordStatus('error')
      return
    }
    setPasswordLengthError(false)
    setPasswordError(null)
    setPasswordBusy(true)
    const operationId = passwordOperationId ?? newOperationId('account-password')
    setPasswordOperationId(operationId)
    writePasswordMarker({ version: 1, accountId, operationId })
    try {
      const result = await props.services.account.changePassword({
        currentPassword: passwordCurrent,
        newPassword: passwordNext,
        expectedRevision: identityAccount.revision,
        operationId,
      })
      if (result.status === 'ok') {
        const updatedAccount = result.data.account
        if (updatedAccount.id !== accountId || updatedAccount.deleted) {
          setPasswordStatus('unknown')
          return
        }
        clearPasswordMarker(operationId)
        setPasswordStatus('saved')
        setPasswordCurrent('')
        setPasswordNext('')
        setPasswordOperationId(null)
        setSnapshot((current) =>
          current?.id === accountId && updatedAccount.revision >= current.revision
            ? { ...current, ...updatedAccount }
            : current,
        )
        if (props.onAccountUpdated) props.onAccountUpdated(updatedAccount)
        else await props.refreshIdentity()
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setPasswordStatus('unknown')
      } else {
        clearPasswordMarker(operationId)
        setPasswordOperationId(null)
        if (result.status === 'error') setPasswordError(result.error.code)
        else if (result.status === 'conflict') setPasswordError('conflict')
        setPasswordStatus('error')
      }
    } catch {
      setPasswordStatus('unknown')
    } finally {
      setPasswordBusy(false)
    }
  }, [accountId, identityAccount, passwordBusy, passwordCurrent, passwordNext, passwordOperationId, props.refreshIdentity, props.services, snapshot])

  const resolveDeleteStatus = useCallback(async (marker?: ReturnType<typeof readPendingAccountDelete>) => {
    const pending = marker ?? readPendingAccountDelete()
    if (!pending || (accountId && pending.accountId !== accountId)) return
    setDeleteStatus('checking')
    setDeleteCode(null)
    const result = await resolvePendingAccountDelete(props.services, pending)
    if (result.state === 'completed') {
      skipDeleteFocusReturnRef.current = true
      setDeleteStatus('idle')
      successfulDeleteRoute(props.navigate, props.refreshIdentity)
    } else if (result.state === 'not-started') {
      setDeleteOperationId(result.operationId)
      setDeleteStatus('not-started')
      setDeleteOpen(true)
    } else if (result.state === 'unknown') {
      setDeleteStatus('unknown')
      setDeleteOpen(true)
    } else if (result.state === 'unresolved') {
      setDeleteStatus('unresolved')
      setDeleteOpen(true)
    } else {
      setDeleteStatus('idle')
    }
  }, [accountId, props.navigate, props.refreshIdentity, props.services])

  useEffect(() => {
    if (!accountId) return
    const marker = readPendingAccountDelete()
    if (!marker || marker.accountId !== accountId || deleteResolutionRef.current === marker.operationId) return
    deleteResolutionRef.current = marker.operationId
    setDeleteOperationId(ids.operation(marker.operationId))
    setDeleteStatus('checking')
    void resolveDeleteStatus(marker)
  }, [accountId, resolveDeleteStatus])

  const beginDelete = useCallback(() => {
    if (!snapshot?.deletionEligible) return
    setDeleteToken('')
    setDeleteCode(null)
    setDeleteStorageFailed(false)
    if (deleteStatus === 'idle' || deleteStatus === 'error') setDeleteStatus('idle')
    setDeleteOpen(true)
  }, [deleteStatus, snapshot])

  const normalizedDeleteToken = deleteToken.trim().toLocaleUpperCase(locale)
  const expectedDeleteToken = locale === 'ru' ? 'УДАЛИТЬ' : 'DELETE'
  const canConfirmDelete = normalizedDeleteToken === expectedDeleteToken &&
    snapshot?.deletionEligible === true &&
    deleteStatus !== 'submitting' && deleteStatus !== 'checking' &&
    deleteStatus !== 'unknown' && deleteStatus !== 'unresolved' &&
    !deleteStorageFailed

  const onDeleteSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!snapshot || !accountId || !identityAccount || !canConfirmDelete) return
    const operationId = deleteOperationId ?? newOperationId('account-delete')
    const marker = { version: 1 as const, accountId, operationId }
    if (!storePendingAccountDelete(marker)) {
      setDeleteStorageFailed(true)
      return
    }
    setDeleteOperationId(operationId)
    setDeleteStatus('submitting')
    setDeleteCode(null)
    try {
      const result = await props.services.account.delete({
        confirmation: deleteToken.trim(),
        locale,
        expectedRevision: identityAccount.revision,
        operationId,
      })
      if (result.status === 'ok') {
        clearPendingAccountDelete(operationId)
        skipDeleteFocusReturnRef.current = true
        setDeleteStatus('idle')
        setDeleteOpen(false)
        successfulDeleteRoute(props.navigate, props.refreshIdentity)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        setDeleteStatus('unknown')
      } else if (result.status === 'error' && result.error.retry === 'same-operation') {
        setDeleteStatus('not-started')
        setDeleteCode(result.error.code)
      } else {
        clearPendingAccountDelete(operationId)
        setDeleteOperationId(null)
        setDeleteStatus('error')
        if (result.status === 'error') setDeleteCode(result.error.code)
        else if (result.status === 'conflict') setDeleteCode('conflict')
        void reload()
      }
    } catch {
      setDeleteStatus('unknown')
    }
  }, [accountId, canConfirmDelete, deleteOperationId, deleteToken, identityAccount, locale, props.navigate, props.refreshIdentity, props.services, reload, snapshot])

  const methods = useMemo(() => {
    const byKind = new Map(snapshot?.methods.map((method) => [method.kind, method]) ?? [])
    return {
      google: byKind.get('google'),
      emailPassword: byKind.get('email-password'),
    }
  }, [snapshot?.methods])

  const onSignOut = useCallback(async () => {
    if (!identityAccount || signOutBusy) return
    setSignOutBusy(true)
    setSignOutFailed(false)
    const result = await signOutThroughGuard({
      services: props.services,
      navigate: props.navigate,
      refreshIdentity: props.refreshIdentity,
      expectedRevision: identityAccount.revision,
    })
    if (result.state === 'failed') setSignOutFailed(true)
    setSignOutBusy(false)
  }, [identityAccount, props.navigate, props.refreshIdentity, props.services, signOutBusy])

  const renderMethod = (kind: LoginMethodSnapshot['kind'], method?: LoginMethodSnapshot) => (
    <div className="account-screen__method" key={kind}>
      <div className="account-screen__method-icon" aria-hidden="true">
        {kind === 'google' ? <Globe2 /> : <span>@</span>}
      </div>
      <div className="account-screen__method-copy">
        <h3>{methodName(kind, text)}</h3>
        {method ? (
          <>
            <p className="account-screen__method-address">{method.address}</p>
            <p className="account-screen__method-state">
              {method.verified ? text.verified : text.pendingVerification}
            </p>
          </>
        ) : <p className="account-screen__method-state">{text.notLinked}</p>}
      </div>
      {method ? (
        kind === 'email-password' && method.verified ? (
          <span className="account-screen__method-action-label">{text.linked}</span>
        ) : <span className="account-screen__method-action-label">{method.verified ? text.linked : text.pendingVerification}</span>
      ) : (
        <Button variant="secondary" onClick={() => void props.navigate(routes.accountLinking())}>
          <Link2 aria-hidden="true" />{text.link}
        </Button>
      )}
    </div>
  )

  if (!identityAccount) {
    return <div className="account-screen"><Notice>{text.signedOut}</Notice></div>
  }

  if (loading) return <div className="account-screen"><p role="status">{text.loading}</p></div>
  if (loadFailed || !snapshot) return <div className="account-screen"><Notice tone="error" role="alert">{text.loadFailed}</Notice></div>

  return (
    <div className="account-screen">
      <div className="account-screen__heading">
        <div>
          <h1>{text.title}</h1>
          <p>{text.description}</p>
        </div>
        <p className="account-screen__email">{snapshot.email}</p>
      </div>

      <Notice className="account-screen__simulation">{text.simulated}</Notice>

      {deleteStatus === 'checking' && <Notice>{text.statusChecking}</Notice>}
      {deleteStatus === 'unknown' && (
        <Notice tone="warning" role="alert">
          <span>{text.deleteUnknown}</span>
              <Button className="account-screen__delete-recovery-action" variant="secondary" size="small" onClick={() => void resolveDeleteStatus()}>{text.checkDelete}</Button>
        </Notice>
      )}
      {deleteStatus === 'unresolved' && (
        <Notice tone="warning" role="alert">
          <span>{text.unknownAction}</span>
              <Button className="account-screen__delete-recovery-action" variant="secondary" size="small" onClick={() => void resolveDeleteStatus()}>{text.checkDelete}</Button>
        </Notice>
      )}

      <section className="account-screen__section" aria-labelledby="account-language-title">
        <div className="account-screen__section-intro">
          <h2 id="account-language-title"><Globe2 aria-hidden="true" />{text.language}</h2>
          <p>{text.languageHint}</p>
        </div>
        <div className="account-screen__section-content">
          <label className="account-screen__select-label" htmlFor="account-locale">{text.language}</label>
          <select
            id="account-locale"
            className="account-screen__select"
            value={locale}
            onChange={(event) => localeState.setLocale(event.currentTarget.value as Locale)}
          >
            <option value="en">{text.english}</option>
            <option value="ru">{text.russian}</option>
          </select>
          {localeState.preferenceError && (
            <div className="account-screen__preference-error" role="alert">
              <span>{localeState.preferenceError}</span>
              <Button variant="secondary" size="small" onClick={() => void localeState.retryLocalePreference()}>
                {text.preferenceRetry}
              </Button>
            </div>
          )}
        </div>
      </section>

      <section className="account-screen__section" aria-labelledby="account-methods-title">
        <div className="account-screen__section-intro">
          <h2 id="account-methods-title">{text.methods}</h2>
          <p>{text.methodsHint}</p>
        </div>
        <div className="account-screen__section-content account-screen__methods">
          {renderMethod('google', methods.google)}
          {renderMethod('email-password', methods.emailPassword)}
          {methods.emailPassword?.verified && (
            <form className="account-screen__password-form" onSubmit={(event) => void onPasswordSubmit(event)}>
              <h3>{text.managePassword}</h3>
              <div className="account-screen__password-fields">
                <TextField
                  label={text.currentPassword}
                  type="password"
                  autoComplete="current-password"
                  value={passwordCurrent}
                  onChange={(event) => { setPasswordCurrent(event.currentTarget.value); setPasswordStatus('idle'); setPasswordError(null) }}
                  required
                  disabled={passwordBusy || passwordStatus === 'unknown'}
                />
                <TextField
                  label={text.newPassword}
                  type="password"
                  autoComplete="new-password"
                  hint={text.passwordHint}
                  value={passwordNext}
                  onChange={(event) => { setPasswordNext(event.currentTarget.value); setPasswordStatus('idle'); setPasswordError(null); setPasswordLengthError(false) }}
                  minLength={8}
                  required
                  disabled={passwordBusy || passwordStatus === 'unknown'}
                />
              </div>
              {passwordLengthError && <p className="account-screen__field-error" role="alert">{text.passwordTooShort}</p>}
              {passwordStatus === 'saved' && <Notice tone="success">{text.passwordSaved}</Notice>}
              {passwordStatus === 'not-started' && <Notice>{text.passwordNotStarted}</Notice>}
              {passwordStatus === 'unknown' && (
                <Notice tone="warning" role="alert">
                  <span>{text.passwordPending}</span>
                  <Button type="button" variant="secondary" size="small" disabled={passwordChecking} onClick={() => passwordOperationId && accountId && void resolvePasswordOperation(passwordOperationId, accountId)}>
                    {passwordChecking ? text.loading : text.checkPassword}
                  </Button>
                </Notice>
              )}
              {passwordStatus === 'error' && (passwordError ? <ServiceNotice code={passwordError} /> : <Notice tone="error" role="alert">{text.passwordFailed}</Notice>)}
              <div className="account-screen__password-actions">
                <Button type="submit" disabled={passwordBusy || passwordStatus === 'unknown'}>
                  {passwordBusy ? text.savingPassword : text.savePassword}
                </Button>
                <Button type="button" variant="ghost" onClick={() => void props.navigate(routes.passwordReset())}>
                  {text.forgotPassword}<ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      <section className="account-screen__section account-screen__session" aria-labelledby="account-session-title">
        <div className="account-screen__section-intro">
          <h2 id="account-session-title">{locale === 'ru' ? 'Сеанс' : 'Session'}</h2>
          <p>{locale === 'ru' ? 'Выйдите из аккаунта на этом устройстве.' : 'Sign out from this device.'}</p>
        </div>
        <div className="account-screen__section-content account-screen__session-action">
          {signOutFailed && <Notice tone="error" role="alert">{text.signOutFailed}</Notice>}
          <Button variant="secondary" onClick={() => void onSignOut()} disabled={signOutBusy}>
            <LogOut aria-hidden="true" />{signOutBusy ? text.signingOut : text.signOut}
          </Button>
        </div>
      </section>

      <section className="account-screen__delete-section" aria-labelledby="account-delete-title">
        <div className="account-screen__section-intro">
          <h2 id="account-delete-title">{text.delete}</h2>
          <p>{text.deleteDescription}</p>
        </div>
        <div className="account-screen__section-content account-screen__delete-action">
          {!snapshot.deletionEligible && <p className="account-screen__muted">{text.deleteUnavailable}</p>}
          {deleteStatus === 'not-started' && (
            <Notice>{text.deleteNotStarted}</Notice>
          )}
          {deleteStatus === 'error' && (deleteCode ? <ServiceNotice code={deleteCode} /> : <Notice tone="error" role="alert">{text.deleteFailed}</Notice>)}
          <Button id="account-delete-trigger" variant="destructive" onClick={(event) => {
            deleteTriggerRef.current = event.currentTarget
            beginDelete()
          }} disabled={!snapshot.deletionEligible || deleteStatus === 'unknown' || deleteStatus === 'unresolved' || deleteStatus === 'checking'}>
            <Trash2 aria-hidden="true" />{text.delete}
          </Button>
        </div>
      </section>

      <Dialog.Root open={deleteOpen} onOpenChange={(open) => {
        if (deleteStatus !== 'submitting' && deleteStatus !== 'checking') setDeleteOpen(open)
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="account-screen__dialog-overlay" />
          <Dialog.Content
            className="account-screen__dialog"
            aria-describedby="account-delete-description"
            onCloseAutoFocus={(event) => {
              if (skipDeleteFocusReturnRef.current) {
                skipDeleteFocusReturnRef.current = false
                event.preventDefault()
                return
              }
              event.preventDefault()
              restoreDeleteFocus()
            }}
          >
            <Dialog.Title className="account-screen__dialog-title">{text.deleteTitle}</Dialog.Title>
            <Dialog.Description id="account-delete-description" className="account-screen__dialog-description">
              {text.deleteBody}
            </Dialog.Description>
            <p className="account-screen__delete-impact">{text.deleteImpact(snapshot.purchasedRemainder)}</p>
            {deleteStatus === 'not-started' && <Notice>{text.deleteNotStarted}</Notice>}
            {(deleteStatus === 'unknown' || deleteStatus === 'unresolved') && (
              <Notice tone="warning" role="alert">
                <span>{text.deleteUnknown}</span>
                <Button type="button" variant="secondary" size="small" onClick={() => void resolveDeleteStatus()}>
                  {text.checkDelete}
                </Button>
              </Notice>
            )}
            {deleteStorageFailed && <Notice tone="error" role="alert">{text.storageUnavailable}</Notice>}
            {deleteStatus === 'error' && (deleteCode ? <ServiceNotice code={deleteCode} /> : <Notice tone="error" role="alert">{text.deleteFailed}</Notice>)}
            <form onSubmit={(event) => void onDeleteSubmit(event)}>
              <TextField
                label={text.deleteTokenLabel}
                hint={text.deleteTokenHint}
                value={deleteToken}
                onChange={(event) => setDeleteToken(event.currentTarget.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                disabled={deleteStatus === 'submitting' || deleteStatus === 'checking' || deleteStatus === 'unknown' || deleteStatus === 'unresolved'}
              />
              <div className="account-screen__dialog-actions">
                <Button type="button" variant="ghost" disabled={deleteStatus === 'submitting' || deleteStatus === 'checking'} onClick={() => setDeleteOpen(false)}>{text.cancel}</Button>
                <Button type="submit" variant="destructive" disabled={!canConfirmDelete}>
                  {deleteStatus === 'submitting' ? text.deleting : text.deleteConfirm}
                </Button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

export default AccountScreen
