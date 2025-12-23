import { IsInt, IsPositive } from "class-validator";

export class CreateGameDto {
  @IsInt()
  @IsPositive()
  serverId!: number;
}
