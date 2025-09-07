import { Injectable } from "@tsed/di";
import { Types } from "mongoose";
import { DocumentRepository } from "../repositories/DocumentRepository";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { EmployeeRepository } from "../repositories/EmployeeRepository";
import { Document } from "../models/Document";
import { BadRequest, NotFound } from "@tsed/exceptions";

@Injectable()
export class DocumentService {
    constructor(
        private documentRepository: DocumentRepository,
        private documentTypeRepository: DocumentTypeRepository,
        private employeeRepository: EmployeeRepository
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
}