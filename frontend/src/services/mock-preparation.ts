import { MEDIA_FIXTURE_MANIFEST } from '../media/fixtures'
import type {
  CancellationQuote,
  DraftId,
  OperationSnapshot,
  OwnedProject,
  PreparationAttemptClass,
  PreparationService,
  PreparationSnapshot,
  PreparationStage,
  ProcessingQuote,
  ProcessingStartSnapshot,
  ProjectId,
  QuoteId,
} from './contracts'
import { asRevision, ids } from './contracts'
import {
  errorResult,
  nowMs,
  readRecord,
  recordsByIndex,
  removeRecord,
  requireContext,
  requireProject,
  revisionConflict,
  serviceError,
  transact,
  writeRecord,
  type StoredCreditState,
  type StoredDraft,
  type StoredOperation,
  type StoredPreparation,
  type StoredQuote,
  type StoredReservation,
  type StoredTurn,
  SYNTHETIC_CAPTURE_MARGIN_MS,
  type StoreContext,
} from './mock-store'
import { fingerprint, mutate } from './mutations'
import { recordProjectActivity } from './project-activity'
import { releaseReservation, reserveFromQuote, settleReservation } from './mock-ledger'

const QUOTE_LIFETIME_MS = 5 * 60 * 1000
const CANCEL_QUOTE_LIFETIME_MS = 2 * 60 * 1000
// Local scenario timing only; real processing latency remains owned by an adapter.
const MOCK_PREPARATION_STAGE_INTERVAL_MS = 1_000
const PROCESS_STAGES: readonly { id: string; label: string; percentage: number }[] = [
  { id: 'queued', label: 'Queued', percentage: 0 },
  { id: 'media-analysis', label: 'Analyzing selected media', percentage: 30 },
  { id: 'dialogue-preparation', label: 'Preparing dialogue', percentage: 70 },
  { id: 'complete', label: 'Preparation complete', percentage: 100 },
]

function stageFor(index: number): PreparationStage {
  const stage = PROCESS_STAGES[Math.min(index, PROCESS_STAGES.length - 1)]
  const state = index === 0 ? 'queued' : index >= PROCESS_STAGES.length - 1 ? 'complete' : 'running'
  return { id: stage.id, label: stage.label, state }
}

function roundedTimelineTurns(project: OwnedProject, preparationId: string) {
  return MEDIA_FIXTURE_MANIFEST.dialogueTimeline.sections
    .map((section) => {
      const startMs = Math.max(project.selection.startMs, Math.round(section.startMs))
      const endMs = Math.min(project.selection.endMs, Math.round(section.endMs))
      return {
        id: ids.turn(`${preparationId}:${section.id}`),
        text: section.quote,
        startMs,
        endMs,
        windowStartMs: Math.max(project.selection.startMs, startMs - SYNTHETIC_CAPTURE_MARGIN_MS),
        windowEndMs: Math.min(project.selection.endMs, endMs + SYNTHETIC_CAPTURE_MARGIN_MS),
      }
    })
    .filter((turn) => turn.endMs > turn.startMs)
}

async function usablePriorPreparation(
  transaction: IDBTransaction,
  project: OwnedProject,
): Promise<StoredPreparation | undefined> {
  const rows = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)
  return rows
    .filter((row) => row.usable && row.id !== project.preparationId)
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id, 'en'))[0]
}

async function activeDraftIds(
  transaction: IDBTransaction,
  project: OwnedProject,
  preparation: StoredPreparation | undefined,
): Promise<DraftId[]> {
  if (!preparation || !preparation.usable || preparation.id !== project.preparationId) return []
  const turnIds = [...new Set(preparation.turns.map((turn) => turn.id))]
  const rows = await Promise.all(turnIds.map((turnId) =>
    recordsByIndex<StoredDraft>(transaction, 'drafts', 'projectIdTurnId', [project.id, turnId])))
  return rows.flat()
    .filter((draft) => draft.accountId === project.accountId
      && draft.projectId === project.id
      && turnIds.includes(draft.turnId)
      && draft.candidate.processingRevision === project.preparationRevision)
    .map((draft) => ids.draft(draft.id))
    .sort((left, right) => String(left).localeCompare(String(right), 'en'))
}

function sameDraftIds(left: readonly DraftId[], right: readonly DraftId[]): boolean {
  if (left.length !== right.length) return false
  const expected = [...left].map(String).sort()
  const actual = [...right].map(String).sort()
  return expected.every((id, index) => id === actual[index])
}

async function consumeIncludedRetry(transaction: IDBTransaction, preparation: StoredPreparation, project: OwnedProject): Promise<void> {
  preparation.includedRetryAvailable = false
  project.includedRetryAvailable = false
  if (!preparation.priorUsablePreparationId) return
  const prior = await readRecord<StoredPreparation>(transaction, 'preparations', preparation.priorUsablePreparationId)
  if (!prior?.includedRetryAvailable) return
  prior.includedRetryAvailable = false
  await writeRecord(transaction, 'preparations', prior)
}

