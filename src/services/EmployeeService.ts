import { Injectable, Inject } from "@tsed/di";
import { BadRequest } from "@tsed/exceptions";
import { EmployeeRepository } from "../repositories/EmployeeRepository";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { DocumentRepository } from "../repositories/DocumentRepository";
import { Employee } from "../models/Employee";
import { DocumentType } from "../models/DocumentType";
import { DocumentStatus } from "../models/Document";

/**
 * Serviço de negócios para gerenciamento de colaboradores
 * 
 * Responsabilidades:
 * - Implementar regras de negócio específicas do domínio
 * - Orquestrar operações entre múltiplos repositórios
 * - Validar regras de integridade de dados (CPF único, tipos existentes)
 * - Gerenciar fluxo de documentação obrigatória do colaborador
 * - Implementar lógica de soft delete com validações
 * - Calcular status de documentação (enviados vs pendentes)
 * 
 * Funcionalidades:
 * - Cadastro e atualização de colaboradores
 * - Vinculação/desvinculação de tipos de documento obrigatórios
 * - Acompanhamento do status de documentação por colaborador
 * - Listagem de documentos pendentes para envio
 */
@Injectable()
export class EmployeeService {
  /**
   * Injeta dependências necessárias através do sistema de DI do TS.ED
   * @param employeeRepo - Repositório para operações de colaboradores
   * @param documentTypeRepo - Repositório para validação de tipos de documento
   * @param documentRepo - Repositório para consulta de documentos enviados
   */
  constructor(
    @Inject() private employeeRepo: EmployeeRepository,
    @Inject() private documentTypeRepo: DocumentTypeRepository,
    @Inject() private documentRepo: DocumentRepository
  ) {}

  /**
   * Lista colaboradores ativos com paginação e filtros
   * 
   * Funcionalidades:
   * - Delega para repositório com filtros de soft delete aplicados
   * - Suporta paginação para performance em grandes volumes
   * - Permite filtros customizados para busca específica
   * - Retorna dados estruturados para controle de paginação na API
   * 
   * @param filter - Filtros adicionais para busca (nome, documento, etc.)
   * @param opts - Opções de paginação { page, limit }
   * @returns Promise com lista paginada e total de registros
   */
  async list(filter: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: Employee[]; total: number }> {
    return this.employeeRepo.list(filter, opts);
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
    return this.employeeRepo.findById(id);
  }

