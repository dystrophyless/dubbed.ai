import { afterEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { createServices } from '../../src/services'
import { expectOk, operationId } from './test-support'

function createStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
  }
}

async function register(services: ReturnType<typeof createServices>, email: string) {
  const requestId = operationId(`register-${email}`)
  const pending = expectOk(await services.registration.start({
    email,
    password: 'correct-horse',
    operationId: requestId,
  }))
  const scenarioCode = pending.scenarioCode?.value
  if (!scenarioCode) throw new Error('Registration mock did not provide its scenario verification code.')
  return expectOk(await services.registration.verify({
    requestId,
    code: scenarioCode,
    operationId: operationId(`verify-${email}`),
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('default mock client identity persistence', () => {
  it('resolves the same session after browser storage context reopens and keeps namespace/client boundaries', async () => {
    const localStorage = createStorage()
    vi.stubGlobal('localStorage', localStorage)
    vi.stubGlobal('sessionStorage', createStorage())

    const indexedDB = new IDBFactory()
    const namespace = `browser-reopen-${crypto.randomUUID()}`
    const clock = { now: () => 1_800_000_000_000 }
    const first = createServices({ namespace, indexedDB, clock })
    const verified = await register(first, 'browser-reopen@example.test')
    expect(expectOk(await first.identity.current())?.session.id).toBe(verified.session.id)

    // Browser close clears sessionStorage while persistent localStorage survives.
    vi.stubGlobal('sessionStorage', createStorage())
    const reopened = createServices({ namespace, indexedDB, clock })
    expect(expectOk(await reopened.identity.current())).toMatchObject({
      account: { id: verified.account.id },
      session: { id: verified.session.id },
    })

    const otherNamespace = createServices({ namespace: `${namespace}-other`, indexedDB, clock })
    expect(expectOk(await otherNamespace.identity.current())).toBeNull()

    const otherClient = createServices({ namespace, clientId: 'injected-virtual-client', indexedDB, clock })
    expect(expectOk(await otherClient.identity.current())).toBeNull()
  })
})
