import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useNavigate } from "react-router";
import { Icon, type IconName } from "@/components/icons";
import { Container } from "@/components/layout";
import { Avatar, Button, ProfileMenu, Toaster, Tooltip } from "@/components/ui";
import { useAnchoredPosition, useDismiss } from "@/components/ui/kit/usePopover";
import { LanguageSwitch } from "./LanguageSwitch";
import s from "./shells.module.css";

export type NavItem = { to: string; label: string; icon: IconName };
export type ShellUser = { name: string; email: string };
/** Where the shell's own links go (real routes in the app; template routes in the styleguide). */
export type ShellLinks = { home: string; credits: string; settings: string };
const APP_LINKS: ShellLinks = { home: "/projects", credits: "/credits", settings: "/settings" };

export function Brand({ to }: { to: string }) {
  return (
    <Link to={to} className={s.brand} aria-label="Dubbed">
      <span className={s.brandMark} aria-hidden="true"><span className={s.brandDot} /></span>
      <span>Dubbed</span>
    </Link>
  );
}

function Account({ user, links, onSignOut }: { user: ShellUser; links: ShellLinks; onSignOut?: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
                { id: "settings", label: t("shell.settings"), icon: <Icon name="settings" />, onSelect: () => { close(); navigate(links.settings); } },
                { id: "credits", label: t("shell.credits"), icon: <Icon name="credits" />, onSelect: () => { close(); navigate(links.credits); } },
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
export function AppShell({
  nav, credits, user, children, links = APP_LINKS, onSignOut, hideCredits,
}: {
  nav: NavItem[]; credits: number; user: ShellUser; children: ReactNode; links?: ShellLinks; onSignOut?: () => void;
  /** the Credits page shows the balance itself — no duplicate in the bar */
  hideCredits?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [sheet, setSheet] = useState(false);
  const fmt = new Intl.NumberFormat(i18n.resolvedLanguage);
  return (
    <div className={s.shell}>
      <header className={s.topbar}>
        <Container>
          <div className={s.topbarInner}>
            <Brand to={links.home} />
            <nav className={`${s.nav} ${s.desktopOnly}`} aria-label={t("shell.mainNav")}>
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} className={s.navLink} end>
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <span className={s.spacer} />
            {!hideCredits && (
            <Link to={links.credits} className={s.credits}>
              <Icon name="credits" />
              {fmt.format(credits)}
              <span className="sr-only"> {t("shell.creditsUnit", { count: credits })}</span>
            </Link>
            )}
            <span className={s.desktopOnly}><LanguageSwitch /></span>
            <span className={s.desktopOnly}><Account user={user} links={links} onSignOut={onSignOut} /></span>
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
            <NavLink to={links.settings} className={s.sheetLink} end onClick={() => setSheet(false)}>
              <Icon name="settings" />
              {t("shell.settings")}
            </NavLink>
            <button type="button" className={s.sheetLink} onClick={() => { setSheet(false); onSignOut?.(); }}>
              <Icon name="signOut" />
              {t("shell.signOut")}
            </button>
            <div className={s.sheetFoot}>
              <LanguageSwitch />
              <span className={s.sheetUser}>
                <Avatar name={user.name} size={32} decorative />
                <span>{user.email}</span>
              </span>
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

/*
 * StudioShell — the focused shell's studio variant (studio-brief.md 11–12; the only screen in the focused shell).
 * One centred column with one side padding; its width follows the scene's picture. The only chrome is the header row
 * directly above the video and inside its width: ✕ Exit (left) · title with the progress, centred · `right` (volume).
 * Nothing sticks out past the column. The page below (video · line · track · actions) is the children.
 *
 * Height budget: --video-h is the viewport minus everything that must stay above the fold (header, line, track, action
 * row; plus an inline notice when `notice` is set), so the actions are visible at 1440 × 900 and 390 × 844 for a
 * landscape or a portrait clip. Children pass `var(--video-h)` to SceneColumn / VideoStage as their maxHeight.
 * Exit may be intercepted by the page (the unsaved-take dialog) — onExit decides.
 */
export function StudioShell({
  title, progress, onExit, exitLabel, right, ratio, notice, busy, children, "data-testid": testId,
}: {
  title: ReactNode; progress?: ReactNode; onExit: () => void; exitLabel: string; right?: ReactNode;
  /** the clip's aspect ratio (width / height) */
  ratio: number;
  /** an inline notice sits above the actions — the video gives up some height for it */
  notice?: boolean;
  /** aria-busy on the main region (loading) */
  busy?: boolean;
  children: ReactNode;
  "data-testid"?: string;
}) {
  return (
    <div className={s.studio} style={{ "--ratio": ratio } as CSSProperties} data-notice={notice || undefined} data-testid={testId}>
      <div className={s.studioColumn}>
        <header className={s.studioHead}>
          <Tooltip content={exitLabel}>
            <Button variant="ghost" size="lg" icon={<Icon name="close" />} aria-label={exitLabel} onClick={onExit} data-testid="studio-exit" />
          </Tooltip>
          <div className={s.studioTitle}>
            <h1 className={s.studioH1}>{title}</h1>
            {progress}
          </div>
          <div className={s.studioRight}>{right}</div>
        </header>
        <main className={s.studioMain} id="main" aria-busy={busy || undefined}>
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
