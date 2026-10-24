import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../../app/locale'
import type { FeatureScreenProps } from '../../app/screen-contract'
import type { OwnedProject, ProjectId, Services } from '../../services/contracts'
import { ProjectsScreen } from './ProjectsScreen'

const accountId = 'account-projects-test' as OwnedProject['accountId']

function makeProject(id: string, title: string): OwnedProject {
  return {
    id: id as ProjectId,
    accountId,
    revision: 1 as OwnedProject['revision'],
    title,
    titleSource: 'filename',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    lastActivityAt: 1_700_000_000_000,
    sourceId: `source-${id}` as OwnedProject['sourceId'],
    sourceRevision: 1 as OwnedProject['sourceRevision'],
    sourceDurationMs: 12_000,
    selection: { startMs: 0, endMs: 12_000, revision: 1 as OwnedProject['selection']['revision'] },
    preparationRevision: 1 as OwnedProject['preparationRevision'],
    state: 'uploaded',
  }
}

function ok<T>(data: T) {
  return { status: 'ok', replayed: false, data } as const
}

function makeProps(services: unknown, navigate = vi.fn()) {
  return {
    route: { kind: 'projects' },
    locale: 'en',
    identity: {
      status: 'signed-in',
      account: { id: accountId },
      session: { id: 'session-projects-test' },
    },
    signInIntent: { kind: 'new' },
    services: services as Services,
    navigate,
    refreshIdentity: vi.fn(),
    registerRouteExitGuard: vi.fn(() => () => undefined),
  } as unknown as FeatureScreenProps
}

function renderScreen(props: FeatureScreenProps) {
  return render(
    <LocaleProvider services={props.services} onAccountUpdated={vi.fn()}>
      <ProjectsScreen {...props} />
    </LocaleProvider>,
  )
}

