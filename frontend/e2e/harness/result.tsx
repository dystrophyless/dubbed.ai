import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/App.css'
import type { FeatureScreenProps, IdentityState } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import { ResultScreen } from '../../src/features/result/ResultScreen'
import { MEDIA_FIXTURES } from '../../src/media/fixtures'
import type {
  AccountId,
  GenerationId,
  MediaId,
  OperationId,
  OwnedProject,
  PlaybackDescriptor,
  ProjectId,
  ResultGeneration,
  ResultService,
  Revision,
  ServiceResult,
  Services,
} from '../../src/services/contracts'

type DownloadOutcome = Awaited<ReturnType<ResultService['requestDownload']>>
type DownloadInput = Parameters<ResultService['requestDownload']>[0]

interface DownloadCall {
  projectId: ProjectId
  displayedGenerationId: GenerationId
  operationId: OperationId
}

interface Journal {
  downloadCalls: DownloadCall[]
  assemblyCalls: number
  creditCalls: string[]
  operationCalls: string[]
  otherServiceCalls: string[]
}

interface ControlledResultHarnessApi {
  publishGeneration2(): void
  failFirstDownload(): void
  snapshot(): {
    downloadCalls: DownloadCall[]
    assemblyCalls: number
    creditCalls: string[]
    operationCalls: string[]
    otherServiceCalls: string[]
  }
}

declare global {
  interface Window {
    __controlledResultHarness?: ControlledResultHarnessApi
  }
}

const projectId = 'controlled-result-project' as ProjectId
const accountId = 'controlled-result-account' as AccountId

const generation1 = makeGeneration('controlled-generation-001', 1, 'resultGeneration1')
const generation2 = makeGeneration('controlled-generation-002', 2, 'resultGeneration2')

function makeGeneration(id: string, revision: number, fixtureKey: string): ResultGeneration {
  return {
    id: id as GenerationId,
    projectId,
    revision: revision as Revision,
    mediaId: `controlled-media-${revision}` as MediaId,
    durationMs: 8_600,
    width: 640,
    height: 360,
    current: revision === 1,
    fixtureKey,
    note: 'synthetic-mock-scenario',
  }
}

const project = {
  id: projectId,
  accountId,
  title: 'Controlled fixture project',
  revision: 1 as Revision,
  state: 'complete',
} as OwnedProject

function ok<T>(data: T): ServiceResult<T> {
  return { status: 'ok', data, replayed: false }
}

function terminalFailure(): DownloadOutcome {
  return {
    status: 'error',
    error: {
      code: 'adapter-unavailable',
      message: 'Controlled first-download failure.',
      retry: 'none',
    },
  }
}

function generationFor(id: GenerationId): ResultGeneration {
  if (id === generation1.id) return generation1
  if (id === generation2.id) return { ...generation2, current: true }
  throw new Error(`Unexpected generation requested: ${id}`)
}

function descriptor(generation: ResultGeneration): PlaybackDescriptor {
  const url = generation.id === generation1.id
    ? MEDIA_FIXTURES.resultGeneration1
    : MEDIA_FIXTURES.resultGeneration2
  return {
    projectId,
    generationId: generation.id,
    mediaId: generation.mediaId,
    url,
    mediaType: 'video/mp4',
    durationMs: generation.durationMs,
    revision: generation.revision,
    note: 'synthetic-mock-scenario',
  }
}

function createJournal(): Journal & {
  firstDownload: Promise<DownloadOutcome>
  failFirstDownload(): void
  requestDownload(input: DownloadInput): Promise<DownloadOutcome>
} {
  const publicJournal: Journal = {
    downloadCalls: [],
    assemblyCalls: 0,
    creditCalls: [],
    operationCalls: [],
    otherServiceCalls: [],
  }
  let resolveFirstDownload!: (result: DownloadOutcome) => void
  const firstDownload = new Promise<DownloadOutcome>((resolve) => {
    resolveFirstDownload = resolve
  })

  return {
    ...publicJournal,
    firstDownload,
    failFirstDownload() {
      resolveFirstDownload(terminalFailure())
    },
    async requestDownload(input) {
      publicJournal.downloadCalls.push({
        projectId: input.projectId,
        displayedGenerationId: input.displayedGenerationId,
        operationId: input.operationId,
      })
      if (publicJournal.downloadCalls.length === 1) return firstDownload

      const generation = generationFor(input.displayedGenerationId)
      const media = descriptor(generation)
      return ok({
        generationId: generation.id,
        descriptor: media,
        fileName: media.url.split('/').pop() ?? 'controlled-result.mp4',
      })
    },
  }
}

