import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Request } from "express";
import { Repository } from "typeorm";
import { Game } from "../entities/game.entity";

/**
 * Guard that validates X-Host-Token header for host-only endpoints.
 * Validates that the token matches the game's hostToken.
 */
@Injectable()
export class HostTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const hostToken = request.headers["x-host-token"] as string | undefined;
    const gameId = request.params.gameId;

    if (!hostToken) {
      throw new UnauthorizedException("Missing X-Host-Token header");
    }

    if (!gameId) {
      throw new UnauthorizedException("Missing gameId parameter");
    }

    const game = await this.gameRepo.findOne({
      where: { id: Number(gameId) },
    });

    if (!game) {
      throw new UnauthorizedException("Game not found");
    }

    if (game.hostToken !== hostToken) {
      throw new UnauthorizedException("Invalid host token");
    }

    // Attach game to request for use in controller
    (request as Request & { game: Game }).game = game;

    return true;
  }
}
