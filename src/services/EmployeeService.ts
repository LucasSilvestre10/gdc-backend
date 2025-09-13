import { Injectable, Inject } from "@tsed/di";
import { EmployeeBasicOperations } from "./employee/EmployeeBasicOperations.js";
import { EmployeeDocumentationService } from "./employee/EmployeeDocumentationService.js";
import { EmployeeLinkService } from "./employee/EmployeeLinkService.js";
import { EmployeeHelpers } from "./employee/EmployeeHelpers.js";
import { EmployeeDocumentTypeLinkRepository } from "../repositories/EmployeeDocumentTypeLinkRepository.js";
import { Employee } from "../models/Employee.js";
import { DocumentType } from "../models/DocumentType.js";
import { EmployeeNotFoundError } from "../exceptions/index.js";

import type {
  ListFilter,
  PaginationOptions,
  PaginationResult,
  SearchFilters,
  RequiredDocumentResponse,
  EmployeeListResponse,
  DocumentOverviewResponse,
  SentDocumentResponse,
  PendingDocumentResponse,
  EnrichedEmployee,
  EmployeeDocument,
  EmployeeDto,
  EmployeeSearchResult,
} from "../types/EmployeeServiceTypes.js";
import { getMongoId } from "../types/EmployeeServiceTypes.js";

/**
 * Serviço orquestrador para gerenciamento de colaboradores
 *
 * Responsabilidades:
 * - Implementar interface pública compatível com versão original
 * - Orquestrar operações entre módulos especializados
 * - Manter exata compatibilidade com controllers existentes
 * - Delegar operações para módulos apropriados
 */
@Injectable()
export class EmployeeService {
  constructor(
    @Inject() private basicOps: EmployeeBasicOperations,
    @Inject() private documentationService: EmployeeDocumentationService,
    @Inject() private linkService: EmployeeLinkService,
    @Inject() private helpers: EmployeeHelpers,
    @Inject() private linkRepo: EmployeeDocumentTypeLinkRepository
  ) {}

  /**
   * Helper para extrair ID do Mongoose
   */
  private extractId(doc: { _id: string | { toString(): string } }): string {
    return getMongoId(doc);
  }

  // =================== MÉTODOS CRUD BÁSICOS ===================

  /**
   * Lista colaboradores ativos com paginação e filtros
   */
  async list(
    filter: ListFilter = {},
    opts: PaginationOptions = {}
  ): Promise<PaginationResult<Employee>> {
    return this.basicOps.list(filter, opts);
  }

  /**
   * Busca colaborador ativo por ID
   */
  async findById(id: string): Promise<Employee | null> {
    return this.basicOps.findById(id);
  }

  /**
   * Cria novo colaborador com tratamento de documentos obrigatórios
   */
  async create(dto: {
    name: string;
    document: string;
    hiredAt: Date;
    requiredDocuments?: Array<{ documentTypeId: string; value?: string }>;
  }): Promise<Employee> {
    // Criar colaborador básico
    const employee = await this.basicOps.create({
      name: dto.name,
      document: dto.document,
      hiredAt: dto.hiredAt,
    });

    // Processar documentos obrigatórios se fornecidos
    if (dto.requiredDocuments?.length) {
      const employeeId = this.extractId(employee as EmployeeDocument);
      await this.helpers.processRequiredDocuments(
        employeeId,
        dto.requiredDocuments
      );
    }

    return employee;
  }

  /**
   * Atualiza dados de colaborador existente
   */
  async updateEmployee(
    id: string,
    dto: Partial<Employee>
  ): Promise<Employee | null> {
    return this.basicOps.updateEmployee(id, dto);
  }

  /**
   * Soft delete de um colaborador
   */
  async delete(id: string): Promise<Employee | null> {
    return this.basicOps.delete(id);
  }

  /**
   * Reativa um colaborador
   */
  async restore(id: string): Promise<Employee | null> {
    return this.basicOps.restore(id);
  }

  /**
   * Busca colaboradores por nome ou CPF
   */
  async searchByNameOrCpf(
    query: string,
    filters: SearchFilters = {}
  ): Promise<EmployeeSearchResult> {
    const result = await this.basicOps.searchByNameOrCpf(
      query,
      {
        status: filters.status || "all",
      },
      {
        page: filters.page || 1,
        limit: filters.limit || 20,
      }
    );

    return {
      items: result.items,
      total: result.total,
    };
  }

  // =================== MÉTODOS DE DOCUMENTAÇÃO ===================

