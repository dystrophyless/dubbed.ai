const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const evidence = path.join(__dirname, 'evidence')
const metrics = JSON.parse(fs.readFileSync(path.join(__dirname, 'metrics.json'), 'utf8'))
const opened = new Set([
  'en-desktop-request',
  'en-desktop-invalid-code',
  'en-desktop-password-visible',
  'en-desktop-success-destination',
  'ru-phone390-success-destination',
  'code-en-767',
  'ru-phone390-password-visible',
  'ru-phone390-invalid-code',
  'en-short-password',
  'controlled-unknown-code-ru-phone390',
  'controlled-completion-loading-en-short',
  'code-en-768',
  'controlled-request-error-en-short',
  'ru-phone390-code',
  'en-short-success-destination',
])

const screenshots = metrics.map(({ name, screenshot, scenario, measured }) => {
  const file = path.resolve(__dirname, screenshot)
  const bytes = fs.readFileSync(file)
  return {
    name,
    scenario,
    path: path.relative(__dirname, file),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase(),
    viewport: measured.viewport,
    page: measured.page,
    horizontalOverflow: measured.horizontalOverflow,
    manuallyOpened: opened.has(name),
  }
})

const manifest = {
  issue: 71,
  capturedAt: new Date().toISOString(),
  origin: 'http://127.0.0.1:4571',
  mode: 'Vite mock; Playwright Chromium; muted audio and fake-media flags',
  count: screenshots.length,
  screenshots,
}
fs.writeFileSync(path.join(__dirname, 'screenshot-manifest.json'), JSON.stringify(manifest, null, 2))

const artifactManifestPath = path.join(__dirname, 'artifact-hashes.json')
function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) return listFiles(file)
    return file === artifactManifestPath ? [] : [file]
  })
}
const artifacts = listFiles(__dirname).map((file) => ({
  path: path.relative(__dirname, file),
  sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase(),
}))
fs.writeFileSync(artifactManifestPath, JSON.stringify({ issue: 71, artifacts }, null, 2))
console.log(JSON.stringify({ screenshots: screenshots.length, manuallyOpened: opened.size, artifacts: artifacts.length }))
