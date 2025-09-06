import { Property, Required } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";

@Model()
export class DocumentType {
  @Property(ObjectID)
  _id?: ObjectID; // Usar _id padrão do Mongoose

  @Required()
  @Property(String)
  name!: string;
}
