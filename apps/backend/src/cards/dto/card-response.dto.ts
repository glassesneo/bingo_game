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
  issuedAt!: Date;
  cells!: CardCellResponseDto[];
}
