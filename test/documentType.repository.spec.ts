/// <reference types="vitest" />
import { describe, it, beforeEach, expect, vi } from "vitest";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";

// Testes para o repositório de tipos de documento
describe("DocumentTypeRepository", () => {
  let repo: DocumentTypeRepository;
  let mockModel: any;

  // Antes de cada teste, cria um mock do modelo do Mongoose e instancia o repositório
  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
    };
    
    // Mock da cadeia de métodos para find (skip, limit, exec)
    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    
    mockModel.find.mockReturnValue(mockQuery);
    mockModel.findOne.mockReturnValue({ exec: vi.fn() });
    mockModel.countDocuments.mockReturnValue({ exec: vi.fn() });
    mockModel.findOneAndUpdate.mockReturnValue({ exec: vi.fn() });
    
    // @ts-ignore
    repo = new DocumentTypeRepository(mockModel);
  });

  // Testa o método create
  describe("create", () => {
    it("deve criar um novo tipo de documento com campos de auditoria", async () => {
      // Arrange: dados de entrada e saída esperada
      const docTypeData = { name: "CPF", description: "Cadastro de Pessoa Física" };
      const createdDocType = { 
        _id: "123", 
        ...docTypeData,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método create do Mongoose
      mockModel.create.mockResolvedValue(createdDocType);
      
      // Act: chama o método do repositório
      const result = await repo.create(docTypeData);
      
      // Assert: verifica se o método foi chamado com dados incluindo campos de auditoria
      expect(mockModel.create).toHaveBeenCalledWith({
        ...docTypeData,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(createdDocType);
    });
  });

  // Testa o método update
  describe("update", () => {
    it("deve atualizar um tipo de documento existente (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const updateData = { name: "CPF Atualizado" };
      const updatedDocType = { _id: id, ...updateData, updatedAt: expect.any(Date) };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate.mockResolvedValue(updatedDocType);
      
      // Act: chama o método do repositório
      const result = await repo.update(id, updateData);
      
      // Assert: verifica se o método foi chamado corretamente com filtro de registro ativo
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedDocType);
    });

    it("deve retornar null se tipo de documento não for encontrado ou estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      const updateData = { name: "CPF Atualizado" };
      
      // Mock: simula retorno nulo do método findOneAndUpdate
      mockModel.findOneAndUpdate.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.update(id, updateData);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método findById
  describe("findById", () => {
    it("deve encontrar tipo de documento por ID (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const docType = { _id: id, name: "CPF", isActive: true };
      
      // Mock: simula retorno do método findOne do Mongoose
      mockModel.findOne().exec.mockResolvedValue(docType);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: verifica se o método foi chamado com filtro de registro ativo
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false }
      });
      expect(result).toEqual(docType);
    });

    it("deve retornar null se tipo de documento não for encontrado ou estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOne
      mockModel.findOne().exec.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método findByName
  describe("findByName", () => {
    it("deve encontrar tipo de documento por nome (case-insensitive, apenas ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const name = "CPF";
      const docType = { _id: "123", name: "CPF", isActive: true };
      
      // Mock: simula retorno do método findOne do Mongoose
      mockModel.findOne().exec.mockResolvedValue(docType);
      
      // Act: chama o método do repositório
      const result = await repo.findByName(name);
      
      // Assert: verifica se o método foi chamado com regex case-insensitive e filtro ativo
      expect(mockModel.findOne).toHaveBeenCalledWith({
        name: new RegExp(`^${name}$`, "i"),
        isActive: { $ne: false }
      });
      expect(result).toEqual(docType);
    });

    it("deve retornar null se nome for vazio ou apenas espaços", async () => {
      // Act: chama o método do repositório com nome vazio
      const result1 = await repo.findByName("");
      const result2 = await repo.findByName("   ");
      
      // Assert: espera que o retorno seja null sem chamar o modelo
      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });
  });

  // Testa o método list
  describe("list", () => {
    it("deve listar tipos de documento com paginação padrão (apenas registros ativos)", async () => {
      // Arrange: dados de saída esperada
      const docTypes = [{ _id: "1", name: "CPF" }, { _id: "2", name: "RG" }];
      const total = 2;
      
      // Mock: simula retorno da consulta e contagem
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(docTypes);
      mockModel.countDocuments().exec.mockResolvedValue(total);
      
      // Act: chama o método do repositório sem filtros
      const result = await repo.list();
      
      // Assert: verifica se os métodos foram chamados corretamente com filtro de registros ativos
      expect(mockModel.find).toHaveBeenCalledWith({
        isActive: { $ne: false }
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        isActive: { $ne: false }
      });
      expect(result).toEqual({ items: docTypes, total });
    });

    it("deve listar tipos de documento com filtros e paginação customizada", async () => {
      // Arrange: dados de entrada e saída esperada
      const filter = { name: /CPF/i };
      const options = { page: 2, limit: 5 };
      const docTypes = [{ _id: "1", name: "CPF" }];
      const total = 15;
      
      // Mock: simula retorno da consulta e contagem
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(docTypes);
      mockModel.countDocuments().exec.mockResolvedValue(total);
      
      // Act: chama o método do repositório com filtros e paginação
      const result = await repo.list(filter, options);
      
      // Assert: verifica se os métodos foram chamados corretamente com filtros combinados
      expect(mockModel.find).toHaveBeenCalledWith({
        ...filter,
        isActive: { $ne: false }
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (page - 1) * limit = (2 - 1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({
        ...filter,
        isActive: { $ne: false }
      });
      expect(result).toEqual({ items: docTypes, total });
    });
  });

  // Testa o método findByIds
  describe("findByIds", () => {
    it("deve encontrar múltiplos tipos de documento por IDs (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const ids = ["id1", "id2"];
      const docTypes = [
        { _id: "id1", name: "CPF", isActive: true },
        { _id: "id2", name: "RG", isActive: true }
      ];
      
      // Mock: simula retorno do método find do Mongoose
      mockModel.find().exec.mockResolvedValue(docTypes);
      
      // Act: chama o método do repositório
      const result = await repo.findByIds(ids);
      
      // Assert: verifica se o método foi chamado com filtro correto
      expect(mockModel.find).toHaveBeenCalledWith({
        _id: { $in: ids },
        isActive: { $ne: false }
      });
      expect(result).toEqual(docTypes);
    });
  });

  // Testa o método softDelete
  describe("softDelete", () => {
    it("deve marcar tipo de documento como inativo", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const deletedDocType = { 
        _id: id, 
        name: "CPF", 
        isActive: false, 
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate().exec.mockResolvedValue(deletedDocType);
      
      // Act: chama o método do repositório
      const result = await repo.softDelete(id);
      
      // Assert: verifica se o método foi chamado corretamente
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { 
          isActive: false,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(deletedDocType);
    });

    it("deve retornar null se tipo de documento não for encontrado ou já estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOneAndUpdate
      mockModel.findOneAndUpdate().exec.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.softDelete(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método restore
  describe("restore", () => {
    it("deve reativar tipo de documento", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const restoredDocType = { 
        _id: id, 
        name: "CPF", 
        isActive: true, 
        deletedAt: null,
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate().exec.mockResolvedValue(restoredDocType);
      
      // Act: chama o método do repositório
      const result = await repo.restore(id);
      
      // Assert: verifica se o método foi chamado corretamente
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id },
        { 
          isActive: true,
          deletedAt: null,
          updatedAt: expect.any(Date)
        },
        { new: true }
      );
      expect(result).toEqual(restoredDocType);
    });

    it("deve retornar null se tipo de documento não for encontrado", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOneAndUpdate
      mockModel.findOneAndUpdate().exec.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.restore(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });
});