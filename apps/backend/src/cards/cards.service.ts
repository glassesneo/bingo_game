import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { Card } from "../entities/card.entity";
import { CardCell } from "../entities/card-cell.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { User } from "../entities/user.entity";
import { ClaimInviteDto } from "./dto/claim-invite.dto";

@Injectable()
export class CardsService {
  constructor(
    @InjectRepository(CardInvite) readonly _inviteRepo: Repository<CardInvite>,
    @InjectRepository(User) readonly _userRepo: Repository<User>,
    @InjectRepository(GameParticipant)
    readonly _participantRepo: Repository<GameParticipant>,
    @InjectRepository(Card)
    private readonly cardRepo: Repository<Card>,
    @InjectRepository(CardCell) readonly _cellRepo: Repository<CardCell>,
    private readonly dataSource: DataSource,
  ) {}

  async claimInvite(token: string, dto: ClaimInviteDto): Promise<Card> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Find and validate invite
      const invite = await queryRunner.manager.findOne(CardInvite, {
        where: { token },
        relations: ["game"],
      });

      if (!invite) {
        throw new NotFoundException(`Invite with token ${token} not found`);
      }

      if (invite.usedAt !== null) {
        throw new BadRequestException("Invite has already been used");
      }

      if (new Date() > invite.expiresAt) {
        throw new BadRequestException("Invite has expired");
      }

      // 2. Find or create User
      let user = await queryRunner.manager.findOne(User, {
        where: { displayName: dto.displayName },
      });

      if (!user) {
        user = queryRunner.manager.create(User, {
          displayName: dto.displayName,
        });
        user = await queryRunner.manager.save(User, user);
      }

      // 3. Check if user already has a card for this game
      const existingCard = await queryRunner.manager.findOne(Card, {
        where: {
          gameId: invite.gameId,
          userId: user.id,
        },
      });

      if (existingCard) {
        throw new BadRequestException("User already has a card for this game");
      }

      // 4. Create GameParticipant (if not exists)
      let participant = await queryRunner.manager.findOne(GameParticipant, {
        where: {
          gameId: invite.gameId,
          userId: user.id,
        },
      });

      if (!participant) {
        participant = queryRunner.manager.create(GameParticipant, {
          gameId: invite.gameId,
          userId: user.id,
        });
        participant = await queryRunner.manager.save(
          GameParticipant,
          participant,
        );
      }

      // 5. Create Card
      const card = queryRunner.manager.create(Card, {
        gameId: invite.gameId,
        userId: user.id,
      });
      const savedCard = await queryRunner.manager.save(Card, card);

      // 6. Generate 25 CardCells (5x5 bingo grid)
      const cells = this.generateBingoGrid(savedCard.id);
      const _savedCells = await queryRunner.manager.save(CardCell, cells);

      // 7. Mark invite as used
      invite.cardId = savedCard.id;
      invite.usedAt = new Date();
      await queryRunner.manager.save(CardInvite, invite);

      await queryRunner.commitTransaction();

      // Load card with cells for response
      const cardWithCells = await this.cardRepo.findOne({
        where: { id: savedCard.id },
        relations: ["cells"],
      });

      if (!cardWithCells) {
        throw new Error(
          `Card with id ${savedCard.id} not found after creation`,
        );
      }

      return cardWithCells;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Generates 5x5 bingo grid with numbers 1-75
   * B column (col 0): 1-15
   * I column (col 1): 16-30
   * N column (col 2): 31-45
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
      const numbers = this.getRandomNumbers(min, max, 5);

      for (let row = 0; row < 5; row++) {
        const cell = new CardCell();
        cell.cardId = cardId;
        cell.row = row;
        cell.col = col;
        cell.number = numbers[row];
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
