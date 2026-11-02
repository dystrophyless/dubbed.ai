import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Cluster, Stack } from "@/components/layout";
import {
  AudioTrack, CostButton, LevelMeter, RangeSelector, RecordControl, SceneColumn, TurnLine, TurnNav, UploadDropzone, VideoPlayer,
  VideoStage, VolumeControl, demoPeaks, type DropState, type RecordState,
} from "@/components/media";
import { Button, SegmentedControl, Text } from "@/components/ui";
import { Row, SgSection, Specimen } from "../Specimen";

const SCENE = "/media/scene.mp4";
const ORIGINAL = demoPeaks(160);
const TAKE = demoPeaks(160, 31);
const WINDOW = 4.4;

/** Demo-only clock: drives recording and playback without real audio. */
function useTrackDemo() {
  const [state, setState] = useState<RecordState>("idle");
  const [playing, setPlaying] = useState<"none" | "original" | "take">("none");
  const [elapsed, setElapsed] = useState(0);
  const [hasTake, setHasTake] = useState(false);
  const started = useRef(0);
  useEffect(() => {
    if (state !== "recording" && playing === "none") return;
    started.current = performance.now();
    const id = window.setInterval(() => {
      const e = (performance.now() - started.current) / 1000;
      if (e < WINDOW) return setElapsed(e);
      setElapsed(WINDOW);
      if (state === "recording") setState("saving");
      else setPlaying("none");
    }, 50);
    return () => window.clearInterval(id);
  }, [state, playing]);
  useEffect(() => {
    if (state !== "saving") return;
    const id = window.setTimeout(() => { setState("saved"); setHasTake(true); }, 700);
    return () => window.clearTimeout(id);
  }, [state]);
  return {
    state, playing, elapsed, hasTake,
    record: () => { setPlaying("none"); setElapsed(0); setState("recording"); },
    stop: () => setState("saving"),
    play: (what: "original" | "take") => { setElapsed(0); setPlaying(what); },
  };
}

