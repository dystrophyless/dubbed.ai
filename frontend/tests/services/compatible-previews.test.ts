import { readFileSync } from 'node:fs'
import { File as NativeFile } from 'node:buffer'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MEDIA_FIXTURE_MANIFEST } from '../../src/media/fixtures'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

const sourceFixtureBytes = readFileSync(resolve(process.cwd(), 'public/media/source-dialogue.mp4'))

async function signIn(harness: ReturnType<typeof createServiceTestHarness>, email: string) {
  const requestId = operationId(`preview-register-${email}`)
  expectOk(await harness.services.registration.start({
    email,
    password: 'correct-horse',
    operationId: requestId,
  }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId(`preview-verify-${email}`),
  }))
}

function sourceFixtureFile() {
  return new NativeFile([sourceFixtureBytes], 'source-dialogue.mp4', { type: 'video/mp4' }) as unknown as File
}

function fixtureFacts() {
  const asset = MEDIA_FIXTURE_MANIFEST.assets.source
  return {
    ...sourceFacts(asset.requestedCaptureWindowMs),
    width: asset.canvasWidth,
    height: asset.canvasHeight,
  }
}

async function uploadFixture(harness: ReturnType<typeof createServiceTestHarness>, operation: string) {
  return expectOk(await harness.services.uploads.commitInitial({
    file: sourceFixtureFile(),
    facts: fixtureFacts(),
    operationId: operationId(operation),
  }))
}

