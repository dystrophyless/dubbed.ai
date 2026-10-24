import { createRoot } from 'react-dom/client'
import App from '../../src/App'
import { routes, routeTo } from '../../src/app/routes'
import { createServices } from '../../src/services'
import {
  asRevision,
  ids,
  type AccountSettingsSnapshot,
  type AccountSnapshot,
  type CompatiblePreviewSnapshot,
  type CreditHistoryCursor,
  type CreditSnapshot,
  type CreditPack,
  type LedgerEntry,
  type OperationId,
  type OwnedProject,
  type PreviewInspection,
  type ProcessingQuote,
  type ProjectCapacity,
  type ServiceError,
  type ServiceResult,
  type Services,
  type Session,
  type SourceFacts,
} from '../../src/services/contracts'
import '../../src/index.css'

type Screen = 'account' | 'credits' | 'projects' | 'newdub'

declare global {
  interface Window {
    __workspaceStateVisual?: {
      screen: Screen
      scenario: string
      calls: string[]
      release: (name: string) => void
    }
  }
}

const params = new URLSearchParams(window.location.search)
const screen = (params.get('screen') ?? 'projects') as Screen
const scenario = params.get('scenario') ?? 'default'
const locale = params.get('locale') === 'ru' ? 'ru' : 'en'
localStorage.setItem('dubbed.locale', locale)

const now = Date.now()
const accountId = ids.account('workspace-visual-account')
const projectId = ids.project('workspace-visual-project')
const sourceId = ids.source('workspace-visual-source')
const account: AccountSnapshot = {
  id: accountId,
  email: 'workspace-visual@example.invalid',
  locale,
  revision: asRevision(3),
  deleted: false,
  createdAt: now - 86_400_000,
}
const session: Session = {
  id: ids.session('workspace-visual-session'),
  accountId,
  expiresAt: now + 3_600_000,
  revision: asRevision(2),
}

const calls: string[] = []
const releases = new Map<string, () => void>()

function ok<T>(data: T): ServiceResult<T> {
  return { status: 'ok', replayed: false, data }
}

function error(code: ServiceError['code'], message = 'Synthetic visual fixture response.'): ServiceResult<never> {
  return { status: 'error', error: { code, message, retry: 'none' } }
}

function unknown<T>(operationId: OperationId): ServiceResult<T> {
  return { status: 'unknown', operationId, message: 'Synthetic visual fixture response.' }
}

function call<T>(name: string, result: ServiceResult<T>, hold = false): Promise<ServiceResult<T>> {
  calls.push(name)
  if (!hold) return Promise.resolve(result)
  return new Promise((resolve) => {
    releases.set(name, () => resolve(result))
  })
}

function accountSettings(): AccountSettingsSnapshot {
  return {
    ...account,
    methods: [
      { kind: 'email-password', address: account.email, verified: true, linkedAt: now - 60_000 },
      { kind: 'google', address: account.email, verified: true, linkedAt: now - 30_000 },
    ],
    deletionEligible: true,
    purchasedRemainder: 0,
    note: 'synthetic-mock-scenario',
  }
}

function capacity(used: number): ProjectCapacity {
  return { used, total: 6, firstPurchaseUpgrade: false, revision: asRevision(1) }
}

function project(state: OwnedProject['state'] = 'uploaded', id = projectId, title = 'Source video') : OwnedProject {
  return {
    id,
    accountId,
    revision: asRevision(4),
    title,
    titleSource: 'filename',
    createdAt: now - 3_600_000,
    updatedAt: now - 60_000,
    lastActivityAt: now - 60_000,
    sourceId,
    sourceRevision: asRevision(2),
    sourceDurationMs: 8_625,
    selection: { startMs: 0, endMs: 8_000, revision: asRevision(2) },
    preparationRevision: asRevision(1),
    state,
  }
}

