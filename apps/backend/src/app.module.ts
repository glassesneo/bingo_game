import { Module } from "@nestjs/common";
import { ApiModule } from "./api/api.module";
import { CardsModule } from "./cards/cards.module";
import { DbModule } from "./db/db.module";
import { GamesModule } from "./games/games.module";
import { ServersModule } from "./servers/servers.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    DbModule,
    ServersModule,
    GamesModule,
    UsersModule,
    CardsModule,
    ApiModule,
  ],
})
export class AppModule {}
