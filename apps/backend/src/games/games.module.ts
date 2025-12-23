import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbModule } from "src/db/db.module";
import { Card } from "../entities/card.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { Game } from "../entities/game.entity";
import { GameDraw } from "../entities/game-draw.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { Server } from "../entities/server.entity";
import { User } from "../entities/user.entity";
import { GamesController } from "./games.controller";
import { GamesGateway } from "./games.gateway";
import { GamesService } from "./games.service";

@Module({
  imports: [
    DbModule,
    TypeOrmModule.forFeature([
      Game,
      Server,
      CardInvite,
      GameParticipant,
      GameDraw,
      Card,
      User,
    ]),
  ],
  controllers: [GamesController],
  providers: [GamesService, GamesGateway],
  exports: [GamesGateway, GamesService],
})
export class GamesModule {}
