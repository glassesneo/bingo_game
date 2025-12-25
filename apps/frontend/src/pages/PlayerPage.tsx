import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BingoCard } from "../components/game/BingoCard";
import { DrawnHistory } from "../components/game/DrawnHistory";
import { NumberBall } from "../components/game/NumberBall";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type {
  Card,
  DrawnNumber,
  GameState,
  GameStatus,
  Reach,
  StoredSession,
  Winner,
} from "../types";
import { checkReach, checkWin } from "../utils/bingo";

export function PlayerPage() {
  const { gameId: gameIdParam } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const gameId = gameIdParam ? Number.parseInt(gameIdParam, 10) : null;

  const [session, , clearSession] = useLocalStorage<StoredSession | null>(
    "bingo_session",
    null,
  );

  // Game state
  const [card, setCard] = useState<Card | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [reaches, setReaches] = useState<Reach[]>([]);
  const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimedWin, setHasClaimedWin] = useState(false);
  const [isNotifyingReach, setIsNotifyingReach] = useState(false);
  const [hasNotifiedReach, setHasNotifiedReach] = useState(false);

  // Check if player has won
  const winResult = useMemo(() => {
    if (!card) return { hasWon: false, winningPattern: null };
    const numbers = drawnNumbers.map((d) => d.number);
    return checkWin(card.cells, numbers);
  }, [card, drawnNumbers]);

  // Check if player has reach (one away from winning)
  const reachResult = useMemo(() => {
    if (!card) return { hasReach: false, reachPattern: null };
    const numbers = drawnNumbers.map((d) => d.number);
    return checkReach(card.cells, numbers);
  }, [card, drawnNumbers]);

  // Check if current player is a winner
  const isWinner = useMemo(() => {
    if (!session) return false;
    return winners.some((w) => w.userId === session.userId);
  }, [winners, session]);

  // Check if current player has notified reach
  const hasReached = useMemo(() => {
    if (!session) return false;
    return reaches.some((r) => r.userId === session.userId);
  }, [reaches, session]);

  // Handle leaving the game (clear session and close window)
  const handleLeaveGame = useCallback(() => {
    clearSession();
    // Try to close the window (works if opened via window.open)
    window.close();
    // If window didn't close (opened by user), redirect to blank page after a delay
    setTimeout(() => {
      window.location.href = "about:blank";
    }, 100);
  }, [clearSession]);

  // Handle claiming bingo
  const handleClaimBingo = useCallback(async () => {
    if (!gameId || isClaiming || hasClaimedWin) return;

    setIsClaiming(true);
    try {
      await api.claimBingo(gameId);
      setHasClaimedWin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim bingo");
    } finally {
      setIsClaiming(false);
    }
  }, [gameId, isClaiming, hasClaimedWin]);

  // Handle notifying reach
  const handleNotifyReach = useCallback(async () => {
    if (!gameId || isNotifyingReach || hasNotifiedReach) return;

    setIsNotifyingReach(true);
    try {
      await api.notifyReach(gameId);
      setHasNotifiedReach(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to notify reach");
    } finally {
      setIsNotifyingReach(false);
    }
  }, [gameId, isNotifyingReach, hasNotifiedReach]);

  // Validate session and redirect if needed
  useEffect(() => {
    if (!session) {
      navigate("/", { replace: true });
      return;
    }

    if (gameId && session.gameId !== gameId) {
      // Session is for different game
      clearSession();
      navigate("/", { replace: true });
    }
  }, [session, gameId, navigate, clearSession]);

  // Fetch card and connect to WebSocket
  useEffect(() => {
    if (!session || !gameId) return;

    let mounted = true;

    const initialize = async () => {
      try {
        // Fetch card - this will fail if game is ended or session is invalid
        const card = await api.getMyCard();
        if (mounted) {
          setCard(card);
        }

        // Fetch game state to check if game is already ended
        const gameState = await api.getGame(gameId);
        if (mounted) {
          if (gameState.game.status === "ended") {
            // Game already ended, show ended state
            setGameStatus("ended");
            setDrawnNumbers(gameState.drawnNumbers);
            setWinners(gameState.winners);
            setIsLoading(false);
            return; // Don't connect to WebSocket for ended games
          }
        }

        // Connect to WebSocket
        socketService.connect();

        // Set up event handlers
        socketService.onGameState((data: GameState) => {
          if (mounted) {
            setGameStatus(data.game.status);
            setDrawnNumbers(data.drawnNumbers);
            setWinners(data.winners);
            setIsLoading(false);
          }
        });

        socketService.onGameStarted(() => {
          if (mounted) {
            setGameStatus("running");
          }
        });

        socketService.onNumberDrawn((data) => {
          if (mounted) {
            setDrawnNumbers((prev) => [...prev, data.draw]);
            setLastDrawnNumber(data.draw.number);
            // Clear the "new" indicator after animation
            setTimeout(() => setLastDrawnNumber(null), 500);
          }
        });

        socketService.onBingoClaimed((data) => {
          if (mounted) {
            setWinners((prev) => [...prev, data.winner]);
          }
        });

        socketService.onReachNotified((data) => {
          if (mounted) {
            setReaches((prev) => [...prev, data.reach]);
          }
        });

        socketService.onGameEnded(() => {
          if (mounted) {
            setGameStatus("ended");
          }
        });

        // Join the game room
        socketService.joinGame(gameId, session.token);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load game");
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      socketService.offGameState();
      socketService.offGameStarted();
      socketService.offNumberDrawn();
      socketService.offBingoClaimed();
      socketService.offReachNotified();
      socketService.offGameEnded();
      if (gameId) {
        socketService.leaveGame(gameId);
      }
    };
  }, [session, gameId]);

  if (!session) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
          <button
            onClick={() => navigate("/")}
            className="btn btn-sm"
            type="button"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const latestDraw =
    drawnNumbers.length > 0
      ? drawnNumbers.reduce((a, b) => (a.drawOrder > b.drawOrder ? a : b))
      : null;

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">BINGO</h1>
          <p className="text-sm text-base-content/60">
            Playing as {session.displayName}
          </p>
        </div>

        {/* Game Status */}
        <div className="flex justify-center">
          {gameStatus === "waiting" && (
            <div className="badge badge-warning badge-lg pulse-waiting">
              Waiting for host to start...
            </div>
          )}
          {gameStatus === "running" && (
            <div className="badge badge-success badge-lg">Game in progress</div>
          )}
          {gameStatus === "ended" && (
            <div className="badge badge-neutral badge-lg">Game ended</div>
          )}
        </div>

        {/* Leave Game Button - always shown */}
        <div className="flex justify-center">
          <button
            onClick={handleLeaveGame}
            className="btn btn-outline btn-sm"
            type="button"
          >
            Leave Game
          </button>
        </div>

        {/* Current Number Display */}
        {latestDraw && gameStatus === "running" && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-base-content/60">Current Number</span>
            <NumberBall
              number={latestDraw.number}
              size="lg"
              isNew={latestDraw.number === lastDrawnNumber}
            />
          </div>
        )}

        {/* Winner announcement */}
        {isWinner && (
          <div className="alert alert-success winner-announcement">
            <span className="text-lg font-bold">YOU WON!</span>
          </div>
        )}

        {/* Bingo Card */}
        {card && (
          <BingoCard
            cells={card.cells}
            drawnNumbers={drawnNumbers.map((d) => d.number)}
            winningPattern={winResult.winningPattern}
            lastDrawnNumber={lastDrawnNumber}
          />
        )}

        {/* Reach Button */}
        {gameStatus === "running" &&
          !isWinner &&
          !hasReached &&
          !hasNotifiedReach && (
            <button
              onClick={handleNotifyReach}
              disabled={
                !reachResult.hasReach ||
                isNotifyingReach ||
                hasNotifiedReach ||
                winResult.hasWon
              }
              className={`btn btn-md w-full ${
                reachResult.hasReach && !winResult.hasWon
                  ? "btn-warning"
                  : "btn-disabled"
              }`}
              type="button"
            >
              {isNotifyingReach ? (
                <>
                  <span className="loading loading-spinner" />
                  Notifying...
                </>
              ) : reachResult.hasReach && !winResult.hasWon ? (
                "REACH!"
              ) : (
                "REACH"
              )}
            </button>
          )}

        {/* Bingo Button */}
        {gameStatus === "running" && !isWinner && (
          <button
            onClick={handleClaimBingo}
            disabled={!winResult.hasWon || isClaiming || hasClaimedWin}
            className={`btn btn-lg w-full ${
              winResult.hasWon ? "btn-success animate-pulse" : "btn-disabled"
            }`}
            type="button"
          >
            {isClaiming ? (
              <>
                <span className="loading loading-spinner" />
                Claiming...
              </>
            ) : winResult.hasWon ? (
              "BINGO!"
            ) : (
              "BINGO"
            )}
          </button>
        )}

        {/* Reach Notifications */}
        {reaches.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h3 className="font-bold text-center">Reach Notified</h3>
              <ul className="space-y-1">
                {reaches.map((reach) => (
                  <li
                    key={`${reach.userId}-${reach.reachedAt}`}
                    className={`text-center ${
                      reach.userId === session.userId
                        ? "text-warning font-bold"
                        : ""
                    }`}
                  >
                    {reach.displayName}
                    {reach.userId === session.userId && " (You)"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Winners List */}
        {winners.length > 0 && (
          <div className="card bg-base-200">
            <div className="card-body p-4">
              <h3 className="font-bold text-center">Winners</h3>
              <ul className="space-y-1">
                {winners.map((winner) => (
                  <li
                    key={`${winner.userId}-${winner.claimedAt}`}
                    className={`text-center ${
                      winner.userId === session.userId
                        ? "text-success font-bold"
                        : ""
                    }`}
                  >
                    {winner.displayName}
                    {winner.userId === session.userId && " (You)"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Drawn Numbers History */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <DrawnHistory drawnNumbers={drawnNumbers} maxDisplay={15} />
          </div>
        </div>
      </div>
    </div>
  );
}
