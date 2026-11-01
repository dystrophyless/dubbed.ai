# Independent studio low-fi v6 Result-player review

2026-10-27, Asia/Qyzylorda. Explicit paused handoff `core-journey-studio-lowfi-v6`,preview5179. Scope is the studio Result custom comparison player. Only this review directory was written; no author/runtime/canonical/GitHub/Git changes.

**No material finding. Recommend the owner's low-fi checkpoint for this Result-player proposal. Source comparison is visibly inside the player and the bounded interactions work. This is not owner acceptance,studio high-fi approval,canonical service-contract adoption or integration authority.**

## Visual judgment and reference

Read DESIGN/AUDIT/current BRIEF and the SEG Clean source around its tray,option and selected-state definitions; visually inspected the matching Light01-initial.png. The result keeps a recognizable selected white option within a compact segmented tray,with product sizing/Mabry and a media-contrast surround. This is a named media derivative,not adoption of the excluded Dark product theme or a claim that Affect supplies a Player component. Rendered selection has40px desktop/48px phone height,14/20 desktop type,90ms color response,and actual local MabryPro-Medium by Chrome platform-font inspection.

The selector belongs to the black media area rather than looking like a detached page toolbar. The complete contained picture remains visible within its frame; the opaque transport rail begins exactly below that frame and does not mask it. White labels/icons stay legible independent of picture luminance. The selection indicator is clear without relying on color alone. Settled label/control semantic-color contrast ratios are16.29 selected,15.88 unselected on tray and17.47 transport on rail. Keyboard focus was visibly outlined.

At1440x900 the player is920px wide with a517.5px picture and72px rail. At1280x600 long RU it is520px wide,292.5px picture plus72px rail; both outside actions remain visible at scroll0,Return bottom580.5px. The smaller short-screen result is still proportionate and readable,with the whole image retained. At390x667 RU,the player is358px wide,201.38px picture plus104px rail. All sampled source/play/seek/volume/fullscreen targets are at least48px high. Return requires ordinary scrolling below the initially visible Download action; that cost is reasonable for this phone Result and is explicit in the proposal. Portrait fullscreen preserves the full wide source with black space while keeping source choice and transport visible.

Independent viewport images inspected: `studio-v6-review-1440-original.png`, `studio-v6-review-1280-original.png`, `studio-v6-review-390-original.png`, their fullscreen counterparts, `studio-v6-review-loading.png` and `studio-v6-review-network-error.png`. No redesign or high-fi polish finding is requested.

## Executed interaction evidence

Windows,installed Chrome156.0.8078.48,headless Chrome channel,DPR1,100% CSS viewport;1440x900 EN,1280x600 RU,390x667 RU with emulated touch/reduced motion. `v6-player-review.py` plus native-cancel supplement produce **78/78 validated assertions** in `v6-validated-results.json`. `v6-nearby-review.py` adds **8/8** assertions in `v6-nearby-results.json`.

Checked default My dub paused0;playing switch retaining common playhead and playing intent;paused switch retaining time;inactive source paused;finite-end source switch and explicit Replay from0;held pointer/keyboard seek paused and release played;native touch seek;shared volume;source Arrow navigation/focus;actual Chrome fullscreen containing controls;Return pausing both sources and preserving accepted takes;re-entry resetting to My dub paused0. A fresh actual three-window record/accept journey also reached the custom player paused0,so evidence is not solely a seeded Result screen. Each capture remained seek-locked with no Pause.

Held original-media requests to create a real delayed-readiness race: loading status appeared,source escape remained available,and late metadata could not replace/restart the inactive source after switching back. Aborted original-media requests produced real network failure;ordinary Retry loading restored readiness paused,with the other-source escape available. Decode inspection confirms two non-silent,different audio buffers and distinct source URLs;browser video durations match13.416667s. This proves fixture distinction and playback-state behavior,not real mixing quality.

The raw initial run retained in `v6-player-results.json` contains three artificial pointercancel-followed-by-real-mouseup checks,two of which resumed on the trailing native change. That sequence is not Chrome's native cancellation lifecycle. Rather than report a false product defect or hide the raw results,`v6-cancel-investigation.py` used trusted CDP touchCancel at1280x600 and390x667: trusted pointercancel/touchcancel occurred without a trailing mouseup/change,and playback stayed paused. The three artificial checks are explicitly excluded from the78 validated assertions;native results are in `v6-cancel-results.json`. Physical-device/browser cancellation variants remain unproved.

Nearby Record regression on reduced-motion RU390x667: replacement Exit guard/Stay retained the candidate;failed Save preserved exact candidate,old accepted take and My projects destination across reload;Retry reached that destination. This supplements the author's separate Record cohorts without repeating the entire prior Record matrix.

## Download proposal and preservation

**Owner checkpoint must include the proposed semantics:** Download My dub stays outside the player and always saves the illustrative dub even while Original is selected. The label and nearby explanatory copy communicate that behavior. Actual downloaded bytes match the dub fixture in each reviewed viewport. Source comparison does not select a rendered generation. Position/intent preservation and default paused0 are also explicit design proposals. Their review success is not a canonical displayed-generation/download service-contract amendment.

`v6-preservation-results.json` independently verifies all190 studio and54 original current manifest entries. From the142-file prior studio boundary,only BRIEF,README,index and src changed;138 prior fingerprints remain exact,including Record styles/media/locale/history. All54 original fingerprints AND its manifest bytes remain unchanged. The nine scoped canonical-document hashes remain unchanged. No preparation-rerun function or speaker-capability feature was authorized to return.

Final manifest SHA256:

- Studio v6: `0d763f67ff721418a20e8968f3ba2c11c6752898fb624ec70eaa25c509cde7a7`
- Original amendment3: `70a378a32a02337ca089d0559920978d6f0ead7e8bd9d4539f9281a3be97cff0`

## Limits and disposition

Original and illustrative dub are real browser media;capture/input reveal/save/assembly are simulations. The fixed dub is not generated from the user's three takes. Browser-local retention is not account durability. No real microphone,backend,hardware-mobile,lease/concurrency,unknown-commit,mixing/render,screen-reader speech or portable-font proof. Fullscreen and native cancel were exercised only in installed headless Chrome;touch is emulated. Author builds and wider cohorts are separate evidence,not rerun or adopted as independent proof here.

Review finished on the stable named target. No corrective revision is required before the owner's low-fi Result-player checkpoint. The explicit download/source behavior proposals should be presented with that checkpoint. Integration,canonical progression,GitHub,commit and push remain held.
