import { Property, Required } from "@tsed/schema";

export class CreateDocumentTypeDto {
  @Required()
  @Property()
  name!: string;
}

export class UpdateDocumentTypeDto {
  @Property()
  name?: string;
}