import { describe, it, beforeEach, expect, vi } from "vitest";
import { DocumentsController } from "../src/controllers/rest/DocumentsController";
import { DocumentService } from "../src/services/DocumentService";

/**
 * Testes unitários para DocumentsController
 *
 * Testa os dois endpoints principais:
 * - GET /documents/pending - Lista documentos pendentes globalmente
 * - GET /documents/sent - Lista documentos enviados globalmente
 *
 * Foca na lógica da controller: validação de parâmetros, chamadas ao service
 * e formatação das respostas, sem testar a lógica de negócio (que fica no service).
 */
describe("Controller de Documentos - Testes Unitários", () => {
  let controller: DocumentsController;
  let mockDocumentService: any;

  beforeEach(() => {
    // Mock completo do DocumentService
    mockDocumentService = {
      getPendingDocuments: vi.fn(),
      getSentDocuments: vi.fn(),
    };

    // Criação da controller com service mockado
    controller = new DocumentsController();

    // Substitui a propriedade documentService injetada pelo mock
    Object.defineProperty(controller, "documentService", {
      value: mockDocumentService,
      writable: true,
      configurable: true,
    });
  });

  describe("Verificação da instância e injeção", () => {
    it("deve ser criado corretamente", () => {
      expect(controller).toBeInstanceOf(DocumentsController);
    });

    it("deve ter o DocumentService injetado", () => {
      expect((controller as any).documentService).toBeDefined();
      expect((controller as any).documentService).toBe(mockDocumentService);
    });
  });

  describe("Constantes da classe", () => {
    it("deve ter constantes definidas corretamente", () => {
      expect((DocumentsController as any).DEFAULT_PAGE).toBe(1);
      expect((DocumentsController as any).DEFAULT_LIMIT).toBe(10);
      expect((DocumentsController as any).DEFAULT_STATUS).toBe("active");
    });
  });

  describe("getPendingDocuments - Documentos Pendentes", () => {
    const mockPendingResponse = {
      data: [
        {
          employee: { id: "123", name: "João Silva" },
          documentType: { id: "456", name: "CPF" },
          status: "PENDING",
          active: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it("deve retornar documentos pendentes com parâmetros padrão", async () => {
      // Arrange
      mockDocumentService.getPendingDocuments.mockResolvedValue(
        mockPendingResponse
      );

      // Act
      const result = await controller.getPendingDocuments();

      // Assert
      expect(mockDocumentService.getPendingDocuments).toHaveBeenCalledWith({
        status: "active",
        page: 1,
        limit: 10,
        documentTypeId: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: mockPendingResponse.data,
        pagination: mockPendingResponse.pagination,
      });
    });

    it("deve retornar documentos pendentes com parâmetros customizados", async () => {
      // Arrange
      mockDocumentService.getPendingDocuments.mockResolvedValue(
        mockPendingResponse
      );

      // Act
      const result = await controller.getPendingDocuments(
        "inactive",
        2,
        5,
        "doc123"
      );

      // Assert
      expect(mockDocumentService.getPendingDocuments).toHaveBeenCalledWith({
        status: "inactive",
        page: 2,
        limit: 5,
        documentTypeId: "doc123",
      });
      expect(result).toEqual({
        success: true,
        data: mockPendingResponse.data,
        pagination: mockPendingResponse.pagination,
      });
    });

    it("deve retornar lista vazia quando não há documentos pendentes", async () => {
      // Arrange
      const emptyResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockDocumentService.getPendingDocuments.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getPendingDocuments();

      // Assert
      expect(result).toEqual({
        success: true,
        data: [],
        pagination: emptyResponse.pagination,
      });
    });

    it("deve propagar erro quando o service falha", async () => {
      // Arrange
      const serviceError = new Error("Erro do serviço");
      mockDocumentService.getPendingDocuments.mockRejectedValue(serviceError);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act & Assert
      await expect(controller.getPendingDocuments()).rejects.toThrow(
        "Erro do serviço"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao listar documentos pendentes:",
        serviceError
      );

      consoleSpy.mockRestore();
    });

    it("deve lidar com todos os parâmetros opcionais", async () => {
      // Arrange
      mockDocumentService.getPendingDocuments.mockResolvedValue(
        mockPendingResponse
      );

      // Act
      const result = await controller.getPendingDocuments(
        "all",
        3,
        20,
        "type456"
      );

      // Assert
      expect(mockDocumentService.getPendingDocuments).toHaveBeenCalledWith({
        status: "all",
        page: 3,
        limit: 20,
        documentTypeId: "type456",
      });
      expect(result.success).toBe(true);
    });

    it("deve usar valores padrão quando parâmetros são undefined", async () => {
      // Arrange
      mockDocumentService.getPendingDocuments.mockResolvedValue(
        mockPendingResponse
      );

      // Act
      const result = await controller.getPendingDocuments(
        undefined,
        undefined,
        undefined,
        undefined
      );

      // Assert
      expect(mockDocumentService.getPendingDocuments).toHaveBeenCalledWith({
        status: "active",
        page: 1,
        limit: 10,
        documentTypeId: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("getSentDocuments - Documentos Enviados", () => {
    const mockSentResponse = {
      data: [
        {
          employee: { id: "789", name: "Maria Santos" },
          documentType: { id: "101", name: "RG" },
          status: "SENT",
          value: "12.345.678-9",
          active: true,
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };

    it("deve retornar documentos enviados com parâmetros padrão", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments();

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "active",
        page: 1,
        limit: 10,
        employeeId: undefined,
        documentTypeId: undefined,
      });
      expect(result).toEqual({
        success: true,
        data: mockSentResponse.data,
        pagination: mockSentResponse.pagination,
      });
    });

    it("deve retornar documentos enviados com todos os parâmetros customizados", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments(
        "all",
        3,
        15,
        "emp456",
        "doc789"
      );

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "all",
        page: 3,
        limit: 15,
        employeeId: "emp456",
        documentTypeId: "doc789",
      });
      expect(result).toEqual({
        success: true,
        data: mockSentResponse.data,
        pagination: mockSentResponse.pagination,
      });
    });

    it("deve retornar lista vazia quando não há documentos enviados", async () => {
      // Arrange
      const emptyResponse = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
      mockDocumentService.getSentDocuments.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.getSentDocuments();

      // Assert
      expect(result).toEqual({
        success: true,
        data: [],
        pagination: emptyResponse.pagination,
      });
    });

    it("deve propagar erro quando o service falha", async () => {
      // Arrange
      const serviceError = new Error("Falha na busca de documentos enviados");
      mockDocumentService.getSentDocuments.mockRejectedValue(serviceError);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act & Assert
      await expect(controller.getSentDocuments()).rejects.toThrow(
        "Falha na busca de documentos enviados"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao listar documentos enviados:",
        serviceError
      );

      consoleSpy.mockRestore();
    });

    it("deve filtrar apenas por employeeId", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments(
        "active",
        1,
        10,
        "emp123"
      );

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "active",
        page: 1,
        limit: 10,
        employeeId: "emp123",
        documentTypeId: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("deve filtrar apenas por documentTypeId", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments(
        "inactive",
        2,
        20,
        undefined,
        "type789"
      );

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "inactive",
        page: 2,
        limit: 20,
        employeeId: undefined,
        documentTypeId: "type789",
      });
      expect(result.success).toBe(true);
    });

    it("deve usar valores padrão quando parâmetros são undefined", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined
      );

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "active",
        page: 1,
        limit: 10,
        employeeId: undefined,
        documentTypeId: undefined,
      });
      expect(result.success).toBe(true);
    });

    it("deve combinar filtros de employeeId e documentTypeId", async () => {
      // Arrange
      mockDocumentService.getSentDocuments.mockResolvedValue(mockSentResponse);

      // Act
      const result = await controller.getSentDocuments(
        "all",
        1,
        5,
        "emp999",
        "doc888"
      );

      // Assert
      expect(mockDocumentService.getSentDocuments).toHaveBeenCalledWith({
        status: "all",
        page: 1,
        limit: 5,
        employeeId: "emp999",
        documentTypeId: "doc888",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Cenários de erro e edge cases", () => {
    it("deve manter estrutura de resposta mesmo com dados nulos do service", async () => {
      // Arrange
      const nullResponse = { data: null, pagination: null };
      mockDocumentService.getPendingDocuments.mockResolvedValue(nullResponse);

      // Act
      const result = await controller.getPendingDocuments();

      // Assert
      expect(result).toEqual({
        success: true,
        data: null,
        pagination: null,
      });
    });

    it("deve propagar erros específicos do service sem modificação", async () => {
      // Arrange
      class CustomError extends Error {
        constructor(
          message: string,
          public statusCode: number
        ) {
          super(message);
        }
      }
      const customError = new CustomError("Erro customizado", 422);
      mockDocumentService.getSentDocuments.mockRejectedValue(customError);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act & Assert
      await expect(controller.getSentDocuments()).rejects.toThrow(customError);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao listar documentos enviados:",
        customError
      );

      consoleSpy.mockRestore();
    });

    it("deve logar erro antes de propagar", async () => {
      // Arrange
      const error = new Error("Erro de teste");
      mockDocumentService.getPendingDocuments.mockRejectedValue(error);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      try {
        await controller.getPendingDocuments();
      } catch (e) {
        // Expected
      }

      // Assert
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao listar documentos pendentes:",
        error
      );

      consoleSpy.mockRestore();
    });
  });
});
