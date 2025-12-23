import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DrawnHistory } from "../components/game/DrawnHistory";
import { NumberBall } from "../components/game/NumberBall";
import { QRCodeDisplay } from "../components/game/QRCodeDisplay";
import { api } from "../services/api";
import { socketService } from "../services/socket";
import type {
  DrawnNumber,
  GameState,
  GameStatus,
  HostView,
  Winner,
} from "../types";

export function HostPage() {
  const { hostToken } = useParams<{ hostToken: string }>();
  const navigate = useNavigate();

  // Game state
  const [gameId, setGameId] = useState<number | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("waiting");
  const [drawnNumbers, setDrawnNumbers] = useState<DrawnNumber[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [newWinner, setNewWinner] = useState<Winner | null>(null);

  // Generate join URL
  const joinUrl = inviteToken
    ? `${window.location.origin}/join/${inviteToken}`
    : null;

  // Start game
  const handleStartGame = useCallback(async () => {
    if (!gameId || !hostToken || isStarting) return;

    setIsStarting(true);
    setError(null);

    try {
      await api.startGame(gameId, hostToken);
      setGameStatus("running");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    } finally {
      setIsStarting(false);
    }
  }, [gameId, hostToken, isStarting]);

  // Draw number
  const handleDrawNumber = useCallback(async () => {
    if (!gameId || !hostToken || isDrawing) return;

    setIsDrawing(true);
    setError(null);

    try {
      const response = await api.drawNumber(gameId, hostToken);
      setDrawnNumbers((prev) => [...prev, response.draw]);
      setLastDrawnNumber(response.draw.number);
      // Clear the "new" indicator after animation
      setTimeout(() => setLastDrawnNumber(null), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to draw number");
    } finally {
      setIsDrawing(false);
    }
  }, [gameId, hostToken, isDrawing]);

  // End game
  const handleEndGame = useCallback(async () => {
    if (!gameId || !hostToken || isEnding) return;

    setIsEnding(true);
    setError(null);

    try {
      await api.endGame(gameId, hostToken);
      setGameStatus("ended");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end game");
    } finally {
      setIsEnding(false);
    }
  }, [gameId, hostToken, isEnding]);

  // Fetch initial host view and set up WebSocket
  useEffect(() => {
    if (!hostToken) {
      navigate("/", { replace: true });
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        const hostView: HostView = await api.getHostView(hostToken);

        if (mounted) {
          setGameId(hostView.gameId);
          setInviteToken(hostView.inviteToken);
          setGameStatus(hostView.game.status);
          setDrawnNumbers(hostView.drawnNumbers);
          setWinners(hostView.winners);
          setParticipantCount(hostView.participantCount);
          setIsLoading(false);
        }

        // Connect to WebSocket for live updates
        socketService.connect();

        socketService.onGameState((data: GameState) => {
          if (mounted) {
            setGameStatus(data.game.status);
            setDrawnNumbers(data.drawnNumbers);
            setWinners(data.winners);
            setParticipantCount(data.participantCount);
          }
        });

        socketService.onBingoClaimed((data) => {
          if (mounted) {
            setWinners((prev) => [...prev, data.winner]);
            setNewWinner(data.winner);
            // Clear new winner animation after a bit
            setTimeout(() => setNewWinner(null), 3000);
          }
        });

        socketService.onGameEnded(() => {
          if (mounted) {
            setGameStatus("ended");
          }
        });

        // Join room as observer (without playerToken)
        // Note: Host uses hostToken for API calls, but joins WS room for live updates
        // We need the gameId from hostView
        if (hostView.gameId) {
          // Host can join room without player token for observation
          // The gateway should allow this for hosts (future enhancement)
          // For now, host relies on polling/API responses
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load game data",
          );
          setIsLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      socketService.offGameState();
      socketService.offBingoClaimed();
      socketService.offGameEnded();
    };
  }, [hostToken, navigate]);

  if (!hostToken) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error && !gameId) {
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

  const remainingNumbers = 75 - drawnNumbers.length;

  return (
    <div className="min-h-screen bg-base-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-primary">BINGO</h1>
          <p className="text-sm text-base-content/60">Host View</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="btn btn-sm btn-ghost"
              type="button"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - QR Code & Join Info */}
          <div className="space-y-6">
            {/* QR Code */}
            {joinUrl && gameStatus !== "ended" && (
              <div className="card bg-base-200">
                <div className="card-body items-center">
                  <h2 className="card-title">Invite Players</h2>
                  <QRCodeDisplay url={joinUrl} size={180} />
                </div>
              </div>
            )}

            {/* Game Stats */}
            <div className="stats stats-vertical lg:stats-horizontal shadow w-full">
              <div className="stat">
                <div className="stat-title">Players</div>
                <div className="stat-value text-primary">
                  {participantCount}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Drawn</div>
                <div className="stat-value">{drawnNumbers.length}</div>
                <div className="stat-desc">{remainingNumbers} remaining</div>
              </div>
              <div className="stat">
                <div className="stat-title">Winners</div>
                <div className="stat-value text-success">{winners.length}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Game Controls & Numbers */}
          <div className="space-y-6">
            {/* Game Status Badge */}
            <div className="flex justify-center">
              {gameStatus === "waiting" && (
                <div className="badge badge-warning badge-lg">
                  Waiting to start
                </div>
              )}
              {gameStatus === "running" && (
                <div className="badge badge-success badge-lg">Game running</div>
              )}
              {gameStatus === "ended" && (
                <div className="badge badge-neutral badge-lg">Game ended</div>
              )}
            </div>

            {/* Game Controls */}
            <div className="flex flex-col gap-3">
              {gameStatus === "waiting" && (
                <button
                  onClick={handleStartGame}
                  disabled={isStarting || participantCount === 0}
                  className="btn btn-primary btn-lg"
                  type="button"
                >
                  {isStarting ? (
                    <>
                      <span className="loading loading-spinner" />
                      Starting...
                    </>
                  ) : (
                    "Start Game"
                  )}
                </button>
              )}

              {gameStatus === "running" && (
                <>
                  <button
                    onClick={handleDrawNumber}
                    disabled={isDrawing || remainingNumbers === 0}
                    className="btn btn-primary btn-lg"
                    type="button"
                  >
                    {isDrawing ? (
                      <>
                        <span className="loading loading-spinner" />
                        Drawing...
                      </>
                    ) : remainingNumbers === 0 ? (
                      "All Numbers Drawn"
                    ) : (
                      "Draw Number"
                    )}
                  </button>
                  <button
                    onClick={handleEndGame}
                    disabled={isEnding}
                    className="btn btn-outline btn-error"
                    type="button"
                  >
                    {isEnding ? (
                      <>
                        <span className="loading loading-spinner" />
                        Ending...
                      </>
                    ) : (
                      "End Game"
                    )}
                  </button>
                </>
              )}

              {gameStatus === "ended" && (
                <button
                  onClick={() => navigate("/")}
                  className="btn btn-primary btn-lg"
                  type="button"
                >
                  Create New Game
                </button>
              )}
            </div>

            {/* Current Number Display */}
            {latestDraw && gameStatus !== "waiting" && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm text-base-content/60">Last Drawn</span>
                <NumberBall
                  number={latestDraw.number}
                  size="lg"
                  isNew={latestDraw.number === lastDrawnNumber}
                />
              </div>
            )}

            {/* New Winner Announcement */}
            {newWinner && (
              <div className="alert alert-success winner-announcement">
                <span className="text-lg font-bold">
                  {newWinner.displayName} got BINGO!
                </span>
              </div>
            )}

            {/* Winners List */}
            {winners.length > 0 && (
              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h3 className="font-bold text-center text-success">
                    Winners
                  </h3>
                  <ul className="space-y-1">
                    {winners.map((winner, index) => (
                      <li
                        key={`${winner.userId}-${winner.claimedAt}`}
                        className="text-center"
                      >
                        {index + 1}. {winner.displayName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Drawn Numbers History */}
            <div className="card bg-base-200">
              <div className="card-body p-4">
                <DrawnHistory drawnNumbers={drawnNumbers} maxDisplay={20} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
