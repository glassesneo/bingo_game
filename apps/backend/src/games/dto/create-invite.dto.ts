import { IsInt, IsOptional, IsPositive } from "class-validator";

export class CreateInviteDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  expiresInHours?: number;
}
