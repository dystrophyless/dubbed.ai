import { describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import type { OperationId, OwnedProject, ProcessingQuote } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import {
  readRecord,
  recordsByIndex,
  type StoredPreparation,
  type StoredReservation,
  type StoredSource,
} from '../../src/services/mock-store'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

function createOneShotPreparationQuotaFactory(inner: IDBFactory) {
  const quotaError = new DOMException('Injected mock quota exhaustion.', 'QuotaExceededError')
  let armed = false
  let injected = false

  const wrapObjectStore = (store: IDBObjectStore, transaction: IDBTransaction, name: string, mode: IDBTransactionMode) =>
    new Proxy(store, {
      get(target, property) {
        if (property === 'put') {
          return (...args: unknown[]) => {
            const request = Reflect.apply(target.put, target, args) as IDBRequest<IDBValidKey>
            if (!armed || injected || mode !== 'readwrite' || name !== 'preparations') return request

            return new Proxy(request, {
              get(requestTarget, requestProperty) {
                if (requestProperty === 'error' && injected) return quotaError
                const value = Reflect.get(requestTarget, requestProperty, requestTarget) as unknown
                return typeof value === 'function' ? value.bind(requestTarget) : value
              },
              set(requestTarget, requestProperty, value) {
                const saved = Reflect.set(requestTarget, requestProperty, value, requestTarget)
                if (requestProperty === 'onerror' && typeof value === 'function' && !injected) {
                  injected = true
                  armed = false
                  transaction.abort()
                }
                return saved
              },
            }) as IDBRequest<IDBValidKey>
          }
        }
        const value = Reflect.get(target, property, target) as unknown
        return typeof value === 'function' ? value.bind(target) : value
      },
      set(target, property, value) {
        return Reflect.set(target, property, value, target)
      },
    }) as IDBObjectStore

  const wrapDatabase = (database: IDBDatabase): IDBDatabase => new Proxy(database, {
    get(target, property) {
      if (property === 'transaction') {
        return (stores: string | string[], mode?: IDBTransactionMode, options?: IDBTransactionOptions) => {
          const transaction = Reflect.apply(target.transaction, target, [stores, mode, options]) as IDBTransaction
          return new Proxy(transaction, {
            get(transactionTarget, transactionProperty) {
              if (transactionProperty === 'error' && injected) return quotaError
              if (transactionProperty === 'objectStore') {
                return (name: string) => wrapObjectStore(transactionTarget.objectStore(name), transactionTarget, name, mode ?? 'readonly')
              }
              const value = Reflect.get(transactionTarget, transactionProperty, transactionTarget) as unknown
              return typeof value === 'function' ? value.bind(transactionTarget) : value
            },
            set(transactionTarget, transactionProperty, value) {
              return Reflect.set(transactionTarget, transactionProperty, value, transactionTarget)
            },
          }) as IDBTransaction
        }
      }
      const value = Reflect.get(target, property, target) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target)
    },
  })

  const wrapOpenRequest = (request: IDBOpenDBRequest): IDBOpenDBRequest => new Proxy(request, {
    get(target, property) {
      if (property === 'result') return wrapDatabase(target.result)
      const value = Reflect.get(target, property, target) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
    set(target, property, value) {
      return Reflect.set(target, property, value, target)
    },
  })

  const factory = new Proxy(inner, {
    get(target, property) {
      if (property === 'open') {
        return (...args: unknown[]) => wrapOpenRequest(Reflect.apply(target.open, target, args) as IDBOpenDBRequest)
      }
      const value = Reflect.get(target, property, target) as unknown
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as IDBFactory

  return {
    factory,
    arm: () => { armed = true },
    wasInjected: () => injected,
  }
}

async function createAccount(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId('register-' + email)
  expectOk(await harness.services.registration.start({ email, password: 'correct-horse', operationId: requestId }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId('verify-' + email),
  }))
}

async function createSelectedProject(
  harness: ReturnType<typeof createServiceTestHarness>,
  label: string,
  durationMs = 3_000,
  sourceDurationMs = 8_625,
) {
  const { project } = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes(label + '.mp4', [1, 2, 3, 4]),
    title: label,
    facts: sourceFacts(sourceDurationMs),
    operationId: operationId('upload-' + label),
  }))
  const selected = expectOk(await harness.services.preparation.updateSelection({
    projectId: project.id,
    startMs: 0,
    endMs: durationMs,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    operationId: operationId('select-' + label),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: selected.id,
    expectedProjectRevision: selected.revision,
    expectedActivePreparationId: selected.preparationId,
    expectedActivePreparationRevision: selected.preparationRevision,
    operationId: operationId('quote-' + label),
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

async function inspectAttempt(harness: ReturnType<typeof createServiceTestHarness>, project: OwnedProject, attemptId: OperationId) {
  const database = await openWorkspaceDatabase(harness.factory, 'dubbed.mock.v1.' + harness.namespace)
  try {
    return await runTransaction(database, ['projects', 'sources', 'preparations', 'reservations', 'operations'], 'readonly', async (transaction) => ({
      project: await readRecord<OwnedProject>(transaction, 'projects', project.id),
      source: await readRecord<StoredSource>(transaction, 'sources', project.sourceId),
      preparations: await recordsByIndex<StoredPreparation>(transaction, 'preparations', 'operationId', attemptId),
      reservations: await recordsByIndex<StoredReservation>(transaction, 'reservations', 'operationId', attemptId),
      operation: await readRecord<{ id: OperationId }>(transaction, 'operations', attemptId),
    }))
  } finally {
    database.close()
  }
}

describe('workspace write failures through public services', () => {
  it('rolls back earlier reservation writes on a quota error and permits same-ID retry after reconciliation', async () => {
    const injection = createOneShotPreparationQuotaFactory(new IDBFactory())
    const harness = createServiceTestHarness({ factory: injection.factory })
    const email = 'quota-' + crypto.randomUUID() + '@example.test'
    await createAccount(harness, email)
    const { project, quote } = await createSelectedProject(harness, 'quota-project-' + crypto.randomUUID())
    const start = startInput(project, quote, 'quota-start-' + crypto.randomUUID())
    const priorProject = expectOk(await harness.services.projects.open(project.id))
    const priorCredits = expectOk(await harness.services.credits.snapshot())
    const priorHistory = expectOk(await harness.services.credits.history())

    injection.arm()
    const failed = await harness.services.preparation.start(start)
    expect(injection.wasInjected()).toBe(true)
    expect(failed).toMatchObject({ status: 'error', error: { code: 'quota', retry: 'reconcile-first' } })

    const reconciled = expectOk(await harness.services.operations.resolve(start.operationId))
    expect(reconciled).toMatchObject({ state: 'not-started', safeToRetrySameId: true })
    expect(expectOk(await harness.services.projects.open(project.id))).toEqual(priorProject)
    expect(expectOk(await harness.services.credits.snapshot())).toEqual(priorCredits)
    expect(expectOk(await harness.services.credits.history())).toEqual(priorHistory)

    const stored = await inspectAttempt(harness, project, start.operationId)
    expect(stored.project).toEqual(priorProject)
    expect(stored.source).toMatchObject({ id: project.sourceId, projectId: project.id, accountId: project.accountId })
    expect(stored.source?.blob.size).toBeGreaterThan(0)
    expect(stored.preparations).toHaveLength(0)
    expect(stored.reservations).toHaveLength(0)
    expect(stored.operation).toBeUndefined()

    const retried = expectOk(await harness.services.preparation.start(start))
    expect(retried.reservationId).toBeTruthy()
    expect(expectOk(await harness.services.operations.resolve(start.operationId))).toMatchObject({ state: 'pending' })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({
      available: priorCredits.available - quote.credits,
      reserved: priorCredits.reserved + quote.credits,
    })
    expect(expectOk(await harness.services.credits.history()).filter((entry) => entry.kind === 'processing-reservation'))
      .toHaveLength(1)
  })
})
