# QA62-06 Account density and Flow09 scroll follow-up - 2026-10-25

Root authorized this bounded documentation correction. Flow 15, the shared design-token register, Flow 09, and the tracked implementation register now describe the same settled contract.

## Account settings density

The exception applies only to Flow 15 QA62-06. `.account-screen` uses `16px 0 64px` desktop and `32px 0 56px` phone body padding. Shared App main sizing and gutters stay unchanged. Desktop sections use `8px` vertical padding and a `24px` gap; the single derivative content card uses `10px` vertical / `16px` horizontal padding and a `10px` gap. Phone sections use `22px` vertical padding and a `16px` gap; cards use `16px` padding. The shared `24px` desktop / `16px` phone panel defaults remain in effect elsewhere.

The owner authorized correction of poor small sizing. The Orchestrator selected these exact density values under delegation; the values were not separately human pixel-approved. This bounded source-gap exception retains Clean/Light, Mabry Pro, mapped radii and control geometry, and 48px phone targets. It does not create a universal panel default.

## Flow 09 desktop scroll reachability

At `1440x700`, Root triage called out that a normal-flow controls panel ending at `y=707.98px` is ordinary below-fold content and not occlusion by itself. Desktop controls must scroll fully into view, remain keyboard reachable, and avoid hidden-overflow clipping. The planned #63 check asserts reachability; it does not require every control to begin above the initial fold. Phone pin/fallback rules remain unchanged.

## Verification boundary

The prior Root visual readback for the Account layout recorded Delete at `y=853` in a 900px viewport and included a 700px scroll review. This docs-only follow-up ran no browser and produced no screenshot. Static checks confirm the four clauses are synchronized, the other 14 active files did not change, and all 18 frozen originals still match their manifest. No product acceptance or omitted-check PASS is claimed.

Evidence: `active-docs-pre-account-density-followup-2026-10-25.json`, `active-docs-after.json`, `account-density-followup-scoped.diff`, `active-docs-scoped.diff`, and `account-density-followup-receipt-2026-10-25.json`. The full original copies and four-file before copies under `originals/` and `account-density-before/` are local evidence only and excluded from publication/commit.
