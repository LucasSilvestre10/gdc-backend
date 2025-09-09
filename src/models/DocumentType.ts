import { Property, Required, Default } from "@tsed/schema";
import { Model, ObjectID, Schema } from "@tsed/mongoose";

@Model({
  schemaOptions: {
    versionKey: false, // Remove o __v
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  },
})
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
  deletedAt?: Date;
}
