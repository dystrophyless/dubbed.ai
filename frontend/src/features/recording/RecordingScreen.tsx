import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowLeft, ArrowRight, Mic, RotateCcw } from 'lucide-react'
import type { FeatureScreenProps, RouteExitRequest } from '../../app/screen-contract'
import { routes } from '../../app/routes'
import { notifyCreditsMayHaveChanged } from '../../app/credits-events'
import { Button } from '../../components/ui/button'
import { Notice } from '../../components/ui/notice'
import { Sheet } from '../../components/ui/sheet'
import type {
  OperationId,
  OwnedProject,
  PreparationSnapshot,
  ProcessingQuote,
  RecordingAccess,
  RecordingCandidate,
  Revision,
} from '../../services/contracts'
import { ids } from '../../services/contracts'
import { RecordingTransport, type RecordingTransportMode } from './RecordingTransport'
import './RecordingScreen.css'

type RecordingContext = Extract<Awaited<ReturnType<FeatureScreenProps['services']['recording']['loadContext']>>, { status: 'ok' }>['data']
type RecordingTurn = RecordingContext['turns'][number]
type CandidateDraft = { candidate: RecordingCandidate; blob: Blob; url: string; recoverable: boolean }
type WaveformPreview = { durationMs: number; peaks: readonly number[] }
type WaveformStatus = 'loading' | 'ready' | 'unavailable'
type AcceptedCandidateOutcome = Extract<Awaited<ReturnType<FeatureScreenProps['services']['recording']['acceptCandidate']>>, { status: 'ok' }>['data']
type CaptureState = 'requesting' | 'capturing' | 'saving' | 'accepting' | 'navigating' | 'assembling' | null

const copy = {
  en: {
    title: 'Record your voice',
    back: 'Projects',
    workspaceRecord: 'Record',
    progressSaved: 'Progress saved',
    progressSaving: 'Saving draft…',
    microphone: 'Microphone',
    loading: 'Loading recording session…',
    sourceLoading: 'Loading the original video…',
    sourceFailed: 'The original video preview could not be loaded in this browser. Audio-track presence is unknown.',
    sourceUnavailable: 'The original source is unavailable in this browser preview.',
    sourceLabel: 'Original video',
    originalMode: 'Original',
    line: 'Line',
    accepted: 'Accepted takes',
    window: 'Capture window',
    volume: 'Original video volume',
    transportMode: 'Audio source',
    myRecording: 'My recording',
    play: 'Play',
    pause: 'Pause',
    seek: 'Seek playback',
    timeline: 'Recording playback timeline',
    position: 'Playback position',
    recordingUnavailable: 'No saved recording is available for this line yet.',
    waveformLoading: 'Decoding local audio for waveform preview…',
    waveformUnavailable: 'Waveform preview is unavailable for this local audio.',
    transportPlaybackFailed: 'This local audio could not be played. The saved recording remains unchanged.',
    record: 'Record line',
    requesting: 'Requesting microphone…',
    recordingActive: 'Recording…',
    capturing: 'Recording the line… it will stop automatically.',
    permissionFailed: 'Microphone access could not be started. Check browser permission and retry.',
    playbackFailed: 'The original video could not start. No recording was kept.',
    captureFailed: 'The fixed-window recording could not be completed. Retry this line.',
    saveFailed: 'The take could not be saved as a recoverable draft. The local recording remains available until you leave this screen.',
    savedDraft: 'Draft saved. It has not been accepted as a take.',
    savedInvalid: 'Draft saved for recovery, but this browser could not verify recorded audio frames. Record this line again before accepting it.',
    candidateReady: 'Recorded audio frames were decoded. Next line saves this take and continues.',
    accepting: 'Saving take…',
    acceptedNow: 'Take accepted.',
    localTake: 'Current draft recording',
    acceptedTake: 'Previously accepted take',
    retry: 'Record again',
    accessUnavailable: 'This recording session is open elsewhere or unavailable. You can listen, but cannot record here.',
    accessFailed: 'Recording access could not be acquired. Retry by reopening this project.',
    previous: 'Previous line',
    next: 'Next line',
    firstMissing: 'Go to first unrecorded line',
    end: 'You reached the last line.',
    incomplete: 'Some lines still need an accepted take.',
    complete: 'All lines have accepted takes.',
    toResult: 'Assemble result',
    leaveTitle: 'Leave recording?',
    leaveBody: 'Choose what to do with this line before leaving. Saving a draft does not accept it as a take.',
    saveLeave: 'Save and leave',
    discardLeave: 'Leave without saving',
    stay: 'Stay here',
    guardError: 'The leave choice could not be saved. You can retry or stay on this screen.',
    captureBusy: 'Wait for this line to finish recording before leaving.',
    interruption: 'The recording stopped early. The captured audio is saved as a draft; review it before accepting.',
    assemblyFailed: 'The result could not be started. Your accepted takes are still saved; retry assembly from this screen.',
    serviceFailed: 'This action could not be completed. Your existing accepted take remains unchanged.',
    localOnly: 'This prototype saves draft and take state through its local mock workspace. It does not produce a custom rendered performance.',
    meter: 'Input level',
    levelUnavailable: 'Input meter unavailable',
    status: 'Recording status',
    heldElsewhere: 'Recording access is held by another session.',
    turnOf: 'of',
    processAgainHeading: 'Process again',
    requestProcessAgainQuote: 'Process again',
    processAgainQuoteLoading: 'Checking current reprocessing option…',
    processAgainQuoteFailed: 'The current reprocessing option could not be confirmed. No new processing was authorized.',
    processAgainQuoteStale: 'The project changed after this quote. Check the current reprocessing option again.',
    processAgainAttempt: 'Run type',
    processAgainCost: 'Exact cost',
    processAgainCredits: 'credits',
    processAgainAvailable: 'Available credits',
    processAgainReserved: 'Reserved credits',
    processAgainIncluded: 'Included retry — no additional credits',
    processAgainPaid: (credits: number) => `Paid reprocessing — ${credits} credits`,
    processAgainInitial: 'Initial processing quote',
    processAgainRetained: 'The current preparation remains active until a complete, usable replacement with dialogue is activated.',
    processAgainDraftWarning: (count: number) => `A usable replacement with dialogue will delete ${count} unaccepted saved draft${count === 1 ? '' : 's'} only when it activates. The current preparation and drafts remain available until then.`,
    processAgainTitle: 'Replace the current preparation?',
    processAgainDescription: 'Your current preparation remains available unless this run completes with dialogue and activates as a usable replacement.',
    processAgainClose: 'Close replacement confirmation',
    processAgainCancel: 'Keep current preparation',
    processAgainConfirm: 'Confirm and process replacement',
    processAgainStartIncluded: 'Use included retry',
    processAgainStartPaid: (credits: number) => `Process again for ${credits} credits`,
    processAgainInsufficient: 'Available credits are below this exact quote. No processing has been authorized.',
    processAgainLocked: 'Processing again is permanently locked after the first accepted take. Deleting a take will not unlock it.',
    processAgainStarted: 'Processing was accepted. Opening its status.',
    processAgainUnknown: 'The processing result is not confirmed. Check the same operation status before doing anything else.',
    processAgainCheckStatus: 'Check processing status',
    processAgainStarting: 'Starting the quoted processing attempt…',
    processAgainChecking: 'Checking the same processing operation…',
    processAgainStartFailed: 'This processing attempt was not started. Your current preparation and drafts remain available.',
    processAgainDraftUnavailable: 'Save this recording as a recoverable draft before processing again. It will remain unaccepted.',
    processAgainGuardFailed: 'Recording access could not be released safely. The current preparation and drafts remain available.',
    processAgainDialogBody: (count: number, consequence: string) => count > 0
      ? `${consequence} If a usable replacement with dialogue activates, it will replace the current preparation and delete ${count} unaccepted saved draft${count === 1 ? '' : 's'}. Nothing is deleted before activation.`
      : `${consequence} The current preparation remains active until a usable replacement with dialogue activates. No saved drafts are scheduled for deletion.`,
  },
  ru: {
    title: 'Запишите свою реплику',
    back: 'Проекты',
    workspaceRecord: 'Запись',
    progressSaved: 'Прогресс сохранён',
    progressSaving: 'Сохраняем черновик…',
    microphone: 'Микрофон',
    loading: 'Загружаем запись…',
    sourceLoading: 'Загружаем исходное видео…',
    sourceFailed: 'Не удалось открыть исходное видео в этом браузере. Наличие аудиодорожки неизвестно.',
    sourceUnavailable: 'Исходное видео недоступно в предпросмотре этого браузера.',
    sourceLabel: 'Исходное видео',
    originalMode: 'Оригинал',
    line: 'Реплика',
    accepted: 'Принятые дубли',
    window: 'Интервал записи',
    volume: 'Громкость исходного видео',
    transportMode: 'Источник звука',
    myRecording: 'Моя запись',
    play: 'Воспроизвести',
    pause: 'Пауза',
    seek: 'Перемотка воспроизведения',
    timeline: 'Шкала воспроизведения записи',
    position: 'Позиция воспроизведения',
    recordingUnavailable: 'Для этой реплики пока нет сохранённой записи.',
    waveformLoading: 'Декодируем локальное аудио для отображения волны…',
    waveformUnavailable: 'Не удалось показать волну этого локального аудио.',
    transportPlaybackFailed: 'Не удалось воспроизвести локальное аудио. Сохранённая запись не изменена.',
    record: 'Записать реплику',
    requesting: 'Запрашиваем микрофон…',
    recordingActive: 'Запись…',
    capturing: 'Записываем реплику… запись остановится автоматически.',
    permissionFailed: 'Не удалось включить микрофон. Проверьте разрешение браузера и повторите попытку.',
    playbackFailed: 'Не удалось запустить исходное видео. Запись не сохранена.',
    captureFailed: 'Не удалось завершить запись в заданном интервале. Повторите попытку.',
    saveFailed: 'Не удалось сохранить черновик для восстановления. Локальная запись доступна, пока вы на этой странице.',
    savedDraft: 'Черновик сохранён. Он ещё не принят как дубль.',
    savedInvalid: 'Черновик сохранён для восстановления, но браузер не подтвердил наличие аудиокадров. Запишите реплику заново перед принятием.',
    candidateReady: 'Аудиокадры декодированы. Кнопка «Следующая реплика» сохранит дубль и продолжит.',
    accepting: 'Сохраняем дубль…',
    acceptedNow: 'Дубль принят.',
    localTake: 'Текущий черновик записи',
    acceptedTake: 'Ранее принятый дубль',
    retry: 'Записать заново',
    accessUnavailable: 'Эта сессия записи открыта в другом месте или недоступна. Здесь можно слушать, но нельзя записывать.',
    accessFailed: 'Не удалось получить доступ к записи. Откройте проект заново.',
    previous: 'Предыдущая реплика',
    next: 'Следующая реплика',
    firstMissing: 'Перейти к первой непринятой реплике',
    end: 'Это последняя реплика.',
    incomplete: 'Для некоторых реплик ещё не принят дубль.',
    complete: 'Для всех реплик приняты дубли.',
    toResult: 'Собрать результат',
    leaveTitle: 'Выйти из записи?',
    leaveBody: 'Выберите действие с этой репликой перед выходом. Черновик не становится принятым дублем.',
    saveLeave: 'Сохранить и выйти',
    discardLeave: 'Выйти без сохранения',
    stay: 'Остаться',
    guardError: 'Не удалось сохранить выбор перед выходом. Повторите попытку или останьтесь на странице.',
    captureBusy: 'Дождитесь окончания записи реплики, прежде чем выходить.',
    interruption: 'Запись остановилась раньше времени. Аудио сохранено как черновик; прослушайте его перед принятием.',
    assemblyFailed: 'Не удалось запустить сборку результата. Принятые дубли сохранены; повторите сборку на этой странице.',
    serviceFailed: 'Не удалось выполнить действие. Ранее принятый дубль не изменён.',
    localOnly: 'Прототип хранит черновики и дубли в локальном тестовом хранилище. Он не создаёт индивидуальный смонтированный результат.',
    meter: 'Уровень входа',
    levelUnavailable: 'Индикатор уровня недоступен',
    status: 'Состояние записи',
    heldElsewhere: 'Доступ к записи занят другой сессией.',
    turnOf: 'из',
    processAgainHeading: 'Обработать ещё раз',
    requestProcessAgainQuote: 'Обработать ещё раз',
    processAgainQuoteLoading: 'Проверяем текущий вариант обработки…',
    processAgainQuoteFailed: 'Не удалось подтвердить текущий вариант обработки. Новая обработка не запускалась.',
    processAgainQuoteStale: 'Данные проекта изменились после расчёта. Проверьте актуальный вариант обработки.',
    processAgainAttempt: 'Тип обработки',
    processAgainCost: 'Точная стоимость',
    processAgainCredits: 'кредитов',
    processAgainAvailable: 'Доступно кредитов',
    processAgainReserved: 'Зарезервировано кредитов',
    processAgainIncluded: 'Включённый повтор — без дополнительных кредитов',
    processAgainPaid: (credits: number) => `Повторная обработка — ${credits} кредитов`,
    processAgainInitial: 'Стоимость первой обработки',
    processAgainRetained: 'Текущая подготовка останется доступна, пока не активируется полная пригодная замена с репликами.',
    processAgainDraftWarning: (count: number) => `Пригодная замена с репликами удалит сохранённые непринятые черновики (${count}) только при активации. До этого текущая подготовка и черновики останутся доступны.`,
    processAgainTitle: 'Заменить текущую подготовку?',
    processAgainDescription: 'Текущая подготовка останется доступна, если новая обработка не завершится с репликами и не активируется как пригодная замена.',
    processAgainClose: 'Закрыть подтверждение замены',
    processAgainCancel: 'Оставить текущую подготовку',
    processAgainConfirm: 'Подтвердить замену и обработать',
    processAgainStartIncluded: 'Использовать включённый повтор',
    processAgainStartPaid: (credits: number) => `Обработать ещё раз за ${credits} кредитов`,
    processAgainInsufficient: 'Доступных кредитов меньше точной стоимости. Обработка не запускалась.',
    processAgainLocked: 'Повторная обработка навсегда заблокирована после первого принятого дубля. Удаление дубля не снимет блокировку.',
    processAgainStarted: 'Обработка принята. Открываем её состояние.',
    processAgainUnknown: 'Результат обработки не подтверждён. Сначала проверьте состояние этой же операции.',
    processAgainCheckStatus: 'Проверить состояние обработки',
    processAgainStarting: 'Запускаем обработку по этой стоимости…',
    processAgainChecking: 'Проверяем состояние той же операции…',
    processAgainStartFailed: 'Эта обработка не запущена. Текущая подготовка и черновики доступны.',
    processAgainDraftUnavailable: 'Сначала сохраните эту запись как черновик для восстановления. Она останется непринятой.',
    processAgainGuardFailed: 'Не удалось безопасно освободить доступ к записи. Текущая подготовка и черновики доступны.',
    processAgainDialogBody: (count: number, consequence: string) => count > 0
      ? `${consequence} При активации пригодной замены с репликами она заменит текущую подготовку и удалит сохранённые непринятые черновики (${count}). До активации ничего не удаляется.`
      : `${consequence} Текущая подготовка останется активной до активации пригодной замены с репликами. Сохранённые черновики не будут удалены.`,
  },
} as const

