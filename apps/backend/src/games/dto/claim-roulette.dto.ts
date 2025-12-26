import { IsInt, Min } from "class-validator";

export class ClaimRouletteDto {
  @IsInt()
  @Min(1)
  award!: number;
}
