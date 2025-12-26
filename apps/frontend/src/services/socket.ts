import { io, type Socket } from "socket.io-client";
import type {
  BingoClaimedPayload,
  GameEndedPayload,
  GameJoinedPayload,
  GameStartedPayload,
  GameState,
  NumberDrawnPayload,
  ReachNotifiedPayload,
  RouletteClaimedPayload,
  RouletteResultPayload,
  RouletteSpinningPayload,
  RouletteSpinRequestPayload,
} from "../types";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

class SocketService {
  private socket: Socket | null = null;
  private maxReconnectAttempts = 5;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io(WS_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    return this.socket;
  }

  joinGame(gameId: number, playerToken: string): void {
    this.socket?.emit("game:join", { gameId, playerToken });
  }

  joinGameAsHost(gameId: number, hostToken: string): void {
    this.socket?.emit("game:join-host", { gameId, hostToken });
  }

  leaveGame(gameId: number): void {
    this.socket?.emit("game:leave", { gameId });
  }

  // Event listeners
  onGameJoined(callback: (data: GameJoinedPayload) => void): void {
    this.socket?.on("game:joined", callback);
  }

  onGameState(callback: (data: GameState) => void): void {
    this.socket?.on("game:state", callback);
  }

  onGameStarted(callback: (data: GameStartedPayload) => void): void {
    this.socket?.on("game:started", callback);
  }

  onNumberDrawn(callback: (data: NumberDrawnPayload) => void): void {
    this.socket?.on("number:drawn", callback);
  }

  onBingoClaimed(callback: (data: BingoClaimedPayload) => void): void {
    this.socket?.on("bingo:claimed", callback);
  }

  onReachNotified(callback: (data: ReachNotifiedPayload) => void): void {
    this.socket?.on("reach:notified", callback);
  }

  onGameEnded(callback: (data: GameEndedPayload) => void): void {
    this.socket?.on("game:ended", callback);
  }

  onPlayerJoined(
    callback: (data: { displayName: string; participantCount: number }) => void,
  ): void {
    this.socket?.on("player:joined", callback);
  }

  // Remove specific listeners
  offGameJoined(): void {
    this.socket?.off("game:joined");
  }

  offGameState(): void {
    this.socket?.off("game:state");
  }

  offGameStarted(): void {
    this.socket?.off("game:started");
  }

  offNumberDrawn(): void {
    this.socket?.off("number:drawn");
  }

  offBingoClaimed(): void {
    this.socket?.off("bingo:claimed");
  }

  offReachNotified(): void {
    this.socket?.off("reach:notified");
  }

  offGameEnded(): void {
    this.socket?.off("game:ended");
  }

  offPlayerJoined(): void {
    this.socket?.off("player:joined");
  }

  // Roulette events
  onRouletteClaimed(callback: (data: RouletteClaimedPayload) => void): void {
    this.socket?.on("roulette:claimed", callback);
  }

  offRouletteClaimed(): void {
    this.socket?.off("roulette:claimed");
  }

  // New roulette spin flow events
  // Player requests to spin the roulette
  requestRouletteSpin(gameId: number): void {
    this.socket?.emit("roulette:request-spin", { gameId });
  }

  // Host sends result after roulette animation completes
  sendRouletteResult(gameId: number, userId: number, award: number): void {
    this.socket?.emit("roulette:result", { gameId, userId, award });
  }

  // Listen for spin request (host receives this)
  onRouletteSpinRequest(
    callback: (data: RouletteSpinRequestPayload) => void,
  ): void {
    this.socket?.on("roulette:spin-request", callback);
  }

  offRouletteSpinRequest(): void {
    this.socket?.off("roulette:spin-request");
  }

  // Listen for spinning started (player receives this to show "spinning...")
  onRouletteSpinning(callback: (data: RouletteSpinningPayload) => void): void {
    this.socket?.on("roulette:spinning", callback);
  }

  offRouletteSpinning(): void {
    this.socket?.off("roulette:spinning");
  }

  // Listen for result (player receives final award)
  onRouletteResult(callback: (data: RouletteResultPayload) => void): void {
    this.socket?.on("roulette:result", callback);
  }

  offRouletteResult(): void {
    this.socket?.off("roulette:result");
  }

  // Cleanup
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

// Singleton instance
export const socketService = new SocketService();
