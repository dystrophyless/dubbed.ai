import type {
  AssemblyAuthorization,
  GenerationId,
  OperationId,
  OperationSnapshot,
  OwnedProject,
  PlaybackDescriptor,
  ResultGeneration,
  ResultService,
  Revision,
  ServiceResult,
} from './contracts'
import { asRevision, ids } from './contracts'
import { MEDIA_FIXTURE_MANIFEST, MEDIA_FIXTURES } from '../media/fixtures'
import {
  errorResult,
  nowMs,
  readRecord,
  recordsByIndex,
  requireContext,
  requireProject,
  revisionConflict,
  ServiceFault,
  serviceError,
  transact,
  writeRecord,
  type StoredAuthorization,
  type StoredOperation,
  type StoredPreparation,
  type StoredResult,
  type StoredTake,
  type StoredTurn,
  type StoreContext,
} from './mock-store'
import { fingerprint, mutate, resolveStoredOperation } from './mutations'
import { recordProjectActivity } from './project-activity'

type FixtureKey = 'resultGeneration1' | 'resultGeneration2'
type AssemblyAttemptKind = NonNullable<StoredResult['attemptKind']>

interface AutomaticRetryClaim {
  projectId: OwnedProject['id']
  authorizationId: OperationId
  expectedProjectRevision: Revision
  operationId: OperationId
  priorOperationId: OperationId
  retryLineageId: OperationId
}

function nextRevision(revision: Revision): Revision {
  return asRevision(Number(revision) + 1)
}

function assemblySnapshotKey(snapshot: AssemblyAuthorization['turnTakeSnapshot']): string {
  return snapshot.map((item) => `${item.turnId}:${item.takeId}:${item.processingRevision}:${item.timingRevision}`).join('|')
}

function fixtureFor(generation: ResultGeneration): { key: FixtureKey; url: string; sha256: string; bytes: number; mediaType: string } {
  const key = generation.fixtureKey
  if (key !== 'resultGeneration1' && key !== 'resultGeneration2') {
    throw serviceError('not-found', 'This result generation is unavailable in the mock workspace.')
  }
  const asset = MEDIA_FIXTURE_MANIFEST.assets[key]
  return { key, url: MEDIA_FIXTURES[key], sha256: asset.sha256, bytes: asset.bytes, mediaType: asset.contentType }
}

function playbackDescriptor(generation: ResultGeneration): PlaybackDescriptor {
  const asset = fixtureFor(generation)
  return {
    projectId: generation.projectId,
    generationId: generation.id,
    mediaId: generation.mediaId,
    url: asset.url,
    mediaType: asset.mediaType,
    durationMs: generation.durationMs,
    revision: generation.revision,
    note: 'synthetic-mock-scenario',
  }
}

function fileNameFor(title: string): string {
  const stem = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').trim()
  return `${stem || 'dubbed-project'}.mp4`
}

async function currentSnapshot(
  transaction: IDBTransaction,
  project: OwnedProject,
  authorization: StoredAuthorization,
): Promise<{ preparation: StoredPreparation; snapshot: AssemblyAuthorization['turnTakeSnapshot'] }> {
  const preparation = project.preparationId
    ? await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId)
    : undefined
  if (!preparation?.usable) throw serviceError('stale-source', 'The authorized prepared revision is no longer available.')
  if (authorization.acceptedTakeRevision !== (preparation.takeRevision ?? asRevision(0))) {
    throw serviceError('stale-source', 'Accepted takes changed after this result was authorized.')
  }

  const turns = (await recordsByIndex<StoredTurn>(transaction, 'turns', 'projectId', project.id))
    .filter((turn) => turn.accountId === project.accountId && turn.preparationId === preparation.id)
    .sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id, 'en'))
  if (turns.length === 0) throw serviceError('conflict', 'A result requires a prepared turn sequence.')

  const snapshot: AssemblyAuthorization['turnTakeSnapshot'] = []
  for (const turn of turns) {
    if (!turn.acceptedTakeId) throw serviceError('conflict', 'Every prepared turn must have an accepted take before assembly.')
    const take = await readRecord<StoredTake>(transaction, 'takes', turn.acceptedTakeId)
    if (!take || take.accountId !== project.accountId || take.projectId !== project.id || take.turnId !== turn.id
      || take.processingRevision !== project.preparationRevision || take.timingRevision !== turn.revision) {
      throw serviceError('stale-source', 'An accepted take no longer matches the authorized revision.')
    }
    snapshot.push({
      turnId: ids.turn(turn.id),
      takeId: ids.take(take.id),
      processingRevision: take.processingRevision,
      timingRevision: take.timingRevision,
    })
  }

  if (snapshot.length !== authorization.turnTakeSnapshot.length
    || snapshot.some((item, index) => {
      const approved = authorization.turnTakeSnapshot[index]
      return !approved || item.turnId !== approved.turnId || item.takeId !== approved.takeId
        || item.processingRevision !== approved.processingRevision || item.timingRevision !== approved.timingRevision
    })
    || assemblySnapshotKey(snapshot) !== authorization.assemblySnapshotKey) {
    throw serviceError('stale-source', 'The saved takes no longer match the authorized result snapshot.')
  }
  return { preparation, snapshot }
}

