import type { OperationId, OperationService, OperationSnapshot, ServiceResult } from './contracts'
import { errorResult, readRecord, requireContext, serviceError, transact, type StoredOperation, type StoreContext } from './mock-store'

export function createMockOperations(context: StoreContext): OperationService {
  return {
    resolve: async <T = unknown>(operationId: OperationId): Promise<ServiceResult<OperationSnapshot<T> | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }>> => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'operations'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const operation = await readRecord<StoredOperation>(transaction, 'operations', operationId)
          if (!operation) return { status: 'ok', data: { state: 'not-started', operationId, safeToRetrySameId: true } as const, replayed: false } as const
          if (operation.accountId !== account.id) throw serviceError('not-found', 'Operation was not found.')
          if (operation.job) return { status: 'ok', data: structuredClone(operation.job) as OperationSnapshot<T>, replayed: false } as const
          return {
            status: 'ok',
            data: {
              id: operation.id,
              accountId: account.id,
              state: 'committed',
              kind: operation.kind,
              result: operation.result as T,
              revision: operation.revision,
              updatedAt: operation.updatedAt,
            } satisfies OperationSnapshot<T>,
            replayed: false,
          } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  }
}
