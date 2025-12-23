import { IsInt, IsPositive } from "class-validator";

export class JoinGameDto {
  @IsInt()
  @IsPositive()
  gameId!: number;

  @IsInt()
  @IsPositive()
  userId!: number;
}
