# 🚀 GDC Backend - MongoDB com Docker

> Nota: a documentação do código e os testes neste repositório foram escritos em português para facilitar o entendimento do MVP. Idealmente, a documentação deveria estar em inglês para garantir maior alcance.

## 📌 Visão Geral

O projeto já vem configurado com **Docker** e scripts para inicializar rapidamente o **MongoDB** e o **Mongo-Express**.

## 🛠️ Requisitos mínimos

Antes de executar o projeto, confirme que sua máquina atende aos requisitos abaixo:

- Docker instalado (recomendado Docker Desktop) — versão 20.10+ com Compose V2.
- Docker Compose (separado) ou suporte integrado do Docker Desktop.
- Node.js 24+ (para desenvolver localmente) e npm 8+ se for executar `npm start` fora do container.
- Memória disponível mínima: 1 GB livre para containers (recomendado 2 GB se executar app + mongo juntos).
- Espaço em disco: ~500 MB para projeto + espaço para dados do MongoDB.
- Portas usadas (host → container):
  - 8083 → 8083 (API)
  - 8081 → 8081 (mongo-express GUI)
  - 27017 → 27017 (MongoDB)

Se seu ambiente for Windows, é recomendado habilitar compartilhamento de arquivos no Docker Desktop para montar o código no container.

---

## 🔧 Passo a Passo

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd gdc-backend
```

### 2. Instalar dependências do Node.js

Necessário para rodar o launcher e comandos locais:

```bash
npm install
```

> Observação: execute `npm install` antes de `npm start` para garantir que bins de desenvolvimento (ex.: barrels, nodemon) estejam disponíveis.

### 3. Execução (duas formas)

Escolha uma das duas formas para abrir a instrução detalhada.

---

### Forma 1 — Apenas banco no Docker

<details>
<summary>Instrução rápida (clique para expandir)</summary>

Use esta forma se você quer apenas iniciar o banco e a interface do mongo:

```powershell
npm run start-db
```

Exemplo do console (build banco) — saída típica:

```
PS C:\WorkSpace\gdc-backend> npm run start-db

> gdc-backend@1.0.0 start-db
> docker compose -f docker-compose-db.yml up --build -d

time="2025-09-14T06:07:16-03:00" level=warning msg="C:\\WorkSpace\\gdc-backend\\docker-compose-db.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
time="2025-09-14T06:07:17-03:00" level=warning msg="Found orphan containers ([gdc-container-app]) for this project. If you removed or renamed this service in your compose file, you can run this command with the --remove-orphans flag to clean it up."
[+] Running 2/2
 ✔ Container local-mongo    Healthy
 ✔ Container mongo-express  Started
```

Isso iniciará os serviços `local-mongo` e `mongo-express`.

## ✅ Verificando se o MongoDB está online

Após subir os containers, rode:

```bash
docker exec -it local-mongo mongosh -u admin -p secret --authenticationDatabase admin
```

Você verá uma saída parecida com:

```
Using MongoDB: 6.0.26
Using Mongosh: 2.5.7
test>
```

Agora execute:

```bash
db.adminCommand('ping')
```

Resultado esperado:

```
{ ok: 1 }
```

👉 Indica que o banco está pronto para uso!

⚠️ **Importante:** para rodar o backend, você deve:

- Sair do console do MongoDB com `Ctrl + C`, ou
- Abrir um novo terminal separado.

---

**Importar seeds (opcional)**  
Após subir o Mongo, você pode importar os seeds com:

```powershell
# import padrão (usa defaults: container local-mongo, DB appdb)
npm run seed

