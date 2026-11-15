import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import {
  Button, Card, CardBody, CardFooter, CardHeader, Dialog, EmptyState, Select, Text, TextLink, toast,
} from "@/components/ui";
import s from "./processing.module.css";

/*
 * Phase 4 — PROCESSING concepts (low-fi, design-architect). Structure, hierarchy and the motion of progress only.
 * Route: /prototypes/concepts/processing/<concept>?state=<state>
 *   no state (live)   a demo clock runs queued → step 1 → 2 → 3 → ready, then opens /prototypes/studio/turn?turn=1
 *   &end=no-dialogue|failed   the live run ends in that state instead (no-dialogue after step 2, failed in step 2)
 *   any other ?state= freezes that moment (a review aid; Try again in `failed` starts the clock again)
 * Every concept uses the same demo model (useProcessing) and the same end states; only the page structure differs.
 * Never used by real pages. Brief: design-system/processing-brief.md.
 */

export const PR_STATES = [
  "live", "queued", "running", "cancel-confirm", "cancel-queued", "no-dialogue", "failed", "ready",
] as const;
export type PrPreview = (typeof PR_STATES)[number];
export const PR_IDS = ["checklist", "stage", "tips"] as const;
export type PrId = (typeof PR_IDS)[number];
const LETTER: Record<PrId, string> = { checklist: "A", stage: "B", tips: "C" };

/** Pretend durations in seconds (shown to the user as the estimate): waiting, step 1, step 2, step 3. */
const PLAN = [20, 45, 60, 35] as const;
const TOTAL = PLAN.reduce((a, b) => a + b, 0); // 160 s ≈ 2.7 min for a 72 s section
const SPEED = 10; // the demo clock runs 10× faster than the estimate (≈ 16 s from Start to the studio)
const TICK_MS = 100;
const READY_MS = 1600; // the "Ready — opening the studio" moment before the studio opens
export const COST = 72; // the section 0:30 – 1:42 = 72 s → 72 credits (reserved at Start)
const BALANCE_AFTER_START = 120 - COST;
export const STEPS = 3;
const TURNS_FOUND = 12; // demo: turns found by the end of step 2

export const PROJECTS = "/styleguide/templates/projects";
export const NEW_DUB = "/prototypes/new-dub/page";
export const STUDIO = "/prototypes/studio/turn?turn=1";

const sumTo = (i: number) => PLAN.slice(0, i).reduce((a, b) => a + b, 0);
const SEED: Partial<Record<PrPreview, number>> = {
  live: 0,
  queued: 8,
  "cancel-queued": 8,
  running: sumTo(2) + 25, // mid step 2: step 1 is done
  "cancel-confirm": sumTo(2) + 25,
  ready: TOTAL,
};

export type Phase = "queued" | "running" | "ready" | "no-dialogue" | "failed";
export type StepState = "done" | "now" | "next";
type End = "ready" | "no-dialogue" | "failed";

export type Processing = ReturnType<typeof useProcessing>;

