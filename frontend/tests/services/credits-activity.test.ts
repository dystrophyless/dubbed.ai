import { describe, expect, it } from 'vitest'
import { asRevision } from '../../src/services/contracts'
import type { AccountId, CreditHistoryCursor, LedgerEntry } from '../../src/services/contracts'
import { IDBFactory } from 'fake-indexeddb'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { writeRecord } from '../../src/services/mock-store'

async function createAccount(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId(`register-${email}`)
  const start = await harness.services.registration.start({ email, password: 'correct-horse', operationId: requestId })
  expect(start.status).toBe('ok')
  await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId(`verify-${email}`),
  })
  const current = expectOk(await harness.services.identity.current())
  if (!current) throw new Error('Registration did not create the expected signed-in account.')
  return current.account.id
}

async function seedLedger(harness: ReturnType<typeof createServiceTestHarness>, entries: LedgerEntry[]) {
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  try {
    await runTransaction(database, ['ledger'], 'readwrite', async (transaction) => {
      for (const entry of entries) await writeRecord(transaction, 'ledger', entry)
    })
  } finally {
    database.close()
  }
}

function ledgerEntry(accountId: AccountId, revision: number, kind: LedgerEntry['kind'] = 'credit-return'): LedgerEntry {
  const pending = kind === 'pending-purchase'
  return {
    id: operationId(`history-entry-${revision}`),
    accountId,
    revision: asRevision(revision),
    kind,
    occurredAt: 1_800_000_000_000 + revision,
    delta: pending ? null : revision,
    availableAfter: pending ? null : 120 + revision,
    reservedAfter: 0,
    note: 'synthetic-mock-scenario',
  }
}

async function upload(harness: ReturnType<typeof createServiceTestHarness>, title: string) {
  return expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes(`${title}.mp4`, [1, 2, 3]),
    title,
    facts: sourceFacts(),
    operationId: operationId(`upload-${title}`),
  }))
}

