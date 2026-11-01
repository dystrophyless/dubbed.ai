import fs from 'node:fs';
import path from 'node:path';

const run = process.argv[2];
if (!run) throw new Error('Usage: node summarize-evidence.mjs <run-directory>');
const report = JSON.parse(fs.readFileSync(path.join(run, 'evidence.json'), 'utf8'));
const metricNames = ['title', 'heading', 'dots', 'exit', 'media', 'dialogue', 'dialogueText', 'waveform', 'waveformMeta', 'controls', 'controlRow'];
const metrics = (capture) => Object.fromEntries(metricNames.map((key) => {
  const value = capture[key];
  return [key, value ? { x: value.x, y: value.y, width: value.width, height: value.height, bottom: value.bottom, radius: value.radius, padding: value.padding, gap: value.gap, font: value.font } : null];
}));
const keys = ['scrollX', 'scrollY', 'document', 'fontReady', 'video', 'longRuInjected', 'candidate', 'takeSelected', 'lineText'];
const captures = report.captures.map((capture) => ({
  image: capture.image,
  target: capture.target,
  state: capture.state,
  viewport: capture.viewport,
  ...Object.fromEntries(keys.map((key) => [key, capture[key]])),
  metrics: metrics(capture),
}));
const byKey = new Map(captures.map((capture) => [`${capture.target}|${capture.state}|${capture.viewport.name}`, capture]));
const pairs = [];
for (const layout of ['A', 'B']) for (const state of ['initial', 'candidate-your-take']) for (const viewport of ['desktop-1440x900', 'short-1280x600', 'phone-390x844']) {
  const reference = byKey.get(`prototype-${layout}|${state}|${viewport}`);
  const implementation = byKey.get(`app-${layout}|${state}|${viewport}`);
  if (!reference || !implementation) continue;
  const diffs = {};
  for (const key of ['title', 'heading', 'dots', 'exit', 'media', 'dialogue', 'dialogueText', 'waveform', 'waveformMeta', 'controls', 'controlRow']) {
    diffs[key] = {};
    for (const field of ['x', 'y', 'width', 'height']) {
      const a = reference.metrics[key]?.[field];
      const b = implementation.metrics[key]?.[field];
      if (typeof a === 'number' && typeof b === 'number') diffs[key][field] = Number((b - a).toFixed(2));
    }
  }
  pairs.push({ layout, state, viewport, referenceImage: reference.image, implementationImage: implementation.image, scroll: [reference.scrollX, reference.scrollY, implementation.scrollX, implementation.scrollY], document: [reference.document, implementation.document], geometryDelta: diffs, readiness: { reference: [reference.fontReady, reference.video.readyState, reference.video.width, reference.video.height], implementation: [implementation.fontReady, implementation.video.readyState, implementation.video.width, implementation.video.height] } });
}
const summary = {
  mode: report.mode,
  startedAt: report.startedAt,
  finishedAt: report.finishedAt,
  workspaceBaseHead: report.workspaceBaseHead ?? report.workspaceHead,
  browser: report.browser,
  browserTempPath: report.browserTempPath,
  captureCount: report.captures.length,
  stageResults: report.stages,
  longRussianFixture: report.longRussianFixture,
  captureReadiness: {
    allFontsReady: report.captures.every((capture) => capture.fontReady),
    allAtTop: report.captures.every((capture) => capture.scrollX === 0 && capture.scrollY === 0),
    allVideoReady: report.captures.every((capture) => capture.video.readyState >= 2 && capture.video.width > 0 && capture.video.height > 0),
    anyDocumentOverflow: report.captures.filter((capture) => capture.document.width > capture.viewport.width || capture.document.height > capture.viewport.height).map((capture) => ({ image: capture.image, viewport: capture.viewport.name, document: capture.document })),
  },
  pairs,
  captures,
};
process.stdout.write(JSON.stringify(summary, null, 2));
