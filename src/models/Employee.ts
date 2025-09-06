import { Property, Required, MinLength, MaxLength, Pattern } from "@tsed/schema";
import { Model, ObjectID, Ref, Unique } from "@tsed/mongoose";
import { DocumentType } from "./DocumentType";

@Model()
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

  /** Tipos de documentos obrigatórios para o colaborador */
  @Property([Ref(DocumentType)])
  requiredDocumentTypes: Ref<DocumentType>[] = [];
}
