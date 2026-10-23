import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { createServices } from './services/index'
import { asRevision, ids, type AccountSnapshot, type BrowserMediaService, type Services, type Session } from './services/contracts'
import { routes } from './app/routes'
import type { FeatureScreenProps } from './app/screen-contract'
import { useCallback, useEffect, useRef } from 'react'
import { Button } from './components/ui/button'
import { LocaleProvider } from './app/locale'
import { ServiceNotice } from './components/ui/notice'

function makeAuthenticatedServices(namespace: string, isReady: BrowserMediaService['isRecordingEntryReady']) {
  const mock = createServices({ adapter: 'mock', namespace })
  const account: AccountSnapshot = {
    id: ids.account(`${namespace}-account`),
    email: `${namespace}@example.test`,
    locale: 'en',
    revision: asRevision(0),
    deleted: false,
    createdAt: Date.now(),
  }
  const session: Session = {
    id: ids.session(`${namespace}-session`),
    accountId: account.id,
    expiresAt: Date.now() + 60_000,
    revision: asRevision(0),
  }
  const track = Object.assign(new EventTarget(), {
    readyState: 'live' as MediaStreamTrackState,
    muted: false,
    getSettings: () => ({ deviceId: 'mic-gate' }),
    stop: vi.fn(function (this: EventTarget & { readyState: MediaStreamTrackState }) {
      this.readyState = 'ended'
      this.dispatchEvent(new Event('ended'))
    }),
  })
  const stream = {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
  const requestMicrophone = vi.fn<BrowserMediaService['requestMicrophone']>().mockResolvedValue({
    status: 'ok',
    data: { stream, inputId: 'mic-gate' },
    replayed: false,
  })
  const completeMicrophoneCheck = vi.fn<BrowserMediaService['completeMicrophoneCheck']>()
  const startMicrophoneTest = vi.fn<BrowserMediaService['startMicrophoneTest']>()
  const browserMedia: BrowserMediaService = {
    ...mock.browserMedia,
    listInputs: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 'mic-gate', label: 'USB Microphone', selected: true }],
      replayed: false,
    }),
    requestMicrophone,
    isRecordingEntryReady: isReady,
    completeMicrophoneCheck,
    watchInputLevel: vi.fn(() => ({
      ready: Promise.resolve({ status: 'ok' as const, data: undefined, replayed: false }),
      stop: vi.fn(),
    })),
    startMicrophoneTest,
  }
  const services: Services = {
    ...mock,
    browserMedia,
    identity: {
      ...mock.identity,
      current: async () => ({ status: 'ok', data: { account, session }, replayed: false }),
    },
  }
  return { services, requestMicrophone, completeMicrophoneCheck, startMicrophoneTest, track }
}

