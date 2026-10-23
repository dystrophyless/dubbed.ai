import { afterEach, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { NewDubScreen } from '../../src/features/new-dub/NewDubScreen'
import { RouteFailure } from '../../src/app/RouteFailure'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { asRevision, ids, type AccountSnapshot, type OwnedProject, type ProcessingQuote, type Services, type Session } from '../../src/services/contracts'
import { routes } from '../../src/app/routes'

const accountId = ids.account('selection-test-account')
const projectId = ids.project('selection-test-project')
const sourceId = ids.source('selection-test-source')

afterEach(() => {
  cleanup()
  Reflect.deleteProperty(URL, 'createObjectURL')
  Reflect.deleteProperty(URL, 'revokeObjectURL')
  sessionStorage.clear()
})

async function mountNewDub(initialStartMs = 0, options: {
  firstAiLaunchAt?: number
  includedRetryAvailable?: boolean
  attemptClass?: ProcessingQuote['attemptClass']
  credits?: number
  draftIds?: ProcessingQuote['draftIdsToDeleteOnActivation']
  quoteProjectRevision?: number
  projectState?: OwnedProject['state']
} = {}) {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:selection-source') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  sessionStorage.setItem(
    `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`,
    JSON.stringify({ accountId, projectId }),
  )

  const project: OwnedProject = {
    id: projectId,
    accountId,
    revision: asRevision(0),
    title: 'selection-source.mp4',
    titleSource: 'filename',
    createdAt: 1_800_000_000_000,
    updatedAt: 1_800_000_000_000,
    lastActivityAt: 1_800_000_000_000,
    firstAiLaunchAt: options.firstAiLaunchAt,
    sourceId,
    sourceRevision: asRevision(0),
    sourceDurationMs: 8_625,
    selection: { startMs: initialStartMs, endMs: 8_625, revision: asRevision(0) },
    preparationRevision: asRevision(0),
    includedRetryAvailable: options.includedRetryAvailable,
    state: options.projectState ?? 'uploaded',
  }
  const facts = {
    fileName: 'selection-source.mp4',
    mimeType: 'video/mp4',
    byteLength: 4,
    durationMs: 8_625,
    width: 640,
    height: 360,
    hasAudio: true,
    validation: 'mock-scenario' as const,
  }
  const updatedSelection = vi.fn(async (input: { startMs: number; endMs: number }) => ({
    status: 'ok' as const,
    data: {
      ...project,
      revision: asRevision(1),
      selection: { startMs: input.startMs, endMs: input.endMs, revision: asRevision(1) },
    },
    replayed: false,
  }))
  const quoteData: ProcessingQuote = {
    id: ids.quote('selection-test-quote'),
    accountId,
    projectId,
    projectRevision: asRevision(options.quoteProjectRevision ?? 0),
    sourceId,
    sourceRevision: project.sourceRevision,
    selectionRevision: project.selection.revision,
      activePreparationId: project.preparationId,
    activePreparationRevision: project.preparationRevision,
    draftIdsToDeleteOnActivation: options.draftIds ?? [],
    creditRevision: asRevision(0),
    attemptClass: options.attemptClass ?? 'initial',
    durationMs: project.selection.endMs - project.selection.startMs,
    credits: options.credits ?? 9,
    available: 120,
    reserved: 0,
    expiresAt: Date.now() + 60_000,
    revision: asRevision(0),
    note: 'synthetic-mock-scenario',
  }
  const quote = vi.fn(async () => ({ status: 'ok' as const, data: quoteData, replayed: false }))
  const start = vi.fn(async () => ({
    status: 'ok' as const,
    data: {
      projectId,
      operation: { id: ids.operation('selection-test-start'), accountId, state: 'pending', kind: 'preparation', revision: asRevision(0), updatedAt: 1_800_000_000_000 },
      attemptClass: quoteData.attemptClass,
      reservationId: ids.operation('selection-test-reservation'),
      quoteId: quoteData.id,
      currentPreparationId: project.preparationId,
      currentPreparationRevision: project.preparationRevision,
      priorUsablePreparationId: project.preparationId,
      projectRevision: asRevision(1),
    } as never,
    replayed: false,
  }))
  const services = {
    credits: {
      snapshot: async () => ({
        status: 'ok' as const,
        data: {
          accountId,
          revision: asRevision(0),
          available: 120,
          reserved: 0,
          purchasedRemainder: 0,
          welcomeGrantEligible: false,
          welcomeGrantApplied: true,
          projectCapacity: { used: 1, total: 10 },
        },
        replayed: false,
      }),
    },
    projects: { open: async () => ({ status: 'ok' as const, data: project, replayed: false }) },
    uploads: {
      getSource: async () => ({
        status: 'ok' as const,
        data: { facts, blob: new Blob(['test'], { type: 'video/mp4' }) },
        replayed: false,
      }),
    },
    preparation: { updateSelection: updatedSelection, quote, start },
    previews: {},
  } as unknown as Services
  const identity = {
    status: 'signed-in' as const,
    account: { id: accountId, email: 'selection@example.test' } as AccountSnapshot,
    session: { accountId, expiresAt: 1_900_000_000_000 } as Session,
  }
  const props = {
    route: routes.newDub(),
    locale: 'en' as const,
    identity,
    signInIntent: { kind: 'new-dub' as const },
    services,
    navigate: vi.fn(async () => true),
    refreshIdentity: vi.fn(async () => identity),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  } satisfies FeatureScreenProps
  const router = createMemoryRouter([
    { path: '/new', Component: () => <NewDubScreen {...props} />, ErrorBoundary: RouteFailure },
  ], { initialEntries: ['/new'] })
  const user = userEvent.setup()

  render(<RouterProvider router={router} />)

  await screen.findByRole('textbox', { name: 'Start (seconds)' })
  await waitFor(() => expect(document.querySelector('video')).not.toBeNull())
  fireEvent.loadedMetadata(document.querySelector('video')!)

  return { user, updatedSelection, quote, start, navigate: props.navigate, quoteData, project }
}

