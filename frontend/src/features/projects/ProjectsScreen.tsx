import { useCallback, useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowUpRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { FeatureScreenProps } from '../../app/screen-contract'
import { routes } from '../../app/routes'
import { Button, buttonVariants } from '../../components/ui/button'
import { TextField } from '../../components/ui/input'
import { Notice, ServiceNotice } from '../../components/ui/notice'
import type {
  OperationId,
  OwnedProject,
  ProjectId,
  ProjectCapacity,
  ServiceResult,
} from '../../services/contracts'
import { ids } from '../../services/contracts'
import { validateProjectTitle } from '../../services/project-title'
import type { ServiceProblemCode } from '../../i18n/service-errors'
import './ProjectsScreen.css'

type RenameError = ServiceProblemCode | 'title-empty' | 'title-too-long'

type Copy = {
  title: string
  loading: string
  retry: string
  emptyTitle: string
  emptyDescription: string
  newDub: string
  capacity: (used: number, total: number) => string
  activity: string
  state: Record<OwnedProject['state'], string>
  continue: string
  rename: string
  renameHint: string
  renameEmpty: string
  renameTooLong: string
  renameSaveFailed: string
  checkSave: string
  checkOpen: string
  delete: string
  actions: (title: string) => string
  deleteTitle: string
  deleteDescription: string
  deleteImpact: (sourceBytes: number, accepted: number, drafts: number, results: number) => string
  cancel: string
  confirmDelete: string
  deleting: string
  deleted: string
  deleteUnknown: string
  checkDelete: string
  openFailed: string
  projectUnavailable: string
}

const copy: Record<'en' | 'ru', Copy> = {
  en: {
    title: 'My projects',
    loading: 'Loading projects…',
    retry: 'Retry',
    emptyTitle: 'No projects yet',
    emptyDescription: 'Upload a video to save a draft and choose a scene.',
    newDub: 'New dub',
    capacity: (used, total) => `${used} of ${total} project slots used`,
    activity: 'Last activity',
    state: {
      uploaded: 'Draft',
      preparing: 'Processing',
      recording: 'Recording',
      assembling: 'Preparing result',
      ready: 'Ready',
      failed: 'Processing failed',
    },
    continue: 'Continue',
    rename: 'Rename project',
    renameHint: 'Press Enter to save, Escape to cancel, or leave the field to save.',
    renameEmpty: 'Enter a project title.',
    renameTooLong: 'Use 100 visible characters or fewer.',
    renameSaveFailed: 'The title was not saved. Your text is still here so you can retry.',
    checkSave: 'Check save status',
    checkOpen: 'Check open status',
    delete: 'Delete project',
    actions: (title) => `Actions for ${title}`,
    deleteTitle: 'Delete this project?',
    deleteDescription: 'This removes the project from this account. It does not create a refund or confirm physical erasure.',
    deleteImpact: (sourceBytes, accepted, drafts, results) => `Source: ${sourceBytes.toLocaleString('en')} bytes. Accepted takes: ${accepted}. Saved drafts: ${drafts}. Results: ${results}.`,
    cancel: 'Cancel',
    confirmDelete: 'Delete project',
    deleting: 'Deleting project…',
    deleted: 'Project deleted. Its project slot is available again.',
    deleteUnknown: 'The deletion result is not confirmed. Check its status before trying again.',
    checkDelete: 'Check deletion status',
    openFailed: 'The project could not be opened. Refresh the list and try again.',
    projectUnavailable: 'Project details could not be loaded.',
  },
  ru: {
    title: 'Мои проекты',
    loading: 'Загружаем проекты…',
    retry: 'Повторить',
    emptyTitle: 'Проектов пока нет',
    emptyDescription: 'Загрузите видео, чтобы сохранить черновик и выбрать сцену.',
    newDub: 'Новая озвучка',
    capacity: (used, total) => `Занято мест: ${used} из ${total}`,
    activity: 'Последняя активность',
    state: {
      uploaded: 'Черновик',
      preparing: 'Обработка',
      recording: 'Запись',
      assembling: 'Подготовка результата',
      ready: 'Готово',
      failed: 'Ошибка обработки',
    },
    continue: 'Продолжить',
    rename: 'Переименовать проект',
    renameHint: 'Enter — сохранить, Escape — отменить, выход из поля — сохранить.',
    renameEmpty: 'Введите название проекта.',
    renameTooLong: 'Используйте не более 100 видимых символов.',
    renameSaveFailed: 'Не удалось сохранить название. Введённый текст остался в поле.',
    checkSave: 'Проверить сохранение',
    checkOpen: 'Проверить открытие',
    delete: 'Удалить проект',
    actions: (title) => `Действия проекта: ${title}`,
    deleteTitle: 'Удалить этот проект?',
    deleteDescription: 'Проект будет удалён из аккаунта. Это не означает возврат средств или подтверждённое физическое удаление данных.',
    deleteImpact: (sourceBytes, accepted, drafts, results) => `Источник: ${sourceBytes.toLocaleString('ru')} байт. Принятые записи: ${accepted}. Черновики: ${drafts}. Результаты: ${results}.`,
    cancel: 'Отмена',
    confirmDelete: 'Удалить проект',
    deleting: 'Удаляем проект…',
    deleted: 'Проект удалён. Место для проекта освободилось.',
    deleteUnknown: 'Результат удаления не подтверждён. Проверьте статус перед новой попыткой.',
    checkDelete: 'Проверить удаление',
    openFailed: 'Не удалось открыть проект. Обновите список и попробуйте снова.',
    projectUnavailable: 'Не удалось загрузить данные проекта.',
  },
}

type RenameAttempt = { projectId: ProjectId; title: string; operationId: OperationId }
type DeleteAttempt = { project: OwnedProject; operationId: OperationId }
type ContinueAttempt = { project: OwnedProject; operationId: OperationId }
type DeleteImpact = {
  projectId: ProjectId
  title: string
  sourceBytes: number
  acceptedTakeCount: number
  draftCount: number
  resultCount: number
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

function returnCode(result: ServiceResult<unknown>): ServiceProblemCode {
  return problemCode(result) ?? 'unexpected'
}

function projectRoute(project: OwnedProject) {
  if (project.state === 'uploaded') return routes.newDub()
  if (project.state === 'recording') return routes.project(project.id, 'record')
  if (project.state === 'assembling' || project.state === 'ready') return routes.project(project.id, 'result')
  return routes.project(project.id, 'processing')
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

export function ProjectsScreen({ identity, locale, services, navigate, registerRouteExitGuard }: FeatureScreenProps) {
  const text = copy[locale]
  const account = identity.status === 'signed-in' ? identity.account : null
  const [projects, setProjects] = useState<OwnedProject[] | null>(null)
  const [capacity, setCapacity] = useState<ProjectCapacity | null>(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<ServiceProblemCode | null>(null)
  const [editingId, setEditingId] = useState<ProjectId | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [renameError, setRenameError] = useState<RenameError | null>(null)
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameUnknown, setRenameUnknown] = useState(false)
  const [continueBusy, setContinueBusy] = useState<ProjectId | null>(null)
  const [continueAttempt, setContinueAttempt] = useState<ContinueAttempt | null>(null)
  const [continueError, setContinueError] = useState<ServiceProblemCode | null>(null)
  const [deleteProject, setDeleteProject] = useState<OwnedProject | null>(null)
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null)
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<ServiceProblemCode | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteAttempt, setDeleteAttempt] = useState<DeleteAttempt | null>(null)
  const [renameAttempt, setRenameAttempt] = useState<RenameAttempt | null>(null)
  const [deletedNotice, setDeletedNotice] = useState(false)
  const ignoreBlur = useRef<{ kind: 'enter' | 'escape'; projectId: ProjectId; value?: string } | null>(null)
  const deleteMenuTriggersRef = useRef(new Map<ProjectId, HTMLButtonElement>())
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const skipDeleteFocusReturnRef = useRef(false)

  const loadProjects = useCallback(async () => {
    if (!account) return false
    setLoading(true)
    setListError(null)
    const result = await services.projects.list()
    setLoading(false)
    if (result.status !== 'ok') {
      setListError(returnCode(result))
      setProjects(null)
      setCapacity(null)
      return false
    }
    setProjects(result.data.projects)
    setCapacity(result.data.capacity)
    return true
  }, [account, services.projects])

  useEffect(() => { void loadProjects() }, [loadProjects])

  const applyRenamed = useCallback(async (updated: OwnedProject) => {
    setProjects((current) => current?.map((project) => project.id === updated.id ? updated : project) ?? null)
    setEditingId(null)
    setRenameError(null)
    setRenameUnknown(false)
    setRenameAttempt(null)
    ignoreBlur.current = { kind: 'enter', projectId: updated.id, value: updated.title }
    // The service owns the global activity sequence; reload its ordered list after a rename.
    await loadProjects()
  }, [loadProjects])

  const commitRename = useCallback(async (project: OwnedProject, title: string, attempt?: RenameAttempt) => {
    if (renameBusy || (renameUnknown && !attempt)) return false
    let validated: ReturnType<typeof validateProjectTitle>
    try {
      validated = validateProjectTitle(title)
    } catch {
      setRenameError('unexpected')
      return false
    }
    if (!validated.valid) {
      setRenameError(validated.reason === 'empty' ? 'title-empty' : 'title-too-long')
      return false
    }
    const normalized = validated.value
    if (normalized === project.title) {
      setEditingId(null)
      setRenameError(null)
      return true
    }
    const existing = attempt ?? (renameAttempt?.projectId === project.id && renameAttempt.title === normalized
      ? renameAttempt
      : { projectId: project.id, title: normalized, operationId: randomOperationId() })
    setRenameAttempt(existing)
    setRenameBusy(true)
    setRenameError(null)
    let result: Awaited<ReturnType<typeof services.projects.rename>>
    try {
      result = await services.projects.rename({
        projectId: project.id,
        title: normalized,
        expectedRevision: project.revision,
        operationId: existing.operationId,
      })
    } catch {
      setRenameBusy(false)
      setRenameUnknown(true)
      setRenameError('unknown-operation')
      return false
    }
    setRenameBusy(false)
    if (result.status === 'ok') {
      await applyRenamed(result.data)
      return true
    }
    if (result.status === 'unknown') {
      setRenameUnknown(true)
      setRenameError('unknown-operation')
      return false
    }
    setRenameError(problemCode(result))
    setRenameAttempt(null)
    setRenameUnknown(false)
    if (result.status === 'conflict') void loadProjects()
    return false
  }, [applyRenamed, loadProjects, renameAttempt, renameBusy, renameUnknown, services.projects])

  const reconcileRename = useCallback(async () => {
    const attempt = renameAttempt
    if (!attempt) return
    setRenameBusy(true)
    let result: Awaited<ReturnType<typeof services.operations.resolve<OwnedProject>>>
    try {
      result = await services.operations.resolve<OwnedProject>(attempt.operationId)
    } catch {
      setRenameBusy(false)
      setRenameError('unknown-operation')
      return
    }
    setRenameBusy(false)
    if (result.status !== 'ok') {
      setRenameError(returnCode(result))
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      const project = projects?.find((item) => item.id === attempt.projectId)
      if (!project) return
      setRenameUnknown(false)
      await commitRename(project, attempt.title, attempt)
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      await applyRenamed(result.data.result)
    } else if (result.data.state === 'rejected') {
      setRenameUnknown(false)
      setRenameError(result.data.error?.code ?? 'unexpected')
    } else {
      setRenameError('unknown-operation')
    }
  }, [applyRenamed, commitRename, projects, renameAttempt, services.operations])

  const finishContinue = useCallback(async (opened: OwnedProject, attempt: ContinueAttempt) => {
    setProjects((current) => current?.map((item) => item.id === opened.id ? opened : item) ?? null)
    setContinueAttempt({ ...attempt, project: opened })
    if (opened.state === 'uploaded' && !storeActiveProject(account!.id, opened.id)) {
      setContinueBusy(null)
      setContinueError('storage-unavailable')
      return
    }
    try {
      await navigate(projectRoute(opened))
      setContinueAttempt(null)
      setContinueError(null)
    } catch {
      setContinueError('unexpected')
    } finally {
      setContinueBusy(null)
    }
  }, [account, navigate])

  const recordContinue = useCallback(async (attempt: ContinueAttempt) => {
    setContinueAttempt(attempt)
    setContinueBusy(attempt.project.id)
    setContinueError(null)
    const result = await services.projects.recordOpened({
      projectId: attempt.project.id,
      expectedRevision: attempt.project.revision,
      operationId: attempt.operationId,
    })
    if (result.status === 'ok') {
      await finishContinue(result.data, attempt)
      return
    }
    setContinueBusy(null)
    if (result.status === 'unknown') {
      setContinueError('unknown-operation')
      return
    }
    setContinueAttempt(null)
    setContinueError(problemCode(result))
    if (result.status === 'conflict') await loadProjects()
  }, [finishContinue, loadProjects, services.projects])

  const reconcileContinue = useCallback(async () => {
    if (!continueAttempt || continueBusy) return
    setContinueBusy(continueAttempt.project.id)
    const result = await services.operations.resolve<OwnedProject>(continueAttempt.operationId)
    if (result.status !== 'ok') {
      setContinueBusy(null)
      setContinueError(returnCode(result))
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      await recordContinue(continueAttempt)
      return
    }
    if (result.data.state === 'committed' && result.data.result) {
      await finishContinue(result.data.result, continueAttempt)
      return
    }
    setContinueBusy(null)
    if (result.data.state === 'rejected') {
      setContinueAttempt(null)
      setContinueError(result.data.error?.code ?? 'unexpected')
    } else {
      setContinueError('unknown-operation')
    }
  }, [continueAttempt, continueBusy, finishContinue, recordContinue, services.operations])

  const continueProject = useCallback(async (project: OwnedProject) => {
    if (continueAttempt || continueBusy) return
    setContinueBusy(project.id)
    setContinueError(null)
    const openResult = await services.projects.open(project.id)
    if (openResult.status !== 'ok') {
      setContinueBusy(null)
      setContinueError(problemCode(openResult))
      return
    }
    const attempt = { project: openResult.data, operationId: randomOperationId() }
    await recordContinue(attempt)
  }, [continueAttempt, continueBusy, recordContinue, services.projects])

  const openDelete = useCallback(async (project: OwnedProject) => {
    deleteTriggerRef.current = deleteMenuTriggersRef.current.get(project.id) ?? null
    setDeleteProject(project)
    setDeleteImpact(null)
    setDeleteImpactLoading(true)
    setDeleteError(null)
    const result = await services.projects.deletionImpact(project.id)
    setDeleteImpactLoading(false)
    if (result.status === 'ok') setDeleteImpact(result.data)
    else setDeleteError(problemCode(result))
  }, [services.projects])

  const removeProject = useCallback((projectId: ProjectId) => {
    skipDeleteFocusReturnRef.current = true
    setProjects((current) => current?.filter((project) => project.id !== projectId) ?? null)
    setDeleteProject(null)
    setDeleteImpact(null)
    setDeleteAttempt(null)
    setDeleteError(null)
    setDeletedNotice(true)
  }, [])

  const confirmDelete = useCallback(async (attempt?: DeleteAttempt) => {
    const project = attempt?.project ?? deleteProject
    if (!project || deleteBusy || (deleteAttempt && !attempt)) return
    const current = attempt ?? { project, operationId: randomOperationId() }
    setDeleteAttempt(current)
    setDeleteBusy(true)
    setDeleteError(null)
    const result = await services.projects.delete({
      projectId: project.id,
      expectedRevision: project.revision,
      operationId: current.operationId,
    })
    setDeleteBusy(false)
    if (result.status === 'ok') {
      removeProject(project.id)
      await loadProjects()
    } else if (result.status === 'unknown') {
      setDeleteError('unknown-operation')
    } else {
      setDeleteError(problemCode(result))
      setDeleteAttempt(null)
      if (result.status === 'conflict') {
        setDeleteProject(null)
        await loadProjects()
      }
    }
  }, [deleteAttempt, deleteBusy, deleteProject, loadProjects, removeProject, services.projects])

  const reconcileDelete = useCallback(async () => {
    if (!deleteAttempt) return
    setDeleteBusy(true)
    const result = await services.operations.resolve<{ deleted: true; freedSlot: true }>(deleteAttempt.operationId)
    setDeleteBusy(false)
    if (result.status !== 'ok') {
      setDeleteError(returnCode(result))
      return
    }
    if ('state' in result.data && result.data.state === 'not-started') {
      await confirmDelete(deleteAttempt)
      return
    }
    if (result.data.state === 'committed') {
      removeProject(deleteAttempt.project.id)
      await loadProjects()
    } else if (result.data.state === 'rejected') {
      setDeleteError(result.data.error?.code ?? 'unexpected')
      setDeleteAttempt(null)
    } else {
      setDeleteError('unknown-operation')
    }
  }, [confirmDelete, deleteAttempt, loadProjects, removeProject, services.operations])

  const guard = useCallback(async () => {
    if (!editingId || !projects) return true
    const project = projects.find((item) => item.id === editingId)
    if (!project || draftTitle.trim() === project.title) return true
    return commitRename(project, draftTitle)
  }, [commitRename, draftTitle, editingId, projects])

  useEffect(() => {
    if (!editingId) return
    return registerRouteExitGuard(guard)
  }, [editingId, guard, registerRouteExitGuard])

  if (!account) return null

  const deleteUnknown = deleteAttempt !== null && !deleteBusy

  return (
    <section className="projects-page" aria-labelledby="projects-title">
      <header className="workspace-heading">
        <div>
          <h1 id="projects-title">{text.title}</h1>
          {capacity && <p className="projects-capacity">{text.capacity(capacity.used, capacity.total)}</p>}
        </div>
        <Button variant="secondary" onClick={() => void navigate(routes.newDub())}>
          <ArrowUpRight aria-hidden="true" strokeWidth={1.1} />
          {text.newDub}
        </Button>
      </header>

      {deletedNotice && <Notice>{text.deleted}</Notice>}
      {loading && <p className="workspace-status" role="status">{text.loading}</p>}
      {listError && (
        <div className="workspace-error">
          <ServiceNotice code={listError} />
          <Button variant="secondary" onClick={() => void loadProjects()}>{text.retry}</Button>
        </div>
      )}
      {continueError && (
        <div className="workspace-error">
          <ServiceNotice code={continueError} />
          {continueAttempt && !continueBusy && (
            <Button variant="secondary" onClick={() => void reconcileContinue()}>{text.checkOpen}</Button>
          )}
        </div>
      )}

      {!loading && !listError && projects?.length === 0 && (
        <div className="projects-empty">
          <h2>{text.emptyTitle}</h2>
          <p>{text.emptyDescription}</p>
          <Button onClick={() => void navigate(routes.newDub())}>{text.newDub}</Button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <ul className="projects-list">
          {projects.map((project) => {
            const isEditing = editingId === project.id
            return (
              <li className="project-row" key={project.id}>
                <div className="project-row__main">
                  {isEditing ? (
                    <div className="project-rename">
                      <TextField
                        label={text.rename}
                        value={draftTitle}
                        autoFocus
                        hint={text.renameHint}
                        error={
                          renameError === 'title-empty' ? text.renameEmpty
                            : renameError === 'title-too-long' ? text.renameTooLong
                              : renameError && renameError !== 'unknown-operation' ? text.renameSaveFailed
                                : undefined
                        }
                        disabled={renameBusy || renameUnknown}
                        onChange={(event) => {
                          setDraftTitle(event.currentTarget.value)
                          if (renameAttempt?.title !== event.currentTarget.value.trim()) setRenameAttempt(null)
                          setRenameError(null)
                          ignoreBlur.current = null
                        }}
                        onBlur={() => {
                          const ignore = ignoreBlur.current
                          if (ignore?.projectId === project.id && (ignore.kind === 'escape' || ignore.value === draftTitle.trim())) {
                            ignoreBlur.current = null
                            return
                          }
                          void commitRename(project, draftTitle)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            ignoreBlur.current = { kind: 'enter', projectId: project.id, value: draftTitle.trim() }
                            void commitRename(project, draftTitle)
                          } else if (event.key === 'Escape') {
                            event.preventDefault()
                            ignoreBlur.current = { kind: 'escape', projectId: project.id }
                            setDraftTitle(project.title)
                            setEditingId(null)
                            setRenameError(null)
                            setRenameUnknown(false)
                            setRenameAttempt(null)
                          }
                        }}
                      />
                      {renameUnknown && (
                        <Button variant="secondary" size="small" onClick={() => void reconcileRename()} disabled={renameBusy}>
                          {text.checkSave}
                        </Button>
                      )}
                      {renameError && renameError !== 'title-empty' && renameError !== 'title-too-long' && (
                        <ServiceNotice code={renameError} />
                      )}
                    </div>
                  ) : (
                    <div className="project-row__title">
                      <h2>{project.title}</h2>
                      <span className="project-state">{text.state[project.state]}</span>
                    </div>
                  )}
                  <p className="project-activity">
                    <span>{text.activity}</span>
                    <time dateTime={new Date(project.lastActivityAt).toISOString()}>
                      {new Date(project.lastActivityAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })}
                    </time>
                  </p>
                </div>
                <div className="project-row__actions">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${text.rename}: ${project.title}`}
                      onClick={() => {
                        setEditingId(project.id)
                        setDraftTitle(project.title)
                        setRenameError(null)
                        setRenameUnknown(false)
                      }}
                      disabled={continueBusy === project.id || continueAttempt !== null || deleteBusy}
                    ><Pencil aria-hidden="true" strokeWidth={1.1} /></Button>
                  )}
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => void continueProject(project)}
                    disabled={continueBusy !== null || continueAttempt !== null || deleteBusy || renameBusy || renameUnknown || isEditing}
                  >
                    {continueBusy === project.id ? (locale === 'ru' ? 'Открываем…' : 'Opening…') : text.continue}
                  </Button>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger
                      type="button"
                      ref={(element) => {
                        if (element) deleteMenuTriggersRef.current.set(project.id, element)
                        else deleteMenuTriggersRef.current.delete(project.id)
                      }}
                      data-slot="button"
                      data-variant="ghost"
                      data-size="icon"
                      className={buttonVariants({ variant: 'ghost', size: 'icon', className: 'project-row-menu__trigger' })}
                      aria-label={text.actions(project.title)}
                      disabled={continueBusy !== null || continueAttempt !== null || deleteBusy || renameBusy || renameUnknown || isEditing}
                    ><MoreHorizontal aria-hidden="true" strokeWidth={1.1} /></DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className="project-row-menu__content" align="end" sideOffset={4}>
                        <DropdownMenu.Item
                          className="project-row-menu__item"
                          disabled={continueBusy !== null || continueAttempt !== null || deleteBusy || renameBusy || renameUnknown || isEditing}
                          onSelect={() => void openDelete(project)}
                        ><Trash2 aria-hidden="true" strokeWidth={1.1} />{text.delete}</DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog.Root open={deleteProject !== null} onOpenChange={(open) => {
        if (!open && !deleteBusy && !deleteAttempt) {
          setDeleteProject(null)
          setDeleteError(null)
        }
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="project-dialog__overlay" />
          <Dialog.Content
            className="project-dialog"
            aria-describedby="project-delete-description"
            onCloseAutoFocus={(event) => {
              if (skipDeleteFocusReturnRef.current) {
                skipDeleteFocusReturnRef.current = false
                event.preventDefault()
                return
              }
              const trigger = deleteTriggerRef.current
              if (!trigger?.isConnected || trigger.disabled) return
              event.preventDefault()
              trigger.focus()
            }}
          >
            <Dialog.Title className="project-dialog__title">{text.deleteTitle}</Dialog.Title>
            <Dialog.Description id="project-delete-description" className="project-dialog__description">
              {text.deleteDescription}
            </Dialog.Description>
            {deleteProject && <p className="project-dialog__name">{deleteProject.title}</p>}
            {deleteImpactLoading && <p role="status">{locale === 'ru' ? 'Проверяем проект…' : 'Checking project…'}</p>}
            {deleteImpact && <p className="project-dialog__impact">{text.deleteImpact(deleteImpact.sourceBytes, deleteImpact.acceptedTakeCount, deleteImpact.draftCount, deleteImpact.resultCount)}</p>}
            {deleteError && <ServiceNotice code={deleteError} />}
            {deleteUnknown && <Notice tone="warning">{text.deleteUnknown}</Notice>}
            <div className="project-dialog__actions">
              <Dialog.Close asChild>
                <Button variant="secondary" disabled={deleteBusy || deleteAttempt !== null}>{text.cancel}</Button>
              </Dialog.Close>
              {deleteUnknown ? (
                <Button variant="destructive" onClick={() => void reconcileDelete()} disabled={deleteBusy}>{text.checkDelete}</Button>
              ) : (
                <Button variant="destructive" onClick={() => void confirmDelete()} disabled={deleteBusy || deleteImpactLoading || !deleteImpact}>
                  {deleteBusy ? text.deleting : text.confirmDelete}
                </Button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}
