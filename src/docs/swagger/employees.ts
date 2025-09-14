export const EMP_CREATE_DESCRIPTION =
  "Cria um novo colaborador no sistema. Recebe um objeto com nome, document (formato CPF: 000.000.000-00), e hiredAt (aceita YYYY-MM-DD ou timestamp ISO completo, ex: 2024-06-15T00:00:00.000Z).";

export const EMP_CREATE_EXAMPLE_REQUEST = {
  name: "João Maria",
  document: "111.425.626-77",
  hiredAt: "2024-06-15",
} as const;

export const EMP_CREATE_EXAMPLE_RESPONSE = {
  success: true,
  message: "Colaborador criado com sucesso",
  data: {
    id: "68c73813e869636a11254c10",
    name: "João Maria",
    document: "111.425.626-77",
    hiredAt: "2024-06-15T00:00:00.000Z",
    requiredDocumentTypes: [],
    isActive: true,
    createdAt: "2025-09-14T21:48:03.335Z",
    updatedAt: "2025-09-14T21:48:03.335Z",
  },
  timestamp: "2025-09-14T21:48:03.346Z",
} as const;

export const EMP_LIST_DESCRIPTION = `Retorna uma lista paginada de colaboradores. Query params: page (página atual), limit (itens por página), status (active|inactive|all).`;

export const EMP_LIST_QUERY_PARAMS = {
  page: "Número da página (padrão: 1)",
  limit: "Número de itens por página (padrão: 10)",
  status:
    "Filtrar por status: 'active' | 'inactive' | 'all' (padrão: 'active')",
} as const;

