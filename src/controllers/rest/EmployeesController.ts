import { Controller } from "@tsed/di";
import { Get, Post, Put, Patch, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { BadRequest, NotFound, Conflict, UnprocessableEntity } from "@tsed/exceptions";
import { ResponseHandler } from "../../middleware/ResponseHandler";
import { 
    CreateEmployeeDto, 
    UpdateEmployeeDto, 
    LinkDocumentTypesDto,
    RequiredDocumentLinkDto,
    EmployeeListDto,
    DocumentationStatusResponseDto,
    PaginatedResponseDto,
    StatusFilterDto,
    EmployeeDocumentDto
} from "../../dtos/employeeDTO";
import { DocumentResponseDto } from "../../dtos/documentDTO";
import { 
    EmployeeSearchResponseDto,
    EmployeeDocumentsResponseDto 
} from "../../dtos/enrichedEmployeeDTO";
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
    @Description("Cria um novo colaborador no sistema")
    @Returns(201, Object)
    @Returns(400, Object)
    async create(@BodyParams() createDto: CreateEmployeeDto) {
        try {
            const employee = await this.employeeService.create(createDto);
            return {
                success: true,
                message: "Colaborador criado com sucesso",
                data: employee
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/
     * @description Lista todos os colaboradores com paginação e filtros de status.
     * @query status, page, limit
     * @returns { success, message, data }
     */
    @Get("/")
    @Summary("Listar colaboradores")
    @Description("Lista todos os colaboradores com paginação. Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
    @Returns(200, PaginatedResponseDto)
    async list(
        @QueryParams("status") status: string = "all",
        @QueryParams("page") page: number = 1,
        @QueryParams("limit") limit: number = 20
    ) {
        try {
            // Processa o filtro de status conforme especificação
            let filter = {};
            if (status === "active") {
                filter = { isActive: true };
            } else if (status === "inactive") {
                filter = { isActive: false };
            } else if (status === "all") {
                filter = { isActive: "all" }; // Sinal especial para buscar todos
            }
            // Para outros valores de status, usa filtro vazio (padrão do repositório)
            
            const result = await this.employeeService.listAsDto(filter, { page, limit });
            return {
                success: true,
                message: "Colaboradores listados com sucesso",
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
     * @endpoint GET /employees/search
     * @description Busca colaboradores por nome ou CPF (identificador único)
     * @query query - Termo de busca (nome ou CPF)
     * @query status - Filtro de status: active, inactive, all (padrão: all)
     * @query page - Página (padrão: 1)
     * @query limit - Limite por página (padrão: 20)
     * @returns { success, message, data, pagination }
     */
    @Get("/search") 
    @Summary("Buscar colaboradores por nome ou CPF")
    @Description("\"Query\" Busca colaboradores por nome (case-insensitive) ou CPF (busca exata). Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
    @Returns(200, PaginatedResponseDto)
    async searchEmployees(
        @QueryParams("query") query: string,
        @QueryParams("status") status: string = "all",
        @QueryParams("page") page: number = 1,
        @QueryParams("limit") limit: number = 20
    ) {
        try {
            if (!query || query.trim().length < 2) {
                return {
                    success: false,
                    message: "Parâmetro 'query' deve ter pelo menos 2 caracteres",
                    data: [],
                    pagination: { page, limit, total: 0, totalPages: 0 }
                };
            }

            const filters = { status, page, limit };
            const result = await this.employeeService.searchByNameOrCpf(query.trim(), filters);
            
            // Enriquece os dados com informações de documentação
            const enrichedEmployees = await this.employeeService.enrichEmployeesWithDocumentationInfo(result.items);
            
            // Como o TS.ED está serializando como array, vamos trabalhar com isso
            // O primeiro elemento do array será nosso objeto de dados principal
            const responseObject = {
                employees: enrichedEmployees,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                }
            };
            
            return ResponseHandler.success(responseObject, "Busca realizada com sucesso");
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/:id
     * @description Retorna os dados de um colaborador específico pelo ID.
     * @param id
     * @returns { success, message, data }
     */
    @Get("/:id")
    @Summary("Buscar colaborador por ID")
    @Description("Retorna os dados de um colaborador específico")
    @Returns(200, Object)
    @Returns(404, Object)
    @Returns(400, Object)
    async findById(@PathParams("id") id: string) {
        const employee = await this.employeeService.findById(id);
        
        if (!employee) {
            // Lança exceção NotFound que será tratada pelo TS.ED
            throw new NotFound("Colaborador não encontrado");
        }

        return ResponseHandler.success(employee, "Colaborador encontrado com sucesso");
    }

    /**
     * @endpoint PUT /employees/:id
     * @description Atualiza os dados de um colaborador.
     * @param id
     * @body UpdateEmployeeDto
     * @returns { success, message, data }
     */
    @Put("/:id")
    @Summary("Atualizar colaborador")
    @Description("Atualiza os dados de um colaborador")
    @Returns(200, Object)
    @Returns(404, Object)
    @Returns(400, Object)
    @Returns(409, Object)
    async update(
        @PathParams("id") id: string,
        @BodyParams() updateDto: UpdateEmployeeDto
    ) {
        const employee = await this.employeeService.updateEmployee(id, updateDto);
        
        if (!employee) {
            throw new NotFound("Colaborador não encontrado");
        }

        return ResponseHandler.success(employee, "Colaborador atualizado com sucesso");
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
    @Description("Remove um colaborador do sistema (soft delete)")
    @Returns(200, Object)
    @Returns(404, Object)
    @Returns(400, Object)
    async delete(@PathParams("id") id: string) {
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
    @Description("Vincula um ou mais tipos de documento obrigatórios ao colaborador")
    @Returns(200, Object)
    @Returns(404, Object)
    async linkDocumentTypes(
        @PathParams("id") id: string,
        @BodyParams() linkDto: LinkDocumentTypesDto
    ) {
        try {
            await this.employeeService.linkDocumentTypes(id, linkDto.documentTypeIds);
            return {
                success: true,
                message: "Tipos de documento vinculados com sucesso"
            };
        } catch (error) {
            throw error;
        }
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
    @Description("Desvincula um tipo de documento específico do colaborador (soft delete)")
    @Returns(200, Object)
    @Returns(404, Object)
    async unlinkDocumentType(
        @PathParams("id") id: string,
        @PathParams("documentTypeId") documentTypeId: string
    ) {
        try {
            await this.employeeService.unlinkDocumentTypes(id, [documentTypeId]);
            return {
                success: true,
                message: "Tipo de documento desvinculado com sucesso"
            };
        } catch (error) {
            throw error;
        }
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
    @Description("Envia um documento específico do colaborador")
    @Returns(201, Object)
    @Returns(400, Object)
    @Returns(404, Object)
    @Returns(409, Object)
    async sendDocument(
        @PathParams("id") id: string,
        @PathParams("documentTypeId") documentTypeId: string,
        @BodyParams("value") value: string
    ) {
        const document = await this.employeeService.sendDocument(id, documentTypeId, value);
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
    @Description("Lista apenas os documentos que foram enviados pelo colaborador (status: SENT)")
    @Returns(200, Object)
    @Returns(404, Object)
    async getSentDocuments(@PathParams("id") id: string) {
        try {
            const employee = await this.employeeService.findById(id);
            if (!employee) {
                throw new NotFound("Colaborador não encontrado");
            }

            const sentDocuments = await this.employeeService.getSentDocuments(id);
            
            const response = {
                employee: {
                    id: (employee as any)._id || id,
                    name: employee.name
                },
                sentDocuments: {
                    total: sentDocuments.length,
                    documents: sentDocuments
                }
            };

            return ResponseHandler.success(response, "Documentos enviados listados com sucesso");
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/:id/documents/pending  
     * @description Lista apenas os documentos pendentes do colaborador.
     * @param id - ID do colaborador
     * @returns { success, data }
     */
    @Get("/:id/documents/pending")
    @Summary("Listar documentos pendentes")
    @Description("Lista apenas os documentos que estão pendentes de envio pelo colaborador (status: PENDING)")
    @Returns(200, Object)
    @Returns(404, Object)
    async getPendingDocuments(@PathParams("id") id: string) {
        try {
            const employee = await this.employeeService.findById(id);
            if (!employee) {
                throw new NotFound("Colaborador não encontrado");
            }

            const pendingDocuments = await this.employeeService.getPendingDocuments(id);
            
            const response = {
                employee: {
                    id: (employee as any)._id || id,
                    name: employee.name
                },
                pendingDocuments: {
                    total: pendingDocuments.length,
                    documents: pendingDocuments
                }
            };

            return ResponseHandler.success(response, "Documentos pendentes listados com sucesso");
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/:id/documentation
     * @description Retorna o overview completo da documentação do colaborador (enviados + pendentes).
     * @param id - ID do colaborador
     * @returns { success, data }
     */
    @Get("/:id/documentation")
    @Summary("Overview da documentação do colaborador")
    @Description("Retorna visão completa da documentação obrigatória do colaborador, incluindo enviados e pendentes")
    @Returns(200, DocumentationStatusResponseDto)
    @Returns(404, Object)
    async getDocumentationOverview(@PathParams("id") id: string) {
        try {
            const employee = await this.employeeService.findById(id);
            if (!employee) {
                throw new NotFound("Colaborador não encontrado");
            }

            const overview = await this.employeeService.getDocumentationOverview(id);
            
            const response = {
                employee: { 
                    id: (employee as any)._id || id, 
                    name: employee.name 
                },
                documentationOverview: {
                    summary: {
                        total: overview.total,
                        sent: overview.sent,
                        pending: overview.pending,
                        isComplete: overview.pending === 0 && overview.total > 0,
                        lastUpdated: overview.lastUpdated
                    },
                    documents: overview.documents
                }
            };

            return ResponseHandler.success(response, "Overview da documentação obtido com sucesso");
        } catch (error) {
            throw error;
        }
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
    @Description("Restaura um vínculo de tipo de documento desvinculado")
    @Returns(200, Object)
    @Returns(404, Object)
    async restoreDocumentTypeLink(
        @PathParams("id") id: string,
        @PathParams("documentTypeId") documentTypeId: string
    ) {
        try {
            await this.employeeService.restoreDocumentTypeLink(id, documentTypeId);
            return {
                success: true,
                message: "Vínculo de tipo de documento restaurado com sucesso"
            };
        } catch (error) {
            throw error;
        }
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
    @Description("Lista os vínculos de tipos de documento do colaborador. Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
    @Returns(200, Array)
    @Returns(404, Object)
    async getRequiredDocuments(
        @PathParams("id") id: string,
        @QueryParams("status") status: string = "all"
    ) {
        try {
            const requiredDocuments = await this.employeeService.getRequiredDocumentsAsDto(id, status);
            return {
                success: true,
                data: requiredDocuments
            };
        } catch (error) {
            throw error;
        }
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
    @Description("Reativa um colaborador desativado")
    @Returns(200, Object)
    @Returns(404, Object)
    async restore(@PathParams("id") id: string) {
        try {
            const restored = await this.employeeService.restore(id);
            if (!restored) {
                return {
                    success: false,
                    message: "Colaborador não encontrado"
                };
            }
            return {
                success: true,
                message: "Colaborador reativado com sucesso",
                data: restored
            };
        } catch (error) {
            throw error;
        }
    }
}
