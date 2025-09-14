import { Controller } from "@tsed/di";
import { Get, Post, Put, Patch, Delete, Example } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { NotFound } from "@tsed/exceptions";
import { ResponseHandler } from "../../middleware/ResponseHandler";
import { MappingUtils } from "../../utils/MappingUtils";
import { PaginationUtils } from "../../utils/PaginationUtils";
import {
  EMP_CREATE_DESCRIPTION,
  EMP_CREATE_EXAMPLE_REQUEST,
  EMP_CREATE_EXAMPLE_RESPONSE,
  EMP_LIST_DESCRIPTION,
  EMP_LIST_EXAMPLE,
  EMP_SEARCH_DESCRIPTION,
  EMP_SEARCH_EXAMPLE,
  EMP_FIND_BY_ID_DESCRIPTION,
  EMP_FIND_BY_ID_EXAMPLE,
  EMP_UPDATE_DESCRIPTION,
  EMP_UPDATE_REQUEST_EXAMPLE,
  EMP_UPDATE_RESPONSE_EXAMPLE,
  EMP_DELETE_DESCRIPTION,
  EMP_DELETE_EXAMPLE,
  EMP_LINK_DOCS_DESCRIPTION,
  EMP_LINK_DOCS_REQUEST_EXAMPLE,
  EMP_LINK_DOCS_RESPONSE_EXAMPLE,
  EMP_REQUIRED_DOCS_LIST_DESCRIPTION,
  EMP_REQUIRED_DOCS_LIST_EXAMPLE,
  EMP_UNLINK_DOC_DESCRIPTION,
  EMP_UNLINK_DOC_EXAMPLE,
  EMP_SEND_DOCUMENT_DESCRIPTION,
  EMP_SEND_DOCUMENT_REQUEST_EXAMPLE,
  EMP_SEND_DOCUMENT_RESPONSE_EXAMPLE,
  EMP_SENT_DOCS_LIST_DESCRIPTION,
  EMP_SENT_DOCS_LIST_EXAMPLE,
  EMP_PENDING_DOCS_LIST_DESCRIPTION,
  EMP_PENDING_DOCS_LIST_EXAMPLE,
  EMP_DOCUMENTATION_OVERVIEW_DESCRIPTION,
  EMP_DOCUMENTATION_OVERVIEW_EXAMPLE,
  EMP_RESTORE_DOC_LINK_DESCRIPTION,
  EMP_RESTORE_DOC_LINK_EXAMPLE,
  EMP_RESTORE_DESCRIPTION,
  EMP_RESTORE_EXAMPLE,
} from "../../docs/swagger/employees";
import { DOC_TYPE_OBJECT_ID_DESCRIPTION } from "../../docs/swagger/common";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  LinkDocumentTypesDto,
  DocumentationStatusResponseDto,
  StatusFilterDto,
} from "../../dtos/employeeDTO";
import { PaginatedResponseDto } from "../../dtos/paginationDTO";
import { EmployeeSearchResponseDto } from "../../dtos/employeeResponseDTO";
import { EmployeeService } from "../../services/EmployeeService";

/**
 * Controller responsável pelos endpoints de colaboradores.
 *
 * @route /employees
 *
 * Endpoints:
 * - POST /                                         : Cria um novo colaborador.
 * - PUT /:id                                       : Atualiza os dados de um colaborador.
 * - DELETE /:id                                    : Remove um colaborador do sistema (soft delete).
 * - PATCH /:id/restore                             : Restaura um colaborador removido.
 * - GET /                                          : Lista todos os colaboradores (com paginação e filtros).
 * - POST /:id/required-documents                   : Vincula tipos de documento obrigatórios ao colaborador.
 * - DELETE /:id/required-documents/:documentTypeId : Desvincula tipo de documento do colaborador.
 * - PATCH /:id/required-documents/:documentTypeId/restore : Restaura vínculo de tipo de documento.
 * - GET /:id/required-documents                    : Lista vínculos de tipos de documento.
 * - GET /:id/documents/status                      : Retorna o status da documentação obrigatória do colaborador.
 *
 * Todos os endpoints retornam um objeto padrão contendo:
 * - success: boolean
 * - message: string (quando aplicável)
 * - data: qualquer (quando aplicável)
 */
@Controller("/employees")
export class EmployeesController {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_STATUS = "active";
  @Inject()
  private employeeService!: EmployeeService;

