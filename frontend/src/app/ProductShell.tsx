import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { AppShell } from "@/app/shells/Shells";
import { ReadyWatcher } from "@/features/processing/ReadyWatcher";
import { useAccount, useServices, useSession } from "@/services";

/*
 * The ordinary shell of the real product routes (ui-spec §1): top navigation, language, account, and the live balance
 * from the services layer (`['account']`) instead of a demo constant. The look is the approved AppShell.
 */
export function ProductShell() {
  const { t } = useTranslation();
  const account = useAccount();
  const { pathname } = useLocation();
  const session = useSession().data;
  const { auth } = useServices();
  // the email is the name; a Google name goes first with the email beneath (ui-spec S8)
  const user = { name: session?.googleName ?? session?.email ?? "", email: session?.email ?? "" };
  return (
    <AppShell
      credits={account.data?.balance ?? 0}
      hideCredits={!account.data || pathname === "/credits"}
      user={user}
      onSignOut={() => { void auth.signOut().then(() => window.location.replace("/sign-in")); }}
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
