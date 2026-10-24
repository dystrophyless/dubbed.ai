import type {
  AcceptedTakeDescriptor,
  AssemblyAuthorization,
  DraftId,
  OperationId,
  OwnedProject,
  RecordingCandidate,
  RecordingAccess,
  RecordingService,
  Revision,
  ServiceResult,
  TakeId,
  TurnId,
} from './contracts'
import { asRevision, ids } from './contracts'
import {
  errorResult,
  intentConflict,
  newOperationId,
  nowMs,
  readRecord,
  recordsByIndex,
  removeRecord,
  requireContext,
  requireProject,
  revisionConflict,
  serviceError,
  sha256,
  transact,
  writeRecord,
  type ActiveContext,
  type StoredAuthorization,
  type StoredDraft,
  type StoredGrant,
  type StoredPreparation,
  type StoredTake,
  type StoredTurn,
  type StoreContext,
  SYNTHETIC_CAPTURE_MARGIN_MS,
} from './mock-store'
import { fingerprint, mutate } from './mutations'
import { recordProjectActivity } from './project-activity'

/** Synthetic lease used by this browser-only adapter; it is not a production timeout policy. */
const MOCK_RECORDING_LEASE_MS = 45_000

type LoadedRecording = {
  active: ActiveContext
  project: Awaited<ReturnType<typeof requireProject<import('./contracts').OwnedProject>>>
  preparation: StoredPreparation
  turns: StoredTurn[]
}

type TurnCounts = {
  turns: StoredTurn[]
  accepted: Array<{ turn: StoredTurn; take: StoredTake }>
  missing: StoredTurn[]
}

function nextRevision(revision: Revision): Revision {
  return asRevision(Number(revision) + 1)
}

function isUsableCapture(candidate: RecordingCandidate, blob: Blob): boolean {
  return candidate.audioTrackPresent
    && candidate.hasRecordedBytes
    && blob.size > 0
    && candidate.audioFrames === 'present'
    && typeof candidate.decodedDurationMs === 'number'
    && Number.isFinite(candidate.decodedDurationMs)
    && candidate.decodedDurationMs > 0
    && Number.isFinite(candidate.durationMs)
    && candidate.durationMs > 0
}

async function loadRecording(
  transaction: IDBTransaction,
  context: StoreContext,
  projectId: import('./contracts').ProjectId,
): Promise<LoadedRecording> {
  const active = await requireContext(transaction, context)
  const project = await requireProject<import('./contracts').OwnedProject>(transaction, active.account.id, projectId)
  if (!project.preparationId) throw serviceError('not-found', 'No prepared recording turns are available.')
  const preparation = await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId)
  if (!preparation || preparation.accountId !== active.account.id || preparation.projectId !== project.id
    || preparation.state !== 'complete' || !preparation.usable
    || preparation.sourceRevision !== project.sourceRevision
    || preparation.selectionRevision !== project.selection.revision) {
    throw serviceError('stale-source', 'The prepared turns are no longer current.')
  }

  const turns = await Promise.all(preparation.turns.map(async (seed) => {
    const stored = await readRecord<StoredTurn>(transaction, 'turns', seed.id)
    if (stored && stored.accountId === active.account.id && stored.projectId === project.id
      && stored.preparationId === preparation.id) return stored
    return {
      id: seed.id,
      accountId: active.account.id,
      projectId: project.id,
      preparationId: preparation.id,
      text: seed.text,
      startMs: seed.startMs,
      endMs: seed.endMs,
      revision: asRevision(0),
    } satisfies StoredTurn
  }))
  return { active, project, preparation, turns }
}

async function currentCounts(
  transaction: IDBTransaction,
  project: LoadedRecording['project'],
  preparation: StoredPreparation,
  turns: StoredTurn[],
): Promise<TurnCounts> {
  const accepted: TurnCounts['accepted'] = []
  const missing: StoredTurn[] = []
  for (const turn of turns) {
    const take = turn.acceptedTakeId
      ? await readRecord<StoredTake>(transaction, 'takes', turn.acceptedTakeId)
      : undefined
    const current = take
      && take.accountId === project.accountId
      && take.projectId === project.id
      && take.turnId === turn.id
      && take.processingRevision === project.preparationRevision
      && take.processingRevision === preparationRevision(project, preparation)
      && take.timingRevision === turn.revision
    if (current) accepted.push({ turn, take })
    else missing.push(turn)
  }
  return { turns, accepted, missing }
}

function preparationRevision(project: LoadedRecording['project'], _preparation: StoredPreparation): Revision {
  return project.preparationRevision
}

function validateCandidateIdentity(
  candidate: RecordingCandidate,
  projectId: LoadedRecording['project']['id'],
  turn: StoredTurn,
  project: LoadedRecording['project'],
): void {
  if (candidate.projectId !== projectId || candidate.turnId !== turn.id) {
    throw serviceError('validation', 'The recording belongs to a different project turn.')
  }
  if (candidate.processingRevision !== project.preparationRevision || candidate.timingRevision !== turn.revision) {
    throw serviceError('stale-source', 'The prepared turn changed after this recording was captured.', 'reconcile-first')
  }
  if (candidate.accepted !== false) throw serviceError('validation', 'Only an unaccepted recording candidate can be saved.')
}

