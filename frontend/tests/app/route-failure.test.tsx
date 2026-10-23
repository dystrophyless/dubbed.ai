import { afterEach, expect, test } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { RouteFailure } from '../../src/app/RouteFailure'

afterEach(() => {
  cleanup()
  document.documentElement.lang = 'en'
})

test('a render failure shows localized recovery copy without exposing the exception', async () => {
  document.documentElement.lang = 'ru'

  function BrokenScreen(): never {
    throw new Error('secret backend detail and stack')
  }

  const router = createMemoryRouter([
    { path: '/', Component: BrokenScreen, ErrorBoundary: RouteFailure },
  ])

  render(<RouterProvider router={router} />)

  expect(await screen.findByRole('heading', { name: 'Не удалось открыть эту страницу' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Перезагрузить страницу' })).toBeTruthy()
  expect(screen.queryByText(/secret backend detail/)).toBeNull()
})
