import { DocumentationSummary } from "../types/EmployeeServiceTypes";
import { DocumentationSummaryDto } from "../dtos/employeeResponseDTO";

/**
 * Utilitários para conversão entre tipos do service e DTOs
 */
export class MappingUtils {
  /**
   * Converte DocumentationSummary (service) para DocumentationSummaryDto (API response)
   *
   * @param summary - Resumo de documentação do service
   * @returns DTO formatado para resposta da API
   */
  static toDocumentationSummaryDto(
    summary: DocumentationSummary
  ): DocumentationSummaryDto {
    return {
      required: summary.total,
      sent: summary.sent,
      pending: summary.pending,
      hasRequiredDocuments: summary.total > 0,
      isComplete: summary.pending === 0 && summary.total > 0,
    };
  }
}
