import { describe, it, expect } from 'vitest';
import { DocumentStatus, ListPendingDocumentsDto } from '../src/dtos/documentDTO';

/**
 * Testes unitários para DocumentDTO
 * 
 * Foca na validação de DTOs:
 * - Estrutura das classes DTO
 * - Valores padrão das propriedades
 * - Enum DocumentStatus
 * - Instanciação e atribuição de valores
 */
describe('DocumentDTO - Testes Unitários', () => {

  describe('DocumentStatus - Enum', () => {
    it('deve ter os valores corretos para o enum DocumentStatus', () => {
      expect(DocumentStatus.PENDING).toBe('PENDING');
      expect(DocumentStatus.SENT).toBe('SENT');
    });

    it('deve ter apenas dois valores no enum DocumentStatus', () => {
      const values = Object.values(DocumentStatus);
      expect(values).toHaveLength(2);
      expect(values).toContain('PENDING');
      expect(values).toContain('SENT');
    });

    it('deve permitir comparação de valores do enum', () => {
      expect(DocumentStatus.PENDING).not.toBe(DocumentStatus.SENT);
      expect(DocumentStatus.PENDING === 'PENDING').toBe(true);
      expect(DocumentStatus.SENT === 'SENT').toBe(true);
    });
  });

  describe('ListPendingDocumentsDto - DTO de Listagem', () => {
    it('deve ser instanciado corretamente', () => {
      const dto = new ListPendingDocumentsDto();
      
      expect(dto).toBeDefined();
      expect(dto).toBeInstanceOf(ListPendingDocumentsDto);
    });

    it('deve ter valores padrão corretos', () => {
      const dto = new ListPendingDocumentsDto();
      
      expect(dto.page).toBe(1);
      expect(dto.limit).toBe(10);
      expect(dto.employeeId).toBeUndefined();
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir definir valores personalizados', () => {
      const dto = new ListPendingDocumentsDto();
      
      dto.page = 2;
      dto.limit = 20;
      dto.employeeId = 'emp-123';
      dto.documentTypeId = 'doc-type-456';
      
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(20);
      expect(dto.employeeId).toBe('emp-123');
      expect(dto.documentTypeId).toBe('doc-type-456');
    });

    it('deve permitir instanciação com valores iniciais', () => {
      const dto = new ListPendingDocumentsDto();
      Object.assign(dto, {
        page: 3,
        limit: 5,
        employeeId: 'emp-789',
        documentTypeId: 'doc-type-999'
      });
      
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(5);
      expect(dto.employeeId).toBe('emp-789');
      expect(dto.documentTypeId).toBe('doc-type-999');
    });

    it('deve manter valores padrão quando propriedades opcionais não são definidas', () => {
      const dto = new ListPendingDocumentsDto();
      Object.assign(dto, {
        employeeId: 'emp-555'
        // page e limit mantêm valores padrão
        // documentTypeId permanece undefined
      });
      
      expect(dto.page).toBe(1); // Valor padrão mantido
      expect(dto.limit).toBe(10); // Valor padrão mantido
      expect(dto.employeeId).toBe('emp-555');
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir sobrescrever valores padrão', () => {
      const dto = new ListPendingDocumentsDto();
      
      // Definir valores diferentes dos padrões
      dto.page = 0;
      dto.limit = 0;
      
      expect(dto.page).toBe(0);
      expect(dto.limit).toBe(0);
    });

    it('deve permitir valores undefined para propriedades opcionais', () => {
      const dto = new ListPendingDocumentsDto();
      
      dto.employeeId = undefined;
      dto.documentTypeId = undefined;
      
      expect(dto.employeeId).toBeUndefined();
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve permitir strings vazias para propriedades opcionais', () => {
      const dto = new ListPendingDocumentsDto();
      
      dto.employeeId = '';
      dto.documentTypeId = '';
      
      expect(dto.employeeId).toBe('');
      expect(dto.documentTypeId).toBe('');
    });
  });

  describe('Cenários de uso prático', () => {
    it('deve simular construção de DTO para consulta paginada simples', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 2;
      dto.limit = 15;
      
      // Simula uma consulta paginada sem filtros específicos
      expect(dto.page).toBe(2);
      expect(dto.limit).toBe(15);
      expect(dto.employeeId).toBeUndefined();
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve simular construção de DTO para filtro por colaborador', () => {
      const dto = new ListPendingDocumentsDto();
      dto.employeeId = 'emp-12345';
      
      // Simula uma consulta filtrada por colaborador específico
      expect(dto.employeeId).toBe('emp-12345');
      expect(dto.page).toBe(1); // Valor padrão
      expect(dto.limit).toBe(10); // Valor padrão
      expect(dto.documentTypeId).toBeUndefined();
    });

    it('deve simular construção de DTO para filtro por tipo de documento', () => {
      const dto = new ListPendingDocumentsDto();
      dto.documentTypeId = 'doc-type-cpf';
      
      // Simula uma consulta filtrada por tipo de documento
      expect(dto.documentTypeId).toBe('doc-type-cpf');
      expect(dto.page).toBe(1); // Valor padrão
      expect(dto.limit).toBe(10); // Valor padrão
      expect(dto.employeeId).toBeUndefined();
    });

    it('deve simular construção de DTO com todos os filtros aplicados', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 3;
      dto.limit = 25;
      dto.employeeId = 'emp-67890';
      dto.documentTypeId = 'doc-type-rg';
      
      // Simula uma consulta completa com todos os filtros
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(25);
      expect(dto.employeeId).toBe('emp-67890');
      expect(dto.documentTypeId).toBe('doc-type-rg');
    });

    it('deve simular reset de filtros mantendo paginação', () => {
      const dto = new ListPendingDocumentsDto();
      
      // Definir filtros iniciais
      dto.page = 5;
      dto.limit = 30;
      dto.employeeId = 'emp-inicial';
      dto.documentTypeId = 'doc-type-inicial';
      
      // Reset apenas dos filtros, mantendo paginação
      dto.employeeId = undefined;
      dto.documentTypeId = undefined;
      
      expect(dto.page).toBe(5); // Mantido
      expect(dto.limit).toBe(30); // Mantido
      expect(dto.employeeId).toBeUndefined(); // Resetado
      expect(dto.documentTypeId).toBeUndefined(); // Resetado
    });
  });

  describe('Compatibilidade com serialização/deserialização', () => {
    it('deve ser serializável para JSON', () => {
      const dto = new ListPendingDocumentsDto();
      dto.page = 2;
      dto.limit = 20;
      dto.employeeId = 'emp-test';
      dto.documentTypeId = 'doc-type-test';
      
      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);
      
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(20);
      expect(parsed.employeeId).toBe('emp-test');
      expect(parsed.documentTypeId).toBe('doc-type-test');
    });

    it('deve ser deserializável de JSON', () => {
      const jsonData = {
        page: 3,
        limit: 15,
        employeeId: 'emp-from-json',
        documentTypeId: 'doc-type-from-json'
      };
      
      const dto = new ListPendingDocumentsDto();
      Object.assign(dto, jsonData);
      
      expect(dto.page).toBe(3);
      expect(dto.limit).toBe(15);
      expect(dto.employeeId).toBe('emp-from-json');
      expect(dto.documentTypeId).toBe('doc-type-from-json');
    });

    it('deve lidar com deserialização parcial de JSON', () => {
      const jsonData = {
        employeeId: 'emp-partial'
        // Outras propriedades não incluídas
      };
      
      const dto = new ListPendingDocumentsDto();
      Object.assign(dto, jsonData);
      
      expect(dto.page).toBe(1); // Valor padrão mantido
      expect(dto.limit).toBe(10); // Valor padrão mantido
      expect(dto.employeeId).toBe('emp-partial');
      expect(dto.documentTypeId).toBeUndefined();
    });
  });
});