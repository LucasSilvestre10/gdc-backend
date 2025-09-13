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
 *
 * Características:
 * - Dashboard administrativo para visualizar pendências globais
 * - Filtros por tipo de documento (documentTypeId)
 * - Paginação para performance
 * - Suporte a diferentes status (active/inactive/all)
 *
 * Nota: Para documentos pendentes de colaborador específico,
 * use GET /employees/:id/documents/pending
 *
 * Segue princípios SOLID:
 * - Single Responsibility: Apenas dashboard de pendências globais
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
}