  /**
   * @endpoint POST /employees/
   * @description Cria um novo colaborador no sistema.
   * @body CreateEmployeeDto
   * @returns { success, message, data }
   */
  @Post("/")
  @Summary("Criar novo colaborador")
  @Description(EMP_CREATE_DESCRIPTION)
  @Example(EMP_CREATE_EXAMPLE_RESPONSE)
  @Returns(201, Object)
  @Returns(400)
  async create(
    @Example(EMP_CREATE_EXAMPLE_REQUEST)
    @BodyParams()
    createDto: CreateEmployeeDto
  ) {
    const employee = await this.employeeService.create(createDto);
    return ResponseHandler.success(employee, "Colaborador criado com sucesso");
  }

  /**
   * @endpoint GET /employees/
   * @description Lista todos os colaboradores com paginação e filtros de status.
   * @query status, page, limit
   * @returns { success, message, data }
   */
  @Get("/")
  @Summary("Listar colaboradores")
  @Description(EMP_LIST_DESCRIPTION)
  @Example(EMP_LIST_EXAMPLE)
  @Returns(200, PaginatedResponseDto)
  async list(
    @QueryParams("status") status: string = EmployeesController.DEFAULT_STATUS,
    @QueryParams("page") page: number = EmployeesController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = EmployeesController.DEFAULT_LIMIT
  ) {
    // Processa o filtro de status conforme especificação
    let filter = {};
    if (status === "active") {
      filter = { isActive: true };
    } else if (status === "inactive") {
      filter = { isActive: false };
    } else if (status === "all") {
      filter = { isActive: "all" };
    }
    // Para outros valores de status, usa filtro vazio (padrão do repositório)

    const result = await this.employeeService.listAsDto(filter, {
      page,
      limit,
    });

    return {
      success: true,
      message: "Colaboradores listados com sucesso",
      data: result.items,
      pagination: PaginationUtils.createPaginationInfo(
        page,
        limit,
        result.total
      ),
    };
  }

