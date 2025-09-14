#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable no-undef, @typescript-eslint/no-require-imports */
/*
 * import-seeds.cjs
 * ----------------
 * Utilitário simples para copiar a pasta `seed/` do repositório para dentro
 * do container do MongoDB e executar `mongoimport` para cada arquivo JSON
 * encontrado. Projetado para facilitar testes locais e avaliações quando o
 * container da aplicação não está em execução.
 *
 * O que faz:
 * - copia `${repoRoot}/seed` para `/seed` dentro do container do Mongo (via `docker cp`)
 * - lista os arquivos na pasta `/seed` do container
 * - para cada arquivo `*.json` executa `mongoimport --drop --jsonArray` na
 *   coleção com mesmo nome do arquivo (ex: `employees.json` -> coleção `employees`)
 *
 * Variáveis de ambiente (opcionais):
 * - MONGO_CONTAINER: nome do container mongo (default: local-mongo)
 * - SEED_DB: nome do banco onde os arquivos serão importados (default: seed_test)
 * - MONGO_USER: usuário do Mongo (default: admin)
 * - MONGO_PASS: senha do Mongo (default: secret)
 *
 * Avisos / comportamento:
 * - `mongoimport` é chamado com `--drop`, portanto a coleção será removida e
 *   recriada a cada import (útil para testes idempotentes, mas destrutivo em
 *   ambientes com dados de produção)
 * - espera-se que o container Mongo aceite conexões via usuário/senha fornecidos
 *   e que o binário `mongoimport` esteja presente na imagem do container (imagens
 *   oficiais do Mongo incluem).
 * - o utilitário usa `docker exec`/`docker cp` e, portanto, requer que o host
 *   onde o script roda tenha permissão para executar comandos Docker.
 *
 * Exemplo de uso (na raiz do repositório):
 *   MONGO_CONTAINER=local-mongo SEED_DB=seed_test npm run seed:import
 *
 * Segurança:
 * - Não embarque credenciais reais neste arquivo. Prefira variáveis de ambiente
 *   seguras no CI ou segredos do sistema.
 */

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Diretório do repositório (onde este script é executado). Espera-se que haja
// uma pasta `seed/` na raiz contendo arquivos JSON (arrays) para importar.
const repoRoot = process.cwd();
const seedDir = path.join(repoRoot, "seed");

// Configuráveis via ambiente
const container = process.env.MONGO_CONTAINER || "local-mongo";
const db = process.env.SEED_DB || "appdb";
const user = process.env.MONGO_USER || "admin";
const pass = process.env.MONGO_PASS || "secret";

// Se definido (ex: '1' ou 'true'), o script tentará apagar explicitamente as
// coleções antes de executar o `mongoimport`. Isso é útil como passo de
// recuperação em testes, porém é destrutivo — use com cautela.
const wipeBeforeImportRaw =
  process.env.WIPE_BEFORE_IMPORT || process.env.WIPE_BEFORE || "";
const WIPE_BEFORE_IMPORT = ["1", "true", "yes"].includes(
  wipeBeforeImportRaw.toLowerCase()
);

function run(cmd) {
  console.log("> ", cmd);
  return execSync(cmd, { stdio: "inherit" });
}

try {
  // Verifica se a pasta de seeds existe no host antes de tentar copiar
  if (!fs.existsSync(seedDir)) {
    console.error(
      `import-seeds: diretório de seeds não encontrado em: ${seedDir}`
    );
    console.error(
      "Coloque seus arquivos JSON em uma pasta `seed/` na raiz do repositório ou ajuste o caminho."
    );
    process.exit(1);
  }

  // 1) Copia a pasta seed/ para dentro do container na raiz /seed
  run(`docker cp "${seedDir}" ${container}:/seed`);

  // 2) Lista arquivos dentro do /seed do container
  const files = execSync(`docker exec ${container} ls /seed`)
    .toString()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  for (const f of files) {
    // só processa arquivos JSON
    if (!f.toLowerCase().endsWith(".json")) continue;
    const coll = f.replace(/\.json$/i, "");

    // opcionalmente faz um drop explícito antes de importar
    if (WIPE_BEFORE_IMPORT) {
      console.log(
        `> WIPE_BEFORE_IMPORT ativo: apagando coleção ${coll} em ${db}`
      );
      const dropCmd = `docker exec ${container} mongosh --username ${user} --password ${pass} --authenticationDatabase admin --eval "db.getSiblingDB('${db}').${coll}.drop()"`;
      try {
        run(dropCmd);
      } catch (dropErr) {
        // não interrompe o fluxo — relatamos e continuamos para o import
        console.warn(
          `Falha ao tentar dropar coleção ${coll}:`,
          dropErr && dropErr.message ? dropErr.message : dropErr
        );
      }
    }

    // Executa mongoimport com --drop e --jsonArray (mantemos --drop como
    // garantia extra; WIPE_BEFORE_IMPORT apenas adiciona um passo explícito)
    const cmd = `docker exec ${container} mongoimport --username ${user} --password ${pass} --authenticationDatabase admin --db ${db} --collection ${coll} --drop --jsonArray --file /seed/${f}`;
    run(cmd);
  }

  console.log("Seeds import finished");
} catch (err) {
  console.error("import-seeds failed", err);
  process.exit(1);
}
