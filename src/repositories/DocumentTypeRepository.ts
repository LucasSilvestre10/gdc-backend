import { Injectable } from "@tsed/di";
import { Model } from "@tsed/mongoose";
import { DocumentType } from "../models/DocumentType";
import { Model as MongooseModel } from "mongoose";

/**
 * Repositório de dados para a entidade DocumentType
 * 
 * Responsabilidades:
 * - Gerenciar operações CRUD para tipos de documento
 * - Implementar padrão de soft delete (isActive)
 * - Filtrar automaticamente registros inativos
 * - Manter auditoria de dados (createdAt, updatedAt, deletedAt)
 * - Garantir unicidade de nomes entre registros ativos
 * 
 * Padrão de Soft Delete:
 * - Todos os métodos de consulta filtram por isActive !== false
 * - Delete marca como inativo sem remover do banco
 * - Restore reativa registros marcados como inativos
 */
@Injectable()
export class DocumentTypeRepository {
  /**
   * Injeta o modelo Mongoose do DocumentType através do constructor
   * @param documentTypeModel - Modelo Mongoose para operações de banco de dados
   */
  constructor(@Model(new DocumentType()) private documentTypeModel: MongooseModel<DocumentType>) {}

  /**
   * Cria um novo tipo de documento no sistema
   * 
   * Funcionalidades:
   * - Define isActive como true por padrão
   * - Adiciona timestamps de criação e atualização
   * - Valida dados através do schema Mongoose
   * 
   * @param dto - Dados parciais do tipo de documento para criação
   * @returns Promise<DocumentType> - Tipo de documento criado com dados completos
   * @throws Error se houver falha na validação ou criação
   */
  async create(dto: Partial<DocumentType>): Promise<DocumentType> {
    // Prepara dados com campos de auditoria e status ativo
    const documentTypeData = {
      ...dto,
      isActive: true,        // Marca como ativo por padrão
      createdAt: new Date(), // Timestamp de criação
      updatedAt: new Date()  // Timestamp de última atualização
    };
    return await this.documentTypeModel.create(documentTypeData);
  }

  /**
   * Atualiza dados de um tipo de documento existente (apenas ativos)
   * 
   * Funcionalidades:
   * - Atualiza apenas tipos de documento ativos (soft delete)
   * - Atualiza automaticamente o timestamp updatedAt
   * - Retorna dados atualizados após modificação
   * 
   * @param id - ID do tipo de documento a ser atualizado
   * @param dto - Dados parciais para atualização
   * @returns Promise<DocumentType | null> - Tipo de documento atualizado ou null se não encontrado/inativo
   */
  async update(id: string, dto: Partial<DocumentType>): Promise<DocumentType | null> {
    // Adiciona timestamp de atualização aos dados
    const updateData = {
      ...dto,
      updatedAt: new Date() // Atualiza timestamp automaticamente
    };
    
    return await this.documentTypeModel.findOneAndUpdate(
      { _id: id, isActive: { $ne: false } }, // Filtra apenas registros ativos
      updateData,
      { new: true } // Retorna documento atualizado
    );
  }

  /**
   * Busca um tipo de documento pelo nome (case-insensitive)
   * 
   * Funcionalidades:
   * - Busca case-insensitive por nome exato
   * - Retorna apenas tipos de documento ativos
   * - Usado para validação de unicidade de nomes
   * 
   * @param name - nome do tipo de documento
   * @returns Promise<DocumentType | null> - Tipo encontrado ou null
   */
  async findByName(name: string): Promise<DocumentType | null> {
    const trimmed = name?.trim();
    if (!trimmed) {
      return null;
    }
    // Busca case-insensitive por nome exato, apenas registros ativos
    return await this.documentTypeModel.findOne({ 
      name: new RegExp(`^${trimmed}$`, "i"),
      isActive: { $ne: false } // considera true ou undefined como ativo
    }).exec();
  }

