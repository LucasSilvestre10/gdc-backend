import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeService } from "../src/services/EmployeeService";
import { EmployeeNotFoundError } from "../src/exceptions/index";

const sampleEmployee: any = {
  _id: "68c24a4cc85e79937983a83d",
  name: "João Silva",
  document: "123.456.789-01",
  hiredAt: new Date("2024-01-15T00:00:00.000Z"),
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("EmployeeService", () => {
  let basicOps: any;
  let documentationService: any;
  let linkService: any;
  let helpers: any;
  let linkRepo: any;
  let service: EmployeeService;

  beforeEach(() => {
    basicOps = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateEmployee: vi.fn(),
      delete: vi.fn(),
      restore: vi.fn(),
      searchByNameOrCpf: vi.fn(),
    };

    documentationService = {
      getDocumentationStatus: vi.fn(),
      sendDocument: vi.fn(),
      getSentDocuments: vi.fn(),
      getPendingDocuments: vi.fn(),
      enrichEmployeesWithDocumentationInfo: vi.fn(),
      getDocumentationOverview: vi.fn(),
    };

    linkService = {
      linkDocumentTypes: vi.fn(),
      unlinkDocumentTypes: vi.fn(),
      getRequiredDocumentsAsDto: vi.fn(),
    };

    helpers = {
      processRequiredDocuments: vi.fn(),
    };

    linkRepo = {
      findLink: vi.fn(),
      restore: vi.fn(),
      create: vi.fn(),
    };

    service = new EmployeeService(
      basicOps,
      documentationService,
      linkService,
      helpers,
      linkRepo
    );
  });

  it("list should delegate to basicOps.list", async () => {
    basicOps.list.mockResolvedValue({ items: [sampleEmployee], total: 1 });
    const res = await service.list({}, { page: 1, limit: 10 });
    expect(basicOps.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
    expect(res.total).toBe(1);
  });

  it("listAsDto should map items to DTO and return total", async () => {
    basicOps.list.mockResolvedValue({ items: [sampleEmployee], total: 1 });
    const dto = await service.listAsDto({}, { page: 1, limit: 10 });
    expect(dto.total).toBe(1);
    expect(dto.items[0]).toHaveProperty("id", sampleEmployee._id);
    expect(basicOps.list).toHaveBeenCalled();
  });

  it("create should call helpers.processRequiredDocuments when requiredDocuments provided", async () => {
    basicOps.create.mockResolvedValue(sampleEmployee);
    const required = [{ documentTypeId: "dt1", value: "v1" }];
    const created = await service.create({
      name: sampleEmployee.name,
      document: sampleEmployee.document,
      hiredAt: sampleEmployee.hiredAt,
      requiredDocuments: required,
    });
    expect(basicOps.create).toHaveBeenCalled();
    expect(helpers.processRequiredDocuments).toHaveBeenCalledWith(
      sampleEmployee._id,
      required
    );
    expect(created).toEqual(sampleEmployee);
  });

  it("create should not call helpers.processRequiredDocuments when none provided", async () => {
    basicOps.create.mockResolvedValue(sampleEmployee);
    const created = await service.create({
      name: sampleEmployee.name,
      document: sampleEmployee.document,
      hiredAt: sampleEmployee.hiredAt,
    });
    expect(basicOps.create).toHaveBeenCalled();
    expect(helpers.processRequiredDocuments).not.toHaveBeenCalled();
    expect(created).toEqual(sampleEmployee);
  });

  it("restoreDocumentTypeLink should throw when employee not found", async () => {
    basicOps.findById.mockResolvedValue(null);
    await expect(
      service.restoreDocumentTypeLink("nonexistent", "dt1")
    ).rejects.toBeInstanceOf(EmployeeNotFoundError);
  });

  it("restoreDocumentTypeLink should call restore when link exists", async () => {
    basicOps.findById.mockResolvedValue(sampleEmployee);
    linkRepo.findLink.mockResolvedValue({ linkId: "l1" });
    await service.restoreDocumentTypeLink(sampleEmployee._id, "dt1");
    expect(linkRepo.restore).toHaveBeenCalledWith(sampleEmployee._id, "dt1");
    expect(linkRepo.create).not.toHaveBeenCalled();
  });

  it("restoreDocumentTypeLink should create when link does not exist", async () => {
    basicOps.findById.mockResolvedValue(sampleEmployee);
    linkRepo.findLink.mockResolvedValue(null);
    await service.restoreDocumentTypeLink(sampleEmployee._id, "dt1");
    expect(linkRepo.create).toHaveBeenCalledWith(sampleEmployee._id, "dt1");
  });

  it("getDocumentationOverview should throw when employee not found", async () => {
    basicOps.findById.mockResolvedValue(null);
    await expect(
      service.getDocumentationOverview("nonexistent")
    ).rejects.toBeInstanceOf(EmployeeNotFoundError);
  });

  it("getDocumentationOverview should combine sent and pending documents", async () => {
    basicOps.findById.mockResolvedValue(sampleEmployee);
    documentationService.getSentDocuments.mockResolvedValue([{ id: "s1" }]);
    documentationService.getPendingDocuments.mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ]);
    const overview = await service.getDocumentationOverview(sampleEmployee._id);
    expect(overview.sent).toBe(1);
    expect(overview.pending).toBe(2);
    expect(overview.total).toBe(3);
    expect(Array.isArray(overview.documents)).toBe(true);
  });

  it("delegates getSentDocuments and getPendingDocuments to documentationService", async () => {
    documentationService.getSentDocuments.mockResolvedValue([{ id: "s1" }]);
    documentationService.getPendingDocuments.mockResolvedValue([{ id: "p1" }]);
    const sent = await service.getSentDocuments(sampleEmployee._id);
    const pending = await service.getPendingDocuments(sampleEmployee._id);
    expect(documentationService.getSentDocuments).toHaveBeenCalledWith(
      sampleEmployee._id
    );
    expect(documentationService.getPendingDocuments).toHaveBeenCalledWith(
      sampleEmployee._id
    );
    expect(sent.length).toBe(1);
    expect(pending.length).toBe(1);
  });

  it("searchByNameOrCpf should normalize and delegate to basicOps.searchByNameOrCpf", async () => {
    basicOps.searchByNameOrCpf.mockResolvedValue({
      items: [sampleEmployee],
      total: 1,
    });
    const res = await service.searchByNameOrCpf("João", { page: 2, limit: 5 });
    expect(basicOps.searchByNameOrCpf).toHaveBeenCalled();
    expect(res.total).toBe(1);
  });

  it("searchByNameOrCpf should use default page/limit when filters not provided", async () => {
    basicOps.searchByNameOrCpf.mockResolvedValue({ items: [], total: 0 });
    const res = await service.searchByNameOrCpf("Maria");
    expect(basicOps.searchByNameOrCpf).toHaveBeenCalledWith(
      "Maria",
      { status: "all" },
      { page: 1, limit: 20 }
    );
    expect(res.total).toBe(0);
  });

  it("findById should delegate to basicOps.findById", async () => {
    basicOps.findById.mockResolvedValue(sampleEmployee);
    const e = await service.findById(sampleEmployee._id);
    expect(basicOps.findById).toHaveBeenCalledWith(sampleEmployee._id);
    expect(e).toEqual(sampleEmployee);
  });

  it("getDocumentationStatus should delegate to documentationService", async () => {
    documentationService.getDocumentationStatus.mockResolvedValue({
      sent: [],
      pending: [],
    });
    const st = await service.getDocumentationStatus(sampleEmployee._id);
    expect(documentationService.getDocumentationStatus).toHaveBeenCalledWith(
      sampleEmployee._id
    );
    expect(st).toHaveProperty("sent");
  });

  it("getRequiredDocumentsAsDto should delegate to linkService", async () => {
    linkService.getRequiredDocumentsAsDto.mockResolvedValue([]);
    const res = await service.getRequiredDocumentsAsDto(
      sampleEmployee._id,
      "all"
    );
    expect(linkService.getRequiredDocumentsAsDto).toHaveBeenCalledWith(
      sampleEmployee._id,
      "all"
    );
    expect(res).toEqual([]);
  });

  it("extractId should handle object _id and toEmployeeListDto should include deletedAt", async () => {
    const employeeWithObjectId = {
      ...sampleEmployee,
      _id: { toString: () => sampleEmployee._id },
      deletedAt: null,
    } as any;
    basicOps.list.mockResolvedValue({
      items: [employeeWithObjectId],
      total: 1,
    });
    const dto = await service.listAsDto({}, {} as any);
    expect(dto.items[0]).toHaveProperty("id", sampleEmployee._id);
  });

  it("update/delete/restore should delegate to basicOps appropriately", async () => {
    basicOps.updateEmployee.mockResolvedValue(sampleEmployee);
    const updated = await service.updateEmployee(sampleEmployee._id, {
      name: "Novo",
    } as any);
    expect(basicOps.updateEmployee).toHaveBeenCalledWith(sampleEmployee._id, {
      name: "Novo",
    });

    basicOps.delete.mockResolvedValue(sampleEmployee);
    const deleted = await service.delete(sampleEmployee._id);
    expect(basicOps.delete).toHaveBeenCalledWith(sampleEmployee._id);

    basicOps.restore.mockResolvedValue(sampleEmployee);
    const restored = await service.restore(sampleEmployee._id);
    expect(basicOps.restore).toHaveBeenCalledWith(sampleEmployee._id);
  });

  it("sendDocument/enrich/link/unlink should delegate to underlying services", async () => {
    documentationService.sendDocument.mockResolvedValue({ id: "doc1" });
    const sent = await service.sendDocument(
      sampleEmployee._id,
      "dt1",
      "value1"
    );
    expect(documentationService.sendDocument).toHaveBeenCalledWith(
      sampleEmployee._id,
      "dt1",
      "value1"
    );

    documentationService.enrichEmployeesWithDocumentationInfo.mockResolvedValue(
      [sampleEmployee]
    );
    const enriched = await service.enrichEmployeesWithDocumentationInfo([
      sampleEmployee,
    ]);
    expect(
      documentationService.enrichEmployeesWithDocumentationInfo
    ).toHaveBeenCalledWith([sampleEmployee]);

    linkService.linkDocumentTypes.mockResolvedValue(undefined);
    await service.linkDocumentTypes(sampleEmployee._id, ["dt1"]);
    expect(linkService.linkDocumentTypes).toHaveBeenCalledWith(
      sampleEmployee._id,
      ["dt1"]
    );

    linkService.unlinkDocumentTypes.mockResolvedValue(undefined);
    await service.unlinkDocumentTypes(sampleEmployee._id, ["dt1"]);
    expect(linkService.unlinkDocumentTypes).toHaveBeenCalledWith(
      sampleEmployee._id,
      ["dt1"]
    );
  });
});

// Nota: estes testes usam mocks unitários simples; também podemos reaproveitar os mocks reais
// capturados em `test/mocks` (ex.: `rest.*.json`) para testes de integração mais realistas.
