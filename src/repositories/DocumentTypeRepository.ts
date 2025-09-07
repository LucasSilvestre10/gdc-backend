import { Injectable } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";
import { DocumentType } from "../models/DocumentType";

@Injectable()
export class DocumentTypeRepository {
  constructor(
    private documentTypeModel: MongooseModel<DocumentType>
  ) {}

  async create(dto: Partial<DocumentType>): Promise<DocumentType> {
    const docType = new this.documentTypeModel(dto);
    return await docType.save();
  }

  /**
   * Busca um tipo de documento pelo nome (case-insensitive)
   * @param name - nome do tipo de documento
   * @returns DocumentType | null
   */
  async findByName(name: string): Promise<DocumentType | null> {
    const trimmed = name?.trim();
    if (!trimmed) {
      return null;
    }
    // Busca case-insensitive por nome exato
    return this.documentTypeModel.findOne({ name: new RegExp(`^${trimmed}$`, "i") }).exec();
  }

  async findById(id: string): Promise<DocumentType | null> {
    return this.documentTypeModel.findById(id).exec();
  }

  async list(
    filter: Record<string, any> = {},
    options: { page?: number; limit?: number } = {}
  ): Promise<{ items: DocumentType[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.documentTypeModel.find(filter).skip(skip).limit(limit).exec(),
      this.documentTypeModel.countDocuments(filter).exec()
    ]);

    return { items, total };
  }

  async findByIds(ids: string[]): Promise<DocumentType[]> {
    return this.documentTypeModel.find({ _id: { $in: ids } }).exec();
  }
}