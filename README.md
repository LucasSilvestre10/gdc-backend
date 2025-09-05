# 🚀 GDC Backend - MongoDB com Docker

## 📌 Visão Geral

O projeto já vem configurado com **Docker** e scripts para inicializar rapidamente o **MongoDB** e o **Mongo-Express**.

---

## 🔧 Passo a Passo

### 1. Clonar o repositório

```bash
git clone <repo-url>
cd gdc-backend
```

### 2. Instalar dependências do Node.js

Necessário para rodar o launcher:

```bash
npm install
```

### 3. Subir os containers

Com um único comando:

```bash
npm run config-project
```

Esse comando irá:

* Iniciar os containers do **MongoDB** e **Mongo-Express** em background.
* Exibir logs do **mongo-express** confirmando a inicialização (`docker-compose up finalizou com código 0`).

---

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

* Sair do console do MongoDB com `Ctrl + C`, ou
* Abrir um novo terminal separado.

---

## ▶️ Rodando o Backend (TypeScript / Ts.ED)

Após o Mongo estar online, inicie o backend:

```bash
npm start
```

Saída esperada no console:

```
[INFO ] [TSED] - Listen server on http://0.0.0.0:8083
[INFO ] [TSED] - Swagger UI is available on http://0.0.0.0:8083/doc/
```

---

## 📖 Acessando a Documentação da API

Abra no navegador:

👉 [http://localhost:8083/doc/](http://localhost:8083/doc/)

Aqui você poderá explorar e testar as APIs via Swagger UI.

