import { PageNotFoundError } from "../exceptions/CustomExceptions";

/**
 * Utilitários para paginação padronizada
 */
export class PaginationUtils {
  /**
   * Valida se a página solicitada existe dentro do total de páginas disponíveis
   *
   * @param requestedPage - Página solicitada pelo usuário
   * @param totalRecords - Total de registros encontrados
   * @param limit - Limite de registros por página
   * @throws PageNotFoundError - Quando a página solicitada não existe
   */
  static validatePage(
    requestedPage: number,
    totalRecords: number,
    limit: number
  ): void {
    // Validar se a página é no mínimo 1
    if (requestedPage < 1) {
      throw new PageNotFoundError(requestedPage, 1);
    }

    // Só valida se houver registros
    if (totalRecords === 0) return;

    const totalPages = Math.ceil(totalRecords / limit);

    if (requestedPage > totalPages) {
      throw new PageNotFoundError(requestedPage, totalPages);
    }
  }

  /**
   * Calcula o total de páginas baseado no total de registros e limite
   *
   * @param totalRecords - Total de registros
   * @param limit - Limite de registros por página
   * @returns Número total de páginas
   */
  static calculateTotalPages(totalRecords: number, limit: number): number {
    return Math.ceil(totalRecords / limit);
  }

  /**
   * Cria objeto de paginação padronizado
   *
   * @param page - Página atual
   * @param limit - Limite por página
   * @param total - Total de registros
   * @returns Objeto de paginação com informações completas
   */
  static createPaginationInfo(
    page: number = 1,
    limit: number = 10,
    total: number
  ) {
    const totalPages = this.calculateTotalPages(total, limit);

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Cria resultado completo paginado com items (padrão para responses)
   *
   * @param items - Array de itens da página atual
   * @param page - Página atual
   * @param limit - Limite por página
   * @param total - Total de registros
   * @returns Objeto completo de resultado paginado
   */
  static createPaginatedResult<T>(
    items: T[],
    page: number,
    limit: number,
    total: number
  ) {
    return {
      items,
      pagination: this.createPaginationInfo(page, limit, total),
    };
  }
}
