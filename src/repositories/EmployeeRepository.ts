import { Model } from "@tsed/mongoose";
import { Employee } from "../models/Employee";
import { Injectable } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";

@Injectable()
export class EmployeeRepository {
    constructor(@Model(new Employee()) private employeeModel: MongooseModel<Employee>) { }

    async create(dto: Partial<Employee>): Promise<Employee> {
        return await this.employeeModel.create(dto);
    }

    async update(id: string, dto: Partial<Employee>): Promise<Employee | null> {
        return await this.employeeModel.findByIdAndUpdate(id, dto, { new: true });
    }

    async findById(id: string): Promise<Employee | null> {
        return await this.employeeModel.findById(id);
    }

    async list(filter: any = {}, opts: { page?: number; limit?: number } = {}): Promise<{ items: Employee[]; total: number }> {
        const page = opts.page || 1;
        const limit = opts.limit || 10;
        const query = this.employeeModel.find(filter).skip((page - 1) * limit).limit(limit);
        const items = await query.exec();
        const total = await this.employeeModel.countDocuments(filter);
        return { items, total };
    }

    async addRequiredTypes(employeeId: string, typeIds: string[]): Promise<void> {
        await this.employeeModel.updateOne(
            { _id: employeeId },
            { $addToSet: { requiredDocumentTypes: { $each: typeIds } } }
        );
    }

    async removeRequiredTypes(employeeId: string, typeIds: string[]): Promise<void> {
        await this.employeeModel.updateOne(
            { _id: employeeId },
            { $pullAll: { requiredDocumentTypes: typeIds } }
        );
    }
}