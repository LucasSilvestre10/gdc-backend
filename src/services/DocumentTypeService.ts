import { Injectable, Inject } from "@tsed/di";
import { DocumentType } from "../models/DocumentType.js";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository.js";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { DOCUMENT_TYPE_REPOSITORY_TOKEN, EMPLOYEE_REPOSITORY_TOKEN } from "../config/providers.js";
import { BadRequest } from "@tsed/exceptions";
import { ValidationUtils } from "../utils/ValidationUtils.js";

/**
 * Serviço para gerenciamento de tipos de documentos
 * Implementa regras de negócio para criação e listagem de tipos de documentos obrigatórios
 */
@Injectable()
export class DocumentTypeService {
    constructor(
        @Inject(DOCUMENT_TYPE_REPOSITORY_TOKEN) private documentTypeRepository: DocumentTypeRepository,
        @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: EmployeeRepository
    ) {
        console.log('DocumentTypeService constructor');
        console.log('Repository type:', typeof this.documentTypeRepository);
        console.log('Repository constructor:', this.documentTypeRepository?.constructor?.name);
        console.log('Has findByName:', typeof this.documentTypeRepository?.findByName);
        console.log('Has list:', typeof this.documentTypeRepository?.list);
        console.log('Repository prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.documentTypeRepository || {})));
    }

    // Nota: método removido - usar this.documentTypeRepository.findByName() diretamente

    /**
     * Cria um novo tipo de documento
     * @param dto - Dados do tipo de documento a ser criado
     * @returns Promise<DocumentType> - Tipo de documento criado
     * @throws BadRequest - Se dados inválidos
     */
    async create(dto: {
        name: string;
        description?: string;
    }): Promise<DocumentType> {
        // Valida dados obrigatórios
        if (!dto.name?.trim()) {
            throw new BadRequest("Name is required");
        }

        // Verifica se já existe um tipo com o mesmo nome (evita duplicatas)
        const nameToCheck = dto.name.trim();
        const existingType = await this.documentTypeRepository.findByName(nameToCheck);
        if (existingType) {
            throw new BadRequest("Document type with this name already exists");
        }

        // Cria o tipo de documento
        const documentTypeData = {
            name: dto.name.trim(),
            description: dto.description?.trim() || "",
        };

        return await this.documentTypeRepository.create(documentTypeData);
    }

    // TODO: Implementar outros métodos (list, findById, update, delete) quando necessário

    /**
     * Lista tipos de documentos com paginação
     * @param filter - Filtros opcionais (name)
     * @param opts - Opções de paginação
     * @returns Promise<{ items: DocumentType[]; total: number }> - Lista paginada de tipos de documento
     */
    async list(
        filter: {
            name?: string;
            status?: 'active' | 'inactive' | 'all';
        } = {},
        opts: { page?: number; limit?: number } = {}
    ): Promise<{ items: DocumentType[]; total: number }> {
        // Utiliza o repository para listar com paginação
        return await this.documentTypeRepository.list(filter, opts);
    }

    /**
     * Busca tipo de documento por ID
     * @param id - ID do tipo de documento
     * @returns Promise<DocumentType | null> - Tipo de documento encontrado ou null
     */
    async findById(id: string): Promise<DocumentType | null> {
        ValidationUtils.validateObjectId(id);
        return await this.documentTypeRepository.findById(id);
    }

    /**
     * Busca múltiplos tipos de documentos por IDs
     * @param ids - Array de IDs dos tipos de documento
     * @returns Promise<DocumentType[]> - Array de tipos de documento encontrados
     */
    async findByIds(ids: string[]): Promise<DocumentType[]> {
        if (!ids?.length) {
            return [];
        }

        return await this.documentTypeRepository.findByIds(ids);
    }

    /**
     * Atualiza dados de um tipo de documento existente
     * 
     * Funcionalidades:
     * - Atualiza apenas tipos de documento ativos (soft delete aplicado)
     * - Valida unicidade do nome se alterado
     * - Preserva integridade de dados relacionados
     * - Atualiza timestamp automaticamente
     * 
     * @param id - ID do tipo de documento a ser atualizado
     * @param dto - Dados parciais para atualização
     * @returns Promise<DocumentType | null> - Tipo atualizado ou null se não encontrado
     * @throws BadRequest se nome já existir ou dados inválidos
     */
    async update(id: string, dto: { name?: string; description?: string }): Promise<DocumentType | null> {
        // Validação de entrada
        ValidationUtils.validateObjectId(id);

        // Verifica se o tipo existe
        const existingType = await this.documentTypeRepository.findById(id);
        if (!existingType) {
            return null;
        }

        // Valida unicidade do nome se alterado
        if (dto.name?.trim() && dto.name.trim() !== existingType.name) {
            const nameToCheck = dto.name.trim();
            const duplicateType = await this.documentTypeRepository.findByName(nameToCheck);

            // Se encontrou um tipo com o mesmo nome, é duplicata (não é o mesmo registro sendo atualizado)
            if (duplicateType) {
                throw new BadRequest("Document type with this name already exists");
            }
        }

        // Prepara dados para atualização
        const updateData: any = {};
        if (dto.name?.trim()) {
            updateData.name = dto.name.trim();
        }
        if (dto.description !== undefined) {
            updateData.description = dto.description?.trim() || "";
        }

        // Executa atualização se houver dados para atualizar
        if (Object.keys(updateData).length === 0) {
            return existingType; // Nenhum dado para atualizar
        }

        return await this.documentTypeRepository.update(id, updateData);
    }

    /**
     * Soft delete de um tipo de documento (marca como inativo)
     * @param id - ID do tipo de documento
     * @returns Promise<DocumentType | null> - Tipo de documento desativado ou null se não encontrado
     * @throws BadRequest - Se ID inválido
     */
    async delete(id: string): Promise<DocumentType | null> {
        ValidationUtils.validateObjectId(id);

        // Verifica se o tipo de documento existe e está ativo
        const documentType = await this.documentTypeRepository.findById(id);
        if (!documentType) {
            return null;
        }

        // TODO: Verificar se há documentos vinculados antes de desativar
        // const linkedDocuments = await this.documentRepository.findByDocumentTypeId(id);
        // if (linkedDocuments.length > 0) {
        //     throw new BadRequest("Cannot delete document type with linked documents");
        // }

        // Executa o soft delete
        return await this.documentTypeRepository.softDelete(id);
    }

    /**
     * Reativa um tipo de documento (marca como ativo)
     * @param id - ID do tipo de documento
     * @returns Promise<DocumentType | null> - Tipo de documento reativado ou null se não encontrado
     * @throws BadRequest - Se ID inválido
     */
    async restore(id: string): Promise<DocumentType | null> {
        ValidationUtils.validateObjectId(id);

        // Executa a restauração
        return await this.documentTypeRepository.restore(id);
    }

    /**
     * Busca colaboradores vinculados a um tipo de documento
     * @param documentTypeId - ID do tipo de documento
     * @param options - Opções de paginação
     * @returns Promise<{ items: Employee[], total: number }> - Lista paginada de colaboradores
     * @throws BadRequest - Se ID inválido
     */
    async getLinkedEmployees(documentTypeId: string, options: { page: number; limit: number } = { page: 1, limit: 10 }): Promise<{ items: any[], total: number }> {
        ValidationUtils.validateObjectId(documentTypeId);

        // Verificar se o tipo de documento existe
        const documentType = await this.findById(documentTypeId);
        if (!documentType) {
            return { items: [], total: 0 };
        }

        // Buscar colaboradores que têm este tipo de documento vinculado
        return await this.employeeRepository.findByDocumentType(documentTypeId, options);
    }
}