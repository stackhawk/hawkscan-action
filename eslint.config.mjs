import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores(["**/dist/"]),
  {
    extends: compat.extends("eslint:recommended"),
    ignores: ["dist/", "eslint.config.mjs", "eslint.config.js"],
    languageOptions: {
      globals: {
        ...globals.commonjs,
        ...globals.jest,
        ...globals.node,
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
      },

      ecmaVersion: 2018,
      sourceType: "commonjs",
    },

    rules: {
      "no-control-regex": 0,
      "guard-for-in": "warn",
      "object-shorthand": "warn",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
]);
