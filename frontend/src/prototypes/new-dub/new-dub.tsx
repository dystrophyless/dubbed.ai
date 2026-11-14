import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { creditsFor } from "@/components/media";
import { toast } from "@/components/ui";
import { NewDubView, type ClipShape, type NewDubPhase as Phase, type NewDubReason as Reason } from "@/features/recording-flow-mock/views/NewDubView";

/*
 * Phase 4 — NEW DUB, HIGH-FI prototype (concept A "one card"; owner answers in design-system/new-dub-brief.md).
 * Route: /prototypes/new-dub/page?state=<state>
 *   &reason=type|size|length|no-audio|broken   (state=error; type and size are refused in the browser, before upload)
 *   &ratio=portrait|16x9                        a narrower clip in the 2.35:1 stage (black bars at the sides)
 *   &length=short                               a video under 2 minutes (the real 13 s demo clip, whole video selected)
 * A preview opens frozen at a telling moment; choosing a file runs the demo upload → check → ready for real.
 * Demo file names drive the server check: "...long..." → too long, "...silent..." → no sound, "...broken..." → unreadable.
 * Real page: /new in AppShell; slots, the draft upload and the start call become TanStack Query hooks.
 */
export const NEW_DUB_STATES = [
  "empty", "no-slot", "uploading", "checking", "ready", "limit", "error", "short", "starting",
] as const;
type Preview = (typeof NEW_DUB_STATES)[number];
const REASONS: readonly Reason[] = ["type", "size", "length", "no-audio", "broken"];

const CLIP = "/media/scene.mp4";
const CLIP_SECONDS = 13.4; // the demo clip (960 × 408)
const LONG_SECONDS = 252; // the demo "long video": 4:12 (the clip loops to stand in for it)
const MAX = 120;
const MAX_MB = 250;
const OK_TYPE = /\.(mp4|mov|webm)$/i;
const OK_MIME = ["video/mp4", "video/quicktime", "video/webm"];
const CHECK_MS = 1400;
const START_MS = 1200;
const PROJECTS = "/styleguide/templates/projects";
const CREDITS = "/styleguide/templates/credits";
const PAGE = "/prototypes/new-dub/page";
const PROCESSING = "/prototypes/processing/page";

/** "kitchen-scene.mp4" → "Kitchen scene" (owner: the project name comes from the file name; renamable later). */
export function projectName(file: string) {
  const base = file.replace(/\.[^.]+$/, "").replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base[0].toLocaleUpperCase() + base.slice(1) : file;
}

export function NewDubPrototype() {
  const preview = useViewState(NEW_DUB_STATES);
  const [params] = useSearchParams();
  const r = params.get("reason") as Reason | null;
  const reason: Reason = r && REASONS.includes(r) ? r : "length";
  const shape: ClipShape = params.get("ratio") === "portrait" ? "portrait" : params.get("ratio") === "16x9" ? "16x9" : "scope";
  const short = params.get("length") === "short";
  return (
    <>
      <NewDub key={`${preview}-${reason}-${shape}-${short}`} preview={preview} reason={reason} shape={shape} shortVideo={short} />
      <StateSwitcher states={NEW_DUB_STATES} />
    </>
  );
}

/* ---------------- Demo state (the real page gets this from TanStack Query) ---------------- */

