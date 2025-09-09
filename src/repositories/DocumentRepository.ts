import { Injectable } from "@tsed/di";
import { Model } from "@tsed/mongoose";
import { Document } from "../models/Document";
import { Model as MongooseModel } from "mongoose";

/**
 * Repositório de dados para a entidade Document
 * 
 * Responsabilidades:
 * - Gerenciar operações CRUD para documentos
 * - Implementar padrão de soft delete (isActive)
 * - Filtrar automaticamente registros inativos
 * - Manter auditoria de dados (createdAt, updatedAt, deletedAt)
 * - Gerenciar status dos documentos (PENDING, SENT)
 * 
 * Padrão de Soft Delete:
 * - Todos os métodos de consulta filtram por isActive !== false
 * - Delete marca como inativo sem remover do banco
 * - Restore reativa registros marcados como inativos
 */
@Injectable()
export class DocumentRepository {
  /**
   * Injeta o modelo Mongoose do Document através do decorator @Model
   * @param documentModel - Modelo Mongoose para operações de banco de dados
   */
  constructor(@Model(new Document()) private documentModel: MongooseModel<Document>) {}

  /**
   * Cria um novo documento no sistema
   * 
   * Funcionalidades:
   * - Define isActive como true por padrão
   * - Adiciona timestamps de criação e atualização
   * - Valida dados através do schema Mongoose
   * 
   * @param dto - Dados parciais do documento para criação
   * @returns Promise<Document> - Documento criado com dados completos
   * @throws Error se houver falha na validação ou criação
   */
  async create(dto: Partial<Document>): Promise<Document> {
    // Prepara dados com campos de auditoria e status ativo
    const documentData = {
      ...dto,
      isActive: true,        // Marca como ativo por padrão
      createdAt: new Date(), // Timestamp de criação
      updatedAt: new Date()  // Timestamp de última atualização
    };
    return await this.documentModel.create(documentData);
  }

  /**
   * Busca documento por ID (apenas ativos)
   * 
   * Funcionalidades:
   * - Retorna apenas documentos ativos
   * - Implementa filtro de soft delete
   * - Usado para validações e consultas individuais
   * 
   * @param id - ID do documento a ser buscado
   * @returns Promise<Document | null> - Documento encontrado ou null se não encontrado/inativo
   */
  async findById(id: string): Promise<Document | null> {
    return await this.documentModel.findOne({
      _id: id,
      isActive: { $ne: false } // Filtra apenas registros ativos
    });
  }

  /**
   * Atualiza dados de um documento existente (apenas ativos)
   * 
   * Funcionalidades:
   * - Atualiza apenas documentos ativos (soft delete)
   * - Atualiza automaticamente o timestamp updatedAt
   * - Retorna dados atualizados após modificação
   * 
   * @param id - ID do documento a ser atualizado
   * @param dto - Dados parciais para atualização
   * @returns Promise<Document | null> - Documento atualizado ou null se não encontrado/inativo
   */
  async update(id: string, dto: Partial<Document>): Promise<Document | null> {
    // Adiciona timestamp de atualização aos dados
    const updateData = {
      ...dto,
      updatedAt: new Date() // Atualiza timestamp automaticamente
    };
    
    return await this.documentModel.findOneAndUpdate(
      { _id: id, isActive: { $ne: false } }, // Filtra apenas registros ativos
      updateData,
      { new: true } // Retorna documento atualizado
    );
  }

  /**
   * Busca documentos com filtros personalizados (apenas ativos)
   * 
   * Funcionalidades:
   * - Retorna apenas documentos ativos
   * - Aplica filtros customizados combinados com filtro de ativo
   * - Usado para consultas específicas como documentos por colaborador
   * 
   * @param filter - Filtros adicionais para a consulta
   * @returns Promise<Document[]> - Lista de documentos ativos que atendem aos filtros
   */
  async find(filter: Record<string, any> = {}): Promise<Document[]> {
    // Combina filtros personalizados com filtro de registros ativos
    const activeFilter = {
      ...filter,
      isActive: { $ne: false } // Garante apenas registros ativos
    };
    
    return this.documentModel.find(activeFilter).exec();
  }

  /**
   * Lista documentos com paginação e filtros (apenas ativos)
   * 
   * Funcionalidades:
   * - Implementa paginação com page e limit
   * - Aplica filtros customizados combinados com filtro de ativo
   * - Retorna contagem total para controle de paginação
   * - Usado pelos endpoints de listagem da API
   * 
   * @param filter - Filtros adicionais para a consulta (opcional)
   * @param options - Opções de paginação { page, limit } (opcional)
   * @returns Promise<{ items: Document[]; total: number }> - Lista paginada e total de registros
   */
  async list(
    filter: Record<string, any> = {},
    options: { page?: number; limit?: number } = {}
  ): Promise<{ items: Document[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    // Combina filtros personalizados com filtro de registros ativos
    const activeFilter = {
      ...filter,
      isActive: { $ne: false } // Garante apenas registros ativos
    };

    const [items, total] = await Promise.all([
      this.documentModel.find(activeFilter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }) // Ordena por mais recentes primeiro
        .exec(),
      this.documentModel.countDocuments(activeFilter).exec()
    ]);

    return { items, total };
  }

  /**
   * Soft delete de um documento (marca como inativo)
   * 
   * Funcionalidades:
   * - Implementa soft delete sem remoção física do banco
   * - Marca registro como inativo (isActive = false)
   * - Adiciona timestamp de deleção para auditoria
   * - Preserva histórico de dados para compliance
   * - Permite restauração posterior do registro
   * 
   * @param id - ID do documento a ser desativado
   * @returns Promise<Document | null> - Documento desativado ou null se não encontrado
   */
  async softDelete(id: string): Promise<Document | null> {
    return await this.documentModel.findOneAndUpdate(
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
   * Reativa um documento (marca como ativo)
   * 
   * Funcionalidades:
   * - Restaura documento previamente desativado
   * - Marca registro como ativo (isActive = true)
   * - Remove timestamp de deleção (deletedAt = null)
   * - Permite recuperação de dados "deletados"
   * - Não filtra por isActive para permitir restaurar inativos
   * 
   * @param id - ID do documento a ser reativado
   * @returns Promise<Document | null> - Documento reativado ou null se não encontrado
   */
  async restore(id: string): Promise<Document | null> {
    return await this.documentModel.findOneAndUpdate(
      { _id: id }, // Não filtra por isActive para permitir restaurar
      { 
        isActive: true,           // Marca como ativo
        deletedAt: null,          // Remove timestamp de deleção
        updatedAt: new Date()     // Atualiza timestamp
      },
      { new: true } // Retorna documento atualizado
    );
  }
}