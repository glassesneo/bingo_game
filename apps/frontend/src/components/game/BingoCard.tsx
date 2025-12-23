import { useMemo, useRef } from "react";
import type { CardCell } from "../../types";
import { getMarkedCells, getWinningPositions } from "../../utils/bingo";
import { BingoCell } from "./BingoCell";

interface BingoCardProps {
  cells: CardCell[];
  drawnNumbers: number[];
  winningPattern?: [number, number][] | null;
  lastDrawnNumber?: number | null;
}

export function BingoCard({
  cells,
  drawnNumbers,
  winningPattern = null,
  lastDrawnNumber = null,
}: BingoCardProps) {
  const prevMarkedRef = useRef<Set<number>>(new Set());

  // Calculate marked cells and winning positions
  const markedCellIds = useMemo(
    () => getMarkedCells(cells, drawnNumbers),
    [cells, drawnNumbers],
  );

  const winningPositions = useMemo(
    () => getWinningPositions(winningPattern),
    [winningPattern],
  );

  // Sort cells by row and column for consistent grid layout
  const sortedCells = useMemo(() => {
    return [...cells].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });
  }, [cells]);

  // Determine newly marked cells (for animation)
  const newlyMarkedIds = useMemo(() => {
    const newIds = new Set<number>();
    if (lastDrawnNumber !== null) {
      for (const cell of cells) {
        if (
          cell.number === lastDrawnNumber &&
          !prevMarkedRef.current.has(cell.id)
        ) {
          newIds.add(cell.id);
        }
      }
    }
    // Update ref for next render
    prevMarkedRef.current = markedCellIds;
    return newIds;
  }, [cells, lastDrawnNumber, markedCellIds]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* BINGO Header */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        {["B", "I", "N", "G", "O"].map((letter) => (
          <div
            key={letter}
            className="aspect-square flex items-center justify-center text-xl sm:text-2xl font-bold text-primary"
          >
            {letter}
          </div>
        ))}
      </div>

      {/* Bingo Grid */}
      <div className="grid grid-cols-5 gap-1">
        {sortedCells.map((cell) => (
          <BingoCell
            key={cell.id}
            cell={cell}
            isMarked={markedCellIds.has(cell.id)}
            isWinning={winningPositions.has(`${cell.row},${cell.col}`)}
            isNewlyMarked={newlyMarkedIds.has(cell.id)}
          />
        ))}
      </div>
    </div>
  );
}
