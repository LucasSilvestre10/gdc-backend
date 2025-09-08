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