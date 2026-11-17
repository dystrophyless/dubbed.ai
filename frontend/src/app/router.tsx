import { createBrowserRouter, RouterProvider } from "react-router";
import { AppShellDemo, FocusedShellDemo } from "@/pages/styleguide/ShellDemos";
import { StyleguidePage } from "@/pages/styleguide/StyleguidePage";
import { TemplatesRoute } from "@/pages/styleguide/TemplatesRoute";
import { PrototypeRoute } from "@/prototypes/prototype-route";
import { ProductShell } from "@/app/ProductShell";
import { AuthOnly, RequireAccount, RootRedirect } from "@/app/guards";
import { GoogleStandInPage } from "@/features/auth/pages/GoogleStandInPage";
import { MicrophonePage } from "@/features/auth/pages/MicrophonePage";
import { ResetPasswordPage } from "@/features/auth/pages/ResetPasswordPage";
import { SignInPage } from "@/features/auth/pages/SignInPage";
import { SignUpPage } from "@/features/auth/pages/SignUpPage";
import { VerifyPage } from "@/features/auth/pages/VerifyPage";
import { CheckoutPage } from "@/features/checkout/CheckoutPage";
import { CreditsPage } from "@/features/credits/CreditsPage";
import { NewDubPage } from "@/features/new-dub/NewDubPage";
import { ProcessingPage } from "@/features/processing/ProcessingPage";
import { ProjectRedirect } from "@/features/projects/ProjectRedirect";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ResultPage } from "@/features/result/ResultPage";
import { StudioRoot } from "@/features/studio/StudioRoot";
import { StudioPage } from "@/features/studio/StudioPage";

/*
 * Product routes (feature 001, ui-spec §1): ordinary pages inside ProductShell (AppShell with the live balance); the
 * recording studio brings its own focused shell (StudioShell). Feature 004: `/` redirects by session (RootRedirect); every
 * product route sits behind RequireAccount; the auth pages (/sign-in, /sign-up, /sign-up/verify, /sign-up/microphone,
 * /reset-password, /auth/google) sit inside AuthOnly and render without a shell.
 * Bootstrap routes (BOOTSTRAP.md, Phase 0):
 *   /styleguide                              every kit component in every state (Phase 1)
 *   /styleguide/templates/:id?state=…        reference page templates (Phase 3+)
 *   /prototypes/:feature/:screen?state=…     feature designs from /speckit-design
 * Product routes are added only after Gates 1–3.
 */
const router = createBrowserRouter([
  { path: "/", element: <RootRedirect /> },
  { path: "/sign-in", element: <AuthOnly stage="guest"><SignInPage /></AuthOnly> },
  { path: "/sign-up", element: <AuthOnly stage="guest"><SignUpPage /></AuthOnly> },
  { path: "/sign-up/verify", element: <AuthOnly stage="verify"><VerifyPage /></AuthOnly> },
  { path: "/sign-up/microphone", element: <AuthOnly stage="microphone"><MicrophonePage /></AuthOnly> },
  { path: "/reset-password", element: <AuthOnly stage="guest"><ResetPasswordPage /></AuthOnly> },
  { path: "/auth/google", element: <AuthOnly stage="guest"><GoogleStandInPage /></AuthOnly> },
  {
    element: <RequireAccount><ProductShell /></RequireAccount>,
    children: [
      { path: "/projects", element: <ProjectsPage /> },
      { path: "/new", element: <NewDubPage /> },
      { path: "/credits", element: <CreditsPage /> },
      { path: "/projects/:id", element: <ProjectRedirect /> },
      { path: "/projects/:id/processing", element: <ProcessingPage /> },
      { path: "/projects/:id/result", element: <ResultPage /> },
    ],
  },
  // the simulated payment page stands in for a provider's hosted checkout: no product shell (brand + language only)
  { path: "/checkout/:purchaseId", element: <RequireAccount><CheckoutPage /></RequireAccount> },
  {
    // the studio's focused shell brings its own chrome; the watcher is mounted here as well
    element: <RequireAccount><StudioRoot /></RequireAccount>,
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
