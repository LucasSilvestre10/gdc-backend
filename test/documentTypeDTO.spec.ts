import { describe, it, expect } from 'vitest';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../src/dtos/documentTypeDTO';

// Testes para os DTOs de tipo de documento
describe('DocumentTypeDTO', () => {
  // Testes para o DTO de criação
  describe('CreateDocumentTypeDto', () => {
    // Testa se o DTO pode ser criado com um nome definido
    it('deve criar DTO válido com nome', () => {
      const dto = new CreateDocumentTypeDto();
      dto.name = 'CPF';
      // Espera que o nome seja igual ao valor atribuído
      expect(dto.name).toBe('CPF');
    });

    // Testa se o DTO pode ser criado sem um nome definido
    it('deve permitir nome indefinido', () => {
      const dto = new CreateDocumentTypeDto();
      // Espera que o nome seja indefinido por padrão
      expect(dto.name).toBeUndefined();
    });
  });

  // Testes para o DTO de atualização
  describe('UpdateDocumentTypeDto', () => {
    // Testa se o DTO pode ser criado com um nome definido
    it('deve criar DTO válido com nome', () => {
      const dto = new UpdateDocumentTypeDto();
      dto.name = 'RG';
      // Espera que o nome seja igual ao valor atribuído
      expect(dto.name).toBe('RG');
    });

    // Testa se o DTO pode ser criado sem um nome definido
    it('deve permitir DTO sem nome', () => {
      const dto = new UpdateDocumentTypeDto();
      // Espera que o nome seja indefinido por padrão
      expect(dto.name).toBeUndefined();
    });
  });
});