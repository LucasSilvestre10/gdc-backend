import { Injectable } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";
import { Document } from "../models/Document";

@Injectable()
export class DocumentRepository {
  constructor(
    private documentModel: MongooseModel<Document>
  ) {}

  async create(dto: Partial<Document>): Promise<Document> {
    const doc = new this.documentModel(dto);
    return await doc.save();
  }

  async find(filter: Record<string, any> = {}): Promise<Document[]> {
    return this.documentModel.find(filter).exec();
  }

  async list(
    filter: Record<string, any> = {},
    options: { page?: number; limit?: number } = {}
  ): Promise<{ items: Document[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.documentModel.find(filter).skip(skip).limit(limit).exec(),
      this.documentModel.countDocuments(filter).exec()
    ]);

    return { items, total };
  }
}