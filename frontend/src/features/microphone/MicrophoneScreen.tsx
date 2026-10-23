import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, RefreshCw } from 'lucide-react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { routes } from '../../app/routes'
import type { MediaInput, MicrophoneTestCapture, MicrophoneTestOutcome, ServiceError } from '../../services/contracts'
import { Button } from '../../components/ui/button'
import './MicrophoneScreen.css'

const testDurationLimitMs = 10_000

const copy = {
  en: {
    title: 'Check your microphone',
    description: 'Choose an input and confirm that your browser can use it. Nothing is recorded unless you start an optional test.',
    deviceLabel: 'Microphone input',
    noInputs: 'No microphone inputs are currently exposed by the browser.',
    refreshInputs: 'Refresh devices',
    allowAccess: 'Allow microphone access',
    reconnect: 'Connect selected microphone',
    requesting: 'Requesting microphone access…',
    waiting: 'Your browser has not been asked for microphone access yet.',
    connected: 'Connected. The browser is providing a live microphone track.',
    paused: 'The browser has paused this microphone input. Resume it or choose another input.',
    lost: 'The microphone connection ended. Reconnect to continue.',
    denied: 'Microphone access was denied. Allow access in your browser settings, then try again.',
    missing: 'That microphone is no longer available. Refresh the device list or choose another input.',
    busy: 'The microphone could not be opened. It may be in use or unavailable.',
    unsupported: 'This browser does not provide the required microphone controls.',
    listFailed: 'The browser could not list microphone inputs. You can still try the default input.',
    mismatch: 'Connect the selected input before continuing.',
    levelLabel: 'Microphone input level',
    levelHelp: 'This local meter reports signal level only. It does not judge speech or readiness.',
    meterUnavailable: 'The browser could not show a live level meter. A live microphone connection is still available.',
    testHeading: 'Optional local test',
    testHelp: 'Record up to 10 seconds, then listen here. The test stays in this browser session and is cleared when you leave.',
    recordTest: 'Record test',
    stop: 'Stop',
    listening: 'Recorded locally. Playback is available below; this does not judge speech.',
    noBytes: 'No recording data was returned. The live connection above remains the readiness check.',
    testEndedEarly: 'The test ended before its time limit. The partial test remains local.',
    testFailed: 'The browser could not finish the local microphone test. Reconnect and try again.',
    playbackFailed: 'This browser could not play the local test recording.',
    localPlayback: 'Local test recording',
    continue: 'Continue',
    continuing: 'Continuing…',
    nextNew: 'Continue to New Dub',
    privacy: 'The test is not uploaded, saved to a project, or used to create a take.',
  },
  ru: {
    title: 'Проверка микрофона',
    description: 'Выберите вход и проверьте, что браузер может его использовать. Запись начнётся только по вашему запросу.',
    deviceLabel: 'Вход микрофона',
    noInputs: 'Браузер сейчас не показывает доступные микрофоны.',
    refreshInputs: 'Обновить устройства',
    allowAccess: 'Разрешить доступ к микрофону',
    reconnect: 'Подключить выбранный микрофон',
    requesting: 'Запрашиваем доступ к микрофону…',
    waiting: 'Браузер ещё не запрашивал доступ к микрофону.',
    connected: 'Подключено. Браузер передаёт активную дорожку микрофона.',
    paused: 'Браузер приостановил этот микрофон. Возобновите его или выберите другой вход.',
    lost: 'Подключение к микрофону прервано. Подключитесь снова, чтобы продолжить.',
    denied: 'Доступ к микрофону запрещён. Разрешите его в настройках браузера и повторите попытку.',
    missing: 'Этот микрофон больше недоступен. Обновите список или выберите другой вход.',
    busy: 'Не удалось открыть микрофон. Возможно, он занят или недоступен.',
    unsupported: 'В этом браузере недоступны необходимые средства управления микрофоном.',
    listFailed: 'Браузер не смог показать список микрофонов. Можно попробовать вход по умолчанию.',
    mismatch: 'Подключите выбранный вход, чтобы продолжить.',
    levelLabel: 'Уровень входного сигнала микрофона',
    levelHelp: 'Индикатор показывает только уровень сигнала. Он не оценивает речь или готовность.',
    meterUnavailable: 'Браузер не смог показать уровень сигнала. Подключение микрофона доступно.',
    testHeading: 'Необязательная локальная запись',
    testHelp: 'Запишите до 10 секунд и прослушайте запись здесь. Она останется только в этой сессии браузера и удалится при выходе.',
    recordTest: 'Записать тест',
    stop: 'Остановить',
    listening: 'Запись сохранена локально. Прослушайте её ниже; оценка речи не выполняется.',
    noBytes: 'Данные записи не получены. Проверка готовности основана на подключении микрофона выше.',
    testEndedEarly: 'Запись завершилась раньше лимита. Частичный тест остаётся локальным.',
    testFailed: 'Не удалось завершить локальный тест микрофона. Подключитесь снова и повторите попытку.',
    playbackFailed: 'Этот браузер не смог воспроизвести локальную тестовую запись.',
    localPlayback: 'Локальная тестовая запись',
    continue: 'Продолжить',
    continuing: 'Переходим…',
    nextNew: 'Перейти к новому дубляжу',
    privacy: 'Тест не загружается, не сохраняется в проект и не создаёт дубль.',
  },
} as const

