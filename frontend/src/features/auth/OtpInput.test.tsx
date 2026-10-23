import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OtpInput } from './OtpInput'

describe('OtpInput', () => {
  it('exposes one accessible numeric one-time-code field and six decorative cells', () => {
    render(<OtpInput label="Verification code" value="123" onChange={vi.fn()} />)

    const input = screen.getByRole('textbox', { name: 'Verification code' })
    expect(input).toHaveAttribute('autocomplete', 'one-time-code')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(document.querySelectorAll('.otp-control__cell')).toHaveLength(6)
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
  })

  it('normalizes pasted and autofilled values to the first six ASCII digits', () => {
    const onChange = vi.fn()
    render(<OtpInput label="Verification code" value="" onChange={onChange} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Verification code' }), {
      target: { value: '12 3-4x56789' },
    })
    expect(onChange).toHaveBeenCalledWith('123456')
  })

  it('announces invalid state and retains the entered code', () => {
    render(
      <>
        <OtpInput label="Verification code" value="001234" onChange={vi.fn()} invalid errorMessageId="code-error" />
        <p id="code-error">The code is incorrect.</p>
      </>,
    )

    const input = screen.getByRole('textbox', { name: 'Verification code' })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'code-error')
    expect(input).toHaveValue('001234')
  })
})
