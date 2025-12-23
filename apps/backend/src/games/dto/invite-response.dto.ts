export class InviteResponseDto {
  id!: number;
  gameId!: number;
  token!: string;
  expiresAt!: Date;
  usedAt!: Date | null;
}
