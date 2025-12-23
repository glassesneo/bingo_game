import { Module } from "@nestjs/common";
import { DbModule } from "src/db/db.module";
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Module({
	imports: [DbModule],
	controllers: [ServersController],
	providers: [ServersService],
})
export class ServersModule {}
