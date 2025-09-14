import { Property, Required } from "@tsed/schema";

export class CreateDocumentTypeDto {
  @Required()
  @Property()
  name!: string;

  @Property()
  description?: string;
}

export class DocumentTypeDto {
  id!: string;
  name!: string;
  description?: string;
  isActive!: boolean;
}

export class DocumentTypeResponseDto {
  success!: boolean;
  message!: string;
  data!: DocumentTypeDto;
  timestamp!: string;
}

export class UpdateDocumentTypeDto {
  @Property()
  name?: string;

  @Property()
  description?: string;
}