async function requireTurn(
  loaded: LoadedRecording,
  turnId: TurnId,
): Promise<StoredTurn> {
  const turn = loaded.turns.find((item) => item.id === turnId)
  if (!turn) throw serviceError('not-found', 'The prepared turn was not found.')
  return turn
}

type LeaveResolution = {
  action: 'save-and-leave' | 'leave-without-saving' | 'stay'
  disposition: 'stayed' | 'draft-saved' | 'take-accepted' | 'draft-discarded' | 'unchanged'
  draftId?: DraftId
  acceptedTakeId?: TakeId
  initialAssemblyAuthorizationId?: OperationId
  draftDiscarded: boolean
  grantReleased: boolean
}

async function requireGrant(
  transaction: IDBTransaction,
  context: StoreContext,
  loaded: LoadedRecording,
  grantId: OperationId,
  expectedGrantRevision: Revision,
): Promise<StoredGrant> {
  const grant = await readRecord<StoredGrant>(transaction, 'recordingGrants', grantId)
  if (!grant || grant.accountId !== loaded.active.account.id || grant.projectId !== loaded.project.id) {
    throw serviceError('lease-held', 'Recording access changed. Reacquire it before continuing.', 'reconcile-first')
  }
  if (grant.state !== 'held-by-session' || grant.expiresAt <= nowMs(context.clock)
    || grant.sessionId !== loaded.active.session.id || grant.clientId !== context.clientId
    || grant.recordingActorId !== context.recordingActorId) {
    throw serviceError('lease-held', 'This tab no longer holds recording access.', 'reconcile-first')
  }
  if (grant.revision !== expectedGrantRevision) {
    throw revisionConflict('Recording access changed before this write. Reconcile the current grant before continuing.', grant.revision)
  }
  return grant
}

async function persistDraftInTransaction(
  transaction: IDBTransaction,
  context: StoreContext,
  loaded: LoadedRecording,
  turn: StoredTurn,
  candidate: RecordingCandidate,
  blob: Blob,
  contentHash: string,
  operationId: OperationId,
): Promise<{
  candidate: RecordingCandidate
  recoverable: true
  accepted: false
  retainedUsableCandidate?: RecordingCandidate
  project: LoadedRecording['project']
}> {
  validateCandidateIdentity(candidate, loaded.project.id, turn, loaded.project)
  if (blob.size <= 0) throw serviceError('media-invalid', 'No recording bytes are available to preserve.')

  const id = ids.draft(String(operationId))
  const candidateWithDraft: RecordingCandidate = {
    ...candidate,
    draftId: id,
    draftRevision: asRevision(0),
    accepted: false,
  }
  const usable = isUsableCapture(candidateWithDraft, blob)
  const draft: StoredDraft = {
    id,
    accountId: loaded.active.account.id,
    projectId: loaded.project.id,
    turnId: turn.id,
    candidateId: candidate.id,
    candidate: candidateWithDraft,
    blob,
    contentHash,
    usable,
    revision: asRevision(0),
    persistedAt: nowMs(context.clock),
  }
  await writeRecord(transaction, 'drafts', draft)

  const drafts = await recordsByIndex<StoredDraft>(transaction, 'drafts', 'projectIdTurnId', [loaded.project.id, turn.id])
  const retained = drafts
    .filter((item) => item.accountId === loaded.active.account.id && item.id !== id
      && item.usable && item.candidate.processingRevision === loaded.project.preparationRevision
      && item.candidate.timingRevision === turn.revision)
    .sort((left, right) => right.persistedAt - left.persistedAt)[0]

  const changed = {
    ...loaded.project,
    revision: nextRevision(loaded.project.revision),
    updatedAt: nowMs(context.clock),
    state: 'recording' as const,
  }
  await writeRecord(transaction, 'projects', changed)
  const project = await recordProjectActivity(transaction, context, changed, operationId, 'user-change')
  return {
    candidate: candidateWithDraft,
    recoverable: true,
    accepted: false,
    ...(retained ? { retainedUsableCandidate: retained.candidate } : {}),
    project,
  }
}

