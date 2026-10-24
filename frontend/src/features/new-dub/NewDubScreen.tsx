import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { FeatureScreenProps, RouteExitRequest } from '../../app/screen-contract'
import { notifyCreditsMayHaveChanged } from '../../app/credits-events'
import { parseProjectId, routes } from '../../app/routes'
import { Button } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import { MEDIA_FIXTURE_MANIFEST } from '../../media/fixtures'
import { probeLocalSource, type LocalSourceProbe } from '../../media/source-probe'
import { ids } from '../../services/contracts'
import type {
  CompatiblePreviewSnapshot,
  CreditSnapshot,
  OperationId,
  OperationSnapshot,
  OwnedProject,
  PreviewScenario,
  ProcessingQuote,
  ProcessingStartSnapshot,
  ProjectId,
  QuoteId,
  Revision,
  ServiceResult,
  SourceFacts,
} from '../../services/contracts'
import type { ServiceProblemCode } from '../../i18n/service-errors'
import './NewDubScreen.css'

const maximumBytes = 250 * 1024 * 1024
const maximumDurationMs = 10 * 60 * 1000
const minimumSelectionMs = 1000
const maximumSelectionMs = 120_000

type UploadFacts = {
  durationMs: number
  width: number
  height: number
  hasAudio: true
}

type LocalProblem =
  | 'unsupported'
  | 'too-large'
  | 'audio-missing'
  | 'audio-unknown'
  | 'metadata'
  | 'too-short'
  | 'too-long'
  | 'dimensions'

interface SourceCandidate {
  file: File
  probe: LocalSourceProbe
  facts?: UploadFacts
  problem?: LocalProblem
}

type PendingCommandKind =
  | 'upload-initial'
  | 'upload-replace'
  | 'selection'
  | 'quote'
  | 'start'
  | 'preview-request'
  | 'preview-retry'
  | 'return-context'

interface PendingCommand {
  accountId: string
  operationId: OperationId
  kind: PendingCommandKind
  projectId?: ProjectId
  fileName?: string
  fileSize?: number
  lastModified?: number
  facts?: UploadFacts
  expectedProjectRevision?: Revision
  expectedSourceRevision?: Revision
  startMs?: number
  endMs?: number
  quoteId?: QuoteId
  priorOperationId?: OperationId
  sourceId?: OwnedProject['sourceId']
  selection?: OwnedProject['selection']
}

interface SourceBundle {
  facts: SourceFacts
  blob: Blob
}

type BusyAction = 'loading' | 'probing' | 'uploading' | 'selection' | 'quote' | 'starting' | 'preview' | 'return' | 'checking'

type PreviewInspection = Extract<
  Awaited<ReturnType<FeatureScreenProps['services']['previews']['inspect']>>,
  { status: 'ok' }
>['data']

interface Props extends FeatureScreenProps {
  /** Deterministic preview failure is supplied only by a test scenario. */
  previewScenario?: PreviewScenario
}

