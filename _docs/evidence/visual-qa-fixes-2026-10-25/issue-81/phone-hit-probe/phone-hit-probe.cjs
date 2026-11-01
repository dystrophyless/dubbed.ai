const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('D:/Program/python/Dubbed/frontend/node_modules/@playwright/test')

const base = 'http://127.0.0.1:4581'
const output = __dirname
const report = {
  capturedAtUtc: new Date().toISOString(),
  viewport: { width: 390, height: 844 },
  scenario: 'controlled workspace-state-visual New Dub default, English',
  base,
  evidence: {},
}

async function waitForPresentedFrame(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector('.new-dub-preview__video')
    return video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
  }, null, { timeout: 20000 })
  const frame = await page.evaluate(async () => {
    const video = document.querySelector('.new-dub-preview__video')
    if (!video || typeof video.requestVideoFrameCallback !== 'function') return null
    video.muted = true
    const targetTime = Math.min(0.25, Math.max(0, video.duration / 2))
    if (Math.abs(video.currentTime - targetTime) > 0.01) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Video seek timed out.')), 5000)
        video.addEventListener('seeked', () => {
          clearTimeout(timer)
          resolve()
        }, { once: true })
        video.currentTime = targetTime
      })
    }
    await video.play()
    const presented = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Presented frame timed out.')), 8000)
      video.requestVideoFrameCallback((_now, metadata) => {
        clearTimeout(timer)
        resolve({ mediaTime: metadata.mediaTime, presentedFrames: metadata.presentedFrames })
      })
    })
    video.pause()
    return { ...presented, width: video.videoWidth, height: video.videoHeight, readyState: video.readyState }
  })
  assert.ok(frame && frame.presentedFrames > 0, 'A decoded preview frame must be present before collecting phone UI evidence.')
  return frame
}

async function geometry(page) {
  return page.evaluate(() => {
    const box = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect()
      return { x, y, width, height }
    }
    const wrapper = document.querySelector('.new-dub-range')
    const track = document.querySelector('.new-dub-range__track')
    const inputs = [...document.querySelectorAll('.new-dub-range input[type="range"]')]
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollY },
      range: box(wrapper),
      track: box(track),
      trackPointerEvents: getComputedStyle(track).pointerEvents,
      selectedBand: box(document.querySelector('.new-dub-range__selected')),
      handles: inputs.map((input) => {
        const rect = box(input)
        const value = Number(input.value)
        const min = Number(input.min)
        const max = Number(input.max)
        const width = 16
        return {
          label: input.getAttribute('aria-label'),
          min,
          max,
          step: Number(input.step),
          value,
          disabled: input.disabled,
          valueText: input.getAttribute('aria-valuetext'),
          rect,
          pointerEvents: getComputedStyle(input).pointerEvents,
          thumb: { renderedCssWidth: width, renderedCssHeight: 16, cssPointerEvents: 'auto (frozen stylesheet rule)' },
          thumbCenter: {
            x: rect.x + width / 2 + (max > min ? (value - min) / (max - min) * (rect.width - width) : 0),
            y: rect.y + rect.height / 2,
          },
        }
      }),
      domainLabels: [...document.querySelectorAll('.new-dub-range__domain span')].map((node) => node.textContent.trim()),
      selectionFields: [...document.querySelectorAll('.new-dub-selection__fields input')].map((input) => ({
        label: input.getAttribute('aria-label') || input.labels?.[0]?.textContent.trim(),
        value: input.value,
        min: input.min,
        max: input.max,
        step: input.step,
        rect: box(input),
      })),
    }
  })
}

