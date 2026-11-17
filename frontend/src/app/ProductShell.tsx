import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router";
import { Button, toast, useToasts } from "@/components/ui";
import { AppShell } from "@/app/shells/Shells";
import { ReadyWatcher } from "@/features/processing/ReadyWatcher";
import { markOwnSignOut, useAccount, useServices, useSession } from "@/services";

/*
 * The ordinary shell of the real product routes (ui-spec §1): top navigation, language, account, and the live balance
 * from the services layer (`['account']`) instead of a demo constant. The look is the approved AppShell.
 */
export function ProductShell() {
  const { t } = useTranslation();
  const account = useAccount();
  const { pathname } = useLocation();
  const session = useSession().data;
  const { auth, adapter } = useServices();
  // the email is the name; a Google name goes first with the email beneath (ui-spec S8)
  const user = { name: session?.googleName ?? session?.email ?? "", email: session?.email ?? "" };
  /* a rejected sign-out keeps the user signed in: say so, and offer to repeat it (the toast's own action) */
  const signOut = () => {
    /* on the mock the account-switch reload (services/index.tsx) is the one navigation; another adapter navigates itself */
    markOwnSignOut(true);
    auth.signOut().then(
      () => { if (adapter !== "mock") window.location.replace("/sign-in"); },
      () => {
        markOwnSignOut(false);
        const id: number = toast({
          tone: "danger",
          title: t("features.auth.service.title"),
          description: t("features.auth.service.text"),
          action: <Button size="sm" variant="ghost" onClick={() => { useToasts.getState().dismiss(id); signOut(); }}>{t("kit.retry")}</Button>,
        });
      },
    );
  };
  return (
    <AppShell
      credits={account.data?.balance ?? 0}
      hideCredits={!account.data || pathname === "/credits"}
      user={user}
      onSignOut={signOut}
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
