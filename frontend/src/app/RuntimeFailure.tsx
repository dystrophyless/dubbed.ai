import type { Locale } from './routes'
import { t } from '../i18n/messages'

export function RuntimeFailure({
  locale,
  kind,
}: {
  locale: Locale
  kind: 'adapter' | 'configuration' | 'storage'
}) {
  const title = t(locale, 'serviceUnavailableTitle')
  const description =
    kind === 'adapter'
      ? t(locale, 'serviceUnavailableDescription')
      : kind === 'configuration'
        ? t(locale, 'runtimeConfigurationInvalid')
        : t(locale, 'runtimeStorageUnavailable')
  return (
    <main className="runtime-failure" lang={locale}>
      <h1>{title}</h1>
      <p>{description}</p>
    </main>
  )
}