  /**
   * @endpoint GET /employees/search
   * @description Busca colaboradores por nome ou CPF (identificador único)
   * @query query - Termo de busca (nome ou CPF)
   * @query status - Filtro de status: active, inactive, all (padrão: all)
   * @query page - Página (padrão: 1)
   * @query limit - Limite por página (padrão: 10)
   * @returns { success, message, data, pagination }
   */
  @Get("/search")
  @Summary("Buscar colaboradores por nome ou CPF")
  @Description(EMP_SEARCH_DESCRIPTION)
  @Example(EMP_SEARCH_EXAMPLE)
  @Returns(200, EmployeeSearchResponseDto)
  async searchEmployees(
    @QueryParams("query") query: string,
    @QueryParams() filters: StatusFilterDto
  ) {
    const result = await this.employeeService.searchByNameOrCpf(query, filters);
    const enrichedEmployees =
      await this.employeeService.enrichEmployeesWithDocumentationInfo(
        result.items
      );
    const responseObject: EmployeeSearchResponseDto = {
      employees: enrichedEmployees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        document: emp.document,
        hiredAt: emp.hiredAt,
        isActive: emp.isActive,
        createdAt: emp.createdAt ?? new Date(),
        updatedAt: emp.updatedAt ?? new Date(),
        documentationSummary: MappingUtils.toDocumentationSummaryDto(
          emp.documentationSummary
        ),
      })),
      pagination: PaginationUtils.createPaginationInfo(
        filters.page,
        filters.limit,
        result.total
      ),
    };
    return ResponseHandler.success(
      responseObject,
      "Busca realizada com sucesso"
    );
  }

  /**
   * @endpoint GET /employees/:id
   * @description Retorna os dados de um colaborador específico pelo ID.
   * @param id - ID do colaborador
   * @returns Employee data
   */
  @Get("/:id")
  @Summary("Buscar colaborador por ID")
  @Description(EMP_FIND_BY_ID_DESCRIPTION)
  @Example(EMP_FIND_BY_ID_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async findById(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string
  ) {
    const employee = await this.employeeService.findById(id);
    if (!employee) {
      throw new NotFound("Colaborador não encontrado");
    }
    return ResponseHandler.success(
      employee,
      "Colaborador encontrado com sucesso"
    );
  }

  @Put("/:id")
  @Summary("Atualizar colaborador")
  @Description(EMP_UPDATE_DESCRIPTION)
  @Example(EMP_UPDATE_RESPONSE_EXAMPLE)
  @Returns(200)
  @Returns(404)
  @Returns(400)
  @Returns(409)
  async update(
    @PathParams("id") id: string,
    @Example(EMP_UPDATE_REQUEST_EXAMPLE)
    @BodyParams()
    updateDto: UpdateEmployeeDto
  ) {
    const employee = await this.employeeService.updateEmployee(id, updateDto);

    if (!employee) {
      throw new NotFound("Colaborador não encontrado");
    }

    return ResponseHandler.success(
      employee,
      "Colaborador atualizado com sucesso"
    );
  }

  /**
   * Remove um colaborador (soft delete).
   * @route DELETE /employees/:id
   * @param id (identificador do colaborador)
   * @returns 200 - Colaborador removido com sucesso
   * @returns 404 - Colaborador não encontrado
   */
  @Delete("/:id")
  @Summary("Remover colaborador")
  @Description(EMP_DELETE_DESCRIPTION)
  @Example(EMP_DELETE_EXAMPLE)
  @Returns(200)
  @Returns(404)
  @Returns(400)
  async delete(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string
  ) {
    const deleted = await this.employeeService.delete(id);
    if (!deleted) {
      throw new NotFound("Colaborador não encontrado");
    }
    return ResponseHandler.success(deleted, "Colaborador removido com sucesso");
  }

  /**
   * @endpoint POST /employees/:id/required-documents
   * @description Vincula um ou mais tipos de documento obrigatórios ao colaborador.
   * @param id
   * @body LinkDocumentTypesDto
   * @returns { success, message }
   */
  @Post("/:id/required-documents")
  @Summary("Vincular tipos de documento ao colaborador")
  @Description(EMP_LINK_DOCS_DESCRIPTION)
  @Example(EMP_LINK_DOCS_RESPONSE_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async linkDocumentTypes(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @Example(EMP_LINK_DOCS_REQUEST_EXAMPLE)
    @BodyParams()
    linkDto: LinkDocumentTypesDto
  ) {
    await this.employeeService.linkDocumentTypes(id, linkDto.documentTypeIds);
    return ResponseHandler.success(
      null,
      "Tipos de documento vinculados com sucesso"
    );
  }

  /**
   * @endpoint DELETE /employees/:id/required-documents/:documentTypeId
   * @description Desvincula um tipo de documento específico do colaborador (soft delete).
   * @param id
   * @param documentTypeId
   * @returns { success, message }
   */
  @Delete("/:id/required-documents/:documentTypeId")
  @Summary("Desvincular tipo de documento do colaborador")
  @Description(EMP_UNLINK_DOC_DESCRIPTION)
  @Example(EMP_UNLINK_DOC_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async unlinkDocumentType(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("documentTypeId")
    documentTypeId: string
  ) {
    await this.employeeService.unlinkDocumentTypes(id, [documentTypeId]);
    return ResponseHandler.success(
      null,
      "Tipo de documento desvinculado com sucesso"
    );
  }

  /**
   * @endpoint POST /employees/:id/documents/:documentTypeId
   * @description Envia um documento do colaborador.
   * @param id - ID do colaborador
   * @param documentTypeId - ID do tipo de documento
   * @body { value: string } - Valor textual do documento
   * @returns { success, message, data }
   */
  @Post("/:id/documents/:documentTypeId")
  @Summary("Enviar documento do colaborador")
  @Description(EMP_SEND_DOCUMENT_DESCRIPTION)
  @Example(EMP_SEND_DOCUMENT_RESPONSE_EXAMPLE)
  @Returns(201)
  @Returns(400)
  @Returns(404)
  @Returns(409)
  async sendDocument(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("documentTypeId")
    documentTypeId: string,
    @Example(EMP_SEND_DOCUMENT_REQUEST_EXAMPLE)
    @BodyParams("value")
    value: string
  ) {
    const document = await this.employeeService.sendDocument(
      id,
      documentTypeId,
      value
    );
    return ResponseHandler.success(document, "Documento enviado com sucesso");
  }

  /**
   * @endpoint GET /employees/:id/documents/sent
   * @description Lista apenas os documentos enviados do colaborador.
   * @param id - ID do colaborador
   * @returns { success, data }
   */
  @Get("/:id/documents/sent")
  @Summary("Listar documentos enviados")
  @Description(EMP_SENT_DOCS_LIST_DESCRIPTION)
  @Example(EMP_SENT_DOCS_LIST_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async getSentDocuments(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string
  ) {
    const employee = await this.employeeService.findById(id);
    if (!employee) {
      throw new NotFound("Colaborador não encontrado");
    }

    const sentDocuments = await this.employeeService.getSentDocuments(id);

    const response = {
      employee: {
        id: id,
        name: employee.name,
      },
      sentDocuments: {
        total: sentDocuments.length,
        documents: sentDocuments,
      },
    };

    return ResponseHandler.success(
      response,
      "Documentos enviados listados com sucesso"
    );
  }

  /**
   * @endpoint GET /employees/:id/documents/pending
   * @description Lista apenas os documentos pendentes do colaborador.
   * @param id - ID do colaborador
   * @returns { success, data }
   */
  @Get("/:id/documents/pending")
  @Summary("Listar documentos pendentes")
  @Description(EMP_PENDING_DOCS_LIST_DESCRIPTION)
  @Example(EMP_PENDING_DOCS_LIST_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async getPendingDocuments(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION) @PathParams("id") id: string
  ) {
    const employee = await this.employeeService.findById(id);
    if (!employee) {
      throw new NotFound("Colaborador não encontrado");
    }

    const pendingDocuments = await this.employeeService.getPendingDocuments(id);

    const response = {
      employee: {
        id: id,
        name: employee.name,
      },
      pendingDocuments: {
        total: pendingDocuments.length,
        documents: pendingDocuments,
      },
    };

    return ResponseHandler.success(
      response,
      "Documentos pendentes listados com sucesso"
    );
  }

  /**
   * @endpoint GET /employees/:id/documentation
   * @description Retorna o overview completo da documentação do colaborador (enviados + pendentes).
   * @param id - ID do colaborador
   * @returns { success, data }
   */
  @Get("/:id/documentation")
  @Summary("Overview da documentação do colaborador")
  @Description(EMP_DOCUMENTATION_OVERVIEW_DESCRIPTION)
  @Example(EMP_DOCUMENTATION_OVERVIEW_EXAMPLE)
  @Returns(200, DocumentationStatusResponseDto)
  @Returns(404)
  async getDocumentationOverview(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string
  ) {
    const employee = await this.employeeService.findById(id);
    if (!employee) {
      throw new NotFound("Colaborador não encontrado");
    }

    const overview = await this.employeeService.getDocumentationOverview(id);

    const response = {
      employee: {
        id: id,
        name: employee.name,
      },
      documentationOverview: {
        summary: {
          total: overview.total,
          sent: overview.sent,
          pending: overview.pending,
          isComplete: overview.pending === 0 && overview.total > 0,
          lastUpdated: overview.lastUpdated,
        },
        documents: overview.documents,
      },
    };

    return ResponseHandler.success(
      response,
      "Overview da documentação obtido com sucesso"
    );
  }

  /**
   * @endpoint PATCH /employees/:id/required-documents/:documentTypeId/restore
   * @description Restaura um vínculo de tipo de documento desvinculado.
   * @param id
   * @param documentTypeId
   * @returns { success, message }
   */
  @Patch("/:id/required-documents/:documentTypeId/restore")
  @Summary("Restaurar vínculo de tipo de documento")
  @Description(EMP_RESTORE_DOC_LINK_DESCRIPTION)
  @Example(EMP_RESTORE_DOC_LINK_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async restoreDocumentTypeLink(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("documentTypeId")
    documentTypeId: string
  ) {
    await this.employeeService.restoreDocumentTypeLink(id, documentTypeId);
    return ResponseHandler.success(
      null,
      "Vínculo de tipo de documento restaurado com sucesso"
    );
  }

  /**
   * @endpoint GET /employees/:id/required-documents
   * @description Lista os vínculos de tipos de documento do colaborador.
   * @param id
   * @param status - Filtro de status (active|inactive|all)
   * @returns { success, data }
   */
  @Get("/:id/required-documents")
  @Summary("Listar vínculos de tipos de documento")
  @Description(EMP_REQUIRED_DOCS_LIST_DESCRIPTION)
  @Example(EMP_REQUIRED_DOCS_LIST_EXAMPLE)
  @Returns(200)
  @Returns(404)
  async getRequiredDocuments(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string,
    @QueryParams("status") status: string = "all"
  ) {
    const requiredDocuments =
      await this.employeeService.getRequiredDocumentsAsDto(id, status);
    return ResponseHandler.success(
      requiredDocuments,
      "Vínculos listados com sucesso"
    );
  }

  /**
   * Reativa um colaborador.
   * @route PATCH /employees/:id/restore
   * @param id (identificador do colaborador)
   * @returns 200 - Colaborador reativado com sucesso
   * @returns 404 - Colaborador não encontrado
   */
  @Patch("/:id/restore")
  @Summary("Reativar colaborador")
  @Description(EMP_RESTORE_DESCRIPTION)
  @Example(EMP_RESTORE_EXAMPLE)
  @Returns(200, Object)
  @Returns(404, Object)
  async restore(
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @PathParams("id")
    id: string
  ) {
    const restored = await this.employeeService.restore(id);
    if (!restored) {
      throw new NotFound("Colaborador não encontrado");
    }
    return ResponseHandler.success(
      restored,
      "Colaborador reativado com sucesso"
    );
  }
}
