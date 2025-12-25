import type {
  Card,
  ClaimBingoResponse,
  ClaimInviteResponse,
  CreateGameResponse,
  DrawNumberResponse,
  EndGameResponse,
  GameState,
  HostView,
  NotifyReachResponse,
  ServerResponse,
  StartGameResponse,
} from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Helper to get stored session token from localStorage
const getToken = (): string | null => {
  const session = localStorage.getItem("bingo_session");
  return session ? JSON.parse(session).token : null;
};

// Generic request helper with error handling
async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    hostToken?: string;
    useAuth?: boolean;
  },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options?.hostToken) {
    headers["X-Host-Token"] = options.hostToken;
  }

  if (options?.useAuth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Server & Game creation
  createServer: (name: string) =>
    request<ServerResponse>("POST", "/servers", { body: { name } }),

  createGame: (serverId: number) =>
    request<CreateGameResponse>("POST", `/servers/${serverId}/games`),

  // Game state (public)
  getGame: (gameId: number) => request<GameState>("GET", `/games/${gameId}`),

  // Host actions
  getHostView: (hostToken: string) =>
    request<HostView>("GET", `/games/host/${hostToken}`),

  startGame: (gameId: number, hostToken: string) =>
    request<StartGameResponse>("POST", `/games/${gameId}/start`, { hostToken }),

  drawNumber: (gameId: number, hostToken: string) =>
    request<DrawNumberResponse>("POST", `/games/${gameId}/draw`, { hostToken }),

  endGame: (gameId: number, hostToken: string) =>
    request<EndGameResponse>("POST", `/games/${gameId}/end`, { hostToken }),

  // Player actions
  claimInvite: (token: string, displayName: string) =>
    request<ClaimInviteResponse>("POST", `/invites/${token}/claim`, {
      body: { displayName },
    }),

  getMyCard: () => request<Card>("GET", "/cards/me", { useAuth: true }),

  claimBingo: (gameId: number) =>
    request<ClaimBingoResponse>("POST", `/games/${gameId}/bingo`, {
      useAuth: true,
    }),

  notifyReach: (gameId: number) =>
    request<NotifyReachResponse>("POST", `/games/${gameId}/reach`, {
      useAuth: true,
    }),
};
