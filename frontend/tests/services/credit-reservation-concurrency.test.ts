import { describe, expect, it } from 'vitest'
import type { OwnedProject, ProcessingQuote } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { recordsByIndex, type StoredReservation } from '../../src/services/mock-store'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function createAccount(harness: ReturnType<typeof createServiceTestHarness>) {
  const email = 'credit-race-' + crypto.randomUUID() + '@example.test'
  const requestId = operationId('register-' + email)
  expectOk(await harness.services.registration.start({ email, password: 'correct-horse', operationId: requestId }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId('verify-' + email),
  }))
}

async function createQuotedProject(harness: ReturnType<typeof createServiceTestHarness>, title: string) {
  const { project } = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes(title + '.mp4', [5, 6, 7]),
    title,
    facts: sourceFacts(80_000),
    operationId: operationId('upload-' + title),
  }))
  const selected = expectOk(await harness.services.preparation.updateSelection({
    projectId: project.id,
    startMs: 0,
    endMs: 70_000,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    operationId: operationId('select-' + title),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: selected.id,
    expectedProjectRevision: selected.revision,
    expectedActivePreparationId: selected.preparationId,
    expectedActivePreparationRevision: selected.preparationRevision,
    operationId: operationId('quote-' + title),
  }))
  return { project: selected, quote }
}

function startInput(project: OwnedProject, quote: ProcessingQuote, id: string) {
  return {
    quoteId: quote.id,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    expectedActivePreparationId: quote.activePreparationId,
    expectedActivePreparationRevision: quote.activePreparationRevision,
    acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
    replacementAcknowledged: false,
    draftLossAcknowledged: false,
    explicitAuthorization: true as const,
    operationId: operationId(id),
  }
}

async function reservationsForAccount(harness: ReturnType<typeof createServiceTestHarness>, accountId: string) {
  const database = await openWorkspaceDatabase(harness.factory, 'dubbed.mock.v1.' + harness.namespace)
  try {
    return await runTransaction(database, ['reservations'], 'readonly', async (transaction) =>
      recordsByIndex<StoredReservation>(transaction, 'reservations', 'accountId', accountId))
  } finally {
    database.close()
  }
}

describe('concurrent shared-credit reservations', () => {
  it('lets only one stale same-revision quote reserve a limited shared account balance and replays IDs safely', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness)
    const [left, right] = await Promise.all([
      createQuotedProject(harness, 'race-left-' + crypto.randomUUID()),
      createQuotedProject(harness, 'race-right-' + crypto.randomUUID()),
    ])
    const before = expectOk(await harness.services.credits.snapshot())
    expect(before.available).toBe(120)
    expect(left.quote).toMatchObject({ credits: 70, available: 120, creditRevision: before.revision })
    expect(right.quote).toMatchObject({ credits: 70, available: 120, creditRevision: before.revision })
    expect(left.quote.creditRevision).toBe(right.quote.creditRevision)

    const leftStart = startInput(left.project, left.quote, 'race-left-start-' + crypto.randomUUID())
    const rightStart = startInput(right.project, right.quote, 'race-right-start-' + crypto.randomUUID())
    const [leftResult, rightResult] = await Promise.all([
      harness.services.preparation.start(leftStart),
      harness.services.preparation.start(rightStart),
    ])

    const attempts = [
      { project: left.project, quote: left.quote, input: leftStart, result: leftResult },
      { project: right.project, quote: right.quote, input: rightStart, result: rightResult },
    ]
    const winners = attempts.filter((attempt) => attempt.result.status === 'ok')
    const losers = attempts.filter((attempt) => attempt.result.status !== 'ok')
    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)
    expect(losers[0].result).toMatchObject({ status: 'conflict' })

    const winner = winners[0]
    const loser = losers[0]
    const winnerResult = winner.result
    if (winnerResult.status !== 'ok') throw new Error('Concurrent winner was not successful.')
    const replay = await harness.services.preparation.start(winner.input)
    expect(replay).toMatchObject({ status: 'ok', replayed: true, data: { reservationId: winnerResult.data.reservationId } })
    const loserReplay = await harness.services.preparation.start(loser.input)
    expect(loserReplay).toMatchObject({ status: 'conflict' })

    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: before.available - 70,
      reserved: before.reserved + 70,
    })
    const history = expectOk(await harness.services.credits.history())
    const reservations = history.filter((entry) => entry.kind === 'processing-reservation')
    expect(reservations).toHaveLength(1)
    expect(reservations[0]).toMatchObject({ delta: null, reservedAfter: 70, relatedOperationId: winner.input.operationId })

    const storedReservations = await reservationsForAccount(harness, winner.project.accountId)
    expect(storedReservations).toHaveLength(1)
    expect(storedReservations[0]).toMatchObject({ operationId: winner.input.operationId, state: 'reserved', allocation: 70 })

    expect(expectOk(await harness.services.operations.resolve(winner.input.operationId))).toMatchObject({ state: 'pending' })
    expect(expectOk(await harness.services.operations.resolve(loser.input.operationId)))
      .toMatchObject({ state: 'not-started', safeToRetrySameId: true })
  })
})
