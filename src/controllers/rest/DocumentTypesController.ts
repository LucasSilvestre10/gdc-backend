import { Controller } from "@tsed/di";
import { Get, Post, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description, Example } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { ResponseHandler } from "../../middleware/ResponseHandler";
import { PaginationUtils } from "../../utils/PaginationUtils";
import {
  CreateDocumentTypeDto,
  DocumentTypeResponseDto,
  UpdateDocumentTypeDto,
} from "../../dtos/documentTypeDTO.js";
import { PaginatedResponseDto } from "../../dtos/paginationDTO";
import {
  DOC_TYPE_CREATE_DESCRIPTION,
  DOC_TYPE_CREATE_EXAMPLE,
  DOC_TYPE_CREATE_RESPONSE_EXAMPLE,
  DOC_TYPE_LIST_DESCRIPTION,
  DOC_TYPE_LIST_QUERY_PARAMS,
  DOC_TYPE_LIST_EXAMPLE,
  DOC_TYPE_GET_BY_ID_DESCRIPTION,
  DOC_TYPE_GET_BY_ID_EXAMPLE,
  DOC_TYPE_UPDATE_DESCRIPTION,
  DOC_TYPE_UPDATE_EXAMPLE,
  DOC_TYPE_UPDATE_EXAMPLE_RESPONSE,
  DOC_TYPE_DELETE_DESCRIPTION,
  DOC_TYPE_DELETE_EXAMPLE,
  DOC_TYPE_RESTORE_DESCRIPTION,
  DOC_TYPE_RESTORE_EXAMPLE,
  DOC_TYPE_LINKED_EMPLOYEES_DESCRIPTION,
  DOC_TYPE_LINKED_EMPLOYEES_QUERY_PARAMS,
  DOC_TYPE_LINKED_EMPLOYEES_EXAMPLE,
} from "../../docs/swagger/documentTypes";

import { DocumentTypeService } from "../../services/DocumentTypeService.js";
import { DOC_TYPE_OBJECT_ID_DESCRIPTION } from "../../docs/swagger/common";

/**
 * Controller responsável por gerenciar os tipos de documento.
 *
 * Implementa operações CRUD completas seguindo padrões REST:
 * - POST /document-types: Cria um novo tipo de documento
 * - GET /document-types: Lista todos os tipos com paginação e filtros
 * - GET /document-types/:id: Busca um tipo específico por ID
 * - PUT /document-types/:id: Atualiza um tipo de documento
 * - DELETE /document-types/:id: Remove um tipo (soft delete)
 * - POST /document-types/:id/restore: Restaura um tipo removido
 * - GET /document-types/:id/employees: Lista colaboradores vinculados
 *
 * @route /document-types
 * @controller DocumentTypesController
 * @version 1.0.0
 */
@Controller("/document-types")
export class DocumentTypesController {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_STATUS = "active";

  constructor(@Inject() private documentTypeService: DocumentTypeService) {}

