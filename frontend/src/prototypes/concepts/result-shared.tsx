import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import { VideoStage, formatTime } from "@/components/media";
import {
  Button, Card, CardBody, CardFooter, CardHeader, IconTile, Select, StepProgress, Text, TextLink, toast,
} from "@/components/ui";
import s from "./result.module.css";

/*
 * Phase 4 — RESULT concepts (low-fi, design-architect). Structure and hierarchy only; the stage plays the demo clip.
 * Route: /prototypes/concepts/result/<concept>?state=<state>&turn=1..6
 *   no state (live)        assembling runs (~5 s) → ready
 *   live-new-version       back from the studio: version 1 plays while version 2 is assembled, then version 2 is ready
 *   any other ?state=      freezes that moment (Try again / Download / Switch still work)
 *   &turn=                 the re-recorded turn in the new-version states (default 3)
 * Every concept uses the same demo model (useResult); only the page structure, the way back to a turn and the way
 * versions are shown differ. Never used by real pages. Brief: design-system/result-brief.md.
 */

export const RS_STATES = [
  "live", "assembling", "ready", "downloading", "failed",
  "new-version-assembling", "live-new-version", "new-version-ready", "new-version-failed",
] as const;
export type RsPreview = (typeof RS_STATES)[number];
export const RS_IDS = ["script", "strip", "chooser"] as const;
export type RsId = (typeof RS_IDS)[number];
const LETTER: Record<RsId, string> = { script: "A", strip: "B", chooser: "C" };

export const CLIP = "/media/scene.mp4";
export const CLIP_SECONDS = 13.4;
export const STAGE_RATIO = 960 / 408; // always 2.35:1, as in the studio, new dub and processing
const PROJECTS = "/styleguide/templates/projects";
const NEW_DUB = "/prototypes/new-dub/page";
const BALANCE = 48; // the demo balance after the 72-credit section was charged

/** The scene's turns inside the demo clip (seconds) — the text comes from the studio's demo lines. */
export const TURNS = [
  { start: 0.3, end: 3.2 }, { start: 3.5, end: 5.9 }, { start: 6.2, end: 8.6 },
  { start: 8.9, end: 10.4 }, { start: 10.6, end: 11.8 }, { start: 12.0, end: 13.3 },
] as const;
export const TOTAL_TURNS = TURNS.length;

/** Demo estimate for assembling, in seconds (shown rounded, never as a countdown); the clock runs 12× faster. */
const ASSEMBLE_S = 60;
const SPEED = 12;
const TICK_MS = 100;
const DOWNLOAD_MS = 900;

type Phase = "assembling" | "ready" | "failed";
export type NewStatus = "assembling" | "ready" | "failed";
export type Newer = { n: number; turn: number; status: NewStatus } | null;

export type Result = ReturnType<typeof useResult>;

/** Which turn is under the playhead (or the last one before it); 0-based. */
export function turnAt(time: number) {
  let idx = 0;
  TURNS.forEach((tn, i) => {
    if (time >= tn.start - 0.05) idx = i;
  });
  return idx;
}

