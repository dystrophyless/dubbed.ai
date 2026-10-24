import { describe, expect, it } from 'vitest'
import type { RecordingCandidate, TurnId } from '../../src/services/contracts'
import { ids } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { readRecord, writeRecord, type StoredGrant } from '../../src/services/mock-store'
import { createServices } from '../../src/services'
import { blobWithBytes, createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function prepareProject(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId(`register-${email}`)
  expectOk(await harness.services.registration.start({
    email,
    password: 'correct-horse',
    operationId: requestId,
  }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId(`verify-${email}`),
  }))

  const uploaded = expectOk(await harness.services.uploads.commitInitial({
    file: fileWithBytes('result-source.mp4', [1, 2, 3, 4]),
    facts: sourceFacts(),
    operationId: operationId(`upload-${email}`),
  }))
  const quote = expectOk(await harness.services.preparation.quote({
    projectId: uploaded.project.id,
    expectedProjectRevision: uploaded.project.revision,
    expectedActivePreparationRevision: uploaded.project.preparationRevision,
    operationId: operationId(`quote-${email}`),
  }))
  const started = expectOk(await harness.services.preparation.start({
    quoteId: quote.id,
    expectedProjectRevision: uploaded.project.revision,
    expectedSourceRevision: uploaded.project.sourceRevision,
    expectedActivePreparationId: quote.activePreparationId,
    expectedActivePreparationRevision: quote.activePreparationRevision,
    acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
    replacementAcknowledged: false,
    draftLossAcknowledged: false,
    explicitAuthorization: true,
    operationId: operationId(`prepare-${email}`),
  }))

  let complete = false
  for (let attempt = 0; attempt < 8; attempt += 1) {
    harness.advance(1_000)
    const snapshot = expectOk(await harness.services.preparation.observe({
      projectId: uploaded.project.id,
      targetOperationId: started.operation.id,
    }))
    const result = snapshot.operation.result as { state?: string } | undefined
    if (snapshot.operation.state === 'committed' && result?.state === 'complete') {
      complete = true
      break
    }
  }
  expect(complete).toBe(true)

  const prepared = expectOk(await harness.services.projects.open(uploaded.project.id))
  const currentPreparation = expectOk(await harness.services.preparation.resolve({
    projectId: prepared.id,
    targetOperationId: started.operation.id,
  }))
  expect(currentPreparation.projectRevision).toBe(prepared.revision)
  expectOk(await harness.services.preparation.activate({
    projectId: prepared.id,
    targetOperationId: started.operation.id,
    expectedRevision: prepared.revision,
    expectedActivePreparationId: prepared.preparationId,
    expectedActivePreparationRevision: prepared.preparationRevision,
    operationId: operationId(`activate-${email}`),
  }))
  const activeProject = expectOk(await harness.services.projects.open(uploaded.project.id))
  expect(await harness.services.preparation.updateSelection({
    projectId: activeProject.id,
    startMs: 1,
    endMs: 1_001,
    expectedProjectRevision: activeProject.revision,
    expectedSourceRevision: activeProject.sourceRevision,
    operationId: operationId(`selection-with-active-preparation-${email}`),
  })).toMatchObject({ status: 'error', error: { code: 'forbidden' } })
  return uploaded.project.id
}

function candidateFor(
  projectId: ReturnType<typeof ids.project>,
  turn: { id: TurnId; processingRevision: RecordingCandidate['processingRevision']; timingRevision: RecordingCandidate['timingRevision']; windowStartMs: number; windowEndMs: number },
  value: string,
  audioFrames: RecordingCandidate['audioFrames'] = 'present',
): RecordingCandidate {
  const decodedDurationMs = audioFrames === 'present' ? Math.max(1, turn.windowEndMs - turn.windowStartMs) : null
  return {
    id: ids.candidate(`candidate-${value}`),
    projectId,
    turnId: turn.id,
    mediaId: ids.media(`media-${value}`),
    processingRevision: turn.processingRevision,
    timingRevision: turn.timingRevision,
    revision: 0 as RecordingCandidate['revision'],
    audioTrackPresent: true,
    hasRecordedBytes: true,
    audioFrames,
    decodedDurationMs,
    durationMs: Math.max(1, turn.windowEndMs - turn.windowStartMs),
    accepted: false,
  }
}

