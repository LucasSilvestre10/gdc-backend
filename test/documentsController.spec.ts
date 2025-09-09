import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentsController } from "../src/controllers/rest/DocumentsController";
import { DocumentService } from "../src/services/DocumentService";
import { CreateDocumentDto, DocumentStatus } from "../src/dtos/documentDTO";
import { BadRequest, NotFound } from "@tsed/exceptions";

// Mock do DocumentService
const mockDocumentService = {
  createDocument: vi.fn(),
  list: vi.fn(),
  listPending: vi.fn(),
  findById: vi.fn(),
  updateDocument: vi.fn(),
  delete: vi.fn(),
  restore: vi.fn()
};

describe("DocumentsController", () => {
  let controller: DocumentsController;

  beforeEach(() => {
    // Reset todos os mocks antes de cada teste
    vi.clearAllMocks();
    
    // Cria nova instância do controller
    controller = new DocumentsController();
    
    // Injeta mock do service no controller usando defineProperty
    Object.defineProperty(controller, 'documentService', {
      value: mockDocumentService,
      writable: true,
      configurable: true
    });
  });

  describe("create", () => {
    const validCreateDto: CreateDocumentDto = {
      name: "CPF.pdf",
      employeeId: "673123456789012345678901",
      documentTypeId: "673123456789012345678902",
      status: DocumentStatus.SENT
    };

    const mockDocument = {
      _id: "673123456789012345678903",
      name: "CPF",
      employeeId: "673123456789012345678901",
      documentTypeId: "673123456789012345678902",
      status: DocumentStatus.SENT,
      fileName: "CPF.pdf",
      filePath: "/uploads/CPF.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it("deve criar um documento com sucesso", async () => {
      mockDocumentService.createDocument.mockResolvedValue(mockDocument);

      const result = await controller.create(validCreateDto);

      expect(mockDocumentService.createDocument).toHaveBeenCalledWith({
        employeeId: validCreateDto.employeeId,
        documentTypeId: validCreateDto.documentTypeId,
        fileName: validCreateDto.name,
        filePath: `/uploads/${validCreateDto.name}`,
        fileSize: 0,
        mimeType: "application/octet-stream"
      });

      expect(result).toEqual({
        success: true,
        message: "Documento criado com sucesso",
        data: mockDocument
      });
    });

    it("deve propagar erro de validação do service", async () => {
      const validationError = new BadRequest("Invalid employeeId format");
      mockDocumentService.createDocument.mockRejectedValue(validationError);

      await expect(controller.create(validCreateDto)).rejects.toThrow(validationError);
      expect(mockDocumentService.createDocument).toHaveBeenCalledOnce();
    });

    it("deve propagar erro de employee não encontrado", async () => {
      const notFoundError = new NotFound("Employee not found");
      mockDocumentService.createDocument.mockRejectedValue(notFoundError);

      await expect(controller.create(validCreateDto)).rejects.toThrow(notFoundError);
      expect(mockDocumentService.createDocument).toHaveBeenCalledOnce();
    });

    it("deve propagar erro de documentType não encontrado", async () => {
      const notFoundError = new NotFound("DocumentType not found");
      mockDocumentService.createDocument.mockRejectedValue(notFoundError);

      await expect(controller.create(validCreateDto)).rejects.toThrow(notFoundError);
      expect(mockDocumentService.createDocument).toHaveBeenCalledOnce();
    });
  });

  describe("list", () => {
    const mockListResult = {
      items: [
        {
          _id: "673123456789012345678903",
          name: "CPF",
          employeeId: "673123456789012345678901",
          documentTypeId: "673123456789012345678902",
          status: DocumentStatus.SENT,
          isActive: true
        }
      ],
      total: 1
    };

    it("deve listar documentos sem filtros", async () => {
      mockDocumentService.list.mockResolvedValue(mockListResult);

      const result = await controller.list();

      expect(mockDocumentService.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result).toEqual({
        success: true,
        data: mockListResult.items,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });

    it("deve listar documentos com filtro por employeeId", async () => {
      const employeeId = "673123456789012345678901";
      mockDocumentService.list.mockResolvedValue(mockListResult);

      const result = await controller.list(employeeId);

      expect(mockDocumentService.list).toHaveBeenCalledWith(
        { employeeId }, 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockListResult.items);
    });

    it("deve listar documentos com filtro por documentTypeId", async () => {
      const documentTypeId = "673123456789012345678902";
      mockDocumentService.list.mockResolvedValue(mockListResult);

      const result = await controller.list(undefined, documentTypeId);

      expect(mockDocumentService.list).toHaveBeenCalledWith(
        { documentTypeId }, 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
    });

    it("deve listar documentos com ambos os filtros", async () => {
      const employeeId = "673123456789012345678901";
      const documentTypeId = "673123456789012345678902";
      mockDocumentService.list.mockResolvedValue(mockListResult);

      const result = await controller.list(employeeId, documentTypeId);

      expect(mockDocumentService.list).toHaveBeenCalledWith(
        { employeeId, documentTypeId }, 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
    });

    it("deve listar documentos com paginação customizada", async () => {
      mockDocumentService.list.mockResolvedValue({ ...mockListResult, total: 25 });

      const result = await controller.list(undefined, undefined, 2, 5);

      expect(mockDocumentService.list).toHaveBeenCalledWith({}, { page: 2, limit: 5 });
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5
      });
    });

    it("deve propagar erro do service", async () => {
      const serviceError = new Error("Database connection failed");
      mockDocumentService.list.mockRejectedValue(serviceError);

      await expect(controller.list()).rejects.toThrow(serviceError);
    });
  });

  describe("listPending", () => {
    const mockPendingResult = {
      items: [
        {
          _id: "673123456789012345678903",
          name: "RG",
          employeeId: "673123456789012345678901",
          documentTypeId: "673123456789012345678902",
          status: DocumentStatus.PENDING,
          isActive: true
        }
      ],
      total: 1
    };

    it("deve listar documentos pendentes sem filtros", async () => {
      mockDocumentService.listPending.mockResolvedValue(mockPendingResult);

      const result = await controller.listPending();

      expect(mockDocumentService.listPending).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result).toEqual({
        success: true,
        message: "Documentos pendentes listados com sucesso",
        data: mockPendingResult.items,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      });
    });

    it("deve listar documentos pendentes com filtro por employeeId", async () => {
      const employeeId = "673123456789012345678901";
      mockDocumentService.listPending.mockResolvedValue(mockPendingResult);

      const result = await controller.listPending(employeeId);

      expect(mockDocumentService.listPending).toHaveBeenCalledWith(
        { employeeId }, 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe("Documentos pendentes listados com sucesso");
    });

    it("deve listar documentos pendentes com filtro por documentTypeId", async () => {
      const documentTypeId = "673123456789012345678902";
      mockDocumentService.listPending.mockResolvedValue(mockPendingResult);

      const result = await controller.listPending(undefined, documentTypeId);

      expect(mockDocumentService.listPending).toHaveBeenCalledWith(
        { documentTypeId }, 
        { page: 1, limit: 10 }
      );
      expect(result.success).toBe(true);
    });

    it("deve listar documentos pendentes com ambos os filtros e paginação", async () => {
      const employeeId = "673123456789012345678901";
      const documentTypeId = "673123456789012345678902";
      mockDocumentService.listPending.mockResolvedValue({ ...mockPendingResult, total: 15 });

      const result = await controller.listPending(employeeId, documentTypeId, 3, 5);

      expect(mockDocumentService.listPending).toHaveBeenCalledWith(
        { employeeId, documentTypeId }, 
        { page: 3, limit: 5 }
      );
      expect(result.pagination).toEqual({
        page: 3,
        limit: 5,
        total: 15,
        totalPages: 3
      });
    });

    it("deve propagar erro do service ao listar pendentes", async () => {
      const serviceError = new Error("Service unavailable");
      mockDocumentService.listPending.mockRejectedValue(serviceError);

      await expect(controller.listPending()).rejects.toThrow(serviceError);
    });
  });

  describe("findById", () => {
    const mockDocument = {
      _id: "673123456789012345678903",
      name: "CPF",
      employeeId: "673123456789012345678901",
      documentTypeId: "673123456789012345678902",
      status: DocumentStatus.SENT,
      isActive: true
    };

    it("deve encontrar documento por ID", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.findById.mockResolvedValue(mockDocument);

      const result = await controller.findById(documentId);

      expect(mockDocumentService.findById).toHaveBeenCalledWith(documentId);
      expect(result).toEqual({
        success: true,
        data: mockDocument
      });
    });

    it("deve retornar erro quando documento não encontrado", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.findById.mockResolvedValue(null);

      const result = await controller.findById(documentId);

      expect(mockDocumentService.findById).toHaveBeenCalledWith(documentId);
      expect(result).toEqual({
        success: false,
        message: "Documento não encontrado",
        data: null
      });
    });

    it("deve propagar erro de ID inválido", async () => {
      const invalidId = "invalid-id";
      const validationError = new BadRequest("Invalid document ID format");
      mockDocumentService.findById.mockRejectedValue(validationError);

      await expect(controller.findById(invalidId)).rejects.toThrow(validationError);
    });
  });

  describe("update", () => {
    const updateDto: CreateDocumentDto = {
      name: "CPF Atualizado.pdf",
      employeeId: "673123456789012345678901",
      documentTypeId: "673123456789012345678902",
      status: DocumentStatus.SENT
    };

    const mockUpdatedDocument = {
      _id: "673123456789012345678903",
      name: "CPF Atualizado",
      employeeId: "673123456789012345678901",
      documentTypeId: "673123456789012345678902",
      status: DocumentStatus.SENT,
      isActive: true,
      updatedAt: new Date()
    };

    it("deve atualizar documento com sucesso", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.updateDocument.mockResolvedValue(mockUpdatedDocument);

      const result = await controller.update(documentId, updateDto);

      expect(mockDocumentService.updateDocument).toHaveBeenCalledWith(documentId, {
        name: updateDto.name,
        status: updateDto.status
      });
      expect(result).toEqual({
        success: true,
        message: "Documento atualizado com sucesso",
        data: mockUpdatedDocument
      });
    });

    it("deve retornar erro quando documento não encontrado para atualização", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.updateDocument.mockResolvedValue(null);

      const result = await controller.update(documentId, updateDto);

      expect(result).toEqual({
        success: false,
        message: "Documento não encontrado",
        data: null
      });
    });

    it("deve propagar erro de validação na atualização", async () => {
      const documentId = "673123456789012345678903";
      const validationError = new BadRequest("Invalid document ID format");
      mockDocumentService.updateDocument.mockRejectedValue(validationError);

      await expect(controller.update(documentId, updateDto)).rejects.toThrow(validationError);
    });
  });

  describe("delete", () => {
    const mockDeletedDocument = {
      _id: "673123456789012345678903",
      name: "CPF",
      isActive: false,
      deletedAt: new Date()
    };

    it("deve remover documento com sucesso (soft delete)", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.delete.mockResolvedValue(mockDeletedDocument);

      const result = await controller.delete(documentId);

      expect(mockDocumentService.delete).toHaveBeenCalledWith(documentId);
      expect(result).toEqual({
        success: true,
        message: "Documento removido com sucesso",
        data: mockDeletedDocument
      });
    });

    it("deve retornar erro quando documento não encontrado para remoção", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.delete.mockResolvedValue(null);

      const result = await controller.delete(documentId);

      expect(result).toEqual({
        success: false,
        message: "Documento não encontrado ou já removido"
      });
    });

    it("deve propagar erro de ID inválido na remoção", async () => {
      const invalidId = "invalid-id";
      const validationError = new BadRequest("Invalid document ID format");
      mockDocumentService.delete.mockRejectedValue(validationError);

      await expect(controller.delete(invalidId)).rejects.toThrow(validationError);
    });
  });

  describe("restore", () => {
    const mockRestoredDocument = {
      _id: "673123456789012345678903",
      name: "CPF",
      isActive: true,
      deletedAt: null,
      updatedAt: new Date()
    };

    it("deve restaurar documento com sucesso", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.restore.mockResolvedValue(mockRestoredDocument);

      const result = await controller.restore(documentId);

      expect(mockDocumentService.restore).toHaveBeenCalledWith(documentId);
      expect(result).toEqual({
        success: true,
        message: "Documento reativado com sucesso",
        data: mockRestoredDocument
      });
    });

    it("deve retornar erro quando documento não encontrado para restauração", async () => {
      const documentId = "673123456789012345678903";
      mockDocumentService.restore.mockResolvedValue(null);

      const result = await controller.restore(documentId);

      expect(result).toEqual({
        success: false,
        message: "Documento não encontrado para restauração"
      });
    });

    it("deve propagar erro de ID inválido na restauração", async () => {
      const invalidId = "invalid-id";
      const validationError = new BadRequest("Invalid document ID format");
      mockDocumentService.restore.mockRejectedValue(validationError);

      await expect(controller.restore(invalidId)).rejects.toThrow(validationError);
    });
  });

  describe("edge cases", () => {
    it("deve lidar com lista vazia de documentos", async () => {
      const emptyResult = { items: [], total: 0 };
      mockDocumentService.list.mockResolvedValue(emptyResult);

      const result = await controller.list();

      expect(result).toEqual({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it("deve lidar com lista vazia de documentos pendentes", async () => {
      const emptyResult = { items: [], total: 0 };
      mockDocumentService.listPending.mockResolvedValue(emptyResult);

      const result = await controller.listPending();

      expect(result).toEqual({
        success: true,
        message: "Documentos pendentes listados com sucesso",
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0
        }
      });
    });

    it("deve calcular totalPages corretamente para números não divisíveis", async () => {
      const mockResult = { items: [], total: 23 };
      mockDocumentService.list.mockResolvedValue(mockResult);

      const result = await controller.list(undefined, undefined, 1, 10);

      expect(result.pagination.totalPages).toBe(3); // Math.ceil(23/10) = 3
    });

    it("deve calcular totalPages como 0 quando total é 0", async () => {
      const mockResult = { items: [], total: 0 };
      mockDocumentService.listPending.mockResolvedValue(mockResult);

      const result = await controller.listPending(undefined, undefined, 1, 5);

      expect(result.pagination.totalPages).toBe(0); // Math.ceil(0/5) = 0
    });
  });
});
