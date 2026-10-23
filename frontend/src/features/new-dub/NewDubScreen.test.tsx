import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../app/locale'
import { routes } from '../../app/routes'
import type { FeatureScreenProps } from '../../app/screen-contract'
import type { CreditSnapshot, Services } from '../../services/contracts'
import { asRevision, ids } from '../../services/contracts'
import type { LocalSourceProbe } from '../../media/source-probe'
import { probeLocalSource } from '../../media/source-probe'
import { NewDubScreen } from './NewDubScreen'

vi.mock('../../media/source-probe', () => ({
  probeLocalSource: vi.fn(),
}))

const account = {
  id: ids.account('new-dub-test-account'),
  email: 'new-dub@example.test',
  locale: 'en' as const,
  revision: asRevision(1),
  deleted: false,
  createdAt: 1_700_000_000_000,
}

const creditSnapshot: CreditSnapshot = {
  accountId: account.id,
  revision: asRevision(1),
  available: 120,
  reserved: 0,
  purchasedRemainder: 0,
  welcomeGrantEligible: false,
  welcomeGrantApplied: true,
  projectCapacity: {
    used: 0,
    total: 2,
    firstPurchaseUpgrade: false,
    revision: asRevision(1),
  },
}

function probe(overrides: Partial<LocalSourceProbe> = {}): LocalSourceProbe {
  return {
    fileName: 'source.mp4',
    mimeType: 'video/mp4',
    byteLength: 4,
    container: 'iso-bmff',
    audioTrack: 'present',
    hasAudio: true,
    audioSampleFrames: null,
    sampleContent: 'unknown',
    browserMetadata: 'loaded',
    durationMs: 8_500,
    width: 640,
    height: 360,
    fixtureKey: null,
    fixtureScenario: null,
    fixtureSha256: null,
    ...overrides,
  }
}

function makeServices() {
  const services = {
    credits: { snapshot: vi.fn().mockResolvedValue({ status: 'ok', data: creditSnapshot, replayed: false }) },
    uploads: { commitInitial: vi.fn(), replaceSource: vi.fn() },
  }
  return services as unknown as Services
}

function renderScreen(services: Services) {
  const props = {
    route: routes.newDub(),
    locale: 'en',
    identity: {
      status: 'signed-in',
      account,
      session: { id: ids.session('new-dub-test-session'), accountId: account.id, expiresAt: Date.now() + 60_000, revision: asRevision(1) },
    },
    signInIntent: { kind: 'new' },
    services,
    navigate: vi.fn().mockResolvedValue(true),
    refreshIdentity: vi.fn(),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  } as unknown as FeatureScreenProps

  return render(
    <LocaleProvider services={services} onAccountUpdated={vi.fn()}>
      <NewDubScreen {...props} />
    </LocaleProvider>,
  )
}

describe('NewDubScreen upload validation', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.setItem('dubbed.locale', 'en')
    vi.mocked(probeLocalSource).mockReset()
  })

  it('distinguishes confirmed missing audio from unknown track evidence without creating a project', async () => {
    const user = userEvent.setup()
    const services = makeServices()
    vi.mocked(probeLocalSource)
      .mockResolvedValueOnce(probe({ audioTrack: 'absent', hasAudio: false, sampleContent: 'no-track' }))
      .mockResolvedValueOnce(probe({ audioTrack: 'unknown', hasAudio: null, durationMs: null, width: null, height: null }))

    renderScreen(services)
    const input = await screen.findByLabelText('Choose video')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose video' })).toBeEnabled())
    await user.upload(input, new File(['clip'], 'no-audio.mp4', { type: 'video/mp4' }))
    expect(await screen.findByText('No audio in this video — choose another file.')).toBeInTheDocument()
    expect(services.uploads.commitInitial).not.toHaveBeenCalled()

    await user.upload(input, new File(['clip'], 'unknown-audio.mp4', { type: 'video/mp4' }))
    expect(await screen.findByText(/presence could not be established from the available local evidence/)).toBeInTheDocument()
    expect(services.uploads.commitInitial).not.toHaveBeenCalled()
  })

  it('keeps the unresolved sub-second source rule explicit and does not occupy a project slot', async () => {
    const user = userEvent.setup()
    const services = makeServices()
    vi.mocked(probeLocalSource).mockResolvedValue(probe({ durationMs: 999 }))

    renderScreen(services)
    const input = await screen.findByLabelText('Choose video')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose video' })).toBeEnabled())
    await user.upload(input, new File(['clip'], 'short.mp4', { type: 'video/mp4' }))

    expect(await screen.findByText(/shorter than 1 second.*draft was not created/i)).toBeInTheDocument()
    expect(services.uploads.commitInitial).not.toHaveBeenCalled()
    expect(services.credits.snapshot).toHaveBeenCalledTimes(1)
  })
})
