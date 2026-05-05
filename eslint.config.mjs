import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "react/no-unescaped-entities": "error",
    },
  },
  {
    files: [
      "src/app/(dashboard)/reparaciones/**/*.tsx",
      "src/components/reparaciones/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [
      "src/app/(dashboard)/caja/**/*.tsx",
      "src/components/caja/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: [
      "src/app/(dashboard)/compras/**/*.tsx",
      "src/components/compras/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
