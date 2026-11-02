import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AppShell, type ShellLinks } from "@/app/shells/Shells";
import { StateSwitcher } from "@/components/dev/StateSwitcher";
import { toast } from "@/components/ui";
import { DEMO_USER } from "./mocks";

/** Shell links inside the styleguide point at the reference templates, so every control goes somewhere real. */
export const TEMPLATE_LINKS: ShellLinks = {
  home: "/styleguide/templates/projects",
  credits: "/styleguide/templates/credits",
  settings: "/styleguide/templates/settings",
};

/** A reference template in the ordinary shell + the floating ?state= switcher (review aid, never in real pages). */
export function InAppShell({ states, credits = 120, hideCredits, children }: { states: readonly string[]; credits?: number; hideCredits?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <>
      <AppShell
        credits={credits}
        hideCredits={hideCredits}
        user={DEMO_USER}
        links={TEMPLATE_LINKS}
        onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
        nav={[
          { to: "/styleguide/templates/projects", label: t("tpl.nav.projects"), icon: "projects" },
          { to: "/styleguide/templates/new-dub", label: t("tpl.nav.newDub"), icon: "add" },
        ]}
      >
        {children}
      </AppShell>
      <StateSwitcher states={states} />
    </>
  );
}