const recordingBlob = () => blobWithBytes([9, 8, 7, 6])

async function acceptAllTurns(
  harness: ReturnType<typeof createServiceTestHarness>,
  projectId: ReturnType<typeof ids.project>,
  key: string,
) {
  const firstContext = expectOk(await harness.services.recording.loadContext(projectId))
  let access = expectOk(await harness.services.recording.acquireAccess({
    projectId,
    expectedProjectRevision: firstContext.project.revision,
    operationId: operationId(`acquire-${key}`),
  }))
  let initialAssemblyAuthorizationId: ReturnType<typeof ids.operation> | undefined

  for (const [index, seed] of firstContext.turns.entries()) {
    let current = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = current.turns.find((item) => item.id === seed.id)
    expect(turn).toBeDefined()
    const candidate = candidateFor(projectId, turn!, `${key}-${index}`)
    const blob = recordingBlob()

    if (index === 0) {
      const unknown = candidateFor(projectId, turn!, `${key}-unknown`, 'unknown')
      const rejected = await harness.services.recording.acceptCandidate({
        projectId,
        turnId: turn!.id,
        candidate: unknown,
        blob,
        grantId: access.grantId,
        expectedGrantRevision: access.revision,
        expectedProjectRevision: current.project.revision,
        expectedTakeRevision: current.takeRevision,
        operationId: operationId(`accept-unknown-${key}`),
      })
      expect(rejected).toMatchObject({ status: 'error', error: { code: 'media-invalid' } })

      const saved = expectOk(await harness.services.recording.persistDraft({
        projectId,
        turnId: turn!.id,
        candidate,
        blob,
        grantId: access.grantId,
        expectedGrantRevision: access.revision,
        expectedProjectRevision: current.project.revision,
        operationId: operationId(`persist-draft-${key}`),
      }))
      expect(saved.candidate).toMatchObject({
        audioTrackPresent: true,
        hasRecordedBytes: true,
        audioFrames: 'present',
        decodedDurationMs: expect.any(Number),
        durationMs: expect.any(Number),
      })
      expect(saved.candidate.decodedDurationMs).toBeGreaterThan(0)
      const restored = expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn!.id }))
      expect(restored).not.toBeNull()
      expect(restored!.blob.size).toBe(blob.size)
      current = expectOk(await harness.services.recording.loadContext(projectId))
      expect(current.acceptedTakeCount).toBe(0)
      expect(current.missingAcceptedCount).toBe(firstContext.turns.length)

      const accepted = expectOk(await harness.services.recording.acceptCandidate({
        projectId,
        turnId: turn!.id,
        candidate: saved.candidate,
        draftId: saved.candidate.draftId,
        grantId: access.grantId,
        expectedGrantRevision: access.revision,
        expectedProjectRevision: current.project.revision,
        expectedTakeRevision: current.takeRevision,
        operationId: operationId(`accept-draft-${key}`),
      }))
      initialAssemblyAuthorizationId = accepted.initialAssemblyAuthorizationId
      access = accepted.access
      continue
    }

    const accepted = expectOk(await harness.services.recording.acceptCandidate({
      projectId,
      turnId: turn!.id,
      candidate,
      blob,
      grantId: access.grantId,
      expectedGrantRevision: access.revision,
      expectedProjectRevision: current.project.revision,
      expectedTakeRevision: current.takeRevision,
      operationId: operationId(`accept-${key}-${index}`),
    }))
    initialAssemblyAuthorizationId = accepted.initialAssemblyAuthorizationId ?? initialAssemblyAuthorizationId
    access = accepted.access
    if (index < firstContext.turns.length - 1) expect(accepted.initialAssemblyAuthorizationId).toBeUndefined()
  }

  const finalContext = expectOk(await harness.services.recording.loadContext(projectId))
  expect(finalContext.missingAcceptedCount).toBe(0)
  expect(finalContext.acceptedTakeCount).toBe(firstContext.turns.length)
  expect(await harness.services.preparation.updateSelection({
    projectId,
    startMs: 1,
    endMs: 1_001,
    expectedProjectRevision: finalContext.project.revision,
    expectedSourceRevision: finalContext.project.sourceRevision,
    operationId: operationId(`selection-after-accepted-takes-${key}`),
  })).toMatchObject({ status: 'error', error: { code: 'forbidden' } })
  expect(expectOk(await harness.services.projects.open(projectId))).toEqual(finalContext.project)
  expect(initialAssemblyAuthorizationId).toBeDefined()
  return { authorizationId: initialAssemblyAuthorizationId!, turns: finalContext.turns }
}

