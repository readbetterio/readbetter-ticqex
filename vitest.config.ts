import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          exclude: ["node_modules/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.integration.test.ts"],
          exclude: ["node_modules/**"],
          setupFiles: ["tests/setup.integration.ts"],
          fileParallelism: false,
        },
      },
    ],
  },
});