  /**
   * Cria um novo tipo de documento.
   * @route POST /document-types
   * @body CreateDocumentTypeDto
   * @returns 201 - Tipo de documento criado com sucesso
   * @returns 400 - Erro de validação
   */
  @Post("/")
  @Summary("Criar novo tipo de documento")
  @Description(DOC_TYPE_CREATE_DESCRIPTION)
  @Example(DOC_TYPE_CREATE_RESPONSE_EXAMPLE)
  @Returns(201, DocumentTypeResponseDto)
  @Returns(400)
  @Returns(409)
  async create(
    @Example(DOC_TYPE_CREATE_EXAMPLE)
    @BodyParams()
    createDto: CreateDocumentTypeDto
  ) {
    const documentType = await this.documentTypeService.create(createDto);
    return ResponseHandler.success(
      documentType,
      "Tipo de documento criado com sucesso"
    );
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
  @Description(`${DOC_TYPE_LIST_DESCRIPTION}\n\n${DOC_TYPE_LIST_QUERY_PARAMS}`)
  @Example(DOC_TYPE_LIST_EXAMPLE)
  @Returns(200, PaginatedResponseDto)
  async list(
    @QueryParams("page") page: number = DocumentTypesController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentTypesController.DEFAULT_LIMIT,
    @QueryParams("name") name?: string,
    @QueryParams("status") status?: "active" | "inactive" | "all"
  ) {
    const filters = {
      name,
      status: status || DocumentTypesController.DEFAULT_STATUS,
    };
    const options = {
      page: page ?? DocumentTypesController.DEFAULT_PAGE,
      limit: limit ?? DocumentTypesController.DEFAULT_LIMIT,
    };

    const result = await this.documentTypeService.list(filters, options);

    // Validar paginação
    PaginationUtils.validatePage(options.page, result.total, options.limit);

    return ResponseHandler.success(
      PaginationUtils.createPaginatedResult(
        result.items,
        options.page,
        options.limit,
        result.total
      ),
      "Tipos de documento listados com sucesso"
    );
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
  @Description(DOC_TYPE_GET_BY_ID_DESCRIPTION)
  @Example(DOC_TYPE_GET_BY_ID_EXAMPLE)
  @Returns(200, DocumentTypeResponseDto)
  @Returns(404)
  @Returns(400)
  async findById(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION) @PathParams("id") id: string
  ) {
    const documentType = await this.documentTypeService.findById(id);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(
      documentType,
      "Tipo de documento encontrado com sucesso"
    );
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
  @Description(DOC_TYPE_UPDATE_DESCRIPTION)
  @Example(DOC_TYPE_UPDATE_EXAMPLE_RESPONSE)
  @Returns(200, DocumentTypeResponseDto)
  @Returns(404)
  @Returns(400)
  @Returns(409)
  async update(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @Example(DOC_TYPE_UPDATE_EXAMPLE)
    @BodyParams()
    updateDto: UpdateDocumentTypeDto
  ) {
    const documentType = await this.documentTypeService.update(id, updateDto);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(
      documentType,
      "Tipo de documento atualizado com sucesso"
    );
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
  @Description(DOC_TYPE_DELETE_DESCRIPTION)
  @Example(DOC_TYPE_DELETE_EXAMPLE)
  @Returns(200, DocumentTypeResponseDto)
  @Returns(404)
  @Returns(400)
  async delete(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION) @PathParams("id") id: string
  ) {
    const deleted = await this.documentTypeService.delete(id);
    if (!deleted) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(
      deleted,
      "Tipo de documento removido com sucesso"
    );
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
  @Description(DOC_TYPE_RESTORE_DESCRIPTION)
  @Example(DOC_TYPE_RESTORE_EXAMPLE)
  @Returns(200, DocumentTypeResponseDto)
  @Returns(404)
  @Returns(400)
  async restore(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION) @PathParams("id") id: string
  ) {
    const restored = await this.documentTypeService.restore(id);
    if (!restored) {
      throw new NotFound("Tipo de documento não encontrado");
    }
    return ResponseHandler.success(
      restored,
      "Tipo de documento reativado com sucesso"
    );
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
  @Description(
    `${DOC_TYPE_LINKED_EMPLOYEES_DESCRIPTION}\n\n${DOC_TYPE_LINKED_EMPLOYEES_QUERY_PARAMS}`
  )
  @Example(DOC_TYPE_LINKED_EMPLOYEES_EXAMPLE)
  @Returns(200, PaginatedResponseDto)
  @Returns(404)
  @Returns(400)
  async getLinkedEmployees(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @QueryParams("page") page: number = DocumentTypesController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentTypesController.DEFAULT_LIMIT
  ) {
    // Verificar se o tipo de documento existe
    const documentType = await this.documentTypeService.findById(id);
    if (!documentType) {
      throw new NotFound("Tipo de documento não encontrado");
    }

    // Buscar colaboradores vinculados ao tipo de documento
    const result = await this.documentTypeService.getLinkedEmployees(id, {
      page,
      limit,
    });

    // Validar paginação
    PaginationUtils.validatePage(page, result.total, limit);

    return ResponseHandler.success(
      PaginationUtils.createPaginatedResult(
        result.items,
        page,
        limit,
        result.total
      ),
      "Colaboradores vinculados ao tipo de documento listados com sucesso"
    );
  }
}
