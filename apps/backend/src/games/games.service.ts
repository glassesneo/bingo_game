import { randomBytes } from "node:crypto";
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CardInvite } from "../entities/card-invite.entity";
import { Game } from "../entities/game.entity";
import { Server } from "../entities/server.entity";

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
    @InjectRepository(CardInvite)
    private readonly inviteRepo: Repository<CardInvite>,
  ) {}

  async createGame(serverId: number): Promise<Game> {
    // Verify server exists
    const server = await this.serverRepo.findOne({ where: { id: serverId } });
    if (!server) {
      throw new NotFoundException(`Server with id ${serverId} not found`);
    }

    const game = this.gameRepo.create({
      serverId,
      status: "waiting", // initial state
      startedAt: null,
      endedAt: null,
    });

    return await this.gameRepo.save(game);
  }

  async createInvite(
    gameId: number,
    expiresInHours: number = 24,
  ): Promise<CardInvite> {
    // Verify game exists
    const game = await this.gameRepo.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException(`Game with id ${gameId} not found`);
    }

    // Generate secure random token
    const token = randomBytes(16).toString("hex"); // 32 char hex string

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    const invite = this.inviteRepo.create({
      gameId,
      token,
      expiresAt,
      cardId: null,
      usedAt: null,
    });

    return await this.inviteRepo.save(invite);
  }
}
