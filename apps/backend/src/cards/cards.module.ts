import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbModule } from "src/db/db.module";
import { Card } from "../entities/card.entity";
import { CardCell } from "../entities/card-cell.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { User } from "../entities/user.entity";
import { GamesModule } from "../games/games.module";
import { CardsController } from "./cards.controller";
import { CardsService } from "./cards.service";

@Module({
  imports: [
    DbModule,
    GamesModule,
    TypeOrmModule.forFeature([
      Card,
      CardCell,
      CardInvite,
      GameParticipant,
      User,
    ]),
  ],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
