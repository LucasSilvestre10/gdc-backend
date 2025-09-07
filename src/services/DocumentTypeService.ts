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
}