async function loadGeneration(
  transaction: IDBTransaction,
  accountId: string,
  projectId: string,
  generationId: GenerationId,
): Promise<StoredResult> {
  const matches = await recordsByIndex<StoredResult>(transaction, 'results', 'generationId', String(generationId))
  const row = matches.find((item) => item.accountId === accountId && item.projectId === projectId && item.generation?.id === generationId)
  if (!row?.generation) throw serviceError('not-found', 'The requested result generation is no longer available.')
  return row
}

function latestRow(rows: StoredResult[]): StoredResult | undefined {
  return rows.sort((left, right) => Number(right.revision) - Number(left.revision) || right.id.localeCompare(left.id, 'en'))[0]
}

function resultJob(
  operationId: OperationId,
  accountId: string,
  state: 'committed' | 'rejected',
  result: unknown,
  updatedAt: number,
  error?: StoredResult['error'],
): OperationSnapshot {
  return {
    id: operationId,
    accountId: ids.account(accountId),
    state,
    kind: 'result.assembly',
    result,
    ...(error ? { error } : {}),
    revision: asRevision(0),
    updatedAt,
  }
}

async function writeAssemblyAttempt(
  transaction: IDBTransaction,
  context: StoreContext,
  input: {
    operationId: OperationId
    retryLineageId: OperationId
    attemptKind: AssemblyAttemptKind
    authorization: StoredAuthorization
    project: OwnedProject
    accountId: string
    rows: StoredResult[]
  },
): Promise<{ operation: OperationSnapshot; project: OwnedProject }> {
  const shouldFail = input.attemptKind === 'initial'
    ? context.scenario === 'result-failure-first-attempt' || context.scenario === 'result-failure-first-and-second-attempt'
    : input.attemptKind === 'automatic-retry' && context.scenario === 'result-failure-first-and-second-attempt'
  const updatedAt = nowMs(context.clock)
  const revision = asRevision(Math.max(0, ...input.rows.map((row) => Number(row.revision))) + 1)
  const error = shouldFail
    ? { code: 'unsupported' as const, message: 'The synthetic assembly scenario failed before producing a new generation.', retry: 'reconcile-first' as const }
    : undefined

  let generation: ResultGeneration | undefined
  if (!shouldFail) {
    const currentRevision = Math.max(0, ...input.rows.map((row) => Number(row.generation?.revision ?? 0)))
    const key: FixtureKey = currentRevision === 0 ? 'resultGeneration1' : 'resultGeneration2'
    const asset = MEDIA_FIXTURE_MANIFEST.assets[key]
    generation = {
      id: ids.generation(`${input.operationId}:generation`),
      projectId: input.project.id,
      revision: asRevision(currentRevision + 1),
      mediaId: ids.media(`${input.operationId}:media`),
      durationMs: asset.requestedCaptureWindowMs,
      width: asset.canvasWidth,
      height: asset.canvasHeight,
      current: true,
      fixtureKey: key,
      note: 'synthetic-mock-scenario',
    }
  }

  if (generation) {
    for (const previous of input.rows) {
      if (previous.generation?.current) {
        await writeRecord(transaction, 'results', { ...previous, generation: { ...previous.generation, current: false } })
      }
    }
  }

  const row: StoredResult = {
    id: String(input.operationId),
    accountId: ids.account(input.accountId),
    projectId: input.project.id,
    operationId: input.operationId,
    retryLineageId: input.retryLineageId,
    attemptKind: input.attemptKind,
    ...(shouldFail && input.attemptKind === 'initial'
      ? { automaticRetryOperationId: ids.operation(`${input.operationId}:automatic-retry`) }
      : {}),
    ...(generation ? { generationId: String(generation.id), generation } : {}),
    state: shouldFail ? 'failed' : 'complete',
    ...(error ? { error } : {}),
    authorizationId: input.authorization.id,
    assemblySnapshotKey: input.authorization.assemblySnapshotKey,
    revision,
  }
  const job = resultJob(
    input.operationId,
    input.accountId,
    shouldFail ? 'rejected' : 'committed',
    shouldFail
      ? {
          state: 'failed',
          retryLineageId: input.retryLineageId,
          ...(row.automaticRetryOperationId ? { automaticRetryOperationId: row.automaticRetryOperationId } : {}),
          note: 'synthetic-mock-scenario',
        }
      : { state: 'complete', generationId: generation!.id, percentage: { value: 100, trusted: true }, note: 'synthetic-mock-scenario' },
    updatedAt,
    error,
  )
  const changed = await recordProjectActivity(
    transaction,
    context,
    { ...input.project, state: shouldFail ? 'failed' : 'ready', revision: nextRevision(input.project.revision), updatedAt },
    ids.operation(`${input.operationId}:terminal`),
    'result-completed',
  )
  await writeRecord(transaction, 'results', {
    ...row,
    ...(row.automaticRetryOperationId ? { automaticRetryExpectedProjectRevision: changed.revision } : {}),
  })
  return { operation: { ...job, updatedAt: changed.lastActivityAt }, project: changed }
}

