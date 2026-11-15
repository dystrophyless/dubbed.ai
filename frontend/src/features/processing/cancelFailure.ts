import type { TFunction } from "i18next";
import { toast } from "@/components/ui";
import type { ProjectId, Services } from "@/services";

/*
 * A cancel / delete the service refused. The project moved on while the dialog was open, so the page says what happened and
 * never announces a refund: "state" = preparation already finished, a vanished project = it changed, anything else = generic.
 */
export type Refusal = "finished" | "changed" | "generic";

export function refusalOf(error: string): Refusal {
  if (error === "state") return "finished";
  if (error === "not-found") return "changed";
  return "generic";
}

/**
 * Cancel refused with "state": "already finished" is true only when the project really is ready to record now; a failed or
 * no-dialogue project (or one that moved elsewhere) is just "changed".
 */
export async function refusalFor(services: Services, id: ProjectId, error: string): Promise<Refusal> {
  const kind = refusalOf(error);
  if (kind !== "finished") return kind;
  try {
    return (await services.projects.get(id))?.state === "recording" ? "finished" : "changed";
  } catch {
    return "changed";
  }
}

export function toastRefusal(t: TFunction, kind: Refusal) {
  if (kind === "finished") toast({ tone: "info", title: t("features.recordingFlowMock.page.alreadyFinished") });
  else if (kind === "changed") toast({ tone: "info", title: t("features.recordingFlowMock.page.changed") });
  else toast({ tone: "danger", title: t("features.recordingFlowMock.page.genericError") });
}
