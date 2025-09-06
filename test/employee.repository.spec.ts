import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmployeeRepository } from "../src/repositories/EmployeeRepository";

// Testa o método addRequiredTypes do EmployeeRepository
describe("EmployeeRepository", () => {
  let repo: EmployeeRepository;
  let mockModel: any;

  // Antes de cada teste, cria um mock do model do Mongoose
  beforeEach(() => {
    // Mock do método updateOne do MongooseModel
    mockModel = {
      updateOne: vi.fn().mockResolvedValue({}),
    };
    // Instancia o repositório usando o mock
    // @ts-ignore
    repo = new EmployeeRepository(mockModel);
  });

  // Teste principal: verifica se addRequiredTypes não duplica tipos
  it("addRequiredTypes não duplica tipos", async () => {
    const employeeId = "abc";
    // Array com tipos duplicados propositalmente
    const typeIds = ["x", "y", "x"];
    // Chama o método do repositório
    await repo.addRequiredTypes(employeeId, typeIds);

    // Verifica se updateOne foi chamado com $addToSet e $each
    // $addToSet garante que não haverá duplicatas no array no banco
    expect(mockModel.updateOne).toHaveBeenCalledWith(
      { _id: employeeId },
      { $addToSet: { requiredDocumentTypes: { $each: typeIds } } }
    );
  });
});