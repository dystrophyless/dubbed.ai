import { useTranslation } from "react-i18next";
import { Card, SkeletonText } from "@/components/ui";
import { AuthPage, K } from "./AuthFrame";
import s from "./auth.module.css";

/* Shown by the route guards while the session is being read (guest / stage / active is not known yet). */
export function AuthLoadingView({ brandHref }: { brandHref: string }) {
  const { t } = useTranslation();
  return (
    <AuthPage testId="auth-loading" state="loading" brandHref={brandHref}>
      <Card padding="none" className={s.card} aria-busy>
        <div className={s.body}>
          <h1 className="sr-only">{t(`${K}.loading`)}</h1>
          <div className={s.skeleton}>
            <SkeletonText size="lg" width={200} />
            <SkeletonText width={240} />
          </div>
          <SkeletonText size="lg" width={320} />
          <SkeletonText width={320} />
          <SkeletonText size="lg" width={320} />
        </div>
      </Card>
    </AuthPage>
  );
}
