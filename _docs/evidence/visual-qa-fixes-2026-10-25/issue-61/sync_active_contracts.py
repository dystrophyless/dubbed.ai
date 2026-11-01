from __future__ import annotations

import difflib
import hashlib
import json
import re
from collections import Counter
from pathlib import Path


EVIDENCE = Path("_docs/evidence/visual-qa-fixes-2026-10-25/issue-61")
ORIGINALS = EVIDENCE / "originals"
BEFORE_PATH = EVIDENCE / "active-docs-before.json"
ACTIVE_FLOWS = {
    Path("_docs/frontend-flows") / name
    for name in (
        "01-landing.md",
        "02-sign-in.md",
        "03-registration.md",
        "04-password-reset.md",
        "05-account-linking.md",
        "06-new-dub.md",
        "07-processing.md",
        "09-record.md",
        "10-result.md",
        "11-projects.md",
        "12-credits.md",
        "15-account.md",
    )
}
SHARED = Path("_docs/frontend-flows/00-shared-contract.md")
TOKENS = Path("_docs/frontend-flows/design-tokens.md")
ADOPTION = Path("_docs/frontend-flows/affect-ui-clean-light-adoption.md")
REFERENCE = Path("_docs/frontend-flows/affect-ui-clean-light-reference.md")
WORKFLOW = Path("_docs/frontend-flows/affect-ui-workflow.md")
REGISTER = Path("_docs/frontend-implementation-contract.md")

ROLE_SIZING = (
    "owner-approved role sizes in [design-tokens.md](design-tokens.md): "
    "desktop task 40px / Medium 14px/20px, prominent/landing 44px / "
    "Medium 16px/24px, secondary 32px / Medium 14px/20px, navigation "
    "36px / Medium 14px/20px; medium segmented 40px /14px/20px desktop "
    "and 48px /16px/24px phone"
)
ROLE_LABELS = (
    "buttons use Mabry Pro Medium 14px/20px for task, secondary and "
    "navigation actions and Medium 16px/24px for prominent/landing actions"
)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one occurrence, found {count}")
    return text.replace(old, new, 1)


def all_of(text: str, old: str, new: str, label: str, counts: Counter) -> str:
    n = text.count(old)
    if n:
        text = text.replace(old, new)
        counts[label] += n
    return text


def replace_line(text: str, pattern: str, replacement: str, label: str, counts: Counter) -> str:
    text, n = re.subn(pattern, replacement, text, flags=re.MULTILINE)
    if n != 1:
        raise RuntimeError(f"{label}: expected one matching line, found {n}")
    counts[label] += n
    return text


def rewrite_lines(text: str, pattern: str, replacement: str, label: str, counts: Counter) -> str:
    text, n = re.subn(pattern, replacement, text, flags=re.MULTILINE)
    if n:
        counts[label] += n
    return text


