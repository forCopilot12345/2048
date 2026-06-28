# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A browser implementation of the 2048 game, built with TypeScript and Vite. No framework, no runtime dependencies — the DOM is driven by hand and tile motion is animated entirely in CSS.

## Commands

- `npm run dev` — start the Vite dev server with hot reload.
- `npm run build` — type-check (`tsc`) then produce a production bundle in `dist/`.
- `npm run preview` — serve the built bundle locally.

There is no test runner or linter configured. Type-checking via `tsc` (run as part of `build`) is the only automated verification; `tsconfig.json` enables `strict`, `noUnusedLocals`, and `noUnusedParameters`, so unused symbols fail the build.

## Architecture

Two modules with a deliberate separation:

- **`src/game.ts`** — pure game logic, no DOM. Owns the `Grid` (a 4×4 array of `Tile | null`) and the rules: `move()`, `spawnTile()`, `hasWon()`, `isGameOver()`. `move()` mutates the grid in place and returns `{ moved, gained }`.
- **`src/main.ts`** — all DOM, input, rendering, and game-loop state (`grid`, `score`, `best`, `won`, `over`). Best score persists to `localStorage` under `2048-best`. Handles keyboard (arrow keys) and touch/swipe input, both routed through `handleMove()`.
- **`src/style.css`** — visual styling and animation. Tiles are absolutely positioned via CSS custom properties `--r`/`--c`; CSS `transition` on `left`/`top` produces the slide.

### Animation model (the subtle part)

Tile movement is animated by carrying per-move state on each `Tile` rather than diffing the DOM:

- Before applying a move, `move()` snapshots each tile's position into `prevRow`/`prevCol` and clears `isNew`/`mergedFrom`.
- A merge does not mutate an existing tile: it creates a **new** tile with `mergedFrom = [source, target]`, and the two consumed tiles keep their slid-to positions so they animate underneath before being discarded next render.
- `render()` clears `#tiles` and re-creates every tile element each frame. `addTile()` places the element at the *previous* position, then snaps it to the real position on the next `requestAnimationFrame` so the CSS transition fires. It recurses into `mergedFrom` to render the consumed tiles.

Because `render()` rebuilds all tile DOM from the grid every move, the grid is the single source of truth — keep logic in `game.ts` operating on the grid, and let `main.ts` reflect it.

---

## Behavioral guidelines

Guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