const firstProject = project('uploaded', projectId, 'Source video')
const projects = scenario === 'projects-empty'
  ? []
  : [
      firstProject,
      project('preparing', ids.project('workspace-visual-processing'), 'Processing draft'),
      ...(scenario === 'projects-capacity' ? [project('ready', ids.project('workspace-visual-ready'), 'Finished project'), project('failed', ids.project('workspace-visual-failed'), 'Needs attention'), project('recording', ids.project('workspace-visual-recording'), 'Voice draft'), project('assembling', ids.project('workspace-visual-assembling'), 'Finalizing result')] : []),
    ]

const snapshot: CreditSnapshot = {
  accountId,
  revision: asRevision(5),
  available: scenario === 'newdub-insufficient' ? 2 : 120,
  reserved: 0,
  purchasedRemainder: 0,
  welcomeGrantEligible: false,
  welcomeGrantApplied: true,
  projectCapacity: capacity(scenario === 'newdub-upload-capacity' ? 6 : Math.min(projects.length, 6)),
}

const pack: CreditPack = {
  id: 'visual-mock-pack',
  credits: 20,
  currency: 'MOCK',
  amountMinor: 0,
  note: 'synthetic-mock-scenario',
}

const cursor = 'workspace-visual-history-cursor' as CreditHistoryCursor
function ledger(id: string, revision: number, kind: LedgerEntry['kind'], delta: number | null, availableAfter: number | null): LedgerEntry {
  return {
    id: ids.operation(id),
    accountId,
    revision: asRevision(revision),
    kind,
    occurredAt: now - revision * 60_000,
    delta,
    availableAfter,
    reservedAfter: 0,
    note: 'synthetic-mock-scenario',
  }
}
const postedEntry = ledger('workspace-visual-posted', 5, 'welcome-grant', 120, 120)
const pendingEntry = ledger('workspace-visual-pending', 4, 'pending-purchase', null, null)
const olderEntry = ledger('workspace-visual-older', 3, 'processing-settlement', -8, 112)

const purchaseId = ids.operation('workspace-visual-purchase')
const purchase = {
  id: purchaseId,
  accountId,
  initiationId: ids.operation('workspace-visual-initiation'),
  packId: pack.id,
  state: 'pending',
  revision: asRevision(1),
  note: 'synthetic-mock-scenario',
} as const

const sourceFacts: SourceFacts = {
  fileName: 'source-dialogue.mp4',
  mimeType: 'video/mp4;codecs=avc1.42001f,mp4a.40.2',
  byteLength: 217_356,
  durationMs: 8_625,
  width: 640,
  height: 360,
  hasAudio: true,
  validation: 'mock-scenario',
}
const sourceBlob = fetch('/media/source-dialogue.mp4').then((response) => response.blob())
const deliberatelyInvalidPreviewSource = new Blob(['synthetic-invalid-video-bytes'], { type: sourceFacts.mimeType })

const quote: ProcessingQuote = {
  id: 'workspace-visual-quote' as ProcessingQuote['id'],
  accountId,
  projectId,
  projectRevision: firstProject.revision,
  sourceId,
  sourceRevision: firstProject.sourceRevision,
  selectionRevision: firstProject.selection.revision,
  activePreparationRevision: asRevision(1),
  draftIdsToDeleteOnActivation: [],
  creditRevision: snapshot.revision,
  attemptClass: 'initial',
  durationMs: 8_000,
  credits: 8,
  available: snapshot.available,
  reserved: snapshot.reserved,
  expiresAt: now + 5 * 60_000,
  revision: asRevision(1),
  note: 'synthetic-mock-scenario',
}

const base = createServices({ namespace: `workspace-state-visual-${crypto.randomUUID()}` })
let packLoadAttempt = 0