type CopyKey = keyof (typeof copy)['en']
type ConnectionState = 'idle' | 'requesting' | 'connected' | 'lost'
type ConnectionError = 'denied' | 'missing' | 'busy' | 'unsupported'
type CapturedTest = Extract<MicrophoneTestOutcome, { state: 'captured' }>

function connectionError(code: ServiceError['code']): ConnectionError {
  if (code === 'forbidden') return 'denied'
  if (code === 'not-found') return 'missing'
  if (code === 'unsupported') return 'unsupported'
  return 'busy'
}

export function MicrophoneScreen({ route, locale, services, navigate }: FeatureScreenProps) {
  const text = copy[locale]
  const [inputs, setInputs] = useState<MediaInput[]>([])
  const [selectedInputId, setSelectedInputId] = useState('')
  const [connection, setConnection] = useState<ConnectionState>('idle')
  const [connectionErrorKind, setConnectionErrorKind] = useState<ConnectionError | null>(null)
  const [deviceListFailed, setDeviceListFailed] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [connectedInputId, setConnectedInputId] = useState('')
  const [trackMuted, setTrackMuted] = useState(false)
  const [meterAvailable, setMeterAvailable] = useState(true)
  const [level, setLevel] = useState(0)
  const [testRecording, setTestRecording] = useState(false)
  const [testReceipt, setTestReceipt] = useState<CapturedTest | null>(null)
  const [testFailed, setTestFailed] = useState(false)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [testUrl, setTestUrl] = useState<string | null>(null)
  const [continuing, setContinuing] = useState(false)
  const activeRef = useRef(false)
  const requestSequenceRef = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const meterRef = useRef<{ stop(): void } | null>(null)
  const trackEventsCleanupRef = useRef<(() => void) | null>(null)
  const testCaptureRef = useRef<MicrophoneTestCapture | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const refreshInputs = useCallback(async () => {
    const result = await services.browserMedia.listInputs()
    if (!activeRef.current) return
    if (result.status !== 'ok') {
      setInputs([])
      setDeviceListFailed(true)
      return
    }
    setInputs(result.data)
    setDeviceListFailed(false)
    setSelectedInputId((current) => {
      if (result.data.some((input) => input.id === current)) return current
      return result.data.find((input) => input.selected)?.id ?? result.data[0]?.id ?? ''
    })
  }, [services.browserMedia])

  const releaseStream = useCallback((nextConnection: 'idle' | 'lost', updateState = true) => {
    requestSequenceRef.current += 1
    const currentStream = streamRef.current
    streamRef.current = null
    trackEventsCleanupRef.current?.()
    trackEventsCleanupRef.current = null
    meterRef.current?.stop()
    meterRef.current = null
    testCaptureRef.current?.cancel()
    testCaptureRef.current = null
    if (currentStream) {
      for (const track of currentStream.getTracks()) track.stop()
    }
    audioRef.current?.pause()
    if (updateState && activeRef.current) {
      setStream(null)
      setConnection(nextConnection)
      setTrackMuted(false)
      setLevel(0)
      setMeterAvailable(true)
      setTestRecording(false)
      setTestReceipt(null)
      setTestFailed(false)
      setPlaybackFailed(false)
      setElapsedMs(0)
    }
  }, [])

  useEffect(() => {
    activeRef.current = true
    void refreshInputs()
    return () => {
      activeRef.current = false
      releaseStream('idle', false)
    }
  }, [refreshInputs, releaseStream])

  useEffect(() => {
    if (!testReceipt?.hasRecordedBytes) {
      setTestUrl(null)
      return
    }
    const url = URL.createObjectURL(testReceipt.blob)
    setTestUrl(url)
    return () => {
      audioRef.current?.pause()
      if (audioRef.current) {
        audioRef.current.removeAttribute('src')
        audioRef.current.load()
      }
      URL.revokeObjectURL(url)
    }
  }, [testReceipt])

  useEffect(() => {
    if (!stream) return
    const track = stream.getAudioTracks().find((candidate) => candidate.readyState === 'live')
    if (!track) {
      releaseStream('lost')
      return
    }
    const onEnded = () => {
      if (streamRef.current === stream) releaseStream('lost')
    }
    const onMute = () => setTrackMuted(true)
    const onUnmute = () => setTrackMuted(false)
    track.addEventListener('ended', onEnded, { once: true })
    track.addEventListener('mute', onMute)
    track.addEventListener('unmute', onUnmute)
    trackEventsCleanupRef.current = () => {
      track.removeEventListener('ended', onEnded)
      track.removeEventListener('mute', onMute)
      track.removeEventListener('unmute', onUnmute)
    }
    setTrackMuted(track.muted)

    let watching = true
    const watcher = services.browserMedia.watchInputLevel({
      stream,
      onLevel: (sample) => {
        if (watching && streamRef.current === stream) setLevel(sample.rms)
      },
    })
    meterRef.current = watcher
    void watcher.ready.then((result) => {
      if (watching && streamRef.current === stream) setMeterAvailable(result.status === 'ok')
    })
    return () => {
      watching = false
      track.removeEventListener('ended', onEnded)
      track.removeEventListener('mute', onMute)
      track.removeEventListener('unmute', onUnmute)
      if (trackEventsCleanupRef.current) trackEventsCleanupRef.current = null
      if (meterRef.current === watcher) meterRef.current = null
      watcher.stop()
    }
  }, [releaseStream, services.browserMedia, stream])

  const connectSelectedInput = async () => {
    if (connection === 'requesting') return
    releaseStream('idle')
    setConnectionErrorKind(null)
    setConnection('requesting')
    const requestSequence = ++requestSequenceRef.current
    const result = await services.browserMedia.requestMicrophone(selectedInputId || undefined)
    if (!activeRef.current || requestSequence !== requestSequenceRef.current) {
      if (result.status === 'ok') for (const track of result.data.stream.getTracks()) track.stop()
      return
    }
    if (result.status !== 'ok') {
      setConnection('idle')
      if (result.status === 'error') setConnectionErrorKind(connectionError(result.error.code))
      else setConnectionErrorKind('busy')
      return
    }
    streamRef.current = result.data.stream
    setStream(result.data.stream)
    setConnectedInputId(result.data.inputId)
    setConnection('connected')
    setLevel(0)
    setMeterAvailable(true)
    void refreshInputs()
  }

  const startTest = async () => {
    if (!stream || connection !== 'connected' || trackMuted || testRecording) return
    setTestReceipt(null)
    setTestFailed(false)
    setPlaybackFailed(false)
    setElapsedMs(0)
    setTestRecording(true)
    const capture = services.browserMedia.startMicrophoneTest({
      stream,
      durationLimitMs: testDurationLimitMs,
      onProgress: setElapsedMs,
    })
    testCaptureRef.current = capture
    const result = await capture.result
    if (!activeRef.current || testCaptureRef.current !== capture) return
    testCaptureRef.current = null
    setTestRecording(false)
    if (result.status !== 'ok') {
      setTestFailed(true)
      return
    }
    if (result.data.state === 'cancelled') return
    setTestReceipt(result.data)
  }

  const stopTest = () => testCaptureRef.current?.stop()
  const selectedInputMatches = !selectedInputId || selectedInputId === connectedInputId
  const canContinue = connection === 'connected' && !!stream && !trackMuted && selectedInputMatches && !continuing

  const continueToNextScreen = async () => {
    if (!canContinue || route.kind !== 'microphone') return
    setContinuing(true)
    services.browserMedia.completeMicrophoneCheck(connectedInputId)
    const destination = route.origin === 'project'
      ? routes.project(route.projectId, 'record')
      : routes.newDub()
    try {
      const navigated = await navigate(destination)
      if (!navigated && activeRef.current) setContinuing(false)
    } catch {
      if (activeRef.current) setContinuing(false)
    }
  }

  const connectionMessage: CopyKey = connection === 'requesting'
    ? 'requesting'
    : connection === 'connected' && trackMuted
      ? 'paused'
      : connection === 'connected'
        ? 'connected'
        : connection === 'lost'
          ? 'lost'
          : 'waiting'
  const currentErrorMessage = connectionErrorKind ? text[connectionErrorKind] : null
  const testEndedEarly = !!testReceipt && !testReceipt.stoppedByUser && testReceipt.durationMs < testDurationLimitMs
  const connectedInputLabel = inputs.find((input) => input.id === connectedInputId)?.label || text.deviceLabel

  if (route.kind !== 'microphone') return null

  return (
    <section className="microphone-check" lang={locale} aria-labelledby="microphone-check-title">
      <header className="microphone-check__header">
        <div className="microphone-check__icon" aria-hidden="true"><Mic strokeWidth={1.1} /></div>
        <h1 id="microphone-check-title">{text.title}</h1>
        <p>{text.description}</p>
      </header>

      <div className="microphone-check__panel">
        <div className="microphone-check__device-block">
          <div className="microphone-check__section-heading">
            <h2>{text.deviceLabel}</h2>
            <Button
              variant="ghost"
              size="small"
              aria-label={text.refreshInputs}
              onClick={() => void refreshInputs()}
              disabled={connection === 'requesting' || testRecording}
            >
              <RefreshCw strokeWidth={1.1} aria-hidden="true" />
              {text.refreshInputs}
            </Button>
          </div>
          {inputs.length > 0 ? (
            <label className="field microphone-check__field">
              <span className="field-label">{text.deviceLabel}</span>
              <select
                className="ui-input"
                value={selectedInputId}
                onChange={(event) => setSelectedInputId(event.currentTarget.value)}
                disabled={connection === 'requesting' || testRecording}
              >
                {inputs.map((input, index) => (
                  <option key={`${input.id}-${index}`} value={input.id}>{input.label}</option>
                ))}
              </select>
            </label>
          ) : (
            <p className="microphone-check__subtle">{text.noInputs}</p>
          )}
          {deviceListFailed && <p className="microphone-check__subtle" role="status">{text.listFailed}</p>}
          <Button
            variant="secondary"
            onClick={() => void connectSelectedInput()}
            disabled={connection === 'requesting' || testRecording}
          >
            {connection === 'requesting' ? text.requesting : connection === 'idle' && connectionErrorKind === null ? text.allowAccess : text.reconnect}
          </Button>
        </div>

        <div className="microphone-check__status-block">
          <p className={`microphone-check__status${connection === 'connected' && !trackMuted ? ' is-connected' : ''}`} role="status" aria-live="polite">
            {text[connectionMessage]}
          </p>
          {currentErrorMessage && <p className="microphone-check__error" role="alert">{currentErrorMessage}</p>}
          {connection === 'connected' && !trackMuted && (
            <>
              <div className="microphone-check__meter-row">
                <span>{text.levelLabel}</span>
                <span className="visually-hidden" aria-live="off">{Math.round(level * 100)}%</span>
              </div>
              <div
                className="microphone-check__meter"
                role="meter"
                aria-label={text.levelLabel}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(level * 100)}
              >
                <span style={{ width: `${Math.round(level * 100)}%` }} />
              </div>
              <p className="microphone-check__subtle">{meterAvailable ? text.levelHelp : text.meterUnavailable}</p>
              {!selectedInputMatches && <p className="microphone-check__subtle" role="status">{text.mismatch}</p>}
              <p className="microphone-check__subtle">{connectedInputLabel}</p>
            </>
          )}
        </div>

        <div className="microphone-check__test-block">
          <h2>{text.testHeading}</h2>
          <p className="microphone-check__subtle">{text.testHelp}</p>
          {testRecording ? (
            <div className="microphone-check__test-controls">
              <span role="status">{(elapsedMs / 1000).toFixed(1)} s</span>
              <Button variant="secondary" onClick={stopTest}>{text.stop}</Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => void startTest()} disabled={connection !== 'connected' || trackMuted}>
              {text.recordTest}
            </Button>
          )}
          {testReceipt && (
            <div className="microphone-check__test-result" role="status">
              {testReceipt.hasRecordedBytes ? <p>{text.listening}</p> : <p>{text.noBytes}</p>}
              {testEndedEarly && <p>{text.testEndedEarly}</p>}
              {testReceipt.hasRecordedBytes && testUrl && (
                <audio
                  ref={audioRef}
                  className="microphone-check__audio"
                  controls
                  preload="metadata"
                  src={testUrl}
                  aria-label={text.localPlayback}
                  onError={() => setPlaybackFailed(true)}
                  onPlay={() => setPlaybackFailed(false)}
                />
              )}
              {playbackFailed && <p className="microphone-check__error">{text.playbackFailed}</p>}
            </div>
          )}
          {testFailed && <p className="microphone-check__error" role="alert">{text.testFailed}</p>}
          <p className="microphone-check__privacy">{text.privacy}</p>
        </div>

        <footer className="microphone-check__footer">
          <Button variant="primary" size="large" onClick={() => void continueToNextScreen()} disabled={!canContinue}>
            {continuing ? text.continuing : route.origin === 'new' ? text.nextNew : text.continue}
          </Button>
        </footer>
      </div>
    </section>
  )
}

export default MicrophoneScreen
