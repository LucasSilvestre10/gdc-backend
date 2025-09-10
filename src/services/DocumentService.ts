import { Injectable, Inject } from "@tsed/di";
import { Types } from "mongoose";
import { DocumentRepository } from "../repositories/DocumentRepository.js";
import { DocumentTypeRepository } from "../repositories/index.js";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { Document, DocumentStatus } from "../models/Document";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { DOCUMENT_REPOSITORY_TOKEN, DOCUMENT_TYPE_REPOSITORY_TOKEN, EMPLOYEE_REPOSITORY_TOKEN } from "../config/providers.js";
import { 
    ListPendingDocumentsDto, 
    PendingDocumentResponseDto, 
    PendingDocumentsListResponseDto 
} from "../dtos/documentDTO";

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
     */
    constructor(
        @Inject(DOCUMENT_REPOSITORY_TOKEN) private documentRepository: DocumentRepository,
        @Inject(DOCUMENT_TYPE_REPOSITORY_TOKEN) private documentTypeRepository: DocumentTypeRepository,
        @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: EmployeeRepository
    ) {}

    /**
     * Cria um novo documento
     * @param dto - Dados do documento a ser criado
     * @returns Promise<Document> - Documento criado
     * @throws BadRequest - Se dados inválidos ou IDs malformados
     * @throws NotFound - Se funcionário ou tipo de documento não existir
     */
    async createDocument(dto: {
        employeeId: string;
        documentTypeId: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        mimeType: string;
    }): Promise<Document> {
        // Valida formato dos ObjectIds
        if (!Types.ObjectId.isValid(dto.employeeId)) {
            throw new BadRequest("Invalid employeeId format");
        }

        if (!Types.ObjectId.isValid(dto.documentTypeId)) {
            throw new BadRequest("Invalid documentTypeId format");
        }

        // Valida dados obrigatórios
        if (!dto.fileName?.trim() || !dto.filePath?.trim() || !dto.mimeType?.trim()) {
            throw new BadRequest("Missing required fields: fileName, filePath, mimeType");
        }

        // Valida fileSize separadamente para dar mensagem mais específica
        if (!dto.fileSize) {
            throw new BadRequest("Missing required field: fileSize");
        }

        if (dto.fileSize <= 0) {
            throw new BadRequest("File size must be greater than 0");
        }

        // Valida se o funcionário existe
        const employee = await this.employeeRepository.findById(dto.employeeId);
        if (!employee) {
            throw new NotFound("Employee not found");
        }

        // Valida se o tipo de documento existe
        const documentType = await this.documentTypeRepository.findById(dto.documentTypeId);
        if (!documentType) {
            throw new NotFound("Document type not found");
        }

        // Cria o documento com IDs como string
        const documentData = {
            employeeId: dto.employeeId,
            documentTypeId: dto.documentTypeId,
            fileName: dto.fileName.trim(),
            filePath: dto.filePath.trim(),
            fileSize: dto.fileSize,
            mimeType: dto.mimeType.trim(),
            status: 'pending' as Document['status'],
            uploadDate: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return await this.documentRepository.create(documentData);
    }

    /**
     * Lista documentos pendentes usando lógica de negócio avançada (Dia 5)
     * 
     * Lógica de "Pendentes":
     * 1. Busca colaboradores ativos (com filtro opcional por employeeId)
     * 2. Para cada colaborador, identifica tipos de documento obrigatórios vinculados
     * 3. Busca documentos já enviados (status SENT) pelo colaborador
     * 4. Calcula diferença: tipos obrigatórios - tipos já enviados = tipos pendentes
     * 5. Cria "documentos virtuais" representando as pendências
     * 6. Aplica paginação nos resultados finais
     * 
     * Funcionalidades:
     * - Lógica no service (escolhida em vez de aggregation MongoDB)
     * - Filtros opcionais por employeeId e documentTypeId
     * - Paginação completa com metadados
     * - Performance otimizada com Sets para lookup
     * - Validação rigorosa de parâmetros de entrada
     * 
     * @param dto - Filtros de busca e opções de paginação
     * @returns Promise<PendingDocumentsListResponseDto> - Lista paginada de documentos pendentes
     * @throws BadRequest - Se parâmetros são inválidos
     */
    async listPending(dto: ListPendingDocumentsDto): Promise<PendingDocumentsListResponseDto> {
        const { page = 1, limit = 10, employeeId, documentTypeId } = dto;
        
        // Validar parâmetros de entrada
        if (employeeId && !Types.ObjectId.isValid(employeeId)) {
            throw new BadRequest("employeeId inválido - deve ser um ObjectId válido");
        }
        
        if (documentTypeId && !Types.ObjectId.isValid(documentTypeId)) {
            throw new BadRequest("documentTypeId inválido - deve ser um ObjectId válido");
        }

        if (page < 1) {
            throw new BadRequest("page deve ser maior que 0");
        }

        if (limit < 1 || limit > 100) {
            throw new BadRequest("limit deve estar entre 1 e 100");
        }

        // ETAPA 1: Buscar colaboradores ativos (com filtro opcional)
        const employeeFilter: any = {};
        if (employeeId) {
            employeeFilter._id = employeeId;
        }

        const employeesData = await this.employeeRepository.list(employeeFilter, { page: 1, limit: 1000 });
        const employees = employeesData.items;

        if (employees.length === 0) {
            return {
                documents: [],
                total: 0,
                page,
                totalPages: 0,
                limit
            };
        }

        // ETAPA 2: Processar cada colaborador para identificar pendências
        const allPendingDocuments: PendingDocumentResponseDto[] = [];

        for (const employee of employees) {
            // Verificar se colaborador tem tipos obrigatórios vinculados
            if (!employee.requiredDocumentTypes || employee.requiredDocumentTypes.length === 0) {
                continue; // Colaborador sem tipos obrigatórios - pular
            }

            // ETAPA 2a: Buscar tipos obrigatórios do colaborador (apenas ativos)
            const requiredTypeIds = employee.requiredDocumentTypes.map((id: any) => id.toString());
            const requiredTypes = await this.documentTypeRepository.findByIds(requiredTypeIds);

            if (requiredTypes.length === 0) {
                continue; // Todos tipos obrigatórios foram removidos - pular
            }

            // ETAPA 2b: Aplicar filtro por documentTypeId se fornecido
            const filteredRequiredTypes = documentTypeId 
                ? requiredTypes.filter(type => (type as any).id?.toString() === documentTypeId)
                : requiredTypes;

            if (filteredRequiredTypes.length === 0) {
                continue; // Nenhum tipo atende ao filtro - pular
            }

            // ETAPA 2c: Buscar documentos já enviados pelo colaborador
            const sentDocumentsData = await this.documentRepository.list({
                employeeId: (employee as any).id?.toString(),
                status: DocumentStatus.SENT
            }, { page: 1, limit: 1000 });

            // ETAPA 2d: Criar Set dos tipos já enviados para lookup eficiente
            const sentTypeIds = new Set(
                sentDocumentsData.items.map((doc: any) => doc.documentTypeId?.toString())
            );

            // ETAPA 2e: Identificar tipos pendentes (obrigatórios - enviados)
            const pendingTypes = filteredRequiredTypes.filter(
                type => !sentTypeIds.has((type as any).id?.toString())
            );

            // ETAPA 2f: Criar "documentos virtuais" para cada tipo pendente
            for (const pendingType of pendingTypes) {
                const pendingDocument: PendingDocumentResponseDto = {
                    employeeId: (employee as any).id?.toString() || '',
                    employeeName: employee.name || '',
                    employeeDocument: employee.document || '',
                    documentTypeId: (pendingType as any).id?.toString() || '',
                    documentTypeName: pendingType.name || '',
                    status: DocumentStatus.PENDING,
                    isPending: true,
                    createdAt: (pendingType as any).createdAt || new Date(),
                    updatedAt: new Date()
                };

                allPendingDocuments.push(pendingDocument);
            }
        }

        // ETAPA 3: Ordenar resultados por nome do colaborador e tipo de documento
        allPendingDocuments.sort((a, b) => {
            const employeeComparison = a.employeeName.localeCompare(b.employeeName);
            if (employeeComparison !== 0) return employeeComparison;
            return a.documentTypeName.localeCompare(b.documentTypeName);
        });

        // ETAPA 4: Aplicar paginação
        const total = allPendingDocuments.length;
        const skip = (page - 1) * limit;
        const paginatedDocuments = allPendingDocuments.slice(skip, skip + limit);

        // ETAPA 5: Calcular metadados de paginação
        const totalPages = Math.ceil(total / limit);

        return {
            documents: paginatedDocuments,
            total,
            page,
            totalPages,
            limit
        };
    }

    /**
     * Busca documento ativo por ID
     * 
     * Funcionalidades:
     * - Retorna apenas documentos ativos (soft delete aplicado)
     * - Usado para validações e consultas individuais
     * - Suporte a operações CRUD e validações de existência
     * 
     * @param id - Identificador único do documento
     * @returns Promise com documento encontrado ou null
     */
    async findById(id: string): Promise<Document | null> {
        // Valida formato do ObjectId
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequest("Invalid document ID format");
        }

        return await this.documentRepository.findById(id);
    }

    /**
     * Atualiza dados de documento existente
     * 
     * Funcionalidades:
     * - Atualiza apenas documentos ativos (soft delete aplicado)
     * - Valida existência antes da atualização
     * - Preserva integridade de dados relacionados
     * - Atualiza timestamp automaticamente
     * 
     * @param id - ID do documento a ser atualizado
     * @param dto - Dados parciais para atualização
     * @returns Promise com documento atualizado ou null se não encontrado
     */
    async updateDocument(id: string, dto: { fileName?: string; status?: DocumentStatus }): Promise<Document | null> {
        // Valida formato do ObjectId
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequest("Invalid document ID format");
        }

        // Verifica se o documento existe
        const existingDocument = await this.documentRepository.findById(id);
        if (!existingDocument) {
            return null;
        }

        // Prepara dados para atualização
        const updateData: Partial<Document> = {};
        if (dto.fileName?.trim()) {
            updateData.fileName = dto.fileName.trim();
        }
        if (dto.status) {
            updateData.status = dto.status;
        }

        // Executa atualização se houver dados para atualizar
        if (Object.keys(updateData).length === 0) {
            return existingDocument; // Nenhum dado para atualizar
        }

        return await this.documentRepository.update(id, updateData);
    }

    /**
     * Lista documentos ativos com paginação e filtros
     * 
     * Funcionalidades:
     * - Delega para repositório com filtros de soft delete aplicados
     * - Suporta paginação para performance em grandes volumes
     * - Permite filtros customizados para busca específica
     * - Retorna dados estruturados para controle de paginação na API
     * 
     * @param filter - Filtros adicionais para busca (status, employeeId, etc.)
     * @param opts - Opções de paginação { page, limit }
     * @returns Promise com lista paginada e total de registros
     */
    async list(filter: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: Document[]; total: number }> {
        return await this.documentRepository.list(filter, opts);
    }

    /**
     * Soft delete de um documento (marca como inativo)
     * 
     * Funcionalidades:
     * - Implementa desativação segura sem perda de dados
     * - Valida entrada e existência antes da operação
     * - Preserva histórico e relacionamentos para auditoria
     * - Permite reversão posterior através do método restore
     * 
     * Regras de Negócio:
     * - ID obrigatório e válido
     * - Documento deve existir e estar ativo
     * - Operação é idempotente (pode ser chamada múltiplas vezes)
     * - Preserva histórico para compliance
     * 
     * @param id - ID do documento a ser desativado
     * @returns Promise<Document | null> - Documento desativado ou null se não encontrado
     * @throws BadRequest se ID inválido
     */
    async delete(id: string): Promise<Document | null> {
        // Validação de entrada
        if (!id?.trim()) {
            throw new BadRequest("ID is required");
        }

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequest("Invalid document ID format");
        }

        // Verifica existência e status ativo do documento
        const document = await this.documentRepository.findById(id);
        if (!document) {
            return null; // Documento não encontrado ou já inativo
        }

        // Executa soft delete preservando dados
        return await this.documentRepository.softDelete(id);
    }

    /**
     * Lista todos os documentos pendentes de todos os colaboradores
     * 
     * Funcionalidades:
     * - Listagem global de documentos pendentes
     * - Filtros por colaborador e tipo de documento  
     * - Paginação completa
     * - Suporte a filtros de status (active/inactive/all)
     * 
     * Lógica:
     * - Documentos pendentes = vínculos ativos sem documentos enviados
     * - Cruza dados entre EmployeeDocumentTypeLink e Document
     * - Filtra por status dos vínculos conforme parâmetro
     * 
     * @param options - Opções de filtro e paginação
     * @returns Promise com data e pagination
     */
    async getPendingDocuments(options: {
        status?: string;
        page?: number;
        limit?: number;
        employeeId?: string;
        documentTypeId?: string;
    }): Promise<{
        data: Array<{
            employee: { id: string; name: string };
            documentType: { id: string; name: string };
            status: string;
            active: boolean;
        }>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }> {
        const {
            status = "all",
            page = 1,
            limit = 10,
            employeeId,
            documentTypeId
        } = options;

        // TODO: Implementar lógica completa de documentos pendentes
        // Por enquanto, retorna estrutura básica para testes
        return {
            data: [],
            pagination: {
                page,
                limit,
                total: 0,
                totalPages: 0
            }
        };
    }

    /**
     * Reativa um documento (marca como ativo)
     * 
     * Funcionalidades:
     * - Restaura documento previamente desativado
     * - Recupera acesso a todas as funcionalidades do sistema
     * - Remove marcadores de deleção mantendo histórico
     * - Operação complementar ao soft delete
     * 
     * Regras de Negócio:
     * - ID obrigatório e válido
     * - Pode restaurar qualquer documento (ativo ou inativo)
     * - Operação é idempotente e segura
     * - Reativa relacionamentos automaticamente
     * 
     * @param id - ID do documento a ser reativado
     * @returns Promise<Document | null> - Documento reativado ou null se não encontrado
     * @throws BadRequest se ID inválido
     */
    async restore(id: string): Promise<Document | null> {
        // Validação de entrada
        if (!id?.trim()) {
            throw new BadRequest("ID is required");
        }

        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequest("Invalid document ID format");
        }

        // Executa restauração (não precisa validar status atual)
        return await this.documentRepository.restore(id);
    }
}