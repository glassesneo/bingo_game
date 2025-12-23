import { Body, Controller, Post } from "@nestjs/common";
import { CreateServerDto } from "./dto/create-server.dto";
import { ServerResponseDto } from "./dto/server-response.dto";
import { ServersService } from "./servers.service";

@Controller("servers")
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Post()
  async create(@Body() dto: CreateServerDto): Promise<ServerResponseDto> {
    const server = await this.serversService.createServer(dto);
    return {
      id: server.id,
      name: server.name,
      createdAt: server.createdAt,
    };
  }
}
