import { describe, expect, it } from 'vitest'
import { IDBKeyRange } from 'fake-indexeddb'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import {
  readRecord,
  recordsByIndex,
  type StoredPreparation,
  type StoredReservation,
  type StoredSource,
  type StoredTurn,
} from '../../src/services/mock-store'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function createPendingPreparation(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const registrationId = operationId(`register-${email}`)
  expectOk(await harness.services.registration.start({ email, password: 'correct-horse', operationId: registrationId }))
  expectOk(await harness.services.registration.verify({
    requestId: registrationId,
    code: harness.verificationCode(registrationId),
    operationId: operationId(`verify-${email}`),
  }))

  const uploaded = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes('private-source.mp4', [1, 2, 3, 4]),
    facts: sourceFacts(8_625),
    operationId: operationId(`upload-${email}`),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: uploaded.project.id,
    expectedProjectRevision: uploaded.project.revision,
    expectedActivePreparationRevision: uploaded.project.preparationRevision,
    operationId: operationId(`quote-${email}`),
  }))
  const preparationOperationId = operationId(`prepare-${email}`)
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
    operationId: preparationOperationId,
  }))
  const current = expectOk(await harness.services.projects.open(uploaded.project.id))

  return {
    projectId: uploaded.project.id,
    projectRevision: current.revision,
    preparationOperationId,
    reservationId: started.reservationId,
    deleteOperationId: operationId(`delete-${email}`),
    quoteCredits: quote.credits,
  }
}

async function inspectDeletedProjectStorage(
  harness: ReturnType<typeof createServiceTestHarness>,
  projectId: string,
  reservationId: string,
) {
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  try {
    return await runTransaction(database, ['sources', 'preparations', 'turns', 'drafts', 'takes', 'results', 'reservations'], 'readonly', async (transaction) => ({
      sources: await recordsByIndex<StoredSource>(transaction, 'sources', 'projectId', projectId),
      preparations: await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'projectId', projectId),
      turns: await recordsByIndex<StoredTurn>(transaction, 'turns', 'projectId', projectId),
      drafts: await recordsByIndex<{ id: string }>(transaction, 'drafts', 'projectIdTurnId', IDBKeyRange.bound([projectId, ''], [projectId, '\uffff'])),
      takes: await recordsByIndex<{ id: string }>(transaction, 'takes', 'projectIdTurnId', IDBKeyRange.bound([projectId, ''], [projectId, '\uffff'])),
      results: await recordsByIndex<{ id: string }>(transaction, 'results', 'projectId', projectId),
      reservation: await readRecord<StoredReservation>(transaction, 'reservations', reservationId),
    }))
  } finally {
    database.close()
  }
}

