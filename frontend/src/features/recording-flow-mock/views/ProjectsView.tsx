import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Container, Stack } from "@/components/layout";
import { formatTime } from "@/components/media";
import {
  Alert, Button, Card, Dialog, EmptyState, List, ListItem, Menu, PageHeader, Skeleton, SkeletonText, Tag, Text, TextField, type TagTone,
} from "@/components/ui";
import s from "./projects.module.css";

export type ProjectState = "draft" | "queued" | "preparing" | "recording" | "assembling" | "done" | "no-dialogue" | "failed";
export type ProjectItem = {
  id: string;
  name: string;
  state: ProjectState;
  seconds: number;
  turns?: { done: number; total: number };
  stage?: { n: number; of: number };
  /** a done project whose next version is assembling: "Ready" + "Assembling a new version" */
  newVersion?: boolean;
  changedMinutes: number;
  /**
   * The row's thumbnail: the first frame of the project's own section. `src` is the project's video (undefined while it
   * is still loading → skeleton; null → none, icon), `at` is the section start in seconds.
   */
  frame?: { src: string | null | undefined; at: number };
};
export type ProjectsViewState = "default" | "loading" | "empty" | "error" | "slots-full";

export type ProjectsViewProps = {
  state: ProjectsViewState;
  projects: ProjectItem[];
  slotsTotal: number;
  /** where a row opens (the page maps the project state to a route; ia.md, /projects/:id redirect) */
  hrefOf: (p: ProjectItem) => string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  /** what cancelling a queued/preparing project costs right now (reported by the service; the dialog shows it live) */
  cancelInfo: (p: ProjectItem) => { stepsDone: number; charge: number; reserved: number };
  /** prototype/review aid: open the delete dialog of this project on arrival */
  initialDeleteId?: string;
  onNewDub: () => void;
  onBuyCredits: () => void;
  onRetry: () => void;
};

const TONE: Record<ProjectState, TagTone> = {
  draft: "neutral", queued: "neutral", preparing: "accent", recording: "accent", assembling: "accent",
  done: "success", "no-dialogue": "neutral", failed: "danger",
};

const P = "features.recordingFlowMock.projects" as const;

/* Presentational: the page container supplies the shell (AppShell, credits in the top bar) and the data. */
export function ProjectsView(props: ProjectsViewProps) {
  const { t } = useTranslation();
  const { state, projects, slotsTotal } = props;
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [renaming, setRenaming] = useState<ProjectItem | null>(null);
  const [deleting, setDeleting] = useState<ProjectItem | null>(() => projects.find((p) => p.id === props.initialDeleteId) ?? null);
  const [name, setName] = useState("");
  const ready = state !== "loading" && state !== "error";
  const list = state === "empty" ? [] : [...projects].sort((a, b) => (sort === "recent" ? a.changedMinutes - b.changedMinutes : a.name.localeCompare(b.name)));

  return (
    <Container width="narrow">
      <Stack gap={24}>
        <PageHeader
          title={t(`${P}.title`)}
          description={ready && list.length > 0 ? t(`${P}.slots`, { used: list.length, total: slotsTotal }) : undefined}
          actions={ready && list.length > 1 ? (
            <Menu
              label={t(`${P}.sortLabel`)}
              trigger={(p) => (
                <Button variant="secondary" size="md" icon={<Icon name="history" />} iconRight={<Icon name="expand" />} {...p}>
                  {sort === "recent" ? t(`${P}.sortRecent`) : t(`${P}.sortName`)}
                </Button>
              )}
              items={[
                { id: "recent", label: t(`${P}.sortRecent`), icon: sort === "recent" ? <Icon name="check" /> : <span />, onSelect: () => setSort("recent") },
                { id: "name", label: t(`${P}.sortName`), icon: sort === "name" ? <Icon name="check" /> : <span />, onSelect: () => setSort("name") },
              ]}
            />
          ) : undefined}
        />
        {state === "slots-full" && (
          <Alert
            tone="warning"
            title={t(`${P}.fullTitle`)}
            action={<Button size="sm" variant="secondary" onClick={props.onBuyCredits}>{t(`${P}.buy`)}</Button>}
          >
            {t(`${P}.fullText`)}
          </Alert>
        )}
        <Card padding="none" aria-busy={state === "loading" || undefined}>
          {state === "loading" ? (
            <List label={t(`${P}.loading`)}>
              {[0, 1, 2].map((i) => (
                <ListItem key={i} leading={<span className={s.frame} />} title={<SkeletonText width={[160, 120, 190][i]} />} subtitle={<SkeletonText size="sm" width={[220, 180, 240][i]} />} />
              ))}
            </List>
          ) : state === "error" ? (
            <EmptyState icon="error" tone="danger" title={t(`${P}.errorTitle`)} description={t(`${P}.errorText`)}
              actions={<Button variant="secondary" icon={<Icon name="retry" />} onClick={props.onRetry}>{t(`${P}.retry`)}</Button>} />
          ) : list.length === 0 ? (
            <EmptyState icon="scene" tone="info" title={t(`${P}.emptyTitle`)} description={t(`${P}.emptyText`)}
              actions={<Button icon={<Icon name="add" />} onClick={props.onNewDub} data-testid="projects-empty-new">{t(`${P}.newDub`)}</Button>} />
          ) : (
            <List label={t(`${P}.title`)} data-testid="projects-list">
              {list.map((p) => (
                <Row key={p.id} p={p} to={props.hrefOf(p)} onRename={() => { setName(p.name); setRenaming(p); }} onDelete={() => setDeleting(p)} />
              ))}
            </List>
          )}
        </Card>
      </Stack>

      <Dialog
        open={renaming !== null}
        onClose={() => setRenaming(null)}
        title={t(`${P}.renameTitle`)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRenaming(null)}>{t(`${P}.cancel`)}</Button>
            <Button
              disabled={!name.trim()}
              onClick={() => {
                if (renaming) props.onRename(renaming.id, name.trim());
                setRenaming(null);
              }}
            >
              {t(`${P}.save`)}
            </Button>
          </>
        }
      >
        <TextField label={t(`${P}.name`)} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Dialog>

      {/* Queued / Preparing: Delete is the Processing cancel dialog with the live charge (owner, round 1) */}
      <CancelDialog p={deleting && isRunning(deleting) ? deleting : null} info={props.cancelInfo} onClose={() => setDeleting(null)} onConfirm={(id) => { props.onDelete(id); setDeleting(null); }} />

      <Dialog
        open={deleting !== null && !isRunning(deleting)}
        role="alertdialog"
        onClose={() => setDeleting(null)}
        title={t(`${P}.deleteTitle`, { name: deleting?.name ?? "" })}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>{t(`${P}.cancel`)}</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleting) props.onDelete(deleting.id);
                setDeleting(null);
              }}
            >
              {t(`${P}.delete`)}
            </Button>
          </>
        }
      >
        <p className={s.dialogText}>{t(`${P}.deleteText`)}</p>
      </Dialog>
    </Container>
  );
}