/** Demo-only state: the clock, the derived step, progress, estimate and the cancel price; actions. */
function useProcessing(preview: PrPreview, end: End) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const frozen = preview !== "live";
  const [clock, setClock] = useState(SEED[preview] ?? sumTo(2) + 25);
  const [live, setLive] = useState(!frozen);
  const [ended, setEnded] = useState<"no-dialogue" | "failed" | null>(
    preview === "no-dialogue" ? "no-dialogue" : preview === "failed" ? "failed" : null,
  );
  const [cancelOpen, setCancelOpen] = useState(preview === "cancel-confirm" || preview === "cancel-queued");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // the demo clock (keeps running behind the cancel dialog — a real job does not pause either)
  useEffect(() => {
    if (!live || ended) return;
    const id = window.setInterval(() => {
      setClock((c) => {
        const n = Math.min(TOTAL, c + (TICK_MS / 1000) * SPEED);
        if (end === "failed" && n >= sumTo(2) + 30) {
          window.setTimeout(() => setEnded("failed"), 0);
          return sumTo(2) + 30;
        }
        if (end === "no-dialogue" && n >= sumTo(3)) {
          window.setTimeout(() => setEnded("no-dialogue"), 0);
          return sumTo(3);
        }
        return n;
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [live, ended, end]);

  const done = clock >= TOTAL;
  const phase: Phase = ended ?? (done ? "ready" : clock < PLAN[0] ? "queued" : "running");

  // ready → a short moment, then the studio opens on turn 1 (only in a live run; a frozen `ready` waits for the button)
  const navigated = useRef(false);
  useEffect(() => {
    if (phase !== "ready" || !live || cancelOpen || navigated.current) return;
    const id = window.setTimeout(() => {
      navigated.current = true;
      navigate(STUDIO);
    }, READY_MS);
    return () => window.clearTimeout(id);
  }, [phase, live, cancelOpen, navigate]);

  // which step is running (1..3), how many are finished, how far the current one is
  let step = 0;
  for (let i = 1; i <= STEPS; i++) if (clock >= sumTo(i)) step = i;
  const stepsDone = phase === "ready" ? STEPS : phase === "queued" ? 0 : Math.max(0, step - 1);
  const current = phase === "running" ? step : 0;
  const stepFraction = (i: number) => {
    if (i <= stepsDone) return 1;
    if (i !== current) return 0;
    return Math.min(1, (clock - sumTo(i)) / PLAN[i]);
  };
  const stepState = (i: number): StepState => (i <= stepsDone ? "done" : i === current ? "now" : "next");
  const work = TOTAL - PLAN[0];
  const percent = phase === "queued" ? 0 : Math.round(Math.min(1, Math.max(0, (clock - PLAN[0]) / work)) * 100);
  const remaining = Math.max(0, TOTAL - clock);
  const charge = phase === "running" ? Math.ceil((COST * stepsDone) / STEPS) : 0; // equal thirds, rounded up (owner question)

  return {
    phase, clock, step: current, stepsDone, stepState, stepFraction, percent, remaining, charge,
    back: COST - charge,
    cost: COST,
    balance: BALANCE_AFTER_START, // the top bar: 120 − 72 reserved
    turnsFound: phase === "running" && current >= 2 ? Math.max(1, Math.round(stepFraction(2) * TURNS_FOUND)) : 0,
    live,
    cancelOpen, deleteOpen, busy,
    openCancel: () => setCancelOpen(true),
    closeCancel: () => setCancelOpen(false),
    confirmCancel: () => {
      setBusy(true);
      window.setTimeout(() => {
        toast({
          tone: "success",
          title: t("concepts.processing.toast.cancelled"),
          description: charge
            ? t("concepts.processing.toast.charged", { count: charge })
            : t("concepts.processing.toast.free", { count: COST }),
        });
        navigate(PROJECTS);
      }, 600);
    },
    openDelete: () => setDeleteOpen(true),
    closeDelete: () => setDeleteOpen(false),
    confirmDelete: () => {
      setBusy(true);
      window.setTimeout(() => {
        toast({ tone: "success", title: t("concepts.processing.toast.deleted") });
        navigate(PROJECTS);
      }, 600);
    },
    retry: () => {
      setEnded(null);
      setClock(sumTo(2)); // recovery picks up the step that failed
      setLive(true);
    },
    openStudio: () => navigate(STUDIO),
    tryAnother: () => navigate(NEW_DUB),
  };
}

/* ---------------- Words shared by the concepts ---------------- */

/** "About 2 min left" · "About a minute left" · "Less than a minute left" — a coarse estimate, never a countdown. */
export function useLeft(pr: Processing) {
  const { t } = useTranslation();
  const r = pr.remaining;
  if (r >= 90) return t("concepts.processing.left.min", { count: Math.round(r / 60) });
  if (r >= 45) return t("concepts.processing.left.minute");
  return t("concepts.processing.left.less");
}

export function useStepName() {
  const { t } = useTranslation();
  return (i: number) => t(`concepts.processing.steps.s${i as 1 | 2 | 3}`);
}

/** "You can leave this page — preparing goes on, and the project waits in My projects." */
export function LeaveNote({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  if (pr.phase !== "queued" && pr.phase !== "running") return null; // only while there is something to wait for
  return (
    <Text size="sm" tone="muted" className={s.leave}>
      {t("concepts.processing.leave")} <TextLink to={PROJECTS}>{t("concepts.processing.leaveLink")}</TextLink>
      {t("concepts.processing.leaveEnd")}
    </Text>
  );
}

export function CancelButton({ pr, variant = "secondary" }: { pr: Processing; variant?: "secondary" | "ghost" }) {
  const { t } = useTranslation();
  return (
    <Button variant={variant} size="lg" icon={<Icon name="close" />} onClick={pr.openCancel} data-testid="processing-cancel">
      {t("concepts.processing.cancel")}
    </Button>
  );
}

export function OpenStudioButton({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  return (
    <Button size="lg" icon={<Icon name="record" />} onClick={pr.openStudio} data-testid="processing-open-studio">
      {t("concepts.processing.openStudio")}
    </Button>
  );
}

/** The two end states, the same in every concept (each places them in its own frame). */
export function EndState({ pr }: { pr: Processing }) {
  const { t } = useTranslation();
  if (pr.phase === "no-dialogue") {
    return (
      <EmptyState
        icon="scene"
        tone="neutral"
        title={t("concepts.processing.none.title")}
        description={t("concepts.processing.none.text", { count: pr.cost })}
        data-testid="processing-no-dialogue"
        actions={
          <>
            <Button size="lg" icon={<Icon name="upload" />} onClick={pr.tryAnother}>{t("concepts.processing.none.another")}</Button>
            <Button size="lg" variant="secondary" icon={<Icon name="delete" />} onClick={pr.openDelete}>{t("concepts.processing.delete")}</Button>
          </>
        }
      />
    );
  }
  return (
    <EmptyState
      icon="error"
      tone="danger"
      title={t("concepts.processing.failed.title")}
      description={t("concepts.processing.failed.text")}
      data-testid="processing-failed"
      actions={
        <>
          <Button size="lg" icon={<Icon name="retry" />} onClick={pr.retry}>{t("concepts.processing.failed.retry")}</Button>
          <Button size="lg" variant="secondary" icon={<Icon name="delete" />} onClick={pr.openDelete}>{t("concepts.processing.delete")}</Button>
        </>
      }
    />
  );
}

/* ---------------- The page frame: shell + concept + dialogs + note ---------------- */

export function ProcessingPage({ id, children }: { id: PrId; children: (pr: Processing) => ReactNode }) {
  const preview = useViewState(PR_STATES);
  const [params] = useSearchParams();
  const e = params.get("end");
  const end: End = e === "no-dialogue" || e === "failed" ? e : "ready";
  return <Body key={`${preview}-${end}`} id={id} preview={preview} end={end}>{children}</Body>;
}

function Body({ id, preview, end, children }: { id: PrId; preview: PrPreview; end: End; children: (pr: Processing) => ReactNode }) {
  const { t } = useTranslation();
  const pr = useProcessing(preview, end);
  const name = t("concepts.processing.name");
  return (
    <AppShell
      credits={pr.balance}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      links={{ home: PROJECTS, credits: "/styleguide/templates/credits", settings: "/styleguide/templates/settings" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: PROJECTS, label: t("tpl.nav.projects"), icon: "projects" },
        { to: NEW_DUB, label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <div data-concept={id} data-testid="processing" data-phase={pr.phase}>{children(pr)}</div>

      <Dialog
        open={pr.cancelOpen}
        onClose={pr.closeCancel}
        role="alertdialog"
        data-testid="processing-cancel-dialog"
        title={t("concepts.processing.dialog.title", { name })}
        footer={
          <>
            <Button variant="secondary" onClick={pr.closeCancel} disabled={pr.busy}>{t("concepts.processing.dialog.keep")}</Button>
            <Button variant="destructive" onClick={pr.confirmCancel} loading={pr.busy}>{t("concepts.processing.cancel")}</Button>
          </>
        }
      >
        <Stack gap={8}>
          {pr.charge > 0 ? (
            <>
              <Text tone="strong" medium>
                {`${t("concepts.processing.dialog.done", { count: pr.stepsDone })} — ${t("concepts.processing.dialog.charged", { count: pr.charge })}`}
              </Text>
              <Text>{`${t("concepts.processing.dialog.back", { count: pr.back })} ${t("concepts.processing.dialog.removed")}`}</Text>
            </>
          ) : (
            <>
              <Text tone="strong" medium>
                {pr.phase === "queued" ? t("concepts.processing.dialog.notStarted") : t("concepts.processing.dialog.noneDone")}
              </Text>
              <Text>{`${t("concepts.processing.dialog.allBack", { count: pr.cost })} ${t("concepts.processing.dialog.removed")}`}</Text>
            </>
          )}
        </Stack>
      </Dialog>

      <Dialog
        open={pr.deleteOpen}
        onClose={pr.closeDelete}
        role="alertdialog"
        title={t("concepts.processing.deleteDialog.title", { name })}
        footer={
          <>
            <Button variant="secondary" onClick={pr.closeDelete} disabled={pr.busy}>{t("concepts.processing.deleteDialog.keep")}</Button>
            <Button variant="destructive" onClick={pr.confirmDelete} loading={pr.busy}>{t("concepts.processing.delete")}</Button>
          </>
        }
      >
        <Text>{pr.phase === "failed" ? t("concepts.processing.deleteDialog.failed") : t("concepts.processing.deleteDialog.none")}</Text>
      </Dialog>

      <div className={s.noteWrap}>
        <Note id={id} preview={preview} />
      </div>
    </AppShell>
  );
}

function Note({ id, preview }: { id: PrId; preview: PrPreview }) {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const rows = ["laptop", "phone", "motion", "money", "leave", "build"] as const;
  return (
    <Card padding="none" data-testid="concept-note">
      <CardHeader title={t("concepts.processing.note.title", { letter: LETTER[id], name: t(`concepts.processing.c.${id}.name`) })} />
      <CardBody>
        <Stack gap={12}>
          <Text tone="strong" medium>{t(`concepts.processing.c.${id}.idea`)}</Text>
          <dl className={s.tradeoffs}>
            {rows.map((r) => (
              <div key={r} className={s.tradeoff}>
                <dt>{t(`concepts.processing.note.${r}`)}</dt>
                <dd>{t(`concepts.processing.c.${id}.${r}`)}</dd>
              </div>
            ))}
          </dl>
          <Text size="sm" tone="muted">{t("concepts.processing.note.fixed")}</Text>
          <div className={s.statePicker}>
            <Select<PrPreview>
              label={t("concepts.processing.note.state")}
              value={preview}
              onChange={(v) => {
                const next = new URLSearchParams(params);
                if (v === "live") next.delete("state");
                else next.set("state", v);
                setParams(next, { replace: true });
              }}
              options={PR_STATES.map((v) => ({ value: v, label: t(`concepts.processing.note.states.${v}`) }))}
            />
          </div>
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={s.others}>
          <Text size="sm" tone="muted">{t("concepts.processing.note.others")}</Text>
          {PR_IDS.filter((c) => c !== id).map((c) => (
            <TextLink key={c} to={`/prototypes/concepts/processing/${c}${preview === "live" ? "" : `?state=${preview}`}`}>
              {`${LETTER[c]} · ${t(`concepts.processing.c.${c}.name`)}`}
            </TextLink>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
