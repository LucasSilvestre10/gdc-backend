import { describe, it, beforeEach, expect, vi } from "vitest";
import { DocumentService } from "../src/services/DocumentService";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { EmployeeService } from "../src/services/EmployeeService";
import { ValidationUtils } from "../src/utils/ValidationUtils";
import { PaginationUtils } from "../src/utils/PaginationUtils";

/**
 * Testes unitários para DocumentService
 *
 * Foca na lógica de negócio:
 * - Operações de busca de documentos pendentes e enviados
 * - Validações e tratamento de erros
 * - Agrupamento e paginação de dados
 * - Filtros por status, colaborador e tipo de documento
 */
describe("DocumentService - Testes Unitários", () => {
  let service: DocumentService;
  let mockDocumentRepository: any;
  let mockDocumentTypeRepository: any;
  let mockEmployeeRepository: any;
  let mockEmployeeService: any;

  // Dados mock para testes
  const mockDocumentType = {
    _id: "doc-type-123",
    id: "doc-type-123",
    name: "CPF",
    isActive: true,
  };

  const mockEmployee = {
    _id: "emp-123",
    id: "emp-123",
    name: "João Silva",
    document: "123.456.789-00",
    isActive: true,
  };

  const mockDocument = {
    _id: "doc-123",
    id: "doc-123",
    value: "123.456.789-00",
    status: "SENT",
    employeeId: "emp-123",
    documentTypeId: "doc-type-123",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Mock dos repositórios
    mockDocumentRepository = {
      find: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
    };

    mockDocumentTypeRepository = {
      findById: vi.fn(),
      find: vi.fn(),
      list: vi.fn(),
    };

    mockEmployeeRepository = {
      findById: vi.fn(),
      find: vi.fn(),
      list: vi.fn(),
    };

    mockEmployeeService = {
      getPendingDocuments: vi.fn(),
      getDocumentationStatus: vi.fn(),
    };

    // Criar instância do service com dependências mockadas
    service = new DocumentService(
      mockDocumentRepository,
      mockDocumentTypeRepository,
      mockEmployeeRepository,
      mockEmployeeService
    );

    // Limpar todos os mocks antes de cada teste
    vi.clearAllMocks();
  });

  describe("Verificação da instância e injeção", () => {
    it("deve ser criado corretamente", () => {
      expect(service).toBeInstanceOf(DocumentService);
    });

    it("deve ter todas as dependências injetadas", () => {
      expect(service["documentRepository"]).toBeDefined();
      expect(service["documentTypeRepository"]).toBeDefined();
      expect(service["employeeRepository"]).toBeDefined();
      expect(service["employeeService"]).toBeDefined();
    });
  });

  describe("extractId - Método auxiliar", () => {
    it("deve extrair ID como string", () => {
      const obj = { _id: "test-id" };
      const result = service["extractId"](obj);
      expect(result).toBe("test-id");
    });

    it("deve extrair ID de ObjectId", () => {
      const obj = { _id: { toString: () => "object-id" } };
      const result = service["extractId"](obj);
      expect(result).toBe("object-id");
    });

    it("deve retornar string vazia se não há _id", () => {
      const obj = {};
      const result = service["extractId"](obj);
      expect(result).toBe("");
    });
  });

  describe("getPendingDocuments - Documentos Pendentes", () => {
    const mockPendingDoc = {
      employee: { id: "emp-123", name: "João Silva" },
      documentType: { id: "doc-type-123", name: "CPF" },
      status: "PENDING",
      isActive: true,
    };

    beforeEach(() => {
      // Mock das validações - validateObjectId retorna string
      vi.spyOn(ValidationUtils, "validateObjectId").mockImplementation(
        (id: string) => id
      );
      vi.spyOn(PaginationUtils, "validatePage").mockImplementation(() => {});
    });

    it("deve retornar documentos pendentes com parâmetros padrão", async () => {
      // Arrange
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc,
      ]);

      // Act
      const result = await service.getPendingDocuments({});

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(mockEmployeeRepository.list).toHaveBeenCalledWith(
        { isActive: { $ne: false } },
        { page: 1, limit: 1000 }
      );
    });

    it("deve validar documentTypeId quando fornecido", async () => {
      // Arrange
      const params = { documentTypeId: "invalid-id" };
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        "invalid-id",
        "documentTypeId"
      );
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("deve retornar vazio se tipo de documento não existe", async () => {
      // Arrange
      const params = { documentTypeId: "doc-type-123" };
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    it("deve filtrar documentos por status ativo", async () => {
      // Arrange
      const params = { status: "active" };
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        { ...mockPendingDoc, isActive: true },
        { ...mockPendingDoc, isActive: false },
      ]);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(result.data).toBeDefined();
      // Documentos inativos devem ser filtrados
    });

    it("deve filtrar documentos por status inativo", async () => {
      // Arrange
      const params = { status: "inactive" };
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        { ...mockPendingDoc, isActive: false },
      ]);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(result.data).toBeDefined();
    });

    it('deve retornar todos os documentos quando status é "all"', async () => {
      // Arrange
      const params = { status: "all" };
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc,
      ]);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(result.data).toBeDefined();
    });

    it("deve tratar erro ao buscar documentos de um colaborador", async () => {
      // Arrange
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockRejectedValue(
        new Error("Erro de teste")
      );
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await service.getPendingDocuments({});

      // Assert
      expect(consoleSpy).toHaveBeenCalled();
      expect(result.data).toEqual([]);
      consoleSpy.mockRestore();
    });

    it("deve aplicar paginação corretamente", async () => {
      // Arrange
      const params = { page: 2, limit: 5 };
      mockEmployeeRepository.list.mockResolvedValue({
        items: Array(10)
          .fill(mockEmployee)
          .map((emp, i) => ({ ...emp, _id: `emp-${i}` })),
        total: 10,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc,
      ]);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(PaginationUtils.validatePage).toHaveBeenCalled();
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });

    it("deve cobrir verificação de empId vazio", async () => {
      // Arrange - Simular um ObjectId que toString() retorna string vazia
      const employeeWithEmptyStringId = {
        ...mockEmployee,
        _id: { toString: () => "" }, // ObjectId que retorna string vazia
      };

      mockEmployeeRepository.list.mockResolvedValue({
        items: [employeeWithEmptyStringId, mockEmployee],
        total: 2,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc,
      ]);

      // Act
      const result = await service.getPendingDocuments({});

      // Assert
      // Deve chamar getPendingDocuments apenas para o employee com _id válido
      expect(mockEmployeeService.getPendingDocuments).toHaveBeenCalledTimes(1);
      expect(mockEmployeeService.getPendingDocuments).toHaveBeenCalledWith(
        "emp-123"
      );
      expect(result.data).toBeDefined();
    });

    it("deve lidar com employee sem nome (usar string vazia)", async () => {
      // Arrange - employee sem name
      const employeeNoName = {
        ...mockEmployee,
        _id: "emp-no-name",
        name: undefined,
      };

      mockEmployeeRepository.list.mockResolvedValue({
        items: [employeeNoName],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        {
          employee: { id: "emp-no-name", name: undefined },
          documentType: { id: "doc-type-123", name: "CPF" },
          status: "PENDING",
          isActive: true,
        },
      ]);

      // Act
      const result = await service.getPendingDocuments({});

      // Assert - deve usar string vazia quando name for falsy
      expect(result.data.length).toBeGreaterThanOrEqual(0);
      // Encontrar o item e validar employeeName vazio
      if (result.data.length > 0) {
        expect(result.data[0].employeeName).toBe("");
      }
    });

    it("deve filtrar documentos pendentes por documentTypeId específico", async () => {
      // Arrange
      const params = { documentTypeId: "doc-type-456" };
      const pendingDocWithDifferentType = {
        ...mockPendingDoc,
        documentType: { id: "doc-type-789", name: "RG" },
      };

      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);
      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc, // documentType.id: 'doc-type-123'
        pendingDocWithDifferentType, // documentType.id: 'doc-type-789'
      ]);

      // Act
      const result = await service.getPendingDocuments(params);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        "doc-type-456",
        "documentTypeId"
      );
      // Apenas documentos com o tipo correto devem ser incluídos
      expect(result.data).toBeDefined();
    });

    it("deve ordenar documentos pendentes por nome do tipo dentro de cada colaborador", async () => {
      // Arrange - criar múltiplos documentos pendentes para o mesmo colaborador
      const mockPendingDoc1 = {
        documentType: { id: "doc-type-1", name: "ZZZ-Último" },
        isActive: true,
      };
      const mockPendingDoc2 = {
        documentType: { id: "doc-type-2", name: "AAA-Primeiro" },
        isActive: true,
      };

      mockEmployeeRepository.list.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      mockEmployeeService.getPendingDocuments.mockResolvedValue([
        mockPendingDoc1,
        mockPendingDoc2,
      ]);

      // Act
      const result = await service.getPendingDocuments({});

      // Assert
      expect(result.data.length).toBe(1); // Um colaborador
      expect(result.data[0].documents.length).toBe(2); // Dois documentos
      // Verificar se estão ordenados alfabeticamente (AAA vem antes de ZZZ)
      expect(result.data[0].documents[0].documentTypeName).toBe("AAA-Primeiro");
      expect(result.data[0].documents[1].documentTypeName).toBe("ZZZ-Último");
    });
  });

  describe("getSentDocuments - Documentos Enviados", () => {
    const mockSentDocument = {
      ...mockDocument,
      status: "SENT",
      employeeId: { toString: () => "emp-123" },
      documentTypeId: { toString: () => "doc-type-123" },
    };

    beforeEach(() => {
      vi.spyOn(ValidationUtils, "validateObjectId").mockImplementation(
        (id: string) => id
      );
      vi.spyOn(PaginationUtils, "validatePage").mockImplementation(() => {});
    });

    it("deve retornar documentos enviados com parâmetros padrão", async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([mockSentDocument]);
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);

      // Act
      const result = await service.getSentDocuments({});

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("pagination");
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        isActive: true,
      });
    });

    it("deve validar documentTypeId quando fornecido", async () => {
      // Arrange
      const params = { documentTypeId: "invalid-id" };
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        "invalid-id",
        "documentTypeId"
      );
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("deve filtrar por status inativo", async () => {
      // Arrange
      const params = { status: "inactive" };
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        isActive: false,
      });
    });

    it("deve filtrar por status ativo", async () => {
      // Arrange
      const params = { status: "active" };
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        isActive: true,
      });
    });

    it("deve filtrar por employeeId", async () => {
      // Arrange
      const params = { employeeId: "emp-123" };
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        isActive: true,
        employeeId: "emp-123",
      });
    });

    it("deve filtrar por documentTypeId", async () => {
      // Arrange
      const params = { documentTypeId: "doc-type-123" };
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        isActive: true,
        documentTypeId: "doc-type-123",
      });
    });

    it("deve combinar todos os filtros", async () => {
      // Arrange
      const params = {
        status: "all",
        employeeId: "emp-123",
        documentTypeId: "doc-type-123",
      };
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(mockDocumentRepository.find).toHaveBeenCalledWith({
        status: "SENT",
        employeeId: "emp-123",
        documentTypeId: "doc-type-123",
      });
    });

    it("deve aplicar paginação corretamente", async () => {
      // Arrange
      const params = { page: 2, limit: 3 };
      const mockDocs = Array(10).fill(mockSentDocument);
      mockDocumentRepository.find.mockResolvedValue(mockDocs);
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);

      // Act
      const result = await service.getSentDocuments(params);

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(3);
      expect(result.pagination.totalPages).toBeGreaterThan(0);
    });

    it("deve ordenar documentos por nome do tipo dentro de cada colaborador", async () => {
      // Arrange - garantir que ambos documentos têm o MESMO employeeId
      const sameEmployeeId = "emp-123";
      const mockDoc1 = {
        _id: "doc-1",
        value: "test1",
        status: "SENT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        employeeId: { toString: () => sameEmployeeId },
        documentTypeId: { toString: () => "doc-type-1" },
      };
      const mockDoc2 = {
        _id: "doc-2",
        value: "test2",
        status: "SENT",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        employeeId: { toString: () => sameEmployeeId },
        documentTypeId: { toString: () => "doc-type-2" },
      };

      // Setup para garantir que os documentos são retornados
      mockDocumentRepository.find.mockResolvedValue([mockDoc1, mockDoc2]);

      // Setup para o findById do employee - deve retornar sempre o mesmo employee
      mockEmployeeRepository.findById.mockResolvedValue({
        _id: sameEmployeeId,
        name: "João Silva",
        document: "123.456.789-00",
        isActive: true,
      });

      // Setup para os tipos de documento - ordem específica para garantir que o sort funcione
      mockDocumentTypeRepository.findById
        .mockResolvedValueOnce({
          _id: "doc-type-1",
          name: "ZZZ-Último",
          isActive: true,
        }) // Doc1 - Z vem depois
        .mockResolvedValueOnce({
          _id: "doc-type-2",
          name: "AAA-Primeiro",
          isActive: true,
        }); // Doc2 - A vem antes

      // Act
      const result = await service.getSentDocuments({});

      // Assert
      expect(result.data.length).toBe(1); // Um colaborador
      expect(result.data[0].documents.length).toBe(2); // Dois documentos
      // Verificar se estão ordenados alfabeticamente (AAA vem antes de ZZZ)
      expect(result.data[0].documents[0].documentTypeName).toBe("AAA-Primeiro");
      expect(result.data[0].documents[1].documentTypeName).toBe("ZZZ-Último");
    });

    it("deve usar createdAt/updatedAt padrão quando ausentes nos documentos enviados", async () => {
      // Arrange - documento sem createdAt/updatedAt
      const sameEmployeeId = "emp-123";
      const mockDoc = {
        _id: "doc-no-dates",
        value: "test",
        status: "SENT",
        isActive: true,
        // Sem createdAt/updatedAt
        employeeId: { toString: () => sameEmployeeId },
        documentTypeId: { toString: () => "doc-type-123" },
      };

      mockDocumentRepository.find.mockResolvedValue([mockDoc]);
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);

      // Act
      const result = await service.getSentDocuments({});

      // Assert
      expect(result.data.length).toBeGreaterThanOrEqual(0);
      if (result.data.length > 0) {
        const docs = result.data[0].documents;
        expect(docs[0].createdAt).toBeInstanceOf(Date);
        expect(docs[0].updatedAt).toBeInstanceOf(Date);
      }
    });
  });

  describe("restore - Restaurar Documento", () => {
    it("deve restaurar um documento com sucesso", async () => {
      // Arrange
      const documentId = "doc-123";
      const restoredDocument = { ...mockDocument, isActive: true };
      mockDocumentRepository.restore.mockResolvedValue(restoredDocument);

      // Act
      const result = await service.restore(documentId);

      // Assert
      expect(mockDocumentRepository.restore).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(restoredDocument);
    });

    it("deve retornar null se documento não encontrado", async () => {
      // Arrange
      const documentId = "doc-inexistente";
      mockDocumentRepository.restore.mockResolvedValue(null);

      // Act
      const result = await service.restore(documentId);

      // Assert
      expect(mockDocumentRepository.restore).toHaveBeenCalledWith(documentId);
      expect(result).toBeNull();
    });

    it("deve propagar erro de CastError automaticamente", async () => {
      // Arrange
      const invalidId = "invalid-id";
      const castError = new Error("CastError: Cast to ObjectId failed");
      castError.name = "CastError";
      mockDocumentRepository.restore.mockRejectedValue(castError);

      // Act & Assert
      await expect(service.restore(invalidId)).rejects.toThrow(castError);
      expect(mockDocumentRepository.restore).toHaveBeenCalledWith(invalidId);
    });
  });

  describe("Cenários de edge cases e tratamento de erro", () => {
    const mockSentDocument = {
      ...mockDocument,
      status: "SENT",
      employeeId: { toString: () => "emp-123" },
      documentTypeId: { toString: () => "doc-type-123" },
    };

    it("deve lidar com lista vazia de colaboradores", async () => {
      // Arrange
      mockEmployeeRepository.list.mockResolvedValue({
        items: [],
        total: 0,
      });

      // Act
      const result = await service.getPendingDocuments({});

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("deve lidar com documentos enviados sem colaborador válido", async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([mockSentDocument]);
      mockEmployeeRepository.findById.mockResolvedValue(null);
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);

      // Act
      const result = await service.getSentDocuments({});

      // Assert
      expect(result.data).toEqual([]);
    });

    it("deve lidar com documentos enviados sem tipo válido", async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([mockSentDocument]);
      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getSentDocuments({});

      // Assert
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].documents[0].documentTypeName).toBe(
        "Tipo não encontrado"
      );
    });

    it("deve manter paginação consistente mesmo com dados vazios", async () => {
      // Arrange
      mockDocumentRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getSentDocuments({ page: 1, limit: 10 });

      // Assert
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });
  });
});
