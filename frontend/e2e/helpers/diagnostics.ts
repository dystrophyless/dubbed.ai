import { expect, type Page } from '@playwright/test'

export interface BrowserDiagnostics {
  pageErrors: string[]
  consoleErrors: string[]
  externalRequests: string[]
  backendRequests: string[]
  assertClean(): void
}

function usesLocalEndpoint(requestUrl: URL, baseUrl: URL): boolean {
  const defaultPort = (protocol: string) =>
    protocol === 'https:' || protocol === 'wss:' ? '443' : '80'
  return requestUrl.hostname === baseUrl.hostname
    && (requestUrl.port || defaultPort(requestUrl.protocol))
      === (baseUrl.port || defaultPort(baseUrl.protocol))
}

function isBackendCall(resourceType: string, pathname: string): boolean {
  if (!['fetch', 'xhr', 'beacon'].includes(resourceType)) return false
  // Public media/font bundles may be fetched by the browser; mock domain calls may not.
  return !/^\/(?:media|fonts|assets)\//i.test(pathname)
}

/** Capture runtime failures and prevent accidental backend or off-origin traffic in mock E2E tests. */
export async function installBrowserDiagnostics(
  page: Page,
  baseUrl: string,
): Promise<BrowserDiagnostics> {
  const expectedOrigin = new URL(baseUrl)
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const externalRequests = new Set<string>()
  const backendRequests = new Set<string>()

  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('request', request => {
    const url = new URL(request.url())
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return
    if (!usesLocalEndpoint(url, expectedOrigin)) {
      externalRequests.add(url.origin)
      return
    }
    if (isBackendCall(request.resourceType(), url.pathname)) {
      backendRequests.add(`${request.method()} ${url.pathname}`)
    }
  })

  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
      await route.continue()
      return
    }
    if (!usesLocalEndpoint(url, expectedOrigin)) {
      externalRequests.add(url.origin)
      await route.abort('blockedbyclient')
      return
    }
    if (isBackendCall(request.resourceType(), url.pathname)) {
      backendRequests.add(`${request.method()} ${url.pathname}`)
      await route.abort('blockedbyclient')
      return
    }
    await route.continue()
  })

  return {
    pageErrors,
    consoleErrors,
    get externalRequests() { return [...externalRequests] },
    get backendRequests() { return [...backendRequests] },
    assertClean() {
      expect(pageErrors, 'unexpected uncaught page errors').toEqual([])
      expect(consoleErrors, 'unexpected console errors').toEqual([])
      expect([...externalRequests], 'unexpected off-origin network requests').toEqual([])
      expect([...backendRequests], 'unexpected same-origin fetch/XHR backend requests').toEqual([])
    },
  }
}
