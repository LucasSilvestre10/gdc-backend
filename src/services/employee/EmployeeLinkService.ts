import { Injectable, Inject } from "@tsed/di";
import { EmployeeRepository } from "../../repositories/EmployeeRepository.js";
import { DocumentTypeRepository } from "../../repositories/DocumentTypeRepository.js";
import { DocumentRepository } from "../../repositories/DocumentRepository.js";
import { EmployeeDocumentTypeLinkRepository } from "../../repositories/EmployeeDocumentTypeLinkRepository.js";
import { DocumentStatus } from "../../models/Document";
import {
  EmployeeNotFoundError,
  DocumentTypeNotFoundError,
  ValidationError,
} from "../../exceptions";
import { ValidationUtils } from "../../utils/ValidationUtils.js";

import type { DocumentTypeDocument } from "../../types/EmployeeServiceTypes";
import { getMongoId } from "../../types/EmployeeServiceTypes";

/**
 * Módulo responsável pela gestão de vínculos entre colaboradores e tipos de documentos
 */
@Injectable()
export class EmployeeLinkService {
  constructor(
    @Inject() private employeeRepo: EmployeeRepository,
    @Inject() private documentTypeRepo: DocumentTypeRepository,
    @Inject() private documentRepo: DocumentRepository,
    @Inject() private linkRepo: EmployeeDocumentTypeLinkRepository
  ) {}

  /**
   * Helper para extrair ID do Mongoose
   */
  private extractId(doc: { _id: string | { toString(): string } }): string {
    return getMongoId(doc);
  }

  /**
   * Verifica se um tipo de documento é CPF baseado no nome
   */
  private isCpfDocumentType(documentTypeName: string): boolean {
    return /cpf/i.test(documentTypeName);
  }

  /**
   * Vincula tipos de documento ao colaborador
   *
   * Funcionalidades:
   * - Cria vínculos obrigatórios entre colaborador e tipos de documento
   * - Valida existência de colaborador e tipos antes da vinculação
   * - Suporte a operação em lote para eficiência na API
   * - Criação automática de documento CPF se aplicável
   * - Mantém compatibilidade com embedded array
   *
   * Regras de Negócio:
   * - Todos os tipos devem existir antes da vinculação
   * - Colaborador deve estar ativo
   * - CPF é criado automaticamente como SENT usando o document do colaborador
   * - Operação é idempotente (não falha se já vinculado)
   *
   * @param employeeId - ID do colaborador para vincular tipos
   * @param typeIds - Array de IDs dos tipos de documentos a vincular
   * @returns Promise<void>
   * @throws BadRequest se algum tipo não existir ou colaborador inativo
   */
  async linkDocumentTypes(
    employeeId: string,
    typeIds: string[]
  ): Promise<void> {
    if (!typeIds?.length) return;

    // Validar ObjectIds
    ValidationUtils.validateObjectId(employeeId, "ID do colaborador");
    for (const typeId of typeIds) {
      ValidationUtils.validateObjectId(typeId, "ID do tipo de documento");
    }

    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Verificar se todos os tipos de documento existem
    const documentTypes = await this.documentTypeRepo.findByIds(typeIds);
    if (documentTypes.length !== typeIds.length) {
      throw new DocumentTypeNotFoundError();
    }

    // Verificar quais tipos já estão vinculados para evitar duplicatas
    const existingLinks = await this.linkRepo.findByEmployee(
      employeeId,
      "active"
    );
    const existingTypeIds = new Set(
      existingLinks.map((link) => {
        const docType = link.documentTypeId as DocumentTypeDocument;
        return this.extractId(docType);
      })
    );

    // Verificar se ALGUM dos tipos já está vinculado (validação all-or-nothing)
    const alreadyLinkedTypes = typeIds.filter((typeId) =>
      existingTypeIds.has(typeId)
    );

    // Se algum tipo já está vinculado, gerar erro e cancelar TODA a operação
    if (alreadyLinkedTypes.length > 0) {
      const alreadyLinkedNames = await Promise.all(
        alreadyLinkedTypes.map(async (typeId) => {
          const docType = await this.documentTypeRepo.findById(typeId);
          return docType?.name || typeId;
        })
      );
      throw new ValidationError(
        `Os seguintes tipos de documento já estão vinculados a este colaborador: ${alreadyLinkedNames.join(", ")}. Nenhum vínculo foi criado.`
      );
    }

    // Todos os tipos são novos, prosseguir com a vinculação
    for (const documentTypeId of typeIds) {
      // Criar vínculo na tabela de links
      await this.linkRepo.create(employeeId, documentTypeId);

      // Verificar se é CPF e criar documento automaticamente
      const documentType = (documentTypes as DocumentTypeDocument[]).find(
        (dt) => {
          const id = this.extractId(dt);
          return id === documentTypeId;
        }
      );
      if (documentType && this.isCpfDocumentType(documentType.name)) {
        // Criar documento CPF automaticamente como SENT
        await this.documentRepo.create({
          value: employee.document,
          status: DocumentStatus.SENT,
          employeeId,
          documentTypeId,
        });
      }
    }

    // Executar vinculação no embedded array (manter compatibilidade)
    await this.employeeRepo.addRequiredTypes(employeeId, typeIds);
  }

