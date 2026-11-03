import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import {
  PlayerControls, PlayerScreen, VideoStage, formatTime, togglePlay, useFullscreen, usePlayback, usePlayerKeys,
} from "@/components/media";
import {
  Button, Card, CardBody, CardFooter, Dialog, IconTile, PageHeader, RadioGroup, Spinner, StepProgress, Text, toast,
} from "@/components/ui";
import { NotifyControl } from "../processing/processing";
import { cancelResultElsewhere, scheduleResultElsewhere, sendResultNotification } from "./ready-elsewhere";
import s from "./result.module.css";

/*
 * Phase 4 — RESULT, HIGH-FI prototype (concept C "watch, then fix", with the video as large as the page allows and full
 * screen). Brief, owner answers and the open assumptions: design-system/result-brief.md.
 * Route: /prototypes/result/page?state=<state>
 *   no state (live)          the first version assembles (~5 s, the demo clock runs 12× faster) → ready
 *                            (the studio's last-turn "Build the result" opens this)
 *   &rerecorded=3,5          with no state: back from the studio's re-record mode — version 1 plays while version 2
 *                            (turns 3 and 5 re-recorded) assembles live → "Watch version 2"
 *   ?state=assembling|ready|chooser|new-version-assembling|new-version-ready|new-version-failed|failed  frozen states
 *                            (Try again / Download / Watch version 2 / Re-record a turn still work)
 *   &turns=N                 how many turns the scene has (default 6) · &name= the project name
 *   &ratio=portrait|16x9     a narrower clip in the 2.35:1 stage (black bars at the sides)
 *   &notify=granted|denied   the "Notify me when it's ready" control after the browser answered (as in processing)
 * "Re-record a turn" → the chooser (the turn under the playhead is selected) → the studio in re-record mode:
 *   /prototypes/studio/turn?mode=rerecord&turn=n&turns=N → "Build the new version" → back here with &rerecorded=.
 * Leaving while it assembles: a toast wherever the user is (+ a browser notification if opted in) — ready-elsewhere.tsx.
 * Real page: /projects/:id/result in AppShell; the version status comes from a TanStack Query poll.
 */
export const RESULT_STATES = [
  "live", "assembling", "ready", "chooser", "new-version-assembling", "new-version-ready", "new-version-failed", "failed",
] as const;
type Preview = (typeof RESULT_STATES)[number];
type Phase = "assembling" | "ready" | "failed";
type NewStatus = "assembling" | "ready" | "failed";
type Newer = { n: number; turns: number[]; status: NewStatus } | null;
type ClipShape = "scope" | "16x9" | "portrait";

const CLIP = "/media/scene.mp4";
const CLIP_SECONDS = 13.4;
const STAGE_RATIO = 960 / 408; // always 2.35:1, as in the studio, New dub and processing
const PROJECTS = "/styleguide/templates/projects";
const CREDITS = "/styleguide/templates/credits";
const NEW_DUB = "/prototypes/new-dub/page";
const STUDIO = "/prototypes/studio/turn";
const BALANCE = 48; // the demo balance after the 72-credit section was charged; re-recording is free (owner answer 2)

/** The six demo turns inside the demo clip (seconds); other scene lengths split the clip evenly. */
const SIX = [
  { start: 0.3, end: 3.2 }, { start: 3.5, end: 5.9 }, { start: 6.2, end: 8.6 },
  { start: 8.9, end: 10.4 }, { start: 10.6, end: 11.8 }, { start: 12.0, end: 13.3 },
];
const turnsOf = (n: number) =>
  n === SIX.length
    ? SIX
    : Array.from({ length: n }, (_, i) => ({ start: (i * CLIP_SECONDS) / n, end: ((i + 1) * CLIP_SECONDS) / n - 0.1 }));
const LINES = ["line0", "line1", "line2", "line3", "line4", "line5"] as const;

/** Demo estimate for assembling, in seconds (shown rounded, never a countdown); the clock runs 12× faster. */
const ASSEMBLE_S = 60;
const SPEED = 12;
const TICK_MS = 100;

