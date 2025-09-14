import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository.js";
import { DocumentType } from "../src/models/DocumentType.js";

/**
 * Testes Unitários - DocumentTypeRepository
 *
 *
 * Cobertura:
 *  Construtor e inicialização
 *  create() - Criação de tipos de documento
 *  update() - Atualização de tipos existentes
 *  findByName() - Busca por nome (case-insensitive)
 *  findById() - Busca por ID (apenas ativos)
 *  findByIds() - Busca múltiplos por IDs
 *  list() - Listagem paginada com filtros
 *  softDelete() - Exclusão lógica (soft delete)
 *  restore() - Restauração de tipos inativos
 *  Tratamento de erros e edge cases
 */
describe("DocumentTypeRepository", () => {
  it("deve usar toObject e extrair id via toHexString quando disponível", async () => {
    const inputDto = { name: "CNH", description: "Carteira" };

    const mockPlain = { _id: { toHexString: () => "hex-id-123" }, name: "CNH" };
    const mockCreatedDocument = {
      toObject: vi.fn().mockReturnValue(mockPlain),
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repository.create(inputDto);

    expect(mockCreatedDocument.toObject).toHaveBeenCalledWith({
      virtuals: true,
    });
    expect((result as any).id).toBe("hex-id-123");
  });

  it("deve usar toObject e extrair id quando _id for Buffer", async () => {
    const inputDto = { name: "RG", description: "Registro" };

    const buf = Buffer.from("abcd1234", "hex");
    const mockPlain = { _id: buf, name: "RG" };
    const mockCreatedDocument = {
      toObject: vi.fn().mockReturnValue(mockPlain),
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repository.create(inputDto);

    expect(mockCreatedDocument.toObject).toHaveBeenCalledWith({
      virtuals: true,
    });
    expect((result as any).id).toBe(buf.toString("hex"));
  });

  it("deve cair no fallback para toJSON quando toObject falhar", async () => {
    const inputDto = { name: "DOC", description: "Desc" };

    const mockCreatedDocument = {
      toObject: vi.fn().mockImplementation(() => {
        throw new Error("toObject failed");
      }),
      toJSON: vi.fn().mockReturnValue({ _id: "raw-id", name: "DOC" }),
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repository.create(inputDto);

    expect(mockCreatedDocument.toObject).toHaveBeenCalled();
    expect(mockCreatedDocument.toJSON).toHaveBeenCalled();
    expect((result as any)._id).toBe("raw-id");
  });

  it("deve extrair id como string quando _id for não-hex e não-buffer", async () => {
    const inputDto = { name: "TIPO", description: "Desc" };

    const mockPlain = { _id: 12345, name: "TIPO" };
    const mockCreatedDocument = {
      toObject: vi.fn().mockReturnValue(mockPlain),
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repository.create(inputDto);

    expect(mockCreatedDocument.toObject).toHaveBeenCalledWith({
      virtuals: true,
    });
    expect((result as any).id).toBe(String(12345));
  });

  it("deve definir id como undefined quando extração lançar erro", async () => {
    const inputDto = { name: "ERR", description: "Desc" };

    const badRaw = {
      toHexString: () => {
        throw new Error("boom");
      },
    };

    const mockPlain = { _id: badRaw, name: "ERR" };
    const mockCreatedDocument = {
      toObject: vi.fn().mockReturnValue(mockPlain),
    };

    mockModel.create.mockResolvedValue(mockCreatedDocument);

    const result = await repository.create(inputDto);

    // Quando a extração falha, id deve ser undefined conforme catch
    expect((result as any).id).toBeUndefined();
  });
  let repository: DocumentTypeRepository;
  let mockMongooseService: any;
  let mockModel: any;

  beforeEach(() => {
    // Configuração de method chaining para consultas
    const mockQuery = {
      exec: vi.fn(),
      skip: vi.fn(),
      limit: vi.fn(),
      lean: vi.fn(),
    };

    // Configura o method chaining
    mockQuery.skip.mockReturnValue(mockQuery);
    mockQuery.limit.mockReturnValue(mockQuery);
    mockQuery.lean.mockReturnValue(mockQuery);
    mockQuery.exec.mockResolvedValue([]);

    // Mock separado para countDocuments
    const mockCountQuery = {
      exec: vi.fn().mockResolvedValue(0),
    };

    // Mock separado para findOneAndUpdate
    const mockUpdateQuery = {
      exec: vi.fn().mockResolvedValue(null),
    };

    // Criação do mock completo do Mongoose Model
    mockModel = {
      create: vi.fn(),
      findOne: vi.fn().mockReturnValue(mockQuery),
      findOneAndUpdate: vi.fn().mockReturnValue(mockUpdateQuery),
      find: vi.fn().mockReturnValue(mockQuery),
      countDocuments: vi.fn().mockReturnValue(mockCountQuery),
      schema: {
        paths: {
          name: { type: "String" },
          description: { type: "String" },
        },
      },
    };

    // Mock do MongooseService
    mockMongooseService = {
      get: vi.fn().mockReturnValue({
        model: vi.fn().mockReturnValue(mockModel),
      }),
    };

    // Cria a instância do repository
    repository = new DocumentTypeRepository(mockMongooseService);
  });

  describe("Construtor e inicialização", () => {
    // O que será feito: instanciar o repository e confirmar que o serviço
    // do Mongoose foi consultado para retornar o modelo necessário.
    it("deve ser criado corretamente e obter o modelo do MongooseService", () => {
      // Espera: o repository está definido após a instanciação
      // Verifica também que o MongooseService.get foi chamado para obter o model
      expect(repository).toBeDefined();
      // Verifica chamada ao serviço de mongoose
      expect(mockMongooseService.get).toHaveBeenCalled();
    });
  });

  describe("create - Criação de Tipo de Documento", () => {
    // O que será feito: chamar repository.create com dados válidos e garantir
    // que o documento é criado, convertido para JSON e retornado.
    it("deve criar um tipo de documento com sucesso", async () => {
      // Espera: o model.create é invocado com o payload completo
      // e o objeto criado é convertido via toJSON e retornado pelo repo
      // Arrange: dados de entrada e resposta esperada
      const inputDto = {
        name: "CPF",
        description: "Cadastro de Pessoa Física",
      };

      const expectedResult = {
        _id: "generated-id",
        name: "CPF",
        description: "Cadastro de Pessoa Física",
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      const mockCreatedDocument = {
        toJSON: vi.fn().mockReturnValue(expectedResult),
      };

      mockModel.create.mockResolvedValue(mockCreatedDocument);

      // Act: executa a criação
      const result = await repository.create(inputDto);

      // Assert: verifica resultado e calls
      // Verifica que o model.create recebeu o payload esperado (nome, description e timestamps)
      expect(mockModel.create).toHaveBeenCalledWith({
        name: inputDto.name,
        description: inputDto.description,
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });

      // Espera: o método toJSON do documento é utilizado para produzir o retorno final
      // Verifica que toJSON foi chamado
      expect(mockCreatedDocument.toJSON).toHaveBeenCalled();
      // Verifica que o resultado retornado pelo repositório é o esperado
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: criar um tipo sem description e garantir que o repositório
    // define description como string vazia antes de criar.
    it("deve usar string vazia para description quando não fornecida", async () => {
      // Espera: create é chamado com description igual a string vazia
      // Arrange: entrada sem description
      const inputDto = { name: "RG" };

      const mockCreatedDocument = {
        toJSON: vi.fn().mockReturnValue({ _id: "id", name: "RG" }),
      };

      mockModel.create.mockResolvedValue(mockCreatedDocument);

      // Act: executar criação
      await repository.create(inputDto);

      // Assert: verifica que description foi definida como string vazia
      // Verifica payload de criação com description vazia
      expect(mockModel.create).toHaveBeenCalledWith({
        name: "RG",
        description: "",
        isActive: true,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    // O que será feito: simular erro de validação do Mongoose e garantir que o repositório propaga.
    it("deve propagar erro de validação do Mongoose", async () => {
      // Espera: a chamada ao create rejeita e o erro é propagado para quem chamou
      // Arrange: configura erro de validação
      const validationError = new Error("Validation failed");
      mockModel.create.mockRejectedValue(validationError);

      const inputDto = { name: "Invalid" };

      // Act & Assert: verifica que erro é propagado
      // Verifica que a promise rejeita com o erro de validação definido
      await expect(repository.create(inputDto)).rejects.toThrow(
        "Validation failed"
      );
      // Verifica que o model.create foi chamado antes da propagação do erro
      expect(mockModel.create).toHaveBeenCalled();
    });

    // O que será feito: forçar erro em create e garantir que o erro e o schema do model sejam logados
    it("deve logar erro e schema quando falhar", async () => {
      // Espera: console.error é chamado com a mensagem de erro e o schema para diagnóstico
      // Arrange: mock do console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testError = new Error("Database error");
      mockModel.create.mockRejectedValue(testError);

      // Act
      try {
        await repository.create({ name: "Test" });
      } catch (error) {
        // Expected to throw
      }

      // Assert: verifica logs de erro
      // Verifica que o erro foi logado com a mensagem correta para facilitar diagnóstico
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "DocumentTypeRepository.create - Error:",
        testError
      );
      // Verifica que o schema do modelo também foi logado
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "DocumentTypeRepository.create - Model schema:",
        mockModel.schema.paths
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("update - Atualização de Tipo de Documento", () => {
    // O que será feito: atualizar um tipo de documento ativo usando update() e garantir retorno atualizado
    it("deve atualizar tipo de documento ativo com sucesso", async () => {
      // Espera: findOneAndUpdate é chamado com filtro que exclui inativos e retorna o documento atualizado
      // Arrange
      const id = "document-type-id";
      const updateDto = {
        name: "CPF Atualizado",
        description: "Nova descrição",
      };

      const expectedResult = {
        _id: id,
        ...updateDto,
        isActive: true,
        updatedAt: expect.any(Date),
      };

      mockModel.findOneAndUpdate.mockResolvedValue(expectedResult);

      // Act
      const result = await repository.update(id, updateDto);

      // Assert
      // Verifica que findOneAndUpdate recebeu o filtro correto e o payload com updatedAt
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateDto, updatedAt: expect.any(Date) },
        { new: true }
      );
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: simular tentativa de update em registro inexistente e garantir retorno null
    it("deve retornar null para tipo de documento não encontrado ou inativo", async () => {
      // Espera: update retorna null quando não há documento ativo para atualizar
      // Arrange: mock retorna null (não encontrado)
      mockModel.findOneAndUpdate.mockResolvedValue(null);

      // Act
      const result = await repository.update("non-existent-id", {
        name: "Test",
      });

      // Assert
      // Verifica explicitamente que o repositório retorna null
      expect(result).toBeNull();
    });

    // O que será feito: verificar que updatedAt é automaticamente adicionado ao payload durante update
    it("deve adicionar timestamp de atualização automaticamente", async () => {
      // Espera: updatedAt é inserido no payload enviado ao findOneAndUpdate
      // Arrange
      const id = "test-id";
      const updateData = { name: "Updated Name" };
      mockModel.findOneAndUpdate.mockResolvedValue({});

      // Act
      await repository.update(id, updateData);

      // Assert: verifica que updatedAt foi adicionado
      // Verifica o segundo argumento da atualização contém updatedAt
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        { ...updateData, updatedAt: expect.any(Date) },
        { new: true }
      );
    });
  });

  describe("findByName - Busca por Nome", () => {
    // O que será feito: consultar por nome usando case-insensitive e trimming; validar retorno
    it("deve buscar tipo de documento por nome (case-insensitive)", async () => {
      // Espera: findOne chamado com RegExp que ignora case e com filtro de ativo
      // Arrange
      const mockQuery = { exec: vi.fn() };
      const expectedResult = { _id: "id", name: "CPF", isActive: true };

      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findByName("cpf");

      // Assert: verifica busca case-insensitive e filtro de ativo
      // Verifica que findOne foi chamado com regex case-insensitive e filtro 'isActive'
      expect(mockModel.findOne).toHaveBeenCalledWith({
        name: new RegExp("^cpf$", "i"),
        isActive: { $ne: false },
      });
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: fornecer nome com espaços e verificar trim antes da busca
    it("deve fazer trim do nome antes da busca", async () => {
      // Espera: espaços são removidos antes de criar a regex
      // Arrange
      const mockQuery = { exec: vi.fn() };
      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(null);

      // Act
      await repository.findByName("  CPF  ");

      // Assert: verifica que trim foi aplicado
      // Verifica que o nome foi trimmed antes de criar a regex
      expect(mockModel.findOne).toHaveBeenCalledWith({
        name: new RegExp("^CPF$", "i"),
        isActive: { $ne: false },
      });
    });

    it("deve retornar null para nome vazio ou apenas espaços", async () => {
      // Act & Assert: testa diferentes casos de nomes inválidos
      // Verifica que o repositório retorna null sem invocar o modelo
      expect(await repository.findByName("")).toBeNull();
      expect(await repository.findByName("   ")).toBeNull();
      expect(await repository.findByName(null as any)).toBeNull();
      expect(await repository.findByName(undefined as any)).toBeNull();

      // Verifica que o modelo não foi chamado para entradas inválidas
      expect(mockModel.findOne).not.toHaveBeenCalled();
    });

    it("deve retornar null quando tipo não encontrado", async () => {
      // Arrange: query retorna null quando não existe
      const mockQuery = { exec: vi.fn() };
      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(null);

      // Act
      const result = await repository.findByName("Inexistente");

      // Assert: espera null quando não encontrado
      expect(result).toBeNull();
    });
  });

  describe("findById - Busca por ID", () => {
    // O que será feito: buscar por ID assegurando retorno apenas para documentos ativos
    it("deve buscar tipo de documento ativo por ID", async () => {
      // Espera: findOne é chamado com filtro que exclui documentos marcados como inativos
      // Arrange
      const id = "document-type-id";
      const mockQuery = { exec: vi.fn() };
      const expectedResult = { _id: id, name: "CPF", isActive: true };

      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(expectedResult);

      // Act
      const result = await repository.findById(id);

      // Assert: verifica filtro de ativo e execução da query
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false },
      });
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: simular ID inexistente e garantir retorno null
    it("deve retornar null para ID não encontrado", async () => {
      // Arrange: query retorna null quando ID não existe
      const mockQuery = { exec: vi.fn() };
      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(null);

      // Act
      const result = await repository.findById("non-existent-id");

      // Assert: espera null para ID não encontrado
      expect(result).toBeNull();
    });

    // O que será feito: garantir que findById aplica filtro de ativos
    it("deve filtrar apenas tipos de documento ativos", async () => {
      // Arrange: prepara query vazia
      const id = "test-id";
      const mockQuery = { exec: vi.fn() };
      mockModel.findOne.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(null);

      // Act
      await repository.findById(id);

      // Assert: verifica que o filtro para findById inclui isActive !== false
      expect(mockModel.findOne).toHaveBeenCalledWith({
        _id: id,
        isActive: { $ne: false },
      });
    });
  });

  describe("findByIds - Busca Múltipla por IDs", () => {
    // O que será feito: buscar múltiplos IDs, garantindo que o filtro usa $in e exclui inativos
    it("deve buscar múltiplos tipos de documento por IDs", async () => {
      // Espera: find é chamado com _id: { $in: ids } e filtro de isActive
      // Arrange
      const ids = ["id1", "id2", "id3"];
      const mockQuery = { exec: vi.fn() };
      const expectedResults = [
        { _id: "id1", name: "CPF", isActive: true },
        { _id: "id2", name: "RG", isActive: true },
      ];

      mockModel.find.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue(expectedResults);

      // Act
      const result = await repository.findByIds(ids);

      // Assert: verifica que find foi chamado com $in nos ids e filtro de ativo
      expect(mockModel.find).toHaveBeenCalledWith({
        _id: { $in: ids },
        isActive: { $ne: false },
      });
      expect(mockQuery.exec).toHaveBeenCalled();
      expect(result).toEqual(expectedResults);
    });

    // O que será feito: simular busca sem resultados e garantir array vazio
    it("deve retornar array vazio quando nenhum ID encontrado", async () => {
      // Espera: retorna [] quando não há resultados
      // Arrange
      const mockQuery = { exec: vi.fn() };
      mockModel.find.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue([]);

      // Act
      const result = await repository.findByIds(["invalid-id"]);

      // Assert: verifica retorno vazio
      expect(result).toEqual([]);
    });

    // O que será feito: garantir que busca múltipla filtra somente ativos
    it("deve filtrar apenas tipos de documento ativos", async () => {
      // Espera: find utiliza $in e filtra por isActive !== false
      // Arrange
      const ids = ["id1", "id2"];
      const mockQuery = { exec: vi.fn() };
      mockModel.find.mockReturnValue(mockQuery);
      mockQuery.exec.mockResolvedValue([]);

      // Act
      await repository.findByIds(ids);

      // Assert: verifica filtro de ativo
      expect(mockModel.find).toHaveBeenCalledWith({
        _id: { $in: ids },
        isActive: { $ne: false },
      });
    });
  });

  describe("list - Listagem Paginada", () => {
    beforeEach(() => {
      // Configuração específica para list() que usa method chaining
      const mockQuery = {
        exec: vi.fn(),
        skip: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn(),
      };

      mockQuery.skip.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockQuery.lean.mockReturnValue(mockQuery);

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockReturnValue({ exec: vi.fn() });
    });

    // O que será feito: listar com paginação padrão e verificar valores default e formato de retorno
    it("deve listar tipos de documento com paginação padrão", async () => {
      // Espera: find com { isActive: true }, skip 0, limit 10 e retorno com items e total
      // Arrange
      const mockItems = [
        { _id: "id1", name: "CPF", isActive: true },
        { _id: "id2", name: "RG", isActive: true },
      ];

      // Configura mocks
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(mockItems);
      mockModel.countDocuments().exec.mockResolvedValue(2);

      // Act
      const result = await repository.list();

      // Assert: validações de paginação e retorno
      expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });
      // Verifica cálculo de skip para page padrão (1)
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      // Verifica limite padrão (10)
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      // Verifica que lean foi chamado para retornar objetos simples
      expect(mockQuery.lean).toHaveBeenCalled();
      // Verifica o formato de retorno contendo items e total
      expect(result).toEqual({
        items: mockItems,
        total: 2,
      });
    });

    // O que será feito: testar paginação customizada (page e limit) e checar skip/limit
    it("deve aplicar paginação personalizada", async () => {
      // Espera: skip e limit são calculados conforme options passadas
      // Arrange
      const options = { page: 3, limit: 5 };
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act
      await repository.list({}, options);

      // Assert: page 3 com limit 5 = skip 10
      expect(mockQuery.skip).toHaveBeenCalledWith(10);
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
    });

    // O que será feito: aplicar filtro por nome parcial (case-insensitive) e verificar regex
    it("deve aplicar filtro de nome (case-insensitive e parcial)", async () => {
      // Espera: o campo name no filtro transformado em RegExp com flag 'i'
      // Arrange
      const filter = { name: "CPF" };
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act
      await repository.list(filter);

      // Assert: verifica filtro de nome como regex
      expect(mockModel.find).toHaveBeenCalledWith({
        name: new RegExp("CPF", "i"),
        isActive: true,
      });
    });

    // O que será feito: verificar comportamento do filtro status (active|inactive|all) e seus mapeamentos
    it("deve filtrar por status (active, inactive, all)", async () => {
      // Espera: cada status mapeia corretamente para filtro isActive
      // Arrange
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act & Assert: testa diferentes status
      // Status active -> isActive true
      await repository.list({ status: "active" });
      expect(mockModel.find).toHaveBeenCalledWith({ isActive: true });

      // Status inactive -> isActive false
      await repository.list({ status: "inactive" });
      expect(mockModel.find).toHaveBeenCalledWith({ isActive: false });

      // Status all -> sem filtro de isActive
      await repository.list({ status: "all" });
      expect(mockModel.find).toHaveBeenCalledWith({});
    });

    // O que será feito: passar filtro com undefined e garantir que seja removido (null mantido)
    it("deve ignorar filtros com valores undefined", async () => {
      // Espera: undefined são removidos; null permanece no filtro
      // Arrange
      const filter = {
        name: "CPF",
        description: undefined,
        someField: null,
      };
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act
      await repository.list(filter);

      // Assert: apenas name e campos válidos permanecem
      expect(mockModel.find).toHaveBeenCalledWith({
        name: new RegExp("CPF", "i"),
        someField: null,
        isActive: true,
      });
    });

    // O que será feito: garantir que valores padrão de paginação sejam aplicados quando não fornecidos
    it("deve usar valores padrão para paginação quando não fornecidos", async () => {
      // Espera: page padrão 1 -> skip 0; limit padrão 10
      // Arrange
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act: não passa options
      await repository.list({});

      // Assert: usa padrões page=1, limit=10
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });

    // O que será feito: passar page/limit inválidos e garantir que mínimos sejam aplicados
    it("deve garantir valores mínimos para page e limit", async () => {
      // Espera: page mínimo 1 e limit mínimo 1 são utilizados quando valores inválidos fornecidos
      // Arrange
      const options = { page: -1, limit: 0 };
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue([]);
      mockModel.countDocuments().exec.mockResolvedValue(0);

      // Act
      await repository.list({}, options);

      // Assert: valores mínimos aplicados
      expect(mockQuery.skip).toHaveBeenCalledWith(0); // page 1
      expect(mockQuery.limit).toHaveBeenCalledWith(1); // limit mínimo 1
    });

    // O que será feito: simular ausência de dados (null) e garantir retorno consistente (normalização)
    it("deve retornar arrays vazios quando não há dados", async () => {
      // Espera: quando find/count retornam null, retorna { items: [], total: 0 }
      // Arrange
      const mockQuery = mockModel.find();
      mockQuery.exec.mockResolvedValue(null); // Simula retorno null
      mockModel.countDocuments().exec.mockResolvedValue(null);

      // Act
      const result = await repository.list();

      // Assert: normalização de null para arrays vazios
      expect(result).toEqual({
        items: [],
        total: 0,
      });
    });

    // O que será feito: forçar erro em find() e verificar que é propagado e logado
    it("deve tratar erro durante listagem e logar", async () => {
      // Espera: exceção é lançada e console.error é chamado com o erro
      // Arrange
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const testError = new Error("Database connection error");
      mockModel.find.mockImplementation(() => {
        throw testError;
      });

      // Act & Assert: verifica propagação e log
      await expect(repository.list()).rejects.toThrow(
        "Database connection error"
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "DocumentTypeRepository.list - Error:",
        testError
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("softDelete - Exclusão Lógica", () => {
    // O que será feito: marcar registro como inativo (soft delete) e verificar campos adicionados
    it("deve marcar tipo de documento como inativo com sucesso", async () => {
      // Espera: findOneAndUpdate recebe isActive false, deletedAt e updatedAt
      // Arrange
      const id = "document-type-id";
      const expectedResult = {
        _id: id,
        name: "CPF",
        isActive: false,
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      // Configura mock específico para este teste
      const mockUpdateQuery = {
        exec: vi.fn().mockResolvedValue(expectedResult),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      const result = await repository.softDelete(id);

      // Assert: verifica chamada e retorno esperado
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id, isActive: { $ne: false } },
        {
          isActive: false,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: softDelete em id inexistente deve retornar null
    it("deve retornar null para tipo de documento não encontrado ou já inativo", async () => {
      // Espera: repositório retorna null quando não há registro
      // Arrange
      const mockUpdateQuery = { exec: vi.fn().mockResolvedValue(null) };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      const result = await repository.softDelete("non-existent-id");

      // Assert: espera null quando não existe
      expect(result).toBeNull();
    });

    // O que será feito: garantir que timestamps são adicionados no update de softDelete
    it("deve adicionar timestamps de deleção e atualização", async () => {
      // Espera: updateData enviado ao findOneAndUpdate contém deletedAt e updatedAt
      // Arrange
      const id = "test-id";
      const mockUpdateQuery = { exec: vi.fn().mockResolvedValue({}) };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      await repository.softDelete(id);

      // Assert: verifica timestamps adicionados
      const [, updateData] = mockModel.findOneAndUpdate.mock.calls[0];
      expect(updateData).toEqual({
        isActive: false,
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe("restore - Restauração de Tipo de Documento", () => {
    // O que será feito: restaurar um tipo inativo e garantir limpeza de deletedAt e isActive true
    it("deve restaurar tipo de documento inativo com sucesso", async () => {
      // Espera: findOneAndUpdate chamado com _id e payload que define isActive true e deletedAt null
      // Arrange
      const id = "document-type-id";
      const expectedResult = {
        _id: id,
        name: "CPF",
        isActive: true,
        deletedAt: null,
        updatedAt: expect.any(Date),
      };

      const mockUpdateQuery = {
        exec: vi.fn().mockResolvedValue(expectedResult),
      };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      const result = await repository.restore(id);

      // Assert: verifica chamada e retorno do restore
      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: id }, // Não filtra por isActive para permitir restaurar
        {
          isActive: true,
          deletedAt: null,
          updatedAt: expect.any(Date),
        },
        { new: true }
      );
      expect(result).toEqual(expectedResult);
    });

    // O que será feito: restaurar id inexistente e garantir retorno null
    it("deve retornar null para tipo de documento não encontrado", async () => {
      // Espera: retorna null quando não há documento a restaurar
      // Arrange
      const mockUpdateQuery = { exec: vi.fn().mockResolvedValue(null) };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      const result = await repository.restore("non-existent-id");

      // Assert: espera null quando não existe
      expect(result).toBeNull();
    });

    // O que será feito: garantir que restore não filtra por isActive para permitir restaurar inativos
    it("deve não filtrar por isActive para permitir restaurar inativos", async () => {
      // Espera: o filtro usado em findOneAndUpdate não contém isActive
      // Arrange
      const id = "inactive-document-type";
      const mockUpdateQuery = { exec: vi.fn().mockResolvedValue({}) };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      await repository.restore(id);

      // Assert: verifica que o filtro usado para restore não contém isActive
      const [filter] = mockModel.findOneAndUpdate.mock.calls[0];
      expect(filter).toEqual({ _id: id });
      expect(filter).not.toHaveProperty("isActive");
    });

    // O que será feito: restaurar e garantir que deletedAt é limpo e isActive marcado
    it("deve limpar deletedAt e marcar como ativo", async () => {
      // Espera: updateData contém isActive true, deletedAt null e updatedAt
      // Arrange
      const id = "test-id";
      const mockUpdateQuery = { exec: vi.fn().mockResolvedValue({}) };
      mockModel.findOneAndUpdate.mockReturnValue(mockUpdateQuery);

      // Act
      await repository.restore(id);

      // Assert: verifica dados de restauração (payload enviado ao findOneAndUpdate)
      const [, updateData] = mockModel.findOneAndUpdate.mock.calls[0];
      expect(updateData).toEqual({
        isActive: true,
        deletedAt: null,
        updatedAt: expect.any(Date),
      });
    });
  });

  describe("Cenários de erro e edge cases", () => {
    // O que será feito: simular erro de conexão do MongoDB durante create e verificar propagação
    it("deve lidar com erro de conexão do MongoDB durante criação", async () => {
      // Espera: erro de conexão é propagado para quem chama o create
      // Arrange
      const connectionError = new Error("MongoDB connection timeout");
      mockModel.create.mockRejectedValue(connectionError);

      // Act & Assert: verifica propagação do erro de conexão
      await expect(repository.create({ name: "Test" })).rejects.toThrow(
        "MongoDB connection timeout"
      );
    });

    // O que será feito: passar filtro complexo e verificar preparo do filtro
    it("deve processar corretamente filtros complexos no método list", async () => {
      // Esperado: name trimado, status mapeado para isActive e undefined removido
      // Arrange
      const complexFilter = {
        name: "  CPF  ", // será trimmed e convertido para regex
        status: "active", // será convertido para isActive: true
        customField: "customValue", // será mantido como está
        undefinedField: undefined, // será removido
      };

      const mockQuery = {
        exec: vi.fn().mockResolvedValue([]),
        skip: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn(),
      };
      mockQuery.skip.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockQuery.lean.mockReturnValue(mockQuery);

      const mockCountQuery = { exec: vi.fn().mockResolvedValue(0) };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockReturnValue(mockCountQuery);

      // Act
      await repository.list(complexFilter);

      // Assert
      // Verifica que filtros complexos são processados corretamente
      expect(mockModel.find).toHaveBeenCalledWith({
        name: new RegExp("CPF", "i"),
        isActive: true,
        customField: "customValue",
      });
    });

    // O que será feito: aplicar paginação extrema e checar cálculo de skip
    it("deve manter paginação consistente mesmo com valores extremos", async () => {
      // Esperado: cálculo do skip resulta em (page-1)*limit
      // Arrange
      const extremeOptions = { page: 999999, limit: 1 };

      const mockQuery = {
        exec: vi.fn().mockResolvedValue([]),
        skip: vi.fn(),
        limit: vi.fn(),
        lean: vi.fn(),
      };
      mockQuery.skip.mockReturnValue(mockQuery);
      mockQuery.limit.mockReturnValue(mockQuery);
      mockQuery.lean.mockReturnValue(mockQuery);

      const mockCountQuery = { exec: vi.fn().mockResolvedValue(0) };

      mockModel.find.mockReturnValue(mockQuery);
      mockModel.countDocuments.mockReturnValue(mockCountQuery);

      // Act
      await repository.list({}, extremeOptions);

      // Assert: cálculo correto do skip mesmo com valores grandes
      // Verifica cálculo do skip para paginação extrema
      const expectedSkip = (999999 - 1) * 1;
      expect(mockQuery.skip).toHaveBeenCalledWith(expectedSkip);
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });
  });
});