test('editing Start and tabbing out saves the captured input value without unmounting the screen', async () => {
  const { user, updatedSelection } = await mountNewDub()
  const startField = screen.getByRole('textbox', { name: 'Start (seconds)' })

  await user.clear(startField)
  await user.type(startField, '0.123')
  await user.tab()

  await waitFor(() => expect(updatedSelection).toHaveBeenCalledWith(expect.objectContaining({
    projectId,
    startMs: 123,
    endMs: 8_625,
  })))
  expect(await screen.findByRole('heading', { name: 'Selected section' })).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Start (seconds)' })).toHaveValue('0.123')
  expect(screen.queryByRole('heading', { name: 'This page could not be opened' })).not.toBeInTheDocument()
})

test.each([
  { startMs: 123, end: '1.122', duration: '0.999' },
  { startMs: 0, end: '8.626', duration: '8.626' },
])('shows correctable boundary feedback for an invalid $duration-second interval', async ({ startMs, end, duration }) => {
  const { user, updatedSelection, quote } = await mountNewDub(startMs)
  const endField = screen.getByRole('textbox', { name: 'End (seconds)' })

  await user.clear(endField)
  await user.type(endField, end)
  await user.tab()

  expect(await screen.findByRole('alert')).toHaveTextContent('Use a source-bounded interval from 1.000 through 120.000 seconds')
  expect(endField).toHaveAttribute('aria-invalid', 'true')
  expect(screen.getByText(`Selected duration: ${duration} seconds`)).toBeInTheDocument()
  expect(updatedSelection).not.toHaveBeenCalled()
  expect(quote).not.toHaveBeenCalled()
  expect(screen.getByRole('button', { name: 'Get exact quote' })).toBeDisabled()
})

test('shows and starts the one included retry without opening a price-confirmation dialog', async () => {
  const { user, quote, start, navigate, project, quoteData } = await mountNewDub(0, {
    firstAiLaunchAt: 1_800_000_000_000,
    includedRetryAvailable: true,
    attemptClass: 'included-retry',
    credits: 0,
  })

  await user.click(screen.getByRole('button', { name: 'Get exact quote' }))

  expect(await screen.findByText('Included retry — no additional credits')).toBeInTheDocument()
  expect(quote).toHaveBeenCalledWith(expect.objectContaining({
    projectId,
    expectedProjectRevision: project.revision,
    expectedActivePreparationId: undefined,
    expectedActivePreparationRevision: project.preparationRevision,
  }))
  await user.click(screen.getByRole('button', { name: 'Process for 0 credits' }))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(start).toHaveBeenCalledWith(expect.objectContaining({
    quoteId: quoteData.id,
    expectedProjectRevision: project.revision,
    expectedSourceRevision: project.sourceRevision,
    expectedActivePreparationId: undefined,
    expectedActivePreparationRevision: project.preparationRevision,
    acknowledgedDraftIds: [],
    replacementAcknowledged: false,
    draftLossAcknowledged: true,
    explicitAuthorization: true,
  }))
  expect(navigate).toHaveBeenCalledWith(routes.project(projectId, 'processing'))
})

test('does not present a quote bound to a different project revision as actionable', async () => {
  const { user, start } = await mountNewDub(0, { quoteProjectRevision: 1 })

  await user.click(screen.getByRole('button', { name: 'Get exact quote' }))

  expect(await screen.findByText('This quote is expired or no longer matches the saved source and section. Request a fresh quote.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Process for 9 credits' })).not.toBeInTheDocument()
  expect(start).not.toHaveBeenCalled()
})
