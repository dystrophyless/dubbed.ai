import { useEffect } from 'react'
import { AppLink } from './AppLink'
import { useAppContext } from './context'
import { routes, signInIntentForRoute, type AppRoute } from './routes'
import { useLocale } from './locale'
import type { AppScreenName, AppScreenSlots } from './screen-contract'
import { Button } from '../components/ui/button'
import { ServiceNotice } from '../components/ui/notice'
import { LandingScreen } from '../components/landing/LandingScreen'

function screenNameFor(route: AppRoute): AppScreenName | null {
  switch (route.kind) {
    case 'sign-in': return 'signIn'
    case 'registration': return 'registration'
    case 'password-reset': return 'passwordReset'
    case 'account-linking': return 'accountLinking'
    case 'new-dub': return 'newDub'
    case 'projects': return 'projects'
    case 'project':
      return route.screen === 'processing' ? 'processing' : route.screen === 'record' ? 'recording' : 'result'
    case 'microphone': return 'microphone'
    case 'credits': return 'credits'
    case 'account': return 'account'
    default: return null
  }
}

function routeTitleKey(route: AppRoute) {
  switch (route.kind) {
    case 'sign-in': return 'signInTitle'
    case 'registration': return 'registrationTitle'
    case 'password-reset': return 'passwordResetTitle'
    case 'account-linking': return 'accountLinkingTitle'
    case 'new-dub': return 'newDubTitle'
    case 'projects': return 'projectsTitle'
    case 'project': return route.screen === 'processing' ? 'processingTitle' : route.screen === 'record' ? 'recordingTitle' : 'resultTitle'
    case 'microphone': return 'microphoneTitle'
    case 'credits': return 'creditsTitle'
    case 'account': return 'accountTitle'
    default: return 'notFoundTitle'
  }
}

function FeaturePlaceholder({ route }: { route: AppRoute }) {
  const { text } = useLocale()
  const title = text(routeTitleKey(route))
  const content = route.kind === 'account-linking'
    ? text('accountLinkingDescription')
    : text('unavailableFeature')

  return (
    <section className="feature-placeholder" aria-labelledby="feature-title">
      <h1 id="feature-title">{title}</h1>
      <p>{content}</p>
      {route.kind === 'sign-in' && (
        <div className="placeholder-links">
          <AppLink route={routes.registration()}>{text('registrationTitle')}</AppLink>
          <AppLink route={routes.passwordReset(route.intent)}>{text('passwordResetTitle')}</AppLink>
        </div>
      )}
      {route.kind === 'registration' && <AppLink route={routes.signIn()}>{text('signIn')}</AppLink>}
    </section>
  )
}

function RouteScreen({ route, screens }: { route: AppRoute; screens: AppScreenSlots }) {
  const { services, identity, onAccountUpdated, navigate, refreshIdentity, registerRouteExitGuard } = useAppContext()
  const { locale } = useLocale()
  const name = screenNameFor(route)
  const Screen = name ? screens[name] : undefined

  if (!Screen) return <FeaturePlaceholder route={route} />
  const props = {
    route,
    locale,
    identity,
    onAccountUpdated,
    signInIntent:
      route.kind === 'sign-in' || route.kind === 'password-reset'
        ? route.intent
        : signInIntentForRoute(route),
    services,
    navigate,
    refreshIdentity,
    registerRouteExitGuard,
  }

  if (route.kind === 'account-linking' && identity.status !== 'signed-in') {
    return <FeaturePlaceholder route={route} />
  }

  const screenKey = route.kind === 'project' ? `${route.projectId}:${route.screen}` : route.kind
  return <div lang={locale}><Screen key={screenKey} {...props} /></div>
}

function ProtectedRouteScreen({ route, screens }: { route: AppRoute; screens: AppScreenSlots }) {
  const { identity, locationKey, refreshIdentity, navigate } = useAppContext()
  const { text, locale } = useLocale()

  useEffect(() => {
    if (identity.status === 'signed-out' && identity.checkedLocationKey === locationKey) {
      void navigate(routes.signIn(signInIntentForRoute(route)), { replace: true })
    }
  }, [identity, locationKey, navigate, route])

  if (identity.status === 'checking' || identity.checkedLocationKey !== locationKey) {
    return <p className="route-status" role="status">{text('checkingSession')}</p>
  }
  if (identity.status === 'error') {
    return (
      <section className="route-error" lang={locale}>
        <ServiceNotice code={identity.code} />
        <Button variant="secondary" onClick={() => void refreshIdentity()}>{text('retry')}</Button>
      </section>
    )
  }
  if (identity.status === 'signed-out') {
    return <p className="route-status" role="status">{text('sessionRedirecting')}</p>
  }
  return <RouteScreen route={route} screens={screens} />
}

export function FeatureRoute({ screens }: { screens: AppScreenSlots }) {
  const { route } = useAppContext()
  const { text } = useLocale()

  if (route.kind === 'landing') {
    return <LandingScreen />
  }
  if (route.kind === 'not-found') {
    return (
      <section className="feature-placeholder">
        <h1>{text('notFoundTitle')}</h1>
        <p>{text('notFoundDescription')}</p>
        <AppLink route={routes.landing()}>{text('home')}</AppLink>
      </section>
    )
  }
  if (route.kind === 'new-dub' || route.kind === 'projects' || route.kind === 'project' ||
      route.kind === 'microphone' || route.kind === 'credits' || route.kind === 'account') {
    return <ProtectedRouteScreen route={route} screens={screens} />
  }
  return <RouteScreen route={route} screens={screens} />
}