function useResult(preview: RsPreview, reTurn: number) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isNew = preview.includes("new-version");
  const [phase, setPhase] = useState<Phase>(
    preview === "live" || preview === "assembling" ? "assembling" : preview === "failed" ? "failed" : "ready",
  );
  const [progress, setProgress] = useState(preview === "assembling" ? 0.3 : 0);
  const [shown, setShown] = useState(1); // the version on screen
  const [kept, setKept] = useState<number[]>([1]); // versions the user can switch between
  const [newer, setNewer] = useState<Newer>(
    isNew
      ? {
          n: 2,
          turn: reTurn,
          status: preview === "new-version-ready" ? "ready" : preview === "new-version-failed" ? "failed" : "assembling",
        }
      : null,
  );
  const [newProgress, setNewProgress] = useState(preview === "new-version-assembling" ? 0.5 : 0);
  const [running, setRunning] = useState(preview === "live" || preview === "live-new-version");
  const [downloading, setDownloading] = useState(preview === "downloading");

  // the demo clock: the first assembly, or the new version behind the playing one
  useEffect(() => {
    if (!running) return;
    const step = (TICK_MS / 1000) * SPEED / ASSEMBLE_S;
    const id = window.setInterval(() => {
      if (phase === "assembling") {
        setProgress((p) => {
          const n = Math.min(1, p + step);
          if (n >= 1) window.setTimeout(() => { setPhase("ready"); setRunning(false); }, 0);
          return n;
        });
      } else if (newer?.status === "assembling") {
        setNewProgress((p) => {
          const n = Math.min(1, p + step);
          if (n >= 1) {
            window.setTimeout(() => {
              setNewer((v) => (v ? { ...v, status: "ready" } : v));
              setRunning(false);
            }, 0);
          }
          return n;
        });
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, phase, newer?.status]);

  // playback position (the result never stops playing because of anything on this page)
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const sync = () => {
      setTime(v.currentTime);
      setPlaying(!v.paused);
    };
    const evs = ["timeupdate", "play", "pause", "seeked", "ended"];
    evs.forEach((e) => v.addEventListener(e, sync));
    return () => evs.forEach((e) => v.removeEventListener(e, sync));
  }, [phase]);

  const remaining = (phase === "assembling" ? 1 - progress : 1 - newProgress) * ASSEMBLE_S;
  const name = t("concepts.result.name");
  const fileName = `${name}${kept.length > 1 || shown > 1 ? ` · v${shown}` : ""}.mp4`;

  return {
    phase, progress, newProgress, remaining, shown, kept, newer, downloading, running, name,
    duration: formatTime(CLIP_SECONDS),
    videoRef, time, playing,
    current: turnAt(time),
    balance: BALANCE,
    seek: (to: number, play = true) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = to;
      setTime(to);
      if (play) void v.play().catch(() => undefined);
    },
    toggle: () => {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) void v.play().catch(() => undefined);
      else v.pause();
    },
    download: () => {
      setDownloading(true);
      window.setTimeout(() => {
        const a = document.createElement("a");
        a.href = CLIP;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDownloading(false);
        toast({ tone: "success", title: t("concepts.result.downloadStarted"), description: fileName });
      }, DOWNLOAD_MS);
    },
    /** Switch to the new version: the picture stays, it goes on from the same moment (owner question). */
    switchTo: (n: number, keepOld: boolean) => {
      setShown(n);
      if (newer && n === newer.n) {
        // A, C: the old version is replaced; B: both stay side by side (owner question 3)
        setKept((k) => (keepOld ? [...k.filter((x) => x !== n), n] : [n]));
        setNewer(null);
      }
    },
    retry: () => {
      setPhase("assembling");
      setProgress(0);
      setRunning(true);
    },
    retryNew: () => {
      setNewer((v) => (v ? { ...v, status: "assembling" } : v));
      setNewProgress(0);
      setRunning(true);
    },
    rerecord: (turn: number) => navigate(`/prototypes/studio/turn?turn=${turn + 1}&turns=${TOTAL_TURNS}&state=saved`),
  };
}

/* ---------------- Pieces shared by the concepts ---------------- */

export function useLine() {
  const { t } = useTranslation();
  return (i: number) => t(`studio.lines.line${i as 0 | 1 | 2 | 3 | 4 | 5}`);
}

export function rangeOf(i: number) {
  return `${formatTime(TURNS[i].start)} – ${formatTime(TURNS[i].end)}`;
}

/** The stage: always 2.35:1, edge to edge in its card; dimmed until the first version is assembled. */
export function Stage({ r }: { r: Result }) {
  const { t } = useTranslation();
  return (
    <div className={s.stage} data-lit={r.phase === "ready" || undefined} data-testid="result-stage">
      <VideoStage src={CLIP} ratio={STAGE_RATIO} maxHeight="var(--video-h)" videoRef={r.videoRef} label={t("concepts.result.video")}>
        <span className={s.dim} aria-hidden="true" />
      </VideoStage>
    </div>
  );
}

/** Assembling: the processing language — the waiting pill names the one step, one segment fills, a rough estimate. */
export function Assembling({ r, progress }: { r: Result; progress: number }) {
  const { t } = useTranslation();
  const left = r.remaining >= 30 ? t("concepts.result.left.minute") : t("concepts.result.left.less");
  return (
    <StepProgress
      data-testid="result-assembling"
      label={t("concepts.result.assembling.label")}
      steps={[t("concepts.result.assembling.step")]}
      current={1}
      fraction={progress}
      waitingLabel={t("concepts.result.assembling.step")}
      doneLabel={t("concepts.result.assembling.done")}
      meta={left}
      valueText={t("concepts.result.assembling.step")}
    />
  );
}