async function makeAuthorization(
  transaction: IDBTransaction,
  context: StoreContext,
  loaded: LoadedRecording,
  counts: TurnCounts,
  kind: AssemblyAuthorization['kind'],
  takeRevision: Revision,
): Promise<StoredAuthorization> {
  const turnTakeSnapshot = counts.accepted.map(({ turn, take }) => ({
    turnId: ids.turn(turn.id),
    takeId: ids.take(take.id),
    processingRevision: take.processingRevision,
    timingRevision: take.timingRevision,
  }))
  const assemblySnapshotKey = turnTakeSnapshot
    .map((item) => `${item.turnId}:${item.takeId}:${item.processingRevision}:${item.timingRevision}`)
    .join('|')
  const authorization: StoredAuthorization = {
    id: newOperationId(),
    accountId: loaded.active.account.id,
    projectId: loaded.project.id,
    kind,
    acceptedTakeRevision: takeRevision,
    createdAt: nowMs(context.clock),
    assemblySnapshotKey,
    turnTakeSnapshot,
    note: 'synthetic-mock-scenario',
    state: 'available',
  }
  await writeRecord(transaction, 'authorizations', authorization)
  return authorization
}

async function acceptCandidateInTransaction(
  transaction: IDBTransaction,
  context: StoreContext,
  loaded: LoadedRecording,
  turn: StoredTurn,
  candidate: RecordingCandidate,
  blob: Blob,
  contentHash: string,
  grant: StoredGrant,
  operationId: OperationId,
  expectedTakeRevision: Revision,
  draftId?: DraftId,
): Promise<{
  takeId: TakeId
  acceptedCount: number
  requiredCount: number
  missingAcceptedCount: number
  firstMissingTurnId?: TurnId
  initialAssemblyAuthorizationId?: OperationId
  reprocessingLocked: true
  access: RecordingAccess
  project: LoadedRecording['project']
}> {
  validateCandidateIdentity(candidate, loaded.project.id, turn, loaded.project)
  if (!isUsableCapture(candidate, blob)) {
    throw serviceError('media-invalid', 'A decoded audio frame is required before a take can be accepted.')
  }
  const currentTakeRevision = loaded.preparation.takeRevision ?? asRevision(0)
  if (expectedTakeRevision !== currentTakeRevision) {
    throw revisionConflict('Accepted takes changed. Reload this recording before accepting another.', currentTakeRevision)
  }

  const previousTake = turn.acceptedTakeId
    ? await readRecord<StoredTake>(transaction, 'takes', turn.acceptedTakeId)
    : undefined
  if (previousTake && previousTake.candidateId === candidate.id) {
    const counts = await currentCounts(transaction, loaded.project, loaded.preparation, loaded.turns)
    return {
      takeId: ids.take(previousTake.id),
      acceptedCount: counts.accepted.length,
      requiredCount: counts.turns.length,
      missingAcceptedCount: counts.missing.length,
      firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined,
      reprocessingLocked: true,
      access: grant,
      project: loaded.project,
    }
  }

  const takeId = ids.take(String(operationId))
  const take: StoredTake = {
    id: takeId,
    accountId: loaded.active.account.id,
    projectId: loaded.project.id,
    turnId: turn.id,
    candidateId: candidate.id,
    candidate,
    processingRevision: candidate.processingRevision,
    timingRevision: candidate.timingRevision,
    blob,
    contentHash,
    acceptedAt: nowMs(context.clock),
    revision: previousTake ? nextRevision(previousTake.revision) : asRevision(0),
  }
  const acceptedTurn: StoredTurn = { ...turn, acceptedTakeId: takeId }
  const preparation: StoredPreparation = {
    ...loaded.preparation,
    reprocessingLocked: true,
    takeRevision: nextRevision(currentTakeRevision),
  }
  await writeRecord(transaction, 'takes', take)
  await writeRecord(transaction, 'turns', acceptedTurn)
  await writeRecord(transaction, 'preparations', preparation)
  if (draftId) await removeRecord(transaction, 'drafts', draftId)

  const refreshedTurns = loaded.turns.map((item) => item.id === turn.id ? acceptedTurn : item)
  const counts = await currentCounts(transaction, loaded.project, preparation, refreshedTurns)
  let initialAssemblyAuthorizationId: OperationId | undefined
  if (counts.turns.length > 0 && counts.missing.length === 0) {
    const allAuthorizations = await recordsByIndex<StoredAuthorization>(transaction, 'authorizations', 'projectId', loaded.project.id)
    const initial = allAuthorizations.find((item) => item.accountId === loaded.active.account.id && item.kind === 'initial-sequence-completion')
    if (!initial) {
      const authorization = await makeAuthorization(transaction, context, loaded, counts, 'initial-sequence-completion', preparation.takeRevision!)
      initialAssemblyAuthorizationId = authorization.id
    }
  }

  const changed = {
    ...loaded.project,
    revision: nextRevision(loaded.project.revision),
    updatedAt: nowMs(context.clock),
    state: 'recording' as const,
  }
  await writeRecord(transaction, 'projects', changed)
  const project = await recordProjectActivity(transaction, context, changed, operationId, 'user-change')

  // Keep the identity fence live for the duration of the same capture session.
  grant.expiresAt = nowMs(context.clock) + MOCK_RECORDING_LEASE_MS
  grant.revision = nextRevision(grant.revision)
  await writeRecord(transaction, 'recordingGrants', grant)

  return {
    takeId,
    acceptedCount: counts.accepted.length,
    requiredCount: counts.turns.length,
    missingAcceptedCount: counts.missing.length,
    firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined,
    ...(initialAssemblyAuthorizationId ? { initialAssemblyAuthorizationId } : {}),
    reprocessingLocked: true,
    access: grant,
    project,
  }
}

