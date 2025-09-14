import { describe, it, beforeEach, expect, vi, Mock } from "vitest";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { MongooseService } from "@tsed/mongoose";
import { Document, DocumentStatus } from "../src/models/Document";
import { Model as MongooseModel } from "mongoose";

/**
 * Testes unitários para DocumentRepository
 *
 * Foca nas operações de banco de dados:
 * - Operações CRUD básicas
 * - Implementação de soft delete
 * - Filtros por status ativo/inativo
 * - Paginação e ordenação
 * - Busca por valor textual
 */
describe("DocumentRepository - Testes Unitários", () => {
  let repository: DocumentRepository;
  let mockMongooseService: any;
  let mockDocumentModel: any;
  let mockConnection: any;

  // Dados mock para testes
  const mockDocument = {
    _id: "doc-123",
    value: "123.456.789-01",
    status: DocumentStatus.SENT,
    employeeId: "emp-123",
    documentTypeId: "doc-type-123",
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
    deletedAt: null,
  };

  const mockInactiveDocument = {
    ...mockDocument,
    _id: "doc-456",
    isActive: false,
    deletedAt: new Date("2024-01-02T00:00:00Z"),
  };

  beforeEach(() => {
    // Mock do modelo Mongoose
    mockDocumentModel = {
      create: vi.fn(),
      findOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      model: vi.fn(),
    };

    // Mock do connection
    mockConnection = {
      model: vi.fn().mockReturnValue(mockDocumentModel),
    };

    // Mock do MongooseService
    mockMongooseService = {
      get: vi.fn().mockReturnValue(mockConnection),
    };

    // Criar instância do repository
    repository = new DocumentRepository(mockMongooseService);
  });

  describe("Verificação da instância e injeção", () => {
    it("deve ser criado corretamente", () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(DocumentRepository);
    });

    it("deve obter o modelo Document do MongooseService", () => {
      expect(mockMongooseService.get).toHaveBeenCalled();
      expect(mockConnection.model).toHaveBeenCalledWith("Document");
    });
  });

  describe("create - Criação de Documento", () => {
    it("deve criar um documento com sucesso", async () => {
      // Arrange
      const createData = {
        value: "987.654.321-00",
        status: DocumentStatus.SENT,
        employeeId: "emp-456",
        documentTypeId: "doc-type-456",
      };

      const expectedDocument = {
        ...createData,
        _id: "new-doc-123",
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockDocumentModel.create.mockResolvedValue(expectedDocument);

      // Act
      const result = await repository.create(createData);

      // Assert
      expect(mockDocumentModel.create).toHaveBeenCalledWith({
        ...createData,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(expectedDocument);
    });

    it("deve definir isActive como true por padrão", async () => {
      // Arrange
      const createData = {
        value: "111.222.333-44",
        status: DocumentStatus.PENDING,
        employeeId: "emp-789",
        documentTypeId: "doc-type-789",
      };

      mockDocumentModel.create.mockResolvedValue({
        ...createData,
        _id: "doc-789",
      });

      // Act
      await repository.create(createData);

      // Assert
      const callArgs = mockDocumentModel.create.mock.calls[0][0];
      expect(callArgs.isActive).toBe(true);
      expect(callArgs.createdAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
    });

    it("deve propagar erro de validação do Mongoose", async () => {
      // Arrange
      const invalidData = { value: "" }; // Dados inválidos
      const mongooseError = new Error("ValidationError: value is required");
      mockDocumentModel.create.mockRejectedValue(mongooseError);

      // Act & Assert
      await expect(repository.create(invalidData)).rejects.toThrow(
        "ValidationError: value is required"
      );
    });
  });

  describe("findById - Busca por ID", () => {
    it("deve encontrar documento ativo por ID", async () => {
      // Arrange
      mockDocumentModel.findOne.mockResolvedValue(mockDocument);

      // Act
      const result = await repository.findById("doc-123");

      // Assert
      expect(mockDocumentModel.findOne).toHaveBeenCalledWith({
        _id: "doc-123",
        isActive: { $ne: false },
      });
      expect(result).toEqual(mockDocument);
    });

    it("deve retornar null para documento não encontrado", async () => {
      // Arrange
      mockDocumentModel.findOne.mockResolvedValue(null);

      // Act
      const result = await repository.findById("doc-inexistente");

      // Assert
      expect(result).toBeNull();
    });

    it("deve filtrar documentos inativos", async () => {
      // Arrange
      mockDocumentModel.findOne.mockResolvedValue(null); // Documento inativo não é retornado

      // Act
      const result = await repository.findById("doc-456");

      // Assert
      expect(mockDocumentModel.findOne).toHaveBeenCalledWith({
        _id: "doc-456",
        isActive: { $ne: false },
      });
      expect(result).toBeNull();
    });
  });

  describe("update - Atualização de Documento", () => {
    it("deve atualizar documento ativo com sucesso", async () => {
      // Arrange
      const updateData = { value: "999.888.777-66" };
      const updatedDocument = {
        ...mockDocument,
        ...updateData,
        updatedAt: expect.any(Date),
      };

      mockDocumentModel.findOneAndUpdate.mockResolvedValue(updatedDocument);

      // Act
      const result = await repository.update("doc-123", updateData);

      // Assert
      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "doc-123", isActive: { $ne: false } },
        {
          ...updateData,
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(updatedDocument);
    });

    it("deve retornar null para documento não encontrado ou inativo", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await repository.update("doc-inexistente", {
        value: "novo-valor",
      });

      // Assert
      expect(result).toBeNull();
    });

    it("deve adicionar timestamp de atualização automaticamente", async () => {
      // Arrange
      const updateData = { status: DocumentStatus.PENDING };
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(mockDocument);

      // Act
      await repository.update("doc-123", updateData);

      // Assert
      const callArgs = mockDocumentModel.findOneAndUpdate.mock.calls[0][1];
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("find - Busca com Filtros", () => {
    beforeEach(() => {
      // Mock para o método exec()
      mockDocumentModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([mockDocument]),
      });
    });

    it("deve buscar documentos ativos sem filtros adicionais", async () => {
      // Act
      const result = await repository.find();

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        isActive: { $ne: false },
      });
      expect(result).toEqual([mockDocument]);
    });

    it("deve aplicar filtros customizados combinados com filtro de ativo", async () => {
      // Arrange
      const customFilter = {
        employeeId: "emp-123",
        status: DocumentStatus.SENT,
      };

      // Act
      const result = await repository.find(customFilter);

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        ...customFilter,
        isActive: { $ne: false },
      });
      expect(result).toEqual([mockDocument]);
    });

    it("deve retornar lista vazia quando nenhum documento encontrado", async () => {
      // Arrange
      mockDocumentModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await repository.find({ employeeId: "emp-inexistente" });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("list - Listagem Paginada", () => {
    beforeEach(() => {
      // Mock para cadeia de métodos do Mongoose
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([mockDocument]),
      };

      mockDocumentModel.find.mockReturnValue(mockQuery);
      mockDocumentModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(5),
      });
    });

    it("deve listar documentos com paginação padrão", async () => {
      // Act
      const result = await repository.list();

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        isActive: { $ne: false },
      });
      expect(result).toEqual({
        items: [mockDocument],
        total: 5,
      });
    });

    it("deve aplicar paginação personalizada", async () => {
      // Arrange
      const options = { page: 2, limit: 5 };

      // Act
      const result = await repository.list({}, options);

      // Assert
      expect(mockDocumentModel.find().skip).toHaveBeenCalledWith(5); // (page - 1) * limit
      expect(mockDocumentModel.find().limit).toHaveBeenCalledWith(5);
      expect(result).toEqual({
        items: [mockDocument],
        total: 5,
      });
    });

    it("deve aplicar filtros customizados com paginação", async () => {
      // Arrange
      const filter = { status: DocumentStatus.PENDING };
      const options = { page: 1, limit: 10 };

      // Act
      const result = await repository.list(filter, options);

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        ...filter,
        isActive: { $ne: false },
      });
      expect(mockDocumentModel.countDocuments).toHaveBeenCalledWith({
        ...filter,
        isActive: { $ne: false },
      });
    });

    it("deve ordenar por createdAt decrescente", async () => {
      // Act
      await repository.list();

      // Assert
      expect(mockDocumentModel.find().sort).toHaveBeenCalledWith({
        createdAt: -1,
      });
    });

    it("deve usar valores padrão para paginação quando não fornecidos", async () => {
      // Act
      await repository.list({}, {});

      // Assert
      expect(mockDocumentModel.find().skip).toHaveBeenCalledWith(0); // page 1
      expect(mockDocumentModel.find().limit).toHaveBeenCalledWith(10); // limit padrão
    });
  });

  describe("softDelete - Exclusão Lógica", () => {
    it("deve marcar documento como inativo com sucesso", async () => {
      // Arrange
      const deletedDocument = {
        ...mockDocument,
        isActive: false,
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockDocumentModel.findOneAndUpdate.mockResolvedValue(deletedDocument);

      // Act
      const result = await repository.softDelete("doc-123");

      // Assert
      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "doc-123", isActive: { $ne: false } },
        {
          isActive: false,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(deletedDocument);
    });

    it("deve retornar null para documento não encontrado ou já inativo", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await repository.softDelete("doc-inexistente");

      // Assert
      expect(result).toBeNull();
    });

    it("deve adicionar timestamps de deleção e atualização", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(
        mockInactiveDocument
      );

      // Act
      await repository.softDelete("doc-123");

      // Assert
      const callArgs = mockDocumentModel.findOneAndUpdate.mock.calls[0][1];
      expect(callArgs.deletedAt).toBeInstanceOf(Date);
      expect(callArgs.updatedAt).toBeInstanceOf(Date);
      expect(callArgs.isActive).toBe(false);
    });
  });

  describe("restore - Restauração de Documento", () => {
    it("deve restaurar documento inativo com sucesso", async () => {
      // Arrange
      const restoredDocument = {
        ...mockDocument,
        isActive: true,
        deletedAt: null,
        updatedAt: expect.any(Date),
      };

      mockDocumentModel.findOneAndUpdate.mockResolvedValue(restoredDocument);

      // Act
      const result = await repository.restore("doc-456");

      // Assert
      expect(mockDocumentModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "doc-456" }, // Não filtra por isActive para permitir restaurar
        {
          isActive: true,
          deletedAt: null,
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(restoredDocument);
    });

    it("deve retornar null para documento não encontrado", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await repository.restore("doc-inexistente");

      // Assert
      expect(result).toBeNull();
    });

    it("deve não filtrar por isActive para permitir restaurar documentos inativos", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(mockDocument);

      // Act
      await repository.restore("doc-456");

      // Assert
      const callArgs = mockDocumentModel.findOneAndUpdate.mock.calls[0][0];
      expect(callArgs).toEqual({ _id: "doc-456" }); // Sem filtro isActive
    });

    it("deve limpar deletedAt e marcar como ativo", async () => {
      // Arrange
      mockDocumentModel.findOneAndUpdate.mockResolvedValue(mockDocument);

      // Act
      await repository.restore("doc-456");

      // Assert
      const updateData = mockDocumentModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateData.isActive).toBe(true);
      expect(updateData.deletedAt).toBeNull();
      expect(updateData.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("findByValue - Busca por Valor Textual", () => {
    beforeEach(() => {
      mockDocumentModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([mockDocument]),
      });
    });

    it("deve buscar documentos por valor textual", async () => {
      // Act
      const result = await repository.findByValue("123.456.789");

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        value: { $regex: "123.456.789", $options: "i" },
        isActive: { $ne: false },
      });
      expect(result).toEqual([mockDocument]);
    });

    it("deve realizar busca case-insensitive", async () => {
      // Act
      await repository.findByValue("ABC");

      // Assert
      const callArgs = mockDocumentModel.find.mock.calls[0][0];
      expect(callArgs.value.$options).toBe("i"); // Case-insensitive
    });

    it("deve filtrar apenas documentos ativos", async () => {
      // Act
      await repository.findByValue("test");

      // Assert
      const callArgs = mockDocumentModel.find.mock.calls[0][0];
      expect(callArgs.isActive).toEqual({ $ne: false });
    });

    it("deve retornar lista vazia quando nenhum documento encontrado", async () => {
      // Arrange
      mockDocumentModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      // Act
      const result = await repository.findByValue("valor-inexistente");

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("Cenários de edge cases e tratamento de erro", () => {
    it("deve lidar com erro de conexão do MongoDB", async () => {
      // Arrange
      const connectionError = new Error("MongoDB connection failed");
      mockDocumentModel.findOne.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(repository.findById("doc-123")).rejects.toThrow(
        "MongoDB connection failed"
      );
    });

    it("deve lidar com filtros complexos no método find", async () => {
      // Arrange
      const complexFilter = {
        $or: [
          { status: DocumentStatus.SENT },
          { status: DocumentStatus.PENDING },
        ],
        employeeId: { $in: ["emp-1", "emp-2"] },
      };

      mockDocumentModel.find.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      // Act
      await repository.find(complexFilter);

      // Assert
      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        ...complexFilter,
        isActive: { $ne: false },
      });
    });

    it("deve manter paginação consistente mesmo com valores extremos", async () => {
      // Arrange
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };

      mockDocumentModel.find.mockReturnValue(mockQuery);
      mockDocumentModel.countDocuments.mockReturnValue({
        exec: vi.fn().mockResolvedValue(0),
      });

      // Act
      const result = await repository.list({}, { page: 999, limit: 1 });

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(998); // (999 - 1) * 1
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
      expect(result.total).toBe(0);
    });
  });
});
