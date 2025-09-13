import { Injectable, Inject } from "@tsed/di";
import { EmployeeRepository } from "../../repositories/EmployeeRepository.js";
import { Employee } from "../../models/Employee";
import { ValidationUtils } from "../../utils/ValidationUtils.js";
import { PaginationUtils } from "../../utils/PaginationUtils.js";
import { DuplicateEmployeeError, ValidationError } from "../../exceptions";

import type {
  ListFilter,
  PaginationOptions,
  PaginationResult,
} from "../../types/EmployeeServiceTypes";
import { getMongoId } from "../../types/EmployeeServiceTypes";

/**
 * Módulo responsável pelas operações CRUD básicas de colaboradores
 *
 * Seguindo o princípio de Responsabilidade Única (SRP):
 * - Gerencia apenas operações de criação, leitura, atualização e exclusão
 * - Não se envolve com documentos ou vínculos (responsabilidade de outros módulos)
 * - Validações básicas e integridade de dados do colaborador
 */
@Injectable()
export class EmployeeBasicOperations {
  constructor(@Inject() private employeeRepo: EmployeeRepository) {}

  /**
   * Helper para extrair ID do Mongoose
   */
  private extractId(doc: { _id: string | { toString(): string } }): string {
    return getMongoId(doc);
  }

  /**
   * Lista colaboradores ativos com paginação e filtros
   *
   * Funcionalidades:
   * - Delega para repositório com filtros de soft delete aplicados
   * - Suporta paginação para performance em grandes volumes
   * - Permite filtros customizados para busca específica
   * - Retorna dados estruturados para controle de paginação na API
   * - Validação de página existente
   *
   * @param filter - Filtros adicionais para busca (nome, documento, etc.)
   * @param opts - Opções de paginação { page, limit }
   * @returns Promise com lista paginada e total de registros
   */
  async list(
    filter: ListFilter = {},
    opts: PaginationOptions = {}
  ): Promise<PaginationResult<Employee>> {
    // Validação de status
    const allowedStatus = ["active", "inactive", "all"];
    if (filter.status && !allowedStatus.includes(filter.status)) {
      throw new ValidationError(
        `Parâmetro 'status' inválido: ${filter.status}`
      );
    }
    // Validação de paginação
    const page = Number(opts.page) || 1;
    const limit = Number(opts.limit) || 20;
    if (page < 1 || limit < 1) {
      throw new ValidationError(
        "Parâmetros de paginação devem ser maiores que zero"
      );
    }

    // Buscar dados primeiro para calcular total
    const result = await this.employeeRepo.list(filter, { page, limit });

    // Validar se a página solicitada existe
    PaginationUtils.validatePage(page, result.total, limit);

    return result;
  }

  /**
   * Busca colaborador ativo por ID
   *
   * Funcionalidades:
   * - Retorna apenas colaboradores ativos (soft delete)
   * - Usado para validações e consultas individuais
   * - Suporte a operações CRUD e validações de existência
   *
   * @param id - Identificador único do colaborador
   * @returns Promise com colaborador encontrado ou null
   */
  async findById(id: string): Promise<Employee | null> {
    // Valida formato do ObjectId
    ValidationUtils.validateObjectId(id, "ID do colaborador");

    return await this.employeeRepo.findById(id);
  }

  /**
   * Busca colaborador por documento (CPF) - método auxiliar
   */
  async findByDocument(document: string): Promise<Employee | null> {
    return await this.employeeRepo.findByDocument(document);
  }

  /**
   * Cria novo colaborador
   *
   * Regras de Negócio:
   * - CPF deve ser único entre colaboradores ativos (campo document)
   * - Dados obrigatórios validados pelo DTO
   * - Colaborador criado automaticamente como ativo
   *
   * @param data - Dados básicos do colaborador para criação
   * @returns Promise com colaborador criado
   * @throws BadRequest se CPF já existir
   */
  async create(data: {
    name: string;
    document: string;
    hiredAt: Date;
  }): Promise<Employee> {
    // Verificar se CPF já existe
    const existingEmployee = await this.employeeRepo.findByDocument(
      data.document
    );
    if (existingEmployee) {
      throw new DuplicateEmployeeError(data.document);
    }

    // Criar colaborador
    const employee = await this.employeeRepo.create({
      name: data.name,
      document: data.document,
      hiredAt: data.hiredAt || new Date(),
    });

    return employee;
  }

