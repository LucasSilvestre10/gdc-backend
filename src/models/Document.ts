import { Property, Required } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";
import { Employee } from "./Employee";
import { DocumentType } from "./DocumentType";

export enum DocumentStatus {
  PENDING = "pending",
  SENT = "sent"
}

@Model()
export class Document {

  @Property(ObjectID)
  _id?: ObjectID;

  @Required()
  @Property(String)
  name!: string;

  @Required()
  @Property(String)
  status: DocumentStatus = DocumentStatus.PENDING;

  @Required()
  @Property(ObjectID)
  employeeId!: ObjectID;

  @Required()
  @Property(ObjectID)
  documentTypeId!: ObjectID;
}
