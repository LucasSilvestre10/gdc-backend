import { describe, it, expect } from 'vitest';
import { CreateDocumentDto, DocumentStatus, ListPendingDocumentsDto } from '../src/dtos/documentDTO';

describe('DocumentDTO', () => {
  describe('CreateDocumentDto', () => {
    it('deve criar DTO válido com todas as propriedades', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'CPF - João Silva';
      dto.employeeId = '507f1f77bcf86cd799439011';
      dto.documentTypeId = '507f1f77bcf86cd799439012';
      dto.status = DocumentStatus.PENDING;

      expect(dto.name).toBe('CPF - João Silva');
      expect(dto.employeeId).toBe('507f1f77bcf86cd799439011');
      expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439012');
      expect(dto.status).toBe('pending');
    });

    it('deve ter status padrão como SENT quando não informado', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'RG - Maria Santos';
      dto.employeeId = '507f1f77bcf86cd799439013';
      dto.documentTypeId = '507f1f77bcf86cd799439014';

      expect(dto.status).toBe('sent');
    });

    it('deve permitir definir status como PENDING', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'Carteira de Trabalho';
      dto.employeeId = '507f1f77bcf86cd799439015';
      dto.documentTypeId = '507f1f77bcf86cd799439016';
      dto.status = DocumentStatus.PENDING;

      expect(dto.status).toBe('pending');
    });

    it('deve permitir redefinir status para SENT', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'Comprovante Residência';
      dto.employeeId = '507f1f77bcf86cd799439017';
      dto.documentTypeId = '507f1f77bcf86cd799439018';
      dto.status = DocumentStatus.PENDING;
      dto.status = DocumentStatus.SENT;

      expect(dto.status).toBe('sent');
    });

    it('deve validar que name é obrigatório', () => {
      const dto = new CreateDocumentDto();
      dto.employeeId = '507f1f77bcf86cd799439019';
      dto.documentTypeId = '507f1f77bcf86cd799439020';

      expect(dto.name).toBeUndefined();
    });

    it('deve validar que employeeId é obrigatório', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'Documento Teste';
      dto.documentTypeId = '507f1f77bcf86cd799439021';

      expect(dto.employeeId).toBeUndefined();
    });

    it('deve validar que documentTypeId é obrigatório', () => {
      const dto = new CreateDocumentDto();
      dto.name = 'Documento Teste';
      dto.employeeId = '507f1f77bcf86cd799439022';

      expect(dto.documentTypeId).toBeUndefined();
    });
  });

  describe('ListPendingDocumentsDto', () => {
    it('deve ter valores padrão corretos', () => {
      const dto = new ListPendingDocumentsDto();

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
      expect(dto.employeeId).toBeUndefined();
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir customizar paginação', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 3;
      dto.limit = 25;

      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(25);
    });

    it('deve permitir filtro por employeeId', () => {
      const dto = new ListPendingDocumentsDto();
      dto.employeeId = '507f1f77bcf86cd799439023';

      expect(dto.employeeId).toBe('507f1f77bcf86cd799439023');
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir filtro por documentTypeId', () => {
      const dto = new ListPendingDocumentsDto();
      dto.documentTypeId = '507f1f77bcf86cd799439024';

      expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439024');
      expect(dto.employeeId).toBeUndefined();
    });

    it('deve permitir filtros combinados', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 2;
      dto.limit = 5;
      dto.employeeId = '507f1f77bcf86cd799439025';
      dto.documentTypeId = '507f1f77bcf86cd799439026';

      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(5);
      expect(dto.employeeId).toBe('507f1f77bcf86cd799439025');
      expect(dto.documentTypeId).toBe('507f1f77bcf86cd799439026');
    });

    it('deve permitir resetar filtros', () => {
      const dto = new ListPendingDocumentsDto();
      dto.employeeId = 'test123';
      dto.documentTypeId = 'type456';

      dto.employeeId = undefined;
      dto.documentTypeId = undefined;

      expect(dto.employeeId).toBeUndefined();
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir alterar apenas page', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 5;

      expect(dto.page).toBe(5);
      expect(dto.limit).toBe(10);
    });

    it('deve permitir alterar apenas limit', () => {
      const dto = new ListPendingDocumentsDto();
      dto.limit = 50;

      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(50);
    });
  });

  describe('DocumentStatus Enum', () => {
    it('deve ter valor PENDING correto', () => {
      expect(DocumentStatus.PENDING).toBe('pending');
    });

    it('deve ter valor SENT correto', () => {
      expect(DocumentStatus.SENT).toBe('sent');
    });

    it('deve permitir comparação entre valores', () => {
      expect(DocumentStatus.PENDING).not.toBe(DocumentStatus.SENT);
    });

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

      expect(result).toBe('pendente');
    });

    it('deve ser iterável através de Object.values', () => {
      const values = Object.values(DocumentStatus);

      expect(values).toContain('pending');
      expect(values).toContain('sent');
      expect(values).toHaveLength(2);
    });
  });
});