import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests for the services layer (rules + mock adapter). IndexedDB comes from fake-indexeddb.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["fake-indexeddb/auto"],
  },
});
