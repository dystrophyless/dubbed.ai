import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { ReadyWatcher } from "@/features/processing/ReadyWatcher";
import { toast } from "@/components/ui";
import { useAccount } from "@/services";

/*
 * The ordinary shell of the real product routes (ui-spec §1): top navigation, language, account, and the live balance
 * from the services layer (`['account']`) instead of a demo constant. The look is the approved AppShell.
 */
export function ProductShell() {
  const { t } = useTranslation();
  const account = useAccount();
  return (
    <AppShell
      credits={account.data?.balance ?? 0}
      hideCredits={!account.data}
      user={{ name: "Alex Morgan", email: "alex@example.com" }}
      onSignOut={() => toast({ tone: "info", title: t("tpl.common.signedOut") })}
      nav={[
        { to: "/projects", label: t("tpl.nav.projects"), icon: "projects" },
        { to: "/new", label: t("tpl.nav.newDub"), icon: "add" },
      ]}
    >
      <ReadyWatcher />
      <Outlet />
    </AppShell>
  );
}
