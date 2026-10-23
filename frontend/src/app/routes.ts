import type { To } from 'react-router'
import { ids, type ProjectId, type SignInIntent } from '../services/contracts'

export type Locale = 'en' | 'ru'
export type ProjectScreen = 'processing' | 'record' | 'result'
export type MicrophoneOrigin = 'new' | 'project'

export type AppRoute =
  | { kind: 'landing'; notice?: 'signed-out' | 'account-deleted' }
  | { kind: 'sign-in'; intent: SignInIntent }
  | { kind: 'registration' }
  | { kind: 'password-reset'; intent: SignInIntent }
  | { kind: 'account-linking' }
  | { kind: 'new-dub' }
  | { kind: 'projects' }
  | { kind: 'project'; projectId: ProjectId; screen: ProjectScreen }
  | { kind: 'microphone'; origin: 'new' }
  | { kind: 'microphone'; origin: 'project'; projectId: ProjectId }
  | { kind: 'credits' }
  | { kind: 'account' }
  | { kind: 'not-found' }

export type MicrophoneRoute = Extract<AppRoute, { kind: 'microphone' }>

const projectIdPattern = /^[A-Za-z0-9_-]{1,128}$/

export function parseProjectId(value: string | undefined): ProjectId | null {
  if (!value || !projectIdPattern.test(value)) return null
  return ids.project(value)
}

export const routes = {
  landing: (notice?: Extract<AppRoute, { kind: 'landing' }>['notice']): AppRoute =>
    notice ? { kind: 'landing', notice } : { kind: 'landing' },
  signIn: (intent: SignInIntent = { kind: 'new-dub' }): AppRoute => ({
    kind: 'sign-in',
    intent,
  }),
  registration: (): AppRoute => ({ kind: 'registration' }),
  passwordReset: (intent: SignInIntent = { kind: 'new-dub' }): AppRoute => ({
    kind: 'password-reset',
    intent: parseSignInIntent(intent),
  }),
  accountLinking: (): AppRoute => ({ kind: 'account-linking' }),
  newDub: (): AppRoute => ({ kind: 'new-dub' }),
  projects: (): AppRoute => ({ kind: 'projects' }),
  project: (projectId: ProjectId, screen: ProjectScreen): AppRoute => {
    if (!parseProjectId(projectId)) throw new RangeError('Invalid project route id')
    return { kind: 'project', projectId, screen }
  },
  microphoneFromNew: (): AppRoute => ({ kind: 'microphone', origin: 'new' }),
  microphoneForProject: (projectId: ProjectId): AppRoute => {
    if (!parseProjectId(projectId)) throw new RangeError('Invalid microphone project id')
    return { kind: 'microphone', origin: 'project', projectId }
  },
  credits: (): AppRoute => ({ kind: 'credits' }),
  account: (): AppRoute => ({ kind: 'account' }),
}

export function routeTo(route: AppRoute): To {
  switch (route.kind) {
    case 'landing':
      return {
        pathname: '/',
        search: route.notice ? `?notice=${route.notice}` : '',
      }
    case 'sign-in':
      return route.intent.kind === 'resume-project-screen'
        ? {
            pathname: '/sign-in',
            search: `?intent=project&projectId=${encodeURIComponent(route.intent.projectId)}&screen=${route.intent.screen}`,
          }
        : '/sign-in'
    case 'registration':
      return '/register'
    case 'password-reset':
      return route.intent.kind === 'resume-project-screen'
        ? {
            pathname: '/reset-password',
            search: `?intent=project&projectId=${encodeURIComponent(route.intent.projectId)}&screen=${route.intent.screen}`,
          }
        : '/reset-password'
    case 'account-linking':
      return '/account-linking'
    case 'new-dub':
      return '/new'
    case 'projects':
      return '/projects'
    case 'project':
      return `/projects/${encodeURIComponent(route.projectId)}/${route.screen}`
    case 'microphone':
      return route.origin === 'project'
        ? `/microphone?origin=project&projectId=${encodeURIComponent(route.projectId)}`
        : '/microphone?origin=new'
    case 'credits':
      return '/credits'
    case 'account':
      return '/account'
    case 'not-found':
      return '/404'
  }
}

