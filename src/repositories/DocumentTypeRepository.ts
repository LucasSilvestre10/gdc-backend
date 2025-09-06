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