export const employeesListMock = {
  success: true,
  message: "Colaboradores listados com sucesso",
  data: [
    {
      id: "68c0fbb9b94a6e7f227a6a5c",
      name: "João Silva Atualizado",
      document: "999.888.777-55",
      hiredAt: "2024-01-10T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T04:16:57.287Z",
      updatedAt: "2025-09-12T21:56:55.130Z",
      deletedAt: null,
    },
    {
      id: "68c101aeb740dd18300c30ea",
      name: "Maria Santos",
      document: "987.654.321-00",
      hiredAt: "2024-02-01T00:00:00.000Z",
      isActive: false,
      createdAt: "2025-09-10T04:42:22.283Z",
      updatedAt: "2025-09-12T18:53:05.582Z",
      deletedAt: "2025-09-12T18:53:05.581Z",
    },
    {
      id: "68c101bcb740dd18300c30ed",
      name: "João Pedro",
      document: "111.222.333-44",
      hiredAt: "2024-03-15T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T04:42:36.145Z",
      updatedAt: "2025-09-12T21:58:18.890Z",
    },
    {
      id: "68c101c4b740dd18300c30f0",
      name: "Ana Silva",
      document: "555.666.777-88",
      hiredAt: "2024-04-10T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T04:42:44.431Z",
      updatedAt: "2025-09-13T05:17:03.284Z",
    },
    {
      id: "68c101cbb740dd18300c30f3",
      name: "Carlos Oliveira",
      document: "999.888.777-66",
      hiredAt: "2024-05-20T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T04:42:51.419Z",
      updatedAt: "2025-09-13T04:33:01.830Z",
    },
    {
      id: "68c10783ebb83a215af9fd87",
      name: "Colaborador Inativo",
      document: "000.000.000-00",
      hiredAt: "2024-01-01T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-10T05:07:15.430Z",
      updatedAt: "2025-09-10T05:12:34.091Z",
      deletedAt: null,
    },
    {
      id: "68c24a4cc85e79937983a83d",
      name: "João Silva",
      document: "123.456.789-01",
      hiredAt: "2024-01-15T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-11T04:04:28.461Z",
      updatedAt: "2025-09-11T04:04:28.461Z",
    },
    {
      id: "68c24bc2c85e79937983a890",
      name: "Maria Silva",
      document: "123.456.789-00",
      hiredAt: "2024-01-15T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-11T04:10:42.007Z",
      updatedAt: "2025-09-11T04:10:42.007Z",
    },
    {
      id: "68c46f363efe98c9bc880e5d",
      name: "João Silva",
      document: "072.147.852-77",
      hiredAt: "2024-01-10T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-12T19:06:30.577Z",
      updatedAt: "2025-09-12T19:06:30.577Z",
    },
    {
      id: "68c49e0807f03f213684d613",
      name: "Maria Teste Silva Atualizada",
      document: "444.555.666-77",
      hiredAt: "2024-07-01T00:00:00.000Z",
      isActive: true,
      createdAt: "2025-09-12T22:26:16.928Z",
      updatedAt: "2025-09-13T02:00:41.336Z",
      deletedAt: null,
    },
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 10,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  },
};

export default employeesListMock;

export const singleEmployeeMock = {
  id: "68c24a4cc85e79937983a83d",
  name: "João Silva",
  document: "123.456.789-01",
  hiredAt: "2024-01-15T00:00:00.000Z",
  isActive: true,
  createdAt: "2025-09-11T04:04:28.461Z",
  updatedAt: "2025-09-11T04:04:28.461Z",
  documentationSummary: {
    total: 3,
    sent: 1,
    pending: 2,
    lastUpdated: "2025-09-13T06:00:00.000Z",
  },
};

export const documentationOverviewMock = {
  employee: { id: singleEmployeeMock.id, name: singleEmployeeMock.name },
  documentationStatus: {
    total: 3,
    sent: 1,
    pending: 2,
    documents: [
      {
        type: { id: "dt-cpf", name: "CPF" },
        status: "SENT",
        value: "123.456.789-01",
        active: true,
      },
      {
        type: { id: "dt-cte", name: "Carteira de Trabalho" },
        status: "PENDING",
        value: null,
        active: true,
      },
      {
        type: { id: "dt-rg", name: "RG" },
        status: "PENDING",
        value: null,
        active: true,
      },
    ],
  },
};

export const sentDocumentsMock = [
  {
    employee: { id: singleEmployeeMock.id, name: singleEmployeeMock.name },
    documentType: { id: "dt-cpf", name: "CPF" },
    status: "SENT",
    active: true,
    value: "123.456.789-01",
  },
];

export const pendingDocumentsMock = [
  {
    employee: { id: singleEmployeeMock.id, name: singleEmployeeMock.name },
    documentType: { id: "dt-cte", name: "Carteira de Trabalho" },
    status: "PENDING",
    active: true,
  },
  {
    employee: { id: "68c101bcb740dd18300c30ed", name: "João Pedro" },
    documentType: { id: "dt-cpf", name: "CPF" },
    status: "PENDING",
    active: true,
  },
];

export const requiredDocumentsMock = [
  { documentTypeId: "dt-cpf", value: null, active: true },
  { documentTypeId: "dt-cte", value: null, active: true },
];

export const sendDocumentPayloadMock = {
  value: "123.456.789-01",
};

// --- mocks gerados a partir das respostas reais capturadas ---
import fs from "fs";
import path from "path";

const _mocksDir = path.resolve(__dirname);
const _readJson = (fileName: string) => {
  let raw = fs.readFileSync(path.join(_mocksDir, fileName), "utf8");
  // strip BOM
  raw = raw.replace(/^\uFEFF/, "");
  // remove possible code fences or markdown wrappers that may have been accidentally saved
  raw = raw.replace(/^\s*```(?:json)?\s*/i, "");
  raw = raw.replace(/\s*```\s*$/i, "");
  raw = raw.trim();
  return JSON.parse(raw);
};

export const employeesListJsonReal = _readJson("employees.list.json");
// arquivo documents.pending.json não existe; usar a versão por tipo já salva
export const documentsPendingByTypeJsonReal = _readJson(
  "documents.pending.byType.json"
);
export const employeePending68c101c4JsonReal = _readJson(
  "employee.pending.68c101c4.json"
);
export const employeeDocumentationJsonReal = _readJson(
  "employee.documentation.json"
);
export const documentTypesListJsonReal = _readJson("documentTypes.list.json");
export const documentType68c0b12eEmployeesJsonReal = _readJson(
  "documentType.68c0b12e.employees.json"
);
export const documentsPendingJsonReal = _readJson("documents.pending.json");
export const documentsSentJsonReal = _readJson("documents.sent.json");
export const employeesSearchMariaJsonReal = _readJson(
  "employees.search.maria.json"
);
export const employee68c24a4cJsonReal = _readJson("employee.68c24a4c.json");
export const employeesRequired68c24a4cJsonReal = _readJson(
  "employees.required.68c24a4c.json"
);
// rest endpoints captured
export const restDocumentTypesListJson = _readJson(
  "rest.documentTypes.list.json"
);
export const restDocumentsPendingJson = _readJson(
  "rest.documents.pending.json"
);
export const restDocumentsPendingByTypeJson = _readJson(
  "rest.documents.pending.byType.json"
);
export const restDocumentsSentJson = _readJson("rest.documents.sent.json");
export const restEmployeesListJson = _readJson("rest.employees.list.json");
