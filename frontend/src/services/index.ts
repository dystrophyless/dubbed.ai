import type { MockGoogleScenario, ServiceAdapterKind, ServiceClock, Services } from './contracts'
import { openWorkspaceDatabase } from './indexeddb'
import { createBrowserMediaService } from './browser-media'
import { createMockCredits } from './mock-credits'
import { createMockIdentity } from './mock-identity'
import { createMockOperations } from './mock-operations'
import { createMockPreparation } from './mock-preparation'
import { createMockPreviews } from './mock-previews'
import { createMockProjects } from './mock-projects'
import { createMockRecording } from './mock-recording'
import { createMockResults } from './mock-results'
import { createMockWorkspace } from './mock-workspace'
import type { StoreContext } from './mock-store'

export interface CreateServicesOptions {
  adapter?: ServiceAdapterKind
  clock?: ServiceClock
  namespace?: string
  clientId?: string
  scenario?: string
  googleScenario?: MockGoogleScenario
  indexedDB?: IDBFactory
}

export class ServiceAdapterUnavailableError extends Error {
  readonly code = 'adapter-unavailable' as const

  constructor(message = 'The real service adapter is not available in this frontend build.') {
    super(message)
    this.name = 'ServiceAdapterUnavailableError'
  }
}

export class MockWorkspaceUnavailableError extends Error {
  readonly code = 'storage-unavailable' as const

  constructor(message = 'IndexedDB is required for the persistent mock workspace.') {
    super(message)
    this.name = 'MockWorkspaceUnavailableError'
  }
}

const systemClock: ServiceClock = { now: () => Date.now() }

function createMockServiceContext(options: CreateServicesOptions): StoreContext {
  const factory = options.indexedDB ?? globalThis.indexedDB
  if (!factory) throw new MockWorkspaceUnavailableError()
  const namespace = options.namespace?.trim() || 'default'
  const clientId = options.clientId?.trim() || resolveClientId(namespace)
  const dbName = `dubbed.mock.v1.${namespace}`
  return {
    database: openWorkspaceDatabase(factory, dbName),
    factory,
    dbName,
    clientId,
    clock: options.clock ?? systemClock,
    scenario: options.scenario ?? 'default',
    googleScenario: options.googleScenario ?? 'default',
  }
}

function resolveClientId(namespace: string): string {
  const storageKey = `dubbed.mock.client.v1.${namespace}`
  try {
    const storage = globalThis.localStorage
    const existing = storage.getItem(storageKey)
    if (existing) return existing
    const created = crypto.randomUUID()
    storage.setItem(storageKey, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}

/** Builds the selected service adapter. Real mode fails explicitly until a real transport exists. */
export function createServices(options: CreateServicesOptions = {}): Services {
  const adapter = options.adapter ?? 'mock'
  if (adapter === 'real') throw new ServiceAdapterUnavailableError()

  const context = createMockServiceContext(options)
  const identity = createMockIdentity(context)
  const preparation = createMockPreparation(context)
  const projects = createMockProjects(context, preparation.reconcileBackground)
  const previews = createMockPreviews(context)

  return {
    ...identity,
    ...projects,
    previews,
    preparation,
    credits: createMockCredits(context),
    recording: createMockRecording(context),
    results: createMockResults(context),
    browserMedia: createBrowserMediaService(context.clock),
    operations: createMockOperations(context),
    workspace: createMockWorkspace(context),
  }
}

export type { MockGoogleScenario, ServiceAdapterKind, ServiceClock, Services } from './contracts'
export * from './contracts'
