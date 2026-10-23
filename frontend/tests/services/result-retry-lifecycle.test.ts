import { describe, expect, it } from 'vitest'
import type { OwnedProject, RecordingCandidate, ResultGeneration } from '../../src/services/contracts'
import { asRevision, ids } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { readRecord, recordsByIndex, type StoredAuthorization, type StoredPreparation, type StoredResult, writeRecord } from '../../src/services/mock-store'
import { createServices } from '../../src/services'
import { blobWithBytes, createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

const candidateFor = (projectId: ReturnType<typeof ids.project>, turn: {
  id: RecordingCandidate['turnId']
  processingRevision: RecordingCandidate['processingRevision']
  timingRevision: RecordingCandidate['timingRevision']
  windowStartMs: number
  windowEndMs: number
}, key: string): RecordingCandidate => {
  const durationMs = Math.max(1, turn.windowEndMs - turn.windowStartMs)
  return {
    id: ids.candidate(`result-retry-${key}`),
    projectId,
    turnId: turn.id,
    mediaId: ids.media(`result-retry-media-${key}`),
    processingRevision: turn.processingRevision,
    timingRevision: turn.timingRevision,
    revision: 0 as RecordingCandidate['revision'],
    audioTrackPresent: true,
    hasRecordedBytes: true,
    audioFrames: 'present',
    decodedDurationMs: durationMs,
    durationMs,
    accepted: false,
  }
}

async function createAuthorizedProject(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const registrationId = operationId(`register-${email}`)
  expectOk(await harness.services.registration.start({
    email,
    password: 'correct-horse',
    operationId: registrationId,
  }))
  expectOk(await harness.services.registration.verify({
    requestId: registrationId,
    code: harness.verificationCode(registrationId),
    operationId: operationId(`verify-${email}`),
  }))

  const uploaded = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes('retry-source.mp4', [1, 2, 3, 4]),
    facts: sourceFacts(),
    operationId: operationId(`upload-${email}`),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: uploaded.project.id,
    expectedProjectRevision: uploaded.project.revision,
    expectedActivePreparationRevision: uploaded.project.preparationRevision,
    operationId: operationId(`quote-${email}`),
  }))
  const started = expectOk(await harness.services.preparation.start({
    quoteId: quote.id,
    expectedProjectRevision: uploaded.project.revision,
    expectedSourceRevision: uploaded.project.sourceRevision,
    expectedActivePreparationId: quote.activePreparationId,
    expectedActivePreparationRevision: quote.activePreparationRevision,
    acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
    replacementAcknowledged: false,
    draftLossAcknowledged: false,
    explicitAuthorization: true,
    operationId: operationId(`prepare-${email}`),
  }))

  let prepared = false
  for (let attempt = 0; attempt < 8; attempt += 1) {
    harness.advance(1_000)
    const observed = expectOk(await harness.services.preparation.observe({
      projectId: uploaded.project.id,
      targetOperationId: started.operation.id,
    }))
    const outcome = observed.operation.result as { state?: string } | undefined
    if (observed.operation.state === 'committed' && outcome?.state === 'complete') {
      prepared = true
      break
    }
  }
  expect(prepared).toBe(true)
  const project = expectOk(await harness.services.projects.open(uploaded.project.id))
  const status = expectOk(await harness.services.preparation.resolve({
    projectId: project.id,
    targetOperationId: started.operation.id,
  }))
  expectOk(await harness.services.preparation.activate({
    projectId: project.id,
    targetOperationId: started.operation.id,
    expectedRevision: project.revision,
    expectedActivePreparationId: project.preparationId,
    expectedActivePreparationRevision: project.preparationRevision,
    operationId: operationId(`activate-${email}`),
  }))
  expect(status.projectRevision).toBe(project.revision)

  const initial = expectOk(await harness.services.recording.loadContext(project.id))
  let access = expectOk(await harness.services.recording.acquireAccess({
    projectId: project.id,
    expectedProjectRevision: initial.project.revision,
    operationId: operationId(`record-access-${email}`),
  }))
  let authorizationId: ReturnType<typeof ids.operation> | undefined
  for (const [index, seed] of initial.turns.entries()) {
    const current = expectOk(await harness.services.recording.loadContext(project.id))
    const turn = current.turns.find((item) => item.id === seed.id)!
    const candidate = candidateFor(project.id, turn, `${email}-${index}`)
    const accepted = expectOk(await harness.services.recording.acceptCandidate({
      projectId: project.id,
      turnId: turn.id,
      candidate,
      blob: blobWithBytes([9, 8, index]),
      grantId: access.grantId,
      expectedGrantRevision: access.revision,
      expectedProjectRevision: current.project.revision,
      expectedTakeRevision: current.takeRevision,
      operationId: operationId(`accept-${email}-${index}`),
    }))
    access = accepted.access
    authorizationId = accepted.initialAssemblyAuthorizationId ?? authorizationId
  }
  expect(authorizationId).toBeDefined()
  return { projectId: project.id, authorizationId: authorizationId!, access }
}

