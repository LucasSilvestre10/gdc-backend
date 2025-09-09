import { Injectable, Inject } from "@tsed/di";
import { Types } from "mongoose";
import { DocumentRepository } from "../repositories/DocumentRepository";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { EmployeeRepository } from "../repositories/EmployeeRepository";
import { Document, DocumentStatus } from "../models/Document";
import { BadRequest, NotFound } from "@tsed/exceptions";

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
        @Inject() private documentRepository: DocumentRepository,
        @Inject() private documentTypeRepository: DocumentTypeRepository,
        @Inject() private employeeRepository: EmployeeRepository
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

        // Cria o documento com conversão de IDs para ObjectId
        const documentData = {
            employeeId: new Types.ObjectId(dto.employeeId),
            documentTypeId: new Types.ObjectId(dto.documentTypeId),
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
     * Lista documentos com status 'pending'
     * @param filter - Filtros opcionais (employeeId, documentTypeId)
     * @param opts - Opções de paginação
     * @returns Promise<{ items: Document[]; total: number }> - Lista paginada de documentos pendentes
     * @throws BadRequest - Se IDs de filtro são malformados
     */
    async listPending(
        filter: {
            employeeId?: string;
            documentTypeId?: string;
        } = {},
        opts: { page?: number; limit?: number } = {}
    ): Promise<{ items: Document[]; total: number }> {
        // Valida formato dos ObjectIds nos filtros, se fornecidos
        if (filter.employeeId && !Types.ObjectId.isValid(filter.employeeId)) {
            throw new BadRequest("Invalid employeeId format in filter");
        }

        if (filter.documentTypeId && !Types.ObjectId.isValid(filter.documentTypeId)) {
            throw new BadRequest("Invalid documentTypeId format in filter");
        }

        // Constrói o filtro com status 'pending' e converte IDs para ObjectId se necessário
        const searchFilter: any = {
            status: 'pending'
        };

        if (filter.employeeId) {
            searchFilter.employeeId = new Types.ObjectId(filter.employeeId);
        }

        if (filter.documentTypeId) {
            searchFilter.documentTypeId = new Types.ObjectId(filter.documentTypeId);
        }

        return await this.documentRepository.list(searchFilter, opts);
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
    async updateDocument(id: string, dto: { name?: string; status?: DocumentStatus }): Promise<Document | null> {
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
        if (dto.name?.trim()) {
            updateData.name = dto.name.trim();
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