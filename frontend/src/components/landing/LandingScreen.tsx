import { useState } from 'react'
import { useAppContext } from '../../app/context'
import { routes } from '../../app/routes'
import { useLocale } from '../../app/locale'
import type { ServiceProblemCode } from '../../i18n/service-errors'
import { Button } from '../ui/button'
import { Notice, ServiceNotice } from '../ui/notice'

function configuredSupportEmail(): string | null {
  const email = import.meta.env.VITE_SUPPORT_EMAIL?.trim()
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

export function LandingScreen() {
  const { refreshIdentity, navigate, route } = useAppContext()
  const { locale, text } = useLocale()
  const [checkingStart, setCheckingStart] = useState(false)
  const [startError, setStartError] = useState<ServiceProblemCode | null>(null)
  const supportEmail = configuredSupportEmail()

  async function start() {
    if (checkingStart) return
    setCheckingStart(true)
    setStartError(null)
    const current = await refreshIdentity()
    setCheckingStart(false)
    if (current.status === 'signed-in') {
      await navigate(routes.newDub())
    } else if (current.status === 'signed-out') {
      await navigate(routes.registration())
    } else {
      setStartError(current.status === 'error' ? current.code : 'unexpected')
    }
  }

  return (
    <div className="landing-page" lang={locale}>
      <section className="landing-content" aria-labelledby="landing-title">
        <h1 id="landing-title">{text('landingTitle')}</h1>
        <p className="landing-description">{text('landingDescription')}</p>
        <p className="landing-offer">{text('welcomeOffer')}</p>

        {route.kind === 'landing' && route.notice && (
          <Notice tone="warning" role="status" className="landing-notice">
            {text(route.notice === 'signed-out' ? 'noticeSignedOut' : 'noticeAccountDeleted')}
          </Notice>
        )}

        {startError && <ServiceNotice code={startError} />}

        <Button
          variant="primary"
          size="large"
          className="landing-start"
          disabled={checkingStart}
          aria-busy={checkingStart}
          onClick={() => void start()}
        >
          {checkingStart ? text('checkingSession') : text('startDubbing')}
        </Button>

        <div className="landing-support">
          <p>{text('supportQuestion')}</p>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>
              {text('contactSupport')} <span className="support-address">{supportEmail}</span>
            </a>
          ) : (
            <span>{text('supportUnavailable')}</span>
          )}
        </div>
      </section>
    </div>
  )
}
