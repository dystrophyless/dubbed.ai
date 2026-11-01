const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
  const page = await browser.newPage();
  const proof = { capturedAtUtc: new Date().toISOString(), boundary: 'Public mock facade, isolated namespace, two explicitly injected clients in native Chromium; no real identity provider or user data.' };
  try {
    await page.goto('http://127.0.0.1:4283');
    proof.result = await page.evaluate(async () => {
      const { createServices } = await import('/src/services/index.ts');
      const namespace = 'root-registration-binding-' + crypto.randomUUID();
      const origin = createServices({ namespace, clientId: 'registration-owner' });
      const other = createServices({ namespace, clientId: 'unrelated-client' });
      const requestId = crypto.randomUUID();
      const pending = await origin.registration.start({ email: namespace + '@example.test', password: 'correct-horse', operationId: requestId });
      if (pending.status !== 'ok') throw new Error(JSON.stringify(pending));
      const foreignResolve = await other.registration.resolve({ requestId });
      const foreignVerify = await other.registration.verify({ requestId, code: pending.data.scenarioCode.value, operationId: crypto.randomUUID() });
      
      return { requestId, foreignResolve, foreignVerify };
    });
    proof.outcome = proof.result.foreignVerify.status === 'ok' ? 'cross-client-registration-verified' : 'foreign-client-rejected';
  } catch (error) { proof.outcome = 'execution-failed'; proof.failure = String(error); process.exitCode = 1; }
  finally {
    await fs.writeFile('D:/Program/python/Dubbed/_docs/evidence/frontend-implementation-2026-10-23/registration-client-binding-after-fix.json', JSON.stringify(proof, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify({ outcome: proof.outcome, failure: proof.failure, foreignVerify: proof.result?.foreignVerify.status, foreignResolve: proof.result?.foreignResolve.status }));
})();