function activeTakeResult(
  counts: TurnCounts,
  project: OwnedProject,
  currentTurnId?: TurnId,
  assemblyAuthorizationId?: OperationId,
) {
  return {
    turns: counts.turns.map((turn) => ({
      id: ids.turn(turn.id),
      text: turn.text,
      startMs: turn.startMs,
      endMs: turn.endMs,
      windowStartMs: turn.windowStartMs ?? Math.max(project.selection.startMs, turn.startMs - SYNTHETIC_CAPTURE_MARGIN_MS),
      windowEndMs: turn.windowEndMs ?? Math.min(project.selection.endMs, turn.endMs + SYNTHETIC_CAPTURE_MARGIN_MS),
      processingRevision: project.preparationRevision,
      timingRevision: turn.revision,
      captureWindowNote: 'synthetic-mock-scenario' as const,
      ...(turn.acceptedTakeId ? { acceptedTakeId: ids.take(turn.acceptedTakeId) } : {}),
    })),
    currentTurnId,
    acceptedTakeCount: counts.accepted.length,
    missingAcceptedCount: counts.missing.length,
    firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined,
    assemblyAuthorizationId,
  }
}

function assertRecordingEditable(project: LoadedRecording['project']): void {
  if (project.state !== 'recording' && project.state !== 'ready') {
    throw serviceError('conflict', 'Recording is unavailable while the project is changing.')
  }
}

async function bestDraft(
  transaction: IDBTransaction,
  loaded: LoadedRecording,
  turn: StoredTurn,
): Promise<StoredDraft | undefined> {
  const drafts = await recordsByIndex<StoredDraft>(transaction, 'drafts', 'projectIdTurnId', [loaded.project.id, turn.id])
  return drafts
    .filter((draft) => draft.accountId === loaded.active.account.id && draft.projectId === loaded.project.id
      && draft.turnId === turn.id && draft.candidate.processingRevision === loaded.project.preparationRevision
      && draft.candidate.timingRevision === turn.revision)
    .sort((left, right) => Number(right.usable) - Number(left.usable) || right.persistedAt - left.persistedAt)[0]
}

function playbackDescriptor(take: StoredTake, url: string): AcceptedTakeDescriptor {
  return {
    projectId: ids.project(take.projectId),
    turnId: ids.turn(take.turnId),
    takeId: ids.take(take.id),
    mediaId: ids.media(take.candidate.mediaId),
    url,
    mediaType: take.blob.type || 'audio/webm',
    durationMs: take.blob.size > 0 ? take.candidate.decodedDurationMs ?? take.candidate.durationMs : 0,
    revision: take.revision,
    note: 'synthetic-mock-scenario',
  }
}

