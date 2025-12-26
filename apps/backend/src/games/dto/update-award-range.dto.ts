import { IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateAwardRangeDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  awardMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  awardMax?: number | null;
}
