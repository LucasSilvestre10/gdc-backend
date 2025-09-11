import { Request, Response, NextFunction } from "express";
import { Exception } from "@tsed/exceptions";
import { $log } from "@tsed/logger";

interface MongoError extends Error {
  code?: number;
}

/**
 * Global Error Middleware para Express que captura todos os erros não tratados
 * e os converte em respostas HTTP padronizadas
 */
export class GlobalExceptionHandler {
  /**
   * Middleware de tratamento global de erros
   */
  static handle(
    err: Error | Exception,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Se a resposta já foi enviada, delega para o handler padrão do Express
    if (res.headersSent) {
      return next(err);
    }

    // Determina status HTTP e mensagem baseado no tipo de erro
    const errorInfo = GlobalExceptionHandler.getErrorInfo(err);

    // Log estruturado do erro
    GlobalExceptionHandler.logError(err, req, errorInfo);

    // Resposta padronizada para o cliente
    const errorResponse = {
      success: false,
      message: errorInfo.message,
      error: {
        type: err.name || "UnknownError",
        code: errorInfo.code,
        timestamp: new Date().toISOString(),
        path: req.url,
        method: req.method,
      },
      ...(process.env.NODE_ENV === "development" && {
        stack: err.stack?.split("\n").slice(0, 10), // Limita stack trace
        details: {
          name: err.name,
          message: err.message,
        },
      }),
    };

    res.status(errorInfo.status).json(errorResponse);
  } /**
   * Determina informações do erro baseado no tipo/nome da exceção
   */
  private static getErrorInfo(exception: Exception | Error): {
    status: number;
    message: string;
    code: string;
  } {
    // Erros do TS.ED (já têm status HTTP)
    if (exception instanceof Exception && exception.status) {
      return {
        status: exception.status,
        message: exception.message,
        code: GlobalExceptionHandler.getErrorCode(exception),
      };
    }

    // Erros customizados do domínio
    switch (exception.name) {
      case "EmployeeNotFoundError":
      case "DocumentTypeNotFoundError":
        return {
          status: 404,
          message: exception.message,
          code: "RESOURCE_NOT_FOUND",
        };

      case "DuplicateCpfError":
      case "DocumentAlreadySentError":
        return {
          status: 409,
          message: exception.message,
          code: "RESOURCE_CONFLICT",
        };

      case "DocumentNotRequiredError":
      case "CustomValidationError":
        return {
          status: 400,
          message: exception.message,
          code: "VALIDATION_ERROR",
        };

      case "DatabaseError":
        return {
          status: 500,
          message: "Erro interno do servidor",
          code: "DATABASE_ERROR",
        };

      // Erros de validação do TS.ED
      case "AjvValidationError":
      case "ParseExpressionError":
      case "ParamValidationError":
        return {
          status: 400,
          message: "Dados de entrada inválidos",
          code: "VALIDATION_ERROR",
        };

      // Erros de MongoDB/Mongoose
      case "ValidationError": // Mongoose validation
        return {
          status: 400,
          message: "Erro de validação dos dados",
          code: "VALIDATION_ERROR",
        };

      case "CastError": // MongoDB cast error
        return {
          status: 400,
          message: "Formato de ID inválido",
          code: "INVALID_ID_FORMAT",
        };

      case "MongoServerError": {
        const mongoError = exception as MongoError;
        if (mongoError.code === 11000) {
          // Duplicate key error
          return {
            status: 409,
            message: "Recurso já existe",
            code: "DUPLICATE_RESOURCE",
          };
        }
        return {
          status: 500,
          message: "Erro interno do servidor",
          code: "DATABASE_ERROR",
        };
      }

      // Erro padrão
      default:
        return {
          status: 500,
          message: "Erro interno do servidor",
          code: "INTERNAL_SERVER_ERROR",
        };
    }
  }

  /**
   * Gera código de erro baseado no tipo da exceção
   */
  private static getErrorCode(exception: Exception): string {
    if (exception.status === 400) return "BAD_REQUEST";
    if (exception.status === 401) return "UNAUTHORIZED";
    if (exception.status === 403) return "FORBIDDEN";
    if (exception.status === 404) return "NOT_FOUND";
    if (exception.status === 409) return "CONFLICT";
    if (exception.status === 422) return "UNPROCESSABLE_ENTITY";
    if (exception.status >= 500) return "INTERNAL_SERVER_ERROR";

    return "UNKNOWN_ERROR";
  }

  /**
   * Log estruturado do erro
   */
  private static logError(
    exception: Exception | Error,
    req: Request,
    errorInfo: { status: number; message: string; code: string }
  ): void {
    const logData = {
      error: {
        name: exception.name,
        message: exception.message,
        code: errorInfo.code,
        status: errorInfo.status,
      },
      request: {
        method: req.method,
        url: req.url,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        params: req.params,
        query: req.query,
        // Não loga body completo por segurança, apenas campos seguros
        body: GlobalExceptionHandler.sanitizeBody(req.body),
      },
      timestamp: new Date().toISOString(),
    };

    // Log level baseado no status
    if (errorInfo.status >= 500) {
      $log.error("🚨 Server Error:", logData);
      // Em produção, aqui você poderia enviar para um serviço de monitoramento
      // como Sentry, New Relic, etc.
    } else if (errorInfo.status >= 400) {
      $log.warn("⚠️  Client Error:", logData);
    } else {
      $log.info("ℹ️  Request Error:", logData);
    }
  }

  /**
   * Remove campos sensíveis do body para logs
   */
  private static sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== "object") return body;

    const sensitiveFields = ["password", "token", "secret", "key", "auth"];
    const sanitized = { ...(body as Record<string, unknown>) };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "[REDACTED]";
      }
    }

    return sanitized;
  }
}
