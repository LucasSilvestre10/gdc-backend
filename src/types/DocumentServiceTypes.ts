import { DocumentStatus } from "../models/Document";

/**
 * Tipos para o DocumentService
 * Separados dos DTOs para manter a arquitetura limpa
 */

export interface CreateSimpleDocumentParams {
  employeeId: string;
  documentTypeId: string;
  value: string;
  status?: DocumentStatus;
}

export interface CreateDocumentParams {
  employeeId: string;
  documentTypeId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export interface UpdateDocumentParams {
  value?: string;
  status?: DocumentStatus;
}

export interface DocumentFilter {
  employeeId?: string;
  documentTypeId?: string;
  isActive?: boolean;
}

export interface ListOptions {
  page?: number;
  limit?: number;
  status?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

export interface GetPendingDocumentsParams {
  status?: string;
  page?: number;
  limit?: number;
  documentTypeId?: string;
}

export interface PendingDocumentItem {
  employee: {
    id: string;
    name: string;
  };
  documentType: {
    id: string;
    name: string;
  };
  status: string;
  active: boolean;
}

export interface PendingDocumentsResult {
  data: PendingDocumentItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipos para resposta organizada por colaborador
export interface GroupedPendingDocument {
  documentTypeId: string;
  documentTypeName: string;
  status: string;
  active: boolean;
}

export interface GroupedPendingEmployee {
  employeeId: string;
  employeeName: string;
  documents: GroupedPendingDocument[];
}

export interface GroupedPendingDocumentsResult {
  data: GroupedPendingEmployee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Tipo para processamento intermediário (antes do agrupamento)
export interface FlatPendingDocument {
  employee: {
    id: string;
    name: string;
  };
  documentType: {
    id: string;
    name: string;
  };
  status: string;
  active: boolean;
}