export function createMockRecording(context: StoreContext): RecordingService {
  return {
    loadContext: async (projectId) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'preparations', 'turns', 'takes', 'authorizations'], 'readonly', async (transaction) => {
          const loaded = await loadRecording(transaction, context, projectId)
          const counts = await currentCounts(transaction, loaded.project, loaded.preparation, loaded.turns)
          const currentTurnId = counts.missing[0]
            ? ids.turn(counts.missing[0].id)
            : counts.turns.at(-1) ? ids.turn(counts.turns.at(-1)!.id) : undefined
          const initialAuthorization = (await recordsByIndex<StoredAuthorization>(transaction, 'authorizations', 'projectId', projectId))
            .find((item) => item.accountId === loaded.active.account.id && item.kind === 'initial-sequence-completion')
          return {
            status: 'ok',
            data: {
              project: loaded.project,
              ...activeTakeResult(counts, loaded.project, currentTurnId, initialAuthorization?.id),
              takeRevision: loaded.preparation.takeRevision ?? asRevision(0),
              includedRetryAvailable: loaded.preparation.includedRetryAvailable,
              reprocessingLocked: loaded.preparation.reprocessingLocked,
            },
            replayed: false,
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    navigate: async ({ projectId, turnId, direction }) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'preparations', 'turns', 'takes'], 'readonly', async (transaction) => {
          const loaded = await loadRecording(transaction, context, projectId)
          const counts = await currentCounts(transaction, loaded.project, loaded.preparation, loaded.turns)
          const index = counts.turns.findIndex((turn) => turn.id === turnId)
          if (index < 0) throw serviceError('not-found', 'The prepared turn was not found.')
          const next = direction === 'back' ? index - 1 : index + 1
          if (next < 0) return { status: 'ok', replayed: false, data: { turnId: ids.turn(counts.turns[0].id), boundary: 'start' as const, missingAcceptedCount: counts.missing.length, firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined } }
          if (next >= counts.turns.length) {
            return {
              status: 'ok',
              replayed: false,
              data: {
                turnId: ids.turn(counts.turns[index].id),
                boundary: counts.missing.length === 0 ? 'complete' as const : 'incomplete' as const,
                missingAcceptedCount: counts.missing.length,
                firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined,
              },
            }
          }
          return {
            status: 'ok',
            replayed: false,
            data: {
              turnId: ids.turn(counts.turns[next].id),
              missingAcceptedCount: counts.missing.length,
              firstMissingTurnId: counts.missing[0] ? ids.turn(counts.missing[0].id) : undefined,
            },
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    acquireAccess: async (input) => {
      const requestHash = await fingerprint({
        projectId: input.projectId,
        expectedProjectRevision: input.expectedProjectRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.acquire-access',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'takes', 'recordingGrants'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to record a take.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          assertRecordingEditable(loaded.project)
          if (loaded.project.revision !== input.expectedProjectRevision) {
            throw revisionConflict('Project changed before recording access was acquired.', loaded.project.revision)
          }
          if (loaded.turns.length === 0) throw serviceError('conflict', 'No prepared turns are available to record.')
          const now = nowMs(context.clock)
          const grants = await recordsByIndex<StoredGrant>(transaction, 'recordingGrants', 'projectId', loaded.project.id)
          const live = grants.filter((grant) => grant.accountId === loaded.active.account.id
            && grant.state === 'held-by-session' && grant.expiresAt > now)
          const other = live.find((grant) => grant.clientId !== context.clientId
            || grant.sessionId !== loaded.active.session.id
            || grant.recordingActorId !== context.recordingActorId)
          if (other) throw serviceError('lease-held', 'Recording is active in another tab. Reopen this project after that recording ends.', 'reconcile-first')

          const own = live.find((grant) => grant.clientId === context.clientId
            && grant.sessionId === loaded.active.session.id
            && grant.recordingActorId === context.recordingActorId)
          if (own) {
            const renewed = { ...own, expiresAt: now + MOCK_RECORDING_LEASE_MS, revision: nextRevision(own.revision) }
            await writeRecord(transaction, 'recordingGrants', renewed)
            return { data: renewed, accountId: loaded.active.account.id }
          }
          for (const stale of grants.filter((grant) => grant.state === 'held-by-session' && grant.expiresAt <= now)) {
            await writeRecord(transaction, 'recordingGrants', { ...stale, state: 'released', revision: nextRevision(stale.revision) })
          }
          const fenceToken = Math.max(0, ...grants.map((grant) => grant.fenceToken)) + 1
          const grantId = newOperationId()
          const grant: StoredGrant = {
            id: grantId,
            projectId: loaded.project.id,
            grantId,
            accountId: loaded.active.account.id,
            sessionId: loaded.active.session.id,
            state: 'held-by-session',
            fenceToken,
            expiresAt: now + MOCK_RECORDING_LEASE_MS,
            revision: asRevision(0),
            clientId: context.clientId,
            recordingActorId: context.recordingActorId,
            createdAt: now,
          }
          await writeRecord(transaction, 'recordingGrants', grant)
          return { data: grant, accountId: loaded.active.account.id }
        },
      })
    },

    renewAccess: async (input) => {
      const requestHash = await fingerprint({
        projectId: input.projectId,
        grantId: input.grantId,
        expectedGrantRevision: input.expectedGrantRevision,
        expectedProjectRevision: input.expectedProjectRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.renew-access',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'recordingGrants'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to renew recording access.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          assertRecordingEditable(loaded.project)
          if (loaded.project.revision !== input.expectedProjectRevision) {
            throw revisionConflict('Project changed before recording access was renewed.', loaded.project.revision)
          }
          const grant = await readRecord<StoredGrant>(transaction, 'recordingGrants', input.grantId)
          if (!grant || grant.accountId !== loaded.active.account.id || grant.projectId !== loaded.project.id
            || grant.clientId !== context.clientId || grant.sessionId !== loaded.active.session.id
            || grant.recordingActorId !== context.recordingActorId) {
            throw serviceError('lease-held', 'This tab no longer holds recording access.', 'reconcile-first')
          }
          if (grant.state !== 'held-by-session' || grant.expiresAt <= nowMs(context.clock)) {
            throw serviceError('lease-held', 'Recording access expired. Reopen this project to reacquire it.', 'reconcile-first')
          }
          if (grant.revision !== input.expectedGrantRevision) {
            throw revisionConflict('Recording access changed. Reconcile the current grant before renewing it.', grant.revision)
          }
          const renewed: StoredGrant = {
            ...grant,
            expiresAt: nowMs(context.clock) + MOCK_RECORDING_LEASE_MS,
            revision: nextRevision(grant.revision),
          }
          await writeRecord(transaction, 'recordingGrants', renewed)
          return { data: renewed, accountId: loaded.active.account.id }
        },
      })
    },

    releaseAccess: async (input) => {
      const requestHash = await fingerprint({
        projectId: input.projectId,
        grantId: input.grantId,
        expectedGrantRevision: input.expectedGrantRevision,
        expectedProjectRevision: input.expectedProjectRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.release-access',
        payloadFingerprint: requestHash,
        stores: ['projects', 'recordingGrants'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to release recording access.')
          const project = await requireProject<import('./contracts').OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before recording access was released.', project.revision)
          const grant = await readRecord<StoredGrant>(transaction, 'recordingGrants', input.grantId)
          if (!grant || grant.accountId !== accountId || grant.projectId !== project.id
            || grant.clientId !== context.clientId || grant.recordingActorId !== context.recordingActorId) {
            throw serviceError('lease-held', 'Recording access changed before it could be released.', 'reconcile-first')
          }
          if (grant.revision !== input.expectedGrantRevision) {
            throw revisionConflict('Recording access changed before it could be released.', grant.revision)
          }
          if (grant.state === 'released') return { data: { released: true as const }, accountId: project.accountId }
          const active = await requireContext(transaction, context)
          if (grant.state !== 'held-by-session' || grant.sessionId !== active.session.id || grant.expiresAt <= nowMs(context.clock)) {
            throw serviceError('lease-held', 'This session no longer holds recording access.', 'reconcile-first')
          }
          await writeRecord(transaction, 'recordingGrants', { ...grant, state: 'released', revision: nextRevision(grant.revision) })
          return { data: { released: true as const }, accountId: project.accountId }
        },
      })
    },

    acceptedTakePlayback: async (input) => loadTakePlayback(context, input),
    refreshAcceptedTakePlayback: async (input) => loadTakePlayback(context, input),
    releasePlaybackUrl: (url) => {
      if (url.startsWith('blob:') && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url)
      }
    },

    restoreDraft: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'preparations', 'turns', 'drafts'], 'readonly', async (transaction) => {
          const loaded = await loadRecording(transaction, context, input.projectId)
          const turn = await requireTurn(loaded, input.turnId)
          const draft = await bestDraft(transaction, loaded, turn)
          return {
            status: 'ok',
            replayed: false,
            data: draft ? { candidate: draft.candidate, blob: draft.blob } : null,
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    persistDraft: async (input) => {
      const contentHash = await sha256(input.blob)
      const requestHash = await fingerprint({
        projectId: input.projectId,
        turnId: input.turnId,
        candidate: input.candidate,
        contentHash,
        grantId: input.grantId,
        expectedGrantRevision: input.expectedGrantRevision,
        expectedProjectRevision: input.expectedProjectRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.persist-draft',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'drafts', 'recordingGrants', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to save a recording draft.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          assertRecordingEditable(loaded.project)
          if (loaded.project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before the draft was saved.', loaded.project.revision)
          const turn = await requireTurn(loaded, input.turnId)
          await requireGrant(transaction, context, loaded, input.grantId, input.expectedGrantRevision)
          const saved = await persistDraftInTransaction(transaction, context, loaded, turn, input.candidate, input.blob, contentHash, input.operationId)
          const { project: _project, ...result } = saved
          return { data: result, accountId: accountId as import('./contracts').AccountId }
        },
      })
    },

    acceptCandidate: async (input) => {
      const contentHash = input.blob ? await sha256(input.blob) : undefined
      const requestHash = await fingerprint({
        projectId: input.projectId,
        turnId: input.turnId,
        candidate: input.candidate,
        contentHash: contentHash ?? null,
        draftId: input.draftId ?? null,
        grantId: input.grantId,
        expectedGrantRevision: input.expectedGrantRevision,
        expectedProjectRevision: input.expectedProjectRevision,
        expectedTakeRevision: input.expectedTakeRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.accept-candidate',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'authorizations', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to accept a recording.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          assertRecordingEditable(loaded.project)
          if (loaded.project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before the take was accepted.', loaded.project.revision)
          const turn = await requireTurn(loaded, input.turnId)
          const grant = await requireGrant(transaction, context, loaded, input.grantId, input.expectedGrantRevision)
          let candidate = input.candidate
          let blob = input.blob
          let hash = contentHash
          if (input.draftId) {
            const draft = await readRecord<StoredDraft>(transaction, 'drafts', input.draftId)
            if (!draft || draft.accountId !== loaded.active.account.id || draft.projectId !== loaded.project.id || draft.turnId !== turn.id) {
              throw serviceError('not-found', 'The saved recording draft was not found.')
            }
            if (draft.candidateId !== input.candidate.id || !draft.usable) {
              throw serviceError('media-invalid', 'This saved draft does not contain a confirmed usable audio frame.')
            }
            if (input.blob && hash !== draft.contentHash) throw intentConflict('The candidate bytes differ from the saved draft.')
            candidate = draft.candidate
            blob = draft.blob
            hash = draft.contentHash
          }
          if (!blob || !hash) throw serviceError('validation', 'Choose a saved draft or provide its captured audio bytes.')
          const accepted = await acceptCandidateInTransaction(
            transaction, context, loaded, turn, candidate, blob, hash, grant, input.operationId,
            input.expectedTakeRevision, input.draftId,
          )
          const { project: _project, ...result } = accepted
          return { data: result, accountId: accountId as import('./contracts').AccountId }
        },
      })
    },

    discardDraft: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, turnId: input.turnId, draftId: input.draftId, expectedProjectRevision: input.expectedProjectRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.discard-draft',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'drafts', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to discard this draft.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          if (loaded.project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before the draft was discarded.', loaded.project.revision)
          const turn = await requireTurn(loaded, input.turnId)
          const draft = await readRecord<StoredDraft>(transaction, 'drafts', input.draftId)
          if (!draft || draft.accountId !== accountId || draft.projectId !== loaded.project.id || draft.turnId !== turn.id) {
            throw serviceError('not-found', 'The saved recording draft was not found.')
          }
          await removeRecord(transaction, 'drafts', draft.id)
          const changed = { ...loaded.project, revision: nextRevision(loaded.project.revision), updatedAt: nowMs(context.clock) }
          await writeRecord(transaction, 'projects', changed)
          await recordProjectActivity(transaction, context, changed, input.operationId, 'user-change')
          return { data: { discarded: true as const }, accountId: accountId as import('./contracts').AccountId }
        },
      })
    },

    resolveLeave: async (input) => {
      const blobHash = input.blob ? await sha256(input.blob) : undefined
      const requestHash = await fingerprint({
        projectId: input.projectId,
        turnId: input.turnId,
        action: input.action,
        candidate: input.candidate ?? null,
        blobHash: blobHash ?? null,
        draftId: input.draftId ?? null,
        grantId: input.grantId,
        expectedGrantRevision: input.expectedGrantRevision,
        expectedProjectRevision: input.expectedProjectRevision,
        recordingActorId: context.recordingActorId,
      })
      return mutate<LeaveResolution>(context, {
        operationId: input.operationId,
        kind: 'recording.resolve-leave',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'authorizations', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to leave recording.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          assertRecordingEditable(loaded.project)
          if (loaded.project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before the recording guard was resolved.', loaded.project.revision)
          const turn = await requireTurn(loaded, input.turnId)
          const grant = await requireGrant(transaction, context, loaded, input.grantId, input.expectedGrantRevision)
          if (input.action === 'stay') {
            return {
              data: { action: input.action, disposition: 'stayed' as const, draftDiscarded: false, grantReleased: false },
              accountId: accountId as import('./contracts').AccountId,
            }
          }

          let disposition: 'draft-saved' | 'take-accepted' | 'draft-discarded' | 'unchanged' = 'unchanged'
          let draftId: DraftId | undefined
          let acceptedTakeId: TakeId | undefined
          let initialAssemblyAuthorizationId: OperationId | undefined
          let draftDiscarded = false

          if (input.action === 'leave-without-saving') {
            if (input.draftId) {
              const draft = await readRecord<StoredDraft>(transaction, 'drafts', input.draftId)
              if (draft && draft.accountId === accountId && draft.projectId === loaded.project.id && draft.turnId === turn.id) {
                await removeRecord(transaction, 'drafts', draft.id)
                disposition = 'draft-discarded'
                draftDiscarded = true
                const changed = { ...loaded.project, revision: nextRevision(loaded.project.revision), updatedAt: nowMs(context.clock) }
                await writeRecord(transaction, 'projects', changed)
                await recordProjectActivity(transaction, context, changed, input.operationId, 'user-change')
              }
            }
          } else if (input.action === 'save-and-leave') {
            const counts = await currentCounts(transaction, loaded.project, loaded.preparation, loaded.turns)
            const isFinalInitialGap = counts.missing.length === 1 && counts.missing[0].id === turn.id
            let candidate = input.candidate
            let blob = input.blob
            let contentHash = blobHash
            let persistedDraftId = input.draftId
            if (input.draftId) {
              const draft = await readRecord<StoredDraft>(transaction, 'drafts', input.draftId)
              if (!draft || draft.accountId !== accountId || draft.projectId !== loaded.project.id || draft.turnId !== turn.id) {
                throw serviceError('not-found', 'The saved recording draft was not found.')
              }
              persistedDraftId = ids.draft(draft.id)
              candidate = draft.candidate
              blob = draft.blob
              contentHash = draft.contentHash
            } else if (!candidate || !blob) {
              const draft = await bestDraft(transaction, loaded, turn)
              if (draft) {
                persistedDraftId = ids.draft(draft.id)
                candidate = draft.candidate
                blob = draft.blob
                contentHash = draft.contentHash
              }
            }

            if (candidate && blob && contentHash) {
              validateCandidateIdentity(candidate, loaded.project.id, turn, loaded.project)
              if (isFinalInitialGap && isUsableCapture(candidate, blob)) {
                const accepted = await acceptCandidateInTransaction(
                  transaction, context, loaded, turn, candidate, blob, contentHash, grant,
                  input.operationId, loaded.preparation.takeRevision ?? asRevision(0), persistedDraftId,
                )
                disposition = 'take-accepted'
                acceptedTakeId = accepted.takeId
                initialAssemblyAuthorizationId = accepted.initialAssemblyAuthorizationId
            } else if (persistedDraftId) {
              draftId = persistedDraftId
              disposition = 'draft-saved'
              } else if (input.blob) {
                const saved = await persistDraftInTransaction(transaction, context, loaded, turn, candidate, input.blob, contentHash, input.operationId)
                draftId = saved.candidate.draftId
                disposition = 'draft-saved'
              }
            } else if (persistedDraftId) {
              draftId = persistedDraftId
              disposition = 'draft-saved'
            }
          }

          const currentGrant = await readRecord<StoredGrant>(transaction, 'recordingGrants', grant.grantId)
          if (!currentGrant || currentGrant.accountId !== accountId || currentGrant.sessionId !== loaded.active.session.id
            || currentGrant.clientId !== context.clientId || currentGrant.state !== 'held-by-session') {
            throw serviceError('lease-held', 'Recording access changed before the leave action completed.', 'reconcile-first')
          }
          await writeRecord(transaction, 'recordingGrants', {
            ...currentGrant,
            state: 'released',
            revision: nextRevision(currentGrant.revision),
          })
          return {
            data: {
              action: input.action,
              disposition,
              ...(draftId ? { draftId } : {}),
              ...(acceptedTakeId ? { acceptedTakeId } : {}),
              ...(initialAssemblyAuthorizationId ? { initialAssemblyAuthorizationId } : {}),
              draftDiscarded,
              grantReleased: true,
            },
            accountId: accountId as import('./contracts').AccountId,
          }
        },
      })
    },

    authorizeCompletedRevision: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, expectedProjectRevision: input.expectedProjectRevision, action: input.action })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'recording.authorize-completed-revision',
        payloadFingerprint: requestHash,
        stores: ['projects', 'preparations', 'turns', 'takes', 'authorizations', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to open the completed result.')
          const loaded = await loadRecording(transaction, context, input.projectId)
          if (loaded.project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before the new result revision was authorized.', loaded.project.revision)
          const counts = await currentCounts(transaction, loaded.project, loaded.preparation, loaded.turns)
          if (counts.turns.length === 0 || counts.missing.length > 0) {
            throw serviceError('conflict', 'Complete every required take before requesting a new result revision.')
          }
          const takeRevision = loaded.preparation.takeRevision ?? asRevision(0)
          const candidateSnapshot = counts.accepted.map(({ turn, take }) => `${turn.id}:${take.id}:${take.processingRevision}:${take.timingRevision}`).join('|')
          const existing = (await recordsByIndex<StoredAuthorization>(transaction, 'authorizations', 'projectId', loaded.project.id))
            .find((item) => item.accountId === accountId && item.kind === 'completed-project-to-result' && item.assemblySnapshotKey === candidateSnapshot)
          const authorization = existing ?? await makeAuthorization(transaction, context, loaded, counts, 'completed-project-to-result', takeRevision)
          const project = await recordProjectActivity(transaction, context, loaded.project, input.operationId, 'user-change')
          return { data: authorization, accountId: project.accountId }
        },
      })
    },
  }
}

