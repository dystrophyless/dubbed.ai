# Dubbed frontend

## Runtime

The app uses React 19, TypeScript, Vite, React Router, and the service facade in `src/services`. `npm run dev` and `npm run build` use Vite's `mock` mode. `.env.mock` selects `VITE_SERVICE_ADAPTER=mock` and sets the owner-approved support email. The default adapter is mock; explicitly setting `VITE_SERVICE_ADAPTER=real` fails with the typed unavailable-adapter error. It never falls back to mock.

Node must be 22.12 or later in the Node 22 line, Node 24, or Node 26 and later. The package lock records the resolved versions. Install with `npm ci` from this directory.

## Routes and shell integration

The current route convention is:

- Public: `/`, `/sign-in`, `/register`, `/reset-password`, `/account-linking`.
- Protected: `/new`, `/projects`, `/projects/:projectId/processing`, `/projects/:projectId/record`, `/projects/:projectId/result`, `/microphone`, `/credits`, and `/account`.
- Microphone origin is explicit: `/microphone?origin=new` or `/microphone?origin=project&projectId=<validated-id>`.
- Sign-in return intent is a closed route union encoded as safe query fields. Arbitrary return URLs are not accepted. Account expiry returns to `/new`; a project flow returns to its exact validated screen.

`App` accepts typed feature screen slots through `AppScreenSlots`; the current domain screens are mounted through those slots without replacing the shell, and injection remains available for isolated tests. The shell refreshes identity at protected locations, reads the displayed credit balance from the service, and exposes a route-exit guard for feature-owned save/discard/stay decisions. Service errors pass through the bilingual code-to-message map in `src/i18n/service-errors.ts`; adapter error prose and unapproved field text are not displayed.

Shared controls use source-mapped semantics with the adopted Affect Clean/Light appearance. `Button` wraps a native button and uses CVA variants for shadcn Button behavior; `TextField` wraps a labeled native input with hint/error relationships; the mobile navigation `Sheet` uses Radix Dialog's focus, Escape, and modal semantics. The language control remains a labeled native `<select>` with the two locale options, styled as the compact Affect header affordance; its option popup and keyboard behavior remain browser-native instead of introducing a custom picker. `Notice` uses status/alert roles, and service errors use localized code messages. Source geometry and accessibility adaptations are recorded in the browser evidence. Mabry Pro Regular 400 and Medium 500 were copied from `D:\Program\python\Infopedia Web\frontend\public\fonts\` to `public/fonts/`: Regular SHA-256 `8C14CF8152EECBDD3CCD8D5F22860D57B3D0719B9410322D27AE861670292000`; Medium SHA-256 `C3022485726931FAC88FF44742D785B3812947B6771E949ECD064F04D1997A38`. CSS disables synthetic weights.

The landing page's payment/refund contact is configured through `VITE_SUPPORT_EMAIL`; the checked-in mock environment uses `dystrophyless@gmail.com` and renders a `mailto:` link. No message is sent by the app.

## Verification

Run the checks from this directory:

```text
npm run typecheck
npm run lint
npm test
npm run test:media
npm run test:e2e
npm run test:e2e:real
npm run test:full
npm run build
npm run preview
```

`test` runs Vitest with Testing Library in jsdom. Each test clears local/session storage and receives a fresh IndexedDB factory. `test:media` runs the Node integrity test for checked-in media fixtures. `test:e2e` runs the mock-mode Chromium shell smoke, auth target checks at 390/767/768px, visible identity/account scenarios, and registration-to-result/download journeys, including reload and the explicitly synthetic Google path. It uses one Playwright worker for deterministic shared local fixtures. These exercise the frontend with the local mock adapter. Result media is a checked-in synthetic fixture; browser capture uses Chromium's fake microphone. They do not establish physical-microphone behavior, production media generation, external OAuth, real-backend behavior, or speaker output. `test:e2e:real` starts a separate Vite server on port 4174 with `VITE_SERVICE_ADAPTER=real`, verifying the visible unavailable state and absence of external HTTP requests in the tested scenario. Both Playwright browser configs mute output audio and use Chromium's fake media device and fake permission UI, so browser tests cannot use physical microphones or send fixture playback to speakers. Install the browser binary separately with `npx playwright install chromium` when it is missing. `tests/media/probe-browsers.mjs` is a separate manual browser matrix command and is not part of the default test suite.
