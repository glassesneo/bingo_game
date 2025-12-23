/**
 * JWT payload structure for player authentication.
 * Embedded in JWT token during claimInvite.
 */
export interface JwtPayload {
  /** User ID (subject) */
  sub: number;
  /** Game ID the player is participating in */
  gameId: number;
  /** Card ID assigned to the player */
  cardId: number;
  /** Player's display name */
  displayName: string;
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
}

/**
 * Decoded JWT payload attached to request by JwtAuthGuard
 */
export interface AuthenticatedUser {
  userId: number;
  gameId: number;
  cardId: number;
  displayName: string;
}
