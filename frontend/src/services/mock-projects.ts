import type {
  OwnedProject,
  ProjectCapacity,
  ProjectsService,
  SectionSelection,
  SourceFacts,
  UploadService,
} from './contracts'
import { asRevision, ids } from './contracts'
import {
  assertSafeInteger,
  errorResult,
  nowMs,
  readRecord,
  recordsByIndex,
  requireContext,
  requireProject,
  revisionConflict,
  serviceError,
  sha256,
  transact,
  writeRecord,
  type StoredCreditState,
  type StoredOperation,
  type StoredPreparation,
  type StoredReservation,
  type StoredSource,
  type StoreContext,
} from './mock-store'
import { fingerprint, mutate } from './mutations'
import { compareRecentProjects, recordProjectActivity } from './project-activity'
import { filenameProjectTitle, validateProjectTitle } from './project-title'

type InitialUploadFacts = Omit<SourceFacts, 'fileName' | 'mimeType' | 'byteLength' | 'validation'>
const SOURCE_STORES = ['sources', 'projects', 'creditStates', 'activityEvents'] as const
const PROJECT_DATA_STORES = ['sources', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'results', 'quotes', 'reservations', 'returnContexts', 'authorizations', 'activityEvents'] as const

function capacityOf(state: StoredCreditState): ProjectCapacity {
  return {
    used: state.capacityUsed,
    total: state.capacityTotal,
    firstPurchaseUpgrade: state.firstPurchaseUpgrade,
    revision: state.revision,
  }
}

function assertUpload(file: File, facts: InitialUploadFacts): void {
  if (!file || file.size <= 0) throw serviceError('media-invalid', 'Choose a nonempty video file.')
  assertSafeInteger(facts.durationMs, 'Video duration', 1)
  if (!facts.hasAudio) throw serviceError('media-invalid', 'The selected video has no audio track.')
  if (facts.width !== undefined) assertSafeInteger(facts.width, 'Video width', 1)
  if (facts.height !== undefined) assertSafeInteger(facts.height, 'Video height', 1)
}

function makeFacts(file: File, facts: InitialUploadFacts): SourceFacts {
  return {
    ...facts,
    fileName: file.name,
    mimeType: file.type,
    byteLength: file.size,
    validation: 'mock-scenario',
  }
}

function makeProjectTitle(fileName: string, requested?: string): string {
  const suggestion = requested ?? filenameProjectTitle(fileName)
  const validated = validateProjectTitle(suggestion)
  if (!validated.valid) {
    throw serviceError('validation', validated.reason === 'empty'
      ? 'Enter a project title because this filename has no visible title.'
      : 'Project titles may contain at most 100 visible characters.')
  }
  return validated.value
}

async function nextCapacity(
  transaction: IDBTransaction,
  accountId: string,
): Promise<StoredCreditState> {
  const state = await readRecord<StoredCreditState>(transaction, 'creditStates', accountId)
  if (!state) throw serviceError('not-found', 'Project capacity is unavailable.')
  if (state.capacityUsed >= state.capacityTotal) throw serviceError('capacity-reached', 'No project slots are available.')
  return state
}

