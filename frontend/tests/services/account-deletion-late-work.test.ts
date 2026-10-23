import { describe, expect, it } from 'vitest'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

describe('account deletion and late accepted work', () => {
  it('keeps deleted private workspace inaccessible after pending work becomes due and same-email registration is recreated', async () => {
    const owner = createServiceTestHarness()
    const otherClient = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      startTime: owner.now(),
    })
    const suffix = crypto.randomUUID()
    const email = `late-work-${suffix}@example.test`
    const password = 'correct-horse'
    const registrationId = operationId(`${suffix}-registration`)

    expectOk(await owner.services.registration.start({ email, password, operationId: registrationId }))
    const registration = expectOk(await owner.services.registration.verify({
      requestId: registrationId,
      code: owner.verificationCode(registrationId),
      operationId: operationId(`${suffix}-verify`),
    }))
    const originalAccountId = registration.account.id

    const ownerIdentity = expectOk(await owner.services.identity.current())
    const otherSignIn = expectOk(await otherClient.services.identity.signIn({
      email,
      password,
      operationId: operationId(`${suffix}-second-client-sign-in`),
    }))
    const otherIdentity = expectOk(await otherClient.services.identity.current())
    if (!ownerIdentity || !otherIdentity) throw new Error('Both explicit clients must have active sessions before deletion.')
    expect(ownerIdentity.account.id).toBe(originalAccountId)
    expect(otherSignIn.account.id).toBe(originalAccountId)
    expect(otherIdentity.account.id).toBe(originalAccountId)
    expect(otherIdentity.session.id).not.toBe(ownerIdentity.session.id)

    const upload = expectOk(await owner.services.uploads.commitInitial({
      file: fileWithBytes('synthetic-private-source.mp4', [1, 2, 3, 4]),
      facts: sourceFacts(8_625),
      operationId: operationId(`${suffix}-upload`),
    }))
    const quote = expectOk(await owner.services.preparation.quote({
      projectId: upload.project.id,
      expectedProjectRevision: upload.project.revision,
      expectedActivePreparationRevision: upload.project.preparationRevision,
      operationId: operationId(`${suffix}-quote`),
    }))
    const preparationOperationId = operationId(`${suffix}-preparation`)
    expectOk(await owner.services.preparation.start({
      quoteId: quote.id,
      expectedProjectRevision: upload.project.revision,
      expectedSourceRevision: upload.project.sourceRevision,
      expectedActivePreparationId: quote.activePreparationId,
      expectedActivePreparationRevision: quote.activePreparationRevision,
      acknowledgedDraftIds: quote.draftIdsToDeleteOnActivation,
      replacementAcknowledged: false,
      draftLossAcknowledged: false,
      explicitAuthorization: true,
      operationId: preparationOperationId,
    }))
    expect(expectOk(await owner.services.operations.resolve(preparationOperationId))).toMatchObject({
      state: 'pending',
      kind: 'preparation',
    })

    const currentSettings = expectOk(await owner.services.account.load())
    const deletionOperationId = operationId(`${suffix}-delete-account`)
    expectOk(await owner.services.account.delete({
      confirmation: 'DELETE',
      locale: 'en',
      expectedRevision: currentSettings.revision,
      operationId: deletionOperationId,
    }))
    expect(expectOk(await owner.services.identity.current())).toBeNull()
    expect(expectOk(await otherClient.services.identity.current())).toBeNull()

    owner.advance(10_000)
    const ownerAfterReload = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: owner.clientId,
      startTime: owner.now(),
    })
    const otherAfterReload = createServiceTestHarness({
      factory: owner.factory,
      namespace: owner.namespace,
      clientId: otherClient.clientId,
      startTime: owner.now(),
    })

    expect(expectOk(await ownerAfterReload.services.identity.current())).toBeNull()
    expect(expectOk(await otherAfterReload.services.identity.current())).toBeNull()
    expect(await ownerAfterReload.services.operations.resolve(preparationOperationId)).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.preparation.resolve({
      projectId: upload.project.id,
      targetOperationId: preparationOperationId,
    })).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.preparation.observe({
      projectId: upload.project.id,
      targetOperationId: preparationOperationId,
    })).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.projects.open(upload.project.id)).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.uploads.getSource(upload.project.id)).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.results.load(upload.project.id)).toMatchObject({ status: 'error' })

    const newRegistrationId = operationId(`${suffix}-new-registration`)
    expectOk(await ownerAfterReload.services.registration.start({
      email,
      password,
      operationId: newRegistrationId,
    }))
    const recreated = expectOk(await ownerAfterReload.services.registration.verify({
      requestId: newRegistrationId,
      code: ownerAfterReload.verificationCode(newRegistrationId),
      operationId: operationId(`${suffix}-new-verify`),
    }))
    expect(recreated.account.id).not.toBe(originalAccountId)
    expect(recreated.outcome).toBe('new-account')
    expect(recreated.welcomeGrantApplied).toBe(false)

    const freshCredits = expectOk(await ownerAfterReload.services.credits.snapshot())
    expect(freshCredits).toMatchObject({
      accountId: recreated.account.id,
      available: 0,
      reserved: 0,
      purchasedRemainder: 0,
      welcomeGrantEligible: false,
      welcomeGrantApplied: false,
      projectCapacity: { used: 0 },
    })
    expect(expectOk(await ownerAfterReload.services.projects.list()).projects).toHaveLength(0)
    expect(expectOk(await ownerAfterReload.services.credits.history()).filter((entry) => entry.kind === 'welcome-grant'))
      .toHaveLength(0)
    expect(expectOk(await ownerAfterReload.services.operations.resolve(preparationOperationId))).toMatchObject({
      state: 'not-started',
    })
    expect(await ownerAfterReload.services.projects.open(upload.project.id)).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.uploads.getSource(upload.project.id)).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.preparation.resolve({
      projectId: upload.project.id,
      targetOperationId: preparationOperationId,
    })).toMatchObject({ status: 'error' })
    expect(await ownerAfterReload.services.results.load(upload.project.id)).toMatchObject({ status: 'error' })
    expect(expectOk(await otherAfterReload.services.identity.current())).toBeNull()
  })
})
