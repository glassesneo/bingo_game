import { Body, Controller, Param, Post } from "@nestjs/common";
import { CardsService } from "./cards.service";
import { CardResponseDto } from "./dto/card-response.dto";
import { ClaimInviteDto } from "./dto/claim-invite.dto";

@Controller("invites")
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post(":token/claim")
  async claimInvite(
    @Param("token") token: string,
    @Body() dto: ClaimInviteDto,
  ): Promise<CardResponseDto> {
    const card = await this.cardsService.claimInvite(token, dto);

    return {
      id: card.id,
      gameId: card.gameId,
      userId: card.userId,
      issuedAt: card.issuedAt,
      cells: card.cells.map((cell) => ({
        id: cell.id,
        row: cell.row,
        col: cell.col,
        number: cell.number,
      })),
    };
  }
}
