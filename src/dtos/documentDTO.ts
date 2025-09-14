import { Property } from "@tsed/schema";

export enum DocumentStatus {
  PENDING = "PENDING",
  SENT = "SENT",
}

// DTO para filtros de consulta de documentos pendentes
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
