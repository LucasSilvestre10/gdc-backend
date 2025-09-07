import { Injectable, Inject } from "@tsed/di";
import { EmployeeRepository } from "../repositories/EmployeeRepository";
import { DocumentTypeRepository } from "../repositories/DocumentTypeRepository";
import { DocumentRepository } from "../repositories/DocumentRepository";
import { Employee } from "../models/Employee";
import { DocumentType } from "../models/DocumentType";
import { DocumentStatus } from "../models/Document";

@Injectable()
export class EmployeeService {
  constructor(
    @Inject() private employeeRepo: EmployeeRepository,
    @Inject() private documentTypeRepo: DocumentTypeRepository,
    @Inject() private documentRepo: DocumentRepository
  ) {}

  async createEmployee(dto: Partial<Employee>): Promise<Employee> {
    return this.employeeRepo.create(dto);
  }

  async updateEmployee(id: string, dto: Partial<Employee>): Promise<Employee | null> {
    return this.employeeRepo.update(id, dto);
  }

  async linkDocumentTypes(employeeId: string, typeIds: string[]): Promise<void> {
    if (!typeIds?.length) return;

    // Garantir que todos os tipos existem
    const types = await this.documentTypeRepo.findByIds(typeIds);
    if (types.length !== typeIds.length) {
      throw new Error("Algum tipo de documento não existe");
    }
    
    await this.employeeRepo.addRequiredTypes(employeeId, typeIds);
  }

  async unlinkDocumentTypes(employeeId: string, typeIds: string[]): Promise<void> {
    if (!typeIds?.length) return;
    await this.employeeRepo.removeRequiredTypes(employeeId, typeIds);
  }

  async getDocumentationStatus(employeeId: string): Promise<{
    sent: DocumentType[];
    pending: DocumentType[];
  }> {
    const employee = await this.employeeRepo.findById(employeeId);
    if (!employee) {
      throw new Error("Colaborador não encontrado");
    }

    const requiredTypeIds = (employee.requiredDocumentTypes || []).map(id => id.toString());
    if (!requiredTypeIds.length) {
      return { sent: [], pending: [] };
    }

    const requiredTypes = await this.documentTypeRepo.findByIds(requiredTypeIds);

    const sentDocuments = await this.documentRepo.find({
      employeeId,
      documentTypeId: { $in: requiredTypeIds },
      status: DocumentStatus.SENT
    });

    const sentTypeIds = new Set(
      sentDocuments.map(doc => doc.documentTypeId.toString())
    );

    const sent = requiredTypes.filter(type => 
      sentTypeIds.has(type._id?.toString() ?? "")
    );
    
    const pending = requiredTypes.filter(type => 
      !sentTypeIds.has(type._id?.toString() ?? "")
    );

    return { sent, pending };
  }
}