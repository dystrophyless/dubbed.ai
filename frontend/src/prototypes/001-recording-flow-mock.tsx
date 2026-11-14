import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { InAppShell } from "@/pages/styleguide/templates/TemplateFrame";
import { useViewState } from "@/components/dev/view-state";
import { toast } from "@/components/ui";
import { LIFECYCLE_PROJECTS, demoCancelInfo, prototypeHref } from "@/features/recording-flow-mock/mocks";
import { ProjectsView, type ProjectItem } from "@/features/recording-flow-mock/views/ProjectsView";
import { ResultPrototype } from "./result/result";

/*
 * Feature 001 — recording flow on mock services. ONLY the deltas to the Gate-4 prototypes live here:
 *   /prototypes/001-recording-flow-mock/projects?state=default|loading|empty|error|slots-full|not-found
 *       My projects with a row for every lifecycle state; each row opens the approved prototype of its page.
 *       not-found = the redirect target of an unknown/deleted project (toast).
 *   /prototypes/001-recording-flow-mock/result?state=ready|new-version-ready|...   the approved Result, the download
 *       button names the real file format (WebM in the demo; &format=mp4 shows the Safari/backend label).
 *   /prototypes/001-recording-flow-mock/studio?state=recording-elsewhere            the studio with the "another tab" notice
 *       (the state itself lives in /prototypes/studio/turn, the approved prototype, as one extra preview).
 * Everything else is "as approved": new-dub/page, processing/page, studio/turn, result/page.
 */
export const PROJECTS_STATES = ["default", "loading", "empty", "error", "slots-full", "not-found", "delete-preparing", "delete-queued"] as const;

export function ProjectsDeltaPrototype() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = useViewState(PROJECTS_STATES);
  const full = state === "slots-full";
  const [items, setItems] = useState<ProjectItem[]>(full ? LIFECYCLE_PROJECTS.slice(0, 2) : LIFECYCLE_PROJECTS);

  // unknown or deleted project: the real /projects/:id redirect lands here with a toast
  const shown = useRef(false); // React StrictMode runs effects twice in dev
  useEffect(() => {
    if (state !== "not-found" || shown.current) return;
    shown.current = true;
    toast({
      tone: "info",
      title: t("features.recordingFlowMock.projects.notFoundTitle"),
      description: t("features.recordingFlowMock.projects.notFoundText"),
    });
  }, [state, t]);

  return (
    <InAppShell states={PROJECTS_STATES} credits={full ? 14 : 48}>
      <ProjectsView
        key={state}
        state={state === "not-found" || state === "delete-preparing" || state === "delete-queued" ? "default" : state}
        initialDeleteId={state === "delete-preparing" ? "p-preparing" : state === "delete-queued" ? "p-queued" : undefined}
        cancelInfo={demoCancelInfo}
        projects={items}
        slotsTotal={full ? 2 : 10}
        hrefOf={prototypeHref}
        onRename={(id, name) => {
          setItems((l) => l.map((x) => (x.id === id ? { ...x, name } : x)));
          toast({ title: t("features.recordingFlowMock.projects.renamed") });
        }}
        onDelete={(id) => {
          setItems((l) => l.filter((x) => x.id !== id));
          toast({ title: t("features.recordingFlowMock.projects.deleted") });
        }}
        onNewDub={() => navigate("/prototypes/new-dub/page")}
        onBuyCredits={() => navigate("/styleguide/templates/credits")}
        onRetry={() => navigate("?", { replace: true })}
      />
    </InAppShell>
  );
}

/** The approved Result with the demo's real download format (WebM; Safari records MP4). */
export function ResultFormatPrototype() {
  return <ResultPrototype format="webm" showFormat />;
}
