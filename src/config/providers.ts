import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository.js";
import { DocumentTypeService } from "../services/DocumentTypeService.js";
import { registerProvider, InjectorService } from "@tsed/di";

// Token personalizado para evitar conflito com @Model
export const DOCUMENT_TYPE_REPOSITORY_TOKEN = Symbol("DocumentTypeRepository");

// Registra o DocumentTypeRepository com token personalizado
registerProvider({
  provide: DOCUMENT_TYPE_REPOSITORY_TOKEN,
  useClass: DocumentTypeRepository
});
