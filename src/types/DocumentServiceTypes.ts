/**
 * Tipos para o DocumentService
 * Separados dos DTOs para manter a arquitetura limpa
 */

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

// Tipos para documentos enviados (formato similar ao pending)
export interface GroupedSentDocument {
  documentTypeId: string;
  documentTypeName: string;
  documentValue: string;
  status: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupedSentEmployee {
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  documents: GroupedSentDocument[];
}

export interface GroupedSentDocumentsResult {
  data: GroupedSentEmployee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
