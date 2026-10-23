import { useId, type InputHTMLAttributes } from 'react'
import { cn } from './cn'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id?: string
  label: string
  hint?: string
  error?: string
}

export function TextField({
  id,
  label,
  hint,
  error,
  className,
  'aria-describedby': describedBy,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined
  const descriptionIds = [describedBy, hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={error ? true : inputProps['aria-invalid']}
        aria-describedby={descriptionIds}
        className={cn('ui-input', error && 'ui-input--invalid', className)}
      />
      {hint && (
        <p id={hintId} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}
