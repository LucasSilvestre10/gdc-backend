/**
 * Sistema de exceções customizadas para tratamento semântico de erros
 */

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: string;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true, code?: string) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.code = code;
        
        // Mantém o stack trace correto
        Error.captureStackTrace(this, this.constructor);
    }
}

// 400 - Bad Request
export class ValidationError extends AppError {
    constructor(message: string, code?: string) {
        super(message, 400, true, code);
        this.name = 'ValidationError';
    }
}

// 401 - Unauthorized
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Não autorizado', code?: string) {
        super(message, 401, true, code);
        this.name = 'UnauthorizedError';
    }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
    constructor(message: string = 'Acesso negado', code?: string) {
        super(message, 403, true, code);
        this.name = 'ForbiddenError';
    }
}

// 404 - Not Found
export class NotFoundError extends AppError {
    constructor(message: string, code?: string) {
        super(message, 404, true, code);
        this.name = 'NotFoundError';
    }
}

// 409 - Conflict
export class ConflictError extends AppError {
    constructor(message: string, code?: string) {
        super(message, 409, true, code);
        this.name = 'ConflictError';
    }
}

// 422 - Unprocessable Entity
export class UnprocessableEntityError extends AppError {
    constructor(message: string, code?: string) {
        super(message, 422, true, code);
        this.name = 'UnprocessableEntityError';
    }
}

// 500 - Internal Server Error
export class InternalServerError extends AppError {
    constructor(message: string = 'Erro interno do servidor', code?: string) {
        super(message, 500, true, code);
        this.name = 'InternalServerError';
    }
}

// Tipos específicos para o domínio
export class EmployeeNotFoundError extends NotFoundError {
    constructor(id?: string) {
        const message = id ? `Colaborador com ID ${id} não encontrado` : 'Colaborador não encontrado';
        super(message, 'EMPLOYEE_NOT_FOUND');
    }
}

export class DocumentTypeNotFoundError extends NotFoundError {
    constructor(id?: string) {
        const message = id ? `Tipo de documento com ID ${id} não encontrado` : 'Tipo de documento não encontrado';
        super(message, 'DOCUMENT_TYPE_NOT_FOUND');
    }
}

export class DuplicateEmployeeError extends ConflictError {
    constructor(cpf: string) {
        super(`Já existe um colaborador cadastrado com o CPF ${cpf}`, 'DUPLICATE_EMPLOYEE_CPF');
    }
}

export class InvalidObjectIdError extends ValidationError {
    constructor(fieldName: string = 'ID') {
        super(`${fieldName} deve ser um ObjectId válido de 24 caracteres hexadecimais`, 'INVALID_OBJECT_ID');
    }
}

export class DocumentAlreadyExistsError extends ConflictError {
    constructor(documentType: string) {
        super(`Documento ${documentType} já foi enviado por este colaborador`, 'DOCUMENT_ALREADY_EXISTS');
    }
}
