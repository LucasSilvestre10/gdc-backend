import {
  Property,
  Required,
  MinLength,
  MaxLength,
  Pattern,
  Default,
} from "@tsed/schema";
import { Model, Ref, Unique } from "@tsed/mongoose";
import { DocumentType } from "./DocumentType";

@Model({
  schemaOptions: {
    versionKey: false, // Remove o __v
    timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  },
})
export class Employee {
  /** Nome do colaborador */
  @Required()
  @Property(String)
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  /** CPF do colaborador (único, obrigatório, trim, formato válido) */
  @Required()
  @Property(String)
  @Unique()
  @Pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
  document!: string;

  /** Data de contratação (default: agora) */
  @Property(Date)
  hiredAt: Date = new Date();

  /**
   * Tipos de documentos obrigatórios para o colaborador
   * Estrutura com metadata para suportar soft delete por vínculo
   */
  @Property([
    {
      documentTypeId: { type: String, ref: "DocumentType", required: true },
      active: { type: Boolean, default: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      deletedAt: { type: Date, default: null },
    },
  ])
  requiredDocumentTypes: Array<{
    documentTypeId: Ref<DocumentType>;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
  }> = [];

  /** Indica se o colaborador está ativo (soft delete) */
  @Default(true)
  @Property(Boolean)
  isActive!: boolean;

  /** Data de criação do registro */
  @Property(Date)
  createdAt?: Date;

  /** Data de última atualização */
  @Property(Date)
  updatedAt?: Date;

  /** Data de remoção (soft delete) */
  @Property(Date)
  deletedAt?: Date;
}