  /**
   * Busca tipo de documento por ID (apenas ativos)
   * 
   * Funcionalidades:
   * - Retorna apenas tipos de documento ativos
   * - Implementa filtro de soft delete
   * - Usado para validações e consultas individuais
   * 
   * @param id - ID do tipo de documento a ser buscado
   * @returns Promise<DocumentType | null> - Tipo encontrado ou null se não encontrado/inativo
   */
  async findById(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findOne({ 
      _id: id, 
      isActive: { $ne: false } 
    }).exec();
  }

  /**
   * Lista tipos de documento com paginação e filtros (apenas ativos)
   * 
   * Funcionalidades:
   * - Implementa paginação com page e limit
   * - Aplica filtros customizados combinados com filtro de ativo
   * - Retorna contagem total para controle de paginação
   * - Usado pelos endpoints de listagem da API
   * 
   * @param filter - Filtros adicionais para a consulta (opcional)
   * @param options - Opções de paginação { page, limit } (opcional)
   * @returns Promise<{ items: DocumentType[]; total: number }> - Lista paginada e total de registros
   */
  async list(
    filter: Record<string, any> = {},
    options: { page?: number; limit?: number } = {}
  ): Promise<{ items: DocumentType[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    // Combina filtros personalizados com filtro de registros ativos
    const activeFilter = { 
      ...filter, 
      isActive: { $ne: false } // Garante apenas registros ativos
    };

    const [items, total] = await Promise.all([
      this.documentTypeModel.find(activeFilter).skip(skip).limit(limit).exec(),
      this.documentTypeModel.countDocuments(activeFilter).exec()
    ]);

    return { items, total };
  }

  /**
   * Busca múltiplos tipos de documento por IDs (apenas ativos)
   * 
   * Funcionalidades:
   * - Retorna apenas tipos de documento ativos
   * - Usado para validação de existência em operações de vínculo
   * - Filtro de soft delete aplicado automaticamente
   * 
   * @param ids - Array de IDs dos tipos de documento
   * @returns Promise<DocumentType[]> - Array de tipos encontrados (apenas ativos)
   */
  async findByIds(ids: string[]): Promise<DocumentType[]> {
    return this.documentTypeModel.find({ 
      _id: { $in: ids },
      isActive: { $ne: false }
    }).exec();
  }

  /**
   * Soft delete de um tipo de documento (marca como inativo)
   * 
   * Funcionalidades:
   * - Implementa soft delete sem remoção física do banco
   * - Marca registro como inativo (isActive = false)
   * - Adiciona timestamp de deleção para auditoria
   * - Preserva histórico de dados para compliance
   * - Permite restauração posterior do registro
   * 
   * @param id - ID do tipo de documento a ser desativado
   * @returns Promise<DocumentType | null> - Tipo desativado ou null se não encontrado
   */
  async softDelete(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findOneAndUpdate(
      { _id: id, isActive: { $ne: false } }, // Apenas se estiver ativo
      { 
        isActive: false,          // Marca como inativo
        deletedAt: new Date(),    // Timestamp de deleção
        updatedAt: new Date()     // Atualiza timestamp
      },
      { new: true } // Retorna documento atualizado
    ).exec();
  }

  /**
   * Reativa um tipo de documento (marca como ativo)
   * 
   * Funcionalidades:
   * - Restaura tipo de documento previamente desativado
   * - Marca registro como ativo (isActive = true)
   * - Remove timestamp de deleção (deletedAt = null)
   * - Permite recuperação de dados "deletados"
   * - Não filtra por isActive para permitir restaurar inativos
   * 
   * @param id - ID do tipo de documento a ser reativado
   * @returns Promise<DocumentType | null> - Tipo reativado ou null se não encontrado
   */
  async restore(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findOneAndUpdate(
      { _id: id }, // Não filtra por isActive para permitir restaurar
      { 
        isActive: true,           // Marca como ativo
        deletedAt: null,          // Remove timestamp de deleção
        updatedAt: new Date()     // Atualiza timestamp
      },
      { new: true } // Retorna documento atualizado
    ).exec();
  }
}