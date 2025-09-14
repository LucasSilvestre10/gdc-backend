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
    // Normaliza Mongoose documents que possuem _id para expor `id` nos responses
    function mapId(obj: unknown): unknown {
      // preserva null/undefined
      if (obj === null || obj === undefined) return obj;

      // Preserva valores primitivos
      if (typeof obj !== "object") return obj;

      // Preserva Date
      if (obj instanceof Date) return obj;

      // arrays
      if (Array.isArray(obj)) return (obj as unknown[]).map(mapId);

      const record = obj as Record<string, unknown>;

      // Se for um documento Mongoose, converte para objeto plano incluindo virtuals
      const unknownRec = record as unknown;
      if (
        unknownRec &&
        typeof (unknownRec as { toObject?: unknown }).toObject === "function"
      ) {
        try {
          const plain = (
            unknownRec as {
              toObject: (opts?: unknown) => Record<string, unknown>;
            }
          ).toObject({ virtuals: true });
          return mapId(plain);
        } catch {
          // fallback
        }
      }

      // Se já possui `id`, manter como chave principal e mapear o restante
      if (record.id) {
        const { id, ...rest } = record;
        const mapped = Object.entries(rest).reduce(
          (acc: Record<string, unknown>, [k, v]) => {
            acc[k] = mapId(v);
            return acc;
          },
          {} as Record<string, unknown>
        );
        return { id, ...mapped } as unknown;
      }

      // mapear _id para id quando presente em objeto plain colocando `id` primeiro
      if (record._id) {
        try {
          const { _id, ...rest } = record;

          // tenta extrair um hex string do _id
          let idValue: string;

          // helper que procura recursivamente um array de bytes no objeto
          const findByteArray = (o: unknown): number[] | null => {
            if (Array.isArray(o) && o.every((n) => typeof n === "number")) {
              return o as number[];
            }
            if (o && typeof o === "object") {
              for (const k of Object.keys(o as Record<string, unknown>)) {
                try {
                  const res = findByteArray((o as Record<string, unknown>)[k]);
                  if (res) return res;
                } catch {
                  // ignore
                }
              }
            }
            return null;
          };

          try {
            // ObjectId case
            // tentar detectar ObjectId com método toHexString
            if (
              typeof (_id as unknown as { toHexString?: unknown })
                ?.toHexString === "function"
            ) {
              idValue = String(
                (_id as unknown as { toHexString: () => string }).toHexString()
              );
            } else if (Buffer.isBuffer(_id)) {
              idValue = (_id as Buffer).toString("hex");
            } else {
              const bytes = findByteArray(_id);
              if (bytes) {
                idValue = Buffer.from(bytes).toString("hex");
              } else {
                idValue = String(_id);
              }
            }
          } catch {
            idValue = String(_id);
          }

          const mappedRest = Object.entries(rest).reduce(
            (acc: Record<string, unknown>, [k, v]) => {
              acc[k] = mapId(v);
              return acc;
            },
            {} as Record<string, unknown>
          );

          return { id: idValue, ...mappedRest } as unknown;
        } catch {
          return record;
        }
      }

      // mapear recursivamente campos do objeto
      const entries = Object.entries(record).reduce(
        (acc: Record<string, unknown>, [k, v]) => {
          acc[k] = mapId(v);
          return acc;
        },
        {} as Record<string, unknown>
      );
      return entries;
    }

    const normalizedData = mapId(data) as T;

    // Remover quaisquer `_id` remanescentes e garantir `id` como string
    const extractIdFrom = (v: unknown): string | null => {
      try {
        if (v === null || v === undefined) return null;
        // ObjectId-like
        if (
          typeof (v as unknown as { toHexString?: unknown })?.toHexString ===
          "function"
        ) {
          return String(
            (v as unknown as { toHexString: () => string }).toHexString()
          );
        }
        if (Buffer.isBuffer(v)) return (v as Buffer).toString("hex");
        // procurar arrays de bytes
        const findBytes = (o: unknown): number[] | null => {
          if (Array.isArray(o) && o.every((n) => typeof n === "number"))
            return o as number[];
          if (o && typeof o === "object") {
            for (const k of Object.keys(o as Record<string, unknown>)) {
              const res = findBytes((o as Record<string, unknown>)[k]);
              if (res) return res;
            }
          }
          return null;
        };
        const bytes = findBytes(v);
        if (bytes) return Buffer.from(bytes).toString("hex");
        return String(v);
      } catch {
        return null;
      }
    };

    const removeIdKeys = (o: unknown): unknown => {
      if (o === null || o === undefined) return o;
      if (typeof o !== "object") return o;
      if (o instanceof Date) return o;
      if (Array.isArray(o)) return (o as unknown[]).map(removeIdKeys);

      const rec = o as Record<string, unknown>;
      // if has own _id
      if (Object.prototype.hasOwnProperty.call(rec, "_id")) {
        const idVal = extractIdFrom(rec["_id"]);
        // delete the raw _id
        delete rec["_id"];
        if (idVal && !rec["id"]) {
          // place id first: create new object with id then rest
          const rest = { ...rec };
          // assign id then copy rest keys
          const newObj: Record<string, unknown> = { id: idVal };
          for (const k of Object.keys(rest)) newObj[k] = removeIdKeys(rest[k]);
          return newObj;
        }
      }

      // recurse
      for (const k of Object.keys(rec)) {
        rec[k] = removeIdKeys(rec[k]);
      }
      return rec;
    };

    const cleaned = removeIdKeys(normalizedData) as T;

    return {
      success: true,
      message,
      data: cleaned,
      timestamp: new Date().toISOString(),
    };
  }
}