def update_flow(path: Path, text: str, counts: Counter) -> str:
    if path.name == "01-landing.md":
        text = replace_line(
            text,
            r"^\| Mabry Pro Regular/Medium only, no Bold; body Regular.*source compact button exception, 2026-10-23 \|$",
            "| Mabry Pro Regular/Medium only, no Bold; body Regular16px/24px; captions Regular14px/20px; task actions40px/Medium14px/20px; prominent/landing44px/Medium16px/24px; secondary32px/Medium14px/20px; navigation36px/Medium14px/20px; medium segmented40px/14px/20px desktop and48px/16px/24px phone; phone text actions retain48px targets; field labels Medium14px/20px; headings Medium32px/40px desktop and24px/32px phone | Current typography/role contract; owner-approved density update 2026-10-25; original compact source values remain provenance in the reference catalog |",
            "landing historical density row",
            counts,
        )

    text = all_of(text, "compact desktop button density", ROLE_SIZING, "flow role sizing", counts)

    labels = re.compile(
        r"\bbuttons?\s+(?:use|are)\s+(?:Mabry\s+Pro\s+)?Medium\s*"
        r"12\s*px\s*/\s*16\s*px\s+small\s+or\s+13\s*px\s*/\s*20\s*px\s+"
        r"medium/large\s+on\s+desktop;?",
        re.IGNORECASE,
    )

    def label_replacement(match: re.Match[str]) -> str:
        result = ROLE_LABELS
        if match.group(0)[0].isupper():
            result = result[0].upper() + result[1:]
        if match.group(0).rstrip().endswith(";"):
            result += ";"
        return result

    text, n = labels.subn(label_replacement, text)
    counts["flow desktop label roles"] += n

    replacements = (
        (
            "source-sized Mabry Pro Medium desktop button labels",
            "role-specific Mabry Pro Medium desktop labels from design-tokens.md",
            "source label sizing",
        ),
        (
            "source-sized Mabry Pro Medium desktop button",
            "role-specific Mabry Pro Medium desktop button labels from design-tokens.md",
            "source label sizing",
        ),
        (
            "source-sized compact desktop controls/single-line inputs with component-specific source geometry",
            "desktop action controls use the approved role heights in design-tokens.md; single-line inputs use separate derived field geometry; retain mapped component shape and state",
            "desktop controls and field geometry",
        ),
        (
            "source-sized compact desktop controls/single-line inputs",
            "approved desktop action roles and separate derived single-line-input geometry",
            "desktop controls and field geometry",
        ),
        (
            "source-sized compact desktop controls and single-line inputs",
            "approved desktop action roles and separate derived single-line-input geometry",
            "desktop controls and field geometry",
        ),
        (
            "source-sized compact desktop controls at desktop and 48px on phone",
            "desktop action roles in design-tokens.md and 48px phone targets",
            "desktop control sizes",
        ),
        (
            "source-sized compact desktop controls",
            "approved desktop action roles in design-tokens.md",
            "desktop control sizes",
        ),
        (
            "source compact desktop / retained 48px phone-target standard controls",
            "role-sized desktop standard controls in design-tokens.md and 48px phone targets",
            "desktop control sizes",
        ),
        (
            "source compact desktop / retained 48px phone-target height",
            "desktop action heights of 40px task, 44px prominent/landing, 32px secondary and 36px navigation, with 48px phone targets",
            "desktop control sizes",
        ),
        (
            "source compact desktop / retained 48px phone-target",
            "role-sized desktop controls in design-tokens.md and 48px phone targets",
            "desktop control sizes",
        ),
        (
            "source-sized on desktop",
            "role-sized on desktop according to design-tokens.md",
            "desktop control sizes",
        ),
        (
            "compact source buttons",
            "role-sized buttons according to design-tokens.md",
            "desktop control sizes",
        ),
        (
            "source component desktop geometry",
            "current desktop action-role dimensions in design-tokens.md",
            "desktop control sizes",
        ),
    )
    for old, new, label in replacements:
        text = all_of(text, old, new, label, counts)

    if path.name == "01-landing.md":
        old = (
            "Buttons and single-line inputs use component-specific source "
            "geometry and role-sized desktop controls in design-tokens.md "
            "and 48px phone targets height."
        )
        new = (
            "Buttons use the approved desktop role heights in design-tokens.md "
            "(task 40px, prominent/landing 44px, secondary 32px, navigation "
            "36px) and phone targets remain 48px; single-line inputs use "
            "separate derived field geometry. Preserve mapped button shape, "
            "state and brand."
        )
        text = all_of(text, old, new, "landing control geometry", counts)

    if path.name == "06-new-dub.md":
        text = all_of(
            text,
            "Neither minimum applies to generated turns or usable interrupted partial takes.",
            "These are source-file and source-section eligibility limits only; "
            "they do not set a minimum recording turn or microphone take. "
            "Usable interrupted partial takes remain governed by Flow 09.",
            "source minimum distinction",
            counts,
        )
        text = all_of(
            text,
            "These bounds apply to the overall source section, not generated turns or usable interrupted partial takes.",
            "The overall source-section bounds are not a minimum generated-turn "
            "or microphone-take duration; usable interrupted partial takes "
            "remain governed by Flow 09.",
            "source minimum distinction",
            counts,
        )
        text = all_of(
            text,
            "Do not infer the presentation/validation behavior for an original shorter than 1.0 second.",
            "An original source below 1.000 seconds is rejected before this "
            "selection state under AC-F06-02B; exactly 1.000 seconds is eligible.",
            "settled short-source behavior",
            counts,
        )

    if path.name == "09-record.md":
        text = replace_line(
            text,
            r"^- Mabry Pro Regular and Medium only, with no Bold or synthetic Bold:.*$",
            "- Mabry Pro Regular and Medium only, with no Bold or synthetic Bold: body/dialogue Regular 16px/24px, supporting captions Regular 14px/20px; desktop actions use task 40px / Medium 14px/20px, prominent/landing 44px / Medium 16px/24px, secondary 32px / Medium 14px/20px, and navigation 36px / Medium 14px/20px; medium segmented controls use 40px / Medium 14px/20px desktop and 48px / Medium 16px/24px phone; phone text actions retain 48px targets; field labels use Medium 14px/20px; page headings use Medium 32px/40px desktop and 24px/32px phone. No decorative display face or all-caps treatment is used;",
            "Record typography and action roles",
            counts,
        )
        text = all_of(
            text,
            "Entering Record acquires or confirms the sole project-recording grant for the active tab before capture. At most one tab, including another tab in the same browser profile and authenticated session, may capture or accept this project; a second tab may view but cannot capture or accept, and cannot force takeover.",
            "Entering Record acquires or confirms the sole project-recording grant for the active tab before capture. At most one browser tab for this project may capture or accept, including same-profile tabs sharing the existing durable client/session. A second tab may view but cannot capture or accept, and cannot force takeover.",
            "single-tab recording rule",
            counts,
        )

    if path.name == "09-record.md":
        text = replace_line(
            text,
            r"^- \*\*RESOLVED-09-VISUAL:\*\*.*$",
            "- **RESOLVED-09-VISUAL:** The shared treatment references [design-tokens.md](design-tokens.md) for primitive, semantic and component-state roles rather than redefining raw shades. Typography uses Mabry Pro Regular and Medium only. Current desktop action roles are task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px and navigation36px/Medium14px/20px; medium segmented controls are40px/14px/20px desktop and48px/16px/24px phone. Original compact source measurements are provenance in the reference catalog, not current Dubbed button sizes. Phone buttons retain Medium16px/24px and48px targets; field labels remain Medium14px/20px. Control radius, mapped states, gutters, shared spacing, existing-panel padding, the768px boundary and1200px maximum remain governed by the active token contract. Gradients and per-block wrappers remain excluded; mapped source component shadows are required. Font assets/loading, fallback and rendered proof remain open.",
            "Record visual summary density update",
            counts,
        )

    if path.name == "15-account.md":
        text = replace_line(
            text,
            r"^\| RESOLVED-F15-TYPOGRAPHY \|.*$",
            "| RESOLVED-F15-TYPOGRAPHY | Mabry Pro uses Regular and Medium only, with no Bold or synthetic Bold. Body/dialog text is Regular16px/24px; captions are Regular14px/20px; desktop actions are task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px, and navigation36px/Medium14px/20px; medium segmented controls are40px/14px/20px desktop and48px/16px/24px phone; phone text actions retain48px targets; field labels are Medium14px/20px; headings are Medium32px/40px desktop and24px/32px phone. | Current role contract updated by owner on2026-10-25; original compact source sizes remain provenance, while font assets/loading/fallback and rendered proof remain evidence gaps. |",
            "Account typography role summary",
            counts,
        )

    if path.name == "12-credits.md":
        text = once(
            text,
            "| Buttons / field labels | Buttons: Medium 12px/16px small or 13px/20px medium/large on desktop; phone buttons use Mabry Pro Medium 16px/24px with retained 48px targets; field labels: Medium 14px / 20px line height |",
            "| Buttons / field labels | Desktop task: 40px / Medium14px/20px; prominent/landing: 44px / Medium16px/24px; secondary: 32px / Medium14px/20px; navigation: 36px / Medium14px/20px; medium segmented: 40px /14px/20px desktop and48px /16px/24px phone. Phone buttons use Medium16px/24px with 48px minimum targets; field labels use Medium14px/20px. |",
            "Credits button role table",
        )
        counts["Credits button role table"] += 1
        text = once(
            text,
            "| Button / single-line input height | role-sized desktop controls in design-tokens.md and 48px phone targets |",
            "| Button / single-line input height | Desktop action roles: task40px, prominent/landing44px, secondary32px, navigation36px; phone targets at least48px. Single-line inputs use separate derived field geometry. |",
            "Credits button and field heights",
        )
        counts["Credits button and field heights"] += 1
        text = replace_line(
            text,
            r"^- a pending purchase row shows its pack/amount/currency snapshot.*$",
            "- a pending-purchase event is labeled Purchase initiated and shows its related current lifecycle state; optional stored pack/amount/currency facts appear only when captured, with no credit delta or fabricated balance-after value;",
            "pending purchase history label",
            counts,
        )
        text = replace_line(
            text,
            r"^The initial result contains at most the 20 most recent operations\..*$",
            "The initial result contains at most the 20 most recent operations. Show more requests the next older service-defined page and appends records by stable identity; the adapter does not invent a cursor, page order, or concurrency merge rule. An active processing reservation is exposed by the account snapshot as In processing, not inserted into history as a final charge. A pending purchase confirmation is present in the feed as pending but has no credit delta or balance-after value until verified fulfillment. The frontend does not derive either state from local arithmetic.",
            "Credits history boundary",
            counts,
        )
        history_addendum = (
            "\n\n#### Backward-compatible mock history metadata (issue #65)\n\n"
            "PurchaseState and PurchasePackSnapshot are named types. "
            "PurchaseSnapshot.pack and LedgerEntry.relatedPurchase / "
            "relatedPurchase.pack are optional readonly immutable mock facts; "
            "pack facts are captured when a new purchase attempt starts. "
            "relatedPurchase carries the related current purchase lifecycle "
            "through stable relatedOperationId. Legacy rows without stored "
            "pack facts omit amount and credit facts; never infer them from the "
            "current catalog. A pending-purchase event is shown as Purchase "
            "initiated plus its related current state. In processing remains "
            "an active reservation, not a final charge. Ledger kind, delta, "
            "availableAfter, reservedAfter, amount ordering and idempotency "
            "remain unchanged accounting facts. This is a backward-compatible "
            "mock producer/consumer seam: no facade method or real payment "
            "transport is added or claimed."
        )
        text = replace_line(
            text,
            r"^### 9\.5 .*$",
            lambda m: m.group(0) + history_addendum,
            "Credits mock history contract",
            counts,
        )
        text = replace_line(
            text,
            r"^- whether purchase initiation, payment, or fulfillment is pending, including the `Confirming payment` history state with no posted movement;$",
            "- whether purchase initiation, payment, or fulfillment is pending; the checkout status may be `Confirming payment`, while its pending history event is `Purchase initiated` with the related current state and no posted movement;",
            "Credits pending status versus history label",
            counts,
        )
        text = replace_line(
            text,
            r"^\| `reconciling-return` \|.*$",
            "| `reconciling-return` | Prior known facts retained; checkout status is `Confirming payment`; pending history row is `Purchase initiated` with its related current state | Automatic service-directed refresh/reconciliation; user may leave; explicit retry only when safe |",
            "Credits reconciling row label",
            counts,
        )
        text = replace_line(
            text,
            r"^\| `returned-unverified` \|.*$",
            "| `returned-unverified` | Browser returned with a claim or opaque result, verification not complete | Show `Confirming payment`; add/update the authoritative pending history event labeled `Purchase initiated` with its related current state; automatically refresh status; grant nothing |",
            "Credits returned-unverified row label",
            counts,
        )
        text = replace_line(
            text,
            r"^7\. If pending, show `Confirming payment`.*$",
            "7. If pending, show `Confirming payment` as the checkout status and publish/update its non-posted history event as `Purchase initiated` with the related current state; allow navigation away and continue automatic safe reconciliation; do not add credits, fabricate balance-after, or increase capacity.",
            "Credits reconciliation step label",
            counts,
        )
        text = replace_line(
            text,
            r"^\| Browser returns `success` but service is pending \|.*$",
            "| Browser returns `success` but service is pending | Show checkout status `Confirming payment` and retain a non-posted `Purchase initiated` history event with related current state; user may leave | Redirect is not proof; no credits, balance-after, or slot upgrade |",
            "Credits browser-return row label",
            counts,
        )
        text = once(
            text,
            "keeps a pending unified-history row across reload/close.",
            "keeps a pending unified-history event labeled `Purchase initiated` with the related current state across reload/close.",
            "Credits pending recovery acceptance",
        )
        counts["Credits pending recovery acceptance"] += 1
        text = once(
            text,
            "- `Confirming payment` with automatic reconciliation, navigation away, and a pending unified-history row carrying no delta or balance-after;",
            "- checkout status `Confirming payment` with automatic reconciliation and navigation away, plus a pending unified-history event labeled `Purchase initiated` with related current state and no delta or balance-after;",
            "Credits required pending behavior",
        )
        counts["Credits required pending behavior"] += 1
        text = once(
            text,
            "- After same-tab checkout return without confirmation, verify `Confirming payment`, automatic service-directed refresh/reconciliation, leave-and-return recovery, and one pending unified-history row with no credit delta/balance-after.",
            "- After same-tab checkout return without confirmation, verify checkout status `Confirming payment`, automatic service-directed refresh/reconciliation, leave-and-return recovery, and one pending unified-history event labeled `Purchase initiated` with the related current state and no credit delta/balance-after.",
            "Credits pending return verification",
        )
        counts["Credits pending return verification"] += 1
        text = once(
            text,
            "- Verify a pending purchase is visible as `Confirming payment` but not as a verified purchase or posted balance change; cancelled, failed, and unverified attempts likewise create no posted movement.",
            "- Verify a pending history event is labeled `Purchase initiated` with its related current state, not as a verified purchase or posted balance change; cancelled, failed, and unverified attempts likewise create no posted movement.",
            "Credits pending history verification",
        )
        counts["Credits pending history verification"] += 1
        text = once(
            text,
            "**Pending confirmation resolved:** checkout return without authoritative confirmation shows `Confirming payment`, automatically reconciles, permits leaving, and stays visible in unified history without a delta/balance-after or two-to-ten slot upgrade until verified success.",
            "**Pending confirmation resolved:** checkout return without authoritative confirmation shows checkout status `Confirming payment`, automatically reconciles, permits leaving, and keeps a non-posted unified-history event labeled `Purchase initiated` with related current state until verified success; no delta/balance-after or two-to-ten slot upgrade occurs before verification.",
            "Credits resolved pending history label",
        )
        counts["Credits resolved pending history label"] += 1

    return text


