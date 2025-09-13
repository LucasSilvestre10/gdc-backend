import { Exception } from "@tsed/exceptions";
import { AppError } from "../exceptions";

/**
 * Utilitário para padronizar o tratamento de respostas HTTP.
 * Converte dados e erros em respostas HTTP apropriadas.
 */

type ValidationErrorItem = { message: string };
type MongooseValidationError = {
  name: "ValidationError";
  errors: Record<string, ValidationErrorItem>;
};
type MongooseCastError = { name: "CastError" };
type MongooseConnectionError = { name: "MongoError" | "MongooseError" };

export class ResponseHandler {
  /**
   * Processa um erro e retorna o objeto de resposta apropriado.
   */
  static handleError(
    error:
      | Error
      | Exception
      | AppError
      | MongooseValidationError
      | MongooseCastError
      | MongooseConnectionError,
    path?: string
  ): { statusCode: number; response: object } {
    // Error log for monitoring
    if (error instanceof Error) {
      console.error("Error handled:", {
        error: error.message,
        stack: error.stack,
        path: path,
        timestamp: new Date().toISOString(),
      });
    }

    // Custom application error
    if (error instanceof AppError) {
      return {
        statusCode: error.statusCode,
        response: {
          success: false,
          error: {
            code: error.code || error.name,
            message: error.message,
            statusCode: error.statusCode,
          },
          timestamp: new Date().toISOString(),
          path: path,
        },
      };
    }

    // TS.ED exception
    if (error instanceof Exception) {
      return {
        statusCode: error.status,
        response: {
          success: false,
          error: {
            code: error.name,
            message: error.message,
            statusCode: error.status,
          },
          timestamp: new Date().toISOString(),
          path: path,
        },
      };
    }

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(
        (error as MongooseValidationError).errors
      ).map((err) => err.message);
      return {
        statusCode: 400,
        response: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Dados inválidos",
            details: validationErrors,
            statusCode: 400,
          },
          timestamp: new Date().toISOString(),
          path: path,
        },
      };
    }

    // Mongoose cast error
    if (error.name === "CastError") {
      return {
        statusCode: 400,
        response: {
          success: false,
          error: {
            code: "INVALID_OBJECT_ID",
            message: "ID informado é inválido",
            statusCode: 400,
          },
          timestamp: new Date().toISOString(),
          path: path,
        },
      };
    }

    // MongoDB connection error
    if (error.name === "MongoError" || error.name === "MongooseError") {
      return {
        statusCode: 503,
        response: {
          success: false,
          error: {
            code: "DATABASE_ERROR",
            message: "Serviço temporariamente indisponível",
            statusCode: 503,
          },
          timestamp: new Date().toISOString(),
          path: path,
        },
      };
    }

    // Unhandled errors (500)
    return {
      statusCode: 500,
      response: {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message:
            process.env.NODE_ENV === "production"
              ? "Erro interno do servidor"
              : error instanceof Error
                ? error.message
                : "Unknown error",
          statusCode: 500,
        },
        timestamp: new Date().toISOString(),
        path: path,
      },
    };
  }

  /**
   * Cria uma resposta de sucesso padronizada.
   */
  static success<T>(
    data: T,
    message: string = "Operação realizada com sucesso"
  ): {
    success: true;
    message: string;
    data: T;
    timestamp: string;
  } {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