const isRunning = (p: ProjectItem) => p.state === "queued" || p.state === "preparing";

function CancelDialog({ p, info, onClose, onConfirm }: { p: ProjectItem | null; info: ProjectsViewProps["cancelInfo"]; onClose: () => void; onConfirm: (id: string) => void }) {
  const { t } = useTranslation();
  const c = p ? info(p) : { stepsDone: 0, charge: 0, reserved: 0 };
  return (
    <Dialog
      open={p !== null}
      role="alertdialog"
      onClose={onClose}
      data-testid="projects-cancel-dialog"
      title={t("processing.dialog.title", { name: p?.name ?? "" })}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>{t("processing.dialog.keep")}</Button>
          <Button variant="destructive" onClick={() => p && onConfirm(p.id)}>{t("processing.cancel")}</Button>
        </>
      }
    >
      <Stack gap={8}>
        {c.charge > 0 ? (
          <>
            <Text tone="strong" medium tabular>{`${t("processing.dialog.done", { count: c.stepsDone })} — ${t("processing.dialog.charged", { count: c.charge })}`}</Text>
            <Text tabular>{`${t("processing.dialog.back", { count: c.reserved - c.charge })} ${t("processing.dialog.removed")}`}</Text>
          </>
        ) : (
          <>
            <Text tone="strong" medium>{p?.state === "queued" ? t("processing.dialog.notStarted") : t("processing.dialog.noneDone")}</Text>
            <Text tabular>{`${t("processing.dialog.allBack", { count: c.reserved })} ${t("processing.dialog.removed")}`}</Text>
          </>
        )}
      </Stack>
    </Dialog>
  );
}

function Row({ p, to, onRename, onDelete }: { p: ProjectItem; to: string; onRename: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const [frameReady, setFrameReady] = useState(false);
  const m = p.changedMinutes;
  const ago = m < 60 ? t(`${P}.minutesAgo`, { count: m })
    : m < 60 * 24 ? t(`${P}.hoursAgo`, { count: Math.round(m / 60) })
    : t(`${P}.daysAgo`, { count: Math.round(m / (60 * 24)) });
  const detail =
    p.state === "recording" && p.turns ? t(`${P}.turnsDone`, { done: p.turns.done, total: p.turns.total })
    : p.state === "preparing" && p.stage ? t(`${P}.stepOf`, { n: p.stage.n, total: p.stage.of })
    : p.state === "queued" || p.state === "assembling" || p.state === "failed" || p.state === "no-dialogue" || p.newVersion ? null
    : formatTime(p.seconds);
  const noFrame = p.state === "no-dialogue" || p.state === "failed" || p.frame?.src === null;
  const frameSrc = p.frame?.src ? `${p.frame.src}#t=${p.frame.at.toFixed(2)}` : null;
  return (
    <ListItem
      data-testid="project-card"
      to={to}
      leading={
        <span className={s.frame}>
          {noFrame ? <Icon name="scene" /> : (
            <>
              {frameSrc && <video src={frameSrc} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onLoadedData={() => setFrameReady(true)} />}
              {(!frameSrc || !frameReady) && <Skeleton className={s.shimmer} radius="0" />}
            </>
          )}
        </span>
      }
      title={p.name}
      subtitle={
        <>
          <Tag size="sm" tone={TONE[p.state]} dot={p.state === "preparing" || p.state === "assembling"} data-testid="project-state">
            {t(`${P}.state.${p.state}`)}
          </Tag>
          {p.newVersion && <Tag size="sm" tone="accent" dot data-testid="project-new-version">{t(`${P}.newVersion`)}</Tag>}
          {detail && <span>{detail}</span>}
          {detail && <span aria-hidden="true">·</span>}
          <span>{ago}</span>
        </>
      }
      actions={
        <Menu
          label={t(`${P}.actions`, { name: p.name })}
          trigger={(props) => <Button variant="ghost" size="md" icon={<Icon name="more" />} aria-label={t(`${P}.actions`, { name: p.name })} {...props} />}
          items={[
            { id: "rename", label: t(`${P}.rename`), icon: <Icon name="edit" />, onSelect: onRename },
            { id: "sep", separator: true },
            { id: "delete", label: t(`${P}.delete`), icon: <Icon name="delete" />, tone: "danger", onSelect: onDelete },
          ]}
        />
      }
    />
  );
}