export function parseSignInIntent(value: unknown): SignInIntent {
  if (!value || typeof value !== 'object') return { kind: 'new-dub' }
  const intent = value as Record<string, unknown>
  if (intent.kind === 'new-dub') return { kind: 'new-dub' }
  if (
    intent.kind === 'resume-project-screen' &&
    typeof intent.projectId === 'string' &&
    (intent.screen === 'processing' || intent.screen === 'record' || intent.screen === 'result')
  ) {
    const projectId = parseProjectId(intent.projectId)
    if (projectId) {
      return { kind: 'resume-project-screen', projectId, screen: intent.screen }
    }
  }
  return { kind: 'new-dub' }
}

export function signInIntentForRoute(route: AppRoute): SignInIntent {
  return route.kind === 'project'
    ? { kind: 'resume-project-screen', projectId: route.projectId, screen: route.screen }
    : { kind: 'new-dub' }
}

export function routeForSignInIntent(intent: SignInIntent): AppRoute {
  const safeIntent = parseSignInIntent(intent)
  return safeIntent.kind === 'resume-project-screen'
    ? routes.project(safeIntent.projectId, safeIntent.screen)
    : routes.newDub()
}

export function routeFromLocation(
  pathname: string,
  search = '',
  state?: unknown,
): AppRoute {
  if (pathname === '/') {
    const params = new URLSearchParams(search)
    const notice =
      state && typeof state === 'object'
        ? (state as Record<string, unknown>).landingNotice
        : undefined
    const queryNotice = params.get('notice')
    const safeNotice = notice === 'signed-out' || notice === 'account-deleted' ? notice : queryNotice
    return safeNotice === 'signed-out' || safeNotice === 'account-deleted'
      ? routes.landing(safeNotice)
      : routes.landing()
  }
  if (pathname === '/sign-in') {
    const params = new URLSearchParams(search)
    const intent =
      state && typeof state === 'object'
        ? (state as Record<string, unknown>).signInIntent
        : undefined
    const stateIntent = parseSignInIntent(intent)
    if (stateIntent.kind === 'resume-project-screen') return routes.signIn(stateIntent)
    if (params.get('intent') === 'project') {
      return routes.signIn(
        parseSignInIntent({
          kind: 'resume-project-screen',
          projectId: params.get('projectId'),
          screen: params.get('screen'),
        }),
      )
    }
    return routes.signIn({ kind: 'new-dub' })
  }
  if (pathname === '/register') return routes.registration()
  if (pathname === '/reset-password') {
    const params = new URLSearchParams(search)
    const stateIntent =
      state && typeof state === 'object'
        ? parseSignInIntent((state as Record<string, unknown>).resetIntent)
        : { kind: 'new-dub' as const }
    if (stateIntent.kind === 'resume-project-screen') return routes.passwordReset(stateIntent)
    if (params.get('intent') === 'project') {
      return routes.passwordReset(
        parseSignInIntent({
          kind: 'resume-project-screen',
          projectId: params.get('projectId'),
          screen: params.get('screen'),
        }),
      )
    }
    return routes.passwordReset()
  }
  if (pathname === '/account-linking') return routes.accountLinking()
  if (pathname === '/new') return routes.newDub()
  if (pathname === '/projects') return routes.projects()
  if (pathname === '/credits') return routes.credits()
  if (pathname === '/account') return routes.account()

  const projectMatch = pathname.match(/^\/projects\/([^/]+)\/(processing|record|result)$/)
  if (projectMatch) {
    let rawId: string
    try {
      rawId = decodeURIComponent(projectMatch[1])
    } catch {
      return { kind: 'not-found' }
    }
    const projectId = parseProjectId(rawId)
    if (!projectId) return { kind: 'not-found' }
    return routes.project(projectId, projectMatch[2] as ProjectScreen)
  }

  if (pathname === '/microphone') {
    const params = new URLSearchParams(search)
    if (params.get('origin') === 'new' && !params.has('projectId')) {
      return routes.microphoneFromNew()
    }
    if (params.get('origin') === 'project') {
      const projectId = parseProjectId(params.get('projectId') ?? undefined)
      if (projectId) return routes.microphoneForProject(projectId)
    }
  }
  return { kind: 'not-found' }
}

export function requiresAuthentication(route: AppRoute): boolean {
  return (
    route.kind === 'new-dub' ||
    route.kind === 'projects' ||
    route.kind === 'project' ||
    route.kind === 'microphone' ||
    route.kind === 'credits' ||
    route.kind === 'account'
  )
}
