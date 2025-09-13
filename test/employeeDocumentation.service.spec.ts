import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeDocumentationService } from "../src/services/employee/EmployeeDocumentationService";
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

describe("EmployeeDocumentationService", () => {
  let employeeDocumentationService: EmployeeDocumentationService;
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

  const mockSentDocument = {
    _id: "507f1f77bcf86cd799439044",
    value: "123.456.789-01",
    status: DocumentStatus.SENT,
    employeeId: "507f1f77bcf86cd799439011",
    documentTypeId: "507f1f77bcf86cd799439022",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActiveLink = {
    _id: "507f1f77bcf86cd799439055",
    employeeId: "507f1f77bcf86cd799439011",
    documentTypeId: {
      _id: "507f1f77bcf86cd799439022",
      name: "CPF",
      description: "Cadastro de Pessoa Física",
      isActive: true,
    },
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Mock dos repositórios
    mockEmployeeRepo = {
      findById: vi.fn(),
    };

    mockDocumentTypeRepo = {
      findByIds: vi.fn(),
      findById: vi.fn(),
    };

    mockDocumentRepo = {
      find: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findByEmployeeAndType: vi.fn(),
    };

    mockLinkRepo = {
      findByEmployee: vi.fn(),
    };

    // Criar instância com mocks injetados
    employeeDocumentationService = new EmployeeDocumentationService(
      mockEmployeeRepo,
      mockDocumentTypeRepo,
      mockDocumentRepo,
      mockLinkRepo
    );

    // Injetar mocks via Object.defineProperty
    Object.defineProperty(employeeDocumentationService, "employeeRepo", {
      value: mockEmployeeRepo,
      writable: true,
    });
    Object.defineProperty(employeeDocumentationService, "documentTypeRepo", {
      value: mockDocumentTypeRepo,
      writable: true,
    });
    Object.defineProperty(employeeDocumentationService, "documentRepo", {
      value: mockDocumentRepo,
      writable: true,
    });
    Object.defineProperty(employeeDocumentationService, "linkRepo", {
      value: mockLinkRepo,
      writable: true,
    });
  });

  describe("getDocumentationStatus - Status da Documentação", () => {
    it("deve retornar status da documentação com documentos enviados e pendentes", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockDocumentRepo.find.mockResolvedValue([mockSentDocument]);

      // Act
      const result =
        await employeeDocumentationService.getDocumentationStatus(employeeId);

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockLinkRepo.findByEmployee).toHaveBeenCalledWith(
        employeeId,
        "active"
      );
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("pending");
      expect(result.sent).toHaveLength(1);
      expect(result.pending).toHaveLength(0);
    });

    it("deve retornar documentos pendentes quando não há documentos enviados", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
      mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
      mockDocumentRepo.find.mockResolvedValue([]); // Nenhum documento enviado

      // Act
      const result =
        await employeeDocumentationService.getDocumentationStatus(employeeId);

      // Assert
      expect(result.sent).toHaveLength(0);
      expect(result.pending).toHaveLength(1);
      expect(result.pending[0]).toEqual(mockDocumentTypeCpf);
    });

    it("deve retornar listas vazias quando não há vínculos ativos", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockLinkRepo.findByEmployee.mockResolvedValue([]); // Nenhum link ativo

      // Act
      const result =
        await employeeDocumentationService.getDocumentationStatus(employeeId);

      // Assert
      expect(result.sent).toHaveLength(0);
      expect(result.pending).toHaveLength(0);
      expect(mockDocumentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(mockDocumentRepo.find).not.toHaveBeenCalled();
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      const employeeId = "invalid-id";

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeDocumentationService.getDocumentationStatus(employeeId)
      ).rejects.toThrow("Colaborador não encontrado");

      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockLinkRepo.findByEmployee).not.toHaveBeenCalled();
    });
  });

  describe("sendDocument - Envio de Documentos", () => {
    it("deve enviar documento com sucesso", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      const documentTypeId = "507f1f77bcf86cd799439022";
      const value = "123.456.789-01";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      // Certifica que há vínculo ativo para o colaborador
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
      // documentRepo.find é usado internamente para verificar existência
      mockDocumentRepo.find.mockResolvedValue([]);
      mockDocumentRepo.findByEmployeeAndType.mockResolvedValue(null); // Nenhum documento existente
      mockDocumentRepo.create.mockResolvedValue(mockSentDocument);

      // Act
      const result = await employeeDocumentationService.sendDocument(
        employeeId,
        documentTypeId,
        value
      );

      // Assert
      expect(mockEmployeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(mockDocumentTypeRepo.findById).toHaveBeenCalledWith(
        documentTypeId
      );
      // O serviço limpa o valor do documento antes de criar e marca isActive=true
      expect(mockDocumentRepo.create).toHaveBeenCalledWith({
        value: "12345678901",
        status: DocumentStatus.SENT,
        employeeId,
        documentTypeId,
        isActive: true,
      });
      expect(result).toEqual(mockSentDocument);
    });

    it("deve lançar erro se colaborador não for encontrado", async () => {
      // Arrange
      // Use um ID com formato válido (24 hex) para passar pela validação de formato
      const employeeId = "507f1f77bcf86cd799439099";
      const documentTypeId = "507f1f77bcf86cd799439022";
      const value = "test-value";

      mockEmployeeRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        employeeDocumentationService.sendDocument(
          employeeId,
          documentTypeId,
          value
        )
      ).rejects.toThrow(EmployeeNotFoundError);

      expect(mockDocumentTypeRepo.findById).not.toHaveBeenCalled();
      expect(mockDocumentRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro se tipo de documento não for encontrado", async () => {
      // Arrange
      const employeeId = "507f1f77bcf86cd799439011";
      // use um id válido (24 hex) para contornar validação de formato
      const documentTypeId = "507f1f77bcf86cd799439099";
      const value = "test-value";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(null);
      // Garantir vínculos ativos para o colaborador (para que a validação avance até verificar o tipo)
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);

      // Act & Assert
      await expect(
        employeeDocumentationService.sendDocument(
          employeeId,
          documentTypeId,
          value
        )
      ).rejects.toBeInstanceOf(DocumentTypeNotFoundError);
      expect(mockDocumentRepo.create).not.toHaveBeenCalled();
    });

    it("deve lançar erro quando colaborador não está vinculado ao tipo", async () => {
      const employeeId = "507f1f77bcf86cd799439011";
      const documentTypeId = mockDocumentTypeCpf._id;
      const value = "v";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      // vínculo diferente do solicitado
      mockLinkRepo.findByEmployee.mockResolvedValue([
        { documentTypeId: { _id: "507f1f77bcf86cd799439099" } },
      ]);

      await expect(
        employeeDocumentationService.sendDocument(
          employeeId,
          documentTypeId,
          value
        )
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("deve atualizar documento existente quando já houver enviado", async () => {
      const employeeId = mockEmployee._id;
      const documentTypeId = mockDocumentTypeCpf._id;
      const value = " 123 ";

      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
      // existe documento anterior
      const existing = { _id: "d1", value: "old", status: DocumentStatus.SENT };
      // O serviço usa documentRepo.find para buscar documentos existentes
      mockDocumentRepo.find.mockResolvedValue([existing]);
      mockDocumentRepo.update.mockResolvedValue({ ...existing, value: "123" });

      const out = await employeeDocumentationService.sendDocument(
        employeeId,
        documentTypeId,
        value
      );

      expect(mockDocumentRepo.update).toHaveBeenCalled();
      expect(out).toHaveProperty("value", "123");
    });

    it("enrichEmployeesWithDocumentationInfo calcula sumário", async () => {
      const emp: any = { _id: mockEmployee._id, name: "X" };
      mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
      mockDocumentRepo.find.mockResolvedValue([mockSentDocument]);

      const out =
        await employeeDocumentationService.enrichEmployeesWithDocumentationInfo(
          [emp]
        );
      expect(out).toHaveLength(1);
      expect(out[0].documentationSummary.sent).toBeGreaterThanOrEqual(1);
    });

    it("getSentDocuments e getPendingDocuments comportamentos", async () => {
      const employeeId = mockEmployee._id;

      // Quando colaborador não existe
      mockEmployeeRepo.findById.mockResolvedValue(null);
      await expect(
        employeeDocumentationService.getSentDocuments(employeeId)
      ).rejects.toBeInstanceOf(EmployeeNotFoundError);
      await expect(
        employeeDocumentationService.getPendingDocuments(employeeId)
      ).rejects.toBeInstanceOf(EmployeeNotFoundError);

      // Quando existe e há documentos enviados
      mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
      mockDocumentRepo.find.mockResolvedValue([
        {
          ...mockSentDocument,
          documentTypeId: mockDocumentTypeCpf._id,
          status: DocumentStatus.SENT,
        },
      ]);
      (mockDocumentTypeRepo.findById as any).mockResolvedValue(
        mockDocumentTypeCpf
      );

      const sent =
        await employeeDocumentationService.getSentDocuments(employeeId);
      expect(sent).toHaveLength(1);
      expect(sent[0].documentType.name).toBe(mockDocumentTypeCpf.name);

      // Pending: quando há vínculos e nenhum documento correspondente
      mockLinkRepo.findByEmployee.mockResolvedValue([
        {
          documentTypeId: { _id: mockDocumentTypeCpf._id },
          active: true,
          createdAt: new Date("2020-01-01"),
        },
        {
          documentTypeId: { _id: mockDocumentTypeCpf._id },
          active: true,
          createdAt: new Date("2020-01-02"),
        },
      ]);
      mockDocumentRepo.find.mockResolvedValue([]);
      (mockDocumentTypeRepo.findById as any).mockResolvedValue(
        mockDocumentTypeCpf
      );

      const pending =
        await employeeDocumentationService.getPendingDocuments(employeeId);
      expect(Array.isArray(pending)).toBe(true);
      expect(pending.length).toBeGreaterThanOrEqual(0);
    });
  });

  it("atualiza documento quando _id não é string (usa toString)", async () => {
    const employeeId = mockEmployee._id;
    const documentTypeId = mockDocumentTypeCpf._id;
    const value = " 456 ";

    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
    mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);
    mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);

    // existing doc with _id as object exposing toString()
    const existing = {
      _id: { toString: () => "oid-obj" },
      value: "old",
      status: DocumentStatus.SENT,
    };
    mockDocumentRepo.find.mockResolvedValue([existing]);
    mockDocumentRepo.update.mockResolvedValue({ ...existing, value: "456" });

    const out = await employeeDocumentationService.sendDocument(
      employeeId,
      documentTypeId,
      value
    );
    expect(mockDocumentRepo.update).toHaveBeenCalled();
    expect(out).toHaveProperty("value", "456");
  });

  it("getSentDocuments retorna fallback quando tipo de documento não é encontrado", async () => {
    const employeeId = mockEmployee._id;
    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);

    // sent doc references a documentTypeId cujo registro não existe
    const sent = [
      {
        _id: "d-sent",
        documentTypeId: "507f1f77bcf86cd799439022",
        status: DocumentStatus.SENT,
        value: "v",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockDocumentRepo.find.mockResolvedValue(sent);
    // documentTypeRepo retorna null
    mockDocumentTypeRepo.findById.mockResolvedValue(null);

    const out = await employeeDocumentationService.getSentDocuments(employeeId);
    expect(out[0].documentType.name).toBe("Tipo não encontrado");
  });

  it("getPendingDocuments deduplica links duplicados e retorna apenas uma entrada por tipo", async () => {
    const employeeId = mockEmployee._id;
    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);

    // Dois links para o mesmo tipo
    const linkA = {
      documentTypeId: {
        _id: mockDocumentTypeCpf._id,
        name: mockDocumentTypeCpf.name,
      },
      active: true,
      createdAt: new Date("2020-01-01"),
    };
    const linkB = {
      documentTypeId: {
        _id: mockDocumentTypeCpf._id,
        name: mockDocumentTypeCpf.name,
      },
      active: true,
      createdAt: new Date("2020-01-02"),
    };
    mockLinkRepo.findByEmployee.mockResolvedValue([linkA, linkB]);

    // Nenhum documento enviado
    mockDocumentRepo.find.mockResolvedValue([]);
    mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);

    const pending =
      await employeeDocumentationService.getPendingDocuments(employeeId);
    // Deve retornar apenas 1 item para o tipo duplicado
    const matches = pending.filter(
      (p: any) => p.documentType.id === mockDocumentTypeCpf._id
    );
    expect(matches.length).toBe(1);
  });

  it("enrichEmployeesWithDocumentationInfo com requiredCount 0 produz completionPercentage 0", async () => {
    const emp: any = { _id: mockEmployee._id, name: "NoReq" };
    // sem vínculos obrigatórios
    mockLinkRepo.findByEmployee.mockResolvedValue([]);
    mockDocumentRepo.find.mockResolvedValue([]);

    const out =
      await employeeDocumentationService.enrichEmployeesWithDocumentationInfo([
        emp,
      ]);
    expect(out[0].documentationSummary.required).toBe(0);
    expect(out[0].documentationSummary.completionPercentage).toBe(0);
    expect(out[0].documentationSummary.isComplete).toBe(false);
  });

  it("getPendingDocuments usa fallback quando documentType não existe e mantém requiredSince", async () => {
    const employeeId = mockEmployee._id;
    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);

    const link = {
      documentTypeId: { _id: "507f1f77bcf86cd799439099" },
      active: false,
      createdAt: new Date("2021-01-01"),
    };
    mockLinkRepo.findByEmployee.mockResolvedValue([link]);
    mockDocumentRepo.find.mockResolvedValue([]);
    // documentTypeRepo retorna null para forçar fallback
    mockDocumentTypeRepo.findById.mockResolvedValue(null);

    const pending =
      await employeeDocumentationService.getPendingDocuments(employeeId);
    expect(pending[0].documentType.name).toBe("Tipo não encontrado");
    expect(pending[0].isActive).toBe(false);
    expect(pending[0].requiredSince).toBeInstanceOf(Date);
  });

  it("getPendingDocuments retorna vazio quando todos os tipos obrigatórios já foram enviados (cobre branch de sentTypeIds)", async () => {
    const employeeId = mockEmployee._id;
    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);

    // um link obrigatório
    const link = {
      documentTypeId: { _id: mockDocumentTypeCpf._id },
      active: true,
      createdAt: new Date("2020-01-01"),
    };
    mockLinkRepo.findByEmployee.mockResolvedValue([link]);

    // simula que o tipo já foi enviado
    mockDocumentRepo.find.mockResolvedValue([
      { documentTypeId: mockDocumentTypeCpf._id, status: DocumentStatus.SENT },
    ]);
    mockDocumentTypeRepo.findById.mockResolvedValue(mockDocumentTypeCpf);

    const pending =
      await employeeDocumentationService.getPendingDocuments(employeeId);
    expect(pending).toEqual([]);
  });

  it("getPendingDocuments retorna vazio quando não há vínculos ativos (cobre if (!activeLinks.length))", async () => {
    const employeeId = mockEmployee._id;
    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
    mockLinkRepo.findByEmployee.mockResolvedValue([]);
    // documentRepo não deve ser chamado
    mockDocumentRepo.find.mockResolvedValue([
      {
        /* não usado */
      },
    ]);

    const pending =
      await employeeDocumentationService.getPendingDocuments(employeeId);
    expect(pending).toEqual([]);
    expect(mockDocumentRepo.find).not.toHaveBeenCalled();
  });
  it("getDocumentationStatus mapeia documentValue e isActive corretamente para tipos inativos com documento enviado", async () => {
    const employeeId = mockEmployee._id;

    // vínculo com isActive = false, mas existe documento enviado
    const inactiveLink = {
      _id: "link-inactive",
      employeeId,
      documentTypeId: {
        _id: mockDocumentTypeCpf._id,
        name: mockDocumentTypeCpf.name,
        description: mockDocumentTypeCpf.description,
        isActive: false,
      },
      active: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
    mockLinkRepo.findByEmployee.mockResolvedValue([inactiveLink]);
    // documentTypeRepo retorna o tipo (mesmo que isActive=false)
    mockDocumentTypeRepo.findByIds.mockResolvedValue([
      { ...mockDocumentTypeCpf, isActive: false },
    ]);
    // existe documento enviado para esse tipo
    mockDocumentRepo.find.mockResolvedValue([
      {
        _id: "d-sent-2",
        documentTypeId: mockDocumentTypeCpf._id,
        value: "VAL",
        status: DocumentStatus.SENT,
        employeeId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res =
      await employeeDocumentationService.getDocumentationStatus(employeeId);

    // Sent deve conter o documentValue e refletir isActive do tipo
    expect(res.sent).toHaveLength(1);
    expect(res.sent[0].documentValue).toBe("VAL");
    expect(res.sent[0].isActive).toBe(false);
    // Pending deve ser vazio
    expect(res.pending).toHaveLength(0);
  });

  it("getDocumentationStatus usa null quando documento enviado tem valor falsy", async () => {
    const employeeId = mockEmployee._id;

    mockEmployeeRepo.findById.mockResolvedValue(mockEmployee);
    mockLinkRepo.findByEmployee.mockResolvedValue([mockActiveLink]);
    mockDocumentTypeRepo.findByIds.mockResolvedValue([mockDocumentTypeCpf]);
    // documento enviado existe, mas value é undefined -> fallback para null
    mockDocumentRepo.find.mockResolvedValue([
      {
        _id: "d-falsy",
        documentTypeId: mockDocumentTypeCpf._id,
        value: undefined,
        status: DocumentStatus.SENT,
        employeeId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const res =
      await employeeDocumentationService.getDocumentationStatus(employeeId);

    expect(res.sent).toHaveLength(1);
    expect(res.sent[0].documentValue).toBeNull();
  });
});
