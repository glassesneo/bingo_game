import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbModule } from "src/db/db.module";
import { CardInvite } from "../entities/card-invite.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { Game } from "../entities/game.entity";
import { Server } from "../entities/server.entity";
import { GamesController } from "./games.controller";
import { GamesGateway } from "./games.gateway";
import { GamesService } from "./games.service";

@Module({
  imports: [
    DbModule,
    TypeOrmModule.forFeature([Game, Server, CardInvite, GameParticipant]),
  ],
  controllers: [GamesController],
  providers: [GamesService, GamesGateway],
  exports: [GamesGateway],
})
export class GamesModule {}
