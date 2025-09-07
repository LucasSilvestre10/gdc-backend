/// <reference types="vitest" />
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import mongoose from "mongoose";
import { MongooseModel } from "@tsed/mongoose";
import { DocumentTypeRepository } from "../src/repositories/DocumentTypeRepository";
import { DocumentType } from "../src/models/DocumentType";

const DocumentTypeSchema = new mongoose.Schema<DocumentType>({ name: String });
const DocumentTypeModel = mongoose.model<DocumentType>("DocumentType", DocumentTypeSchema);

describe("DocumentTypeRepository", () => {
  let repo: DocumentTypeRepository;

  beforeAll(async () => {
    repo = new DocumentTypeRepository(DocumentTypeModel as unknown as MongooseModel<DocumentType>);
  });

  afterAll(async () => {
    await DocumentTypeModel.deleteMany({});
  });

  it("should create and find a document type", async () => {
    const docType = await repo.create({ name: "CPF" });
    expect(docType.name).toBe("CPF");

    const found = await repo.findById(docType._id?.toString() ?? "");
    expect(found).not.toBeNull();
    expect(found?.name).toBe("CPF");
  });

  it("should list document types with pagination", async () => {
    await repo.create({ name: "Carteira de Trabalho" });
    await repo.create({ name: "RG" });

    const { items, total } = await repo.list({}, { page: 1, limit: 2 });
    expect(items.length).toBeLessThanOrEqual(2);
    expect(total).toBeGreaterThanOrEqual(2);
  });

  it("should find document types by ids", async () => {
    const docType1 = await repo.create({ name: "CNH" });
    const docType2 = await repo.create({ name: "Passaporte" });

    const found = await repo.findByIds(
      [docType1._id, docType2._id].map(id => id?.toString()).filter((id): id is string => !!id)
    );
    expect(found.length).toBe(2);
    expect(found.map(dt => dt.name)).toContain("CNH");
    expect(found.map(dt => dt.name)).toContain("Passaporte");
  });
});