async function storedResults(harness: ReturnType<typeof createServiceTestHarness>, projectId: string) {
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  const results = await runTransaction(database, ['results'], 'readonly', (transaction) =>
    recordsByIndex<StoredResult>(transaction, 'results', 'projectId', projectId),
  )
  database.close()
  return results
}

function generation(result: unknown): ResultGeneration | undefined {
  const data = result as { currentGeneration?: ResultGeneration }
  return data.currentGeneration
}

async function seedPriorGeneration(
  harness: ReturnType<typeof createServiceTestHarness>,
  projectId: string,
  accountId: string,
): Promise<ResultGeneration> {
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  const operationIdValue = operationId('prior-result-assembly')
  const prior: ResultGeneration = {
    id: ids.generation('prior-result-generation'),
    projectId: ids.project(projectId),
    revision: asRevision(1),
    mediaId: ids.media('prior-result-media'),
    durationMs: 1_000,
    width: 640,
    height: 360,
    current: true,
    fixtureKey: 'resultGeneration1',
    note: 'synthetic-mock-scenario',
  }
  const row: StoredResult = {
    id: String(operationIdValue),
    accountId: ids.account(accountId),
    projectId: ids.project(projectId),
    operationId: operationIdValue,
    retryLineageId: operationIdValue,
    generationId: String(prior.id),
    generation: prior,
    state: 'complete',
    revision: asRevision(0),
  }
  await runTransaction(database, ['results'], 'readwrite', async (transaction) => {
    transaction.objectStore('results').put(row)
  })
  database.close()
  return prior
}

async function seedPendingAutomaticRetryClaim(
  harness: ReturnType<typeof createServiceTestHarness>,
  project: OwnedProject,
  authorizationId: ReturnType<typeof ids.operation>,
  changeSnapshot = false,
) {
  const parentOperationId = operationId(`pending-auto-parent-${project.id}`)
  const childOperationId = operationId(`pending-auto-child-${project.id}`)
  const expectedProjectRevision = asRevision(Number(project.revision) + 1)
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  await runTransaction(database, ['projects', 'authorizations', 'preparations', 'results'], 'readwrite', async (transaction) => {
    const storedProject = await readRecord<OwnedProject>(transaction, 'projects', project.id)
    const authorization = await readRecord<StoredAuthorization>(transaction, 'authorizations', authorizationId)
    const preparation = storedProject?.preparationId
      ? await readRecord<StoredPreparation>(transaction, 'preparations', storedProject.preparationId)
      : undefined
    if (!storedProject || !authorization || (changeSnapshot && !preparation)) {
      throw new Error('The authorized project snapshot was not found.')
    }

    await writeRecord(transaction, 'projects', { ...storedProject, state: 'failed', revision: expectedProjectRevision })
    await writeRecord(transaction, 'authorizations', {
      ...authorization,
      state: 'consumed',
      consumedBy: parentOperationId,
    })
    if (changeSnapshot && preparation) {
      await writeRecord(transaction, 'preparations', {
        ...preparation,
        takeRevision: asRevision(Number(preparation.takeRevision ?? 0) + 1),
      })
    }
    const parent: StoredResult = {
      id: String(parentOperationId),
      accountId: project.accountId,
      projectId: project.id,
      operationId: parentOperationId,
      retryLineageId: parentOperationId,
      attemptKind: 'initial',
      automaticRetryOperationId: childOperationId,
      automaticRetryExpectedProjectRevision: expectedProjectRevision,
      state: 'failed',
      error: {
        code: 'unsupported',
        message: 'The synthetic first assembly failed before producing a generation.',
        retry: 'reconcile-first',
      },
      authorizationId,
      assemblySnapshotKey: authorization.assemblySnapshotKey,
      revision: asRevision(1),
    }
    await writeRecord(transaction, 'results', parent)
  })
  database.close()
  return { parentOperationId, childOperationId, expectedProjectRevision }
}

