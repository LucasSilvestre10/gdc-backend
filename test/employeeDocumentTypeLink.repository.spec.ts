import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeDocumentTypeLinkRepository } from "../src/repositories/EmployeeDocumentTypeLinkRepository";

describe("EmployeeDocumentTypeLinkRepository", () => {
  let repo: EmployeeDocumentTypeLinkRepository;
  let mockModel: any;
  let mockMongooseService: any;

  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
    };

    mockMongooseService = {
      get: vi.fn(() => ({
        model: vi.fn(() => mockModel),
      })),
    };

    repo = new EmployeeDocumentTypeLinkRepository(mockMongooseService as any);
  });

  it("create deve chamar model.create e retornar o vínculo criado", async () => {
    const payload = { employeeId: "e1", documentTypeId: "dt1", active: true };
    mockModel.create.mockResolvedValue(payload);

    const out = await repo.create("e1", "dt1");
    expect(mockModel.create).toHaveBeenCalled();
    expect(out).toEqual(payload);
  });

  it("findByEmployee deve aplicar filtro 'all' por padrão e popular documentTypeId", async () => {
    let capturedFilter: any = null;
    const fakeExec = vi.fn().mockResolvedValue([1, 2]);
    const fakePopulate = vi.fn().mockReturnValue({ exec: fakeExec });
    mockModel.find.mockImplementation((filter: any) => {
      capturedFilter = filter;
      return { populate: fakePopulate } as any;
    });

    const res = await repo.findByEmployee("emp1");
    expect(capturedFilter).toEqual({ employeeId: "emp1" });
    expect(fakePopulate).toHaveBeenCalledWith("documentTypeId");
    expect(res).toEqual([1, 2]);
  });

  it("findByEmployee deve filtrar apenas ativos quando status='active'", async () => {
    let capturedFilter: any = null;
    const fakeExec = vi.fn().mockResolvedValue([]);
    const fakePopulate = vi.fn().mockReturnValue({ exec: fakeExec });
    mockModel.find.mockImplementation((filter: any) => {
      capturedFilter = filter;
      return { populate: fakePopulate } as any;
    });

    await repo.findByEmployee("emp2", "active");
    expect(capturedFilter).toEqual({ employeeId: "emp2", active: true });
  });

  it("findByEmployee deve filtrar apenas inativos quando status='inactive'", async () => {
    let capturedFilter: any = null;
    const fakeExec = vi.fn().mockResolvedValue([]);
    const fakePopulate = vi.fn().mockReturnValue({ exec: fakeExec });
    mockModel.find.mockImplementation((filter: any) => {
      capturedFilter = filter;
      return { populate: fakePopulate } as any;
    });

    await repo.findByEmployee("emp3", "inactive");
    expect(capturedFilter).toEqual({ employeeId: "emp3", active: false });
  });

  it("findLink deve delegar para model.findOne", async () => {
    const link = { _id: "l1" };
    mockModel.findOne.mockResolvedValue(link);
    const out = await repo.findLink("e1", "dt1");
    expect(mockModel.findOne).toHaveBeenCalledWith({
      employeeId: "e1",
      documentTypeId: "dt1",
    });
    expect(out).toEqual(link);
  });

  it("softDelete deve marcar active=false e retornar o documento atualizado", async () => {
    const updated = { _id: "l2", active: false };
    mockModel.findOneAndUpdate.mockResolvedValue(updated);
    const out = await repo.softDelete("e2", "dt2");
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { employeeId: "e2", documentTypeId: "dt2", active: true },
      expect.objectContaining({ active: false, deletedAt: expect.any(Date) }),
      { new: true }
    );
    expect(out).toEqual(updated);
  });

  it("restore deve definir active=true e retornar o documento restaurado", async () => {
    const restored = { _id: "l3", active: true };
    mockModel.findOneAndUpdate.mockResolvedValue(restored);
    const out = await repo.restore("e3", "dt3");
    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { employeeId: "e3", documentTypeId: "dt3" },
      expect.objectContaining({ active: true, deletedAt: null }),
      { new: true }
    );
    expect(out).toEqual(restored);
  });

  it("getActiveDocumentTypes deve retornar array de ids como strings", async () => {
    const links = [
      { documentTypeId: { toString: () => "a1" } },
      { documentTypeId: "b2" },
    ];

    const fakeSelect = vi
      .fn()
      .mockReturnValue({ exec: vi.fn().mockResolvedValue(links) });
    mockModel.find.mockReturnValue({ select: fakeSelect } as any);

    const out = await repo.getActiveDocumentTypes("eX");
    expect(mockModel.find).toHaveBeenCalledWith({
      employeeId: "eX",
      active: true,
    });
    expect(out).toEqual(["a1", "b2"]);
  });
});
