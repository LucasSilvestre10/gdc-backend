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
            expect(repo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "CPF",
                    description: "Documento de identificação",
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                })
            );
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

            expect(repo.list).toHaveBeenCalled();
            const calledFilter = repo.list.mock.calls[0][0];
            expect(calledFilter).toHaveProperty("name");
            expect(calledFilter.name).toBeInstanceOf(RegExp);
            expect(calledFilter.name.source.toLowerCase()).toContain("cpf");
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
});