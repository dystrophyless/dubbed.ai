import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const mediaDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/media');
const manifest = JSON.parse(await readFile(path.join(mediaDirectory, 'fixture-manifest.json'), 'utf8'));

async function bytesFor(asset) {
  return readFile(path.join(mediaDirectory, asset.fileName));
}

test('fixture manifest points to permitted local assets with matching byte identity', async () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.provenance.speechGenerator, /System\.Speech/);
  assert.match(manifest.provenance.videoGenerator, /Canvas \+ MediaRecorder/);

  for (const [key, asset] of Object.entries(manifest.assets)) {
    if (key === 'noData') {
      assert.equal(asset.status, 'absent');
      assert.equal(asset.asset, null);
      continue;
    }

    const bytes = await bytesFor(asset);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert.equal(bytes.length, asset.bytes, `${key} byte length`);
    assert.equal(hash, asset.sha256, `${key} SHA-256`);
    assert.equal(asset.url, manifest.fixtureUrls[key]);

    if (asset.container === 'ISO Base Media MP4') {
      assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', `${key} MP4 signature`);
      assert.match(asset.contentType, /^video\/mp4;codecs=/);
    } else {
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${key} WAVE signature`);
      assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', `${key} WAVE container`);
      assert.equal(asset.codec, 'PCM signed 16-bit little-endian');
    }
  }
});

test('source timeline preserves exact generated sample boundaries, dialogue, and overlap', () => {
  const timeline = manifest.dialogueTimeline;
  assert.ok(timeline.sampleRateHz > 0);
  assert.ok(timeline.sourceFrameCount > 0);
  assert.equal(timeline.sections.length, 3);
  assert.deepEqual(timeline.sections.map(({ quote }) => quote), [
    'A blue light is on.',
    'I hear it clearly.',
    'We can begin now.',
  ]);

  for (const section of timeline.sections) {
    assert.ok(Number.isInteger(section.startFrame));
    assert.ok(Number.isInteger(section.endFrameExclusive));
    assert.ok(section.endFrameExclusive > section.startFrame);
    assert.equal(section.startMs, section.startFrame * 1000 / timeline.sampleRateHz);
    assert.equal(section.endMs, section.endFrameExclusive * 1000 / timeline.sampleRateHz);
    assert.ok(section.endFrameExclusive <= timeline.sourceFrameCount);
  }

  const [first, second] = timeline.sections;
  assert.ok(timeline.overlap);
  assert.ok(timeline.overlap.startFrame >= second.startFrame);
  assert.ok(timeline.overlap.endFrameExclusive <= first.endFrameExclusive);
  assert.ok(timeline.overlap.endFrameExclusive > timeline.overlap.startFrame);
});

test('generations and scenario fixtures remain distinguishable without invented data', async () => {
  const generation1 = manifest.assets.resultGeneration1;
  const generation2 = manifest.assets.resultGeneration2;
  assert.notEqual(generation1.sha256, generation2.sha256);
  assert.notEqual(generation1.generatedTitleCard, generation2.generatedTitleCard);
  assert.equal(generation1.sourceWindowMs, generation2.sourceWindowMs);
  assert.equal(generation1.sourceWindowMs, manifest.assets.source.requestedCaptureWindowMs);
  assert.equal(generation1.selectedSectionId, generation2.selectedSectionId);
  assert.equal(generation1.selectedSectionPlacementStartMs, generation2.selectedSectionPlacementStartMs);
  assert.equal(generation1.sharesSynthetic110HzBackground, true);
  assert.equal(generation2.sharesSynthetic110HzBackground, true);
  assert.equal(generation1.productRendered, false);
  assert.equal(generation2.productRendered, false);

  assert.equal(manifest.assets.validSilence.recorderInputAudioTrackCount, 1);
  assert.equal(manifest.assets.validSilence.sourcePcmIsZeroed, true);
  assert.equal(manifest.assets.validSilencePcm.sourcePcmIsZeroed, true);
  const silencePcm = await bytesFor(manifest.assets.validSilencePcm);
  assert.ok(silencePcm.subarray(44).every((byte) => byte === 0));
  assert.equal(manifest.assets.noAudioTrack.recorderInputAudioTrackCount, 0);
  assert.equal(manifest.assets.usablePartial.simulated, true);
  assert.equal(manifest.assets.usablePartial.representsRealInterruptionRecovery, false);
  assert.equal(manifest.assets.shortSource.rejectionThresholdAssumed, false);
  assert.ok(manifest.assets.shortSource.requestedCaptureWindowMs < 1000);
  assert.equal(manifest.assets.noData.asset, null);

  const firstBytes = await bytesFor(generation1);
  const secondBytes = await bytesFor(generation2);
  assert.notDeepEqual(firstBytes, secondBytes);

  for (const asset of Object.values(manifest.assets).filter((entry) => entry.status !== 'absent')) {
    assert.ok(asset.browserMeasured, `${asset.fileName} has browser-measured metadata`);
    assert.deepEqual(Object.keys(asset.browserMeasured).sort(), ['Chromium', 'Firefox', 'WebKit']);
    assert.ok(Object.values(asset.browserMeasured).every((observation) => observation.metadataState === 'loaded'));
    assert.ok(Object.values(asset.browserMeasured).every((observation) => observation.durationSeconds > 0));
  }
  assert.equal(manifest.assets.validSilence.browserMeasured.Chromium.decodedAudioTrackCount, 1);
  assert.equal(manifest.assets.noAudioTrack.browserMeasured.Chromium.decodedAudioTrackCount, 0);
  assert.equal(manifest.assets.validSilencePcm.browserMeasured.Chromium.offlineAudioDecode.nonZeroSampleCount, 0);
});
