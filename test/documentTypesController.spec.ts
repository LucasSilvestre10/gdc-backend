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
            restore: vi.fn(),
            getLinkedEmployees: vi.fn()
        };
        
        // Criar o controller passando o mock do service como argumento
        controller = new DocumentTypesController(mockDocumentTypeService as DocumentTypeService);
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
            // Espera que o retorno seja o objeto esperado de sucesso com ResponseHandler
            expect(result).toEqual({
                success: true,
                message: 'Tipo de documento criado com sucesso',
                data: mockDocumentType,
                timestamp: expect.any(String)
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

            // Espera que o método list do service seja chamado com filters e options
            expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
                { name: undefined, status: 'active' },
                { page: 1, limit: 10 }
            );
            // Espera que o retorno use a nova estrutura com ResponseHandler
            expect(result).toEqual({
                success: true,
                message: 'Tipos de documento listados com sucesso',
                data: {
                    items: mockResult.items,
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 1,
                        totalPages: 1
                    }
                },
                timestamp: expect.any(String)
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

            // Espera que o service seja chamado com valores padrão
            expect(mockDocumentTypeService.list).toHaveBeenCalledWith(
                { name: undefined, status: 'active' },
                { page: 1, limit: 10 }
            );
            // Espera que a paginação seja padrão na nova estrutura
            expect(result.data.pagination).toEqual({
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
            expect(result.data.pagination.totalPages).toBe(3);
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
            // Espera que o retorno seja o objeto esperado de sucesso com ResponseHandler
            expect(result).toEqual({
                success: true,
                message: 'Tipo de documento encontrado com sucesso',
                data: mockDocumentType,
                timestamp: expect.any(String)
            });
        });

        // Deve lançar NotFound quando tipo de documento não existe
        it('should throw NotFound when document type does not exist', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            (mockDocumentTypeService.findById as any).mockResolvedValue(null);

            // Espera que uma exceção NotFound seja lançada
            await expect(controller.findById(id)).rejects.toThrow('Tipo de documento não encontrado');
            // Espera que o método findById do service seja chamado com o id
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
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
                data: updatedDocumentType,
                timestamp: expect.any(String)
            });
        });

        it('should throw NotFound when document type does not exist', async () => {
            const id = '507f1f77bcf86cd799439011';
            const updateDto: UpdateDocumentTypeDto = { name: 'CPF Atualizado' };
            
            (mockDocumentTypeService.update as any).mockResolvedValue(null);

            await expect(controller.update(id, updateDto)).rejects.toThrow('Tipo de documento não encontrado');
            expect(mockDocumentTypeService.update).toHaveBeenCalledWith(id, updateDto);
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
            
            // Mock findById retornando documento válido
            (mockDocumentTypeService.findById as any).mockResolvedValue(mockDocumentType);
            
            // Mock getLinkedEmployees retornando array vazio
            (mockDocumentTypeService.getLinkedEmployees as any).mockResolvedValue({
                items: [],
                total: 0,
                totalPages: 0
            });

            const result = await controller.getLinkedEmployees(id);

            // Espera que o método findById seja chamado primeiro
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // Espera que o método getLinkedEmployees do service seja chamado com o id
            expect(mockDocumentTypeService.getLinkedEmployees).toHaveBeenCalledWith(id, { page: 1, limit: 10 });
            // Espera que o retorno seja sucesso com dados paginados
            expect(result).toEqual({
                success: true,
                message: 'Colaboradores vinculados ao tipo de documento listados com sucesso',
                data: {
                    items: [],
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 0,
                        totalPages: 0
                    }
                },
                timestamp: expect.any(String)
            });
        });

        // Deve lançar NotFound para tipo de documento inexistente
        it('should throw NotFound for non-existing document type', async () => {
            const id = '507f1f77bcf86cd799439011';
            
            // Mock findById retornando null (documento não encontrado)
            (mockDocumentTypeService.findById as any).mockResolvedValue(null);

            await expect(controller.getLinkedEmployees(id)).rejects.toThrow('Tipo de documento não encontrado');
            // Espera que o método findById seja chamado
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            // getLinkedEmployees não deve ser chamado quando documento não existe
            expect(mockDocumentTypeService.getLinkedEmployees).not.toHaveBeenCalled();
        });

        // Deve tratar erro ao buscar funcionários vinculados
        it('should handle getLinkedEmployees error', async () => {
            const id = '507f1f77bcf86cd799439011';
            const error = new Error('Database error');
            
            // Mock findById retornando documento válido
            (mockDocumentTypeService.findById as any).mockResolvedValue(mockDocumentType);
            // Mock getLinkedEmployees lançando erro
            (mockDocumentTypeService.getLinkedEmployees as any).mockRejectedValue(error);

            // Espera que o erro seja propagado
            await expect(controller.getLinkedEmployees(id)).rejects.toThrow(error);
            expect(mockDocumentTypeService.findById).toHaveBeenCalledWith(id);
            expect(mockDocumentTypeService.getLinkedEmployees).toHaveBeenCalledWith(id, { page: 1, limit: 10 });
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
        data: deletedDocumentType,
        timestamp: expect.any(String)
      });
    });

    it('should throw NotFound when document type does not exist', async () => {
      const id = '507f1f77bcf86cd799439011';
      
      (mockDocumentTypeService.delete as any).mockResolvedValue(null);

      await expect(controller.delete(id)).rejects.toThrow('Tipo de documento não encontrado');
      expect(mockDocumentTypeService.delete).toHaveBeenCalledWith(id);
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
        data: restoredDocumentType,
        timestamp: expect.any(String)
      });
    });

    it('should throw NotFound when document type does not exist', async () => {
      const id = '507f1f77bcf86cd799439011';
      
      (mockDocumentTypeService.restore as any).mockResolvedValue(null);

      await expect(controller.restore(id)).rejects.toThrow('Tipo de documento não encontrado');
      expect(mockDocumentTypeService.restore).toHaveBeenCalledWith(id);
    });

    it('should handle restore error', async () => {
      const id = '507f1f77bcf86cd799439011';
      const error = new Error('Database error');
      
      (mockDocumentTypeService.restore as any).mockRejectedValue(error);

      await expect(controller.restore(id)).rejects.toThrow(error);
    });
  });
});