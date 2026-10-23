import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RecordingTransport } from '../../src/features/recording/RecordingTransport'

const labels = {
  mode: 'Audio source',
  source: 'Original',
  recording: 'My recording',
  play: 'Play',
  pause: 'Pause',
  seek: 'Seek through audio',
  timeline: 'Audio timeline',
  position: 'Playback position',
  recordingUnavailable: 'Record this turn first to listen to your recording.',
  waveformUnavailable: 'Waveform is unavailable for this audio.',
}

function renderTransport(overrides: Partial<React.ComponentProps<typeof RecordingTransport>> = {}) {
  const onModeChange = vi.fn()
  const onTogglePlayback = vi.fn()
  const onSeek = vi.fn()
  const view = render(
    <RecordingTransport
      peaks={[0.15, 0.55, 0.34, 0.9, 0.22]}
      durationMs={12_000}
      currentTimeMs={2_500}
      playing={false}
      mode="source"
      recordingAvailable
      labels={labels}
      onModeChange={onModeChange}
      onTogglePlayback={onTogglePlayback}
      onSeek={onSeek}
      {...overrides}
    />,
  )
  return { ...view, onModeChange, onTogglePlayback, onSeek }
}

describe('RecordingTransport', () => {
  it('renders the selected source waveform, position, and common playback controls', () => {
    renderTransport()

    expect(screen.getByRole('region', { name: 'Audio timeline' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Audio source' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Original' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'My recording' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('slider', { name: 'Seek through audio' })).toHaveAttribute('aria-valuetext', '0:02 / 0:12')
    expect(screen.getByLabelText('Playback position: 0:02 / 0:12')).toHaveTextContent('0:02 / 0:12')
    expect(document.querySelectorAll('.recording-transport__bar')).toHaveLength(5)
  })

  it('delegates mode changes, play/pause, and scrubbing to the synchronized owner', () => {
    const harness = renderTransport()

    fireEvent.click(screen.getByRole('button', { name: 'My recording' }))
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.change(screen.getByRole('slider', { name: 'Seek through audio' }), {
      target: { value: '8000' },
    })

    expect(harness.onModeChange).toHaveBeenCalledWith('recording')
    expect(harness.onTogglePlayback).toHaveBeenCalledOnce()
    expect(harness.onSeek).toHaveBeenCalledWith(8_000)
  })

  it('keeps an unavailable take visible but disabled with a clear reason and no invented waveform', () => {
    renderTransport({ peaks: [], recordingAvailable: false })

    expect(screen.getByRole('button', { name: 'My recording' })).toBeDisabled()
    expect(screen.getByText('Record this turn first to listen to your recording.')).toBeInTheDocument()
    expect(screen.getByText('Waveform is unavailable for this audio.')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Seek through audio' })).toBeDisabled()
    expect(document.querySelectorAll('.recording-transport__bar')).toHaveLength(0)
  })
})
