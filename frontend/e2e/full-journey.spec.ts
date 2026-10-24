import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installBrowserDiagnostics } from './helpers/diagnostics.js'
import { captureAndAcceptVisibleTurn, continueThroughRecordingEntryGate, completeVisibleRegistration, setMillisecondSelectionAndQuote, startRegistrationFromLanding, uploadKnownSourceThroughUi } from './helpers/journey.js'
import { newE2ECredentials } from './helpers/identity.js'

async function withDiagnostics(
  page: Parameters<typeof installBrowserDiagnostics>[0],
  baseUrl: string | undefined,
  run: () => Promise<void>,
  additionalDiagnostics: Awaited<ReturnType<typeof installBrowserDiagnostics>>[] = [],
) {
  const diagnostics = await installBrowserDiagnostics(page, baseUrl ?? 'http://127.0.0.1:4173')
  try {
    await run()
  } finally {
    diagnostics.assertClean()
    for (const extra of additionalDiagnostics) extra.assertClean()
  }
}

async function inspectLoserTabFences(page: Parameters<typeof installBrowserDiagnostics>[0], projectId: string) {
  return page.evaluate(async (currentProjectId) => {
    const loadModule = (new Function('path', 'return import(path)') as (path: string) => Promise<any>)
    const [{ createServices }, { ids }] = await Promise.all([
      loadModule('/src/services/index.ts'),
      loadModule('/src/services/contracts.ts'),
    ])
    const services = createServices({ adapter: 'mock' })
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dubbed.mock.v1.default')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const getAll = (storeName: string) => new Promise<any[]>((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const [grants, operations] = await Promise.all([getAll('recordingGrants'), getAll('operations')])
    const ownerGrant = grants.find((grant) => grant.projectId === currentProjectId
      && grant.state === 'held-by-session' && grant.expiresAt > Date.now())
    if (!ownerGrant) throw new Error('The first tab has no live recording grant.')
    const ownerAcquire = operations.find((operation) => operation.kind === 'recording.acquire-access'
      && operation.result?.grantId === ownerGrant.grantId)
    if (!ownerAcquire) throw new Error('Could not find the first tab acquisition operation for its active grant.')
    const loaded = await services.recording.loadContext(currentProjectId)
    if (loaded.status !== 'ok') throw new Error(`Could not load project context: ${JSON.stringify(loaded)}`)
    const current = loaded.data
    const turn = current.turns[0]
    const sameOperationReplay = await services.recording.acquireAccess({
      projectId: currentProjectId,
      expectedProjectRevision: current.project.revision,
      operationId: ownerAcquire.id,
    })
    const acquisition = await services.recording.acquireAccess({
      projectId: currentProjectId,
      expectedProjectRevision: current.project.revision,
      operationId: crypto.randomUUID(),
    })
    const renew = await services.recording.renewAccess({
      projectId: currentProjectId,
      grantId: ownerGrant.grantId,
      expectedGrantRevision: ownerGrant.revision,
      expectedProjectRevision: current.project.revision,
      operationId: crypto.randomUUID(),
    })
    const release = await services.recording.releaseAccess({
      projectId: currentProjectId,
      grantId: ownerGrant.grantId,
      expectedGrantRevision: ownerGrant.revision,
      expectedProjectRevision: current.project.revision,
      operationId: crypto.randomUUID(),
    })
    const durationMs = Math.max(1, turn.windowEndMs - turn.windowStartMs)
    const candidate = {
      id: ids.candidate(`loser-${crypto.randomUUID()}`),
      projectId: currentProjectId,
      turnId: turn.id,
      mediaId: ids.media(`loser-${crypto.randomUUID()}`),
      processingRevision: turn.processingRevision,
      timingRevision: turn.timingRevision,
      revision: 0,
      audioTrackPresent: true,
      hasRecordedBytes: true,
      audioFrames: 'present',
      decodedDurationMs: durationMs,
      durationMs,
      accepted: false,
    }
    const blob = new Blob([new Uint8Array([7, 8, 9])], { type: 'audio/webm' })
    const persistDraft = await services.recording.persistDraft({
      projectId: currentProjectId,
      turnId: turn.id,
      candidate,
      blob,
      grantId: ownerGrant.grantId,
      expectedGrantRevision: ownerGrant.revision,
      expectedProjectRevision: current.project.revision,
      operationId: crypto.randomUUID(),
    })
    const acceptCandidate = await services.recording.acceptCandidate({
      projectId: currentProjectId,
      turnId: turn.id,
      candidate,
      blob,
      grantId: ownerGrant.grantId,
      expectedGrantRevision: ownerGrant.revision,
      expectedProjectRevision: current.project.revision,
      expectedTakeRevision: current.takeRevision,
      operationId: crypto.randomUUID(),
    })
    database.close()
    const summarize = (result: any) => ({
      status: result.status,
      code: result.status === 'error' ? result.error.code : result.status === 'conflict' ? result.code : undefined,
    })
    return {
      sameOperationReplay: summarize(sameOperationReplay),
      acquisition: summarize(acquisition),
      renew: summarize(renew),
      release: summarize(release),
      persistDraft: summarize(persistDraft),
      acceptCandidate: summarize(acceptCandidate),
    }
  }, projectId)
}

