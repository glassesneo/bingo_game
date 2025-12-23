import type { CardCell } from "../../types";

interface BingoCellProps {
  cell: CardCell;
  isMarked: boolean;
  isWinning: boolean;
  isNewlyMarked?: boolean;
  isFreeSpace?: boolean;
}

export function BingoCell({
  cell,
  isMarked,
  isWinning,
  isNewlyMarked = false,
  isFreeSpace = false,
}: BingoCellProps) {
  const baseClasses =
    "aspect-square flex items-center justify-center text-lg sm:text-xl font-bold rounded-lg transition-all duration-200";

  const stateClasses = isMarked
    ? isWinning
      ? "bg-success text-success-content"
      : "bg-primary text-primary-content"
    : "bg-base-200 hover:bg-base-300";

  const animationClasses = isNewlyMarked ? "cell-just-marked" : "";

  return (
    <div
      className={`${baseClasses} ${stateClasses} ${animationClasses}`}
      data-cell-id={cell.id}
      data-row={cell.row}
      data-col={cell.col}
    >
      {isFreeSpace ? "FREE" : cell.number}
    </div>
  );
}
