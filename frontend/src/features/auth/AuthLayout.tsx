import type { ReactNode } from 'react'
import './auth.css'

export function AuthLayout({ title, description, children }: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="auth-screen" aria-labelledby="auth-screen-title">
      <div className="auth-panel">
        <header className="auth-panel__heading">
          <h1 id="auth-screen-title">{title}</h1>
          {description && <p>{description}</p>}
        </header>
        <div className="auth-panel__content">{children}</div>
      </div>
    </section>
  )
}
