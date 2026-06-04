import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "sst-env.d.ts",
    ".sst",
    ".open-next",
    // Generated coverage report — not project source:
    "coverage/**",
    // Playwright driver — plain JS, not project source:
    ".claude/**",
  ]),
  // Test files: relax no-explicit-any — mock typing with `any` is idiomatic in Vitest.
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Allow _ prefix for intentionally unused destructure targets (e.g. const { foo: _, ...rest } = obj).
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
