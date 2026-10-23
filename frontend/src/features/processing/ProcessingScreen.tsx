import { useCallback, useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { ArrowUpRight, RotateCw } from 'lucide-react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { notifyCreditsMayHaveChanged } from '../../app/credits-events'
import { routes } from '../../app/routes'
import { Button } from '../../components/ui/button'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type {
  CancellationQuote,
  OperationId,
  OperationSnapshot,
  OwnedProject,
  PreparationSnapshot,
  ProjectId,
  ServiceResult,
} from '../../services/contracts'
import { ids } from '../../services/contracts'
import type { ServiceProblemCode } from '../../i18n/service-errors'
import './ProcessingScreen.css'

type Copy = {
  title: string
  local: string
  loading: string
  check: string
  retry: string
  pending: string
  stage: string
  complete: string
  noDialogue: string
  priorRetained: string
  completeUnconfirmed: string
  retryZeroTurn: string
  chooseAnotherVideo: string
  failed: string
  cancelled: string
  unavailable: string
  retryPreparation: string
  cancel: string
  cancelTitle: string
  cancelDescription: string
  quoteLoading: string
  charge: (amount: number) => string
  release: (amount: number) => string
  retryRemains: string
  retrySpent: string
  confirmCancel: string
  stay: string
  cancelBusy: string
  checkCancel: string
  quoteUnavailable: string
  expired: string
  activation: string
  continueRecord: string
}

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'Preparing your scene',
    local: 'Local mock workflow. This screen reports the saved service state; it does not estimate completion time.',
    loading: 'Loading preparation status…',
    check: 'Check status',
    retry: 'Retry loading',
    pending: 'Preparation is in progress.',
    stage: 'Current stage',
    complete: 'Preparation is complete. Opening recording…',
    noDialogue: 'No dialogue found. This run completed without creating recording turns.',
    priorRetained: 'The previous preparation and its saved draft remain available.',
    completeUnconfirmed: 'Processing completed, but the service did not confirm a recordable preparation. The current project remains unchanged.',
    retryZeroTurn: 'Review the quote and try this section again',
    chooseAnotherVideo: 'Choose another video',
    failed: 'Preparation failed. The saved result and retry availability are shown by this service state.',
    cancelled: 'Preparation was cancelled. The reserved amount has been reconciled by the service.',
    unavailable: 'Preparation status is not available for this project.',
    retryPreparation: 'Review this project',
    cancel: 'Cancel preparation',
    cancelTitle: 'Cancel this preparation?',
    cancelDescription: 'The service must confirm the exact charge and released reservation before cancellation.',
    quoteLoading: 'Requesting a fresh cancellation quote…',
    charge: (amount) => `Exact charge: ${amount} credits.`,
    release: (amount) => `${amount} reserved credits will be released.`,
    retryRemains: 'The included retry remains available.',
    retrySpent: 'The included retry will no longer be available.',
    confirmCancel: 'Confirm cancellation',
    stay: 'Stay',
    cancelBusy: 'Cancelling…',
    checkCancel: 'Check cancellation status',
    quoteUnavailable: 'The cancellation quote could not be confirmed. Check its status before trying again.',
    expired: 'This quote expired. Request a new quote before confirming cancellation.',
    activation: 'The preparation is ready, but activation is not confirmed yet.',
    continueRecord: 'Continue to recording',
  },
  ru: {
    title: 'Подготавливаем сцену',
    local: 'Локальный сценарий. Здесь показано сохранённое состояние сервиса без оценки времени завершения.',
    loading: 'Загружаем статус подготовки…',
    check: 'Проверить статус',
    retry: 'Повторить загрузку',
    pending: 'Подготовка выполняется.',
    stage: 'Текущий этап',
    complete: 'Подготовка завершена. Открываем запись…',
    noDialogue: 'Реплики не найдены. Обработка завершилась без создания реплик для записи.',
    priorRetained: 'Предыдущая подготовка и сохранённый черновик по-прежнему доступны.',
    completeUnconfirmed: 'Обработка завершена, но сервис не подтвердил пригодную подготовку для записи. Текущий проект не изменён.',
    retryZeroTurn: 'Проверить стоимость и повторить для этого фрагмента',
    chooseAnotherVideo: 'Выбрать другое видео',
    failed: 'Подготовка не удалась. Результат и доступность повтора указаны по состоянию сервиса.',
    cancelled: 'Подготовка отменена. Сервис сверил зарезервированные кредиты.',
    unavailable: 'Статус подготовки для этого проекта недоступен.',
    retryPreparation: 'Проверить проект',
    cancel: 'Отменить подготовку',
    cancelTitle: 'Отменить эту подготовку?',
    cancelDescription: 'Перед отменой сервис должен подтвердить точную сумму списания и освобождения резерва.',
    quoteLoading: 'Запрашиваем новый расчёт отмены…',
    charge: (amount) => `Точное списание: ${amount} кредитов.`,
    release: (amount) => `Будет освобождено ${amount} зарезервированных кредитов.`,
    retryRemains: 'Включённый повтор останется доступен.',
    retrySpent: 'Включённый повтор больше не будет доступен.',
    confirmCancel: 'Подтвердить отмену',
    stay: 'Остаться',
    cancelBusy: 'Отменяем…',
    checkCancel: 'Проверить отмену',
    quoteUnavailable: 'Не удалось подтвердить расчёт отмены. Проверьте его статус перед новой попыткой.',
    expired: 'Расчёт устарел. Запросите новый перед подтверждением отмены.',
    activation: 'Подготовка завершена, но её активация ещё не подтверждена.',
    continueRecord: 'Перейти к записи',
  },
}