describe('ProjectsScreen', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.setItem('dubbed.locale', 'en')
  })

  it('keeps service ordering and does not change activity while the list is read', async () => {
    const first = makeProject('project-first', 'First draft')
    const second = makeProject('project-second', 'Second draft')
    const recordOpened = vi.fn()
    const services = {
      projects: {
        list: vi.fn().mockResolvedValue(ok({
          projects: [first, second],
          capacity: { used: 2, total: 6 },
        })),
        recordOpened,
      },
    }

    renderScreen(makeProps(services))

    const firstHeading = await screen.findByRole('heading', { name: 'First draft' })
    const secondHeading = screen.getByRole('heading', { name: 'Second draft' })
    expect(firstHeading.compareDocumentPosition(secondHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByText('2 of 6 project slots used')).toBeInTheDocument()
    expect(recordOpened).not.toHaveBeenCalled()
  })

  it('reconciles an unknown Continue result and retries only the same operation when not started', async () => {
    const user = userEvent.setup()
    const project = makeProject('project-continue', 'Continue this draft')
    const recordOpened = vi.fn()
      .mockResolvedValueOnce({ status: 'unknown', error: { code: 'unknown-operation' } })
      .mockResolvedValueOnce(ok({ ...project, revision: 2 as OwnedProject['revision'], lastActivityAt: 1_700_000_000_100 }))
    const navigate = vi.fn().mockResolvedValue(undefined)
    const services = {
      projects: {
        list: vi.fn().mockResolvedValue(ok({ projects: [project], capacity: { used: 1, total: 6 } })),
        open: vi.fn().mockResolvedValue(ok(project)),
        recordOpened,
      },
      operations: {
        resolve: vi.fn().mockResolvedValue(ok({
          state: 'not-started',
          operationId: 'same-operation',
          safeToRetrySameId: true,
        })),
      },
    }

    renderScreen(makeProps(services, navigate))
    await user.click(await screen.findByRole('button', { name: 'Continue' }))
    await user.click(await screen.findByRole('button', { name: 'Check open status' }))

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(recordOpened).toHaveBeenCalledTimes(2)
    expect(recordOpened.mock.calls[0][0].operationId).toBe(recordOpened.mock.calls[1][0].operationId)
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ kind: 'new-dub' }))
  })

  it('keeps an overlong grapheme title editable and shows the localized limit before calling the service', async () => {
    const user = userEvent.setup()
    const project = makeProject('project-rename-limit', 'A draft')
    const rename = vi.fn()
    const services = {
      projects: {
        list: vi.fn().mockResolvedValue(ok({ projects: [project], capacity: { used: 1, total: 6 } })),
        rename,
      },
    }

    renderScreen(makeProps(services))
    await user.click(await screen.findByRole('button', { name: 'Rename project: A draft' }))
    const titleField = screen.getByRole('textbox', { name: 'Rename project' })
    fireEvent.change(titleField, { target: { value: `${'🎬'.repeat(99)}e\u0301x` } })
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Use 100 visible characters or fewer.')).toBeInTheDocument()
    expect(titleField).toBeEnabled()
    expect(rename).not.toHaveBeenCalled()
  })

  it('recovers a thrown rename call by checking status and retrying the same operation id', async () => {
    const user = userEvent.setup()
    const project = makeProject('project-rename-throw', 'A draft')
    const renamed = { ...project, title: 'Updated draft', revision: 2 as OwnedProject['revision'] }
    const rename = vi.fn().mockRejectedValueOnce(new Error('adapter failed')).mockResolvedValueOnce(ok(renamed))
    const services = {
      projects: {
        list: vi.fn()
          .mockResolvedValueOnce(ok({ projects: [project], capacity: { used: 1, total: 6 } }))
          .mockResolvedValue(ok({ projects: [renamed], capacity: { used: 1, total: 6 } })),
        rename,
      },
      operations: {
        resolve: vi.fn().mockResolvedValue(ok({
          state: 'not-started',
          operationId: 'same-rename-operation',
          safeToRetrySameId: true,
        })),
      },
    }

    renderScreen(makeProps(services))
    await user.click(await screen.findByRole('button', { name: 'Rename project: A draft' }))
    const titleField = screen.getByRole('textbox', { name: 'Rename project' })
    await user.clear(titleField)
    await user.type(titleField, 'Updated draft')
    await user.keyboard('{Enter}')

    await user.click(await screen.findByRole('button', { name: 'Check save status' }))
    expect(await screen.findByRole('heading', { name: 'Updated draft' })).toBeInTheDocument()
    expect(rename).toHaveBeenCalledTimes(2)
    expect(rename.mock.calls[0][0].operationId).toBe(rename.mock.calls[1][0].operationId)
  })

  it('reloads service ordering after rename updates project activity', async () => {
    const user = userEvent.setup()
    const recentlyActive = makeProject('project-recent', 'Recently active')
    const older = makeProject('project-older', 'Older project')
    const renamedOlder = {
      ...older,
      title: 'Renamed just now',
      revision: 2 as OwnedProject['revision'],
      lastActivityAt: recentlyActive.lastActivityAt + 1_000,
    }
    const list = vi.fn()
      .mockResolvedValueOnce(ok({ projects: [recentlyActive, older], capacity: { used: 2, total: 6 } }))
      .mockResolvedValue(ok({ projects: [renamedOlder, recentlyActive], capacity: { used: 2, total: 6 } }))
    const services = {
      projects: {
        list,
        rename: vi.fn().mockResolvedValue(ok(renamedOlder)),
      },
    }

    renderScreen(makeProps(services))
    await user.click(await screen.findByRole('button', { name: 'Rename project: Older project' }))
    const titleField = screen.getByRole('textbox', { name: 'Rename project' })
    await user.clear(titleField)
    await user.type(titleField, 'Renamed just now')
    await user.keyboard('{Enter}')

    const renamedHeading = await screen.findByRole('heading', { name: 'Renamed just now' })
    const recentHeading = screen.getByRole('heading', { name: 'Recently active' })
    expect(renamedHeading.compareDocumentPosition(recentHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('shows the impact before deletion and checks an unknown delete before retrying it', async () => {
    const user = userEvent.setup()
    const project = makeProject('project-delete', 'Project to delete')
    const deleteProject = vi.fn()
      .mockResolvedValueOnce({ status: 'unknown', error: { code: 'unknown-operation' } })
      .mockResolvedValueOnce(ok({ deleted: true, freedSlot: true }))
    const services = {
      projects: {
        list: vi.fn().mockResolvedValue(ok({ projects: [project], capacity: { used: 1, total: 6 } })),
        deletionImpact: vi.fn().mockResolvedValue(ok({
          projectId: project.id,
          title: project.title,
          sourceBytes: 42,
          acceptedTakeCount: 1,
          draftCount: 2,
          resultCount: 1,
        })),
        delete: deleteProject,
      },
      operations: {
        resolve: vi.fn().mockResolvedValue(ok({
          state: 'not-started',
          operationId: 'same-delete-operation',
          safeToRetrySameId: true,
        })),
      },
    }

    renderScreen(makeProps(services))
    const row = (await screen.findByRole('heading', { name: 'Project to delete' })).closest('.project-row') as HTMLElement
    await user.click(within(row).getByRole('button', { name: 'Actions for Project to delete' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete project' }))
    expect(await screen.findByText(/Source: 42 bytes/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Delete project$/ }))
    await user.click(await screen.findByRole('button', { name: 'Check deletion status' }))

    expect(deleteProject).toHaveBeenCalledTimes(2)
    expect(deleteProject.mock.calls[0][0].operationId).toBe(deleteProject.mock.calls[1][0].operationId)
  })

  it('limits the row menu to deletion and restores focus after dismiss and confirmation cancel', async () => {
    const user = userEvent.setup()
    const project = makeProject('project-menu-focus', 'Menu focus draft')
    const services = {
      projects: {
        list: vi.fn().mockResolvedValue(ok({ projects: [project], capacity: { used: 1, total: 6 } })),
        deletionImpact: vi.fn().mockResolvedValue(ok({
          projectId: project.id,
          title: project.title,
          sourceBytes: 42,
          acceptedTakeCount: 0,
          draftCount: 0,
          resultCount: 0,
        })),
        delete: vi.fn(),
      },
    }

    renderScreen(makeProps(services))
    const row = (await screen.findByRole('heading', { name: 'Menu focus draft' })).closest('.project-row') as HTMLElement
    const trigger = within(row).getByRole('button', { name: 'Actions for Menu focus draft' })

    await user.click(trigger)
    const menu = await screen.findByRole('menu')
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(1)
    expect(within(menu).getByRole('menuitem', { name: 'Delete project' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(services.projects.deletionImpact).not.toHaveBeenCalled()

    await user.keyboard('{ArrowDown}')
    const deleteItem = await screen.findByRole('menuitem', { name: 'Delete project' })
    expect(deleteItem).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: 'Delete this project?' })
    expect(services.projects.deletionImpact).toHaveBeenCalledWith(project.id)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(services.projects.delete).not.toHaveBeenCalled()
  })
})
