import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createBrowserRouter,
  createPath,
  RouterProvider,
  useBlocker,
  useLocation,
  useNavigate,
} from 'react-router'
import { AppHeader } from './components/layout/AppHeader'
import { Button } from './components/ui/button'
import { AccountScreen } from './features/account/AccountScreen'
import { AccountLinkingScreen } from './features/account-linking/AccountLinkingScreen'
import { PasswordResetScreen } from './features/auth/PasswordResetScreen'
import { RegistrationScreen } from './features/auth/RegistrationScreen'
import { SignInScreen } from './features/auth/SignInScreen'
import { CreditsScreen } from './features/credits/CreditsScreen'
import { NewDubScreen } from './features/new-dub/NewDubScreen'
import { MicrophoneScreen } from './features/microphone/MicrophoneScreen'
import { ProcessingScreen } from './features/processing/ProcessingScreen'
import { ProjectsScreen } from './features/projects/ProjectsScreen'
import { RecordingScreen } from './features/recording/RecordingScreen'
import { ResultScreen } from './features/result/ResultScreen'
import { AppContext } from './app/context'
import { FeatureRoute } from './app/FeatureRoute'
import { LocaleProvider } from './app/locale'
import { useLocale } from './app/locale'
import { RouteFailure } from './app/RouteFailure'
import {
  routeFromLocation,
  routeTo,
  routes,
  requiresAuthentication,
  type AppRoute,
} from './app/routes'
import type { AccountSnapshot, ServiceError, Services } from './services/contracts'
import type { AppScreenSlots, IdentityState, NavigateOptions, RouteExitGuard } from './app/screen-contract'
import {
  clearPendingAccountDelete,
  readPendingAccountDelete,
  resolvePendingAccountDelete,
} from './features/account/delete-reconciliation'
import './App.css'

export interface AppProps {
  services: Services
  screens?: AppScreenSlots
}

interface RecordingEntryGateState {
  key: string
  ready: boolean
}

const defaultScreens: AppScreenSlots = {
  signIn: SignInScreen,
  registration: RegistrationScreen,
  passwordReset: PasswordResetScreen,
  account: AccountScreen,
  accountLinking: AccountLinkingScreen,
  newDub: NewDubScreen,
  projects: ProjectsScreen,
  processing: ProcessingScreen,
  microphone: MicrophoneScreen,
  recording: RecordingScreen,
  result: ResultScreen,
  credits: CreditsScreen,
}

const MAX_BROWSER_TIMEOUT_DELAY_MS = 2_147_483_647

function identityFromCode(
  code: ServiceError['code'] | 'unknown-operation' | 'unexpected',
  locationKey: string,
): IdentityState {
  return { status: 'error', code, checkedLocationKey: locationKey }
}

