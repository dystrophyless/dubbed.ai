import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { useViewState } from "@/components/dev/view-state";
import { toast } from "@/components/ui";
import type { ClipShape } from "@/features/recording-flow-mock/views/NewDubView";
import { PROCESSING_STEPS, ProcessingView, type ProcessingPhase } from "@/features/recording-flow-mock/views/ProcessingView";
import type { NotifyProps, NotifyState } from "@/features/recording-flow-mock/views/NotifyControl";
import {
  STUDIO, cancelReadyElsewhere, isNotifyOn, scheduleReadyElsewhere, sendReadyNotification, setNotifyOn,
} from "./ready-elsewhere";

/*
 * Phase 4 — PROCESSING, HIGH-FI prototype (concept B "the scene, waiting" with concept C's progress: the waiting pill
 * names the step, three bar segments fill one after another). Brief: design-system/processing-brief.md.
 * Route: /prototypes/processing/page?state=<state>
 *   no state (live)           a demo clock (10× faster than the estimate) runs waiting → step 1 → 2 → 3 → ready →
 *                             "Ready — opening the studio" → /prototypes/studio/turn?turn=1 (about 18 s)
 *   &end=no-dialogue|failed   a live run ends there instead (no-dialogue after step 2, failed inside step 2)
 *   ?state=queued|running|cancel-confirm|cancel-queued|no-dialogue|failed|ready   frozen review states
 *   &name=&credits=&from=&to= what New dub's Start passes (project name, reserved credits, the section in seconds)
 *   &ratio=portrait|16x9      a narrower clip in the 2.35:1 stage (black bars at the sides)
 *   &tab=background           pretend the tab is in the background when it becomes ready: no auto-open, the page waits
 *                             with "Open the studio" (owner answer 8; the frozen `ready` state is this case)
 *   &notify=granted|denied    preview the "Notify me when it's ready" control after the browser answered
 * Leaving the page during a live run finishes the job in the background → a "ready" toast wherever the user is
 * (ready-elsewhere.tsx; preview: /prototypes/processing/ready-elsewhere).
 * Owner answers and the remaining assumptions: processing-brief.md.
 * Real page: /projects/:id/processing in AppShell; the job status comes from a TanStack Query poll.
 */
export const PROCESSING_STATES = [
  "live", "queued", "running", "cancel-confirm", "cancel-queued", "no-dialogue", "failed", "ready",
] as const;
type Preview = (typeof PROCESSING_STATES)[number];
type Phase = ProcessingPhase;
type End = "ready" | "no-dialogue" | "failed";

const CLIP = "/media/scene.mp4";
const CLIP_SECONDS = 13.4; // the demo clip loops to stand in for the uploaded video
const PROJECTS = "/styleguide/templates/projects";
const CREDITS = "/styleguide/templates/credits";
const NEW_DUB = "/prototypes/new-dub/page";
const BALANCE_BEFORE = 120; // the demo balance before Start (New dub)

/** Demo estimate in seconds — waiting, step 1, step 2, step 3 (shown rounded to minutes, never as a countdown). */
const PLAN = [20, 45, 60, 35] as const;
const TOTAL = PLAN.reduce((a, b) => a + b, 0);
const SPEED = 10; // the demo clock runs 10× faster than the estimate
const TICK_MS = 100;
const READY_MS = 1500; // owner answer 8: "Ready — opening the studio", then the studio opens (visible tab only)
/*
 * Owner answer 1: steps cost different amounts and the server says what a cancel costs. These shares are PLACEHOLDERS
 * for the server's numbers (72 → 18 after step 1, 51 after step 2) — not a rule.
 */
const CHARGED_AFTER = [0, 18 / 72, 51 / 72] as const;
const STEPS = PROCESSING_STEPS;
const TURNS = 12; // demo: turns found by the end of step 2
const FAIL_AT = PLAN[0] + PLAN[1] + 30; // &end=failed: inside step 2
const sumTo = (i: number) => PLAN.slice(0, i).reduce((a, b) => a + b, 0);
const SEED: Partial<Record<Preview, number>> = {
  live: 0,
  queued: 8,
  "cancel-queued": 8,
  running: sumTo(2) + 25, // mid step 2: step 1 is done
  "cancel-confirm": sumTo(2) + 25,
  "no-dialogue": sumTo(3),
  failed: FAIL_AT,
  ready: TOTAL,
};

