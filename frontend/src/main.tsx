import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@/styles/tokens.css";
import "@/styles/global.css";
import "@/i18n";
import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);
