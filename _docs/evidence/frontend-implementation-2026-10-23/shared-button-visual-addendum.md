# Shared Button visual addendum

Date: 2026-10-23  
Worktree base: `35d122949ad0e07a7e365bcbd4c1ec69202796c3` (local shared worktree; changes remain uncommitted)

This addendum records the audited shared Button variant corrections in `frontend/src/App.css`. It supplements the earlier shared-controls evidence without changing its historical matrix.

## Source mapping and implementation

The mapped source is the [Affect UI Clean Button reference](../affect-ui-clean-light/source/components/button/Clean/button-clean.md.txt), its [initial Light render](../affect-ui-clean-light/source/components/button/Clean/Light/01-initial.png), and the [adopted token contract](../../frontend-flows/design-tokens.md).

- Secondary remains white on hover, keeps its transparent one-pixel layout border, and now uses the exact three-layer source shadows: `.06/.1/.05` at rest and `.1/.12/.07` on hover.
- Ghost hover wash is `rgba(0, 0, 0, 0.03)`.
- Disabled Button opacity is `0.4`; its native disabled state and not-allowed cursor remain intact.
- The audited destructive treatment remains a soft `rgba(229, 72, 77, .08/.12)` wash with `#C1262C` text, source `scale(.97)` press response, and the adopted visible 2px `#0060E2` focus outline with 2px offset.

## Verification and rendered evidence

Command: `npx.cmd playwright test e2e/shared-controls.spec.ts --grep "shared button variants match adopted state colors" --reporter=line`  
Result: **1 passed** in local Chromium. The test exercises the real shared Button component through the test-only Vite harness at English and Russian, 1440px desktop and 390px phone widths. It reads computed default and hover styles, checks secondary border/shadow, ghost wash, disabled opacity, destructive fill/color/contrast, keyboard focus, and press transform.

The run also passed the focused spec TypeScript check:

```text
npx.cmd tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --skipLibCheck --lib ES2022,DOM --types node e2e/shared-controls.spec.ts
```

`git diff --check -- frontend/src/App.css frontend/e2e/shared-controls.spec.ts` passed. Captures and computed metrics are in [the focused evidence directory](shared-controls/destructive-button/metrics.json). The full-page focus captures show the destructive button's focus ring in context; the computed wash contrast is 5.28:1 at rest and 5.02:1 on hover over the rendered white surface.

This evidence covers the component-level harness in local Chromium, with reduced motion and no media capture or external service calls. It does not establish every application route, another browser engine, or a production deployment. A full-project typecheck was not part of this focused run.
