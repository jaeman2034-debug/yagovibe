import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      lines: 80,
      branches: 70,
      functions: 75,
      statements: 80,
      exclude: [
        "node_modules/",
        "dist/",
        "functions/",
        "tests/security/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/coverage/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
