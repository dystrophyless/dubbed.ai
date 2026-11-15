import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { toast } from "@/components/ui";
import { LoadError } from "@/features/recording-flow-mock/LoadError";
import { PageSkeleton } from "@/features/recording-flow-mock/PageSkeleton";
import { NewDubView, type NewDubReason } from "@/features/recording-flow-mock/views/NewDubView";
import { draftSourceKey } from "@/services/rules/draft";
import { qk, useAccount, useProject, useServices, useVideoUrl, type ProjectId } from "@/services";

/*
 * S1 — New dub on the real routes (ui-spec S1). Upload → server check → draft (holds a slot) → section → Start.
 * An existing draft is continued ("Not started" row, or coming back to /new). Credits / refusal honesty beyond what the
 * view needs is US2 and is wired here: "no slot" is told before a file is chosen (unless the slot is being reused from a
 * no-dialogue project), refusals take no slot, a short balance disables Start in the view (CostButton), Replace video
 * reuses the draft, and the draft + section survive a visit to /credits.
 */
type Upload = { phase: "uploading" | "checking" | "error"; progress: number; fileName: string; error: NewDubReason };

const toSeconds = (ms: number) => Math.round(ms) / 1000;
const toMs = (s: number) => Math.round(s * 1000);

export function NewDubPage() {
  const { t } = useTranslation();
  const services = useServices();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const account = useAccount();
  // /new?project=<id> opens that draft explicitly; plain /new continues the most recently changed one
  const [params] = useSearchParams();
  const wanted = (params.get("project") || undefined) as ProjectId | undefined;
  const draftKey = [...qk.draft, wanted ?? "latest"] as const;
  const draftQuery = useQuery({ queryKey: draftKey, queryFn: () => services.projects.currentDraft(wanted) });
  // "Try another video" on a no-dialogue project: that project's slot is reused by the next upload. An explicit replacement
  // intent wins over any draft: replace target > ?project draft > latest draft.
  const replaceId = (useLocation().state as { replace?: ProjectId } | null)?.replace;
  const replaceTarget = useProject(replaceId);
  const reusable = replaceTarget.data?.state === "no_dialogue" ? replaceTarget.data.id : undefined;
  const draft = reusable ? null : (draftQuery.data ?? null);
  const video = useVideoUrl(draft?.id);

  const [upload, setUpload] = useState<Upload | null>(null);
  const [noSlot, setNoSlot] = useState(false);
  const [starting, setStarting] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      // leaving the page drops the upload in flight (no late draft, no slot)
      mounted.current = false;
      abort.current?.abort();
      abort.current = null;
    };
  }, []);

  // the section: local while the user drags, saved to the draft shortly after
  const [range, setRange] = useState<[number, number] | null>(null);
  const draftId = draft?.id;
  // reset only when the project or its uploaded source changes (another tab may have replaced the video)
  const [syncedKey, setSyncedKey] = useState<string | undefined>();
  if (draft && syncedKey !== draftSourceKey(draft)) {
    setSyncedKey(draftSourceKey(draft));
    setRange([toSeconds(draft.section.startMs), toSeconds(draft.section.endMs)]);
  }
  const pending = useRef<{ id: ProjectId; start: number; end: number } | null>(null);
  const timer = useRef(0);
  const saving = useRef(Promise.resolve(true));
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) {
      // Keep debounced writes ordered; Start must wait for its own selected range, not an older save.
      saving.current = saving.current.then(async () => {
        const outcome = await services.projects.setSection(p.id, { startMs: toMs(p.start), endMs: toMs(p.end) });
        return outcome.ok;
      }).catch(() => false);
    }
    return saving.current;
  }, [services]);
  useEffect(() => () => void flush(), [flush]);

  const choose = useCallback(
    async (file: File) => {
      const pre = services.upload.precheck(file);
      if (!pre.ok) {
        setUpload({ phase: "error", progress: 0, fileName: file.name, error: pre.error });
        return;
      }
      const controller = new AbortController();
      abort.current = controller;
      setUpload({ phase: "uploading", progress: 0, fileName: file.name, error: "length" });
      let outcome: Awaited<ReturnType<typeof services.upload.upload>>;
      try {
        outcome = await services.upload.upload(file, {
          signal: controller.signal,
          replace: (draftId ?? reusable) as ProjectId | undefined,
          onProgress: (p) => setUpload((u) => (u && u.phase === "uploading" ? { ...u, progress: Math.round(p * 100) } : u)),
          onChecking: () => setUpload((u) => (u ? { ...u, phase: "checking", progress: 100 } : u)),
        });
      } catch {
        outcome = { ok: false, error: "broken" };
      }
      if (abort.current !== controller) return;
      abort.current = null;
      if (outcome.ok) {
        // a replaced video keeps the draft (and its slot) but starts with its own default section
        setSyncedKey(draftSourceKey(outcome.value));
        setRange([toSeconds(outcome.value.section.startMs), toSeconds(outcome.value.section.endMs)]);
        const key = reusable ? [...qk.draft, outcome.value.id] : [...qk.draft, wanted ?? "latest"];
        qc.setQueryData(key, outcome.value);
        await qc.refetchQueries({ queryKey: qk.videoUrl(outcome.value.id) });
        setUpload(null);
        // the no-dialogue project is a draft now: continue it explicitly (the replacement intent is spent)
        if (reusable && mounted.current) navigate(`/new?project=${encodeURIComponent(outcome.value.id)}`, { replace: true });
      } else if (outcome.error === "no-slot") {
        setUpload(null);
        setNoSlot(true);
      } else if (outcome.error === "aborted") {
        setUpload(null);
      } else if (outcome.error === "storage") {
        setUpload(null);
        toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
      } else {
        setUpload({ phase: "error", progress: 0, fileName: file.name, error: outcome.error });
      }
    },
    [services, draftId, reusable, wanted, qc, t, navigate],
  );

  const cancelUpload = () => {
    abort.current?.abort();
    abort.current = null;
    setUpload(null);
  };

  const start = async () => {
    if (!draft || !range || starting) return;
    setStarting(true);
    const failed = () => toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
    try {
      pending.current = { id: draft.id, start: range[0], end: range[1] };
      if (!await flush()) {
        failed();
        return;
      }
      const outcome = await services.projects.start(draft.id);
      if (!outcome.ok) {
        failed();
        return;
      }
      void qc.invalidateQueries({ queryKey: qk.project(draft.id) });
      // the paid start has happened either way; only a page that is still here navigates on
      if (mounted.current) navigate(`/projects/${draft.id}/processing`);
    } catch {
      failed();
    } finally {
      if (mounted.current) setStarting(false);
    }
  };

  if ((draftQuery.isError && !reusable) || account.isError || (draft && video.isError) || (replaceId && replaceTarget.isError)) {
    return <LoadError width="stage" onRetry={() => { void draftQuery.refetch(); void account.refetch(); if (draft && video.isError) void video.refetch(); if (replaceId) void replaceTarget.refetch(); }} />;
  }
  if ((draftQuery.isPending && !reusable) || account.isPending || (replaceId && replaceTarget.isPending)) return <PageSkeleton width="stage" label={t("features.recordingFlowMock.page.loading")} />;
  if (wanted && !draft && !reusable) {
    // the requested project is not a draft (any more): the normal redirect decides (its state's page, or My projects)
    if (!draftQuery.isFetchedAfterMount) return <PageSkeleton width="stage" label={t("features.recordingFlowMock.page.loading")} />;
    return <Navigate to={`/projects/${encodeURIComponent(wanted)}`} replace />;
  }

  const slotsFull = !draft && !reusable && account.data.slotsUsed >= account.data.slotLimit;
  const ready = !upload && draft && range && video.data;
  const phase = upload ? upload.phase : ready ? "ready" : draft ? "checking" : noSlot || slotsFull ? "no-slot" : "empty";
  const reasonOf = upload?.error ?? "length";

  return (
    <NewDubView
      phase={phase}
      error={reasonOf}
      progress={upload?.progress ?? 100}
      fileName={upload?.fileName ?? draft?.video.fileName ?? ""}
      name={draft?.name ?? ""}
      videoSrc={video.data ?? ""}
      duration={draft ? toSeconds(draft.video.durationMs) : 0}
      range={range ?? [0, 0]}
      balance={account.data.balance}
      starting={starting}
      onFile={(f) => void choose(f)}
      onCancelUpload={cancelUpload}
      onRange={(a, b) => {
        const next: [number, number] = [toSeconds(toMs(a)), toSeconds(toMs(b))];
        setRange(next);
        if (!draft) return;
        pending.current = { id: draft.id, start: next[0], end: next[1] };
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), 300);
      }}
      onStart={() => void start()}
      onBuyCredits={() => navigate("/credits")}
      onOpenProjects={() => navigate("/projects")}
    />
  );
}