  /**
   * Desvincula tipos de documento do colaborador
   *
   * Funcionalidades:
   * - Remove vínculos de tipos de documento obrigatórios
   * - Valida se vínculos existem e estão ativos antes de desvincular
   * - Suporte a operação em lote para eficiência
   * - Mantém histórico de documentos já enviados
   *
   * Regras de Negócio:
   * - Colaborador deve existir e estar ativo
   * - Vínculos devem estar ativos para serem desvinculados
   * - Não remove documentos já enviados, apenas o vínculo obrigatório
   * - Operação all-or-nothing: se algum vínculo já estiver desvinculado, cancela toda operação
   *
   * @param employeeId - ID do colaborador para desvincular tipos
   * @param typeIds - Array de IDs dos tipos de documento
   * @returns Promise<void>
   * @throws ValidationError se algum tipo já estiver desvinculado
   */
  async unlinkDocumentTypes(
    employeeId: string,
    typeIds: string[]
  ): Promise<void> {
    // Validação de entrada
    if (!typeIds?.length) return;

    // Validar ObjectIds
    ValidationUtils.validateObjectId(employeeId, "ID do colaborador");
    for (const typeId of typeIds) {
      ValidationUtils.validateObjectId(typeId, "ID do tipo de documento");
    }

    // Verificar se colaborador existe
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Verificar se todos os tipos existem
    const documentTypes = await this.documentTypeRepo.findByIds(typeIds);
    if (documentTypes.length !== typeIds.length) {
      throw new DocumentTypeNotFoundError();
    }

    // Verificar quais tipos estão atualmente vinculados (ativos)
    const activeLinks = await this.linkRepo.findByEmployee(
      employeeId,
      "active"
    );
    const activeTypeIds = new Set(
      activeLinks.map((link) => {
        const docType = link.documentTypeId as DocumentTypeDocument;
        return this.extractId(docType);
      })
    );

    // Verificar se ALGUM dos tipos já está desvinculado (validação all-or-nothing)
    const alreadyUnlinkedTypes = typeIds.filter(
      (typeId) => !activeTypeIds.has(typeId)
    );

    // Se algum tipo já está desvinculado, gerar erro e cancelar TODA a operação
    if (alreadyUnlinkedTypes.length > 0) {
      const alreadyUnlinkedNames = await Promise.all(
        alreadyUnlinkedTypes.map(async (typeId) => {
          const docType = await this.documentTypeRepo.findById(typeId);
          return docType?.name || typeId;
        })
      );
      throw new ValidationError(
        `Os seguintes tipos de documento já estão desvinculados deste colaborador: ${alreadyUnlinkedNames.join(", ")}. Nenhuma desvinculação foi realizada.`
      );
    }

    // Todos os tipos estão ativos, prosseguir com a desvinculação
    for (const documentTypeId of typeIds) {
      await this.linkRepo.softDelete(employeeId, documentTypeId);
    }

    // Executa desvinculação no embedded array (manter compatibilidade)
    await this.employeeRepo.removeRequiredTypes(employeeId, typeIds);
  }

