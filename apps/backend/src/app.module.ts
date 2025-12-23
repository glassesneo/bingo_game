import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApiModule } from "./api/api.module";
import { CardsModule } from "./cards/cards.module";
import { DbModule } from "./db/db.module";
import { GamesModule } from "./games/games.module";
import { ServersModule } from "./servers/servers.module";
import { UsersModule } from "./users/users.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			envFilePath: [".env"],
		}),

		TypeOrmModule.forRootAsync({
			inject: [ConfigService],
			useFactory: (config: ConfigService) => ({
				type: "sqlite",
				database: config.get<string>("DATABASE_PATH") ?? "dev.db",
				autoLoadEntities: true,
				synchronize: false,
				logging: config.get<string>("DB_LOGGING") === "true",
			}),
		}),

		DbModule,

		ServersModule,

		GamesModule,

		UsersModule,

		CardsModule,

		ApiModule,
	],
})
export class AppModule {}
