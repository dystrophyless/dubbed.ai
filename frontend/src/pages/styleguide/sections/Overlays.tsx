import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import {
  Avatar, BackLink, Button, FilterMenu, Menu, NotificationStack, NumberTicker, Pagination, ProfileMenu, ProgressTracker, Tag,
  Text, TextLink, TipsPanel, Tooltip, toast, type Notice,
} from "@/components/ui";
import { Row, SgSection, Specimen } from "../Specimen";

export function Overlays() {
  const { t } = useTranslation();
  const [page, setPage] = useState(3);
  return (
    <SgSection id="overlays" title={t("sg.overlays.title")} description={t("sg.overlays.description")}>
      <Specimen title={t("sg.overlays.menu")} note={t("sg.overlays.menuNote")}>
        <Row>
          <Menu
            label={t("sg.overlays.projectActions")}
            trigger={(p) => <Button variant="secondary" icon={<Icon name="more" />} aria-label={t("sg.overlays.projectActions")} {...p} />}
            items={[
              { id: "open", label: t("sg.feedback.open"), icon: <Icon name="play" />, onSelect: () => toast({ tone: "info", title: t("sg.feedback.open") }) },
              { id: "rename", label: t("sg.overlays.rename"), icon: <Icon name="edit" />, onSelect: () => toast({ tone: "info", title: t("sg.overlays.rename") }) },
              { id: "download", label: t("sg.buttons.download"), icon: <Icon name="download" />, disabled: true, onSelect: () => {} },
              { id: "sep", separator: true },
              { id: "delete", label: t("sg.buttons.delete"), icon: <Icon name="delete" />, tone: "danger", onSelect: () => toast({ tone: "danger", title: t("sg.buttons.delete") }) },
            ]}
          />
          <Menu
            label={t("sg.overlays.sortBy")}
            placement="bottom-start"
            trigger={(p) => <Button variant="secondary" iconRight={<Icon name="expand" />} {...p}>{t("sg.overlays.sortBy")}</Button>}
            items={[
              { id: "recent", label: t("sg.fields.sortRecent"), onSelect: () => {} },
              { id: "name", label: t("sg.fields.sortName"), onSelect: () => {} },
            ]}
          />
        </Row>
      </Specimen>
      <Specimen title={t("sg.overlays.tooltip")} note={t("sg.overlays.tooltipNote")}>
        <Row>
          <Tooltip content={t("sg.overlays.tipHeadphones")}>
            <Button variant="secondary" icon={<Icon name="headphones" />} aria-label={t("sg.overlays.headphones")} />
          </Tooltip>
          <Tooltip content={t("sg.overlays.tipDownload")}>
            <Button variant="secondary" icon={<Icon name="download" />}>{t("sg.buttons.download")}</Button>
          </Tooltip>
        </Row>
      </Specimen>
      <Specimen title={t("sg.overlays.tags")}>
        <Row>
          <Tag>{t("sg.overlays.tagDraft")}</Tag>
          <Tag tone="accent" dot>{t("sg.overlays.tagProcessing")}</Tag>
          <Tag tone="success" icon={<Icon name="check" size={14} />}>{t("sg.overlays.tagReady")}</Tag>
          <Tag tone="warning">{t("sg.overlays.tagLow")}</Tag>
          <Tag tone="danger">{t("sg.overlays.tagFailed")}</Tag>
          <Tag tone="outline">720p</Tag>
          <Tag size="sm" overline>{t("sg.overlays.tagNew")}</Tag>
        </Row>
      </Specimen>
      <Specimen title={t("sg.overlays.avatarLinks")}>
        <Row>
          <Avatar name="Alex Morgan" size={24} />
          <Avatar name="Alex Morgan" size={32} />
          <Avatar name="Алина Соколова" size={40} />
        </Row>
        <Text>{t("sg.overlays.linkSentence")} <TextLink to="/styleguide#media">{t("sg.overlays.linkText")}</TextLink>.</Text>
        <div><BackLink to="/styleguide">{t("sg.overlays.back")}</BackLink></div>
      </Specimen>
      <Specimen title={t("sg.overlays.pagination")} note={t("sg.overlays.paginationNote")}>
        <Pagination page={page} total={12} onChange={setPage} />
        <Pagination page={page} total={12} onChange={setPage} compact />
      </Specimen>
    </SgSection>
  );
}