export const EMP_LIST_EXAMPLE = {
  success: true,
  message: "Colaboradores listados com sucesso",
  data: [
    {
      id: "68c0fbb9b94a6e7f227a6a5c",
      name: "Mariana Torres",
      document: "113.455.666-77",
      hiredAt: "2024-06-15T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T04:16:57.287Z",
      updatedAt: "2025-09-14T04:46:49.366Z",
      deletedAt: null,
    },
    {
      id: "68c5fa69ab307d7595ebbc79",
      name: "Thiago Pereira",
      document: "868.972.413-22",
      hiredAt: "2025-09-13T03:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-13T23:12:41.345Z",
      updatedAt: "2025-09-13T23:12:41.345Z",
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasNextPage: true,
    hasPreviousPage: false,
  },
} as const;

export const EMP_SEARCH_DESCRIPTION = `Busca colaboradores por nome ou CPF. Se o parâmetro 'query' for um CPF válido no formato 000.000.000-00, a busca será realizada por CPF exato; caso contrário, será feita busca por nome (case-insensitive). Parâmetros: query (termo), status (active|inactive|all), page, limit.`;

export const EMP_SEARCH_EXAMPLE = {
  success: true,
  message: "Busca realizada com sucesso",
  data: {
    employees: [
      {
        id: "68c73813e869636a11254c10",
        name: "João Maria",
        document: "111.425.626-77",
        hiredAt: "2024-06-15T00:00:00.000Z",
        isActive: true,
        createdAt: "2025-09-14T21:48:03.335Z",
        updatedAt: "2025-09-14T21:48:03.335Z",
        documentationSummary: {
          required: 0,
          sent: 0,
          pending: 0,
          hasRequiredDocuments: false,
          isComplete: false,
        },
      },
      {
        id: "68c101aeb740dd18300c30ea",
        name: "Maria Santos",
        document: "987.654.321-00",
        hiredAt: "2024-02-01T00:00:00.000Z",
        isActive: false,
        createdAt: "2025-09-10T04:42:22.283Z",
        updatedAt: "2025-09-12T18:53:05.582Z",
        documentationSummary: {
          required: 4,
          sent: 0,
          pending: 4,
          hasRequiredDocuments: true,
          isComplete: false,
        },
      },
      {
        id: "68c24bc2c85e79937983a890",
        name: "Maria Silva",
        document: "123.456.789-00",
        hiredAt: "2024-01-15T00:00:00.000Z",
        isActive: true,
        createdAt: "2025-09-11T04:10:42.007Z",
        updatedAt: "2025-09-11T04:10:42.007Z",
        documentationSummary: {
          required: 0,
          sent: 0,
          pending: 0,
          hasRequiredDocuments: false,
          isComplete: false,
        },
      },
      {
        id: "68c49e0807f03f213684d613",
        name: "Mariana Almeida",
        document: "444.555.666-77",
        hiredAt: "2024-07-01T00:00:00.000Z",
        isActive: true,
        createdAt: "2025-09-12T22:26:16.928Z",
        updatedAt: "2025-09-13T02:00:41.336Z",
        documentationSummary: {
          required: 1,
          sent: 0,
          pending: 1,
          hasRequiredDocuments: true,
          isComplete: false,
        },
      },
      {
        id: "68c0fbb9b94a6e7f227a6a5c",
        name: "Mariana Torres",
        document: "113.455.666-77",
        hiredAt: "2024-06-15T00:00:00.000Z",
        isActive: true,
        createdAt: "2025-09-10T04:16:57.287Z",
        updatedAt: "2025-09-14T04:46:49.366Z",
        documentationSummary: {
          required: 10,
          sent: 1,
          pending: 9,
          hasRequiredDocuments: true,
          isComplete: false,
        },
      },
    ],
    pagination: {
      page: 1,
      limit: 20,
      total: 5,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    },
  },
  timestamp: "2025-09-14T21:58:11.089Z",
} as const;

export const EMP_FIND_BY_ID_DESCRIPTION = `Retorna os dados completos de um colaborador pelo seu ID. Parâmetro 'id' deve ter 24 caracteres (ObjectId).`;

export const EMP_FIND_BY_ID_EXAMPLE = {
  success: true,
  message: "Colaborador encontrado com sucesso",
  data: {
    id: "68c73813e869636a11254c10",
    name: "João Maria",
    document: "111.425.626-77",
    hiredAt: "2024-06-15T00:00:00.000Z",
    requiredDocumentTypes: [],
    isActive: true,
    createdAt: "2025-09-14T21:48:03.335Z",
    updatedAt: "2025-09-14T21:48:03.335Z",
  },
  timestamp: "2025-09-14T22:01:48.929Z",
} as const;

export const EMP_UPDATE_DESCRIPTION = `Atualiza os dados de um colaborador. Envie apenas os campos a serem alterados. Parâmetro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_UPDATE_REQUEST_EXAMPLE = {
  name: "João Maria Atualizado",
  document: "111.425.626-77",
  hiredAt: "2023-06-15",
} as const;

export const EMP_UPDATE_RESPONSE_EXAMPLE = {
  success: true,
  message: "Colaborador atualizado com sucesso",
  data: {
    id: "68c73813e869636a11254c10",
    name: "João Maria Atualizado",
    document: "111.425.626-77",
    hiredAt: "2023-06-15T00:00:00.000Z",
    requiredDocumentTypes: [],
    isActive: true,
    createdAt: "2025-09-14T21:48:03.335Z",
    updatedAt: "2025-09-14T22:08:03.809Z",
  },
  timestamp: "2025-09-14T22:08:03.815Z",
} as const;

export const EMP_DELETE_DESCRIPTION = `Remove (soft delete) um colaborador pelo seu ID. Parâmetro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_DELETE_EXAMPLE = {
  success: true,
  message: "Colaborador removido com sucesso",
  data: {
    id: "68c73813e869636a11254c10",
    name: "João Maria",
    document: "111.425.626-77",
    hiredAt: "2023-06-15T00:00:00.000Z",
    requiredDocumentTypes: [],
    isActive: false,
    createdAt: "2025-09-14T21:48:03.335Z",
    updatedAt: "2025-09-14T22:09:40.862Z",
    deletedAt: "2025-09-14T22:09:40.861Z",
  },
  timestamp: "2025-09-14T22:09:40.867Z",
} as const;

export const EMP_LINK_DOCS_DESCRIPTION = `Vincula tipos de documento obrigatórios ao colaborador. Enviar array de documentTypeIds (ObjectId de 24 caracteres) que já foram cadastrados.`;

export const EMP_LINK_DOCS_REQUEST_EXAMPLE = {
  documentTypeIds: ["68c09eb89f7160b6bde944d2", "68c0a80d495d1e4c81f0a151"],
} as const;

export const EMP_LINK_DOCS_RESPONSE_EXAMPLE = {
  success: true,
  message: "Tipos de documento vinculados com sucesso",
  data: null,
  timestamp: "2025-09-14T22:14:28.093Z",
} as const;

export const EMP_REQUIRED_DOCS_LIST_DESCRIPTION = `Lista os vínculos de tipos de documento obrigatórios de um colaborador. Parâmetro 'id' deve ser um ObjectId de 24 caracteres. Parâmetro 'status' aceita: active|inactive|all.`;

export const EMP_REQUIRED_DOCS_LIST_EXAMPLE = {
  success: true,
  message: "Vínculos listados com sucesso",
  data: [
    {
      documentType: {
        id: "68c09eb89f7160b6bde944d2",
        name: "Cadastro Atualizado",
        description: "Documento com descrição fiscal",
      },
      active: false,
      createdAt: "2025-09-14T22:14:28.078Z",
      updatedAt: "2025-09-14T22:14:28.078Z",
    },
    {
      documentType: {
        id: "68c0a80d495d1e4c81f0a151",
        name: "CNH",
        description: "Carteira de Motorista",
      },
      active: true,
      createdAt: "2025-09-14T22:14:28.089Z",
      updatedAt: "2025-09-14T22:14:28.089Z",
    },
  ],
  timestamp: "2025-09-14T22:17:04.069Z",
} as const;

export const EMP_UNLINK_DOC_DESCRIPTION = `Desvincula um tipo de documento obrigatório de um colaborador (soft delete). Parâmetros 'id' e 'documentTypeId' devem ser ObjectId de 24 caracteres.`;

export const EMP_UNLINK_DOC_EXAMPLE = {
  success: true,
  message: "Tipo de documento desvinculado com sucesso",
  data: null,
  timestamp: "2025-09-14T22:20:46.566Z",
} as const;

export const EMP_SEND_DOCUMENT_DESCRIPTION = `Envia um documento do colaborador. A informação textual do documento não discrimina maiúsculas/minúsculas; espaços em branco são removidos automaticamente pelo servidor antes do armazenamento.`;

export const EMP_SEND_DOCUMENT_REQUEST_EXAMPLE = {
  value: "05457485477",
} as const;

export const EMP_SEND_DOCUMENT_RESPONSE_EXAMPLE = {
  success: true,
  message: "Documento enviado com sucesso",
  data: {
    id: "68c7407acedb21a3488349ec",
    value: "05457485477",
    status: "SENT",
    employeeId: "68c73813e869636a11254c10",
    documentTypeId: "68c0a80d495d1e4c81f0a151",
    isActive: true,
    createdAt: "2025-09-14T22:23:54.925Z",
    updatedAt: "2025-09-14T22:23:54.925Z",
  },
  timestamp: "2025-09-14T22:23:54.936Z",
} as const;

export const EMP_SENT_DOCS_LIST_DESCRIPTION = `Lista os documentos enviados de um colaborador com o resumo do funcionário e a lista de documentos (status: SENT). Parâmetro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_SENT_DOCS_LIST_EXAMPLE = {
  success: true,
  message: "Documentos enviados listados com sucesso",
  data: {
    employee: {
      id: "68c73813e869636a11254c10",
      name: "João Maria",
    },
    sentDocuments: {
      total: 1,
      documents: [
        {
          id: "68c7407acedb21a3488349ec",
          documentType: {
            id: "68c0a80d495d1e4c81f0a151",
            name: "CNH",
            description: "Carteira de Motorista",
          },
          status: "SENT",
          value: "D5e1ss7ddDD",
          isActive: true,
          createdAt: "2025-09-14T22:23:54.925Z",
          updatedAt: "2025-09-14T22:23:54.925Z",
        },
      ],
    },
  },
  timestamp: "2025-09-14T22:27:36.680Z",
} as const;

export const EMP_PENDING_DOCS_LIST_DESCRIPTION = `Lista os documentos pendentes de um colaborador com o resumo do funcionário e a lista de documentos pendentes (status: PENDING). Parâmetro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_PENDING_DOCS_LIST_EXAMPLE = {
  success: true,
  message: "Documentos pendentes listados com sucesso",
  data: {
    employee: {
      id: "68c101cbb740dd18300c30f3",
      name: "Carlos Oliveira",
    },
    pendingDocuments: {
      total: 4,
      documents: [
        {
          documentType: {
            id: "68c0b12ee915e716f9c311f7",
            name: "Carteira de Trabalho",
            description: "Carteira de Trabalho e Previdência Social",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-10T05:22:55.129Z",
        },
        {
          documentType: {
            id: "68c0b24f0529be855310c6ad",
            name: "Reservista",
            description: "Certificado de Reservista - Serviço Militar",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-11T17:08:20.498Z",
        },
        {
          documentType: {
            id: "68c09eb89f7160b6bde944d2",
            name: "Cadastro Atualizado",
            description: "Documento com descrição fiscal",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-12T23:19:53.963Z",
        },
        {
          documentType: {
            id: "68c0a1e07d886b802d8021b2",
            name: "RG",
            description: null,
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-13T04:33:01.822Z",
        },
      ],
    },
  },
  timestamp: "2025-09-14T22:30:05.678Z",
} as const;

export const EMP_DOCUMENTATION_OVERVIEW_DESCRIPTION = `Retorna o overview completo da documenta\u00e7\u00e3o obrigat\u00f3ria do colaborador (enviados + pendentes). Par\u00e2metro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_DOCUMENTATION_OVERVIEW_EXAMPLE = {
  success: true,
  data: {
    employee: {
      id: "68c101cbb740dd18300c30f3",
      name: "Carlos Oliveira",
    },
    documentationOverview: {
      summary: {
        total: 4,
        sent: 0,
        pending: 4,
        isComplete: false,
        lastUpdated: "2025-09-14T22:32:10.730Z",
      },
      documents: [
        {
          documentType: {
            id: "68c0b12ee915e716f9c311f7",
            name: "Carteira de Trabalho",
            description: "Carteira de Trabalho e Previd\u00eancia Social",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-10T05:22:55.129Z",
        },
        {
          documentType: {
            id: "68c0b24f0529be855310c6ad",
            name: "Reservista",
            description: "Certificado de Reservista - Servi\u00e7o Militar",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-11T17:08:20.498Z",
        },
        {
          documentType: {
            id: "68c09eb89f7160b6bde944d2",
            name: "Cadastro Atualizado",
            description: "Documento com descri\u00e7\u00e3o fiscal",
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-12T23:19:53.963Z",
        },
        {
          documentType: {
            id: "68c0a1e07d886b802d8021b2",
            name: "RG",
            description: null,
          },
          status: "PENDING",
          value: null,
          isActive: true,
          requiredSince: "2025-09-13T04:33:01.822Z",
        },
      ],
    },
  },
} as const;

export const EMP_RESTORE_DOC_LINK_DESCRIPTION = `Restaura o vínculo de um tipo de documento para um colaborador (undo soft-delete). Parâmetros 'id' e 'documentTypeId' devem ser ObjectId de 24 caracteres.`;

export const EMP_RESTORE_DOC_LINK_EXAMPLE = {
  success: true,
  message: "Vínculo de tipo de documento restaurado com sucesso",
  data: null,
  timestamp: "2025-09-14T22:34:10.428Z",
} as const;

export const EMP_RESTORE_DESCRIPTION = `Restaura (undo soft-delete) um colaborador pelo seu ID. Parâmetro 'id' deve ser um ObjectId de 24 caracteres.`;

export const EMP_RESTORE_EXAMPLE = {
  success: true,
  message: "Colaborador reativado com sucesso",
  data: {
    id: "68c101cbb740dd18300c30f3",
    name: "Carlos Oliveira",
    document: "999.888.777-66",
    hiredAt: "2024-05-20T00:00:00.000Z",
    requiredDocumentTypes: [
      "68c0b12ee915e716f9c311f7",
      "68c0b24f0529be855310c6ad",
      "68c09eb89f7160b6bde944d2",
      "68c0a1e07d886b802d8021b2",
    ],
    isActive: true,
    createdAt: "2025-09-10T04:42:51.419Z",
    updatedAt: "2025-09-14T22:36:16.626Z",
    deletedAt: null,
  },
  timestamp: "2025-09-14T22:36:16.635Z",
} as const;
