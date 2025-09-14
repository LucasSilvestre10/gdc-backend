import { Property, Required } from "@tsed/schema";

export class CreateDocumentTypeDto {
  @Required()
  @Property()
  name!: string;

  @Property()
  description?: string;
}

export class UpdateDocumentTypeDto {
  @Property()
  name?: string;

  @Property()
  description?: string;
}