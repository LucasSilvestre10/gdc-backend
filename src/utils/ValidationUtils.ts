import { InvalidObjectIdError } from "../exceptions";

/**
 * Utilitários de validação para a aplicação
 */
export class ValidationUtils {
    /**
     * Valida se o ID fornecido é um ObjectId válido do MongoDB
     * @param id - ID a ser validado
     * @returns true se o ID for válido, false caso contrário
     */
    static isValidObjectId(id: string): boolean {
        // Verifica se é uma string de 24 caracteres hexadecimais
        return /^[0-9a-fA-F]{24}$/.test(id);
    }

    /**
     * Valida se múltiplos IDs são ObjectIds válidos
     * @param ids - Array de IDs a serem validados
     * @returns true se todos os IDs forem válidos, false caso contrário
     */
    static areValidObjectIds(ids: string[]): boolean {
        return ids.every(id => this.isValidObjectId(id));
    }

    /**
     * Valida e sanitiza um ObjectId
     * @param id - ID a ser validado
     * @param fieldName - Nome do campo para mensagem de erro
     * @throws InvalidObjectIdError se o ID for inválido
     * @returns ID validado
     */
    static validateObjectId(id: string, fieldName: string = 'ID'): string {
        if (!this.isValidObjectId(id)) {
            throw new InvalidObjectIdError(fieldName);
        }
        return id;
    }

    /**
     * Verifica se um erro é um CastError do Mongoose
     * @param error - Erro a ser verificado
     * @returns true se for um CastError de ObjectId, false caso contrário
     */
    static isCastError(error: any): boolean {
        return error.name === 'CastError' && error.kind === 'ObjectId';
    }

    /**
     * Remove formatação de documentos (pontos, hífens, espaços, parênteses, etc.)
     * Mantém apenas números e letras
     * @param value - Valor do documento com possível formatação
     * @returns Valor limpo sem formatação
     */
    static cleanDocumentValue(value: string): string {
        if (!value || typeof value !== 'string') {
            return value;
        }
        
        // Remove todos os caracteres que não sejam letras ou números
        return value.replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Formata um valor de documento para exibição
     * Aplica formatação baseada no tipo de documento detectado
     * @param value - Valor limpo do documento
     * @param documentTypeName - Nome do tipo de documento (opcional)
     * @returns Valor formatado para exibição
     */
    static formatDocumentForDisplay(value: string, documentTypeName?: string): string {
        if (!value || typeof value !== 'string') {
            return value;
        }

        // Se for CPF (11 dígitos numéricos)
        if (/^\d{11}$/.test(value)) {
            return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }

        // Se for RG (9 dígitos, última posição pode ser X)
        if (/^\d{8}[\dX]$/i.test(value)) {
            return value.replace(/(\d{2})(\d{3})(\d{3})([\dX])/, '$1.$2.$3-$4');
        }

        // Para outros tipos, retorna sem formatação
        return value;
    }
}
