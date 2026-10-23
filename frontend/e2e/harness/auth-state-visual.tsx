import { createRoot } from 'react-dom/client'
import App from '../../src/App'
import { routeTo, routes } from '../../src/app/routes'
import { createServices } from '../../src/services'
import {
  asRevision,
  ids,
  type AccountSettingsSnapshot,
  type AccountSnapshot,
  type LinkIntentSnapshot,
  type LoginMethodSnapshot,
  type OperationId,
  type PendingVerification,
  type ServiceError,
  type ServiceResult,
  type Services,
  type Session,
} from '../../src/services/contracts'
import { storePendingAccountLink } from '../../src/features/account-linking/recovery'
import '../../src/index.css'

type Screen = 'signin' | 'register' | 'reset' | 'link'

declare global {
  interface Window {
    __authStateVisual?: {
      scenario: string
      calls: string[]
      release: (name: string) => void
    }
  }
}

const params = new URLSearchParams(window.location.search)
const screen = (params.get('screen') ?? 'signin') as Screen
const scenario = params.get('scenario') ?? 'default'
const locale = navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
const now = Date.now()
const accountId = ids.account('auth-visual-account')
const account: AccountSnapshot = {
  id: accountId,
  email: 'visual-fixture@example.invalid',
  locale,
  revision: asRevision(1),
  deleted: false,
  createdAt: now - 86_400_000,
}
const session: Session = {
  id: ids.session('auth-visual-session'),
  accountId,
  expiresAt: now + 3_600_000,
  revision: asRevision(1),
}

const callLog: string[] = []
const releases = new Map<string, () => void>()

function ok<T>(data: T): ServiceResult<T> {
  return { status: 'ok', data, replayed: false }
}

function serviceError(code: ServiceError['code'], message = 'Synthetic visual fixture response.'): ServiceResult<never> {
  return { status: 'error', error: { code, message, retry: 'none' } }
}

function unknown<T>(operationId: OperationId, message = 'Synthetic visual fixture response.'): ServiceResult<T> {
  return { status: 'unknown', operationId, message }
}

function defer<T>(name: string, result: ServiceResult<T>): Promise<ServiceResult<T>> {
  return new Promise((resolve) => {
    releases.set(name, () => resolve(result))
  })
}

function call<T>(name: string, result: ServiceResult<T>, hold = false): Promise<ServiceResult<T>> {
  callLog.push(name)
  return hold ? defer(name, result) : Promise.resolve(result)
}

function pending(purpose: PendingVerification['purpose'], email = account.email): PendingVerification {
  return {
    id: ids.operation(`auth-visual-${purpose}`),
    email,
    purpose,
    scenarioCode: { value: '246810', note: 'synthetic-mock-scenario' },
    expiresAt: Date.now() + 10 * 60_000,
    resendAvailableAt: Date.now() + 60_000,
    resendCount: 1,
    sendCount: 1,
    remainingSends: 4,
    revision: asRevision(1),
  }
}

function accountMethods(): LoginMethodSnapshot[] {
  const currentKind = scenario === 'link-invalid-proof' ? 'email-password' : 'google'
  return [{
    kind: currentKind,
    address: currentKind === 'google' ? account.email : account.email,
    verified: true,
    linkedAt: now - 60_000,
  }]
}

function accountSettings(): AccountSettingsSnapshot {
  return {
    ...account,
    methods: accountMethods(),
    deletionEligible: true,
    purchasedRemainder: 0,
    note: 'synthetic-mock-scenario',
  }
}

function linkIntent(): LinkIntentSnapshot {
  const currentMethod = scenario === 'link-invalid-proof' ? 'email-password' : 'google'
  const candidateMethod = currentMethod === 'google' ? 'email-password' : 'google'
  const ready = scenario === 'link-review-loading' || scenario === 'link-commit-conflict' || scenario === 'link-commit-unknown'
  const id = ids.operation('auth-visual-link-intent')
  return {
    id,
    accountId,
    currentMethod,
    candidate: {
      method: candidateMethod,
      ...(candidateMethod === 'email-password' ? { address: 'candidate@example.invalid' } : {}),
    },
    expectedAccountRevision: asRevision(1),
    ...(candidateMethod === 'email-password' ? {
      candidateVerificationRequestId: ids.operation('auth-visual-link-code'),
      candidateScenarioCode: { value: '135790', note: 'synthetic-mock-scenario' as const },
    } : {}),
    ...(ready ? {
      currentProofId: ids.operation('auth-visual-current-proof'),
      candidateProofId: ids.operation('auth-visual-candidate-proof'),
    } : {}),
    expiresAt: Date.now() + 10 * 60_000,
    state: ready ? 'ready-to-review' : 'pending',
    note: 'synthetic-mock-scenario',
  }
}

const intent = linkIntent()
const base = createServices({ namespace: `auth-state-visual-${crypto.randomUUID()}` })
let identityReads = 0