type CancelQuoteAttempt = { operationId: OperationId; targetOperationId: OperationId; expectedRevision: PreparationSnapshot['operation']['revision'] }
type CancelAttempt = {
  operationId: OperationId
  targetOperationId: OperationId
  cancellationQuoteId: CancellationQuote['quoteId']
  expectedRevision: PreparationSnapshot['operation']['revision']
}
type ActivationAttempt = {
  operationId: OperationId
  targetOperationId: OperationId
  expectedRevision: PreparationSnapshot['operation']['revision']
  expectedActivePreparationId: PreparationSnapshot['currentPreparationId']
  expectedActivePreparationRevision: PreparationSnapshot['currentPreparationRevision']
}

function randomOperationId(): OperationId {
  return ids.operation(crypto.randomUUID())
}

function problemCode<T>(result: ServiceResult<T>): ServiceProblemCode | null {
  if (result.status === 'error') return result.error.code
  if (result.status === 'conflict') return result.code
  if (result.status === 'unknown') return 'unknown-operation'
  return null
}

function resultState(snapshot: PreparationSnapshot): string | undefined {
  const result = snapshot.operation.result
  if (typeof result === 'object' && result !== null && 'state' in result && typeof result.state === 'string') return result.state
  return undefined
}

function hasRecordableCompletion(snapshot: PreparationSnapshot): boolean {
  if (snapshot.operation.state !== 'committed' || resultState(snapshot) !== 'complete') return false
  const result = snapshot.operation.result
  return typeof result === 'object' && result !== null
    && 'preparationId' in result && typeof result.preparationId === 'string'
    && 'turnCount' in result && typeof result.turnCount === 'number' && result.turnCount > 0
}

function isZeroTurnCompletion(snapshot: PreparationSnapshot): boolean {
  if (snapshot.operation.state !== 'committed' || resultState(snapshot) !== 'complete') return false
  const result = snapshot.operation.result
  return typeof result === 'object' && result !== null
    && (('zeroTurns' in result && result.zeroTurns === true)
      || ('turnCount' in result && result.turnCount === 0))
}

function storeActiveProject(accountId: string, projectId: ProjectId): boolean {
  try {
    sessionStorage.setItem(
      `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`,
      JSON.stringify({ accountId, projectId }),
    )
    return true
  } catch {
    return false
  }
}

