import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { api } from "../services/api";
import type { StoredSession } from "../types";

export function JoinPage() {
  const { inviteToken } = useParams<{ inviteToken: string }>();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [session, setSession] = useLocalStorage<StoredSession | null>(
    "bingo_session",
    null,
  );

  // Check if existing session is valid for this game
  useEffect(() => {
    if (!inviteToken) {
      setIsCheckingSession(false);
      return;
    }

    // Always get invite info first to know which game this invite is for
    api
      .getInviteInfo(inviteToken)
      .then((inviteInfo) => {
        // If no session, just show join form
        if (!session) {
          setIsCheckingSession(false);
          return;
        }

        // Check if session is for the same game as this invite
        if (session.gameId !== inviteInfo.gameId) {
          // Different game - clear old session and show join form
          setSession(null);
          setIsCheckingSession(false);
          return;
        }

        // Same game - verify card still exists
        return api
          .getMyCard()
          .then(() => {
            // Session is valid for this game, redirect to player page
            navigate(`/play/${session.gameId}`, { replace: true });
          })
          .catch(() => {
            // Session is invalid (card not found, etc.), clear it
            setSession(null);
            setIsCheckingSession(false);
          });
      })
      .catch(() => {
        // Invite not found or expired - show error
        setError("招待リンクが無効または期限切れです");
        setIsCheckingSession(false);
      });
  }, [inviteToken, session, setSession, navigate]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteToken || !displayName.trim()) {
      setError("名前を入力してください");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.claimInvite(inviteToken, displayName.trim());

      // Store session in localStorage
      setSession({
        token: response.session.token,
        userId: response.session.userId,
        displayName: response.session.displayName,
        gameId: response.session.gameId,
        cardId: response.session.cardId,
      });

      // Navigate to player page
      navigate(`/play/${response.session.gameId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "参加できませんでした");
    } finally {
      setIsLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="alert alert-error">招待リンクが無効です</div>
      </div>
    );
  }

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-base-100">
      <div className="card w-full max-w-md bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center">BINGOに参加</h2>

          <form onSubmit={handleJoin} className="space-y-4 mt-4">
            <div className="form-control">
              <label className="label" htmlFor="displayName">
                <span className="label-text">名前</span>
              </label>
              <input
                id="displayName"
                type="text"
                placeholder="名前を入力"
                className="input input-bordered w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !displayName.trim()}
              className="btn btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner" />
                  参加中...
                </>
              ) : (
                "参加する"
              )}
            </button>
          </form>

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