const services: Services = {
  ...base,
  identity: {
    ...base.identity,
    current: async () => {
      identityReads += 1
      if (screen === 'link') return ok({ account, session })
      if (scenario === 'signin-session-unavailable' && identityReads > 1) {
        return serviceError('storage-unavailable', 'Synthetic session confirmation unavailable.')
      }
      return ok(null)
    },
    signIn: async (input) => {
      const success = ok({ account, session, destination: input.intent ?? { kind: 'new-dub' as const } })
      if (scenario === 'signin-loading') return call('identity.signIn', success, true)
      if (scenario === 'signin-service-error') return call('identity.signIn', serviceError('adapter-unavailable'))
      if (scenario === 'signin-session-unavailable') return call('identity.signIn', success)
      return call('identity.signIn', serviceError('unauthenticated', 'Synthetic invalid credentials.'))
    },
    google: async (input) => {
      if (input.purpose === 'link') {
        const result = ok({
          purpose: 'link' as const,
          state: 'completed' as const,
          destination: { kind: 'new-dub' as const },
          providerProofId: ids.operation(`auth-visual-${input.linkStep}-provider-proof`),
          linkStep: input.linkStep,
          verifiedAddress: account.email,
          welcomeGrantApplied: false,
          note: 'synthetic-mock-scenario' as const,
        })
        return call('identity.google.link', result)
      }
      if (screen === 'signin' && scenario === 'signin-provider-conflict') {
        return call('identity.google.sign-in', ok({
          purpose: 'sign-in' as const,
          state: 'conflict' as const,
          destination: input.destination ?? { kind: 'new-dub' as const },
          welcomeGrantApplied: false,
          note: 'synthetic-mock-scenario' as const,
          message: 'Synthetic provider return conflict.',
        }))
      }
      return call('identity.google', serviceError('adapter-unavailable'))
    },
  },
  registration: {
    ...base.registration,
    start: async (input) => {
      const result = scenario === 'register-collision'
        ? serviceError('already-exists', 'Synthetic existing-account collision.')
        : scenario === 'register-service-error'
          ? serviceError('adapter-unavailable')
          : ok(pending('registration', input.email))
      return call('registration.start', result, scenario === 'register-loading')
    },
    verify: async (input) => {
      if (scenario === 'register-invalid-code') return call('registration.verify', serviceError('invalid-code'))
      if (scenario === 'register-unknown-code') return call('registration.verify', unknown(input.operationId))
      if (scenario === 'register-service-error') return call('registration.verify', serviceError('adapter-unavailable'))
      return call('registration.verify', serviceError('invalid-code'))
    },
    resend: async () => call('registration.resend', ok(pending('registration'))),
    correctEmail: async (input) => call('registration.correctEmail', ok(pending('registration', input.email))),
    resolve: async () => ok(pending('registration')),
  },
  passwordReset: {
    ...base.passwordReset,
    start: async (input) => {
      const result = scenario === 'reset-service-error'
        ? serviceError('adapter-unavailable')
        : ok(pending('password-reset', input.email))
      return call('passwordReset.start', result, scenario === 'reset-loading')
    },
    verify: async (input) => {
      if (scenario === 'reset-invalid-code') return call('passwordReset.verify', serviceError('invalid-code'))
      if (scenario === 'reset-unknown-code') return call('passwordReset.verify', unknown(input.operationId))
      return call('passwordReset.verify', ok({ resetGrantId: ids.operation('auth-visual-reset-grant'), expiresAt: Date.now() + 15 * 60_000 }))
    },
    complete: async () => call('passwordReset.complete', serviceError('adapter-unavailable'), scenario === 'reset-complete-loading'),
    resend: async () => call('passwordReset.resend', ok(pending('password-reset'))),
    resolve: async () => ok(pending('password-reset')),
  },
  account: {
    ...base.account,
    load: async () => ok(accountSettings()),
  },
  accountLinking: {
    ...base.accountLinking,
    start: async () => call('accountLinking.start', ok(intent), scenario === 'link-start-loading'),
    proveCurrent: async (input) => {
      if (scenario === 'link-invalid-proof') return call('accountLinking.proveCurrent', serviceError('unauthenticated', 'Synthetic current proof rejected.'))
      if (scenario === 'link-unknown-proof') return call('accountLinking.proveCurrent', unknown(input.operationId))
      return call('accountLinking.proveCurrent', ok({ proofId: ids.operation('auth-visual-current-proof'), method: intent.currentMethod, expiresAt: Date.now() + 5 * 60_000, note: 'synthetic-mock-scenario' }))
    },
    proveCandidate: async () => call('accountLinking.proveCandidate', ok({
      proofId: ids.operation('auth-visual-candidate-proof'),
      candidate: { method: intent.candidate.method, address: 'candidate@example.invalid' },
      expiresAt: Date.now() + 5 * 60_000,
      note: 'synthetic-mock-scenario',
    })),
    resendCandidate: async () => call('accountLinking.resendCandidate', ok(intent)),
    commit: async () => {
      if (scenario === 'link-commit-conflict') {
        return call('accountLinking.commit', { status: 'conflict', code: 'intent-conflict', message: 'Synthetic revision conflict.' })
      }
      if (scenario === 'link-commit-unknown') return call('accountLinking.commit', unknown(ids.operation('auth-visual-commit')))
      const completed = { state: 'completed' as const, account, methods: accountMethods() }
      return call('accountLinking.commit', ok(completed), scenario === 'link-review-loading')
    },
    cancel: async () => call('accountLinking.cancel', ok({ state: 'cancelled', intent: { ...intent, state: 'cancelled' } })),
    resolve: async () => {
      const state = intent.state
      return ok({ state, intent })
    },
  },
}

const route = screen === 'register'
  ? routes.registration()
  : screen === 'reset'
    ? routes.passwordReset()
    : screen === 'link'
      ? routes.accountLinking()
      : routes.signIn()
const destination = routeTo(route)
const path = typeof destination === 'string'
  ? destination
  : `${destination.pathname ?? '/'}${destination.search ?? ''}${destination.hash ?? ''}`
window.history.replaceState({}, '', path)

if (screen === 'link' && scenario !== 'link-start-loading') {
  storePendingAccountLink({ version: 1, accountId, intentId: intent.id })
}

window.__authStateVisual = {
  scenario,
  calls: callLog,
  release(name) {
    releases.get(name)?.()
  },
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('The visual harness root is missing.')
createRoot(rootElement).render(<App services={services} />)