function AppFrame({ services, screens }: { services: Services; screens: AppScreenSlots }) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const route = useMemo(
    () => routeFromLocation(location.pathname, location.search, location.state),
    [location.pathname, location.search, location.state],
  )
  const [identity, setIdentity] = useState<IdentityState>({ status: 'checking' })
  const [accountDeleteRecovery, setAccountDeleteRecovery] = useState<'checking' | 'unresolved' | null>(null)
  const routeExitGuard = useRef<RouteExitGuard | null>(null)
  const authorizedPath = useRef<string | null>(null)
  const historyGuardTarget = useRef<string | null>(null)
  const recordingEntryOccurrence = useRef<{ baseKey: string | null; count: number }>({ baseKey: null, count: 0 })
  const [recordingEntryGate, setRecordingEntryGate] = useState<RecordingEntryGateState | null>(null)

  const recordingEntryBaseKey =
    route.kind === 'project' && route.screen === 'record' &&
    identity.status === 'signed-in' && identity.checkedLocationKey === location.key
      ? JSON.stringify([
          location.key,
          route.projectId,
          identity.account.id,
          identity.session.id,
          identity.session.revision,
          identity.session.expiresAt,
        ])
      : null
  if (recordingEntryOccurrence.current.baseKey !== recordingEntryBaseKey) {
    recordingEntryOccurrence.current = {
      baseKey: recordingEntryBaseKey,
      count: recordingEntryOccurrence.current.count + 1,
    }
  }
  const recordingEntryKey = recordingEntryBaseKey
    ? `${recordingEntryBaseKey}:${recordingEntryOccurrence.current.count}`
    : null
  const currentRecordingEntryKey = useRef(recordingEntryKey)
  currentRecordingEntryKey.current = recordingEntryKey

  const loadIdentity = useCallback(
    async (locationKey: string): Promise<IdentityState> => {
      const readCurrentIdentity = async (): Promise<IdentityState> => {
        try {
          const result = await services.identity.current()
          if (result.status === 'ok') {
            return result.data
              ? {
                  status: 'signed-in',
                  account: result.data.account,
                  session: result.data.session,
                  checkedLocationKey: locationKey,
                }
              : { status: 'signed-out', checkedLocationKey: locationKey }
          }
          if (result.status === 'error') return identityFromCode(result.error.code, locationKey)
          if (result.status === 'unknown') return identityFromCode('unknown-operation', locationKey)
          return identityFromCode('unexpected', locationKey)
        } catch {
          return identityFromCode('unexpected', locationKey)
        }
      }

      const marker = readPendingAccountDelete()
      if (marker) {
        setAccountDeleteRecovery('checking')
        const deletion = await resolvePendingAccountDelete(services, marker)
        if (deletion.state === 'completed') {
          const destination = routes.landing('account-deleted')
          const target = routeTo(destination)
          const targetPath = typeof target === 'string' ? target : createPath(target)
          authorizedPath.current = targetPath
          setAccountDeleteRecovery(null)
          const next: IdentityState = { status: 'signed-out', checkedLocationKey: locationKey }
          setIdentity(next)
          routerNavigate(target, { replace: true })
          return next
        }
        if (deletion.state === 'unknown' || deletion.state === 'unresolved') {
          const next = identityFromCode('unknown-operation', locationKey)
          setIdentity(next)
          setAccountDeleteRecovery('unresolved')
          return next
        }
        if (deletion.state === 'not-started') {
          const next = await readCurrentIdentity()
          if (next.status === 'signed-in' && next.account.id !== marker.accountId) {
            clearPendingAccountDelete(marker.operationId)
          }
          setAccountDeleteRecovery(null)
          setIdentity(next)
          return next
        }
      }

      setAccountDeleteRecovery(null)
      const next = await readCurrentIdentity()
      setIdentity(next)
      return next
    },
    [routerNavigate, services],
  )

  const refreshIdentity = useCallback(() => {
    setIdentity({ status: 'checking', checkedLocationKey: location.key })
    return loadIdentity(location.key)
  }, [loadIdentity, location.key])

  useEffect(() => {
    const isInitial = identity.checkedLocationKey === undefined
    const protectedLocationNeedsCheck =
      requiresAuthentication(route) && identity.checkedLocationKey !== location.key
    if (!isInitial && !protectedLocationNeedsCheck) return
    void loadIdentity(location.key)
  }, [identity.checkedLocationKey, loadIdentity, location.key, route])

  useEffect(() => {
    if (identity.status !== 'signed-in') return
    let timer: number | undefined
    const scheduleExpiryRefresh = () => {
      const remaining = identity.session.expiresAt - Date.now()
      if (remaining <= 0) {
        void refreshIdentity()
        return
      }
      timer = window.setTimeout(scheduleExpiryRefresh, Math.min(remaining, MAX_BROWSER_TIMEOUT_DELAY_MS))
    }
    scheduleExpiryRefresh()
    return () => {
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [identity, refreshIdentity])

  useEffect(() => {
    if (!recordingEntryKey || route.kind !== 'project' || route.screen !== 'record') {
      setRecordingEntryGate(null)
      return
    }

    let active = true
    const requestKey = recordingEntryKey
    const projectId = route.projectId
    const isCurrentEntry = () => active && currentRecordingEntryKey.current === requestKey
    setRecordingEntryGate({ key: requestKey, ready: false })

    const redirectToMicrophone = async () => {
      if (!isCurrentEntry()) return
      const destination = routes.microphoneForProject(projectId)
      const guard = routeExitGuard.current
      if (guard) {
        try {
          if (!(await guard({ from: route, to: destination, reason: 'navigation' }))) return
        } catch {
          return
        }
      }
      if (!isCurrentEntry()) return
      const destinationTo = routeTo(destination)
      const destinationPath = typeof destinationTo === 'string' ? destinationTo : createPath(destinationTo)
      authorizedPath.current = destinationPath
      routerNavigate(destinationTo, { replace: true })
    }

    void services.browserMedia.isRecordingEntryReady()
      .then((ready) => {
        if (!isCurrentEntry()) return
        if (ready) {
          setRecordingEntryGate({ key: requestKey, ready: true })
          return
        }
        return redirectToMicrophone()
      })
      .catch(() => redirectToMicrophone())

    return () => {
      active = false
    }
  }, [recordingEntryKey, route, routerNavigate, services.browserMedia])

  const registerRouteExitGuard = useCallback((guard: RouteExitGuard | null) => {
    if (guard) {
      routeExitGuard.current = guard
      return () => {
        if (routeExitGuard.current === guard) {
          routeExitGuard.current = null
        }
      }
    }
    routeExitGuard.current = null
    return () => undefined
  }, [])

  const navigate = useCallback(
    async (destination: AppRoute, options: NavigateOptions = {}): Promise<boolean> => {
      const destinationTo = routeTo(destination)
      const destinationPath =
        typeof destinationTo === 'string' ? destinationTo : createPath(destinationTo)
      const currentPath = createPath(location)
      if (destinationPath === currentPath) return true

      const guard = routeExitGuard.current
      if (guard) {
        try {
          const allowed = await guard({ from: route, to: destination, reason: 'navigation' })
          if (!allowed) return false
        } catch {
          return false
        }
      }

      if (options.beforeCommit) {
        try {
          if (!(await options.beforeCommit())) return false
        } catch {
          return false
        }
      }

      authorizedPath.current = destinationPath
      routerNavigate(destinationTo, { replace: options.replace })
      return true
    },
    [location, route, routerNavigate],
  )

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const nextPath = createPath(nextLocation)
    if (authorizedPath.current === nextPath) {
      authorizedPath.current = null
      return false
    }
    return routeExitGuard.current !== null && createPath(currentLocation) !== nextPath
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const target = blocker.location
    const targetKey = target.pathname + target.search + target.hash
    if (historyGuardTarget.current === targetKey) return
    historyGuardTarget.current = targetKey
    const guard = routeExitGuard.current
    if (!guard) {
      blocker.proceed()
      historyGuardTarget.current = null
      return
    }
    const targetRoute = routeFromLocation(target.pathname, target.search, target.state)
    void Promise.resolve(guard({ from: route, to: targetRoute, reason: 'browser-history' }))
      .then((allowed) => {
        if (allowed) blocker.proceed()
        else blocker.reset()
      })
      .catch(() => blocker.reset())
      .finally(() => {
        if (historyGuardTarget.current === targetKey) historyGuardTarget.current = null
      })
  }, [blocker, route])

  const onAccountUpdated = useCallback((account: AccountSnapshot) => {
    setIdentity((current) => {
      if (
        current.status !== 'signed-in' ||
        current.account.id !== account.id ||
        account.deleted ||
        account.revision < current.account.revision
      ) return current
      return { ...current, account }
    })
  }, [])

  const contextValue = useMemo(
    () => ({
      route,
      locationKey: location.key,
      services,
      identity,
      onAccountUpdated,
      navigate,
      refreshIdentity,
      registerRouteExitGuard,
    }),
    [
      identity,
      location.key,
      navigate,
      onAccountUpdated,
      refreshIdentity,
      registerRouteExitGuard,
      route,
      services,
    ],
  )

  return (
    <AppContext.Provider value={contextValue}>
      <LocaleProvider
        account={identity.status === 'signed-in' ? identity.account : undefined}
        services={services}
        onAccountUpdated={onAccountUpdated}
      >
        <AppContents
          screens={screens}
          accountDeleteRecovery={accountDeleteRecovery}
          retryAccountDeleteResolution={() => void refreshIdentity()}
          recordingEntryKey={recordingEntryKey}
          recordingEntryGate={recordingEntryGate}
        />
      </LocaleProvider>
    </AppContext.Provider>
  )
}

