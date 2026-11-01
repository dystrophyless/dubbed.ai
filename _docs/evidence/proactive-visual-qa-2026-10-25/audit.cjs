const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const root = __dirname;
const repo = path.resolve(root, '../../..');
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
const baseline = readJson(path.join(root, 'baseline.json'));
const expected = Array.from({ length: 22 }, (_, i) => i + 61).filter(n => n !== 76);
const issues = [], missing = [], brokenImages = [], changedSource = [];
for (const entry of baseline.files) {
  if (!fs.existsSync(entry.path) || hash(entry.path) !== entry.sha256) changedSource.push(entry.path);
}
for (const n of expected) {
  const dir = path.join(root, `issue-${n}`);
  const report = path.join(dir, 'review.md');
  const summaryPath = path.join(dir, 'summary.json');
  if (!fs.existsSync(report) || !fs.existsSync(summaryPath)) { missing.push(n); continue; }
  const summary = readJson(summaryPath);
  const body = fs.readFileSync(report, 'utf8');
  const images = [...body.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(m => m[1]);
  for (let image of images) {
    image = image.replace(/^<|>$/g, '').replace(/^\/(\w:)/, '$1');
    if (/^https?:/.test(image)) continue;
    const resolved = path.isAbsolute(image) ? image : path.resolve(dir, image);
    if (!fs.existsSync(resolved) || fs.statSync(resolved).size === 0) brokenImages.push({ issue: n, image });
  }
  issues.push({ issue: n, model: summary.model, effort: summary.effort, findings: summary.findings,
    screenshotCount: summary.screenshotCount, embeddedImages: images.length, reportBytes: fs.statSync(report).size,
    reportSha256: hash(report), limitations: summary.limitations });
}
const git = args => cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8' }).trim();
const head = git(['rev-parse', 'HEAD']);
const frontendStatus = git(['status', '--short', '--', 'frontend']);
const index = git(['diff', '--cached', '--name-only']);
const result = { date: new Date().toISOString(), baseline: baseline.head, head, expectedIssues: expected,
  completed: issues.length, missing, brokenImages, changedSource, frontendStatus, index, issues,
  totalReviewedScreenshots: issues.reduce((s, x) => s + Number(x.screenshotCount || 0), 0),
  findingsAcrossReports: issues.reduce((a, x) => { for (const k of ['high','medium','low']) a[k] += Number(x.findings[k] || 0); return a; }, {high:0,medium:0,low:0}),
  complete: missing.length === 0 && brokenImages.length === 0 && changedSource.length === 0 && head === baseline.head && !frontendStatus && !index };
fs.writeFileSync(path.join(root, 'root-audit.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ completed: result.completed, missing, brokenImages, changedSource, frontendStatus, index, totalReviewedScreenshots: result.totalReviewedScreenshots, findingsAcrossReports: result.findingsAcrossReports, complete: result.complete }, null, 2));
if (process.argv.includes('--require-complete') && !result.complete) process.exitCode = 1;
