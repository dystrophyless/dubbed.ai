import { MEDIA_FIXTURE_MANIFEST, MEDIA_FIXTURES } from '../media/fixtures'
import type {
  CompatiblePreviewDescriptor,
  CompatiblePreviewSnapshot,
  OwnedProject,
  PreviewInspection,
  PreviewService,
  ProjectId,
  Revision,
  SourceId,
} from './contracts'
import { asRevision, ids } from './contracts'
import { fingerprint } from './mutations'
import {
  errorResult,
  nowMs,
  readRecord,
  requireContext,
  requireProject,
  serviceError,
  sha256,
  transact,
  type ActiveContext,
  type StoredOperation,
  type StoredSource,
  type StoreContext,
} from './mock-store'
import { mutate } from './mutations'

type LoadedPreviewSource = {
  context: ActiveContext
  project: OwnedProject
  source: StoredSource
}

const fixtureSource = MEDIA_FIXTURE_MANIFEST.assets.source
const fixtureTimeline = MEDIA_FIXTURE_MANIFEST.dialogueTimeline
const fixtureSourceDurationMs = fixtureSource.requestedCaptureWindowMs

function isSupportedFixture(source: StoredSource, contentHash: string): boolean {
  return contentHash === fixtureSource.sha256 && source.blob.size === fixtureSource.bytes
}

async function loadCurrentSource(context: StoreContext, projectId: ProjectId): Promise<LoadedPreviewSource> {
  return transact(context, ['meta', 'sessions', 'accounts', 'projects', 'sources'], 'readonly', async (transaction) => {
    const active = await requireContext(transaction, context)
    const project = await requireProject<OwnedProject>(transaction, active.account.id, projectId)
    const source = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
    if (!source || source.accountId !== active.account.id || source.projectId !== project.id) {
      throw serviceError('not-found', 'Source media was not found.')
    }
    return { context: active, project, source }
  })
}

async function sourceHash(source: StoredSource): Promise<string> {
  return source.contentHash ?? sha256(source.blob)
}

function sourceIsCurrent(
  project: { id: ProjectId; revision: Revision; sourceId: SourceId; sourceRevision: Revision },
  source: StoredSource,
  input: { projectId: ProjectId; sourceId: SourceId; sourceRevision: Revision },
): boolean {
  return project.id === input.projectId
    && project.sourceId === input.sourceId
    && project.sourceRevision === input.sourceRevision
    && source.id === input.sourceId
    && source.revision === input.sourceRevision
}

function compatibleDescriptor(input: {
  accountId: LoadedPreviewSource['context']['account']['id']
  projectId: ProjectId
  sourceId: SourceId
  sourceRevision: Revision
  sourceHash: string
  source: StoredSource
}): CompatiblePreviewDescriptor {
  return {
    accountId: input.accountId,
    projectId: input.projectId,
    sourceId: input.sourceId,
    sourceRevision: input.sourceRevision,
    sourceSha256: input.sourceHash,
    sourceByteLength: input.source.blob.size,
    sourceDurationMs: input.source.facts.durationMs,
    sourceVideo: {
      url: MEDIA_FIXTURES.source,
      sha256: fixtureSource.sha256,
      byteLength: fixtureSource.bytes,
      mediaType: fixtureSource.contentType,
      durationMs: fixtureSourceDurationMs,
      width: fixtureSource.canvasWidth,
      height: fixtureSource.canvasHeight,
    },
    video: {
      // The preview scenario keeps the exact scene and source bytes. Result
      // generations are separate product outputs and never serve as previews.
      url: MEDIA_FIXTURES.source,
      sha256: fixtureSource.sha256,
      byteLength: fixtureSource.bytes,
      mediaType: fixtureSource.contentType,
      durationMs: fixtureSourceDurationMs,
      width: fixtureSource.canvasWidth,
      height: fixtureSource.canvasHeight,
    },
    timeline: {
      sourceDurationMs: input.source.facts.durationMs,
      note: fixtureTimeline.note,
      sections: fixtureTimeline.sections.map((section) => ({
        id: section.id,
        text: section.quote,
        startMs: section.startMs,
        endMs: section.endMs,
      })),
    },
    conversionNote: 'synthetic-compatible-playback-simulation',
    note: 'synthetic-mock-scenario',
  }
}

function staleSource(message: string, currentRevision?: Revision) {
  return {
    status: 'conflict' as const,
    code: 'stale-source' as const,
    currentRevision,
    message,
  }
}