async function leaveFinalGap(harness: ReturnType<typeof createServiceTestHarness>, projectId: ReturnType<typeof ids.project>, key: string) {
  const initial = expectOk(await harness.services.recording.loadContext(projectId))
  expect(initial.turns.length).toBeGreaterThan(1)
  let access = expectOk(await harness.services.recording.acquireAccess({
    projectId,
    expectedProjectRevision: initial.project.revision,
    operationId: operationId(`acquire-final-gap-${key}`),
  }))
  for (const [index, seed] of initial.turns.slice(0, -1).entries()) {
    const current = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = current.turns.find((item) => item.id === seed.id)!
    const accepted = expectOk(await harness.services.recording.acceptCandidate({
      projectId,
      turnId: turn.id,
      candidate: candidateFor(projectId, turn, `${key}-${index}`),
      blob: recordingBlob(),
      grantId: access.grantId,
      expectedGrantRevision: access.revision,
      expectedProjectRevision: current.project.revision,
      expectedTakeRevision: current.takeRevision,
      operationId: operationId(`accept-before-final-${key}-${index}`),
    }))
    access = accepted.access
    expect(accepted.initialAssemblyAuthorizationId).toBeUndefined()
  }
  const current = expectOk(await harness.services.recording.loadContext(projectId))
  expect(current.missingAcceptedCount).toBe(1)
  const turn = current.turns.find((item) => item.id === current.firstMissingTurnId)!
  return {
    current,
    access,
    turn,
    candidate: candidateFor(projectId, turn, `final-${key}`),
    blob: recordingBlob(),
  }
}

