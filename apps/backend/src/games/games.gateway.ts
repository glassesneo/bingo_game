import {
  forwardRef,
  Inject,
  Logger,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
import { JwtPayload } from "../auth/jwt-payload.interface";
import { Game } from "../entities/game.entity";
import { GameParticipant } from "../entities/game-participant.entity";
import { JoinGameDto } from "./dto/join-game.dto";
import { GamesService } from "./games.service";

@WebSocketGateway({
  cors: {
    origin: (process.env.FRONTEND_URL ?? "http://localhost:5173").split(","),
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
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => GamesService))
    private readonly gamesService: GamesService,
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
   * Validates JWT token and user participation before allowing join.
   * Emits game:state after successful join for state synchronization.
   */
  @SubscribeMessage("game:join")
  async handleJoinGame(
    @MessageBody() data: JoinGameDto,
    @ConnectedSocket() client: Socket,
  ) {
    // 1. Validate JWT token
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(data.playerToken);
    } catch {
      this.logger.warn(
        `Client ${client.id} attempted to join game ${data.gameId} with invalid token`,
      );
      throw new WsException("Invalid or expired token");
    }

    // 2. Verify token's gameId matches requested gameId
    if (payload.gameId !== data.gameId) {
      this.logger.warn(
        `Client ${client.id} token gameId ${payload.gameId} does not match requested gameId ${data.gameId}`,
      );
      throw new WsException("Token does not match requested game");
    }

    // 3. Verify user is a participant in the game
    const participant = await this.participantRepo.findOne({
      where: {
        gameId: data.gameId,
        userId: payload.sub,
      },
    });

    if (!participant) {
      this.logger.warn(
        `Client ${client.id} attempted to join game ${data.gameId} as user ${payload.sub} but is not a participant`,
      );
      throw new WsException("User is not a participant in this game");
    }

    const roomName = `game:${data.gameId}`;
    client.join(roomName);

    // Store user info on the socket for later use
    client.data.userId = payload.sub;
    client.data.gameId = data.gameId;
    client.data.cardId = payload.cardId;
    client.data.displayName = payload.displayName;

    this.logger.log(
      `Client ${client.id} joined game ${data.gameId} (user ${payload.sub})`,
    );

    // 4. Acknowledge join
    client.emit("game:joined", {
      gameId: data.gameId,
      userId: payload.sub,
    });

    // 5. Send current game state for synchronization
    try {
      const state = await this.gamesService.getGameState(data.gameId);
      client.emit("game:state", {
        game: {
          id: state.game.id,
          serverId: state.game.serverId,
          status: state.game.status,
          startedAt: state.game.startedAt?.toISOString() ?? null,
          endedAt: state.game.endedAt?.toISOString() ?? null,
          awardMin: state.game.awardMin,
          awardMax: state.game.awardMax,
        },
        participantCount: state.participantCount,
        drawnNumbers: state.drawnNumbers.map((d) => ({
          number: d.number,
          drawOrder: d.drawOrder,
          drawnAt: d.drawnAt.toISOString(),
        })),
        winners: state.winners.map((w) => ({
          userId: w.userId,
          displayName: w.displayName,
          claimedAt: w.claimedAt.toISOString(),
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send game:state to client ${client.id}:`,
        error,
      );
    }
  }

  /**
   * Host joins a game room to receive real-time updates.
   * Validates hostToken against the game before allowing join.
   */
  @SubscribeMessage("game:join-host")
  async handleJoinGameAsHost(
    @MessageBody() data: { gameId: number; hostToken: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Validate hostToken matches the game
    const game = await this.gameRepo.findOne({
      where: {
        id: data.gameId,
        hostToken: data.hostToken,
      },
    });

    if (!game) {
      this.logger.warn(
        `Client ${client.id} attempted to join game ${data.gameId} as host with invalid token`,
      );
      throw new WsException("Invalid host token for this game");
    }

    const roomName = `game:${data.gameId}`;
    client.join(roomName);

    // Store host info on the socket
    client.data.gameId = data.gameId;
    client.data.isHost = true;

    this.logger.log(`Host ${client.id} joined game ${data.gameId}`);

    // Acknowledge join
    client.emit("game:joined", {
      gameId: data.gameId,
      isHost: true,
    });

    // Send current game state for synchronization
    try {
      const state = await this.gamesService.getGameState(data.gameId);
      client.emit("game:state", {
        game: {
          id: state.game.id,
          serverId: state.game.serverId,
          status: state.game.status,
          startedAt: state.game.startedAt?.toISOString() ?? null,
          endedAt: state.game.endedAt?.toISOString() ?? null,
          awardMin: state.game.awardMin,
          awardMax: state.game.awardMax,
        },
        participantCount: state.participantCount,
        drawnNumbers: state.drawnNumbers.map((d) => ({
          number: d.number,
          drawOrder: d.drawOrder,
          drawnAt: d.drawnAt.toISOString(),
        })),
        winners: state.winners.map((w) => ({
          userId: w.userId,
          displayName: w.displayName,
          claimedAt: w.claimedAt.toISOString(),
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send game:state to host ${client.id}:`,
        error,
      );
    }
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
    client.data.cardId = undefined;
    client.data.displayName = undefined;

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

  /**
   * Player requests to spin the roulette.
   * This broadcasts to the room so the host can show the roulette modal.
   */
  @SubscribeMessage("roulette:request-spin")
  async handleRouletteSpinRequest(
    @MessageBody() data: { gameId: number },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const displayName = client.data.displayName;

    if (!userId || !displayName) {
      throw new WsException("User not authenticated");
    }

    this.logger.log(
      `User ${userId} (${displayName}) requested roulette spin for game ${data.gameId}`,
    );

    // Broadcast to the game room (host will receive this)
    this.broadcastToGame(data.gameId, "roulette:spin-request", {
      gameId: data.gameId,
      userId,
      displayName,
    });

    // Also tell the player that spinning has started
    client.emit("roulette:spinning", {
      gameId: data.gameId,
      userId,
      displayName,
    });
  }

  /**
   * Host sends the roulette result after animation completes.
   * This records the result and broadcasts to all players.
   */
  @SubscribeMessage("roulette:result")
  async handleRouletteResult(
    @MessageBody() data: { gameId: number; userId: number; award: number },
    @ConnectedSocket() client: Socket,
  ) {
    if (!client.data.isHost) {
      throw new WsException("Only host can send roulette results");
    }

    this.logger.log(
      `Host sent roulette result for user ${data.userId} in game ${data.gameId}: award ${data.award}`,
    );

    // Get the winner's display name from service
    const result = await this.gamesService.recordRouletteResult(
      data.gameId,
      data.userId,
      data.award,
    );

    // Broadcast the result to all clients in the room
    this.broadcastToGame(data.gameId, "roulette:result", {
      gameId: data.gameId,
      userId: data.userId,
      displayName: result.displayName,
      award: data.award,
    });
  }
}
