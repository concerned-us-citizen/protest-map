import prettier from "eslint-config-prettier";
import js from "@eslint/js";
import { includeIgnoreFile } from "@eslint/compat";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import globals from "globals";
import { fileURLToPath } from "node:url";
import ts from "typescript-eslint";
const gitignorePath = fileURLToPath(new URL("./.gitignore", import.meta.url));

export default ts.config(
  includeIgnoreFile(gitignorePath),
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs["flat/recommended"],
  prettier,
  ...svelte.configs["flat/prettier"],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.svelte"],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: ts.parser,
        ecmaVersion: 2020,
        sourceType: "module",
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "svelte/valid-compile": "error",
      // Crucial: Turn off the core ESLint no-unused-vars,
      // as @typescript-eslint/no-unused-vars will be used instead.
      "no-unused-vars": "off",
      // IMPORTANT: Configure @typescript-eslint/no-unused-vars for Svelte files
      // This override will apply to Svelte files.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_", // This is key for your '_' in #each
          // You might also want these for robustness:
          // ignoreRestSiblings: true,
          // caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // ✅ shared rule override for .ts files primarily,
    // though the .svelte block above will override no-unused-vars for svelte files.
    files: ["**/*.ts"], // Explicitly target .ts files for this block
    rules: {
      // Make sure @typescript-eslint/no-unused-vars is configured for .ts files too
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          // ignoreRestSiblings: true,
          // caughtErrorsIgnorePattern: "^_",
        },
      ],
      "no-undef": "off", // This is fine for both, but better in the shared block if it applies to both
    },
  },
  {
    // ✅ shared rule override to apply consistent linting across both
    files: ["**/*.ts", "**/*.svelte"],
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "off",
    },
  }
);
