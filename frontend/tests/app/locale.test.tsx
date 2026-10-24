import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider, useLocale } from '../../src/app/locale'
import type { Locale } from '../../src/app/routes'
import { t } from '../../src/i18n/messages'
import { asRevision, ids, type AccountSnapshot, type Revision, type Services } from '../../src/services/contracts'

function account(locale: Locale, revision = 1): AccountSnapshot {
  return {
    id: ids.account(`locale-precedence-${locale}`),
    email: 'locale@example.test',
    locale,
    revision: asRevision(revision),
    deleted: false,
    createdAt: 0,
  }
}

function createServices() {
  const setLocale = vi.fn(async ({ locale, expectedRevision }: { locale: Locale; expectedRevision: Revision }) => ({
    status: 'ok' as const,
    data: account(locale, Number(expectedRevision) + 1),
    replayed: false,
  }))
  const startPurchase = vi.fn()
  const reserve = vi.fn()
  const startMicrophoneTest = vi.fn()
  const services = {
    account: { setLocale },
    credits: { startPurchase, reserve },
    browserMedia: { startMicrophoneTest },
  } as unknown as Services

  return { services, setLocale, startPurchase, reserve, startMicrophoneTest }
}

function LocaleProbe() {
  const { locale, setLocale, retryLocalePreference, preferenceError } = useLocale()
  const [draft, setDraft] = useState('Unsubmitted project title')
  const [operation] = useState('Transcription in progress')

  return (
    <>
      <output data-testid="locale">{locale}</output>
      <label>
        Draft title
        <input value={draft} onChange={(event) => setDraft(event.currentTarget.value)} />
      </label>
      <output data-testid="active-operation">{operation}</output>
      <button type="button" onClick={() => setLocale(locale === 'en' ? 'ru' : 'en')}>
        Switch locale
      </button>
      <button type="button" onClick={() => void retryLocalePreference()}>
        Retry locale update
      </button>
      <output data-testid="preference-error" role="status">{preferenceError ?? ''}</output>
    </>
  )
}

function mounted(accountSnapshot?: AccountSnapshot) {
  const { services, ...spies } = createServices()
  const onAccountUpdated = vi.fn()
  const view = render(
    <LocaleProvider account={accountSnapshot} services={services} onAccountUpdated={onAccountUpdated}>
      <LocaleProbe />
    </LocaleProvider>,
  )
  return { ...view, services, ...spies, onAccountUpdated }
}

function StatefulLocaleHost({
  initialAccount,
  services,
  onAccountUpdated,
}: {
  initialAccount: AccountSnapshot
  services: Services
  onAccountUpdated: (snapshot: AccountSnapshot) => void
}) {
  const [accountSnapshot, setAccountSnapshot] = useState(initialAccount)
  return (
    <LocaleProvider
      account={accountSnapshot}
      services={services}
      onAccountUpdated={(nextAccount) => {
        onAccountUpdated(nextAccount)
        setAccountSnapshot(nextAccount)
      }}
    >
      <LocaleProbe />
    </LocaleProvider>
  )
}

function mountedStatefully(initialAccount: AccountSnapshot) {
  const { services, ...spies } = createServices()
  const onAccountUpdated = vi.fn()
  const view = render(
    <StatefulLocaleHost
      initialAccount={initialAccount}
      services={services}
      onAccountUpdated={onAccountUpdated}
    />,
  )
  return { ...view, services, ...spies, onAccountUpdated }
}