def update_tokens(text: str, counts: Counter) -> str:
    rows = (
        (
            "| Desktop button density | Source small 24px high / padding 8px / gap 4px / icon 14px / Medium 12px/16px; default medium 28px / padding 10px / gap 6px / icon 16px / Medium 13px/20px; large 32px / padding 12px / gap 6px / icon 16px / Medium 13px/20px. Mabry replaces the source font. |",
            "| Desktop action roles | Task: 40px high, Mabry Pro Medium14px/20px, 14px horizontal padding, 8px gap, 16px icon; prominent/landing: 44px, Medium16px/24px, 16px horizontal padding; secondary: 32px, Medium14px/20px; shared navigation: 36px, Medium14px/20px. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; incidental compact controls require documented rationale. |",
            "token desktop action roles",
        ),
        (
            "| Phone button text | Retained Mabry Pro Medium 16px / 24px; the source compact 12/16 and 13/20 typography applies to desktop buttons only |",
            "| Phone button text | Mabry Pro Medium 16px / 24px; desktop label sizes follow their role above and do not reduce phone typography |",
            "token phone button text",
        ),
        (
            "| Phone control target | At least retained 48px standard interactive targets; preserve each mapped component's own visible radius/state treatment, including OTP radius8 and segmented outerradius8 |",
            "| Control targets | Desktop icon-only targets are at least 40x40px. Phone targets are at least 48px, including 48x48px icon-only targets and text actions 48px high with 16px/24px labels; preserve mapped component states and geometry |",
            "token control targets",
        ),
        (
            "| Button radius | Source 6px; other components use their own mapped geometry, not a blanket 6px rule |",
            "| Button radius | Mapped button radius 6px; other components use their own mapped geometry, not a blanket 6px rule |",
            "token button radius",
        ),
        (
            "| Existing Original / My recording choice | SEG medium28px desktop options, padding0 10px, text13px/20px Medium, icon16/gap8; outerradius8, option/indicatorradius6, trayblack.04/padding2 with white selected pill. Phone options have at least48px targets; required source/disabled reasons use readable text. |",
            "| Existing Original / My recording choice | Medium segmented controls are 40px high / Medium14px/20px on desktop and 48px / Medium16px/24px on phone. Preserve mapped 10px horizontal padding, icon16/gap8, outerradius8, option/indicatorradius6, trayblack.04/padding2 and white selected pill. Phone options have at least48px targets; required source/disabled reasons use readable text. |",
            "token segmented control roles",
        ),
        (
            "| Existing menu | PRO white radius10/padding4, maximum260px (constrain to available width), source floating shadow; desktop row32px/padding0 8/gap10/radius6. Phone rows at least48px targets and readable labels; no copied profile-completion block. |",
            "| Existing menu | PRO white radius10/padding4, maximum260px (constrain to available width), mapped floating shadow; desktop menu actions use secondary32px / Mabry Pro Medium14px/20px, padding0 8/gap10/radius6. Phone rows at least48px targets and readable labels; no copied profile-completion block. |",
            "token menu role",
        ),
        (
            "Mabry is the explicit font exception to the source. Preserve existing readable body/dialogue sizes; the source's compact component density does not authorize shrinking recording dialogue or billing facts. Source component state/shape/shadow and internal proportions must remain recognizable after responsive/accessibility adaptation. No permanent sidebar, generic dashboard tiles, new form fields or copied source business content.",
            "Mabry Pro is the explicit font exception to source typography. Current Dubbed action sizes follow the owner-approved role map; original source dimensions are provenance only. Preserve mapped component state, shape, color, brand and suitable internal spacing/shadows; do not shrink recording dialogue or billing facts to match an original compact source control. No permanent sidebar, generic dashboard tiles, new form fields or copied source business content.",
            "token provenance boundary",
        ),
        (
            "measure retained phone button labels at Medium16px/24px independently from compact desktop button labels. Compare source shape, internal spacing, shadows, density and motion while checking retained product hierarchy.",
            "measure each desktop role's label and target independently from retained phone button labels at Medium16px/24px. Compare mapped source shape, internal spacing, shadows and motion against approved product role sizes while checking hierarchy.",
            "token validation plan",
        ),
        (
            "This docs-only migration runs no application or browser acceptance check. The owner selected source compact desktop buttons (24/28/32px) and retained 48px phone interaction targets on 2026-10-23; no density choice remains open.",
            "This docs-only correction runs no application or browser acceptance check. On 2026-10-25 the owner approved desktop task40px, prominent/landing44px, secondary32px, navigation36px and medium-segmented40px roles; medium segmented phone controls and phone targets remain48px. Original source24/28/32px values and12/16,13/20 labels remain provenance in the reference catalog, not current Dubbed targets.",
            "token dated decision",
        ),
    )
    for old, new, label in rows:
        text = once(text, old, new, label)
        counts[label] += 1
    return text


