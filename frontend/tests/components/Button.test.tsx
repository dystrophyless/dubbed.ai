import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef, useState, type FormEvent } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { Button } from '../../src/components/ui/button'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function DeferredButtonHarness({ operation }: { operation: ReturnType<typeof deferred<void>> }) {
  const [busy, setBusy] = useState(false)
  const [value, setValue] = useState('keep this draft')
  const [message, setMessage] = useState('')
  const [mutationCount, setMutationCount] = useState(0)
  const busyRef = useRef(false)

  const save = async () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setMutationCount((count) => count + 1)
    setMessage('Saving draft')
    try {
      await operation.promise
      throw new Error('Synthetic save failed')
    } catch {
      setMessage('Save failed; the draft is still here.')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save()
  }

  return (
    <form onSubmit={submit}>
      <label>
        Draft
        <input value={value} onChange={(event) => setValue(event.currentTarget.value)} />
      </label>
      <Button type="submit" busy={busy} onClick={() => void save()}>
        {busy ? 'Saving draft…' : 'Save draft'}
      </Button>
      <span data-testid="mutation-count">{mutationCount}</span>
      <p role="status">{message}</p>
    </form>
  )
}

afterEach(cleanup)

it('keeps the busy Button focusable while blocking pointer and keyboard activation', () => {
  const onClick = vi.fn()
  render(<Button busy onClick={onClick}>Saving</Button>)

  const button = screen.getByRole('button', { name: 'Saving' })
  button.focus()

  expect(button).toHaveAttribute('aria-busy', 'true')
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).not.toBeDisabled()
  expect(button).toHaveFocus()

  fireEvent.click(button)
  fireEvent.keyDown(button, { key: 'Enter' })
  fireEvent.keyDown(button, { key: ' ' })
  expect(onClick).not.toHaveBeenCalled()
})

it('holds one pending mutation, preserves focus, and retains the input after a deferred failure', async () => {
  const operation = deferred<void>()
  render(<DeferredButtonHarness operation={operation} />)

  const button = screen.getByRole('button', { name: 'Save draft' })
  const draft = screen.getByRole('textbox', { name: 'Draft' })
  const form = button.closest('form')
  if (!form) throw new Error('Save button must be inside its form')
  button.focus()
  fireEvent.click(button)

  await waitFor(() => expect(button).toHaveAttribute('aria-busy', 'true'))
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).not.toBeDisabled()
  expect(button).toHaveFocus()
  expect(button).toHaveTextContent('Saving draft…')
  expect(draft).toHaveValue('keep this draft')
  expect(screen.getByTestId('mutation-count')).toHaveTextContent('1')

  fireEvent.click(button)
  fireEvent.submit(form)
  expect(screen.getByTestId('mutation-count')).toHaveTextContent('1')

  operation.reject(new Error('Synthetic service failure'))
  await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'))
  expect(button).toHaveTextContent('Save draft')
  expect(draft).toHaveValue('keep this draft')
  expect(screen.getByRole('status')).toHaveTextContent('Save failed; the draft is still here.')
  expect(screen.getByTestId('mutation-count')).toHaveTextContent('1')
})
