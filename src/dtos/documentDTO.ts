import { Property, Required, Enum } from "@tsed/schema";

export enum DocumentStatus {
  PENDING = "PENDING",
  SENT = "SENT"
}

// DTO simplificado para MVP - apenas representação textual
export class SendDocumentDto {
  @Required()
  @Property()
  documentTypeId!: string;

  @Required()
  @Property()
  value!: string; // Representação textual do documento (CPF: "123.456.789-01", RG: "12.345.678-9")

  @Property()
  @Enum(DocumentStatus)
  status?: DocumentStatus = DocumentStatus.SENT;
}

// DTO para atualização de documento (MVP)
export class UpdateDocumentDto {
  @Property()
  value?: string; // Atualizar valor textual

  @Property()
  @Enum(DocumentStatus)
  status?: DocumentStatus;
}

// DTO para filtros de consulta de documentos
export class DocumentFilterDto {
  @Property()
  status?: 'active' | 'inactive' | 'all' = 'all';

  @Property()
  page?: number = 1;

  @Property()
  limit?: number = 10;

  @Property()
  employeeId?: string;

  @Property()
  documentTypeId?: string;
}

/**
 * DTO para representar um documento pendente (virtual)
 * Representa tipos de documento obrigatórios que ainda não foram enviados
 */
export class PendingDocumentResponseDto {
  @Property()
  employeeId!: string;

  @Property()
  employeeName!: string;

  @Property()
  employeeDocument!: string;

  @Property()
  documentTypeId!: string;

  @Property()
  documentTypeName!: string;

  @Property()
  @Enum(DocumentStatus)
  status: DocumentStatus = DocumentStatus.PENDING;

  @Property()
  isPending: boolean = true;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;
}

// DTO de resposta para documento enviado (MVP)
export class DocumentResponseDto {
  @Property()
  id!: string;

  @Property()
  value!: string; // Valor textual do documento

  @Property()
  @Enum(DocumentStatus)
  status!: DocumentStatus;

  @Property()
  documentType!: {
    id: string;
    name: string;
  };

  @Property()
  employee!: {
    id: string;
    name: string;
  };

  @Property()
  active!: boolean;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt?: Date;

  @Property()
  deletedAt?: Date;
}

/**
 * DTO de resposta para listagem paginada de documentos pendentes
 */
export class PendingDocumentsListResponseDto {
  @Property()
  success!: boolean;

  @Property({ type: PendingDocumentResponseDto, collectionType: Array })
  data!: PendingDocumentResponseDto[];

  @Property()
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}