describe('durable automatic result retry lifecycle', () => {
  it('reconciles the first failed assembly, retries once in the same lineage, and replays the same child operation', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-attempt' })
    const { projectId, authorizationId } = await createAuthorizedProject(harness, 'auto-retry-success@example.test')
    const project = expectOk(await harness.services.projects.open(projectId))
    const beforeCredits = expectOk(await harness.services.credits.snapshot())
    const initialOperationId = operationId('auto-retry-first-assembly')

    const automatic = expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))

    expect(automatic).toMatchObject({ state: 'committed', result: { state: 'complete' } })
    expect(automatic.id).not.toBe(initialOperationId)
    const rows = await storedResults(harness, projectId)
    expect(rows).toHaveLength(2)
    const failedInitial = rows.find((row) => row.operationId === initialOperationId)
    const automaticRetry = rows.find((row) => row.operationId === automatic.id)
    expect(failedInitial).toMatchObject({
      state: 'failed',
      attemptKind: 'initial',
      retryLineageId: initialOperationId,
      automaticRetryOperationId: automatic.id,
    })
    expect(automaticRetry).toMatchObject({
      state: 'complete',
      attemptKind: 'automatic-retry',
      retryLineageId: initialOperationId,
      authorizationId,
      assemblySnapshotKey: failedInitial?.assemblySnapshotKey,
    })

    const initialResolution = expectOk(await harness.services.operations.resolve(initialOperationId))
    expect(initialResolution).toMatchObject({ id: initialOperationId, state: 'rejected', kind: 'result.assembly' })
    const automaticResolution = expectOk(await harness.services.operations.resolve(automatic.id))
    expect(automaticResolution).toMatchObject({ id: automatic.id, state: 'committed', kind: 'result.assembly' })

    const recovered = expectOk(await harness.services.results.load(projectId))
    expect(recovered.retryAvailable).toBe(false)
    expect(generation(recovered)?.fixtureKey).toBe('resultGeneration1')
    const duplicate = expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))
    expect(duplicate.id).toBe(automatic.id)
    expect(await storedResults(harness, projectId)).toHaveLength(2)
    const afterCredits = expectOk(await harness.services.credits.snapshot())
    expect(afterCredits).toEqual(beforeCredits)
  })

  it('persists the one automatic retry across service recreation and offers manual Repeat only after its second failure', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-and-second-attempt' })
    const { projectId, authorizationId } = await createAuthorizedProject(harness, 'auto-retry-failures@example.test')
    const project = expectOk(await harness.services.projects.open(projectId))
    const beforeCredits = expectOk(await harness.services.credits.snapshot())
    const initialOperationId = operationId('auto-retry-two-failures')
    const secondFailure = expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))
    expect(secondFailure).toMatchObject({ state: 'rejected', result: { state: 'failed' } })
    expect(secondFailure.id).not.toBe(initialOperationId)

    const failedState = expectOk(await harness.services.results.load(projectId))
    expect(failedState.retryAvailable).toBe(true)
    expect(failedState.operation?.id).toBe(secondFailure.id)
    expect(failedState.retryLineageId).toBe(initialOperationId)
    expect(await storedResults(harness, projectId)).toHaveLength(2)

    const reopened = createServices({
      adapter: 'mock',
      indexedDB: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      clock: { now: harness.now },
      scenario: 'result-failure-first-and-second-attempt',
    })
    const afterReload = expectOk(await reopened.results.load(projectId))
    expect(afterReload.operation?.id).toBe(secondFailure.id)
    expect(afterReload.retryLineageId).toBe(initialOperationId)
    expect(afterReload.retryAvailable).toBe(true)

    const duplicate = expectOk(await reopened.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))
    expect(duplicate.id).toBe(secondFailure.id)
    expect(await storedResults(harness, projectId)).toHaveLength(2)

    const currentProject = expectOk(await reopened.projects.open(projectId))
    const manual = expectOk(await reopened.results.retry({
      projectId,
      priorOperationId: secondFailure.id,
      retryLineageId: initialOperationId,
      expectedProjectRevision: currentProject.revision,
      operationId: operationId('manual-result-repeat-after-auto-failure'),
    }))
    expect(manual).toMatchObject({ state: 'committed', result: { state: 'complete' } })
    expect(manual.id).not.toBe(secondFailure.id)
    const completed = expectOk(await reopened.results.load(projectId))
    expect(completed.operation?.id).toBe(manual.id)
    expect(completed.retryAvailable).toBe(false)
    expect(await storedResults(harness, projectId)).toHaveLength(3)
    expect(expectOk(await reopened.credits.snapshot())).toEqual(beforeCredits)
  })

  it('preserves the prior generation and rejects retry when accepted takes change after the two failures', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-and-second-attempt' })
    const { projectId, authorizationId } = await createAuthorizedProject(harness, 'auto-retry-stale-snapshot@example.test')
    const project = expectOk(await harness.services.projects.open(projectId))
    const prior = await seedPriorGeneration(harness, projectId, project.accountId)
    const beforeCredits = expectOk(await harness.services.credits.snapshot())
    const initialOperationId = operationId('auto-retry-stale-snapshot')

    const secondFailure = expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))
    expect(secondFailure).toMatchObject({ state: 'rejected', result: { state: 'failed' } })
    expect(secondFailure.id).not.toBe(initialOperationId)
    const beforeTakeChange = expectOk(await harness.services.results.load(projectId))
    expect(beforeTakeChange.currentGeneration?.id).toBe(prior.id)
    expect(beforeTakeChange.retryAvailable).toBe(true)

    const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
    await runTransaction(database, ['preparations'], 'readwrite', async (transaction) => {
      const preparation = await readRecord<StoredPreparation>(transaction, 'preparations', project.preparationId!)
      if (!preparation) throw new Error('Prepared snapshot was not found.')
      await writeRecord(transaction, 'preparations', {
        ...preparation,
        takeRevision: asRevision(Number(preparation.takeRevision ?? 0) + 1),
      })
    })
    database.close()

    const changedProject = expectOk(await harness.services.projects.open(projectId))
    const rejectedManualRetry = await harness.services.results.retry({
      projectId,
      priorOperationId: secondFailure.id,
      retryLineageId: initialOperationId,
      expectedProjectRevision: changedProject.revision,
      operationId: operationId('reject-retry-changed-snapshot'),
    })
    expect(rejectedManualRetry.status).not.toBe('ok')
    if (rejectedManualRetry.status === 'error') {
      expect(rejectedManualRetry.error.code).toBe('stale-source')
    }

    const rows = await storedResults(harness, projectId)
    expect(rows).toHaveLength(3)
    const afterRejectedRetry = expectOk(await harness.services.results.load(projectId))
    expect(afterRejectedRetry.currentGeneration?.id).toBe(prior.id)
    expect(afterRejectedRetry.retryAvailable).toBe(false)
    expect(rows.find((row) => row.generation?.id === prior.id)?.generation?.current).toBe(true)
    expect(expectOk(await harness.services.credits.snapshot())).toEqual(beforeCredits)
  })

  it('reports a stale frozen snapshot when the persisted automatic retry resumes after source revision changes', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-attempt' })
    const { projectId, authorizationId } = await createAuthorizedProject(harness, 'auto-retry-stale-before-resume@example.test')
    const project = expectOk(await harness.services.projects.open(projectId))
    const { childOperationId } = await seedPendingAutomaticRetryClaim(harness, project, authorizationId, true)

    const loadAfterChange = await harness.services.results.load(projectId)
    expect(loadAfterChange).toMatchObject({ status: 'error', error: { code: 'stale-source' } })
    const rows = await storedResults(harness, projectId)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.automaticRetryOperationId).toBe(childOperationId)
    expect(rows[0]?.generation).toBeUndefined()
  })

  it('does not resume a persisted automatic retry after project deletion', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-attempt' })
    const { projectId, authorizationId } = await createAuthorizedProject(harness, 'auto-retry-deleted-project@example.test')
    const project = expectOk(await harness.services.projects.open(projectId))
    const { childOperationId, expectedProjectRevision } = await seedPendingAutomaticRetryClaim(harness, project, authorizationId)

    expectOk(await harness.services.projects.delete({
      projectId,
      expectedRevision: expectedProjectRevision,
      operationId: operationId('delete-project-with-pending-auto-retry'),
    }))

    expect(await harness.services.results.load(projectId)).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(await storedResults(harness, projectId)).toHaveLength(0)
    const manualRetry = await harness.services.results.retry({
      projectId,
      priorOperationId: operationId(`pending-auto-parent-${project.id}`),
      retryLineageId: operationId(`pending-auto-parent-${project.id}`),
      expectedProjectRevision,
      operationId: operationId('delete-project-no-retry-resurrection'),
    })
    expect(manualRetry).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(await harness.services.operations.resolve(childOperationId)).toMatchObject({ status: 'ok', data: { state: 'not-started' } })
  })
})
