import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DbModule } from "src/db/db.module";
import { Server } from "../entities/server.entity";
import { ServersController } from "./servers.controller";
import { ServersService } from "./servers.service";

@Module({
  imports: [DbModule, TypeOrmModule.forFeature([Server])],
  controllers: [ServersController],
  providers: [ServersService],
})
export class ServersModule {}