export function createMockProjects(context: StoreContext, reconcileBackground?: () => Promise<void>): { projects: ProjectsService; uploads: UploadService } {
  const projects: ProjectsService = {
    list: async () => {
      try {
        await reconcileBackground?.()
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'creditStates'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const [owned, capacity] = await Promise.all([
            recordsByIndex<OwnedProject>(transaction, 'projects', 'accountId', account.id),
            readRecord<StoredCreditState>(transaction, 'creditStates', account.id),
          ])
          if (!capacity) throw serviceError('not-found', 'Project capacity is unavailable.')
          return { status: 'ok', data: { projects: owned.sort(compareRecentProjects), capacity: capacityOf(capacity) }, replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    open: async (projectId) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, account.id, projectId)
          return { status: 'ok', data: project, replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    recordOpened: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, expectedRevision: input.expectedRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'project.opened',
        payloadFingerprint: requestHash,
        stores: ['projects', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          const recorded = await recordProjectActivity(transaction, context, project, input.operationId, 'opened')
          return { data: recorded, accountId: project.accountId }
        },
      })
    },
    rename: async (input) => {
      const validated = validateProjectTitle(input.title)
      if (!validated.valid) return errorResult(serviceError('validation', validated.reason === 'empty' ? 'Project title cannot be empty.' : 'Project titles may contain at most 100 visible characters.'))
      const requestHash = await fingerprint({ projectId: input.projectId, title: validated.value, expectedRevision: input.expectedRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'project.rename',
        payloadFingerprint: requestHash,
        stores: ['projects', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedRevision) throw revisionConflict('Project changed. Reload before renaming.', project.revision)
          const updated: OwnedProject = {
            ...project,
            title: validated.value,
            titleSource: 'manual',
            revision: asRevision(Number(project.revision) + 1),
            updatedAt: nowMs(context.clock),
          }
          await writeRecord(transaction, 'projects', updated)
          const activity = await recordProjectActivity(transaction, context, updated, input.operationId, 'user-change')
          return { data: activity, accountId: project.accountId }
        },
      })
    },
    deletionImpact: async (projectId) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'sources', 'takes', 'drafts', 'results'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, account.id, projectId)
          const [sources, takes, drafts, results] = await Promise.all([
            recordsByIndex<StoredSource>(transaction, 'sources', 'projectId', projectId),
            recordsByIndex<{ id: string }>(transaction, 'takes', 'projectIdTurnId', IDBKeyRange.bound([projectId, ''], [projectId, '\uffff'])),
            recordsByIndex<{ id: string }>(transaction, 'drafts', 'projectIdTurnId', IDBKeyRange.bound([projectId, ''], [projectId, '\uffff'])),
            recordsByIndex<{ id: string }>(transaction, 'results', 'projectId', projectId),
          ])
          return {
            status: 'ok',
            replayed: false,
            data: {
              projectId,
              title: project.title,
              sourceBytes: sources.reduce((total, source) => total + source.blob.size, 0),
              acceptedTakeCount: takes.length,
              draftCount: drafts.length,
              resultCount: results.length,
            },
          } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
    delete: async (input) => {
      const requestHash = await fingerprint({ projectId: input.projectId, expectedRevision: input.expectedRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'project.delete',
        payloadFingerprint: requestHash,
        stores: ['projects', 'sources', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'results', 'quotes', 'reservations', 'creditStates', 'returnContexts', 'authorizations', 'activityEvents', 'operations'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedRevision) throw revisionConflict('Project changed. Reload before deleting.', project.revision)
          const state = await readRecord<StoredCreditState>(transaction, 'creditStates', accountId)
          if (!state) throw serviceError('not-found', 'Project capacity is unavailable.')
          const retainedReservationIds = new Set<string>()
          for (const storeName of PROJECT_DATA_STORES) {
            const records = await recordsByIndex<{ id: IDBValidKey } & { accountId?: string }>(transaction, storeName, 'accountId', accountId)
            if (storeName === 'activityEvents') {
              for (const event of records as Array<{ id: IDBValidKey; projectId?: string }>) {
                if (event.projectId === project.id) await transaction.objectStore(storeName).delete(event.id)
              }
              continue
            }
            if (storeName === 'preparations') {
              const preparations = records as Array<StoredPreparation>
              const projectPreparations = preparations.filter((preparation) => preparation.projectId === project.id)
              for (const preparation of projectPreparations) {
                const operation = await readRecord<StoredOperation>(transaction, 'operations', preparation.operationId)
                const reservation = await readRecord<StoredReservation>(transaction, 'reservations', preparation.reservationId)
                const isActive = (preparation.state === 'queued' || preparation.state === 'running')
                  && operation?.accountId === project.accountId
                  && operation.job?.state === 'pending'
                  && operation.job.kind === 'preparation'
                  && reservation?.accountId === project.accountId
                  && reservation.projectId === project.id
                  && reservation.operationId === preparation.operationId
                  && reservation.state === 'reserved'
                if (isActive && reservation) {
                  await writeRecord(transaction, 'preparations', {
                    id: preparation.id,
                    accountId: preparation.accountId,
                    projectId: preparation.projectId,
                    operationId: preparation.operationId,
                    sourceRevision: asRevision(0),
                    selectionRevision: asRevision(0),
                    attemptClass: preparation.attemptClass,
                    authorizedActivePreparationRevision: asRevision(0),
                    authorizedDraftIdsToDelete: [],
                    state: preparation.state,
                    stageIndex: preparation.stageIndex,
                    nextStageAt: preparation.nextStageAt,
                    deletedAttemptIsFirst: projectPreparations.length === 1,
                    projectDeleted: true,
                    revision: preparation.revision,
                    createdAt: preparation.createdAt,
                    turns: [],
                    reservationId: preparation.reservationId,
                    usable: false,
                    includedRetryAvailable: false,
                    reprocessingLocked: false,
                  } satisfies StoredPreparation)
                  retainedReservationIds.add(reservation.id)
                } else {
                  await transaction.objectStore(storeName).delete(preparation.id)
                }
              }
              continue
            }
            if (storeName === 'reservations') {
              for (const reservation of records as Array<{ id: IDBValidKey; projectId?: string }>) {
                if (reservation.projectId === project.id && !retainedReservationIds.has(String(reservation.id))) {
                  await transaction.objectStore(storeName).delete(reservation.id)
                }
              }
              continue
            }
            for (const record of records as Array<{ id: IDBValidKey; projectId?: string }>) {
              if (record.projectId === project.id) await transaction.objectStore(storeName).delete(record.id)
            }
          }
          await transaction.objectStore('projects').delete(project.id)
          state.capacityUsed = Math.max(0, state.capacityUsed - 1)
          state.revision = asRevision(Number(state.revision) + 1)
          await writeRecord(transaction, 'creditStates', state)
          return { data: { deleted: true as const, freedSlot: true as const }, accountId: project.accountId }
        },
      })
    },
  }

  const uploads: UploadService = {
    commitInitial: async (input) => {
      const fileHash = await sha256(input.file)
      let title: string
      try {
        title = makeProjectTitle(input.file.name, input.title)
      } catch (error) {
        return errorResult(error)
      }
      const requestHash = await fingerprint({ fileHash, facts: input.facts, title })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'upload.commit-initial',
        payloadFingerprint: requestHash,
        stores: [...SOURCE_STORES],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          assertUpload(input.file, input.facts)
          const capacity = await nextCapacity(transaction, accountId)
          const sourceId = ids.source(crypto.randomUUID())
          const projectId = ids.project(crypto.randomUUID())
          const timestamp = nowMs(context.clock)
          const facts = makeFacts(input.file, input.facts)
          const selection: SectionSelection = { startMs: 0, endMs: facts.durationMs, revision: asRevision(0) }
          const project: OwnedProject = {
            id: projectId,
            accountId: ids.account(accountId),
            revision: asRevision(0),
            title,
            titleSource: input.title ? 'manual' : 'filename',
            createdAt: timestamp,
            updatedAt: timestamp,
            lastActivityAt: timestamp - 1,
            sourceId,
            sourceRevision: asRevision(0),
            sourceDurationMs: facts.durationMs,
            selection,
            preparationRevision: asRevision(0),
            includedRetryAvailable: false,
            state: 'uploaded',
          }
          const source: StoredSource = {
            id: sourceId,
            accountId: project.accountId,
            projectId,
            facts,
            contentHash: fileHash,
            blob: input.file.slice(0, input.file.size, input.file.type),
            revision: asRevision(0),
          }
          capacity.capacityUsed += 1
          capacity.revision = asRevision(Number(capacity.revision) + 1)
          await writeRecord(transaction, 'sources', source)
          await writeRecord(transaction, 'projects', project)
          await writeRecord(transaction, 'creditStates', capacity)
          const activity = await recordProjectActivity(transaction, context, project, input.operationId, 'user-change')
          return { data: { project: activity, source: facts }, accountId: project.accountId }
        },
      })
    },
    replaceSource: async (input) => {
      const fileHash = await sha256(input.file)
      const requestHash = await fingerprint({ projectId: input.projectId, fileHash, facts: input.facts, expectedProjectRevision: input.expectedProjectRevision })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'upload.replace-source',
        payloadFingerprint: requestHash,
        stores: ['projects', 'sources', 'preparations', 'turns', 'drafts', 'takes', 'recordingGrants', 'results', 'quotes', 'reservations', 'activityEvents'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          assertUpload(input.file, input.facts)
          const project = await requireProject<OwnedProject>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedProjectRevision) throw revisionConflict('Project changed. Reload before replacing its source.', project.revision)
          const priorLaunches = await recordsByIndex<{ id: string }>(transaction, 'preparations', 'projectId', project.id)
          if (project.firstAiLaunchAt !== undefined || project.preparationId !== undefined || priorLaunches.length > 0) {
            throw serviceError('forbidden', 'Source media can only be replaced before the first AI launch.')
          }
          const oldSource = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
          if (!oldSource || oldSource.accountId !== accountId) throw serviceError('not-found', 'Source media was not found.')
          const sourceId = ids.source(crypto.randomUUID())
          const facts = makeFacts(input.file, input.facts)
          const title = project.titleSource === 'filename' ? makeProjectTitle(input.file.name) : project.title
          const nextProject: OwnedProject = {
            ...project,
            title,
            titleSource: project.titleSource,
            revision: asRevision(Number(project.revision) + 1),
            sourceId,
            sourceRevision: asRevision(Number(project.sourceRevision) + 1),
            sourceDurationMs: facts.durationMs,
            selection: { startMs: 0, endMs: facts.durationMs, revision: asRevision(Number(project.selection.revision) + 1) },
            state: 'uploaded',
            updatedAt: nowMs(context.clock),
          }
          await writeRecord(transaction, 'sources', {
            id: sourceId,
            accountId: nextProject.accountId,
            projectId: nextProject.id,
            facts,
            contentHash: fileHash,
            blob: input.file.slice(0, input.file.size, input.file.type),
            revision: asRevision(Number(oldSource.revision) + 1),
          } satisfies StoredSource)
          await transaction.objectStore('sources').delete(oldSource.id)
          const activity = await recordProjectActivity(transaction, context, nextProject, input.operationId, 'user-change')
          return { data: { project: activity, source: facts }, accountId: project.accountId }
        },
      })
    },
    getSource: async (projectId) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'projects', 'sources'], 'readonly', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const project = await requireProject<OwnedProject>(transaction, account.id, projectId)
          const source = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
          if (!source || source.accountId !== account.id) throw serviceError('not-found', 'Source media was not found.')
          return { status: 'ok', data: { facts: source.facts, blob: source.blob }, replayed: false } as const
        })
      } catch (error) {
        return errorResult(error)
      }
    },
  }

  return { projects, uploads }
}
