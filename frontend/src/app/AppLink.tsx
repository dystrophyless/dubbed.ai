import type { MouseEvent, ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router'
import { useAppContext } from './context'
import { routeTo, type AppRoute } from './routes'

export interface AppLinkProps extends Omit<LinkProps, 'to'> {
  route: AppRoute
  onNavigated?: () => void
  children: ReactNode
}

export function AppLink({ route, onNavigated, onClick, replace, children, ...props }: AppLinkProps) {
  const { navigate } = useAppContext()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (props.target && props.target !== '_self')
    ) {
      return
    }
    event.preventDefault()
    void navigate(route, { replace }).then((didNavigate) => {
      if (didNavigate) onNavigated?.()
    })
  }

  return (
    <Link {...props} replace={replace} to={routeTo(route)} onClick={handleClick}>
      {children}
    </Link>
  )
}
