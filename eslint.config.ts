import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    ignores: ["dist/**", "node_modules/**", "coverage/**", "eslint.config.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ---------- Estilo ----------
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "max-classes-per-file": "off", // Desabilitado para permitir múltiplas classes em DTOs e Exceptions

      // ---------- TypeScript ----------
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          vars: "all", // verifica todas as variáveis
          varsIgnorePattern: "^_",
          ignoreRestSiblings: false,
          destructuredArrayIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-function": "off",

      // ---------- Variáveis não utilizadas ----------
      "no-unused-vars": "off", // desabilitado em favor da regra do TypeScript
    },
  }
);