const copy = {
  en: {
    title: 'New dub',
    description: 'Choose a source video, review the selected section, and request its exact processing quote.',
    source: 'Source video',
    chooseVideo: 'Choose video',
    chooseAnother: 'Choose another video',
    validateAndSave: 'Validate and save draft',
    replaceVideo: 'Replace video',
    supported: 'MP4, MOV, or WebM · up to 10 minutes · up to 250 MB',
    localFile: 'Selected file',
    localCheck: 'Local checks passed. The mock service still needs to accept and save this source.',
    uploadBusy: 'Saving and validating the source…',
    sourceSaved: 'Validated draft saved in this mock workspace.',
    capacityLoading: 'Checking project capacity…',
    capacity: (used: number, total: number) => `${used} of ${total} project slots used`,
    capacityFull: 'No project slots are available. Manage projects or return after the limit changes.',
    manageProjects: 'Manage projects',
    refreshCapacity: 'Refresh capacity',
    capacityUpgrade: 'A verified first purchase raises capacity from 2 to 10 projects. A pending purchase does not change this limit.',
    loadingDraft: 'Loading your saved draft…',
    draftUnavailable: 'This saved draft or its source could not be loaded. Retry to check the account-owned project again.',
    retry: 'Retry',
    titleLabel: 'Project title',
    durationLabel: 'Validated duration',
    sourceValidated: 'Saved source',
    preview: 'Video preview',
    previewUnavailable: 'This browser could not play the saved source. The source remains saved; check whether this exact mock fixture has a compatible-preview scenario.',
    inspectPreview: 'Check compatible-preview availability',
    previewChecking: 'Checking compatible-preview availability…',
    previewUnavailableForSource: 'A compatible preview is unavailable for this source in this mock scenario. The saved source is unchanged.',
    requestPreview: 'Prepare compatible preview',
    previewPending: 'Compatible preview is pending. No processing credits or AI run have been started.',
    checkPreview: 'Check preview status',
    previewReady: 'Synthetic compatible-preview simulation. The original source identity, scene, duration, and timeline remain the reference.',
    previewFailed: 'Compatible-preview preparation failed for this saved source. Retry the same mock path or continue later.',
    retryPreview: 'Retry preview',
    previewLoading: 'Updating preview…',
    previewMediaFailed: 'The preview media could not be opened in this browser. This does not establish that the source has no audio.',
    sourceDetails: (duration: string, width: number, height: number) => `${duration} · ${width} × ${height}`,
    selection: 'Selected section',
    sectionHelp: 'Choose one contiguous interval from the saved source. Only this interval proceeds to processing.',
    start: 'Start (seconds)',
    end: 'End (seconds)',
    rangeStart: 'Selection start',
    rangeEnd: 'Selection end',
    selectedDuration: (duration: string) => `Selected duration: ${duration} seconds`,
    saveSelection: 'Save section',
    selectionSaved: 'Section saved. Request a fresh quote before processing.',
    selectionLocked: 'The section cannot be edited while a preparation is active or after a take has been accepted.',
    selectionInvalid: 'Use a source-bounded interval from 1.000 through 120.000 seconds at 0.001-second precision. Neither boundary was moved for you.',
    selectionUnsaved: 'Save this section to update the source-bound quote.',
    selectionBlocked: 'The selected source interval is shorter than 1 second; the product rule is unresolved. No project was created.',
    quote: 'Processing quote',
    requestQuote: 'Get exact quote',
    refreshQuote: 'Refresh exact quote',
    quoteLoading: 'Getting the current exact quote…',
    quoteFailed: 'The quote could not be loaded. The source and saved section are unchanged.',
    quoteCredits: 'Credits for this section',
    attempt: 'Run type',
    attemptInitial: 'First processing run',
    attemptIncludedRetry: 'Included retry — no additional credits',
    attemptPaidReprocessing: 'Paid reprocessing at the quoted rate',
    available: 'Available after reservations',
    reserved: 'In processing',
    quotePrompt: 'Request an exact processing quote for the saved section.',
    quoteStale: 'This quote is expired or no longer matches the saved source and section. Request a fresh quote.',
    insufficient: 'The current available balance is below this quote. No processing has been authorized.',
    draftLossWarning: (count: number) => `If a usable replacement activates, it will delete ${count} saved unaccepted draft${count === 1 ? '' : 's'}. Existing preparation and drafts remain available until activation.`,
    draftLossConfirm: 'I understand that saved drafts will be deleted only if the replacement activates.',
    credits: 'Open credits',
    startProcessing: (credits: number) => `Process for ${credits} credits`,
    starting: 'Authorizing processing…',
    processingStarted: 'Processing was accepted. Opening its status.',
    openProcessing: 'Open processing status',
    commandUnknown: 'The service result is not confirmed. Check this operation before starting another action.',
    checkStatus: 'Check operation status',
    operationPending: 'The operation is still pending. Check again before taking another action.',
    operationNotStarted: 'The service confirmed that this operation did not start. The same request can be retried safely.',
    chooseSameFile: 'Choose the same local file again before retrying this upload.',
    retryUpload: 'Retry the same upload',
    storageUnavailable: 'This browser could not save the operation identity. The action was not sent.',
    localError: {
      unsupported: 'Choose an MP4, MOV, or WebM video file.',
      'too-large': 'This file is over the 250 MB limit.',
      'audio-missing': 'No audio in this video — choose another file.',
      'audio-unknown': 'Audio-track presence could not be established from the available local evidence. This file was not saved.',
      metadata: 'Video duration could not be established from browser metadata or the supported local container evidence.',
      'too-short': 'This video is shorter than 1 second. Choose a video at least 1 second long.',
      'too-long': 'This video is over the 10-minute limit.',
      dimensions: 'Video dimensions could not be established. This file was not saved.',
    } satisfies Record<LocalProblem, string>,
    generic: 'Something went wrong. The saved source and project remain unchanged.',
    creditsReturn: 'This video and saved section will be preserved when opening Credits.',
  },
  ru: {
    title: 'Новый дубляж',
    description: 'Выберите исходное видео, проверьте фрагмент и запросите точную стоимость обработки.',
    source: 'Исходное видео',
    chooseVideo: 'Выбрать видео',
    chooseAnother: 'Выбрать другое видео',
    validateAndSave: 'Проверить и сохранить черновик',
    replaceVideo: 'Заменить видео',
    supported: 'MP4, MOV или WebM · до 10 минут · до 250 МБ',
    localFile: 'Выбранный файл',
    localCheck: 'Локальные проверки пройдены. Сервис имитации ещё должен принять и сохранить этот источник.',
    uploadBusy: 'Сохраняем и проверяем источник…',
    sourceSaved: 'Проверенный черновик сохранён в этом сценарии имитации.',
    capacityLoading: 'Проверяем места для проектов…',
    capacity: (used: number, total: number) => `Использовано мест: ${used} из ${total}`,
    capacityFull: 'Свободных мест нет. Откройте проекты или вернитесь после изменения лимита.',
    manageProjects: 'Управление проектами',
    refreshCapacity: 'Обновить лимит',
    capacityUpgrade: 'После первой подтверждённой покупки лимит увеличивается с 2 до 10 проектов. Ожидающая покупка лимит не меняет.',
    loadingDraft: 'Загружаем сохранённый черновик…',
    draftUnavailable: 'Не удалось загрузить сохранённый проект или его источник. Повторите проверку проекта в аккаунте.',
    retry: 'Повторить',
    titleLabel: 'Название проекта',
    durationLabel: 'Проверенная длительность',
    sourceValidated: 'Сохранённый источник',
    preview: 'Предпросмотр видео',
    previewUnavailable: 'Браузер не смог воспроизвести сохранённый источник. Источник сохранён; проверьте, доступен ли предпросмотр именно этого сценария имитации.',
    inspectPreview: 'Проверить доступность предпросмотра',
    previewChecking: 'Проверяем доступность предпросмотра…',
    previewUnavailableForSource: 'Для этого источника в сценарии имитации нет совместимого предпросмотра. Сохранённый источник не изменён.',
    requestPreview: 'Подготовить предпросмотр',
    previewPending: 'Предпросмотр готовится. Обработка и списание кредитов не запускались.',
    checkPreview: 'Проверить состояние предпросмотра',
    previewReady: 'Синтетическая имитация совместимого предпросмотра. Идентификатор исходника, сцена, длительность и временная шкала остаются исходными.',
    previewFailed: 'Не удалось подготовить предпросмотр сохранённого источника. Повторите тот же сценарий или вернитесь позже.',
    retryPreview: 'Повторить предпросмотр',
    previewLoading: 'Обновляем предпросмотр…',
    previewMediaFailed: 'Браузер не смог открыть медиа предпросмотра. Это не доказывает отсутствие аудио в источнике.',
    sourceDetails: (duration: string, width: number, height: number) => `${duration} · ${width} × ${height}`,
    selection: 'Выбранный фрагмент',
    sectionHelp: 'Выберите один непрерывный фрагмент сохранённого источника. Только он поступит в обработку.',
    start: 'Начало (секунды)',
    end: 'Конец (секунды)',
    rangeStart: 'Начало фрагмента',
    rangeEnd: 'Конец фрагмента',
    selectedDuration: (duration: string) => `Длительность фрагмента: ${duration} с`,
    saveSelection: 'Сохранить фрагмент',
    selectionSaved: 'Фрагмент сохранён. Перед обработкой запросите новую точную стоимость.',
    selectionLocked: 'Фрагмент нельзя изменить, пока подготовка активна или уже сохранена запись.',
    selectionInvalid: 'Выберите фрагмент в пределах источника длиной от 1.000 до 120.000 секунд с точностью 0.001 секунды. Границы не перемещались автоматически.',
    selectionUnsaved: 'Сохраните фрагмент, чтобы обновить стоимость для этого источника.',
    selectionBlocked: 'Выбранный источник короче 1 секунды; правило продукта не решено. Проект не создан.',
    quote: 'Стоимость обработки',
    requestQuote: 'Запросить точную стоимость',
    refreshQuote: 'Обновить точную стоимость',
    quoteLoading: 'Запрашиваем актуальную стоимость…',
    quoteFailed: 'Не удалось загрузить стоимость. Источник и сохранённый фрагмент не изменились.',
    quoteCredits: 'Кредиты за этот фрагмент',
    attempt: 'Тип обработки',
    attemptInitial: 'Первая обработка',
    attemptIncludedRetry: 'Включённый повтор — без дополнительных кредитов',
    attemptPaidReprocessing: 'Повторная обработка по указанной стоимости',
    available: 'Доступно после резервов',
    reserved: 'В обработке',
    quotePrompt: 'Запросите точную стоимость обработки для сохранённого фрагмента.',
    quoteStale: 'Стоимость истекла или больше не соответствует источнику и фрагменту. Запросите новую.',
    insufficient: 'Доступного баланса меньше, чем требуется. Обработка не запускалась.',
    draftLossWarning: (count: number) => `Пригодная замена удалит сохранённые непринятые черновики (${count}) только при активации. До активации текущая подготовка и черновики останутся доступны.`,
    draftLossConfirm: 'Подтверждаю: сохранённые черновики удалятся только при активации замены.',
    credits: 'Открыть кредиты',
    startProcessing: (credits: number) => `Обработать за ${credits} кредитов`,
    starting: 'Подтверждаем запуск обработки…',
    processingStarted: 'Обработка принята. Открываем её состояние.',
    openProcessing: 'Открыть состояние обработки',
    commandUnknown: 'Результат сервиса не подтверждён. Проверьте операцию перед следующим действием.',
    checkStatus: 'Проверить состояние операции',
    operationPending: 'Операция ещё выполняется. Проверьте её снова перед следующим действием.',
    operationNotStarted: 'Сервис подтвердил, что операция не запускалась. Тот же запрос можно безопасно повторить.',
    chooseSameFile: 'Выберите тот же локальный файл, чтобы повторить загрузку.',
    retryUpload: 'Повторить ту же загрузку',
    storageUnavailable: 'Браузер не смог сохранить идентификатор операции. Действие не отправлено.',
    localError: {
      unsupported: 'Выберите видео MP4, MOV или WebM.',
      'too-large': 'Файл больше лимита 250 МБ.',
      'audio-missing': 'В этом видео нет аудио — выберите другой файл.',
      'audio-unknown': 'По доступным локальным данным нельзя подтвердить наличие аудиодорожки. Файл не сохранён.',
      metadata: 'Не удалось определить длительность видео по данным браузера или поддерживаемого контейнера.',
      'too-short': 'Это видео короче 1 секунды. Выберите видео длительностью не менее 1 секунды.',
      'too-long': 'Видео длиннее лимита 10 минут.',
      dimensions: 'Не удалось определить размеры видео. Файл не сохранён.',
    } satisfies Record<LocalProblem, string>,
    generic: 'Произошла ошибка. Сохранённый источник и проект не изменены.',
    creditsReturn: 'При переходе к кредитам видео и сохранённый фрагмент останутся в проекте.',
  },
} as const

function projectStorageKey(accountId: string) {
  return `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`
}

function commandStorageKey(accountId: string) {
  return `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-dub-command`
}

function returnStorageKey(accountId: string) {
  return `dubbed.workspace.v1.${encodeURIComponent(accountId)}.return-context`
}

function randomOperationId(): OperationId {
  return ids.operation(crypto.randomUUID())
}

function safeOperationId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)
}

