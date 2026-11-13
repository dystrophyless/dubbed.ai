import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "@/components/ui";
import { LoadError } from "@/features/recording-flow-mock/LoadError";
import { PageSkeleton } from "@/features/recording-flow-mock/PageSkeleton";
import { NewDubView, type NewDubReason } from "@/features/recording-flow-mock/views/NewDubView";
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
  const draftQuery = useQuery({ queryKey: qk.draft, queryFn: () => services.projects.currentDraft() });
  const draft = draftQuery.data ?? null;
  const video = useVideoUrl(draft?.id);
  // "Try another video" on a no-dialogue project: no draft yet, but that project's slot is reused by the next upload
  const replaceId = (useLocation().state as { replace?: ProjectId } | null)?.replace;
  const replaceTarget = useProject(replaceId);
  const reusable = !draft && replaceTarget.data?.state === "no_dialogue" ? replaceTarget.data.id : undefined;

  const [upload, setUpload] = useState<Upload | null>(null);
  const [noSlot, setNoSlot] = useState(false);
  const [starting, setStarting] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // the section: local while the user drags, saved to the draft shortly after
  const [range, setRange] = useState<[number, number] | null>(null);
  const draftId = draft?.id;
  const [syncedId, setSyncedId] = useState<string | undefined>();
  if (draft && syncedId !== draft.id) {
    setSyncedId(draft.id);
    setRange([toSeconds(draft.section.startMs), toSeconds(draft.section.endMs)]);
  }
  const pending = useRef<{ id: ProjectId; start: number; end: number } | null>(null);
  const timer = useRef(0);
  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (p) await services.projects.setSection(p.id, { startMs: toMs(p.start), endMs: toMs(p.end) });
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
      const outcome = await services.upload.upload(file, {
        signal: controller.signal,
        replace: (draftId ?? reusable) as ProjectId | undefined,
        onProgress: (p) => setUpload((u) => (u && u.phase === "uploading" ? { ...u, progress: Math.round(p * 100) } : u)),
        onChecking: () => setUpload((u) => (u ? { ...u, phase: "checking", progress: 100 } : u)),
      });
      if (abort.current !== controller) return;
      abort.current = null;
      if (outcome.ok) {
        // a replaced video keeps the draft (and its slot) but starts with its own default section
        setSyncedId(outcome.value.id);
        setRange([toSeconds(outcome.value.section.startMs), toSeconds(outcome.value.section.endMs)]);
        qc.setQueryData(qk.draft, outcome.value);
        await qc.refetchQueries({ queryKey: qk.videoUrl(outcome.value.id) });
        setUpload(null);
      } else if (outcome.error === "no-slot") {
        setUpload(null);
        setNoSlot(true);
      } else if (outcome.error === "aborted") {
        setUpload(null);
      } else {
        setUpload({ phase: "error", progress: 0, fileName: file.name, error: outcome.error });
      }
    },
    [services, draftId, reusable, qc],
  );

  const cancelUpload = () => {
    abort.current?.abort();
    abort.current = null;
    setUpload(null);
  };

  const start = async () => {
    if (!draft || !range || starting) return;
    setStarting(true);
    pending.current = { id: draft.id, start: range[0], end: range[1] };
    await flush();
    const outcome = await services.projects.start(draft.id);
    if (outcome.ok) {
      void qc.invalidateQueries({ queryKey: qk.project(draft.id) });
      navigate(`/projects/${draft.id}/processing`);
      return;
    }
    setStarting(false);
    toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
  };

  if (draftQuery.isError || account.isError) {
    return <LoadError width="stage" onRetry={() => { void draftQuery.refetch(); void account.refetch(); }} />;
  }
  if (draftQuery.isPending || account.isPending || (replaceId && replaceTarget.isPending)) return <PageSkeleton width="stage" label={t("features.recordingFlowMock.page.loading")} />;

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
