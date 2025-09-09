import { Property, Required, Enum } from "@tsed/schema";

export enum DocumentStatus {
  PENDING = "pending",
  SENT = "sent"
}

export class CreateDocumentDto {
  @Required()
  @Property()
  name!: string;

  @Required()
  @Property()
  employeeId!: string;

  @Required()
  @Property()
  documentTypeId!: string;

  @Property()
  @Enum(DocumentStatus)
  status?: DocumentStatus = DocumentStatus.SENT;
}

export class ListPendingDocumentsDto {
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

/**
 * DTO de resposta para listagem paginada de documentos pendentes
 */
export class PendingDocumentsListResponseDto {
  @Property({ type: PendingDocumentResponseDto, collectionType: Array })
  documents!: PendingDocumentResponseDto[];

  @Property()
  total!: number;

  @Property()
  page!: number;

  @Property()
  totalPages!: number;

  @Property()
  limit!: number;
}