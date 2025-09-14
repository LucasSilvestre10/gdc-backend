export const DOC_TYPE_CREATE_DESCRIPTION =
  "Cria um novo tipo de documento no sistema. Recebe um objeto JSON com os campos:\n- name (string, obrigatório)\n- description (string, opcional)";

export const DOC_TYPE_CREATE_EXAMPLE = {
  name: "cpf",
  description: "certidão de pessoa física",
};

export const DOC_TYPE_LIST_DESCRIPTION =
  "Lista tipos de documento com suporte a paginação e filtros. Query params disponíveis: page (número da página, padrão: 1), limit (itens por página, padrão: 10), name (filtro por nome - busca parcial, case-insensitive) e status (active | inactive | all, padrão: active). Retorna um resultado paginado contendo 'items' (array de tipos de documento) e metadados de paginação.";

export const DOC_TYPE_LIST_QUERY_PARAMS =
  "Query params: page (number, default: 1), limit (number, default: 10), name (string, partial case-insensitive filter), status (active|inactive|all, default: active). Ex: ?page=1&limit=10&name=cpf&status=active";

export const DOC_TYPE_LIST_EXAMPLE = {
  success: true,
  data: {
    items: [
      {
        id: "68c0a80d495d1e4c81f0a151",
        name: "CNH",
        description: "",
        isActive: true,
        createdAt: "2025-09-09T22:19:57.605Z",
        updatedAt: "2025-09-09T22:19:57.605Z",
        __v: 0,
      },
      {
        id: "68c471463efe98c9bc880f69",
        name: "Documento Complementar",
        description: "Documento complementar genérico",
        isActive: true,
        createdAt: "2025-09-12T19:15:18.600Z",
        updatedAt: "2025-09-12T19:15:18.600Z",
      },
    ],
    page: 1,
    limit: 10,
    total: 31,
    totalPages: 4,
    hasNextPage: true,
    hasPreviousPage: false,
  },
};

export const DOC_TYPE_400_EXAMPLE = {
  success: false,
  message: "Name is required",
  error: {
    type: "BAD_REQUEST",
    code: "BAD_REQUEST",
    timestamp: new Date().toISOString(),
    path: "/rest/document-types",
    method: "POST",
  },
  stack: [],
  details: { name: "BAD_REQUEST", message: "Name is required" },
};

export const DOC_TYPE_CREATE_RESPONSE_EXAMPLE = {
  success: true,
  message: "Tipo de documento criado com sucesso",
  data: {
    id: "68c701f1ba64383089ef6c26",
    name: "CPF",
    description: "certidão de pessoa física",
    isActive: true,
  },
  timestamp: new Date().toISOString(),
};

export const DOC_TYPE_GET_BY_ID_DESCRIPTION = `Retorna os dados completos de um tipo de documento identificado pelo parâmetro \`id\`.
O parâmetro \`id\` deve ser um ObjectId Mongo válido (24 caracteres hexadecimais).
Retorna 404 quando o recurso não for encontrado.`;

export const DOC_TYPE_GET_BY_ID_EXAMPLE = {
  success: true,
  message: "Tipo de documento encontrado com sucesso",
  data: {
    id: "68c0e5717b5fb2e62325bd81",
    name: "CPF",
    description: "Cadastro de Pessoa Física",
    isActive: true,
    createdAt: "2025-09-10T02:41:53.472Z",
    updatedAt: "2025-09-10T02:41:53.472Z",
  },
  timestamp: new Date().toISOString(),
};

export const DOC_TYPE_UPDATE_DESCRIPTION = `Atualiza os campos de um tipo de documento. Recebe um objeto com os campos opcionais: name e description.
O parâmetro \`id\` na rota deve ser um ObjectId Mongo válido (24 caracteres hexadecimais).`;

export const DOC_TYPE_CREATE_EXAMPLE_REQUEST = {
  name: "RG",
  description: "Registro Geral atualizado",
};

export const DOC_TYPE_UPDATE_EXAMPLE = {
  name: "CNH",
  description: "Carteira de Motorista",
};

export const DOC_TYPE_UPDATE_EXAMPLE_RESPONSE = {
  success: true,
  message: "Tipo de documento atualizado com sucesso",
  data: {
    id: "68c0a80d495d1e4c81f0a151",
    name: "CNH",
    description: "Carteira de Motorista",
    isActive: true,
    createdAt: "2025-09-09T22:19:57.605Z",
    updatedAt: "2025-09-14T21:10:10.584Z",
  },
  timestamp: "2025-09-14T21:10:10.592Z",
};

export const DOC_TYPE_DELETE_DESCRIPTION = `Remove (soft delete) um tipo de documento do sistema. O parâmetro \`id\` na rota deve ser um ObjectId Mongo válido (24 caracteres hexadecimais).`;

export const DOC_TYPE_DELETE_EXAMPLE = {
  success: true,
  message: "Tipo de documento removido com sucesso",
  data: {
    id: "68c0a80d495d1e4c81f0a151",
    name: "CNH",
    description: "Carteira de Motorista",
    isActive: false,
    createdAt: "2025-09-09T22:19:57.605Z",
    updatedAt: "2025-09-14T21:26:25.517Z",
    deletedAt: "2025-09-14T21:26:25.517Z",
  },
  timestamp: "2025-09-14T21:26:25.523Z",
};

export const DOC_TYPE_RESTORE_DESCRIPTION =
  "Restaura um tipo de documento previamente removido (soft delete). O endpoint reverte o campo `isActive` para `true` e limpa `deletedAt`.";

export const DOC_TYPE_RESTORE_EXAMPLE = {
  success: true,
  message: "Tipo de documento reativado com sucesso",
  data: {
    id: "68c0a80d495d1e4c81f0a151",
    name: "CNH",
    description: "Carteira de Motorista",
    isActive: true,
    createdAt: "2025-09-09T22:19:57.605Z",
    updatedAt: "2025-09-14T21:32:20.604Z",
    deletedAt: null,
  },
  timestamp: "2025-09-14T21:32:20.613Z",
};

export default {};

export const DOC_TYPE_LINKED_EMPLOYEES_DESCRIPTION =
  "Retorna os colaboradores vinculados a um tipo de documento. Suporta paginação via query params page e limit.";

export const DOC_TYPE_LINKED_EMPLOYEES_QUERY_PARAMS =
  "Query params: page (number, default: 1), limit (number, default: 10). Ex: ?page=1&limit=10";

export const DOC_TYPE_LINKED_EMPLOYEES_EXAMPLE = {
  success: true,
  message: "Colaboradores vinculados ao tipo de documento listados com sucesso",
  data: [
    {
      items: [
        {
          id: "68c101c4b740dd18300c30f0",
          name: "Ana Silva",
          document: "555.666.777-88",
          hiredAt: "2024-04-10T00:00:00.000Z",
          requiredDocumentTypes: [
            "68c09eb89f7160b6bde944d2",
            "68c0a80d495d1e4c81f0a151",
          ],
          isActive: true,
          createdAt: "2025-09-10T04:42:44.431Z",
          updatedAt: "2025-09-13T05:17:03.284Z",
        },
        {
          id: "68c49e0807f03f213684d613",
          name: "Mariana Almeida",
          document: "444.555.666-77",
          hiredAt: "2024-07-01T00:00:00.000Z",
          requiredDocumentTypes: ["68c0a80d495d1e4c81f0a151"],
          isActive: true,
          createdAt: "2025-09-12T22:26:16.928Z",
          updatedAt: "2025-09-13T02:00:41.336Z",
          deletedAt: null,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    },
  ],
};
