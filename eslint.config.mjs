import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import globals from "globals";

const typescriptFiles = ["**/*.{ts,tsx,mts,cts}"];
const typescriptRecommended = typescript.configs["flat/recommended"];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "packages/chrome-extension/src/marked.min.js",
    ],
  },
  {
    ...typescript.configs["flat/base"],
    files: typescriptFiles,
  },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        ...globals.node,
        fetch: "readonly",
      },
    },
  },
  ...typescriptRecommended.slice(1).map((config) => ({
    ...config,
    files: typescriptFiles,
  })),
  {
    files: ["packages/chrome-extension/src/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly",
        marked: "readonly",
      },
    },
  },
  {
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
];
