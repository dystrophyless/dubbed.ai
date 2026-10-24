import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/App.css'
import { routes } from '../../src/app/routes'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { ResultScreen } from '../../src/features/result/ResultScreen'
import { MEDIA_FIXTURES } from '../../src/media/fixtures'
import { createServices } from '../../src/services'
import {
  asRevision,
  type AccountId,
  type GenerationId,
  type MediaId,
  type OperationId,
  type OperationSnapshot,
  type OwnedProject,
  type PlaybackDescriptor,
  type ProjectId,
  type ResultGeneration,
  type ResultService,
  type ServiceResult,
  type Services,
} from '../../src/services/contracts'

type Scenario =
  | 'assembly-progress-known'
  | 'assembly-progress-untrusted'
  | 'assembly-retry-unknown'
  | 'playback-network-error'
  | 'playback-expired-descriptor'

type RetryInput = Parameters<ResultService['retry']>[0]
type PlaybackInput = Parameters<ResultService['loadPlayback']>[0]
type RefreshInput = Parameters<ResultService['refreshPlayback']>[0]

interface Journal {
  loadCalls: number
  loadPlaybackCalls: PlaybackInput[]
  refreshPlaybackCalls: RefreshInput[]
  ensureAssemblyCalls: number
  retryCalls: RetryInput[]
  downloadCalls: string[]
  creditCalls: string[]
}

interface HarnessSnapshot extends Journal {}

interface HarnessApi {
  snapshot(): HarnessSnapshot
  releaseFirstRetry(): boolean
}

declare global {
  interface Window {
    __resultDeliveryState?: HarnessApi
  }
}

const params = new URLSearchParams(window.location.search)
const scenario = params.get('scenario') as Scenario | null
const locale = params.get('locale') === 'ru' ? 'ru' : 'en'
const allowedScenarios: Scenario[] = [
  'assembly-progress-known',
  'assembly-progress-untrusted',
  'assembly-retry-unknown',
  'playback-network-error',
  'playback-expired-descriptor',
]
if (!scenario || !allowedScenarios.includes(scenario)) {
  throw new Error(`Unknown result delivery state scenario: ${String(scenario)}`)
}

const projectId = 'result-state-project' as ProjectId
const accountId = 'result-state-account' as AccountId
const generation: ResultGeneration = {
  id: 'result-state-generation-001' as GenerationId,
  projectId,
  revision: asRevision(7),
  mediaId: 'result-state-media-001' as MediaId,
  durationMs: 8_600,
  width: 640,
  height: 360,
  current: true,
  fixtureKey: 'resultGeneration1',
  note: 'synthetic-mock-scenario',
}

const baseProject: OwnedProject = {
  id: projectId,
  accountId,
  title: 'Synthetic result delivery fixture',
  revision: asRevision(9),
  state: 'complete',
}

function ok<T>(data: T): ServiceResult<T> {
  return { status: 'ok', data, replayed: false }
}

function unknown<T>(operationId: OperationId, message: string): ServiceResult<T> {
  return { status: 'unknown', operationId, message }
}

function unavailable<T>(): ServiceResult<T> {
  return {
    status: 'error',
    error: {
      code: 'adapter-unavailable',
      message: 'Unexpected call in the synthetic Result state fixture.',
      retry: 'none',
    },
  }
}

function assemblyOperation(
  operationId: string,
  state: OperationSnapshot['state'],
  percentage?: { value: number; trusted: boolean },
): OperationSnapshot {
  return {
    id: operationId as OperationId,
    accountId,
    kind: 'result.assembly',
    state,
    revision: asRevision(4),
    updatedAt: Date.now(),
    ...(percentage ? { result: { percentage } } : {}),
    ...(state === 'rejected'
      ? {
          error: {
            code: 'adapter-unavailable',
            message: 'Synthetic prior assembly attempt failed.',
            retry: 'none' as const,
          },
        }
      : {}),
  }
}

function currentPlaybackUrl(): string {
  return scenario === 'playback-expired-descriptor'
    ? '/__fixture__/expired-playback-descriptor/result-state-generation-001.mp4'
    : '/__fixture__/delivery-network-error/result-state-generation-001.mp4'
}

function descriptor(target: ResultGeneration, url: string): PlaybackDescriptor {
  return {
    projectId,
    generationId: target.id,
    mediaId: target.mediaId,
    url,
    mediaType: 'video/mp4',
    durationMs: target.durationMs,
    revision: target.revision,
    note: 'synthetic-mock-scenario',
  }
}

