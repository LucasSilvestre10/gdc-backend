import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      include: ["src"], // verifica cobertura apenas dos arquivos em src/
      exclude: [
        "test",
        "node_modules",
        "config",
        "src/config",
        "src/mongo-connection.ts",
        "src/models/**",
        "src/exceptions/**",
        "src/middleware/**",
        "src/index.ts",
        "src/**/index.ts",
        "src/**/*.spec.ts",
        "src/Server.ts",
        "src/controllers/rest/index.ts",
        "src/controllers/rest/HealthController.ts",
        "src/utils/**",
        "src/dtos/**", // ignora DTOs - estruturas de dados sem lógica
        "src/types/**", // ignora types - definições de tipos sem lógica de negócio
      ], // ignora testes, configs, DTOs, types e node_modules
      reporter: ["text", "html"],
    },
  },
});
