import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Server } from "../entities/server.entity";
import { CreateServerDto } from "./dto/create-server.dto";

@Injectable()
export class ServersService {
  constructor(
    @InjectRepository(Server)
    private readonly serverRepo: Repository<Server>,
  ) {}

  async createServer(dto: CreateServerDto): Promise<Server> {
    const server = this.serverRepo.create({
      name: dto.name,
    });
    return await this.serverRepo.save(server);
  }
}
