import { describe, expect, it } from 'vitest'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function signIn(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
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
}

describe('project title and source replacement service boundaries', () => {
  it('returns ServiceResult for invalid upload and rename titles at the visible-grapheme boundary', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'project-title@example.test')

    const title100 = `${'🎬'.repeat(99)}e\u0301`
    const title101 = `${title100}x`
    const invalidInitialUpload = await harness.services.uploads.commitInitial({
      file: fileWithBytes('valid-source.mp4', [1, 2, 3]),
      title: title101,
      facts: sourceFacts(),
      operationId: operationId('upload-too-long-title'),
    })
    expect(invalidInitialUpload).toMatchObject({ status: 'error', error: { code: 'validation' } })
    expect(expectOk(await harness.services.projects.list()).capacity.used).toBe(0)

    const uploaded = expectOk(await harness.services.uploads.commitInitial({
      file: fileWithBytes('valid-source.mp4', [1, 2, 3]),
      title: 'Initial title',
      facts: sourceFacts(),
      operationId: operationId('upload-valid-title'),
    }))
    const renamed = await harness.services.projects.rename({
      projectId: uploaded.project.id,
      title: title100,
      expectedRevision: uploaded.project.revision,
      operationId: operationId('rename-100-graphemes'),
    })
    expect(renamed).toMatchObject({ status: 'ok', data: { title: title100, titleSource: 'manual' } })

    const beforeInvalidRename = expectOk(await harness.services.projects.open(uploaded.project.id))
    const rejected = await harness.services.projects.rename({
      projectId: uploaded.project.id,
      title: title101,
      expectedRevision: beforeInvalidRename.revision,
      operationId: operationId('rename-101-graphemes'),
    })
    expect(rejected).toMatchObject({ status: 'error', error: { code: 'validation' } })
    expect(expectOk(await harness.services.projects.open(uploaded.project.id))).toEqual(beforeInvalidRename)
  })

  it('regenerates only filename-derived titles and preserves manual titles on source replacement', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'replacement@example.test')

    const automatic = expectOk(await harness.services.uploads.commitInitial({
      file: fileWithBytes('original-scene.mp4', [1, 2, 3]),
      facts: sourceFacts(),
      operationId: operationId('upload-auto-title'),
    }))
    const invalidReplacement = await harness.services.uploads.replaceSource({
      projectId: automatic.project.id,
      file: fileWithBytes('broken-scene.mp4', [4, 5, 6]),
      facts: { ...sourceFacts(), hasAudio: false },
      expectedProjectRevision: automatic.project.revision,
      operationId: operationId('replace-invalid-audio'),
    })
    expect(invalidReplacement).toMatchObject({ status: 'error', error: { code: 'media-invalid' } })
    const afterInvalid = expectOk(await harness.services.projects.open(automatic.project.id))
    expect(afterInvalid).toEqual(automatic.project)
    expect(expectOk(await harness.services.projects.list()).capacity.used).toBe(1)
    expect([...new Uint8Array(await expectOk(await harness.services.uploads.getSource(automatic.project.id)).blob.arrayBuffer())]).toEqual([1, 2, 3])

    const replacedAutomatic = expectOk(await harness.services.uploads.replaceSource({
      projectId: automatic.project.id,
      file: fileWithBytes('replacement-scene.mp4', [7, 8, 9]),
      facts: sourceFacts(),
      expectedProjectRevision: automatic.project.revision,
      operationId: operationId('replace-auto-title'),
    }))
    expect(replacedAutomatic.project).toMatchObject({ title: 'replacement-scene', titleSource: 'filename' })

    const manual = expectOk(await harness.services.uploads.commitInitial({
      file: fileWithBytes('same-visible-title.mp4', [10, 11, 12]),
      title: 'same-visible-title',
      facts: sourceFacts(),
      operationId: operationId('upload-manual-same-title'),
    }))
    expect(manual.project.titleSource).toBe('manual')
    const replacedManual = expectOk(await harness.services.uploads.replaceSource({
      projectId: manual.project.id,
      file: fileWithBytes('different-source.mp4', [13, 14, 15]),
      facts: sourceFacts(),
      expectedProjectRevision: manual.project.revision,
      operationId: operationId('replace-manual-title'),
    }))
    expect(replacedManual.project).toMatchObject({ title: 'same-visible-title', titleSource: 'manual' })
  })

  it('allows a fresh interval quote after initial cancellation without unlocking source replacement', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'post-launch-replacement@example.test')
    const uploaded = expectOk(await harness.services.uploads.commitInitial({
      file: fileWithBytes('launch-source.mp4', [1, 3, 5]),
      facts: sourceFacts(),
      operationId: operationId('upload-launch-source'),
    }))
    const quote = expectOk(await harness.services.preparation.quote({
      projectId: uploaded.project.id,
      expectedProjectRevision: uploaded.project.revision,
      expectedActivePreparationRevision: uploaded.project.preparationRevision,
      operationId: operationId('quote-launch-source'),
    }))
    const startId = operationId('start-launch-source')
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
      operationId: startId,
    }))
    const whilePending = expectOk(await harness.services.projects.open(uploaded.project.id))
    expect(await harness.services.preparation.updateSelection({
      projectId: uploaded.project.id,
      startMs: 1,
      endMs: 1_001,
      expectedProjectRevision: whilePending.revision,
      expectedSourceRevision: whilePending.sourceRevision,
      operationId: operationId('selection-during-initial-attempt'),
    })).toMatchObject({ status: 'error', error: { code: 'forbidden' } })
    const cancelQuote = expectOk(await harness.services.preparation.cancellationQuote({
      projectId: uploaded.project.id,
      targetOperationId: startId,
      expectedRevision: started.operation.revision,
      operationId: operationId('quote-cancel-launch'),
    }))
    expectOk(await harness.services.preparation.cancel({
      projectId: uploaded.project.id,
      targetOperationId: startId,
      cancellationQuoteId: cancelQuote.quoteId,
      expectedRevision: started.operation.revision,
      explicitConfirmation: true,
      operationId: operationId('cancel-launch-source'),
    }))

    const afterCancellation = expectOk(await harness.services.projects.open(uploaded.project.id))
    const selectionAfterCancellation = expectOk(await harness.services.preparation.updateSelection({
      projectId: uploaded.project.id,
      startMs: 1,
      endMs: 1_001,
      expectedProjectRevision: afterCancellation.revision,
      expectedSourceRevision: afterCancellation.sourceRevision,
      operationId: operationId('selection-after-cancelled-launch'),
    }))
    expect(selectionAfterCancellation.selection).toMatchObject({ startMs: 1, endMs: 1_001, revision: 1 })
    const rejected = await harness.services.uploads.replaceSource({
      projectId: uploaded.project.id,
      file: fileWithBytes('replacement-after-cancel.mp4', [2, 4, 6]),
      facts: sourceFacts(),
      expectedProjectRevision: selectionAfterCancellation.revision,
      operationId: operationId('replace-after-cancelled-launch'),
    })
    expect(rejected).toMatchObject({ status: 'error', error: { code: 'forbidden' } })

    const current = expectOk(await harness.services.projects.open(uploaded.project.id))
    expect(current).toEqual(selectionAfterCancellation)
    const freshQuote = expectOk(await harness.services.preparation.quote({
      projectId: current.id,
      expectedProjectRevision: current.revision,
      expectedActivePreparationId: current.preparationId,
      expectedActivePreparationRevision: current.preparationRevision,
      operationId: operationId('quote-after-cancelled-launch'),
    }))
    expect(freshQuote).toMatchObject({ attemptClass: 'paid-reprocessing', durationMs: 1_000, credits: 1 })
    const secondStartId = operationId('start-after-cancelled-launch')
    const secondStarted = expectOk(await harness.services.preparation.start({
      quoteId: freshQuote.id,
      expectedProjectRevision: current.revision,
      expectedSourceRevision: current.sourceRevision,
      expectedActivePreparationId: freshQuote.activePreparationId,
      expectedActivePreparationRevision: freshQuote.activePreparationRevision,
      acknowledgedDraftIds: freshQuote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: false,
      draftLossAcknowledged: false,
      explicitAuthorization: true,
      operationId: secondStartId,
    }))
    expect(secondStarted).toMatchObject({ operation: { id: secondStartId, state: 'pending' } })
    const replay = expectOk(await harness.services.preparation.start({
      quoteId: freshQuote.id,
      expectedProjectRevision: current.revision,
      expectedSourceRevision: current.sourceRevision,
      expectedActivePreparationId: freshQuote.activePreparationId,
      expectedActivePreparationRevision: freshQuote.activePreparationRevision,
      acknowledgedDraftIds: freshQuote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: false,
      draftLossAcknowledged: false,
      explicitAuthorization: true,
      operationId: secondStartId,
    }))
    expect(replay.operation.id).toBe(secondStarted.operation.id)
    expect(expectOk(await harness.services.credits.history()).filter((entry) =>
      entry.relatedOperationId === secondStartId && entry.kind === 'processing-reservation')).toHaveLength(1)
    expect(expectOk(await harness.services.projects.list()).capacity.used).toBe(1)
    expect([...new Uint8Array(await expectOk(await harness.services.uploads.getSource(uploaded.project.id)).blob.arrayBuffer())]).toEqual([1, 3, 5])
  })
})
