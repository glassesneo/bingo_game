import "reflect-metadata";
import { DataSource } from "typeorm";
import { Card } from "../entities/card.entity";
import { CardCell } from "../entities/card-cell.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { Game } from "../entities/game.entity";
import { GameDraw } from "../entities/game-draw.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { Server } from "../entities/server.entity";
import { User } from "../entities/user.entity";

export default new DataSource({
  type: "better-sqlite3",
  database: process.env.DATABASE_PATH ?? "dev.db",
  entities: [
    Server,
    Game,
    User,
    GameParticipant,
    GameDraw,
    Card,
    CardCell,
    CardInvite,
  ],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
