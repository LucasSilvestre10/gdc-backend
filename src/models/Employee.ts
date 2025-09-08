import { Property, Required, MinLength, MaxLength, Pattern, Default } from "@tsed/schema";
import { Model, ObjectID, Ref, Unique } from "@tsed/mongoose";
import { DocumentType } from "./DocumentType";

@Model()
export class Employee {
  /** Identificador único do colaborador */
  @Property(ObjectID)
  _id?: ObjectID;

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

  /** Tipos de documentos obrigatórios para o colaborador */
  @Property([Ref(DocumentType)])
  requiredDocumentTypes: Ref<DocumentType>[] = [];

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
