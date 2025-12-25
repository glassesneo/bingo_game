import type { CardCell } from "../types";

// All winning patterns: 5 rows + 5 columns + 2 diagonals = 12 patterns
const WINNING_PATTERNS: [number, number][][] = [
  // Rows (5)
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [1, 3],
    [1, 4],
  ],
  [
    [2, 0],
    [2, 1],
    [2, 2],
    [2, 3],
    [2, 4],
  ],
  [
    [3, 0],
    [3, 1],
    [3, 2],
    [3, 3],
    [3, 4],
  ],
  [
    [4, 0],
    [4, 1],
    [4, 2],
    [4, 3],
    [4, 4],
  ],
  // Columns (5)
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
  ],
  [
    [0, 2],
    [1, 2],
    [2, 2],
    [3, 2],
    [4, 2],
  ],
  [
    [0, 3],
    [1, 3],
    [2, 3],
    [3, 3],
    [4, 3],
  ],
  [
    [0, 4],
    [1, 4],
    [2, 4],
    [3, 4],
    [4, 4],
  ],
  // Diagonals (2)
  [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ],
  [
    [0, 4],
    [1, 3],
    [2, 2],
    [3, 1],
    [4, 0],
  ],
];

export interface WinResult {
  hasWon: boolean;
  winningPattern: [number, number][] | null;
}

export interface ReachResult {
  hasReach: boolean;
  reachPattern: [number, number][] | null;
}

/**
 * Check if the player has won with the current drawn numbers
 * @param cells - The player's card cells
 * @param drawnNumbers - Array of numbers that have been drawn
 * @param freeSpacePosition - Optional position of FREE space (for future support)
 * @returns WinResult with hasWon flag and the winning pattern if any
 */
export function checkWin(
  cells: CardCell[],
  drawnNumbers: number[],
  freeSpacePosition?: [number, number],
): WinResult {
  const drawnSet = new Set(drawnNumbers);

  for (const pattern of WINNING_PATTERNS) {
    const isWinning = pattern.every(([row, col]) => {
      // FREE space is always marked
      if (
        freeSpacePosition &&
        row === freeSpacePosition[0] &&
        col === freeSpacePosition[1]
      ) {
        return true;
      }
      const cell = cells.find((c) => c.row === row && c.col === col);
      return cell && drawnSet.has(cell.number);
    });

    if (isWinning) {
      return { hasWon: true, winningPattern: pattern };
    }
  }

  return { hasWon: false, winningPattern: null };
}

/**
 * Check if the player is one number away from winning (reach)
 * @param cells - The player's card cells
 * @param drawnNumbers - Array of numbers that have been drawn
 * @param freeSpacePosition - Optional position of FREE space (for future support)
 * @returns ReachResult with hasReach flag and the reach pattern if any
 */
export function checkReach(
  cells: CardCell[],
  drawnNumbers: number[],
  freeSpacePosition?: [number, number],
): ReachResult {
  const drawnSet = new Set(drawnNumbers);

  for (const pattern of WINNING_PATTERNS) {
    let markedCount = 0;
    for (const [row, col] of pattern) {
      // FREE space is always marked
      if (
        freeSpacePosition &&
        row === freeSpacePosition[0] &&
        col === freeSpacePosition[1]
      ) {
        markedCount++;
        continue;
      }
      const cell = cells.find((c) => c.row === row && c.col === col);
      if (cell && drawnSet.has(cell.number)) {
        markedCount++;
      }
    }

    // Reach means exactly 4 out of 5 are marked
    if (markedCount === 4) {
      return { hasReach: true, reachPattern: pattern };
    }
  }

  return { hasReach: false, reachPattern: null };
}

/**
 * Get the set of cell IDs that are marked (number has been drawn)
 * @param cells - The player's card cells
 * @param drawnNumbers - Array of numbers that have been drawn
 * @returns Set of marked cell IDs
 */
export function getMarkedCells(
  cells: CardCell[],
  drawnNumbers: number[],
): Set<number> {
  const drawnSet = new Set(drawnNumbers);
  const markedCellIds = new Set<number>();

  for (const cell of cells) {
    if (drawnSet.has(cell.number)) {
      markedCellIds.add(cell.id);
    }
  }

  return markedCellIds;
}

/**
 * Get the set of cell positions that are part of the winning pattern
 * @param winningPattern - The winning pattern coordinates
 * @returns Set of position strings in "row,col" format
 */
export function getWinningPositions(
  winningPattern: [number, number][] | null,
): Set<string> {
  if (!winningPattern) return new Set();
  return new Set(winningPattern.map(([row, col]) => `${row},${col}`));
}
