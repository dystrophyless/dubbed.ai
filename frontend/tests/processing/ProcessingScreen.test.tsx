import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent } from '@testing-library/react'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import { ProcessingScreen } from '../../src/features/processing/ProcessingScreen'
import type {
  OwnedProject,
  PreparationSnapshot,
  ProjectId,
  Revision,
  Services,
} from '../../src/services/contracts'
import { ids } from '../../src/services/contracts'

const projectId = ids.project('processing-project') as ProjectId
const operationId = ids.operation('preparation-attempt')
const accountId = ids.account('account-one')

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function makeSnapshot(state: 'pending' | 'complete' | 'zero-turn', preservePrior = false): PreparationSnapshot {
  const revision = (state === 'pending' ? 2 : 8) as Revision
  const result = state === 'pending'
    ? { state: 'pending', preparationId: 'preparation-one' }
    : state === 'complete'
      ? { state: 'complete', preparationId: 'preparation-one', turnCount: 2 }
      : { state: 'complete', zeroTurns: true }
  const priorId = ids.preparation('prior-preparation')
  return {
    projectId,
    projectRevision: 19 as Revision,
    operation: {
      id: operationId,
      accountId,
      state: state === 'pending' ? 'pending' : 'committed',
      kind: 'preparation',
      result,
      revision,
      updatedAt: 1_000,
    },
    currentPreparationId: state === 'zero-turn' && !preservePrior ? undefined : priorId,
    currentPreparationRevision: 3 as Revision,
    priorUsablePreparationId: preservePrior ? priorId : undefined,
    turns: [],
    currentStage: { id: state, label: state === 'pending' ? 'Analyzing' : 'Complete', state: state === 'pending' ? 'running' : 'complete' },
    attemptClass: state === 'zero-turn' && !preservePrior ? 'initial' : 'paid-reprocessing',
    includedRetryAvailable: state === 'zero-turn' && !preservePrior,
    reprocessingLocked: false,
  }
}

function makeServices(observe: Services['preparation']['observe'], resolved = makeSnapshot('pending')) {
  const recordingProject = { id: projectId, state: 'recording' } as OwnedProject
  const preparation = {
    resolve: vi.fn().mockResolvedValue(ok(resolved)),
    observe: vi.fn(observe),
    activate: vi.fn().mockResolvedValue(ok(recordingProject)),
  }
  return {
    services: { preparation } as unknown as Services,
    preparation,
  }
}

function renderProcessing(services: Services) {
  window.history.replaceState({}, '', `/projects/${encodeURIComponent(projectId)}/processing`)
  const navigate = vi.fn().mockResolvedValue(true)
  const props = {
    route: routes.project(projectId, 'processing'),
    locale: 'en',
    identity: { status: 'signed-in', account: { id: accountId, email: 'processing@example.test' } },
    services,
    navigate,
    refreshIdentity: vi.fn(),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  } as unknown as FeatureScreenProps
  return { ...render(<ProcessingScreen {...props} />), navigate }
}

afterEach(() => {
  vi.useRealTimers()
  window.history.replaceState({}, '', '/')
  sessionStorage.clear()
})

describe('Processing screen status observation', () => {
  it('observes pending work automatically and activates using the authoritative project revision', async () => {
    vi.useFakeTimers()
    const complete = makeSnapshot('complete')
    const { services, preparation } = makeServices(vi.fn().mockResolvedValue(ok(complete)))
    const { navigate } = renderProcessing(services)

    await act(async () => { await Promise.resolve() })
    expect(screen.getByText('Preparation is in progress.')).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(900) })

    expect(preparation.observe).toHaveBeenCalledWith({ projectId, targetOperationId: operationId })
    expect(preparation.activate).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      targetOperationId: operationId,
      expectedRevision: 19,
      expectedActivePreparationId: ids.preparation('prior-preparation'),
      expectedActivePreparationRevision: 3,
    }))
    expect(navigate).toHaveBeenCalledWith(routes.project(projectId, 'record'))
  })

  it('does not activate a zero-turn completion and offers reprocess or another-video recovery', async () => {
    const zeroTurn = makeSnapshot('zero-turn')
    const { services, preparation } = makeServices(vi.fn(), zeroTurn)
    const { navigate } = renderProcessing(services)

    expect(await screen.findByText('No dialogue found. This run completed without creating recording turns.')).toBeTruthy()
    expect(screen.getByText('An included retry is available.')).toBeTruthy()
    expect(preparation.activate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Review the quote and try this section again' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Choose another video' })).toBeTruthy()
  })

  it('preserves an older preparation after zero-turn replacement and clears only this project for another video', async () => {
    const zeroTurn = makeSnapshot('zero-turn', true)
    const { services, preparation } = makeServices(vi.fn(), zeroTurn)
    const { navigate } = renderProcessing(services)
    const activeKey = `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`
    sessionStorage.setItem(activeKey, JSON.stringify({ accountId, projectId }))

    expect(await screen.findByText('The previous preparation and its saved draft remain available.')).toBeTruthy()
    expect(preparation.activate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Choose another video' }))

    expect(navigate).toHaveBeenCalledWith(routes.newDub())
    expect(sessionStorage.getItem(activeKey)).toBeNull()
  })

  it('ignores a completed observation after the user has left the matching processing route', async () => {
    vi.useFakeTimers()
    const complete = makeSnapshot('complete')
    let resolveObservation: ((result: ReturnType<typeof ok<PreparationSnapshot>>) => void) | undefined
    const observe = vi.fn(() => new Promise<ReturnType<typeof ok<PreparationSnapshot>>>((resolve) => {
      resolveObservation = resolve
    }))
    const { services, preparation } = makeServices(observe)
    const { navigate } = renderProcessing(services)

    await act(async () => { await Promise.resolve() })
    await act(async () => { await vi.advanceTimersByTimeAsync(900) })
    expect(observe).toHaveBeenCalledOnce()

    window.history.replaceState({}, '', `/projects/${encodeURIComponent(projectId)}/record`)
    await act(async () => {
      resolveObservation?.(ok(complete))
      await Promise.resolve()
    })

    expect(preparation.activate).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
