import type { Project } from "../contracts";

/** Identity of what the draft's section refers to: the project plus its uploaded source (a replacement keeps the id). */
export const draftSourceKey = (draft: Pick<Project, "id" | "video">): string => `${draft.id}:${draft.video.sourceId ?? ""}`;
