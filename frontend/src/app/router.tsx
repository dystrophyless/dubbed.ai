import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AppShellDemo, FocusedShellDemo } from "@/pages/styleguide/ShellDemos";
import { StyleguidePage } from "@/pages/styleguide/StyleguidePage";
import { TemplatesRoute } from "@/pages/styleguide/TemplatesRoute";
import { PrototypeRoute } from "@/prototypes/prototype-route";
import { ProductShell } from "@/app/ProductShell";
import { NewDubPage } from "@/features/new-dub/NewDubPage";
import { ProcessingPage } from "@/features/processing/ProcessingPage";
import { ProjectRedirect } from "@/features/projects/ProjectRedirect";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ResultPage } from "@/features/result/ResultPage";
import { StudioRoot } from "@/features/studio/StudioRoot";
import { StudioPage } from "@/features/studio/StudioPage";

/*
 * Product routes (feature 001, ui-spec §1): `/` → /projects; ordinary pages inside ProductShell (AppShell with the live
 * balance); the recording studio brings its own focused shell (StudioShell).
 * Bootstrap routes (BOOTSTRAP.md, Phase 0):
 *   /styleguide                              every kit component in every state (Phase 1)
 *   /styleguide/templates/:id?state=…        reference page templates (Phase 3+)
 *   /prototypes/:feature/:screen?state=…     feature designs from /speckit-design
 * Product routes are added only after Gates 1–3.
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/projects" replace /> },
  {
    element: <ProductShell />,
    children: [
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/new", element: <NewDubPage /> },
      { path: "/projects/:id", element: <ProjectRedirect /> },
      { path: "/projects/:id/processing", element: <ProcessingPage /> },
      { path: "/projects/:id/result", element: <ResultPage /> },
    ],
  },
  {
    // the studio's focused shell brings its own chrome; the watcher is mounted here as well
    element: <StudioRoot />,
    children: [{ path: "/projects/:id/turns/:n", element: <StudioPage /> }],
  },
  { path: "/styleguide", element: <StyleguidePage /> },
  { path: "/styleguide/shells/app/*", element: <AppShellDemo /> },
  { path: "/styleguide/shells/focused", element: <FocusedShellDemo /> },
  { path: "/styleguide/templates", element: <TemplatesRoute /> },
  { path: "/styleguide/templates/:id", element: <TemplatesRoute /> },
  { path: "/prototypes", element: <PrototypeRoute /> },
  { path: "/prototypes/:feature", element: <PrototypeRoute /> },
  { path: "/prototypes/:feature/:screen", element: <PrototypeRoute /> },
  { path: "/prototypes/:feature/:screen/:sub", element: <PrototypeRoute /> },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
