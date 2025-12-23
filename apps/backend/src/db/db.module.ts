import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Card } from "../entities/card.entity";
import { CardCell } from "../entities/card-cell.entity";
import { CardInvite } from "../entities/card-invite.entity";
import { Game } from "../entities/game.entity";
import { GameDraw } from "../entities/game-draw.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { Server } from "../entities/server.entity";
import { User } from "../entities/user.entity";

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env"] }),

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

		TypeOrmModule.forFeature([
			Server,
			Game,
			User,
			GameParticipant,
			GameDraw,
			Card,
			CardCell,
			CardInvite,
		]),
	],
	exports: [TypeOrmModule],
})
export class DbModule {}
