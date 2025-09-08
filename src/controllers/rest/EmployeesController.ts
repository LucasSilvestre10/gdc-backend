import { Controller } from "@tsed/di";
import { Get, Post, Put, Patch, Delete } from "@tsed/schema";
import { PathParams, BodyParams, QueryParams } from "@tsed/platform-params";
import { Returns, Summary, Description } from "@tsed/schema";
import { Inject } from "@tsed/di";
import { 
    CreateEmployeeDto, 
    UpdateEmployeeDto, 
    LinkDocumentTypesDto, 
    UnlinkDocumentTypesDto 
} from "../../dtos/employeeDTO";
import { EmployeeService } from "../../services/EmployeeService";

/**
 * Controller responsável pelos endpoints de colaboradores.
 * 
 * @route /employees
 * 
 * Endpoints:
 * - POST /           : Cria um novo colaborador.
 * - GET /            : Lista todos os colaboradores (com paginação opcional).
 * - GET /:id         : Busca colaborador por ID.
 * - PUT /:id         : Atualiza os dados de um colaborador.
 * - DELETE /:id      : Remove um colaborador do sistema.
 * - PATCH /:id/link-document-types   : Vincula tipos de documento obrigatórios ao colaborador.
 * - PATCH /:id/unlink-document-types : Desvincula tipos de documento do colaborador.
 * - GET /:id/documentation-status    : Retorna o status da documentação obrigatória do colaborador.
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
            const employee = await this.employeeService.createEmployee(createDto);
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
     * @description Lista todos os colaboradores com paginação opcional.
     * @query page, limit
     * @returns { success, message, data }
     */
    @Get("/")
    @Summary("Listar colaboradores")
    @Description("Lista todos os colaboradores com paginação opcional")
    @Returns(200, Array)
    async list(
        @QueryParams("page") page: number = 1,
        @QueryParams("limit") limit: number = 10
    ) {
        try {
            const result = await this.employeeService.list({}, { page, limit });
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
            return {
                success: false,
                message: error instanceof Error ? error.message : "Erro interno do servidor",
                data: null
            };
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
            return {
                success: false,
                message: error instanceof Error ? error.message : "Erro interno do servidor",
                data: null
            };
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
     * @endpoint PATCH /employees/:id/link-document-types
     * @description Vincula um ou mais tipos de documento obrigatórios ao colaborador.
     * @param id
     * @body LinkDocumentTypesDto
     * @returns { success, message }
     */
    @Patch("/:id/link-document-types")
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
     * @endpoint PATCH /employees/:id/unlink-document-types
     * @description Desvincula um ou mais tipos de documento do colaborador.
     * @param id
     * @body UnlinkDocumentTypesDto
     * @returns { success, message }
     */
    @Patch("/:id/unlink-document-types")
    @Summary("Desvincular tipos de documento do colaborador")
    @Description("Desvincula um ou mais tipos de documento do colaborador")
    @Returns(200, Object)
    @Returns(404, Object)
    async unlinkDocumentTypes(
        @PathParams("id") id: string,
        @BodyParams() unlinkDto: UnlinkDocumentTypesDto
    ) {
        try {
            await this.employeeService.unlinkDocumentTypes(id, unlinkDto.documentTypeIds);
            return {
                success: true,
                message: "Tipos de documento desvinculados com sucesso"
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * @endpoint GET /employees/:id/documentation-status
     * @description Retorna o status da documentação obrigatória do colaborador (enviados e pendentes).
     * @param id
     * @returns { success, data }
     */
    @Get("/:id/documentation-status")
    @Summary("Status da documentação do colaborador")
    @Description("Retorna o status da documentação obrigatória do colaborador (enviados e pendentes)")
    @Returns(200, Object)
    @Returns(404, Object)
    async getDocumentationStatus(@PathParams("id") id: string) {
        try {
            const status = await this.employeeService.getDocumentationStatus(id);
            return {
                success: true,
                data: status
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reativa um colaborador.
     * @route POST /employees/:id/restore
     * @param id (identificador do colaborador)
     * @returns 200 - Colaborador reativado com sucesso
     * @returns 404 - Colaborador não encontrado
     */
    @Post("/:id/restore")
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
