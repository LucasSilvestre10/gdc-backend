import { Property, Required, Default } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";

@Model()
export class DocumentType {
  @Property(ObjectID)
  _id?: ObjectID; // Usar _id padrão do Mongoose

  @Required()
  @Property(String)
  name!: string;

  @Property(String)
  description?: string;

  @Default(true)
  @Property(Boolean)
  isActive!: boolean;

  @Property(Date)
  createdAt?: Date;

  @Property(Date)
  updatedAt?: Date;

  @Property(Date)
  deletedAt?: Date;
}
