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

function renderScreen(services: Services, locale: 'en' | 'ru' = 'en') {
  const props = {
    route: routes.newDub(),
    locale,
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

  it.each([
    {
      locale: 'en' as const,
      chooseVideo: 'Choose video',
      validateAndSave: 'Validate and save draft',
      tooShort: 'This video is shorter than 1 second. Choose a video at least 1 second long.',
      localCheck: 'Local checks passed. The mock service still needs to accept and save this source.',
    },
    {
      locale: 'ru' as const,
      chooseVideo: 'Выбрать видео',
      validateAndSave: 'Проверить и сохранить черновик',
      tooShort: 'Это видео короче 1 секунды. Выберите видео длительностью не менее 1 секунды.',
      localCheck: 'Локальные проверки пройдены. Сервис имитации ещё должен принять и сохранить этот источник.',
    },
  ])('rejects a 999 ms source with actionable $locale copy and accepts exactly 1000 ms', async ({ locale, chooseVideo, validateAndSave, tooShort, localCheck }) => {
    const user = userEvent.setup()
    const services = makeServices()
    vi.mocked(probeLocalSource)
      .mockResolvedValueOnce(probe({ durationMs: 999 }))
      .mockResolvedValueOnce(probe({ durationMs: 1_000 }))

    renderScreen(services, locale)
    const input = await screen.findByLabelText(chooseVideo)
    await waitFor(() => expect(screen.getByRole('button', { name: chooseVideo })).toBeEnabled())
    await user.upload(input, new File(['clip'], 'short.mp4', { type: 'video/mp4' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(tooShort)
    expect(services.uploads.commitInitial).not.toHaveBeenCalled()
    expect(services.credits.snapshot).toHaveBeenCalledTimes(1)

    await user.upload(input, new File(['clip'], 'exactly-one-second.mp4', { type: 'video/mp4' }))

    expect(await screen.findByRole('button', { name: validateAndSave })).toBeEnabled()
    expect(screen.getByText(localCheck)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(services.uploads.commitInitial).not.toHaveBeenCalled()
  })
})
