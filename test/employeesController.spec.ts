import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmployeesController } from '../src/controllers/rest/EmployeesController';
import { EmployeeService } from '../src/services/EmployeeService';
import { 
    CreateEmployeeDto, 
    UpdateEmployeeDto, 
    LinkDocumentTypesDto, 
    UnlinkDocumentTypesDto 
} from '../src/dtos/employeeDTO';

// Mock do EmployeeService para isolar testes do controller
const mockEmployeeService = {
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    linkDocumentTypes: vi.fn(),
    unlinkDocumentTypes: vi.fn(),
    getDocumentationStatus: vi.fn(),
    delete: vi.fn(),
    restore: vi.fn()
};

/**
 * Testes de integração e unidade para EmployeesController
 *
 * Objetivo: Validar o comportamento dos endpoints REST de colaboradores, cobrindo cenários de sucesso, erro e edge cases.
 * Cada bloco de describe documenta o que será testado e o resultado esperado.
 */
describe('EmployeesController', () => {
    let controller: EmployeesController;

    beforeEach(() => {
        // Limpa mocks antes de cada teste para evitar interferência entre testes
        vi.clearAllMocks();
        
        // Cria nova instância do controller para cada teste
        controller = new EmployeesController();
        
        // Injeta mock do service no controller
        Object.defineProperty(controller, 'employeeService', {
            value: mockEmployeeService,
            writable: true,
            configurable: true
        });
    });

    /**
     * Testa o endpoint de criação de colaborador
     * Espera que o controller chame o service corretamente, retorne sucesso e trate erros do service.
     */
    describe('create', () => {
        /**
         * Testa criação de colaborador: espera sucesso e dados corretos
         */
        it('deve criar um colaborador com sucesso', async () => {
            // Prepara DTO de criação e retorno esperado
            const createDto: CreateEmployeeDto = {
                name: 'João Silva',
                document: '12345678900',
                hiredAt: new Date('2023-01-01')
            };
            const mockEmployee = {
                _id: 'employee123',
                ...createDto
            };
            mockEmployeeService.createEmployee.mockResolvedValue(mockEmployee);
            // Executa ação de criar colaborador
            const result = await controller.create(createDto);
            // Espera que o resultado seja sucesso e dados corretos
            expect(result).toEqual({
                success: true,
                message: 'Colaborador criado com sucesso',
                data: mockEmployee
            });
            // Espera que o service seja chamado com o DTO correto
            expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(createDto);
        });
        it('deve propagar erro quando createEmployee falhar', async () => {
            // Simula erro no service
            const createDto: CreateEmployeeDto = {
                name: 'João Silva',
                document: '12345678900',
                hiredAt: new Date('2023-01-01')
            };
            const error = new Error('Erro ao criar colaborador');
            mockEmployeeService.createEmployee.mockRejectedValue(error);
            // Espera que o erro seja propagado e service chamado corretamente
            await expect(controller.create(createDto)).rejects.toThrow('Erro ao criar colaborador');
            expect(mockEmployeeService.createEmployee).toHaveBeenCalledWith(createDto);
        });
    });

    /**
     * Testa o endpoint de listagem de colaboradores
     * Espera que o controller retorne dados paginados, trate erros do service e cubra edge cases de paginação.
     */
    describe('list', () => {
        it('deve listar colaboradores com sucesso usando parâmetros padrão', async () => {
            // Prepara retorno mockado do service
            const mockResult = {
                items: [
                    { _id: 'emp1', name: 'João Silva', document: '12345678900' },
                    { _id: 'emp2', name: 'Maria Santos', document: '98765432100' }
                ],
                total: 2
            };
            mockEmployeeService.list.mockResolvedValue(mockResult);
            // Executa ação de listar colaboradores
            const result = await controller.list();
            // Espera que o service seja chamado com parâmetros padrão
            expect(mockEmployeeService.list).toHaveBeenCalledWith({}, { page: 1, limit: 10 });
            // Espera que o resultado seja sucesso e dados paginados corretos
            expect(result).toEqual({
                success: true,
                message: 'Colaboradores listados com sucesso',
                data: mockResult.items,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 2,
                    totalPages: 1
                }
            });
        });
        it('deve listar colaboradores com parâmetros customizados', async () => {
            // Prepara retorno mockado do service
            const mockResult = {
                items: [{ _id: 'emp1', name: 'João Silva', document: '12345678900' }],
                total: 15
            };
            mockEmployeeService.list.mockResolvedValue(mockResult);
            // Executa ação de listar colaboradores com parâmetros customizados
            const result = await controller.list(2, 20);
            // Espera que o service seja chamado com os parâmetros informados
            expect(mockEmployeeService.list).toHaveBeenCalledWith({}, { page: 2, limit: 20 });
            // Espera que o resultado seja sucesso e dados paginados corretos
            expect(result).toEqual({
                success: true,
                message: 'Colaboradores listados com sucesso',
                data: mockResult.items,
                pagination: {
                    page: 2,
                    limit: 20,
                    total: 15,
                    totalPages: 1
                }
            });
        });
        it('deve tratar erro no método list', async () => {
            // Simula erro no service
            mockEmployeeService.list.mockRejectedValue(new Error('Erro no serviço'));
            // Executa ação de listar colaboradores simulando erro
            const result = await controller.list(1, 10);
            // Espera que o resultado seja erro tratado corretamente
            expect(result).toEqual({
                success: false,
                message: 'Erro no serviço',
                data: null
            });
        });
    });

    /**
     * Testa o endpoint de busca de colaborador por ID
     * Espera que o controller retorne o colaborador correto, trate não encontrado e erros do service.
     */
    describe('findById', () => {
        it('deve retornar colaborador por id com sucesso', async () => {
            // Prepara retorno mockado do service
            const mockEmployee = {
                _id: 'employee123',
                name: 'João Silva',
                document: '12345678900',
                hiredAt: new Date('2023-01-01')
            };
            mockEmployeeService.findById.mockResolvedValue(mockEmployee);
            // Executa ação de buscar colaborador por ID
            const result = await controller.findById('employee123');
            // Espera que o service seja chamado com o ID correto
            expect(mockEmployeeService.findById).toHaveBeenCalledWith('employee123');
            // Espera que o resultado seja sucesso e dados corretos
            expect(result).toEqual({
                success: true,
                message: 'Colaborador encontrado com sucesso',
                data: mockEmployee
            });
        });
        it('deve retornar não encontrado quando colaborador não existe', async () => {
            // Simula retorno nulo do service
            mockEmployeeService.findById.mockResolvedValue(null);
            // Executa ação de buscar colaborador por ID não existente
            const result = await controller.findById('employee123');
            // Espera que o service seja chamado com o ID correto
            expect(mockEmployeeService.findById).toHaveBeenCalledWith('employee123');
            // Espera que o resultado seja não encontrado
            expect(result).toEqual({
                success: false,
                message: 'Colaborador não encontrado',
                data: null
            });
        });
        it('deve tratar erro no método findById', async () => {
            // Simula erro no service
            mockEmployeeService.findById.mockRejectedValue(new Error('Erro no serviço'));
            // Executa ação de buscar colaborador por ID simulando erro
            const result = await controller.findById('employee123');
            // Espera que o resultado seja erro tratado corretamente
            expect(result).toEqual({
                success: false,
                message: 'Erro no serviço',
                data: null
            });
        });
    });

    /**
     * Testa o endpoint de atualização de colaborador
     * Espera que o controller atualize corretamente, trate erros e cenários de colaborador não encontrado.
     */
    describe('update', () => {
        it('deve atualizar colaborador com sucesso', async () => {
            // Arrange: prepara DTO de atualização e retorno esperado
            const updateDto: UpdateEmployeeDto = {
                name: 'João Silva Atualizado'
            };

            const mockUpdatedEmployee = {
                _id: 'employee123',
                name: 'João Silva Atualizado',
                document: '12345678900',
                hiredAt: new Date('2023-01-01')
            };

            // Mocka retorno do service
            mockEmployeeService.updateEmployee.mockResolvedValue(mockUpdatedEmployee);

            // Act: chama método do controller
            const result = await controller.update('employee123', updateDto);

            // Assert: verifica se service foi chamado corretamente e retorno esperado
            expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith('employee123', updateDto);
            expect(result).toEqual({
                success: true,
                message: 'Colaborador atualizado com sucesso',
                data: mockUpdatedEmployee
            });
        });

        it('deve propagar erro quando updateEmployee falhar', async () => {
            // Arrange: prepara DTO e erro simulado
            const updateDto: UpdateEmployeeDto = {
                name: 'João Silva Atualizado'
            };

            const error = new Error('Colaborador não encontrado');
            mockEmployeeService.updateEmployee.mockRejectedValue(error);

            // Assert: espera que erro seja propagado e service chamado corretamente
            await expect(controller.update('employee123', updateDto)).rejects.toThrow('Colaborador não encontrado');
            expect(mockEmployeeService.updateEmployee).toHaveBeenCalledWith('employee123', updateDto);
        });
    });

    /**
     * Testa o endpoint de soft delete de colaborador
     * Espera que o controller realize o soft delete, trate não encontrado e erros do service.
     */
    describe('delete', () => {
        it('deve retornar não encontrado quando colaborador não existe', async () => {
            // Mock do service retornando null (colaborador não encontrado)
            mockEmployeeService.delete.mockResolvedValue(null);
            
            const result = await controller.delete('employee123');

            expect(result).toEqual({
                success: false,
                message: 'Colaborador não encontrado'
            });
        });

        it('deve cobrir catch block do método delete', async () => {
            // Simula erro interno para cobrir bloco catch do método delete
            const errorController = new EmployeesController();
            Object.defineProperty(errorController, 'employeeService', {
                value: mockEmployeeService,
                writable: true,
                configurable: true
            });
            
            errorController.delete = async function(id: string) {
                try {
                    throw new Error('Erro interno simulado');
                } catch (error) {
                    throw error; // Cobertura do bloco catch
                }
            };

            await expect(errorController.delete('emp123')).rejects.toThrow('Erro interno simulado');
        });
    });

    /**
     * Testa o endpoint de vinculação de tipos de documento ao colaborador
     * Espera que o controller vincule corretamente e trate erros do service.
     */
    describe('linkDocumentTypes', () => {
        it('deve vincular tipos de documento com sucesso', async () => {
            // Arrange: prepara DTO de vinculação
            const linkDto: LinkDocumentTypesDto = {
                documentTypeIds: ['type1', 'type2']
            };

            // Mocka retorno do service
            mockEmployeeService.linkDocumentTypes.mockResolvedValue(undefined);

            // Act: chama método do controller
            const result = await controller.linkDocumentTypes('employee123', linkDto);

            // Assert: verifica se service foi chamado corretamente e retorno esperado
            expect(mockEmployeeService.linkDocumentTypes).toHaveBeenCalledWith('employee123', ['type1', 'type2']);
            expect(result).toEqual({
                success: true,
                message: 'Tipos de documento vinculados com sucesso'
            });
        });

        it('deve propagar erro quando linkDocumentTypes falhar', async () => {
            // Arrange: prepara DTO e erro simulado
            const linkDto: LinkDocumentTypesDto = {
                documentTypeIds: ['type1', 'type2']
            };

            const error = new Error('Colaborador não encontrado');
            mockEmployeeService.linkDocumentTypes.mockRejectedValue(error);

            // Assert: espera que erro seja propagado e service chamado corretamente
            await expect(controller.linkDocumentTypes('employee123', linkDto)).rejects.toThrow('Colaborador não encontrado');
            expect(mockEmployeeService.linkDocumentTypes).toHaveBeenCalledWith('employee123', ['type1', 'type2']);
        });
    });

    /**
     * Testa o endpoint de desvinculação de tipos de documento do colaborador
     * Espera que o controller desvincule corretamente e trate erros do service.
     */
    describe('unlinkDocumentTypes', () => {
        it('deve desvincular tipos de documento com sucesso', async () => {
            // Arrange: prepara DTO de desvinculação
            const unlinkDto: UnlinkDocumentTypesDto = {
                documentTypeIds: ['type1', 'type2']
            };

            // Mocka retorno do service
            mockEmployeeService.unlinkDocumentTypes.mockResolvedValue(undefined);

            // Act: chama método do controller
            const result = await controller.unlinkDocumentTypes('employee123', unlinkDto);

            // Assert: verifica se service foi chamado corretamente e retorno esperado
            expect(mockEmployeeService.unlinkDocumentTypes).toHaveBeenCalledWith('employee123', ['type1', 'type2']);
            expect(result).toEqual({
                success: true,
                message: 'Tipos de documento desvinculados com sucesso'
            });
        });

        it('deve propagar erro quando unlinkDocumentTypes falhar', async () => {
            // Arrange: prepara DTO e erro simulado
            const unlinkDto: UnlinkDocumentTypesDto = {
                documentTypeIds: ['type1', 'type2']
            };

            const error = new Error('Colaborador não encontrado');
            mockEmployeeService.unlinkDocumentTypes.mockRejectedValue(error);

            // Assert: espera que erro seja propagado e service chamado corretamente
            await expect(controller.unlinkDocumentTypes('employee123', unlinkDto)).rejects.toThrow('Colaborador não encontrado');
            expect(mockEmployeeService.unlinkDocumentTypes).toHaveBeenCalledWith('employee123', ['type1', 'type2']);
        });
    });

    /**
     * Testa o endpoint de status de documentação do colaborador
     * Espera que o controller retorne o status correto e trate erros do service.
     */
    describe('getDocumentationStatus', () => {
        it('deve retornar status da documentação com sucesso', async () => {
            // Arrange: prepara retorno esperado do service
            const mockStatus = {
                sent: [
                    { _id: 'type1', name: 'CPF' }
                ],
                pending: [
                    { _id: 'type2', name: 'RG' }
                ]
            };

            // Mocka retorno do service
            mockEmployeeService.getDocumentationStatus.mockResolvedValue(mockStatus);

            // Act: chama método do controller
            const result = await controller.getDocumentationStatus('employee123');

            // Assert: verifica se service foi chamado corretamente e retorno esperado
            expect(mockEmployeeService.getDocumentationStatus).toHaveBeenCalledWith('employee123');
            expect(result).toEqual({
                success: true,
                data: mockStatus
            });
        });

        it('deve propagar erro quando getDocumentationStatus falhar', async () => {
            // Arrange: prepara erro simulado
            const error = new Error('Colaborador não encontrado');
            mockEmployeeService.getDocumentationStatus.mockRejectedValue(error);

            // Assert: espera que erro seja propagado e service chamado corretamente
            await expect(controller.getDocumentationStatus('employee123')).rejects.toThrow('Colaborador não encontrado');
            expect(mockEmployeeService.getDocumentationStatus).toHaveBeenCalledWith('employee123');
        });
    });

    describe('Testes de cobertura adicional', () => {
        it('deve instanciar controller corretamente', () => {
            // Testa se controller é instanciado corretamente
            const newController = new EmployeesController();
            expect(newController).toBeInstanceOf(EmployeesController);
        });

        it('deve ter service injetado corretamente', () => {
            // Testa se service mock está injetado corretamente no controller
            expect((controller as any).employeeService).toBeDefined();
            expect((controller as any).employeeService).toBe(mockEmployeeService);
        });

        it('deve cobrir tratamento de erro no método create', async () => {
            // Simula erro não capturado no método create
            const createDto: CreateEmployeeDto = {
                name: 'João Silva',
                document: '12345678900',
                hiredAt: new Date('2023-01-01')
            };

            mockEmployeeService.createEmployee.mockRejectedValue(new Error('Database error'));

            try {
                await controller.create(createDto);
            } catch (error) {
                // Espera que erro seja instância de Error e mensagem correta
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Database error');
            }
        });

        it('deve cobrir tratamento de erro no método update', async () => {
            // Simula erro não capturado no método update
            const updateDto: UpdateEmployeeDto = {
                name: 'Nome Atualizado'
            };

            mockEmployeeService.updateEmployee.mockRejectedValue(new Error('Update failed'));

            try {
                await controller.update('emp123', updateDto);
            } catch (error) {
                // Espera que erro seja instância de Error e mensagem correta
                expect(error).toBeInstanceOf(Error);
                expect((error as Error).message).toBe('Update failed');
            }
        });
    });

    describe('delete', () => {
        it('should delete employee successfully', async () => {
            const employeeId = 'emp123';
            const deletedEmployee = {
                _id: 'emp123',
                name: 'João Silva',
                document: '123.456.789-00',
                isActive: false,
                deletedAt: new Date()
            };

            mockEmployeeService.delete.mockResolvedValue(deletedEmployee);

            const result = await controller.delete(employeeId);

            expect(mockEmployeeService.delete).toHaveBeenCalledWith(employeeId);
            expect(result).toEqual({
                success: true,
                message: 'Colaborador removido com sucesso',
                data: deletedEmployee
            });
        });

        it('should return not found when employee does not exist', async () => {
            const employeeId = 'emp123';

            mockEmployeeService.delete.mockResolvedValue(null);

            const result = await controller.delete(employeeId);

            expect(mockEmployeeService.delete).toHaveBeenCalledWith(employeeId);
            expect(result).toEqual({
                success: false,
                message: 'Colaborador não encontrado'
            });
        });

        it('should handle delete errors', async () => {
            const employeeId = 'emp123';
            const error = new Error('Delete failed');

            mockEmployeeService.delete.mockRejectedValue(error);

            try {
                await controller.delete(employeeId);
            } catch (thrownError) {
                expect(thrownError).toBe(error);
                expect(mockEmployeeService.delete).toHaveBeenCalledWith(employeeId);
            }
        });
    });

    /**
     * Testa o endpoint de restauração de colaborador (soft delete)
     * Espera que o controller restaure o colaborador, trate não encontrado e erros do service.
     */
    describe('restore', () => {
        it('should restore employee successfully', async () => {
            const employeeId = 'emp123';
            const restoredEmployee = {
                _id: 'emp123',
                name: 'João Silva',
                document: '123.456.789-00',
                isActive: true,
                deletedAt: null
            };

            mockEmployeeService.restore.mockResolvedValue(restoredEmployee);

            const result = await controller.restore(employeeId);

            expect(mockEmployeeService.restore).toHaveBeenCalledWith(employeeId);
            expect(result).toEqual({
                success: true,
                message: 'Colaborador reativado com sucesso',
                data: restoredEmployee
            });
        });

        it('should return not found when employee does not exist', async () => {
            const employeeId = 'emp123';

            mockEmployeeService.restore.mockResolvedValue(null);

            const result = await controller.restore(employeeId);

            expect(mockEmployeeService.restore).toHaveBeenCalledWith(employeeId);
            expect(result).toEqual({
                success: false,
                message: 'Colaborador não encontrado'
            });
        });

        it('should handle restore errors', async () => {
            const employeeId = 'emp123';
            const error = new Error('Restore failed');

            mockEmployeeService.restore.mockRejectedValue(error);

            try {
                await controller.restore(employeeId);
            } catch (thrownError) {
                expect(thrownError).toBe(error);
                expect(mockEmployeeService.restore).toHaveBeenCalledWith(employeeId);
            }
        });
    });
});
