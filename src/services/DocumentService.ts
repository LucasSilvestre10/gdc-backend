import { Injectable, Inject } from "@tsed/di";
import { DocumentRepository } from "../repositories/DocumentRepository.js";
import { DocumentTypeRepository } from "../repositories/index.js";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { EmployeeService } from "./EmployeeService.js";
import { Document } from "../models/Document";
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
} from "../types/DocumentServiceTypes";

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
   * Obtém todos os documentos pendentes de todos os colaboradores
   * Organizados por colaborador com seus respectivos documentos pendentes
   *
   * Funcionalidade de dashboard administrativo para acompanhamento global
   * de documentos pendentes na empresa.
   */
  async getPendingDocuments(
    params: GetPendingDocumentsParams
  ): Promise<GroupedPendingDocumentsResult> {
    // Extrair parâmetros com valores padrão seguros
    const { status = "all", documentTypeId } = params;

    let { page = 1, limit = 10 } = params;

    // Sanitizar valores de paginação
    page = Math.max(1, page);
    limit = Math.min(Math.max(1, limit), 100);

    // ETAPA 1: Buscar colaboradores ativos
    const employeeFilter: Record<string, unknown> = {
      isActive: { $ne: false },
    };

    const employeesData = await this.employeeRepository.list(employeeFilter, {
      page: 1,
      limit: 1000,
    });

    if (employeesData.items.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    // ETAPA 2: Para cada colaborador, usar o EmployeeService para obter documentos pendentes
    const allPendingDocuments: FlatPendingDocument[] = [];

    for (const employee of employeesData.items) {
      const empId = (
        employee as unknown as { _id: { toString(): string } }
      )._id?.toString();
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
    const skip = (page - 1) * limit;
    const paginatedData = groupedData.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedData,
      pagination: { page, limit, total, totalPages },
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
