import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Download, RefreshCw } from 'lucide-react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { routes } from '../../app/routes'
import { Button } from '../../components/ui/button'
import { Notice } from '../../components/ui/notice'
import { ids, type GenerationId, type OperationId, type ProjectId, type ResultGeneration } from '../../services/contracts'
import './ResultScreen.css'

type LoadedResult = Extract<Awaited<ReturnType<FeatureScreenProps['services']['results']['load']>>, { status: 'ok' }>['data']
type DownloadData = {
  generationId: GenerationId
  descriptor: { generationId: GenerationId; url: string }
  fileName: string
}
type DownloadAttempt = {
  projectId: ProjectId
  generation: ResultGeneration
  operationId: OperationId
  state: 'submitting' | 'reconcile' | 'same-operation' | 'failed'
}
type AssemblyRetryInput = Parameters<FeatureScreenProps['services']['results']['retry']>[0]
type ResultRecoveryProblem =
  | { kind: 'unavailable' }
  | { kind: 'stale-source' }
  | { kind: 'unknown-operation'; operationId: OperationId; source: 'load' | 'manual-retry' }

const copy = {
  en: {
    title: 'Your result',
    back: 'Return to recording',
    loading: 'Loading your result…',
    assembling: 'Assembling video…',
    failed: 'The latest assembly attempt could not be completed.',
    noResult: 'There is no finished result for this project yet.',
    previous: 'Previous version',
    newReady: 'New version ready',
    watchNew: 'Watch new',
    playLabel: 'Finished dubbed video',
    playbackFailed: 'This result could not be played. The displayed generation is preserved.',
    retryPlayback: 'Retry playback',
    refreshPlayback: 'Refresh playback access',
    download: 'Download MP4',
    downloading: 'Preparing download…',
    downloadStarted: 'Download requested.',
    downloadFailed: (revision: number) => `The download request for version ${revision} failed. Retry will request that same version.`,
    downloadUnknown: (revision: number) => `The request for version ${revision} is not confirmed. Retry will check the original request first.`,
    retryDownloadVersion: (revision: number) => `Retry download version ${revision}`,
    reconcileDownloadVersion: (revision: number) => `Check and retry download version ${revision}`,
    retryingDownload: 'Retrying download…',
    repeatAssembly: 'Repeat assembly',
    retrying: 'Retrying assembly…',
    unavailable: 'Result status is unavailable. Retry to check again.',
    retryCheck: 'Retry',
    staleAssembly: 'The accepted recordings changed after this assembly was authorized. Your previous result and accepted recordings are preserved. Return to recording to review the current takes.',
    unknownAssembly: 'The assembly request is not confirmed. Check this same request before starting another attempt.',
    unknownAssemblyRetry: 'The retry outcome is not confirmed. Check this same request before starting another attempt.',
    checkAssembly: 'Check assembly status',
    checkAssemblyRetry: 'Check retry status',
    generation: 'Displayed generation',
    synthetic: 'Synthetic fixture result; not rendered from accepted takes or a custom upload.',
    progressLabel: 'Assembly progress',
  },
  ru: {
    title: 'Результат',
    back: 'Вернуться к записи',
    loading: 'Загружаем результат…',
    assembling: 'Собираем видео…',
    failed: 'Не удалось завершить последнюю попытку сборки.',
    noResult: 'Для этого проекта ещё нет готового результата.',
    previous: 'Предыдущая версия',
    newReady: 'Новая версия готова',
    watchNew: 'Смотреть новую',
    playLabel: 'Готовое озвученное видео',
    playbackFailed: 'Не удалось воспроизвести результат. Отображаемая версия сохранена.',
    retryPlayback: 'Повторить воспроизведение',
    refreshPlayback: 'Обновить доступ к воспроизведению',
    download: 'Скачать MP4',
    downloading: 'Готовим скачивание…',
    downloadStarted: 'Запрос на скачивание отправлен.',
    downloadFailed: (revision: number) => `Не удалось скачать версию ${revision}. Повторный запрос будет для той же версии.`,
    downloadUnknown: (revision: number) => `Результат запроса версии ${revision} не подтверждён. Перед повторной отправкой проверим исходный запрос.`,
    retryDownloadVersion: (revision: number) => `Повторить скачивание версии ${revision}`,
    reconcileDownloadVersion: (revision: number) => `Проверить и повторить скачивание версии ${revision}`,
    retryingDownload: 'Повторяем скачивание…',
    repeatAssembly: 'Повторить сборку',
    retrying: 'Повторяем сборку…',
    unavailable: 'Статус результата недоступен. Повторите проверку.',
    retryCheck: 'Повторить',
    staleAssembly: 'Принятые записи изменились после авторизации этой сборки. Предыдущий результат и принятые записи сохранены. Вернитесь к записи, чтобы проверить текущие дубли.',
    unknownAssembly: 'Результат запроса сборки не подтверждён. Проверьте этот же запрос перед новой попыткой.',
    unknownAssemblyRetry: 'Результат повтора не подтверждён. Проверьте этот же запрос перед новой попыткой.',
    checkAssembly: 'Проверить статус сборки',
    checkAssemblyRetry: 'Проверить статус повтора',
    generation: 'Отображаемая версия',
    synthetic: 'Синтетический пример; результат не собран из принятых дублей или загруженного пользователем видео.',
    progressLabel: 'Ход сборки',
  },
} as const

