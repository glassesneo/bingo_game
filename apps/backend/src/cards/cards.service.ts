import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { JwtPayload } from "../auth/jwt-payload.interface";
import { Card } from "../entities/card.entity";
import { CardCell } from "../entities/card-cell.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { User } from "../entities/user.entity";
import { GamesGateway } from "../games/games.gateway";
import { ClaimInviteDto } from "./dto/claim-invite.dto";

export interface ClaimInviteResult {
  session: {
    token: string;
    userId: number;
    displayName: string;
    gameId: number;
    cardId: number;
  };
  card: Card;
  user: User;
}

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly gamesGateway: GamesGateway,
  ) {}

  /**
   * Claim an invite - creates user, participant, card if needed, returns JWT session.
   * Supports re-login: if displayName already exists for this game, returns existing card with new JWT.
   * Display names are scoped to games (unique per game, not globally).
   */
  async claimInvite(
    token: string,
    dto: ClaimInviteDto,
  ): Promise<ClaimInviteResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find the invite (reusable - no usedAt check)
      const invite = await queryRunner.manager.findOne(CardInvite, {
        where: { token },
        relations: ["game"],
      });

      if (!invite) {
        throw new NotFoundException(`Invite with token ${token} not found`);
      }

      if (new Date() > invite.expiresAt) {
        throw new BadRequestException("Invite has expired");
      }

      if (invite.game.status === "ended") {
        throw new BadRequestException("Game has already ended");
      }

      // 2. Check if displayName is already used in this game (re-login support)
      const existingParticipant = await queryRunner.manager.findOne(
        GameParticipant,
        {
          where: {
            gameId: invite.gameId,
            displayName: dto.displayName,
          },
          relations: ["user"],
        },
      );

      let user: User;
      let card: Card;

      if (existingParticipant) {
        // Re-login: return existing card with new JWT
        user = existingParticipant.user;

        const existingCard = await queryRunner.manager.findOne(Card, {
          where: {
            gameId: invite.gameId,
            userId: user.id,
          },
          relations: ["cells"],
        });

        if (!existingCard) {
          throw new Error(
            `Card not found for existing participant user ${user.id} in game ${invite.gameId}`,
          );
        }
        card = existingCard;
      } else {
        // New player: create user, participant, and card
        // 3. Create new User with unique display name
        user = queryRunner.manager.create(User, {
          displayName: dto.displayName,
        });
        try {
          user = await queryRunner.manager.save(User, user);
        } catch (error) {
          // Handle unique constraint violation on global display_name
          // Generate a unique suffix if collision occurs
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          ) {
            const suffix = Math.random().toString(36).substring(2, 6);
            user = queryRunner.manager.create(User, {
              displayName: `${dto.displayName}_${suffix}`,
            });
            user = await queryRunner.manager.save(User, user);
          } else {
            throw error;
          }
        }

        // 4. Create GameParticipant with scoped displayName
        let participant = queryRunner.manager.create(GameParticipant, {
          gameId: invite.gameId,
          userId: user.id,
          displayName: dto.displayName,
        });
        try {
          participant = await queryRunner.manager.save(
            GameParticipant,
            participant,
          );
        } catch (error) {
          // Handle race condition where another request claimed this displayName
          if (
            error instanceof Error &&
            error.message.includes("UNIQUE constraint")
          ) {
            throw new ConflictException(
              `Display name "${dto.displayName}" is already taken in this game`,
            );
          }
          throw error;
        }

        // 5. Create Card
        const newCard = queryRunner.manager.create(Card, {
          gameId: invite.gameId,
          userId: user.id,
        });
        const savedCard = await queryRunner.manager.save(Card, newCard);

        // 6. Generate 25 CardCells (5x5 bingo grid)
        const cells = this.generateBingoGrid(savedCard.id);
        await queryRunner.manager.save(CardCell, cells);

        // Load card with cells
        const loadedCard = await queryRunner.manager.findOne(Card, {
          where: { id: savedCard.id },
          relations: ["cells"],
        });

        if (!loadedCard) {
          throw new Error(
            `Card with id ${savedCard.id} not found after creation`,
          );
        }
        card = loadedCard;
      }

      await queryRunner.commitTransaction();

      // Broadcast player joined event for new players (not re-login)
      if (!existingParticipant) {
        // Get updated participant count
        const participantCount = await this.cardRepo.manager.count(
          GameParticipant,
          {
            where: { gameId: invite.gameId },
          },
        );
        this.gamesGateway.broadcastToGame(invite.gameId, "player:joined", {
          displayName: dto.displayName,
          participantCount,
        });
      }

      // 7. Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        gameId: invite.gameId,
        cardId: card.id,
        displayName: dto.displayName, // Use the scoped display name
      };
      const jwtToken = await this.jwtService.signAsync(payload);

      return {
        session: {
          token: jwtToken,
          userId: user.id,
          displayName: dto.displayName,
          gameId: invite.gameId,
          cardId: card.id,
        },
        card,
        user,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get card by ID with cells
   */
  async getCard(cardId: number): Promise<Card> {
    const card = await this.cardRepo.findOne({
      where: { id: cardId },
      relations: ["cells"],
    });

    if (!card) {
      throw new NotFoundException(`Card with id ${cardId} not found`);
    }

    return card;
  }

  /**
   * Get card for authenticated user
   */
  async getMyCard(
    userId: number,
    gameId: number,
    cardId: number,
  ): Promise<Card> {
    const card = await this.cardRepo.findOne({
      where: { id: cardId, userId, gameId },
      relations: ["cells"],
    });

    if (!card) {
      throw new NotFoundException("Card not found");
    }

    return card;
  }

  /**
   * Generates 5x5 bingo grid with numbers 1-75
   * B column (col 0): 1-15
   * I column (col 1): 16-30
   * N column (col 2): 31-45 (center cell is FREE space with number=0)
   * G column (col 3): 46-60
   * O column (col 4): 61-75
   */
  private generateBingoGrid(cardId: number): CardCell[] {
    const cells: CardCell[] = [];
    const ranges: [number, number][] = [
      [1, 15], // B
      [16, 30], // I
      [31, 45], // N
      [46, 60], // G
      [61, 75], // O
    ];

    for (let col = 0; col < 5; col++) {
      const [min, max] = ranges[col];
      // For center column (N), we only need 4 numbers since center is FREE
      const count = col === 2 ? 4 : 5;
      const numbers = this.getRandomNumbers(min, max, count);

      for (let row = 0; row < 5; row++) {
        const cell = new CardCell();
        cell.cardId = cardId;
        cell.row = row;
        cell.col = col;

        // Center cell (row=2, col=2) is FREE space
        if (row === 2 && col === 2) {
          cell.number = 0; // 0 indicates FREE space
        } else {
          // Adjust index for N column since we skipped the center
          const index = col === 2 && row > 2 ? row - 1 : row;
          cell.number = numbers[index];
        }
        cells.push(cell);
      }
    }

    return cells;
  }

  /**
   * Get N unique random numbers from range [min, max]
   */
  private getRandomNumbers(min: number, max: number, count: number): number[] {
    const numbers: number[] = [];
    const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);

    for (let i = 0; i < count; i++) {
      const index = Math.floor(Math.random() * available.length);
      numbers.push(available[index]);
      available.splice(index, 1);
    }

    return numbers;
  }
}
