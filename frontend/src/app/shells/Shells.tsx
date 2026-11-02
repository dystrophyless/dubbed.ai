import { useCallback, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { Container } from "@/components/layout";
import { Avatar, Button, ProfileMenu, Toaster } from "@/components/ui";
import { useAnchoredPosition, useDismiss } from "@/components/ui/kit/usePopover";
import { LanguageSwitch } from "./LanguageSwitch";
import s from "./shells.module.css";

export type NavItem = { to: string; label: string; icon: IconName };
export type ShellUser = { name: string; email: string };

function Brand() {
  return (
    <Link to="/" className={s.brand} aria-label="Dubbed">
      <span className={s.brandMark} aria-hidden="true"><span className={s.brandDot} /></span>
      <span>Dubbed</span>
    </Link>
  );
}

function Account({ user, onSignOut }: { user: ShellUser; onSignOut?: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const pos = useAnchoredPosition(anchor, pop, open, "bottom-end", 6);
  const close = useCallback(() => setOpen(false), []);
  const refs = useMemo(() => [anchor, pop] as RefObject<HTMLElement | null>[], []);
  useDismiss(open, close, refs, anchor);
  return (
    <>
      <button ref={anchor} type="button" className={s.avatarButton} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Avatar name={user.name} size={32} decorative />
        <span className="sr-only">{t("shell.account")}</span>
      </button>
      {open &&
        createPortal(
          <div ref={pop} className={s.accountPopover} role="dialog" aria-label={t("shell.account")} style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" }}>
            <ProfileMenu
              name={user.name}
              email={user.email}
              avatar={<Avatar name={user.name} size={32} />}
              items={[
                { id: "settings", label: t("shell.settings"), icon: <Icon name="settings" />, onSelect: close },
                { id: "credits", label: t("shell.credits"), icon: <Icon name="credits" />, onSelect: close },
                { id: "signout", label: t("shell.signOut"), icon: <Icon name="signOut" />, onSelect: () => { close(); onSignOut?.(); } },
              ]}
            />
          </div>,
          document.body,
        )}
    </>
  );
}

/*
 * AppShell — every ordinary page. Desktop: brand · navigation (tray) · spacer · credits · EN/RU · account.
 * Phone (< 1024px): brand · credits · menu button; the menu opens a sheet with the navigation, language and account.
 */
export function AppShell({ nav, credits, user, children }: { nav: NavItem[]; credits: number; user: ShellUser; children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const [sheet, setSheet] = useState(false);
  const fmt = new Intl.NumberFormat(i18n.resolvedLanguage);
  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <Container>
          <div className={s.topbarInner}>
            <Brand />
            <nav className={`${s.nav} ${s.desktopOnly}`} aria-label={t("shell.mainNav")}>
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} className={s.navLink} end>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <span className={s.spacer} />
            <Link to="#credits" className={s.credits} aria-label={t("shell.creditsBalance", { count: credits })}>
              <Icon name="credits" />
              {fmt.format(credits)}
            </Link>
            <span className={s.desktopOnly}><LanguageSwitch /></span>
            <span className={s.desktopOnly}><Account user={user} /></span>
            <span className={s.phoneOnly}>
              <Button
                variant="ghost"
                size="lg"
                icon={<Icon name={sheet ? "close" : "menu"} />}
                aria-label={sheet ? t("shell.closeMenu") : t("shell.openMenu")}
                aria-expanded={sheet}
                aria-controls="shell-sheet"
                onClick={() => setSheet((v) => !v)}
              />
            </span>
          </div>
        </Container>
        {sheet && (
          <nav id="shell-sheet" className={`${s.sheet} ${s.phoneOnly}`} aria-label={t("shell.mainNav")}>
            {nav.map((n) => (
              <NavLink key={n.to} to={n.to} className={s.sheetLink} end onClick={() => setSheet(false)}>
                <Icon name={n.icon} />
                {n.label}
              </NavLink>
            ))}
            <div className={s.sheetFoot}>
              <LanguageSwitch />
              <Avatar name={user.name} size={32} />
            </div>
          </nav>
        )}
      </header>
      <main className={s.main} id="main">
        {children}
      </main>
      <Toaster />
    </div>
  );
}

/*
 * FocusedShell — pages that need the whole screen for one task (the recording studio). No global navigation:
 * only Exit (left), the page title (centre) and an optional right slot. Exit may be intercepted by the page
 * (e.g. the unaccepted-take dialog) through onExit.
 */
export function FocusedShell({ title, onExit, right, children }: { title: ReactNode; onExit: () => void; right?: ReactNode; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className={s.focused}>
      <Container width="content">
        <div className={s.focusedBar}>
          <div>
            <Button variant="ghost" size="lg" icon={<Icon name="exit" />} onClick={onExit}>{t("shell.exit")}</Button>
          </div>
          <div className={s.focusedTitle}>{title}</div>
          <div className={s.focusedRight}>{right}</div>
        </div>
      </Container>
      <main className={s.focusedMain} id="main">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
