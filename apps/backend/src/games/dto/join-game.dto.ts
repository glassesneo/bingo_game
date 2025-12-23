import { IsInt, IsNotEmpty, IsPositive, IsString } from "class-validator";

export class JoinGameDto {
  @IsInt()
  @IsPositive()
  gameId!: number;

  @IsString()
  @IsNotEmpty()
  playerToken!: string;
}
