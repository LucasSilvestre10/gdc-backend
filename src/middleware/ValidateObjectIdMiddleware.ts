import { Request, Response, NextFunction } from "express";
import { ValidationUtils } from "../utils/ValidationUtils";

/**
 * Retorna nome amigável para o campo
 */
function getFieldDisplayName(param: string): string {
    const fieldNames: { [key: string]: string } = {
        'id': 'ID do colaborador',
        'documentTypeId': 'ID do tipo de documento',
        'employeeId': 'ID do colaborador'
    };
    
    return fieldNames[param] || 'ID';
}

/**
 * Middleware para validar ObjectIds em parâmetros de rota
 */
export function validateObjectIdMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        // Lista de parâmetros que devem ser ObjectIds válidos
        const objectIdParams = ['id', 'documentTypeId', 'employeeId'];
        
        for (const param of objectIdParams) {
            const value = req.params[param];
            if (value && !ValidationUtils.isValidObjectId(value)) {
                const fieldName = getFieldDisplayName(param);
                return res.status(400).json({
                    success: false,
                    message: `${fieldName} inválido`,
                    data: null
                });
            }
        }
        
        next();
    } catch (error) {
        next(error);
    }
}
