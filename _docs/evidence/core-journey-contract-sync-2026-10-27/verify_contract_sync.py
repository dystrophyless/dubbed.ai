"""Read-only author checks; regenerate scoped diff/report against this session's preimages."""
import difflib
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import unquote

sys.stdout.reconfigure(encoding="utf-8")
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
baseline = json.loads((OUT / "baseline.json").read_text(encoding="utf-8"))
preimages = json.loads(Path(baseline["temporaryPreimages"]).read_text(encoding="utf-8"))

def normalized(text):
    return text.replace("\r\n", "\n")

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def section(text, heading):
    text = normalized(text)
    match = re.search(r"^" + re.escape(heading) + r"$", text, re.M)
    if not match:
        raise ValueError("Missing heading: " + heading)
    level = len(heading) - len(heading.lstrip("#"))
    end = re.search(r"^#{1," + str(level) + r"} ", text[match.end():], re.M)
    return text[match.start():match.end() + end.start() if end else None].strip()

checks = []
def check(name, passed, **details):
    checks.append(dict(name=name, passed=bool(passed), **details))

changed = []
diffs = []
for name, before in preimages.items():
    path = ROOT / name
    after = path.read_text(encoding="utf-8")
    old, new = normalized(before), normalized(after)
    if old != new:
        changed.append(dict(path=name, before=baseline["preEditSha256"][name], after=digest(path)))
        diffs.extend(difflib.unified_diff(old.splitlines(True), new.splitlines(True), fromfile="pre-sync/" + name, tofile="post-sync/" + name))
    raw = path.read_bytes()
    current_ending = "CRLF" if b"\r\n" in raw else "LF"
    check("line endings: " + name, current_ending == baseline["lineEndings"][name])

for name in ["AGENTS.md", "_docs/frontend-design-workflow.md", "_docs/orchestration.md", "_docs/frontend-flows/15-account.md"]:
    check("untouched baseline: " + name, digest(ROOT / name) == baseline["preEditSha256"][name])

record = "_docs/frontend-flows/09-record.md"
for prefix in ["## 2.", "### 5.1 ", "### 5.3 ", "### 5.4 ", "### 5.5 ", "### 5.6 ", "### 5.7 ", "### 5.8 ", "### 5.9 ", "### 5.11 ", "### 6.1 ", "### 6.2 ", "### 6.3 ", "### 6.5 ", "### 6.6 ", "### 6.7 ", "## 10."]:
    old = normalized(preimages[record])
    heading = next(line for line in old.splitlines() if line.startswith(prefix))
    check("Record invariant: " + heading, section(old, heading) == section((ROOT / record).read_text(encoding="utf-8"), heading))

result = "_docs/frontend-flows/10-result.md"
for number in range(5, 17):
    heading = next(line for line in normalized(preimages[result]).splitlines() if line.startswith("## " + str(number) + "."))
    check("Result invariant: " + heading, section(preimages[result], heading) == section((ROOT / result).read_text(encoding="utf-8"), heading))

shared = "_docs/frontend-flows/00-shared-contract.md"
for title in ["Unchanged product invariants", "Unaccepted-draft lifetime", "Account-deletion confirmation", "One recording tab per project", "Recording ownership recovery after disconnect", "Explicit navigation wins at first complete recording set", "Initial assembly after filling the final gap", "Single-device project recording"]:
    heading = "## " + title
    check("Shared invariant: " + title, section(preimages[shared], heading) == section((ROOT / shared).read_text(encoding="utf-8"), heading))

processing = "_docs/frontend-flows/07-processing.md"
for prefix in ["## 2.", "## 4.", "## 5.", "## 13."]:
    heading = next(line for line in normalized(preimages[processing]).splitlines() if line.startswith(prefix))
    check("Processing invariant: " + heading, section(preimages[processing], heading) == section((ROOT / processing).read_text(encoding="utf-8"), heading))

prototype = ROOT / "prototypes/core-journey-lowfi"
manifest = json.loads((prototype / "evidence/version.json").read_text(encoding="utf-8"))
for name, expected in manifest["sha256"].items():
    check("frozen prototype: " + name, digest(prototype / name) == expected)

# Only newly introduced relative link targets; existing removed-runtime links are not new regressions.
link_checks = []
link_pattern = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
for entry in changed:
    name = entry["path"]
    before_targets = set(link_pattern.findall(preimages[name]))
    after_targets = set(link_pattern.findall((ROOT / name).read_text(encoding="utf-8")))
    for target in sorted(after_targets - before_targets):
        if re.match(r"^[a-zA-Z]+:", target) or target.startswith("#"):
            continue
        target_path = target.split("#", 1)[0].strip("<>")
        exists = ((ROOT / name).parent / unquote(target_path)).exists()
        link_checks.append(dict(source=name, target=target, exists=exists))
        check("new relative link: " + name + " -> " + target, exists)
for target in link_pattern.findall((OUT / "package-review.md").read_text(encoding="utf-8")):
    if not re.match(r"^[a-zA-Z]+:", target) and not target.startswith("#"):
        check("packet relative link: " + target, (OUT / target.split("#", 1)[0]).exists())

def git(*args):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")

head = git("rev-parse", "HEAD")
check("HEAD unchanged", head.stdout.strip() == baseline["head"])
check("production frontend still absent", not (ROOT / "frontend").exists())
stubs = git("diff", "--name-only", "--", "_docs/task-drafts")
check("published task stubs unchanged versus HEAD", stubs.returncode == 0 and not stubs.stdout.strip())
whitespace = git("diff", "--check")
check("git diff --check", whitespace.returncode == 0, stderr=whitespace.stderr.strip(), stdout=whitespace.stdout.strip())

(OUT / "scoped-contract-diff.patch").write_text("".join(diffs), encoding="utf-8", newline="\n")
report = dict(baseline=baseline["name"], date="2026-10-27", timezone="Asia/Qyzylorda", command="python _docs/evidence/core-journey-contract-sync-2026-10-27/verify_contract_sync.py", scope="Static documentation synchronization; no runtime/browser/product acceptance claimed", changedFiles=changed, introducedLinks=link_checks, prototypeFingerprints=len(manifest["sha256"]), checks=checks, passed=all(c["passed"] for c in checks), limits=["The patch uses temporary pre-sync dirty-worktree preimages, not HEAD; rerunning requires that recorded temporary file.", "GitHub readback was read-only; publication/status/acceptance/delivery remain held.", "No new frontend, real browser capture, mock durability or real pipeline was executed in this stage."])
(OUT / "verification.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(dict(passed=report["passed"], checks=len(checks), changedFiles=len(changed), prototypeFingerprints=report["prototypeFingerprints"], failures=[c["name"] for c in checks if not c["passed"]]), ensure_ascii=False))
sys.exit(0 if report["passed"] else 1)