def update_adoption(text: str, counts: Counter) -> str:
    text = once(
        text,
        "1. **Typeface:** use Mabry Pro Regular/Medium, never the source font as a new brand choice. Preserve 16/24 body/dialogue, 14/20 captions, 32/40 desktop and 24/32 phone headings; no Bold/synthetic Bold. The owner selected source compact desktop button heights24/28/32px with Medium12/16 small or13/20 medium/large labels; phone buttons retain Mabry Pro Medium16px/24px labels and48px interaction targets. Other components retain their individual source geometry, including OTP40x44/radius8/gap8 and segmented outerradius8/optionradius6.",
        "1. **Typeface and role sizing:** use Mabry Pro Regular/Medium, never the source font as a new brand choice. Preserve 16/24 body/dialogue, 14/20 captions, 32/40 desktop and 24/32 phone headings; no Bold/synthetic Bold. Current desktop roles are task40px with Medium14px/20px, 14px horizontal padding, 8px gap and16px icon; prominent/landing44px with Medium16px/24px and16px horizontal padding; secondary32px with Medium14px/20px; navigation36px with Medium14px/20px; medium segmented40px/14px/20px desktop and48px/16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; an incidental compact control needs a documented rationale. Desktop icon-only targets are at least40x40px; all phone targets are at least48px, including 48x48px icon-only and48px-high text actions. The source catalog retains original24/28/32px heights and12/16,13/20 labels as provenance only, not Dubbed targets. Other components retain their mapped geometry, including OTP40x44/radius8/gap8 and segmented outerradius8/optionradius6.",
        "adoption density exception",
    )
    counts["adoption density exception"] += 1
    return text


