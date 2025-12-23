export class GameResponseDto {
  id!: number;
  serverId!: number;
  status!: string;
  startedAt!: Date | null;
  endedAt!: Date | null;
}
