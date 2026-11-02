import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useViewState } from "@/components/dev/view-state";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { formatTime } from "@/components/media";
import {
  Alert, Button, Card, Dialog, EmptyState, List, ListItem, Menu, PageHeader, SkeletonText, Tag, TextField, toast, type TagTone,
} from "@/components/ui";
import { DEMO_PROJECTS, type DemoProject, type ProjectState } from "./mocks";
import { InAppShell } from "./TemplateFrame";
import s from "./templates.module.css";

export const PROJECTS_STATES = ["default", "loading", "empty", "error", "slots-full"] as const;

const TONE: Record<ProjectState, TagTone> = {
  draft: "neutral", queued: "neutral", preparing: "accent", recording: "accent", assembling: "accent",
  done: "success", "no-dialogue": "neutral", failed: "danger",
};

/*
 * Projects (list) — /styleguide/templates/projects. "My projects", the home after sign-in (ia.md).
 * One panel with a row per project (Clean row language): a small 16:9 frame · name · state, progress and when ·
 * the whole row opens the project · "⋯" (Rename, Delete). A user has 2–10 projects, so a list beats a poster gallery.
 * No page-level "New dub" button — it is already in the top bar (no duplicated actions).
 */
export function ProjectsTemplate() {
  const { t } = useTranslation();
  const state = useViewState(PROJECTS_STATES);
  const full = state === "slots-full";
  const [items, setItems] = useState<DemoProject[]>(full ? DEMO_PROJECTS.slice(0, 2) : DEMO_PROJECTS);
  const [renaming, setRenaming] = useState<DemoProject | null>(null);
  const [deleting, setDeleting] = useState<DemoProject | null>(null);
  const [name, setName] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const slots = full ? 2 : 10;
  // most recently changed first by default (owner 2026-11-03); or A–Z
  const list = state === "empty" ? [] : [...items].sort((a, b) => (sort === "recent" ? a.changed - b.changed : a.name.localeCompare(b.name)));
  const ready = state !== "loading" && state !== "error";

  return (
    <InAppShell states={PROJECTS_STATES} credits={full ? 14 : 1046}>
      <Container width="narrow">
        <Stack gap={24}>
          <PageHeader
            title={t("tpl.projects.title")}
            description={ready && list.length > 0 ? t("tpl.projects.slots", { used: list.length, total: slots }) : undefined}
            actions={ready && list.length > 1 ? (
              <Menu
                label={t("tpl.projects.sortLabel")}
                trigger={(p) => (
                  <Button variant="secondary" size="md" icon={<Icon name="history" />} iconRight={<Icon name="expand" />} {...p}>
                    {sort === "recent" ? t("tpl.projects.sortRecent") : t("tpl.projects.sortName")}
                  </Button>
                )}
                items={[
                  { id: "recent", label: t("tpl.projects.sortRecent"), icon: sort === "recent" ? <Icon name="check" /> : <span />, onSelect: () => setSort("recent") },
                  { id: "name", label: t("tpl.projects.sortName"), icon: sort === "name" ? <Icon name="check" /> : <span />, onSelect: () => setSort("name") },
                ]}
              />
            ) : undefined}
          />
          {full && (
            <Alert
              tone="warning"
              title={t("tpl.projects.fullTitle")}
              action={<Button size="sm" variant="secondary" onClick={() => toast({ tone: "info", title: t("tpl.projects.toCredits") })}>{t("tpl.projects.buy")}</Button>}
            >
              {t("tpl.projects.fullText")}
            </Alert>
          )}
          <Card padding="none" aria-busy={state === "loading" || undefined}>
            {state === "loading" ? (
              <List label={t("tpl.projects.loading")}>
                {[0, 1, 2].map((i) => (
                  <ListItem key={i} leading={<span className={s.frame} />} title={<SkeletonText width={[160, 120, 190][i]} />} subtitle={<SkeletonText size="sm" width={[220, 180, 240][i]} />} />
                ))}
              </List>
            ) : state === "error" ? (
              <EmptyState icon="error" tone="danger" title={t("tpl.projects.errorTitle")} description={t("tpl.projects.errorText")}
                actions={<Button variant="secondary" icon={<Icon name="retry" />} onClick={() => toast({ tone: "info", title: t("kit.retry") })}>{t("kit.retry")}</Button>} />
            ) : list.length === 0 ? (
              <EmptyState icon="scene" tone="info" title={t("tpl.projects.emptyTitle")} description={t("tpl.projects.emptyText")}
                actions={<Button icon={<Icon name="add" />} onClick={() => toast({ tone: "info", title: t("tpl.nav.newDub") })}>{t("tpl.nav.newDub")}</Button>} />
            ) : (
              <List label={t("tpl.projects.title")} data-testid="projects-list">
                {list.map((p) => (
                  <ProjectRow key={p.id} p={p} onRename={() => { setName(p.name); setRenaming(p); }} onDelete={() => setDeleting(p)} />
                ))}
              </List>
            )}
          </Card>
        </Stack>
      </Container>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={t("tpl.projects.renameTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>{t("sg.buttons.cancel")}</Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                setItems((l) => l.map((x) => (x.id === renaming?.id ? { ...x, name: name.trim() } : x)));
                setRenaming(null);
                toast({ title: t("tpl.projects.renamed") });
              }}
            >
              {t("tpl.projects.save")}
            </Button>
          </>
        }
      >
        <TextField label={t("tpl.projects.name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Dialog>

      <Dialog
        open={deleting !== null}
        role="alertdialog"
        onClose={() => setDeleting(null)}
        title={t("tpl.projects.deleteTitle", { name: deleting?.name ?? "" })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>{t("sg.buttons.cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                setItems((l) => l.filter((x) => x.id !== deleting?.id));
                setDeleting(null);
                toast({ title: t("tpl.projects.deleted") });
              }}
            >
              {t("tpl.projects.delete")}
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>{t("tpl.projects.deleteText")}</p>
      </Dialog>
    </InAppShell>
  );
}

function ProjectRow({ p, onRename, onDelete }: { p: DemoProject; onRename: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const ago = p.changed < 60 ? t("tpl.projects.minutesAgo", { count: p.changed })
    : p.changed < 60 * 24 ? t("tpl.projects.hoursAgo", { count: Math.round(p.changed / 60) })
    : t("tpl.projects.daysAgo", { count: Math.round(p.changed / (60 * 24)) });
  const detail =
    p.state === "recording" && p.turns ? t("tpl.projects.turnsDone", { done: p.turns.done, total: p.turns.total })
    : p.state === "preparing" && p.stage ? t("tpl.projects.stepOf", { n: p.stage.n, total: p.stage.of })
    : formatTime(p.seconds);
  return (
    <ListItem
      data-testid="project-card"
      onClick={() => toast({ tone: "info", title: p.name, description: t("tpl.projects.opensLater") })}
      leading={
        <span className={s.frame}>
          {p.state === "no-dialogue" || p.state === "failed" ? <Icon name="scene" /> : (
            <video src="/media/scene.mp4#t=1.2" muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} />
          )}
        </span>
      }
      title={p.name}
      subtitle={
        <>
          <Tag size="sm" tone={TONE[p.state]} dot={p.state === "preparing" || p.state === "assembling"}>{t(`tpl.projects.state.${p.state}`)}</Tag>
          <span>{detail}</span>
          <span aria-hidden="true">·</span>
          <span>{ago}</span>
        </>
      }
      actions={
        <Menu
          label={t("tpl.projects.actions", { name: p.name })}
          trigger={(props) => <Button variant="ghost" size="md" icon={<Icon name="more" />} aria-label={t("tpl.projects.actions", { name: p.name })} {...props} />}
          items={[
            { id: "rename", label: t("tpl.projects.rename"), icon: <Icon name="edit" />, onSelect: onRename },
            { id: "sep", separator: true },
            { id: "delete", label: t("tpl.projects.delete"), icon: <Icon name="delete" />, tone: "danger", onSelect: onDelete },
          ]}
        />
      }
    />
  );
}
