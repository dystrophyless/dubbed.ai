# Independent Variant A high-fi v6 review

2026-10-28, Asia/Qyzylorda. Explicit paused handoff: **core-journey-panel-highfi-v6**,http://127.0.0.1:5178. B remains **core-journey-studio-highfi-v1**,5179. This is a fresh bounded review of A6;the earlier A5 review remains partial/superseded.

**No material blocker. Recommend the owner high-fi checkpoint for A6,with one nonblocking P3 focus-consistency observation below.** This is not owner acceptance,winner selection,production readiness or authorization to change B/canonical/GitHub/Git. Only this reviewer directory was written.

## Visual judgment

Actual viewport screenshots confirm the requested composition,not just the centering equation. Record and Result have no logo/global navigation/New dub/My projects/credits/header Settings bar. Exit is a recognizable white-secondary action at the upper-left,visually separate from playback and turn navigation. Its desktop position at32px page gutter leaves project/heading aligned to the video. On phone/tablet it precedes project context in normal flow,with a48px target and no overlap.

The video itself is centered in the viewport while the panel sits24px to its right. The intentionally asymmetric whole workspace now reads as a centered performance reference with adjacent controls;it does not appear to be a centered video-plus-panel group. The blank area to the left follows that explicit owner choice. Panel proximity and shared top edge preserve its relationship to the source. The source remains complete and proportionate,with no cropped picture or dialogue on black bars.

Measured actual Record widths/center offsets:1440x900→784px/0px;1920x910→920px/0px;1280x600longRU→624px/0px;1366x650longRU→710px/0px;1248x700→592px/0px. Panel edges stay at least32px inside the page. Heading and waveform share the exact media boundaries. At short desktop,the readable long Russian dialogue is outside the source in the panel;two listening actions sit above full-width Record. Labels do not split/crop and navigation remains visible at scroll0. Actual capture/candidate/Return states retain the centered axis.

At1023/1024 and1247px,the existing stacked layout avoids an offscreen panel or tiny picture. The1247px picture is1199px wide and controls lie below the first viewport;ordinary scrolling is necessary and explicitly allowed. The change at1248 switches back to the adjacent panel. This is a substantial responsive tradeoff,but it preserves readable text/useful media and does not clip content. Phone390x667 retains358px picture/wave,readable external dialogue and ordinary scrolling. Exit remains easy to locate at page top. Result similarly removes the shell while retaining project/player/footer grouping and reachable actions.

Inspected independent actual crops: `panel-v6-review-1440x900-normal.png`, `1920x910-normal.png`, `1280x600-normal.png`, `1366x650-normal.png`, `1247x700-normal.png`, `1248x700-normal.png`, `390x667-normal.png`, actual capture/candidate/recovery images, `1280x600-result.png`, `390x667-result.png` and `phone-final-exit-guard.png` (all share the `panel-v6-review-` prefix).

Existing Affect BTN white-secondary/disabled/focus appearance is reused for Exit with Mabry/Lucide;no new palette,type system or component family is introduced. The full earlier calibration was not repeated for this focused composition change.

## Nonblocking finding

**P3 FOCUS-A6-01 — Universal Exit-return focus claim does not cover failed-save Retry.**

Steps:have an unaccepted replacement,Exit→Save and leave→known save failure;reload;activate Retry save;the retained My projects boundary opens;close Back to scene. Actual focus returns to `#next` (now Next),with a visible solid outline,rather than Exit. Accepted media is the exact retried candidate and no candidate remains. Direct Result→Exit→close does return focus to Exit and does not autoplay.

This is functional,visible return to the Retry invoker rather than lost focus or an inaccessible recovery action;it does not block the checkpoint. It differs from AUDIT's broad statement that boundary close returns focus to Exit. Recommend either narrowing that statement to direct Exit invocation or making the retained Exit flow consistently restore Exit later. No coauthored fix was made.

Evidence: `panel-v6-focus-probe.json`, `panel-v6-review-retry-exit-focus.png`;existing `navigate`/destination-close logic in A src.js. The raw main browser result retains this failed expectation;it is not excluded or relabeled as a passing assertion.

## Executed checks

`panel-v6-review.py` → `panel-v6-browser-results.json`: **95/96 assertions passed,zero page errors**;the sole mismatch is FOCUS-A6-01. Installed Chrome156.0.8078.48 on Windows,headless actual Chrome,DPR1,100% CSS viewports;normal desktop,long-RU short desktop,1023/1024/1247/1248 boundaries and390x667,reduced motion on phone. Extra final-gap/result fixtures are explicitly local state fixtures,not real server recordings.

Operated actual replacement capture;Exit and seek disable,Pause stays absent,and a stale dispatched Exit callback cannot navigate during capture. Actual candidate media is retained. Exit Stay and Escape preserve it;explicit discard removes only the candidate and keeps accepted takes. Microphone failure preserves the candidate and exposes contextual Settings only;Settings still invokes the same candidate guard. Save disables Exit while pending. Failed Exit save preserves exact candidate,prior accepted take and My projects destination through popup expiry/reload;Retry saves that candidate and follows that destination.

Result Exit while Original is playing pauses both sources and keeps the accepted set. Closing its boundary returns focus to Exit without autoplay. Return to recording restores the media axis and saved state. Explicit first-completion Exit wins over automatic Result;ordinary first completion still automatically enters Result. Current source-comparison/download behavior remains under the previously reviewed common player boundary;the whole Result transport matrix was not repeated.

`panel-v6-preservation.py` → `panel-v6-preservation-results.json`: **24/24 static assertions passed**. All350 A and340 B current manifest entries match. B's340 prior fingerprints AND manifest bytes are unchanged;all9 canonical hashes are unchanged. Existing A changes are limited to BRIEF,README,index,panel-responsive,panel-result and src,plus new focused Exit source/evidence. Fifteen protected capture/listening/acceptance/navigation/assembly functions remain identical to frozen B. No retired preparation function is reintroduced. Historical evidence remains intact.

Manifest SHA256:

- A6:`9f711a35bd141d9d25f9272124c41a05c2b8280866a388bfef9054040efeea3f`
- Frozen B:`5170ff3fd978894829bd00b6d54f02ee61e39d3ee397680d7c464e17c998ba70`

## Limits and disposition

Video/synthetic audio/download use real browser media;capture/input reveal/save/assembly remain simulations. Fixed illustrative dub and browser-local state do not prove real microphone,backend,user-derived rendering,account durability,lease/concurrency,unknown-commit,media isolation,screen-reader speech,physical mobile/safe-area or portable font behavior. Author builds and broader cohorts remain separate supplied evidence. No real A/B session or winner is claimed. Before a later comparison session,use A6's current Exit behavior rather than the old frozen A4/global-navigation script wording.

Review complete on the stable A6 target. No material corrective revision is required before the owner checkpoint;carry P3 FOCUS-A6-01 honestly as nonblocking. Preserve B and the production/canonical/GitHub/commit/push hold. New author edits require a fresh named handoff before further review.
