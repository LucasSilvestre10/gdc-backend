import { Injectable, Inject } from "@tsed/di";
import { EmployeeRepository } from "../../repositories/EmployeeRepository.js";
import { DocumentTypeRepository } from "../../repositories/DocumentTypeRepository.js";
import { DocumentRepository } from "../../repositories/DocumentRepository.js";
import { EmployeeDocumentTypeLinkRepository } from "../../repositories/EmployeeDocumentTypeLinkRepository.js";
import { Employee } from "../../models/Employee";
import { DocumentType } from "../../models/DocumentType";
import { DocumentStatus } from "../../models/Document";
import {
  EmployeeNotFoundError,
  DocumentTypeNotFoundError,
  ValidationError,
} from "../../exceptions";
import { ValidationUtils } from "../../utils/ValidationUtils.js";

import type {
  DocumentTypeDocument,
  DocumentWithId,
  EmployeeDocument,
  EnrichedEmployee,
  SentDocumentResponse,
  PendingDocumentResponse,
} from "../../types/EmployeeServiceTypes";
import { getMongoId } from "../../types/EmployeeServiceTypes";

/**
 * Módulo responsável pela gestão de documentação de colaboradores
 */
@Injectable()
export class EmployeeDocumentationService {
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
   * Obter status da documentação de um colaborador específico
   *
   * Funcionalidades:
   * 1. Valida existência do colaborador
   * 2. Busca vínculos ativos de documentos obrigatórios
   * 3. Consulta documentos já enviados com status SENT
   * 4. Classifica tipos como "enviados" ou "pendentes" com valores
   *
   * @param employeeId - ID do colaborador para consulta
   * @returns Promise com objetos { sent: [], pending: [] } contendo tipos e valores
   * @throws Error se colaborador não encontrado
   */
  async getDocumentationStatus(employeeId: string): Promise<{
    sent: Array<DocumentType & { documentValue?: string | null }>;
    pending: DocumentType[];
  }> {
    // Valida existência do colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new Error("Colaborador não encontrado");
    }

    // Obtém vínculos ativos de tipos de documento obrigatórios
    const activeLinks = await this.linkRepo.findByEmployee(
      employeeId,
      "active"
    );
    if (!activeLinks.length) {
      return { sent: [], pending: [] }; // Nenhum documento obrigatório
    }

    // Extrai IDs dos tipos vinculados
    const requiredTypeIds = activeLinks.map((link) => {
      const docType = link.documentTypeId as DocumentTypeDocument;
      return this.extractId(docType);
    });

    // Busca dados dos tipos obrigatórios
    const requiredTypes =
      await this.documentTypeRepo.findByIds(requiredTypeIds);