describe('recording-entry gate', () => {
  it('requires the first device check, then rechecks readiness on later entry', async () => {
    let readinessCalls = 0
    const isReady: BrowserMediaService['isRecordingEntryReady'] = vi.fn(async () => {
      readinessCalls += 1
      return readinessCalls === 2
    })
    const { services, requestMicrophone, completeMicrophoneCheck, startMicrophoneTest } =
      makeAuthenticatedServices('device-entry', isReady)
    const projectId = ids.project('device-entry-project')

    function RecordingProbe(props: FeatureScreenProps) {
      return (
        <section>
          <h1>Record probe</h1>
          <Button onClick={() => void props.navigate(routes.projects())}>Leave recording screen</Button>
        </section>
      )
    }
    function MicrophoneProbe(props: FeatureScreenProps) {
      return (
        <section>
          <h1>Check your microphone</h1>
          <Button onClick={() => {
            completeMicrophoneCheck('mic-gate')
            void props.navigate(routes.project(projectId, 'record'))
          }}>Continue after explicit check</Button>
        </section>
      )
    }
    function ProjectsProbe(props: FeatureScreenProps) {
      return (
        <section>
          <h1>Projects probe</h1>
          <Button onClick={() => void props.navigate(routes.project(projectId, 'record'))}>
            Reopen project Record
          </Button>
        </section>
      )
    }

    window.history.replaceState(null, '', `/projects/${projectId}/record`)
    const rendered = render(
      <App services={services} screens={{ recording: RecordingProbe, microphone: MicrophoneProbe, projects: ProjectsProbe }} />,
    )
    try {
      expect(await screen.findByRole('heading', { name: 'Check your microphone' })).toBeVisible()
      expect(isReady).toHaveBeenCalledOnce()
      expect(requestMicrophone).not.toHaveBeenCalled()
      expect(completeMicrophoneCheck).not.toHaveBeenCalled()
      expect(startMicrophoneTest).not.toHaveBeenCalled()

      fireEvent.click(screen.getByRole('button', { name: 'Continue after explicit check' }))
      expect(await screen.findByRole('heading', { name: 'Record probe' })).toBeVisible()
      expect(completeMicrophoneCheck).toHaveBeenCalledWith('mic-gate')
      expect(isReady).toHaveBeenCalledTimes(2)

      fireEvent.click(screen.getByRole('button', { name: 'Leave recording screen' }))
      expect(await screen.findByRole('heading', { name: 'Projects probe' })).toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: 'Reopen project Record' }))
      expect(await screen.findByRole('heading', { name: 'Check your microphone' })).toBeVisible()
      expect(isReady).toHaveBeenCalledTimes(3)
      expect(requestMicrophone).not.toHaveBeenCalled()
      expect(startMicrophoneTest).not.toHaveBeenCalled()
    } finally {
      rendered.unmount()
      window.history.replaceState(null, '', '/')
    }
  })

  it('ignores a delayed failure after navigation changes the active project', async () => {
    const firstProjectId = ids.project('device-entry-race-a')
    const secondProjectId = ids.project('device-entry-race-b')
    let resolveFirstReadiness!: (ready: boolean) => void
    const firstReadiness = new Promise<boolean>((resolve) => {
      resolveFirstReadiness = resolve
    })
    const isReady: BrowserMediaService['isRecordingEntryReady'] = vi.fn(() =>
      window.location.pathname === `/projects/${firstProjectId}/record`
        ? firstReadiness
        : Promise.resolve(true),
    )
    const { services } = makeAuthenticatedServices('device-entry-race', isReady)

    function RecordingProbe(props: FeatureScreenProps) {
      const projectId = props.route.kind === 'project' ? props.route.projectId : 'unexpected'
      return <h1>Record probe for {projectId}</h1>
    }
    function ProjectsProbe(props: FeatureScreenProps) {
      return (
        <section>
          <h1>Projects probe</h1>
          <Button onClick={() => void props.navigate(routes.project(secondProjectId, 'record'))}>
            Open second project Record
          </Button>
        </section>
      )
    }

    window.history.replaceState(null, '', `/projects/${firstProjectId}/record`)
    const rendered = render(<App services={services} screens={{ recording: RecordingProbe, projects: ProjectsProbe }} />)
    try {
      expect(await screen.findByText('Checking microphone availability…')).toBeVisible()
      fireEvent.click(screen.getByRole('link', { name: 'Projects' }))
      expect(await screen.findByRole('heading', { name: 'Projects probe' })).toBeVisible()
      fireEvent.click(screen.getByRole('button', { name: 'Open second project Record' }))
      expect(await screen.findByRole('heading', { name: `Record probe for ${secondProjectId}` })).toBeVisible()

      await act(async () => {
        resolveFirstReadiness(false)
        await firstReadiness
      })

      expect(window.location.pathname).toBe(`/projects/${secondProjectId}/record`)
      expect(screen.getByRole('heading', { name: `Record probe for ${secondProjectId}` })).toBeVisible()
      expect(screen.queryByRole('heading', { name: 'Check your microphone' })).not.toBeInTheDocument()
    } finally {
      rendered.unmount()
      window.history.replaceState(null, '', '/')
    }
  })
})

