import { IsInt, IsOptional, IsPositive } from "class-validator";

export class CreateInviteDto {
  @IsInt()
  @IsPositive()
  gameId!: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  expiresInHours?: number;
}
