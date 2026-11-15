import type { ComponentType } from "react";
import type { IconName } from "@/components/icons";
import { AUTH_STATES, AuthTemplate } from "./Auth";
import { CREDITS_STATES, CreditsTemplate } from "./Credits";
import { LANDING_STATES, LandingTemplate } from "./Landing";
import { PROJECTS_STATES, ProjectsTemplate } from "./Projects";
import { SETTINGS_STATES, SettingsTemplate } from "./Settings";
import { STATUS_STATES, StatusTemplate } from "./Status";

/* Reference templates (design-system/templates.md). Route: /styleguide/templates/<id>?state=<state>. */
export type TemplateId = "auth" | "projects" | "settings" | "credits" | "landing" | "status";
export type TemplateEntry = { id: TemplateId; archetype: string; icon: IconName; states: readonly string[]; Component: ComponentType; phase: 3 | 4 };

export const TEMPLATES: TemplateEntry[] = [
  { id: "auth", archetype: "Auth", icon: "user", states: AUTH_STATES, Component: AuthTemplate, phase: 3 },
  { id: "projects", archetype: "Projects (list)", icon: "projects", states: PROJECTS_STATES, Component: ProjectsTemplate, phase: 3 },
  { id: "settings", archetype: "Settings", icon: "settings", states: SETTINGS_STATES, Component: SettingsTemplate, phase: 3 },
  { id: "credits", archetype: "Credits", icon: "credits", states: CREDITS_STATES, Component: CreditsTemplate, phase: 3 },
  { id: "landing", archetype: "Landing", icon: "globe", states: LANDING_STATES, Component: LandingTemplate, phase: 3 },
  { id: "status", archetype: "Status (404 / error / offline)", icon: "info", states: STATUS_STATES, Component: StatusTemplate, phase: 3 },
];
