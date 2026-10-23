# Media evidence report — issues #64 and #72

**Evidence only.** This report records the local synthetic-media investigation for issue snapshots in `initial-issue-contracts.json`; it does not record issue acceptance. Status words apply only to the bounded observation: **supported** = directly observed in the named test; **unavailable** = the needed API/device/authority was absent in that environment; **not-run** = no test was performed.

## Evidence boundary

- Matrix captured 2026-10-23T01:18:02.032Z at revision `2f70ac94d059585f9608df39efbc96be555c3f98`; Windows 11 Pro build 10.0.26200, x64, Node v22.23.1, Playwright 1.64.1, headless cached local browsers. Static fixtures were served over loopback; no physical media input was used.
- Procedure: load MP4 in video elements and WAV in audio elements; measure loadedmetadata, dimensions/duration and playback; start via explicit click at playbackRate 2 and wait for ended; where available, count captureStream audio tracks and separately decode fixture bytes with OfflineAudioContext. Media elements were muted and volume set to zero; Chromium also used --mute-audio. This establishes neither audible quality nor speaker output.
- The run contains 13 actual files and a separate noData condition (no URL/file/playback). Current manifest-driven size/SHA-256 recheck at 2026-10-23T16:44:24.275Z found 13/13 matches, zero mismatches. The stored integrity artifact agrees.
- Fixture provenance: utterances were locally authored (“A blue light is on.”, “I hear it clearly.”, “We can begin now.”) and synthesized using Windows System.Speech.Synthesis.SpeechSynthesizer with Microsoft Zira Desktop (en-US, female) and Microsoft David Desktop (en-US, male). Video was generated locally with browser Canvas + MediaRecorder via Playwright Chromium; no network/external media source. No actual person was recorded. Issue #72 permits original/generated assets, which is the documented fixture scope. This does not claim ownership or redistribution rights for Windows or voice-pack software.
- The fixtures are not arbitrary-upload processing or product-rendered outputs. Local fixture URLs are under /media; they are not public/shareable result URLs. A source audit found no fixture references in Landing or Projects.

## Direct playback and media API observations

| Playwright engine on this Windows host | Actual fixtures ending | Observed capability / limit |
|---|---:|---|
| Chromium 156.0.8078.4 | 13/13 | MP4/WAV metadata and playback observed; captureStream, audio-track inspection and OfflineAudioContext were available. MediaRecorder and MP4 MediaRecorder were declared available. |
| Firefox 157.0 | 8/13 | Five playback timeouts: resultGeneration2, validSilence, usablePartial, noAudioTrack and shortSource. Metadata loaded for these; generation2, silence, partial and shortSource each had an audio track; noAudioTrack had zero. Offline decoding showed nonzero samples for partial/shortSource, and a track plus all-zero samples for validSilence. A timeout is not evidence of missing audio. captureStream and MediaRecorder were available; MP4 MediaRecorder was not. |
| Playwright WebKit 27.2 | 13/13 | Playback ended for all actual fixtures. captureStream, MediaRecorder and OfflineAudioContext were unavailable, so WebKit audio-track/decode observations are unavailable. The source MP4 measured 6.7274s here versus 8.6254s in Chromium/Firefox; generation durations also differed. |

WebKit is Playwright WebKit running on Windows, not macOS Safari or iOS Safari; the engine user-agent string does not change that. These builds do not establish general support for Chrome, Firefox, Safari, iOS, any other OS, or all devices. MP4 and WAV are the only local source fixture types. MOV/WebM source ingestion and other codec/container combinations were not-run; native recorder output below is WebM/Opus, not a static WebM input fixture.

Browser capability observations are direct element playback and browser-exposed API/decode facts only. **Authoritative server source inspection, actual compatible-preview conversion/delivery, paid processing, production audio-track/dialogue detection, and size/duration boundary mechanics: unavailable or not-run.** A historical service snapshot during fixture regeneration exited 1 (12 passed, 3 compatible-preview failures: fixture eligibility returned conversion-unavailable instead of supported-fixture). The later isolated current test suite passed 123/123, including four compatible-preview checks; this is service/UI test evidence, not actual browser conversion, delivery, or production proof. A browser playback failure is not source-inspection evidence, zero dialogue, or a refund decision.