async function hitGrid(page, label) {
  return page.evaluate((accessibleLabel) => {
    const input = [...document.querySelectorAll('.new-dub-range input[type="range"]')]
      .find((element) => element.getAttribute('aria-label') === accessibleLabel)
    if (!input) throw new Error('Range not found: ' + accessibleLabel)
    const rect = input.getBoundingClientRect()
    const width = 16
    const value = Number(input.value)
    const min = Number(input.min)
    const max = Number(input.max)
    const centerX = rect.x + width / 2 + (max > min ? (value - min) / (max - min) * (rect.width - width) : 0)
    const centerY = rect.y + rect.height / 2
    const offsets = [-24, -16, -12, -8, 0, 8, 12, 16, 24]
    const cells = []
    for (const dy of offsets) {
      for (const dx of offsets) {
        const x = centerX + dx
        const y = centerY + dy
        const hit = document.elementFromPoint(x, y)
        const hitClassName = hit && typeof hit.className === 'string' ? hit.className : hit?.tagName.toLowerCase()
        cells.push({
          dx,
          dy,
          insideInputBox: x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
          target: hit ? hitClassName : null,
          targetPointerEvents: hit ? getComputedStyle(hit).pointerEvents : null,
          isRangeInput: hit === input,
        })
      }
    }
    return {
      label: accessibleLabel,
      inputRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      thumbCenter: { x: centerX, y: centerY },
      offsets,
      cells,
      inputCells: cells.filter((cell) => cell.isRangeInput).length,
      insideInputCells: cells.filter((cell) => cell.insideInputBox).length,
    }
  }, label)
}

async function currentHandle(page, label) {
  return page.evaluate((accessibleLabel) => {
    const input = [...document.querySelectorAll('.new-dub-range input[type="range"]')]
      .find((element) => element.getAttribute('aria-label') === accessibleLabel)
    const rect = input.getBoundingClientRect()
    const width = 16
    const value = Number(input.value)
    const min = Number(input.min)
    const max = Number(input.max)
    return {
      value,
      min,
      max,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      thumbWidth: width,
      center: {
        x: rect.x + width / 2 + (max > min ? (value - min) / (max - min) * (rect.width - width) : 0),
        y: rect.y + rect.height / 2,
      },
    }
  }, label)
}

async function touchDrag(client, from, to) {
  const point = (x, y) => ({ x: Math.round(x), y: Math.round(y), id: 1, radiusX: 4, radiusY: 4, force: 1 })
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(from.x, from.y)] })
  const steps = 8
  for (let step = 1; step <= steps; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps)],
    })
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function readValue(page, label) {
  return page.evaluate((accessibleLabel) => [...document.querySelectorAll('.new-dub-range input[type="range"]')]
    .find((element) => element.getAttribute('aria-label') === accessibleLabel).value, label)
}

