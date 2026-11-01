# Dubbed Variant A — focused side-panel high-fi v7

Current target:**core-journey-panel-highfi-v7**. Record and Result have no global navbar;Exit retains the candidate-safe My projects boundary. Exit aligns to the media left edge;project title and three line-position dots are centered above the video. B waveform height and actual dialogue-to-wave gap are matched;dialogue stays below the source at all sizes. Video itself stays viewport-centered with the right panel24px away. See [BRIEF.md](BRIEF.md) and [current audit](evidence/media-header-v7/AUDIT.md). This is an isolated design artifact,not production.

From this directory:

    npm.cmd ci --offline --ignore-scripts
    npm.cmd run dev
    npm.cmd run build

Preview http://127.0.0.1:5178 (strict port). Frozen VariantB http://127.0.0.1:5179 is unchanged,including its manifest. Existing calibration remains /ab-calibration.html. Both candidates are now focused pages;the current distinction is A side-panel versus B centered performance controls. The frozen [manual script](../core-journey-studio/COMPARISON.md) remains a base with A Exit replacing its historical My projects step. No telemetry/live assignment/data collection or winner is claimed.

Current checks from repository root:

    python prototypes/core-journey-lowfi/evidence/media-header-v7/geometry-check.py
    python prototypes/core-journey-lowfi/evidence/media-header-v7/header-result-check.py
    python prototypes/core-journey-lowfi/evidence/media-header-v7/journey-check.py A
    python prototypes/core-journey-lowfi/evidence/media-header-v7/exit-check.py
    python prototypes/core-journey-lowfi/evidence/media-header-v7/preservation-check.py

Actual installed Chrome/Python Playwright,DPR1/100% viewport is the author environment. Scenario controls and media attribution are outside the proposed product. Input/capture envelope/save/assembly remain simulations;takes are synthetic and My dub fixed illustrative media,not a user-derived server render. No microphone permission is requested. Settings is only contextual microphone-failure recovery;setup/checks remain onboarding once before registration,then Settings only. All historical A5/paired evidence remains unchanged. Canonical synchronization,production,GitHub mutations,commit/push stay held. Ready for high-fi review; EDITS PAUSED.