## Capture timing and failure families

The separate native capture probe used Chromium 156.0.8078.4, MediaRecorder and OfflineAudioContext with a synthetic fake microphone or zero-gain WebAudio stream. All speaker output was muted; no media playback or physical mic/device was involved.

| Synthetic native case | Observed result |
|---|---|
| Automatic stop | WebM/Opus blob, 16,516 bytes; start→finish 1,507ms wall time; decoded 1,500ms; track/bytes/audio frames present; not interrupted. Thirty progress samples ended at 1,500ms. |
| Zero-gain silence stream | WebM/Opus blob, 408 bytes; 1,010ms wall time; 480ms decoded; track/bytes/audio frames present. This probe did not measure RMS, so it does not prove decoded sample silence. |
| Synthetic track interruption | Track stopped around 600ms; WebM/Opus blob, 2,026 bytes; 602ms wall / 600ms decoded; track/bytes/audio frames present; marked interrupted. Candidate-only API evidence, not product acceptance. |

These observations support native API capture/final-blob behavior for these three synthetic cases. A separate local Playwright record journey observed three fixed-window lines, no manual Stop control, the moving reference video, and progression to Result with a synthetic generation fixture (`record-to-download-browser-next-fix.json`, `record-to-download-browser-final-revision.json`). That is bounded local UI/mock-flow evidence, not production capture or custom rendering. Readiness/permission prompts, device enumeration/denial/revocation, physical-device synchronization and interruption/background behavior, original-volume independence, recoverable-media/finalization ordering, and approved timing tolerance remain **not-run**. Native timestamps do not establish readiness or product timing tolerance.

Fixture outcomes keep distinct conditions separate: valid silence is a 2,000ms all-zero PCM WAV and a 320x180 MP4 with an audio track; usablePartial is a simulated 2.8s clipped source fixture, not a real interruption-recovery result; noData is an absent condition with no file/URL, not silence; noAudioTrack is H.264 video with no audio track; shortSource is a 0.647s audio-present source clip before the authored dialogue begins and has no assumed rejection threshold. Product UI/service handling of these conditions was not-run. No minimum duration, loudness gate, or zero-dialogue policy is inferred.

## Timeline, generation identity, and asset inventory

The PCM master is signed 16-bit little-endian, 22,050Hz stereo, 190,733 frames / 8,650.0227ms; authored content is 8,500ms with a 150ms silent AAC-padding tail. Offsets below are exact sample placements, not speech recognition, accepted product sections, or output timing:

| Turn | Text / voice | Start | End (exclusive) |
|---|---|---:|---:|
| turn-a | “A blue light is on.” / Zira | 1,000ms (frame 22,050) | 2,934.2857ms (frame 64,701) |
| turn-b | “I hear it clearly.” / David | 1,500ms (frame 33,075) | 3,399.2290ms (frame 74,953) |
| turn-c | “We can begin now.” / Zira | 5,000ms (frame 110,250) | 6,714.2404ms (frame 148,049) |

The two generation MP4s have distinct byte hashes and generation IDs. A bounded synthetic record-to-download browser journey downloaded generation-001 and its 211,221-byte SHA-256 matched the generation-001 fixture. A separate ResultScreen regression test now covers failed generation-001 download → Watch new generation-002 → retry generation-001, and uncertain-outcome reconciliation with the original operation ID. These local UI/mock-service checks do not prove custom rendering, durable backend idempotency, storage/lease behavior, or a real export.

