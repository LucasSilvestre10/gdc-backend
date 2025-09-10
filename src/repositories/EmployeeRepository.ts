import { MongooseService } from "@tsed/mongoose";
import { Injectable } from "@tsed/di";
import { Employee } from "../models/Employee";
import { Model as MongooseModel } from "mongoose";

/**
 * Repositório de dados para a entidade Employee
 * 
 * Responsabilidades:
 * - Gerenciar operações CRUD para colaboradores
 * - Implementar padrão de soft delete (isActive)
 * - Filtrar automaticamente registros inativos
 * - Manter auditoria de dados (createdAt, updatedAt, deletedAt)
 * - Gerenciar vínculos com tipos de documentos obrigatórios
 * 
 * Padrão de Soft Delete:
 * - Todos os métodos de consulta filtram por isActive !== false
 * - Delete marca como inativo sem remover do banco
 * - Restore reativa registros marcados como inativos
 */
@Injectable()
export class EmployeeRepository {
    private employeeModel: MongooseModel<Employee>;

    /**
     * Injeta o MongooseService e obtém o modelo Employee
     * @param mongooseService - Serviço do Mongoose para acesso aos modelos
     */
    constructor(private mongooseService: MongooseService) {
        console.log('EmployeeRepository constructor - Getting model from MongooseService');
        // Obtém o modelo que foi registrado pelo @Model() na classe Employee
        const connection = this.mongooseService.get();
        this.employeeModel = connection!.model<Employee>("Employee");
        console.log('EmployeeRepository constructor - Model obtained:', !!this.employeeModel);
    }

    /**
     * Cria um novo colaborador no sistema
     * 
     * Funcionalidades:
     * - Define isActive como true por padrão
     * - Adiciona timestamps de criação e atualização
     * - Valida dados através do schema Mongoose
     * 
     * @param dto - Dados parciais do colaborador para criação
     * @returns Promise<Employee> - Colaborador criado com dados completos
     * @throws Error se houver falha na validação ou criação
     */
    async create(dto: Partial<Employee>): Promise<Employee> {
        // Prepara dados com campos de auditoria e status ativo
        const employeeData = {
            ...dto,
            isActive: true,        // Marca como ativo por padrão
            createdAt: new Date(), // Timestamp de criação
            updatedAt: new Date()  // Timestamp de última atualização
        };
        return await this.employeeModel.create(employeeData);
    }

    /**
     * Atualiza dados de um colaborador existente (apenas ativos)
     * 
     * Funcionalidades:
     * - Atualiza apenas colaboradores ativos (soft delete)
     * - Atualiza automaticamente o timestamp updatedAt
     * - Retorna dados atualizados após modificação
     * 
     * @param id - ID do colaborador a ser atualizado
     * @param dto - Dados parciais para atualização
     * @returns Promise<Employee | null> - Colaborador atualizado ou null se não encontrado/inativo
     */
    async update(id: string, dto: Partial<Employee>): Promise<Employee | null> {
        // Adiciona timestamp de atualização aos dados
        const updateData = {
            ...dto,
            updatedAt: new Date() // Atualiza timestamp automaticamente
        };
        
        return await this.employeeModel.findOneAndUpdate(
            { _id: id, isActive: { $ne: false } }, // Filtra apenas registros ativos
            updateData,
            { new: true } // Retorna documento atualizado
        );
    }

    /**
     * Busca colaborador por ID (apenas ativos)
     * 
     * Funcionalidades:
     * - Retorna apenas colaboradores ativos
     * - Implementa filtro de soft delete
     * - Usado para validações e consultas individuais
     * 
     * @param id - ID do colaborador a ser buscado
     * @returns Promise<Employee | null> - Colaborador encontrado ou null se não encontrado/inativo
     */
    async findById(id: string): Promise<Employee | null> {
        return await this.employeeModel.findOne({ 
            _id: id, 
            isActive: { $ne: false } // Filtra apenas registros ativos
        });
    }

