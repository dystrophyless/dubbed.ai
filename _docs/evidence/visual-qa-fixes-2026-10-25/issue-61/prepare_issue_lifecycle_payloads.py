import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "_docs" / "evidence"
SNAPSHOT_PATH = BASE / "visual-qa-fixes-2026-10-25" / "live-issues-before.json"
REVIEWS = BASE / "proactive-visual-qa-2026-10-25"
OUT = BASE / "visual-qa-fixes-2026-10-25" / "issue-61" / "issue-lifecycle-payloads"
EXPECTED_ISSUES = [*range(61, 76), *range(77, 83)]

ROLE_CONTRACT = (
    "For any presentation control owned or validated by this task, consume the owner-approved "
    "2026-10-25 roles: desktop task actions are at least 40px high with Mabry Pro Medium 14px/20px, "
    "14px horizontal padding, 8px gap and 16px icons; prominent/landing actions are 44px high with "
    "Medium 16px/24px and 16px horizontal padding; secondary controls are 32px high with Medium "
    "14px/20px; shared navigation is 36px high with Medium 14px/20px; medium segmented controls "
    "are 40px desktop / 14px/20px and 48px phone / 16px/24px. Desktop icon-only targets are at "
    "least 40px; phone targets are at least 48px, with text actions 16px/24px and icon-only targets "
    "48x48px. Frequent Record/Play/Next and consequential purchase/download/guard actions use the "
    "task role. A genuinely incidental compact control needs a documented reason. Preserve the "
    "selected Clean/Light shape, state, color and brand treatment. Original inspected Affect UI "
    "24/28/32px source dimensions stay labeled as source provenance, not current Dubbed role targets. "
    "Issue #78 alone owns shared presentation implementation; each task has one executor and verifies "
    "its consumer without duplicating shared code."
)

ISSUE_SCOPE = {
    61: "Documentation/register synchronization only; this task does not own frontend product code.",
    63: "Final integration gate only; route implementation defects to their single issue owner.",
    64: "Capability/timing evidence only; the unsupported-device guidance UI remains owned by #69.",
    65: "Credits/purchase/history; #65 owns the shared purchase-return consumer seam, while #70 owns ledger primitives.",
    68: "Services facade, generic recovery notices and typed error mapping; purchase UI correction QA-68-01 is owned by #65.",
    69: "Microphone screen and local capability/recovery guidance; browser media service changes remain out of scope.",
    70: "Accounting fact verification and dedicated tests/evidence; #65 owns history presentation corrections.",
    71: "Password-reset screen only; shared auth/OTP corrections are owned by #82.",
    77: "Recording screen and local capture behavior; shared shell/segmented controls remain owned by #78.",
    78: "Shared shell, button, navigation, segmented-control, phone-target and density implementation.",
    81: "New dub screen and current source/selection/quote consumer; Credits return-intent creation remains owned by #65.",
    82: "Registration and shared auth/OTP presentation; Sign-in and Password-reset screen modules remain with their owners.",
}