| Fixture | Metadata / scenario | Bytes; SHA-256 |
|---|---|---|
| source-dialogue.mp4 | MP4 AVC/AAC, 640x360; synthetic dialogue + background | 217,356; `36e996acf6eb710ed282cd154536314752be08aea9946a6955f7da8a719d4d9b` |
| source-dialogue-master.wav | PCM16, 22,050Hz, stereo, 190,733 frames / 8,650.0227ms; source master | 762,976; `8d9d75bfe05eae312bfe163de2cc3dd9001d77b37a0ce40eb14eda6bb7cf2a71` |
| recording-take-a.wav | PCM16, 22,050Hz mono, 42,651 frames / 1,934.2857ms; take-a, Zira | 85,346; `81a906caa74e2dfa35183319785aef51ae1f8cb173054bd0618c83876ae403f7` |
| recording-take-b.wav | PCM16, 22,050Hz mono, 43,202 frames / 1,959.2744ms; take-b, David | 86,448; `bc19b727b38864790d8b399da24782d2bfe3b3dfec5ff9179f1ad78dd1c081b3` |
| result-generation-001-master.wav | PCM16, 22,050Hz stereo, 190,733 frames; synthetic generation-001 audio | 762,976; `236e4601c586e456d1060721c8408d929a06086bcf09c8dc6b51146c470636c3` |
| result-generation-002-master.wav | PCM16, 22,050Hz stereo, 190,733 frames; synthetic generation-002 audio | 762,976; `c0e5d2625027ace368f755782a290d878d5b06d8abf38ae4c5ace088662896a1` |
| result-generation-001.mp4 | MP4 AVC/AAC, 640x360; synthetic generation-001, not product-rendered | 211,221; `af77d8889ab4675a7b70f28955930ee7cf094f2c9f07452b60da26522ddf87a2` |
| result-generation-002.mp4 | MP4 AVC/AAC, 640x360; synthetic generation-002, not product-rendered | 211,724; `accdfdaf3bb4e81e805c51469a0231bcf6c53b4180a5cff7b980016393992042` |
| valid-silence.wav | PCM16, 22,050Hz stereo, 44,100 frames / 2,000ms; zeroed PCM | 176,444; `4f9feb6582c3db6707787d5f3baaf9d55f9fefca0a97bbbf1dcfaa20cca340ff` |
| valid-silence.mp4 | MP4 AVC/AAC, 320x180; silent source, audio track present in Chromium/Firefox | 35,485; `c13941482a1666e741ad46e96aa6eb89ec0752aadf6a460d8085e38bd0df3b06` |
| usable-partial.mp4 | MP4 AVC/AAC, 320x180; simulated clip at 2,800ms; not real interruption recovery | 55,776; `b8c2d565e091fcabdf66f8db86a0738bd718f9854092360ec5ddcdcd32ec5857` |
| no-audio-track.mp4 | MP4 AVC only, 320x180; video-only scenario | 5,847; `42cd5907978a4108aad012461fa67e38e9469875d4fe1b030044fbb30fac5538` |
| short-source.mp4 | MP4 AVC/AAC, 320x180, 0.647s; audio track, clipped at 650ms before dialogue | 13,133; `bf9a8d81981e16d58b7935e7e5deabe8769015b5e09ba8ffc25910c6510bde20` |

The separate noData condition has no file, URL, bytes, or hash by design.

## Criterion evidence and exact remaining gates

| Issue criterion | Evidence status | Bounded conclusion |
|---|---|---|
| #64 AC-01 | supported | Versioned matrix records environment, fixture, operation, procedure, observation and limits; failures/unrun rows are explicit. |
| #64 AC-02 | supported | Report separates direct playback, server inspection, compatible preview and paid processing; latter three are not established. No missing-audio/zero-dialogue/refund inference. |
| #64 AC-03 | supported | The report separates native timing/final blob facts from unavailable readiness, product/phone behavior, and not-run tolerance. |
| #64 AC-04 | supported | Exact gates/task AC/next proof and absent production storage/lease/render evidence are mapped below; no product-readiness conclusion. |
| #72 AC-01 | supported | Original text and locally generated fixtures are documented; issue #72 permits original/generated assets. No ownership or redistribution claim is made for Windows/voice-pack software. |
| #72 AC-02 | supported | Timelines, distinct generation identities/hashes, browser playback outcomes, generation-001 byte-match journey, and mocked-service retry/reconciliation regression are recorded. Platform support and actual rendering remain limited/unproved. |
| #72 AC-03 | supported | Silence, simulated partial, noData, no-audio-track and short-source fixtures are distinct; no duration threshold is inferred. Product handling was not-run. |
| #72 AC-04 | supported | Corpus is local/backend-free, with no Landing/Projects use found and no public result URL. Mock result fixture paths remain synthetic local assets. |

