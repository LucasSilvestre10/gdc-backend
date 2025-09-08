import { describe, it, expect } from 'vitest';
import { CreateDocumentDto, DocumentStatus, ListPendingDocumentsDto } from '../src/dtos/documentDTO';

describe('DocumentDTO', () => {
    describe('CreateDocumentDto', () => {
        // Testa se o DTO é criado corretamente com todas as propriedades definidas
        it('deve criar DTO válido com todas as propriedades', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'CPF - João Silva';
            dto.employeeId = '507f1f77bcf86cd799439011';
            dto.documentTypeId = '507f1f77bcf86cd799439012';
            dto.status = DocumentStatus.PENDING;

            // Espera que todas as propriedades estejam corretamente atribuídas
            expect(dto.name).toBe('CPF - João Silva');
            expect(dto.employeeId).toBe('507f1f77bcf86cd799439011');
            expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439012');
            expect(dto.status).toBe('pending');
        });

        // Testa se o status padrão é SENT quando não informado
        it('deve ter status padrão como SENT quando não informado', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'RG - Maria Santos';
            dto.employeeId = '507f1f77bcf86cd799439013';
            dto.documentTypeId = '507f1f77bcf86cd799439014';

            // Espera que o status seja 'sent' por padrão
            expect(dto.status).toBe('sent');
        });

        // Testa se é possível definir o status como PENDING
        it('deve permitir definir status como PENDING', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'Carteira de Trabalho';
            dto.employeeId = '507f1f77bcf86cd799439015';
            dto.documentTypeId = '507f1f77bcf86cd799439016';
            dto.status = DocumentStatus.PENDING;

            // Espera que o status seja 'pending'
            expect(dto.status).toBe('pending');
        });

        // Testa se é possível redefinir o status para SENT após definir como PENDING
        it('deve permitir redefinir status para SENT', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'Comprovante Residência';
            dto.employeeId = '507f1f77bcf86cd799439017';
            dto.documentTypeId = '507f1f77bcf86cd799439018';
            dto.status = DocumentStatus.PENDING;
            dto.status = DocumentStatus.SENT;

            // Espera que o status seja alterado para 'sent'
            expect(dto.status).toBe('sent');
        });

        // Testa se a propriedade name é obrigatória e permanece indefinida se não atribuída
        it('deve validar que name é obrigatório', () => {
            const dto = new CreateDocumentDto();
            dto.employeeId = '507f1f77bcf86cd799439019';
            dto.documentTypeId = '507f1f77bcf86cd799439020';

            // Espera que name esteja indefinido
            expect(dto.name).toBeUndefined();
        });

        // Testa se a propriedade employeeId é obrigatória e permanece indefinida se não atribuída
        it('deve validar que employeeId é obrigatório', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'Documento Teste';
            dto.documentTypeId = '507f1f77bcf86cd799439021';

            // Espera que employeeId esteja indefinido
            expect(dto.employeeId).toBeUndefined();
        });

        // Testa se a propriedade documentTypeId é obrigatória e permanece indefinida se não atribuída
        it('deve validar que documentTypeId é obrigatório', () => {
            const dto = new CreateDocumentDto();
            dto.name = 'Documento Teste';
            dto.employeeId = '507f1f77bcf86cd799439022';

            // Espera que documentTypeId esteja indefinido
            expect(dto.documentTypeId).toBeUndefined();
        });
    });

    describe('ListPendingDocumentsDto', () => {
        // Testa se os valores padrão de paginação e filtros estão corretos
        it('deve ter valores padrão corretos', () => {
            const dto = new ListPendingDocumentsDto();

            // Espera que page seja 1, limit seja 10 e filtros indefinidos
            expect(dto.page).toBe(1);
            expect(dto.limit).toBe(10);
            expect(dto.employeeId).toBeUndefined();
            expect(dto.documentTypeId).toBeUndefined();
        });

        // Testa se é possível customizar os valores de paginação
        it('deve permitir customizar paginação', () => {
            const dto = new ListPendingDocumentsDto();
            dto.page = 3;
            dto.limit = 25;

            // Espera que page e limit sejam alterados conforme definido
            expect(dto.page).toBe(3);
            expect(dto.limit).toBe(25);
        });

        // Testa se é possível filtrar por employeeId
        it('deve permitir filtro por employeeId', () => {
            const dto = new ListPendingDocumentsDto();
            dto.employeeId = '507f1f77bcf86cd799439023';

            // Espera que employeeId seja definido e documentTypeId indefinido
            expect(dto.employeeId).toBe('507f1f77bcf86cd799439023');
            expect(dto.documentTypeId).toBeUndefined();
        });

        // Testa se é possível filtrar por documentTypeId
        it('deve permitir filtro por documentTypeId', () => {
            const dto = new ListPendingDocumentsDto();
            dto.documentTypeId = '507f1f77bcf86cd799439024';

            // Espera que documentTypeId seja definido e employeeId indefinido
            expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439024');
            expect(dto.employeeId).toBeUndefined();
        });

        // Testa se é possível combinar filtros e paginação
        it('deve permitir filtros combinados', () => {
            const dto = new ListPendingDocumentsDto();
            dto.page = 2;
            dto.limit = 5;
            dto.employeeId = '507f1f77bcf86cd799439025';
            dto.documentTypeId = '507f1f77bcf86cd799439026';

            // Espera que todos os valores estejam corretamente atribuídos
            expect(dto.page).toBe(2);
            expect(dto.limit).toBe(5);
            expect(dto.employeeId).toBe('507f1f77bcf86cd799439025');
            expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439026');
        });

        // Testa se é possível resetar os filtros para undefined
        it('deve permitir resetar filtros', () => {
            const dto = new ListPendingDocumentsDto();
            dto.employeeId = 'test123';
            dto.documentTypeId = 'type456';

            dto.employeeId = undefined;
            dto.documentTypeId = undefined;

            // Espera que ambos os filtros estejam indefinidos após reset
            expect(dto.employeeId).toBeUndefined();
            expect(dto.documentTypeId).toBeUndefined();
        });

        // Testa se é possível alterar apenas o valor de page
        it('deve permitir alterar apenas page', () => {
            const dto = new ListPendingDocumentsDto();
            dto.page = 5;

            // Espera que page seja alterado e limit permaneça padrão
            expect(dto.page).toBe(5);
            expect(dto.limit).toBe(10);
        });

        // Testa se é possível alterar apenas o valor de limit
        it('deve permitir alterar apenas limit', () => {
            const dto = new ListPendingDocumentsDto();
            dto.limit = 50;

            // Espera que limit seja alterado e page permaneça padrão
            expect(dto.page).toBe(1);
            expect(dto.limit).toBe(50);
        });
    });

    describe('DocumentStatus Enum', () => {
        // Testa se o valor da enumeração PENDING está correto
        it('deve ter valor PENDING correto', () => {
            expect(DocumentStatus.PENDING).toBe('pending');
        });

        // Testa se o valor da enumeração SENT está correto
        it('deve ter valor SENT correto', () => {
            expect(DocumentStatus.SENT).toBe('sent');
        });

        // Testa se os valores da enumeração são diferentes
        it('deve permitir comparação entre valores', () => {
            expect(DocumentStatus.PENDING).not.toBe(DocumentStatus.SENT);
        });

        // Testa se a enumeração pode ser usada em switch case
        it('deve ser usável em switch case', () => {
            let result = '';
            const status = DocumentStatus.PENDING as DocumentStatus;

            switch (status) {
                case DocumentStatus.PENDING:
                    result = 'pendente';
                    break;
                case DocumentStatus.SENT:
                    result = 'enviado';
                    break;
                default:
                    result = 'desconhecido';
            }

            // Espera que o resultado seja 'pendente' para status PENDING
            expect(result).toBe('pendente');
        });

        // Testa se é possível iterar sobre os valores da enumeração
        it('deve ser iterável através de Object.values', () => {
            const values = Object.values(DocumentStatus);

            // Espera que os valores incluam 'pending' e 'sent' e que haja apenas dois valores
            expect(values).toContain('pending');
            expect(values).toContain('sent');
            expect(values).toHaveLength(2);
        });
    });
});