  /**
   * Atualiza dados de colaborador existente
   *
   * Funcionalidades:
   * - Atualiza apenas colaboradores ativos (soft delete aplicado)
   * - Valida existência antes da atualização
   * - Preserva integridade de dados relacionados
   * - Atualiza timestamp automaticamente
   *
   * @param id - ID do colaborador a ser atualizado
   * @param dto - Dados parciais para atualização
   * @returns Promise com colaborador atualizado ou null se não encontrado
   */
  async updateEmployee(
    id: string,
    dto: Partial<Employee>
  ): Promise<Employee | null> {
    // Valida formato do ObjectId
    ValidationUtils.validateObjectId(id, "ID do colaborador");

    // TODO: Adicionar validação de CPF único se document estiver no DTO
    // if (dto.document) { ... }

    return this.employeeRepo.update(id, dto);
  }

  /**
   * Soft delete de um colaborador
   *
   * Funcionalidades:
   * - Implementa desativação segura sem perda de dados
   * - Valida entrada e existência antes da operação
   * - Preserva histórico e relacionamentos para auditoria
   * - Permite reversão posterior através do método restore
   *
   * Regras de Negócio:
   * - ID obrigatório e válido
   * - Colaborador deve existir e estar ativo
   * - Operação é idempotente (pode ser chamada múltiplas vezes)
   * - Preserva documentos e vínculos para compliance
   *
   * @param id - ID do colaborador a ser desativado
   * @returns Promise<Employee | null> - Colaborador desativado ou null se não encontrado
   * @throws BadRequest se ID inválido
   */
  async delete(id: string): Promise<Employee | null> {
    // Validação de entrada
    if (!id?.trim()) {
      throw new ValidationError("ID é obrigatório");
    }

    // Valida formato do ObjectId
    ValidationUtils.validateObjectId(id, "ID do colaborador");

    // Verifica existência e status ativo do colaborador
    const employee = await this.employeeRepo.findById(id);
    if (!employee) {
      return null; // Colaborador não encontrado ou já inativo
    }

    // Executa soft delete preservando dados
    return await this.employeeRepo.softDelete(id);
  }

  /**
   * Reativa um colaborador (marca como ativo)
   *
   * Funcionalidades:
   * - Restaura colaborador previamente desativado
   * - Recupera acesso a todas as funcionalidades do sistema
   * - Remove marcadores de deleção mantendo histórico
   * - Operação complementar ao soft delete
   *
   * Regras de Negócio:
   * - ID obrigatório e válido
   * - Pode restaurar qualquer colaborador (ativo ou inativo)
   * - Operação é idempotente e segura
   * - Reativa vínculos e relacionamentos automaticamente
   *
   * @param id - ID do colaborador a ser reativado
   * @returns Promise<Employee | null> - Colaborador reativado ou null se não encontrado
   * @throws BadRequest se ID inválido
   */
  async restore(id: string): Promise<Employee | null> {
    // Validação de entrada
    if (!id?.trim()) {
      throw new ValidationError("ID é obrigatório");
    }

    // Executa restauração (não precisa validar status atual)
    return await this.employeeRepo.restore(id);
  }

  /**
   * Busca colaboradores por nome ou CPF
   *
   * Funcionalidades:
   * - Busca flexível por nome (case-insensitive) ou CPF (formatado ou não)
   * - Suporta paginação para performance
   * - Permite filtros de status (active, inactive, all)
   * - Delega busca complexa para repositório
   *
   * @param query - Termo de busca (nome ou CPF)
   * @param filters - Filtros de status
   * @param opts - Opções de paginação
   * @returns Promise com lista paginada e total de registros
   */
  async searchByNameOrCpf(
    query: string,
    filters: { status?: string } = {},
    opts: { page?: number; limit?: number } = {}
  ): Promise<{ items: Employee[]; total: number }> {
    return await this.employeeRepo.searchByNameOrCpf(query, filters, opts);
  }
}