def update_reference(text: str, counts: Counter) -> str:
    text = once(
        text,
        "Date: 2026-10-23 (Asia/Qyzylorda). Scope: specification and source-reference evidence only.",
        "Date: 2026-10-23 (Asia/Qyzylorda). Scope: specification and source-reference evidence only.\n\nThe catalog below preserves original inspected source measurements as provenance. Those values are not current Dubbed control targets after the 2026-10-25 owner-approved role update in design-tokens.md. This document makes no claim about current Dubbed CSS or rendered acceptance.",
        "reference provenance note",
    )
    counts["reference provenance note"] += 1
    text = once(
        text,
        "Source typography is Inter/InterVariable, regular 400 and medium 500 in the selected components. Dubbed substitutes **Mabry Pro Regular/Medium** by explicit owner instruction; no synthetic bold or Inter installation follows from adoption. Dubbed body/dialogue 16/24, readable supporting captions 14/20 and established page headings remain product typography roles. The owner explicitly confirmed source compact desktop button heights24/28/32 and source Medium12/16 small, Medium13/20 medium/large, while retaining a48px phone interaction area. These are separate roles, not a global reduction of body text or a single radius applied to every component.",
        "Source typography is Inter/InterVariable, regular400 and medium500 in the selected components. Dubbed substitutes Mabry Pro Regular/Medium by explicit owner instruction; no synthetic bold or Inter installation follows from adoption. Dubbed body/dialogue16/24, readable supporting captions14/20 and established page headings remain product typography roles. The24/28/32px source button heights and12/16 small,13/20 medium/large source labels remain original source values in this catalog only. Current Dubbed desktop/phone action sizes follow the owner-approved role contract in design-tokens.md; source measurements are not current product targets.",
        "reference original source values",
    )
    counts["reference original source values"] += 1
    return text


def update_workflow(text: str, counts: Counter) -> str:
    text = once(
        text,
        "Compact source button heights 24/28/32px and Medium 12/16 or 13/20 labels apply to desktop only. Phone action buttons retain Mabry Pro Medium 16/24 and the 48px standard touch target; preserve the source state/shape treatment without shrinking phone labels to desktop density. OTP and other non-button controls keep their named component-specific geometry and accessibility adaptations.",
        "Current Dubbed sizes follow the approved roles in design-tokens.md: task40px/Medium14px/20px, prominent/landing44px/Medium16px/24px, secondary32px/Medium14px/20px, navigation36px/Medium14px/20px, and medium segmented40px/14px/20px desktop plus48px/16px/24px phone. Catalogued original source24/28/32px heights and12/16,13/20 labels remain provenance only. Phone action targets remain at least48px; preserve mapped source state/shape/brand without treating source compact measurements as Dubbed targets. OTP and other non-button controls keep their named geometry and accessibility adaptations.",
        "workflow density clause",
    )
    counts["workflow density clause"] += 1
    return text


