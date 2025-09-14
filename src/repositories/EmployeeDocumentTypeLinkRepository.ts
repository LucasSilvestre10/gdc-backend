import { MongooseService } from "@tsed/mongoose";
import { Injectable } from "@tsed/di";
import { EmployeeDocumentTypeLink } from "../models/EmployeeDocumentTypeLink";
import { Model as MongooseModel } from "mongoose";

/**
 * Repositório para gerenciar vínculos entre colaboradores e tipos de documentos
 * 
 * Responsabilidades:
 * - CRUD de vínculos com soft delete
 * - Listagem de vínculos por colaborador com filtros de status
 * - Restauração de vínculos desativados
 * - Validação de duplicatas
 */
@Injectable()
export class EmployeeDocumentTypeLinkRepository {
    private linkModel: MongooseModel<EmployeeDocumentTypeLink>;

    constructor(private mongooseService: MongooseService) {
        const connection = this.mongooseService.get();
        this.linkModel = connection!.model<EmployeeDocumentTypeLink>("EmployeeDocumentTypeLink");
    }

    /**
     * Cria vínculo entre colaborador e tipo de documento
     */
    async create(employeeId: string, documentTypeId: string): Promise<EmployeeDocumentTypeLink> {
        return await this.linkModel.create({
            employeeId,
            documentTypeId,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }

    /**
     * Lista vínculos de um colaborador com filtros de status
     */
    async findByEmployee(
        employeeId: string, 
        status: 'active' | 'inactive' | 'all' = 'all'
    ): Promise<EmployeeDocumentTypeLink[]> {
        const filter: any = { employeeId };
        
        if (status === 'active') {
            filter.active = true;
        } else if (status === 'inactive') {
            filter.active = false;
        }
        
        return await this.linkModel
            .find(filter)
            .populate('documentTypeId')
            .exec();
    }

    /**
     * Busca vínculo específico
     */
    async findLink(employeeId: string, documentTypeId: string): Promise<EmployeeDocumentTypeLink | null> {
        return await this.linkModel.findOne({
            employeeId,
            documentTypeId
        });
    }

    /**
     * Soft delete de vínculo específico
     */
    async softDelete(employeeId: string, documentTypeId: string): Promise<EmployeeDocumentTypeLink | null> {
        return await this.linkModel.findOneAndUpdate(
            { 
                employeeId, 
                documentTypeId,
                active: true 
            },
            { 
                active: false,
                deletedAt: new Date(),
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    /**
     * Restaura vínculo desativado
     */
    async restore(employeeId: string, documentTypeId: string): Promise<EmployeeDocumentTypeLink | null> {
        return await this.linkModel.findOneAndUpdate(
            { 
                employeeId, 
                documentTypeId 
            },
            { 
                active: true,
                deletedAt: null,
                updatedAt: new Date()
            },
            { new: true }
        );
    }

    /**
     * Lista tipos de documento ativos de um colaborador
     */
    async getActiveDocumentTypes(employeeId: string): Promise<string[]> {
        const links = await this.linkModel
            .find({ 
                employeeId, 
                active: true 
            })
            .select('documentTypeId')
            .exec();
        
        return links.map(link => link.documentTypeId.toString());
    }
}
