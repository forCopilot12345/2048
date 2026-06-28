import "./style.css";
import {
  Grid,
  Tile,
  Direction,
  SIZE,
  createGrid,
  forEachTile,
  spawnTile,
  move,
  hasWon,
  isGameOver,
} from "./game";

const BEST_KEY = "2048-best";

let grid: Grid = createGrid();
let score = 0;
let best = Number(localStorage.getItem(BEST_KEY)) || 0;
let won = false;
let keepPlaying = false;
let over = false;

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <div class="container">
    <header>
      <h1>2048</h1>
      <div class="scores">
        <div class="score-box"><span class="label">SCORE</span><span id="score">0</span></div>
        <div class="score-box"><span class="label">BEST</span><span id="best">0</span></div>
      </div>
    </header>
    <p class="intro">Join the tiles, get to <strong>2048!</strong></p>
    <div class="board" id="board">
      <div class="grid"></div>
      <div class="tiles" id="tiles"></div>
      <div class="overlay" id="overlay">
        <p class="overlay-msg" id="overlay-msg"></p>
        <div class="overlay-actions">
          <button class="btn" id="keep-going">Keep going</button>
          <button class="btn" id="overlay-btn">Try again</button>
        </div>
      </div>
    </div>
    <button class="btn new-game" id="new-game">New Game</button>
  </div>
`;

const gridEl = app.querySelector<HTMLDivElement>(".grid")!;
for (let i = 0; i < SIZE * SIZE; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  gridEl.appendChild(cell);
}

const tilesEl = app.querySelector<HTMLDivElement>("#tiles")!;
const scoreEl = app.querySelector<HTMLSpanElement>("#score")!;
const scoreBox = scoreEl.closest<HTMLDivElement>(".score-box")!;
const bestEl = app.querySelector<HTMLSpanElement>("#best")!;
const overlay = app.querySelector<HTMLDivElement>("#overlay")!;
const overlayMsg = app.querySelector<HTMLParagraphElement>("#overlay-msg")!;

function setPosition(el: HTMLElement, r: number, c: number) {
  el.style.setProperty("--r", String(r));
  el.style.setProperty("--c", String(c));
}

/** Renders a tile (and, recursively, the tiles that merged into it). */
function addTile(tile: Tile) {
  // Render the consumed tiles first so the merged tile paints on top of them.
  if (tile.mergedFrom) tile.mergedFrom.forEach(addTile);

  const el = document.createElement("div");
  el.className = `tile tile-${tile.value <= 2048 ? tile.value : "super"}`;

  const inner = document.createElement("div");
  inner.className = "tile-inner";
  inner.textContent = String(tile.value);
  el.appendChild(inner);

  // Start at the previous position so the move to the new position animates.
  setPosition(el, tile.prevRow, tile.prevCol);
  tilesEl.appendChild(el);

  if (tile.mergedFrom) {
    el.classList.add("tile-merged");
  } else if (tile.isNew) {
    el.classList.add("tile-new");
  }

  // Next frame: snap to the real position; CSS transitions the slide.
  requestAnimationFrame(() => setPosition(el, tile.row, tile.col));
}

function render() {
  tilesEl.innerHTML = "";
  forEachTile(grid, addTile);
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);

  if (over) {
    overlayMsg.textContent = "Game over!";
    overlay.classList.add("show", "lose");
    overlay.classList.remove("win");
  } else if (won && !keepPlaying) {
    overlayMsg.textContent = "You win!";
    overlay.classList.add("show", "win");
    overlay.classList.remove("lose");
  } else {
    overlay.classList.remove("show", "win", "lose");
  }
}

/** Floats a "+N" over the score box, mirroring play2048.co. */
function showScoreAddition(amount: number) {
  const add = document.createElement("span");
  add.className = "score-addition";
  add.textContent = `+${amount}`;
  add.addEventListener("animationend", () => add.remove());
  scoreBox.appendChild(add);
}

function handleMove(dir: Direction) {
  if (over) return;
  const result = move(grid, dir);
  if (!result.moved) return;

  score += result.gained;
  if (result.gained > 0) showScoreAddition(result.gained);
  if (score > best) {
    best = score;
    localStorage.setItem(BEST_KEY, String(best));
  }

  spawnTile(grid);

  if (!won && hasWon(grid)) won = true;
  if (isGameOver(grid)) over = true;

  render();
}

function newGame() {
  grid = createGrid();
  score = 0;
  won = false;
  keepPlaying = false;
  over = false;
  spawnTile(grid);
  spawnTile(grid);
  render();
}

const KEYS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

window.addEventListener("keydown", (e) => {
  const dir = KEYS[e.key];
  if (!dir) return;
  e.preventDefault();
  handleMove(dir);
});

// Touch / swipe support
const boardEl = app.querySelector<HTMLDivElement>("#board")!;
let touchStart: { x: number; y: number } | null = null;

boardEl.addEventListener(
  "touchstart",
  (e) => {
    const t = e.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  },
  { passive: true }
);

boardEl.addEventListener("touchend", (e) => {
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  touchStart = null;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (Math.max(absX, absY) < 24) return; // ignore taps
  if (absX > absY) handleMove(dx > 0 ? "right" : "left");
  else handleMove(dy > 0 ? "down" : "up");
});

app.querySelector<HTMLButtonElement>("#new-game")!.addEventListener("click", newGame);
app.querySelector<HTMLButtonElement>("#overlay-btn")!.addEventListener("click", newGame);
app.querySelector<HTMLButtonElement>("#keep-going")!.addEventListener("click", () => {
  keepPlaying = true;
  render();
});

newGame();
