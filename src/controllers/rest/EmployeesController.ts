import { Controller } from "@tsed/di";
import { Get, Post, Put, Patch, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { 
    CreateEmployeeDto, 
    UpdateEmployeeDto, 
    LinkDocumentTypesDto,
    RequiredDocumentLinkDto,
    EmployeeListDto,
    DocumentationStatusDto,
    PaginatedResponseDto,
    StatusFilterDto,
    EmployeeDocumentDto
} from "../../dtos/employeeDTO";
import { DocumentResponseDto } from "../../dtos/documentDTO";
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
    @Description("Busca colaboradores por nome (case-insensitive) ou CPF (busca exata). Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
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
            
            return {
                success: true,
                message: "Busca realizada com sucesso",
                data: result.items.map(emp => ({
                    id: (emp as any)._id,
                    name: emp.name,
                    document: emp.document,
                    hiredAt: emp.hiredAt,
                    isActive: emp.isActive,
                    createdAt: emp.createdAt,
                    updatedAt: emp.updatedAt
                })),
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
    async findById(@PathParams("id") id: string) {
        try {
            const employee = await this.employeeService.findById(id);
            
            if (!employee) {
                return {
                    success: false,
                    message: "Colaborador não encontrado",
                    data: null
                };
            }

            return {
                success: true,
                message: "Colaborador encontrado com sucesso",
                data: employee
            };
        } catch (error) {
            throw error;
        }
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
    async update(
        @PathParams("id") id: string,
        @BodyParams() updateDto: UpdateEmployeeDto
    ) {
        try {
            const employee = await this.employeeService.updateEmployee(id, updateDto);
            
            if (!employee) {
                return {
                    success: false,
                    message: "Colaborador não encontrado",
                    data: null
                };
            }

            return {
                success: true,
                message: "Colaborador atualizado com sucesso",
                data: employee
            };
        } catch (error) {
            throw error;
        }
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
    async delete(@PathParams("id") id: string) {
        try {
            const deleted = await this.employeeService.delete(id);
            if (!deleted) {
                return {
                    success: false,
                    message: "Colaborador não encontrado"
                };
            }
            return {
                success: true,
                message: "Colaborador removido com sucesso",
                data: deleted
            };
        } catch (error) {
            throw error;
        }
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
     * @endpoint GET /employees/:id/documents
     * @description Lista todos os documentos do colaborador.
     * @param id
     * @param status - Filtro de status (active|inactive|all)
     * @returns { success, data }
     */
    @Get("/:id/documents")
    @Summary("Listar documentos do colaborador")
    @Description("Lista todos os documentos do colaborador. Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
    @Returns(200, Array)
    @Returns(404, Object)
    async getEmployeeDocuments(
        @PathParams("id") id: string,
        @QueryParams("status") status: string = "all"
    ) {
        try {
            const documents = await this.employeeService.getEmployeeDocuments(id, status);
            return {
                success: true,
                data: documents
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/:id/documents/status
     * @description Retorna o status da documentação obrigatória do colaborador (enviados e pendentes).
     * @param id
     * @param status - Filtro de status (active|inactive|all)
     * @returns { success, data }
     */
    @Get("/:id/documents/status")
    @Summary("Status da documentação do colaborador")
    @Description("Retorna o status da documentação obrigatória do colaborador (enviados e pendentes). Parâmetro `status` aceita: `active`, `inactive`, `all` (default: `all`).")
    @Returns(200, DocumentationStatusDto)
    @Returns(404, Object)
    async getDocumentationStatus(
        @PathParams("id") id: string,
        @QueryParams("status") status: string = "all"
    ) {
        try {
            const employee = await this.employeeService.findById(id);
            if (!employee) {
                return {
                    success: false,
                    message: "Colaborador não encontrado",
                    data: null
                };
            }

            const documentStatus = await this.employeeService.getDocumentationStatus(id);
            
            // Estrutura conforme especificação do fluxo da API
            const response = {
                employee: { 
                    id: (employee as any)._id || id, 
                    name: employee.name 
                },
                documentationStatus: {
                    total: documentStatus.sent.length + documentStatus.pending.length,
                    sent: documentStatus.sent.length,
                    pending: documentStatus.pending.length,
                    documents: [
                        ...documentStatus.sent.map(type => ({
                            type: { 
                                id: (type as any)._id, 
                                name: type.name 
                            },
                            status: "SENT",
                            value: null, // TODO: Buscar valor real do documento
                            active: true
                        })),
                        ...documentStatus.pending.map(type => ({
                            type: { 
                                id: (type as any)._id, 
                                name: type.name 
                            },
                            status: "PENDING",
                            value: null,
                            active: true
                        }))
                    ]
                }
            };

            return {
                success: true,
                data: response
            };
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
