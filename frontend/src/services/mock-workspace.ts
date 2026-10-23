import type { WorkspaceService } from './contracts'
import { errorResult, type StoreContext } from './mock-store'
import { deleteWorkspaceDatabase, openWorkspaceDatabase } from './indexeddb'

export function createMockWorkspace(context: StoreContext): WorkspaceService {
  return {
    namespace: context.dbName,
    reset: async () => {
      const current = await context.database
      current.close()
      try {
        await deleteWorkspaceDatabase(context.factory, context.dbName)
        context.database = openWorkspaceDatabase(context.factory, context.dbName)
        await context.database
        return { status: 'ok', data: { reset: true, namespace: context.dbName }, replayed: false }
      } catch (error) {
        context.database = openWorkspaceDatabase(context.factory, context.dbName)
        return errorResult(error)
      }
    },
  }
}
