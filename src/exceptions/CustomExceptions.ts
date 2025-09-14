import {
  BadRequest,
  Conflict,
  NotFound,
  InternalServerError,
} from "@tsed/exceptions";

/**
 * Exceção lançada quando um colaborador não é encontrado.
 * @param id ID do colaborador (opcional)
 */
export class EmployeeNotFoundError extends NotFound {
  constructor(id?: string) {
    super(
      id
        ? `Colaborador com ID '${id}' não encontrado`
        : "Colaborador não encontrado"
    );
    this.name = "EmployeeNotFoundError";
  }
}

/**
 * Exceção lançada quando o CPF informado já está cadastrado.
 * @param cpf CPF duplicado
 */
export class DuplicateCpfError extends Conflict {
  constructor(cpf: string) {
    super(`O CPF '${cpf}' já está cadastrado no sistema`);
    this.name = "DuplicateCpfError";
  }
}

/**
 * Exceção lançada quando o tipo de documento não é encontrado.
 * @param id ID do tipo de documento (opcional)
 */
export class DocumentTypeNotFoundError extends NotFound {
  constructor(id?: string) {
    super(
      id
        ? `Tipo de documento com ID '${id}' não encontrado`
        : "Tipo de documento não encontrado"
    );
    this.name = "DocumentTypeNotFoundError";
  }
}

/**
 * Exceção lançada quando o documento já foi enviado para o colaborador.
 * @param documentType Tipo do documento
 */
export class DocumentAlreadySentError extends Conflict {
  constructor(documentType: string) {
    super(`O documento '${documentType}' já foi enviado para este colaborador`);
    this.name = "DocumentAlreadySentError";
  }
}

/**
 * Exceção lançada quando o documento não é obrigatório para o colaborador.
 * @param documentType Tipo do documento
 */
export class DocumentNotRequiredError extends BadRequest {
  constructor(documentType: string) {
    super(
      `O documento '${documentType}' não é obrigatório para este colaborador`
    );
    this.name = "DocumentNotRequiredError";
  }
}

/**
 * Exceção lançada para erros de validação customizada de campos.
 * @param field Campo com erro
 * @param message Mensagem de erro
 */
export class CustomValidationError extends BadRequest {
  constructor(field: string, message: string) {
    super(`Erro de validação no campo '${field}': ${message}`);
    this.name = "CustomValidationError";
  }
}

/**
 * Exceção lançada quando a página solicitada na paginação não existe.
 * @param requestedPage Página solicitada
 * @param totalPages Total de páginas disponíveis
 */
export class PageNotFoundError extends BadRequest {
  constructor(requestedPage: number, totalPages: number) {
    let message: string;

    if (requestedPage < 1) {
      message = `A página deve ser no mínimo 1. Página informada: ${requestedPage}`;
    } else {
      message = `Página ${requestedPage} não encontrada. Total de páginas disponíveis: ${totalPages}`;
    }

    super(message);
    this.name = "PageNotFoundError";
  }
}

/**
 * Exceção lançada para erros em operações de banco de dados.
 * @param operation Operação realizada
 * @param details Detalhes do erro (opcional)
 */
export class DatabaseError extends InternalServerError {
  constructor(operation: string, details?: string) {
    super(
      `Erro na operação de banco de dados: ${operation}${details ? ` - ${details}` : ""}`
    );
    this.name = "DatabaseError";
  }
}
