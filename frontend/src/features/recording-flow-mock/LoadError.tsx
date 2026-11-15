import { useTranslation } from "react-i18next";
import { Button, EmptyState } from "@/components/ui";
import { PageFrame, type PageWidth } from "./PageSkeleton";

/* A routed page whose data could not be loaded: the approved error EmptyState with a retry (no dead end). */
export function LoadError({ onRetry, width = "narrow" }: { onRetry: () => void; width?: PageWidth }) {
  const { t } = useTranslation();
  return (
    <PageFrame width={width}>
      <EmptyState
        icon="warning"
        tone="danger"
        title={t("features.recordingFlowMock.page.loadErrorTitle")}
        description={t("features.recordingFlowMock.page.loadErrorText")}
        actions={<Button variant="secondary" onClick={onRetry} data-testid="page-retry">{t("features.recordingFlowMock.page.retry")}</Button>}
      />
    </PageFrame>
  );
}
