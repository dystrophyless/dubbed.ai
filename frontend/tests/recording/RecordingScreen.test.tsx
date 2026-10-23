import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FeatureScreenProps, RouteExitGuard } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import type {
  AccountId,
  CandidateId,
  DraftId,
  PreparationId,
  PreparationService,
  PreparationSnapshot,
  ProcessingQuote,
  ProcessingStartSnapshot,
  QuoteId,
  SourceId,
  OperationId,
  OwnedProject,
  ProjectId,
  RecordingAccess,
  RecordingCandidate,
  RecordingService,
  Revision,
  ServiceResult,
  SessionId,
  TakeId,
  TurnId,
} from '../../src/services/contracts'
import { RecordingScreen } from '../../src/features/recording/RecordingScreen'

const projectId = 'recording-project' as ProjectId
const turnId = 'turn-1' as TurnId
const sourceId = 'source-one' as SourceId
const preparationId = 'preparation-one' as PreparationId
const draftId = 'draft-one' as DraftId
const projectRevision = 7 as Revision
const takeRevision = 3 as Revision
const sourceRevision = 2 as Revision
const preparationRevision = 5 as Revision

function ok<T>(data: T) {
  return { status: 'ok' as const, data, replayed: false }
}

function makeTurn(id: string = turnId) {
  return {
    id: id as TurnId,
    text: 'This is the first line.',
    startMs: 500,
    endMs: 1_200,
    windowStartMs: 250,
    windowEndMs: 1_200,
    processingRevision: 2 as Revision,
    timingRevision: 5 as Revision,
    captureWindowNote: 'synthetic-mock-scenario' as const,
  }
}

function makeContext(missingAcceptedCount = 1, reprocessingLocked = false) {
  return {
    project: {
      id: projectId,
      title: 'Sample project',
      state: 'recording',
      revision: projectRevision,
      sourceId,
      sourceRevision,
      selection: { startMs: 0, endMs: 1_200, revision: 4 as Revision },
      preparationId,
      preparationRevision,
    } as OwnedProject,
    turns: [makeTurn()],
    currentTurnId: turnId,
    takeRevision,
    acceptedTakeCount: 0,
    missingAcceptedCount,
    firstMissingTurnId: missingAcceptedCount > 0 ? turnId : undefined,
    includedRetryAvailable: false,
    reprocessingLocked,
  }
}

function makeStream() {
  const track = Object.assign(new EventTarget(), {
    readyState: 'live' as MediaStreamTrackState,
    stop: vi.fn(function (this: EventTarget & { readyState: MediaStreamTrackState }) {
      this.readyState = 'ended'
      this.dispatchEvent(new Event('ended'))
    }),
  })
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
  return { stream, track }
}

