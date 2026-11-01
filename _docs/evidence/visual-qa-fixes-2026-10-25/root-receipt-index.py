"""Index dedicated executor receipts; never grant acceptance from metadata."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
QA = re.compile(r"^QA-?(\d{2})-(\d{2})$")


def records(value):
    if isinstance(value, dict):
        identifier = value.get("id", value.get("qa_id", ""))
        match = QA.match(str(identifier))
        if match:
            yield {**value, "id": f"QA-{match[1]}-{match[2]}"}
        for key, child in value.items():
            keyed_match = QA.match(str(key))
            if keyed_match:
                details = child if isinstance(child, dict) else {"status": str(child)}
                yield {**details, "id": f"QA-{keyed_match[1]}-{keyed_match[2]}"}
            yield from records(child)
    elif isinstance(value, list):
        for child in value:
            yield from records(child)


def main():
    expected = json.loads((ROOT / "root-payload-validation.json").read_text(encoding="utf-8-sig"))
    rows = []
    for task in expected["results"]:
        issue = task["issue"]
        directory = ROOT / f"issue-{issue}"
        summary = directory / "summary.json"
        receipt = next(iter(sorted(directory.glob("[Cc]ompletion.md"))), None)
        data = json.loads(summary.read_text(encoding="utf-8-sig")) if summary.exists() else {}
        found = {item["id"]: item for item in records(data)}
        identifiers = task["qaIds"]
        rows.append({
            "issue": issue,
            "expected": identifiers,
            "receipt": receipt.relative_to(ROOT).as_posix() if receipt else None,
            "summary": summary.relative_to(ROOT).as_posix() if summary.exists() else None,
            "reported": [found[key] for key in identifiers if key in found],
            "missingReceiptIds": [key for key in identifiers if key not in found],
            "rootAcceptance": "not-granted",
        })
    output = {
        "boundary": "Live dirty-worktree executor metadata only; not a frozen integration result or acceptance.",
        "baselineHead": "9d286621177200fdb5f61ef963d0b6818ae76774",
        "expectedIssues": len(rows),
        "expectedFindings": sum(len(row["expected"]) for row in rows),
        "rows": rows,
    }
    (ROOT / "root-receipt-index.json").write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    lines = ["# Correction executor receipt index", "", output["boundary"], "",
             "Scope:21 affected frontend tasks and87 original review findings. Real-adapter #76 remains owner-deferred and outside this correction delivery. [Frozen original reviews and screenshots](../proactive-visual-qa-2026-10-25/README.md).", "",
             "[Before-and-after screenshot gallery](before-after-gallery.md).", "",
             "Canonical IDs are normalized for indexing only; original logs and reports remain intact.", "",
             "| Issue | Executor receipt | Reported own QA IDs | Missing from summary |", "|---|---|---|---|"]
    for row in rows:
        receipt_link = f"[Receipt]({row['receipt']})" if row["receipt"] else "Pending"
        lines.append(f"| #{row['issue']} | {receipt_link} | {len(row['reported'])}/{len(row['expected'])} | {', '.join(row['missingReceiptIds']) or 'None'} |")
    lines += ["", "Receipt existence and executor status do not establish cross-task behavior, actual current screenshots, full regression results, or delegated acceptance. Those are recorded separately after source freeze.", ""]
    (ROOT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"issues": len(rows), "findings": output["expectedFindings"], "receipts": sum(bool(row["receipt"]) for row in rows), "reportedOwnIds": sum(len(row["reported"]) for row in rows)}))


if __name__ == "__main__":
    main()
