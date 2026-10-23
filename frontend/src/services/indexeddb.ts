export const WORKSPACE_STORES = [
  'meta',
  'accounts',
  'credentials',
  'sessions',
  'verifications',
  'resetGrants',
  'linkIntents',
  'projects',
  'sources',
  'preparations',
  'turns',
  'drafts',
  'takes',
  'recordingGrants',
  'results',
  'quotes',
  'reservations',
  'creditStates',
  'ledger',
  'purchases',
  'returnContexts',
  'authorizations',
  'operations',
  'activityEvents',
  'faults',
  'accountHistory',
] as const

export type WorkspaceStoreName = (typeof WORKSPACE_STORES)[number]

export function openWorkspaceDatabase(factory: IDBFactory, name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1)

    request.onupgradeneeded = () => {
      const database = request.result
      const store = (name: WorkspaceStoreName, keyPath: string) =>
        database.createObjectStore(name, { keyPath })

      store('meta', 'key')
      store('accounts', 'id').createIndex('email', 'email', { unique: true })
      store('credentials', 'accountId')
      store('sessions', 'id').createIndex('accountId', 'accountId')
      store('verifications', 'id').createIndex('emailPurpose', ['email', 'purpose'])
      store('resetGrants', 'id').createIndex('accountId', 'accountId')
      store('linkIntents', 'id').createIndex('accountId', 'accountId')
      store('projects', 'id').createIndex('accountId', 'accountId')
      const sources = store('sources', 'id')
      sources.createIndex('accountId', 'accountId')
      sources.createIndex('projectId', 'projectId')
      const preparations = store('preparations', 'id')
      preparations.createIndex('accountId', 'accountId')
      preparations.createIndex('projectId', 'projectId')
      preparations.createIndex('operationId', 'operationId')
      const turns = store('turns', 'id')
      turns.createIndex('projectId', 'projectId')
      turns.createIndex('accountId', 'accountId')
      const drafts = store('drafts', 'id')
      drafts.createIndex('accountId', 'accountId')
      drafts.createIndex('projectIdTurnId', ['projectId', 'turnId'])
      drafts.createIndex('candidateId', 'candidateId', { unique: true })
      const takes = store('takes', 'id')
      takes.createIndex('accountId', 'accountId')
      takes.createIndex('projectId', 'projectId')
      takes.createIndex('projectIdTurnId', ['projectId', 'turnId'])
      const recordingGrants = store('recordingGrants', 'id')
      recordingGrants.createIndex('accountId', 'accountId')
      recordingGrants.createIndex('projectId', 'projectId')
      const results = store('results', 'id')
      results.createIndex('accountId', 'accountId')
      results.createIndex('projectId', 'projectId')
      results.createIndex('generationId', 'generationId', { unique: true })
      const quotes = store('quotes', 'id')
      quotes.createIndex('accountId', 'accountId')
      quotes.createIndex('projectId', 'projectId')
      const reservations = store('reservations', 'id')
      reservations.createIndex('accountId', 'accountId')
      reservations.createIndex('operationId', 'operationId', { unique: true })
      store('creditStates', 'accountId')
      const ledger = store('ledger', 'id')
      ledger.createIndex('accountId', 'accountId')
      ledger.createIndex('accountRevision', ['accountId', 'revision'])
      const purchases = store('purchases', 'id')
      purchases.createIndex('accountId', 'accountId')
      purchases.createIndex('initiationId', 'initiationId', { unique: true })
      const returnContexts = store('returnContexts', 'id')
      returnContexts.createIndex('accountId', 'accountId')
      const authorizations = store('authorizations', 'id')
      authorizations.createIndex('accountId', 'accountId')
      authorizations.createIndex('projectId', 'projectId')
      const operations = store('operations', 'id')
      operations.createIndex('accountId', 'accountId')
      const activityEvents = store('activityEvents', 'id')
      activityEvents.createIndex('projectId', 'projectId')
      activityEvents.createIndex('accountId', 'accountId')
      store('faults', 'id')
      store('accountHistory', 'emailHash')
    }

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close()
      resolve(request.result)
    }
    request.onerror = () => reject(request.error ?? new Error('Unable to open mock workspace database.'))
    request.onblocked = () => reject(new Error('Mock workspace database upgrade is blocked by another tab.'))
  })
}

export function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'))
  })
}

export async function runTransaction<T>(
  database: IDBDatabase,
  stores: readonly WorkspaceStoreName[],
  mode: IDBTransactionMode,
  work: (transaction: IDBTransaction) => Promise<T>,
): Promise<T> {
  const transaction = database.transaction([...stores], mode)
  const completion = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted.'))
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'))
  })

  try {
    const result = await work(transaction)
    await completion
    return result
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have committed or aborted.
    }
    await completion.catch(() => undefined)
    throw error
  }
}

export function deleteWorkspaceDatabase(factory: IDBFactory, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('Unable to reset mock workspace.'))
    request.onblocked = () => reject(new Error('Reset is blocked while another tab has this mock workspace open.'))
  })
}
