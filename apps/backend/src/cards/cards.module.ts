import { Module } from "@nestjs/common";
import { DbModule } from "src/db/db.module";
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';

@Module({
	imports: [DbModule],
	controllers: [CardsController],
	providers: [CardsService],
})
export class CardsModule {}
