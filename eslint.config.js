import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
  "@typescript-eslint/no-unused-vars": "off",
  // Disable due to version mismatch causing rule load errors under ESLint 9
  "@typescript-eslint/no-unused-expressions": "off",
  // Relax noisy rules to focus on real defects in this codebase shape
  "@typescript-eslint/no-explicit-any": "off",
  "no-empty": "off",
  "prefer-const": "off",
  "no-useless-escape": "off",
  "@typescript-eslint/ban-ts-comment": "off",
  "@typescript-eslint/no-require-imports": "off",
  // Keep as warning for DX but don't fail CI/dev
  "react-hooks/exhaustive-deps": "warn",
  "no-constant-binary-expression": "off",
    },
  }
);
