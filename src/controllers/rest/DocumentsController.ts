import { Controller } from "@tsed/di";
import { Get, Example } from "@tsed/schema";
import { QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { DocumentService } from "../../services/DocumentService";
import { PaginatedResponseDto } from "../../dtos/paginationDTO";
import {
  DOC_PENDING_DESCRIPTION,
  DOC_PENDING_QUERY_PARAMS,
  DOC_PENDING_EXAMPLE,
  DOC_SENT_DESCRIPTION,
  DOC_SENT_QUERY_PARAMS,
  DOC_SENT_EXAMPLE,
} from "../../docs/swagger/documents";
import { DOC_TYPE_OBJECT_ID_DESCRIPTION } from "../../docs/swagger/common";

/**
 * Controller MVP responsável por operações administrativas globais de documentos.
 *
 * Funcionalidades principais:
 * - GET /documents/pending - Lista documentos pendentes de todos os colaboradores
 * - GET /documents/sent - Lista documentos enviados de todos os colaboradores
 *
 * Características:
 * - Dashboard administrativo para visualizar pendências e documentos enviados globais
 * - Filtros por tipo de documento (documentTypeId), colaborador (employeeId)
 * - Paginação para performance
 * - Suporte a diferentes status (active/inactive/all)
 *
 * Nota: Para documentos de colaborador específico,
 * use GET /employees/:id/documents/pending ou GET /employees/:id/documents/sent
 *
 * Segue princípios SOLID:
 * - Single Responsibility: Apenas dashboard de documentos globais
 * - Open/Closed: Extensível para novos filtros
 * - Interface Segregation: DTO específico para cada operação
 */
@Controller("/documents")
export class DocumentsController {
  private static readonly DEFAULT_PAGE = 1;
  private static readonly DEFAULT_LIMIT = 10;
  private static readonly DEFAULT_STATUS = "active";

  @Inject()
  private documentService!: DocumentService;

  /**
   * Lista todos os documentos pendentes de todos os colaboradores.
   * Endpoint administrativo para acompanhamento global de pendências.
   *
   * @route GET /documents/pending
   * @query status - Filtro de status (active|inactive|all) - default: all
   * @query page - Número da página (default: 1)
   * @query limit - Items por página (default: 10, max: 100)
   * @query documentTypeId - Filtro opcional por tipo de documento específico
   * @returns Lista paginada de documentos pendentes globalmente
   *
   * @example
   * GET /documents/pending?page=1&limit=20
   * GET /documents/pending?documentTypeId=456&status=active
   *
   * @note Para documentos pendentes de um colaborador específico, use:
   * GET /employees/:id/documents/pending
   */
  @Get("/pending")
  @Summary("Listar documentos pendentes globalmente")
  @Description(`${DOC_PENDING_DESCRIPTION}\n\n${DOC_PENDING_QUERY_PARAMS}`)
  @Example(DOC_PENDING_EXAMPLE)
  @Returns(200, PaginatedResponseDto)
  @Returns(400)
  async getPendingDocuments(
    @QueryParams("status") status: string = DocumentsController.DEFAULT_STATUS,
    @QueryParams("page") page: number = DocumentsController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentsController.DEFAULT_LIMIT,
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @QueryParams("documentTypeId")
    documentTypeId?: string
  ) {
    try {
      const result = await this.documentService.getPendingDocuments({
        status,
        page,
        limit,
        documentTypeId,
      });

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Erro ao listar documentos pendentes:", error);
      throw error;
    }
  }

  /**
   * Lista todos os documentos enviados de todos os colaboradores.
   * Endpoint administrativo para visualização global de documentos enviados.
   *
   * @route GET /documents/sent
   * @query status - Filtro de status (active|inactive|all) - default: active
   * @query page - Número da página (default: 1)
   * @query limit - Items por página (default: 10, max: 100)
   * @query employeeId - Filtro opcional por colaborador específico
   * @query documentTypeId - Filtro opcional por tipo de documento específico
   * @returns Lista paginada de documentos enviados agrupados por colaborador
   *
   * @example
   * GET /documents/sent?page=1&limit=20
   * GET /documents/sent?employeeId=123&status=active
   * GET /documents/sent?documentTypeId=456
   *
   * @note Para documentos enviados de um colaborador específico, use:
   * GET /employees/:id/documents/sent
   */
  @Get("/sent")
  @Summary("Listar documentos enviados globalmente")
  @Description(`${DOC_SENT_DESCRIPTION}\n\n${DOC_SENT_QUERY_PARAMS}`)
  @Example(DOC_SENT_EXAMPLE)
  @Returns(200, PaginatedResponseDto)
  @Returns(400)
  async getSentDocuments(
    @QueryParams("status") status: string = DocumentsController.DEFAULT_STATUS,
    @QueryParams("page") page: number = DocumentsController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentsController.DEFAULT_LIMIT,
    @QueryParams("employeeId") employeeId?: string,
    @Example(DOC_TYPE_OBJECT_ID_DESCRIPTION)
    @QueryParams("documentTypeId")
    documentTypeId?: string
  ) {
    try {
      const result = await this.documentService.getSentDocuments({
        status,
        page,
        limit,
        employeeId,
        documentTypeId,
      });

      return {
        success: true,
        data: result.data,
        pagination: result.pagination,
      };
    } catch (error) {
      console.error("Erro ao listar documentos enviados:", error);
      throw error;
    }
  }
}
