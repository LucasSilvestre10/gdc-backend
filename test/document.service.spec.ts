import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { DocumentService } from "../src/services/DocumentService";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { DocumentStatus } from "../src/models/Document";

// Testes completos para o serviço de documentos com cobertura 100%
describe("DocumentService", () => {
  let service: DocumentService;
  let mockDocumentRepository: any;
  let mockDocumentTypeRepository: any;
  let mockEmployeeRepository: any;

  beforeEach(() => {
    mockDocumentRepository = {
      create: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      find: vi.fn(),
    };

    mockDocumentTypeRepository = {
      findById: vi.fn(),
    };

    mockEmployeeRepository = {
      findById: vi.fn(),
    };

    // @ts-ignore
    service = new DocumentService(
      mockDocumentRepository,
      mockDocumentTypeRepository,
      mockEmployeeRepository
    );
  });

  describe("createDocument", () => {
    const validDocumentData = {
      employeeId: new Types.ObjectId().toString(),
      documentTypeId: new Types.ObjectId().toString(),
      fileName: "documento-teste.pdf",
      filePath: "/uploads/documento-teste.pdf",
      fileSize: 1024,
      mimeType: "application/pdf"
    };

    it("deve criar documento com sucesso", async () => {
      const mockEmployee = { _id: validDocumentData.employeeId, name: "João" };
      const mockDocumentType = { _id: validDocumentData.documentTypeId, name: "CPF" };
      const mockCreatedDocument = { ...validDocumentData, _id: new Types.ObjectId() };

      mockEmployeeRepository.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepository.findById.mockResolvedValue(mockDocumentType);
      mockDocumentRepository.create.mockResolvedValue(mockCreatedDocument);

      const result = await service.createDocument(validDocumentData);

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith(validDocumentData.employeeId);
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(validDocumentData.documentTypeId);
      expect(result).toEqual(mockCreatedDocument);
    });

    it("deve lançar erro para employeeId inválido", async () => {
      const invalidData = { ...validDocumentData, employeeId: "invalid-id" };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
      expect(mockEmployeeRepository.findById).not.toHaveBeenCalled();
    });

    it("deve lançar erro para documentTypeId inválido", async () => {
      const invalidData = { ...validDocumentData, documentTypeId: "invalid-id" };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
      expect(mockDocumentTypeRepository.findById).not.toHaveBeenCalled();
    });

    it("deve lançar erro para fileName vazio", async () => {
      const invalidData = { ...validDocumentData, fileName: "" };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro para filePath vazio", async () => {
      const invalidData = { ...validDocumentData, filePath: "" };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro para mimeType vazio", async () => {
      const invalidData = { ...validDocumentData, mimeType: "" };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro para fileSize zero", async () => {
      const invalidData = { ...validDocumentData, fileSize: 0 };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro para fileSize negativo", async () => {
      const invalidData = { ...validDocumentData, fileSize: -1 };

      await expect(service.createDocument(invalidData)).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro se employee não existe", async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);
      mockDocumentTypeRepository.findById.mockResolvedValue({ _id: validDocumentData.documentTypeId });

      await expect(service.createDocument(validDocumentData)).rejects.toThrow(NotFound);
      expect(mockDocumentRepository.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se documentType não existe", async () => {
      mockEmployeeRepository.findById.mockResolvedValue({ _id: validDocumentData.employeeId });
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      await expect(service.createDocument(validDocumentData)).rejects.toThrow(NotFound);
      expect(mockDocumentRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("findById", () => {
    it("deve encontrar documento por ID válido", async () => {
      const documentId = new Types.ObjectId().toString();
      const mockDocument = { _id: documentId, fileName: "documento.pdf" };

      mockDocumentRepository.findById.mockResolvedValue(mockDocument);

      const result = await service.findById(documentId);

      expect(mockDocumentRepository.findById).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(mockDocument);
    });

    it("deve lançar erro para ID inválido", async () => {
      const invalidId = "invalid-id";

      await expect(service.findById(invalidId)).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.findById).not.toHaveBeenCalled();
    });

    it("deve retornar null se documento não existe", async () => {
      const documentId = new Types.ObjectId().toString();

      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.findById(documentId);
      expect(result).toBeNull();
    });
  });

  describe("updateDocument", () => {
    it("deve atualizar documento com sucesso", async () => {
      const documentId = new Types.ObjectId().toString();
      const updateData = { name: "Documento Atualizado", status: DocumentStatus.SENT };
      const existingDocument = { _id: documentId, name: "Doc Antigo" };
      const mockUpdatedDocument = { _id: documentId, ...updateData };

      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      mockDocumentRepository.update.mockResolvedValue(mockUpdatedDocument);

      const result = await service.updateDocument(documentId, updateData);

      expect(mockDocumentRepository.findById).toHaveBeenCalledWith(documentId);
      expect(mockDocumentRepository.update).toHaveBeenCalledWith(documentId, updateData);
      expect(result).toEqual(mockUpdatedDocument);
    });

    it("deve lançar erro para ID inválido", async () => {
      const invalidId = "invalid-id";
      const updateData = { name: "Documento Atualizado" };

      await expect(service.updateDocument(invalidId, updateData)).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.update).not.toHaveBeenCalled();
    });

    it("deve retornar null se documento não existe", async () => {
      const documentId = new Types.ObjectId().toString();
      const updateData = { status: DocumentStatus.SENT };

      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.updateDocument(documentId, updateData);
      expect(result).toBeNull();
    });

    it("deve retornar documento existente se não há dados para atualizar", async () => {
      const documentId = new Types.ObjectId().toString();
      const existingDocument = { _id: documentId, name: "Doc Existente" };
      
      mockDocumentRepository.findById.mockResolvedValue(existingDocument);
      
      const result = await service.updateDocument(documentId, {});
      
      expect(mockDocumentRepository.findById).toHaveBeenCalledWith(documentId);
      expect(mockDocumentRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(existingDocument);
    });
  });

  describe("list", () => {
    it("deve listar documentos com paginação padrão", async () => {
      const mockResponse = {
        items: [
          { _id: "1", fileName: "doc1.pdf" },
          { _id: "2", fileName: "doc2.pdf" }
        ],
        total: 2
      };

      mockDocumentRepository.list.mockResolvedValue(mockResponse);

      const result = await service.list();

      expect(mockDocumentRepository.list).toHaveBeenCalledWith({}, {});
      expect(result).toEqual(mockResponse);
    });

    it("deve listar com filtros customizados", async () => {
      const employeeId = new Types.ObjectId().toString();
      const documentTypeId = new Types.ObjectId().toString();
      const filters = { 
        employeeId, 
        documentTypeId
      };
      const opts = { page: 2, limit: 5 };
      
      const mockResponse = {
        items: [{ _id: "1", fileName: "doc-filtrado.pdf" }],
        total: 1
      };

      mockDocumentRepository.list.mockResolvedValue(mockResponse);

      const result = await service.list(filters, opts);

      expect(mockDocumentRepository.list).toHaveBeenCalledWith(filters, opts);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("delete", () => {
    it("deve fazer soft delete com sucesso", async () => {
      const documentId = new Types.ObjectId().toString();
      const mockDocument = { _id: documentId, isActive: true };
      const mockDeletedDocument = { _id: documentId, isActive: false };

      mockDocumentRepository.findById.mockResolvedValue(mockDocument);
      mockDocumentRepository.softDelete.mockResolvedValue(mockDeletedDocument);

      const result = await service.delete(documentId);

      expect(mockDocumentRepository.findById).toHaveBeenCalledWith(documentId);
      expect(mockDocumentRepository.softDelete).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(mockDeletedDocument);
    });

    it("deve lançar erro para ID inválido", async () => {
      const invalidId = "invalid-id";

      await expect(service.delete(invalidId)).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.softDelete).not.toHaveBeenCalled();
    });

    it("deve lançar erro para ID vazio", async () => {
      await expect(service.delete("")).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.softDelete).not.toHaveBeenCalled();
    });

    it("deve retornar null se documento não existe", async () => {
      const documentId = new Types.ObjectId().toString();

      mockDocumentRepository.findById.mockResolvedValue(null);

      const result = await service.delete(documentId);
      expect(result).toBeNull();
    });
  });

  describe("restore", () => {
    it("deve restaurar documento com sucesso", async () => {
      const documentId = new Types.ObjectId().toString();
      const mockRestoredDocument = { _id: documentId, isActive: true };

      mockDocumentRepository.restore.mockResolvedValue(mockRestoredDocument);

      const result = await service.restore(documentId);

      expect(mockDocumentRepository.restore).toHaveBeenCalledWith(documentId);
      expect(result).toEqual(mockRestoredDocument);
    });

    it("deve lançar erro para ID inválido", async () => {
      const invalidId = "invalid-id";

      await expect(service.restore(invalidId)).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.restore).not.toHaveBeenCalled();
    });

    it("deve lançar erro para ID vazio", async () => {
      await expect(service.restore("")).rejects.toThrow(BadRequest);
      expect(mockDocumentRepository.restore).not.toHaveBeenCalled();
    });

    it("deve retornar null se documento não pode ser restaurado", async () => {
      const documentId = new Types.ObjectId().toString();

      mockDocumentRepository.restore.mockResolvedValue(null);

      const result = await service.restore(documentId);
      expect(result).toBeNull();
    });
  });

  describe("listPending", () => {
    it("deve listar documentos pendentes", async () => {
      const mockResponse = {
        items: [
          { _id: "1", fileName: "doc1.pdf", status: DocumentStatus.PENDING },
          { _id: "2", fileName: "doc2.pdf", status: DocumentStatus.PENDING }
        ],
        total: 2
      };

      mockDocumentRepository.list.mockResolvedValue(mockResponse);

      const result = await service.listPending();

      expect(mockDocumentRepository.list).toHaveBeenCalledWith({
        status: "pending"
      }, {});
      expect(result).toEqual(mockResponse);
    });

    it("deve filtrar documentos pendentes por employeeId", async () => {
      const employeeId = new Types.ObjectId().toString();
      const mockResponse = {
        items: [
          { _id: "1", fileName: "doc.pdf", employeeId, status: DocumentStatus.PENDING }
        ],
        total: 1
      };

      mockDocumentRepository.list.mockResolvedValue(mockResponse);

      const result = await service.listPending({ employeeId });

      expect(mockDocumentRepository.list).toHaveBeenCalledWith({
        status: "pending",
        employeeId: new Types.ObjectId(employeeId)
      }, {});
      expect(result).toEqual(mockResponse);
    });

    it("deve filtrar documentos pendentes por documentTypeId", async () => {
      const documentTypeId = new Types.ObjectId().toString();
      const mockResponse = {
        items: [
          { _id: "1", fileName: "doc.pdf", documentTypeId, status: DocumentStatus.PENDING }
        ],
        total: 1
      };

      mockDocumentRepository.list.mockResolvedValue(mockResponse);

      const result = await service.listPending({ documentTypeId });

      expect(mockDocumentRepository.list).toHaveBeenCalledWith({
        status: "pending",
        documentTypeId: new Types.ObjectId(documentTypeId)
      }, {});
      expect(result).toEqual(mockResponse);
    });

    it("deve lançar erro para employeeId inválido no filtro", async () => {
      await expect(service.listPending({ employeeId: "invalid-id" })).rejects.toThrow(BadRequest);
    });

    it("deve lançar erro para documentTypeId inválido no filtro", async () => {
      await expect(service.listPending({ documentTypeId: "invalid-id" })).rejects.toThrow(BadRequest);
    });
  });
});