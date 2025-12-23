import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  },
})
export class GamesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GamesGateway.name);

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
   * Client joins a game room to receive real-time updates
   */
  @SubscribeMessage("game:join")
  handleJoinGame(
    @MessageBody() data: { gameId: number; userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `game:${data.gameId}`;
    client.join(roomName);
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
