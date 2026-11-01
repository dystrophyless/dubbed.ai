const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const root = __dirname;
const evidence = path.join(root, 'evidence');
const repoRoot = path.resolve(root, '../../../../');
const base = 'http://127.0.0.1:4579';
const proof = {
  issue: 79,
  capturedAt: new Date().toISOString(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim(),
  fixtureBoundary: 'Actual ResultScreen and CSS mounted in the existing controlled Result harness. The browser script intercepts only the served fixture module to inject one first-playback-descriptor failure, an assembling state, or an unknown download outcome. Synthetic MP4s are fixed fixtures; no accepted takes or custom uploads are rendered. No production adapter or OS-save guarantee is exercised.',
  fixtureModules: [],
  captures: [],
  assertions: [],
  errors: [],
};

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  });
  proof.browser = browser.version();
  let context;
  let page;
  let locale = 'en';
  let scenario = 'ready';

  async function resetFixturePage() {
    if (context) await context.close();
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    page = await context.newPage();
    page.on('pageerror', (error) => proof.errors.push(error.message));
    await page.addInitScript(() => {
      document.addEventListener('play', (event) => {
        if (event.target instanceof HTMLMediaElement) {
          event.target.muted = true;
          event.target.volume = 0;
        }
      }, true);
    });
    await page.route('**/e2e/harness/result.tsx*', async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(/locale:\s*["']en["']/, `locale: "${locale}"`);
    if (!body.includes(`locale: "${locale}"`)) throw new Error(`Could not set fixture locale ${locale}.`);

    if (scenario === 'unknown-download') {
      body = body.replace(
        /function terminalFailure\(\)[\s\S]*?(?=\r?\n\s*function generationFor)/,
        'function terminalFailure() { return {status:"unknown",operationId:"qa79-unknown-download",message:"Synthetic unknown request"}; }',
      );
      if (!body.includes('qa79-unknown-download')) throw new Error('Could not inject unknown download outcome into the controlled fixture.');
    }
    if (scenario === 'replacement') {
      const next = body.replace(/state:\s*["']complete["']/, 'state: "assembling"');
      if (next === body) throw new Error('Could not inject replacement assembly state into the controlled fixture.');
      body = next;
    }
    if (scenario === 'replacement-failure') {
      const next = body.replace(/state:\s*["']complete["']/, 'state: "failed"');
      if (next === body) throw new Error('Could not inject retained-result failure state into the controlled fixture.');
      body = next;
    }
    if (scenario === 'descriptor-retry') {
      body = body.replace(/const results\s*=\s*\{/, 'let qaDescriptorFailures = 1;\nconst results = {');
      body = body.replace(
        /async loadPlayback\(input\) \{/,
        'async loadPlayback(input) { window.__qaPlaybackCalls = [...(window.__qaPlaybackCalls || []), input.displayedGenerationId]; if (qaDescriptorFailures > 0) { qaDescriptorFailures -= 1; return errorResult(); }',
      );
    }

    proof.fixtureModules.push({ locale, scenario, url: route.request().url() });
    await route.fulfill({ response, body });
    });
  }

  async function capture(name, boundary) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return {
          text: element.innerText || element.getAttribute('aria-label'),
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          font: style.fontFamily,
          fontSize: style.fontSize,
          lineHeight: style.lineHeight,
          fontWeight: style.fontWeight,
          opacity: style.opacity,
          whiteSpace: style.whiteSpace,
          disabled: element.disabled,
          ariaBusy: element.getAttribute('aria-busy'),
          ariaDisabled: element.getAttribute('aria-disabled'),
          position: style.position,
          clip: style.clip,
        };
      };
      const video = document.querySelector('video');
      const stage = document.querySelector('.result-screen__stage');
      const actions = document.querySelector('.result-screen__actions');
      const hiddenStatus = document.querySelector('.sr-only');
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
        fonts: [...document.fonts].map((font) => ({ family: font.family, weight: font.weight, status: font.status })),
        buttons: [...document.querySelectorAll('button')].map(rect),
        headings: [...document.querySelectorAll('h1,h2')].map(rect),
        stage: stage ? rect(stage) : null,
        assembly: document.querySelector('.result-screen__assembly') ? rect(document.querySelector('.result-screen__assembly')) : null,
        failure: document.querySelector('.result-screen__failure') ? rect(document.querySelector('.result-screen__failure')) : null,
        actions: actions ? { ...rect(actions), buttons: [...actions.querySelectorAll('button')].map(rect) } : null,
        video: video ? { ...rect(video), src: video.getAttribute('src'), paused: video.paused, time: video.currentTime, error: video.error?.code } : null,
        progress: [...document.querySelectorAll('progress')].map((element) => ({ ...rect(element), value: element.value })),
        hiddenStatus: hiddenStatus ? { ...rect(hiddenStatus), visible: hiddenStatus.getClientRects().length > 0 } : null,
        bodyText: document.body.innerText,
      };
    });
    const file = `${name}.png`;
    await page.screenshot({ path: path.join(evidence, file), fullPage: false });
    proof.captures.push({ name, file: `evidence/${file}`, boundary, metrics });
    console.log(`${name}: width=${metrics.document.width}/${metrics.viewport.width}; stage=${metrics.stage?.height ?? 'none'}; video=${metrics.video?.height ?? 'none'}`);
    return metrics;
  }

  async function ready(name, nextLocale, width, height, nextScenario = 'ready') {
    locale = nextLocale;
    scenario = nextScenario;
    await resetFixturePage();
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/e2e/harness/result.html`);
    await page.locator('h1').waitFor();
    if (nextScenario === 'descriptor-retry') {
      await page.getByRole('button', { name: nextLocale === 'ru' ? 'Повторить воспроизведение' : 'Retry playback' }).waitFor();
    } else {
      await page.locator('video').waitFor();
    }
    return capture(name, `Seeded controlled Result harness; locale=${nextLocale}; state=${nextScenario}`);
  }

  async function deliveryState(name, nextLocale, width, height, deliveryScenario) {
    await resetFixturePage();
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/e2e/harness/result-delivery-state.html?scenario=${deliveryScenario}&locale=${nextLocale}`);
    await page.locator('h1').waitFor();
    return capture(name, `Existing synthetic result-delivery-state harness; locale=${nextLocale}; state=${deliveryScenario}`);
  }

  try {
    const readyMetrics = {};
    for (const nextLocale of ['en', 'ru']) {
      for (const [size, width, height] of [['desktop', 1440, 900], ['short', 1440, 700], ['phone', 390, 844]]) {
        readyMetrics[`${nextLocale}-${size}`] = await ready(`ready-${nextLocale}-${size}`, nextLocale, width, height);
      }
    }
    const desktopPrimary = readyMetrics['en-desktop'].buttons.find((button) => button.text.includes('Download MP4'));
    const phonePrimary = readyMetrics['en-phone'].buttons.find((button) => button.text.includes('Download MP4'));
    assert.equal(desktopPrimary?.height, 44);
    assert.equal(phonePrimary?.height, 48);
    proof.assertions.push('The prominent Result download uses the shared large 44px desktop role and retains the shared 48px phone target.');
    await ready('ready-ru-767', 'ru', 767, 844);
    await ready('ready-ru-768', 'ru', 768, 844);

    await deliveryState('assembly-unknown-en-desktop', 'en', 1440, 900, 'assembly-progress-untrusted');
    for (const nextLocale of ['en', 'ru']) {
      for (const [size, width, height] of [['short', 1440, 700], ['phone', 390, 844]]) {
        const initialAssembly = await deliveryState(
          'initial-assembly-' + nextLocale + '-' + size,
          nextLocale,
          width,
          height,
          'assembly-progress-untrusted',
        );
        assert.ok(initialAssembly.stage && initialAssembly.stage.height > 100);
        assert.equal(initialAssembly.assembly?.height, initialAssembly.stage.height);
        assert.equal(initialAssembly.video, null);

        const replacement = await ready('replacement-' + nextLocale + '-' + size, nextLocale, width, height, 'replacement');
        assert.match(replacement.bodyText, nextLocale === 'ru' ? /Предыдущая версия/ : /Previous version/);
        assert.ok(replacement.video);
        assert.equal(replacement.stage, null);
        assert.ok(replacement.assembly && replacement.assembly.height < 100);
        assert.ok(replacement.video.y < (size === 'short' ? 300 : 450));
        assert.equal(replacement.document.width, width);

        await ready('replacement-failure-seed-' + nextLocale + '-' + size, nextLocale, width, height, 'replacement-failure');
        await page.locator('video').evaluate(async (video) => { video.muted = true; await video.play(); });
        await page.evaluate(() => window.__controlledResultHarness.publishGeneration2());
        await page.getByRole('button', { name: nextLocale === 'ru' ? 'Смотреть новую' : 'Watch new', exact: true }).waitFor();
        await page.locator('.result-screen__failure').waitFor();
        const failure = await capture(
          'retained-result-failure-' + nextLocale + '-' + size,
          'Assembly failure with generation 1 playing while generation 2 is current; prior player remains dominant.',
        );
        assert.match(failure.bodyText, nextLocale === 'ru' ? /Предыдущая версия/ : /Previous version/);
        assert.ok(failure.video);
        assert.equal(failure.video.src, '/media/result-generation-001.mp4');
        assert.equal(failure.stage, null);
        assert.ok(failure.failure && failure.failure.height < 120);
        assert.ok(failure.video.y < (size === 'short' ? 300 : 450));
        assert.equal(failure.document.width, width);
      }
    }
    proof.assertions.push('Initial assembly without a displayed result keeps a stage footprint at English and Russian short desktop and phone sizes.');
    proof.assertions.push('Replacement assembly and retained-result failure stay compact beside the previous playable result at English and Russian short desktop and phone sizes; no second stage is rendered.');
    proof.assertions.push('The prior result remains playable, visibly labeled as the previous version, and keeps its media identity when replacement assembly or failure is shown.');
    await deliveryState('assembly-failure-ru-short', 'ru', 1440, 700, 'assembly-retry-unknown');

    await ready('descriptor-failure-en-desktop', 'en', 1440, 900, 'descriptor-retry');
    assert.equal(await page.locator('video').count(), 0);
    assert.match(await page.getByRole('alert').innerText(), /Version 1 could not be played/);
    assert.deepEqual(await page.evaluate(() => window.__qaPlaybackCalls), ['controlled-generation-001']);
    await page.getByRole('button', { name: 'Retry playback', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('video')?.getAttribute('src') === '/media/result-generation-001.mp4');
    assert.deepEqual(await page.evaluate(() => window.__qaPlaybackCalls), ['controlled-generation-001', 'controlled-generation-001']);
    const descriptorRecovery = await page.evaluate(() => window.__controlledResultHarness.snapshot());
    assert.equal(descriptorRecovery.assemblyCalls, 0);
    assert.equal(descriptorRecovery.creditCalls.length, 0);
    await capture('descriptor-recovered-en-desktop', 'First descriptor request fails, then Retry playback reloads the same generation; controlled fixture only.');
    proof.assertions.push('First descriptor failure shows a retryable error without a player; retry calls the same generation ID and makes no assembly or credit calls.');

    await ready('unknown-download-ru-phone', 'ru', 390, 844, 'unknown-download');
    await page.getByRole('button', { name: 'Скачать MP4', exact: true }).click();
    await page.evaluate(() => window.__controlledResultHarness.failFirstDownload());
    await page.getByRole('button', { name: 'Проверить и повторить скачивание версии 1', exact: true }).waitFor();
    const unknownMetrics = await capture('unknown-download-ru-phone-error', 'Unknown download result from controlled service fixture; original generation stays displayed.');
    assert.equal(unknownMetrics.document.width, 390);
    const recoveryAction = unknownMetrics.buttons.find((button) => button.text.includes('Проверить и повторить'));
    assert.ok(recoveryAction);
    assert.ok(recoveryAction.width <= 358);
    assert.equal(recoveryAction.whiteSpace, 'normal');
    proof.assertions.push('Russian unknown-download action wraps within the 390px phone content width; document scroll width remains 390px.');

    await ready('generation1-en-desktop', 'en', 1440, 900);
    await page.locator('video').evaluate(async (video) => { video.muted = true; await video.play(); });
    await page.waitForFunction(() => document.querySelector('video')?.currentTime > 0.15);
    await page.getByRole('button', { name: 'Download MP4', exact: true }).click();
    await page.evaluate(() => window.__controlledResultHarness.publishGeneration2());
    const watchNew = page.getByRole('button', { name: 'Watch new', exact: true });
    await watchNew.waitFor();
    const pendingButton = page.getByRole('button', { name: 'Preparing download…', exact: true });
    const pendingFacts = await pendingButton.evaluate((button) => ({
      disabled: button.disabled,
      ariaBusy: button.getAttribute('aria-busy'),
      opacity: getComputedStyle(button).opacity,
    }));
    assert.deepEqual(pendingFacts, { disabled: false, ariaBusy: 'true', opacity: '1' });
    assert.equal(await watchNew.isDisabled(), false);
    await capture('download-old-pending-watch-new-en-desktop', 'Version 1 request is pending while version 2 becomes ready; exact activation-time request ID is retained.');
    await watchNew.click();
    await page.waitForFunction(() => document.querySelector('video')?.getAttribute('src') === '/media/result-generation-002.mp4');
    assert.equal(await page.locator('video').evaluate((video) => video.paused && video.currentTime === 0), true);
    await capture('version2-displayed-version1-pending-en-desktop', 'Watch new switches the player while the generation-1 download remains pending.');

    const version2Download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download MP4', exact: true }).click();
    const version2File = await version2Download;
    proof.version2File = version2File.suggestedFilename();
    await page.waitForFunction(() => document.body.innerText.includes('Preparing download for version 1'));

    await page.evaluate(() => window.__controlledResultHarness.failFirstDownload());
    await page.getByRole('button', { name: 'Retry download version 1', exact: true }).waitFor();
    await capture('old-download-failed-after-switch-en-desktop', 'Generation-1 request failed after version 2 was displayed; retry retains version-1 identity.');
    const version1Retry = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Retry download version 1', exact: true }).click();
    const version1File = await version1Retry;
    proof.version1RetryFile = version1File.suggestedFilename();
    proof.generationJournal = await page.evaluate(() => window.__controlledResultHarness.snapshot());
    assert.deepEqual(proof.generationJournal.downloadCalls.map((call) => call.displayedGenerationId), [
      'controlled-generation-001', 'controlled-generation-002', 'controlled-generation-001',
    ]);
    assert.equal(proof.generationJournal.assemblyCalls, 0);
    assert.equal(proof.generationJournal.creditCalls.length, 0);
    await capture('exact-generation-retries-complete-en-desktop', 'Generation-1 retry completes after generation 2 was downloaded; no render or credit operation.');
    proof.assertions.push('While generation 1 is pending, Watch new remains available; generation 2 can be downloaded; generation 1 retry still requests generation 1; no assembly or credit calls. Browser download events prove request delivery only, not completed OS saving.');

    await ready('new-ready-ru-phone', 'ru', 390, 844);
    await page.locator('video').evaluate(async (video) => { video.muted = true; await video.play(); });
    await page.evaluate(() => window.__controlledResultHarness.publishGeneration2());
    await page.getByRole('button', { name: 'Смотреть новую', exact: true }).waitFor();
    await page.locator('.sr-only').waitFor();
    await capture('new-version-ready-while-playing-ru-phone', 'Generation 2 becomes ready while generation 1 is playing; shared sr-only utility contains the announcement.');
    proof.hiddenStatus = await page.locator('.sr-only').evaluate((element) => ({
      text: element.innerText,
      position: getComputedStyle(element).position,
      clip: getComputedStyle(element).clip,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      visible: element.getClientRects().length > 0,
    }));
    assert.equal(proof.hiddenStatus.position, 'absolute');
    assert.equal(proof.hiddenStatus.width, 1);
    assert.equal(proof.hiddenStatus.height, 1);
    assert.match(proof.hiddenStatus.text, /Новая версия готова/);
    proof.assertions.push('The new-version announcement uses the shared sr-only utility and contributes no visible duplicate line.');

    assert.equal(proof.errors.length, 0);
    proof.outcome = 'passed';
  } catch (error) {
    proof.errors.push(error.stack || String(error));
    proof.outcome = 'failed';
    console.error(error);
    process.exitCode = 1;
  } finally {
    await fs.mkdir(evidence, { recursive: true });
    await fs.writeFile(path.join(root, 'metrics.json'), JSON.stringify(proof, null, 2));
    await fs.writeFile(path.join(root, 'screenshot-manifest.json'), JSON.stringify(proof.captures.map(({ file, boundary }) => ({ file, boundary })), null, 2));
    await browser.close();
  }
})();
