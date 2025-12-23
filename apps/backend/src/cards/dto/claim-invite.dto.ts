import { IsNotEmpty, IsString } from "class-validator";

export class ClaimInviteDto {
  @IsNotEmpty()
  @IsString()
  displayName!: string;
}
