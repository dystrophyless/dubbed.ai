import { useMemo, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { LoaderCircle } from 'lucide-react'
import { LocaleProvider, useLocale } from '../../src/app/locale'
import type { Locale } from '../../src/app/routes'
import { Button } from '../../src/components/ui/button'
import { TextField } from '../../src/components/ui/input'
import { Notice } from '../../src/components/ui/notice'
import OtpInput from '../../src/features/auth/OtpInput'
import { asRevision, ids, type AccountSnapshot, type Services } from '../../src/services/contracts'
import '../../src/index.css'
import '../../src/App.css'
import './shared-controls.css'

const copy = {
  en: {
    title: 'Shared controls',
    language: 'Language',
    buttons: 'Buttons',
    primary: 'Save changes',
    secondary: 'Cancel',
    ghost: 'View details',
    destructive: 'Delete project',
    disabled: 'Unavailable',
    busy: 'Uploading…',
    busyDraft: 'Draft value',
    busyStart: 'Save test draft',
    busyPending: 'Saving test draft…',
    busyRelease: 'Finish synthetic request',
    busyFailure: 'The synthetic save failed; the draft remains.',
    busyStatus: 'Saving draft',
    fields: 'Text fields',
    email: 'Email address',
    emailHint: 'Use the address associated with your account.',
    invalidEmail: 'Invalid email address',
    emailError: 'Enter a valid email address.',
    otp: 'Verification code',
    otpError: 'That code did not match.',
    verifiedOtp: 'Verified code',
    notices: 'Notices',
    success: 'Your changes have been saved.',
    warning: 'Your session is about to expire.',
    error: 'We could not save your changes.',
  },
  ru: {
    title: 'Общие элементы управления',
    language: 'Язык',
    buttons: 'Кнопки',
    primary: 'Сохранить изменения',
    secondary: 'Отмена',
    ghost: 'Подробнее',
    destructive: 'Удалить проект',
    disabled: 'Недоступно',
    busy: 'Загрузка…',
    busyDraft: 'Черновик',
    busyStart: 'Сохранить тестовый черновик',
    busyPending: 'Сохраняем тестовый черновик…',
    busyRelease: 'Завершить тестовый запрос',
    busyFailure: 'Тестовое сохранение не удалось; черновик остался.',
    busyStatus: 'Сохраняем черновик',
    fields: 'Текстовые поля',
    email: 'Электронная почта',
    emailHint: 'Укажите адрес, связанный с аккаунтом.',
    invalidEmail: 'Неверный адрес электронной почты',
    emailError: 'Введите корректный адрес электронной почты.',
    otp: 'Код подтверждения',
    otpError: 'Этот код не подошёл.',
    verifiedOtp: 'Подтверждённый код',
    notices: 'Уведомления',
    success: 'Изменения сохранены.',
    warning: 'Срок действия сеанса скоро закончится.',
    error: 'Не удалось сохранить изменения.',
  },
} satisfies Record<Locale, Record<string, string>>

function testAccount(locale: Locale): AccountSnapshot {
  return {
    id: ids.account('shared-controls-account'),
    email: 'controls@example.test',
    locale,
    revision: asRevision(1),
    deleted: false,
    createdAt: 0,
  }
}

function Controls() {
  const { locale, setLocale } = useLocale()
  const text = copy[locale]
  const [email, setEmail] = useState('wrong-address')
  const [otp, setOtp] = useState('381204')

  return (
    <main className="shared-controls-page" lang={locale}>
      <header className="shared-controls__header">
        <h1>{text.title}</h1>
        <label className="shared-controls__language">
          <span>{text.language}</span>
          <select
            data-testid="language-select"
            aria-label={text.language}
            value={locale}
            onChange={(event) => setLocale(event.currentTarget.value as Locale)}
          >
            <option value="en">EN</option>
            <option value="ru">RU</option>
          </select>
        </label>
      </header>

      <div className="shared-controls__grid">
        <section className="shared-controls__section" aria-labelledby="controls-buttons-heading">
          <h2 id="controls-buttons-heading">{text.buttons}</h2>
          <div className="shared-controls__button-row">
            <Button data-testid="primary-button">{text.primary}</Button>
            <Button variant="secondary" size="small" data-testid="small-button">{text.secondary}</Button>
            <Button variant="ghost" size="medium" data-testid="medium-button">{text.ghost}</Button>
            <Button variant="destructive" size="large" data-testid="large-button">{text.destructive}</Button>
            <Button disabled data-testid="disabled-button">{text.disabled}</Button>
            <Button busy data-testid="busy-button">
              <LoaderCircle className="shared-controls__spinner" aria-hidden="true" strokeWidth={1.1} />
              {text.busy}
            </Button>
          </div>
        </section>

        <section className="shared-controls__section" aria-labelledby="controls-fields-heading">
          <h2 id="controls-fields-heading">{text.fields}</h2>
          <TextField
            id="shared-controls-email"
            label={text.email}
            hint={text.emailHint}
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
          <TextField
            id="shared-controls-email-invalid"
            label={text.invalidEmail}
            type="email"
            value={email}
            error={text.emailError}
            onChange={(event) => setEmail(event.currentTarget.value)}
          />
        </section>

        <section className="shared-controls__section" aria-labelledby="controls-otp-heading">
          <h2 id="controls-otp-heading">{text.otp}</h2>
          <OtpInput
            id="shared-controls-otp-invalid"
            label={text.otp}
            value={otp}
            onChange={setOtp}
            invalid
            errorMessageId="shared-controls-otp-error"
          />
          <p id="shared-controls-otp-error" className="field__error" role="alert">{text.otpError}</p>
          <OtpInput
            id="shared-controls-otp-verified"
            label={text.verifiedOtp}
            value="721590"
            onChange={() => undefined}
            verified
          />
        </section>

        <section className="shared-controls__section" aria-labelledby="controls-notices-heading">
          <h2 id="controls-notices-heading">{text.notices}</h2>
          <Notice tone="success" role="status">{text.success}</Notice>
          <Notice tone="warning" role="status">{text.warning}</Notice>
          <Notice tone="error" role="alert" className="shared-controls__error-notice">{text.error}</Notice>
        </section>
      </div>
    </main>
  )
}

function BusyButtonProof() {
  const { locale } = useLocale()
  const text = copy[locale]
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('keep this draft')
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState('')
  const busyRef = useRef(false)
  const resolveOperationRef = useRef<(() => void) | null>(null)

  const save = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setAttempts((count) => count + 1)
    setStatus(text.busyStatus)
    try {
      await new Promise<void>((resolve) => {
        resolveOperationRef.current = resolve
      })
      throw new Error('Synthetic save failure')
    } catch {
      setStatus(text.busyFailure)
    } finally {
      resolveOperationRef.current = null
      busyRef.current = false
      setBusy(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  return (
    <section className="shared-controls__section" aria-labelledby="busy-proof-heading">
      <h2 id="busy-proof-heading">{text.busy}</h2>
      <form onSubmit={submit}>
        <label className="shared-controls__language">
          <span>{text.busyDraft}</span>
          <input data-testid="busy-proof-draft" value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />
        </label>
        <Button type="submit" busy={busy} data-testid="busy-proof-button" onClick={() => void save()}>
          {busy ? text.busyPending : text.busyStart}
        </Button>
      </form>
      <button type="button" data-testid="release-busy-proof" onClick={() => resolveOperationRef.current?.()}>
        {text.busyRelease}
      </button>
      <p data-testid="busy-proof-status" role="status">{status}</p>
      <span data-testid="busy-proof-attempts">{attempts}</span>
    </section>
  )
}

function Harness() {
  const showBusyProof = new URLSearchParams(window.location.search).get('busy-proof') === '1'
  const requestedAccountLocale = new URLSearchParams(window.location.search).get('account')
  const account = requestedAccountLocale === 'en' || requestedAccountLocale === 'ru'
    ? testAccount(requestedAccountLocale)
    : undefined
  const services = useMemo(() => ({
    account: {
      setLocale: async ({ locale }: { locale: Locale }) => ({
        status: 'ok' as const,
        data: testAccount(locale),
        replayed: false,
      }),
    },
  }) as unknown as Services, [])

  return (
    <LocaleProvider account={account} services={services} onAccountUpdated={() => undefined}>
      <Controls />
      {showBusyProof && <BusyButtonProof />}
    </LocaleProvider>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('The shared controls evidence harness root is missing.')
createRoot(root).render(<Harness />)