const services: Services = {
  ...base,
  identity: {
    ...base.identity,
    current: async () => ok({ account, session }),
  },
  account: {
    ...base.account,
    load: async () => call('account.load', ok(accountSettings()), scenario === 'account-load-pending'),
    setLocale: async (input) => {
      const result = scenario === 'account-locale-failure'
        ? error('adapter-unavailable')
        : ok({ ...account, locale: input.locale, revision: asRevision(4) })
      return call('account.setLocale', result, scenario === 'account-locale-pending')
    },
    changePassword: async () => call('account.changePassword', error('unauthenticated')),
    delete: async (input) => call('account.delete', scenario === 'account-delete-error'
      ? error('adapter-unavailable')
      : unknown(input.operationId)),
    resolveDelete: async (input) => call('account.resolveDelete', unknown(input.operationId)),
  },
  projects: {
    ...base.projects,
    list: async () => {
      const result = scenario === 'projects-list-error' || scenario === 'projects-list-pending'
        ? error('adapter-unavailable')
        : ok({ projects, capacity: capacity(Math.min(projects.length, scenario === 'projects-capacity' ? 6 : 6)) })
      return call('projects.list', result, scenario === 'projects-list-pending')
    },
    open: async (id) => {
      const selected = projects.find((item) => item.id === id) ?? firstProject
      return call('projects.open', ok(selected))
    },
    recordOpened: async (input) => call('projects.recordOpened', ok(projects.find((item) => item.id === input.projectId) ?? firstProject)),
    rename: async (input) => call('projects.rename', scenario === 'projects-rename-error'
      ? error('adapter-unavailable')
      : ok({ ...firstProject, title: input.title, revision: asRevision(5) })),
    deletionImpact: async (id) => call('projects.deletionImpact', ok({
      projectId: id,
      title: firstProject.title,
      sourceBytes: sourceFacts.byteLength,
      acceptedTakeCount: 0,
      draftCount: 0,
      resultCount: 0,
    })),
    delete: async (input) => call('projects.delete', scenario === 'projects-delete-error'
      ? error('adapter-unavailable')
      : unknown(input.operationId)),
  },
  uploads: {
    ...base.uploads,
    getSource: async () => call('uploads.getSource', ok({
      facts: sourceFacts,
      blob: scenario === 'newdub-preview-retry' ? deliberatelyInvalidPreviewSource : await sourceBlob,
    })),
    commitInitial: async () => call('uploads.commitInitial', scenario === 'newdub-upload-error'
      ? error('adapter-unavailable')
      : ok({ project: firstProject, source: sourceFacts }), scenario === 'newdub-upload-pending'),
    replaceSource: async () => call('uploads.replaceSource', error('adapter-unavailable')),
  },
  previews: {
    ...base.previews,
    inspect: async () => call('previews.inspect', ok({
      accountId,
      projectId,
      projectRevision: firstProject.revision,
      sourceId,
      sourceRevision: firstProject.sourceRevision,
      sourceSha256: 'visual-fixture-source-hash',
      sourceFacts,
      eligibility: 'supported-fixture',
      note: 'synthetic-mock-scenario',
    } satisfies PreviewInspection)),
    request: async () => call('previews.request', ok({
      id: ids.operation('workspace-visual-preview'),
      accountId,
      projectId,
      projectRevision: firstProject.revision,
      sourceId,
      sourceRevision: firstProject.sourceRevision,
      sourceSha256: 'visual-fixture-source-hash',
      state: 'error',
      attempt: 1,
      scenario: 'preview-transient-error',
      revision: asRevision(1),
      requestedAt: now,
      updatedAt: now,
      error: { code: 'simulated-transient', message: 'Synthetic transient preview failure.', retryable: true },
      note: 'synthetic-mock-scenario',
    } satisfies CompatiblePreviewSnapshot)),
    retry: async () => call('previews.retry', ok({
      id: ids.operation('workspace-visual-preview-retry'),
      accountId,
      projectId,
      projectRevision: firstProject.revision,
      sourceId,
      sourceRevision: firstProject.sourceRevision,
      sourceSha256: 'visual-fixture-source-hash',
      state: 'ready',
      attempt: 2,
      scenario: 'preview-transient-error',
      revision: asRevision(2),
      requestedAt: now,
      updatedAt: now + 1,
      descriptor: {
        accountId,
        projectId,
        sourceId,
        sourceRevision: firstProject.sourceRevision,
        sourceSha256: 'visual-fixture-source-hash',
        sourceByteLength: sourceFacts.byteLength,
        sourceDurationMs: sourceFacts.durationMs,
        sourceVideo: {
          url: '/media/source-dialogue.mp4',
          sha256: '36e996acf6eb710ed282cd154536314752be08aea9946a6955f7da8a719d4d9b',
          byteLength: sourceFacts.byteLength,
          mediaType: sourceFacts.mimeType,
          durationMs: sourceFacts.durationMs,
          width: sourceFacts.width,
          height: sourceFacts.height,
        },
        video: {
          url: '/media/source-dialogue.mp4',
          sha256: '36e996acf6eb710ed282cd154536314752be08aea9946a6955f7da8a719d4d9b',
          byteLength: sourceFacts.byteLength,
          mediaType: sourceFacts.mimeType,
          durationMs: sourceFacts.durationMs,
          width: sourceFacts.width,
          height: sourceFacts.height,
        },
        timeline: {
          sourceDurationMs: sourceFacts.durationMs,
          note: 'Synthetic visual fixture timeline.',
          sections: [{ id: 'workspace-visual-line', text: 'Synthetic fixture dialogue', startMs: 0, endMs: 8_000 }],
        },
        conversionNote: 'synthetic-compatible-playback-simulation',
        note: 'synthetic-mock-scenario',
      },
      note: 'synthetic-mock-scenario',
    } satisfies CompatiblePreviewSnapshot)),
  },
  credits: {
    ...base.credits,
    snapshot: async () => call('credits.snapshot', scenario === 'credits-balance-unavailable'
      ? error('adapter-unavailable')
      : ok(snapshot)),
    historyPage: async (input) => {
      if (input.cursor) {
        return call('credits.historyPage.older', scenario === 'credits-history-failure'
          ? error('adapter-unavailable')
          : ok({ entries: [olderEntry], nextCursor: null }), scenario === 'credits-history-loading')
      }
      const unavailable = scenario === 'credits-history-unavailable'
      return call('credits.historyPage.first', unavailable
        ? error('adapter-unavailable')
        : ok({
            entries: [postedEntry, pendingEntry],
            nextCursor: scenario.startsWith('credits-history-') ? cursor : null,
          }))
    },
    packs: async () => call('credits.packs', scenario === 'credits-packs-unavailable' && packLoadAttempt++ === 0
      ? error('adapter-unavailable')
      : ok([pack])),
    startPurchase: async (input) => call('credits.startPurchase', scenario === 'credits-checkout-unknown'
      ? unknown(input.operationId)
      : ok({ purchaseId, state: 'pending' })),
    resolvePurchase: async () => call('credits.resolvePurchase', ok({ purchase, snapshot })),
    simulateCheckout: async (input) => call('credits.simulateCheckout', ok({
      outcome: input.outcome,
      purchase: { ...purchase, state: input.outcome },
      note: 'synthetic-mock-scenario',
    }) as never),
  },
  preparation: {
    ...base.preparation,
    updateSelection: async (input) => call('preparation.updateSelection', ok({
      ...firstProject,
      selection: { startMs: input.startMs, endMs: input.endMs, revision: asRevision(3) },
      revision: asRevision(5),
    })),
    quote: async () => call('preparation.quote', scenario === 'newdub-quote-error'
      ? error('adapter-unavailable')
      : ok({ ...quote, expiresAt: scenario === 'newdub-stale-quote' ? now - 1 : now + 5 * 60_000, available: snapshot.available })),
  },
}

const route = screen === 'account'
  ? routes.account()
  : screen === 'credits'
    ? routes.credits()
    : screen === 'projects'
      ? routes.projects()
      : routes.newDub()
const destination = routeTo(route)
const path = typeof destination === 'string'
  ? destination
  : `${destination.pathname ?? '/'}${destination.search ?? ''}${destination.hash ?? ''}`
window.history.replaceState({}, '', path)

if (screen === 'newdub' && !scenario.startsWith('newdub-upload-')) {
  sessionStorage.setItem(
    `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`,
    JSON.stringify({ accountId, projectId }),
  )
}

window.__workspaceStateVisual = {
  screen,
  scenario,
  calls,
  release(name) {
    releases.get(name)?.()
  },
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('The workspace visual harness root is missing.')
createRoot(rootElement).render(<App services={services} />)