export function AffectComposites() {
  const { t, i18n } = useTranslation();
  const [credits, setCredits] = useState(120);
  const [notices, setNotices] = useState<Notice[]>(() => [
    { id: "1", badge: t("sg.overlays.tagNew"), title: t("sg.affect.n1Title"), text: t("sg.affect.n1Text"), pattern: "orbit", action: { label: t("sg.affect.n1Action"), onClick: () => {} } },
    { id: "2", title: t("sg.affect.n2Title"), text: t("sg.affect.n2Text"), pattern: "grid" },
  ]);
  return (
    <SgSection id="affect" title={t("sg.affect.title")} description={t("sg.affect.description")}>
      <Specimen title="progress-tracker" plain note={t("sg.affect.trackerNote")}>
        <ProgressTracker
          title={t("sg.affect.trackerTitle")}
          steps={[
            { id: "a", label: t("sg.affect.step1"), done: true },
            { id: "b", label: t("sg.affect.step2"), done: true },
            { id: "c", label: t("sg.affect.step3") },
            { id: "d", label: t("sg.affect.step4") },
          ]}
        />
      </Specimen>
      <Specimen title="notification-stack" plain>
        <NotificationStack
          notices={notices}
          onDismiss={(n) => setNotices((l) => l.filter((x) => x.id !== n.id))}
        />
        {notices.length === 0 && <Text tone="muted">{t("sg.affect.noNotices")}</Text>}
      </Specimen>
      <Specimen title="profile-menu" plain>
        <ProfileMenu
          name="Alex Morgan"
          email="alex@example.com"
          avatar={<Avatar name="Alex Morgan" size={32} />}
          setup={{ done: 2, total: 3, next: t("sg.affect.setupNext"), onContinue: () => {} }}
          items={[
            { id: "s", label: t("shell.settings"), icon: <Icon name="settings" />, onSelect: () => {} },
            { id: "c", label: t("shell.credits"), icon: <Icon name="credits" />, onSelect: () => {} },
            { id: "o", label: t("shell.signOut"), icon: <Icon name="signOut" />, onSelect: () => {} },
          ]}
        />
      </Specimen>
      <Specimen title="tips-panel" plain wide>
        <TipsPanel
          title={t("sg.affect.tipsTitle")}
          closeLabel={t("kit.close")}
          onClose={() => {}}
          tips={[
            { id: "1", title: t("sg.affect.tip1"), description: t("sg.affect.tip1Text"), action: t("sg.affect.tip1Action"), doneLabel: t("sg.affect.tipDone"), primary: true },
            { id: "2", title: t("sg.affect.tip2"), description: t("sg.affect.tip2Text"), action: t("sg.affect.tip2Action"), doneLabel: t("sg.affect.tipDone") },
            { id: "3", title: t("sg.affect.tip3"), description: t("sg.affect.tip3Text"), action: t("sg.affect.tip3Action"), doneLabel: t("sg.affect.tipDone") },
          ]}
        />
      </Specimen>
      <Specimen title="filter-menu" plain note={t("sg.affect.filterNote")}>
        <FilterMenu
          title={t("sg.affect.filters")}
          groups={[
            { id: "status", label: t("sg.affect.status"), options: [
              { id: "rec", label: t("sg.choices.inProgress") }, { id: "done", label: t("sg.choices.done") }, { id: "proc", label: t("sg.overlays.tagProcessing") },
            ] },
            { id: "len", label: t("sg.affect.length"), options: [{ id: "s", label: t("sg.affect.short") }, { id: "l", label: t("sg.affect.long") }] },
          ]}
          defaultValue={{ status: ["rec"] }}
        />
      </Specimen>
      <Specimen title="number-ticker" note={t("sg.affect.tickerNote")}>
        <Row>
          <span style={{ fontSize: "var(--text-h1)", lineHeight: "var(--leading-h1)", fontWeight: "var(--weight-medium)" }}>
            <NumberTicker value={credits} locale={i18n.resolvedLanguage} />
          </span>
          <Button size="sm" variant="secondary" onClick={() => setCredits((c) => Math.max(0, c - 13))}>−13</Button>
          <Button size="sm" variant="secondary" onClick={() => setCredits((c) => c + 300)}>+300</Button>
        </Row>
      </Specimen>
    </SgSection>
  );
}
