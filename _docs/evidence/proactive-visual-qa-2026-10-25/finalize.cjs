const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const root = __dirname;
const expected = Array.from({length:22}, (_, i) => i + 61).filter(n => n !== 76);
const json = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
for (const n of expected) {
  for (const file of ['review.md', 'summary.json']) {
    if (!fs.existsSync(path.join(root, `issue-${n}`, file))) throw new Error(`Incomplete issue ${n}: ${file}`);
  }
}
// Presentation-only normalization: preserve reviewer findings, make embedded images portable to the local viewer.
const normalized = [];
for (const n of expected) {
  const dir = path.join(root, `issue-${n}`), report = path.join(dir, 'review.md');
  const before = fs.readFileSync(report, 'utf8');
  const after = before.replace(/(!\[[^\]]*\]\()([^)]+)(\))/g, (all, start, target, end) => {
    if (/^(?:https?:|data:|[A-Za-z]:[\\/]|\/[A-Za-z]:)/.test(target)) return all;
    const absolute = path.resolve(dir, target).replace(/\\/g, '/');
    if (!fs.existsSync(absolute)) throw new Error(`Missing image ${absolute}`);
    return start + absolute + end;
  });
  if (after !== before) { fs.writeFileSync(report, after); normalized.push(n); }
}
cp.execFileSync(process.execPath, [path.join(root, 'audit.cjs'), '--require-complete'], {stdio:'inherit'});
const audit = json(path.join(root, 'root-audit.json'));
const registry = expected.map(issue => ({issue, reviewer:`/root/visual_qa_${issue}`, model:'gpt-6.1-sol', reasoning_effort:'high', status:'complete', oneReviewerPerIssue:true}));
fs.writeFileSync(path.join(root,'reviewer-register.json'), JSON.stringify({scope:'21 completed frontend issues; issue76 deferred', maxParallelReviewers:3, assignments:registry, imageLinkNormalization:normalized}, null, 2)+'\n');
const table = audit.issues.map(s => {
  const contract = fs.readFileSync(path.join(root, 'contracts', `issue-${s.issue}.md`), 'utf8');
  const title = contract.split(/\r?\n/)[0].replace(/^# Issue #\d+: /,'');
  return `| [#${s.issue}](https://github.com/dystrophyless/dubbed.ai/issues/${s.issue}) | ${title} | [Detailed review](issue-${s.issue}/review.md) | ${s.findings.high}/${s.findings.medium}/${s.findings.low} | ${s.screenshotCount} |`;
}).join('\n');
const f = audit.findingsAcrossReports;
const readme = `# Proactive Visual QA Review — 2026-10-25

**Completed: 21/21 in-scope issue reviews, ${audit.totalReviewedScreenshots} fresh screenshots recorded as visually inspected by the assigned reviewers.** Each task had one dedicated GPT-6.1 Sol High reviewer; up to three ran concurrently. #76 remains open/deferred and was excluded. [Reviewer assignments](reviewer-register.json).

The review does **not** support blanket visual acceptance of the current frontend. It found both implementation defects and poor requirements/design choices. Source-compliant compact desktop controls repeatedly weaken the main user actions; following the reference does not settle usability quality.

## Read the reports

Counts below are HIGH/MEDIUM/LOW **per report**. Across reports: **${f.high} HIGH, ${f.medium} MEDIUM, ${f.low} LOW**. These are not unique defect totals: shared controls, source recipes and consumer problems recur across issue boundaries. Each report classifies implementation mismatches, requirement/design flaws, evidence gaps and optional improvements separately; screenshots are not used as proof of backend or security behavior.

| Issue | Task | Report | H/M/L | Screenshots |
|---|---|---|---|---|
${table}

## Highest-priority findings

- **Result recovery:** [QA-79-01](issue-79/review.md) reproduces an initial playback-descriptor failure leaving no visible error/retry recovery. Controlled actual ResultScreen fixture, not a production outage claim.
- **Unresolved checkout intent:** [QA-68-01](issue-68/review.md) records fresh operation/initiation identities being created after an unknown purchase result, without first reconciling the prior intent. No real payment or duplicate charge is claimed.
- **Late purchase status:** [QA-65-01](issue-65/review.md) records pending reconciliation failing to update automatically when a controlled late status becomes known. Stale history and return-to-video/re-quote problems are detailed separately.
- **Acceptance evidence:** [QA-63-01](issue-63/review.md) finds the umbrella visual PASS broader than the current recorded checks, including incomplete native200% evidence. This is an evidence/acceptance gap, not an assertion that every screen fails zoom or accessibility.

## Repeated design and implementation themes

1. **Desktop action roles need revision.** Main24/28/32px actions with12/13px labels faithfully follow the adopted compact recipe, but are visually weak in roomy registration, rehearsal, purchase and download compositions. The reports propose role-specific comparisons rather than silently replacing the selected Mabry/Affect palette or declaring small controls automatic WCAG violations. Start with [#78](issue-78/review.md), [#77](issue-77/review.md), [#81](issue-81/review.md) and [#79](issue-79/review.md).
2. **Long strings and breakpoint composition are insufficiently covered.** Confirmed examples include registration email overflow [#82](issue-82/review.md), project-title overflow [#75](issue-75/review.md), linking CTA overflow [#66](issue-66/review.md), Russian download recovery overflow [#79](issue-79/review.md), and the767px fixed recording panel covering the target line [#77](issue-77/review.md). These overlap the integrated gate finding in #63; do not count that as a second layout defect.
3. **Core workspace hierarchy hides the job.** [New dub](issue-81/review.md) puts section selection, quote and authorization below an oversized preview stack and uses two differently scaled sliders rather than one stable interval track. [Microphone](issue-69/review.md) buries ready continuation below optional testing. The findings distinguish poor composition from violated functional contracts.
4. **Errors, busy states and recovery need explicit semantics.** Examples include misleading expired-session/wrong-password/provider-conflict copy, unreachable Back guard, missing in-place busy feedback and unsupported-media guidance. See [Account](issue-62/review.md), [Sign in](issue-80/review.md), [Reset](issue-71/review.md), [Registration](issue-82/review.md), [Recording](issue-77/review.md), [browser capability](issue-64/review.md) and [runtime](issue-67/review.md).
5. **Actual journeys must supplement controlled examples.** [Processing](issue-74/review.md) exposed queued0% in the real mock UI path while its controlled fixture omitted it. [Media](issue-72/review.md) critiques short16:9 title-card coverage as insufficient to challenge realistic scene/portrait/long-dialogue usability. [The contract register](issue-61/review.md) misses the later single-tab decision. These are evidence/specification findings, not permission to rewrite requirements during review.
6. **Accounting truth and visible explanation are separate.** The exercised [accounting](issue-70/review.md) checks found no ledger corruption; history semantics, reservation wording and readability still need attention. [Workspace](issue-73/review.md) and [facade](issue-68/review.md) reports separately scope persistence, consumer recovery and trace evidence.

## Evidence and scope

Baseline: \`9d286621177200fdb5f61ef963d0b6818ae76774\`. Fresh GitHub bodies for all22 issues and zero-comment discussion counts are in [contracts](contracts/);21 were completed,76 deferred. [Baseline hashes](baseline.json) cover162 source/test files. [Final audit](root-audit.json) checks all21 report/summary pairs, embedded screenshot existence, source hashes, unchanged HEAD, clean frontend status and empty index. Existing unrelated dirty documentation/skills/evidence were preserved.

Individual reports retain capture scripts, URLs/ports, source/spec hashes or revision boundaries, metrics, logs, fixture/fault provenance, source Clean/Light comparisons and screenshot manifests. Every report has its own limitations. Review-only work did not patch product/specs, mutate GitHub, commit, push or deploy. Root only aggregated reports and normalized relative embedded image paths to absolute local paths; finding text and severity were preserved.

Coverage is local mock-backed Playwright Chromium with muted audio and synthetic microphone devices. Real backend/provider/payment/rendering, physical devices, exhaustive races, screen-reader conformance and complete native200% coverage are **not established**. Some states are actual UI journeys and others use explicitly documented controlled fixtures; they are not interchangeable evidence. Targeted checks passed where recorded, but no new blanket build/full-suite or whole-product acceptance is claimed.

The next correction work should address recovery/unknown-operation handling and visible clipping first, then revise the desktop role-density requirement and affected compositions, and finally replace blanket visual PASS statements with an explicit current coverage matrix. This review authorizes no automatic patch or issue-status change.
`;
fs.writeFileSync(path.join(root, 'README.md'), readme);
const payload = [];
function walk(dir) { for (const e of fs.readdirSync(dir,{withFileTypes:true})) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else if(/\.(?:md|png|json)$/.test(e.name) && !['payload-manifest.json','root-audit.json'].includes(e.name)) payload.push({path:path.relative(root,p).replace(/\\/g,'/'), bytes:fs.statSync(p).size, sha256:crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}); } }
walk(root);
fs.writeFileSync(path.join(root,'payload-manifest.json'),JSON.stringify({baseline:audit.head,files:payload},null,2)+'\n');
console.log(`Finalized21 reports; ${audit.totalReviewedScreenshots} reviewed screenshots; ${payload.length} hashed artifacts.`);
