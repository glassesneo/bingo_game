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
  Reach,
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
  const [reaches, setReaches] = useState<Reach[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [lastDrawnNumber, setLastDrawnNumber] = useState<number | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [newWinner, setNewWinner] = useState<Winner | null>(null);
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(true);
  const [isWinnersOpen, setIsWinnersOpen] = useState(true);
  const [debugMode, setDebugMode] = useState(false);

  // Generate join URL - use PUBLIC_URL for QR code (for LAN access)
  const publicUrl = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  const joinUrl = inviteToken ? `${publicUrl}/join/${inviteToken}` : null;

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
    let joinedGameId: number | null = null;
    let socket: ReturnType<typeof socketService.connect> | null = null;
    let joinHostRoom: (() => void) | null = null;

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
        socket = socketService.connect();

        // Function to join host room - called on connect and reconnect
        joinHostRoom = () => {
          if (hostView.gameId && hostToken) {
            joinedGameId = hostView.gameId;
            socketService.joinGameAsHost(hostView.gameId, hostToken);
          }
        };

        // Join room on initial connect and reconnects
        socket.on("connect", joinHostRoom);
        socket.io.on("reconnect", joinHostRoom);

        // Join immediately if already connected
        if (socket.connected) {
          joinHostRoom();
        }

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

        socketService.onPlayerJoined((data) => {
          if (mounted) {
            setParticipantCount(data.participantCount);
          }
        });
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
      // Clean up socket connect/reconnect listeners
      if (socket && joinHostRoom) {
        socket.off("connect", joinHostRoom);
        socket.io.off("reconnect", joinHostRoom);
      }
      socketService.offGameState();
      socketService.offBingoClaimed();
      socketService.offReachNotified();
      socketService.offGameEnded();
      socketService.offPlayerJoined();
      // Leave the game room when unmounting
      if (joinedGameId) {
        socketService.leaveGame(joinedGameId);
      }
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
      {/* Winner Announcement Overlay */}
      {newWinner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 winner-overlay">
          <div className="bg-success text-success-content p-12 rounded-2xl shadow-2xl winner-announcement">
            <div className="text-6xl font-bold text-center mb-4">
              🎉 BINGO! 🎉
            </div>
            <div className="text-3xl text-center">{newWinner.displayName}</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-w-screen-2xl mx-auto">
        <div className="flex-1" />
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary">BINGO</h1>
          <p className="text-sm text-base-content/60">Host View</p>
        </div>
        <div className="flex-1 flex justify-end">
          {gameStatus === "running" && (
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
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="alert alert-error mb-4 max-w-4xl mx-auto">
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

      {/* WAITING PHASE LAYOUT */}
      {gameStatus === "waiting" && (
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Left Column - QR Code */}
            <div className="space-y-6">
              {joinUrl && (
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
                  <div className="stat-value text-success">
                    {winners.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Controls */}
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="badge badge-warning badge-lg">
                  Waiting to start
                </div>
              </div>

              {/* Debug Mode Toggle */}
              <div className="form-control">
                <label className="label cursor-pointer justify-center gap-2">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="checkbox checkbox-sm"
                  />
                  <span className="label-text">
                    Debug Mode (start with 0 players)
                  </span>
                </label>
              </div>

              <button
                onClick={handleStartGame}
                disabled={isStarting || (!debugMode && participantCount === 0)}
                className="btn btn-primary btn-lg w-full"
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
            </div>
          </div>
        </div>
      )}

      {/* RUNNING PHASE LAYOUT */}
      {gameStatus === "running" && (
        <div className="grid grid-cols-2 gap-4 mx-auto max-w-screen-2xl items-start">
          {/* LEFT SIDE - Current Number + Draw Button */}
          <div className="bg-base-200 rounded-2xl flex flex-col p-8 h-[calc(100vh-120px)] sticky top-4">
            <div className="flex-1 flex flex-col items-center justify-center">
              {latestDraw ? (
                <>
                  <span className="text-2xl font-semibold text-base-content/60 mb-8">
                    Current Number
                  </span>
                  <NumberBall
                    number={latestDraw.number}
                    size="xl"
                    isNew={latestDraw.number === lastDrawnNumber}
                  />
                  <div className="mt-8">
                    <p className="text-xl text-base-content/60">
                      {drawnNumbers.length} of 75 drawn
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-2xl text-base-content/60">
                    Press "Draw Number" to begin
                  </p>
                </div>
              )}
            </div>

            {/* Draw Number Button at Bottom */}
            <div className="mt-8">
              <button
                onClick={handleDrawNumber}
                disabled={isDrawing || remainingNumbers === 0}
                className="btn btn-primary btn-lg w-full"
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
            </div>
          </div>

          {/* RIGHT SIDE - History, Winners, QR Code */}
          <div className="flex flex-col gap-4">
            {/* Drawn Numbers History - HIGHLIGHTED */}
            <div className="card bg-primary/10 border-2 border-primary/30 shadow-xl">
              <div className="card-body p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="badge badge-primary badge-lg">
                    {drawnNumbers.length}
                  </div>
                  <h3 className="font-bold text-xl">Number History</h3>
                </div>
                <DrawnHistory drawnNumbers={drawnNumbers} maxDisplay={75} />
              </div>
            </div>

            {/* Reach Notifications */}
            {reaches.length > 0 && (
              <div className="card bg-warning/10 border-2 border-warning/30 shadow-lg">
                <div className="card-body p-6">
                  <div className="flex items-center gap-2">
                    <div className="badge badge-warning badge-lg">
                      {reaches.length}
                    </div>
                    <h3 className="font-bold text-xl">Reach Notified</h3>
                  </div>
                  <div className="mt-4">
                    <ul className="space-y-2 max-h-32 overflow-y-auto">
                      {reaches.map((reach) => (
                        <li
                          key={`${reach.userId}-${reach.reachedAt}`}
                          className="text-base font-medium"
                        >
                          {reach.displayName}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Winners List - HIGHLIGHTED & COLLAPSIBLE */}
            <div className="card bg-success/10 border-2 border-success/30 shadow-xl">
              <div className="card-body p-6">
                <button
                  onClick={() => setIsWinnersOpen(!isWinnersOpen)}
                  className="flex items-center gap-2 w-full text-left"
                  type="button"
                >
                  <div className="badge badge-success badge-lg">
                    {winners.length}
                  </div>
                  <h3 className="font-bold text-xl flex-1">Winners</h3>
                  <svg
                    className={`w-5 h-5 transition-transform ${isWinnersOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-label="Toggle winners"
                  >
                    <title>Toggle winners</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isWinnersOpen && (
                  <div className="mt-4">
                    {winners.length > 0 ? (
                      <ul className="space-y-2 max-h-40 overflow-y-auto">
                        {winners.map((winner, index) => (
                          <li
                            key={`${winner.userId}-${winner.claimedAt}`}
                            className="text-base font-semibold flex items-center gap-2"
                          >
                            <span className="badge badge-ghost badge-sm">
                              {index + 1}
                            </span>
                            {winner.displayName}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-base-content/50 py-4">
                        No winners yet
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* QR Code - COLLAPSIBLE */}
            {joinUrl && (
              <div className="card bg-base-200 shadow-lg">
                <div className="card-body p-6">
                  <button
                    onClick={() => setIsQRCodeOpen(!isQRCodeOpen)}
                    className="flex items-center gap-2 w-full text-left"
                    type="button"
                  >
                    <h3 className="font-semibold text-base flex-1">
                      Invite Players
                    </h3>
                    <svg
                      className={`w-5 h-5 transition-transform ${isQRCodeOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-label="Toggle QR code"
                    >
                      <title>Toggle QR code</title>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isQRCodeOpen && (
                    <div className="mt-4 flex justify-center">
                      <QRCodeDisplay url={joinUrl} size={140} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ENDED PHASE LAYOUT */}
      {gameStatus === "ended" && (
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-6">
            <div className="badge badge-neutral badge-lg">Game ended</div>

            {/* Final Stats */}
            <div className="stats stats-vertical lg:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Total Players</div>
                <div className="stat-value text-primary">
                  {participantCount}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Numbers Drawn</div>
                <div className="stat-value">{drawnNumbers.length}</div>
              </div>
              <div className="stat">
                <div className="stat-title">Winners</div>
                <div className="stat-value text-success">{winners.length}</div>
              </div>
            </div>

            {/* Winners List */}
            {winners.length > 0 && (
              <div className="card bg-base-200 w-full max-w-md">
                <div className="card-body">
                  <h3 className="font-bold text-center text-success text-xl mb-4">
                    🏆 Winners 🏆
                  </h3>
                  <ul className="space-y-2">
                    {winners.map((winner, index) => (
                      <li
                        key={`${winner.userId}-${winner.claimedAt}`}
                        className="text-center text-lg"
                      >
                        {index + 1}. {winner.displayName}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Drawn History */}
            {drawnNumbers.length > 0 && (
              <div className="card bg-base-200 w-full">
                <div className="card-body p-4">
                  <DrawnHistory drawnNumbers={drawnNumbers} maxDisplay={75} />
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="btn btn-primary btn-lg mt-4"
              type="button"
            >
              Create New Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
