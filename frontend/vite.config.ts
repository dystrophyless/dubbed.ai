import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server on 5174 (5173 may be used by another run); preview on 4175 (also used by Playwright).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5174, strictPort: true },
  preview: { port: 4175, strictPort: true },
});
