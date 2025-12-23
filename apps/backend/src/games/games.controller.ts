import { Body, Controller, Param, ParseIntPipe, Post } from "@nestjs/common";
import { CreateInviteDto } from "./dto/create-invite.dto";
import { GameResponseDto } from "./dto/game-response.dto";
import { InviteResponseDto } from "./dto/invite-response.dto";
import { GamesService } from "./games.service";

@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post("servers/:serverId/games")
  async create(
    @Param("serverId", ParseIntPipe) serverId: number,
  ): Promise<GameResponseDto> {
    const game = await this.gamesService.createGame(serverId);
    return {
      id: game.id,
      serverId: game.serverId,
      status: game.status,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
    };
  }

  @Post("games/:gameId/invites")
  async createInvite(
    @Param("gameId", ParseIntPipe) gameId: number,
    @Body() dto: CreateInviteDto,
  ): Promise<InviteResponseDto> {
    const invite = await this.gamesService.createInvite(
      gameId,
      dto.expiresInHours ?? 24,
    );
    return {
      id: invite.id,
      gameId: invite.gameId,
      token: invite.token,
      expiresAt: invite.expiresAt,
      usedAt: invite.usedAt,
    };
  }
}