function makeServices(options: { completeContext?: boolean; persistFailure?: boolean; acceptFailure?: boolean; twoTurns?: boolean; finalAssembly?: boolean; restoreDraft?: boolean; reprocessingLocked?: boolean } = {}) {
  const { stream, track } = makeStream()
  const initialContext = makeContext(1, options.reprocessingLocked)
  const completeContext = makeContext(0, true)
  const firstTurn = makeTurn()
  const secondTurn = makeTurn('turn-2')
  secondTurn.text = 'This is the second line.'
  secondTurn.startMs = 1_700
  secondTurn.endMs = 2_400
  secondTurn.windowStartMs = 1_450
  secondTurn.windowEndMs = 2_400
  if (options.twoTurns) {
    initialContext.turns = [firstTurn, secondTurn]
    initialContext.missingAcceptedCount = 2
    initialContext.firstMissingTurnId = firstTurn.id
    completeContext.turns = [firstTurn, secondTurn]
    completeContext.acceptedTakeCount = 2
  }
  const afterFirstDraft = {
    ...initialContext,
    project: { ...initialContext.project, revision: 8 as Revision },
  }
  const afterFirstAccept = options.twoTurns
    ? {
        ...initialContext,
        project: { ...initialContext.project, revision: 9 as Revision },
        turns: [{ ...firstTurn, acceptedTakeId: 'take-one' as TakeId }, secondTurn],
        acceptedTakeCount: 1,
        missingAcceptedCount: 1,
        firstMissingTurnId: secondTurn.id,
      }
    : {
        ...completeContext,
        project: { ...completeContext.project, revision: 9 as Revision },
        turns: [{ ...firstTurn, acceptedTakeId: 'take-one' as TakeId }],
        acceptedTakeCount: 1,
      }
  const afterSecondDraft = {
    ...afterFirstAccept,
    project: { ...afterFirstAccept.project, revision: 10 as Revision },
  }
  const afterAssembly = {
    ...afterFirstAccept,
    project: { ...afterFirstAccept.project, state: 'ready', revision: 10 as Revision },
  }
  const snapshots = options.finalAssembly
    ? [initialContext, afterFirstDraft, afterFirstDraft, afterFirstAccept, afterFirstAccept, afterAssembly]
    : [initialContext, afterFirstDraft, afterFirstDraft, afterFirstAccept, afterSecondDraft]
  let loadCount = 0
  const loadContext = vi.fn(async () => ok(snapshots[Math.min(loadCount++, snapshots.length - 1)]))
  const access: RecordingAccess = {
    projectId,
    grantId: 'grant-one' as OperationId,
    accountId: 'account-one' as AccountId,
    sessionId: 'session-one' as SessionId,
    state: 'held-by-session',
    fenceToken: 1,
    expiresAt: Date.now() + 45_000,
    revision: 1 as Revision,
  }
  const persistDraft = vi.fn(async (input: { candidate: RecordingCandidate }) => options.persistFailure
    ? { status: 'failed' as const, error: { code: 'unexpected' as const, message: 'Unable to save.' }, replayed: false }
    : ok({ candidate: { ...input.candidate, draftId: 'draft-one' as DraftId }, recoverable: true as const, accepted: false as const }))
  const acceptCandidate = vi.fn().mockImplementation(async () => options.acceptFailure
    ? { status: 'conflict' as const, code: 'revision-conflict' as const, message: 'Take could not be accepted.' }
    : ok({
    takeId: 'take-one',
    acceptedCount: 1,
    requiredCount: options.twoTurns ? 2 : 1,
    missingAcceptedCount: options.twoTurns ? 1 : 0,
    firstMissingTurnId: options.twoTurns ? ('turn-2' as TurnId) : undefined,
    reprocessingLocked: true,
    ...(options.finalAssembly ? { initialAssemblyAuthorizationId: 'initial-assembly-one' as OperationId } : {}),
    access: { ...access, revision: 2 as Revision, expiresAt: Date.now() + 45_000 },
  }))
  const resolveLeave = vi.fn()
  const releaseAccess = vi.fn().mockResolvedValue(ok({ released: true as const }))
  const navigate = vi.fn(async (input: { direction: 'back' | 'next' }) => ok({
    turnId: (input.direction === 'next' ? 'turn-2' : turnId) as TurnId,
    missingAcceptedCount: options.twoTurns ? 1 : 1,
    firstMissingTurnId: options.twoTurns ? ('turn-2' as TurnId) : turnId,
  }))
  const renewAccess = vi.fn(async (input: { expectedGrantRevision: Revision }): Promise<ServiceResult<RecordingAccess>> => ok({
    ...access,
    revision: (Number(input.expectedGrantRevision) + 1) as Revision,
    expiresAt: Date.now() + 45_000,
  }))
  const recording = {
    loadContext,
    acquireAccess: vi.fn().mockResolvedValue(ok(access)),
    renewAccess,
    releaseAccess,
    acceptedTakePlayback: vi.fn(),
    refreshAcceptedTakePlayback: vi.fn(),
    releasePlaybackUrl: vi.fn(),
    restoreDraft: vi.fn().mockResolvedValue(options.restoreDraft
      ? ok({
          candidate: {
            id: 'candidate-draft' as CandidateId,
            projectId,
            turnId,
            mediaId: 'media-draft' as RecordingCandidate['mediaId'],
            processingRevision: 2 as Revision,
            timingRevision: 5 as Revision,
            revision: 1 as Revision,
            audioTrackPresent: true,
            hasRecordedBytes: true,
            audioFrames: 'present' as const,
            decodedDurationMs: 900,
            durationMs: 900,
            accepted: false,
            draftId,
          } satisfies RecordingCandidate,
          blob: new Blob(['saved draft'], { type: 'audio/webm' }),
        })
      : ok(null)),
    persistDraft,
    acceptCandidate,
    discardDraft: vi.fn(),
    resolveLeave,
    authorizeCompletedRevision: vi.fn(),
    navigate,
  } as unknown as RecordingService
  const captureFixedWindow = vi.fn(async (input: {
    candidateId: CandidateId
    windowMs: number
    onProgress: (elapsedMs: number) => void
    onLevel?: (sample: { rms: number; peak: number }) => void
  }) => {
    input.onProgress(input.windowMs)
    input.onLevel?.({ rms: 0.2, peak: 0.4 })
    return ok({
      candidateId: input.candidateId,
      blob: new Blob(['captured frames'], { type: 'audio/webm' }),
      startedAt: 100,
      finishedAt: 1_000,
      interrupted: false,
      audioTrackPresent: true,
      hasRecordedBytes: true,
      audioFrames: 'present' as const,
      decodedDurationMs: 900,
    })
  })
  const browserMedia = {
    listInputs: vi.fn(),
    requestMicrophone: vi.fn().mockResolvedValue(ok({ stream, inputId: 'mic-one' })),
    watchInputLevel: vi.fn(),
    captureFixedWindow,
    startMicrophoneTest: vi.fn(),
    decodeAudioWaveform: vi.fn().mockResolvedValue(ok({
      durationMs: 950,
      peaks: Array.from({ length: 128 }, (_, index) => index % 2 === 0 ? 0.8 : 0.2),
    })),
  }
  const ensureAssembly = vi.fn().mockResolvedValue(ok({}))
  const quoteData: ProcessingQuote = {
    id: 'quote-one' as QuoteId,
    accountId: 'account-one' as AccountId,
    projectId,
    projectRevision,
    sourceId,
    sourceRevision,
    selectionRevision: 4 as Revision,
    activePreparationId: preparationId,
    activePreparationRevision: preparationRevision,
    draftIdsToDeleteOnActivation: [draftId],
    creditRevision: 9 as Revision,
    attemptClass: 'paid-reprocessing',
    durationMs: 1_200,
    credits: 4,
    available: 10,
    reserved: 2,
    expiresAt: Date.now() + 60_000,
    revision: 1 as Revision,
    note: 'synthetic-mock-scenario',
  }
  const preparationQuote = vi.fn(async (input: {
    expectedProjectRevision: Revision
    expectedActivePreparationId?: PreparationId
    expectedActivePreparationRevision: Revision
  }) => ok({
    ...quoteData,
    projectRevision: input.expectedProjectRevision,
    activePreparationId: input.expectedActivePreparationId,
    activePreparationRevision: input.expectedActivePreparationRevision,
  }))
  const preparationStartImplementation: PreparationService['start'] = async (input): Promise<ServiceResult<ProcessingStartSnapshot>> => ok({
    projectId,
    operation: {
      id: input.operationId,
      accountId: 'account-one' as AccountId,
      state: 'pending',
      kind: 'preparation-start',
      revision: 1 as Revision,
      updatedAt: Date.now(),
    },
    attemptClass: quoteData.attemptClass,
    reservationId: 'reservation-one' as OperationId,
    quoteId: input.quoteId,
    currentPreparationId: preparationId,
    currentPreparationRevision: preparationRevision,
    priorUsablePreparationId: preparationId,
    projectRevision: input.expectedProjectRevision,
  })
  const preparationStart = vi.fn(preparationStartImplementation)
  const preparationResolveImplementation: PreparationService['resolve'] = async (input): Promise<ServiceResult<PreparationSnapshot>> => ok({
    projectId: input.projectId,
    projectRevision,
    operation: {
      id: input.targetOperationId ?? ('operation-one' as OperationId),
      accountId: 'account-one' as AccountId,
      state: 'pending',
      kind: 'preparation-start',
      revision: 1 as Revision,
      updatedAt: Date.now(),
    },
    currentPreparationId: preparationId,
    currentPreparationRevision: preparationRevision,
    priorUsablePreparationId: preparationId,
    turns: [],
    attemptClass: quoteData.attemptClass,
    includedRetryAvailable: false,
    reprocessingLocked: false,
  })
  const preparationResolve = vi.fn(preparationResolveImplementation)
  const services = {
    recording,
    operations: {
      resolve: vi.fn(async (operationId: OperationId) => ok({ state: 'not-started' as const, operationId, safeToRetrySameId: true as const })),
    },
    browserMedia,
    uploads: { getSource: vi.fn().mockResolvedValue(ok({ facts: {}, blob: new Blob(['source'], { type: 'video/mp4' }) })) },
    results: { ensureAssembly },
    preparation: {
      quote: preparationQuote,
      start: preparationStart,
      resolve: preparationResolve,
    },
  }
  return { services, recording, browserMedia, captureFixedWindow, acceptCandidate, persistDraft, resolveLeave, releaseAccess, ensureAssembly, renewAccess, navigate, track, preparationQuote, preparationStart, preparationResolve, quoteData }
}

