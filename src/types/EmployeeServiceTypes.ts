/**
 * Types internos para o Employee Service
 * (Apenas para eliminar 'any' - não são DTOs da API)
 */

import type { Employee } from "../models/Employee";
import type { DocumentType } from "../models/DocumentType";

// Tipo base para documentos Mongoose com _id
export interface MongoDocument {
  _id: string | { toString(): string };
}

// Filtros de listagem
export interface ListFilter {
  status?: "active" | "inactive" | "all";
  isActive?: boolean | "all";
  [key: string]: unknown;
}

// Opções de paginação
export interface PaginationOptions {
  page?: number;
  limit?: number;
}

// Resultado paginado genérico
export interface PaginationResult<T> {
  items: T[];
  total: number;
}

// Filtros de busca
export interface SearchFilters {
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}

// Sumário de documentação (para enriquecimento)
export interface DocumentationSummary {
  required: number;
  sent: number;
  pending: number;
  hasRequiredDocuments: boolean;
  isComplete: boolean;
}

// Tipos para objetos Mongoose (com _id)
export type EmployeeDocument = Employee & MongoDocument;
export type DocumentTypeDocument = DocumentType & MongoDocument;

// Tipo para documentos do modelo Document com _id
export type DocumentWithId = import("../models/Document").Document &
  MongoDocument;

// Helper para extrair ID do Mongoose
export function getMongoId(doc: MongoDocument): string {
  return typeof doc._id === "string" ? doc._id : doc._id.toString();
}

// Interfaces para retornos de métodos
export interface RequiredDocumentResponse {
  documentType: {
    id: string;
    name: string;
    description: string | null;
  };
  active: boolean;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  deletedAt?: Date | undefined;
}

export interface DocumentResponse {
  id: string;
  value: string;
  status: string;
  documentType: {
    id: string;
    name: string;
    description: string | null;
  };
  employee?: {
    id: string;
    name: string;
  };
  isActive: boolean; // Corrigido para match com o código
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  deletedAt?: Date | undefined;
}

export interface DocumentFilter {
  employeeId: string;
  status?: string;
  isActive?: boolean;
  documentTypeId?: string | { $in: string[] };
}

export interface EmployeeDocumentsResult {
  documents: DocumentResponse[];
  hasRequiredDocuments: boolean;
  message?: string;
}

// Interface para enriquecer colaboradores
export interface EnrichedEmployee {
  id: string;
  name: string;
  document: string;
  hiredAt: Date;
  isActive: boolean;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  documentationSummary: DocumentationSummary;
}

// Interface para lista DTO
export interface EmployeeListResponse {
  items: Record<string, unknown>[];
  total: number;
}

// Para retorno de documentos enviados/pendentes
export interface DocumentOverviewResponse {
  total: number;
  sent: number;
  pending: number;
  documents: (SentDocumentResponse | PendingDocumentResponse)[];
  lastUpdated: string;
}

// Para método sendDocument (retorna Document do repositório)
export interface SendDocumentResult extends MongoDocument {
  value: string;
  status: string;
  employeeId: string;
  documentTypeId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interface para documentos enviados
export interface SentDocumentResponse {
  id: string;
  documentType: {
    id: string;
    name: string;
    description: string | null;
  };
  status: string;
  value: string;
  isActive: boolean; // Compatível com DocumentResponse
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

// Interface para documentos pendentes
export interface PendingDocumentResponse {
  id?: string; // Para compatibilidade
  documentType: {
    id: string;
    name: string;
    description: string | null;
  };
  status: string;
  value: null;
  isActive: boolean; // Compatível com DocumentResponse
  createdAt?: Date | undefined; // Para compatibilidade
  updatedAt?: Date | undefined; // Para compatibilidade
  requiredSince: Date | undefined;
}

// Interface para status de documentação
export interface DocumentationStatusResult {
  sent: Array<DocumentType & { documentValue?: string | null }>;
  pending: DocumentType[];
}