function readActiveProject(accountId: string): ProjectId | null {
  try {
    const raw = sessionStorage.getItem(projectStorageKey(accountId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { accountId?: unknown; projectId?: unknown }
    if (parsed.accountId !== accountId || typeof parsed.projectId !== 'string') return null
    return parseProjectId(parsed.projectId)
  } catch {
    return null
  }
}

function saveActiveProject(accountId: string, projectId: ProjectId): boolean {
  try {
    sessionStorage.setItem(projectStorageKey(accountId), JSON.stringify({ accountId, projectId }))
    return true
  } catch {
    return false
  }
}

function readPendingCommand(accountId: string): PendingCommand | null {
  try {
    const raw = sessionStorage.getItem(commandStorageKey(accountId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PendingCommand>
    const kinds: PendingCommandKind[] = [
      'upload-initial', 'upload-replace', 'selection', 'quote', 'start',
      'preview-request', 'preview-retry', 'return-context',
    ]
    if (parsed.accountId !== accountId || !safeOperationId(parsed.operationId) || !kinds.includes(parsed.kind as PendingCommandKind)) return null
    return { ...parsed, operationId: ids.operation(parsed.operationId) } as PendingCommand
  } catch {
    return null
  }
}

function problemCode<T>(result: ServiceResult<T>): ServiceProblemCode | null {
  if (result.status === 'error') return result.error.code
  if (result.status === 'conflict') return result.code
  if (result.status === 'unknown') return 'unknown-operation'
  return null
}

function parseSeconds(value: string): number | null {
  const match = value.trim().match(/^(\d+)(?:\.(\d{0,3}))?$/)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(3, '0'))
  const milliseconds = whole * 1000 + fraction
  return Number.isSafeInteger(milliseconds) ? milliseconds : null
}

function formatSeconds(milliseconds: number) {
  return (milliseconds / 1000).toFixed(3)
}

function durationText(milliseconds: number) {
  return (milliseconds / 1000).toFixed(3)
}

function supportedVideo(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm'].includes(extension ?? '') || ['video/mp4', 'video/quicktime', 'video/webm'].includes(file.type.toLowerCase())
}

function validateLocalSource(file: File, probe: LocalSourceProbe): { facts?: UploadFacts; problem?: LocalProblem } {
  if (!supportedVideo(file) || file.size <= 0) return { problem: 'unsupported' }
  if (file.size > maximumBytes) return { problem: 'too-large' }
  if (probe.hasAudio === false) return { problem: 'audio-missing' }
  if (probe.hasAudio !== true) return { problem: 'audio-unknown' }
  if (probe.durationMs === null || !Number.isFinite(probe.durationMs)) return { problem: 'metadata' }
  const durationMs = Math.floor(probe.durationMs)
  if (durationMs < minimumSelectionMs) return { problem: 'too-short' }
  if (durationMs > maximumDurationMs) return { problem: 'too-long' }

  const knownFixture = probe.fixtureKey === 'source'
    && probe.fixtureSha256 === MEDIA_FIXTURE_MANIFEST.assets.source.sha256
  const width = probe.width ?? (knownFixture ? MEDIA_FIXTURE_MANIFEST.assets.source.canvasWidth : null)
  const height = probe.height ?? (knownFixture ? MEDIA_FIXTURE_MANIFEST.assets.source.canvasHeight : null)
  if (!width || !height || width <= 0 || height <= 0) return { problem: 'dimensions' }
  return { facts: { durationMs, width, height, hasAudio: true } }
}

function commandMatchesFile(command: PendingCommand, file: File) {
  return command.fileName === file.name && command.fileSize === file.size && command.lastModified === file.lastModified
}

function writeReturnContext(accountId: string, returnContextId: OperationId) {
  try {
    sessionStorage.setItem(returnStorageKey(accountId), returnContextId)
    return true
  } catch {
    return false
  }
}

export function NewDubScreen({
  identity,
  locale,
  services,
  navigate,
  registerRouteExitGuard,
  previewScenario,
}: Props) {
  const text = copy[locale]
  const account = identity.status === 'signed-in' ? identity.account : null
  const [credit, setCredit] = useState<CreditSnapshot | null>(null)
  const [capacityError, setCapacityError] = useState<ServiceProblemCode | null>(null)
  const [capacityBusy, setCapacityBusy] = useState(false)
  const [project, setProject] = useState<OwnedProject | null>(null)
  const projectRef = useRef<OwnedProject | null>(null)
  projectRef.current = project
  const [source, setSource] = useState<SourceBundle | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [projectBusy, setProjectBusy] = useState(true)
  const [projectLoadError, setProjectLoadError] = useState<ServiceProblemCode | null>(null)
  const [candidate, setCandidate] = useState<SourceCandidate | null>(null)
  const [localProblem, setLocalProblem] = useState<LocalProblem | null>(null)
  const [selectionDraft, setSelectionDraft] = useState({ start: '0.000', end: '0.000' })
  const [selectionProblem, setSelectionProblem] = useState(false)
  const [quote, setQuote] = useState<ProcessingQuote | null>(null)
  const [draftLossConfirmed, setDraftLossConfirmed] = useState(false)
  const [quoteError, setQuoteError] = useState<ServiceProblemCode | null>(null)
  const [actionError, setActionError] = useState<ServiceProblemCode | null>(null)
  const [localNotice, setLocalNotice] = useState<'saved' | 'selection-saved' | null>(null)
  const [previewInspection, setPreviewInspection] = useState<PreviewInspection | null>(null)
  const [preview, setPreview] = useState<CompatiblePreviewSnapshot | null>(null)
  const [previewMediaFailed, setPreviewMediaFailed] = useState(false)
  const [directMediaReady, setDirectMediaReady] = useState(false)
  const [previewMediaReady, setPreviewMediaReady] = useState(false)
  const [busy, setBusy] = useState<BusyAction | null>(null)
  const [processingCommittedProjectId, setProcessingCommittedProjectId] = useState<ProjectId | null>(null)
  const processingDestinationRef = useRef<ProjectId | null>(null)
  const [pendingCommand, setPendingCommand] = useState<PendingCommand | null>(null)
  const pendingCommandRef = useRef<PendingCommand | null>(null)
  const [safeToRetrySameId, setSafeToRetrySameId] = useState(false)
  const [storageFailed, setStorageFailed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const activeRef = useRef(false)

  const setCommand = useCallback((command: PendingCommand): boolean => {
    if (!account) return false
    try {
      sessionStorage.setItem(commandStorageKey(account.id), JSON.stringify(command))
    } catch {
      setStorageFailed(true)
      return false
    }
    pendingCommandRef.current = command
    setPendingCommand(command)
    setSafeToRetrySameId(false)
    return true
  }, [account])

  const clearCommand = useCallback(() => {
    if (account) {
      try {
        sessionStorage.removeItem(commandStorageKey(account.id))
      } catch {
        setStorageFailed(true)
      }
    }
    pendingCommandRef.current = null
    setPendingCommand(null)
    setSafeToRetrySameId(false)
  }, [account])

  const refreshCapacity = useCallback(async () => {
    if (!account) return false
    setCapacityBusy(true)
    setCapacityError(null)
    const result = await services.credits.snapshot()
    setCapacityBusy(false)
    if (result.status !== 'ok') {
      setCredit(null)
      setCapacityError(problemCode(result))
      return false
    }
    setCredit(result.data)
    return true
  }, [account, services.credits])

  const storeProject = useCallback((next: OwnedProject, nextSource: SourceBundle | null) => {
    projectRef.current = next
    setProject(next)
    setSource(nextSource)
    setSelectionDraft({ start: formatSeconds(next.selection.startMs), end: formatSeconds(next.selection.endMs) })
    setSelectionProblem(false)
    setQuote(null)
    setQuoteError(null)
    setPreview(null)
    setPreviewInspection(null)
    setPreviewMediaFailed(false)
    setDirectMediaReady(false)
    setPreviewMediaReady(false)
    setLocalNotice(null)
    if (account && !saveActiveProject(account.id, next.id)) setStorageFailed(true)
  }, [account])

  const loadProject = useCallback(async (projectId: ProjectId) => {
    if (!account) return false
    setProjectLoadError(null)
    const [projectResult, sourceResult] = await Promise.all([
      services.projects.open(projectId),
      services.uploads.getSource(projectId),
    ])
    if (projectResult.status !== 'ok') {
      setProjectLoadError(problemCode(projectResult))
      return false
    }
    if (projectResult.data.accountId !== account.id) {
      setProjectLoadError('not-found')
      return false
    }
    if (projectResult.data.state !== 'uploaded') {
      const route = projectResult.data.state === 'recording'
        ? routes.project(projectId, 'record')
        : projectResult.data.state === 'ready' || projectResult.data.state === 'assembling'
          ? routes.project(projectId, 'result')
          : routes.project(projectId, 'processing')
      await navigate(route, { replace: true })
      return true
    }
    if (sourceResult.status !== 'ok') {
      projectRef.current = projectResult.data
      setProject(projectResult.data)
      setSource(null)
      setProjectLoadError(problemCode(sourceResult))
      if (!saveActiveProject(account.id, projectResult.data.id)) setStorageFailed(true)
      return false
    }
    storeProject(projectResult.data, sourceResult.data)
    return true
  }, [account, navigate, services.projects, services.uploads, storeProject])

  useEffect(() => {
    if (!account) {
      setProjectBusy(false)
      return
    }
    activeRef.current = true
    setProjectBusy(true)
    setProjectLoadError(null)
    setCredit(null)
    setProject(null)
    projectRef.current = null
    setSource(null)
    setQuote(null)
    setPreview(null)
    const storedCommand = readPendingCommand(account.id)
    pendingCommandRef.current = storedCommand
    setPendingCommand(storedCommand)
    setSafeToRetrySameId(false)

    void (async () => {
      const [creditResult, activeProjectId] = await Promise.all([
        services.credits.snapshot(),
        Promise.resolve(readActiveProject(account.id)),
      ])
      if (!activeRef.current) return
      if (creditResult.status === 'ok') setCredit(creditResult.data)
      else setCapacityError(problemCode(creditResult))
      if (activeProjectId) await loadProject(activeProjectId)
      if (activeRef.current) setProjectBusy(false)
    })()
    return () => {
      activeRef.current = false
    }
  }, [account, loadProject, services.credits])

  useEffect(() => {
    if (!source?.blob || typeof URL.createObjectURL !== 'function') {
      setSourceUrl(null)
      return
    }
    const url = URL.createObjectURL(source.blob)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source])

  const previewReady = preview?.state === 'ready' && !!preview.descriptor
  const mediaUrl = previewReady ? preview.descriptor?.video.url ?? null : sourceUrl
  const mediaReady = previewReady ? previewMediaReady : directMediaReady
  const sourceEndMs = source ? Math.floor(source.facts.durationMs) : 0
  const startMs = parseSeconds(selectionDraft.start)
  const endMs = parseSeconds(selectionDraft.end)
  const validSelection = !!project && startMs !== null && endMs !== null
    && startMs >= 0
    && endMs <= sourceEndMs
    && endMs - startMs >= minimumSelectionMs
    && endMs - startMs <= maximumSelectionMs
  const selectionDirty = !!project && startMs !== null && endMs !== null
    && (startMs !== project.selection.startMs || endMs !== project.selection.endMs)
  const selectionLocked = !!project && (project.state === 'preparing' || project.preparationId !== undefined)
  const quoteMatches = !!quote && !!project && quote.projectId === project.id
    && quote.projectRevision === project.revision
    && quote.sourceId === project.sourceId
    && quote.sourceRevision === project.sourceRevision
    && quote.selectionRevision === project.selection.revision
    && quote.activePreparationId === project.preparationId
    && quote.activePreparationRevision === project.preparationRevision
    && startMs === project.selection.startMs
    && endMs === project.selection.endMs
    && quote.durationMs === project.selection.endMs - project.selection.startMs
    && quote.expiresAt > Date.now()
  const canReplace = project?.state === 'uploaded' && !project.preparationId && project.firstAiLaunchAt === undefined
  const capacity = credit?.projectCapacity ?? null
  const hasCapacity = !!capacity && capacity.used < capacity.total
  const capacityKnown = !!capacity

  const handleSelectedFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setBusy('probing')
    setCandidate(null)
    setLocalProblem(null)
    setActionError(null)
    setLocalNotice(null)
    try {
      const probe = await probeLocalSource(file)
      const validation = validateLocalSource(file, probe)
      setCandidate({ file, probe, ...validation })
      setLocalProblem(validation.problem ?? null)
    } catch {
      setCandidate(null)
      setLocalProblem('metadata')
    } finally {
      setBusy(null)
    }
  }, [])

  const applyUploadedProject = useCallback(async (uploaded: { project: OwnedProject; source: SourceFacts }) => {
    if (account && !saveActiveProject(account.id, uploaded.project.id)) setStorageFailed(true)
    clearCommand()
    setQuote(null)
    setCandidate(null)
    setLocalProblem(null)
    setBusy('loading')
    const loaded = await loadProject(uploaded.project.id)
    setBusy(null)
    if (loaded) setLocalNotice('saved')
    else setProjectLoadError((current) => current ?? 'unexpected')
    await refreshCapacity()
  }, [account, clearCommand, loadProject, refreshCapacity])

  const runUpload = useCallback(async (command: PendingCommand, selected: SourceCandidate) => {
    if (!account || !selected.facts || selected.problem) return
    if (command.kind === 'upload-initial' && !capacity) {
      setCapacityError('unexpected')
      return
    }
    if (!setCommand(command)) return
    setBusy('uploading')
    setActionError(null)
    let result: ServiceResult<{ project: OwnedProject; source: SourceFacts }>
    if (command.kind === 'upload-replace' && command.projectId && command.expectedProjectRevision !== undefined) {
      result = await services.uploads.replaceSource({
        projectId: command.projectId,
        file: selected.file,
        facts: selected.facts,
        expectedProjectRevision: command.expectedProjectRevision,
        operationId: command.operationId,
      })
    } else {
      result = await services.uploads.commitInitial({
        file: selected.file,
        facts: selected.facts,
        operationId: command.operationId,
      })
    }
    setBusy(null)
    if (result.status === 'ok') {
      await applyUploadedProject(result.data)
      return
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return
    }
    clearCommand()
    setActionError(problemCode(result))
    if (result.status === 'error' && result.error.code === 'capacity-reached') await refreshCapacity()
  }, [account, applyUploadedProject, capacity, clearCommand, refreshCapacity, services.uploads, setCommand])

  const beginUpload = useCallback(async () => {
    if (!account || !candidate?.facts || candidate.problem || busy || pendingCommandRef.current) return
    if (!project && (!capacity || capacity.used >= capacity.total)) return
    let command: PendingCommand
    const pending = pendingCommandRef.current as PendingCommand | null
    if (safeToRetrySameId && pending?.kind.startsWith('upload-')) {
      const prior = pending
      if (!commandMatchesFile(prior, candidate.file)) {
        clearCommand()
        setSafeToRetrySameId(false)
        command = {
          accountId: account.id,
          operationId: randomOperationId(),
          kind: project ? 'upload-replace' : 'upload-initial',
          projectId: project?.id,
          fileName: candidate.file.name,
          fileSize: candidate.file.size,
          lastModified: candidate.file.lastModified,
          facts: candidate.facts,
          expectedProjectRevision: project?.revision,
        }
      } else {
        command = { ...prior, facts: candidate.facts }
      }
    } else {
      command = {
        accountId: account.id,
        operationId: randomOperationId(),
        kind: project ? 'upload-replace' : 'upload-initial',
        projectId: project?.id,
        fileName: candidate.file.name,
        fileSize: candidate.file.size,
        lastModified: candidate.file.lastModified,
        facts: candidate.facts,
        expectedProjectRevision: project?.revision,
      }
    }
    await runUpload(command, candidate)
  }, [account, busy, candidate, capacity, clearCommand, project, runUpload, safeToRetrySameId])

  const applySelection = useCallback((updated: OwnedProject) => {
    projectRef.current = updated
    setProject(updated)
    setSelectionDraft({ start: formatSeconds(updated.selection.startMs), end: formatSeconds(updated.selection.endMs) })
    setQuote(null)
    setQuoteError(null)
    setSelectionProblem(false)
    setLocalNotice('selection-saved')
    clearCommand()
  }, [clearCommand])

  const saveSelection = useCallback(async (): Promise<OwnedProject | null> => {
    const current = projectRef.current
    if (!current || !source || busy || pendingCommandRef.current) return null
    const nextStartMs = parseSeconds(selectionDraft.start)
    const nextEndMs = parseSeconds(selectionDraft.end)
    const valid = nextStartMs !== null && nextEndMs !== null
      && nextStartMs >= 0 && nextEndMs <= Math.floor(source.facts.durationMs)
      && nextEndMs - nextStartMs >= minimumSelectionMs
      && nextEndMs - nextStartMs <= maximumSelectionMs
    if (!valid || nextStartMs === null || nextEndMs === null) {
      setSelectionProblem(true)
      return null
    }
    if (nextStartMs === current.selection.startMs && nextEndMs === current.selection.endMs) return current

    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'selection'
      && prior.projectId === current.id && prior.startMs === nextStartMs && prior.endMs === nextEndMs
      ? prior
      : {
          accountId: account?.id ?? current.accountId,
          operationId: randomOperationId(),
          kind: 'selection',
          projectId: current.id,
          expectedProjectRevision: current.revision,
          expectedSourceRevision: current.sourceRevision,
          startMs: nextStartMs,
          endMs: nextEndMs,
        }
    if (!setCommand(command)) return null
    setBusy('selection')
    setActionError(null)
    const result = await services.preparation.updateSelection({
      projectId: current.id,
      startMs: nextStartMs,
      endMs: nextEndMs,
      expectedProjectRevision: current.revision,
      expectedSourceRevision: current.sourceRevision,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      applySelection(result.data)
      return result.data
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return null
    }
    clearCommand()
    setActionError(problemCode(result))
    return null
  }, [account, applySelection, busy, clearCommand, safeToRetrySameId, selectionDraft.end, selectionDraft.start, services.preparation, setCommand, source])

  const getQuote = useCallback(async () => {
    const current = projectRef.current
    if (processingDestinationRef.current || !current || !source || busy || pendingCommandRef.current || !mediaReady) return
    const savedProject = await saveSelection()
    if (!savedProject) return
    if (savedProject.selection.startMs !== parseSeconds(selectionDraft.start)
      || savedProject.selection.endMs !== parseSeconds(selectionDraft.end)) return

    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'quote'
      && prior.projectId === savedProject.id && prior.expectedProjectRevision === savedProject.revision
      ? prior
      : {
          accountId: account?.id ?? savedProject.accountId,
          operationId: randomOperationId(),
          kind: 'quote',
          projectId: savedProject.id,
          expectedProjectRevision: savedProject.revision,
        }
    if (!setCommand(command)) return
    setBusy('quote')
    setQuoteError(null)
    setActionError(null)
    setDraftLossConfirmed(false)
    const result = await services.preparation.quote({
      projectId: savedProject.id,
      expectedProjectRevision: savedProject.revision,
      expectedActivePreparationId: savedProject.preparationId,
      expectedActivePreparationRevision: savedProject.preparationRevision,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      setQuote(result.data)
      setDraftLossConfirmed(false)
      setCredit((currentCredit) => currentCredit ? {
        ...currentCredit,
        available: result.data.available,
        reserved: result.data.reserved,
        revision: result.data.creditRevision,
      } : currentCredit)
      clearCommand()
      return
    }
    if (result.status === 'unknown') {
      setQuoteError('unknown-operation')
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return
    }
    clearCommand()
    setQuoteError(problemCode(result))
  }, [account, busy, clearCommand, mediaReady, safeToRetrySameId, saveSelection, selectionDraft.end, selectionDraft.start, services.preparation, setCommand, source])

  const navigateToProcessing = useCallback(async (result: ProcessingStartSnapshot) => {
    processingDestinationRef.current = result.projectId
    setProcessingCommittedProjectId(result.projectId)
    setQuote(null)
    setQuoteError(null)
    if (account) saveActiveProject(account.id, result.projectId)
    clearCommand()
    setBusy(null)
    setLocalNotice(null)
    setActionError(null)
    await navigate(routes.project(result.projectId, 'processing'))
  }, [account, clearCommand, navigate])

  const startProcessing = useCallback(async () => {
    const current = projectRef.current
    if (processingDestinationRef.current || !current || !quoteMatches || !quote || busy || pendingCommandRef.current || selectionDirty || !validSelection || !mediaReady) {
      return
    }
    if (quote.available < quote.credits) return
    if (quote.draftIdsToDeleteOnActivation.length > 0 && !draftLossConfirmed) return
    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'start'
      && prior.projectId === current.id && prior.quoteId === quote.id
      && prior.expectedProjectRevision === current.revision && prior.expectedSourceRevision === current.sourceRevision
      ? prior
      : {
          accountId: account?.id ?? current.accountId,
          operationId: randomOperationId(),
          kind: 'start',
          projectId: current.id,
          quoteId: quote.id,
          expectedProjectRevision: current.revision,
          expectedSourceRevision: current.sourceRevision,
        }
    if (!setCommand(command)) return
    setBusy('starting')
    setActionError(null)
    const result = await services.preparation.start({
      quoteId: quote.id,
      expectedProjectRevision: current.revision,
      expectedSourceRevision: current.sourceRevision,
      expectedActivePreparationId: current.preparationId,
      expectedActivePreparationRevision: current.preparationRevision,
      acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: quote.activePreparationId !== undefined,
      draftLossAcknowledged: quote.draftIdsToDeleteOnActivation.length === 0 || draftLossConfirmed,
      explicitAuthorization: true,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      notifyCreditsMayHaveChanged()
      await navigateToProcessing(result.data)
      return
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return
    }
    clearCommand()
    setQuote(null)
    setActionError(problemCode(result))
    await refreshCapacity()
  }, [account, busy, clearCommand, draftLossConfirmed, mediaReady, navigateToProcessing, quote, quoteMatches, refreshCapacity, safeToRetrySameId, selectionDirty, services.preparation, setCommand, validSelection])

  const inspectCompatiblePreview = useCallback(async () => {
    const current = projectRef.current
    if (!current || busy || pendingCommandRef.current) return
    setBusy('preview')
    setActionError(null)
    const result = await services.previews.inspect({ projectId: current.id })
    setBusy(null)
    if (result.status === 'ok') {
      setPreviewInspection(result.data)
      return result.data
    }
    setActionError(problemCode(result))
    return null
  }, [busy, services.previews])

  const applyPreviewResult = useCallback((result: CompatiblePreviewSnapshot) => {
    setPreview(result)
    setPreviewMediaReady(false)
    setPreviewMediaFailed(false)
    setQuote(null)
    clearCommand()
  }, [clearCommand])

  const requestCompatiblePreview = useCallback(async () => {
    const current = projectRef.current
    if (!current || !previewInspection || previewInspection.eligibility !== 'supported-fixture' || busy || pendingCommandRef.current) return
    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'preview-request'
      && prior.projectId === current.id ? prior
      : {
          accountId: account?.id ?? current.accountId,
          operationId: randomOperationId(),
          kind: 'preview-request',
          projectId: current.id,
          expectedProjectRevision: current.revision,
          expectedSourceRevision: current.sourceRevision,
        }
    if (!setCommand(command)) return
    setBusy('preview')
    const result = await services.previews.request({
      projectId: current.id,
      expectedProjectRevision: current.revision,
      expectedSourceRevision: current.sourceRevision,
      scenario: previewScenario,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      applyPreviewResult(result.data)
      return
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return
    }
    clearCommand()
    setActionError(problemCode(result))
  }, [account, applyPreviewResult, busy, clearCommand, previewInspection, previewScenario, safeToRetrySameId, services.previews, setCommand])

  const observePreview = useCallback(async () => {
    const current = projectRef.current
    if (!current || !preview || busy || preview.state !== 'pending') return
    setBusy('preview')
    const result = await services.previews.observe({
      projectId: current.id,
      sourceId: current.sourceId,
      sourceRevision: current.sourceRevision,
      targetOperationId: preview.id,
    })
    setBusy(null)
    if (result.status === 'ok') {
      setPreview(result.data)
      setPreviewMediaReady(false)
      setQuote(null)
    } else {
      setActionError(problemCode(result))
    }
  }, [busy, preview, services.previews])

  const retryPreview = useCallback(async () => {
    const current = projectRef.current
    if (!current || !preview || preview.state !== 'error' || !preview.error?.retryable || busy || pendingCommandRef.current) return
    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'preview-retry'
      && prior.projectId === current.id && prior.priorOperationId === preview.id
      ? prior
      : {
          accountId: account?.id ?? current.accountId,
          operationId: randomOperationId(),
          kind: 'preview-retry',
          projectId: current.id,
          expectedProjectRevision: current.revision,
          expectedSourceRevision: current.sourceRevision,
          priorOperationId: preview.id,
        }
    if (!setCommand(command)) return
    setBusy('preview')
    const result = await services.previews.retry({
      projectId: current.id,
      sourceId: current.sourceId,
      sourceRevision: current.sourceRevision,
      priorOperationId: preview.id,
      expectedProjectRevision: current.revision,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      applyPreviewResult(result.data)
      return
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return
    }
    clearCommand()
    setActionError(problemCode(result))
  }, [account, applyPreviewResult, busy, clearCommand, preview, safeToRetrySameId, services.previews, setCommand])

  const createCreditsReturn = useCallback(async (current: OwnedProject) => {
    if (!account) return false
    const currentQuote = quoteMatches ? quote : null
    const prior = pendingCommandRef.current as PendingCommand | null
    const command: PendingCommand = safeToRetrySameId && prior?.kind === 'return-context'
      && prior.projectId === current.id
      ? prior
      : {
          accountId: account.id,
          operationId: randomOperationId(),
          kind: 'return-context',
          projectId: current.id,
          sourceId: current.sourceId,
          selection: current.selection,
          quoteId: currentQuote?.id,
        }
    if (!setCommand(command)) return false
    setBusy('return')
    const result = await services.credits.createReturnContext({
      projectId: current.id,
      sourceId: current.sourceId,
      selection: current.selection,
      quoteId: currentQuote?.id,
      operationId: command.operationId,
    })
    setBusy(null)
    if (result.status === 'ok') {
      const saved = writeReturnContext(account.id, result.data.returnContextId)
      clearCommand()
      if (!saved) setStorageFailed(true)
      return saved
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      setSafeToRetrySameId(false)
      return false
    }
    clearCommand()
    setActionError(problemCode(result))
    return false
  }, [account, clearCommand, quote, quoteMatches, safeToRetrySameId, services.credits, setCommand])

  const saveCurrentSelection = useCallback(async () => {
    const current = projectRef.current
    if (!current) return true
    if (pendingCommandRef.current || busy) return false
    const saved = await saveSelection()
    return !!saved
  }, [busy, saveSelection])

  useEffect(() => {
    if (!project || !source) return
    const guard = async ({ to }: RouteExitRequest) => {
      const committedProjectId = processingDestinationRef.current
      if (committedProjectId) {
        return to.kind === 'project' && to.projectId === committedProjectId && to.screen === 'processing'
      }
      if (!await saveCurrentSelection()) return false
      if (to.kind === 'credits') {
        const latest = projectRef.current
        if (!latest || !await createCreditsReturn(latest)) return false
      }
      return true
    }
    return registerRouteExitGuard(guard)
  }, [createCreditsReturn, project, registerRouteExitGuard, saveCurrentSelection, source])

  const startAt = useCallback((next: number) => {
    const end = parseSeconds(selectionDraft.end)
    if (end === null || next < 0 || next > sourceEndMs || end - next < minimumSelectionMs || end - next > maximumSelectionMs) {
      setSelectionProblem(true)
      return
    }
    setSelectionDraft((current) => ({ ...current, start: formatSeconds(next) }))
    setSelectionProblem(false)
    setQuote(null)
  }, [selectionDraft.end, sourceEndMs])

  const endAt = useCallback((next: number) => {
    const start = parseSeconds(selectionDraft.start)
    if (start === null || next < 0 || next > sourceEndMs || next - start < minimumSelectionMs || next - start > maximumSelectionMs) {
      setSelectionProblem(true)
      return
    }
    setSelectionDraft((current) => ({ ...current, end: formatSeconds(next) }))
    setSelectionProblem(false)
    setQuote(null)
  }, [selectionDraft.start, sourceEndMs])

  const resolvePendingCommand = useCallback(async () => {
    const command = pendingCommandRef.current
    if (!command || busy || !account) return
    setBusy('checking')
    setActionError(null)
    const result = await services.operations.resolve(command.operationId)
    setBusy(null)
    if (result.status !== 'ok') {
      setActionError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('safeToRetrySameId' in result.data) {
      setSafeToRetrySameId(true)
      setActionError(null)
      if (command.kind === 'start') {
        clearCommand()
        setQuote(null)
        setActionError('unknown-operation')
        return
      }
      if (command.kind === 'upload-initial' || command.kind === 'upload-replace') {
        if (!candidate || !candidate.facts || !commandMatchesFile(command, candidate.file)) return
        await runUpload(command, candidate)
        return
      }
      if (command.kind === 'selection' && command.projectId && command.startMs !== undefined && command.endMs !== undefined) {
        const current = projectRef.current
        if (!current || current.id !== command.projectId) return
        await saveSelection()
        return
      }
      if (command.kind === 'quote' && command.projectId) {
        await getQuote()
        return
      }
      if (command.kind === 'preview-request' && previewInspection) {
        await requestCompatiblePreview()
        return
      }
      if (command.kind === 'preview-retry') {
        await retryPreview()
        return
      }
      if (command.kind === 'return-context') {
        const current = projectRef.current
        if (current) await createCreditsReturn(current)
      }
      return
    }
    const snapshot = result.data as OperationSnapshot<unknown>
    if (snapshot.state === 'pending') {
      setSafeToRetrySameId(false)
      setActionError('unknown-operation')
      return
    }
    if (snapshot.state === 'rejected') {
      clearCommand()
      setActionError(snapshot.error?.code ?? 'unexpected')
      return
    }
    const resolved = snapshot.result
    switch (command.kind) {
      case 'upload-initial':
      case 'upload-replace':
        if (resolved && typeof resolved === 'object' && 'project' in resolved && 'source' in resolved) {
          await applyUploadedProject(resolved as { project: OwnedProject; source: SourceFacts })
        }
        break
      case 'selection':
        if (resolved && typeof resolved === 'object' && 'selection' in resolved) applySelection(resolved as OwnedProject)
        break
      case 'quote':
        if (resolved && typeof resolved === 'object' && 'credits' in resolved && 'quoteId' in resolved === false && 'id' in resolved) {
          setQuote(resolved as ProcessingQuote)
          setDraftLossConfirmed(false)
          clearCommand()
          setQuoteError(null)
        }
        break
      case 'start':
        if (resolved && typeof resolved === 'object' && 'reservationId' in resolved && 'projectId' in resolved) {
            notifyCreditsMayHaveChanged()
          await navigateToProcessing(resolved as ProcessingStartSnapshot)
        }
        break
      case 'preview-request':
      case 'preview-retry':
        if (resolved && typeof resolved === 'object' && 'sourceSha256' in resolved && 'descriptor' in resolved) {
          applyPreviewResult(resolved as CompatiblePreviewSnapshot)
        }
        break
      case 'return-context':
        if (resolved && typeof resolved === 'object' && 'returnContextId' in resolved
          && safeOperationId((resolved as { returnContextId: unknown }).returnContextId)) {
          writeReturnContext(account.id, ids.operation((resolved as { returnContextId: string }).returnContextId))
          clearCommand()
        }
        break
    }
  }, [account, applyPreviewResult, applySelection, applyUploadedProject, candidate, clearCommand, createCreditsReturn, getQuote, navigateToProcessing, previewInspection, requestCompatiblePreview, retryPreview, runUpload, safeToRetrySameId, saveSelection, services.operations, busy])

  const quoteCurrent = quoteMatches && quote !== null
  const attemptDisclosure = quote?.attemptClass === 'included-retry'
    ? text.attemptIncludedRetry
    : quote?.attemptClass === 'paid-reprocessing'
      ? text.attemptPaidReprocessing
      : text.attemptInitial
  const durationValue = startMs !== null && endMs !== null ? endMs - startMs : null

  return (
    <section className="new-dub-page" aria-labelledby="new-dub-title">
      <header className="new-dub-heading">
        <h1 id="new-dub-title">{text.title}</h1>
        <p>{text.description}</p>
      </header>

      {processingCommittedProjectId ? (
        <section className="new-dub-committed" aria-label={text.processingStarted}>
          <Notice tone="success" role="status">{text.processingStarted}</Notice>
          <Button onClick={() => void navigate(routes.project(processingCommittedProjectId, 'processing'))}>
            {text.openProcessing}
          </Button>
        </section>
      ) : (
      <>
      {projectBusy && <p className="new-dub-status" role="status">{text.loadingDraft}</p>}

      {(busy === 'loading' || busy === 'checking' || busy === 'probing' || busy === 'uploading' || busy === 'selection' || busy === 'quote' || busy === 'starting' || busy === 'preview' || busy === 'return') && (
        <p className="new-dub-status" role="status">
          {busy === 'probing' ? text.localFile
            : busy === 'uploading' ? text.uploadBusy
              : busy === 'selection' ? text.saveSelection
                : busy === 'quote' ? text.quoteLoading
                  : busy === 'starting' ? text.starting
                    : busy === 'preview' ? text.previewLoading
                      : busy === 'checking' ? text.commandUnknown
                        : text.loadingDraft}
        </p>
      )}

      {capacityError && (
        <div className="new-dub-error">
          <ServiceNotice code={capacityError} />
          <Button variant="secondary" onClick={() => void refreshCapacity()} disabled={capacityBusy}>{text.refreshCapacity}</Button>
        </div>
      )}
      {capacityBusy && !capacity && <p className="new-dub-status" role="status">{text.capacityLoading}</p>}
      {capacity && (
        <div className="new-dub-capacity">
          <p><span>{text.capacity(capacity.used, capacity.total)}</span>
            <button type="button" className="new-dub-text-button" onClick={() => void navigate(routes.projects())}>
              {text.manageProjects}<ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
            </button>
          </p>
          {capacity.used >= capacity.total && !project && <Notice tone="warning">{text.capacityFull}</Notice>}
          {capacity.firstPurchaseUpgrade && <p className="new-dub-muted">{text.capacityUpgrade}</p>}
        </div>
      )}

      {storageFailed && <Notice tone="error" role="alert">{text.storageUnavailable}</Notice>}
      {projectLoadError && (
        <div className="new-dub-error">
          <ServiceNotice code={projectLoadError} />
          <Button variant="secondary" onClick={() => project && void loadProject(project.id)} disabled={busy !== null}>{text.retry}</Button>
        </div>
      )}

      {pendingCommand && (
        <Notice tone="warning" className="new-dub-command" role="status">
          <p>{actionError === 'unknown-operation' ? text.commandUnknown : text.operationPending}</p>
          {(pendingCommand.kind === 'upload-initial' || pendingCommand.kind === 'upload-replace') && !candidate && <p>{text.chooseSameFile}</p>}
          {safeToRetrySameId && (pendingCommand.kind === 'upload-initial' || pendingCommand.kind === 'upload-replace') && candidate && commandMatchesFile(pendingCommand, candidate.file) && (
            <Button onClick={() => void beginUpload()} disabled={busy !== null || !candidate.facts}>{text.retryUpload}</Button>
          )}
          <Button variant="secondary" onClick={() => void resolvePendingCommand()} disabled={busy !== null}>{text.checkStatus}</Button>
        </Notice>
      )}
      {actionError && actionError !== 'unknown-operation' && <ServiceNotice code={actionError} />}
      {localNotice === 'saved' && <Notice tone="success">{text.sourceSaved}</Notice>}
      {localNotice === 'selection-saved' && <Notice tone="success">{text.selectionSaved}</Notice>}

      {!project && !projectBusy && (
        <section className="new-dub-source-picker" aria-labelledby="new-dub-source-title">
          <div className="new-dub-section-heading">
            <h2 id="new-dub-source-title">{text.source}</h2>
            <p>{text.supported}</p>
          </div>
          <input
            ref={fileInputRef}
            className="new-dub-file-input"
            type="file"
            accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
            aria-label={text.chooseVideo}
            disabled={!capacityKnown || !hasCapacity || busy !== null || !!pendingCommand}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              void handleSelectedFile(file)
            }}
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={!capacityKnown || !hasCapacity || busy !== null || !!pendingCommand}
          >
            {candidate ? text.chooseAnother : text.chooseVideo}
          </Button>
          {candidate && (
            <div className="new-dub-candidate" aria-live="polite">
              <p><strong>{text.localFile}:</strong> {candidate.file.name}</p>
              {candidate.facts && <p className="new-dub-muted">{text.localCheck}</p>}
              {candidate.problem && <Notice tone="error" role="alert">{text.localError[candidate.problem]}</Notice>}
              {!candidate.problem && candidate.facts && !pendingCommand && (
                <Button onClick={() => void beginUpload()} disabled={busy !== null || !hasCapacity}>
                  {text.validateAndSave}
                </Button>
              )}
              {safeToRetrySameId && pendingCommand && commandMatchesFile(pendingCommand, candidate.file) && candidate.facts && (
                <Button onClick={() => void beginUpload()} disabled={busy !== null}>{text.retryUpload}</Button>
              )}
            </div>
          )}
          {!candidate && localProblem && <Notice tone="error" role="alert">{text.localError[localProblem]}</Notice>}
        </section>
      )}

      {project && source && !projectBusy && (
        <>
          <section className="new-dub-saved-source" aria-labelledby="new-dub-saved-title">
            <div className="new-dub-saved-source__details">
              <div>
                <p className="new-dub-eyebrow">{text.sourceValidated}</p>
                <h2 id="new-dub-saved-title">{project.title}</h2>
                <p className="new-dub-muted">{source.facts.fileName}</p>
                <p className="new-dub-muted">{text.sourceDetails(durationText(source.facts.durationMs), source.facts.width ?? 0, source.facts.height ?? 0)}</p>
              </div>
              {canReplace && (
                <div className="new-dub-replace">
                  <input
                    ref={fileInputRef}
                    className="new-dub-file-input"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                    aria-label={text.replaceVideo}
                    disabled={busy !== null || !!pendingCommand}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      event.currentTarget.value = ''
                      void handleSelectedFile(file)
                    }}
                  />
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy !== null || !!pendingCommand}>
                    {text.replaceVideo}
                  </Button>
                </div>
              )}
            </div>
            {candidate && canReplace && (
              <div className="new-dub-candidate" aria-live="polite">
                <p><strong>{text.localFile}:</strong> {candidate.file.name}</p>
                {candidate.facts && <p className="new-dub-muted">{text.localCheck}</p>}
                {candidate.problem && <Notice tone="error" role="alert">{text.localError[candidate.problem]}</Notice>}
                {!candidate.problem && candidate.facts && !pendingCommand && (
                  <Button onClick={() => void beginUpload()} disabled={busy !== null}>{text.replaceVideo}</Button>
                )}
                {safeToRetrySameId && pendingCommand && commandMatchesFile(pendingCommand, candidate.file) && candidate.facts && (
                  <Button onClick={() => void beginUpload()} disabled={busy !== null}>{text.retryUpload}</Button>
                )}
              </div>
            )}
            {!candidate && localProblem && <Notice tone="error" role="alert">{text.localError[localProblem]}</Notice>}
          </section>

          <section className="new-dub-preview" aria-labelledby="new-dub-preview-title">
            <div className="new-dub-section-heading">
              <h2 id="new-dub-preview-title">{text.preview}</h2>
            </div>
            {mediaUrl ? (
              <video
                className="new-dub-preview__video"
                src={mediaUrl}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={() => {
                  if (previewReady) setPreviewMediaReady(true)
                  else setDirectMediaReady(true)
                  setPreviewMediaFailed(false)
                }}
                onError={() => {
                  if (previewReady) {
                    setPreviewMediaReady(false)
                    setPreviewMediaFailed(true)
                  } else {
                    setDirectMediaReady(false)
                    setPreviewMediaFailed(true)
                    setPreviewInspection(null)
                  }
                }}
              />
            ) : (
              <div className="new-dub-preview__empty" role="status">{text.previewUnavailable}</div>
            )}
            {previewMediaFailed && (
              <Notice tone="warning">{text.previewMediaFailed}</Notice>
            )}
            {previewMediaFailed && !previewInspection && !preview && (
              <Button variant="secondary" onClick={() => void inspectCompatiblePreview()} disabled={busy !== null || !!pendingCommand}>
                {busy === 'preview' ? text.previewChecking : text.inspectPreview}
              </Button>
            )}
            {previewInspection?.eligibility === 'supported-fixture' && !preview && (
              <div className="new-dub-preview__actions">
                <Notice tone="neutral">{text.previewUnavailable}</Notice>
                <Button onClick={() => void requestCompatiblePreview()} disabled={busy !== null || !!pendingCommand}>
                  {text.requestPreview}
                </Button>
              </div>
            )}
            {previewInspection?.eligibility === 'conversion-unavailable' && !preview && (
              <Notice tone="warning">{text.previewUnavailableForSource}</Notice>
            )}
            {preview?.state === 'pending' && (
              <div className="new-dub-preview__actions">
                <Notice>{text.previewPending}</Notice>
                <Button variant="secondary" onClick={() => void observePreview()} disabled={busy !== null}>{text.checkPreview}</Button>
              </div>
            )}
            {preview?.state === 'error' && (
              <div className="new-dub-preview__actions">
                <Notice tone="error" role="alert">{text.previewFailed}</Notice>
                {preview.error?.retryable && <Button onClick={() => void retryPreview()} disabled={busy !== null || !!pendingCommand}>{text.retryPreview}</Button>}
              </div>
            )}
            {previewReady && <Notice>{text.previewReady}</Notice>}
          </section>

          <section className="new-dub-selection" aria-labelledby="new-dub-selection-title">
            <div className="new-dub-section-heading">
              <h2 id="new-dub-selection-title">{text.selection}</h2>
              <p>{text.sectionHelp}</p>
            </div>
            <div className="new-dub-range" aria-label={text.selection}>
              <input
                type="range"
                min={0}
                max={Math.max(0, (endMs ?? project.selection.endMs) - minimumSelectionMs)}
                step={1}
                value={startMs ?? project.selection.startMs}
                aria-label={text.rangeStart}
                aria-valuetext={`${formatSeconds(startMs ?? project.selection.startMs)} seconds`}
                disabled={!mediaReady || selectionLocked || !!pendingCommand || busy !== null}
                onChange={(event) => startAt(Number(event.currentTarget.value))}
              />
              <input
                type="range"
                min={Math.min(sourceEndMs, (startMs ?? project.selection.startMs) + minimumSelectionMs)}
                max={Math.min(sourceEndMs, (startMs ?? project.selection.startMs) + maximumSelectionMs)}
                step={1}
                value={endMs ?? project.selection.endMs}
                aria-label={text.rangeEnd}
                aria-valuetext={`${formatSeconds(endMs ?? project.selection.endMs)} seconds`}
                disabled={!mediaReady || selectionLocked || !!pendingCommand || busy !== null}
                onChange={(event) => endAt(Number(event.currentTarget.value))}
              />
            </div>
            <div className="new-dub-selection__fields">
              <TextField
                label={text.start}
                inputMode="decimal"
                value={selectionDraft.start}
                disabled={!mediaReady || selectionLocked || !!pendingCommand || busy !== null}
                aria-invalid={selectionProblem || undefined}
                onChange={(event) => {
                  const start = event.currentTarget.value
                  setSelectionDraft((current) => ({ ...current, start }))
                  setSelectionProblem(false)
                  setQuote(null)
                }}
                onBlur={() => {
                  if (!validSelection) {
                    setSelectionProblem(true)
                    return
                  }
                  void saveSelection()
                }}
              />
              <TextField
                label={text.end}
                inputMode="decimal"
                value={selectionDraft.end}
                disabled={!mediaReady || selectionLocked || !!pendingCommand || busy !== null}
                aria-invalid={selectionProblem || undefined}
                onChange={(event) => {
                  const end = event.currentTarget.value
                  setSelectionDraft((current) => ({ ...current, end }))
                  setSelectionProblem(false)
                  setQuote(null)
                }}
                onBlur={() => {
                  if (!validSelection) {
                    setSelectionProblem(true)
                    return
                  }
                  void saveSelection()
                }}
              />
            </div>
            <p className="new-dub-selection__duration">{text.selectedDuration(durationValue === null ? '—' : durationText(durationValue))}</p>
            {!mediaReady && <p className="new-dub-muted">{previewReady ? text.previewLoading : text.previewUnavailable}</p>}
            {selectionLocked && <Notice tone="neutral">{text.selectionLocked}</Notice>}
            {selectionProblem && <Notice tone="error" role="alert">{text.selectionInvalid}</Notice>}
            {project.sourceDurationMs < minimumSelectionMs && <Notice tone="warning">{text.selectionBlocked}</Notice>}
            {selectionDirty && validSelection && <p className="new-dub-muted">{text.selectionUnsaved}</p>}
            {selectionDirty && validSelection && (
              <Button variant="secondary" onClick={() => void saveSelection()} disabled={selectionLocked || busy !== null || !!pendingCommand || !mediaReady}>
                {text.saveSelection}
              </Button>
            )}
          </section>

          <section className="new-dub-quote" aria-labelledby="new-dub-quote-title">
            <div className="new-dub-section-heading">
              <h2 id="new-dub-quote-title">{text.quote}</h2>
            </div>
            {quote && !quoteCurrent && <p className="new-dub-muted">{text.quoteStale}</p>}
            {!quote && !quoteError && <p className="new-dub-muted">{text.quotePrompt}</p>}
            {quoteCurrent && quote && (
              <dl className="new-dub-quote__facts">
                <div><dt>{text.quoteCredits}</dt><dd>{quote.credits}</dd></div>
                <div><dt>{text.attempt}</dt><dd>{attemptDisclosure}</dd></div>
                <div><dt>{text.available}</dt><dd>{quote.available}</dd></div>
                <div><dt>{text.reserved}</dt><dd>{quote.reserved}</dd></div>
              </dl>
            )}
            {quoteCurrent && quote && quote.draftIdsToDeleteOnActivation.length > 0 && (
              <div className="new-dub-quote__draft-loss">
                <Notice tone="warning">{text.draftLossWarning(quote.draftIdsToDeleteOnActivation.length)}</Notice>
                <label>
                  <input
                    type="checkbox"
                    checked={draftLossConfirmed}
                    onChange={(event) => setDraftLossConfirmed(event.currentTarget.checked)}
                    disabled={busy !== null || !!pendingCommand}
                  />
                  <span>{text.draftLossConfirm}</span>
                </label>
              </div>
            )}
            {quoteError && <ServiceNotice code={quoteError} />}
            {!quoteCurrent && (
              <Button onClick={() => void getQuote()} disabled={!mediaReady || !validSelection || selectionDirty || busy !== null || !!pendingCommand}>
                {busy === 'quote' ? text.quoteLoading : quote ? text.refreshQuote : text.requestQuote}
              </Button>
            )}
            {quoteCurrent && quote && quote.available < quote.credits && (
              <div className="new-dub-quote__insufficient">
                <Notice tone="warning">{text.insufficient}</Notice>
                <Button variant="secondary" onClick={() => void navigate(routes.credits())} disabled={busy !== null || !!pendingCommand}>
                  {text.credits}<ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
                </Button>
                <p className="new-dub-muted">{text.creditsReturn}</p>
              </div>
            )}
            {quoteCurrent && quote && quote.available >= quote.credits && (
              <Button onClick={() => void startProcessing()} disabled={!mediaReady || busy !== null || !!pendingCommand || selectionDirty || !validSelection || (quote.draftIdsToDeleteOnActivation.length > 0 && !draftLossConfirmed)}>
                {busy === 'starting' ? text.starting : text.startProcessing(quote.credits)}
              </Button>
            )}
            {actionError === 'unknown-operation' && <Button variant="secondary" onClick={() => void resolvePendingCommand()} disabled={busy !== null}>{text.checkStatus}</Button>}
          </section>
        </>
      )}
      </>
      )}
    </section>
  )
}