function loadResult(): ServiceResult<{
  project: OwnedProject
  currentGeneration?: ResultGeneration
  operation?: OperationSnapshot
  retryLineageId?: OperationId
  retryAvailable: boolean
}> {
  if (scenario === 'assembly-progress-known') {
    return ok({
      project: { ...baseProject, state: 'assembling' },
      operation: assemblyOperation('result-state-progress-operation', 'pending', { value: 42, trusted: true }),
      retryAvailable: false,
    })
  }

  if (scenario === 'assembly-progress-untrusted') {
    return ok({
      project: { ...baseProject, state: 'assembling' },
      operation: assemblyOperation('result-state-untrusted-progress-operation', 'pending', { value: 67, trusted: false }),
      retryAvailable: false,
    })
  }

  if (scenario === 'assembly-retry-unknown') {
    return ok({
      project: { ...baseProject, state: 'failed' },
      operation: assemblyOperation('result-state-prior-failed-operation', 'rejected'),
      retryLineageId: 'result-state-retry-lineage' as OperationId,
      retryAvailable: true,
    })
  }

  return ok({ project: baseProject, currentGeneration: generation, retryAvailable: false })
}

const journal: Journal = {
  loadCalls: 0,
  loadPlaybackCalls: [],
  refreshPlaybackCalls: [],
  ensureAssemblyCalls: 0,
  retryCalls: [],
  downloadCalls: [],
  creditCalls: [],
}

let resolveFirstRetry: ((result: ServiceResult<OperationSnapshot>) => void) | null = null

const base = createServices({ namespace: `result-delivery-state-${crypto.randomUUID()}` })
const results: ResultService = {
  ...base.results,
  async load() {
    journal.loadCalls += 1
    return loadResult()
  },
  async ensureAssembly() {
    journal.ensureAssemblyCalls += 1
    return unavailable<OperationSnapshot>()
  },
  async loadPlayback(input) {
    journal.loadPlaybackCalls.push({ ...input })
    if (input.displayedGenerationId !== generation.id) throw new Error('Unexpected playback generation requested.')
    return ok({ generation, descriptor: descriptor(generation, currentPlaybackUrl()) })
  },
  async refreshPlayback(input) {
    journal.refreshPlaybackCalls.push({ ...input })
    if (input.displayedGenerationId !== generation.id) throw new Error('Unexpected refresh generation requested.')
    return ok({ generation, descriptor: descriptor(generation, MEDIA_FIXTURES.resultGeneration1) })
  },
  async retry(input) {
    journal.retryCalls.push({ ...input })
    if (scenario === 'assembly-retry-unknown' && journal.retryCalls.length === 1) {
      return new Promise((resolve) => {
        resolveFirstRetry = resolve
      })
    }
    return unknown<OperationSnapshot>(input.operationId, 'Synthetic assembly retry result is not yet confirmed.')
  },
  async requestDownload(input) {
    journal.downloadCalls.push(input.displayedGenerationId)
    return unavailable()
  },
}

const credits = new Proxy(base.credits, {
  get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver)
    if (typeof value !== 'function') return value
    return (...args: unknown[]) => {
      journal.creditCalls.push(String(property))
      return Reflect.apply(value, target, args)
    }
  },
})

const services: Services = { ...base, results, credits }
const identity: FeatureScreenProps['identity'] = { status: 'signed-out' }
const props: FeatureScreenProps = {
  route: routes.project(projectId, 'result'),
  locale,
  identity,
  signInIntent: {} as FeatureScreenProps['signInIntent'],
  services,
  navigate: async () => true,
  refreshIdentity: async () => identity,
  registerRouteExitGuard: () => () => undefined,
}

window.__resultDeliveryState = {
  snapshot() {
    return {
      loadCalls: journal.loadCalls,
      loadPlaybackCalls: journal.loadPlaybackCalls.map((call) => ({ ...call })),
      refreshPlaybackCalls: journal.refreshPlaybackCalls.map((call) => ({ ...call })),
      ensureAssemblyCalls: journal.ensureAssemblyCalls,
      retryCalls: journal.retryCalls.map((call) => ({ ...call })),
      downloadCalls: [...journal.downloadCalls],
      creditCalls: [...journal.creditCalls],
    }
  },
  releaseFirstRetry() {
    if (!resolveFirstRetry) return false
    const resolve = resolveFirstRetry
    resolveFirstRetry = null
    resolve(unknown<OperationSnapshot>(journal.retryCalls[0].operationId, 'Synthetic assembly retry result is not yet confirmed.'))
    return true
  },
}

export function ResultDeliveryStateHarness() {
  return (
    <div className="app-shell">
      <main id="main-content" className="app-main">
        <div lang={locale}>
          <ResultScreen {...props} />
        </div>
      </main>
    </div>
  )
}

const mountNode = document.getElementById('root')
if (!mountNode) throw new Error('The Result delivery state fixture root element is missing.')

createRoot(mountNode).render(<ResultDeliveryStateHarness />)
