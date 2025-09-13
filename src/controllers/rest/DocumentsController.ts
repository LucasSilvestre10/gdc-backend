import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { DocumentService } from "../../services/DocumentService";

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
  @Description(
    "Lista todos os documentos pendentes de todos os colaboradores. " +
      "Inclui filtros opcionais por tipo de documento e status. " +
      "Suporte a paginação para melhor performance. " +
      "Retorna apenas documentos que estão realmente pendentes de envio. " +
      "Para colaborador específico, use GET /employees/:id/documents/pending"
  )
  @Returns(200, Object)
  @Returns(400, Object)
  async getPendingDocuments(
    @QueryParams("status") status: string = DocumentsController.DEFAULT_STATUS,
    @QueryParams("page") page: number = DocumentsController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentsController.DEFAULT_LIMIT,
    @QueryParams("documentTypeId") documentTypeId?: string
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
  @Description(
    "Lista todos os documentos enviados de todos os colaboradores agrupados por colaborador. " +
      "Inclui filtros opcionais por colaborador, tipo de documento e status. " +
      "Suporte a paginação para melhor performance. " +
      "Retorna apenas documentos que foram efetivamente enviados. " +
      "Para colaborador específico, use GET /employees/:id/documents/sent"
  )
  @Returns(200, Object)
  @Returns(400, Object)
  async getSentDocuments(
    @QueryParams("status") status: string = DocumentsController.DEFAULT_STATUS,
    @QueryParams("page") page: number = DocumentsController.DEFAULT_PAGE,
    @QueryParams("limit") limit: number = DocumentsController.DEFAULT_LIMIT,
    @QueryParams("employeeId") employeeId?: string,
    @QueryParams("documentTypeId") documentTypeId?: string
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
