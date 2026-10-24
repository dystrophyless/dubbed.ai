import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowUpRight, RotateCw } from 'lucide-react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { notifyCreditsMayHaveChanged } from '../../app/credits-events'
import { routes } from '../../app/routes'
import { Button } from '../../components/ui/button'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type {
  CreditHistoryCursor,
  CreditPack,
  CreditSnapshot,
  LedgerEntry,
  OperationId,
  PurchaseSnapshot,
  SimulatedCheckoutSnapshot,
  ServiceResult,
} from '../../services/contracts'
import { ids } from '../../services/contracts'
import type { ServiceProblemCode } from '../../i18n/service-errors'
import './CreditsScreen.css'

type Copy = {
  title: string
  available: string
  reserved: string
  capacity: string
  used: (used: number, total: number) => string
  packs: string
  noPacks: string
  packsError: string
  retryPacks: string
  packsLoading: string
  mockOnly: string
  mockAmount: (amount: string) => string
  startMock: string
  pending: string
  pendingHelp: string
  verifying: string
  verified: string
  cancelled: string
  failed: string
  checkStatus: string
  simulatePending: string
  simulateVerified: string
  simulateCancelled: string
  simulateFailed: string
  history: string
  historyEmpty: string
  showMore: string
  retryHistory: string
  historyLoading: string
  historyPageError: string
  delta: string
  availableAfter: string
  reservedAfter: string
  noValue: string
  entryKind: Record<LedgerEntry['kind'], string>
  returnUnavailable: string
  openProjects: string
  errorGeneric: string
}

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'Credits',
    available: 'Available',
    reserved: 'Reserved',
    capacity: 'Project capacity',
    used: (used, total) => `${used} of ${total} projects used`,
    packs: 'Credit packs',
    noPacks: 'No purchase offers are configured here.',
    packsError: 'Credit packs could not be loaded. Retry to check available offers.',
    retryPacks: 'Retry packs',
    packsLoading: 'Loading credit packs…',
    mockOnly: 'Local mock scenario only. No payment is collected and no payment provider is connected.',
    mockAmount: (amount) => `Configured mock amount: ${amount}. This is test currency, not a real price.`,
    startMock: 'Start mock checkout',
    pending: 'Confirming payment',
    pendingHelp: 'This mock checkout is still pending. Available credits and history have not changed.',
    verifying: 'Applying the verified mock result…',
    verified: 'Verified in this local scenario. Credits are updated from the service balance.',
    cancelled: 'Checkout cancelled in this local scenario. No credits were added.',
    failed: 'Checkout failed in this local scenario. No credits were added.',
    checkStatus: 'Check payment status',
    simulatePending: 'Keep pending',
    simulateVerified: 'Simulate verified payment',
    simulateCancelled: 'Simulate cancellation',
    simulateFailed: 'Simulate failure',
    history: 'Credit history',
    historyEmpty: 'No credit activity yet.',
    showMore: 'Show more',
    retryHistory: 'Retry older activity',
    historyLoading: 'Loading older activity…',
    historyPageError: 'Older credit activity could not be loaded. Your loaded records are still shown.',
    delta: 'Change',
    availableAfter: 'Available after',
    reservedAfter: 'Reserved after',
    noValue: '—',
    entryKind: {
      'welcome-grant': 'Welcome credits',
      'verified-purchase': 'Verified purchase',
      'processing-reservation': 'Processing reservation',
      'processing-settlement': 'Processing charge',
      'reservation-release': 'Reservation released',
      'credit-return': 'Credits returned',
      'pending-purchase': 'Pending purchase',
    },
    returnUnavailable: 'The saved project return could not be confirmed. Your verified credit balance remains available here.',
    openProjects: 'Open projects',
    errorGeneric: 'The credit service could not be reached. Try again.',
  },
  ru: {
    title: 'Кредиты',
    available: 'Доступно',
    reserved: 'Зарезервировано',
    capacity: 'Места для проектов',
    used: (used, total) => `Использовано проектов: ${used} из ${total}`,
    packs: 'Пакеты кредитов',
    noPacks: 'Предложения для покупки не настроены.',
    packsError: 'Не удалось загрузить пакеты кредитов. Повторите попытку, чтобы проверить доступные предложения.',
    retryPacks: 'Повторить загрузку пакетов',
    packsLoading: 'Загружаем пакеты кредитов…',
    mockOnly: 'Только локальный сценарий имитации. Оплата не списывается, платёжный провайдер не подключён.',
    mockAmount: (amount) => `Условная сумма: ${amount}. Это тестовая валюта, а не реальная цена.`,
    startMock: 'Начать пробную покупку',
    pending: 'Проверяем оплату',
    pendingHelp: 'Пробная оплата ожидает подтверждения. Доступный баланс и история пока не изменились.',
    verifying: 'Применяем подтверждённый пробный результат…',
    verified: 'Подтверждено в локальном сценарии. Баланс обновлён по данным сервиса.',
    cancelled: 'Пробная оплата отменена. Кредиты не добавлены.',
    failed: 'Пробная оплата не прошла. Кредиты не добавлены.',
    checkStatus: 'Проверить статус оплаты',
    simulatePending: 'Оставить в ожидании',
    simulateVerified: 'Имитировать подтверждение',
    simulateCancelled: 'Имитировать отмену',
    simulateFailed: 'Имитировать ошибку',
    history: 'История кредитов',
    historyEmpty: 'Действий с кредитами пока нет.',
    showMore: 'Показать ещё',
    retryHistory: 'Повторить загрузку',
    historyLoading: 'Загружаем старые записи…',
    historyPageError: 'Не удалось загрузить старые записи. Уже загруженная история сохранена.',
    delta: 'Изменение',
    availableAfter: 'Доступно после',
    reservedAfter: 'Зарезервировано после',
    noValue: '—',
    entryKind: {
      'welcome-grant': 'Приветственные кредиты',
      'verified-purchase': 'Подтверждённая покупка',
      'processing-reservation': 'Резерв обработки',
      'processing-settlement': 'Списание за обработку',
      'reservation-release': 'Резерв освобождён',
      'credit-return': 'Возврат кредитов',
      'pending-purchase': 'Ожидающая покупка',
    },
    returnUnavailable: 'Не удалось подтвердить возврат к сохранённому проекту. Подтверждённый баланс доступен здесь.',
    openProjects: 'Открыть проекты',
    errorGeneric: 'Не удалось связаться с сервисом кредитов. Попробуйте ещё раз.',
  },
}

