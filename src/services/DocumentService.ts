import { Injectable, Inject } from "@tsed/di";
import { DocumentRepository } from "../repositories/DocumentRepository.js";
import { DocumentTypeRepository } from "../repositories/index.js";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { EmployeeService } from "./EmployeeService";
import { Document } from "../models/Document";
import { Employee } from "../models/Employee";
import { ValidationUtils } from "../utils/ValidationUtils";
import { PaginationUtils } from "../utils/PaginationUtils";
import {
  DOCUMENT_REPOSITORY_TOKEN,
  DOCUMENT_TYPE_REPOSITORY_TOKEN,
  EMPLOYEE_REPOSITORY_TOKEN,
} from "../config/providers.js";
import {
  GetPendingDocumentsParams,
  GroupedPendingDocumentsResult,
  GroupedPendingEmployee,
  FlatPendingDocument,
  GroupedSentDocumentsResult,
  GroupedSentEmployee,
} from "../types/DocumentServiceTypes";

// Interface para Employee com _id do Mongoose
interface EmployeeWithId extends Employee {
  _id: string | { toString(): string };
}

/**
 * Serviço de negócios para gerenciamento de documentos
 *
 * Responsabilidades:
 * - Implementar regras de negócio específicas do domínio
 * - Orquestrar operações entre múltiplos repositórios
 * - Validar integridade referencial (colaborador e tipo existem)
 * - Gerenciar fluxo de documentos (criação, listagem, status)
 * - Implementar lógica de soft delete com validações
 * - Filtrar documentos por status e outros critérios
 *
 * Funcionalidades:
 * - Criação e atualização de documentos
 * - Listagem de documentos pendentes com filtros
 * - Soft delete preservando histórico para auditoria
 * - Restauração de documentos removidos logicamente
 */
@Injectable()
export class DocumentService {
  /**
   * Injeta dependências necessárias através do sistema de DI do TS.ED
   * @param documentRepository - Repositório para operações de documentos
   * @param documentTypeRepository - Repositório para validação de tipos de documento
   * @param employeeRepository - Repositório para validação de colaboradores
   * @param employeeService - Serviço de colaboradores para reutilizar lógica
   */
  constructor(
    @Inject(DOCUMENT_REPOSITORY_TOKEN)
    private documentRepository: DocumentRepository,
    @Inject(DOCUMENT_TYPE_REPOSITORY_TOKEN)
    private documentTypeRepository: DocumentTypeRepository,
    @Inject(EMPLOYEE_REPOSITORY_TOKEN)
    private employeeRepository: EmployeeRepository,
    private employeeService: EmployeeService
  ) {}

  /**
   * Extrai ID de um objeto, seja string ou ObjectId
   */
  private extractId(obj: { _id?: string | { toString(): string } }): string {
    if (!obj._id) return "";
    return typeof obj._id === "string" ? obj._id : obj._id.toString();
  }

