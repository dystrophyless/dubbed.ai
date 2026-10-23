import type { OperationId, OwnedProject, ProjectActivityEvent } from './contracts'
import { asRevision } from './contracts'
import { intentConflict, nowMs, readRecord, writeRecord, type StoreContext, type StoredActivityEvent } from './mock-store'

export async function recordProjectActivity(
  transaction: IDBTransaction,
  context: StoreContext,
  project: OwnedProject,
  eventId: OperationId,
  kind: ProjectActivityEvent['kind'],
): Promise<OwnedProject> {
  const existing = await readRecord<StoredActivityEvent>(transaction, 'activityEvents', eventId)
  if (existing) {
    if (existing.projectId !== project.id || existing.accountId !== project.accountId || existing.kind !== kind) {
      throw intentConflict('This activity operation ID was already used for a different project event.')
    }
    return project
  }

  const sequenceKey = `activitySequence:${project.accountId}`
  const previousSequence = await readRecord<{ key: string; value: number }>(transaction, 'meta', sequenceKey)
  const occurredAt = Math.max(nowMs(context.clock), Number(previousSequence?.value ?? 0) + 1)
  await writeRecord(transaction, 'meta', { key: sequenceKey, value: occurredAt })
  const event: StoredActivityEvent = {
    id: eventId,
    accountId: project.accountId,
    projectId: project.id,
    kind,
    occurredAt,
    revision: asRevision(0),
  }
  const updated = { ...project, lastActivityAt: occurredAt, lastActivityEventId: eventId }
  await writeRecord(transaction, 'activityEvents', event)
  await writeRecord(transaction, 'projects', updated)
  return updated
}

export function compareRecentProjects(left: OwnedProject, right: OwnedProject): number {
  const byActivity = right.lastActivityAt - left.lastActivityAt
  if (byActivity !== 0) return byActivity
  return left.id.localeCompare(right.id, 'en')
}