async function reconcileIncludedRetryAfterSuccess(
  transaction: IDBTransaction,
  preparation: StoredPreparation,
  project: OwnedProject,
): Promise<void> {
  if (preparation.attemptClass === 'included-retry') {
    await consumeIncludedRetry(transaction, preparation, project)
    return
  }
  if (project.includedRetryAvailable) return
  const attempts = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)
  if (attempts.some((item) => item.id !== preparation.id && item.state === 'complete')) return
  preparation.includedRetryAvailable = true
  project.includedRetryAvailable = true
}

async function makeSnapshot(
  transaction: IDBTransaction,
  project: OwnedProject,
  operationId?: import('./contracts').OperationId,
): Promise<PreparationSnapshot> {
  const [current, prior, preps] = await Promise.all([
    project.preparationId ? readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId) : Promise.resolve(undefined),
    usablePriorPreparation(transaction, project),
    recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id),
  ])
  const target = operationId
    ? preps.find((item) => item.operationId === operationId)
    : preps.sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id, 'en'))[0]
  if (!target) throw serviceError('not-found', 'Preparation operation was not found.')
  const storedOperation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', target.operationId)
  if (!storedOperation?.job) throw serviceError('operation-not-found', 'Preparation status is unavailable.')
  const stage = stageFor(target.stageIndex)
  const serviceStages = stage.state === 'complete' || target.state === 'failed' || target.state === 'cancelled'
    ? { ...stage, state: target.state === 'failed' ? 'failed' as const : stage.state }
    : stage
  return {
    projectId: project.id,
    projectRevision: project.revision,
    operation: structuredClone(storedOperation.job),
    currentPreparationId: current?.id ? ids.preparation(current.id) : undefined,
    currentPreparationRevision: project.preparationRevision,
    priorUsablePreparationId: prior?.id ? ids.preparation(prior.id) : undefined,
    turns: current?.turns.map((turn) => ({ ...turn, id: ids.turn(turn.id) })) ?? [],
    percentage: { value: PROCESS_STAGES[Math.min(target.stageIndex, PROCESS_STAGES.length - 1)].percentage, trusted: true, operationRevision: storedOperation.job.revision },
    currentStage: serviceStages,
    attemptClass: target.attemptClass,
    includedRetryAvailable: target.includedRetryAvailable,
    reprocessingLocked: target.reprocessingLocked,
    reservationId: target.reservationId,
  }
}

type DeletedPreparationAdvance = 'not-due' | 'pending' | 'terminal'

async function finalizeDeletedPreparation(
  transaction: IDBTransaction,
  context: StoreContext,
  preparation: StoredPreparation,
  operation: StoredOperation,
): Promise<void> {
  const reservation = await readRecord<StoredReservation>(transaction, 'reservations', preparation.reservationId)
  if (!reservation
    || reservation.accountId !== preparation.accountId
    || reservation.projectId !== preparation.projectId
    || reservation.operationId !== preparation.operationId) {
    throw serviceError('storage-unavailable', 'Deleted preparation accounting is unavailable.', 'reconcile-first')
  }

  const result = operation.job?.result as { state?: string } | undefined
  if (operation.job?.state === 'committed' && result?.state === 'complete') {
    if (reservation.state === 'released') {
      throw serviceError('storage-unavailable', 'A completed deleted preparation has a released reservation.', 'reconcile-first')
    }
    await settleReservation(transaction, context, reservation, 'successful-completion')
  } else if (operation.job?.state === 'rejected' && result?.state === 'failed') {
    if (reservation.state === 'settled') {
      throw serviceError('storage-unavailable', 'A failed deleted preparation has a settled reservation.', 'reconcile-first')
    }
    await releaseReservation(transaction, context, reservation)
  } else {
    throw serviceError('storage-unavailable', 'Deleted preparation has no authoritative terminal outcome.', 'reconcile-first')
  }
  await writeRecord(transaction, 'operations', operation)
  await removeRecord(transaction, 'preparations', preparation.id)
}

async function advanceDeletedPreparation(
  transaction: IDBTransaction,
  context: StoreContext,
  preparation: StoredPreparation,
  operation: StoredOperation,
): Promise<DeletedPreparationAdvance> {
  if (!preparation.projectDeleted || !operation.job) return 'terminal'
  if (operation.job.state !== 'pending') {
    await finalizeDeletedPreparation(transaction, context, preparation, operation)
    return 'terminal'
  }

  const nextStageAt = preparation.nextStageAt ?? preparation.createdAt + MOCK_PREPARATION_STAGE_INTERVAL_MS
  if (nextStageAt > nowMs(context.clock)) return 'not-due'

  preparation.stageIndex = Math.min(preparation.stageIndex + 1, PROCESS_STAGES.length - 1)
  preparation.state = preparation.stageIndex >= PROCESS_STAGES.length - 1 ? 'complete' : 'running'
  preparation.nextStageAt = preparation.state === 'complete' ? undefined : nextStageAt + MOCK_PREPARATION_STAGE_INTERVAL_MS
  preparation.revision = asRevision(Number(preparation.revision) + 1)
  operation.job = {
    ...operation.job,
    state: preparation.state === 'complete' ? 'committed' : 'pending',
    revision: asRevision(Number(operation.job.revision) + 1),
    updatedAt: nowMs(context.clock),
    result: { state: preparation.state, preparationId: preparation.id },
  }

  if (preparation.state === 'complete') {
    const failed = context.scenario === 'preparation-system-failure'
      || (context.scenario === 'preparation-system-failure-first-attempt' && preparation.deletedAttemptIsFirst === true)
    preparation.usable = false
    if (failed) {
      preparation.state = 'failed'
      operation.job = {
        ...operation.job,
        state: 'rejected',
        result: { state: 'failed', reason: 'system-failure' },
      }
    } else {
      operation.job = {
        ...operation.job,
        result: { state: 'complete', deletedProject: true },
      }
    }
    await finalizeDeletedPreparation(transaction, context, preparation, operation)
    return 'terminal'
  }

  await writeRecord(transaction, 'preparations', preparation)
  await writeRecord(transaction, 'operations', operation)
  return 'pending'
}