describe('persistent recording and result services', () => {
  it('renews only the same live recording grant and fences stale grant revisions', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'lease-renew@example.test')
    const context = expectOk(await harness.services.recording.loadContext(projectId))
    const grant = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: context.project.revision,
      operationId: operationId('lease-renew-acquire'),
    }))
    const turn = context.turns[0]
    const prior = expectOk(await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate: candidateFor(projectId, turn, 'lease-renew-prior'),
      blob: recordingBlob(),
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: context.project.revision,
      operationId: operationId('lease-renew-prior-draft'),
    }))
    const current = expectOk(await harness.services.recording.loadContext(projectId))

    harness.advance(20_000)
    const renewed = expectOk(await harness.services.recording.renewAccess({
      projectId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: current.project.revision,
      operationId: operationId('lease-renew-first'),
    }))
    expect(renewed).toMatchObject({
      grantId: grant.grantId,
      accountId: grant.accountId,
      sessionId: grant.sessionId,
      state: 'held-by-session',
      fenceToken: grant.fenceToken,
      revision: Number(grant.revision) + 1,
      expiresAt: harness.now() + 45_000,
    })

    const stale = await harness.services.recording.renewAccess({
      projectId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: current.project.revision,
      operationId: operationId('lease-renew-stale'),
    })
    expect(stale).toMatchObject({ status: 'conflict', code: 'revision-conflict' })

    const staleAccept = await harness.services.recording.acceptCandidate({
      projectId,
      turnId: turn.id,
      candidate: prior.candidate,
      draftId: prior.candidate.draftId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: current.project.revision,
      expectedTakeRevision: current.takeRevision,
      operationId: operationId('lease-renew-stale-accept'),
    })
    expect(staleAccept).toMatchObject({ status: 'conflict', code: 'revision-conflict' })
    expect(expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))?.candidate.id).toBe(prior.candidate.id)
  })

  it('rejects expired-grant renew, draft persistence, and acceptance without replacing the prior usable draft', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'lease-expired@example.test')
    const initial = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = initial.turns[0]
    const grant = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('lease-expired-acquire'),
    }))
    const priorCandidate = candidateFor(projectId, turn, 'lease-prior')
    const priorBlob = recordingBlob()
    const saved = expectOk(await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate: priorCandidate,
      blob: priorBlob,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('lease-expired-prior-draft'),
    }))
    const beforeExpiry = expectOk(await harness.services.recording.loadContext(projectId))
    harness.advance(45_001)

    const renew = await harness.services.recording.renewAccess({
      projectId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: beforeExpiry.project.revision,
      operationId: operationId('lease-expired-renew'),
    })
    expect(renew).toMatchObject({ status: 'error', error: { code: 'lease-held' } })

    const lateCandidate = candidateFor(projectId, turn, 'lease-late')
    const lateDraft = await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate: lateCandidate,
      blob: recordingBlob(),
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: beforeExpiry.project.revision,
      operationId: operationId('lease-expired-late-draft'),
    })
    expect(lateDraft).toMatchObject({ status: 'error', error: { code: 'lease-held' } })

    const lateAccept = await harness.services.recording.acceptCandidate({
      projectId,
      turnId: turn.id,
      candidate: saved.candidate,
      draftId: saved.candidate.draftId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: beforeExpiry.project.revision,
      expectedTakeRevision: beforeExpiry.takeRevision,
      operationId: operationId('lease-expired-late-accept'),
    })
    expect(lateAccept).toMatchObject({ status: 'error', error: { code: 'lease-held' } })

    const restored = expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))
    expect(restored).not.toBeNull()
    expect(restored!.candidate.id).toBe(saved.candidate.id)
    expect(restored!.blob.size).toBe(priorBlob.size)
    expect(expectOk(await harness.services.recording.loadContext(projectId))).toMatchObject({ acceptedTakeCount: 0 })
  })

  it('shares a tab actor across service facades and explicitly reacquires released or expired grants without losing drafts', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'recording-actor-lifecycle@example.test')
    const sameTabServices = createServices({
      adapter: 'mock',
      namespace: harness.namespace,
      clientId: harness.clientId,
      clock: { now: harness.now },
      indexedDB: harness.factory,
      scenario: 'service-tests',
    })
    const initial = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = initial.turns[0]
    const firstGrant = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('actor-lifecycle-first-acquire'),
    }))

    const sameTabRenewal = expectOk(await sameTabServices.recording.acquireAccess({
      projectId,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('actor-lifecycle-same-tab-acquire'),
    }))
    expect(sameTabRenewal).toMatchObject({
      grantId: firstGrant.grantId,
      fenceToken: firstGrant.fenceToken,
      revision: Number(firstGrant.revision) + 1,
    })
    expect(await harness.services.recording.renewAccess({
      projectId,
      grantId: firstGrant.grantId,
      expectedGrantRevision: firstGrant.revision,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('actor-lifecycle-stale-revision'),
    })).toMatchObject({ status: 'conflict', code: 'revision-conflict' })

    const saved = expectOk(await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate: candidateFor(projectId, turn, 'actor-lifecycle-draft'),
      blob: recordingBlob(),
      grantId: sameTabRenewal.grantId,
      expectedGrantRevision: sameTabRenewal.revision,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('actor-lifecycle-save-draft'),
    }))
    const beforeRelease = expectOk(await harness.services.recording.loadContext(projectId))
    expectOk(await sameTabServices.recording.releaseAccess({
      projectId,
      grantId: sameTabRenewal.grantId,
      expectedGrantRevision: sameTabRenewal.revision,
      expectedProjectRevision: beforeRelease.project.revision,
      operationId: operationId('actor-lifecycle-release'),
    }))

    const afterRelease = expectOk(await harness.services.recording.loadContext(projectId))
    const reacquiredAfterRelease = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: afterRelease.project.revision,
      operationId: operationId('actor-lifecycle-reacquire-release'),
    }))
    expect(reacquiredAfterRelease.grantId).not.toBe(firstGrant.grantId)
    expect(reacquiredAfterRelease.fenceToken).toBeGreaterThan(firstGrant.fenceToken)
    expect(expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))?.candidate.id)
      .toBe(saved.candidate.id)

    harness.advance(45_001)
    const afterExpiry = expectOk(await harness.services.recording.loadContext(projectId))
    expect(await sameTabServices.recording.renewAccess({
      projectId,
      grantId: reacquiredAfterRelease.grantId,
      expectedGrantRevision: reacquiredAfterRelease.revision,
      expectedProjectRevision: afterExpiry.project.revision,
      operationId: operationId('actor-lifecycle-expired-renew'),
    })).toMatchObject({ status: 'error', error: { code: 'lease-held' } })

    const reacquiredAfterExpiry = expectOk(await sameTabServices.recording.acquireAccess({
      projectId,
      expectedProjectRevision: afterExpiry.project.revision,
      operationId: operationId('actor-lifecycle-reacquire-expired'),
    }))
    expect(reacquiredAfterExpiry.grantId).not.toBe(reacquiredAfterRelease.grantId)
    expect(reacquiredAfterExpiry.fenceToken).toBeGreaterThan(reacquiredAfterRelease.fenceToken)
    expect(expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))?.candidate.id)
      .toBe(saved.candidate.id)
  })

  it('fails closed for a live legacy grant without a tab actor and reacquires after expiry with its draft intact', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'legacy-recording-grant@example.test')
    const initial = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = initial.turns[0]
    const grant = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('legacy-recording-grant-acquire'),
    }))
    const saved = expectOk(await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate: candidateFor(projectId, turn, 'legacy-recording-draft'),
      blob: recordingBlob(),
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('legacy-recording-grant-draft'),
    }))

    const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
    await runTransaction(database, ['recordingGrants'], 'readwrite', async (transaction) => {
      const stored = await readRecord<StoredGrant>(transaction, 'recordingGrants', grant.grantId)
      if (!stored) throw new Error('The acquired grant should exist before simulating legacy storage.')
      const legacy = { ...stored } as Omit<StoredGrant, 'recordingActorId'> & { recordingActorId?: string }
      delete legacy.recordingActorId
      await writeRecord(transaction, 'recordingGrants', legacy as StoredGrant)
    })
    database.close()

    const beforeExpiry = expectOk(await harness.services.recording.loadContext(projectId))
    expect(await harness.services.recording.renewAccess({
      projectId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: beforeExpiry.project.revision,
      operationId: operationId('legacy-recording-grant-renew'),
    })).toMatchObject({ status: 'error', error: { code: 'lease-held' } })
    expect(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: beforeExpiry.project.revision,
      operationId: operationId('legacy-recording-grant-blocked-acquire'),
    })).toMatchObject({ status: 'error', error: { code: 'lease-held' } })

    harness.advance(45_001)
    const afterExpiry = expectOk(await harness.services.recording.loadContext(projectId))
    const reacquired = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: afterExpiry.project.revision,
      operationId: operationId('legacy-recording-grant-reacquire'),
    }))
    expect(reacquired.grantId).not.toBe(grant.grantId)
    expect(reacquired.fenceToken).toBeGreaterThan(grant.fenceToken)
    expect(expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))?.candidate.id)
      .toBe(saved.candidate.id)
  })

  it('accepts the final initial take on explicit Save and leave before releasing the recording grant', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'final-leave@example.test')
    const final = await leaveFinalGap(harness, projectId, 'leave')
    const resolution = expectOk(await harness.services.recording.resolveLeave({
      projectId,
      turnId: final.turn.id,
      action: 'save-and-leave',
      candidate: final.candidate,
      blob: final.blob,
      grantId: final.access.grantId,
      expectedGrantRevision: final.access.revision,
      expectedProjectRevision: final.current.project.revision,
      operationId: operationId('save-final-and-leave'),
    }))
    expect(resolution).toMatchObject({
      action: 'save-and-leave',
      disposition: 'take-accepted',
      acceptedTakeId: expect.any(String),
      initialAssemblyAuthorizationId: expect.any(String),
      grantReleased: true,
    })
    const completed = expectOk(await harness.services.recording.loadContext(projectId))
    expect(completed.missingAcceptedCount).toBe(0)
  })

  it('reconciles an unknown final Save and leave before the requested sign-out can proceed', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'unknown-final-leave@example.test')
    const final = await leaveFinalGap(harness, projectId, 'unknown-leave')
    const leaveId = operationId('unknown-save-final-and-leave')
    await harness.queueUnknown(leaveId)
    const result = await harness.services.recording.resolveLeave({
      projectId,
      turnId: final.turn.id,
      action: 'save-and-leave',
      candidate: final.candidate,
      blob: final.blob,
      grantId: final.access.grantId,
      expectedGrantRevision: final.access.revision,
      expectedProjectRevision: final.current.project.revision,
      operationId: leaveId,
    })
    expect(result).toMatchObject({ status: 'unknown', operationId: leaveId })
    const reconciled = expectOk(await harness.services.operations.resolve<typeof result extends { status: 'ok'; data: infer T } ? T : never>(leaveId))
    expect(reconciled).toMatchObject({
      state: 'committed',
      result: {
        action: 'save-and-leave',
        disposition: 'take-accepted',
        initialAssemblyAuthorizationId: expect.any(String),
        grantReleased: true,
      },
    })
    expect(expectOk(await harness.services.recording.loadContext(projectId)).missingAcceptedCount).toBe(0)
  })

  it('releases recording with an existing recoverable draft without duplicating its unique candidate identity', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'save-existing-draft-and-leave@example.test')
    const initial = expectOk(await harness.services.recording.loadContext(projectId))
    const turn = initial.turns[0]
    const grant = expectOk(await harness.services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('save-existing-draft-acquire'),
    }))
    const candidate = candidateFor(projectId, turn, 'save-existing-draft')
    const blob = recordingBlob()
    const saved = expectOk(await harness.services.recording.persistDraft({
      projectId,
      turnId: turn.id,
      candidate,
      blob,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: initial.project.revision,
      operationId: operationId('save-existing-draft-persist'),
    }))
    const beforeLeave = expectOk(await harness.services.recording.loadContext(projectId))
    const resolution = expectOk(await harness.services.recording.resolveLeave({
      projectId,
      turnId: turn.id,
      action: 'save-and-leave',
      candidate: saved.candidate,
      blob,
      draftId: saved.candidate.draftId,
      grantId: grant.grantId,
      expectedGrantRevision: grant.revision,
      expectedProjectRevision: beforeLeave.project.revision,
      operationId: operationId('save-existing-draft-leave'),
    }))

    expect(resolution).toMatchObject({
      action: 'save-and-leave',
      disposition: 'draft-saved',
      draftId: saved.candidate.draftId,
      draftDiscarded: false,
      grantReleased: true,
    })
    const restored = expectOk(await harness.services.recording.restoreDraft({ projectId, turnId: turn.id }))
    expect(restored).not.toBeNull()
    expect(restored!.candidate.id).toBe(saved.candidate.id)
    expect(restored!.blob.size).toBe(blob.size)
    expect(expectOk(await harness.services.recording.loadContext(projectId))).toMatchObject({ acceptedTakeCount: 0 })
  })

  it('separates draft persistence from acceptance, authorizes the complete snapshot once, and pins result generations', async () => {
    const harness = createServiceTestHarness()
    const projectId = await prepareProject(harness, 'recording-result@example.test')
    const { authorizationId } = await acceptAllTurns(harness, projectId, 'happy')

    const projectBeforeAssembly = expectOk(await harness.services.projects.open(projectId))
    await harness.queueUnknown(operationId('assemble-unknown-result'))
    const assembly = await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: projectBeforeAssembly.revision,
      operationId: operationId('assemble-unknown-result'),
    })
    expect(assembly).toMatchObject({ status: 'ok', data: { state: 'committed', result: { state: 'complete' } } })
    const reconciled = expectOk(await harness.services.operations.resolve(operationId('assemble-unknown-result')))
    expect(reconciled).toMatchObject({ state: 'committed', result: { state: 'complete' } })

    const firstResult = expectOk(await harness.services.results.load(projectId))
    expect(firstResult.currentGeneration).toMatchObject({ fixtureKey: 'resultGeneration1', current: true, note: 'synthetic-mock-scenario' })
    expect(firstResult.retryAvailable).toBe(false)
    const firstGenerationId = firstResult.currentGeneration!.id
    const firstPlayback = expectOk(await harness.services.results.loadPlayback({ projectId, displayedGenerationId: firstGenerationId }))
    expect(firstPlayback.descriptor).toMatchObject({ generationId: firstGenerationId, url: '/media/result-generation-001.mp4', note: 'synthetic-mock-scenario' })
    const download = expectOk(await harness.services.results.requestDownload({
      projectId,
      displayedGenerationId: firstGenerationId,
      operationId: operationId('download-first-generation'),
    }))
    expect(download).toMatchObject({ generationId: firstGenerationId, fileName: 'result-source.mp4' })

    const projectBeforeRead = expectOk(await harness.services.projects.open(projectId))
    const activityBeforeRead = projectBeforeRead.lastActivityAt
    expectOk(await harness.services.results.load(projectId))
    expectOk(await harness.services.results.refreshPlayback({ projectId, displayedGenerationId: firstGenerationId }))
    expect(expectOk(await harness.services.projects.open(projectId)).lastActivityAt).toBe(activityBeforeRead)

    const completedAuthorization = expectOk(await harness.services.recording.authorizeCompletedRevision({
      projectId,
      expectedProjectRevision: projectBeforeRead.revision,
      action: 'to-result',
      operationId: operationId('authorize-completed-result'),
    }))
    const beforeSecondAssembly = expectOk(await harness.services.projects.open(projectId))
    expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId: completedAuthorization.id,
      expectedProjectRevision: beforeSecondAssembly.revision,
      operationId: operationId('assemble-second-generation'),
    }))
    const secondResult = expectOk(await harness.services.results.load(projectId))
    expect(secondResult.currentGeneration).toMatchObject({ fixtureKey: 'resultGeneration2', current: true })
    expect(secondResult.currentGeneration!.id).not.toBe(firstGenerationId)
    const pinnedPlayback = expectOk(await harness.services.results.loadPlayback({ projectId, displayedGenerationId: firstGenerationId }))
    expect(pinnedPlayback).toMatchObject({ generation: { id: firstGenerationId }, descriptor: { generationId: firstGenerationId, url: '/media/result-generation-001.mp4' } })
    const pinnedDownload = expectOk(await harness.services.results.requestDownload({
      projectId,
      displayedGenerationId: firstGenerationId,
      operationId: operationId('download-pinned-generation'),
    }))
    expect(pinnedDownload.generationId).toBe(firstGenerationId)
  })

  it('automatically retries a failed first assembly within the same lineage', async () => {
    const harness = createServiceTestHarness({ scenario: 'result-failure-first-attempt' })
    const projectId = await prepareProject(harness, 'recording-retry@example.test')
    const { authorizationId } = await acceptAllTurns(harness, projectId, 'retry')
    const project = expectOk(await harness.services.projects.open(projectId))
    const initialOperationId = operationId('assemble-first-fails')
    const retried = expectOk(await harness.services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: project.revision,
      operationId: initialOperationId,
    }))
    expect(retried).toMatchObject({ state: 'committed', result: { state: 'complete' } })
    expect(retried.id).not.toBe(initialOperationId)
    const recovered = expectOk(await harness.services.results.load(projectId))
    expect(recovered.retryAvailable).toBe(false)
    expect(recovered.retryLineageId).toBe(initialOperationId)
    expect(recovered.currentGeneration).toMatchObject({ fixtureKey: 'resultGeneration1', current: true })
  })
})
