"""Check the recorded product-source boundary without refreshing its hashes."""
import datetime
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
snapshot_path = HERE / "root-product-source-freeze.json"
snapshot = json.loads(snapshot_path.read_text(encoding="utf-8"))
actual_paths = set()
for directory in ("frontend/src", "frontend/public"):
    actual_paths.update(path.relative_to(REPO).as_posix() for path in (REPO / directory).rglob("*") if path.is_file())
actual_paths.update(name for name in snapshot["files"] if not name.startswith(("frontend/src/", "frontend/public/")))
errors = []
for name in sorted(actual_paths - snapshot["files"].keys()):
    errors.append({"path": name, "error": "unexpected-new-product-file"})
for name, expected in snapshot["files"].items():
    path = REPO / name
    if not path.is_file():
        errors.append({"path": name, "error": "missing"})
        continue
    actual = {"sha256": hashlib.sha256(path.read_bytes()).hexdigest(), "bytes": path.stat().st_size}
    if actual != expected:
        errors.append({"path": name, "error": "changed", "expected": expected, "actual": actual})
result = {
    "verifiedAtUtc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "snapshotSha256": hashlib.sha256(snapshot_path.read_bytes()).hexdigest(),
    "files": len(snapshot["files"]),
    "status": "PASS" if not errors else "FAIL",
    "boundary": "Product source/public/build inputs only; the separate final test-source boundary is recorded after issue63 edits.",
    "errors": errors,
}
(HERE / "root-product-source-freeze-verification.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"status": result["status"], "files": result["files"], "errors": len(errors)}))
raise SystemExit(1 if errors else 0)
