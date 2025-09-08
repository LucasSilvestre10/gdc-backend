import { describe, it, expect } from 'vitest';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../src/dtos/documentTypeDTO';

describe('DocumentTypeDTO', () => {
  describe('CreateDocumentTypeDto', () => {
    it('deve criar DTO válido com nome', () => {
      const dto = new CreateDocumentTypeDto();
      dto.name = 'CPF';
      expect(dto.name).toBe('CPF');
    });

    it('deve permitir nome indefinido', () => {
      const dto = new CreateDocumentTypeDto();
      expect(dto.name).toBeUndefined();
    });
  });

  describe('UpdateDocumentTypeDto', () => {
    it('deve criar DTO válido com nome', () => {
      const dto = new UpdateDocumentTypeDto();
      dto.name = 'RG';
      expect(dto.name).toBe('RG');
    });

    it('deve permitir DTO sem nome', () => {
      const dto = new UpdateDocumentTypeDto();
      expect(dto.name).toBeUndefined();
    });
  });
});