interface StoredPurchaseIntent {
  accountId: string
  packId: string
  initiationId: OperationId
  startOperationId: OperationId
  purchaseId?: OperationId
  purchase?: PurchaseSnapshot
  applyOperationId?: OperationId
  simulationAttempt?: { outcome: 'pending' | 'verified' | 'cancelled' | 'failed'; operationId: OperationId }
}

const safeId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value)

function purchaseKey(accountId: string) {
  return `dubbed.credits.v1.${encodeURIComponent(accountId)}.purchase`
}

function readPurchaseIntent(accountId: string): StoredPurchaseIntent | null {
  try {
    const raw = sessionStorage.getItem(purchaseKey(accountId))
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredPurchaseIntent>
    if (
      value.accountId !== accountId ||
      typeof value.packId !== 'string' ||
      !safeId(value.initiationId) ||
      !safeId(value.startOperationId) ||
      (value.purchaseId !== undefined && !safeId(value.purchaseId)) ||
      (value.applyOperationId !== undefined && !safeId(value.applyOperationId))
    ) return null
    return value as StoredPurchaseIntent
  } catch {
    return null
  }
}

function writePurchaseIntent(value: StoredPurchaseIntent): boolean {
  try {
    sessionStorage.setItem(purchaseKey(value.accountId), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function problemCode<T>(result: ServiceResult<T>): ServiceProblemCode | null {
  if (result.status === 'error') return result.error.code
  if (result.status === 'conflict') return result.code
  if (result.status === 'unknown') return 'unknown-operation'
  return null
}

function randomOperationId(): OperationId {
  return ids.operation(crypto.randomUUID())
}

function formatPackAmount(pack: CreditPack, locale: 'en' | 'ru'): string {
  if (pack.currency === 'MOCK') {
    return locale === 'ru' ? `${pack.amountMinor} единиц MOCK` : `${pack.amountMinor} MOCK units`
  }
  try {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: pack.currency })
    const minorDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2
    return formatter.format(pack.amountMinor / (10 ** minorDigits))
  } catch {
    return `${pack.amountMinor} ${pack.currency} minor units`
  }
}

export function CreditsScreen({ identity, locale, services, navigate }: FeatureScreenProps) {
  const text = copy[locale]
  const account = identity.status === 'signed-in' ? identity.account : null
  const [snapshot, setSnapshot] = useState<CreditSnapshot | null>(null)
  const [history, setHistory] = useState<LedgerEntry[] | null>(null)
  const [historyCursor, setHistoryCursor] = useState<CreditHistoryCursor | null>(null)
  const [historyPageLoading, setHistoryPageLoading] = useState(false)
  const [historyPageError, setHistoryPageError] = useState<ServiceProblemCode | 'generic' | null>(null)
  const [packs, setPacks] = useState<CreditPack[] | null>(null)
  const [packLoading, setPackLoading] = useState(true)
  const [packError, setPackError] = useState<ServiceProblemCode | 'generic' | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<ServiceProblemCode | 'generic' | null>(null)
  const [intent, setIntent] = useState<StoredPurchaseIntent | null>(null)
  const [actionError, setActionError] = useState<ServiceProblemCode | null>(null)
  const [action, setAction] = useState<'starting' | 'simulating' | 'applying' | 'checking' | null>(null)
  const [unknownStart, setUnknownStart] = useState(false)
  const [applyUnknown, setApplyUnknown] = useState(false)
  const [returnError, setReturnError] = useState(false)
  const applyInFlight = useRef(false)
  const returnedPurchase = useRef<string | null>(null)
  const historyRequestGeneration = useRef(0)
  const activeAccountId = useRef(account?.id ?? null)
  activeAccountId.current = account?.id ?? null

  const loadAccountData = useCallback(async () => {
    if (!account) return
    const generation = ++historyRequestGeneration.current
    const requestedAccountId = account.id
    setLoading(true)
    setLoadError(null)
    setHistoryPageLoading(false)
    setHistoryPageError(null)
    setPackLoading(true)
    setPackError(null)
    const [balanceResult, historyResult, packResult] = await Promise.all([
      services.credits.snapshot(),
      services.credits.historyPage({}),
      services.credits.packs(),
    ])
    if (generation !== historyRequestGeneration.current || activeAccountId.current !== requestedAccountId) return
    if (balanceResult.status === 'ok') setSnapshot(balanceResult.data)
    else {
      setSnapshot(null)
      setLoadError(problemCode(balanceResult) ?? 'generic')
    }
    if (historyResult.status === 'ok') {
      setHistory(historyResult.data.entries)
      setHistoryCursor(historyResult.data.nextCursor)
      setHistoryPageError(null)
    }
    else {
      setHistory(null)
      setHistoryCursor(null)
      setLoadError(problemCode(historyResult) ?? 'generic')
    }
    if (packResult.status === 'ok') {
      setPacks(packResult.data)
      setPackError(null)
    }
    else {
      setPacks(null)
      setPackError(problemCode(packResult) ?? 'generic')
    }
    setPackLoading(false)
    setLoading(false)
  }, [account, services])

  const retryPacks = useCallback(async () => {
    if (!account || packLoading) return
    const generation = historyRequestGeneration.current
    const requestedAccountId = account.id
    setPackLoading(true)
    try {
      const result = await services.credits.packs()
      if (generation !== historyRequestGeneration.current || activeAccountId.current !== requestedAccountId) return
      if (result.status === 'ok') {
        setPacks(result.data)
        setPackError(null)
      } else {
        setPacks(null)
        setPackError(problemCode(result) ?? 'generic')
      }
    } catch {
      if (generation === historyRequestGeneration.current && activeAccountId.current === requestedAccountId) {
        setPacks(null)
        setPackError('generic')
      }
    } finally {
      if (generation === historyRequestGeneration.current && activeAccountId.current === requestedAccountId) {
        setPackLoading(false)
      }
    }
  }, [account, packLoading, services])

  const loadOlderHistory = useCallback(async () => {
    if (!account || !historyCursor || historyPageLoading) return
    const generation = historyRequestGeneration.current
    const requestedAccountId = account.id
    setHistoryPageLoading(true)
    setHistoryPageError(null)
    try {
      const result = await services.credits.historyPage({ cursor: historyCursor })
      if (generation !== historyRequestGeneration.current || activeAccountId.current !== requestedAccountId) return
      if (result.status !== 'ok') {
        setHistoryPageError(problemCode(result) ?? 'generic')
        return
      }
      setHistory((current) => {
        const merged = [...(current ?? [])]
        const seen = new Set(merged.map((entry) => entry.id))
        for (const entry of result.data.entries) {
          if (!seen.has(entry.id)) {
            seen.add(entry.id)
            merged.push(entry)
          }
        }
        return merged
      })
      setHistoryCursor(result.data.nextCursor)
    } catch {
      if (generation === historyRequestGeneration.current && activeAccountId.current === requestedAccountId) {
        setHistoryPageError('generic')
      }
    } finally {
      if (generation === historyRequestGeneration.current && activeAccountId.current === requestedAccountId) {
        setHistoryPageLoading(false)
      }
    }
  }, [account, historyCursor, historyPageLoading, services])

  const saveIntent = useCallback((next: StoredPurchaseIntent) => {
    setIntent(next)
    if (!writePurchaseIntent(next)) setActionError('storage-unavailable')
  }, [])

  const loadPurchase = useCallback(async (target: StoredPurchaseIntent) => {
    setAction('checking')
    setActionError(null)
    const result = await services.credits.resolvePurchase({ initiationId: target.initiationId })
    setAction(null)
    if (result.status !== 'ok') {
      setUnknownStart(true)
      setActionError(problemCode(result))
      return null
    }
    const next = { ...target, purchaseId: result.data.purchase.id, purchase: result.data.purchase }
    saveIntent(next)
    setSnapshot(result.data.snapshot)
    setUnknownStart(false)
    return result.data.purchase
  }, [saveIntent, services])

  const returnToSavedDraft = useCallback(async (purchase: PurchaseSnapshot) => {
    if (!account || returnedPurchase.current === purchase.id) return
    const contextId = purchase.returnContextId
    if (!contextId) return
    returnedPurchase.current = purchase.id
    const resolved = await services.credits.resolveReturnContext({ returnContextId: contextId })
    if (
      resolved.status !== 'ok' ||
      !resolved.data.valid ||
      !resolved.data.projectId ||
      !resolved.data.sourceId ||
      !resolved.data.selection
    ) {
      setReturnError(true)
      return
    }
    const projectResult = await services.projects.open(resolved.data.projectId)
    const sourceResult = await services.uploads.getSource(resolved.data.projectId)
    if (
      projectResult.status !== 'ok' ||
      sourceResult.status !== 'ok' ||
      projectResult.data.sourceId !== resolved.data.sourceId ||
      projectResult.data.selection.startMs !== resolved.data.selection.startMs ||
      projectResult.data.selection.endMs !== resolved.data.selection.endMs
    ) {
      setReturnError(true)
      return
    }
    try {
      sessionStorage.setItem(
        `dubbed.workspace.v1.${encodeURIComponent(account.id)}.new-project`,
        JSON.stringify({ accountId: account.id, projectId: projectResult.data.id }),
      )
      const returnKey = `dubbed.workspace.v1.${encodeURIComponent(account.id)}.return-context`
      if (sessionStorage.getItem(returnKey) === contextId) sessionStorage.removeItem(returnKey)
      await navigate(routes.newDub())
    } catch {
      setReturnError(true)
    }
  }, [account, navigate, services.credits, services.projects, services.uploads])

  const verifyAndApply = useCallback(async (
    target: StoredPurchaseIntent,
    purchase: PurchaseSnapshot,
  ) => {
    if (purchase.state !== 'verified' || !purchase.verificationId || applyInFlight.current) return
    const next = target.applyOperationId
      ? target
      : { ...target, applyOperationId: randomOperationId() }
    if (!writePurchaseIntent(next)) {
      setActionError('storage-unavailable')
      return
    }
    setIntent(next)
    applyInFlight.current = true
    setAction('applying')
    setActionError(null)
    setApplyUnknown(false)
    const result = await services.credits.applyVerifiedPurchase({
      purchaseId: purchase.id,
      verificationId: purchase.verificationId,
      operationId: next.applyOperationId!,
    })
    applyInFlight.current = false
    setAction(null)
    if (result.status === 'ok') {
      notifyCreditsMayHaveChanged()
      setSnapshot(result.data)
      setApplyUnknown(false)
      await loadAccountData()
      await returnToSavedDraft(purchase)
      return
    }
    if (result.status === 'unknown') {
      setApplyUnknown(true)
      setActionError('unknown-operation')
      return
    }
    setActionError(problemCode(result))
  }, [loadAccountData, returnToSavedDraft, services.credits])

  const resolveApply = useCallback(async (target: StoredPurchaseIntent) => {
    if (!target.applyOperationId) return
    setAction('checking')
    setActionError(null)
    const result = await services.operations.resolve<CreditSnapshot>(target.applyOperationId)
    setAction(null)
    if (result.status !== 'ok') {
      setActionError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      setApplyUnknown(false)
      const purchase = target.purchase ?? await loadPurchase(target)
      if (purchase?.state === 'verified') {
        await verifyAndApply(target, purchase)
      } else {
        setActionError('unknown-operation')
      }
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      notifyCreditsMayHaveChanged()
      setSnapshot(result.data.result as CreditSnapshot)
      setApplyUnknown(false)
      await loadAccountData()
      if (target.purchase) await returnToSavedDraft(target.purchase)
      return
    }
    if (result.data.state === 'rejected') {
      setApplyUnknown(false)
      setActionError(result.data.error?.code ?? 'unexpected')
      return
    }
    setApplyUnknown(true)
    setActionError('unknown-operation')
  }, [loadAccountData, loadPurchase, returnToSavedDraft, services.operations, verifyAndApply])

  const applySimulation = useCallback(async (
    target: StoredPurchaseIntent,
    result: SimulatedCheckoutSnapshot,
  ) => {
    const next: StoredPurchaseIntent = {
      ...target,
      purchaseId: result.purchase.id,
      purchase: result.purchase,
      simulationAttempt: undefined,
    }
    saveIntent(next)
    if (result.outcome === 'verified') {
      await verifyAndApply(next, result.purchase)
    } else {
      await loadAccountData()
    }
  }, [loadAccountData, saveIntent, verifyAndApply])

  const runSimulation = useCallback(async (
    target: StoredPurchaseIntent,
    attempt: NonNullable<StoredPurchaseIntent['simulationAttempt']>,
  ) => {
    if (!target.purchaseId) return
    const pending: StoredPurchaseIntent = { ...target, simulationAttempt: attempt }
    if (!writePurchaseIntent(pending)) {
      setActionError('storage-unavailable')
      return
    }
    setIntent(pending)
    setAction('simulating')
    setActionError(null)
    const result = await services.credits.simulateCheckout({
      purchaseId: target.purchaseId,
      outcome: attempt.outcome,
      operationId: attempt.operationId,
    })
    setAction(null)
    if (result.status === 'ok') {
      await applySimulation(pending, result.data)
      return
    }
    if (result.status === 'unknown') {
      setActionError('unknown-operation')
      return
    }
    const cleared = { ...pending, simulationAttempt: undefined }
    saveIntent(cleared)
    setActionError(problemCode(result))
  }, [applySimulation, saveIntent, services.credits])

  const resolveSimulation = useCallback(async (target: StoredPurchaseIntent) => {
    const attempt = target.simulationAttempt
    if (!attempt) return
    setAction('checking')
    setActionError(null)
    const result = await services.operations.resolve<SimulatedCheckoutSnapshot>(attempt.operationId)
    setAction(null)
    if (result.status !== 'ok') {
      setActionError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      await runSimulation(target, attempt)
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      await applySimulation(target, result.data.result)
      return
    }
    if (result.data.state === 'rejected') {
      saveIntent({ ...target, simulationAttempt: undefined })
      setActionError(result.data.error?.code ?? 'unexpected')
      return
    }
    setActionError('unknown-operation')
  }, [applySimulation, runSimulation, saveIntent, services.operations])

  const startCheckout = useCallback(async (pack: CreditPack) => {
    if (!account || pack.note !== 'synthetic-mock-scenario') return
    const existing = readPurchaseIntent(account.id)
    if (existing && existing.purchase && existing.purchase.state === 'pending') {
      setIntent(existing)
      return
    }
    const next: StoredPurchaseIntent = {
      accountId: account.id,
      packId: pack.id,
      initiationId: randomOperationId(),
      startOperationId: randomOperationId(),
    }
    if (!writePurchaseIntent(next)) {
      setActionError('storage-unavailable')
      return
    }
    setIntent(next)
    setAction('starting')
    setActionError(null)
    setUnknownStart(false)
    const returnContextId = (() => {
      try {
        const raw = sessionStorage.getItem(`dubbed.workspace.v1.${encodeURIComponent(account.id)}.return-context`)
        return raw && safeId(raw) ? ids.operation(raw) : undefined
      } catch {
        return undefined
      }
    })()
    const result = await services.credits.startPurchase({
      packId: pack.id,
      initiationId: next.initiationId,
      returnContextId,
      operationId: next.startOperationId,
    })
    setAction(null)
    if (result.status === 'ok') {
      const stored = { ...next, purchaseId: result.data.purchaseId }
      saveIntent(stored)
      await loadPurchase(stored)
      return
    }
    if (result.status === 'unknown') {
      setUnknownStart(true)
      setActionError('unknown-operation')
      return
    }
    setActionError(problemCode(result))
  }, [account, loadPurchase, saveIntent, services.credits])

  const retryStart = useCallback(async () => {
    if (!intent || intent.purchase || intent.accountId !== account?.id) return
    const pack = packs?.find((item) => item.id === intent.packId)
    if (!pack) return
    setAction('starting')
    setActionError(null)
    const returnContextId = (() => {
      try {
        const raw = sessionStorage.getItem(`dubbed.workspace.v1.${encodeURIComponent(intent.accountId)}.return-context`)
        return raw && safeId(raw) ? ids.operation(raw) : undefined
      } catch {
        return undefined
      }
    })()
    const result = await services.credits.startPurchase({
      packId: pack.id,
      initiationId: intent.initiationId,
      returnContextId,
      operationId: intent.startOperationId,
    })
    setAction(null)
    if (result.status === 'ok') {
      const stored = { ...intent, purchaseId: result.data.purchaseId }
      saveIntent(stored)
      await loadPurchase(stored)
    } else if (result.status === 'unknown') {
      setUnknownStart(true)
      setActionError('unknown-operation')
    } else {
      setUnknownStart(false)
      setActionError(problemCode(result))
    }
  }, [account, intent, loadPurchase, packs, saveIntent, services.credits])

  const resolveStart = useCallback(async () => {
    if (!intent || intent.purchase || intent.accountId !== account?.id) return
    setAction('checking')
    setActionError(null)
    const result = await services.operations.resolve<{
      purchaseId: OperationId
      state: 'pending'
      returnContextId?: OperationId
    }>(intent.startOperationId)
    setAction(null)
    if (result.status !== 'ok') {
      setActionError(problemCode(result) ?? 'unknown-operation')
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      await retryStart()
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      setUnknownStart(false)
      const stored = { ...intent, purchaseId: result.data.result.purchaseId }
      saveIntent(stored)
      await loadPurchase(stored)
      return
    }
    if (result.data.state === 'rejected') {
      setUnknownStart(false)
      setActionError(result.data.error?.code ?? 'unexpected')
      return
    }
    setActionError('unknown-operation')
  }, [account, intent, loadPurchase, retryStart, saveIntent, services.operations])

  const simulate = useCallback(async (outcome: 'pending' | 'verified' | 'cancelled' | 'failed') => {
    if (!intent?.purchaseId || intent.simulationAttempt) return
    await runSimulation(intent, { outcome, operationId: randomOperationId() })
  }, [intent, runSimulation])

  const checkPurchase = useCallback(async () => {
    if (!intent) return
    const purchase = await loadPurchase(intent)
    if (purchase?.state === 'verified') {
      const latest = readPurchaseIntent(intent.accountId) ?? intent
      await verifyAndApply(latest, purchase)
    }
  }, [intent, loadPurchase, verifyAndApply])

  const checkStatus = useCallback(async () => {
    if (!intent) return
    if (intent.simulationAttempt) {
      await resolveSimulation(intent)
    } else if (unknownStart && !intent.purchase) {
      await resolveStart()
    } else if (applyUnknown) {
      await resolveApply(intent)
    } else {
      await checkPurchase()
    }
  }, [applyUnknown, checkPurchase, intent, resolveApply, resolveSimulation, resolveStart, unknownStart])

  useEffect(() => {
    if (!account) {
      setLoading(false)
      return
    }
    let active = true
    void loadAccountData()
    const stored = readPurchaseIntent(account.id)
    if (stored) {
      setIntent(stored)
      void loadPurchase(stored).then((purchase) => {
        if (active && purchase?.state === 'verified') {
          const latest = readPurchaseIntent(account.id) ?? stored
          void verifyAndApply(latest, purchase)
        }
      })
    }
    return () => {
      active = false
      historyRequestGeneration.current += 1
    }
  }, [account, loadAccountData, loadPurchase, verifyAndApply])

  if (!account) return null

  const visibleHistory = history ?? []
  const purchaseState = intent?.purchase?.state
  const purchaseMessage = purchaseState === 'pending'
    ? text.pending
    : purchaseState === 'verified'
      ? text.verified
      : purchaseState === 'cancelled'
        ? text.cancelled
        : purchaseState === 'failed'
          ? text.failed
          : null

  return (
    <section className="credits-page" aria-labelledby="credits-title">
      <header className="workspace-heading">
        <h1 id="credits-title">{text.title}</h1>
      </header>

      {loading && <p className="workspace-status" role="status">{locale === 'ru' ? 'Загружаем данные…' : 'Loading credit data…'}</p>}
      {loadError && (
        <div className="workspace-error">
          {loadError === 'generic' ? <Notice tone="error" role="alert">{text.errorGeneric}</Notice> : <ServiceNotice code={loadError} />}
          <Button variant="secondary" onClick={() => void loadAccountData()}>
            <RotateCw aria-hidden="true" strokeWidth={1.1} />
            {locale === 'ru' ? 'Повторить' : 'Retry'}
          </Button>
        </div>
      )}

      {snapshot && (
        <section className="credits-balance" aria-label={text.title}>
          <div className="credits-balance__numbers">
            <p><span>{text.available}</span><strong>{snapshot.available}</strong></p>
            <p><span>{text.reserved}</span><strong>{snapshot.reserved}</strong></p>
          </div>
          <div className="credits-capacity">
            <span>{text.capacity}</span>
            <strong>{text.used(snapshot.projectCapacity.used, snapshot.projectCapacity.total)}</strong>
          <button className="credits-text-button" onClick={() => void navigate(routes.projects())}>
              {text.openProjects}<ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
            </button>
          </div>
        </section>
      )}

      <section className="credits-section" aria-labelledby="credits-packs-title" aria-busy={packLoading}>
        <h2 id="credits-packs-title">{text.packs}</h2>
        {packError && (
          <div className="credits-pack-error" aria-busy={packLoading}>
            <Notice tone="error" role="alert">{text.packsError}</Notice>
            <Button variant="secondary" onClick={() => void retryPacks()} busy={packLoading} aria-busy={packLoading}>
              {packLoading ? text.packsLoading : text.retryPacks}
            </Button>
          </div>
        )}
        {packLoading && !loading && !packError && <p className="workspace-status" role="status">{text.packsLoading}</p>}
        {packs?.length === 0 && <p className="workspace-muted">{text.noPacks}</p>}
        {packs === null && !loading && !loadError && !packError && <p className="workspace-muted">{text.noPacks}</p>}
        <ul className="credits-pack-list">
          {packs?.map((pack) => (
            <li className="credits-pack" key={pack.id}>
              <div>
                <strong>{pack.credits} {locale === 'ru' ? 'кредитов' : 'credits'}</strong>
                <p className="credits-pack__amount">{text.mockAmount(formatPackAmount(pack, locale))}</p>
                {pack.note === 'synthetic-mock-scenario' && <p className="workspace-muted">{text.mockOnly}</p>}
              </div>
              {pack.note === 'synthetic-mock-scenario' && (
                <Button
                  variant="secondary"
                  onClick={() => void startCheckout(pack)}
                  disabled={action !== null || (purchaseState === 'pending' && intent?.packId === pack.id)}
                >
                  {text.startMock}
                </Button>
              )}
            </li>
          ))}
        </ul>
        {intent && (intent.purchase || unknownStart) && (
          <div className="credits-checkout" aria-live="polite">
            <p className={purchaseState === 'pending' || action === 'applying' ? 'credits-checkout__pending' : 'credits-checkout__result'}>
              {action === 'applying' ? text.verifying : purchaseMessage ?? (locale === 'ru' ? 'Статус покупки не подтверждён.' : 'The purchase status is not confirmed.')}
            </p>
            {purchaseState === 'pending' && <p className="workspace-muted">{text.pendingHelp}</p>}
            {purchaseState === 'pending' && (
              <div className="credits-checkout__actions">
                <Button variant="secondary" onClick={() => void simulate('pending')} disabled={action !== null || intent.simulationAttempt !== undefined}>{text.simulatePending}</Button>
                <Button onClick={() => void simulate('verified')} disabled={action !== null || intent.simulationAttempt !== undefined}>{text.simulateVerified}</Button>
                <Button variant="ghost" onClick={() => void simulate('cancelled')} disabled={action !== null || intent.simulationAttempt !== undefined}>{text.simulateCancelled}</Button>
                <Button variant="ghost" onClick={() => void simulate('failed')} disabled={action !== null || intent.simulationAttempt !== undefined}>{text.simulateFailed}</Button>
              </div>
            )}
            {(unknownStart || applyUnknown || intent.simulationAttempt || actionError === 'unknown-operation') && (
              <Button variant="secondary" onClick={() => void checkStatus()} disabled={action !== null}>
                {text.checkStatus}
              </Button>
            )}
            {actionError && actionError !== 'unknown-operation' && <ServiceNotice code={actionError} />}
          </div>
        )}
        {returnError && <Notice tone="warning">{text.returnUnavailable}</Notice>}
      </section>

      <section className="credits-section" aria-labelledby="credits-history-title">
        <h2 id="credits-history-title">{text.history}</h2>
        {history?.length === 0 && <p className="workspace-muted">{text.historyEmpty}</p>}
        {history && history.length > 0 && (
          <>
            <div className="credits-history__header" aria-hidden="true">
              <span>{locale === 'ru' ? 'Действие' : 'Activity'}</span>
              <span>{text.delta}</span>
              <span>{text.availableAfter}</span>
              <span>{text.reservedAfter}</span>
            </div>
            <ol className="credits-history">
              {visibleHistory.map((entry) => (
                <li key={entry.id} className="credits-history__row">
                  <div>
                    <strong>{text.entryKind[entry.kind]}</strong>
                    <time dateTime={new Date(entry.occurredAt).toISOString()}>
                      {new Date(entry.occurredAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </div>
                  <span>{entry.delta === null ? text.noValue : entry.delta > 0 ? `+${entry.delta}` : entry.delta}</span>
                  <span>{entry.availableAfter === null ? text.noValue : entry.availableAfter}</span>
                  <span>{entry.reservedAfter}</span>
                </li>
              ))}
            </ol>
            {historyCursor && (
              <div className="credits-history__more" aria-live="polite">
                {historyPageError && (
                  <p className="credits-history__error" role="alert">{text.historyPageError}</p>
                )}
                <Button
                  variant="ghost"
                  onClick={() => void loadOlderHistory()}
                  disabled={historyPageLoading}
                  aria-busy={historyPageLoading}
                >
                  {historyPageLoading ? text.historyLoading : historyPageError ? text.retryHistory : text.showMore}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </section>
  )
}
