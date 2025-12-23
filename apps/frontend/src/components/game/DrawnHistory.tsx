import type { DrawnNumber } from "../../types";
import { NumberBall } from "./NumberBall";

interface DrawnHistoryProps {
  drawnNumbers: DrawnNumber[];
  maxDisplay?: number;
}

export function DrawnHistory({
  drawnNumbers,
  maxDisplay = 10,
}: DrawnHistoryProps) {
  // Sort by draw order descending (most recent first)
  const sortedNumbers = [...drawnNumbers]
    .sort((a, b) => b.drawOrder - a.drawOrder)
    .slice(0, maxDisplay);

  if (sortedNumbers.length === 0) {
    return (
      <div className="text-center text-base-content/50 py-4">
        No numbers drawn yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-base-content/70">
        Recent Numbers ({drawnNumbers.length} drawn)
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {sortedNumbers.map((drawn, index) => (
          <NumberBall
            key={drawn.number}
            number={drawn.number}
            size="sm"
            isNew={index === 0}
          />
        ))}
      </div>
      {drawnNumbers.length > maxDisplay && (
        <div className="text-xs text-center text-base-content/50">
          +{drawnNumbers.length - maxDisplay} more
        </div>
      )}
    </div>
  );
}
