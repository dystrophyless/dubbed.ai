import type {
  AccountLinkingService,
  AccountService,
  AccountSettingsSnapshot,
  AccountSnapshot,
  GoogleIdentityResult,
  IdentityService,
  LinkIntentSnapshot,
  MutationOptions,
  OperationId,
  PasswordResetService,
  PendingVerification,
  RegistrationService,
  ServiceResult,
  Session,
  SignInIntent,
} from './contracts'
import { asRevision } from './contracts'
import {
  activeSessionMetaKey,
  creditSnapshot,
  newAccountId,
  newOperationId,
  newSessionId,
  nowMs,
  readRecord,
  recordsByIndex,
  errorResult,
  revisionConflict,
  requireContext,
  serviceError,
  sha256,
  transact,
  writeRecord,
  type StoredAccountHistory,
  type StoredAccount,
  type StoredCredential,
  type StoredLinkIntent,
  type StoredLinkProof,
  type StoredLinkProviderProof,
  type StoredResetGrant,
  type StoredOperation,
  type StoredVerification,
  type StoreContext,
} from './mock-store'
import { fingerprint, mutate } from './mutations'
import { requestResult } from './indexeddb'

const MOCK_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000
const MOCK_VERIFICATION_LIFETIME_MS = 10 * 60 * 1000
const MOCK_RESEND_INTERVAL_MS = 60 * 1000
// Explicit mock mechanics only; the production hour-window boundary remains open.
const MOCK_VERIFICATION_SEND_WINDOW_MS = 60 * 60 * 1000
const MOCK_VERIFICATION_SEND_LIMIT = 5
const MOCK_RESET_LIFETIME_MS = 15 * 60 * 1000
const MOCK_LINK_LIFETIME_MS = 15 * 60 * 1000
// Explicit synthetic test-scenario choice only; production proof freshness remains open.
const MOCK_LINK_PROOF_LIFETIME_MS = 5 * 60 * 1000
const MOCK_LINK_CODE_LIFETIME_MS = 10 * 60 * 1000
const MOCK_LINK_CODE_RESEND_MS = 60 * 1000
const MOCK_LINK_CODE_SENDS_PER_HOUR = 5
const INITIAL_CREDITS = 120
const INITIAL_PROJECT_SLOTS = 2
const MIN_PASSWORD_LENGTH = 8
const SYNTHETIC_GOOGLE_ADDRESS = 'google-preview@example.invalid'

export function mockScenarioVerificationCode(requestId: OperationId, generation = 0): string {
  const digits = requestId.replace(/\D/g, '').slice(-6)
  const base = Number(digits.padStart(6, '0'))
  return String((base + generation * 104729) % 1_000_000).padStart(6, '0')
}

function mockEmail(value: string): string {
  return value.trim().toLocaleLowerCase('en-US')
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH
}

async function passwordHash(password: string, salt: string): Promise<string> {
  return sha256(`${salt}\u0000${password}`)
}

function activeSendTimes(record: StoredVerification, now: number): number[] {
  const persisted = record.sendTimes
  if (persisted?.length) {
    return persisted.filter((sentAt) => Number.isFinite(sentAt) && now - sentAt < MOCK_VERIFICATION_SEND_WINDOW_MS)
  }

  // Older local records have only a resend count and latest cooldown. Conservatively treat all
  // known sends as occurring with the latest send so a migration cannot exceed the cap.
  const latestSend = record.resendAvailableAt - MOCK_RESEND_INTERVAL_MS
  return Array.from({ length: Math.min(MOCK_VERIFICATION_SEND_LIMIT, Math.max(1, record.resendCount + 1)) }, () => latestSend)
}

async function registrationRequestOwnedBy(
  transaction: IDBTransaction,
  context: StoreContext,
  request: StoredVerification,
): Promise<boolean> {
  const startOperation = request.clientId === undefined
    ? await readRecord<StoredOperation>(transaction, 'operations', request.id)
    : undefined
  const ownerClientId = request.clientId ?? (startOperation?.kind === 'registration.start' ? startOperation.clientId : undefined)
  return ownerClientId === context.clientId
}

function requireRegistrationReplayOwner(context: StoreContext, clientId?: string): void {
  if (clientId !== context.clientId) throw serviceError('not-found', 'Registration request was not found.')
}

function asPending(record: StoredVerification, clock: StoreContext['clock']): PendingVerification {
  const sendCount = activeSendTimes(record, nowMs(clock)).length
  return {
    id: record.id,
    email: record.email,
    purpose: record.purpose === 'link-candidate-email' ? 'link-email' : record.purpose,
    scenarioCode: { value: mockScenarioVerificationCode(record.id, record.codeGeneration ?? 0), note: 'synthetic-mock-scenario' },
    expiresAt: record.expiresAt,
    resendAvailableAt: record.resendAvailableAt,
    resendCount: record.resendCount,
    sendCount,
    remainingSends: Math.max(0, MOCK_VERIFICATION_SEND_LIMIT - sendCount),
    revision: record.revision,
  }
}

function newSession(accountId: AccountSnapshot['id'], clock: StoreContext['clock']): Session {
  return {
    id: newSessionId(),
    accountId,
    expiresAt: nowMs(clock) + MOCK_SESSION_LIFETIME_MS,
    revision: asRevision(0),
  }
}

function newVerification(
  id: OperationId,
  email: string,
  purpose: StoredVerification['purpose'],
  clock: StoreContext['clock'],
  codeHash: string,
  fields: Partial<Pick<StoredVerification, 'passwordHash' | 'accountId' | 'registrationMode' | 'emailHash' | 'linkIntentId' | 'returnIntent' | 'clientId'>> = {},
): StoredVerification {
  const timestamp = nowMs(clock)
  return {
    id,
    email,
    purpose,
    codeHash,
    expiresAt: timestamp + MOCK_VERIFICATION_LIFETIME_MS,
    resendAvailableAt: timestamp + MOCK_RESEND_INTERVAL_MS,
    resendCount: 0,
    sendTimes: [timestamp],
    codeGeneration: 0,
    revision: asRevision(0),
    state: 'pending',
    ...fields,
  }
}

async function resolveSignInDestination(
  transaction: IDBTransaction,
  accountId: AccountSnapshot['id'],
  intent: SignInIntent,
): Promise<SignInIntent> {
  if (intent.kind === 'new-dub') return { kind: 'new-dub' }
  const project = await readRecord<{ id: string; accountId: string; state: string }>(transaction, 'projects', intent.projectId)
  const validProject = project?.accountId === accountId && (
    (intent.screen === 'processing' && project.state === 'preparing') ||
    (intent.screen === 'record' && ['recording', 'ready'].includes(project.state)) ||
    (intent.screen === 'result' && ['assembling', 'ready'].includes(project.state))
  )
  return validProject ? intent : { kind: 'new-dub' }
}

