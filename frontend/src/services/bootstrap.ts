import { createServices } from './index'
import type { Services } from './contracts'

export type ServiceAdapterSetting = 'mock' | 'real'

export interface RuntimeEnvironment {
  readonly VITE_SERVICE_ADAPTER?: string
}

export class RuntimeConfigurationError extends Error {
  readonly code = 'invalid-service-adapter'

  constructor(value: string) {
    super(`Unsupported VITE_SERVICE_ADAPTER value: ${value}`)
    this.name = 'RuntimeConfigurationError'
  }
}

/** An omitted setting selects only the local mock; explicit modes never fall back. */
export function createConfiguredServices(
  env: RuntimeEnvironment = import.meta.env,
): Services {
  const configured = env.VITE_SERVICE_ADAPTER
  const adapter = configured === undefined ? 'mock' : configured
  if (adapter !== 'mock' && adapter !== 'real') {
    throw new RuntimeConfigurationError(adapter)
  }
  return createServices({ adapter: adapter as ServiceAdapterSetting })
}
