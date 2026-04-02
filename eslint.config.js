import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2022,
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },
    },
    rules: {
      "no-control-regex": "off",
      "guard-for-in": "warn",
      "object-shorthand": "warn",
    },
  },
  {
    ignores: ["dist/"],
  },
];
