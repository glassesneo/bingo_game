export class CardCellResponseDto {
  id!: number;
  row!: number;
  col!: number;
  number!: number;
}

export class CardResponseDto {
  id!: number;
  gameId!: number;
  userId!: number;
  issuedAt!: string;
  cells!: CardCellResponseDto[];
}

export class PlayerSessionDto {
  token!: string;
  userId!: number;
  displayName!: string;
  gameId!: number;
  cardId!: number;
}

export class ClaimInviteResponseDto {
  session!: PlayerSessionDto;
  card!: CardResponseDto;
}