type CopyMessageKey = {
  [Key in keyof typeof copy.en]: typeof copy.en[Key] extends string ? Key : never
}[keyof typeof copy.en]

function newOperationId(): OperationId {
  return ids.operation(crypto.randomUUID())
}

function candidateIsUsable(candidate: RecordingCandidate | null): candidate is RecordingCandidate {
  return candidate !== null
    && candidate.audioTrackPresent
    && candidate.hasRecordedBytes
    && candidate.audioFrames === 'present'
    && typeof candidate.decodedDurationMs === 'number'
    && Number.isFinite(candidate.decodedDurationMs)
    && candidate.decodedDurationMs > 0
    && candidate.durationMs > 0
}

function isHeldAccessLive(access: RecordingAccess | null): access is RecordingAccess {
  return access?.state === 'held-by-session' && access.expiresAt > Date.now()
}

function quoteMatchesProject(quote: ProcessingQuote, project: OwnedProject) {
  return quote.projectId === project.id
    && quote.projectRevision === project.revision
    && quote.sourceId === project.sourceId
    && quote.sourceRevision === project.sourceRevision
    && quote.selectionRevision === project.selection.revision
    && quote.activePreparationId === project.preparationId
    && quote.activePreparationRevision === project.preparationRevision
    && quote.expiresAt > Date.now()
}

function objectUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}