def update_shared(text: str, counts: Counter) -> str:
    text = once(
        text,
        "| Desktop button sizes | Source24/28/32px heights; Medium12px/16px small or13px/20px medium/large; 6px radius |",
        "| Desktop action roles | Task40px high / Mabry Pro Medium14px/20px / 14px horizontal padding / 8px gap / 16px icon; prominent/landing44px / Medium16px/24px / 16px horizontal padding; secondary32px / Medium14px/20px; navigation36px / Medium14px/20px; medium segmented40px /14px/20px desktop and48px /16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; incidental compact controls need a documented reason. |",
        "shared desktop role table",
    )
    counts["shared desktop role table"] += 1
    table_anchor = (
        "| Desktop action roles | Task40px high / Mabry Pro Medium14px/20px / 14px horizontal padding / 8px gap / 16px icon; prominent/landing44px / Medium16px/24px / 16px horizontal padding; secondary32px / Medium14px/20px; navigation36px / Medium14px/20px; medium segmented40px /14px/20px desktop and48px /16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use task; incidental compact controls need a documented reason. |"
    )
    table_rows = (
        "\n| Control targets | Desktop icon-only targets are at least40x40px; all phone targets are at least48px, including 48x48px icon-only targets and text actions48px high with16px/24px labels. |"
        "\n| Original source density provenance | Original source24/28/32px heights and12/16 small,13/20 medium/large labels remain in the reference catalog only; they are not current Dubbed target sizes. |"
    )
    text = once(text, table_anchor, table_anchor + table_rows, "shared source provenance rows")
    counts["shared source provenance rows"] += 1
    text = once(
        text,
        "| Phone controls | Retained48px interactive targets; button labels remain Mabry Pro Medium16px/24px; readable input text and each component's visible character/target separation remain required |",
        "| Phone controls | All interactive targets at least48px; text actions are48px high with Mabry Pro Medium16px/24px labels, icon-only targets are48x48px; readable input text and character/target separation remain required |",
        "shared phone controls",
    )
    counts["shared phone controls"] += 1
    text = once(
        text,
        "The owner confirmed source compact desktop button density and retained48px phone interaction targets; the desktop-only typography change leaves prior phone button labels at Mabry Pro Medium16px/24px. These choices are resolved. Only Light renders, including under OS dark preference; no theme toggle or imported .dark behavior. Only selected component treatments are adopted. The source defines no generic input/dialog/waveform/player, so their exact derivative visual mappings are explicit in design-tokens.md; do not invent source counterparts.",
        "The owner approved current role-based desktop action sizes on 2026-10-25, as listed above. Phone labels remain Mabry Pro Medium16px/24px and all phone targets are at least48px. Original compact source dimensions remain source provenance only, not Dubbed targets. These choices are resolved with no new design-approval gate. Only Light renders, including under OS dark preference; no theme toggle or imported .dark behavior. Only selected component treatments are adopted. The source defines no generic input/dialog/waveform/player, so their derivative visual mappings are explicit in design-tokens.md; do not invent source counterparts.",
        "shared density decision",
    )
    counts["shared density decision"] += 1
    text = replace_line(
        text,
        r"^## Owner answer — final shared weights and line heights, 2026-10-22.*$",
        "## Historical owner answer — final shared weights and line heights, 2026-10-22 — desktop button roles updated 2026-10-25",
        "historical typography heading",
        counts,
    )
    text = replace_line(
        text,
        r"^Use Mabry Pro Regular and Medium only; no Bold\..*$",
        "Historical 2022 answer: use Mabry Pro Regular and Medium only; no Bold. Body and dialogue text: Regular16px with24px line height. Supporting captions: Regular14px with20px line height. Buttons, field labels and page headings use Medium. Page headings:32px with40px line height on desktop;24px with32px line height on phone. At that time, this answer did not select a new button/field-label size. The current desktop button roles are set by the 2026-10-25 density contract above. These weights and line heights replaced earlier OPEN wording. Actual font assets, browser loading and fallback availability still need verification; do not silently substitute synthetic Bold or claim font files are present.",
        "historical typography body",
        counts,
    )
    text = once(
        text,
        "## Owner answer — selected source-section duration limits, 2026-10-22\n\nHistorical precision and early-stop references below are superseded by the later millisecond correction and REC-B01 (2026-10-23). The inclusive 1–120-second source-section bounds remain current; they do not impose a minimum on usable interrupted partial takes.\n\nThe selected overall source section must last at least1second and at most120seconds, inclusive, with the approved0.1-second selection precision. Enforce the same interval limits in timeline handles and Start/End fields before authorization. This is the pre-processing source-section range, not a minimum generated-turn length or minimum microphone performance duration. Preserve the fixed-turn early-stop/shorter-take rules. Reject an original source shorter than 1.000 seconds during upload validation before a new project/source commit or an eligible replacement; exactly 1.000 seconds is eligible. Initial rejection creates no project, capacity/slot mutation, or persisted source-media object and has no quote or credit effect. Rejected replacement preserves the existing project, source, title/provenance, selected section, quote, occupied slot, media, and credit state.",
        "## Historical owner answer — selected source-section duration limits, 2026-10-22\n\nHistorical precision and early-stop references below are superseded by the later millisecond correction and REC-B01 (2026-10-23). The inclusive 1–120-second source-section bounds remain current; they do not impose a minimum on usable interrupted partial takes.\n\nHistorical 2022 answer: the selected overall source section was stated as at least1second and at most120seconds inclusive at0.1-second precision. That precision is superseded by the later0.001-second correction below. This source-section limit is distinct from original source-file eligibility and is not a minimum generated-turn or microphone-take duration. Usable interrupted partial takes remain governed by Flow 09.",
        "historical source section",
    )
    counts["historical source section"] += 1
    source_anchor = (
        "The owner clarified the new precision as three decimal places:0.001second, e.g.12.345seconds. This supersedes the earlier0.1-second selection precision for timeline handles and Start/End fields. Apply the already selected downward end-normalization policy at the new precision:12.3456seconds becomes12.345seconds, while12.34 is representable as12.340 without losing0.04seconds. The earlier floor-to-tenth examples are historical and must not remain normative. Keep inclusive1–120second selected-range limits, one shared displayed/persisted/authorized/output interval, no frame-editor feature and one ceil over total selected duration at1credit/second. Millisecond UI precision is not a claim of measured frame/sample/capture accuracy; internal media alignment and playback evidence remain technical requirements."
    )
    source_rule = (
        "\n\n## Owner answer — original-source duration eligibility, 2026-10-25\n\n"
        "Reject an original video source shorter than1.000 seconds during upload validation before a new project/source commit or eligible source replacement; exactly1.000 seconds is eligible. Initial rejection creates no project, capacity/slot mutation or persisted source-media object and has no quote or credit effect. A rejected replacement preserves the existing project, source, title/provenance, selected section, quote, occupied slot, media and credit state. This original-file eligibility rule is separate from the 1–120-second selected source-section bounds and is not a minimum generated turn or microphone take; usable interrupted partial takes remain governed by Flow 09."
    )
    text = once(text, source_anchor, source_anchor + source_rule, "dated source eligibility")
    counts["dated source eligibility"] += 1
    text = replace_line(
        text,
        r"^## Owner answer — button and field-label type sizes, 2026-10-22.*$",
        "## Historical owner answer — button and field-label type sizes, 2026-10-22 — uniform button size superseded on 2026-10-25",
        "historical uniform button heading",
        counts,
    )
    text = replace_line(
        text,
        r"^Across active frontend screens, button text uses Mabry Pro Medium16px.*$",
        "Historical 2022 answer: across active frontend screens, button text used Mabry Pro Medium16px with24px line height. Labels above fields used Mabry Pro Medium14px with20px line height. The answer resolved independent review PKG-R13 and superseded earlier references to an unidentified approved size or no selected size for these roles. Standard control heights were40px desktop/48px phone at that time. The 2026-10-25 role contract above now governs button heights and desktop labels; field labels remain Medium14px/20px.",
        "historical uniform button body",
        counts,
    )
    return text


