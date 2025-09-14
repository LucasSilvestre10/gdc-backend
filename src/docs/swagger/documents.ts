export const DOC_PENDING_DESCRIPTION =
  "Lista documentos pendentes de todos os colaboradores. Permite filtros por status, documentTypeId e paginação via page/limit.";

export const DOC_PENDING_QUERY_PARAMS =
  "Query params: status (active|inactive|all), page (number, default 1), limit (number, default 10), documentTypeId (Mongo ObjectId - 24 caracteres hexadecimais). Ex: ?page=1&limit=10&documentTypeId=68c0a80d...";

export const DOC_PENDING_EXAMPLE = {
  success: true,
  data: [
    {
      employeeId: "68c101cbb740dd18300c30f3",
      employeeName: "Carlos Oliveira",
      documents: [
        {
          documentTypeId: "68c09eb89f7160b6bde944d2",
          documentTypeName: "Cadastro Atualizado",
          status: "PENDING",
          active: true,
        },
        {
          documentTypeId: "68c0b12ee915e716f9c311f7",
          documentTypeName: "Carteira de Trabalho",
          status: "PENDING",
          active: true,
        },
        {
          documentTypeId: "68c0b24f0529be855310c6ad",
          documentTypeName: "Reservista",
          status: "PENDING",
          active: true,
        },
        {
          documentTypeId: "68c0a1e07d886b802d8021b2",
          documentTypeName: "RG",
          status: "PENDING",
          active: true,
        },
      ],
    },
    {
      employeeId: "68c101bcb740dd18300c30ed",
      employeeName: "João Pedro",
      documents: [
        {
          documentTypeId: "68c09eb89f7160b6bde944d2",
          documentTypeName: "Cadastro Atualizado",
          status: "PENDING",
          active: true,
        },
        {
          documentTypeId: "68c0b12ee915e716f9c311f7",
          documentTypeName: "Carteira de Trabalho",
          status: "PENDING",
          active: true,
        },
        {
          documentTypeId: "68c0b159e915e716f9c311fe",
          documentTypeName: "Tipo não encontrado",
          status: "PENDING",
          active: true,
        },
      ],
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 4,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export const DOC_SENT_DESCRIPTION =
  "Lista documentos enviados de todos os colaboradores. Permite filtros por employeeId, documentTypeId e paginação via page/limit.";

export const DOC_SENT_QUERY_PARAMS =
  "Query params: status (active|inactive|all), page (number, default 1), limit (number, default 10), employeeId (string), documentTypeId (Mongo ObjectId - 24 caracteres hexadecimais).";

export const DOC_SENT_EXAMPLE = {
  success: true,
  data: [
    {
      employeeId: "68c101c4b740dd18300c30f0",
      employeeName: "Ana Silva",
      employeeDocument: "555.666.777-88",
      documents: [
        {
          documentTypeId: "68c09eb89f7160b6bde944d2",
          documentTypeName: "Cadastro Atualizado",
          documentValue: "1235554421",
          status: "SENT",
          active: true,
          createdAt: "2025-09-13T05:17:03.281Z",
          updatedAt: "2025-09-13T05:17:23.724Z",
        },
        {
          documentTypeId: "68c0a80d495d1e4c81f0a151",
          documentTypeName: "CNH",
          documentValue: "vinculo2",
          status: "SENT",
          active: true,
          createdAt: "2025-09-13T05:17:53.035Z",
          updatedAt: "2025-09-13T05:17:53.035Z",
        },
      ],
    },
    {
      employeeId: "68c5e9a49d748500370bff7e",
      employeeName: "João Carvalho",
      employeeDocument: "017.729.933-95",
      documents: [
        {
          documentTypeId: "68c0e5717b5fb2e62325bd81",
          documentTypeName: "CPF",
          documentValue: "01772993395",
          status: "SENT",
          active: true,
          createdAt: "2025-09-13T22:10:22.377Z",
          updatedAt: "2025-09-13T22:10:22.377Z",
        },
      ],
    },
  ],
  pagination: {
    page: 1,
    limit: 10,
    total: 3,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export default {};
