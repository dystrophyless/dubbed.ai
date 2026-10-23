import { describe, expect, it } from 'vitest'
import type { OperationId, OwnedProject, ProcessingQuote, ProjectId, RecordingCandidate } from '../../src/services/contracts'
import { asRevision, ids } from '../../src/services/contracts'
import { blobWithBytes, createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function createAccount(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId(`register-${email}`)
  expect((await harness.services.registration.start({ email, password: 'correct-horse', operationId: requestId })).status).toBe('ok')
  expect((await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId(`verify-${email}`),
  })).status).toBe('ok')
}

function activePreparationExpectation(project: OwnedProject) {
  return {
    expectedActivePreparationId: project.preparationId,
    expectedActivePreparationRevision: project.preparationRevision,
  }
}

function startAuthorization(quote: ProcessingQuote) {
  const replacingActivePreparation = quote.activePreparationId !== undefined
  return {
    expectedActivePreparationId: quote.activePreparationId,
    expectedActivePreparationRevision: quote.activePreparationRevision,
    acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
    replacementAcknowledged: replacingActivePreparation,
    draftLossAcknowledged: replacingActivePreparation,
  }
}

async function startPreparation(harness: ReturnType<typeof createServiceTestHarness>, title: string, durationMs = 3_000) {
  const { project } = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes(`${title}.mp4`, [1, 2, 3]),
    title,
    facts: sourceFacts(),
    operationId: operationId(`upload-${title}`),
  }))
  const selected = expectOk(await harness.services.preparation.updateSelection({
    projectId: project.id,
    startMs: 0,
    endMs: durationMs,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    operationId: operationId(`selection-${title}`),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: project.id,
    expectedProjectRevision: selected.revision,
    ...activePreparationExpectation(selected),
    operationId: operationId(`quote-${title}`),
  }))
  const initialBalance = expectOk(await harness.services.credits.snapshot())
  const started = expectOk(await harness.services.preparation.start({
    quoteId: quote.id,
    expectedProjectRevision: selected.revision,
    expectedSourceRevision: project.sourceRevision,
    ...startAuthorization(quote),
    explicitAuthorization: true,
    operationId: operationId(`start-${title}`),
  }))
  return { project, quote, started, initialBalance }
}

async function startInitialZeroTurnPreparation(harness: ReturnType<typeof createServiceTestHarness>, title: string) {
  const { project } = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes(`${title}.mp4`, [1, 2, 3]),
    title,
    facts: sourceFacts(),
    operationId: operationId(`upload-${title}`),
  }))
  const selected = expectOk(await harness.services.preparation.updateSelection({
    projectId: project.id,
    startMs: 7_000,
    endMs: 8_000,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    operationId: operationId(`selection-${title}`),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: project.id,
    expectedProjectRevision: selected.revision,
    ...activePreparationExpectation(selected),
    operationId: operationId(`quote-${title}`),
  }))
  const initialBalance = expectOk(await harness.services.credits.snapshot())
  const started = expectOk(await harness.services.preparation.start({
    quoteId: quote.id,
    expectedProjectRevision: selected.revision,
    expectedSourceRevision: project.sourceRevision,
    ...startAuthorization(quote),
    explicitAuthorization: true,
    operationId: operationId(`start-${title}`),
  }))
  return { project, quote, started, initialBalance }
}

async function completePreparation(
  harness: ReturnType<typeof createServiceTestHarness>,
  projectId: ProjectId,
  targetOperationId: OperationId,
) {
  let snapshot = expectOk(await harness.services.preparation.resolve({ projectId, targetOperationId }))
  for (let stage = 0; stage < 3; stage += 1) {
    harness.advance(1_000)
    snapshot = expectOk(await harness.services.preparation.observe({ projectId, targetOperationId }))
  }
  const outcome = snapshot.operation.result as { state?: string; turnCount?: number } | undefined
  if (snapshot.operation.state === 'committed' && outcome?.state === 'complete' && (outcome.turnCount ?? 0) > 0) {
    const activeProject = expectOk(await harness.services.projects.open(projectId))
    expectOk(await harness.services.preparation.activate({
      projectId,
      targetOperationId,
      expectedRevision: activeProject.revision,
      ...activePreparationExpectation(activeProject),
      operationId: operationId(`activate-${targetOperationId}`),
    }))
    snapshot = expectOk(await harness.services.preparation.resolve({ projectId, targetOperationId }))
  }
  return snapshot
}

