import { Logger, UsePipes, ValidationPipe } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Repository } from "typeorm";
import { GameParticipant } from "../entities/game-participant.entity";
import { JoinGameDto } from "./dto/join-game.dto";

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  },
})
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class GamesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GamesGateway.name);

  constructor(
    @InjectRepository(GameParticipant)
    private readonly participantRepo: Repository<GameParticipant>,
  ) {}

  afterInit(_server: Server) {
    this.logger.log("WebSocket Gateway initialized");
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins a game room to receive real-time updates.
   * Validates that the user is a participant in the game before allowing join.
   */
  @SubscribeMessage("game:join")
  async handleJoinGame(
    @MessageBody() data: JoinGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    // Verify user is a participant in the game
    const participant = await this.participantRepo.findOne({
      where: {
        gameId: data.gameId,
        userId: data.userId,
      },
    });

    if (!participant) {
      this.logger.warn(
        `Client ${client.id} attempted to join game ${data.gameId} as user ${data.userId} but is not a participant`,
      );
      throw new WsException("User is not a participant in this game");
    }

    const roomName = `game:${data.gameId}`;
    client.join(roomName);

    // Store user info on the socket for later use
    client.data.userId = data.userId;
    client.data.gameId = data.gameId;

    this.logger.log(
      `Client ${client.id} joined game ${data.gameId} (user ${data.userId})`,
    );

    // Acknowledge join
    client.emit("game:joined", {
      gameId: data.gameId,
      userId: data.userId,
    });
  }

  /**
   * Client leaves a game room
   */
  @SubscribeMessage("game:leave")
  handleLeaveGame(
    @MessageBody() data: { gameId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `game:${data.gameId}`;
    client.leave(roomName);

    // Clear socket data
    client.data.userId = undefined;
    client.data.gameId = undefined;

    this.logger.log(`Client ${client.id} left game ${data.gameId}`);
  }

  /**
   * Broadcast event to all clients in a game room
   * (Internal method for use by services)
   */
  broadcastToGame(gameId: number, event: string, data: unknown) {
    const roomName = `game:${gameId}`;
    this.server.to(roomName).emit(event, data);
    this.logger.log(`Broadcast ${event} to game ${gameId}`);
  }
}