  /**
   * Obtém todos os documentos pendentes de todos os colaboradores
   * Organizados por colaborador com seus respectivos documentos pendentes
   *
   * Funcionalidade de dashboard administrativo para acompanhamento global
   * de documentos pendentes na empresa.
   */
  async getPendingDocuments(
    params: GetPendingDocumentsParams
  ): Promise<GroupedPendingDocumentsResult> {
    // Extrair parâmetros com valores padrão seguros (inclui paginação)
    const { status = "all", documentTypeId } = params;
    let { page = 1, limit = 10 } = params;

    // Sanitizar valores de paginação
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    // Validar documentTypeId se fornecido
    if (documentTypeId) {
      ValidationUtils.validateObjectId(documentTypeId, "documentTypeId");

      // Verificar se o tipo de documento existe
      const documentType =
        await this.documentTypeRepository.findById(documentTypeId);
      if (!documentType) {
        return {
          data: [],
          pagination: PaginationUtils.createPaginationInfo(page, limit, 0),
        };
      }
    }

    // ETAPA 1: Buscar colaboradores ativos
    const employeeFilter: Record<string, boolean | Record<string, boolean>> = {
      isActive: { $ne: false },
    };

    const employeesData = await this.employeeRepository.list(employeeFilter, {
      page: 1,
      limit: 1000,
    });

    if (employeesData.items.length === 0) {
      return {
        data: [],
        pagination: PaginationUtils.createPaginationInfo(page, limit, 0),
      };
    }

    // ETAPA 2: Para cada colaborador, usar o EmployeeService para obter documentos pendentes
    const allPendingDocuments: FlatPendingDocument[] = [];

    for (const employee of employeesData.items) {
      const employeeWithId = employee as EmployeeWithId;
      const empId =
        typeof employeeWithId._id === "string"
          ? employeeWithId._id
          : employeeWithId._id.toString();
      if (!empId) continue;

      try {
        // Usar o método do EmployeeService que já funciona
        const pendingDocs =
          await this.employeeService.getPendingDocuments(empId);

        for (const pendingDoc of pendingDocs) {
          // Aplicar filtro por documentTypeId se fornecido
          if (documentTypeId && pendingDoc.documentType.id !== documentTypeId) {
            continue;
          }

          allPendingDocuments.push({
            employee: {
              id: empId,
              name: employee.name || "",
            },
            documentType: {
              id: pendingDoc.documentType.id,
              name: pendingDoc.documentType.name,
            },
            status: "PENDING",
            active: pendingDoc.isActive,
          });
        }
      } catch (error) {
        console.error(
          `Erro ao buscar documentos pendentes do colaborador ${empId}:`,
          error
        );
        continue;
      }
    }

    // ETAPA 3: Filtrar por status
    let filteredDocuments = allPendingDocuments;
    if (status !== "all") {
      if (status === "active") {
        filteredDocuments = allPendingDocuments.filter(
          (doc) => doc.active === true
        );
      } else if (status === "inactive") {
        filteredDocuments = allPendingDocuments.filter(
          (doc) => doc.active === false
        );
      }
    }

    // ETAPA 4: Agrupar por colaborador
    const employeeMap = new Map<string, GroupedPendingEmployee>();

    // Processar cada documento pendente
    filteredDocuments.forEach((item) => {
      const employeeId = item.employee.id;

      if (!employeeMap.has(employeeId)) {
        employeeMap.set(employeeId, {
          employeeId,
          employeeName: item.employee.name,
          documents: [],
        });
      }

      const employee = employeeMap.get(employeeId)!;

      // Verificar se o documento já existe para evitar duplicatas
      const existingDoc = employee.documents.find(
        (doc) => doc.documentTypeId === item.documentType.id
      );

      if (!existingDoc) {
        employee.documents.push({
          documentTypeId: item.documentType.id,
          documentTypeName: item.documentType.name,
          status: item.status,
          active: item.active,
        });
      }
    });

    // ETAPA 5: Converter Map para Array e ordenar
    const groupedData = Array.from(employeeMap.values());

    // Ordenar colaboradores por nome
    groupedData.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    // Ordenar documentos dentro de cada colaborador
    groupedData.forEach((employee) => {
      employee.documents.sort((a, b) =>
        a.documentTypeName.localeCompare(b.documentTypeName)
      );
    });

    // ETAPA 6: Paginação
    const total = groupedData.length;

    // Validar se a página solicitada existe
    PaginationUtils.validatePage(page, total, limit);

    const skip = (page - 1) * limit;
    const paginatedData = groupedData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: PaginationUtils.createPaginationInfo(page, limit, total),
    };
  }

  /**
   * Lista todos os documentos enviados de todos os colaboradores
   * Agrupa por colaborador seguindo o mesmo padrão do /documents/pending
   *
   * @param params - Parâmetros de filtragem e paginação
   * @returns Lista paginada de documentos enviados agrupados por colaborador
   */
  async getSentDocuments(params: {
    status?: string;
    page?: number;
    limit?: number;
    employeeId?: string;
    documentTypeId?: string;
  }): Promise<GroupedSentDocumentsResult> {
    const { status = "active", employeeId, documentTypeId } = params;
    let { page = 1, limit = 10 } = params;

    // Sanitizar valores de paginação
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    // Validar documentTypeId se fornecido
    if (documentTypeId) {
      ValidationUtils.validateObjectId(documentTypeId, "documentTypeId");
      const documentType =
        await this.documentTypeRepository.findById(documentTypeId);
      if (!documentType) {
        return {
          data: [],
          pagination: PaginationUtils.createPaginationInfo(page, limit, 0),
        };
      }
    }

    // Busca todos os documentos enviados
    const filter: Record<string, string | boolean> = {
      status: "SENT",
    };

    if (status === "inactive") {
      filter.isActive = false;
    } else if (status === "active") {
      filter.isActive = true;
    }
    // Se status === "all", não adiciona filtro de isActive

    if (employeeId) filter.employeeId = employeeId;
    if (documentTypeId) filter.documentTypeId = documentTypeId;

    const sentDocuments = await this.documentRepository.find(filter);

    // Agrupa por colaborador usando Map
    const employeeMap = new Map<string, GroupedSentEmployee>();

    for (const doc of sentDocuments) {
      const employeeIdStr = doc.employeeId.toString();

      if (!employeeMap.has(employeeIdStr)) {
        // Busca dados do colaborador
        const employee = (await this.employeeRepository.findById(
          employeeIdStr
        )) as EmployeeWithId;
        if (employee) {
          employeeMap.set(employeeIdStr, {
            employeeId: employee._id.toString(),
            employeeName: employee.name,
            employeeDocument: employee.document,
            documents: [],
          });
        }
      }

      // Busca tipo do documento
      const documentType = await this.documentTypeRepository.findById(
        doc.documentTypeId.toString()
      );

      const employeeGroup = employeeMap.get(employeeIdStr);
      if (employeeGroup) {
        employeeGroup.documents.push({
          documentTypeId: doc.documentTypeId.toString(),
          documentTypeName: documentType?.name || "Tipo não encontrado",
          documentValue: doc.value,
          status: doc.status,
          active: doc.isActive,
          createdAt: doc.createdAt || new Date(),
          updatedAt: doc.updatedAt || new Date(),
        });
      }
    }

    const groupedData = Array.from(employeeMap.values());

    // Ordenar colaboradores por nome
    groupedData.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    // Ordenar documentos dentro de cada colaborador
    groupedData.forEach((employee) => {
      employee.documents.sort((a, b) =>
        a.documentTypeName.localeCompare(b.documentTypeName)
      );
    });

    const total = groupedData.length;

    // Aplicar paginação
    PaginationUtils.validatePage(page, total, limit);
    const skip = (page - 1) * limit;
    const paginatedData = groupedData.slice(skip, skip + limit);

    return {
      data: paginatedData,
      pagination: PaginationUtils.createPaginationInfo(page, limit, total),
    };
  }

  /**
   * Reativa um documento (marca como ativo)
   * Validações delegadas ao GlobalExceptionHandler
   */
  async restore(id: string): Promise<Document | null> {
    // ObjectId inválido será capturado automaticamente como CastError
    return await this.documentRepository.restore(id);
  }
}