function newOperationId(): OperationId {
  return ids.operation(crypto.randomUUID())
}

function trustedProgress(context: LoadedResult | null): number | null {
  const result = context?.operation?.result
  if (!result || typeof result !== 'object') return null
  const percentage = (result as { percentage?: { value?: unknown; trusted?: unknown } }).percentage
  if (percentage?.trusted !== true || typeof percentage.value !== 'number' || !Number.isFinite(percentage.value)) return null
  return Math.max(0, Math.min(100, percentage.value))
}

export function ResultScreen({ route, locale, services, navigate, identity }: FeatureScreenProps) {
  const text = copy[locale]
  const projectId = route.kind === 'project' && route.screen === 'result' ? route.projectId : null
  const identityKey = identity?.status === 'signed-in'
    ? `${identity.account.id}:${identity.session.id}`
    : identity?.status ?? 'unknown'
  const lifecycleRef = useRef({ projectId, identityKey })
  lifecycleRef.current = { projectId, identityKey }
  const [context, setContext] = useState<LoadedResult | null>(null)
  const [displayedGeneration, setDisplayedGeneration] = useState<ResultGeneration | null>(null)
  const [pendingGeneration, setPendingGeneration] = useState<ResultGeneration | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [recoveryProblem, setRecoveryProblem] = useState<ResultRecoveryProblem | null>(null)
  const [playbackFailed, setPlaybackFailed] = useState(false)
  const [downloadAttempts, setDownloadAttempts] = useState<Record<string, DownloadAttempt>>({})
  const [downloadRequested, setDownloadRequested] = useState(false)
  const [busy, setBusy] = useState<'playback' | 'download' | 'assembly' | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playingRef = useRef(false)
  const mountedRef = useRef(false)
  const playbackRequestRef = useRef(0)
  const downloadInFlightRef = useRef(false)
  const assemblyRetryRef = useRef<AssemblyRetryInput | null>(null)
  const assemblyInFlightRef = useRef(false)

  const loadResult = useCallback(async () => {
    if (!projectId) return
    try {
      const result = await services.results.load(projectId)
      if (!mountedRef.current) return
      if (result.status === 'unknown') {
        setRecoveryProblem({ kind: 'unknown-operation', operationId: result.operationId, source: 'load' })
        return
      }
      if (result.status !== 'ok') {
        const staleSource = (result.status === 'error' && result.error.code === 'stale-source')
          || (result.status === 'conflict' && (result.code === 'stale-source' || result.code === 'revision-conflict'))
        setRecoveryProblem(staleSource ? { kind: 'stale-source' } : { kind: 'unavailable' })
        return
      }
      setRecoveryProblem(null)
      setContext(result.data)
    } catch {
      if (mountedRef.current) setRecoveryProblem({ kind: 'unavailable' })
    }
  }, [projectId, services.results])

  const showGeneration = useCallback(async (generation: ResultGeneration, keepPending = false) => {
    if (!projectId) return false
    const request = ++playbackRequestRef.current
    setBusy('playback')
    setPlaybackFailed(false)
    try {
      const result = await services.results.loadPlayback({ projectId, displayedGenerationId: generation.id })
      if (!mountedRef.current || request !== playbackRequestRef.current) return false
      if (result.status !== 'ok' || result.data.generation.id !== generation.id) {
        setPlaybackFailed(true)
        return false
      }
      videoRef.current?.pause()
      setDisplayedGeneration(result.data.generation)
      setPlaybackUrl(result.data.descriptor.url)
      if (!keepPending) setPendingGeneration(null)
      return true
    } catch {
      if (mountedRef.current && request === playbackRequestRef.current) setPlaybackFailed(true)
      return false
    } finally {
      if (mountedRef.current && request === playbackRequestRef.current) setBusy(null)
    }
  }, [projectId, services.results])

  useEffect(() => {
    mountedRef.current = true
    void loadResult()
    return () => {
      mountedRef.current = false
      playbackRequestRef.current += 1
    }
  }, [loadResult])

  const currentGeneration = context?.currentGeneration ?? null
  const currentGenerationId = currentGeneration?.id
  const displayedGenerationId = displayedGeneration?.id

  // The generation id is the only signal to switch automatically. Including the whole
  // currentGeneration object would replay this effect on same-id result refreshes and
  // replace a user-pinned displayed generation without an explicit “Watch new” action.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentGeneration || currentGeneration.id === displayedGenerationId) return
    if (displayedGeneration && playingRef.current) {
      setPendingGeneration(currentGeneration)
      return
    }
    void showGeneration(currentGeneration)
  }, [currentGenerationId, displayedGenerationId, displayedGeneration, showGeneration])

  const assembling = context?.project.state === 'assembling' || context?.operation?.state === 'pending'
  useEffect(() => {
    if (!assembling) return
    const timer = window.setTimeout(() => void loadResult(), 900)
    return () => window.clearTimeout(timer)
  }, [assembling, context?.operation?.revision, loadResult])

  const refreshPlayback = async () => {
    if (!projectId || !displayedGeneration) return
    const targetId = displayedGeneration.id
    const request = ++playbackRequestRef.current
    setBusy('playback')
    setPlaybackFailed(false)
    try {
      const result = await services.results.refreshPlayback({ projectId, displayedGenerationId: targetId })
      if (!mountedRef.current || request !== playbackRequestRef.current) return
      if (result.status !== 'ok' || result.data.generation.id !== targetId) {
        setPlaybackFailed(true)
        return
      }
      setPlaybackUrl(result.data.descriptor.url)
    } catch {
      if (mountedRef.current && request === playbackRequestRef.current) setPlaybackFailed(true)
    } finally {
      if (mountedRef.current && request === playbackRequestRef.current) setBusy(null)
    }
  }

  const saveDownloadAttempt = (attempt: DownloadAttempt) => {
    setDownloadAttempts((current) => ({ ...current, [attempt.generation.id]: attempt }))
  }

  const clearDownloadAttempt = (attempt: DownloadAttempt) => {
    setDownloadAttempts((current) => {
      const key = attempt.generation.id
      if (current[key]?.operationId !== attempt.operationId) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const deliverDownload = (attempt: DownloadAttempt, data: DownloadData) => {
    if (!mountedRef.current) return false
    if (data.generationId !== attempt.generation.id || data.descriptor.generationId !== attempt.generation.id) {
      saveDownloadAttempt({ ...attempt, state: 'failed' })
      return false
    }
    const anchor = document.createElement('a')
    anchor.href = data.descriptor.url
    anchor.download = data.fileName
    anchor.rel = 'noopener'
    anchor.click()
    clearDownloadAttempt(attempt)
    setDownloadRequested(true)
    return true
  }

  const runDownloadAttempt = async (attempt: DownloadAttempt, reconcileFirst: boolean) => {
    if (!projectId || attempt.projectId !== projectId || busy !== null || downloadInFlightRef.current) return
    const requestIdentityKey = lifecycleRef.current.identityKey
    const isCurrentLifecycle = () => mountedRef.current
      && lifecycleRef.current.projectId === attempt.projectId
      && lifecycleRef.current.identityKey === requestIdentityKey
    downloadInFlightRef.current = true
    const submitting = { ...attempt, state: 'submitting' as const }
    saveDownloadAttempt(submitting)
    setBusy('download')
    setDownloadRequested(false)
    try {
      if (reconcileFirst) {
        const resolved = await services.operations.resolve<DownloadData>(attempt.operationId)
        if (!isCurrentLifecycle()) return
        if (resolved.status !== 'ok') {
          saveDownloadAttempt({ ...attempt, state: 'reconcile' })
          return
        }
        const operation = resolved.data
        if ('safeToRetrySameId' in operation) {
          if (operation.operationId !== attempt.operationId || !operation.safeToRetrySameId) {
            saveDownloadAttempt({ ...attempt, state: 'reconcile' })
            return
          }
        } else if (operation.id === attempt.operationId && operation.kind === 'result.download' && operation.state === 'committed') {
          const recovered = operation.result
          if (recovered?.generationId === attempt.generation.id && recovered.descriptor.generationId === attempt.generation.id) {
            deliverDownload(submitting, recovered)
            return
          }
          saveDownloadAttempt({ ...attempt, state: 'reconcile' })
          return
        } else if (operation.id === attempt.operationId && operation.kind === 'result.download' && operation.state === 'rejected') {
          saveDownloadAttempt({ ...attempt, state: 'failed' })
          return
        } else {
          saveDownloadAttempt({ ...attempt, state: 'reconcile' })
          return
        }
      }

      const result = await services.results.requestDownload({
        projectId: attempt.projectId,
        displayedGenerationId: attempt.generation.id,
        operationId: attempt.operationId,
      })
      if (!isCurrentLifecycle()) return
      if (result.status === 'ok') {
        deliverDownload(submitting, result.data)
      } else if (result.status === 'unknown' || (result.status === 'error' && result.error.retry === 'reconcile-first')) {
        saveDownloadAttempt({ ...attempt, state: 'reconcile' })
      } else if (result.status === 'error' && result.error.retry === 'same-operation') {
        saveDownloadAttempt({ ...attempt, state: 'same-operation' })
      } else {
        saveDownloadAttempt({ ...attempt, state: 'failed' })
      }
    } catch {
      // A thrown transport failure may have committed. Keep this operation ID and reconcile it before another request.
      if (isCurrentLifecycle()) saveDownloadAttempt({ ...attempt, state: 'reconcile' })
    } finally {
      downloadInFlightRef.current = false
      if (mountedRef.current) setBusy(null)
    }
  }

  const retryDownload = (attempt: DownloadAttempt) => {
    if (attempt.state === 'submitting') return
    const next = attempt.state === 'failed'
      ? { ...attempt, operationId: newOperationId() }
      : attempt
    void runDownloadAttempt(next, attempt.state === 'reconcile')
  }

  const requestDownload = () => {
    if (!projectId || !displayedGeneration || busy !== null || downloadInFlightRef.current) return
    const existing = downloadAttempts[displayedGeneration.id]
    if (existing?.projectId === projectId) {
      retryDownload(existing)
      return
    }
    void runDownloadAttempt({
      projectId,
      generation: displayedGeneration,
      operationId: newOperationId(),
      state: 'failed',
    }, false)
  }

  const repeatAssembly = async () => {
    const reconcilingUnknownRetry = recoveryProblem?.kind === 'unknown-operation' && recoveryProblem.source === 'manual-retry'
    if (!projectId || !context?.operation || !context.retryLineageId || (!context.retryAvailable && !reconcilingUnknownRetry)
      || (recoveryProblem && !reconcilingUnknownRetry) || busy !== null || assemblyInFlightRef.current) return
    const pendingAttempt = assemblyRetryRef.current
    const retryInput = pendingAttempt
      && pendingAttempt.projectId === projectId
      && pendingAttempt.priorOperationId === context.operation.id
      && pendingAttempt.retryLineageId === context.retryLineageId
      && pendingAttempt.expectedProjectRevision === context.project.revision
      ? pendingAttempt
      : {
          projectId,
          priorOperationId: context.operation.id,
          retryLineageId: context.retryLineageId,
          expectedProjectRevision: context.project.revision,
          operationId: newOperationId(),
        }
    assemblyRetryRef.current = retryInput
    assemblyInFlightRef.current = true
    setBusy('assembly')
    try {
      const result = await services.results.retry(retryInput)
      if (result.status === 'unknown') {
        if (mountedRef.current) setRecoveryProblem({ kind: 'unknown-operation', operationId: result.operationId, source: 'manual-retry' })
        return
      }
      if (result.status === 'error' && result.error.retry !== 'none') {
        if (mountedRef.current) setRecoveryProblem({ kind: 'unknown-operation', operationId: retryInput.operationId, source: 'manual-retry' })
        return
      }
      if ((result.status === 'error' && result.error.code === 'stale-source')
        || (result.status === 'conflict' && (result.code === 'stale-source' || result.code === 'revision-conflict'))) {
        assemblyRetryRef.current = null
        if (mountedRef.current) setRecoveryProblem({ kind: 'stale-source' })
        return
      }
      if (result.status !== 'ok') {
        assemblyRetryRef.current = null
        if (mountedRef.current) setRecoveryProblem({ kind: 'unavailable' })
        return
      }
      assemblyRetryRef.current = null
      if (mountedRef.current) {
        setRecoveryProblem(null)
        await loadResult()
      }
    } catch {
      // The request may have committed before its response was lost. Keep its ID for reconciliation.
      if (mountedRef.current) setRecoveryProblem({ kind: 'unknown-operation', operationId: retryInput.operationId, source: 'manual-retry' })
    } finally {
      assemblyInFlightRef.current = false
      if (mountedRef.current) setBusy(null)
    }
  }

  const failed = context?.project.state === 'failed' || context?.operation?.state === 'rejected'
  const progress = trustedProgress(context)
  const projectDownloadAttempts = projectId
    ? Object.values(downloadAttempts).filter((attempt) => attempt.projectId === projectId && attempt.state !== 'submitting')
    : []
  const currentDownloadAttempt = displayedGeneration ? downloadAttempts[displayedGeneration.id] : undefined
  const activeDownloadAttempt = projectId
    ? Object.values(downloadAttempts).find((attempt) => attempt.projectId === projectId && attempt.state === 'submitting')
    : undefined
  const returnToRecording = () => { if (projectId) void navigate(routes.project(projectId, 'record')) }
  const recoveryMessage = recoveryProblem?.kind === 'stale-source'
    ? text.staleAssembly
    : recoveryProblem?.kind === 'unknown-operation'
      ? recoveryProblem.source === 'manual-retry' ? text.unknownAssemblyRetry : text.unknownAssembly
      : text.unavailable
  const checkRecovery = () => {
    if (recoveryProblem?.kind === 'unknown-operation' && recoveryProblem.source === 'manual-retry') {
      void repeatAssembly()
      return
    }
    void loadResult()
  }

  return (
    <section className="result-screen" aria-labelledby="result-title">
      <header className="result-screen__header">
        <div>
          <h1 id="result-title">{text.title}</h1>
          {context?.project.title && <p>{context.project.title}</p>}
        </div>
        <Button variant="secondary" onClick={returnToRecording} disabled={!projectId}>
          <ArrowLeft aria-hidden="true" strokeWidth={1.1} />
          {text.back}
        </Button>
      </header>

      {recoveryProblem && (
        <div className="result-screen__notice">
          <Notice tone="error" role="alert">{recoveryMessage}</Notice>
          {recoveryProblem.kind === 'stale-source' ? (
            <Button variant="secondary" onClick={returnToRecording} disabled={!projectId}>{text.back}</Button>
          ) : (
            <Button variant="secondary" onClick={checkRecovery}>
              {recoveryProblem.kind === 'unknown-operation'
                ? recoveryProblem.source === 'manual-retry' ? text.checkAssemblyRetry : text.checkAssembly
                : text.retryCheck}
            </Button>
          )}
        </div>
      )}

      {assembling && (
        <section className="result-screen__assembly" aria-labelledby="assembly-status" aria-live="polite">
          <h2 id="assembly-status">{text.assembling}</h2>
          {progress !== null && (
            <div className="result-screen__progress">
              <progress aria-label={text.progressLabel} max={100} value={progress} />
              <span>{progress}%</span>
            </div>
          )}
        </section>
      )}

      {failed && (
        <section className="result-screen__failure" aria-live="polite">
          <p>{text.failed}</p>
          <Button onClick={() => void repeatAssembly()} disabled={!context?.retryLineageId || !context.retryAvailable || busy !== null || recoveryProblem !== null}>
            <RefreshCw aria-hidden="true" strokeWidth={1.1} />
            {busy === 'assembly' ? text.retrying : text.repeatAssembly}
          </Button>
        </section>
      )}

      {!context && !recoveryProblem && <p role="status">{text.loading}</p>}

      {context && !currentGeneration && !assembling && !failed && (
        <Notice>{text.noResult}</Notice>
      )}

      {displayedGeneration && playbackUrl && (
        <section className="result-screen__player">
          {displayedGeneration.id !== currentGeneration?.id && (
            <div className="result-screen__version-notice">
              <span>{text.previous}</span>
              {pendingGeneration && (
                <div className="result-screen__new-version">
                  <span>{text.newReady}</span>
                  <Button variant="secondary" onClick={() => void showGeneration(pendingGeneration)} disabled={busy !== null}>
                    {text.watchNew}
                  </Button>
                </div>
              )}
            </div>
          )}
          <video
            key={`${displayedGeneration.id}:${playbackUrl}`}
            ref={videoRef}
            src={playbackUrl}
            controls
            playsInline
            preload="metadata"
            aria-label={text.playLabel}
            controlsList="nodownload noplaybackrate"
            onPlay={() => { playingRef.current = true; setIsPlaying(true) }}
            onPause={() => { playingRef.current = false; setIsPlaying(false) }}
            onEnded={() => { playingRef.current = false; setIsPlaying(false) }}
            onError={() => setPlaybackFailed(true)}
          />
          <div className="result-screen__player-meta">
            <span>{text.generation}: {displayedGeneration.revision}</span>
            {displayedGeneration.note === 'synthetic-mock-scenario' && <small>{text.synthetic}</small>}
          </div>
          {playbackFailed && (
            <div className="result-screen__notice">
              <Notice tone="error" role="alert">{text.playbackFailed}</Notice>
              <Button variant="secondary" onClick={() => void refreshPlayback()} disabled={busy !== null}>
                <RefreshCw aria-hidden="true" strokeWidth={1.1} />
                {busy === 'playback' ? text.refreshPlayback : text.retryPlayback}
              </Button>
            </div>
          )}
          {projectDownloadAttempts.map((attempt) => (
            <div className="result-screen__notice" key={attempt.generation.id}>
              <Notice tone="error" role="alert" className="result-screen__download-error">
                {attempt.state === 'reconcile' ? text.downloadUnknown(attempt.generation.revision) : text.downloadFailed(attempt.generation.revision)}
              </Notice>
              {attempt.generation.id !== displayedGeneration.id && (
                <Button variant="secondary" onClick={() => retryDownload(attempt)} disabled={busy !== null}>
                  <RefreshCw aria-hidden="true" strokeWidth={1.1} />
                  {activeDownloadAttempt?.generation.id === attempt.generation.id
                    ? text.retryingDownload
                    : attempt.state === 'reconcile'
                      ? text.reconcileDownloadVersion(attempt.generation.revision)
                      : text.retryDownloadVersion(attempt.generation.revision)}
                </Button>
              )}
            </div>
          ))}
          {downloadRequested && <p role="status" className="result-screen__download-status">{text.downloadStarted}</p>}
          <div className="result-screen__actions">
            <Button onClick={requestDownload} disabled={busy !== null}>
              <Download aria-hidden="true" strokeWidth={1.1} />
              {activeDownloadAttempt?.generation.id === displayedGeneration.id
                ? text.downloading
                : currentDownloadAttempt?.state === 'reconcile'
                  ? text.reconcileDownloadVersion(displayedGeneration.revision)
                  : currentDownloadAttempt
                    ? text.retryDownloadVersion(displayedGeneration.revision)
                    : text.download}
            </Button>
          </div>
        </section>
      )}

      {isPlaying && pendingGeneration && <span className="sr-only" role="status">{text.newReady}</span>}
    </section>
  )
}

export default ResultScreen
