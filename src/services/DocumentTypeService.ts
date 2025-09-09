import { Injectable } from "@tsed/di";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { DocumentType } from "../models/DocumentType";
import { BadRequest } from "@tsed/exceptions";

/**
 * Serviço para gerenciamento de tipos de documentos
 * Implementa regras de negócio para criação e listagem de tipos de documentos obrigatórios
 */
@Injectable()
export class DocumentTypeService {
    constructor(
        private documentTypeRepository: DocumentTypeRepository
    ) {}

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
        const existingType = await this.documentTypeRepository.findByName(dto.name.trim());
        if (existingType) {
            throw new BadRequest("Document type with this name already exists");
        }

        // Cria o tipo de documento
        const documentTypeData = {
            name: dto.name.trim(),
            description: dto.description?.trim() || "",
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        return await this.documentTypeRepository.create(documentTypeData);
    }

    /**
     * Lista tipos de documentos com paginação
     * @param filter - Filtros opcionais (name)
     * @param opts - Opções de paginação
     * @returns Promise<{ items: DocumentType[]; total: number }> - Lista paginada de tipos de documento
     */
    async list(
        filter: {
            name?: string;
        } = {},
        opts: { page?: number; limit?: number } = {}
    ): Promise<{ items: DocumentType[]; total: number }> {
        // Constrói o filtro de busca
        const searchFilter: any = {};

        // Filtro por nome (busca parcial, case-insensitive)
        if (filter.name?.trim()) {
            searchFilter.name = new RegExp(filter.name.trim(), 'i');
        }

        return await this.documentTypeRepository.list(searchFilter, opts);
    }

    /**
     * Busca tipo de documento por ID
     * @param id - ID do tipo de documento
     * @returns Promise<DocumentType | null> - Tipo de documento encontrado ou null
     */
    async findById(id: string): Promise<DocumentType | null> {
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
        if (!id?.trim()) {
            throw new BadRequest("ID is required");
        }

        // Verifica se o tipo existe
        const existingType = await this.documentTypeRepository.findById(id);
        if (!existingType) {
            return null;
        }

        // Valida unicidade do nome se alterado
        if (dto.name?.trim() && dto.name.trim() !== existingType.name) {
            const duplicateType = await this.documentTypeRepository.findByName(dto.name.trim());
            if (duplicateType && duplicateType._id?.toString() !== id) {
                throw new BadRequest("Document type with this name already exists");
            }
        }

        // Prepara dados para atualização
        const updateData: Partial<DocumentType> = {};
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
        if (!id?.trim()) {
            throw new BadRequest("ID is required");
        }

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
        if (!id?.trim()) {
            throw new BadRequest("ID is required");
        }

        // Executa a restauração
        return await this.documentTypeRepository.restore(id);
    }
}