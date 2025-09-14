import { Property } from "@tsed/schema";
/**
 * DTO para informações de paginação
 */
export interface PaginationInfoDto {
  /** Página atual */
  page: number;

  /** Limite de itens por página */
  limit: number;

  /** Total de registros encontrados */
  total: number;

  /** Total de páginas calculado */
  totalPages: number;

  /** Indica se existe próxima página */
  hasNextPage: boolean;

  /** Indica se existe página anterior */
  hasPreviousPage: boolean;
}

/**
 * DTO para resposta paginada usando o padrão "items"
 * Usado quando queremos manter o padrão legacy de alguns endpoints
 */
export interface ItemsPaginatedResponseDto<T> {
  /** Lista de itens da página atual */
  items: T[];

  /** Informações de paginação */
  pagination: PaginationInfoDto;
}

/**
 * DTO para parâmetros de paginação nas requisições
 */
export interface PaginationParamsDto {
  /** Número da página (padrão: 1) */
  page?: number;

  /** Limite de itens por página (padrão: 10) */
  limit?: number;
}

/**
 * DTO para resposta de sucesso padronizada com paginação
 */
export interface SuccessItemsPaginatedResponseDto<T> {
  /** Sempre true para respostas de sucesso */
  success: true;

  /** Dados retornados */
  data: ItemsPaginatedResponseDto<T>;

  /** Mensagem de sucesso */
  message: string;
}

/**
 * Classe genérica de resposta paginada reutilizável.
 * Mantém compatibilidade com a implementação usada em outros DTOs (ex: employeeDTO.PaginatedResponseDto)
 */
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
