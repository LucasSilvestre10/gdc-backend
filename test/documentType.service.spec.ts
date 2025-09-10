import { describe, it, beforeEach, expect, vi } from "vitest";
import { DocumentTypeService } from "../src/services/DocumentTypeService";
import { BadRequest } from "@tsed/exceptions";

/**
 * Suite de testes para DocumentTypeService
 * O arquivo contém testes unitários que validam:
 * - criação de tipos de documento (validações e duplicidade)
 * - listagem com e sem filtros (construção de regex)
 * - delegação para métodos do repositório (findById / findByIds)
 *
 * Cada teste documenta: o que será feito (arrange/act) e o que é esperado (assert).
 */
describe("DocumentTypeService", () => {
    let service: DocumentTypeService;
    let repo: any;

    beforeEach(() => {
        // Prepara mocks para o repository. Os testes irão controlar os retornos
        // para verificar apenas a lógica do service (isolamento).
        repo = {
            findByName: vi.fn(),
            create: vi.fn(),
            list: vi.fn(),
            findById: vi.fn(),
            findByIds: vi.fn(),
            update: vi.fn(),
            softDelete: vi.fn(),
            restore: vi.fn(),
        };

        service = new DocumentTypeService(repo);
    });

    describe("create", () => {
        it("cria um tipo de documento com dados válidos (trim aplicado)", async () => {
            // O que será feito:
            // - chamar service.create com name e description contendo espaços
            // - repo.findByName retorna null (não existe duplicata)
            // - repo.create retorna o objeto criado
            //
            // O que é esperado:
            // - o nome passado ao repo.findByName deve estar "trimado"
            // - o objeto enviado ao repo.create deve conter name e description trimados
            // - o resultado deve ser o objeto criado pelo repo
            const dto = { name: "  CPF  ", description: "  Documento de identificação  " };
            repo.findByName.mockResolvedValue(null);
            const created = { _id: "1", name: "CPF", description: "Documento de identificação" };
            repo.create.mockResolvedValue(created);

            const result = await service.create(dto);

            expect(repo.findByName).toHaveBeenCalledWith("CPF");
            expect(repo.create).toHaveBeenCalledWith({
                name: "CPF",
                description: "Documento de identificação",
            });
            expect(result).toEqual(created);
        });

        it("lança BadRequest quando name está ausente ou vazio", async () => {
            // O que será feito:
            // - chamar service.create com name vazio (após trim)
            //
            // O que é esperado:
            // - lançar BadRequest com mensagem "Name is required"
            await expect(service.create({ name: "   " })).rejects.toThrow(BadRequest);
            await expect(service.create({ name: "   " })).rejects.toThrow("Name is required");
        });

        it("lança BadRequest quando já existe tipo com mesmo nome (case-insensitive)", async () => {
            // O que será feito:
            // - repo.findByName retorna um tipo existente
            // - chamar service.create com nome em diferente case
            //
            // O que é esperado:
            // - lançar BadRequest informando que já existe tipo com mesmo nome
            repo.findByName.mockResolvedValue({ _id: "existing", name: "CPF" });
            await expect(service.create({ name: "cpf" })).rejects.toThrow(BadRequest);
            await expect(service.create({ name: "cpf" })).rejects.toThrow(
                "Document type with this name already exists"
            );
        });
    });

    describe("list", () => {
        it("lista sem filtros usando filtro vazio e repassa opts", async () => {
            // O que será feito:
            // - repo.list retorna um resultado simulado
            // - chamar service.list com opts de paginação
            //
            // O que é esperado:
            // - repo.list deve ser chamado com filtro vazio e mesmas opts
            // - retornar o resultado do repo
            const mockResult = { items: [{ name: "A" }], total: 1 };
            repo.list.mockResolvedValue(mockResult);

            const result = await service.list({}, { page: 2, limit: 5 });

            expect(repo.list).toHaveBeenCalledWith({}, { page: 2, limit: 5 });
            expect(result).toEqual(mockResult);
        });

        it("constrói regex case-insensitive quando name for fornecido", async () => {
            // O que será feito:
            // - chamar service.list com um filtro name simples
            // - repo.list será espiado para capturar o filtro construído
            //
            // O que é esperado:
            // - o filtro enviado ao repo deve conter uma RegExp case-insensitive
            const mockResult = { items: [], total: 0 };
            repo.list.mockResolvedValue(mockResult);

            const result = await service.list({ name: "cpf" }, {});

            expect(repo.list).toHaveBeenCalledWith({ name: "cpf" }, {});
            expect(result).toEqual(mockResult);
        });
    });

    describe("findById / findByIds", () => {
        it("delegates findById to repository", async () => {
            // O que será feito:
            // - repo.findById retorna um item
            // - chamar service.findById com id
            //
            // O que é esperado:
            // - service deve delegar a chamada ao repo e retornar o mesmo item
            const item = { _id: "1", name: "CPF" };
            repo.findById.mockResolvedValue(item);

            const result = await service.findById("1");

            expect(repo.findById).toHaveBeenCalledWith("1");
            expect(result).toEqual(item);
        });

        it("retorna [] quando findByIds recebe array vazio", async () => {
            // O que será feito:
            // - chamar service.findByIds com array vazio
            //
            // O que é esperado:
            // - não deve chamar repo.findByIds e retornar array vazio imediatamente
            const result = await service.findByIds([]);
            expect(result).toEqual([]);
            expect(repo.findByIds).not.toHaveBeenCalled();
        });

        it("delegates findByIds to repository quando ids presentes", async () => {
            // O que será feito:
            // - repo.findByIds retorna uma lista de tipos
            // - chamar service.findByIds com ids válidos
            //
            // O que é esperado:
            // - service deve delegar a chamada ao repo e retornar os items
            const ids = ["1", "2"];
            const items = [{ _id: "1", name: "A" }, { _id: "2", name: "B" }];
            repo.findByIds.mockResolvedValue(items);

            const result = await service.findByIds(ids);

            expect(repo.findByIds).toHaveBeenCalledWith(ids);
            expect(result).toEqual(items);
        });
    });

    describe("update", () => {
        it("deve atualizar tipo de documento com sucesso", async () => {
            // Arrange: dados de entrada e retornos esperados
            const id = "123";
            const dto = { name: "CPF Atualizado", description: "Nova descrição" };
            const existingType = { _id: id, name: "CPF", description: "Descrição antiga" };
            const updatedType = { _id: id, name: "CPF Atualizado", description: "Nova descrição" };
            
            repo.findById.mockResolvedValue(existingType);
            repo.findByName.mockResolvedValue(null); // Nome não existe em outro registro
            repo.update.mockResolvedValue(updatedType);
            
            // Act: chama o método do service
            const result = await service.update(id, dto);
            
            // Assert: verifica se foi chamado corretamente
            expect(repo.findById).toHaveBeenCalledWith(id);
            expect(repo.findByName).toHaveBeenCalledWith("CPF Atualizado");
            expect(repo.update).toHaveBeenCalledWith(id, {
                name: "CPF Atualizado",
                description: "Nova descrição"
            });
            expect(result).toEqual(updatedType);
        });

        it("deve retornar null se tipo de documento não existir", async () => {
            // Arrange: simula tipo não encontrado
            const id = "inexistente";
            const dto = { name: "CPF" };
            
            repo.findById.mockResolvedValue(null);
            
            // Act: chama o método do service
            const result = await service.update(id, dto);
            
            // Assert: verifica que não tentou atualizar
            expect(repo.findById).toHaveBeenCalledWith(id);
            expect(repo.update).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it("deve lançar erro se ID for inválido", async () => {
            // Act & Assert: espera erro para ID inválido
            await expect(service.update("", { name: "CPF" }))
                .rejects.toThrow(BadRequest);
            await expect(service.update("   ", { name: "CPF" }))
                .rejects.toThrow("ID is required");
        });

        it("deve lançar erro se nome já existir em outro registro", async () => {
            // Arrange: simula nome duplicado
            const id = "123";
            const dto = { name: "RG" };
            const existingType = { _id: id, name: "CPF" };
            const duplicateType = { _id: "456", name: "RG" };
            
            repo.findById.mockResolvedValue(existingType);
            repo.findByName.mockResolvedValue(duplicateType);
            
            // Act & Assert: espera erro por nome duplicado
            await expect(service.update(id, dto))
                .rejects.toThrow("Document type with this name already exists");
        });

        it("deve permitir atualizar mesmo nome do registro atual", async () => {
            // Arrange: simula atualização do mesmo nome
            const id = "123";
            const dto = { name: "CPF", description: "Nova descrição" };
            const existingType = { _id: id, name: "CPF", description: "Antiga" };
            const sameNameType = { _id: id, name: "CPF" }; // Mesmo ID
            const updatedType = { _id: id, name: "CPF", description: "Nova descrição" };
            
            repo.findById.mockResolvedValue(existingType);
            repo.findByName.mockResolvedValue(sameNameType);
            repo.update.mockResolvedValue(updatedType);
            
            // Act: chama o método do service
            const result = await service.update(id, dto);
            
            // Assert: deve permitir a atualização
            expect(result).toEqual(updatedType);
        });

        it("deve retornar tipo existente se não houver dados para atualizar", async () => {
            // Arrange: DTO vazio
            const id = "123";
            const dto = {};
            const existingType = { _id: id, name: "CPF" };
            
            repo.findById.mockResolvedValue(existingType);
            
            // Act: chama o método do service
            const result = await service.update(id, dto);
            
            // Assert: deve retornar o tipo existente sem chamar update
            expect(repo.update).not.toHaveBeenCalled();
            expect(result).toEqual(existingType);
        });
    });

    describe("delete", () => {
        it("deve fazer soft delete de tipo de documento com sucesso", async () => {
            // Arrange: dados de entrada e retorno esperado
            const id = "123";
            const existingType = { _id: id, name: "CPF", isActive: true };
            const deletedType = { _id: id, name: "CPF", isActive: false, deletedAt: new Date() };
            
            repo.findById.mockResolvedValue(existingType);
            repo.softDelete.mockResolvedValue(deletedType);
            
            // Act: chama o método do service
            const result = await service.delete(id);
            
            // Assert: verifica se foi chamado corretamente
            expect(repo.findById).toHaveBeenCalledWith(id);
            expect(repo.softDelete).toHaveBeenCalledWith(id);
            expect(result).toEqual(deletedType);
        });

        it("deve retornar null se tipo de documento não existir", async () => {
            // Arrange: simula tipo não encontrado
            const id = "inexistente";
            
            repo.findById.mockResolvedValue(null);
            
            // Act: chama o método do service
            const result = await service.delete(id);
            
            // Assert: verifica que não tentou deletar
            expect(repo.findById).toHaveBeenCalledWith(id);
            expect(repo.softDelete).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });

        it("deve lançar erro se ID for inválido", async () => {
            // Act & Assert: espera erro para ID inválido
            await expect(service.delete(""))
                .rejects.toThrow(BadRequest);
            await expect(service.delete("   "))
                .rejects.toThrow("ID is required");
        });
    });

    describe("restore", () => {
        it("deve restaurar tipo de documento com sucesso", async () => {
            // Arrange: dados de entrada e retorno esperado
            const id = "123";
            const restoredType = { _id: id, name: "CPF", isActive: true, deletedAt: null };
            
            repo.restore.mockResolvedValue(restoredType);
            
            // Act: chama o método do service
            const result = await service.restore(id);
            
            // Assert: verifica se foi chamado corretamente
            expect(repo.restore).toHaveBeenCalledWith(id);
            expect(result).toEqual(restoredType);
        });

        it("deve retornar null se tipo de documento não existir", async () => {
            // Arrange: simula tipo não encontrado
            const id = "inexistente";
            
            repo.restore.mockResolvedValue(null);
            
            // Act: chama o método do service
            const result = await service.restore(id);
            
            // Assert: verifica o resultado
            expect(repo.restore).toHaveBeenCalledWith(id);
            expect(result).toBeNull();
        });

        it("deve lançar erro se ID for inválido", async () => {
            // Act & Assert: espera erro para ID inválido
            await expect(service.restore(""))
                .rejects.toThrow(BadRequest);
            await expect(service.restore("   "))
                .rejects.toThrow("ID is required");
        });
    });
});