async function executeAssembly(
  context: StoreContext,
  input: {
    projectId: OwnedProject['id']
    authorizationId: OperationId
    expectedProjectRevision: Revision
    operationId: OperationId
  },
  retry?: { priorOperationId: OperationId; retryLineageId: OperationId; attemptKind: 'automatic-retry' | 'manual-retry' },
): Promise<ServiceResult<OperationSnapshot>> {
  const requestHash = await fingerprint({
    projectId: input.projectId,
    authorizationId: input.authorizationId,
    expectedProjectRevision: input.expectedProjectRevision,
    ...(retry ? {
      priorOperationId: retry.priorOperationId,
      retryLineageId: retry.retryLineageId,
      attemptKind: retry.attemptKind,
    } : {}),
  })
  const kind = retry ? 'result.retry' : 'result.assemble'
  return mutate(context, {
    operationId: input.operationId,
    kind,
    payloadFingerprint: requestHash,
    stores: ['projects', 'preparations', 'turns', 'takes', 'authorizations', 'results', 'activityEvents'],
    work: async (transaction, accountId) => {
      if (!accountId) throw serviceError('unauthenticated', 'Sign in to assemble this result.')
      const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
      if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed before assembly was authorized.', project.revision)
      if (project.state !== 'recording' && project.state !== 'ready' && project.state !== 'failed') {
        throw serviceError('conflict', 'This project is not ready for result assembly.')
      }

      const authorization = await readRecord<StoredAuthorization>(transaction, 'authorizations', input.authorizationId)
      if (!authorization || authorization.accountId !== accountId || authorization.projectId !== project.id) {
        throw serviceError('not-found', 'The result authorization was not found.')
      }
      const rows = (await recordsByIndex<StoredResult>(transaction, 'results', 'projectId', project.id))
        .filter((row) => row.accountId === accountId)

      if (retry) {
        const previous = latestRow(rows)
        if (!previous || previous.state !== 'failed' || previous.operationId !== retry.priorOperationId
          || previous.retryLineageId !== retry.retryLineageId || previous.authorizationId !== authorization.id
          || previous.assemblySnapshotKey !== authorization.assemblySnapshotKey
          || previous.error?.retry === 'none') {
          throw serviceError('conflict', 'This result attempt is not available for a same-revision retry.')
        }
        if (authorization.state !== 'consumed' || authorization.consumedBy !== retry.retryLineageId) {
          throw serviceError('stale-source', 'The retry no longer matches the authorized assembly attempt.')
        }
        if (retry.attemptKind === 'automatic-retry'
          && (previous.attemptKind !== 'initial'
            || previous.automaticRetryOperationId !== input.operationId
            || previous.automaticRetryExpectedProjectRevision !== input.expectedProjectRevision)) {
          throw serviceError('conflict', 'The one automatic retry was not authorized for this operation.')
        }
        if (retry.attemptKind === 'manual-retry' && previous.attemptKind === 'initial' && previous.automaticRetryOperationId) {
          throw serviceError('conflict', 'The automatic retry must finish before manual repeat is available.')
        }
      } else if (authorization.state !== 'available') {
        throw serviceError('conflict', 'This result authorization has already been used.')
      }

      await currentSnapshot(transaction, project, authorization)

      if (!retry) {
        authorization.state = 'consumed'
        authorization.consumedBy = input.operationId
        await writeRecord(transaction, 'authorizations', authorization)
      }
      const retryLineageId = retry?.retryLineageId ?? input.operationId
      const result = await writeAssemblyAttempt(transaction, context, {
        operationId: input.operationId,
        retryLineageId,
        attemptKind: retry?.attemptKind ?? 'initial',
        authorization,
        project,
        accountId,
        rows,
      })
      return {
        data: result.operation,
        accountId: ids.account(accountId),
        job: result.operation,
      }
    },
  })
}