function AppContents({
  screens,
  accountDeleteRecovery,
  retryAccountDeleteResolution,
  recordingEntryKey,
  recordingEntryGate,
}: {
  screens: AppScreenSlots
  accountDeleteRecovery: 'checking' | 'unresolved' | null
  retryAccountDeleteResolution: () => void
  recordingEntryKey: string | null
  recordingEntryGate: RecordingEntryGateState | null
}) {
  const { locale, text } = useLocale()
  if (accountDeleteRecovery) {
    return (
      <div className="app-shell">
        <a className="skip-link" href="#main-content">{text('skipToContent')}</a>
        <main id="main-content" className="app-main">
          <section
            className="account-delete-recovery"
            role={accountDeleteRecovery === 'checking' ? 'status' : 'alert'}
          >
            <h1>{text('accountDeleteRecoveryTitle')}</h1>
            <p>
              {text(
                accountDeleteRecovery === 'checking'
                  ? 'accountDeleteRecoveryChecking'
                  : 'accountDeleteRecoveryUnknown',
              )}
            </p>
            {accountDeleteRecovery === 'unresolved' && (
              <Button variant="secondary" onClick={retryAccountDeleteResolution}>
                {text('accountDeleteRecoveryRetry')}
              </Button>
            )}
          </section>
        </main>
      </div>
    )
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{text('skipToContent')}</a>
      <AppHeader />
      <main id="main-content" className="app-main">
        {recordingEntryKey &&
        (recordingEntryGate?.key !== recordingEntryKey || !recordingEntryGate.ready) ? (
          <p className="route-status" role="status">
            {locale === 'ru' ? 'Проверяем доступность микрофона…' : 'Checking microphone availability…'}
          </p>
        ) : (
          <FeatureRoute screens={screens} />
        )}
      </main>
    </div>
  )
}

export default function App({ services, screens = {} }: AppProps) {
  const resolvedScreens = useMemo(() => ({ ...defaultScreens, ...screens }), [screens])
  const router = useMemo(
    () =>
      createBrowserRouter([
        {
          path: '*',
          element: <AppFrame services={services} screens={resolvedScreens} />,
          errorElement: <RouteFailure />,
        },
      ]),
    [resolvedScreens, services],
  )
  return <RouterProvider router={router} />
}

