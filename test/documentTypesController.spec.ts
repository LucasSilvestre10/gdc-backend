import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentTypesController } from '../src/controllers/rest/DocumentTypesController';
import { DocumentTypeService } from '../src/services/DocumentTypeService';
import { CreateDocumentTypeDto, UpdateDocumentTypeDto } from '../src/dtos/documentTypeDTO';

// Testes para o controller de tipos de documento
describe('DocumentTypesController', () => {
    let controller: DocumentTypesController;
    let mockDocumentTypeService: Partial<DocumentTypeService>;

    // Mock de um tipo de documento para uso nos testes
    const mockDocumentType = {
        _id: '507f1f77bcf86cd799439011',
        name: 'CPF',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    // Antes de cada teste, cria um mock do service e injeta no controller
  beforeEach(() => {
    mockDocumentTypeService = {
      create: vi.fn(),
      list: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      restore: vi.fn()
    };        controller = new DocumentTypesController();
        
        // Injetar o mock do service
        Object.defineProperty(controller, 'documentTypeService', {
            value: mockDocumentTypeService,
            writable: true,
            configurable: true
        });
    });

    // Testes para o método create
    describe('create', () => {
        // Deve criar um tipo de documento com sucesso
        it('should create document type successfully', async () => {
            const createDto: CreateDocumentTypeDto = { name: 'CPF' };
            
            (mockDocumentTypeService.create as any).mockResolvedValue(mockDocumentType);

            const result = await controller.create(createDto);

            // Espera que o método create do service seja chamado com o DTO
            expect(mockDocumentTypeService.create).toHaveBeenCalledWith(createDto);
            // Espera que o retorno seja o objeto esperado de sucesso
            expect(result).toEqual({
                success: true,
                message: 'Tipo de documento criado com sucesso',
                data: mockDocumentType
            });
        });

        // Deve tratar erro ao criar tipo de documento
        it('should handle create error', async () => {
            const createDto: CreateDocumentTypeDto = { name: 'CPF' };
            const error = new Error('Database error');
            
            (mockDocumentTypeService.create as any).mockRejectedValue(error);

            // Espera que o erro seja lançado
            await expect(controller.create(createDto)).rejects.toThrow(error);
        });
    });

    // Testes para o método list
    describe('list', () => {
        // Deve listar tipos de documento com paginação
        it('should list document types with pagination', async () => {
            const mockResult = {
                items: [mockDocumentType],
                total: 1
            };
            
            (mockDocumentTypeService.list as any).mockResolvedValue(mockResult);

            const result = await controller.list(1, 10);

            // Espera que o método list do service seja chamado
            expect(mockDocumentTypeService.list).toHaveBeenCalled();
            // Espera que o retorno contenha os dados e a paginação correta
            expect(result).toEqual({
                success: true,
                data: mockResult.items,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 1,
                    totalPages: 1
                }
            });
        });

        // Deve usar valores padrão de paginação se não informados
        it('should use default pagination values', async () => {
            const mockResult = {
                items: [],
                total: 0
            };
            
            (mockDocumentTypeService.list as any).mockResolvedValue(mockResult);

            const result = await controller.list();

            // Espera que a paginação seja padrão
            expect(result.pagination).toEqual({
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0
            });
        });

        // Deve calcular corretamente o total de páginas
        it('should calculate totalPages correctly', async () => {
            const mockResult = {
                items: Array(25).fill(mockDocumentType),
                total: 25
            };
            
            (mockDocumentTypeService.list as any).mockResolvedValue(mockResult);

            const result = await controller.list(1, 10);

            // Espera que o total de páginas seja 3 (25 itens, 10 por página)
            expect(result.pagination.totalPages).toBe(3);
        });

        // Deve tratar erro ao listar tipos de documento
        it('should handle list error', async () => {
            const error = new Error('Database error');
            
            (mockDocumentTypeService.list as any).mockRejectedValue(error);

            // Espera que o erro seja lançado
            await expect(controller.list()).rejects.toThrow(error);
        });
    });

    // Testes para o método findById
    describe('findById', () => {
        // Deve encontrar tipo de documento pelo id com sucesso
        it('should find document type by id successfully', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            (mockDocumentTypeService.findById as any).mockResolvedValue(mockDocumentType);

            const result = await controller.findById(id);

            // Espera que o método findById do service seja chamado com o id
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // Espera que o retorno seja o objeto esperado de sucesso
            expect(result).toEqual({
                success: true,
                data: mockDocumentType
            });
        });

        // Deve retornar not found quando tipo de documento não existe
        it('should return not found when document type does not exist', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            (mockDocumentTypeService.findById as any).mockResolvedValue(null);

            const result = await controller.findById(id);

            // Espera que o método findById do service seja chamado com o id
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // Espera que o retorno seja o objeto esperado de não encontrado
            expect(result).toEqual({
                success: false,
                message: 'Tipo de documento não encontrado',
                data: null
            });
        });

        // Deve tratar erro ao buscar tipo de documento por id
        it('should handle findById error', async () => {
            const id = '507f1f77bcf86cd799439011';
            const error = new Error('Database error');
            
            (mockDocumentTypeService.findById as any).mockRejectedValue(error);

            // Espera que o erro seja lançado
            await expect(controller.findById(id)).rejects.toThrow(error);
        });
    });

    // Testes para o método update
    describe('update', () => {
        it('should update document type successfully', async () => {
            const id = '507f1f77bcf86cd799439011';
            const updateDto: UpdateDocumentTypeDto = { name: 'CPF Atualizado' };
            const updatedDocumentType = { ...mockDocumentType, name: 'CPF Atualizado' };
            
            (mockDocumentTypeService.update as any).mockResolvedValue(updatedDocumentType);

            const result = await controller.update(id, updateDto);

            expect(mockDocumentTypeService.update).toHaveBeenCalledWith(id, updateDto);
            expect(result).toEqual({
                success: true,
                message: 'Tipo de documento atualizado com sucesso',
                data: updatedDocumentType
            });
        });

        it('should return not found when document type does not exist', async () => {
            const id = '507f1f77bcf86cd799439011';
            const updateDto: UpdateDocumentTypeDto = { name: 'CPF Atualizado' };
            
            (mockDocumentTypeService.update as any).mockResolvedValue(null);

            const result = await controller.update(id, updateDto);

            expect(mockDocumentTypeService.update).toHaveBeenCalledWith(id, updateDto);
            expect(result).toEqual({
                success: false,
                message: 'Tipo de documento não encontrado',
                data: null
            });
        });

        it('should propagate service errors', async () => {
            const id = '507f1f77bcf86cd799439011';
            const updateDto: UpdateDocumentTypeDto = { name: 'CPF Atualizado' };
            const error = new Error('Nome já existe');
            
            (mockDocumentTypeService.update as any).mockRejectedValue(error);

            await expect(controller.update(id, updateDto)).rejects.toThrow('Nome já existe');
            expect(mockDocumentTypeService.update).toHaveBeenCalledWith(id, updateDto);
        });
    });

    // Testes para o método getLinkedEmployees
    describe('getLinkedEmployees', () => {
        // Deve retornar array vazio para tipo de documento existente
        it('should return empty array for existing document type', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            (mockDocumentTypeService.findById as any).mockResolvedValue(mockDocumentType);

            const result = await controller.getLinkedEmployees(id);

            // Espera que o método findById do service seja chamado com o id
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // Espera que o retorno seja sucesso e array vazio
            expect(result).toEqual({
                success: true,
                message: 'Método será implementado no próximo commit',
                data: []
            });
        });

        // Deve retornar not found para tipo de documento inexistente
        it('should return not found for non-existing document type', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            (mockDocumentTypeService.findById as any).mockResolvedValue(null);

            const result = await controller.getLinkedEmployees(id);

            // Espera que o método findById do service seja chamado com o id
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // Espera que o retorno seja não encontrado e array vazio
            expect(result).toEqual({
                success: false,
                message: 'Tipo de documento não encontrado',
                data: []
            });
        });

        // Deve tratar erro ao buscar funcionários vinculados
        it('should handle getLinkedEmployees error', async () => {
            const id = '507f1f77bcf86cd799439011';
            const error = new Error('Database error');
            
            (mockDocumentTypeService.findById as any).mockRejectedValue(error);

            // Espera que o erro seja lançado
      await expect(controller.getLinkedEmployees(id)).rejects.toThrow(error);
    });
  });

  describe('delete', () => {
    it('should delete document type successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const deletedDocumentType = { ...mockDocumentType, isActive: false, deletedAt: new Date() };
      
      (mockDocumentTypeService.delete as any).mockResolvedValue(deletedDocumentType);

      const result = await controller.delete(id);

      expect(mockDocumentTypeService.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        success: true,
        message: 'Tipo de documento removido com sucesso',
        data: deletedDocumentType
      });
    });

    it('should return not found when document type does not exist', async () => {
      const id = '507f1f77bcf86cd799439011';
      
      (mockDocumentTypeService.delete as any).mockResolvedValue(null);

      const result = await controller.delete(id);

      expect(mockDocumentTypeService.delete).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        success: false,
        message: 'Tipo de documento não encontrado'
      });
    });

    it('should handle delete error', async () => {
      const id = '507f1f77bcf86cd799439011';
      const error = new Error('Database error');
      
      (mockDocumentTypeService.delete as any).mockRejectedValue(error);

      await expect(controller.delete(id)).rejects.toThrow(error);
    });
  });

  describe('restore', () => {
    it('should restore document type successfully', async () => {
      const id = '507f1f77bcf86cd799439011';
      const restoredDocumentType = { ...mockDocumentType, isActive: true, deletedAt: null };
      
      (mockDocumentTypeService.restore as any).mockResolvedValue(restoredDocumentType);

      const result = await controller.restore(id);

      expect(mockDocumentTypeService.restore).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        success: true,
        message: 'Tipo de documento reativado com sucesso',
        data: restoredDocumentType
      });
    });

    it('should return not found when document type does not exist', async () => {
      const id = '507f1f77bcf86cd799439011';
      
      (mockDocumentTypeService.restore as any).mockResolvedValue(null);

      const result = await controller.restore(id);

      expect(mockDocumentTypeService.restore).toHaveBeenCalledWith(id);
      expect(result).toEqual({
        success: false,
        message: 'Tipo de documento não encontrado'
      });
    });

    it('should handle restore error', async () => {
      const id = '507f1f77bcf86cd799439011';
      const error = new Error('Database error');
      
      (mockDocumentTypeService.restore as any).mockRejectedValue(error);

      await expect(controller.restore(id)).rejects.toThrow(error);
    });
  });
});