function clearActiveProject(accountId: string, projectId: ProjectId): void {
  const key = `dubbed.workspace.v1.${encodeURIComponent(accountId)}.new-project`
  try {
    const value = sessionStorage.getItem(key)
    if (!value) return
    const active = JSON.parse(value) as { accountId?: unknown; projectId?: unknown }
    if (active.accountId === accountId && active.projectId === projectId) sessionStorage.removeItem(key)
  } catch {
    // A malformed local pointer is not enough evidence to clear another project.
  }
}

export function ProcessingScreen({ route, identity, locale, services, navigate }: FeatureScreenProps) {
  const text = copy[locale]
  const account = identity.status === 'signed-in' ? identity.account : null
  const projectId = route.kind === 'project' && route.screen === 'processing' ? route.projectId : null
  const [snapshot, setSnapshot] = useState<PreparationSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<ServiceProblemCode | null>(null)
  const [actionError, setActionError] = useState<ServiceProblemCode | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [quote, setQuote] = useState<CancellationQuote | null>(null)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [quoteError, setQuoteError] = useState<ServiceProblemCode | null>(null)
  const [quoteAttempt, setQuoteAttempt] = useState<CancelQuoteAttempt | null>(null)
  const [quoteRetryDirective, setQuoteRetryDirective] = useState<'same-operation' | 'reconcile-first' | null>(null)
  const [cancelAttempt, setCancelAttempt] = useState<CancelAttempt | null>(null)
  const [cancelUnknown, setCancelUnknown] = useState(false)
  const [activationAttempt, setActivationAttempt] = useState<ActivationAttempt | null>(null)
  const [activationUnknown, setActivationUnknown] = useState(false)
  const activatedProject = useRef<ProjectId | null>(null)
  const cancelTriggerRef = useRef<HTMLButtonElement | null>(null)
  const skipCancelFocusReturnRef = useRef(false)
  const mounted = useRef(true)
  const inFlightObservations = useRef(new Set<string>())
  const routeContext = useRef({
    projectId,
    screen: route.kind === 'project' ? route.screen : null,
    attemptId: snapshot?.operation.id ?? null,
    operationState: snapshot?.operation.state ?? null,
    outcome: snapshot ? resultState(snapshot) : undefined,
    revision: snapshot?.operation.revision,
  })
  routeContext.current = {
    projectId,
    screen: route.kind === 'project' ? route.screen : null,
    attemptId: snapshot?.operation.id ?? null,
    operationState: snapshot?.operation.state ?? null,
    outcome: snapshot ? resultState(snapshot) : undefined,
    revision: snapshot?.operation.revision,
  }
  const observationKey =
    projectId && snapshot?.operation.state === 'pending'
      ? `${projectId}:${snapshot.operation.id}`
      : null
  const observationKeyRef = useRef<string | null>(observationKey)
  observationKeyRef.current = observationKey

  function isCurrentProcessingRoute(targetProjectId: ProjectId): boolean {
    return (
      mounted.current &&
      routeContext.current.projectId === targetProjectId &&
      routeContext.current.screen === 'processing' &&
      window.location.pathname === `/projects/${encodeURIComponent(targetProjectId)}/processing`
    )
  }

  function isCurrentCompletedAttempt(targetProjectId: ProjectId, targetOperationId: OperationId): boolean {
    const current = routeContext.current
    return (
      isCurrentProcessingRoute(targetProjectId) &&
      current.attemptId === targetOperationId &&
      current.operationState === 'committed' &&
      current.outcome === 'complete'
    )
  }

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const loadStatus = useCallback(async () => {
    if (!projectId) {
      setLoading(false)
      setLoadError('not-found')
      return null
    }
    setLoading(true)
    setLoadError(null)
    const result = await services.preparation.resolve({ projectId })
    setLoading(false)
    if (result.status !== 'ok') {
      setLoadError(problemCode(result))
      setSnapshot(null)
      return null
    }
    setSnapshot(result.data)
    return result.data
  }, [projectId, services.preparation])

  useEffect(() => { void loadStatus() }, [loadStatus])

  useEffect(() => {
    if (!projectId || !observationKey || snapshot?.operation.state !== 'pending') return
    const targetProjectId = projectId
    const targetOperationId = snapshot.operation.id
    const targetRevision = snapshot.operation.revision
    let active = true
    let timer: number | undefined

    const isCurrentObservation = () =>
      active &&
      observationKeyRef.current === observationKey &&
      isCurrentProcessingRoute(targetProjectId)

    const scheduleNext = () => {
      if (!isCurrentObservation()) return
      timer = window.setTimeout(() => void observe(), 900)
    }

    const observe = async () => {
      if (!isCurrentObservation()) return
      if (inFlightObservations.current.has(observationKey)) {
        scheduleNext()
        return
      }
      inFlightObservations.current.add(observationKey)
      try {
        const result = await services.preparation.observe({
          projectId: targetProjectId,
          targetOperationId,
        })
        if (!isCurrentObservation()) return
        if (result.status === 'ok') {
          if (result.data.projectId !== targetProjectId || result.data.operation.id !== targetOperationId) return
          const currentRevision = routeContext.current.revision
          const responseRevision = Number(result.data.operation.revision)
          if (
            responseRevision >= Number(targetRevision) &&
            (currentRevision === undefined || responseRevision >= Number(currentRevision))
          ) {
            setActionError(null)
            setSnapshot(result.data)
          }
        } else {
          const code = problemCode(result)
          if (code) setActionError(code)
          if (result.status === 'conflict') {
            void loadStatus()
            return
          }
        }
      } catch {
        if (isCurrentObservation()) setActionError('unexpected')
      } finally {
        inFlightObservations.current.delete(observationKey)
      }
      scheduleNext()
    }

    timer = window.setTimeout(() => void observe(), 900)
    return () => {
      active = false
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [loadStatus, observationKey, projectId, services.preparation, snapshot?.operation.id, snapshot?.operation.revision, snapshot?.operation.state])

  const continueToRecording = useCallback(async (project: OwnedProject, targetOperationId: OperationId) => {
    if (!isCurrentCompletedAttempt(project.id, targetOperationId)) return
    if (activatedProject.current === project.id) return
    if (account && !storeActiveProject(account.id, project.id)) {
      setActivationUnknown(true)
      setActionError('storage-unavailable')
      return
    }
    try {
      const navigated = await navigate(routes.project(project.id, 'record'))
      if (navigated) {
        activatedProject.current = project.id
        setActivationAttempt(null)
        setActivationUnknown(false)
        setActionError(null)
      } else {
        setActivationUnknown(true)
        setActionError('unknown-operation')
      }
    } catch {
      setActivationUnknown(true)
      setActionError('unexpected')
    }
  }, [account, navigate])

  const activate = useCallback(async (attempt: ActivationAttempt, projectData?: OwnedProject) => {
    if (!projectId) return
    setActivationAttempt(attempt)
    setBusy(true)
    setActionError(null)
    const result = projectData
      ? { status: 'ok' as const, replayed: false, data: projectData }
      : await services.preparation.activate({
        projectId,
        targetOperationId: attempt.targetOperationId,
        expectedRevision: attempt.expectedRevision,
        expectedActivePreparationId: attempt.expectedActivePreparationId,
        expectedActivePreparationRevision: attempt.expectedActivePreparationRevision,
        operationId: attempt.operationId,
      })
    setBusy(false)
    if (result.status === 'ok') {
      await continueToRecording(result.data, attempt.targetOperationId)
      return
    }
    if (result.status === 'unknown') {
      setActivationUnknown(true)
      setActionError('unknown-operation')
      return
    }
    setActivationAttempt(null)
    setActivationUnknown(false)
    setActionError(problemCode(result))
    if (result.status === 'conflict') void loadStatus()
  }, [continueToRecording, loadStatus, projectId, services.preparation])

  const activateCompleted = useCallback((current: PreparationSnapshot) => {
    if (
      current.operation.state !== 'committed' ||
      !hasRecordableCompletion(current) ||
      !projectId ||
      !isCurrentCompletedAttempt(projectId, current.operation.id) ||
      activationAttempt ||
      activatedProject.current === projectId
    ) return
    void activate({
      operationId: randomOperationId(),
      targetOperationId: current.operation.id,
      expectedRevision: current.projectRevision,
      expectedActivePreparationId: current.currentPreparationId,
      expectedActivePreparationRevision: current.currentPreparationRevision,
    })
  }, [activate, activationAttempt, projectId])

  useEffect(() => {
    if (snapshot) activateCompleted(snapshot)
  }, [activateCompleted, snapshot])

  const observeStatus = useCallback(async () => {
    if (!projectId || !snapshot) return
    const key = `${projectId}:${snapshot.operation.id}`
    if (inFlightObservations.current.has(key)) return
    inFlightObservations.current.add(key)
    const expectedOperationId = snapshot.operation.id
    setBusy(true)
    setActionError(null)
    try {
      const result = await services.preparation.observe({ projectId, targetOperationId: expectedOperationId })
      if (!isCurrentProcessingRoute(projectId) || routeContext.current.attemptId !== expectedOperationId) return
      if (result.status === 'ok') {
        if (result.data.projectId === projectId && result.data.operation.id === expectedOperationId) {
          const currentRevision = routeContext.current.revision
          if (currentRevision === undefined || Number(result.data.operation.revision) >= Number(currentRevision)) {
            setSnapshot(result.data)
          }
        }
        return
      }
      setActionError(problemCode(result))
      if (result.status === 'conflict') void loadStatus()
    } catch {
      if (isCurrentProcessingRoute(projectId) && routeContext.current.attemptId === expectedOperationId) {
        setActionError('unexpected')
      }
    } finally {
      inFlightObservations.current.delete(key)
      if (isCurrentProcessingRoute(projectId) && routeContext.current.attemptId === expectedOperationId) {
        setBusy(false)
      }
    }
  }, [loadStatus, projectId, services.preparation, snapshot])

  const requestCancelQuote = useCallback(async (attempt?: CancelQuoteAttempt) => {
    if (!projectId || !snapshot) return
    const current = attempt ?? {
      operationId: randomOperationId(),
      targetOperationId: snapshot.operation.id,
      expectedRevision: snapshot.operation.revision,
    }
    setQuoteAttempt(current)
    setQuoteBusy(true)
    setQuoteError(null)
    const result = await services.preparation.cancellationQuote({
      projectId,
      targetOperationId: current.targetOperationId,
      expectedRevision: current.expectedRevision,
      operationId: current.operationId,
    })
    setQuoteBusy(false)
    if (result.status === 'ok') {
      setQuote(result.data)
      setQuoteAttempt(null)
      setQuoteRetryDirective(null)
      return
    }
    if (result.status === 'unknown') {
      setQuoteError('unknown-operation')
      setQuoteRetryDirective('reconcile-first')
      return
    }
    setQuoteError(problemCode(result))
    if (result.status === 'error' && result.error.retry === 'same-operation') {
      setQuoteAttempt(current)
      setQuoteRetryDirective('same-operation')
      return
    }
    if (result.status === 'error' && result.error.retry === 'reconcile-first') {
      setQuoteAttempt(current)
      setQuoteRetryDirective('reconcile-first')
      return
    }
    setQuoteAttempt(null)
    setQuoteRetryDirective(null)
    if (result.status === 'conflict') void loadStatus()
  }, [loadStatus, projectId, services.preparation, snapshot])

  const reconcileQuote = useCallback(async () => {
    if (!quoteAttempt || !projectId) return
    setQuoteBusy(true)
    const result = await services.operations.resolve<CancellationQuote>(quoteAttempt.operationId)
    setQuoteBusy(false)
    if (result.status !== 'ok') {
      setQuoteError(problemCode(result) ?? 'unknown-operation')
      setQuoteRetryDirective('reconcile-first')
      return
    }
    if ('safeToRetrySameId' in result.data) {
      if (result.data.operationId !== quoteAttempt.operationId || result.data.safeToRetrySameId !== true) {
        setQuoteError('unknown-operation')
        setQuoteRetryDirective('reconcile-first')
        return
      }
      await requestCancelQuote(quoteAttempt)
      return
    }
    if (result.data.id !== quoteAttempt.operationId || result.data.kind !== 'preparation.cancellation-quote') {
      setQuoteError('unknown-operation')
      setQuoteRetryDirective('reconcile-first')
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      setQuote(result.data.result)
      setQuoteAttempt(null)
      setQuoteRetryDirective(null)
      setQuoteError(null)
    } else if (result.data.state === 'rejected') {
      setQuoteAttempt(null)
      setQuoteRetryDirective(null)
      setQuoteError(result.data.error?.code ?? 'unexpected')
    } else {
      setQuoteError('unknown-operation')
      setQuoteRetryDirective('reconcile-first')
    }
  }, [projectId, quoteAttempt, requestCancelQuote, services.operations])

  const beginCancel = useCallback(() => {
    setDialogOpen(true)
    setQuote(null)
    setQuoteError(null)
    setQuoteRetryDirective(null)
    void requestCancelQuote()
  }, [requestCancelQuote])

  const cancel = useCallback(async (attempt?: CancelAttempt) => {
    if (!projectId || !snapshot || !quote || busy || (cancelAttempt && !attempt)) return
    if (quote.expiresAt <= Date.now()) {
      setQuote(null)
      setQuoteError('expired')
      return
    }
    const current = attempt ?? {
      operationId: randomOperationId(),
      targetOperationId: snapshot.operation.id,
      cancellationQuoteId: quote.quoteId,
      expectedRevision: snapshot.operation.revision,
    }
    setCancelAttempt(current)
    setBusy(true)
    setQuoteError(null)
    const result = await services.preparation.cancel({
      projectId,
      targetOperationId: current.targetOperationId,
      cancellationQuoteId: current.cancellationQuoteId,
      expectedRevision: current.expectedRevision,
      explicitConfirmation: true,
      operationId: current.operationId,
    })
    setBusy(false)
    if (result.status === 'ok') {
      notifyCreditsMayHaveChanged()
      setCancelAttempt(null)
      setCancelUnknown(false)
      skipCancelFocusReturnRef.current = true
      setDialogOpen(false)
      if (account) storeActiveProject(account.id, projectId)
      await navigate(routes.newDub())
      return
    }
    if (result.status === 'unknown') {
      setCancelUnknown(true)
      setQuoteError('unknown-operation')
      return
    }
    setCancelAttempt(null)
    setCancelUnknown(false)
    setQuoteError(problemCode(result))
    if (result.status === 'conflict') void loadStatus()
  }, [account, busy, cancelAttempt, loadStatus, navigate, projectId, quote, services.preparation, snapshot])

  const reconcileCancel = useCallback(async () => {
    if (!cancelAttempt || !projectId || busy) return
    setBusy(true)
    const result = await services.operations.resolve<OperationSnapshot>(cancelAttempt.operationId)
    setBusy(false)
    if (result.status !== 'ok') {
      setQuoteError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      await cancel(cancelAttempt)
      return
    }
    if (result.data.state === 'committed') {
      notifyCreditsMayHaveChanged()
      setCancelAttempt(null)
      setCancelUnknown(false)
      skipCancelFocusReturnRef.current = true
      setDialogOpen(false)
      if (account) storeActiveProject(account.id, projectId)
      await navigate(routes.newDub())
    } else if (result.data.state === 'rejected') {
      setCancelAttempt(null)
      setCancelUnknown(false)
      setQuoteError(result.data.error?.code ?? 'unexpected')
    } else {
      setCancelUnknown(true)
      setQuoteError('unknown-operation')
    }
  }, [account, busy, cancel, cancelAttempt, navigate, projectId, services.operations])

  const reconcileActivation = useCallback(async () => {
    if (!activationAttempt || busy) return
    setBusy(true)
    const result = await services.operations.resolve<OwnedProject>(activationAttempt.operationId)
    setBusy(false)
    if (result.status !== 'ok') {
      setActionError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      setActivationUnknown(false)
      await activate(activationAttempt)
    } else if (result.data.state === 'committed' && result.data.result) {
      await continueToRecording(result.data.result, activationAttempt.targetOperationId)
    } else if (result.data.state === 'rejected') {
      setActivationAttempt(null)
      setActivationUnknown(false)
      setActionError(result.data.error?.code ?? 'unexpected')
    } else {
      setActivationUnknown(true)
      setActionError('unknown-operation')
    }
  }, [activate, activationAttempt, busy, continueToRecording, services.operations])

  const currentState = snapshot ? resultState(snapshot) : undefined
  const noDialogue = snapshot ? isZeroTurnCompletion(snapshot) : false
  const recordableCompletion = snapshot ? hasRecordableCompletion(snapshot) : false
  const stage = snapshot?.currentStage
  const trustedPercentage = snapshot?.percentage?.trusted && snapshot.percentage.operationRevision === snapshot.operation.revision
    ? snapshot.percentage.value
    : null
  const operationPending = snapshot?.operation.state === 'pending'

  if (!projectId) return null

  return (
    <section className="processing-page" aria-labelledby="processing-title">
      <header className="workspace-heading">
        <div>
          <h1 id="processing-title">{text.title}</h1>
          <p className="workspace-muted">{text.local}</p>
        </div>
        <Button variant="secondary" onClick={() => void observeStatus()} disabled={!snapshot || busy || !operationPending}>
          <RotateCw aria-hidden="true" strokeWidth={1.1} />
          {text.check}
        </Button>
      </header>

      {loading && <p className="workspace-status" role="status">{text.loading}</p>}
      {loadError && (
        <div className="workspace-error">
          <ServiceNotice code={loadError} />
          <Button variant="secondary" onClick={() => void loadStatus()}>{text.retry}</Button>
        </div>
      )}
      {actionError && <ServiceNotice code={actionError} />}
      {snapshot && (
        <div className="processing-state" aria-live="polite">
          {snapshot.operation.state === 'pending' && <p>{text.pending}</p>}
          {currentState === 'complete' && recordableCompletion && <p>{text.complete}</p>}
          {noDialogue && <Notice tone="warning">{text.noDialogue}</Notice>}
          {noDialogue && snapshot.currentPreparationId && <Notice>{text.priorRetained}</Notice>}
          {currentState === 'complete' && !recordableCompletion && !noDialogue && <Notice tone="warning">{text.completeUnconfirmed}</Notice>}
          {currentState === 'failed' && <Notice tone="error">{text.failed}</Notice>}
          {currentState === 'cancelled' && <Notice>{text.cancelled}</Notice>}
          {stage && (
            <div className="processing-stage">
              <span>{text.stage}</span>
              <strong>{stage.label}</strong>
            </div>
          )}
          {trustedPercentage !== null && (
            <div className="processing-progress">
              <div
                className="processing-progress__track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={trustedPercentage}
              >
                <span style={{ width: `${trustedPercentage}%` }} />
              </div>
              <span>{trustedPercentage}%</span>
            </div>
          )}
          {snapshot.includedRetryAvailable && <Notice>{locale === 'ru' ? 'Доступен включённый повтор.' : 'An included retry is available.'}</Notice>}
          {snapshot.reprocessingLocked && <Notice tone="warning">{locale === 'ru' ? 'Повторная обработка сейчас недоступна.' : 'Reprocessing is currently unavailable.'}</Notice>}
          {activationUnknown && (
            <div className="workspace-error">
              <Notice tone="warning">{text.activation}</Notice>
              <Button variant="secondary" onClick={() => void reconcileActivation()} disabled={busy}>{text.continueRecord}</Button>
            </div>
          )}
          {snapshot.operation.state === 'rejected' && snapshot.operation.error && <ServiceNotice code={snapshot.operation.error.code} />}
          {(currentState === 'failed' || currentState === 'cancelled') && (
            <Button variant="secondary" onClick={() => {
              if (account) storeActiveProject(account.id, projectId)
              void navigate(routes.newDub())
            }}>
              <ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
              {text.retryPreparation}
            </Button>
          )}
          {noDialogue && (
            <>
              <Button onClick={() => {
                if (account) storeActiveProject(account.id, projectId)
                void navigate(routes.newDub())
              }}>
                <ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
                {text.retryZeroTurn}
              </Button>
              <Button variant="secondary" onClick={() => {
                if (account) clearActiveProject(account.id, projectId)
                void navigate(routes.newDub())
              }}>
                {text.chooseAnotherVideo}
              </Button>
            </>
          )}
        </div>
      )}

      {snapshot && operationPending && (
        <Button
          variant="destructive"
          onClick={(event) => {
            cancelTriggerRef.current = event.currentTarget
            beginCancel()
          }}
          disabled={busy || cancelUnknown || quoteAttempt !== null}
        >
          {text.cancel}
        </Button>
      )}

      <Dialog.Root open={dialogOpen} onOpenChange={(open) => {
        if (!open && !busy && !cancelUnknown && !quoteAttempt) setDialogOpen(false)
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="processing-dialog__overlay" />
          <Dialog.Content
            className="processing-dialog"
            aria-describedby="processing-cancel-description"
            onCloseAutoFocus={(event) => {
              if (skipCancelFocusReturnRef.current) {
                skipCancelFocusReturnRef.current = false
                return
              }
              const trigger = cancelTriggerRef.current
              if (!trigger?.isConnected || trigger.disabled) return
              event.preventDefault()
              trigger.focus()
            }}
          >
            <Dialog.Title className="processing-dialog__title">{text.cancelTitle}</Dialog.Title>
            <Dialog.Description id="processing-cancel-description" className="processing-dialog__description">
              {text.cancelDescription}
            </Dialog.Description>
            {quoteBusy && <p role="status">{text.quoteLoading}</p>}
            {quote && (
              <div className="processing-cancel-quote">
                <p>{text.charge(quote.exactCharge)}</p>
                <p>{text.release(quote.releaseAmount)}</p>
                <p>{quote.includedRetryRemains ? text.retryRemains : text.retrySpent}</p>
              </div>
            )}
            {quoteError && quoteError !== 'unknown-operation' && quoteError !== 'expired' && <ServiceNotice code={quoteError} />}
            {quoteError === 'expired' && <Notice tone="warning">{text.expired}</Notice>}
            {quoteAttempt && quoteError === 'unknown-operation' && <Notice tone="warning">{text.quoteUnavailable}</Notice>}
            {cancelUnknown && <Notice tone="warning">{text.quoteUnavailable}</Notice>}
            <div className="processing-dialog__actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={quoteBusy || busy || quoteAttempt !== null || cancelUnknown}>{text.stay}</Button>
              </Dialog.Close>
              {quoteAttempt && quoteRetryDirective === 'reconcile-first' ? (
                <Button variant="secondary" onClick={() => void reconcileQuote()} disabled={quoteBusy}>{text.checkCancel}</Button>
              ) : cancelUnknown ? (
                <Button variant="secondary" onClick={() => void reconcileCancel()} disabled={busy}>{text.checkCancel}</Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => quoteError === 'expired'
                    ? void requestCancelQuote()
                    : quoteAttempt && quoteRetryDirective === 'same-operation'
                      ? void requestCancelQuote(quoteAttempt)
                      : void cancel()}
                  disabled={quoteBusy || busy || (!quote && quoteError !== 'expired' && quoteRetryDirective !== 'same-operation')}
                >
                  {busy ? text.cancelBusy : quoteError === 'expired' || quoteRetryDirective === 'same-operation' ? text.retry : text.confirmCancel}
                </Button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

export default ProcessingScreen