async function findAutomaticRetryClaim(
  context: StoreContext,
  projectId: OwnedProject['id'],
  parentOperationId?: OperationId,
): Promise<ServiceResult<AutomaticRetryClaim | undefined>> {
  try {
    return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'results'], 'readonly', async (transaction) => {
      const active = await requireContext(transaction, context)
      const project = await requireProject<OwnedProject>(transaction, active.account.id, projectId)
      const rows = (await recordsByIndex<StoredResult>(transaction, 'results', 'projectId', projectId))
        .filter((row) => row.accountId === active.account.id)
      const parent = parentOperationId
        ? rows.find((row) => row.operationId === parentOperationId)
        : latestRow([...rows])
      if (parent?.state !== 'failed' || parent.attemptKind !== 'initial'
        || !parent.automaticRetryOperationId || parent.automaticRetryExpectedProjectRevision === undefined
        || !parent.authorizationId) {
        return { status: 'ok', replayed: false, data: undefined }
      }
      return {
        status: 'ok',
        replayed: false,
        data: {
          projectId: project.id,
          authorizationId: parent.authorizationId,
          expectedProjectRevision: parent.automaticRetryExpectedProjectRevision,
          operationId: parent.automaticRetryOperationId,
          priorOperationId: parent.operationId,
          retryLineageId: parent.retryLineageId,
        },
      }
    })
  } catch (error) {
    return errorResult(error)
  }
}

async function reconcileUnknownAssembly(
  context: StoreContext,
  input: Parameters<typeof executeAssembly>[1],
  result: ServiceResult<OperationSnapshot>,
  retry?: Parameters<typeof executeAssembly>[2],
): Promise<ServiceResult<OperationSnapshot>> {
  if (result.status !== 'unknown') return result

  const resolved = await resolveStoredOperation(context, input.operationId)
  if (resolved.status !== 'ok') return resolved
  if (!('safeToRetrySameId' in resolved.data)) {
    return { status: 'ok', data: resolved.data, replayed: true }
  }
  if (resolved.data.operationId !== input.operationId || !resolved.data.safeToRetrySameId) return result

  const retried = await executeAssembly(context, input, retry)
  if (retried.status !== 'unknown') return retried
  const final = await resolveStoredOperation(context, input.operationId)
  if (final.status !== 'ok') return final
  if ('safeToRetrySameId' in final.data) return retried
  return { status: 'ok', data: final.data, replayed: true }
}

async function resumeAutomaticRetry(
  context: StoreContext,
  claim: AutomaticRetryClaim,
): Promise<ServiceResult<OperationSnapshot>> {
  const resolved = await resolveStoredOperation(context, claim.operationId)
  if (resolved.status !== 'ok') return resolved
  if (!('safeToRetrySameId' in resolved.data)) {
    return { status: 'ok', data: resolved.data, replayed: true }
  }
  if (resolved.data.operationId !== claim.operationId || !resolved.data.safeToRetrySameId) {
    return { status: 'unknown', operationId: claim.operationId, message: 'The automatic retry cannot be safely reconciled yet.' }
  }

  const input = {
    projectId: claim.projectId,
    authorizationId: claim.authorizationId,
    expectedProjectRevision: claim.expectedProjectRevision,
    operationId: claim.operationId,
  }
  const retry = {
    priorOperationId: claim.priorOperationId,
    retryLineageId: claim.retryLineageId,
    attemptKind: 'automatic-retry' as const,
  }
  return reconcileUnknownAssembly(context, input, await executeAssembly(context, input, retry), retry)
}

