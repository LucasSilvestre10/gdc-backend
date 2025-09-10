import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository.js";
import { DocumentTypeService } from "../services/DocumentTypeService.js";
import { EmployeeRepository } from "../repositories/EmployeeRepository.js";
import { DocumentRepository } from "../repositories/DocumentRepository.js";
import { registerProvider, InjectorService } from "@tsed/di";

// Tokens personalizados para evitar conflito com @Model
export const DOCUMENT_TYPE_REPOSITORY_TOKEN = Symbol("DocumentTypeRepository");
export const EMPLOYEE_REPOSITORY_TOKEN = Symbol("EmployeeRepository");
export const DOCUMENT_REPOSITORY_TOKEN = Symbol("DocumentRepository");

// Registra os repositórios com tokens personalizados
registerProvider({
  provide: DOCUMENT_TYPE_REPOSITORY_TOKEN,
  useClass: DocumentTypeRepository
});

registerProvider({
  provide: EMPLOYEE_REPOSITORY_TOKEN,
  useClass: EmployeeRepository
});

registerProvider({
  provide: DOCUMENT_REPOSITORY_TOKEN,
  useClass: DocumentRepository
});
