import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icons";
import { Stack } from "@/components/layout";
import {
  Alert, Button, Card, CardBody, CardFooter, CardHeader, Dialog, EmptyState, ProgressBar, ShimmerText, Skeleton, Spinner,
  StepProgress, Text, ThinkingLoader, toast,
} from "@/components/ui";
import { Row, SgSection, Specimen } from "../Specimen";

export function Feedback() {
  const { t } = useTranslation();
  const [dialog, setDialog] = useState<"none" | "plain" | "danger">("none");
  const [deleting, setDeleting] = useState(false);
  const [progress, setProgress] = useState(42);
  const [step, setStep] = useState(2);
  return (
    <SgSection id="feedback" title={t("sg.feedback.title")} description={t("sg.feedback.description")}>
      <Specimen title={t("sg.feedback.alerts")} wide>
        <Stack gap={8}>
          <Alert tone="info" title={t("sg.feedback.infoTitle")}>{t("sg.feedback.infoText")}</Alert>
          <Alert tone="success" title={t("sg.feedback.successTitle")} />
          <Alert tone="warning" title={t("sg.feedback.warningTitle")} action={<Button size="sm" variant="secondary">{t("sg.feedback.buy")}</Button>}>
            {t("sg.feedback.warningText")}
          </Alert>
          <Alert tone="danger" title={t("sg.feedback.dangerTitle")} action={<Button size="sm" variant="secondary" icon={<Icon name="retry" size={14} />}>{t("kit.retry")}</Button>}>
            {t("sg.feedback.dangerText")}
          </Alert>
        </Stack>
      </Specimen>
      <Specimen title={t("sg.feedback.toasts")} note={t("sg.feedback.toastsNote")}>
        <Row>
          <Button variant="secondary" onClick={() => toast({ title: t("sg.feedback.toastSaved") })}>{t("sg.feedback.toastSuccess")}</Button>
          <Button variant="secondary" onClick={() => toast({ tone: "danger", title: t("sg.feedback.toastFailed"), description: t("sg.feedback.toastFailedText") })}>{t("sg.feedback.toastError")}</Button>
          <Button
            variant="secondary"
            onClick={() => toast({ tone: "info", title: t("sg.feedback.toastDeleted"), action: <Button size="sm" variant="ghost">{t("sg.feedback.undo")}</Button> })}
          >
            {t("sg.feedback.toastUndo")}
          </Button>
        </Row>
      </Specimen>
      <Specimen title={t("sg.feedback.dialogs")} note={t("sg.feedback.dialogsNote")}>
        <Row>
          <Button variant="secondary" onClick={() => setDialog("plain")}>{t("sg.feedback.openDialog")}</Button>
          <Button variant="destructive" icon={<Icon name="delete" />} onClick={() => setDialog("danger")}>{t("sg.feedback.deleteProject")}</Button>
        </Row>
        <Dialog
          open={dialog === "plain"}
          onClose={() => setDialog("none")}
          title={t("sg.feedback.leaveTitle")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog("none")}>{t("sg.feedback.stay")}</Button>
              <Button variant="secondary" onClick={() => setDialog("none")}>{t("sg.feedback.leaveNoSave")}</Button>
              <Button onClick={() => setDialog("none")}>{t("sg.feedback.saveLeave")}</Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{t("sg.feedback.leaveText")}</p>
        </Dialog>
        <Dialog
          open={dialog === "danger"}
          role="alertdialog"
          onClose={() => setDialog("none")}
          title={t("sg.feedback.deleteTitle")}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialog("none")}>{t("sg.buttons.cancel")}</Button>
              <Button
                variant="destructive"
                loading={deleting}
                onClick={() => {
                  setDeleting(true);
                  window.setTimeout(() => { setDeleting(false); setDialog("none"); toast({ title: t("sg.feedback.toastDeleted") }); }, 1200);
                }}
              >
                {t("sg.feedback.deleteProject")}
              </Button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{t("sg.feedback.deleteText")}</p>
        </Dialog>
      </Specimen>
      <Specimen title={t("sg.feedback.progress")}>
        <Stack gap={16}>
          <ProgressBar label={t("sg.feedback.uploading")} value={progress} />
          <Row>
            <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.max(0, p - 20))}>−20</Button>
            <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.min(100, p + 20))}>+20</Button>
          </Row>
          <ProgressBar label={t("sg.feedback.preparing")} />
          <Row>
            <Spinner label={t("media.loading")} />
            <Text tone="text">{t("media.loading")}</Text>
          </Row>
          <ThinkingLoader phases={[t("sg.feedback.phase1"), t("sg.feedback.phase2"), t("sg.feedback.phase3")]} interval={1800} loop />
        </Stack>
      </Specimen>
      <Specimen title={t("sg.feedback.stepProgress")} wide note={t("sg.feedback.stepProgressNote")}>
        <Stack gap={16}>
          <StepProgress
            label={t("sg.feedback.preparing")}
            steps={[t("sg.feedback.phase1"), t("sg.feedback.phase2"), t("sg.feedback.phase3")]}
            current={Math.min(step, 3)}
            fraction={step > 0 && step <= 3 ? 0.4 : 0}
            waitingLabel={t("sg.feedback.stepWaiting")}
            done={step > 3}
            doneLabel={t("sg.feedback.stepDone")}
            meta={step > 0 && step <= 3 ? t("sg.feedback.stepMeta", { n: step }) : undefined}
          />
          <Row>
            <Button size="sm" variant="secondary" onClick={() => setStep((n) => Math.min(4, n + 1))} disabled={step > 3}>{t("sg.feedback.stepNext")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setStep(0)}>{t("sg.feedback.stepReset")}</Button>
          </Row>
        </Stack>
      </Specimen>
      <Specimen title={t("sg.feedback.skeleton")} note={t("sg.feedback.skeletonNote")}>
        <Card padding="none">
          <CardBody>
            <Stack gap={12}>
              <Skeleton height={120} radius={10} />
              <Skeleton width="60%" height={14} />
              <Skeleton width="35%" height={12} />
              <ShimmerText>{t("sg.feedback.loadingProjects")}</ShimmerText>
            </Stack>
          </CardBody>
        </Card>
      </Specimen>
      <Specimen title={t("sg.feedback.empty")} plain>
        <Card>
          <EmptyState
            icon="projects"
            title={t("sg.feedback.emptyTitle")}
            description={t("sg.feedback.emptyText")}
            actions={<Button icon={<Icon name="add" />}>{t("sg.feedback.newDub")}</Button>}
          />
        </Card>
      </Specimen>
      <Specimen title={t("sg.feedback.error")} plain>
        <Card>
          <EmptyState
            icon="error"
            tone="danger"
            title={t("sg.feedback.errorTitle")}
            description={t("sg.feedback.errorText")}
            actions={<Button variant="secondary" icon={<Icon name="retry" />}>{t("kit.retry")}</Button>}
          />
        </Card>
      </Specimen>
      <Specimen title={t("sg.feedback.card")} plain>
        <Card padding="none">
          <CardHeader title={t("sg.feedback.cardTitle")} actions={<Button size="sm" variant="ghost">{t("sg.feedback.edit")}</Button>} />
          <CardBody><Text tone="text">{t("sg.feedback.cardText")}</Text></CardBody>
          <CardFooter>
            <span>{t("sg.feedback.cardMeta")}</span>
            <Button size="sm" variant="secondary">{t("sg.feedback.open")}</Button>
          </CardFooter>
        </Card>
      </Specimen>
    </SgSection>
  );
}