export function createMockResults(context: StoreContext): ResultService {
  return {
    load: async (projectId) => {
      const claim = await findAutomaticRetryClaim(context, projectId)
      if (claim.status !== 'ok') return claim
      if (claim.data) {
        const recovered = await resumeAutomaticRetry(context, claim.data)
        if (recovered.status !== 'ok') return recovered
      }
      try {
        return await transact(context, [
          'meta', 'sessions', 'accounts', 'projects', 'preparations', 'turns', 'takes', 'authorizations', 'results', 'operations',
        ], 'readonly', async (transaction) => {
          const active = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, active.account.id, projectId)
          const rows = (await recordsByIndex<StoredResult>(transaction, 'results', 'projectId', projectId))
            .filter((row) => row.accountId === active.account.id)
          const current = rows
            .filter((row) => row.generation?.current)
            .sort((left, right) => Number(right.generation!.revision) - Number(left.generation!.revision))[0]?.generation
          const latest = latestRow(rows)
          const operation = latest
            ? await readRecord<StoredOperation>(transaction, 'operations', latest.operationId)
            : undefined
          let retryAvailable = latest?.state === 'failed' && latest.error?.retry !== 'none'
            && !(latest.attemptKind === 'initial' && latest.automaticRetryOperationId)
          if (retryAvailable && latest?.authorizationId) {
            const authorization = await readRecord<StoredAuthorization>(transaction, 'authorizations', latest.authorizationId)
            if (!authorization || authorization.state !== 'consumed') {
              retryAvailable = false
            } else {
              try {
                await currentSnapshot(transaction, project, authorization)
              } catch (error) {
                if (!(error instanceof ServiceFault)) throw error
                retryAvailable = false
              }
            }
          }
          return {
            status: 'ok',
            replayed: false,
            data: {
              project,
              currentGeneration: current,
              displayedGeneration: current,
              operation: operation?.job,
              retryLineageId: latest?.retryLineageId,
              retryAvailable,
            },
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    ensureAssembly: async (input) => {
      const initial = await reconcileUnknownAssembly(context, input, await executeAssembly(context, input))
      if (initial.status !== 'ok' || initial.data.state !== 'rejected') return initial
      const claim = await findAutomaticRetryClaim(context, input.projectId, initial.data.id)
      if (claim.status !== 'ok') return claim
      return claim.data ? resumeAutomaticRetry(context, claim.data) : initial
    },

    loadPlayback: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'results'], 'readonly', async (transaction) => {
          const active = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, active.account.id, input.projectId)
          const row = await loadGeneration(transaction, active.account.id, project.id, input.displayedGenerationId)
          return {
            status: 'ok',
            replayed: false,
            data: { generation: row.generation!, descriptor: playbackDescriptor(row.generation!) },
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    refreshPlayback: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'results'], 'readonly', async (transaction) => {
          const active = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, active.account.id, input.projectId)
          const row = await loadGeneration(transaction, active.account.id, project.id, input.displayedGenerationId)
          return {
            status: 'ok',
            replayed: false,
            data: { generation: row.generation!, descriptor: playbackDescriptor(row.generation!) },
          }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    requestDownload: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, displayedGenerationId: input.displayedGenerationId })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'result.download',
        payloadFingerprint: requestHash,
        stores: ['projects', 'results'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to download this result.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          const row = await loadGeneration(transaction, accountId, project.id, input.displayedGenerationId)
          const generation = row.generation!
          return {
            data: {
              generationId: generation.id,
              descriptor: playbackDescriptor(generation),
              fileName: fileNameFor(project.title),
            },
            accountId: project.accountId,
          }
        },
      })
    },

    retry: async (input) => {
      try {
        const found = await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'results', 'authorizations'], 'readonly', async (transaction) => {
          const active = await requireContext(transaction, context)
          await requireProject<OwnedProject>(transaction, active.account.id, input.projectId)
          return {
            accountId: active.account.id,
            rows: await recordsByIndex<StoredResult>(transaction, 'results', 'projectId', input.projectId),
          }
        })
        const latest = latestRow(found.rows.filter((row) => row.accountId === found.accountId))
        if (!latest?.authorizationId) return { status: 'error', error: { code: 'not-found', message: 'The failed result operation was not found.', retry: 'none' } }
        const retryInput = {
          projectId: input.projectId,
          authorizationId: ids.operation(latest.authorizationId),
          expectedProjectRevision: input.expectedProjectRevision,
          operationId: input.operationId,
        }
        const retry = {
          priorOperationId: input.priorOperationId,
          retryLineageId: input.retryLineageId,
          attemptKind: 'manual-retry' as const,
        }
        return reconcileUnknownAssembly(context, retryInput, await executeAssembly(context, retryInput, retry), retry)
      } catch (error) {
        return errorResult(error)
      }
    },
  }
}