async function probe() {
  const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] })
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    })
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    const url = base + '/e2e/harness/workspace-state-visual.html?screen=newdub&scenario=default&locale=en'
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'New dub', exact: true }).waitFor()
    const startSlider = page.getByRole('slider', { name: 'Selection start', exact: true })
    await startSlider.waitFor()
    await startSlider.scrollIntoViewIfNeeded()
    await page.evaluate(() => {
      const rect = document.querySelector('.new-dub-range input[type="range"]').getBoundingClientRect()
      window.scrollBy(0, rect.top + rect.height / 2 - innerHeight / 2)
    })
    report.evidence.presentedMediaFrame = await waitForPresentedFrame(page)
    await page.evaluate(() => document.fonts.ready)
    report.evidence.initial = await geometry(page)
    assert.equal(report.evidence.initial.handles.length, 2)
    assert.equal(report.evidence.initial.handles[0].min, 0)
    assert.equal(report.evidence.initial.handles[1].min, 0)
    assert.equal(report.evidence.initial.handles[0].max, report.evidence.initial.handles[1].max)
    assert.equal(report.evidence.initial.handles[0].step, 1)
    assert.equal(report.evidence.initial.handles[1].step, 1)
    assert.equal(report.evidence.initial.domainLabels[0], '0.000 s')
    assert.equal(Number.parseFloat(report.evidence.initial.domainLabels[1]), report.evidence.initial.handles[0].max / 1000)
    assert.equal(report.evidence.initial.handles[0].rect.height, 48)
    assert.equal(report.evidence.initial.handles[1].rect.height, 48)
    report.evidence.initial.document = await page.evaluate(() => ({
      lang: document.documentElement.lang,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }))
    assert.ok(report.evidence.initial.handles.every((handle) => !handle.disabled))
    report.evidence.startHitGrid = await hitGrid(page, 'Selection start')
    report.evidence.endHitGrid = await hitGrid(page, 'Selection end')
    await page.screenshot({ path: path.join(output, 'phone-hit-probe-390x844-initial.png'), fullPage: true })

    const client = await context.newCDPSession(page)
    const startLabel = 'Selection start'
    const endLabel = 'Selection end'
    const startBefore = await currentHandle(page, startLabel)
    const startDx = Math.max(14, Math.round(startBefore.rect.width * 0.075))
    await touchDrag(client, startBefore.center, { x: startBefore.center.x + startDx, y: startBefore.center.y })
    const startAfterThumbDrag = Number(await readValue(page, startLabel))
    report.evidence.startThumbTouchDrag = {
      beforeMs: startBefore.value,
      afterMs: startAfterThumbDrag,
      pixelDelta: startDx,
      changed: startAfterThumbDrag !== startBefore.value,
    }
    assert.notEqual(startAfterThumbDrag, startBefore.value, 'The start boundary must respond to a touch drag on its visible thumb.')

    const endBefore = await currentHandle(page, endLabel)
    const endDx = Math.max(14, Math.round(endBefore.rect.width * 0.075))
    await touchDrag(client, endBefore.center, { x: endBefore.center.x - endDx, y: endBefore.center.y })
    const endAfterThumbDrag = Number(await readValue(page, endLabel))
    report.evidence.endThumbTouchDrag = {
      beforeMs: endBefore.value,
      afterMs: endAfterThumbDrag,
      pixelDelta: endDx,
      changed: endAfterThumbDrag !== endBefore.value,
    }
    assert.notEqual(endAfterThumbDrag, endBefore.value, 'The end boundary must respond to a touch drag on its visible thumb.')

    for (const [label, direction] of [[startLabel, 1], [endLabel, -1]]) {
      const handle = await currentHandle(page, label)
      const before = Number(await readValue(page, label))
      const offsetY = 20
      await touchDrag(client, handle.center, {
        x: handle.center.x + direction * 18,
        y: handle.center.y + offsetY,
      })
      const after = Number(await readValue(page, label))
      report.evidence['verticalOffset' + (label === startLabel ? 'Start' : 'End')] = {
        yOffsetWithin48pxBox: offsetY,
        beforeMs: before,
        afterMs: after,
        changed: after !== before,
        hit: await page.evaluate(({ x, y }) => {
          const target = document.elementFromPoint(x, y)
          return target ? {
            className: typeof target.className === 'string' ? target.className : target.tagName.toLowerCase(),
            tagName: target.tagName.toLowerCase(),
            pointerEvents: getComputedStyle(target).pointerEvents,
          } : null
        }, { x: handle.center.x, y: handle.center.y + offsetY }),
      }
    }

    const trackBefore = await currentHandle(page, startLabel)
    const endForTrack = await currentHandle(page, endLabel)
    const trackX = (trackBefore.center.x + endForTrack.center.x) / 2
    const trackY = trackBefore.center.y
    const trackStart = Number(await readValue(page, startLabel))
    const trackEnd = Number(await readValue(page, endLabel))
    const trackHit = await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y)
      return target ? {
        className: typeof target.className === 'string' ? target.className : target.tagName.toLowerCase(),
        tagName: target.tagName.toLowerCase(),
        pointerEvents: getComputedStyle(target).pointerEvents,
      } : null
    }, { x: trackX, y: trackY })
    await touchDrag(client, { x: trackX, y: trackY }, { x: trackX + 24, y: trackY })
    report.evidence.trackTouchDrag = {
      offsetWithin48pxBox: 0,
      hit: trackHit,
      startBeforeMs: trackStart,
      startAfterMs: Number(await readValue(page, startLabel)),
      endBeforeMs: trackEnd,
      endAfterMs: Number(await readValue(page, endLabel)),
      changedEitherBoundary: trackStart !== Number(await readValue(page, startLabel))
        || trackEnd !== Number(await readValue(page, endLabel)),
    }

    const afterTouchTests = {
      start: await currentHandle(page, startLabel),
      end: await currentHandle(page, endLabel),
    }
    const max = afterTouchTests.start.max
    const endBoundary = afterTouchTests.end.value
    const startTarget = endBoundary - 500
    const startBox = afterTouchTests.start.rect
    const startTargetX = startBox.x + afterTouchTests.start.thumbWidth / 2
      + (startTarget / max) * (startBox.width - afterTouchTests.start.thumbWidth)
    await touchDrag(client, afterTouchTests.start.center, { x: startTargetX, y: afterTouchTests.start.center.y })
    const startAtMinGap = Number(await readValue(page, startLabel))
    report.evidence.touchStartBoundaryReach = {
      attemptedStartMs: startTarget,
      endMs: endBoundary,
      expectedStartMs: endBoundary - 1000,
      actualStartMs: startAtMinGap,
      selectedMs: endBoundary - startAtMinGap,
      exactOneSecondReachableByThumbTouch: endBoundary - startAtMinGap === 1000,
    }

    const startRange = page.getByRole('slider', { name: startLabel, exact: true })
    await startRange.focus()
    await startRange.press('End')
    const startAtKeyboardMaximum = Number(await readValue(page, startLabel))
    report.evidence.keyboardStartRejectsInvalidBoundary = {
      endMs: endBoundary,
      attemptedStartMs: max,
      actualStartMs: startAtKeyboardMaximum,
      selectedMs: endBoundary - startAtKeyboardMaximum,
      boundaryUnchanged: startAtKeyboardMaximum === startAtMinGap,
      validationTextVisible: await page.evaluate(() => document.body.innerText.includes('Use a source-bounded interval')),
    }
    assert.equal(startAtKeyboardMaximum, startAtMinGap, 'An invalid keyboard boundary attempt must not move the start.')

    const startField = page.getByLabel('Start (seconds)', { exact: true })
    const endField = page.getByLabel('End (seconds)', { exact: true })
    const exactMinimumStart = endBoundary - 1000
    await startField.fill((exactMinimumStart / 1000).toFixed(3))
    await startField.press('Tab')
    const startAtExactMinimum = Number(await readValue(page, startLabel))
    report.evidence.exactOneSecondInterval = {
      startMs: startAtExactMinimum,
      endMs: endBoundary,
      selectedMs: endBoundary - startAtExactMinimum,
      startField: await startField.inputValue(),
      endField: await endField.inputValue(),
      displayedDuration: await page.locator('#new-dub-selection-duration').innerText(),
    }
    assert.equal(startAtExactMinimum, exactMinimumStart)
    assert.equal(endBoundary - startAtExactMinimum, 1000)

    await startRange.focus()
    await startRange.press('ArrowRight')
    const startAfterInvalidOneMsStep = Number(await readValue(page, startLabel))
    report.evidence.startBoundaryRejects999ms = {
      beforeMs: startAtExactMinimum,
      attemptedMs: startAtExactMinimum + 1,
      afterMs: startAfterInvalidOneMsStep,
      unchanged: startAfterInvalidOneMsStep === startAtExactMinimum,
      validationTextVisible: await page.evaluate(() => document.body.innerText.includes('Use a source-bounded interval')),
    }
    assert.equal(startAfterInvalidOneMsStep, startAtExactMinimum)

    const endRange = page.getByRole('slider', { name: endLabel, exact: true })
    await endRange.focus()
    await endRange.press('ArrowLeft')
    const endAfterInvalidOneMsStep = Number(await readValue(page, endLabel))
    report.evidence.endBoundaryRejects999ms = {
      startMs: startAtExactMinimum,
      beforeMs: endBoundary,
      attemptedMs: endBoundary - 1,
      afterMs: endAfterInvalidOneMsStep,
      unchanged: endAfterInvalidOneMsStep === endBoundary,
      validationTextVisible: await page.evaluate(() => document.body.innerText.includes('Use a source-bounded interval')),
    }
    assert.equal(endAfterInvalidOneMsStep, endBoundary)
    report.evidence.finalSelectionFields = await geometry(page)
    await page.screenshot({ path: path.join(output, 'phone-hit-probe-390x844-minimum-interval.png'), fullPage: true })
    await client.detach()
    await context.close()
  } finally {
    await browser.close()
  }
}

probe().then(() => {
  fs.writeFileSync(path.join(output, 'phone-hit-probe.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ capturedAtUtc: report.capturedAtUtc, output, evidence: Object.keys(report.evidence) }, null, 2))
}).catch((error) => {
  report.error = { name: error.name, message: error.message, stack: error.stack }
  fs.writeFileSync(path.join(output, 'phone-hit-probe-final-run.partial.json'), JSON.stringify(report, null, 2))
  console.error(error)
  process.exitCode = 1
})