    /**
     * Lista colaboradores com paginação e filtros (apenas ativos)
     * 
     * Funcionalidades:
     * - Implementa paginação com page e limit
     * - Aplica filtros customizados combinados com filtro de ativo
     * - Retorna contagem total para controle de paginação
     * - Usado pelos endpoints de listagem da API
     * 
     * @param filter - Filtros adicionais para a consulta (opcional)
     * @param opts - Opções de paginação { page, limit } (opcional)
     * @returns Promise<{ items: Employee[]; total: number }> - Lista paginada e total de registros
     */
    async list(filter: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: Employee[]; total: number }> {
        // Define valores padrão para paginação
        const page = opts.page || 1;
        const limit = opts.limit || 10;
        
        // Usa os filtros fornecidos diretamente, sem forçar filtro de ativos
        // Isso permite buscar colaboradores ativos, inativos ou todos conforme solicitado
        const queryFilter = { ...filter };
        
        // Trata casos especiais de filtro de isActive
        if (filter.isActive === "all") {
            // Remove o filtro de isActive para buscar todos (ativos e inativos)
            delete queryFilter.isActive;
        } else if (!filter.hasOwnProperty('isActive') || filter.isActive === undefined) {
            // Se não há filtro específico de isActive, aplica o filtro padrão (apenas ativos)
            queryFilter.isActive = { $ne: false };
        }
        
        // Executa consulta paginada
        const query = this.employeeModel.find(queryFilter)
            .skip((page - 1) * limit) // Pula registros das páginas anteriores
            .limit(limit);            // Limita quantidade de registros
        
        const items = await query.exec();
        const total = await this.employeeModel.countDocuments(queryFilter);
        
        return { items, total };
    }

    /**
     * Adiciona tipos de documentos obrigatórios ao colaborador
     * 
     * Funcionalidades:
     * - Vincula múltiplos tipos de documentos de uma vez
     * - Evita duplicatas usando $addToSet
     * - Atualiza timestamp de modificação
     * - Funcionalidade principal do sistema
     * 
     * @param employeeId - ID do colaborador para vincular tipos
     * @param typeIds - Array de IDs dos tipos de documentos a vincular
     * @returns Promise<void>
     * @throws Error se colaborador não existir ou estiver inativo
     */
    async addRequiredTypes(employeeId: string, typeIds: string[]): Promise<void> {
        await this.employeeModel.updateOne(
            { _id: employeeId, isActive: { $ne: false } }, // Apenas colaboradores ativos
            { 
                $addToSet: { requiredDocumentTypes: { $each: typeIds } }, // Adiciona sem duplicar
                $set: { updatedAt: new Date() } // Atualiza timestamp
            }
        );
    }

    /**
     * Remove tipos de documentos obrigatórios do colaborador
     * 
     * Funcionalidades:
     * - Desvincula múltiplos tipos de documentos de uma vez
     * - Remove todas as ocorrências usando $pullAll
     * - Atualiza timestamp de modificação
     * - Funcionalidade principal do sistema
     * 
     * @param employeeId - ID do colaborador para desvincular tipos
     * @param typeIds - Array de IDs dos tipos de documentos a desvincular
     * @returns Promise<void>
     * @throws Error se colaborador não existir ou estiver inativo
     */
    async removeRequiredTypes(employeeId: string, typeIds: string[]): Promise<void> {
        await this.employeeModel.updateOne(
            { _id: employeeId, isActive: { $ne: false } }, // Apenas colaboradores ativos
            { 
                $pullAll: { requiredDocumentTypes: typeIds }, // Remove todos os IDs especificados
                $set: { updatedAt: new Date() } // Atualiza timestamp
            }
        );
    }

    /**
     * Soft delete de um colaborador (marca como inativo)
     * 
     * Funcionalidades:
     * - Implementa soft delete sem remoção física do banco
     * - Marca registro como inativo (isActive = false)
     * - Adiciona timestamp de deleção para auditoria
     * - Preserva histórico de dados para compliance
     * - Permite restauração posterior do registro
     * 
     * @param id - ID do colaborador a ser desativado
     * @returns Promise<Employee | null> - Colaborador desativado ou null se não encontrado
     */
    async softDelete(id: string): Promise<Employee | null> {
        return await this.employeeModel.findOneAndUpdate(
            { _id: id, isActive: { $ne: false } }, // Apenas se estiver ativo
            { 
                isActive: false,          // Marca como inativo
                deletedAt: new Date(),    // Timestamp de deleção
                updatedAt: new Date()     // Atualiza timestamp
            },
            { new: true } // Retorna documento atualizado
        );
    }

    /**
     * Reativa um colaborador (marca como ativo)
     * 
     * Funcionalidades:
     * - Restaura colaborador previamente desativado
     * - Marca registro como ativo (isActive = true)
     * - Remove timestamp de deleção (deletedAt = null)
     * - Permite recuperação de dados "deletados"
     * - Não filtra por isActive para permitir restaurar inativos
     * 
     * @param id - ID do colaborador a ser reativado
     * @returns Promise<Employee | null> - Colaborador reativado ou null se não encontrado
     */
    async restore(id: string): Promise<Employee | null> {
        return await this.employeeModel.findOneAndUpdate(
            { _id: id }, // Não filtra por isActive para permitir restaurar
            { 
                isActive: true,           // Marca como ativo
                deletedAt: null,          // Remove timestamp de deleção
                updatedAt: new Date()     // Atualiza timestamp
            },
            { new: true } // Retorna documento atualizado
        );
    }

