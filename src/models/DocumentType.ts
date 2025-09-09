import { Property, Required, Default } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";

@Model()
export class DocumentType {

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