describe('LocaleProvider preference precedence', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.lang = 'en'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    window.localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('uses a Russian browser default when no explicit preference or account exists', () => {
    vi.stubGlobal('navigator', { language: 'ru-RU' })
    const mountedView = mounted()

    expect(screen.getByTestId('locale')).toHaveTextContent('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(window.localStorage.getItem('dubbed.locale')).toBeNull()
    expect(mountedView.setLocale).not.toHaveBeenCalled()
    expect(mountedView.startPurchase).not.toHaveBeenCalled()
    expect(mountedView.reserve).not.toHaveBeenCalled()
    expect(mountedView.startMicrophoneTest).not.toHaveBeenCalled()

    mountedView.unmount()
    expect(document.documentElement.lang).toBe('en')
  })

  it('defers an English browser default to the saved account locale without persisting it', () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const mountedView = mounted()

    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    mountedView.rerender(
      <LocaleProvider
        account={account('ru')}
        services={mountedView.services}
        onAccountUpdated={mountedView.onAccountUpdated}
      >
        <LocaleProbe />
      </LocaleProvider>,
    )

    expect(screen.getByTestId('locale')).toHaveTextContent('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(window.localStorage.getItem('dubbed.locale')).toBeNull()
    expect(mountedView.setLocale).not.toHaveBeenCalled()
  })

  it('persists a stored choice, updates the parent account, then uses its new revision for a later locale change', async () => {
    window.localStorage.setItem('dubbed.locale', 'en')
    vi.stubGlobal('navigator', { language: 'ru-RU' })
    const mountedView = mountedStatefully(account('ru'))

    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    expect(document.documentElement.lang).toBe('en')
    await waitFor(() => expect(mountedView.setLocale).toHaveBeenCalledTimes(1))
    expect(mountedView.setLocale).toHaveBeenCalledWith(
      expect.objectContaining({ locale: 'en', expectedRevision: asRevision(1) }),
    )
    await waitFor(() => expect(mountedView.onAccountUpdated).toHaveBeenCalledWith(account('en', 2)))
    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Typed while a task is running' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }))
    })
    await waitFor(() => expect(mountedView.setLocale).toHaveBeenCalledTimes(2))

    expect(screen.getByTestId('locale')).toHaveTextContent('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(mountedView.setLocale).toHaveBeenLastCalledWith(
      expect.objectContaining({ locale: 'ru', expectedRevision: asRevision(2) }),
    )
    await waitFor(() => expect(mountedView.onAccountUpdated).toHaveBeenCalledWith(account('ru', 3)))
    expect(window.localStorage.getItem('dubbed.locale')).toBe('ru')
    expect(screen.getByLabelText('Draft title')).toHaveValue('Typed while a task is running')
    expect(screen.getByTestId('active-operation')).toHaveTextContent('Transcription in progress')
    expect(mountedView.startPurchase).not.toHaveBeenCalled()
    expect(mountedView.reserve).not.toHaveBeenCalled()
    expect(mountedView.startMicrophoneTest).not.toHaveBeenCalled()
  })

  it('rolls back a failed account update, then retries without starting billing or media work', async () => {
    vi.stubGlobal('navigator', { language: 'ru-RU' })
    const mountedView = mountedStatefully(account('ru'))
    mountedView.setLocale.mockRejectedValueOnce(new Error('temporary preference failure'))
    fireEvent.change(screen.getByLabelText('Draft title'), { target: { value: 'Keep this draft' } })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }))
    })
    await waitFor(() => expect(mountedView.setLocale).toHaveBeenCalledTimes(1))

    expect(screen.getByTestId('locale')).toHaveTextContent('ru')
    expect(document.documentElement.lang).toBe('ru')
    expect(window.localStorage.getItem('dubbed.locale')).toBe('ru')
    expect(screen.getByTestId('preference-error')).toHaveTextContent(t('ru', 'accountPreferenceUnavailable'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry locale update' }))
    })
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('en'))

    expect(mountedView.setLocale).toHaveBeenCalledTimes(2)
    expect(document.documentElement.lang).toBe('en')
    expect(mountedView.setLocale).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ locale: 'en', expectedRevision: asRevision(1) }),
    )
    expect(window.localStorage.getItem('dubbed.locale')).toBe('en')
    expect(screen.getByTestId('preference-error')).toBeEmptyDOMElement()
    expect(screen.getByLabelText('Draft title')).toHaveValue('Keep this draft')
    expect(screen.getByTestId('active-operation')).toHaveTextContent('Transcription in progress')
    expect(mountedView.startPurchase).not.toHaveBeenCalled()
    expect(mountedView.reserve).not.toHaveBeenCalled()
    expect(mountedView.startMicrophoneTest).not.toHaveBeenCalled()
  })

  it('localizes failed preference feedback in the authoritative locale after rollback', async () => {
    vi.stubGlobal('navigator', { language: 'en-US' })
    const mountedView = mountedStatefully(account('en'))
    mountedView.setLocale.mockRejectedValueOnce(new Error('temporary preference failure'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch locale' }))
    })
    await waitFor(() => expect(mountedView.setLocale).toHaveBeenCalledTimes(1))

    const error = screen.getByTestId('preference-error')
    expect(screen.getByTestId('locale')).toHaveTextContent('en')
    expect(document.documentElement.lang).toBe('en')
    expect(window.localStorage.getItem('dubbed.locale')).toBe('en')
    expect(error).toHaveTextContent(t('en', 'accountPreferenceUnavailable'))
    expect(error).not.toHaveTextContent(t('ru', 'accountPreferenceUnavailable'))

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Retry locale update' }))
    })
    await waitFor(() => expect(screen.getByTestId('locale')).toHaveTextContent('ru'))

    expect(document.documentElement.lang).toBe('ru')
    expect(window.localStorage.getItem('dubbed.locale')).toBe('ru')
    expect(screen.getByTestId('preference-error')).toBeEmptyDOMElement()
    expect(mountedView.setLocale).toHaveBeenCalledTimes(2)
  })
})
