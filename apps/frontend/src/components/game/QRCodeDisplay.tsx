import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  url: string;
  size?: number;
}

export function QRCodeDisplay({ url, size = 200 }: QRCodeDisplayProps) {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-white p-4 rounded-lg shadow-lg">
        <QRCodeSVG value={url} size={size} level="M" />
      </div>
      <div className="flex items-center gap-2 max-w-full">
        <input
          type="text"
          value={url}
          readOnly
          className="input input-bordered input-sm flex-1 min-w-0 text-xs"
        />
        <button
          onClick={copyToClipboard}
          className="btn btn-sm btn-ghost"
          type="button"
          title="Copy URL"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <title>Copy URL</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>
      <p className="text-sm text-base-content/60">Scan to join the game</p>
    </div>
  );
}
