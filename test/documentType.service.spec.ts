import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentTypeService } from "../src/services/DocumentTypeService.js";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository.js";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository.js";
import { BadRequest } from "@tsed/exceptions";
import { ValidationUtils } from "../src/utils/ValidationUtils.js";
import { PaginationUtils } from "../src/utils/PaginationUtils.js";

/**
 * Testes Unitários - DocumentTypeService
 *
 *
 * Cobertura:
 *  Construtor e injeção de dependências
 *  create() - Criação com validações e padronização
 *  list() - Listagem com filtros e paginação
 *  findById() - Busca por ID com validação
 *  findByIds() - Busca múltipla por IDs
 *  update() - Atualização com validações de unicidade
 *  delete() - Soft delete com validações
 *  restore() - Restauração de tipos inativos
 *  getLinkedEmployees() - Busca colaboradores vinculados
 *  Tratamento de erros e validações
 */
describe("DocumentTypeService", () => {
  let service: DocumentTypeService;
  let mockDocumentTypeRepository: any;
  let mockEmployeeRepository: any;

  beforeEach(() => {
    // Mock do DocumentTypeRepository
    mockDocumentTypeRepository = {
      create: vi.fn(),
      findByName: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      list: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
    };

    // Mock do EmployeeRepository
    mockEmployeeRepository = {
      findByDocumentType: vi.fn(),
    };

    // Mock das validações e utils
    vi.spyOn(ValidationUtils, "validateObjectId").mockImplementation(
      () => "valid-id"
    );
    vi.spyOn(PaginationUtils, "validatePage").mockImplementation(() => {});

    // Cria instância do service com injeção de dependência via Object.defineProperty
    service = new DocumentTypeService(
      mockDocumentTypeRepository,
      mockEmployeeRepository
    );

    // Injeta os mocks via Object.defineProperty para simular o @Inject
    Object.defineProperty(service, "documentTypeRepository", {
      value: mockDocumentTypeRepository,
      writable: true,
    });

    Object.defineProperty(service, "employeeRepository", {
      value: mockEmployeeRepository,
      writable: true,
    });
  });

  describe("create", () => {
    it("cria um tipo de documento com dados válidos (trim aplicado)", async () => {
      // Arrange: dados de entrada com espaços
      const inputDto = {
        name: "  CPF  ",
        description: "  Cadastro de Pessoa Física  ",
      };

      const expectedResult = {
        _id: "generated-id",
        name: "CPF",
        description: "Cadastro de Pessoa Física",
        isActive: true,
      };

      mockDocumentTypeRepository.findByName.mockResolvedValue(null); // Não existe duplicata
      mockDocumentTypeRepository.create.mockResolvedValue(expectedResult);

      // Act
      const result = await service.create(inputDto);

      // Assert: verifica se nome foi padronizado para uppercase e trim aplicado
      expect(mockDocumentTypeRepository.findByName).toHaveBeenCalledWith("CPF");
      expect(mockDocumentTypeRepository.create).toHaveBeenCalledWith({
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      });
      expect(result).toEqual(expectedResult);
    });

    it("lança BadRequest quando name está ausente ou vazio", async () => {
      // Arrange: casos de nome inválido
      const invalidCases = [
        { name: "" },
        { name: "   " },
        { name: null as any },
        { name: undefined as any },
        {}, // sem name
      ];

      // Act & Assert: testa cada caso inválido
      for (const invalidDto of invalidCases) {
        await expect(service.create(invalidDto as any)).rejects.toThrow(
          "Name is required"
        );
      }

      // Verifica que repository não foi chamado
      expect(mockDocumentTypeRepository.findByName).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepository.create).not.toHaveBeenCalled();
    });

    it("lança BadRequest quando já existe tipo com mesmo nome (case-insensitive)", async () => {
      // Arrange: tipo existente com mesmo nome
      const inputDto = { name: "cpf" };
      const existingType = { _id: "existing-id", name: "CPF" };

      mockDocumentTypeRepository.findByName.mockResolvedValue(existingType);

      // Act & Assert
      await expect(service.create(inputDto)).rejects.toThrow(
        "Document type with this name already exists"
      );

      // Verifica que verificação foi feita
      expect(mockDocumentTypeRepository.findByName).toHaveBeenCalledWith("CPF");
      expect(mockDocumentTypeRepository.create).not.toHaveBeenCalled();
    });

    it("deve usar string vazia quando description é undefined na criação", async () => {
      // Arrange: DTO sem description
      const inputDto = { name: "RG" };

      mockDocumentTypeRepository.findByName.mockResolvedValue(null);
      mockDocumentTypeRepository.create.mockResolvedValue({
        _id: "id",
        name: "RG",
      });

      // Act
      await service.create(inputDto);

      // Assert: description deve ser string vazia
      expect(mockDocumentTypeRepository.create).toHaveBeenCalledWith({
        name: "RG",
        description: "",
      });
    });
  });

  describe("list", () => {
    it("lista sem filtros usando filtro vazio e repassa opts", async () => {
      // Arrange
      const expectedResult = {
        items: [{ _id: "id1", name: "CPF" }],
        total: 1,
      };

      mockDocumentTypeRepository.list.mockResolvedValue(expectedResult);

      // Act: sem parâmetros
      const result = await service.list();

      // Assert
      expect(mockDocumentTypeRepository.list).toHaveBeenCalledWith({}, {});
      expect(result).toEqual(expectedResult);
    });

    it("constrói regex case-insensitive quando name for fornecido", async () => {
      // Arrange
      const filter = { name: "CPF", status: "active" as const };
      const opts = { page: 2, limit: 5 };

      mockDocumentTypeRepository.list.mockResolvedValue({
        items: [],
        total: 0,
      });

      // Act
      await service.list(filter, opts);

      // Assert: repassa filtros e opções direto para repository
      expect(mockDocumentTypeRepository.list).toHaveBeenCalledWith(
        filter,
        opts
      );
    });
  });

  describe("findById / findByIds", () => {
    it("delegates findById to repository", async () => {
      // Arrange
      const id = "document-type-id";
      const expectedResult = { _id: id, name: "CPF" };

      mockDocumentTypeRepository.findById.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });

    it("retorna [] quando findByIds recebe array vazio", async () => {
      // Act & Assert: testa diferentes arrays vazios
      expect(await service.findByIds([])).toEqual([]);
      expect(await service.findByIds(null as any)).toEqual([]);
      expect(await service.findByIds(undefined as any)).toEqual([]);

      // Verifica que repository não foi chamado
      expect(mockDocumentTypeRepository.findByIds).not.toHaveBeenCalled();
    });

    it("delegates findByIds to repository quando ids presentes", async () => {
      // Arrange
      const ids = ["id1", "id2"];
      const expectedResult = [
        { _id: "id1", name: "CPF" },
        { _id: "id2", name: "RG" },
      ];

      mockDocumentTypeRepository.findByIds.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findByIds(ids);

      // Assert
      expect(mockDocumentTypeRepository.findByIds).toHaveBeenCalledWith(ids);
      expect(result).toEqual(expectedResult);
    });
  });

  describe("update", () => {
    it("deve atualizar tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF", description: "Antigo" };
      const updateDto = {
        name: "cpf atualizado",
        description: "Nova descrição",
      };
      const expectedResult = {
        _id: id,
        name: "CPF ATUALIZADO",
        description: "Nova descrição",
      };

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.findByName.mockResolvedValue(null); // Não há duplicata
      mockDocumentTypeRepository.update.mockResolvedValue(expectedResult);

      // Act
      const result = await service.update(id, updateDto);

      // Assert: verifica padronização e validações
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.findByName).toHaveBeenCalledWith(
        "CPF ATUALIZADO"
      );
      expect(mockDocumentTypeRepository.update).toHaveBeenCalledWith(id, {
        name: "CPF ATUALIZADO",
        description: "Nova descrição",
      });
      expect(result).toEqual(expectedResult);
    });

    it("deve retornar null se tipo de documento não existir", async () => {
      // Arrange
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.update("non-existent-id", { name: "Test" });

      // Assert
      expect(result).toBeNull();
      expect(mockDocumentTypeRepository.update).not.toHaveBeenCalled();
    });

    it("deve lançar erro se ID for inválido", async () => {
      // Arrange: mock do ValidationUtils para lançar erro
      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw new BadRequest("ID é obrigatório e deve ser um ObjectId válido");
      });

      // Act & Assert
      await expect(
        service.update("invalid-id", { name: "Test" })
      ).rejects.toThrow("ID é obrigatório e deve ser um ObjectId válido");
    });

    it("deve lançar erro se nome já existir em outro registro", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF" };
      const duplicateType = { _id: "other-id", name: "RG NOVO" }; // Outro registro com nome duplicado

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.findByName.mockResolvedValue(duplicateType);

      // Act & Assert
      await expect(service.update(id, { name: "rg novo" })).rejects.toThrow(
        "Document type with this name already exists"
      );
    });

    it("deve permitir atualizar mesmo nome do registro atual", async () => {
      // Arrange: atualiza o mesmo nome (case insensitive)
      const id = "test-id";
      const existingType = { _id: id, name: "CPF" };
      const updateDto = { name: "cpf", description: "Nova descrição" };

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.update.mockResolvedValue({
        ...existingType,
        ...updateDto,
      });

      // Act
      const result = await service.update(id, updateDto);

      // Assert: não deve verificar duplicata pois é o mesmo nome
      expect(mockDocumentTypeRepository.findByName).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepository.update).toHaveBeenCalledWith(id, {
        name: "CPF",
        description: "Nova descrição",
      });
    });

    it("deve retornar tipo existente se não houver dados para atualizar", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF" };

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);

      // Act: dados vazios para atualização
      const result = await service.update(id, {});

      // Assert: retorna existente sem chamar update
      expect(result).toEqual(existingType);
      expect(mockDocumentTypeRepository.update).not.toHaveBeenCalled();
    });

    it("deve tratar description undefined no update corretamente", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF" };
      const updateDto = { description: "" }; // String vazia em vez de undefined

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.update.mockResolvedValue(existingType);

      // Act
      await service.update(id, updateDto);

      // Assert: description vazia deve ser mantida como string vazia
      expect(mockDocumentTypeRepository.update).toHaveBeenCalledWith(id, {
        description: "",
      });
    });

    it("deve tratar description undefined ignorando o campo", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF" };
      const updateDto = { description: undefined }; // undefined deve ser ignorado

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.update.mockResolvedValue(existingType);

      // Act
      const result = await service.update(id, updateDto);

      // Assert: nenhum update deve ser chamado pois description undefined é ignorada
      expect(mockDocumentTypeRepository.update).not.toHaveBeenCalled();
      expect(result).toBe(existingType); // Retorna o existingType sem atualizar
    });
  });

  describe("delete", () => {
    it("deve fazer soft delete de tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const existingType = { _id: id, name: "CPF", isActive: true };
      const deletedType = {
        ...existingType,
        isActive: false,
        deletedAt: new Date(),
      };

      mockDocumentTypeRepository.findById.mockResolvedValue(existingType);
      mockDocumentTypeRepository.softDelete.mockResolvedValue(deletedType);

      // Act
      const result = await service.delete(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.softDelete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deletedType);
    });

    it("deve retornar null se tipo de documento não existir", async () => {
      // Arrange
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.delete("non-existent-id");

      // Assert
      expect(result).toBeNull();
      expect(mockDocumentTypeRepository.softDelete).not.toHaveBeenCalled();
    });

    it("deve lançar erro se ID for inválido", async () => {
      // Arrange
      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw new BadRequest("ID é obrigatório e deve ser um ObjectId válido");
      });

      // Act & Assert
      await expect(service.delete("invalid-id")).rejects.toThrow(
        "ID é obrigatório e deve ser um ObjectId válido"
      );
    });
  });

  describe("restore", () => {
    it("deve restaurar tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const restoredType = {
        _id: id,
        name: "CPF",
        isActive: true,
        deletedAt: null,
      };

      mockDocumentTypeRepository.restore.mockResolvedValue(restoredType);

      // Act
      const result = await service.restore(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeRepository.restore).toHaveBeenCalledWith(id);
      expect(result).toEqual(restoredType);
    });

    it("deve retornar null se tipo de documento não existir", async () => {
      // Arrange
      mockDocumentTypeRepository.restore.mockResolvedValue(null);

      // Act
      const result = await service.restore("non-existent-id");

      // Assert
      expect(result).toBeNull();
    });

    it("deve lançar erro se ID for inválido", async () => {
      // Arrange
      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw new BadRequest("ID é obrigatório e deve ser um ObjectId válido");
      });

      // Act & Assert
      await expect(service.restore("invalid-id")).rejects.toThrow(
        "ID é obrigatório e deve ser um ObjectId válido"
      );
    });
  });

  describe("getLinkedEmployees", () => {
    it("deve retornar colaboradores vinculados ao tipo de documento", async () => {
      // Arrange
      const documentTypeId = "doc-type-id";
      const options = { page: 1, limit: 10 };
      const documentType = { _id: documentTypeId, name: "CPF" };
      const employeesResult = {
        items: [
          { _id: "emp1", name: "João Silva" },
          { _id: "emp2", name: "Maria Santos" },
        ],
        total: 2,
      };

      // Mock do findById através do service (que chamará repository)
      mockDocumentTypeRepository.findById.mockResolvedValue(documentType);
      mockEmployeeRepository.findByDocumentType.mockResolvedValue(
        employeesResult
      );

      // Act
      const result = await service.getLinkedEmployees(documentTypeId, options);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        documentTypeId
      );
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(
        documentTypeId
      );
      expect(mockEmployeeRepository.findByDocumentType).toHaveBeenCalledWith(
        documentTypeId,
        options
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(
        options.page,
        employeesResult.total,
        options.limit
      );
      expect(result).toEqual(employeesResult);
    });

    it("deve retornar array vazio se tipo de documento não existir", async () => {
      // Arrange
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getLinkedEmployees("non-existent-id");

      // Assert
      expect(result).toEqual({ items: [], total: 0 });
      expect(mockEmployeeRepository.findByDocumentType).not.toHaveBeenCalled();
      expect(PaginationUtils.validatePage).not.toHaveBeenCalled();
    });

    it("deve lançar erro se ID for inválido", async () => {
      // Arrange
      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw new BadRequest("ID é obrigatório e deve ser um ObjectId válido");
      });

      // Act & Assert
      await expect(service.getLinkedEmployees("invalid-id")).rejects.toThrow(
        "ID é obrigatório e deve ser um ObjectId válido"
      );
    });
  });
});