  /**
   * Obter status da documentação de um colaborador específico
   */
  async getDocumentationStatus(employeeId: string): Promise<{
    sent: Array<DocumentType & { documentValue?: string | null }>;
    pending: DocumentType[];
  }> {
    return this.documentationService.getDocumentationStatus(employeeId);
  }

  /**
   * Envia documento para colaborador
   */
  async sendDocument(
    employeeId: string,
    documentTypeId: string,
    value: string
  ): Promise<import("../models/Document.js").Document | null> {
    return this.documentationService.sendDocument(
      employeeId,
      documentTypeId,
      value
    );
  }

  /**
   * Enriquece dados de colaboradores com informações de documentação
   */
  async enrichEmployeesWithDocumentationInfo(
    employees: Employee[]
  ): Promise<EnrichedEmployee[]> {
    return this.documentationService.enrichEmployeesWithDocumentationInfo(
      employees
    );
  }

  // =================== MÉTODOS DE VINCULAÇÃO ===================

  /**
   * Vincula tipos de documento ao colaborador
   */
  async linkDocumentTypes(
    employeeId: string,
    typeIds: string[]
  ): Promise<void> {
    return this.linkService.linkDocumentTypes(employeeId, typeIds);
  }

  /**
   * Desvincula tipos de documento do colaborador
   */
  async unlinkDocumentTypes(
    employeeId: string,
    typeIds: string[]
  ): Promise<void> {
    return this.linkService.unlinkDocumentTypes(employeeId, typeIds);
  }

  // =================== MÉTODOS DTO ===================

  /**
   * Lista colaboradores convertidos para DTO
   */
  async listAsDto(
    filter: ListFilter = {},
    opts: PaginationOptions = {}
  ): Promise<EmployeeListResponse> {
    const result = await this.basicOps.list(filter, opts);
    return {
      items: result.items.map((emp: Employee) => this.toEmployeeListDto(emp)),
      total: result.total,
    };
  }

  /**
   * Converte Employee para EmployeeDto
   */
  private toEmployeeListDto(employee: Employee): EmployeeDto {
    return {
      id: this.extractId(employee as EmployeeDocument),
      name: employee.name,
      document: employee.document,
      hiredAt: employee.hiredAt,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      deletedAt: employee.deletedAt,
    };
  }

  // =================== MÉTODOS COMPLEMENTARES (STUBS) ===================

  /**
   * Restaura vínculo específico de tipo de documento
   */
  async restoreDocumentTypeLink(
    employeeId: string,
    documentTypeId: string
  ): Promise<void> {
    // Valida colaborador
    const employee = await this.basicOps.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Restaura ou cria vínculo via linkRepo
    const existingLink = await this.linkRepo.findLink(
      employeeId,
      documentTypeId
    );
    if (existingLink) {
      await this.linkRepo.restore(employeeId, documentTypeId);
    } else {
      await this.linkRepo.create(employeeId, documentTypeId);
    }
  }

  /**
   * Lista vínculos convertidos para DTO
   */
  async getRequiredDocumentsAsDto(
    employeeId: string,
    status: string = "all"
  ): Promise<RequiredDocumentResponse[]> {
    return this.linkService.getRequiredDocumentsAsDto(employeeId, status);
  }

  /**
   * Busca apenas documentos ENVIADOS de um colaborador
   */
  async getSentDocuments(employeeId: string): Promise<SentDocumentResponse[]> {
    return this.documentationService.getSentDocuments(employeeId);
  }

  /**
   * Busca apenas documentos PENDENTES de um colaborador
   */
  async getPendingDocuments(
    employeeId: string
  ): Promise<PendingDocumentResponse[]> {
    return this.documentationService.getPendingDocuments(employeeId);
  }

  /**
   * Overview completo da documentação de um colaborador
   */
  async getDocumentationOverview(
    employeeId: string
  ): Promise<DocumentOverviewResponse> {
    // Valida colaborador
    const employee = await this.basicOps.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Usa os métodos específicos (composição seguindo SOLID)
    const sentDocuments = await this.getSentDocuments(employeeId);
    const pendingDocuments = await this.getPendingDocuments(employeeId);

    // Combina em um overview estruturado
    const allDocuments = [...sentDocuments, ...pendingDocuments];

    return {
      total: allDocuments.length,
      sent: sentDocuments.length,
      pending: pendingDocuments.length,
      documents: allDocuments,
      lastUpdated: new Date().toISOString(),
    };
  }
}
