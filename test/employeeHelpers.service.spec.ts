import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeHelpers } from "../src/services/employee/EmployeeHelpersService";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { DocumentStatus } from "../src/models/Document";
import {
  EmployeeNotFoundError,
  DocumentTypeNotFoundError,
  ValidationError,
} from "../src/exceptions";

describe("EmployeeHelpers", () => {
  let employeeHelpers: EmployeeHelpers;
  let mockEmployeeRepo: any;
  let mockDocumentTypeRepo: any;
  let mockDocumentRepo: any;

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

  beforeEach(() => {
    // Mock do EmployeeRepository
    mockEmployeeRepo = {
      findById: vi.fn(),
      addRequiredTypes: vi.fn(),
    };

    // Mock do DocumentTypeRepository
    mockDocumentTypeRepo = {
      findById: vi.fn(),
    };

    // Mock do DocumentRepository
    mockDocumentRepo = {
      create: vi.fn(),
    };

    // Criar instância com mocks injetados
    employeeHelpers = new EmployeeHelpers(
      mockEmployeeRepo,
      mockDocumentTypeRepo,
      mockDocumentRepo
    );

    // Injetar mocks via Object.defineProperty
    Object.defineProperty(employeeHelpers, "employeeRepo", {
      value: mockEmployeeRepo,
      writable: true,
    });
    Object.defineProperty(employeeHelpers, "documentTypeRepo", {
      value: mockDocumentTypeRepo,
      writable: true,
    });
    Object.defineProperty(employeeHelpers, "documentRepo", {
      value: mockDocumentRepo,
      writable: true,
    });
  });

  describe("processRequiredDocuments - Processamento de Documentos Obrigatórios", () => {
    it("deve processar documentos obrigatórios com sucesso", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022", value: "123.456.789-01" }, // CPF
        { documentTypeId: "507f1f77bcf86cd799439033", value: "12.345.678-9" }, // RG
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById
        .mockResolvedValueOnce(mockDocumentTypeCpf)
        .mockResolvedValueOnce(mockDocumentTypeRg);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findById).toHaveBeenCalledTimes(2);
      expect(mockDocumentRepo.create).toHaveBeenCalledTimes(2);
      expect(mockEmployeeRepo.addRequiredTypes).toHaveBeenCalledTimes(2);

      // Verificar criação do documento CPF
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "123.456.789-01",
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439022",
      });

      // Verificar criação do documento RG
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "12.345.678-9",
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439033",
      });
    });

    it("deve processar documento CPF sem valor fornecido", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" }, // CPF sem valor
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "123.456.789-01", // Usa o document do employee
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439022",
      });
    });

    it("deve processar documento não-CPF sem valor como PENDING", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439033" }, // RG sem valor
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeRg);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "",
        status: DocumentStatus.PENDING,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439033",
      });
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "invalid-id";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" },
      ];

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findById).not.toHaveBeenCalled();
    });

    it("deve lançar erro se tipo de documento não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [{ documentTypeId: "invalid-type-id" }];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow(DocumentTypeNotFoundError);

      expect(mockDocumentTypeRepo.findById).toHaveBeenCalledWith(
        "invalid-type-id"
      );
      expect(mockDocumentRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se CPF fornecido não confere com CPF do colaborador", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022", value: "999.999.999-99" }, // CPF diferente
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);

      // Act & Assert
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow(ValidationError);
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow(
        "CPF fornecido (999.999.999-99) não confere com o CPF de identificação do colaborador (123.456.789-01)"
      );

      expect(mockDocumentRepo.create).not.toHaveBeenCalled();
    });

    it("deve processar múltiplos documentos em sequência", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" }, // CPF
        { documentTypeId: "507f1f77bcf86cd799439033", value: "RG123" }, // RG com valor
        { documentTypeId: "507f1f77bcf86cd799439044" }, // Outro documento sem valor
      ];

      const mockDocumentTypeOther = {
        _id: "507f1f77bcf86cd799439044",
        name: "Carteira de Trabalho",
        description: "CTPS",
        isActive: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById
        .mockResolvedValueOnce(mockDocumentTypeCpf)
        .mockResolvedValueOnce(mockDocumentTypeRg)
        .mockResolvedValueOnce(mockDocumentTypeOther);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert
      expect(mockDocumentRepo.create).toHaveBeenCalledTimes(3);
      expect(mockEmployeeRepo.addRequiredTypes).toHaveBeenCalledTimes(3);

      // Verificar cada chamada
      expect(mockDocumentRepo.create).toHaveBeenNthCalledWith(1, {
        value: "123.456.789-01",
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439022",
      });

      expect(mockDocumentRepo.create).toHaveBeenNthCalledWith(2, {
        value: "RG123",
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439033",
      });

      expect(mockDocumentRepo.create).toHaveBeenNthCalledWith(3, {
        value: "",
        status: DocumentStatus.PENDING,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439044",
      });
    });

    it("deve propagar erro do documentRepo.create", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" },
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockDocumentRepo.create.mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow("Database error");
    });

    it("deve propagar erro do employeeRepo.addRequiredTypes", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" },
      ];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockRejectedValue(
        new Error("Link error")
      );

      // Act & Assert
      await expect(
        employeeHelpers.processRequiredDocuments(employeeId, requiredDocuments)
      ).rejects.toThrow("Link error");
    });
  });

  describe("isCpfDocumentType - Identificação de Tipo CPF", () => {
    it('deve identificar "CPF" como tipo CPF', () => {
      // Act & Assert
      expect(employeeHelpers.isCpfDocumentType("CPF")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("cpf")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("Cpf")).toBe(true);
    });

    it('deve identificar "Cadastro de Pessoa Física" como tipo CPF', () => {
      // Act & Assert
      expect(
        employeeHelpers.isCpfDocumentType("Cadastro de Pessoa Física")
      ).toBe(true);
      expect(
        employeeHelpers.isCpfDocumentType("CADASTRO DE PESSOA FÍSICA")
      ).toBe(true);
      expect(
        employeeHelpers.isCpfDocumentType("cadastro de pessoa física")
      ).toBe(true);
    });

    it('deve identificar nomes que contêm "cpf"', () => {
      // Act & Assert
      expect(employeeHelpers.isCpfDocumentType("Documento CPF")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("CPF - Cadastro")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("Número do CPF")).toBe(true);
    });

    it("deve retornar false para tipos que não são CPF", () => {
      // Act & Assert
      expect(employeeHelpers.isCpfDocumentType("RG")).toBe(false);
      expect(employeeHelpers.isCpfDocumentType("Carteira de Trabalho")).toBe(
        false
      );
      expect(employeeHelpers.isCpfDocumentType("CNH")).toBe(false);
      expect(employeeHelpers.isCpfDocumentType("Passaporte")).toBe(false);
      expect(employeeHelpers.isCpfDocumentType("")).toBe(false);
    });

    it("deve lidar com strings vazias e undefined", () => {
      // Act & Assert
      expect(employeeHelpers.isCpfDocumentType("")).toBe(false);
      expect(employeeHelpers.isCpfDocumentType("   ")).toBe(false);
    });

    it("deve ser case-insensitive", () => {
      // Act & Assert
      expect(employeeHelpers.isCpfDocumentType("CPF")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("cpf")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("Cpf")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("cPF")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("CpF")).toBe(true);
    });
  });

  describe("Cenários de edge cases e validações", () => {
    it("deve lidar com array vazio de documentos obrigatórios", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments: any[] = [];

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentRepo.create).not.toHaveBeenCalled();
      expect(mockEmployeeRepo.addRequiredTypes).not.toHaveBeenCalled();
    });

    it('deve lidar com CPF que contém "cpf" mas não é exatamente CPF', async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const requiredDocuments = [
        { documentTypeId: "507f1f77bcf86cd799439022" }, // Sem valor, deve usar o CPF do employee
      ];

      const mockDocumentTypeSpecial = {
        _id: "507f1f77bcf86cd799439022",
        name: "Comprovante de CPF", // Contém CPF mas é diferente
        description: "Comprovante de situação no CPF",
        isActive: true,
      };

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeSpecial);
      mockDocumentRepo.create.mockResolvedValue({});
      mockEmployeeRepo.addRequiredTypes.mockResolvedValue({});

      // Act
      await employeeHelpers.processRequiredDocuments(
        employeeId,
        requiredDocuments
      );

      // Assert - Deve ser tratado como CPF por conter "cpf"
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "123.456.789-01", // Usa document do employee
        status: DocumentStatus.SENT,
        employeeId: employeeId,
        documentTypeId: "507f1f77bcf86cd799439022",
      });
    });

    it('deve lidar com tipos de documento com nomes especiais contendo "cpf"', () => {
      // Act & Assert - Testa mais variações
      expect(employeeHelpers.isCpfDocumentType("Número do CPF")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("CPF Digital")).toBe(true);
      expect(employeeHelpers.isCpfDocumentType("Comprovante de CPF")).toBe(
        true
      );
      expect(
        employeeHelpers.isCpfDocumentType("CPF - Documento Principal")
      ).toBe(true);
    });
  });
});