async function saveDraft(harness: ReturnType<typeof createServiceTestHarness>, projectId: ProjectId, key: string) {
  const context = expectOk(await harness.services.recording.loadContext(projectId))
  const turn = context.turns[0]
  const grant = expectOk(await harness.services.recording.acquireAccess({
    projectId,
    expectedProjectRevision: context.project.revision,
    operationId: operationId(`draft-grant-${key}`),
  }))
  const durationMs = Math.max(1, turn.windowEndMs - turn.windowStartMs)
  const candidate: RecordingCandidate = {
    id: ids.candidate(`draft-candidate-${key}`),
    projectId,
    turnId: turn.id,
    mediaId: ids.media(`draft-media-${key}`),
    processingRevision: turn.processingRevision,
    timingRevision: turn.timingRevision,
    revision: asRevision(0),
    audioTrackPresent: true,
    hasRecordedBytes: true,
    audioFrames: 'present',
    decodedDurationMs: durationMs,
    durationMs,
    accepted: false,
  }
  const blob = blobWithBytes([9, 8, 7])
  const saved = expectOk(await harness.services.recording.persistDraft({
    projectId,
    turnId: turn.id,
    candidate,
    blob,
    grantId: grant.grantId,
    expectedGrantRevision: grant.revision,
    expectedProjectRevision: context.project.revision,
    operationId: operationId(`persist-draft-${key}`),
  }))
  expect(saved.candidate.accepted).toBe(false)
  return { turnId: turn.id, draftId: saved.candidate.draftId, blob }
}