def update_register(text: str, counts: Counter) -> str:
    text = once(
        text,
        "Date: 2026-10-23. Scope: the authorized backend-free implementation of frontend issues #61–82. This register freezes bounded technical conventions for that implementation and inventories the remaining source-flow gates. It does not approve production policy, close an external integration gate, or replace the active flow specifications.",
        "Original register date: 2026-10-23; additive contract corrections: 2026-10-25. Scope: the authorized backend-free implementation of frontend issues #61–82. This register freezes bounded technical conventions for that implementation and inventories the remaining source-flow gates. It does not approve production policy, close an external integration gate, or replace the active flow specifications.",
        "register date",
    )
    counts["register date"] += 1
    addendum = (
        "\n\n## 2026-10-25 additive owner-approved contract corrections\n\n"
        "These product choices are settled current requirements; no new design approval gate is pending. Original inspected source dimensions stay labeled as source provenance, not Dubbed product targets. This register synchronizes documentation and does not claim rendered acceptance.\n\n"
        "### Shared control roles\n\n"
        "Desktop task actions are40px high with Mabry Pro Medium14px/20px, 14px horizontal padding, 8px gap and16px icons. Prominent/landing actions are44px high with Medium16px/24px and16px horizontal padding. Secondary controls are32px with Medium14px/20px; shared navigation is36px with Medium14px/20px. Medium segmented controls are40px/14px/20px desktop and48px/16px/24px phone. Frequent Record/Play/Next and consequential purchase/download/guard actions use the task role; an incidental compact control requires a documented rationale. Desktop icon-only targets are at least40x40px. Phone targets are at least48px, including 48x48px icon-only targets and48px-high text actions. The reference catalog original24/28/32px heights and12/16,13/20 labels are provenance only.\n\n"
        "### Original-source eligibility and recording tabs\n\n"
        "Original video shorter than1.000 seconds is rejected during upload validation before new project/source commit or eligible replacement; exactly1.000 seconds is eligible. Initial rejection has no project/slot/source-media/quote/credit effect. Rejected replacement preserves the project, source, title/provenance, selected section, quote, occupied slot, media and credits. This is source-file eligibility, not a minimum source section, generated turn or microphone take. At most one browser tab per project may capture or accept, including same-profile tabs sharing the durable client/session. A second tab is view-only for capture/acceptance and cannot force takeover. Authentication and durable client/session identity do not change. Production lease timing, disconnect classification and fencing remain evidence gates under OPEN-09-13-LEASE.\n\n"
        "### Bounded mock purchase-history metadata (#65)\n\n"
        "PurchaseState and PurchasePackSnapshot are named types. PurchaseSnapshot.pack and LedgerEntry.relatedPurchase / relatedPurchase.pack are optional readonly immutable mock facts, with pack facts captured when a new attempt starts and current purchase lifecycle joined through stable relatedOperationId. Legacy attempts without stored facts omit amount/credit facts and never infer them from the current catalog. Pending-purchase history displays Purchase initiated plus the related current state; In processing is a reservation, not a final charge. Ledger kind, delta, availableAfter, reservedAfter, amount ordering and idempotency remain unchanged. This is optional mock producer/consumer metadata only: no new facade method or real transport is implied."
    )
    text = replace_line(
        text,
        r"^\| Support contact \|.*$",
        lambda m: m.group(0) + addendum,
        "register additive decisions",
        counts,
    )

    purchase_row = (
        "\n| Optional purchase-history metadata | PurchaseState/PurchasePackSnapshot types; optional PurchaseSnapshot.pack and readonly LedgerEntry.relatedPurchase / relatedPurchase.pack facts captured at a new attempt; lifecycle links by relatedOperationId. Legacy missing facts omit amount/credit values. | #65 mock producer / Flow 12 history consumer. | Backward-compatible mock enrichment only; accounting fields/order/idempotency and facade methods are unchanged; no real payment transport is claimed. |"
    )
    text = replace_line(
        text,
        r"^\| Credit settlement and checkout \|.*$",
        lambda m: m.group(0) + purchase_row,
        "register purchase metadata row",
        counts,
    )

    text = replace_line(
        text,
        r"^\| 06 — New dub \| \[.*$",
        "| 06 — New dub | [§15, OPEN decisions and evidence gaps](frontend-flows/06-new-dub.md#15-open-decisions-and-evidence-gaps): cleanup/commit fencing, transient selection-edge and alignment/serialization mechanics, media compatibility, quote validity, preview recovery, content policy, and remaining visual evidence remain open. Original source files below1.000 seconds are rejected before project/source commit; exactly1.000 seconds is eligible and rejected replacement preserves project/source/title/provenance/selection/quote/slot/media/credit state. This is not a source-section, recording-turn or microphone-take minimum. | #81; media evidence #64 |",
        "register Flow06",
        counts,
    )
    text = replace_line(
        text,
        r"^\| 09 — Record \| \[.*$",
        "| 09 — Record | [§15, Open decisions](frontend-flows/09-record.md#15-open-decisions): geometry/font/rendered evidence, capture margins/tolerance, remaining copy, cleanup timing, and production lease/heartbeat/disconnect/stale-write mechanics. F09-AC-30 settles one recording tab per project; a second same-profile tab is view-only and cannot force takeover. | #77 AC-07; integrated browser criterion #63 AC-04; media evidence #69 and #64 |",
        "register Flow09",
        counts,
    )
    text = replace_line(
        text,
        r"^\| Recording lease and write fence \|.*$",
        "| Recording lease and write fence | Mock grant lasts45 seconds with a fence token/revision. Renew access extends only the same live account/client/session grant and never reacquires an expired grant. Writes carry expected grant revision; stale/lost/expired grants reject late writes and preserve durable state. | #77 recording service / RecordingScreen. | Mock renewal/revision/expiry only; 45 seconds is not a production lease policy. OPEN-09-13-LEASE and real reconnect/disconnect fencing remain open. |",
        "register lease row",
        counts,
    )
    text = replace_line(
        text,
        r"^\| Synthetic recording window and media facts \|.*$",
        lambda m: m.group(0)
        + "\n| IndexedDB retry boundary | Database open/retry recovery stays private to persistence. No whenReady/retryStorage method is added to the Services facade. | #73 persistence implementation / #68 facade consumer. | Internal mock reliability behavior only; no public API or production availability promise. |",
        "register database retry row",
        counts,
    )
    text = replace_line(
        text,
        r"^\| 09 — Record \| Product owner.*$",
        "| 09 — Record | Product owner for remaining capture/leave copy and margins; engineering/media owner for lease, device, cleanup, and stale-write evidence. | Confirm capture margin/tolerance and cleanup retention; prove renewal, interruption/reconnect, same-profile second-tab denial, competing-client fencing, and usable-silence validation. | Approved capture behavior and production device/lease/cleanup evidence pass valid, interrupted, expired-grant, stale-write, and same-profile competing-tab tests. |",
        "register Flow09 resume gate",
        counts,
    )

    text = replace_line(
        text,
        r"^- Flow 06 .*",
        "- Flow 06 source eligibility is settled: reject original files below1.000 seconds, admit exactly1.000 seconds, and preserve the existing project/source/selection/quote/slot/media/credit state on rejected replacement. This is not a source-section, recording-turn or microphone-take minimum. Remaining OPEN-F06-T02 questions are transient field behavior and technical alignment/serialization mechanics.",
        "resolved source eligibility summary",
        counts,
    )
    text = replace_line(
        text,
        r"^- Flow 15 .*",
        lambda m: m.group(0)
        + "\n- Flow 09 same-profile tab exclusivity is settled in F09-AC-30: one tab per project may capture/accept; a second same-profile tab is view-only and cannot force takeover, with authentication and durable client/session identity unchanged. OPEN-09-13-LEASE remains open for production lease timing, disconnect classification and fencing evidence; #77 AC-07 and #63 AC-04 are the linked implementation/integration gates.",
        "resolved recording tab summary",
        counts,
    )
    text = once(
        text,
        "This register records code and mock-service contracts in a shared dirty worktree. It is not an acceptance receipt. The service tests, browser media tests, runtime checks, issue status, integration-gate evidence, and rendered screenshot review must be reported separately with their commands and current worktree boundary. No commit, push, issue mutation, real provider call, external email, real backend call, production media conversion, or production policy approval is represented here.",
        "This register records source and mock-service contracts in a shared dirty worktree; it is not product or implementation acceptance. The 2026-10-25 lifecycle correction publication is separately reconciled in the issue-61 evidence directory and reopens the scoped correction issues without accepting code or closing them. Service tests, browser media evidence, runtime checks, integration gates and rendered screenshots must be reported separately with their commands and current worktree boundary. No commit, push, real provider call, external email, real backend call, production media conversion, or production policy approval is represented here.",
        "register verification boundary",
    )
    counts["register verification boundary"] += 1
    return text


