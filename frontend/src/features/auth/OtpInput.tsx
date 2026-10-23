import { useId, type Ref } from 'react'
import { Check } from 'lucide-react'
import './OtpInput.css'

export interface OtpInputProps {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  errorMessageId?: string
  verified?: boolean
  autoComplete?: string
  inputRef?: Ref<HTMLInputElement>
}

/** One accessible text input with a six-cell visual treatment. */
export function OtpInput({
  id,
  label,
  value,
  onChange,
  disabled = false,
  invalid = false,
  errorMessageId,
  verified = false,
  autoComplete = 'one-time-code',
  inputRef,
}: OtpInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const digits = value.replace(/\D/g, '').slice(0, 6)

  return (
    <div className="otp-field">
      <label className="otp-field__label" htmlFor={inputId}>{label}</label>
      <div
        className={`otp-control${invalid ? ' otp-control--invalid' : ''}${verified ? ' otp-control--verified' : ''}`}
        data-slot="otp-input"
      >
        <div className="otp-control__cells" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span className="otp-control__cell" key={index}>
              {digits[index] ?? ''}
              {index === 2 && <span className="otp-control__separator">—</span>}
            </span>
          ))}
          {verified && <Check className="otp-control__check" aria-hidden="true" strokeWidth={1.1} />}
        </div>
        <input
          ref={inputRef}
          id={inputId}
          className="otp-control__input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          aria-label={label}
          aria-invalid={invalid || undefined}
          aria-describedby={errorMessageId}
          value={digits}
          maxLength={12}
          disabled={disabled || verified}
          onChange={(event) => onChange(event.currentTarget.value.replace(/\D/g, '').slice(0, 6))}
        />
      </div>
    </div>
  )
}

export default OtpInput
