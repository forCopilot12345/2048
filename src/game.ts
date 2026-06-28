export type Direction = "left" | "right" | "up" | "down";

export const SIZE = 4;
export const WIN_TILE = 2048;

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  /** Position before the current move, used to animate sliding. */
  prevRow: number;
  prevCol: number;
  /** True for a tile that just spawned (plays the appear animation). */
  isNew: boolean;
  /** The two tiles consumed to create this one (plays the merge pop). */
  mergedFrom: [Tile, Tile] | null;
}

export type Grid = (Tile | null)[][];

let nextId = 0;

function makeTile(value: number, row: number, col: number): Tile {
  return {
    id: nextId++,
    value,
    row,
    col,
    prevRow: row,
    prevCol: col,
    isNew: true,
    mergedFrom: null,
  };
}

export function createGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array<Tile | null>(SIZE).fill(null));
}

export function forEachTile(grid: Grid, fn: (tile: Tile) => void): void {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (tile) fn(tile);
    }
  }
}

/** Adds a 2 (90%) or 4 (10%) to a random empty cell. Returns false if full. */
export function spawnTile(grid: Grid): boolean {
  const empty: [number, number][] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (!grid[r][c]) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return false;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  grid[r][c] = makeTile(Math.random() < 0.9 ? 2 : 4, r, c);
  return true;
}

const VECTORS: Record<Direction, { dr: number; dc: number }> = {
  up: { dr: -1, dc: 0 },
  down: { dr: 1, dc: 0 },
  left: { dr: 0, dc: -1 },
  right: { dr: 0, dc: 1 },
};

const inBounds = (r: number, c: number) =>
  r >= 0 && r < SIZE && c >= 0 && c < SIZE;

/** Order to walk cells so the tile farthest in the move direction moves first. */
function traversalOrder(dr: number, dc: number): { rows: number[]; cols: number[] } {
  const rows = [...Array(SIZE).keys()];
  const cols = [...Array(SIZE).keys()];
  if (dr === 1) rows.reverse();
  if (dc === 1) cols.reverse();
  return { rows, cols };
}

/** Farthest empty cell a tile can reach, plus the occupied cell beyond it (if any). */
function findTarget(grid: Grid, r: number, c: number, dr: number, dc: number) {
  let pr = r;
  let pc = c;
  let nr = r + dr;
  let nc = c + dc;
  while (inBounds(nr, nc) && !grid[nr][nc]) {
    pr = nr;
    pc = nc;
    nr += dr;
    nc += dc;
  }
  return {
    farthest: { r: pr, c: pc },
    next: inBounds(nr, nc) ? { r: nr, c: nc } : null,
  };
}

export interface MoveResult {
  moved: boolean;
  gained: number;
}

export function move(grid: Grid, dir: Direction): MoveResult {
  const { dr, dc } = VECTORS[dir];
  const { rows, cols } = traversalOrder(dr, dc);

  // Snapshot positions and clear per-move animation state.
  forEachTile(grid, (tile) => {
    tile.prevRow = tile.row;
    tile.prevCol = tile.col;
    tile.isNew = false;
    tile.mergedFrom = null;
  });

  let moved = false;
  let gained = 0;

  for (const r of rows) {
    for (const c of cols) {
      const tile = grid[r][c];
      if (!tile) continue;

      const { farthest, next } = findTarget(grid, r, c, dr, dc);
      const target = next ? grid[next.r][next.c] : null;

      if (target && target.value === tile.value && !target.mergedFrom) {
        // Merge: source slides onto target, both vanish under a new tile.
        const merged = makeTile(tile.value * 2, next!.r, next!.c);
        merged.isNew = false;
        merged.mergedFrom = [tile, target];

        grid[next!.r][next!.c] = merged;
        grid[r][c] = null;
        tile.row = next!.r;
        tile.col = next!.c;

        gained += merged.value;
        moved = true;
      } else {
        // Slide to the farthest free cell.
        grid[r][c] = null;
        grid[farthest.r][farthest.c] = tile;
        tile.row = farthest.r;
        tile.col = farthest.c;
        if (farthest.r !== r || farthest.c !== c) moved = true;
      }
    }
  }

  return { moved, gained };
}

export function hasWon(grid: Grid): boolean {
  let won = false;
  forEachTile(grid, (tile) => {
    if (tile.value >= WIN_TILE) won = true;
  });
  return won;
}

/** True when no moves remain (grid full and no adjacent equal tiles). */
export function isGameOver(grid: Grid): boolean {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile = grid[r][c];
      if (!tile) return false;
      const right = grid[r][c + 1];
      const down = grid[r + 1]?.[c];
      if (right && right.value === tile.value) return false;
      if (down && down.value === tile.value) return false;
    }
  }
  return true;
}
