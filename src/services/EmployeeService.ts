import { Injectable, Inject } from "@tsed/di";
import { 
  EmployeeNotFoundError, 
  DocumentTypeNotFoundError, 
  DuplicateEmployeeError,
  InvalidObjectIdError,
  ConflictError,
  ValidationError
} from "../exceptions";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { DocumentTypeRepository } from "../repositories/index.js";
import { DocumentRepository } from "../repositories/DocumentRepository.js";
import { EmployeeDocumentTypeLinkRepository } from "../repositories/EmployeeDocumentTypeLinkRepository.js";
import { Employee } from "../models/Employee";
import { DocumentType } from "../models/DocumentType";
import { DocumentStatus } from "../models/Document";
import { ValidationUtils } from "../utils/ValidationUtils.js";

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
    @Inject() private documentRepo: DocumentRepository,
    @Inject() private linkRepo: EmployeeDocumentTypeLinkRepository
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
    try {
      // Valida formato do ObjectId
      ValidationUtils.validateObjectId(id, 'ID do colaborador');
      
      return await this.employeeRepo.findById(id);
    } catch (error: any) {
      // Trata erros de cast do Mongoose
      if (ValidationUtils.isCastError(error)) {
        throw new InvalidObjectIdError('ID do colaborador');
      }
      throw error;
    }
  }

  /**
   * Cria novo colaborador com tratamento inteligente de CPF
   * 
   * Regras de Negócio:
   * - CPF deve ser único entre colaboradores ativos (campo document)
   * - Dados obrigatórios validados pelo DTO
   * - Colaborador criado automaticamente como ativo
   * - Tratamento especial quando CPF é também documento obrigatório:
   *   * Valida se valor confere com CPF de identificação
   *   * Cria documento CPF automaticamente como SENT
   *   * Evita duplicação de dados
   * 
   * @param dto - Dados do colaborador para criação
   * @returns Promise com colaborador criado
   * @throws BadRequest se CPF já existir, dados inválidos ou inconsistência
   */
  async create(dto: any): Promise<Employee> {
    // Verificar se CPF já existe
    const existingEmployee = await this.employeeRepo.findByDocument(dto.document);
    if (existingEmployee) {
      throw new DuplicateEmployeeError(dto.document);
    }

    // Criar colaborador
    const employee = await this.employeeRepo.create({
      name: dto.name,
      document: dto.document,
      hiredAt: dto.hiredAt || new Date()
    });

    // Processar documentos obrigatórios se fornecidos
    if (dto.requiredDocuments?.length) {
      await this.processRequiredDocuments((employee as any)._id.toString(), dto.requiredDocuments);
    }

    return employee;
  }

  /**
   * Processa documentos obrigatórios com tratamento especial para CPF
   */
  private async processRequiredDocuments(
    employeeId: string, 
    requiredDocuments: Array<{ documentTypeId: string; value?: string }>
  ): Promise<void> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    for (const reqDoc of requiredDocuments) {
      // Buscar o tipo de documento
      const documentType = await this.documentTypeRepo.findById(reqDoc.documentTypeId);
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
          documentTypeId: reqDoc.documentTypeId
        });
      } else {
        // Para outros documentos, criar como PENDING ou SENT
        await this.documentRepo.create({
          value: reqDoc.value || "",
          status: reqDoc.value ? DocumentStatus.SENT : DocumentStatus.PENDING,
          employeeId: employeeId,
          documentTypeId: reqDoc.documentTypeId
        });
      }

      // Criar vínculo ativo no embedded array
      await this.employeeRepo.addRequiredTypes(employeeId, [reqDoc.documentTypeId]);
    }
  }

  /**
   * Verifica se um tipo de documento é CPF
   */
  private isCpfDocumentType(documentTypeName: string): boolean {
    const name = documentTypeName.toLowerCase();
    return name.includes('cpf') || 
           name.includes('cadastro de pessoa física') ||
           name === 'cpf';
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
    // Valida formato do ObjectId
    ValidationUtils.validateObjectId(id, 'ID do colaborador');
    
    // TODO: Adicionar validação de CPF único se document estiver no DTO
    // if (dto.document) { ... }
    
    return this.employeeRepo.update(id, dto);
  }

  /**
   * Busca colaboradores por nome ou CPF (campos do modelo Employee)
   */
  async searchByNameOrCpf(
    query: string,
    filters: any = {}
  ): Promise<{ items: Employee[]; total: number }> {
    // Extrai opções de paginação dos filtros
    const opts = {
      page: filters.page || 1,
      limit: filters.limit || 20
    };
    
    // Busca unificada por nome ou CPF com paginação no MongoDB
    return await this.employeeRepo.searchByNameOrCpf(query, filters, opts);
  }

  /**
   * Valida formato de CPF
   */
  private isValidCpfFormat(value: string): boolean {
    return /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value);
  }

  /**
   * Verifica se colaborador atende ao filtro de status
   */
  private matchesStatusFilter(employee: Employee, status?: 'active' | 'inactive' | 'all'): boolean {
    if (!status || status === 'all') return true;
    if (status === 'active') return employee.isActive === true;
    if (status === 'inactive') return employee.isActive === false;
    return true;
  }

  /**
   * Vincula tipos de documento obrigatórios com tratamento especial para CPF
   * 
   * Funcionalidades:
   * - Implementa vinculação múltipla de tipos de documento
   * - Valida existência de todos os tipos antes da vinculação
   * - Tratamento especial quando CPF é documento obrigatório
   * - Cria documento CPF automaticamente como SENT
   * 
   * @param employeeId - ID do colaborador para vincular tipos
   * @param typeIds - Array de IDs dos tipos de documentos a vincular
   * @returns Promise<void>
   * @throws BadRequest se algum tipo não existir ou colaborador inativo
   */
  async linkDocumentTypes(employeeId: string, typeIds: string[]): Promise<void> {
    if (!typeIds?.length) return;

    // Validar ObjectIds
    ValidationUtils.validateObjectId(employeeId, 'ID do colaborador');
    for (const typeId of typeIds) {
      ValidationUtils.validateObjectId(typeId, 'ID do tipo de documento');
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

    for (const documentTypeId of typeIds) {
      // Criar vínculo na tabela de links
      await this.linkRepo.create(employeeId, documentTypeId);
      
      // Verificar se é CPF e criar documento automaticamente
      const documentType = documentTypes.find(dt => (dt as any)._id.toString() === documentTypeId);
      if (documentType && this.isCpfDocumentType(documentType.name)) {
        // Criar documento CPF automaticamente como SENT
        await this.documentRepo.create({
          value: employee.document,
          status: DocumentStatus.SENT,
          employeeId,
          documentTypeId
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
    
    // Desativar vínculos na tabela de links
    for (const documentTypeId of typeIds) {
      await this.linkRepo.softDelete(employeeId, documentTypeId);
    }
    
    // Executa desvinculação no embedded array (manter compatibilidade)
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
   * - Inclui valores dos documentos enviados
   * 
   * Algoritmo:
   * 1. Valida existência do colaborador
   * 2. Obtém tipos de documento obrigatórios vinculados (nova tabela de links)
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
    const activeLinks = await this.linkRepo.findByEmployee(employeeId, 'active');
    if (!activeLinks.length) {
      return { sent: [], pending: [] }; // Nenhum documento obrigatório
    }

    // Extrai IDs dos tipos vinculados
    const requiredTypeIds = activeLinks.map(link => 
      (link.documentTypeId as any)._id?.toString() || link.documentTypeId.toString()
    );

    // Busca dados dos tipos obrigatórios
    const requiredTypes = await this.documentTypeRepo.findByIds(requiredTypeIds);

    // Consulta documentos já enviados pelo colaborador
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      documentTypeId: { $in: requiredTypeIds },
      status: DocumentStatus.SENT,
      isActive: true
    });

    // Cria mapa com IDs dos tipos já enviados e seus valores
    const sentDocumentsMap = new Map(
      sentDocuments.map(doc => [doc.documentTypeId.toString(), doc.value])
    );

    // Classifica tipos como enviados ou pendentes
    const sent = requiredTypes
      .filter(type => sentDocumentsMap.has((type as any)._id?.toString() ?? ""))
      .map(type => ({
        _id: (type as any)._id,
        name: type.name,
        description: type.description,
        isActive: type.isActive,
        documentValue: sentDocumentsMap.get((type as any)._id?.toString() ?? "") || null
      }));
    
    const pending = requiredTypes.filter(type => 
      !sentDocumentsMap.has((type as any)._id?.toString() ?? "")
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
      throw new ValidationError("ID é obrigatório");
    }
    
    // Valida formato do ObjectId
    ValidationUtils.validateObjectId(id, 'ID do colaborador');

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
      throw new ValidationError("ID é obrigatório");
    }

    // Executa restauração (não precisa validar status atual)
    return await this.employeeRepo.restore(id);
  }

  /**
   * Lista vínculos de tipos de documento do colaborador
   * 
   * @param employeeId - ID do colaborador
   * @param status - Filtro de status (active|inactive|all)
   * @returns Promise com lista de vínculos
   */
  async getRequiredDocuments(employeeId: string, status: string = "all"): Promise<any[]> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    const statusFilter = status as 'active' | 'inactive' | 'all';
    const links = await this.linkRepo.findByEmployee(employeeId, statusFilter);
    
    return links.map(link => ({
      documentType: link.documentTypeId,
      active: link.active,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      deletedAt: link.deletedAt
    }));
  }

  /**
   * Restaura vínculo específico de tipo de documento
   * 
   * @param employeeId - ID do colaborador
   * @param documentTypeId - ID do tipo de documento
   * @returns Promise<void>
   */
  async restoreDocumentTypeLink(employeeId: string, documentTypeId: string): Promise<void> {
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
    const existingLink = await this.linkRepo.findLink(employeeId, documentTypeId);
    if (existingLink) {
      await this.linkRepo.restore(employeeId, documentTypeId);
    } else {
      await this.linkRepo.create(employeeId, documentTypeId);
    }
  }

  /**
   * Lista documentos do colaborador
   * 
   * @param employeeId - ID do colaborador
   * @param status - Filtro de status (active|inactive|all)
   * @returns Promise com lista de documentos
   */
  async getEmployeeDocuments(employeeId: string, status: string = "all"): Promise<{
    documents: any[];
    hasRequiredDocuments: boolean;
    message?: string;
  }> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Verifica se há tipos de documento vinculados
    const activeLinks = await this.linkRepo.findByEmployee(employeeId, 'active');
    const hasRequiredDocuments = activeLinks.length > 0;

    // Constrói filtro baseado no status
    let filter: any = { employeeId };
    
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
    // Para 'all', não aplica filtro de isActive

    // Busca documentos do colaborador
    const documents = await this.documentRepo.find(filter);

    // Converte para DTO com dados do tipo de documento
    const result = [];
    for (const doc of documents) {
      const documentType = await this.documentTypeRepo.findById(doc.documentTypeId.toString());
      
      result.push({
        id: (doc as any)._id,
        value: doc.value,
        status: doc.status,
        documentType: {
          id: documentType ? (documentType as any)._id : doc.documentTypeId,
          name: documentType?.name || 'Tipo não encontrado',
          description: documentType?.description || null
        },
        employee: {
          id: (employee as any)._id,
          name: employee.name
        },
        isActive: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        deletedAt: doc.deletedAt
      });
    }

    // Retorna dados estruturados com informação sobre vínculos
    return {
      documents: result,
      hasRequiredDocuments,
      message: !hasRequiredDocuments ? 
        "Nenhum tipo de documento vinculado a este colaborador" : 
        undefined
    };
  }

  /**
   * Converte Employee para EmployeeListDto
   */
  private toEmployeeListDto(employee: Employee): any {
    return {
      id: (employee as any)._id,
      name: employee.name,
      document: employee.document,
      hiredAt: employee.hiredAt,
      isActive: employee.isActive,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
      deletedAt: employee.deletedAt
    };
  }

  /**
   * Lista colaboradores convertidos para DTO
   */
  async listAsDto(filter: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: any[]; total: number }> {
    const result = await this.list(filter, opts);
    return {
      items: result.items.map(emp => this.toEmployeeListDto(emp)),
      total: result.total
    };
  }

  /**
   * Converte vínculos para RequiredDocumentLinkDto
   */
  private toRequiredDocumentLinkDto(link: any): any {
    // Trata casos onde documentTypeId pode ser string ou objeto populado
    const documentType = typeof link.documentTypeId === 'string' 
      ? { id: link.documentTypeId, name: 'Tipo de documento', description: null }
      : {
          id: link.documentTypeId._id || link.documentTypeId.id || link.documentTypeId,
          name: link.documentTypeId.name || 'Nome não encontrado',
          description: link.documentTypeId.description || null
        };

    return {
      documentType,
      active: link.active,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      deletedAt: link.deletedAt
    };
  }

  /**
   * Lista vínculos convertidos para DTO
   */
  async getRequiredDocumentsAsDto(employeeId: string, status: string = "all"): Promise<any[]> {
    const statusFilter = status as 'active' | 'inactive' | 'all';
    const links = await this.linkRepo.findByEmployee(employeeId, statusFilter);
    
    return links.map(link => {
      // O documentTypeId vem populado como objeto completo
      const docType = link.documentTypeId as any;
      
      return {
        documentType: {
          id: docType._id?.toString() || docType.toString(),
          name: docType.name || 'Nome não encontrado',
          description: docType.description || null
        },
        active: link.active,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        deletedAt: link.deletedAt
      };
    });
  }

  /**
   * Envia um documento do colaborador
   * 
   * Funcionalidades:
   * - Valida se colaborador e tipo de documento existem
   * - Verifica se há vínculo ativo entre colaborador e tipo
   * - Cria ou atualiza documento existente
   * - Marca documento como SENT
   * 
   * @param employeeId - ID do colaborador
   * @param documentTypeId - ID do tipo de documento
   * @param value - Valor textual do documento
   * @returns Promise<Document> - Documento criado/atualizado
   */
  async sendDocument(employeeId: string, documentTypeId: string, value: string): Promise<any> {
    // Valida formato dos ObjectIds
    ValidationUtils.validateObjectId(employeeId, 'ID do colaborador');
    ValidationUtils.validateObjectId(documentTypeId, 'ID do tipo de documento');

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
    const links = await this.linkRepo.findByEmployee(employeeId, 'active');
    const hasActiveLink = links.some(link => 
      (link.documentTypeId as any)._id?.toString() === documentTypeId
    );

    if (!hasActiveLink) {
      throw new ValidationError("Tipo de documento não está vinculado ao colaborador");
    }

    // Verifica se já existe documento para este tipo e colaborador
    const existingDocs = await this.documentRepo.find({
      employeeId,
      documentTypeId,
      isActive: true
    });

    if (existingDocs.length > 0) {
      // Atualiza documento existente
      const existingDoc = existingDocs[0];
      return await this.documentRepo.update((existingDoc as any)._id, {
        value: cleanValue,
        status: DocumentStatus.SENT,
        updatedAt: new Date()
      });
    } else {
      // Cria novo documento
      return await this.documentRepo.create({
        value: cleanValue,
        status: DocumentStatus.SENT,
        employeeId,
        documentTypeId,
        isActive: true
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
  async enrichEmployeesWithDocumentationInfo(employees: Employee[]): Promise<any[]> {
    const enrichedEmployees = [];

    for (const employee of employees) {
      const employeeId = (employee as any)._id.toString();
      
      // Busca vínculos ativos (documentos obrigatórios)
      const activeLinks = await this.linkRepo.findByEmployee(employeeId, 'active');
      
      // Busca documentos enviados
      const sentDocuments = await this.documentRepo.find({
        employeeId,
        status: DocumentStatus.SENT,
        isActive: true
      });

      // Calcula estatísticas de documentação
      const requiredCount = activeLinks.length;
      const sentCount = sentDocuments.length;
      const pendingCount = Math.max(0, requiredCount - sentCount);

      enrichedEmployees.push({
        id: (employee as any)._id,
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
          hasRequiredDocuments: requiredCount > 0,
          isComplete: pendingCount === 0 && requiredCount > 0
        }
      });
    }

    return enrichedEmployees;
  }

  // ==========================================
  // 🎯 MÉTODOS SOLID - SINGLE RESPONSIBILITY
  // ==========================================

  /**
   * Busca apenas documentos ENVIADOS de um colaborador
   * 
   * SOLID: Single Responsibility - apenas documentos com status SENT
   * 
   * @param employeeId - ID do colaborador
   * @returns Promise<DocumentDetailDto[]> - Lista de documentos enviados
   */
  async getSentDocuments(employeeId: string): Promise<any[]> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Busca apenas documentos enviados
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      status: DocumentStatus.SENT,
      isActive: true
    });

    // Mapeia para DTO com informações do tipo
    const result = [];
    for (const doc of sentDocuments) {
      const documentType = await this.documentTypeRepo.findById(doc.documentTypeId.toString());
      
      result.push({
        id: (doc as any)._id,
        documentType: {
          id: (documentType as any)?._id || doc.documentTypeId,
          name: documentType?.name || 'Tipo não encontrado',
          description: documentType?.description || null
        },
        status: doc.status,
        value: doc.value, // Valor já limpo
        active: doc.isActive,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      });
    }

    return result;
  }

  /**
   * Busca apenas documentos PENDENTES de um colaborador
   * 
   * SOLID: Single Responsibility - apenas tipos obrigatórios sem documento enviado
   * 
   * @param employeeId - ID do colaborador
   * @returns Promise<DocumentTypeDto[]> - Lista de tipos pendentes
   */
  async getPendingDocuments(employeeId: string): Promise<any[]> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Busca vínculos ativos
    const activeLinks = await this.linkRepo.findByEmployee(employeeId, 'active');
    if (!activeLinks.length) {
      return []; // Sem documentos obrigatórios
    }

    // Busca documentos já enviados
    const sentDocuments = await this.documentRepo.find({
      employeeId,
      status: DocumentStatus.SENT,
      isActive: true
    });

    // Mapeia IDs dos tipos já enviados
    const sentTypeIds = new Set(
      sentDocuments.map(doc => doc.documentTypeId.toString())
    );

    // Identifica tipos pendentes (obrigatórios mas não enviados)
    const pendingTypes = [];
    for (const link of activeLinks) {
      const typeId = (link.documentTypeId as any)._id?.toString() || link.documentTypeId.toString();
      
      if (!sentTypeIds.has(typeId)) {
        const documentType = await this.documentTypeRepo.findById(typeId);
        
        pendingTypes.push({
          documentType: {
            id: typeId,
            name: documentType?.name || 'Tipo não encontrado',
            description: documentType?.description || null
          },
          status: 'PENDING',
          value: null,
          active: link.active,
          requiredSince: link.createdAt
        });
      }
    }

    return pendingTypes;
  }

  /**
   * Overview completo da documentação de um colaborador
   * 
   * SOLID: Single Responsibility - combina enviados + pendentes para visão geral
   * 
   * @param employeeId - ID do colaborador
   * @returns Promise<OverviewDto> - Overview completo
   */
  async getDocumentationOverview(employeeId: string): Promise<any> {
    // Valida colaborador
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new EmployeeNotFoundError(employeeId);
    }

    // Usa os métodos específicos (composição seguindo SOLID)
    const sentDocuments = await this.getSentDocuments(employeeId);
    const pendingDocuments = await this.getPendingDocuments(employeeId);

    // Combina em um overview estruturado
    const allDocuments = [
      ...sentDocuments,
      ...pendingDocuments
    ];

    return {
      total: allDocuments.length,
      sent: sentDocuments.length,
      pending: pendingDocuments.length,
      documents: allDocuments,
      lastUpdated: new Date().toISOString()
    };
  }
}