export function ProcessingPrototype() {
  const preview = useViewState(PROCESSING_STATES);
  const [params] = useSearchParams();
  const e = params.get("end");
  const end: End = e === "no-dialogue" || e === "failed" ? e : "ready";
  const shape: ClipShape = params.get("ratio") === "portrait" ? "portrait" : params.get("ratio") === "16x9" ? "16x9" : "scope";
  const background = params.get("tab") === "background";
  return (
    <>
      <Processing key={`${preview}-${end}-${shape}-${background}`} preview={preview} end={end} shape={shape} background={background} />
      <StateSwitcher states={PROCESSING_STATES} />
    </>
  );
}

/* ---------------- Demo state (the real page polls the job with TanStack Query) ---------------- */

function useProcessingDemo(preview: Preview, end: End, background: boolean) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cost = Math.max(1, Number(params.get("credits")) || 72);
  const from = Number(params.get("from") ?? 30) || 0;
  const to = Number(params.get("to")) || from + cost;
  const name = params.get("name") || t("processing.name");

  const [clock, setClock] = useState(SEED[preview] ?? 0);
  const [live, setLive] = useState(preview === "live");
  const [ended, setEnded] = useState<"no-dialogue" | "failed" | null>(
    preview === "no-dialogue" ? "no-dialogue" : preview === "failed" ? "failed" : null,
  );
  const [recovered, setRecovered] = useState(false); // after Try again the demo ending is not repeated
  const [cancelOpen, setCancelOpen] = useState(preview === "cancel-confirm" || preview === "cancel-queued");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false); // ready while the tab was in the background → wait for the user
  const ending = recovered ? "ready" : end;

  // the demo clock — keeps running behind the cancel dialog (assumption: the job does not pause, the amount updates)
  useEffect(() => {
    if (!live || ended) return;
    const id = window.setInterval(() => {
      setClock((c) => {
        const n = Math.min(TOTAL, c + (TICK_MS / 1000) * SPEED);
        if (ending === "failed" && n >= FAIL_AT) {
          window.setTimeout(() => setEnded("failed"), 0);
          return FAIL_AT;
        }
        if (ending === "no-dialogue" && n >= sumTo(3)) {
          window.setTimeout(() => setEnded("no-dialogue"), 0);
          return sumTo(3);
        }
        return n;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [live, ended, ending]);

  const phase: Phase = ended ?? (clock >= TOTAL ? "ready" : clock < PLAN[0] ? "queued" : "running");

  /*
   * Ready (owner answer 8): a visible tab shows "Ready — opening the studio" and opens turn 1 after ~1.5 s; a tab in the
   * background does not navigate — the page waits with "Open the studio" (and a browser notification if opted in).
   * A frozen `ready` preview is the background case.
   */
  const navigated = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || !live || cancelOpen || navigated.current || waiting) return;
    if (background || document.visibilityState === "hidden") {
      setWaiting(true);
      sendReadyNotification(name);
      return;
    }
    const id = window.setTimeout(() => {
      navigated.current = true;
      navigate(STUDIO);
    }, READY_MS);
    return () => window.clearTimeout(id);
  }, [phase, live, cancelOpen, waiting, background, navigate, name]);

  // leaving the page during a live run: the job goes on and says "ready" wherever the user is (ready-elsewhere.tsx)
  const latest = useRef({ clock, phase, live, ending, leaving: false });
  latest.current = { ...latest.current, clock, phase, live, ending };
  useEffect(() => {
    cancelReadyElsewhere();
    return () => {
      // read at unmount on purpose: where the job is when the user leaves
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const { clock: c, phase: p, live: l, ending: e, leaving } = latest.current;
      if (!l || leaving || e !== "ready" || (p !== "queued" && p !== "running")) return;
      scheduleReadyElsewhere(((TOTAL - c) / SPEED) * 1000, name, TURNS);
    };
  }, [name]);

  let step = 0;
  for (let i = 1; i <= STEPS; i++) if (clock >= sumTo(i)) step = i;
  const current = phase === "queued" ? 0 : Math.min(step, STEPS);
  const stepsDone = phase === "ready" ? STEPS : phase === "queued" ? 0 : Math.max(0, current - 1);
  const fraction = current > 0 ? Math.min(1, (clock - sumTo(current)) / PLAN[current]) : 0;
  const remaining = Math.max(0, TOTAL - clock);
  // what cancelling costs now — from the server in the real app (placeholder shares above)
  const charge = phase === "running" ? Math.round(cost * CHARGED_AFTER[Math.min(stepsDone, STEPS - 1)]) : 0;
  const turnsFound =
    phase === "ready" || (phase === "running" && current >= 3) ? TURNS
      : phase === "running" && current === 2 ? Math.max(1, Math.round(fraction * TURNS)) : 0;

  return {
    phase, current, stepsDone, fraction, remaining, charge, turnsFound, cost, name, from, to,
    opening: live && !waiting, // "Ready — opening the studio" only when it really opens by itself
    back: cost - charge,
    // the top bar shows the balance after the reserve; a service failure returns the reserve at once (owner answer 6)
    balance: phase === "failed" ? BALANCE_BEFORE : BALANCE_BEFORE - cost,
    cancelOpen, deleteOpen, busy,
    openCancel: () => setCancelOpen(true),
    closeCancel: () => setCancelOpen(false),
    confirmCancel: () => {
      latest.current.leaving = true;
      setBusy(true);
      window.setTimeout(() => {
        toast({
          tone: "success",
          title: t("processing.toast.cancelled"),
          description: charge ? t("processing.toast.charged", { count: charge }) : t("processing.toast.free", { count: cost }),
        });
        navigate(PROJECTS); // assumption: after cancelling → My projects
      }, 600);
    },
    openDelete: () => setDeleteOpen(true),
    closeDelete: () => setDeleteOpen(false),
    confirmDelete: () => {
      latest.current.leaving = true;
      setBusy(true);
      window.setTimeout(() => {
        toast({ tone: "success", title: t("processing.toast.deleted") });
        navigate(PROJECTS);
      }, 600);
    },
    retry: () => {
      // reserves the credits again (owner answer 6) and resumes from the failed step — finished steps are kept (owner)
      setRecovered(true);
      setEnded(null);
      setClock(sumTo(2));
      setLive(true);
    },
    openStudio: () => navigate(STUDIO),
    tryAnother: () => navigate(NEW_DUB),
  };
}

/** "Notify me when it's ready" with the prototype's module-level opt-in (the real page stores it on the project). */
export function useDemoNotify(): NotifyProps | null {
  const [params] = useSearchParams();
  const forced = params.get("notify");
  const supported = typeof window !== "undefined" && "Notification" in window;
  const [state, setState] = useState<NotifyState>(() => {
    if (forced === "granted") return "on";
    if (forced === "denied") return "denied";
    return isNotifyOn() ? "on" : "off";
  });
  useEffect(() => {
    if (forced === "granted") setNotifyOn(true);
  }, [forced]);
  const set = (next: NotifyState) => {
    setNotifyOn(next === "on");
    setState(next);
  };
  const ask = async () => {
    if (!supported) return;
    if (Notification.permission === "granted") return set("on");
    if (Notification.permission === "denied") return set("denied");
    const answer = await Notification.requestPermission();
    set(answer === "granted" ? "on" : answer === "denied" ? "denied" : "off");
  };
  if (!supported && !forced) return null;
  return { state, onAsk: () => void ask(), onTurnOff: () => set("off") };
}

/* ---------------- The page ---------------- */

function Processing({ preview, end, shape, background }: { preview: Preview; end: End; shape: ClipShape; background: boolean }) {
  const { t } = useTranslation();
  const pr = useProcessingDemo(preview, end, background);
  const notify = useDemoNotify();
  return (
    <AppShell
      credits={pr.balance}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: CREDITS, settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <ProcessingView
        phase={pr.phase}
        current={pr.current}
        fraction={pr.fraction}
        remainingSeconds={pr.remaining}
        turnsFound={pr.turnsFound}
        cost={pr.cost}
        name={pr.name}
        from={pr.from}
        to={pr.to}
        videoSrc={CLIP}
        // the demo clip loops to stand in for the uploaded video
        firstFrameAt={Math.round((pr.from % CLIP_SECONDS) * 100) / 100}
        shape={shape}
        opening={pr.opening}
        cancel={{ open: pr.cancelOpen, pending: false, stepsDone: pr.stepsDone, charge: pr.charge, back: pr.back }}
        deleteOpen={pr.deleteOpen}
        busy={pr.busy}
        notify={notify}
        projectsHref={PROJECTS}
        onOpenCancel={pr.openCancel}
        onCloseCancel={pr.closeCancel}
        onConfirmCancel={pr.confirmCancel}
        onOpenDelete={pr.openDelete}
        onCloseDelete={pr.closeDelete}
        onConfirmDelete={pr.confirmDelete}
        onRetry={pr.retry}
        onOpenStudio={pr.openStudio}
        onTryAnother={pr.tryAnother}
      />
    </AppShell>
  );
}