function createServices(
  currentGeneration: ResultGeneration,
  journal: ReturnType<typeof createJournal>,
): FeatureScreenProps['services'] {
  const unexpectedFailure = async () => {
    throw new Error('The controlled result harness received an unexpected service call.')
  }
  const errorResult = (): ServiceResult<never> => ({
    status: 'error',
    error: { code: 'adapter-unavailable', message: 'Unexpected assembly call.', retry: 'none' },
  })
  const results: ResultService = {
    async load() {
      return ok({ project, currentGeneration, retryAvailable: false })
    },
    async ensureAssembly() {
      journal.assemblyCalls += 1
      return errorResult()
    },
    async loadPlayback(input) {
      const generation = generationFor(input.displayedGenerationId)
      return ok({ generation, descriptor: descriptor(generation) })
    },
    async refreshPlayback(input) {
      const generation = generationFor(input.displayedGenerationId)
      return ok({ generation, descriptor: descriptor(generation) })
    },
    requestDownload: (input) => journal.requestDownload(input),
    async retry() {
      journal.assemblyCalls += 1
      return errorResult()
    },
  }

  const operations = new Proxy({}, {
    get(_target, property) {
      return async (...args: unknown[]) => {
        journal.operationCalls.push(`${String(property)}:${String(args[0] ?? '')}`)
        return unexpectedFailure()
      }
    },
  }) as unknown as Services['operations']

  const credits = new Proxy({}, {
    get(_target, property) {
      return async () => {
        journal.creditCalls.push(String(property))
        throw new Error(`Unexpected credits call: ${String(property)}`)
      }
    },
  }) as unknown as Services['credits']

  const serviceSubset = { results, operations, credits }
  return new Proxy(serviceSubset, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver)
      return new Proxy({}, {
        get(_service, method) {
          return async () => {
            journal.otherServiceCalls.push(`${String(property)}.${String(method)}`)
            throw new Error(`Unexpected service call: ${String(property)}.${String(method)}`)
          }
        },
      })
    },
  }) as unknown as FeatureScreenProps['services']
}

function ResultHarness() {
  const [currentGeneration, setCurrentGeneration] = useState(generation1)
  const journalRef = useRef<ReturnType<typeof createJournal> | null>(null)
  if (!journalRef.current) journalRef.current = createJournal()
  const journal = journalRef.current
  const services = useMemo(() => createServices(currentGeneration, journal), [currentGeneration, journal])

  useEffect(() => {
    window.__controlledResultHarness = {
      publishGeneration2() {
        setCurrentGeneration({ ...generation2, current: true })
      },
      failFirstDownload() {
        journal.failFirstDownload()
      },
      snapshot() {
        return {
          downloadCalls: journal.downloadCalls.map((call) => ({ ...call })),
          assemblyCalls: journal.assemblyCalls,
          creditCalls: [...journal.creditCalls],
          operationCalls: [...journal.operationCalls],
          otherServiceCalls: [...journal.otherServiceCalls],
        }
      },
    }
    return () => {
      delete window.__controlledResultHarness
    }
  }, [journal])

  const identity: IdentityState = { status: 'signed-out' }
  const props: FeatureScreenProps = {
    route: routes.project(projectId, 'result'),
    locale: 'en',
    identity,
    signInIntent: {} as FeatureScreenProps['signInIntent'],
    services,
    navigate: async () => true,
    refreshIdentity: async () => identity,
    registerRouteExitGuard: () => () => undefined,
  }

  return (
    <div className="app-shell">
      <main id="main-content" className="app-main">
        <ResultScreen {...props} />
      </main>
    </div>
  )
}

const mountNode = document.getElementById('root')
if (!mountNode) throw new Error('The controlled result harness root element is missing.')

createRoot(mountNode).render(<ResultHarness />)
