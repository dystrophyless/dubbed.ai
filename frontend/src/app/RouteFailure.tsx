import { useRouteError } from 'react-router'
import { Button } from '../components/ui/button'

export function RouteFailure() {
  // Route errors replace AppFrame, so use the document's already-authoritative locale.
  const locale = document.documentElement.lang.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  const copy = locale === 'ru'
    ? {
        title: 'Не удалось открыть эту страницу',
        description: 'Попробуйте перезагрузить страницу. Незавершённые действия не будут отправлены повторно автоматически.',
        reload: 'Перезагрузить страницу',
      }
    : {
        title: 'This page could not be opened',
        description: 'Try reloading the page. Incomplete actions will not be submitted again automatically.',
        reload: 'Reload page',
      }

  // Read the route error so React Router can use this as its error boundary. Never render
  // its message or stack: it can include internal implementation details.
  useRouteError()

  return (
    <main className="app-main">
      <section className="feature-placeholder" role="alert" aria-labelledby="route-failure-title">
        <h1 id="route-failure-title">{copy.title}</h1>
        <p>{copy.description}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}>
          {copy.reload}
        </Button>
      </section>
    </main>
  )
}
