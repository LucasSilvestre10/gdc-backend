import { Controller } from "@tsed/di";
import { Get, Post, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description, Example } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { BadRequest, NotFound, Conflict, UnprocessableEntity } from "@tsed/exceptions";
import { ResponseHandler } from "../../middleware/ResponseHandler";
import { 
  CreateDocumentTypeDto, 
  UpdateDocumentTypeDto 
} from "../../dtos/documentTypeDTO.js";
import { DocumentTypeService } from "../../services/DocumentTypeService.js";

/**
 * Controller responsável por gerenciar os tipos de documento.
 * 
 * Endpoints:
 * - POST /document-types: Cria um novo tipo de documento.
 * - GET /document-types: Lista todos os tipos de documento com paginação opcional.
 * - GET /document-types/:id: Busca um tipo de documento pelo ID.
 * - GET /document-types/:id/employees: Lista colaboradores vinculados ao tipo de documento.
 * 
 * Métodos update e delete estão planejados para implementação futura.
 */
@Controller("/document-types")
export class DocumentTypesController {
  constructor(
    @Inject() private documentTypeService: DocumentTypeService
  ) {}

  /**
   * Cria um novo tipo de documento.
   * @route POST /document-types
   * @body CreateDocumentTypeDto
   * @returns 201 - Tipo de documento criado com sucesso
   * @returns 400 - Erro de validação
   */
  @Post("/")
  @Summary("Criar novo tipo de documento")
  @Description("Cria um novo tipo de documento no sistema")
  @Returns(201, Object)
  @Returns(400, Object)
  @Returns(409, Object)
  @Example({
    name: "CPF",
    description: "Cadastro de Pessoa Física"
  })
  async create(@BodyParams() createDto: CreateDocumentTypeDto) {
    const documentType = await this.documentTypeService.create(createDto);
    return ResponseHandler.success(documentType, "Tipo de documento criado com sucesso");
  }



  /**
   * Lista todos os tipos de documento com paginação e filtros.
   * @route GET /document-types
   * @query page (número da página - padrão: 1)
   * @query limit (itens por página - padrão: 10)
   * @query name (filtro por nome - busca parcial case-insensitive)
   * @query status (filtro status: "active" | "inactive" | "all" - padrão: "active")
   * @returns 200 - Lista paginada de tipos de documento
   */
  @Get("/")
  @Summary("Listar tipos de documento")
  @Description("Lista tipos de documento com filtros: name (busca parcial), status (active/inactive/all). Por padrão retorna apenas registros ativos.")
  @Returns(200, Array)
  @Example({
    success: true,
    data: [
      {
        _id: "507f1f77bcf86cd799439011",
        name: "CPF",
        description: "Cadastro de Pessoa Física",
        isActive: true,
        createdAt: "2023-07-21T10:30:00.000Z",
        updatedAt: "2023-07-21T10:30:00.000Z"
      }
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1
    }
  })
  async list(
    @QueryParams("page") page: number = 1,
    @QueryParams("limit") limit: number = 10,
    @QueryParams("name") name?: string,
    @QueryParams("status") status?: 'active' | 'inactive' | 'all'
  ) {
    // Define "active" como padrão se nenhum status for fornecido
    const defaultStatus = status || 'active';
    
    const result = await this.documentTypeService.list(
      { name, status: defaultStatus },
      { page, limit }
    );
    
    return {
      success: true,
      data: result.items,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit)
      }
    };
  }

  /**
   * Busca um tipo de documento pelo ID.
   * @route GET /document-types/:id
   * @param id (identificador do tipo de documento)
   * @returns 200 - Tipo de documento encontrado
   * @returns 404 - Tipo de documento não encontrado
   */
  @Get("/:id")
  @Summary("Buscar tipo de documento por ID")
  @Description("Retorna os dados de um tipo de documento específico")
  @Returns(200, Object)
  @Returns(404, Object)
  @Returns(400, Object)
  async findById(@PathParams("id") id: string) {
    const documentType = await this.documentTypeService.findById(id);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(documentType, "Tipo de documento encontrado com sucesso");
  }


  /**
   * Atualiza dados de um tipo de documento.
   * @route PUT /document-types/:id
   * @param id (identificador do tipo de documento)
   * @body UpdateDocumentTypeDto
   * @returns 200 - Tipo de documento atualizado com sucesso
   * @returns 404 - Tipo de documento não encontrado
   * @returns 400 - Erro de validação (nome duplicado)
   */
  @Put("/:id")
  @Summary("Atualizar tipo de documento")
  @Description("Atualiza os dados de um tipo de documento")
  @Returns(200, Object)
  @Returns(404, Object)
  @Returns(400, Object)
  @Returns(409, Object)
  @Example({
    name: "RG",
    description: "Registro Geral"
  })
  async update(
    @PathParams("id") id: string,
    @BodyParams() updateDto: UpdateDocumentTypeDto
  ) {
    const documentType = await this.documentTypeService.update(id, updateDto);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(documentType, "Tipo de documento atualizado com sucesso");
  }

  /**
   * Remove um tipo de documento (soft delete).
   * @route DELETE /document-types/:id
   * @param id (identificador do tipo de documento)
   * @returns 200 - Tipo de documento removido com sucesso
   * @returns 404 - Tipo de documento não encontrado
   */
  @Delete("/:id")
  @Summary("Remover tipo de documento")
  @Description("Remove um tipo de documento do sistema (soft delete)")
  @Returns(200, Object)
  @Returns(404, Object)
  @Returns(400, Object)
  async delete(@PathParams("id") id: string) {
    const deleted = await this.documentTypeService.delete(id);
    if (!deleted) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(deleted, "Tipo de documento removido com sucesso");
  }

  /**
   * Reativa um tipo de documento.
   * @route POST /document-types/:id/restore
   * @param id (identificador do tipo de documento)
   * @returns 200 - Tipo de documento reativado com sucesso
   * @returns 404 - Tipo de documento não encontrado
   */
  @Post("/:id/restore")
  @Summary("Reativar tipo de documento")
  @Description("Reativa um tipo de documento desativado")
  @Returns(200, Object)
  @Returns(404, Object)
  @Returns(400, Object)
  async restore(@PathParams("id") id: string) {
    const restored = await this.documentTypeService.restore(id);
    if (!restored) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(restored, "Tipo de documento reativado com sucesso");
  }

  /**
   * Lista colaboradores vinculados ao tipo de documento.
   * @route GET /document-types/:id/employees
   * @param id (identificador do tipo de documento)
   * @returns 200 - Lista de colaboradores vinculados
   * @returns 404 - Tipo de documento não encontrado
   */
  @Get("/:id/employees")
  @Summary("Listar colaboradores vinculados ao tipo de documento")
  @Description("Retorna todos os colaboradores que têm este tipo de documento como obrigatório")
  @Returns(200, Array)
  @Returns(404, Object)
  @Returns(400, Object)
  async getLinkedEmployees(@PathParams("id") id: string) {
    // Verificar se o tipo de documento existe
    const documentType = await this.documentTypeService.findById(id);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }

    // Por enquanto retorna array vazio - será implementado quando tivermos o método no service
    return ResponseHandler.success([], "Método será implementado no próximo commit");
  }
}
