export class GameResponseDto {
  id!: number;
  serverId!: number;
  status!: string;
  startedAt!: string | null;
  endedAt!: string | null;
  awardMin!: number | null;
  awardMax!: number | null;
}

export class CreateGameResponseDto extends GameResponseDto {
  hostToken!: string;
  inviteToken!: string;
}

export class DrawnNumberDto {
  number!: number;
  drawOrder!: number;
  drawnAt!: string;
}

export class WinnerDto {
  userId!: number;
  displayName!: string;
  claimedAt!: string;
}

export class GameStateResponseDto {
  game!: {
    id: number;
    serverId: number;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    awardMin: number | null;
    awardMax: number | null;
  };
  participantCount!: number;
  drawnNumbers!: DrawnNumberDto[];
  winners!: WinnerDto[];
}

export class HostViewResponseDto extends GameStateResponseDto {
  gameId!: number;
  inviteToken!: string;
}

export class StartGameResponseDto {
  gameId!: number;
  status!: string;
  startedAt!: string;
}

export class EndGameResponseDto {
  gameId!: number;
  status!: string;
  endedAt!: string;
}

export class DrawNumberResponseDto {
  gameId!: number;
  draw!: DrawnNumberDto;
}

export class ClaimBingoResponseDto {
  success!: boolean;
  winner!: WinnerDto;
}

export class ReachDto {
  userId!: number;
  displayName!: string;
  reachedAt!: string;
}

export class NotifyReachResponseDto {
  success!: boolean;
  reach!: ReachDto;
}

export class UpdateAwardRangeResponseDto {
  gameId!: number;
  awardMin!: number | null;
  awardMax!: number | null;
}

export class RouletteResultDto {
  userId!: number;
  displayName!: string;
  award!: number;
  claimedAt!: string;
}

export class ClaimRouletteResponseDto {
  success!: boolean;
  result!: RouletteResultDto;
  remainingAwards!: number[];
}