describe('active project deletion accounting', () => {
  it('settles a successful accepted job once without restoring the deleted project', async () => {
    const harness = createServiceTestHarness()
    const work = await createPendingPreparation(harness, `delete-success-${crypto.randomUUID()}@example.test`)
    expect(work.quoteCredits).toBe(9)
    const before = expectOk(await harness.services.credits.snapshot())

    const deletionInput = {
      projectId: work.projectId,
      expectedRevision: work.projectRevision,
      operationId: work.deleteOperationId,
    }
    expectOk(await harness.services.projects.delete(deletionInput))
    expect(expectOk(await harness.services.credits.snapshot()).reserved).toBe(before.reserved)

    const pendingStorage = await inspectDeletedProjectStorage(harness, work.projectId, work.reservationId)
    expect(pendingStorage.sources).toHaveLength(0)
    expect(pendingStorage.turns).toHaveLength(0)
    expect(pendingStorage.drafts).toHaveLength(0)
    expect(pendingStorage.takes).toHaveLength(0)
    expect(pendingStorage.results).toHaveLength(0)
    expect(pendingStorage.preparations).toHaveLength(1)
    expect(pendingStorage.preparations[0]).toMatchObject({ projectDeleted: true, turns: [], authorizedDraftIdsToDelete: [] })
    expect(pendingStorage.preparations[0]).not.toHaveProperty('priorUsablePreparationId')
    expect(pendingStorage.reservation?.state).toBe('reserved')

    harness.advance(10_000)
    const list = expectOk(await harness.services.projects.list())
    expect(list.projects).toHaveLength(0)
    expect(list.capacity.used).toBe(0)

    const operation = expectOk(await harness.services.operations.resolve(work.preparationOperationId))
    if (operation.state === 'not-started') throw new Error('Preparation operation was not recorded.')
    expect(operation.state).toBe('committed')
    expect(operation.result).toMatchObject({ state: 'complete', deletedProject: true })
    expect((await harness.services.projects.open(work.projectId)).status).toBe('error')
    expect((await harness.services.preparation.resolve({
      projectId: work.projectId,
      targetOperationId: work.preparationOperationId,
    })).status).toBe('error')

    const after = expectOk(await harness.services.credits.snapshot())
    expect(after.available).toBe(before.available + before.reserved - work.quoteCredits)
    expect(after.reserved).toBe(0)
    const history = expectOk(await harness.services.credits.history())
      .filter((entry) => entry.relatedOperationId === work.preparationOperationId)
    expect(history.map((entry) => entry.kind)).toEqual(['processing-reservation', 'processing-settlement'])
    expect(history[1]).toMatchObject({ delta: -work.quoteCredits, reservedAfter: 0 })

    const replay = await harness.services.projects.delete(deletionInput)
    if (replay.status !== 'ok') throw new Error(`Deletion replay failed: ${JSON.stringify(replay)}`)
    expect(replay.replayed).toBe(true)
    expect(expectOk(await harness.services.projects.list()).capacity.used).toBe(0)
    expect(expectOk(await harness.services.credits.history()).filter((entry) => entry.relatedOperationId === work.preparationOperationId))
      .toHaveLength(2)
    const terminalStorage = await inspectDeletedProjectStorage(harness, work.projectId, work.reservationId)
    expect(terminalStorage.sources).toHaveLength(0)
    expect(terminalStorage.turns).toHaveLength(0)
    expect(terminalStorage.drafts).toHaveLength(0)
    expect(terminalStorage.takes).toHaveLength(0)
    expect(terminalStorage.results).toHaveLength(0)
    expect(terminalStorage.preparations).toHaveLength(0)
    expect(terminalStorage.reservation?.state).toBe('settled')
  })

  it('releases the reservation once when an accepted job fails after deletion', async () => {
    const harness = createServiceTestHarness({ scenario: 'preparation-system-failure' })
    const work = await createPendingPreparation(harness, `delete-failure-${crypto.randomUUID()}@example.test`)
    const before = expectOk(await harness.services.credits.snapshot())
    const deletionInput = {
      projectId: work.projectId,
      expectedRevision: work.projectRevision,
      operationId: work.deleteOperationId,
    }
    expectOk(await harness.services.projects.delete(deletionInput))

    harness.advance(10_000)
    expect(expectOk(await harness.services.projects.list()).projects).toHaveLength(0)
    const operation = expectOk(await harness.services.operations.resolve(work.preparationOperationId))
    if (operation.state === 'not-started') throw new Error('Preparation operation was not recorded.')
    expect(operation.state).toBe('rejected')
    expect(operation.result).toMatchObject({ state: 'failed', reason: 'system-failure' })

    const after = expectOk(await harness.services.credits.snapshot())
    expect(after.available).toBe(before.available + before.reserved)
    expect(after.reserved).toBe(0)
    const history = expectOk(await harness.services.credits.history())
      .filter((entry) => entry.relatedOperationId === work.preparationOperationId)
    expect(history.map((entry) => entry.kind)).toEqual(['processing-reservation', 'reservation-release'])
    expect((await harness.services.projects.open(work.projectId)).status).toBe('error')

    expect(expectOk(await harness.services.projects.list()).projects).toHaveLength(0)
    expect(expectOk(await harness.services.credits.history()).filter((entry) => entry.relatedOperationId === work.preparationOperationId))
      .toHaveLength(2)
    const terminalStorage = await inspectDeletedProjectStorage(harness, work.projectId, work.reservationId)
    expect(terminalStorage.sources).toHaveLength(0)
    expect(terminalStorage.turns).toHaveLength(0)
    expect(terminalStorage.drafts).toHaveLength(0)
    expect(terminalStorage.takes).toHaveLength(0)
    expect(terminalStorage.results).toHaveLength(0)
    expect(terminalStorage.preparations).toHaveLength(0)
    expect(terminalStorage.reservation?.state).toBe('released')
  })
})
