import { useId, type ReactNode } from 'react'
import { Pause, Play } from 'lucide-react'
import { Button } from '../../components/ui/button'

export type RecordingTransportMode = 'source' | 'recording'

export interface RecordingTransportLabels {
  mode: string
  source: string
  recording: string
  play: string
  pause: string
  seek: string
  timeline: string
  position: string
  recordingUnavailable: string
  waveformUnavailable: string
}

export interface RecordingTransportProps {
  /** Normalized 0–1 peak levels for the currently selected audio source. */
  peaks: readonly number[]
  durationMs: number
  currentTimeMs: number
  playing: boolean
  mode: RecordingTransportMode
  recordingAvailable: boolean
  disabled?: boolean
  labels: RecordingTransportLabels
  actions?: ReactNode
  onModeChange: (mode: RecordingTransportMode) => void
  onTogglePlayback: () => void
  onSeek: (timeMs: number) => void
}

function formatTime(valueMs: number): string {
  const totalSeconds = Math.floor(Math.max(0, valueMs) / 1000)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  const minutes = Math.floor(totalSeconds / 60)
  if (minutes < 60) return `${minutes}:${seconds}`
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${seconds}`
}

function clampPeak(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function RecordingTransport({
  peaks,
  durationMs,
  currentTimeMs,
  playing,
  mode,
  recordingAvailable,
  disabled = false,
  labels,
  actions,
  onModeChange,
  onTogglePlayback,
  onSeek,
}: RecordingTransportProps) {
  const instanceId = useId()
  const safeDuration = Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : 0
  const safeCurrentTime = Number.isFinite(currentTimeMs)
    ? Math.min(safeDuration, Math.max(0, currentTimeMs))
    : 0
  const progress = safeDuration > 0 ? safeCurrentTime / safeDuration : 0
  const safePeaks = peaks.map(clampPeak)
  const hasWaveform = safePeaks.length > 0
  const canSeek = !disabled && safeDuration > 0 && hasWaveform
  const seekId = `recording-transport-seek-${instanceId}`
  const waveformUnavailableId = `recording-transport-waveform-unavailable-${instanceId}`
  const recordingUnavailableId = `recording-transport-recording-unavailable-${instanceId}`
  const currentTimeLabel = formatTime(safeCurrentTime)
  const durationLabel = formatTime(safeDuration)

  return (
    <>
      <section className="recording-transport__timeline" aria-label={labels.timeline}>
        <div className="recording-transport__waveform-shell">
          <div className="recording-transport__waveform" aria-hidden="true">
            {safePeaks.map((peak, index) => (
              <span
                key={index}
                className="recording-transport__bar"
                data-played={index < Math.floor(progress * safePeaks.length) || undefined}
                style={{ height: `${Math.max(3, peak * 32)}px` }}
              />
            ))}
          </div>
          {hasWaveform && (
            <span
              className="recording-transport__playhead"
              aria-hidden="true"
              style={{ left: `${progress * 100}%` }}
            />
          )}
          {safeDuration > 0 && (
            <input
              id={seekId}
              className="recording-transport__seek"
              type="range"
              min={0}
              max={safeDuration}
              step={100}
              value={safeCurrentTime}
              aria-label={labels.seek}
              aria-valuetext={`${currentTimeLabel} / ${durationLabel}`}
              aria-describedby={!hasWaveform ? waveformUnavailableId : undefined}
              disabled={!canSeek}
              onChange={(event) => onSeek(Number(event.currentTarget.value))}
            />
          )}
        </div>
        {!hasWaveform && (
          <p id={waveformUnavailableId} className="recording-transport__waveform-note">
            {labels.waveformUnavailable}
          </p>
        )}
      </section>

      <div className="recording-transport__controls">
        <div className="recording-transport__main-controls">
          <div
            className="recording-transport__mode"
            role="group"
            aria-label={labels.mode}
            data-mode={mode}
          >
            <button
              className="recording-transport__mode-option"
              type="button"
              aria-pressed={mode === 'source'}
              disabled={disabled}
              onClick={() => onModeChange('source')}
            >
              {labels.source}
            </button>
            <button
              className="recording-transport__mode-option"
              type="button"
              aria-pressed={mode === 'recording'}
              aria-describedby={!recordingAvailable ? recordingUnavailableId : undefined}
              disabled={disabled || !recordingAvailable}
              onClick={() => onModeChange('recording')}
            >
              {labels.recording}
            </button>
          </div>

          <Button
            className="recording-transport__play"
            variant="secondary"
            size="small"
            disabled={disabled || safeDuration === 0}
            aria-label={playing ? labels.pause : labels.play}
            onClick={onTogglePlayback}
          >
            {playing
              ? <Pause aria-hidden="true" focusable="false" strokeWidth={1.1} />
              : <Play aria-hidden="true" focusable="false" strokeWidth={1.1} />}
            <span className="recording-transport__play-label">{playing ? labels.pause : labels.play}</span>
          </Button>

          <output
            className="recording-transport__position"
            htmlFor={seekId}
            aria-label={`${labels.position}: ${currentTimeLabel} / ${durationLabel}`}
          >
            {currentTimeLabel}<span aria-hidden="true"> / </span>{durationLabel}
          </output>
        </div>

        {!recordingAvailable && (
          <p id={recordingUnavailableId} className="recording-transport__recording-note">
            {labels.recordingUnavailable}
          </p>
        )}

        {actions != null && <div className="recording-transport__actions">{actions}</div>}
      </div>
    </>
  )
}