    /**
     * Busca colaborador pelo documento (CPF), incluindo registros ativos
     * 
     * Funcionalidades:
     * - Busca por CPF único entre colaboradores ativos
     * - Usado para validação de duplicatas no cadastro
     * - Implementa regra de negócio: CPF único por colaborador ativo
     * - Filtro de soft delete aplicado automaticamente
     * 
     * @param document - CPF do colaborador (formato livre)
     * @returns Promise<Employee | null> - Colaborador com CPF ou null se não encontrado
     */
    async findByDocument(document: string): Promise<Employee | null> {
        return await this.employeeModel.findOne({ 
            document,                     // Busca pelo CPF informado
            isActive: { $ne: false }      // Apenas colaboradores ativos
        });
    }

    /**
     * Busca colaboradores por nome (case-insensitive)
     * 
     * @param query - Termo de busca para o nome
     * @param filters - Filtros adicionais (status, etc.)
     * @returns Promise<Employee[]> - Lista de colaboradores encontrados
     */
    async searchByName(query: string, filters: any = {}): Promise<Employee[]> {
        const matchQuery: any = {
            name: { $regex: query, $options: 'i' }, // Case-insensitive
            isActive: { $ne: false }
        };

        // Aplicar filtro de status se especificado
        if (filters.status === 'active') {
            matchQuery.isActive = true;
        } else if (filters.status === 'inactive') {
            matchQuery.isActive = false;
        }
        // Para status === 'all' não aplica filtro adicional

        return await this.employeeModel
            .find(matchQuery)
            .sort({ name: 1 })
            .exec();
    }

    /**
     * Busca colaboradores por nome ou CPF em uma única query (mais eficiente)
     * 
     * @param query - Termo de busca (nome ou CPF)
     * @param filters - Filtros adicionais (status, etc.)
     * @param opts - Opções de paginação { page, limit } (opcional)
     * @returns Promise<{ items: Employee[]; total: number }> - Lista paginada de colaboradores encontrados
     */
    async searchByNameOrCpf(query: string, filters: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: Employee[]; total: number }> {
        // Define valores padrão para paginação
        const page = opts.page || 1;
        const limit = opts.limit || 20;
        
        const baseFilter: any = {};

        // Aplicar filtro de status
        if (filters.status === 'active') {
            baseFilter.isActive = true;
        } else if (filters.status === 'inactive') {
            baseFilter.isActive = false;
        } else if (filters.status === 'all') {
            // Para 'all', não aplica filtro de isActive (busca todos)
        } else {
            // Se não especificado, busca apenas ativos (comportamento padrão)
            baseFilter.isActive = { $ne: false };
        }

        // Limpa formatação do CPF para busca flexível
        const cleanQuery = query.replace(/[.\-\s]/g, '');
        
        // Se a query tem 11 dígitos, assumimos que é um CPF sem formatação
        let cpfRegexPattern = '';
        if (cleanQuery.length === 11 && /^\d{11}$/.test(cleanQuery)) {
            // Converte "99988877755" em regex que encontra "999.888.777-55"
            const digits = cleanQuery.split('');
            cpfRegexPattern = `${digits[0]}${digits[1]}${digits[2]}[.\\-\\s]*${digits[3]}${digits[4]}${digits[5]}[.\\-\\s]*${digits[6]}${digits[7]}${digits[8]}[.\\-\\s]*${digits[9]}${digits[10]}`;
        }
        
        // Query que busca por nome OU por CPF (com ou sem formatação)
        const searchQuery = {
            ...baseFilter,
            $or: [
                { name: { $regex: query, $options: 'i' } },     // Nome case-insensitive
                { document: query },                            // CPF exato como digitado
                ...(cpfRegexPattern ? [{ document: { $regex: cpfRegexPattern, $options: 'i' } }] : [])  // CPF flexível se aplicável
            ]
        };
        


        // Executa consulta paginada
        const mongooseQuery = this.employeeModel.find(searchQuery)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit);
        
        const items = await mongooseQuery.exec();
        const total = await this.employeeModel.countDocuments(searchQuery);
        
        return { items, total };
    }
}