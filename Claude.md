# Tabimate — project brief

## What it is
Tabimate (旅 tabi = journey + mate) is a daily browser trivia game about animals.
Everyone gets the same prompts each day (e.g. "Name an animal that lays eggs").
The player types an animal; rarer matched answers score a higher tier (0–5).
Each matched animal joins a trail of followers behind the player. Each answer moves the
player forward by its tier; crossing score thresholds enters new biomes
(Town → Grassland → Forest → …). The run ends with a shareable team card.
Original art and naming only: no Pokémon names, sprites or UI.

## Rules of the game
- Daily reset at 00:00 Asia/Singapore. Puzzle key = SGT date as YYYY-MM-DD.
- MVP: 3 prompts per day (config value, will become 7), 25 s timer per prompt.
- Tiers: 0 no match; 1 Least Concern, 2 Near Threatened, 3 Vulnerable,
  4 Endangered, 5 Critically Endangered.
- Matching is deliberately LOOSE: any non-empty guess should usually land on some
  answer, so players feel the thrill of an unknown result. Only empty input or
  timeout is tier 0.
- One run per day; progress is saved and resumable.

## Tech
- Vite + TypeScript (strict), Kaplay for the canvas scene, HTML/CSS for UI.
- Vitest for tests. ESLint + Prettier.
- Static hosting on Cloudflare Pages. No backend in the MVP.
- Pixel art: scene is 180 native px tall, scaled by a whole number (computed in device pixels);
  layers tile horizontally. Sprites use 6 template key colours, recoloured from palettes.json.

## Architecture rules (must follow)
- Layers: config, core, data, services, ui, scene. main.ts wires them together.
- core/ is pure TypeScript: no DOM, no Kaplay, no fetch, no localStorage, no Date.now()
  without injection. It is fully unit-tested.
- ui/ and scene/ never call each other. They both react to events from core/events.ts
  and send user intents back to the game machine.
- External dependencies sit behind interfaces: PuzzleSource, StorageAdapter,
  SpriteProvider, Clock. main.ts chooses the implementations.
- Tuneable values live in config/, never as magic numbers in logic.
- Biomes, tiers, effects and matcher strategies are registries: adding one means
  adding an entry, not editing a switch statement.

## Code style
- Small files (aim < 150 lines) and small functions (aim < 30 lines), one job each.
- Named exports only. No default exports. No `any`.
- Pure functions where possible; side effects at the edges.
- Every exported function in core/ has a unit test.
- Comments explain why, not what.
- Mobile first: must work at 360 px wide with the on-screen keyboard open.

## Commands
- npm run dev | npm run build | npm run test | npm run check (typecheck + lint + test)