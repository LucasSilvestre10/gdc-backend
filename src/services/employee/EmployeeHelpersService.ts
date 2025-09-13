import { Injectable, Inject } from "@tsed/di";
import { EmployeeRepository } from "../../repositories/EmployeeRepository.js";
import { DocumentTypeRepository } from "../../repositories/DocumentTypeRepository.js";
import { DocumentRepository } from "../../repositories/DocumentRepository.js";
import { DocumentStatus } from "../../models/Document";
import {
  EmployeeNotFoundError,
  DocumentTypeNotFoundError,
  ValidationError,
} from "../../exceptions";

/**
 * Módulo com métodos auxiliares e helpers para o EmployeeService
 */
@Injectable()
export class EmployeeHelpers {
  constructor(
    @Inject() private employeeRepo: EmployeeRepository,
    @Inject() private documentTypeRepo: DocumentTypeRepository,
    @Inject() private documentRepo: DocumentRepository
  ) {}

  /**
   * Processa documentos obrigatórios com tratamento especial para CPF
   *
   * Funcionalidades:
   * - Processa lista de documentos obrigatórios na criação de colaborador
   * - Tratamento especial para CPF (usa document do colaborador)
   * - Criação automática de documentos como SENT ou PENDING
   * - Vinculação automática no embedded array para compatibilidade
   *
   * Regras de Negócio:
   * - CPF usa automaticamente o campo document do colaborador
   * - CPF é sempre marcado como SENT
   * - Outros documentos podem ser SENT (se têm valor) ou PENDING
   * - Valida que CPF fornecido confere com CPF do colaborador
   *
   * @param employeeId - ID do colaborador
   * @param requiredDocuments - Array com tipos e valores dos documentos
   */
  async processRequiredDocuments(
    employeeId: string,
    requiredDocuments: Array<{ documentTypeId: string; value?: string }>
  ): Promise<void> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    for (const reqDoc of requiredDocuments) {
      // Buscar o tipo de documento
      const documentType = await this.documentTypeRepo.findById(
        reqDoc.documentTypeId
      );
      if (!documentType) {
        throw new DocumentTypeNotFoundError(reqDoc.documentTypeId);
      }

      // Verificar se é tipo CPF
      const isCpfType = this.isCpfDocumentType(documentType.name);

      if (isCpfType) {
        // Validar valor do CPF se fornecido
        if (reqDoc.value && reqDoc.value !== employee.document) {
          throw new ValidationError(
            `CPF fornecido (${reqDoc.value}) não confere com o CPF de identificação do colaborador (${employee.document})`
          );
        }

        // Criar documento CPF automaticamente como SENT
        await this.documentRepo.create({
          value: employee.document,
          status: DocumentStatus.SENT,
          employeeId: employeeId,
          documentTypeId: reqDoc.documentTypeId,
        });
      } else {
        // Para outros documentos, criar como PENDING ou SENT
        await this.documentRepo.create({
          value: reqDoc.value || "",
          status: reqDoc.value ? DocumentStatus.SENT : DocumentStatus.PENDING,
          employeeId: employeeId,
          documentTypeId: reqDoc.documentTypeId,
        });
      }

      // Criar vínculo ativo no embedded array
      await this.employeeRepo.addRequiredTypes(employeeId, [
        reqDoc.documentTypeId,
      ]);
    }
  }

  /**
   * Verifica se um tipo de documento é CPF
   *
   * @param documentTypeName - Nome do tipo de documento
   * @returns true se for CPF, false caso contrário
   */
  isCpfDocumentType(documentTypeName: string): boolean {
    const name = documentTypeName.toLowerCase();
    return (
      name.includes("cpf") ||
      name.includes("cadastro de pessoa física") ||
      name === "cpf"
    );
  }
}
