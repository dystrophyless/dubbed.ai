import { createContext, useContext } from 'react'
import type { AppNavigate, IdentityState, RegisterRouteExitGuard } from './screen-contract'
import type { AppRoute } from './routes'
import type { AccountSnapshot, Services } from '../services/contracts'

export interface AppContextValue {
  route: AppRoute
  locationKey: string
  services: Services
  identity: IdentityState
  onAccountUpdated?: (account: AccountSnapshot) => void
  navigate: AppNavigate
  refreshIdentity: () => Promise<IdentityState>
  registerRouteExitGuard: RegisterRouteExitGuard
}

export const AppContext = createContext<AppContextValue | null>(null)

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('App shell context is missing')
  return context
}

export function useAppNavigate(): AppNavigate {
  return useAppContext().navigate
}

export function useRegisterRouteExitGuard(): RegisterRouteExitGuard {
  return useAppContext().registerRouteExitGuard
}

export function useCurrentAppRoute(): AppRoute {
  return useAppContext().route
}
