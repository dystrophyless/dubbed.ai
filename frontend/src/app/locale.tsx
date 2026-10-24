import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ids, type AccountSnapshot, type Services } from '../services/contracts'
import type { Locale } from './routes'
import { t, type MessageKey } from '../i18n/messages'

const preferenceKey = 'dubbed.locale'

interface LocaleValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  retryLocalePreference: () => Promise<void>
  text: (key: MessageKey) => string
  preferenceError: string | null
}

const LocaleContext = createContext<LocaleValue | null>(null)

function readLocalePreference(): Locale | null {
  try {
    const stored = window.localStorage.getItem(preferenceKey)
    return stored === 'en' || stored === 'ru' ? stored : null
  } catch {
    return null
  }
}

function browserDefault(): Locale {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('ru')
    ? 'ru'
    : 'en'
}

function newOperationId() {
  const value =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `locale-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return ids.operation(value)
}

export interface LocaleProviderProps {
  account?: AccountSnapshot
  services: Services
  onAccountUpdated: (account: AccountSnapshot) => void
  children: ReactNode
}

export function LocaleProvider({ account, services, onAccountUpdated, children }: LocaleProviderProps) {
  const [storedLocale] = useState<Locale | null>(() => readLocalePreference())
  const [userLocale, setUserLocale] = useState<Locale>(() => storedLocale ?? browserDefault())
  const [manualChoice, setManualChoice] = useState(storedLocale !== null)
  const [preferenceFailed, setPreferenceFailed] = useState(false)
  const [pendingLocale, setPendingLocale] = useState<Locale | null>(null)
  const attemptedAccountWrite = useRef<string | null>(null)
  const locale = manualChoice ? userLocale : account?.locale ?? userLocale

  useEffect(() => {
    const root = document.documentElement
    const previousLanguage = root.lang
    root.lang = locale
    return () => {
      if (root.lang === locale) root.lang = previousLanguage
    }
  }, [locale])

  const persistLocale = useCallback(
    async (next: Locale, currentAccount: AccountSnapshot) => {
      const attemptKey = `${currentAccount.id}:${currentAccount.revision}:${next}`
      if (attemptedAccountWrite.current === attemptKey) return
      attemptedAccountWrite.current = attemptKey

      try {
        const result = await services.account.setLocale({
          locale: next,
          expectedRevision: currentAccount.revision,
          operationId: newOperationId(),
        })
        if (result.status === 'ok') {
          setPreferenceFailed(false)
          setPendingLocale(null)
          setUserLocale(next)
          setManualChoice(true)
          try {
            window.localStorage.setItem(preferenceKey, next)
          } catch {
            // Server preference remains authoritative for the signed-in account.
          }
          onAccountUpdated(result.data)
        } else {
          setPendingLocale(next)
          setUserLocale(currentAccount.locale)
          setManualChoice(false)
          try {
            window.localStorage.setItem(preferenceKey, currentAccount.locale)
          } catch {
            // The visible locale still follows the authoritative account snapshot.
          }
          setPreferenceFailed(true)
        }
      } catch {
        setPendingLocale(next)
        setUserLocale(currentAccount.locale)
        setManualChoice(false)
        try {
          window.localStorage.setItem(preferenceKey, currentAccount.locale)
        } catch {
          // The visible locale still follows the authoritative account snapshot.
        }
        setPreferenceFailed(true)
      }
    },
    [onAccountUpdated, services],
  )

  useEffect(() => {
    if (!account) {
      attemptedAccountWrite.current = null
      return
    }
    if (manualChoice && account.locale !== userLocale) void persistLocale(userLocale, account)
  }, [account, manualChoice, persistLocale, userLocale])

  const setLocale = useCallback((next: Locale) => {
    setUserLocale(next)
    setManualChoice(true)
    setPendingLocale(account && account.locale !== next ? next : null)
    setPreferenceFailed(false)
    try {
      window.localStorage.setItem(preferenceKey, next)
    } catch {
      // The visible locale remains usable when browser storage is unavailable.
    }
  }, [account])

  const retryLocalePreference = useCallback(async () => {
    const requestedLocale = pendingLocale
    if (!account || !requestedLocale || account.locale === requestedLocale) return
    attemptedAccountWrite.current = null
    await persistLocale(requestedLocale, account)
  }, [account, pendingLocale, persistLocale])

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      setLocale,
      retryLocalePreference,
      text: (key) => t(locale, key),
      preferenceError: preferenceFailed ? t(locale, 'accountPreferenceUnavailable') : null,
    }),
    [locale, preferenceFailed, retryLocalePreference, setLocale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleValue {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('Locale provider is missing')
  return context
}