function advanceSnapshot(snapshot: CompatiblePreviewSnapshot, clock: StoreContext['clock']): CompatiblePreviewSnapshot {
  return { ...snapshot, revision: asRevision(Number(snapshot.revision) + 1), updatedAt: nowMs(clock) }
}

export function createMockPreviews(context: StoreContext): PreviewService {
  return {
    inspect: async ({ projectId }) => {
      try {
        const loaded = await loadCurrentSource(context, projectId)
        const hash = await sourceHash(loaded.source)
        const data: PreviewInspection = {
          accountId: loaded.context.account.id,
          projectId: loaded.project.id,
          projectRevision: loaded.project.revision,
          sourceId: ids.source(loaded.source.id),
          sourceRevision: loaded.project.sourceRevision,
          sourceSha256: hash,
          sourceFacts: loaded.source.facts,
          eligibility: isSupportedFixture(loaded.source, hash) ? 'supported-fixture' : 'conversion-unavailable',
          note: 'synthetic-mock-scenario',
        }
        return { status: 'ok', data, replayed: false }
      } catch (error) {
        return errorResult(error)
      }
    },

    request: async (input) => {
      try {
        const loaded = await loadCurrentSource(context, input.projectId)
        const hash = await sourceHash(loaded.source)
        if (!isSupportedFixture(loaded.source, hash)) {
          return {
            status: 'error',
            error: {
              code: 'unsupported',
              message: 'A compatible preview is available only for the exact bundled source fixture in this mock scenario.',
              retry: 'none',
            },
          }
        }
        const payloadFingerprint = await fingerprint({
          projectId: input.projectId,
          sourceId: loaded.project.sourceId,
          sourceRevision: input.expectedSourceRevision,
          sourceHash: hash,
          projectRevision: input.expectedProjectRevision,
          scenario: input.scenario ?? null,
        })

        return mutate(context, {
          operationId: input.operationId,
          kind: 'preview.request',
          payloadFingerprint,
          stores: ['projects', 'sources'],
          work: async (transaction, accountId) => {
            if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
            const project = await requireProject<{
              id: ProjectId
              accountId: typeof loaded.context.account.id
              revision: Revision
              sourceId: SourceId
              sourceRevision: Revision
            }>(transaction, ids.account(accountId), input.projectId)
            const source = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
            if (!source || !sourceIsCurrent(project, source, {
              projectId: input.projectId,
              sourceId: loaded.project.sourceId,
              sourceRevision: input.expectedSourceRevision,
            })) {
              throw staleSource('The source changed before preview could start.', project.sourceRevision)
            }
            if (project.revision !== input.expectedProjectRevision) {
              throw staleSource('The project changed before preview could start.', project.sourceRevision)
            }
            if (source.contentHash && source.contentHash !== hash) {
              throw staleSource('The stored source bytes changed before preview could start.', project.sourceRevision)
            }

            const timestamp = nowMs(context.clock)
            const snapshot: CompatiblePreviewSnapshot = {
              id: input.operationId,
              accountId: ids.account(accountId),
              projectId: project.id,
              projectRevision: project.revision,
              sourceId: project.sourceId,
              sourceRevision: project.sourceRevision,
              sourceSha256: hash,
              state: 'pending',
              attempt: 1,
              ...(input.scenario ? { scenario: input.scenario } : {}),
              revision: asRevision(0),
              requestedAt: timestamp,
              updatedAt: timestamp,
              note: 'synthetic-mock-scenario',
            }
            return { data: snapshot, accountId: project.accountId }
          },
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    observe: async (input) => {
      try {
        return await transact(context, ['meta', 'sessions', 'accounts', 'operations', 'projects', 'sources'], 'readwrite', async (transaction) => {
          const { account } = await requireContext(transaction, context)
          const project = await requireProject<{
            id: ProjectId
            accountId: typeof account.id
            revision: Revision
            sourceId: SourceId
            sourceRevision: Revision
          }>(transaction, account.id, input.projectId)
          const source = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
          if (!source || !sourceIsCurrent(project, source, input)) {
            return staleSource('The preview belongs to an older source revision.', project.sourceRevision)
          }
          const stored = await readRecord<StoredOperation>(transaction, 'operations', input.targetOperationId)
          if (!stored || stored.accountId !== account.id || !['preview.request', 'preview.retry'].includes(stored.kind)) {
            throw serviceError('not-found', 'Preview operation was not found.')
          }
          const snapshot = stored.result as CompatiblePreviewSnapshot
          if (snapshot.projectId !== input.projectId || snapshot.accountId !== account.id
            || snapshot.sourceId !== input.sourceId || snapshot.sourceRevision !== input.sourceRevision) {
            throw serviceError('not-found', 'Preview operation was not found.')
          }
          if (project.revision !== snapshot.projectRevision) {
            return staleSource('The project changed while preview was pending.', project.sourceRevision)
          }
          if (source.contentHash && source.contentHash !== snapshot.sourceSha256) {
            return staleSource('The stored source bytes changed while preview was pending.', project.sourceRevision)
          }
          if (snapshot.state !== 'pending') {
            return { status: 'ok', data: snapshot, replayed: false }
          }

          let next = advanceSnapshot(snapshot, context.clock)
          if (snapshot.scenario === 'preview-transient-error' && snapshot.attempt === 1) {
            next = {
              ...next,
              state: 'error',
              error: {
                code: 'simulated-transient',
                message: 'The synthetic preview scenario returned a retryable error.',
                retryable: true,
              },
            }
          } else {
            next = {
              ...next,
              state: 'ready',
              descriptor: compatibleDescriptor({
                accountId: account.id,
                projectId: project.id,
                sourceId: project.sourceId,
                sourceRevision: project.sourceRevision,
                sourceHash: snapshot.sourceSha256,
                source,
              }),
            }
          }
          stored.result = next
          stored.updatedAt = next.updatedAt
          stored.revision = asRevision(Number(stored.revision) + 1)
          await transaction.objectStore('operations').put(stored)
          return { status: 'ok', data: next, replayed: false }
        })
      } catch (error) {
        return errorResult(error)
      }
    },

    retry: async (input) => {
      const requestHash = await fingerprint({
        projectId: input.projectId,
        sourceId: input.sourceId,
        sourceRevision: input.sourceRevision,
        priorOperationId: input.priorOperationId,
        expectedProjectRevision: input.expectedProjectRevision,
      })
      return mutate(context, {
        operationId: input.operationId,
        kind: 'preview.retry',
        payloadFingerprint: requestHash,
        stores: ['projects', 'sources', 'operations'],
        work: async (transaction, accountId) => {
          if (!accountId) throw serviceError('unauthenticated', 'Sign in to continue.')
          const project = await requireProject<{
            id: ProjectId
            accountId: typeof accountId
            revision: Revision
            sourceId: SourceId
            sourceRevision: Revision
          }>(transaction, ids.account(accountId), input.projectId)
          if (project.revision !== input.expectedProjectRevision || project.sourceId !== input.sourceId
            || project.sourceRevision !== input.sourceRevision) {
            throw staleSource('The project or source changed before preview could retry.', project.sourceRevision)
          }
          const source = await readRecord<StoredSource>(transaction, 'sources', project.sourceId)
          if (!source || source.accountId !== accountId || source.projectId !== project.id) {
            throw serviceError('not-found', 'Source media was not found.')
          }
          const previous = await readRecord<StoredOperation>(transaction, 'operations', input.priorOperationId)
          if (!previous || previous.accountId !== accountId || previous.kind !== 'preview.request' && previous.kind !== 'preview.retry') {
            throw serviceError('not-found', 'Preview operation was not found.')
          }
          const prior = previous.result as CompatiblePreviewSnapshot
          if (prior.projectId !== project.id || prior.sourceId !== input.sourceId || prior.sourceRevision !== input.sourceRevision) {
            throw serviceError('not-found', 'Preview operation was not found.')
          }
          if (prior.state !== 'error' || prior.error?.code !== 'simulated-transient' || !prior.error.retryable
            || prior.scenario !== 'preview-transient-error' || prior.attempt !== 1) {
            throw serviceError('unsupported', 'Only the explicit transient preview scenario can be retried.')
          }
          if (source.contentHash && source.contentHash !== prior.sourceSha256) {
            throw staleSource('The stored source bytes changed before preview could retry.', project.sourceRevision)
          }

          const timestamp = nowMs(context.clock)
          const snapshot: CompatiblePreviewSnapshot = {
            id: input.operationId,
            accountId: ids.account(accountId),
            projectId: project.id,
            projectRevision: project.revision,
            sourceId: project.sourceId,
            sourceRevision: project.sourceRevision,
            sourceSha256: prior.sourceSha256,
            state: 'pending',
            attempt: prior.attempt + 1,
            scenario: prior.scenario,
            revision: asRevision(0),
            requestedAt: timestamp,
            updatedAt: timestamp,
            note: 'synthetic-mock-scenario',
          }
          return { data: snapshot, accountId: project.accountId }
        },
      })
    },
  }
}
