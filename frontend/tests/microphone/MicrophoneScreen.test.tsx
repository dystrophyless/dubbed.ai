import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FeatureScreenProps } from '../../src/app/screen-contract'
import { routes } from '../../src/app/routes'
import type { BrowserMediaService, ServiceError } from '../../src/services/contracts'
import { MicrophoneScreen } from '../../src/features/microphone/MicrophoneScreen'

function makeStream() {
  const track = Object.assign(new EventTarget(), {
    readyState: 'live' as MediaStreamTrackState,
    muted: false,
    getSettings: () => ({ deviceId: 'mic-1' }),
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

function makeServices(stream: MediaStream) {
  const requestMicrophone = vi.fn<BrowserMediaService['requestMicrophone']>().mockResolvedValue({
    status: 'ok',
    data: { stream, inputId: 'mic-1' },
    replayed: false,
  })
  const startMicrophoneTest = vi.fn<BrowserMediaService['startMicrophoneTest']>()
  const browserMedia = {
    listInputs: vi.fn().mockResolvedValue({
      status: 'ok',
      data: [{ id: 'mic-1', label: 'USB Microphone', selected: true }],
      replayed: false,
    }),
    requestMicrophone,
    watchInputLevel: vi.fn(({ onLevel }: { onLevel: (sample: { rms: number; peak: number }) => void }) => {
      onLevel({ rms: 0, peak: 0 })
      return { ready: Promise.resolve({ status: 'ok', data: undefined, replayed: false }), stop: vi.fn() }
    }),
    startMicrophoneTest,
    completeMicrophoneCheck: vi.fn(),
    captureFixedWindow: vi.fn(),
  } as unknown as BrowserMediaService
  return { browserMedia, requestMicrophone, startMicrophoneTest }
}

function microphoneError(code: ServiceError['code']) {
  return {
    status: 'error' as const,
    error: { code, message: 'Synthetic microphone request failure.', retry: 'none' as const },
    replayed: false,
  }
}

function screenProps(route: FeatureScreenProps['route'], browserMedia: BrowserMediaService) {
  return {
    route,
    locale: 'en',
    services: { browserMedia },
    navigate: vi.fn().mockResolvedValue(true),
  } as unknown as FeatureScreenProps
}

describe('microphone check screen', () => {
  it('asks permission only after an explicit action and continues without an optional recording test', async () => {
    const { stream, track } = makeStream()
    const services = makeServices(stream)
    const props = screenProps(routes.microphoneFromNew(), services.browserMedia)

    const view = render(<MicrophoneScreen {...props} />)

    await waitFor(() => expect(services.browserMedia.listInputs).toHaveBeenCalledOnce())
    expect(services.browserMedia.requestMicrophone).not.toHaveBeenCalled()
    expect(services.browserMedia.startMicrophoneTest).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Allow microphone access' }))
    await screen.findByText('Connected. The browser is providing a live microphone track.')
    expect(services.browserMedia.requestMicrophone).toHaveBeenCalledWith('mic-1')

    const continueButton = screen.getByRole('button', { name: 'Continue to New Dub' })
    expect(continueButton).toBeEnabled()
    fireEvent.click(continueButton)
    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith(routes.newDub()))
    expect(services.browserMedia.completeMicrophoneCheck).toHaveBeenCalledWith('mic-1')
    expect(services.browserMedia.startMicrophoneTest).not.toHaveBeenCalled()

    view.unmount()
    expect(track.stop).toHaveBeenCalledOnce()
  })

  it('sends a project-origin check back to that project Record screen', async () => {
    const { stream } = makeStream()
    const services = makeServices(stream)
    const projectId = 'project-72' as Parameters<typeof routes.project>[0]
    const destination = routes.project(projectId, 'record')
    const props = screenProps(routes.microphoneForProject(projectId), services.browserMedia)
    render(<MicrophoneScreen {...props} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Allow microphone access' }))
    await screen.findByText('Connected. The browser is providing a live microphone track.')
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    await waitFor(() => expect(props.navigate).toHaveBeenCalledWith(destination))
  })

  it.each([
    { kind: 'revoked permission', code: 'forbidden', message: 'Microphone access was denied.' },
    { kind: 'missing input', code: 'not-found', message: 'That microphone is no longer available.' },
    { kind: 'busy input', code: 'media-invalid', message: 'The microphone could not be opened.' },
    { kind: 'unsupported capture', code: 'unsupported', message: 'This browser does not provide the required microphone controls.' },
  ] as const)('shows $kind and waits for an explicit retry', async ({ code, message }) => {
    const { stream } = makeStream()
    const services = makeServices(stream)
    services.requestMicrophone
      .mockReset()
      .mockResolvedValueOnce(microphoneError(code))
      .mockResolvedValueOnce({ status: 'ok', data: { stream, inputId: 'mic-1' }, replayed: false })
    const props = screenProps(routes.microphoneFromNew(), services.browserMedia)
    render(<MicrophoneScreen {...props} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Allow microphone access' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(services.requestMicrophone).toHaveBeenCalledTimes(1)
    expect(services.startMicrophoneTest).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Continue to New Dub' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Connect selected microphone' }))
    await screen.findByText('Connected. The browser is providing a live microphone track.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(services.requestMicrophone).toHaveBeenCalledTimes(2)
    expect(services.startMicrophoneTest).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Continue to New Dub' })).toBeEnabled()
  })

  it('treats a lost track as not ready until the user reconnects', async () => {
    const first = makeStream()
    const retry = makeStream()
    const services = makeServices(first.stream)
    services.requestMicrophone
      .mockReset()
      .mockResolvedValueOnce({ status: 'ok', data: { stream: first.stream, inputId: 'mic-1' }, replayed: false })
      .mockResolvedValueOnce({ status: 'ok', data: { stream: retry.stream, inputId: 'mic-1' }, replayed: false })
    const props = screenProps(routes.microphoneFromNew(), services.browserMedia)
    const view = render(<MicrophoneScreen {...props} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Allow microphone access' }))
    await screen.findByText('Connected. The browser is providing a live microphone track.')
    first.track.dispatchEvent(new Event('ended'))

    expect(await screen.findByText('The microphone connection ended. Reconnect to continue.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue to New Dub' })).toBeDisabled()
    expect(services.requestMicrophone).toHaveBeenCalledTimes(1)
    expect(services.startMicrophoneTest).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Connect selected microphone' }))
    await screen.findByText('Connected. The browser is providing a live microphone track.')
    expect(services.requestMicrophone).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', { name: 'Continue to New Dub' })).toBeEnabled()

    view.unmount()
    expect(first.track.stop).toHaveBeenCalledOnce()
    expect(retry.track.stop).toHaveBeenCalledOnce()
  })
})
