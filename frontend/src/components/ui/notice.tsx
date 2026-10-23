import type { ReactNode } from 'react'
import type { ServiceError } from '../../services/contracts'
import { serviceProblemMessage, type ServiceProblemCode } from '../../i18n/service-errors'
import { t } from '../../i18n/messages'
import { useLocale } from '../../app/locale'
import { cn } from './cn'

export interface NoticeProps {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning' | 'error'
  role?: 'status' | 'alert'
  className?: string
}

export function Notice({ children, tone = 'neutral', role = 'status', className }: NoticeProps) {
  return (
    <div className={cn('ui-notice', `ui-notice--${tone}`, className)} role={role}>
      {children}
    </div>
  )
}

export interface ServiceNoticeProps {
  code: ServiceProblemCode
  fieldErrors?: ServiceError['fieldErrors']
  className?: string
}

export function ServiceNotice({ code, fieldErrors, className }: ServiceNoticeProps) {
  const { locale } = useLocale()
  const knownFieldNames = Object.keys(fieldErrors ?? {}).filter((field) =>
    ['email', 'password', 'currentPassword', 'newPassword', 'code', 'file', 'title', 'selection'].includes(field),
  )
  return (
    <Notice tone="error" role="alert" className={className}>
      <p>{serviceProblemMessage(code, locale)}</p>
      {knownFieldNames.length > 0 && (
        <ul className="ui-notice__field-errors">
          {knownFieldNames.map((field) => (
            <li key={field} data-field={field}>
              {t(locale, 'fieldInvalid')}
            </li>
          ))}
        </ul>
      )}
    </Notice>
  )
}
