import { describe, it, expect, beforeEach, vi } from "vitest";
import { EmployeeBasicOperations } from "../src/services/employee/EmployeeBasicOperationsService";
import { ValidationError, DuplicateEmployeeError } from "../src/exceptions";

describe("EmployeeBasicOperations", () => {
  let service: EmployeeBasicOperations;
  let mockRepo: any;

  const mockEmployee = {
    _id: "507f1f77bcf86cd799439011",
    name: "João",
    document: "123.456.789-01",
    hiredAt: new Date("2024-01-15"),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockRepo = {
      list: vi.fn(),
      findById: vi.fn(),
      findByDocument: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      restore: vi.fn(),
      searchByNameOrCpf: vi.fn(),
    };

    service = new EmployeeBasicOperations(mockRepo);
  });

  describe("list", () => {
    it("deve retornar listagem paginada e validar pagina existente", async () => {
      // Arrange
      mockRepo.list.mockResolvedValue({ items: [mockEmployee], total: 1 });

      // Act
      const result = await service.list({}, { page: 1, limit: 10 });

      // Assert
      expect(mockRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("deve normalizar page/limit inválidos (NaN) para valores padrão", async () => {
      // Arrange: passar strings que não são números
      mockRepo.list.mockResolvedValue({ items: [mockEmployee], total: 1 });

      // Act: page e limit inválidos (NaN)
      const result = await service.list(
        {},
        { page: "abc" as any, limit: "xyz" as any }
      );

      // Assert: deve usar os defaults (page=1, limit=20)
      expect(mockRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(1);
    });

    it("deve normalizar quando page for NaN (Number('abc'))", async () => {
      // Arrange: page será NaN quando convertido via Number('abc')
      mockRepo.list.mockResolvedValue({ items: [mockEmployee], total: 1 });

      // Act: passar page como NaN explicitamente
      await service.list({}, { page: Number("abc"), limit: 10 });

      // Assert: page deve ser normalizado para 1 pelo serviço
      expect(mockRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
    });

    it("deve normalizar quando limit for NaN (Number('xyz'))", async () => {
      // Arrange: limit será NaN quando convertido via Number('xyz')
      mockRepo.list.mockResolvedValue({ items: [mockEmployee], total: 1 });

      // Act: passar limit como NaN explicitamente
      await service.list({}, { page: 1, limit: Number("xyz") });

      // Assert: limit deve ser normalizado para 20 pelo serviço
      expect(mockRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
    });

    it("deve aplicar valores mínimos quando page/limit forem menores que 1", async () => {
      // Arrange: total pequeno para validar page mínimo
      mockRepo.list.mockResolvedValue({ items: [], total: 0 });

      // Act: passar page negativo e limit zero
      const result = await service.list(
        {},
        { page: -1 as any, limit: 0 as any }
      );

      // Assert: page mínimo 1 e limit mínimo 20
      expect(mockRepo.list).toHaveBeenCalledWith({}, { page: 1, limit: 20 });
      expect(result.items).toHaveLength(0);
    });

    it("deve lançar ValidationError quando status inválido", async () => {
      await expect(service.list({ status: "invalid" } as any)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe("findById", () => {
    it("deve validar formato e chamar repo", async () => {
      // Arrange
      const id = "507f1f77bcf86cd799439011";
      mockRepo.findById.mockResolvedValue(mockEmployee);

      // Act
      const result = await service.findById(id);

      // Assert
      expect(mockRepo.findById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe("findByDocument", () => {
    it("deve delegar para o repositório e retornar o colaborador", async () => {
      const document = "123.456.789-01";
      mockRepo.findByDocument.mockResolvedValue(mockEmployee);

      const result = await service.findByDocument(document);

      expect(mockRepo.findByDocument).toHaveBeenCalledWith(document);
      expect(result).toEqual(mockEmployee);
    });
  });

  describe("create", () => {
    it("deve criar novo colaborador quando cpf não existe", async () => {
      mockRepo.findByDocument.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockEmployee);

      const payload = {
        name: "João",
        document: "123.456.789-01",
        hiredAt: new Date(),
      };
      const result = await service.create(payload);

      expect(mockRepo.findByDocument).toHaveBeenCalledWith(payload.document);
      expect(mockRepo.create).toHaveBeenCalled();
      expect(result).toEqual(mockEmployee);
    });

    it("deve lançar DuplicateEmployeeError quando cpf já existe", async () => {
      mockRepo.findByDocument.mockResolvedValue(mockEmployee);
      await expect(
        service.create({
          name: "X",
          document: "123.456.789-01",
          hiredAt: new Date(),
        })
      ).rejects.toThrow(DuplicateEmployeeError);
    });
  });

  describe("updateEmployee", () => {
    it("deve validar id e chamar update", async () => {
      const id = "507f1f77bcf86cd799439011";
      mockRepo.update.mockResolvedValue({
        ...mockEmployee,
        name: "João Updated",
      });

      const result = await service.updateEmployee(id, { name: "João Updated" });

      expect(mockRepo.update).toHaveBeenCalledWith(id, {
        name: "João Updated",
      });
      expect(result).toHaveProperty("name", "João Updated");
    });
  });

  describe("delete", () => {
    it("deve validar id obrigatório e formatado", async () => {
      await expect(service.delete("")).rejects.toThrow(ValidationError);
    });

    it("deve retornar null quando não encontrado", async () => {
      const id = "507f1f77bcf86cd799439099";
      mockRepo.findById.mockResolvedValue(null);
      const result = await service.delete(id);
      expect(result).toBeNull();
    });

    it("deve chamar softDelete quando encontrado", async () => {
      const id = "507f1f77bcf86cd799439011";
      mockRepo.findById.mockResolvedValue(mockEmployee);
      mockRepo.softDelete.mockResolvedValue({
        ...mockEmployee,
        isActive: false,
      });

      const result = await service.delete(id);
      expect(mockRepo.softDelete).toHaveBeenCalledWith(id);
      expect(result).toHaveProperty("isActive", false);
    });
  });

  describe("restore", () => {
    it("deve validar id obrigatório", async () => {
      await expect(service.restore("")).rejects.toThrow(ValidationError);
    });

    it("deve chamar restore no repositório", async () => {
      const id = "507f1f77bcf86cd799439011";
      mockRepo.restore.mockResolvedValue({ ...mockEmployee, isActive: true });
      const result = await service.restore(id);
      expect(mockRepo.restore).toHaveBeenCalledWith(id);
      expect(result).toHaveProperty("isActive", true);
    });
  });

  describe("searchByNameOrCpf", () => {
    it("deve delegar busca para o repositorio", async () => {
      mockRepo.searchByNameOrCpf.mockResolvedValue({
        items: [mockEmployee],
        total: 1,
      });
      const result = await service.searchByNameOrCpf(
        "João",
        {},
        { page: 1, limit: 10 }
      );
      expect(mockRepo.searchByNameOrCpf).toHaveBeenCalledWith(
        "João",
        {},
        { page: 1, limit: 10 }
      );
      expect(result.items).toHaveLength(1);
    });
  });
});
