import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, KeyboardEvent, MouseEvent } from 'react'
import { cn } from './cn'

export const buttonVariants = cva('ui-button', {
  variants: {
    variant: {
      primary: 'ui-button--primary',
      secondary: 'ui-button--secondary',
      ghost: 'ui-button--ghost',
      destructive: 'ui-button--destructive',
    },
    size: {
      small: 'ui-button--small',
      medium: 'ui-button--medium',
      large: 'ui-button--large',
      icon: 'ui-button--icon',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'medium',
  },
})

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Keeps a pending action focusable while exposing and blocking its busy state. */
  busy?: boolean
}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  busy = false,
  onClick,
  onKeyDown,
  'aria-busy': ariaBusy,
  'aria-disabled': ariaDisabled,
  ...props
}: ButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (busy) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onClick?.(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (busy && (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar')) {
      event.preventDefault()
      event.stopPropagation()
      return
    }
    onKeyDown?.(event)
  }

  return (
    <button
      data-slot="button"
      data-variant={variant ?? 'primary'}
      data-size={size ?? 'medium'}
      className={cn(buttonVariants({ variant, size, className }))}
      type={type}
      aria-busy={busy ? true : ariaBusy}
      aria-disabled={busy ? true : ariaDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}