    // Consulta documentos já enviados pelo colaborador
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      documentTypeId: { $in: requiredTypeIds },
      status: DocumentStatus.SENT,
      isActive: true,
    });

    // Cria mapa com IDs dos tipos já enviados e seus valores
    const sentDocumentsMap = new Map(
      sentDocuments.map((doc) => [doc.documentTypeId.toString(), doc.value])
    );

    // Classifica tipos como enviados ou pendentes
    const sent = requiredTypes
      .filter((type) => {
        const docType = type as DocumentTypeDocument;
        return sentDocumentsMap.has(this.extractId(docType));
      })
      .map((type) => {
        const docType = type as DocumentTypeDocument;
        const typeId = this.extractId(docType);
        return {
          _id: docType._id,
          name: type.name,
          description: type.description,
          isActive: type.isActive,
          documentValue: sentDocumentsMap.get(typeId) || null,
        };
      });

    const pending = requiredTypes.filter((type) => {
      const docType = type as DocumentTypeDocument;
      return !sentDocumentsMap.has(this.extractId(docType));
    });

    return { sent, pending };
  }

  /**
   * Envia documento para colaborador
   *
   * Funcionalidades:
   * - Valida colaborador e tipo de documento
   * - Verifica vínculo ativo
   * - Atualiza documento existente ou cria novo
   * - Marca documento como SENT
   *
   * @param employeeId - ID do colaborador
   * @param documentTypeId - ID do tipo de documento
   * @param value - Valor textual do documento
   * @returns Promise<Document> - Documento criado/atualizado
   */
  async sendDocument(
    employeeId: string,
    documentTypeId: string,
    value: string
  ): Promise<import("../../models/Document").Document | null> {
    // Valida formato dos ObjectIds
    ValidationUtils.validateObjectId(employeeId, "ID do colaborador");
    ValidationUtils.validateObjectId(documentTypeId, "ID do tipo de documento");

    // Limpa formatação do valor do documento (remove pontos, hífens, etc.)
    const cleanValue = ValidationUtils.cleanDocumentValue(value);

    // Verifica se colaborador existe
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Verifica se tipo de documento existe
    const documentType = await this.documentTypeRepo.findById(documentTypeId);
    if (!documentType) {
      throw new DocumentTypeNotFoundError(documentTypeId);
    }

    // Verifica se há vínculo ativo entre colaborador e tipo de documento
    const links = await this.linkRepo.findByEmployee(employeeId, "active");
    const hasActiveLink = links.some((link) => {
      const docType = link.documentTypeId as unknown as DocumentTypeDocument;
      return this.extractId(docType) === documentTypeId;
    });

    if (!hasActiveLink) {
      throw new ValidationError(
        "Tipo de documento não está vinculado ao colaborador"
      );
    }

    // Verifica se já existe documento para este tipo e colaborador
    const existingDocs = await this.documentRepo.find({
      employeeId,
      documentTypeId,
      isActive: true,
    });

    if (existingDocs.length > 0) {
      // Atualiza documento existente
      const existingDoc = existingDocs[0] as DocumentWithId;
      const docId =
        typeof existingDoc._id === "string"
          ? existingDoc._id
          : existingDoc._id.toString();
      return await this.documentRepo.update(docId, {
        value: cleanValue,
        status: DocumentStatus.SENT,
        updatedAt: new Date(),
      });
    } else {
      // Cria novo documento
      return await this.documentRepo.create({
        value: cleanValue,
        status: DocumentStatus.SENT,
        employeeId,
        documentTypeId,
        isActive: true,
      });
    }
  }

  /**
   * Enriquece dados de colaboradores com informações de documentação
   * Usado para padronizar resposta em endpoints de busca/listagem
   *
   * @param employees - Lista de colaboradores
   * @returns Colaboradores com informações de documentação
   */
  async enrichEmployeesWithDocumentationInfo(
    employees: Employee[]
  ): Promise<EnrichedEmployee[]> {
    const enrichedEmployees = [];

    for (const employee of employees) {
      const employeeId = this.extractId(employee as EmployeeDocument);

      // Busca vínculos ativos (documentos obrigatórios)
      const activeLinks = await this.linkRepo.findByEmployee(
        employeeId,
        "active"
      );

      // Busca documentos enviados
      const sentDocuments = await this.documentRepo.find({
        employeeId,
        status: DocumentStatus.SENT,
        isActive: true,
      });

      // Calcula estatísticas de documentação
      const requiredCount = activeLinks.length;
      const sentCount = sentDocuments.length;
      const pendingCount = Math.max(0, requiredCount - sentCount);

      enrichedEmployees.push({
        id: this.extractId(employee as EmployeeDocument),
        name: employee.name,
        document: employee.document,
        hiredAt: employee.hiredAt,
        isActive: employee.isActive,
        createdAt: employee.createdAt,
        updatedAt: employee.updatedAt,
        // Informações de documentação adicionadas
        documentationSummary: {
          required: requiredCount,
          sent: sentCount,
          pending: pendingCount,
          total: requiredCount,
          hasRequiredDocuments: requiredCount > 0,
          isComplete: pendingCount === 0 && requiredCount > 0,
          completionPercentage:
            requiredCount > 0
              ? Math.round((sentCount / requiredCount) * 100)
              : 0,
        },
      });
    }

    return enrichedEmployees;
  }

  /**
   * Busca apenas documentos ENVIADOS de um colaborador
   *
   * Funcionalidades:
   * - Valida existência do colaborador
   * - Busca documentos com status SENT e ativos
   * - Retorna ID real do documento enviado
   * - Inclui informações completas do tipo de documento
   *
   * @param employeeId - ID do colaborador
   * @returns Promise<SentDocumentResponse[]> - Lista de documentos enviados
   */
  async getSentDocuments(employeeId: string): Promise<SentDocumentResponse[]> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Busca apenas documentos enviados
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      status: DocumentStatus.SENT,
      isActive: true,
    });

    // Mapeia para DTO com informações do tipo
    const result = [];
    for (const doc of sentDocuments) {
      const documentType = await this.documentTypeRepo.findById(
        doc.documentTypeId.toString()
      );

      result.push({
        id: this.extractId(
          doc as unknown as { _id: string | { toString(): string } }
        ), // ID real do documento
        documentType: {
          id: documentType
            ? this.extractId(documentType as DocumentTypeDocument)
            : doc.documentTypeId,
          name: documentType?.name || "Tipo não encontrado",
          description: documentType?.description || null,
        },
        status: doc.status,
        value: doc.value, // Valor já limpo
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    }

    return result;
  }

  /**
   * Busca apenas documentos PENDENTES de um colaborador
   *
   * Funcionalidades:
   * - Valida existência do colaborador
   * - Identifica tipos obrigatórios não enviados
   * - Retorna null para ID (documento ainda não existe)
   * - Inclui data desde quando é obrigatório
   *
   * @param employeeId - ID do colaborador
   * @returns Promise<PendingDocumentResponse[]> - Lista de documentos pendentes
   */
  async getPendingDocuments(
    employeeId: string
  ): Promise<PendingDocumentResponse[]> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Busca vínculos ativos
    const activeLinks = await this.linkRepo.findByEmployee(
      employeeId,
      "active"
    );
    if (!activeLinks.length) {
      return []; // Sem documentos obrigatórios
    }

    // Busca documentos já enviados
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      status: DocumentStatus.SENT,
      isActive: true,
    });

    // Mapeia IDs dos tipos já enviados
    const sentTypeIds = new Set(
      sentDocuments.map((doc) => doc.documentTypeId.toString())
    );

    // Identifica tipos pendentes (obrigatórios mas não enviados)
    const pendingTypes = [];
    const processedTypeIds = new Set(); // Para evitar duplicatas

    for (const link of activeLinks) {
      const docType = link.documentTypeId as DocumentTypeDocument;
      const typeId = this.extractId(docType);

      // Evitar processamento de tipos já processados (duplicatas)
      if (processedTypeIds.has(typeId)) {
        continue;
      }
      processedTypeIds.add(typeId);

      if (!sentTypeIds.has(typeId)) {
        const documentType = await this.documentTypeRepo.findById(typeId);

        pendingTypes.push({
          documentType: {
            id: typeId,
            name: documentType?.name || "Tipo não encontrado",
            description: documentType?.description || null,
          },
          status: "PENDING",
          value: null,
          isActive: link.active,
          requiredSince: link.createdAt,
        });
      }
    }

    return pendingTypes;
  }
}
