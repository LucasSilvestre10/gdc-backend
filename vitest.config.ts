import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./test/setup.ts"],
    coverage: {
      include: ["src"], // verifica cobertura apenas dos arquivos em src/
      exclude: ["test", "node_modules", "config", "src/config", "src/mongo-connection.ts", "src/index.ts", "src/**/*.spec.ts", "src/Server.ts"], // ignora testes, configs e node_modules
      reporter: ["text", "html"]
    }
  }
});
