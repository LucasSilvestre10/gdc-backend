import { StatusFilterDto } from "./../src/dtos/employeeDTO";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeBasicOperations } from "../src/services/employee/EmployeeBasicOperationsService";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { ValidationUtils } from "../src/utils/ValidationUtils";
import { PaginationUtils } from "../src/utils/PaginationUtils";
import { DuplicateEmployeeError, ValidationError } from "../src/exceptions";

// Mock das dependências
vi.mock("../src/repositories/EmployeeRepository");
vi.mock("../src/utils/ValidationUtils");
vi.mock("../../src/utils/PaginationUtils");

describe("EmployeeBasicOperations", () => {
  let employeeBasicOps: EmployeeBasicOperations;
  let mockEmployeeRepo: any;

  beforeEach(() => {
    // Configurar mocks
    mockEmployeeRepo = {
      list: vi.fn(),
      findById: vi.fn(),
      findByDocument: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      searchByNameOrCpf: vi.fn(),
    };

    // Mock do ValidationUtils
    (ValidationUtils.validateObjectId as any) = vi.fn();

    // Mock do PaginationUtils
    (PaginationUtils.validatePage as any) = vi.fn();

    // Injetar mock no service usando Object.defineProperty
    employeeBasicOps = new EmployeeBasicOperations(mockEmployeeRepo);
    Object.defineProperty(employeeBasicOps, "employeeRepo", {
      value: mockEmployeeRepo,
      writable: true,
    });
  });

  describe("list - Listagem de Colaboradores", () => {
    it("deve listar colaboradores com parâmetros padrão", async () => {
      // Arrange
      const mockResult = {
        items: [
          {
            _id: "1",
            name: "João Silva",
            document: "12345678901",
            isActive: true,
          },
          {
            _id: "2",
            name: "Maria Santos",
            document: "98765432100",
            isActive: true,
          },
        ],
        total: 2,
      };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act
      const result = await employeeBasicOps.list();

      // Assert
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(1, 2, 20);
      expect(result).toEqual(mockResult);
    });

    it("deve aplicar filtros e paginação customizada", async () => {
      // Arrange
      const filter = {
        name: "João",
        status: "active" as "all" | "active" | "inactive",
      };
      const opts = { page: 2, limit: 10 };
      const mockResult = { items: [], total: 25 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act
      const result = await employeeBasicOps.list(filter, opts);

      // Assert
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(filter, {
        page: 2,
        limit: 10,
      });
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(2, 25, 10);
      expect(result).toEqual(mockResult);
    });

    it("deve validar status permitidos", async () => {
      // Arrange
      const filter = { status: "invalid-status" as any };

      // Act & Assert
      await expect(employeeBasicOps.list(filter)).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.list(filter)).rejects.toThrow(
        "Parâmetro 'status' inválido: invalid-status"
      );
      expect(mockEmployeeRepo.list).not.toHaveBeenCalled();
    });

    it("deve aceitar status válidos", async () => {
      // Arrange
      const validStatuses = ["active", "inactive", "all"];
      const mockResult = { items: [], total: 0 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act & Assert
      for (const status of validStatuses) {
        await employeeBasicOps.list({ status } as StatusFilterDto);
        expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
          { status },
          { page: 1, limit: 20 }
        );
      }
    });

    it("deve validar parâmetros de paginação", async () => {
      // Arrange: configurar mock para retornar resultado válido
      const mockResult = { items: [], total: 0 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act & Assert: valores inválidos devem usar padrões
      await employeeBasicOps.list({}, { page: 0, limit: 10 });
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 10 }
      );

      mockEmployeeRepo.list.mockClear();

      await employeeBasicOps.list({}, { page: 1, limit: 0 });
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 }
      );
    });

    it("deve converter strings numéricas para números na paginação", async () => {
      // Arrange
      const opts = { page: "3" as any, limit: "15" as any };
      const mockResult = { items: [], total: 50 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act
      await employeeBasicOps.list({}, opts);

      // Assert
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 3, limit: 15 }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(3, 50, 15);
    });

    it("deve usar valores padrão quando page e limit são inválidos", async () => {
      // Arrange
      const opts = { page: NaN, limit: NaN };
      const mockResult = { items: [], total: 0 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act
      await employeeBasicOps.list({}, opts);

      // Assert
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 }
      );
    });
  });

  describe("findById - Busca por ID", () => {
    it("deve encontrar colaborador por ID válido", async () => {
      // Arrange
      const id = "valid-object-id";
      const employee = { _id: id, name: "João Silva", document: "12345678901" };
      mockEmployeeRepo.findById.mockResolvedValue(employee);

      // Act
      const result = await employeeBasicOps.findById(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(employee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.findById(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });

    it("deve propagar erro de validação de ObjectId", async () => {
      // Arrange
      const id = "invalid-id";
      const validationError = new Error("ID inválido");
      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(employeeBasicOps.findById(id)).rejects.toThrow(
        validationError
      );
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
    });
  });

  describe("findByDocument - Busca por CPF", () => {
    it("deve encontrar colaborador por documento", async () => {
      // Arrange
      const document = "12345678901";
      const employee = { _id: "test-id", name: "João Silva", document };
      mockEmployeeRepo.findByDocument.mockResolvedValue(employee);

      // Act
      const result = await employeeBasicOps.findByDocument(document);

      // Assert
      expect(mockEmployeeRepo.findByDocument).toHaveBeenCalledWith(document);
      expect(result).toEqual(employee);
    });

    it("deve retornar null se documento não existir", async () => {
      // Arrange
      const document = "99999999999";
      mockEmployeeRepo.findByDocument.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.findByDocument(document);

      // Assert
      expect(mockEmployeeRepo.findByDocument).toHaveBeenCalledWith(document);
      expect(result).toBeNull();
    });
  });

  describe("create - Criação de Colaborador", () => {
    it("deve criar colaborador com dados válidos", async () => {
      // Arrange
      const employeeData = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: new Date("2024-01-15"),
      };
      const createdEmployee = {
        _id: "test-id",
        ...employeeData,
        isActive: true,
      };

      mockEmployeeRepo.findByDocument.mockResolvedValue(null); // CPF não existe
      mockEmployeeRepo.create.mockResolvedValue(createdEmployee);

      // Act
      const result = await employeeBasicOps.create(employeeData);

      // Assert
      expect(mockEmployeeRepo.findByDocument).toHaveBeenCalledWith(
        employeeData.document
      );
      expect(mockEmployeeRepo.create).toHaveBeenCalledWith({
        name: employeeData.name,
        document: employeeData.document,
        hiredAt: employeeData.hiredAt,
      });
      expect(result).toEqual(createdEmployee);
    });

    it("deve usar data atual quando hiredAt não fornecida", async () => {
      // Arrange
      const employeeData = {
        name: "Maria Santos",
        document: "98765432100",
        hiredAt: undefined as any,
      };
      const createdEmployee = {
        _id: "test-id",
        ...employeeData,
        isActive: true,
      };

      mockEmployeeRepo.findByDocument.mockResolvedValue(null);
      mockEmployeeRepo.create.mockResolvedValue(createdEmployee);

      // Act
      await employeeBasicOps.create(employeeData);

      // Assert
      const createCall = mockEmployeeRepo.create.mock.calls[0][0];
      expect(createCall.hiredAt).toBeInstanceOf(Date);
    });

    it("deve lançar erro se CPF já existir", async () => {
      // Arrange
      const employeeData = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: new Date(),
      };
      const existingEmployee = {
        _id: "existing-id",
        document: employeeData.document,
      };

      mockEmployeeRepo.findByDocument.mockResolvedValue(existingEmployee);

      // Act & Assert
      await expect(employeeBasicOps.create(employeeData)).rejects.toThrow(
        DuplicateEmployeeError
      );
      expect(mockEmployeeRepo.findByDocument).toHaveBeenCalledWith(
        employeeData.document
      );
      expect(mockEmployeeRepo.create).not.toHaveBeenCalled();
    });

    it("deve propagar erro do repository na criação", async () => {
      // Arrange
      const employeeData = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: new Date(),
      };
      const repositoryError = new Error("Database error");

      mockEmployeeRepo.findByDocument.mockResolvedValue(null);
      mockEmployeeRepo.create.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(employeeBasicOps.create(employeeData)).rejects.toThrow(
        repositoryError
      );
      expect(mockEmployeeRepo.create).toHaveBeenCalled();
    });
  });

  describe("updateEmployee - Atualização de Colaborador", () => {
    it("deve atualizar colaborador com dados válidos", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = { name: "João da Silva Atualizado" };
      const updatedEmployee = { _id: id, ...updateDto, isActive: true };

      mockEmployeeRepo.update.mockResolvedValue(updatedEmployee);

      // Act
      const result = await employeeBasicOps.updateEmployee(id, updateDto);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedEmployee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      const updateDto = { name: "Nome Atualizado" };

      mockEmployeeRepo.update.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.updateEmployee(id, updateDto);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toBeNull();
    });

    it("deve lançar DuplicateEmployeeError se alterar CPF para um já existente", async () => {
      // Arrange
      const id = "existing-id";
      const updateDto = { document: "11122233344" };

      // Mock: colaborador atual
      const currentEmployee = { _id: id, document: "99988877766" };
      mockEmployeeRepo.findById.mockResolvedValue(currentEmployee);

      // Mock: existe outro colaborador com o CPF desejado
      const otherEmployee = { _id: "other-id", document: updateDto.document };
      mockEmployeeRepo.findByDocument.mockResolvedValue(otherEmployee);

      // Act & Assert
      await expect(
        employeeBasicOps.updateEmployee(id, updateDto as any)
      ).rejects.toThrow(DuplicateEmployeeError);

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(mockEmployeeRepo.findByDocument).toHaveBeenCalledWith(
        updateDto.document
      );
      expect(mockEmployeeRepo.update).not.toHaveBeenCalled();
    });

    it("deve retornar null se dto.document informado mas colaborador não existir", async () => {
      // Arrange
      const id = "missing-id";
      const updateDto = { document: "11122233344" };

      // findById retorna null (colaborador não existe)
      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.updateEmployee(id, updateDto as any);

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
      expect(mockEmployeeRepo.findByDocument).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.update).not.toHaveBeenCalled();
    });

    it("deve validar ObjectId antes da atualização", async () => {
      // Arrange
      const id = "invalid-id";
      const updateDto = { name: "Nome Atualizado" };
      const validationError = new Error("ID inválido");

      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(
        employeeBasicOps.updateEmployee(id, updateDto)
      ).rejects.toThrow(validationError);
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.update).not.toHaveBeenCalled();
    });

    it("deve atualizar com objeto vazio", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = {};
      const updatedEmployee = { _id: id, name: "João Silva" };

      mockEmployeeRepo.update.mockResolvedValue(updatedEmployee);

      // Act
      const result = await employeeBasicOps.updateEmployee(id, updateDto);

      // Assert
      expect(mockEmployeeRepo.update).toHaveBeenCalledWith(id, updateDto);
      expect(result).toEqual(updatedEmployee);
    });
  });

  describe("delete - Soft Delete", () => {
    it("deve fazer soft delete de colaborador existente", async () => {
      // Arrange
      const id = "test-id";
      const employee = { _id: id, name: "João Silva", isActive: true };
      const deletedEmployee = {
        ...employee,
        isActive: false,
        deletedAt: new Date(),
      };

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockEmployeeRepo.softDelete.mockResolvedValue(deletedEmployee);

      // Act
      const result = await employeeBasicOps.delete(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(mockEmployeeRepo.softDelete).toHaveBeenCalledWith(id);
      expect(result).toEqual(deletedEmployee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.delete(id);

      // Assert
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(id);
      expect(mockEmployeeRepo.softDelete).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("deve validar ID obrigatório", async () => {
      // Arrange & Act & Assert
      await expect(employeeBasicOps.delete("")).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.delete("   ")).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.delete(null as any)).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.delete(undefined as any)).rejects.toThrow(
        ValidationError
      );

      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.softDelete).not.toHaveBeenCalled();
    });

    it("deve validar formato do ObjectId", async () => {
      // Arrange
      const id = "invalid-id";
      const validationError = new Error("ID inválido");

      (ValidationUtils.validateObjectId as any).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(employeeBasicOps.delete(id)).rejects.toThrow(
        validationError
      );
      expect(ValidationUtils.validateObjectId).toHaveBeenCalledWith(
        id,
        "ID do colaborador"
      );
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
    });

    it("deve propagar erro do repository", async () => {
      // Arrange
      const id = "test-id";
      const employee = { _id: id, name: "João Silva" };
      const repositoryError = new Error("Database error");

      mockEmployeeRepo.findById.mockResolvedValue(employee);
      mockEmployeeRepo.softDelete.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(employeeBasicOps.delete(id)).rejects.toThrow(
        repositoryError
      );
      expect(mockEmployeeRepo.softDelete).toHaveBeenCalledWith(id);
    });
  });

  describe("restore - Restauração", () => {
    it("deve restaurar colaborador com ID válido", async () => {
      // Arrange
      const id = "test-id";
      const restoredEmployee = {
        _id: id,
        name: "João Silva",
        isActive: true,
        deletedAt: null,
      };

      mockEmployeeRepo.restore.mockResolvedValue(restoredEmployee);

      // Act
      const result = await employeeBasicOps.restore(id);

      // Assert
      expect(mockEmployeeRepo.restore).toHaveBeenCalledWith(id);
      expect(result).toEqual(restoredEmployee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";

      mockEmployeeRepo.restore.mockResolvedValue(null);

      // Act
      const result = await employeeBasicOps.restore(id);

      // Assert
      expect(mockEmployeeRepo.restore).toHaveBeenCalledWith(id);
      expect(result).toBeNull();
    });

    it("deve validar ID obrigatório", async () => {
      // Arrange & Act & Assert
      await expect(employeeBasicOps.restore("")).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.restore("   ")).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.restore(null as any)).rejects.toThrow(
        ValidationError
      );
      await expect(employeeBasicOps.restore(undefined as any)).rejects.toThrow(
        ValidationError
      );

      expect(mockEmployeeRepo.restore).not.toHaveBeenCalled();
    });

    it("deve propagar erro do repository", async () => {
      // Arrange
      const id = "test-id";
      const repositoryError = new Error("Database error");

      mockEmployeeRepo.restore.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(employeeBasicOps.restore(id)).rejects.toThrow(
        repositoryError
      );
      expect(mockEmployeeRepo.restore).toHaveBeenCalledWith(id);
    });
  });

  describe("searchByNameOrCpf - Busca Combinada", () => {
    it("deve buscar por nome ou CPF com parâmetros padrão", async () => {
      // Arrange
      const query = "joão";
      const searchResult = {
        items: [{ _id: "1", name: "João Silva", document: "12345678901" }],
        total: 1,
      };

      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      const result = await employeeBasicOps.searchByNameOrCpf(query);

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        query,
        {},
        {}
      );
      expect(result).toEqual(searchResult);
    });

    it("deve buscar com filtros e paginação customizada", async () => {
      // Arrange
      const query = "maria";
      const filters = { status: "active" };
      const opts = { page: 2, limit: 5 };
      const searchResult = { items: [], total: 0 };

      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      const result = await employeeBasicOps.searchByNameOrCpf(
        query,
        filters,
        opts
      );

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        query,
        filters,
        opts
      );
      expect(result).toEqual(searchResult);
    });

    it("deve buscar por CPF formatado", async () => {
      // Arrange
      const query = "123.456.789-01";
      const searchResult = {
        items: [{ _id: "1", name: "João Silva", document: query }],
        total: 1,
      };

      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      const result = await employeeBasicOps.searchByNameOrCpf(query);

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        query,
        {},
        {}
      );
      expect(result).toEqual(searchResult);
    });

    it("deve delegar filtros de status para repository", async () => {
      // Arrange
      const query = "test";
      const filters = { status: "inactive" };
      const searchResult = { items: [], total: 0 };

      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      await employeeBasicOps.searchByNameOrCpf(query, filters);

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        query,
        filters,
        {}
      );
    });

    it("deve propagar erro do repository", async () => {
      // Arrange
      const query = "test";
      const repositoryError = new Error("Database error");

      mockEmployeeRepo.searchByNameOrCpf.mockRejectedValue(repositoryError);

      // Act & Assert
      await expect(employeeBasicOps.searchByNameOrCpf(query)).rejects.toThrow(
        repositoryError
      );
    });

    it("deve buscar com query vazia", async () => {
      // Arrange
      const query = "";
      const searchResult = { items: [], total: 0 };

      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      const result = await employeeBasicOps.searchByNameOrCpf(query);

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        query,
        {},
        {}
      );
      expect(result).toEqual(searchResult);
    });
  });

  describe("Cenários de edge cases e validações", () => {
    it("deve lidar com dados de paginação não numéricos graciosamente", async () => {
      // Arrange
      const opts = { page: "abc" as any, limit: "xyz" as any };
      const mockResult = { items: [], total: 0 };
      mockEmployeeRepo.list.mockResolvedValue(mockResult);

      // Act
      await employeeBasicOps.list({}, opts);

      // Assert
      expect(mockEmployeeRepo.list).toHaveBeenCalledWith(
        {},
        { page: 1, limit: 20 }
      );
    });

    it("deve validar status case-sensitive", async () => {
      // Arrange
      const filter = { status: "ACTIVE" as any }; // Maiúsculo não é válido

      // Act & Assert
      await expect(employeeBasicOps.list(filter)).rejects.toThrow(
        ValidationError
      );
    });

    it("deve lidar com hiredAt como string na criação", async () => {
      // Arrange
      const employeeData = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: "2024-01-15" as any, // String em vez de Date
      };

      mockEmployeeRepo.findByDocument.mockResolvedValue(null);
      mockEmployeeRepo.create.mockResolvedValue({
        _id: "test-id",
        ...employeeData,
      });

      // Act
      await employeeBasicOps.create(employeeData);

      // Assert
      expect(mockEmployeeRepo.create).toHaveBeenCalledWith({
        name: employeeData.name,
        document: employeeData.document,
        hiredAt: employeeData.hiredAt,
      });
    });

    it("deve lidar com repository retornando undefined em create", async () => {
      // Arrange
      const employeeData = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: new Date(),
      };

      mockEmployeeRepo.findByDocument.mockResolvedValue(null);
      mockEmployeeRepo.create.mockResolvedValue(undefined);

      // Act
      const result = await employeeBasicOps.create(employeeData);

      // Assert
      expect(result).toBeUndefined();
    });

    it("deve lidar com strings vazias nos parâmetros de busca", async () => {
      // Arrange
      const searchResult = { items: [], total: 0 };
      mockEmployeeRepo.searchByNameOrCpf.mockResolvedValue(searchResult);

      // Act
      await employeeBasicOps.searchByNameOrCpf(
        "",
        { status: "" },
        { page: 0, limit: 0 }
      );

      // Assert
      expect(mockEmployeeRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        "",
        { status: "" },
        { page: 0, limit: 0 }
      );
    });
  });
});
