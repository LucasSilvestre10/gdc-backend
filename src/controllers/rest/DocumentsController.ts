import { Controller } from "@tsed/di";
import { Get, Post, Put, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { 
  CreateDocumentDto, 
  ListPendingDocumentsDto,
  PendingDocumentsListResponseDto 
} from "../../dtos/documentDTO";
import { DocumentService } from "../../services/DocumentService";

/**
 * Controller responsável por gerenciar documentos dos colaboradores.
 * 
 * Endpoints principais:
 * - POST /documents: Cria um novo documento.
 * - GET /documents: Lista todos os documentos com filtros e paginação.
 * - GET /documents/pending: Lista documentos pendentes com filtros avançados.
 * - GET /documents/:id: Busca um documento pelo ID.
 * - PUT /documents/:id: Atualiza dados de um documento.
 * - DELETE /documents/:id: Remove documento (soft delete).
 * - POST /documents/:id/restore: Reativa documento removido.
 * 
 * Funcionalidades:
 * - Implementa soft delete pattern
 * - Suporte completo a filtros e paginação
 * - Validação via DTOs
 * - Tratamento de erros padronizado
 * - Endpoint especializado para documentos pendentes
 */
@Controller("/documents")
export class DocumentsController {
  @Inject()
  private documentService!: DocumentService;

  /**
   * Cria um novo documento no sistema.
   * @route POST /documents
   * @body CreateDocumentDto
   * @returns 201 - Documento criado com sucesso
   * @returns 400 - Erro de validação (dados inválidos, employee/documentType não encontrado)
   * @returns 404 - Employee ou DocumentType não encontrado
   */
  @Post("/")
  @Summary("Criar novo documento")
  @Description("Cria um novo documento vinculado a um colaborador e tipo de documento")
  @Returns(201, Object)
  @Returns(400, Object)
  @Returns(404, Object)
  async create(@BodyParams() createDto: CreateDocumentDto) {
    try {
      const document = await this.documentService.createDocument({
        employeeId: createDto.employeeId,
        documentTypeId: createDto.documentTypeId,
        fileName: createDto.name, // Usando 'name' do DTO como fileName
        filePath: `/uploads/${createDto.name}`, // Gerando path baseado no nome
        fileSize: 0, // Valor padrão - pode ser atualizado depois
        mimeType: "application/octet-stream" // Valor padrão
      });
      
      return {
        success: true,
        message: "Documento criado com sucesso",
        data: document
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lista todos os documentos com filtros e paginação.
   * @route GET /documents
   * @query employeeId - Filtro por colaborador
   * @query documentTypeId - Filtro por tipo de documento
   * @query page - Número da página (padrão: 1)
   * @query limit - Itens por página (padrão: 10)
   * @returns 200 - Lista paginada de documentos
   */
  @Get("/")
  @Summary("Listar documentos")
  @Description("Lista todos os documentos ativos com filtros opcionais e paginação")
  @Returns(200, Object)
  async list(
    @QueryParams("employeeId") employeeId?: string,
    @QueryParams("documentTypeId") documentTypeId?: string,
    @QueryParams("page") page: number = 1,
    @QueryParams("limit") limit: number = 10
  ) {
    try {
      // Constrói filtros baseados nos parâmetros fornecidos
      const filters: any = {};
      if (employeeId) filters.employeeId = employeeId;
      if (documentTypeId) filters.documentTypeId = documentTypeId;
      
      const options = { page, limit };
      const result = await this.documentService.list(filters, options);
      
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
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lista documentos pendentes usando lógica de negócio avançada (Dia 5)
   * 
   * Funcionalidades:
   * - Identifica tipos de documento obrigatórios ainda não enviados
   * - Cruza dados entre colaboradores, tipos obrigatórios e documentos enviados
   * - Filtros opcionais por colaborador e tipo de documento
   * - Paginação completa com metadados
   * - Retorna "documentos virtuais" representando pendências
   * 
   * @route GET /documents/pending
   * @query employeeId - Filtro por colaborador específico
   * @query documentTypeId - Filtro por tipo de documento específico
   * @query page - Número da página (padrão: 1)
   * @query limit - Itens por página (padrão: 10, máximo: 100)
   * @returns 200 - Lista paginada de documentos pendentes com metadados
   */
  @Get("/pending")
  @Summary("Listar documentos pendentes (lógica avançada)")
  @Description("Lista tipos de documento obrigatórios ainda não enviados pelos colaboradores usando lógica de diferença entre obrigatórios e enviados")
  @Returns(200, PendingDocumentsListResponseDto)
  async listPending(
    @QueryParams("employeeId") employeeId?: string,
    @QueryParams("documentTypeId") documentTypeId?: string,
    @QueryParams("page") page: number = 1,
    @QueryParams("limit") limit: number = 10
  ): Promise<PendingDocumentsListResponseDto> {
    try {
      // Construir DTO com parâmetros validados
      const dto: ListPendingDocumentsDto = {
        page,
        limit,
        employeeId,
        documentTypeId
      };
      
      // Usar nova lógica de pendentes do service
      const result = await this.documentService.listPending(dto);
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca um documento específico pelo ID.
   * @route GET /documents/:id
   * @param id - Identificador único do documento
   * @returns 200 - Documento encontrado
   * @returns 400 - ID inválido
   * @returns 404 - Documento não encontrado
   */
  @Get("/:id")
  @Summary("Buscar documento por ID")
  @Description("Retorna os dados completos de um documento específico")
  @Returns(200, Object)
  @Returns(400, Object)
  @Returns(404, Object)
  async findById(@PathParams("id") id: string) {
    try {
      const document = await this.documentService.findById(id);
      if (!document) {
        return {
          success: false,
          message: "Documento não encontrado",
          data: null
        };
      }
      
      return {
        success: true,
        data: document
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Atualiza dados de um documento existente.
   * @route PUT /documents/:id
   * @param id - Identificador único do documento
   * @body UpdateDocumentDto
   * @returns 200 - Documento atualizado com sucesso
   * @returns 400 - Dados inválidos ou ID malformado
   * @returns 404 - Documento não encontrado
   */
  @Put("/:id")
  @Summary("Atualizar documento")
  @Description("Atualiza os dados de um documento existente (nome e status)")
  @Returns(200, Object)
  @Returns(400, Object)
  @Returns(404, Object)
  async update(
    @PathParams("id") id: string,
    @BodyParams() updateDto: CreateDocumentDto
  ) {
    try {
      const document = await this.documentService.updateDocument(id, {
        name: updateDto.name,
        status: updateDto.status
      });
      if (!document) {
        return {
          success: false,
          message: "Documento não encontrado",
          data: null
        };
      }
      
      return {
        success: true,
        message: "Documento atualizado com sucesso",
        data: document
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove um documento do sistema (soft delete).
   * O documento é marcado como inativo mas preservado no banco de dados.
   * @route DELETE /documents/:id
   * @param id - Identificador único do documento
   * @returns 200 - Documento removido com sucesso
   * @returns 400 - ID inválido
   * @returns 404 - Documento não encontrado
   */
  @Delete("/:id")
  @Summary("Remover documento")
  @Description("Remove um documento do sistema usando soft delete (marca como inativo)")
  @Returns(200, Object)
  @Returns(400, Object)
  @Returns(404, Object)
  async delete(@PathParams("id") id: string) {
    try {
      const deleted = await this.documentService.delete(id);
      if (!deleted) {
        return {
          success: false,
          message: "Documento não encontrado ou já removido"
        };
      }
      
      return {
        success: true,
        message: "Documento removido com sucesso",
        data: deleted
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reativa um documento anteriormente removido (soft delete).
   * @route POST /documents/:id/restore
   * @param id - Identificador único do documento
   * @returns 200 - Documento reativado com sucesso
   * @returns 400 - ID inválido
   * @returns 404 - Documento não encontrado para restauração
   */
  @Post("/:id/restore")
  @Summary("Reativar documento")
  @Description("Reativa um documento que foi removido via soft delete")
  @Returns(200, Object)
  @Returns(400, Object)
  @Returns(404, Object)
  async restore(@PathParams("id") id: string) {
    try {
      const restored = await this.documentService.restore(id);
      if (!restored) {
        return {
          success: false,
          message: "Documento não encontrado para restauração"
        };
      }
      
      return {
        success: true,
        message: "Documento reativado com sucesso",
        data: restored
      };
    } catch (error) {
      throw error;
    }
  }
}