export function RecordingScreen({ route, locale, services, navigate, registerRouteExitGuard }: FeatureScreenProps) {
  const text = copy[locale]
  const projectId = route.kind === 'project' && route.screen === 'record' ? route.projectId : null
  const [context, setContext] = useState<RecordingContext | null>(null)
  const contextRef = useRef<RecordingContext | null>(null)
  const [turnId, setTurnId] = useState<RecordingTurn['id'] | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null)
  const [sourceState, setSourceState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [sourceWaveform, setSourceWaveform] = useState<WaveformPreview | null>(null)
  const [sourceWaveformStatus, setSourceWaveformStatus] = useState<WaveformStatus>('loading')
  const [sourceVolume, setSourceVolume] = useState(0.8)
  const [draft, setDraft] = useState<CandidateDraft | null>(null)
  const draftRef = useRef<CandidateDraft | null>(null)
  const [acceptedPlaybackUrl, setAcceptedPlaybackUrl] = useState<string | null>(null)
  const acceptedPlaybackRef = useRef<{ url: string; turnId: RecordingTurn['id'] } | null>(null)
  const waveformPlaybackReadsRef = useRef(new Map<string, number>())
  const deferredPlaybackReleasesRef = useRef(new Set<string>())
  const [recordingDurationMs, setRecordingDurationMs] = useState(0)
  const [recordingWaveform, setRecordingWaveform] = useState<WaveformPreview | null>(null)
  const [recordingWaveformStatus, setRecordingWaveformStatus] = useState<WaveformStatus>('unavailable')
  const [transportMode, setTransportMode] = useState<RecordingTransportMode>('source')
  const [transportTimeMs, setTransportTimeMs] = useState(0)
  const [transportPlaying, setTransportPlaying] = useState(false)
  const [access, setAccess] = useState<RecordingAccess | null>(null)
  const accessRef = useRef<RecordingAccess | null>(null)
  const renewalInFlightRef = useRef<Promise<void> | null>(null)
  const [captureState, setCaptureState] = useState<CaptureState>(null)
  const captureStateRef = useRef<CaptureState>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [inputLevel, setInputLevel] = useState(0)
  const [levelAvailable, setLevelAvailable] = useState(true)
  const [currentError, setCurrentError] = useState<CopyMessageKey | null>(null)
  const [boundary, setBoundary] = useState<'start' | 'end' | 'incomplete' | 'complete' | null>(null)
  const [pendingExit, setPendingExit] = useState<RouteExitRequest | null>(null)
  const [exitBusy, setExitBusy] = useState(false)
  const [pendingAssemblyId, setPendingAssemblyId] = useState<OperationId | null>(null)
  const [processAgainQuote, setProcessAgainQuote] = useState<ProcessingQuote | null>(null)
  const [processAgainBusy, setProcessAgainBusy] = useState<'quoting' | 'starting' | 'checking' | null>(null)
  const [processAgainError, setProcessAgainError] = useState<'quote' | 'stale' | 'start' | 'unknown' | 'guard' | 'draft' | null>(null)
  const [processAgainConfirmationOpen, setProcessAgainConfirmationOpen] = useState(false)
  const [processAgainOperationId, setProcessAgainOperationId] = useState<OperationId | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const recordingAudioRef = useRef<HTMLAudioElement | null>(null)
  const transportModeRef = useRef<RecordingTransportMode>('source')
  const transportPlayingRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const aliveRef = useRef(false)
  const lifecycleGenerationRef = useRef(0)
  const objectUrlsRef = useRef(new Set<string>())
  const turnRequestRef = useRef(0)
  const pendingExitResolveRef = useRef<((allowed: boolean) => void) | null>(null)
  const exitReturnFocusRef = useRef<HTMLElement | null>(null)
  const restoreExitFocusRef = useRef(false)
  const processAgainExitRef = useRef(false)

  const setCurrentContext = useCallback((next: RecordingContext | null) => {
    contextRef.current = next
    setContext(next)
  }, [])

  const setCurrentDraft = useCallback((next: CandidateDraft | null) => {
    draftRef.current = next
    setDraft(next)
  }, [])

  const releaseAcceptedPlaybackUrl = useCallback((url: string) => {
    if (deferredPlaybackReleasesRef.current.has(url)) return
    if ((waveformPlaybackReadsRef.current.get(url) ?? 0) > 0) {
      deferredPlaybackReleasesRef.current.add(url)
      return
    }
    services.recording.releasePlaybackUrl(url)
  }, [services.recording])

  const setCurrentAccess = useCallback((next: RecordingAccess | null) => {
    accessRef.current = next
    setAccess(next)
  }, [])

  const setCapturePhase = useCallback((next: CaptureState) => {
    captureStateRef.current = next
    setCaptureState(next)
  }, [])

  const createOwnedUrl = useCallback((blob: Blob) => {
    const url = objectUrl(blob)
    objectUrlsRef.current.add(url)
    return url
  }, [])

  const revokeOwnedUrl = useCallback((url: string | null) => {
    if (!url || !objectUrlsRef.current.delete(url)) return
    URL.revokeObjectURL(url)
  }, [])

  const stopLocalStream = useCallback(() => {
    const stream = streamRef.current
    streamRef.current = null
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const currentTurn = useMemo(
    () => context?.turns.find((turn) => turn.id === turnId) ?? null,
    [context?.turns, turnId],
  )
  const ownedAcceptedPlaybackUrl = acceptedPlaybackRef.current?.turnId === turnId
    && acceptedPlaybackRef.current.url === acceptedPlaybackUrl
    ? acceptedPlaybackUrl
    : null
  const currentTurnIndex = context && currentTurn
    ? context.turns.findIndex((turn) => turn.id === currentTurn.id)
    : -1
  const sourceWindowStartMs = currentTurn?.windowStartMs ?? 0
  const sourceWindowDurationMs = currentTurn
    ? Math.max(0, currentTurn.windowEndMs - currentTurn.windowStartMs)
    : 0
  const recordingPlaybackUrl = draft?.url ?? ownedAcceptedPlaybackUrl
  const recordingAvailable = Boolean(recordingPlaybackUrl)
  const selectedWaveform = transportMode === 'source' ? sourceWaveform : recordingWaveform
  const selectedWaveformStatus = transportMode === 'source' ? sourceWaveformStatus : recordingWaveformStatus
  const transportDurationMs = transportMode === 'source'
    ? sourceWindowDurationMs
    : recordingWaveform?.durationMs ?? recordingDurationMs
  const transportPeaks = selectedWaveform?.peaks ?? []
  const hasRecordingAccess = isHeldAccessLive(access) && isHeldAccessLive(accessRef.current)
  const captureWindowMs = currentTurn ? Math.max(0, currentTurn.windowEndMs - currentTurn.windowStartMs) : 0
  const candidateUsable = candidateIsUsable(draft?.candidate ?? null)
  const captureLocked = captureState !== null
  const processAgainConsequence = processAgainQuote?.attemptClass === 'included-retry'
    ? text.processAgainIncluded
    : processAgainQuote?.attemptClass === 'paid-reprocessing'
      ? text.processAgainPaid(processAgainQuote.credits)
      : text.processAgainInitial
  const processAgainButtonLabel = processAgainQuote?.attemptClass === 'included-retry'
    ? text.processAgainStartIncluded
    : processAgainQuote?.attemptClass === 'paid-reprocessing'
      ? text.processAgainStartPaid(processAgainQuote.credits)
      : text.processAgainInitial

  const refreshContext = useCallback(async () => {
    if (!projectId) return null
    const result = await services.recording.loadContext(projectId)
    if (result.status !== 'ok') return null
    setCurrentContext(result.data)
    return result.data
  }, [projectId, services.recording, setCurrentContext])

  const refreshProjectRevision = useCallback(async () => {
    if (!projectId) return null
    const result = await services.recording.loadContext(projectId)
    const current = contextRef.current
    if (result.status !== 'ok' || !current) return null
    setCurrentContext({ ...current, project: result.data.project })
    return result.data.project
  }, [projectId, services.recording, setCurrentContext])

  const stayOnRecording = () => {
    restoreExitFocusRef.current = true
    setPendingExit(null)
    const resolve = pendingExitResolveRef.current
    pendingExitResolveRef.current = null
    resolve?.(false)
  }

  const renewHeldAccess = useCallback(() => {
    if (renewalInFlightRef.current) return renewalInFlightRef.current
    const held = accessRef.current
    const currentContext = contextRef.current
    if (!projectId || !held || held.state !== 'held-by-session' || !currentContext) return Promise.resolve()
    if (held.expiresAt <= Date.now()) {
      setCurrentAccess({ ...held, state: 'unavailable' })
      return Promise.resolve()
    }
    if (['saving', 'accepting', 'navigating', 'assembling'].includes(captureStateRef.current ?? '')) return Promise.resolve()

    const input = {
      projectId,
      grantId: held.grantId,
      expectedGrantRevision: held.revision,
      expectedProjectRevision: currentContext.project.revision,
      operationId: newOperationId(),
    }
    let task: Promise<void>
    task = (async () => {
      const isUpdatedGrant = (next: RecordingAccess | undefined): next is RecordingAccess => Boolean(
        next
        && next.state === 'held-by-session'
        && next.grantId === held.grantId
        && next.accountId === held.accountId
        && next.sessionId === held.sessionId
        && next.fenceToken === held.fenceToken
        && Number(next.revision) > Number(held.revision)
        && next.expiresAt > Date.now(),
      )
      const resolveRenewal = async () => {
        try {
          const result = await services.operations.resolve<RecordingAccess>(input.operationId)
          if (result.status !== 'ok' || !('state' in result.data)) return { state: 'unresolved' as const }
          if (result.data.state === 'committed' && result.data.result) {
            return { state: 'committed' as const, access: result.data.result }
          }
          return result.data.state === 'not-started'
            ? { state: 'not-started' as const }
            : { state: 'unresolved' as const }
        } catch {
          return { state: 'unresolved' as const }
        }
      }
      const runRenewal = async () => {
        try {
          return await services.recording.renewAccess(input)
        } catch {
          return null
        }
      }
      const apply = (next: RecordingAccess | undefined) => {
        const latest = accessRef.current
        if (!isUpdatedGrant(next) || latest?.grantId !== held.grantId || latest.revision !== held.revision) return false
        setCurrentAccess(next)
        return true
      }
      const markUnavailable = () => {
        const latest = accessRef.current
        if (latest?.grantId === held.grantId && latest.revision === held.revision && latest.state === 'held-by-session') {
          setCurrentAccess({ ...latest, state: 'unavailable' })
        }
      }

      try {
        let result = await runRenewal()
        if (result?.status === 'ok') {
          if (!apply(result.data)) markUnavailable()
          return
        }
        if (result?.status === 'conflict') {
          markUnavailable()
          return
        }

        let resolution = await resolveRenewal()
        if (resolution.state === 'committed') {
          if (!apply(resolution.access)) markUnavailable()
          return
        }
        if (resolution.state !== 'not-started') {
          markUnavailable()
          return
        }

        result = await runRenewal()
        if (result?.status === 'ok') {
          if (!apply(result.data)) markUnavailable()
          return
        }
        if (result?.status === 'conflict') {
          markUnavailable()
          return
        }
        resolution = await resolveRenewal()
        if (resolution.state === 'committed' && apply(resolution.access)) return
        markUnavailable()
      } finally {
        renewalInFlightRef.current = null
      }
    })()
    renewalInFlightRef.current = task
    return task
  }, [projectId, services.operations, services.recording, setCurrentAccess])

  useEffect(() => {
    if (access?.state !== 'held-by-session') return
    const interval = window.setInterval(() => { void renewHeldAccess() }, 15_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void renewHeldAccess()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [access?.state, access?.grantId, renewHeldAccess])

  const ensureAssembly = useCallback(async (authorizationId: OperationId) => {
    if (!projectId) return false
    setCapturePhase('assembling')
    const fresh = await services.recording.loadContext(projectId)
    if (fresh.status !== 'ok') {
      setCurrentError('assemblyFailed')
      setCapturePhase(null)
      return false
    }
    setCurrentContext(fresh.data)
    const result = await services.results.ensureAssembly({
      projectId,
      authorizationId,
      expectedProjectRevision: fresh.data.project.revision,
      operationId: newOperationId(),
    })
    setCapturePhase(null)
    if (result.status !== 'ok') {
      setCurrentError('assemblyFailed')
      setPendingAssemblyId(authorizationId)
      return false
    }
    const completed = await services.recording.loadContext(projectId)
    if (completed.status !== 'ok') {
      setCurrentError('assemblyFailed')
      setPendingAssemblyId(authorizationId)
      return false
    }
    setCurrentContext(completed.data)
    setPendingAssemblyId(null)
    return true
  }, [projectId, services.recording, services.results, setCapturePhase, setCurrentContext])

  useEffect(() => {
    const generation = ++lifecycleGenerationRef.current
    const isCurrentLifecycle = () => lifecycleGenerationRef.current === generation
    aliveRef.current = true
    if (!projectId) return () => {
      if (isCurrentLifecycle()) lifecycleGenerationRef.current += 1
      aliveRef.current = false
    }
    setCurrentContext(null)
    setCurrentAccess(null)
    setCurrentDraft(null)
    setTurnId(null)
    setSourceBlob(null)
    setSourceWaveform(null)
    setSourceWaveformStatus('loading')
    setTransportMode('source')
    transportModeRef.current = 'source'
    setTransportPlaying(false)
    transportPlayingRef.current = false
    setTransportTimeMs(0)
    setSourceState('loading')
    setCurrentError(null)

    void (async () => {
      const loaded = await services.recording.loadContext(projectId)
      if (!aliveRef.current || !isCurrentLifecycle()) return
      if (loaded.status !== 'ok') {
        setCurrentError('serviceFailed')
        return
      }
      setCurrentContext(loaded.data)
      setTurnId(loaded.data.currentTurnId ?? loaded.data.turns[0]?.id ?? null)

      const accessResult = await services.recording.acquireAccess({
        projectId,
        expectedProjectRevision: loaded.data.project.revision,
        operationId: newOperationId(),
      })
      if (!aliveRef.current || !isCurrentLifecycle()) {
        if (accessResult.status === 'ok' && accessResult.data.state === 'held-by-session') {
          void services.recording.releaseAccess({
            projectId,
            grantId: accessResult.data.grantId,
            expectedGrantRevision: accessResult.data.revision,
            expectedProjectRevision: loaded.data.project.revision,
            operationId: newOperationId(),
          })
        }
        return
      }
      if (accessResult.status === 'ok') {
        setCurrentAccess(accessResult.data)
        if (accessResult.data.state === 'held-by-session') {
          accessRef.current = accessResult.data
        }
      } else {
        setCurrentError('accessFailed')
      }

      const source = await services.uploads.getSource(projectId)
      if (!aliveRef.current || !isCurrentLifecycle()) return
      if (source.status !== 'ok') {
        setSourceState('failed')
        return
      }
      setSourceBlob(source.data.blob)
      const url = createOwnedUrl(source.data.blob)
      setSourceUrl(url)
      setSourceState('ready')
    })().catch(() => {
      if (aliveRef.current && isCurrentLifecycle()) {
        setCurrentError('serviceFailed')
        setSourceState('failed')
      }
    })

    return () => {
      if (isCurrentLifecycle()) lifecycleGenerationRef.current += 1
      aliveRef.current = false
      turnRequestRef.current += 1
      stopLocalStream()
      if (acceptedPlaybackRef.current) {
        releaseAcceptedPlaybackUrl(acceptedPlaybackRef.current.url)
        acceptedPlaybackRef.current = null
      }
      for (const url of objectUrlsRef.current) URL.revokeObjectURL(url)
      objectUrlsRef.current.clear()
      const held = accessRef.current
      const latestContext = contextRef.current
      if (held?.state === 'held-by-session' && latestContext) {
        void services.recording.releaseAccess({
          projectId,
          grantId: held.grantId,
          expectedGrantRevision: held.revision,
          expectedProjectRevision: latestContext.project.revision,
          operationId: newOperationId(),
        })
      }
      accessRef.current = null
    }
  }, [projectId, services.recording, services.uploads, createOwnedUrl, releaseAcceptedPlaybackUrl, setCurrentAccess, setCurrentContext, setCurrentDraft, stopLocalStream])

  useEffect(() => {
    if (!sourceBlob || !currentTurn) {
      setSourceWaveform(null)
      setSourceWaveformStatus(sourceBlob ? 'unavailable' : 'loading')
      return
    }
    let cancelled = false
    setSourceWaveform(null)
    setSourceWaveformStatus('loading')
    void services.browserMedia.decodeAudioWaveform({
      source: sourceBlob,
      startMs: currentTurn.windowStartMs,
      endMs: currentTurn.windowEndMs,
    }).then((result) => {
      if (cancelled) return
      if (result.status === 'ok' && result.data.peaks.length > 0) {
        setSourceWaveform(result.data)
        setSourceWaveformStatus('ready')
      } else {
        setSourceWaveform(null)
        setSourceWaveformStatus('unavailable')
      }
    }).catch(() => {
      if (cancelled) return
      setSourceWaveform(null)
      setSourceWaveformStatus('unavailable')
    })
    return () => { cancelled = true }
  }, [sourceBlob, currentTurn?.windowStartMs, currentTurn?.windowEndMs, services.browserMedia])

  useEffect(() => {
    const mediaSource = draft?.blob ?? ownedAcceptedPlaybackUrl
    if (!mediaSource) {
      setRecordingWaveform(null)
      setRecordingWaveformStatus('unavailable')
      setRecordingDurationMs(0)
      return
    }
    let cancelled = false
    if (typeof mediaSource === 'string' && mediaSource.startsWith('blob:')) {
      waveformPlaybackReadsRef.current.set(
        mediaSource,
        (waveformPlaybackReadsRef.current.get(mediaSource) ?? 0) + 1,
      )
    }
    setRecordingWaveform(null)
    setRecordingWaveformStatus('loading')
    void services.browserMedia.decodeAudioWaveform({ source: mediaSource }).then((result) => {
      if (cancelled) return
      if (result.status === 'ok' && result.data.peaks.length > 0) {
        setRecordingWaveform(result.data)
        setRecordingDurationMs(result.data.durationMs)
        setRecordingWaveformStatus('ready')
      } else {
        setRecordingWaveform(null)
        setRecordingWaveformStatus('unavailable')
      }
    }).catch(() => {
      if (cancelled) return
      setRecordingWaveform(null)
      setRecordingWaveformStatus('unavailable')
    }).finally(() => {
      if (typeof mediaSource !== 'string' || !mediaSource.startsWith('blob:')) return
      const readers = waveformPlaybackReadsRef.current.get(mediaSource) ?? 0
      if (readers > 1) {
        waveformPlaybackReadsRef.current.set(mediaSource, readers - 1)
        return
      }
      waveformPlaybackReadsRef.current.delete(mediaSource)
      if (deferredPlaybackReleasesRef.current.delete(mediaSource)) {
        services.recording.releasePlaybackUrl(mediaSource)
      }
    })
    return () => { cancelled = true }
  }, [draft?.blob, ownedAcceptedPlaybackUrl, turnId, services.browserMedia, services.recording])

  useEffect(() => {
    if (!projectId || !turnId || !context) return
    const turn = context.turns.find((item) => item.id === turnId)
    if (!turn) return
    const requestId = ++turnRequestRef.current
    let cancelled = false
    setCurrentDraft(null)

    void (async () => {
      const [restored, accepted] = await Promise.all([
        services.recording.restoreDraft({ projectId, turnId }),
        turn.acceptedTakeId
          ? services.recording.acceptedTakePlayback({ projectId, turnId, takeId: turn.acceptedTakeId })
          : Promise.resolve(null),
      ])
      if (cancelled || !aliveRef.current || requestId !== turnRequestRef.current) {
        if (accepted?.status === 'ok') releaseAcceptedPlaybackUrl(accepted.data.url)
        return
      }
      if (restored.status === 'ok' && restored.data) {
        setCurrentDraft({
          candidate: restored.data.candidate,
          blob: restored.data.blob,
          url: createOwnedUrl(restored.data.blob),
          recoverable: true,
        })
      } else if (restored.status !== 'ok') {
        setCurrentError('serviceFailed')
      }
      if (accepted?.status === 'ok') {
        acceptedPlaybackRef.current = { url: accepted.data.url, turnId }
        setAcceptedPlaybackUrl(accepted.data.url)
      } else {
        acceptedPlaybackRef.current = null
        setAcceptedPlaybackUrl(null)
      }
    })().catch(() => {
      if (!cancelled && aliveRef.current && requestId === turnRequestRef.current) setCurrentError('serviceFailed')
    })

    return () => {
      cancelled = true
      if (acceptedPlaybackRef.current) {
        releaseAcceptedPlaybackUrl(acceptedPlaybackRef.current.url)
        acceptedPlaybackRef.current = null
      }
      setAcceptedPlaybackUrl(null)
    }
  }, [projectId, turnId, currentTurn?.acceptedTakeId, services.recording, createOwnedUrl, releaseAcceptedPlaybackUrl, setCurrentDraft])

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = sourceVolume
  }, [sourceUrl, sourceVolume])

  useEffect(() => {
    const video = videoRef.current
    const audio = recordingAudioRef.current
    audio?.pause()
    video?.pause()
    transportModeRef.current = 'source'
    setTransportMode('source')
    transportPlayingRef.current = false
    setTransportPlaying(false)
    setTransportTimeMs(0)
    if (video && currentTurn && sourceState === 'ready') {
      video.currentTime = currentTurn.windowStartMs / 1000
    }
  }, [turnId, currentTurn?.windowStartMs, sourceState])

  const setPlaybackState = (playing: boolean) => {
    transportPlayingRef.current = playing
    setTransportPlaying(playing)
  }

  const syncSourceTime = () => {
    const video = videoRef.current
    if (!video || !currentTurn || transportModeRef.current !== 'source') return
    const sourceTimeMs = video.currentTime * 1000
    const relativeTimeMs = Math.min(sourceWindowDurationMs, Math.max(0, sourceTimeMs - sourceWindowStartMs))
    setTransportTimeMs(relativeTimeMs)
    if (sourceTimeMs >= currentTurn.windowEndMs - 20) {
      video.pause()
      setPlaybackState(false)
    }
  }

  const syncRecordingTime = () => {
    const audio = recordingAudioRef.current
    if (!audio || transportModeRef.current !== 'recording') return
    const relativeTimeMs = Math.max(0, audio.currentTime * 1000)
    const video = videoRef.current
    if (video) {
      const expectedVideoTime = (sourceWindowStartMs + relativeTimeMs) / 1000
      if (Math.abs(video.currentTime - expectedVideoTime) > 0.12) video.currentTime = expectedVideoTime
    }
    setTransportTimeMs(relativeTimeMs)
  }

  const toggleTransportPlayback = async () => {
    if (captureStateRef.current !== null) return
    const mode = transportModeRef.current
    const video = videoRef.current
    const audio = recordingAudioRef.current
    if (!video || (mode === 'recording' && !audio)) return
    if (transportPlayingRef.current) {
      video.pause()
      audio?.pause()
      setPlaybackState(false)
      return
    }
    try {
      if (mode === 'recording') {
        video.muted = true
        await Promise.all([video.play(), audio!.play()])
      } else {
        video.muted = false
        audio?.pause()
        await video.play()
      }
      setPlaybackState(true)
    } catch {
      video.pause()
      audio?.pause()
      setPlaybackState(false)
      setCurrentError('transportPlaybackFailed')
    }
  }

  const changeTransportMode = async (mode: RecordingTransportMode) => {
    if (mode === transportModeRef.current || captureStateRef.current !== null) return
    const video = videoRef.current
    const audio = recordingAudioRef.current
    if (mode === 'recording' && !recordingAvailable) return
    const wasPlaying = transportPlayingRef.current
    video?.pause()
    audio?.pause()
    transportModeRef.current = mode
    setTransportMode(mode)
    const target = mode === 'source' ? video : audio
    if (!target) {
      setPlaybackState(false)
      return
    }
    const relativeTimeMs = 0
    if (video) video.currentTime = (sourceWindowStartMs + relativeTimeMs) / 1000
    if (audio) audio.currentTime = relativeTimeMs / 1000
    if (video) video.muted = mode === 'recording'
    setTransportTimeMs(relativeTimeMs)
    setPlaybackState(false)
    if (wasPlaying) {
      try {
        if (mode === 'recording') await Promise.all([video!.play(), audio!.play()])
        else await video!.play()
        setPlaybackState(true)
      } catch {
        video?.pause()
        audio?.pause()
        setCurrentError('transportPlaybackFailed')
      }
    }
  }

  const seekTransport = (requestedTimeMs: number) => {
    if (captureStateRef.current !== null) return
    const boundedTimeMs = Math.min(transportDurationMs, Math.max(0, requestedTimeMs))
    setTransportTimeMs(boundedTimeMs)
    if (videoRef.current) videoRef.current.currentTime = (sourceWindowStartMs + boundedTimeMs) / 1000
    if (recordingAudioRef.current) recordingAudioRef.current.currentTime = boundedTimeMs / 1000
  }

  const performRouteExit = useCallback(async (request: RouteExitRequest) => {
    if (!projectId) return false
    if (captureStateRef.current === 'requesting' || captureStateRef.current === 'capturing' || captureStateRef.current === 'saving' || captureStateRef.current === 'accepting' || captureStateRef.current === 'navigating') {
      setCurrentError('captureBusy')
      return false
    }
    const latestContext = contextRef.current
    const latestAccess = accessRef.current
    const isProcessAgainDestination = request.to.kind === 'project'
      && request.to.projectId === projectId
      && request.to.screen === 'processing'
    if (processAgainExitRef.current && isProcessAgainDestination) {
      if (!latestContext) return false
      const currentDraft = draftRef.current
      if (currentDraft && (!currentDraft.recoverable || !currentDraft.candidate.draftId)) {
        setProcessAgainError('draft')
        return false
      }
      if (!latestAccess || latestAccess.state !== 'held-by-session') return true
      const released = await services.recording.releaseAccess({
        projectId,
        grantId: latestAccess.grantId,
        expectedGrantRevision: latestAccess.revision,
        expectedProjectRevision: latestContext.project.revision,
        operationId: newOperationId(),
      })
      if (released.status !== 'ok') {
        setProcessAgainError('guard')
        return false
      }
      setCurrentAccess(null)
      accessRef.current = null
      return true
    }
    if (!latestContext || !turnId) return false
    if (draftRef.current && isHeldAccessLive(latestAccess)) {
      const activeElement = document.activeElement
      exitReturnFocusRef.current = activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null
      setPendingExit(request)
      return await new Promise<boolean>((resolve) => {
        pendingExitResolveRef.current?.(false)
        pendingExitResolveRef.current = resolve
      })
    }
    if (draftRef.current && !draftRef.current.recoverable) {
      setCurrentError('guardError')
      return false
    }
    if (!isHeldAccessLive(latestAccess)) return true
    const current = latestContext.turns.find((turn) => turn.id === turnId)
    if (!current) return false
    const result = await services.recording.resolveLeave({
      projectId,
      turnId,
      action: 'leave-without-saving',
      grantId: latestAccess.grantId,
      expectedGrantRevision: latestAccess.revision,
      expectedProjectRevision: latestContext.project.revision,
      operationId: newOperationId(),
    })
    if (result.status !== 'ok' || !result.data.grantReleased) {
      setCurrentError('guardError')
      return false
    }
    setCurrentAccess(null)
    accessRef.current = null
    if (result.data.initialAssemblyAuthorizationId) await ensureAssembly(result.data.initialAssemblyAuthorizationId)
    return true
  }, [projectId, services.recording, turnId, ensureAssembly, setCurrentAccess])

  useEffect(() => registerRouteExitGuard((request) => performRouteExit(request)), [registerRouteExitGuard, performRouteExit])

  const resolveLeaveChoice = async (action: 'save-and-leave' | 'leave-without-saving') => {
    if (!projectId || !turnId || exitBusy) return
    const latestContext = contextRef.current
    const latestAccess = accessRef.current
    if (!latestContext || !isHeldAccessLive(latestAccess)) {
      setCurrentError('guardError')
      return
    }
    const current = latestContext.turns.find((turn) => turn.id === turnId)
    if (!current) {
      setCurrentError('guardError')
      return
    }
    setExitBusy(true)
    try {
      const currentDraft = draftRef.current
      const result = await services.recording.resolveLeave({
        projectId,
        turnId,
        action,
        candidate: currentDraft?.candidate,
        blob: currentDraft?.blob,
        draftId: currentDraft?.candidate.draftId,
        grantId: latestAccess.grantId,
        expectedGrantRevision: latestAccess.revision,
        expectedProjectRevision: latestContext.project.revision,
        operationId: newOperationId(),
      })
      if (result.status !== 'ok') {
        setCurrentError('guardError')
        return
      }
      if (!result.data.grantReleased) {
        setCurrentError('guardError')
        return
      }
      if (result.data.draftDiscarded) {
        revokeOwnedUrl(currentDraft?.url ?? null)
        setCurrentDraft(null)
      }
      setCurrentAccess(null)
      accessRef.current = null
      if (result.data.initialAssemblyAuthorizationId) await ensureAssembly(result.data.initialAssemblyAuthorizationId)
      restoreExitFocusRef.current = false
      setPendingExit(null)
      const resolve = pendingExitResolveRef.current
      pendingExitResolveRef.current = null
      resolve?.(true)
    } catch {
      setCurrentError('guardError')
    } finally {
      setExitBusy(false)
    }
  }

  const waitForSeek = async (video: HTMLVideoElement, target: number) => {
    if (Math.abs(video.currentTime - target) < 0.025) return
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
      }
      const onSeeked = () => { cleanup(); resolve() }
      const onError = () => { cleanup(); reject(new Error('Source seek failed.')) }
      video.addEventListener('seeked', onSeeked, { once: true })
      video.addEventListener('error', onError, { once: true })
      video.currentTime = target
    })
  }

  const beginCapture = async () => {
    if (!projectId || !currentTurn || !context || !hasRecordingAccess || captureWindowMs <= 0 || captureStateRef.current) return
    videoRef.current?.pause()
    recordingAudioRef.current?.pause()
    if (videoRef.current) videoRef.current.muted = false
    transportModeRef.current = 'source'
    setTransportMode('source')
    setPlaybackState(false)
    setTransportTimeMs(0)
    await renewalInFlightRef.current
    if (!isHeldAccessLive(accessRef.current)) {
      setCurrentError('accessUnavailable')
      return
    }
    setCurrentError(null)
    setElapsedMs(0)
    setInputLevel(0)
    setLevelAvailable(false)
    setCapturePhase('requesting')
    const microphone = await services.browserMedia.requestMicrophone()
    if (microphone.status !== 'ok') {
      setCurrentError('permissionFailed')
      setCapturePhase(null)
      return
    }
    streamRef.current = microphone.data.stream
    const video = videoRef.current
    if (!video || sourceState !== 'ready') {
      stopLocalStream()
      setCurrentError('sourceUnavailable')
      setCapturePhase(null)
      return
    }
    try {
      await waitForSeek(video, currentTurn.windowStartMs / 1000)
      await video.play()
    } catch {
      video.pause()
      stopLocalStream()
      setCurrentError('playbackFailed')
      setCapturePhase(null)
      return
    }
    setCapturePhase('capturing')
    const captured = await services.browserMedia.captureFixedWindow({
      stream: microphone.data.stream,
      candidateId: ids.candidate(crypto.randomUUID()),
      windowMs: currentTurn.windowEndMs - currentTurn.windowStartMs,
      onProgress: (elapsed) => {
        setElapsedMs(elapsed)
        if (elapsed >= currentTurn.windowEndMs - currentTurn.windowStartMs) video.pause()
      },
      onLevel: (sample) => {
        setInputLevel(sample.rms)
        setLevelAvailable(true)
      },
    })
    video.pause()
    stopLocalStream()
    if (captured.status !== 'ok') {
      setCurrentError('captureFailed')
      setCapturePhase(null)
      return
    }
    const capture = captured.data
    const candidate: RecordingCandidate = {
      id: capture.candidateId,
      projectId,
      turnId: currentTurn.id,
      mediaId: ids.media(crypto.randomUUID()),
      processingRevision: currentTurn.processingRevision,
      timingRevision: currentTurn.timingRevision,
      revision: 0 as Revision,
      audioTrackPresent: capture.audioTrackPresent,
      hasRecordedBytes: capture.hasRecordedBytes,
      audioFrames: capture.audioFrames,
      decodedDurationMs: capture.decodedDurationMs,
      durationMs: Math.max(0, Math.round(capture.finishedAt - capture.startedAt)),
      accepted: false,
    }
    setCapturePhase('saving')
    await renewalInFlightRef.current
    const currentAccess = accessRef.current
    const currentContext = contextRef.current
    const previous = draftRef.current
    if (!isHeldAccessLive(currentAccess) || !currentContext) {
      if (!previous || !candidateIsUsable(previous.candidate)) {
        const url = createOwnedUrl(capture.blob)
        setCurrentDraft({ candidate, blob: capture.blob, url, recoverable: false })
      }
      setCurrentError('accessUnavailable')
      setCapturePhase(null)
      return
    }
    const persisted = await services.recording.persistDraft({
      projectId,
      turnId: currentTurn.id,
      candidate,
      blob: capture.blob,
      grantId: currentAccess.grantId,
      expectedGrantRevision: currentAccess.revision,
      expectedProjectRevision: currentContext.project.revision,
      operationId: newOperationId(),
    })
    if (persisted.status !== 'ok') {
      if (!previous || !candidateIsUsable(previous.candidate)) {
        const url = createOwnedUrl(capture.blob)
        setCurrentDraft({ candidate, blob: capture.blob, url, recoverable: false })
      }
      setCurrentError('saveFailed')
      setCapturePhase(null)
      return
    }
    const projectRevisionRefreshed = await refreshProjectRevision()
    if (!projectRevisionRefreshed) {
      const latestAccess = accessRef.current
      if (latestAccess?.grantId === currentAccess.grantId && latestAccess.state === 'held-by-session') {
        setCurrentAccess({ ...latestAccess, state: 'unavailable' })
      }
      setCurrentError('serviceFailed')
    }
    const retained = persisted.data.retainedUsableCandidate
    if (retained && previous && retained.id === previous.candidate.id) {
      setCurrentDraft({ ...previous, recoverable: true })
    } else {
      revokeOwnedUrl(previous?.url ?? null)
      const url = createOwnedUrl(capture.blob)
      setCurrentDraft({ candidate: persisted.data.candidate, blob: capture.blob, url, recoverable: true })
    }
    setCurrentError(projectRevisionRefreshed ? (capture.interrupted ? 'interruption' : null) : 'serviceFailed')
    setCapturePhase(null)
  }

  const acceptCurrentDraft = async (
    candidateDraft: CandidateDraft,
    currentAccess: RecordingAccess,
    currentContext: RecordingContext,
    targetTurn: RecordingTurn,
  ): Promise<{ data: AcceptedCandidateOutcome; fresh: RecordingContext | null } | null> => {
    if (!projectId || !candidateIsUsable(candidateDraft.candidate)) return null
    const accepted = await services.recording.acceptCandidate({
      projectId,
      turnId: targetTurn.id,
      candidate: candidateDraft.candidate,
      blob: candidateDraft.blob,
      draftId: candidateDraft.candidate.draftId,
      grantId: currentAccess.grantId,
      expectedGrantRevision: currentAccess.revision,
      expectedProjectRevision: currentContext.project.revision,
      expectedTakeRevision: currentContext.takeRevision,
      operationId: newOperationId(),
    })
    if (accepted.status !== 'ok') {
      setCurrentError('serviceFailed')
      return null
    }
    setCurrentAccess(accepted.data.access)
    setCurrentDraft(null)
    revokeOwnedUrl(candidateDraft.url)
    const fresh = await refreshContext()
    setCurrentError('acceptedNow')
    return { data: accepted.data, fresh }
  }

  const releaseCurrentAccess = async (freshContext: RecordingContext | null) => {
    const currentAccess = accessRef.current
    const revision = contextRef.current?.project.revision ?? freshContext?.project.revision
    if (!projectId || !currentAccess || currentAccess.state !== 'held-by-session' || !revision) return true
    const released = await services.recording.releaseAccess({
      projectId,
      grantId: currentAccess.grantId,
      expectedGrantRevision: currentAccess.revision,
      expectedProjectRevision: revision,
      operationId: newOperationId(),
    })
    if (released.status !== 'ok') {
      setCurrentError('guardError')
      return false
    }
    setCurrentAccess(null)
    accessRef.current = null
    return true
  }

  const requestProcessAgainQuote = async () => {
    if (!projectId || !context || processAgainBusy || context.reprocessingLocked) return
    const currentDraft = draftRef.current
    if (currentDraft && (!currentDraft.recoverable || !currentDraft.candidate.draftId)) {
      setProcessAgainError('draft')
      return
    }
    setProcessAgainBusy('quoting')
    setProcessAgainError(null)
    setProcessAgainQuote(null)
    setProcessAgainOperationId(null)
    try {
      const latest = await services.recording.loadContext(projectId)
      if (latest.status !== 'ok' || !latest.data.project.preparationId) {
        setProcessAgainError('quote')
        return
      }
      setCurrentContext(latest.data)
      const result = await services.preparation.quote({
        projectId,
        expectedProjectRevision: latest.data.project.revision,
        expectedActivePreparationId: latest.data.project.preparationId,
        expectedActivePreparationRevision: latest.data.project.preparationRevision,
        operationId: newOperationId(),
      })
      if (result.status !== 'ok') {
        setProcessAgainError(result.status === 'conflict' ? 'stale' : 'quote')
        return
      }
      if (!quoteMatchesProject(result.data, latest.data.project) || latest.data.reprocessingLocked) {
        setProcessAgainError('stale')
        return
      }
      setProcessAgainQuote(result.data)
    } catch {
      setProcessAgainError('quote')
    } finally {
      setProcessAgainBusy(null)
    }
  }

  const operationWasAccepted = (snapshot: PreparationSnapshot, operationId: OperationId) =>
    snapshot.projectId === projectId
    && snapshot.operation.id === operationId
    && (snapshot.operation.state === 'pending' || snapshot.operation.state === 'committed')

  const restoreRecordingAccess = async () => {
    if (!projectId || isHeldAccessLive(accessRef.current)) return
    const latest = await services.recording.loadContext(projectId)
    if (latest.status !== 'ok') return
    setCurrentContext(latest.data)
    const acquired = await services.recording.acquireAccess({
      projectId,
      expectedProjectRevision: latest.data.project.revision,
      operationId: newOperationId(),
    })
    if (acquired.status === 'ok') setCurrentAccess(acquired.data)
    else setCurrentError('processAgainGuardFailed')
  }

  const startProcessAgain = async () => {
    const quote = processAgainQuote
    if (!projectId || !context || !quote || processAgainBusy || processAgainError === 'unknown') return
    if (quote.credits > quote.available) return
    const operationId = processAgainOperationId ?? newOperationId()
    setProcessAgainOperationId(operationId)
    setProcessAgainConfirmationOpen(false)
    setProcessAgainError(null)
    setProcessAgainBusy('starting')
    processAgainExitRef.current = true
    let uncertain = false
    let failedToStart = false
    try {
      const navigated = await navigate(routes.project(projectId, 'processing'), {
        beforeCommit: async () => {
          const latest = await services.recording.loadContext(projectId)
          if (latest.status !== 'ok') {
            setProcessAgainError('stale')
            failedToStart = true
            return false
          }
          setCurrentContext(latest.data)
          const currentDraft = draftRef.current
          if (currentDraft && (!currentDraft.recoverable || !currentDraft.candidate.draftId)) {
            setProcessAgainError('draft')
            failedToStart = true
            return false
          }
          if (!quoteMatchesProject(quote, latest.data.project) || latest.data.reprocessingLocked || !latest.data.project.preparationId) {
            setProcessAgainError('stale')
            setProcessAgainQuote(null)
            failedToStart = true
            return false
          }
          const startInput = {
            quoteId: quote.id,
            expectedProjectRevision: latest.data.project.revision,
            expectedSourceRevision: latest.data.project.sourceRevision,
            expectedActivePreparationId: latest.data.project.preparationId,
            expectedActivePreparationRevision: latest.data.project.preparationRevision,
            acknowledgedDraftIds: [...quote.draftIdsToDeleteOnActivation],
            replacementAcknowledged: true,
            draftLossAcknowledged: true,
            explicitAuthorization: true as const,
            operationId,
          }
          let started
          try {
            started = await services.preparation.start(startInput)
          } catch {
            started = { status: 'unknown' as const }
          }
          if (started.status === 'ok') {
            notifyCreditsMayHaveChanged()
            return true
          }
          if (started.status === 'unknown') {
            let resolution
            try {
              resolution = await services.preparation.resolve({ projectId, targetOperationId: operationId })
            } catch {
              resolution = null
            }
            if (resolution?.status === 'ok' && operationWasAccepted(resolution.data, operationId)) {
              notifyCreditsMayHaveChanged()
              return true
            }
            uncertain = true
            setProcessAgainError('unknown')
            return false
          }
          setProcessAgainError(started.status === 'conflict' ? 'stale' : 'start')
          setProcessAgainQuote(null)
          setProcessAgainOperationId(null)
          failedToStart = true
          return false
        },
      })
      if (!navigated && failedToStart) await restoreRecordingAccess()
    } catch {
      uncertain = true
      setProcessAgainError('unknown')
    } finally {
      processAgainExitRef.current = false
      setProcessAgainBusy(null)
    }
    if (uncertain) setProcessAgainError('unknown')
  }

  const checkProcessAgainStatus = async () => {
    if (!projectId || !processAgainOperationId || processAgainBusy) return
    const operationId = processAgainOperationId
    setProcessAgainBusy('checking')
    try {
      const resolved = await services.preparation.resolve({ projectId, targetOperationId: operationId })
      if (resolved.status !== 'ok' || resolved.data.operation.id !== operationId) {
        setProcessAgainError('unknown')
        return
      }
      if (operationWasAccepted(resolved.data, operationId)) {
        processAgainExitRef.current = true
        const navigated = await navigate(routes.project(projectId, 'processing'), { beforeCommit: async () => true })
        processAgainExitRef.current = false
        if (!navigated) setProcessAgainError('unknown')
        return
      }
      if (resolved.data.operation.state === 'rejected') {
        setProcessAgainError('start')
        setProcessAgainOperationId(null)
        setProcessAgainQuote(null)
        await restoreRecordingAccess()
        return
      }
      setProcessAgainError('unknown')
    } catch {
      setProcessAgainError('unknown')
    } finally {
      processAgainExitRef.current = false
      setProcessAgainBusy(null)
    }
  }

  const navigateTurn = async (direction: 'back' | 'next') => {
    if (!projectId || !currentTurn || !context || captureState || !hasRecordingAccess) return
    const candidateDraft = direction === 'next' ? draftRef.current : null
    if (draftRef.current && direction !== 'next') return
    if (candidateDraft && !candidateIsUsable(candidateDraft.candidate)) return
    await renewalInFlightRef.current
    if (!isHeldAccessLive(accessRef.current) || (direction !== 'next' && draftRef.current)) {
      setCurrentError('accessUnavailable')
      return
    }
    setBoundary(null)
    setCurrentError(null)
    let latestContext = await refreshContext()
    if (!latestContext) {
      setCurrentError('serviceFailed')
      return
    }
    const currentAccess = accessRef.current
    if (!isHeldAccessLive(currentAccess)) {
      setCurrentError('accessUnavailable')
      return
    }
    if (candidateDraft) {
      const targetTurn = latestContext.turns.find((turn) => turn.id === currentTurn.id)
      if (!targetTurn) {
        setCurrentError('serviceFailed')
        return
      }
      setCapturePhase('accepting')
      const accepted = await acceptCurrentDraft(candidateDraft, currentAccess, latestContext, targetTurn)
      if (!accepted) {
        setCapturePhase(null)
        return
      }
      if (accepted.data.initialAssemblyAuthorizationId) {
        const complete = await ensureAssembly(accepted.data.initialAssemblyAuthorizationId)
        if (complete) {
          const released = await releaseCurrentAccess(accepted.fresh)
          if (released) void navigate(routes.project(projectId, 'result'))
        }
        return
      }
      if (!accepted.fresh) {
        setCurrentError('serviceFailed')
        setCapturePhase(null)
        return
      }
      latestContext = accepted.fresh
    }
    const currentTurnInContext = latestContext.turns.find((turn) => turn.id === currentTurn.id)
    if (!currentTurnInContext) {
      setCurrentError('serviceFailed')
      setCapturePhase(null)
      return
    }
    setCapturePhase('navigating')
    const result = await services.recording.navigate({
      projectId,
      turnId: currentTurnInContext.id,
      direction,
      expectedProjectRevision: latestContext.project.revision,
    })
    setCapturePhase(null)
    if (result.status !== 'ok') {
      setCurrentError('serviceFailed')
      return
    }
    if (result.data.turnId) {
      setCurrentDraft(null)
      setTurnId(result.data.turnId)
      setBoundary(null)
      return
    }
    setBoundary(result.data.boundary ?? null)
    if (result.data.boundary === 'incomplete' && result.data.firstMissingTurnId) {
      setTurnId(result.data.firstMissingTurnId)
    }
  }

  const goToResult = async () => {
    if (!projectId || !context || captureState || draft || context.missingAcceptedCount !== 0 || !hasRecordingAccess) return
    setCurrentError(null)
    setCapturePhase('assembling')
    const authorization = await services.recording.authorizeCompletedRevision({
      projectId,
      expectedProjectRevision: context.project.revision,
      action: 'to-result',
      operationId: newOperationId(),
    })
    if (authorization.status !== 'ok') {
      setCurrentError('serviceFailed')
      setCapturePhase(null)
      return
    }
    const complete = await ensureAssembly(authorization.data.id)
    if (!complete) {
      setCapturePhase(null)
      return
    }
    const fresh = await refreshContext()
    const released = await releaseCurrentAccess(fresh)
    setCapturePhase(null)
    if (released) void navigate(routes.project(projectId, 'result'))
  }

  const goToFirstMissing = () => {
    if (context?.firstMissingTurnId) {
      setBoundary(null)
      setTurnId(context.firstMissingTurnId)
      return
    }
    if (context?.turns[0]) {
      setBoundary(null)
      setTurnId(context.turns[0].id)
    }
  }

  const retryAssembly = async () => {
    if (!pendingAssemblyId) return
    const complete = await ensureAssembly(pendingAssemblyId)
    if (complete && projectId) {
      const fresh = await refreshContext()
      if (await releaseCurrentAccess(fresh)) void navigate(routes.project(projectId, 'result'))
    }
  }

  if (!projectId) return <p role="alert">{text.serviceFailed}</p>

  return (
    <section
      className="recording-screen"
      aria-labelledby="recording-title"
      onFocusCapture={(event) => {
        if (!window.matchMedia?.('(max-width: 767px)').matches) return
        const target = event.target
        const screen = event.currentTarget
        if (!(target instanceof HTMLElement)) return
        const panel = screen.querySelector<HTMLElement>('.recording-transport__controls')
        if (!panel || panel.contains(target)) return
        window.requestAnimationFrame(() => {
          if (!screen.isConnected || !target.isConnected || document.activeElement !== target) return
          const currentPanel = screen.querySelector<HTMLElement>('.recording-transport__controls')
          if (!currentPanel) return
          const overlap = target.getBoundingClientRect().bottom + 8 - currentPanel.getBoundingClientRect().top
          if (overlap > 0) window.scrollBy(0, overlap)
        })
      }}
    >
      <header className="recording-screen__header">
        <div className="recording-screen__heading">
          <h1 id="recording-title">{text.title}</h1>
          {context && (
            <div className="recording-screen__project-context">
              <span>{context.project.title}</span>
              <span>{text.workspaceRecord}</span>
              <span role="status">{captureState === 'saving' ? text.progressSaving : draft ? (draft.recoverable ? text.savedDraft : text.saveFailed) : text.progressSaved}</span>
            </div>
          )}
        </div>
        <div className="recording-screen__header-actions">
          <Button variant="secondary" onClick={() => void navigate(routes.projects())} disabled={captureLocked}>
            <ArrowLeft aria-hidden="true" strokeWidth={1.1} />
            {text.back}
          </Button>
        </div>
      </header>

      {!context && !currentError && <p role="status">{text.loading}</p>}
      {currentError && <Notice tone={currentError === 'acceptedNow' ? 'success' : 'error'} role={currentError === 'acceptedNow' ? 'status' : 'alert'}>{text[currentError]}</Notice>}
      {processAgainError && (
        <Notice tone="error" role="alert">
          {processAgainError === 'quote' && text.processAgainQuoteFailed}
          {processAgainError === 'stale' && text.processAgainQuoteStale}
          {processAgainError === 'start' && text.processAgainStartFailed}
          {processAgainError === 'unknown' && (
            <>
              <span>{text.processAgainUnknown}</span>
              <Button variant="secondary" onClick={() => void checkProcessAgainStatus()} disabled={processAgainBusy !== null}>
                {processAgainBusy === 'checking' ? text.processAgainChecking : text.processAgainCheckStatus}
              </Button>
            </>
          )}
          {processAgainError === 'guard' && text.processAgainGuardFailed}
          {processAgainError === 'draft' && text.processAgainDraftUnavailable}
        </Notice>
      )}
      {access && access.state !== 'held-by-session' && <Notice tone="error">{access.state === 'held-elsewhere' ? text.heldElsewhere : text.accessUnavailable}</Notice>}

      {context && currentTurn && (
        <>
          <section className="recording-screen__stage">
            {sourceState === 'loading' && <div className="recording-screen__video-placeholder" role="status">{text.sourceLoading}</div>}
            {sourceState === 'failed' && <div className="recording-screen__video-placeholder" role="alert">{text.sourceFailed}</div>}
            {sourceUrl && (
              <video
                ref={videoRef}
                src={sourceUrl}
                muted={transportMode === 'recording'}
                playsInline
                preload="metadata"
                onError={() => setSourceState('failed')}
                onLoadedMetadata={() => {
                  setSourceState('ready')
                  if (currentTurn && videoRef.current) videoRef.current.currentTime = currentTurn.windowStartMs / 1000
                }}
                onTimeUpdate={syncSourceTime}
                onEnded={() => {
                  recordingAudioRef.current?.pause()
                  setPlaybackState(false)
                }}
                aria-label={text.sourceLabel}
              />
            )}
            <audio
              ref={recordingAudioRef}
              hidden
              aria-hidden="true"
              tabIndex={-1}
              preload="metadata"
              src={recordingPlaybackUrl ?? undefined}
              onLoadedMetadata={(event) => {
                if (Number.isFinite(event.currentTarget.duration)) {
                  setRecordingDurationMs(Math.round(event.currentTarget.duration * 1000))
                }
              }}
              onTimeUpdate={syncRecordingTime}
              onEnded={() => {
                videoRef.current?.pause()
                setPlaybackState(false)
              }}
            />
          </section>

          <div className="recording-screen__line-header">
            <div>
              <span className="recording-screen__eyebrow">{text.line} {currentTurnIndex + 1} {text.turnOf} {context.turns.length}</span>
              <p className="recording-screen__dialogue">{currentTurn.text}</p>
              <p className="recording-screen__timing">{text.window}: {(currentTurn.windowStartMs / 1000).toFixed(2)}–{(currentTurn.windowEndMs / 1000).toFixed(2)} s</p>
            </div>
            <span className="recording-screen__count">{text.accepted}: {context.acceptedTakeCount} / {context.turns.length}</span>
          </div>

          <RecordingTransport
            peaks={transportPeaks}
            durationMs={transportDurationMs}
            currentTimeMs={transportTimeMs}
            playing={transportPlaying}
            mode={transportMode}
            recordingAvailable={recordingAvailable}
            disabled={captureState !== null || sourceState !== 'ready'}
            labels={{
              mode: text.transportMode,
              source: text.originalMode,
              recording: text.myRecording,
              play: text.play,
              pause: text.pause,
              seek: text.seek,
              timeline: text.timeline,
              position: text.position,
              recordingUnavailable: text.recordingUnavailable,
              waveformUnavailable: selectedWaveformStatus === 'loading' ? '' : text.waveformUnavailable,
            }}
            onModeChange={(mode) => void changeTransportMode(mode)}
            onTogglePlayback={() => void toggleTransportPlayback()}
            onSeek={seekTransport}
            actions={(
              <>
                <Button onClick={() => void beginCapture()} disabled={!hasRecordingAccess || sourceState !== 'ready' || captureWindowMs <= 0 || captureState !== null}>
                  {draft ? <RotateCcw aria-hidden="true" strokeWidth={1.1} /> : <Mic aria-hidden="true" strokeWidth={1.1} />}
                  {captureState === 'requesting' ? text.requesting : captureState === 'capturing' ? text.recordingActive : draft ? text.retry : text.record}
                </Button>
                <Button variant="secondary" onClick={() => void navigateTurn('back')} disabled={captureState !== null || draft !== null || !hasRecordingAccess || currentTurnIndex <= 0}>
                  <ArrowLeft aria-hidden="true" strokeWidth={1.1} />
                  {text.previous}
                </Button>
                <Button variant="secondary" onClick={() => void navigateTurn('next')} disabled={captureState !== null || !hasRecordingAccess || (draft ? !candidateUsable : currentTurnIndex >= context.turns.length - 1)}>
                  {text.next}
                  <ArrowRight aria-hidden="true" strokeWidth={1.1} />
                </Button>
                <Button variant="secondary" onClick={() => void navigate(routes.microphoneForProject(projectId))} disabled={captureState !== null || exitBusy}>
                  <Mic aria-hidden="true" strokeWidth={1.1} />
                  {text.microphone}
                </Button>
              </>
            )}
          />
          {selectedWaveformStatus === 'loading' && <p className="recording-screen__waveform-status" role="status">{text.waveformLoading}</p>}

          <label className="recording-screen__volume">
            <span>{text.volume}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sourceVolume}
              onChange={(event) => {
                const next = Number(event.currentTarget.value)
                setSourceVolume(next)
                if (videoRef.current) videoRef.current.volume = next
              }}
            />
          </label>

          <div className="recording-screen__capture-status" aria-live="polite">
            <span>{text.status}</span>
            {captureState === 'requesting' && <span>{text.requesting}</span>}
            {captureState === 'capturing' && <span>{text.capturing}</span>}
            {captureState === 'capturing' && <progress max={captureWindowMs} value={Math.min(elapsedMs, captureWindowMs)} aria-label={text.status} />}
          </div>
          <div className="recording-screen__meter" aria-label={`${text.meter}: ${levelAvailable ? Math.round(inputLevel * 100) : text.levelUnavailable}`}>
            <span style={{ width: `${Math.max(0, Math.min(100, inputLevel * 100))}%` }} />
          </div>

          {draft && (
            <section className="recording-screen__take" aria-label={text.localTake}>
              <div className="recording-screen__take-heading">
                <h2>{text.localTake}</h2>
                <span>{draft.recoverable ? text.savedDraft : text.saveFailed}</span>
              </div>
              <p role={candidateUsable ? 'status' : 'alert'}>{candidateUsable ? text.candidateReady : text.savedInvalid}</p>
            </section>
          )}
          {ownedAcceptedPlaybackUrl && (
            <section className="recording-screen__take" aria-label={text.acceptedTake}>
              <h2>{text.acceptedTake}</h2>
            </section>
          )}

          {boundary === 'incomplete' && (
            <Notice tone="error">
              <span>{text.incomplete}</span>
              <Button variant="secondary" onClick={goToFirstMissing}>{text.firstMissing}</Button>
            </Notice>
          )}
          {boundary === 'end' && <Notice>{text.end}</Notice>}
          {context.missingAcceptedCount === 0 && (
            <section className="recording-screen__completion">
              <p>{text.complete}</p>
              <Button onClick={() => void goToResult()} disabled={Boolean(draft) || captureState !== null || !hasRecordingAccess}>
                {text.toResult}
              </Button>
            </section>
          )}
          {pendingAssemblyId && (
            <div className="recording-screen__assembly-error">
              <Notice tone="error" role="alert">{text.assemblyFailed}</Notice>
              <Button variant="secondary" onClick={() => void retryAssembly()} disabled={captureState !== null}>{text.toResult}</Button>
            </div>
          )}
          <p className="recording-screen__prototype-note">{text.localOnly}</p>
        </>
      )}

      {context?.project.preparationId && (
        <section className="recording-screen__process-again" aria-label={text.processAgainHeading}>
          <Button
            variant="secondary"
            onClick={() => void requestProcessAgainQuote()}
            disabled={processAgainBusy !== null || captureLocked || exitBusy || context.reprocessingLocked || processAgainError === 'unknown' || Boolean(draft && (!draft.recoverable || !draft.candidate.draftId))}
          >
            {processAgainBusy === 'quoting' ? text.processAgainQuoteLoading : text.requestProcessAgainQuote}
          </Button>
          {context.reprocessingLocked && <Notice>{text.processAgainLocked}</Notice>}
          {draft && (!draft.recoverable || !draft.candidate.draftId) && <Notice tone="error">{text.processAgainDraftUnavailable}</Notice>}
          {processAgainQuote && (
            <div className="recording-screen__process-again-quote">
              <dl>
                <div>
                  <dt>{text.processAgainAttempt}</dt>
                  <dd>{processAgainConsequence}</dd>
                </div>
                <div>
                  <dt>{text.processAgainCost}</dt>
                  <dd>{processAgainQuote.credits} {text.processAgainCredits}</dd>
                </div>
                <div>
                  <dt>{text.processAgainAvailable}</dt>
                  <dd>{processAgainQuote.available}</dd>
                </div>
                <div>
                  <dt>{text.processAgainReserved}</dt>
                  <dd>{processAgainQuote.reserved}</dd>
                </div>
              </dl>
              {processAgainQuote.draftIdsToDeleteOnActivation.length > 0
                ? <p>{text.processAgainDraftWarning(processAgainQuote.draftIdsToDeleteOnActivation.length)}</p>
                : <p>{text.processAgainRetained}</p>}
              {processAgainQuote.credits > processAgainQuote.available && <Notice tone="error">{text.processAgainInsufficient}</Notice>}
              <Button
                onClick={() => setProcessAgainConfirmationOpen(true)}
                disabled={processAgainBusy !== null || processAgainError === 'unknown' || processAgainQuote.credits > processAgainQuote.available || context.reprocessingLocked}
              >
                {processAgainButtonLabel}
              </Button>
            </div>
          )}
          {processAgainBusy === 'starting' && <p role="status">{text.processAgainStarting}</p>}
          {processAgainBusy === 'checking' && <p role="status">{text.processAgainChecking}</p>}
        </section>
      )}

      <Sheet
        open={processAgainConfirmationOpen}
        onOpenChange={(open) => {
          if (processAgainBusy === null) setProcessAgainConfirmationOpen(open)
        }}
        title={text.processAgainTitle}
        closeLabel={text.processAgainClose}
        description={text.processAgainDescription}
      >
        {processAgainQuote && (
          <div className="recording-screen__process-again-confirmation">
            <p>{text.processAgainDialogBody(processAgainQuote.draftIdsToDeleteOnActivation.length, processAgainConsequence)}</p>
            <div className="recording-screen__process-again-actions">
              <Button
                variant="secondary"
                onClick={() => setProcessAgainConfirmationOpen(false)}
                disabled={processAgainBusy !== null}
              >
                {text.processAgainCancel}
              </Button>
              <Button
                onClick={() => void startProcessAgain()}
                disabled={processAgainBusy !== null || processAgainQuote.credits > processAgainQuote.available || processAgainError === 'unknown'}
              >
                {text.processAgainConfirm}
              </Button>
            </div>
          </div>
        )}
      </Sheet>

      <Dialog.Root
        open={pendingExit !== null}
        onOpenChange={(open) => {
          if (!open && !exitBusy && pendingExit) stayOnRecording()
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="recording-screen__dialog-overlay" />
          <Dialog.Content
            className="recording-screen__leave-dialog"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              const dialog = event.currentTarget as HTMLElement | null
              dialog?.querySelector<HTMLElement>('[data-dialog-safe-focus]')?.focus()
            }}
            onCloseAutoFocus={(event) => {
              if (!restoreExitFocusRef.current) return
              event.preventDefault()
              restoreExitFocusRef.current = false
              const target = exitReturnFocusRef.current
              exitReturnFocusRef.current = null
              if (target?.isConnected) target.focus()
            }}
            onEscapeKeyDown={(event) => {
              if (exitBusy) event.preventDefault()
            }}
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <Dialog.Title asChild>
              <h2>{text.leaveTitle}</h2>
            </Dialog.Title>
            <Dialog.Description asChild>
              <p>{text.leaveBody}</p>
            </Dialog.Description>
            <div className="recording-screen__leave-actions">
              <Button onClick={() => void resolveLeaveChoice('save-and-leave')} disabled={exitBusy}>{text.saveLeave}</Button>
              <Button variant="secondary" onClick={() => void resolveLeaveChoice('leave-without-saving')} disabled={exitBusy}>{text.discardLeave}</Button>
              <Button
                variant="ghost"
                onClick={stayOnRecording}
                disabled={exitBusy}
                data-dialog-safe-focus
              >
                {text.stay}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

export default RecordingScreen
