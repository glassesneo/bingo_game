import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

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
	],
})
export class AppModule {}
