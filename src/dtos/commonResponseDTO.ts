import { Property } from "@tsed/schema";

export class ErrorInfoDto {
  @Property()
  type!: string;

  @Property()
  code!: string;

  @Property()
  timestamp!: string;

  @Property()
  path!: string;

  @Property()
  method!: string;
}

export class ErrorResponseDto {
  @Property()
  success!: boolean;

  @Property()
  message!: string;

  @Property()
  error!: ErrorInfoDto;

  @Property()
  stack?: string[];

  @Property()
  details?: Record<string, unknown>;
}

export default {};
