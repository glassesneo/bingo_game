import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { HostTokenGuard } from "../auth/host-token.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/jwt-payload.interface";
import { ClaimRouletteDto } from "./dto/claim-roulette.dto";
import {
  ClaimBingoResponseDto,
  ClaimRouletteResponseDto,
  CreateGameResponseDto,
  DrawNumberResponseDto,
  EndGameResponseDto,
  GameStateResponseDto,
  HostViewResponseDto,
  NotifyReachResponseDto,
  StartGameResponseDto,
  UpdateAwardRangeResponseDto,
} from "./dto/game-response.dto";
import { UpdateAwardRangeDto } from "./dto/update-award-range.dto";
import { GamesService } from "./games.service";

@Controller()
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /**
   * POST /servers/:serverId/games
   * Create a new game with hostToken and inviteToken
   */
  @Post("servers/:serverId/games")
  async create(
    @Param("serverId", ParseIntPipe) serverId: number,
  ): Promise<CreateGameResponseDto> {
    const { game, invite } = await this.gamesService.createGame(serverId);
    return {
      id: game.id,
      serverId: game.serverId,
      status: game.status,
      startedAt: game.startedAt?.toISOString() ?? null,
      endedAt: game.endedAt?.toISOString() ?? null,
      awardMin: game.awardMin,
      awardMax: game.awardMax,
      hostToken: game.hostToken,
      inviteToken: invite.token,
    };
  }

  /**
   * GET /games/:gameId
   * Get public game state
   */
  @Get("games/:gameId")
  async getGame(
    @Param("gameId", ParseIntPipe) gameId: number,
  ): Promise<GameStateResponseDto> {
    const state = await this.gamesService.getGameState(gameId);
    return {
      game: {
        id: state.game.id,
        serverId: state.game.serverId,
        status: state.game.status,
        startedAt: state.game.startedAt?.toISOString() ?? null,
        endedAt: state.game.endedAt?.toISOString() ?? null,
        awardMin: state.game.awardMin,
        awardMax: state.game.awardMax,
      },
      participantCount: state.participantCount,
      drawnNumbers: state.drawnNumbers.map((d) => ({
        number: d.number,
        drawOrder: d.drawOrder,
        drawnAt: d.drawnAt.toISOString(),
      })),
      winners: state.winners.map((w) => ({
        userId: w.userId,
        displayName: w.displayName,
        claimedAt: w.claimedAt.toISOString(),
      })),
    };
  }

  /**
   * GET /games/host/:hostToken
   * Get host view by hostToken (returns gameId + full state)
   */
  @Get("games/host/:hostToken")
  async getHostView(
    @Param("hostToken") hostToken: string,
  ): Promise<HostViewResponseDto> {
    const view = await this.gamesService.getHostView(hostToken);
    return {
      gameId: view.gameId,
      inviteToken: view.inviteToken,
      game: {
        id: view.game.id,
        serverId: view.game.serverId,
        status: view.game.status,
        startedAt: view.game.startedAt?.toISOString() ?? null,
        endedAt: view.game.endedAt?.toISOString() ?? null,
        awardMin: view.game.awardMin,
        awardMax: view.game.awardMax,
      },
      participantCount: view.participantCount,
      drawnNumbers: view.drawnNumbers.map((d) => ({
        number: d.number,
        drawOrder: d.drawOrder,
        drawnAt: d.drawnAt.toISOString(),
      })),
      winners: view.winners.map((w) => ({
        userId: w.userId,
        displayName: w.displayName,
        claimedAt: w.claimedAt.toISOString(),
      })),
    };
  }

  /**
   * PATCH /games/:gameId/awards
   * Update award range (host only, waiting status only)
   */
  @Patch("games/:gameId/awards")
  @UseGuards(HostTokenGuard)
  async updateAwardRange(
    @Param("gameId", ParseIntPipe) gameId: number,
    @Body() dto: UpdateAwardRangeDto,
  ): Promise<UpdateAwardRangeResponseDto> {
    const game = await this.gamesService.updateAwardRange(
      gameId,
      dto.awardMin ?? null,
      dto.awardMax ?? null,
    );
    return {
      gameId: game.id,
      awardMin: game.awardMin,
      awardMax: game.awardMax,
    };
  }

  /**
   * POST /games/:gameId/start
   * Start the game (host only)
   */
  @Post("games/:gameId/start")
  @UseGuards(HostTokenGuard)
  async startGame(
    @Param("gameId", ParseIntPipe) gameId: number,
  ): Promise<StartGameResponseDto> {
    const game = await this.gamesService.startGame(gameId);
    return {
      gameId: game.id,
      status: game.status,
      startedAt: game.startedAt?.toISOString() ?? "",
    };
  }

  /**
   * POST /games/:gameId/draw
   * Draw a number (host only)
   */
  @Post("games/:gameId/draw")
  @UseGuards(HostTokenGuard)
  async drawNumber(
    @Param("gameId", ParseIntPipe) gameId: number,
  ): Promise<DrawNumberResponseDto> {
    const draw = await this.gamesService.drawNumber(gameId);
    return {
      gameId,
      draw: {
        number: draw.number,
        drawOrder: draw.drawOrder,
        drawnAt: draw.drawnAt.toISOString(),
      },
    };
  }

  /**
   * POST /games/:gameId/bingo
   * Claim bingo (player only, JWT protected)
   */
  @Post("games/:gameId/bingo")
  @UseGuards(JwtAuthGuard)
  async claimBingo(
    @Param("gameId", ParseIntPipe) gameId: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<ClaimBingoResponseDto> {
    const { userId, cardId } = req.user;
    const winner = await this.gamesService.claimBingo(gameId, userId, cardId);
    return {
      success: true,
      winner: {
        userId: winner.userId,
        displayName: winner.displayName,
        claimedAt: winner.claimedAt.toISOString(),
      },
    };
  }

  /**
   * POST /games/:gameId/reach
   * Notify reach (player only, JWT protected)
   */
  @Post("games/:gameId/reach")
  @UseGuards(JwtAuthGuard)
  async notifyReach(
    @Param("gameId", ParseIntPipe) gameId: number,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<NotifyReachResponseDto> {
    const { userId, cardId } = req.user;
    const reach = await this.gamesService.notifyReach(gameId, userId, cardId);
    return {
      success: true,
      reach: {
        userId: reach.userId,
        displayName: reach.displayName,
        reachedAt: reach.reachedAt.toISOString(),
      },
    };
  }

  /**
   * POST /games/:gameId/roulette
   * Claim roulette award (winner only, JWT protected)
   */
  @Post("games/:gameId/roulette")
  @UseGuards(JwtAuthGuard)
  async claimRoulette(
    @Param("gameId", ParseIntPipe) gameId: number,
    @Body() dto: ClaimRouletteDto,
    @Req() req: Request & { user: AuthenticatedUser },
  ): Promise<ClaimRouletteResponseDto> {
    const { userId } = req.user;
    const { result, remainingAwards } = await this.gamesService.claimRoulette(
      gameId,
      userId,
      dto.award,
    );
    return {
      success: true,
      result: {
        userId: result.userId,
        displayName: result.displayName,
        award: result.award,
        claimedAt: result.claimedAt.toISOString(),
      },
      remainingAwards,
    };
  }

  /**
   * POST /games/:gameId/end
   * End the game (host only)
   */
  @Post("games/:gameId/end")
  @UseGuards(HostTokenGuard)
  async endGame(
    @Param("gameId", ParseIntPipe) gameId: number,
  ): Promise<EndGameResponseDto> {
    const game = await this.gamesService.endGame(gameId);
    return {
      gameId: game.id,
      status: game.status,
      endedAt: game.endedAt?.toISOString() ?? "",
    };
  }
}
