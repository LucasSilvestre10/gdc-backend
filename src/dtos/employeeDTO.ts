import { Property, Required, MinLength, MaxLength, Pattern } from "@tsed/schema";

export class RequiredDocumentDto {
  @Required()
  @Property()
  documentTypeId!: string;

  @Property()
  value?: string; // Valor textual do documento (ex: número do CPF, RG, etc.)
}

export class CreateEmployeeDto {
  @Required()
  @Property()
  name!: string;

  @Required()
  @Property()
  document!: string; // CPF

  @Required()
  @Property()
  hiredAt!: Date;

  @Property([RequiredDocumentDto])
  requiredDocuments?: RequiredDocumentDto[]; // Documentos obrigatórios com valores opcionais
}

export class UpdateEmployeeDto {
  @Property()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @Property()
  @Pattern(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/)
  document?: string;

  @Property()
  hiredAt?: Date;
}

export class LinkDocumentTypesDto {
  @Required()
  @Property(String)
  documentTypeIds!: string[];
}

// DTO para resposta de vínculos de tipos de documento
export class RequiredDocumentLinkDto {
  @Property()
  documentType!: {
    id: string;
    name: string;
    description?: string;
  };

  @Property()
  active!: boolean;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;

  @Property()
  deletedAt?: Date;
}

// DTO para resposta de listagem de colaboradores
export class EmployeeListDto {
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
  deletedAt?: Date;
}

// DTO para resposta de status da documentação
export class DocumentationStatusDto {
  @Property()
  employee!: {
    id: string;
    name: string;
  };

  @Property()
  documentationStatus!: {
    total: number;
    sent: number;
    pending: number;
    documents: Array<{
      type: {
        id: string;
        name: string;
      };
      status: 'SENT' | 'PENDING';
      value: string | null;
      active: boolean;
    }>;
  };
}

// DTO para resposta paginada
export class PaginatedResponseDto<T> {
  @Property()
  success!: boolean;

  @Property()
  message?: string;

  @Property()
  data!: T[];

  @Property()
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO para consulta com filtros de status
export class StatusFilterDto {
  @Property()
  status?: 'active' | 'inactive' | 'all' = 'all';

  @Property()
  page?: number = 1;

  @Property()
  limit?: number = 20;
}

// DTO para resposta de documento individual
export class EmployeeDocumentDto {
  @Property()
  id!: string;

  @Property()
  name!: string;

  @Property()
  status!: 'SENT' | 'PENDING';

  @Property()
  documentType!: {
    id: string;
    name: string;
    description?: string;
  };

  @Property()
  employee!: {
    id: string;
    name: string;
  };

  @Property()
  active!: boolean;

  @Property()
  createdAt!: Date;

  @Property()
  updatedAt!: Date;

  @Property()
  deletedAt?: Date;
}