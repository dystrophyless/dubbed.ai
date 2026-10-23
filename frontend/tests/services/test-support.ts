/// <reference types="node" />
import { Blob as NativeBlob, File as NativeFile } from 'node:buffer'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import type { MockGoogleScenario, OperationId, ServiceClock, Services, SourceFacts } from '../../src/services/contracts'
import { ids } from '../../src/services/contracts'
import { createServices } from '../../src/services'
import { mockScenarioVerificationCode } from '../../src/services/mock-identity'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { writeRecord } from '../../src/services/mock-store'

Object.assign(globalThis, { IDBKeyRange })

export interface ServiceTestHarness {
  services: Services
  factory: IDBFactory
  namespace: string
  clientId: string
  now(): number
  advance(milliseconds: number): void
  queueUnknown(operationId: OperationId): Promise<void>
  verificationCode(requestId: OperationId): string
}

export interface ServiceTestHarnessOptions {
  factory?: IDBFactory
  namespace?: string
  clientId?: string
  startTime?: number
  scenario?: string
  googleScenario?: MockGoogleScenario
}

export function createServiceTestHarness(options: ServiceTestHarnessOptions = {}): ServiceTestHarness {
  const factory = options.factory ?? new IDBFactory()
  const namespace = options.namespace ?? `test-${crypto.randomUUID()}`
  const clientId = options.clientId ?? `client-${crypto.randomUUID()}`
  let time = options.startTime ?? 1_800_000_000_000
  const clock: ServiceClock = { now: () => time }
  const services = createServices({ adapter: 'mock', namespace, clientId, clock, indexedDB: factory, scenario: options.scenario ?? 'service-tests', googleScenario: options.googleScenario })
  const dbName = `dubbed.mock.v1.${namespace}`

  return {
    services,
    factory,
    namespace,
    clientId,
    now: () => time,
    advance: (milliseconds) => { time += milliseconds },
    queueUnknown: async (operationId) => {
      const database = await openWorkspaceDatabase(factory, dbName)
      await runTransaction(database, ['faults'], 'readwrite', async (transaction) => {
        await writeRecord(transaction, 'faults', { id: operationId, kind: 'unknown-after-commit' })
      })
      database.close()
    },
    verificationCode: mockScenarioVerificationCode,
  }
}

export const sourceFacts = (durationMs = 8_574): Omit<SourceFacts, 'fileName' | 'mimeType' | 'byteLength' | 'validation'> => ({
  durationMs,
  width: 1920,
  height: 1080,
  hasAudio: true,
})

export function fileWithBytes(name: string, bytes: number[], type = 'video/mp4'): File {
  return new NativeFile([new Uint8Array(bytes)], name, { type }) as unknown as File
}

export function blobWithBytes(bytes: number[], type = 'audio/webm'): Blob {
  return new NativeBlob([new Uint8Array(bytes)], { type }) as unknown as Blob
}

export function expectOk<T>(result: { status: string; data?: T }): T {
  if (result.status !== 'ok') throw new Error(`Expected service success, got ${JSON.stringify(result)}.`)
  return result.data as T
}

export const operationId = (value: string): OperationId => ids.operation(value)
