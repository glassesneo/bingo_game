// Game status type
export type GameStatus = "waiting" | "running" | "ended";

// Core game summary
export interface GameSummary {
  id: number;
  serverId: number;
  status: GameStatus;
  startedAt: string | null;
  endedAt: string | null;
}

// Drawn number with metadata
export interface DrawnNumber {
  number: number;
  drawOrder: number;
  drawnAt: string;
}

// Individual bingo card cell
export interface CardCell {
  id: number;
  row: number;
  col: number;
  number: number;
}

// Player's bingo card
export interface Card {
  id: number;
  gameId: number;
  userId: number;
  issuedAt: string;
  cells: CardCell[];
}

// Winner information
export interface Winner {
  userId: number;
  displayName: string;
  claimedAt: string;
}

// Reach information
export interface Reach {
  userId: number;
  displayName: string;
  reachedAt: string;
}

// Full game state
export interface GameState {
  game: GameSummary;
  participantCount: number;
  drawnNumbers: DrawnNumber[];
  winners: Winner[];
}

// Host view extends game state with invite token
export interface HostView extends GameState {
  gameId: number;
  inviteToken: string;
}

// Player session from JWT
export interface PlayerSession {
  token: string;
  userId: number;
  displayName: string;
  gameId: number;
  cardId: number;
}

// localStorage schema for session persistence
export interface StoredSession {
  token: string;
  userId: number;
  displayName: string;
  gameId: number;
  cardId: number;
}

// API Response Types
export interface ServerResponse {
  id: number;
  name: string;
  createdAt: string;
}

export interface CreateGameResponse extends GameSummary {
  hostToken: string;
  inviteToken: string;
}

export interface StartGameResponse {
  gameId: number;
  status: GameStatus;
  startedAt: string;
}

export interface DrawNumberResponse {
  gameId: number;
  draw: DrawnNumber;
}

export interface ClaimInviteResponse {
  session: PlayerSession;
  card: Card;
}

export interface InviteInfoResponse {
  gameId: number;
  gameStatus: GameStatus;
}

export interface ClaimBingoResponse {
  success: boolean;
  winner: Winner;
}

export interface NotifyReachResponse {
  success: boolean;
  reach: Reach;
}

export interface EndGameResponse {
  gameId: number;
  status: GameStatus;
  endedAt: string;
}

// WebSocket Event Payloads
export interface GameJoinedPayload {
  gameId: number;
  userId: number;
}

export interface GameStartedPayload {
  gameId: number;
  startedAt: string;
}

export interface NumberDrawnPayload {
  gameId: number;
  draw: DrawnNumber;
}

export interface BingoClaimedPayload {
  gameId: number;
  winner: Winner;
}

export interface ReachNotifiedPayload {
  gameId: number;
  reach: Reach;
}

export interface GameEndedPayload {
  gameId: number;
  endedAt: string;
}
