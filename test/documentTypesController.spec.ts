import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentTypesController } from "../src/controllers/rest/DocumentTypesController";
import { DocumentTypeService } from "../src/services/DocumentTypeService";
import { ResponseHandler } from "../src/middleware/ResponseHandler";
import { PaginationUtils } from "../src/utils/PaginationUtils";
import { NotFound } from "@tsed/exceptions";

// Mock das dependências
vi.mock("../src/services/DocumentTypeService");
vi.mock("../src/middleware/ResponseHandler");
vi.mock("../src/utils/PaginationUtils");

describe("DocumentTypesController", () => {
  let controller: DocumentTypesController;
  let mockDocumentTypeService: any;

  beforeEach(() => {
    // Configurar mocks
    mockDocumentTypeService = {
      create: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      restore: vi.fn(),
      getLinkedEmployees: vi.fn(),
    };

    // Mock do ResponseHandler
    (ResponseHandler.success as any) = vi
      .fn()
      .mockImplementation((data, message) => ({
        success: true,
        data,
        message,
      }));

    // Mock do PaginationUtils
    (PaginationUtils.validatePage as any) = vi.fn();
    (PaginationUtils.createPaginatedResult as any) = vi
      .fn()
      .mockImplementation((items, page, limit, total) => ({
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }));

    // Injetar o mock no controller usando Object.defineProperty
    controller = new DocumentTypesController(mockDocumentTypeService);
    Object.defineProperty(controller, "documentTypeService", {
      value: mockDocumentTypeService,
      writable: true,
    });
  });

  describe("create", () => {
    it("deve criar um tipo de documento com sucesso", async () => {
      // Arrange
      const createDto = {
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      };
      const createdDocumentType = {
        _id: "test-id",
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      };

      mockDocumentTypeService.create.mockResolvedValue(createdDocumentType);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(mockDocumentTypeService.create).toHaveBeenCalledWith(createDto);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        createdDocumentType,
        "Tipo de documento criado com sucesso"
      );
      expect(result).toEqual({
        success: true,
        data: createdDocumentType,
        message: "Tipo de documento criado com sucesso",
      });
    });

    it("deve propagar erro do service", async () => {
      // Arrange
      const createDto = {
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      };
      const error = new Error("Nome já existe");

      mockDocumentTypeService.create.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow(error);
      expect(mockDocumentTypeService.create).toHaveBeenCalledWith(createDto);
    });
  });

  describe("list", () => {
    it("deve listar tipos de documento com parâmetros padrão", async () => {
      // Arrange
      const mockResult = {
        items: [
          {
            _id: "test-id",
            name: "CPF",
            description: "Cadastro de Pessoa Física",
          },
        ],
        total: 1,
      };

      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      // Act
      const result = await controller.list();

      // Assert
      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: undefined, status: "active" },
        { page: 1, limit: 10 }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(1, 1, 10);
      expect(PaginationUtils.createPaginatedResult).toHaveBeenCalledWith(
        mockResult.items,
        1,
        10,
        1
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        expect.any(Object),
        "Tipos de documento listados com sucesso"
      );
    });

    it("deve listar tipos de documento com filtros personalizados", async () => {
      // Arrange
      const mockResult = {
        items: [{ _id: "test-id", name: "RG", description: "Registro Geral" }],
        total: 1,
      };

      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      // Act
      const result = await controller.list(2, 5, "RG", "inactive");

      // Assert
      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: "RG", status: "inactive" },
        { page: 2, limit: 5 }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(2, 1, 5);
    });

    it("deve usar status padrão quando não fornecido", async () => {
      // Arrange
      const mockResult = { items: [], total: 0 };
      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      // Act
      await controller.list(1, 10, "test");

      // Assert
      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: "test", status: "active" },
        { page: 1, limit: 10 }
      );
    });

    it("deve tratar valores null/undefined para page/limit e status vazio corretamente", async () => {
      // Arrange
      const mockResult = { items: [{ _id: "a" }], total: 1 };
      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      // Act: passar nulls para page/limit e status vazia
      const result = await controller.list(
        null as any,
        null as any,
        undefined,
        "" as any
      );

      // Assert: service recebeu defaults via ?? e ||
      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: undefined, status: "active" },
        { page: 1, limit: 10 }
      );
      expect(ResponseHandler.success).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("deve aceitar page undefined e limit fornecido (page default, limit personalizado)", async () => {
      const mockResult = { items: [{ _id: 'a' }], total: 2 };
      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      await controller.list(undefined as any, 5 as any, undefined, undefined);

      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: undefined, status: "active" },
        { page: 1, limit: 5 }
      );
    });

    it("deve aceitar page fornecido e limit undefined (page personalizado, limit default)", async () => {
      const mockResult = { items: [{ _id: 'b' }], total: 2 };
      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      await controller.list(3 as any, undefined as any, undefined, undefined);

      expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
        { name: undefined, status: "active" },
        { page: 3, limit: 10 }
      );
    });

    it("deve propagar erro quando pagina inválida (validatePage lança)", async () => {
      // Arrange
      const mockResult = { items: [], total: 100 };
      mockDocumentTypeService.list.mockResolvedValue(mockResult);

      // Fazer com que validatePage lance para simular página inválida
      (PaginationUtils.validatePage as any) = vi.fn().mockImplementation(() => {
        throw new Error("Página inválida");
      });

      // Act & Assert
      await expect(controller.list(999, 10)).rejects.toThrow("Página inválida");
      expect(mockDocumentTypeService.list).toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("deve retornar tipo de documento encontrado", async () => {
      // Arrange
      const id = "test-id";
      const documentType = {
        _id: id,
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      };

      mockDocumentTypeService.findById.mockResolvedValue(documentType);

      // Act
      const result = await controller.findById(id);

      // Assert
      expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        documentType,
        "Tipo de documento encontrado com sucesso"
      );
      expect(result).toEqual({
        success: true,
        data: documentType,
        message: "Tipo de documento encontrado com sucesso",
      });
    });

    it("deve lançar NotFound quando tipo não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockDocumentTypeService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.findById(id)).rejects.toThrow(NotFound);
      await expect(controller.findById(id)).rejects.toThrow(
        "Tipo de documento não encontrado"
      );
      expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
    });
  });

  describe("update", () => {
    it("deve atualizar tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = { name: "RG", description: "Registro Geral" };
      const updatedDocumentType = {
        _id: id,
        name: "RG",
        description: "Registro Geral",
      };

      mockDocumentTypeService.update.mockResolvedValue(updatedDocumentType);

      // Act
      const result = await controller.update(id, updateDto);

      // Assert
      expect(mockDocumentTypeService.update).toHaveBeenCalledWith(
        id,
        updateDto
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        updatedDocumentType,
        "Tipo de documento atualizado com sucesso"
      );
      expect(result).toEqual({
        success: true,
        data: updatedDocumentType,
        message: "Tipo de documento atualizado com sucesso",
      });
    });

    it("deve lançar NotFound quando tipo não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      const updateDto = { name: "RG" };
      mockDocumentTypeService.update.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.update(id, updateDto)).rejects.toThrow(NotFound);
      await expect(controller.update(id, updateDto)).rejects.toThrow(
        "Tipo de documento não encontrado"
      );
      expect(mockDocumentTypeService.update).toHaveBeenCalledWith(
        id,
        updateDto
      );
    });

    it("deve propagar erro do service", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = { name: "RG" };
      const error = new Error("Nome já existe");

      mockDocumentTypeService.update.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.update(id, updateDto)).rejects.toThrow(error);
      expect(mockDocumentTypeService.update).toHaveBeenCalledWith(
        id,
        updateDto
      );
    });
  });

  describe("delete", () => {
    it("deve deletar tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const deletedDocumentType = { _id: id, name: "CPF", isActive: false };

      mockDocumentTypeService.delete.mockResolvedValue(deletedDocumentType);

      // Act
      const result = await controller.delete(id);

      // Assert
      expect(mockDocumentTypeService.delete).toHaveBeenCalledWith(id);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        deletedDocumentType,
        "Tipo de documento removido com sucesso"
      );
      expect(result).toEqual({
        success: true,
        data: deletedDocumentType,
        message: "Tipo de documento removido com sucesso",
      });
    });

    it("deve lançar NotFound quando tipo não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockDocumentTypeService.delete.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.delete(id)).rejects.toThrow(NotFound);
      await expect(controller.delete(id)).rejects.toThrow(
        "Tipo de documento não encontrado"
      );
      expect(mockDocumentTypeService.delete).toHaveBeenCalledWith(id);
    });
  });

  describe("restore", () => {
    it("deve restaurar tipo de documento com sucesso", async () => {
      // Arrange
      const id = "test-id";
      const restoredDocumentType = { _id: id, name: "CPF", isActive: true };

      mockDocumentTypeService.restore.mockResolvedValue(restoredDocumentType);

      // Act
      const result = await controller.restore(id);

      // Assert
      expect(mockDocumentTypeService.restore).toHaveBeenCalledWith(id);
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        restoredDocumentType,
        "Tipo de documento reativado com sucesso"
      );
      expect(result).toEqual({
        success: true,
        data: restoredDocumentType,
        message: "Tipo de documento reativado com sucesso",
      });
    });

    it("deve lançar NotFound quando tipo não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockDocumentTypeService.restore.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.restore(id)).rejects.toThrow(NotFound);
      await expect(controller.restore(id)).rejects.toThrow(
        "Tipo de documento não encontrado"
      );
      expect(mockDocumentTypeService.restore).toHaveBeenCalledWith(id);
    });
  });

  describe("getLinkedEmployees", () => {
    it("deve retornar colaboradores vinculados com parâmetros padrão", async () => {
      // Arrange
      const id = "test-id";
      const documentType = { _id: id, name: "CPF" };
      const linkedEmployees = {
        items: [
          { _id: "emp1", name: "João" },
          { _id: "emp2", name: "Maria" },
        ],
        total: 2,
      };

      mockDocumentTypeService.findById.mockResolvedValue(documentType);
      mockDocumentTypeService.getLinkedEmployees.mockResolvedValue(
        linkedEmployees
      );

      // Act
      const result = await controller.getLinkedEmployees(id);

      // Assert
      expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeService.getLinkedEmployees).toHaveBeenCalledWith(
        id,
        {
          page: 1,
          limit: 10,
        }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(1, 2, 10);
      expect(PaginationUtils.createPaginatedResult).toHaveBeenCalledWith(
        linkedEmployees.items,
        1,
        10,
        2
      );
      expect(ResponseHandler.success).toHaveBeenCalledWith(
        expect.any(Object),
        "Colaboradores vinculados ao tipo de documento listados com sucesso"
      );
    });

    it("deve retornar colaboradores vinculados com paginação personalizada", async () => {
      // Arrange
      const id = "test-id";
      const documentType = { _id: id, name: "CPF" };
      const linkedEmployees = {
        items: [{ _id: "emp1", name: "João" }],
        total: 5,
      };

      mockDocumentTypeService.findById.mockResolvedValue(documentType);
      mockDocumentTypeService.getLinkedEmployees.mockResolvedValue(
        linkedEmployees
      );

      // Act
      await controller.getLinkedEmployees(id, 2, 3);

      // Assert
      expect(mockDocumentTypeService.getLinkedEmployees).toHaveBeenCalledWith(
        id,
        {
          page: 2,
          limit: 3,
        }
      );
      expect(PaginationUtils.validatePage).toHaveBeenCalledWith(2, 5, 3);
    });

    it("deve lançar NotFound quando tipo de documento não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockDocumentTypeService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(controller.getLinkedEmployees(id)).rejects.toThrow(NotFound);
      await expect(controller.getLinkedEmployees(id)).rejects.toThrow(
        "Tipo de documento não encontrado"
      );
      expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
      expect(mockDocumentTypeService.getLinkedEmployees).not.toHaveBeenCalled();
    });

    it("deve retornar lista vazia quando não há colaboradores vinculados", async () => {
      // Arrange
      const id = "test-id";
      const documentType = { _id: id, name: "CPF" };
      const emptyResult = { items: [], total: 0 };

      mockDocumentTypeService.findById.mockResolvedValue(documentType);
      mockDocumentTypeService.getLinkedEmployees.mockResolvedValue(emptyResult);

      // Act
      const result = await controller.getLinkedEmployees(id);

      // Assert
      expect(mockDocumentTypeService.getLinkedEmployees).toHaveBeenCalledWith(
        id,
        {
          page: 1,
          limit: 10,
        }
      );
      expect(PaginationUtils.createPaginatedResult).toHaveBeenCalledWith(
        [],
        1,
        10,
        0
      );
    });
  });
});