describe('fixture-bound compatible previews', () => {
  it('keeps the exact source identity and full moving scene timeline in a free synthetic ready descriptor', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'preview-ready@example.test')
    const uploaded = await uploadFixture(harness, 'preview-ready-upload')
    const beforeCredits = expectOk(await harness.services.credits.snapshot())

    const inspection = expectOk(await harness.services.previews.inspect({ projectId: uploaded.project.id }))
    expect(inspection).toMatchObject({
      accountId: uploaded.project.accountId,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      eligibility: 'supported-fixture',
      note: 'synthetic-mock-scenario',
    })
    expect(inspection.sourceSha256).toBe(MEDIA_FIXTURE_MANIFEST.assets.source.sha256)

    const requestId = operationId('preview-ready-request')
    const pending = expectOk(await harness.services.previews.request({
      projectId: uploaded.project.id,
      expectedProjectRevision: uploaded.project.revision,
      expectedSourceRevision: uploaded.project.sourceRevision,
      operationId: requestId,
    }))
    expect(pending).toMatchObject({ id: requestId, state: 'pending', attempt: 1 })

    const ready = expectOk(await harness.services.previews.observe({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      targetOperationId: requestId,
    }))
    expect(ready.state).toBe('ready')
    expect(ready.descriptor).toMatchObject({
      accountId: uploaded.project.accountId,
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      sourceSha256: MEDIA_FIXTURE_MANIFEST.assets.source.sha256,
      sourceByteLength: MEDIA_FIXTURE_MANIFEST.assets.source.bytes,
      sourceVideo: {
        url: MEDIA_FIXTURE_MANIFEST.assets.source.url,
        sha256: MEDIA_FIXTURE_MANIFEST.assets.source.sha256,
        byteLength: MEDIA_FIXTURE_MANIFEST.assets.source.bytes,
        width: 640,
        height: 360,
      },
      video: {
        url: MEDIA_FIXTURE_MANIFEST.assets.source.url,
        sha256: MEDIA_FIXTURE_MANIFEST.assets.source.sha256,
        byteLength: MEDIA_FIXTURE_MANIFEST.assets.source.bytes,
        width: 640,
        height: 360,
      },
      timeline: {
        sourceDurationMs: uploaded.project.sourceDurationMs,
        sections: [
          { id: 'turn-a', text: 'A blue light is on.', startMs: 1000, endMs: 2934.285714285714 },
          { id: 'turn-b', text: 'I hear it clearly.', startMs: 1500, endMs: 3399.229024943311 },
          { id: 'turn-c', text: 'We can begin now.', startMs: 5000, endMs: 6714.240362811792 },
        ],
      },
      conversionNote: 'synthetic-compatible-playback-simulation',
      note: 'synthetic-mock-scenario',
    })
    expect(ready.descriptor?.sourceDurationMs).toBe(uploaded.project.sourceDurationMs)
    expect(expectOk(await harness.services.previews.observe({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      targetOperationId: requestId,
    }))).toEqual(ready)
    expect(expectOk(await harness.services.credits.snapshot())).toEqual(beforeCredits)
  })

  it('only produces a transient error when explicitly requested, then retries the same source to ready', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'preview-retry@example.test')
    const uploaded = await uploadFixture(harness, 'preview-retry-upload')
    const beforeCredits = expectOk(await harness.services.credits.snapshot())

    const firstId = operationId('preview-transient-first')
    expectOk(await harness.services.previews.request({
      projectId: uploaded.project.id,
      expectedProjectRevision: uploaded.project.revision,
      expectedSourceRevision: uploaded.project.sourceRevision,
      scenario: 'preview-transient-error',
      operationId: firstId,
    }))
    const failed = expectOk(await harness.services.previews.observe({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      targetOperationId: firstId,
    }))
    expect(failed).toMatchObject({ state: 'error', attempt: 1, error: { code: 'simulated-transient', retryable: true } })

    const retryId = operationId('preview-transient-retry')
    const retry = expectOk(await harness.services.previews.retry({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      priorOperationId: firstId,
      expectedProjectRevision: uploaded.project.revision,
      operationId: retryId,
    }))
    expect(retry).toMatchObject({ id: retryId, state: 'pending', attempt: 2, scenario: 'preview-transient-error' })
    const ready = expectOk(await harness.services.previews.observe({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      targetOperationId: retryId,
    }))
    expect(ready.state).toBe('ready')
    expect(ready.descriptor?.sourceId).toBe(uploaded.project.sourceId)
    expect(expectOk(await harness.services.credits.snapshot())).toEqual(beforeCredits)
  })

  it('does not request a preview for arbitrary uploads, including same-size different bytes', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'preview-unsupported@example.test')
    const changedBytes = Buffer.from(sourceFixtureBytes)
    changedBytes[0] = changedBytes[0] ^ 0xff
    const uploaded = expectOk(await harness.services.uploads.commitInitial({
      file: new NativeFile([changedBytes], 'different.mp4', { type: 'video/mp4' }) as unknown as File,
      facts: fixtureFacts(),
      operationId: operationId('preview-unsupported-upload'),
    }))
    const inspection = expectOk(await harness.services.previews.inspect({ projectId: uploaded.project.id }))
    expect(inspection.eligibility).toBe('conversion-unavailable')
    expect(inspection.sourceSha256).not.toBe(MEDIA_FIXTURE_MANIFEST.assets.source.sha256)

    const requestId = operationId('preview-unsupported-request')
    const denied = await harness.services.previews.request({
      projectId: uploaded.project.id,
      expectedProjectRevision: uploaded.project.revision,
      expectedSourceRevision: uploaded.project.sourceRevision,
      operationId: requestId,
    })
    expect(denied).toMatchObject({ status: 'error', error: { code: 'unsupported' } })
    expect(expectOk(await harness.services.operations.resolve(requestId))).toMatchObject({
      state: 'not-started',
      operationId: requestId,
      safeToRetrySameId: true,
    })
  })

  it('rejects observation after the source revision changes', async () => {
    const harness = createServiceTestHarness()
    await signIn(harness, 'preview-stale@example.test')
    const uploaded = await uploadFixture(harness, 'preview-stale-upload')
    const requestId = operationId('preview-stale-request')
    expectOk(await harness.services.previews.request({
      projectId: uploaded.project.id,
      expectedProjectRevision: uploaded.project.revision,
      expectedSourceRevision: uploaded.project.sourceRevision,
      operationId: requestId,
    }))

    expectOk(await harness.services.uploads.replaceSource({
      projectId: uploaded.project.id,
      file: fileWithBytes('replacement.mp4', [8, 7, 6, 5]),
      facts: sourceFacts(),
      expectedProjectRevision: uploaded.project.revision,
      operationId: operationId('preview-stale-replacement'),
    }))
    expect(await harness.services.previews.observe({
      projectId: uploaded.project.id,
      sourceId: uploaded.project.sourceId,
      sourceRevision: uploaded.project.sourceRevision,
      targetOperationId: requestId,
    })).toMatchObject({ status: 'conflict', code: 'stale-source' })
  })
})