export function createMockPreparation(context: StoreContext): PreparationService & { reconcileBackground(): Promise<void> } {
  const service: PreparationService = {
    updateSelection: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, startMs: input.startMs, endMs: input.endMs, expectedProjectRevision: input.expectedProjectRevision, expectedSourceRevision: input.expectedSourceRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.update-selection',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'takes', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          if (!Number.isSafeInteger(input.startMs) || !Number.isSafeInteger(input.endMs) || input.startMs < 0 || input.endMs <= input.startMs) {
            throw serviceError('validation', 'Choose a section with a positive duration at one-millisecond precision.')
          }
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed. Reload the selection before saving.', project.revision)
          if (project.sourceRevision !== input.expectedSourceRevision) throw revisionConflict('Source media changed. Reload the selection before saving.', project.sourceRevision)
          const [preparations, takes] = await Promise.all([
            recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id),
            recordsByIndex<{ id: string }>(transaction, 'takes', 'projectId', project.id),
          ])
          if (project.state === 'preparing'
            || project.preparationId !== undefined
            || takes.length > 0
            || preparations.some((item) => item.reprocessingLocked)) {
            throw serviceError('forbidden', 'The selected section cannot change while preparation or recording work is active.')
          }
          if (input.endMs > project.sourceDurationMs) throw serviceError('validation', 'The selected section extends beyond the source duration.')
          const updated: OwnedProject = {
            ...project,
            selection: { startMs: input.startMs, endMs: input.endMs, revision: asRevision(Number(project.selection.revision) + 1) },
            revision: asRevision(Number(project.revision) + 1),
            updatedAt: nowMs(context.clock),
          }
          await writeRecord(transaction, 'projects', updated)
          const activity = await recordProjectActivity(transaction, context, updated, input.operationId, 'user-change')
          return { data: activity, accountId: project.accountId }
        },
      })
    },
    quote: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, expectedProjectRevision: input.expectedProjectRevision, expectedActivePreparationId: input.expectedActivePreparationId, expectedActivePreparationRevision: input.expectedActivePreparationRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.quote',
        payloadFingerprint: requestHash,
        stores: ['projects', 'sources', 'preparations', 'creditStates', 'quotes', 'drafts', 'takes'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed. Review the selected section again.', project.revision)
          if (project.state === 'preparing') throw serviceError('conflict', 'A preparation is already pending for this project.')
          if (project.preparationId !== input.expectedActivePreparationId
            || project.preparationRevision !== input.expectedActivePreparationRevision) {
            throw revisionConflict('The active preparation changed. Reload before requesting a quote.', project.revision)
          }
          const source = await readRecord<{ id: string; accountId: string; projectId: string; revision: number }>(transaction, 'sources', project.sourceId)
          if (!source || source.accountId !== accountId || source.projectId !== project.id || source.revision !== project.sourceRevision) {
            throw serviceError('stale-source', 'The selected source has changed. Reload this project before requesting a quote.')
          }
          const durationMs = project.selection.endMs - project.selection.startMs
          if (!Number.isSafeInteger(durationMs) || durationMs <= 0) throw serviceError('validation', 'Choose a section with a positive duration.')
          const current = project.preparationId
            ? await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId)
            : undefined
          if (project.preparationId && (!current?.usable || current.id !== project.preparationId)) {
            throw serviceError('stale-source', 'The active preparation is no longer available.')
          }
          const takes = await recordsByIndex<{ id: string }>(transaction, 'takes', 'projectId', project.id)
          const preparations = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)
          if (takes.length > 0 || preparations.some((item) => item.reprocessingLocked)) {
            throw serviceError('forbidden', 'Preparation is locked after the first accepted take.')
          }
          const includedRetryAvailable = project.includedRetryAvailable ?? current?.includedRetryAvailable ?? false
          const attemptClass: PreparationAttemptClass = includedRetryAvailable
            ? 'included-retry'
            : project.firstAiLaunchAt === undefined
              ? 'initial'
              : 'paid-reprocessing'
          const state = await readRecord<StoredCreditState>(transaction, 'creditStates', accountId)
          if (!state) throw serviceError('not-found', 'Credit balance is unavailable.')
          const draftIdsToDeleteOnActivation = await activeDraftIds(transaction, project, current)
          const quote: ProcessingQuote = {
            id: ids.quote(input.operationId),
            accountId: project.accountId,
            projectId: project.id,
            projectRevision: project.revision,
            sourceId: project.sourceId,
            sourceRevision: project.sourceRevision,
            selectionRevision: project.selection.revision,
            activePreparationId: project.preparationId,
            activePreparationRevision: project.preparationRevision,
            draftIdsToDeleteOnActivation,
            creditRevision: state.revision,
            attemptClass,
            durationMs,
            credits: attemptClass === 'included-retry' ? 0 : Math.ceil(durationMs / 1000),
            available: state.available,
            reserved: state.reserved,
            expiresAt: nowMs(context.clock) + QUOTE_LIFETIME_MS,
            revision: asRevision(0),
            note: 'synthetic-mock-scenario',
          }
          await writeRecord(transaction, 'quotes', { id: quote.id, accountId: project.accountId, projectId: project.id, quote } satisfies StoredQuote)
          return { data: quote, accountId: project.accountId }
        },
      })
    },
    start: async (input) => {
      const requestHash = await fingerprint({ quoteId: input.quoteId, expectedProjectRevision: input.expectedProjectRevision, expectedSourceRevision: input.expectedSourceRevision, expectedActivePreparationId: input.expectedActivePreparationId, expectedActivePreparationRevision: input.expectedActivePreparationRevision, acknowledgedDraftIds: input.acknowledgedDraftIds, replacementAcknowledged: input.replacementAcknowledged, draftLossAcknowledged: input.draftLossAcknowledged, explicitAuthorization: input.explicitAuthorization })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.start',
        payloadFingerprint: requestHash,
        stores: ['projects', 'quotes', 'creditStates', 'reservations', 'ledger', 'preparations', 'takes', 'drafts', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          if (input.explicitAuthorization !== true) throw serviceError('forbidden', 'Starting preparation requires explicit authorization.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), (await quoteProject(transaction, input.quoteId)))
          if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed after this quote. Review the quote again.', project.revision)
          if (project.sourceRevision !== input.expectedSourceRevision) throw revisionConflict('Source media changed after this quote. Review the quote again.', project.sourceRevision)
          if (project.preparationId !== input.expectedActivePreparationId
            || project.preparationRevision !== input.expectedActivePreparationRevision) {
            throw revisionConflict('The active preparation changed after this quote. Review the replacement warning and quote again.', project.revision)
          }
          if (project.state === 'preparing') throw serviceError('conflict', 'A preparation is already pending for this project.')
          const acceptedTakes = await recordsByIndex<{ id: string }>(transaction, 'takes', 'projectId', project.id)
          if (acceptedTakes.length > 0) throw serviceError('forbidden', 'Preparation is locked after the first accepted take.')
          const previousPreparations = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)
          if (previousPreparations.some((item) => item.state === 'queued' || item.state === 'running')) {
            throw serviceError('conflict', 'A preparation is already pending for this project.')
          }
          if (previousPreparations.some((item) => item.reprocessingLocked)) throw serviceError('forbidden', 'Preparation is locked after the first accepted take.')
          const current = project.preparationId
            ? await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId)
            : undefined
          if (project.preparationId && (!current?.usable || current.id !== project.preparationId)) {
            throw serviceError('stale-source', 'The active preparation is no longer available.')
          }
          const priorUsable = current?.usable ? current : await usablePriorPreparation(transaction, project)
          const includedRetryAvailable = project.includedRetryAvailable ?? current?.includedRetryAvailable ?? false
          const attemptClass: PreparationAttemptClass = includedRetryAvailable
            ? 'included-retry'
            : project.firstAiLaunchAt === undefined
              ? 'initial'
              : 'paid-reprocessing'
          const storedQuote = await readRecord<StoredQuote>(transaction, 'quotes', input.quoteId)
          const quote = storedQuote?.quote as ProcessingQuote | undefined
          if (!quote || storedQuote?.accountId !== accountId || storedQuote.projectId !== project.id) {
            throw serviceError('not-found', 'Processing quote was not found.')
          }
          const currentDraftIds = await activeDraftIds(transaction, project, current)
          if (!sameDraftIds(currentDraftIds, quote.draftIdsToDeleteOnActivation)
            || !sameDraftIds(input.acknowledgedDraftIds, quote.draftIdsToDeleteOnActivation)) {
            throw revisionConflict('Saved drafts changed after the replacement warning. Review it again before starting.', project.revision)
          }
          if (quote.projectRevision !== input.expectedProjectRevision
            || quote.activePreparationId !== input.expectedActivePreparationId
            || quote.activePreparationRevision !== input.expectedActivePreparationRevision) {
            throw revisionConflict('The active preparation changed after this quote. Review the replacement warning and quote again.', project.revision)
          }
          if (project.preparationId && input.replacementAcknowledged !== true) {
            throw serviceError('forbidden', 'Replacing the active preparation requires explicit confirmation.')
          }
          if (project.preparationId && input.draftLossAcknowledged !== true) {
            throw serviceError('forbidden', 'The saved draft loss warning must be acknowledged before replacement.')
          }
          const reservation = await reserveFromQuote(transaction, context, ids.account(accountId), project.id, input.quoteId, input.operationId, input.expectedProjectRevision, input.expectedSourceRevision, input.expectedActivePreparationId, input.expectedActivePreparationRevision, attemptClass)
          const preparationId = ids.preparation(crypto.randomUUID())
          const turns = context.scenario === 'preparation-zero-turn-replacement' && priorUsable
            ? []
            : roundedTimelineTurns(project, preparationId)
          const preparation: StoredPreparation = {
            id: preparationId,
            accountId: project.accountId,
            projectId: project.id,
            operationId: input.operationId,
            sourceRevision: project.sourceRevision,
            selectionRevision: project.selection.revision,
            attemptClass,
            priorUsablePreparationId: priorUsable?.id,
            authorizedActivePreparationId: project.preparationId,
            authorizedActivePreparationRevision: project.preparationRevision,
            authorizedDraftIdsToDelete: quote.draftIdsToDeleteOnActivation.map(String),
            state: 'queued',
            stageIndex: 0,
            nextStageAt: nowMs(context.clock) + MOCK_PREPARATION_STAGE_INTERVAL_MS,
            revision: asRevision(0),
            createdAt: nowMs(context.clock),
            turns,
            usable: false,
            includedRetryAvailable: project.includedRetryAvailable ?? priorUsable?.includedRetryAvailable ?? false,
            reprocessingLocked: false,
            reservationId: reservation.reservationId,
          }
          const job: OperationSnapshot = {
            id: input.operationId,
            accountId: project.accountId,
            state: 'pending',
            kind: 'preparation',
            revision: asRevision(0),
            updatedAt: nowMs(context.clock),
            result: { state: 'queued', preparationId },
          }
          const changed: OwnedProject = {
            ...project,
            firstAiLaunchAt: project.firstAiLaunchAt ?? nowMs(context.clock),
            state: 'preparing',
            revision: asRevision(Number(project.revision) + 1),
            updatedAt: nowMs(context.clock),
          }
          await writeRecord(transaction, 'preparations', preparation)
          await writeRecord(transaction, 'projects', changed)
          const activity = await recordProjectActivity(transaction, context, changed, input.operationId, 'user-change')
          const data: ProcessingStartSnapshot = {
            projectId: project.id,
            operation: job,
            attemptClass,
            reservationId: reservation.reservationId,
            quoteId: input.quoteId,
            currentPreparationId: project.preparationId ? ids.preparation(project.preparationId) : undefined,
            currentPreparationRevision: project.preparationRevision,
            priorUsablePreparationId: priorUsable?.id ? ids.preparation(priorUsable.id) : undefined,
            projectRevision: activity.revision,
          }
          return { data, accountId: project.accountId, job }
        },
      })
    },
    resolve: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'preparations', 'operations'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, account.id, input.projectId)
          const data = await makeSnapshot(transaction, project, input.targetOperationId)
          return { status: 'ok', data, replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    observe: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'sources', 'preparations', 'operations', 'reservations', 'creditStates', 'ledger', 'turns', 'activityEvents'], 'readwrite', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          let project = await readRecord<OwnedProject>(transaction, 'projects', input.projectId)
          if (!project || project.accountId !== account.id) {
            const rows = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', input.projectId)
            const target = rows.find((item) => item.operationId === input.targetOperationId && item.projectDeleted && item.accountId === account.id)
            const operation = target
              ? await readRecord<StoredOperation>(transaction, 'operations', input.targetOperationId)
              : undefined
            if (target && operation?.accountId === account.id && operation.job?.kind === 'preparation') {
              await advanceDeletedPreparation(transaction, context, target, operation)
            }
            return errorResult(serviceError('not-found', 'Project was not found.'))
          }
          const rows = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)
          const target = rows.find((item) => item.operationId === input.targetOperationId)
          if (!target) throw serviceError('not-found', 'Preparation operation was not found.')
          const operation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', input.targetOperationId)
          if (!operation?.job) throw serviceError('operation-not-found', 'Preparation status is unavailable.')
          const nextStageAt = target.nextStageAt ?? target.createdAt + MOCK_PREPARATION_STAGE_INTERVAL_MS
          if ((target.state === 'queued' || target.state === 'running') && nextStageAt <= nowMs(context.clock)) {
            target.stageIndex = Math.min(target.stageIndex + 1, PROCESS_STAGES.length - 1)
            target.state = target.stageIndex === 0 ? 'queued' : target.stageIndex >= PROCESS_STAGES.length - 1 ? 'complete' : 'running'
            target.nextStageAt = target.state === 'complete' ? undefined : nextStageAt + MOCK_PREPARATION_STAGE_INTERVAL_MS
            target.revision = asRevision(Number(target.revision) + 1)
            operation.job = {
              ...operation.job,
              state: target.state === 'complete' ? 'committed' : 'pending',
              revision: asRevision(Number(operation.job.revision) + 1),
              updatedAt: nowMs(context.clock),
              result: { state: target.state, preparationId: target.id },
            }
            if (target.state === 'complete') {
              const source = await readRecord<{ revision: number }>(transaction, 'sources', project.sourceId)
              const sourceStillCurrent = source?.revision === target.sourceRevision && project.selection.revision === target.selectionRevision
              if (!sourceStillCurrent) {
                target.state = 'failed'
                target.usable = false
                operation.job = {
                  ...operation.job,
                  state: 'rejected',
                  result: { state: 'failed', reason: 'stale-source' },
                  error: { code: 'stale-source', message: 'The source or selected section changed during preparation.', retry: 'reconcile-first' },
                }
                const reservation = await readRecord<StoredReservation>(transaction, 'reservations', target.reservationId)
                if (reservation) await releaseReservation(transaction, context, reservation)
                const restored: OwnedProject = {
                  ...project,
                  state: project.preparationId ? 'recording' : 'uploaded',
                  revision: asRevision(Number(project.revision) + 1),
                  updatedAt: nowMs(context.clock),
                }
                await writeRecord(transaction, 'projects', restored)
                await recordProjectActivity(transaction, context, restored, ids.operation(`${input.targetOperationId}:terminal`), 'processing-completed')
                project = restored
              } else if (context.scenario === 'preparation-system-failure'
                || (context.scenario === 'preparation-system-failure-first-attempt'
                  && (await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)).length === 1)) {
                target.state = 'failed'
                target.usable = false
                operation.job = {
                  ...operation.job,
                  state: 'rejected',
                  result: { state: 'failed', reason: 'system-failure' },
                }
                const reservation = await readRecord<StoredReservation>(transaction, 'reservations', target.reservationId)
                if (reservation) await releaseReservation(transaction, context, reservation)
                const restored: OwnedProject = {
                  ...project,
                  state: project.preparationId ? 'recording' : 'uploaded',
                  revision: asRevision(Number(project.revision) + 1),
                  updatedAt: nowMs(context.clock),
                }
                await writeRecord(transaction, 'projects', restored)
                await recordProjectActivity(transaction, context, restored, ids.operation(`${input.targetOperationId}:terminal`), 'processing-completed')
                project = restored
              } else if (target.turns.length === 0) {
                target.usable = false
                await reconcileIncludedRetryAfterSuccess(transaction, target, project)
                const reservation = await readRecord<StoredReservation>(transaction, 'reservations', target.reservationId)
                if (reservation) await settleReservation(transaction, context, reservation, 'successful-completion')
                const prior = target.priorUsablePreparationId
                  ? await readRecord<StoredPreparation>(transaction, 'preparations', target.priorUsablePreparationId)
                  : undefined
                if (prior) {
                  prior.includedRetryAvailable = target.includedRetryAvailable
                  await writeRecord(transaction, 'preparations', prior)
                }
                const changed: OwnedProject = {
                  ...project,
                  state: project.preparationId ? 'recording' : 'uploaded',
                  revision: asRevision(Number(project.revision) + 1),
                  updatedAt: nowMs(context.clock),
                }
                await writeRecord(transaction, 'projects', changed)
                await recordProjectActivity(transaction, context, changed, ids.operation(`${input.targetOperationId}:terminal`), 'processing-completed')
                project = changed
                operation.job = { ...operation.job, result: { state: 'complete', zeroTurns: true } }
              } else {
                target.usable = true
                await reconcileIncludedRetryAfterSuccess(transaction, target, project)
                const changed: OwnedProject = {
                  ...project,
                  state: 'preparing',
                  revision: asRevision(Number(project.revision) + 1),
                  updatedAt: nowMs(context.clock),
                }
                await writeRecord(transaction, 'projects', changed)
                await recordProjectActivity(transaction, context, changed, ids.operation(`${input.targetOperationId}:terminal`), 'processing-completed')
                project = changed
                const reservation = await readRecord<StoredReservation>(transaction, 'reservations', target.reservationId)
                if (reservation) await settleReservation(transaction, context, reservation, 'successful-completion')
                operation.job = { ...operation.job, result: { state: 'complete', preparationId: target.id, turnCount: target.turns.length } }
              }
            }
            await writeRecord(transaction, 'preparations', target)
            await writeRecord(transaction, 'operations', operation)
          }
          return { status: 'ok', data: await makeSnapshot(transaction, project, input.targetOperationId), replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    cancellationQuote: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, targetOperationId: input.targetOperationId, expectedRevision: input.expectedRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.cancellation-quote',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'operations', 'reservations', 'quotes'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          const preparation = (await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)).find((item) => item.operationId === input.targetOperationId)
          const operation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', input.targetOperationId)
          if (!preparation || !operation?.job) throw serviceError('not-found', 'Preparation operation was not found.')
          if (operation.job.state !== 'pending') throw serviceError('conflict', 'Only a running preparation can be cancelled.')
          if (operation.job.revision !== input.expectedRevision) throw revisionConflict('Preparation status changed. Request a fresh cancellation quote.', operation.job.revision)
          const reservation = await readRecord<StoredReservation>(transaction, 'reservations', preparation.reservationId)
          if (!reservation || reservation.state !== 'reserved') throw serviceError('not-found', 'Active credit reservation was not found.')
          const fraction = preparation.stageIndex >= 2 ? 0.65 : preparation.stageIndex === 1 ? 0.25 : 0
          const exactCharge = Math.min(reservation.allocation, Math.ceil(reservation.allocation * fraction))
          const quote: CancellationQuote = {
            kind: 'cancellation',
            quoteId: ids.quote(input.operationId),
            reservationId: reservation.id,
            targetOperationId: input.targetOperationId,
            projectId: project.id,
            exactCharge,
            releaseAmount: reservation.allocation - exactCharge,
            attemptClass: preparation.attemptClass,
            includedRetryRemains: preparation.attemptClass === 'included-retry' && preparation.stageIndex === 0 && preparation.includedRetryAvailable,
            expiresAt: nowMs(context.clock) + CANCEL_QUOTE_LIFETIME_MS,
            revision: asRevision(0),
            note: 'synthetic-mock-scenario',
          }
          await writeRecord(transaction, 'quotes', { id: quote.quoteId, accountId: project.accountId, projectId: project.id, quote } satisfies StoredQuote)
          return { data: quote, accountId: project.accountId }
        },
      })
    },
    cancel: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, targetOperationId: input.targetOperationId, cancellationQuoteId: input.cancellationQuoteId, expectedRevision: input.expectedRevision, explicitConfirmation: input.explicitConfirmation })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.cancel',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'operations', 'reservations', 'quotes', 'creditStates', 'ledger', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          if (!input.explicitConfirmation) throw serviceError('forbidden', 'Cancellation requires explicit confirmation.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          const preparation = (await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', project.id)).find((item) => item.operationId === input.targetOperationId)
          const storedOperation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', input.targetOperationId)
          if (!preparation || !storedOperation?.job) throw serviceError('not-found', 'Preparation operation was not found.')
          if (storedOperation.job.state !== 'pending') throw serviceError('conflict', 'Preparation is no longer running.')
          if (storedOperation.job.revision !== input.expectedRevision) throw revisionConflict('Preparation status changed. Request a fresh cancellation quote.', storedOperation.job.revision)
          const storedQuote = await readRecord<StoredQuote>(transaction, 'quotes', input.cancellationQuoteId)
          const cancellation = storedQuote?.quote as unknown as CancellationQuote | undefined
          if (!storedQuote || cancellation?.targetOperationId !== input.targetOperationId || cancellation.reservationId !== preparation.reservationId) {
            throw serviceError('forbidden', 'Cancellation quote does not match this preparation.')
          }
          preparation.state = 'cancelled'
          preparation.revision = asRevision(Number(preparation.revision) + 1)
          storedOperation.job = {
            ...storedOperation.job,
            state: 'committed',
            revision: asRevision(Number(storedOperation.job.revision) + 1),
            updatedAt: nowMs(context.clock),
            result: { state: 'cancelled', preparationId: preparation.id, queued: preparation.stageIndex === 0 },
          }
          const reservation = await readRecord<StoredReservation>(transaction, 'reservations', preparation.reservationId)
          if (!reservation) throw serviceError('not-found', 'Credit reservation was not found.')
          const creditSnapshot = await settleReservation(transaction, context, reservation, 'confirmed-cancellation', input.cancellationQuoteId)
          if (preparation.attemptClass === 'included-retry' && preparation.stageIndex > 0) {
            await consumeIncludedRetry(transaction, preparation, project)
          }
          const changed: OwnedProject = {
            ...project,
            state: project.preparationId ? 'recording' : 'uploaded',
            revision: asRevision(Number(project.revision) + 1),
            updatedAt: nowMs(context.clock),
          }
          await writeRecord(transaction, 'preparations', preparation)
          await writeRecord(transaction, 'operations', storedOperation)
          await writeRecord(transaction, 'projects', changed)
          await recordProjectActivity(transaction, context, changed, input.operationId, 'user-change')
          void creditSnapshot
          return { data: storedOperation.job, accountId: project.accountId, job: storedOperation.job }
        },
      })
    },
    activate: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, targetOperationId: input.targetOperationId, expectedRevision: input.expectedRevision, expectedActivePreparationId: input.expectedActivePreparationId, expectedActivePreparationRevision: input.expectedActivePreparationRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preparation.activate',
        payloadFingerprint: requestHash,
        stores: ['projects', 'sources', 'preparations', 'operations', 'turns', 'drafts', 'takes', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedRevision) throw revisionConflict('Project changed. Reload before continuing.', project.revision)
          if (project.preparationId !== input.expectedActivePreparationId
            || project.preparationRevision !== input.expectedActivePreparationRevision) {
            throw revisionConflict('The active preparation changed after authorization. Keep the current preparation and review again.', project.revision)
          }
          const storedOperation = await readRecord<import('./mock-store').StoredOperation>(transaction, 'operations', input.targetOperationId)
          const result = storedOperation?.job?.result as { state?: string; preparationId?: string } | undefined
          if (!storedOperation?.job || storedOperation.job.state !== 'committed' || result?.state !== 'complete' || !result.preparationId) {
            throw serviceError('conflict', 'Preparation is not ready to activate.')
          }
          const preparation = await readRecord<StoredPreparation>(transaction, 'preparations', result.preparationId)
          if (!preparation?.usable || preparation.turns.length === 0
            || preparation.projectId !== project.id || preparation.accountId !== project.accountId
            || preparation.operationId !== input.targetOperationId
            || preparation.authorizedActivePreparationId !== input.expectedActivePreparationId
            || preparation.authorizedActivePreparationRevision !== input.expectedActivePreparationRevision
            || preparation.sourceRevision !== project.sourceRevision
            || preparation.selectionRevision !== project.selection.revision
            || project.state !== 'preparing') {
            throw serviceError('stale-source', 'This prepared revision is no longer current.')
          }
          const source = await readRecord<{ id: string; accountId: string; projectId: string; revision: number }>(transaction, 'sources', project.sourceId)
          if (!source || source.accountId !== accountId || source.projectId !== project.id || source.revision !== preparation.sourceRevision) {
            throw serviceError('stale-source', 'The selected source changed before activation.')
          }
          const acceptedTakes = await recordsByIndex<{ id: string }>(transaction, 'takes', 'projectId', project.id)
          if (acceptedTakes.length > 0) throw serviceError('forbidden', 'Preparation is locked after the first accepted take.')
          const active = project.preparationId
            ? await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId)
            : undefined
          const currentDraftIds = await activeDraftIds(transaction, project, active)
          const authorizedDraftIds = preparation.authorizedDraftIdsToDelete.map((id) => ids.draft(id))
          if (!sameDraftIds(currentDraftIds, authorizedDraftIds)) {
            throw revisionConflict('Saved drafts changed before activation. The current preparation and drafts were kept.', project.revision)
          }
          const updated: OwnedProject = {
            ...project,
            preparationId: ids.preparation(preparation.id),
            preparationRevision: asRevision(Number(project.preparationRevision) + 1),
            state: 'recording',
            revision: asRevision(Number(project.revision) + 1),
            updatedAt: nowMs(context.clock),
          }
          for (const turn of preparation.turns) {
            const record: StoredTurn = {
              id: turn.id,
              accountId: project.accountId,
              projectId: project.id,
              preparationId: preparation.id,
              text: turn.text,
              startMs: turn.startMs,
              endMs: turn.endMs,
              windowStartMs: turn.windowStartMs ?? Math.max(project.selection.startMs, turn.startMs - SYNTHETIC_CAPTURE_MARGIN_MS),
              windowEndMs: turn.windowEndMs ?? Math.min(project.selection.endMs, turn.endMs + SYNTHETIC_CAPTURE_MARGIN_MS),
              revision: asRevision(0),
            }
            await writeRecord(transaction, 'turns', record)
          }
          for (const draftId of preparation.authorizedDraftIdsToDelete) await removeRecord(transaction, 'drafts', draftId)
          await writeRecord(transaction, 'projects', updated)
          const activity = await recordProjectActivity(transaction, context, updated, input.operationId, 'user-change')
          return { data: activity, accountId: project.accountId }
        },
      })
    },
  }

  const reconcileBackground = async () => {
    const due = await transact(context, ['meta', 'sessions', 'accounts', 'preparations'], 'readonly', async (transaction) => {
      const { account } = await requireContext(transaction, context)
      const rows = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'accountId', account.id)
      const now = nowMs(context.clock)
      return rows
        .filter((preparation) => (preparation.state === 'queued' || preparation.state === 'running') &&
          (preparation.nextStageAt ?? preparation.createdAt + MOCK_PREPARATION_STAGE_INTERVAL_MS) <= now)
        .map((preparation) => ({
          projectId: ids.project(preparation.projectId),
          operationId: ids.operation(preparation.operationId),
          firstStageDueAt: preparation.nextStageAt ?? preparation.createdAt + MOCK_PREPARATION_STAGE_INTERVAL_MS,
          projectDeleted: preparation.projectDeleted === true,
        }))
    })
    for (const item of due) {
      for (let stage = 0; stage < PROCESS_STAGES.length - 1; stage += 1) {
        if (item.firstStageDueAt + stage * MOCK_PREPARATION_STAGE_INTERVAL_MS > nowMs(context.clock)) break
        if (item.projectDeleted) {
          const advanced = await transact(context, ['meta', 'sessions', 'accounts', 'preparations', 'operations', 'reservations', 'creditStates', 'ledger'], 'readwrite', async (transaction) => {
            const { account } = await requireContext(transaction, context)
            const rows = await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', item.projectId)
            const target = rows.find((preparation) => preparation.operationId === item.operationId
              && preparation.projectDeleted === true
              && preparation.accountId === account.id)
            if (!target) return 'terminal' as const
            const operation = await readRecord<StoredOperation>(transaction, 'operations', item.operationId)
            if (!operation || operation.accountId !== account.id || operation.job?.kind !== 'preparation') {
              throw serviceError('storage-unavailable', 'Deleted preparation operation is unavailable.', 'reconcile-first')
            }
            return advanceDeletedPreparation(transaction, context, target, operation)
          })
          if (advanced !== 'pending') break
          continue
        }
        const advanced = await service.observe({ projectId: item.projectId, targetOperationId: item.operationId })
        if (advanced.status !== 'ok') {
          throw serviceError('storage-unavailable', 'Background preparation status could not be reconciled.', 'reconcile-first')
        }
        if (advanced.data.operation.state !== 'pending') break
      }
    }
  }

  return { ...service, reconcileBackground }
}

async function quoteProject(transaction: IDBTransaction, quoteId: QuoteId): Promise<ProjectId> {
  const quote = await readRecord<StoredQuote>(transaction, 'quotes', quoteId)
  if (!quote) throw serviceError('not-found', 'Processing quote was not found.')
  return quote.projectId
}
