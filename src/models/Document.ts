import { Property, Required, Default } from "@tsed/schema";
import { Model, ObjectID } from "@tsed/mongoose";
import { Employee } from "./Employee";
import { DocumentType } from "./DocumentType";

export enum DocumentStatus {
  PENDING = "PENDING",
  SENT = "SENT"
}

/**
 * Modelo Document simplificado para MVP
 * 
 * Representa apenas o valor textual do documento (string)
 * Exemplos: CPF "123.456.789-01", RG "12.345.678-9", CNH "123456789"
 * 
 * Não há arquivos físicos - apenas representação textual
 */
@Model({
  schemaOptions: {
    versionKey: false,
    timestamps: true,
  },
})
export class Document {
  /** Valor textual do documento (CPF, RG, CNH, etc.) */
  @Required()
  @Property(String)
  value!: string;

  /** Status do documento (SENT ou PENDING) */
  @Required()
  @Property(String)
  status: DocumentStatus = DocumentStatus.SENT;

  /** ID do colaborador proprietário do documento */
  @Required()
  @Property(String)
  employeeId!: string;

  /** ID do tipo de documento */
  @Required()
  @Property(String)
  documentTypeId!: string;

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
