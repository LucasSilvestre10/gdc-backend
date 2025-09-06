import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { DocumentRepository } from "../src/repositories/DocumentRepository";
import { Document, DocumentStatus } from "../src/models/Document";
import { MongooseModel } from "@tsed/mongoose";
import mongoose from "mongoose";

// Mock model para testes
const DocumentSchema = new mongoose.Schema({
    name: String,
    employeeId: mongoose.Schema.Types.ObjectId,
    documentTypeId: mongoose.Schema.Types.ObjectId,
    status: String
});
const DocumentModel = mongoose.model<Document>("Document", DocumentSchema);

describe("DocumentRepository", () => {
    let repo: DocumentRepository;

    beforeAll(async () => {
        // NÃO chame mongoose.connect() aqui!
        repo = new DocumentRepository(DocumentModel as unknown as MongooseModel<Document>);
    });

    afterAll(async () => {
        // NÃO chame mongoose.disconnect() aqui!
        // Limpeza opcional dos documentos criados
        await DocumentModel.deleteMany({});
    });

    it("should create and find a document", async () => {
        const employeeId = new mongoose.Types.ObjectId();
        const documentTypeId = new mongoose.Types.ObjectId();

        const doc = await repo.create({
            name: "Teste",
            employeeId,
            documentTypeId,
            status: DocumentStatus.SENT
        });
        expect(doc.name).toBe("Teste");

        const found = await repo.find({ employeeId });
        expect(found.length).toBe(1);
        expect(found[0].name).toBe("Teste");
    });

    it("should list documents with pagination", async () => {
        const employeeId = new mongoose.Types.ObjectId();
        const documentTypeId = new mongoose.Types.ObjectId();

        await repo.create({ name: "Doc1", employeeId, documentTypeId, status: DocumentStatus.SENT });
        await repo.create({ name: "Doc2", employeeId, documentTypeId, status: DocumentStatus.SENT });

        const { items, total } = await repo.list({ employeeId }, { page: 1, limit: 1 });
        expect(items.length).toBe(1);
        expect(total).toBe(2);


    });
});