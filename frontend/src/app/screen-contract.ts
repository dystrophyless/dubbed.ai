import type { ComponentType } from 'react'
import type {
  AccountSnapshot,
  ServiceError,
  Services,
  Session,
  SignInIntent,
} from '../services/contracts'
import type { AppRoute, Locale } from './routes'

export type IdentityState =
  | { status: 'checking'; checkedLocationKey?: string }
  | {
      status: 'signed-in'
      account: AccountSnapshot
      session: Session
      checkedLocationKey?: string
    }
  | { status: 'signed-out'; checkedLocationKey?: string }
  | { status: 'error'; code: ServiceError['code'] | 'unknown-operation' | 'unexpected'; checkedLocationKey?: string }

export interface RouteExitRequest {
  from: AppRoute
  to: AppRoute
  reason: 'navigation' | 'browser-history'
}

/** Return true only after the feature has resolved its exact leave choice durably. */
export type RouteExitGuard = (request: RouteExitRequest) => Promise<boolean> | boolean

export interface NavigateOptions {
  replace?: boolean
  /** Runs after an approved route-exit guard and before the destination is committed. */
  beforeCommit?: () => Promise<boolean>
}

export type AppNavigate = (route: AppRoute, options?: NavigateOptions) => Promise<boolean>
export type RegisterRouteExitGuard = (guard: RouteExitGuard | null) => () => void

export interface FeatureScreenProps {
  route: AppRoute
  locale: Locale
  identity: IdentityState
  onAccountUpdated?: (account: AccountSnapshot) => void
  signInIntent: SignInIntent
  services: Services
  navigate: AppNavigate
  refreshIdentity: () => Promise<IdentityState>
  registerRouteExitGuard: RegisterRouteExitGuard
}

export type AppScreenName =
  | 'signIn'
  | 'registration'
  | 'passwordReset'
  | 'accountLinking'
  | 'newDub'
  | 'projects'
  | 'processing'
  | 'microphone'
  | 'recording'
  | 'result'
  | 'credits'
  | 'account'

export type AppScreenSlots = Partial<Record<AppScreenName, ComponentType<FeatureScreenProps>>>
