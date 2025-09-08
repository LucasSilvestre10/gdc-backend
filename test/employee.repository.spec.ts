import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";

// Testes para o repositório de funcionários
describe("EmployeeRepository", () => {
  let repo: EmployeeRepository;
  let mockModel: any;

  // Antes de cada teste, cria um mock do modelo do Mongoose e instancia o repositório
  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      findByIdAndUpdate: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn(),
    };
    
    // Mock da cadeia de métodos para find (skip, limit, exec)
    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    
    mockModel.find.mockReturnValue(mockQuery);
    
    // @ts-ignore
    repo = new EmployeeRepository(mockModel);
  });

  // Testa o método create
  describe("create", () => {
    it("deve criar um novo funcionário com campos de auditoria", async () => {
      // Arrange: dados de entrada e saída esperada
      const employeeData = { name: "João", email: "joao@example.com" };
      const createdEmployee = { 
        _id: "123", 
        ...employeeData,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método create do Mongoose
      mockModel.create.mockResolvedValue(createdEmployee);
      
      // Act: chama o método do repositório
      const result = await repo.create(employeeData);
      
      // Assert: verifica se o método foi chamado com dados incluindo campos de auditoria
      expect(mockModel.create).toHaveBeenCalledWith({
        ...employeeData,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(result).toEqual(createdEmployee);
    });
  });

  // Testa o método update
  describe("update", () => {
    it("deve atualizar um funcionário existente (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const updateData = { name: "João Silva" };
      const updatedEmployee = { _id: id, ...updateData, updatedAt: expect.any(Date) };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate.mockResolvedValue(updatedEmployee);
      
      // Act: chama o método do repositório
      const result = await repo.update(id, updateData);
      
      // Assert: verifica se o método foi chamado corretamente com filtro de registro ativo
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedEmployee);
    });

    it("deve retornar null se funcionário não for encontrado ou estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      const updateData = { name: "João Silva" };
      
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
    it("deve encontrar funcionário por ID (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const employee = { _id: id, name: "João", isActive: true };
      
      // Mock: simula retorno do método findOne do Mongoose
      mockModel.findOne.mockResolvedValue(employee);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: verifica se o método foi chamado com filtro de registro ativo
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false }
      });
      expect(result).toEqual(employee);
    });

    it("deve retornar null se funcionário não for encontrado ou estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOne
      mockModel.findOne.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método list
  describe("list", () => {
    it("deve listar funcionários com paginação padrão (apenas registros ativos)", async () => {
      // Arrange: dados de saída esperada
      const employees = [{ _id: "1", name: "João" }, { _id: "2", name: "Maria" }];
      const total = 2;
      
      // Mock: simula retorno da consulta e contagem
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(employees);
      mockModel.countDocuments.mockResolvedValue(total);
      
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
      expect(result).toEqual({ items: employees, total });
    });

    it("deve listar funcionários com filtros e paginação customizada", async () => {
      // Arrange: dados de entrada e saída esperada
      const filter = { department: "TI" };
      const opts = { page: 2, limit: 5 };
      const employees = [{ _id: "1", name: "João" }];
      const total = 15;
      
      // Mock: simula retorno da consulta e contagem
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(employees);
      mockModel.countDocuments.mockResolvedValue(total);
      
      // Act: chama o método do repositório com filtros e paginação
      const result = await repo.list(filter, opts);
      
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
      expect(result).toEqual({ items: employees, total });
    });
  });

  // Testa o método addRequiredTypes
  describe("addRequiredTypes", () => {
    it("não deve duplicar tipos e atualiza apenas registros ativos", async () => {
      // Arrange: dados de entrada
      const employeeId = "abc";
      const typeIds = ["x", "y", "x"];
      
      // Mock: simula retorno do método updateOne do Mongoose
      mockModel.updateOne.mockResolvedValue({});
      
      // Act: chama o método do repositório
      await repo.addRequiredTypes(employeeId, typeIds);
      
      // Assert: verifica se o método foi chamado corretamente com $addToSet e filtro ativo
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        { 
          $addToSet: { requiredDocumentTypes: { $each: typeIds } },
          $set: { updatedAt: expect.any(Date) }
        }
      );
    });
  });

  // Testa o método removeRequiredTypes
  describe("removeRequiredTypes", () => {
    it("deve remover tipos de documentos obrigatórios apenas de registros ativos", async () => {
      // Arrange: dados de entrada
      const employeeId = "abc";
      const typeIds = ["x", "y"];
      
      // Mock: simula retorno do método updateOne do Mongoose
      mockModel.updateOne.mockResolvedValue({});
      
      // Act: chama o método do repositório
      await repo.removeRequiredTypes(employeeId, typeIds);
      
      // Assert: verifica se o método foi chamado corretamente com $pullAll e filtro ativo
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        { 
          $pullAll: { requiredDocumentTypes: typeIds },
          $set: { updatedAt: expect.any(Date) }
        }
      );
    });
  });

  // Testa o método softDelete
  describe("softDelete", () => {
    it("deve marcar funcionário como inativo", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const deletedEmployee = { 
        _id: id, 
        name: "João", 
        isActive: false, 
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate.mockResolvedValue(deletedEmployee);
      
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
      expect(result).toEqual(deletedEmployee);
    });

    it("deve retornar null se funcionário não for encontrado ou já estiver inativo", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOneAndUpdate
      mockModel.findOneAndUpdate.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.softDelete(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método restore
  describe("restore", () => {
    it("deve reativar funcionário", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const restoredEmployee = { 
        _id: id, 
        name: "João", 
        isActive: true, 
        deletedAt: null,
        updatedAt: expect.any(Date)
      };
      
      // Mock: simula retorno do método findOneAndUpdate do Mongoose
      mockModel.findOneAndUpdate.mockResolvedValue(restoredEmployee);
      
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
      expect(result).toEqual(restoredEmployee);
    });

    it("deve retornar null se funcionário não for encontrado", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findOneAndUpdate
      mockModel.findOneAndUpdate.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.restore(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método findByDocument
  describe("findByDocument", () => {
    it("deve encontrar funcionário por documento (apenas registros ativos)", async () => {
      // Arrange: dados de entrada e saída esperada
      const document = "123.456.789-00";
      const employee = { _id: "123", name: "João", document, isActive: true };
      
      // Mock: simula retorno do método findOne do Mongoose
      mockModel.findOne.mockResolvedValue(employee);
      
      // Act: chama o método do repositório
      const result = await repo.findByDocument(document);
      
      // Assert: verifica se o método foi chamado com filtro de registro ativo
      expect(mockModel.findOne).toHaveBeenCalledWith({
        document,
        isActive: { $ne: false }
      });
      expect(result).toEqual(employee);
    });

    it("deve retornar null se funcionário não for encontrado", async () => {
      // Arrange: dados de entrada
      const document = "999.999.999-99";
      
      // Mock: simula retorno nulo do método findOne
      mockModel.findOne.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.findByDocument(document);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });
});