describe('preparation recovery and accounting', () => {
  it('grants the single included retry after the first successful run even when an earlier initial run was cancelled', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'cancelled-initial-retry@example.test')
    const { project, started: initial } = await startPreparation(harness, 'Cancelled initial before success')
    const cancellationQuote = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: initial.operation.id,
      expectedRevision: initial.operation.revision,
      operationId: operationId('cancelled-initial-retry-quote'),
    }))
    expectOk(await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: initial.operation.id,
      cancellationQuoteId: cancellationQuote.quoteId,
      expectedRevision: initial.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('cancelled-initial-retry-cancel'),
    }))

    const cancelledProject = expectOk(await harness.services.projects.open(project.id))
    const paidQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: cancelledProject.revision,
      ...activePreparationExpectation(cancelledProject),
      operationId: operationId('first-success-after-cancel-quote'),
    }))
    expect(paidQuote).toMatchObject({ attemptClass: 'paid-reprocessing', credits: 3 })
    const firstSuccessful = expectOk(await harness.services.preparation.start({
      quoteId: paidQuote.id,
      expectedProjectRevision: cancelledProject.revision,
      expectedSourceRevision: cancelledProject.sourceRevision,
      ...startAuthorization(paidQuote),
      explicitAuthorization: true,
      operationId: operationId('first-success-after-cancel-start'),
    }))
    const completed = await completePreparation(harness, project.id, firstSuccessful.operation.id)
    expect(completed).toMatchObject({ operation: { state: 'committed', result: { state: 'complete' } }, includedRetryAvailable: true })

    const afterSuccess = expectOk(await harness.services.projects.open(project.id))
    const retryQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: afterSuccess.revision,
      ...activePreparationExpectation(afterSuccess),
      operationId: operationId('included-retry-after-first-success-quote'),
    }))
    expect(retryQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0 })
  })

  it('grants the retry on the first successful run after a failed initial attempt', async () => {
    const harness = createServiceTestHarness({ scenario: 'preparation-system-failure-first-attempt' })
    await createAccount(harness, 'failed-initial-retry@example.test')
    const { project, started: initial } = await startPreparation(harness, 'Failed initial before success')
    const failed = await completePreparation(harness, project.id, initial.operation.id)
    expect(failed.operation.state).toBe('rejected')
    expect(failed.includedRetryAvailable).toBe(false)

    const failedProject = expectOk(await harness.services.projects.open(project.id))
    const paidQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: failedProject.revision,
      ...activePreparationExpectation(failedProject),
      operationId: operationId('first-success-after-failure-quote'),
    }))
    expect(paidQuote.attemptClass).toBe('paid-reprocessing')
    const started = expectOk(await harness.services.preparation.start({
      quoteId: paidQuote.id,
      expectedProjectRevision: failedProject.revision,
      expectedSourceRevision: failedProject.sourceRevision,
      ...startAuthorization(paidQuote),
      explicitAuthorization: true,
      operationId: operationId('first-success-after-failure-start'),
    }))
    const completed = await completePreparation(harness, project.id, started.operation.id)
    expect(completed).toMatchObject({ operation: { state: 'committed', result: { state: 'complete' } }, includedRetryAvailable: true })

    const afterSuccess = expectOk(await harness.services.projects.open(project.id))
    const retryQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: afterSuccess.revision,
      ...activePreparationExpectation(afterSuccess),
      operationId: operationId('included-retry-after-failure-quote'),
    }))
    expect(retryQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0 })
  })

  it('settles an authorized initial quote when preparation completes successfully with zero turns', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'zero-turn@example.test')
    const { project, quote, started, initialBalance } = await startInitialZeroTurnPreparation(harness, 'Zero turn project')
    expect(quote).toMatchObject({ durationMs: 1_000, credits: 1, note: 'synthetic-mock-scenario' })

    const operation = started.operation.id
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: initialBalance.available - 1,
      reserved: 1,
    })

    let completed = expectOk(await harness.services.preparation.resolve({ projectId: project.id, targetOperationId: operation }))
    for (let stage = 0; stage < 3; stage += 1) {
      harness.advance(1_000)
      completed = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: operation }))
    }

    expect(completed.operation).toMatchObject({ state: 'committed', result: { state: 'complete', zeroTurns: true } })
    expect(completed).toMatchObject({ attemptClass: 'initial', includedRetryAvailable: true })
    expect(completed.currentPreparationId).toBeUndefined()
    const zeroTurnProject = expectOk(await harness.services.projects.open(project.id))
    expect(zeroTurnProject).toMatchObject({ state: 'uploaded', includedRetryAvailable: true })
    expect(zeroTurnProject.preparationId).toBeUndefined()
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: initialBalance.available - 1,
      reserved: 0,
    })
    const ledger = expectOk(await harness.services.credits.history())
    expect(ledger.filter((entry) => entry.relatedOperationId === operation && entry.kind === 'processing-reservation')).toHaveLength(1)
    expect(ledger.filter((entry) => entry.relatedOperationId === operation && entry.kind === 'processing-settlement')).toMatchObject([
      { delta: -1, availableAfter: initialBalance.available - 1, reservedAfter: 0 },
    ])
    expect(ledger.filter((entry) => entry.relatedOperationId === operation && entry.kind === 'reservation-release')).toHaveLength(0)
    expect(started.reservationId).toBeTruthy()
  })

  it('grants one included retry after initial zero turns, preserves it on queued cancel or system failure, then consumes it on success', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'zero-turn-retry@example.test')
    const { project, started: initial } = await startInitialZeroTurnPreparation(harness, 'Zero turn retry')
    const initialResult = await completePreparation(harness, project.id, initial.operation.id)
    expect(initialResult).toMatchObject({ attemptClass: 'initial', operation: { state: 'committed', result: { zeroTurns: true } }, includedRetryAvailable: true })

    const queuedProject = expectOk(await harness.services.projects.open(project.id))
    const queuedQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: queuedProject.revision,
      ...activePreparationExpectation(queuedProject),
      operationId: operationId('zero-turn-retry-queued-quote'),
    }))
    expect(queuedQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0, activePreparationId: undefined })
    const queued = expectOk(await harness.services.preparation.start({
      quoteId: queuedQuote.id,
      expectedProjectRevision: queuedProject.revision,
      expectedSourceRevision: queuedProject.sourceRevision,
      ...startAuthorization(queuedQuote),
      explicitAuthorization: true,
      operationId: operationId('zero-turn-retry-queued-start'),
    }))
    const queuedCancellation = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: queued.operation.id,
      expectedRevision: queued.operation.revision,
      operationId: operationId('zero-turn-retry-queued-cancel-quote'),
    }))
    expect(queuedCancellation.includedRetryRemains).toBe(true)
    expectOk(await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: queued.operation.id,
      cancellationQuoteId: queuedCancellation.quoteId,
      expectedRevision: queued.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('zero-turn-retry-queued-cancel'),
    }))

    const failureHarness = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: harness.now(),
      scenario: 'preparation-system-failure',
    })
    const beforeFailure = expectOk(await failureHarness.services.projects.open(project.id))
    const failureQuote = expectOk(await failureHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: beforeFailure.revision,
      ...activePreparationExpectation(beforeFailure),
      operationId: operationId('zero-turn-retry-failure-quote'),
    }))
    expect(failureQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0 })
    const failingRetry = expectOk(await failureHarness.services.preparation.start({
      quoteId: failureQuote.id,
      expectedProjectRevision: beforeFailure.revision,
      expectedSourceRevision: beforeFailure.sourceRevision,
      ...startAuthorization(failureQuote),
      explicitAuthorization: true,
      operationId: operationId('zero-turn-retry-failure-start'),
    }))
    const failed = await completePreparation(failureHarness, project.id, failingRetry.operation.id)
    expect(failed.operation).toMatchObject({ state: 'rejected', result: { state: 'failed', reason: 'system-failure' } })
    expect(failed.includedRetryAvailable).toBe(true)

    const successfulHarness = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: failureHarness.now(),
    })
    const beforeSuccess = expectOk(await successfulHarness.services.projects.open(project.id))
    const successQuote = expectOk(await successfulHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: beforeSuccess.revision,
      ...activePreparationExpectation(beforeSuccess),
      operationId: operationId('zero-turn-retry-success-quote'),
    }))
    expect(successQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0 })
    const successfulRetry = expectOk(await successfulHarness.services.preparation.start({
      quoteId: successQuote.id,
      expectedProjectRevision: beforeSuccess.revision,
      expectedSourceRevision: beforeSuccess.sourceRevision,
      ...startAuthorization(successQuote),
      explicitAuthorization: true,
      operationId: operationId('zero-turn-retry-success-start'),
    }))
    const consumed = await completePreparation(successfulHarness, project.id, successfulRetry.operation.id)
    expect(consumed).toMatchObject({ operation: { state: 'committed', result: { state: 'complete', zeroTurns: true } }, includedRetryAvailable: false })

    const afterConsumption = expectOk(await successfulHarness.services.projects.open(project.id))
    const paidQuote = expectOk(await successfulHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: afterConsumption.revision,
      ...activePreparationExpectation(afterConsumption),
      operationId: operationId('zero-turn-retry-paid-quote'),
    }))
    expect(paidQuote).toMatchObject({ attemptClass: 'paid-reprocessing', credits: 1 })
    expect(expectOk(await successfulHarness.services.credits.snapshot())).toMatchObject({ reserved: 0, available: 119 })
  })

  it('releases a queued attempt without charge when the user confirms cancellation', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'queued-cancel@example.test')
    const { project, quote, started, initialBalance } = await startPreparation(harness, 'Queued cancel')
    const cancellation = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: started.operation.id,
      expectedRevision: started.operation.revision,
      operationId: operationId('queued-cancel-quote'),
    }))
    expect(cancellation).toMatchObject({ exactCharge: 0, releaseAmount: quote.credits, note: 'synthetic-mock-scenario' })

    const cancelOperation = operationId('queued-cancel-confirm')
    await harness.queueUnknown(cancelOperation)
    const uncertain = await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: started.operation.id,
      cancellationQuoteId: cancellation.quoteId,
      expectedRevision: started.operation.revision,
      explicitConfirmation: true,
      operationId: cancelOperation,
    })
    expect(uncertain.status).toBe('unknown')
    const reloaded = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: harness.now(),
    })
    const cancelled = expectOk(await reloaded.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: started.operation.id,
      cancellationQuoteId: cancellation.quoteId,
      expectedRevision: started.operation.revision,
      explicitConfirmation: true,
      operationId: cancelOperation,
    }))

    expect(cancelled).toMatchObject({ state: 'committed', result: { state: 'cancelled', queued: true } })
    expect(expectOk(await reloaded.services.credits.snapshot())).toMatchObject({ available: initialBalance.available, reserved: 0 })
    const ledger = expectOk(await reloaded.services.credits.history()).filter((entry) => entry.relatedOperationId === started.operation.id)
    expect(ledger.filter((entry) => entry.kind === 'processing-reservation')).toHaveLength(1)
    const settlement = ledger.filter((entry) => entry.kind === 'processing-settlement')
    expect(settlement).toHaveLength(1)
    expect(Math.abs(settlement[0].delta ?? Number.NaN)).toBe(0)
    expect(settlement[0]).toMatchObject({ availableAfter: initialBalance.available, reservedAfter: 0 })
  })

  it('rejects a stale running-cancellation quote after another stage completes', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'stale-cancel@example.test')
    const { project, quote, started, initialBalance } = await startPreparation(harness, 'Stale cancel')
    harness.advance(1_000)
    const running = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: started.operation.id }))
    const oldQuote = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: started.operation.id,
      expectedRevision: running.operation.revision,
      operationId: operationId('stale-cancel-old-quote'),
    }))
    expect(oldQuote.exactCharge).toBe(Math.ceil(quote.credits * 0.25))

    harness.advance(1_000)
    const newer = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: started.operation.id }))
    const staleAttempt = await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: started.operation.id,
      cancellationQuoteId: oldQuote.quoteId,
      expectedRevision: running.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('stale-cancel-confirm'),
    })

    expect(staleAttempt.status).toBe('conflict')
    expect(newer.operation.revision).not.toBe(running.operation.revision)
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - quote.credits, reserved: quote.credits })

    const revisedQuote = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: started.operation.id,
      expectedRevision: newer.operation.revision,
      operationId: operationId('stale-cancel-revised-quote'),
    }))
    expect(revisedQuote.exactCharge).toBeGreaterThan(oldQuote.exactCharge)
    expect(revisedQuote.releaseAmount).toBe(quote.credits - revisedQuote.exactCharge)
    expect(expectOk(await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: started.operation.id,
      cancellationQuoteId: revisedQuote.quoteId,
      expectedRevision: newer.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('stale-cancel-confirm-revised'),
    })).state).toBe('committed')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: initialBalance.available - revisedQuote.exactCharge,
      reserved: 0,
    })
  })

  it('keeps an expired cancellation quote from changing the pending operation or reservation', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'expired-cancel@example.test')
    const { project, quote, started, initialBalance } = await startPreparation(harness, 'Expired cancel')
    harness.advance(1_000)
    const running = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: started.operation.id }))
    const cancellation = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: started.operation.id,
      expectedRevision: running.operation.revision,
      operationId: operationId('expired-cancel-quote'),
    }))
    harness.advance(2 * 60 * 1_000 + 1)

    const expiredAttempt = await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: started.operation.id,
      cancellationQuoteId: cancellation.quoteId,
      expectedRevision: running.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('expired-cancel-confirm'),
    })

    expect(expiredAttempt).toMatchObject({ status: 'error', error: { code: 'expired' } })
    expect(expectOk(await harness.services.preparation.resolve({ projectId: project.id, targetOperationId: started.operation.id })).operation.state).toBe('pending')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - quote.credits, reserved: quote.credits })
  })

  it('offers one zero-credit retry after initial success and preserves it on queued cancellation', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'included-queue@example.test')
    const { project, started, initialBalance } = await startPreparation(harness, 'Included queue')
    const first = await completePreparation(harness, project.id, started.operation.id)
    expect(first).toMatchObject({ attemptClass: 'initial', includedRetryAvailable: true })

    const activeProject = expectOk(await harness.services.projects.open(project.id))
    const retryQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: activeProject.revision,
      ...activePreparationExpectation(activeProject),
      operationId: operationId('included-queue-quote'),
    }))
    expect(retryQuote).toMatchObject({ attemptClass: 'included-retry', credits: 0, note: 'synthetic-mock-scenario' })
    const retry = expectOk(await harness.services.preparation.start({
      quoteId: retryQuote.id,
      expectedProjectRevision: activeProject.revision,
      expectedSourceRevision: activeProject.sourceRevision,
      ...startAuthorization(retryQuote),
      explicitAuthorization: true,
      operationId: operationId('included-queue-start'),
    }))
    expect(retry.attemptClass).toBe('included-retry')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - 3, reserved: 0 })

    const cancellation = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: retry.operation.id,
      expectedRevision: retry.operation.revision,
      operationId: operationId('included-queue-cancel-quote'),
    }))
    expect(cancellation).toMatchObject({ attemptClass: 'included-retry', exactCharge: 0, releaseAmount: 0, includedRetryRemains: true })
    expectOk(await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: retry.operation.id,
      cancellationQuoteId: cancellation.quoteId,
      expectedRevision: retry.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('included-queue-cancel'),
    }))

    const afterCancel = expectOk(await harness.services.projects.open(project.id))
    expect(expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: afterCancel.revision,
      ...activePreparationExpectation(afterCancel),
      operationId: operationId('included-queue-requote'),
    })).attemptClass).toBe('included-retry')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - 3, reserved: 0 })
  })

  it('consumes an included retry on success without replenishing it for later paid reprocessing', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'included-success@example.test')
    const { project, started, quote, initialBalance } = await startPreparation(harness, 'Included success')
    await completePreparation(harness, project.id, started.operation.id)
    const activeProject = expectOk(await harness.services.projects.open(project.id))
    const retryQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: activeProject.revision,
      ...activePreparationExpectation(activeProject),
      operationId: operationId('included-success-quote'),
    }))
    const retry = expectOk(await harness.services.preparation.start({
      quoteId: retryQuote.id,
      expectedProjectRevision: activeProject.revision,
      expectedSourceRevision: activeProject.sourceRevision,
      ...startAuthorization(retryQuote),
      explicitAuthorization: true,
      operationId: operationId('included-success-start'),
    }))
    const completedRetry = await completePreparation(harness, project.id, retry.operation.id)

    expect(completedRetry).toMatchObject({ attemptClass: 'included-retry', includedRetryAvailable: false })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - quote.credits, reserved: 0 })
    const nextProject = expectOk(await harness.services.projects.open(project.id))
    const paidQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: nextProject.revision,
      ...activePreparationExpectation(nextProject),
      operationId: operationId('included-success-next-quote'),
    }))
    expect(paidQuote).toMatchObject({ attemptClass: 'paid-reprocessing', credits: quote.credits })
    const retryLedger = expectOk(await harness.services.credits.history()).filter((entry) => entry.relatedOperationId === retry.operation.id)
    expect(retryLedger.filter((entry) => entry.kind === 'processing-reservation')).toHaveLength(1)
    expect(retryLedger.filter((entry) => entry.kind === 'processing-settlement')).toHaveLength(1)
    expect(Math.abs(retryLedger.find((entry) => entry.kind === 'processing-settlement')?.delta ?? Number.NaN)).toBe(0)
  })

  it('consumes an included retry on authoritative running cancellation without charging it', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'included-running-cancel@example.test')
    const { project, started, quote, initialBalance } = await startPreparation(harness, 'Included running cancel')
    await completePreparation(harness, project.id, started.operation.id)
    const activeProject = expectOk(await harness.services.projects.open(project.id))
    const retryQuote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: activeProject.revision,
      ...activePreparationExpectation(activeProject),
      operationId: operationId('included-running-quote'),
    }))
    const retry = expectOk(await harness.services.preparation.start({
      quoteId: retryQuote.id,
      expectedProjectRevision: activeProject.revision,
      expectedSourceRevision: activeProject.sourceRevision,
      ...startAuthorization(retryQuote),
      explicitAuthorization: true,
      operationId: operationId('included-running-start'),
    }))
    harness.advance(1_000)
    const running = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: retry.operation.id }))
    const cancellation = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: project.id,
      targetOperationId: retry.operation.id,
      expectedRevision: running.operation.revision,
      operationId: operationId('included-running-cancel-quote'),
    }))
    expect(cancellation).toMatchObject({ attemptClass: 'included-retry', exactCharge: 0, releaseAmount: 0, includedRetryRemains: false })
    expectOk(await harness.services.preparation.cancel({
      projectId: project.id,
      targetOperationId: retry.operation.id,
      cancellationQuoteId: cancellation.quoteId,
      expectedRevision: running.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('included-running-cancel'),
    }))

    const afterCancel = expectOk(await harness.services.projects.open(project.id))
    expect(expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: afterCancel.revision,
      ...activePreparationExpectation(afterCancel),
      operationId: operationId('included-running-next-quote'),
    })).attemptClass).toBe('paid-reprocessing')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - quote.credits, reserved: 0 })
  })

  it('preserves the prior preparation and unaccepted draft on synthetic system failure', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'system-failure@example.test')
    const { project, started, initialBalance } = await startPreparation(harness, 'System failure')
    const first = await completePreparation(harness, project.id, started.operation.id)
    const draft = await saveDraft(harness, project.id, 'system-failure')
    const failureHarness = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: harness.now(),
      scenario: 'preparation-system-failure',
    })
    const currentProject = expectOk(await failureHarness.services.projects.open(project.id))
    const retryQuote = expectOk(await failureHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: currentProject.revision,
      ...activePreparationExpectation(currentProject),
      operationId: operationId('system-failure-quote'),
    }))
    const retry = expectOk(await failureHarness.services.preparation.start({
      quoteId: retryQuote.id,
      expectedProjectRevision: currentProject.revision,
      expectedSourceRevision: currentProject.sourceRevision,
      ...startAuthorization(retryQuote),
      explicitAuthorization: true,
      operationId: operationId('system-failure-start'),
    }))
    expect(retry.attemptClass).toBe('included-retry')
    const failed = await completePreparation(failureHarness, project.id, retry.operation.id)

    expect(failed.operation).toMatchObject({ state: 'rejected', result: { state: 'failed', reason: 'system-failure' } })
    expect(failed.includedRetryAvailable).toBe(true)
    expect(expectOk(await failureHarness.services.projects.open(project.id))).toMatchObject({ preparationId: first.currentPreparationId, state: 'recording' })
    const restoredDraft = expectOk(await failureHarness.services.recording.restoreDraft({ projectId: project.id, turnId: draft.turnId }))
    expect(restoredDraft).not.toBeNull()
    expect(restoredDraft!.candidate.draftId).toBe(draft.draftId)
    expect(restoredDraft!.blob.size).toBe(draft.blob.size)
    expect(expectOk(await failureHarness.services.credits.snapshot())).toMatchObject({ available: initialBalance.available - 3, reserved: 0 })
    const retryLedger = expectOk(await failureHarness.services.credits.history()).filter((entry) => entry.relatedOperationId === retry.operation.id)
    expect(retryLedger.filter((entry) => entry.kind === 'reservation-release')).toHaveLength(1)
    expect(retryLedger.filter((entry) => entry.kind === 'processing-settlement')).toHaveLength(0)
    expect(expectOk(await failureHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: expectOk(await failureHarness.services.projects.open(project.id)).revision,
      ...activePreparationExpectation(expectOk(await failureHarness.services.projects.open(project.id))),
      operationId: operationId('system-failure-retry-again'),
    })).attemptClass).toBe('included-retry')
  })

  it('preserves the prior usable preparation and unaccepted draft on a zero-turn included replacement', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'zero-turn-replacement@example.test')
    const { project, started } = await startPreparation(harness, 'Zero turn replacement')
    const first = await completePreparation(harness, project.id, started.operation.id)
    const draft = await saveDraft(harness, project.id, 'zero-turn-replacement')
    const zeroTurnHarness = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: harness.now(),
      scenario: 'preparation-zero-turn-replacement',
    })
    const currentProject = expectOk(await zeroTurnHarness.services.projects.open(project.id))
    const retryQuote = expectOk(await zeroTurnHarness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: currentProject.revision,
      ...activePreparationExpectation(currentProject),
      operationId: operationId('zero-turn-replacement-quote'),
    }))
    const retry = expectOk(await zeroTurnHarness.services.preparation.start({
      quoteId: retryQuote.id,
      expectedProjectRevision: currentProject.revision,
      expectedSourceRevision: currentProject.sourceRevision,
      ...startAuthorization(retryQuote),
      explicitAuthorization: true,
      operationId: operationId('zero-turn-replacement-start'),
    }))
    const replaced = await completePreparation(zeroTurnHarness, project.id, retry.operation.id)

    expect(replaced.operation).toMatchObject({ state: 'committed', result: { state: 'complete', zeroTurns: true } })
    expect(replaced).toMatchObject({ attemptClass: 'included-retry', includedRetryAvailable: false })
    expect(expectOk(await zeroTurnHarness.services.projects.open(project.id))).toMatchObject({ preparationId: first.currentPreparationId, state: 'recording' })
    const recording = expectOk(await zeroTurnHarness.services.recording.loadContext(project.id))
    expect(recording.turns.length).toBeGreaterThan(0)
    expect(recording.turns[0].processingRevision).toBe(first.currentPreparationRevision)
    const restoredDraft = expectOk(await zeroTurnHarness.services.recording.restoreDraft({ projectId: project.id, turnId: draft.turnId }))
    expect(restoredDraft).not.toBeNull()
    expect(restoredDraft!.candidate.draftId).toBe(draft.draftId)
    expect(restoredDraft!.blob.size).toBe(draft.blob.size)
  })
})
