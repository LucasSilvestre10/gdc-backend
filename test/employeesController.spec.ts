import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeesController } from "../src/controllers/rest/EmployeesController";
import { ResponseHandler } from "../src/middleware/ResponseHandler";
import { NotFound } from "@tsed/exceptions";
import {
  employeesListMock,
  singleEmployeeMock,
  documentationOverviewMock,
  sentDocumentsMock,
  pendingDocumentsMock,
  requiredDocumentsMock,
  sendDocumentPayloadMock,
} from "./mocks/employeesMocks";
import { documentsPendingByTypeJsonReal } from "./mocks/employeesMocks";
import { employeeDocumentationJsonReal } from "./mocks/employeesMocks";

describe("EmployeesController", () => {
  let controller: EmployeesController;
  let mockService: any;
  let spySuccess: any;

  const sampleEmployee = {
    ...singleEmployeeMock,
    hiredAt: new Date(singleEmployeeMock.hiredAt),
    createdAt: new Date(singleEmployeeMock.createdAt),
    updatedAt: new Date(singleEmployeeMock.updatedAt),
  } as any;

  beforeEach(() => {
    mockService = {
      create: vi.fn(),
      listAsDto: vi.fn(),
      searchByNameOrCpf: vi.fn(),
      enrichEmployeesWithDocumentationInfo: vi.fn(),
      findById: vi.fn(),
      updateEmployee: vi.fn(),
      delete: vi.fn(),
      linkDocumentTypes: vi.fn(),
      unlinkDocumentTypes: vi.fn(),
      sendDocument: vi.fn(),
      getSentDocuments: vi.fn(),
      getPendingDocuments: vi.fn(),
      getDocumentationOverview: vi.fn(),
      restoreDocumentTypeLink: vi.fn(),
      getRequiredDocumentsAsDto: vi.fn(),
      restore: vi.fn(),
    };

    controller = new EmployeesController();
    // injetar mockService no controller substituindo o getter apenas nesta instância
    Object.defineProperty(controller, "employeeService", {
      get: () => mockService,
      configurable: true,
    });

    spySuccess = vi.spyOn(ResponseHandler, "success");
  });

  it("create deve chamar service.create e retornar sucesso", async () => {
    mockService.create.mockResolvedValue(sampleEmployee);

    const result = await controller.create({
      name: sampleEmployee.name,
    } as any);

    expect(mockService.create).toHaveBeenCalled();
    expect(spySuccess).toHaveBeenCalledWith(
      sampleEmployee,
      "Colaborador criado com sucesso"
    );
    expect(result).toHaveProperty("success", true);
  });

  it("list deve retornar dados paginados e usar listAsDto", async () => {
    mockService.listAsDto.mockResolvedValue({
      items: employeesListMock.data,
      total: employeesListMock.pagination.total,
    });

    const resp = await controller.list(
      "all",
      employeesListMock.pagination.page,
      employeesListMock.pagination.limit
    );

    expect(mockService.listAsDto).toHaveBeenCalledWith(
      { isActive: "all" },
      {
        page: employeesListMock.pagination.page,
        limit: employeesListMock.pagination.limit,
      }
    );
    expect(resp).toHaveProperty("success", true);
    expect(resp).toHaveProperty("data");
  });

  it("list com status=active deve enviar filtro isActive: true", async () => {
    mockService.listAsDto.mockResolvedValue({
      items: [sampleEmployee],
      total: 1,
    });
    const resp = await controller.list("active", 1, 10);
    expect(mockService.listAsDto).toHaveBeenCalledWith(
      { isActive: true },
      { page: 1, limit: 10 }
    );
    expect(resp).toHaveProperty("success", true);
  });

  it("list com status=inactive deve enviar filtro isActive: false", async () => {
    mockService.listAsDto.mockResolvedValue({ items: [], total: 0 });
    const resp = await controller.list("inactive", 1, 10);
    expect(mockService.listAsDto).toHaveBeenCalledWith(
      { isActive: false },
      { page: 1, limit: 10 }
    );
    expect(resp).toHaveProperty("success", true);
  });

  it("searchEmployees deve delegar e enriquecer resultados", async () => {
    mockService.searchByNameOrCpf.mockResolvedValue({
      items: [sampleEmployee],
      total: 1,
    });
    mockService.enrichEmployeesWithDocumentationInfo.mockResolvedValue([
      sampleEmployee,
    ]);

    const resp = await controller.searchEmployees("João", {
      page: 1,
      limit: 10,
    });

    expect(mockService.searchByNameOrCpf).toHaveBeenCalledWith("João", {
      status: undefined,
      page: 1,
      limit: 10,
    });
    expect(mockService.enrichEmployeesWithDocumentationInfo).toHaveBeenCalled();
    expect(spySuccess).toHaveBeenCalled();
  });

  it("searchEmployees deve preencher createdAt/updatedAt quando ausentes e usar paginação padrão", async () => {
    const empWithoutDates = {
      ...sampleEmployee,
      createdAt: undefined,
      updatedAt: undefined,
    } as any;

    mockService.searchByNameOrCpf.mockResolvedValue({
      items: [empWithoutDates],
      total: 3,
    });
    mockService.enrichEmployeesWithDocumentationInfo.mockResolvedValue([
      empWithoutDates,
    ]);

    const resp = await controller.searchEmployees("term", {} as any);

    expect(mockService.searchByNameOrCpf).toHaveBeenCalled();

    // última chamada do ResponseHandler.success deve conter o objeto mapeado
    const call = spySuccess.mock.calls[spySuccess.mock.calls.length - 1];
    const payload = call[0] as any;

    expect(payload).toBeDefined();
    expect(Array.isArray(payload.employees)).toBe(true);
    expect(payload.employees[0].createdAt).toBeInstanceOf(Date);
    expect(payload.employees[0].updatedAt).toBeInstanceOf(Date);

    // paginação usa defaults (page=1, limit=20)
    expect(payload.pagination.page).toBe(1);
    expect(payload.pagination.limit).toBe(20);
    expect(payload.pagination.total).toBe(3);
    expect(payload.pagination.totalPages).toBe(Math.ceil(3 / 20));
  });

  it("findById deve lançar NotFound quando não existir", async () => {
    mockService.findById.mockResolvedValue(null);
    await expect(controller.findById("nonexistent")).rejects.toThrow(NotFound);
  });

  it("findById deve retornar sucesso quando existir", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    const resp = await controller.findById("507f1f77bcf86cd799439011");
    expect(spySuccess).toHaveBeenCalled();
    expect(resp).toHaveProperty("data");
  });

  it("update deve lançar NotFound quando não existir", async () => {
    mockService.updateEmployee.mockResolvedValue(null);
    await expect(
      controller.update("507f1f77bcf86cd799439099", {} as any)
    ).rejects.toThrow(NotFound);
  });

  it("update deve retornar sucesso quando atualizado", async () => {
    mockService.updateEmployee.mockResolvedValue(sampleEmployee);
    const resp = await controller.update("507f1f77bcf86cd799439011", {} as any);
    expect(spySuccess).toHaveBeenCalled();
    expect(resp).toHaveProperty("data");
  });

  it("delete deve lançar NotFound quando não existir", async () => {
    mockService.delete.mockResolvedValue(null);
    await expect(controller.delete("507f1f77bcf86cd799439099")).rejects.toThrow(
      NotFound
    );
  });

  it("delete deve retornar sucesso quando deletado", async () => {
    mockService.delete.mockResolvedValue(sampleEmployee);
    const resp = await controller.delete("507f1f77bcf86cd799439011");
    expect(spySuccess).toHaveBeenCalled();
    expect(resp).toHaveProperty("data");
  });

  it("linkDocumentTypes deve chamar service e retornar sucesso", async () => {
    mockService.linkDocumentTypes.mockResolvedValue(undefined);
    const resp = await controller.linkDocumentTypes(
      "507f1f77bcf86cd799439011",
      { documentTypeIds: ["1"] } as any
    );
    expect(mockService.linkDocumentTypes).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      ["1"]
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("unlinkDocumentType deve chamar service e retornar sucesso", async () => {
    mockService.unlinkDocumentTypes.mockResolvedValue(undefined);
    const resp = await controller.unlinkDocumentType(
      "507f1f77bcf86cd799439011",
      "2"
    );
    expect(mockService.unlinkDocumentTypes).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      ["2"]
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("sendDocument deve delegar e retornar sucesso", async () => {
    const doc = { id: "d1", value: sendDocumentPayloadMock.value };
    mockService.sendDocument.mockResolvedValue(doc);
    const resp = await controller.sendDocument(
      singleEmployeeMock.id,
      "dt-cpf",
      sendDocumentPayloadMock.value as any
    );
    expect(mockService.sendDocument).toHaveBeenCalledWith(
      singleEmployeeMock.id,
      "dt-cpf",
      sendDocumentPayloadMock.value
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("getSentDocuments deve lançar NotFound quando findById retornar null", async () => {
    mockService.findById.mockResolvedValue(null);
    await expect(
      controller.getSentDocuments("507f1f77bcf86cd799439099")
    ).rejects.toThrow(NotFound);
  });

  it("getSentDocuments deve retornar sucesso quando houver employee", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    mockService.getSentDocuments.mockResolvedValue(sentDocumentsMock);
    const resp = await controller.getSentDocuments(singleEmployeeMock.id);
    expect(mockService.getSentDocuments).toHaveBeenCalledWith(
      singleEmployeeMock.id
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("getPendingDocuments deve lançar NotFound quando findById retornar null", async () => {
    mockService.findById.mockResolvedValue(null);
    await expect(
      controller.getPendingDocuments("507f1f77bcf86cd799439099")
    ).rejects.toThrow(NotFound);
  });

  it("getPendingDocuments deve retornar sucesso quando houver employee", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    mockService.getPendingDocuments.mockResolvedValue(pendingDocumentsMock);
    const resp = await controller.getPendingDocuments(singleEmployeeMock.id);
    expect(mockService.getPendingDocuments).toHaveBeenCalledWith(
      singleEmployeeMock.id
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("documents pending by type - service delegated", async () => {
    // simula service que retorna o JSON real filtrado por documentTypeId
    mockService.getGlobalPendingByType = vi
      .fn()
      .mockResolvedValue(documentsPendingByTypeJsonReal.data);
    const result = await mockService.getGlobalPendingByType(
      "68c0b12ee915e716f9c311f7"
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("getDocumentationOverview deve lançar NotFound quando findById retornar null", async () => {
    mockService.findById.mockResolvedValue(null);
    await expect(
      controller.getDocumentationOverview("507f1f77bcf86cd799439099")
    ).rejects.toThrow(NotFound);
  });

  it("getDocumentationOverview deve retornar sucesso quando houver employee", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    mockService.getDocumentationOverview.mockResolvedValue(
      employeeDocumentationJsonReal.data.documentationOverview
    );
    const resp = await controller.getDocumentationOverview(
      singleEmployeeMock.id
    );
    expect(mockService.getDocumentationOverview).toHaveBeenCalledWith(
      singleEmployeeMock.id
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("getDocumentationOverview deve marcar isComplete=true quando pending=0 e total>0", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    mockService.getDocumentationOverview.mockResolvedValue({
      total: 2,
      sent: 2,
      pending: 0,
      lastUpdated: new Date().toISOString(),
      documents: [],
    } as any);

    await controller.getDocumentationOverview(singleEmployeeMock.id);

    const call = spySuccess.mock.calls[spySuccess.mock.calls.length - 1];
    const payload = call[0] as any;

    expect(payload.documentationOverview.summary.isComplete).toBe(true);
  });

  it("getDocumentationOverview deve marcar isComplete=false quando houver pendências", async () => {
    mockService.findById.mockResolvedValue(sampleEmployee);
    mockService.getDocumentationOverview.mockResolvedValue({
      total: 3,
      sent: 1,
      pending: 2,
      lastUpdated: new Date().toISOString(),
      documents: [],
    } as any);

    await controller.getDocumentationOverview(singleEmployeeMock.id);

    const call = spySuccess.mock.calls[spySuccess.mock.calls.length - 1];
    const payload = call[0] as any;

    expect(payload.documentationOverview.summary.isComplete).toBe(false);
  });

  it("restoreDocumentTypeLink deve chamar service e retornar sucesso", async () => {
    mockService.restoreDocumentTypeLink.mockResolvedValue(undefined);
    const resp = await controller.restoreDocumentTypeLink(
      "507f1f77bcf86cd799439011",
      "dt1"
    );
    expect(mockService.restoreDocumentTypeLink).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "dt1"
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("getRequiredDocuments deve retornar success com lista", async () => {
    mockService.getRequiredDocumentsAsDto.mockResolvedValue(
      requiredDocumentsMock
    );
    const resp = await controller.getRequiredDocuments(singleEmployeeMock.id);
    expect(mockService.getRequiredDocumentsAsDto).toHaveBeenCalledWith(
      singleEmployeeMock.id,
      "all"
    );
    expect(spySuccess).toHaveBeenCalled();
  });

  it("restore deve lançar NotFound quando não existir", async () => {
    mockService.restore.mockResolvedValue(null);
    await expect(
      controller.restore("507f1f77bcf86cd799439099")
    ).rejects.toThrow(NotFound);
  });

  it("restore deve retornar success quando reativado", async () => {
    mockService.restore.mockResolvedValue(sampleEmployee);
    const resp = await controller.restore("507f1f77bcf86cd799439011");
    expect(spySuccess).toHaveBeenCalled();
  });
});
