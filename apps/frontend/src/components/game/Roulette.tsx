import { useCallback, useEffect, useRef, useState } from "react";

interface RouletteProps {
  awards: number[];
  onSpinComplete: (award: number) => void;
  disabled?: boolean;
}

// Colors for the roulette segments
const SEGMENT_COLORS = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Sky blue
  "#96CEB4", // Sage
  "#FFEAA7", // Yellow
  "#DDA0DD", // Plum
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
  "#BB8FCE", // Purple
  "#85C1E9", // Light blue
];

export function Roulette({ awards, onSpinComplete, disabled }: RouletteProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedAward, setSelectedAward] = useState<number | null>(null);
  const rotationRef = useRef(0);
  const animationRef = useRef<number | null>(null);

  const segmentAngle = (2 * Math.PI) / awards.length;

  // Draw the roulette wheel
  const drawWheel = useCallback(
    (rotation: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) - 10;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw segments
      awards.forEach((award, index) => {
        const startAngle = rotation + index * segmentAngle - Math.PI / 2;
        const endAngle = startAngle + segmentAngle;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#000";
        ctx.font = `bold ${Math.max(14, Math.min(24, 300 / awards.length))}px sans-serif`;
        ctx.fillText(String(award), radius - 20, 5);
        ctx.restore();
      });

      // Draw center circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
      ctx.fillStyle = "#333";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw pointer (arrow at top)
      ctx.beginPath();
      ctx.moveTo(centerX, 10);
      ctx.lineTo(centerX - 15, 35);
      ctx.lineTo(centerX + 15, 35);
      ctx.closePath();
      ctx.fillStyle = "#FF0000";
      ctx.fill();
      ctx.strokeStyle = "#800000";
      ctx.lineWidth = 2;
      ctx.stroke();
    },
    [awards, segmentAngle],
  );

  // Initial draw
  useEffect(() => {
    drawWheel(0);
  }, [drawWheel]);

  // Spin animation
  const spin = useCallback(() => {
    if (isSpinning || awards.length === 0) return;

    setIsSpinning(true);
    setSelectedAward(null);

    // Randomly select award (client-side)
    const randomIndex = Math.floor(Math.random() * awards.length);
    const selectedValue = awards[randomIndex];

    // Calculate target rotation
    // We want the selected segment to stop at the top (under the pointer)
    // The pointer is at the top (12 o'clock), so we need to rotate so that
    // the center of the selected segment is at the top
    const targetSegmentCenter = randomIndex * segmentAngle + segmentAngle / 2;
    const extraSpins = 5 + Math.random() * 3; // 5-8 full rotations
    const targetRotation =
      extraSpins * 2 * Math.PI + (2 * Math.PI - targetSegmentCenter);

    const startRotation = rotationRef.current;
    const totalRotation = targetRotation;
    const duration = 4000; // 4 seconds
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease out cubic)
      const eased = 1 - (1 - progress) ** 3;

      const currentRotation = startRotation + totalRotation * eased;
      rotationRef.current = currentRotation;
      drawWheel(currentRotation);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setSelectedAward(selectedValue);
        onSpinComplete(selectedValue);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [isSpinning, awards, segmentAngle, drawWheel, onSpinComplete]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  if (awards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-base-content/60">景品がありません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} width={300} height={300} className="max-w-full" />

      {selectedAward !== null && (
        <div className="text-center animate-bounce">
          <p className="text-lg font-bold text-success">
            景品番号: {selectedAward}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={spin}
        disabled={disabled || isSpinning || awards.length === 0}
        className={`btn btn-lg ${isSpinning ? "btn-disabled" : "btn-primary"}`}
      >
        {isSpinning ? (
          <>
            <span className="loading loading-spinner" />
            回転中...
          </>
        ) : (
          "ルーレットを回す"
        )}
      </button>
    </div>
  );
}
