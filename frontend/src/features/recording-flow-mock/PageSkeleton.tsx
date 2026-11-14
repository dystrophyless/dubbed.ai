import { Container, Stack } from "@/components/layout";
import { Card, CardBody, Skeleton, SkeletonText } from "@/components/ui";
import s from "./PageSkeleton.module.css";

/** The page the skeleton stands in for: its column width and stage shape (2.35:1) follow that page. */
export type PageWidth = "narrow" | "stage" | "result";

/** Container + column of the routed page `width` (shared by the skeleton and the load error). */
export function PageFrame({ width, children }: { width: PageWidth; children: React.ReactNode }) {
  if (width === "narrow") return <Container width="narrow">{children}</Container>;
  return (
    <Container className={width === "result" ? s.result : s.stage}>
      <div className={s.column}>{children}</div>
    </Container>
  );
}

/* Loading state of a routed page in the shape of its card (no spinner page): title, the stage, a line of status. */
export function PageSkeleton({ label, width = "narrow" }: { label: string; width?: PageWidth }) {
  return (
    <PageFrame width={width}>
      <div role="status" aria-busy="true" aria-label={label} data-testid="page-skeleton">
        <Stack gap={24}>
          <SkeletonText size="lg" width="40%" />
          <Card padding="none">
            <div className={s.picture}><Skeleton height="100%" radius="0" /></div>
            <CardBody>
              <Stack gap={12}>
                <SkeletonText width="70%" />
                <SkeletonText width="40%" />
              </Stack>
            </CardBody>
          </Card>
        </Stack>
      </div>
    </PageFrame>
  );
}
