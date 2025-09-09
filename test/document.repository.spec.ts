import { describe, it, beforeEach, expect, vi } from "vitest";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { DocumentStatus } from "../src/models/Document";
import { Types } from "mongoose";

// Testes para o repositório de documentos
describe("DocumentRepository", () => {
  let repo: DocumentRepository;
  let mockModel: any;

  // Antes de cada teste, cria um mock do modelo do Mongoose e instancia o repositório
  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
    };
    
    // Mock da cadeia de métodos para find (skip, limit, sort, exec)
    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    
    mockModel.find.mockReturnValue(mockQuery);
    mockModel.countDocuments.mockReturnValue({ exec: vi.fn() });
    
    // @ts-ignore
    repo = new DocumentRepository(mockModel);
  });

  it("deve criar um novo documento", async () => {
    const employeeId = new Types.ObjectId();
    const documentTypeId = new Types.ObjectId();
    const documentData = {
      name: "Documento Teste",
      employeeId,
      documentTypeId,
      status: DocumentStatus.SENT
    };

    const mockCreatedDocument = { 
      ...documentData, 
      _id: new Types.ObjectId(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repo.create(documentData);

    expect(mockModel.create).toHaveBeenCalledWith({
      ...documentData,
      isActive: true,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date)
    });
    expect(result).toEqual(mockCreatedDocument);
  });

  it("deve encontrar documento por ID ativo", async () => {
    const documentId = new Types.ObjectId().toString();
    const mockDocument = { 
      _id: documentId, 
      name: "Documento Teste", 
      isActive: true 
    };

    mockModel.findOne.mockResolvedValue(mockDocument);

    const result = await repo.findById(documentId);

    expect(mockModel.findOne).toHaveBeenCalledWith({
      _id: documentId,
      isActive: { $ne: false }
    });
    expect(result).toEqual(mockDocument);
  });

  it("deve retornar null para documento inexistente", async () => {
    const documentId = new Types.ObjectId().toString();

    mockModel.findOne.mockResolvedValue(null);

    const result = await repo.findById(documentId);

    expect(result).toBeNull();
  });

  it("deve atualizar documento existente", async () => {
    const documentId = new Types.ObjectId().toString();
    const updateData = { name: "Documento Atualizado" };
    const mockUpdatedDocument = { 
      _id: documentId, 
      ...updateData,
      updatedAt: new Date(),
      isActive: true 
    };

    mockModel.findOneAndUpdate.mockResolvedValue(mockUpdatedDocument);

    const result = await repo.update(documentId, updateData);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: documentId, isActive: { $ne: false } },
      { ...updateData, updatedAt: expect.any(Date) },
      { new: true }
    );
    expect(result).toEqual(mockUpdatedDocument);
  });

  it("deve listar documentos ativos com paginação", async () => {
    const mockDocuments = [
      { _id: "1", name: "Doc 1", isActive: true },
      { _id: "2", name: "Doc 2", isActive: true }
    ];
    const mockCount = 2;

    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockDocuments),
    };

    const mockCountQuery = {
      exec: vi.fn().mockResolvedValue(mockCount)
    };

    mockModel.find.mockReturnValue(mockQuery);
    mockModel.countDocuments.mockReturnValue(mockCountQuery);

    const result = await repo.list({}, { page: 1, limit: 10 });

    expect(mockModel.find).toHaveBeenCalledWith({ 
      isActive: { $ne: false }
    });
    expect(mockQuery.skip).toHaveBeenCalledWith(0);
    expect(mockQuery.limit).toHaveBeenCalledWith(10);
    expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(result).toEqual({
      items: mockDocuments,
      total: mockCount
    });
  });

  it("deve filtrar por employeeId", async () => {
    const employeeId = new Types.ObjectId().toString();
    const mockDocuments = [{ _id: "1", name: "Doc 1", employeeId }];

    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockDocuments),
    };

    const mockCountQuery = {
      exec: vi.fn().mockResolvedValue(1)
    };

    mockModel.find.mockReturnValue(mockQuery);
    mockModel.countDocuments.mockReturnValue(mockCountQuery);

    await repo.list({ employeeId }, { page: 1, limit: 10 });

    expect(mockModel.find).toHaveBeenCalledWith({
      isActive: { $ne: false },
      employeeId
    });
  });

  it("deve filtrar por documentTypeId", async () => {
    const documentTypeId = new Types.ObjectId().toString();
    const mockDocuments = [{ _id: "1", name: "Doc 1", documentTypeId }];

    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue(mockDocuments),
    };

    const mockCountQuery = {
      exec: vi.fn().mockResolvedValue(1)
    };

    mockModel.find.mockReturnValue(mockQuery);
    mockModel.countDocuments.mockReturnValue(mockCountQuery);

    await repo.list({ documentTypeId }, { page: 1, limit: 10 });

    expect(mockModel.find).toHaveBeenCalledWith({
      isActive: { $ne: false },
      documentTypeId
    });
  });

  it("deve fazer soft delete de documento", async () => {
    const documentId = new Types.ObjectId().toString();
    const mockDeletedDocument = { 
      _id: documentId, 
      name: "Documento", 
      isActive: false,
      deletedAt: new Date()
    };

    mockModel.findOneAndUpdate.mockResolvedValue(mockDeletedDocument);

    const result = await repo.softDelete(documentId);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: documentId, isActive: { $ne: false } },
      { 
        isActive: false, 
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      },
      { new: true }
    );
    expect(result).toEqual(mockDeletedDocument);
  });

  it("deve restaurar documento soft deleted", async () => {
    const documentId = new Types.ObjectId().toString();
    const mockRestoredDocument = { 
      _id: documentId, 
      name: "Documento", 
      isActive: true,
      deletedAt: null
    };

    mockModel.findOneAndUpdate.mockResolvedValue(mockRestoredDocument);

    const result = await repo.restore(documentId);

    expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: documentId },
      { 
        isActive: true, 
        deletedAt: null,
        updatedAt: expect.any(Date)
      },
      { new: true }
    );
    expect(result).toEqual(mockRestoredDocument);
  });

  it("deve encontrar documentos com filtros customizados", async () => {
    const employeeId = new Types.ObjectId().toString();
    const mockDocuments = [
      { _id: "1", name: "Doc 1", employeeId },
      { _id: "2", name: "Doc 2", employeeId }
    ];

    // Mock para o método find que retorna uma query com exec
    const mockFindQuery = {
      exec: vi.fn().mockResolvedValue(mockDocuments)
    };
    mockModel.find.mockReturnValue(mockFindQuery);

    const result = await repo.find({ employeeId, status: DocumentStatus.PENDING });

    expect(mockModel.find).toHaveBeenCalledWith({
      employeeId,
      status: DocumentStatus.PENDING,
      isActive: { $ne: false }
    });
    expect(mockFindQuery.exec).toHaveBeenCalled();
    expect(result).toEqual(mockDocuments);
  });
});