These criterion statuses describe the evidence artifact, **not issue acceptance**. Remaining OPENs and exact consumer criteria:

- **OPEN-F06-T02** — Flow 06 §15, affects AC-F06-04/04A and #64 AC-04 / #72 AC-02. Still open: transient invalid-field recovery, alignment/serialization mechanics, and the product choice for an original shorter than 1.0s. Next proof: exercise selection UI and persisted quote/processing interval on the 0.647s fixture and inclusive boundary cases; prove frame/keyframe mapping cannot change the authorized 0.001s interval. Do not infer reject-versus-draft policy.
- **OPEN-F06-T03** — Flow 06 §15, affects AC-F06-04B and #64 AC-02 / #72 AC-02. Next proof: an approved target-environment matrix plus authoritative server inspection for audio track, browser direct playback, compatible-preview input/output, and exact size/duration boundaries. Explicitly distinguish absent track, browser playback failure, valid silence and zero-dialogue policy.
- **OPEN-F06-T05** — Flow 06 §15, affects AC-F06-04B and #64 AC-02/04. Next proof: actual compatible-preview conversion lifecycle with pending/error/retry, signed access/expiry/refresh, offline/reload and durable draft resume; assert source identity, duration, orientation and timeline mapping remain stable.
- **OPEN-09-08** — Flow 09 §15/decision register, affects F09-AC-14/15 and #64 AC-03. The local UI journey observed timed capture windows and no manual Stop; native fake-stream probe observed final blobs for automatic, silence-stream, and interrupted cases. Next proof: supported desktop and physical-phone runs for permission/readiness, synchronized reference/capture start, recoverable partials, device/BT loss, background/screen lock and media compatibility. Measure tolerances for owner review; do not make them rejection rules.
- **AC-10-19 / AC-10-20 / AC-10-23; OPEN-10-08; TECH-10-10** — Flow 10 §17, related to #79 and #64 AC-04 / #72 AC-02. AC-10-19 requires fixed fixtures be labeled truthfully; AC-10-20 reserves real assembly acceptance for backend/worker/storage/media proof; AC-10-23 freezes each download/retry to the activation-time displayed generation. A local ResultScreen test now covers failure→player-generation switch→retry identity and original-ID reconciliation for an uncertain operation. OPEN-10-08 and TECH-10-10 still need real retention/owner-media and durable backend idempotency/storage evidence; no custom render/export is shown here.

Evidence files (repo-root-relative): `_docs/evidence/frontend-implementation-2026-10-23/media/browser-media-matrix.json`, `.../media/orchestrator-native-capture.json`, `.../media/orchestrator-asset-integrity.json`, `_docs/evidence/frontend-implementation-2026-10-23/orchestrator-checks.md`, `frontend/public/media/fixture-manifest.json`, `.../record-to-download-browser-next-fix.json`, and `.../record-to-download-browser-final-revision.json`. The ResultScreen retry regression is in `frontend/tests/result/ResultScreen.test.tsx`. Stored browser/fixture check evidence reports `node --test tests/media/fixtures.test.mjs` passed 3/3 on 2026-10-23; the earlier service failure is historical and superseded by the later isolated pass noted above.

**Acceptance boundary:** no claim of physical-device, Safari/iOS, live-speaker, real rendering, paid-processing, backend storage/lease, or whole-product readiness.

