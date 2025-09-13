import { Property, Required, Default } from "@tsed/schema";
import { Model } from "@tsed/mongoose";

/**
 * Configuração do decorador para o modelo DocumentType.
 *
 * @observações
 * A propriedade `schemaOptions` personaliza o comportamento do schema do Mongoose:
 * - `versionKey: false` remove o campo de versionamento (`__v`) dos documentos para simplificar a estrutura.
 * - `timestamps: true` adiciona automaticamente os campos `createdAt` e `updatedAt` aos documentos, registrando quando foram criados e atualizados.
 */
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
