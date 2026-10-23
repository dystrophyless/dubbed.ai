import { useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/index.css'
import '../../src/App.css'
import { LocaleProvider } from '../../src/app/locale'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import { ProcessingScreen } from '../../src/features/processing/ProcessingScreen'
import type {
  AccountId,
  CancellationQuote,
  OperationId,
  OperationSnapshot,
  PreparationId,
  PreparationSnapshot,
  ProjectId,
  QuoteId,
  ServiceResult,
  Services,
} from '../../src/services/contracts'
import { asRevision, ids } from '../../src/services/contracts'

type Locale = 'en' | 'ru'
type Scenario =
  | 'queued'
  | 'running-unknown'
  | 'running-known'
  | 'retry-failure'
  | 'zero-turn-initial'
  | 'zero-turn-prior'
  | 'cancellation-quote'
  | 'cancellation-expired-refresh'
  | 'cancellation-quote-same-operation'
  | 'cancellation-quote-reconcile-first'
  | 'cancellation-quote-no-retry'
  | 'cancellation-pending'

interface QuoteCall {
  quoteId: string | null
  operationId: string
}

interface CancelCall {
  cancellationQuoteId: string
  operationId: OperationId
  explicitConfirmation: true
}

interface ProcessingHarnessApi {
  snapshot(): {
    scenario: Scenario
    resolveCalls: number
    operationResolveCalls: number
    observeCalls: number
    quoteCalls: QuoteCall[]
    cancelCalls: Array<{ cancellationQuoteId: string; operationId: string; explicitConfirmation: true }>
    activationCalls: number
    navigateCalls: number
    localePreference: Locale
  }
  resolveCancellationAsUnknown(): void
}

declare global {
  interface Window {
    __processingHarness?: ProcessingHarnessApi
  }
}

const projectId = ids.project('processing-visual-project') as ProjectId
const accountId = ids.account('processing-visual-account') as AccountId
const preparationOperationId = ids.operation('processing-visual-preparation')
const reservationId = ids.operation('processing-visual-reservation')
const priorPreparationId = ids.preparation('processing-visual-prior') as PreparationId
const projectRevision = asRevision(12)
const operationRevision = asRevision(4)

const knownScenarios: Scenario[] = [
  'queued',
  'running-unknown',
  'running-known',
  'retry-failure',
  'zero-turn-initial',
  'zero-turn-prior',
  'cancellation-quote',
  'cancellation-expired-refresh',
  'cancellation-quote-same-operation',
  'cancellation-quote-reconcile-first',
  'cancellation-quote-no-retry',
  'cancellation-pending',
]

function queryScenario(): Scenario {
  const candidate = new URLSearchParams(window.location.search).get('scenario')
  return knownScenarios.includes(candidate as Scenario) ? candidate as Scenario : 'running-unknown'
}

function queryLocale(): Locale {
  return new URLSearchParams(window.location.search).get('locale') === 'ru' ? 'ru' : 'en'
}

const initialScenario = queryScenario()
const initialLocale = queryLocale()

function ok<T>(data: T): ServiceResult<T> {
  return { status: 'ok', data, replayed: false }
}

function makeSnapshot(scenario: Scenario, locale: Locale): PreparationSnapshot {
  const pending = ['queued', 'running-unknown', 'running-known', 'cancellation-quote', 'cancellation-expired-refresh', 'cancellation-quote-same-operation', 'cancellation-quote-reconcile-first', 'cancellation-quote-no-retry', 'cancellation-pending'].includes(scenario)
  const failed = scenario === 'retry-failure'
  const zeroTurn = scenario === 'zero-turn-initial' || scenario === 'zero-turn-prior'
  const stageState = scenario === 'queued' ? 'queued' : scenario.startsWith('running') || pending ? 'running' : failed ? 'failed' : 'complete'
  const stageLabel = stageState === 'queued'
    ? (locale === 'ru' ? 'В очереди' : 'Queued')
    : stageState === 'running'
      ? (locale === 'ru' ? 'Анализ аудио' : 'Analyzing audio')
      : stageState === 'failed'
        ? (locale === 'ru' ? 'Не удалось обработать' : 'Processing failed')
        : (locale === 'ru' ? 'Завершено' : 'Complete')
  const preservePrior = scenario === 'zero-turn-prior'

  return {
    projectId,
    projectRevision,
    operation: {
      id: preparationOperationId,
      accountId,
      state: pending ? 'pending' : 'committed',
      kind: 'preparation',
      result: zeroTurn
        ? { state: 'complete', zeroTurns: true, turnCount: 0 }
        : failed
          ? { state: 'failed' }
          : { state: pending ? 'pending' : 'complete' },
      revision: operationRevision,
      updatedAt: Date.now(),
    },
    ...(preservePrior ? { currentPreparationId: priorPreparationId, priorUsablePreparationId: priorPreparationId } : {}),
    currentPreparationRevision: asRevision(preservePrior ? 3 : 0),
    turns: [],
    ...(scenario === 'running-known'
      ? { percentage: { value: 48, trusted: true as const, operationRevision } }
      : {}),
    currentStage: { id: stageState, label: stageLabel, state: stageState },
    attemptClass: scenario === 'zero-turn-initial'
      ? 'initial'
      : scenario === 'retry-failure'
        ? 'included-retry'
        : preservePrior
          ? 'paid-reprocessing'
          : 'initial',
    includedRetryAvailable: scenario === 'zero-turn-initial' || failed,
    reprocessingLocked: false,
    ...(pending ? { reservationId } : {}),
  }
}

function makeQuote(scenario: Scenario, quoteNumber: number): CancellationQuote {
  const expired = scenario === 'cancellation-expired-refresh' && quoteNumber === 0
  return {
    kind: 'cancellation',
    quoteId: ids.quote(`processing-visual-cancel-quote-${quoteNumber}`) as QuoteId,
    reservationId,
    targetOperationId: preparationOperationId,
    projectId,
    attemptClass: 'initial',
    exactCharge: quoteNumber === 0 ? 3 : 4,
    releaseAmount: quoteNumber === 0 ? 5 : 4,
    includedRetryRemains: quoteNumber === 0,
    expiresAt: expired ? Date.now() - 1_000 : Date.now() + 60 * 60 * 1_000,
    revision: asRevision(quoteNumber + 1),
    note: 'synthetic-mock-scenario',
  }
}

function createServices(scenario: Scenario, locale: Locale) {
  const journal = {
    resolveCalls: 0,
    operationResolveCalls: 0,
    observeCalls: 0,
    quoteCalls: [] as QuoteCall[],
    cancelCalls: [] as CancelCall[],
    activationCalls: 0,
    navigateCalls: 0,
  }
  let pendingCancelResolver: ((result: ServiceResult<OperationSnapshot>) => void) | undefined
  const snapshot = makeSnapshot(scenario, locale)
  const quotes = scenario === 'cancellation-expired-refresh'
    ? [makeQuote(scenario, 0), makeQuote(scenario, 1)]
    : [makeQuote(scenario, 1)]
  let nextQuoteIndex = 0

  const preparation: Partial<Services['preparation']> = {
    async resolve() {
      journal.resolveCalls += 1
      return ok(snapshot)
    },
    async observe() {
      journal.observeCalls += 1
      return ok(snapshot)
    },
    async cancellationQuote(input) {
      const requestIndex = nextQuoteIndex
      const call: QuoteCall = { quoteId: null, operationId: input.operationId }
      journal.quoteCalls.push(call)
      const retryDirective = scenario === 'cancellation-quote-same-operation'
        ? 'same-operation'
        : scenario === 'cancellation-quote-reconcile-first'
          ? 'reconcile-first'
          : scenario === 'cancellation-quote-no-retry'
            ? 'none'
            : null
      if (requestIndex === 0 && retryDirective) {
        nextQuoteIndex += 1
        return {
          status: 'error',
          error: {
            code: 'adapter-unavailable',
            message: 'Synthetic cancellation quote request failure.',
            retry: retryDirective,
          },
        }
      }
      const quote = quotes[Math.min(nextQuoteIndex, quotes.length - 1)]
      nextQuoteIndex += 1
      call.quoteId = quote.quoteId
      return ok(quote)
    },
    async cancel(input) {
      journal.cancelCalls.push({
        cancellationQuoteId: input.cancellationQuoteId,
        operationId: input.operationId,
        explicitConfirmation: input.explicitConfirmation,
      })
      if (scenario === 'cancellation-pending') {
        return new Promise<ServiceResult<OperationSnapshot>>((resolve) => {
          pendingCancelResolver = resolve
        })
      }
      return {
        status: 'error',
        error: {
          code: 'adapter-unavailable',
          message: 'Synthetic cancellation adapter failure.',
          retry: 'none',
        },
      }
    },
    async activate() {
      journal.activationCalls += 1
      throw new Error('Unexpected activation in the controlled ProcessingScreen fixture.')
    },
  }

  const operations: Pick<Services['operations'], 'resolve'> = {
    async resolve<T = unknown>(operationId: OperationId) {
      journal.operationResolveCalls += 1
      if (scenario === 'cancellation-quote-reconcile-first') {
        return ok({ state: 'not-started' as const, operationId, safeToRetrySameId: true as const })
      }
      const pending: OperationSnapshot<T> = {
        id: operationId,
        accountId,
        state: 'pending',
        kind: 'cancellation',
        revision: asRevision(2),
        updatedAt: Date.now(),
      }
      return ok(pending)
    },
  }

  const services = new Proxy({ preparation, operations } as unknown as Services, {
    get(target, property, receiver) {
      if (Reflect.has(target, property)) return Reflect.get(target, property, receiver)
      throw new Error(`Unexpected service family in the controlled ProcessingScreen fixture: ${String(property)}`)
    },
  })

  return {
    services,
    journal,
    recordNavigate() {
      journal.navigateCalls += 1
    },
    resolveCancellationAsUnknown() {
      pendingCancelResolver?.({
        status: 'unknown',
        operationId: journal.cancelCalls.at(-1)?.operationId ?? ids.operation('missing-cancellation-attempt'),
        message: 'Synthetic cancellation remains pending; no terminal outcome is asserted.',
      })
    },
  }
}

const controlled = createServices(initialScenario, initialLocale)

export function ProcessingHarness() {
  const scenario = initialScenario
  const locale = initialLocale
  const identity = { status: 'signed-out' as const }

  useEffect(() => {
    window.__processingHarness = {
      snapshot() {
        const { journal } = controlled
        return {
          scenario,
          resolveCalls: journal.resolveCalls,
          operationResolveCalls: journal.operationResolveCalls,
          observeCalls: journal.observeCalls,
          quoteCalls: journal.quoteCalls.map((call) => ({ ...call })),
          cancelCalls: journal.cancelCalls.map((call) => ({ ...call })),
          activationCalls: journal.activationCalls,
          navigateCalls: journal.navigateCalls,
          localePreference: locale,
        }
      },
      resolveCancellationAsUnknown() {
        controlled.resolveCancellationAsUnknown()
      },
    }
    return () => {
      delete window.__processingHarness
    }
  }, [locale, scenario])

  const props: FeatureScreenProps = {
    route: routes.project(projectId, 'processing'),
    locale,
    identity,
    signInIntent: { kind: 'new-dub' },
    services: controlled.services,
    navigate: async () => {
      controlled.recordNavigate()
      return true
    },
    refreshIdentity: async () => identity,
    registerRouteExitGuard: () => () => undefined,
  }

  return (
    <LocaleProvider services={controlled.services} onAccountUpdated={() => undefined}>
      <div className="app-shell">
        <main id="main-content" className="app-main">
          <ProcessingScreen {...props} />
        </main>
      </div>
    </LocaleProvider>
  )
}

window.history.replaceState({}, '', `/projects/${encodeURIComponent(projectId)}/processing`)
window.localStorage.setItem('dubbed.locale', initialLocale)
document.documentElement.lang = initialLocale

const mountNode = document.getElementById('root')
if (!mountNode) throw new Error('The controlled ProcessingScreen harness root element is missing.')

createRoot(mountNode).render(<ProcessingHarness key={`${initialScenario}-${initialLocale}`} />)
