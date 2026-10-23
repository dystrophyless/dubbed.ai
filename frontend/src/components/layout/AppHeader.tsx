import { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { AppLink } from '../../app/AppLink'
import { useAppContext } from '../../app/context'
import { useLocale } from '../../app/locale'
import { routes } from '../../app/routes'
import { Button, buttonVariants } from '../ui/button'
import { Sheet } from '../ui/sheet'
import { cn } from '../ui/cn'
import { signOutThroughGuard } from '../../features/account/sign-out'
import { Notice } from '../ui/notice'
import { creditsMayHaveChangedEvent } from '../../app/credits-events'

function LocaleSwitcher() {
  const { locale, setLocale, text, preferenceError } = useLocale()
  return (
    <>
      <label className="locale-control">
        <span className="visually-hidden">{text('language')}</span>
        <select
          aria-label={text('language')}
          value={locale}
          onChange={(event) => setLocale(event.currentTarget.value === 'ru' ? 'ru' : 'en')}
        >
          <option value="en">EN</option>
          <option value="ru">RU</option>
        </select>
      </label>
      {preferenceError && (
        <span className="visually-hidden" role="status">
          {preferenceError}
        </span>
      )}
    </>
  )
}

function CreditBalance() {
  const { identity, locationKey, services } = useAppContext()
  const { locale, text } = useLocale()
  const accountId = identity.status === 'signed-in' ? identity.account.id : null
  const requestVersion = useRef(0)
  const [balance, setBalance] = useState<{
    accountId: string
    locationKey: string
    available: number | null
  }>()

  useEffect(() => {
    let active = true
    const refresh = () => {
      if (!accountId) {
        setBalance(undefined)
        return
      }

      const version = ++requestVersion.current
      setBalance(undefined)
      void services.credits.snapshot().then((result) => {
        if (!active || version !== requestVersion.current) return
        if (result.status === 'ok' && result.data.accountId === accountId) {
          setBalance({ accountId, locationKey, available: result.data.available })
        } else {
          setBalance({ accountId, locationKey, available: null })
        }
      }).catch(() => {
        if (active && version === requestVersion.current) {
          setBalance({ accountId, locationKey, available: null })
        }
      })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh()
    }

    refresh()
    window.addEventListener(creditsMayHaveChangedEvent, refresh)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      active = false
      requestVersion.current += 1
      window.removeEventListener(creditsMayHaveChangedEvent, refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [accountId, locationKey, services])

  if (!accountId) return null
  const available = balance?.accountId === accountId && balance.locationKey === locationKey
    ? balance.available
    : undefined
  const value = available === undefined
    ? text('balanceLoading')
    : available === null
      ? text('balanceUnavailable')
      : new Intl.NumberFormat(locale).format(available)
  return (
    <span className="credit-balance" aria-live="polite">
      <span className="credit-balance__label">{text('balanceLabel')}</span>
      <strong>{value}</strong>
    </span>
  )
}

export function AppHeader() {
  const { identity, route, services, navigate, refreshIdentity } = useAppContext()
  const { text } = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [signOutError, setSignOutError] = useState(false)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const signOutBusyRef = useRef(false)
  const isSignedIn = identity.status === 'signed-in'

  async function signOut() {
    if (identity.status !== 'signed-in' || signOutBusyRef.current) return
    signOutBusyRef.current = true
    setSignOutBusy(true)
    setSignOutError(false)
    const result = await signOutThroughGuard({
      services,
      navigate,
      refreshIdentity,
      expectedRevision: identity.account.revision,
    })
    signOutBusyRef.current = false
    setSignOutBusy(false)
    if (result.state === 'completed') {
      setMenuOpen(false)
      return
    }
    if (result.state === 'failed') setSignOutError(true)
  }

  const navItems = [
    { route: routes.newDub(), label: text('navNewDub'), active: route.kind === 'new-dub' },
    { route: routes.projects(), label: text('navProjects'), active: route.kind === 'projects' || route.kind === 'project' },
    { route: routes.credits(), label: text('navCredits'), active: route.kind === 'credits' },
    { route: routes.account(), label: text('navAccount'), active: route.kind === 'account' },
  ]

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <AppLink
          className="brand-link"
          route={routes.landing()}
          aria-label={`${text('brand')} — ${text('home')}`}
        >
          <span>{text('brand')}</span>
        </AppLink>

        {isSignedIn && (
          <nav aria-label={text('mainNavigation')} className="desktop-nav">
            {navItems.map((item) => (
              <AppLink
                key={item.label}
                className={cn(buttonVariants({ variant: 'ghost', size: 'small' }), 'nav-link')}
                route={item.route}
                aria-current={item.active ? 'page' : undefined}
              >
                {item.label}
              </AppLink>
            ))}
          </nav>
        )}

        <div className="app-header__actions">
          <CreditBalance />
          <div className={cn('app-header__desktop-locale', isSignedIn && 'app-header__desktop-locale--signed-in')}>
            <LocaleSwitcher />
          </div>
          {isSignedIn && signOutError && (
            <span className="desktop-sign-out-error"><Notice tone="error" role="alert">{text('signOutFailed')}</Notice></span>
          )}
          {!isSignedIn && identity.status !== 'checking' && (
            <AppLink
              className={cn(buttonVariants({ variant: 'ghost', size: 'small' }), 'sign-in-link')}
              route={routes.signIn()}
            >
              {text('signIn')}
            </AppLink>
          )}
          {isSignedIn && (
            <Button
              className="desktop-sign-out"
              variant="ghost"
              size="small"
              aria-busy={signOutBusy}
              onClick={() => void signOut()}
            >
              {signOutBusy ? text('signingOut') : text('signOut')}
            </Button>
          )}
          {isSignedIn && (
            <Button
              className="mobile-menu-trigger"
              variant="ghost"
              size="icon"
              aria-label={text('mobileMenuOpen')}
              aria-haspopup="dialog"
              onClick={(event) => {
                menuTriggerRef.current = event.currentTarget
                setMenuOpen(true)
              }}
            >
              <Menu aria-hidden="true" strokeWidth={1.1} />
            </Button>
          )}
        </div>
      </div>

      {isSignedIn && (
        <Sheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          title={text('mobileMenuTitle')}
          closeLabel={text('mobileMenuClose')}
          description={text('mobileMenuDescription')}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            menuTriggerRef.current?.focus()
          }}
        >
          <nav aria-label={text('mobileMenuTitle')} className="mobile-nav">
            {navItems.map((item) => (
              <AppLink
                key={item.label}
                className={cn(buttonVariants({ variant: 'ghost', size: 'large' }), 'mobile-nav__link')}
                route={item.route}
                aria-current={item.active ? 'page' : undefined}
                onNavigated={() => setMenuOpen(false)}
              >
                {item.label}
              </AppLink>
            ))}
            <div className="mobile-nav__locale">
              <LocaleSwitcher />
            </div>
            <Button
              className="mobile-nav__link"
              variant="ghost"
              size="large"
              aria-busy={signOutBusy}
              onClick={() => void signOut()}
            >
              {signOutBusy ? text('signingOut') : text('signOut')}
            </Button>
            {signOutError && <Notice tone="error" role="alert">{text('signOutFailed')}</Notice>}
          </nav>
        </Sheet>
      )}
    </header>
  )
}