function useNewDubDemo(preview: Preview, reason: Reason, shortVideo: boolean) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const phaseOf = (p: Preview): Phase =>
    p === "empty" || p === "no-slot" || p === "uploading" || p === "checking" || p === "error" ? p : "ready";
  const duration = shortVideo ? CLIP_SECONDS : LONG_SECONDS;
  const whole: [number, number] = [0, Math.min(duration, MAX)]; // default: the whole video if ≤ 120 s, else the first 120 s
  const seeded: [number, number] =
    shortVideo ? whole : preview === "limit" ? [70, 190] : preview === "ready" || preview === "short" || preview === "starting" ? [30, 102] : whole;
  const [phase, setPhase] = useState<Phase>(phaseOf(preview));
  const [error, setError] = useState<Reason>(reason);
  const [progress, setProgress] = useState(preview === "uploading" ? 64 : 0);
  const [live, setLive] = useState(false); // previews are frozen; choosing a file runs the clock
  const [file, setFile] = useState<string>(t("newDub.demoFile"));
  const [range, setRangeState] = useState<[number, number]>(seeded);
  const [starting, setStarting] = useState(preview === "starting");
  const balance = preview === "short" ? 40 : 120;
  const serverVerdict = useRef<Reason | null>(null);

  // upload → check → ready (or a server-side error)
  useEffect(() => {
    if (!live) return;
    if (phase === "uploading") {
      const id = window.setInterval(() => {
        setProgress((p) => {
          const n = Math.min(100, p + 4);
          if (n === 100) {
            window.clearInterval(id);
            window.setTimeout(() => setPhase("checking"), 200);
          }
          return n;
        });
      }, 60);
      return () => window.clearInterval(id);
    }
    if (phase === "checking") {
      const id = window.setTimeout(() => {
        const verdict = serverVerdict.current;
        if (verdict) {
          setError(verdict);
          setPhase("error");
        } else {
          setRangeState(whole);
          setPhase("ready");
        }
      }, CHECK_MS);
      return () => window.clearTimeout(id);
    }
    // whole is derived from props that never change for this mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, phase]);

  useEffect(() => {
    if (!starting || !live) return;
    const id = window.setTimeout(() => {
      const q = new URLSearchParams({
        name: projectName(file),
        credits: String(creditsFor(range[1] - range[0])),
        from: String(Math.round(range[0] * 100) / 100),
        to: String(Math.round(range[1] * 100) / 100),
      });
      navigate(`${PROCESSING}?${q}`);
    }, START_MS);
    return () => window.clearTimeout(id);
  }, [starting, live, navigate, file, range]);

  return {
    phase, error, progress, file, range, balance, starting, duration,
    name: projectName(file),
    choose: (f: File) => {
      // the browser checks type and size before anything is uploaded
      const typeOk = OK_TYPE.test(f.name) || OK_MIME.includes(f.type);
      if (!typeOk || f.size > MAX_MB * 1024 * 1024) {
        setError(!typeOk ? "type" : "size");
        setPhase("error");
        return;
      }
      serverVerdict.current = /long/i.test(f.name) ? "length" : /silent/i.test(f.name) ? "no-audio" : /broken/i.test(f.name) ? "broken" : null;
      setFile(f.name);
      setProgress(0);
      setLive(true);
      setPhase("uploading");
    },
    /** Cancel upload: back to empty, no slot taken (owner answer 7) */
    cancel: () => {
      setLive(false);
      setProgress(0);
      setPhase("empty");
    },
    setRange: (a: number, b: number) => setRangeState([a, b]),
    start: () => {
      setLive(true);
      setStarting(true);
    },
    buy: () => {
      // prototype: the Credits template; the real /credits returns to /new with the video and section kept (ia.md flow 6)
      toast({ tone: "info", title: t("newDub.buyNote") });
      navigate(CREDITS);
    },
  };
}


/* ---------------- Shell + page ---------------- */

function NewDub({ preview, reason, shape, shortVideo }: { preview: Preview; reason: Reason; shape: ClipShape; shortVideo: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const nd = useNewDubDemo(preview, reason, shortVideo);
  return (
    <AppShell
      credits={nd.balance}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: CREDITS, settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: PAGE, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <NewDubView
        phase={nd.phase}
        error={nd.error}
        progress={nd.progress}
        fileName={nd.file}
        name={nd.name}
        videoSrc={CLIP}
        duration={nd.duration}
        range={nd.range}
        balance={nd.balance}
        starting={nd.starting}
        shape={shape}
        // the 13 s demo clip loops to stand in for the 4:12 video
        toMedia={loopClip}
        onFile={nd.choose}
        onCancelUpload={nd.cancel}
        onRange={nd.setRange}
        onStart={nd.start}
        onBuyCredits={nd.buy}
        onOpenProjects={() => navigate(PROJECTS)}
      />
    </AppShell>
  );
}

const loopClip = (t: number) => Math.round((t % CLIP_SECONDS) * 100) / 100;
