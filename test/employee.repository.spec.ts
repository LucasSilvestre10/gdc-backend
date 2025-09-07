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
      findById: vi.fn(),
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
    it("deve criar um novo funcionário", async () => {
      // Arrange: dados de entrada e saída esperada
      const employeeData = { name: "João", email: "joao@example.com" };
      const createdEmployee = { _id: "123", ...employeeData };
      
      // Mock: simula retorno do método create do Mongoose
      mockModel.create.mockResolvedValue(createdEmployee);
      
      // Act: chama o método do repositório
      const result = await repo.create(employeeData);
      
      // Assert: verifica se o método foi chamado corretamente e o retorno está correto
      expect(mockModel.create).toHaveBeenCalledWith(employeeData);
      expect(result).toEqual(createdEmployee);
    });
  });

  // Testa o método update
  describe("update", () => {
    it("deve atualizar um funcionário existente", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const updateData = { name: "João Silva" };
      const updatedEmployee = { _id: id, ...updateData };
      
      // Mock: simula retorno do método findByIdAndUpdate do Mongoose
      mockModel.findByIdAndUpdate.mockResolvedValue(updatedEmployee);
      
      // Act: chama o método do repositório
      const result = await repo.update(id, updateData);
      
      // Assert: verifica se o método foi chamado corretamente e o retorno está correto
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(id, updateData, { new: true });
      expect(result).toEqual(updatedEmployee);
    });

    it("deve retornar null se funcionário não for encontrado", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      const updateData = { name: "João Silva" };
      
      // Mock: simula retorno nulo do método findByIdAndUpdate
      mockModel.findByIdAndUpdate.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.update(id, updateData);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método findById
  describe("findById", () => {
    it("deve encontrar funcionário por ID", async () => {
      // Arrange: dados de entrada e saída esperada
      const id = "123";
      const employee = { _id: id, name: "João" };
      
      // Mock: simula retorno do método findById do Mongoose
      mockModel.findById.mockResolvedValue(employee);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: verifica se o método foi chamado corretamente e o retorno está correto
      expect(mockModel.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(employee);
    });

    it("deve retornar null se funcionário não for encontrado", async () => {
      // Arrange: dados de entrada
      const id = "inexistente";
      
      // Mock: simula retorno nulo do método findById
      mockModel.findById.mockResolvedValue(null);
      
      // Act: chama o método do repositório
      const result = await repo.findById(id);
      
      // Assert: espera que o retorno seja null
      expect(result).toBeNull();
    });
  });

  // Testa o método list
  describe("list", () => {
    it("deve listar funcionários com paginação padrão", async () => {
      // Arrange: dados de saída esperada
      const employees = [{ _id: "1", name: "João" }, { _id: "2", name: "Maria" }];
      const total = 2;
      
      // Mock: simula retorno da consulta e contagem
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(employees);
      mockModel.countDocuments.mockResolvedValue(total);
      
      // Act: chama o método do repositório sem filtros
      const result = await repo.list();
      
      // Assert: verifica se os métodos foram chamados corretamente e o retorno está correto
      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(mockModel.countDocuments).toHaveBeenCalledWith({});
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
      
      // Assert: verifica se os métodos foram chamados corretamente e o retorno está correto
      expect(mockModel.find).toHaveBeenCalledWith(filter);
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (page - 1) * limit = (2 - 1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(mockModel.countDocuments).toHaveBeenCalledWith(filter);
      expect(result).toEqual({ items: employees, total });
    });
  });

  // Testa o método addRequiredTypes
  describe("addRequiredTypes", () => {
    it("não deve duplicar tipos", async () => {
      // Arrange: dados de entrada
      const employeeId = "abc";
      const typeIds = ["x", "y", "x"];
      
      // Mock: simula retorno do método updateOne do Mongoose
      mockModel.updateOne.mockResolvedValue({});
      
      // Act: chama o método do repositório
      await repo.addRequiredTypes(employeeId, typeIds);
      
      // Assert: verifica se o método foi chamado corretamente com $addToSet
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId },
        { $addToSet: { requiredDocumentTypes: { $each: typeIds } } }
      );
    });
  });

  // Testa o método removeRequiredTypes
  describe("removeRequiredTypes", () => {
    it("deve remover tipos de documentos obrigatórios", async () => {
      // Arrange: dados de entrada
      const employeeId = "abc";
      const typeIds = ["x", "y"];
      
      // Mock: simula retorno do método updateOne do Mongoose
      mockModel.updateOne.mockResolvedValue({});
      
      // Act: chama o método do repositório
      await repo.removeRequiredTypes(employeeId, typeIds);
      
      // Assert: verifica se o método foi chamado corretamente com $pullAll
      expect(mockModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId },
        { $pullAll: { requiredDocumentTypes: typeIds } }
      );
    });
  });
});