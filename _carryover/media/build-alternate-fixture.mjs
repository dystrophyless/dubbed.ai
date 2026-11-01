import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = join(frontendRoot, '..');
const prototypeMedia = join(repoRoot, 'prototypes', 'core-journey-lowfi', 'public', 'media');
const mediaRoot = join(frontendRoot, 'public', 'media');
const sourcePath = join(mediaRoot, 'scene.mp4');
const takePaths = ['take-0.wav', 'take-1.wav', 'take-2.wav'].map((name) => join(prototypeMedia, name));
const expectedSourceHash = 'c99eada0a03cb9f4a2ab41641a81ce6b74f628bc15ded4b3319a43c3fc9d766c';
const sourceBytes = await readFile(sourcePath);
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
if (sourceHash !== expectedSourceHash) throw new Error(`Unexpected source media hash: ${sourceHash}`);

const takes = await Promise.all(takePaths.map((path) => readFile(path)));
const server = createServer((request, response) => {
  if (request.url === '/scene.mp4') {
    response.writeHead(200, { 'content-type': 'video/mp4', 'content-length': sourceBytes.length, 'access-control-allow-origin': '*' });
    createReadStream(sourcePath).pipe(response);
    return;
  }
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  response.end('<!doctype html><meta charset="utf-8"><title>Fixture encoder</title><video id="source" src="/scene.mp4" muted playsinline></video>');
});
server.listen(0, '127.0.0.1');
await new Promise((resolve, reject) => {
  server.once('listening', resolve);
  server.once('error', reject);
});

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const result = await page.evaluate(async (takeBase64) => {
    const video = document.querySelector('#source');
    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise((resolve, reject) => {
        video.addEventListener('loadedmetadata', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('Could not decode the supplied source video.')), { once: true });
      });
    }
    if (video.videoWidth !== 960 || video.videoHeight !== 408) throw new Error('Source dimensions did not match the approved fixture.');
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 408;
    const painter = canvas.getContext('2d');
    const videoStream = canvas.captureStream(30);
    const audioContext = new AudioContext();
    const audioDestination = audioContext.createMediaStreamDestination();
    const decodeBase64 = (value) => {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      return bytes.buffer;
    };
    const buffers = await Promise.all(takeBase64.map((take) => audioContext.decodeAudioData(decodeBase64(take))));
    const mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error(`MediaRecorder cannot encode ${mimeType}.`);
    const combined = new MediaStream([...videoStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond: 1800000, audioBitsPerSecond: 128000 });
    const chunks = [];
    const stopped = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data); });
      recorder.addEventListener('stop', resolve, { once: true });
      recorder.addEventListener('error', (event) => reject(event.error ?? new Error('MediaRecorder failed.')), { once: true });
    });
    await video.play();
    recorder.start(500);
    const startAt = audioContext.currentTime + 0.1;
    const offsets = [0.4, 5.5, 8.9];
    buffers.forEach((buffer, index) => {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioDestination);
      source.start(startAt + offsets[index]);
    });
    const startWall = performance.now();
    const draw = () => {
      painter.drawImage(video, 0, 0, 960, 408);
      if (performance.now() - startWall < 13400) requestAnimationFrame(draw);
    };
    draw();
    await new Promise((resolve) => setTimeout(resolve, 13600));
    recorder.stop();
    await stopped;
    const blob = new Blob(chunks, { type: recorder.mimeType });
    video.pause();
    combined.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    }
    return { mimeType: blob.type, bytes: blob.size, data: btoa(binary), sourceDuration: video.duration };
  }, takes.map((take) => take.toString('base64')));

  const output = Buffer.from(result.data, 'base64');
  if (output.length < 100000 || !result.mimeType.includes('webm')) throw new Error('Alternate fixture output was unexpectedly small or not WebM.');
  await mkdir(mediaRoot, { recursive: true });
  const outputPath = join(mediaRoot, 'result-generation-002.webm');
  await writeFile(outputPath, output);
  const hash = createHash('sha256').update(output).digest('hex');
  console.log(JSON.stringify({ outputPath, bytes: output.length, sha256: hash, mimeType: result.mimeType, durationSeconds: 13.4, width: 960, height: 408, rotationDegrees: 0, sourceDuration: result.sourceDuration, provenance: 'Synthetic alternate generated in Chromium from the approved Sintel source and three supplied synthetic WAV takes; not a user recording or product render.' }, null, 2));
} finally {
  await browser?.close();
  server.close();
}
