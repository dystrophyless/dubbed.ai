import { describe, expect, it } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { createServiceTestHarness, expectOk, fileWithBytes, operationId, sourceFacts } from './test-support'

async function register(harness: ReturnType<typeof createServiceTestHarness>) {
  const requestId = operationId('checkout-register')
  expectOk(await harness.services.registration.start({
    email: 'checkout@example.test',
    password: 'correct-horse',
    operationId: requestId,
  }))
  expectOk(await harness.services.registration.verify({
    requestId,
    code: harness.verificationCode(requestId),
    operationId: operationId('checkout-register-verify'),
  }))
}

describe('synthetic hosted-checkout service flow', () => {
  it('reconciles durable outcomes, requires verified proof to post credits, and preserves optional origin', async () => {
    const harness = createServiceTestHarness({ factory: new IDBFactory() })
    await register(harness)

    const standaloneInitiation = operationId('standalone-purchase')
    const standalone = expectOk(await harness.services.credits.startPurchase({
      packId: 'mock-pack-20',
      initiationId: standaloneInitiation,
      operationId: operationId('standalone-purchase-start'),
    }))
    expect(standalone).toMatchObject({ state: 'pending' })
    expect(standalone.returnContextId).toBeUndefined()

    const pending = expectOk(await harness.services.credits.simulateCheckout({
      purchaseId: standalone.purchaseId,
      outcome: 'pending',
      operationId: operationId('checkout-remains-pending'),
    }))
    expect(pending).toMatchObject({ outcome: 'pending', note: 'synthetic-mock-scenario' })
    expect(pending).not.toHaveProperty('verificationId')

    const verificationOperation = operationId('checkout-verified-unknown')
    await harness.queueUnknown(verificationOperation)
    const unknown = await harness.services.credits.simulateCheckout({
      purchaseId: standalone.purchaseId,
      outcome: 'verified',
      operationId: verificationOperation,
    })
    expect(unknown.status).toBe('unknown')

    const reconciled = expectOk(await harness.services.credits.resolvePurchase({ initiationId: standaloneInitiation }))
    expect(reconciled.purchase).toMatchObject({ state: 'verified', note: 'synthetic-mock-scenario' })
    expect(reconciled.purchase.returnContextId).toBeUndefined()
    expect(reconciled.purchase.verificationId).toBeTruthy()
    expect(reconciled.snapshot).toMatchObject({ available: 120, purchasedRemainder: 0 })

    const forged = await harness.services.credits.applyVerifiedPurchase({
      purchaseId: standalone.purchaseId,
      verificationId: operationId('forged-checkout-proof'),
      operationId: operationId('apply-forged-checkout'),
    })
    expect(forged.status).toBe('error')
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 120, purchasedRemainder: 0 })

    const verificationId = reconciled.purchase.verificationId!
    expectOk(await harness.services.credits.applyVerifiedPurchase({
      purchaseId: standalone.purchaseId,
      verificationId,
      operationId: operationId('apply-verified-checkout'),
    }))
    expectOk(await harness.services.credits.applyVerifiedPurchase({
      purchaseId: standalone.purchaseId,
      verificationId,
      operationId: operationId('apply-verified-checkout-again'),
    }))
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 140, purchasedRemainder: 20 })

    const { project } = expectOk(await harness.services.uploads.commitInitial({
      file: fileWithBytes('checkout-origin.mp4', [1, 2, 3]),
      title: 'Checkout origin',
      facts: sourceFacts(),
      operationId: operationId('checkout-origin-upload'),
    }))
    const origin = expectOk(await harness.services.credits.createReturnContext({
      projectId: project.id,
      sourceId: project.sourceId,
      selection: project.selection,
      operationId: operationId('checkout-origin-context'),
    }))
    const cancelledInitiation = operationId('origin-cancelled-purchase')
    const cancelled = expectOk(await harness.services.credits.startPurchase({
      packId: 'mock-pack-20',
      initiationId: cancelledInitiation,
      returnContextId: origin.returnContextId,
      operationId: operationId('origin-cancelled-start'),
    }))
    expect(cancelled.returnContextId).toBe(origin.returnContextId)
    const cancellation = expectOk(await harness.services.credits.simulateCheckout({
      purchaseId: cancelled.purchaseId,
      outcome: 'cancelled',
      operationId: operationId('origin-checkout-cancelled'),
    }))
    expect(cancellation).toMatchObject({ outcome: 'cancelled', note: 'synthetic-mock-scenario' })
    expect(cancellation).not.toHaveProperty('verificationId')
    const cancelledResolved = expectOk(await harness.services.credits.resolvePurchase({ initiationId: cancelledInitiation }))
    expect(cancelledResolved.purchase.returnContextId).toBe(origin.returnContextId)
    expect(expectOk(await harness.services.credits.resolveReturnContext({ returnContextId: origin.returnContextId }))).toMatchObject({
      valid: true,
      projectId: project.id,
    })
    expect(expectOk(await harness.services.credits.snapshot())).toMatchObject({ available: 140, purchasedRemainder: 20 })

    const failedInitiation = operationId('failed-purchase')
    const failed = expectOk(await harness.services.credits.startPurchase({
      packId: 'mock-pack-20',
      initiationId: failedInitiation,
      operationId: operationId('failed-purchase-start'),
    }))
    const failure = expectOk(await harness.services.credits.simulateCheckout({
      purchaseId: failed.purchaseId,
      outcome: 'failed',
      operationId: operationId('checkout-failed'),
    }))
    expect(failure).toMatchObject({ outcome: 'failed' })
    expect(failure).not.toHaveProperty('verificationId')
    expect(expectOk(await harness.services.credits.history()).filter((entry) => entry.kind === 'verified-purchase')).toHaveLength(1)
  })
})
