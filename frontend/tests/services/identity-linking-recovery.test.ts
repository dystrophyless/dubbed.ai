import { describe, expect, it } from 'vitest'
import type { AccountSnapshot, OwnedProject, Session, SignInIntent } from '../../src/services/contracts'
import { asRevision, ids } from '../../src/services/contracts'
import { openWorkspaceDatabase, runTransaction } from '../../src/services/indexeddb'
import { activeSessionMetaKey, type StoredAccount, type StoredCreditState, writeRecord } from '../../src/services/mock-store'
import { createServiceTestHarness, expectOk, operationId } from './test-support'

async function register(
  harness: ReturnType<typeof createServiceTestHarness>,
  email: string,
  password = 'correct-horse',
) {
  const requestId = operationId(`register-${email}`)
  expectOk(await harness.services.registration.start({ email, password, operationId: requestId }))
  return expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId(`verify-${email}`),
  }))
}

async function seedGoogleOnlyAccount(
  harness: ReturnType<typeof createServiceTestHarness>,
  email: string,
): Promise<StoredAccount> {
  const accountId = ids.account(`seed-account-${email}`)
  const session: Session = {
    id: ids.session(`seed-session-${harness.clientId}`),
    accountId,
    expiresAt: harness.now() + 60 * 60 * 1000,
    revision: asRevision(0),
  }
  const account: StoredAccount = {
    id: accountId,
    email,
    locale: 'en',
    revision: asRevision(0),
    deleted: false,
    createdAt: harness.now(),
    methods: [{ kind: 'google', address: email, verified: true, linkedAt: harness.now() }],
  }
  const creditState: StoredCreditState = {
    accountId,
    revision: asRevision(0),
    available: 0,
    reserved: 0,
    purchasedRemainder: 0,
    welcomeGrantEligible: false,
    welcomeGrantApplied: false,
    capacityUsed: 0,
    capacityTotal: 2,
    firstPurchaseUpgrade: false,
  }
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  await runTransaction(database, ['accounts', 'sessions', 'meta', 'creditStates'], 'readwrite', async (transaction) => {
    await writeRecord(transaction, 'accounts', account)
    await writeRecord(transaction, 'sessions', session)
    await writeRecord(transaction, 'meta', { key: activeSessionMetaKey({ clientId: harness.clientId } as never), value: session.id })
    await writeRecord(transaction, 'creditStates', creditState)
  })
  database.close()
  return account
}

async function seedProject(
  harness: ReturnType<typeof createServiceTestHarness>,
  account: AccountSnapshot,
  projectId: ReturnType<typeof ids.project>,
  state: OwnedProject['state'] = 'recording',
) {
  const project: OwnedProject = {
    id: projectId,
    accountId: account.id,
    revision: asRevision(1),
    title: 'Reset return fixture',
    titleSource: 'manual',
    createdAt: harness.now(),
    updatedAt: harness.now(),
    lastActivityAt: harness.now(),
    sourceId: ids.source(`source-${projectId}`),
    sourceRevision: asRevision(1),
    sourceDurationMs: 4_000,
    selection: { startMs: 0, endMs: 4_000, revision: asRevision(1) },
    preparationRevision: asRevision(1),
    state,
  }
  const database = await openWorkspaceDatabase(harness.factory, `dubbed.mock.v1.${harness.namespace}`)
  await runTransaction(database, ['projects'], 'readwrite', async (transaction) => writeRecord(transaction, 'projects', project))
  database.close()
}

