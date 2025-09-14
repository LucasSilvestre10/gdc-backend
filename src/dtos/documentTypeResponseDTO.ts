import { Property, CollectionOf } from "@tsed/schema";
import { PaginationInfoDto } from "./paginationDTO";

export class DocumentTypeDto {
  @Property()
  _id!: string;

  @Property()
  name!: string;

  @Property()
  description?: string;

  @Property()
  isActive?: boolean;

  @Property()
  createdAt?: Date;

  @Property()
  updatedAt?: Date;
}

export class DocumentTypeListDataDto {
  @CollectionOf(DocumentTypeDto)
  items!: DocumentTypeDto[];

  @Property()
  pagination!: PaginationInfoDto;
}

export class DocumentTypeListResponseDto {
  @Property()
  success!: boolean;

  @Property()
  message!: string;

  @Property()
  data!: DocumentTypeListDataDto;
}

export default {};