export function MediaSection() {
  const { t } = useTranslation();
  const demo = useTrackDemo();
  const [ratio, setRatio] = useState(16 / 9);
  const [volume, setVolume] = useState(0.6);
  const [turn, setTurn] = useState(2);
  const [drop, setDrop] = useState<DropState>("idle");
  const [file, setFile] = useState<string>();
  const [upload, setUpload] = useState(0);
  const [range, setRange] = useState<[number, number]>([30, 150]);
  useEffect(() => {
    if (drop !== "uploading") return;
    const id = window.setInterval(() => setUpload((p) => {
      if (p >= 100) { setDrop("done"); return 100; }
      return p + 7;
    }), 120);
    return () => window.clearInterval(id);
  }, [drop]);
  const recording = demo.state === "recording";
  const progress = demo.elapsed / WINDOW;

  return (
    <SgSection id="media" title={t("sg.media.title")} description={t("sg.media.description")}>
      <Specimen title={t("sg.media.column")} wide note={t("sg.media.columnNote")}>
        <SceneColumn ratio={ratio} maxHeight="44vh">
          <VideoStage src={SCENE} label={t("sg.media.scene")} ratio={ratio} onRatio={setRatio} />
          <TurnLine text={t("sg.media.demoLine")} />
          <AudioTrack
            label={t("sg.media.trackLabel")}
            original={ORIGINAL}
            take={recording || demo.state === "saving" || demo.hasTake ? TAKE : undefined}
            takeProgress={recording ? progress : 1}
            mode={recording ? "recording" : demo.playing !== "none" ? "playing" : "idle"}
            progress={progress}
          />
        </SceneColumn>
        <Cluster gap={12} justify="center">
          <Button variant="secondary" size="lg" icon={<Icon name="play" />} onClick={() => demo.play("original")} disabled={recording}>{t("sg.media.playOriginal")}</Button>
          <RecordControl state={demo.state} window={WINDOW} elapsed={demo.elapsed} onRecord={demo.record} onStop={demo.stop} />
          <Button variant="secondary" size="lg" icon={<Icon name="headphones" />} onClick={() => demo.play("take")} disabled={!demo.hasTake || recording}>{t("sg.media.playTake")}</Button>
        </Cluster>
      </Specimen>

      <Specimen title={t("sg.media.trackStates")} wide note={t("sg.media.trackNote")}>
        <Stack gap={12}>
          <Row label={t("sg.media.noTake")}><div style={{ flex: 1, minWidth: 0 }}><AudioTrack label={t("sg.media.trackLabel")} original={ORIGINAL} /></div></Row>
          <Row label={t("sg.media.live")}><div style={{ flex: 1, minWidth: 0 }}><AudioTrack label={t("sg.media.trackLabel")} original={ORIGINAL} take={TAKE} mode="recording" takeProgress={0.55} progress={0.55} /></div></Row>
          <Row label={t("sg.media.take")}><div style={{ flex: 1, minWidth: 0 }}><AudioTrack label={t("sg.media.trackLabel")} original={ORIGINAL} take={TAKE} mode="playing" progress={0.3} /></div></Row>
        </Stack>
      </Specimen>

      <Specimen title={t("sg.media.player")} wide note={t("sg.media.playerNote")}>
        <VideoPlayer src={SCENE} label={t("sg.media.scene")} maxHeight="40vh" />
      </Specimen>
      <Specimen title={t("sg.media.stageLoading")}>
        <VideoStage label={t("sg.media.scene")} state="loading" ratio={16 / 9} />
      </Specimen>
      <Specimen title={t("sg.media.stageError")}>
        <VideoStage label={t("sg.media.scene")} state="error" ratio={16 / 9} onRetry={() => {}} />
      </Specimen>
      <Specimen title={t("sg.media.stagePortrait")} note={t("sg.media.stagePortraitNote")}>
        <VideoStage label={t("sg.media.scene")} state="loading" ratio={9 / 16} maxHeight="280px" />
      </Specimen>

      <Specimen title={t("sg.media.record")} wide note={t("sg.media.recordNote")}>
        <Row>
          {(["idle", "recording", "saving", "saved"] as const).map((st) => (
            <div key={st} style={{ minWidth: 200 }}>
              <RecordControl state={st} window={WINDOW} elapsed={st === "recording" ? 1.9 : 0} onRecord={() => {}} onStop={() => {}} />
            </div>
          ))}
          <RecordControl state="idle" window={WINDOW} disabled onRecord={() => {}} onStop={() => {}} />
        </Row>
      </Specimen>

      <Specimen title={t("sg.media.meter")} note={t("sg.media.meterNote")}>
        <Stack gap={8}>
          <LevelMeter level={0.3} label={t("sg.media.level")} />
          <LevelMeter level={0.78} label={t("sg.media.level")} />
          <LevelMeter level={0.97} label={t("sg.media.level")} />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.media.volume")} note={t("sg.media.volumeNote")}>
        <VolumeControl label={t("sg.media.originalVolume")} value={volume} onChange={setVolume} />
      </Specimen>

      <Specimen title={t("sg.media.turnNav")} wide note={t("sg.media.turnNavNote")}>
        <Stack gap={16}>
          <TurnNav index={turn} total={7} canNext onPrev={() => setTurn((i) => i - 1)} onNext={() => setTurn((i) => i + 1)} nextPrimary />
          <TurnNav index={3} total={7} canNext={false} onPrev={() => {}} onNext={() => {}} />
        </Stack>
      </Specimen>

      <Specimen title={t("sg.media.upload")} wide note={t("sg.media.uploadNote")}>
        <div>
        <SegmentedControl<DropState>
          aria-label={t("sg.media.uploadState")}
          size="sm"
          variant="tray"
          value={drop}
          onChange={(v) => { setDrop(v); setFile(v === "idle" ? undefined : file ?? "scene.mp4"); setUpload(v === "uploading" ? 20 : 0); }}
          options={(["idle", "uploading", "error", "done"] as const).map((v) => ({ value: v, label: t(`sg.state.${v}`) }))}
        />
        </div>
        <UploadDropzone
          state={drop}
          progress={upload}
          fileName={file}
          error={t("sg.media.uploadError")}
          onFile={(f) => { setFile(f.name); setUpload(0); setDrop("uploading"); }}
        />
      </Specimen>

      <Specimen title={t("sg.media.range")} wide note={t("sg.media.rangeNote")}>
        <RangeSelector duration={600} start={range[0]} end={range[1]} onChange={(a, b) => setRange([a, b])} />
      </Specimen>

      <Specimen title={t("sg.media.cost")} wide note={t("sg.media.costNote")}>
        <Stack gap={12}>
          <CostButton seconds={range[1] - range[0]} balance={480} onStart={() => {}} />
          <CostButton seconds={12.4} balance={120} onStart={() => {}} />
          <CostButton seconds={12.4} balance={5} onStart={() => {}} />
          <CostButton seconds={12.4} balance={120} loading onStart={() => {}} />
          <Text size="sm" tone="muted">{t("sg.media.costRule")}</Text>
        </Stack>
      </Specimen>
    </SgSection>
  );
}
