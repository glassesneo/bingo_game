import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";

export function HomePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create a server first, then a game
      const server = await api.createServer("Bingo Room");
      const game = await api.createGame(server.id);

      // Navigate to host page with hostToken
      navigate(`/host/${game.hostToken}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-base-100">
      <div className="text-center space-y-8">
        <h1 className="text-5xl sm:text-6xl font-bold text-primary">BINGO</h1>
        <p className="text-lg text-base-content/70 max-w-md">
          Create a room and invite your friends to play!
        </p>

        <button
          onClick={handleCreateRoom}
          disabled={isLoading}
          className="btn btn-primary btn-lg"
          type="button"
        >
          {isLoading ? (
            <>
              <span className="loading loading-spinner" />
              Creating...
            </>
          ) : (
            "Create Room"
          )}
        </button>

        {error && (
          <div className="alert alert-error max-w-md">
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