describe('credit ledger and recent-project activity', () => {
  it('pages the newest 20 first and keeps an opaque older-page anchor stable when newer rows arrive', async () => {
    const harness = createServiceTestHarness()
    const accountId = await createAccount(harness, 'history-pages@example.test')
    const seeded = Array.from({ length: 45 }, (_, index) => {
      const revision = index + 10
      return ledgerEntry(accountId, revision, revision === 54 ? 'pending-purchase' : 'credit-return')
    })
    await seedLedger(harness, seeded)

    const first = expectOk(await harness.services.credits.historyPage({}))
    expect(first.entries).toHaveLength(20)
    expect(first.entries[0]).toMatchObject({ revision: asRevision(54), kind: 'pending-purchase', delta: null, availableAfter: null })
    expect(first.entries.at(-1)?.revision).toBe(asRevision(35))
    expect(first.nextCursor).toBeTruthy()

    const appended = ledgerEntry(accountId, 55)
    await seedLedger(harness, [appended])
    const second = expectOk(await harness.services.credits.historyPage({ cursor: first.nextCursor! }))
    expect(second.entries).toHaveLength(20)
    expect(second.entries[0]?.revision).toBe(asRevision(34))
    expect(second.entries.at(-1)?.revision).toBe(asRevision(15))
    expect(second.nextCursor).toBeTruthy()
    expect(second.entries.some((entry) => first.entries.some((loaded) => loaded.id === entry.id))).toBe(false)

    const third = expectOk(await harness.services.credits.historyPage({ cursor: second.nextCursor! }))
    expect(third.entries).toHaveLength(6)
    expect(third.nextCursor).toBeNull()
    const loadedOriginalRows = [...first.entries, ...second.entries, ...third.entries]
    expect(new Set(loadedOriginalRows.map((entry) => entry.id)).size).toBe(46)
    expect(seeded.every((entry) => loadedOriginalRows.some((loaded) => loaded.id === entry.id))).toBe(true)
    expect((await harness.services.credits.history()).status).toBe('ok')
    expect(expectOk(await harness.services.credits.history())).toHaveLength(47)
  })

  it('rejects malformed and other-account history cursors without exposing their rows', async () => {
    const factory = new IDBFactory()
    const namespace = `history-cursor-${crypto.randomUUID()}`
    const clientA = createServiceTestHarness({ factory, namespace, clientId: 'history-client-a' })
    const clientB = createServiceTestHarness({ factory, namespace, clientId: 'history-client-b' })
    const accountA = await createAccount(clientA, 'history-a@example.test')
    const accountB = await createAccount(clientB, 'history-b@example.test')
    await seedLedger(clientA, Array.from({ length: 20 }, (_, index) => ledgerEntry(accountA, index + 2)))

    const foreignCursor = expectOk(await clientA.services.credits.historyPage({})).nextCursor
    expect(foreignCursor).toBeTruthy()
    const foreign = await clientB.services.credits.historyPage({ cursor: foreignCursor! })
    expect(foreign.status).toBe('error')
    if (foreign.status === 'error') expect(foreign.error.code).toBe('validation')

    const invalid = await clientA.services.credits.historyPage({ cursor: 'not-a-credit-history-cursor' as CreditHistoryCursor })
    expect(invalid.status).toBe('error')
    if (invalid.status === 'error') expect(invalid.error.code).toBe('validation')
    expect(expectOk(await clientB.services.credits.historyPage({})).entries.map((entry) => entry.accountId)).toEqual([accountB])
  })

  it('uses shared 1 ms selection revisions, ceilings once, and settles only the authorized reservation', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'quote@example.test')
    const { project } = await upload(harness, 'Quote project')
    const selected = expectOk(await harness.services.preparation.updateSelection({
      projectId: project.id,
      startMs: 100,
      endMs: 1_101,
      expectedProjectRevision: project.revision,
      expectedSourceRevision: project.sourceRevision,
      operationId: operationId('select-100-to-1101'),
    }))
    expect(selected.selection).toEqual({ startMs: 100, endMs: 1_101, revision: asRevision(1) })

    const quote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: selected.revision,
      expectedActivePreparationRevision: selected.preparationRevision,
      operationId: operationId('quote-1001ms'),
    }))
    expect(quote).toMatchObject({
      durationMs: 1_001,
      credits: 2,
      sourceRevision: project.sourceRevision,
      selectionRevision: selected.selection.revision,
    })

    const startId = operationId('prepare-unknown')
    await harness.queueUnknown(startId)
    const started = await harness.services.preparation.start({
      quoteId: quote.id,
      expectedProjectRevision: selected.revision,
      expectedSourceRevision: project.sourceRevision,
      expectedActivePreparationId: quote.activePreparationId,
      expectedActivePreparationRevision: quote.activePreparationRevision,
      acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: false,
      draftLossAcknowledged: false,
      explicitAuthorization: true,
      operationId: startId,
    })
    expect(started.status).toBe('unknown')
    const reconciled = expectOk(await harness.services.preparation.resolve({ projectId: project.id, targetOperationId: startId }))
    expect(reconciled.operation.state).toBe('pending')
    expect(reconciled.reservationId).toBeTruthy()
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 118, reserved: 2 })

    const prematureSettlement = await harness.services.credits.settle({
      reservationId: reconciled.reservationId!,
      authoritativeOperationId: startId,
      outcome: 'successful-completion',
      operationId: operationId('forged-early-settlement'),
    })
    expect(prematureSettlement.status).toBe('error')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 118, reserved: 2 })

    let observed = reconciled
    for (let index = 0; index < 3; index += 1) {
      harness.advance(1_000)
      observed = expectOk(await harness.services.preparation.observe({ projectId: project.id, targetOperationId: startId }))
    }
    expect(observed.operation.state).toBe('committed')
    expect(observed.currentPreparationId).toBeUndefined()
    expect((observed.operation.result as { preparationId?: string }).preparationId).toBeTruthy()
    const completedProject = expectOk(await harness.services.projects.open(project.id))
    expect(completedProject.state).toBe('preparing')
    expect(completedProject.preparationId).toBeUndefined()
    expectOk(await harness.services.preparation.activate({
      projectId: project.id,
      targetOperationId: startId,
      expectedRevision: completedProject.revision,
      expectedActivePreparationId: completedProject.preparationId,
      expectedActivePreparationRevision: completedProject.preparationRevision,
      operationId: operationId('activate-1001ms'),
    }))
    expect(expectOk(await harness.services.projects.open(project.id))).toMatchObject({ state: 'recording', preparationId: observed.operation.result && (observed.operation.result as { preparationId?: string }).preparationId })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 118, reserved: 0 })

    const ledger = expectOk(await harness.services.credits.history())
    expect(ledger.filter((entry) => entry.kind === 'processing-reservation')).toHaveLength(1)
    expect(ledger.filter((entry) => entry.kind === 'processing-settlement')).toMatchObject([
      { delta: -2, availableAfter: 118, reservedAfter: 0, relatedOperationId: startId },
    ])
    const ignoredClientCharge = await harness.services.credits.settle({
      reservationId: reconciled.reservationId!,
      authoritativeOperationId: startId,
      outcome: 'successful-completion',
      operationId: operationId('settle-after-complete'),
      finalCharge: 0,
    } as Parameters<typeof harness.services.credits.settle>[0] & { finalCharge: number })
    expect(expectOk(ignoredClientCharge)).toMatchObject({ available: 118, reserved: 0 })
  })

  it('completes due background work on a later project-list reload exactly once', async () => {
    const harness = createServiceTestHarness()
    await createAccount(harness, 'background@example.test')
    const { project } = await upload(harness, 'Background project')
    const quote = expectOk(await harness.services.preparation.quote({
      projectId: project.id,
      expectedProjectRevision: project.revision,
      expectedActivePreparationRevision: project.preparationRevision,
      operationId: operationId('background-quote'),
    }))
    const started = expectOk(await harness.services.preparation.start({
      quoteId: quote.id,
      expectedProjectRevision: project.revision,
      expectedSourceRevision: project.sourceRevision,
      expectedActivePreparationId: quote.activePreparationId,
      expectedActivePreparationRevision: quote.activePreparationRevision,
      acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: false,
      draftLossAcknowledged: false,
      explicitAuthorization: true,
      operationId: operationId('background-start'),
    }))

    const before = expectOk(await harness.services.projects.list()).projects.find((item) => item.id === project.id)!
    expect(before.state).toBe('preparing')
    const activityBefore = before.lastActivityAt
    expect(expectOk(await harness.services.preparation.resolve({ projectId: project.id, targetOperationId: started.operation.id })).operation.state).toBe('pending')
    expect(expectOk(await harness.services.projects.open(project.id)).lastActivityAt).toBe(activityBefore)

    harness.advance(3_000)
    const reloaded = createServiceTestHarness({
      factory: harness.factory,
      namespace: harness.namespace,
      clientId: harness.clientId,
      startTime: harness.now(),
    })
    const completed = expectOk(await reloaded.services.projects.list()).projects.find((item) => item.id === project.id)!
    expect(completed.state).toBe('preparing')
    expect(completed.lastActivityAt).toBeGreaterThan(activityBefore)
    const completedStatus = expectOk(await reloaded.services.preparation.resolve({ projectId: project.id, targetOperationId: started.operation.id }))
    expect(completedStatus.operation.state).toBe('committed')
    const completedProject = expectOk(await reloaded.services.projects.open(project.id))
    expectOk(await reloaded.services.preparation.activate({
      projectId: project.id,
      targetOperationId: started.operation.id,
      expectedRevision: completedProject.revision,
      expectedActivePreparationId: completedProject.preparationId,
      expectedActivePreparationRevision: completedProject.preparationRevision,
      operationId: operationId('background-activate'),
    }))
    expect(expectOk(await reloaded.services.projects.open(project.id)).state).toBe('recording')
    const terminalActivityAt = expectOk(await reloaded.services.projects.open(project.id)).lastActivityAt
    expect(expectOk(await reloaded.services.projects.list()).projects.find((item) => item.id === project.id)?.lastActivityAt).toBe(terminalActivityAt)
    expect(expectOk(await reloaded.services.preparation.resolve({ projectId: project.id, targetOperationId: started.operation.id })).operation.state).toBe('committed')
    expect(expectOk(await reloaded.services.credits.snapshot())).toMatchObject({ reserved: 0 })
  })

  it('orders activities across projects under a frozen clock and ignores observer or duplicate replays', async () => {
    const harness = createServiceTestHarness({ startTime: 10_000 })
    await createAccount(harness, 'activity@example.test')
    const projectA = await upload(harness, 'A')
    const projectB = await upload(harness, 'B')

    const eventA1 = operationId('open-a-1')
    const eventA2 = operationId('open-a-2')
    await harness.services.projects.recordOpened({ projectId: projectA.project.id, operationId: eventA1 })
    await harness.services.projects.recordOpened({ projectId: projectA.project.id, operationId: eventA2 })
    await harness.services.projects.recordOpened({ projectId: projectB.project.id, operationId: operationId('open-b-1') })

    const beforeReplay = expectOk(await harness.services.projects.list()).projects.map((project) => project.id)
    expect(beforeReplay[0]).toBe(projectB.project.id)
    const duplicate = await harness.services.projects.recordOpened({ projectId: projectA.project.id, operationId: eventA2 })
    expect(duplicate.status).toBe('ok')
    const afterObserver = expectOk(await harness.services.projects.list()).projects.map((project) => project.id)
    expect(afterObserver).toEqual(beforeReplay)
  })

  it('isolates account sessions across clients and resets only the selected namespace', async () => {
    const factory = new IDBFactory()
    const namespace = `shared-${crypto.randomUUID()}`
    const clientA = createServiceTestHarness({ factory, namespace, clientId: 'tab-a' })
    const clientB = createServiceTestHarness({ factory, namespace, clientId: 'tab-b' })
    await createAccount(clientA, 'alice@example.test')
    const projectA = await upload(clientA, 'Alice')
    await createAccount(clientB, 'bob@example.test')
    const projectB = await upload(clientB, 'Bob')

    expect(expectOk(await clientA.services.identity.current())?.account.email).toBe('alice@example.test')
    expect(expectOk(await clientB.services.identity.current())?.account.email).toBe('bob@example.test')
    expect(expectOk(await clientB.services.projects.list()).projects.map((project) => project.id)).toEqual([projectB.project.id])
    expect((await clientB.services.projects.open(projectA.project.id)).status).toBe('error')

    const workspaceA = createServiceTestHarness({ factory, namespace: `reset-a-${crypto.randomUUID()}`, clientId: 'tab-reset-a' })
    const workspaceB = createServiceTestHarness({ factory, namespace: `reset-b-${crypto.randomUUID()}`, clientId: 'tab-reset-b' })
    await createAccount(workspaceA, 'reset-a@example.test')
    await createAccount(workspaceB, 'reset-b@example.test')
    const retained = await upload(workspaceB, 'Retained')
    expect(expectOk(await workspaceA.services.workspace.reset()).reset).toBe(true)
    expect(expectOk(await workspaceA.services.identity.current())).toBeNull()
    expect(expectOk(await workspaceB.services.projects.open(retained.project.id)).title).toBe('Retained')
  })
})
