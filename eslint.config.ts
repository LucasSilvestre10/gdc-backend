import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Configuração específica para o arquivo de configuração do ESLint (sem parserOptions.project)
  {
    files: ["eslint.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // Configuração principal para arquivos TypeScript (exceto eslint.config.ts)
  {
    files: ["**/*.{ts,mts,cts}"],
    ignores: ["eslint.config.ts"],
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

      // ---------- JavaScript/Geral - Convertendo para warnings ----------
      "no-prototype-builtins": "warn",

      // ---------- TypeScript - Convertendo erros para warnings ----------
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          vars: "all", // verifica todas as variáveis
          varsIgnorePattern: "^_",
          ignoreRestSiblings: false,
          destructuredArrayIgnorePattern: "^_",
          // Configuração específica para detectar métodos órfãos
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-empty-function": "off",

      // Convertendo outras regras comuns de error para warn (apenas as que existem)
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/prefer-as-const": "warn",

      // ---------- Métodos órfãos (não utilizados) ----------
      // NOTA: ESLint não detecta métodos de classe não utilizados nativamente
      // Para detectar métodos órfãos, considere usar:
      // 1. ts-unused-exports (ferramenta externa)
      // 2. Análise manual durante code review
      // 3. Configuração customizada com AST parsing
      // A regra @typescript-eslint/no-unused-vars detecta apenas funções e variáveis soltas

      // ---------- Variáveis não utilizadas ----------
      "no-unused-vars": "off", // desabilitado em favor da regra do TypeScript
    },
  },
  // Configuração específica para arquivos de teste
  {
    files: ["**/*.spec.ts", "**/*.test.ts", "**/test/**/*.ts"],
    rules: {
      // Permite uso de `any` em testes
      "@typescript-eslint/no-explicit-any": "off",

      // Permite uso de non-null assertion operator em testes
      "@typescript-eslint/no-non-null-assertion": "off",

      // Relaxa regras de variáveis não utilizadas em testes
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",

      // Permite expressões não utilizadas em testes (útil para expects)
      "@typescript-eslint/no-unused-expressions": "off",

      // Permite objetos vazios em mocks
      "@typescript-eslint/no-empty-object-type": "off",

      // Permite funções vazias em mocks
      "@typescript-eslint/no-empty-function": "off",

      // Permite require() em testes para mocks dinâmicos
      "@typescript-eslint/no-require-imports": "off",

      // Permite console.log em testes para debug
      "no-console": "off",

      // Permite magic numbers em testes
      "@typescript-eslint/no-magic-numbers": "off",
    },
  }
);