  /**
   * Lista vínculos de tipos de documento do colaborador
   *
   * @param employeeId - ID do colaborador
   * @param status - Filtro de status (active|inactive|all)
   * @returns Promise com lista de vínculos
   */
  async getRequiredDocuments(
    employeeId: string,
    status: string = "all"
  ): Promise<
    import("../../types/EmployeeServiceTypes").RequiredDocumentResponse[]
  > {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    const statusFilter = status as "active" | "inactive" | "all";
    const links = await this.linkRepo.findByEmployee(employeeId, statusFilter);

    return links.map((link) => {
      const docType = link.documentTypeId as DocumentTypeDocument;
      return {
        documentType: {
          id: this.extractId(docType),
          name: docType.name || "Tipo não encontrado",
          description: docType.description || null,
        },
        active: link.active,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        deletedAt: link.deletedAt,
      };
    });
  }

  /**
   * Lista vínculos convertidos para DTO
   */
  async getRequiredDocumentsAsDto(
    employeeId: string,
    status: string = "all"
  ): Promise<
    import("../../types/EmployeeServiceTypes").RequiredDocumentResponse[]
  > {
    const statusFilter = status as "active" | "inactive" | "all";
    const links = await this.linkRepo.findByEmployee(employeeId, statusFilter);

    return links.map((link) => {
      // Cast explícito - o repositório deve popular documentTypeId
      const populatedLink = {
        documentTypeId: link.documentTypeId as DocumentTypeDocument,
        active: link.active,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        deletedAt: link.deletedAt,
      };
      return this.toRequiredDocumentLinkDto(populatedLink);
    });
  }

  /**
   * Converte vínculos para RequiredDocumentLinkDto
   */
  private toRequiredDocumentLinkDto(link: {
    documentTypeId: DocumentTypeDocument;
    active: boolean;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
    deletedAt?: Date | undefined;
  }): import("../../types/EmployeeServiceTypes").RequiredDocumentResponse {
    // Trata casos onde documentTypeId é um objeto populado
    const docType = link.documentTypeId;
    const documentType = {
      id: this.extractId(docType),
      name: docType.name || "Nome não encontrado",
      description: docType.description || null,
    };

    return {
      documentType,
      active: link.active,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      deletedAt: link.deletedAt,
    };
  }

  /**
   * Restaura vínculo específico de tipo de documento
   *
   * @param employeeId - ID do colaborador
   * @param documentTypeId - ID do tipo de documento
   * @returns Promise<void>
   */
  async restoreDocumentTypeLink(
    employeeId: string,
    documentTypeId: string
  ): Promise<void> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Valida tipo de documento
    const documentType = await this.documentTypeRepo.findById(documentTypeId);
    if (!documentType) {
      throw new DocumentTypeNotFoundError(documentTypeId);
    }

    // Restaura ou cria vínculo
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
   * Remove vínculos duplicados para um colaborador
   * Mantém apenas o vínculo mais recente de cada tipo
   *
   * @param employeeId - ID do colaborador
   * @returns Promise<void>
   */
  async removeDuplicateLinks(employeeId: string): Promise<void> {
    const allLinks = await this.linkRepo.findByEmployee(employeeId, "all");

    // Agrupa por tipo de documento
    const linksByType = new Map<string, typeof allLinks>();

    for (const link of allLinks) {
      const docType = link.documentTypeId as DocumentTypeDocument;
      const typeId = this.extractId(docType);

      if (!linksByType.has(typeId)) {
        linksByType.set(typeId, []);
      }
      linksByType.get(typeId)!.push(link);
    }

    // Para cada tipo, manter apenas o mais recente e desativar os outros
    for (const [typeId, links] of linksByType) {
      if (links.length > 1) {
        // Ordena por data de criação (mais recente primeiro)
        links.sort(
          (a, b) =>
            new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
        );

        // Desativa todos exceto o primeiro (mais recente)
        for (let i = 1; i < links.length; i++) {
          await this.linkRepo.softDelete(employeeId, typeId);
        }
      }
    }
  }
}