function renderRecording(
  services: ReturnType<typeof makeServices>['services'],
  locale: 'en' | 'ru' = 'en',
  simulateRouteExitGuard = false,
) {
  let exitGuard: RouteExitGuard | null = null
  const registerRouteExitGuard = vi.fn((guard: RouteExitGuard | null) => {
    exitGuard = guard
    return () => { if (exitGuard === guard) exitGuard = null }
  })
  const navigate = vi.fn(async (to: Parameters<FeatureScreenProps['navigate']>[0], options?: Parameters<FeatureScreenProps['navigate']>[1]) => {
    if (!simulateRouteExitGuard) return true
    const allowed = exitGuard
      ? await exitGuard({ from: routes.project(projectId, 'record'), to, reason: 'navigation' })
      : true
    if (!allowed) return false
    return options?.beforeCommit ? options.beforeCommit() : true
  })
  const props = {
    route: routes.project(projectId, 'record'),
    locale,
    services,
    navigate,
    registerRouteExitGuard,
  } as unknown as FeatureScreenProps
  const view = render(<RecordingScreen {...props} />)
  return {
    ...view,
    props,
    registerRouteExitGuard,
    getExitGuard: () => exitGuard,
    rerenderLocale: (nextLocale: 'en' | 'ru') => view.rerender(<RecordingScreen {...props} locale={nextLocale} />),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

async function flushPromises() {
  for (let index = 0; index < 20; index += 1) await Promise.resolve()
}

describe('Record screen', () => {
  it('keeps reference volume separate from My recording and opens microphone check explicitly', async () => {
    const services = makeServices({ restoreDraft: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const view = renderRecording(services.services)
    const video = await screen.findByLabelText('Original video') as HTMLVideoElement
    const audio = view.container.querySelector('audio')
    expect(audio).not.toBeNull()
    if (!audio) return

    audio.volume = 0.63
    fireEvent.change(screen.getByRole('slider', { name: 'Seek playback' }), { target: { value: '500' } })
    expect(video.currentTime).toBe(0.75)
    fireEvent.click(screen.getByRole('button', { name: 'My recording' }))
    expect(video.currentTime).toBe(0.25)
    expect(audio.currentTime).toBe(0)
    fireEvent.change(screen.getByRole('slider', { name: 'Original video volume' }), { target: { value: '0.25' } })

    expect(video.volume).toBeCloseTo(0.25)
    expect(audio.volume).toBeCloseTo(0.63)
    fireEvent.click(screen.getByRole('button', { name: 'Microphone' }))
    expect(view.props.navigate).toHaveBeenCalledWith(routes.microphoneForProject(projectId))
    expect(services.browserMedia.requestMicrophone).not.toHaveBeenCalled()
  })

  it('shows the paid quote and draft-loss warning, and starts only after explicit replacement confirmation', async () => {
    const fixture = makeServices({ restoreDraft: true })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const view = renderRecording(fixture.services, 'en', true)

    expect(await screen.findByRole('button', { name: 'Process again' })).toBeInTheDocument()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Process again' }))

    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledOnce())
    expect(fixture.preparationQuote).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      expectedActivePreparationId: preparationId,
      expectedActivePreparationRevision: preparationRevision,
    }))
    expect(screen.getByText('Paid reprocessing — 4 credits')).toBeInTheDocument()
    expect(screen.getByText('4 credits', { exact: true })).toBeInTheDocument()
    expect(screen.getByText(/will delete 1 unaccepted saved draft/)).toBeInTheDocument()
    expect(fixture.preparationStart).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Process again for 4 credits' }))
    const confirmation = await screen.findByRole('dialog')
    expect(confirmation.textContent).toContain('Paid reprocessing — 4 credits')
    expect(confirmation.textContent).toContain('delete 1 unaccepted saved draft')
    fireEvent.click(screen.getByRole('button', { name: 'Keep current preparation' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    expect(view.props.navigate).not.toHaveBeenCalled()
    expect(screen.getAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Process again for 4 credits' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and process replacement' }))
    await waitFor(() => expect(fixture.preparationStart).toHaveBeenCalledOnce())

    const quotedProjectRevision = fixture.preparationQuote.mock.calls[0]?.[0].expectedProjectRevision
    expect(fixture.preparationStart).toHaveBeenCalledWith(expect.objectContaining({
      quoteId: fixture.quoteData.id,
      expectedProjectRevision: quotedProjectRevision,
      expectedSourceRevision: sourceRevision,
      expectedActivePreparationId: preparationId,
      expectedActivePreparationRevision: preparationRevision,
      acknowledgedDraftIds: [draftId],
      replacementAcknowledged: true,
      draftLossAcknowledged: true,
      explicitAuthorization: true,
      operationId: expect.any(String),
    }))
    expect(view.props.navigate).toHaveBeenCalledWith(routes.project(projectId, 'processing'), expect.objectContaining({ beforeCommit: expect.any(Function) }))
    expect(fixture.releaseAccess).toHaveBeenCalledOnce()
    expect(fixture.releaseAccess.mock.invocationCallOrder[0]).toBeLessThan(fixture.preparationStart.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY)
    expect(fixture.acceptCandidate).not.toHaveBeenCalled()
    expect(screen.getAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)
    view.unmount()
  })

  it('shows an included retry as zero-credit and requires the same explicit confirmation', async () => {
    const fixture = makeServices()
    fixture.quoteData.attemptClass = 'included-retry'
    fixture.quoteData.credits = 0
    fixture.quoteData.draftIdsToDeleteOnActivation = []
    const includedContext = { ...makeContext(), includedRetryAvailable: true }
    vi.mocked(fixture.recording.loadContext).mockResolvedValue(ok(includedContext))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const view = renderRecording(fixture.services)

    fireEvent.click(await screen.findByRole('button', { name: 'Process again' }))
    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledOnce())
    expect(screen.getByText('Included retry — no additional credits')).toBeInTheDocument()
    expect(screen.getByText('0 credits', { exact: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Use included retry' })).toBeEnabled()
    expect(fixture.preparationStart).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Use included retry' }))
    const confirmation = await screen.findByRole('dialog')
    expect(confirmation.textContent).toContain('Included retry — no additional credits')
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Keep current preparation' }))
    expect(await screen.findByRole('button', { name: 'Use included retry' })).toBeEnabled()
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    view.unmount()
  })

  it('disables Process again with a permanent explanation after an accepted take', async () => {
    const fixture = makeServices()
    const acceptedContext = {
      ...makeContext(0, true),
      acceptedTakeCount: 1,
      turns: [{ ...makeTurn(), acceptedTakeId: 'take-one' as TakeId }],
    }
    vi.mocked(fixture.recording.loadContext).mockResolvedValue(ok(acceptedContext))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const view = renderRecording(fixture.services)

    const processAgain = await screen.findByRole('button', { name: 'Process again' })
    expect(processAgain).toBeDisabled()
    expect(screen.getByText('Processing again is permanently locked after the first accepted take. Deleting a take will not unlock it.')).toBeInTheDocument()
    fireEvent.click(processAgain)
    expect(fixture.preparationQuote).not.toHaveBeenCalled()
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    view.unmount()
  })

  it('reconciles an unknown operation with the same ID, then permits a new attempt only after rejection', async () => {
    const fixture = makeServices({ restoreDraft: true })
    vi.mocked(fixture.recording.loadContext).mockResolvedValue(ok(makeContext()))
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const makeRejectedSnapshot = (operationId: OperationId): PreparationSnapshot => ({
      projectId,
      projectRevision,
      operation: {
        id: operationId,
        accountId: 'account-one' as AccountId,
        state: 'rejected',
        kind: 'preparation-start',
        revision: 1 as Revision,
        updatedAt: Date.now(),
      },
      currentPreparationId: preparationId,
      currentPreparationRevision: preparationRevision,
      priorUsablePreparationId: preparationId,
      turns: [],
      attemptClass: fixture.quoteData.attemptClass,
      includedRetryAvailable: false,
      reprocessingLocked: false,
    })
    fixture.preparationStart.mockImplementationOnce(async (input) => ({
      status: 'unknown',
      operationId: input.operationId,
      message: 'The start result needs reconciliation.',
    }))
    fixture.preparationResolve
      .mockImplementationOnce(async (input) => ({
        status: 'unknown',
        operationId: input.targetOperationId!,
        message: 'The operation status needs another check.',
      }))
      .mockImplementationOnce(async (input) => ok(makeRejectedSnapshot(input.targetOperationId!)))
    const view = renderRecording(fixture.services, 'en', true)

    expect(await screen.findByRole('button', { name: 'Process again' })).toBeInTheDocument()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Process again' }))
    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Process again for 4 credits' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm and process replacement' }))

    await waitFor(() => expect(fixture.preparationStart).toHaveBeenCalledOnce())
    const originalOperationId = fixture.preparationStart.mock.calls[0]?.[0].operationId
    expect(originalOperationId).toBeTruthy()
    expect(await screen.findByRole('button', { name: 'Check processing status' })).toBeInTheDocument()
    expect(fixture.preparationResolve).toHaveBeenCalledOnce()
    expect(fixture.preparationResolve.mock.calls[0]?.[0]).toEqual({ projectId, targetOperationId: originalOperationId })
    expect(view.props.navigate).toHaveBeenCalledWith(routes.project(projectId, 'processing'), expect.objectContaining({ beforeCommit: expect.any(Function) }))
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Check processing status' }))
    expect(await screen.findByText(/processing attempt was not started/i)).toBeInTheDocument()
    expect(fixture.preparationResolve).toHaveBeenCalledTimes(2)
    expect(fixture.preparationResolve.mock.calls[1]?.[0]).toEqual({ projectId, targetOperationId: originalOperationId })
    expect(fixture.preparationStart).toHaveBeenCalledOnce()
    expect(fixture.recording.discardDraft).not.toHaveBeenCalled()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    fixture.quoteData.id = 'quote-after-rejection' as QuoteId
    fireEvent.click(screen.getByRole('button', { name: 'Process again' }))
    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledTimes(2))
    fireEvent.click(screen.getByRole('button', { name: 'Process again for 4 credits' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm and process replacement' }))
    await waitFor(() => expect(fixture.preparationStart).toHaveBeenCalledTimes(2))

    expect(fixture.preparationStart.mock.calls[1]?.[0]).toMatchObject({
      quoteId: 'quote-after-rejection',
      operationId: expect.any(String),
    })
    expect(fixture.preparationStart.mock.calls[1]?.[0].operationId).not.toBe(originalOperationId)
    expect(fixture.recording.discardDraft).not.toHaveBeenCalled()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)
    view.unmount()
  })

  it('rejects a stale quoted revision before start and keeps the saved draft until a fresh quote', async () => {
    const fixture = makeServices({ restoreDraft: true })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const view = renderRecording(fixture.services, 'en', true)
    expect(await screen.findByRole('button', { name: 'Process again' })).toBeInTheDocument()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    const stableContext = makeContext()
    const changedContext = {
      ...stableContext,
      project: { ...stableContext.project, revision: 8 as Revision },
    }
    let requestContextCount = 0
    vi.mocked(fixture.recording.loadContext).mockImplementation(async () => ok(
      requestContextCount++ === 0 ? stableContext : changedContext,
    ))
    fireEvent.click(screen.getByRole('button', { name: 'Process again' }))
    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Process again for 4 credits' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm and process replacement' }))

    expect(await screen.findByText('The project changed after this quote. Check the current reprocessing option again.')).toBeInTheDocument()
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    expect(fixture.recording.releaseAccess).toHaveBeenCalledOnce()
    expect(fixture.recording.acquireAccess).toHaveBeenCalledTimes(2)
    expect(fixture.recording.discardDraft).not.toHaveBeenCalled()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Process again' }))
    await waitFor(() => expect(fixture.preparationQuote).toHaveBeenCalledTimes(2))
    expect(screen.getByText('Paid reprocessing — 4 credits')).toBeInTheDocument()
    expect(fixture.preparationStart).not.toHaveBeenCalled()
    expect(fixture.recording.discardDraft).not.toHaveBeenCalled()
    view.unmount()
  })

  it('shows a localized disabled capture status while preserving the prior draft and offering no stop action', async () => {
    const fixture = makeServices({ restoreDraft: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    let finishCapture!: (result: Awaited<ReturnType<typeof fixture.captureFixedWindow>>) => void
    const delayedCapture = new Promise<Awaited<ReturnType<typeof fixture.captureFixedWindow>>>((resolve) => {
      finishCapture = resolve
    })
    fixture.captureFixedWindow.mockImplementationOnce(async (input) => {
      input.onProgress(input.windowMs)
      return delayedCapture
    })
    const view = renderRecording(fixture.services, 'en')

    expect(await screen.findByRole('button', { name: 'Record again' })).toBeEnabled()
    expect(await screen.findAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Record again' }))
    await waitFor(() => expect(fixture.captureFixedWindow).toHaveBeenCalledOnce())

    const englishActiveButton = await screen.findByRole('button', { name: 'Recording…' })
    expect(englishActiveButton).toBeDisabled()
    expect(screen.queryByRole('button', { name: /stop/i })).not.toBeInTheDocument()
    expect(screen.getAllByText('Draft saved. It has not been accepted as a take.')).not.toHaveLength(0)

    view.rerenderLocale('ru')
    expect(await screen.findByRole('heading', { name: 'Запишите свою реплику' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Запись…' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: /остановить|stop/i })).not.toBeInTheDocument()
    expect(screen.getAllByText('Черновик сохранён. Он ещё не принят как дубль.')).not.toHaveLength(0)

    const captureInput = fixture.captureFixedWindow.mock.calls[0]?.[0]
    expect(captureInput).toBeDefined()
    if (!captureInput) return
    finishCapture(ok({
      candidateId: captureInput.candidateId,
      blob: new Blob(['captured frames'], { type: 'audio/webm' }),
      startedAt: 100,
      finishedAt: 1_000,
      interrupted: false,
      audioTrackPresent: true,
      hasRecordedBytes: true,
      audioFrames: 'present',
      decodedDurationMs: 900,
    }))
    expect(await screen.findByText('Аудиокадры декодированы. Кнопка «Следующая реплика» сохранит дубль и продолжит.')).toBeInTheDocument()
    view.unmount()
  })

  it('keeps the source and active capture through locale changes and re-localizes existing error and success notices', async () => {
    const services = makeServices({ twoTurns: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    let finishCapture!: (result: Awaited<ReturnType<typeof services.captureFixedWindow>>) => void
    const delayedCapture = new Promise<Awaited<ReturnType<typeof services.captureFixedWindow>>>((resolve) => {
      finishCapture = resolve
    })
    services.captureFixedWindow.mockImplementationOnce(async (input) => {
      input.onProgress(input.windowMs)
      return delayedCapture
    })

    const view = renderRecording(services.services)
    const video = await screen.findByLabelText('Original video') as HTMLVideoElement
    const candidateAudio = view.container.querySelector('audio') as HTMLAudioElement | null
    expect(candidateAudio).not.toBeNull()
    if (!candidateAudio) return
    candidateAudio.volume = 0.63
    const sourceUrl = video.currentSrc || video.src
    const initialLoadCount = (services.recording.loadContext as ReturnType<typeof vi.fn>).mock.calls.length
    expect(screen.getByRole('button', { name: 'Next line' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Microphone' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect(video.currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await waitFor(() => expect(services.captureFixedWindow).toHaveBeenCalledOnce())
    expect(services.track.stop).not.toHaveBeenCalled()

    const volume = screen.getByRole('slider', { name: 'Original video volume' })
    expect(volume).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Recording…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next line' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Microphone' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Seek playback' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'My recording' })).toBeDisabled()
    fireEvent.change(volume, { target: { value: '0.25' } })
    expect(video.volume).toBeCloseTo(0.25)
    expect(candidateAudio.volume).toBeCloseTo(0.63)

    const controlsPanel = view.container.querySelector<HTMLElement>('.recording-transport__controls')
    expect(controlsPanel).not.toBeNull()
    if (!controlsPanel) return
    const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia')
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn(() => ({ matches: true })),
    })
    try {
      let focusFrame: FrameRequestCallback | undefined
      const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
        focusFrame = callback
        return 1
      })
      const scrollBy = vi.spyOn(window, 'scrollBy').mockImplementation(() => undefined)
      const targetRect = vi.spyOn(volume, 'getBoundingClientRect').mockReturnValue({ bottom: 726.38 } as DOMRect)
      vi.spyOn(controlsPanel, 'getBoundingClientRect').mockReturnValue({ top: 663 } as DOMRect)
      volume.focus()
      expect(volume).toHaveFocus()
      expect(requestFrame).toHaveBeenCalledOnce()
      expect(scrollBy).not.toHaveBeenCalled()
      // Native focus scrolling may move the page before the frame; correct only the remaining overlap.
      targetRect.mockReturnValue({ bottom: 701.38 } as DOMRect)
      focusFrame?.(0)
      expect(scrollBy).toHaveBeenCalledTimes(1)
      expect(scrollBy.mock.calls[0]?.[1]).toBeCloseTo(46.38)
    } finally {
      if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor)
      else Reflect.deleteProperty(window, 'matchMedia')
    }
    expect(services.captureFixedWindow).toHaveBeenCalledOnce()
    expect(services.releaseAccess).not.toHaveBeenCalled()
    expect(services.track.stop).not.toHaveBeenCalled()

    view.rerenderLocale('ru')
    expect(await screen.findByRole('heading', { name: 'Запишите свою реплику' })).toBeInTheDocument()
    expect(video.currentSrc || video.src).toBe(sourceUrl)
    expect(services.recording.loadContext).toHaveBeenCalledTimes(initialLoadCount)
    expect(services.recording.acquireAccess).toHaveBeenCalledOnce()
    expect(services.releaseAccess).not.toHaveBeenCalled()
    expect(services.track.stop).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()

    const captureInput = services.captureFixedWindow.mock.calls[0][0]
    finishCapture(ok({
      candidateId: captureInput.candidateId,
      blob: new Blob(['captured frames'], { type: 'audio/webm' }),
      startedAt: 100,
      finishedAt: 1_000,
      interrupted: false,
      audioTrackPresent: true,
      hasRecordedBytes: true,
      audioFrames: 'present',
      decodedDurationMs: 900,
    }))
    expect(await screen.findByText('Аудиокадры декодированы. Кнопка «Следующая реплика» сохранит дубль и продолжит.')).toBeInTheDocument()

    view.rerenderLocale('en')
    services.acceptCandidate.mockResolvedValueOnce({
      status: 'conflict',
      code: 'revision-conflict',
      message: 'Take could not be accepted.',
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    expect(await screen.findByText('This action could not be completed. Your existing accepted take remains unchanged.')).toBeInTheDocument()
    view.rerenderLocale('ru')
    const localizedError = await screen.findByText('Не удалось выполнить действие. Ранее принятый дубль не изменён.')
    expect(localizedError.closest('[role="alert"]')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Следующая реплика' }))
    const localizedSuccess = await screen.findByText('Дубль принят.')
    expect(localizedSuccess.closest('[role="status"]')).not.toBeNull()
    expect(video.currentSrc || video.src).toBe(sourceUrl)
    expect(services.recording.acquireAccess).toHaveBeenCalledOnce()
  })

  it('does not request microphone on load and captures the authoritative fixed window before autosaving a draft', async () => {
    const services = makeServices()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    const view = renderRecording(services.services)
    const video = await screen.findByLabelText('Original video')
    expect(services.browserMedia.requestMicrophone).not.toHaveBeenCalled()
    expect(services.recording.acceptCandidate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect(services.browserMedia.requestMicrophone).toHaveBeenCalledOnce())
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)

    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    expect(services.captureFixedWindow).toHaveBeenCalledWith(expect.objectContaining({
      windowMs: 950,
    }))
    expect(services.persistDraft).toHaveBeenCalledOnce()
    expect(services.recording.acceptCandidate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Next line' })).toBeEnabled()
    expect(services.navigate).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /stop recording/i })).not.toBeInTheDocument()
    expect(services.track.stop).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    await waitFor(() => expect(services.acceptCandidate).toHaveBeenCalledOnce())
    await waitFor(() => expect(services.navigate).toHaveBeenCalledOnce())
    expect(services.acceptCandidate.mock.invocationCallOrder[0]).toBeLessThan(services.navigate.mock.invocationCallOrder[0])
    view.unmount()
  })

  it('accepts only a decoded capture using the service revisions and authoritative take revision', async () => {
    const services = makeServices({ completeContext: true })
    services.navigate.mockResolvedValueOnce(ok({ turnId, missingAcceptedCount: 0, firstMissingTurnId: turnId }))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    renderRecording(services.services)
    const video = await screen.findByLabelText('Original video')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))

    await waitFor(() => expect(services.acceptCandidate).toHaveBeenCalledOnce())
    const request = (services.acceptCandidate as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(request).toMatchObject({
      projectId,
      turnId,
      grantId: 'grant-one',
      expectedGrantRevision: 1,
      expectedProjectRevision: 8,
      expectedTakeRevision: takeRevision,
      candidate: {
        processingRevision: 2,
        timingRevision: 5,
        audioFrames: 'present',
        decodedDurationMs: 900,
        accepted: false,
      },
    })
    expect(await screen.findByText('All lines have accepted takes.')).toBeInTheDocument()
  })

  it('keeps accepted playback alive until an in-flight waveform read settles after moving to the next line', async () => {
    const fixture = makeServices({ twoTurns: true })
    const acceptedPlaybackUrl = 'blob:accepted-take'
    const waveformResult = ok({ durationMs: 900, peaks: [0.8, 0.2] })
    let finishAcceptedWaveform!: (result: typeof waveformResult) => void
    const pendingAcceptedWaveform = new Promise<typeof waveformResult>((resolve) => {
      finishAcceptedWaveform = resolve
    })
    fixture.browserMedia.decodeAudioWaveform.mockImplementation(({ source }) => source === acceptedPlaybackUrl
      ? pendingAcceptedWaveform
      : Promise.resolve(ok({ durationMs: 950, peaks: [0.8, 0.2] })))
    vi.spyOn(fixture.recording, 'acceptedTakePlayback').mockResolvedValue(ok({
      projectId,
      turnId,
      takeId: 'take-one' as TakeId,
      mediaId: 'media-one' as RecordingCandidate['mediaId'],
      url: acceptedPlaybackUrl,
      mediaType: 'audio/webm',
      durationMs: 900,
      revision: 1 as Revision,
      note: 'synthetic-mock-scenario' as const,
    }))
    const movedToSecondLine = ok({
      turnId: 'turn-2' as TurnId,
      missingAcceptedCount: 1,
      firstMissingTurnId: 'turn-2' as TurnId,
    })
    let finishNavigation!: (result: typeof movedToSecondLine) => void
    const pendingNavigation = new Promise<typeof movedToSecondLine>((resolve) => {
      finishNavigation = resolve
    })
    fixture.navigate.mockImplementationOnce(() => pendingNavigation)
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:source-media')
      .mockReturnValueOnce('blob:candidate-media')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    const view = renderRecording(fixture.services)
    const video = await screen.findByLabelText('Original video')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')

    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    await waitFor(() => expect(fixture.navigate).toHaveBeenCalledOnce())
    await waitFor(() => expect(fixture.browserMedia.decodeAudioWaveform).toHaveBeenCalledWith({ source: acceptedPlaybackUrl }))
    expect(fixture.recording.acceptedTakePlayback).toHaveBeenCalledOnce()

    await act(async () => finishNavigation(movedToSecondLine))
    expect(await screen.findByText('Line 2 of 2')).toBeInTheDocument()
    expect(fixture.recording.releasePlaybackUrl).not.toHaveBeenCalledWith(acceptedPlaybackUrl)
    expect(view.container.querySelector('audio')?.getAttribute('src')).not.toBe(acceptedPlaybackUrl)
    expect(fixture.browserMedia.decodeAudioWaveform.mock.calls.filter(([request]) => request.source === acceptedPlaybackUrl)).toHaveLength(1)

    await act(async () => finishAcceptedWaveform(waveformResult))
    await waitFor(() => expect(fixture.recording.releasePlaybackUrl).toHaveBeenCalledOnce())
    expect(fixture.recording.releasePlaybackUrl).toHaveBeenCalledWith(acceptedPlaybackUrl)
    expect(revokeObjectURL).not.toHaveBeenCalledWith('blob:source-media')
    view.unmount()
  })

  it('keeps the line and candidate when acceptance conflicts instead of advancing', async () => {
    const services = makeServices({ acceptFailure: true, twoTurns: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    renderRecording(services.services)
    const video = await screen.findByLabelText('Original video')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    await screen.findByText('This action could not be completed. Your existing accepted take remains unchanged.')

    expect(screen.getByText('Line 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Recorded audio frames were decoded. Next line saves this take and continues.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next line' })).toBeEnabled()
    expect(services.navigate).not.toHaveBeenCalled()
  })

  it('refreshes the project revision before persisting a later line', async () => {
    const services = makeServices({ twoTurns: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    renderRecording(services.services)
    const video = await screen.findByLabelText('Original video')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    await waitFor(() => expect(services.acceptCandidate).toHaveBeenCalledOnce())
    await screen.findByText('Take accepted.')
    await screen.findByText('This is the second line.')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(1.45))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')

    expect(services.persistDraft).toHaveBeenCalledTimes(2)
    expect(services.persistDraft.mock.calls[1][0]).toMatchObject({
      turnId: 'turn-2',
      expectedGrantRevision: 2,
      expectedProjectRevision: 9,
    })
  })

  it('refreshes the completed project revision before releasing access and entering Result from final Next', async () => {
    const services = makeServices({ finalAssembly: true })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    const view = renderRecording(services.services)
    const video = await screen.findByLabelText('Original video') as HTMLVideoElement
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect(video.currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))

    await waitFor(() => expect(view.props.navigate).toHaveBeenCalledWith(routes.project(projectId, 'result')))
    expect(services.acceptCandidate).toHaveBeenCalledOnce()
    expect(services.ensureAssembly).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      authorizationId: 'initial-assembly-one',
      expectedProjectRevision: 9,
    }))
    expect(services.releaseAccess).toHaveBeenCalledWith(expect.objectContaining({
      projectId,
      expectedGrantRevision: 2,
      expectedProjectRevision: 10,
    }))
  })

  it('pauses the source at the fixed-window boundary before capture decoding finishes', async () => {
    const services = makeServices()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    let finishCapture!: (result: Awaited<ReturnType<typeof services.captureFixedWindow>>) => void
    const delayedCapture = new Promise<Awaited<ReturnType<typeof services.captureFixedWindow>>>((resolve) => {
      finishCapture = resolve
    })
    services.captureFixedWindow.mockImplementationOnce(async (input) => {
      input.onProgress(input.windowMs)
      return delayedCapture
    })

    renderRecording(services.services)
    const video = await screen.findByLabelText('Original video') as HTMLVideoElement
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect(video.currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await waitFor(() => expect(services.captureFixedWindow).toHaveBeenCalledOnce())

    expect(pause).toHaveBeenCalled()
    expect(video.controls).toBe(false)
    const captureInput = services.captureFixedWindow.mock.calls[0][0]
    finishCapture(ok({
      candidateId: captureInput.candidateId,
      blob: new Blob(['captured frames'], { type: 'audio/webm' }),
      startedAt: 100,
      finishedAt: 1_000,
      interrupted: false,
      audioTrackPresent: true,
      hasRecordedBytes: true,
      audioFrames: 'present',
      decodedDurationMs: 900,
    }))
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
  })

  it('renews a held grant during an edit lasting beyond the mock lease', async () => {
    vi.useFakeTimers()
    const services = makeServices()
    renderRecording(services.services)
    await act(async () => { await flushPromises() })

    expect(screen.getByLabelText('Original video')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(60_000) })

    expect(services.renewAccess.mock.calls.length).toBeGreaterThanOrEqual(4)
    expect(services.renewAccess.mock.calls.map(([input]) => Number(input.expectedGrantRevision))).toEqual([1, 2, 3, 4])
    expect(screen.getByRole('button', { name: 'Record line' })).toBeEnabled()
  })

  it('keeps a saved candidate visible and read-only after grant renewal fails', async () => {
    vi.useFakeTimers()
    const services = makeServices()
    services.renewAccess.mockResolvedValueOnce({
      status: 'conflict',
      code: 'lease-held',
      message: 'The recording grant is no longer available.',
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    renderRecording(services.services)
    await act(async () => { await flushPromises() })
    const video = screen.getByLabelText('Original video') as HTMLVideoElement
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await act(async () => { await flushPromises() })
    expect(video.currentTime).toBe(0.25)
    fireEvent.seeked(video)
    await act(async () => { await flushPromises() })
    expect(screen.getByText('Recorded audio frames were decoded. Next line saves this take and continues.')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })

    expect(screen.getByText('This recording session is open elsewhere or unavailable. You can listen, but cannot record here.')).toBeInTheDocument()
    expect(screen.getByText('Recorded audio frames were decoded. Next line saves this take and continues.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next line' })).toBeDisabled()
    expect(services.acceptCandidate).not.toHaveBeenCalled()
  })

  it('contains focus and treats Escape or Stay as a local no-mutation return', async () => {
    const services = makeServices()
    services.resolveLeave
      .mockResolvedValueOnce(ok({ action: 'save-and-leave', disposition: 'draft-saved', draftId: 'draft-one' as DraftId, draftDiscarded: false, grantReleased: true }))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:local-media')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)

    const view = renderRecording(services.services)
    const video = await screen.findByLabelText('Original video')
    fireEvent.click(screen.getByRole('button', { name: 'Record line' }))
    await waitFor(() => expect((video as HTMLVideoElement).currentTime).toBe(0.25))
    fireEvent.seeked(video)
    await screen.findByText('Recorded audio frames were decoded. Next line saves this take and continues.')
    await waitFor(() => expect(view.registerRouteExitGuard).toHaveBeenCalled())

    const target = routes.projects()
    const request = { from: routes.project(projectId, 'record'), to: target, reason: 'navigation' as const }
    const guard = view.getExitGuard()
    if (!guard) throw new Error('Record screen did not register an exit guard.')
    const returnFocus = screen.getByRole('button', { name: 'Projects' })
    returnFocus.focus()
    const stayPromise = guard(request)
    const dialog = await screen.findByRole('dialog', { name: 'Leave recording?' })
    const stayButton = screen.getByRole('button', { name: 'Stay here' })
    await waitFor(() => expect(stayButton).toHaveFocus())
    fireEvent.keyDown(stayButton, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Save and leave' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement ?? dialog, { key: 'Escape' })
    await expect(stayPromise).resolves.toBe(false)
    await waitFor(() => expect(returnFocus).toHaveFocus())
    expect(services.resolveLeave).not.toHaveBeenCalled()

    const explicitStayPromise = guard(request)
    await screen.findByRole('dialog', { name: 'Leave recording?' })
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }))
    await expect(explicitStayPromise).resolves.toBe(false)
    expect(services.resolveLeave).not.toHaveBeenCalled()

    const leavePromise = guard(request)
    await screen.findByRole('dialog', { name: 'Leave recording?' })
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }))
    await expect(leavePromise).resolves.toBe(true)
    expect(services.resolveLeave).toHaveBeenCalledOnce()
    expect(services.resolveLeave).toHaveBeenCalledWith(expect.objectContaining({
      action: 'save-and-leave',
      projectId,
      turnId,
      grantId: 'grant-one',
      expectedGrantRevision: 1,
      candidate: expect.objectContaining({ audioFrames: 'present' }),
      blob: expect.any(Blob),
    }))
  })
})
