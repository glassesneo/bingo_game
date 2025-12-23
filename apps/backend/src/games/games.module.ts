import { Module } from "@nestjs/common";
import { DbModule } from "src/db/db.module";
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

@Module({
	imports: [DbModule],
	controllers: [GamesController],
	providers: [GamesService],
})
export class GamesModule {}