def transform(path: Path, text: str, counts: Counter) -> str:
    if path in ACTIVE_FLOWS:
        return update_flow(path, text, counts)
    if path == TOKENS:
        return update_tokens(text, counts)
    if path == ADOPTION:
        return update_adoption(text, counts)
    if path == REFERENCE:
        return update_reference(text, counts)
    if path == WORKFLOW:
        return update_workflow(text, counts)
    if path == SHARED:
        return update_shared(text, counts)
    if path == REGISTER:
        return update_register(text, counts)
    raise RuntimeError(f"unexpected document in active baseline: {path}")


def main() -> None:
    before = json.loads(BEFORE_PATH.read_text(encoding="utf-8"))
    baseline = {item["path"]: item for item in before["files"]}
    previous_after_path = EVIDENCE / "active-docs-after.json"
    previous_after = {}
    if previous_after_path.exists():
        previous = json.loads(previous_after_path.read_text(encoding="utf-8"))
        previous_after = {item["path"]: item["after_sha256"] for item in previous["files"]}
    planned: dict[Path, bytes] = {}
    counts: Counter = Counter()

    for relative, item in baseline.items():
        path = Path(relative)
        original_path = ORIGINALS / path
        original = original_path.read_bytes()
        current_hash = sha(path.read_bytes())
        allowed_current = {item["sha256"], previous_after.get(relative)}
        if sha(original) != item["sha256"] or current_hash not in allowed_current:
            raise RuntimeError(f"pre-edit baseline mismatch: {relative}")
        original_crlf = original.count(b"\r\n")
        original_lf = original.count(b"\n")
        if original_crlf not in (0, original_lf):
            raise RuntimeError(f"mixed line endings require manual preservation: {relative}")
        text = original.decode("utf-8").replace("\r\n", "\n")
        transformed = transform(path, text, counts)
        encoded = transformed.replace("\n", "\r\n").encode("utf-8") if original_crlf else transformed.encode("utf-8")
        planned[path] = encoded

    for path, data in planned.items():
        text = data.decode("utf-8")
        if path in ACTIVE_FLOWS:
            stale_phrases = (
                "compact desktop button density",
                "source-sized compact desktop controls",
                "source compact desktop",
                "compact source buttons",
                "source-sized Mabry Pro Medium desktop button",
            )
            for phrase in stale_phrases:
                if phrase.lower() in text.lower():
                    raise RuntimeError(f"stale sizing clause remains in {path}: {phrase}")
            if re.search(
                r"buttons?\s+(?:use|are)\s+(?:Mabry\s+Pro\s+)?Medium\s*"
                r"12\s*px\s*/\s*16\s*px\s+small\s+or\s+13\s*px\s*/\s*20\s*px",
                text,
                re.IGNORECASE,
            ):
                raise RuntimeError(f"old compact desktop label role remains in {path}")

    for path, data in planned.items():
        path.write_bytes(data)

    after_files = []
    diffs = []
    for relative, item in baseline.items():
        path = Path(relative)
        old_text = (ORIGINALS / path).read_bytes().decode("utf-8").replace("\r\n", "\n")
        new_bytes = path.read_bytes()
        new_text = new_bytes.decode("utf-8").replace("\r\n", "\n")
        new_hash = sha(new_bytes)
        after_files.append(
            {
                "path": relative,
                "before_sha256": item["sha256"],
                "after_sha256": new_hash,
                "bytes_before": item["bytes"],
                "bytes_after": len(new_bytes),
                "changed": new_hash != item["sha256"],
                "crlf": new_bytes.count(b"\r\n"),
                "lf": new_bytes.count(b"\n"),
            }
        )
        if new_hash != item["sha256"]:
            diffs.extend(
                difflib.unified_diff(
                    old_text.splitlines(keepends=True),
                    new_text.splitlines(keepends=True),
                    fromfile=f"a/{relative}",
                    tofile=f"b/{relative}",
                    n=3,
                )
            )

    changed = [entry["path"] for entry in after_files if entry["changed"]]
    if not changed:
        raise RuntimeError("no active contract changes were planned")
    after = {
        "captured_at": "2026-10-25",
        "purpose": "Issue 61 active-flow and implementation-contract synchronization.",
        "originals_manifest": "originals-manifest.json",
        "originals_and_after_copies": "LOCAL EVIDENCE ONLY; exclude from commit/publication.",
        "changed_paths": changed,
        "files": after_files,
    }
    (EVIDENCE / "active-docs-after.json").write_text(
        json.dumps(after, indent=2) + "\n",
        encoding="utf-8",
    )
    (EVIDENCE / "active-docs-change-log.json").write_text(
        json.dumps(
            {
                "date": "2026-10-25",
                "changed_paths": changed,
                "replacement_counts": dict(sorted(counts.items())),
                "claim_boundary": "Static document synchronization only; task 61 claims no browser/runtime acceptance.",
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    (EVIDENCE / "active-docs-scoped.diff").write_text(
        "".join(diffs),
        encoding="utf-8",
        newline="",
    )
    print(json.dumps({"changed_paths": changed, "replacement_counts": dict(sorted(counts.items()))}, indent=2))


if __name__ == "__main__":
    main()