DENSITY_OUTCOMES = {
    "QA-61-02": "Replace the blanket compact-desktop default with the owner-approved roles: 40px task, 44px prominent/landing, 32px secondary, 36px navigation, and 40px medium segmented controls. Preserve the specified Mabry roles, padding, gaps, icon sizes and phone targets; retain original 24/28/32px values only as source provenance. This is an implementation decision, not a new approval request.",
    "QA-62-05": "Use the 40px task role for consequential account/security actions and 32px only for secondary controls; keep the required security actions reachable in the short desktop viewport. This approved sizing requires no additional owner review.",
    "QA-63-03": "Use 44px for prominent landing/file-entry actions, 40px for task actions, 32px for secondary controls, 36px for shared navigation and 40px for medium segmented controls. Apply the approved roles across the journey without adding an approval gate.",
    "QA-64-03": "Use the 40px task role for device setup and recovery actions, with 14px/20px labels, 14px horizontal padding, 8px gap and 16px icons; phone targets remain at least 48px. No new design approval is required.",
    "QA-65-05": "Use the 40px task role for consequential purchase/recovery actions and 32px for genuinely secondary controls; preserve the selected Clean/Light state and shape treatment. Implement the approved role without a new approval gate.",
    "QA-66-05": "Use the 40px task role for the final security/proof action and 32px only for secondary controls; retain the selected Clean/Light treatment and readable labels. No additional owner review is required.",
    "QA-67-02": "Use the 40px task role for primary entry/form actions, 32px for secondary controls and 36px for shared navigation. Keep compact styling only for documented incidental controls; no new approval gate is needed.",
    "QA-68-03": "Use the 40px task role for important recovery actions and 32px for secondary controls; avoid a wide, shallow primary recovery action. Apply the approved roles without requesting another design decision.",
    "QA-69-01": "Use the 40px task role for device setup/recovery actions, with readable 14px/20px labels and the approved 14px padding, 8px gap and 16px icons; phone targets remain at least 48px. No further approval is required.",
    "QA-70-03": "Use the 40px task role for consequential purchase/recovery actions and 32px for secondary controls. This applies the approved design decision; it does not require another approval.",
    "QA-71-03": "Use the 40px task role for password-reset actions and 32px for secondary controls; keep shared navigation at 36px. Apply the approved roles without a new approval gate.",
    "QA-73-02": "Use the 40px task role for frequent Continue/resume row actions and 32px for secondary row/menu controls; keep shared navigation at 36px. No new approval is required.",
    "QA-74-05": "Use the 40px task role for consequential cancellation/recovery actions and 32px for secondary controls, retaining the source state/shape treatment. Apply the approved role without a new approval gate.",
    "QA-77-03": "Use the 40px task role for frequent Record/Play/Next controls and the 40px desktop medium segmented role; retain 48px phone targets. Apply the approved roles without requesting a new design decision.",
    "QA-78-01": "Make phone icon-only targets at least 48x48px and desktop icon-only targets at least 40x40px while preserving visible glyph size and accessible names; keep the approved phone target rule for brand/support controls. This is already settled.",
    "QA-78-02": "Use 44px for the prominent landing action, 36px for shared navigation, 40px for task actions, 32px for secondary controls and 40px for medium segmented controls. Implement the approved roles without a new review gate.",
    "QA-79-05": "Use the 40px task role for the consequential download action and 32px only for secondary controls; preserve version identity, source states and download semantics. No further approval is required.",
    "QA-80-03": "Use the 40px task role for primary authentication/provider actions and 32px for secondary controls, while keeping the password visibility target accessible. Apply the approved role without a new approval gate.",
    "QA-81-03": "Use the 40px task role for the exact-cost processing action and 44px for the prominent file-entry action; preserve exact-cost copy, the dark primary treatment and deliberate consent. No new approval is required.",
    "QA-82-04": "Use the 40px task role for account creation and 32px only for secondary controls, retaining Mabry, monochrome hierarchy, 6px radius and Clean states. This approved sizing requires no additional review.",
}


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def flatten(value: str) -> str:
    value = re.sub(r"!\[[^]]*\]\([^)]*\)", "", value)
    value = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", value)
    value = re.sub(r"`([^`]*)`", r"\1", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def first_sentence(value: str, limit: int = 420) -> str:
    value = flatten(value)
    if not value:
        return ""
    parts = re.split(r"(?<=[.!?])\s+(?=[A-ZА-ЯЁ0-9`])", value)
    chosen = parts[0]
    if len(chosen) < 100 and len(parts) > 1:
        chosen = f"{chosen} {parts[1]}"
    if len(chosen) > limit:
        chosen = chosen[: limit - 1].rsplit(" ", 1)[0] + "…"
    return chosen


def marked_fields(section: str) -> dict[str, str]:
    marks = list(re.finditer(r"\*\*([^*\r\n]{2,100})\*\*", section))
    fields: dict[str, str] = {}
    for index, mark in enumerate(marks):
        label = mark.group(1).strip().rstrip(":").strip().lower()
        end = marks[index + 1].start() if index + 1 < len(marks) else len(section)
        fields[label] = section[mark.end() : end].strip()
    return fields


def unmarked_field(section: str, label: str) -> str:
    pattern = re.compile(
        rf"(?is)(?:^|\n)\s*(?:\*\*)?{re.escape(label)}(?:\s*/\s*[^:\n]+)?(?:\*\*)?\s*:\s*(.+?)(?=\n\s*\n|\Z)"
    )
    match = pattern.search(section)
    return match.group(1).strip() if match else ""


def finding_records(issue_number: int) -> list[dict[str, str]]:
    path = REVIEWS / f"issue-{issue_number}" / "review.md"
    text = path.read_text(encoding="utf-8")
    headers = list(re.finditer(r"(?m)^#{1,6}\s+(QA-\d{2}-\d{2}.*?)\s*$", text))
    records: list[dict[str, str]] = []
    for index, header in enumerate(headers):
        heading = header.group(1).strip()
        section = text[header.end() : headers[index + 1].start() if index + 1 < len(headers) else len(text)]
        parts = [part.strip() for part in re.split(r"\s+—\s+", heading, maxsplit=2)]
        qa_id = parts[0]
        severity = parts[1] if len(parts) > 1 else "severity unclassified"
        title = parts[2] if len(parts) > 2 else heading
        fields = marked_fields(section)

        recommendation = next(
            (value for key, value in fields.items() if key.startswith("scoped recommendation") or key.startswith("recommendation")),
            "",
        )
        if not recommendation:
            recommendation = unmarked_field(section, "Scoped recommendation") or unmarked_field(section, "Recommendation")
        expected = next((value for key, value in fields.items() if key.startswith("expected")), "")
        if not expected:
            expected = unmarked_field(section, "Expected") or unmarked_field(section, "Expected versus actual")
        affected = next((value for key, value in fields.items() if key.startswith("affected")), "")
        if not affected:
            affected = unmarked_field(section, "Affected")
        validation = next((value for key, value in fields.items() if key.startswith("next validation")), "")
        if not validation:
            validation = unmarked_field(section, "Next validation") or unmarked_field(section, "Next check")

        action = first_sentence(recommendation) or first_sentence(expected)
        followup = first_sentence(validation)
        evidence = (
            "Static read-back of the register and active flow contract; do not claim new runtime or rendered acceptance."
            if issue_number == 61
            else "Reproduce this finding in the owned local mock path; for user-visible changes capture fresh mock-Chromium screenshots and post-font DOM measurements, add a focused behavior regression, and record the applicable route/state/locale/viewport/input row. Mark nonapplicable and unrun cases explicitly."
        )

        if qa_id == "QA-61-01":
            action = (
                "Record the settled rule that at most one browser tab per project may capture or accept, "
                "including same-profile tabs sharing the durable client/session; a second tab may view but "
                "cannot capture, accept, or force takeover. Keep auth/session identity unchanged, link Flow 09 "
                "F09-AC-30 and #77 AC-07 / #63 AC-04, and leave production lease/disconnect/fencing evidence open."
            )
            evidence = "Independent text read-back of the register/shared contract/Flow 09 links and mock-versus-production boundary; no tab-runtime result is claimed by this documentation task."
        if qa_id in DENSITY_OUTCOMES:
            action = DENSITY_OUTCOMES[qa_id]

        records.append(
            {
                "id": qa_id,
                "severity": severity,
                "title": title,
                "affected": first_sentence(affected, 300),
                "action": action or "Resolve the exact defect named by this frozen QA ID while preserving the original task invariants.",
                "evidence": evidence,
                "followup": followup,
            }
        )
    return records


def rewrite_workflow(body: str, issue_number: int) -> str:
    marker = re.search(r"(?m)^## Workflow status[ \t]*$", body)
    if not marker:
        raise ValueError(f"Issue #{issue_number} has no original Workflow status section")
    body = body[: marker.start()] + "## Historical workflow status and accepted completion (prior scope)" + body[marker.end() :]
    owner_scope = ISSUE_SCOPE.get(issue_number, "This task's original screen/service ownership remains unchanged.")
    new_status = (
        "## Workflow status\n\n"
        "in_progress — reopened for the additive 2026-10-25 proactive visual QA correction increment below; "
        "verification of these later findings is pending. The original acceptance/completion record is preserved "
        "as historical evidence for its earlier bounded scope.\n\n"
        f"- Correction owner: one dedicated GPT-6 Luna Max Executor for issue #{issue_number}; no co-owner is added.\n"
        f"- Existing task boundary: {owner_scope}\n"
        "- Shared density implementation stays with #78; this issue consumes or verifies the applicable role and "
        "does not duplicate shared code.\n\n"
    )
    body = body[: marker.start()] + new_status + body[marker.start() :]
    return re.sub(
        r"(?mi)^(#{2,6}) Completion record[ \t]*$",
        lambda match: f"{match.group(1)} Historical completion record (prior accepted scope)",
        re.sub(
            r"(?mi)^(#{2,6})[ \t]*Verification, delegated acceptance and delivery closure(.*)$",
            lambda match: f"{match.group(1)} Historical verification, delegated acceptance and delivery closure{match.group(2)}",
            body,
        ),
    )


def correction_section(issue_number: int, records: list[dict[str, str]]) -> str:
    lines = [
        "",
        "---",
        "",
        "## 2026-10-25 proactive visual QA correction increment",
        "",
        "This is additional implementation and verification scope. The original acceptance criteria and completion record above remain historical and are not rewritten as evidence for these later findings. The issue returns to `in_progress` until every listed QA ID is verified or explicitly recorded as blocked/not run.",
        "",
        "### Shared role-based control density",
        "",
        ROLE_CONTRACT,
        "",
        "### Correction acceptance criteria and evidence",
        "",
        "Current proof for user-visible corrections is fresh local mock Chromium evidence: a new screenshot, measured DOM geometry/styles after fonts settle, a focused behavior regression, and the applicable route/state/locale/viewport/input matrix. Service/fixture-only corrections use their owned local behavior check. Documentation-only #61 uses static document read-back and does not claim product/runtime acceptance. The frozen reviews remain unchanged. Their proposed extra checks are future/manual follow-ups, not new acceptance gates: human-user studies, physical-device checks, real provider/service/backend calls, and production evidence stay not run unless separately authorized and actually performed.",
        "",
    ]
    for record in records:
        affected = f" Affected contract: {record['affected']}" if record["affected"] else ""
        lines.extend(
            [
                f"- [ ] **{record['id']} — {record['severity']} — {record['title']}.** Corrective outcome: {record['action']}{affected}",
                f"  **Evidence required:** {record['evidence']}",
            ]
        )
        if record["followup"]:
            lines.append(
                f"  **Frozen reviewer suggestion (nonbinding follow-up, not a new acceptance gate):** {record['followup']}"
            )
    if issue_number == 61:
        lines.extend(
            [
                "",
                "### Settled source eligibility and recording-tab decisions",
                "",
                "The original uploaded source is rejected before a new project/source commit when its duration is below 1.000 seconds; exactly 1.000 seconds is eligible. A rejected replacement preserves the existing project, source, title/provenance, selected section, quote, occupied slot, media and credit state. This is source-file eligibility, not a minimum selected recording turn or microphone take. At most one tab per project owns recording; a same-profile second tab is view-only and cannot force takeover. Authentication and durable client/session identity do not change. Production lease timing, disconnect classification and fencing remain evidence gates. #76 remains the separate blocked future real-adapter issue.",
                "",
                "### Approved mock purchase-history type seam",
                "",
                "Document the finalized backward-compatible #65 contract: `PurchaseState` and `PurchasePackSnapshot` are named types; `PurchaseSnapshot.pack?` and `LedgerEntry.relatedPurchase?`/`relatedPurchase.pack?` are optional immutable mock snapshots. `relatedPurchase` is read-only current lifecycle resolved through the stable related operation identity. A pending-purchase ledger event is presented as `Purchase initiated` with its related current state; `In processing` remains a reservation, not a final charge. Legacy rows with missing pack facts omit amount/credit facts and never infer them from the current catalog. Ledger kind, delta, available-after, reserved-after, order and idempotency are unchanged; no new facade method or real provider transport is implied.",
                "",
                "### Documentation-only boundary",
                "",
                "Issue #61 updates the register and active flow/implementation contracts. It adds no frontend product code and claims no new rendered or runtime acceptance.",
            ]
        )
    elif issue_number == 65:
        lines.extend(
            [
                "",
                "### Approved mock purchase-history type seam",
                "",
                "Use the finalized backward-compatible contract: `PurchaseState` and `PurchasePackSnapshot` are named types; `PurchaseSnapshot.pack?` and `LedgerEntry.relatedPurchase?`/`relatedPurchase.pack?` are optional immutable mock snapshots. `relatedPurchase` is read-only current lifecycle resolved through stable `relatedOperationId`. A pending-purchase ledger event displays as `Purchase initiated` with the related current state; `In processing` is a reservation, not a final charge. Legacy rows missing pack facts omit amount/credit facts and never infer them from the current catalog. Ledger kind, delta, available-after, reserved-after, order and idempotency remain unchanged. No new facade method or real provider transport is implied.",
            ]
        )
    elif issue_number == 63:
        lines.extend(
            [
                "",
                "### Cross-flow owner decisions to verify",
                "",
                "The final gate verifies one recording-owning tab per project (same-profile tabs share auth identity but the second tab is view-only, with no forced takeover) and source-upload rejection below 1.000 seconds before commit while exactly 1.000 seconds is eligible. Do not turn section-duration policy into a recording-turn minimum. Verify current role-based desktop density and applicable phone targets after shared #78 and consumer changes land; no gate PASS is implied by this payload.",
            ]
        )
    elif issue_number == 77:
        lines.extend(
            [
                "",
                "### Settled recording ownership decision",
                "",
                "At most one device and one browser tab may capture/accept for a project, including same-profile tabs with the same durable client/session. A second tab may view but cannot capture, accept or force takeover; unrelated projects are not globally locked. Authentication/session identity remains unchanged. Production lease timing, disconnect classification and stale-write fencing remain separate evidence gates. Record controls consume #78 shared 40px segmented/control roles; do not retain local shrinking overrides.",
            ]
        )
    elif issue_number == 78:
        lines.extend(
            [
                "",
                "### Sole shared density implementation owner",
                "",
                "Implement the role contract above once in shared controls/shell. Preserve source shape/state/color/brand, adapt the default button API to the task role, expose the 36px navigation role and the 40px desktop / 48px phone medium segmented role, and remove any shared/local default that shrinks an important task action. Consumers own their screen markup and verify role selection; they do not reimplement shared CSS. Original source dimensions in the catalog remain provenance.",
            ]
        )
    elif issue_number == 81:
        lines.extend(
            [
                "",
                "### Settled source eligibility decision",
                "",
                "Reject an original source below 1.000 seconds before creating or replacing a project/source; exactly 1.000 seconds is eligible. Rejected replacement preserves the previous project, source/title provenance, selection, quote, capacity, media and credits. This does not create a minimum recording-turn or microphone-take duration. Keep the main upload/file-selection action in the prominent role; shorter secondary actions use their own approved role.",
            ]
        )
    return "\n".join(lines).rstrip() + "\n"


def main() -> None:
    snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
    source_issues = {item["issue_number"]: item for item in snapshot["issues"]}
    if sorted(source_issues) != EXPECTED_ISSUES:
        raise ValueError(f"Expected exactly {EXPECTED_ISSUES}, found {sorted(source_issues)}")
    OUT.mkdir(parents=True, exist_ok=True)

    receipt = {
        "prepared_at": "2026-10-25",
        "repository": snapshot["repository"],
        "source_snapshot": str(SNAPSHOT_PATH.relative_to(ROOT)).replace("\\", "/"),
        "publication_status": "prepared_only_not_published",
        "update_fields": ["body", "state", "state_reason"],
        "omitted_to_preserve": ["title", "assignees", "labels", "milestone"],
        "issue_count": len(EXPECTED_ISSUES),
        "finding_count": 0,
        "evidence_boundary": {
            "current_ui_proof": "Fresh local mock Chromium screenshots, post-font DOM measurements, focused behavior regression, and an honest route/state/locale/viewport/input matrix.",
            "documentation_only_issue_61": "Static register/active-contract read-back; no product/runtime/rendered acceptance claim.",
            "review_proposed_next_checks": "Nonbinding future/manual follow-ups, not new acceptance gates. Human studies, physical devices, real providers/services/backends, and production evidence are not run unless separately scoped and actually performed.",
        },
        "issues": [],
    }

    for number in EXPECTED_ISSUES:
        original = source_issues[number]
        if original["state"] != "closed":
            raise ValueError(f"Issue #{number} baseline state changed: {original['state']}")
        body = original["body"]
        if "## Historical workflow status and accepted completion" not in body:
            body = rewrite_workflow(body, number)
        records = finding_records(number)
        expected_prefix = f"QA-{number:02d}-"
        if not records or any(not item["id"].startswith(expected_prefix) for item in records):
            raise ValueError(f"Missing or mismatched frozen QA IDs for issue #{number}")
        if "## 2026-10-25 proactive visual QA correction increment" not in body:
            body = body.rstrip() + correction_section(number, records)
        if number == 76:
            raise AssertionError("Deferred issue #76 must never enter the correction payload package")

        payload = {
            "repository_full_name": snapshot["repository"],
            "issue_number": number,
            "body": body,
            "state": "open",
            "state_reason": "reopened",
        }
        payload_path = OUT / f"issue-{number}.json"
        payload_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        before_ids = [item["id"] for item in records]
        receipt["finding_count"] += len(records)
        receipt["issues"].append(
            {
                "issue_number": number,
                "title_unchanged": original["title"],
                "before_state": original["state"],
                "before_state_reason": original.get("state_reason"),
                "planned_state": payload["state"],
                "planned_state_reason": payload["state_reason"],
                "before_body_sha256": sha256(original["body"]),
                "planned_body_sha256": sha256(body),
                "before_body_chars": len(original["body"]),
                "planned_body_chars": len(body),
                "qa_ids": before_ids,
                "payload_path": payload_path.name,
                "assignees_before": original.get("assignees"),
                "labels_before": original.get("labels"),
            }
        )

    if receipt["finding_count"] != 87:
        raise ValueError(f"Expected 87 frozen findings, found {receipt['finding_count']}")
    (OUT / "before-after-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    summary_lines = [
        "# Prepared issue lifecycle correction payloads",
        "",
        "Prepared locally from the frozen `live-issues-before.json` and one frozen issue review per task. No GitHub issue was updated.",
        "",
        f"- Repository: `{receipt['repository']}`",
        f"- Issues: {receipt['issue_count']} (61–75, 77–82); issue 76 is excluded.",
        f"- Frozen QA findings: {receipt['finding_count']}.",
        "- Planned update fields only: body, state=open, state_reason=reopened.",
        "- Titles, labels, assignees, and milestones are omitted from update payloads and remain untouched.",
        "- Every original workflow/completion section is retained below a historical heading; a new authoritative `Workflow status` says `in_progress`.",
        "- Each body adds issue-specific QA correction criteria/evidence, one dedicated GPT-6 Luna Max executor, and the approved density contract.",
        "- Density findings now implement/consume the settled 40/44/32/36/40px roles; no new design approval gate is added.",
        "- Current UI proof is fresh local mock Chromium screenshots/measurements plus focused regressions and an honest matrix. Frozen review next-validation suggestions are explicitly nonbinding follow-ups; human, physical-device, real-service, backend, and production checks are not implied or claimed.",
        "- Old completion and 2026-10-24 verification/delegated-acceptance/closure headings are labeled historical.",
        "",
        "| Issue | Baseline state | Planned state | QA IDs | Before body SHA-256 | Planned body SHA-256 |",
        "|---:|---|---|---|---|---|",
    ]
    for entry in receipt["issues"]:
        summary_lines.append(
            f"| {entry['issue_number']} | {entry['before_state']}/{entry['before_state_reason']} | "
            f"{entry['planned_state']}/{entry['planned_state_reason']} | {', '.join(entry['qa_ids'])} | "
            f"`{entry['before_body_sha256']}` | `{entry['planned_body_sha256']}` |"
        )
    summary_lines += ["", "The parent Orchestrator must review these exact payload files and explicitly authorize publication before any GitHub mutation."]
    (OUT / "README.md").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")
    print(f"Prepared {receipt['issue_count']} payloads with {receipt['finding_count']} QA IDs at {OUT}")


if __name__ == "__main__":
    main()
