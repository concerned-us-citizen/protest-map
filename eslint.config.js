import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import globals from "globals";

export default [
  js.configs.recommended,

  /* --------------------------------------------------------- *
   * 2)  Project‑wide globals                                  *
   * --------------------------------------------------------- */
  {
    files: ["**/*.{js,ts,tsx,svelte,mjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
  },

  /* --------------------------------------------------------- *
   * 3)  Pure TypeScript source files                          *
   * --------------------------------------------------------- */
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      /* Disable the core rule & replace with TS‑aware version */
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/explicit-function-return-type": "error",
      "no-debugger": "error",
    },
  },

  /* --------------------------------------------------------- *
   * 4)  Svelte component files                                *
   * --------------------------------------------------------- */
  {
    files: ["**/*.svelte"],
    languageOptions: {
      /* The outer parser that understands Svelte single‑file components */
      parser: svelteParser,

      /* Parser used for <script> / <style> blocks inside Svelte */
      parserOptions: {
        parser: tsParser,
        project: "./tsconfig.json",
        sourceType: "module",
        extraFileExtensions: [".svelte"],
      },
    },
    plugins: {
      svelte,
      "@typescript-eslint": tseslint,
    },
    processor: "svelte/svelte",
    rules: {
      /* Same replacement of core rule as in TS block */
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  /* --------------------------------------------------------- *
   * 5)  Global ignores (build output, deps, etc.)             *
   * --------------------------------------------------------- */
  {
    ignores: [
      "**/node_modules/**",
      "**/.svelte-kit/**",
      "**/build/**",
      "**/dist/**",
      "**/.output/**",
    ],
  },
];
