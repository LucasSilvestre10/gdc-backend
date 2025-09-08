import { describe, it, expect } from 'vitest';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkDocumentTypesDto, UnlinkDocumentTypesDto } from '../src/dtos/employeeDTO';

// Testes para os DTOs relacionados ao funcionário
describe('EmployeeDTO', () => {
  // Testes para criação de funcionário
  describe('CreateEmployeeDto', () => {
    // Testa se o DTO é criado corretamente com todos os campos preenchidos
    it('deve criar DTO válido com todos os campos', () => {
      const dto = new CreateEmployeeDto();
      dto.name = 'João Silva';
      dto.document = '12345678900';
      dto.hiredAt = new Date('2023-01-01');
      // Espera que os campos estejam definidos conforme atribuição
      expect(dto.name).toBe('João Silva');
      expect(dto.document).toBe('12345678900');
      expect(dto.hiredAt).toEqual(new Date('2023-01-01'));
    });

    // Testa se o DTO permite campos indefinidos (não preenchidos)
    it('deve permitir campos indefinidos', () => {
      const dto = new CreateEmployeeDto();
      // Espera que os campos estejam indefinidos por padrão
      expect(dto.name).toBeUndefined();
      expect(dto.document).toBeUndefined();
      expect(dto.hiredAt).toBeUndefined();
    });
  });

  // Testes para atualização de funcionário
  describe('UpdateEmployeeDto', () => {
    // Testa se o DTO é criado corretamente com todos os campos preenchidos
    it('deve criar DTO válido com todos os campos', () => {
      const dto = new UpdateEmployeeDto();
      dto.name = 'Maria';
      dto.document = '98765432100';
      dto.hiredAt = new Date('2023-02-01');
      // Espera que os campos estejam definidos conforme atribuição
      expect(dto.name).toBe('Maria');
      expect(dto.document).toBe('98765432100');
      expect(dto.hiredAt).toEqual(new Date('2023-02-01'));
    });

    // Testa se o DTO permite ser criado sem nenhum campo preenchido
    it('deve permitir DTO sem campos', () => {
      const dto = new UpdateEmployeeDto();
      // Espera que os campos estejam indefinidos por padrão
      expect(dto.name).toBeUndefined();
      expect(dto.document).toBeUndefined();
      expect(dto.hiredAt).toBeUndefined();
    });
  });

  // Testes para vinculação de tipos de documento
  describe('LinkDocumentTypesDto', () => {
    // Testa se o DTO aceita um array de IDs de tipos de documento
    it('deve criar DTO válido com array de IDs', () => {
      const dto = new LinkDocumentTypesDto();
      dto.documentTypeIds = ['id1', 'id2'];
      // Espera que o array de IDs seja atribuído corretamente
      expect(dto.documentTypeIds).toEqual(['id1', 'id2']);
    });

    // Testa se o DTO aceita um array vazio de IDs
    it('deve permitir array vazio', () => {
      const dto = new LinkDocumentTypesDto();
      dto.documentTypeIds = [];
      // Espera que o array esteja vazio
      expect(dto.documentTypeIds).toEqual([]);
    });
  });

  // Testes para desvinculação de tipos de documento
  describe('UnlinkDocumentTypesDto', () => {
    // Testa se o DTO aceita um array de IDs para desvincular
    it('deve criar DTO válido com array de IDs', () => {
      const dto = new UnlinkDocumentTypesDto();
      dto.documentTypeIds = ['id3', 'id4'];
      // Espera que o array de IDs seja atribuído corretamente
      expect(dto.documentTypeIds).toEqual(['id3', 'id4']);
    });

    // Testa se o DTO aceita um array vazio de IDs para desvincular
    it('deve permitir array vazio', () => {
      const dto = new UnlinkDocumentTypesDto();
      dto.documentTypeIds = [];
      // Espera que o array esteja vazio
      expect(dto.documentTypeIds).toEqual([]);
    });
  });
});