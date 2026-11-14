/* Media components — Dubbed-specific, Clean language (design-system/components.md → Media). */
export { SceneColumn, Transport, TurnLine, VideoPlayer, VideoStage, type StageState } from "./VideoStage";
export { Slider } from "./Slider";
export { AudioTrack, demoPeaks, type TrackMode } from "./AudioTrack";
export { LevelMeter, RecordControl, TurnNav, VolumeControl, type RecordState } from "./Recording";
export { RecordButton, TurnDots, VolumeButton, type RecordMode, type TurnDir } from "./Studio";
export { CostButton, RangeSelector, UploadDropzone, type DropState } from "./Upload";
export { PlaySectionButton, useSectionPlayback } from "./Section";
export { PlayerControls, PlayerScreen, togglePlay, useFullscreen, usePlayback, usePlayerKeys, type Fullscreen } from "./Player";
export { creditsFor, formatSeconds, formatTime } from "./time";