export function createMockIdentity(context: StoreContext): {
  identity: IdentityService
  registration: RegistrationService
  passwordReset: PasswordResetService
  accountLinking: AccountLinkingService
  account: AccountService
} {
  const linkIntentSnapshot = (intent: StoredLinkIntent): LinkIntentSnapshot => {
    const now = nowMs(context.clock)
    const candidateProof = intent.proofs.find((proof) => proof.id === intent.candidateProofId)
    const state: LinkIntentSnapshot['state'] = intent.state === 'completed' || intent.state === 'cancelled' || intent.state === 'conflict'
      ? intent.state
      : intent.expiresAt <= now
        ? 'expired'
        : intent.currentProofId && intent.candidateProofId &&
          intent.proofs.some((proof) => proof.id === intent.currentProofId && proof.expiresAt > now && proof.consumedAt === undefined) &&
          intent.proofs.some((proof) => proof.id === intent.candidateProofId && proof.expiresAt > now && proof.consumedAt === undefined)
          ? 'ready-to-review'
          : 'pending'
    return {
      id: intent.id,
      accountId: intent.accountId,
      currentMethod: intent.currentMethod,
      candidate: { method: intent.candidateMethod, address: intent.candidateEmail ?? candidateProof?.address },
      expectedAccountRevision: intent.expectedAccountRevision,
      candidateVerificationRequestId: intent.candidateVerificationRequestId,
      candidateScenarioCode: intent.candidateMethod === 'email-password' && state === 'pending' && intent.candidateVerificationRequestId
        ? { value: mockScenarioVerificationCode(intent.candidateVerificationRequestId), note: 'synthetic-mock-scenario' }
        : undefined,
      currentProofId: intent.currentProofId,
      candidateProofId: intent.candidateProofId,
      expiresAt: intent.expiresAt,
      state,
      note: 'synthetic-mock-scenario',
    }
  }

  const identity: IdentityService = {
    current: async () => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts'], 'readonly', async (transaction) => {
          const active = await readRecord<{ key: string; value: Session['id'] }>(transaction, 'meta', activeSessionMetaKey(context))
          if (!active) return { status: 'ok', data: null, replayed: false } as const
          const session = await readRecord<Session>(transaction, 'sessions', active.value)
          if (!session) return { status: 'ok', data: null, replayed: false } as const
          if (session.expiresAt <= nowMs(context.clock)) {
            return { status: 'error', error: { code: 'expired', message: 'Your session has expired.', retry: 'none' } } as const
          }
          const account = await readRecord<AccountSnapshot>(transaction, 'accounts', session.accountId)
          if (!account || account.deleted) {
            return { status: 'ok', data: null, replayed: false } as const
          }
          return { status: 'ok', data: { account, session }, replayed: false } as const
        })
      } catch (error) {
        return { status: 'error', error: { code: 'storage-unavailable', message: error instanceof Error ? error.message : 'Account state is unavailable.', retry: 'reconcile-first' } }
      }
    },
    signIn: async (input) => {
      const intent = input.intent ?? { kind: 'new-dub' as const }
      const email = mockEmail(input.email)
      const requestHash = await fingerprint({ email, password: input.password, intent })
      let credentialSnapshot: { accountId: string; credential: StoredCredential } | undefined
      try {
        credentialSnapshot = await transact(context, ['accounts', 'credentials'], 'readonly', async (transaction) => {
          const found = await requestAccountByEmail(transaction, email)
          if (!found || found.deleted) return undefined
          const credential = await readRecord<StoredCredential>(transaction, 'credentials', found.id)
          return credential && (credential.email ?? found.email) === email ? { accountId: found.id, credential } : undefined
        })
      } catch (error) {
        return errorResult(error)
      }
      const suppliedHash = credentialSnapshot
        ? await passwordHash(input.password, credentialSnapshot.credential.passwordSalt)
        : undefined
      return mutate(context, {
        operationId: input.operationId,
        kind: 'identity.sign-in',
        payloadFingerprint: requestHash,
        stores: ['accounts', 'credentials', 'sessions', 'projects', 'meta'],
        authenticated: false,
        allowAnonymous: true,
        onReplay: async (transaction, previous) => {
          const result = previous.result as { account: AccountSnapshot; session: Session }
          if (result.session.expiresAt <= nowMs(context.clock)) return
          const account = await readRecord<AccountSnapshot>(transaction, 'accounts', result.account.id)
          if (!account || account.deleted) return
          await writeRecord(transaction, 'meta', { key: activeSessionMetaKey(context), value: result.session.id })
        },
        work: async (transaction) => {
          if (!validEmail(email)) throw serviceError('validation', 'Enter a valid email.')
          const found = await requestAccountByEmail(transaction, email)
          const credential = found ? await readRecord<StoredCredential>(transaction, 'credentials', found.id) : undefined
          if (
            !found ||
            found.deleted ||
            !credential ||
            !credentialSnapshot ||
            credentialSnapshot.accountId !== found.id ||
            (credential.email ?? found.email) !== email ||
            credentialSnapshot.credential.passwordSalt !== credential.passwordSalt ||
            credentialSnapshot.credential.passwordHash !== credential.passwordHash ||
            suppliedHash !== credential.passwordHash
          ) {
            throw serviceError('unauthenticated', 'Email or password is incorrect.')
          }

          const session = newSession(found.id, context.clock)
          await writeRecord(transaction, 'sessions', session)
          await writeRecord(transaction, 'meta', { key: activeSessionMetaKey(context), value: session.id })
          let destination: SignInIntent = intent
          if (intent.kind === 'resume-project-screen') {
            const project = await readRecord<{ id: string; accountId: string; state: string }>(transaction, 'projects', intent.projectId)
            const validProject = project?.accountId === found.id && (
              (intent.screen === 'processing' && project.state === 'preparing') ||
              (intent.screen === 'record' && ['recording', 'ready'].includes(project.state)) ||
              (intent.screen === 'result' && ['assembling', 'ready'].includes(project.state))
            )
            if (!validProject) destination = { kind: 'new-dub' }
          }
          return { data: { account: found, session, destination }, accountId: found.id }
        },
      })
    },
    signOut: async (input) => {
      const requestHash = await fingerprint({ intent: 'sign-out' })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'identity.sign-out',
        payloadFingerprint: requestHash,
        stores: ['meta'],
        work: async (transaction) => {
          const active = await requireContext(transaction, context)
          if (input.expectedRevision && active.account.revision !== input.expectedRevision) {
            throw revisionConflict('Account changed. Reload before signing out.', active.account.revision)
          }
          await transaction.objectStore('meta').delete(activeSessionMetaKey(context))
          return { data: { signedOut: true } as const }
        },
      })
    },
    google: async (input) => {
      if (input.purpose === 'link') {
        const requestHash = await fingerprint({ intentId: input.intentId, linkStep: input.linkStep })
        const providerProofId = newOperationId()
        return mutate<GoogleIdentityResult>(context, {
          operationId: input.operationId,
          kind: `identity.google-link.${input.linkStep}`,
          payloadFingerprint: requestHash,
          stores: ['accounts', 'linkIntents'],
          work: async (transaction, accountId) => {
            if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
            const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
            if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
            const now = nowMs(context.clock)
            if (intent.expiresAt <= now) throw serviceError('expired', 'This link request has expired.')
            if (intent.state !== 'pending') throw serviceError('conflict', 'This link request is no longer active.')
            const account = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
            if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
            if (context.scenario === 'account-linking-google-cancelled') {
              return { data: { purpose: 'link', state: 'canceled' as const, linkStep: input.linkStep, destination: { kind: 'new-dub' as const }, welcomeGrantApplied: false, note: 'synthetic-mock-scenario' as const, message: 'The synthetic Google proof was cancelled.' }, accountId }
            }

            let address: string
            let purpose: StoredLinkProviderProof['purpose']
            if (input.linkStep === 'current') {
              if (intent.currentMethod !== 'google') throw serviceError('forbidden', 'This intent requires proof of a different current method.')
              const method = account.methods.find((candidate) => candidate.kind === 'google' && candidate.verified)
              if (!method) throw serviceError('forbidden', 'The current Google method is no longer available.')
              address = method.address
              purpose = 'account-link-current-provider'
            } else {
              if (intent.candidateMethod !== 'google') throw serviceError('forbidden', 'This intent requires proof of a different candidate method.')
              address = context.scenario === 'account-linking-google-owned-elsewhere'
                ? 'google-owned-elsewhere@example.invalid'
                : `google+${intent.id}@example.invalid`
              purpose = 'account-link-candidate-provider'
            }

            const providerProof: StoredLinkProviderProof = {
              id: providerProofId,
              accountId,
              intentId: intent.id,
              purpose,
              method: 'google',
              address,
              issuedAt: now,
              expiresAt: Math.min(intent.expiresAt, now + MOCK_LINK_PROOF_LIFETIME_MS),
            }
            intent.providerProofs.push(providerProof)
            intent.revision = asRevision(Number(intent.revision) + 1)
            await writeRecord(transaction, 'linkIntents', intent)
            return {
              data: {
                purpose: 'link' as const,
                state: 'completed' as const,
                providerProofId,
                linkStep: input.linkStep,
                destination: { kind: 'new-dub' as const },
                verifiedAddress: address,
                welcomeGrantApplied: false as const,
                note: 'synthetic-mock-scenario' as const,
              },
              accountId,
            }
          },
        })
      }

      const purpose = input.purpose
      const destination = purpose === 'registration' ? { kind: 'new-dub' as const } : input.destination ?? { kind: 'new-dub' as const }
      const scenario = context.googleScenario
      const requestHash = await fingerprint({ purpose, intentId: input.intentId, destination, scenario })
      const emailHash = await sha256(SYNTHETIC_GOOGLE_ADDRESS)
      return mutate<GoogleIdentityResult>(context, {
        operationId: input.operationId,
        kind: `identity.google.${purpose}`,
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['accounts', 'sessions', 'meta', 'projects', 'creditStates', 'ledger', 'accountHistory'],
        work: async (transaction) => {
          if (scenario === 'cancelled') {
            return {
              data: {
                purpose,
                state: 'canceled',
                destination,
                welcomeGrantApplied: false,
                note: 'synthetic-mock-scenario',
                message: 'The synthetic Google scenario was canceled. No account was changed.',
              },
            }
          }
          if (scenario === 'denied') {
            return {
              data: {
                purpose,
                state: 'denied',
                destination,
                welcomeGrantApplied: false,
                note: 'synthetic-mock-scenario',
                message: 'The synthetic Google scenario denied this request. No account was changed.',
              },
            }
          }
          if (scenario === 'conflict') {
            return {
              data: {
                purpose,
                state: 'conflict',
                destination,
                welcomeGrantApplied: false,
                verifiedAddress: SYNTHETIC_GOOGLE_ADDRESS,
                note: 'synthetic-mock-scenario',
                message: 'The synthetic Google identity is already bound elsewhere. No account was changed.',
              },
            }
          }
          if (scenario === 'link-required') {
            return {
              data: {
                purpose,
                state: 'link-required',
                destination,
                welcomeGrantApplied: false,
                verifiedAddress: SYNTHETIC_GOOGLE_ADDRESS,
                note: 'synthetic-mock-scenario',
                message: 'This synthetic Google identity requires the separate account-linking flow.',
              },
            }
          }

          const existing = await requestAccountByEmail(transaction, SYNTHETIC_GOOGLE_ADDRESS)
          if (!existing && purpose === 'sign-in') {
            return {
              data: {
                purpose,
                state: 'account-not-found',
                destination,
                welcomeGrantApplied: false,
                verifiedAddress: SYNTHETIC_GOOGLE_ADDRESS,
                note: 'synthetic-mock-scenario',
                message: 'No local account is bound to this synthetic Google identity. Create an account through Registration first.',
              },
            }
          }

          let account: StoredAccount
          let welcomeGrantApplied = false
          if (existing) {
            account = existing
            const googleMethod = account.methods.find((method) =>
              method.kind === 'google' && mockEmail(method.address) === SYNTHETIC_GOOGLE_ADDRESS,
            )
            if (!googleMethod?.verified) {
              const sameCanonicalEmail = mockEmail(account.email) === SYNTHETIC_GOOGLE_ADDRESS
              const matchingPasswordMethod = account.methods.some((method) =>
                method.kind === 'email-password' && method.verified && mockEmail(method.address) === SYNTHETIC_GOOGLE_ADDRESS,
              )
              if (!sameCanonicalEmail || !matchingPasswordMethod) {
                return {
                  data: {
                    purpose,
                    state: 'link-required',
                    destination,
                    welcomeGrantApplied: false,
                    verifiedAddress: SYNTHETIC_GOOGLE_ADDRESS,
                    note: 'synthetic-mock-scenario',
                    message: 'The provider email does not match this account canonical email. Use explicit account linking.',
                  },
                }
              }
              if (googleMethod) {
                googleMethod.verified = true
                googleMethod.linkedAt = nowMs(context.clock)
              } else {
                account.methods.push({
                  kind: 'google',
                  address: SYNTHETIC_GOOGLE_ADDRESS,
                  verified: true,
                  linkedAt: nowMs(context.clock),
                })
              }
              account.revision = asRevision(Number(account.revision) + 1)
              await writeRecord(transaction, 'accounts', account)
            }
          } else {
            const history = await readRecord<StoredAccountHistory>(transaction, 'accountHistory', emailHash)
            welcomeGrantApplied = !history?.welcomeGrantUsed
            account = {
              id: newAccountId(),
              email: SYNTHETIC_GOOGLE_ADDRESS,
              locale: 'en',
              revision: asRevision(1),
              deleted: false,
              createdAt: nowMs(context.clock),
              methods: [{
                kind: 'google',
                address: SYNTHETIC_GOOGLE_ADDRESS,
                verified: true,
                linkedAt: nowMs(context.clock),
              }],
            }
            const creditState: import('./mock-store').StoredCreditState = {
              accountId: account.id,
              revision: asRevision(1),
              available: welcomeGrantApplied ? INITIAL_CREDITS : 0,
              reserved: 0,
              purchasedRemainder: 0,
              welcomeGrantEligible: false,
              welcomeGrantApplied,
              capacityUsed: 0,
              capacityTotal: INITIAL_PROJECT_SLOTS,
              firstPurchaseUpgrade: false,
            }
            await writeRecord(transaction, 'accounts', account)
            await writeRecord(transaction, 'creditStates', creditState)
            if (welcomeGrantApplied) {
              const grant: import('./contracts').LedgerEntry = {
                id: newOperationId(),
                accountId: account.id,
                revision: asRevision(1),
                kind: 'welcome-grant',
                occurredAt: nowMs(context.clock),
                delta: INITIAL_CREDITS,
                availableAfter: creditState.available,
                reservedAfter: creditState.reserved,
                note: 'synthetic-mock-scenario',
              }
              await writeRecord(transaction, 'ledger', grant)
              await writeRecord(transaction, 'accountHistory', {
                emailHash,
                welcomeGrantUsed: true,
                lastDeletionAt: 0,
              } satisfies StoredAccountHistory)
            }
          }

          const session = newSession(account.id, context.clock)
          const resolvedDestination = purpose === 'registration'
            ? { kind: 'new-dub' as const }
            : await resolveSignInDestination(transaction, account.id, destination)
          await writeRecord(transaction, 'sessions', session)
          await writeRecord(transaction, 'meta', { key: activeSessionMetaKey(context), value: session.id })
          return {
            data: {
              purpose,
              state: 'completed',
              account,
              session,
              destination: resolvedDestination,
              welcomeGrantApplied,
              verifiedAddress: SYNTHETIC_GOOGLE_ADDRESS,
              note: 'synthetic-mock-scenario',
            },
            accountId: account.id,
          }
        },
      })
    },
  }

  const registration: RegistrationService = {
    start: async (input) => {
      const email = mockEmail(input.email)
      const passwordHashValue = await passwordHash(input.password, input.operationId)
      const emailHash = await sha256(email)
      const codeHash = await passwordHash(mockScenarioVerificationCode(input.operationId), input.operationId)
      const requestHash = await fingerprint({ email, password: input.password })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'registration.start',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['accounts', 'verifications', 'accountHistory'],
        onReplay: async (_transaction, previous) => requireRegistrationReplayOwner(context, previous.clientId),
        work: async (transaction) => {
          if (!validEmail(email)) throw serviceError('validation', 'Enter a valid email.')
          if (!validPassword(input.password)) throw serviceError('validation', 'Password must be at least 8 characters.')
          const now = nowMs(context.clock)
          const priorRequests = await recordsByIndex<StoredVerification>(transaction, 'verifications', 'emailPurpose', [email, 'registration'])
          const sends = priorRequests.flatMap((request) => activeSendTimes(request, now))
          if (sends.length >= MOCK_VERIFICATION_SEND_LIMIT) {
            throw serviceError('rate-limited', 'The hourly verification email limit has been reached. Resolve the request for the latest send state.', 'reconcile-first')
          }
          if (sends.some((sentAt) => sentAt + MOCK_RESEND_INTERVAL_MS > now)) {
            throw serviceError('rate-limited', 'Wait before requesting another code.', 'reconcile-first')
          }
          const existing = await requestAccountByEmail(transaction, email)
          let registrationMode: StoredVerification['registrationMode'] = 'create-account'
          if (existing && existing.methods.some((method) => method.kind === 'google' && method.address === email) && !existing.methods.some((method) => method.kind === 'email-password')) {
            registrationMode = 'add-password'
          } else if (existing) {
            throw serviceError('already-exists', 'An account already uses this email.')
          } else {
            const history = await readRecord<StoredAccountHistory>(transaction, 'accountHistory', emailHash)
            if (history?.welcomeGrantUsed) registrationMode = 'restore-deleted'
          }
          const verification = newVerification(input.operationId, email, 'registration', context.clock, codeHash, {
            passwordHash: passwordHashValue,
            accountId: existing?.id,
            registrationMode,
            emailHash,
            clientId: context.clientId,
          })
          verification.sendTimes = [...sends, now]
          for (const prior of priorRequests) {
            if (prior.state !== 'pending') continue
            prior.state = 'expired'
            prior.expiresAt = Math.min(prior.expiresAt, now)
            prior.revision = asRevision(Number(prior.revision) + 1)
            await writeRecord(transaction, 'verifications', prior)
          }
          await writeRecord(transaction, 'verifications', verification)
          return { data: asPending(verification, context.clock) }
        },
      })
    },
    resolve: async (input) => {
      try {
        return await transact(context, ['verifications', 'operations'], 'readonly', async (transaction) => {
          const request = await readRecord<StoredVerification>(transaction, 'verifications', input.requestId)
          if (!request || request.purpose !== 'registration') {
            return { status: 'ok', data: { state: 'not-found' }, replayed: false } as const
          }
          if (!(await registrationRequestOwnedBy(transaction, context, request))) {
            return { status: 'ok', data: { state: 'not-found' }, replayed: false } as const
          }
          if (request.state === 'completed') {
            return { status: 'ok', data: { state: 'completed' }, replayed: false } as const
          }
          if (request.state === 'expired' || request.expiresAt <= nowMs(context.clock)) {
            return { status: 'ok', data: { state: 'expired' }, replayed: false } as const
          }
          return { status: 'ok', data: asPending(request, context.clock), replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    verify: async (input) => {
      const requestHash = await fingerprint({ requestId: input.requestId, code: input.code })
      const suppliedCodeHash = await passwordHash(input.code, input.requestId)
      const preflight = await transact(context, ['verifications'], 'readonly', async (transaction) =>
        readRecord<StoredVerification>(transaction, 'verifications', input.requestId))
      const preflightEmailHash = preflight?.purpose === 'registration' ? await sha256(preflight.email) : undefined
      return mutate(context, {
        operationId: input.operationId,
        kind: 'registration.verify',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['verifications', 'accounts', 'credentials', 'sessions', 'meta', 'creditStates', 'ledger', 'accountHistory'],
        onReplay: async (_transaction, previous) => requireRegistrationReplayOwner(context, previous.clientId),
        work: async (transaction) => {
          const request = await readRecord<StoredVerification>(transaction, 'verifications', input.requestId)
          if (!request || request.purpose !== 'registration') {
            throw serviceError('invalid-code', 'This verification request is no longer active.')
          }
          if (!(await registrationRequestOwnedBy(transaction, context, request))) {
            throw serviceError('not-found', 'Registration request was not found.')
          }
          if (request.state !== 'pending' || request.expiresAt <= nowMs(context.clock)) {
            throw serviceError('invalid-code', 'This verification request is no longer active.')
          }
          if (suppliedCodeHash !== request.codeHash) throw serviceError('invalid-code', 'The verification code is incorrect.')
          if (preflight?.email !== request.email || !preflightEmailHash) throw revisionConflict('Registration details changed. Reconcile and retry.', preflight?.revision)
          if (!request.passwordHash) throw serviceError('validation', 'Registration details are incomplete.')
          const existing = request.registrationMode === 'add-password' ? await readRecord<StoredAccount>(transaction, 'accounts', request.accountId ?? '') : undefined
          if (request.registrationMode === 'add-password' && (!existing || existing.deleted || existing.email !== request.email)) {
            throw serviceError('not-found', 'The account for this verification was not found.')
          }
          if (request.registrationMode !== 'add-password' && await requestAccountByEmail(transaction, request.email)) {
            throw serviceError('already-exists', 'An account already uses this email.')
          }
          const account: StoredAccount = existing ?? {
            id: newAccountId(),
            email: request.email,
            locale: 'en',
            revision: asRevision(0),
            deleted: false,
            createdAt: nowMs(context.clock),
            methods: [],
          }
          if (!account.methods.some((method) => method.kind === 'email-password')) {
            account.methods.push({ kind: 'email-password', address: request.email, verified: true, linkedAt: nowMs(context.clock) })
          }
          account.revision = asRevision(Number(account.revision) + 1)
          const session = newSession(account.id, context.clock)
          const emailHash = preflightEmailHash
          const history = await readRecord<StoredAccountHistory>(transaction, 'accountHistory', emailHash)
          const shouldApplyWelcomeGrant = request.registrationMode !== 'add-password' && !history?.welcomeGrantUsed
          const previousCreditState = request.registrationMode === 'add-password'
            ? await readRecord<import('./mock-store').StoredCreditState>(transaction, 'creditStates', account.id)
            : undefined
          const creditState = {
            accountId: account.id,
            revision: previousCreditState ? asRevision(Number(previousCreditState.revision) + 1) : asRevision(1),
            available: previousCreditState?.available ?? (shouldApplyWelcomeGrant ? INITIAL_CREDITS : 0),
            reserved: previousCreditState?.reserved ?? 0,
            purchasedRemainder: previousCreditState?.purchasedRemainder ?? 0,
            welcomeGrantEligible: false,
            welcomeGrantApplied: previousCreditState?.welcomeGrantApplied ?? shouldApplyWelcomeGrant,
            capacityUsed: previousCreditState?.capacityUsed ?? 0,
            capacityTotal: previousCreditState?.capacityTotal ?? INITIAL_PROJECT_SLOTS,
            firstPurchaseUpgrade: previousCreditState?.firstPurchaseUpgrade ?? false,
          }
          request.state = 'completed'
          request.accountId = account.id
          request.revision = asRevision(Number(request.revision) + 1)
          const startOperation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', request.id)
          if (startOperation?.kind === 'registration.start') {
            startOperation.accountId = account.id
            await writeRecord(transaction, 'operations', startOperation)
          }
          await writeRecord(transaction, 'accounts', account)
          await writeRecord(transaction, 'credentials', { accountId: account.id, email: request.email, passwordHash: request.passwordHash, passwordSalt: request.id } satisfies StoredCredential)
          await writeRecord(transaction, 'sessions', session)
          await writeRecord(transaction, 'meta', { key: activeSessionMetaKey(context), value: session.id })
          await writeRecord(transaction, 'creditStates', creditState)
          if (shouldApplyWelcomeGrant) {
            const grantId = newOperationId()
            const ledger: import('./contracts').LedgerEntry = {
              id: grantId,
              accountId: account.id,
              revision: asRevision(1),
              kind: 'welcome-grant',
              occurredAt: nowMs(context.clock),
              delta: INITIAL_CREDITS,
              availableAfter: creditState.available,
              reservedAfter: creditState.reserved,
              note: 'synthetic-mock-scenario',
            }
            await writeRecord(transaction, 'ledger', ledger)
            await writeRecord(transaction, 'accountHistory', { emailHash, welcomeGrantUsed: true, lastDeletionAt: 0 } satisfies StoredAccountHistory)
          }
          await writeRecord(transaction, 'verifications', request)
          return {
            data: {
              account,
              session,
              credits: creditSnapshot(creditState),
              outcome: existing ? 'password-method-added' as const : 'new-account' as const,
              welcomeGrantApplied: shouldApplyWelcomeGrant,
            },
            accountId: account.id,
          }
        },
      })
    },
    resend: async (input) => {
      return registrationResend(context, input.requestId, input)
    },
    correctEmail: async (input) => {
      const email = mockEmail(input.email)
      const passwordHashValue = await passwordHash(input.password, input.requestId)
      const emailHash = await sha256(email)
      const preflight = await transact(context, ['verifications'], 'readonly', (transaction) =>
        readRecord<StoredVerification>(transaction, 'verifications', input.requestId))
      const expectedCodeGeneration = preflight?.codeGeneration ?? 0
      const nextCodeGeneration = expectedCodeGeneration + 1
      const replacementCodeHash = await passwordHash(mockScenarioVerificationCode(input.requestId, nextCodeGeneration), input.requestId)
      const requestHash = await fingerprint({ requestId: input.requestId, email, password: input.password })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'registration.correct-email',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['verifications', 'accounts'],
        onReplay: async (_transaction, previous) => requireRegistrationReplayOwner(context, previous.clientId),
        work: async (transaction) => {
          const request = await readRecord<StoredVerification>(transaction, 'verifications', input.requestId)
          if (!request || request.purpose !== 'registration' || !(await registrationRequestOwnedBy(transaction, context, request))) throw serviceError('not-found', 'Registration request was not found.')
          if (request.state !== 'pending' || request.expiresAt <= nowMs(context.clock)) throw serviceError('not-found', 'Registration request was not found.')
          if ((request.codeGeneration ?? 0) !== expectedCodeGeneration) throw revisionConflict('Registration code changed. Reconcile and retry.', request.revision)
          if (!validEmail(email)) throw serviceError('validation', 'Enter a valid email.')
          if (!validPassword(input.password)) throw serviceError('validation', 'Password must be at least 8 characters.')
          const duplicate = await requestAccountByEmail(transaction, email)
          if (duplicate) throw serviceError('already-exists', 'An account already uses this email.')
          const now = nowMs(context.clock)
          const priorRequests = await recordsByIndex<StoredVerification>(transaction, 'verifications', 'emailPurpose', [email, 'registration'])
          const sends = priorRequests.flatMap((prior) => activeSendTimes(prior, now))
          if (sends.length >= MOCK_VERIFICATION_SEND_LIMIT) {
            throw serviceError('rate-limited', 'The hourly verification email limit has been reached. Resolve the request for the latest send state.', 'reconcile-first')
          }
          if (sends.some((sentAt) => sentAt + MOCK_RESEND_INTERVAL_MS > now)) {
            throw serviceError('rate-limited', 'Wait before requesting another code.', 'reconcile-first')
          }
          for (const prior of priorRequests) {
            if (prior.id === request.id || prior.state !== 'pending') continue
            prior.state = 'expired'
            prior.expiresAt = Math.min(prior.expiresAt, now)
            prior.revision = asRevision(Number(prior.revision) + 1)
            await writeRecord(transaction, 'verifications', prior)
          }
          request.email = email
          request.emailHash = emailHash
          request.passwordHash = passwordHashValue
          request.codeGeneration = nextCodeGeneration
          request.codeHash = replacementCodeHash
          request.expiresAt = now + MOCK_VERIFICATION_LIFETIME_MS
          request.resendAvailableAt = now + MOCK_RESEND_INTERVAL_MS
          request.resendCount = 0
          request.sendTimes = [...sends, now]
          request.revision = asRevision(Number(request.revision) + 1)
          await writeRecord(transaction, 'verifications', request)
          return { data: asPending(request, context.clock) }
        },
      })
    },
  }

  const passwordReset: PasswordResetService = {
    start: async (input) => {
      const email = mockEmail(input.email)
      const codeHash = await passwordHash(mockScenarioVerificationCode(input.operationId), input.operationId)
      const requestHash = await fingerprint({ email, returnIntent: input.returnIntent })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'password-reset.start',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['accounts', 'credentials', 'projects', 'verifications'],
        work: async (transaction) => {
          if (!validEmail(email)) throw serviceError('validation', 'Enter a valid email.')
          const account = await requestAccountByEmail(transaction, email)
          const credential = account && !account.deleted ? await readRecord<StoredCredential>(transaction, 'credentials', account.id) : undefined
          const disabledResetScenario = context.scenario === 'password-reset-disabled-account'
          const canReset = Boolean(!disabledResetScenario && account && !account.deleted && credential && (credential.email ?? account.email) === email)
          const returnIntent = canReset && account
            ? await projectReturnIntent(transaction, account.id, input.returnIntent)
            : undefined
          const verification = newVerification(input.operationId, email, 'password-reset', context.clock, codeHash, {
            accountId: canReset ? account?.id : undefined,
            returnIntent,
            clientId: context.clientId,
          })
          verification.expiresAt = nowMs(context.clock) + MOCK_LINK_CODE_LIFETIME_MS
          await writeRecord(transaction, 'verifications', verification)
          return { data: asPending(verification, context.clock) }
        },
      })
    },
    verify: async (input) => {
      const requestHash = await fingerprint({ requestId: input.requestId, code: input.code })
      const suppliedCodeHash = await passwordHash(input.code, input.requestId)
      return mutate(context, {
        operationId: input.operationId,
        kind: 'password-reset.verify',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['verifications', 'resetGrants', 'accounts', 'credentials'],
        work: async (transaction) => {
          const request = await readRecord<StoredVerification>(transaction, 'verifications', input.requestId)
          if (!request || request.clientId !== context.clientId || request.purpose !== 'password-reset' || request.state !== 'pending' || request.expiresAt <= nowMs(context.clock)) {
            throw serviceError('invalid-code', 'This reset request is no longer active.')
          }
          if (suppliedCodeHash !== request.codeHash) throw serviceError('invalid-code', 'The verification code is incorrect.')
          if (!request.accountId) throw serviceError('invalid-code', 'The verification code is incorrect.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', request.accountId)
          const credential = await readRecord<StoredCredential>(transaction, 'credentials', request.accountId)
          if (!account || account.deleted || !credential || (credential.email ?? account.email) !== request.email) {
            throw serviceError('invalid-code', 'The verification code is incorrect.')
          }
          request.state = 'verified'
          request.revision = asRevision(Number(request.revision) + 1)
          const startOperation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', request.id)
          if (startOperation?.kind === 'password-reset.start') {
            startOperation.accountId = account.id
            await writeRecord(transaction, 'operations', startOperation)
          }
          const grant: StoredResetGrant = {
            id: newOperationId(),
            accountId: request.accountId,
            email: request.email,
            requestId: request.id,
            clientId: context.clientId,
            expiresAt: nowMs(context.clock) + MOCK_RESET_LIFETIME_MS,
            revision: asRevision(0),
            used: false,
          }
          await writeRecord(transaction, 'verifications', request)
          await writeRecord(transaction, 'resetGrants', grant)
          return { data: { resetGrantId: grant.id, expiresAt: grant.expiresAt } }
        },
      })
    },
    complete: async (input) => {
      const requestHash = await fingerprint({ resetGrantId: input.resetGrantId, newPassword: input.newPassword })
      const salt = newOperationId()
      const newPasswordHash = await passwordHash(input.newPassword, salt)
      return mutate(context, {
        operationId: input.operationId,
        kind: 'password-reset.complete',
        payloadFingerprint: requestHash,
        authenticated: false,
        allowAnonymous: true,
        stores: ['resetGrants', 'accounts', 'credentials', 'sessions', 'meta', 'verifications', 'projects'],
        work: async (transaction) => {
          if (!validPassword(input.newPassword)) throw serviceError('validation', 'Password must be at least 8 characters.')
          const grant = await readRecord<StoredResetGrant>(transaction, 'resetGrants', input.resetGrantId)
          if (!grant || grant.clientId !== context.clientId || grant.used || grant.expiresAt <= nowMs(context.clock)) throw serviceError('expired', 'This password reset is no longer active.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', grant.accountId)
          if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
          const verification = await readRecord<StoredVerification>(transaction, 'verifications', grant.requestId)
          const currentCredential = await readRecord<StoredCredential>(transaction, 'credentials', account.id)
          if (!verification || verification.purpose !== 'password-reset' || verification.state !== 'verified' || verification.accountId !== account.id || verification.email !== grant.email) {
            throw serviceError('expired', 'This password reset is no longer active.')
          }
          if (!currentCredential || (currentCredential.email ?? account.email) !== grant.email) {
            throw serviceError('forbidden', 'This reset request is not bound to an active password method.')
          }
          const credential: StoredCredential = { accountId: account.id, email: grant.email, passwordHash: newPasswordHash, passwordSalt: salt }
          const destination = await projectReturnIntent(transaction, account.id, verification.returnIntent)
          const sessions = await recordsByIndex<Session>(transaction, 'sessions', 'accountId', account.id)
          for (const session of sessions) {
            await transaction.objectStore('sessions').delete(session.id)
          }
          const session = newSession(account.id, context.clock)
          account.revision = asRevision(Number(account.revision) + 1)
          verification.state = 'completed'
          verification.revision = asRevision(Number(verification.revision) + 1)
          await writeRecord(transaction, 'credentials', credential)
          await writeRecord(transaction, 'accounts', account)
          await writeRecord(transaction, 'sessions', session)
          await writeRecord(transaction, 'meta', { key: activeSessionMetaKey(context), value: session.id })
          await writeRecord(transaction, 'verifications', verification)
          grant.used = true
          grant.revision = asRevision(Number(grant.revision) + 1)
          await writeRecord(transaction, 'resetGrants', grant)
          return { data: { account, session, destination }, accountId: account.id }
        },
      })
    },
    resend: async (input) => registrationResend(context, input.requestId, input, 'password-reset'),
    resolve: async (input) => {
      try {
        return await transact(context, ['accounts', 'projects', 'verifications', 'resetGrants'], 'readonly', async (transaction) => {
          const verification = await readRecord<StoredVerification>(transaction, 'verifications', input.requestId)
          if (!verification || verification.clientId !== context.clientId || verification.purpose !== 'password-reset') return { status: 'ok', data: { state: 'not-found' }, replayed: false } as const
          if (verification.state === 'completed') {
            const account = verification.accountId ? await readRecord<StoredAccount>(transaction, 'accounts', verification.accountId) : undefined
            const destination = account && !account.deleted
              ? await projectReturnIntent(transaction, account.id, verification.returnIntent)
              : { kind: 'new-dub' as const }
            return { status: 'ok', data: { state: 'completed', destination }, replayed: false } as const
          }
          if (verification.expiresAt <= nowMs(context.clock) && verification.state === 'pending') return { status: 'ok', data: { state: 'expired' }, replayed: false } as const
          if (verification.state === 'verified') {
            const grants = await requestResult(transaction.objectStore('resetGrants').getAll()) as StoredResetGrant[]
            const grant = grants.find((candidate) => candidate.requestId === verification.id && candidate.clientId === context.clientId)
            if (!grant || grant.used || grant.expiresAt <= nowMs(context.clock)) return { status: 'ok', data: { state: 'expired' }, replayed: false } as const
            return { status: 'ok', data: { state: 'verified', resetGrantId: grant.id, expiresAt: grant.expiresAt }, replayed: false } as const
          }
          return { status: 'ok', data: asPending(verification, context.clock), replayed: false } as const
        })
      } catch (error) {
        return { status: 'error', error: { code: 'storage-unavailable', message: error instanceof Error ? error.message : 'Reset status is unavailable.', retry: 'reconcile-first' } }
      }
    },
  }

  const accountLinking: AccountLinkingService = {
    start: async (input) => {
      const intentId = newOperationId()
      const candidateMethod = input.candidate.method
      const candidateEmail = input.candidate.method === 'email-password' ? mockEmail(input.candidate.email) : undefined
      const candidatePasswordSalt = input.candidate.method === 'email-password' ? newOperationId() : undefined
      const candidatePasswordHash = input.candidate.method === 'email-password'
        ? await passwordHash(input.candidate.password, candidatePasswordSalt!)
        : undefined
      const verificationRequestId = candidateMethod === 'email-password' ? newOperationId() : undefined
      const codeHash = verificationRequestId
        ? await passwordHash(mockScenarioVerificationCode(verificationRequestId), verificationRequestId)
        : undefined
      const requestHash = await fingerprint({
        currentMethod: input.currentMethod,
        candidate: input.candidate,
        expectedAccountRevision: input.expectedAccountRevision,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account-linking.start',
        payloadFingerprint: requestHash,
        stores: ['accounts', 'credentials', 'linkIntents', 'verifications'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
          if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
          if (account.revision !== input.expectedAccountRevision) throw revisionConflict('Account methods changed. Reload before linking.', account.revision)
          if (!account.methods.some((method) => method.kind === input.currentMethod && method.verified)) {
            throw serviceError('forbidden', 'The selected current sign-in method is not linked to this account.')
          }
          if (input.currentMethod === candidateMethod) throw serviceError('validation', 'Choose a different sign-in method to link.')
          if (account.methods.some((method) => method.kind === candidateMethod)) {
            throw serviceError('already-exists', 'This sign-in method is already linked.')
          }
          if (candidateMethod === 'email-password') {
            if (!candidateEmail || !validEmail(candidateEmail)) throw serviceError('validation', 'Enter a valid email to link.')
            if (!validPassword(input.candidate.password)) throw serviceError('validation', 'Password must be at least 8 characters.')
            if (candidateEmail === account.email) throw serviceError('conflict', 'Use the existing account sign-in or recovery path for this email.')
            if (await requestAccountByEmail(transaction, candidateEmail)) throw serviceError('conflict', 'This method cannot be linked to the current account.')
          }
          const expiresAt = nowMs(context.clock) + MOCK_LINK_LIFETIME_MS
          const intent: StoredLinkIntent = {
            id: intentId,
            accountId,
            currentMethod: input.currentMethod,
            candidateMethod,
            candidateEmail,
            candidatePasswordHash,
            candidatePasswordSalt,
            candidateVerificationRequestId: verificationRequestId,
            candidateSendTimes: verificationRequestId ? [nowMs(context.clock)] : [],
            expectedAccountRevision: account.revision,
            proofs: [],
            providerProofs: [],
            expiresAt,
            state: 'pending',
            revision: asRevision(0),
          }
          await writeRecord(transaction, 'linkIntents', intent)
          if (verificationRequestId && candidateEmail) {
            const verification = newVerification(verificationRequestId, candidateEmail, 'link-candidate-email', context.clock, codeHash!, { accountId, linkIntentId: intentId })
            verification.expiresAt = nowMs(context.clock) + MOCK_LINK_CODE_LIFETIME_MS
            await writeRecord(transaction, 'verifications', verification)
          }
          return { data: linkIntentSnapshot(intent), accountId }
        },
      })
    },
    proveCurrent: async (input) => {
      let credentialSnapshot: { accountId: string; credential: StoredCredential; intent: StoredLinkIntent; address: string } | undefined
      let suppliedPasswordHash: string | undefined
      if ('password' in input) {
        try {
          const preflight = await transact(context, ['meta', 'sessions', 'accounts', 'credentials', 'linkIntents'], 'readonly', async (transaction) => {
            const { account } = await requireContext(transaction, context)
            const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
            const stored = await readRecord<StoredAccount>(transaction, 'accounts', account.id)
            const credential = await readRecord<StoredCredential>(transaction, 'credentials', account.id)
            const method = stored?.methods.find((candidate) => candidate.kind === 'email-password' && candidate.verified)
            if (!intent || intent.accountId !== account.id || !stored || !credential || !method) return undefined
            return { accountId: account.id, credential, intent, address: method.address }
          })
          if (preflight) {
            credentialSnapshot = preflight
            suppliedPasswordHash = await passwordHash(input.password, preflight.credential.passwordSalt)
          }
        } catch (error) {
          return errorResult(error)
        }
      }
      const requestHash = await fingerprint('password' in input
        ? { intentId: input.intentId, password: input.password }
        : { intentId: input.intentId, providerProofId: input.providerProofId })
      const proofId = newOperationId()
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account-linking.prove-current',
        payloadFingerprint: requestHash,
        stores: ['linkIntents', 'accounts', 'credentials'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
          const now = nowMs(context.clock)
          if (intent.expiresAt <= now) throw serviceError('expired', 'This link request has expired.')
          if (intent.state !== 'pending') throw serviceError('conflict', 'This link request is no longer active.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
          if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
          if (account.revision !== intent.expectedAccountRevision) throw revisionConflict('Account methods changed. Restart linking with the current account state.', account.revision)
          let address: string
          if ('password' in input) {
            const credential = await readRecord<StoredCredential>(transaction, 'credentials', accountId)
            const method = account.methods.find((candidate) => candidate.kind === 'email-password' && candidate.verified)
            if (
              intent.currentMethod !== 'email-password' ||
              !credential ||
              !method ||
              !credentialSnapshot ||
              credentialSnapshot.accountId !== accountId ||
              credentialSnapshot.credential.passwordHash !== credential.passwordHash ||
              credentialSnapshot.credential.passwordSalt !== credential.passwordSalt ||
              (credential.email ?? account.email) !== method.address ||
              suppliedPasswordHash !== credential.passwordHash
            ) {
              throw serviceError('unauthenticated', 'Current password proof is incorrect.')
            }
            address = method.address
          } else {
            if (intent.currentMethod !== 'google') throw serviceError('forbidden', 'This intent requires proof of a different current method.')
            const providerProof = intent.providerProofs.find((proof) =>
              proof.id === input.providerProofId &&
              proof.purpose === 'account-link-current-provider' &&
              proof.method === 'google' &&
              proof.accountId === accountId &&
              proof.intentId === intent.id &&
              proof.expiresAt > now,
            )
            if (!providerProof) throw serviceError('forbidden', 'A fresh current-method provider proof is required.')
            address = providerProof.address
          }
          const proof: StoredLinkProof = {
            id: proofId,
            accountId,
            intentId: intent.id,
            purpose: 'account-link-current',
            method: intent.currentMethod,
            address,
            issuedAt: now,
            expiresAt: Math.min(intent.expiresAt, now + MOCK_LINK_PROOF_LIFETIME_MS),
          }
          intent.proofs.push(proof)
          intent.currentProofId = proof.id
          intent.revision = asRevision(Number(intent.revision) + 1)
          await writeRecord(transaction, 'linkIntents', intent)
          return { data: { proofId, method: proof.method, expiresAt: proof.expiresAt, note: 'synthetic-mock-scenario' as const }, accountId }
        },
      })
    },
    proveCandidate: async (input) => {
      let verificationId: OperationId | undefined
      if ('code' in input) {
        try {
          verificationId = await transact(context, ['meta', 'sessions', 'accounts', 'linkIntents'], 'readonly', async (transaction) => {
            const { account } = await requireContext(transaction, context)
            const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
            return intent?.accountId === account.id ? intent.candidateVerificationRequestId : undefined
          })
        } catch (error) {
          return errorResult(error)
        }
      }
      const suppliedCodeHash = 'code' in input && verificationId
        ? await passwordHash(input.code, verificationId)
        : undefined
      const requestHash = await fingerprint('code' in input
        ? { intentId: input.intentId, code: input.code }
        : { intentId: input.intentId, providerProofId: input.providerProofId })
      const proofId = newOperationId()
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account-linking.prove-candidate',
        payloadFingerprint: requestHash,
        stores: ['linkIntents', 'verifications', 'accounts'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
          const now = nowMs(context.clock)
          if (intent.expiresAt <= now) throw serviceError('expired', 'This link request has expired.')
          if (intent.state !== 'pending') throw serviceError('conflict', 'This link request is no longer active.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
          if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
          if (account.revision !== intent.expectedAccountRevision) throw revisionConflict('Account methods changed. Restart linking with the current account state.', account.revision)
          let address: string
          if ('code' in input) {
            const verification = intent.candidateVerificationRequestId
              ? await readRecord<StoredVerification>(transaction, 'verifications', intent.candidateVerificationRequestId)
              : undefined
            if (
              intent.candidateMethod !== 'email-password' ||
              !verification ||
              verification.id !== verificationId ||
              verification.purpose !== 'link-candidate-email' ||
              verification.linkIntentId !== intent.id ||
              verification.accountId !== accountId ||
              verification.email !== intent.candidateEmail ||
              verification.state !== 'pending' ||
              verification.expiresAt <= now ||
              suppliedCodeHash !== verification.codeHash
            ) {
              throw serviceError('invalid-code', 'The candidate email proof is not valid for this link request.')
            }
            verification.state = 'completed'
            verification.revision = asRevision(Number(verification.revision) + 1)
            await writeRecord(transaction, 'verifications', verification)
            address = verification.email
          } else {
            if (intent.candidateMethod !== 'google') throw serviceError('forbidden', 'This intent requires proof of a different candidate method.')
            const providerProof = intent.providerProofs.find((proof) =>
              proof.id === input.providerProofId &&
              proof.purpose === 'account-link-candidate-provider' &&
              proof.method === 'google' &&
              proof.accountId === accountId &&
              proof.intentId === intent.id &&
              proof.expiresAt > now,
            )
            if (!providerProof) throw serviceError('forbidden', 'A fresh candidate provider proof is required.')
            address = providerProof.address
          }
          if (address === account.email) throw serviceError('conflict', 'This method cannot be linked to the current account.')
          const proof: StoredLinkProof = {
            id: proofId,
            accountId,
            intentId: intent.id,
            purpose: 'account-link-candidate',
            method: intent.candidateMethod,
            address,
            issuedAt: now,
            expiresAt: Math.min(intent.expiresAt, now + MOCK_LINK_PROOF_LIFETIME_MS),
          }
          intent.proofs.push(proof)
          intent.candidateProofId = proof.id
          intent.revision = asRevision(Number(intent.revision) + 1)
          await writeRecord(transaction, 'linkIntents', intent)
          return { data: { proofId, candidate: { method: proof.method, address }, expiresAt: proof.expiresAt, note: 'synthetic-mock-scenario' as const }, accountId }
        },
      })
    },
    resendCandidate: async (input) => {
      const requestHash = await fingerprint({ intentId: input.intentId })
      const nextRequestId = newOperationId()
      const codeHash = await passwordHash(mockScenarioVerificationCode(nextRequestId), nextRequestId)
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account-linking.resend-candidate',
        payloadFingerprint: requestHash,
        stores: ['linkIntents', 'verifications'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
          const now = nowMs(context.clock)
          if (intent.expiresAt <= now) throw serviceError('expired', 'This link request has expired.')
          if (intent.state !== 'pending' || intent.candidateMethod !== 'email-password' || !intent.candidateEmail) {
            throw serviceError('conflict', 'This link request cannot resend an email code.')
          }
          const recentSends = intent.candidateSendTimes.filter((sentAt) => sentAt > now - 60 * 60 * 1000)
          const lastSentAt = recentSends.at(-1)
          if ((lastSentAt !== undefined && now < lastSentAt + MOCK_LINK_CODE_RESEND_MS) || recentSends.length >= MOCK_LINK_CODE_SENDS_PER_HOUR) {
            throw serviceError('rate-limited', 'A new code cannot be sent yet.')
          }
          const previous = intent.candidateVerificationRequestId
            ? await readRecord<StoredVerification>(transaction, 'verifications', intent.candidateVerificationRequestId)
            : undefined
          if (previous?.state === 'pending') {
            previous.state = 'expired'
            previous.revision = asRevision(Number(previous.revision) + 1)
            await writeRecord(transaction, 'verifications', previous)
          }
          const verification = newVerification(nextRequestId, intent.candidateEmail, 'link-candidate-email', context.clock, codeHash, { accountId, linkIntentId: intent.id })
          verification.expiresAt = now + MOCK_LINK_CODE_LIFETIME_MS
          intent.candidateVerificationRequestId = nextRequestId
          intent.candidateSendTimes = [...recentSends, now]
          intent.revision = asRevision(Number(intent.revision) + 1)
          await writeRecord(transaction, 'linkIntents', intent)
          await writeRecord(transaction, 'verifications', verification)
          return { data: linkIntentSnapshot(intent), accountId }
        },
      })
    },
    commit: async (input) => {
      const requestHash = await fingerprint({
        intentId: input.intentId,
        currentProofId: input.currentProofId,
        candidateProofId: input.candidateProofId,
        expectedAccountRevision: input.expectedAccountRevision,
      })
      return mutate<
        | { state: 'conflict'; intent: LinkIntentSnapshot }
        | { state: 'completed'; account: AccountSnapshot; methods: AccountSettingsSnapshot['methods'] }
      >(context, {
        operationId: input.operationId,
        kind: 'account-linking.commit',
        payloadFingerprint: requestHash,
        stores: ['accounts', 'credentials', 'linkIntents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
          const now = nowMs(context.clock)
          if (intent.expiresAt <= now) throw serviceError('expired', 'This link request has expired.')
          if (intent.state !== 'pending') throw serviceError('conflict', 'This link request is no longer active.')
          const account = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
          if (!account || account.deleted) throw serviceError('not-found', 'Account was not found.')
          if (input.expectedAccountRevision !== intent.expectedAccountRevision || account.revision !== intent.expectedAccountRevision) {
            throw revisionConflict('Account methods changed. Reload before linking.', account.revision)
          }
          const currentProof = intent.proofs.find((proof) => proof.id === input.currentProofId)
          const candidateProof = intent.proofs.find((proof) => proof.id === input.candidateProofId)
          if (
            input.currentProofId !== intent.currentProofId ||
            input.candidateProofId !== intent.candidateProofId ||
            !currentProof ||
            !candidateProof ||
            currentProof.purpose !== 'account-link-current' ||
            candidateProof.purpose !== 'account-link-candidate' ||
            currentProof.accountId !== accountId ||
            candidateProof.accountId !== accountId ||
            currentProof.intentId !== intent.id ||
            candidateProof.intentId !== intent.id ||
            currentProof.method !== intent.currentMethod ||
            candidateProof.method !== intent.candidateMethod ||
            currentProof.consumedAt !== undefined ||
            candidateProof.consumedAt !== undefined
          ) {
            throw serviceError('forbidden', 'Fresh current and candidate proofs for this link request are required.')
          }
          if (currentProof.expiresAt <= now || candidateProof.expiresAt <= now) throw serviceError('expired', 'A link proof has expired. Prove both methods again.')
          if (currentProof.address === candidateProof.address) throw serviceError('conflict', 'The candidate method must be distinct from the current method.')

          const owner = await requestAccountByEmail(transaction, candidateProof.address)
          if (owner) {
            intent.state = 'conflict'
            intent.revision = asRevision(Number(intent.revision) + 1)
            await writeRecord(transaction, 'linkIntents', intent)
            return { data: { state: 'conflict' as const, intent: linkIntentSnapshot(intent) }, accountId }
          }
          if (account.methods.some((method) => method.kind === intent.candidateMethod)) {
            throw serviceError('already-exists', 'This sign-in method is already linked.')
          }
          const linkedAt = now
          account.methods.push({ kind: intent.candidateMethod, address: candidateProof.address, verified: true, linkedAt })
          if (intent.candidateMethod === 'email-password') {
            if (!intent.candidatePasswordHash || !intent.candidatePasswordSalt || !intent.candidateEmail || intent.candidateEmail !== candidateProof.address) {
              throw serviceError('validation', 'The candidate password method is incomplete.')
            }
            const credential = await readRecord<StoredCredential>(transaction, 'credentials', accountId)
            if (credential) throw serviceError('already-exists', 'A password method is already linked.')
            await writeRecord(transaction, 'credentials', {
              accountId,
              email: intent.candidateEmail,
              passwordHash: intent.candidatePasswordHash,
              passwordSalt: intent.candidatePasswordSalt,
            } satisfies StoredCredential)
          }
          account.revision = asRevision(Number(account.revision) + 1)
          currentProof.consumedAt = now
          candidateProof.consumedAt = now
          intent.state = 'completed'
          intent.candidatePasswordHash = undefined
          intent.candidatePasswordSalt = undefined
          intent.revision = asRevision(Number(intent.revision) + 1)
          await writeRecord(transaction, 'accounts', account)
          await writeRecord(transaction, 'linkIntents', intent)
          return { data: { state: 'completed' as const, account, methods: account.methods }, accountId }
        },
      })
    },
    cancel: async (input) => {
      const requestHash = await fingerprint({ intentId: input.intentId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account-linking.cancel',
        payloadFingerprint: requestHash,
        stores: ['linkIntents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== accountId) throw serviceError('not-found', 'Link request was not found.')
          if (intent.state === 'completed') throw serviceError('conflict', 'A completed method link cannot be cancelled.')
          if (intent.state !== 'cancelled') {
            intent.state = 'cancelled'
            intent.candidatePasswordHash = undefined
            intent.candidatePasswordSalt = undefined
            intent.revision = asRevision(Number(intent.revision) + 1)
            await writeRecord(transaction, 'linkIntents', intent)
          }
          return { data: { state: 'cancelled' as const, intent: linkIntentSnapshot(intent) }, accountId }
        },
      })
    },
    resolve: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'linkIntents'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const intent = await readRecord<StoredLinkIntent>(transaction, 'linkIntents', input.intentId)
          if (!intent || intent.accountId !== account.id) return { status: 'ok', data: { state: 'not-found' }, replayed: false } as const
          const snapshot = linkIntentSnapshot(intent)
          if (snapshot.state === 'completed') {
            const stored = await readRecord<StoredAccount>(transaction, 'accounts', account.id)
            return { status: 'ok', data: { state: 'completed', intent: snapshot, account: stored ?? account, methods: stored?.methods ?? [] }, replayed: false } as const
          }
          return { status: 'ok', data: { state: snapshot.state, intent: snapshot }, replayed: false } as const
        })
      } catch (error) {
        return { status: 'error', error: { code: 'storage-unavailable', message: error instanceof Error ? error.message : 'Link status is unavailable.', retry: 'reconcile-first' } }
      }
    },
  }

  const account: AccountService = {
    load: async () => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'creditStates'], 'readonly', async (transaction) => {
          const { account: current } = await requireContext(transaction, context)
          const full = await readRecord<StoredAccount>(transaction, 'accounts', current.id)
          const credits = await readRecord<import('./mock-store').StoredCreditState>(transaction, 'creditStates', current.id)
          if (!full || !credits) throw serviceError('not-found', 'Account settings are unavailable.')
          const data: AccountSettingsSnapshot = {
            ...full,
            methods: full.methods,
            deletionEligible: true,
            purchasedRemainder: credits.purchasedRemainder,
            note: 'synthetic-mock-scenario',
          }
          return { status: 'ok', data, replayed: false } as const
        })
      } catch (error) {
        return accountServiceError<AccountSettingsSnapshot>(error)
      }
    },
    setLocale: async (input) => {
      const requestHash = await fingerprint({ locale: input.locale, expectedRevision: input.expectedRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account.set-locale',
        payloadFingerprint: requestHash,
        stores: ['accounts'],
        work: async (transaction, accountId) => {
          const current = await requireContext(transaction, context)
          if (current.account.id !== accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          if (current.account.revision !== input.expectedRevision) throw revisionConflict('Account changed. Reload before saving.', current.account.revision)
          const full = await readRecord<StoredAccount>(transaction, 'accounts', accountId)
          if (!full) throw serviceError('not-found', 'Account was not found.')
          full.locale = input.locale
          full.revision = asRevision(Number(full.revision) + 1)
          await writeRecord(transaction, 'accounts', full)
          return { data: full, accountId }
        },
      })
    },
    changePassword: async (input) => {
      const requestHash = await fingerprint({ currentPassword: input.currentPassword, newPassword: input.newPassword, expectedRevision: input.expectedRevision })
      let credentialSnapshot: { accountId: string; credential: StoredCredential } | undefined
      try {
        credentialSnapshot = await transact(context, ['meta', 'sessions', 'accounts', 'credentials'], 'readonly', async (transaction) => {
          const current = await requireContext(transaction, context)
          const credential = await readRecord<StoredCredential>(transaction, 'credentials', current.account.id)
          return credential ? { accountId: current.account.id, credential } : undefined
        })
      } catch (error) {
        return errorResult(error)
      }
      const currentPasswordHash = credentialSnapshot
        ? await passwordHash(input.currentPassword, credentialSnapshot.credential.passwordSalt)
        : undefined
      const newPasswordSalt = newOperationId()
      const newPasswordHash = await passwordHash(input.newPassword, newPasswordSalt)
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account.change-password',
        payloadFingerprint: requestHash,
        stores: ['accounts', 'credentials', 'sessions'],
        work: async (transaction, accountId) => {
          const current = await requireContext(transaction, context)
          if (current.account.revision !== input.expectedRevision) throw revisionConflict('Account changed. Reload before saving.', current.account.revision)
          const credential = await readRecord<StoredCredential>(transaction, 'credentials', accountId ?? current.account.id)
          if (
            !credential ||
            !credentialSnapshot ||
            credentialSnapshot.accountId !== current.account.id ||
            credentialSnapshot.credential.passwordSalt !== credential.passwordSalt ||
            credentialSnapshot.credential.passwordHash !== credential.passwordHash ||
            currentPasswordHash !== credential.passwordHash
          ) {
            throw serviceError('unauthenticated', 'Current password is incorrect.')
          }
          if (!validPassword(input.newPassword)) throw serviceError('validation', 'Password must be at least 8 characters.')
          const updated: StoredCredential = {
            accountId: current.account.id,
            email: credential.email ?? current.account.email,
            passwordSalt: newPasswordSalt,
            passwordHash: newPasswordHash,
          }
          const sessions = await recordsByIndex<Session>(transaction, 'sessions', 'accountId', current.account.id)
          for (const session of sessions) {
            if (session.id !== current.session.id) await transaction.objectStore('sessions').delete(session.id)
          }
          const accountRecord = await readRecord<StoredAccount>(transaction, 'accounts', current.account.id)
          if (!accountRecord) throw serviceError('not-found', 'Account was not found.')
          accountRecord.revision = asRevision(Number(accountRecord.revision) + 1)
          await writeRecord(transaction, 'credentials', updated)
          await writeRecord(transaction, 'accounts', accountRecord)
          return { data: { account: accountRecord, revokedOtherSessions: true as const }, accountId: current.account.id }
        },
      })
    },
    delete: async (input) => {
      const requestHash = await fingerprint({ confirmation: input.confirmation, locale: input.locale, expectedRevision: input.expectedRevision })
      let preflight: { accountId: AccountSnapshot['id']; emailHash: string }
      try {
        const account = await transact(context, ['meta', 'sessions', 'accounts'], 'readonly', async (transaction) =>
          (await requireContext(transaction, context)).account)
        preflight = { accountId: account.id, emailHash: await sha256(account.email) }
      } catch (error) {
        return errorResult(error)
      }
      return mutate(context, {
        operationId: input.operationId,
        kind: 'account.delete',
        payloadFingerprint: requestHash,
        stores: ['accounts', 'sessions', 'meta', 'projects', 'sources', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'results', 'quotes', 'reservations', 'creditStates', 'ledger', 'purchases', 'returnContexts', 'authorizations', 'activityEvents', 'credentials', 'verifications', 'resetGrants', 'linkIntents', 'accountHistory', 'operations'],
        work: async (transaction) => {
          const current = await requireContext(transaction, context)
          if (current.account.id !== preflight.accountId) throw serviceError('conflict', 'The active account changed. Reload before deleting.')
          if (current.account.revision !== input.expectedRevision) throw revisionConflict('Account changed. Reload before deleting.', current.account.revision)
          if (!input.confirmation.trim()) throw serviceError('validation', 'Confirm account deletion to continue.')
          const creditState = await readRecord<import('./mock-store').StoredCreditState>(transaction, 'creditStates', current.account.id)
          const purchasedRemainder = creditState?.purchasedRemainder ?? 0
          await writeRecord(transaction, 'accountHistory', {
            emailHash: preflight.emailHash,
            welcomeGrantUsed: Boolean(creditState?.welcomeGrantApplied),
            lastDeletionAt: nowMs(context.clock),
          } satisfies StoredAccountHistory)
          const projects = await recordsByIndex<{ id: string } & { accountId: string }>(transaction, 'projects', 'accountId', current.account.id)
          const relatedStores = ['sources', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'results', 'quotes', 'reservations', 'returnContexts', 'authorizations', 'activityEvents'] as const
          for (const storeName of relatedStores) {
            const values = await recordsByIndex<{ id: IDBValidKey; projectId?: string; accountId?: string }>(transaction, storeName, 'accountId', current.account.id)
            for (const value of values) await transaction.objectStore(storeName).delete(value.id)
          }
          for (const project of projects) await transaction.objectStore('projects').delete(project.id)
          for (const storeName of ['ledger', 'purchases', 'quotes', 'reservations', 'resetGrants', 'linkIntents'] as const) {
            const values = await recordsByIndex<{ id: IDBValidKey; accountId?: string }>(transaction, storeName, 'accountId', current.account.id)
            for (const value of values) await transaction.objectStore(storeName).delete(value.id)
          }
          const verifications = await requestResult(transaction.objectStore('verifications').getAll()) as StoredVerification[]
          for (const verification of verifications) {
            if (verification.accountId === current.account.id) await transaction.objectStore('verifications').delete(verification.id)
          }
          const operations = await recordsByIndex<import('./mock-store').StoredOperation>(transaction, 'operations', 'accountId', current.account.id)
          for (const operation of operations) await transaction.objectStore('operations').delete(operation.id)
          const accountRecord = await readRecord<StoredAccount>(transaction, 'accounts', current.account.id)
          if (!accountRecord) throw serviceError('not-found', 'Account was not found.')
          accountRecord.email = `deleted-${current.account.id}@example.invalid`
          accountRecord.deleted = true
          accountRecord.methods = []
          accountRecord.revision = asRevision(Number(accountRecord.revision) + 1)
          await writeRecord(transaction, 'accounts', accountRecord)
          await transaction.objectStore('credentials').delete(current.account.id)
          const sessions = await recordsByIndex<Session>(transaction, 'sessions', 'accountId', current.account.id)
          for (const session of sessions) await transaction.objectStore('sessions').delete(session.id)
          await transaction.objectStore('meta').delete(activeSessionMetaKey(context))
          await transaction.objectStore('creditStates').delete(current.account.id)
          return { data: { deleted: true as const, purchasedRemainder }, accountId: current.account.id }
        },
      })
    },
    resolveDelete: async ({ operationId }) => {
      try {
        return await transact(context, ['operations'], 'readonly', async (transaction) => {
          const operation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', operationId)
          if (!operation) {
            return {
              status: 'ok',
              data: { state: 'not-started', operationId, safeToRetrySameId: true },
              replayed: false,
            } as const
          }
          if (operation.kind !== 'account.delete' || operation.clientId !== context.clientId) {
            return { status: 'ok', data: { state: 'unknown' }, replayed: false } as const
          }
          const receipt = operation.result as { deleted?: unknown; purchasedRemainder?: unknown }
          if (receipt.deleted !== true || typeof receipt.purchasedRemainder !== 'number') {
            return { status: 'ok', data: { state: 'unknown' }, replayed: false } as const
          }
          return {
            status: 'ok',
            data: { state: 'completed', receipt: { deleted: true, purchasedRemainder: receipt.purchasedRemainder } },
            replayed: false,
          } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  }

  return { identity, registration, passwordReset, accountLinking, account }
}

async function requestAccountByEmail(transaction: IDBTransaction, email: string): Promise<StoredAccount | undefined> {
  const normalized = mockEmail(email)
  const primary = await requestResult(transaction.objectStore('accounts').index('email').get(normalized)) as StoredAccount | undefined
  if (primary && !primary.deleted) return primary
  const accounts = await requestResult(transaction.objectStore('accounts').getAll()) as StoredAccount[]
  return accounts.find((account) => !account.deleted && account.methods.some((method) => method.verified && mockEmail(method.address) === normalized))
}

async function projectReturnIntent(
  transaction: IDBTransaction,
  accountId: AccountSnapshot['id'],
  requested?: SignInIntent,
): Promise<SignInIntent> {
  if (!requested || requested.kind === 'new-dub') return { kind: 'new-dub' }
  const project = await readRecord<{ id: string; accountId: string; state: string }>(transaction, 'projects', requested.projectId)
  const valid = project?.accountId === accountId && (
    (requested.screen === 'processing' && project.state === 'preparing') ||
    (requested.screen === 'record' && ['recording', 'ready'].includes(project.state)) ||
    (requested.screen === 'result' && ['assembling', 'ready'].includes(project.state))
  )
  return valid ? requested : { kind: 'new-dub' }
}

async function registrationResend(
  context: StoreContext,
  requestId: OperationId,
  input: MutationOptions & { requestId: OperationId },
  purpose: StoredVerification['purpose'] = 'registration',
): Promise<ServiceResult<PendingVerification>> {
  const preflight = await transact(context, ['verifications'], 'readonly', (transaction) =>
    readRecord<StoredVerification>(transaction, 'verifications', requestId))
  const expectedCodeGeneration = preflight?.codeGeneration ?? 0
  const nextCodeGeneration = expectedCodeGeneration + 1
  const replacementCodeHash = await passwordHash(mockScenarioVerificationCode(requestId, nextCodeGeneration), requestId)
  const requestHash = await fingerprint({ requestId, purpose })
  return mutate(context, {
    operationId: input.operationId,
    kind: `${purpose}.resend`,
    payloadFingerprint: requestHash,
    authenticated: false,
    allowAnonymous: true,
    stores: ['verifications'],
    onReplay: async (_transaction, previous) => {
      if (purpose === 'registration') requireRegistrationReplayOwner(context, previous.clientId)
    },
    work: async (transaction) => {
      const verification = await readRecord<StoredVerification>(transaction, 'verifications', requestId)
      if (!verification || verification.purpose !== purpose || verification.state !== 'pending') throw serviceError('not-found', 'Verification request was not found.')
      if (purpose === 'registration' && !(await registrationRequestOwnedBy(transaction, context, verification))) {
        throw serviceError('not-found', 'Verification request was not found.')
      }
      if ((verification.codeGeneration ?? 0) !== expectedCodeGeneration) throw revisionConflict('Verification code changed. Reconcile and retry.', verification.revision)
      const now = nowMs(context.clock)
      const sends = activeSendTimes(verification, now)
      if (sends.length >= MOCK_VERIFICATION_SEND_LIMIT) {
        throw serviceError('rate-limited', 'The hourly verification email limit has been reached. Resolve the request for the latest send state.', 'reconcile-first')
      }
      if (verification.resendAvailableAt > now) throw serviceError('rate-limited', 'Wait before requesting another code.', 'reconcile-first')
      verification.resendCount += 1
      verification.codeGeneration = nextCodeGeneration
      verification.codeHash = replacementCodeHash
      verification.sendTimes = [...sends, now]
      verification.resendAvailableAt = now + MOCK_RESEND_INTERVAL_MS
      verification.expiresAt = now + MOCK_VERIFICATION_LIFETIME_MS
      verification.revision = asRevision(Number(verification.revision) + 1)
      await writeRecord(transaction, 'verifications', verification)
      return { data: asPending(verification, context.clock) }
    },
  })
}

function accountServiceError<T>(error: unknown): ServiceResult<T> {
  return errorResult<T>(error)
}
