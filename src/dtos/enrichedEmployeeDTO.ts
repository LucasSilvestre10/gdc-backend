import { Property, Required } from "@tsed/schema";

/**
 * DTO para informações resumidas de documentação do colaborador
 */
export class DocumentationSummaryDto {
  @Property()
  required!: number; // Quantidade de documentos obrigatórios

  @Property()
  sent!: number; // Quantidade de documentos enviados

  @Property()
  pending!: number; // Quantidade de documentos pendentes

  @Property()
  hasRequiredDocuments!: boolean; // Se tem documentos obrigatórios vinculados

  @Property()
  isComplete!: boolean; // Se toda documentação obrigatória foi enviada
}

/**
 * DTO para colaborador enriquecido com informações de documentação
 */
export class EnrichedEmployeeDto {
  @Property()
  id!: string;

  @Property()
  name!: string;

  @Property()
  document!: string;

  @Property()
  hiredAt!: Date;

  @Property()
  isActive!: boolean;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;

  @Property()
  documentationSummary!: DocumentationSummaryDto;
}

/**
 * DTO para resposta de listagem/busca de colaboradores com paginação
 */
export class EmployeeSearchResponseDto {
  @Property([EnrichedEmployeeDto])
  employees!: EnrichedEmployeeDto[];

  @Property()
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * DTO para documento individual com informações completas
 */
export class DocumentDetailDto {
  @Property()
  id!: string;

  @Property()
  documentType!: {
    id: string;
    name: string;
    description: string | null;
  };

  @Property()
  status!: string; // SENT, PENDING

  @Property()
  value!: string | null; // Valor do documento (já limpo)

  @Property()
  active!: boolean;

  @Property()
  createdAt?: Date;

  @Property()
  updatedAt?: Date;
}

/**
 * DTO para resposta de documentos do colaborador
 */
export class EmployeeDocumentsResponseDto {
  @Property()
  employee!: {
    id: string;
    name: string;
  };

  @Property()
  documentsInfo!: {
    total: number;
    hasRequiredDocuments: boolean;
    documents: DocumentDetailDto[];
  };
}

/**
 * Wrapper para respostas padronizadas da API
 */
export class StandardApiResponseDto<T> {
  @Property()
  success!: boolean;

  @Property()
  message!: string;

  @Property()
  data!: T;

  @Property()
  timestamp!: string;
}