async function explicitlyReleaseOwnerGrant(page: Parameters<typeof installBrowserDiagnostics>[0], projectId: string) {
  return page.evaluate(async (currentProjectId) => {
    const loadModule = (new Function('path', 'return import(path)') as (path: string) => Promise<any>)
    const { createServices } = await loadModule('/src/services/index.ts')
    const services = createServices({ adapter: 'mock' })
    const readLiveGrant = async () => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('dubbed.mock.v1.default')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const grants = await new Promise<any[]>((resolve, reject) => {
        const request = database.transaction('recordingGrants', 'readonly').objectStore('recordingGrants').getAll()
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      database.close()
      return grants.find((grant) => grant.projectId === currentProjectId && grant.state === 'held-by-session')
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const grant = await readLiveGrant()
      if (!grant) throw new Error('The first tab grant is no longer held.')
      const loaded = await services.recording.loadContext(currentProjectId)
      if (loaded.status !== 'ok') throw new Error(`Could not load project context: ${JSON.stringify(loaded)}`)
      const released = await services.recording.releaseAccess({
        projectId: currentProjectId,
        grantId: grant.grantId,
        expectedGrantRevision: grant.revision,
        expectedProjectRevision: loaded.data.project.revision,
        operationId: crypto.randomUUID(),
      })
      if (released.status === 'ok') return released.data
      if (released.status !== 'conflict' || released.code !== 'revision-conflict') {
        throw new Error(`Could not explicitly release recording access: ${JSON.stringify(released)}`)
      }
    }
    throw new Error('Recording access kept changing before it could be explicitly released.')
  }, projectId)
}

test.describe('local mock product journey', () => {
  test('registers, saves a millisecond selection, records all lines, and downloads the displayed result generation', async ({ page, baseURL }) => {
    test.setTimeout(180_000)
    page.setDefaultTimeout(30_000)
    const additionalDiagnostics: Awaited<ReturnType<typeof installBrowserDiagnostics>>[] = []
    await withDiagnostics(page, baseURL, async () => {
      const credentials = newE2ECredentials('full-journey')
      const code = await startRegistrationFromLanding(page, credentials)
      await completeVisibleRegistration(page, code)

      // Account session and the current New dub route must survive a same-browser reload.
      await page.reload()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible()
      await uploadKnownSourceThroughUi(page)

      // The selected interval is explicitly set to millisecond precision before obtaining the quote.
      await setMillisecondSelectionAndQuote(page)
      await expect(page).toHaveURL(/\/new(?:$|[?#])/, { timeout: 2_000 })
      await page.getByRole('button', { name: 'Process for 9 credits', exact: true }).click()
      await continueThroughRecordingEntryGate(page)
      await expect(page.getByText('Accepted takes: 0 / 3', { exact: true })).toBeVisible()

      const projectId = new URL(page.url()).pathname.split('/')[2]
      const otherTab = await page.context().newPage()
      otherTab.setDefaultTimeout(30_000)
      additionalDiagnostics.push(await installBrowserDiagnostics(otherTab, baseURL ?? 'http://127.0.0.1:4173'))
      await otherTab.goto(page.url())
      await continueThroughRecordingEntryGate(otherTab)
      await expect(otherTab.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
      await expect(otherTab.getByRole('alert')).toContainText('Recording access could not be acquired. Retry by reopening this project.')
      await expect(otherTab.getByRole('button', { name: 'Record line', exact: true })).toBeDisabled()
      await expect(otherTab.getByRole('button', { name: 'Next line', exact: true })).toBeDisabled()
      await expect(page.getByRole('button', { name: 'Record line', exact: true })).toBeEnabled()
      await otherTab.screenshot({
        path: join(process.cwd(), '..', '_docs', 'evidence', 'frontend-final-policy-2026-10-25', 'recording-tab', 'held-elsewhere-en.png'),
        fullPage: true,
      })

      const loserResults = await inspectLoserTabFences(otherTab, projectId)
      expect(loserResults).toEqual({
        sameOperationReplay: { status: 'conflict', code: 'intent-conflict' },
        acquisition: { status: 'error', code: 'lease-held' },
        renew: { status: 'error', code: 'lease-held' },
        release: { status: 'error', code: 'lease-held' },
        persistDraft: { status: 'error', code: 'lease-held' },
        acceptCandidate: { status: 'error', code: 'lease-held' },
      })

      // The original owner remains able to capture and accept while the second tab is fenced out.
      await captureAndAcceptVisibleTurn(page)
      await expect(page.getByText('Accepted takes: 1 / 3', { exact: true })).toBeVisible()
      await expect(await explicitlyReleaseOwnerGrant(page, projectId)).toEqual({ released: true })

      // Retry explicitly by reopening the blocked tab after the old owner has released its grant.
      await otherTab.reload()
      await continueThroughRecordingEntryGate(otherTab)
      await expect(otherTab.getByRole('heading', { name: 'Record your voice' })).toBeVisible()
      await expect(otherTab.getByText('Accepted takes: 1 / 3', { exact: true })).toBeVisible()
      await expect(otherTab.getByRole('button', { name: 'Record line', exact: true })).toBeEnabled()

      // Save the unaccepted candidate as a durable draft and release the current tab grant.
      await otherTab.getByRole('button', { name: 'Record line', exact: true }).click()
      await expect(otherTab.getByText('Recorded audio frames were decoded. Next line saves this take and continues.', { exact: true }))
        .toBeVisible({ timeout: 30_000 })
      await otherTab.locator('.app-header .brand-link').click()
      const leaveDialog = otherTab.getByRole('dialog')
      await expect(leaveDialog).toBeVisible()
      await otherTab.getByRole('button', { name: 'Save and leave', exact: true }).click()
      await expect(leaveDialog).toBeHidden()

      const recordUrl = new URL(`/projects/${projectId}/record`, baseURL ?? 'http://127.0.0.1:4173').href
      await otherTab.goto(recordUrl)
      await continueThroughRecordingEntryGate(otherTab)
      const recoveredDraft = otherTab.getByRole('region', { name: 'Current draft recording' })
      await expect(recoveredDraft).toBeVisible()
      await expect(recoveredDraft.getByText('Draft saved. It has not been accepted as a take.', { exact: true })).toBeVisible()
      await otherTab.reload()
      await continueThroughRecordingEntryGate(otherTab)
      await expect(recoveredDraft).toBeVisible()
      const recordAction = otherTab.getByRole('button', { name: 'Record again', exact: true })
      if (await recordAction.isDisabled()) {
        await expect(otherTab.getByRole('alert')).toContainText('Recording access could not be acquired.')
        const priorLeaseExpiry = await otherTab.evaluate(async (currentProjectId) => {
          const database = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('dubbed.mock.v1.default')
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          const grants = await new Promise<any[]>((resolve, reject) => {
            const request = database.transaction('recordingGrants', 'readonly').objectStore('recordingGrants').getAll()
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
          database.close()
          const priorGrant = grants.find((grant) => grant.projectId === currentProjectId
            && grant.state === 'held-by-session' && grant.expiresAt > Date.now())
          if (!priorGrant) throw new Error('The blocked tab should observe the previous live grant until its lease expires.')
          return priorGrant.expiresAt as number
        }, projectId)
        await expect.poll(
          () => otherTab.evaluate((expiresAt) => Date.now() >= expiresAt, priorLeaseExpiry),
          { timeout: 60_000, intervals: [250, 500, 1_000] },
        ).toBe(true)
        await otherTab.reload()
        await continueThroughRecordingEntryGate(otherTab)
        await expect(recoveredDraft).toBeVisible()
      }
      await expect(recordAction).toBeEnabled()
      await expect(otherTab.getByRole('button', { name: 'Next line', exact: true })).toBeEnabled()
      await otherTab.getByRole('button', { name: 'Next line', exact: true }).click()
      await expect(otherTab.getByText('Accepted takes: 2 / 3', { exact: true })).toBeVisible()
      await expect(otherTab.getByText('Line 3 of 3', { exact: true })).toBeVisible()
      await captureAndAcceptVisibleTurn(otherTab)

      // Accepting the final missing take durably starts the initial assembly and opens Result.
      await expect(otherTab).toHaveURL(/\/projects\/[^/]+\/result$/, { timeout: 30_000 })
      await expect(otherTab.getByRole('heading', { name: 'Your result' })).toBeVisible()
      await expect(otherTab.getByText('Displayed generation: 1', { exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(otherTab.getByText('Synthetic fixture result; not rendered from accepted takes or a custom upload.', { exact: true })).toBeVisible()

      const video = otherTab.getByLabel('Finished dubbed video')
      await expect(video).toBeVisible()
      const displayedUrl = await video.evaluate((element) => (element as HTMLVideoElement).currentSrc)
      const displayedAssetPath = new URL(displayedUrl).pathname
      expect(displayedAssetPath).toMatch(/^\/media\/[a-z0-9-]+\.mp4$/i)

      const downloadStarted = otherTab.waitForEvent('download')
      await otherTab.getByRole('button', { name: 'Download MP4', exact: true }).click()
      const download = await downloadStarted
      expect(download.suggestedFilename()).toMatch(/\.mp4$/i)
      await expect(otherTab.getByText('Download requested.', { exact: true })).toBeVisible()

      const downloadPath = await download.path()
      expect(downloadPath).toBeTruthy()
      const [downloadedBytes, displayedFixtureBytes] = await Promise.all([
        readFile(downloadPath!),
        readFile(join(process.cwd(), 'public', displayedAssetPath.slice(1))),
      ])
      expect(createHash('sha256').update(downloadedBytes).digest('hex'))
        .toBe(createHash('sha256').update(displayedFixtureBytes).digest('hex'))

      const firstDisplayedSource = displayedUrl
      await otherTab.reload()
      await expect(otherTab.getByText('Displayed generation: 1', { exact: true })).toBeVisible()
      await expect(otherTab.getByLabel('Finished dubbed video')).toBeVisible()
      await expect.poll(async () => otherTab.getByLabel('Finished dubbed video').evaluate((element) => (element as HTMLVideoElement).currentSrc))
        .toBe(firstDisplayedSource)
    }, additionalDiagnostics)
  })

  test('restores an in-progress registration after reload without issuing another code', async ({ page, baseURL }) => {
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      const credentials = newE2ECredentials('registration-reload')
      const initialCode = await startRegistrationFromLanding(page, credentials)
      await page.reload()

      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible({ timeout: 15_000 })
      const deliveryNotice = page.getByText(/(?:Simulated code|Local mock code).*No email was sent\./i)
      await expect(deliveryNotice).toBeVisible()
      const restoredCode = (await deliveryNotice.innerText()).match(/\b\d{6}\b/)?.[0]
      expect(restoredCode).toBe(initialCode)
      await completeVisibleRegistration(page, restoredCode!)
    })
  })

  test('completes the explicitly synthetic Google registration path from the registration screen', async ({ page, baseURL }) => {
    page.setDefaultTimeout(20_000)
    await withDiagnostics(page, baseURL, async () => {
      await page.goto('/')
      await page.getByRole('button', { name: 'Start dubbing' }).click()
      await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible()
      await expect(page.getByText('Local preview only. No Google provider is contacted.', { exact: true })).toBeVisible()
      await page.getByRole('button', { name: 'Continue with Google', exact: true }).click()
      await expect(page.getByRole('heading', { name: 'New dub' })).toBeVisible({ timeout: 15_000 })
    })
  })
})
