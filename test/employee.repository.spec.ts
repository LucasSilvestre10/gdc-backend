import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";
import { MongooseService } from "@tsed/mongoose";
import { Employee } from "../src/models/Employee";

// Mock do MongooseService
vi.mock("@tsed/mongoose");

describe("EmployeeRepository", () => {
  let employeeRepository: EmployeeRepository;
  let mockEmployeeModel: any;
  let mockMongooseService: any;

  beforeEach(() => {
    // Configurar mocks básicos
    mockEmployeeModel = {
      create: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      updateOne: vi.fn(),
    };

    // Mock para find() que precisa suportar method chaining
    const mockQuery = {
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    mockEmployeeModel.find.mockReturnValue(mockQuery);

    // Mock do connection e modelo
    const mockConnection = {
      model: vi.fn().mockReturnValue(mockEmployeeModel),
    };

    mockMongooseService = {
      get: vi.fn().mockReturnValue(mockConnection),
    };

    // Injetar mock
    employeeRepository = new EmployeeRepository(mockMongooseService);
    Object.defineProperty(employeeRepository, "employeeModel", {
      value: mockEmployeeModel,
      writable: true,
    });
  });

  describe("create - Criação de Colaborador", () => {
    it("deve criar um colaborador com dados válidos", async () => {
      // Arrange
      const employeeDto = {
        name: "João Silva",
        document: "12345678901",
        hiredAt: new Date("2024-01-15"),
      };
      const createdEmployee = {
        _id: "test-id",
        ...employeeDto,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      mockEmployeeModel.create.mockResolvedValue(createdEmployee);

      // Act
      const result = await employeeRepository.create(employeeDto);

      // Assert
      expect(mockEmployeeModel.create).toHaveBeenCalledWith({
        ...employeeDto,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).toEqual(createdEmployee);
    });

    it("deve adicionar isActive como true por padrão", async () => {
      // Arrange
      const employeeDto = { name: "Maria Santos", document: "98765432100" };
      mockEmployeeModel.create.mockResolvedValue({
        _id: "test-id",
        ...employeeDto,
      });

      // Act
      await employeeRepository.create(employeeDto);

      // Assert
      expect(mockEmployeeModel.create).toHaveBeenCalledWith({
        ...employeeDto,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("deve adicionar timestamps de criação e atualização", async () => {
      // Arrange
      const employeeDto = { name: "Carlos Oliveira", document: "11111111111" };
      mockEmployeeModel.create.mockResolvedValue({
        _id: "test-id",
        ...employeeDto,
      });

      // Act
      await employeeRepository.create(employeeDto);

      // Assert
      const createCall = mockEmployeeModel.create.mock.calls[0][0];
      expect(createCall).toHaveProperty("createdAt");
      expect(createCall).toHaveProperty("updatedAt");
      expect(createCall.createdAt).toBeInstanceOf(Date);
      expect(createCall.updatedAt).toBeInstanceOf(Date);
    });

    it("deve propagar erro de validação do Mongoose", async () => {
      // Arrange
      const employeeDto = { name: "", document: "12345678901" };
      const validationError = new Error("Validation failed");
      mockEmployeeModel.create.mockRejectedValue(validationError);

      // Act & Assert
      await expect(employeeRepository.create(employeeDto)).rejects.toThrow(
        validationError
      );
      expect(mockEmployeeModel.create).toHaveBeenCalled();
    });
  });

  describe("update - Atualização de Colaborador", () => {
    it("deve atualizar colaborador existente e ativo", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = { name: "João da Silva Atualizado" };
      const updatedEmployee = { _id: id, ...updateDto, isActive: true };

      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(updatedEmployee);

      // Act
      const result = await employeeRepository.update(id, updateDto);

      // Assert
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateDto, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(updatedEmployee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      const updateDto = { name: "Nome Atualizado" };
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.update(id, updateDto);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateDto, updatedAt: expect.any(Date) },
        { new: true }
      );
    });

    it("deve retornar null se colaborador estiver inativo", async () => {
      // Arrange
      const id = "inactive-id";
      const updateDto = { name: "Nome Atualizado" };
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.update(id, updateDto);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        expect.any(Object),
        { new: true }
      );
    });

    it("deve atualizar automaticamente o timestamp updatedAt", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = { name: "Nome Atualizado" };
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue({ _id: id });

      // Act
      await employeeRepository.update(id, updateDto);

      // Assert
      const updateCall = mockEmployeeModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateCall).toHaveProperty("updatedAt");
      expect(updateCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("findById - Busca por ID", () => {
    it("deve encontrar colaborador ativo por ID", async () => {
      // Arrange
      const id = "test-id";
      const employee = { _id: id, name: "João Silva", isActive: true };
      mockEmployeeModel.findOne.mockResolvedValue(employee);

      // Act
      const result = await employeeRepository.findById(id);

      // Assert
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false },
      });
      expect(result).toEqual(employee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockEmployeeModel.findOne.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.findById(id);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false },
      });
    });

    it("deve retornar null se colaborador estiver inativo", async () => {
      // Arrange
      const id = "inactive-id";
      mockEmployeeModel.findOne.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.findById(id);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false },
      });
    });
  });

  describe("list - Listagem com Paginação", () => {
    beforeEach(() => {
      // Mock para suportar method chaining do find()
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(0);
    });

    it("deve listar colaboradores com parâmetros padrão", async () => {
      // Arrange
      const employees = [
        { _id: "1", name: "João Silva", isActive: true },
        { _id: "2", name: "Maria Santos", isActive: true },
      ];
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(employees),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(2);

      // Act
      const result = await employeeRepository.list();

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        isActive: { $ne: false },
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toEqual({ items: employees, total: 2 });
    });

    it("deve aplicar paginação customizada", async () => {
      // Arrange
      const filter = {};
      const opts = { page: 2, limit: 5 };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.list(filter, opts);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it("deve aplicar filtros customizados", async () => {
      // Arrange
      const filter = { name: "João" };
      const opts = { page: 1, limit: 10 };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.list(filter, opts);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: "João",
        isActive: { $ne: false },
      });
    });

    it('deve listar todos quando filter.isActive = "all"', async () => {
      // Arrange
      const filter = { isActive: "all" };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.list(filter);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({});
      expect(mockEmployeeModel.countDocuments).toHaveBeenCalledWith({});
    });

    it("deve aplicar filtro de isActive quando especificado", async () => {
      // Arrange
      const filter = { isActive: true };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.list(filter);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({ isActive: true });
    });

    it("deve listar colaboradores inativos quando filter.isActive = false", async () => {
      // Arrange
      const filter = { isActive: false };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.list(filter);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({ isActive: false });
    });

    it("deve retornar contagem total correta", async () => {
      // Arrange
      const filter = { name: "João" };
      const mockQuery = {
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(25);

      // Act
      const result = await employeeRepository.list(filter);

      // Assert
      expect(mockEmployeeModel.countDocuments).toHaveBeenCalledWith({
        name: "João",
        isActive: { $ne: false },
      });
      expect(result.total).toBe(25);
    });
  });

  describe("addRequiredTypes - Vinculação de Tipos", () => {
    it("deve adicionar tipos de documentos obrigatórios", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1", "type2", "type3"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.addRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        {
          $addToSet: { requiredDocumentTypes: { $each: typeIds } },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve trabalhar apenas com colaboradores ativos", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

      // Act
      await employeeRepository.addRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        expect.any(Object)
      );
    });

    it("deve evitar duplicatas usando $addToSet", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1", "type1", "type2"]; // Tipos duplicados
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.addRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        {
          $addToSet: { requiredDocumentTypes: { $each: typeIds } },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve atualizar timestamp updatedAt", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.addRequiredTypes(employeeId, typeIds);

      // Assert
      const updateCall = mockEmployeeModel.updateOne.mock.calls[0][1];
      expect(updateCall.$set).toHaveProperty("updatedAt");
      expect(updateCall.$set.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("removeRequiredTypes - Desvinculação de Tipos", () => {
    it("deve remover tipos de documentos obrigatórios", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1", "type2"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.removeRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        {
          $pullAll: { requiredDocumentTypes: typeIds },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve trabalhar apenas com colaboradores ativos", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 0 });

      // Act
      await employeeRepository.removeRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        expect.any(Object)
      );
    });

    it("deve remover múltiplos tipos usando $pullAll", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1", "type2", "type3"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.removeRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        expect.any(Object),
        {
          $pullAll: { requiredDocumentTypes: typeIds },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve atualizar timestamp updatedAt", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds = ["type1"];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.removeRequiredTypes(employeeId, typeIds);

      // Assert
      const updateCall = mockEmployeeModel.updateOne.mock.calls[0][1];
      expect(updateCall.$set).toHaveProperty("updatedAt");
      expect(updateCall.$set.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("softDelete - Soft Delete", () => {
    it("deve fazer soft delete de colaborador ativo", async () => {
      // Arrange
      const id = "test-id";
      const deletedEmployee = {
        _id: id,
        name: "João Silva",
        isActive: false,
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(deletedEmployee);

      // Act
      const result = await employeeRepository.softDelete(id);

      // Assert
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        {
          isActive: false,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(deletedEmployee);
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.softDelete(id);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it("deve retornar null se colaborador já estiver inativo", async () => {
      // Arrange
      const id = "inactive-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.softDelete(id);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        expect.any(Object),
        { new: true }
      );
    });

    it("deve definir timestamps de deleção e atualização", async () => {
      // Arrange
      const id = "test-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue({ _id: id });

      // Act
      await employeeRepository.softDelete(id);

      // Assert
      const updateCall = mockEmployeeModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateCall).toHaveProperty("isActive", false);
      expect(updateCall).toHaveProperty("deletedAt");
      expect(updateCall).toHaveProperty("updatedAt");
      expect(updateCall.deletedAt).toBeInstanceOf(Date);
      expect(updateCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("restore - Restauração", () => {
    it("deve restaurar colaborador inativo", async () => {
      // Arrange
      const id = "test-id";
      const restoredEmployee = {
        _id: id,
        name: "João Silva",
        isActive: true,
        deletedAt: null,
        updatedAt: expect.any(Date),
      };
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(restoredEmployee);

      // Act
      const result = await employeeRepository.restore(id);

      // Assert
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id },
        {
          isActive: true,
          deletedAt: null,
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(restoredEmployee);
    });

    it("deve permitir restaurar colaboradores inativos", async () => {
      // Arrange
      const id = "test-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue({ _id: id });

      // Act
      await employeeRepository.restore(id);

      // Assert
      // Verifica que não há filtro de isActive na query (permite restaurar inativos)
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id }, // Sem filtro de isActive
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("deve retornar null se colaborador não existir", async () => {
      // Arrange
      const id = "inexistent-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.restore(id);

      // Assert
      expect(result).toBeNull();
    });

    it("deve limpar deletedAt e marcar como ativo", async () => {
      // Arrange
      const id = "test-id";
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue({ _id: id });

      // Act
      await employeeRepository.restore(id);

      // Assert
      const updateCall = mockEmployeeModel.findOneAndUpdate.mock.calls[0][1];
      expect(updateCall).toHaveProperty("isActive", true);
      expect(updateCall).toHaveProperty("deletedAt", null);
      expect(updateCall).toHaveProperty("updatedAt");
      expect(updateCall.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe("findByDocument - Busca por CPF", () => {
    it("deve encontrar colaborador por CPF", async () => {
      // Arrange
      const document = "12345678901";
      const employee = {
        _id: "test-id",
        name: "João Silva",
        document,
        isActive: true,
      };
      mockEmployeeModel.findOne.mockResolvedValue(employee);

      // Act
      const result = await employeeRepository.findByDocument(document);

      // Assert
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        document,
        isActive: { $ne: false },
      });
      expect(result).toEqual(employee);
    });

    it("deve retornar null se CPF não existir entre ativos", async () => {
      // Arrange
      const document = "99999999999";
      mockEmployeeModel.findOne.mockResolvedValue(null);

      // Act
      const result = await employeeRepository.findByDocument(document);

      // Assert
      expect(result).toBeNull();
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        document,
        isActive: { $ne: false },
      });
    });

    it("deve filtrar apenas colaboradores ativos", async () => {
      // Arrange
      const document = "12345678901";
      mockEmployeeModel.findOne.mockResolvedValue(null);

      // Act
      await employeeRepository.findByDocument(document);

      // Assert
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        document,
        isActive: { $ne: false },
      });
    });

    it("deve trabalhar com CPF formatado", async () => {
      // Arrange
      const document = "123.456.789-01";
      const employee = { _id: "test-id", name: "João Silva", document };
      mockEmployeeModel.findOne.mockResolvedValue(employee);

      // Act
      const result = await employeeRepository.findByDocument(document);

      // Assert
      expect(mockEmployeeModel.findOne).toHaveBeenCalledWith({
        document,
        isActive: { $ne: false },
      });
      expect(result).toEqual(employee);
    });
  });

  describe("searchByName - Busca por Nome", () => {
    beforeEach(() => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
    });

    it("deve buscar colaboradores por nome (case-insensitive)", async () => {
      // Arrange
      const query = "joão";
      const employees = [{ _id: "1", name: "João Silva" }];
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(employees),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      const result = await employeeRepository.searchByName(query);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: { $regex: query, $options: "i" },
        isActive: { $ne: false },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toEqual(employees);
    });

    it("deve aplicar filtro de status quando especificado", async () => {
      // Arrange
      const query = "maria";
      const filters = { status: "active" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByName(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: { $regex: query, $options: "i" },
        isActive: true,
      });
    });

    it('deve buscar colaboradores inativos quando status = "inactive"', async () => {
      // Arrange
      const query = "carlos";
      const filters = { status: "inactive" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByName(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: { $regex: query, $options: "i" },
        isActive: false,
      });
    });

    it('deve buscar todos quando status = "all"', async () => {
      // Arrange
      const query = "ana";
      const filters = { status: "all" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByName(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: { $regex: query, $options: "i" },
        isActive: { $ne: false },
      });
    });

    it("deve ordenar resultados por nome", async () => {
      // Arrange
      const query = "pedro";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByName(query);

      // Assert
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe("searchByNameOrCpf - Busca Combinada", () => {
    beforeEach(() => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(0);
    });

    it("deve buscar por nome ou CPF com parâmetros padrão", async () => {
      // Arrange
      const query = "joão";
      const employees = [{ _id: "1", name: "João Silva" }];
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(employees),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await employeeRepository.searchByNameOrCpf(query);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        isActive: { $ne: false },
        $or: [{ name: { $regex: query, $options: "i" } }, { document: query }],
      });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual({ items: employees, total: 1 });
    });

    it("deve aplicar paginação customizada", async () => {
      // Arrange
      const query = "maria";
      const filters = {};
      const opts = { page: 2, limit: 5 };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query, filters, opts);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it('deve aplicar filtro de status "all"', async () => {
      // Arrange
      const query = "test";
      const filters = { status: "all" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        $or: [{ name: { $regex: query, $options: "i" } }, { document: query }],
      });
    });

    it('deve aplicar filtro de status "active"', async () => {
      // Arrange
      const query = "test";
      const filters = { status: "active" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        isActive: true,
        $or: [{ name: { $regex: query, $options: "i" } }, { document: query }],
      });
    });

    it('deve aplicar filtro de status "inactive"', async () => {
      // Arrange
      const query = "test";
      const filters = { status: "inactive" };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query, filters);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        isActive: false,
        $or: [{ name: { $regex: query, $options: "i" } }, { document: query }],
      });
    });

    it("deve criar regex para CPF formatado quando query tem 11 dígitos", async () => {
      // Arrange
      const query = "12345678901";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query);

      // Assert
      const expectedCall = mockEmployeeModel.find.mock.calls[0][0];
      expect(expectedCall.$or).toHaveLength(3); // nome, documento exato, documento com regex
      expect(expectedCall.$or[2]).toHaveProperty("document");
      expect(expectedCall.$or[2].document).toHaveProperty("$regex");
    });

    it("deve limpar formatação do CPF para busca flexível", async () => {
      // Arrange
      const query = "123.456.789-01"; // CPF formatado
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query);

      // Assert
      // Verifica se foi chamado com a query original
      const expectedCall = mockEmployeeModel.find.mock.calls[0][0];
      expect(expectedCall.$or[1]).toEqual({ document: query });
    });

    it("deve ordenar resultados por nome", async () => {
      // Arrange
      const query = "test";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByNameOrCpf(query);

      // Assert
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
    });
  });

  describe("findByDocumentType - Busca por Tipo de Documento", () => {
    beforeEach(() => {
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(0);
    });

    it("deve buscar colaboradores por tipo de documento", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const employees = [
        {
          _id: "1",
          name: "João Silva",
          requiredDocumentTypes: [documentTypeId],
        },
      ];
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(employees),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(1);

      // Act
      const result =
        await employeeRepository.findByDocumentType(documentTypeId);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }],
        requiredDocumentTypes: documentTypeId,
      });
      expect(result).toEqual({ items: employees, total: 1 });
    });

    it("deve aplicar paginação com valores padrão", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.findByDocumentType(documentTypeId);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1) * 10
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    it("deve aplicar paginação customizada", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const options = { page: 2, limit: 5 };
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.findByDocumentType(documentTypeId, options);

      // Assert
      expect(mockQuery.skip).toHaveBeenCalledWith(5); // (2-1) * 5
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    it("deve ordenar por nome", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.findByDocumentType(documentTypeId);

      // Assert
      expect(mockQuery.sort).toHaveBeenCalledWith({ name: 1 });
    });

    it("deve retornar contagem total correta", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);
      mockEmployeeModel.countDocuments.mockResolvedValue(15);

      // Act
      const result =
        await employeeRepository.findByDocumentType(documentTypeId);

      // Assert
      expect(mockEmployeeModel.countDocuments).toHaveBeenCalledWith({
        $or: [{ isActive: { $exists: false } }, { isActive: { $ne: false } }],
        requiredDocumentTypes: documentTypeId,
      });
      expect(result.total).toBe(15);
    });

    it("deve permitir buscar colaboradores mesmo sem isActive definido", async () => {
      // Arrange
      const documentTypeId = "type-id";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.findByDocumentType(documentTypeId);

      // Assert
      const expectedCall = mockEmployeeModel.find.mock.calls[0][0];
      expect(expectedCall.$or).toEqual([
        { isActive: { $exists: false } },
        { isActive: { $ne: false } },
      ]);
    });
  });

  describe("Cenários de erro e edge cases", () => {
    it("deve lidar com erro de conexão do MongoDB durante criação", async () => {
      // Arrange
      const employeeDto = { name: "João Silva", document: "12345678901" };
      const connectionError = new Error("MongoDB connection timeout");
      mockEmployeeModel.create.mockRejectedValue(connectionError);

      // Act & Assert
      await expect(employeeRepository.create(employeeDto)).rejects.toThrow(
        connectionError
      );
    });

    it("deve lidar com campos opcionais na criação", async () => {
      // Arrange
      const employeeDto = { name: "João Silva" }; // Sem document
      const createdEmployee = { _id: "test-id", ...employeeDto };
      mockEmployeeModel.create.mockResolvedValue(createdEmployee);

      // Act
      await employeeRepository.create(employeeDto);

      // Assert
      expect(mockEmployeeModel.create).toHaveBeenCalledWith({
        ...employeeDto,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("deve lidar com array vazio de tipos para adicionar", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds: string[] = [];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.addRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        {
          $addToSet: { requiredDocumentTypes: { $each: [] } },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve lidar com array vazio de tipos para remover", async () => {
      // Arrange
      const employeeId = "test-id";
      const typeIds: string[] = [];
      mockEmployeeModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await employeeRepository.removeRequiredTypes(employeeId, typeIds);

      // Assert
      expect(mockEmployeeModel.updateOne).toHaveBeenCalledWith(
        { _id: employeeId, isActive: { $ne: false } },
        {
          $pullAll: { requiredDocumentTypes: [] },
          $set: { updatedAt: expect.any(Date) },
        }
      );
    });

    it("deve lidar com query vazia na busca por nome", async () => {
      // Arrange
      const query = "";
      const mockQuery = {
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockEmployeeModel.find.mockReturnValue(mockQuery);

      // Act
      await employeeRepository.searchByName(query);

      // Assert
      expect(mockEmployeeModel.find).toHaveBeenCalledWith({
        name: { $regex: "", $options: "i" },
        isActive: { $ne: false },
      });
    });

    it("deve lidar com dados malformados no update", async () => {
      // Arrange
      const id = "test-id";
      const updateDto = {}; // Objeto vazio
      mockEmployeeModel.findOneAndUpdate.mockResolvedValue({ _id: id });

      // Act
      await employeeRepository.update(id, updateDto);

      // Assert
      expect(mockEmployeeModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { updatedAt: expect.any(Date) },
        { new: true }
      );
    });
  });
});
