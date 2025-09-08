import { describe, it, expect } from 'vitest';
import { CreateEmployeeDto, UpdateEmployeeDto, LinkDocumentTypesDto, UnlinkDocumentTypesDto } from '../src/dtos/employeeDTO';

describe('EmployeeDTO', () => {
  describe('CreateEmployeeDto', () => {
    it('deve criar DTO válido com todos os campos', () => {
      const dto = new CreateEmployeeDto();
      dto.name = 'João Silva';
      dto.document = '12345678900';
      dto.hiredAt = new Date('2023-01-01');
      expect(dto.name).toBe('João Silva');
      expect(dto.document).toBe('12345678900');
      expect(dto.hiredAt).toEqual(new Date('2023-01-01'));
    });

    it('deve permitir campos indefinidos', () => {
      const dto = new CreateEmployeeDto();
      expect(dto.name).toBeUndefined();
      expect(dto.document).toBeUndefined();
      expect(dto.hiredAt).toBeUndefined();
    });
  });

  describe('UpdateEmployeeDto', () => {
    it('deve criar DTO válido com todos os campos', () => {
      const dto = new UpdateEmployeeDto();
      dto.name = 'Maria';
      dto.document = '98765432100';
      dto.hiredAt = new Date('2023-02-01');
      expect(dto.name).toBe('Maria');
      expect(dto.document).toBe('98765432100');
      expect(dto.hiredAt).toEqual(new Date('2023-02-01'));
    });

    it('deve permitir DTO sem campos', () => {
      const dto = new UpdateEmployeeDto();
      expect(dto.name).toBeUndefined();
      expect(dto.document).toBeUndefined();
      expect(dto.hiredAt).toBeUndefined();
    });
  });

  describe('LinkDocumentTypesDto', () => {
    it('deve criar DTO válido com array de IDs', () => {
      const dto = new LinkDocumentTypesDto();
      dto.documentTypeIds = ['id1', 'id2'];
      expect(dto.documentTypeIds).toEqual(['id1', 'id2']);
    });

    it('deve permitir array vazio', () => {
      const dto = new LinkDocumentTypesDto();
      dto.documentTypeIds = [];
      expect(dto.documentTypeIds).toEqual([]);
    });
  });

  describe('UnlinkDocumentTypesDto', () => {
    it('deve criar DTO válido com array de IDs', () => {
      const dto = new UnlinkDocumentTypesDto();
      dto.documentTypeIds = ['id3', 'id4'];
      expect(dto.documentTypeIds).toEqual(['id3', 'id4']);
    });

    it('deve permitir array vazio', () => {
      const dto = new UnlinkDocumentTypesDto();
      dto.documentTypeIds = [];
      expect(dto.documentTypeIds).toEqual([]);
    });
  });
});