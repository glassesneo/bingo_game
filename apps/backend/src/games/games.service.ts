import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, IsNull, Not, Repository } from "typeorm";
import { Card } from "../entities/card.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { Game } from "../entities/game.entity";
import { GameDraw } from "../entities/game-draw.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { Server } from "../entities/server.entity";
import { GamesGateway } from "./games.gateway";

export interface CreateGameResult {
  game: Game;
  invite: CardInvite;
}

export interface DrawnNumber {
  number: number;
  drawOrder: number;
  drawnAt: Date;
}

export interface Winner {
  userId: number;
  displayName: string;
  claimedAt: Date;
}

export interface Reach {
  userId: number;
  displayName: string;
  reachedAt: Date;
}

export interface GameState {
  game: {
    id: number;
    serverId: number;
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
  };
  participantCount: number;
  drawnNumbers: DrawnNumber[];
  winners: Winner[];
}

export interface HostView extends GameState {
  gameId: number;
  inviteToken: string;
}

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
    @InjectRepository(CardInvite)
    private readonly inviteRepo: Repository<CardInvite>,
    @InjectRepository(GameParticipant)
    private readonly participantRepo: Repository<GameParticipant>,
    @InjectRepository(GameDraw)
    private readonly drawRepo: Repository<GameDraw>,
    private readonly dataSource: DataSource,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
  ) {}

  /**
   * Creates a new game with hostToken and a reusable invite.
   * Retries on token collision (unique constraint violation).
   */
  async createGame(serverId: number): Promise<CreateGameResult> {
    // Verify server exists
    const server = await this.serverRepo.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException(`Server with id ${serverId} not found`);
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Generate secure random tokens
        const hostToken = randomBytes(16).toString("hex");
        const inviteToken = randomBytes(16).toString("hex");

        // Create game with hostToken
        const game = queryRunner.manager.create(Game, {
          serverId,
          hostToken,
          status: "waiting",
          startedAt: null,
          endedAt: null,
        });
        const savedGame = await queryRunner.manager.save(Game, game);

        // Create reusable invite for the game (one per game)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const invite = queryRunner.manager.create(CardInvite, {
          gameId: savedGame.id,
          token: inviteToken,
          expiresAt,
        });
        const savedInvite = await queryRunner.manager.save(CardInvite, invite);

        await queryRunner.commitTransaction();

        return { game: savedGame, invite: savedInvite };
      } catch (error) {
        await queryRunner.rollbackTransaction();

        // Check if it's a unique constraint violation (token collision)
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        ) {
          lastError = error;
          continue; // Retry with new tokens
        }
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    throw new BadRequestException(
      `Failed to create game after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Get game state by gameId (public endpoint)
   */
  async getGameState(gameId: number): Promise<GameState> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found`);
    }

    const [participantCount, draws, winners] = await Promise.all([
      this.participantRepo.count({ where: { gameId } }),
      this.drawRepo.find({
        where: { gameId },
        order: { drawOrder: "ASC" },
      }),
      this.getWinners(gameId),
    ]);

    return {
      game: {
        id: game.id,
        serverId: game.serverId,
        status: game.status,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
      },
      participantCount,
      drawnNumbers: draws.map((d) => ({
        number: d.number,
        drawOrder: d.drawOrder,
        drawnAt: d.drawnAt,
      })),
      winners,
    };
  }

  /**
   * Get host view by hostToken
   */
  async getHostView(hostToken: string): Promise<HostView> {
    const game = await this.gameRepo.findOne({ where: { hostToken } });
    if (!game) {
      throw new NotFoundException("Invalid host token");
    }

    const invite = await this.inviteRepo.findOne({
      where: { gameId: game.id },
    });
    if (!invite) {
      throw new NotFoundException("Invite not found for game");
    }

    const state = await this.getGameState(game.id);

    return {
      ...state,
      gameId: game.id,
      inviteToken: invite.token,
    };
  }

  /**
   * Start a game (host only)
   */
  async startGame(gameId: number): Promise<Game> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found`);
    }

    if (game.status !== "waiting") {
      throw new BadRequestException(
        `Cannot start game in status '${game.status}'`,
      );
    }

    game.status = "running";
    game.startedAt = new Date();
    const savedGame = await this.gameRepo.save(game);

    // Broadcast to all connected clients
    this.gateway.broadcastToGame(gameId, "game:started", {
      gameId,
      startedAt: savedGame.startedAt?.toISOString(),
    });

    return savedGame;
  }

  /**
   * Draw a number (host only)
   * Uses transaction with retry to handle concurrent draw race conditions
   */
  async drawNumber(gameId: number): Promise<GameDraw> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const game = await queryRunner.manager.findOne(Game, {
          where: { id: gameId },
        });
        if (!game) {
          throw new NotFoundException(`Game with id ${gameId} not found`);
        }

        if (game.status !== "running") {
          throw new BadRequestException(
            `Cannot draw number in game status '${game.status}'`,
          );
        }

        // Get already drawn numbers within transaction
        const existingDraws = await queryRunner.manager.find(GameDraw, {
          where: { gameId },
          select: ["number", "drawOrder"],
        });
        const drawnNumbers = new Set(existingDraws.map((d) => d.number));
        const nextDrawOrder =
          existingDraws.length > 0
            ? Math.max(...existingDraws.map((d) => d.drawOrder)) + 1
            : 1;

        if (drawnNumbers.size >= 75) {
          throw new BadRequestException("All numbers have been drawn");
        }

        // Pick a random undrawn number (1-75)
        let number: number;
        do {
          number = Math.floor(Math.random() * 75) + 1;
        } while (drawnNumbers.has(number));

        const draw = queryRunner.manager.create(GameDraw, {
          gameId,
          number,
          drawOrder: nextDrawOrder,
        });
        const savedDraw = await queryRunner.manager.save(GameDraw, draw);

        await queryRunner.commitTransaction();

        // Broadcast to all connected clients
        this.gateway.broadcastToGame(gameId, "number:drawn", {
          gameId,
          draw: {
            number: savedDraw.number,
            drawOrder: savedDraw.drawOrder,
            drawnAt: savedDraw.drawnAt.toISOString(),
          },
        });

        return savedDraw;
      } catch (error) {
        await queryRunner.rollbackTransaction();

        // Check if it's a unique constraint violation (race condition)
        if (
          error instanceof Error &&
          error.message.includes("UNIQUE constraint")
        ) {
          lastError = error;
          continue; // Retry
        }
        throw error;
      } finally {
        await queryRunner.release();
      }
    }

    throw new BadRequestException(
      `Failed to draw number after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Claim bingo (player)
   */
  async claimBingo(
    gameId: number,
    userId: number,
    cardId: number,
  ): Promise<Winner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const game = await queryRunner.manager.findOne(Game, {
        where: { id: gameId },
      });
      if (!game) {
        throw new NotFoundException(`Game with id ${gameId} not found`);
      }

      if (game.status !== "running") {
        throw new BadRequestException(
          `Cannot claim bingo in game status '${game.status}'`,
        );
      }

      // Get user's participant record
      const participant = await queryRunner.manager.findOne(GameParticipant, {
        where: { gameId, userId },
      });
      if (!participant) {
        throw new NotFoundException("User is not a participant in this game");
      }

      // Check if already won
      if (participant.wonAt !== null) {
        throw new ConflictException("You have already claimed bingo");
      }

      // Get card
      const card = await queryRunner.manager.findOne(Card, {
        where: { id: cardId, gameId, userId },
        relations: ["cells"],
      });
      if (!card) {
        throw new NotFoundException(
          "Card not found or does not belong to user/game",
        );
      }

      // Get drawn numbers
      const draws = await queryRunner.manager.find(GameDraw, {
        where: { gameId },
        select: ["number"],
      });
      const drawnSet = new Set(draws.map((d) => d.number));

      // Validate bingo
      const hasWon = this.validateBingo(card.cells, drawnSet);
      if (!hasWon) {
        throw new BadRequestException("No valid bingo pattern found");
      }

      // Record the win atomically - use conditional update to prevent race conditions
      const now = new Date();
      const updateResult = await queryRunner.manager.update(
        GameParticipant,
        { id: participant.id, wonAt: IsNull() },
        { wonAt: now },
      );

      if (updateResult.affected === 0) {
        throw new ConflictException("You have already claimed bingo");
      }

      await queryRunner.commitTransaction();

      const winner: Winner = {
        userId,
        displayName: participant.displayName,
        claimedAt: now,
      };

      // Broadcast bingo claim
      this.gateway.broadcastToGame(gameId, "bingo:claimed", {
        gameId,
        winner: {
          userId: winner.userId,
          displayName: winner.displayName,
          claimedAt: winner.claimedAt.toISOString(),
        },
      });

      return winner;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate bingo pattern
   */
  private validateBingo(
    cells: { row: number; col: number; number: number }[],
    drawnNumbers: Set<number>,
  ): boolean {
    // Create a 5x5 grid of marked cells
    const marked: boolean[][] = Array.from({ length: 5 }, () =>
      Array(5).fill(false),
    );

    for (const cell of cells) {
      if (drawnNumbers.has(cell.number)) {
        marked[cell.row][cell.col] = true;
      }
    }

    // Check rows
    for (let r = 0; r < 5; r++) {
      if (marked[r].every((m) => m)) return true;
    }

    // Check columns
    for (let c = 0; c < 5; c++) {
      if (marked.every((row) => row[c])) return true;
    }

    // Check diagonals
    if ([0, 1, 2, 3, 4].every((i) => marked[i][i])) return true;
    if ([0, 1, 2, 3, 4].every((i) => marked[i][4 - i])) return true;

    return false;
  }

  /**
   * Check if player is one number away from winning (reach)
   */
  private validateReach(
    cells: { row: number; col: number; number: number }[],
    drawnNumbers: Set<number>,
  ): boolean {
    // Create a 5x5 grid of marked cells
    const marked: boolean[][] = Array.from({ length: 5 }, () =>
      Array(5).fill(false),
    );

    for (const cell of cells) {
      if (drawnNumbers.has(cell.number)) {
        marked[cell.row][cell.col] = true;
      }
    }

    // Check rows - need exactly 4 marked
    for (let r = 0; r < 5; r++) {
      const markedCount = marked[r].filter((m) => m).length;
      if (markedCount === 4) return true;
    }

    // Check columns - need exactly 4 marked
    for (let c = 0; c < 5; c++) {
      const markedCount = marked.filter((row) => row[c]).length;
      if (markedCount === 4) return true;
    }

    // Check main diagonal - need exactly 4 marked
    const mainDiagCount = [0, 1, 2, 3, 4].filter((i) => marked[i][i]).length;
    if (mainDiagCount === 4) return true;

    // Check anti-diagonal - need exactly 4 marked
    const antiDiagCount = [0, 1, 2, 3, 4].filter(
      (i) => marked[i][4 - i],
    ).length;
    if (antiDiagCount === 4) return true;

    return false;
  }

  /**
   * Notify reach (player)
   */
  async notifyReach(
    gameId: number,
    userId: number,
    cardId: number,
  ): Promise<Reach> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const game = await queryRunner.manager.findOne(Game, {
        where: { id: gameId },
      });
      if (!game) {
        throw new NotFoundException(`Game with id ${gameId} not found`);
      }

      if (game.status !== "running") {
        throw new BadRequestException(
          `Cannot notify reach in game status '${game.status}'`,
        );
      }

      // Get user's participant record
      const participant = await queryRunner.manager.findOne(GameParticipant, {
        where: { gameId, userId },
      });
      if (!participant) {
        throw new NotFoundException("User is not a participant in this game");
      }

      // Check if already notified reach
      if (participant.reachedAt !== null) {
        throw new ConflictException("You have already notified reach");
      }

      // Get card
      const card = await queryRunner.manager.findOne(Card, {
        where: { id: cardId, gameId, userId },
        relations: ["cells"],
      });
      if (!card) {
        throw new NotFoundException(
          "Card not found or does not belong to user/game",
        );
      }

      // Get drawn numbers
      const draws = await queryRunner.manager.find(GameDraw, {
        where: { gameId },
        select: ["number"],
      });
      const drawnSet = new Set(draws.map((d) => d.number));

      // Validate reach (one away from bingo)
      const hasReach = this.validateReach(card.cells, drawnSet);
      if (!hasReach) {
        throw new BadRequestException("No valid reach pattern found");
      }

      // Record the reach atomically
      const now = new Date();
      const updateResult = await queryRunner.manager.update(
        GameParticipant,
        { id: participant.id, reachedAt: IsNull() },
        { reachedAt: now },
      );

      if (updateResult.affected === 0) {
        throw new ConflictException("You have already notified reach");
      }

      await queryRunner.commitTransaction();

      const reach: Reach = {
        userId,
        displayName: participant.displayName,
        reachedAt: now,
      };

      // Broadcast reach notification
      this.gateway.broadcastToGame(gameId, "reach:notified", {
        gameId,
        reach: {
          userId: reach.userId,
          displayName: reach.displayName,
          reachedAt: reach.reachedAt.toISOString(),
        },
      });

      return reach;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get winners for a game
   */
  private async getWinners(gameId: number): Promise<Winner[]> {
    const winners = await this.participantRepo.find({
      where: {
        gameId,
        wonAt: Not(IsNull()),
      },
      order: { wonAt: "ASC" },
    });

    return winners.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      claimedAt: p.wonAt as Date,
    }));
  }

  /**
   * End a game (host only)
   */
  async endGame(gameId: number): Promise<Game> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found`);
    }

    if (game.status === "ended") {
      throw new BadRequestException("Game has already ended");
    }

    game.status = "ended";
    game.endedAt = new Date();
    const savedGame = await this.gameRepo.save(game);

    // Broadcast to all connected clients
    this.gateway.broadcastToGame(gameId, "game:ended", {
      gameId,
      endedAt: savedGame.endedAt?.toISOString(),
    });

    return savedGame;
  }

  /**
   * @deprecated Use createGame which automatically creates invite
   */
  async createInvite(
    gameId: number,
    expiresInHours: number = 24,
  ): Promise<CardInvite> {
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found`);
    }

    const token = randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const invite = this.inviteRepo.create({
      gameId,
      token,
      expiresAt,
    });

    return await this.inviteRepo.save(invite);
  }
}
