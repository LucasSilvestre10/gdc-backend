/// <reference types="vitest" />
import { describe, it, beforeEach, expect, vi } from "vitest";
import { EmployeeService } from "../src/services/EmployeeService";
import { DocumentStatus } from "../src/models/Document";
import { Employee } from "../src/models/Employee";
import mongoose from "mongoose";

/**
 * Tipo auxiliar para representar Employee com _id do MongoDB nos testes
 */
type EmployeeWithId = Employee & { _id: string | mongoose.Types.ObjectId };

/**
 * Testes unitários para EmployeeService
 * Validam as regras de negócio e funcionalidades do sistema.
 * Cada bloco testa uma funcionalidade do serviço, simulando os repositórios com mocks.
 */
describe("EmployeeService", () => {
  let service: EmployeeService;
  let employeeRepo: any;
  let documentTypeRepo: any;
  let documentRepo: any;
  let linkRepo: any;

  beforeEach(() => {
    // Mock dos repositories para isolar o service e testar apenas lógica de negócio
    employeeRepo = {
      create: vi.fn(),
      update: vi.fn(),
      findById: vi.fn(),
      list: vi.fn(),
      findByDocument: vi.fn(),
      addRequiredTypes: vi.fn(),
      removeRequiredTypes: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn()
    };

    documentTypeRepo = {
      findByIds: vi.fn(),
      findById: vi.fn()
    };

    documentRepo = {
      find: vi.fn(),
      create: vi.fn()
    };

    linkRepo = {
      create: vi.fn(),
      findByEmployee: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      findLink: vi.fn()
    };

    service = new EmployeeService(employeeRepo, documentTypeRepo, documentRepo, linkRepo);
  });

  /**
   * Testa o cadastro de colaborador conforme regras de negócio do sistema.
   * Valida que o DTO é passado corretamente para o repositório.
   */
  describe("create", () => {
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
      
      // Mock: CPF não existe (não há duplicata)
      employeeRepo.findByDocument.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(employee);

      const result = await service.create(dto);
      
      // Valida que verificou duplicata e criou corretamente
      expect(employeeRepo.findByDocument).toHaveBeenCalledWith("123.456.789-01");
      expect(employeeRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        document: dto.document,
        hiredAt: dto.hiredAt
      });
      expect(result).toEqual(employee);
      expect(result.name).toBe("João Silva");
      expect(result.document).toBe("123.456.789-01");
    });

    it("should throw error when document already exists", async () => {
      const dto = { 
        name: "João Silva", 
        document: "123.456.789-01",
        hiredAt: new Date("2024-01-01")
      };
      
      // Mock: CPF já existe
      const existingEmployee = {
        _id: new mongoose.Types.ObjectId(),
        name: "Outro João",
        document: "123.456.789-01"
      };
      
      employeeRepo.findByDocument.mockResolvedValue(existingEmployee);

      // Deve lançar erro por CPF duplicado
      await expect(service.create(dto))
        .rejects.toThrow("Já existe um colaborador cadastrado com o CPF 123.456.789-01");
      
      expect(employeeRepo.findByDocument).toHaveBeenCalledWith("123.456.789-01");
      expect(employeeRepo.create).not.toHaveBeenCalled();
    });

    it("should create employee when document is not provided", async () => {
      const dto = { 
        name: "João Silva",
        hiredAt: new Date("2024-01-01")
      };
      
      const employee = { 
        _id: new mongoose.Types.ObjectId(), 
        ...dto,
        requiredDocumentTypes: []
      };
      
      // Mock: verifica que não encontrou colaborador com document undefined
      employeeRepo.findByDocument.mockResolvedValue(null);
      employeeRepo.create.mockResolvedValue(employee);

      const result = await service.create(dto);
      
      // Deve verificar duplicata mesmo quando document é undefined
      expect(employeeRepo.findByDocument).toHaveBeenCalledWith(undefined);
      expect(employeeRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        document: undefined,
        hiredAt: dto.hiredAt
      });
      expect(result).toEqual(employee);
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
   * Testa a listagem de colaboradores.
   * Valida paginação e retorno de dados ativos (soft delete).
   */
  describe("list", () => {
    it("should list employees with pagination", async () => {
      const employees = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "João Silva",
          document: "123.456.789-01",
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Maria Santos", 
          document: "987.654.321-00",
          isActive: true
        }
      ];

      const mockResult = {
        items: employees,
        total: 2
      };

      employeeRepo.list.mockResolvedValue(mockResult);

      const result = await service.list({}, { page: 1, limit: 10 });

      expect(employeeRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0].name).toBe("João Silva");
    });

    it("should list employees with default options", async () => {
      const mockResult = { items: [], total: 0 };
      employeeRepo.list.mockResolvedValue(mockResult);

      const result = await service.list();

      expect(employeeRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  /**
   * Testa a busca de colaborador por ID.
   * Valida que apenas colaboradores ativos são retornados (soft delete).
   */
  describe("findById", () => {
    it("should find employee by id successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        isActive: true
      };

      employeeRepo.findById.mockResolvedValue(employee);

      const result = await service.findById(employeeId);

      expect(employeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(result?.name).toBe("João Silva");
      expect((result as EmployeeWithId)?._id).toBe(employeeId);
    });

    it("should return null when employee not found", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      employeeRepo.findById.mockResolvedValue(null);

      const result = await service.findById(employeeId);

      expect(employeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(result).toBeNull();
    });
  });

  /**
   * Testa a vinculação de tipos de documentos ao colaborador.
   * Funcionalidade do sistema: "Vinculação e desvinculação de um colaborador com tipos de documentos".
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

      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01"
      };

      employeeRepo.findById.mockResolvedValue(employee);
      documentTypeRepo.findByIds.mockResolvedValue(types);
      linkRepo.create.mockResolvedValue(undefined);
      employeeRepo.addRequiredTypes.mockResolvedValue(undefined);

      await service.linkDocumentTypes(employeeId, typeIds);

      // Valida que buscou o colaborador e tipos, depois vinculou
      expect(employeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(documentTypeRepo.findByIds).toHaveBeenCalledWith(typeIds);
      expect(linkRepo.create).toHaveBeenCalledTimes(2);
      expect(employeeRepo.addRequiredTypes).toHaveBeenCalledWith(employeeId, typeIds);
    });

    it("should throw error when some document types do not exist", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];
      
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01"
      };
      
      // Retorna apenas 1 tipo, mas foram solicitados 2
      const types = [{ _id: typeIds[0], name: "CPF" }];

      employeeRepo.findById.mockResolvedValue(employee);
      documentTypeRepo.findByIds.mockResolvedValue(types);

      // Deve lançar erro por integridade referencial
      await expect(service.linkDocumentTypes(employeeId, typeIds))
        .rejects.toThrow("Tipo de documento não encontrado");
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
   * Testa a funcionalidade principal: status da documentação.
   * Funcionalidade: "Obter o status da documentação de um colaborador específico, 
   * mostrando quais foram enviados e quais ainda estão pendentes de envio"
   */
  describe("getDocumentationStatus", () => {
    it("should return sent and pending documents correctly", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeId1 = new mongoose.Types.ObjectId().toString();
      const typeId2 = new mongoose.Types.ObjectId().toString();
      const typeId3 = new mongoose.Types.ObjectId().toString();

      // Colaborador existente
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date()
      };

      // Links ativos com tipos de documento
      const activeLinks = [
        { documentTypeId: { _id: typeId1 } },
        { documentTypeId: { _id: typeId2 } },
        { documentTypeId: { _id: typeId3 } }
      ];

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
          value: "123.456.789-01",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      linkRepo.findByEmployee.mockResolvedValue(activeLinks);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId);

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
      const employeeId = new mongoose.Types.ObjectId().toString();
      
      // Colaborador sem documentos obrigatórios
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date()
      };

      employeeRepo.findById.mockResolvedValue(employee);
      linkRepo.findByEmployee.mockResolvedValue([]); // Sem links ativos

      const result = await service.getDocumentationStatus(employeeId);

      // Deve retornar arrays vazios sem erros
      expect(result.sent).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    // NOVO TESTE: Cobre linha 51 - quando employee.requiredDocumentTypes é null/undefined
    it("should return empty arrays when employee has null requiredDocumentTypes", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      
      // Colaborador sem links ativos
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date()
      };

      employeeRepo.findById.mockResolvedValue(employee);
      linkRepo.findByEmployee.mockResolvedValue([]); // Sem links ativos

      const result = await service.getDocumentationStatus(employeeId);

      // Deve tratar null como array vazio e retornar arrays vazios
      expect(result.sent).toEqual([]);
      expect(result.pending).toEqual([]);
    });

    // NOVO TESTE: Cobre linhas 69 e 73 - quando type._id é undefined
    it("should handle document types with undefined _id", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeId1 = new mongoose.Types.ObjectId().toString();

      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date()
      };

      // Links ativos
      const activeLinks = [
        { documentTypeId: { _id: typeId1 } }
      ];

      // Tipo com _id undefined (cenário de erro de dados)
      const requiredTypes = [
        { _id: undefined, name: "CPF" } // _id undefined
      ];

      const sentDocuments = [
        { 
          _id: new mongoose.Types.ObjectId(),
          value: "123.456.789-01",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      linkRepo.findByEmployee.mockResolvedValue(activeLinks);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId);

      // Deve tratar _id undefined corretamente usando fallback para ""
      expect(result.sent).toHaveLength(0); // Não vai encontrar match com ""
      expect(result.pending).toHaveLength(1); // Vai para pending
      expect(result.pending[0].name).toBe("CPF");
    });

    // TESTE ADICIONAL: Cenário onde todos os documentos foram enviados
    it("should return all documents as sent when all are submitted", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeId1 = new mongoose.Types.ObjectId().toString();
      const typeId2 = new mongoose.Types.ObjectId().toString();

      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        hiredAt: new Date()
      };

      // Links ativos
      const activeLinks = [
        { documentTypeId: { _id: typeId1 } },
        { documentTypeId: { _id: typeId2 } }
      ];

      const requiredTypes = [
        { _id: typeId1, name: "CPF" },
        { _id: typeId2, name: "RG" }
      ];

      // Todos os documentos enviados
      const sentDocuments = [
        { 
          _id: new mongoose.Types.ObjectId(),
          value: "123.456.789-01",
          documentTypeId: typeId1,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        },
        { 
          _id: new mongoose.Types.ObjectId(),
          value: "12.345.678-9",
          documentTypeId: typeId2,
          employeeId: employeeId,
          status: DocumentStatus.SENT
        }
      ];

      employeeRepo.findById.mockResolvedValue(employee);
      linkRepo.findByEmployee.mockResolvedValue(activeLinks);
      documentTypeRepo.findByIds.mockResolvedValue(requiredTypes);
      documentRepo.find.mockResolvedValue(sentDocuments);

      const result = await service.getDocumentationStatus(employeeId);

      // Todos enviados, nenhum pendente
      expect(result.sent).toHaveLength(2);
      expect(result.pending).toHaveLength(0);
      expect(result.sent.map(s => s.name)).toContain("CPF");
      expect(result.sent.map(s => s.name)).toContain("RG");
    });
  });

  /**
   * Testa a desvinculação de tipos de documentos.
   * Requisito: "Deve ser possível vincular e desvincular mais de um tipo de documento por vez"
   */
  describe("unlinkDocumentTypes", () => {
    it("should unlink multiple document types successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const typeIds = [
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];

      linkRepo.softDelete.mockResolvedValue(undefined);
      employeeRepo.removeRequiredTypes.mockResolvedValue(undefined);

      await service.unlinkDocumentTypes(employeeId, typeIds);

      // Valida que soft delete foi chamado para cada tipo e depois removeRequiredTypes
      expect(linkRepo.softDelete).toHaveBeenCalledTimes(2);
      expect(employeeRepo.removeRequiredTypes).toHaveBeenCalledWith(employeeId, typeIds);
    });

    it("should do nothing when typeIds array is empty", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();

      await service.unlinkDocumentTypes(employeeId, []);

      // Não deve executar operações desnecessárias
      expect(employeeRepo.removeRequiredTypes).not.toHaveBeenCalled();
    });
  });

  /**
   * Testa o soft delete de colaboradores.
   * Implementa remoção lógica mantendo dados para auditoria.
   */
  describe("delete", () => {
    it("should soft delete employee successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const employee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        isActive: true
      };
      
      const deletedEmployee = {
        ...employee,
        isActive: false,
        deletedAt: new Date()
      };

      employeeRepo.findById.mockResolvedValue(employee);
      employeeRepo.softDelete.mockResolvedValue(deletedEmployee);

      const result = await service.delete(employeeId);

      expect(employeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(employeeRepo.softDelete).toHaveBeenCalledWith(employeeId);
      expect(result).toEqual(deletedEmployee);
    });

    it("should return null when employee does not exist", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();

      employeeRepo.findById.mockResolvedValue(null);

      const result = await service.delete(employeeId);

      expect(employeeRepo.findById).toHaveBeenCalledWith(employeeId);
      expect(employeeRepo.softDelete).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should throw error when ID is invalid", async () => {
      await expect(service.delete(""))
        .rejects.toThrow("ID é obrigatório");

      await expect(service.delete("   "))
        .rejects.toThrow("ID é obrigatório");

      expect(employeeRepo.findById).not.toHaveBeenCalled();
      expect(employeeRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  /**
   * Testa a restauração de colaboradores (undo do soft delete).
   * Permite reativar colaboradores removidos logicamente.
   */
  describe("restore", () => {
    it("should restore employee successfully", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();
      const restoredEmployee = {
        _id: employeeId,
        name: "João Silva",
        document: "123.456.789-01",
        isActive: true,
        deletedAt: null
      };

      employeeRepo.restore.mockResolvedValue(restoredEmployee);

      const result = await service.restore(employeeId);

      expect(employeeRepo.restore).toHaveBeenCalledWith(employeeId);
      expect(result).toEqual(restoredEmployee);
    });

    it("should return null when employee does not exist", async () => {
      const employeeId = new mongoose.Types.ObjectId().toString();

      employeeRepo.restore.mockResolvedValue(null);

      const result = await service.restore(employeeId);

      expect(employeeRepo.restore).toHaveBeenCalledWith(employeeId);
      expect(result).toBeNull();
    });

    it("should throw error when ID is invalid", async () => {
      await expect(service.restore(""))
        .rejects.toThrow("ID é obrigatório");

      await expect(service.restore(null as any))
        .rejects.toThrow("ID é obrigatório");

      expect(employeeRepo.restore).not.toHaveBeenCalled();
    });
  });
});