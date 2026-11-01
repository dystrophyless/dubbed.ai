# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-journey.spec.ts >> local mock product journey >> registers, saves a millisecond selection, records all lines, and downloads the displayed result generation
- Location: e2e\full-journey.spec.ts:23:3

# Error details

```
Error: unexpected console errors

expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "Failed to load resource: net::ERR_FILE_NOT_FOUND",
+   "Failed to load resource: net::ERR_FILE_NOT_FOUND",
+ ]
```

# Page snapshot

```yaml
- generic [ref=f2e3]:
  - link "Skip to content" [ref=f2e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=f2e5]:
    - generic [ref=f2e6]:
      - link "Dubbed — Home" [ref=f2e7] [cursor=pointer]:
        - /url: /
        - generic [ref=f2e8]: Dubbed
      - navigation "Main navigation" [ref=f2e9]:
        - link "New dub" [ref=f2e10] [cursor=pointer]:
          - /url: /new
        - link "Projects" [ref=f2e11] [cursor=pointer]:
          - /url: /projects
        - link "Credits" [ref=f2e12] [cursor=pointer]:
          - /url: /credits
        - link "Account" [ref=f2e13] [cursor=pointer]:
          - /url: /account
      - generic [ref=f2e14]:
        - generic [ref=f2e15]:
          - generic [ref=f2e16]: Credits
          - strong [ref=f2e17]: "111"
        - generic [ref=f2e19]:
          - generic [ref=f2e20]: Language
          - combobox "Language" [ref=f2e21] [cursor=pointer]:
            - option "EN" [selected]
            - option "RU"
        - button "Sign out" [ref=f2e22] [cursor=pointer]
  - main [ref=f2e23]:
    - region [ref=f2e25]:
      - generic [ref=f2e26]:
        - generic [ref=f2e27]:
          - heading "Your result" [level=1] [ref=f2e28]
          - paragraph [ref=f2e29]: source-dialogue
        - button "Return to recording" [ref=f2e30] [cursor=pointer]
      - generic [ref=f2e33]:
        - generic "Finished dubbed video" [ref=f2e34]
        - generic [ref=f2e35]:
          - generic [ref=f2e36]: "Displayed generation: 1"
          - generic [ref=f2e37]: Synthetic fixture result; not rendered from accepted takes or a custom upload.
        - button "Download MP4" [ref=f2e39] [cursor=pointer]
```

# Test source

```ts
  1  | import { expect, type Page } from '@playwright/test'
  2  | 
  3  | export interface BrowserDiagnostics {
  4  |   pageErrors: string[]
  5  |   consoleErrors: string[]
  6  |   externalRequests: string[]
  7  |   backendRequests: string[]
  8  |   assertClean(): void
  9  | }
  10 | 
  11 | function usesLocalEndpoint(requestUrl: URL, baseUrl: URL): boolean {
  12 |   const defaultPort = (protocol: string) =>
  13 |     protocol === 'https:' || protocol === 'wss:' ? '443' : '80'
  14 |   return requestUrl.hostname === baseUrl.hostname
  15 |     && (requestUrl.port || defaultPort(requestUrl.protocol))
  16 |       === (baseUrl.port || defaultPort(baseUrl.protocol))
  17 | }
  18 | 
  19 | function isBackendCall(resourceType: string, pathname: string): boolean {
  20 |   if (!['fetch', 'xhr', 'beacon'].includes(resourceType)) return false
  21 |   // Public media/font bundles may be fetched by the browser; mock domain calls may not.
  22 |   return !/^\/(?:media|fonts|assets)\//i.test(pathname)
  23 | }
  24 | 
  25 | /** Capture runtime failures and prevent accidental backend or off-origin traffic in mock E2E tests. */
  26 | export async function installBrowserDiagnostics(
  27 |   page: Page,
  28 |   baseUrl: string,
  29 | ): Promise<BrowserDiagnostics> {
  30 |   const expectedOrigin = new URL(baseUrl)
  31 |   const pageErrors: string[] = []
  32 |   const consoleErrors: string[] = []
  33 |   const externalRequests = new Set<string>()
  34 |   const backendRequests = new Set<string>()
  35 | 
  36 |   page.on('pageerror', error => pageErrors.push(error.message))
  37 |   page.on('console', message => {
  38 |     if (message.type() === 'error') consoleErrors.push(message.text())
  39 |   })
  40 |   page.on('request', request => {
  41 |     const url = new URL(request.url())
  42 |     if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) return
  43 |     if (!usesLocalEndpoint(url, expectedOrigin)) {
  44 |       externalRequests.add(url.origin)
  45 |       return
  46 |     }
  47 |     if (isBackendCall(request.resourceType(), url.pathname)) {
  48 |       backendRequests.add(`${request.method()} ${url.pathname}`)
  49 |     }
  50 |   })
  51 | 
  52 |   await page.route('**/*', async route => {
  53 |     const request = route.request()
  54 |     const url = new URL(request.url())
  55 |     if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
  56 |       await route.continue()
  57 |       return
  58 |     }
  59 |     if (!usesLocalEndpoint(url, expectedOrigin)) {
  60 |       externalRequests.add(url.origin)
  61 |       await route.abort('blockedbyclient')
  62 |       return
  63 |     }
  64 |     if (isBackendCall(request.resourceType(), url.pathname)) {
  65 |       backendRequests.add(`${request.method()} ${url.pathname}`)
  66 |       await route.abort('blockedbyclient')
  67 |       return
  68 |     }
  69 |     await route.continue()
  70 |   })
  71 | 
  72 |   return {
  73 |     pageErrors,
  74 |     consoleErrors,
  75 |     get externalRequests() { return [...externalRequests] },
  76 |     get backendRequests() { return [...backendRequests] },
  77 |     assertClean() {
  78 |       expect(pageErrors, 'unexpected uncaught page errors').toEqual([])
> 79 |       expect(consoleErrors, 'unexpected console errors').toEqual([])
     |                                                          ^ Error: unexpected console errors
  80 |       expect([...externalRequests], 'unexpected off-origin network requests').toEqual([])
  81 |       expect([...backendRequests], 'unexpected same-origin fetch/XHR backend requests').toEqual([])
  82 |     },
  83 |   }
  84 | }
  85 | 
```