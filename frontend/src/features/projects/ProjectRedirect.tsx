import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router";
import { GuardNavigate } from "@/features/recording-flow-mock/GuardNavigate";
import { PageSkeleton } from "@/features/recording-flow-mock/PageSkeleton";
import { useProject, useTakes } from "@/services";
import { redirectTarget } from "@/services/rules/lifecycle";

/* S6 — /projects/:id sends the user to where that project is (ia.md); an unknown id goes to My projects. */
export function ProjectRedirect() {
  const { t } = useTranslation();
  const { id } = useParams();
  const project = useProject(id);
  const takes = useTakes(id);
  if (!project.isFetchedAfterMount || !takes.data) return <PageSkeleton label={t("features.recordingFlowMock.page.loading")} />;
  if (!project.data) return <GuardNavigate to="/projects" />;
  const firstWithout = Math.min(takes.data.length + 1, Math.max(1, project.data.turnsTotal));
  return <Navigate to={redirectTarget(project.data.id, project.data.state, firstWithout)} replace />;
}