const int = (v: string | null) => {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function ResultPrototype() {
  const preview = useViewState(RESULT_STATES);
  const [params] = useSearchParams();
  const total = clamp(int(params.get("turns")) ?? SIX.length, 1, 60);
  const raw = params.get("rerecorded");
  const list = (raw ?? "3").split(",").map((v) => int(v)).filter((v): v is number => v !== null && v >= 1 && v <= total);
  const rerecorded = Array.from(new Set(list.length ? list : [Math.min(3, total)])).sort((a, b) => a - b);
  const back = preview === "live" && raw !== null; // back from the studio's re-record mode
  const shape: ClipShape = params.get("ratio") === "portrait" ? "portrait" : params.get("ratio") === "16x9" ? "16x9" : "scope";
  return (
    <>
      <Result
        key={`${preview}-${back}-${rerecorded.join(",")}-${total}-${shape}`}
        preview={preview}
        back={back}
        rerecorded={rerecorded}
        total={total}
        shape={shape}
      />
      <StateSwitcher states={RESULT_STATES} />
    </>
  );
}

/* ---------------- Demo state (the real page polls the version status with TanStack Query) ---------------- */

function useResultDemo(preview: Preview, back: boolean, rerecorded: number[], total: number) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const name = params.get("name") || t("result.name");
  const turns = turnsOf(total);
  const isNew = back || preview.startsWith("new-version");

  const [phase, setPhase] = useState<Phase>(
    (preview === "live" && !back) || preview === "assembling" ? "assembling" : preview === "failed" ? "failed" : "ready",
  );
  const [progress, setProgress] = useState(preview === "assembling" ? 0.35 : 0);
  const [shown, setShown] = useState(1); // the version on screen
  const [shownTurns, setShownTurns] = useState<number[]>([]); // what the version on screen re-recorded
  const [newer, setNewer] = useState<Newer>(
    isNew
      ? {
          n: 2,
          turns: rerecorded,
          status: preview === "new-version-ready" ? "ready" : preview === "new-version-failed" ? "failed" : "assembling",
        }
      : null,
  );
  const [newProgress, setNewProgress] = useState(preview === "new-version-assembling" ? 0.5 : 0);
  const [running, setRunning] = useState(preview === "live");
  const [chooser, setChooser] = useState(preview === "chooser");
  const [pick, setPick] = useState(() => (preview === "chooser" ? rerecorded[0] - 1 : 0));

  // the demo clock: the first version, or the new version behind the one playing
  useEffect(() => {
    if (!running) return;
    const step = ((TICK_MS / 1000) * SPEED) / ASSEMBLE_S;
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

  // ready while the tab is in the background: a browser notification (if the user opted in)
  const firstReady = useRef(phase === "ready");
  useEffect(() => {
    if (phase !== "ready" || firstReady.current) return;
    firstReady.current = true;
    if (document.visibilityState === "hidden") sendResultNotification(name, { version: 1, rerecorded: [] });
  }, [phase, name]);
  const newReady = useRef(newer?.status === "ready");
  useEffect(() => {
    if (newer?.status !== "ready" || newReady.current) return;
    newReady.current = true;
    if (document.visibilityState === "hidden") sendResultNotification(name, { version: newer.n, rerecorded: newer.turns });
  }, [newer, name]);

  // leaving while it assembles: the job goes on and says "ready" wherever the user is (owner answer 8)
  const remaining = (phase === "assembling" ? 1 - progress : 1 - newProgress) * ASSEMBLE_S;
  const latest = useRef({ running, phase, newer, remaining });
  latest.current = { running, phase, newer, remaining };
  useEffect(() => {
    cancelResultElsewhere();
    return () => {
      // read at unmount on purpose: where the job is when the user leaves
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const { running: r, phase: p, newer: nv, remaining: left } = latest.current;
      if (!r) return;
      const ms = (left / SPEED) * 1000;
      if (p === "assembling") scheduleResultElsewhere(ms, name, { version: 1, rerecorded: [] });
      else if (nv?.status === "assembling") scheduleResultElsewhere(ms, name, { version: nv.n, rerecorded: nv.turns });
    };
  }, [name]);

  return {
    phase, progress, remaining, shown, shownTurns, newer, chooser, pick, name, turns, total,
    setPick,
    openChooser: (at: number) => {
      // the turn under the playhead (or the last one before it) is selected
      let idx = 0;
      turns.forEach((tn, i) => {
        if (at >= tn.start - 0.05) idx = i;
      });
      setPick(idx);
      setChooser(true);
    },
    closeChooser: () => setChooser(false),
    rerecord: () => navigate(`${STUDIO}?mode=rerecord&turn=${pick + 1}&turns=${total}`),
    /** owner answer 6: the MP4 is ready when assembling finishes — the download is instant, named after the project */
    download: () => {
      const a = document.createElement("a");
      a.href = CLIP;
      a.download = `${name}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    /** owner answer 3: after switching only the new version is kept; answer 4: it plays from the start (the page seeks). */
    switchToNew: () => {
      if (newer?.status !== "ready") return;
      setShown(newer.n);
      setShownTurns(newer.turns);
      setNewer(null);
    },
    /** owner answer 7: the server already retried once; Try again is free */
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
  };
}

type Demo = ReturnType<typeof useResultDemo>;

/** { count, list: "3 and 5" } for the plural "turn 3" / "turns 3 and 5" keys (count is 1 or 2: one / several). */
function useTurnList() {
  const { i18n } = useTranslation();
  return (list: number[]) => ({
    count: Math.min(2, Math.max(1, list.length)),
    list: new Intl.ListFormat(i18n.resolvedLanguage, { type: "conjunction" }).format(list.map(String)),
  });
}

/** "About a minute left" · "Almost done" — rounded, never a countdown (as in processing). */
function useLeft(remaining: number) {
  const { t } = useTranslation();
  return remaining >= 30 ? t("result.left.minute") : t("result.left.less");
}

/* ---------------- The page ---------------- */

function Result({ preview, back, rerecorded, total, shape }: { preview: Preview; back: boolean; rerecorded: number[]; total: number; shape: ClipShape }) {
  const { t } = useTranslation();
  const r = useResultDemo(preview, back, rerecorded, total);
  const ready = r.phase === "ready";
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const fullscreen = useFullscreen(screenRef, videoRef);
  const { playing } = usePlayback(videoRef);
  usePlayerKeys(videoRef, fullscreen, ready && !r.chooser);

  // the chooser preview: the playhead sits in the selected turn, as if paused there
  useEffect(() => {
    const v = videoRef.current;
    if (preview !== "chooser" || !v) return;
    const at = r.turns[r.pick]?.start ?? 0;
    const seek = () => {
      v.currentTime = at + 0.4;
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    // the preview only — later picks must not move the playhead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const openChooser = () => {
    const v = videoRef.current;
    v?.pause();
    r.openChooser(v?.currentTime ?? 0);
  };
  const switchToNew = () => {
    r.switchToNew();
    // owner answer 4: the new version plays from the start
    const v = videoRef.current;
    if (v) {
      v.currentTime = 0;
      togglePlay(v.paused ? v : null);
    }
    // the button that was pressed disappears: focus goes to Play
    window.setTimeout(() => screenRef.current?.querySelector<HTMLElement>('[data-testid="player-controls"] button')?.focus(), 0);
  };

  return (
    <AppShell
      credits={BALANCE}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: CREDITS, settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <Container className={s.page}>
        <div
          className={s.column}
          data-testid="result"
          data-phase={r.phase}
          data-shown={r.shown}
          data-newer={r.newer?.status ?? "none"}
        >
          <Stack gap={24}>
            <PageHeader
              title={<span className={s.name}>{r.name}</span>}
              description={<Status r={r} />}
              actions={<HeaderAction r={r} onSwitch={switchToNew} />}
            />
            <Card padding="none" className={s.card} data-testid="result-card">
              <PlayerScreen
                screenRef={screenRef}
                videoRef={videoRef}
                fullscreen={fullscreen}
                playing={playing}
                disabled={!ready}
                className={s.screen}
                data-testid="result-screen"
                controls={ready ? <PlayerControls videoRef={videoRef} fullscreen={fullscreen} className={s.controls} /> : undefined}
              >
                <div className={s.stage} data-clip={shape} data-lit={ready || undefined} data-testid="result-stage">
                  <VideoStage
                    src={CLIP}
                    ratio={STAGE_RATIO}
                    maxHeight="var(--video-h)"
                    videoRef={videoRef}
                    label={ready ? t("result.video", { n: r.shown }) : t("result.videoWaiting")}
                  >
                    <span className={s.dim} aria-hidden="true" />
                  </VideoStage>
                </div>
              </PlayerScreen>

              {!ready && (
                <CardBody className={s.middle}>
                  {r.phase === "assembling" ? <Assembling r={r} /> : <Failed />}
                </CardBody>
              )}

              <CardFooter className={s.footer}>
                {r.phase === "assembling" ? (
                  <>
                    <RerecordButton reason={t("result.rerecordLater")} />
                    <NotifyControl />
                  </>
                ) : r.phase === "failed" ? (
                  <>
                    <span aria-hidden="true" />
                    <Button size="lg" icon={<Icon name="retry" />} onClick={r.retry} data-testid="result-retry">
                      {t("result.retry")}
                    </Button>
                  </>
                ) : (
                  <>
                    <RerecordButton
                      onClick={openChooser}
                      reason={r.newer?.status === "assembling" ? t("result.rerecordLaterVersion", { n: r.newer.n }) : undefined}
                    />
                    <Button size="lg" icon={<Icon name="download" />} onClick={r.download} data-testid="result-download">
                      {r.newer?.status === "ready" ? t("result.downloadVersion", { n: r.shown }) : t("result.download")}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
            {r.phase === "assembling" && (
              <Text size="sm" tone="muted" className={s.leave}>{t("result.leave")}</Text>
            )}
          </Stack>
        </div>
        <span className="sr-only" role="status">{ready && !r.newer && r.shown === 1 && preview === "live" ? t("result.readyNow") : ""}</span>
      </Container>
      <Chooser r={r} />
    </AppShell>
  );
}

/**
 * The status line under the title — the one place that talks about versions (concept C): what is on screen, what is
 * being assembled, what is ready, what failed. Spoken politely when it changes.
 */
function Status({ r }: { r: Demo }) {
  const { t } = useTranslation();
  const turnList = useTurnList();
  const nv = r.newer;
  const ready = r.phase === "ready";
  const text = !ready ? t("result.turnsRecorded", { count: r.total })
    : nv?.status === "assembling" ? t("result.newVersion.assembling", { n: nv.n, ...turnList(nv.turns) })
      : nv?.status === "ready" ? t("result.newVersion.ready", { n: nv.n, ...turnList(nv.turns) })
        : nv?.status === "failed" ? t("result.newVersion.failed", { n: nv.n, old: r.shown })
          : r.shown > 1 ? t("result.metaVersion", { n: r.shown, ...turnList(r.shownTurns) })
            : t("result.meta", { count: r.total });
  return (
    <span className={s.status} role="status" aria-live="polite" data-testid="result-status" data-status={ready ? nv?.status ?? "current" : r.phase}>
      {ready && nv?.status === "assembling" && <Spinner size={14} />}
      {ready && nv?.status === "ready" && <span className={s.ok}><Icon name="success" size={14} /></span>}
      {ready && nv?.status === "failed" && <span className={s.warn}><Icon name="warning" size={14} /></span>}
      <span>{text}</span>
    </span>
  );
}

/**
 * "Re-record a turn" — disabled while a version is assembling (owner answer 5), with the reason written next to it
 * (not only in a tooltip) and linked as its description.
 */
function RerecordButton({ onClick, reason }: { onClick?: () => void; reason?: string }) {
  const { t } = useTranslation();
  return (
    <div className={s.rerecord}>
      <Button
        variant="secondary"
        size="lg"
        icon={<Icon name="record" />}
        onClick={onClick}
        disabled={Boolean(reason)}
        aria-describedby={reason ? "result-rerecord-reason" : undefined}
        data-testid="result-choose"
      >
        {t("result.chooser.open")}
      </Button>
      {reason && (
        <Text size="sm" tone="text" id="result-rerecord-reason" className={s.reason}>
          <span data-testid="result-rerecord-reason">{reason}</span>
        </Text>
      )}
    </div>
  );
}

/** Beside the title: "Watch version 2" when it is ready, "Try again" when it failed (both free); nothing otherwise. */
function HeaderAction({ r, onSwitch }: { r: Demo; onSwitch: () => void }) {
  const { t } = useTranslation();
  const nv = r.newer;
  if (r.phase !== "ready" || !nv || nv.status === "assembling") return null;
  return nv.status === "ready" ? (
    <Button variant="secondary" size="lg" icon={<Icon name="play" />} onClick={onSwitch} data-testid="result-switch" className={s.headerAction}>
      {t("result.newVersion.watch", { n: nv.n })}
    </Button>
  ) : (
    <Button variant="secondary" size="lg" icon={<Icon name="retry" />} onClick={r.retryNew} data-testid="result-retry-new" className={s.headerAction}>
      {t("result.retry")}
    </Button>
  );
}

/** Assembling: the processing language — the waiting pill names the one step, one segment fills, a rough estimate. */
function Assembling({ r }: { r: Demo }) {
  const { t } = useTranslation();
  const left = useLeft(r.remaining);
  return (
    <StepProgress
      data-testid="result-assembling"
      label={t("result.assembling.label")}
      steps={[t("result.assembling.step")]}
      current={1}
      fraction={r.progress}
      waitingLabel={t("result.assembling.step")}
      doneLabel={t("result.assembling.done")}
      meta={left}
      valueText={t("result.assembling.step")}
    />
  );
}

/** The first assembly failed (after the server's own retry): a service problem — the takes are safe, Try again is free. */
function Failed() {
  const { t } = useTranslation();
  return (
    <div className={s.ending} role="alert" data-testid="result-failed">
      <IconTile icon="error" tone="danger" size={40} />
      <div className={s.endingText}>
        <h2 className={s.endingTitle}>{t("result.failed.title")}</h2>
        <Text tone="text">{t("result.failed.text")}</Text>
      </div>
    </div>
  );
}

/** "Which turn do you want to re-record?" — the turn under the playhead is selected; change it by its text. */
function Chooser({ r }: { r: Demo }) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={r.chooser}
      onClose={r.closeChooser}
      title={t("result.chooser.title")}
      data-testid="result-chooser"
      footer={
        <>
          <Button variant="secondary" onClick={r.closeChooser}>{t("result.chooser.cancel")}</Button>
          <Button icon={<Icon name="record" />} onClick={r.rerecord} data-testid="result-chooser-go">
            {t("result.chooser.go", { n: r.pick + 1 })}
          </Button>
        </>
      }
    >
      <Stack gap={12}>
        <Text size="sm" tone="text">
          {t("result.chooser.hint")}
        </Text>
        <RadioGroup
          className={s.turnList}
          legend={<span className="sr-only">{t("result.chooser.legend")}</span>}
          value={String(r.pick)}
          onChange={(v) => r.setPick(Number(v))}
          options={r.turns.map((tn, k) => ({
            value: String(k),
            label: `${k + 1}. ${t(`studio.lines.${LINES[k % LINES.length]}`)}`,
            description: `${formatTime(tn.start)} – ${formatTime(tn.end)}`,
          }))}
        />
      </Stack>
    </Dialog>
  );
}
