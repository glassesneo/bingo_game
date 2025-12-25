import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { CardsService } from "./cards.service";
import {
  CardResponseDto,
  ClaimInviteResponseDto,
  InviteInfoResponseDto,
} from "./dto/card-response.dto";
import { ClaimInviteDto } from "./dto/claim-invite.dto";

@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  /**
   * GET /invites/:token
   * Get invite info without claiming (for session validation)
   */
  @Get("invites/:token")
  async getInviteInfo(
    @Param("token") token: string,
  ): Promise<InviteInfoResponseDto> {
    return this.cardsService.getInviteInfo(token);
  }

  /**
   * POST /invites/:token/claim
   * Claim an invite to join a game. Returns JWT session and card.
   * Supports re-login: same displayName returns existing card with new JWT.
   */
  @Post("invites/:token/claim")
  async claimInvite(
    @Param("token") token: string,
    @Body() dto: ClaimInviteDto,
  ): Promise<ClaimInviteResponseDto> {
    const result = await this.cardsService.claimInvite(token, dto);

    return {
      session: result.session,
      card: {
        id: result.card.id,
        gameId: result.card.gameId,
        userId: result.card.userId,
        issuedAt: result.card.issuedAt.toISOString(),
        cells: result.card.cells.map((cell) => ({
          id: cell.id,
          row: cell.row,
          col: cell.col,
          number: cell.number,
        })),
      },
    };
  }

  /**
   * GET /cards/me
   * Get the authenticated user's card for their game (JWT protected)
   */
  @Get("cards/me")
  @UseGuards(JwtAuthGuard)
  async getMyCard(
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<CardResponseDto> {
    const { userId, gameId, cardId } = req.user;
    const card = await this.cardsService.getMyCard(userId, gameId, cardId);

    return {
      id: card.id,
      gameId: card.gameId,
      userId: card.userId,
      issuedAt: card.issuedAt.toISOString(),
      cells: card.cells.map((cell) => ({
        id: cell.id,
        row: cell.row,
        col: cell.col,
        number: cell.number,
      })),
    };
  }
}
