import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { RuntimeFailure } from './app/RuntimeFailure'
import { RuntimeConfigurationError, createConfiguredServices } from './services/bootstrap'
import {
  MockWorkspaceUnavailableError,
  ServiceAdapterUnavailableError,
} from './services/index'

function initialLocale(): 'en' | 'ru' {
  try {
    const saved = window.localStorage.getItem('dubbed.locale')
    if (saved === 'en' || saved === 'ru') return saved
  } catch {
    // Browser storage is optional for selecting the initial copy.
  }
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

const root = createRoot(document.getElementById('root')!)
const locale = initialLocale()
document.documentElement.lang = locale

try {
  const services = createConfiguredServices(import.meta.env)
  root.render(
    <StrictMode>
      <App services={services} />
    </StrictMode>,
  )
} catch (error) {
  if (error instanceof ServiceAdapterUnavailableError) {
    root.render(<RuntimeFailure locale={locale} kind="adapter" />)
  } else if (error instanceof RuntimeConfigurationError) {
    root.render(<RuntimeFailure locale={locale} kind="configuration" />)
  } else if (error instanceof MockWorkspaceUnavailableError) {
    root.render(<RuntimeFailure locale={locale} kind="storage" />)
  } else {
    throw error
  }
}
