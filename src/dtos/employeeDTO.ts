import { Property, Required } from "@tsed/schema";

export class CreateEmployeeDto {
  @Required()
  @Property()
  name!: string;

  @Required()
  @Property()
  document!: string; // CPF

  @Required()
  @Property()
  hiredAt!: Date;
}

export class UpdateEmployeeDto {
  @Property()
  name?: string;

  @Property()
  document?: string;

  @Property()
  hiredAt?: Date;
}

export class LinkDocumentTypesDto {
  @Required()
  @Property(String)
  documentTypeIds!: string[];
}

export class UnlinkDocumentTypesDto {
  @Required()
  @Property(String)
  documentTypeIds!: string[];
}