# para forçar limpeza antes do import (DESTRUTIVO)
WIPE_BEFORE_IMPORT=1 MONGO_CONTAINER=local-mongo SEED_DB=appdb npm run seed
```

Mongo Express (GUI) ficará disponível em: http://localhost:8081 (usuário: admin / senha: secret)

### Rodar o backend localmente (fora do container)

Com o banco em execução (Forma 1), você pode executar o servidor localmente na sua máquina (útil para debug):

1. Instale dependências (se ainda não instalou):

```powershell
npm install
```

2. Inicie o backend:

Após o Mongo estar online, inicie o backend:

```bash
npm start
```

Saída esperada no console:

```
[INFO ] [TSED] - Listen server on http://0.0.0.0:8083
[INFO ] [TSED] - Swagger UI is available on http://0.0.0.0:8083/doc/
```

O servidor ficará disponível em: http://localhost:8083/rest

</details>

### Forma 2 — Banco + servidor no container (recomendada)

<details>
<summary>Instrução rápida (clique para expandir)</summary>

Use esta forma se você quer subir o banco e executar o servidor dentro de um container (tudo via Docker).

Você pode usar o atalho npm já disponível para isso:

```powershell
npm run start-app
```

Exemplo do console (build + start) — saída típica:

```
PS C:\WorkSpace\gdc-backend> npm run start-app

> gdc-backend@1.0.0 start-app
> docker compose -f docker-compose-app.yml up --build -d

time="2025-09-14T05:42:51-03:00" level=warning msg="C:\\WorkSpace\\gdc-backend\\docker-compose-app.yml: the attribute `version` is obsolete, it will be ignored, please remove it to avoid potential confusion"
[+] Building 73.2s (19/19) FINISHED
 => [build 4/7] RUN npm ci
 ...
 => => naming to docker.io/library/gdc-backend-app:latest
[+] Running 4/4
 ✔ gdc-backend-app              Built
 ✔ Container gdc-container-app  Started
 ✔ Container local-mongo        Healthy
 ✔ Container mongo-express      Started
```

Após o build e start do container, acompanhe os logs:

```powershell
npm run logs
# equivalente:
docker compose -f docker-compose-app.yml logs -f gdc-container-app
```

Logs esperados do servidor (após containers prontos):

```
[INFO ] [TSED] - Listen server on http://0.0.0.0:8083
[INFO ] [TSED] - Swagger UI is available on http://0.0.0.0:8083/doc/
```

**Importar seeds (opcional)**  
Você pode importar os seeds imediatamente após subir os containers (usa `appdb` por padrão):

```powershell
# forma curta (usa tools/import-seeds.cjs)
npm run seed

# limpar explicitamente coleções antes do import (DESTRUTIVO)
WIPE_BEFORE_IMPORT=1 MONGO_CONTAINER=local-mongo SEED_DB=appdb npm run seed
```

Healthcheck: http://localhost:8083/rest/health

</details>

---

## 📖 Acessando a Documentação da API

Abra no navegador:

👉 [http://localhost:8083/doc/](http://localhost:8083/doc/)

Aqui você poderá explorar e testar as APIs via Swagger UI.

Também disponibilizamos uma Postman collection para importar e executar exemplos de chamadas rapidamente:

- Collection: `postman/gdc-backend.postman_collection.json`

Importe no Postman via File → Import

---

## 🧩 Comandos úteis (DB-only e App-and-DB)

Scripts npm disponíveis (valide no `package.json`):

- `npm run start-db` — inicia `local-mongo` e `mongo-express` em background (equivale a `docker compose -f docker-compose-db.yml up --build -d`).
- `npm run start-app` — inicia banco e app em container (`gdc-container-app`) usando `docker compose -f docker-compose-app.yml up --build -d`.
- `npm run seed` — importa os arquivos JSON da pasta `seed` para o banco definido em `SEED_DB` (default `appdb`). Use `WIPE_BEFORE_IMPORT=1` para apagar coleções explicitamente antes do import.

Fluxos comuns:

- Levantar banco e app (útil para testar imagem produzida): `npm run start-app`.
- Levantar apenas o DB: `npm run start-db`.

Seed behavior note:

- A aplicação não aplica seeds automaticamente no boot — prefira usar
  `npm run seed` para controlar quando os dados são aplicados durante testes e avaliações.

---

## Acompanhar logs do servidor no container

Para seguir os logs do servidor em tempo real use o script npm:

```powershell
npm run logs
# equivalente: docker compose -f docker-compose-app.yml logs -f gdc-container-app
```

Pressione Ctrl+C para sair da visualização dos logs.
