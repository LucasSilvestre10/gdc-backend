import {
  BadRequest,
  Conflict,
  NotFound,
  InternalServerError,
} from "@tsed/exceptions";

/**
 * Exceção para quando um colaborador não é encontrado
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
 * Exceção para CPF duplicado
 */
export class DuplicateCpfError extends Conflict {
  constructor(cpf: string) {
    super(`CPF '${cpf}' já está cadastrado no sistema`);
    this.name = "DuplicateCpfError";
  }
}

/**
 * Exceção para tipo de documento não encontrado
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
 * Exceção para documento já enviado
 */
export class DocumentAlreadySentError extends Conflict {
  constructor(documentType: string) {
    super(`Documento '${documentType}' já foi enviado para este colaborador`);
    this.name = "DocumentAlreadySentError";
  }
}

/**
 * Exceção para documento não obrigatório
 */
export class DocumentNotRequiredError extends BadRequest {
  constructor(documentType: string) {
    super(
      `Documento '${documentType}' não é obrigatório para este colaborador`
    );
    this.name = "DocumentNotRequiredError";
  }
}

/**
 * Exceção para validação de dados customizada
 */
export class CustomValidationError extends BadRequest {
  constructor(field: string, message: string) {
    super(`Erro de validação no campo '${field}': ${message}`);
    this.name = "CustomValidationError";
  }
}

/**
 * Exceção para operações de banco de dados
 */
export class DatabaseError extends InternalServerError {
  constructor(operation: string, details?: string) {
    super(
      `Erro na operação de banco de dados: ${operation}${details ? ` - ${details}` : ""}`
    );
    this.name = "DatabaseError";
  }
}
