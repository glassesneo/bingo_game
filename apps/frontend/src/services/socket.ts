import { io, type Socket } from "socket.io-client";
import type {
  BingoClaimedPayload,
  GameEndedPayload,
  GameJoinedPayload,
  GameStartedPayload,
  GameState,
  NumberDrawnPayload,
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

  onGameEnded(callback: (data: GameEndedPayload) => void): void {
    this.socket?.on("game:ended", callback);
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

  offGameEnded(): void {
    this.socket?.off("game:ended");
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