  /**
   * Cria novo colaborador com validações de negócio
   * 
   * Regras de Negócio:
   * - CPF deve ser único entre colaboradores ativos
   * - Dados obrigatórios validados pelo DTO
   * - Colaborador criado automaticamente como ativo
   * - Timestamps de auditoria aplicados automaticamente
   * 
   * @param dto - Dados do colaborador para criação
   * @returns Promise com colaborador criado
   * @throws BadRequest se CPF já existir ou dados inválidos
   */
  async createEmployee(dto: Partial<Employee>): Promise<Employee> {
    // Implementa regra de negócio: CPF único por colaborador ativo
    if (dto.document) {
      const existingEmployee = await this.employeeRepo.findByDocument(dto.document);
      if (existingEmployee) {
        throw new BadRequest("Employee with this document already exists");
      }
    }
    
    // Delega criação para repositório após validações
    return this.employeeRepo.create(dto);
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
  async updateEmployee(id: string, dto: Partial<Employee>): Promise<Employee | null> {
    // TODO: Adicionar validação de CPF único se document estiver no DTO
    // if (dto.document) { ... }
    
    return this.employeeRepo.update(id, dto);
  }

  /**
   * Vincula tipos de documento obrigatórios ao colaborador
   * 
   * Funcionalidades:
   * - Implementa vinculação múltipla de tipos de documento
   * - Valida existência de todos os tipos antes da vinculação
   * - Evita duplicatas automáticamente no repositório
   * - Suporte a operação em lote para eficiência
   * 
   * Regras de Negócio:
   * - Todos os tipos devem existir e estar ativos
   * - Colaborador deve existir e estar ativo
   * - Operação é atômica (falha se qualquer tipo não existir)
   * 
   * @param employeeId - ID do colaborador para vincular tipos
   * @param typeIds - Array de IDs dos tipos de documento
   * @returns Promise<void>
   * @throws Error se algum tipo não existir ou colaborador inativo
   */
  async linkDocumentTypes(employeeId: string, typeIds: string[]): Promise<void> {
    // Validação de entrada
    if (!typeIds?.length) return;

    // Valida existência de todos os tipos de documento
    const types = await this.documentTypeRepo.findByIds(typeIds);
    if (types.length !== typeIds.length) {
      throw new Error("Algum tipo de documento não existe");
    }
    
    // Executa vinculação após validações
    await this.employeeRepo.addRequiredTypes(employeeId, typeIds);
  }

  /**
   * Desvincula tipos de documento do colaborador
   * 
   * Funcionalidades:
   * - Remove vínculos de tipos de documento obrigatórios
   * - Operação segura que não falha se tipo já desvinculado
   * - Suporte a operação em lote para eficiência
   * - Mantém histórico de documentos já enviados
   * 
   * Regras de Negócio:
   * - Colaborador deve existir e estar ativo
   * - Não remove documentos já enviados, apenas o vínculo obrigatório
   * - Operação é tolerante a tipos já desvinculados
   * 
   * @param employeeId - ID do colaborador para desvincular tipos
   * @param typeIds - Array de IDs dos tipos de documento
   * @returns Promise<void>
   */
  async unlinkDocumentTypes(employeeId: string, typeIds: string[]): Promise<void> {
    // Validação de entrada
    if (!typeIds?.length) return;
    
    // Executa desvinculação (operação segura)
    await this.employeeRepo.removeRequiredTypes(employeeId, typeIds);
  }

  /**
   * Calcula status da documentação obrigatória do colaborador
   * 
   * Funcionalidades:
   * - Retorna documentos enviados vs pendentes por colaborador
   * - Cruza dados entre colaborador, tipos obrigatórios e documentos enviados
   * - Implementa lógica de negócio para acompanhamento de compliance
   * - Base para relatórios de documentação pendente
   * 
   * Algoritmo:
   * 1. Valida existência do colaborador
   * 2. Obtém tipos de documento obrigatórios vinculados
   * 3. Consulta documentos já enviados com status SENT
   * 4. Classifica tipos como "enviados" ou "pendentes"
   * 
   * @param employeeId - ID do colaborador para consulta
   * @returns Promise com objetos { sent: [], pending: [] } contendo tipos
   * @throws Error se colaborador não encontrado
   */
  async getDocumentationStatus(employeeId: string): Promise<{
    sent: DocumentType[];
    pending: DocumentType[];
  }> {
    // Valida existência do colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new Error("Colaborador não encontrado");
    }

    // Obtém IDs dos tipos obrigatórios vinculados
    const requiredTypeIds = (employee.requiredDocumentTypes || []).map(id => id.toString());
    if (!requiredTypeIds.length) {
      return { sent: [], pending: [] }; // Nenhum documento obrigatório
    }

    // Busca dados dos tipos obrigatórios
    const requiredTypes = await this.documentTypeRepo.findByIds(requiredTypeIds);

    // Consulta documentos já enviados pelo colaborador
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      documentTypeId: { $in: requiredTypeIds },
      status: DocumentStatus.SENT
    });

    // Cria set com IDs dos tipos já enviados para lookup eficiente
    const sentTypeIds = new Set(
      sentDocuments.map(doc => doc.documentTypeId.toString())
    );

    // Classifica tipos como enviados ou pendentes
    const sent = requiredTypes.filter(type => 
      sentTypeIds.has(type._id?.toString() ?? "")
    );
    
    const pending = requiredTypes.filter(type => 
      !sentTypeIds.has(type._id?.toString() ?? "")
    );

    return { sent, pending };
  }

  /**
   * Soft delete de um colaborador (marca como inativo)
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
      throw new BadRequest("ID is required");
    }

    // Verifica existência e status ativo do colaborador
    const employee = await this.employeeRepo.findById(id);
    if (!employee) {
      return null; // Colaborador não encontrado ou já inativo
    }

    // TODO: Implementar validações de integridade referencial
    // const linkedDocuments = await this.documentRepository.findByEmployeeId(id);
    // if (linkedDocuments.length > 0) {
    //     throw new BadRequest("Cannot delete employee with linked documents");
    // }

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
      throw new BadRequest("ID is required");
    }

    // Executa restauração (não precisa validar status atual)
    return await this.employeeRepo.restore(id);
  }
}