async function loadTakePlayback(
  context: StoreContext,
  input: { projectId: import('./contracts').ProjectId; turnId: TurnId; takeId: TakeId },
): Promise<ServiceResult<AcceptedTakeDescriptor>> {
  try {
    const stored = await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'preparations', 'turns', 'takes'], 'readonly', async (transaction) => {
      const active = await requireContext(transaction, context)
      const project = await requireProject<import('./contracts').OwnedProject>(transaction, active.account.id, input.projectId)
      const turn = await readRecord<StoredTurn>(transaction, 'turns', input.turnId)
      const take = await readRecord<StoredTake>(transaction, 'takes', input.takeId)
      if (!turn || turn.accountId !== active.account.id || turn.projectId !== project.id || turn.acceptedTakeId !== input.takeId
        || !take || take.accountId !== active.account.id || take.projectId !== project.id || take.turnId !== turn.id
        || take.processingRevision !== project.preparationRevision || take.timingRevision !== turn.revision) {
        throw serviceError('not-found', 'The accepted recording is no longer available.')
      }
      return take
    })
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return { status: 'error', error: { code: 'unsupported', message: 'Local recording playback is unavailable in this environment.', retry: 'none' } }
    }
    return { status: 'ok', data: playbackDescriptor(stored, URL.createObjectURL(stored.blob)), replayed: false }
  } catch (error) {
    return errorResult(error)
  }
}
