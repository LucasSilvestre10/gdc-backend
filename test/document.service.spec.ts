import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { DocumentService } from "../src/services/DocumentService";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { BadRequest, NotFound } from "@tsed/exceptions";

// Testes para o serviço de documentos
describe("DocumentService", () => {
  let service: DocumentService;
  let mockDocumentRepository: any;
  let mockDocumentTypeRepository: any;
  let mockEmployeeRepository: any;

  // Antes de cada teste, cria mocks dos repositórios e instancia o serviço
  beforeEach(() => {
    mockDocumentRepository = {
      create: vi.fn(),
      list: vi.fn(),
    };

    mockDocumentTypeRepository = {
      findById: vi.fn(),
    };

    mockEmployeeRepository = {
      findById: vi.fn(),
    };

    service = new DocumentService(
      mockDocumentRepository,
      mockDocumentTypeRepository,
      mockEmployeeRepository
    );
  });

  // Testa o método createDocument
  describe("createDocument", () => {
    const validDto = {
      employeeId: "507f1f77bcf86cd799439011",
      documentTypeId: "507f1f77bcf86cd799439012",
      fileName: "documento.pdf",
      filePath: "/uploads/documento.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    };

    it("deve criar um documento com dados válidos", async () => {
      // Arrange: mock dos repositórios retornando dados válidos
      const employee = { _id: validDto.employeeId, name: "João" };
      const documentType = { _id: validDto.documentTypeId, name: "RG" };
      const createdDocument = { _id: "newDocId", ...validDto, status: "pending" };

      mockEmployeeRepository.findById.mockResolvedValue(employee);
      mockDocumentTypeRepository.findById.mockResolvedValue(documentType);
      mockDocumentRepository.create.mockResolvedValue(createdDocument);

      // Act: chama o método do serviço
      const result = await service.createDocument(validDto);

      // Assert: verifica se os repositórios foram chamados corretamente e o documento foi criado
      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith(validDto.employeeId);
      expect(mockDocumentTypeRepository.findById).toHaveBeenCalledWith(validDto.documentTypeId);
      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: expect.any(Types.ObjectId),
          documentTypeId: expect.any(Types.ObjectId),
          fileName: validDto.fileName,
          filePath: validDto.filePath,
          fileSize: validDto.fileSize,
          mimeType: validDto.mimeType,
          status: "pending",
          uploadDate: expect.any(Date),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );
      expect(result).toEqual(createdDocument);
    });

    it("deve lançar BadRequest para employeeId inválido", async () => {
      // Arrange: DTO com employeeId inválido
      const invalidDto = { ...validDto, employeeId: "invalid-id" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Invalid employeeId format");
    });

    it("deve lançar BadRequest para documentTypeId inválido", async () => {
      // Arrange: DTO com documentTypeId inválido
      const invalidDto = { ...validDto, documentTypeId: "invalid-id" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Invalid documentTypeId format");
    });

    it("deve lançar BadRequest para fileName vazio", async () => {
      // Arrange: DTO com fileName vazio
      const invalidDto = { ...validDto, fileName: "" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Missing required fields");
    });

    it("deve lançar BadRequest para filePath vazio", async () => {
      // Arrange: DTO com filePath vazio
      const invalidDto = { ...validDto, filePath: "   " };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Missing required fields");
    });

    it("deve lançar BadRequest para fileSize zero ou negativo", async () => {
      // Arrange: DTO com fileSize -1 (que passa no !dto.fileSize mas falha no <= 0)
      const invalidDto = { 
        ...validDto, 
        fileSize: -1
      };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("File size must be greater than 0");
    });

    it("deve lançar BadRequest para fileSize negativo", async () => {
      // Arrange: DTO com fileSize negativo
      const invalidDto = { 
        ...validDto, 
        fileSize: -100
      };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("File size must be greater than 0");
    });

    it("deve lançar BadRequest para fileSize ausente", async () => {
      // Arrange: DTO sem fileSize (undefined)
      const invalidDto = { 
        ...validDto
      };
      delete (invalidDto as any).fileSize;

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto as any)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto as any)).rejects.toThrow("Missing required field: fileSize");
    });

    it("deve lançar BadRequest para fileSize zero", async () => {
      // Arrange: DTO com fileSize 0 (que é falsy)
      const invalidDto = { 
        ...validDto, 
        fileSize: 0
      };

      // Act & Assert: espera que lance BadRequest para campo ausente (0 é falsy)
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Missing required field: fileSize");
    });

    it("deve lançar BadRequest para mimeType vazio", async () => {
      // Arrange: DTO com mimeType vazio
      const invalidDto = { ...validDto, mimeType: "" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.createDocument(invalidDto)).rejects.toThrow(BadRequest);
      await expect(service.createDocument(invalidDto)).rejects.toThrow("Missing required fields");
    });

    it("deve lançar NotFound quando funcionário não existir", async () => {
      // Arrange: mock do repositório retornando null para funcionário
      mockEmployeeRepository.findById.mockResolvedValue(null);

      // Act & Assert: espera que lance NotFound
      await expect(service.createDocument(validDto)).rejects.toThrow(NotFound);
      await expect(service.createDocument(validDto)).rejects.toThrow("Employee not found");
    });

    it("deve lançar NotFound quando tipo de documento não existir", async () => {
      // Arrange: mock dos repositórios - funcionário existe, tipo não
      const employee = { _id: validDto.employeeId, name: "João" };
      mockEmployeeRepository.findById.mockResolvedValue(employee);
      mockDocumentTypeRepository.findById.mockResolvedValue(null);

      // Act & Assert: espera que lance NotFound
      await expect(service.createDocument(validDto)).rejects.toThrow(NotFound);
      await expect(service.createDocument(validDto)).rejects.toThrow("Document type not found");
    });

    it("deve fazer trim nos campos de texto", async () => {
      // Arrange: DTO com espaços em branco nos campos
      const dtoWithSpaces = {
        ...validDto,
        fileName: "  documento.pdf  ",
        filePath: "  /uploads/documento.pdf  ",
        mimeType: "  application/pdf  ",
      };
      const employee = { _id: validDto.employeeId, name: "João" };
      const documentType = { _id: validDto.documentTypeId, name: "RG" };

      mockEmployeeRepository.findById.mockResolvedValue(employee);
      mockDocumentTypeRepository.findById.mockResolvedValue(documentType);
      mockDocumentRepository.create.mockResolvedValue({});

      // Act: chama o método do serviço
      await service.createDocument(dtoWithSpaces);

      // Assert: verifica se o trim foi aplicado
      expect(mockDocumentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "documento.pdf",
          filePath: "/uploads/documento.pdf",
          mimeType: "application/pdf",
        })
      );
    });
  });

  // Testa o método listPending
  describe("listPending", () => {
    it("deve listar documentos pendentes sem filtros", async () => {
      // Arrange: mock do repositório retornando documentos pendentes
      const pendingDocs = [
        { _id: "1", status: "pending", fileName: "doc1.pdf" },
        { _id: "2", status: "pending", fileName: "doc2.pdf" },
      ];
      const mockResult = { items: pendingDocs, total: 2 };
      
      mockDocumentRepository.list.mockResolvedValue(mockResult);

      // Act: chama o método do serviço
      const result = await service.listPending();

      // Assert: verifica se o repositório foi chamado com filtro correto
      expect(mockDocumentRepository.list).toHaveBeenCalledWith(
        { status: "pending" },
        {}
      );
      expect(result).toEqual(mockResult);
    });

    it("deve listar documentos pendentes com filtros e paginação", async () => {
      // Arrange: filtros e opções de paginação
      const filter = {
        employeeId: "507f1f77bcf86cd799439011",
        documentTypeId: "507f1f77bcf86cd799439012",
      };
      const opts = { page: 2, limit: 5 };
      const mockResult = { items: [], total: 0 };

      mockDocumentRepository.list.mockResolvedValue(mockResult);

      // Act: chama o método do serviço
      const result = await service.listPending(filter, opts);

      // Assert: verifica se o repositório foi chamado com filtros corretos convertidos para ObjectId
      expect(mockDocumentRepository.list).toHaveBeenCalledWith(
        {
          status: "pending",
          employeeId: expect.any(Types.ObjectId),
          documentTypeId: expect.any(Types.ObjectId),
        },
        opts
      );
      expect(result).toEqual(mockResult);
    });

    it("deve lançar BadRequest para employeeId inválido no filtro", async () => {
      // Arrange: filtro com employeeId inválido
      const filter = { employeeId: "invalid-id" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.listPending(filter)).rejects.toThrow(BadRequest);
      await expect(service.listPending(filter)).rejects.toThrow("Invalid employeeId format in filter");
    });

    it("deve lançar BadRequest para documentTypeId inválido no filtro", async () => {
      // Arrange: filtro com documentTypeId inválido
      const filter = { documentTypeId: "invalid-id" };

      // Act & Assert: espera que lance BadRequest
      await expect(service.listPending(filter)).rejects.toThrow(BadRequest);
      await expect(service.listPending(filter)).rejects.toThrow("Invalid documentTypeId format in filter");
    });

    it("deve listar documentos pendentes apenas com employeeId no filtro", async () => {
      // Arrange: filtro apenas com employeeId
      const filter = { employeeId: "507f1f77bcf86cd799439011" };
      const mockResult = { items: [], total: 0 };

      mockDocumentRepository.list.mockResolvedValue(mockResult);

      // Act: chama o método do serviço
      const result = await service.listPending(filter);

      // Assert: verifica se o repositório foi chamado com filtro correto
      expect(mockDocumentRepository.list).toHaveBeenCalledWith(
        {
          status: "pending",
          employeeId: expect.any(Types.ObjectId),
        },
        {}
      );
      expect(result).toEqual(mockResult);
    });

    it("deve listar documentos pendentes apenas com documentTypeId no filtro", async () => {
      // Arrange: filtro apenas com documentTypeId
      const filter = { documentTypeId: "507f1f77bcf86cd799439012" };
      const mockResult = { items: [], total: 0 };

      mockDocumentRepository.list.mockResolvedValue(mockResult);

      // Act: chama o método do serviço
      const result = await service.listPending(filter);

      // Assert: verifica se o repositório foi chamado com filtro correto
      expect(mockDocumentRepository.list).toHaveBeenCalledWith(
        {
          status: "pending",
          documentTypeId: expect.any(Types.ObjectId),
        },
        {}
      );
      expect(result).toEqual(mockResult);
    });
  });
});