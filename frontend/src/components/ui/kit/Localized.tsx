import { useTranslation } from "react-i18next";
import { FilterMenu as FilterMenuPort, type FilterMenuProps } from "../affect/filter-menu";
import { NotificationStack as NotificationStackPort, type NotificationStackProps } from "../affect/notification-stack";
import { OtpInput as OtpInputPort, type OtpInputProps } from "../affect/otp-input";
import { ProfileMenu as ProfileMenuPort, type ProfileMenuProps } from "../affect/profile-menu";

/*
 * Localised wrappers (DUBBED PATCH 2): pass the current language's fixed copy into the ports' `labels` prop.
 * The ports themselves stay untouched; explicit `labels` from the caller still win.
 */
export function OtpInput(props: OtpInputProps) {
  const { t } = useTranslation();
  const labels = {
    didntGet: t("kit.otp.didntGet"), resendIn: t("kit.otp.resendIn"), resend: t("kit.otp.resend"), verifying: t("kit.otp.verifying"),
    failed: t("kit.otp.failed"), canResend: t("kit.otp.canResend"), sent: t("kit.otp.sent"),
  };
  return <OtpInputPort {...props} labels={{ ...labels, ...props.labels }} />;
}

export function NotificationStack(props: NotificationStackProps) {
  const { t } = useTranslation();
  return <NotificationStackPort {...props} labels={{ region: t("sg.affect.notifications"), dismiss: (title: string) => t("sg.affect.dismiss", { title }), ...props.labels }} />;
}

export function ProfileMenu(props: ProfileMenuProps) {
  const { t } = useTranslation();
  return <ProfileMenuPort {...props} labels={{ account: t("shell.account"), setup: t("sg.affect.setup"), next: t("sg.affect.next"), ...props.labels }} />;
}

export function FilterMenu(props: FilterMenuProps) {
  const { t } = useTranslation();
  return (
    <FilterMenuPort
      {...props}
      labels={{
        clearAll: t("sg.affect.clearAll"), navigate: t("sg.affect.navigate"), select: t("sg.affect.select"),
        remove: (label: string) => t("sg.affect.remove", { label }),
        more: (n: number, list: string) => t("sg.affect.more", { count: n, list }),
        filters: (n: number) => t("sg.affect.filterCount", { count: n }),
        ...props.labels,
      }}
    />
  );
}
