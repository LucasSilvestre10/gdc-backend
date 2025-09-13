import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeLinkService } from "../src/services/employee/EmployeeLinkService";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { EmployeeDocumentTypeLinkRepository } from "../src/repositories/EmployeeDocumentTypeLinkRepository";
import { DocumentStatus } from "../src/models/Document";
import {
  EmployeeNotFoundError,
  DocumentTypeNotFoundError,
  ValidationError,
} from "../src/exceptions";

describe("EmployeeLinkService", () => {
  let employeeLinkService: EmployeeLinkService;
  let mockEmployeeRepo: any;
  let mockDocumentTypeRepo: any;
  let mockDocumentRepo: any;
  let mockLinkRepo: any;

  const mockEmployee = {
    _id: "507f1f77bcf86cd799439011",
    name: "João Silva",
    document: "123.456.789-01",
    hiredAt: new Date("2024-01-15"),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocumentTypeCpf = {
    _id: "507f1f77bcf86cd799439022",
    name: "CPF",
    description: "Cadastro de Pessoa Física",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDocumentTypeRg = {
    _id: "507f1f77bcf86cd799439033",
    name: "RG",
    description: "Registro Geral",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLink = {
    _id: "507f1f77bcf86cd799439044",
    employeeId: "507f1f77bcf86cd799439011",
    documentTypeId: {
      _id: "507f1f77bcf86cd799439022",
      name: "CPF",
      description: "Cadastro de Pessoa Física",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Mock dos repositórios
    mockEmployeeRepo = {
      findById: vi.fn(),
      addRequiredTypes: vi.fn(),
      removeRequiredTypes: vi.fn(),
    };

    mockDocumentTypeRepo = {
      findByIds: vi.fn(),
      findById: vi.fn(),
    };

    mockDocumentRepo = {
      create: vi.fn(),
      softDeleteByEmployeeAndType: vi.fn(),
    };

    mockLinkRepo = {
      findByEmployee: vi.fn(),
      create: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      findLink: vi.fn(),
      removeDuplicates: vi.fn(),
    };

    // Criar instância com mocks injetados
    employeeLinkService = new EmployeeLinkService(
      mockEmployeeRepo,
      mockDocumentTypeRepo,
      mockDocumentRepo,
      mockLinkRepo
    );

    // Injetar mocks via Object.defineProperty
    Object.defineProperty(employeeLinkService, "employeeRepo", {
      value: mockEmployeeRepo,
      writable: true,
    });
    Object.defineProperty(employeeLinkService, "documentTypeRepo", {
      value: mockDocumentTypeRepo,
      writable: true,
    });
    Object.defineProperty(employeeLinkService, "documentRepo", {
      value: mockDocumentRepo,
      writable: true,
    });
    Object.defineProperty(employeeLinkService, "linkRepo", {
      value: mockLinkRepo,
      writable: true,
    });
  });

  describe("linkDocumentTypes - Vinculação de Tipos de Documentos", () => {
    it("deve vincular tipos de documentos com sucesso", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439033"];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([
        mockDocumentTypeCpf,
        mockDocumentTypeRg,
      ]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]); // Nenhum link existente
      mockLinkRepo.create.mockResolvedValue({});
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeLinkService.linkDocumentTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "active"
      );
      expect(mockLinkRepo.create).toHaveBeenCalledTimes(2);
      expect(mockEmployeeRepo.addRequiredTypes).toHaveBeenCalledWith(
        employeeId,
        typeIds
      );
    });

    it("deve retornar sem fazer nada se typeIds estiver vazio", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds: string[] = [];

      // Act
      await employeeLinkService.linkDocumentTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439099"; // ID válido mas não existe
      const typeIds = ["507f1f77bcf86cd799439022"];

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
    });

    it("deve lançar erro se nem todos os tipos de documento existirem", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439099"]; // 2º ID válido mas não existe

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]); // Só encontra 1 de 2

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(DocumentTypeNotFoundError);

      expect(mockDocumentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro de validação para ObjectId inválido do colaborador", async () => {
      // Arrange
      const employeeId = "invalid-object-id";
      const typeIds = ["507f1f77bcf86cd799439022"];

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);

      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
    });

    it("deve lançar erro de validação para ObjectId inválido do tipo de documento", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["invalid-object-id"];

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);

      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
    });

    it("deve criar documento CPF automaticamente para tipo CPF", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // Só CPF

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]);
      mockLinkRepo.create.mockResolvedValue({});
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeLinkService.linkDocumentTypes(employeeId, typeIds);

      // Assert
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "123.456.789-01", // CPF do employee
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439022",
      });
    });

    it("deve propagar erro do linkRepo.create", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]);
      mockLinkRepo.create.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow("Database error");
    });
  });

  describe("unlinkDocumentTypes - Desvinculação de Tipos de Documentos", () => {
    it("deve desvincular tipos de documentos com sucesso", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]); // Link ativo existente
      mockLinkRepo.softDelete.mockResolvedValue({});
      mockDocumentRepo.softDeleteByEmployeeAndType.mockResolvedValue({});
      mockEmployeeRepo.removeRequiredTypes.mockResolvedValue({});

      // Act
      await employeeLinkService.unlinkDocumentTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "active"
      );
      expect(mockLinkRepo.softDelete).toHaveBeenCalledWith(
        employeeId,
        "507f1f77bcf86cd799439022"
      );
      expect(mockEmployeeRepo.removeRequiredTypes).toHaveBeenCalledWith(
        employeeId,
        typeIds
      );
    });

    it("deve retornar sem fazer nada se typeIds estiver vazio", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds: string[] = [];

      // Act
      await employeeLinkService.unlinkDocumentTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled();
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439099"; // ID válido mas não existe
      const typeIds = ["507f1f77bcf86cd799439022"];

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
    });

    it("deve lançar erro se nem todos os tipos de documento existirem", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022", "507f1f77bcf86cd799439099"]; // 2º ID válido mas não existe

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]); // Só encontra 1 de 2

      // Act & Assert
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(DocumentTypeNotFoundError);

      expect(mockDocumentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe("getRequiredDocumentsAsDto - Listagem de Vínculos como DTO", () => {
    it("deve listar vínculos ativos como DTO", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const status = "active";

      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]);

      // Act
      const result = await employeeLinkService.getRequiredDocumentsAsDto(
        employeeId,
        status
      );

      // Assert
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "active"
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("documentType");
      expect(result[0].documentType).toHaveProperty("id");
      expect(result[0].documentType).toHaveProperty("name");
      expect(result[0]).toHaveProperty("active");
    });

    it('deve usar status padrão "all" quando não especificado', async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockLinkRepo.findByEmployee.mockResolvedValue([]);

      // Act
      await employeeLinkService.getRequiredDocumentsAsDto(employeeId);

      // Assert
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "all"
      );
    });

    it("deve usar nome padrão quando documentType não tiver name na conversão para DTO", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const linkNoName = {
        ...mockLink,
        documentTypeId: { _id: "507f1f77bcf86cd799439099" },
      };

      mockLinkRepo.findByEmployee.mockResolvedValue([linkNoName]);

      // Act
      const result = await employeeLinkService.getRequiredDocumentsAsDto(
        employeeId,
        "active"
      );

      // Assert
      expect(result[0].documentType.name).toBe("Nome não encontrado");
      expect(result[0].documentType.id).toBe("507f1f77bcf86cd799439099");
    });
  });

  describe("Cenários de edge cases e validações", () => {
    it("deve lidar com array vazio de typeIds na vinculação", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds: string[] = [];

      // Act
      await employeeLinkService.linkDocumentTypes(employeeId, typeIds);

      // Assert - Não deve chamar nenhum repositório
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve lidar com array vazio de typeIds na desvinculação", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds: string[] = [];

      // Act
      await employeeLinkService.unlinkDocumentTypes(employeeId, typeIds);

      // Assert - Não deve chamar nenhum repositório
      expect(mockEmployeeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled();
    });

    it("deve propagar erro do documentRepo na criação de documento CPF", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // CPF

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]);
      mockLinkRepo.create.mockResolvedValue({});
      mockDocumentRepo.create.mockRejectedValue(
        new Error("Document creation error")
      );

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow("Document creation error");
    });

    it("deve propagar erro do employeeRepo.addRequiredTypes", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439033"]; // RG (não-CPF)

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeRg]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]);
      mockLinkRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockRejectedValue(
        new Error("Add required types error")
      );

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow("Add required types error");
    });

    it("deve lançar erro se tipos já estão vinculados", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // CPF já vinculado

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]); // Link já existe
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(
        "Os seguintes tipos de documento já estão vinculados a este colaborador: CPF"
      );

      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro com id quando tipo vinculado mas não encontrado pelo repo", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // CPF já vinculado

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]); // Link já existe
      // Simula situação em que o findById não encontra o tipo (retorna null)
      mockDocumentTypeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeLinkService.linkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(
        "Os seguintes tipos de documento já estão vinculados a este colaborador: 507f1f77bcf86cd799439022"
      );

      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se tipos já estão desvinculados na desvinculação", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // CPF não ativo

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]); // Nenhum link ativo
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);

      // Act & Assert
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(
        "Os seguintes tipos de documento já estão desvinculados deste colaborador: CPF"
      );

      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled();
    });

    it("deve lançar erro com id quando tipo desvinculado mas não encontrado pelo repo", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const typeIds = ["507f1f77bcf86cd799439022"]; // CPF não ativo

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockLinkRepo.findByEmployee.mockResolvedValue([]); // Nenhum link ativo
      // Simula situação em que o findById não encontra o tipo (retorna null)
      mockDocumentTypeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeLinkService.unlinkDocumentTypes(employeeId, typeIds)
      ).rejects.toThrow(
        "Os seguintes tipos de documento já estão desvinculados deste colaborador: 507f1f77bcf86cd799439022"
      );

      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe("getRequiredDocuments - Listagem de Vínculos Básica", () => {
    it("deve listar vínculos de um colaborador", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const status = "active";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]);

      // Act
      const result = await employeeLinkService.getRequiredDocuments(
        employeeId,
        status
      );

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "active"
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("documentType");
      expect(result[0].documentType).toHaveProperty("id");
      expect(result[0].documentType).toHaveProperty("name");
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439099";
      const status = "active";

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.getRequiredDocuments(employeeId, status)
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockLinkRepo.findByEmployee).not.toHaveBeenCalled();
    });

    it('deve usar status padrão "all" quando não especificado', async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([]);

      // Act
      await employeeLinkService.getRequiredDocuments(employeeId);

      // Assert
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "all"
      );
    });

    it("deve usar valores padrão quando documentType não estiver populado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const linkNoFields = {
        ...mockLink,
        documentTypeId: { _id: "507f1f77bcf86cd799439088" },
      };

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([linkNoFields]);

      // Act
      const result = await employeeLinkService.getRequiredDocuments(
        employeeId,
        "active"
      );

      // Assert
      expect(result[0].documentType.name).toBe("Tipo não encontrado");
      expect(result[0].documentType.description).toBeNull();
      expect(result[0].documentType.id).toBe("507f1f77bcf86cd799439088");
    });
  });

  describe("restoreDocumentTypeLink - Restauração de Vínculos", () => {
    it("deve restaurar vínculo existente", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const documentTypeId = "507f1f77bcf86cd799439022";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockLinkRepo.findLink.mockResolvedValue(mockLink); // Link existe
      mockLinkRepo.restore.mockResolvedValue({});

      // Act
      await employeeLinkService.restoreDocumentTypeLink(
        employeeId,
        documentTypeId
      );

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findById).toHaveBeenCalledWith(
        documentTypeId
      );
      expect(mockLinkRepo.findLink).toHaveBeenCalledWith(
        employeeId,
        documentTypeId
      );
      expect(mockLinkRepo.restore).toHaveBeenCalledWith(
        employeeId,
        documentTypeId
      );
      expect(mockLinkRepo.create).not.toHaveBeenCalled();
    });

    it("deve criar novo vínculo se não existir", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const documentTypeId = "507f1f77bcf86cd799439022";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockLinkRepo.findLink.mockResolvedValue(null); // Link não existe
      mockLinkRepo.create.mockResolvedValue({});

      // Act
      await employeeLinkService.restoreDocumentTypeLink(
        employeeId,
        documentTypeId
      );

      // Assert
      expect(mockLinkRepo.findLink).toHaveBeenCalledWith(
        employeeId,
        documentTypeId
      );
      expect(mockLinkRepo.create).toHaveBeenCalledWith(
        employeeId,
        documentTypeId
      );
      expect(mockLinkRepo.restore).not.toHaveBeenCalled();
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439099";
      const documentTypeId = "507f1f77bcf86cd799439022";

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.restoreDocumentTypeLink(employeeId, documentTypeId)
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockDocumentTypeRepo.findById).not.toHaveBeenCalled();
    });

    it("deve lançar erro se tipo de documento não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const documentTypeId = "507f1f77bcf86cd799439099";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeLinkService.restoreDocumentTypeLink(employeeId, documentTypeId)
      ).rejects.toThrow(DocumentTypeNotFoundError);

      expect(mockLinkRepo.findLink).not.toHaveBeenCalled();
    });
  });

  describe("removeDuplicateLinks - Remoção de Duplicatas", () => {
    it("deve remover vínculos duplicados mantendo o mais recente", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const linkAntigo = {
        ...mockLink,
        _id: "507f1f77bcf86cd799439055",
        createdAt: new Date("2024-01-01"),
      };
      const linkRecente = {
        ...mockLink,
        _id: "507f1f77bcf86cd799439066",
        createdAt: new Date("2024-02-01"),
      };

      mockLinkRepo.findByEmployee.mockResolvedValue([linkAntigo, linkRecente]); // 2 links duplicados
      mockLinkRepo.softDelete.mockResolvedValue({});

      // Act
      await employeeLinkService.removeDuplicateLinks(employeeId);

      // Assert
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "all"
      );
      expect(mockLinkRepo.softDelete).toHaveBeenCalledWith(
        employeeId,
        "507f1f77bcf86cd799439022"
      );
    });

    it("deve não fazer nada se não houver duplicatas", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockLinkRepo.findByEmployee.mockResolvedValue([mockLink]); // Apenas 1 link
      mockLinkRepo.softDelete.mockResolvedValue({});

      // Act
      await employeeLinkService.removeDuplicateLinks(employeeId);

      // Assert
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "all"
      );
      expect(mockLinkRepo.softDelete).not.toHaveBeenCalled(); // Não deve remover nada
    });
  });
});
