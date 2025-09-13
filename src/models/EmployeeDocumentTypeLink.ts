import { Property, Required, Default } from "@tsed/schema";
import { Model, Ref } from "@tsed/mongoose";
import { Employee } from "./Employee";
import { DocumentType } from "./DocumentType";

/**
 * Modelo para representar vínculos entre colaboradores e tipos de documentos obrigatórios
 *
 * Este modelo implementa:
 * - Soft delete por vínculo individual
 * - Rastreamento de auditoria (created, updated, deleted)
 * - Capacidade de restore de vínculos específicos
 * - Histórico completo de mudanças nos vínculos
 */
@Model({
  schemaOptions: {
    versionKey: false,
    timestamps: true,
  },
})
export class EmployeeDocumentTypeLink {
  /** Referência ao colaborador */
  @Required()
  @Property()
  @Ref(Employee)
  employeeId!: Ref<Employee>;

  /** Referência ao tipo de documento */
  @Required()
  @Property()
  @Ref(DocumentType)
  documentTypeId!: Ref<DocumentType>;

  /** Status ativo do vínculo (soft delete) */
  @Default(true)
  @Property(Boolean)
  active!: boolean;

  /** Data de criação automática */
  @Property(Date)
  createdAt?: Date;

  /** Data de última atualização */
  @Property(Date)
  updatedAt?: Date;

  /** Data de remoção (soft delete) */
  @Property(Date)
  deletedAt?: Date;
}
