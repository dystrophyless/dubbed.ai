import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { AppShellDemo, FocusedShellDemo } from "@/pages/styleguide/ShellDemos";
import { StyleguidePage } from "@/pages/styleguide/StyleguidePage";
import { TemplatesRoute } from "@/pages/styleguide/TemplatesRoute";
import { PrototypeRoute } from "@/prototypes/prototype-route";

/*
 * Bootstrap routes (BOOTSTRAP.md, Phase 0):
 *   /styleguide                              every kit component in every state (Phase 1)
 *   /styleguide/templates/:id?state=…        reference page templates (Phase 3+)
 *   /prototypes/:feature/:screen?state=…     feature designs from /speckit-design
 * Product routes are added only after Gates 1–3.
 */
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/styleguide" replace /> },
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
