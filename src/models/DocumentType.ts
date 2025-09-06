import { Property, Required } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";

@Model()
export class DocumentType {
  @Required()
  @Property(String)
  name!: string;
}
