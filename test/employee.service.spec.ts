/// <reference types="vitest" />
import { describe, it, beforeEach, expect, vi } from "vitest";
import { EmployeeService } from "../src/services/EmployeeService";
import { DocumentStatus } from "../src/models/Document";
import mongoose from "mongoose";

/**
 * Testes unitários para EmployeeService
 * Validam as regras de negócio seguindo especificações do desafio INMETA.
 * Cada bloco testa uma funcionalidade do serviço, simulando os repositórios com mocks.
 */
describe("EmployeeService", () => {
  let service: EmployeeService;
  let employeeRepo: any;
  let documentTypeRepo: any;
  let documentRepo: any;

  beforeEach(() => {
    // Mock dos repositories para isolar o service e testar apenas lógica de negócio
    employeeRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      addRequiredTypes: vi.fn(),
      removeRequiredTypes: vi.fn()
    };

    documentTypeRepo = {
      findByIds: vi.fn()
    };

    documentRepo = {
      find: vi.fn()
    };

    service = new EmployeeService(employeeRepo, documentTypeRepo, documentRepo);
  });

  /**
   * Testa o cadastro de colaborador conforme especificação do desafio.
   * Valida que o DTO é passado corretamente para o repositório.
   */
  describe("createEmployee", () => {
    it("should create employee successfully with valid data", async () => {
      // DTO válido seguindo model Employee (CPF formatado, nome válido)
      const dto = { 
        name: "João Silva", 
        document: "123.456.789-01",
        hiredAt: new Date("2024-01-01")
      };
      
      const employee = { 
        _id: new mongoose.Types.ObjectId(), 
        ...dto,
        requiredDocumentTypes: []
      };
      
      employeeRepo.create.mockResolvedValue(employee);

      const result = await service.createEmployee(dto);
      
      // Valida que o repositório foi chamado com dados corretos
      expect(employeeRepo.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(employee);
      expect(result.name).toBe("João Silva");
      expect(result.document).toBe("123.456.789-01");
    });
  });

  /**
   * Testa a atualização de colaborador.
   * Valida que dados parciais são passados corretamente.
   */
  describe("updateEmployee", () => {
    it("should update employee successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const updateDto = { name: "João Silva Santos" };
      const updatedEmployee = {
        _id: employeeId,
        name: "João Silva Santos",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: []
      };

      employeeRepo.update.mockResolvedValue(updatedEmployee);

      const result = await service.updateEmployee(employeeId, updateDto);

      expect(employeeRepo.update).toHaveBeenCalledWith(employeeId, updateDto);
      expect(result?.name).toBe("João Silva Santos");
    });
  });

  /**
   * Testa a vinculação de tipos de documentos ao colaborador.
   * Funcionalidade core do desafio: "Vinculação e desvinculação de um colaborador com tipos de documentos".
   * - Deve ser possível vincular mais de um tipo por vez
   * - Deve validar se todos os tipos existem antes de vincular
   */
  describe("linkDocumentTypes", () => {
    it("should link multiple document types when all types exist", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];
      
      // Mock de tipos existentes no banco
      const types = [
        { _id: new mongoose.Types.ObjectId(typeIds[0]), name: "CPF" },
        { _id: new mongoose.Types.ObjectId(typeIds[1]), name: "Carteira de Trabalho" }
      ];

      documentTypeRepo.findByIds.mockResolvedValue(types);
      employeeRepo.addRequiredTypes.mockResolvedValue(undefined);

      await service.linkDocumentTypes(employeeId, typeIds);

      // Valida que buscou os tipos e vinculou corretamente
      expect(documentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(employeeRepo.addRequiredTypes).toHaveBeenCalledWith(employeeId, typeIds);
    });

    it("should throw error when some document types do not exist", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeIds = ["type1", "type2"];
      
      // Retorna apenas 1 tipo, mas foram solicitados 2
      const types = [{ _id: "type1", name: "CPF" }];

      documentTypeRepo.findByIds.mockResolvedValue(types);

      // Deve lançar erro por integridade referencial
      await expect(service.linkDocumentTypes(employeeId, typeIds))
        .rejects.toThrow("Algum tipo de documento não existe");
    });

    it("should do nothing when typeIds array is empty", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();

      // Não deve executar operações desnecessárias
      await service.linkDocumentTypes(employeeId, []);

      expect(documentTypeRepo.findByIds).not.toHaveBeenCalled();
      expect(employeeRepo.addRequiredTypes).not.toHaveBeenCalled();
    });
  });

  /**
   * Testa o core business do desafio: status da documentação.
   * Especificação: "Obter o status da documentação de um colaborador específico, 
   * mostrando quais foram enviados e quais ainda estão pendentes de envio"
   */
  describe("getDocumentationStatus", () => {
    it("should return sent and pending documents correctly", async () => {
      const employeeId = new mongoose.Types.ObjectId();
      const typeId1 = new mongoose.Types.ObjectId();
      const typeId2 = new mongoose.Types.ObjectId();
      const typeId3 = new mongoose.Types.ObjectId();

      // Colaborador com 3 tipos obrigatórios
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: [typeId1, typeId2, typeId3]
      };

      // Tipos obrigatórios cadastrados
      const requiredTypes = [
        { _id: typeId1, name: "CPF" },
        { _id: typeId2, name: "Carteira de Trabalho" },
        { _id: typeId3, name: "RG" }
      ];

      // Apenas CPF foi enviado (status SENT)
      const sentDocuments = [
        { 
          _id: new mongoose.Types.ObjectId(),
          name: "CPF João Silva",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId.toString());

      // Valida separação correta: 1 enviado, 2 pendentes
      expect(result.sent).toHaveLength(1);
      expect(result.sent[0].name).toBe("CPF");
      expect(result.pending).toHaveLength(2);
      expect(result.pending.map(p => p.name)).toContain("Carteira de Trabalho");
      expect(result.pending.map(p => p.name)).toContain("RG");
    });

    it("should throw error when employee not found", async () => {
      const invalidId = new mongoose.Types.ObjectId().toString();
      
      employeeRepo.findById.mockResolvedValue(null);

      // Deve validar existência do colaborador
      await expect(service.getDocumentationStatus(invalidId))
        .rejects.toThrow("Colaborador não encontrado");
    });

    it("should return empty arrays when employee has no required documents", async () => {
      const employeeId = new mongoose.Types.ObjectId();
      
      // Colaborador sem documentos obrigatórios
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: [] // Array vazio
      };

      employeeRepo.findById.mockResolvedValue(employee);

      const result = await service.getDocumentationStatus(employeeId.toString());

      // Deve retornar arrays vazios sem erros
      expect(result.sent).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    // NOVO TESTE: Cobre linha 51 - quando employee.requiredDocumentTypes é null/undefined
    it("should return empty arrays when employee has null requiredDocumentTypes", async () => {
      const employeeId = new mongoose.Types.ObjectId();
      
      // Colaborador com requiredDocumentTypes undefined/null
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: null // null ao invés de array vazio
      };

      employeeRepo.findById.mockResolvedValue(employee);

      const result = await service.getDocumentationStatus(employeeId.toString());

      // Deve tratar null como array vazio e retornar arrays vazios
      expect(result.sent).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    // NOVO TESTE: Cobre linhas 69 e 73 - quando type._id é undefined
    it("should handle document types with undefined _id", async () => {
      const employeeId = new mongoose.Types.ObjectId();
      const typeId1 = new mongoose.Types.ObjectId();

      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: [typeId1]
      };

      // Tipo com _id undefined (cenário de erro de dados)
      const requiredTypes = [
        { _id: undefined, name: "CPF" } // _id undefined
      ];

      const sentDocuments = [
        { 
          _id: new mongoose.Types.ObjectId(),
          name: "CPF João Silva",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId.toString());

      // Deve tratar _id undefined corretamente usando fallback para ""
      expect(result.sent).toHaveLength(0); // Não vai encontrar match com ""
      expect(result.pending).toHaveLength(1); // Vai para pending
      expect(result.pending[0].name).toBe("CPF");
    });

    // TESTE ADICIONAL: Cenário onde todos os documentos foram enviados
    it("should return all documents as sent when all are submitted", async () => {
      const employeeId = new mongoose.Types.ObjectId();
      const typeId1 = new mongoose.Types.ObjectId();
      const typeId2 = new mongoose.Types.ObjectId();

      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date(),
        requiredDocumentTypes: [typeId1, typeId2]
      };

      const requiredTypes = [
        { _id: typeId1, name: "CPF" },
        { _id: typeId2, name: "RG" }
      ];

      // Todos os documentos enviados
      const sentDocuments = [
        { 
          _id: new mongoose.Types.ObjectId(),
          name: "CPF João Silva",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        },
        { 
          _id: new mongoose.Types.ObjectId(),
          name: "RG João Silva",
          documentTypeId: typeId2,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId.toString());

      // Todos enviados, nenhum pendente
      expect(result.sent).toHaveLength(2);
      expect(result.pending).toHaveLength(0);
      expect(result.sent.map(s => s.name)).toContain("CPF");
      expect(result.sent.map(s => s.name)).toContain("RG");
    });
  });

  /**
   * Testa a desvinculação de tipos de documentos.
   * Especificação: "Deve ser possível vincular e desvincular mais de um tipo de documento por vez"
   */
  describe("unlinkDocumentTypes", () => {
    it("should unlink multiple document types successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];

      employeeRepo.removeRequiredTypes.mockResolvedValue(undefined);

      await service.unlinkDocumentTypes(employeeId, typeIds);

      // Valida que múltiplos tipos foram desvinculados
      expect(employeeRepo.removeRequiredTypes).toHaveBeenCalledWith(employeeId, typeIds);
    });

    it("should do nothing when typeIds array is empty", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();

      await service.unlinkDocumentTypes(employeeId, []);

      // Não deve executar operações desnecessárias
      expect(employeeRepo.removeRequiredTypes).not.toHaveBeenCalled();
    });
  });
});