describe('mock identity linking and recovery boundaries', () => {
  it('does not associate a candidate password before final review, then makes the verified secondary address usable', async () => {
    const harness = createServiceTestHarness()
    const original = await seedGoogleOnlyAccount(harness, 'canonical@example.test')
    const intent = expectOk(await harness.services.accountLinking.start({
      currentMethod: 'google',
      candidate: { method: 'email-password', email: 'secondary@example.test', password: 'linked-pass-8' },
      expectedAccountRevision: original.revision,
      operationId: operationId('link-secondary-password-start'),
    }))
    expect(intent.candidate).toMatchObject({ method: 'email-password', address: 'secondary@example.test' })

    const beforeCommit = expectOk(await harness.services.account.load())
    expect(beforeCommit.methods).toEqual(original.methods)
    const existingSession = expectOk(await harness.services.identity.current())
    expect(existingSession?.account.id).toBe(original.id)

    const currentProvider = expectOk(await harness.services.identity.google({
      purpose: 'link', intentId: intent.id, linkStep: 'current', operationId: operationId('link-secondary-current-google'),
    }))
    expect(currentProvider.providerProofId).toBeDefined()
    const currentProof = expectOk(await harness.services.accountLinking.proveCurrent({
      intentId: intent.id,
      providerProofId: currentProvider.providerProofId!,
      operationId: operationId('link-secondary-current-proof'),
    }))
    const candidateProof = expectOk(await harness.services.accountLinking.proveCandidate({
      intentId: intent.id,
      code: harness.verificationCode(intent.candidateVerificationRequestId!),
      operationId: operationId('link-secondary-candidate-proof'),
    }))

    const wrongPurpose = await harness.services.accountLinking.commit({
      intentId: intent.id,
      currentProofId: candidateProof.proofId,
      candidateProofId: currentProof.proofId,
      expectedAccountRevision: original.revision,
      operationId: operationId('link-secondary-wrong-proof-order'),
    })
    expect(wrongPurpose).toMatchObject({ status: 'error', error: { code: 'forbidden' } })
    expect(expectOk(await harness.services.account.load()).methods).toEqual(original.methods)

    const committed = expectOk(await harness.services.accountLinking.commit({
      intentId: intent.id,
      currentProofId: currentProof.proofId,
      candidateProofId: candidateProof.proofId,
      expectedAccountRevision: original.revision,
      operationId: operationId('link-secondary-commit'),
    }))
    expect(committed.state).toBe('completed')
    if (committed.state !== 'completed') throw new Error('Expected linking to complete after both proofs.')
    expect(committed.account.email).toBe('canonical@example.test')
    expect(committed.methods).toContainEqual(expect.objectContaining({ kind: 'email-password', address: 'secondary@example.test', verified: true }))

    expectOk(await harness.services.identity.signOut({ operationId: operationId('link-secondary-signout') }))
    const signedIn = expectOk(await harness.services.identity.signIn({
      email: 'secondary@example.test',
      password: 'linked-pass-8',
      operationId: operationId('link-secondary-signin'),
    }))
    expect(signedIn.account.id).toBe(original.id)
    expect(signedIn.account.email).toBe('canonical@example.test')

    const resetRequest = expectOk(await harness.services.passwordReset.start({
      email: 'secondary@example.test',
      operationId: operationId('link-secondary-reset-start'),
    }))
    const verifyId = operationId('link-secondary-reset-verify')
    await harness.queueUnknown(verifyId)
    expect(await harness.services.passwordReset.verify({
      requestId: resetRequest.id,
      code: harness.verificationCode(resetRequest.id),
      operationId: verifyId,
    })).toMatchObject({ status: 'unknown', operationId: verifyId })
    const recovered = expectOk(await harness.services.passwordReset.resolve({ requestId: resetRequest.id }))
    expect(recovered).toMatchObject({ state: 'verified', resetGrantId: expect.any(String) })
    const completedReset = expectOk(await harness.services.passwordReset.complete({
      resetGrantId: (recovered as { state: 'verified'; resetGrantId: ReturnType<typeof ids.operation> }).resetGrantId,
      newPassword: 'reset-password-8',
      operationId: operationId('link-secondary-reset-complete'),
    }))
    expect(completedReset.destination).toEqual({ kind: 'new-dub' })
    expect(completedReset.account.email).toBe('canonical@example.test')
  })

  it('does not accept an expired or another account’s proof set', async () => {
    const first = createServiceTestHarness()
    const registration = await register(first, 'proof-owner@example.test')
    const intent = expectOk(await first.services.accountLinking.start({
      currentMethod: 'email-password',
      candidate: { method: 'google' },
      expectedAccountRevision: registration.account.revision,
      operationId: operationId('proof-owner-link-start'),
    }))
    const currentProof = expectOk(await first.services.accountLinking.proveCurrent({
      intentId: intent.id,
      password: 'correct-horse',
      operationId: operationId('proof-owner-current'),
    }))
    const provider = expectOk(await first.services.identity.google({
      purpose: 'link', intentId: intent.id, linkStep: 'candidate', operationId: operationId('proof-owner-google-candidate'),
    }))
    const candidateProof = expectOk(await first.services.accountLinking.proveCandidate({
      intentId: intent.id,
      providerProofId: provider.providerProofId!,
      operationId: operationId('proof-owner-candidate'),
    }))

    const second = createServiceTestHarness({ factory: first.factory, namespace: first.namespace, clientId: 'second-client' })
    await register(second, 'other-account@example.test')
    expect(await second.services.accountLinking.commit({
      intentId: intent.id,
      currentProofId: currentProof.proofId,
      candidateProofId: candidateProof.proofId,
      expectedAccountRevision: registration.account.revision,
      operationId: operationId('other-account-link-commit'),
    })).toMatchObject({ status: 'error', error: { code: 'not-found' } })
    expect(expectOk(await first.services.account.load()).methods).toHaveLength(1)

    first.advance(5 * 60 * 1000 + 1)
    expect(await first.services.accountLinking.commit({
      intentId: intent.id,
      currentProofId: currentProof.proofId,
      candidateProofId: candidateProof.proofId,
      expectedAccountRevision: registration.account.revision,
      operationId: operationId('expired-proof-link-commit'),
    })).toMatchObject({ status: 'error', error: { code: 'expired' } })
    expect(expectOk(await first.services.account.load()).methods).toHaveLength(1)
  })

  it('reports a candidate method owned elsewhere without associating it', async () => {
    const first = createServiceTestHarness({ scenario: 'account-linking-google-owned-elsewhere' })
    const account = await register(first, 'method-linker@example.test')
    const second = createServiceTestHarness({ factory: first.factory, namespace: first.namespace, clientId: 'method-owner-client' })
    await register(second, 'google-owned-elsewhere@example.invalid')
    const intent = expectOk(await first.services.accountLinking.start({
      currentMethod: 'email-password',
      candidate: { method: 'google' },
      expectedAccountRevision: account.account.revision,
      operationId: operationId('owned-method-link-start'),
    }))
    const current = expectOk(await first.services.accountLinking.proveCurrent({
      intentId: intent.id,
      password: 'correct-horse',
      operationId: operationId('owned-method-current-proof'),
    }))
    const provider = expectOk(await first.services.identity.google({
      purpose: 'link', intentId: intent.id, linkStep: 'candidate', operationId: operationId('owned-method-google-proof'),
    }))
    const candidate = expectOk(await first.services.accountLinking.proveCandidate({
      intentId: intent.id,
      providerProofId: provider.providerProofId!,
      operationId: operationId('owned-method-candidate-proof'),
    }))
    const result = expectOk(await first.services.accountLinking.commit({
      intentId: intent.id,
      currentProofId: current.proofId,
      candidateProofId: candidate.proofId,
      expectedAccountRevision: account.account.revision,
      operationId: operationId('owned-method-link-commit'),
    }))
    expect(result.state).toBe('conflict')
    expect(expectOk(await first.services.account.load()).methods).toHaveLength(1)
  })

  it('preserves a validated project return through reset and recovers a lost verification grant only for its client', async () => {
    const first = createServiceTestHarness()
    const registered = await register(first, 'reset-intent@example.test')
    const projectId = ids.project('reset-owned-project')
    await seedProject(first, registered.account, projectId, 'recording')
    const returnIntent: SignInIntent = { kind: 'resume-project-screen', projectId, screen: 'record' }
    const request = expectOk(await first.services.passwordReset.start({
      email: 'reset-intent@example.test',
      returnIntent,
      operationId: operationId('reset-project-start'),
    }))
    const verifyId = operationId('reset-project-verify')
    await first.queueUnknown(verifyId)
    expect(await first.services.passwordReset.verify({
      requestId: request.id,
      code: first.verificationCode(request.id),
      operationId: verifyId,
    })).toMatchObject({ status: 'unknown' })

    const otherClient = createServiceTestHarness({ factory: first.factory, namespace: first.namespace, clientId: 'reset-other-client' })
    expect(expectOk(await otherClient.services.passwordReset.resolve({ requestId: request.id }))).toEqual({ state: 'not-found' })
    const recovered = expectOk(await first.services.passwordReset.resolve({ requestId: request.id }))
    expect(recovered).toMatchObject({ state: 'verified' })
    const result = expectOk(await first.services.passwordReset.complete({
      resetGrantId: (recovered as { state: 'verified'; resetGrantId: ReturnType<typeof ids.operation> }).resetGrantId,
      newPassword: 'reset-intent-new-8',
      operationId: operationId('reset-project-complete'),
    }))
    expect(result.destination).toEqual(returnIntent)

    const invalidProject = ids.project('not-owned-by-reset-account')
    await seedProject(first, registered.account, invalidProject, 'failed')
    const secondRequest = expectOk(await first.services.passwordReset.start({
      email: 'reset-intent@example.test',
      returnIntent: { kind: 'resume-project-screen', projectId: invalidProject, screen: 'record' },
      operationId: operationId('reset-invalid-project-start'),
    }))
    const secondGrant = expectOk(await first.services.passwordReset.verify({
      requestId: secondRequest.id,
      code: first.verificationCode(secondRequest.id),
      operationId: operationId('reset-invalid-project-verify'),
    }))
    const fallback = expectOk(await first.services.passwordReset.complete({
      resetGrantId: secondGrant.resetGrantId,
      newPassword: 'reset-invalid-project-8',
      operationId: operationId('reset-invalid-project-complete'),
    }))
    expect(fallback.destination).toEqual({ kind: 'new-dub' })
  })

  it('reconciles account deletion anonymously and prevents a deleted email from receiving another welcome grant', async () => {
    const harness = createServiceTestHarness()
    const first = await register(harness, 'delete-once@example.test')
    expect(first.credits.welcomeGrantApplied).toBe(true)
    const deleteId = operationId('delete-account-unknown')
    await harness.queueUnknown(deleteId)
    const deleteResult = await harness.services.account.delete({
      confirmation: 'delete',
      locale: 'en',
      expectedRevision: first.account.revision,
      operationId: deleteId,
    })
    if (deleteResult.status !== 'unknown') throw new Error(`Expected unknown account deletion, got ${JSON.stringify(deleteResult)}.`)
    expect(deleteResult).toMatchObject({ status: 'unknown', operationId: deleteId })
    expect(expectOk(await harness.services.identity.current())).toBeNull()
    expect(expectOk(await harness.services.account.resolveDelete({ operationId: deleteId }))).toEqual({
      state: 'completed', receipt: { deleted: true, purchasedRemainder: 0 },
    })

    const otherClient = createServiceTestHarness({ factory: harness.factory, namespace: harness.namespace, clientId: 'delete-other-client' })
    expect(expectOk(await otherClient.services.account.resolveDelete({ operationId: deleteId }))).toEqual({ state: 'unknown' })
    const recreated = await register(harness, 'delete-once@example.test')
    expect(recreated.outcome).toBe('new-account')
    expect(recreated.credits).toMatchObject({ welcomeGrantApplied: false, available: 0 })
  })

  it('adds a password to the same-email Google account without issuing a repeated grant', async () => {
    const harness = createServiceTestHarness()
    const original = await seedGoogleOnlyAccount(harness, 'google-primary@example.test')
    const requestId = operationId('google-add-password-start')
    expectOk(await harness.services.registration.start({
      email: 'google-primary@example.test',
      password: 'new-password-8',
      operationId: requestId,
    }))
    const verified = expectOk(await harness.services.registration.verify({
      requestId,
      code: harness.verificationCode(requestId),
      operationId: operationId('google-add-password-verify'),
    }))
    expect(verified).toMatchObject({ outcome: 'password-method-added', welcomeGrantApplied: false })
    expect(verified.account.email).toBe(original.email)
    expectOk(await harness.services.identity.signOut({ operationId: operationId('google-add-password-signout') }))
    const signedIn = expectOk(await harness.services.identity.signIn({
      email: original.email,
      password: 'new-password-8',
      operationId: operationId('google-add-password-signin'),
    }))
    expect(signedIn.account.id).toBe(original.id)
    expect(signedIn.account.email).toBe(original.email)
  })
})
