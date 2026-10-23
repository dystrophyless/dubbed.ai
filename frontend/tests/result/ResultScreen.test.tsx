import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import type {
  GenerationId,
  MediaId,
  OperationId,
  OwnedProject,
  PlaybackDescriptor,
  ProjectId,
  ResultGeneration,
  Revision,
  ResultService,
} from '../../src/services/contracts'
import { ResultScreen } from '../../src/features/result/ResultScreen'

const projectId = 'project-result-test' as ProjectId
const projectRevision = 4 as Revision
const generation1 = makeGeneration('generation-1', 1)
const generation2 = makeGeneration('generation-2', 2)

function makeGeneration(id: string, revision: number): ResultGeneration {
  return {
    id: id as GenerationId,
    projectId,
    revision: revision as Revision,
    mediaId: `media-${id}` as MediaId,
    durationMs: 8_500,
    width: 640,
    height: 360,
    current: true,
    fixtureKey: `resultGeneration${revision}`,
    note: 'synthetic-mock-scenario',
  }
}

function makeProject(state: 'complete' | 'assembling' | 'failed' = 'complete'): OwnedProject {
  return {
    id: projectId,
    title: 'Sample project',
    revision: projectRevision,
    state,
  } as OwnedProject
}

function descriptor(generation: ResultGeneration, url: string): PlaybackDescriptor {
  return {
    projectId,
    generationId: generation.id,
    mediaId: generation.mediaId,
    url,
    mediaType: 'video/mp4',
    durationMs: generation.durationMs,
    revision: generation.revision,
    note: 'synthetic-mock-scenario',
  }
}

function loadedResult(options: {
  generation?: ResultGeneration
  state?: 'complete' | 'assembling' | 'failed'
  operation?: { id: OperationId; state: 'pending' | 'rejected'; revision: Revision }
  retryLineageId?: OperationId
  retryAvailable?: boolean
} = {}) {
  return {
    project: makeProject(options.state),
    currentGeneration: options.generation,
    operation: options.operation,
    retryLineageId: options.retryLineageId,
    retryAvailable: options.retryAvailable ?? false,
  }
}

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function renderResult(results: ResultService, operations?: FeatureScreenProps['services']['operations']) {
  const props = {
    route: routes.project(projectId, 'result'),
    locale: 'en',
    services: operations ? { results, operations } : { results },
    navigate: vi.fn().mockResolvedValue(true),
  } as unknown as FeatureScreenProps
  return { ...render(<ResultScreen {...props} />), props }
}

afterEach(() => vi.restoreAllMocks())
beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})

