/**
 * Types internos para o Employee Service
 * (Apenas para eliminar 'any' - não são DTOs da API)
 */

import type { Employee } from "../models/Employee";
import type { DocumentType } from "../models/DocumentType";
import type { Document } from "../models/Document";

// Tipo base para documentos Mongoose com _id
export interface MongoDocument {
  _id: string | { toString(): string };
}

// Filtros para listagem de colaboradores
export interface ListFilter {
  status?: "active" | "inactive" | "all";
  name?: string;
  document?: string;
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

// Filtros para busca
export interface SearchFilters {
  status?: "active" | "inactive" | "all";
  page?: number;
  limit?: number;
}

// Tipo para DocumentType com _id para população
export interface DocumentTypeDocument extends DocumentType {
  _id: string | { toString(): string };
  name: string;
  description?: string;
}

// Tipo para documentos com _id
export type DocumentWithId = Document & MongoDocument;

// Tipo para document types com _id
// Tipos para objetos Mongoose (com _id)
export type EmployeeDocument = Employee & MongoDocument;

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

// Interface para resumo da documentação de um colaborador
export interface DocumentationSummary {
  required: number;
  sent: number;
  pending: number;
  total: number;
  hasRequiredDocuments: boolean;
  isComplete: boolean;
  completionPercentage: number;
  lastUpdated?: Date;
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
  items: EmployeeDto[];
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

// Interface para conversão de Employee para DTO
export interface EmployeeDto {
  id: string;
  name: string;
  document: string;
  hiredAt: Date;
  isActive: boolean;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
  deletedAt?: Date | undefined;
}

// Interface para resultado de busca de colaboradores
export interface EmployeeSearchResult {
  items: Employee[];
  total: number;
}
