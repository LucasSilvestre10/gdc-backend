# 📋 API de Tipos de Documento

Esta documentação descreve os endpoints da API para gerenciamento de tipos de documentos obrigatórios.

## 🚀 Endpoints Disponíveis

### 1. **GET** `/rest/document-types` - Listar tipos de documento

Lista tipos de documento com filtros avançados e paginação.

#### **Parâmetros de Query (todos opcionais):**

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|---------|-----------|
| `page` | number | `1` | Número da página (mínimo: 1) |
| `limit` | number | `10` | Itens por página (1-100) |
| `name` | string | - | Filtro por nome (busca parcial, case-insensitive) |
| `status` | string | `"active"` | Filtro por status dos registros |

#### **Opções de Status:**

| Valor | Descrição |
|-------|-----------|
| `"active"` | **Padrão** - Apenas registros ativos |
| `"inactive"` | Apenas registros inativos (soft deleted) |
| `"all"` | Todos os registros (ativos + inativos) |

#### **Exemplos de Uso:**

```bash
# Listar apenas ativos (comportamento padrão)
GET /rest/document-types

# Listar apenas inativos
GET /rest/document-types?status=inactive

# Listar todos os registros (ativos + inativos)
GET /rest/document-types?status=all

# Buscar "cpf" apenas nos registros ativos
GET /rest/document-types?name=cpf

# Buscar "cpf" em todos os registros (ativos + inativos)
GET /rest/document-types?name=cpf&status=all

# Listar página 2 com 5 itens por página
GET /rest/document-types?page=2&limit=5

# Combinação completa de filtros
GET /rest/document-types?name=pass&status=all&page=1&limit=10
```

#### **Exemplo de Resposta:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "CPF",
      "description": "Cadastro de Pessoa Física",
      "isActive": true,
      "createdAt": "2023-07-21T10:30:00.000Z",
      "updatedAt": "2023-07-21T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "RG", 
      "description": "Registro Geral",
      "isActive": true,
      "createdAt": "2023-07-21T11:15:00.000Z",
      "updatedAt": "2023-07-21T11:15:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

#### **Exemplo com Registros Inativos:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "CNPJ",
      "description": "Cadastro Nacional Pessoa Jurídica", 
      "isActive": false,
      "createdAt": "2023-07-20T09:00:00.000Z",
      "updatedAt": "2023-07-21T14:30:00.000Z",
      "deletedAt": "2023-07-21T14:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### 2. **POST** `/rest/document-types` - Criar tipo de documento

Cria um novo tipo de documento no sistema.

#### **Campos da Requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ Sim | Nome único do tipo de documento |
| `description` | string | ❌ Não | Descrição detalhada do tipo de documento |

#### **Body da Requisição:**

```json
{
  "name": "CPF",
  "description": "Cadastro de Pessoa Física"
}
```

#### **Exemplo de Resposta (201 Created):**

```json
{
  "success": true,
  "message": "Tipo de documento criado com sucesso",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "CPF",
    "description": "Cadastro de Pessoa Física",
    "isActive": true,
    "createdAt": "2023-07-21T10:30:00.000Z",
    "updatedAt": "2023-07-21T10:30:00.000Z"
  }
}
```

### 3. **PUT** `/rest/document-types/{id}` - Atualizar tipo de documento

Atualiza os dados de um tipo de documento existente.

#### **Parâmetros da URL:**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | string | ID único do tipo de documento |

#### **Campos da Requisição:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ❌ Não | Novo nome do tipo de documento |
| `description` | string | ❌ Não | Nova descrição do tipo de documento |

#### **Body da Requisição:**

```json
{
  "name": "RG",
  "description": "Registro Geral - Documento de identidade"
}
```

#### **Exemplo de Resposta (200 OK):**

```json
{
  "success": true,
  "message": "Tipo de documento atualizado com sucesso",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "RG",
    "description": "Registro Geral - Documento de identidade",
    "isActive": true,
    "createdAt": "2023-07-21T10:30:00.000Z",
    "updatedAt": "2023-07-21T12:45:00.000Z"
  }
}
```

#### **Exemplo de Resposta (404 Not Found):**

```json
{
  "success": false,
  "message": "Tipo de documento não encontrado",
  "data": null
}
```

## 🔍 **Funcionalidades de Busca**

### **Busca por Nome (Case-Insensitive e Parcial)**

O filtro `name` oferece busca avançada:

- ✅ **Case-insensitive**: `"cpf"` encontra `"CPF"`, `"Cpf"`, `"cPf"`
- ✅ **Busca parcial**: `"pass"` encontra `"Passaporte"`
- ✅ **Busca por siglas**: `"pj"` encontra `"CNPJ"`

### **Exemplos Práticos:**

| Query | Resultado |
|-------|-----------|
| `?name=cpf` | Encontra: CPF, CNPJ (contém "cpf") |
| `?name=pass` | Encontra: Passaporte |
| `?name=CNPJ` | Encontra: CNPJ, cnpj |
| `?name=pj` | Encontra: CNPJ (contém "pj") |

## ✅ **Validações e Regras de Negócio**

### **Campo Name**
- ✅ **Obrigatório** para criação
- ✅ **Único** no sistema (case-insensitive)
- ✅ **Trimmed** automaticamente (remove espaços extras)
- ❌ Não pode ser vazio ou apenas espaços

### **Campo Description**
- ❌ **Opcional** para criação e atualização
- ✅ **Trimmed** automaticamente (remove espaços extras)
- ✅ Pode ser vazio ou não informado
- ✅ Suporta texto longo para descrições detalhadas

### **Regras de Atualização**
- ✅ Apenas tipos **ativos** podem ser atualizados
- ✅ Nome deve permanecer **único** após atualização
- ✅ Campos não informados no PUT **não são alterados**
- ✅ Timestamp `updatedAt` é atualizado automaticamente

## 🏷️ **Gestão de Status**

### **Soft Delete Pattern**

O sistema implementa soft delete, mantendo registros no banco mas marcando como inativos:

- **Ativos** (`isActive: true`): Registros disponíveis para uso
- **Inativos** (`isActive: false`): Registros "deletados" mas preservados no banco
- **deletedAt**: Timestamp de quando foi desativado (apenas em inativos)

### **Casos de Uso:**

1. **Administração geral** → `?status=active` (padrão)
2. **Auditoria e histórico** → `?status=inactive` 
3. **Relatórios completos** → `?status=all`
4. **Reativação de tipos** → `?status=inactive` + endpoint restore

## 🔧 **Códigos de Status HTTP**

| Status | Descrição |
|--------|-----------|
| `200 OK` | Lista retornada com sucesso |
| `201 Created` | Tipo de documento criado |
| `400 Bad Request` | Dados inválidos ou nome duplicado |
| `404 Not Found` | Tipo de documento não encontrado |
| `500 Internal Server Error` | Erro interno do servidor |

## 📊 **Swagger/OpenAPI**

Acesse a documentação interativa em: **http://localhost:8083/doc/**

A documentação Swagger inclui:
- ✅ Descrições detalhadas de cada endpoint
- ✅ Exemplos de requisições e respostas
- ✅ Parâmetros de query documentados
- ✅ Esquemas de dados completos
- ✅ Interface para testar endpoints diretamente