describe('Result screen', () => {
  it('keeps the playing generation until the user chooses Watch new', async () => {
    const load = vi.fn()
      .mockResolvedValueOnce(ok(loadedResult({ generation: generation1, state: 'assembling' })))
      .mockResolvedValue(ok(loadedResult({ generation: generation2, state: 'assembling' })))
    const loadPlayback = vi.fn(async ({ displayedGenerationId }: { displayedGenerationId: GenerationId }) => {
      const generation = displayedGenerationId === generation1.id ? generation1 : generation2
      return ok({ generation, descriptor: descriptor(generation, `blob:${generation.id}`) })
    })
    const results = {
      load,
      loadPlayback,
      refreshPlayback: vi.fn(),
      requestDownload: vi.fn(),
      retry: vi.fn(),
    } as unknown as ResultService

    const view = renderResult(results)
    const player = await screen.findByLabelText('Finished dubbed video')
    fireEvent.play(player)
    expect(player).toHaveAttribute('src', `blob:${generation1.id}`)

    const watchNew = await screen.findByRole('button', { name: 'Watch new' }, { timeout: 3000 })
    expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', `blob:${generation1.id}`)
    fireEvent.click(watchNew)

    await waitFor(() => expect(loadPlayback).toHaveBeenCalledWith({ projectId, displayedGenerationId: generation2.id }))
    await waitFor(() => expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', `blob:${generation2.id}`))
    view.unmount()
  })

  it('pins a download request to the generation displayed when the button is activated', async () => {
    const requestDownload = vi.fn(async () => ok({
      generationId: generation1.id,
      descriptor: descriptor(generation1, 'blob:download'),
      fileName: 'dubbed-result.mp4',
    }))
    const results = {
      load: vi.fn().mockResolvedValue(ok(loadedResult({ generation: generation1 }))),
      loadPlayback: vi.fn().mockResolvedValue(ok({ generation: generation1, descriptor: descriptor(generation1, 'blob:playback') })),
      refreshPlayback: vi.fn(),
      requestDownload,
      retry: vi.fn(),
    } as unknown as ResultService
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderResult(results)
    await screen.findByLabelText('Finished dubbed video')
    fireEvent.click(screen.getByRole('button', { name: 'Download MP4' }))

    await waitFor(() => expect(requestDownload).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      displayedGenerationId: generation1.id,
    })))
    expect(await screen.findByText('Download requested.')).toBeInTheDocument()
  })

  it('keeps a failed download pinned through a same-id refresh and Watch new', async () => {
    let finishFirstRequest!: (result: unknown) => void
    const firstRequest = new Promise<unknown>((resolve) => { finishFirstRequest = resolve })
    const requestDownload = vi.fn()
      .mockImplementationOnce(() => firstRequest)
      .mockImplementation(async ({ displayedGenerationId }: { displayedGenerationId: GenerationId }) => {
        const generation = displayedGenerationId === generation1.id ? generation1 : generation2
        return ok({
          generationId: generation.id,
          descriptor: descriptor(generation, 'blob:download'),
          fileName: 'dubbed-result.mp4',
        })
      })
    const load = vi.fn()
      .mockResolvedValueOnce(ok(loadedResult({ generation: generation1, state: 'assembling' })))
      .mockResolvedValue(ok(loadedResult({ generation: generation2, state: 'assembling' })))
    const loadPlayback = vi.fn(async ({ displayedGenerationId }: { displayedGenerationId: GenerationId }) => {
      const generation = displayedGenerationId === generation1.id ? generation1 : generation2
      return ok({ generation, descriptor: descriptor(generation, `blob:${generation.id}`) })
    })
    const results = {
      load,
      loadPlayback,
      refreshPlayback: vi.fn(),
      requestDownload,
      retry: vi.fn(),
    } as unknown as ResultService
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const view = renderResult(results)
    const oldPlayer = await screen.findByLabelText('Finished dubbed video')
    fireEvent.play(oldPlayer)
    fireEvent.click(screen.getByRole('button', { name: 'Download MP4' }))
    await waitFor(() => expect(requestDownload).toHaveBeenCalledTimes(1))
    const firstInput = requestDownload.mock.calls[0]?.[0] as { operationId: OperationId; displayedGenerationId: GenerationId }
    expect(firstInput.displayedGenerationId).toBe(generation1.id)

    const watchNew = await screen.findByRole('button', { name: 'Watch new' }, { timeout: 3000 })
    expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', `blob:${generation1.id}`)

    const refreshedGeneration2 = { ...generation2, revision: 3 as Revision }
    const refreshedLoad = vi.fn().mockResolvedValue(ok(loadedResult({ generation: refreshedGeneration2, state: 'assembling' })))
    const refreshedResults = { ...results, load: refreshedLoad } as unknown as ResultService
    view.rerender(<ResultScreen {...view.props} services={{ results: refreshedResults } as FeatureScreenProps['services']} />)
    await waitFor(() => expect(refreshedLoad).toHaveBeenCalled())
    expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', `blob:${generation1.id}`)

    finishFirstRequest({
      status: 'error',
      error: { code: 'adapter-unavailable', message: 'Temporary delivery failure.', retry: 'none' },
    })
    await screen.findByRole('button', { name: 'Retry download version 1' })
    fireEvent.click(watchNew)

    await screen.findByLabelText('Finished dubbed video')
    await waitFor(() => expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', `blob:${generation2.id}`))
    expect((screen.getByLabelText('Finished dubbed video') as HTMLVideoElement).paused).toBe(true)
    expect(requestDownload).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Retry download version 1' }))
    await waitFor(() => expect(requestDownload).toHaveBeenCalledTimes(2))
    const retryInput = requestDownload.mock.calls[1]?.[0] as { operationId: OperationId; displayedGenerationId: GenerationId }
    expect(retryInput.displayedGenerationId).toBe(generation1.id)
    expect(retryInput.operationId).not.toBe(firstInput.operationId)
    expect(results.retry).not.toHaveBeenCalled()
  })

  it('reconciles an uncertain download by its original operation ID before retrying it', async () => {
    const requestDownload = vi.fn()
      .mockImplementationOnce(async ({ operationId }: { operationId: OperationId }) => ({
        status: 'unknown',
        operationId,
        message: 'The download request outcome is not confirmed.',
      }))
      .mockImplementation(async () => ok({
        generationId: generation1.id,
        descriptor: descriptor(generation1, 'blob:download'),
        fileName: 'dubbed-result.mp4',
      }))
    const resolve = vi.fn(async (operationId: OperationId) => ok({
      state: 'not-started' as const,
      operationId,
      safeToRetrySameId: true as const,
    }))
    const results = {
      load: vi.fn().mockResolvedValue(ok(loadedResult({ generation: generation1 }))),
      loadPlayback: vi.fn().mockResolvedValue(ok({ generation: generation1, descriptor: descriptor(generation1, 'blob:playback') })),
      refreshPlayback: vi.fn(),
      requestDownload,
      retry: vi.fn(),
    } as unknown as ResultService
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    renderResult(results, { resolve } as unknown as FeatureScreenProps['services']['operations'])
    await screen.findByLabelText('Finished dubbed video')
    fireEvent.click(screen.getByRole('button', { name: 'Download MP4' }))
    await waitFor(() => expect(requestDownload).toHaveBeenCalledTimes(1))
    const firstInput = requestDownload.mock.calls[0]?.[0] as { operationId: OperationId; displayedGenerationId: GenerationId }
    const reconcileButton = await screen.findByRole('button', { name: 'Check and retry download version 1' })

    fireEvent.click(reconcileButton)
    await waitFor(() => expect(resolve).toHaveBeenCalledWith(firstInput.operationId))
    await waitFor(() => expect(requestDownload).toHaveBeenCalledTimes(2))
    const retryInput = requestDownload.mock.calls[1]?.[0] as { operationId: OperationId; displayedGenerationId: GenerationId }
    expect(retryInput.displayedGenerationId).toBe(generation1.id)
    expect(retryInput.operationId).toBe(firstInput.operationId)
  })

  it('does not deliver a download response after leaving the result screen', async () => {
    let finishDownload!: (result: Awaited<ReturnType<ResultService['requestDownload']>>) => void
    const requestDownload = vi.fn(() => new Promise<Awaited<ReturnType<ResultService['requestDownload']>>>((resolve) => {
      finishDownload = resolve
    }))
    const results = {
      load: vi.fn().mockResolvedValue(ok(loadedResult({ generation: generation1 }))),
      loadPlayback: vi.fn().mockResolvedValue(ok({ generation: generation1, descriptor: descriptor(generation1, 'blob:playback') })),
      refreshPlayback: vi.fn(),
      requestDownload,
      retry: vi.fn(),
    } as unknown as ResultService
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    const view = renderResult(results)
    await screen.findByLabelText('Finished dubbed video')
    fireEvent.click(screen.getByRole('button', { name: 'Download MP4' }))
    await waitFor(() => expect(requestDownload).toHaveBeenCalledTimes(1))
    view.unmount()

    finishDownload(ok({
      generationId: generation1.id,
      descriptor: descriptor(generation1, 'blob:download'),
      fileName: 'dubbed-result.mp4',
    }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(click).not.toHaveBeenCalled()
  })

  it('retries only the failed assembly lineage returned by the service', async () => {
    const operationId = 'assembly-failed-2' as OperationId
    const lineageId = 'assembly-lineage' as OperationId
    const retry = vi.fn().mockResolvedValue(ok({}))
    const results = {
      load: vi.fn().mockResolvedValue(ok(loadedResult({
        state: 'failed',
        operation: { id: operationId, state: 'rejected', revision: 2 as Revision },
        retryLineageId: lineageId,
        retryAvailable: true,
      }))),
      loadPlayback: vi.fn(),
      refreshPlayback: vi.fn(),
      requestDownload: vi.fn(),
      retry,
    } as unknown as ResultService

    renderResult(results)
    fireEvent.click(await screen.findByRole('button', { name: 'Repeat assembly' }))

    await waitFor(() => expect(retry).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      priorOperationId: operationId,
      retryLineageId: lineageId,
      expectedProjectRevision: projectRevision,
    })))
    expect(retry).toHaveBeenCalledTimes(1)
  })

  it('keeps the previous player and directs stale-snapshot recovery back to recording', async () => {
    const operationId = 'automatic-retry-failed' as OperationId
    const lineageId = 'assembly-lineage' as OperationId
    const load = vi.fn()
      .mockResolvedValueOnce(ok(loadedResult({
        generation: generation1,
        state: 'failed',
        operation: { id: operationId, state: 'rejected', revision: 3 as Revision },
        retryLineageId: lineageId,
        retryAvailable: true,
      })))
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'stale-source', message: 'The authorized input changed.', retry: 'none' },
      })
    const retry = vi.fn().mockResolvedValue(ok({}))
    const results = {
      load,
      loadPlayback: vi.fn().mockResolvedValue(ok({ generation: generation1, descriptor: descriptor(generation1, 'blob:previous') })),
      refreshPlayback: vi.fn(),
      requestDownload: vi.fn(),
      retry,
    } as unknown as ResultService

    const view = renderResult(results)
    await screen.findByLabelText('Finished dubbed video')
    fireEvent.click(screen.getByRole('button', { name: 'Repeat assembly' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The accepted recordings changed after this assembly was authorized')
    expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', 'blob:previous')
    expect(screen.getByRole('button', { name: 'Repeat assembly' })).toBeDisabled()
    expect(retry).toHaveBeenCalledTimes(1)

    const returnActions = screen.getAllByRole('button', { name: 'Return to recording' })
    fireEvent.click(returnActions[returnActions.length - 1]!)
    expect(view.props.navigate).toHaveBeenCalledWith(routes.project(projectId, 'record'))
  })

  it('reconciles an unknown manual retry with the original operation ID and blocks double submission', async () => {
    const operationId = 'automatic-retry-failed' as OperationId
    const lineageId = 'assembly-lineage' as OperationId
    let finishUnknown!: () => void
    const retry = vi.fn()
      .mockImplementationOnce((input: Parameters<ResultService['retry']>[0]) =>
        new Promise<Awaited<ReturnType<ResultService['retry']>>>((resolve) => {
          finishUnknown = () => resolve({ status: 'unknown', operationId: input.operationId, message: 'Still unresolved.' })
        }))
      .mockImplementation((input: Parameters<ResultService['retry']>[0]) =>
        Promise.resolve({ status: 'unknown', operationId: input.operationId, message: 'Still unresolved.' }))
    const results = {
      load: vi.fn().mockResolvedValue(ok(loadedResult({
        generation: generation1,
        state: 'failed',
        operation: { id: operationId, state: 'rejected', revision: 3 as Revision },
        retryLineageId: lineageId,
        retryAvailable: true,
      }))),
      loadPlayback: vi.fn().mockResolvedValue(ok({ generation: generation1, descriptor: descriptor(generation1, 'blob:previous') })),
      refreshPlayback: vi.fn(),
      requestDownload: vi.fn(),
      retry,
    } as unknown as ResultService

    renderResult(results)
    await screen.findByLabelText('Finished dubbed video')
    const repeat = screen.getByRole('button', { name: 'Repeat assembly' })
    fireEvent.click(repeat)
    fireEvent.click(repeat)
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(1))
    const firstInput = retry.mock.calls[0]?.[0] as Parameters<ResultService['retry']>[0]
    expect(firstInput.priorOperationId).toBe(operationId)
    expect(firstInput.retryLineageId).toBe(lineageId)
    finishUnknown()

    fireEvent.click(await screen.findByRole('button', { name: 'Check retry status' }))
    await waitFor(() => expect(retry).toHaveBeenCalledTimes(2))
    const secondInput = retry.mock.calls[1]?.[0] as Parameters<ResultService['retry']>[0]
    expect(secondInput.operationId).toBe(firstInput.operationId)
    expect(secondInput.priorOperationId).toBe(firstInput.priorOperationId)
    expect(secondInput.retryLineageId).toBe(firstInput.retryLineageId)
    expect(screen.getByLabelText('Finished dubbed video')).toHaveAttribute('src', 'blob:previous')
  })
})