describe('frontend runtime', () => {
  it('renders the landing and sends an anonymous start action to registration', async () => {
    const user = userEvent.setup()
    const services = createServices({ adapter: 'mock', namespace: 'test-landing' })
    render(<App services={services} />)

    expect(await screen.findByRole('heading', { name: 'Dub your own scene' })).toBeVisible()
    expect(screen.getByText(/120 free welcome credits/)).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Start dubbing' }))

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeVisible()
    expect(window.location.pathname).toBe('/register')
  })

  it('keeps a route guard in front of shell navigation', async () => {
    const user = userEvent.setup()
    const mock = createServices({ adapter: 'mock', namespace: 'test-guard' })
    const account: AccountSnapshot = {
      id: ids.account('guard-account'),
      email: 'guard@example.test',
      locale: 'en',
      revision: asRevision(0),
      deleted: false,
      createdAt: Date.now(),
    }
    const session: Session = {
      id: ids.session('guard-session'),
      accountId: account.id,
      expiresAt: Date.now() + 60_000,
      revision: asRevision(0),
    }
    const services: Services = {
      ...mock,
      identity: {
        ...mock.identity,
        current: async () => ({ status: 'ok', data: { account, session }, replayed: false }),
      },
    }
    const guardReasons: string[] = []

    function GuardedScreen(props: FeatureScreenProps) {
      const { registerRouteExitGuard } = props
      const allowNextExit = useRef(false)
      const guard = useCallback((request: { reason: 'navigation' | 'browser-history' }) => {
        guardReasons.push(request.reason)
        if (!allowNextExit.current) return false
        allowNextExit.current = false
        return true
      }, [])
      useEffect(() => registerRouteExitGuard(guard), [guard, registerRouteExitGuard])
      return (
        <section>
          <h1>{props.route.kind === 'projects' ? 'Guarded projects' : 'Guarded screen'}</h1>
          <Button onClick={() => void props.navigate(routes.projects())}>Try to leave</Button>
          <Button
            onClick={() => {
              allowNextExit.current = true
              void props.navigate(routes.projects())
            }}
          >
            Approve leaving
          </Button>
        </section>
      )
    }

    window.history.replaceState(null, '', '/new')
    render(<App services={services} screens={{ newDub: GuardedScreen, projects: GuardedScreen }} />)

    expect(await screen.findByRole('heading', { name: 'Guarded screen' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const mobileMenu = screen.getByRole('dialog', { name: 'Navigation' })
    expect(mobileMenu).toBeVisible()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const reopenedMenu = screen.getByRole('dialog', { name: 'Navigation' })
    await user.click(within(reopenedMenu).getByRole('button', { name: 'Close navigation' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try to leave' }))
    expect(screen.getByRole('heading', { name: 'Guarded screen' })).toBeVisible()
    expect(window.location.pathname).toBe('/new')

    await user.click(screen.getByRole('button', { name: 'Approve leaving' }))
    expect(await screen.findByRole('heading', { name: 'Guarded projects' })).toBeVisible()
    window.history.back()
    await waitFor(() => expect(guardReasons).toContain('browser-history'))
    expect(window.location.pathname).toBe('/projects')
    expect(screen.getByRole('heading', { name: 'Guarded projects' })).toBeVisible()
  })

  it('localizes service failures and ignores adapter-provided field prose', () => {
    const services = createServices({ adapter: 'mock', namespace: 'test-localized-errors' })
    window.localStorage.setItem('dubbed.locale', 'ru')

    render(
      <LocaleProvider services={services} onAccountUpdated={() => undefined}>
        <ServiceNotice
          code="adapter-unavailable"
          fieldErrors={{ email: 'English details from an adapter' }}
        />
      </LocaleProvider>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Этот сервис недоступен в данной сборке.')
    expect(alert).toHaveTextContent('Проверьте это поле и попробуйте снова.')
    expect(alert).not.toHaveTextContent('English details from an adapter')
  })

  it('fences account snapshot updates by account identity and revision', async () => {
    const user = userEvent.setup()
    const accountA: AccountSnapshot = {
      id: ids.account('snapshot-account-a'),
      email: 'a@example.test',
      locale: 'en',
      revision: asRevision(4),
      deleted: false,
      createdAt: 1,
    }
    const newerAccountA = { ...accountA, revision: asRevision(5) }
    const staleAccountA = { ...accountA, revision: asRevision(3) }
    const lateAccountA = { ...accountA, revision: asRevision(20) }
    const accountB: AccountSnapshot = {
      ...accountA,
      id: ids.account('snapshot-account-b'),
      email: 'b@example.test',
      revision: asRevision(1),
    }
    let currentAccount = accountA
    let currentSession: Session = {
      id: ids.session('snapshot-session-a'),
      accountId: accountA.id,
      expiresAt: Date.now() + 60_000,
      revision: asRevision(0),
    }
    const mock = createServices({ adapter: 'mock', namespace: 'test-account-snapshot-fence' })
    const services: Services = {
      ...mock,
      identity: {
        ...mock.identity,
        current: async () => ({ status: 'ok', data: { account: currentAccount, session: currentSession }, replayed: false }),
      },
    }

    function SnapshotScreen(props: FeatureScreenProps) {
      const account = props.identity.status === 'signed-in' ? props.identity.account : null
      const session = props.identity.status === 'signed-in' ? props.identity.session : null
      return (
        <section>
          <output data-testid="identity-snapshot">
            {account ? `${account.id}:${account.revision}:${session?.id}` : props.identity.status}
          </output>
          <Button onClick={() => props.onAccountUpdated?.(newerAccountA)}>Apply newer account A snapshot</Button>
          <Button onClick={() => props.onAccountUpdated?.(staleAccountA)}>Apply older account A snapshot</Button>
          <Button onClick={() => {
            currentAccount = accountB
            currentSession = {
              id: ids.session('snapshot-session-b'),
              accountId: accountB.id,
              expiresAt: Date.now() + 60_000,
              revision: asRevision(0),
            }
            void props.refreshIdentity()
          }}>Switch account</Button>
          <Button onClick={() => props.onAccountUpdated?.(lateAccountA)}>Deliver late account A snapshot</Button>
        </section>
      )
    }

    window.history.replaceState(null, '', '/new')
    render(<App services={services} screens={{ newDub: SnapshotScreen }} />)

    expect(await screen.findByTestId('identity-snapshot')).toHaveTextContent(`${accountA.id}:4:snapshot-session-a`)
    await user.click(screen.getByRole('button', { name: 'Apply newer account A snapshot' }))
    expect(screen.getByTestId('identity-snapshot')).toHaveTextContent(`${accountA.id}:5:snapshot-session-a`)
    await user.click(screen.getByRole('button', { name: 'Apply older account A snapshot' }))
    expect(screen.getByTestId('identity-snapshot')).toHaveTextContent(`${accountA.id}:5:snapshot-session-a`)

    await user.click(screen.getByRole('button', { name: 'Switch account' }))
    expect(await screen.findByTestId('identity-snapshot')).toHaveTextContent(`${accountB.id}:1:snapshot-session-b`)
    await user.click(screen.getByRole('button', { name: 'Deliver late account A snapshot' }))
    expect(screen.getByTestId('identity-snapshot')).toHaveTextContent(`${accountB.id}:1:snapshot-session-b`)
  })

  it('refreshes signed-in identity only at long session expiry and cancels the old session timer', async () => {
    const startTime = 1_800_000_000_000
    const maxTimeoutMs = 2_147_483_647
    const sessionLifetimeMs = 30 * 24 * 60 * 60 * 1000
    vi.useFakeTimers({ now: startTime })
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
    const accountA: AccountSnapshot = {
      id: ids.account('expiry-account-a'),
      email: 'expiry-a@example.test',
      locale: 'en',
      revision: asRevision(0),
      deleted: false,
      createdAt: startTime,
    }
    const accountB: AccountSnapshot = {
      ...accountA,
      id: ids.account('expiry-account-b'),
      email: 'expiry-b@example.test',
    }
    const sessionA: Session = {
      id: ids.session('expiry-session-a'),
      accountId: accountA.id,
      expiresAt: startTime + sessionLifetimeMs,
      revision: asRevision(0),
    }
    let currentAccount = accountA
    let currentSession = sessionA
    const identityReadAt: number[] = []
    const mock = createServices({ adapter: 'mock', namespace: 'test-long-session-expiry' })
    const services: Services = {
      ...mock,
      identity: {
        ...mock.identity,
        current: async () => {
          identityReadAt.push(Date.now())
          if (Date.now() >= currentSession.expiresAt) {
            return { status: 'error', error: { code: 'expired', message: 'Session expired.', retry: 'none' } }
          }
          return { status: 'ok', data: { account: currentAccount, session: currentSession }, replayed: false }
        },
      },
    }

    function SessionScreen(props: FeatureScreenProps) {
      const session = props.identity.status === 'signed-in' ? props.identity.session.id : props.identity.status
      return (
        <section>
          <output data-testid="expiry-session">{session}</output>
          <Button onClick={() => {
            currentAccount = accountB
            currentSession = {
              id: ids.session('expiry-session-b'),
              accountId: accountB.id,
              expiresAt: Date.now() + sessionLifetimeMs,
              revision: asRevision(0),
            }
            void props.refreshIdentity()
          }}>Switch session</Button>
        </section>
      )
    }

    window.history.replaceState(null, '', '/new')
    const rendered = render(<App services={services} screens={{ newDub: SessionScreen }} />)
    try {
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(screen.getByTestId('expiry-session')).toHaveTextContent(sessionA.id)
      expect(identityReadAt).toEqual([startTime])
      expect(setTimeoutSpy.mock.calls
        .map(([, delay]) => Number(delay))
        .filter(Number.isFinite)
        .every((delay) => delay <= maxTimeoutMs)).toBe(true)

      await act(async () => { await vi.advanceTimersByTimeAsync(maxTimeoutMs - 1) })
      expect(identityReadAt).toHaveLength(1)
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect(identityReadAt).toHaveLength(1)

      fireEvent.click(screen.getByRole('button', { name: 'Switch session' }))
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      expect(screen.getByTestId('expiry-session')).toHaveTextContent('expiry-session-b')
      expect(identityReadAt).toHaveLength(2)
      const remainingToOldExpiry = sessionA.expiresAt - Date.now()
      await act(async () => { await vi.advanceTimersByTimeAsync(remainingToOldExpiry - 1) })
      expect(identityReadAt).toHaveLength(2)
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect(identityReadAt).toHaveLength(2)

      const remainingToCurrentExpiry = currentSession.expiresAt - Date.now()
      await act(async () => { await vi.advanceTimersByTimeAsync(remainingToCurrentExpiry - 1) })
      expect(identityReadAt).toHaveLength(2)
      expect(screen.getByTestId('expiry-session')).toHaveTextContent('expiry-session-b')
      await act(async () => { await vi.advanceTimersByTimeAsync(1) })
      expect(identityReadAt).toHaveLength(3)
      expect(identityReadAt[2]).toBe(currentSession.expiresAt)
      expect(screen.queryByTestId('expiry-session')).not.toBeInTheDocument()
      await act(async () => { await vi.advanceTimersByTimeAsync(maxTimeoutMs * 2) })
      expect(identityReadAt).toHaveLength(3)
    } finally {
      rendered.unmount()
      setTimeoutSpy.mockRestore()
      vi.clearAllTimers()
      vi.useRealTimers()
      window.history.replaceState(null, '', '/')
    }
  })

})