/** The first assembly failed: a service problem — the takes are safe, trying again is free. */
export function Failed() {
  const { t } = useTranslation();
  return (
    <div className={s.ending} role="alert" data-testid="result-failed">
      <IconTile icon="error" tone="danger" size={40} />
      <div className={s.endingText}>
        <h2 className={s.endingTitle}>{t("concepts.result.failed.title")}</h2>
        <Text tone="text">{t("concepts.result.failed.text")}</Text>
      </div>
    </div>
  );
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <Button size="lg" icon={<Icon name="retry" />} onClick={onClick} data-testid="result-retry">
      {t("concepts.result.retry")}
    </Button>
  );
}

/** The one primary action: the version on screen as an MP4. */
export function DownloadButton({ r }: { r: Result }) {
  const { t } = useTranslation();
  return (
    <Button size="lg" icon={<Icon name="download" />} onClick={r.download} loading={r.downloading} data-testid="result-download">
      {t("concepts.result.download")}
    </Button>
  );
}

/** "720p MP4 · 0:13", with the version once there is more than one. */
export function useMeta(r: Result) {
  const { t } = useTranslation();
  return r.shown > 1 || r.newer
    ? t("concepts.result.metaVersion", { n: r.shown, duration: r.duration })
    : t("concepts.result.meta", { duration: r.duration });
}

/* ---------------- The page frame: shell + concept + note ---------------- */

export function ResultPage({ id, children }: { id: RsId; children: (r: Result) => ReactNode }) {
  const preview = useViewState(RS_STATES);
  const [params] = useSearchParams();
  const n = Number.parseInt(params.get("turn") ?? "", 10);
  const reTurn = Number.isFinite(n) ? Math.min(TOTAL_TURNS, Math.max(1, n)) : 3;
  return <Body key={`${preview}-${reTurn}`} id={id} preview={preview} reTurn={reTurn}>{children}</Body>;
}

function Body({ id, preview, reTurn, children }: { id: RsId; preview: RsPreview; reTurn: number; children: (r: Result) => ReactNode }) {
  const { t } = useTranslation();
  const r = useResult(preview, reTurn);
  return (
    <AppShell
      credits={r.balance}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: "/styleguide/templates/credits", settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <div
        data-concept={id}
        data-testid="result"
        data-phase={r.phase}
        data-shown={r.shown}
        data-newer={r.newer?.status ?? "none"}
      >
        {children(r)}
      </div>
      <div className={s.noteWrap}>
        <Note id={id} preview={preview} />
      </div>
    </AppShell>
  );
}

function Note({ id, preview }: { id: RsId; preview: RsPreview }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const rows = ["laptop", "phone", "fix", "versions", "download", "build"] as const;
  return (
    <Card padding="none" data-testid="concept-note">
      <CardHeader title={t("concepts.result.note.title", { letter: LETTER[id], name: t(`concepts.result.c.${id}.name`) })} />
      <CardBody>
        <Stack gap={12}>
          <Text tone="strong" medium>{t(`concepts.result.c.${id}.idea`)}</Text>
          <dl className={s.tradeoffs}>
            {rows.map((row) => (
              <div key={row} className={s.tradeoff}>
                <dt>{t(`concepts.result.note.${row}`)}</dt>
                <dd>{t(`concepts.result.c.${id}.${row}`)}</dd>
              </div>
            ))}
          </dl>
          <Text size="sm" tone="muted">{t("concepts.result.note.fixed")}</Text>
          <div className={s.statePicker}>
            <Select<RsPreview>
              label={t("concepts.result.note.state")}
              value={preview}
              onChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === "live") next.delete("state");
                else next.set("state", v);
                setParams(next, { replace: true });
              }}
              options={RS_STATES.map((v) => ({ value: v, label: t(`concepts.result.note.states.${v}`) }))}
            />
          </div>
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={s.others}>
          <Text size="sm" tone="muted">{t("concepts.result.note.others")}</Text>
          {RS_IDS.filter((c) => c !== id).map((c) => (
            <TextLink key={c} to={`/prototypes/concepts/result/${c}${preview === "live" ? "" : `?state=${preview}`}`}>
              {`${LETTER[c]} · ${t(`concepts.result.c.${c}.name`)}`}
            </TextLink>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
