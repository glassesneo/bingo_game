import { IsNotEmpty, IsString } from "class-validator";

export class CreateServerDto {
  @IsNotEmpty()
  @IsString()
  name!: string;
}
