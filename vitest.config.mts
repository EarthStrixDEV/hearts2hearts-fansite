import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const at = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": at("./src"),
      // `server-only` throws outside a React server build; tests run in plain node
      "server-only": at("./tests/stubs/server-only.ts"),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"], testTimeout: 20_000 },
});
