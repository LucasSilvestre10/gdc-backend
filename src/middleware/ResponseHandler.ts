import { Exception } from "@tsed/exceptions";
import { AppError } from "../exceptions";

/**
 * Utilitário para tratamento padronizado de respostas HTTP
 * Converte dados e erros em respostas HTTP apropriadas
 */
export class ResponseHandler {
    /**
     * Processa um erro e retorna o objeto de resposta apropriado
     */
    static handleError(error: any, path?: string): { statusCode: number; response: any } {
        // Log do erro para monitoramento
        console.error('Error handled:', {
            error: error.message,
            stack: error.stack,
            path: path,
            timestamp: new Date().toISOString()
        });

        // Se é um erro customizado da aplicação
        if (error instanceof AppError) {
            return {
                statusCode: error.statusCode,
                response: {
                    success: false,
                    error: {
                        code: error.code || error.name,
                        message: error.message,
                        statusCode: error.statusCode
                    },
                    timestamp: new Date().toISOString(),
                    path: path
                }
            };
        }

        // Se é uma exceção do TS.ED (@tsed/exceptions)
        if (error instanceof Exception) {
            return {
                statusCode: error.status,
                response: {
                    success: false,
                    error: {
                        code: error.name,
                        message: error.message,
                        statusCode: error.status
                    },
                    timestamp: new Date().toISOString(),
                    path: path
                }
            };
        }

        // Erros do Mongoose
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return {
                statusCode: 400,
                response: {
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Dados inválidos',
                        details: validationErrors,
                        statusCode: 400
                    },
                    timestamp: new Date().toISOString(),
                    path: path
                }
            };
        }

        if (error.name === 'CastError') {
            return {
                statusCode: 400,
                response: {
                    success: false,
                    error: {
                        code: 'INVALID_OBJECT_ID',
                        message: 'ID inválido fornecido',
                        statusCode: 400
                    },
                    timestamp: new Date().toISOString(),
                    path: path
                }
            };
        }

        // Erro de conexão com MongoDB
        if (error.name === 'MongoError' || error.name === 'MongooseError') {
            return {
                statusCode: 503,
                response: {
                    success: false,
                    error: {
                        code: 'DATABASE_ERROR',
                        message: 'Serviço temporariamente indisponível',
                        statusCode: 503
                    },
                    timestamp: new Date().toISOString(),
                    path: path
                }
            };
        }

        // Para erros não tratados (500)
        return {
            statusCode: 500,
            response: {
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: process.env.NODE_ENV === 'production' 
                        ? 'Erro interno do servidor' 
                        : error.message,
                    statusCode: 500
                },
                timestamp: new Date().toISOString(),
                path: path
            }
        };
    }

    /**
     * Cria uma resposta de sucesso padronizada
     */
    static success(data: any, message: string = 'Operação realizada com sucesso'): any {
        return {
            success: true,
            message,
            data,
            timestamp: new Date().toISOString()
        };
    }
}
