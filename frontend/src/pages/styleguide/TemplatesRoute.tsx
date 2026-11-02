import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";
import { LanguageSwitch } from "@/app/shells/LanguageSwitch";
import { Container, Stack } from "@/components/layout";
import { BackLink, Card, EmptyState, IconTile, PageHeader, Tag, Text } from "@/components/ui";
import { TEMPLATES } from "./templates/registry";
import t from "./templates/templates.module.css";

/* /styleguide/templates — index of the reference templates; /styleguide/templates/:id renders one. */
export function TemplatesRoute() {
  const { t: tr } = useTranslation();
  const { id } = useParams();
  const [params] = useSearchParams();
  const entry = TEMPLATES.find((x) => x.id === id);
  // remount on every ?state= change: templates seed their local demo state from the state they open in
  if (entry) return <entry.Component key={params.get("state") ?? "default"} />;

  return (
    <Container as="main">
      <Stack gap={24} data-testid="templates">
        <div style={{ paddingTop: "var(--space-8)" }}>
          <PageHeader
            eyebrow={<BackLink to="/styleguide">{tr("styleguide.title")}</BackLink>}
            title={tr("styleguide.templatesTitle")}
            description={tr("styleguide.templatesText")}
            actions={<LanguageSwitch />}
          />
        </div>
        {id ? (
          <Card><EmptyState title={tr("styleguide.templateNotFound", { id })} description={tr("styleguide.templatesLater")} /></Card>
        ) : (
          <div className={t.index}>
            {TEMPLATES.map((x) => (
              <Card key={x.id} interactive>
                <Link to={`/styleguide/templates/${x.id}`} className={t.indexLink}>
                  <span className={t.indexHead}>
                    <IconTile icon={x.icon} tone="accent" />
                    <Tag size="sm">{tr("styleguide.stateCount", { count: x.states.length })}</Tag>
                  </span>
                  <Text medium tone="strong">{tr(`tpl.index.${x.id}.name`)}</Text>
                  <Text size="sm" tone="text">{tr(`tpl.index.${x.id}.text`)}</Text>
                </Link>
              </Card>
            ))}
          </div>
        )}
      </Stack>
    </Container>
  );
}
